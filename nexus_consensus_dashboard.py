import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List

from nexus_consensus import (
    NexusConsensusEngine,
    ContributionScore,
    ContributionType
)
from proof_of_spectrum import SpectralValidator, SpectralRegion
from native_token import NativeTokenSystem


def render_nexus_consensus_dashboard():
    st.title("🔱 Nexus Consensus Engine")
    st.markdown("""
    Revolutionary blockchain consensus combining **GhostDAG** (parallel blocks), **Proof of Spectrum** (spectral diversity),
    and **Nexus Economic Equation** (AI-optimized system health) with **community governance** and **NXT wealth-building**.
    """)
    
    tabs = st.tabs([
        "🎯 Consensus Overview",
        "⚖️ Validator Network", 
        "📊 Economic Metrics",
        "🏛️ Governance",
        "🧪 Live Simulation"
    ])
    
    with tabs[0]:
        render_consensus_overview()
    
    with tabs[1]:
        render_validator_network()
    
    with tabs[2]:
        render_economic_metrics()
    
    with tabs[3]:
        render_governance()
    
    with tabs[4]:
        render_live_simulation()


def render_consensus_overview():
    st.header("Consensus Architecture Overview")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        ### 🌳 GhostDAG Layer
        **Parallel Block Processing**
        - DAG-based structure
        - PHANTOM protocol
        - High throughput
        - Conflict resolution
        """)
    
    with col2:
        st.markdown("""
        ### 🌈 Proof of Spectrum
        **Spectral Diversity Security**
        - 6 spectral regions
        - Multi-hash algorithms
        - Wave interference
        - Anti-centralization
        """)
    
    with col3:
        st.markdown("""
        ### 🔱 Nexus Economics
        **AI-Optimized Feedback**
        - System health (H/M/D)
        - Dynamic rewards
        - Contribution tracking
        - Wealth building
        """)
    
    st.divider()
    
    st.subheader("How It Works")
    
    st.markdown("""
    #### 1️⃣ **Block Creation** (GhostDAG)
    - Validators create blocks in parallel DAG structure
    - PHANTOM protocol determines block ordering
    - High-throughput consensus without orphaned blocks
    
    #### 2️⃣ **Validator Selection** (Proof of Spectrum + Contributions)
    - Validators assigned to spectral regions (UV, Violet, Blue, Green, Yellow, IR)
    - Selection probability = **Spectral Diversity** × **Contribution Stake**
    - Requires 83% spectral coverage (5/6 regions) for security
    
    #### 3️⃣ **Economic Incentives** (Nexus + NXT)
    - Block rewards scale with System Health S(t) = f(H, M, D)
    - 60% to block creator, 40% to validators
    - Real NXT tokens minted via native payment layer
    
    #### 4️⃣ **Community Governance**
    - Voting weight = Contribution score (H + M + D)
    - 67% approval threshold, 10% max weight per validator
    - Democratic, anti-centralized decision making
    """)
    
    st.info("💡 **Key Innovation**: Nexus Consensus combines three independent security mechanisms (DAG ordering, spectral diversity, economic alignment) into one unified system where AI optimization drives wealth-building aligned with network health.")


def render_validator_network():
    st.header("Validator Network & Contribution Scores")
    
    if 'nexus_consensus' not in st.session_state:
        st.warning("⚠️ No active consensus engine. Run a simulation in the 'Live Simulation' tab first.")
        return
    
    consensus: NexusConsensusEngine = st.session_state.nexus_consensus
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Validators", len(consensus.spectrum.validators))
    
    with col2:
        total_contribution = sum(score.calculate_total(consensus.nexus_engine) for score in consensus.contributions.values())
        st.metric("Total Contributions", f"{total_contribution:.2f}")
    
    with col3:
        total_rewards = sum(score.rewards_earned for score in consensus.contributions.values())
        st.metric("Total Rewards Distributed", f"{total_rewards:,} units")
    
    with col4:
        total_blocks = len(consensus.ghostdag.blocks)
        st.metric("Total Blocks", total_blocks)
    
    st.divider()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Spectral Distribution")
        render_spectral_distribution(consensus)
    
    with col2:
        st.subheader("Top Contributors")
        render_top_contributors(consensus)
    
    st.divider()
    st.subheader("Validator Contribution Details")
    render_validator_details(consensus)


def render_spectral_distribution(consensus: NexusConsensusEngine):
    distribution = consensus.spectrum.get_spectral_distribution()
    
    regions = []
    counts = []
    total_stakes = []
    
    for region, validators in distribution.items():
        regions.append(region.name)
        counts.append(len(validators))
        total_stakes.append(sum(v.stake for v in validators))
    
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=("Validator Count by Region", "Total Stake by Region"),
        specs=[[{"type": "bar"}, {"type": "bar"}]]
    )
    
    fig.add_trace(
        go.Bar(x=regions, y=counts, marker_color='lightblue', name="Count"),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Bar(x=regions, y=total_stakes, marker_color='lightgreen', name="Stake"),
        row=1, col=2
    )
    
    fig.update_layout(height=400, showlegend=False)
    st.plotly_chart(fig, use_container_width=True)


def render_top_contributors(consensus: NexusConsensusEngine):
    if not consensus.contributions:
        st.info("No contribution data yet.")
        return
    
    sorted_contributors = sorted(
        consensus.contributions.items(),
        key=lambda x: x[1].calculate_total(consensus.nexus_engine),
        reverse=True
    )[:10]
    
    df = pd.DataFrame([
        {
            "Validator": validator_id[:8] + "...",
            "Total Score": f"{score.calculate_total(consensus.nexus_engine):.3f}",
            "H": f"{score.human_score:.2f}",
            "M": f"{score.machine_score:.2f}",
            "D": f"{score.data_score:.2f}",
            "Rewards": f"{score.rewards_earned:,}"
        }
        for validator_id, score in sorted_contributors
    ])
    
    st.dataframe(df, use_container_width=True, hide_index=True)


def render_validator_details(consensus: NexusConsensusEngine):
    if not consensus.contributions:
        st.info("No validators in the network yet.")
        return
    
    validator_data = []
    for validator_id, score in consensus.contributions.items():
        contribution_total = score.calculate_total(consensus.nexus_engine)
        validator_data.append({
            "Validator ID": validator_id,
            "Human (H)": score.human_score,
            "Machine (M)": score.machine_score,
            "Data (D)": score.data_score,
            "Total": contribution_total,
            "Blocks Validated": score.blocks_validated,
            "Governance Weight": consensus.get_governance_weight(validator_id),
            "Rewards Earned": score.rewards_earned
        })
    
    df = pd.DataFrame(validator_data)
    st.dataframe(df, use_container_width=True, hide_index=True)


def render_economic_metrics():
    st.header("Economic Metrics & Wealth Building")
    
    if 'nexus_consensus' not in st.session_state:
        st.warning("⚠️ No active consensus engine. Run a simulation first.")
        return
    
    consensus: NexusConsensusEngine = st.session_state.nexus_consensus
    token_system: NativeTokenSystem = st.session_state.get('token_system')
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Rewards Distributed", f"{consensus.total_rewards_distributed:,} units")
    
    with col2:
        avg_reward = consensus.total_rewards_distributed / max(1, len(consensus.ghostdag.blocks))
        st.metric("Avg Reward per Block", f"{avg_reward:.1f} units")
    
    with col3:
        if token_system:
            validator_pool = token_system.get_account("VALIDATOR_POOL")
            remaining = validator_pool.balance if validator_pool else 0
            st.metric("Validator Pool Remaining", f"{remaining:,} units")
    
    with col4:
        system_health = consensus.current_system_health
        st.metric("Current System Health", f"{system_health:.3f}")
    
    st.divider()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Reward Distribution")
        render_reward_distribution(consensus)
    
    with col2:
        st.subheader("System Health Components")
        render_system_health_breakdown(consensus)


def render_reward_distribution(consensus: NexusConsensusEngine):
    if not consensus.contributions:
        st.info("No reward data yet.")
        return
    
    sorted_by_rewards = sorted(
        consensus.contributions.items(),
        key=lambda x: x[1].rewards_earned,
        reverse=True
    )[:15]
    
    validators = [v[:8] + "..." for v, _ in sorted_by_rewards]
    rewards = [s.rewards_earned for _, s in sorted_by_rewards]
    
    fig = go.Figure(data=[
        go.Bar(x=validators, y=rewards, marker_color='gold')
    ])
    
    fig.update_layout(
        title="Top 15 Validators by Rewards",
        xaxis_title="Validator",
        yaxis_title="Rewards (NXT units)",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_system_health_breakdown(consensus: NexusConsensusEngine):
    total_H = sum(s.human_score for s in consensus.contributions.values())
    total_M = sum(s.machine_score for s in consensus.contributions.values())
    total_D = sum(s.data_score for s in consensus.contributions.values())
    
    # Calculate contributions (simplified)
    H_contribution = total_H / 10.0 if total_H > 0 else 0
    M_contribution = total_M / 10.0 if total_M > 0 else 0
    D_contribution = total_D / 10.0 if total_D > 0 else 0
    
    base_health = 1.0
    weighted_H = 0.4 * H_contribution
    weighted_M = 0.3 * M_contribution
    weighted_D = 0.3 * D_contribution
    total_health = base_health + weighted_H + weighted_M + weighted_D
    
    fig = go.Figure(data=[
        go.Bar(
            x=['Base', 'Human (H)', 'Machine (M)', 'Data (D)', 'Total'],
            y=[base_health, weighted_H, weighted_M, weighted_D, total_health],
            marker_color=['lightgray', 'lightblue', 'lightgreen', 'lightyellow', 'gold']
        )
    ])
    
    fig.update_layout(
        title="System Health Composition S(t)",
        yaxis_title="Health Value",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_governance():
    st.header("Community Governance")
    
    if 'nexus_consensus' not in st.session_state:
        st.warning("⚠️ No active consensus engine. Run a simulation first.")
        return
    
    consensus: NexusConsensusEngine = st.session_state.nexus_consensus
    
    st.markdown("""
    ### Governance Principles
    - **Contribution-Weighted Voting**: Voting power based on H + M + D contribution scores
    - **Anti-Centralization**: Maximum 10% weight per validator (prevents single-entity control)
    - **Supermajority Requirement**: 67% approval needed for proposals
    - **Democratic**: Community decides on protocol upgrades, parameter changes, resource allocation
    """)
    
    st.divider()
    
    st.subheader("Validator Governance Weights")
    
    if not consensus.contributions:
        st.info("No validators in the network yet.")
        return
    
    governance_data = []
    for validator_id in consensus.contributions.keys():
        weight = consensus.get_governance_weight(validator_id)
        governance_data.append({
            "Validator": validator_id[:12] + "...",
            "Governance Weight": f"{weight:.2%}",
            "Max Weight": "10.00%"
        })
    
    df = pd.DataFrame(governance_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    st.info("💡 **Note**: Governance proposal voting system coming soon. Current implementation shows validator voting weights based on contribution scores with anti-centralization (10% max).")


def render_live_simulation():
    st.header("Live Consensus Simulation")
    
    st.markdown("""
    Simulate the Nexus Consensus Engine in action. This demo creates validators, generates blocks,
    distributes rewards, and demonstrates the full consensus lifecycle.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        num_validators = st.slider("Number of Validators", 6, 20, 12)
        num_blocks = st.slider("Blocks to Generate", 5, 50, 20)
    
    with col2:
        base_reward = st.slider("Base Block Reward (NXT units)", 100, 1000, 500)
        enable_transfers = st.checkbox("Enable value transfers", value=True)
    
    if st.button("🚀 Run Simulation", use_container_width=True, type="primary"):
        with st.spinner("Running Nexus Consensus simulation..."):
            run_nexus_consensus_simulation(num_validators, num_blocks, base_reward, enable_transfers)
    
    if 'nexus_consensus' in st.session_state:
        st.divider()
        render_simulation_results()


def run_nexus_consensus_simulation(num_validators: int, num_blocks: int, base_reward: int, enable_transfers: bool):
    from native_token import NativeTokenSystem, token_system
    
    token_sys = token_system
    consensus = NexusConsensusEngine()
    
    st.session_state.token_system = token_sys
    st.session_state.nexus_consensus = consensus
    
    spectral_regions = list(SpectralRegion)
    
    validators = []
    for i in range(num_validators):
        region = spectral_regions[i % len(spectral_regions)]
        validator = SpectralValidator(
            validator_id=f"validator_{i:03d}",
            public_key=f"pubkey_{i:03d}",
            spectral_region=region,
            stake=1000 + np.random.randint(0, 5000)
        )
        validators.append(validator)
        consensus.register_validator(validator)
        
        consensus.record_contribution(
            validator.validator_id,
            ContributionType.HUMAN_INTERACTION,
            np.random.uniform(0.1, 1.0)
        )
        consensus.record_contribution(
            validator.validator_id,
            ContributionType.MACHINE_COMPUTATION,
            np.random.uniform(0.05, 0.5)
        )
        consensus.record_contribution(
            validator.validator_id,
            ContributionType.DATA_PROVISION,
            np.random.uniform(0.01, 0.2)
        )
    
    progress_bar = st.progress(0)
    status_text = st.empty()
    
    for block_num in range(num_blocks):
        creator = np.random.choice(validators)
        
        block = consensus.create_block(
            block_id=f"block_{block_num:04d}",
            data={"index": block_num, "message": f"Block data {block_num}"},
            creator_id=creator.validator_id
        )
        
        if enable_transfers and block_num > 0 and np.random.random() > 0.5:
            consensus.record_contribution(
                creator.validator_id,
                ContributionType.DATA_PROVISION,
                np.random.uniform(0.01, 0.1)
            )
        
        progress_bar.progress((block_num + 1) / num_blocks)
        status_text.text(f"Block {block_num + 1}/{num_blocks} created by {creator.validator_id}")
    
    progress_bar.empty()
    status_text.empty()
    
    st.success(f"✅ Simulation complete! Generated {num_blocks} blocks with {num_validators} validators.")
    st.rerun()


def render_simulation_results():
    st.subheader("Simulation Results")
    
    consensus: NexusConsensusEngine = st.session_state.nexus_consensus
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Blocks Created", len(consensus.ghostdag.blocks))
    
    with col2:
        st.metric("Active Validators", len(consensus.validators))
    
    with col3:
        st.metric("Total Rewards", f"{consensus.total_rewards_distributed:,}")
    
    with col4:
        system_health = consensus.current_system_health
        st.metric("System Health", f"{system_health:.3f}")
    
    st.divider()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Contribution Distribution")
        
        total_H = sum(s.human_score for s in consensus.contributions.values())
        total_M = sum(s.machine_score for s in consensus.contributions.values())
        total_D = sum(s.data_score for s in consensus.contributions.values())
        
        fig = go.Figure(data=[
            go.Pie(
                labels=['Human (H)', 'Machine (M)', 'Data (D)'],
                values=[total_H, total_M, total_D],
                hole=0.4
            )
        ])
        fig.update_layout(title="Network Contribution Mix", height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Reward Concentration")
        
        rewards_list = sorted([s.rewards_earned for s in consensus.contributions.values()], reverse=True)
        
        fig = go.Figure(data=[
            go.Scatter(
                y=rewards_list,
                mode='lines+markers',
                fill='tozeroy',
                marker=dict(color='gold')
            )
        ])
        fig.update_layout(
            title="Reward Distribution Curve",
            xaxis_title="Validator Rank",
            yaxis_title="Rewards Earned",
            height=350
        )
        st.plotly_chart(fig, use_container_width=True)
