"""
Validator Economics Dashboard
UI for staking, delegation, rewards, and validator performance metrics
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from datetime import datetime
from validator_economics import StakingEconomy, ValidatorEconomics, SlashingType
from nexus_ai import NexusAI


def initialize_staking_economy():
    """Initialize or get staking economy from session state"""
    if 'staking_economy' not in st.session_state:
        st.session_state.staking_economy = StakingEconomy(block_reward=2.0)
        
        # Register initial validators
        economy = st.session_state.staking_economy
        
        # Create diverse validator set
        validators = [
            ("validator_001", 50000, 0.05, "Whale Validator"),
            ("validator_002", 30000, 0.10, "Professional Staker"),
            ("validator_003", 20000, 0.08, "Community Validator"),
            ("validator_004", 15000, 0.12, "High Commission"),
            ("validator_005", 10000, 0.03, "Low Commission"),
        ]
        
        for addr, stake, commission, _ in validators:
            full_addr = f"{addr}_{hash(addr) % 100000:05d}"
            economy.register_validator(full_addr, stake, commission)
        
        # Initialize user
        if 'user_address' not in st.session_state:
            st.session_state.user_address = "user_0x1234"
        
        # Give user initial tokens for staking
        if 'user_tokens' not in st.session_state:
            st.session_state.user_tokens = 100000.0
    
    return st.session_state.staking_economy


def render_validator_list(economy: StakingEconomy):
    """Render list of validators for delegation"""
    st.subheader("🏛️ Active Validators")
    
    validators = economy.get_validator_rankings()
    
    if not validators:
        st.info("No validators registered")
        return
    
    # Prepare data
    validator_data = []
    total_network_stake = economy.total_staked
    
    for v in validators:
        validator_data.append({
            'Address': v.address[:12] + "...",
            'Self Stake': f"{v.stake:,.0f}",
            'Delegated': f"{v.total_delegated:,.0f}",
            'Total Stake': f"{v.get_total_stake():,.0f}",
            'Voting Power': f"{v.get_voting_power(total_network_stake):.2f}%",
            'Commission': f"{v.commission_rate * 100:.1f}%",
            'Uptime': f"{v.uptime_percentage:.1f}%",
            'Reputation': f"{v.reputation_score:.1f}",
            'Blocks': v.blocks_proposed,
            'Delegators': len(v.delegations),
            'Status': '🔴 Jailed' if v.is_jailed else '🟢 Active'
        })
    
    df = pd.DataFrame(validator_data)
    st.dataframe(df, width="stretch", hide_index=True)


def render_delegate_interface(economy: StakingEconomy):
    """Render delegation interface"""
    st.subheader("💰 Delegate Stake")
    
    user = st.session_state.user_address
    user_balance = st.session_state.get('user_tokens', 0.0)
    
    st.metric("Available Tokens", f"{user_balance:,.2f}")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Select validator
        validators = economy.get_validator_rankings()
        validator_options = [
            f"{v.address[:12]}... ({v.commission_rate*100:.1f}% fee, Rep: {v.reputation_score:.0f})"
            for v in validators if not v.is_jailed
        ]
        
        if not validator_options:
            st.warning("No active validators available")
            return
        
        selected_idx = st.selectbox("Select Validator", range(len(validator_options)), 
                                     format_func=lambda i: validator_options[i])
        selected_validator = [v for v in validators if not v.is_jailed][selected_idx]
        
        # Show validator details
        st.info(f"""
        **Validator Details**
        - Total Stake: {selected_validator.get_total_stake():,.0f}
        - Commission: {selected_validator.commission_rate * 100:.1f}%
        - Uptime: {selected_validator.uptime_percentage:.1f}%
        - Reputation: {selected_validator.reputation_score:.1f}/100
        - Blocks Proposed: {selected_validator.blocks_proposed}
        """)
    
    with col2:
        delegate_amount = st.number_input(
            "Amount to Delegate",
            min_value=0.0,
            max_value=float(user_balance),
            value=0.0,
            step=100.0
        )
        
        if delegate_amount > 0:
            # Estimate rewards
            apy = economy.calculate_apy()
            estimated_annual = delegate_amount * (apy / 100)
            estimated_monthly = estimated_annual / 12
            
            st.success(f"""
            **Estimated Rewards** (APY: {apy:.2f}%)
            - Monthly: ~{estimated_monthly:,.2f}
            - Annual: ~{estimated_annual:,.2f}
            """)
        
        if st.button("✅ Delegate", type="primary", width="stretch"):
            if delegate_amount <= 0:
                st.error("Please enter a valid amount")
            elif delegate_amount > user_balance:
                st.error("Insufficient balance")
            else:
                success, message = economy.delegate(user, selected_validator.address, delegate_amount)
                if success:
                    st.session_state.user_tokens -= delegate_amount
                    st.success(f"✅ {message}")
                    st.rerun()
                else:
                    st.error(f"❌ {message}")


def render_my_delegations(economy: StakingEconomy):
    """Render user's delegations and rewards"""
    st.subheader("📊 My Delegations")
    
    user = st.session_state.user_address
    stats = economy.get_delegator_stats(user)
    
    # Check if AI performance report exists
    if 'delegation_performance_report' in st.session_state:
        st.success("✅ AI Performance Report Available")
        
        # Display AI report
        with st.expander("🤖 View AI Delegation Performance Analysis", expanded=True):
            report_data = st.session_state.delegation_performance_report
            
            st.caption(f"Generated: {report_data.get('timestamp', 'N/A')}")
            st.markdown("---")
            
            # Generate the comprehensive AI report using calculator values
            NexusAI.generate_delegation_performance_report(report_data)
            
            # Option to clear report
            if st.button("🗑️ Clear Report"):
                del st.session_state.delegation_performance_report
                st.rerun()
        
        st.divider()
    
    # Summary metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Delegated", f"{stats['total_delegated']:,.2f}")
    with col2:
        st.metric("Active Delegations", stats['active_delegations'])
    with col3:
        st.metric("Pending Rewards", f"{stats['pending_rewards']:,.4f}")
    with col4:
        st.metric("Total Claimed", f"{stats['total_claimed']:,.4f}")
    
    # Claim rewards button
    if stats['pending_rewards'] > 0:
        if st.button("💎 Claim All Rewards", type="primary"):
            total_claimed, claims = economy.claim_rewards(user)
            st.session_state.user_tokens += total_claimed
            st.success(f"✅ Claimed {total_claimed:,.4f} tokens!")
            for claim in claims:
                st.info(claim)
            st.rerun()
    
    # Delegations table
    if stats['delegations']:
        st.markdown("**Delegation Details**")
        df = pd.DataFrame(stats['delegations'])
        st.dataframe(df, width="stretch", hide_index=True)
        
        # Undelegate interface
        st.markdown("---")
        st.markdown("**Undelegate Stake**")
        
        active_delegations = [d for d in stats['delegations'] if d['status'] == 'active']
        if active_delegations:
            col1, col2, col3 = st.columns(3)
            
            with col1:
                undelegate_validator = st.selectbox(
                    "From Validator",
                    [d['validator'] for d in active_delegations]
                )
            
            with col2:
                # Find max amount for selected validator
                selected_delegation = next(d for d in active_delegations if d['validator'] == undelegate_validator)
                max_amount = selected_delegation['amount']
                
                undelegate_amount = st.number_input(
                    "Amount",
                    min_value=0.0,
                    max_value=float(max_amount),
                    value=0.0,
                    step=100.0
                )
            
            with col3:
                st.markdown("<br>", unsafe_allow_html=True)
                if st.button("🔓 Undelegate", width="stretch"):
                    if undelegate_amount > 0 and undelegate_validator:
                        # Get full validator address
                        full_addr = None
                        validator_prefix = undelegate_validator.replace("...", "") if "..." in undelegate_validator else undelegate_validator
                        for v_addr, v in economy.validators.items():
                            if v_addr.startswith(validator_prefix):
                                full_addr = v_addr
                                break
                        
                        if full_addr:
                            success, message = economy.undelegate(user, full_addr, undelegate_amount)
                            if success:
                                st.success(f"✅ {message}")
                                st.rerun()
                            else:
                                st.error(f"❌ {message}")
    else:
        st.info("No delegations yet. Delegate to start earning rewards!")


def render_validator_performance(economy: StakingEconomy):
    """Render validator performance charts"""
    st.subheader("📈 Validator Performance")
    
    validators = economy.get_validator_rankings()
    
    if not validators:
        st.info("No validator data available")
        return
    
    # Prepare data
    v_data = []
    for v in validators:
        v_data.append({
            'Validator': v.address[:12] + "...",
            'Total Stake': v.get_total_stake(),
            'Reputation': v.reputation_score,
            'Uptime': v.uptime_percentage,
            'Blocks Proposed': v.blocks_proposed,
            'Commission': v.commission_rate * 100
        })
    
    df = pd.DataFrame(v_data)
    
    # Stake distribution
    fig1 = px.bar(
        df,
        x='Validator',
        y='Total Stake',
        title='Stake Distribution Across Validators',
        color='Total Stake',
        color_continuous_scale='Blues'
    )
    st.plotly_chart(fig1, width="stretch")
    
    # Reputation vs Performance
    fig2 = go.Figure()
    
    fig2.add_trace(go.Bar(
        name='Reputation',
        x=df['Validator'],
        y=df['Reputation'],
        marker_color='lightblue'
    ))
    
    fig2.add_trace(go.Bar(
        name='Uptime %',
        x=df['Validator'],
        y=df['Uptime'],
        marker_color='lightgreen'
    ))
    
    fig2.update_layout(
        title='Validator Reputation & Uptime',
        barmode='group',
        yaxis_title='Score'
    )
    st.plotly_chart(fig2, width="stretch")


def render_profitability_calculator(economy: StakingEconomy):
    """Render validator profitability calculator"""
    st.subheader("💹 Validator Profitability Calculator")
    
    st.markdown("Simulate potential earnings as a validator")
    
    col1, col2 = st.columns(2)
    
    with col1:
        self_stake = st.number_input(
            "Self-Bonded Stake",
            min_value=1000.0,
            max_value=1000000.0,
            value=50000.0,
            step=1000.0
        )
        
        commission_rate = st.slider(
            "Commission Rate (%)",
            min_value=0.0,
            max_value=20.0,
            value=10.0,
            step=0.5
        ) / 100
    
    with col2:
        delegated_stake = st.number_input(
            "Expected Delegated Stake",
            min_value=0.0,
            max_value=100000000.0,
            value=100000.0,
            step=100000.0,
            help="1 full Nexus coin = 100M NXT units"
        )
        
        blocks_per_day = st.number_input(
            "Expected Blocks Per Day",
            min_value=1,
            max_value=500,
            value=50,
            step=5
        )
    
    # Calculate profitability
    results = economy.simulate_validator_profitability(
        self_stake, commission_rate, delegated_stake, blocks_per_day
    )
    
    # Display results
    st.markdown("---")
    st.markdown("**Earnings Projection**")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Daily Earnings", f"{results['daily_earnings']:,.2f}")
        st.caption(f"Commission: {results['commission_earnings_daily']:,.2f}")
        st.caption(f"Stake: {results['stake_earnings_daily']:,.2f}")
    
    with col2:
        st.metric("Monthly Earnings", f"{results['monthly_earnings']:,.2f}")
    
    with col3:
        st.metric("Annual ROI", f"{results['annual_roi']:.2f}%")
        st.caption(f"Network APY: {results['effective_apy']:.2f}%")
    
    # Earnings breakdown chart
    earnings_data = pd.DataFrame({
        'Period': ['Daily', 'Monthly', 'Annual'],
        'Earnings': [
            results['daily_earnings'],
            results['monthly_earnings'],
            results['annual_earnings']
        ]
    })
    
    fig = px.bar(
        earnings_data,
        x='Period',
        y='Earnings',
        title='Projected Validator Earnings',
        color='Earnings',
        color_continuous_scale='Greens'
    )
    st.plotly_chart(fig, width="stretch")
    
    # AI Delegation Performance Report Generation
    st.divider()
    st.markdown("**🤖 AI Delegation Performance Analysis**")
    st.markdown("Generate a comprehensive personalized report using these calculator values. The report will appear in your **My Delegations** tab.")
    
    if st.button("🤖 Generate AI Performance Report", type="primary", width="stretch"):
        # Prepare data with all calculator values
        calc_report_data = {
            'self_stake': self_stake,
            'commission_rate': commission_rate,
            'delegated_stake': delegated_stake,
            'blocks_per_day': blocks_per_day,
            'daily_earnings': results['daily_earnings'],
            'monthly_earnings': results['monthly_earnings'],
            'annual_earnings': results['annual_earnings'],
            'annual_roi': results['annual_roi'],
            'effective_apy': results['effective_apy'],
            'commission_earnings_daily': results['commission_earnings_daily'],
            'stake_earnings_daily': results['stake_earnings_daily'],
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Store in session state
        st.session_state.delegation_performance_report = calc_report_data
        st.success("✅ AI Report Generated! Switch to the **📊 My Delegations** tab to view your personalized analysis.")
        st.rerun()


def render_register_validator(economy: StakingEconomy):
    """Render validator registration interface"""
    st.subheader("🚀 Become a Validator")
    
    st.markdown("""
    Register your wallet as a validator to:
    - 💰 Earn block rewards
    - 📊 Participate in consensus
    - 🌐 Help secure the network
    - 🎯 Gain voting power
    """)
    
    # Get wallet session
    if 'active_address' not in st.session_state or not st.session_state.active_address:
        st.warning("⚠️ Please unlock your wallet first in the **Web3 Wallet** tab")
        return
    
    wallet_address = st.session_state.active_address
    
    # Check if already a validator
    if wallet_address in economy.validators:
        st.success(f"✅ Your wallet is already registered as a validator!")
        validator = economy.validators[wallet_address]
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Your Stake", f"{validator.stake:,.2f} NXT")
        with col2:
            st.metric("Commission", f"{validator.commission_rate * 100:.1f}%")
        with col3:
            st.metric("Reputation", f"{validator.reputation_score:.1f}")
        return
    
    # Get wallet balance
    if 'nexus_wallet' in st.session_state:
        try:
            balance_info = st.session_state.nexus_wallet.get_balance(wallet_address)
            available_balance = balance_info['balance_nxt']
        except:
            available_balance = 0.0
    else:
        available_balance = 0.0
    
    st.info(f"**Wallet:** `{wallet_address[:20]}...`")
    st.metric("Available Balance", f"{available_balance:.2f} NXT")
    
    st.markdown("---")
    
    with st.form("register_validator_form"):
        st.subheader("Validator Configuration")
        
        stake_amount = st.number_input(
            "Initial Stake (NXT)",
            min_value=50.0,
            max_value=float(available_balance),
            value=min(100.0, available_balance),
            step=10.0,
            help="Minimum 50 NXT required to become a validator"
        )
        
        commission_rate = st.slider(
            "Commission Rate (%)",
            min_value=0.0,
            max_value=20.0,
            value=10.0,
            step=0.5,
            help="Percentage of delegator rewards you'll keep as commission"
        )
        
        st.markdown(f"""
        **Summary:**
        - You will stake **{stake_amount:.2f} NXT**
        - Delegators will pay **{commission_rate:.1f}%** commission
        - Remaining balance: **{available_balance - stake_amount:.2f} NXT**
        """)
        
        submit = st.form_submit_button("🚀 Register as Validator", type="primary", width="stretch")
        
        if submit:
            if stake_amount < 50:
                st.error("❌ Minimum stake is 50 NXT")
            elif stake_amount > available_balance:
                st.error("❌ Insufficient balance")
            else:
                # Register validator
                success = economy.register_validator(
                    wallet_address,
                    stake_amount,
                    commission_rate / 100.0
                )
                
                if success:
                    st.success("✅ Validator registered successfully!")
                    st.balloons()
                    st.markdown(f"""
                    **Congratulations!** 🎉
                    
                    Your wallet is now a validator:
                    - Address: `{wallet_address}`
                    - Stake: {stake_amount:.2f} NXT
                    - Commission: {commission_rate:.1f}%
                    
                    You can now earn rewards from:
                    - Block validation
                    - Message validation
                    - Delegator fees
                    """)
                    st.rerun()
                else:
                    st.error("❌ Registration failed - address already registered")


def render_network_stats(economy: StakingEconomy):
    """Render overall network staking statistics"""
    st.subheader("🌐 Network Statistics")
    
    apy = economy.calculate_apy()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Staked", f"{economy.total_staked:,.0f}")
    with col2:
        st.metric("Active Validators", len([v for v in economy.validators.values() if not v.is_jailed]))
    with col3:
        st.metric("Current APY", f"{apy:.2f}%")
    with col4:
        st.metric("Total Slashed", f"{economy.total_slashed:,.2f}")
    
    st.metric("Rewards Distributed", f"{economy.total_rewards_distributed:,.2f}")


def render_staking_dashboard(economy: StakingEconomy):
    """Render comprehensive staking dashboard"""
    st.subheader("📊 Staking Dashboard")
    
    user = st.session_state.get('user_address', 'user_0x1234')
    stats = economy.get_delegator_stats(user)
    user_balance = st.session_state.get('user_tokens', 0.0)
    apy = economy.calculate_apy()
    
    # Portfolio Overview
    st.markdown("### 💼 Your Staking Portfolio")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric(
            "Available Balance", 
            f"{user_balance:,.2f} NXT",
            help="Tokens available for staking"
        )
    with col2:
        st.metric(
            "Total Staked", 
            f"{stats['total_delegated']:,.2f} NXT",
            f"+{stats['pending_rewards']:.2f} pending"
        )
    with col3:
        st.metric(
            "Active Delegations", 
            stats['active_delegations'],
            help="Number of validators you're delegating to"
        )
    with col4:
        projected_yearly = stats['total_delegated'] * (apy / 100)
        st.metric(
            "Projected Yearly", 
            f"{projected_yearly:,.2f} NXT",
            f"{apy:.1f}% APY"
        )
    
    st.divider()
    
    # Quick Actions
    st.markdown("### ⚡ Quick Actions")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        if st.button("💰 Stake Now", use_container_width=True, type="primary"):
            st.session_state.staking_action = "delegate"
            st.rerun()
    
    with col2:
        if stats['pending_rewards'] > 0:
            if st.button(f"💎 Claim {stats['pending_rewards']:.2f}", use_container_width=True):
                total_claimed, claims = economy.claim_rewards(user)
                st.session_state.user_tokens += total_claimed
                st.success(f"✅ Claimed {total_claimed:,.4f} NXT!")
                st.rerun()
        else:
            st.button("💎 No Rewards", use_container_width=True, disabled=True)
    
    with col3:
        if st.button("🔓 Unstake", use_container_width=True):
            st.session_state.staking_action = "undelegate"
            st.rerun()
    
    with col4:
        if st.button("🔄 Redelegate", use_container_width=True):
            st.session_state.staking_action = "redelegate"
            st.rerun()
    
    st.divider()
    
    # Staking Allocation Chart
    st.markdown("### 📈 Staking Allocation")
    
    if stats['delegations']:
        # Pie chart of delegations
        delegation_data = []
        for d in stats['delegations']:
            delegation_data.append({
                'Validator': d['validator'][:15] + "...",
                'Amount': d['amount'],
                'Status': d['status']
            })
        
        import plotly.express as px
        fig = px.pie(
            delegation_data,
            values='Amount',
            names='Validator',
            title='Stake Distribution by Validator',
            hole=0.4
        )
        fig.update_layout(height=300)
        st.plotly_chart(fig, use_container_width=True)
        
        # Delegation table
        df = pd.DataFrame(delegation_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("🚀 You haven't staked yet! Delegate to validators to start earning rewards.")
        
        # Show top validators to stake with
        st.markdown("**Top Validators to Consider:**")
        validators = economy.get_validator_rankings()[:3]
        for v in validators:
            if not v.is_jailed:
                col1, col2, col3 = st.columns([2, 1, 1])
                with col1:
                    st.markdown(f"**{v.address[:15]}...**")
                with col2:
                    st.caption(f"APY: {apy:.1f}%")
                with col3:
                    st.caption(f"Commission: {v.commission_rate*100:.1f}%")


def render_validator_explorer(economy: StakingEconomy):
    """Render validator explorer with search and filters"""
    st.subheader("🔍 Validator Explorer")
    
    # Search and filters
    col1, col2, col3, col4 = st.columns([2, 1, 1, 1])
    
    with col1:
        search_query = st.text_input("🔍 Search validators", placeholder="Address or name...")
    
    with col2:
        sort_by = st.selectbox("Sort by", [
            "Total Stake",
            "Commission (Low)",
            "Commission (High)",
            "Reputation",
            "Uptime"
        ])
    
    with col3:
        status_filter = st.selectbox("Status", ["All", "Active", "Jailed"])
    
    with col4:
        min_stake = st.number_input("Min Stake", min_value=0, value=0, step=1000)
    
    # Get and filter validators
    validators = economy.get_validator_rankings()
    
    # Apply filters
    filtered = []
    for v in validators:
        # Search filter
        if search_query and search_query.lower() not in v.address.lower():
            continue
        
        # Status filter
        if status_filter == "Active" and v.is_jailed:
            continue
        if status_filter == "Jailed" and not v.is_jailed:
            continue
        
        # Min stake filter
        if v.get_total_stake() < min_stake:
            continue
        
        filtered.append(v)
    
    # Sort
    if sort_by == "Total Stake":
        filtered.sort(key=lambda x: x.get_total_stake(), reverse=True)
    elif sort_by == "Commission (Low)":
        filtered.sort(key=lambda x: x.commission_rate)
    elif sort_by == "Commission (High)":
        filtered.sort(key=lambda x: x.commission_rate, reverse=True)
    elif sort_by == "Reputation":
        filtered.sort(key=lambda x: x.reputation_score, reverse=True)
    elif sort_by == "Uptime":
        filtered.sort(key=lambda x: x.uptime_percentage, reverse=True)
    
    st.caption(f"Showing {len(filtered)} of {len(validators)} validators")
    
    # Validator cards
    for v in filtered:
        total_stake = v.get_total_stake()
        network_share = (total_stake / economy.total_staked * 100) if economy.total_staked > 0 else 0
        
        with st.container():
            col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
            
            with col1:
                status_icon = "🟢" if not v.is_jailed else "🔴"
                st.markdown(f"**{status_icon} {v.address[:20]}...**")
                st.caption(f"Delegators: {len(v.delegations)} | Blocks: {v.blocks_proposed}")
            
            with col2:
                st.metric("Total Stake", f"{total_stake:,.0f}")
            
            with col3:
                st.metric("Commission", f"{v.commission_rate*100:.1f}%")
            
            with col4:
                st.metric("Reputation", f"{v.reputation_score:.0f}")
            
            with col5:
                if not v.is_jailed:
                    if st.button("Delegate", key=f"del_{v.address[:10]}", use_container_width=True):
                        st.session_state.selected_validator = v.address
                        st.session_state.staking_action = "delegate"
                        st.rerun()
                else:
                    st.button("Jailed", disabled=True, key=f"jailed_{v.address[:10]}")
            
            st.divider()


def render_rewards_center(economy: StakingEconomy):
    """Render rewards claiming and tracking center"""
    st.subheader("💎 Rewards Center")
    
    user = st.session_state.get('user_address', 'user_0x1234')
    stats = economy.get_delegator_stats(user)
    apy = economy.calculate_apy()
    
    # Rewards Overview
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Pending Rewards",
            f"{stats['pending_rewards']:,.4f} NXT",
            help="Rewards ready to claim"
        )
    
    with col2:
        st.metric(
            "Total Claimed",
            f"{stats['total_claimed']:,.4f} NXT",
            help="All-time claimed rewards"
        )
    
    with col3:
        daily_estimate = stats['total_delegated'] * (apy / 100) / 365
        st.metric(
            "Daily Estimate",
            f"{daily_estimate:,.4f} NXT",
            help="Estimated daily earnings"
        )
    
    with col4:
        monthly_estimate = daily_estimate * 30
        st.metric(
            "Monthly Estimate",
            f"{monthly_estimate:,.2f} NXT",
            help="Estimated monthly earnings"
        )
    
    # Claim button
    if stats['pending_rewards'] > 0:
        st.divider()
        col1, col2 = st.columns([2, 1])
        with col1:
            st.info(f"💎 You have **{stats['pending_rewards']:.4f} NXT** ready to claim!")
        with col2:
            if st.button("💎 Claim All Rewards", type="primary", use_container_width=True):
                total_claimed, claims = economy.claim_rewards(user)
                st.session_state.user_tokens += total_claimed
                
                # Track in history
                if 'reward_history' not in st.session_state:
                    st.session_state.reward_history = []
                st.session_state.reward_history.append({
                    'amount': total_claimed,
                    'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M"),
                    'type': 'Claim'
                })
                
                st.success(f"✅ Successfully claimed {total_claimed:,.4f} NXT!")
                st.balloons()
                st.rerun()
    
    st.divider()
    
    # Rewards by Validator
    st.markdown("### 📊 Rewards by Validator")
    
    if stats['delegations']:
        rewards_data = []
        for d in stats['delegations']:
            validator = d['validator']
            amount = d['amount']
            # Calculate proportional pending rewards
            if stats['total_delegated'] > 0:
                proportional_reward = (amount / stats['total_delegated']) * stats['pending_rewards']
            else:
                proportional_reward = 0
            
            rewards_data.append({
                'Validator': validator[:15] + "...",
                'Staked': f"{amount:,.2f}",
                'Pending': f"{proportional_reward:,.4f}",
                'Status': d['status'].title()
            })
        
        df = pd.DataFrame(rewards_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("Stake tokens to start earning rewards!")
    
    # Rewards Projection Chart
    st.divider()
    st.markdown("### 📈 Rewards Projection")
    
    if stats['total_delegated'] > 0:
        import plotly.graph_objects as go
        
        # Generate projection data
        months = list(range(0, 13))
        principal = stats['total_delegated']
        monthly_rate = (apy / 100) / 12
        
        simple_rewards = [principal + (principal * monthly_rate * m) for m in months]
        compound_rewards = [principal * ((1 + monthly_rate) ** m) for m in months]
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=months,
            y=simple_rewards,
            mode='lines+markers',
            name='Simple Interest',
            line=dict(color='cyan')
        ))
        
        fig.add_trace(go.Scatter(
            x=months,
            y=compound_rewards,
            mode='lines+markers',
            name='Compound (if restaked)',
            line=dict(color='lime')
        ))
        
        fig.update_layout(
            title=f'12-Month Rewards Projection (APY: {apy:.1f}%)',
            xaxis_title='Month',
            yaxis_title='Total Value (NXT)',
            height=300,
            template='plotly_dark'
        )
        
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Stake tokens to see your rewards projection!")
    
    # Reward History
    st.divider()
    st.markdown("### 📜 Claim History")
    
    if 'reward_history' in st.session_state and st.session_state.reward_history:
        history_df = pd.DataFrame(st.session_state.reward_history)
        st.dataframe(history_df, use_container_width=True, hide_index=True)
    else:
        st.info("No claims yet. Your claim history will appear here.")


def render_staking_analytics(economy: StakingEconomy):
    """Render staking analytics with E=hf physics integration"""
    st.subheader("📊 Staking Analytics")
    
    st.info("⚛️ **Physics-Based Economics**: NexusOS uses E=hf (Planck's equation) where rewards correlate with validation frequency")
    
    validators = economy.get_validator_rankings()
    apy = economy.calculate_apy()
    
    # Network Overview
    st.markdown("### 🌐 Network Health")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    active_validators = len([v for v in validators if not v.is_jailed])
    jailed_validators = len([v for v in validators if v.is_jailed])
    total_delegations = sum(len(v.delegations) for v in validators)
    avg_commission = sum(v.commission_rate for v in validators) / len(validators) * 100 if validators else 0
    
    with col1:
        st.metric("Active Validators", active_validators, f"{active_validators/max(len(validators),1)*100:.0f}%")
    with col2:
        st.metric("Jailed", jailed_validators)
    with col3:
        st.metric("Total Delegations", total_delegations)
    with col4:
        st.metric("Avg Commission", f"{avg_commission:.1f}%")
    with col5:
        st.metric("Network APY", f"{apy:.2f}%")
    
    st.divider()
    
    # Stake Distribution (Gini-like analysis)
    st.markdown("### ⚖️ Stake Decentralization")
    
    if validators:
        stakes = [v.get_total_stake() for v in validators]
        total = sum(stakes)
        
        # Calculate concentration
        if total > 0:
            top_validator_share = max(stakes) / total * 100
            top_3_share = sum(sorted(stakes, reverse=True)[:3]) / total * 100 if len(stakes) >= 3 else 100
        else:
            top_validator_share = 0
            top_3_share = 0
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Treemap of stake distribution
            import plotly.express as px
            
            stake_data = [{
                'Validator': v.address[:12] + "...",
                'Stake': v.get_total_stake(),
                'Type': 'Active' if not v.is_jailed else 'Jailed'
            } for v in validators]
            
            fig = px.treemap(
                stake_data,
                path=['Type', 'Validator'],
                values='Stake',
                title='Stake Distribution',
                color='Stake',
                color_continuous_scale='Blues'
            )
            fig.update_layout(height=300)
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Concentration metrics
            if top_validator_share > 33:
                st.error(f"⚠️ High concentration: Top validator has {top_validator_share:.1f}% of stake")
            elif top_validator_share > 20:
                st.warning(f"⚡ Moderate concentration: Top validator has {top_validator_share:.1f}% of stake")
            else:
                st.success(f"✅ Good decentralization: Top validator has {top_validator_share:.1f}% of stake")
            
            st.metric("Top 3 Validators Share", f"{top_3_share:.1f}%")
            st.metric("Nakamoto Coefficient", f"{max(1, len([s for s in sorted(stakes, reverse=True) if sum(sorted(stakes, reverse=True)[:sorted(stakes, reverse=True).index(s)+1]) < total * 0.51]) + 1)}")
    
    st.divider()
    
    # E=hf Physics Visualization
    st.markdown("### ⚛️ E=hf Energy Economics")
    st.caption("Validator rewards modeled using Planck's quantum energy equation")
    
    import plotly.graph_objects as go
    import numpy as np
    
    # Physics constants (scaled for visualization)
    h = 6.626e-34  # Planck constant
    
    # Generate wavelength-based reward curve
    frequencies = np.linspace(1e12, 1e15, 100)  # THz to PHz range
    energies = h * frequencies
    
    # Normalize for reward visualization
    normalized_energies = energies / max(energies) * 100  # Scale to 0-100 reward units
    
    col1, col2 = st.columns(2)
    
    with col1:
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=frequencies / 1e12,
            y=normalized_energies,
            mode='lines',
            name='E=hf Reward Curve',
            line=dict(color='cyan', width=2),
            fill='tozeroy',
            fillcolor='rgba(0, 255, 255, 0.2)'
        ))
        
        # Add validator points based on their "frequency" (activity)
        for i, v in enumerate(validators[:5]):
            # Map blocks proposed to frequency
            freq_position = (v.blocks_proposed + 1) * 100  # Scale
            reward_position = min(100, v.blocks_proposed * 2)
            
            fig.add_trace(go.Scatter(
                x=[freq_position],
                y=[reward_position],
                mode='markers',
                name=v.address[:8] + "...",
                marker=dict(size=12)
            ))
        
        fig.update_layout(
            title='Quantum Energy-Reward Relationship',
            xaxis_title='Validation Frequency (THz equivalent)',
            yaxis_title='Energy Reward (NXT)',
            height=300,
            template='plotly_dark'
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("""
        **How E=hf Economics Works:**
        
        In NexusOS, validator rewards follow Planck's equation:
        
        **E = hf**
        
        Where:
        - **E** = Energy reward (NXT tokens)
        - **h** = Nexus constant (network parameter)
        - **f** = Validation frequency (blocks/messages validated)
        
        Higher frequency validators earn proportionally more rewards, 
        just as higher frequency photons carry more energy in quantum physics.
        
        This creates natural incentives for:
        - ✅ High uptime
        - ✅ Active participation
        - ✅ Network reliability
        """)
    
    st.divider()
    
    # Validator Performance Comparison
    st.markdown("### 📈 Validator Performance Comparison")
    
    if validators:
        import plotly.express as px
        
        perf_data = []
        for v in validators:
            perf_data.append({
                'Validator': v.address[:10] + "...",
                'Reputation': v.reputation_score,
                'Uptime': v.uptime_percentage,
                'Blocks': v.blocks_proposed,
                'Commission': v.commission_rate * 100,
                'Status': 'Jailed' if v.is_jailed else 'Active'
            })
        
        df = pd.DataFrame(perf_data)
        
        fig = px.scatter(
            df,
            x='Uptime',
            y='Reputation',
            size='Blocks',
            color='Commission',
            hover_name='Validator',
            title='Validator Performance Matrix',
            color_continuous_scale='RdYlGn_r'
        )
        fig.update_layout(height=350, template='plotly_dark')
        st.plotly_chart(fig, use_container_width=True)


def render_staking_history(economy: StakingEconomy):
    """Render staking transaction history"""
    st.subheader("📜 Staking History")
    
    user = st.session_state.get('user_address', 'user_0x1234')
    
    # Initialize history in session state if not exists
    if 'staking_history' not in st.session_state:
        st.session_state.staking_history = []
    
    # Filters
    col1, col2, col3 = st.columns([1, 1, 2])
    
    with col1:
        tx_type = st.selectbox("Type", ["All", "Delegate", "Undelegate", "Claim", "Redelegate"])
    
    with col2:
        time_filter = st.selectbox("Time", ["All Time", "Today", "This Week", "This Month"])
    
    # History table
    history = st.session_state.staking_history
    
    if history:
        # Apply filters
        filtered = history
        if tx_type != "All":
            filtered = [h for h in filtered if h.get('type') == tx_type]
        
        if filtered:
            df = pd.DataFrame(filtered)
            st.dataframe(df, use_container_width=True, hide_index=True)
            
            # Export option
            if st.button("📥 Export History"):
                st.download_button(
                    "Download CSV",
                    df.to_csv(index=False),
                    "staking_history.csv",
                    "text/csv"
                )
        else:
            st.info("No transactions match your filters")
    else:
        st.info("No staking history yet. Your transactions will appear here.")
        
        # Show sample history for demo
        st.markdown("**Sample History Format:**")
        sample = pd.DataFrame([
            {'Type': 'Delegate', 'Amount': '10,000 NXT', 'Validator': 'validator_001...', 'Time': '2025-01-01 12:00'},
            {'Type': 'Claim', 'Amount': '125.5 NXT', 'Validator': 'Multiple', 'Time': '2025-01-15 09:30'},
            {'Type': 'Undelegate', 'Amount': '5,000 NXT', 'Validator': 'validator_002...', 'Time': '2025-02-01 14:00'}
        ])
        st.dataframe(sample, use_container_width=True, hide_index=True)


def render_validator_economics_page():
    """Main validator economics page - Enhanced with comprehensive staking features"""
    st.title("💰 Validator Economics")
    st.markdown("**Staking Control Center - Delegate, Earn, and Govern**")
    
    # Initialize
    economy = initialize_staking_economy()
    
    # Enhanced Navigation with new tabs
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9, tab10 = st.tabs([
        "📊 Dashboard",
        "🔍 Explorer",
        "💰 Delegate",
        "📋 My Stakes",
        "💎 Rewards",
        "📈 Analytics",
        "📜 History",
        "🏛️ Validators",
        "🚀 Become Validator",
        "💹 Calculator"
    ])
    
    with tab1:
        render_staking_dashboard(economy)
    
    with tab2:
        render_validator_explorer(economy)
    
    with tab3:
        render_delegate_interface(economy)
    
    with tab4:
        render_my_delegations(economy)
    
    with tab5:
        render_rewards_center(economy)
    
    with tab6:
        render_staking_analytics(economy)
    
    with tab7:
        render_staking_history(economy)
    
    with tab8:
        render_network_stats(economy)
        st.markdown("---")
        render_validator_list(economy)
    
    with tab9:
        render_register_validator(economy)
    
    with tab10:
        render_profitability_calculator(economy)
    
    # Nexus AI Research Report for Researchers
    st.divider()
    from nexus_ai import render_nexus_ai_button
    
    # Get validator data for AI analysis
    apy = economy.calculate_apy()
    render_nexus_ai_button('validator_economics', {
        'stake': economy.total_staked,
        'rewards': economy.total_rewards_distributed,
        'apr': apy,
        'uptime': 98.5  # Sample uptime value
    })


if __name__ == "__main__":
    render_validator_economics_page()
