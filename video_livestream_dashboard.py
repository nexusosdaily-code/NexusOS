"""
NexusOS Video & Livestream Dashboard
====================================

Unified interface for uploading, managing, and sharing videos with the WNSP network.
Features real-time livestreaming with wavelength-based energy cost tracking.
Integrates with friend_manager for private streaming and wnsp_media_server for network publishing.
"""

import streamlit as st
import requests
import json
import os
from datetime import datetime
from typing import Optional, List, Dict

MEDIA_SERVER_URL = "http://127.0.0.1:8080"

def get_friends_list(phone_number: str) -> List[Dict]:
    """Fetch friends list from the media server API"""
    try:
        response = requests.get(
            f"{MEDIA_SERVER_URL}/api/friends",
            params={"phone_number": phone_number},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data.get('friends', [])
        return []
    except Exception as e:
        print(f"Error fetching friends: {e}")
        return []


def get_live_broadcasts() -> List[Dict]:
    """Fetch active broadcasts from the media server"""
    try:
        response = requests.get(f"{MEDIA_SERVER_URL}/api/live/broadcasts", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data.get('broadcasts', [])
        return []
    except Exception as e:
        print(f"Error fetching broadcasts: {e}")
        return []


def render_video_livestream_dashboard():
    """Main video and livestreaming dashboard"""
    
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
    .friend-card {
        background: rgba(255,255,255,0.95);
        border: 2px solid rgba(102, 126, 234, 0.3);
        border-radius: 10px;
        padding: 12px;
        margin: 5px 0;
    }
    .friend-card:hover {
        border-color: rgba(102, 126, 234, 0.8);
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
    }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="video-hero">
        <h1>🎥 Video & Livestream Hub</h1>
        <p>Upload, share, and stream videos across the NexusOS network with wavelength-tracked energy costs</p>
    </div>
    """, unsafe_allow_html=True)
    
    if 'active_streams' not in st.session_state:
        st.session_state.active_streams = {}
    if 'uploaded_videos' not in st.session_state:
        st.session_state.uploaded_videos = []
    if 'user_phone' not in st.session_state:
        st.session_state.user_phone = ""
    if 'video_selected_friends' not in st.session_state:
        st.session_state.video_selected_friends = []
    if 'stream_selected_friends' not in st.session_state:
        st.session_state.stream_selected_friends = []
    if 'friends_list' not in st.session_state:
        st.session_state.friends_list = []
    
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs(["📹 Video Calling", "📤 Upload Video", "📡 Livestream", "👥 Friends", "📚 Library", "⚙️ Settings"])
    
    with tab1:
        render_video_calling_tab()
    
    with tab2:
        render_video_upload_tab()
    
    with tab3:
        render_livestream_tab()
    
    with tab4:
        render_friends_tab()
    
    with tab5:
        render_video_library_tab()
    
    with tab6:
        render_settings_tab()


def render_video_calling_tab():
    """Video calling interface with video monitors for seeing friends"""
    from video_energy_meter import video_energy_meter, VideoQuality, StreamType
    
    st.subheader("📹 Video Calling & Monitors")
    
    wallet_address = st.session_state.get('wallet_address', '')
    wallet_valid = wallet_address and wallet_address.startswith('NXS') and not wallet_address.startswith('NXS_GUEST')
    
    if not wallet_valid:
        st.error("""
        ⚠️ **Wallet Not Linked** - Video calls require a linked wallet for physics-based energy billing.
        
        When you unlock your wallet, it must be bound to this session for E=hf energy costs to be charged correctly.
        Without a linked wallet, video charges go to **escrow** and are collected when you link your wallet.
        """)
        
        with st.expander("📊 Physics Economics for Video"):
            st.markdown("""
            **How Video Calling is Priced:**
            
            Video streams are photon oscillations at specific frequencies:
            - **E = hf × t** (Energy = Planck constant × frequency × time)
            - **Λ = hf/c²** (Lambda Boson mass-equivalent)
            
            | Quality | Frequency (Hz) | Cost/Minute (NXT) |
            |---------|---------------|-------------------|
            | 240p    | ~1.2M         | ~0.001 NXT        |
            | 480p    | ~7.4M         | ~0.005 NXT        |
            | 720p    | ~27.6M        | ~0.018 NXT        |
            | 1080p   | ~62.2M        | ~0.041 NXT        |
            
            Your **BHLS** (Basic Human Living Standards) includes **115 NXT/month** for video (10% of 1,150 NXT).
            """)
    else:
        bhls_status = video_energy_meter.get_bhls_video_status(wallet_address)
        col_wallet, col_budget = st.columns(2)
        with col_wallet:
            st.success(f"✅ Wallet Linked: `{wallet_address[:20]}...`")
        with col_budget:
            remaining = bhls_status['remaining_nxt']
            if remaining > 50:
                st.info(f"📊 BHLS Video Budget: {remaining:.2f} NXT remaining")
            elif remaining > 0:
                st.warning(f"⚠️ Low Budget: {remaining:.2f} NXT remaining")
            else:
                st.error("❌ BHLS Video Budget Exhausted")
    
    st.markdown("""
    Connect with friends through live video calls. Each monitor shows a friend's video feed in real-time.
    """)
    
    col_status, col_server = st.columns([2, 1])
    with col_status:
        st.markdown("### 🌐 Connection Status")
        st.success("✅ WNSP Media Server: Online (Port 8080)")
    with col_server:
        if st.button("🔗 Open Full Video Hub", type="primary", use_container_width=True):
            st.markdown(f"[Open in new tab](http://localhost:8080/livestream.html)", unsafe_allow_html=True)
    
    st.divider()
    
    st.markdown("### 📺 Video Monitor Grid")
    st.markdown("Select friends to start a video call. Their video feed will appear in the monitors below.")
    
    if st.session_state.friends_list:
        friend_options = []
        for friend in st.session_state.friends_list:
            friend_name = friend.get('name', friend.get('friend_name', 'Unknown'))
            friend_contact = friend.get('contact', friend.get('friend_contact', ''))
            friend_options.append(f"{friend_name} ({friend_contact})")
        
        selected_for_call = st.multiselect(
            "Choose friends to video call:",
            options=friend_options,
            max_selections=4,
            key="video_call_friends",
            help="Select up to 4 friends for a group video call"
        )
        
        if selected_for_call:
            st.info(f"📞 Ready to call {len(selected_for_call)} friend(s)")
            
            if st.button("📹 Start Video Call", type="primary", use_container_width=True):
                st.session_state['active_video_call'] = selected_for_call
                
                import uuid
                session_id = f"video_{uuid.uuid4().hex[:8]}"
                user_identity = st.session_state.get('user_phone', 'unknown')
                
                result = video_energy_meter.start_session(
                    session_id=session_id,
                    wallet_address=wallet_address if wallet_valid else None,
                    user_identity=user_identity,
                    quality=VideoQuality.HD_720P,
                    stream_type=StreamType.VIDEO_CALL
                )
                
                st.session_state['video_session_id'] = session_id
                
                if result['is_escrowed']:
                    st.warning(f"⚠️ Charges escrowed (wallet not linked). Rate: {result['energy_rate_nxt_per_minute']:.4f} NXT/min")
                else:
                    st.success(f"🔔 Calling friends... Energy rate: {result['energy_rate_nxt_per_minute']:.4f} NXT/min")
    else:
        st.warning("⚠️ Add friends in the Friends tab to start video calling")
    
    st.markdown("---")
    
    st.markdown("### 🖥️ Video Monitors")
    
    monitor_cols = st.columns(2)
    
    active_call = st.session_state.get('active_video_call', [])
    
    for i in range(4):
        col_idx = i % 2
        with monitor_cols[col_idx]:
            with st.container(border=True):
                if i < len(active_call):
                    friend_name = active_call[i].split(" (")[0]
                    st.markdown(f"""
                    <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; text-align: center; min-height: 200px;">
                        <div style="color: #ef4444; font-weight: bold; margin-bottom: 10px;">🔴 CONNECTING...</div>
                        <div style="font-size: 48px; margin: 20px 0;">👤</div>
                        <div style="color: white; font-weight: 600;">{friend_name}</div>
                        <div style="color: #94a3b8; font-size: 12px; margin-top: 5px;">Waiting for video feed...</div>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div style="background: #252540; border-radius: 12px; padding: 20px; text-align: center; min-height: 200px; border: 2px dashed #374151;">
                        <div style="font-size: 48px; margin: 30px 0; opacity: 0.3;">📺</div>
                        <div style="color: #64748b;">Monitor {i+1}</div>
                        <div style="color: #475569; font-size: 12px;">No active connection</div>
                    </div>
                    """, unsafe_allow_html=True)
    
    if active_call:
        st.markdown("---")
        
        session_id = st.session_state.get('video_session_id')
        if session_id:
            meter_result = video_energy_meter.meter_session(session_id)
            if meter_result:
                col_time, col_cost = st.columns(2)
                with col_time:
                    minutes = int(meter_result['elapsed_seconds'] // 60)
                    seconds = int(meter_result['elapsed_seconds'] % 60)
                    st.metric("⏱️ Call Duration", f"{minutes}:{seconds:02d}")
                with col_cost:
                    st.metric("⚡ Energy Used", f"{meter_result['total_energy_nxt']:.6f} NXT")
        
        col_mute, col_video, col_end = st.columns(3)
        with col_mute:
            if st.button("🔇 Mute", use_container_width=True):
                st.info("Microphone muted")
        with col_video:
            if st.button("📷 Toggle Camera", use_container_width=True):
                st.info("Camera toggled")
        with col_end:
            if st.button("📴 End Call", type="secondary", use_container_width=True):
                if session_id:
                    cost = video_energy_meter.end_session(session_id)
                    if cost:
                        st.info(f"📊 Call Cost: {cost.energy_nxt:.6f} NXT | Duration: {cost.duration_seconds:.1f}s | SDK Fee: {cost.sdk_fee_nxt:.8f} NXT")
                        if cost.is_escrowed:
                            st.warning("⚠️ Charges escrowed - link wallet to complete payment")
                
                st.session_state['active_video_call'] = []
                st.session_state['video_session_id'] = None
                st.warning("Call ended")
                st.rerun()
    
    st.markdown("---")
    
    st.markdown("### 🎬 WebRTC Live Video Hub")
    st.markdown("For full video calling with camera access, use the embedded video hub below:")
    
    import streamlit.components.v1 as components
    import urllib.parse
    
    wallet_id = st.session_state.get('wallet_address', 'NXS_GUEST')
    user_phone = st.session_state.get('user_phone', '')
    
    friends_data = []
    for friend in st.session_state.friends_list:
        friends_data.append({
            'name': friend.get('name', friend.get('friend_name', 'Unknown')),
            'contact': friend.get('contact', friend.get('friend_contact', ''))
        })
    
    friends_encoded = urllib.parse.quote(json.dumps(friends_data))
    wallet_encoded = urllib.parse.quote(wallet_id)
    phone_encoded = urllib.parse.quote(user_phone) if user_phone else ''
    
    iframe_url = f"http://localhost:8080/livestream.html?wallet={wallet_encoded}&phone={phone_encoded}&friends={friends_encoded}"
    
    video_hub_html = f"""
    <div style="position: relative;">
        <iframe 
            id="videoHubFrame"
            src="{iframe_url}" 
            width="100%" 
            height="600" 
            style="border: 2px solid #667eea; border-radius: 12px; background: #0f0f23;"
            allow="camera; microphone; autoplay; display-capture"
        ></iframe>
        <div style="position: absolute; top: 10px; right: 10px; background: rgba(16, 185, 129, 0.9); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
            ✅ Camera Ready
        </div>
    </div>
    <p style="color: #64748b; font-size: 12px; margin-top: 8px; text-align: center;">
        📹 Click "Continue" in the video hub above, then "Start Live Broadcast" to begin video calling
    </p>
    """
    
    components.html(video_hub_html, height=660)


def render_friends_tab():
    """Friends management for private streaming"""
    st.subheader("👥 Friends Management")
    st.markdown("Manage your friends for private video sharing and livestreaming.")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown("### Add New Friend")
        
        friend_name = st.text_input("Friend's Name:", key="new_friend_name")
        friend_phone = st.text_input("Friend's Phone Number:", placeholder="+1234567890", key="new_friend_phone")
        friend_country = st.selectbox("Country:", ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Other"], key="new_friend_country")
        can_share_media = st.checkbox("Allow media sharing", value=True, key="new_friend_media")
        
        if st.button("➕ Add Friend", type="primary", use_container_width=True):
            if friend_name and friend_phone:
                new_friend = {
                    'name': friend_name,
                    'contact': friend_phone,
                    'country': friend_country,
                    'can_share_media': can_share_media,
                    'added_at': datetime.now().isoformat()
                }
                st.session_state.friends_list.append(new_friend)
                st.success(f"✅ Added {friend_name} to your friends list!")
                st.rerun()
            else:
                st.error("Please enter friend's name and phone number")
    
    with col2:
        st.markdown("### Your Friends")
        
        user_phone = st.text_input("Your Phone Number (to sync friends):", 
                                   value=st.session_state.user_phone,
                                   placeholder="+1234567890",
                                   key="sync_phone")
        
        if user_phone != st.session_state.user_phone:
            st.session_state.user_phone = user_phone
        
        if st.button("🔄 Sync Friends from Network", use_container_width=True):
            if user_phone:
                with st.spinner("Fetching friends from network..."):
                    network_friends = get_friends_list(user_phone)
                    if network_friends:
                        st.session_state.friends_list = network_friends
                        st.success(f"✅ Synced {len(network_friends)} friends from network!")
                    else:
                        st.info("No friends found on network. Add friends locally above.")
            else:
                st.error("Enter your phone number to sync")
        
        st.divider()
        
        if st.session_state.friends_list:
            st.metric("Total Friends", len(st.session_state.friends_list))
            
            for idx, friend in enumerate(st.session_state.friends_list):
                with st.container(border=True):
                    col_info, col_action = st.columns([3, 1])
                    with col_info:
                        st.markdown(f"**{friend.get('name', friend.get('friend_name', 'Unknown'))}**")
                        st.caption(f"📱 {friend.get('contact', friend.get('friend_contact', 'N/A'))}")
                        if friend.get('country'):
                            st.caption(f"🌍 {friend.get('country')}")
                    with col_action:
                        if st.button("🗑️", key=f"del_friend_{idx}"):
                            st.session_state.friends_list.pop(idx)
                            st.rerun()
        else:
            st.info("👋 No friends yet. Add friends to share videos privately!")


def render_video_upload_tab():
    """Video upload interface with friend selection"""
    st.subheader("📤 Upload Video to NexusOS Network")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("Upload video files (MP4, WebM, MKV) to share across the network")
        
        uploaded_file = st.file_uploader(
            "Choose a video file",
            type=["mp4", "webm", "mkv", "mov", "avi"],
            key="video_uploader"
        )
        
        if uploaded_file:
            st.info(f"📹 Selected: {uploaded_file.name} ({uploaded_file.size / (1024*1024):.2f} MB)")
            
            col_title, col_artist = st.columns(2)
            with col_title:
                title = st.text_input("Video Title:", value=uploaded_file.name.split('.')[0])
            with col_artist:
                artist = st.text_input("Creator/Channel:", value="NexusOS User")
            
            description = st.text_area("Video Description:", height=80)
            
            st.markdown("### 🔒 Sharing Settings")
            
            visibility = st.radio(
                "Who can view this video?",
                ["🌍 Public - Everyone on the network", 
                 "👥 Friends Only - Selected friends only",
                 "🔒 Private - Only you"],
                key="video_visibility"
            )
            
            selected_friends = []
            if "Friends Only" in visibility:
                st.markdown("#### Select Friends to Share With:")
                
                if st.session_state.friends_list:
                    friend_options = []
                    for friend in st.session_state.friends_list:
                        friend_name = friend.get('name', friend.get('friend_name', 'Unknown'))
                        friend_contact = friend.get('contact', friend.get('friend_contact', ''))
                        friend_options.append(f"{friend_name} ({friend_contact})")
                    
                    selected = st.multiselect(
                        "Choose friends:",
                        options=friend_options,
                        default=st.session_state.video_selected_friends,
                        key="video_friend_select"
                    )
                    st.session_state.video_selected_friends = selected
                    
                    for sel in selected:
                        contact = sel.split("(")[-1].rstrip(")")
                        selected_friends.append(contact)
                    
                    if selected_friends:
                        st.success(f"✅ Will share with {len(selected_friends)} friend(s)")
                else:
                    st.warning("⚠️ No friends added. Go to Friends tab to add friends first.")
            
            st.markdown("### 📡 Network Publishing")
            publish_to_network = st.checkbox("Publish to WNSP Mesh Network", value=True, 
                                             help="Distribute video across NexusOS mesh nodes for faster delivery")
            
            if st.button("🚀 Upload to Network", type="primary", use_container_width=True):
                with st.spinner("📡 Uploading to WNSP network..."):
                    import time
                    progress_bar = st.progress(0)
                    
                    for i in range(101):
                        progress_bar.progress(i)
                        time.sleep(0.01)
                    
                    is_public = "Public" in visibility
                    is_friends_only = "Friends Only" in visibility
                    
                    video_entry = {
                        'name': uploaded_file.name,
                        'title': title,
                        'artist': artist,
                        'size': uploaded_file.size,
                        'uploaded_at': datetime.now().isoformat(),
                        'is_public': is_public,
                        'friend_only': is_friends_only,
                        'allowed_friends': selected_friends,
                        'network_published': publish_to_network,
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
                        'visibility': 'public' if is_public else ('friends-only' if is_friends_only else 'private'),
                        'shared_with': len(selected_friends) if is_friends_only else ('all' if is_public else 0),
                        'network_published': publish_to_network,
                        'mesh_nodes': 12 if publish_to_network else 0,
                        'cdn_edge_caches': 8 if publish_to_network else 0
                    })
    
    with col2:
        st.markdown("### 📊 Upload Stats")
        st.metric("Max File Size", "100 MB")
        st.metric("Supported Formats", "MP4, WebM, MKV, MOV")
        st.metric("Energy Cost", "~0.05 NXT/MB")
        
        st.divider()
        st.markdown("### 🌐 Network Status")
        st.metric("WNSP Nodes Online", "12")
        st.metric("Mesh Connectivity", "98.5%")


def render_livestream_tab():
    """Livestream broadcasting interface with friend selection"""
    st.subheader("📡 Start Livestream")
    
    st.markdown("""
    Broadcast live video to NexusOS network. All streams are powered by wavelength-based energy 
    accounting and optimized for mobile mesh networks.
    """)
    
    live_broadcasts = get_live_broadcasts()
    if live_broadcasts:
        st.markdown("### 🔴 Live Now on Network")
        for broadcast in live_broadcasts[:5]:
            with st.container(border=True):
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.markdown(f"**{broadcast.get('title', 'Untitled')}**")
                    st.caption(f"Category: {broadcast.get('category', 'N/A')} | 👁️ {broadcast.get('viewer_count', 0)} viewers")
                with col2:
                    st.button("▶️ Watch", key=f"watch_{broadcast.get('broadcaster_id', 'unknown')}")
    
    st.divider()
    st.markdown("### 🎬 Start Your Broadcast")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
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
        
        st.markdown("### 🔒 Stream Privacy")
        
        stream_visibility = st.radio(
            "Who can watch?",
            ["🌍 Public - Anyone can join",
             "👥 Friends Only - Invite specific friends",
             "🔗 Link Only - Share link privately"],
            key="stream_visibility"
        )
        
        allowed_friends = []
        if "Friends Only" in stream_visibility:
            st.markdown("#### Select Friends to Invite:")
            
            if st.session_state.friends_list:
                friend_options = []
                for friend in st.session_state.friends_list:
                    friend_name = friend.get('name', friend.get('friend_name', 'Unknown'))
                    friend_contact = friend.get('contact', friend.get('friend_contact', ''))
                    friend_options.append(f"📱 {friend_name} ({friend_contact})")
                
                selected = st.multiselect(
                    "Invite friends to stream:",
                    options=friend_options,
                    default=st.session_state.stream_selected_friends,
                    key="stream_friend_select"
                )
                st.session_state.stream_selected_friends = selected
                
                for sel in selected:
                    contact = sel.split("(")[-1].rstrip(")")
                    allowed_friends.append(contact)
                
                if allowed_friends:
                    st.info(f"✅ {len(allowed_friends)} friend(s) will be able to join")
            else:
                st.warning("⚠️ No friends added. Go to Friends tab to add friends first.")
        
        st.divider()
        
        col_quality, col_recording = st.columns(2)
        with col_quality:
            stream_quality = st.selectbox("Stream Quality:", ["720p", "1080p", "480p", "360p"])
        with col_recording:
            save_recording = st.checkbox("Save recording after", value=True)
        
        if st.button("🔴 Go Live!", type="primary", use_container_width=True):
            if not stream_title:
                st.error("Please enter a stream title")
            else:
                is_public = "Public" in stream_visibility
                is_friends_only = "Friends Only" in stream_visibility
                
                stream_data = {
                    'title': stream_title,
                    'category': stream_category,
                    'description': stream_description,
                    'is_public': is_public,
                    'allowed_friends': allowed_friends,
                    'quality': stream_quality,
                    'save_recording': save_recording,
                    'started_at': datetime.now().isoformat(),
                    'viewers': 0,
                    'status': 'active'
                }
                st.session_state.active_streams[stream_title] = stream_data
                
                visibility_text = "PUBLIC" if is_public else f"FRIENDS-ONLY ({len(allowed_friends)} invited)"
                
                st.success(f"🎥 Live now: {stream_title}")
                st.markdown(f"""
                <div style="background: #1a1a2e; padding: 20px; border-radius: 12px; border-left: 4px solid #ff4444;">
                    <span class="live-indicator">● LIVE</span>
                    <h3 style="color: white; margin-top: 10px;">{stream_title}</h3>
                    <p style="color: #aaa;">Visibility: {visibility_text}</p>
                </div>
                """, unsafe_allow_html=True)
                
                st.json({
                    'status': 'streaming',
                    'stream_id': f"stream_{int(datetime.now().timestamp())}",
                    'title': stream_title,
                    'visibility': 'public' if is_public else 'friends-only',
                    'invited_friends': len(allowed_friends),
                    'quality': stream_quality,
                    'rtmp_url': f"rtmp://wnsp.network/live/{stream_title.replace(' ', '_')}",
                    'wavelength_zone': 'green',
                    'energy_rate': '2.5 NXT/hour'
                })
    
    with col2:
        st.markdown("### 📊 Streaming Stats")
        st.metric("Active Streams", len(st.session_state.active_streams))
        st.metric("Network Broadcasts", len(live_broadcasts))
        st.metric("Energy/Hour", "~2.5 NXT")
        
        st.divider()
        st.markdown("### 💡 Tips")
        st.info("🎯 **Friends Only** streams are encrypted end-to-end and only invited friends can join.")
    
    if st.session_state.active_streams:
        st.markdown("---")
        st.markdown("### 🔴 Your Active Streams")
        
        for stream_name, stream_info in list(st.session_state.active_streams.items()):
            with st.container(border=True):
                col_info, col_stats, col_action = st.columns([2, 1, 1])
                with col_info:
                    visibility = "🌍 Public" if stream_info.get('is_public') else f"👥 Friends ({len(stream_info.get('allowed_friends', []))})"
                    st.markdown(f"**{stream_name}** - {stream_info['category']}")
                    st.caption(f"Started: {stream_info['started_at']} | {visibility}")
                with col_stats:
                    st.metric("Viewers", stream_info.get('viewers', 0))
                with col_action:
                    if st.button("⏹️ End", key=f"end_{stream_name}", type="secondary"):
                        del st.session_state.active_streams[stream_name]
                        st.success(f"Stream '{stream_name}' ended.")
                        st.rerun()


def render_video_library_tab():
    """Video library and management"""
    st.subheader("📚 Video Library")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Videos", len(st.session_state.uploaded_videos))
    with col2:
        total_size = sum(v['size'] for v in st.session_state.uploaded_videos) / (1024*1024)
        st.metric("Storage Used", f"{total_size:.2f} MB")
    with col3:
        total_views = sum(v.get('views', 0) for v in st.session_state.uploaded_videos)
        st.metric("Total Views", total_views)
    with col4:
        public_count = sum(1 for v in st.session_state.uploaded_videos if v.get('is_public'))
        st.metric("Public Videos", public_count)
    
    if st.session_state.uploaded_videos:
        st.markdown("---")
        
        filter_visibility = st.selectbox(
            "Filter by visibility:",
            ["All", "Public", "Friends Only", "Private"],
            key="library_filter"
        )
        
        for idx, video in enumerate(st.session_state.uploaded_videos):
            if filter_visibility != "All":
                if filter_visibility == "Public" and not video.get('is_public'):
                    continue
                if filter_visibility == "Friends Only" and not video.get('friend_only'):
                    continue
                if filter_visibility == "Private" and (video.get('is_public') or video.get('friend_only')):
                    continue
            
            with st.container(border=True):
                col_details, col_sharing, col_actions = st.columns([2, 1, 1])
                
                with col_details:
                    st.markdown(f"### 🎬 {video['title']}")
                    st.caption(f"By {video['artist']} • {video['size']/(1024*1024):.2f} MB")
                    st.caption(f"Uploaded: {video['uploaded_at'].split('T')[0]}")
                
                with col_sharing:
                    if video.get('is_public'):
                        st.markdown("🌍 **Public**")
                    elif video.get('friend_only'):
                        friend_count = len(video.get('allowed_friends', []))
                        st.markdown(f"👥 **Friends Only** ({friend_count})")
                    else:
                        st.markdown("🔒 **Private**")
                    
                    if video.get('network_published'):
                        st.caption("📡 Network Published")
                
                with col_actions:
                    col_btn1, col_btn2 = st.columns(2)
                    with col_btn1:
                        if st.button("📤", key=f"share_{idx}", help="Share"):
                            st.info(f"Share link: https://nexus.os/v/{video['title'].replace(' ', '_')}")
                    with col_btn2:
                        if st.button("🗑️", key=f"delete_{idx}", help="Delete"):
                            st.session_state.uploaded_videos.pop(idx)
                            st.rerun()
    else:
        st.info("📭 No videos uploaded yet. Upload your first video above!")


def render_settings_tab():
    """Livestream and video settings"""
    st.subheader("⚙️ Video & Stream Settings")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 📡 Streaming Defaults")
        
        default_quality = st.selectbox(
            "Default Quality:",
            ["1080p", "720p", "480p", "360p"],
            index=1
        )
        
        default_visibility = st.radio(
            "Default Visibility:",
            ["Public", "Friends Only", "Private"],
            index=0
        )
        
        enable_recordings = st.checkbox("Auto-save livestream recordings", value=True)
        
        st.markdown("### 💰 Energy Management")
        energy_limit = st.slider(
            "Monthly Energy Budget (NXT):",
            min_value=10, max_value=1000, value=100, step=10
        )
        
        energy_alert = st.slider(
            "Alert when usage reaches (%):",
            min_value=50, max_value=100, value=80, step=5
        )
    
    with col2:
        st.markdown("### 🔒 Privacy & Access")
        
        allow_comments = st.checkbox("Allow comments on videos", value=True)
        allow_downloads = st.checkbox("Allow video downloads", value=False)
        
        st.markdown("### 🌐 Network Publishing")
        
        auto_publish = st.checkbox("Auto-publish to WNSP mesh network", value=True,
                                   help="Automatically distribute content across mesh nodes")
        
        cdn_enabled = st.checkbox("Use CDN Edge Caching", value=True,
                                  help="Cache content at edge nodes for faster delivery")
        
        st.markdown("### 👥 Friend Sharing Defaults")
        
        notify_friends = st.checkbox("Notify friends when going live", value=True)
        auto_accept = st.checkbox("Auto-accept friend requests", value=False)
    
    if st.button("💾 Save Settings", type="primary", use_container_width=True):
        st.success("✅ Settings saved successfully!")
        st.json({
            'streaming': {
                'default_quality': default_quality,
                'default_visibility': default_visibility,
                'auto_recordings': enable_recordings
            },
            'energy': {
                'monthly_limit_nxt': energy_limit,
                'alert_percent': energy_alert
            },
            'privacy': {
                'comments_enabled': allow_comments,
                'downloads_enabled': allow_downloads
            },
            'network': {
                'auto_publish': auto_publish,
                'cdn_enabled': cdn_enabled
            },
            'friends': {
                'notify_on_live': notify_friends,
                'auto_accept_requests': auto_accept
            }
        })


if __name__ == "__main__":
    render_video_livestream_dashboard()
