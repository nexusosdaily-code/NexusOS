"""
WIP 3D Visualization Layer
===========================

Interactive 3D visualizations for Wavelength Information Physics experiments.
Includes Lambda Boson models, wavelength spectrums, and physics visualizations.

Core Physics: Λ = hf/c² (Lambda Boson - mass-equivalent of oscillation)

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import colorsys


# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K


# =============================================================================
# COLOR UTILITIES
# =============================================================================

def wavelength_to_rgb(wavelength_nm: float) -> Tuple[int, int, int]:
    """
    Convert wavelength (nm) to RGB color.
    Based on Dan Bruton's algorithm.
    """
    wavelength = wavelength_nm
    
    if wavelength < 380:
        r, g, b = 0.5, 0, 0.5  # UV - purple
    elif wavelength < 440:
        r = -(wavelength - 440) / (440 - 380)
        g = 0
        b = 1
    elif wavelength < 490:
        r = 0
        g = (wavelength - 440) / (490 - 440)
        b = 1
    elif wavelength < 510:
        r = 0
        g = 1
        b = -(wavelength - 510) / (510 - 490)
    elif wavelength < 580:
        r = (wavelength - 510) / (580 - 510)
        g = 1
        b = 0
    elif wavelength < 645:
        r = 1
        g = -(wavelength - 645) / (645 - 580)
        b = 0
    elif wavelength <= 780:
        r = 1
        g = 0
        b = 0
    else:
        r, g, b = 0.5, 0, 0  # IR - dark red
    
    # Intensity adjustment at edges
    if wavelength < 380:
        factor = 0.3
    elif wavelength < 420:
        factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380)
    elif wavelength < 700:
        factor = 1.0
    elif wavelength <= 780:
        factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700)
    else:
        factor = 0.3
    
    r = int(255 * (r * factor) ** 0.8)
    g = int(255 * (g * factor) ** 0.8)
    b = int(255 * (b * factor) ** 0.8)
    
    return (r, g, b)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    """Convert RGB to hex color string."""
    return f'#{r:02x}{g:02x}{b:02x}'


# =============================================================================
# 3D LAMBDA BOSON VISUALIZATIONS
# =============================================================================

def create_lambda_boson_3d(
    frequency: float = 5e14,
    show_components: bool = True,
    animation: bool = False
) -> go.Figure:
    """
    Create 3D visualization of Lambda Boson particle.
    
    Shows the oscillation as mass-equivalent (Λ = hf/c²).
    
    Args:
        frequency: Oscillation frequency in Hz
        show_components: Show E, m, Λ components
        animation: Enable rotation animation
    
    Returns:
        Plotly Figure object
    """
    # Calculate physics
    energy = PLANCK_CONSTANT * frequency
    lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
    wavelength = SPEED_OF_LIGHT / frequency
    
    # Create wave surface
    u = np.linspace(0, 4 * np.pi, 100)
    v = np.linspace(0, 2 * np.pi, 50)
    u, v = np.meshgrid(u, v)
    
    # Parametric surface for oscillation
    r = 1 + 0.3 * np.sin(5 * u)
    x = r * np.cos(u) * np.cos(v)
    y = r * np.cos(u) * np.sin(v)
    z = r * np.sin(u)
    
    # Color based on wavelength
    wavelength_nm = wavelength * 1e9
    rgb = wavelength_to_rgb(wavelength_nm)
    color = rgb_to_hex(*rgb)
    
    fig = go.Figure()
    
    # Main Lambda Boson surface
    fig.add_trace(go.Surface(
        x=x, y=y, z=z,
        colorscale=[[0, color], [1, 'white']],
        opacity=0.8,
        showscale=False,
        name='Lambda Boson (Λ)'
    ))
    
    if show_components:
        # Energy sphere (inner)
        theta = np.linspace(0, np.pi, 30)
        phi = np.linspace(0, 2 * np.pi, 30)
        theta, phi = np.meshgrid(theta, phi)
        
        r_e = 0.5
        x_e = r_e * np.sin(theta) * np.cos(phi)
        y_e = r_e * np.sin(theta) * np.sin(phi)
        z_e = r_e * np.cos(theta)
        
        fig.add_trace(go.Surface(
            x=x_e, y=y_e, z=z_e,
            colorscale=[[0, '#ff6b6b'], [1, '#ffd93d']],
            opacity=0.9,
            showscale=False,
            name='Energy Core (E=hf)'
        ))
        
        # Add oscillation lines
        t = np.linspace(0, 4 * np.pi, 200)
        for angle in [0, np.pi/2, np.pi, 3*np.pi/2]:
            x_osc = 2 * np.cos(t) * np.cos(angle)
            y_osc = 2 * np.cos(t) * np.sin(angle)
            z_osc = 2 * np.sin(t)
            
            fig.add_trace(go.Scatter3d(
                x=x_osc, y=y_osc, z=z_osc,
                mode='lines',
                line=dict(color=color, width=2),
                showlegend=False
            ))
    
    # Layout
    fig.update_layout(
        title=dict(
            text=f"Lambda Boson (Λ = hf/c²)<br><sub>f = {frequency:.2e} Hz | λ = {wavelength_nm:.1f} nm | Λ = {lambda_mass:.2e} kg</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(showgrid=False, showticklabels=False, title=''),
            yaxis=dict(showgrid=False, showticklabels=False, title=''),
            zaxis=dict(showgrid=False, showticklabels=False, title=''),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=1.5, y=1.5, z=1.5))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


def create_wavelength_spectrum_3d(
    min_wavelength: float = 380,
    max_wavelength: float = 780,
    n_points: int = 100
) -> go.Figure:
    """
    Create 3D visualization of the electromagnetic spectrum.
    
    Shows visible light spectrum with physics properties.
    
    Args:
        min_wavelength: Minimum wavelength in nm
        max_wavelength: Maximum wavelength in nm
        n_points: Number of data points
    
    Returns:
        Plotly Figure object
    """
    wavelengths = np.linspace(min_wavelength, max_wavelength, n_points)
    
    # Calculate physics for each wavelength
    frequencies = SPEED_OF_LIGHT / (wavelengths * 1e-9)
    energies = PLANCK_CONSTANT * frequencies
    lambda_masses = energies / (SPEED_OF_LIGHT ** 2)
    
    # Create 3D ribbon
    theta = np.linspace(0, 2 * np.pi, n_points)
    
    # Spiral representation
    r = 2 + 0.5 * np.sin(3 * theta)
    x = r * np.cos(theta)
    y = r * np.sin(theta)
    z = np.linspace(0, 5, n_points)
    
    # Colors based on wavelength
    colors = [rgb_to_hex(*wavelength_to_rgb(w)) for w in wavelengths]
    
    fig = go.Figure()
    
    # Main spectrum ribbon
    for i in range(len(wavelengths) - 1):
        fig.add_trace(go.Scatter3d(
            x=[x[i], x[i+1]],
            y=[y[i], y[i+1]],
            z=[z[i], z[i+1]],
            mode='lines',
            line=dict(color=colors[i], width=10),
            showlegend=False,
            hovertemplate=(
                f'λ = {wavelengths[i]:.1f} nm<br>'
                f'f = {frequencies[i]:.2e} Hz<br>'
                f'E = {energies[i]:.2e} J<br>'
                f'Λ = {lambda_masses[i]:.2e} kg'
            )
        ))
    
    # Add wavelength markers
    marker_wavelengths = [400, 450, 500, 550, 600, 650, 700, 750]
    marker_names = ['Violet', 'Blue', 'Cyan', 'Green', 'Yellow', 'Orange', 'Red', 'Deep Red']
    
    for wl, name in zip(marker_wavelengths, marker_names):
        if min_wavelength <= wl <= max_wavelength:
            idx = int((wl - min_wavelength) / (max_wavelength - min_wavelength) * (n_points - 1))
            fig.add_trace(go.Scatter3d(
                x=[x[idx]],
                y=[y[idx]],
                z=[z[idx]],
                mode='markers+text',
                marker=dict(size=8, color=rgb_to_hex(*wavelength_to_rgb(wl))),
                text=[f'{name}<br>{wl}nm'],
                textposition='top center',
                textfont=dict(color='white', size=10),
                showlegend=False
            ))
    
    fig.update_layout(
        title=dict(
            text="Electromagnetic Spectrum (3D Helix)<br><sub>Visible Light: 380-780 nm</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(showgrid=False, showticklabels=False, title=''),
            yaxis=dict(showgrid=False, showticklabels=False, title=''),
            zaxis=dict(title='Wavelength →', showgrid=True),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=2, y=2, z=1))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


def create_energy_frequency_3d(
    freq_range: Tuple[float, float] = (1e14, 1e15),
    n_points: int = 50
) -> go.Figure:
    """
    Create 3D surface showing E = hf relationship.
    
    Args:
        freq_range: (min_freq, max_freq) in Hz
        n_points: Grid resolution
    
    Returns:
        Plotly Figure object
    """
    frequencies = np.linspace(freq_range[0], freq_range[1], n_points)
    time = np.linspace(0, 1e-14, n_points)
    
    F, T = np.meshgrid(frequencies, time)
    
    # E = hf at each point
    E = PLANCK_CONSTANT * F
    
    # Also calculate Lambda mass
    Lambda = E / (SPEED_OF_LIGHT ** 2)
    
    fig = go.Figure()
    
    # Energy surface
    fig.add_trace(go.Surface(
        x=F / 1e14,  # Scale for readability
        y=T * 1e15,
        z=E * 1e19,  # Scale to visible range
        colorscale='Viridis',
        opacity=0.9,
        showscale=True,
        colorbar=dict(title='Energy (×10⁻¹⁹ J)')
    ))
    
    fig.update_layout(
        title=dict(
            text="Planck's Relation: E = hf<br><sub>Energy as function of frequency</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(title='Frequency (×10¹⁴ Hz)'),
            yaxis=dict(title='Time (×10⁻¹⁵ s)'),
            zaxis=dict(title='Energy (×10⁻¹⁹ J)'),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=1.5, y=1.5, z=1.2))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


def create_wave_interference_3d(
    freq1: float = 5e14,
    freq2: float = 5.5e14,
    duration: float = 1e-14
) -> go.Figure:
    """
    Create 3D visualization of wave interference.
    
    Args:
        freq1: First frequency in Hz
        freq2: Second frequency in Hz
        duration: Time duration in seconds
    
    Returns:
        Plotly Figure object
    """
    t = np.linspace(0, duration, 200)
    x = np.linspace(-5, 5, 100)
    T, X = np.meshgrid(t, x)
    
    # Two waves
    wave1 = np.sin(2 * np.pi * freq1 * T + X)
    wave2 = np.sin(2 * np.pi * freq2 * T - X)
    
    # Interference pattern
    interference = wave1 + wave2
    
    fig = go.Figure()
    
    # Interference surface
    fig.add_trace(go.Surface(
        x=T * 1e15,  # femtoseconds
        y=X,
        z=interference,
        colorscale='RdBu',
        opacity=0.9,
        showscale=True,
        colorbar=dict(title='Amplitude')
    ))
    
    beat_freq = abs(freq1 - freq2)
    
    fig.update_layout(
        title=dict(
            text=f"Wave Interference Pattern<br><sub>f₁ = {freq1:.2e} Hz | f₂ = {freq2:.2e} Hz | Beat = {beat_freq:.2e} Hz</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(title='Time (fs)'),
            yaxis=dict(title='Position'),
            zaxis=dict(title='Amplitude'),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=1.5, y=1.5, z=1.2))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


def create_lambda_mass_surface(
    freq_range: Tuple[float, float] = (1e12, 1e16),
    n_points: int = 50
) -> go.Figure:
    """
    Create 3D surface of Lambda Boson mass (Λ = hf/c²).
    
    Args:
        freq_range: Frequency range in Hz
        n_points: Grid resolution
    
    Returns:
        Plotly Figure object
    """
    frequencies = np.logspace(np.log10(freq_range[0]), np.log10(freq_range[1]), n_points)
    wavelengths = SPEED_OF_LIGHT / frequencies
    
    F, W = np.meshgrid(frequencies, wavelengths)
    
    # Lambda mass calculation
    Lambda = (PLANCK_CONSTANT * F) / (SPEED_OF_LIGHT ** 2)
    
    fig = go.Figure()
    
    fig.add_trace(go.Surface(
        x=np.log10(F),
        y=np.log10(W * 1e9),  # Convert to nm
        z=np.log10(Lambda),
        colorscale='Plasma',
        opacity=0.9,
        showscale=True,
        colorbar=dict(title='log₁₀(Λ) [kg]')
    ))
    
    fig.update_layout(
        title=dict(
            text="Lambda Boson Mass Surface: Λ = hf/c²<br><sub>Mass-equivalent of oscillation across EM spectrum</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(title='log₁₀(Frequency) [Hz]'),
            yaxis=dict(title='log₁₀(Wavelength) [nm]'),
            zaxis=dict(title='log₁₀(Lambda Mass) [kg]'),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=1.5, y=1.5, z=1.2))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


def create_standing_wave_3d(
    length: float = 1.0,
    n_modes: int = 5,
    time_steps: int = 50
) -> go.Figure:
    """
    Create 3D animation of standing wave modes.
    
    Args:
        length: Cavity length in meters
        n_modes: Number of harmonic modes
        time_steps: Animation frames
    
    Returns:
        Plotly Figure object
    """
    x = np.linspace(0, length, 100)
    
    fig = go.Figure()
    
    colors = px.colors.qualitative.Set2
    
    for n in range(1, n_modes + 1):
        # Standing wave for mode n
        frequency = (n * SPEED_OF_LIGHT) / (2 * length)
        wavelength = 2 * length / n
        
        # Envelope
        amplitude = np.sin(n * np.pi * x / length)
        
        # Add 3D trace
        z_offset = (n - 1) * 2
        
        fig.add_trace(go.Scatter3d(
            x=x,
            y=amplitude,
            z=[z_offset] * len(x),
            mode='lines',
            line=dict(color=colors[(n-1) % len(colors)], width=5),
            name=f'Mode {n}: λ={wavelength:.3f}m'
        ))
        
        # Add nodes
        nodes_x = np.linspace(0, length, n + 1)
        fig.add_trace(go.Scatter3d(
            x=nodes_x,
            y=[0] * len(nodes_x),
            z=[z_offset] * len(nodes_x),
            mode='markers',
            marker=dict(size=6, color='white'),
            showlegend=False
        ))
    
    fig.update_layout(
        title=dict(
            text=f"Standing Wave Modes<br><sub>Cavity length L = {length} m | Showing first {n_modes} harmonics</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(title='Position (m)'),
            yaxis=dict(title='Amplitude'),
            zaxis=dict(title='Mode Number', tickvals=list(range(0, n_modes * 2, 2))),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=1.8, y=0.5, z=0.8))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        legend=dict(x=0.85, y=0.95),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


def create_blackbody_spectrum_3d(
    temperatures: List[float] = [3000, 5000, 7000, 10000]
) -> go.Figure:
    """
    Create 3D visualization of blackbody spectra.
    
    Args:
        temperatures: List of temperatures in Kelvin
    
    Returns:
        Plotly Figure object
    """
    wavelengths = np.linspace(100e-9, 3000e-9, 200)  # 100nm to 3000nm
    
    fig = go.Figure()
    
    colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff']
    
    for i, T in enumerate(temperatures):
        frequencies = SPEED_OF_LIGHT / wavelengths
        
        # Planck's law
        numerator = 8 * np.pi * PLANCK_CONSTANT * (frequencies ** 3) / (SPEED_OF_LIGHT ** 3)
        exponent = (PLANCK_CONSTANT * frequencies) / (BOLTZMANN_CONSTANT * T)
        denominator = np.exp(np.clip(exponent, -700, 700)) - 1
        
        spectral_density = numerator / denominator
        spectral_density = spectral_density / np.max(spectral_density)  # Normalize
        
        # Peak wavelength (Wien's law)
        peak_wavelength = 2.898e-3 / T
        
        z_offset = i * 0.3
        
        fig.add_trace(go.Scatter3d(
            x=wavelengths * 1e9,
            y=spectral_density,
            z=[z_offset] * len(wavelengths),
            mode='lines',
            line=dict(color=colors[i % len(colors)], width=4),
            name=f'T = {T} K (λ_peak = {peak_wavelength*1e9:.0f} nm)'
        ))
    
    fig.update_layout(
        title=dict(
            text="Blackbody Radiation Spectra<br><sub>Planck's Law: Energy density vs wavelength</sub>",
            x=0.5
        ),
        scene=dict(
            xaxis=dict(title='Wavelength (nm)'),
            yaxis=dict(title='Spectral Density (normalized)'),
            zaxis=dict(title='Temperature →', showticklabels=False),
            bgcolor='rgba(0,0,0,0.9)',
            camera=dict(eye=dict(x=1.5, y=1.2, z=0.8))
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        legend=dict(x=0.7, y=0.95),
        margin=dict(l=0, r=0, t=60, b=0),
        height=600
    )
    
    return fig


# =============================================================================
# 2D ENHANCED VISUALIZATIONS
# =============================================================================

def create_spectral_timeline(
    data: pd.DataFrame,
    value_column: str = 'frequency'
) -> go.Figure:
    """
    Create animated timeline of spectral data.
    
    Args:
        data: DataFrame with 'timestamp' and value columns
        value_column: Column to visualize
    
    Returns:
        Plotly Figure object
    """
    fig = go.Figure()
    
    if 'timestamp' in data.columns:
        x = pd.to_datetime(data['timestamp'])
    else:
        x = data.index
    
    y = data[value_column]
    
    # Color by wavelength if frequency
    if 'frequency' in value_column.lower():
        wavelengths = SPEED_OF_LIGHT / y * 1e9
        colors = [rgb_to_hex(*wavelength_to_rgb(min(max(w, 380), 780))) for w in wavelengths]
    else:
        colors = ['#00d9ff'] * len(y)
    
    fig.add_trace(go.Scatter(
        x=x,
        y=y,
        mode='lines+markers',
        marker=dict(color=colors, size=8),
        line=dict(color='rgba(0,217,255,0.5)', width=2),
        name=value_column
    ))
    
    fig.update_layout(
        title=f"Spectral Timeline: {value_column}",
        xaxis_title="Time",
        yaxis_title=value_column,
        template="plotly_dark",
        height=400
    )
    
    return fig


def create_physics_dashboard(
    frequency: float = 5e14
) -> go.Figure:
    """
    Create comprehensive physics dashboard.
    
    Args:
        frequency: Base frequency in Hz
    
    Returns:
        Plotly Figure with subplots
    """
    # Calculate all physics
    energy = PLANCK_CONSTANT * frequency
    wavelength = SPEED_OF_LIGHT / frequency
    lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
    momentum = energy / SPEED_OF_LIGHT
    
    fig = make_subplots(
        rows=2, cols=2,
        specs=[[{'type': 'indicator'}, {'type': 'indicator'}],
               [{'type': 'indicator'}, {'type': 'indicator'}]],
        subplot_titles=['Energy (E = hf)', 'Wavelength (λ = c/f)', 
                       'Lambda Mass (Λ = hf/c²)', 'Momentum (p = hf/c)']
    )
    
    # Energy
    fig.add_trace(go.Indicator(
        mode="gauge+number",
        value=energy * 1e19,
        title={'text': "×10⁻¹⁹ J"},
        gauge={'axis': {'range': [0, 10]},
               'bar': {'color': "#ff6b6b"},
               'bgcolor': "rgba(0,0,0,0.5)"}
    ), row=1, col=1)
    
    # Wavelength
    fig.add_trace(go.Indicator(
        mode="gauge+number",
        value=wavelength * 1e9,
        title={'text': "nm"},
        gauge={'axis': {'range': [300, 800]},
               'bar': {'color': rgb_to_hex(*wavelength_to_rgb(wavelength * 1e9))},
               'bgcolor': "rgba(0,0,0,0.5)"}
    ), row=1, col=2)
    
    # Lambda Mass
    fig.add_trace(go.Indicator(
        mode="gauge+number",
        value=lambda_mass * 1e36,
        title={'text': "×10⁻³⁶ kg"},
        gauge={'axis': {'range': [0, 10]},
               'bar': {'color': "#00d9ff"},
               'bgcolor': "rgba(0,0,0,0.5)"}
    ), row=2, col=1)
    
    # Momentum
    fig.add_trace(go.Indicator(
        mode="gauge+number",
        value=momentum * 1e27,
        title={'text': "×10⁻²⁷ kg·m/s"},
        gauge={'axis': {'range': [0, 5]},
               'bar': {'color': "#6bcb77"},
               'bgcolor': "rgba(0,0,0,0.5)"}
    ), row=2, col=2)
    
    fig.update_layout(
        title=dict(
            text=f"Physics Dashboard | f = {frequency:.2e} Hz",
            x=0.5
        ),
        paper_bgcolor='rgba(0,0,0,0.9)',
        font=dict(color='white'),
        height=600
    )
    
    return fig


# =============================================================================
# STREAMLIT INTEGRATION
# =============================================================================

def render_3d_lab():
    """Render 3D visualization lab in Streamlit."""
    import streamlit as st
    
    st.markdown("## 🔬 3D Physics Visualization Lab")
    st.markdown("*Interactive 3D models based on Lambda Boson physics (Λ = hf/c²)*")
    
    viz_type = st.selectbox(
        "Select Visualization",
        [
            "Lambda Boson 3D Model",
            "Electromagnetic Spectrum (3D Helix)",
            "Energy-Frequency Surface (E=hf)",
            "Wave Interference Pattern",
            "Lambda Mass Surface (Λ=hf/c²)",
            "Standing Wave Modes",
            "Blackbody Radiation Spectra",
            "Physics Dashboard"
        ]
    )
    
    st.markdown("---")
    
    if viz_type == "Lambda Boson 3D Model":
        col1, col2 = st.columns([1, 2])
        with col1:
            wavelength_nm = st.slider("Wavelength (nm)", 380, 780, 550)
            frequency = SPEED_OF_LIGHT / (wavelength_nm * 1e-9)
            show_components = st.checkbox("Show Components", True)
            
            st.markdown(f"**Frequency:** {frequency:.2e} Hz")
            energy = PLANCK_CONSTANT * frequency
            st.markdown(f"**Energy:** {energy:.2e} J")
            lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
            st.markdown(f"**Lambda Mass:** {lambda_mass:.2e} kg")
        
        with col2:
            fig = create_lambda_boson_3d(frequency, show_components)
            st.plotly_chart(fig, use_container_width=True)
    
    elif viz_type == "Electromagnetic Spectrum (3D Helix)":
        fig = create_wavelength_spectrum_3d()
        st.plotly_chart(fig, use_container_width=True)
    
    elif viz_type == "Energy-Frequency Surface (E=hf)":
        col1, col2 = st.columns(2)
        with col1:
            min_freq = st.number_input("Min Frequency (×10¹⁴ Hz)", 1.0, 10.0, 1.0)
        with col2:
            max_freq = st.number_input("Max Frequency (×10¹⁴ Hz)", 1.0, 20.0, 10.0)
        
        fig = create_energy_frequency_3d((min_freq * 1e14, max_freq * 1e14))
        st.plotly_chart(fig, use_container_width=True)
    
    elif viz_type == "Wave Interference Pattern":
        col1, col2 = st.columns(2)
        with col1:
            freq1 = st.number_input("Frequency 1 (×10¹⁴ Hz)", 1.0, 10.0, 5.0) * 1e14
        with col2:
            freq2 = st.number_input("Frequency 2 (×10¹⁴ Hz)", 1.0, 10.0, 5.5) * 1e14
        
        fig = create_wave_interference_3d(freq1, freq2)
        st.plotly_chart(fig, use_container_width=True)
    
    elif viz_type == "Lambda Mass Surface (Λ=hf/c²)":
        fig = create_lambda_mass_surface()
        st.plotly_chart(fig, use_container_width=True)
        
        st.info("This surface shows how Lambda Boson mass varies across the electromagnetic spectrum. "
               "Higher frequencies = higher mass-equivalent.")
    
    elif viz_type == "Standing Wave Modes":
        col1, col2 = st.columns(2)
        with col1:
            length = st.slider("Cavity Length (m)", 0.1, 5.0, 1.0, 0.1)
        with col2:
            n_modes = st.slider("Number of Modes", 1, 10, 5)
        
        fig = create_standing_wave_3d(length, n_modes)
        st.plotly_chart(fig, use_container_width=True)
    
    elif viz_type == "Blackbody Radiation Spectra":
        temps = st.multiselect(
            "Select Temperatures (K)",
            [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 10000],
            default=[3000, 5000, 7000]
        )
        
        if temps:
            fig = create_blackbody_spectrum_3d(temps)
            st.plotly_chart(fig, use_container_width=True)
    
    elif viz_type == "Physics Dashboard":
        wavelength_nm = st.slider("Set Wavelength (nm)", 380, 780, 550)
        frequency = SPEED_OF_LIGHT / (wavelength_nm * 1e-9)
        
        fig = create_physics_dashboard(frequency)
        st.plotly_chart(fig, use_container_width=True)


# =============================================================================
# DEMONSTRATION
# =============================================================================

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║              WIP 3D VISUALIZATION LAYER - Lambda Boson Physics               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  3D Interactive Visualizations for Wavelength Information Physics            ║
║  Based on Lambda Boson: Λ = hf/c²                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    print("Available 3D Visualizations:")
    print("  1. create_lambda_boson_3d() - Lambda Boson particle model")
    print("  2. create_wavelength_spectrum_3d() - EM spectrum helix")
    print("  3. create_energy_frequency_3d() - E=hf surface")
    print("  4. create_wave_interference_3d() - Interference patterns")
    print("  5. create_lambda_mass_surface() - Λ=hf/c² surface")
    print("  6. create_standing_wave_3d() - Standing wave modes")
    print("  7. create_blackbody_spectrum_3d() - Planck spectra")
    print("  8. create_physics_dashboard() - All-in-one dashboard")
    
    print("\n🎨 Generating sample Lambda Boson visualization...")
    fig = create_lambda_boson_3d(5e14)
    print(f"   Figure created with {len(fig.data)} traces")
    
    print("\n✅ 3D Visualization Layer ready!")
