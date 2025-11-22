"""
NexusOS Mobile Blockchain Hub
==============================

Unified mobile-first blockchain interface - Your phone IS the blockchain node!

All blockchain operations in one cohesive mobile app:
- 💎 Web3 Wallet (Central Hub)
- 📨 Mobile DAG Messaging  
- 🔗 Blockchain Explorer
- 💱 DEX (Swap & Liquidity)
- 🏛️ Validator Economics
- ⚛️ Wavelength Economics
- 🌐 Network (GhostDAG, PoS, Consensus, Mesh)
- 🗳️ Civic Governance
- 🔌 Mobile Connectivity

**NOTE:** This is a container-safe module that doesn't call st.set_page_config.
It provides navigation to access full dashboards in the main app selector.
"""

import streamlit as st
from typing import Dict, Optional
import time

# Import wallet for central hub functionality
from nexus_native_wallet import NexusNativeWallet
from web3_wallet_dashboard import (
    render_home_tab, render_create_wallet_tab, render_unlock_wallet_tab,
    render_send_nxt_tab, render_send_message_tab, render_history_tab,
    init_wallet_session
)


def render_mobile_blockchain_hub():
    """
    Mobile Blockchain Hub - Unified navigation interface
    
    This module provides a mobile-optimized navigation hub that links to all
    blockchain features. It does NOT render full dashboards inline to avoid
    st.set_page_config conflicts. Instead, it provides quick access and links.
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
            padding: 25px;
            border-radius: 15px;
            color: white;
            text-align: center;
            margin-bottom: 25px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        
        .module-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 10px 0;
            transition: all 0.3s ease;
        }
        
        .module-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
            border-color: rgba(102, 126, 234, 0.5);
        }
        
        .wallet-status-active {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
        }
        
        .wallet-status-locked {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
        }
        
        /* Mobile-friendly touch targets */
        button, a, [data-testid="stButton"] button {
            font-size: 16px !important;
            padding: 12px 24px !important;
            min-height: 48px !important;
            cursor: pointer !important;
        }
        
        @media (max-width: 768px) {
            button, [data-testid="stButton"] button {
                font-size: 18px !important;
                padding: 14px 28px !important;
                min-height: 52px !important;
            }
        }
        
        button:hover {
            transform: translateY(-2px);
            transition: all 0.2s ease;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Main header
    st.markdown("""
        <div class="main-header">
            <h1>📱 NexusOS Blockchain Hub</h1>
            <p style="font-size: 18px; margin-top: 10px;">Your Phone IS the Blockchain Node</p>
            <p style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Mobile-First • Quantum-Resistant • Physics-Based</p>
        </div>
    """, unsafe_allow_html=True)
    
    # Wallet status bar (always visible)
    if st.session_state.active_address:
        balance = wallet.get_balance(st.session_state.active_address)
        st.markdown(f"""
            <div class="wallet-status-active">
                <strong>🔓 Wallet Active</strong><br/>
                Address: <code>{st.session_state.active_address[:24]}...</code><br/>
                Balance: <strong>{balance['balance_nxt']:.2f} NXT</strong>
            </div>
        """, unsafe_allow_html=True)
        
        col1, col2 = st.columns([3, 1])
        with col2:
            if st.button("🔒 Lock Wallet", width="stretch"):
                st.session_state.wallet_unlocked = None
                st.session_state.active_address = None
                st.rerun()
    else:
        st.markdown("""
            <div class="wallet-status-locked">
                <strong>🔐 Wallet Locked</strong><br/>
                Create or unlock a wallet below to access blockchain features
            </div>
        """, unsafe_allow_html=True)
    
    st.divider()
    
    # Navigation - Mobile-style tabs
    tab = st.tabs([
        "💎 Wallet",
        "🌐 Blockchain",
        "💱 Trading",
        "🏛️ Staking",
        "📊 Info"
    ])
    
    # TAB 1: WALLET (Embedded - Safe)
    with tab[0]:
        render_wallet_tab_embedded(wallet)
    
    # TAB 2: BLOCKCHAIN  
    with tab[1]:
        render_blockchain_tab()
    
    # TAB 3: TRADING
    with tab[2]:
        render_trading_tab()
    
    # TAB 4: STAKING
    with tab[3]:
        render_staking_tab()
    
    # TAB 5: INFO
    with tab[4]:
        render_info_tab()


def render_wallet_tab_embedded(wallet):
    """Wallet features - safely embedded"""
    
    st.subheader("💎 NexusOS Native Wallet")
    st.markdown("**Mobile-First • Quantum-Resistant • NXT Tokens**")
    
    st.divider()
    
    # Wallet sub-tabs
    wallet_subtabs = st.tabs([
        "🏠 Home",
        "➕ Create",
        "🔓 Unlock",
        "💸 Send NXT",
        "📨 Message",
        "📜 History"
    ])
    
    with wallet_subtabs[0]:
        render_home_tab(wallet)
    
    with wallet_subtabs[1]:
        render_create_wallet_tab(wallet)
    
    with wallet_subtabs[2]:
        render_unlock_wallet_tab(wallet)
    
    with wallet_subtabs[3]:
        if st.session_state.active_address:
            render_send_nxt_tab(wallet)
        else:
            st.warning("🔐 Please unlock your wallet first")
    
    with wallet_subtabs[4]:
        if st.session_state.active_address:
            render_send_message_tab(wallet)
        else:
            st.warning("🔐 Please unlock your wallet first")
    
    with wallet_subtabs[5]:
        if st.session_state.active_address:
            render_history_tab(wallet)
        else:
            st.warning("🔐 Please unlock your wallet first")


def render_blockchain_tab():
    """Blockchain modules navigation"""
    
    st.subheader("🌐 Blockchain Operations")
    st.caption("Navigate to full blockchain features")
    
    # Module cards
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="module-card">
            <h3>📨 Mobile DAG Messaging</h3>
            <p>Blockchain-powered quantum messaging with E=hf physics pricing. Send wavelength-encrypted messages across the DAG network.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Mobile DAG Messaging", width="stretch", key="btn_dag"):
            st.session_state.nav_request = "💬 Mobile DAG Messaging"
            st.rerun()
        
        st.markdown("""
        <div class="module-card">
            <h3>🔗 Blockchain Explorer</h3>
            <p>Live block and transaction visualization. Track network activity, validator performance, and transaction history.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Blockchain Explorer", width="stretch", key="btn_explorer"):
            st.session_state.nav_request = "🔗 Blockchain Explorer"
            st.rerun()
        
        st.markdown("""
        <div class="module-card">
            <h3>🚀 Napp Deployment Center</h3>
            <p>Deploy NexusOS Apps (Napps) with physics-based smart contracts. Generate, test, and deploy quantum-resistant applications.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Napp Deployment", width="stretch", key="btn_napp"):
            st.session_state.nav_request = "🚀 Napp Deployment Center"
            st.rerun()
    
    with col2:
        st.markdown("""
        <div class="module-card">
            <h3>🌈 Proof of Spectrum</h3>
            <p>Wavelength-inspired consensus eliminating 51% attacks through spectral diversity requirements.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Proof of Spectrum", width="stretch", key="btn_pos"):
            st.session_state.nav_request = "🌈 Proof of Spectrum"
            st.rerun()
        
        st.markdown("""
        <div class="module-card">
            <h3>⚡ GhostDAG System</h3>
            <p>Parallel block processing and DAG optimization for maximum throughput without bottlenecks.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open GhostDAG System", width="stretch", key="btn_ghostdag"):
            st.session_state.nav_request = "⚡ GhostDAG System"
            st.rerun()


def render_trading_tab():
    """Trading & DEX navigation"""
    
    st.subheader("💱 Decentralized Trading")
    st.caption("Swap tokens, provide liquidity, earn fees")
    
    st.markdown("""
    <div class="module-card">
        <h2>💱 DEX (Decentralized Exchange)</h2>
        <p><strong>Automated Market Maker with NXT-based liquidity pools</strong></p>
        <ul>
            <li>🔄 Token swaps with instant execution</li>
            <li>💧 Provide liquidity and earn 0.3% fees</li>
            <li>📊 Pool analytics and performance tracking</li>
            <li>🏆 Fees contribute to validator rewards</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)
    
    if st.button("🚀 Open DEX Trading Platform", width="stretch", key="btn_dex", type="primary"):
        st.session_state.nav_request = "💱 DEX (Token Exchange)"
        st.rerun()
    
    st.divider()
    
    # Quick stats (mock data for display)
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Liquidity", "$2.4M", "+8.2%")
    with col2:
        st.metric("24h Volume", "$156K", "+12.1%")
    with col3:
        st.metric("Active Pools", "24", "+3")


def render_staking_tab():
    """Staking & validator navigation"""
    
    st.subheader("🏛️ Validator Economics")
    st.caption("Stake NXT, delegate tokens, earn rewards")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        <div class="module-card">
            <h3>🏛️ Validator Economics</h3>
            <p><strong>Full staking and delegation system</strong></p>
            <ul>
                <li>💰 Stake NXT as a validator</li>
                <li>🤝 Delegate to validators</li>
                <li>📊 Performance calculator</li>
                <li>🤖 AI performance reports</li>
                <li>📈 Earnings analytics</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Validator Economics", width="stretch", key="btn_validator"):
            st.session_state.nav_request = "🏛️ Validator Economics"
            st.rerun()
    
    with col2:
        st.markdown("""
        <div class="module-card">
            <h3>⚛️ Wavelength Economics</h3>
            <p><strong>Physics-based validation system</strong></p>
            <ul>
                <li>🌊 Maxwell equation solvers</li>
                <li>⚡ E=hf energy economics</li>
                <li>🔐 Quantum-resistant validation</li>
                <li>📐 5D wave signatures</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Wavelength Economics", width="stretch", key="btn_wavelength"):
            st.session_state.nav_request = "💵 Wavelength Economics"
            st.rerun()
    
    st.divider()
    
    # Quick validator stats
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Active Validators", "847", "+5")
    with col2:
        st.metric("Total Staked", "428K NXT", "+2.1%")
    with col3:
        st.metric("Avg APY", "12.4%", "+0.3%")
    with col4:
        st.metric("Network Uptime", "99.8%", "🟢")


def render_info_tab():
    """System information and navigation guide"""
    
    st.subheader("📊 System Overview")
    
    st.markdown("""
    ### 🌟 Welcome to NexusOS Mobile Blockchain Hub
    
    This is your **central interface** for all blockchain operations on NexusOS. Your phone becomes a full blockchain node, enabling:
    
    #### 🔐 Core Features:
    - **💎 Quantum-Resistant Wallet** - Multi-spectral wavelength encryption
    - **📨 DAG Messaging** - Physics-based E=hf pricing  
    - **💱 DEX Trading** - Automated market maker with liquidity pools
    - **🏛️ Validator Staking** - Earn rewards through delegation
    - **🌈 Proof of Spectrum** - Eliminates 51% attacks
    - **⚡ GhostDAG** - Parallel block processing
    
    #### 🎯 How to Use This Hub:
    1. **Wallet Tab** - Create/unlock wallet, send NXT, send messages
    2. **Blockchain Tab** - Links to messaging, explorer, consensus
    3. **Trading Tab** - Access DEX and liquidity pools
    4. **Staking Tab** - Validator economics and wavelength validation
    5. **Info Tab** - You are here! 😊
    
    #### 🚀 Full Feature Access:
    For complete functionality, use the **main module selector** in the sidebar to access:
    - 💬 Mobile DAG Messaging (full interface)
    - 🔗 Blockchain Explorer (live visualization)
    - 💱 DEX (complete trading platform)
    - 🏛️ Validator Economics (staking dashboard)
    - ⚛️ Wavelength Economics (physics validation)
    - ⚙️ Nexus Consensus (unified consensus engine)
    - 🌐 Offline Mesh Network (peer-to-peer internet)
    - 🗳️ Civic Governance (community campaigns)
    
    ---
    
    **🌍 NexusOS** - Civilization Operating System  
    📱 **Your Phone IS the Blockchain Node**
    """)
    
    st.divider()
    
    # Quick network stats
    st.subheader("📈 Live Network Stats")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Network TPS", "5,420", "+12%")
    with col2:
        st.metric("Total NXT Supply", "1M", "Fixed")
    with col3:
        st.metric("DAG Messages", "124.5K", "+2.3K")
    with col4:
        st.metric("Block Height", "892,451", "+127")


if __name__ == "__main__":
    render_mobile_blockchain_hub()
