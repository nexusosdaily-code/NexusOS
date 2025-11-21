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
from copy import deepcopy

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
        wavelength = st.slider("Wavelength (nm)", 380, 750, 550, key="wave_wavelength")
        amplitude = st.slider("Amplitude", 0.0, 1.0, 0.8, key="wave_amplitude")
        phase = st.slider("Phase (radians)", 0.0, 2*np.pi, 0.0, key="wave_phase")
    
    with col2:
        modulation = st.selectbox("Modulation", [m.name for m in Modulation], key="wave_modulation")
        polarization = st.selectbox("Polarization", [p.name for p in Polarization], key="wave_polarization")
    
    try:
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
        
        # Display wave properties
        frequency_hz = wave.frequency
        energy_j = wave.energy()
        spectral_region = wave.to_spectral_region()
        
        col1.metric("Frequency", f"{frequency_hz:.2e} Hz")
        col2.metric("Energy (E=hf)", f"{energy_j:.2e} J")
        col3.metric("Spectral Region", spectral_region)
        
        # Visualize wave
        t = np.linspace(0, 1e-9, 1000)
        wave_signal = amplitude * np.sin(2 * np.pi * frequency_hz * t + phase)
        
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
        st.plotly_chart(fig, width='stretch')
        
    except Exception as e:
        st.error(f"Error creating wave state: {str(e)}")
        st.exception(e)

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
    st.plotly_chart(fig, width='stretch')
    
    # Revenue sources pie chart
    st.markdown("### Floor Funding Sources")
    revenue = stats['revenue_sources']
    fig = go.Figure(data=[go.Pie(
        labels=list(revenue.keys()),
        values=list(revenue.values()),
        hole=0.4
    )])
    fig.update_layout(height=300, template="plotly_dark")
    st.plotly_chart(fig, width='stretch')

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
    st.plotly_chart(fig, width='stretch')
    
    # Liquidity flow
    st.markdown("### Liquidity Distribution")
    col1, col2, col3 = st.columns(3)
    col1.metric("Recycling Pool", f"{stats['recycling_liquidity_pool']:,.0f} NXT")
    col2.metric("→ BHLS Floor", f"{stats['bhls_floor_transfer']:,.0f} NXT")
    col3.metric("→ Supply Chain", f"{stats['supply_chain_fund']:,.0f} NXT")
    
    # Interactive Recycling Analysis
    st.divider()
    st.markdown("### 🔬 Custom Recycling Analysis")
    st.markdown("**Research Tool**: Input arbitrary material weights to analyze economic impact, entropy reduction, and system efficiency")
    
    # Material weight inputs in 2 columns
    col1, col2 = st.columns(2)
    
    with col1:
        plastic_kg = st.number_input("Plastic (kg)", min_value=0.0, max_value=10000.0, value=100.0, step=10.0, key="plastic_kg")
        metal_kg = st.number_input("Metal (kg)", min_value=0.0, max_value=10000.0, value=50.0, step=10.0, key="metal_kg")
        glass_kg = st.number_input("Glass (kg)", min_value=0.0, max_value=10000.0, value=75.0, step=10.0, key="glass_kg")
        paper_kg = st.number_input("Paper & Cardboard (kg)", min_value=0.0, max_value=10000.0, value=200.0, step=10.0, key="paper_kg")
    
    with col2:
        electronics_kg = st.number_input("E-Waste (kg)", min_value=0.0, max_value=10000.0, value=25.0, step=5.0, key="electronics_kg")
        organic_kg = st.number_input("Organic Waste (kg)", min_value=0.0, max_value=10000.0, value=500.0, step=50.0, key="organic_kg")
        textiles_kg = st.number_input("Textiles & Fabrics (kg)", min_value=0.0, max_value=10000.0, value=80.0, step=10.0, key="textiles_kg")
        batteries_kg = st.number_input("Batteries (kg)", min_value=0.0, max_value=10000.0, value=10.0, step=1.0, key="batteries_kg")
    
    # Quality grade slider
    quality_grade = st.slider("Material Quality Grade", 0.0, 1.0, 0.8, 0.05, 
                              help="Higher quality = better recycling value (0=damaged, 1=pristine)", key="quality_grade")
    
    # Generate AI report button
    if st.button("🤖 Generate Comprehensive Recycling Analysis", key="recycling_ai_report"):
        from nexus_ai import NexusAI
        
        with st.expander("📊 Nexus AI Recycling Analysis Report", expanded=True):
            # Prepare material weights dictionary
            material_weights = {
                MaterialType.PLASTIC: plastic_kg,
                MaterialType.METAL: metal_kg,
                MaterialType.GLASS: glass_kg,
                MaterialType.PAPER: paper_kg,
                MaterialType.ELECTRONICS: electronics_kg,
                MaterialType.ORGANIC: organic_kg,
                MaterialType.TEXTILES: textiles_kg,
                MaterialType.BATTERIES: batteries_kg
            }
            
            # Prepare data for report
            recycling_data = {
                'material_weights': material_weights,
                'quality_grade': quality_grade,
                'recycling_rates': economy.recycling_rates,
                'current_stats': stats
            }
            
            NexusAI.generate_recycling_analysis_report(recycling_data)

def render_civilization_simulator_tab():
    """Render civilization simulator"""
    st.header("🌍 Civilization Simulator")
    st.markdown("### Multi-Agent Dynamics using Nexus Equation")
    st.markdown("**dN/dt = αC + βD + γE - δEntropy + PID**")
    
    simulator = st.session_state.simulator
    
    col1, col2 = st.columns(2)
    with col1:
        sim_years = st.slider("Simulation Years", 1, 50, 10, key="sim_years")
    with col2:
        if st.button("Run Simulation", key="run_sim"):
            with st.spinner("Simulating civilization dynamics..."):
                # Capture immutable pre-run state snapshot for accurate report comparison
                st.session_state.sim_initial_state = deepcopy(simulator.current_state)
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
        
        # Debt backing metrics
        final_state = simulator.current_state
        debt_backing_ratio = final_state.nxt_debt_backing_ratio()
        
        st.markdown("### 💰 Global Debt Backing - Value Increase Mechanism")
        st.markdown("""
        As global debt ($300T+) exceeds NXT supply, each NXT token gains intrinsic value.
        A portion of this value flows to the BHLS floor as additional credits.
        """)
        
        col1, col2, col3 = st.columns(3)
        col1.metric("Global Debt", f"${final_state.global_debt_usd/1e12:.1f}T USD")
        
        # Format debt-per-NXT with appropriate precision
        if debt_backing_ratio >= 1:
            debt_per_nxt_display = f"${debt_backing_ratio:,.2f} USD"
        elif debt_backing_ratio >= 0.001:
            debt_per_nxt_display = f"${debt_backing_ratio:.4f} USD"
        else:
            debt_per_nxt_display = f"${debt_backing_ratio:.2e} USD"
        
        col2.metric("Debt per NXT", debt_per_nxt_display)
        
        # Format floor credits with proper decimal precision
        if final_state.debt_backed_floor_credits >= 1:
            credits_display = f"{final_state.debt_backed_floor_credits:,.2f} NXT"
        else:
            credits_display = f"{final_state.debt_backed_floor_credits:.4f} NXT"
        
        col3.metric("Daily Floor Credits", credits_display)
        
        # Format the info message with proper precision
        if debt_backing_ratio >= 1:
            ratio_text = f"${debt_backing_ratio:,.2f}"
        elif debt_backing_ratio >= 0.001:
            ratio_text = f"${debt_backing_ratio:.4f}"
        else:
            ratio_text = f"${debt_backing_ratio:.2e}"
        
        st.info(f"💡 **Economic Formula**: With ${final_state.global_debt_usd/1e12:.1f}T debt backing {final_state.nxt_supply:,.0f} NXT, each token represents {ratio_text} in debt value. This backing flows {final_state.debt_backed_floor_credits:,.2f} NXT daily to the BHLS floor, ensuring guaranteed living standards.")
        
        # Time series plots
        if len(simulator.history) > 1:
            df = pd.DataFrame([{
                'Day': s.time_days,
                'Population': s.population,
                'Stability': s.stability_index,
                'Entropy': s.entropy,
                'Floor Reserve': s.bhls_floor_reserve / 1000,  # in thousands
                'Global Debt (T)': s.global_debt_usd / 1e12,  # in trillions
                'Debt Backing ($)': s.nxt_debt_backing_ratio() / 1000  # in thousands
            } for s in simulator.history])
            
            # Stability chart
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
            st.plotly_chart(fig, width='stretch')
            
            # Debt backing chart
            fig2 = go.Figure()
            fig2.add_trace(go.Scatter(x=df['Day'], y=df['Debt Backing ($)'], 
                                     name='Debt Backing per NXT', 
                                     line=dict(color='#F39C12', width=2),
                                     fill='tozeroy'))
            fig2.update_layout(
                title="Debt Backing Growth - NXT Value Increase Over Time",
                xaxis_title="Days",
                yaxis_title="Debt per NXT ($1000s)",
                height=300,
                template="plotly_dark"
            )
            st.plotly_chart(fig2, width='stretch')
            
            # Nexus AI Comprehensive Report
            st.divider()
            if st.button("🤖 Generate Comprehensive Simulation Report", key="sim_ai_report"):
                from nexus_ai import NexusAI
                
                with st.expander("📊 Nexus AI Civilization Simulation Report", expanded=True):
                    # Use captured pre-run state for accurate per-run comparison
                    initial_state = st.session_state.get('sim_initial_state', simulator.current_state)
                    final_state = simulator.current_state
                    
                    # Prepare data for report
                    sim_data = {
                        'initial_state': {
                            'global_debt_usd': initial_state.global_debt_usd,
                            'nxt_supply': initial_state.nxt_supply,
                            'population': initial_state.population,
                            'bhls_floor_reserve': initial_state.bhls_floor_reserve,
                            'stability_index': initial_state.stability_index
                        },
                        'final_state': {
                            'global_debt_usd': final_state.global_debt_usd,
                            'nxt_supply': final_state.nxt_supply,
                            'population': final_state.population,
                            'bhls_floor_reserve': final_state.bhls_floor_reserve,
                            'stability_index': final_state.stability_index,
                            'debt_backed_floor_credits': final_state.debt_backed_floor_credits
                        },
                        'stats': stats
                    }
                    
                    NexusAI.generate_civilization_simulator_report(sim_data)

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
    st.plotly_chart(fig, width='stretch')

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
        st.plotly_chart(fig, width='stretch')

def render_mobile_wallet_tab():
    """Render mobile wallet with debt backing integration"""
    st.header("📱 Mobile NXT Wallet")
    st.markdown("### Your quantum-resistant wallet powered by global debt backing")
    
    # Get current state from simulator
    simulator = st.session_state.simulator
    current_state = simulator.current_state
    
    # Calculate debt backing metrics
    debt_backing_ratio = current_state.nxt_debt_backing_ratio()
    
    # Demo wallet balance
    if 'wallet_balance' not in st.session_state:
        st.session_state.wallet_balance = 1000.0
    
    # Calculate total backed value
    total_value = st.session_state.wallet_balance * debt_backing_ratio
    
    # PROMINENT VALUE COMPARISON - Show exact backed value
    st.success(f"💎 **Your {st.session_state.wallet_balance:,.2f} NXT = ${total_value:,.2f} USD in backed value**")
    
    # Wallet Overview
    st.markdown("### 💰 Wallet Overview")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Your Balance", f"{st.session_state.wallet_balance:,.2f} NXT")
    
    with col2:
        # Debt backing value
        if debt_backing_ratio >= 1:
            backing_display = f"${debt_backing_ratio:,.2f}"
        elif debt_backing_ratio >= 0.001:
            backing_display = f"${debt_backing_ratio:.4f}"
        else:
            backing_display = f"${debt_backing_ratio:.2e}"
        st.metric("Debt Backing per NXT", backing_display)
    
    with col3:
        # Total value from debt backing (already calculated above)
        st.metric("Your Backed Value", f"${total_value:,.2f} USD")
    
    with col4:
        # Daily floor support
        if current_state.debt_backed_floor_credits >= 1:
            credits_display = f"{current_state.debt_backed_floor_credits:,.2f}"
        else:
            credits_display = f"{current_state.debt_backed_floor_credits:.4f}"
        st.metric("Daily Floor Support", f"{credits_display} NXT")
    
    # Explanation
    st.info(f"💡 **How Debt Backing Works**: ${current_state.global_debt_usd/1e12:.2f}T in global debt backs {current_state.nxt_supply:,.0f} NXT tokens, giving each token {backing_display} in real value. This backing flows {credits_display} NXT daily to the BHLS floor, ensuring guaranteed living standards for all citizens.")
    
    st.divider()
    
    # Messaging Section
    st.markdown("### 📨 Send WNSP Message")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        message_content = st.text_area("Message", placeholder="Enter your quantum-encrypted message...", height=100)
        recipient = st.text_input("Recipient Address (optional - leave blank for broadcast)", placeholder="0xABCD...")
    
    with col2:
        st.markdown("#### Message Cost (E=hf)")
        
        # Calculate message cost based on wavelength
        if message_content:
            wavelength_nm = 550
            frequency_hz = 3e8 / (wavelength_nm * 1e-9)
            h = 6.62607015e-34
            energy_j = h * frequency_hz
            
            # Cost scales with message length and energy
            cost_nxt = len(message_content) * energy_j * 1e15
            
            st.metric("Wavelength", f"{wavelength_nm} nm")
            st.metric("Energy", f"{energy_j:.2e} J")
            st.metric("Cost", f"{cost_nxt:.6f} NXT")
            
            if st.button("🚀 Send Message", width='stretch'):
                if cost_nxt <= st.session_state.wallet_balance:
                    st.session_state.wallet_balance -= cost_nxt
                    st.success(f"✅ Message sent! Burned {cost_nxt:.6f} NXT for quantum encryption.")
                    st.rerun()
                else:
                    st.error("❌ Insufficient balance")
        else:
            st.info("Enter a message to see cost calculation")
    
    st.divider()
    
    # Debt Backing Economics
    st.markdown("### 📊 Global Debt Backing Economics")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### System Metrics")
        metrics_data = {
            "Metric": ["Global Debt", "NXT Supply", "Debt per NXT", "Population", "Daily Floor Credits"],
            "Value": [
                f"${current_state.global_debt_usd/1e12:.2f}T USD",
                f"{current_state.nxt_supply:,.0f} NXT",
                backing_display,
                f"{current_state.population:,}",
                f"{credits_display} NXT"
            ]
        }
        df_metrics = pd.DataFrame(metrics_data)
        st.dataframe(df_metrics, width='stretch', hide_index=True)
    
    with col2:
        st.markdown("#### Your Economics")
        your_data = {
            "Item": ["Your Balance", "Backed Value", "% of Supply", "Share of Floor"],
            "Value": [
                f"{st.session_state.wallet_balance:,.2f} NXT",
                f"${total_value:,.2f} USD",
                f"{(st.session_state.wallet_balance/current_state.nxt_supply)*100:.6f}%",
                f"{(st.session_state.wallet_balance/current_state.nxt_supply)*current_state.debt_backed_floor_credits:.6f} NXT/day"
            ]
        }
        df_your = pd.DataFrame(your_data)
        st.dataframe(df_your, width='stretch', hide_index=True)
    
    st.divider()
    
    # Transaction Demo
    st.markdown("### 💸 Send NXT Transaction")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        send_to = st.text_input("Send to Address", placeholder="0x1234...")
    
    with col2:
        send_amount = st.number_input("Amount (NXT)", min_value=0.0, max_value=float(st.session_state.wallet_balance), value=10.0, step=0.1)
    
    with col3:
        st.markdown("&nbsp;")
        st.markdown("&nbsp;")
        if st.button("📤 Send NXT", width='stretch'):
            if send_to and send_amount > 0:
                if send_amount <= st.session_state.wallet_balance:
                    st.session_state.wallet_balance -= send_amount
                    st.success(f"✅ Sent {send_amount} NXT to {send_to[:10]}...")
                    st.rerun()
                else:
                    st.error("❌ Insufficient balance")
            else:
                st.warning("⚠️ Enter recipient address and amount")
    
    # How it works
    with st.expander("🔍 How Mobile Wallet Integration Works"):
        st.markdown(f"""
        ### Complete Integration Flow
        
        **1. Debt Backing → NXT Value**
        - ${current_state.global_debt_usd/1e12:.2f}T global debt ÷ {current_state.nxt_supply:,.0f} NXT supply = **{backing_display} per token**
        - Your {st.session_state.wallet_balance:,.2f} NXT = **${total_value:,.2f} USD** in backed value
        
        **2. Messaging Burns → Energy Reserve**
        - Send message → Pay E=hf cost → Burns NXT
        - Burned energy → TRANSITION_RESERVE pool
        - Reserve powers the BHLS floor
        
        **3. Floor Support → Guaranteed Living**
        - Debt backing flows {credits_display} NXT/day to floor
        - Messaging burns add more energy
        - Every citizen gets {st.session_state.bhls.base_allocations[BHLSCategory.FOOD]:,.0f} NXT/month guaranteed
        
        **4. Mobile-First Design**
        - Your phone = blockchain node
        - Quantum-resistant encryption
        - Wavelength-based validation
        - Real-time economics visible
        
        This creates a **self-sustaining loop**: Use the system → Support the floor → Everyone benefits
        """)

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
        "⚡ Supply Chain",
        "📱 Mobile Wallet"
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
    
    with tabs[6]:
        render_mobile_wallet_tab()

if __name__ == "__main__":
    main()
