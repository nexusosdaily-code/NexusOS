"""
WNSP v6.0 Spectrum Consciousness Dashboard

Interactive visualization for:
- Network consciousness levels
- Spectral fingerprint profiles
- Coherence-based consensus
- Phase sequence modulation
- Global resonance metrics

GPL v3.0 License — Community Owned, Physics Governed
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np
import math
from typing import Dict, List, Any

from wnsp_v6_spectrum_consciousness import (
    SpectrumConsciousnessNetwork, ConsciousnessNode,
    SpectralFingerprint, SpectralPacket, ComplexSample,
    StokesVector, ConsciousnessLevel, SpectralBandV6,
    CoherenceMetrics, ResonanceConsensus,
    get_consciousness_network, create_demo_network,
    PLANCK_CONSTANT, SPEED_OF_LIGHT
)


def get_consciousness_color(level: ConsciousnessLevel) -> str:
    """Get color for consciousness level"""
    colors = {
        ConsciousnessLevel.DORMANT: "#666666",
        ConsciousnessLevel.AWARE: "#4ECDC4",
        ConsciousnessLevel.ATTENTIVE: "#45B7D1",
        ConsciousnessLevel.COHERENT: "#96CEB4",
        ConsciousnessLevel.RESONANT: "#DDA0DD",
        ConsciousnessLevel.TRANSCENDENT: "#FFD700"
    }
    return colors.get(level, "#808080")


def render_consciousness_gauge(coherence: float, level: ConsciousnessLevel):
    """Render consciousness level gauge"""
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=coherence * 100,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': f"Network Consciousness: {level.level_name.upper()}"},
        delta={'reference': 67, 'increasing': {'color': "#96CEB4"}},
        gauge={
            'axis': {'range': [0, 100], 'tickwidth': 1},
            'bar': {'color': get_consciousness_color(level)},
            'bgcolor': "white",
            'borderwidth': 2,
            'bordercolor': "gray",
            'steps': [
                {'range': [0, 25], 'color': '#ffebee'},
                {'range': [25, 50], 'color': '#fff3e0'},
                {'range': [50, 75], 'color': '#e8f5e9'},
                {'range': [75, 90], 'color': '#e3f2fd'},
                {'range': [90, 100], 'color': '#fce4ec'}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 67
            }
        }
    ))
    
    fig.update_layout(height=300, margin=dict(l=20, r=20, t=50, b=20))
    st.plotly_chart(fig, use_container_width=True)


def render_spectral_profile(fingerprint: SpectralFingerprint):
    """Render spectral fingerprint profile"""
    wavelengths = [s.wavelength_nm for s in fingerprint.profile]
    amplitudes = [s.amplitude for s in fingerprint.profile]
    phases = [s.phase for s in fingerprint.profile]
    
    fig = make_subplots(
        rows=2, cols=1,
        subplot_titles=("Amplitude Spectrum", "Phase Spectrum"),
        vertical_spacing=0.15
    )
    
    colors = [f'hsl({int(380 + (wl - 400) * 0.8)}, 70%, 50%)' for wl in wavelengths]
    
    fig.add_trace(
        go.Bar(x=wavelengths, y=amplitudes, marker_color=colors, name="Amplitude"),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Scatter(x=wavelengths, y=phases, mode='lines+markers',
                  line=dict(color='#DDA0DD', width=2),
                  marker=dict(size=8), name="Phase"),
        row=2, col=1
    )
    
    fig.update_xaxes(title_text="Wavelength (nm)", row=1, col=1)
    fig.update_xaxes(title_text="Wavelength (nm)", row=2, col=1)
    fig.update_yaxes(title_text="Amplitude", row=1, col=1)
    fig.update_yaxes(title_text="Phase (rad)", row=2, col=1)
    
    fig.update_layout(height=400, showlegend=False)
    st.plotly_chart(fig, use_container_width=True)


def render_stokes_poincare(stokes: StokesVector):
    """Render Stokes vector on Poincare sphere"""
    s1_norm = stokes.S1 / stokes.S0 if stokes.S0 > 0 else 0
    s2_norm = stokes.S2 / stokes.S0 if stokes.S0 > 0 else 0
    s3_norm = stokes.S3 / stokes.S0 if stokes.S0 > 0 else 0
    
    u = np.linspace(0, 2 * np.pi, 50)
    v = np.linspace(0, np.pi, 50)
    x = np.outer(np.cos(u), np.sin(v))
    y = np.outer(np.sin(u), np.sin(v))
    z = np.outer(np.ones(np.size(u)), np.cos(v))
    
    fig = go.Figure()
    
    fig.add_trace(go.Surface(
        x=x, y=y, z=z,
        opacity=0.3,
        colorscale='Blues',
        showscale=False
    ))
    
    fig.add_trace(go.Scatter3d(
        x=[s1_norm], y=[s2_norm], z=[s3_norm],
        mode='markers',
        marker=dict(size=12, color='#FFD700', symbol='diamond'),
        name='Polarization State'
    ))
    
    fig.add_trace(go.Scatter3d(
        x=[0, s1_norm], y=[0, s2_norm], z=[0, s3_norm],
        mode='lines',
        line=dict(color='#FF6B6B', width=4),
        name='State Vector'
    ))
    
    fig.update_layout(
        title="Poincare Sphere - Polarization State",
        scene=dict(
            xaxis_title="S1 (H-V)",
            yaxis_title="S2 (±45°)",
            zaxis_title="S3 (R-L)",
            aspectmode='cube'
        ),
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_network_topology(network: SpectrumConsciousnessNetwork):
    """Render network consciousness topology"""
    nodes = list(network.nodes.values())
    n = len(nodes)
    
    if n == 0:
        st.info("No nodes in network")
        return
    
    angles = [2 * math.pi * i / n for i in range(n)]
    x_pos = [math.cos(a) * 2 for a in angles]
    y_pos = [math.sin(a) * 2 for a in angles]
    
    fig = go.Figure()
    
    for i, node in enumerate(nodes):
        for j, other_id in enumerate(node.connected_nodes):
            if other_id in [n.node_id for n in nodes]:
                j_idx = [k for k, nd in enumerate(nodes) if nd.node_id == other_id][0]
                fig.add_trace(go.Scatter(
                    x=[x_pos[i], x_pos[j_idx]],
                    y=[y_pos[i], y_pos[j_idx]],
                    mode='lines',
                    line=dict(color='rgba(150,150,150,0.3)', width=1),
                    showlegend=False,
                    hoverinfo='none'
                ))
    
    colors = [get_consciousness_color(node.consciousness_level) for node in nodes]
    sizes = [20 + node.fingerprint.stake_weight * 10 for node in nodes]
    
    fig.add_trace(go.Scatter(
        x=x_pos, y=y_pos,
        mode='markers+text',
        marker=dict(size=sizes, color=colors, line=dict(width=2, color='white')),
        text=[n.node_id for n in nodes],
        textposition="top center",
        hovertemplate="<b>%{text}</b><br>Level: %{customdata[0]}<br>Stake: %{customdata[1]:.2f}<extra></extra>",
        customdata=[[n.consciousness_level.level_name, n.fingerprint.stake_weight] for n in nodes]
    ))
    
    fig.update_layout(
        title="Consciousness Network Topology",
        showlegend=False,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_coherence_matrix(network: SpectrumConsciousnessNetwork):
    """Render coherence matrix between all nodes"""
    nodes = list(network.nodes.values())
    n = len(nodes)
    
    if n < 2:
        st.info("Need at least 2 nodes for coherence matrix")
        return
    
    matrix = np.zeros((n, n))
    
    for i, node_i in enumerate(nodes):
        for j, node_j in enumerate(nodes):
            if i == j:
                matrix[i][j] = 1.0
            else:
                coh = CoherenceMetrics.spectral_similarity(
                    node_i.fingerprint.profile,
                    node_j.fingerprint.profile
                )
                matrix[i][j] = coh
    
    fig = go.Figure(data=go.Heatmap(
        z=matrix,
        x=[n.node_id for n in nodes],
        y=[n.node_id for n in nodes],
        colorscale='Viridis',
        zmin=0, zmax=1,
        text=np.round(matrix, 2),
        texttemplate="%{text}",
        textfont={"size": 10},
        hovertemplate="From: %{y}<br>To: %{x}<br>Coherence: %{z:.3f}<extra></extra>"
    ))
    
    fig.update_layout(
        title="Inter-Node Coherence Matrix",
        xaxis_title="Node",
        yaxis_title="Node",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_band_spectrum():
    """Render spectral bands visualization"""
    bands = list(SpectralBandV6)
    
    fig = go.Figure()
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#FFD700', '#FF69B4', '#00CED1']
    
    for i, band in enumerate(bands):
        log_min = math.log10(band.min_wavelength * 1e9) if band.min_wavelength > 0 else -15
        log_max = math.log10(band.max_wavelength * 1e9) if band.max_wavelength > 0 else -15
        
        fig.add_trace(go.Bar(
            x=[band.band_name],
            y=[log_max - log_min],
            base=[log_min],
            marker_color=colors[i % len(colors)],
            name=band.band_name,
            hovertemplate=f"<b>{band.band_name.upper()}</b><br>{band.role}<extra></extra>"
        ))
    
    fig.update_layout(
        title="WNSP v6.0 Spectral Bands",
        xaxis_title="Band",
        yaxis_title="log₁₀(Wavelength in nm)",
        showlegend=False,
        height=300
    )
    
    st.plotly_chart(fig, use_container_width=True)


def render_consensus_simulation(network: SpectrumConsciousnessNetwork):
    """Interactive consensus simulation"""
    st.subheader("Resonance Consensus Simulation")
    
    nodes = list(network.nodes.keys())
    if not nodes:
        st.warning("No nodes available")
        return
    
    col1, col2 = st.columns(2)
    with col1:
        proposer_id = st.selectbox("Select Proposer", nodes, key="consensus_proposer")
    with col2:
        threshold = st.slider("Resonance Threshold", 0.3, 0.95, 0.67, 0.01, key="consensus_threshold")
    
    if st.button("Run Consensus", type="primary", key="run_consensus"):
        network.consensus.resonance_threshold = threshold
        proposer = network.nodes[proposer_id]
        
        proposal_id = f"proposal_{int(time.time())}"
        result = network.run_consensus(
            proposal_id,
            proposer.fingerprint.profile,
            proposer_id
        )
        
        if "error" in result:
            st.error(result["error"])
        else:
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Accepted", "Yes" if result['accepted'] else "No")
            with col2:
                st.metric("Score", f"{result['normalized_score']:.3f}")
            with col3:
                st.metric("Responses", result['responses'])
            with col4:
                st.metric("Avg Coherence", f"{result['avg_coherence']:.3f}")
            
            if result['accepted']:
                st.success("Proposal reached resonance! Collective consciousness aligned.")
            else:
                st.warning(f"Proposal rejected. Score {result['normalized_score']:.3f} < threshold {threshold}")


def render_v6_dashboard():
    """Main WNSP v6.0 Consciousness Dashboard"""
    st.title("WNSP v6.0 — Spectrum Consciousness")
    st.markdown("*Network-wide awareness through coherent spectral resonance*")
    
    if 'consciousness_network' not in st.session_state:
        st.session_state.consciousness_network = create_demo_network(7)
    
    network = st.session_state.consciousness_network
    
    with st.sidebar:
        st.header("Network Control")
        
        num_nodes = st.slider("Network Size", 3, 12, 7, key="v6_num_nodes")
        
        if st.button("Regenerate Network", key="regen_network"):
            st.session_state.consciousness_network = create_demo_network(num_nodes)
            st.rerun()
        
        st.divider()
        
        stats = network.get_network_stats()
        st.metric("Total Nodes", stats['total_nodes'])
        st.metric("Global Coherence", f"{stats['global_coherence']:.2%}")
        st.metric("Network Level", stats['network_consciousness'].upper())
        st.metric("Total Stake", f"{stats['total_stake']:.1f}")
    
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "Network Overview",
        "Node Profiles",
        "Coherence Analysis",
        "Consensus",
        "Spectral Bands"
    ])
    
    with tab1:
        stats = network.get_network_stats()
        render_consciousness_gauge(stats['global_coherence'], network.network_consciousness)
        
        col1, col2 = st.columns(2)
        with col1:
            render_network_topology(network)
        with col2:
            levels_count = {}
            for level_name in stats['node_levels'].values():
                levels_count[level_name] = levels_count.get(level_name, 0) + 1
            
            fig = go.Figure(data=[go.Pie(
                labels=list(levels_count.keys()),
                values=list(levels_count.values()),
                hole=0.4,
                marker_colors=[get_consciousness_color(
                    next(l for l in ConsciousnessLevel if l.level_name == name)
                ) for name in levels_count.keys()]
            )])
            fig.update_layout(title="Consciousness Distribution", height=400)
            st.plotly_chart(fig, use_container_width=True)
    
    with tab2:
        nodes = list(network.nodes.values())
        if nodes:
            selected_node = st.selectbox(
                "Select Node",
                [n.node_id for n in nodes],
                key="profile_node_select"
            )
            
            node = network.nodes[selected_node]
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Consciousness Level", node.consciousness_level.level_name.upper())
            with col2:
                st.metric("Stake Weight", f"{node.fingerprint.stake_weight:.2f}")
            with col3:
                st.metric("Fingerprint", node.fingerprint.fingerprint_hash[:12] + "...")
            
            col1, col2 = st.columns(2)
            with col1:
                render_spectral_profile(node.fingerprint)
            with col2:
                render_stokes_poincare(node.fingerprint.stokes_signature)
            
            st.caption(f"Stokes Parameters: S0={node.fingerprint.stokes_signature.S0:.3f}, "
                      f"S1={node.fingerprint.stokes_signature.S1:.3f}, "
                      f"S2={node.fingerprint.stokes_signature.S2:.3f}, "
                      f"S3={node.fingerprint.stokes_signature.S3:.3f}")
            st.caption(f"Degree of Polarization: {node.fingerprint.stokes_signature.degree_of_polarization:.3f}")
    
    with tab3:
        render_coherence_matrix(network)
        
        st.subheader("Packet Propagation Test")
        nodes = list(network.nodes.keys())
        if len(nodes) >= 2:
            col1, col2, col3 = st.columns(3)
            with col1:
                sender = st.selectbox("Sender", nodes, key="prop_sender")
            with col2:
                target = st.selectbox("Target", [n for n in nodes if n != sender], key="prop_target")
            with col3:
                energy = st.number_input("Energy (J)", value=1e-6, format="%.2e", key="prop_energy")
            
            if st.button("Send Packet", key="send_packet"):
                sender_node = network.nodes[sender]
                packet = sender_node.send_spectral_packet(
                    network.nodes[target].fingerprint.fingerprint_hash,
                    sender_node.fingerprint.profile,
                    energy
                )
                
                reached = network.propagate_packet(packet, sender, max_hops=5)
                
                st.success(f"Packet reached {len(reached)} nodes: {', '.join(reached)}")
                st.json(packet.to_dict())
    
    with tab4:
        import time
        render_consensus_simulation(network)
    
    with tab5:
        render_band_spectrum()
        
        st.subheader("Band Details")
        for band in SpectralBandV6:
            with st.expander(f"{band.band_name.upper()} Band"):
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Min λ", f"{band.min_wavelength:.2e} m")
                with col2:
                    st.metric("Max λ", f"{band.max_wavelength:.2e} m")
                with col3:
                    st.metric("Base Energy", f"{band.base_energy:.2e} J")
                st.caption(f"Role: {band.role}")


def render_v6_page():
    """Entry point for Mobile Hub integration"""
    render_v6_dashboard()


if __name__ == "__main__":
    import time
    render_v6_dashboard()
