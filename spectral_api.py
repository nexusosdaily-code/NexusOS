"""
Spectral API - Flask backend for Lambda Boson encoding

Provides REST endpoints for the Encoding Lab frontend to call.
Uses the wnsp_protocol_v7.py encoding functions.

Author: Te Rata Pou
License: GPL v3.0
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from wnsp_protocol_v7 import (
    encode_lambda_message,
    LambdaEncoder,
    wavelength_to_frequency,
    char_to_wavelength,
    lambda_mass,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    VISIBLE_MIN_NM,
    VISIBLE_MAX_NM
)

app = Flask(__name__)
CORS(app)

@app.route('/api/spectral/constants', methods=['GET'])
def get_constants():
    """Return physics constants used in encoding."""
    return jsonify({
        "planckConstant": PLANCK_CONSTANT,
        "speedOfLight": SPEED_OF_LIGHT,
        "visibleMinNm": VISIBLE_MIN_NM,
        "visibleMaxNm": VISIBLE_MAX_NM,
        "wdmChannels": 256,
        "oamModes": 8,
        "channelSpacing": 1.5625
    })

@app.route('/api/spectral/capacity', methods=['GET'])
def get_capacity():
    """Return spectral capacity information."""
    wdm_channels = 256
    oam_modes = 8
    polarization_modes = 2
    total_channels = wdm_channels * oam_modes * polarization_modes
    
    return jsonify({
        "wdm_channels": wdm_channels,
        "oam_modes": oam_modes,
        "polarization_modes": polarization_modes,
        "total_channels": total_channels,
        "bits_per_symbol_16qam": total_channels * 4,
        "theoretical_tbps_at_100gbaud": total_channels * 4 * 100 / 1000
    })

@app.route('/api/spectral/encode', methods=['POST'])
def encode_message():
    """Encode a message using Lambda Boson substrate."""
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({"error": "Missing 'content' field"}), 400
    
    content = data.get('content', '')
    sender = data.get('sender', '')
    recipient = data.get('recipient', '')
    intensity = data.get('intensity', 32)
    cycles = data.get('cycles', 1)
    
    try:
        result = encode_lambda_message(
            content=content,
            sender=sender,
            recipient=recipient,
            intensity=intensity,
            cycles=cycles
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/spectral/char-to-wavelength', methods=['POST'])
def char_wavelength():
    """Convert a character to its wavelength."""
    data = request.get_json()
    
    if not data or 'char' not in data:
        return jsonify({"error": "Missing 'char' field"}), 400
    
    char = data['char']
    wavelength = char_to_wavelength(char)
    frequency = wavelength_to_frequency(wavelength)
    mass = lambda_mass(frequency)
    
    return jsonify({
        "char": char,
        "wavelength_nm": wavelength,
        "frequency_hz": frequency,
        "lambda_mass_kg": mass
    })

@app.route('/api/spectral/wavelength-to-frequency', methods=['POST'])
def wavelength_freq():
    """Convert wavelength to frequency."""
    data = request.get_json()
    
    if not data or 'wavelength_nm' not in data:
        return jsonify({"error": "Missing 'wavelength_nm' field"}), 400
    
    wavelength_nm = float(data['wavelength_nm'])
    frequency = wavelength_to_frequency(wavelength_nm)
    mass = lambda_mass(frequency)
    energy = PLANCK_CONSTANT * frequency
    
    return jsonify({
        "wavelength_nm": wavelength_nm,
        "frequency_hz": frequency,
        "lambda_mass_kg": mass,
        "energy_joules": energy
    })

@app.route('/api/spectral/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "Spectral API",
        "version": "7.1.0",
        "physics": "Λ = hf/c²"
    })

if __name__ == '__main__':
    print("Starting Spectral API server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
