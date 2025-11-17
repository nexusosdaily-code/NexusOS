"""
Blockchain Visualization Dashboard
Real-time visualization of Layer 1 blockchain simulation with stress testing
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from blockchain_sim import BlockchainSimulator, ConsensusType, STRESS_TEST_SCENARIOS, ValidatorStatus
import time


def create_network_graph(blockchain: BlockchainSimulator):
    """Create network topology visualization"""
    # Create nodes for validators
    active_validators = [v for v in blockchain.validators.values() if v.status == ValidatorStatus.ACTIVE]
    offline_validators = [v for v in blockchain.validators.values() if v.status == ValidatorStatus.OFFLINE]
    faulty_validators = [v for v in blockchain.validators.values() if v.status == ValidatorStatus.FAULTY]
    
    # Node positions in a circle
    num_validators = len(blockchain.validators)
    angles = np.linspace(0, 2 * np.pi, num_validators, endpoint=False)
    
    node_x = []
    node_y = []
    node_colors = []
    node_text = []
    node_sizes = []
    
    for i, (addr, validator) in enumerate(blockchain.validators.items()):
        x = np.cos(angles[i])
        y = np.sin(angles[i])
        node_x.append(x)
        node_y.append(y)
        
        # Color based on status
        if validator.status == ValidatorStatus.ACTIVE:
            color = 'green'
        elif validator.status == ValidatorStatus.OFFLINE:
            color = 'red'
        elif validator.status == ValidatorStatus.FAULTY:
            color = 'orange'
        else:
            color = 'gray'
        
        node_colors.append(color)
        node_text.append(f"{validator.address[:15]}...<br>Stake: {validator.stake:.0f}<br>Status: {validator.status.value}")
        node_sizes.append(20 + validator.stake / 100)  # Size based on stake
    
    # Create edges for mesh network
    edge_x = []
    edge_y = []
    
    for i in range(num_validators):
        for j in range(i + 1, num_validators):
            # Only draw edges for active validators
            if (list(blockchain.validators.values())[i].status == ValidatorStatus.ACTIVE and
                list(blockchain.validators.values())[j].status == ValidatorStatus.ACTIVE):
                # Draw some edges randomly (not all for clarity)
                if np.random.random() < 0.3:  # 30% of possible edges
                    edge_x.extend([node_x[i], node_x[j], None])
                    edge_y.extend([node_y[i], node_y[j], None])
    
    # Create figure
    fig = go.Figure()
    
    # Add edges
    fig.add_trace(go.Scatter(
        x=edge_x, y=edge_y,
        mode='lines',
        line=dict(color='rgba(100,100,100,0.2)', width=0.5),
        hoverinfo='none',
        showlegend=False
    ))
    
    # Add nodes
    fig.add_trace(go.Scatter(
        x=node_x, y=node_y,
        mode='markers+text',
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(color='white', width=2)
        ),
        text=[addr[:8] for addr in blockchain.validators.keys()],
        textposition="top center",
        hovertext=node_text,
        hoverinfo='text',
        showlegend=False
    ))
    
    fig.update_layout(
        title="Validator Network Topology",
        showlegend=False,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=500,
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )
    
    return fig


def create_performance_charts(blockchain: BlockchainSimulator):
    """Create performance monitoring charts"""
    # Create subplots
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=('TPS Over Time', 'Block Time', 'Chain Growth', 'Fee Burn Rate'),
        specs=[[{'type': 'scatter'}, {'type': 'scatter'}],
               [{'type': 'scatter'}, {'type': 'scatter'}]]
    )
    
    # TPS history
    if blockchain.tps_history:
        fig.add_trace(
            go.Scatter(
                y=blockchain.tps_history,
                mode='lines',
                name='TPS',
                line=dict(color='blue', width=2)
            ),
            row=1, col=1
        )
    
    # Block time
    if blockchain.block_times:
        fig.add_trace(
            go.Scatter(
                y=blockchain.block_times,
                mode='lines',
                name='Block Time (s)',
                line=dict(color='green', width=2)
            ),
            row=1, col=2
        )
    
    # Chain height over time
    chain_heights = list(range(len(blockchain.chain)))
    fig.add_trace(
        go.Scatter(
            y=chain_heights,
            mode='lines',
            name='Chain Height',
            line=dict(color='purple', width=2)
        ),
        row=2, col=1
    )
    
    # Calculate cumulative fees burned
    cumulative_fees = [blockchain.total_fees_burned]  # Simplified
    fig.add_trace(
        go.Scatter(
            y=cumulative_fees,
            mode='lines',
            name='Fees Burned',
            line=dict(color='red', width=2),
            fill='tozeroy'
        ),
        row=2, col=2
    )
    
    fig.update_xaxes(title_text="Block", row=1, col=1)
    fig.update_xaxes(title_text="Block", row=1, col=2)
    fig.update_xaxes(title_text="Block", row=2, col=1)
    fig.update_xaxes(title_text="Block", row=2, col=2)
    
    fig.update_yaxes(title_text="TPS", row=1, col=1)
    fig.update_yaxes(title_text="Seconds", row=1, col=2)
    fig.update_yaxes(title_text="Height", row=2, col=1)
    fig.update_yaxes(title_text="Total Fees", row=2, col=2)
    
    fig.update_layout(height=600, showlegend=False)
    
    return fig


def create_validator_status_chart(blockchain: BlockchainSimulator):
    """Create validator status pie chart"""
    status_counts = {
        'Active': sum(1 for v in blockchain.validators.values() if v.status == ValidatorStatus.ACTIVE),
        'Offline': sum(1 for v in blockchain.validators.values() if v.status == ValidatorStatus.OFFLINE),
        'Faulty': sum(1 for v in blockchain.validators.values() if v.status == ValidatorStatus.FAULTY),
        'Slashed': sum(1 for v in blockchain.validators.values() if v.status == ValidatorStatus.SLASHED)
    }
    
    fig = go.Figure(data=[go.Pie(
        labels=list(status_counts.keys()),
        values=list(status_counts.values()),
        hole=0.3,
        marker=dict(colors=['green', 'red', 'orange', 'gray'])
    )])
    
    fig.update_layout(
        title="Validator Status Distribution",
        height=400
    )
    
    return fig


def render_blockchain_dashboard():
    """Render the blockchain simulation dashboard"""
    st.title("⛓️ Layer 1 Blockchain Simulator")
    st.markdown("**Comprehensive blockchain model with stress testing and real-time visualization**")
    
    # Initialize blockchain in session state
    if 'blockchain' not in st.session_state:
        st.session_state.blockchain = BlockchainSimulator(
            num_validators=21,
            consensus_type=ConsensusType.PROOF_OF_STAKE,
            block_time=2.0
        )
        st.session_state.simulation_running = False
        st.session_state.stress_test_active = False
    
    blockchain = st.session_state.blockchain
    
    # Sidebar controls
    st.sidebar.header("⚙️ Blockchain Configuration")
    
    # Network health overview
    health = blockchain.get_network_health()
    
    st.sidebar.metric("Chain Height", f"{health['chain_height']:,}")
    st.sidebar.metric("Active Validators", f"{health['active_validators']}/{health['total_validators']}")
    st.sidebar.metric("Network Health", f"{health['validator_health']:.1f}%")
    
    if health['under_attack']:
        st.sidebar.error(f"🚨 UNDER ATTACK: {health['attack_type']}")
    else:
        st.sidebar.success("✅ Network Healthy")
    
    st.sidebar.divider()
    
    # Simulation controls
    st.sidebar.subheader("Simulation Controls")
    
    col1, col2 = st.sidebar.columns(2)
    
    with col1:
        if st.button("▶️ Run Simulation", use_container_width=True):
            st.session_state.simulation_running = True
    
    with col2:
        if st.button("⏸️ Pause", use_container_width=True):
            st.session_state.simulation_running = False
    
    num_blocks = st.sidebar.slider("Blocks to Mine", 1, 50, 10)
    txs_per_block = st.sidebar.slider("TXs per Block", 10, 200, 50)
    
    if st.sidebar.button("⛏️ Mine Blocks", use_container_width=True):
        with st.spinner(f"Mining {num_blocks} blocks..."):
            blockchain.run_simulation(num_blocks=num_blocks, transactions_per_block=txs_per_block)
        st.success(f"✅ Mined {num_blocks} blocks!")
        st.rerun()
    
    st.sidebar.divider()
    
    # Stress testing
    st.sidebar.subheader("🔥 Stress Testing")
    
    stress_scenario = st.sidebar.selectbox(
        "Select Stress Scenario",
        options=list(STRESS_TEST_SCENARIOS.keys())
    )
    
    scenario = STRESS_TEST_SCENARIOS[stress_scenario]
    
    st.sidebar.info(f"""
    **{scenario.name}**
    - Duration: {scenario.duration_blocks} blocks
    - Target TPS: {scenario.target_tps:,}
    - Validator Failure Rate: {scenario.validator_failure_rate * 100:.0f}%
    - Network Partition Prob: {scenario.network_partition_prob * 100:.0f}%
    - Attack Type: {scenario.attack_type}
    """)
    
    col1, col2 = st.sidebar.columns(2)
    
    with col1:
        if st.button("🔥 Apply Stress", use_container_width=True):
            blockchain.apply_stress_test(scenario)
            st.session_state.stress_test_active = True
            st.rerun()
    
    with col2:
        if st.button("🛡️ Recover", use_container_width=True):
            blockchain.recover_from_stress()
            st.session_state.stress_test_active = False
            st.rerun()
    
    # Main dashboard
    tabs = st.tabs(["📊 Overview", "🌐 Network", "📈 Performance", "📋 Blocks", "👥 Validators"])
    
    with tabs[0]:  # Overview
        st.header("Network Overview")
        
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        stats = blockchain.get_chain_stats()
        
        with col1:
            st.metric("Total Blocks", f"{stats['total_blocks']:,}")
        
        with col2:
            st.metric("Total TXs", f"{stats['total_transactions']:,}")
        
        with col3:
            st.metric("Avg TPS", f"{health['avg_tps']:.1f}")
        
        with col4:
            st.metric("Mempool", f"{health['mempool_size']:,}")
        
        st.divider()
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Value Transferred", f"{stats['total_value_transferred']:.2f}")
        
        with col2:
            st.metric("Fees Burned", f"{stats['total_fees_burned']:.2f}")
        
        with col3:
            st.metric("Total Supply", f"{stats['total_supply']:.2f}")
        
        with col4:
            st.metric("Accounts", f"{stats['num_accounts']:,}")
        
        st.divider()
        
        # Network status
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Consensus Mechanism")
            st.info(f"**{stats['consensus_type']}**")
            
            st.subheader("Network Health")
            health_pct = health['validator_health']
            if health_pct >= 80:
                st.success(f"Excellent: {health_pct:.1f}%")
            elif health_pct >= 60:
                st.warning(f"Good: {health_pct:.1f}%")
            else:
                st.error(f"Critical: {health_pct:.1f}%")
        
        with col2:
            # Validator status chart
            st.plotly_chart(create_validator_status_chart(blockchain), use_container_width=True)
    
    with tabs[1]:  # Network
        st.header("Network Topology")
        
        # Show network graph
        st.plotly_chart(create_network_graph(blockchain), use_container_width=True)
        
        # Network events
        st.subheader("Network Events")
        if blockchain.network_partitions:
            for partition in blockchain.network_partitions[-5:]:  # Last 5 partitions
                st.warning(f"⚠️ Network Partition: {len(partition.affected_validators)} validators affected ({partition.severity} severity)")
        else:
            st.success("No network partitions detected")
    
    with tabs[2]:  # Performance
        st.header("Performance Metrics")
        
        # Performance charts
        st.plotly_chart(create_performance_charts(blockchain), use_container_width=True)
        
        # Statistics table
        st.subheader("Performance Statistics")
        
        perf_data = {
            'Metric': ['Avg TPS', 'Avg Block Time', 'Peak TPS', 'Min Block Time', 'Max Block Time'],
            'Value': [
                f"{health['avg_tps']:.2f}",
                f"{health['avg_block_time']:.2f}s",
                f"{max(blockchain.tps_history) if blockchain.tps_history else 0:.2f}",
                f"{min(blockchain.block_times) if blockchain.block_times else 0:.2f}s",
                f"{max(blockchain.block_times) if blockchain.block_times else 0:.2f}s"
            ]
        }
        
        st.table(pd.DataFrame(perf_data))
    
    with tabs[3]:  # Blocks
        st.header("Recent Blocks")
        
        # Show last 10 blocks
        recent_blocks = blockchain.chain[-10:]
        
        block_data = []
        for block in reversed(recent_blocks):
            block_data.append(block.to_dict())
        
        if block_data:
            df = pd.DataFrame(block_data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No blocks mined yet")
    
    with tabs[4]:  # Validators
        st.header("Validator Set")
        
        # Validator table
        validator_data = []
        for validator in blockchain.validators.values():
            validator_data.append(validator.to_dict())
        
        df = pd.DataFrame(validator_data)
        st.dataframe(df, use_container_width=True)
        
        # Top validators by stake
        st.subheader("Top Validators by Stake")
        top_validators = sorted(blockchain.validators.values(), key=lambda v: v.stake, reverse=True)[:5]
        
        for i, validator in enumerate(top_validators, 1):
            st.write(f"**{i}. {validator.address[:20]}...** - Stake: {validator.stake:.0f} - Blocks Proposed: {validator.blocks_proposed}")
