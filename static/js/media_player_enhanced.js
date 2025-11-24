// WNSP Media Player - Enhanced with Backend Integration and Functional Controls
// GPL v3.0 License

// Global State
let mediaLibrary = [];
let currentCategory = 'all';
let currentMedia = null;
let audioPlaylist = [];
let currentAudioIndex = 0;
let isShuffleOn = false;
let isRepeatOn = false;
let isDraggingProgress = false;

// DOM Elements
let mediaGrid, searchInput, categoryButtons, nowPlayingSection;
let videoPlayerWrapper, audioPlayerWrapper, documentViewerWrapper;
let videoPlayer, audioPlayer;
let playPauseBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn;
let progressBar, progressFill, currentTimeEl, durationEl, volumeSlider;

// Initialize App
function init() {
    // Cache DOM elements
    cacheDOM();
    
    // Load media from backend
    loadMediaLibrary();
    
    // Attach event listeners
    attachEventListeners();
    
    // Update network stats
    updateNetworkStats();
}

// Cache DOM Elements
function cacheDOM() {
    mediaGrid = document.getElementById('mediaGrid');
    searchInput = document.getElementById('searchInput');
    categoryButtons = document.querySelectorAll('.category-btn');
    nowPlayingSection = document.getElementById('nowPlayingSection');
    
    videoPlayerWrapper = document.getElementById('videoPlayerWrapper');
    audioPlayerWrapper = document.getElementById('audioPlayerWrapper');
    documentViewerWrapper = document.getElementById('documentViewerWrapper');
    
    videoPlayer = document.getElementById('videoPlayer');
    audioPlayer = document.getElementById('audioPlayer');
    
    playPauseBtn = document.getElementById('playPauseBtn');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    shuffleBtn = document.getElementById('shuffleBtn');
    repeatBtn = document.getElementById('repeatBtn');
    
    progressBar = document.getElementById('progressBar');
    progressFill = document.getElementById('progressFill');
    currentTimeEl = document.getElementById('currentTime');
    durationEl = document.getElementById('duration');
    volumeSlider = document.getElementById('volumeSlider');
}

// Load Media Library from Backend
async function loadMediaLibrary() {
    try {
        const response = await fetch('/api/media/library');
        const data = await response.json();
        
        if (data.success && data.data) {
            // Backend is available - use real data
            mediaLibrary = convertBackendDataToFrontend(data.data);
            console.log('✅ Loaded media from WNSP backend');
        } else {
            // Backend unavailable - use fallback data
            mediaLibrary = getFallbackMediaLibrary();
            console.log('⚠️  Using fallback media library');
        }
    } catch (error) {
        // API error - use fallback
        console.warn('Backend API unavailable, using fallback:', error);
        mediaLibrary = getFallbackMediaLibrary();
    }
    
    renderMediaGrid();
}

// Convert backend data format to frontend format
function convertBackendDataToFrontend(backendData) {
    // Transform backend media library format to frontend format
    const converted = [];
    
    for (const category in backendData) {
        if (Array.isArray(backendData[category])) {
            backendData[category].forEach(item => {
                converted.push({
                    id: item.id || `media_${Date.now()}_${Math.random()}`,
                    category: category.toLowerCase(),
                    type: item.type || 'document',
                    title: item.title || item.filename || 'Untitled',
                    artist: item.artist || 'Unknown',
                    description: item.description || '',
                    size: item.size || 0,
                    duration: item.duration || 'Unknown',
                    thumbnail: getCategoryEmoji(category),
                    energyCost: item.energyCost || 0,
                    cached: item.cached || false,
                    url: item.url || '#'
                });
            });
        }
    }
    
    return converted.length > 0 ? converted : getFallbackMediaLibrary();
}

// Get emoji for category
function getCategoryEmoji(category) {
    const emojis = {
        'university': '🎓',
        'refugee': '🏕️',
        'rural': '🌾',
        'crisis': '🚨'
    };
    return emojis[category.toLowerCase()] || '📦';
}

// Fallback Media Library (embedded demo data)
function getFallbackMediaLibrary() {
    return [
        // University
        {
            id: 'univ_001',
            category: 'university',
            type: 'video',
            title: 'Quantum Mechanics Lecture 1',
            artist: 'Prof. Sarah Chen',
            description: 'Introduction to wave-particle duality and the foundations of quantum mechanics',
            size: 245.5,
            duration: '01:32:15',
            thumbnail: '🎓',
            energyCost: 0.0245,
            cached: true,
            url: 'demo' // Demo placeholder
        },
        {
            id: 'univ_002',
            category: 'university',
            type: 'audio',
            title: 'Physics of Blockchain',
            artist: 'Dr. James Liu',
            description: 'Audio lecture on thermodynamics applied to distributed systems',
            size: 48.3,
            duration: '45:20',
            thumbnail: '🎵',
            energyCost: 0.0048,
            cached: true,
            url: 'demo'
        },
        {
            id: 'univ_003',
            category: 'university',
            type: 'document',
            title: 'Advanced Mathematics Textbook',
            artist: 'MIT OpenCourseWare',
            description: 'Complete calculus and linear algebra reference',
            size: 12.8,
            duration: 'PDF',
            thumbnail: '📘',
            energyCost: 0.0013,
            cached: false,
            url: 'demo'
        },
        // Refugee
        {
            id: 'ref_001',
            category: 'refugee',
            type: 'document',
            title: 'Legal Rights Guide',
            artist: 'UNHCR',
            description: 'Know your rights: asylum, documentation, and legal assistance',
            size: 8.4,
            duration: 'PDF',
            thumbnail: '⚖️',
            energyCost: 0.0008,
            cached: true,
            url: 'demo'
        },
        {
            id: 'ref_002',
            category: 'refugee',
            type: 'audio',
            title: 'Basic English Lessons',
            artist: 'Language Support Network',
            description: 'Essential English phrases for daily communication',
            size: 35.6,
            duration: '38:12',
            thumbnail: '🗣️',
            energyCost: 0.0036,
            cached: true,
            url: 'demo'
        },
        // Rural
        {
            id: 'rural_001',
            category: 'rural',
            type: 'video',
            title: 'Sustainable Farming Techniques',
            artist: 'Agricultural Extension Service',
            description: 'Modern crop rotation and soil management methods',
            size: 312.7,
            duration: '56:30',
            thumbnail: '🌱',
            energyCost: 0.0313,
            cached: true,
            url: 'demo'
        },
        {
            id: 'rural_002',
            category: 'rural',
            type: 'document',
            title: 'Community Health Guide',
            artist: 'WHO Rural Health Initiative',
            description: 'Disease prevention and basic healthcare practices',
            size: 6.9,
            duration: 'PDF',
            thumbnail: '💊',
            energyCost: 0.0007,
            cached: true,
            url: 'demo'
        },
        // Crisis
        {
            id: 'crisis_001',
            category: 'crisis',
            type: 'document',
            title: 'Emergency Evacuation Plan',
            artist: 'Emergency Management Agency',
            description: 'Evacuation routes and assembly point locations',
            size: 3.8,
            duration: 'PDF',
            thumbnail: '🚨',
            energyCost: 0.0004,
            cached: true,
            url: 'demo'
        },
        {
            id: 'crisis_002',
            category: 'crisis',
            type: 'audio',
            title: 'Crisis Alert Broadcast',
            artist: 'Civil Defense',
            description: 'Emergency alert system test and instructions',
            size: 8.7,
            duration: '12:30',
            thumbnail: '📡',
            energyCost: 0.0009,
            cached: true,
            url: 'demo'
        }
    ];
}

// Render Media Grid
function renderMediaGrid(filter = currentCategory, searchTerm = '') {
    if (!mediaGrid) return;
    
    mediaGrid.innerHTML = '';
    
    let filteredMedia = mediaLibrary;
    
    // Category filter
    if (filter !== 'all') {
        filteredMedia = filteredMedia.filter(item => item.category === filter);
    }
    
    // Search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredMedia = filteredMedia.filter(item =>
            item.title.toLowerCase().includes(term) ||
            item.description.toLowerCase().includes(term) ||
            item.artist.toLowerCase().includes(term)
        );
    }
    
    // Render cards
    filteredMedia.forEach(media => {
        const card = createMediaCard(media);
        mediaGrid.appendChild(card);
    });
    
    // Show message if no results
    if (filteredMedia.length === 0) {
        mediaGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No content found</p>';
    }
}

// Create Media Card
function createMediaCard(media) {
    const card = document.createElement('div');
    card.className = 'media-card';
    card.onclick = () => playMedia(media);
    
    const typeEmoji = media.type === 'video' ? '▶️' : media.type === 'audio' ? '🎵' : '📄';
    const typeLabel = media.type.charAt(0).toUpperCase() + media.type.slice(1);
    
    card.innerHTML = `
        <div class="media-thumbnail">
            ${media.thumbnail}
            <span class="media-type-badge">${typeEmoji} ${typeLabel}</span>
        </div>
        <div class="media-content">
            <h3 class="media-title">${media.title}</h3>
            <div class="media-meta">
                <span>👤 ${media.artist}</span>
                ${media.duration !== 'PDF' ? `<span>⏱️ ${media.duration}</span>` : ''}
            </div>
            <p class="media-description">${media.description}</p>
            <div class="media-footer">
                <div class="cache-status">
                    ${media.cached ? '✅ Cached' : '⬇️ Download'}
                </div>
                <div class="energy-cost">
                    ⚡ ${media.energyCost.toFixed(4)} NXT
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Play Media
function playMedia(media) {
    currentMedia = media;
    nowPlayingSection.style.display = 'block';
    nowPlayingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Hide all players
    videoPlayerWrapper.style.display = 'none';
    audioPlayerWrapper.style.display = 'none';
    documentViewerWrapper.style.display = 'none';
    
    if (media.type === 'video') {
        playVideo(media);
    } else if (media.type === 'audio') {
        playAudio(media);
    } else if (media.type === 'document') {
        viewDocument(media);
    }
    
    updateNetworkStats();
}

// Play Video
function playVideo(media) {
    videoPlayerWrapper.style.display = 'block';
    document.getElementById('videoTitle').textContent = media.title;
    document.getElementById('videoMeta').textContent = `${media.artist} • ${media.duration} • ${media.size} MB`;
    
    // Set video source from backend URL or fallback
    if (media.url && media.url !== 'demo' && media.url !== '#') {
        videoPlayer.src = media.url;
        videoPlayer.load();
    } else {
        // Fallback: Show placeholder poster
        videoPlayer.poster = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect fill="%23252540" width="800" height="450"/><text x="50%" y="45%" fill="%2394a3b8" text-anchor="middle" font-family="Arial" font-size="20">${encodeURIComponent(media.thumbnail + ' ' + media.title)}</text><text x="50%" y="55%" fill="%236366f1" text-anchor="middle" font-family="Arial" font-size="14">No video source available</text><text x="50%" y="65%" fill="%2394a3b8" text-anchor="middle" font-family="Arial" font-size="12">Energy cost: ${media.energyCost} NXT</text></svg>`;
    }
}

// Play Audio
function playAudio(media) {
    audioPlayerWrapper.style.display = 'block';
    document.getElementById('audioTitle').textContent = media.title;
    document.getElementById('audioArtist').textContent = media.artist;
    document.getElementById('coverArt').textContent = media.thumbnail;
    
    // Build playlist from current category
    audioPlaylist = mediaLibrary.filter(item => item.type === 'audio' && item.category === media.category);
    currentAudioIndex = audioPlaylist.findIndex(item => item.id === media.id);
    
    // Load actual audio from backend URL
    if (media.url && media.url !== 'demo' && media.url !== '#') {
        audioPlayer.src = media.url;
        audioPlayer.load();
        playPauseBtn.textContent = '▶️';
    } else {
        playPauseBtn.textContent = '▶️';
        console.warn('No audio source available for:', media.title);
    }
}

// View Document
function viewDocument(media) {
    documentViewerWrapper.style.display = 'block';
    document.getElementById('documentTitle').textContent = media.title;
    document.getElementById('documentMeta').textContent = `${media.artist} • ${media.size} MB`;
    
    const viewer = document.getElementById('documentViewer');
    
    // Load actual document from backend URL
    if (media.url && media.url !== 'demo' && media.url !== '#') {
        // For PDF files, use the streaming URL directly
        viewer.src = media.url;
    } else {
        // Fallback: Show placeholder message
        viewer.srcdoc = `
            <html>
            <body style="margin: 0; padding: 40px; font-family: Arial; background: #f5f5f5; color: #333;">
                <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h1 style="color: #6366f1; margin-bottom: 20px;">${media.thumbnail} ${media.title}</h1>
                    <p style="color: #666; margin-bottom: 30px;"><strong>Author:</strong> ${media.artist}</p>
                    <hr style="border: none; border-top: 2px solid #eee; margin: 30px 0;">
                    <p style="line-height: 1.8; color: #444;">${media.description}</p>
                    <div style="margin-top: 40px; padding: 20px; background: #f8f9ff; border-left: 4px solid #6366f1; border-radius: 4px;">
                        <p style="margin: 0; color: #6366f1; font-weight: bold;">📡 WNSP Network Status</p>
                        <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Document source not available. Energy cost: ${media.energyCost} NXT</p>
                    </div>
                    <div style="margin-top: 30px; text-align: center; color: #999; font-size: 14px;">
                        <p>GPL v3.0 License • Community Knowledge Network</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

// Audio Player Controls
function togglePlayPause() {
    if (!audioPlayer.src || audioPlayer.src === window.location.href) {
        alert('Demo mode: No actual audio file loaded. In production, this would play audio from the WNSP mesh network.');
        return;
    }
    
    if (audioPlayer.paused) {
        audioPlayer.play();
        playPauseBtn.textContent = '⏸️';
    } else {
        audioPlayer.pause();
        playPauseBtn.textContent = '▶️';
    }
}

function playPrevious() {
    if (currentAudioIndex > 0) {
        currentAudioIndex--;
        playAudio(audioPlaylist[currentAudioIndex]);
    }
}

function playNext() {
    if (isShuffleOn) {
        currentAudioIndex = Math.floor(Math.random() * audioPlaylist.length);
    } else if (currentAudioIndex < audioPlaylist.length - 1) {
        currentAudioIndex++;
    } else if (isRepeatOn) {
        currentAudioIndex = 0;
    } else {
        return; // End of playlist
    }
    
    if (audioPlaylist[currentAudioIndex]) {
        playAudio(audioPlaylist[currentAudioIndex]);
    }
}

function toggleShuffle() {
    isShuffleOn = !isShuffleOn;
    shuffleBtn.style.color = isShuffleOn ? 'var(--primary-color)' : 'var(--text-primary)';
}

function toggleRepeat() {
    isRepeatOn = !isRepeatOn;
    repeatBtn.style.color = isRepeatOn ? 'var(--primary-color)' : 'var(--text-primary)';
}

function updateProgress() {
    if (!isDraggingProgress && !isNaN(audioPlayer.duration)) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        durationEl.textContent = formatTime(audioPlayer.duration);
    }
}

function seekAudio(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioPlayer.currentTime = percent * audioPlayer.duration;
    updateProgress();
}

function updateVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
}

function formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Category Filter
function filterByCategory(category) {
    currentCategory = category;
    renderMediaGrid(category, searchInput ? searchInput.value : '');
    
    // Update active button
    categoryButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
}

// Search
function handleSearch() {
    if (searchInput) {
        renderMediaGrid(currentCategory, searchInput.value);
    }
}

// Update Network Stats
async function updateNetworkStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.success && data.data) {
            const stats = data.data;
            document.getElementById('cacheSize').textContent = `${(stats.total_files * 50 / 1024).toFixed(1)} MB`;
            document.getElementById('energySpent').textContent = stats.total_energy_spent_nxt.toFixed(4);
            document.getElementById('propagations').textContent = stats.total_propagations || 0;
            document.getElementById('cacheHitRate').textContent = `${stats.cache_hit_rate || 0}%`;
        } else {
            // Fallback to local calculation
            updateLocalStats();
        }
    } catch (error) {
        // API error - use local calculation
        updateLocalStats();
    }
}

function updateLocalStats() {
    const totalCached = mediaLibrary.filter(m => m.cached).length;
    const totalSize = mediaLibrary.reduce((sum, m) => sum + (m.cached ? m.size : 0), 0);
    const totalEnergy = mediaLibrary.reduce((sum, m) => sum + (m.cached ? m.energyCost : 0), 0);
    const cacheHitRate = mediaLibrary.length > 0 ? Math.round((totalCached / mediaLibrary.length) * 100) : 0;
    
    document.getElementById('cacheSize').textContent = `${totalSize.toFixed(1)} MB`;
    document.getElementById('energySpent').textContent = totalEnergy.toFixed(4);
    document.getElementById('propagations').textContent = totalCached * 3;
    document.getElementById('cacheHitRate').textContent = `${cacheHitRate}%`;
}

// Upload Modal Functions
const uploadModal = document.getElementById('uploadModal');
const uploadBtn = document.getElementById('uploadBtn');
const closeUploadModal = document.getElementById('closeUploadModal');
const uploadDropZone = document.getElementById('uploadDropZone');
const fileInput = document.getElementById('fileInput');
const uploadCategory = document.getElementById('uploadCategory');
const uploadProgress = document.getElementById('uploadProgress');
const uploadProgressFill = document.getElementById('uploadProgressFill');
const uploadProgressText = document.getElementById('uploadProgressText');
const uploadStatus = document.getElementById('uploadStatus');

function openUploadModal() {
    uploadModal.style.display = 'flex';
    uploadStatus.textContent = '';
    uploadStatus.className = 'upload-status';
    uploadProgress.style.display = 'none';
}

function closeUploadModalFunc() {
    uploadModal.style.display = 'none';
}

function handleFileSelect(files) {
    console.log('📤 handleFileSelect called with files:', files);
    if (!files || files.length === 0) {
        console.warn('⚠️ No files provided');
        return;
    }
    
    const formData = new FormData();
    const category = uploadCategory.value;
    let validFileCount = 0;
    let hasErrors = false;
    
    console.log(`📂 Processing ${files.length} file(s) for category: ${category}`);
    
    Array.from(files).forEach(file => {
        // Validate file type
        const validTypes = ['audio/mpeg', 'video/mp4', 'application/pdf'];
        const validExts = ['.mp3', '.mp4', '.pdf'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validExts.includes(fileExt)) {
            showUploadStatus(`Invalid file type: ${file.name}. Only MP3, MP4, PDF allowed.`, 'error');
            hasErrors = true;
            return;
        }
        
        // Validate file size (max 100MB)
        if (file.size > 100 * 1024 * 1024) {
            showUploadStatus(`File too large: ${file.name}. Max 100MB allowed.`, 'error');
            hasErrors = true;
            return;
        }
        
        formData.append('files', file);
        validFileCount++;
        console.log(`✅ Valid file added: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Don't upload if no valid files
    if (validFileCount === 0) {
        console.error('❌ No valid files to upload');
        if (!hasErrors) {
            showUploadStatus('No valid files to upload', 'error');
        }
        return;
    }
    
    formData.append('category', category);
    console.log(`🚀 Starting upload of ${validFileCount} file(s) to /api/upload`);
    
    // Show progress
    uploadProgress.style.display = 'block';
    uploadProgressFill.style.width = '0%';
    uploadProgressText.textContent = 'Uploading to WNSP network...';
    
    // Upload to server
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            uploadProgressFill.style.width = percentComplete + '%';
            uploadProgressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
        }
    });
    
    xhr.addEventListener('load', () => {
        uploadProgress.style.display = 'none';
        
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            
            // Check for partial failures
            if (response.errors && response.errors.length > 0) {
                const errorMsg = `⚠️ Uploaded ${response.uploaded} file(s), but ${response.errors.length} failed:\n\n${response.errors.join('\n')}`;
                showUploadStatus(errorMsg, 'error');
                
                // Refresh library but keep modal open for user to see errors
                if (response.uploaded > 0) {
                    loadMediaLibrary();
                }
            } else {
                showUploadStatus(`✅ Successfully uploaded ${response.uploaded} file(s) to ${category} community!`, 'success');
                
                // Refresh media library and close modal after success
                setTimeout(() => {
                    loadMediaLibrary();
                    closeUploadModalFunc();
                }, 2000);
            }
        } else {
            try {
                const response = JSON.parse(xhr.responseText);
                showUploadStatus(`❌ Upload failed: ${response.error || xhr.statusText}`, 'error');
            } catch {
                showUploadStatus(`❌ Upload failed: ${xhr.statusText}`, 'error');
            }
        }
    });
    
    xhr.addEventListener('error', () => {
        showUploadStatus('❌ Network error during upload', 'error');
        uploadProgress.style.display = 'none';
    });
    
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
}

function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
}

// Attach Event Listeners
function attachEventListeners() {
    // Category buttons
    if (categoryButtons) {
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => filterByCategory(btn.dataset.category));
        });
    }
    
    // Search
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    // Upload modal
    if (uploadBtn) {
        uploadBtn.addEventListener('click', openUploadModal);
    }
    
    if (closeUploadModal) {
        closeUploadModal.addEventListener('click', closeUploadModalFunc);
    }
    
    if (uploadModal) {
        uploadModal.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                closeUploadModalFunc();
            }
        });
    }
    
    if (uploadDropZone) {
        uploadDropZone.addEventListener('click', () => fileInput.click());
        
        uploadDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadDropZone.classList.add('drag-over');
        });
        
        uploadDropZone.addEventListener('dragleave', () => {
            uploadDropZone.classList.remove('drag-over');
        });
        
        uploadDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadDropZone.classList.remove('drag-over');
            handleFileSelect(e.dataTransfer.files);
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e.target.files);
            // Reset file input so the same file can be selected again
            e.target.value = '';
        });
    }
    
    // Audio controls
    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);
    if (prevBtn) prevBtn.addEventListener('click', playPrevious);
    if (nextBtn) nextBtn.addEventListener('click', playNext);
    if (shuffleBtn) shuffleBtn.addEventListener('click', toggleShuffle);
    if (repeatBtn) repeatBtn.addEventListener('click', toggleRepeat);
    if (volumeSlider) volumeSlider.addEventListener('input', updateVolume);
    
    // Progress bar
    if (progressBar) {
        progressBar.addEventListener('click', seekAudio);
        progressBar.addEventListener('mousedown', () => { isDraggingProgress = true; });
        document.addEventListener('mouseup', () => { isDraggingProgress = false; });
    }
    
    // Audio player events
    if (audioPlayer) {
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', playNext);
        audioPlayer.addEventListener('loadedmetadata', updateProgress);
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
