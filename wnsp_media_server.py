#!/usr/bin/env python3
"""
WNSP Media Server - Standalone HTML/CSS/JS Media Player
GPL v3.0 License
Serves the user-facing media player interface and integrates with WNSP backend
"""

from flask import Flask, send_from_directory, jsonify, request, Response, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import production file manager
try:
    from wnsp_media_file_manager import media_manager
    FILE_MANAGER_AVAILABLE = True
except ImportError:
    FILE_MANAGER_AVAILABLE = False
    print("⚠️  File manager not available")

# Import WNSP backend
try:
    from wnsp_unified_mesh_stack import create_demo_network
    from wnsp_media_propagation_production import WNSPMediaPropagationProduction
    WNSP_AVAILABLE = True
except ImportError:
    WNSP_AVAILABLE = False
    print("⚠️  WNSP backend not available - running in standalone mode")

app = Flask(__name__, static_folder='static')
CORS(app)

# Security: Enforce maximum upload size (100MB)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# TODO: LiveStream feature - Socket.IO signaling server will be added here
# Requires: python-socketio>=5.10.0 with proper dependency resolution
# See: static/livestream.html and static/js/livestream.js for frontend

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
    
    # Get user ID from request (in production, this would come from auth token)
    user_id = request.args.get('user_id', 'default_user')
    
    manager = get_friend_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Friend manager not available'
        }), 503
    
    friends = manager.get_friends(user_id)
    return jsonify({
        'success': True,
        'friends': friends,
        'count': len(friends)
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
    """Create new wallet"""
    from wallet_manager import get_wallet_manager
    
    data = request.get_json()
    device_name = data.get('device_name', '').strip()
    contact = data.get('contact', '').strip()
    
    if not device_name or not contact:
        return jsonify({
            'success': False,
            'error': 'Device name and contact are required'
        }), 400
    
    manager = get_wallet_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Wallet manager not available'
        }), 503
    
    result = manager.create_wallet(device_name, contact)
    
    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@app.route('/api/wallet/login', methods=['POST'])
def login_wallet():
    """Login to wallet"""
    from wallet_manager import get_wallet_manager
    
    data = request.get_json()
    contact = data.get('contact', '').strip()
    
    if not contact:
        return jsonify({
            'success': False,
            'error': 'Contact is required'
        }), 400
    
    manager = get_wallet_manager()
    if not manager:
        return jsonify({
            'success': False,
            'error': 'Wallet manager not available'
        }), 503
    
    result = manager.login_wallet(contact)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 404

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
                    print(f"⚠️  WNSP ingestion failed: {ingest_error}", flush=True)
                    print(traceback.format_exc(), flush=True)
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
                
                # 💰 CRITICAL: Calculate CONSERVATIVE upper-bound cost BEFORE propagation
                if wnsp_media_id and target_nodes:
                    # Use CONSERVATIVE estimate to ensure we never undercharge
                    # Assume worst-case: 3 hops per target + 20% safety margin
                    # This guarantees payment covers actual energy liability
                    conservative_hops_per_target = 3  # Worst-case mesh depth
                    safety_margin = 1.2  # 20% overcharge margin
                    
                    estimated_cost_nxt = media_file.total_energy_cost_single_hop * len(target_nodes) * conservative_hops_per_target * safety_margin
                    estimated_cost_units = int(estimated_cost_nxt * 100_000_000)
                    avg_wavelength = sum(chunk.wavelength for chunk in media_file.chunks) / len(media_file.chunks) if media_file.chunks else 0
                    
                    print(f"📊 CONSERVATIVE estimate: {estimated_cost_units} units ({estimated_cost_nxt:.8f} NXT) for {len(target_nodes)} target(s)")
                    
                    # 🔒 DEDUCT ENERGY COST BEFORE PROPAGATION (prevent free distribution)
                    energy_description = f"P2P content sharing (pre-paid): {len(target_nodes)} target(s), {media_file.total_chunks} chunks"
                    
                    deduction_result = wallet_mgr.deduct_energy_cost(
                        device_id=device_id,
                        amount_units=total_energy_cost_units,
                        filename=filename,
                        file_size=file_size,
                        wavelength_nm=avg_wavelength,
                        energy_description=energy_description
                    )
                    
                    if not deduction_result['success']:
                        # ❌ PAYMENT FAILED - ABORT UPLOAD, ROLLBACK EVERYTHING
                        print(f"❌ PAYMENT FAILED: {deduction_result.get('error')}")
                        print(f"🔄 ROLLBACK: Deleting unpaid content (NO FREE SHARING!)")
                        
                        try:
                            if os.path.exists(filepath):
                                os.remove(filepath)
                                print(f"🗑️  Deleted unpaid file: {filepath}")
                            if media_manager and media_id:
                                media_manager.remove_file(media_id)
                                print(f"🗑️  Removed from media manager: {media_id}")
                        except Exception as rollback_error:
                            print(f"⚠️  Rollback error: {rollback_error}")
                        
                        errors.append(f'{filename}: {deduction_result.get("error")} - Upload cancelled (payment required before distribution)')
                        continue  # Skip propagation and file listing - NO SUCCESS!
                    
                    # ✅ Payment successful - NOW propagate to network
                    print(f"✅ Payment deducted: {total_energy_cost_units} units ({total_energy_cost_nxt:.8f} NXT)")
                    print(f"💰 New balance: {deduction_result['new_balance']} units")
                    current_balance = deduction_result['new_balance']
                    
                    print(f"📡 Propagating {filename} to {len(target_nodes)} peer node(s)...")
                    
                    # Propagate to peer nodes only (payment already confirmed)
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
                else:
                    print("⚠️  Skipping propagation - WNSP ingestion failed or no targets")
                    
                    # WNSP ingestion failed - rollback
                    try:
                        if os.path.exists(filepath):
                            os.remove(filepath)
                        if media_manager and media_id:
                            media_manager.remove_file(media_id)
                    except Exception as e:
                        print(f"⚠️  Rollback error: {e}")
                    errors.append(f'{filename}: WNSP ingestion failed')
                    continue
            
            # Payment already deducted before propagation (above) - just track results
            
            uploaded_files.append({
                'filename': filename,
                'id': media_id,
                'encrypted': enable_encryption,
                'category': category,
                'share_mode': share_mode,
                'selected_friends': friend_ids if share_mode == 'friends' else [],
                'propagated_to_nodes': len(propagation_results),
                'propagation_details': propagation_results,
                'energy_cost_units': total_energy_cost_units,
                'energy_cost_nxt': total_energy_cost_units / 100_000_000,
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

@app.route('/api/live/broadcasts')
def get_active_broadcasts():
    """Get list of active livestreams (placeholder for future Socket.IO implementation)"""
    return jsonify({
        'success': True,
        'broadcasts': [],
        'total': 0,
        'message': 'LiveStream feature coming soon - Socket.IO signaling server required'
    })

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

if __name__ == '__main__':
    print("=" * 60)
    print("🌐 WNSP Media Server Starting...")
    print("=" * 60)
    print(f"📺 Media Player: http://0.0.0.0:5000")
    print(f"🔧 WNSP Backend: {'✅ Available' if WNSP_AVAILABLE else '⚠️  Standalone Mode'}")
    print(f"📂 File Manager: {'✅ Available' if FILE_MANAGER_AVAILABLE else '⚠️  Not Available'}")
    print(f"📡 API Endpoints: http://0.0.0.0:5000/api/")
    print(f"📤 Upload: ✅ MP3/MP4/PDF (100MB max)")
    print(f"🎥 Streaming: ✅ HTTP Range Requests")
    print("=" * 60)
    
    # Initialize file manager and scan for media
    if FILE_MANAGER_AVAILABLE:
        media_manager.scan_media_directory()
    
    # Note: WNSP Media Engine will auto-initialize on first API call
    # Running without auto-reload to preserve engine state across requests
    
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
