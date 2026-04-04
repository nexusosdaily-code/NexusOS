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


if __name__ == '__main__':
    print("Starting Spectral API server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
