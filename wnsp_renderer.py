"""
Wavelength-Native Signaling Protocol (WNSP) - Streamlit Renderer

Visual rendering of optical signals as flashing colored lights in Streamlit.
"""

import streamlit as st
import plotly.graph_objects as go
from typing import List, Dict, Any
import time

from wavelength_map import wavelength_to_rgb, get_letter_info, encode_message_to_wavelengths
from wnsp_frames import WnspEncoder, WnspDecoder, WnspFrameMessage, TimelineSegment


class WnspVisualizer:
    """Visualizer for WNSP optical signals in Streamlit."""
    
    def __init__(self):
        """Initialize visualizer."""
        self.encoder = WnspEncoder()
        self.decoder = WnspDecoder()
    
    def render_message_preview(self, text: str) -> None:
        """
        Render a preview of how a message will be encoded as wavelengths.
        
        Args:
            text: Text message to preview
        """
        if not text:
            st.info("Enter a message to see the wavelength encoding preview")
            return
        
        # Encode message
        wavelengths = encode_message_to_wavelengths(text)
        
        if not wavelengths:
            st.warning("No valid characters (A-Z) found in message")
            return
        
        # Create color swatches
        st.write(f"**Message:** {text.upper()}")
        st.write(f"**Characters:** {len(wavelengths)}")
        
        # Display as color blocks
        cols = st.columns(min(len(wavelengths), 13))
        for i, (col, wl) in enumerate(zip(cols, wavelengths)):
            rgb = wavelength_to_rgb(wl)
            hex_color = f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:x}"
            
            with col:
                # Create colored box
                st.markdown(
                    f"""
                    <div style="
                        background-color: {hex_color};
                        width: 100%;
                        height: 60px;
                        border-radius: 5px;
                        border: 2px solid #333;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        color: white;
                        text-shadow: 1px 1px 2px black;
                    ">
                        {text.upper()[i] if i < len(text) else ''}
                    </div>
                    <div style="text-align: center; font-size: 10px; margin-top: 5px;">
                        {wl:.0f}nm
                    </div>
                    """,
                    unsafe_allow_html=True
                )
        
        # Show wavelength details
        with st.expander("📊 Wavelength Details"):
            for char, wl in zip(text.upper(), wavelengths):
                if char.isalpha():
                    info = get_letter_info(char)
                    if info:
                        st.write(f"**{char}** → {wl:.0f} nm ({info.hex_color})")
    
    def render_signal_timeline(self, message: WnspFrameMessage) -> None:
        """
        Render a timeline visualization of the optical signal.
        
        Args:
            message: WNSP frame message to visualize
        """
        if not message.frames:
            st.warning("No frames to visualize")
            return
        
        # Convert to timeline segments
        segments = self.encoder.frames_to_timeline(message)
        
        # Create timeline plot
        fig = go.Figure()
        
        # Add segments as colored bars
        for i, segment in enumerate(segments):
            rgb = wavelength_to_rgb(segment.wavelength_nm)
            hex_color = f"rgb({rgb[0]},{rgb[1]},{rgb[2]})"
            
            # Get the letter for this wavelength
            from wavelength_map import get_letter_for_wavelength
            letter = get_letter_for_wavelength(segment.wavelength_nm)
            
            fig.add_trace(go.Bar(
                x=[segment.duration_ms()],
                y=[1],
                base=[segment.t_start_ms],
                orientation='h',
                marker=dict(color=hex_color, line=dict(color='black', width=1)),
                name=f"{letter} ({segment.wavelength_nm:.0f}nm)",
                hovertemplate=f"<b>{letter}</b><br>Wavelength: {segment.wavelength_nm:.0f}nm<br>Time: {segment.t_start_ms:.0f}-{segment.t_end_ms:.0f}ms<br>Intensity: {segment.intensity_level}/7<extra></extra>",
                showlegend=False
            ))
        
        # Update layout
        fig.update_layout(
            title="Optical Signal Timeline",
            xaxis_title="Time (ms)",
            yaxis=dict(visible=False),
            height=150,
            margin=dict(l=0, r=0, t=40, b=40),
            barmode='overlay',
            hovermode='closest'
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def render_spectrum_chart(self, text: str) -> None:
        """
        Render a spectrum chart showing wavelength distribution.
        
        Args:
            text: Text message to analyze
        """
        wavelengths = encode_message_to_wavelengths(text)
        
        if not wavelengths:
            return
        
        # Count frequency of each wavelength
        from collections import Counter
        wl_counts = Counter(wavelengths)
        
        # Create bar chart
        fig = go.Figure()
        
        sorted_items = sorted(wl_counts.items())
        
        for wl, count in sorted_items:
            rgb = wavelength_to_rgb(wl)
            hex_color = f"rgb({rgb[0]},{rgb[1]},{rgb[2]})"
            
            from wavelength_map import get_letter_for_wavelength
            letter = get_letter_for_wavelength(wl)
            
            fig.add_trace(go.Bar(
                x=[letter],
                y=[count],
                marker=dict(color=hex_color, line=dict(color='black', width=1)),
                name=f"{letter}",
                showlegend=False,
                hovertemplate=f"<b>{letter}</b><br>Wavelength: {wl:.0f}nm<br>Count: {count}<extra></extra>"
            ))
        
        fig.update_layout(
            title="Character Frequency Distribution",
            xaxis_title="Letter",
            yaxis_title="Frequency",
            height=300,
            hovermode='x unified'
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    def render_animated_signal(self, text: str, container) -> None:
        """
        Render an animated optical signal (flashing lights).
        
        Args:
            text: Text message to transmit
            container: Streamlit container for rendering
        """
        wavelengths = encode_message_to_wavelengths(text)
        
        if not wavelengths:
            container.warning("No valid message to transmit")
            return
        
        # Transmit animation
        for i, wl in enumerate(wavelengths):
            rgb = wavelength_to_rgb(wl)
            hex_color = f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
            
            from wavelength_map import get_letter_for_wavelength
            letter = get_letter_for_wavelength(wl)
            
            # Display flashing light
            container.markdown(
                f"""
                <div style="
                    background-color: {hex_color};
                    width: 100%;
                    height: 200px;
                    border-radius: 10px;
                    border: 3px solid #333;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 48px;
                    font-weight: bold;
                    color: white;
                    text-shadow: 2px 2px 4px black;
                    box-shadow: 0 0 30px {hex_color};
                ">
                    {letter}
                </div>
                <div style="text-align: center; margin-top: 10px; font-size: 14px;">
                    Wavelength: {wl:.0f} nm | Character {i+1}/{len(wavelengths)}
                </div>
                """,
                unsafe_allow_html=True
            )
            
            # Brief pause between flashes
            time.sleep(0.3)
    
    def create_transmission_data(self, text: str) -> Dict[str, Any]:
        """
        Create transmission data for a message.
        
        Args:
            text: Text to encode
            
        Returns:
            Dictionary with transmission metadata
        """
        message = self.encoder.encode_message(text)
        segments = self.encoder.frames_to_timeline(message)
        
        return {
            'text': text.upper(),
            'frame_count': len(message.frames),
            'duration_ms': message.get_duration_ms(),
            'wavelengths': [f.wavelength_nm for f in message.frames],
            'message_id': message.message_id,
            'segments': [s.to_dict() for s in segments]
        }


def render_wnsp_interface():
    """Render the complete WNSP interface in Streamlit."""
    st.header("📡 Wavelength-Native Signaling Protocol (WNSP)")
    
    st.markdown("""
    **WNSP** encodes text messages into sequences of light wavelengths across the visible spectrum.
    Each letter (A-Z) maps to a specific wavelength from violet (380nm) to red (740nm).
    """)
    
    visualizer = WnspVisualizer()
    
    # Tabs for different functionalities
    tab1, tab2, tab3 = st.tabs(["📤 Encode & Transmit", "📥 Decode", "📊 Spectrum Analysis"])
    
    with tab1:
        st.subheader("Encode Message to Optical Signal")
        
        message_input = st.text_input(
            "Enter message (A-Z only)",
            value="HELLO",
            max_chars=100,
            help="Only letters A-Z will be encoded"
        )
        
        if message_input:
            # Preview
            visualizer.render_message_preview(message_input)
            
            # Timeline
            st.divider()
            st.subheader("Signal Timeline")
            encoder = WnspEncoder()
            wnsp_message = encoder.encode_message(message_input)
            visualizer.render_signal_timeline(wnsp_message)
            
            # Transmission metadata
            with st.expander("📋 Transmission Details"):
                trans_data = visualizer.create_transmission_data(message_input)
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Characters", trans_data['frame_count'])
                with col2:
                    st.metric("Duration", f"{trans_data['duration_ms']:.0f} ms")
                with col3:
                    st.metric("Message ID", trans_data['message_id'][:8] + "...")
    
    with tab2:
        st.subheader("Decode Optical Signal")
        
        st.info("In a real implementation, this would capture light signals via camera/photodiode and decode them back to text.")
        
        # Simulation: decode a test message
        test_message = st.text_input("Simulate received message", value="NEXUS", key="decode_input")
        
        if st.button("Simulate Decode"):
            if test_message:
                encoder = WnspEncoder()
                decoder = WnspDecoder()
                
                # Encode then decode
                encoded = encoder.encode_message(test_message)
                decoded = decoder.decode_message(encoded)
                
                st.success(f"✅ Decoded message: **{decoded}**")
                st.write(f"Original: {test_message.upper()}")
                st.write(f"Match: {'✓ Yes' if decoded == test_message.upper() else '✗ No'}")
    
    with tab3:
        st.subheader("Spectrum Analysis")
        
        analysis_input = st.text_input(
            "Message to analyze",
            value="NEXUSOS",
            key="spectrum_input"
        )
        
        if analysis_input:
            visualizer.render_spectrum_chart(analysis_input)
            
            # Wavelength statistics
            wavelengths = encode_message_to_wavelengths(analysis_input)
            if wavelengths:
                st.write("**Statistics:**")
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Min Wavelength", f"{min(wavelengths):.0f} nm")
                with col2:
                    st.metric("Max Wavelength", f"{max(wavelengths):.0f} nm")
                with col3:
                    st.metric("Avg Wavelength", f"{sum(wavelengths)/len(wavelengths):.0f} nm")
