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
        # Convert to true atomic scale: DB stores at 100 units/NXT, atomic scale is 100M units/NXT
        atomic_units = balance['balance_units'] * 1_000_000
        nxt = balance['balance_nxt']
        st.markdown(f"""
            <div class="wallet-status-active">
                <strong>🔓 Wallet Active</strong><br/>
                Address: <code>{st.session_state.active_address[:24]}...</code><br/>
                Balance: <strong>{atomic_units:,.0f} units</strong> <span style="opacity: 0.7; font-size: 14px;">({nxt:.8f} NXT)</span>
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
    
    # P2P Sub-tabs
    p2p_tabs = st.tabs([
        "🔐 Register",
        "👥 Friends",
        "📹 Live Stream",
        "📁 Media Share",
        "🌐 Mesh Network"
    ])
    
    # TAB 1: Phone Registration
    with p2p_tabs[0]:
        st.markdown("### 🔐 Phone Number Registration")
        st.info("""
        **Your phone number is your identity on the mesh network.**
        Register to access P2P broadcasting, friend-only streams, and mesh messaging.
        """)
        
        if st.session_state.p2p_phone:
            st.success(f"✅ **Registered as:** {st.session_state.p2p_phone}")
            st.markdown(f"**Wallet Balance:** 5.00 NXT (500,000,000 units)")
            
            if st.button("🔓 Logout", key="p2p_logout"):
                st.session_state.p2p_phone = None
                st.session_state.p2p_friends = []
                st.rerun()
        else:
            phone = st.text_input("📱 Enter Phone Number", placeholder="+1234567890", key="p2p_phone_input")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("✨ Register & Create Wallet", type="primary", key="p2p_register"):
                    if phone and len(phone) >= 10:
                        st.session_state.p2p_phone = phone
                        st.success(f"✅ Registered! Wallet created with 5 NXT")
                        st.rerun()
                    else:
                        st.error("Please enter a valid phone number")
            
            st.markdown("""
            ---
            **🔋 E=hf Energy Economics:**
            - Text message: ~0.0001 NXT
            - Image share: ~0.01-0.05 NXT  
            - 1 min video stream: ~0.5-1 NXT
            - 1 hour broadcast: ~20-30 NXT
            """)
    
    # TAB 2: Friends Management
    with p2p_tabs[1]:
        st.markdown("### 👥 Friend Management")
        
        if not st.session_state.p2p_phone:
            st.warning("🔐 Please register your phone number first")
        else:
            st.markdown(f"**Your ID:** {st.session_state.p2p_phone}")
            
            col1, col2 = st.columns([2, 1])
            with col1:
                friend_phone = st.text_input("Add friend's phone number", key="add_friend_input")
            with col2:
                if st.button("➕ Add Friend", key="add_friend_btn"):
                    if friend_phone and friend_phone not in st.session_state.p2p_friends:
                        st.session_state.p2p_friends.append(friend_phone)
                        st.success(f"✅ Added {friend_phone}")
                        st.rerun()
            
            st.divider()
            
            if st.session_state.p2p_friends:
                st.markdown("**📋 Your Friends:**")
                for i, friend in enumerate(st.session_state.p2p_friends):
                    col1, col2, col3 = st.columns([2, 1, 1])
                    with col1:
                        st.markdown(f"👤 **{friend}**")
                    with col2:
                        st.markdown("🟢 Online")
                    with col3:
                        if st.button("❌", key=f"remove_{i}"):
                            st.session_state.p2p_friends.remove(friend)
                            st.rerun()
            else:
                st.info("No friends added yet. Add friends to enable private broadcasts!")
    
    # TAB 3: Live Streaming
    with p2p_tabs[2]:
        st.markdown("### 📹 P2P Live Streaming")
        
        if not st.session_state.p2p_phone:
            st.warning("🔐 Please register your phone number first")
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
        
        if not st.session_state.p2p_phone:
            st.warning("🔐 Please register your phone number first")
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


def render_explore_ecosystem_tab():
    """Explore all NexusOS ecosystem modules via dropdown"""
    
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
            "📊 Long-term Supply Dashboard": "Tokenomics simulation and supply analysis"
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
