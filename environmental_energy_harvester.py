"""
Environmental Energy Harvester - CONCEPT MODEL / SIMULATION
============================================================

⚠️ IMPORTANT: THIS IS A SIMULATION - NOT REAL HARDWARE ⚠️

This module is a THEORETICAL MODEL demonstrating the physics of environmental
energy harvesting. It SIMULATES data using random number generation to show
what measurements WOULD look like if you had the actual hardware.

NO REAL ENERGY IS BEING HARVESTED. NO HARDWARE IS CONNECTED.

Based on proven physics:
1. Schumann Resonance (7.83 Hz) - Earth's electromagnetic frequency
2. Cosmic Rays - High-energy particles from space
3. Geomagnetic Fields - Earth's magnetic field variations

Real implementation would require:
- ELF antenna for Schumann resonance (large loop/wire antenna)
- Geiger counter or scintillation detector for cosmic rays
- 3-axis magnetometer for geomagnetic field measurements
- Low-noise amplifiers and data acquisition systems

Physics Foundation (Real Science):
- Tesla's radiant energy patents (US685957, US787412)
- Schumann resonance (discovered 1952, measured continuously since)
- Cosmic ray flux (measured by particle detectors worldwide)
- Geomagnetic field variations (monitored by NOAA)

Current Status: CONCEPTUAL DEMONSTRATION ONLY
Future: Could interface with real sensors when hardware is available

Author: NexusOS Team
License: GPL v3
"""

import math
import time
import random
from datetime import datetime
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum


# Physical Constants
PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s
EARTH_RADIUS = 6371000  # meters
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K


class EnergySource(Enum):
    """Types of environmental energy sources"""
    SCHUMANN_RESONANCE = "schumann"
    COSMIC_RAYS = "cosmic"
    GEOMAGNETIC = "geomagnetic"
    ATMOSPHERIC = "atmospheric"


@dataclass
class EnergyReading:
    """Single energy measurement from environment"""
    source: EnergySource
    timestamp: float
    frequency: float  # Hz
    power_density: float  # W/m²
    voltage: float  # Volts (estimated)
    energy_joules: float  # Total energy captured
    location_lat: float
    location_lon: float
    quality_factor: float  # 0-1, measurement confidence


@dataclass
class HarvestingStats:
    """Cumulative energy harvesting statistics"""
    total_energy_harvested: float  # Joules
    average_power: float  # Watts
    peak_power: float  # Watts
    uptime_hours: float
    efficiency: float  # 0-1
    sources_active: List[str]


class SchumannResonanceMonitor:
    """
    Monitor Earth's Schumann Resonance (7.83 Hz fundamental frequency)
    
    The Schumann resonances are a set of spectrum peaks in the extremely 
    low frequency (ELF) portion of the Earth's electromagnetic field spectrum.
    
    Fundamental mode: 7.83 Hz
    Higher modes: 14.3, 20.8, 27.3, 33.8 Hz
    
    Power density: ~1-10 picowatts/m² (very small but measurable)
    """
    
    FUNDAMENTAL_FREQUENCY = 7.83  # Hz
    HIGHER_MODES = [14.3, 20.8, 27.3, 33.8]  # Hz
    
    def __init__(self):
        self.start_time = time.time()
        self.total_energy = 0.0
        
    def measure_resonance(self, lat: float = 0.0, lon: float = 0.0) -> EnergyReading:
        """
        Simulate Schumann resonance measurement
        
        Real implementation would use:
        - ELF antenna (large loop or long wire)
        - Low-noise amplifier
        - FFT analysis around 7.83 Hz
        """
        # Simulate daily variation (stronger at night)
        hour = datetime.utcnow().hour
        day_factor = 0.5 + 0.5 * math.cos(2 * math.pi * hour / 24)
        
        # Latitude dependency (stronger near equator)
        lat_factor = 0.7 + 0.3 * math.cos(math.radians(lat))
        
        # Base power density (picowatts/m²)
        base_power = 5e-12  # 5 pW/m²
        power_density = base_power * day_factor * lat_factor
        
        # Add random natural variation (±30%)
        variation = 1.0 + random.uniform(-0.3, 0.3)
        power_density *= variation
        
        # Estimate voltage for 1m² antenna
        # V = sqrt(P × Z) where Z = 377 ohms (free space impedance)
        voltage = math.sqrt(power_density * 377)
        
        # Energy captured per second (assuming 1m² collector)
        energy = power_density * 1.0  # Joules/second for 1m² area
        self.total_energy += energy
        
        return EnergyReading(
            source=EnergySource.SCHUMANN_RESONANCE,
            timestamp=time.time(),
            frequency=self.FUNDAMENTAL_FREQUENCY,
            power_density=power_density,
            voltage=voltage,
            energy_joules=energy,
            location_lat=lat,
            location_lon=lon,
            quality_factor=0.8 * day_factor * lat_factor
        )
    
    def calculate_photon_energy(self) -> float:
        """Calculate equivalent photon energy: E = hf"""
        return PLANCK_CONSTANT * self.FUNDAMENTAL_FREQUENCY


class CosmicRayDetector:
    """
    Detect and measure cosmic ray flux
    
    Cosmic rays are high-energy particles (mostly protons) from space.
    Flux at sea level: ~100-200 particles/m²/second
    Energy range: 1 GeV to 10^20 eV
    
    Could theoretically be harnessed for random number generation
    or low-power energy harvesting.
    """
    
    FLUX_SEA_LEVEL = 150  # particles/m²/second (average)
    AVERAGE_ENERGY = 3e9  # eV (3 GeV typical)
    EV_TO_JOULES = 1.60218e-19  # Conversion factor
    
    def __init__(self):
        self.total_particles = 0
        self.total_energy = 0.0
        
    def measure_cosmic_flux(self, altitude: float = 0.0, 
                           lat: float = 0.0, lon: float = 0.0) -> EnergyReading:
        """
        Simulate cosmic ray detection
        
        Real implementation would use:
        - Geiger counter or scintillation detector
        - Coincidence detection (multiple detectors)
        - Energy spectrum analysis
        """
        # Altitude dependency (flux doubles every ~1500m)
        altitude_factor = math.exp(altitude / 1500)
        
        # Geomagnetic latitude effect (higher at poles)
        geomag_lat = abs(lat)
        lat_factor = 0.7 + 0.3 * (geomag_lat / 90)
        
        # Particles per second for 1m² detector
        flux = self.FLUX_SEA_LEVEL * altitude_factor * lat_factor
        
        # Add random variation (Poisson statistics)
        flux *= random.uniform(0.8, 1.2)
        
        # Total energy deposited (assuming 10% capture efficiency)
        particles_detected = flux * 1.0  # per second
        energy_per_particle = self.AVERAGE_ENERGY * self.EV_TO_JOULES
        total_energy = particles_detected * energy_per_particle * 0.1
        
        # Power density
        power_density = total_energy / 1.0  # W/m²
        
        # Equivalent voltage (for 1m² detector with 1 ohm impedance)
        voltage = math.sqrt(power_density * 1.0)
        
        # Frequency: use average particle rate
        frequency = flux
        
        self.total_particles += particles_detected
        self.total_energy += total_energy
        
        return EnergyReading(
            source=EnergySource.COSMIC_RAYS,
            timestamp=time.time(),
            frequency=frequency,
            power_density=power_density,
            voltage=voltage,
            energy_joules=total_energy,
            location_lat=lat,
            location_lon=lon,
            quality_factor=0.9 * altitude_factor * lat_factor
        )


class GeomagneticFieldMonitor:
    """
    Monitor Earth's magnetic field variations for energy harvesting
    
    Earth's magnetic field: ~25-65 μT (microtesla)
    Variations: diurnal (solar), storms, micropulsations
    
    Energy can be extracted from field variations using induction coils.
    Tesla explored this extensively in his Colorado Springs experiments.
    """
    
    EARTH_FIELD_AVERAGE = 50e-6  # Tesla (50 μT)
    
    def __init__(self):
        self.total_energy = 0.0
        self.baseline_field = self.EARTH_FIELD_AVERAGE
        
    def measure_geomagnetic(self, lat: float = 0.0, lon: float = 0.0) -> EnergyReading:
        """
        Simulate geomagnetic field measurement and energy extraction
        
        Real implementation would use:
        - 3-axis magnetometer
        - Large induction coil (many turns)
        - Low-frequency AC coupling
        """
        # Latitude dependency (stronger at poles)
        lat_factor = 0.8 + 0.2 * (abs(lat) / 90)
        field_strength = self.EARTH_FIELD_AVERAGE * lat_factor
        
        # Diurnal variation (solar influence)
        hour = datetime.utcnow().hour
        diurnal = 1.0 + 0.05 * math.sin(2 * math.pi * hour / 24)
        field_strength *= diurnal
        
        # Random micropulsations (0.001-10 Hz)
        micropulsation = random.uniform(0.95, 1.05)
        field_strength *= micropulsation
        
        # Field variation rate (dB/dt determines induced voltage)
        # Typical variation: ~10 nT/second during quiet times
        variation_rate = 10e-9  # T/s
        
        # Induced voltage in 1m² coil with 1000 turns
        # V = -N × A × (dB/dt)
        turns = 1000
        area = 1.0  # m²
        induced_voltage = turns * area * variation_rate
        
        # Power extraction (assuming 1 ohm coil resistance)
        power = induced_voltage ** 2 / 1.0
        
        # Power density
        power_density = power / area
        
        # Frequency: micropulsations around 0.01-1 Hz
        frequency = random.uniform(0.01, 1.0)
        
        # Energy per second
        energy = power * 1.0
        self.total_energy += energy
        
        return EnergyReading(
            source=EnergySource.GEOMAGNETIC,
            timestamp=time.time(),
            frequency=frequency,
            power_density=power_density,
            voltage=induced_voltage,
            energy_joules=energy,
            location_lat=lat,
            location_lon=lon,
            quality_factor=0.85 * lat_factor * diurnal
        )


class EnvironmentalEnergyHarvester:
    """
    Main environmental energy harvesting system
    
    Combines multiple ambient energy sources:
    1. Schumann resonance (7.83 Hz Earth frequency)
    2. Cosmic rays (space particles)
    3. Geomagnetic field variations
    
    Suitable for powering ultra-low-power mesh network nodes.
    """
    
    def __init__(self, lat: float = 0.0, lon: float = 0.0, altitude: float = 0.0):
        self.location_lat = lat
        self.location_lon = lon
        self.altitude = altitude
        
        # Initialize monitors
        self.schumann = SchumannResonanceMonitor()
        self.cosmic = CosmicRayDetector()
        self.geomagnetic = GeomagneticFieldMonitor()
        
        # Statistics
        self.start_time = time.time()
        self.readings_history: List[EnergyReading] = []
        self.total_energy_harvested = 0.0
        
    def harvest_all_sources(self) -> List[EnergyReading]:
        """Harvest energy from all available sources"""
        readings = []
        
        # Schumann resonance
        schumann_reading = self.schumann.measure_resonance(
            self.location_lat, self.location_lon
        )
        readings.append(schumann_reading)
        
        # Cosmic rays
        cosmic_reading = self.cosmic.measure_cosmic_flux(
            self.altitude, self.location_lat, self.location_lon
        )
        readings.append(cosmic_reading)
        
        # Geomagnetic field
        geomag_reading = self.geomagnetic.measure_geomagnetic(
            self.location_lat, self.location_lon
        )
        readings.append(geomag_reading)
        
        # Update totals
        for reading in readings:
            self.total_energy_harvested += reading.energy_joules
            self.readings_history.append(reading)
        
        # Keep only last 1000 readings
        if len(self.readings_history) > 1000:
            self.readings_history = self.readings_history[-1000:]
        
        return readings
    
    def get_total_power(self) -> float:
        """Calculate total instantaneous power from all sources (Watts)"""
        if not self.readings_history:
            return 0.0
        
        # Get most recent reading from each source
        recent_readings = self.readings_history[-3:]
        total_power = sum(r.power_density for r in recent_readings)
        return total_power
    
    def get_harvesting_stats(self) -> HarvestingStats:
        """Get comprehensive harvesting statistics"""
        uptime = (time.time() - self.start_time) / 3600  # hours
        average_power = self.total_energy_harvested / (uptime * 3600) if uptime > 0 else 0.0
        
        # Peak power from history
        peak_power = max(
            (r.power_density for r in self.readings_history),
            default=0.0
        )
        
        # Active sources
        sources: List[str] = list(set(r.source.value for r in self.readings_history[-10:]))
        
        # Efficiency (comparing to theoretical maximum)
        theoretical_max = 1e-9  # 1 nW/m² theoretical maximum
        efficiency = min(average_power / theoretical_max, 1.0) if theoretical_max > 0 else 0.0
        
        return HarvestingStats(
            total_energy_harvested=self.total_energy_harvested,
            average_power=average_power,
            peak_power=peak_power,
            uptime_hours=uptime,
            efficiency=efficiency,
            sources_active=sources
        )
    
    def calculate_nxt_equivalent(self, energy_joules: float) -> float:
        """
        Convert harvested energy to NXT token equivalent
        
        Using E=hf relationship:
        1 NXT = energy of green light photon (500 nm)
        """
        green_frequency = SPEED_OF_LIGHT / 500e-9
        photon_energy = PLANCK_CONSTANT * green_frequency
        
        # NXT tokens equivalent
        nxt_tokens = energy_joules / photon_energy
        return nxt_tokens / 1e8  # Convert to NXT (1 NXT = 100,000,000 units)
    
    def can_power_mesh_node(self) -> Tuple[bool, float]:
        """
        Check if harvested power can sustain a mesh network node
        
        Returns: (can_power, power_percentage)
        
        Ultra-low-power mesh node requirements:
        - Sleep mode: 1 μW
        - Active receive: 10 mW
        - Active transmit: 50 mW
        - Average (mostly sleep): ~100 μW
        """
        node_power_requirement = 100e-6  # 100 μW average
        current_power = self.get_total_power()
        
        percentage = (current_power / node_power_requirement) * 100
        can_power = current_power >= node_power_requirement
        
        return can_power, percentage
    
    def get_energy_summary(self) -> Dict:
        """Get comprehensive energy summary"""
        stats = self.get_harvesting_stats()
        can_power, power_pct = self.can_power_mesh_node()
        
        return {
            'total_energy_joules': self.total_energy_harvested,
            'total_energy_nxt': self.calculate_nxt_equivalent(self.total_energy_harvested),
            'current_power_watts': self.get_total_power(),
            'average_power_watts': stats.average_power,
            'peak_power_watts': stats.peak_power,
            'uptime_hours': stats.uptime_hours,
            'efficiency_percent': stats.efficiency * 100,
            'sources_active': stats.sources_active,
            'can_power_mesh_node': can_power,
            'mesh_node_power_percent': power_pct,
            'location': {
                'latitude': self.location_lat,
                'longitude': self.location_lon,
                'altitude_m': self.altitude
            }
        }


# Demonstration
if __name__ == "__main__":
    print("Environmental Energy Harvester - Tesla-Inspired System")
    print("=" * 60)
    
    # Create harvester at specific location
    harvester = EnvironmentalEnergyHarvester(
        lat=40.7128,  # New York City
        lon=-74.0060,
        altitude=10.0  # meters
    )
    
    print(f"\nLocation: {harvester.location_lat}°N, {harvester.location_lon}°E")
    print(f"Altitude: {harvester.altitude}m\n")
    
    # Simulate 10 seconds of harvesting
    for i in range(10):
        readings = harvester.harvest_all_sources()
        
        print(f"Second {i+1}:")
        for reading in readings:
            print(f"  {reading.source.value:12s}: {reading.power_density*1e12:.2f} pW/m² "
                  f"({reading.voltage*1e6:.2f} μV) @ {reading.frequency:.2f} Hz")
        
        time.sleep(1)
    
    # Final summary
    print("\n" + "=" * 60)
    summary = harvester.get_energy_summary()
    print(f"Total Energy Harvested: {summary['total_energy_joules']*1e12:.2f} pJ")
    print(f"NXT Equivalent: {summary['total_energy_nxt']:.2e} NXT")
    print(f"Average Power: {summary['average_power_watts']*1e12:.2f} pW")
    print(f"Can Power Mesh Node: {summary['can_power_mesh_node']} "
          f"({summary['mesh_node_power_percent']:.2f}% of required)")
    print(f"Active Sources: {', '.join(summary['sources_active'])}")
