"""
Avogadro Economics Dashboard
Interactive visualization of statistical mechanics applied to NexusOS civilization economics.

Features:
- Molar transaction metrics (photon-moles)
- Economic temperature & entropy visualization
- Maxwell-Boltzmann wealth distribution
- Chemical equilibrium for burn/reward balance
- Ideal gas law predictions
- Phase transition forecasting
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import numpy as np
from datetime import datetime, timedelta

from avogadro_economics import (
    get_avogadro_engine,
    AvogadroEconomicsEngine,
    EconomicPhase,
    AVOGADRO_NUMBER,
    BOLTZMANN_CONSTANT,
    IDEAL_GAS_CONSTANT,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT
)


def main():
    st.set_page_config(page_title="Avogadro Economics", page_icon="⚛️", layout="wide")
    
    st.title("⚛️ Avogadro Economics - Statistical Mechanics Dashboard")
    st.markdown("""
    **Bridge quantum mechanics to civilization-scale economics using statistical thermodynamics.**
    
    NexusOS is the first blockchain to integrate **Planck's constant (h)**, **Einstein's relativity (c²)**, 
    and **Avogadro's number (N_A)** into a unified physics-based economic model.
    """)
    
    # Get engine
    engine = get_avogadro_engine()
    
    # Sidebar controls
    st.sidebar.header("⚙️ System Parameters")
    
    # Transaction inputs
    st.sidebar.subheader("📊 Activity Metrics")
    total_messages = st.sidebar.number_input(
        "Total Messages (lifetime)",
        min_value=0,
        value=1_000_000_000,
        step=10_000_000,
        help="Total messages ever sent in NexusOS"
    )
    
    transaction_rate = st.sidebar.number_input(
        "Transaction Rate (tx/second)",
        min_value=0.0,
        value=100.0,
        step=10.0,
        help="Current transaction throughput"
    )
    
    active_wallets = st.sidebar.number_input(
        "Active Wallets",
        min_value=1,
        value=500_000,
        step=10_000,
        help="Number of active participants"
    )
    
    # Economic parameters
    st.sidebar.subheader("💰 Economic State")
    reserve_pool = st.sidebar.number_input(
        "Reserve Pool (NXT)",
        min_value=0.0,
        value=50_000_000.0,
        step=1_000_000.0,
        help="Total TRANSITION_RESERVE + F_floor"
    )
    
    trading_volume = st.sidebar.number_input(
        "Daily Trading Volume (NXT)",
        min_value=0.0,
        value=5_000_000.0,
        step=100_000.0,
        help="DEX + messaging volume per day"
    )
    
    burns_per_day = st.sidebar.number_input(
        "Burns per Day (NXT)",
        min_value=0.0,
        value=50_000.0,
        step=1_000.0,
        help="Total token burns (messaging + DEX fees)"
    )
    
    rewards_per_day = st.sidebar.number_input(
        "Rewards per Day (NXT)",
        min_value=0.0,
        value=45_000.0,
        step=1_000.0,
        help="Validator rewards + staking"
    )
    
    # Average wavelength
    avg_wavelength = st.sidebar.slider(
        "Average Message Wavelength (nm)",
        min_value=350.0,
        max_value=1100.0,
        value=550.0,
        step=10.0,
        help="Average spectral region for messages"
    )
    
    # Main dashboard tabs
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📐 Molar Metrics",
        "🌡️ Thermodynamics",
        "📊 Wealth Distribution",
        "⚖️ Chemical Equilibrium",
        "💨 Ideal Gas Law",
        "🔄 Phase Transitions"
    ])
    
    # Tab 1: Molar Metrics
    with tab1:
        st.header("📐 Molar Transaction Metrics")
        st.markdown("""
        Convert individual quantum transactions to **photon-moles** using Avogadro's number.
        
        Just like chemistry measures molecules in moles (6.022×10²³), NexusOS measures 
        transactions in **photon-moles** for civilization-scale economics.
        """)
        
        # Calculate molar metrics
        molar = engine.calculate_molar_metrics(total_messages, avg_wavelength)
        
        # Display key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Total Messages",
                f"{molar.total_messages:,.0f}",
                help="Lifetime message count"
            )
        
        with col2:
            st.metric(
                "Photon-Moles",
                f"{molar.photon_moles:.6e}",
                help=f"Messages / N_A = {molar.total_messages} / {AVOGADRO_NUMBER:.2e}"
            )
        
        with col3:
            st.metric(
                "Molar Energy",
                f"{molar.molar_energy_joules:.2e} J",
                help="N_A × hf × photon_moles"
            )
        
        with col4:
            st.metric(
                "Molar NXT Value",
                f"{molar.molar_energy_nxt:,.2f} NXT",
                help="Molar energy converted to NXT"
            )
        
        st.divider()
        
        # Physics breakdown
        st.subheader("🔬 Physics Breakdown")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Single Photon Energy (E = hf)**")
            st.code(f"""
Wavelength: {avg_wavelength} nm = {avg_wavelength * 1e-9} m
Frequency: f = c/λ = {SPEED_OF_LIGHT:.2e} / {avg_wavelength * 1e-9:.2e}
         = {SPEED_OF_LIGHT / (avg_wavelength * 1e-9):.3e} Hz

Energy: E = hf = {PLANCK_CONSTANT:.3e} × {SPEED_OF_LIGHT / (avg_wavelength * 1e-9):.3e}
      = {molar.average_photon_energy_j:.3e} Joules per photon
            """, language="text")
        
        with col2:
            st.markdown("**Molar Energy (N_A photons)**")
            st.code(f"""
Photon-Moles: n = {molar.total_messages:,.0f} / {AVOGADRO_NUMBER:.2e}
            = {molar.photon_moles:.6e} moles

Molar Energy: E_molar = n × N_A × hf
            = {molar.photon_moles:.3e} × {AVOGADRO_NUMBER:.2e} × {molar.average_photon_energy_j:.3e}
            = {molar.molar_energy_joules:.3e} Joules
            """, language="text")
        
        st.divider()
        
        # E=mc² equivalent mass
        st.subheader("⚡ E=mc² Molar Mass Equivalent")
        st.markdown(f"""
        Using Einstein's mass-energy equivalence, this molar energy corresponds to a mass of:
        
        **m = E/c² = {molar.molar_energy_joules:.3e} / ({SPEED_OF_LIGHT:.2e})² = {molar.molar_mass_equivalent_kg:.3e} kg**
        
        This is the equivalent mass of all economic activity, treating transactions as photons!
        """)
    
    # Tab 2: Thermodynamics
    with tab2:
        st.header("🌡️ Economic Thermodynamics")
        st.markdown("""
        Apply thermodynamic principles to measure the **temperature**, **entropy**, and **phase** 
        of the economic system.
        
        - **Temperature**: Kinetic energy of transactions (activity level)
        - **Entropy**: System disorder/complexity (S = k_B × ln(Ω))
        - **Free Energy**: Spontaneity of economic processes (ΔG = H - TS)
        """)
        
        # Calculate thermodynamic state
        state = engine.calculate_thermodynamic_state(
            transaction_rate=transaction_rate,
            total_transactions=total_messages,
            active_wallets=active_wallets,
            reserve_pool_nxt=reserve_pool,
            trading_volume_nxt=trading_volume
        )
        
        # Display main metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Economic Temperature",
                f"{state.temperature_k:.1f} K",
                delta=f"{state.temperature_k - 273.15:.1f} °C",
                help="Higher activity = higher temperature"
            )
        
        with col2:
            st.metric(
                "Entropy",
                f"{state.entropy_j_per_k:.2e} J/K",
                help="S = k_B × ln(wallets × transactions)"
            )
        
        with col3:
            st.metric(
                "Economic Phase",
                state.phase.display_name,
                help=state.phase.description
            )
        
        st.divider()
        
        # Detailed thermodynamic metrics
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📊 State Variables")
            st.metric("Internal Energy (U)", f"{state.internal_energy_j:.2e} J", help="Reserve pool energy")
            st.metric("Gibbs Free Energy (G)", f"{state.free_energy_j:.2e} J", help="G = H - TS")
            st.metric("Pressure (P)", f"{state.pressure_pa:.2e} Pa", help="Transaction density")
            st.metric("Volume (V)", f"{state.volume_m3:.2e} m³", help="Economic space (wallets)")
        
        with col2:
            st.subheader("🔢 Particle Statistics")
            st.metric("Total Particles", f"{state.particle_count:,.0f}", help="Total transactions")
            st.metric("Moles", f"{state.moles:.6e}", help="Transactions / N_A")
            st.metric("Microstates (Ω)", f"{active_wallets * total_messages:.2e}", help="Possible configurations")
        
        st.divider()
        
        # Phase diagram
        st.subheader("📈 Economic Phase Diagram")
        
        # Create temperature range
        temps = np.linspace(0, 6000, 100)
        phases = [EconomicPhase.from_temperature(t) for t in temps]
        phase_values = [p.value[1] for p in phases]  # Get numeric index
        
        fig = go.Figure()
        
        # Add phase regions
        fig.add_trace(go.Scatter(
            x=temps,
            y=[1] * len(temps),
            fill='tozeroy',
            name='Phase',
            line=dict(color='lightblue', width=0),
            fillcolor='lightblue',
            hovertemplate='Temperature: %{x:.0f} K<extra></extra>'
        ))
        
        # Add current temperature marker
        fig.add_vline(
            x=state.temperature_k,
            line_dash="dash",
            line_color="red",
            annotation_text=f"Current: {state.temperature_k:.0f} K ({state.phase.display_name})",
            annotation_position="top"
        )
        
        # Add phase boundaries
        boundaries = [0, 300, 800, 2000, 5000]
        boundary_names = ["FROZEN", "SOLID", "LIQUID", "GAS", "PLASMA"]
        colors = ["blue", "cyan", "green", "yellow", "red"]
        
        for i, (temp, name, color) in enumerate(zip(boundaries[:-1], boundary_names[:-1], colors[:-1])):
            fig.add_vrect(
                x0=temp,
                x1=boundaries[i+1],
                fillcolor=color,
                opacity=0.2,
                layer="below",
                line_width=0,
                annotation_text=name,
                annotation_position="top left"
            )
        
        # Last phase (PLASMA)
        fig.add_vrect(
            x0=boundaries[-1],
            x1=6000,
            fillcolor=colors[-1],
            opacity=0.2,
            layer="below",
            line_width=0,
            annotation_text=boundary_names[-1],
            annotation_position="top left"
        )
        
        fig.update_layout(
            title="Economic Phase Diagram (Temperature vs. Phase)",
            xaxis_title="Temperature (K)",
            yaxis=dict(showticklabels=False, showgrid=False),
            height=300,
            showlegend=False
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # Tab 3: Wealth Distribution
    with tab3:
        st.header("📊 Maxwell-Boltzmann Wealth Distribution")
        st.markdown("""
        Model wealth distribution using **Maxwell-Boltzmann statistics** from gas kinetic theory.
        
        In an ideal economic gas, wealth (energy) distributes according to temperature:
        - **Low T**: Most wealth concentrated near ground state (inequality)
        - **High T**: Wealth spreads across many states (equality)
        
        **P(E) ∝ √E × exp(-E / k_B T)**
        """)
        
        # Generate Boltzmann distribution
        boltzmann = engine.maxwell_boltzmann_distribution(
            temperature_k=state.temperature_k,
            particle_count=active_wallets,
            energy_range_nxt=(0.0, 10000.0)
        )
        
        # Display metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Average Wealth",
                f"{boltzmann.average_energy:,.2f} NXT",
                help="Mean energy per wallet"
            )
        
        with col2:
            st.metric(
                "Most Probable Wealth",
                f"{boltzmann.most_probable_energy:,.2f} NXT",
                help="Peak of distribution"
            )
        
        with col3:
            gini = boltzmann.gini_coefficient()
            st.metric(
                "Gini Coefficient",
                f"{gini:.3f}",
                delta=f"{'High' if gini > 0.5 else 'Low'} inequality",
                help="0 = perfect equality, 1 = perfect inequality"
            )
        
        st.divider()
        
        # Plot distribution
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=boltzmann.energy_levels,
            y=boltzmann.probabilities,
            mode='lines',
            fill='tozeroy',
            name='Probability Distribution',
            line=dict(color='blue', width=2)
        ))
        
        # Mark average and most probable
        fig.add_vline(
            x=boltzmann.average_energy,
            line_dash="dash",
            line_color="green",
            annotation_text=f"Average: {boltzmann.average_energy:.0f} NXT"
        )
        
        fig.add_vline(
            x=boltzmann.most_probable_energy,
            line_dash="dot",
            line_color="red",
            annotation_text=f"Most Probable: {boltzmann.most_probable_energy:.0f} NXT"
        )
        
        fig.update_layout(
            title=f"Wealth Distribution at T = {state.temperature_k:.0f} K",
            xaxis_title="Wealth (NXT)",
            yaxis_title="Probability",
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.divider()
        
        # Wealth percentiles
        st.subheader("💰 Wealth Percentiles")
        percentiles = [10, 25, 50, 75, 90, 95, 99]
        wealth_at_percentile = boltzmann.wealth_percentiles(percentiles)
        
        percentile_data = {
            "Percentile": [f"{p}th" for p in percentiles],
            "Wealth (NXT)": [f"{wealth_at_percentile[p]:,.2f}" for p in percentiles]
        }
        
        st.table(percentile_data)
    
    # Tab 4: Chemical Equilibrium
    with tab4:
        st.header("⚖️ Chemical Equilibrium - Burn/Reward Balance")
        st.markdown("""
        Apply **chemical equilibrium theory** to model the balance between token burns and rewards.
        
        **Reaction**: Messages + Energy ⇌ Rewards + Reserve
        
        - **Equilibrium Constant**: K = [Rewards] / [Burns]
        - **ΔG < 0**: Spontaneous (system favors this direction)
        - **Le Chatelier's Principle**: Predicts system response to stress
        """)
        
        # Calculate equilibrium
        equilibrium = engine.chemical_equilibrium_constant(
            burns_per_day=burns_per_day,
            rewards_per_day=rewards_per_day,
            temperature_k=state.temperature_k
        )
        
        # Display metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Equilibrium Constant (K)",
                f"{equilibrium['equilibrium_constant_K']:.4f}",
                delta=equilibrium['direction'],
                help="K = Rewards / Burns"
            )
        
        with col2:
            st.metric(
                "ΔG (Free Energy)",
                f"{equilibrium['delta_G_joules']:.2e} J",
                delta="Spontaneous" if equilibrium['spontaneous'] else "Non-spontaneous",
                help="Gibbs free energy change"
            )
        
        with col3:
            st.metric(
                "ΔH (Enthalpy)",
                f"{equilibrium['delta_H_joules']:.2e} J",
                help="Reaction heat"
            )
        
        st.divider()
        
        # Le Chatelier analysis
        st.subheader("🔮 Le Chatelier's Principle Prediction")
        st.info(equilibrium['le_chatelier_prediction'])
        
        # Reaction diagram
        st.subheader("⚗️ Reaction Progress")
        
        fig = go.Figure()
        
        # Reactants and products
        reaction_coord = np.linspace(0, 1, 100)
        
        # Energy curve (parabolic)
        if equilibrium['delta_H_joules'] < 0:
            # Exothermic: Products lower energy
            energy = 1000 - 500 * reaction_coord + 200 * (reaction_coord - 0.5)**2
        else:
            # Endothermic: Products higher energy
            energy = 1000 + 500 * reaction_coord + 200 * (reaction_coord - 0.5)**2
        
        fig.add_trace(go.Scatter(
            x=reaction_coord,
            y=energy,
            mode='lines',
            name='Energy',
            line=dict(color='blue', width=3)
        ))
        
        # Mark reactants and products
        fig.add_annotation(x=0.1, y=energy[10], text="Burns + Messages", showarrow=True)
        fig.add_annotation(x=0.9, y=energy[-10], text="Rewards + Reserve", showarrow=True)
        
        # Mark activation energy peak
        peak_idx = np.argmax(energy)
        fig.add_annotation(
            x=reaction_coord[peak_idx],
            y=energy[peak_idx],
            text="Activation Energy",
            showarrow=True,
            arrowhead=2
        )
        
        fig.update_layout(
            title="Reaction Energy Diagram",
            xaxis_title="Reaction Progress →",
            yaxis_title="Energy (arbitrary units)",
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.divider()
        
        # Equilibrium position
        st.subheader("📍 Equilibrium Position")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Current State**")
            st.code(f"""
Burns per day:   {burns_per_day:,.0f} NXT
Rewards per day: {rewards_per_day:,.0f} NXT
Ratio (K):       {equilibrium['equilibrium_constant_K']:.4f}
            """, language="text")
        
        with col2:
            st.markdown("**System Tendency**")
            if equilibrium['equilibrium_constant_K'] > 1:
                st.success("✅ Forward reaction favored (more rewards than burns)")
            elif equilibrium['equilibrium_constant_K'] < 1:
                st.warning("⚠️ Reverse reaction favored (more burns than rewards)")
            else:
                st.info("⚖️ System at equilibrium")
    
    # Tab 5: Ideal Gas Law
    with tab5:
        st.header("💨 Ideal Gas Law Economics")
        st.markdown("""
        Apply the **ideal gas law** to economic flows: **PV = nRT**
        
        - **P** = Economic pressure (transaction density)
        - **V** = Economic volume (active wallets)
        - **n** = Moles of transactions
        - **R** = Ideal gas constant (8.314 J/(mol·K))
        - **T** = Economic temperature
        """)
        
        # Calculate gas law predictions
        gas_law = engine.ideal_gas_law_economics(
            pressure=state.pressure_pa,
            volume=state.volume_m3,
            temperature_k=state.temperature_k
        )
        
        # Display metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Pressure (P)",
                f"{gas_law['current_pressure']:.2e} Pa",
                help="Transaction rate / volume"
            )
        
        with col2:
            st.metric(
                "Volume (V)",
                f"{gas_law['current_volume']:.2e} m³",
                help="Active wallets (economic space)"
            )
        
        with col3:
            st.metric(
                "Moles (n)",
                f"{gas_law['moles']:.6e}",
                help="Total transactions / N_A"
            )
        
        with col4:
            st.metric(
                "Temperature (T)",
                f"{gas_law['current_temperature']:.1f} K",
                help="Economic temperature"
            )
        
        st.divider()
        
        # PV = nRT verification
        st.subheader("🔍 Ideal Gas Law Verification")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Left Side (PV)**")
            st.code(f"""
P × V = {gas_law['current_pressure']:.2e} × {gas_law['current_volume']:.2e}
      = {gas_law['pressure_volume_product']:.2e}
            """, language="text")
        
        with col2:
            st.markdown("**Right Side (nRT)**")
            st.code(f"""
n × R × T = {gas_law['moles']:.2e} × {IDEAL_GAS_CONSTANT:.3f} × {gas_law['current_temperature']:.2e}
          = {gas_law['nRT_product']:.2e}
            """, language="text")
        
        # Check if they match
        ratio = gas_law['pressure_volume_product'] / gas_law['nRT_product'] if gas_law['nRT_product'] != 0 else 0
        
        if 0.9 <= ratio <= 1.1:
            st.success(f"✅ Ideal gas law satisfied! (ratio = {ratio:.3f})")
        else:
            st.warning(f"⚠️ Deviation from ideal behavior (ratio = {ratio:.3f})")
        
        st.divider()
        
        # Predictions
        st.subheader("🔮 Equilibrium Predictions")
        
        st.markdown(f"""
        If we hold **n** (moles) and **T** (temperature) constant:
        
        - **Predicted equilibrium pressure**: {gas_law['equilibrium_pressure_predicted']:.2e} Pa
        - **Predicted equilibrium volume**: {gas_law['equilibrium_volume_predicted']:.2e} m³
        
        This tells us what pressure and volume the system naturally tends toward!
        """)
    
    # Tab 6: Phase Transitions
    with tab6:
        st.header("🔄 Economic Phase Transitions")
        st.markdown("""
        Predict **phase transitions** based on temperature trends, similar to water freezing/boiling.
        
        Economic phases transition at critical temperatures:
        - **0-300 K**: Frozen (no activity)
        - **300-800 K**: Solid (low activity)
        - **800-2000 K**: Liquid (healthy flow) ✅
        - **2000-5000 K**: Gas (high volatility)
        - **5000+ K**: Plasma (extreme chaos)
        """)
        
        # Temperature trend input
        temp_trend = st.slider(
            "Temperature Trend (K/day)",
            min_value=-200.0,
            max_value=200.0,
            value=0.0,
            step=10.0,
            help="Rate of temperature change"
        )
        
        # Predict phase transition
        prediction = engine.predict_phase_transition(
            current_temperature=state.temperature_k,
            temperature_rate_of_change=temp_trend
        )
        
        # Display current and future phase
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric(
                "Current Phase",
                prediction['current_phase'],
                delta=f"{prediction['current_temperature']:.1f} K"
            )
        
        with col2:
            if prediction['transition_occurring']:
                st.metric(
                    "Future Phase (7 days)",
                    prediction['future_phase'],
                    delta=f"{prediction['future_temperature_7d']:.1f} K",
                    delta_color="inverse" if prediction['temperature_trend'] == 'heating' else "normal"
                )
            else:
                st.metric(
                    "Future Phase (7 days)",
                    prediction['future_phase'],
                    delta="No transition"
                )
        
        st.divider()
        
        # Transition warning
        if prediction['transition_occurring']:
            if prediction['temperature_trend'] == 'heating':
                st.warning(f"⚠️ **Phase transition detected!** System is {prediction['temperature_trend']} and will transition from {prediction['current_phase']} to {prediction['future_phase']} in ~7 days.")
            else:
                st.info(f"❄️ **Phase transition detected!** System is {prediction['temperature_trend']} and will transition from {prediction['current_phase']} to {prediction['future_phase']} in ~7 days.")
        else:
            st.success(f"✅ System stable in {prediction['current_phase']} phase. No transition expected.")
        
        st.divider()
        
        # Critical point analysis
        st.subheader("🎯 Nearest Critical Point")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Critical Point",
                prediction['nearest_critical_point'],
                help="Nearest phase boundary"
            )
        
        with col2:
            st.metric(
                "Distance",
                f"{prediction['distance_to_critical_k']:.1f} K",
                help="How far from transition"
            )
        
        with col3:
            days_to_critical = prediction['days_to_critical']
            if days_to_critical == float('inf'):
                st.metric("Time to Critical", "∞ days", help="No trend")
            else:
                st.metric(
                    "Time to Critical",
                    f"{abs(days_to_critical):.1f} days",
                    help="At current rate"
                )
        
        st.divider()
        
        # Temperature projection
        st.subheader("📈 Temperature Projection (30 days)")
        
        days = np.linspace(0, 30, 100)
        projected_temps = state.temperature_k + temp_trend * days
        projected_phases = [EconomicPhase.from_temperature(t) for t in projected_temps]
        
        fig = go.Figure()
        
        # Temperature line
        fig.add_trace(go.Scatter(
            x=days,
            y=projected_temps,
            mode='lines',
            name='Temperature',
            line=dict(color='red', width=3)
        ))
        
        # Phase boundaries
        boundaries = [300, 800, 2000, 5000]
        boundary_names = ["FROZEN→SOLID", "SOLID→LIQUID", "LIQUID→GAS", "GAS→PLASMA"]
        
        for temp, name in zip(boundaries, boundary_names):
            fig.add_hline(
                y=temp,
                line_dash="dash",
                line_color="gray",
                annotation_text=name,
                annotation_position="right"
            )
        
        # Mark current point
        fig.add_trace(go.Scatter(
            x=[0],
            y=[state.temperature_k],
            mode='markers',
            name='Current',
            marker=dict(size=15, color='blue')
        ))
        
        fig.update_layout(
            title=f"Temperature Projection (trend: {temp_trend:+.1f} K/day)",
            xaxis_title="Days from Now",
            yaxis_title="Temperature (K)",
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # Footer with physics constants
    st.divider()
    st.subheader("⚛️ Fundamental Physics Constants")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.code(f"""
Planck's Constant (h):
{PLANCK_CONSTANT:.3e} J·s

Speed of Light (c):
{SPEED_OF_LIGHT:,.0f} m/s
        """, language="text")
    
    with col2:
        st.code(f"""
Avogadro's Number (N_A):
{AVOGADRO_NUMBER:.3e} /mol

Boltzmann Constant (k_B):
{BOLTZMANN_CONSTANT:.3e} J/K
        """, language="text")
    
    with col3:
        st.code(f"""
Ideal Gas Constant (R):
{IDEAL_GAS_CONSTANT:.3f} J/(mol·K)

R = k_B × N_A
        """, language="text")
    
    st.markdown("""
    ---
    **NexusOS**: The first blockchain with complete physics grounding from **quantum (h)** → **relativistic (c²)** → **statistical (N_A)**
    """)


if __name__ == "__main__":
    main()
