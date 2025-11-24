/**
 * WNSP LiveStream - WebRTC Peer-to-Peer Mesh Broadcasting
 * GPL v3.0 License
 */

// Socket.IO connection
const socket = io();

// WebRTC configuration
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// State management
let localStream = null;
let isBroadcasting = false;
let broadcasterId = null;
let peerConnections = {}; // viewer_id -> RTCPeerConnection
let viewingBroadcast = null;
let currentViewPeerConnection = null;
let userFriends = []; // List of user's friends (loaded on page load)
let userPhone = null; // User's registered phone number (server-verified)

// ============================================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================================

socket.on('connected', (data) => {
    console.log('✅ Connected to WNSP mesh network:', data.message);
    
    // Check if phone already registered (from localStorage)
    const savedPhone = localStorage.getItem('user_phone');
    if (savedPhone) {
        // Auto-login with saved phone
        socket.emit('register_phone', { phone_number: savedPhone });
    }
});

socket.on('phone_registered', (data) => {
    if (data.success) {
        userPhone = data.phone_number;
        localStorage.setItem('user_phone', userPhone);
        
        console.log('✅ Phone registered:', userPhone);
        
        // Show broadcast controls, hide phone login
        document.getElementById('phoneLogin').style.display = 'none';
        document.getElementById('broadcastControls').style.display = 'block';
        document.getElementById('userPhone').textContent = userPhone;
        
        // Load available broadcasts and friends
        loadActiveBroadcasts();
        loadFriends();
    } else {
        alert('Registration failed: ' + data.error);
    }
});

socket.on('broadcast_available', (data) => {
    console.log('📡 New broadcast available:', data.title);
    addBroadcastToList(data);
});

socket.on('broadcast_ended', (data) => {
    console.log('📹 Broadcast ended:', data.broadcaster_id);
    
    if (viewingBroadcast === data.broadcaster_id) {
        stopViewing();
        alert('Broadcast has ended');
    }
    
    removeBroadcastFromList(data.broadcaster_id);
});

socket.on('broadcast_started', (data) => {
    if (data.success) {
        broadcasterId = data.broadcaster_id;
        console.log('📹 Broadcasting started:', broadcasterId);
    }
});

socket.on('viewer_joined', (data) => {
    console.log('👁️ New viewer joined:', data.viewer_id);
    document.getElementById('viewerCount').textContent = data.viewer_count;
    
    // Create peer connection for new viewer
    createPeerConnectionForViewer(data.viewer_id);
});

socket.on('viewer_left', (data) => {
    console.log('👁️ Viewer left:', data.viewer_id);
    document.getElementById('viewerCount').textContent = data.viewer_count;
    
    // Clean up peer connection
    if (peerConnections[data.viewer_id]) {
        peerConnections[data.viewer_id].close();
        delete peerConnections[data.viewer_id];
    }
});

socket.on('joined_broadcast', (data) => {
    if (data.success) {
        console.log('✅ Joined broadcast:', data.title);
        viewingBroadcast = data.broadcaster_id;
    }
});

socket.on('webrtc_offer', async (data) => {
    console.log('🔗 Received WebRTC offer from:', data.from);
    
    // Viewer receiving offer from broadcaster
    if (!isBroadcasting) {
        await handleOfferAsViewer(data.from, data.offer);
    }
});

socket.on('webrtc_answer', async (data) => {
    console.log('🔗 Received WebRTC answer from:', data.from);
    
    // Broadcaster receiving answer from viewer
    if (isBroadcasting && peerConnections[data.from]) {
        const pc = peerConnections[data.from];
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

socket.on('webrtc_ice', async (data) => {
    console.log('🔗 Received ICE candidate from:', data.from);
    
    const pc = isBroadcasting ? peerConnections[data.from] : currentViewPeerConnection;
    
    if (pc && data.candidate) {
        try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
            console.error('Error adding ICE candidate:', e);
        }
    }
});

// ============================================================================
// FRIEND MANAGEMENT FUNCTIONS
// ============================================================================

async function loadFriends() {
    /**
     * Load user's friends from API for targeted streaming
     */
    const deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        console.log('⚠️ No device_id - cannot load friends');
        return;
    }
    
    try {
        const response = await fetch(`/api/friends?device_id=${deviceId}`);
        const data = await response.json();
        
        if (data.success && data.friends) {
            userFriends = data.friends;
            console.log(`✅ Loaded ${userFriends.length} friends`);
            renderFriendsList();
        } else {
            userFriends = [];
            renderFriendsList();
        }
    } catch (error) {
        console.error('❌ Failed to load friends:', error);
        userFriends = [];
        renderFriendsList();
    }
}

function renderFriendsList() {
    /**
     * Render friend checkboxes in the UI
     */
    const friendsList = document.getElementById('friendsList');
    
    if (userFriends.length === 0) {
        friendsList.innerHTML = `
            <p style="color: var(--text-secondary); font-size: 14px;">
                No friends added yet. Add friends from the main menu to stream privately.
            </p>
        `;
        return;
    }
    
    // Render checkboxes for each friend
    friendsList.innerHTML = userFriends.map(friend => `
        <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px;" 
               onmouseover="this.style.background='rgba(99, 102, 241, 0.1)'" 
               onmouseout="this.style.background='transparent'">
            <input type="checkbox" 
                   class="friend-checkbox" 
                   value="${friend.device_id || friend.contact}" 
                   style="margin-right: 10px; width: auto;">
            <div>
                <div style="font-weight: 500;">${friend.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${friend.contact}</div>
            </div>
        </label>
    `).join('');
}

function toggleFriendSelector() {
    /**
     * Show/hide friend selector based on privacy selection
     */
    const isPrivate = document.querySelector('input[name="streamPrivacy"]:checked').value === 'friends';
    const friendSelector = document.getElementById('friendSelector');
    
    if (isPrivate) {
        friendSelector.style.display = 'block';
        loadFriends(); // Load friends when switching to private mode
    } else {
        friendSelector.style.display = 'none';
    }
}

function getSelectedFriends() {
    /**
     * Get list of selected friend device_ids
     */
    const checkboxes = document.querySelectorAll('.friend-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// ============================================================================
// BROADCASTING FUNCTIONS
// ============================================================================

async function startBroadcast() {
    const title = document.getElementById('streamTitle').value || 'Untitled Stream';
    const category = document.getElementById('streamCategory').value;
    const isPublic = document.querySelector('input[name="streamPrivacy"]:checked').value === 'public';
    const selectedFriends = isPublic ? [] : getSelectedFriends();
    const deviceId = localStorage.getItem('device_id');
    
    if (!title.trim()) {
        alert('Please enter a stream title');
        return;
    }
    
    try {
        // Request camera and microphone permission
        console.log('🎥 Requesting camera/microphone access...');
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        console.log('✅ Camera access granted');
        
        // Display local video
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        document.getElementById('localVideoContainer').style.display = 'block';
        document.getElementById('localStreamTitle').textContent = title;
        
        // Update UI
        isBroadcasting = true;
        const broadcastBtn = document.getElementById('startBroadcastBtn');
        broadcastBtn.textContent = 'Stop Broadcast';
        broadcastBtn.classList.add('btn-stop-broadcast');
        broadcastBtn.onclick = stopBroadcast;
        
        // Validate friend selection for private streams
        if (!isPublic && selectedFriends.length === 0) {
            alert('Please select at least one friend for private streaming, or choose "Everyone (Public)"');
            stopBroadcast();
            return;
        }
        
        // Notify server with friend selection
        socket.emit('start_broadcast', { 
            title, 
            category,
            device_id: deviceId,  // Required for E=hf energy cost enforcement
            is_public: isPublic,
            allowed_friends: selectedFriends  // List of friend device_ids who can join
        });
        
        console.log(`📹 Starting ${isPublic ? 'PUBLIC' : 'PRIVATE'} broadcast${!isPublic ? ` for ${selectedFriends.length} friends` : ''}`);
        
    } catch (error) {
        console.error('❌ Camera access denied:', error);
        alert('Camera access denied. Please grant permission to start broadcasting.');
    }
}

async function stopBroadcast() {
    console.log('🛑 Stopping broadcast...');
    
    // Stop all tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    // Close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close());
    peerConnections = {};
    
    // Notify server
    socket.emit('stop_broadcast');
    
    // Update UI
    isBroadcasting = false;
    broadcasterId = null;
    document.getElementById('localVideoContainer').style.display = 'none';
    
    const broadcastBtn = document.getElementById('startBroadcastBtn');
    broadcastBtn.textContent = 'Start Live Broadcast';
    broadcastBtn.classList.remove('btn-stop-broadcast');
    broadcastBtn.onclick = startBroadcast;
    
    console.log('✅ Broadcast stopped');
}

async function createPeerConnectionForViewer(viewerId) {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections[viewerId] = pc;
    
    // Add local stream tracks to connection
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc_ice', {
                target: viewerId,
                candidate: event.candidate
            });
        }
    };
    
    // Create and send offer
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        socket.emit('webrtc_offer', {
            target: viewerId,
            offer: pc.localDescription
        });
        
        console.log('📤 Sent WebRTC offer to viewer:', viewerId);
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

// ============================================================================
// VIEWING FUNCTIONS
// ============================================================================

async function joinBroadcast(broadcasterId) {
    console.log('👁️ Joining broadcast:', broadcasterId);
    
    const deviceId = localStorage.getItem('device_id');
    
    // Notify server with device_id for friend permission check
    socket.emit('join_broadcast', { 
        broadcaster_id: broadcasterId,
        device_id: deviceId  // Required for friend-only stream permission check
    });
}

async function handleOfferAsViewer(broadcasterId, offer) {
    // Create peer connection
    const pc = new RTCPeerConnection(rtcConfig);
    currentViewPeerConnection = pc;
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('webrtc_ice', {
                target: broadcasterId,
                candidate: event.candidate
            });
        }
    };
    
    // Handle incoming stream
    pc.ontrack = (event) => {
        console.log('📺 Receiving broadcast stream');
        
        // Create or update video element for broadcast
        let remoteVideo = document.getElementById('remoteVideo');
        if (!remoteVideo) {
            const videoContainer = document.createElement('div');
            videoContainer.className = 'video-container';
            videoContainer.innerHTML = `
                <video id="remoteVideo" autoplay></video>
                <div class="video-overlay">
                    <div class="broadcast-status status-live">🔴 LIVE</div>
                    <div class="broadcast-title">Watching Broadcast</div>
                </div>
            `;
            document.getElementById('videoGrid').appendChild(videoContainer);
            remoteVideo = document.getElementById('remoteVideo');
        }
        
        remoteVideo.srcObject = event.streams[0];
    };
    
    // Set remote description and create answer
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit('webrtc_answer', {
            target: broadcasterId,
            answer: pc.localDescription
        });
        
        console.log('📤 Sent WebRTC answer to broadcaster');
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

function stopViewing() {
    if (currentViewPeerConnection) {
        currentViewPeerConnection.close();
        currentViewPeerConnection = null;
    }
    
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
        remoteVideo.parentElement.remove();
    }
    
    if (viewingBroadcast) {
        socket.emit('leave_broadcast');
        viewingBroadcast = null;
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

async function loadActiveBroadcasts() {
    try {
        const response = await fetch('/api/live/broadcasts');
        const data = await response.json();
        
        if (data.success && data.broadcasts.length > 0) {
            const listEl = document.getElementById('broadcastsList');
            listEl.innerHTML = '';
            
            data.broadcasts.forEach(broadcast => {
                addBroadcastToList(broadcast);
            });
        }
    } catch (error) {
        console.error('Error loading broadcasts:', error);
    }
}

function addBroadcastToList(broadcast) {
    const listEl = document.getElementById('broadcastsList');
    
    // Remove "no broadcasts" message if present
    if (listEl.querySelector('p')) {
        listEl.innerHTML = '';
    }
    
    // Check if already exists
    if (document.getElementById(`broadcast-${broadcast.broadcaster_id}`)) {
        return;
    }
    
    const categoryIcons = {
        'university': '🎓',
        'refugee': '🏠',
        'rural': '🌾',
        'crisis': '🚨'
    };
    
    const card = document.createElement('div');
    card.className = 'broadcast-card';
    card.id = `broadcast-${broadcast.broadcaster_id}`;
    card.onclick = () => joinBroadcast(broadcast.broadcaster_id);
    
    card.innerHTML = `
        <div class="broadcast-title">${broadcast.title}</div>
        <div class="broadcast-meta">
            ${categoryIcons[broadcast.category] || '📹'} ${broadcast.category} • 
            <span style="color: var(--error);">🔴 LIVE</span> • 
            ${broadcast.viewer_count || 0} watching
        </div>
    `;
    
    listEl.appendChild(card);
}

function removeBroadcastFromList(broadcasterId) {
    const card = document.getElementById(`broadcast-${broadcasterId}`);
    if (card) {
        card.remove();
    }
    
    // Show "no broadcasts" message if list is empty
    const listEl = document.getElementById('broadcastsList');
    if (listEl.children.length === 0) {
        listEl.innerHTML = '<p style="color: var(--text-secondary);">No active broadcasts. Start broadcasting to appear here.</p>';
    }
}

// Initialize
console.log('🌐 WNSP LiveStream initialized');
