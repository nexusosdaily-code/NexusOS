#!/usr/bin/env python3
"""
WNSP Media Server - Standalone HTML/CSS/JS Media Player
GPL v3.0 License
Serves the user-facing media player interface and integrates with WNSP backend
"""

from flask import Flask, send_from_directory, jsonify, request, Response, send_file
from flask_cors import CORS
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

# Lazy initialization globals
mesh_stack = None
media_engine = None
_wnsp_init_attempted = False

def get_media_engine():
    """Lazy-load WNSP media engine on first request"""
    global mesh_stack, media_engine, _wnsp_init_attempted, WNSP_AVAILABLE
    
    if not WNSP_AVAILABLE:
        return None
    
    if media_engine is not None:
        return media_engine
    
    if _wnsp_init_attempted:
        return None
    
    _wnsp_init_attempted = True
    
    try:
        print("🔄 Initializing WNSP Media Engine...")
        mesh_stack = create_demo_network()
        media_engine = WNSPMediaPropagationProduction(mesh_stack=mesh_stack)
        print("✅ WNSP Media Engine initialized")
        return media_engine
    except Exception as e:
        print(f"⚠️  WNSP Engine initialization failed: {e}")
        WNSP_AVAILABLE = False
        return None

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

if __name__ == '__main__':
    print("=" * 60)
    print("🌐 WNSP Media Server Starting...")
    print("=" * 60)
    print(f"📺 Media Player: http://0.0.0.0:5000")
    print(f"🔧 WNSP Backend: {'✅ Available' if WNSP_AVAILABLE else '⚠️  Standalone Mode'}")
    print(f"📂 File Manager: {'✅ Available' if FILE_MANAGER_AVAILABLE else '⚠️  Not Available'}")
    print(f"📡 API Endpoints: http://0.0.0.0:5000/api/")
    print("=" * 60)
    
    # Initialize file manager and scan for media
    if FILE_MANAGER_AVAILABLE:
        media_manager.scan_media_directory()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
