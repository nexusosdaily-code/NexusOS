/**
 * NexusOS PWA Application
 * 
 * Handles offline-first functionality, service worker registration,
 * and mobile-optimized interactions for iOS Safari.
 */

const API_BASE = '/api';
let isOnline = navigator.onLine;
let swRegistration = null;

async function initApp() {
  console.log('[App] Initializing NexusOS PWA');
  
  updateConnectionStatus();
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  if ('serviceWorker' in navigator) {
    await registerServiceWorker();
  }
  
  await loadInitialData();
}

async function registerServiceWorker() {
  try {
    swRegistration = await navigator.serviceWorker.register('/static/sw.js');
    console.log('[App] Service Worker registered');
    
    swRegistration.addEventListener('updatefound', () => {
      console.log('[App] Service Worker update found');
    });
  } catch (error) {
    console.error('[App] Service Worker registration failed:', error);
  }
}

function updateConnectionStatus() {
  const statusEl = document.querySelector('.connection-status');
  if (statusEl) {
    if (isOnline) {
      statusEl.classList.remove('offline');
      statusEl.querySelector('.status-text').textContent = 'Connected';
    } else {
      statusEl.classList.add('offline');
      statusEl.querySelector('.status-text').textContent = 'Offline';
    }
  }
  
  const banner = document.querySelector('.offline-banner');
  if (banner) {
    banner.style.display = isOnline ? 'none' : 'block';
  }
}

function handleOnline() {
  console.log('[App] Back online');
  isOnline = true;
  updateConnectionStatus();
  syncOfflineQueue();
  showToast('Back online - syncing data...');
}

function handleOffline() {
  console.log('[App] Gone offline');
  isOnline = false;
  updateConnectionStatus();
  showToast('Offline mode - changes will sync when connected');
}

async function syncOfflineQueue() {
  if (!swRegistration) return;
  
  const messageChannel = new MessageChannel();
  
  return new Promise((resolve) => {
    messageChannel.port1.onmessage = (event) => {
      console.log('[App] Sync result:', event.data);
      if (event.data.processed > 0) {
        showToast(`Synced ${event.data.processed} pending items`);
      }
      resolve(event.data);
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'SYNC_NOW' },
      [messageChannel.port2]
    );
  });
}

async function getQueueStatus() {
  if (!swRegistration) return { pending: 0, items: [] };
  
  const messageChannel = new MessageChannel();
  
  return new Promise((resolve) => {
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_QUEUE_STATUS' },
      [messageChannel.port2]
    );
  });
}

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (data._cached) {
      showToast('Showing cached data');
    }
    
    return data;
  } catch (error) {
    console.error('[App] API call failed:', error);
    throw error;
  }
}

async function loadInitialData() {
  try {
    const status = await apiCall('/status');
    console.log('[App] API Status:', status);
    updateDashboard(status);
  } catch (error) {
    console.log('[App] Using cached data');
  }
}

function updateDashboard(data) {
  const walletCount = document.querySelector('[data-stat="wallets"]');
  if (walletCount) walletCount.textContent = data.wallets_registered || 0;
  
  const memberCount = document.querySelector('[data-stat="members"]');
  if (memberCount) memberCount.textContent = data.members_enrolled || 0;
  
  const meshNodes = document.querySelector('[data-stat="mesh-nodes"]');
  if (meshNodes) meshNodes.textContent = data.mesh_nodes || 0;
}

async function createWallet(deviceId, communityId) {
  return apiCall('/wallet/create', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      community_id: communityId
    })
  });
}

async function getWalletBalance(walletId) {
  return apiCall(`/wallet/${walletId}/balance`);
}

async function getBHLSStatus(memberId) {
  return apiCall(`/bhls/status/${memberId}`);
}

async function enrollBHLS(memberId, name, age, communityId) {
  return apiCall(`/bhls/enroll?member_id=${memberId}&name=${name}&age=${age}&community_id=${communityId}`, {
    method: 'POST'
  });
}

async function registerMeshDevice(deviceId, communityId, lat, lon) {
  return apiCall('/mesh/register', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      community_id: communityId,
      latitude: lat,
      longitude: lon
    })
  });
}

async function sendMeshMessage(sourceDevice, destination, payload, priority = 4) {
  return apiCall(`/mesh/send?source_device=${sourceDevice}`, {
    method: 'POST',
    body: JSON.stringify({
      destination: destination,
      payload: payload,
      priority: priority,
      payload_type: 'text'
    })
  });
}

async function syncMeshMessages(deviceId) {
  return apiCall('/mesh/sync', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId
    })
  });
}

async function getHealthPrograms() {
  return apiCall('/health/programs');
}

function showToast(message, duration = 3000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-card);
    color: var(--text-primary);
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 1000;
    border: 1px solid var(--border-color);
    animation: fadeIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function generateDeviceId() {
  let deviceId = localStorage.getItem('nexus_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 16);
    localStorage.setItem('nexus_device_id', deviceId);
  }
  return deviceId;
}

function getStoredWallet() {
  return localStorage.getItem('nexus_wallet_id');
}

function storeWallet(walletId) {
  localStorage.setItem('nexus_wallet_id', walletId);
}

async function getDEXPools() {
  return apiCall('/dex/pools');
}

async function getDEXQuote(poolId, tokenIn, amountIn) {
  return apiCall(`/dex/quote?pool_id=${poolId}&token_in=${tokenIn}&amount_in=${amountIn}`, {
    method: 'POST'
  });
}

async function executeDEXSwap(poolId, walletId, tokenIn, amountIn) {
  return apiCall(`/dex/swap?pool_id=${poolId}&wallet_id=${walletId}&token_in=${tokenIn}&amount_in=${amountIn}`, {
    method: 'POST'
  });
}

async function getConstitution() {
  return apiCall('/governance/constitution');
}

async function getProposals() {
  return apiCall('/governance/proposals');
}

async function createProposal(proposerId, title, description, authorityLevel = 'ZEPTO') {
  return apiCall(`/governance/propose?proposer_id=${proposerId}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&authority_level=${authorityLevel}`, {
    method: 'POST'
  });
}

async function voteOnProposal(proposalId, voterId, vote, stake = 1.0) {
  return apiCall(`/governance/vote?proposal_id=${proposalId}&voter_id=${voterId}&vote=${vote}&stake=${stake}`, {
    method: 'POST'
  });
}

async function getSectors() {
  return apiCall('/sectors');
}

async function getCurriculumStats() {
  return apiCall('/curriculum/stats');
}

async function getCurriculumGrades() {
  return apiCall('/curriculum/grades');
}

async function getLambdaPhysics() {
  return apiCall('/physics/lambda');
}

async function getSystemReadiness() {
  return apiCall('/system/readiness');
}

window.NexusOS = {
  init: initApp,
  api: apiCall,
  wallet: {
    create: createWallet,
    getBalance: getWalletBalance,
    getStored: getStoredWallet,
    store: storeWallet
  },
  bhls: {
    getStatus: getBHLSStatus,
    enroll: enrollBHLS
  },
  mesh: {
    register: registerMeshDevice,
    send: sendMeshMessage,
    sync: syncMeshMessages
  },
  health: {
    getPrograms: getHealthPrograms
  },
  dex: {
    getPools: getDEXPools,
    getQuote: getDEXQuote,
    swap: executeDEXSwap
  },
  governance: {
    getConstitution,
    getProposals,
    propose: createProposal,
    vote: voteOnProposal
  },
  sectors: {
    list: getSectors
  },
  curriculum: {
    getStats: getCurriculumStats,
    getGrades: getCurriculumGrades
  },
  physics: {
    getLambda: getLambdaPhysics
  },
  system: {
    getReadiness: getSystemReadiness
  },
  utils: {
    generateDeviceId,
    showToast,
    syncQueue: syncOfflineQueue,
    getQueueStatus
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
