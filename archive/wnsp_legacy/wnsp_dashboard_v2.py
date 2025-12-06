"""
WNSP v2.0 Interactive Dashboard

Enhanced visualizer for Wavelength-Native Signaling Protocol v2.0
Features: Quantum cryptography, DAG messaging, NXT payments, extended character support
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import networkx as nx
from typing import List, Dict
import time

from wnsp_protocol_v2 import (
    WnspEncoderV2, WnspDecoderV2, WnspMessageV2,
    EXTENDED_CHAR_MAP, WAVELENGTH_TO_CHAR,
    WnspEncodingScheme, create_wnsp_v2_message
)
from wavelength_validator import SpectralRegion, ModulationType
from wavelength_map import wavelength_to_rgb
from native_token import NativeTokenSystem

# Initialize systems
if 'wnsp_encoder' not in st.session_state:
    st.session_state.wnsp_encoder = WnspEncoderV2()
    st.session_state.wnsp_decoder = WnspDecoderV2()
    st.session_state.wnsp_messages = []
    st.session_state.wnsp_token_system = NativeTokenSystem()


def render_wnsp_v2_dashboard():
    """Main WNSP v2.0 dashboard."""
    
    # Initialize session state if not already done
    if 'wnsp_encoder' not in st.session_state:
        st.session_state.wnsp_encoder = WnspEncoderV2()
        st.session_state.wnsp_decoder = WnspDecoderV2()
        st.session_state.wnsp_messages = []
        st.session_state.wnsp_token_system = NativeTokenSystem()
    
    st.title("🌊 WNSP v2.0 - Wavelength-Native Signaling Protocol")
    st.markdown("*Revolutionary optical mesh networking with quantum cryptography & NXT payments*")
    
    # Stats row
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Messages Sent", len(st.session_state.wnsp_messages))
    with col2:
        total_cost = sum(m.cost_nxt for m in st.session_state.wnsp_messages)
        st.metric("Total Cost", f"{total_cost:.4f} NXT")
    with col3:
        st.metric("Character Support", "64 chars (A-Z, 0-9, symbols)")
    with col4:
        st.metric("Protocol Version", "v2.0")
    
    st.divider()
    
    # Tabs
    tabs = st.tabs([
        "📝 Compose Message",
        "📊 Character Encoding Map",
        "🔐 Quantum Cryptography Demo",
        "🕸️ DAG Network View",
        "💰 Economics Dashboard",
        "📡 Message History"
    ])
    
    with tabs[0]:
        render_compose_tab()
    
    with tabs[1]:
        render_encoding_map_tab()
    
    with tabs[2]:
        render_quantum_crypto_tab()
    
    with tabs[3]:
        render_dag_network_tab()
    
    with tabs[4]:
        render_economics_tab()
    
    with tabs[5]:
        render_message_history_tab()


def render_compose_tab():
    """Message composition interface."""
    st.header("📝 Compose WNSP v2.0 Message")
    
    st.markdown("""
    **WNSP v2.0 supports extended character encoding:**
    - **A-Z**: Uppercase letters (Violet to Green spectrum)
    - **0-9**: Numbers (Green to Yellow spectrum)
    - **Symbols**: Common punctuation (Yellow to Red spectrum)
    """)
    
    # Input fields
    col1, col2 = st.columns(2)
    
    with col1:
        sender = st.text_input("Sender ID", value="alice", key="wnsp_sender")
        spectral_region = st.selectbox(
            "Spectral Region",
            options=[SpectralRegion.UV, SpectralRegion.VIOLET, SpectralRegion.BLUE,
                    SpectralRegion.GREEN, SpectralRegion.YELLOW, SpectralRegion.ORANGE,
                    SpectralRegion.RED, SpectralRegion.IR],
            format_func=lambda x: f"{x.display_name} ({x.center_wavelength}nm)",
            key="wnsp_region"
        )
    
    with col2:
        recipient = st.text_input("Recipient ID", value="bob", key="wnsp_recipient")
        modulation = st.selectbox(
            "Modulation Type",
            options=[ModulationType.OOK, ModulationType.ASK, ModulationType.FSK, ModulationType.PSK],
            format_func=lambda x: f"{x.display_name} ({x.bits_per_symbol} bits/symbol)",
            key="wnsp_modulation"
        )
    
    # Message content
    message_content = st.text_area(
        "Message Content",
        placeholder="Enter message (A-Z, 0-9, symbols supported)",
        max_chars=200,
        key="wnsp_content",
        help="Example: HELLO WORLD 2025!"
    )
    
    # Parent messages for DAG
    parent_ids = []
    if st.session_state.wnsp_messages:
        with st.expander("🔗 Link to Parent Messages (DAG)"):
            # Get recent messages (up to 10)
            recent_messages = st.session_state.wnsp_messages[-10:]
            
            # Create mapping from display string to message object
            parent_options = []
            message_map = {}
            for msg in recent_messages:
                display_str = f"{msg.message_id[:12]}... - {msg.content[:30]}"
                parent_options.append(display_str)
                message_map[display_str] = msg
            
            selected_parents = st.multiselect(
                "Select parent messages",
                options=parent_options,
                help="Create DAG structure by linking to previous messages"
            )
            
            # Extract message IDs using the mapping
            if selected_parents:
                parent_ids = [message_map[sel].message_id for sel in selected_parents]
    else:
        st.info("No previous messages. This will start a new message chain.")
    
    # Cost estimation
    if message_content:
        st.divider()
        st.subheader("💰 Cost Estimation")
        
        # Calculate cost
        PLANCK = 6.626e-34
        SPEED_OF_LIGHT = 3e8
        frequency = SPEED_OF_LIGHT / spectral_region.center_wavelength
        quantum_energy = PLANCK * frequency
        BASE_SCALE = 1e21
        message_bytes = len(message_content.encode('utf-8'))
        cost_nxt = max(0.01, (quantum_energy * BASE_SCALE * message_bytes) / 1e6)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Frequency", f"{frequency/1e12:.0f} THz")
        with col2:
            st.metric("Quantum Energy", f"{quantum_energy*1e12:.2f} pJ")
        with col3:
            st.metric("**TOTAL COST**", f"{cost_nxt:.4f} NXT")
        
        # Show character breakdown
        with st.expander("📊 Character Wavelength Breakdown"):
            render_message_preview(message_content)
    
    # Send button
    st.divider()
    
    if st.button("📤 Send WNSP v2.0 Message", type="primary", width="stretch", disabled=not message_content):
        with st.spinner("🌊 Encoding with quantum cryptography..."):
            try:
                # Create message
                message = st.session_state.wnsp_encoder.encode_message(
                    content=message_content,
                    sender_id=sender,
                    recipient_id=recipient,
                    spectral_region=spectral_region,
                    modulation_type=modulation,
                    parent_message_ids=parent_ids if parent_ids else None
                )
                
                # Add to history
                st.session_state.wnsp_messages.append(message)
                
                st.success(f"✅ Message sent successfully!")
                st.balloons()
                
                # Show details
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.info(f"**Message ID**: {message.message_id}")
                with col2:
                    st.info(f"**Frames**: {len(message.frames)}")
                with col3:
                    st.info(f"**Cost**: {message.cost_nxt:.4f} NXT")
                
                time.sleep(1)
                st.rerun()
                
            except Exception as e:
                st.error(f"❌ Error: {str(e)}")


def render_message_preview(content: str):
    """Render wavelength preview for message characters."""
    valid_chars = [c for c in content if c in EXTENDED_CHAR_MAP]
    
    if not valid_chars:
        st.warning("No valid characters (A-Z, 0-9, symbols)")
        return
    
    # Display in rows
    chars_per_row = 10
    num_rows = (len(valid_chars) + chars_per_row - 1) // chars_per_row
    
    for row_idx in range(num_rows):
        start_idx = row_idx * chars_per_row
        end_idx = min(start_idx + chars_per_row, len(valid_chars))
        row_chars = valid_chars[start_idx:end_idx]
        
        cols = st.columns(len(row_chars))
        for col, char in zip(cols, row_chars):
            wavelength = EXTENDED_CHAR_MAP[char]
            rgb = wavelength_to_rgb(wavelength)
            hex_color = f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
            
            with col:
                st.markdown(
                    f"""
                    <div style="
                        background-color: {hex_color};
                        width: 100%;
                        height: 50px;
                        border-radius: 5px;
                        border: 2px solid #333;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        color: white;
                        text-shadow: 1px 1px 2px black;
                    ">
                        {char}
                    </div>
                    <div style="text-align: center; font-size: 9px; margin-top: 3px;">
                        {wavelength}nm
                    </div>
                    """,
                    unsafe_allow_html=True
                )


def render_encoding_map_tab():
    """Show full character encoding map."""
    st.header("📊 WNSP v2.0 Character Encoding Map")
    
    st.markdown("""
    **64 characters mapped across the visible + near-IR spectrum (380-760nm)**
    
    - **Violet-Green (380-530nm)**: A-Z uppercase letters
    - **Green-Yellow (536-590nm)**: Numbers 0-9
    - **Yellow-Red (596-760nm)**: Common symbols and punctuation
    """)
    
    # Create visualization
    fig = go.Figure()
    
    chars = list(EXTENDED_CHAR_MAP.keys())
    wavelengths = list(EXTENDED_CHAR_MAP.values())
    
    colors = [wavelength_to_rgb(wl) for wl in wavelengths]
    hex_colors = [f"rgb({c[0]},{c[1]},{c[2]})" for c in colors]
    
    fig.add_trace(go.Bar(
        x=chars,
        y=[1] * len(chars),
        marker=dict(color=hex_colors, line=dict(color='black', width=1)),
        text=wavelengths,
        textposition='auto',
        texttemplate='%{text}nm',
        hovertemplate='<b>%{x}</b><br>Wavelength: %{text}nm<extra></extra>'
    ))
    
    fig.update_layout(
        title="Character to Wavelength Mapping",
        xaxis_title="Character",
        yaxis_title="",
        height=400,
        showlegend=False,
        yaxis=dict(showticklabels=False)
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Table view
    with st.expander("📋 Full Encoding Table"):
        col1, col2, col3 = st.columns(3)
        
        chunk_size = (len(chars) + 2) // 3
        
        with col1:
            st.write("**Letters (A-Z)**")
            for i in range(26):
                char = chars[i]
                wl = wavelengths[i]
                st.write(f"`{char}` → {wl}nm")
        
        with col2:
            st.write("**Numbers (0-9)**")
            for i in range(26, 36):
                char = chars[i]
                wl = wavelengths[i]
                st.write(f"`{char}` → {wl}nm")
        
        with col3:
            st.write("**Symbols**")
            for i in range(36, min(64, len(chars))):
                char = chars[i]
                wl = wavelengths[i]
                st.write(f"`{char}` → {wl}nm")


def render_quantum_crypto_tab():
    """Demonstrate quantum cryptography features."""
    st.header("🔐 Quantum Cryptography Demo")
    
    st.markdown("""
    **WNSP v2.0 uses quantum-resistant interference patterns instead of traditional checksums**
    
    - Wave properties (wavelength, amplitude, phase, polarization) create unique signatures
    - SHA-256 combined with electromagnetic interference for quantum resistance
    - DAG parent linking ensures message chain integrity
    """)
    
    if not st.session_state.wnsp_messages:
        st.info("Send some messages to see quantum cryptography in action")
        return
    
    # Select a message
    msg = st.session_state.wnsp_messages[-1]
    
    st.subheader(f"📧 Latest Message: '{msg.content}'")
    
    # Show wave properties
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**Wave Signature Properties**")
        if msg.wave_signature:
            st.write(f"- Wavelength: {msg.wave_signature.wavelength:.2f} nm")
            st.write(f"- Amplitude: {msg.wave_signature.amplitude:.4f}")
            st.write(f"- Phase: {msg.wave_signature.phase:.4f}")
            st.write(f"- Polarization: {msg.wave_signature.polarization:.4f}")
            st.write(f"- Spectral Region: {msg.wave_signature.spectral_region.display_name}")
            st.write(f"- Modulation: {msg.wave_signature.modulation_type.display_name}")
    
    with col2:
        st.write("**Quantum Hash**")
        st.code(msg.interference_hash, language="text")
        
        st.write("**Message ID**")
        st.code(msg.message_id, language="text")
    
    # Validate message
    decoder = st.session_state.wnsp_decoder
    decoded_text, is_valid = decoder.decode_message(msg)
    
    if is_valid:
        st.success(f"✅ **Quantum validation PASSED** - Message integrity verified")
        st.write(f"Decoded content: `{decoded_text}`")
    else:
        st.error("❌ **Quantum validation FAILED** - Message may be corrupted")


def render_dag_network_tab():
    """Visualize DAG message network."""
    st.header("🕸️ DAG Network Visualization")
    
    if len(st.session_state.wnsp_messages) < 2:
        st.info("Send messages with parent links to see DAG network structure")
        return
    
    # Build network graph
    G = nx.DiGraph()
    
    for msg in st.session_state.wnsp_messages:
        # Add node
        G.add_node(
            msg.message_id,
            content=msg.content[:20],
            sender=msg.sender_id,
            cost=msg.cost_nxt
        )
        
        # Add edges from parents
        for parent_id in msg.parent_message_ids:
            if parent_id in G:
                G.add_edge(parent_id, msg.message_id)
    
    # Calculate layout
    try:
        pos = nx.spring_layout(G, k=1, iterations=50)
    except:
        pos = nx.random_layout(G)
    
    # Create plotly figure
    fig = go.Figure()
    
    # Draw edges
    for edge in G.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        fig.add_trace(go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(color='gray', width=1),
            hoverinfo='none',
            showlegend=False
        ))
    
    # Draw nodes
    node_x = [pos[node][0] for node in G.nodes()]
    node_y = [pos[node][1] for node in G.nodes()]
    node_text = [G.nodes[node].get('content', '')[:15] for node in G.nodes()]
    
    fig.add_trace(go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        marker=dict(
            size=20,
            color='lightblue',
            line=dict(color='darkblue', width=2)
        ),
        text=node_text,
        textposition='top center',
        hoverinfo='text',
        hovertext=[f"{G.nodes[n].get('content', '')}<br>From: {G.nodes[n].get('sender', '')}"
                   for n in G.nodes()],
        showlegend=False
    ))
    
    fig.update_layout(
        title="WNSP Message DAG Network",
        showlegend=False,
        height=500,
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False)
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Network stats
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Messages", G.number_of_nodes())
    with col2:
        st.metric("DAG Connections", G.number_of_edges())
    with col3:
        try:
            st.metric("Network Diameter", nx.diameter(G.to_undirected()) if nx.is_connected(G.to_undirected()) else "Disconnected")
        except:
            st.metric("Network Diameter", "N/A")


def render_economics_tab():
    """Show economics dashboard."""
    st.header("💰 WNSP Economics Dashboard")
    
    st.markdown("""
    **All WNSP v2.0 messages use physics-based pricing:**
    - Cost calculated from quantum energy formula: **E = hf**
    - Higher frequency electromagnetic waves cost more NXT
    - Validator rewards distributed from message fees
    """)
    
    if not st.session_state.wnsp_messages:
        st.info("Send messages to see economic data")
        return
    
    # Cost by spectral region
    region_costs = {}
    for msg in st.session_state.wnsp_messages:
        region = msg.spectral_region.display_name
        if region not in region_costs:
            region_costs[region] = []
        region_costs[region].append(msg.cost_nxt)
    
    # Plot
    fig = go.Figure()
    
    for region, costs in region_costs.items():
        fig.add_trace(go.Box(
            y=costs,
            name=region,
            boxmean='sd'
        ))
    
    fig.update_layout(
        title="Message Costs by Spectral Region (E=hf)",
        xaxis_title="Spectral Region",
        yaxis_title="Cost (NXT)",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Stats
    total_cost = sum(m.cost_nxt for m in st.session_state.wnsp_messages)
    avg_cost = total_cost / len(st.session_state.wnsp_messages) if st.session_state.wnsp_messages else 0
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Fees Collected", f"{total_cost:.4f} NXT")
    with col2:
        st.metric("Average Cost per Message", f"{avg_cost:.4f} NXT")
    with col3:
        validator_rewards = total_cost * 0.4  # 40% to validators
        st.metric("Validator Rewards Pool", f"{validator_rewards:.4f} NXT")


def render_message_history_tab():
    """Show message history."""
    st.header("📡 Message History")
    
    if not st.session_state.wnsp_messages:
        st.info("No messages sent yet")
        return
    
    st.write(f"**Total messages:** {len(st.session_state.wnsp_messages)}")
    
    for i, msg in enumerate(reversed(st.session_state.wnsp_messages)):
        with st.expander(f"📧 {msg.sender_id} → {msg.recipient_id}: '{msg.content[:30]}...'"):
            col1, col2 = st.columns(2)
            
            with col1:
                st.write(f"**Message ID**: {msg.message_id}")
                st.write(f"**Content**: {msg.content}")
                st.write(f"**Sender**: {msg.sender_id}")
                st.write(f"**Recipient**: {msg.recipient_id}")
                st.write(f"**Spectral Region**: {msg.spectral_region.display_name}")
            
            with col2:
                st.write(f"**Cost**: {msg.cost_nxt:.4f} NXT")
                st.write(f"**Frequency**: {msg.frequency_thz:.0f} THz")
                st.write(f"**Frames**: {len(msg.frames)}")
                st.write(f"**Parents**: {len(msg.parent_message_ids)}")
                st.write(f"**Modulation**: {msg.modulation_type.display_name}")
            
            if msg.parent_message_ids:
                st.write("**Parent Messages**:")
                for parent_id in msg.parent_message_ids:
                    st.code(parent_id, language="text")
    
    # Nexus AI Research Report for Researchers
    st.divider()
    from nexus_ai import render_nexus_ai_button
    last_msg = st.session_state.wnsp_messages[-1] if st.session_state.wnsp_messages else None
    render_nexus_ai_button('wnsp', {
        'wavelength': last_msg.wavelength_nm if last_msg else 550,
        'modulation': last_msg.modulation_type.value if last_msg else 'OOK',
        'parents': len(last_msg.parent_message_ids) if last_msg else 1,
        'cost': last_msg.cost_nxt if last_msg else 7500
    })


# Main entry point
if __name__ == "__main__":
    render_wnsp_v2_dashboard()
