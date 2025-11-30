"""
RESONANCE PROPULSION RESEARCH MODULE
=====================================
NexusOS Implementation of Electromagnetic Resonance Propulsion Theory

Founded on Lambda Boson Substrate: Λ = hf/c²
- Oscillation IS mass (proven by Compton scattering, gravitational lensing)
- Electromagnetic resonance in asymmetric cavities creates momentum gradient
- Thrust emerges from asymmetric radiation pressure distribution

Research Context:
- NASA Eagleworks EmDrive experiments (2014-2016)
- Mach Effect Thrusters (Woodward, 1990s-present)
- Photon pressure propulsion (proven - IKAROS solar sail, 2010)
- Casimir effect vacuum energy (proven, 1997)

Author: Te Rata Pou
License: GPL v3
"""

import streamlit as st
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from dataclasses import dataclass
from typing import Tuple, List, Optional
import math

# Physical Constants
SPEED_OF_LIGHT = 299792458  # m/s
PLANCK_CONSTANT = 6.62607015e-34  # J·s
VACUUM_PERMITTIVITY = 8.854187817e-12  # F/m
VACUUM_PERMEABILITY = 1.25663706212e-6  # H/m


@dataclass
class ResonantCavity:
    """
    Resonant cavity geometry for propulsion research.
    Models frustum (truncated cone) and cylindrical designs.
    """
    large_diameter: float  # meters
    small_diameter: float  # meters
    length: float  # meters
    material_conductivity: float = 5.8e7  # S/m (copper default)
    
    @property
    def asymmetry_ratio(self) -> float:
        """Calculate geometric asymmetry - key to theoretical thrust"""
        return self.large_diameter / self.small_diameter
    
    @property
    def volume(self) -> float:
        """Frustum volume in cubic meters"""
        r1 = self.large_diameter / 2
        r2 = self.small_diameter / 2
        return (np.pi * self.length / 3) * (r1**2 + r1*r2 + r2**2)
    
    @property
    def quality_factor(self) -> float:
        """Estimate Q-factor based on geometry and material"""
        skin_depth = np.sqrt(2 / (2 * np.pi * 2.45e9 * VACUUM_PERMEABILITY * self.material_conductivity))
        avg_radius = (self.large_diameter + self.small_diameter) / 4
        return avg_radius / (2 * skin_depth)


@dataclass
class LambdaBosonField:
    """
    Lambda Boson field calculations for resonance propulsion.
    Λ = hf/c² - oscillation mass-equivalent
    """
    frequency: float  # Hz
    power: float  # Watts
    
    @property
    def wavelength(self) -> float:
        """λ = c/f"""
        return SPEED_OF_LIGHT / self.frequency
    
    @property
    def photon_energy(self) -> float:
        """E = hf (Planck relation)"""
        return PLANCK_CONSTANT * self.frequency
    
    @property
    def lambda_boson_mass(self) -> float:
        """Λ = hf/c² - the mass-equivalent of oscillation"""
        return (PLANCK_CONSTANT * self.frequency) / (SPEED_OF_LIGHT ** 2)
    
    @property
    def photon_momentum(self) -> float:
        """p = h/λ = hf/c"""
        return PLANCK_CONSTANT * self.frequency / SPEED_OF_LIGHT
    
    @property
    def photon_flux(self) -> float:
        """Number of photons per second at given power"""
        return self.power / self.photon_energy
    
    @property
    def radiation_pressure(self) -> float:
        """Pressure from photon momentum (P/c for absorption, 2P/c for reflection)"""
        return 2 * self.power / SPEED_OF_LIGHT  # Perfect reflection


class ResonancePropulsionSimulator:
    """
    Simulates electromagnetic resonance propulsion based on Lambda Boson physics.
    
    Theory: Asymmetric resonant cavity creates non-uniform radiation pressure.
    Net force emerges from momentum gradient across cavity geometry.
    """
    
    def __init__(self, cavity: ResonantCavity, field: LambdaBosonField):
        self.cavity = cavity
        self.field = field
        
    def calculate_mode_distribution(self, mode: Tuple[int, int, int] = (1, 0, 1)) -> np.ndarray:
        """
        Calculate electromagnetic field distribution for TM mode.
        Returns normalized field intensity along cavity axis.
        """
        z = np.linspace(0, self.cavity.length, 100)
        m, n, p = mode
        
        # Radius varies linearly along frustum
        r_large = self.cavity.large_diameter / 2
        r_small = self.cavity.small_diameter / 2
        radius_z = r_large - (r_large - r_small) * z / self.cavity.length
        
        # Field intensity proportional to 1/radius² in asymmetric cavity
        field_intensity = (r_large / radius_z) ** 2
        
        # Standing wave pattern
        standing_wave = np.sin(p * np.pi * z / self.cavity.length) ** 2
        
        return field_intensity * standing_wave
    
    def calculate_theoretical_thrust(self) -> dict:
        """
        Calculate theoretical thrust based on asymmetric radiation pressure.
        
        Key insight: In asymmetric cavity, radiation pressure differs at each end.
        Net thrust = (P_large - P_small) × Area_effective
        
        Returns detailed breakdown of thrust calculation.
        """
        # Radiation pressure at each end (varies with 1/r²)
        r_large = self.cavity.large_diameter / 2
        r_small = self.cavity.small_diameter / 2
        
        # Area of each end
        area_large = np.pi * r_large ** 2
        area_small = np.pi * r_small ** 2
        
        # Base radiation pressure (2P/c for reflection)
        base_pressure = self.field.radiation_pressure
        
        # Pressure varies inversely with area in resonant cavity
        # Higher field concentration at small end
        pressure_large = base_pressure * (area_small / area_large)
        pressure_small = base_pressure * (area_large / area_small)
        
        # Force at each end
        force_large = pressure_large * area_large
        force_small = pressure_small * area_small
        
        # Net thrust (asymmetry creates imbalance)
        asymmetry_factor = (self.cavity.asymmetry_ratio ** 2 - 1) / (self.cavity.asymmetry_ratio ** 2 + 1)
        net_thrust = base_pressure * (area_large - area_small) * asymmetry_factor
        
        # Q-factor enhancement (higher Q = more bounces = more momentum transfer)
        q_enhanced_thrust = net_thrust * self.cavity.quality_factor / 1000
        
        return {
            'base_radiation_pressure_pa': base_pressure,
            'pressure_large_end_pa': pressure_large,
            'pressure_small_end_pa': pressure_small,
            'force_large_end_n': force_large,
            'force_small_end_n': force_small,
            'net_thrust_n': net_thrust,
            'q_enhanced_thrust_n': q_enhanced_thrust,
            'asymmetry_factor': asymmetry_factor,
            'quality_factor': self.cavity.quality_factor,
            'thrust_per_watt': q_enhanced_thrust / self.field.power if self.field.power > 0 else 0,
            'lambda_boson_mass_kg': self.field.lambda_boson_mass,
            'photons_per_second': self.field.photon_flux
        }
    
    def calculate_wnsp_spectral_bands(self) -> dict:
        """
        Map resonance frequency to WNSP 7-band architecture.
        Determines which spectral tier the propulsion system operates in.
        """
        freq = self.field.frequency
        wavelength = self.field.wavelength
        
        # WNSP 7-band classification
        bands = {
            'PLANCK': (1e42, 1e44, 'Quantum gravity regime'),
            'YOCTO': (1e21, 1e24, 'Gamma ray regime'),
            'ZEPTO': (1e18, 1e21, 'Hard X-ray regime'),
            'ATTO': (1e15, 1e18, 'UV/Soft X-ray regime'),
            'FEMTO': (1e12, 1e15, 'Infrared regime'),
            'PICO': (1e9, 1e12, 'Microwave regime'),  # Most propulsion research
            'NANO': (1e6, 1e9, 'Radio frequency regime')
        }
        
        current_band = 'UNKNOWN'
        band_info = ''
        for band_name, (low, high, info) in bands.items():
            if low <= freq < high:
                current_band = band_name
                band_info = info
                break
        
        return {
            'frequency_hz': freq,
            'wavelength_m': wavelength,
            'wnsp_band': current_band,
            'regime': band_info,
            'photon_energy_ev': self.field.photon_energy / 1.602176634e-19,
            'lambda_boson_mass_kg': self.field.lambda_boson_mass
        }


def create_propulsion_dashboard():
    """Main Streamlit dashboard for resonance propulsion research."""
    
    st.set_page_config(
        page_title="NexusOS Resonance Propulsion",
        page_icon="🚀",
        layout="wide"
    )
    
    # Header with gradient
    st.markdown("""
    <style>
    .propulsion-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        color: white;
        padding: 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        text-align: center;
    }
    .physics-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
    .metric-card {
        background: #f8f9fa;
        border-left: 4px solid #667eea;
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 0 8px 8px 0;
    }
    .warning-box {
        background: #fff3cd;
        border: 1px solid #ffc107;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    </style>
    
    <div class="propulsion-header">
        <h1>Resonance Propulsion Research Module</h1>
        <h3>Lambda Boson Substrate: Λ = hf/c²</h3>
        <p>Electromagnetic Momentum Transfer Through Asymmetric Resonance</p>
    </div>
    """, unsafe_allow_html=True)
    
    # Sidebar - Cavity Parameters
    st.sidebar.header("Resonant Cavity Design")
    
    large_dia = st.sidebar.slider(
        "Large End Diameter (cm)",
        min_value=10.0, max_value=50.0, value=28.0, step=0.5
    ) / 100  # Convert to meters
    
    small_dia = st.sidebar.slider(
        "Small End Diameter (cm)",
        min_value=5.0, max_value=30.0, value=15.0, step=0.5
    ) / 100
    
    cavity_length = st.sidebar.slider(
        "Cavity Length (cm)",
        min_value=10.0, max_value=50.0, value=22.0, step=0.5
    ) / 100
    
    st.sidebar.header("RF Parameters")
    
    frequency_ghz = st.sidebar.slider(
        "Frequency (GHz)",
        min_value=1.0, max_value=10.0, value=2.45, step=0.05
    )
    frequency = frequency_ghz * 1e9
    
    power_watts = st.sidebar.slider(
        "Input Power (Watts)",
        min_value=10, max_value=5000, value=1000, step=10
    )
    
    # Create simulation objects
    cavity = ResonantCavity(
        large_diameter=large_dia,
        small_diameter=small_dia,
        length=cavity_length
    )
    
    field = LambdaBosonField(
        frequency=frequency,
        power=power_watts
    )
    
    simulator = ResonancePropulsionSimulator(cavity, field)
    
    # Main content
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Lambda Boson Field Analysis")
        
        spectral = simulator.calculate_wnsp_spectral_bands()
        
        st.markdown(f"""
        <div class="physics-box">
            <h4>Λ = hf/c² Calculations</h4>
            <p><strong>Frequency:</strong> {spectral['frequency_hz']/1e9:.3f} GHz</p>
            <p><strong>Wavelength:</strong> {spectral['wavelength_m']*100:.2f} cm</p>
            <p><strong>Photon Energy:</strong> {spectral['photon_energy_ev']*1e6:.4f} µeV</p>
            <p><strong>Lambda Boson Mass:</strong> {spectral['lambda_boson_mass_kg']:.4e} kg</p>
            <p><strong>WNSP Band:</strong> {spectral['wnsp_band']} ({spectral['regime']})</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Cavity visualization
        st.subheader("Cavity Geometry")
        
        fig_cavity = go.Figure()
        
        # Draw frustum cross-section
        z = np.linspace(0, cavity.length*100, 50)
        r_top = np.linspace(cavity.large_diameter*50, cavity.small_diameter*50, 50)
        r_bottom = -r_top
        
        fig_cavity.add_trace(go.Scatter(
            x=z, y=r_top, mode='lines', name='Upper Wall',
            line=dict(color='#667eea', width=3)
        ))
        fig_cavity.add_trace(go.Scatter(
            x=z, y=r_bottom, mode='lines', name='Lower Wall',
            line=dict(color='#667eea', width=3)
        ))
        
        # Field intensity
        field_dist = simulator.calculate_mode_distribution()
        field_scaled = field_dist / np.max(field_dist) * (cavity.large_diameter * 50 - 2)
        
        fig_cavity.add_trace(go.Scatter(
            x=np.linspace(0, cavity.length*100, 100),
            y=field_scaled,
            mode='lines',
            name='Field Intensity',
            fill='tozeroy',
            line=dict(color='#ff6b6b', width=2)
        ))
        
        fig_cavity.update_layout(
            title="Frustum Cavity Cross-Section with EM Field",
            xaxis_title="Length (cm)",
            yaxis_title="Radius (cm)",
            height=350,
            showlegend=True
        )
        
        st.plotly_chart(fig_cavity, use_container_width=True)
    
    with col2:
        st.subheader("Thrust Calculations")
        
        thrust_data = simulator.calculate_theoretical_thrust()
        
        st.markdown(f"""
        <div class="metric-card">
            <strong>Asymmetry Ratio:</strong> {cavity.asymmetry_ratio:.3f}
        </div>
        <div class="metric-card">
            <strong>Quality Factor (Q):</strong> {thrust_data['quality_factor']:.0f}
        </div>
        <div class="metric-card">
            <strong>Base Radiation Pressure:</strong> {thrust_data['base_radiation_pressure_pa']:.2e} Pa
        </div>
        <div class="metric-card">
            <strong>Theoretical Net Thrust:</strong> {thrust_data['net_thrust_n']*1e6:.4f} µN
        </div>
        <div class="metric-card">
            <strong>Q-Enhanced Thrust:</strong> {thrust_data['q_enhanced_thrust_n']*1e6:.4f} µN
        </div>
        <div class="metric-card">
            <strong>Thrust/Power Ratio:</strong> {thrust_data['thrust_per_watt']*1e6:.6f} µN/W
        </div>
        """, unsafe_allow_html=True)
        
        # Comparison with known propulsion
        st.subheader("Propulsion Comparison")
        
        comparison_data = {
            'System': ['Chemical Rocket', 'Ion Engine', 'Solar Sail', 'Photon Rocket', 'This Cavity'],
            'Thrust/Power (µN/W)': [1e6, 60, 0.003, 0.0033, thrust_data['thrust_per_watt']*1e6],
            'Specific Impulse (s)': [450, 3000, 'N/A', 3e7, 'Theoretical']
        }
        
        fig_compare = go.Figure(data=[
            go.Bar(
                x=comparison_data['System'][:-1],
                y=[1e6, 60, 0.003, 0.0033],
                name='Known Systems',
                marker_color='#764ba2'
            )
        ])
        
        fig_compare.add_trace(go.Bar(
            x=['This Cavity'],
            y=[thrust_data['thrust_per_watt']*1e6],
            name='Resonance Propulsion',
            marker_color='#ff6b6b'
        ))
        
        fig_compare.update_layout(
            title="Thrust-to-Power Comparison (log scale)",
            yaxis_type="log",
            yaxis_title="µN/W",
            height=350,
            barmode='group'
        )
        
        st.plotly_chart(fig_compare, use_container_width=True)
    
    # Theory Section
    st.markdown("---")
    st.subheader("Theoretical Foundation: Lambda Boson Propulsion")
    
    theory_col1, theory_col2 = st.columns(2)
    
    with theory_col1:
        st.markdown("""
        ### Core Principle: Oscillation IS Mass
        
        The Lambda Boson substrate reveals that electromagnetic oscillation 
        carries real mass-equivalent:
        
        **Λ = hf/c²**
        
        This isn't metaphor - it's experimentally verified physics:
        - **Compton Scattering** (1923): Photons transfer momentum like particles with mass
        - **Gravitational Lensing**: Light bends around massive objects
        - **Pair Production**: Photon energy converts to electron-positron mass
        
        ### Asymmetric Cavity Mechanism
        
        In a frustum cavity, electromagnetic field concentration varies:
        - **Large end**: Lower field intensity, lower radiation pressure
        - **Small end**: Higher field intensity, higher radiation pressure
        
        The asymmetry creates a net momentum gradient → theoretical thrust
        """)
    
    with theory_col2:
        st.markdown("""
        ### Research Status
        
        | Experiment | Result | Status |
        |------------|--------|--------|
        | NASA Eagleworks | 1.2 mN/kW claimed | Disputed |
        | Dresden TU | Null result | Published |
        | Xi'an | Positive result claimed | Unpublished |
        | SPR Ltd | 16 mN/kW claimed | Unverified |
        
        ### NexusOS Contribution
        
        This module provides:
        1. **Physics-based simulation** grounded in Lambda Boson theory
        2. **WNSP spectral analysis** of propulsion frequencies
        3. **Comparative metrics** against known propulsion systems
        4. **Open research platform** for community investigation
        
        *Research continues. The universe operates by Λ = hf/c².*
        """)
    
    # Warning
    st.markdown("""
    <div class="warning-box">
        <strong>Research Notice:</strong> Electromagnetic propulsion remains 
        experimental and controversial. This module is for research and 
        educational purposes. Results should be validated through peer-reviewed 
        experimentation. NexusOS provides the theoretical framework; the physics 
        must be proven in hardware.
    </div>
    """, unsafe_allow_html=True)
    
    # Footer
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666;">
        <p><strong>NexusOS Resonance Propulsion Module</strong></p>
        <p>Lambda Boson Substrate: Λ = hf/c² | Founded by Te Rata Pou</p>
        <p>License: GPL v3 | Constructing the rules of nature into civilization</p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    create_propulsion_dashboard()
