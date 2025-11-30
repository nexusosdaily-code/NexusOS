"""
Text-to-Wavelength Translator Component
========================================

User-friendly translation from plain text to wavelength encoding.
Makes WNSP adoption "one click away" by hiding technical complexity.

Features:
- Simple text input → automatic wavelength translation
- Visual spectrum preview showing character-by-character mapping
- Educational mode showing physics behind each conversion
- Reusable across WaveLang Studios, Messaging, and WNSP modules
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from typing import List, Dict, Tuple, Optional, Callable
from dataclasses import dataclass
import numpy as np

from wnsp_protocol_v2 import SCIENTIFIC_CHAR_MAP, EXTENDED_CHAR_MAP

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


@dataclass
class WavelengthMapping:
    """Single character to wavelength mapping with physics"""
    character: str
    wavelength_nm: float
    frequency_hz: float
    energy_j: float
    spectral_region: str
    color_hex: str


def get_spectral_region(wavelength_nm: float) -> str:
    """Map wavelength to spectral region name"""
    if wavelength_nm < 380:
        return "UV"
    elif wavelength_nm < 450:
        return "Violet"
    elif wavelength_nm < 495:
        return "Blue"
    elif wavelength_nm < 570:
        return "Green"
    elif wavelength_nm < 590:
        return "Yellow"
    elif wavelength_nm < 620:
        return "Orange"
    elif wavelength_nm < 750:
        return "Red"
    else:
        return "Infrared"


def wavelength_to_color(wavelength_nm: float) -> str:
    """Convert wavelength to approximate hex color"""
    if wavelength_nm < 380:
        return "#8B00FF"  # UV - deep violet
    elif wavelength_nm < 420:
        return "#7B00FF"  # Violet
    elif wavelength_nm < 450:
        return "#4B0082"  # Indigo
    elif wavelength_nm < 495:
        return "#0000FF"  # Blue
    elif wavelength_nm < 520:
        return "#00FF00"  # Green
    elif wavelength_nm < 570:
        return "#7FFF00"  # Yellow-green
    elif wavelength_nm < 590:
        return "#FFFF00"  # Yellow
    elif wavelength_nm < 620:
        return "#FFA500"  # Orange
    elif wavelength_nm < 750:
        return "#FF0000"  # Red
    else:
        return "#8B0000"  # Infrared - dark red


@dataclass
class TranslationResult:
    """Result of text-to-wavelength translation with metadata"""
    mappings: List[WavelengthMapping]
    unsupported_chars: List[str]
    total_chars: int
    encoded_chars: int
    
    @property
    def has_unsupported(self) -> bool:
        return len(self.unsupported_chars) > 0
    
    @property
    def encoding_ratio(self) -> float:
        return self.encoded_chars / self.total_chars if self.total_chars > 0 else 0


def translate_text_to_wavelengths(
    text: str, 
    use_scientific: bool = True
) -> List[WavelengthMapping]:
    """
    Translate plain text to wavelength mappings.
    
    Args:
        text: Plain text message to translate
        use_scientific: Use extended scientific character set
        
    Returns:
        List of WavelengthMapping objects for each character
    """
    result = translate_text_full(text, use_scientific)
    return result.mappings


def translate_text_full(
    text: str, 
    use_scientific: bool = True
) -> TranslationResult:
    """
    Translate plain text with full metadata including unsupported characters.
    
    Args:
        text: Plain text message to translate
        use_scientific: Use extended scientific character set
        
    Returns:
        TranslationResult with mappings and unsupported character info
    """
    char_map = SCIENTIFIC_CHAR_MAP if use_scientific else EXTENDED_CHAR_MAP
    mappings = []
    unsupported = []
    
    for char in text:
        wavelength_nm = char_map.get(char) or char_map.get(char.upper())
        
        if wavelength_nm is None:
            if char not in unsupported:
                unsupported.append(char)
            continue
            
        wavelength_m = wavelength_nm * 1e-9
        frequency_hz = SPEED_OF_LIGHT / wavelength_m
        energy_j = PLANCK_CONSTANT * frequency_hz
        
        mapping = WavelengthMapping(
            character=char,
            wavelength_nm=wavelength_nm,
            frequency_hz=frequency_hz,
            energy_j=energy_j,
            spectral_region=get_spectral_region(wavelength_nm),
            color_hex=wavelength_to_color(wavelength_nm)
        )
        mappings.append(mapping)
    
    return TranslationResult(
        mappings=mappings,
        unsupported_chars=unsupported,
        total_chars=len(text),
        encoded_chars=len(mappings)
    )


def get_wavelength_sequence(mappings: List[WavelengthMapping]) -> List[float]:
    """Extract just the wavelength values as a list"""
    return [m.wavelength_nm for m in mappings]


def calculate_message_energy(mappings: List[WavelengthMapping]) -> float:
    """Calculate total quantum energy of message (E = Σhf)"""
    return sum(m.energy_j for m in mappings)


def render_compact_spectrum_bar(mappings: List[WavelengthMapping], max_chars: int = 80) -> str:
    """
    Create a compact HTML color bar visualization for embedding.
    Shared helper for consistent spectrum previews across modules.
    
    Returns:
        HTML string for the color bar
    """
    if not mappings:
        return "<span style='color:#666;'>No encodable characters</span>"
    
    wavelengths = [m.wavelength_nm for m in mappings[:max_chars]]
    colors = [wavelength_to_color(w) for w in wavelengths]
    
    color_bar = "".join([
        f"<span style='display:inline-block;width:6px;height:20px;background-color:{c};margin:0 1px;border-radius:2px;'></span>"
        for c in colors
    ])
    
    remaining = len(mappings) - max_chars if len(mappings) > max_chars else 0
    suffix = f"<span style='color:#666;font-size:0.8em;'> +{remaining} more</span>" if remaining > 0 else ""
    
    return f"""
    <div style='background:rgba(0,0,0,0.05);padding:10px;border-radius:8px;margin:10px 0;'>
        <div style='font-size:0.8em;color:#666;margin-bottom:5px;'>
            Wavelength Spectrum ({len(mappings)} characters)
        </div>
        <div style='overflow-x:auto;white-space:nowrap;'>{color_bar}{suffix}</div>
    </div>
    """


def render_spectrum_visualization(mappings: List[WavelengthMapping]) -> go.Figure:
    """Create visual spectrum chart showing wavelength sequence"""
    if not mappings:
        fig = go.Figure()
        fig.add_annotation(text="Enter text to see spectrum", 
                          xref="paper", yref="paper", x=0.5, y=0.5)
        return fig
    
    wavelengths = [m.wavelength_nm for m in mappings]
    characters = [m.character for m in mappings]
    colors = [m.color_hex for m in mappings]
    regions = [m.spectral_region for m in mappings]
    
    fig = go.Figure()
    
    fig.add_trace(go.Bar(
        x=list(range(len(mappings))),
        y=wavelengths,
        marker_color=colors,
        text=characters,
        textposition='outside',
        hovertemplate=(
            "<b>Character:</b> %{text}<br>"
            "<b>Wavelength:</b> %{y:.0f} nm<br>"
            "<b>Region:</b> %{customdata}<br>"
            "<extra></extra>"
        ),
        customdata=regions
    ))
    
    fig.update_layout(
        title="Message Wavelength Spectrum",
        xaxis_title="Character Position",
        yaxis_title="Wavelength (nm)",
        yaxis=dict(range=[300, 1000]),
        height=300,
        showlegend=False,
        template="plotly_white"
    )
    
    return fig


def render_character_table(mappings: List[WavelengthMapping], max_rows: int = 10):
    """Render character-by-character breakdown table"""
    if not mappings:
        return
    
    display_mappings = mappings[:max_rows]
    remaining = len(mappings) - max_rows if len(mappings) > max_rows else 0
    
    cols = st.columns([1, 2, 2, 2, 2])
    cols[0].markdown("**Char**")
    cols[1].markdown("**λ (nm)**")
    cols[2].markdown("**Frequency**")
    cols[3].markdown("**Energy**")
    cols[4].markdown("**Region**")
    
    for m in display_mappings:
        cols = st.columns([1, 2, 2, 2, 2])
        cols[0].markdown(f"<span style='font-size:1.2em; color:{m.color_hex};'>{m.character}</span>", 
                        unsafe_allow_html=True)
        cols[1].write(f"{m.wavelength_nm:.0f}")
        cols[2].write(f"{m.frequency_hz:.2e} Hz")
        cols[3].write(f"{m.energy_j:.2e} J")
        cols[4].markdown(f"<span style='color:{m.color_hex};'>{m.spectral_region}</span>", 
                        unsafe_allow_html=True)
    
    if remaining > 0:
        st.caption(f"... and {remaining} more characters")


def render_text_to_wavelength_translator(
    key_prefix: str = "translator",
    on_translate: Optional[Callable[[List[WavelengthMapping]], None]] = None,
    show_educational: bool = True,
    compact: bool = False
) -> Optional[List[WavelengthMapping]]:
    """
    Render the complete text-to-wavelength translator component.
    
    Args:
        key_prefix: Unique key prefix for Streamlit widgets
        on_translate: Callback function when translation is done
        show_educational: Show educational breakdown of translation
        compact: Use compact layout
        
    Returns:
        List of wavelength mappings if translation was performed
    """
    
    if not compact:
        st.markdown("### ✨ Text to Wavelength Translator")
        st.markdown("""
        Type your message in plain text below. The system will automatically 
        translate each character to its wavelength encoding using the WNSP protocol.
        """)
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        text_input = st.text_area(
            "Your Message",
            placeholder="Type your message here... (e.g., 'Hello World')",
            key=f"{key_prefix}_text_input",
            height=100 if not compact else 68
        )
    
    with col2:
        st.write("")
        use_scientific = st.checkbox(
            "Scientific Mode",
            value=True,
            key=f"{key_prefix}_scientific",
            help="Extended character set with Greek letters, math symbols, physics notation"
        )
        
        translate_clicked = st.button(
            "🌊 Translate",
            key=f"{key_prefix}_translate_btn",
            type="primary",
            use_container_width=True
        )
    
    mappings = None
    
    if text_input and (translate_clicked or f"{key_prefix}_last_text" in st.session_state):
        if translate_clicked:
            st.session_state[f"{key_prefix}_last_text"] = text_input
        
        current_text = st.session_state.get(f"{key_prefix}_last_text", text_input)
        result = translate_text_full(current_text, use_scientific)
        mappings = result.mappings
        
        if result.has_unsupported:
            unsupported_display = ", ".join([f"'{c}'" for c in result.unsupported_chars[:10]])
            if len(result.unsupported_chars) > 10:
                unsupported_display += f" (+{len(result.unsupported_chars) - 10} more)"
            st.warning(f"⚠️ Some characters cannot be encoded: {unsupported_display}. "
                      f"Encoded {result.encoded_chars} of {result.total_chars} characters ({result.encoding_ratio:.0%})")
        
        if mappings:
            wavelength_sequence = get_wavelength_sequence(mappings)
            total_energy = calculate_message_energy(mappings)
            
            col1, col2, col3, col4 = st.columns(4)
            col1.metric("Characters", len(mappings))
            col2.metric("Unique Wavelengths", len(set(wavelength_sequence)))
            col3.metric("Total Energy", f"{total_energy:.2e} J")
            col4.metric("Avg Wavelength", f"{np.mean(wavelength_sequence):.0f} nm")
            
            fig = render_spectrum_visualization(mappings)
            st.plotly_chart(fig, use_container_width=True)
            
            if show_educational and not compact:
                with st.expander("📚 Character-by-Character Breakdown", expanded=False):
                    render_character_table(mappings)
                    
                    st.markdown("---")
                    st.markdown("### Physics Behind the Encoding")
                    st.markdown("""
                    Each character maps to a specific wavelength in the electromagnetic spectrum:
                    
                    - **E = hf** — Quantum energy from frequency
                    - **c = λf** — Speed of light relates wavelength to frequency
                    - **λ = hf/c²** — Lambda Boson mass-equivalent
                    
                    Shorter wavelengths (UV/Violet) carry more energy than longer wavelengths (Red/IR).
                    """)
            
            wavelength_str = ", ".join([str(int(w)) for w in wavelength_sequence])
            
            with st.expander("📋 Copy Wavelength Sequence", expanded=False):
                st.code(f"[{wavelength_str}]", language="python")
                st.caption("Copy this sequence to use in WNSP protocols")
            
            if on_translate:
                on_translate(mappings)
        else:
            st.warning("No translatable characters found. Try using letters, numbers, or common symbols.")
    
    return mappings


def render_quick_translator(
    key_prefix: str = "quick",
    label: str = "Message"
) -> Tuple[str, List[float]]:
    """
    Minimal inline translator for embedding in other forms.
    
    Returns:
        Tuple of (original_text, wavelength_sequence)
    """
    col1, col2 = st.columns([4, 1])
    
    with col1:
        text = st.text_input(label, key=f"{key_prefix}_quick_input", 
                            placeholder="Type message...")
    
    with col2:
        st.write("")
        auto_translate = st.checkbox("Auto", value=True, key=f"{key_prefix}_auto")
    
    wavelengths = []
    if text and auto_translate:
        mappings = translate_text_to_wavelengths(text, use_scientific=True)
        wavelengths = get_wavelength_sequence(mappings)
        
        colors = [wavelength_to_color(w) for w in wavelengths]
        color_bar = "".join([
            f"<span style='background-color:{c}; padding:2px 4px; margin:1px;'>&nbsp;</span>"
            for c in colors[:50]
        ])
        
        st.markdown(f"<div style='line-height:1.5;'>{color_bar}</div>", unsafe_allow_html=True)
        if len(wavelengths) > 50:
            st.caption(f"Showing first 50 of {len(wavelengths)} wavelengths")
    
    return text, wavelengths


if __name__ == "__main__":
    st.set_page_config(page_title="Text to Wavelength Translator", layout="wide")
    st.title("🌈 Text to Wavelength Translator")
    
    render_text_to_wavelength_translator(
        key_prefix="demo",
        show_educational=True
    )
