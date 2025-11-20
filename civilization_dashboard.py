"""
Civilization Dashboard - NexusOS Civilization OS
Interactive visualization of the complete civilization system
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Import civilization modules
from wave_computation import WaveComputation, WaveState, Modulation, Polarization
from bhls_floor_system import BHLSFloorSystem, BHLSCategory
from regenerative_economy import RegenerativeEconomy, MaterialType
from civilization_simulator import CivilizationSimulator
from civic_governance import CivicGovernance, SpectralRegion, ProposalType, VoteChoice, Proposal
from supply_chain_energy import SupplyChainSystem, ResourceType, EnergySource, ResourceNode, EnergyGrid

def initialize_civilization():
    """Initialize all civilization systems"""
    if 'civ_initialized' not in st.session_state:
        # Initialize systems
        st.session_state.bhls = BHLSFloorSystem()
        st.session_state.economy = RegenerativeEconomy()
        st.session_state.simulator = CivilizationSimulator(initial_population=10000)
        st.session_state.governance = CivicGovernance()
        st.session_state.supply_chain = SupplyChainSystem()
        
        # Bootstrap initial data
        bootstrap_civilization()
        
        st.session_state.civ_initialized = True

def bootstrap_civilization():
    """Bootstrap initial civilization data"""
    # Register some citizens
    for i in range(100):
        st.session_state.bhls.register_citizen(
            f"CIT-{i:04d}",
            f"Citizen-{i}",
            f"0x{i:06X}"
        )
    
    # Register validators across spectral regions
    regions = list(SpectralRegion)[:6]  # First 6 regions
    for i, region in enumerate(regions):
        st.session_state.governance.register_validator(
            f"VAL-{region.name}-{i:03d}",
            region,
            stake_amount=1500.0
        )
    
    # Add energy grid
    main_grid = EnergyGrid(
        grid_id="GRID-MAIN",
        total_capacity_mw=1000.0,
        sources={
            EnergySource.SOLAR: 300.0,
            EnergySource.WIND: 250.0,
            EnergySource.NUCLEAR: 350.0,
            EnergySource.FOSSIL: 100.0
        }
    )
    st.session_state.supply_chain.add_energy_grid(main_grid)
    
    # Distribute initial floor
    st.session_state.bhls.distribute_monthly_floor()

def render_wave_computation_tab():
    """Render wave computation demonstration"""
    st.header("⚛️ Wave Computation Layer")
    st.markdown("### Physics-Based Information Encoding")
    st.markdown("Replaces binary (0/1) with electromagnetic wave states")
    
    col1, col2 = st.columns(2)
    
    with col1:
        wavelength = st.slider("Wavelength (nm)", 380, 750, 550)
        amplitude = st.slider("Amplitude", 0.0, 1.0, 0.8)
        phase = st.slider("Phase (radians)", 0.0, 2*np.pi, 0.0)
    
    with col2:
        modulation = st.selectbox("Modulation", [m.name for m in Modulation])
        polarization = st.selectbox("Polarization", [p.name for p in Polarization])
    
    # Create wave state
    wave = WaveComputation.create_state(
        wavelength,
        amplitude,
        phase,
        Polarization[polarization],
        Modulation[modulation]
    )
    
    st.markdown("### Wave State Properties")
    col1, col2, col3 = st.columns(3)
    col1.metric("Frequency", f"{wave.frequency:.2e} Hz")
    col2.metric("Energy (E=hf)", f"{wave.energy():.2e} J")
    col3.metric("Spectral Region", wave.to_spectral_region())
    
    # Visualize wave
    t = np.linspace(0, 1e-9, 1000)
    wave_signal = amplitude * np.sin(2 * np.pi * wave.frequency * t + phase)
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=t * 1e9,
        y=wave_signal,
        mode='lines',
        name='Wave',
        line=dict(color='cyan', width=2)
    ))
    fig.update_layout(
        title="Electromagnetic Wave Signal",
        xaxis_title="Time (nanoseconds)",
        yaxis_title="Amplitude",
        height=300,
        template="plotly_dark"
    )
    st.plotly_chart(fig, use_container_width=True)

def render_bhls_floor_tab():
    """Render BHLS floor system"""
    st.header("🏠 BHLS Floor System")
    st.markdown("### Guaranteed Basic Human Living Standards")
    
    bhls = st.session_state.bhls
    stats = bhls.get_system_stats()
    
    # Key metrics
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Citizens", f"{stats['total_citizens']:,}")
    col2.metric("Floor Reserve", f"{stats['floor_reserve_pool']:,.0f} NXT")
    col3.metric("Sustainability", f"{stats['sustainability_months']:.0f} months")
    col4.metric("Stability", f"{stats['floor_stability_index']:.0%}")
    
    # BHLS categories
    st.markdown("### Monthly Allocation Per Citizen")
    categories = list(BHLSCategory)
    allocations = [bhls.base_allocations[cat] for cat in categories]
    
    fig = go.Figure(data=[
        go.Bar(
            x=[cat.value for cat in categories],
            y=allocations,
            marker_color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
        )
    ])
    fig.update_layout(
        title="BHLS Allocation by Category (NXT/month)",
        yaxis_title="NXT Tokens",
        height=350,
        template="plotly_dark"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Revenue sources pie chart
    st.markdown("### Floor Funding Sources")
    revenue = stats['revenue_sources']
    fig = go.Figure(data=[go.Pie(
        labels=list(revenue.keys()),
        values=list(revenue.values()),
        hole=0.4
    )])
    fig.update_layout(height=300, template="plotly_dark")
    st.plotly_chart(fig, use_container_width=True)

def render_regenerative_economy_tab():
    """Render regenerative circular economy"""
    st.header("♻️ Regenerative Circular Economy")
    st.markdown("### Buy → Consume → Dispose → Recycle → Liquidity → Floor")
    
    economy = st.session_state.economy
    stats = economy.get_economy_stats()
    
    # Key metrics
    col1, col2, col3 = st.columns(3)
    col1.metric("Recycling Rate", f"{stats['recycling_rate_percent']:.1f}%")
    col2.metric("Entropy Reduced", f"{stats['entropy_reduction_kg']:,.0f} kg")
    col3.metric("Active Recyclers", f"{stats['active_recyclers']:,}")
    
    # Recycling rates
    st.markdown("### Recycling Value (NXT per kg)")
    materials = list(MaterialType)
    rates = [economy.recycling_rates[mat] for mat in materials]
    
    fig = go.Figure(data=[
        go.Bar(
            x=[mat.value for mat in materials],
            y=rates,
            marker_color='#2ECC71',
            text=rates,
            textposition='auto'
        )
    ])
    fig.update_layout(
        title="Material Recycling Rates",
        yaxis_title="NXT/kg",
        height=350,
        template="plotly_dark"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Liquidity flow
    st.markdown("### Liquidity Distribution")
    col1, col2, col3 = st.columns(3)
    col1.metric("Recycling Pool", f"{stats['recycling_liquidity_pool']:,.0f} NXT")
    col2.metric("→ BHLS Floor", f"{stats['bhls_floor_transfer']:,.0f} NXT")
    col3.metric("→ Supply Chain", f"{stats['supply_chain_fund']:,.0f} NXT")

def render_civilization_simulator_tab():
    """Render civilization simulator"""
    st.header("🌍 Civilization Simulator")
    st.markdown("### Multi-Agent Dynamics using Nexus Equation")
    st.markdown("**dN/dt = αC + βD + γE - δEntropy + PID**")
    
    simulator = st.session_state.simulator
    
    col1, col2 = st.columns(2)
    with col1:
        sim_years = st.slider("Simulation Years", 1, 50, 10)
    with col2:
        if st.button("Run Simulation"):
            with st.spinner("Simulating civilization dynamics..."):
                simulator.simulate_years(sim_years, verbose=False)
    
    stats = simulator.get_summary_stats()
    
    if stats:
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Population", f"{stats['final_population']:,}", 
                   f"+{stats['population_growth_percent']:.1f}%")
        col2.metric("NXT Supply", f"{stats['final_nxt_supply']:,.0f}",
                   f"{stats['nxt_supply_change_percent']:+.1f}%")
        col3.metric("Stability", f"{stats['final_stability_index']:.2%}")
        col4.metric("Entropy", f"{stats['final_entropy']:.1%}")
        
        # Time series plots
        if len(simulator.history) > 1:
            df = pd.DataFrame([{
                'Day': s.time_days,
                'Population': s.population,
                'Stability': s.stability_index,
                'Entropy': s.entropy,
                'Floor Reserve': s.bhls_floor_reserve / 1000  # in thousands
            } for s in simulator.history])
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(x=df['Day'], y=df['Stability'], 
                                    name='Stability', line=dict(color='#2ECC71')))
            fig.add_trace(go.Scatter(x=df['Day'], y=df['Entropy'], 
                                    name='Entropy', line=dict(color='#E74C3C')))
            fig.update_layout(
                title="Civilization Stability Over Time",
                xaxis_title="Days",
                yaxis_title="Index (0-1)",
                height=300,
                template="plotly_dark"
            )
            st.plotly_chart(fig, use_container_width=True)

def render_governance_tab():
    """Render civic governance"""
    st.header("🗳️ Civic Governance")
    st.markdown("### Proof of Spectrum - Spectral Diversity Consensus")
    
    gov = st.session_state.governance
    stats = gov.get_governance_stats()
    
    # Key metrics
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Validators", f"{stats['total_validators']}")
    col2.metric("Total Proposals", f"{stats['total_proposals']}")
    col3.metric("Approval Rate", f"{stats['approval_rate']:.1f}%")
    col4.metric("Total Stake", f"{stats['total_stake']:,.0f} NXT")
    
    # Validators by region
    st.markdown("### Validator Distribution by Spectral Region")
    regions = list(stats['validators_by_region'].keys())
    counts = list(stats['validators_by_region'].values())
    
    colors = ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000', '#8B0000']
    
    fig = go.Figure(data=[
        go.Bar(
            x=regions,
            y=counts,
            marker_color=colors[:len(regions)]
        )
    ])
    fig.update_layout(
        title="Spectral Diversity Ensures Decentralization",
        yaxis_title="Number of Validators",
        height=300,
        template="plotly_dark"
    )
    st.plotly_chart(fig, use_container_width=True)

def render_supply_chain_tab():
    """Render supply chain and energy"""
    st.header("⚡ Supply Chain & Energy")
    st.markdown("### Resource Flows and Energy Infrastructure")
    
    supply_chain = st.session_state.supply_chain
    stats = supply_chain.get_system_stats()
    
    # Energy metrics
    col1, col2, col3 = st.columns(3)
    col1.metric("Energy Capacity", f"{stats['total_energy_capacity_mw']:,.0f} MW")
    col2.metric("Utilization", f"{stats['energy_utilization']:.1f}%")
    col3.metric("Renewable %", f"{stats['renewable_energy_percent']:.1f}%")
    
    # Energy sources
    if st.session_state.supply_chain.energy_grids:
        grid = list(st.session_state.supply_chain.energy_grids.values())[0]
        
        st.markdown("### Energy Generation Mix")
        sources = list(grid.sources.keys())
        capacities = list(grid.sources.values())
        
        fig = go.Figure(data=[go.Pie(
            labels=[s.value for s in sources],
            values=capacities,
            hole=0.4
        )])
        fig.update_layout(height=350, template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)

def main():
    st.set_page_config(
        page_title="NexusOS Civilization",
        page_icon="🌍",
        layout="wide"
    )
    
    # Header
    st.title("🌍 NexusOS - Civilization Operating System")
    st.markdown("### Physics-Based Civilization: Wave Mechanics + Guaranteed Living Standards + Regenerative Economics")
    
    # Initialize
    initialize_civilization()
    
    # Tabs
    tabs = st.tabs([
        "⚛️ Wave Computation",
        "🏠 BHLS Floor",
        "♻️ Circular Economy",
        "🌍 Civilization Simulator",
        "🗳️ Governance",
        "⚡ Supply Chain"
    ])
    
    with tabs[0]:
        render_wave_computation_tab()
    
    with tabs[1]:
        render_bhls_floor_tab()
    
    with tabs[2]:
        render_regenerative_economy_tab()
    
    with tabs[3]:
        render_civilization_simulator_tab()
    
    with tabs[4]:
        render_governance_tab()
    
    with tabs[5]:
        render_supply_chain_tab()

if __name__ == "__main__":
    main()
