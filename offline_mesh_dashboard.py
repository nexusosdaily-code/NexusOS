"""
Offline Mesh Network Dashboard
================================

Visualizes NexusOS peer-to-peer mesh network operating WITHOUT internet.
Shows nearby devices, network topology, connection quality, and offline messaging stats.

Key Features:
- Real-time peer discovery visualization
- Mesh network topology graph
- Signal strength and distance metrics
- Offline message propagation tracking
- Bluetooth LE & WiFi Direct status
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, List, Any
import time
import random

# Import offline mesh infrastructure
from offline_mesh_transport import (
    OfflineMeshTransport, create_offline_transport,
    TransportProtocol, OfflinePeer
)
from wavelength_validator import SpectralRegion

# Import hybrid routing controller (AI path selection)
try:
    from hybrid_routing_controller import get_hybrid_router, RoutingMode
    HYBRID_ROUTING_AVAILABLE = True
except ImportError:
    HYBRID_ROUTING_AVAILABLE = False


def render_offline_mesh_dashboard():
    """Main dashboard for offline peer-to-peer mesh network."""
    
    st.title("🌐 Offline Mesh Network")
    st.markdown("**Peer-to-Peer Internet Infrastructure - NO WiFi/Cellular Required**")
    
    # Show hybrid routing status if available
    if HYBRID_ROUTING_AVAILABLE:
        st.success("""
        ✅ **AI Hybrid Routing ACTIVE** - System intelligently routes messages through:
        - 🌐 **Online Path**: Internet/HTTP (when available)
        - 📡 **Offline Path**: Bluetooth/WiFi Direct mesh (always available)
        - 🧠 **AI Decision**: Automatically selects best path based on network conditions
        """)
    else:
        st.info("""
        💡 **Revolutionary Concept**: Your phone connects DIRECTLY to nearby NexusOS phones using:
        - 📡 **Bluetooth LE**: ~100m range, low power
        - 📶 **WiFi Direct**: ~200m range, high bandwidth
        - 📲 **NFC**: <10cm, secure pairing
        
        Messages hop through the mesh automatically. No cell towers, no ISPs, no internet needed.
        """)
    
    # Initialize offline mesh transport (simulated)
    if 'offline_transport' not in st.session_state:
        device_id = f"mobile_{random.randint(1000, 9999)}"
        device_name = f"NexusPhone-{random.randint(1, 100)}"
        spectral_region = random.choice(list(SpectralRegion))
        
        st.session_state.offline_transport = create_offline_transport(
            device_id, device_name, spectral_region
        )
    
    transport = st.session_state.offline_transport
    
    # Initialize hybrid router if available
    if HYBRID_ROUTING_AVAILABLE and 'hybrid_router' not in st.session_state:
        st.session_state.hybrid_router = get_hybrid_router(
            offline_transport=transport
        )
    
    # Dashboard tabs
    if HYBRID_ROUTING_AVAILABLE:
        tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
            "📡 Nearby Peers",
            "🕸️ Network Topology",
            "💬 Offline Messaging",
            "🧠 Hybrid AI Routing",
            "📊 Mesh Statistics",
            "⚙️ Transport Settings"
        ])
    else:
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "📡 Nearby Peers",
            "🕸️ Network Topology",
            "💬 Offline Messaging",
            "📊 Mesh Statistics",
            "⚙️ Transport Settings"
        ])
        tab6 = None
    
    with tab1:
        render_nearby_peers_tab(transport)
    
    with tab2:
        render_network_topology_tab(transport)
    
    with tab3:
        render_offline_messaging_tab(transport)
    
    if HYBRID_ROUTING_AVAILABLE:
        with tab4:
            render_hybrid_routing_tab(st.session_state.hybrid_router)
        with tab5:
            render_mesh_statistics_tab(transport)
        with tab6:
            render_transport_settings_tab(transport)
    else:
        with tab4:
            render_mesh_statistics_tab(transport)
        with tab5:
            render_transport_settings_tab(transport)


def render_nearby_peers_tab(transport: OfflineMeshTransport):
    """Display nearby peers discovered via Bluetooth/WiFi Direct."""
    
    st.header("📡 Nearby NexusOS Devices")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("**Discover peers without internet connection**")
    
    with col2:
        if st.button("🔍 Scan for Peers", type="primary", use_container_width=True):
            with st.spinner("Scanning for nearby devices..."):
                discovered = transport.discover_nearby_peers()
                st.success(f"✅ Found {len(discovered)} devices nearby!")
                st.rerun()
    
    # Display discovered peers
    if not transport.nearby_peers:
        st.info("👋 No peers discovered yet. Click 'Scan for Peers' to find nearby NexusOS devices.")
        return
    
    st.divider()
    
    # Peer cards
    for peer_id, peer in transport.nearby_peers.items():
        with st.container():
            col1, col2, col3, col4 = st.columns([3, 2, 2, 2])
            
            with col1:
                # Device name and ID
                st.markdown(f"**{peer.device_name}**")
                st.caption(f"ID: {peer.device_id[:20]}...")
            
            with col2:
                # Transport protocol
                protocol_emoji = {
                    TransportProtocol.BLUETOOTH_LE: "📡 Bluetooth LE",
                    TransportProtocol.WIFI_DIRECT: "📶 WiFi Direct",
                    TransportProtocol.NFC: "📲 NFC"
                }
                st.markdown(protocol_emoji.get(peer.transport_protocol, "🔌 Unknown"))
                st.caption(f"Region: {peer.spectral_region.name}")
            
            with col3:
                # Signal strength
                signal_color = "🟢" if peer.signal_strength > -60 else "🟡" if peer.signal_strength > -75 else "🔴"
                st.markdown(f"{signal_color} {peer.signal_strength:.0f} dBm")
                st.caption(f"~{peer.distance_meters:.1f}m away")
            
            with col4:
                # Connection status
                status_emoji = {
                    "connected": "🟢 Connected",
                    "discovering": "🔵 Discovering",
                    "disconnected": "⚪ Offline"
                }
                st.markdown(status_emoji.get(peer.status.value, "⚪ Unknown"))
                st.caption(f"{peer.hop_count} hop(s)")
            
            st.divider()


def render_network_topology_tab(transport: OfflineMeshTransport):
    """Visualize mesh network topology as interactive graph."""
    
    st.header("🕸️ Mesh Network Topology")
    st.markdown("**Visual representation of peer-to-peer connections**")
    
    if not transport.nearby_peers:
        st.info("No peers connected. Scan for peers in the 'Nearby Peers' tab.")
        return
    
    # Get topology data
    topology = transport.get_network_topology()
    
    # Create network graph using Plotly
    fig = create_network_graph(topology)
    st.plotly_chart(fig, use_container_width=True)
    
    # Topology statistics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Total Nodes", topology['stats']['total_nodes'])
    
    with col2:
        st.metric("Total Connections", topology['stats']['total_edges'])
    
    with col3:
        st.metric("Network Diameter", f"{topology['stats']['mesh_diameter']} hops")


def create_network_graph(topology: Dict[str, Any]) -> go.Figure:
    """Create interactive network topology visualization."""
    
    nodes = topology['nodes']
    edges = topology['edges']
    
    # Create edge traces
    edge_x = []
    edge_y = []
    
    # Simple circular layout
    import math
    n_nodes = len(nodes)
    for i, node in enumerate(nodes):
        angle = 2 * math.pi * i / n_nodes
        node['x'] = math.cos(angle) * 2
        node['y'] = math.sin(angle) * 2
    
    for edge in edges:
        from_node = next(n for n in nodes if n['id'] == edge['from'])
        to_node = next(n for n in nodes if n['id'] == edge['to'])
        
        edge_x.extend([from_node['x'], to_node['x'], None])
        edge_y.extend([from_node['y'], to_node['y'], None])
    
    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        line=dict(width=2, color='#888'),
        hoverinfo='none',
        mode='lines'
    )
    
    # Create node traces
    node_x = [node['x'] for node in nodes]
    node_y = [node['y'] for node in nodes]
    node_text = [f"{node['name']}<br>{node['spectral_region']}" for node in nodes]
    node_colors = ['red' if node['type'] == 'self' else 'lightblue' for node in nodes]
    
    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[node['name'] for node in nodes],
        textposition="top center",
        hovertext=node_text,
        marker=dict(
            size=30,
            color=node_colors,
            line=dict(width=2, color='white')
        )
    )
    
    # Create figure
    fig = go.Figure(data=[edge_trace, node_trace])
    
    fig.update_layout(
        title="Offline Mesh Network Topology",
        showlegend=False,
        hovermode='closest',
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=500,
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )
    
    return fig


def render_offline_messaging_tab(transport: OfflineMeshTransport):
    """Test offline message sending."""
    
    st.header("💬 Offline Messaging")
    st.markdown("**Send messages through the mesh - NO INTERNET REQUIRED**")
    
    if not transport.nearby_peers:
        st.warning("⚠️ No peers available. Scan for peers first.")
        return
    
    # Message composer
    st.subheader("Send Message")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        message_content = st.text_area(
            "Message Content",
            placeholder="Type your message here...",
            height=100
        )
    
    with col2:
        # Recipient selection
        recipients = ["📢 Broadcast"] + [
            f"{peer.device_name} ({peer.distance_meters:.1f}m)"
            for peer in transport.nearby_peers.values()
        ]
        recipient = st.selectbox("Recipient", recipients)
        
        broadcast = recipient == "📢 Broadcast"
    
    if st.button("📤 Send Offline", type="primary", use_container_width=True):
        if message_content:
            # Create WNSP message
            from wnsp_protocol_v2 import WnspEncoderV2
            encoder = WnspEncoderV2()
            
            recipient_id = "broadcast" if broadcast else list(transport.nearby_peers.keys())[0]
            
            message = encoder.encode_message(
                content=message_content,
                sender_id=transport.device_id,
                recipient_id=recipient_id,
                spectral_region=transport.spectral_region
            )
            
            # Send via offline transport
            success, status = transport.send_message_offline(
                message,
                recipient_id=None if broadcast else recipient_id,
                broadcast=broadcast
            )
            
            if success:
                st.success(f"✅ {status}")
                st.balloons()
            else:
                st.error(f"❌ {status}")
        else:
            st.warning("Please enter a message")
    
    st.divider()
    
    # Message history
    st.subheader("📨 Message History")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric("Messages Sent (Offline)", transport.stats.messages_sent_offline)
    
    with col2:
        st.metric("Messages Relayed", transport.stats.messages_relayed)


def render_mesh_statistics_tab(transport: OfflineMeshTransport):
    """Display comprehensive mesh network statistics."""
    
    st.header("📊 Mesh Network Statistics")
    
    stats = transport.get_stats()
    
    # Key metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Peers",
            stats['total_peers'],
            help="Total number of discovered devices"
        )
    
    with col2:
        st.metric(
            "Direct Neighbors",
            stats['direct_neighbors'],
            help="Peers within direct communication range (1 hop)"
        )
    
    with col3:
        st.metric(
            "Mesh Diameter",
            f"{stats['mesh_diameter']} hops",
            help="Maximum hops required to reach any peer"
        )
    
    with col4:
        uptime_hours = stats['uptime_seconds'] / 3600
        st.metric(
            "Uptime",
            f"{uptime_hours:.1f}h",
            help="Time since mesh transport started"
        )
    
    st.divider()
    
    # Data transfer statistics
    st.subheader("📡 Data Transfer")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Messages Sent", stats['messages_sent'])
    
    with col2:
        st.metric("Messages Received", stats['messages_received'])
    
    with col3:
        bytes_kb = stats['bytes_transferred'] / 1024
        st.metric("Data Transferred", f"{bytes_kb:.2f} KB")
    
    st.divider()
    
    # Transport protocols status
    st.subheader("🔌 Active Protocols")
    
    col1, col2 = st.columns(2)
    
    with col1:
        bluetooth_status = "🟢 Enabled" if stats['bluetooth_enabled'] else "🔴 Disabled"
        st.markdown(f"**Bluetooth LE**: {bluetooth_status}")
        st.caption("~100m range, low power consumption")
    
    with col2:
        wifi_status = "🟢 Enabled" if stats['wifi_direct_enabled'] else "🔴 Disabled"
        st.markdown(f"**WiFi Direct**: {wifi_status}")
        st.caption("~200m range, higher bandwidth")


def render_hybrid_routing_tab(hybrid_router):
    """Display hybrid AI routing dashboard."""
    
    st.header("🧠 Hybrid AI Routing")
    st.markdown("**Intelligent path selection: Online vs Offline**")
    
    # Get hybrid routing stats
    stats = hybrid_router.get_hybrid_stats()
    
    st.divider()
    
    # Network status
    st.subheader("🌐 Network Availability")
    
    col1, col2 = st.columns(2)
    
    with col1:
        internet_status = "🟢 Online" if stats['internet_available'] else "🔴 Offline"
        st.markdown(f"**Internet**: {internet_status}")
        st.caption("Traditional HTTP/internet connectivity")
    
    with col2:
        mesh_status = "🟢 Active" if stats['mesh_active'] else "🔴 Inactive"
        st.markdown(f"**Mesh Network**: {mesh_status}")
        st.caption(f"{stats['offline_peers_count']} nearby peers")
    
    st.divider()
    
    # Routing statistics
    st.subheader("📊 Routing Statistics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Routes",
            stats['total_routes'],
            help="Total messages routed through hybrid system"
        )
    
    with col2:
        st.metric(
            "Via Online",
            stats['routes_via_online'],
            help="Messages sent through internet/HTTP"
        )
    
    with col3:
        st.metric(
            "Via Offline",
            stats['routes_via_offline'],
            help="Messages sent through Bluetooth/WiFi Direct mesh"
        )
    
    with col4:
        st.metric(
            "Redundant Paths",
            stats['routes_via_both'],
            help="Critical messages sent via both paths"
        )
    
    st.divider()
    
    # AI Decision Modes
    st.subheader("🎯 Routing Modes")
    
    st.markdown("""
    The AI intelligently selects routing paths based on:
    - **Network availability** (internet vs mesh)
    - **Message priority** (critical messages use both paths)
    - **Peer proximity** (nearby recipients use offline)
    - **Cost optimization** (E=hf quantum pricing)
    - **Security requirements** (censorship resistance)
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.info("""
        **ONLINE ROUTING**
        - Traditional internet/HTTP
        - Existing validator network
        - DAG message processing
        - Higher validator fees
        """)
    
    with col2:
        st.success("""
        **OFFLINE ROUTING**
        - Bluetooth LE / WiFi Direct
        - Peer-to-peer mesh
        - Multi-hop relay
        - Lower transmission costs
        """)
    
    st.divider()
    
    # Economic comparison
    st.subheader("💰 Cost Comparison")
    
    if stats.get('online_stats'):
        online_stats = stats['online_stats']
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Online Burns",
                f"{online_stats.get('total_burns_nxt', 0):.4f} NXT",
                help="NXT burned for online routing"
            )
        
        with col2:
            st.metric(
                "Online Issuance",
                f"{online_stats.get('total_issuance_nxt', 0):.4f} NXT",
                help="NXT minted by validators"
            )
        
        with col3:
            net_flow = online_stats.get('net_flow_nxt', 0)
            st.metric(
                "Net Flow",
                f"{net_flow:+.4f} NXT",
                delta_color="inverse",
                help="Net NXT flow (negative = deflationary)"
            )


def render_transport_settings_tab(transport: OfflineMeshTransport):
    """Configure offline mesh transport settings."""
    
    st.header("⚙️ Transport Settings")
    
    st.markdown("**Configure offline peer-to-peer protocols**")
    
    st.divider()
    
    # Device information
    st.subheader("📱 This Device")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"**Device Name**: {transport.device_name}")
        st.markdown(f"**Device ID**: `{transport.device_id}`")
    
    with col2:
        st.markdown(f"**Spectral Region**: {transport.spectral_region.name}")
        st.markdown(f"**Wavelength**: {transport.spectral_region.wavelength_min}-{transport.spectral_region.wavelength_max} nm")
    
    st.divider()
    
    # Protocol toggles
    st.subheader("🔌 Transport Protocols")
    
    bluetooth = st.toggle(
        "Bluetooth LE",
        value=transport.bluetooth_enabled,
        help="Enable Bluetooth Low Energy mesh networking"
    )
    
    wifi_direct = st.toggle(
        "WiFi Direct",
        value=transport.wifi_direct_enabled,
        help="Enable WiFi Direct (P2P) for higher bandwidth"
    )
    
    nfc = st.toggle(
        "NFC",
        value=transport.nfc_enabled,
        help="Enable NFC for secure device pairing"
    )
    
    if st.button("💾 Save Settings", type="primary"):
        transport.bluetooth_enabled = bluetooth
        transport.wifi_direct_enabled = wifi_direct
        transport.nfc_enabled = nfc
        st.success("✅ Settings saved!")
    
    st.divider()
    
    # Technical information
    st.subheader("ℹ️ How It Works")
    
    with st.expander("🔬 Technical Details"):
        st.markdown("""
        ### Offline Mesh Architecture
        
        **Physical Layer**:
        - **Bluetooth LE**: Uses GATT characteristics to transmit WNSP messages
        - **WiFi Direct**: Establishes P2P socket connections for data transfer
        - **NFC**: Used for initial secure pairing only (<10cm range)
        
        **Network Layer (WNSP v2.0)**:
        - Messages form a DAG (Directed Acyclic Graph) topology
        - Each message references parent messages
        - Prevents loops through message ID tracking
        
        **Routing Algorithm**:
        - Multi-hop routing through mesh
        - Greedy forwarding based on signal strength and hop count
        - Spectral diversity for redundancy
        
        **Real-World Implementation**:
        - **iOS**: CoreBluetooth + Multipeer Connectivity frameworks
        - **Android**: BluetoothLeScanner + WifiP2pManager APIs
        - **Message Serialization**: JSON over BLE/WiFi (binary encoding for production)
        
        **Use Cases**:
        - ✅ Communication during disasters (no cell towers)
        - ✅ Remote villages (no internet infrastructure)
        - ✅ Censorship resistance (cannot be blocked)
        - ✅ Privacy (no ISP tracking)
        """)


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Standalone dashboard for testing."""
    st.set_page_config(
        page_title="Offline Mesh Network - NexusOS",
        page_icon="🌐",
        layout="wide"
    )
    
    render_offline_mesh_dashboard()


if __name__ == "__main__":
    main()
