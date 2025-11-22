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


def render_validator_economics_page():
    """Main validator economics page"""
    st.title("💰 Validator Economics")
    st.markdown("**Staking, Delegation, and Validator Performance**")
    
    # Initialize
    economy = initialize_staking_economy()
    
    # Navigation
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "🏛️ Validators",
        "🚀 Become Validator",
        "💰 Delegate",
        "📊 My Delegations",
        "📈 Performance",
        "💹 Calculator"
    ])
    
    with tab1:
        render_network_stats(economy)
        st.markdown("---")
        render_validator_list(economy)
    
    with tab2:
        render_register_validator(economy)
    
    with tab3:
        render_delegate_interface(economy)
    
    with tab4:
        render_my_delegations(economy)
    
    with tab5:
        render_validator_performance(economy)
    
    with tab6:
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
