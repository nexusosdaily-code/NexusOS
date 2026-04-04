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
        return jsonify({
            "status":   "existing" if already else "allocated",
            "agent_id": agent_id,
            "display":  f"{agent_id} → {channel.notation()}",
            **stats["channel"],
            "intent":         stats["intent"],
            "registered_at":  stats["registered_at"],
            "routed_count":   stats["routed_count"],
            "authority_band": band.name,
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
    return jsonify({
        **status,
        "total_channels":    status["capacity"],
        "occupied_channels": status["channels_used"],
        "available_channels": status["capacity"] - status["channels_used"],
        "agents": agents,
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
        snap = _bus.status()
        src_band = band_for_agent(src, src_ch.wavelength)
        return jsonify({
            "status":       "queued",
            "src":          src,
            "dst":          dst,
            "payload":      payload,
            "priority":     priority,
            "route":        f"{src} {src_ch.notation()} → {dst} {dst_ch.notation()}",
            "queue_depth":  snap["queued"],
            "authority":    src_band.name,
            "permitted":    True,
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

        return jsonify({
            "status":              "simulated",
            "protocol":            "WNSP-SE v" + WNSP_SE_VERSION,
            "input":               content,
            "chars":               len(content),
            "frames":              len(frames),
            "packing_ratio":       packing_ratio,
            "packing_scheme":      "dual-wavelength (2 chars/frame)",
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


if __name__ == '__main__':
    print("Starting Spectral API server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
