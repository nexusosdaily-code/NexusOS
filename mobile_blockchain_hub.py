"""
NexusOS Mobile Blockchain Hub
==============================

Unified mobile-first blockchain interface integrating all core blockchain modules:
- Web3 Wallet (Central Hub)
- Mobile DAG Messaging
- Blockchain Explorer
- DEX (Swap & Liquidity)
- Validator Economics
- Wavelength Economics
- GhostDAG System
- Proof of Spectrum
- Nexus Consensus
- Civic Governance
- Mobile Connectivity
- Offline Mesh Network

**Design Philosophy:** Your phone IS the blockchain node!
"""

import streamlit as st
from typing import Dict, Optional
import time

# Import all blockchain modules
from nexus_native_wallet import NexusNativeWallet
from web3_wallet_dashboard import (
    render_home_tab, render_create_wallet_tab, render_unlock_wallet_tab,
    render_send_nxt_tab, render_send_message_tab, render_history_tab,
    init_wallet_session
)
from mobile_dag_messaging import render_mobile_dag_messaging
from blockchain_viz import render_blockchain_dashboard
from dex_page import render_dex_page
from validator_economics_page import render_validator_economics_page
from wavelength_economics_dashboard import render_wavelength_economics_dashboard
from ghostdag_page import render_ghostdag_system
from proof_of_spectrum_page import render_proof_of_spectrum
from nexus_consensus_dashboard import render_nexus_consensus_dashboard
from civic_governance_dashboard import main as civic_governance_main
from mobile_connectivity_dashboard import show_mobile_connectivity_dashboard
from offline_mesh_dashboard import render_offline_mesh_dashboard


def render_mobile_blockchain_hub():
    """
    Main Mobile Blockchain Hub - Unified interface for all blockchain operations
    """
    
    # Initialize wallet session
    init_wallet_session()
    wallet = st.session_state.nexus_wallet
    
    # Mobile-optimized CSS
    st.markdown("""
        <style>
        /* Mobile-first responsive design */
        .main-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            border-radius: 10px;
            color: white;
            text-align: center;
            margin-bottom: 20px;
        }
        
        /* Wallet status bar */
        .wallet-status {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        /* Mobile-friendly touch targets */
        button, a, img, [data-testid="stSelectbox"], 
        [data-testid="stExpander"], .stButton, select, 
        [data-testid="stTab"], input, textarea {
            cursor: pointer !important;
        }
        
        input, textarea, select {
            font-size: 16px !important;
            padding: 12px !important;
            min-height: 48px !important;
        }
        
        button, [data-testid="stButton"] button {
            font-size: 16px !important;
            padding: 12px 24px !important;
            min-height: 48px !important;
        }
        
        /* Tab styling */
        [data-testid="stTabs"] {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 10px;
        }
        
        @media (max-width: 768px) {
            input, textarea, select {
                font-size: 18px !important;
                padding: 14px !important;
                min-height: 52px !important;
            }
            
            button, [data-testid="stButton"] button {
                font-size: 18px !important;
                padding: 14px 28px !important;
                min-height: 52px !important;
            }
        }
        
        /* Hover effects */
        button:hover, [data-testid="stButton"]:hover {
            transform: translateY(-2px);
            transition: all 0.2s ease;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Main header
    st.markdown("""
        <div class="main-header">
            <h1>📱 NexusOS Blockchain Hub</h1>
            <p>Your Phone IS the Blockchain Node</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Wallet status bar (always visible)
    if st.session_state.active_address:
        balance = wallet.get_balance(st.session_state.active_address)
        col1, col2, col3 = st.columns([3, 2, 1])
        with col1:
            st.success(f"🔓 **Active:** `{st.session_state.active_address[:16]}...`")
        with col2:
            st.metric("💰 Balance", f"{balance['balance_nxt']:.2f} NXT")
        with col3:
            if st.button("🔒"):
                st.session_state.wallet_unlocked = None
                st.session_state.active_address = None
                st.rerun()
    else:
        st.info("🔐 **Wallet locked** - Unlock or create a wallet to access blockchain features")
    
    st.divider()
    
    # Mobile-style bottom navigation (using tabs)
    selected_module = st.radio(
        "**Navigate:**",
        [
            "💎 Wallet",
            "📨 Messaging", 
            "🔗 Explorer",
            "💱 DEX",
            "🏛️ Validators",
            "⚛️ Wavelength",
            "🌐 Network",
            "🗳️ Governance",
            "🔌 Connectivity"
        ],
        horizontal=True,
        label_visibility="collapsed"
    )
    
    st.divider()
    
    # Render selected module
    if selected_module == "💎 Wallet":
        render_wallet_module(wallet)
    
    elif selected_module == "📨 Messaging":
        st.subheader("📨 Mobile DAG Messaging")
        st.caption("Blockchain-powered quantum messaging with E=hf physics pricing")
        render_mobile_dag_messaging()
    
    elif selected_module == "🔗 Explorer":
        st.subheader("🔗 Blockchain Explorer")
        st.caption("Live block and transaction visualization")
        render_blockchain_dashboard()
    
    elif selected_module == "💱 DEX":
        st.subheader("💱 Decentralized Exchange")
        st.caption("Swap tokens, provide liquidity, earn fees")
        render_dex_page()
    
    elif selected_module == "🏛️ Validators":
        st.subheader("🏛️ Validator Economics")
        st.caption("Stake, delegate, earn rewards")
        render_validator_economics_page()
    
    elif selected_module == "⚛️ Wavelength":
        st.subheader("⚛️ Wavelength Economics")
        st.caption("Physics-based blockchain validation using Maxwell equations")
        render_wavelength_economics_dashboard()
    
    elif selected_module == "🌐 Network":
        # Sub-navigation for network modules
        network_tab = st.selectbox(
            "**Network Module:**",
            ["GhostDAG System", "Proof of Spectrum", "Nexus Consensus", "Offline Mesh"]
        )
        
        if network_tab == "GhostDAG System":
            st.subheader("🕸️ GhostDAG System")
            st.caption("Parallel block processing and DAG optimization")
            render_ghostdag_system()
        
        elif network_tab == "Proof of Spectrum":
            st.subheader("🌈 Proof of Spectrum")
            st.caption("Wavelength-based consensus mechanism")
            render_proof_of_spectrum()
        
        elif network_tab == "Nexus Consensus":
            st.subheader("🔮 Nexus Consensus Engine")
            st.caption("Unified consensus integrating GhostDAG + PoS + AI economics")
            render_nexus_consensus_dashboard()
        
        elif network_tab == "Offline Mesh":
            st.subheader("📡 Offline Mesh Network")
            st.caption("Peer-to-peer internet WITHOUT WiFi/cellular")
            render_offline_mesh_dashboard()
    
    elif selected_module == "🗳️ Governance":
        st.subheader("🗳️ Civic Governance")
        st.caption("Community campaigns, voting, AI analysis")
        civic_governance_main()
    
    elif selected_module == "🔌 Connectivity":
        st.subheader("🔌 Mobile Connectivity")
        st.caption("Device network monitoring and mesh statistics")
        show_mobile_connectivity_dashboard()


def render_wallet_module(wallet):
    """Render the wallet module with all wallet features"""
    
    st.subheader("💎 NexusOS Native Wallet")
    st.markdown("""
    **Your Phone IS the Blockchain Node!** 🚀  
    📱 **Mobile-First** | ⚛️ **Quantum-Resistant** | 🌈 **Wavelength Security** | 💰 **NXT Tokens**
    """)
    
    st.divider()
    
    # Wallet tabs
    wallet_tab = st.tabs([
        "🏠 Home",
        "➕ Create",
        "🔓 Unlock",
        "💸 Send NXT",
        "📨 Message",
        "📜 History"
    ])
    
    with wallet_tab[0]:
        render_home_tab(wallet)
    
    with wallet_tab[1]:
        render_create_wallet_tab(wallet)
    
    with wallet_tab[2]:
        render_unlock_wallet_tab(wallet)
    
    with wallet_tab[3]:
        if st.session_state.active_address:
            render_send_nxt_tab(wallet)
        else:
            st.warning("🔐 Please unlock your wallet first to send NXT")
    
    with wallet_tab[4]:
        if st.session_state.active_address:
            render_send_message_tab(wallet)
        else:
            st.warning("🔐 Please unlock your wallet first to send messages")
    
    with wallet_tab[5]:
        if st.session_state.active_address:
            render_history_tab(wallet)
        else:
            st.warning("🔐 Please unlock your wallet first to view history")


def render_quick_stats():
    """Render quick blockchain statistics dashboard"""
    
    st.subheader("📊 Blockchain Quick Stats")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Network TPS", "5,420", "+12%")
    
    with col2:
        st.metric("Active Validators", "847", "+5")
    
    with col3:
        st.metric("Total NXT Supply", "1M", "Fixed")
    
    with col4:
        st.metric("DAG Messages", "124.5K", "+2.3K")


if __name__ == "__main__":
    render_mobile_blockchain_hub()
