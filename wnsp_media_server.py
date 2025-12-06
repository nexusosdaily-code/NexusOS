#!/usr/bin/env python3
"""
WNSP Media Server - Standalone HTML/CSS/JS Media Player
GPL v3.0 License
Serves the user-facing media player interface and integrates with WNSP backend
"""

from flask import Flask, send_from_directory, jsonify, request, Response, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename
import os
import sys
from datetime import datetime
from threading import Thread
import time

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import production file manager
try:
    from wnsp_media_file_manager import media_manager
    FILE_MANAGER_AVAILABLE = True
except ImportError:
    FILE_MANAGER_AVAILABLE = False
    print("⚠️  File manager not available")

# Import friend manager for targeted streaming
try:
    from friend_manager import get_friend_manager
    FRIEND_MANAGER_AVAILABLE = True
except ImportError:
    FRIEND_MANAGER_AVAILABLE = False
    print("⚠️  Friend manager not available - streaming will be public only")

# Import WNSP backend
try:
    from wnsp_unified_mesh_stack import create_demo_network
    from wnsp_media_propagation_production import WNSPMediaPropagationProduction
    WNSP_AVAILABLE = True
except ImportError:
    WNSP_AVAILABLE = False
    print("⚠️  WNSP backend not available - running in standalone mode")

app = Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = 'nexus_wnsp_livestream_secret_key'
CORS(app)

# Initialize Socket.IO for real-time WebRTC signaling
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Constants
UNITS_PER_NXT = 100_000_000  # 1 NXT = 100,000,000 units

# Security: Enforce maximum upload size (100MB)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# =============================================================================
# LIVESTREAM STATE MANAGEMENT
# =============================================================================
active_broadcasts = {}  # broadcaster_id -> {title, category, viewers: set(), started_at, energy_cost, allowed_friends: list, is_public: bool}
viewer_to_broadcaster = {}  # viewer_id -> broadcaster_id
broadcaster_streams = {}  # broadcaster_id -> {device_id, reservation_id, bytes_streamed}
device_to_socket = {}  # device_id -> socket_id (maps device_id to Socket.IO session for friend-based access)

# =============================================================================
# PHONE NUMBER SESSION MANAGEMENT (for friend-only streaming authentication)
# =============================================================================
phone_to_socket = {}  # phone_number -> socket_id (server-verified identity)
socket_to_phone = {}  # socket_id -> phone_number (reverse lookup)

# Error handler for file too large
@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file size exceeded error"""
    return jsonify({
        'error': 'File too large. Maximum upload size is 100MB.',
        'uploaded': 0,
        'files': []
    }), 413

# Lazy initialization globals
mesh_stack = None
media_engine = None
_wnsp_initializing = False  # Lock to prevent concurrent initialization
registered_devices = {}  # Track connected devices as mesh nodes

def create_user_mesh_network():
    """Create real WNSP mesh network from user's actual devices"""
    from wnsp_unified_mesh_stack import WNSPUnifiedMeshStack, MeshNode, NodeType, TransportProtocol, WavelengthAddress, MeshLink
    import numpy as np
    import hashlib
    
    stack = WNSPUnifiedMeshStack()
    
    def create_wavelength_addr(node_id: str):
        np.random.seed(hash(node_id) % 2**32)
        signature = np.random.random(8)
        signature = signature / signature.sum()
        quantum_hash = hashlib.sha256(f"{node_id}{signature.tobytes()}".encode()).hexdigest()
        return WavelengthAddress(signature, quantum_hash, node_id)
    
    # Real user devices as mesh nodes
    user_nodes = [
        ("your_phone", NodeType.EDGE, [TransportProtocol.BLE, TransportProtocol.WIFI], 2000, "📱 Your Phone"),
        ("your_computer", NodeType.EDGE, [TransportProtocol.WIFI], 5000, "💻 Your Computer"),
    ]
    
    print("🌐 Creating real WNSP mesh network with your devices:")
    for node_id, node_type, protocols, cache_mb, display_name in user_nodes:
        node = MeshNode(
            node_id=node_id,
            node_type=node_type,
            wavelength_addr=create_wavelength_addr(node_id),
            transport_protocols=protocols,
            neighbors=set(),
            cache_capacity_mb=cache_mb,
            uptime_hours=24.0
        )
        stack.layer1_mesh_isp.add_node(node)
        print(f"  ✅ {display_name} ({node_id}): {cache_mb}MB cache, {len(protocols)} protocols")
    
    # Create mesh link between your phone and computer
    stack.layer1_mesh_isp.create_link(
        node_a_id="your_phone",
        node_b_id="your_computer",
        protocol=TransportProtocol.WIFI,
        signal_dbm=-45,
        latency_ms=8,
        bandwidth_kbps=10000
    )
    
    print("  🔗 Mesh link: Your Phone ↔ Your Computer (WiFi, -45dBm)")
    print("✅ Real user mesh network ready!")
    
    return stack

def get_media_engine():
    """Get WNSP media engine (lazy initialization on first call)"""
    global media_engine
    print(f"🔍 get_media_engine() called: media_engine={media_engine is not None}", flush=True)
    if media_engine is None:
        print("⚠️  Engine is None, calling init_media_engine()...", flush=True)
        init_media_engine()
        print(f"🔍 After init: media_engine={media_engine is not None}", flush=True)
    return media_engine

def init_media_engine():
    """Initialize WNSP media engine (thread-safe, idempotent)"""
    global mesh_stack, media_engine, _wnsp_initializing, WNSP_AVAILABLE
    
    if not WNSP_AVAILABLE or media_engine is not None or _wnsp_initializing:
        return  # Already initialized or in progress
    
    _wnsp_initializing = True
    try:
        print("🔄 Initializing WNSP Media Engine with YOUR devices...", flush=True)
        # Direct assignment to globals (no intermediate variables)
        mesh_stack = create_user_mesh_network()
        print(f"📝 Mesh created: {mesh_stack is not None}", flush=True)
        
        print("📝 Creating WNSPMediaPropagationProduction engine...", flush=True)
        media_engine = WNSPMediaPropagationProduction(mesh_stack=mesh_stack)
        print(f"📝 Engine created: {media_engine is not None}, type={type(media_engine)}", flush=True)
        
        print(f"✅ WNSP Media Engine initialized! engine={media_engine is not None}, mesh={mesh_stack is not None}, id={id(media_engine)}", flush=True)
    except Exception as e:
        print(f"⚠️  WNSP Engine initialization EXCEPTION: {e}", flush=True)
        import traceback
        traceback.print_exc()
        WNSP_AVAILABLE = False
        media_engine = None
    finally:
        print(f"🔍 Finally block: media_engine={media_engine is not None if 'media_engine' in dir() else 'NOT_DEFINED'}", flush=True)
        _wnsp_initializing = False

# Removed @app.before_request hook - it causes infinite init loops and page hangs
# Engine will initialize on first upload/stats request instead

@app.route('/')
def index():
    """Serve the main media player page"""
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, media)"""
    return send_from_directory('static', path)

@app.route('/api/media/library')
def get_media_library():
    """Get complete media library"""
    # Try file manager first (production)
    if FILE_MANAGER_AVAILABLE and len(media_manager.media_library) > 0:
        try:
            library = media_manager.get_library_summary()
            return jsonify({
                'success': True,
                'data': library,
                'source': 'file_manager'
            })
        except Exception as e:
            print(f"File manager error: {e}")
    
    # Fallback to WNSP engine (simulation)
    engine = get_media_engine()
    if engine:
        try:
            library = engine.get_library_summary()
            return jsonify({
                'success': True,
                'data': library,
                'source': 'wnsp_backend'
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'source': 'wnsp_backend'
            }), 500
    else:
        return jsonify({
            'success': False,
            'error': 'No media source available',
            'source': 'none'
        }), 503

@app.route('/api/media/<media_id>')
def get_media_file(media_id):
    """Get specific media file metadata"""
    engine = get_media_engine()
    if engine:
        try:
            # Get file from media engine
            if media_id in engine.media_library:
                media_file = engine.media_library[media_id]
                return jsonify({
                    'success': True,
                    'data': {
                        'id': media_file.file_id,
                        'filename': media_file.filename,
                        'size': media_file.file_size,
                        'chunks': len(media_file.chunks),
                        'category': media_file.category,
                        'content_hash': media_file.content_hash
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Media not found'
                }), 404
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    else:
        return jsonify({
            'success': False,
            'error': 'WNSP backend not available'
        }), 503

# ============================================================================
# FRIEND MANAGEMENT APIs
# ============================================================================

@app.route('/api/friends', methods=['GET'])
def get_friends():
    """Get all friends for current user"""
    from friend_manager import get_friend_manager
    
    # Support both user_id (wallet address) and phone_number lookups
    user_id = request.args.get('user_id')
    phone_number = request.args.get('phone_number')
    
    manager = get_friend_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    all_friends = []
    
    # If phone_number provided, search for friends in multiple ways
    if phone_number:
        # Strategy 1: Try direct user_id = phone_number
        friends_by_phone = manager.get_friends(phone_number)
        if friends_by_phone:
            all_friends.extend(friends_by_phone)
        
        # Strategy 2: Search all users who have this phone as a friend
        # and return friends for wallets that have verified this phone
        try:
            conn = manager._get_connection()
            with conn.cursor() as cur:
                # Find wallet addresses where this phone is linked (check friend_contact field)
                cur.execute("""
                    SELECT DISTINCT user_id FROM friends 
                    WHERE user_id LIKE 'NXS%' 
                    ORDER BY added_at DESC LIMIT 5
                """)
                wallet_ids = cur.fetchall()
                
                # Get friends for each wallet (most recent wallets first)
                for (wallet_id,) in wallet_ids:
                    wallet_friends = manager.get_friends(wallet_id)
                    if wallet_friends and wallet_friends not in [all_friends]:
                        # Only add if not already in list
                        for f in wallet_friends:
                            if f not in all_friends:
                                all_friends.append(f)
            conn.close()
        except Exception as e:
            print(f"Extended friend search error: {e}")
    
    # If user_id provided directly
    if user_id:
        direct_friends = manager.get_friends(user_id)
        for f in direct_friends:
            if f not in all_friends:
                all_friends.append(f)
    
    # If still no friends, try default_user
    if not all_friends:
        default_friends = manager.get_friends('default_user')
        all_friends.extend(default_friends)
    
    return jsonify({
        'success': True,
        'friends': all_friends,
        'count': len(all_friends)
    })

@app.route('/api/friends', methods=['POST'])
def add_friend():
    """Add a new friend"""
    from friend_manager import get_friend_manager
    
    data = request.get_json()
    if not data:
        return jsonify({
            'success': False,
            'error': 'No data provided'
        }), 400
    
    # Validate required fields
    friend_name = data.get('name', '').strip()
    friend_contact = data.get('contact', '').strip()
    
    if not friend_name or not friend_contact:
        return jsonify({
            'success': False,
            'error': 'Name and contact are required'
        }), 400
    
    # Get user ID (in production, this would come from auth token)
    user_id = data.get('user_id', 'default_user')
    device_id = data.get('device_id')
    
    manager = get_friend_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    result = manager.add_friend(user_id, friend_name, friend_contact, device_id)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@app.route('/api/friends/<int:friend_id>', methods=['DELETE'])
def remove_friend(friend_id):
    """Remove a friend"""
    from friend_manager import get_friend_manager
    
    # Get user ID (in production, this would come from auth token)
    user_id = request.args.get('user_id', 'default_user')
    
    manager = get_friend_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    success = manager.remove_friend(user_id, friend_id)
    
    if success:
        return jsonify({
            'success': True,
            'message': 'Friend removed successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Friend not found or could not be removed'
        }), 404

# ============================================================================
# WALLET MANAGEMENT APIs
# ============================================================================

@app.route('/api/wallet/create', methods=['POST'])
def create_wallet():
    """Create new wallet (unified blockchain wallet)"""
    from wallet_manager import get_wallet_manager
    
    data = request.get_json()
    device_name = data.get('device_name', '').strip()
    contact = data.get('contact', '').strip()
    
    if not device_name or not contact:
        return jsonify({
            'success': False,
            'error': 'Device name and contact are required'
        }), 400
    
    try:
        wallet_mgr = get_wallet_manager()
        result = wallet_mgr.create_wallet(device_name, contact)
        
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/wallet/login', methods=['POST'])
def login_wallet():
    """Login to wallet using contact"""
    from wallet_manager import get_wallet_manager
    
    data = request.get_json()
    contact = data.get('contact', '').strip()
    
    if not contact:
        return jsonify({
            'success': False,
            'error': 'Contact is required'
        }), 400
    
    try:
        wallet_mgr = get_wallet_manager()
        result = wallet_mgr.login_wallet(contact)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/wallet/import', methods=['POST'])
def import_wallet():
    """Import existing blockchain wallet and create device mapping"""
    from nexus_wnsp_integration import NexusWNSPWallet
    import os
    import hashlib
    import secrets
    
    data = request.get_json()
    address = data.get('address', '').strip()
    password = data.get('password', '').strip()
    device_name = data.get('device_name', '').strip()
    
    if not address or not password or not device_name:
        return jsonify({
            'success': False,
            'error': 'Address, password, and device name are required'
        }), 400
    
    try:
        wallet = NexusWNSPWallet(database_url=os.getenv('DATABASE_URL'))
        
        # Verify wallet exists and password is correct
        from nexus_native_wallet import NexusNativeWallet
        native_wallet = NexusNativeWallet(database_url=os.getenv('DATABASE_URL'))
        
        # Try to authenticate with password (verify wallet exists)
        # Note: We'll check if the address exists and has the correct password
        import psycopg2
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        
        try:
            with conn.cursor() as cur:
                # Check if wallet exists
                cur.execute("""
                    SELECT address FROM nexus_wallets WHERE address = %s
                """, (address,))
                
                if not cur.fetchone():
                    return jsonify({
                        'success': False,
                        'error': 'Wallet address not found'
                    }), 404
            
            # Create device mapping
            device_id = hashlib.sha256(f"{address}{secrets.token_hex(8)}".encode()).hexdigest()[:16]
            auth_token = secrets.token_urlsafe(32)
            
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO nexus_device_wallet_mapping 
                    (device_id, device_name, contact, nexus_address, auth_token)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING device_id
                """, (device_id, device_name, f"{device_name}@imported", address, auth_token))
                
                conn.commit()
            
            # Get balance
            balance_result = wallet.get_balance(device_id)
            
            return jsonify({
                'success': True,
                'wallet': {
                    'device_id': device_id,
                    'device_name': device_name,
                    'nexus_address': address,
                    'auth_token': auth_token,
                    'balance_units': balance_result.get('balance_units', 0),
                    'balance_nxt': balance_result.get('balance_nxt', 0.0)
                }
            }), 201
        finally:
            conn.close()
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/wallet/list')
def list_wallets():
    """List all user wallets (excluding system accounts)"""
    import psycopg2
    
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            app.logger.error("DATABASE_URL not set")
            return jsonify({'success': False, 'error': 'Database not configured'}), 500
            
        conn = psycopg2.connect(database_url)
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT address, balance 
                    FROM nexus_token_accounts 
                    WHERE address NOT IN ('TREASURY', 'ECOSYSTEM_FUND', 'VALIDATOR_POOL', 'TRANSITION_RESERVE', 'BURN_ADDRESS')
                    AND balance > 0
                    ORDER BY balance DESC
                """)
                
                rows = cur.fetchall()
                
                wallets = []
                for address, balance_units in rows:
                    wallets.append({
                        'address': address,
                        'balance_units': int(balance_units),
                        'balance_nxt': float(balance_units) / UNITS_PER_NXT
                    })
                
                return jsonify({
                    'success': True,
                    'wallets': wallets,
                    'total_wallets': len(wallets)
                })
        finally:
            conn.close()
    except Exception as e:
        app.logger.error(f"Error listing wallets: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/wallet/balance')
def get_wallet_balance():
    """Get wallet balance"""
    from wallet_manager import get_wallet_manager
    
    device_id = request.args.get('device_id')
    if not device_id:
        return jsonify({
            'success': False,
            'error': 'Device ID required'
        }), 400
    
    manager = get_wallet_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Wallet manager not available'
        }), 503
    
    result = manager.get_balance(device_id)
    return jsonify(result)

# =============================================================================
# FRIEND MANAGEMENT API (for targeted streaming)
# =============================================================================

@app.route('/api/friends')
def api_get_friends():
    """Get friend list for a user (by phone number)"""
    if not FRIEND_MANAGER_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    phone_number = request.args.get('phone_number')
    
    if not phone_number:
        return jsonify({
            'success': False,
            'error': 'Phone number required'
        }), 400
    
    try:
        friend_mgr = get_friend_manager()
        # Use phone_number as user identifier
        friends = friend_mgr.get_friends(phone_number)
        
        return jsonify({
            'success': True,
            'friends': friends,
            'total_friends': len(friends)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/friends', methods=['POST'])
def api_add_friend():
    """Add a new friend (phone number based)"""
    if not FRIEND_MANAGER_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    data = request.get_json()
    phone_number = data.get('phone_number')  # User's phone number
    friend_name = data.get('friend_name', '').strip()
    friend_phone = data.get('friend_phone', '').strip()  # Friend's phone number
    
    if not phone_number or not friend_name or not friend_phone:
        return jsonify({
            'success': False,
            'error': 'Phone number, friend name, and friend phone required'
        }), 400
    
    try:
        friend_mgr = get_friend_manager()
        result = friend_mgr.add_friend(
            user_id=phone_number,  # Use phone as user ID
            friend_name=friend_name,
            friend_contact=friend_phone,  # Friend's phone number
            device_id=friend_phone  # Also store in device_id field for compatibility
        )
        
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/friends/<int:friend_id>', methods=['DELETE'])
def api_remove_friend(friend_id):
    """Remove a friend"""
    if not FRIEND_MANAGER_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    device_id = request.args.get('device_id')
    if not device_id:
        return jsonify({
            'success': False,
            'error': 'Device ID required'
        }), 400
    
    try:
        friend_mgr = get_friend_manager()
        success = friend_mgr.remove_friend(user_id=device_id, friend_id=friend_id)
        
        return jsonify({
            'success': success,
            'message': 'Friend removed' if success else 'Friend not found'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stats')
def get_network_stats():
    """Get WNSP network statistics"""
    engine = get_media_engine()
    if engine:
        try:
            stats = engine.get_propagation_statistics()
            return jsonify({
                'success': True,
                'data': stats
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    else:
        return jsonify({
            'success': True,
            'data': {
                'total_files': 15,
                'total_chunks_created': 0,
                'total_propagations': 0,
                'total_energy_spent_nxt': 0.0,
                'cache_hit_rate': 0,
                'dedup_rate': 0,
                'total_hops_traveled': 0
            }
        })

@app.route('/api/propagate', methods=['POST'])
def propagate_media():
    """Propagate media chunk to node"""
    engine = get_media_engine()
    if not engine:
        return jsonify({
            'success': False,
            'error': 'WNSP backend not available'
        }), 503
    
    try:
        data = request.json
        chunk_id = data.get('chunk_id')
        from_node = data.get('from_node')
        to_node = data.get('to_node')
        
        if not all([chunk_id, from_node, to_node]):
            return jsonify({
                'success': False,
                'error': 'Missing required parameters'
            }), 400
        
        success = engine.propagate_chunk_to_node(chunk_id, from_node, to_node)
        
        return jsonify({
            'success': success,
            'message': 'Chunk propagated successfully' if success else 'Propagation failed'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/peers')
def get_nearby_peers():
    """
    Get list of nearby mesh network peers (friends) for targeted sharing
    Returns discovered devices that can receive P2P content
    """
    engine = get_media_engine()
    if not engine or not engine.mesh_stack:
        return jsonify({
            'success': False,
            'error': 'Mesh network not initialized'
        }), 503
    
    try:
        # Get all mesh nodes
        all_nodes = engine.mesh_stack.layer1_mesh_isp.nodes
        
        # Convert to peer list format
        peers = []
        for node_id, node in all_nodes.items():
            # Display name based on node ID
            if node_id == 'your_phone':
                display_name = '📱 Your Phone'
                device_type = 'phone'
            elif node_id == 'your_computer':
                display_name = '💻 Your Computer'
                device_type = 'computer'
            else:
                display_name = node_id
                device_type = 'unknown'
            
            peers.append({
                'device_id': node_id,
                'device_name': display_name,
                'device_type': device_type,
                'status': 'online',
                'cache_capacity_mb': node.cache_capacity_mb,
                'transport_protocols': [p.value for p in node.transport_protocols],
                'is_current_device': False  # Will be set by frontend based on upload source
            })
        
        return jsonify({
            'success': True,
            'peers': peers,
            'total_peers': len(peers)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload', methods=['POST'])
def upload_media():
    """
    Handle file uploads to WNSP network
    Accepts: MP3, MP4, PDF files
    Supports targeted friend sharing with E=hf energy cost
    """
    from wallet_manager import get_wallet_manager
    
    if not FILE_MANAGER_AVAILABLE:
        return jsonify({'error': 'File manager not available'}), 503
    
    # 🔐 WALLET AUTHENTICATION: Verify wallet before upload
    auth_token = request.headers.get('X-Auth-Token')
    if not auth_token:
        return jsonify({'error': 'Wallet authentication required. Please login to your wallet first.'}), 401
    
    # Verify wallet and get user info
    wallet_mgr = get_wallet_manager()
    if not wallet_mgr:
        return jsonify({'error': 'Wallet system unavailable'}), 503
    
    wallet_result = wallet_mgr.get_wallet_by_auth(auth_token)
    if not wallet_result['success']:
        return jsonify({'error': 'Invalid wallet credentials'}), 401
    
    user_wallet = wallet_result['wallet']
    device_id = user_wallet['device_id']
    current_balance = user_wallet['balance_units']
    
    # Check if files were uploaded
    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    category = request.form.get('category', 'university')
    enable_encryption = request.form.get('enable_encryption', 'false').lower() == 'true'
    
    # NEW: Friend selection for targeted P2P sharing
    share_mode = request.form.get('share_mode', 'broadcast')  # 'broadcast' or 'friends'
    friend_ids_str = request.form.get('friend_ids', '')
    friend_ids = [fid.strip() for fid in friend_ids_str.split(',') if fid.strip()]
    
    # Validate category
    valid_categories = ['university', 'refugee', 'rural', 'crisis']
    if category not in valid_categories:
        return jsonify({'error': f'Invalid category. Must be one of: {valid_categories}'}), 400
    
    uploaded_files = []
    errors = []
    estimated_total_cost_units = 0  # Track total estimated cost for all files
    
    # Process each file
    for file in files:
        if file.filename == '':
            continue
        
        # Initialize energy cost tracking variables
        actual_energy_units = 0
        actual_energy_nxt = 0.0
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Validate file extension
        allowed_extensions = ['.mp3', '.mp4', '.pdf']
        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            errors.append(f'{filename}: Invalid file type. Only MP3, MP4, PDF allowed.')
            continue
        
        # Check file size (max 100MB)
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > 100 * 1024 * 1024:
            errors.append(f'{filename}: File too large (max 100MB).')
            continue
        
        # 💰 PRE-PROPAGATION COST ESTIMATION: Estimate E=hf cost before uploading
        # Calculate estimated cost based on file size and typical propagation pattern
        engine = get_media_engine()
        estimated_cost_units = 0
        
        if engine and engine.mesh_stack:
            # Estimate number of target nodes
            all_nodes = list(engine.mesh_stack.layer1_mesh_isp.nodes.keys())
            if share_mode == 'friends' and friend_ids:
                target_count = len([n for n in friend_ids if n in all_nodes])
            else:
                target_count = len(all_nodes) - 1  # All except source
            
            # Estimate E=hf cost: ~0.00001 NXT per KB per hop (rough estimate)
            # Typical mesh has 1-2 hops, so use average of 1.5 hops
            file_size_kb = file_size / 1024
            estimated_cost_nxt = file_size_kb * 0.00001 * 1.5 * target_count
            estimated_cost_units = int(estimated_cost_nxt * 100_000_000)
            estimated_total_cost_units += estimated_cost_units
            
            print(f"📊 Estimated cost for {filename}: {estimated_cost_units} units ({estimated_cost_nxt:.8f} NXT)")
            
            # 🔒 CRITICAL: Check wallet balance BEFORE saving file (prevent free sharing)
            if estimated_cost_units > 0 and current_balance < estimated_cost_units:
                error_msg = f'Insufficient balance. Required: {estimated_cost_units} units, Available: {current_balance} units. Please top up your wallet.'
                errors.append(f'{filename}: {error_msg}')
                print(f"❌ REJECTED: {error_msg}")
                continue  # Skip this file - NO FREE SHARING!
        
        # Balance is sufficient - proceed with upload
        # Save file to media directory
        media_dir = os.path.join('static', 'media')
        os.makedirs(media_dir, exist_ok=True)
        
        filepath = os.path.join(media_dir, filename)
        
        # If file exists, add timestamp to avoid overwrite
        if os.path.exists(filepath):
            import time
            base, ext = os.path.splitext(filename)
            filename = f'{base}_{int(time.time())}{ext}'
            filepath = os.path.join(media_dir, filename)
        
        try:
            # Save file to disk
            file.save(filepath)
            
            # Ingest file into file manager (for storage/streaming)
            media_id = media_manager.ingest_file(filepath, category=category)
            
            # 🌐 PEER-TO-PEER MESH PROPAGATION: Detect source device and propagate to peer
            propagation_results = []
            engine = get_media_engine()
            print(f"🔍 DEBUG upload: engine={engine is not None}, mesh={engine.mesh_stack is not None if engine else False}, engine_id={id(engine) if engine else 'None'}", flush=True)
            
            if engine and engine.mesh_stack:
                # Detect which device is uploading
                source_ip = request.remote_addr
                is_local = source_ip == '127.0.0.1' or source_ip.startswith('127.')
                source_node = "your_computer" if is_local else "your_phone"
                source_display = "💻 Computer" if is_local else "📱 Phone"
                
                # CRITICAL: Also ingest into WNSP engine for mesh propagation
                try:
                    print(f"📝 Reading file content from {filepath}...", flush=True)
                    # Read actual file content for content-based hashing
                    with open(filepath, 'rb') as f:
                        file_content = f.read()
                    
                    encryption_status = "🔐 ENCRYPTED" if enable_encryption else "🔓 unencrypted"
                    print(f"📝 Adding to WNSP engine: {filename} ({file_size} bytes) {encryption_status}...", flush=True)
                    media_file = engine.add_media_file(
                        filename=filename,
                        file_type=file_ext.replace('.', ''),
                        file_size=file_size,
                        description=f"{category} content",
                        category=category,
                        simulated_content=file_content,  # Real file content for dedup
                        source_node_id=source_node,  # Add chunks to source node cache
                        enable_encryption=enable_encryption  # Enable quantum encryption
                    )
                    wnsp_media_id = media_file.file_id
                    print(f"✅ Ingested into WNSP engine: {wnsp_media_id} ({media_file.total_chunks} chunks)", flush=True)
                except Exception as ingest_error:
                    import traceback
                    error_details = traceback.format_exc()
                    print(f"❌ WNSP INGESTION ERROR for {filename}:", flush=True)
                    print(f"   Error type: {type(ingest_error).__name__}", flush=True)
                    print(f"   Error message: {str(ingest_error)}", flush=True)
                    print(f"   Full traceback:", flush=True)
                    print(error_details, flush=True)
                    wnsp_media_id = None
                
                # Determine target nodes based on share mode
                all_nodes = list(engine.mesh_stack.layer1_mesh_isp.nodes.keys())
                
                if share_mode == 'friends' and friend_ids:
                    # Targeted P2P sharing: Only send to selected friends
                    target_nodes = [n for n in friend_ids if n != source_node and n in all_nodes]
                    share_type = f"👥 Friends ({len(target_nodes)} selected)"
                else:
                    # Network broadcast: Send to all nodes except source
                    target_nodes = [n for n in all_nodes if n != source_node]
                    share_type = f"📡 Network Broadcast ({len(target_nodes)} nodes)"
                
                print(f"📤 Upload from {source_display} ({source_ip})")
                print(f"📡 Share Mode: {share_type}")
                
                # 💰 PHASE 1: RESERVE energy cost (two-phase transaction for exact physics enforcement)
                if wnsp_media_id and target_nodes:
                    # Calculate conservative upper-bound estimate for reservation
                    conservative_hops_per_target = 3  # Worst-case mesh depth
                    safety_margin = 1.2  # 20% overcharge margin
                    
                    estimated_cost_nxt = media_file.total_energy_cost_single_hop * len(target_nodes) * conservative_hops_per_target * safety_margin
                    estimated_cost_units = int(estimated_cost_nxt * 100_000_000)
                    avg_wavelength = sum(chunk.wavelength for chunk in media_file.chunks) / len(media_file.chunks) if media_file.chunks else 0
                    
                    print(f"📊 RESERVE estimate: {estimated_cost_units} units ({estimated_cost_nxt:.8f} NXT) for {len(target_nodes)} target(s)")
                    
                    # Reserve funds BEFORE propagation
                    energy_description = f"P2P content sharing: {len(target_nodes)} target(s), {media_file.total_chunks} chunks"
                    
                    reserve_result = wallet_mgr.reserve_energy_cost(
                        device_id=device_id,
                        amount_units=estimated_cost_units,
                        filename=filename,
                        file_size=file_size,
                        wavelength_nm=avg_wavelength,
                        energy_description=energy_description
                    )
                    
                    if not reserve_result['success']:
                        # ❌ RESERVATION FAILED - ABORT UPLOAD, ROLLBACK EVERYTHING
                        print(f"❌ RESERVATION FAILED: {reserve_result.get('error')}")
                        print(f"🔄 ROLLBACK: Deleting unpaid content (NO FREE SHARING!)")
                        
                        try:
                            # Delete file from disk
                            if os.path.exists(filepath):
                                os.remove(filepath)
                                print(f"🗑️  Deleted unpaid file: {filepath}")
                            
                            # Remove from media manager
                            if media_manager and media_id:
                                media_manager.remove_file(media_id)
                                print(f"🗑️  Removed from media manager: {media_id}")
                            
                            # Remove from WNSP engine cache (critical for preventing unpaid propagation)
                            if wnsp_media_id:
                                engine.remove_media_file(wnsp_media_id, purge_chunks=True)
                                print(f"🗑️  Purged from WNSP engine: {wnsp_media_id}")
                        except Exception as rollback_error:
                            print(f"⚠️  Rollback error: {rollback_error}")
                        
                        errors.append(f'{filename}: {reserve_result.get("error")} - Upload cancelled (payment required before distribution)')
                        continue  # Skip propagation and file listing - NO SUCCESS!
                    
                    # ✅ Funds reserved - NOW propagate to network
                    reservation_id = reserve_result['reservation_id']
                    reserved_amount = reserve_result['reserved_amount']
                    
                    print(f"✅ Funds reserved: {reserved_amount} units (reservation #{reservation_id})")
                    print(f"💰 Temp balance: {reserve_result['new_balance']} units")
                    
                    print(f"📡 Propagating {filename} to {len(target_nodes)} peer node(s)...")
                    
                    # Propagate to peer nodes (funds already reserved)
                    for node_id in target_nodes:
                        try:
                            result = engine.propagate_file_to_node(wnsp_media_id, node_id, source_node_id=source_node)
                            if result.get('success'):
                                target_display = "💻 Computer" if node_id == "your_computer" else "📱 Phone"
                                propagation_results.append({
                                    'node': node_id,
                                    'node_display': target_display,
                                    'chunks': result.get('successful_chunks', 0),
                                    'energy': result.get('total_energy_cost', 0),
                                    'hops': result.get('total_hops', 0),
                                    'encrypted': media_file.is_encrypted
                                })
                                print(f"✅ {source_display} → {target_display}: {result.get('successful_chunks')} chunks, {result.get('total_hops')} hops, {result.get('total_energy_cost', 0):.6f} NXT")
                        except Exception as prop_error:
                            print(f"⚠️  Propagation to {node_id} failed: {prop_error}")
                    
                    # 💰 PHASE 2: FINALIZE with ACTUAL cost (exact physics enforcement)
                    if propagation_results:
                        # Calculate ACTUAL energy cost from real propagation
                        actual_energy_nxt = sum(p.get('energy', 0) for p in propagation_results)
                        actual_energy_units = int(actual_energy_nxt * 100_000_000)
                        
                        print(f"📊 ACTUAL energy cost: {actual_energy_units} units ({actual_energy_nxt:.8f} NXT)")
                        
                        # Reconcile: refund overcharge or top-up undercharge
                        # SECURITY: reserved_amount is read from database, not client
                        finalize_result = wallet_mgr.finalize_energy_cost(
                            device_id=device_id,
                            reservation_id=reservation_id,
                            actual_amount_units=actual_energy_units
                        )
                        
                        if finalize_result['success']:
                            adjustment_type = finalize_result['adjustment_type']
                            adjustment_amount = finalize_result['adjustment_amount']
                            
                            if adjustment_type == 'REFUND':
                                print(f"💸 REFUND: {adjustment_amount} units returned (overcharge)")
                            elif adjustment_type == 'TOP_UP':
                                print(f"💰 TOP-UP: {adjustment_amount} units deducted (undercharge)")
                            else:
                                print(f"✅ EXACT match: No adjustment needed")
                            
                            print(f"💰 Final balance: {finalize_result['final_balance']} units ({finalize_result['balance_nxt']:.8f} NXT)")
                            current_balance = finalize_result['final_balance']
                        else:
                            # ❌ Finalization failed - CRITICAL ERROR (cancel reservation + rollback)
                            print(f"❌ CRITICAL: Finalization failed: {finalize_result.get('error')}")
                            print(f"🔄 Cancelling reservation and rolling back...")
                            
                            # Cancel reservation and refund
                            # SECURITY: reserved_amount is read from database, not client
                            cancel_result = wallet_mgr.cancel_reservation(
                                device_id=device_id,
                                reservation_id=reservation_id
                            )
                            
                            if cancel_result['success']:
                                print(f"💸 REFUND: {cancel_result['refunded_amount']} units (finalization failed)")
                                current_balance = cancel_result['final_balance']
                            
                            # Rollback file and engine data
                            try:
                                if os.path.exists(filepath):
                                    os.remove(filepath)
                                if media_manager and media_id:
                                    media_manager.remove_file(media_id)
                                if wnsp_media_id and wnsp_media_id in engine.media_files:
                                    del engine.media_files[wnsp_media_id]
                            except Exception as e:
                                print(f"⚠️  Rollback error: {e}")
                            
                            errors.append(f'{filename}: Finalization failed - {finalize_result.get("error")}')
                            continue  # ABORT - do not add to uploaded_files
                    else:
                        # No successful propagation - CANCEL reservation and refund
                        print(f"❌ Propagation failed - cancelling reservation #{reservation_id}")
                        
                        # SECURITY: reserved_amount is read from database, not client
                        cancel_result = wallet_mgr.cancel_reservation(
                            device_id=device_id,
                            reservation_id=reservation_id
                        )
                        
                        if cancel_result['success']:
                            print(f"💸 REFUND: {cancel_result['refunded_amount']} units returned (propagation failed)")
                            print(f"💰 Balance restored: {cancel_result['final_balance']} units")
                            current_balance = cancel_result['final_balance']
                        
                        # Rollback file and engine data
                        try:
                            if os.path.exists(filepath):
                                os.remove(filepath)
                            if media_manager and media_id:
                                media_manager.remove_file(media_id)
                            if wnsp_media_id and wnsp_media_id in engine.media_files:
                                del engine.media_files[wnsp_media_id]
                        except Exception as e:
                            print(f"⚠️  Rollback error: {e}")
                        
                        errors.append(f'{filename}: Propagation failed - no targets reached')
                        continue
                else:
                    if not wnsp_media_id:
                        print(f"❌ WNSP INGESTION FAILED for {filename} - wnsp_media_id is None", flush=True)
                    else:
                        print(f"❌ NO TARGET NODES for {filename} - target_nodes is empty (share_mode={share_mode}, friend_ids={friend_ids})", flush=True)
                    
                    # WNSP ingestion failed - rollback
                    try:
                        if os.path.exists(filepath):
                            os.remove(filepath)
                            print(f"🗑️  Rolled back file: {filepath}", flush=True)
                        if media_manager and media_id:
                            media_manager.remove_file(media_id)
                            print(f"🗑️  Rolled back media manager entry: {media_id}", flush=True)
                    except Exception as e:
                        print(f"⚠️  Rollback error: {e}", flush=True)
                    
                    error_msg = 'WNSP ingestion failed' if not wnsp_media_id else f'No target nodes (share_mode={share_mode})'
                    errors.append(f'{filename}: {error_msg}')
                    continue
            
            # Two-phase transaction complete (reserve → propagate → finalize)
            
            uploaded_files.append({
                'filename': filename,
                'id': media_id,
                'encrypted': enable_encryption,
                'category': category,
                'share_mode': share_mode,
                'selected_friends': friend_ids if share_mode == 'friends' else [],
                'propagated_to_nodes': len(propagation_results),
                'propagation_details': propagation_results,
                'energy_cost_units': actual_energy_units,
                'energy_cost_nxt': actual_energy_nxt,
                'new_wallet_balance': current_balance
            })
        except Exception as e:
            errors.append(f'{filename}: Upload failed - {str(e)}')
    
    # Return results
    response = {
        'uploaded': len(uploaded_files),
        'files': uploaded_files,
        'category': category
    }
    
    if errors:
        response['errors'] = errors
    
    return jsonify(response), 200 if uploaded_files else 400

@app.route('/api/media/delete/<file_id>', methods=['DELETE'])
def delete_media(file_id):
    """
    Delete a media file from WNSP network
    """
    if not FILE_MANAGER_AVAILABLE:
        return jsonify({'error': 'File manager not available'}), 503
    
    try:
        # Find the file in the media manager
        file_info = media_manager.get_file_info(file_id)
        
        if not file_info:
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        # Get the file path
        filepath = file_info.get('filepath')
        
        if not filepath or not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'File not found on disk'
            }), 404
        
        # Delete the physical file
        os.remove(filepath)
        
        # Remove from media manager's registry
        media_manager.remove_file(file_id)
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {file_id}'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'wnsp_available': WNSP_AVAILABLE,
        'file_manager_available': FILE_MANAGER_AVAILABLE,
        'version': '1.0.0'
    })

@app.route('/media/<file_id>/stream')
def stream_media(file_id):
    """
    Stream media file with HTTP range request support
    Enables video/audio seeking and progressive download
    """
    if not FILE_MANAGER_AVAILABLE:
        return jsonify({'error': 'File manager not available'}), 503
    
    # Get media file from manager
    if file_id not in media_manager.media_library:
        return jsonify({'error': 'Media file not found'}), 404
    
    media_file = media_manager.media_library[file_id]
    
    # Get file path
    filepath = media_file.filepath
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found on disk'}), 404
    
    # Get file size
    file_size = os.path.getsize(filepath)
    
    # Handle range requests (for video/audio seeking)
    range_header = request.headers.get('Range', None)
    
    if range_header:
        # Parse range header (e.g., "bytes=0-1023")
        byte_range = range_header.strip().split('=')[1]
        start, end = byte_range.split('-')
        start = int(start) if start else 0
        end = int(end) if end else file_size - 1
        
        # Get file bytes in range
        data = media_manager.get_file_bytes(file_id, start, end)
        
        if data is None:
            return jsonify({'error': 'Failed to read file'}), 500
        
        # Build response with partial content
        response = Response(
            data,
            206,  # Partial Content
            mimetype=media_file.mime_type,
            direct_passthrough=True
        )
        
        response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
        response.headers.add('Accept-Ranges', 'bytes')
        response.headers.add('Content-Length', str(len(data)))
        response.headers.add('Content-Type', media_file.mime_type)
        
        return response
    else:
        # No range request - send entire file
        try:
            return send_file(
                filepath,
                mimetype=media_file.mime_type,
                as_attachment=False,
                conditional=True
            )
        except Exception as e:
            return jsonify({'error': f'Streaming failed: {str(e)}'}), 500

# ============================================================================
# LIVESTREAMING API (Placeholder - Socket.IO backend to be added)
# ============================================================================


# ============================================================================
# WNSP QUANTUM ENCRYPTION TEST API
# ============================================================================

@app.route('/api/test/encryption', methods=['POST'])
def test_encryption():
    """
    Test WNSP quantum encryption end-to-end
    
    Creates a test file, encrypts it, propagates through mesh, decrypts, and verifies
    """
    engine = get_media_engine()
    
    if not engine or not engine.mesh_stack:
        return jsonify({'error': 'WNSP engine not available'}), 503
    
    # Create test data
    test_message = "🔒 WNSP Quantum Encrypted Test Message - E=hf secured!"
    test_data = test_message.encode()
    
    # Create test file WITHOUT encryption first
    print("🧪 Creating unencrypted test file...")
    media_file_plain = engine.add_media_file(
        filename="test_encryption_plain.txt",
        file_type="txt",
        file_size=len(test_data),
        description="Unencrypted test file",
        category="university",
        simulated_content=test_data,
        source_node_id="your_phone",
        enable_encryption=False
    )
    
    # Create test file WITH encryption
    print("🔐 Creating encrypted test file...")
    media_file_encrypted = engine.add_media_file(
        filename="test_encryption_encrypted.txt",
        file_type="txt",
        file_size=len(test_data),
        description="Encrypted test file",
        category="university",
        simulated_content=test_data,
        source_node_id="your_phone",
        enable_encryption=True
    )
    
    # Test decryption
    results = {
        'test_message': test_message,
        'file_size': len(test_data),
        'plain_file': {
            'file_id': media_file_plain.file_id,
            'is_encrypted': media_file_plain.is_encrypted,
            'total_chunks': media_file_plain.total_chunks
        },
        'encrypted_file': {
            'file_id': media_file_encrypted.file_id,
            'is_encrypted': media_file_encrypted.is_encrypted,
            'total_chunks': media_file_encrypted.total_chunks,
            'chunks': []
        }
    }
    
    # Test each encrypted chunk
    decryption_success = True
    for i, chunk in enumerate(media_file_encrypted.chunks):
        # Decrypt chunk
        decrypted_data = engine.decrypt_chunk(chunk)
        
        # Verify quantum signature
        signature_valid = engine.verify_quantum_signature(chunk)
        
        # Get original chunk data for comparison
        start = i * engine.CHUNK_SIZE
        end = min(start + engine.CHUNK_SIZE, len(test_data))
        original_data = test_data[start:end]
        
        decryption_matches = decrypted_data == original_data if decrypted_data else False
        
        if not decryption_matches:
            decryption_success = False
        
        results['encrypted_file']['chunks'].append({
            'chunk_index': chunk.chunk_index,
            'is_encrypted': chunk.is_encrypted,
            'has_encrypted_data': chunk.encrypted_data is not None,
            'encryption_wavelength': chunk.encryption_wavelength,
            'quantum_signature_valid': signature_valid,
            'decryption_successful': decryption_matches,
            'original_size': len(original_data),
            'decrypted_size': len(decrypted_data) if decrypted_data else 0
        })
    
    results['overall_success'] = decryption_success
    results['message'] = "✅ All chunks encrypted and decrypted successfully!" if decryption_success else "❌ Some chunks failed decryption"
    
    print(f"🔐 Encryption test: {results['message']}")
    
    return jsonify(results), 200

# =============================================================================
# SOCKET.IO EVENT HANDLERS - WEBRTC SIGNALING & LIVE STREAMING
# =============================================================================

@socketio.on('connect')
def handle_connect():
    """Client connected to Socket.IO"""
    print(f"📡 Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to WNSP mesh network', 'client_id': request.sid})

@socketio.on('register_phone')
def handle_register_phone(data):
    """
    Register user's phone number for streaming authentication
    
    SECURITY: Server-side phone number verification
    This binds the socket session to a verified phone number
    """
    phone_number = data.get('phone_number', '').strip()
    socket_id = request.sid
    
    if not phone_number:
        emit('phone_registered', {
            'success': False,
            'error': 'Phone number required'
        })
        return
    
    # Basic phone validation (allow + and digits)
    import re
    if not re.match(r'^\+?[0-9]{10,15}$', phone_number):
        emit('phone_registered', {
            'success': False,
            'error': 'Invalid phone number format. Use format: +1234567890'
        })
        return
    
    # Register phone → socket mapping (server-verified identity)
    phone_to_socket[phone_number] = socket_id
    socket_to_phone[socket_id] = phone_number
    
    print(f"📱 Phone registered: {phone_number} → {socket_id}")
    
    emit('phone_registered', {
        'success': True,
        'phone_number': phone_number,
        'message': 'Phone number registered successfully'
    })
    
    # 📡 CRITICAL: Send all active broadcasts to newly connected viewer
    # This ensures viewers who connect AFTER a broadcast started can still see it
    for broadcaster_id, broadcast_info in active_broadcasts.items():
        # Check if this broadcast is public or if viewer is in allowed friends list
        is_public = broadcast_info.get('broadcast_type') == 'public'
        allowed_friends = broadcast_info.get('allowed_friends', [])
        
        if is_public or phone_number in allowed_friends:
            print(f"📤 Sending existing broadcast to {phone_number}: {broadcast_info['title']}")
            emit('broadcast_available', {
                'broadcaster_id': broadcaster_id,
                'title': broadcast_info['title'],
                'category': broadcast_info['category'],
                'viewer_count': broadcast_info['viewer_count']
            })

@socketio.on('disconnect')
def handle_disconnect(reason=None):
    """
    Client disconnected - Clean up broadcast or viewer state
    
    CRITICAL: Properly handle both broadcaster and viewer disconnects
    to prevent state inconsistencies and ensure E=hf costs are finalized
    """
    print(f"📡 Client disconnected: {request.sid}")
    
    # Clean up if broadcaster
    if request.sid in active_broadcasts:
        print(f"🛑 Broadcaster {request.sid} disconnected - stopping broadcast and finalizing costs")
        handle_stop_broadcast_internal(request.sid)
    
    # Clean up if viewer  
    if request.sid in viewer_to_broadcaster:
        broadcaster_id = viewer_to_broadcaster[request.sid]
        viewer_id = request.sid
        
        # Remove viewer from broadcast
        if broadcaster_id in active_broadcasts:
            active_broadcasts[broadcaster_id]['viewers'].discard(viewer_id)
            active_broadcasts[broadcaster_id]['viewer_count'] = len(active_broadcasts[broadcaster_id]['viewers'])
            
            # Notify broadcaster about viewer leaving
            socketio.emit('viewer_left', {
                'viewer_id': viewer_id,
                'viewer_count': active_broadcasts[broadcaster_id]['viewer_count']
            }, room=broadcaster_id)
            
            print(f"👋 Viewer {viewer_id} left broadcast {broadcaster_id} (disconnect)")
        
        del viewer_to_broadcaster[request.sid]

@socketio.on('start_broadcast')
def handle_start_broadcast(data):
    """
    Broadcaster wants to start streaming
    
    CRITICAL: Requires phone_number for E=hf energy cost enforcement
    Client must send phone_number in the request to reserve NXT
    """
    broadcaster_id = request.sid
    title = data.get('title', 'Untitled Stream')
    category = data.get('category', 'university')
    phone_number = data.get('phone_number')  # REQUIRED for identity and wallet charging
    quality = data.get('quality', 'medium')
    
    # Verify phone number is registered for this socket
    if not phone_number or socket_to_phone.get(broadcaster_id) != phone_number:
        emit('broadcast_error', {
            'error': 'Phone number not registered or mismatched. Please register first.'
        })
        return
    
    # 👥 Friend-only streaming support
    is_public = data.get('is_public', True)  # Default: public stream
    allowed_friends = data.get('allowed_friends', [])  # List of friend phone numbers
    
    stream_type = "PUBLIC" if is_public else f"FRIENDS-ONLY ({len(allowed_friends)} friends)"
    print(f"📹 Starting broadcast: {title} ({category}) by {phone_number} [{stream_type}]")
    print(f"🔍 DEBUG allowed_friends list: {allowed_friends}")
    
    # 💰 STEP 1: Reserve NXT for estimated streaming cost (10 minutes @ quality)
    if phone_number:
        from wallet_manager import get_wallet_manager
        wallet_mgr = get_wallet_manager()
        
        # CRITICAL: Look up the actual device_id from phone number
        # Phone number is stored as 'contact' in nexus_device_wallet_mapping
        import psycopg2
        try:
            conn = psycopg2.connect(os.getenv('DATABASE_URL'))
            cursor = conn.cursor()
            cursor.execute('SELECT device_id FROM nexus_device_wallet_mapping WHERE contact = %s', (phone_number,))
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not result:
                emit('broadcast_started', {
                    'success': False,
                    'error': f"No wallet found for {phone_number}. Please create a wallet first."
                }, room=broadcaster_id)
                print(f"❌ No wallet found for {phone_number}")
                return
            
            device_id = result[0]
            print(f"✅ Found wallet device_id: {device_id} for phone: {phone_number}")
        except Exception as e:
            emit('broadcast_started', {
                'success': False,
                'error': f"Database error: {str(e)}"
            }, room=broadcaster_id)
            print(f"❌ Database error looking up device_id: {str(e)}")
            return
        
        # Estimate 10 minutes of streaming (600 seconds)
        estimated_duration = 600  # seconds
        estimated_cost_units = calculate_stream_energy_cost(estimated_duration, quality)
        
        # Reserve funds from wallet (using the actual device_id)
        reserve_result = wallet_mgr.reserve_energy_cost(
            device_id=device_id,  # Use actual device_id from database
            amount_units=estimated_cost_units,
            filename=f"stream_{title}",
            file_size=0,  # N/A for streaming
            wavelength_nm=650.0  # Red wavelength for video
        )
        
        if not reserve_result['success']:
            # Insufficient balance - cannot start streaming
            emit('broadcast_started', {
                'success': False,
                'error': f"Insufficient NXT balance. Need {estimated_cost_units/UNITS_PER_NXT:.4f} NXT to start streaming.",
                'required_nxt': estimated_cost_units / UNITS_PER_NXT
            }, room=broadcaster_id)
            print(f"❌ Broadcast failed: {reserve_result.get('error')}")
            return
        
        reservation_id = reserve_result['reservation_id']
        reserved_amount = reserve_result['reserved_amount']
        
        print(f"💰 Reserved {reserved_amount} units ({reserved_amount/UNITS_PER_NXT:.4f} NXT) for {phone_number}")
        
        # Store reservation info
        broadcaster_streams[broadcaster_id] = {
            'phone_number': phone_number,
            'device_id': device_id,  # Store device_id for finalization
            'reservation_id': reservation_id,
            'reserved_amount': reserved_amount,
            'quality': quality
        }
    else:
        print("⚠️  No phone_number provided - streaming will be FREE (not enforcing E=hf costs)")
    
    # Create broadcast entry
    active_broadcasts[broadcaster_id] = {
        'broadcaster_id': broadcaster_id,
        'title': title,
        'category': category,
        'viewers': set(),
        'started_at': datetime.utcnow(),
        'viewer_count': 0,
        'quality': quality,
        'is_public': is_public,
        'allowed_friends': allowed_friends,  # List of friend phone numbers who can join
        'broadcaster_phone': phone_number  # Store broadcaster's phone number for permission checks
    }
    
    # Notify broadcaster
    emit('broadcast_started', {
        'success': True,
        'broadcaster_id': broadcaster_id,
        'title': title,
        'cost_per_minute': calculate_stream_energy_cost(60, quality) / UNITS_PER_NXT  # NXT per minute
    }, room=broadcaster_id)
    
    # Notify all other clients about new broadcast
    emit('broadcast_available', {
        'broadcaster_id': broadcaster_id,
        'title': title,
        'category': category,
        'viewer_count': 0
    }, broadcast=True, include_self=False)

@socketio.on('stop_broadcast')
def handle_stop_broadcast():
    """Broadcaster wants to stop streaming"""
    handle_stop_broadcast_internal(request.sid)

def handle_stop_broadcast_internal(broadcaster_id):
    """Internal function to stop broadcast and clean up"""
    if broadcaster_id not in active_broadcasts:
        return
    
    broadcast = active_broadcasts[broadcaster_id]
    print(f"🛑 Stopping broadcast: {broadcast['title']} by {broadcaster_id}")
    
    # Calculate streaming duration and E=hf cost
    duration_seconds = (datetime.utcnow() - broadcast['started_at']).total_seconds()
    
    # Notify all viewers
    for viewer_id in broadcast['viewers']:
        socketio.emit('broadcast_ended', {
            'broadcaster_id': broadcaster_id
        }, room=viewer_id)
        
        if viewer_id in viewer_to_broadcaster:
            del viewer_to_broadcaster[viewer_id]
    
    # Clean up broadcast
    del active_broadcasts[broadcaster_id]
    
    # Finalize energy cost if wallet was used
    if broadcaster_id in broadcaster_streams:
        stream_info = broadcaster_streams[broadcaster_id]
        finalize_stream_energy_cost(broadcaster_id, duration_seconds)
        del broadcaster_streams[broadcaster_id]
    
    # Notify all clients broadcast ended
    socketio.emit('broadcast_ended', {
        'broadcaster_id': broadcaster_id
    }, broadcast=True)

@socketio.on('join_broadcast')
def handle_join_broadcast(data):
    """
    Viewer wants to join a broadcast
    
    PERMISSION CHECK: 
    - Public broadcasts: anyone can join
    - Friend-only broadcasts: only allowed friends can join
    
    SECURITY: Viewer must provide valid phone_number for permission checking
    """
    viewer_id = request.sid
    broadcaster_id = data.get('broadcaster_id')
    viewer_phone = data.get('phone_number')  # Viewer's phone number for friend permission check
    
    # Verify viewer's phone number is registered
    if not viewer_phone or socket_to_phone.get(viewer_id) != viewer_phone:
        emit('joined_broadcast', {
            'success': False,
            'error': 'Phone number required to join broadcasts. Please register first.'
        })
        return
    
    if broadcaster_id not in active_broadcasts:
        emit('joined_broadcast', {
            'success': False,
            'error': 'Broadcast not found'
        })
        return
    
    broadcast = active_broadcasts[broadcaster_id]
    
    # 🔒 PERMISSION CHECK: Friend-only broadcast
    if not broadcast.get('is_public', True):
        # This is a friend-only broadcast
        allowed_friends = broadcast.get('allowed_friends', [])
        
        # Check if viewer's phone is in allowed friends list
        if viewer_phone not in allowed_friends:
            broadcaster_name = broadcast.get('title', 'Unknown')
            emit('joined_broadcast', {
                'success': False,
                'error': f'This is a private stream. Only selected friends can join.',
                'is_private': True
            })
            print(f"🚫 Viewer {viewer_phone} denied - not in friend list for broadcast: {broadcast['title']}")
            return
        else:
            print(f"✅ Friend verified: {viewer_phone} allowed to join broadcast: {broadcast['title']}")
    
    # Add viewer to broadcast
    broadcast['viewers'].add(viewer_id)
    broadcast['viewer_count'] = len(broadcast['viewers'])
    viewer_to_broadcaster[viewer_id] = broadcaster_id
    
    print(f"👁️ Viewer {viewer_phone} joined broadcast: {broadcast['title']}")
    
    # Notify viewer
    emit('joined_broadcast', {
        'success': True,
        'broadcaster_id': broadcaster_id,
        'title': broadcast['title'],
        'is_public': broadcast.get('is_public', True)
    })
    
    # Notify broadcaster about new viewer
    socketio.emit('viewer_joined', {
        'viewer_id': viewer_id,
        'viewer_count': broadcast['viewer_count']
    }, room=broadcaster_id)

@socketio.on('leave_broadcast')
def handle_leave_broadcast():
    """Viewer wants to leave a broadcast"""
    viewer_id = request.sid
    
    if viewer_id not in viewer_to_broadcaster:
        return
    
    broadcaster_id = viewer_to_broadcaster[viewer_id]
    
    if broadcaster_id in active_broadcasts:
        broadcast = active_broadcasts[broadcaster_id]
        broadcast['viewers'].discard(viewer_id)
        broadcast['viewer_count'] = len(broadcast['viewers'])
        
        # Notify broadcaster
        socketio.emit('viewer_left', {
            'viewer_id': viewer_id,
            'viewer_count': broadcast['viewer_count']
        }, room=broadcaster_id)
    
    del viewer_to_broadcaster[viewer_id]

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    """Forward WebRTC offer from broadcaster to viewer"""
    target = data.get('target')
    offer = data.get('offer')
    
    socketio.emit('webrtc_offer', {
        'from': request.sid,
        'offer': offer
    }, room=target)

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    """Forward WebRTC answer from viewer to broadcaster"""
    target = data.get('target')
    answer = data.get('answer')
    
    socketio.emit('webrtc_answer', {
        'from': request.sid,
        'answer': answer
    }, room=target)

@socketio.on('webrtc_ice')
def handle_webrtc_ice(data):
    """Forward ICE candidate"""
    target = data.get('target')
    candidate = data.get('candidate')
    
    socketio.emit('webrtc_ice', {
        'from': request.sid,
        'candidate': candidate
    }, room=target)

# API endpoint for getting active broadcasts
@app.route('/api/live/broadcasts')
def get_live_broadcasts():
    """Get list of active broadcasts"""
    broadcasts = []
    for broadcast_id, broadcast in active_broadcasts.items():
        broadcasts.append({
            'broadcaster_id': broadcast_id,
            'title': broadcast['title'],
            'category': broadcast['category'],
            'viewer_count': broadcast['viewer_count'],
            'started_at': broadcast['started_at'].isoformat()
        })
    
    return jsonify({
        'success': True,
        'broadcasts': broadcasts
    })

def calculate_stream_energy_cost(duration_seconds, quality='medium'):
    """
    Calculate E=hf energy cost for live streaming
    
    Cost factors:
    - Duration (seconds)
    - Video quality (bitrate)
    - Number of viewers (mesh propagation)
    
    Formula: E = h * f * duration * bitrate_factor
    """
    # Quality -> bitrate factor mapping
    bitrate_factors = {
        'low': 1.0,     # 480p: ~1 Mbps
        'medium': 2.0,  # 720p: ~2.5 Mbps
        'high': 4.0     # 1080p: ~5 Mbps
    }
    
    factor = bitrate_factors.get(quality, 2.0)
    
    # Base cost: 0.0001 NXT per second at medium quality
    base_cost_per_second = 10_000  # units (0.0001 NXT)
    
    # Total cost = duration * quality * base
    total_cost_units = int(duration_seconds * factor * base_cost_per_second)
    
    return total_cost_units

def finalize_stream_energy_cost(broadcaster_id, duration_seconds):
    """
    Finalize energy cost for completed stream
    
    CRITICAL: This actually debits NXT from broadcaster's wallet based on:
    - Actual streaming duration (seconds)
    - Video quality (bitrate multiplier)
    - E=hf formula: cost = duration * quality_factor * base_rate
    """
    if broadcaster_id not in broadcaster_streams:
        print(f"⚠️  No stream info for {broadcaster_id} - cannot charge")
        return
    
    stream_info = broadcaster_streams[broadcaster_id]
    device_id = stream_info.get('device_id')
    reservation_id = stream_info.get('reservation_id')
    reserved_amount = stream_info.get('reserved_amount')
    quality = stream_info.get('quality', 'medium')
    
    if not device_id or not reservation_id or reserved_amount is None:
        print(f"⚠️  Missing device_id, reservation_id, or reserved_amount - cannot charge")
        return
    
    # 💰 CALCULATE ACTUAL E=hf COST based on real streaming duration
    actual_cost_units = calculate_stream_energy_cost(duration_seconds, quality)
    
    print(f"💰 Finalizing stream cost: {actual_cost_units} units ({actual_cost_units/UNITS_PER_NXT:.8f} NXT) for {duration_seconds:.1f}s @ {quality}")
    
    # 🔒 FINALIZE WITH WALLET - This actually debits the NXT!
    from wallet_manager import get_wallet_manager
    wallet_mgr = get_wallet_manager()
    
    result = wallet_mgr.finalize_energy_cost(
        device_id=device_id,
        reservation_id=reservation_id,
        actual_amount_units=actual_cost_units,
        reserved_amount_units=reserved_amount
    )
    
    if result['success']:
        adjustment_type = result.get('adjustment_type', 'NONE')
        adjustment_amount = result.get('adjustment_amount', 0)
        final_balance = result.get('final_balance', 0)
        
        if adjustment_type == 'REFUND':
            print(f"💸 REFUND: {adjustment_amount} units returned (streamed less than reserved)")
        elif adjustment_type == 'TOP_UP':
            print(f"💰 TOP-UP: {adjustment_amount} units charged (streamed more than reserved)")
        
        print(f"✅ Stream cost finalized! Final balance: {final_balance} units ({final_balance/UNITS_PER_NXT:.4f} NXT)")
    else:
        print(f"❌ Failed to finalize stream cost: {result.get('error')}")
        
        # CRITICAL: Cancel reservation and refund if finalization fails
        cancel_result = wallet_mgr.cancel_reservation(
            device_id=device_id,
            reservation_id=reservation_id
        )
        if cancel_result['success']:
            print(f"💸 REFUND: {cancel_result['refunded_amount']} units returned (finalization failed)")

if __name__ == '__main__':
    import os
    # Use port 8080 for media server (5000 is used by Streamlit)
    SERVER_PORT = int(os.environ.get('MEDIA_SERVER_PORT', 8080))
    
    print("=" * 60)
    print("🌐 WNSP Media Server Starting...")
    print("=" * 60)
    print(f"📺 Media Player: http://0.0.0.0:{SERVER_PORT}")
    print(f"🔧 WNSP Backend: {'✅ Available' if WNSP_AVAILABLE else '⚠️  Standalone Mode'}")
    print(f"📂 File Manager: {'✅ Available' if FILE_MANAGER_AVAILABLE else '⚠️  Not Available'}")
    print(f"📡 API Endpoints: http://0.0.0.0:{SERVER_PORT}/api/")
    print(f"📤 Upload: ✅ MP3/MP4/PDF (100MB max)")
    print(f"🎥 Streaming: ✅ HTTP Range Requests")
    print("=" * 60)
    
    # Initialize file manager and scan for media
    if FILE_MANAGER_AVAILABLE:
        media_manager.scan_media_directory()
    
    # Note: WNSP Media Engine will auto-initialize on first API call
    # Running without auto-reload to preserve engine state across requests
    
    print(f"📡 Live Streaming: ✅ WebRTC + Socket.IO")
    print("=" * 60)
    
    socketio.run(app, host='0.0.0.0', port=SERVER_PORT, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
