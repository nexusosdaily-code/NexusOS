"""
Mobile DAG Messaging - Wavelength-Based Secure Communication
=============================================================

A mobile-optimized messaging interface using electromagnetic wave validation.
Messages form a DAG (Directed Acyclic Graph) where each message can reference
multiple parent messages, with interference pattern validation ensuring integrity.

Features:
- Physics-based pricing (E = hf quantum energy)
- Real-time cost estimation
- DAG message chain visualization
- Spectral diversity validation (5/6 regions)
- Battery-efficient (no mining, just math)
- Quantum-resistant security
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import networkx as nx
from datetime import datetime
from typing import List, Optional

from wavelength_messaging_integration import (
    WavelengthMessagingSystem,
    WavelengthMessage
)
from wavelength_validator import SpectralRegion, ModulationType
from native_token import NativeTokenSystem


def render_mobile_dag_messaging():
    # Initialize systems
    if 'messaging_system' not in st.session_state:
        token_system = NativeTokenSystem()
        st.session_state.messaging_system = WavelengthMessagingSystem(token_system)
        st.session_state.token_system = token_system
        
        # Initialize demo accounts if needed
        if token_system.get_account("alice") is None:
            _initialize_demo_accounts(token_system, st.session_state.messaging_system)
    
    messaging_system = st.session_state.messaging_system
    token_system = st.session_state.token_system
    
    # Header
    st.title("📱 NexusOS Mobile Messaging")
    st.markdown("**Secure messaging powered by electromagnetic physics**")
    
    # User account selector
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # Initialize messaging_current_user with defensive default (separate from auth current_user)
        current_user_default = st.session_state.get('messaging_current_user', 'alice')
        if current_user_default not in ["alice", "bob", "charlie"]:
            current_user_default = "alice"
        
        current_user = st.selectbox(
            "Your Account",
            options=["alice", "bob", "charlie"],
            index=["alice", "bob", "charlie"].index(current_user_default),
            key="messaging_user_selector"  # Use unique key to avoid conflict
        )
        # Use separate session variable to avoid conflict with auth system
        st.session_state.messaging_current_user = current_user
    
    with col2:
        user_account = token_system.get_account(current_user)
        if user_account:
            balance_nxt = user_account.get_balance_nxt()
            st.metric("Balance", f"{balance_nxt:.2f} NXT")
        else:
            st.metric("Balance", "0.00 NXT")
    
    st.divider()
    
    # Tabs for different views
    tab1, tab2, tab3, tab4 = st.tabs(["📤 Send Message", "📬 Inbox", "🕸️ DAG View", "📊 Analytics"])
    
    with tab1:
        render_send_message(messaging_system, token_system, current_user)
    
    with tab2:
        render_inbox(messaging_system, current_user)
    
    with tab3:
        render_dag_visualization(messaging_system)
    
    with tab4:
        render_analytics(messaging_system, token_system)


def _initialize_demo_accounts(token_system: NativeTokenSystem, messaging_system: WavelengthMessagingSystem):
    """Initialize demo accounts and validators"""
    # Create user accounts
    for username in ["alice", "bob", "charlie"]:
        if token_system.get_account(username) is None:
            token_system.create_account(username, initial_balance=100000)  # 1000 NXT
    
    # Register validators across spectrum
    validators = [
        ("val_alice", SpectralRegion.UV),
        ("val_bob", SpectralRegion.VIOLET),
        ("val_charlie", SpectralRegion.BLUE),
        ("val_dave", SpectralRegion.GREEN),
        ("val_eve", SpectralRegion.YELLOW),
        ("val_frank", SpectralRegion.IR)
    ]
    
    for validator_id, region in validators:
        messaging_system.register_validator(validator_id, region)
    
    # Create validator pool account
    if token_system.get_account("VALIDATOR_POOL") is None:
        token_system.create_account("VALIDATOR_POOL", initial_balance=0)


def render_send_message(messaging_system: WavelengthMessagingSystem, token_system: NativeTokenSystem, sender: str):
    st.header("📤 Send New Message")
    
    st.markdown("""
    Send a secure message using wavelength-based validation. Cost is calculated from
    quantum physics (E = hf) - higher frequency = higher energy = higher cost.
    """)
    
    # Recipient selection
    col1, col2 = st.columns(2)
    
    with col1:
        recipients = [u for u in ["alice", "bob", "charlie"] if u != sender]
        recipient = st.selectbox("Recipient", options=recipients)
    
    with col2:
        region = st.selectbox(
            "Spectral Region",
            options=list(SpectralRegion),  # ALL spectral regions including Infrared
            format_func=lambda x: f"{x.display_name} ({x.center_wavelength*1e9:.0f}nm)",
            help="Higher frequency regions (UV) cost more due to E=hf"
        )
    
    # Message content
    message_text = st.text_area(
        "Message",
        placeholder="Type your message here...",
        height=150,
        max_chars=1000
    )
    
    # Parent message selection (for DAG chains)
    st.markdown("**📎 Chain to Previous Messages (Optional)**")
    
    available_messages = [
        msg for msg in messaging_system.messages
        if msg.sender_account == sender or msg.recipient_account == sender
    ]
    
    if len(available_messages) > 0:
        parent_options = ["None (Start new chain)"] + [
            f"msg_{i}: {msg.content[:30]}... ({msg.wave_properties.spectral_region.display_name})"
            for i, msg in enumerate(available_messages[-10:])  # Last 10 messages
        ]
        
        parent_selection = st.multiselect(
            "Parent Messages",
            options=parent_options,
            help="Select messages to reference in the DAG"
        )
        
        # Extract message IDs from selection
        parent_ids = []
        if parent_selection and parent_selection[0] != "None (Start new chain)":
            for sel in parent_selection:
                if sel != "None (Start new chain)":
                    idx = int(sel.split(":")[0].replace("msg_", ""))
                    offset = len(available_messages) - 10
                    if offset < 0:
                        offset = 0
                    parent_ids.append(available_messages[offset + idx].message_id)
    else:
        parent_ids = []
        st.info("No previous messages. This will start a new message chain.")
    
    # Modulation type
    modulation = st.selectbox(
        "Security Level",
        options=[ModulationType.OOK, ModulationType.ASK, ModulationType.FSK, ModulationType.PSK],
        format_func=lambda x: f"{x.display_name} ({x.bits_per_symbol} bits/symbol)",
        help="Higher complexity = better security = higher cost"
    )
    
    # Cost estimation
    if message_text:
        st.divider()
        st.subheader("💰 Cost Estimation")
        
        try:
            # Calculate estimated cost using simplified E=hf approach
            PLANCK = 6.626e-34  # Planck's constant (J·s)
            SPEED_OF_LIGHT = 3e8  # Speed of light (m/s)
            
            # Calculate frequency from wavelength
            frequency = SPEED_OF_LIGHT / region.center_wavelength  # Hz
            
            # Quantum energy cost (E = hf)
            quantum_energy = PLANCK * frequency  # Joules
            
            # Scale to NXT with appropriate factor
            BASE_SCALE = 1e21  # Scale joules to reasonable NXT amounts
            message_bytes = len(message_text.encode('utf-8'))
            
            quantum_base_nxt = (quantum_energy * BASE_SCALE * message_bytes) / 1e6
            total_cost_nxt = max(0.01, quantum_base_nxt)  # Minimum 0.01 NXT
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Quantum Base", f"{quantum_base_nxt:.4f} NXT")
            
            with col2:
                frequency_thz = frequency / 1e12
                st.metric("Frequency", f"{frequency_thz:.0f} THz")
            
            with col3:
                st.metric("**TOTAL COST**", f"{total_cost_nxt:.4f} NXT")
            
            # Check balance
            sender_account = token_system.get_account(sender)
            sender_balance_nxt = sender_account.get_balance_nxt() if sender_account else 0
            
            if sender_balance_nxt < total_cost_nxt:
                st.error(f"⚠️ Insufficient balance! You have {sender_balance_nxt:.2f} NXT but need {total_cost_nxt:.4f} NXT")
                can_send = False
            else:
                st.success(f"✅ Sufficient balance. You'll have {sender_balance_nxt - total_cost_nxt:.2f} NXT remaining")
                can_send = True
                
        except Exception as e:
            st.error(f"❌ Error calculating cost: {str(e)}")
            can_send = False
    else:
        can_send = False
    
    # Send button
    st.divider()
    
    if st.button("📤 Send Message", type="primary", disabled=not can_send, use_container_width=True):
        with st.spinner("🌊 Generating wave signature and validating..."):
            success, msg_obj, status = messaging_system.send_message(
                sender_account=sender,
                recipient_account=recipient,
                content=message_text,
                spectral_region=region,
                modulation_type=modulation,
                parent_message_ids=parent_ids if len(parent_ids) > 0 else None
            )
            
            if success:
                st.success(status)
                st.balloons()
                st.rerun()
            else:
                st.error(f"❌ Failed to send: {status}")


def render_inbox(messaging_system: WavelengthMessagingSystem, current_user: str):
    st.header("📬 Your Messages")
    
    # Filter messages for current user
    user_messages = [
        msg for msg in messaging_system.messages
        if msg.sender_account == current_user or msg.recipient_account == current_user
    ]
    
    if len(user_messages) == 0:
        st.info("📭 No messages yet. Send your first message to get started!")
        return
    
    # Filters
    col1, col2, col3 = st.columns(3)
    
    with col1:
        direction_filter = st.selectbox("Direction", ["All", "Sent", "Received"])
    
    with col2:
        # Get ALL spectral regions for filter (including Infrared)
        spectral_regions_list = list(SpectralRegion)
        region_display_names = [r.display_name for r in spectral_regions_list]
        region_filter = st.selectbox("Spectral Region", ["All"] + region_display_names)
    
    with col3:
        sort_by = st.selectbox("Sort By", ["Newest First", "Oldest First", "Highest Cost", "Lowest Cost"])
    
    # Apply filters
    filtered_messages = user_messages.copy()
    
    # Direction filter
    if direction_filter == "Sent":
        filtered_messages = [m for m in filtered_messages if m.sender_account == current_user]
    elif direction_filter == "Received":
        filtered_messages = [m for m in filtered_messages if m.recipient_account == current_user]
    
    # Spectral region filter - only apply if NOT "All"
    # Explicitly skip filtering when "All" is selected to show all messages
    if region_filter:
        region_filter_clean = str(region_filter).strip()
        if region_filter_clean != "All" and region_filter_clean != "":
            # Apply region filter - compare display names
            filtered_messages = [
                m for m in filtered_messages 
                if hasattr(m.wave_properties.spectral_region, 'display_name') and 
                   m.wave_properties.spectral_region.display_name == region_filter_clean
            ]
    
    # Sort
    if sort_by == "Newest First":
        filtered_messages.sort(key=lambda m: m.timestamp, reverse=True)
    elif sort_by == "Oldest First":
        filtered_messages.sort(key=lambda m: m.timestamp)
    elif sort_by == "Highest Cost":
        filtered_messages.sort(key=lambda m: m.cost_nxt, reverse=True)
    else:  # Lowest Cost
        filtered_messages.sort(key=lambda m: m.cost_nxt)
    
    st.divider()
    st.markdown(f"**{len(filtered_messages)} messages**")
    
    # Display messages
    for msg in filtered_messages:
        direction = "📤" if msg.sender_account == current_user else "📬"
        other_party = msg.recipient_account if msg.sender_account == current_user else msg.sender_account
        
        with st.expander(f"{direction} {other_party} — {msg.wave_properties.spectral_region.display_name} — {msg.timestamp.strftime('%Y-%m-%d %H:%M')}"):
            col1, col2 = st.columns([3, 1])
            
            with col1:
                st.markdown(f"**Message:**")
                st.write(msg.content)
            
            with col2:
                st.metric("Cost", f"{msg.cost_nxt:.4f} NXT")
                st.metric("Wavelength", f"{msg.wave_properties.wavelength*1e9:.0f} nm")
                frequency_thz = msg.wave_properties.frequency / 1e12
                st.metric("Frequency", f"{frequency_thz:.0f} THz")
            
            # DAG info
            parent_count = len(messaging_system.message_dag.get(msg.message_id, []))
            if parent_count > 0:
                st.info(f"🔗 References {parent_count} parent message(s) in DAG chain")
            
            # Interference hash
            st.code(f"Interference Hash: {msg.interference_hash[:32]}...", language=None)
            
            # Validators
            st.caption(f"✅ Validated by {len(msg.spectral_validators)} validators: {', '.join(msg.spectral_validators)}")


def render_dag_visualization(messaging_system: WavelengthMessagingSystem):
    st.header("🕸️ Message DAG Network")
    
    st.markdown("""
    Visualize the Directed Acyclic Graph (DAG) of message relationships.
    Each message can reference multiple parent messages, creating a cryptographically
    secure chain validated through wave interference patterns.
    """)
    
    if len(messaging_system.messages) == 0:
        st.info("📭 No messages yet. The DAG will appear once you send messages.")
        return
    
    # Build NetworkX graph
    G = nx.DiGraph()
    
    # Add nodes
    for msg in messaging_system.messages:
        label = f"{msg.sender_account[:1]}→{msg.recipient_account[:1]}\n{msg.wave_properties.spectral_region.display_name[:3]}\n{msg.cost_nxt:.3f} NXT"
        G.add_node(msg.message_id, label=label, region=msg.wave_properties.spectral_region.display_name)
    
    # Add edges (parent relationships)
    for msg_id, parent_ids in messaging_system.message_dag.items():
        for parent_id in parent_ids:
            if parent_id in G:
                G.add_edge(parent_id, msg_id)
    
    # Layout
    nodes_list = list(G.nodes())
    edges_list = list(G.edges())
    
    if len(nodes_list) > 0:
        try:
            pos = nx.spring_layout(G, k=2, iterations=50)
        except:
            pos = nx.random_layout(G)
        
        # Extract positions
        edge_trace = []
        for edge in G.edges():
            x0, y0 = pos[edge[0]]
            x1, y1 = pos[edge[1]]
            edge_trace.append(
                go.Scatter(
                    x=[x0, x1, None],
                    y=[y0, y1, None],
                    mode='lines',
                    line=dict(width=2, color='#888'),
                    hoverinfo='none',
                    showlegend=False
                )
            )
        
        # Node trace
        node_x = []
        node_y = []
        node_text = []
        node_colors = []
        
        region_colors = {
            'Ultraviolet': '#8B00FF',
            'Violet': '#9400D3',
            'Blue': '#0000FF',
            'Green': '#00FF00',
            'Yellow': '#FFFF00',
            'Infrared': '#FF0000'
        }
        
        for node in G.nodes():
            x, y = pos[node]
            node_x.append(x)
            node_y.append(y)
            node_text.append(G.nodes[node]['label'])
            region = G.nodes[node]['region']
            node_colors.append(region_colors.get(region, '#888888'))
        
        node_trace = go.Scatter(
            x=node_x,
            y=node_y,
            mode='markers+text',
            text=node_text,
            textposition='top center',
            marker=dict(
                size=30,
                color=node_colors,
                line=dict(width=2, color='white')
            ),
            hoverinfo='text',
            showlegend=False
        )
        
        # Create figure
        fig = go.Figure(data=edge_trace + [node_trace])
        
        fig.update_layout(
            title="Message DAG Network",
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            height=600,
            plot_bgcolor='rgba(0,0,0,0.05)'
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Statistics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Messages", len(nodes_list))
        
        with col2:
            st.metric("DAG Connections", len(edges_list))
        
        with col3:
            avg_parents = len(edges_list) / len(nodes_list) if len(nodes_list) > 0 else 0
            st.metric("Avg Parents/Message", f"{avg_parents:.2f}")
        
        with col4:
            genesis_messages = len([n for n in nodes_list if G.in_degree(n) == 0])
            st.metric("Genesis Messages", genesis_messages)


def render_analytics(messaging_system: WavelengthMessagingSystem, token_system: NativeTokenSystem):
    st.header("📊 Network Analytics")
    
    if len(messaging_system.messages) == 0:
        st.info("📭 No messages yet. Analytics will appear once you send messages.")
        return
    
    # Overview metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Messages", len(messaging_system.messages))
    
    with col2:
        st.metric("Total Fees Collected", f"{messaging_system.total_fees_collected:.4f} NXT")
    
    with col3:
        st.metric("Validator Rewards", f"{messaging_system.total_validator_rewards:.4f} NXT")
    
    with col4:
        system_revenue = messaging_system.total_fees_collected - messaging_system.total_validator_rewards
        st.metric("System Revenue", f"{system_revenue:.4f} NXT")
    
    st.divider()
    
    # Messages by spectral region
    st.subheader("🌈 Messages by Spectral Region")
    
    region_counts = {}
    for msg in messaging_system.messages:
        region = msg.wave_properties.spectral_region.display_name
        region_counts[region] = region_counts.get(region, 0) + 1
    
    fig = go.Figure(data=[
        go.Bar(
            x=list(region_counts.keys()),
            y=list(region_counts.values()),
            marker_color=['#8B00FF', '#9400D3', '#0000FF', '#00FF00', '#FFFF00', '#FF0000'][:len(region_counts)],
            text=list(region_counts.values()),
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        xaxis_title="Spectral Region",
        yaxis_title="Number of Messages",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Cost distribution
    st.subheader("💰 Cost Distribution")
    
    costs = [msg.cost_nxt for msg in messaging_system.messages]
    
    fig = go.Figure(data=[
        go.Histogram(
            x=costs,
            nbinsx=20,
            marker_color='#636EFA'
        )
    ])
    
    fig.update_layout(
        xaxis_title="Message Cost (NXT)",
        yaxis_title="Number of Messages",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Validator earnings
    st.subheader("👥 Validator Earnings")
    
    validator_earnings = {}
    for msg in messaging_system.messages:
        for validator_id in msg.spectral_validators:
            validator_earnings[validator_id] = validator_earnings.get(validator_id, 0) + (msg.cost_nxt * 0.4 / len(msg.spectral_validators))
    
    df = pd.DataFrame([
        {
            'Validator': v_id,
            'Region': messaging_system.validator_assignments.get(v_id, SpectralRegion.UV).display_name,
            'Messages Validated': sum(1 for msg in messaging_system.messages if v_id in msg.spectral_validators),
            'Total Earnings (NXT)': f"{earnings:.6f}"
        }
        for v_id, earnings in validator_earnings.items()
    ])
    
    st.dataframe(df, use_container_width=True, hide_index=True)


if __name__ == "__main__":
    render_mobile_dag_messaging()
