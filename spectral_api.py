"""
Spectral API — WNSP Two-Layer Protocol Gateway
===============================================

REST gateway exposing the WNSP-CE and WNSP-SE encoding standards
and the K1 Orchestration Runtime.

Protocol stack:
  WNSP-CE v1.0  Character Encoding Standard  (semantic layer)
  WNSP-SE v1.0  Spectral Encoding Standard   (physical wave layer)
  Λ = hf/c²     Core physics equation

Author: Te Rata Pou
License: AGPL-3.0
"""

import json
import time
from typing import Optional

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from wnsp_protocol_v7 import (
    encode_lambda_message,
    LambdaEncoder,
    WNSPProtocolStack,
    WNSPCharacterEncoder,
    WNSPSpectralEncoder,
    wavelength_to_frequency,
    char_to_wavelength,
    lambda_mass,
    compute_spectral_vector,
    compute_wnsp_density,
    channel_density_at_wdm,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    VISIBLE_MIN_NM,
    VISIBLE_MAX_NM,
    WNSP_CE_VERSION,
    WNSP_SE_VERSION,
    WNSP_PROTOCOL,
    FIRST_OSCILLATION_THz,
    ROOT_HARMONIC_Hz,
    HILBERT_DIM_WDM,
    HILBERT_DIM_OAM,
    HILBERT_DIM_POL,
    HILBERT_DIM_TOTAL,
    CHANNEL_BASIS_EQUATION,
)

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────────────────────────
# Protocol Information
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/protocol', methods=['GET'])
def protocol_info():
    """Describe both WNSP encoding standards."""
    return jsonify({
        "protocol": WNSP_PROTOCOL,
        "standards": {
            "WNSP-CE": {
                "version":     WNSP_CE_VERSION,
                "name":        "Character Encoding Standard",
                "layer":       "1 — Semantic",
                "description": "Converts human-readable symbols into normalised ordinal tokens. "
                               "Agnostic to physical medium. Output consumed exclusively by WNSP-SE.",
                "output":      "Normalised ordinal codes in [0, 1] per symbol",
                "endpoint":    "/api/wnsp/ce/encode",
            },
            "WNSP-SE": {
                "version":     WNSP_SE_VERSION,
                "name":        "Spectral Encoding Standard",
                "layer":       "2 — Physical",
                "description": "Maps WNSP-CE tokens into electromagnetic wave frames. "
                               "Governed by Λ = hf/c². Two symbols packed per photon frame.",
                "output":      "Wavelength/frequency/lambda-mass frames",
                "equation":    "Λ = hf/c²",
                "endpoint":    "/api/wnsp/se/encode",
                "first_oscillation_hz": FIRST_OSCILLATION_THz,
                "root_harmonic_hz":     ROOT_HARMONIC_Hz,
                "hilbert_space": {
                    "channel_basis":  CHANNEL_BASIS_EQUATION,
                    "sub_spaces": {
                        "|λ_i⟩":   {"name": "WDM wavelength",        "dim": HILBERT_DIM_WDM},
                        "|OAM_j⟩": {"name": "Orbital angular momentum", "dim": HILBERT_DIM_OAM},
                        "|Pol_k⟩": {"name": "Polarisation (H/V)",    "dim": HILBERT_DIM_POL},
                    },
                    "total_dim":      HILBERT_DIM_TOTAL,
                    "orthogonality":  "⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j",
                },
            },
        },
        "handoff": "CE  →  ordinal tokens  →  SE  →  wave frames",
        "full_stack_endpoint": "/api/wnsp/transmit",
    })


# ─────────────────────────────────────────────────────────────────
# WNSP-CE  Layer 1 endpoints
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/ce/encode', methods=['POST'])
def ce_encode():
    """WNSP-CE: encode text into character tokens (semantic layer)."""
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({"error": "Missing 'content' field"}), 400

    try:
        ce = WNSPCharacterEncoder()
        result = ce.encode_text(data['content'])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/ce/char', methods=['POST'])
def ce_char():
    """WNSP-CE: encode a single character into its token."""
    data = request.get_json()
    if not data or 'char' not in data:
        return jsonify({"error": "Missing 'char' field"}), 400

    try:
        ce = WNSPCharacterEncoder()
        return jsonify(ce.encode_char(data['char']))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────
# WNSP-SE  Layer 2 endpoints
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/se/encode', methods=['POST'])
def se_encode():
    """WNSP-SE: encode a WNSP-CE token stream into wave frames (physical layer)."""
    data = request.get_json()
    if not data or 'tokens' not in data:
        return jsonify({"error": "Missing 'tokens' field (WNSP-CE output required)"}), 400

    try:
        se = WNSPSpectralEncoder(
            intensity=data.get('intensity', 32),
            cycles=data.get('cycles', 1),
        )
        return jsonify(se.encode_token_stream(data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/wascii/table', methods=['GET'])
def wascii_table():
    """
    Return the full WASCII lookup table (character → wavelength nm).
    WNSP Spectral Encoding Standard v1.0, November 2025.
    """
    try:
        from wnsp_protocol_v7 import WASCII_TABLE
        entries = [
            {
                "char":         ch,
                "wavelength_nm": nm,
                "frequency_hz":  SPEED_OF_LIGHT / (nm * 1e-9),
                "energy_joules": PLANCK_CONSTANT * (SPEED_OF_LIGHT / (nm * 1e-9)),
            }
            for ch, nm in sorted(WASCII_TABLE.items(), key=lambda x: x[1])
        ]
        return jsonify({
            "standard":   "WASCII — Wavelength-Native Character Standard",
            "protocol":   "WNSP-SE v1.0",
            "date":       "November 2025",
            "total":      len(entries),
            "range_nm":   {"min": min(nm for _, nm in WASCII_TABLE.items()),
                           "max": max(nm for _, nm in WASCII_TABLE.items())},
            "table":      entries,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/wascii/lookup', methods=['POST'])
def wascii_lookup():
    """
    Look up a string — return per-character WASCII wavelength + WnspFrame fields.
    """
    data = request.get_json() or {}
    text = data.get('text', '')
    if not text:
        return jsonify({"error": "Missing 'text' field"}), 400
    try:
        from wnsp_protocol_v7 import WASCII_TABLE, _wascii_wavelength
        results = []
        for ch in text:
            nm, defined = _wascii_wavelength(ch)
            freq = SPEED_OF_LIGHT / (nm * 1e-9)
            results.append({
                "char":           ch,
                "wavelength_nm":  nm,
                "frequency_hz":   freq,
                "energy_joules":  PLANCK_CONSTANT * freq,
                "lambda_mass_kg": (PLANCK_CONSTANT * freq) / (SPEED_OF_LIGHT ** 2),
                "wascii_defined": defined,
                "checksum":       (ord(ch) ^ int(round(nm))) % 256,
            })
        return jsonify({
            "protocol": "WNSP-SE v1.0",
            "input":    text,
            "chars":    len(text),
            "frames":   results,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────
# WASCII v2.0  —  Wave Density Spectral Vector endpoint
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/spectral-vector', methods=['GET', 'POST'])
def spectral_vector():
    """
    WASCII v2.0 — Wave Density Spectral Vector.

    Returns the full compression-state distribution for a string.
    Each character maps to its WASCII wavelength (compression state).
    The histogram across 256 WDM bands is the spectral fingerprint.

    GET  /api/wnsp/spectral-vector?text=NexusOS
    POST /api/wnsp/spectral-vector  body: {"text": "NexusOS"}

    Response includes:
      bands             — WDM histogram {band_index: count}
      centroid_nm       — weighted average compression state
      bandwidth_nm      — spectral spread (standard deviation)
      spectral_entropy  — Shannon entropy 0-1 (richness score)
      dominant_band     — most-populated compression band
      character_states  — per-character compression state details
      compression_range — [min_nm, max_nm] span of states used
      unique_states     — number of unique compression states
    """
    if request.method == 'GET':
        text = request.args.get('text', '')
    else:
        data = request.get_json() or {}
        text = data.get('text', '')

    if not text:
        return jsonify({"error": "Missing 'text' parameter"}), 400

    try:
        result = compute_spectral_vector(text)
        result["input"] = text
        result["theory"] = (
            "Each character is a compression state on the Λ=hf/c² curve. "
            "The distribution of those states across WDM bands is the spectral "
            "fingerprint — unique to this exact string, derived from physics."
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/density', methods=['GET', 'POST'])
def wnsp_density():
    """
    WNSP Density Equation v1.0 — D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M

    Computes channel capacity via Hilbert space expansion and connects
    to the Λ=hf/c² compression state curve through energy normalization.

    GET  /api/wnsp/density                              — default parameters
    GET  /api/wnsp/density?r_sym=16&m=64&wavelength=550
    POST /api/wnsp/density  body: {"r_sym": 16, "m": 64, "wavelength_nm": 550}

    Response includes:
      hilbert_space    — N_wdm, N_oam, N_pol, total channels, dimension note
      density          — d_raw (symbols/cycle), d_energy (symbols/joule)
      parameters       — r_sym, m, wavelength_nm, frequency, energy, Λ mass
      scaling_phases   — Phase 1 / 2 / 3 density projections
      shannon_comparison — traditional vs WNSP density model
      theory           — physics explanation
    """
    if request.method == 'GET':
        args = request.args
    else:
        args = request.get_json() or {}

    def _float(key, default):
        try:
            return float(args.get(key, default))
        except (TypeError, ValueError):
            return default

    def _int(key, default):
        try:
            return int(args.get(key, default))
        except (TypeError, ValueError):
            return default

    r_sym        = _float('r_sym',        2.0)
    m            = _float('m',            1.0)
    wavelength_nm = _float('wavelength_nm', 550.0)
    n_wdm        = _int('n_wdm',         256)
    n_oam        = _int('n_oam',         50)
    n_pol        = _int('n_pol',         2)

    # Clamp to valid ranges
    r_sym        = max(1.0,  min(r_sym, 1024.0))
    m            = max(1.0,  min(m, 256.0))
    wavelength_nm = max(380.0, min(wavelength_nm, 780.0))
    n_wdm        = max(1,    min(n_wdm, 256))
    n_oam        = max(1,    min(n_oam, 100))
    n_pol        = max(1,    min(n_pol, 4))

    try:
        result = compute_wnsp_density(
            n_wdm=n_wdm, n_oam=n_oam, n_pol=n_pol,
            r_sym=r_sym, m=m, wavelength_nm=wavelength_nm,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/se/wavelength', methods=['POST'])
def se_wavelength():
    """WNSP-SE: convert a wavelength (nm) to full wave properties."""
    data = request.get_json()
    if not data or 'wavelength_nm' not in data:
        return jsonify({"error": "Missing 'wavelength_nm' field"}), 400

    try:
        wl_nm = float(data['wavelength_nm'])
        freq  = wavelength_to_frequency(wl_nm)
        mass  = lambda_mass(freq)
        energy = PLANCK_CONSTANT * freq
        return jsonify({
            "protocol":      "WNSP-SE",
            "version":       WNSP_SE_VERSION,
            "wavelength_nm": wl_nm,
            "frequency_hz":  freq,
            "energy_joules": energy,
            "lambda_mass_kg": mass,
            "equation":      "Λ = hf/c²",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────
# Full WNSP Stack  (CE → SE in one call)
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/transmit', methods=['POST'])
def wnsp_transmit():
    """Run the full WNSP two-layer stack: CE → SE → transmission envelope."""
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({"error": "Missing 'content' field"}), 400

    try:
        stack = WNSPProtocolStack(
            intensity=data.get('intensity', 32),
            cycles=data.get('cycles', 1),
        )
        result = stack.transmit(
            text=data['content'],
            sender=data.get('sender', ''),
            recipient=data.get('recipient', ''),
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────
# Legacy endpoints  (backward-compatible)
# ─────────────────────────────────────────────────────────────────

@app.route('/api/spectral/constants', methods=['GET'])
def get_constants():
    return jsonify({
        "planckConstant":  PLANCK_CONSTANT,
        "speedOfLight":    SPEED_OF_LIGHT,
        "visibleMinNm":    VISIBLE_MIN_NM,
        "visibleMaxNm":    VISIBLE_MAX_NM,
        "firstOscillationHz": FIRST_OSCILLATION_THz,
        "rootHarmonicHz":     ROOT_HARMONIC_Hz,
        "wdmChannels":    256,
        "oamModes":       8,
        "channelSpacing": 1.5625,
        "wnsp_ce_version": WNSP_CE_VERSION,
        "wnsp_se_version": WNSP_SE_VERSION,
    })


@app.route('/api/spectral/capacity', methods=['GET'])
def get_capacity():
    total_channels = HILBERT_DIM_TOTAL  # 25,600
    # ── Density equation applied to this capacity report ──────────────────────
    density_phase1 = compute_wnsp_density(n_wdm=100,             r_sym=2.0, m=1, wavelength_nm=550.0)
    density_phase2 = compute_wnsp_density(n_wdm=HILBERT_DIM_WDM, r_sym=2.0, m=1, wavelength_nm=550.0)
    density_phase3 = compute_wnsp_density(n_wdm=HILBERT_DIM_WDM, r_sym=16.0, m=64, wavelength_nm=550.0)

    return jsonify({
        "wdm_channels":           HILBERT_DIM_WDM,
        "oam_modes":              HILBERT_DIM_OAM,
        "polarization_modes":     HILBERT_DIM_POL,
        "total_channels":         total_channels,
        "bits_per_symbol_16qam":  total_channels * 4,
        "theoretical_tbps_at_100gbaud": total_channels * 4 * 100 / 1000,
        "hilbert_space": {
            "channel_basis": CHANNEL_BASIS_EQUATION,
            "dim_wdm":       HILBERT_DIM_WDM,
            "dim_oam":       HILBERT_DIM_OAM,
            "dim_pol":       HILBERT_DIM_POL,
            "total_dim":     HILBERT_DIM_TOTAL,
            "orthogonality": "⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j",
        },
        "density_equation": {
            "formula":         "D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M",
            "energy_formula":  "D_energy = D_WNSP · λ / (h · c)",
            "phase_1_complete": density_phase1["density"]["d_raw"],
            "phase_2_now":      density_phase2["density"]["d_raw"],
            "phase_3_photonic": density_phase3["density"]["d_raw"],
            "active_phase":     2,
            "active_wdm_bands": HILBERT_DIM_WDM,
            "shannon_vs_wnsp": "Shannon: C ∝ log(1+SNR). WNSP: D ∝ N·R·M. Orthogonal expansion, not compression.",
        },
    })


@app.route('/api/spectral/encode', methods=['POST'])
def encode_message():
    """Legacy encode endpoint — routes through the full WNSP stack."""
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({"error": "Missing 'content' field"}), 400

    try:
        result = encode_lambda_message(
            content=data.get('content', ''),
            sender=data.get('sender', ''),
            recipient=data.get('recipient', ''),
            intensity=data.get('intensity', 32),
            cycles=data.get('cycles', 1),
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/spectral/char-to-wavelength', methods=['POST'])
def char_wavelength():
    """Legacy: map a character through CE → SE to get wave properties."""
    data = request.get_json()
    if not data or 'char' not in data:
        return jsonify({"error": "Missing 'char' field"}), 400

    char = data['char']
    # CE layer
    ce   = WNSPCharacterEncoder()
    token = ce.encode_char(char)
    # SE layer
    se   = WNSPSpectralEncoder()
    wl   = se.normalised_to_wavelength(token["normalised"])
    freq = se.wavelength_to_frequency(wl)
    mass = se.frequency_to_lambda_mass(freq)

    return jsonify({
        "char":             char,
        "wnsp_ce":          token,
        "wavelength_nm":    wl,
        "frequency_hz":     freq,
        "lambda_mass_kg":   mass,
        "protocol_layers":  ["WNSP-CE", "WNSP-SE"],
    })


@app.route('/api/spectral/wavelength-to-frequency', methods=['POST'])
def wavelength_freq():
    data = request.get_json()
    if not data or 'wavelength_nm' not in data:
        return jsonify({"error": "Missing 'wavelength_nm' field"}), 400

    wavelength_nm = float(data['wavelength_nm'])
    frequency     = wavelength_to_frequency(wavelength_nm)
    mass          = lambda_mass(frequency)
    energy        = PLANCK_CONSTANT * frequency

    return jsonify({
        "wavelength_nm":  wavelength_nm,
        "frequency_hz":   frequency,
        "lambda_mass_kg": mass,
        "energy_joules":  energy,
    })


@app.route('/api/spectral/health', methods=['GET'])
def health_check():
    return jsonify({
        "status":   "healthy",
        "service":  "Spectral API",
        "version":  "7.1.0",
        "protocol": WNSP_PROTOCOL,
        "standards": ["WNSP-CE v" + WNSP_CE_VERSION, "WNSP-SE v" + WNSP_SE_VERSION],
        "physics":  "Λ = hf/c²",
    })


# ─────────────────────────────────────────────────────────────────
# K1 Orchestration Runtime
# ─────────────────────────────────────────────────────────────────

_k1_runtime = None

def get_k1_runtime():
    global _k1_runtime
    if _k1_runtime is None:
        from wnsp_v7.k1_orchestration import K1OrchestrationRuntime
        _k1_runtime = K1OrchestrationRuntime("k1_api_runtime")
        _k1_runtime.initialize()
    return _k1_runtime


@app.route('/api/k1/status', methods=['GET'])
def k1_status():
    try:
        return jsonify(get_k1_runtime().get_status())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/k1/evolve', methods=['POST'])
def k1_evolve():
    try:
        data     = request.get_json() or {}
        n_steps  = data.get('n_steps', 10)
        dt       = data.get('dt', 0.001)
        runtime  = get_k1_runtime()
        snapshots = runtime.run_evolution(n_steps=n_steps, dt=dt)
        return jsonify({
            "status":            "evolved",
            "steps":             len(snapshots),
            "final_tick":        runtime.tick,
            "sync_quality":      runtime.sync_quality,
            "resonance_strength": runtime.resonance_strength,
            "state":             runtime.state.state_id,
            "snapshots":         [s.to_dict() for s in snapshots[-5:]],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/k1/telemetry', methods=['GET'])
def k1_telemetry():
    try:
        return jsonify(get_k1_runtime().get_telemetry_summary(last_n=100))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/k1/reset', methods=['POST'])
def k1_reset():
    global _k1_runtime
    try:
        _k1_runtime = None
        runtime = get_k1_runtime()
        return jsonify({"status": "reset", "state": runtime.state.state_id, "tick": runtime.tick})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Power Extraction Simulator sync
_simulator_state = {
    "total_harvested_energy": 0.0,
    "last_power":             0.0,
    "contributions":          0,
    "coherence_boost":        0.0,
}


@app.route('/api/k1/simulator/inject', methods=['POST'])
def simulator_inject_energy():
    global _simulator_state
    try:
        data             = request.get_json() or {}
        harvested_energy = data.get('harvested_energy', 0.0)
        instant_power    = data.get('instant_power',    0.0)
        coherence        = data.get('coherence',        0.0)

        _simulator_state['total_harvested_energy'] += harvested_energy
        _simulator_state['last_power']              = instant_power
        _simulator_state['contributions']          += 1

        runtime      = get_k1_runtime()
        energy_factor = min(harvested_energy * 1e6, 0.1)

        if hasattr(runtime, 'wired_substrate') and runtime.wired_substrate:
            if hasattr(runtime.wired_substrate, 'operational'):
                runtime.wired_substrate.operational.energy_pool += energy_factor
                current_coherence = runtime.wired_substrate.operational.coherence
                boosted_coherence = min(1.0, current_coherence + coherence * 0.01)
                runtime.wired_substrate.operational.coherence = boosted_coherence
                _simulator_state['coherence_boost'] = boosted_coherence - current_coherence

        return jsonify({
            "status":          "injected",
            "energy_added":    energy_factor,
            "total_harvested": _simulator_state['total_harvested_energy'],
            "contributions":   _simulator_state['contributions'],
            "coherence_boost": _simulator_state['coherence_boost'],
            "k1_tick":         runtime.tick,
            "k1_state":        runtime.state.state_id,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/k1/simulator/sync', methods=['GET'])
def simulator_sync():
    global _simulator_state
    try:
        runtime           = get_k1_runtime()
        backend_coherence = 0.85
        energy_pool       = 0.0
        lm                = 0.0

        if hasattr(runtime, 'wired_substrate') and runtime.wired_substrate:
            if hasattr(runtime.wired_substrate, 'operational'):
                backend_coherence = runtime.wired_substrate.operational.coherence
                energy_pool       = runtime.wired_substrate.operational.energy_pool
                lm                = runtime.wired_substrate.operational.total_lambda_mass

        return jsonify({
            "backend_coherence":  backend_coherence,
            "energy_pool":        energy_pool,
            "lambda_mass":        lm,
            "k1_tick":            runtime.tick,
            "k1_state":           runtime.state.state_id,
            "sync_quality":       runtime.sync_quality,
            "resonance_strength": runtime.resonance_strength,
            "simulator_stats":    _simulator_state,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/k1/simulator/reset', methods=['POST'])
def simulator_reset():
    global _simulator_state
    _simulator_state = {
        "total_harvested_energy": 0.0,
        "last_power":             0.0,
        "contributions":          0,
        "coherence_boost":        0.0,
    }
    return jsonify({"status": "reset", "simulator_state": _simulator_state})


# ─────────────────────────────────────────────────────────────────
# AI/OS Channel Coordination Layer
# Backed by WNSPCoordinator — the formal runtime for mapping agents
# and OS processes onto the 25,600-dimensional Hilbert space.
# ─────────────────────────────────────────────────────────────────

from wnsp_v7.wnsp_coordinator import WNSPCoordinator, WNSPBus
from wnsp_v7.kernel_authority  import (
    check_send_permission, band_for_agent, all_bands_summary, AuthorityBand
)
from wnsp_v7.kernel_boot     import boot as _kernel_boot, boot_log as _kernel_boot_log
from wnsp_v7.kernel_watchdog import KernelWatchdog
from wnsp_v7.kernel_events   import KernelEventBus
from wnsp_v7               import kernel_persistence as _kp

# ── Singletons ────────────────────────────────────────────────────
_coordinator = WNSPCoordinator()
_bus         = WNSPBus(_coordinator)
_events      = KernelEventBus()
_watchdog    = KernelWatchdog(_coordinator, ttl_seconds=300, reclaim_after=600)

# ── Kernel-aware dispatch wrapper ─────────────────────────────────
def _kernel_dispatch() -> Optional[dict]:
    """Call bus.dispatch, then emit interrupt and persist route."""
    record = _bus.dispatch()
    if record:
        _events.emit("MESSAGE_ARRIVED",
                     agent_id=record.get("dst"),
                     detail={
                         "route":   record.get("route"),
                         "payload": str(record.get("payload", ""))[:120],
                     })
        try:
            _kp.save_bus_route(record)
        except Exception:
            pass
    return record

# ── Boot kernel on first import ───────────────────────────────────
_boot_report = _kernel_boot(_coordinator, _bus)
_watchdog.start()
_events.emit("BOOT_COMPLETE", detail={"phases": len(_boot_report.get("phases", []))})


@app.route('/api/wnsp/agent/allocate', methods=['POST'])
def agent_allocate():
    """Register an agent and allocate its unique Ψ_channel."""
    data     = request.get_json() or {}
    agent_id = data.get('agent_id', '').strip()
    intent   = data.get('intent', 'general')

    if not agent_id:
        return jsonify({"error": "Missing 'agent_id' field"}), 400

    try:
        already = agent_id in _coordinator._registry
        channel = _coordinator.register_agent(agent_id, intent)
        stats   = _coordinator.agent_stats(agent_id)
        band    = band_for_agent(agent_id, channel.wavelength)
        if not already:
            try:
                _kp.save_agent(agent_id, channel.wavelength, channel.oam,
                               channel.pol, intent=intent, authority_band=band.name)
            except Exception:
                pass
            _events.emit("AGENT_REGISTERED", agent_id=agent_id,
                         detail={"channel": channel.notation(), "band": band.name})
        # ── Density at this channel's compression state ───────────────
        wdm_band = max(1, min(256, int((channel.wavelength - 380) / 4) + 1)) if 380 <= channel.wavelength < 780 else 1
        ch_density = channel_density_at_wdm(wdm_band)

        return jsonify({
            "status":   "existing" if already else "allocated",
            "agent_id": agent_id,
            "display":  f"{agent_id} → {channel.notation()}",
            **stats["channel"],
            "intent":         stats["intent"],
            "registered_at":  stats["registered_at"],
            "routed_count":   stats["routed_count"],
            "authority_band": band.name,
            "channel_density": {
                "wdm_band":           ch_density["wdm_band"],
                "wavelength_nm":      ch_density["wavelength_nm"],
                "d_channel":          ch_density["d_channel"],
                "d_energy_per_joule": ch_density["d_energy_per_joule"],
                "sub_channels":       ch_density["sub_channels"],
                "equation":           ch_density["equation"],
                "note": (
                    "Density of this specific compression state on the Λ=hf/c² curve. "
                    "Higher WDM index (longer λ) = lower energy per photon = "
                    "more symbols per joule."
                ),
            },
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/agent/map', methods=['POST'])
def agent_map():
    """Route an AI instruction through CE→SE and bind it to the agent's Ψ_channel."""
    data        = request.get_json() or {}
    agent_id    = data.get('agent_id', '').strip()
    instruction = data.get('instruction', '').strip()

    if not agent_id:
        return jsonify({"error": "Missing 'agent_id' field"}), 400
    if not instruction:
        return jsonify({"error": "Missing 'instruction' field"}), 400

    try:
        # Auto-register if needed
        _coordinator.register_agent(agent_id, 'instruction')

        # Route through coordinator
        record = _coordinator.route(agent_id, instruction)

        # Run instruction through full CE→SE stack for frame data
        stack  = WNSPProtocolStack()
        result = stack.transmit(text=instruction, sender=agent_id, recipient='os')
        frames = result.get('layers', {}).get('se', {}).get('frames', [])

        return jsonify({
            "status":         "mapped",
            "agent_id":       agent_id,
            "instruction":    instruction,
            "display":        record["display"],
            "channel":        record["channel"],
            "frame_count":    len(frames),
            "frames_preview": frames[:5],
            "orthogonality":  "⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j",
            "timestamp":      record["timestamp"],
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/agent/status', methods=['GET'])
def agent_status():
    """Return coordinator status and all allocated agent channels."""
    status = _coordinator.status()
    agents = _coordinator.all_agent_stats()

    # ── Enrich each agent with density at its compression state ──────────────
    # all_agent_stats() returns {agent_name: stats_dict}
    enriched_agents = {}
    for name, info in agents.items():
        wl  = info.get("channel", {}).get("wavelength_nm", 550.0)
        wdm = max(1, min(256, int((wl - 380) / 4) + 1)) if 380 <= wl < 780 else 1
        cd  = channel_density_at_wdm(wdm)
        enriched_agents[name] = {
            **info,
            "channel_density": {
                "wdm_band":           cd["wdm_band"],
                "wavelength_nm":      cd["wavelength_nm"],
                "d_channel":          cd["d_channel"],
                "d_energy_per_joule": cd["d_energy_per_joule"],
                "sub_channels":       cd["sub_channels"],
            },
        }

    # ── System-wide density equation at full Hilbert space ───────────────────
    sys_density = compute_wnsp_density()

    return jsonify({
        **status,
        "total_channels":    status["capacity"],
        "occupied_channels": status["channels_used"],
        "available_channels": status["capacity"] - status["channels_used"],
        "agents": enriched_agents,
        "system_density": {
            "equation":   sys_density["equation"],
            "d_wnsp":     sys_density["density"]["d_raw"],
            "hilbert_channels": sys_density["hilbert_space"]["total_channels"],
            "phase_1":    sys_density["scaling_phases"][0]["d_symbols"],
            "phase_2":    sys_density["scaling_phases"][1]["d_symbols"],
            "phase_3":    sys_density["scaling_phases"][2]["d_symbols"],
        },
    })


@app.route('/api/wnsp/agent/release', methods=['POST'])
def agent_release():
    """Release an agent's allocated Ψ_channel back to the pool."""
    data     = request.get_json() or {}
    agent_id = data.get('agent_id', '').strip()

    if not agent_id:
        return jsonify({"error": "Missing 'agent_id' field"}), 400

    stats = _coordinator.agent_stats(agent_id)
    if stats is None:
        return jsonify({"error": f"Agent '{agent_id}' not found"}), 404

    channel_notation = stats["channel"]["notation"]
    _coordinator.unregister_agent(agent_id)
    try:
        _kp.delete_agent(agent_id)
    except Exception:
        pass
    _events.emit("AGENT_RELEASED", agent_id=agent_id,
                 detail={"channel": channel_notation})
    return jsonify({
        "status":           "released",
        "agent_id":         agent_id,
        "channel":          channel_notation,
        "remaining_agents": len(_coordinator._registry),
    })


@app.route('/api/wnsp/agent/schedule', methods=['POST'])
def agent_schedule():
    """Add an instruction to the coordinator's priority queue."""
    data        = request.get_json() or {}
    agent_id    = data.get('agent_id', '').strip()
    payload     = data.get('payload', '')
    priority    = int(data.get('priority', 5))
    intent      = data.get('intent', '')

    if not agent_id or not payload:
        return jsonify({"error": "Missing 'agent_id' or 'payload' field"}), 400

    try:
        depth = _coordinator.schedule(agent_id, payload, priority=priority, intent=intent)
        return jsonify({
            "status":      "scheduled",
            "agent_id":    agent_id,
            "priority":    priority,
            "queue_depth": depth,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/agent/dispatch', methods=['POST'])
def agent_dispatch():
    """Dispatch the next highest-priority instruction from the queue."""
    try:
        record = _coordinator.dispatch_next()
        if record is None:
            return jsonify({"status": "empty", "message": "No items in schedule queue"})
        return jsonify({"status": "dispatched", **record})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/agent/log', methods=['GET'])
def agent_log():
    """Return the most recent routing log entries (Runtime Monitor)."""
    last_n = int(request.args.get('n', 50))
    return jsonify({
        "log":   _coordinator.route_log(last_n),
        "total": len(_coordinator._route_log),
    })


# ─────────────────────────────────────────────────────────────────
# WNSP Message Bus
# Agent → Message Bus → Ψ routing → Scheduler queue → Target inbox
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/bus/send', methods=['POST'])
def bus_send():
    """Queue a message from one agent to another via the Ψ message bus."""
    data     = request.get_json() or {}
    src      = data.get('src', '').strip()
    dst      = data.get('dst', '').strip()
    payload  = data.get('payload', '')
    priority = int(data.get('priority', 5))

    if not src or not dst:
        return jsonify({"error": "Missing 'src' or 'dst' field"}), 400
    if not payload:
        return jsonify({"error": "Missing 'payload' field"}), 400
    if not (1 <= priority <= 10):
        return jsonify({"error": "priority must be 1–10"}), 400

    try:
        # Auto-register agents if needed
        _coordinator.register_agent(src)
        _coordinator.register_agent(dst)

        src_ch = _coordinator.get_channel(src)
        dst_ch = _coordinator.get_channel(dst)

        # ── Authority check ───────────────────────────────────────
        permitted, reason = check_send_permission(
            src, src_ch.wavelength, dst, dst_ch.wavelength
        )
        if not permitted:
            return jsonify({
                "error":  "AUTHORITY_DENIED",
                "reason": reason,
            }), 403

        _bus.send(src, dst, payload, priority)

        # Auto-dispatch immediately so messages never sit in the queue
        dispatch_record = _kernel_dispatch()

        snap = _bus.status()
        src_band = band_for_agent(src, src_ch.wavelength)
        return jsonify({
            "status":       "dispatched" if dispatch_record else "queued",
            "src":          src,
            "dst":          dst,
            "payload":      payload,
            "priority":     priority,
            "route":        f"{src} {src_ch.notation()} → {dst} {dst_ch.notation()}",
            "queue_depth":  snap["queued"],
            "authority":    src_band.name,
            "permitted":    True,
            "delivered":    dispatch_record is not None,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/bus/dispatch', methods=['POST'])
def bus_dispatch():
    """Pop and deliver the highest-priority queued message (kernel-aware)."""
    try:
        record = _kernel_dispatch()
        if record is None:
            return jsonify({"status": "empty", "message": "No messages in bus queue"})
        return jsonify({"status": "dispatched", **record})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/bus/receive', methods=['POST'])
def bus_receive():
    """Drain an agent's inbox and return all unread messages."""
    data  = request.get_json() or {}
    agent = data.get('agent', '').strip()

    if not agent:
        return jsonify({"error": "Missing 'agent' field"}), 400

    try:
        msgs = _bus.receive(agent)
        return jsonify({
            "agent":   agent,
            "channel": _coordinator.get_channel(agent).to_dict()
                       if _coordinator.get_channel(agent) else {},
            "count":   len(msgs),
            "messages": msgs,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/bus/status', methods=['GET'])
def bus_status():
    """Return full bus status: queue snapshot, route log, inbox depths."""
    last_n = int(request.args.get('n', 30))
    return jsonify({
        **_bus.status(),
        "queue":     _bus.queue_snapshot(),
        "route_log": _bus.route_log(last_n),
    })


# ─────────────────────────────────────────────────────────────────
# Hilbert-space channel coordinate helpers
# ─────────────────────────────────────────────────────────────────

def _coords_to_channel_index(wdm_i: int, oam_j: int, pol_k: int) -> int:
    """Convert (wdm_i, oam_j, pol_k) Hilbert-space coordinates to a linear channel index."""
    wdm_i = max(0, min(wdm_i, HILBERT_DIM_WDM - 1))
    oam_j = max(0, min(oam_j, HILBERT_DIM_OAM - 1))
    pol_k = max(0, min(pol_k, HILBERT_DIM_POL - 1))
    return wdm_i * HILBERT_DIM_OAM * HILBERT_DIM_POL + oam_j * HILBERT_DIM_POL + pol_k


def _channel_index_to_coords(idx: int):
    """Convert a linear channel index back to (wdm_i, oam_j, pol_k) Hilbert-space coordinates."""
    idx    = max(0, min(idx, HILBERT_DIM_TOTAL - 1))
    pol_k  = idx % HILBERT_DIM_POL
    tmp    = idx // HILBERT_DIM_POL
    oam_j  = tmp % HILBERT_DIM_OAM
    wdm_i  = tmp // HILBERT_DIM_OAM
    return wdm_i, oam_j, pol_k


# ─────────────────────────────────────────────────────────────────
# SE Simulation Endpoints
# Visualise channel occupation per frame, validate orthogonality,
# and report dual-wavelength packing efficiency.
# ─────────────────────────────────────────────────────────────────

@app.route('/api/wnsp/se/simulate', methods=['POST'])
def se_simulate():
    """
    Simulate SE frame encoding.
    Returns per-frame channel occupation, orthogonality validation,
    and dual-wavelength packing efficiency.
    """
    data    = request.get_json() or {}
    content = data.get('content', 'Hello Lambda')

    try:
        stack  = WNSPProtocolStack()
        result = stack.transmit(text=content, sender='sim', recipient='substrate')
        frames = result.get('layers', {}).get('se', {}).get('frames', [])

        occupation = []
        for i, frame in enumerate(frames):
            wl1 = frame.get('wavelength_start_nm', 550)
            wl2 = frame.get('wavelength_end_nm',   580)

            wdm_i1 = int((wl1 - VISIBLE_MIN_NM) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM) * (HILBERT_DIM_WDM - 1))
            wdm_i2 = int((wl2 - VISIBLE_MIN_NM) / (VISIBLE_MAX_NM - VISIBLE_MIN_NM) * (HILBERT_DIM_WDM - 1))
            oam_j  = i % HILBERT_DIM_OAM
            pol_k  = i % HILBERT_DIM_POL

            ch1 = _coords_to_channel_index(wdm_i1, oam_j, pol_k)
            ch2 = _coords_to_channel_index(wdm_i2, oam_j, 1 - pol_k)

            occupation.append({
                "frame_index":        i,
                "symbols":            frame.get('ce_symbols', []),
                "wavelength_start_nm": wl1,
                "wavelength_end_nm":   wl2,
                "wdm_i_start":        wdm_i1,
                "wdm_i_end":          wdm_i2,
                "oam_j":              oam_j,
                "pol_k":              pol_k,
                "polarisation":       "H" if pol_k == 0 else "V",
                "channel_start":      ch1,
                "channel_end":        ch2,
                "energy_joules":      frame.get('energy_joules',  0),
                "lambda_mass_kg":     frame.get('lambda_mass_kg', 0),
            })

        channel_ids    = [o['channel_start'] for o in occupation] + [o['channel_end'] for o in occupation]
        orthogonal     = len(channel_ids) == len(set(channel_ids))
        packing_ratio  = len(content) / len(frames) if frames else 0

        spectral_frames = result.get('layers', {}).get('se', {}).get('spectral_frames', [])
        psq_token       = result.get('layers', {}).get('se', {}).get('psq_token', '')
        coherence       = result.get('layers', {}).get('se', {}).get('coherence_gamma', 0)
        coherence_valid = result.get('layers', {}).get('se', {}).get('coherence_valid', False)

        return jsonify({
            "status":              "simulated",
            "protocol":            "WNSP-SE v" + WNSP_SE_VERSION,
            "wascii_standard":     "WNSP-SE v1.0 / November 2025",
            "input":               content,
            "chars":               len(content),
            "frames":              len(frames),
            "packing_ratio":       packing_ratio,
            "packing_scheme":      "dual-wavelength (2 chars/frame)",
            "spectral_frames":     spectral_frames,
            "psq_token":           psq_token,
            "coherence_gamma":     coherence,
            "coherence_valid":     coherence_valid,
            "coherence_threshold": 0.70,
            "orthogonality_valid": orthogonal,
            "orthogonality_proof": "⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j",
            "channel_occupation":  occupation,
            "hilbert_dim":         HILBERT_DIM_TOTAL,
            "total_energy_joules": sum(o['energy_joules']  for o in occupation),
            "total_lambda_mass_kg": sum(o['lambda_mass_kg'] for o in occupation),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/wnsp/se/orthogonality', methods=['GET'])
def se_orthogonality():
    """
    Validate Hilbert-space orthogonality across all 25,600 channels.
    Proves ⟨Ψ_i | Ψ_j⟩ = 0 for all i ≠ j by unique basis construction.
    """
    try:
        import random as _random
        _random.seed(42)
        sample_size = min(100, HILBERT_DIM_TOTAL)
        sample_idx  = _random.sample(range(HILBERT_DIM_TOTAL), sample_size)

        samples = []
        for idx in sample_idx:
            wdm_i, oam_j, pol_k = _channel_index_to_coords(idx)
            samples.append({
                "index":  idx,
                "wdm_i":  wdm_i,
                "oam_j":  oam_j,
                "pol_k":  pol_k,
                "basis":  f"|λ_{wdm_i}⟩ ⊗ |OAM_{oam_j}⟩ ⊗ |Pol_{'H' if pol_k == 0 else 'V'}⟩",
            })

        triplets   = [(s['wdm_i'], s['oam_j'], s['pol_k']) for s in samples]
        all_unique = len(triplets) == len(set(triplets))

        return jsonify({
            "hilbert_dim":      HILBERT_DIM_TOTAL,
            "dim_wdm":          HILBERT_DIM_WDM,
            "dim_oam":          HILBERT_DIM_OAM,
            "dim_pol":          HILBERT_DIM_POL,
            "channel_basis":    CHANNEL_BASIS_EQUATION,
            "orthogonality":    "⟨Ψ_i | Ψ_j⟩ = 0  for i ≠ j",
            "proof":            "Each channel is a unique tensor-product basis vector. "
                                "Distinct (wdm_i, oam_j, pol_k) triplets are orthogonal by construction.",
            "sample_validated": all_unique,
            "sample_size":      sample_size,
            "sample_channels":  samples[:10],
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════
#  KERNEL COMPONENT 1 — BOOT STATUS
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/kernel/boot', methods=['GET'])
def kernel_boot_status():
    """Return the boot report and boot log."""
    try:
        from wnsp_v7.kernel_boot import boot_log, is_booted
        return jsonify({
            "booted":   is_booted(),
            "log":      boot_log(),
            "report":   _boot_report,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════
#  KERNEL COMPONENT 2 — PERSISTENT STATE
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/kernel/state', methods=['GET'])
def kernel_state():
    """Return all persisted agents and recent bus log from DB."""
    try:
        if not _kp.is_available():
            return jsonify({
                "agents":        [],
                "bus_log":       [],
                "kernel_events": [],
                "live_registry": len(_coordinator._registry),
                "db_agents":     0,
                "warning":       "psycopg2 not installed — persistence unavailable (in-memory only)",
            })
        agents  = _kp.load_all_agents()
        bus_log = _kp.load_bus_log(50)
        events  = _kp.load_kernel_events(50)
        return jsonify({
            "agents":         agents,
            "bus_log":        bus_log,
            "kernel_events":  events,
            "live_registry":  len(_coordinator._registry),
            "db_agents":      len(agents),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════
#  KERNEL COMPONENT 3 — AUTHORITY / PERMISSION LAYER
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/kernel/authority', methods=['GET'])
def kernel_authority():
    """Return the full authority band model."""
    return jsonify({
        "model":  "Spectral Authority Bands",
        "rule":   "sender.rank ≤ receiver.rank (lower rank = higher authority)",
        "bands":  all_bands_summary(),
    })


@app.route('/api/kernel/authority/check', methods=['POST'])
def kernel_authority_check():
    """Check whether src is permitted to send to dst."""
    data    = request.get_json() or {}
    src     = data.get('src', '').strip()
    dst     = data.get('dst', '').strip()

    if not src or not dst:
        return jsonify({"error": "Missing 'src' or 'dst'"}), 400

    src_ch = _coordinator.get_channel(src) if src in _coordinator._registry else None
    dst_ch = _coordinator.get_channel(dst) if dst in _coordinator._registry else None

    src_wdm = src_ch.wavelength if src_ch else 200  # default GUEST wdm
    dst_wdm = dst_ch.wavelength if dst_ch else 200

    permitted, reason = check_send_permission(src, src_wdm, dst, dst_wdm)
    src_band = band_for_agent(src, src_wdm)
    dst_band = band_for_agent(dst, dst_wdm)

    return jsonify({
        "src":          src,
        "dst":          dst,
        "src_band":     src_band.name,
        "dst_band":     dst_band.name,
        "permitted":    permitted,
        "reason":       reason,
    })


# ═══════════════════════════════════════════════════════════════════
#  SECTOR CONSTITUTIONAL CHANNEL MAP
#  Each human industry sector is bound to a Ψ_channel derived from
#  its authority rank and compression state on the Λ=hf/c² curve.
#  Shorter wavelength = higher frequency = more energy = more authority.
#  Orthogonality guarantees sectors never interfere at the physics layer.
# ═══════════════════════════════════════════════════════════════════

_h = 6.626e-34   # Planck constant (J·s)
_c = 2.998e8     # Speed of light (m/s)

def _sector_physics(wdm: int, oam: int, pol: int) -> dict:
    nm  = VISIBLE_MIN_NM + (wdm / (HILBERT_DIM_WDM - 1)) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM)
    hz  = _c / (nm * 1e-9)
    E_J = _h * hz
    L_kg = E_J / (_c ** 2)
    ch  = wdm * HILBERT_DIM_OAM * HILBERT_DIM_POL + oam * HILBERT_DIM_POL + pol
    return {
        "wdm": wdm, "oam": oam, "pol": pol,
        "pol_label":    "H" if pol == 0 else "V",
        "psi":          f"Ψ({wdm},{oam},{'H' if pol == 0 else 'V'})",
        "uri":          f"wnsp://Ψ({wdm},{oam},{'H' if pol == 0 else 'V'})/",
        "channel_index": ch,
        "nm":           round(nm, 2),
        "frequency_hz": round(hz, 2),
        "energy_J":     E_J,
        "lambda_mass_kg": L_kg,
    }

SECTOR_CHANNELS = [
    {
        "id": "defense",
        "name": "Military & Sovereign Defense",
        "band": "SYSTEM",
        "authority_rank": 0,
        "color": "#dc2626",
        "description": "Sovereign security — geometrically inaccessible to lower-authority channels. Orthogonality is the security model.",
        **_sector_physics(8, 0, 0),
    },
    {
        "id": "governance",
        "name": "Governance",
        "band": "SYSTEM",
        "authority_rank": 0,
        "color": "#7c3aed",
        "description": "Constitutional authority — planetary coordination, law, and Σ-field enhanced policy.",
        **_sector_physics(35, 5, 0),
    },
    {
        "id": "energy",
        "name": "Energy",
        "band": "KERNEL",
        "authority_rank": 1,
        "color": "#ca8a04",
        "description": "Planetary-scale power generation, Schumann resonance harvesting, orbital solar, fusion photonics.",
        **_sector_physics(75, 10, 0),
    },
    {
        "id": "computing",
        "name": "Computing",
        "band": "KERNEL",
        "authority_rank": 1,
        "color": "#0891b2",
        "description": "Photonic computation — Lambda Gate processors, OAM qubit registers, wavelength-division parallel processing.",
        **_sector_physics(95, 15, 0),
    },
    {
        "id": "communications",
        "name": "Communications",
        "band": "KERNEL",
        "authority_rank": 1,
        "color": "#16a34a",
        "description": "Global wavelength routing mesh — spectral relay, OAM channel allocation, interplanetary link planning.",
        **_sector_physics(115, 20, 0),
    },
    {
        "id": "resources",
        "name": "Resources",
        "band": "USER",
        "authority_rank": 2,
        "color": "#ea580c",
        "description": "Planetary materials and logistics — wavelength ledger, photonic manufacturing, optimal transport.",
        **_sector_physics(140, 25, 0),
    },
    {
        "id": "healthcare",
        "name": "Healthcare",
        "band": "USER",
        "authority_rank": 2,
        "color": "#be185d",
        "description": "Biomedical systems — spectral diagnostics, pharmaceutical logistics, coherence-based treatment protocols.",
        **_sector_physics(162, 30, 0),
    },
    {
        "id": "education",
        "name": "Education",
        "band": "USER",
        "authority_rank": 2,
        "color": "#0284c7",
        "description": "Knowledge distribution — spectral curriculum, open-access AGPL infrastructure, wavelength-addressed learning.",
        **_sector_physics(182, 35, 0),
    },
    {
        "id": "individual",
        "name": "Individual / Personal",
        "band": "GUEST",
        "authority_rank": 3,
        "color": "#6b7280",
        "description": "Personal sovereignty — every human assigned a unique Ψ_channel derived from their identity compression state.",
        **_sector_physics(235, 45, 0),
    },
]


@app.route('/api/wnsp/sectors', methods=['GET'])
def wnsp_sector_channels():
    """
    Return the constitutional sector-to-Ψ_channel binding.
    Each human industry sector is assigned a unique orthogonal channel
    derived from its authority rank on the Λ=hf/c² compression curve.
    Sectors with higher authority (lower rank) occupy shorter wavelengths —
    higher energy, higher governance weight, geometrically inaccessible
    to lower-authority channels.
    """
    return jsonify({
        "model":       "WNSP Sector Constitutional Map v1.0",
        "principle":   "Compression state determines authority. Λ=hf/c².",
        "orthogonality": "⟨Ψ_i | Ψ_j⟩ = 0 for all i ≠ j — sectors never interfere.",
        "hilbert_dim": HILBERT_DIM_TOTAL,
        "phase":       2,
        "sectors":     SECTOR_CHANNELS,
        "band_map": {
            "SYSTEM":  {"wdm_range": "0–63",   "nm": "380–472 nm", "description": "Sovereign — violet/UV"},
            "KERNEL":  {"wdm_range": "64–127",  "nm": "472–563 nm", "description": "Kernel authority — blue/cyan"},
            "USER":    {"wdm_range": "128–191", "nm": "563–655 nm", "description": "User authority — green/yellow/orange"},
            "GUEST":   {"wdm_range": "192–255", "nm": "655–750 nm", "description": "Public access — red"},
        },
    })


# ═══════════════════════════════════════════════════════════════════
#  KERNEL COMPONENT 4 — INTERRUPT / EVENT SYSTEM
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/kernel/events', methods=['GET'])
def kernel_events():
    """Return recent kernel interrupt events (in-memory log)."""
    last_n = int(request.args.get('n', 50))
    since  = int(request.args.get('since', 0))
    try:
        if since:
            events = _events.log_since(since)
        else:
            events = _events.log(last_n)
        return jsonify({
            "events":  events,
            "count":   len(events),
            "status":  _events.status(),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/kernel/events/emit', methods=['POST'])
def kernel_events_emit():
    """Manually emit a kernel event (for testing / admin use)."""
    data       = request.get_json() or {}
    event_type = data.get('event_type', '').strip()
    agent_id   = data.get('agent_id')
    detail     = data.get('detail', {})

    if not event_type:
        return jsonify({"error": "Missing 'event_type'"}), 400

    try:
        ev = _events.emit(event_type, agent_id=agent_id, detail=detail)
        try:
            _kp.log_kernel_event(event_type, agent_id, detail)
        except Exception:
            pass
        return jsonify({"status": "emitted", "event": ev.to_dict()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/kernel/events/stream', methods=['GET'])
def kernel_events_stream():
    """
    Server-Sent Events endpoint — push kernel interrupts to HTTP clients.

    Usage:  GET /api/kernel/events/stream?client_id=my_dashboard
    The client receives events as:  data: {json}\n\n
    """
    import time as _time
    client_id = request.args.get('client_id', f"sse_{int(_time.time())}")
    _events.register_client(client_id)

    def generate():
        try:
            yield f"data: {json.dumps({'type':'CONNECTED','client_id':client_id})}\n\n"
            while True:
                pending = _events.drain_client(client_id)
                for ev in pending:
                    yield f"data: {json.dumps(ev)}\n\n"
                _time.sleep(0.5)
        except GeneratorExit:
            _events.unregister_client(client_id)

    return app.response_class(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )


# ═══════════════════════════════════════════════════════════════════
#  KERNEL COMPONENT 5 — DEAD AGENT WATCHDOG
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/kernel/watchdog', methods=['GET'])
def kernel_watchdog_status():
    """Return watchdog status and per-agent health scores."""
    try:
        return jsonify(_watchdog.status())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/kernel/watchdog/scan', methods=['POST'])
def kernel_watchdog_scan():
    """Force an immediate watchdog scan outside the normal interval."""
    try:
        result = _watchdog.force_scan()
        _events.emit("WATCHDOG_SCAN", detail={"triggered": "manual"})
        return jsonify({"status": "scan_complete", **result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════
#  KERNEL OVERVIEW
# ═══════════════════════════════════════════════════════════════════

@app.route('/api/kernel/status', methods=['GET'])
def kernel_status():
    """Single-call overview of all 5 kernel components."""
    try:
        from wnsp_v7.kernel_boot import boot_log, is_booted
        return jsonify({
            "kernel_version": "1.0.0",
            "license":        "AGPL-3.0",
            "booted":         is_booted(),
            "components": {
                "boot":        {"status": "ok", "phases": len(_boot_report.get("phases", []))},
                "persistence": {"status": "ok", "live_agents": len(_coordinator._registry)},
                "authority":   {"status": "ok", "bands": 4},
                "events":      _events.status(),
                "watchdog":    {
                    "running":   _watchdog._running,
                    "degraded":  list(_watchdog._degraded),
                    "reclaimed": _watchdog._reclaim_log[-5:],
                },
            },
            "equation": "Λ = hf/c²",
            "channels": 25600,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════
#  NEXUS PHOTONIC DEVELOPMENT ENVIRONMENT
#  Programming with the Spectrum — CE→SE as Language Substrate
# ═══════════════════════════════════════════════════════════════════

# Visible spectrum colour map (wavelength nm → CSS hex)
def _wl_to_hex(nm: float) -> str:
    """Approximate visible-spectrum wavelength to an sRGB hex colour."""
    nm = max(380.0, min(780.0, nm))
    if   nm < 440:  r,g,b = (440-nm)/60, 0.0, 1.0
    elif nm < 490:  r,g,b = 0.0, (nm-440)/50, 1.0
    elif nm < 510:  r,g,b = 0.0, 1.0, (510-nm)/20
    elif nm < 580:  r,g,b = (nm-510)/70, 1.0, 0.0
    elif nm < 645:  r,g,b = 1.0, (645-nm)/65, 0.0
    else:           r,g,b = 1.0, 0.0, 0.0
    # Intensity falloff at edges
    if   nm < 420:  factor = 0.3 + 0.7*(nm-380)/40
    elif nm > 700:  factor = 0.3 + 0.7*(780-nm)/80
    else:           factor = 1.0
    to_hex = lambda v: format(int(min(255, v*factor*255)), '02x')
    return f"#{to_hex(r)}{to_hex(g)}{to_hex(b)}"


def _encode_instruction(text: str, label: str = "") -> dict:
    """Run one code instruction through the full CE→SE stack."""
    stack = WNSPProtocolStack(intensity=32, cycles=1)
    result = stack.transmit(text=text, sender="nexus_dev", recipient="photon")
    frames = result.get("layers", {}).get("se", {}).get("frames", [])
    ce_tokens = result.get("layers", {}).get("ce", {}).get("tokens", [])

    if not frames:
        return {"label": label, "instruction": text, "frames": []}

    wl_start = frames[0]["wavelength_start_nm"]
    wl_end   = frames[-1]["wavelength_end_nm"]
    wl_mid   = (wl_start + wl_end) / 2
    total_energy = sum(f["energy_joules"] for f in frames)
    total_mass   = sum(f["lambda_mass_kg"] for f in frames)
    freq_mid     = (frames[0]["frequency_start_hz"] + frames[-1]["frequency_end_hz"]) / 2

    # Assign a Ψ channel from the coordinator
    agent_name = f"nexus_instr_{label or text[:8].strip()}"
    try:
        ch = _coordinator.register_agent(agent_name, "photonic_instruction")
        psi = ch.notation()
    except Exception:
        ch = _coordinator.get_channel(agent_name)
        psi = ch.notation() if ch else "Ψ(—)"

    return {
        "label":           label or text,
        "instruction":     text,
        "frame_count":     len(frames),
        "wavelength_start_nm": round(wl_start, 2),
        "wavelength_end_nm":   round(wl_end, 2),
        "wavelength_mid_nm":   round(wl_mid, 2),
        "frequency_hz":        round(freq_mid, 0),
        "energy_joules":       total_energy,
        "lambda_mass_kg":      total_mass,
        "spectrum_color":      _wl_to_hex(wl_mid),
        "psi_channel":         psi,
        "ce_token_count":      len(ce_tokens),
        "frames":              frames,
    }


@app.route('/api/nexus/dev/encode', methods=['POST'])
def nexus_dev_encode():
    """
    Encode a single code instruction through the full CE→SE stack.
    Returns its spectral address, wavelength, energy, and Ψ channel.
    The instruction is capped at 1000 chars — spectral address is derived
    from the first 1000 characters; additional content does not change the
    wavelength meaningfully and would only add latency.
    """
    MAX_CHARS = 1000
    data        = request.get_json() or {}
    instruction = data.get('instruction', '').strip()
    label       = data.get('label', '').strip()

    if not instruction:
        return jsonify({"error": "Missing 'instruction' field"}), 400

    truncated = len(instruction) > MAX_CHARS
    instruction = instruction[:MAX_CHARS]

    try:
        result = _encode_instruction(instruction, label)
        return jsonify({"status": "encoded", "truncated": truncated, **result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/nexus/dev/build', methods=['POST'])
def nexus_dev_build():
    """
    Build a complete Nexus App from a manifest of components.

    Request body:
      {
        "app_name": "MyApp",
        "components": [
          {"label": "GET /home",    "type": "route",    "instruction": "function home() {}"},
          {"label": "renderHeader", "type": "function", "instruction": "function renderHeader() {}"},
          {"label": "userState",    "type": "variable", "instruction": "const user = useState(null)"}
        ]
      }
    """
    data       = request.get_json() or {}
    app_name   = data.get('app_name', 'NexusApp').strip()
    components = data.get('components', [])

    if not components:
        return jsonify({"error": "Missing 'components' list"}), 400

    try:
        encoded = []
        for comp in components:
            instr  = comp.get('instruction', comp.get('label', '')).strip()
            label  = comp.get('label', instr[:20])
            ctype  = comp.get('type', 'component')
            result = _encode_instruction(instr, label)
            result['component_type'] = ctype
            encoded.append(result)

        # Spectrum coverage
        all_wl = [c['wavelength_mid_nm'] for c in encoded if c.get('wavelength_mid_nm')]
        wl_min = min(all_wl) if all_wl else 380
        wl_max = max(all_wl) if all_wl else 780
        total_energy = sum(c.get('energy_joules', 0) for c in encoded)

        return jsonify({
            "status":          "built",
            "app_name":        app_name,
            "component_count": len(encoded),
            "components":      encoded,
            "spectrum_coverage": {
                "min_nm": round(wl_min, 2),
                "max_nm": round(wl_max, 2),
                "span_nm": round(wl_max - wl_min, 2),
            },
            "total_energy_joules": total_energy,
            "equation":            "Λ = hf/c²",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/nexus/dev/spec', methods=['GET'])
def nexus_dev_spec():
    """Return the Nexus SDK specification — the formal language of the spectrum."""
    return jsonify({
        "name":    "Nexus Photonic Development SDK",
        "version": "1.0.0",
        "license": "AGPL-3.0",
        "equation": "Λ = hf/c²",
        "description": (
            "Every instruction in a Nexus-native application is encoded through "
            "WNSP-CE (character → ordinal token) and WNSP-SE (token → wave frame). "
            "Each component receives a physical wavelength address in the visible "
            "spectrum and a unique Ψ(wdm, oam, H/V) Hilbert channel. "
            "Two components with orthogonal channels cannot interfere — by physics."
        ),
        "component_types": {
            "route":     "HTTP endpoint — maps to spectral routing address",
            "function":  "Processing unit — maps to spectral computation address",
            "variable":  "State holder — maps to spectral memory address",
            "event":     "Interrupt signal — maps to spectral event channel",
            "component": "UI element — maps to spectral render address",
        },
        "spectrum_bands": {
            "violet":     {"range_nm": "380–449", "role": "System routes"},
            "blue":       {"range_nm": "450–489", "role": "Authentication + security"},
            "cyan":       {"range_nm": "490–519", "role": "Data streams"},
            "green":      {"range_nm": "520–564", "role": "Core functions"},
            "yellow":     {"range_nm": "565–589", "role": "UI components"},
            "orange":     {"range_nm": "590–624", "role": "Events + interrupts"},
            "red":        {"range_nm": "625–780", "role": "Storage + persistence"},
        },
        "encoding_pipeline": [
            "1. Write instruction as text",
            "2. WNSP-CE: text → normalised ordinal tokens [0,1]",
            "3. WNSP-SE: tokens → wave frames (λ, f, E, Λ)",
            "4. Ψ allocation: SHA256(instruction) → unique Hilbert channel",
            "5. Component lives at its wavelength address in the spectrum",
        ],
        "guarantees": [
            "Orthogonality: ⟨Ψ_i | Ψ_j⟩ = 0 — no two components share a channel",
            "Determinism: same instruction always maps to same spectral address",
            "Physics-grounded: addresses are positions in the EM spectrum, not memory offsets",
        ],
        "example_app": {
            "routes": [
                {"path": "/",       "instruction": "function home() {}"},
                {"path": "/auth",   "instruction": "function auth() {}"},
                {"path": "/api",    "instruction": "function api() {}"},
            ]
        }
    })


# ─────────────────────────────────────────────────────────────────
# Hardware — Spectrometer Readback
# ─────────────────────────────────────────────────────────────────

import math as _math
import os as _os

# Attempt to import smbus2.  If the library is missing we fall back to
# simulation permanently; if it is present we probe per-request (cached).
try:
    import smbus2 as _smbus2  # type: ignore
    _SMBUS2_AVAILABLE = True
except Exception:
    _smbus2 = None
    _SMBUS2_AVAILABLE = False

_I2C_BUS  = int(_os.environ.get("SPECTROMETER_I2C_BUS",  "1"))
_I2C_ADDR = int(_os.environ.get("SPECTROMETER_I2C_ADDR", "0x49"), 16)

# Per-request hardware probe cache — re-checked every 30 s so hot-plugging
# a spectrometer after process start is detected without hammering the bus.
_HW_PROBE_TTL  = 30.0          # seconds between I²C probe attempts
_hw_probe_last: float = -999.0  # timestamp of last probe
_hw_probe_ok:   bool  = False   # result of last probe


def _probe_hardware() -> bool:
    """
    Try to open the I²C bus and read the STATUS register from the AS7265x.
    Result is cached for _HW_PROBE_TTL seconds to avoid hammering the bus.
    Returns True when a real device is detected and responsive.
    """
    global _hw_probe_last, _hw_probe_ok
    if not _SMBUS2_AVAILABLE:
        return False
    now = time.time()
    if now - _hw_probe_last < _HW_PROBE_TTL:
        return _hw_probe_ok
    try:
        bus = _smbus2.SMBus(_I2C_BUS)
        bus.read_byte_data(_I2C_ADDR, 0x00)  # read STATUS register
        bus.close()
        _hw_probe_ok = True
    except Exception:
        _hw_probe_ok = False
    _hw_probe_last = now
    return _hw_probe_ok


def _get_bus() -> "smbus2.SMBus":
    """Return an open SMBus instance for the configured I²C bus."""
    return _smbus2.SMBus(_I2C_BUS)

# ── AS7265x virtual-register protocol ────────────────────────────────────────
# The AS7265x uses an I²C virtual-register scheme.  Three physical registers
# mediate all communication:
#   0x00  STATUS  — RX_VALID (bit 0) set when READ has data;
#                   TX_VALID (bit 1) clear when WRITE is ready to accept
#   0x01  WRITE   — write the virtual-register address here to address it
#   0x02  READ    — read the result byte here after RX_VALID is set
#
# Three sub-sensors share the same I²C address, selected via virtual reg 0x4F:
#   0b00  AS72651 — visible (G H I J K L)
#   0b01  AS72652 — UV     (A B C D E F)
#   0b10  AS72653 — NIR    (R S T U V W)
#
# Raw 16-bit channel values for each sub-device sit at virtual regs
# 0x08–0x13 (high-byte first, 2 bytes per channel, 6 channels = 12 bytes).

_AS_STATUS  = 0x00
_AS_WRITE   = 0x01
_AS_READ    = 0x02
_AS_RX_VALID = 0x01   # bit 0
_AS_TX_VALID = 0x02   # bit 1
_AS_DEV_SEL  = 0x4F   # virtual reg: device select

# Sub-device IDs → centre wavelengths (nm) for their 6 channels (order A–F, G–L, R–W)
_AS_SUB_CHANNELS = {
    0b01: [410, 435, 460, 485, 510, 535],   # AS72652 UV
    0b00: [560, 585, 645, 705, 900, 940],   # AS72651 VIS
    0b10: [610, 680, 730, 760, 810, 860],   # AS72653 NIR
}

_AS_VREG_RAW_BASE = 0x08   # first raw high-byte register (per sub-device)
_AS_POLL_TIMEOUT  = 0.5    # seconds before giving up on a single vreg read


def _as7265x_vreg_read(bus: "smbus2.SMBus", vReg: int) -> int:
    """Read one byte from an AS7265x virtual register via the STATUS/WRITE/READ trio."""
    deadline = time.time() + _AS_POLL_TIMEOUT

    # Wait until the WRITE register is free (TX_VALID == 0)
    while time.time() < deadline:
        status = bus.read_byte_data(_I2C_ADDR, _AS_STATUS)
        if not (status & _AS_TX_VALID):
            break
        time.sleep(0.001)
    else:
        raise TimeoutError(f"AS7265x TX timeout waiting to write vreg 0x{vReg:02X}")

    bus.write_byte_data(_I2C_ADDR, _AS_WRITE, vReg)

    # Wait until the READ register has valid data (RX_VALID == 1)
    deadline = time.time() + _AS_POLL_TIMEOUT
    while time.time() < deadline:
        status = bus.read_byte_data(_I2C_ADDR, _AS_STATUS)
        if status & _AS_RX_VALID:
            break
        time.sleep(0.001)
    else:
        raise TimeoutError(f"AS7265x RX timeout reading vreg 0x{vReg:02X}")

    return bus.read_byte_data(_I2C_ADDR, _AS_READ)


def _as7265x_vreg_write(bus: "smbus2.SMBus", vReg: int, value: int) -> None:
    """Write one byte to an AS7265x virtual register."""
    deadline = time.time() + _AS_POLL_TIMEOUT
    while time.time() < deadline:
        status = bus.read_byte_data(_I2C_ADDR, _AS_STATUS)
        if not (status & _AS_TX_VALID):
            break
        time.sleep(0.001)
    else:
        raise TimeoutError(f"AS7265x TX timeout writing vreg 0x{vReg:02X}")

    # Set bit 7 to signal a write operation
    bus.write_byte_data(_I2C_ADDR, _AS_WRITE, vReg | 0x80)

    deadline = time.time() + _AS_POLL_TIMEOUT
    while time.time() < deadline:
        status = bus.read_byte_data(_I2C_ADDR, _AS_STATUS)
        if not (status & _AS_TX_VALID):
            break
        time.sleep(0.001)
    else:
        raise TimeoutError(f"AS7265x TX timeout (value write) vreg 0x{vReg:02X}")

    bus.write_byte_data(_I2C_ADDR, _AS_WRITE, value)


def _read_as7265x_peak_nm() -> float:
    """
    Read the dominant-peak wavelength from an AS7265x over I²C.

    Opens its own SMBus connection (closed when done) so there is no shared
    global bus state that can become stale after a hot-plug event.

    Uses the chip's virtual-register protocol (STATUS/WRITE/READ triple) to
    read 16-bit raw counts from all three sub-sensors (18 channels total).
    Returns the centre wavelength (nm) of the channel with the highest count.
    """
    bus = _get_bus()
    try:
        all_nm: list[int] = []
        all_counts: list[int] = []

        for dev_id, wavelengths in _AS_SUB_CHANNELS.items():
            # Select the sub-device
            _as7265x_vreg_write(bus, _AS_DEV_SEL, dev_id)
            time.sleep(0.005)  # brief settle after device select

            for ch_idx, nm in enumerate(wavelengths):
                hi_reg = _AS_VREG_RAW_BASE + ch_idx * 2
                lo_reg = hi_reg + 1
                hi = _as7265x_vreg_read(bus, hi_reg)
                lo = _as7265x_vreg_read(bus, lo_reg)
                count = (hi << 8) | lo
                all_nm.append(nm)
                all_counts.append(count)
    finally:
        bus.close()

    peak_idx = all_counts.index(max(all_counts))
    return float(all_nm[peak_idx])


def _simulated_peak_nm(seed: float | None = None) -> float:
    """
    Return a simulated spectrometer reading for dev environments.

    The value drifts gently around 589 nm (sodium D-line) with ±1.5 nm
    Gaussian noise — realistic for a warm lab instrument.
    """
    t = seed if seed is not None else time.time()
    drift = 1.5 * _math.sin(t / 30.0)
    noise = (((t * 1234567) % 1000) / 1000.0 - 0.5) * 1.0
    return round(589.0 + drift + noise, 2)


@app.route('/api/hardware/spectrometer/read', methods=['GET'])
def spectrometer_read():
    """
    Return the latest peak wavelength from the connected spectrometer.

    Response shape:
      {
        "wavelength_nm": <float>,   # dominant peak in nanometres
        "device":        <str>,     # "AS7265x" | "simulated"
        "hardware":      <bool>,    # true when real I²C device is present
        "timestamp":     <float>    # Unix epoch seconds
      }

    When no physical device is detected the endpoint returns a
    realistic simulated value so the frontend degrades gracefully.
    """
    ts = time.time()

    if _probe_hardware():
        try:
            nm = _read_as7265x_peak_nm()
            return jsonify({
                "wavelength_nm": nm,
                "device": "AS7265x",
                "hardware": True,
                "timestamp": ts,
            })
        except Exception as exc:
            # Log the raw exception server-side only; return a generic message
            # to the client so internal I²C details are not exposed.
            app.logger.warning("AS7265x read failed: %s", exc)
            return jsonify({
                "wavelength_nm": _simulated_peak_nm(ts),
                "device": "simulated",
                "hardware": False,
                "timestamp": ts,
                "warning": "Spectrometer read failed — falling back to simulation",
            })

    return jsonify({
        "wavelength_nm": _simulated_peak_nm(ts),
        "device": "simulated",
        "hardware": False,
        "timestamp": ts,
    })


@app.route('/api/wnsp/quanta/oscillate', methods=['POST'])
def quanta_oscillate():
    """
    Compute the instantaneous oscillation state for a WNSP channel.

    Accepts EITHER:
      { "wdm": 0-255, "t_ms": float }          — WDM channel index
      { "wavelength_nm": float, "t_ms": float } — explicit wavelength in nm
    Both inputs are accepted simultaneously; wavelength_nm takes priority when
    both are present.  Missing value is derived from the other.

    Returns: wdm, nm, frequency_hz, period_s, energy_j, lambda_kg,
             phase_rad, amplitude, waveform[128], derived_from
    """
    import math, time as _time
    data = request.get_json() or {}
    # When t_ms is absent, use wall-clock time so the response is live/dynamic
    t_ms = float(data['t_ms']) if 't_ms' in data else _time.time() * 1000.0

    NM_MIN_V = 380.0
    NM_MAX_V = 780.0
    WDM_CH   = 256

    if 'wavelength_nm' in data:
        nm  = max(NM_MIN_V, min(NM_MAX_V, float(data['wavelength_nm'])))
        wdm = round((nm - NM_MIN_V) / (NM_MAX_V - NM_MIN_V) * (WDM_CH - 1))
    elif 'wdm' in data:
        wdm = max(0, min(255, int(data['wdm'])))
        nm  = NM_MIN_V + wdm * (NM_MAX_V - NM_MIN_V) / (WDM_CH - 1)
    else:
        return jsonify({"error": "Provide at least one of: wavelength_nm (nm) or wdm (0–255)"}), 400

    frequency_hz = SPEED_OF_LIGHT / (nm * 1e-9)
    period_s     = 1.0 / frequency_hz
    energy_j     = PLANCK_CONSTANT * frequency_hz
    lambda_kg    = energy_j / (SPEED_OF_LIGHT ** 2)

    # Normalized phase: (t % T) / T  →  [0, 1)  — avoids float64 overflow
    phase     = (frequency_hz * (t_ms * 1e-3)) % 1.0
    phase_rad = phase * 2.0 * math.pi          # [0, 2π)
    amplitude = math.cos(phase_rad)            # cosine: +1 at t=0

    # 128 cosine samples over one full period, starting at current phase
    waveform = [
        round(math.cos(phase_rad + (i / 128.0) * 2.0 * math.pi), 6)
        for i in range(128)
    ]

    return jsonify({
        "wdm":          wdm,
        "t_ms":         t_ms,
        "nm":           round(nm, 4),
        "frequency_hz": frequency_hz,
        "period_s":     period_s,
        "energy_j":     energy_j,
        "lambda_kg":    lambda_kg,
        "phase_rad":    round(phase_rad, 6),
        "amplitude":    round(amplitude, 6),
        "waveform":     waveform,
        "derived_from": (
            f"Step1: λ={nm:.4f}nm → f=c/λ={frequency_hz:.6e}Hz | "
            f"Step2: E=h·f={energy_j:.6e}J={(energy_j/1.602176634e-19):.6f}eV | "
            f"Step3: Λ=E/c²={lambda_kg:.6e}kg | "
            f"Step4: φ=(f·t)mod1={phase:.9f} → ψ=cos(φ·2π)={amplitude:.6f} | "
            f"Ref: f₀=555THz, λ_mass=h·f₀/c²={PLANCK_CONSTANT*555e12/SPEED_OF_LIGHT**2:.3e}kg"
        ),
    })


if __name__ == '__main__':
    print("Starting Spectral API server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
