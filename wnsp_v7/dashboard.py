"""
WNSP v7.0 — Harmonic Octave Dashboard with Lambda Boson Substrate

Visualization of the Harmonic Octave Protocol and Lambda Boson Substrate:
- Node tone signatures (musical notes)
- Octave band distribution
- Resonance network graph
- Excitation chain propagation
- Carrier-payload visualization
- Lambda Boson substrate (mass-energy conservation)
- Standing wave storage (stored value)
- Gravitational routing (mass-weighted paths)
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np
import math
import time
from typing import Dict, List, Any

from wnsp_v7.protocol import (
    HarmonicNetwork, HarmonicNode, HarmonicPacket,
    ToneSignature, CarrierWave, HarmonicPayload,
    Octave, HarmonicRatio, ExcitationState,
    PLANCK_CONSTANT, SPEED_OF_LIGHT, A4_FREQUENCY
)

from wnsp_v7.substrate import (
    OscillatorState, OscillationRegister, SubstrateEncoder,
    OscillationField, lambda_mass_from_frequency
)

from wnsp_v7.mass_routing import SubstrateNetwork

try:
    from wnsp_protocol_v7 import encode_lambda_message, LambdaEncoder
except ImportError:
    encode_lambda_message = None
    LambdaEncoder = None


@st.cache_resource
def get_network() -> HarmonicNetwork:
    network = HarmonicNetwork()
    default_nodes = [
        ("alice", 1.0),
        ("bob", 1.0),
        ("charlie", 0.8),
        ("diana", 0.6),
        ("eve", 0.9),
        ("frank", 0.7),
        ("grace", 0.5),
        ("henry", 0.85)
    ]
    for node_id, stake in default_nodes:
        network.add_node(node_id, stake)
    return network

@st.cache_resource
def get_substrate_network() -> SubstrateNetwork:
    network = SubstrateNetwork()
    default_nodes = [
        ("alice", 10.0),
        ("bob", 8.0),
        ("charlie", 6.0),
        ("diana", 4.0),
        ("eve", 5.0)
    ]
    for node_id, stake in default_nodes:
        network.add_node(node_id, stake)
    return network

def render_header():
    st.markdown("""
    # 🎵 WNSP v7.0 — Harmonic Octave Protocol
    
    > **"Energy is alternating wavelength frequency vibration octave tone"**  
    > *— Founder Te Rata Pou*
    
    ---
    """)
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Protocol Version", "v7.0")
    with col2:
        st.metric("Core Principle", "E = hf")
    with col3:
        st.metric("Structure", "Octave Bands")
    with col4:
        st.metric("Propagation", "Excitation Chain")

def render_octave_spectrum():
    st.markdown("## 🌈 Octave Spectrum")
    st.markdown("""
    Frequencies organized into doubling bands — each octave is 2× the previous.
    Like musical octaves: A4 (440 Hz) → A5 (880 Hz) → A6 (1760 Hz)...
    """)
    
    octaves = list(Octave)
    
    fig = go.Figure()
    
    colors = px.colors.qualitative.Plotly
    
    for i, octave in enumerate(octaves):
        color = colors[i % len(colors)]
        
        fig.add_trace(go.Bar(
            x=[octave.name],
            y=[math.log10(octave.freq_max) - math.log10(octave.freq_min)],
            base=[math.log10(octave.freq_min)],
            name=f"{octave.name}: {octave.role}",
            marker_color=color,
            text=f"{octave.role}",
            textposition="inside",
            hovertemplate=(
                f"<b>{octave.name}</b><br>" +
                f"Range: {octave.freq_min:.2e} - {octave.freq_max:.2e} Hz<br>" +
                f"Role: {octave.role}<extra></extra>"
            )
        ))
    
    fig.update_layout(
        title="Electromagnetic Spectrum as Octave Bands",
        xaxis_title="Octave Band",
        yaxis_title="Log₁₀ Frequency (Hz)",
        showlegend=False,
        height=400,
        template="plotly_dark"
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    with st.expander("Octave Band Details"):
        data = []
        for octave in octaves:
            e_min, e_max = octave.energy_range
            data.append({
                "Octave": octave.name,
                "Freq Min (Hz)": f"{octave.freq_min:.2e}",
                "Freq Max (Hz)": f"{octave.freq_max:.2e}",
                "Center (Hz)": f"{octave.center_frequency:.2e}",
                "Energy Range (J)": f"{e_min:.2e} - {e_max:.2e}",
                "Role": octave.role
            })
        st.dataframe(data, use_container_width=True)

def render_node_tones(network: HarmonicNetwork):
    st.markdown("## 🎼 Node Tone Signatures")
    st.markdown("""
    Each node has a **fundamental tone** — like a musical instrument.
    Nodes with harmonic relationships (octaves, fifths, fourths) resonate efficiently.
    """)
    
    nodes = list(network.nodes.values())
    
    fundamentals = [n.tone.fundamental_freq for n in nodes]
    names = [n.node_id for n in nodes]
    notes = [n.tone.note_name for n in nodes]
    
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=("Node Fundamental Frequencies", "Harmonic Profiles"),
        specs=[[{"type": "bar"}, {"type": "heatmap"}]]
    )
    
    fig.add_trace(
        go.Bar(
            x=names,
            y=fundamentals,
            text=notes,
            textposition="outside",
            marker_color=[f"hsl({i * 45}, 70%, 50%)" for i in range(len(nodes))],
            hovertemplate="<b>%{x}</b><br>%{y:.2f} Hz<br>Note: %{text}<extra></extra>"
        ),
        row=1, col=1
    )
    
    harmonic_data = []
    for node in nodes:
        row = []
        for i in range(8):
            if i < len(node.tone.harmonic_amplitudes):
                row.append(node.tone.harmonic_amplitudes[i])
            else:
                row.append(0)
        harmonic_data.append(row)
    
    fig.add_trace(
        go.Heatmap(
            z=harmonic_data,
            x=[f"H{i+1}" for i in range(8)],
            y=names,
            colorscale="Viridis",
            hovertemplate="<b>%{y}</b><br>Harmonic %{x}: %{z:.3f}<extra></extra>"
        ),
        row=1, col=2
    )
    
    fig.update_layout(height=400, template="plotly_dark", showlegend=False)
    fig.update_xaxes(title_text="Node", row=1, col=1)
    fig.update_yaxes(title_text="Frequency (Hz)", row=1, col=1)
    fig.update_xaxes(title_text="Harmonic Number", row=1, col=2)
    fig.update_yaxes(title_text="Node", row=1, col=2)
    
    st.plotly_chart(fig, use_container_width=True)
    
    with st.expander("Node Details"):
        data = []
        for node in nodes:
            data.append({
                "Node": node.node_id,
                "Note": node.tone.note_name,
                "Fundamental (Hz)": f"{node.tone.fundamental_freq:.2f}",
                "Octave": node.tone.octave.name,
                "Stake": node.stake,
                "Connections": len(node.connected_nodes),
                "State": node.excitation_state.state_name
            })
        st.dataframe(data, use_container_width=True)

def render_resonance_network(network: HarmonicNetwork):
    st.markdown("## 🔗 Resonance Network")
    st.markdown("""
    Nodes connect when their tones form harmonic relationships.
    **Octave (2:1)** = strongest | **Fifth (3:2)** = strong | **Fourth (4:3)** = stable
    """)
    
    topology = network.network_topology()
    
    nodes = list(network.nodes.values())
    n = len(nodes)
    
    angles = [2 * math.pi * i / n for i in range(n)]
    x_pos = {nodes[i].node_id: math.cos(angles[i]) for i in range(n)}
    y_pos = {nodes[i].node_id: math.sin(angles[i]) for i in range(n)}
    
    fig = go.Figure()
    
    for conn in topology["connections"]:
        x0, y0 = x_pos[conn["from"]], y_pos[conn["from"]]
        x1, y1 = x_pos[conn["to"]], y_pos[conn["to"]]
        
        width = conn["resonance"] * 5
        
        ratio_colors = {
            "UNISON": "rgba(255, 255, 255, 0.9)",
            "OCTAVE": "rgba(255, 215, 0, 0.8)",
            "FIFTH": "rgba(0, 255, 127, 0.7)",
            "FOURTH": "rgba(0, 191, 255, 0.6)",
            "MAJOR_THIRD": "rgba(255, 105, 180, 0.5)",
            "MINOR_THIRD": "rgba(255, 160, 122, 0.5)"
        }
        color = ratio_colors.get(conn["ratio"], "rgba(128, 128, 128, 0.4)")
        
        fig.add_trace(go.Scatter(
            x=[x0, x1],
            y=[y0, y1],
            mode="lines",
            line=dict(width=width, color=color),
            hoverinfo="text",
            hovertext=f"{conn['from']} ↔ {conn['to']}<br>Resonance: {conn['resonance']:.3f}<br>Ratio: {conn['ratio']}",
            showlegend=False
        ))
    
    node_x = [x_pos[n.node_id] for n in nodes]
    node_y = [y_pos[n.node_id] for n in nodes]
    node_text = [f"{n.node_id}<br>{n.tone.note_name}" for n in nodes]
    node_colors = [n.tone.fundamental_freq for n in nodes]
    
    fig.add_trace(go.Scatter(
        x=node_x,
        y=node_y,
        mode="markers+text",
        marker=dict(
            size=30,
            color=node_colors,
            colorscale="rainbow",
            showscale=True,
            colorbar=dict(title="Freq (Hz)")
        ),
        text=[n.node_id for n in nodes],
        textposition="top center",
        hovertemplate="%{hovertext}<extra></extra>",
        hovertext=node_text,
        showlegend=False
    ))
    
    fig.update_layout(
        title="Harmonic Resonance Connections",
        xaxis=dict(visible=False),
        yaxis=dict(visible=False, scaleanchor="x"),
        height=500,
        template="plotly_dark"
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Harmonic Ratios (Resonance Strength)**")
        for ratio in HarmonicRatio:
            strength = ratio.resonance_strength()
            bar = "█" * int(strength * 20)
            st.text(f"{ratio.name:12} {ratio.numerator}:{ratio.denominator}  {bar} {strength:.3f}")
    
    with col2:
        st.markdown("**Octave Distribution**")
        dist = topology["octave_distribution"]
        for octave, count in dist.items():
            st.text(f"{octave}: {'●' * count} ({count} nodes)")

def render_packet_creator(network: HarmonicNetwork):
    st.markdown("## 📦 Create Harmonic Packet")
    st.markdown("""
    Create a packet with carrier wave (the light) and payload (the meaning).
    Watch it propagate through excitation chains.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        source_node = st.selectbox(
            "Source Node",
            options=list(network.nodes.keys()),
            key="source_node"
        )
        
        target_options = ["Broadcast"] + [n for n in network.nodes.keys() if n != source_node]
        target_node = st.selectbox(
            "Target Node",
            options=target_options,
            key="target_node"
        )
        
        message = st.text_area(
            "Message Content",
            value="Hello from the harmonic octave network!",
            key="message"
        )
    
    with col2:
        energy_budget = st.slider(
            "Energy Budget (J)",
            min_value=-10.0,
            max_value=-4.0,
            value=-6.0,
            step=0.5,
            format="10^%.1f",
            key="energy"
        )
        energy_j = 10 ** energy_budget
        
        octave_names = [o.name for o in Octave]
        selected_octave = st.selectbox(
            "Transmission Octave",
            options=octave_names,
            index=5,
            key="octave"
        )
        octave = Octave[selected_octave]
        
        authority = st.slider(
            "Authority Level",
            min_value=0,
            max_value=7,
            value=0,
            key="authority"
        )
    
    if st.button("🚀 Create & Propagate Packet", use_container_width=True):
        source = network.nodes[source_node]
        
        target_tone = None
        if target_node != "Broadcast":
            target_tone = network.nodes[target_node].tone.signature_hash()
        
        packet = source.create_packet(
            message.encode(),
            target_tone=target_tone,
            authority=authority,
            energy_budget=energy_j,
            octave=octave
        )
        
        st.session_state["last_packet"] = packet
        
        if target_node == "Broadcast":
            results = network.broadcast(packet, source_node)
            all_events = []
            for events in results.values():
                all_events.extend(events)
            st.session_state["last_events"] = all_events
        else:
            events = network.propagate(packet, source_node)
            st.session_state["last_events"] = events
        
        st.success(f"Packet {packet.packet_id} created and propagated!")

def render_excitation_chain():
    st.markdown("## ⚡ Excitation Chain Visualization")
    
    if "last_packet" not in st.session_state:
        st.info("Create a packet above to see the excitation chain")
        return
    
    packet = st.session_state["last_packet"]
    events = st.session_state.get("last_events", [])
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Packet ID", packet.packet_id[:12] + "...")
    with col2:
        st.metric("Hop Count", len(packet.excitation_chain))
    with col3:
        st.metric("Energy Remaining", f"{packet.remaining_energy:.2e} J")
    
    st.markdown("### Carrier Wave")
    
    t = np.linspace(0, 0.001, 1000)
    carrier = packet.carrier
    wave = carrier.amplitude * np.sin(2 * np.pi * carrier.frequency * t + carrier.phase)
    
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=t * 1000,
        y=wave,
        mode="lines",
        line=dict(color="cyan", width=2),
        name="Carrier Wave"
    ))
    fig.update_layout(
        title=f"Carrier: {carrier.frequency:.2e} Hz (Octave {packet.current_octave.name})",
        xaxis_title="Time (ms)",
        yaxis_title="Amplitude",
        height=250,
        template="plotly_dark"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("### Payload Harmonics")
    
    harmonics = packet.payload.harmonic_encoding
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=[f"H{i+1}" for i in range(len(harmonics))],
        y=harmonics,
        marker_color=[f"hsl({i * 45}, 70%, 50%)" for i in range(len(harmonics))]
    ))
    fig.update_layout(
        title="Harmonic Encoding (Payload)",
        xaxis_title="Harmonic Number",
        yaxis_title="Amplitude",
        height=250,
        template="plotly_dark"
    )
    st.plotly_chart(fig, use_container_width=True)
    
    if events:
        st.markdown("### Excitation Events")
        
        fig = go.Figure()
        
        times = [e.timestamp for e in events]
        freqs_in = [e.absorbed_frequency for e in events]
        freqs_out = [e.emitted_frequency for e in events]
        nodes = [e.node_id for e in events]
        
        fig.add_trace(go.Scatter(
            x=times,
            y=freqs_in,
            mode="markers+lines",
            name="Absorbed Frequency",
            line=dict(color="orange", dash="dash"),
            marker=dict(size=10)
        ))
        
        fig.add_trace(go.Scatter(
            x=times,
            y=freqs_out,
            mode="markers+lines",
            name="Emitted Frequency",
            line=dict(color="cyan"),
            marker=dict(size=10)
        ))
        
        for i, node in enumerate(nodes):
            fig.add_annotation(
                x=times[i],
                y=freqs_out[i],
                text=node,
                showarrow=True,
                arrowhead=2
            )
        
        fig.update_layout(
            title="Frequency Evolution Through Chain",
            xaxis_title="Timestamp",
            yaxis_title="Frequency (Hz)",
            height=300,
            template="plotly_dark"
        )
        st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("### Event Details")
        data = []
        for e in events:
            data.append({
                "Node": e.node_id,
                "Absorbed (Hz)": f"{e.absorbed_frequency:.2e}",
                "Emitted (Hz)": f"{e.emitted_frequency:.2e}",
                "Shift": f"{e.frequency_shift:.2e}",
                "Energy In (J)": f"{e.energy_absorbed:.2e}",
                "Energy Out (J)": f"{e.energy_emitted:.2e}",
                "Retained (J)": f"{e.energy_retained:.2e}",
                "Process (ms)": f"{e.processing_time_ms:.3f}"
            })
        st.dataframe(data, use_container_width=True)
    else:
        st.info("No excitation events recorded (direct delivery or no propagation)")

def render_network_status(network: HarmonicNetwork):
    st.markdown("## 📊 Network Status")
    
    status = network.status()
    stats = status["stats"]
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Total Nodes", status["total_nodes"])
    with col2:
        st.metric("Connections", status["total_connections"])
    with col3:
        st.metric("Packets Delivered", stats["packets_delivered"])
    with col4:
        st.metric("Packets Dropped", stats["packets_dropped"])
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Total Energy Consumed", f"{stats['total_energy_consumed']:.2e} J")
    with col2:
        st.metric("Average Hops", f"{stats['average_hops']:.2f}")

def render_lambda_substrate(substrate: SubstrateNetwork):
    st.markdown("## Λ Lambda Boson Substrate")
    st.markdown("""
    > **Λ = hf/c²** — Oscillation IS mass  
    > Every message carries inherent mass-equivalent through its wavelength.
    """)
    
    status = substrate.status()
    
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("Substrate Nodes", status["nodes"])
    with col2:
        st.metric("Network Lambda", f"{status['network_lambda']:.2e} kg")
    with col3:
        st.metric("Stored Lambda", f"{status['total_stored_lambda']:.2e} kg")
    with col4:
        ledger = substrate.field.ledger.status()
        st.metric("Active Lambda", f"{ledger.get('active_lambda', 0):.2e} kg")
    with col5:
        conservation = status["conservation"]
        st.metric(
            "Conservation",
            "PASSED" if conservation["is_conserved"] else "FAILED"
        )
    
    st.markdown("### Node Balances (Standing Wave Storage)")
    
    balances = status.get("node_balances", {})
    if balances:
        nodes = list(balances.keys())
        values = [balances[n] for n in nodes]
        
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=nodes,
            y=values,
            marker_color=[f"hsl({i * 60}, 70%, 50%)" for i in range(len(nodes))],
            text=[f"{v:.2e}" for v in values],
            textposition="outside"
        ))
        fig.update_layout(
            title="Lambda Mass Stored at Each Node (Standing Waves)",
            xaxis_title="Node",
            yaxis_title="Lambda Mass (kg)",
            height=350,
            template="plotly_dark"
        )
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("### Lambda Boson Equations")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        **Mass from Frequency:**
        ```
        Λ = hf / c²
        ```
        
        **Mass from Wavelength:**
        ```
        Λ = h / (λc)
        ```
        """)
    
    with col2:
        st.markdown("""
        **Conservation Law:**
        ```
        ΣΛ_in = ΣΛ_out + ΣΛ_stored + ΣΛ_dissipated
        ```
        
        **Derivation:**
        ```
        E = hf (Planck) + E = mc² (Einstein)
        → m = hf/c² = Λ (Lambda Boson)
        ```
        """)
    
    st.markdown("### Store Value (Create Standing Wave)")
    
    col1, col2 = st.columns(2)
    
    with col1:
        store_node = st.selectbox(
            "Select Node",
            options=list(substrate.substrate_nodes.keys()),
            key="store_node"
        )
        
        store_data = st.text_input(
            "Data to Store",
            value="Stored value as standing wave",
            key="store_data"
        )
        
        store_authority = st.slider(
            "Authority Level",
            min_value=0,
            max_value=7,
            value=3,
            key="store_authority"
        )
    
    with col2:
        data_bytes = store_data.encode() * 10
        preview_lambda = lambda_mass_from_frequency(4.3e14) * len(data_bytes)
        
        st.markdown("**Estimated Lambda Mass:**")
        st.code(f"Λ ≈ {preview_lambda:.3e} kg")
        st.markdown(f"Data size: {len(data_bytes)} bytes")
        st.markdown(f"Oscillators: {len(data_bytes)}")
    
    if st.button("Store Value as Standing Wave", use_container_width=True, key="store_btn"):
        result = substrate.store_value(store_node, store_data.encode() * 10, store_authority)
        if "error" not in result:
            st.success(f"Stored Λ = {result['lambda_stored']:.3e} kg at {store_node}")
            st.session_state["last_store"] = result
            st.rerun()
        else:
            st.error(result["error"])
    
    st.markdown("### Transfer Value Between Nodes")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        from_node = st.selectbox(
            "From Node",
            options=list(substrate.substrate_nodes.keys()),
            key="from_node"
        )
        from_balance = balances.get(from_node, 0)
        st.caption(f"Balance: {from_balance:.3e} kg")
    
    with col2:
        to_node = st.selectbox(
            "To Node",
            options=[n for n in substrate.substrate_nodes.keys() if n != from_node],
            key="to_node"
        )
        to_balance = balances.get(to_node, 0)
        st.caption(f"Balance: {to_balance:.3e} kg")
    
    with col3:
        transfer_pct = st.slider(
            "Transfer %",
            min_value=10,
            max_value=100,
            value=50,
            key="transfer_pct"
        )
        transfer_amount = from_balance * (transfer_pct / 100)
        st.caption(f"Amount: {transfer_amount:.3e} kg")
    
    if st.button("Transfer Lambda", use_container_width=True, key="transfer_btn"):
        if from_balance > 0:
            result = substrate.transfer_value(from_node, to_node, transfer_amount)
            if "error" not in result:
                st.success(f"Transferred {result['transferred']:.3e} kg from {from_node} to {to_node}")
                st.session_state["last_transfer"] = result
                st.rerun()
            else:
                st.error(result["error"])
        else:
            st.warning(f"{from_node} has no stored Lambda to transfer")
    
    with st.expander("Ledger Entries"):
        ledger = substrate.field.ledger
        if ledger.entries:
            data = []
            for entry in ledger.entries[-20:]:
                data.append({
                    "Type": entry.event_type,
                    "Node": entry.node_id,
                    "Λ In": f"{entry.lambda_in:.2e}",
                    "Λ Out": f"{entry.lambda_out:.2e}",
                    "Λ Stored": f"{entry.lambda_stored:.2e}",
                    "Λ Dissipated": f"{entry.lambda_dissipated:.2e}",
                    "Balance": f"{entry.lambda_balance:.2e}"
                })
            st.dataframe(data, use_container_width=True)
        else:
            st.info("No ledger entries yet")


def render_physics_foundation():
    st.markdown("## 📚 Physics Foundation")
    
    with st.expander("Core Equations", expanded=False):
        st.markdown("""
        ### Energy-Frequency Relation (Planck/Einstein)
        ```
        E = h × f
        
        Where:
          E = Energy (Joules)
          h = Planck's constant (6.626 × 10⁻³⁴ J·s)
          f = Frequency (Hz)
        ```
        
        ### Octave Doubling
        ```
        f₂ = 2 × f₁  (one octave up)
        f₃ = 4 × f₁  (two octaves up)
        f_n = 2^n × f₁  (n octaves up)
        ```
        
        ### Harmonic Series
        ```
        f_n = n × f₀  (nth harmonic of fundamental f₀)
        
        Musical intervals:
          Octave:  2:1
          Fifth:   3:2
          Fourth:  4:3
          Third:   5:4
        ```
        
        ### Resonance Condition (Tesla)
        ```
        f_source ≈ f_receiver  →  Maximum energy transfer
        
        Resonance strength ∝ 1 / complexity(ratio)
        ```
        
        ### Carrier-Payload Separation
        ```
        Carrier: The wave that transports (light)
        Payload: The information modulated onto carrier (meaning)
        
        Total signal: carrier × (1 + modulation_depth × payload)
        ```
        """)
    
    with st.expander("The Insight", expanded=False):
        st.markdown("""
        > **"Light is the spectrum projection of invisible energy"**  
        > **"A conduit of energy that radiates reflection"**  
        > **"Energy is alternating wavelength frequency vibration octave tone"**  
        > *— Founder Te Rata Pou*
        
        ### The Vision
        
        1. **Invisible Energy** — The substrate we cannot directly perceive
        2. **Conduit** — The electromagnetic field carrying oscillations
        3. **Projection** — What becomes visible/measurable (photons, packets)
        4. **Reflection** — Each node absorbs, processes, re-emits
        5. **Octave Structure** — Frequencies organized into harmonic bands
        
        ### WNSP v7 Implementation
        
        - **ToneSignature**: Each node's fundamental frequency (like a musical note)
        - **CarrierWave**: The light that carries energy
        - **HarmonicPayload**: The meaning modulated onto the carrier
        - **ExcitationChain**: Nodes absorbing and re-emitting (like atoms)
        - **OctaveBands**: Frequency organization into doubling bands
        - **HarmonicRatio**: Resonance strength based on musical intervals
        """)

def render_oscillating_encoder():
    """Render the oscillating wavelength encoder (2+ chars/particle)."""
    st.subheader("Oscillating Wavelength Encoder")
    st.markdown("**2+ characters per particle via λ₁ → λ₂ oscillation**")
    
    if encode_lambda_message is None:
        st.error("Oscillating encoder module not available")
        return
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        message = st.text_area(
            "Message to Encode",
            value="LAMBDA BOSON IS REAL MASS",
            height=80
        )
        sender = st.text_input("Sender", value="TeRataPou")
        recipient = st.text_input("Recipient", value="NexusNetwork")
    
    with col2:
        intensity = st.slider("Intensity", 1, 63, 32)
        cycles = st.slider("Cycles", 1, 10, 1)
    
    if st.button("🔬 Encode (2 chars/particle)", type="primary", use_container_width=True):
        result = encode_lambda_message(
            content=message,
            sender=sender,
            recipient=recipient,
            intensity=intensity,
            cycles=cycles
        )
        
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Characters", result['efficiency']['characters'])
        col2.metric("Particles", result['efficiency']['particles'])
        col3.metric("Chars/Particle", f"{result['efficiency']['chars_per_particle']:.2f}")
        col4.metric("vs v2.0", result['efficiency']['vs_v2_improvement'])
        
        st.success(f"✅ {result['validation']['status']}")
        
        st.markdown("### Lambda Frames")
        import pandas as pd
        frames = result['message']['frames']
        if frames:
            df = pd.DataFrame([{
                'Frame': i+1,
                'λ₁→λ₂': f"{f['wavelength_start_nm']:.0f}→{f['wavelength_end_nm']:.0f}nm",
                'Chars': ''.join(f['char_pair']),
                'Λ Mass': f"{f['lambda_mass_kg']:.2e} kg"
            } for i, f in enumerate(frames)])
            st.dataframe(df, use_container_width=True)
        
        with st.expander("Full Result"):
            st.json(result)


def main():
    network = get_network()
    substrate = get_substrate_network()
    
    render_header()
    
    tabs = st.tabs([
        "Λ Lambda Substrate",
        "🔄 Oscillating Encoder",
        "🌈 Octave Spectrum",
        "🎼 Node Tones",
        "🔗 Resonance Network",
        "📦 Create Packet",
        "⚡ Excitation Chain",
        "📊 Status",
        "📚 Physics"
    ])
    
    with tabs[0]:
        render_lambda_substrate(substrate)
    
    with tabs[1]:
        render_oscillating_encoder()
    
    with tabs[2]:
        render_octave_spectrum()
    
    with tabs[3]:
        render_node_tones(network)
    
    with tabs[4]:
        render_resonance_network(network)
    
    with tabs[5]:
        render_packet_creator(network)
    
    with tabs[6]:
        render_excitation_chain()
    
    with tabs[7]:
        render_network_status(network)
    
    with tabs[8]:
        render_physics_foundation()
    
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666;">
    WNSP v7.0 — Harmonic Octave Protocol<br>
    "Energy is vibration. Vibration organizes into octaves."<br>
    GPL v3.0 License — Community Owned, Physics Governed
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
