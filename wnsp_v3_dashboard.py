"""
WNSP v3.0 Dashboard
===================

Unified interface for next-generation wavelength communication protocol.
Showcases Hardware Abstraction, Adaptive Encoding, and Progressive Validation.
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import time

from wnsp_protocol_v3 import get_wnsp_v3, EncodingMode
from wnsp_hardware_abstraction import get_wnsp_hal, RadioProtocol, ValidationTier
from wnsp_adaptive_encoding import get_adaptive_encoder, ContentType


def render_wnsp_v3_dashboard():
    st.title("📡 WNSP v3.0 Protocol")
    st.markdown("""
    **Next-Generation Wavelength Communication** - Production ready on current devices!
    
    Revolutionary upgrades:
    - 🔧 **Hardware Abstraction Layer** - Works on BLE/WiFi/LoRa (no optical hardware needed)
    - ⚡ **Adaptive Encoding** - 10x faster binary mode for blockchain sync
    - 📱 **Progressive Validation** - Full/Intermittent/Light node tiers
    - ⚛️ **Quantum Economics Preserved** - E=hf pricing on radio hardware
    """)
    
    # Initialize components
    wnsp_v3 = get_wnsp_v3()
    hal = get_wnsp_hal()
    encoder = get_adaptive_encoder()
    
    # Tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "🔧 Hardware Abstraction",
        "⚡ Adaptive Encoding",
        "📱 Validation Tiers",
        "🧪 Live Testing",
        "📊 Performance Stats"
    ])
    
    with tab1:
        render_hardware_abstraction_tab(hal)
    
    with tab2:
        render_adaptive_encoding_tab(encoder, wnsp_v3)
    
    with tab3:
        render_validation_tiers_tab(hal)
    
    with tab4:
        render_live_testing_tab(wnsp_v3)
    
    with tab5:
        render_performance_stats_tab(wnsp_v3)


def render_hardware_abstraction_tab(hal):
    """Hardware Abstraction Layer visualization"""
    st.markdown("### 🔧 Hardware Abstraction Layer")
    st.markdown("""
    **Revolutionary Feature**: Maps 350-1033nm wavelength physics to conventional radio protocols.
    
    Enables WNSP deployment on **current smartphones** without waiting for optical transceivers!
    """)
    
    # Device capabilities
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "Device Tier",
            hal.device_tier.value.title(),
            help="Validation capability level"
        )
    
    with col2:
        st.metric(
            "Available Protocols",
            len(hal.available_protocols),
            help="Radio protocols on this device"
        )
    
    with col3:
        st.metric(
            "Spectral Regions",
            len(hal.spectral_mappings),
            help="Wavelength→Radio mappings"
        )
    
    # Spectral→Radio mapping visualization
    st.markdown("#### Wavelength → Radio Frequency Mapping")
    
    mapping_data = []
    for region, mapping in hal.spectral_mappings.items():
        if mapping.radio_channels:
            channel = mapping.radio_channels[0]
            mapping_data.append({
                "Spectral Region": region.name,
                "Wavelength (nm)": f"{mapping.wavelength_range_nm[0]}-{mapping.wavelength_range_nm[1]}",
                "Radio Protocol": mapping.preferred_protocol.value,
                "Radio Freq (GHz)": f"{channel.radio_frequency_hz / 1e9:.3f}",
                "Max Range (m)": mapping.max_range_meters,
                "Cost (NXT)": mapping.base_cost_nxt
            })
    
    st.table(mapping_data)
    
    # Cost preservation chart
    st.markdown("#### E=hf Quantum Economics Preserved")
    
    regions = list(hal.spectral_mappings.keys())
    costs = [hal.spectral_mappings[r].base_cost_nxt for r in regions]
    wavelengths = [
        (hal.spectral_mappings[r].wavelength_range_nm[0] + hal.spectral_mappings[r].wavelength_range_nm[1]) / 2
        for r in regions
    ]
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=wavelengths,
        y=costs,
        mode='markers+lines',
        marker=dict(size=12, color=wavelengths, colorscale='Viridis'),
        name='Cost (NXT)',
        text=[r.name for r in regions],
        hovertemplate='<b>%{text}</b><br>Wavelength: %{x:.0f}nm<br>Cost: %{y:.3f} NXT<extra></extra>'
    ))
    
    fig.update_layout(
        title="Quantum Economics: Shorter Wavelength = Higher Cost (E=hf)",
        xaxis_title="Wavelength (nm)",
        yaxis_title="Message Cost (NXT)",
        height=400
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    st.info("💡 **Key Insight**: Even though we're using radio (GHz), costs are based on ORIGINAL wavelength (nm), preserving quantum economics!")


def render_adaptive_encoding_tab(encoder, wnsp_v3):
    """Adaptive encoding demonstration"""
    st.markdown("### ⚡ Adaptive Encoding System")
    st.markdown("""
    **AI-Powered Mode Selection**:
    - 📝 **Scientific Mode** - Human text (170+ chars, readable, physics-based)
    - 🔢 **Binary Mode** - Blockchain sync (10x faster, spectral binary)
    - 🔀 **Hybrid Mode** - Mixed content (adaptive)
    """)
    
    # Encoding comparison
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Scientific Encoding")
        st.code("""
Human Message: "Hello α-wave!"
→ H: 422nm (Violet)
→ e: 404nm (Violet)
→ l: 446nm (Blue)
→ α: 760nm (IR)
Throughput: ~1,000 bps
        """, language=None)
    
    with col2:
        st.markdown("#### Binary Encoding")
        st.code("""
Blockchain Data: 0x4a3f...
→ 8 spectral regions in parallel
→ 8 bytes per symbol
→ 0x4a: UV, 0x3f: Violet, ...
Throughput: ~10,000 bps (10x faster)
        """, language=None)
    
    # Interactive encoding test
    st.markdown("#### 🧪 Test Adaptive Encoding")
    
    test_content = st.text_area(
        "Enter message to test",
        value="Hello from NexusOS! Testing wavelength encoding.",
        height=100
    )
    
    if st.button("Analyze Encoding", type="primary"):
        # Get encoding decision
        decision = encoder.decide_encoding(test_content)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Content Type", decision.content_type.value.replace('_', ' ').title())
        
        with col2:
            st.metric("Encoding Mode", decision.mode.value.replace('_', ' ').title())
        
        with col3:
            st.metric("Est. Latency", f"{decision.estimated_latency_ms:.1f}ms")
        
        st.success(f"**AI Reasoning**: {decision.reasoning}")
        
        # Show throughput comparison
        throughput_info = encoder.estimate_throughput(
            mode=decision.mode,
            data_size_bytes=decision.estimated_size_bytes
        )
        
        st.markdown(f"""
        **Performance Estimates**:
        - Throughput: {throughput_info['throughput_bps']:,.0f} bps
        - Symbols needed: {throughput_info['symbols_needed']}
        - Efficiency multiplier: {throughput_info['efficiency_multiplier']:.1f}x
        """)


def render_validation_tiers_tab(hal):
    """Progressive validation tiers"""
    st.markdown("### 📱 Progressive Validation Tiers")
    st.markdown("""
    **Cross-Platform Support**: Different devices contribute based on their capability.
    
    Solves the mobile validation problem - phones can participate without killing battery!
    """)
    
    # Tier comparison
    tiers = [
        ValidationTier.FULL_VALIDATOR,
        ValidationTier.INTERMITTENT_VALIDATOR,
        ValidationTier.RELAY_NODE,
        ValidationTier.LIGHT_NODE
    ]
    
    tier_data = []
    for tier in tiers:
        req = hal.get_validation_tier_requirements(tier)
        tier_data.append({
            "Tier": tier.value.title(),
            "Can Validate": "✅" if req['can_validate_blocks'] else "❌",
            "Can Relay": "✅" if req['can_relay_messages'] else "❌",
            "Min Uptime": f"{req['min_uptime_hours']}h",
            "Battery": req['battery_requirement'],
            "NXT Earnings": f"{req['nxt_earnings_rate']:.1f}x"
        })
    
    st.table(tier_data)
    
    # Current device tier
    st.markdown("#### Your Device Configuration")
    
    current_tier_req = hal.get_validation_tier_requirements(hal.device_tier)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric("Current Tier", hal.device_tier.value.title())
        st.metric("Can Validate Blocks", "Yes" if current_tier_req['can_validate_blocks'] else "No")
    
    with col2:
        st.metric("Contribution Multiplier", f"{current_tier_req['contribution_multiplier']:.1f}x")
        st.metric("NXT Earnings Rate", f"{current_tier_req['nxt_earnings_rate']:.1f}x")
    
    st.info("💡 **Pro Tip**: Plug in your phone when charging to upgrade to Intermittent Validator tier and earn NXT!")


def render_live_testing_tab(wnsp_v3):
    """Live message creation and testing"""
    st.markdown("### 🧪 Live WNSP v3.0 Testing")
    
    # Message creator
    col1, col2 = st.columns(2)
    
    with col1:
        sender = st.text_input("Sender Address", value="0xABCD...1234")
        content_type_select = st.selectbox(
            "Content Type",
            ["Human Text", "Blockchain Data", "Validator Consensus", "Binary File"]
        )
    
    with col2:
        recipient = st.text_input("Recipient Address", value="0xEFGH...5678")
        priority = st.select_slider("Priority", options=["low", "normal", "high", "critical"])
    
    # Content input
    if content_type_select == "Human Text":
        content = st.text_area("Message Content", value="Hello from WNSP v3.0! This is a test message using wavelength physics on radio hardware.")
    elif content_type_select == "Blockchain Data":
        content = {"block_id": "0x4a3f...", "transactions": 42, "validator": "UV_REGION"}
    elif content_type_select == "Validator Consensus":
        content = {"proposal_id": "PROP_001", "vote": "approve", "signature": "0xabc..."}
    else:
        content = b"\x00\x01\x02\x03Binary data example"
    
    if st.button("Create v3.0 Message", type="primary"):
        with st.spinner("Creating WNSP v3.0 message..."):
            # Create message
            message = wnsp_v3.create_message_v3(
                sender_id=sender,
                recipient_id=recipient,
                content=content,
                priority=priority
            )
            
            # Display results
            st.success("✅ Message created successfully!")
            
            # Message details
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Message ID", message.message_id[:8] + "...")
                st.metric("Wavelength", f"{message.wavelength_nm:.0f}nm")
                st.metric("Spectral Region", message.spectral_region.name)
            
            with col2:
                st.metric("Radio Protocol", message.radio_channel.radio_protocol.value if message.radio_channel else "N/A")
                st.metric("Encoding Mode", message.encoding_mode.value)
                st.metric("Sender Tier", message.sender_tier.value.title())
            
            with col3:
                st.metric("Cost", f"{message.cost_nxt:.4f} NXT")
                st.metric("Latency", f"{message.estimated_latency_ms:.1f}ms")
                st.metric("Throughput", f"{message.estimated_throughput_bps:,.0f} bps")
            
            # Encoding decision
            if message.encoding_decision:
                st.info(f"🤖 **AI Decision**: {message.encoding_decision.reasoning}")
            
            # Technical details
            with st.expander("🔬 Technical Details"):
                st.json({
                    "message_id": message.message_id,
                    "wavelength_nm": message.wavelength_nm,
                    "spectral_region": message.spectral_region.name,
                    "radio_frequency_ghz": message.radio_channel.radio_frequency_hz / 1e9 if message.radio_channel else None,
                    "quantum_energy_joules": message.quantum_energy_joules,
                    "cost_nxt": message.cost_nxt,
                    "v2_compatible": message.v2_compatible
                })


def render_performance_stats_tab(wnsp_v3):
    """Performance statistics and comparison"""
    st.markdown("### 📊 WNSP v3.0 Performance Statistics")
    
    # Get stats
    stats = wnsp_v3.get_stats()
    hal_stats = stats['hal']
    encoder_stats = stats['encoder']
    
    # Overview metrics
    st.markdown("#### Protocol Statistics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Messages", stats['total_messages_v3'])
    
    with col2:
        st.metric("HAL Mappings", stats['hal_mappings'])
    
    with col3:
        st.metric("Adaptive Encodings", stats['adaptive_encoding'])
    
    with col4:
        st.metric("Active Messages", stats['active_messages'])
    
    # Encoding mode breakdown
    if stats['total_messages_v3'] > 0:
        st.markdown("#### Encoding Mode Distribution")
        
        fig = go.Figure(data=[go.Pie(
            labels=['Scientific', 'Binary', 'Hybrid'],
            values=[
                encoder_stats['scientific_mode_pct'],
                encoder_stats['binary_mode_pct'],
                encoder_stats['hybrid_mode_pct']
            ],
            hole=0.3
        )])
        
        fig.update_layout(title="Message Encoding Modes", height=300)
        st.plotly_chart(fig, use_container_width=True)
    
    # Protocol info
    st.markdown("#### Protocol Capabilities")
    
    protocol_info = wnsp_v3.get_protocol_info()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Features**")
        for feature, enabled in protocol_info['features'].items():
            icon = "✅" if enabled else "❌"
            st.markdown(f"{icon} {feature.replace('_', ' ').title()}")
    
    with col2:
        st.markdown("**Performance**")
        for metric, value in protocol_info['performance'].items():
            st.markdown(f"- **{metric.replace('_', ' ').title()}**: {value}")
    
    # v2.0 vs v3.0 comparison
    st.markdown("#### v2.0 vs v3.0 Comparison")
    
    comparison_data = [
        {"Feature": "Works on current devices", "v2.0": "❌", "v3.0": "✅ (BLE/WiFi/LoRa)"},
        {"Feature": "Throughput (blockchain sync)", "v2.0": "~1,000 bps", "v3.0": "~10,000 bps (10x)"},
        {"Feature": "Mobile validation", "v2.0": "❌ Battery drain", "v3.0": "✅ Progressive tiers"},
        {"Feature": "Max range", "v2.0": "~200m (optical)", "v3.0": "~10km (LoRa)"},
        {"Feature": "Quantum economics", "v2.0": "✅ E=hf", "v3.0": "✅ E=hf (preserved)"},
        {"Feature": "Deployment status", "v2.0": "🔬 Research", "v3.0": "🚀 Production Ready"}
    ]
    
    st.table(comparison_data)
    
    st.success("""
    🎯 **WNSP v3.0 Achievement**: Preserves wavelength physics and quantum economics 
    while enabling deployment on TODAY'S hardware. Bitcoin-style adoption ready!
    """)
