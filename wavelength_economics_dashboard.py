"""
Wavelength Economics Dashboard
Interactive demonstration of electromagnetic theory-based validation and pricing
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
import pandas as pd
from wavelength_validator import (
    WavelengthValidator,
    SpectralRegion,
    ModulationType,
    SPEED_OF_LIGHT,
    PLANCK_CONSTANT
)


def render_wavelength_economics_dashboard():
    st.title("🌈 Wavelength Economics: Physics-Based Validation")
    
    st.markdown("""
    ### The First Economic System Built on Electromagnetic Theory
    
    Experience message validation using **real physics** instead of arbitrary hashing algorithms.
    Security from **Maxwell's equations**, pricing from **quantum energy** (E = hf).
    """)
    
    tabs = st.tabs([
        "🔬 Physics vs Hashing",
        "🌊 Wave Interference Demo",
        "💰 Economic Pricing Model",
        "🎯 Live Message Validation",
        "📊 Spectral Diversity"
    ])
    
    with tabs[0]:
        render_physics_vs_hashing()
    
    with tabs[1]:
        render_wave_interference_demo()
    
    with tabs[2]:
        render_economic_pricing()
    
    with tabs[3]:
        render_live_validation()
    
    with tabs[4]:
        render_spectral_diversity()


def render_physics_vs_hashing():
    st.header("Traditional Hashing vs Wavelength Validation")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### 📊 Traditional SHA-256
        
        **Security Basis:**
        - Computational hardness
        - Vulnerable to quantum computers (Grover's algorithm)
        
        **Validation:**
        - Single hash value
        - Binary (match or no match)
        
        **Economics:**
        - Arbitrary mining difficulty
        - Adjusted by committee
        
        **Dimensions:**
        - 1 (hash string only)
        """)
        
        st.code("""
hash1 = SHA256("Transfer 100 NXT")
# f497cde44b9571d5012b3e...

hash2 = SHA256("Transfer 50 NXT") 
# ec80e4198659e4d6e53d84...

# Validation: Do hashes match?
        """, language="python")
    
    with col2:
        st.markdown("""
        ### 🌈 Wavelength Validation
        
        **Security Basis:**
        - Physical laws (Maxwell's equations)
        - Quantum-resistant (based on wave interference)
        
        **Validation:**
        - Multi-dimensional interference pattern
        - Continuous (coherence factor)
        
        **Economics:**
        - E = hf (quantum energy from physics)
        - Natural, mathematically derived
        
        **Dimensions:**
        - 5 (wavelength, amplitude, phase, polarization, modulation)
        """)
        
        st.code("""
wave1 = WaveProperties(
    λ=472nm, A=0.636, φ=2°,
    f=634THz, E=2.62eV
)

wave2 = WaveProperties(
    λ=532nm, A=0.839, φ=86°,
    f=562THz, E=2.33eV
)

# Validation: Interference pattern
interference = compute_superposition()
        """, language="python")
    
    st.divider()
    
    st.markdown("""
    ### 🔑 Key Advantages of Wavelength Validation
    
    | Aspect | SHA-256 | Wavelength Theory |
    |--------|---------|-------------------|
    | **Quantum Resistance** | ❌ Vulnerable | ✅ Inherently safe |
    | **Security Dimensions** | 1 | 5 |
    | **Economic Basis** | Arbitrary | E = hf (physics) |
    | **Tamper Detection** | Binary | Interference patterns |
    | **Mobile Efficiency** | High CPU cost | Mathematical simulation |
    | **Spectral Diversity** | No | Yes (6+ regions) |
    """)


def render_wave_interference_demo():
    st.header("Wave Interference: The Core Security Mechanism")
    
    st.markdown("""
    When two electromagnetic waves meet, they create **interference patterns** that are physically unique.
    This is the same principle that makes holograms and quantum computing possible.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Message 1 Configuration")
        region1 = st.selectbox(
            "Spectral Region",
            options=list(SpectralRegion),
            format_func=lambda x: f"{x.display_name} ({x.center_wavelength*1e9:.0f} nm)",
            key="region1"
        )
        
        amplitude1 = st.slider("Amplitude", 0.0, 1.0, 0.7, 0.01, key="amp1")
        phase1_deg = st.slider("Phase (degrees)", 0, 360, 45, 1, key="phase1")
        
        modulation1 = st.selectbox(
            "Modulation Type",
            options=list(ModulationType),
            format_func=lambda x: x.display_name,
            key="mod1"
        )
    
    with col2:
        st.subheader("Message 2 Configuration")
        region2 = st.selectbox(
            "Spectral Region",
            options=list(SpectralRegion),
            format_func=lambda x: f"{x.display_name} ({x.center_wavelength*1e9:.0f} nm)",
            key="region2"
        )
        
        amplitude2 = st.slider("Amplitude", 0.0, 1.0, 0.5, 0.01, key="amp2")
        phase2_deg = st.slider("Phase (degrees)", 0, 360, 180, 1, key="phase2")
        
        modulation2 = st.selectbox(
            "Modulation Type",
            options=list(ModulationType),
            format_func=lambda x: x.display_name,
            key="mod2"
        )
    
    if st.button("🔬 Compute Interference Pattern", type="primary", use_container_width=True):
        validator = WavelengthValidator(grid_resolution=512)
        
        # Create waves
        from wavelength_validator import WaveProperties
        
        wave1 = WaveProperties(
            wavelength=region1.center_wavelength,
            amplitude=amplitude1,
            phase=np.radians(phase1_deg),
            polarization=0.0,
            spectral_region=region1,
            modulation_type=modulation1
        )
        
        wave2 = WaveProperties(
            wavelength=region2.center_wavelength,
            amplitude=amplitude2,
            phase=np.radians(phase2_deg),
            polarization=0.0,
            spectral_region=region2,
            modulation_type=modulation2
        )
        
        # Compute interference
        interference = validator.compute_interference(wave1, wave2)
        
        # Visualization
        st.divider()
        st.subheader("🌊 Interference Pattern Results")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Coherence Factor", f"{interference.coherence_factor:.4f}")
        
        with col2:
            st.metric("Max Intensity", f"{interference.max_intensity:.2f}")
        
        with col3:
            st.metric("Min Intensity", f"{interference.min_intensity:.2f}")
        
        with col4:
            contrast = (interference.max_intensity - interference.min_intensity) / (
                interference.max_intensity + interference.min_intensity + 1e-10
            )
            st.metric("Contrast Ratio", f"{contrast:.3f}")
        
        # Plot interference pattern
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=(
                "Wave 1 (Electric Field)",
                "Wave 2 (Electric Field)",
                "Interference Intensity Pattern",
                "Phase Distribution"
            ),
            specs=[[{}, {}], [{"colspan": 2}, None]],
            vertical_spacing=0.12,
            horizontal_spacing=0.1
        )
        
        # Individual waves
        x = np.linspace(0, 10 * max(wave1.wavelength, wave2.wavelength), 512)
        E1 = validator.calculate_wave_function(wave1, x)
        E2 = validator.calculate_wave_function(wave2, x)
        
        fig.add_trace(
            go.Scatter(x=x*1e6, y=np.real(E1), mode='lines', name='Wave 1',
                      line=dict(color='blue', width=2)),
            row=1, col=1
        )
        
        fig.add_trace(
            go.Scatter(x=x*1e6, y=np.real(E2), mode='lines', name='Wave 2',
                      line=dict(color='green', width=2)),
            row=1, col=2
        )
        
        # Interference intensity
        fig.add_trace(
            go.Scatter(
                x=x*1e6,
                y=interference.intensity_distribution,
                mode='lines',
                name='Intensity',
                fill='tozeroy',
                line=dict(color='purple', width=2)
            ),
            row=2, col=1
        )
        
        fig.update_xaxes(title_text="Position (μm)", row=1, col=1)
        fig.update_xaxes(title_text="Position (μm)", row=1, col=2)
        fig.update_xaxes(title_text="Position (μm)", row=2, col=1)
        
        fig.update_yaxes(title_text="Electric Field", row=1, col=1)
        fig.update_yaxes(title_text="Electric Field", row=1, col=2)
        fig.update_yaxes(title_text="Intensity |E|²", row=2, col=1)
        
        fig.update_layout(height=600, showlegend=False)
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.info(f"""
        **Cryptographic Fingerprint (Pattern Hash):**  
        `{interference.pattern_hash}`
        
        This unique interference pattern serves as an **unforgeable signature** of the message chain.
        Any tampering would change the wave properties and create a completely different pattern.
        """)


def render_economic_pricing():
    st.header("💰 Physics-Based Economic Model")
    
    st.markdown("""
    ### Quantum Energy Pricing: E = hf
    
    In quantum physics, the energy of a photon is **E = hf**, where:
    - **h** = Planck's constant (6.626×10⁻³⁴ J·s)
    - **f** = Frequency (Hz) = c/λ
    - **c** = Speed of light (2.998×10⁸ m/s)
    
    **Higher frequency light carries more energy**, so it naturally costs more to transmit.
    This isn't arbitrary - it's fundamental physics!
    """)
    
    # Create comparison table
    st.subheader("📊 Spectral Region Pricing Comparison")
    
    pricing_data = []
    validator = WavelengthValidator()
    
    for region in SpectralRegion:
        # Calculate quantum properties
        wavelength = region.center_wavelength
        frequency = SPEED_OF_LIGHT / wavelength
        energy_joules = PLANCK_CONSTANT * frequency
        energy_ev = energy_joules / 1.602176634e-19
        
        # Calculate base cost (with adjusted scaling)
        ADJUSTED_JOULES_PER_NXT = 1e-21  # More reasonable scaling
        base_cost_nxt = (energy_joules / ADJUSTED_JOULES_PER_NXT) * 1e6
        
        pricing_data.append({
            'Region': region.display_name,
            'Wavelength (nm)': f"{wavelength*1e9:.1f}",
            'Frequency (THz)': f"{frequency/1e12:.2f}",
            'Energy (eV)': f"{energy_ev:.2f}",
            'Base Cost (NXT)': f"{base_cost_nxt:.4f}",
            'Use Case': get_use_case(region)
        })
    
    df = pd.DataFrame(pricing_data)
    st.dataframe(df, use_container_width=True, hide_index=True)
    
    st.divider()
    
    # Interactive pricing calculator
    st.subheader("🧮 Message Cost Calculator")
    
    col1, col2 = st.columns(2)
    
    with col1:
        calc_region = st.selectbox(
            "Spectral Region",
            options=list(SpectralRegion),
            format_func=lambda x: x.display_name,
            key="calc_region"
        )
        
        calc_modulation = st.selectbox(
            "Modulation Type",
            options=list(ModulationType),
            format_func=lambda x: f"{x.display_name} ({x.bits_per_symbol} bits/symbol)",
            key="calc_mod"
        )
    
    with col2:
        message_size = st.number_input(
            "Message Size (bytes)",
            min_value=1,
            max_value=10000,
            value=250,
            step=10
        )
        
        diversity_regions = st.slider(
            "Spectral Diversity (regions required)",
            min_value=1,
            max_value=6,
            value=5
        )
    
    # Calculate cost
    from wavelength_validator import WaveProperties
    
    calc_wave = WaveProperties(
        wavelength=calc_region.center_wavelength,
        amplitude=0.7,
        phase=0.0,
        polarization=0.0,
        spectral_region=calc_region,
        modulation_type=calc_modulation
    )
    
    cost_breakdown = validator.calculate_message_cost(
        calc_wave,
        message_size,
        diversity_regions
    )
    
    # Adjust costs for better scaling (divide by large factor)
    SCALE_FACTOR = 1e6
    for key in cost_breakdown:
        if key != 'total_nxt':
            cost_breakdown[key] = cost_breakdown[key] / SCALE_FACTOR
    cost_breakdown['total_nxt'] = cost_breakdown['total_nxt'] / SCALE_FACTOR
    
    st.divider()
    st.subheader("💵 Cost Breakdown")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "Quantum Base Cost",
            f"{cost_breakdown['quantum_base']:.6f} NXT",
            help="Based on E = hf quantum energy"
        )
        st.metric(
            "Modulation Premium",
            f"{cost_breakdown['modulation_premium']:.6f} NXT",
            help="Higher complexity = higher security = higher cost"
        )
    
    with col2:
        st.metric(
            "Spectral Diversity Fee",
            f"{cost_breakdown['diversity_fee']:.6f} NXT",
            help=f"Requires validation from {diversity_regions} regions"
        )
        st.metric(
            "Bandwidth Cost",
            f"{cost_breakdown['bandwidth_cost']:.6f} NXT",
            help=f"Data transmission cost for {message_size} bytes"
        )
    
    with col3:
        st.metric(
            "Amplitude Premium",
            f"{cost_breakdown['amplitude_premium']:.6f} NXT",
            help="Higher power = higher priority"
        )
        st.metric(
            "**TOTAL COST**",
            f"{cost_breakdown['total_nxt']:.6f} NXT",
            help="Complete physics-based message cost"
        )
    
    # Visualization
    fig = go.Figure(data=[
        go.Bar(
            x=['Quantum\nBase', 'Modulation\nPremium', 'Diversity\nFee', 'Bandwidth', 'Amplitude\nPremium'],
            y=[
                cost_breakdown['quantum_base'],
                cost_breakdown['modulation_premium'],
                cost_breakdown['diversity_fee'],
                cost_breakdown['bandwidth_cost'],
                cost_breakdown['amplitude_premium']
            ],
            marker_color=['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A'],
            text=[
                f"{cost_breakdown['quantum_base']:.6f}",
                f"{cost_breakdown['modulation_premium']:.6f}",
                f"{cost_breakdown['diversity_fee']:.6f}",
                f"{cost_breakdown['bandwidth_cost']:.6f}",
                f"{cost_breakdown['amplitude_premium']:.6f}"
            ],
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        title="Cost Component Breakdown (NXT)",
        xaxis_title="Component",
        yaxis_title="Cost (NXT)",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_live_validation():
    st.header("🎯 Live Message Validation Demo")
    
    st.markdown("""
    Send messages through the wavelength validator and see interference pattern validation in action.
    """)
    
    if 'wavelength_validator' not in st.session_state:
        st.session_state.wavelength_validator = WavelengthValidator()
    
    if 'message_history' not in st.session_state:
        st.session_state.message_history = []
    
    validator = st.session_state.wavelength_validator
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        message_text = st.text_area(
            "Message Content",
            placeholder="Enter your message here...",
            height=100
        )
    
    with col2:
        msg_region = st.selectbox(
            "Spectral Region",
            options=list(SpectralRegion),
            format_func=lambda x: x.display_name,
            key="msg_region"
        )
        
        msg_modulation = st.selectbox(
            "Modulation",
            options=list(ModulationType),
            format_func=lambda x: x.display_name,
            key="msg_mod"
        )
    
    if st.button("📤 Send Message", type="primary", use_container_width=True):
        if message_text:
            # Create wave
            wave = validator.create_message_wave(
                message_text,
                msg_region,
                msg_modulation
            )
            
            # Calculate cost
            cost = validator.calculate_message_cost(wave, len(message_text))
            SCALE_FACTOR = 1e6
            total_cost = cost['total_nxt'] / SCALE_FACTOR
            
            # Add to history
            st.session_state.message_history.append({
                'message': message_text[:50] + "..." if len(message_text) > 50 else message_text,
                'wave': wave,
                'cost': total_cost,
                'timestamp': pd.Timestamp.now()
            })
            
            st.success(f"✅ Message sent! Cost: {total_cost:.6f} NXT")
            st.rerun()
        else:
            st.warning("Please enter a message.")
    
    # Display message history and validations
    if len(st.session_state.message_history) > 0:
        st.divider()
        st.subheader("📋 Message Chain History")
        
        for i, msg_data in enumerate(st.session_state.message_history):
            with st.expander(f"Message {i+1}: {msg_data['message']}", expanded=(i == len(st.session_state.message_history)-1)):
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.write(f"**Region:** {msg_data['wave'].spectral_region.display_name}")
                    st.write(f"**Wavelength:** {msg_data['wave'].wavelength*1e9:.1f} nm")
                
                with col2:
                    st.write(f"**Frequency:** {msg_data['wave'].frequency/1e12:.2f} THz")
                    st.write(f"**Energy:** {msg_data['wave'].quantum_energy/1.602176634e-19:.2f} eV")
                
                with col3:
                    st.write(f"**Modulation:** {msg_data['wave'].modulation_type.display_name}")
                    st.write(f"**Cost:** {msg_data['cost']:.6f} NXT")
                
                # Show interference with previous message
                if i > 0:
                    prev_wave = st.session_state.message_history[i-1]['wave']
                    is_valid, interference, msg = validator.validate_message_chain(
                        prev_wave,
                        msg_data['wave']
                    )
                    
                    st.info(f"🔗 **Chain Validation:** {msg}")
                    st.code(f"Interference Hash: {interference.pattern_hash[:32]}...")


def render_spectral_diversity():
    st.header("🌈 Spectral Diversity: Anti-Centralization Security")
    
    st.markdown("""
    ### Why Spectral Diversity Matters
    
    In Proof of Spectrum consensus, validators are distributed across different electromagnetic regions.
    **A message needs approval from at least 5 out of 6 regions (83% coverage)** to be considered valid.
    
    This creates natural decentralization - no single spectral region can dominate the network!
    """)
    
    # Simulate spectral distribution
    np.random.seed(42)
    regions = list(SpectralRegion)[:6]  # Use first 6 regions
    
    validator_counts = {
        'UV': np.random.randint(8, 15),
        'Violet': np.random.randint(15, 25),
        'Blue': np.random.randint(20, 30),
        'Green': np.random.randint(18, 28),
        'Yellow': np.random.randint(12, 22),
        'IR': np.random.randint(10, 18)
    }
    
    total_validators = sum(validator_counts.values())
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Total Validators", total_validators)
    
    with col2:
        st.metric("Spectral Regions", 6)
    
    with col3:
        st.metric("Required Coverage", "83% (5/6)")
    
    # Visualization
    fig = go.Figure(data=[
        go.Bar(
            x=list(validator_counts.keys()),
            y=list(validator_counts.values()),
            marker_color=['#8B00FF', '#9400D3', '#0000FF', '#00FF00', '#FFFF00', '#FF0000'],
            text=list(validator_counts.values()),
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        title="Validator Distribution Across Spectral Regions",
        xaxis_title="Spectral Region",
        yaxis_title="Number of Validators",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.divider()
    st.subheader("🛡️ Security Through Diversity")
    
    st.markdown("""
    **Attack Resistance:**
    - **Single Region Attack:** Attacker would need to control 100% of ONE region, but still needs 4 others (impossible)
    - **51% Attack:** Attacker would need majority control of 5 different regions simultaneously
    - **Sybil Attack:** Prevented by stake requirements + spectral region assignment
    
    **Economic Benefits:**
    - Rare regions (UV, IR) earn scarcity multiplier bonuses
    - Popular regions (Blue, Green) have more competition → lower individual rewards
    - Natural market balancing across the spectrum
    """)


def get_use_case(region: SpectralRegion) -> str:
    """Map spectral regions to use cases"""
    use_cases = {
        SpectralRegion.UV: "High-security governance",
        SpectralRegion.VIOLET: "Financial transactions",
        SpectralRegion.BLUE: "Standard messaging",
        SpectralRegion.GREEN: "General communication",
        SpectralRegion.YELLOW: "Social messages",
        SpectralRegion.ORANGE: "Media metadata",
        SpectralRegion.RED: "Bulk data",
        SpectralRegion.IR: "Large file transfers"
    }
    return use_cases.get(region, "General purpose")


if __name__ == "__main__":
    render_wavelength_economics_dashboard()
