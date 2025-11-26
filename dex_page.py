"""
DEX (Decentralized Exchange) UI Module
Interactive dashboard for token swapping, liquidity provision, and pool analytics
Integrated with NativeTokenSystem (NXT) as exclusive base currency
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import time
from dex_core import DEXEngine, Token, LiquidityPool, NativeTokenAdapter
from native_token import NativeTokenSystem
from pool_ecosystem import get_pool_ecosystem, PoolLayer, PoolType


def initialize_dex():
    """Initialize or get DEX engine with NXT integration from session state"""
    # Initialize NativeTokenSystem if not already done
    if 'native_token_system' not in st.session_state:
        st.session_state.native_token_system = NativeTokenSystem()
    
    # Initialize DEX engine with NXT adapter
    if 'dex_engine' not in st.session_state:
        # Create NXT adapter
        nxt_adapter = NativeTokenAdapter(st.session_state.native_token_system)
        
        # Create DEX engine with adapter
        st.session_state.dex_engine = DEXEngine(nxt_adapter=nxt_adapter)
        
        dex = st.session_state.dex_engine
        token_system = st.session_state.native_token_system
        
        # Set up user address
        if 'user_address' not in st.session_state:
            st.session_state.user_address = "dex_user_1"
        
        user = st.session_state.user_address
        
        # Give user initial NXT tokens (from treasury)
        treasury = "TREASURY"
        token_system.transfer(treasury, user, 100000)  # 1000 NXT in units
        
        # Give user some ERC-20 tokens
        dex.tokens["USDC"].mint(user, 10000)
        dex.tokens["GOV"].mint(user, 100)
        
        # Give treasury some ERC-20 tokens for initial liquidity
        dex.tokens["USDC"].mint("treasury", 100000)
        dex.tokens["GOV"].mint("treasury", 10000)
        
        # Give treasury NXT for pools (already has genesis allocation)
        # Create initial pools (all must be TOKEN/NXT pairs)
        dex.create_pool("USDC", "NXT", 10000, 1000, "treasury")  # USDC/NXT pool
        dex.create_pool("GOV", "NXT", 1000, 200, "treasury")     # GOV/NXT pool
    
    return st.session_state.dex_engine


def render_swap_interface(dex: DEXEngine):
    """Render token swap interface"""
    st.subheader("💱 Swap Tokens")
    st.info("💡 All trades use NXT as base currency")
    
    user = st.session_state.user_address
    
    col1, col2 = st.columns(2)
    
    # Build full token list including NXT
    all_tokens = list(dex.tokens.keys()) + ["NXT"]
    
    with col1:
        st.markdown("**From**")
        input_token = st.selectbox("Token", all_tokens, key="swap_input_token")
        
        # Get balance from appropriate source
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
            key="swap_input_amount"
        )
    
    with col2:
        st.markdown("**To**")
        output_tokens = [t for t in all_tokens if t != input_token]
        output_token = st.selectbox("Token", output_tokens, key="swap_output_token")
        
        # Get balance from appropriate source
        if output_token == "NXT":
            output_balance = dex.nxt_adapter.get_balance(user) if dex.nxt_adapter else 0.0
        else:
            output_balance = dex.tokens[output_token].balance_of(user)
        st.caption(f"Balance: {output_balance:.4f} {output_token}")
        
        # Get quote
        if input_amount > 0:
            output_amount, price_impact, effective_price = dex.get_quote(
                input_token, output_token, input_amount
            )
            st.metric("You will receive", f"{output_amount:.4f} {output_token}")
            
            # Show price impact
            if price_impact > 5:
                st.warning(f"⚠️ High price impact: {price_impact:.2f}%")
            else:
                st.info(f"Price impact: {price_impact:.2f}%")
            
            st.caption(f"Effective price: {effective_price:.6f} {output_token}/{input_token}")
        else:
            st.metric("You will receive", "0.0000")
    
    # Slippage tolerance
    slippage = st.slider("Slippage Tolerance (%)", 0.1, 5.0, 1.0, 0.1) / 100
    
    # Swap button
    if st.button("🔄 Swap", type="primary", width="stretch"):
        if input_amount <= 0:
            st.error("Please enter an amount")
        else:
            success, output, message = dex.swap_tokens(
                user, input_token, output_token, input_amount, slippage
            )
            if success:
                st.success(f"✅ {message}")
                st.rerun()
            else:
                st.error(f"❌ {message}")


def render_liquidity_interface(dex: DEXEngine):
    """Render liquidity provision interface"""
    st.subheader("💧 Manage Liquidity")
    
    user = st.session_state.user_address
    
    tab1, tab2 = st.tabs(["Add Liquidity", "Remove Liquidity"])
    
    with tab1:
        st.markdown("**Add Liquidity to Pool**")
        st.info("💡 All pools must include NXT as one token")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Only show ERC-20 tokens for token_a (NXT is always token_b)
            available_tokens = list(dex.tokens.keys())
            token_a = st.selectbox("Token", available_tokens, key="liq_token_a")
            balance_a = dex.tokens[token_a].balance_of(user)
            st.caption(f"Balance: {balance_a:.4f}")
            amount_a = st.number_input(
                f"Amount {token_a}",
                min_value=0.0,
                max_value=float(balance_a),
                value=0.0,
                step=0.1,
                key="liq_amount_a"
            )
        
        with col2:
            # Token B is always NXT
            token_b = "NXT"
            st.markdown(f"**{token_b} (Base Currency)**")
            balance_b = dex.nxt_adapter.get_balance(user) if dex.nxt_adapter else 0.0
            st.caption(f"Balance: {balance_b:.4f}")
            amount_b = st.number_input(
                f"Amount {token_b}",
                min_value=0.0,
                max_value=float(balance_b),
                value=0.0,
                step=0.1,
                key="liq_amount_b"
            )
        
        # Check if pool exists (always TOKEN-NXT format)
        pool_id = f"{token_a}-{token_b}"
        pool_exists = pool_id in dex.pools
        
        if pool_exists:
            pool = dex.pools[pool_id]
            current_price = pool.get_price(token_a)
            st.info(f"Current pool price: 1 {token_a} = {current_price:.6f} {token_b}")
        
        if st.button("💧 Add Liquidity", type="primary", width="stretch"):
            if amount_a <= 0 or amount_b <= 0:
                st.error("Please enter valid amounts")
            else:
                # Use DEX create_pool which handles NXT properly
                if not pool_exists:
                    success, message = dex.create_pool(token_a, token_b, amount_a, amount_b, user)
                    if success:
                        st.success(f"✅ {message}")
                        st.rerun()
                    else:
                        st.error(f"❌ {message}")
                else:
                    # Add to existing pool
                    pool = dex.pools[pool_id]
                    success, lp_tokens, message = pool.add_liquidity(user, amount_a, amount_b)
                    
                    if success:
                        # Transfer ERC-20 token
                        if not dex.tokens[token_a].transfer(user, pool_id, amount_a):
                            st.error(f"Failed to transfer {token_a}")
                            return
                        
                        # Transfer NXT via adapter
                        if dex.nxt_adapter and not dex.nxt_adapter.transfer(user, pool_id, amount_b):
                            st.error(f"Failed to transfer NXT")
                            return
                        
                        st.success(f"✅ {message}")
                        st.rerun()
                    else:
                        st.error(f"❌ {message}")
    
    with tab2:
        st.markdown("**Remove Liquidity from Pool**")
        
        # Show user's LP positions
        user_pools = []
        for pool_id, pool in dex.pools.items():
            lp_balance = pool.lp_balances.get(user, 0)
            if lp_balance > 0:
                user_pools.append({
                    'Pool': pool_id,
                    'LP Tokens': lp_balance,
                    'Share': f"{pool.get_pool_share(user):.2f}%"
                })
        
        if user_pools:
            df = pd.DataFrame(user_pools)
            st.dataframe(df, width="stretch", hide_index=True)
            
            selected_pool = st.selectbox("Select Pool", [p['Pool'] for p in user_pools], key="remove_liq_pool")
            if selected_pool:
                pool = dex.pools[selected_pool]
                
                max_lp = pool.lp_balances.get(user, 0)
                lp_amount = st.number_input(
                    "LP Tokens to Remove",
                    min_value=0.0,
                    max_value=float(max_lp),
                    value=0.0,
                    step=0.1
                )
                
                if lp_amount > 0:
                    share = lp_amount / pool.lp_token_supply
                    expected_a = pool.reserve_a * share
                    expected_b = pool.reserve_b * share
                    
                    st.info(f"You will receive: {expected_a:.4f} {pool.token_a} + {expected_b:.4f} {pool.token_b}")
                
                if st.button("💧 Remove Liquidity", type="primary", width="stretch"):
                    if lp_amount <= 0:
                        st.error("Please enter amount")
                    else:
                        success, amount_a, amount_b, message = pool.remove_liquidity(user, lp_amount)
                        if success:
                            # Transfer tokens back (pool.token_b is always NXT)
                            # Transfer ERC-20 token (token_a)
                            if pool.token_a in dex.tokens:
                                dex.tokens[pool.token_a].transfer(selected_pool, user, amount_a)
                            # Transfer NXT (token_b) via adapter
                            if dex.nxt_adapter:
                                dex.nxt_adapter.transfer(selected_pool, user, amount_b)
                            st.success(f"✅ {message}")
                            st.rerun()
                        else:
                            st.error(f"❌ {message}")
        else:
            st.info("You don't have any liquidity positions")


def render_pools_overview(dex: DEXEngine):
    """Render all pools overview"""
    st.subheader("🏊 Liquidity Pools")
    
    pools_data = []
    for pool in dex.pools.values():
        pools_data.append({
            'Pool': pool.get_pool_id(),
            f'{pool.token_a} Reserve': f"{pool.reserve_a:.2f}",
            f'{pool.token_b} Reserve': f"{pool.reserve_b:.2f}",
            'TVL': f"{pool.reserve_a + pool.reserve_b:.2f}",
            'Volume': f"{pool.total_volume_a + pool.total_volume_b:.2f}",
            'Fees Collected': f"{pool.total_fees_collected:.4f}",
            'LPs': pool.to_dict()['liquidity_providers']
        })
    
    if pools_data:
        df = pd.DataFrame(pools_data)
        st.dataframe(df, width="stretch", hide_index=True)
    else:
        st.info("No liquidity pools created yet")


def render_user_portfolio(dex: DEXEngine):
    """Render user's token balances and positions"""
    st.subheader("👛 Your Portfolio")
    
    user = st.session_state.user_address
    
    # Token balances
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Token Balances**")
        balances = dex.get_user_balances(user)
        
        if balances:
            balance_data = [
                {'Token': symbol, 'Balance': f"{amount:.4f}"}
                for symbol, amount in balances.items()
            ]
            df = pd.DataFrame(balance_data)
            st.dataframe(df, width="stretch", hide_index=True)
        else:
            st.info("No token balances")
    
    with col2:
        st.markdown("**LP Positions**")
        lp_positions = []
        
        for pool_id, pool in dex.pools.items():
            lp_balance = pool.lp_balances.get(user, 0)
            if lp_balance > 0:
                lp_positions.append({
                    'Pool': pool_id,
                    'LP Tokens': f"{lp_balance:.4f}",
                    'Share': f"{pool.get_pool_share(user):.2f}%"
                })
        
        if lp_positions:
            df = pd.DataFrame(lp_positions)
            st.dataframe(df, width="stretch", hide_index=True)
        else:
            st.info("No LP positions")


def render_pool_ecosystem_tab(dex: DEXEngine):
    """Render Pool Ecosystem hierarchy and DEX integration"""
    st.subheader("🏛️ Pool Ecosystem Architecture")
    st.info("💡 The DEX is supported by the F_floor foundation, which is backed by reserve pools. All DEX trading fees flow back to support the BHLS floor and validators.")
    
    # Get pool ecosystem
    ecosystem = get_pool_ecosystem()
    
    # Show hierarchical structure
    st.markdown("### 3-Layer Hierarchical Structure")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("#### 🔵 Layer 1: Reserve Pools")
        st.markdown("**Supports F_floor foundation**")
        reserve_pools = ecosystem.get_pools_by_layer(PoolLayer.RESERVE)
        for pool in reserve_pools:
            with st.expander(f"📦 {pool.name}"):
                st.write(f"**Type**: {pool.pool_type.value}")
                st.write(f"**Description**: {pool.description}")
                st.metric("Balance", f"{pool.metrics.current_balance:.2f} NXT")
                st.metric("Participants", pool.metrics.participant_count)
                health = "✅ Healthy" if pool.is_healthy() else "⚠️ Needs Attention"
                st.write(f"**Status**: {health}")
    
    with col2:
        st.markdown("#### 🟢 Layer 2: F_floor Foundation")
        st.markdown("**Enables all economic activities**")
        f_floor = ecosystem.get_pool("F_FLOOR_POOL")
        if f_floor:
            with st.expander(f"💎 {f_floor.name}"):
                st.write(f"**Description**: {f_floor.description}")
                st.write(f"**Supported by**: {f_floor.supported_by}")
                st.metric("Balance", f"{f_floor.metrics.current_balance:.2f} NXT")
                st.metric("Participants", f_floor.metrics.participant_count)
                st.write(f"**Supports {len(f_floor.supports)} service pools**:")
                for supported in f_floor.supports[:3]:
                    st.caption(f"• {supported}")
                if len(f_floor.supports) > 3:
                    st.caption(f"...and {len(f_floor.supports) - 3} more")
    
    with col3:
        st.markdown("#### 🟡 Layer 3: Service Pools")
        st.markdown("**All economic activities**")
        service_pools = ecosystem.get_pools_by_layer(PoolLayer.SERVICE)
        
        # Highlight DEX pool
        dex_pool = ecosystem.get_pool("DEX_POOL")
        if dex_pool:
            with st.expander(f"💱 {dex_pool.name} (YOU ARE HERE)", expanded=True):
                st.write(f"**Description**: {dex_pool.description}")
                st.write(f"**Supported by**: {dex_pool.supported_by}")
                st.metric("Balance", f"{dex_pool.metrics.current_balance:.2f} NXT")
                st.success("✅ DEX fees → F_floor → BHLS Support")
        
        st.caption(f"**{len(service_pools)} total service pools:**")
        for pool in service_pools[:5]:
            st.caption(f"• {pool.name}")
        if len(service_pools) > 5:
            st.caption(f"...and {len(service_pools) - 5} more")
    
    st.divider()
    
    # Flow diagram
    st.markdown("### 💰 Economic Flow")
    st.markdown("""
    ```
    Reserve Pools (VALIDATOR_POOL + TRANSITION_RESERVE + ECOSYSTEM_FUND)
            ⬇️ Support
    F_FLOOR_POOL (Basic Human Living Standards)
            ⬇️ Enables
    Service Pools (DEX + Investment + Staking + Environmental + 6 more)
            ⬆️ Fees flow back
    F_FLOOR_POOL (Strengthens foundation)
            ⬆️ Support flows
    Reserve Pools (Validator rewards + Ecosystem growth)
    ```
    """)
    
    st.divider()
    
    # All 10 Service Pools Dashboard
    st.markdown("### 🎯 All Service Pools (Enabled by F_floor)")
    
    service_pool_data = []
    for pool in service_pools:
        service_pool_data.append({
            'Pool Name': pool.name,
            'Type': pool.pool_type.value.replace('_', ' ').title(),
            'Balance': f"{pool.metrics.current_balance:.2f} NXT",
            'Participants': pool.metrics.participant_count,
            'Status': "✅ Healthy" if pool.is_healthy() else "⚠️ Attention",
            'Utilization': f"{pool.metrics.calculate_utilization():.1f}%"
        })
    
    if service_pool_data:
        df = pd.DataFrame(service_pool_data)
        st.dataframe(df, width="stretch", hide_index=True)
        
        # Service pool distribution chart
        st.markdown("### 📊 Service Pool Distribution")
        pool_balances = [ecosystem.get_pool(pid).metrics.current_balance for pid in ecosystem.hierarchy[PoolLayer.SERVICE] if ecosystem.get_pool(pid)]
        pool_names = [ecosystem.get_pool(pid).name for pid in ecosystem.hierarchy[PoolLayer.SERVICE] if ecosystem.get_pool(pid)]
        
        fig = go.Figure(data=[go.Pie(
            labels=pool_names,
            values=pool_balances,
            hole=0.4,
            marker=dict(colors=px.colors.qualitative.Set3)
        )])
        fig.update_layout(
            title="Distribution Across Service Pools",
            height=400
        )
        st.plotly_chart(fig, width="stretch")
    
    st.divider()
    
    # Ecosystem Health Verification
    st.markdown("### 🔍 Ecosystem Health Verification")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # F_floor support verification
        support_report = ecosystem.verify_f_floor_support()
        
        st.metric("Reserve Total", f"{support_report.get('reserve_total', 0):.2f} NXT")
        st.metric("F_floor Balance", f"{support_report.get('f_floor_balance', 0):.2f} NXT")
        st.metric("Service Pools Total", f"{support_report.get('service_total', 0):.2f} NXT")
        st.metric("Service Pool Count", support_report.get('service_pool_count', 0))
        
        hierarchy_valid = support_report.get('hierarchy_valid', False)
        if hierarchy_valid:
            st.success("✅ Hierarchy Valid: Reserves → F_floor → Services")
        else:
            st.error("❌ Hierarchy needs attention")
    
    with col2:
        # Overall ecosystem health
        health_report = ecosystem.get_ecosystem_health()
        
        for layer_name, layer_health in health_report['by_layer'].items():
            st.markdown(f"**{layer_name.title()} Layer**")
            health_pct = layer_health['health_percentage']
            
            if health_pct == 100:
                st.success(f"✅ {layer_health['healthy_pools']}/{layer_health['total_pools']} pools healthy ({health_pct:.0f}%)")
            elif health_pct >= 75:
                st.info(f"ℹ️ {layer_health['healthy_pools']}/{layer_health['total_pools']} pools healthy ({health_pct:.0f}%)")
            else:
                st.warning(f"⚠️ {layer_health['healthy_pools']}/{layer_health['total_pools']} pools healthy ({health_pct:.0f}%)")
        
        st.divider()
        overall = health_report['overall']
        st.metric("Overall Ecosystem Health", f"{overall['health_percentage']:.1f}%")
        st.caption(f"{overall['healthy_pools']}/{overall['total_pools']} pools healthy")


def render_price_charts(dex: DEXEngine):
    """Render price charts with candlestick visualization"""
    st.subheader("📈 Price Charts")
    
    if not dex.pools:
        st.info("No pools available. Create a pool to see price charts.")
        return
    
    # Pool selector
    pool_options = list(dex.pools.keys())
    selected_pool = st.selectbox("Select Trading Pair", pool_options, key="chart_pool")
    
    if selected_pool:
        pool = dex.pools[selected_pool]
        
        # Current price display
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            price = pool.get_price(pool.token_a)
            st.metric(f"1 {pool.token_a}", f"{price:.6f} {pool.token_b}")
        with col2:
            st.metric("TVL", f"{pool.reserve_a + pool.reserve_b:.2f}")
        with col3:
            st.metric("24h Volume", f"{pool.total_volume_a + pool.total_volume_b:.2f}")
        with col4:
            st.metric("Fees (0.3%)", f"{pool.total_fees_collected:.4f}")
        
        st.divider()
        
        # Generate simulated price history for visualization
        import numpy as np
        import random
        
        # Initialize or get price history from session state
        history_key = f"price_history_{selected_pool}"
        if history_key not in st.session_state:
            base_price = pool.get_price(pool.token_a)
            prices = []
            current = base_price
            for i in range(100):
                change = random.uniform(-0.02, 0.02) * current
                current = max(0.0001, current + change)
                prices.append({
                    'time': i,
                    'open': current,
                    'high': current * (1 + random.uniform(0, 0.01)),
                    'low': current * (1 - random.uniform(0, 0.01)),
                    'close': current * (1 + random.uniform(-0.005, 0.005)),
                    'volume': random.uniform(10, 1000)
                })
            st.session_state[history_key] = prices
        
        prices = st.session_state[history_key]
        
        # Candlestick chart
        fig = go.Figure(data=[go.Candlestick(
            x=[p['time'] for p in prices],
            open=[p['open'] for p in prices],
            high=[p['high'] for p in prices],
            low=[p['low'] for p in prices],
            close=[p['close'] for p in prices],
            increasing_line_color='#10b981',
            decreasing_line_color='#ef4444'
        )])
        
        fig.update_layout(
            title=f"{pool.token_a}/{pool.token_b} Price Chart",
            yaxis_title="Price",
            xaxis_title="Time",
            template="plotly_dark",
            height=400,
            xaxis_rangeslider_visible=False
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Volume chart
        fig_vol = go.Figure(data=[go.Bar(
            x=[p['time'] for p in prices],
            y=[p['volume'] for p in prices],
            marker_color='#667eea'
        )])
        fig_vol.update_layout(
            title="Trading Volume",
            yaxis_title="Volume",
            xaxis_title="Time",
            template="plotly_dark",
            height=200
        )
        st.plotly_chart(fig_vol, use_container_width=True)
        
        # Price depth visualization
        st.markdown("### 📊 Liquidity Depth")
        
        col1, col2 = st.columns(2)
        
        # Guard against zero reserves
        max_reserve = max(pool.reserve_a, pool.reserve_b)
        depth_a = pool.reserve_a / max_reserve if max_reserve > 0 else 0.0
        depth_b = pool.reserve_b / max_reserve if max_reserve > 0 else 0.0
        
        with col1:
            st.markdown(f"**{pool.token_a} Reserve**")
            st.progress(min(1.0, depth_a))
            st.caption(f"{pool.reserve_a:.4f} {pool.token_a}")
        
        with col2:
            st.markdown(f"**{pool.token_b} Reserve**")
            st.progress(min(1.0, depth_b))
            st.caption(f"{pool.reserve_b:.4f} {pool.token_b}")


def render_trade_history(dex: DEXEngine):
    """Render trade history and recent transactions"""
    st.subheader("📜 Trade History")
    
    # Initialize trade history in session state
    if 'trade_history' not in st.session_state:
        st.session_state.trade_history = []
    
    # Display recent trades
    if st.session_state.trade_history:
        trades_df = pd.DataFrame(st.session_state.trade_history[-50:][::-1])  # Last 50, newest first
        
        st.markdown("### Recent Trades")
        st.dataframe(trades_df, use_container_width=True, hide_index=True)
        
        # Trade volume by pair
        if len(st.session_state.trade_history) > 0:
            st.markdown("### Volume by Pair")
            pair_volumes = {}
            for trade in st.session_state.trade_history:
                pair = trade.get('pair', 'Unknown')
                pair_volumes[pair] = pair_volumes.get(pair, 0) + trade.get('amount', 0)
            
            fig = px.pie(
                values=list(pair_volumes.values()),
                names=list(pair_volumes.keys()),
                title="Trading Volume Distribution",
                color_discrete_sequence=px.colors.qualitative.Set3
            )
            fig.update_layout(template="plotly_dark", height=300)
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No trades yet. Start swapping to see your trade history!")
    
    st.divider()
    
    # Pool activity summary
    st.markdown("### Pool Activity Summary")
    
    if dex.pools:
        activity_data = []
        for pool_id, pool in dex.pools.items():
            activity_data.append({
                'Pool': pool_id,
                'Total Volume A': f"{pool.total_volume_a:.2f}",
                'Total Volume B': f"{pool.total_volume_b:.2f}",
                'Total Fees': f"{pool.total_fees_collected:.4f}",
                'LP Providers': len(pool.lp_balances)
            })
        
        df = pd.DataFrame(activity_data)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("No pools created yet.")
    
    # DEX statistics
    st.markdown("### DEX Statistics")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Swaps", dex.total_swaps)
    with col2:
        st.metric("Total Volume", f"{dex.total_volume:.2f}")
    with col3:
        st.metric("Fees to Validators", f"{dex.total_fees_to_validators:.4f}")


def render_token_factory(dex: DEXEngine):
    """Render token creation interface"""
    st.subheader("🏭 Token Factory")
    st.markdown("**Create your own tokens on NexusOS**")
    
    st.info("""
    💡 **Token Creation Guide:**
    - Tokens are ERC-20 compatible fungible tokens
    - All tokens can be paired with NXT for trading
    - Creator receives the initial supply
    - Token symbol must be unique
    """)
    
    st.divider()
    
    # Token creation form
    st.markdown("### Create New Token")
    
    with st.form("create_token_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            symbol = st.text_input(
                "Token Symbol",
                placeholder="e.g., MYTOKEN",
                max_chars=10,
                help="3-10 character symbol (uppercase recommended)"
            )
            
            name = st.text_input(
                "Token Name",
                placeholder="e.g., My Awesome Token",
                help="Full name of your token"
            )
        
        with col2:
            initial_supply = st.number_input(
                "Initial Supply",
                min_value=1.0,
                max_value=1_000_000_000_000.0,
                value=1_000_000.0,
                step=1000.0,
                help="Total tokens to create"
            )
            
            decimals = st.selectbox(
                "Decimals",
                options=[6, 8, 18],
                index=2,
                help="Precision (18 is standard)"
            )
        
        creator = st.session_state.get('user_address', 'dex_user_1')
        st.caption(f"Creator: {creator}")
        
        submit = st.form_submit_button("🚀 Create Token", type="primary", use_container_width=True)
        
        if submit:
            if not symbol or not name:
                st.error("Please fill in all fields")
            elif symbol.upper() == "NXT":
                st.error("Cannot create NXT - it's the native token")
            elif symbol.upper() in dex.tokens:
                st.error(f"Token {symbol.upper()} already exists")
            else:
                success, message = dex.create_token(
                    symbol.upper(),
                    name,
                    initial_supply,
                    creator,
                    decimals
                )
                if success:
                    st.success(f"✅ {message}")
                    st.balloons()
                else:
                    st.error(f"❌ {message}")
    
    st.divider()
    
    # Existing tokens list
    st.markdown("### 📋 All Tokens")
    
    tokens_data = []
    for symbol, token in dex.tokens.items():
        tokens_data.append({
            'Symbol': symbol,
            'Name': token.name,
            'Supply': f"{token.total_supply:,.0f}",
            'Decimals': token.decimals,
            'Holders': len(token.balances),
            'Creator': token.creator[:15] + "..." if len(token.creator) > 15 else token.creator
        })
    
    # Add NXT as native token
    tokens_data.insert(0, {
        'Symbol': '🌟 NXT',
        'Name': 'NexusOS Native Token',
        'Supply': '1,000,000 (Fixed)',
        'Decimals': 8,
        'Holders': 'Native',
        'Creator': 'Genesis'
    })
    
    df = pd.DataFrame(tokens_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    st.caption(f"📊 **{len(dex.tokens) + 1} tokens** available for trading")


def render_lp_farming(dex: DEXEngine):
    """
    Render LP Farming interface with physics-based rewards
    Uses E=hf energy economics for yield calculation
    """
    from farming_core import initialize_farming, get_farming_engine, TIER_CONFIG, FarmTier
    
    st.subheader("🌾 LP Farming")
    st.markdown("**Stake LP tokens to earn NXT rewards using E=hf physics**")
    
    user = st.session_state.get('user_address', 'dex_user_1')
    
    nxt_adapter = dex.nxt_adapter if hasattr(dex, 'nxt_adapter') else None
    farming = initialize_farming(dex, nxt_adapter)
    
    farm_tabs = st.tabs(["🏆 Farms", "📊 My Positions", "🔬 Physics", "📈 Analytics"])
    
    with farm_tabs[0]:
        render_farm_list(dex, farming, user)
    
    with farm_tabs[1]:
        render_my_farming_positions(farming, user)
    
    with farm_tabs[2]:
        render_farming_physics()
    
    with farm_tabs[3]:
        render_farming_analytics(farming)


def render_farm_list(dex, farming, user: str):
    """Render list of available farms"""
    from farming_core import TIER_CONFIG
    
    st.markdown("### 🏆 Active Farms")
    
    st.info("""
    🌾 **How LP Farming Works:**
    1. Provide liquidity to any pool → receive LP tokens
    2. Stake your LP tokens in the farm → earn NXT rewards  
    3. Higher TVL pools = higher frequency = more energy (E=hf)
    4. Claim rewards anytime or let them compound
    """)
    
    if not dex.pools:
        st.warning("No pools available for farming. Create a pool first!")
        return
    
    for pool_id, pool in dex.pools.items():
        farm = farming.get_or_create_farm(pool_id)
        if farm is None:
            continue
        
        tier = farm.get_tier()
        tier_config = TIER_CONFIG[tier]
        apy = farm.calculate_apy()
        
        user_lp_balance = pool.lp_balances.get(user, 0)
        user_info = farm.get_user_info(user)
        user_staked = user_info['staked_lp'] if user_info else 0
        user_pending = user_info['pending_rewards'] if user_info else 0
        available_to_stake = user_lp_balance
        
        with st.container():
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                        border: 2px solid {tier_config['color']}; 
                        border-radius: 12px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: #00d4ff; margin: 0;">🌾 {pool_id} Farm</h4>
                    <span style="background: {tier_config['color']}; color: white; padding: 4px 12px; 
                                 border-radius: 20px; font-size: 12px; font-weight: bold;">
                        {tier.value}
                    </span>
                </div>
                <p style="color: #a0a0a0; margin-top: 5px; font-size: 13px;">{tier_config['description']}</p>
            </div>
            """, unsafe_allow_html=True)
            
            col1, col2, col3, col4, col5 = st.columns(5)
            with col1:
                st.metric("TVL", f"{farm.total_value_locked:,.2f} NXT")
            with col2:
                st.metric("APY", f"{apy:.1f}%", delta=f"{tier_config['multiplier']}x")
            with col3:
                st.metric("Stakers", f"{len(farm.stakers)}")
            with col4:
                st.metric("Your Staked", f"{user_staked:.4f} LP")
            with col5:
                st.metric("Pending", f"{user_pending:.4f} NXT")
            
            col_stake, col_unstake, col_claim = st.columns(3)
            
            with col_stake:
                st.markdown("**Stake LP Tokens**")
                stake_amount = st.number_input(
                    "Amount to stake",
                    min_value=0.0,
                    max_value=float(max(0, available_to_stake)),
                    value=0.0,
                    step=0.1,
                    key=f"farm_stake_{pool_id}",
                    label_visibility="collapsed"
                )
                st.caption(f"Available: {available_to_stake:.4f} LP")
                if st.button("🌾 Stake LP", key=f"btn_farm_stake_{pool_id}", use_container_width=True):
                    if stake_amount > 0:
                        success, msg = farming.stake_lp(user, pool_id, stake_amount)
                        if success:
                            st.success(f"✅ {msg}")
                            st.rerun()
                        else:
                            st.error(f"❌ {msg}")
                    else:
                        st.warning("Enter an amount to stake")
            
            with col_unstake:
                st.markdown("**Unstake LP Tokens**")
                unstake_amount = st.number_input(
                    "Amount to unstake",
                    min_value=0.0,
                    max_value=float(user_staked),
                    value=0.0,
                    step=0.1,
                    key=f"farm_unstake_{pool_id}",
                    label_visibility="collapsed"
                )
                st.caption(f"Staked: {user_staked:.4f} LP")
                if st.button("📤 Unstake + Claim", key=f"btn_farm_unstake_{pool_id}", use_container_width=True):
                    if unstake_amount > 0:
                        success, rewards, msg = farming.unstake_lp(user, pool_id, unstake_amount)
                        if success:
                            st.success(f"✅ {msg}")
                            st.rerun()
                        else:
                            st.error(f"❌ {msg}")
                    else:
                        st.warning("Enter an amount to unstake")
            
            with col_claim:
                st.markdown("**Claim Rewards**")
                st.markdown(f"**{user_pending:.4f} NXT** pending")
                st.caption("Rewards auto-compound if not claimed")
                if st.button("💰 Claim NXT", key=f"btn_farm_claim_{pool_id}", 
                            use_container_width=True, disabled=(user_pending <= 0)):
                    success, rewards, msg = farming.claim_rewards(user, pool_id)
                    if success:
                        st.success(f"✅ {msg}")
                        st.rerun()
                    else:
                        st.info(msg)
            
            st.divider()


def render_my_farming_positions(farming, user: str):
    """Render user's farming positions summary"""
    st.markdown("### 📊 My Farming Positions")
    
    positions = farming.get_user_farms(user)
    
    if not positions:
        st.info("You have no active farming positions. Stake LP tokens to start earning!")
        return
    
    total_staked_value = 0
    total_pending = 0
    total_claimed = 0
    
    for pos in positions:
        total_pending += pos.get('pending_rewards', 0)
        total_claimed += pos.get('total_claimed', 0)
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Active Farms", len(positions))
    with col2:
        st.metric("Total Pending", f"{total_pending:.4f} NXT")
    with col3:
        st.metric("Total Claimed", f"{total_claimed:.4f} NXT")
    with col4:
        if st.button("💰 Claim All Rewards", type="primary", use_container_width=True):
            success, rewards, msg = farming.claim_all_rewards(user)
            if success:
                st.success(f"✅ {msg}")
                st.rerun()
            else:
                st.info(msg)
    
    st.divider()
    
    st.markdown("### Position Details")
    
    for pos in positions:
        with st.expander(f"🌾 {pos['pool_id']} - {pos['staked_lp']:.4f} LP staked", expanded=True):
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Staked LP", f"{pos['staked_lp']:.4f}")
                st.caption(f"Pool share: {pos['share_percent']:.2f}%")
            with col2:
                st.metric("Pending Rewards", f"{pos['pending_rewards']:.4f} NXT")
                st.caption(f"APY: {pos.get('apy', 0):.1f}%")
            with col3:
                st.metric("Total Claimed", f"{pos['total_claimed']:.4f} NXT")
                st.caption(f"Staked for: {pos['stake_duration_days']:.1f} days")


def render_farming_physics():
    """Render physics explanation of farming rewards"""
    import plotly.graph_objects as go
    from farming_core import TIER_CONFIG, FarmTier, PLANCK_CONSTANT, SPEED_OF_LIGHT
    import math
    
    st.markdown("### 🔬 E=hf Farming Physics")
    
    st.markdown("""
    NexusOS farming rewards follow Planck's quantum energy equation: **E = hf**
    
    - **E** = Energy (rewards)
    - **h** = Planck's constant
    - **f** = Frequency (determined by pool activity)
    
    Higher TVL pools operate at "higher frequencies", producing more energy rewards.
    This creates natural incentives for liquidity concentration.
    """)
    
    st.divider()
    
    st.markdown("### 🌈 Energy Tiers (Electromagnetic Spectrum)")
    
    tiers_data = []
    for tier in [FarmTier.GAMMA, FarmTier.XRAY, FarmTier.UV, FarmTier.VISIBLE, FarmTier.INFRARED]:
        config = TIER_CONFIG[tier]
        wavelength_m = config["wavelength_nm"] * 1e-9
        frequency = SPEED_OF_LIGHT / wavelength_m
        energy = PLANCK_CONSTANT * frequency
        
        log_freq = math.log10(frequency)
        base_apy = 10 + (log_freq - 14) * 100
        final_apy = max(10, min(500, base_apy * config["multiplier"]))
        
        tiers_data.append({
            "tier": tier.value,
            "wavelength": config["wavelength_nm"],
            "frequency": frequency,
            "energy": energy,
            "multiplier": config["multiplier"],
            "min_tvl": config["min_tvl"],
            "apy": final_apy,
            "color": config["color"]
        })
    
    for t in tiers_data:
        st.markdown(f"""
        <div style="background: linear-gradient(90deg, {t['color']}22 0%, transparent 100%);
                    border-left: 4px solid {t['color']};
                    padding: 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0;">
            <h4 style="color: {t['color']}; margin: 0;">{t['tier']}</h4>
            <p style="color: #e0e0e0; margin: 5px 0;">
                λ = {t['wavelength']:.2f} nm | f = {t['frequency']:.2e} Hz | E = {t['energy']:.2e} J
            </p>
            <p style="color: #a0a0a0; font-size: 13px;">
                Min TVL: {t['min_tvl']:,} NXT | Multiplier: {t['multiplier']}x | Est. APY: {t['apy']:.0f}%
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    wavelengths = [t["wavelength"] for t in tiers_data]
    apys = [t["apy"] for t in tiers_data]
    colors = [t["color"] for t in tiers_data]
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=wavelengths,
        y=apys,
        mode='markers+lines',
        marker=dict(size=20, color=colors),
        line=dict(color='#667eea', width=2),
        text=[t["tier"] for t in tiers_data],
        hovertemplate="<b>%{text}</b><br>Wavelength: %{x} nm<br>APY: %{y:.1f}%<extra></extra>"
    ))
    
    fig.update_layout(
        title="Energy Tier APY by Wavelength (E=hf)",
        xaxis_title="Wavelength (nm) - Log Scale",
        yaxis_title="APY (%)",
        xaxis_type="log",
        template="plotly_dark",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_farming_analytics(farming):
    """Render farming analytics dashboard"""
    import plotly.express as px
    
    st.markdown("### 📈 Farming Analytics")
    
    stats = farming.get_stats()
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Farms", stats["total_farms"])
    with col2:
        st.metric("Total TVL", f"{stats['total_tvl']:,.2f} NXT")
    with col3:
        st.metric("Total Stakers", stats["total_stakers"])
    with col4:
        st.metric("Rewards Distributed", f"{stats['total_rewards_distributed']:,.4f} NXT")
    
    st.divider()
    
    farms = farming.get_all_farms()
    
    if farms:
        st.markdown("### Farm Performance")
        
        df_farms = pd.DataFrame(farms)
        
        if not df_farms.empty and 'tvl' in df_farms.columns:
            fig_tvl = px.bar(
                df_farms,
                x='pool_id',
                y='tvl',
                color='tier',
                title='Total Value Locked by Farm',
                labels={'tvl': 'TVL (NXT)', 'pool_id': 'Farm'},
                color_discrete_map={
                    'Gamma Ray': '#FF00FF',
                    'X-Ray': '#9400D3',
                    'Ultraviolet': '#8A2BE2',
                    'Visible': '#00FF00',
                    'Infrared': '#FF4500'
                }
            )
            fig_tvl.update_layout(template="plotly_dark")
            st.plotly_chart(fig_tvl, use_container_width=True)
            
            fig_apy = px.bar(
                df_farms,
                x='pool_id',
                y='apy',
                color='tier',
                title='APY by Farm (E=hf Based)',
                labels={'apy': 'APY (%)', 'pool_id': 'Farm'},
                color_discrete_map={
                    'Gamma Ray': '#FF00FF',
                    'X-Ray': '#9400D3',
                    'Ultraviolet': '#8A2BE2',
                    'Visible': '#00FF00',
                    'Infrared': '#FF4500'
                }
            )
            fig_apy.update_layout(template="plotly_dark")
            st.plotly_chart(fig_apy, use_container_width=True)
        
        st.markdown("### Farm Details")
        st.dataframe(
            df_farms[['pool_id', 'tvl', 'apy', 'tier', 'multiplier', 'staker_count', 'total_rewards_distributed']],
            use_container_width=True,
            hide_index=True,
            column_config={
                'pool_id': 'Farm',
                'tvl': st.column_config.NumberColumn('TVL (NXT)', format="%.2f"),
                'apy': st.column_config.NumberColumn('APY', format="%.1f%%"),
                'tier': 'Energy Tier',
                'multiplier': st.column_config.NumberColumn('Multiplier', format="%.1fx"),
                'staker_count': 'Stakers',
                'total_rewards_distributed': st.column_config.NumberColumn('Rewards Paid', format="%.4f")
            }
        )
    else:
        st.info("No farming data available yet. Stake LP tokens to start earning!")


def render_analytics(dex: DEXEngine):
    """Render DEX analytics and charts"""
    st.subheader("📊 Analytics")
    
    # Overall stats
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Pools", len(dex.pools))
    with col2:
        st.metric("Total Tokens", len(dex.tokens))
    with col3:
        st.metric("Total Swaps", dex.total_swaps)
    with col4:
        total_tvl = sum(p.reserve_a + p.reserve_b for p in dex.pools.values())
        st.metric("Total TVL", f"{total_tvl:.2f}")
    
    # Pool comparison
    if dex.pools:
        st.markdown("**Pool Comparison**")
        
        pool_data = []
        for pool in dex.pools.values():
            pool_data.append({
                'Pool': pool.get_pool_id(),
                'TVL': pool.reserve_a + pool.reserve_b,
                'Volume': pool.total_volume_a + pool.total_volume_b,
                'Fees': pool.total_fees_collected
            })
        
        df = pd.DataFrame(pool_data)
        
        # TVL comparison
        fig = px.bar(
            df,
            x='Pool',
            y='TVL',
            title='Total Value Locked by Pool',
            labels={'TVL': 'Total Value Locked'},
            color='TVL',
            color_continuous_scale='Blues'
        )
        st.plotly_chart(fig, width="stretch")
        
        # Volume comparison
        fig2 = px.bar(
            df,
            x='Pool',
            y='Volume',
            title='Trading Volume by Pool',
            labels={'Volume': 'Total Volume'},
            color='Volume',
            color_continuous_scale='Greens'
        )
        st.plotly_chart(fig2, width="stretch")


def render_dex_page():
    """Main DEX page renderer"""
    st.title("🏦 DEX - Decentralized Exchange")
    st.markdown("**Automated Market Maker with Liquidity Pools**")
    
    # Initialize DEX
    dex = initialize_dex()
    
    # Navigation tabs - Enhanced with new features
    tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8, tab9, tab10 = st.tabs([
        "💱 Swap",
        "📈 Charts",
        "💧 Liquidity",
        "🌾 Farming",
        "🏊 Pools",
        "👛 Portfolio",
        "📜 History",
        "🏭 Token Factory",
        "📊 Analytics",
        "🏛️ Pool Ecosystem"
    ])
    
    with tab1:
        render_swap_interface(dex)
    
    with tab2:
        render_price_charts(dex)
    
    with tab3:
        render_liquidity_interface(dex)
    
    with tab4:
        render_lp_farming(dex)
    
    with tab5:
        render_pools_overview(dex)
    
    with tab6:
        render_user_portfolio(dex)
    
    with tab7:
        render_trade_history(dex)
    
    with tab8:
        render_token_factory(dex)
    
    with tab9:
        render_analytics(dex)
    
    with tab10:
        render_pool_ecosystem_tab(dex)
    
    # Nexus AI Research Report for Researchers
    st.divider()
    from nexus_ai import render_nexus_ai_button
    
    # Get sample DEX data for AI analysis
    pools = list(dex.pools.values())
    sample_pool = pools[0] if pools else None
    render_nexus_ai_button('dex', {
        'pair': f"{sample_pool.token_a}/{sample_pool.token_b}" if sample_pool else 'NXT/TOKEN',
        'liquidity': sample_pool.reserve_a + sample_pool.reserve_b if sample_pool else 0,
        'volume': sample_pool.total_volume_a + sample_pool.total_volume_b if sample_pool else 0,
        'price_impact': 0.5  # Sample value
    })


if __name__ == "__main__":
    render_dex_page()
