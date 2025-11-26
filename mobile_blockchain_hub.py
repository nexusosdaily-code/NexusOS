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

# Import notification system
from notification_system import (
    NotificationCenter, NotificationType, NotificationPriority,
    render_notification_bell, render_notification_panel, render_notification_toast,
    get_notification_center
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
    
    # Mobile-optimized CSS with IMPROVED CONTRAST
    st.markdown("""
        <style>
        /* Dark background for main content area */
        .stApp > header + div > div > div > div > section > div {
            background-color: #0f0f23 !important;
        }
        
        /* Clear readable text - default to light text on dark backgrounds */
        .stApp main h1,
        .stApp main h2,
        .stApp main h3 {
            color: #00d4ff !important;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }
        
        .stApp main p,
        .stApp main span,
        .stApp main label,
        .stApp main li {
            color: #e2e8f0 !important;
        }
        
        /* Ensure input fields are readable - dark text on light background */
        .stApp input,
        .stApp textarea,
        .stApp select,
        .stApp [data-testid="stTextInput"] input,
        .stApp [data-testid="textInput"] input {
            background-color: #ffffff !important;
            color: #1a1a2e !important;
            border: 2px solid #667eea !important;
            border-radius: 8px !important;
        }
        
        .stApp input::placeholder {
            color: #6b7280 !important;
        }
        
        /* Metric values - bright and readable */
        .stApp [data-testid="stMetricValue"] {
            color: #10b981 !important;
            font-weight: bold !important;
        }
        
        .stApp [data-testid="stMetricLabel"] {
            color: #94a3b8 !important;
        }
        
        /* Tab labels - clear and readable */
        .stApp button[data-baseweb="tab"] {
            color: #e2e8f0 !important;
        }
        
        .stApp button[data-baseweb="tab"][aria-selected="true"] {
            color: #00d4ff !important;
            border-bottom-color: #00d4ff !important;
        }
        
        /* Mobile-first responsive design */
        .main-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 25px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        
        .main-header h1,
        .main-header p {
            color: #ffffff !important;
        }
        
        .module-card {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin: 10px 0;
            transition: all 0.3s ease;
        }
        
        .module-card h3,
        .module-card h4 {
            color: #00d4ff !important;
        }
        
        .module-card p,
        .module-card span,
        .module-card li {
            color: #e2e8f0 !important;
        }
        
        .module-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.3);
            border-color: rgba(102, 126, 234, 0.5);
        }
        
        .wallet-status-active {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
        }
        
        .wallet-status-active strong,
        .wallet-status-active code,
        .wallet-status-active span {
            color: #ffffff !important;
        }
        
        .wallet-status-locked {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            padding: 15px;
            border-radius: 10px;
            margin: 15px 0;
        }
        
        .wallet-status-locked strong {
            color: #ffffff !important;
        }
        
        /* Streamlit info/warning/success boxes */
        .stApp [data-testid="stAlert"] {
            background-color: rgba(16, 185, 129, 0.1) !important;
            border: 1px solid rgba(16, 185, 129, 0.3) !important;
        }
        
        .stApp [data-testid="stAlert"] p {
            color: #10b981 !important;
        }
        
        /* Mobile-friendly touch targets */
        .stApp button,
        .stApp [data-testid="stButton"] button {
            font-size: 16px !important;
            padding: 12px 24px !important;
            min-height: 48px !important;
            cursor: pointer !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 8px !important;
        }
        
        .stApp button:hover,
        .stApp [data-testid="stButton"] button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            transition: all 0.2s ease;
        }
        
        @media (max-width: 768px) {
            .stApp button,
            .stApp [data-testid="stButton"] button {
                font-size: 18px !important;
                padding: 14px 28px !important;
                min-height: 52px !important;
            }
        }
        
        /* Dividers */
        .stApp hr {
            border-color: rgba(102, 126, 234, 0.3) !important;
        }
        
        /* Radio buttons and checkboxes */
        .stApp [data-testid="stRadio"] label,
        .stApp [data-testid="stCheckbox"] label {
            color: #e2e8f0 !important;
        }
        
        /* File uploader */
        .stApp [data-testid="stFileUploader"] {
            background-color: #1a1a2e !important;
            border: 2px dashed #667eea !important;
            border-radius: 12px !important;
        }
        
        .stApp [data-testid="stFileUploader"] p,
        .stApp [data-testid="stFileUploader"] span {
            color: #e2e8f0 !important;
        }
        
        /* ================================================
           MOBILE TOUCH & SWIPE OPTIMIZATION
           ================================================ */
        
        /* Enable smooth scrolling throughout the app */
        html, body, .stApp, [data-testid="stAppViewContainer"] {
            scroll-behavior: smooth !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain !important;
        }
        
        /* Main content area - vertical scroll with momentum */
        .stApp main,
        [data-testid="stVerticalBlock"],
        .element-container {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scroll-behavior: smooth !important;
        }
        
        /* Tab container - horizontal swipe for tab navigation */
        .stApp [data-testid="stTabs"],
        .stApp [role="tablist"] {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scroll-behavior: smooth !important;
            scroll-snap-type: x mandatory !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            padding-bottom: 5px !important;
        }
        
        .stApp [data-testid="stTabs"]::-webkit-scrollbar,
        .stApp [role="tablist"]::-webkit-scrollbar {
            display: none !important;
        }
        
        /* Individual tabs - snap points for swipe */
        .stApp button[data-baseweb="tab"] {
            scroll-snap-align: start !important;
            flex-shrink: 0 !important;
            min-width: fit-content !important;
            padding: 12px 20px !important;
            font-size: 15px !important;
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: rgba(0, 212, 255, 0.3) !important;
            transition: all 0.2s ease !important;
        }
        
        /* Active tab visual feedback */
        .stApp button[data-baseweb="tab"]:active {
            transform: scale(0.95) !important;
            background-color: rgba(0, 212, 255, 0.1) !important;
        }
        
        /* Tab content panels - swipeable */
        .stApp [data-testid="stTabContent"],
        .stApp [role="tabpanel"] {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            scroll-behavior: smooth !important;
            max-height: calc(100vh - 250px) !important;
            padding-bottom: 80px !important;
        }
        
        /* Touch-friendly interactive elements */
        .stApp button,
        .stApp [data-testid="stButton"] button,
        .stApp a,
        .stApp [role="button"] {
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: rgba(102, 126, 234, 0.4) !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }
        
        /* Touch feedback animation */
        .stApp button:active,
        .stApp [data-testid="stButton"] button:active {
            transform: scale(0.97) !important;
            transition: transform 0.1s ease !important;
        }
        
        /* Cards and clickable elements - touch optimized */
        .module-card {
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
            cursor: pointer !important;
        }
        
        .module-card:active {
            transform: scale(0.98) !important;
            transition: transform 0.1s ease !important;
        }
        
        /* Scrollable containers within tabs */
        .stApp [data-testid="stExpander"],
        .stApp [data-testid="stDataFrame"],
        .stApp .stDataFrame {
            overflow: auto !important;
            -webkit-overflow-scrolling: touch !important;
            max-height: 400px !important;
        }
        
        /* Mobile viewport optimizations */
        @media (max-width: 768px) {
            /* Larger touch targets on mobile */
            .stApp button[data-baseweb="tab"] {
                padding: 14px 18px !important;
                font-size: 14px !important;
                min-height: 48px !important;
            }
            
            /* Full-width buttons on mobile */
            .stApp [data-testid="stButton"] button {
                width: 100% !important;
                min-height: 52px !important;
                font-size: 17px !important;
            }
            
            /* Better spacing for touch */
            .module-card {
                padding: 18px !important;
                margin: 12px 0 !important;
            }
            
            /* Ensure tab content fills screen */
            .stApp [data-testid="stTabContent"] {
                min-height: calc(100vh - 300px) !important;
            }
            
            /* Input fields - larger for mobile */
            .stApp input,
            .stApp textarea {
                font-size: 16px !important;
                padding: 14px !important;
                min-height: 48px !important;
            }
            
            /* Select dropdowns - touch friendly */
            .stApp select,
            .stApp [data-baseweb="select"] {
                min-height: 48px !important;
                font-size: 16px !important;
            }
        }
        
        /* Swipe indicator hint for tabs */
        .stApp [role="tablist"]::after {
            content: "";
            position: absolute;
            right: 0;
            top: 0;
            bottom: 0;
            width: 30px;
            background: linear-gradient(to right, transparent, rgba(15, 15, 35, 0.8));
            pointer-events: none;
        }
        
        /* Pull-to-refresh visual hint area */
        .main-header {
            position: relative;
            z-index: 10;
        }
        
        /* Prevent accidental text selection during swipe */
        .stApp [data-testid="stTabs"],
        .stApp [role="tablist"],
        .stApp button[data-baseweb="tab"] {
            user-select: none !important;
            -webkit-user-select: none !important;
        }
        
        /* Smooth transitions for all interactive states */
        * {
            -webkit-tap-highlight-color: transparent;
        }
        
        </style>
        
        <!-- Mobile Touch & Swipe JavaScript -->
        <script>
        (function() {
            // Wait for Streamlit to fully load
            const initMobileTouch = () => {
                // Find tab container
                const tabList = document.querySelector('[role="tablist"]');
                if (!tabList) {
                    setTimeout(initMobileTouch, 500);
                    return;
                }
                
                let touchStartX = 0;
                let touchEndX = 0;
                let touchStartY = 0;
                let touchEndY = 0;
                
                // Get all tab buttons
                const getTabs = () => document.querySelectorAll('button[data-baseweb="tab"]');
                
                // Find current active tab index
                const getActiveTabIndex = () => {
                    const tabs = getTabs();
                    for (let i = 0; i < tabs.length; i++) {
                        if (tabs[i].getAttribute('aria-selected') === 'true') {
                            return i;
                        }
                    }
                    return 0;
                };
                
                // Switch to tab by index
                const switchToTab = (index) => {
                    const tabs = getTabs();
                    if (index >= 0 && index < tabs.length) {
                        tabs[index].click();
                        tabs[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }
                };
                
                // Handle swipe on tab content area
                const tabContent = document.querySelector('[data-testid="stTabContent"]') || 
                                   document.querySelector('[role="tabpanel"]') ||
                                   document.querySelector('.stApp main');
                
                if (tabContent) {
                    tabContent.addEventListener('touchstart', (e) => {
                        touchStartX = e.changedTouches[0].screenX;
                        touchStartY = e.changedTouches[0].screenY;
                    }, { passive: true });
                    
                    tabContent.addEventListener('touchend', (e) => {
                        touchEndX = e.changedTouches[0].screenX;
                        touchEndY = e.changedTouches[0].screenY;
                        
                        const deltaX = touchEndX - touchStartX;
                        const deltaY = touchEndY - touchStartY;
                        
                        // Only trigger horizontal swipe if it's more horizontal than vertical
                        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 80) {
                            const currentIndex = getActiveTabIndex();
                            
                            if (deltaX < 0) {
                                // Swipe left - go to next tab
                                switchToTab(currentIndex + 1);
                            } else {
                                // Swipe right - go to previous tab
                                switchToTab(currentIndex - 1);
                            }
                        }
                    }, { passive: true });
                }
                
                // Add smooth scroll to tab clicks
                const tabs = getTabs();
                tabs.forEach((tab, index) => {
                    tab.addEventListener('click', () => {
                        tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    });
                });
                
                console.log('NexusOS Mobile Touch initialized');
            };
            
            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initMobileTouch);
            } else {
                setTimeout(initMobileTouch, 1000);
            }
            
            // Re-initialize on Streamlit reruns
            const observer = new MutationObserver(() => {
                setTimeout(initMobileTouch, 500);
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
        })();
        </script>
    """, unsafe_allow_html=True)
    
    # Initialize notification center
    notif_center = get_notification_center()
    unread_count = notif_center.get_unread_count()
    
    # Main header with notification bell in top right
    st.markdown(f"""
        <div style="position: relative;">
            <div class="main-header">
                <h1>📱 NexusOS Blockchain Hub</h1>
                <p style="font-size: 18px; margin-top: 10px;">Your Phone IS the Blockchain Node</p>
                <p style="font-size: 14px; margin-top: 5px; opacity: 0.9;">Mobile-First • Quantum-Resistant • Physics-Based</p>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    # Notification bell button - positioned in top right of the tab area
    bell_col1, bell_col2, bell_col3 = st.columns([6, 1, 1])
    with bell_col3:
        # Bell with badge showing unread count
        bell_label = f"🔔 {unread_count}" if unread_count > 0 else "🔔"
        bell_type = "primary" if unread_count > 0 else "secondary"
        if st.button(bell_label, key="bell_toggle", type=bell_type, help="Tap to view notifications"):
            st.session_state.show_notifications = not st.session_state.get('show_notifications', False)
            if st.session_state.show_notifications:
                notif_center.mark_all_read()
            st.rerun()
    
    # Show notification panel when bell is tapped
    if st.session_state.get('show_notifications', False):
        st.markdown("""
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                        padding: 15px; border-radius: 12px; border: 1px solid #667eea; margin: 10px 0;">
                <h4 style="color: #00d4ff; margin-bottom: 10px;">🔔 Notifications</h4>
            </div>
        """, unsafe_allow_html=True)
        render_notification_panel()
        if st.button("✕ Close Notifications", key="close_notif_panel", use_container_width=True):
            st.session_state.show_notifications = False
            st.rerun()
        st.divider()
    
    # Wallet status bar (always visible)
    if st.session_state.active_address:
        balance = wallet.get_balance(st.session_state.active_address)
        # Balance is already in smallest units (100M units = 1 NXT, like Bitcoin satoshis)
        units = balance['balance_units']
        nxt = balance['balance_nxt']
        st.markdown(f"""
            <div class="wallet-status-active">
                <strong>🔓 Wallet Active</strong><br/>
                Address: <code>{st.session_state.active_address[:24]}...</code><br/>
                Balance: <strong>{nxt:,.8f} NXT</strong> <span style="opacity: 0.7; font-size: 14px;">({units:,.0f} units)</span>
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
        "📱 P2P Hub",
        "🧭 Explore",
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
    
    # TAB 5: P2P HUB
    with tab[4]:
        render_p2p_hub_tab()
    
    # TAB 6: EXPLORE ECOSYSTEM
    with tab[5]:
        render_explore_ecosystem_tab()
    
    # TAB 7: INFO
    with tab[6]:
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
            <h3>🔍 Transaction Search</h3>
            <p>Search addresses and transactions with physics metrics. View E=hf energy costs, wavelength proofs, and quantum security.</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("🚀 Open Transaction Search", width="stretch", key="btn_tx_search"):
            st.session_state.nav_request = "🔍 Transaction Search Explorer"
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
    """Trading & DEX navigation with embedded quick swap"""
    
    st.subheader("💱 Decentralized Trading")
    st.caption("Swap tokens, provide liquidity, earn fees")
    
    # Trading sub-tabs
    trading_tabs = st.tabs([
        "⚡ Quick Swap",
        "📈 Markets",
        "🌾 Farming",
        "🏭 Create Token",
        "🚀 Full DEX"
    ])
    
    # TAB 1: Quick Swap
    with trading_tabs[0]:
        st.markdown("### ⚡ Quick Token Swap")
        st.info("💡 All swaps use NXT as the base currency")
        
        # Initialize DEX for quick swap
        from dex_page import initialize_dex
        dex = initialize_dex()
        
        user = st.session_state.get('user_address', 'dex_user_1')
        
        col1, col2 = st.columns(2)
        
        all_tokens = list(dex.tokens.keys()) + ["NXT"]
        
        with col1:
            st.markdown("**From**")
            input_token = st.selectbox("Token", all_tokens, key="quick_swap_input")
            
            if input_token == "NXT":
                balance = dex.nxt_adapter.get_balance(user) if dex.nxt_adapter else 0.0
            else:
                balance = dex.tokens[input_token].balance_of(user)
            st.caption(f"Balance: {balance:.4f} {input_token}")
            
            input_amount = st.number_input(
                "Amount",
                min_value=0.0,
                max_value=float(balance),
                value=0.0,
                step=0.1,
                key="quick_swap_amount"
            )
        
        with col2:
            st.markdown("**To**")
            output_tokens = [t for t in all_tokens if t != input_token]
            output_token = st.selectbox("Token", output_tokens, key="quick_swap_output")
            
            if input_amount > 0:
                output_amount, price_impact, _ = dex.get_quote(input_token, output_token, input_amount)
                st.metric("You receive", f"{output_amount:.4f} {output_token}")
                if price_impact > 5:
                    st.warning(f"⚠️ High impact: {price_impact:.1f}%")
                else:
                    st.caption(f"Price impact: {price_impact:.1f}%")
            else:
                st.metric("You receive", "0.0000")
        
        slippage = st.slider("Slippage Tolerance", 0.1, 5.0, 1.0, 0.1, key="quick_slippage") / 100
        
        if st.button("🔄 Swap Now", type="primary", use_container_width=True, key="quick_swap_btn"):
            if input_amount <= 0:
                st.error("Enter an amount")
            else:
                success, output, message = dex.swap_tokens(user, input_token, output_token, input_amount, slippage)
                if success:
                    st.success(f"✅ {message}")
                    # Record trade
                    if 'trade_history' not in st.session_state:
                        st.session_state.trade_history = []
                    st.session_state.trade_history.append({
                        'pair': f"{input_token}/{output_token}",
                        'type': 'Swap',
                        'amount': input_amount,
                        'received': output,
                        'time': 'Now'
                    })
                    st.rerun()
                else:
                    st.error(f"❌ {message}")
    
    # TAB 2: Markets Overview
    with trading_tabs[1]:
        st.markdown("### 📈 Market Overview")
        
        from dex_page import initialize_dex
        dex = initialize_dex()
        
        if dex.pools:
            import pandas as pd
            markets_data = []
            for pool_id, pool in dex.pools.items():
                price = pool.get_price(pool.token_a)
                tvl = pool.reserve_a + pool.reserve_b
                volume = pool.total_volume_a + pool.total_volume_b
                markets_data.append({
                    'Pair': pool_id,
                    'Price': f"{price:.6f}",
                    'TVL': f"{tvl:.2f}",
                    'Volume': f"{volume:.2f}",
                    'Fees': f"{pool.total_fees_collected:.4f}"
                })
            
            df = pd.DataFrame(markets_data)
            st.dataframe(df, use_container_width=True, hide_index=True)
        else:
            st.info("No markets yet. Create a pool to start trading!")
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Pools", len(dex.pools) if dex.pools else 0)
        with col2:
            total_tvl = sum(p.reserve_a + p.reserve_b for p in dex.pools.values()) if dex.pools else 0
            st.metric("Total TVL", f"{total_tvl:.2f}")
        with col3:
            st.metric("Tokens", len(dex.tokens))
    
    # TAB 3: Farming Quick Access
    with trading_tabs[2]:
        st.markdown("### 🌾 LP Farming")
        st.info("Stake LP tokens to earn NXT rewards")
        
        from dex_page import initialize_dex
        dex = initialize_dex()
        
        if dex.pools:
            for pool_id, pool in list(dex.pools.items())[:3]:  # Show top 3
                tvl = pool.reserve_a + pool.reserve_b
                volume = pool.total_volume_a + pool.total_volume_b
                apy = min(500, (volume / max(tvl, 1)) * 100 * 365 / 100 + 12)
                
                col1, col2, col3 = st.columns([2, 1, 1])
                with col1:
                    st.markdown(f"**{pool_id}**")
                with col2:
                    st.metric("APY", f"{apy:.1f}%")
                with col3:
                    st.metric("TVL", f"{tvl:.0f}")
                st.divider()
        
        if st.button("🚀 Open Full Farming Dashboard", use_container_width=True):
            st.session_state.nav_request = "💱 DEX (Token Exchange)"
            st.rerun()
    
    # TAB 4: Quick Token Creation
    with trading_tabs[3]:
        st.markdown("### 🏭 Create Your Token")
        
        from dex_page import initialize_dex
        dex = initialize_dex()
        
        with st.form("quick_token_form"):
            col1, col2 = st.columns(2)
            with col1:
                symbol = st.text_input("Symbol", placeholder="MYTOKEN", max_chars=10)
                name = st.text_input("Name", placeholder="My Token")
            with col2:
                supply = st.number_input("Supply", min_value=1.0, value=1000000.0, step=1000.0)
                decimals = st.selectbox("Decimals", [6, 8, 18], index=2)
            
            creator = st.session_state.get('user_address', 'dex_user_1')
            
            if st.form_submit_button("🚀 Create Token", type="primary", use_container_width=True):
                if symbol and name:
                    success, msg = dex.create_token(symbol.upper(), name, supply, creator, decimals)
                    if success:
                        st.success(f"✅ {msg}")
                        st.balloons()
                    else:
                        st.error(f"❌ {msg}")
                else:
                    st.error("Fill in all fields")
        
        st.caption(f"📊 {len(dex.tokens)} tokens available")
    
    # TAB 5: Full DEX Access
    with trading_tabs[4]:
        st.markdown("""
        <div class="module-card">
            <h2>💱 Full DEX Platform</h2>
            <p><strong>Complete trading experience with all features:</strong></p>
            <ul>
                <li>📈 Price charts with candlesticks</li>
                <li>💧 Advanced liquidity management</li>
                <li>🌾 LP Farming with APY tracking</li>
                <li>📜 Complete trade history</li>
                <li>🏭 Token factory</li>
                <li>📊 Analytics dashboard</li>
                <li>🏛️ Pool ecosystem</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("🚀 Open Full DEX Trading Platform", use_container_width=True, type="primary", key="btn_full_dex"):
            st.session_state.nav_request = "💱 DEX (Token Exchange)"
            st.rerun()
        
        st.divider()
        
        # Quick stats
        from dex_page import initialize_dex
        dex = initialize_dex()
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Pools", len(dex.pools))
        with col2:
            total_tvl = sum(p.reserve_a + p.reserve_b for p in dex.pools.values()) if dex.pools else 0
            st.metric("Total TVL", f"{total_tvl:.0f}")
        with col3:
            st.metric("Tokens", len(dex.tokens))
        with col4:
            st.metric("Total Swaps", dex.total_swaps)


def render_staking_tab():
    """Enhanced Staking & Validator Control Center"""
    
    st.subheader("🏛️ Staking Control Center")
    st.caption("Stake NXT, delegate to validators, earn rewards")
    
    # Initialize staking economy
    from validator_economics_page import initialize_staking_economy
    economy = initialize_staking_economy()
    user = st.session_state.get('user_address', 'user_0x1234')
    stats = economy.get_delegator_stats(user)
    apy = economy.calculate_apy()
    user_balance = st.session_state.get('user_tokens', 100000.0)
    
    # Staking sub-tabs
    staking_tabs = st.tabs([
        "📊 Dashboard",
        "💰 Quick Stake",
        "💎 Rewards",
        "🔍 Validators",
        "🚀 Full Platform"
    ])
    
    # TAB 1: Dashboard Overview
    with staking_tabs[0]:
        st.markdown("### 📊 Your Staking Portfolio")
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Available", f"{user_balance:,.0f} NXT")
        with col2:
            st.metric("Staked", f"{stats['total_delegated']:,.0f} NXT")
        with col3:
            st.metric("Pending Rewards", f"{stats['pending_rewards']:.2f} NXT")
        with col4:
            st.metric("APY", f"{apy:.1f}%")
        
        st.divider()
        
        # Quick actions
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("💰 Stake Now", use_container_width=True, type="primary", key="dash_stake"):
                st.session_state.staking_action = "delegate"
        with col2:
            if stats['pending_rewards'] > 0:
                if st.button(f"💎 Claim {stats['pending_rewards']:.2f}", use_container_width=True, key="dash_claim"):
                    total_claimed, _ = economy.claim_rewards(user)
                    st.session_state.user_tokens += total_claimed
                    st.success(f"✅ Claimed {total_claimed:.4f} NXT!")
                    st.rerun()
            else:
                st.button("💎 No Rewards", use_container_width=True, disabled=True, key="dash_no_claim")
        with col3:
            if st.button("🔓 Unstake", use_container_width=True, key="dash_unstake"):
                st.session_state.staking_action = "undelegate"
        
        # Staking allocation
        if stats['delegations']:
            st.markdown("### 📈 Your Delegations")
            import pandas as pd
            del_data = []
            for d in stats['delegations']:
                del_data.append({
                    'Validator': d['validator'][:15] + "...",
                    'Amount': f"{d['amount']:,.0f}",
                    'Status': d['status'].title()
                })
            df = pd.DataFrame(del_data)
            st.dataframe(df, use_container_width=True, hide_index=True)
        else:
            st.info("🚀 Start staking to earn rewards!")
    
    # TAB 2: Quick Stake
    with staking_tabs[1]:
        st.markdown("### 💰 Quick Stake")
        st.info(f"💡 Current APY: **{apy:.1f}%** | Your Balance: **{user_balance:,.0f} NXT**")
        
        # Select validator
        validators = economy.get_validator_rankings()
        active_validators = [v for v in validators if not v.is_jailed]
        
        if active_validators:
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**Select Validator**")
                validator_options = [
                    f"{v.address[:12]}... | {v.commission_rate*100:.0f}% fee | Rep: {v.reputation_score:.0f}"
                    for v in active_validators
                ]
                selected_idx = st.selectbox("Validator", range(len(validator_options)),
                                           format_func=lambda i: validator_options[i],
                                           key="quick_stake_validator")
                selected_validator = active_validators[selected_idx]
                
                st.caption(f"Total Stake: {selected_validator.get_total_stake():,.0f} | Uptime: {selected_validator.uptime_percentage:.1f}%")
            
            with col2:
                st.markdown("**Stake Amount**")
                stake_amount = st.number_input(
                    "Amount (NXT)",
                    min_value=0.0,
                    max_value=float(user_balance),
                    value=0.0,
                    step=1000.0,
                    key="quick_stake_amount"
                )
                
                if stake_amount > 0:
                    yearly = stake_amount * (apy / 100)
                    monthly = yearly / 12
                    st.success(f"📈 Est. Monthly: {monthly:.2f} NXT | Yearly: {yearly:.2f} NXT")
            
            if st.button("✅ Delegate Now", type="primary", use_container_width=True, key="quick_delegate_btn"):
                if stake_amount <= 0:
                    st.error("Enter an amount")
                elif stake_amount > user_balance:
                    st.error("Insufficient balance")
                else:
                    success, msg = economy.delegate(user, selected_validator.address, stake_amount)
                    if success:
                        st.session_state.user_tokens -= stake_amount
                        st.success(f"✅ {msg}")
                        st.balloons()
                        st.rerun()
                    else:
                        st.error(f"❌ {msg}")
        else:
            st.warning("No active validators available")
    
    # TAB 3: Rewards
    with staking_tabs[2]:
        st.markdown("### 💎 Rewards Center")
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Pending", f"{stats['pending_rewards']:.4f}")
        with col2:
            st.metric("Total Claimed", f"{stats['total_claimed']:.4f}")
        with col3:
            daily = stats['total_delegated'] * (apy / 100) / 365
            st.metric("Daily Est.", f"{daily:.4f}")
        with col4:
            monthly = daily * 30
            st.metric("Monthly Est.", f"{monthly:.2f}")
        
        if stats['pending_rewards'] > 0:
            st.divider()
            if st.button("💎 Claim All Rewards", type="primary", use_container_width=True, key="rewards_claim"):
                total_claimed, _ = economy.claim_rewards(user)
                st.session_state.user_tokens += total_claimed
                st.success(f"✅ Claimed {total_claimed:.4f} NXT!")
                st.balloons()
                st.rerun()
        
        # Rewards projection
        st.divider()
        st.markdown("### 📈 12-Month Projection")
        
        if stats['total_delegated'] > 0:
            import plotly.graph_objects as go
            
            months = list(range(0, 13))
            principal = stats['total_delegated']
            monthly_rate = (apy / 100) / 12
            
            projections = [principal + (principal * monthly_rate * m) for m in months]
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=months, y=projections,
                mode='lines+markers',
                name='Projected Value',
                line=dict(color='cyan', width=2),
                fill='tozeroy'
            ))
            fig.update_layout(
                height=250,
                xaxis_title='Month',
                yaxis_title='Value (NXT)',
                template='plotly_dark'
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Stake tokens to see projections")
    
    # TAB 4: Validators Overview
    with staking_tabs[3]:
        st.markdown("### 🔍 Top Validators")
        
        validators = economy.get_validator_rankings()[:5]
        
        for v in validators:
            col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
            with col1:
                status = "🟢" if not v.is_jailed else "🔴"
                st.markdown(f"**{status} {v.address[:18]}...**")
            with col2:
                st.metric("Stake", f"{v.get_total_stake():,.0f}")
            with col3:
                st.metric("Fee", f"{v.commission_rate*100:.0f}%")
            with col4:
                st.metric("Rep", f"{v.reputation_score:.0f}")
            st.divider()
        
        if st.button("🔍 View All Validators", use_container_width=True, key="view_all_validators"):
            st.session_state.nav_request = "🏛️ Validator Economics"
            st.rerun()
    
    # TAB 5: Full Platform Access
    with staking_tabs[4]:
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("""
            <div class="module-card">
                <h3>🏛️ Validator Economics</h3>
                <p><strong>Full staking platform</strong></p>
                <ul>
                    <li>📊 Staking Dashboard</li>
                    <li>🔍 Validator Explorer</li>
                    <li>💎 Rewards Center</li>
                    <li>📈 Analytics & E=hf Physics</li>
                    <li>📜 Staking History</li>
                    <li>🚀 Become a Validator</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
            if st.button("🚀 Open Validator Economics", use_container_width=True, key="btn_validator"):
                st.session_state.nav_request = "🏛️ Validator Economics"
                st.rerun()
        
        with col2:
            st.markdown("""
            <div class="module-card">
                <h3>⚛️ Wavelength Economics</h3>
                <p><strong>Physics-based validation</strong></p>
                <ul>
                    <li>🌊 Maxwell equation solvers</li>
                    <li>⚡ E=hf energy economics</li>
                    <li>🔐 Quantum-resistant validation</li>
                    <li>📐 5D wave signatures</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
            if st.button("🚀 Open Wavelength Economics", use_container_width=True, key="btn_wavelength"):
                st.session_state.nav_request = "💵 Wavelength Economics"
                st.rerun()
        
        st.divider()
        
        # Live network stats
        st.markdown("### 🌐 Network Status")
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            active = len([v for v in economy.validators.values() if not v.is_jailed])
            st.metric("Active Validators", active)
        with col2:
            st.metric("Total Staked", f"{economy.total_staked:,.0f}")
        with col3:
            st.metric("APY", f"{apy:.1f}%")
        with col4:
            st.metric("Rewards Dist.", f"{economy.total_rewards_distributed:,.0f}")


def render_p2p_hub_tab():
    """P2P Broadcasting Hub - Phone-to-phone communication"""
    
    st.subheader("📱 WNSP P2P Broadcasting Hub")
    st.markdown("**Connect • Stream • Share** - Phone-to-Phone Mesh Network")
    
    st.divider()
    
    # Initialize P2P session state
    if 'p2p_phone' not in st.session_state:
        st.session_state.p2p_phone = None
    if 'p2p_friends' not in st.session_state:
        st.session_state.p2p_friends = []
    
    # Get wallet reference from session (initialized by init_wallet_session in main hub)
    # This ensures we use the same wallet instance as other tabs
    wallet = st.session_state.get('nexus_wallet')
    if wallet is None:
        # Fallback: initialize if not already done (shouldn't normally happen)
        try:
            init_wallet_session()
            wallet = st.session_state.get('nexus_wallet')
        except Exception as e:
            st.error(f"Unable to initialize wallet system. Please try refreshing the page.")
            return
    
    if wallet is None:
        st.error("Wallet system unavailable. Please refresh the page or try again later.")
        return
    
    has_wallet = st.session_state.get('active_address') is not None
    
    # P2P Sub-tabs
    p2p_tabs = st.tabs([
        "🔐 Connect",
        "👥 Friends",
        "📹 Live Stream",
        "📁 Media Share",
        "🌐 Mesh Network"
    ])
    
    # TAB 1: Connect (Unified Wallet Access)
    with p2p_tabs[0]:
        st.markdown("### 🔐 Connect to P2P Network")
        
        # UNIFIED WALLET: Check if user already has a wallet
        if has_wallet:
            # User already has a wallet - they're ready to use P2P!
            address = st.session_state.active_address
            
            # Safe balance retrieval with error handling
            try:
                balance = wallet.get_balance(address) if wallet else {'balance_nxt': 0, 'balance_units': 0}
                nxt_balance = balance.get('balance_nxt', 0)
                units_balance = balance.get('balance_units', 0)
            except Exception:
                nxt_balance = 0
                units_balance = 0
            
            st.success("✅ **Wallet Connected!** You're ready to use P2P features.")
            
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                        padding: 20px; border-radius: 12px; border: 1px solid #667eea;">
                <h4 style="color: #00d4ff; margin-bottom: 10px;">📱 Your P2P Identity</h4>
                <p style="color: #e2e8f0;"><strong>Wallet Address:</strong> <code>{address[:20]}...</code></p>
                <p style="color: #e2e8f0;"><strong>Balance:</strong> {nxt_balance:,.8f} NXT ({units_balance:,.0f} units)</p>
                {"<p style='color: #e2e8f0;'><strong>Phone:</strong> " + st.session_state.p2p_phone + "</p>" if st.session_state.p2p_phone else ""}
            </div>
            """, unsafe_allow_html=True)
            
            # Optional: Link phone number to wallet for friend discovery (with SMS verification)
            if not st.session_state.p2p_phone:
                st.markdown("---")
                st.markdown("**📞 Verify Phone for Friend Discovery**")
                st.caption("Verify your phone number so friends can find you on the mesh network")
                
                # Import verification service
                try:
                    from twilio_verification import send_verification, verify_phone
                    sms_available = True
                except ImportError:
                    sms_available = False
                
                # Initialize verification state
                if 'phone_verification_pending' not in st.session_state:
                    st.session_state.phone_verification_pending = False
                if 'phone_to_verify' not in st.session_state:
                    st.session_state.phone_to_verify = None
                
                if not st.session_state.phone_verification_pending:
                    # Step 1: Enter phone and request code
                    phone = st.text_input("📱 Your Phone Number", placeholder="+1234567890", key="p2p_phone_link")
                    if st.button("📤 Send Verification Code", key="send_code", type="primary"):
                        if phone and len(phone) >= 10:
                            if sms_available:
                                result = send_verification(phone, 'user_self', st.session_state.active_address)
                                if result.get('success'):
                                    st.session_state.phone_verification_pending = True
                                    st.session_state.phone_to_verify = phone
                                    if 'demo_code' in result:
                                        st.info(f"📱 Demo: Your code is **{result['demo_code']}**")
                                    else:
                                        st.success(result.get('message', 'Code sent!'))
                                    st.rerun()
                                else:
                                    st.error(result.get('error', 'Failed to send code'))
                            else:
                                st.session_state.p2p_phone = phone
                                st.success("✅ Phone linked (verification unavailable)")
                                st.rerun()
                        else:
                            st.error("Please enter a valid phone number")
                else:
                    # Step 2: Enter verification code
                    st.info(f"📱 Code sent to {st.session_state.phone_to_verify}")
                    code = st.text_input("🔢 Enter 6-digit code", max_chars=6, key="verify_code_input")
                    
                    col1, col2 = st.columns(2)
                    with col1:
                        if st.button("✅ Verify", key="verify_btn", type="primary", use_container_width=True):
                            if code and len(code) == 6:
                                if sms_available:
                                    result = verify_phone(st.session_state.phone_to_verify, code)
                                    if result.get('success'):
                                        st.session_state.p2p_phone = st.session_state.phone_to_verify
                                        st.session_state.phone_verification_pending = False
                                        st.session_state.phone_to_verify = None
                                        st.success("✅ Phone verified and linked!")
                                        st.balloons()
                                        st.rerun()
                                    else:
                                        st.error(result.get('error', 'Verification failed'))
                                else:
                                    st.session_state.p2p_phone = st.session_state.phone_to_verify
                                    st.session_state.phone_verification_pending = False
                                    st.rerun()
                            else:
                                st.error("Please enter the 6-digit code")
                    with col2:
                        if st.button("🔄 Resend Code", key="resend_btn", use_container_width=True):
                            if sms_available:
                                result = send_verification(st.session_state.phone_to_verify, 'user_self', st.session_state.active_address)
                                if result.get('success'):
                                    if 'demo_code' in result:
                                        st.info(f"📱 Demo: Your code is **{result['demo_code']}**")
                                    else:
                                        st.success("Code resent!")
                                else:
                                    st.warning(result.get('error', 'Wait before resending'))
                    
                    if st.button("← Cancel", key="cancel_verify"):
                        st.session_state.phone_verification_pending = False
                        st.session_state.phone_to_verify = None
                        st.rerun()
            else:
                st.markdown(f"**✅ Verified Phone:** {st.session_state.p2p_phone}")
                if st.button("🔓 Unlink Phone", key="p2p_unlink_phone"):
                    st.session_state.p2p_phone = None
                    st.rerun()
            
            st.markdown("---")
            st.markdown("""
            **🔋 E=hf Energy Economics:**
            - Text message: ~0.0001 NXT
            - Image share: ~0.01-0.05 NXT  
            - 1 min video stream: ~0.5-1 NXT
            - 1 hour broadcast: ~20-30 NXT
            """)
        else:
            # No wallet - offer quick creation right here
            st.info("""
            **🔐 Create Your Wallet to Start**
            
            Your wallet is your identity on the mesh network. Create one now to unlock all P2P features!
            """)
            
            st.markdown("""
            <div style="background: linear-gradient(135deg, #2d1b4e 0%, #1a1a2e 100%); 
                        padding: 20px; border-radius: 12px; border: 1px solid #9945ff; margin: 10px 0;">
                <h4 style="color: #9945ff;">💎 Quick Wallet Setup</h4>
                <p style="color: #e2e8f0;">Create a secure wallet in seconds. Your wallet gives you:</p>
                <ul style="color: #e2e8f0;">
                    <li>P2P streaming & broadcasting</li>
                    <li>Media sharing on the mesh</li>
                    <li>Friend-to-friend messaging</li>
                    <li>NXT token balance for E=hf energy costs</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
            
            # Quick wallet creation form
            with st.form("p2p_quick_wallet_form"):
                st.markdown("**Create Your Wallet**")
                
                wallet_password = st.text_input(
                    "🔐 Create Password", 
                    type="password",
                    help="Secure your wallet with a password"
                )
                confirm_password = st.text_input(
                    "🔐 Confirm Password", 
                    type="password"
                )
                phone_optional = st.text_input(
                    "📱 Phone Number (optional)", 
                    placeholder="+1234567890",
                    help="Optional: Add for friend discovery"
                )
                
                submit = st.form_submit_button("✨ Create Wallet & Connect", type="primary", use_container_width=True)
                
                if submit:
                    if not wallet_password:
                        st.error("Please enter a password")
                    elif wallet_password != confirm_password:
                        st.error("Passwords don't match")
                    elif len(wallet_password) < 4:
                        st.error("Password must be at least 4 characters")
                    else:
                        try:
                            # Create actual wallet using the wallet system
                            result = wallet.create_wallet(wallet_password)
                            # create_wallet returns wallet data directly if successful
                            if result and 'address' in result:
                                # Set session state for unified access
                                st.session_state.active_address = result['address']
                                st.session_state.wallet_unlocked = result['address']
                                
                                # Link phone if provided
                                if phone_optional and len(phone_optional) >= 10:
                                    st.session_state.p2p_phone = phone_optional
                                
                                st.success(f"✅ Wallet created! You're ready to use P2P features!")
                                st.balloons()
                                st.rerun()
                            else:
                                st.error("Failed to create wallet. Please try again.")
                        except Exception as e:
                            st.error(f"Error creating wallet: {str(e)}")
            
            st.markdown("---")
            st.caption("Already have a wallet? Go to the **Wallet** tab → **Unlock** to connect it.")
            
            st.markdown("---")
            st.markdown("""
            **🔋 E=hf Energy Economics (Preview):**
            - Text message: ~0.0001 NXT
            - Image share: ~0.01-0.05 NXT  
            - 1 min video stream: ~0.5-1 NXT
            - 1 hour broadcast: ~20-30 NXT
            """)
    
    # TAB 2: Friends Management
    with p2p_tabs[1]:
        st.markdown("### 👥 Friend Management")
        
        if not has_wallet:
            st.warning("🔐 Please create or unlock your wallet in the **Wallet** tab first")
        else:
            # Show wallet address as primary ID, phone as secondary if linked
            user_id = st.session_state.p2p_phone if st.session_state.p2p_phone else f"{st.session_state.active_address[:16]}..."
            st.markdown(f"**Your ID:** {user_id}")
            
            # Import friend manager for database persistence
            try:
                from friend_manager import get_friend_manager
                fm = get_friend_manager()
            except Exception:
                fm = None
            
            # Add friend form with expanded fields
            with st.expander("➕ Add New Friend", expanded=True):
                st.markdown("**Friend Details for Mesh Media Sharing**")
                
                col1, col2 = st.columns(2)
                with col1:
                    friend_name = st.text_input("👤 Friend's Name", key="friend_name_input", placeholder="John Doe")
                with col2:
                    friend_phone = st.text_input("📱 Phone Number", key="add_friend_input", placeholder="+1234567890")
                
                col3, col4 = st.columns(2)
                with col3:
                    friend_country = st.selectbox(
                        "🌍 Country",
                        options=["", "United States", "United Kingdom", "Canada", "Australia", 
                                "Germany", "France", "Japan", "South Korea", "India", "Brazil",
                                "Mexico", "South Africa", "Nigeria", "Kenya", "Other"],
                        key="friend_country_input"
                    )
                with col4:
                    friend_state = st.text_input("📍 State/Region", key="friend_state_input", placeholder="California")
                
                col5, col6 = st.columns(2)
                with col5:
                    friend_sim = st.text_input(
                        "📶 SIM ID (Optional)", 
                        key="friend_sim_input",
                        placeholder="Last 4 digits only",
                        help="Optional: Last 4 digits of SIM for mesh routing. Never share full SIM numbers."
                    )
                with col6:
                    can_share_media = st.checkbox("📁 Allow Media Sharing", value=True, key="friend_can_share")
                
                st.caption("🔒 **Privacy**: Friend data is stored locally on your device. SIM IDs are optional and only used for mesh network optimization.")
                
                if st.button("✅ Add Friend", key="add_friend_btn", type="primary", use_container_width=True):
                    if not friend_name:
                        st.error("Please enter friend's name")
                    elif not friend_phone:
                        st.error("Please enter friend's phone number")
                    else:
                        # Add to database if available
                        if fm:
                            result = fm.add_friend(
                                user_id=st.session_state.active_address,
                                friend_name=friend_name,
                                friend_contact=friend_phone,
                                country=friend_country if friend_country else None,
                                state_region=friend_state if friend_state else None,
                                sim_number=friend_sim if friend_sim else None,
                                can_share_media=can_share_media
                            )
                            if result['success']:
                                st.success(f"✅ Added {friend_name} ({friend_phone})")
                                st.rerun()
                            else:
                                st.error(f"Failed: {result.get('error', 'Unknown error')}")
                        else:
                            # Fallback to session state
                            friend_data = {
                                'name': friend_name,
                                'contact': friend_phone,
                                'country': friend_country,
                                'state_region': friend_state,
                                'sim_number': friend_sim,
                                'can_share_media': can_share_media
                            }
                            st.session_state.p2p_friends.append(friend_data)
                            st.success(f"✅ Added {friend_name}")
                            st.rerun()
            
            st.divider()
            
            # Load friends from database or session
            friends_list = []
            if fm:
                try:
                    friends_list = fm.get_friends(st.session_state.active_address)
                except Exception as e:
                    st.warning(f"Could not load friends from database")
                    friends_list = st.session_state.p2p_friends
            else:
                friends_list = st.session_state.p2p_friends
            
            if friends_list:
                st.markdown(f"**📋 Your Friends ({len(friends_list)}):**")
                for i, friend in enumerate(friends_list):
                    # Handle both dict format and old string format
                    if isinstance(friend, dict):
                        name = friend.get('name', 'Unknown')
                        contact = friend.get('contact', '')
                        country = friend.get('country', '')
                        state = friend.get('state_region', '')
                        sim = friend.get('sim_number', '')
                        can_share = friend.get('can_share_media', True)
                        friend_id = friend.get('id')
                    else:
                        # Old string format
                        name = friend
                        contact = friend
                        country = ''
                        state = ''
                        sim = ''
                        can_share = True
                        friend_id = None
                    
                    with st.container():
                        st.markdown(f"""
                        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                                    padding: 15px; border-radius: 10px; margin: 5px 0; 
                                    border-left: 4px solid {'#10b981' if can_share else '#6b7280'};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="color: #00d4ff; font-size: 16px;">👤 {name}</strong>
                                    <span style="color: #10b981; margin-left: 10px;">🟢 Online</span>
                                </div>
                            </div>
                            <p style="color: #94a3b8; margin: 5px 0;">📱 {contact}</p>
                            {f'<p style="color: #94a3b8; margin: 2px 0;">🌍 {country}{", " + state if state else ""}</p>' if country else ''}
                            {f'<p style="color: #94a3b8; margin: 2px 0;">📶 SIM: {sim[:8]}...</p>' if sim else ''}
                            <p style="color: {'#10b981' if can_share else '#ef4444'}; margin: 2px 0;">
                                {'📁 Media sharing enabled' if can_share else '🚫 Media sharing disabled'}
                            </p>
                        </div>
                        """, unsafe_allow_html=True)
                        
                        col1, col2 = st.columns([3, 1])
                        with col2:
                            if st.button("❌ Remove", key=f"remove_{i}_{contact}"):
                                if fm and friend_id:
                                    fm.remove_friend(st.session_state.active_address, friend_id)
                                elif isinstance(friend, str):
                                    st.session_state.p2p_friends.remove(friend)
                                else:
                                    st.session_state.p2p_friends = [f for f in st.session_state.p2p_friends if f.get('contact') != contact]
                                st.rerun()
            else:
                st.info("No friends added yet. Add friends to enable private broadcasts and media sharing!")
    
    # TAB 3: Live Streaming
    with p2p_tabs[2]:
        st.markdown("### 📹 P2P Live Streaming")
        
        if not has_wallet:
            st.warning("🔐 Please create or unlock your wallet in the **Wallet** tab first")
        else:
            st.markdown("""
            <div class="module-card">
                <h3>🔴 WebRTC Live Broadcasting</h3>
                <p><strong>Stream directly to friends via the mesh network</strong></p>
                <ul>
                    <li>📹 Camera & microphone access</li>
                    <li>👥 Friend-only or public broadcasts</li>
                    <li>⚡ E=hf energy cost per stream</li>
                    <li>🔐 End-to-end encryption</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
            
            broadcast_type = st.radio(
                "Broadcast Type:",
                ["🌍 Public (Anyone)", "👥 Friends Only"],
                key="broadcast_type"
            )
            
            if broadcast_type == "👥 Friends Only" and st.session_state.p2p_friends:
                selected_friends = st.multiselect(
                    "Select friends who can view:",
                    st.session_state.p2p_friends,
                    key="selected_viewers"
                )
            
            stream_title = st.text_input("Stream Title", placeholder="My NexusOS Stream", key="stream_title")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("🔴 Start Broadcasting", type="primary", key="start_stream"):
                    st.success("🔴 **LIVE** - Broadcasting started!")
                    st.info("⚡ Energy cost: ~0.5 NXT/minute")
            with col2:
                if st.button("⏹️ Stop Broadcast", key="stop_stream"):
                    st.info("Broadcast ended. Energy finalized.")
            
            st.divider()
            
            st.markdown("### 📺 Active Broadcasts")
            st.markdown("""
            <div class="module-card" style="border: 2px solid #ef4444;">
                <span style="background: #ef4444; padding: 4px 8px; border-radius: 4px; font-size: 12px;">🔴 LIVE</span>
                <h4 style="margin-top: 10px;">Demo Stream - NexusOS Testing</h4>
                <p>👤 Broadcaster: +1234567890 | 👁️ 3 viewers</p>
            </div>
            """, unsafe_allow_html=True)
            
            if st.button("📺 Watch This Stream", key="watch_demo"):
                st.info("Connecting to stream via WebRTC mesh...")
    
    # TAB 4: Media Sharing
    with p2p_tabs[3]:
        st.markdown("### 📁 Media Propagation Engine")
        
        if not has_wallet:
            st.warning("🔐 Please create or unlock your wallet in the **Wallet** tab first")
        else:
            st.markdown("""
            Share media across the mesh network with E=hf energy costs:
            - 🎵 **MP3** - Audio files
            - 🎬 **MP4** - Video files
            - 📄 **PDF** - Documents
            - 🖼️ **Images** - Photos and graphics
            """)
            
            uploaded = st.file_uploader(
                "Upload media to share",
                type=['mp3', 'mp4', 'pdf', 'png', 'jpg', 'jpeg'],
                key="media_upload"
            )
            
            if uploaded:
                file_size = len(uploaded.getvalue()) / 1024 / 1024  # MB
                energy_cost = file_size * 0.01  # Rough estimate
                
                st.info(f"""
                📁 **{uploaded.name}**  
                📊 Size: {file_size:.2f} MB  
                ⚡ Energy Cost: ~{energy_cost:.4f} NXT
                """)
                
                share_to = st.radio("Share with:", ["👥 Friends Only", "🌍 Public"], key="share_scope")
                
                if st.button("📤 Share via Mesh", type="primary", key="share_media"):
                    st.success(f"✅ Sharing {uploaded.name} across mesh network...")
                    st.info("Content will propagate via 64KB chunks with E=hf accounting")
    
    # TAB 5: Mesh Network Status
    with p2p_tabs[4]:
        st.markdown("### 🌐 Mesh Network Status")
        
        st.markdown("""
        <div class="module-card">
            <h3>📡 Your Phone as a Mesh Node</h3>
            <p>Your device is part of the NexusOS peer-to-peer network. No central servers needed!</p>
        </div>
        """, unsafe_allow_html=True)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Nearby Nodes", "7", "+2")
        with col2:
            st.metric("Mesh Hops", "3", "avg")
        with col3:
            st.metric("Bandwidth", "10 Mbps", "WiFi")
        with col4:
            st.metric("Latency", "45ms", "-5")
        
        st.divider()
        
        st.markdown("""
        **🔗 Connection Protocols:**
        - 📡 **Bluetooth LE**: ~100m range, low power
        - 📶 **WiFi Direct**: ~200m range, high bandwidth
        - 📲 **NFC**: <10cm, secure pairing
        
        **🛡️ Security:**
        - TLS 1.3 transport encryption
        - AES-256-GCM message encryption
        - Quantum-resistant 5D wave signatures
        """)
        
        st.markdown("""
        <div class="module-card">
            <h3>🌍 Offline Mesh Network</h3>
            <p>Access the full offline mesh dashboard for peer-to-peer internet without WiFi or cellular data.</p>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("🚀 Open Full Mesh Dashboard", key="open_mesh"):
            st.session_state.nav_request = "🌐 Offline Mesh Network"
            st.rerun()


def render_requested_module():
    """
    Show module preview and navigation guidance.
    Most full dashboards require standalone page rendering, 
    so we provide helpful navigation hints instead of inline loading.
    """
    module_name = st.session_state.get('nav_request', '')
    
    # Back button
    col1, col2 = st.columns([1, 4])
    with col1:
        if st.button("← Back", key="back_to_explore", use_container_width=True):
            st.session_state.nav_request = None
            st.rerun()
    with col2:
        st.markdown(f"### {module_name}")
    
    st.divider()
    
    # Module descriptions and quick actions
    MODULE_INFO = {
        "DAG Messaging": {
            "icon": "💬",
            "desc": "Send quantum-encrypted messages using E=hf physics pricing. Each message has wavelength validation.",
            "features": ["Quantum encryption", "Physics-based fees", "DAG validation", "Spectral signatures"]
        },
        "DEX": {
            "icon": "💱",
            "desc": "Decentralized exchange with automated market maker. Trade tokens with liquidity pool rewards.",
            "features": ["Token swaps", "Liquidity pools", "LP farming", "Price charts"]
        },
        "Governance": {
            "icon": "🗳️",
            "desc": "Community-driven governance with proposal voting. Shape the future of NexusOS.",
            "features": ["Create proposals", "Vote on changes", "Validator campaigns", "Community initiatives"]
        },
        "Mesh Network": {
            "icon": "🌐",
            "desc": "Peer-to-peer internet without WiFi or cellular. Connect directly to other nodes.",
            "features": ["Direct P2P", "Offline messaging", "Mesh routing", "Node discovery"]
        },
        "WaveLang": {
            "icon": "📝",
            "desc": "Learn quantum programming with AI assistance. Write physics-based smart contracts.",
            "features": ["AI tutor", "Code generation", "Quantum analysis", "Visual builder"]
        },
        "Service Pools": {
            "icon": "🏗️",
            "desc": "Real-world infrastructure funding. Supply chain pools for electricity, water, food, and more.",
            "features": ["8 supply chains", "Lottery system", "Bonus rewards", "Carbon credits"]
        },
        "Validator": {
            "icon": "🏛️",
            "desc": "Stake NXT to become a validator. Earn rewards for securing the network.",
            "features": ["Stake 1K-10K NXT", "Earn rewards", "Delegation", "Slashing protection"]
        }
    }
    
    # Find matching module info
    matched_info = None
    for key, info in MODULE_INFO.items():
        if key.lower() in module_name.lower():
            matched_info = info
            break
    
    if matched_info:
        st.markdown(f"""
        <div class="module-card">
            <h2>{matched_info['icon']} {module_name}</h2>
            <p style="font-size: 16px; margin: 15px 0;">{matched_info['desc']}</p>
            <h4>Key Features:</h4>
            <ul>
                {''.join(f'<li>{f}</li>' for f in matched_info['features'])}
            </ul>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="module-card">
            <h2>{module_name}</h2>
            <p>This module provides specialized functionality within the NexusOS ecosystem.</p>
        </div>
        """, unsafe_allow_html=True)
    
    st.divider()
    
    # Navigation guidance
    st.markdown("### 🚀 How to Access Full Module")
    
    st.info("""
    **To access the complete module with all features:**
    
    1. Look for the **sidebar menu** on the left (tap ☰ on mobile)
    2. Find the module selector dropdown
    3. Select this module from the list
    4. The full dashboard will load with all interactive features
    """)
    
    # Quick action: Send demo notification
    notif_center = get_notification_center()
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("🔔 Test Notification", key="test_notif", use_container_width=True):
            notif_center.notify(
                title=f"Module Ready",
                message=f"{module_name} is available in the sidebar menu",
                notification_type=NotificationType.INFO,
                priority=NotificationPriority.NORMAL
            )
            st.success("Notification sent! Check the bell icon.")
            st.rerun()
    
    with col2:
        if st.button("📋 Copy Module Name", key="copy_name", use_container_width=True):
            st.code(module_name, language=None)
            st.caption("Use this name to find the module in the sidebar")


def render_explore_ecosystem_tab():
    """Explore all NexusOS ecosystem modules via dropdown with inline rendering"""
    
    # Check if there's a navigation request to render a module inline
    if st.session_state.get('nav_request'):
        render_requested_module()
        return
    
    st.subheader("🧭 Explore NexusOS Ecosystem")
    st.markdown("**Trial & test all modules** - Select from dropdown to access any feature")
    
    st.divider()
    
    # Module categories with dropdown access
    ECOSYSTEM_MODULES = {
        "🌐 Core Blockchain": {
            "💬 Mobile DAG Messaging": "Quantum-encrypted messaging with E=hf physics pricing",
            "🔗 Blockchain Explorer": "Live block and transaction visualization",
            "🔍 Transaction Search Explorer": "Search addresses and transactions with physics metrics",
            "⚙️ Nexus Consensus Dashboard": "Unified GhostDAG + Proof of Spectrum consensus engine",
            "👻 GhostDAG Visualization": "Parallel block processing visualization",
            "🌈 Proof of Spectrum": "Wavelength-based validation eliminating 51% attacks"
        },
        "💰 Economics & Trading": {
            "💱 DEX (Decentralized Exchange)": "Automated market maker with liquidity pools",
            "🏛️ Validator Economics": "Staking, rewards, and validator performance",
            "⚛️ Wavelength Economics": "Physics-based validation and wave economics",
            "🔄 Economic Loop Dashboard": "5-milestone economic flow visualization",
            "💎 Pool Ecosystem": "Reserve pools and service pool management",
            "📊 Long-term Supply Dashboard": "Tokenomics simulation and supply analysis",
            "🏗️ Service Pools": "Supply chain funding, lottery, bonus rewards, carbon credits",
            "🎰 Lottery System": "Quantum randomness lottery with F_floor sustainability",
            "🏆 Bonus Rewards": "Performance-based rewards distribution"
        },
        "🏛️ Governance & AI": {
            "🗳️ Civic Governance": "Community campaigns and voting system",
            "🤖 AI Management Dashboard": "Centralized AI governance control",
            "💬 Talk to Nexus AI": "Conversational AI for governance reports",
            "⚖️ AI Arbitration Dashboard": "Dispute resolution and penalty appeals",
            "🛡️ Security Dashboard": "Multi-layered defense monitoring"
        },
        "📡 Network & Mesh": {
            "🌐 Offline Mesh Network": "Peer-to-peer internet without WiFi/cellular",
            "📱 Mobile Connectivity": "Phone-as-node connection management",
            "🛜 WNSP v2.0 Dashboard": "Optical mesh networking protocol",
            "🔬 WNSP v3.0 Architecture": "Hardware abstraction and adaptive encoding",
            "⚛️ WNSP v4.0 Quantum": "Quantum entanglement consensus layer",
            "🌍 Unified Mesh Stack": "4-layer decentralized knowledge infrastructure"
        },
        "🔧 Developer Tools": {
            "🚀 Napp Deployment Center": "Deploy NexusOS Apps with physics contracts",
            "📝 WaveLang AI Teacher": "Learn quantum programming with AI",
            "💻 Wavelength Code Generator": "Generate physics-based code",
            "🔬 Quantum Wavelang Analyzer": "Analyze code with wave properties",
            "⚡ Quantum Energy Dashboard": "Environmental energy and randomness systems"
        },
        "📚 Economics Theory": {
            "🧪 Avogadro Economics": "Blockchain economics using Avogadro's Number",
            "🔄 Orbital Transition Engine": "Quantum orbital burns replacing token burns",
            "📈 Monte Carlo Analysis": "Economic simulation and risk analysis",
            "🌱 Regenerative Economy": "Self-sustaining economic models"
        },
        "🏭 Real-World Supply Chains": {
            "⚡ Electricity Pool": "Sustainable power generation and distribution",
            "💧 Water Desalination": "Clean water through desalination and purification",
            "🍽️ Food Supply Chain": "Food production and distribution networks",
            "🌾 Agriculture Pool": "Sustainable farming and crop production",
            "🌿 Horticulture": "Fruits, vegetables, and plant cultivation",
            "🐟 Aquaculture": "Fish farming and marine resources",
            "🏭 Manufacturing": "Industrial production funded by F_floor",
            "🌍 Carbon Credits": "Environmental offsets and sustainability trading"
        }
    }
    
    # Category selector
    selected_category = st.selectbox(
        "📂 Select Category",
        options=list(ECOSYSTEM_MODULES.keys()),
        key="explore_category"
    )
    
    st.divider()
    
    # Get modules for selected category
    modules = ECOSYSTEM_MODULES[selected_category]
    
    # Module selector dropdown
    selected_module = st.selectbox(
        "🎯 Select Module to Explore",
        options=list(modules.keys()),
        format_func=lambda x: x,
        key="explore_module"
    )
    
    # Show module description
    if selected_module:
        st.markdown(f"""
        <div class="module-card">
            <h3>{selected_module}</h3>
            <p>{modules[selected_module]}</p>
        </div>
        """, unsafe_allow_html=True)
        
        col1, col2 = st.columns([2, 1])
        with col1:
            if st.button(f"🚀 Launch {selected_module}", type="primary", use_container_width=True, key="launch_module"):
                st.session_state.nav_request = selected_module
                st.success(f"✅ Opening {selected_module}...")
                st.rerun()
        with col2:
            st.caption("💡 Full feature access")
    
    st.divider()
    
    # Quick access grid for popular modules
    st.markdown("### ⚡ Quick Access - Popular Modules")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div class="module-card" style="text-align: center;">
            <h4>💬 DAG Messaging</h4>
            <p style="font-size: 12px;">Send quantum messages</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Open", key="quick_dag", use_container_width=True):
            st.session_state.nav_request = "💬 Mobile DAG Messaging"
            st.rerun()
    
    with col2:
        st.markdown("""
        <div class="module-card" style="text-align: center;">
            <h4>💱 DEX Trading</h4>
            <p style="font-size: 12px;">Trade on AMM</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Open", key="quick_dex", use_container_width=True):
            st.session_state.nav_request = "💱 DEX (Decentralized Exchange)"
            st.rerun()
    
    with col3:
        st.markdown("""
        <div class="module-card" style="text-align: center;">
            <h4>🤖 Talk to AI</h4>
            <p style="font-size: 12px;">Get AI guidance</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Open", key="quick_ai", use_container_width=True):
            st.session_state.nav_request = "💬 Talk to Nexus AI"
            st.rerun()
    
    col4, col5, col6 = st.columns(3)
    
    with col4:
        st.markdown("""
        <div class="module-card" style="text-align: center;">
            <h4>🌐 Mesh Network</h4>
            <p style="font-size: 12px;">P2P internet</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Open", key="quick_mesh", use_container_width=True):
            st.session_state.nav_request = "🌐 Offline Mesh Network"
            st.rerun()
    
    with col5:
        st.markdown("""
        <div class="module-card" style="text-align: center;">
            <h4>🗳️ Governance</h4>
            <p style="font-size: 12px;">Vote on proposals</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Open", key="quick_gov", use_container_width=True):
            st.session_state.nav_request = "🗳️ Civic Governance"
            st.rerun()
    
    with col6:
        st.markdown("""
        <div class="module-card" style="text-align: center;">
            <h4>📝 WaveLang</h4>
            <p style="font-size: 12px;">Learn quantum code</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Open", key="quick_wave", use_container_width=True):
            st.session_state.nav_request = "📝 WaveLang AI Teacher"
            st.rerun()
    
    st.divider()
    
    # Module count summary
    total_modules = sum(len(m) for m in ECOSYSTEM_MODULES.values())
    st.caption(f"🌟 **{total_modules} modules** across **{len(ECOSYSTEM_MODULES)} categories** available to explore")


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
    5. **P2P Hub Tab** - Phone registration, friends, live streaming, media sharing
    6. **Info Tab** - You are here!
    
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
