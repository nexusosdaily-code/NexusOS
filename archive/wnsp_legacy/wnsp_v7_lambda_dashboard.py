"""
WNSP v7.0 Lambda Boson Dashboard
================================

Interactive dashboard for Lambda Boson oscillating wavelength encoding.
2+ characters per particle - physics-validated via Λ = hf/c².

Author: Te Rata Pou
License: GPL v3
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, Any
import pandas as pd

from wnsp_protocol_v7 import (
    encode_lambda_message,
    LambdaEncoder,
    LambdaSubstrateIntegration,
    LambdaEncodingScheme,
    calculate_lambda_mass,
    wavelength_to_frequency,
    PLANCK_CONSTANT,
    SPEED_OF_LIGHT,
    LAMBDA_CHAR_MAP
)


def render_v7_dashboard():
    """Render the WNSP v7.0 Lambda Boson dashboard."""
    
    st.title("🔬 WNSP v7.0 — Lambda Boson Substrate")
    st.markdown("**Oscillating Wavelength Encoding: 2+ characters per particle**")
    
    st.markdown("""
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        <h3 style="color: #00d4ff; margin: 0;">Λ = hf/c²</h3>
        <p style="color: #ffffff; margin: 5px 0;">Lambda Boson: Mass from Oscillation</p>
        <p style="color: #aaaaaa; font-size: 0.9em; margin: 0;">
            The primordial synthesis of Planck (E=hf) + Einstein (E=mc²)
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    tab1, tab2, tab3, tab4 = st.tabs([
        "📡 Encode Message", 
        "📊 Physics Analysis",
        "🔄 Compare v2 vs v7",
        "📚 Theory"
    ])
    
    with tab1:
        render_encoder_tab()
    
    with tab2:
        render_physics_tab()
    
    with tab3:
        render_comparison_tab()
    
    with tab4:
        render_theory_tab()


def render_encoder_tab():
    """Render the message encoder tab."""
    st.subheader("Lambda Message Encoder")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        message_content = st.text_area(
            "Message Content",
            value="LAMBDA BOSON IS REAL MASS",
            height=100,
            help="Enter message to encode using oscillating wavelength"
        )
        
        sender_id = st.text_input("Sender ID", value="TeRataPou")
        recipient_id = st.text_input("Recipient ID", value="NexusNetwork")
    
    with col2:
        intensity = st.slider("Intensity Level", 1, 63, 32)
        cycles = st.slider("Oscillation Cycles", 1, 10, 1)
        
        st.markdown("---")
        st.markdown("**Encoding Scheme**")
        st.info("Dual Wavelength (λ₁ → λ₂)")
    
    if st.button("🔬 Encode with Lambda Substrate", type="primary", use_container_width=True):
        with st.spinner("Encoding via Λ = hf/c²..."):
            result = encode_lambda_message(
                content=message_content,
                sender=sender_id,
                recipient=recipient_id,
                intensity=intensity,
                cycles=cycles
            )
            
            st.session_state['last_result'] = result
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Characters", result['efficiency']['characters'])
            with col2:
                st.metric("Particles", result['efficiency']['particles'])
            with col3:
                st.metric("Chars/Particle", f"{result['efficiency']['chars_per_particle']:.2f}")
            with col4:
                st.metric("vs v2.0", result['efficiency']['vs_v2_improvement'])
            
            st.success(f"✅ {result['validation']['status']}")
            
            st.markdown("### Lambda Frame Visualization")
            render_frame_chart(result)
            
            with st.expander("📋 Full Message Details"):
                st.json(result)


def render_frame_chart(result: Dict[str, Any]):
    """Render visualization of Lambda frames."""
    frames = result['message']['frames']
    
    if not frames:
        st.warning("No frames to display")
        return
    
    frame_data = []
    for i, frame in enumerate(frames):
        frame_data.append({
            'Frame': i + 1,
            'λ₁ (start)': frame['wavelength_start_nm'],
            'λ₂ (end)': frame['wavelength_end_nm'],
            'Chars': ''.join(frame['char_pair']),
            'Λ Mass (kg)': frame['lambda_mass_kg'],
            'Energy (J)': frame['energy_joules']
        })
    
    df = pd.DataFrame(frame_data)
    
    fig = go.Figure()
    
    for i, row in df.iterrows():
        color = wavelength_to_color(row['λ₁ (start)'])
        color2 = wavelength_to_color(row['λ₂ (end)'])
        
        fig.add_trace(go.Scatter(
            x=[i, i + 0.5],
            y=[row['λ₁ (start)'], row['λ₂ (end)']],
            mode='lines+markers',
            line=dict(width=3),
            marker=dict(size=10),
            name=f"Frame {i+1}: {row['Chars']}",
            hovertemplate=f"Frame {i+1}<br>Chars: {row['Chars']}<br>λ: %{{y:.0f}}nm<extra></extra>"
        ))
    
    fig.update_layout(
        title="Oscillating Wavelength per Frame (λ₁ → λ₂)",
        xaxis_title="Frame Index",
        yaxis_title="Wavelength (nm)",
        height=400,
        template="plotly_dark"
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.dataframe(df, use_container_width=True)


def render_physics_tab():
    """Render physics analysis tab."""
    st.subheader("Lambda Boson Physics")
    
    wavelength = st.slider(
        "Wavelength (nm)", 
        min_value=200, 
        max_value=1000, 
        value=500,
        help="Adjust wavelength to see corresponding Lambda mass"
    )
    
    freq = wavelength_to_frequency(wavelength)
    lambda_mass = calculate_lambda_mass(freq)
    energy = PLANCK_CONSTANT * freq
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Frequency", f"{freq:.2e} Hz")
    with col2:
        st.metric("Energy (E=hf)", f"{energy:.2e} J")
    with col3:
        st.metric("Λ Mass (hf/c²)", f"{lambda_mass:.2e} kg")
    
    st.markdown("### Lambda Mass Spectrum")
    
    wavelengths = list(range(200, 1001, 10))
    lambda_masses = [calculate_lambda_mass(wavelength_to_frequency(w)) for w in wavelengths]
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=wavelengths,
        y=lambda_masses,
        mode='lines',
        fill='tozeroy',
        line=dict(color='#00d4ff', width=2),
        fillcolor='rgba(0, 212, 255, 0.2)'
    ))
    
    fig.add_vline(x=wavelength, line_dash="dash", line_color="yellow")
    fig.add_annotation(
        x=wavelength, y=lambda_mass,
        text=f"Λ = {lambda_mass:.2e} kg",
        showarrow=True, arrowhead=2
    )
    
    fig.update_layout(
        title="Lambda Boson Mass vs Wavelength",
        xaxis_title="Wavelength (nm)",
        yaxis_title="Lambda Mass (kg)",
        yaxis_type="log",
        template="plotly_dark",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("### The Lambda Equation")
    st.latex(r"\Lambda = \frac{hf}{c^2} = \frac{h}{c\lambda}")
    
    st.markdown(f"""
    **For λ = {wavelength} nm:**
    - f = c/λ = {freq:.4e} Hz
    - E = hf = {energy:.4e} J
    - **Λ = hf/c² = {lambda_mass:.4e} kg**
    """)


def render_comparison_tab():
    """Render v2 vs v7 comparison."""
    st.subheader("Encoding Efficiency: v2.0 vs v7.0")
    
    test_messages = [
        "HELLO",
        "LAMBDA BOSON",
        "NEXUSOS CIVILIZATION ARCHITECTURE",
        "CONSTRUCTING THE RULES OF NATURE INTO GOVERNANCE"
    ]
    
    comparison_data = []
    
    for msg in test_messages:
        v2_particles = len(msg)
        result = encode_lambda_message(msg)
        v7_particles = result['efficiency']['particles']
        efficiency = result['efficiency']['chars_per_particle']
        improvement = v2_particles / v7_particles if v7_particles > 0 else 0
        
        comparison_data.append({
            'Message': msg[:30] + ('...' if len(msg) > 30 else ''),
            'Characters': len(msg),
            'v2.0 Particles': v2_particles,
            'v7.0 Particles': v7_particles,
            'Chars/Particle': f"{efficiency:.2f}",
            'Improvement': f"{improvement:.1f}x"
        })
    
    df = pd.DataFrame(comparison_data)
    st.dataframe(df, use_container_width=True)
    
    fig = go.Figure(data=[
        go.Bar(name='v2.0 (1 char/particle)', 
               x=[d['Message'] for d in comparison_data],
               y=[d['v2.0 Particles'] for d in comparison_data],
               marker_color='#ff6b6b'),
        go.Bar(name='v7.0 (2 chars/particle)', 
               x=[d['Message'] for d in comparison_data],
               y=[d['v7.0 Particles'] for d in comparison_data],
               marker_color='#00d4ff')
    ])
    
    fig.update_layout(
        title="Particles Required: v2.0 vs v7.0",
        barmode='group',
        template="plotly_dark",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("""
    ### Efficiency Gains
    
    | Metric | v2.0 | v7.0 | Improvement |
    |--------|------|------|-------------|
    | Chars/Particle | 1.0 | 2.0 | **2x** |
    | Encoding | Single λ | Oscillating λ₁→λ₂ | +100% density |
    | Physics | E=hf | Λ=hf/c² | Mass substrate |
    """)


def render_theory_tab():
    """Render theoretical background."""
    st.subheader("Lambda Boson Theory")
    
    st.markdown("""
    ## The Primordial Synthesis
    
    Lambda Boson unifies two Nobel Prize-winning equations:
    
    | Scientist | Equation | Discovery |
    |-----------|----------|-----------|
    | **Planck** (1900) | E = hf | Energy from frequency |
    | **Einstein** (1905) | E = mc² | Mass-energy equivalence |
    
    ### The Derivation
    """)
    
    st.latex(r"E = hf \quad \text{(Planck)}")
    st.latex(r"E = mc^2 \quad \text{(Einstein)}")
    st.latex(r"\therefore hf = mc^2")
    st.latex(r"\boxed{\Lambda = \frac{hf}{c^2}}")
    
    st.markdown("""
    ### What This Means
    
    **Mass IS oscillation.** This is not metaphor — it is direct algebraic consequence 
    of Nobel Prize-winning physics.
    
    Every photon at frequency f carries Lambda mass Λ = hf/c².
    
    ### WNSP v7.0 Application
    
    By encoding messages in **oscillating wavelengths** (λ₁ → λ₂), each particle 
    carries two characters instead of one:
    
    - **λ₁ (start wavelength)** → Character 1
    - **λ₂ (end wavelength)** → Character 2
    - **Λ = h(f₁+f₂)/2c²** → Physics validation
    
    This doubles encoding efficiency while maintaining full substrate compliance.
    
    ---
    
    *"Constructing the rules of nature into the governance of civilization."*
    
    *— Te Rata Pou, Founder*
    """)


def wavelength_to_color(wavelength: float) -> str:
    """Convert wavelength to approximate RGB color."""
    if wavelength < 380:
        return '#8B00FF'
    elif wavelength < 450:
        return '#4B0082'
    elif wavelength < 495:
        return '#0000FF'
    elif wavelength < 570:
        return '#00FF00'
    elif wavelength < 590:
        return '#FFFF00'
    elif wavelength < 620:
        return '#FF7F00'
    elif wavelength < 750:
        return '#FF0000'
    else:
        return '#8B0000'


if __name__ == "__main__":
    st.set_page_config(
        page_title="WNSP v7.0 - Lambda Boson",
        page_icon="🔬",
        layout="wide"
    )
    render_v7_dashboard()
