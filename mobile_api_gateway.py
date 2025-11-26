"""
Mobile API Gateway for NexusOS
================================

Provides REST/WebSocket endpoints for mobile devices to connect to the existing
web platform and access all blockchain features:
- WNSP messaging
- Blockchain operations
- DEX trading
- Validator participation
- Account management

Mobile phones connect to this gateway instead of running full nodes.
All heavy computation happens on the web platform.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import secrets
import hashlib
import time
import json
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from datetime import datetime

# Import existing platform modules
from wnsp_protocol_v2 import WnspEncoderV2, WnspEncodingScheme
from wavelength_validator import SpectralRegion, ModulationType
from native_token import token_system

# Flask app for mobile connectivity
app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(32)
CORS(app)  # Enable cross-origin requests from mobile apps
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
mobile_clients = {}  # device_id -> client info
active_connections = {}  # socket_id -> device_id
wnsp_system = WnspEncoderV2()
messaging_system = None  # Will be initialized

@dataclass
class MobileClient:
    """Represents a connected mobile device"""
    device_id: str
    device_name: str
    auth_token: str
    spectral_region: str
    account_id: str
    connected_at: float
    last_seen: float
    socket_id: Optional[str] = None
    is_validator: bool = False
    stake_nxt: float = 0.0
    
    def to_dict(self):
        return asdict(self)


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.route('/api/mobile/register', methods=['POST'])
def register_mobile():
    """
    Register new mobile device with the platform.
    
    Request:
    {
        "device_id": "unique_device_identifier",
        "device_name": "Alice's iPhone",
        "public_key": "mobile_public_key"
    }
    
    Response:
    {
        "auth_token": "secure_token_for_future_requests",
        "account_id": "mobile_alice_123",
        "spectral_region": "Violet",
        "qr_code_data": "nexusos://connect?token=...",
        "web_dashboard_url": "https://nexusos.repl.co"
    }
    """
    data = request.get_json()
    device_id = data.get('device_id')
    device_name = data.get('device_name', 'Mobile Device')
    
    if not device_id:
        return jsonify({"error": "device_id required"}), 400
    
    # Generate auth token
    auth_token = secrets.token_urlsafe(32)
    
    # Assign spectral region (hash-based for diversity)
    hash_val = int(hashlib.sha256(device_id.encode()).hexdigest()[:8], 16)
    regions = list(SpectralRegion)
    spectral_region = regions[hash_val % len(regions)]
    
    # Create account in token system
    account_id = f"mobile_{device_id[:12]}"
    if token_system.get_account(account_id) is None:
        token_system.create_account(account_id, initial_balance=10000)  # 100 NXT starter
    
    # Store client
    client = MobileClient(
        device_id=device_id,
        device_name=device_name,
        auth_token=auth_token,
        spectral_region=spectral_region.display_name,
        account_id=account_id,
        connected_at=time.time(),
        last_seen=time.time()
    )
    mobile_clients[device_id] = client
    
    # Generate QR code data for easy mobile pairing
    qr_data = f"nexusos://connect?device_id={device_id}&token={auth_token}"
    
    return jsonify({
        "success": True,
        "auth_token": auth_token,
        "account_id": account_id,
        "spectral_region": spectral_region.display_name,
        "qr_code_data": qr_data,
        "web_dashboard_url": "https://your-app.repl.co",
        "initial_balance_nxt": 100.0,
        "message": "Mobile device registered successfully!"
    })


@app.route('/api/mobile/verify', methods=['POST'])
def verify_mobile():
    """Verify mobile authentication token"""
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    for device_id, client in mobile_clients.items():
        if client.auth_token == auth_token:
            client.last_seen = time.time()
            return jsonify({
                "valid": True,
                "device_id": device_id,
                "account_id": client.account_id
            })
    
    return jsonify({"valid": False, "error": "Invalid token"}), 401


# ============================================================================
# WNSP MESSAGING ENDPOINTS
# ============================================================================

@app.route('/api/mobile/wnsp/send', methods=['POST'])
def mobile_send_wnsp_message():
    """
    Send WNSP message from mobile device using existing web platform.
    
    Request:
    {
        "content": "Hello from mobile!",
        "recipient_id": "mobile_bob_456",
        "spectral_region": "Violet",
        "modulation_type": "OOK",
        "parent_message_ids": []
    }
    
    Mobile just provides parameters - web platform does all the work!
    """
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    content = data.get('content')
    recipient_id = data.get('recipient_id', 'broadcast')
    spectral_region_name = data.get('spectral_region', client.spectral_region)
    parent_ids = data.get('parent_message_ids', [])
    
    # Get spectral region
    spectral_region = get_spectral_region_by_name(spectral_region_name)
    
    # Use existing WNSP encoder on web platform
    message = wnsp_system.encode_message(
        content=content,
        sender_id=client.account_id,
        recipient_id=recipient_id,
        spectral_region=spectral_region,
        modulation_type=ModulationType.OOK,
        parent_message_ids=parent_ids
    )
    
    # Calculate cost using existing E=hf formula (access internal method)
    cost_data = wnsp_system._calculate_quantum_cost(
        message.wave_signature,
        len(content.encode('utf-8')),
        spectral_region
    )
    cost_nxt = cost_data['total_cost_nxt']
    
    # Deduct from mobile account (using existing token system)
    cost_units = int(cost_nxt * 100)
    try:
        token_system.transfer(
            client.account_id,
            "NETWORK_POOL",
            cost_units,
            fee=0
        )
    except Exception as e:
        return jsonify({"error": f"Insufficient balance: {str(e)}"}), 400
    
    # Broadcast via WebSocket to all connected mobiles
    socketio.emit('wnsp_message', {
        'message_id': message.message_id,
        'sender_id': client.account_id,
        'content': content,
        'spectral_region': spectral_region_name,
        'cost_nxt': cost_nxt,
        'timestamp': message.created_at
    }, to='/')
    
    return jsonify({
        "success": True,
        "message_id": message.message_id,
        "cost_nxt": cost_nxt,
        "interference_hash": message.interference_hash,
        "message": "Message sent successfully via WNSP!"
    })


@app.route('/api/mobile/wnsp/inbox', methods=['GET'])
def mobile_get_inbox():
    """Get WNSP messages for mobile device"""
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Access existing messaging system (web platform)
    # For now, return recent messages from global state
    # In production, would query from messaging_system
    
    return jsonify({
        "messages": [],
        "count": 0,
        "account_id": client.account_id
    })


# ============================================================================
# BLOCKCHAIN ENDPOINTS
# ============================================================================

@app.route('/api/mobile/balance', methods=['GET'])
def mobile_get_balance():
    """Get NXT balance for mobile account"""
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Use existing token system on web platform
    account = token_system.get_account(client.account_id)
    balance_units = account.balance if account else 0
    balance_nxt = balance_units / 100.0
    
    return jsonify({
        "account_id": client.account_id,
        "balance_nxt": balance_nxt,
        "balance_units": balance_units
    })


@app.route('/api/mobile/transfer', methods=['POST'])
def mobile_transfer_nxt():
    """
    Transfer NXT from mobile to another account.
    Uses existing token system on web platform.
    
    Request:
    {
        "recipient_id": "mobile_bob_456",
        "amount_nxt": 10.5
    }
    """
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    recipient_id = data.get('recipient_id')
    amount_nxt = data.get('amount_nxt', 0)
    
    if not recipient_id or amount_nxt <= 0:
        return jsonify({"error": "Invalid transfer parameters"}), 400
    
    # Use existing token system
    amount_units = int(amount_nxt * 100)
    fee_units = int(amount_units * 0.001)  # 0.1% fee
    
    try:
        # Ensure recipient exists
        if token_system.get_account(recipient_id) is None:
            token_system.create_account(recipient_id, initial_balance=0)
        
        # Execute transfer using web platform's token system
        token_system.transfer(
            client.account_id,
            recipient_id,
            amount_units,
            fee=fee_units
        )
        
        # Broadcast transaction to connected mobiles
        socketio.emit('transaction', {
            'from': client.account_id,
            'to': recipient_id,
            'amount_nxt': amount_nxt,
            'timestamp': time.time()
        }, to='/')
        
        return jsonify({
            "success": True,
            "from": client.account_id,
            "to": recipient_id,
            "amount_nxt": amount_nxt,
            "fee_nxt": fee_units / 100.0
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/mobile/transactions', methods=['GET'])
def mobile_get_transactions():
    """Get transaction history for mobile account"""
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Use existing token system
    account = token_system.get_account(client.account_id)
    
    if not account:
        return jsonify({"transactions": [], "count": 0})
    
    # Get transaction history (if available)
    # Note: Account object may not have transaction_history attribute
    transactions = []
    if hasattr(account, 'transaction_history'):
        transactions = account.transaction_history[-50:]  # Last 50 transactions
    
    return jsonify({
        "account_id": client.account_id,
        "transactions": [tx.to_dict() for tx in transactions] if transactions else [],
        "count": len(transactions)
    })


# ============================================================================
# VALIDATOR ENDPOINTS
# ============================================================================

@app.route('/api/mobile/validator/stake', methods=['POST'])
def mobile_stake_validator():
    """
    Stake NXT to become mobile validator.
    Uses existing validator system on web platform.
    
    Request:
    {
        "stake_amount_nxt": 100.0
    }
    """
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    stake_nxt = data.get('stake_amount_nxt', 0)
    
    if stake_nxt < 100:
        return jsonify({"error": "Minimum stake is 100 NXT"}), 400
    
    # Transfer to validator pool using existing system
    stake_units = int(stake_nxt * 100)
    
    try:
        token_system.transfer(
            client.account_id,
            "VALIDATOR_POOL",
            stake_units,
            fee=0
        )
        
        client.is_validator = True
        client.stake_nxt = stake_nxt
        
        return jsonify({
            "success": True,
            "validator_id": client.account_id,
            "stake_nxt": stake_nxt,
            "spectral_region": client.spectral_region,
            "message": "Mobile is now a validator!"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/api/mobile/validator/earnings', methods=['GET'])
def mobile_validator_earnings():
    """Get validator earnings for mobile"""
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Get REAL validator earnings from consensus engine
    total_earnings_nxt = 0.0
    blocks_validated = 0
    
    try:
        from nexus_consensus import NexusConsensusEngine
        consensus = NexusConsensusEngine()
        
        # Check if validator has contribution score
        if client.account_id in consensus.contributions:
            score = consensus.contributions[client.account_id]
            total_earnings_nxt = score.rewards_earned / 100_000_000  # Convert units to NXT
            blocks_validated = score.blocks_validated
    except Exception:
        # Fallback: check validator economics system
        try:
            from validator_economics import StakingEconomy
            staking = StakingEconomy()
            if client.account_id in staking.validators:
                validator = staking.validators[client.account_id]
                total_earnings_nxt = validator.total_rewards_earned
                blocks_validated = validator.blocks_proposed
        except Exception:
            pass
    
    return jsonify({
        "validator_id": client.account_id,
        "is_active": client.is_validator,
        "stake_nxt": client.stake_nxt,
        "spectral_region": client.spectral_region,
        "total_earnings_nxt": total_earnings_nxt,
        "blocks_validated": blocks_validated
    })


# ============================================================================
# DEX ENDPOINTS
# ============================================================================

@app.route('/api/mobile/dex/pairs', methods=['GET'])
def mobile_get_dex_pairs():
    """Get available trading pairs on DEX"""
    # Access existing DEX system on web platform
    return jsonify({
        "pairs": [
            {"pair": "NXT/USD", "liquidity": 100000},
            {"pair": "NXT/ETH", "liquidity": 50000}
        ],
        "message": "Connect to web DEX for trading"
    })


# ============================================================================
# NETWORK STATUS ENDPOINTS
# ============================================================================

@app.route('/api/mobile/network/status', methods=['GET'])
def mobile_network_status():
    """Get overall network status"""
    # Get REAL block height from GhostDAG or database
    latest_block_height = 0
    try:
        from ghostdag_core import GhostDAGEngine
        ghostdag = GhostDAGEngine()
        latest_block_height = ghostdag.total_blocks
    except Exception:
        # Fallback: count DAG messages as proxy for block height
        try:
            from models import get_session, DAGMessage
            session = get_session()
            if session:
                latest_block_height = session.query(DAGMessage).count()
                session.close()
        except Exception:
            pass
    
    return jsonify({
        "connected_mobiles": len(mobile_clients),
        "active_validators": sum(1 for c in mobile_clients.values() if c.is_validator),
        "total_nxt_staked": sum(c.stake_nxt for c in mobile_clients.values()),
        "latest_block_height": latest_block_height,
        "network_health": "healthy" if len(mobile_clients) > 0 else "initializing"
    })


@app.route('/api/mobile/peers', methods=['GET'])
def mobile_get_peers():
    """Get list of connected mobile peers"""
    auth_token = request.headers.get('Authorization', '').replace('Bearer ', '')
    client = get_client_by_token(auth_token)
    
    if not client:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Return other connected mobiles
    peers = [
        {
            "device_id": c.device_id,
            "device_name": c.device_name,
            "spectral_region": c.spectral_region,
            "is_validator": c.is_validator,
            "online": (time.time() - c.last_seen) < 60
        }
        for c in mobile_clients.values()
        if c.device_id != client.device_id
    ]
    
    return jsonify({
        "peers": peers,
        "count": len(peers)
    })


# ============================================================================
# WEBSOCKET HANDLERS (Real-time connectivity)
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Mobile device establishes WebSocket connection"""
    print(f"Mobile client connected: {request.sid}")
    emit('connected', {'message': 'Connected to NexusOS platform'})


@socketio.on('authenticate')
def handle_authenticate(data):
    """Authenticate mobile via WebSocket"""
    auth_token = data.get('auth_token')
    client = get_client_by_token(auth_token)
    
    if client:
        client.socket_id = request.sid
        active_connections[request.sid] = client.device_id
        join_room(f"mobile_{client.device_id}")
        
        emit('authenticated', {
            'success': True,
            'account_id': client.account_id,
            'spectral_region': client.spectral_region
        })
    else:
        emit('authenticated', {'success': False, 'error': 'Invalid token'})


@socketio.on('disconnect')
def handle_disconnect():
    """Mobile device disconnects"""
    if request.sid in active_connections:
        device_id = active_connections[request.sid]
        if device_id in mobile_clients:
            mobile_clients[device_id].socket_id = None
        del active_connections[request.sid]
    print(f"Mobile client disconnected: {request.sid}")


@socketio.on('ping')
def handle_ping():
    """Heartbeat to keep connection alive"""
    if request.sid in active_connections:
        device_id = active_connections[request.sid]
        if device_id in mobile_clients:
            mobile_clients[device_id].last_seen = time.time()
    emit('pong', {'timestamp': time.time()})


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_client_by_token(auth_token: str) -> Optional[MobileClient]:
    """Find client by auth token"""
    for client in mobile_clients.values():
        if client.auth_token == auth_token:
            return client
    return None


def get_spectral_region_by_name(name: str) -> SpectralRegion:
    """Get SpectralRegion enum by name"""
    for region in SpectralRegion:
        if region.display_name.lower() == name.lower():
            return region
    return SpectralRegion.VIOLET  # Default


# ============================================================================
# ADMIN ENDPOINTS (for monitoring)
# ============================================================================

@app.route('/api/admin/mobile/list', methods=['GET'])
def admin_list_mobiles():
    """List all registered mobile devices"""
    return jsonify({
        "mobiles": [c.to_dict() for c in mobile_clients.values()],
        "total_count": len(mobile_clients)
    })


# ============================================================================
# MAIN
# ============================================================================

def start_mobile_gateway(host='0.0.0.0', port=5001):
    """
    Start the mobile API gateway.
    Runs alongside the main Streamlit app on different port.
    """
    print(f"🚀 Mobile API Gateway starting on {host}:{port}")
    print(f"📱 Mobile devices can connect to access all NexusOS features")
    socketio.run(
        app, 
        host=host, 
        port=port, 
        debug=False,
        use_reloader=False,
        log_output=False,
        allow_unsafe_werkzeug=True
    )


if __name__ == '__main__':
    start_mobile_gateway()
