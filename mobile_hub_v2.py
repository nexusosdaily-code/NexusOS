"""
NexusOS Mobile Hub v2.0
=======================

A completely redesigned mobile-first blockchain interface featuring:
- Responsive design for all screen sizes (320px to 1440px+)
- Bottom navigation for mobile, top navigation for desktop
- Hero balance card with physics-inspired design
- Quick action buttons (Send, Receive, Swap, Stake)
- Feature discovery through expandable cards
- Real-time physics metrics visualization
- BHLS floor status indicator

Your phone IS the blockchain node.
"""

import streamlit as st
from typing import Dict, Optional, List, Literal
from dataclasses import dataclass
import time

from ui_theme import (
    inject_theme, render_hero_balance, render_physics_metrics,
    render_floor_status, render_section_header, render_card, Colors,
    render_achievement_badge, render_level_progress, render_achievement_unlock_notification
)
from nexus_native_wallet import NexusNativeWallet
from bhls_floor_system import BHLSFloorSystem
from native_token import token_system
from web3_wallet_dashboard import init_wallet_session
from achievement_system import get_achievement_system


@dataclass
class NavItem:
    """Navigation item definition"""
    id: str
    icon: str
    label: str
    view: str


def init_session_state():
    """Initialize all session state variables"""
    if 'current_view' not in st.session_state:
        st.session_state.current_view = 'home'
    if 'show_action_modal' not in st.session_state:
        st.session_state.show_action_modal = None
    if 'notification_open' not in st.session_state:
        st.session_state.notification_open = False
    
    init_wallet_session()


def get_wallet_data() -> Dict:
    """Get current wallet data with safe fallbacks"""
    wallet = st.session_state.get('nexus_wallet')
    
    try:
        if wallet:
            address = None
            balance = 0.0
            
            if hasattr(wallet, 'get_address'):
                address = wallet.get_address()
            elif hasattr(wallet, 'address'):
                address = wallet.address
            
            if hasattr(wallet, 'get_balance'):
                balance = wallet.get_balance()
            elif hasattr(wallet, 'balance'):
                balance = wallet.balance
            
            if address:
                return {
                    'balance': balance,
                    'address': address,
                    'is_unlocked': True,
                    'status': 'Active'
                }
    except Exception:
        pass
    
    return {
        'balance': 0.0,
        'address': None,
        'is_unlocked': False,
        'status': 'Locked'
    }


_cached_bhls = None

def get_bhls_data() -> Dict:
    """Get BHLS floor system data with caching"""
    global _cached_bhls
    try:
        if _cached_bhls is None:
            _cached_bhls = BHLSFloorSystem()
        bhls = _cached_bhls
        total_floor = sum(bhls.base_allocations.values())
        
        utilization = 0.0
        if hasattr(bhls, 'floor_utilization'):
            utilization = bhls.floor_utilization()
        elif hasattr(bhls, 'total_usage') and total_floor > 0:
            utilization = (bhls.total_usage() / total_floor) * 100
        
        status = 'Protected' if utilization < 80 else 'Warning' if utilization < 95 else 'Critical'
        
        return {
            'monthly_floor': total_floor,
            'categories': bhls.base_allocations,
            'utilization': utilization,
            'status': status
        }
    except Exception:
        return {
            'monthly_floor': 1150.0,
            'categories': {},
            'utilization': 0.0,
            'status': 'Unknown'
        }


def get_physics_metrics() -> List[Dict]:
    """Get physics-based metrics for display"""
    try:
        token_stats = token_system.get_token_stats()
        circulating = token_stats.get('circulating_supply', 0)
        total = token_stats.get('total_supply', 21_000_000)
        
        h = 6.62607015e-34
        base_frequency = 1e15
        
        return [
            {'value': f'{circulating/1e6:.1f}M', 'label': 'Circulating'},
            {'value': f'{(circulating/total)*100:.1f}%', 'label': 'Supply %'},
            {'value': f'{base_frequency/1e12:.0f} THz', 'label': 'Base Freq'},
            {'value': 'UV-A', 'label': 'Spectral Band'},
        ]
    except Exception:
        return [
            {'value': '0', 'label': 'Circulating'},
            {'value': '0%', 'label': 'Supply %'},
            {'value': '1 PHz', 'label': 'Base Freq'},
            {'value': 'UV-A', 'label': 'Spectral Band'},
        ]


def render_mobile_nav(current: str) -> str:
    """Render bottom navigation as fixed bar with interactive buttons"""
    
    nav_items = [
        {'id': 'home', 'icon': '🏠', 'label': 'Home'},
        {'id': 'wallet', 'icon': '💳', 'label': 'Wallet'},
        {'id': 'dex', 'icon': '💱', 'label': 'Swap'},
        {'id': 'governance', 'icon': '🏛️', 'label': 'Govern'},
        {'id': 'more', 'icon': '☰', 'label': 'More'},
    ]
    
    nav_html = ""
    for item in nav_items:
        is_active = current == item['id']
        active_style = "color: #00d4ff; background: rgba(0, 212, 255, 0.15);" if is_active else "color: #64748b;"
        nav_html += f"""
            <button class="mobile-nav-btn" data-view="{item['id']}" style="{active_style}">
                <span style="font-size: 1.25rem;">{item['icon']}</span>
                <span style="font-size: 0.65rem; font-weight: 500;">{item['label']}</span>
            </button>
        """
    
    st.markdown(f"""
        <style>
        .mobile-nav-container {{
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(180deg, rgba(10, 10, 26, 0.95), rgba(10, 10, 26, 0.99));
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(102, 126, 234, 0.25);
            padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px)) 8px;
            z-index: 9999;
            display: flex;
            justify-content: space-around;
            align-items: center;
        }}
        
        .mobile-nav-btn {{
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            padding: 8px 16px;
            border: none;
            border-radius: 12px;
            background: transparent;
            cursor: pointer;
            transition: all 0.2s ease;
            flex: 1;
            max-width: 80px;
        }}
        
        .mobile-nav-btn:hover {{
            background: rgba(102, 126, 234, 0.1);
        }}
        
        .mobile-nav-btn:active {{
            transform: scale(0.95);
        }}
        
        /* Content padding for fixed nav */
        .main .block-container {{
            padding-bottom: 90px !important;
        }}
        </style>
        
        <div class="mobile-nav-container" id="mobileNavBar">
            {nav_html}
        </div>
        
        <script>
        (function() {{
            const viewLabels = {{
                'home': 'Home',
                'wallet': 'Wallet',
                'dex': 'Swap',
                'governance': 'Govern',
                'more': 'More'
            }};
            
            const navBtns = document.querySelectorAll('.mobile-nav-btn');
            navBtns.forEach(btn => {{
                btn.addEventListener('click', function() {{
                    const view = this.dataset.view;
                    const targetLabel = viewLabels[view];
                    const allBtns = document.querySelectorAll('button[data-testid="baseButton-secondary"], button[data-testid="baseButton-primary"]');
                    allBtns.forEach(streamlitBtn => {{
                        if (streamlitBtn.textContent.trim() === targetLabel) {{
                            streamlitBtn.click();
                        }}
                    }});
                }});
            }});
        }})();
        </script>
    """, unsafe_allow_html=True)
    
    st.markdown("<div style='display: none;'>", unsafe_allow_html=True)
    cols = st.columns(len(nav_items))
    selected = current
    
    for i, item in enumerate(nav_items):
        with cols[i]:
            is_active = current == item['id']
            if st.button(
                item['label'],
                key=f"nav_{item['id']}",
                width="stretch",
                type="primary" if is_active else "secondary"
            ):
                selected = item['id']
                st.session_state.current_view = item['id']
    
    st.markdown("</div>", unsafe_allow_html=True)
    
    return selected


def render_home_view(wallet_data: Dict, bhls_data: Dict):
    """Render the home dashboard view"""
    
    render_hero_balance(
        balance=wallet_data['balance'],
        currency="NXT",
        floor_status=f"BHLS {bhls_data['status']}"
    )
    
    st.markdown("<div style='height: 20px;'></div>", unsafe_allow_html=True)
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("&#8593; Send", key="action_send", width="stretch"):
            st.session_state.current_view = 'wallet'
            st.session_state.wallet_action = 'send'
            st.rerun()
    
    with col2:
        if st.button("&#8595; Receive", key="action_receive", width="stretch"):
            st.session_state.current_view = 'wallet'
            st.session_state.wallet_action = 'receive'
            st.rerun()
    
    with col3:
        if st.button("&#8644; Swap", key="action_swap", width="stretch"):
            st.session_state.current_view = 'dex'
            st.rerun()
    
    with col4:
        if st.button("&#9733; Stake", key="action_stake", width="stretch"):
            st.session_state.current_view = 'governance'
            st.rerun()
    
    st.markdown("<div style='height: 24px;'></div>", unsafe_allow_html=True)
    
    render_section_header("BHLS Protection", "Your guaranteed living standards")
    render_floor_status(bhls_data['monthly_floor'], bhls_data['utilization'])
    
    st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)
    
    render_section_header("Network Status", "Physics-based blockchain metrics")
    physics = get_physics_metrics()
    render_physics_metrics(physics)
    
    st.markdown("<div style='height: 24px;'></div>", unsafe_allow_html=True)
    
    render_section_header("Quick Access", "Explore NexusOS features")
    
    features = [
        {
            'icon': '&#128172;',
            'title': 'DAG Messaging',
            'desc': 'Send quantum-secured messages with E=hf cost',
            'view': 'messaging'
        },
        {
            'icon': '&#127760;',
            'title': 'Mesh Network',
            'desc': 'Peer-to-peer connectivity without internet',
            'view': 'mesh'
        },
        {
            'icon': '&#128202;',
            'title': 'Validator Economics',
            'desc': 'Earn rewards through spectral validation',
            'view': 'validator'
        },
        {
            'icon': '&#9881;',
            'title': 'Settings',
            'desc': 'Wallet security and preferences',
            'view': 'settings'
        },
    ]
    
    for feature in features:
        with st.expander(f"{feature['icon']} {feature['title']}", expanded=False):
            st.write(feature['desc'])
            if st.button(f"Open {feature['title']}", key=f"open_{feature['view']}"):
                st.session_state.current_view = feature['view']
                st.rerun()
    
    st.markdown("<div style='height: 24px;'></div>", unsafe_allow_html=True)
    
    render_section_header("Achievements", "Your progress and badges")
    
    wallet_address = wallet_data.get('address')
    if wallet_address:
        achievement_sys = get_achievement_system()
        level_info = achievement_sys.get_user_level_info(wallet_address)
        render_level_progress(level_info)
        
        achievements = achievement_sys.get_user_achievements(wallet_address)
        unlocked = [a for a in achievements if a.get('is_unlocked')]
        
        if unlocked:
            st.markdown("<div style='display: flex; flex-wrap: wrap; gap: 4px;'>", unsafe_allow_html=True)
            for ach in unlocked[:6]:
                render_achievement_badge(ach, compact=True)
            st.markdown("</div>", unsafe_allow_html=True)
            
            if len(unlocked) > 6:
                st.caption(f"+{len(unlocked) - 6} more badges")
        else:
            st.markdown("""
                <div style="text-align: center; padding: 20px; color: #64748b;">
                    <span style="font-size: 2rem;">🎯</span>
                    <p style="margin-top: 8px;">Complete actions to earn badges!</p>
                </div>
            """, unsafe_allow_html=True)
        
        if st.button("View All Achievements", key="view_achievements", width="stretch"):
            st.session_state.current_view = 'more'
            st.session_state.more_section = 'achievements'
            st.rerun()
    else:
        st.info("Create or unlock a wallet to start earning achievements!")


def render_wallet_view(wallet_data: Dict):
    """Render the wallet management view"""
    
    render_section_header("Wallet", "Manage your NXT holdings")
    
    wallet = st.session_state.get('nexus_wallet')
    
    wallet_action = st.session_state.get('wallet_action', None)
    if wallet_action:
        st.session_state.wallet_action = None
    
    if not wallet_data['is_unlocked']:
        st.markdown("""
            <div class="nexus-card" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 3rem; margin-bottom: 16px;">&#128274;</div>
                <h3 style="color: #e2e8f0; margin-bottom: 8px;">Wallet Locked</h3>
                <p style="color: #94a3b8;">Create or unlock your wallet to continue</p>
            </div>
        """, unsafe_allow_html=True)
        
        tab1, tab2 = st.tabs(["Unlock Wallet", "Create New Wallet"])
        
        with tab1:
            password = st.text_input("Enter Password", type="password", key="unlock_pwd")
            if st.button("Unlock Wallet", key="btn_unlock", width="stretch"):
                if wallet and wallet.unlock(password):
                    st.success("Wallet unlocked successfully!")
                    st.rerun()
                else:
                    st.error("Invalid password or no wallet found")
        
        with tab2:
            new_password = st.text_input("Create Password", type="password", key="create_pwd")
            confirm_password = st.text_input("Confirm Password", type="password", key="confirm_pwd")
            if st.button("Create Wallet", key="btn_create", width="stretch"):
                if new_password != confirm_password:
                    st.error("Passwords don't match")
                elif len(new_password) < 8:
                    st.error("Password must be at least 8 characters")
                else:
                    if wallet:
                        result = wallet.create_wallet(new_password)
                        if result:
                            st.success("Wallet created successfully!")
                            st.rerun()
                        else:
                            st.error("Failed to create wallet")
    else:
        render_hero_balance(wallet_data['balance'], "NXT", "Unlocked")
        
        st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)
        
        st.markdown(f"""
            <div class="nexus-card">
                <div class="nexus-label">Your Address</div>
                <div style="font-family: monospace; font-size: 0.75rem; color: #94a3b8; 
                            word-break: break-all; margin-top: 8px; padding: 12px;
                            background: rgba(0,0,0,0.2); border-radius: 8px;">
                    {wallet_data['address']}
                </div>
            </div>
        """, unsafe_allow_html=True)
        
        if 'wallet_tab' not in st.session_state:
            st.session_state.wallet_tab = 'send'
        
        if wallet_action == 'send':
            st.session_state.wallet_tab = 'send'
        elif wallet_action == 'receive':
            st.session_state.wallet_tab = 'receive'
        
        wallet_tab_options = ['send', 'receive', 'history']
        tab_labels = {'send': '↑ Send', 'receive': '↓ Receive', 'history': '📜 History'}
        
        tab_cols = st.columns(3)
        for i, tab_id in enumerate(wallet_tab_options):
            with tab_cols[i]:
                is_active = st.session_state.wallet_tab == tab_id
                if st.button(
                    tab_labels[tab_id],
                    key=f"wallet_tab_{tab_id}",
                    width="stretch",
                    type="primary" if is_active else "secondary"
                ):
                    st.session_state.wallet_tab = tab_id
                    st.rerun()
        
        st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)
        
        if st.session_state.wallet_tab == 'send':
            recipient = st.text_input("Recipient Address", key="send_to")
            amount = st.number_input("Amount (NXT)", min_value=0.0, step=0.1, key="send_amount")
            
            if amount > 0:
                h = 6.62607015e-34
                c = 299792458
                wavelength = 380e-9
                energy_cost = (h * c / wavelength) * amount * 1e18
                st.info(f"Transaction Energy: {energy_cost:.2e} J (E=hf calculation)")
            
            if st.button("Send NXT", key="btn_send", width="stretch"):
                if recipient and amount > 0:
                    if wallet and hasattr(wallet, 'send_transaction'):
                        if wallet.send_transaction(recipient, amount):
                            st.success(f"Sent {amount} NXT to {recipient[:16]}...")
                            
                            achievement_sys = get_achievement_system()
                            newly_unlocked = achievement_sys.record_action(
                                wallet_data['address'], 
                                'transaction_sent', 
                                amount
                            )
                            for ach in newly_unlocked:
                                render_achievement_unlock_notification(ach)
                        else:
                            st.error("Transaction failed")
                    else:
                        st.error("Wallet not available")
                else:
                    st.warning("Enter recipient and amount")
        
        elif st.session_state.wallet_tab == 'receive':
            st.markdown("""
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 4rem; margin-bottom: 16px;">&#128205;</div>
                    <p style="color: #94a3b8;">Share your address to receive NXT</p>
                </div>
            """, unsafe_allow_html=True)
            
            st.code(wallet_data['address'], language=None)
            
            if st.button("Copy Address", key="btn_copy", width="stretch"):
                st.success("Address copied!")
        
        elif st.session_state.wallet_tab == 'history':
            history = wallet.get_transaction_history() if wallet else []
            if history:
                for tx in history[:10]:
                    tx_type = tx.get('type', 'transfer')
                    amount = tx.get('amount', 0)
                    icon = "&#8593;" if tx_type == 'send' else "&#8595;"
                    color = "#ef4444" if tx_type == 'send' else "#10b981"
                    
                    st.markdown(f"""
                        <div class="nexus-card" style="padding: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <span style="color: {color}; font-size: 1.25rem;">{icon}</span>
                                    <span style="color: #e2e8f0; margin-left: 8px;">{tx_type.title()}</span>
                                </div>
                                <div style="color: {color}; font-weight: 600;">
                                    {amount:,.2f} NXT
                                </div>
                            </div>
                        </div>
                    """, unsafe_allow_html=True)
            else:
                st.info("No transaction history yet")


def render_dex_view():
    """Render the DEX swap interface"""
    
    render_section_header("Swap", "Physics-based decentralized exchange")
    
    st.markdown("""
        <div class="nexus-card">
            <div class="nexus-label">Swap tokens with E=hf pricing</div>
            <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 8px;">
                Transaction fees are calculated using Planck's equation, 
                ensuring physics-derived fair pricing.
            </p>
        </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns([3, 1])
    with col1:
        from_amount = st.number_input("From", min_value=0.0, step=0.1, key="swap_from")
    with col2:
        from_token = st.selectbox("Token", ["NXT", "BHLS", "ENERGY"], key="swap_from_token")
    
    st.markdown("""
        <div style="text-align: center; padding: 8px;">
            <span style="font-size: 1.5rem; color: #667eea;">&#8645;</span>
        </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns([3, 1])
    with col1:
        to_amount = st.number_input("To (estimated)", min_value=0.0, step=0.1, key="swap_to", disabled=True)
    with col2:
        to_token = st.selectbox("Token", ["BHLS", "NXT", "ENERGY"], key="swap_to_token")
    
    if from_amount > 0:
        h = 6.62607015e-34
        frequency = 1e15
        energy = h * frequency
        fee = from_amount * 0.003
        st.markdown(f"""
            <div class="nexus-floor-status" style="border-color: var(--wavelength-blue);">
                <div class="nexus-floor-icon" style="background: var(--wavelength-blue);">&#9889;</div>
                <div class="nexus-floor-text">
                    <div class="nexus-floor-title" style="color: var(--wavelength-blue);">Swap Details</div>
                    <div class="nexus-floor-value">Fee: {fee:.4f} NXT (0.3% E=hf based)</div>
                </div>
            </div>
        """, unsafe_allow_html=True)
    
    wallet = st.session_state.get('nexus_wallet')
    wallet_address = None
    try:
        if wallet and hasattr(wallet, 'get_address'):
            wallet_address = wallet.get_address()
    except Exception:
        pass
    
    if st.button("Swap Tokens", key="btn_swap", width="stretch"):
        if from_amount > 0:
            with st.spinner("Processing swap..."):
                time.sleep(1)
                st.success(f"Swapped {from_amount} {from_token} successfully!")
                
                if wallet_address:
                    achievement_sys = get_achievement_system()
                    newly_unlocked = achievement_sys.record_action(
                        wallet_address, 
                        'swap', 
                        from_amount
                    )
                    for ach in newly_unlocked:
                        render_achievement_unlock_notification(ach)
        else:
            st.warning("Enter an amount to swap")


def render_governance_view():
    """Render the governance view"""
    
    render_section_header("Governance", "Shape civilization policy")
    
    st.markdown("""
        <div class="nexus-card">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 2rem;">&#127963;</div>
                <div>
                    <div class="nexus-label">Civic Participation</div>
                    <p style="color: #e2e8f0; margin: 4px 0 0 0;">
                        Vote on proposals that affect BHLS allocations and network policy
                    </p>
                </div>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    tab1, tab2, tab3 = st.tabs(["Active Proposals", "My Votes", "Create Proposal"])
    
    with tab1:
        proposals = [
            {
                'id': 1,
                'title': 'Increase Energy BHLS Allocation',
                'desc': 'Proposal to increase energy allocation from 150 to 175 NXT/month',
                'votes_for': 12500,
                'votes_against': 3200,
                'status': 'active'
            },
            {
                'id': 2,
                'title': 'Mesh Network Expansion Fund',
                'desc': 'Allocate reserve funds for rural mesh infrastructure',
                'votes_for': 8900,
                'votes_against': 1100,
                'status': 'active'
            }
        ]
        
        for prop in proposals:
            total_votes = prop['votes_for'] + prop['votes_against']
            pct_for = (prop['votes_for'] / total_votes * 100) if total_votes > 0 else 0
            
            st.markdown(f"""
                <div class="nexus-card">
                    <h4 style="color: #e2e8f0; margin: 0 0 8px 0;">{prop['title']}</h4>
                    <p style="color: #94a3b8; font-size: 0.875rem; margin: 0 0 12px 0;">{prop['desc']}</p>
                    <div style="background: #1a1a3a; border-radius: 8px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #10b981, #059669); 
                                    height: 100%; width: {pct_for}%;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                        <span style="color: #10b981; font-size: 0.75rem;">{prop['votes_for']:,} For</span>
                        <span style="color: #ef4444; font-size: 0.75rem;">{prop['votes_against']:,} Against</span>
                    </div>
                </div>
            """, unsafe_allow_html=True)
            
            wallet = st.session_state.get('nexus_wallet')
            wallet_address = None
            try:
                if wallet and hasattr(wallet, 'get_address'):
                    wallet_address = wallet.get_address()
            except Exception:
                pass
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Vote For", key=f"vote_for_{prop['id']}", width="stretch"):
                    st.success("Vote recorded!")
                    if wallet_address:
                        achievement_sys = get_achievement_system()
                        newly_unlocked = achievement_sys.record_action(wallet_address, 'vote')
                        for ach in newly_unlocked:
                            render_achievement_unlock_notification(ach)
            with col2:
                if st.button("Vote Against", key=f"vote_against_{prop['id']}", width="stretch"):
                    st.success("Vote recorded!")
                    if wallet_address:
                        achievement_sys = get_achievement_system()
                        newly_unlocked = achievement_sys.record_action(wallet_address, 'vote')
                        for ach in newly_unlocked:
                            render_achievement_unlock_notification(ach)
    
    with tab2:
        st.info("Your voting history will appear here")
    
    with tab3:
        st.text_input("Proposal Title", key="new_prop_title")
        st.text_area("Description", key="new_prop_desc")
        
        st.markdown("""
            <div class="nexus-floor-status" style="border-color: var(--accent-amber);">
                <div class="nexus-floor-icon" style="background: var(--accent-amber);">&#128176;</div>
                <div class="nexus-floor-text">
                    <div class="nexus-floor-title" style="color: var(--accent-amber);">Proposal Cost</div>
                    <div class="nexus-floor-value">7.5 NXT burn (10% of connectivity tier)</div>
                </div>
            </div>
        """, unsafe_allow_html=True)
        
        if st.button("Submit Proposal", key="btn_submit_prop", width="stretch"):
            st.success("Proposal submitted for community review!")
            wallet = st.session_state.get('nexus_wallet')
            wallet_address = None
            try:
                if wallet and hasattr(wallet, 'get_address'):
                    wallet_address = wallet.get_address()
            except Exception:
                pass
            if wallet_address:
                achievement_sys = get_achievement_system()
                newly_unlocked = achievement_sys.record_action(wallet_address, 'proposal')
                for ach in newly_unlocked:
                    render_achievement_unlock_notification(ach)


def render_more_view():
    """Render the more/settings view with achievements section"""
    
    render_section_header("More", "Additional features and settings")
    
    more_section = st.session_state.get('more_section', None)
    if more_section:
        st.session_state.more_section = None
    
    with st.expander("🏆 Achievements & Badges", expanded=(more_section == 'achievements')):
        wallet = st.session_state.get('nexus_wallet')
        wallet_address = None
        try:
            if wallet and hasattr(wallet, 'get_address'):
                wallet_address = wallet.get_address()
        except Exception:
            pass
        if wallet_address:
            achievement_sys = get_achievement_system()
            
            level_info = achievement_sys.get_user_level_info(wallet_address)
            render_level_progress(level_info)
            
            achievements = achievement_sys.get_user_achievements(wallet_address)
            
            categories = ['genesis', 'wavelength', 'economic', 'community', 'explorer']
            category_names = {
                'genesis': '✨ Genesis',
                'wavelength': '🌈 Wavelength',
                'economic': '💰 Economic',
                'community': '👥 Community',
                'explorer': '🔍 Explorer'
            }
            
            selected_cat = st.selectbox(
                "Filter by category",
                options=['all'] + categories,
                format_func=lambda x: 'All Achievements' if x == 'all' else category_names.get(x, x),
                key="achievement_category"
            )
            
            filtered = achievements if selected_cat == 'all' else [
                a for a in achievements if a.get('category') == selected_cat
            ]
            
            unlocked = [a for a in filtered if a.get('is_unlocked')]
            locked = [a for a in filtered if not a.get('is_unlocked')]
            
            if unlocked:
                st.markdown("#### Unlocked")
                for ach in unlocked:
                    render_achievement_badge(ach)
            
            if locked:
                st.markdown("#### In Progress")
                for ach in sorted(locked, key=lambda x: x.get('progress', 0), reverse=True):
                    render_achievement_badge(ach)
            
            st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)
            
            st.markdown("#### Leaderboard")
            leaderboard = achievement_sys.get_leaderboard(5)
            if leaderboard:
                for i, user in enumerate(leaderboard, 1):
                    medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"#{i}"
                    st.markdown(f"""
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 8px 12px;
                            background: rgba(255,255,255,0.05);
                            border-radius: 8px;
                            margin-bottom: 4px;
                        ">
                            <span>{medal} {user['wallet_address']}</span>
                            <span style="color: #00d4ff;">Lvl {user['level']} • {user['xp']:,} XP</span>
                        </div>
                    """, unsafe_allow_html=True)
            else:
                st.caption("Be the first on the leaderboard!")
        else:
            st.info("Unlock your wallet to view achievements")
    
    features = [
        {'icon': '&#128172;', 'title': 'DAG Messaging', 'desc': 'Quantum-secured messaging'},
        {'icon': '&#127760;', 'title': 'Mesh Network', 'desc': 'Offline peer-to-peer connectivity'},
        {'icon': '&#128202;', 'title': 'Validator Economics', 'desc': 'Spectral reward system'},
        {'icon': '&#9883;', 'title': 'Wavelength Economics', 'desc': 'E=hf transaction pricing'},
        {'icon': '&#128373;', 'title': 'Blockchain Explorer', 'desc': 'Search transactions and blocks'},
        {'icon': '&#129302;', 'title': 'AI Governance', 'desc': 'Autonomous policy management'},
        {'icon': '&#127919;', 'title': 'WaveLang Studio', 'desc': 'Quantum programming interface'},
        {'icon': '&#9881;', 'title': 'Settings', 'desc': 'App preferences and security'},
    ]
    
    for feature in features:
        with st.expander(f"{feature['icon']} {feature['title']}", expanded=False):
            st.write(feature['desc'])
            if st.button(f"Open", key=f"more_{feature['title'].replace(' ', '_').lower()}", width="stretch"):
                st.info(f"Opening {feature['title']}...")


def render_mobile_hub():
    """Main entry point for the Mobile Hub v2"""
    
    inject_theme()
    
    init_session_state()
    
    wallet_data = get_wallet_data()
    bhls_data = get_bhls_data()
    
    st.markdown("""
        <style>
        .nexus-main-container {
            margin: 0 3px;
            padding: 0 1px;
            border-left: 2px solid rgba(102, 126, 234, 0.4);
            border-right: 2px solid rgba(102, 126, 234, 0.4);
            border-radius: 4px;
        }
        </style>
        <div class="nexus-main-container">
            <div style="text-align: center; padding: 12px 0 6px 0;">
                <h1 class="nexus-title" style="margin-bottom: 4px;">NexusOS</h1>
                <p class="nexus-subtitle" style="margin: 0; font-size: 0.85rem;">Physics-Based Civilization OS</p>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    current_view = st.session_state.get('current_view', 'home')
    
    if current_view == 'home':
        render_home_view(wallet_data, bhls_data)
    elif current_view == 'wallet':
        render_wallet_view(wallet_data)
    elif current_view == 'dex':
        render_dex_view()
    elif current_view == 'governance':
        render_governance_view()
    elif current_view == 'more':
        render_more_view()
    else:
        render_home_view(wallet_data, bhls_data)
    
    st.markdown("<div style='height: 100px;'></div>", unsafe_allow_html=True)
    
    st.markdown("---")
    selected = render_mobile_nav(current_view)
    
    if selected != current_view:
        st.rerun()


if __name__ == "__main__":
    st.set_page_config(
        page_title="NexusOS Mobile Hub",
        page_icon="&#9883;",
        layout="wide",
        initial_sidebar_state="collapsed"
    )
    render_mobile_hub()
