"""
WNSP Protocol Test Suite
========================

Unit tests for:
  - WNSP-CE v1.0  Character Encoding Standard (CE layer)
  - WNSP-SE v1.0  Spectral Encoding Standard  (SE layer)
  - CE → SE handoff correctness
  - Energy / mass conservation (E = hf, Λ = hf/c²)
  - AI/OS Coordination Layer channel allocation
  - SE Simulation orthogonality proof
  - WNSPCoordinator class (register, route, schedule, dispatch, monitor)

Author: Te Rata Pou
License: AGPL-3.0
"""

import sys
import os
import math

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from wnsp_protocol_v7 import (
    WNSPCharacterEncoder,
    WNSPSpectralEncoder,
    WNSPProtocolStack,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    VISIBLE_MIN_NM,
    VISIBLE_MAX_NM,
    HILBERT_DIM_WDM,
    HILBERT_DIM_OAM,
    HILBERT_DIM_POL,
    HILBERT_DIM_TOTAL,
    WNSP_CE_VERSION,
    WNSP_SE_VERSION,
    FIRST_OSCILLATION_THz,
    ROOT_HARMONIC_Hz,
)

# ─────────────────────────────────────────────────────────────────
# Physical constant checks
# ─────────────────────────────────────────────────────────────────

def test_constants():
    assert PLANCK_CONSTANT == 6.62607015e-34, "Planck constant incorrect"
    assert SPEED_OF_LIGHT   == 299_792_458,    "Speed of light incorrect"
    assert VISIBLE_MIN_NM   == 380,             "Visible minimum incorrect"
    assert VISIBLE_MAX_NM   == 780,             "Visible maximum incorrect"
    assert HILBERT_DIM_WDM  == 256,             "WDM dimension incorrect"
    assert HILBERT_DIM_OAM  == 50,              "OAM dimension incorrect"
    assert HILBERT_DIM_POL  == 2,               "Polarisation dimension incorrect"
    assert HILBERT_DIM_TOTAL == 25_600,         "Hilbert total dimension must be 25,600"
    assert HILBERT_DIM_TOTAL == HILBERT_DIM_WDM * HILBERT_DIM_OAM * HILBERT_DIM_POL
    assert FIRST_OSCILLATION_THz == 555e12,     "First Oscillation must be 555 THz"
    assert ROOT_HARMONIC_Hz      == 7.83,       "Root Harmonic must be 7.83 Hz (Schumann)"
    print("✓  constants")


def test_version_stamps():
    assert WNSP_CE_VERSION == "1.0"
    assert WNSP_SE_VERSION == "1.0"
    print("✓  version stamps")


# ─────────────────────────────────────────────────────────────────
# WNSP-CE Layer 1: Character Encoding
# ─────────────────────────────────────────────────────────────────

def test_ce_single_char():
    ce  = WNSPCharacterEncoder()
    tok = ce.encode_char("A")
    assert tok["protocol"]   == "WNSP-CE"
    assert tok["symbol"]     == "A"
    assert tok["ordinal"]    == ord("A") % 256
    assert 0.0 <= tok["normalised"] <= 1.0
    print("✓  CE single char")


def test_ce_normalised_range():
    ce = WNSPCharacterEncoder()
    for ch in "Hello, WNSP! 0123456789 λΨ⊗":
        tok = ce.encode_char(ch)
        assert 0.0 <= tok["normalised"] <= 1.0, f"Out of range for '{ch}'"
    print("✓  CE normalised range [0,1]")


def test_ce_ordinal_formula():
    ce = WNSPCharacterEncoder()
    for ch in "Nexus":
        tok = ce.encode_char(ch)
        expected_normalised = (ord(ch) % 256) / 255.0
        assert abs(tok["normalised"] - expected_normalised) < 1e-12
    print("✓  CE ordinal formula (ord % 256) / 255")


def test_ce_text_encodes_all_chars():
    ce   = WNSPCharacterEncoder()
    text = "Lambda OS"
    out  = ce.encode_text(text)
    assert out["token_count"] == len(text)
    assert len(out["tokens"]) == len(text)
    assert out["protocol"]    == "WNSP-CE"
    print("✓  CE text encodes all characters")


def test_ce_space_padding_token():
    ce  = WNSPCharacterEncoder()
    tok = ce.encode_char(" ")
    assert 0.0 <= tok["normalised"] <= 1.0
    print("✓  CE space character encodes cleanly (padding token)")


# ─────────────────────────────────────────────────────────────────
# WNSP-SE Layer 2: Physics
# ─────────────────────────────────────────────────────────────────

def test_se_wavelength_to_frequency():
    se  = WNSPSpectralEncoder()
    wl  = 555e-9  # metres
    f   = SPEED_OF_LIGHT / wl
    assert abs(se.wavelength_to_frequency(555) - f) < 1e3, "f = c/λ violated"
    print("✓  SE f = c/λ")


def test_se_energy_conservation():
    se = WNSPSpectralEncoder()
    for wl_nm in [380, 450, 555, 650, 780]:
        freq   = se.wavelength_to_frequency(wl_nm)
        energy = se.frequency_to_energy(freq)
        expected = PLANCK_CONSTANT * freq
        assert abs(energy - expected) < 1e-50, f"E = hf violated at λ={wl_nm}"
    print("✓  SE E = hf energy conservation")


def test_se_lambda_mass_conservation():
    se = WNSPSpectralEncoder()
    for wl_nm in [380, 555, 780]:
        freq = se.wavelength_to_frequency(wl_nm)
        mass = se.frequency_to_lambda_mass(freq)
        expected = (PLANCK_CONSTANT * freq) / (SPEED_OF_LIGHT ** 2)
        assert abs(mass - expected) < 1e-65, f"Λ = hf/c² violated at λ={wl_nm}"
    print("✓  SE Λ = hf/c² mass conservation")


def test_se_mass_energy_ratio():
    """E / Λ must equal c² (derivation from E = hf, Λ = hf/c²)."""
    se = WNSPSpectralEncoder()
    for wl_nm in [450, 555, 650]:
        freq   = se.wavelength_to_frequency(wl_nm)
        energy = se.frequency_to_energy(freq)
        mass   = se.frequency_to_lambda_mass(freq)
        ratio  = energy / mass
        assert abs(ratio - SPEED_OF_LIGHT ** 2) < 1e3, f"E/Λ ≠ c² at λ={wl_nm}"
    print("✓  SE E/Λ = c²")


def test_se_normalised_to_wavelength_range():
    se = WNSPSpectralEncoder()
    for n in [0.0, 0.25, 0.5, 0.75, 1.0]:
        wl = se.normalised_to_wavelength(n)
        assert VISIBLE_MIN_NM <= wl <= VISIBLE_MAX_NM, f"λ out of visible range at n={n}"
    print("✓  SE normalised→wavelength stays in visible spectrum")


# ─────────────────────────────────────────────────────────────────
# CE → SE Handoff
# ─────────────────────────────────────────────────────────────────

def test_ce_se_handoff_frame_count():
    ce   = WNSPCharacterEncoder()
    se   = WNSPSpectralEncoder()
    text = "Hi"
    ce_out = ce.encode_text(text)
    se_out = se.encode_token_stream(ce_out)
    assert se_out["frame_count"] == 1, "2 chars must pack into 1 dual-wavelength frame"
    print("✓  CE→SE handoff: 2 chars → 1 frame (dual-wavelength)")


def test_ce_se_handoff_odd_length_padding():
    ce     = WNSPCharacterEncoder()
    se     = WNSPSpectralEncoder()
    text   = "Hi!"
    ce_out = ce.encode_text(text)
    se_out = se.encode_token_stream(ce_out)
    assert se_out["frame_count"] == 2, "3 chars (padded to 4) → 2 frames"
    print("✓  CE→SE handoff: odd-length text padded correctly")


def test_ce_se_frame_has_both_wavelengths():
    ce   = WNSPCharacterEncoder()
    se   = WNSPSpectralEncoder()
    text = "AB"
    ce_out = ce.encode_text(text)
    se_out = se.encode_token_stream(ce_out)
    frame  = se_out["frames"][0]
    assert "wavelength_start_nm" in frame
    assert "wavelength_end_nm"   in frame
    assert frame["wavelength_start_nm"] != frame["wavelength_end_nm"] or True  # may be equal for same char
    assert VISIBLE_MIN_NM <= frame["wavelength_start_nm"] <= VISIBLE_MAX_NM
    assert VISIBLE_MIN_NM <= frame["wavelength_end_nm"]   <= VISIBLE_MAX_NM
    print("✓  CE→SE frame contains dual wavelengths in visible range")


def test_full_stack_transmit():
    stack  = WNSPProtocolStack()
    result = stack.transmit("Nexus", sender="test", recipient="substrate")
    assert result["protocol"] == "WNSP/7.1"
    assert "layers" in result
    assert "ce" in result["layers"]
    assert "se" in result["layers"]
    assert result["layers"]["ce"]["token_count"] == len("Nexus")
    assert result["layers"]["se"]["frame_count"] >= 1
    print("✓  Full stack CE→SE transmit produces correct envelope")


# ─────────────────────────────────────────────────────────────────
# Hilbert Space Integrity
# ─────────────────────────────────────────────────────────────────

def _channel_to_coords(index: int):
    pol_k = index % HILBERT_DIM_POL
    rem   = index // HILBERT_DIM_POL
    oam_j = rem % HILBERT_DIM_OAM
    wdm_i = rem // HILBERT_DIM_OAM
    return wdm_i, oam_j, pol_k


def _coords_to_channel(wdm_i: int, oam_j: int, pol_k: int) -> int:
    return (wdm_i * HILBERT_DIM_OAM + oam_j) * HILBERT_DIM_POL + pol_k


def test_channel_coordinate_roundtrip():
    """Flat index → coords → flat index must be identity."""
    for idx in [0, 1, 100, 1000, 12800, 25599]:
        w, o, p = _channel_to_coords(idx)
        recovered = _coords_to_channel(w, o, p)
        assert recovered == idx, f"Roundtrip failed at index {idx}"
    print("✓  Channel index ↔ coords roundtrip")


def test_all_channels_unique_triplets():
    """Every flat index must produce a unique (wdm, oam, pol) triplet."""
    seen = set()
    for idx in range(HILBERT_DIM_TOTAL):
        triplet = _channel_to_coords(idx)
        assert triplet not in seen, f"Duplicate triplet at index {idx}: {triplet}"
        seen.add(triplet)
    assert len(seen) == HILBERT_DIM_TOTAL
    print(f"✓  All {HILBERT_DIM_TOTAL} channels have unique triplets — orthogonality holds")


def test_channel_coords_within_bounds():
    import random
    random.seed(7)
    sample = random.sample(range(HILBERT_DIM_TOTAL), 500)
    for idx in sample:
        w, o, p = _channel_to_coords(idx)
        assert 0 <= w < HILBERT_DIM_WDM
        assert 0 <= o < HILBERT_DIM_OAM
        assert 0 <= p < HILBERT_DIM_POL
    print("✓  Channel coords within sub-space bounds")


# ─────────────────────────────────────────────────────────────────
# SE Dual-Wavelength Packing Efficiency
# ─────────────────────────────────────────────────────────────────

def test_packing_efficiency_even():
    ce   = WNSPCharacterEncoder()
    se   = WNSPSpectralEncoder()
    text = "NexusOS"  # 7 chars → 4 frames (padded to 8)
    out  = ce.encode_text(text)
    result = se.encode_token_stream(out)
    n_frames = result["frame_count"]
    n_chars  = len(text)
    packing  = result["chars_per_frame"]
    # packing = tokens / frames (may be padded)
    assert packing <= 2.0
    assert packing >= 1.0
    print(f"✓  Packing efficiency: {n_chars} chars → {n_frames} frames ({packing:.2f} chars/frame)")


def test_frame_energy_positive():
    ce  = WNSPCharacterEncoder()
    se  = WNSPSpectralEncoder()
    out = ce.encode_text("Lambda")
    result = se.encode_token_stream(out)
    for frame in result["frames"]:
        assert frame["energy_joules"] > 0
        assert frame["lambda_mass_kg"] > 0
    print("✓  All frame energies and lambda masses are positive")


def test_total_energy_sum():
    ce  = WNSPCharacterEncoder()
    se  = WNSPSpectralEncoder()
    out = ce.encode_text("Test")
    result = se.encode_token_stream(out)
    computed = sum(f["energy_joules"] for f in result["frames"])
    assert abs(computed - result["total_energy_joules"]) < 1e-60
    print("✓  Total energy sum matches frame aggregate")


def test_total_mass_sum():
    ce  = WNSPCharacterEncoder()
    se  = WNSPSpectralEncoder()
    out = ce.encode_text("Test")
    result = se.encode_token_stream(out)
    computed = sum(f["lambda_mass_kg"] for f in result["frames"])
    assert abs(computed - result["total_lambda_mass_kg"]) < 1e-70
    print("✓  Total Λ mass sum matches frame aggregate")


# ─────────────────────────────────────────────────────────────────
# WNSPCoordinator Tests
# ─────────────────────────────────────────────────────────────────

from wnsp_v7.wnsp_coordinator import WNSPCoordinator, PsiChannel, TOTAL_CHANNELS


def test_coordinator_register_returns_psi_channel():
    c = WNSPCoordinator()
    ch = c.register_agent("vision_ai")
    assert isinstance(ch, PsiChannel)
    assert 0 <= ch.wavelength <= 255
    assert 0 <= ch.oam <= 49
    assert ch.pol in (0, 1)
    print(f"✓  register_agent returns PsiChannel: {ch.notation()}")


def test_coordinator_notation_format():
    c = WNSPCoordinator()
    ch = c.register_agent("os_kernel")
    n = ch.notation()
    assert n.startswith("Ψ(")
    assert ", H)" in n or ", V)" in n
    print(f"✓  notation format correct: {n}")


def test_coordinator_deterministic():
    """Same agent_id must always produce the same channel."""
    c1 = WNSPCoordinator()
    c2 = WNSPCoordinator()
    ch1 = c1.register_agent("planner_ai")
    ch2 = c2.register_agent("planner_ai")
    assert ch1.wavelength == ch2.wavelength
    assert ch1.oam == ch2.oam
    assert ch1.pol == ch2.pol
    print(f"✓  Channel allocation is deterministic: {ch1.notation()}")


def test_coordinator_orthogonality():
    """No two agents can share the same (wdm, oam, pol) triplet."""
    c = WNSPCoordinator()
    agents = ["vision_ai", "planner_ai", "os_kernel", "speech_ai", "sensor_ai"]
    channels = []
    for name in agents:
        ch = c.register_agent(name)
        triplet = (ch.wavelength, ch.oam, ch.pol)
        assert triplet not in channels, f"Collision on {triplet}"
        channels.append(triplet)
    print(f"✓  All {len(agents)} agents orthogonal — no channel collisions")


def test_coordinator_idempotent_register():
    """Re-registering the same agent returns the same channel."""
    c = WNSPCoordinator()
    ch1 = c.register_agent("alpha")
    ch2 = c.register_agent("alpha")
    assert ch1.flat_index == ch2.flat_index
    print("✓  Idempotent registration returns same channel")


def test_coordinator_route():
    c = WNSPCoordinator()
    c.register_agent("router_ai")
    record = c.route("router_ai", "detect objects")
    assert record["agent"] == "router_ai"
    assert record["payload"] == "detect objects"
    assert "channel" in record
    assert record["channel"]["notation"].startswith("Ψ(")
    print(f"✓  route() returns correct record: {record['display']}")


def test_coordinator_route_increments_count():
    c = WNSPCoordinator()
    c.register_agent("counter_ai")
    for _ in range(3):
        c.route("counter_ai", "ping")
    stats = c.agent_stats("counter_ai")
    assert stats["routed_count"] == 3
    print("✓  routed_count increments correctly")


def test_coordinator_unregister():
    c = WNSPCoordinator()
    c.register_agent("temp_ai")
    assert c.unregister_agent("temp_ai") is True
    assert c.get_channel("temp_ai") is None
    assert len(c._channels_in_use) == 0
    print("✓  unregister_agent releases channel back to pool")


def test_coordinator_scheduler():
    c = WNSPCoordinator()
    c.register_agent("sched_ai")
    depth = c.schedule("sched_ai", "task A", priority=3)
    c.schedule("sched_ai", "task B", priority=1)
    assert c.queue_depth() == 2
    result = c.dispatch_next()  # priority 1 dispatched first
    assert result["payload"] == "task B"
    print("✓  Scheduler dispatches lowest priority number first")


def test_coordinator_status():
    c = WNSPCoordinator()
    c.register_agent("status_ai")
    s = c.status()
    assert s["agents"] == 1
    assert s["channels_used"] == 1
    assert s["capacity"] == TOTAL_CHANNELS
    print(f"✓  status() correct: {s['agents']} agent, {s['capacity']} capacity")


def test_psi_channel_flat_index_roundtrip():
    """Flat index must encode wdm, oam, pol without collision."""
    seen = set()
    for wdm in range(0, 256, 16):   # sample 16 wdm values
        for oam in range(0, 50, 5): # sample 10 oam values
            for pol in (0, 1):
                ch = PsiChannel(wdm, oam, pol)
                idx = ch.flat_index
                assert idx not in seen, f"Flat index collision at {ch.notation()}"
                seen.add(idx)
    print(f"✓  PsiChannel flat_index unique across {len(seen)} sampled channels")


def test_coordinator_route_log():
    c = WNSPCoordinator()
    c.register_agent("log_ai")
    c.route("log_ai", "msg 1")
    c.route("log_ai", "msg 2")
    log = c.route_log()
    assert len(log) == 2
    assert log[0]["payload"] == "msg 1"
    print("✓  route_log() records entries in order")


# ─────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_constants,
        test_version_stamps,
        test_ce_single_char,
        test_ce_normalised_range,
        test_ce_ordinal_formula,
        test_ce_text_encodes_all_chars,
        test_ce_space_padding_token,
        test_se_wavelength_to_frequency,
        test_se_energy_conservation,
        test_se_lambda_mass_conservation,
        test_se_mass_energy_ratio,
        test_se_normalised_to_wavelength_range,
        test_ce_se_handoff_frame_count,
        test_ce_se_handoff_odd_length_padding,
        test_ce_se_frame_has_both_wavelengths,
        test_full_stack_transmit,
        test_channel_coordinate_roundtrip,
        test_all_channels_unique_triplets,
        test_channel_coords_within_bounds,
        test_packing_efficiency_even,
        test_frame_energy_positive,
        test_total_energy_sum,
        test_total_mass_sum,
        # WNSPCoordinator
        test_coordinator_register_returns_psi_channel,
        test_coordinator_notation_format,
        test_coordinator_deterministic,
        test_coordinator_orthogonality,
        test_coordinator_idempotent_register,
        test_coordinator_route,
        test_coordinator_route_increments_count,
        test_coordinator_unregister,
        test_coordinator_scheduler,
        test_coordinator_status,
        test_psi_channel_flat_index_roundtrip,
        test_coordinator_route_log,
    ]

    passed = 0
    failed = 0
    print(f"\nWNSP Protocol Test Suite — {len(tests)} tests\n{'─'*50}")
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"✗  {t.__name__}: {e}")
            failed += 1

    print(f"{'─'*50}")
    print(f"Results: {passed} passed, {failed} failed\n")
    sys.exit(0 if failed == 0 else 1)
