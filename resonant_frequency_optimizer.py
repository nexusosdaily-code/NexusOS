"""
Resonant Frequency Optimizer - CONCEPT MODEL / SIMULATION
==========================================================

⚠️ IMPORTANT: THIS IS A SIMULATION - NOT REAL HARDWARE ⚠️

This module is a THEORETICAL MODEL demonstrating the physics of resonant
wireless power transmission. It CALCULATES expected performance using proven
electromagnetic theory, but NO ACTUAL WIRELESS POWER IS BEING TRANSMITTED.

NO REAL POWER TRANSFER IS HAPPENING. NO HARDWARE IS CONNECTED.

Based on Nikola Tesla's wireless power transmission research:
- Resonant inductive coupling (Tesla coil principles)
- Q-factor optimization for maximum efficiency
- Impedance matching for power transfer
- Frequency tuning for minimal losses

Real implementation would require:
- Transmitter coil (Tesla coil or resonant LC circuit)
- Receiver coil (matched resonant frequency)
- Power amplifier and matching network
- Frequency synthesizer and control electronics

Physics Foundation (Real Science):
- Tesla's wireless power patents (US1119732, US645576)
- Resonant circuit theory (LC resonance)
- Coupled mode theory
- WiTricity (MIT, 2007) - modern validation of Tesla's concepts

Current Status: PHYSICS CALCULATION MODEL ONLY
Future: Could control real wireless power hardware when available

Author: NexusOS Team
License: GPL v3
"""

import math
import time
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


# Physical Constants
SPEED_OF_LIGHT = 299792458  # m/s
VACUUM_PERMEABILITY = 4 * math.pi * 1e-7  # H/m (μ₀)
VACUUM_PERMITTIVITY = 8.854187817e-12  # F/m (ε₀)
PLANCK_CONSTANT = 6.62607015e-34  # J·s


class ResonanceMode(Enum):
    """Wireless power transfer modes"""
    NEAR_FIELD = "near_field"  # < λ/2π (inductive/capacitive)
    INTERMEDIATE = "intermediate"  # λ/2π to λ
    FAR_FIELD = "far_field"  # > λ (radiative)


@dataclass
class ResonatorSpec:
    """Specification for a resonant circuit"""
    inductance: float  # Henries (H)
    capacitance: float  # Farads (F)
    resistance: float  # Ohms (Ω)
    quality_factor: float  # Q-factor (dimensionless)
    resonant_frequency: float  # Hz
    impedance: float  # Ohms (at resonance)


@dataclass
class CouplingResult:
    """Result of resonant coupling analysis"""
    efficiency: float  # 0-1 (power transfer efficiency)
    coupling_coefficient: float  # k (0-1)
    power_transmitted: float  # Watts
    power_received: float  # Watts
    distance_meters: float
    frequency: float  # Hz
    q_factor_transmitter: float
    q_factor_receiver: float
    resonance_match: float  # 0-1 (how well frequencies match)


@dataclass
class OptimizationResult:
    """Result of frequency optimization"""
    optimal_frequency: float  # Hz
    optimal_wavelength: float  # meters
    optimal_q_factor: float
    max_efficiency: float  # 0-1
    power_capacity: float  # Watts
    optimal_distance: float  # meters
    mode: ResonanceMode


class ResonantCircuit:
    """
    Models a resonant LC circuit (like Tesla coil secondary)
    
    Resonant frequency: f₀ = 1 / (2π√LC)
    Quality factor: Q = ω₀L / R = 1 / (ω₀RC)
    Impedance at resonance: Z = R (purely resistive)
    """
    
    def __init__(self, inductance: float, capacitance: float, resistance: float):
        """
        Args:
            inductance: Henries (H)
            capacitance: Farads (F)
            resistance: Ohms (Ω)
        """
        self.L = inductance
        self.C = capacitance
        self.R = resistance
        
        # Calculate resonant frequency
        self.f0 = 1.0 / (2 * math.pi * math.sqrt(self.L * self.C))
        self.omega0 = 2 * math.pi * self.f0
        
        # Calculate Q-factor
        self.Q = self.omega0 * self.L / self.R
        
        # Impedance at resonance
        self.Z0 = self.R
        
    def calculate_bandwidth(self) -> float:
        """Calculate 3dB bandwidth: BW = f₀/Q"""
        return self.f0 / self.Q
    
    def calculate_energy_stored(self, current_peak: float) -> float:
        """
        Calculate energy stored in resonator
        E = ½LI² + ½CV²
        """
        voltage_peak = current_peak * self.Z0
        energy_magnetic = 0.5 * self.L * current_peak**2
        energy_electric = 0.5 * self.C * voltage_peak**2
        return energy_magnetic + energy_electric
    
    def get_spec(self) -> ResonatorSpec:
        """Get complete resonator specification"""
        return ResonatorSpec(
            inductance=self.L,
            capacitance=self.C,
            resistance=self.R,
            quality_factor=self.Q,
            resonant_frequency=self.f0,
            impedance=self.Z0
        )


class WirelessPowerCoupling:
    """
    Models wireless power transfer between two resonant circuits
    
    Based on coupled mode theory and Tesla's resonant coupling.
    Efficiency depends on Q-factors and coupling coefficient k.
    """
    
    @staticmethod
    def calculate_coupling_coefficient(distance: float, coil_radius: float,
                                      frequency: float) -> float:
        """
        Calculate magnetic coupling coefficient k between two coils
        
        k ≈ (r²)³ / [(r² + d²)^(3/2)]  for aligned circular coils
        
        where r = coil radius, d = distance
        """
        r = coil_radius
        d = distance
        
        # Geometric coupling
        k_geometric = (r**2)**3 / ((r**2 + d**2)**(3/2))
        
        # Add frequency dependency (higher frequency = better coupling)
        wavelength = SPEED_OF_LIGHT / frequency
        distance_in_wavelengths = distance / wavelength
        
        # Near-field coupling is strongest
        if distance_in_wavelengths < 1.0:
            k_freq_factor = 1.0
        else:
            k_freq_factor = 1.0 / distance_in_wavelengths**2
        
        k = k_geometric * k_freq_factor
        return min(k, 1.0)  # k cannot exceed 1
    
    @staticmethod
    def calculate_efficiency(q_transmitter: float, q_receiver: float,
                           coupling_coefficient: float) -> float:
        """
        Calculate power transfer efficiency
        
        η = (k² × Q_tx × Q_rx) / [(1 + k² × Q_tx × Q_rx)²]
        
        This is the famous coupled mode theory efficiency formula.
        """
        k = coupling_coefficient
        Q1 = q_transmitter
        Q2 = q_receiver
        
        # Figure of merit
        U = k * math.sqrt(Q1 * Q2)
        
        # Efficiency (Tesla-MIT formula)
        if U < 0.001:  # Avoid division by zero
            return 0.0
        
        efficiency = U**2 / (1 + U**2)**2
        return min(efficiency, 1.0)
    
    @staticmethod
    def calculate_optimal_frequency(distance: float, coil_radius: float,
                                   power_requirement: float) -> float:
        """
        Calculate optimal frequency for given distance
        
        For near-field (distance < λ/2π): lower frequency is better
        For far-field (distance > λ): higher frequency allows smaller antennas
        """
        # Rule of thumb: use frequency where λ/2π ≈ distance
        wavelength_optimal = distance * 2 * math.pi
        frequency_optimal = SPEED_OF_LIGHT / wavelength_optimal
        
        # Clamp to practical range
        # ISM bands: 13.56 MHz, 27.12 MHz, 6.78 MHz, 915 MHz, 2.4 GHz
        frequency_optimal = max(1e6, min(frequency_optimal, 10e9))
        
        return frequency_optimal


class ResonantFrequencyOptimizer:
    """
    Main optimizer for wireless power transfer using resonant coupling
    
    Implements Tesla's vision of wireless power with modern optimizations.
    """
    
    def __init__(self):
        self.transmitter: Optional[ResonantCircuit] = None
        self.receiver: Optional[ResonantCircuit] = None
        
    def design_transmitter(self, frequency: float, power_watts: float,
                          q_factor_target: float = 100.0) -> ResonantCircuit:
        """
        Design transmitter resonator for target frequency and power
        
        Args:
            frequency: Target frequency (Hz)
            power_watts: Transmit power (W)
            q_factor_target: Desired Q-factor (higher = more efficient)
        """
        # Choose inductance (typical range: 1 μH to 1 mH)
        L = 100e-6  # 100 μH
        
        # Calculate required capacitance for frequency
        # f = 1/(2π√LC) → C = 1/(4π²f²L)
        C = 1.0 / (4 * math.pi**2 * frequency**2 * L)
        
        # Calculate resistance for desired Q
        # Q = ωL/R → R = ωL/Q
        omega = 2 * math.pi * frequency
        R = omega * L / q_factor_target
        
        self.transmitter = ResonantCircuit(L, C, R)
        return self.transmitter
    
    def design_receiver(self, frequency: float, load_resistance: float,
                       q_factor_target: float = 100.0) -> ResonantCircuit:
        """
        Design receiver resonator matched to transmitter frequency
        """
        # Match transmitter inductance for symmetry
        if self.transmitter:
            L = self.transmitter.L
        else:
            L = 100e-6
        
        # Calculate capacitance for same frequency
        C = 1.0 / (4 * math.pi**2 * frequency**2 * L)
        
        # Resistance includes coil resistance + load
        omega = 2 * math.pi * frequency
        coil_resistance = omega * L / q_factor_target
        R = coil_resistance + load_resistance
        
        self.receiver = ResonantCircuit(L, C, R)
        return self.receiver
    
    def analyze_coupling(self, distance: float, coil_radius: float,
                        input_power: float) -> CouplingResult:
        """
        Analyze coupling between transmitter and receiver
        """
        if not self.transmitter or not self.receiver:
            raise ValueError("Must design transmitter and receiver first")
        
        # Calculate coupling coefficient
        k = WirelessPowerCoupling.calculate_coupling_coefficient(
            distance, coil_radius, self.transmitter.f0
        )
        
        # Calculate efficiency
        efficiency = WirelessPowerCoupling.calculate_efficiency(
            self.transmitter.Q, self.receiver.Q, k
        )
        
        # Calculate power transfer
        power_transmitted = input_power
        power_received = power_transmitted * efficiency
        
        # Resonance match (how well frequencies align)
        freq_diff = abs(self.transmitter.f0 - self.receiver.f0)
        resonance_match = math.exp(-freq_diff / self.transmitter.f0)
        
        return CouplingResult(
            efficiency=efficiency,
            coupling_coefficient=k,
            power_transmitted=power_transmitted,
            power_received=power_received,
            distance_meters=distance,
            frequency=self.transmitter.f0,
            q_factor_transmitter=self.transmitter.Q,
            q_factor_receiver=self.receiver.Q,
            resonance_match=resonance_match
        )
    
    def optimize_for_distance(self, distance: float, coil_radius: float,
                            power_requirement: float,
                            efficiency_target: float = 0.8) -> OptimizationResult:
        """
        Find optimal frequency and Q-factor for given distance and power
        
        Args:
            distance: Separation between transmitter and receiver (m)
            coil_radius: Coil radius (m)
            power_requirement: Required received power (W)
            efficiency_target: Target efficiency (0-1)
        """
        # Start with optimal frequency for this distance
        f_optimal = WirelessPowerCoupling.calculate_optimal_frequency(
            distance, coil_radius, power_requirement
        )
        
        # Determine operating mode
        wavelength = SPEED_OF_LIGHT / f_optimal
        if distance < wavelength / (2 * math.pi):
            mode = ResonanceMode.NEAR_FIELD
        elif distance < wavelength:
            mode = ResonanceMode.INTERMEDIATE
        else:
            mode = ResonanceMode.FAR_FIELD
        
        # Optimize Q-factor
        best_q = 50.0
        best_efficiency = 0.0
        
        for q_candidate in range(10, 500, 10):
            # Design system with this Q
            self.design_transmitter(f_optimal, power_requirement * 2, q_candidate)
            self.design_receiver(f_optimal, 50.0, q_candidate)
            
            # Analyze performance
            result = self.analyze_coupling(distance, coil_radius, power_requirement / efficiency_target)
            
            if result.efficiency > best_efficiency:
                best_efficiency = result.efficiency
                best_q = float(q_candidate)
            
            # Stop if we exceed target
            if result.efficiency >= efficiency_target:
                break
        
        # Final design with optimal Q
        self.design_transmitter(f_optimal, power_requirement * 2, best_q)
        self.design_receiver(f_optimal, 50.0, best_q)
        
        return OptimizationResult(
            optimal_frequency=f_optimal,
            optimal_wavelength=wavelength,
            optimal_q_factor=best_q,
            max_efficiency=best_efficiency,
            power_capacity=power_requirement,
            optimal_distance=distance,
            mode=mode
        )
    
    def calculate_nxt_energy_cost(self, power_watts: float, duration_seconds: float) -> float:
        """
        Calculate NXT token cost for wireless power transmission
        
        Using E=hf relationship:
        Energy (J) = Power (W) × Time (s)
        NXT cost = Energy / (h × f_green)
        """
        # Total energy
        energy_joules = power_watts * duration_seconds
        
        # Green light photon energy (500 nm reference)
        f_green = SPEED_OF_LIGHT / 500e-9
        photon_energy = PLANCK_CONSTANT * f_green
        
        # NXT tokens
        nxt_units = energy_joules / photon_energy
        return nxt_units / 1e8  # Convert to NXT (1 NXT = 100,000,000 units)
    
    def get_optimization_summary(self, result: OptimizationResult) -> Dict:
        """Get comprehensive optimization summary"""
        return {
            'optimal_frequency_hz': result.optimal_frequency,
            'optimal_frequency_mhz': result.optimal_frequency / 1e6,
            'optimal_wavelength_m': result.optimal_wavelength,
            'optimal_q_factor': result.optimal_q_factor,
            'max_efficiency_percent': result.max_efficiency * 100,
            'power_capacity_watts': result.power_capacity,
            'optimal_distance_m': result.optimal_distance,
            'operating_mode': result.mode.value,
            'transmitter_spec': self.transmitter.get_spec() if self.transmitter else None,
            'receiver_spec': self.receiver.get_spec() if self.receiver else None,
            'energy_cost_per_hour_nxt': self.calculate_nxt_energy_cost(
                result.power_capacity, 3600
            ) if result.power_capacity else 0
        }


# Demonstration
if __name__ == "__main__":
    print("Resonant Frequency Optimizer - Tesla Wireless Power")
    print("=" * 60)
    
    optimizer = ResonantFrequencyOptimizer()
    
    # Scenario: Power a mesh network node 10 meters away
    print("\nScenario: Wireless power for mesh node")
    print("Distance: 10 meters")
    print("Power requirement: 100 mW (typical mesh node)")
    print("Coil radius: 0.1 meters (10 cm)\n")
    
    result = optimizer.optimize_for_distance(
        distance=10.0,
        coil_radius=0.1,
        power_requirement=0.1,  # 100 mW
        efficiency_target=0.5  # 50% efficiency target
    )
    
    summary = optimizer.get_optimization_summary(result)
    
    print(f"Optimal Frequency: {summary['optimal_frequency_mhz']:.2f} MHz")
    print(f"Wavelength: {summary['optimal_wavelength_m']:.2f} m")
    print(f"Optimal Q-factor: {summary['optimal_q_factor']:.0f}")
    print(f"Maximum Efficiency: {summary['max_efficiency_percent']:.1f}%")
    print(f"Operating Mode: {summary['operating_mode']}")
    print(f"NXT Cost per Hour: {summary['energy_cost_per_hour_nxt']:.6f} NXT")
    
    # Analyze actual coupling
    print("\n" + "=" * 60)
    print("Coupling Analysis:")
    coupling = optimizer.analyze_coupling(10.0, 0.1, 0.2)
    print(f"Coupling Coefficient (k): {coupling.coupling_coefficient:.4f}")
    print(f"Efficiency: {coupling.efficiency * 100:.1f}%")
    print(f"Power Transmitted: {coupling.power_transmitted * 1000:.1f} mW")
    print(f"Power Received: {coupling.power_received * 1000:.1f} mW")
    print(f"Q-factor (TX): {coupling.q_factor_transmitter:.0f}")
    print(f"Q-factor (RX): {coupling.q_factor_receiver:.0f}")
