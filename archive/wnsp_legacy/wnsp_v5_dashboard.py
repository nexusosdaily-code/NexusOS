"""
WNSP v5.0 Dashboard — Wavelength-Native Signalling Protocol Visualization

Interactive Streamlit dashboard for:
- 7-band spectral architecture visualization
- Network topology and routing
- PoSPECTRUM consensus monitoring
- Energy economics and spectrum credits
- Frame transmission and validation

GPL v3.0 License — Community Owned, Physics Governed
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
import time
import math
from typing import Dict, List, Any

from wnsp_v5_wavelength_native import (
    SpectralBand, Priority, FrameFlags,
    WNSPv5Node, WNSPv5Network, WNSPv5Frame,
    PhysicalEventDescriptor, BandHeader, PhysicalAttestation,
    ControlMetadata, SpectralStake, PoSPECTRUM,
    MultiBandRouter, SpectrumCreditLedger, EnergyUnit,
    PLANCK_CONSTANT, SPEED_OF_LIGHT
)


def get_band_color(band: SpectralBand) -> str:
    """Get color for spectral band visualization"""
    colors = {
        SpectralBand.NANO: "#FF6B6B",
        SpectralBand.PICO: "#4ECDC4",
        SpectralBand.FEMTO: "#45B7D1",
        SpectralBand.ATTO: "#96CEB4",
        SpectralBand.ZEPTO: "#FFEAA7",
        SpectralBand.YOCTO: "#DDA0DD",
        SpectralBand.PLANCK: "#FFD700"
    }
    return colors.get(band, "#808080")


def get_band_icon(band: SpectralBand) -> str:
    """Get icon for spectral band"""
    icons = {
        SpectralBand.NANO: "nm",
        SpectralBand.PICO: "pm",
        SpectralBand.FEMTO: "fm",
        SpectralBand.ATTO: "am",
        SpectralBand.ZEPTO: "zm",
        SpectralBand.YOCTO: "ym",
        SpectralBand.PLANCK: "lp"
    }
    return icons.get(band, "?")


def initialize_demo_network():
    """Initialize demo network if not in session state"""
    if 'wnsp_v5_network' not in st.session_state:
        network = WNSPv5Network()
        
        alice = WNSPv5Node(
            "alice",
            [SpectralBand.NANO, SpectralBand.PICO, SpectralBand.FEMTO],
            "SENSOR_ALICE"
        )
        bob = WNSPv5Node(
            "bob",
            [SpectralBand.NANO, SpectralBand.PICO],
            "SENSOR_BOB"
        )
        charlie = WNSPv5Node(
            "charlie",
            [SpectralBand.NANO, SpectralBand.PICO, SpectralBand.FEMTO, SpectralBand.ATTO],
            "SENSOR_CHARLIE"
        )
        gateway = WNSPv5Node(
            "gateway",
            list(SpectralBand),
            "GATEWAY_QUANTUM"
        )
        
        network.add_node(alice)
        network.add_node(bob)
        network.add_node(charlie)
        network.add_node(gateway)
        
        network.connect_nodes("alice", "bob", SpectralBand.NANO, 5.0)
        network.connect_nodes("alice", "charlie", SpectralBand.PICO, 3.0)
        network.connect_nodes("alice", "gateway", SpectralBand.FEMTO, 2.0)
        network.connect_nodes("bob", "charlie", SpectralBand.NANO, 4.0)
        network.connect_nodes("bob", "gateway", SpectralBand.NANO, 6.0)
        network.connect_nodes("charlie", "gateway", SpectralBand.ATTO, 1.0)
        
        alice.stake_spectrum(50000.0, [SpectralBand.NANO, SpectralBand.PICO])
        gateway.stake_spectrum(100000.0, list(SpectralBand)[:5])
        charlie.stake_spectrum(75000.0, [SpectralBand.NANO, SpectralBand.PICO, SpectralBand.FEMTO])
        
        st.session_state.wnsp_v5_network = network
        st.session_state.message_history = []
    
    return st.session_state.wnsp_v5_network


def render_header():
    """Render dashboard header"""
    st.markdown("""
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); 
                padding: 20px; border-radius: 10px; margin-bottom: 20px;
                border: 2px solid #4ECDC4;">
        <h1 style="color: #4ECDC4; margin: 0; font-size: 28px;">
            WNSP v5.0 — Wavelength-Native Signalling Protocol
        </h1>
        <p style="color: #96CEB4; margin: 5px 0 0 0; font-size: 14px;">
            Multi-band physical attestation | PoSPECTRUM consensus | E=h·f·n economics
        </p>
    </div>
    """, unsafe_allow_html=True)


def render_band_architecture():
    """Render 7-band spectral architecture visualization"""
    st.subheader("Seven-Band Spectral Architecture")
    
    bands_data = []
    for band in SpectralBand:
        bands_data.append({
            'Band': band.band_name.upper(),
            'Scale': band.scale,
            'Min λ': f"{band.min_wavelength:.2e} m",
            'Max λ': f"{band.max_wavelength:.2e} m",
            'Energy (J)': f"{band.base_energy:.2e}",
            'Authority': band.authority_level,
            'Role': band.role
        })
    
    fig = go.Figure()
    
    for i, band in enumerate(SpectralBand):
        fig.add_trace(go.Bar(
            x=[band.band_name.upper()],
            y=[band.authority_level],
            name=band.band_name.upper(),
            marker_color=get_band_color(band),
            text=[f"Auth: {band.authority_level}"],
            textposition='auto',
            hovertemplate=(
                f"<b>{band.band_name.upper()}</b><br>" +
                f"Scale: {band.scale:.0e} m<br>" +
                f"Energy: {band.base_energy:.2e} J<br>" +
                f"Role: {band.role}<extra></extra>"
            )
        ))
    
    fig.update_layout(
        title="Spectral Band Authority Levels",
        xaxis_title="Spectral Band",
        yaxis_title="Authority Level",
        showlegend=False,
        height=350,
        template="plotly_dark",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0.1)'
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Band Roles:**")
        for band in list(SpectralBand)[:4]:
            st.markdown(f"""
            <div style="display: flex; align-items: center; margin: 5px 0;
                        padding: 8px; background: rgba(78, 205, 196, 0.1);
                        border-radius: 5px; border-left: 3px solid {get_band_color(band)};">
                <span style="font-weight: bold; color: {get_band_color(band)}; width: 60px;">
                    {band.band_name.upper()}
                </span>
                <span style="color: #ccc; font-size: 12px;">{band.role}</span>
            </div>
            """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("**Higher Bands:**")
        for band in list(SpectralBand)[4:]:
            st.markdown(f"""
            <div style="display: flex; align-items: center; margin: 5px 0;
                        padding: 8px; background: rgba(78, 205, 196, 0.1);
                        border-radius: 5px; border-left: 3px solid {get_band_color(band)};">
                <span style="font-weight: bold; color: {get_band_color(band)}; width: 60px;">
                    {band.band_name.upper()}
                </span>
                <span style="color: #ccc; font-size: 12px;">{band.role}</span>
            </div>
            """, unsafe_allow_html=True)


def render_network_topology(network: WNSPv5Network):
    """Render network topology visualization"""
    st.subheader("Network Topology")
    
    node_positions = {
        'alice': (0, 1),
        'bob': (1, 0),
        'charlie': (2, 1),
        'gateway': (1, 2)
    }
    
    fig = go.Figure()
    
    edges_drawn = set()
    for node_id, node in network.nodes.items():
        for neighbor_id, bands in node.router.neighbors.items():
            edge_key = tuple(sorted([node_id, neighbor_id]))
            if edge_key not in edges_drawn:
                edges_drawn.add(edge_key)
                x0, y0 = node_positions.get(node_id, (0, 0))
                x1, y1 = node_positions.get(neighbor_id, (1, 1))
                
                band = list(bands.keys())[0] if bands else SpectralBand.NANO
                
                fig.add_trace(go.Scatter(
                    x=[x0, x1],
                    y=[y0, y1],
                    mode='lines',
                    line=dict(color=get_band_color(band), width=2),
                    hoverinfo='text',
                    hovertext=f"{node_id} ↔ {neighbor_id} ({band.band_name})"
                ))
    
    for node_id, node in network.nodes.items():
        x, y = node_positions.get(node_id, (0, 0))
        bands_str = ', '.join([b.band_name for b in node.supported_bands[:3]])
        if len(node.supported_bands) > 3:
            bands_str += f" +{len(node.supported_bands) - 3}"
        
        fig.add_trace(go.Scatter(
            x=[x],
            y=[y],
            mode='markers+text',
            marker=dict(
                size=40,
                color='#4ECDC4' if node_id != 'gateway' else '#FFD700',
                line=dict(color='white', width=2)
            ),
            text=[node_id.upper()],
            textposition='bottom center',
            textfont=dict(color='white', size=12),
            hoverinfo='text',
            hovertext=f"<b>{node_id.upper()}</b><br>Bands: {bands_str}<br>Sensor: {node.sensor_id}"
        ))
    
    fig.update_layout(
        showlegend=False,
        height=400,
        template="plotly_dark",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        margin=dict(l=20, r=20, t=20, b=20)
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    col1, col2, col3, col4 = st.columns(4)
    for i, (node_id, node) in enumerate(network.nodes.items()):
        col = [col1, col2, col3, col4][i % 4]
        with col:
            status = node.get_status()
            st.markdown(f"""
            <div style="background: rgba(78, 205, 196, 0.1); padding: 10px;
                        border-radius: 8px; border: 1px solid #4ECDC4;">
                <div style="font-weight: bold; color: #4ECDC4;">{node_id.upper()}</div>
                <div style="font-size: 11px; color: #888;">
                    Bands: {len(status['supported_bands'])}<br>
                    Sent: {status['frames_sent']} | Recv: {status['frames_received']}<br>
                    Staked: {'Yes' if status['staked'] else 'No'}
                </div>
            </div>
            """, unsafe_allow_html=True)


def render_message_sender(network: WNSPv5Network):
    """Render message sending interface"""
    st.subheader("Send WNSP v5 Frame")
    
    col1, col2 = st.columns(2)
    
    with col1:
        from_node = st.selectbox(
            "From Node",
            options=list(network.nodes.keys()),
            format_func=lambda x: x.upper()
        )
        
        band = st.selectbox(
            "Spectral Band",
            options=list(SpectralBand),
            format_func=lambda x: f"{x.band_name.upper()} — {x.role[:30]}..."
        )
    
    with col2:
        to_options = [n for n in network.nodes.keys() if n != from_node]
        to_node = st.selectbox(
            "To Node",
            options=to_options,
            format_func=lambda x: x.upper()
        )
        
        priority = st.selectbox(
            "Priority",
            options=list(Priority),
            format_func=lambda x: x.name
        )
    
    message = st.text_area(
        "Message Payload",
        value="Hello from WNSP v5!",
        height=80
    )
    
    energy_cost = PLANCK_CONSTANT * band.center_frequency * len(message) * band.authority_level ** 2
    scaled_cost = energy_cost * 1e20
    
    st.markdown(f"""
    <div style="background: rgba(150, 206, 180, 0.1); padding: 10px;
                border-radius: 5px; border-left: 3px solid #96CEB4; margin: 10px 0;">
        <b>Energy Cost Estimate:</b> E = h·f·n_cycles × authority²<br>
        <span style="color: #96CEB4; font-size: 18px;">{scaled_cost:.4f} EU</span>
        <span style="color: #888; font-size: 12px;"> ({energy_cost:.2e} J)</span>
    </div>
    """, unsafe_allow_html=True)
    
    if st.button("Send Frame", type="primary", width="stretch"):
        success, msg = network.send_message(
            from_node, to_node,
            message.encode('utf-8'),
            band, priority
        )
        
        if success:
            st.success(f"Frame sent successfully! {msg}")
            if 'message_history' not in st.session_state:
                st.session_state.message_history = []
            st.session_state.message_history.append({
                'from': from_node,
                'to': to_node,
                'band': band.band_name,
                'priority': priority.name,
                'message': message[:50],
                'time': time.strftime('%H:%M:%S')
            })
        else:
            st.error(f"Send failed: {msg}")


def render_pospectrum_status(network: WNSPv5Network):
    """Render PoSPECTRUM consensus status"""
    st.subheader("PoSPECTRUM Consensus")
    
    all_stakes = {}
    for node_id, node in network.nodes.items():
        if node_id in node.consensus.stakes:
            all_stakes[node_id] = node.consensus.stakes[node_id]
    
    if all_stakes:
        stake_data = []
        for node_id, stake in all_stakes.items():
            stake_data.append({
                'Node': node_id.upper(),
                'Stake': stake.stake_amount,
                'Bands': len(stake.staked_bands),
                'Weight': stake.calculate_weight(),
                'Reliability': stake.reliability_score
            })
        
        df = pd.DataFrame(stake_data)
        
        fig = go.Figure(data=[
            go.Bar(
                x=df['Node'],
                y=df['Stake'],
                marker_color='#4ECDC4',
                text=df['Stake'].apply(lambda x: f"{x:,.0f}"),
                textposition='auto'
            )
        ])
        
        fig.update_layout(
            title="Spectral Stakes by Node",
            xaxis_title="Node",
            yaxis_title="Stake (EU)",
            height=300,
            template="plotly_dark",
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0.1)'
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        col1, col2, col3 = st.columns(3)
        
        total_stake = sum(s.stake_amount for s in all_stakes.values())
        total_weight = sum(s.calculate_weight() for s in all_stakes.values())
        avg_reliability = np.mean([s.reliability_score for s in all_stakes.values()])
        
        col1.metric("Total Staked", f"{total_stake:,.0f} EU")
        col2.metric("Combined Weight", f"{total_weight:.4f}")
        col3.metric("Avg Reliability", f"{avg_reliability:.2%}")
    else:
        st.info("No stakes registered yet. Nodes can stake spectrum credits to participate in consensus.")


def render_energy_economics(network: WNSPv5Network):
    """Render energy economics visualization"""
    st.subheader("Energy Economics (E = h·f·n)")
    
    energy_data = []
    for band in SpectralBand:
        energy_data.append({
            'Band': band.band_name.upper(),
            'Frequency (Hz)': band.center_frequency,
            'Base Energy (J)': band.base_energy,
            'Authority': band.authority_level,
            'Cost Multiplier': band.authority_level ** 2
        })
    
    df = pd.DataFrame(energy_data)
    
    fig = make_subplots(rows=1, cols=2, 
                        subplot_titles=("Frequency by Band", "Cost Multiplier"))
    
    fig.add_trace(
        go.Bar(
            x=df['Band'],
            y=np.log10(df['Frequency (Hz)']),
            marker_color=[get_band_color(b) for b in SpectralBand],
            name="log₁₀(Frequency)"
        ),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Bar(
            x=df['Band'],
            y=df['Cost Multiplier'],
            marker_color=[get_band_color(b) for b in SpectralBand],
            name="Cost Multiplier"
        ),
        row=1, col=2
    )
    
    fig.update_layout(
        height=300,
        showlegend=False,
        template="plotly_dark",
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0.1)'
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("""
    <div style="background: rgba(69, 183, 209, 0.1); padding: 15px;
                border-radius: 8px; border: 1px solid #45B7D1;">
        <h4 style="color: #45B7D1; margin: 0 0 10px 0;">Energy Cost Formula</h4>
        <code style="font-size: 16px; color: #fff;">
            E = h × f × n_cycles × authority²
        </code>
        <br><br>
        <span style="color: #888; font-size: 12px;">
            Where h = 6.626×10⁻³⁴ J·s (Planck constant),
            f = frequency (Hz), n = pulse count
        </span>
    </div>
    """, unsafe_allow_html=True)


def render_frame_structure():
    """Render WNSP v5 frame structure documentation"""
    st.subheader("WNSP v5 Frame Structure")
    
    st.markdown("""
    ```
    WNSP_FRAME ::= [PHY_HDR][BAND_HDR][ATTEST][CONTROL][PAYLOAD][FEC][FRAUD_SIG]
    ```
    """)
    
    frame_parts = [
        ("PHY_HDR", "48 bits", "Physical Event Descriptor", "#FF6B6B"),
        ("BAND_HDR", "64 bits", "Multi-band routing metadata", "#4ECDC4"),
        ("ATTEST", "256-2048 bits", "Physical attestation token", "#45B7D1"),
        ("CONTROL", "variable", "Routing & governance metadata", "#96CEB4"),
        ("PAYLOAD", "0..N bytes", "Application data", "#FFEAA7"),
        ("FEC", "variable", "Forward error correction", "#DDA0DD"),
        ("FRAUD_SIG", "variable", "Multi-sensor endorsements", "#FFD700")
    ]
    
    for name, size, desc, color in frame_parts:
        st.markdown(f"""
        <div style="display: flex; align-items: center; margin: 5px 0;
                    padding: 10px; background: rgba(255,255,255,0.05);
                    border-radius: 5px; border-left: 4px solid {color};">
            <div style="width: 100px; font-weight: bold; color: {color};">{name}</div>
            <div style="width: 120px; color: #888; font-size: 12px;">{size}</div>
            <div style="color: #ccc;">{desc}</div>
        </div>
        """, unsafe_allow_html=True)


def render_message_log():
    """Render message history log"""
    st.subheader("Message Log")
    
    if 'message_history' in st.session_state and st.session_state.message_history:
        for msg in reversed(st.session_state.message_history[-10:]):
            band_color = get_band_color(SpectralBand[msg['band'].upper()])
            priority_color = "#FF6B6B" if msg['priority'] == 'EMERGENCY' else "#4ECDC4"
            
            st.markdown(f"""
            <div style="background: rgba(78, 205, 196, 0.05); padding: 10px;
                        border-radius: 5px; margin: 5px 0;
                        border-left: 3px solid {band_color};">
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #4ECDC4;">
                        {msg['from'].upper()} → {msg['to'].upper()}
                    </span>
                    <span style="color: #888; font-size: 11px;">{msg['time']}</span>
                </div>
                <div style="color: #888; font-size: 12px; margin-top: 5px;">
                    Band: <span style="color: {band_color};">{msg['band'].upper()}</span> |
                    Priority: <span style="color: {priority_color};">{msg['priority']}</span>
                </div>
                <div style="color: #ccc; font-size: 13px; margin-top: 5px;">
                    "{msg['message']}..."
                </div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("No messages sent yet. Use the sender above to transmit frames.")


def render_network_stats(network: WNSPv5Network):
    """Render network statistics"""
    st.subheader("Network Statistics")
    
    stats = network.get_network_stats()
    
    col1, col2, col3, col4 = st.columns(4)
    
    col1.metric("Total Frames", stats['total_frames'])
    col2.metric("Successful", stats['successful_deliveries'])
    col3.metric("Failed", stats['failed_deliveries'])
    col4.metric("Delivery Rate", f"{stats['delivery_rate']:.1%}")
    
    col1, col2 = st.columns(2)
    col1.metric("Emergency Frames", stats['emergency_frames'])
    col2.metric("Nodes", stats['node_count'])


def render_v4_compatibility():
    """Render v4 backwards compatibility info"""
    st.subheader("WNSP v4 Compatibility")
    
    st.markdown("""
    <div style="background: rgba(150, 206, 180, 0.1); padding: 15px;
                border-radius: 8px; border: 1px solid #96CEB4;">
        <h4 style="color: #96CEB4; margin: 0 0 10px 0;">Backwards Compatible</h4>
        <p style="color: #ccc; margin: 0;">
            WNSP v5.0 can encapsulate v4 frames using the V4_ENCAPSULATED flag.
            Legacy nodes can participate in the network through gateway translation.
        </p>
        <br>
        <code style="background: rgba(0,0,0,0.3); padding: 5px 10px; border-radius: 3px;">
            V4CompatibilityLayer.encapsulate_v4(v4_frame, source, dest)
        </code>
    </div>
    """, unsafe_allow_html=True)


def main():
    """Main dashboard entry point"""
    st.set_page_config(
        page_title="WNSP v5.0 Dashboard",
        page_icon="📡",
        layout="wide"
    )
    
    st.markdown("""
    <style>
    .stApp {
        background: linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%);
    }
    .stMetric {
        background: rgba(78, 205, 196, 0.1);
        padding: 10px;
        border-radius: 8px;
        border: 1px solid rgba(78, 205, 196, 0.3);
    }
    </style>
    """, unsafe_allow_html=True)
    
    render_header()
    
    network = initialize_demo_network()
    
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Architecture",
        "Network",
        "Messaging", 
        "Consensus",
        "Economics"
    ])
    
    with tab1:
        render_band_architecture()
        render_frame_structure()
        render_v4_compatibility()
    
    with tab2:
        render_network_topology(network)
        render_network_stats(network)
    
    with tab3:
        render_message_sender(network)
        render_message_log()
    
    with tab4:
        render_pospectrum_status(network)
    
    with tab5:
        render_energy_economics(network)
    
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 12px;">
        WNSP v5.0 — Wavelength-Native Signalling Protocol<br>
        GPL v3.0 License — Community Owned, Physics Governed
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
