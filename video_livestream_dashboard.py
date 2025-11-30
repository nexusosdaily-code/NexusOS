"""
NexusOS Video & Livestream Dashboard
====================================

Unified interface for uploading, managing, and sharing videos with the WNSP network.
Features real-time livestreaming with wavelength-based energy cost tracking.
"""

import streamlit as st
import requests
import json
from datetime import datetime
from typing import Optional

def render_video_livestream_dashboard():
    """Main video and livestreaming dashboard"""
    
    st.set_page_config(
        page_title="NexusOS Video & Livestream",
        page_icon="🎥",
        layout="wide"
    )
    
    st.markdown("""
    <style>
    .video-hero {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 30px;
        border-radius: 15px;
        color: white;
        margin-bottom: 20px;
    }
    .live-indicator {
        display: inline-block;
        background: #ff4444;
        padding: 8px 16px;
        border-radius: 20px;
        color: white;
        font-weight: bold;
        animation: pulse 1s infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="video-hero">
        <h1>🎥 Video & Livestream Hub</h1>
        <p>Upload, share, and stream videos across the NexusOS network with wavelength-tracked energy costs</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Initialize session state
    if 'active_streams' not in st.session_state:
        st.session_state.active_streams = {}
    if 'uploaded_videos' not in st.session_state:
        st.session_state.uploaded_videos = []
    
    # Main tabs
    tab1, tab2, tab3, tab4 = st.tabs(["📤 Upload Video", "📡 Livestream", "📚 Library", "⚙️ Settings"])
    
    with tab1:
        render_video_upload_tab()
    
    with tab2:
        render_livestream_tab()
    
    with tab3:
        render_video_library_tab()
    
    with tab4:
        render_settings_tab()


def render_video_upload_tab():
    """Video upload interface"""
    st.subheader("📤 Upload Video to NexusOS Network")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("Upload video files (MP4, WebM, MKV) to share across the network")
        
        # File uploader
        uploaded_file = st.file_uploader(
            "Choose a video file",
            type=["mp4", "webm", "mkv", "mov", "avi"],
            key="video_uploader"
        )
        
        if uploaded_file:
            st.info(f"📹 Selected: {uploaded_file.name} ({uploaded_file.size / (1024*1024):.2f} MB)")
            
            # Video metadata
            col_title, col_artist = st.columns(2)
            with col_title:
                title = st.text_input("Video Title:", value=uploaded_file.name.split('.')[0])
            with col_artist:
                artist = st.text_input("Creator/Channel:", value="NexusOS User")
            
            description = st.text_area("Video Description:", height=80)
            
            # Sharing settings
            st.markdown("### Sharing Settings")
            col_public, col_friends = st.columns(2)
            with col_public:
                is_public = st.checkbox("Public (Share with everyone)", value=True)
            with col_friends:
                friend_only = st.checkbox("Friends Only", value=False)
            
            # Upload button
            if st.button("🚀 Upload to Network", type="primary", use_container_width=True):
                # Simulate upload
                with st.spinner("📡 Uploading to WNSP network..."):
                    import time
                    progress_bar = st.progress(0)
                    
                    for i in range(101):
                        progress_bar.progress(i)
                        time.sleep(0.01)
                    
                    # Add to session state
                    video_entry = {
                        'name': uploaded_file.name,
                        'title': title,
                        'artist': artist,
                        'size': uploaded_file.size,
                        'uploaded_at': datetime.now().isoformat(),
                        'is_public': is_public,
                        'friend_only': friend_only,
                        'views': 0,
                        'status': 'uploaded'
                    }
                    st.session_state.uploaded_videos.append(video_entry)
                    
                    st.success(f"✅ Successfully uploaded '{title}' to NexusOS Network!")
                    st.json({
                        'status': 'success',
                        'video_id': f"vid_{int(datetime.now().timestamp())}",
                        'title': title,
                        'size': f"{uploaded_file.size / (1024*1024):.2f} MB",
                        'energy_cost': f"{(uploaded_file.size / (1024*1024)) * 0.05:.4f} NXT",
                        'visibility': 'public' if is_public else ('friends-only' if friend_only else 'private'),
                        'network_nodes': 12,
                        'cdn_edge_caches': 8
                    })
    
    with col2:
        st.markdown("### 📊 Upload Stats")
        st.metric("Max File Size", "1 GB")
        st.metric("Supported Formats", "MP4, WebM, MKV, MOV")
        st.metric("Energy Cost", "~0.05 NXT/MB")


def render_livestream_tab():
    """Livestream broadcasting interface"""
    st.subheader("📡 Start Livestream")
    
    st.markdown("""
    Broadcast live video to NexusOS network. All streams are powered by wavelength-based energy 
    accounting and optimized for mobile mesh networks.
    """)
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Stream configuration
        stream_title = st.text_input("Stream Title:", placeholder="e.g., NexusOS Workshop #1")
        stream_category = st.selectbox(
            "Category:",
            ["Education", "Technology", "Entertainment", "Governance", "Music", "Other"]
        )
        
        stream_description = st.text_area(
            "Stream Description:",
            placeholder="Describe what your stream is about...",
            height=80
        )
        
        col_public, col_recording = st.columns(2)
        with col_public:
            is_live_public = st.checkbox("Public Livestream", value=True)
        with col_recording:
            save_recording = st.checkbox("Save as Video After", value=True)
        
        # Start stream button
        if st.button("🔴 Go Live!", type="primary", use_container_width=True):
            if not stream_title:
                st.error("Please enter a stream title")
            else:
                stream_data = {
                    'title': stream_title,
                    'category': stream_category,
                    'description': stream_description,
                    'public': is_live_public,
                    'save_recording': save_recording,
                    'started_at': datetime.now().isoformat(),
                    'viewers': 0,
                    'status': 'active'
                }
                st.session_state.active_streams[stream_title] = stream_data
                
                st.success(f"🎥 Live now: {stream_title}")
                st.json({
                    'status': 'streaming',
                    'stream_id': f"stream_{int(datetime.now().timestamp())}",
                    'rtmp_url': f"rtmp://wnsp.network/live/{stream_title.replace(' ', '_')}",
                    'viewers': 0,
                    'bitrate': "auto-adaptive",
                    'quality_options': ['360p', '720p', '1080p'],
                    'wavelength_zone': 'green'
                })
    
    with col2:
        st.markdown("### 📊 Streaming Stats")
        st.metric("Active Streams", len(st.session_state.active_streams))
        st.metric("Avg Viewers/Stream", "42")
        st.metric("Energy/Hour", "~2.5 NXT")
    
    # Active streams display
    if st.session_state.active_streams:
        st.markdown("---")
        st.markdown("### 🔴 Active Streams")
        
        for stream_name, stream_info in st.session_state.active_streams.items():
            with st.container(border=True):
                col_info, col_action = st.columns([3, 1])
                with col_info:
                    st.markdown(f"**{stream_name}** - {stream_info['category']}")
                    st.caption(f"Started: {stream_info['started_at']}")
                with col_action:
                    if st.button("End Stream", key=f"end_{stream_name}"):
                        del st.session_state.active_streams[stream_name]
                        st.rerun()


def render_video_library_tab():
    """Video library and management"""
    st.subheader("📚 Video Library")
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Videos", len(st.session_state.uploaded_videos))
    with col2:
        total_size = sum(v['size'] for v in st.session_state.uploaded_videos) / (1024*1024)
        st.metric("Storage Used", f"{total_size:.2f} MB")
    with col3:
        total_views = sum(v.get('views', 0) for v in st.session_state.uploaded_videos)
        st.metric("Total Views", total_views)
    
    if st.session_state.uploaded_videos:
        st.markdown("---")
        
        for idx, video in enumerate(st.session_state.uploaded_videos):
            with st.container(border=True):
                col_details, col_actions = st.columns([3, 1])
                
                with col_details:
                    st.markdown(f"### 🎬 {video['title']}")
                    st.caption(f"By {video['artist']} • {video['size']/(1024*1024):.2f} MB")
                    
                    cols = st.columns(4)
                    with cols[0]:
                        st.metric("Views", video.get('views', 0))
                    with cols[1]:
                        st.metric("Status", video['status'])
                    with cols[2]:
                        visibility = "🌍 Public" if video['is_public'] else "👥 Friends" if video['friend_only'] else "🔒 Private"
                        st.metric("Visibility", visibility.split()[1])
                    with cols[3]:
                        uploaded_date = video['uploaded_at'].split('T')[0]
                        st.metric("Uploaded", uploaded_date)
                
                with col_actions:
                    if st.button("⋮", key=f"menu_{idx}"):
                        st.session_state[f"show_menu_{idx}"] = not st.session_state.get(f"show_menu_{idx}", False)
                    
                    if st.session_state.get(f"show_menu_{idx}", False):
                        col_btn1, col_btn2 = st.columns(2)
                        with col_btn1:
                            if st.button("📤 Share", key=f"share_{idx}", use_container_width=True):
                                st.info(f"Share link: https://nexus.os/video/{video['title'].replace(' ', '_')}")
                        with col_btn2:
                            if st.button("🗑️ Delete", key=f"delete_{idx}", use_container_width=True):
                                st.session_state.uploaded_videos.pop(idx)
                                st.rerun()
    else:
        st.info("📭 No videos uploaded yet. Upload your first video above!")


def render_settings_tab():
    """Livestream and video settings"""
    st.subheader("⚙️ Video & Stream Settings")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Streaming Settings")
        
        default_bitrate = st.selectbox(
            "Default Bitrate:",
            ["Auto-adaptive", "High (8 Mbps)", "Medium (4 Mbps)", "Low (1 Mbps)"],
            index=0
        )
        
        default_quality = st.selectbox(
            "Default Quality:",
            ["1080p", "720p", "480p", "360p"],
            index=0
        )
        
        enable_recordings = st.checkbox("Auto-save livestream recordings", value=True)
        
        st.markdown("### Energy Management")
        energy_limit = st.slider(
            "Monthly Energy Budget (NXT):",
            min_value=1, max_value=1000, value=100, step=10
        )
        
        energy_alert = st.slider(
            "Alert when usage reaches (%):",
            min_value=50, max_value=100, value=80, step=5
        )
    
    with col2:
        st.markdown("### Privacy & Access")
        
        default_visibility = st.radio(
            "Default Visibility:",
            ["Public", "Friends Only", "Private"],
            index=0
        )
        
        allow_comments = st.checkbox("Allow comments on videos", value=True)
        allow_downloads = st.checkbox("Allow video downloads", value=False)
        
        st.markdown("### Network Settings")
        
        preferred_nodes = st.multiselect(
            "Preferred Network Nodes:",
            ["Node Alpha", "Node Beta", "Node Gamma", "Node Delta"],
            default=["Node Alpha", "Node Beta"]
        )
        
        cdn_enabled = st.checkbox("Use CDN Edge Caching", value=True)
    
    if st.button("💾 Save Settings", type="primary", use_container_width=True):
        st.success("✅ Settings saved successfully!")
        st.json({
            'bitrate': default_bitrate,
            'quality': default_quality,
            'auto_recordings': enable_recordings,
            'energy_limit_nxt': energy_limit,
            'energy_alert_percent': energy_alert,
            'default_visibility': default_visibility,
            'comments_enabled': allow_comments,
            'downloads_enabled': allow_downloads,
            'preferred_nodes': preferred_nodes,
            'cdn_enabled': cdn_enabled
        })


if __name__ == "__main__":
    render_video_livestream_dashboard()
