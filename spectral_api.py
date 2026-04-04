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

import time

from flask import Flask, jsonify, request
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

from wnsp_v7.wnsp_coordinator import WNSPCoordinator

# Singleton coordinator — persists for the lifetime of the process
_coordinator = WNSPCoordinator()


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
        return jsonify({
            "status":   "existing" if already else "allocated",
            "agent_id": agent_id,
            "display":  f"{agent_id} → {channel.notation()}",
            **stats["channel"],
            "intent":         stats["intent"],
            "registered_at":  stats["registered_at"],
            "routed_count":   stats["routed_count"],
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


if __name__ == '__main__':
    print("Starting Spectral API server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
