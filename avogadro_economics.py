"""
Avogadro Economics Module
Bridge quantum mechanics to civilization-scale economics using statistical mechanics.

Physics Foundation:
- Avogadro's Number: N_A = 6.022×10²³ (molecules/mole)
- Boltzmann Constant: k_B = 1.381×10⁻²³ J/K
- Ideal Gas Law: PV = nRT (economic pressure × volume = moles × R × temperature)
- Statistical Mechanics: Maxwell-Boltzmann distributions, entropy, free energy

Integration:
- Individual quantum (Planck): E = hf per message
- Collective thermodynamic (Avogadro): N_A messages = 1 photon-mole
- Civilization statistics: Apply gas laws to economic flows

Purpose:
Replace arbitrary economic models with physics-grounded thermodynamic metrics.
Every transaction becomes a molecular event in the civilization's economic atmosphere.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

# Import existing physics constants
from wavelength_validator import SPEED_OF_LIGHT, PLANCK_CONSTANT

# Statistical Mechanics Constants (SI units)
AVOGADRO_NUMBER = 6.02214076e23  # molecules/mole (exact since 2019 SI redefinition)
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K (exact since 2019 SI redefinition)
IDEAL_GAS_CONSTANT = 8.314462618  # J/(mol·K) = k_B × N_A

# NexusOS Economic Constants
UNITS_PER_NXT = 100_000_000  # Bitcoin-style denomination
JOULES_PER_NXT = 1e-18  # Energy scale factor

# Reference wavelength for average message (green spectrum, 550nm)
REFERENCE_WAVELENGTH = 550e-9  # meters
REFERENCE_FREQUENCY = SPEED_OF_LIGHT / REFERENCE_WAVELENGTH  # Hz
REFERENCE_PHOTON_ENERGY = PLANCK_CONSTANT * REFERENCE_FREQUENCY  # Joules per photon


class EconomicPhase(Enum):
    """Economic states analogous to thermodynamic phases"""
    FROZEN = ("Frozen Economy", 0, 300, "No transactions, complete stagnation")
    SOLID = ("Solid Economy", 300, 800, "Low activity, rigid structures")
    LIQUID = ("Liquid Economy", 800, 2000, "Normal flow, healthy trading")
    GAS = ("Gas Economy", 2000, 5000, "High volatility, rapid expansion")
    PLASMA = ("Plasma Economy", 5000, float('inf'), "Extreme speculation, chaos")
    
    def __init__(self, display_name: str, min_temp: float, max_temp: float, description: str):
        self.display_name = display_name
        self.min_temp = min_temp
        self.max_temp = max_temp
        self.description = description
    
    @classmethod
    def from_temperature(cls, temperature_k: float) -> 'EconomicPhase':
        """Determine economic phase from temperature"""
        for phase in cls:
            if phase.min_temp <= temperature_k < phase.max_temp:
                return phase
        return cls.PLASMA


@dataclass
class MolarMetrics:
    """Molar-scale economic measurements"""
    total_messages: int
    photon_moles: float  # Total messages / N_A
    molar_energy_joules: float  # N_A × hf × photon_moles
    molar_energy_nxt: float  # Molar energy in NXT units
    average_photon_energy_j: float  # Average energy per message
    molar_mass_equivalent_kg: float  # E/c² molar mass
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            'total_messages': self.total_messages,
            'photon_moles': self.photon_moles,
            'molar_energy_joules': self.molar_energy_joules,
            'molar_energy_nxt': self.molar_energy_nxt,
            'average_photon_energy_j': self.average_photon_energy_j,
            'molar_mass_equivalent_kg': self.molar_mass_equivalent_kg,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class ThermodynamicState:
    """Complete thermodynamic description of economic system"""
    temperature_k: float  # Economic temperature (Kelvin)
    entropy_j_per_k: float  # Economic entropy (J/K)
    internal_energy_j: float  # Total system energy (Joules)
    free_energy_j: float  # Gibbs free energy (spontaneity metric)
    pressure_pa: float  # Economic pressure (transactions/volume)
    volume_m3: float  # Economic volume (abstract space)
    phase: EconomicPhase  # Current economic phase
    particle_count: int  # Total economic "particles" (transactions)
    moles: float  # Total moles of transactions
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            'temperature_k': self.temperature_k,
            'temperature_celsius': self.temperature_k - 273.15,
            'entropy_j_per_k': self.entropy_j_per_k,
            'internal_energy_j': self.internal_energy_j,
            'free_energy_j': self.free_energy_j,
            'pressure_pa': self.pressure_pa,
            'volume_m3': self.volume_m3,
            'phase': self.phase.display_name,
            'phase_description': self.phase.description,
            'particle_count': self.particle_count,
            'moles': self.moles,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class BoltzmannDistribution:
    """Maxwell-Boltzmann distribution for wealth/energy distribution"""
    energy_levels: np.ndarray  # Energy bins (Joules or NXT)
    probabilities: np.ndarray  # Probability at each energy level
    average_energy: float
    most_probable_energy: float
    temperature_k: float
    particle_count: int
    
    def wealth_percentiles(self, percentiles: List[float]) -> Dict[float, float]:
        """Calculate wealth at given percentiles"""
        cumulative = np.cumsum(self.probabilities)
        cumulative = cumulative / cumulative[-1]  # Normalize to 1.0
        
        results = {}
        for p in percentiles:
            idx = np.searchsorted(cumulative, p / 100.0)
            if idx < len(self.energy_levels):
                results[p] = self.energy_levels[idx]
            else:
                results[p] = self.energy_levels[-1]
        
        return results
    
    def gini_coefficient(self) -> float:
        """
        Calculate wealth inequality (0 = perfect equality, 1 = perfect inequality).
        Uses proper Lorenz curve construction from cumulative wealth distribution.
        """
        # Convert probability distribution to representative wealth samples
        # Sample particle_count individuals according to the distribution
        # This creates a population where wealth follows the Boltzmann distribution
        
        # Create wealth samples weighted by probability
        # Each energy level represents wealth of individuals at that level
        # Probability determines how many individuals have that wealth
        
        # Construct cumulative distribution
        total_prob = np.sum(self.probabilities)
        if total_prob == 0:
            return 0.0
        
        # Normalize probabilities to ensure they sum to 1
        normalized_probs = self.probabilities / total_prob
        
        # Create wealth array: repeat each energy level by its probability
        # Use particle_count to determine population size
        particles_per_level = (normalized_probs * self.particle_count).astype(int)
        
        # Construct actual wealth array
        wealth_array = []
        for energy, count in zip(self.energy_levels, particles_per_level):
            if count > 0:
                wealth_array.extend([energy] * count)
        
        if len(wealth_array) == 0:
            return 0.0
        
        wealth_array = np.array(wealth_array)
        
        # Sort wealth in ascending order
        sorted_wealth = np.sort(wealth_array)
        n = len(sorted_wealth)
        
        # Calculate cumulative wealth (Lorenz curve)
        cumulative_wealth = np.cumsum(sorted_wealth)
        total_wealth = cumulative_wealth[-1]
        
        if total_wealth == 0:
            return 0.0
        
        # Normalize to [0, 1]
        cumulative_wealth_normalized = cumulative_wealth / total_wealth
        
        # Calculate Gini coefficient from Lorenz curve
        # Gini = 1 - 2 × (area under Lorenz curve)
        # Area under Lorenz curve = integral from 0 to 1
        
        # Cumulative population proportion (x-axis)
        # Prepend (0, 0) origin point to Lorenz curve for correct integration
        cumulative_population = np.concatenate([[0], np.arange(1, n + 1) / n])
        cumulative_wealth_normalized = np.concatenate([[0], cumulative_wealth_normalized])
        
        # Area under Lorenz curve using trapezoidal rule
        # Perfect equality: area = 0.5, Gini = 0
        # Perfect inequality: area → 0, Gini → 1
        lorenz_area = float(np.trapz(cumulative_wealth_normalized, cumulative_population))
        
        # Gini coefficient: 1 - 2 × (area under Lorenz curve)
        gini = 1.0 - 2.0 * lorenz_area
        
        return max(0.0, min(1.0, gini))


class AvogadroEconomicsEngine:
    """
    Statistical mechanics engine for civilization-scale economics.
    Bridges quantum transactions (Planck) to macroscopic flows (Avogadro).
    """
    
    def __init__(self):
        """Initialize Avogadro economics engine"""
        self.history: List[ThermodynamicState] = []
        self.molar_history: List[MolarMetrics] = []
    
    def calculate_molar_metrics(
        self,
        total_messages: int,
        average_wavelength_nm: float = 550.0
    ) -> MolarMetrics:
        """
        Convert message count to molar metrics.
        
        Args:
            total_messages: Total number of messages processed
            average_wavelength_nm: Average wavelength in nanometers
            
        Returns:
            MolarMetrics with photon moles and energies
        """
        # Convert messages to photon moles
        photon_moles = total_messages / AVOGADRO_NUMBER
        
        # Calculate average photon energy
        wavelength_m = average_wavelength_nm * 1e-9
        frequency = SPEED_OF_LIGHT / wavelength_m
        photon_energy_j = PLANCK_CONSTANT * frequency
        
        # Molar energy (energy of N_A photons)
        molar_energy_j = photon_moles * AVOGADRO_NUMBER * photon_energy_j
        
        # Convert to NXT
        molar_energy_nxt = molar_energy_j / JOULES_PER_NXT
        
        # E=mc² equivalent molar mass
        c_squared = float(SPEED_OF_LIGHT) ** 2
        molar_mass_kg = molar_energy_j / c_squared
        
        metrics = MolarMetrics(
            total_messages=total_messages,
            photon_moles=photon_moles,
            molar_energy_joules=molar_energy_j,
            molar_energy_nxt=molar_energy_nxt,
            average_photon_energy_j=photon_energy_j,
            molar_mass_equivalent_kg=molar_mass_kg
        )
        
        self.molar_history.append(metrics)
        return metrics
    
    def calculate_economic_temperature(
        self,
        transaction_rate_per_second: float,
        base_temperature: float = 1000.0
    ) -> float:
        """
        Calculate economic temperature from transaction activity.
        Higher transaction rate = higher temperature (more kinetic energy).
        
        Args:
            transaction_rate_per_second: Messages/second
            base_temperature: Baseline temperature at 1 tx/s
            
        Returns:
            Temperature in Kelvin (always > 0)
        """
        # Minimum temperature to prevent absolute zero (system always has thermal energy)
        MIN_TEMPERATURE = 273.15  # 0°C = freezing point
        
        if transaction_rate_per_second <= 0:
            return MIN_TEMPERATURE
        
        # Use log1p(x) = ln(1+x) for numerical stability near zero
        # Add base to ensure temperature is always above minimum
        # T = MIN_TEMP + base × ln(1 + rate)
        temperature_k = MIN_TEMPERATURE + base_temperature * np.log1p(transaction_rate_per_second)
        
        return temperature_k
    
    def calculate_entropy(
        self,
        microstates: int,
        base_entropy: float = 1000.0
    ) -> float:
        """
        Calculate economic entropy using Boltzmann's formula: S = k_B × ln(Ω)
        
        Args:
            microstates: Number of possible economic configurations
            base_entropy: Scaling factor
            
        Returns:
            Entropy in J/K
        """
        if microstates <= 0:
            return 0.0
        
        # S = k_B × ln(Ω)
        entropy = BOLTZMANN_CONSTANT * np.log(microstates) * base_entropy
        
        return entropy
    
    def calculate_thermodynamic_state(
        self,
        transaction_rate: float,
        total_transactions: int,
        active_wallets: int,
        reserve_pool_nxt: float,
        trading_volume_nxt: float
    ) -> ThermodynamicState:
        """
        Calculate complete thermodynamic state of economic system.
        
        Args:
            transaction_rate: Transactions per second
            total_transactions: Total lifetime transactions
            active_wallets: Number of active participants
            reserve_pool_nxt: Total reserve pool size
            trading_volume_nxt: Daily trading volume
            
        Returns:
            ThermodynamicState with all metrics
        """
        # Economic temperature from activity
        temperature_k = self.calculate_economic_temperature(transaction_rate)
        
        # Microstates: possible configurations = (wallets × transactions)
        microstates = max(1, active_wallets * total_transactions)
        entropy = self.calculate_entropy(microstates)
        
        # Internal energy from reserves
        internal_energy_j = reserve_pool_nxt * JOULES_PER_NXT
        
        # Gibbs free energy: G = H - TS (lower G = more spontaneous)
        # Use trading volume as enthalpy proxy
        enthalpy = trading_volume_nxt * JOULES_PER_NXT
        free_energy_j = enthalpy - (temperature_k * entropy)
        
        # Economic pressure: transactions per volume
        # Volume = abstract economic space (wallet count)
        volume_m3 = max(1.0, float(active_wallets))
        pressure_pa = transaction_rate / volume_m3
        
        # Moles of transactions
        moles = total_transactions / AVOGADRO_NUMBER
        
        # Determine phase
        phase = EconomicPhase.from_temperature(temperature_k)
        
        state = ThermodynamicState(
            temperature_k=temperature_k,
            entropy_j_per_k=entropy,
            internal_energy_j=internal_energy_j,
            free_energy_j=free_energy_j,
            pressure_pa=pressure_pa,
            volume_m3=volume_m3,
            phase=phase,
            particle_count=total_transactions,
            moles=moles
        )
        
        self.history.append(state)
        return state
    
    def maxwell_boltzmann_distribution(
        self,
        temperature_k: float,
        particle_count: int = 1000,
        energy_range_nxt: Tuple[float, float] = (0.0, 1000.0)
    ) -> BoltzmannDistribution:
        """
        Generate Maxwell-Boltzmann distribution for wealth/energy.
        Models how energy (wealth) distributes among economic particles (wallets).
        
        Args:
            temperature_k: Economic temperature
            particle_count: Number of particles (wallets)
            energy_range_nxt: Min and max energy range
            
        Returns:
            BoltzmannDistribution with probabilities
        """
        # Create energy bins
        min_e, max_e = energy_range_nxt
        energy_levels = np.linspace(min_e, max_e, 100)
        
        # Convert to Joules for physics calculations
        energy_joules = energy_levels * JOULES_PER_NXT
        
        if temperature_k <= 0:
            # Zero temperature = all particles in ground state
            probabilities = np.zeros_like(energy_joules)
            probabilities[0] = 1.0
        else:
            # Maxwell-Boltzmann: P(E) ∝ √E × exp(-E / k_B T)
            # Using simplified version for economic analogy
            probabilities = np.sqrt(energy_joules) * np.exp(-energy_joules / (BOLTZMANN_CONSTANT * temperature_k))
            
            # Normalize
            if probabilities.sum() > 0:
                probabilities = probabilities / probabilities.sum()
            else:
                probabilities = np.ones_like(probabilities) / len(probabilities)
        
        # Calculate statistics
        average_energy = np.sum(energy_levels * probabilities)
        max_prob_idx = np.argmax(probabilities)
        most_probable_energy = energy_levels[max_prob_idx]
        
        return BoltzmannDistribution(
            energy_levels=energy_levels,
            probabilities=probabilities,
            average_energy=average_energy,
            most_probable_energy=most_probable_energy,
            temperature_k=temperature_k,
            particle_count=particle_count
        )
    
    def chemical_equilibrium_constant(
        self,
        burns_per_day: float,
        rewards_per_day: float,
        temperature_k: float
    ) -> Dict[str, Any]:
        """
        Apply chemical equilibrium to burn/reward balance.
        
        Reaction: Messages + Energy ⇌ Rewards + Reserve
        Equilibrium: K = [Products] / [Reactants]
        
        Args:
            burns_per_day: Token burns (consumption)
            rewards_per_day: Validator rewards (production)
            temperature_k: Economic temperature
            
        Returns:
            Dictionary with equilibrium metrics
        """
        # Avoid division by zero
        burns = max(0.001, burns_per_day)
        rewards = max(0.001, rewards_per_day)
        
        # Equilibrium constant K = [Rewards] / [Burns]
        K = rewards / burns
        
        # Van't Hoff equation: ln(K) = -ΔH/RT + ΔS/R
        # Estimate reaction enthalpy change
        if K > 1.0:
            # Forward reaction favored (more rewards than burns)
            delta_H = -1000.0  # Exothermic (releases energy)
            direction = "Forward (Rewards > Burns)"
        elif K < 1.0:
            # Reverse reaction favored (more burns than rewards)
            delta_H = 1000.0  # Endothermic (absorbs energy)
            direction = "Reverse (Burns > Rewards)"
        else:
            delta_H = 0.0
            direction = "Equilibrium (Burns = Rewards)"
        
        # Free energy change: ΔG = -RT ln(K)
        if temperature_k > 0:
            delta_G = -IDEAL_GAS_CONSTANT * temperature_k * np.log(max(1e-10, K))
        else:
            delta_G = 0.0
        
        # Le Chatelier prediction: How system responds to stress
        if K > 1.5:
            le_chatelier = "System will reduce rewards or increase burns to restore equilibrium"
        elif K < 0.67:
            le_chatelier = "System will increase rewards or reduce burns to restore equilibrium"
        else:
            le_chatelier = "System is near equilibrium, stable state"
        
        return {
            'equilibrium_constant_K': K,
            'delta_H_joules': delta_H,
            'delta_G_joules': delta_G,
            'direction': direction,
            'le_chatelier_prediction': le_chatelier,
            'spontaneous': delta_G < 0,
            'temperature_k': temperature_k
        }
    
    def ideal_gas_law_economics(
        self,
        pressure: float,
        volume: float,
        temperature_k: float
    ) -> Dict[str, Any]:
        """
        Apply ideal gas law to economics: PV = nRT
        
        P = Economic pressure (transaction density)
        V = Economic volume (market size / active wallets)
        n = Moles of transactions
        R = Ideal gas constant
        T = Economic temperature
        
        Args:
            pressure: Transaction rate per unit volume
            volume: Economic space (wallet count)
            temperature_k: Economic temperature
            
        Returns:
            Dictionary with gas law predictions
        """
        if temperature_k <= 0:
            return {
                'moles': 0.0,
                'particles': 0,
                'error': 'Temperature must be positive'
            }
        
        # PV = nRT → n = PV / RT
        moles = (pressure * volume) / (IDEAL_GAS_CONSTANT * temperature_k)
        
        # Convert moles to particles
        particles = int(moles * AVOGADRO_NUMBER)
        
        # Predict equilibrium values
        # If we fix n and T, what should P and V be?
        equilibrium_pressure = (moles * IDEAL_GAS_CONSTANT * temperature_k) / volume
        equilibrium_volume = (moles * IDEAL_GAS_CONSTANT * temperature_k) / pressure
        
        return {
            'moles': moles,
            'particles': particles,
            'current_pressure': pressure,
            'current_volume': volume,
            'current_temperature': temperature_k,
            'equilibrium_pressure_predicted': equilibrium_pressure,
            'equilibrium_volume_predicted': equilibrium_volume,
            'pressure_volume_product': pressure * volume,
            'nRT_product': moles * IDEAL_GAS_CONSTANT * temperature_k
        }
    
    def predict_phase_transition(
        self,
        current_temperature: float,
        temperature_rate_of_change: float
    ) -> Dict[str, Any]:
        """
        Predict economic phase transitions based on temperature trends.
        
        Args:
            current_temperature: Current economic temperature (K)
            temperature_rate_of_change: dT/dt (K per day)
            
        Returns:
            Phase transition prediction
        """
        current_phase = EconomicPhase.from_temperature(current_temperature)
        
        # Project temperature in 7 days
        future_temperature = current_temperature + (temperature_rate_of_change * 7)
        future_phase = EconomicPhase.from_temperature(future_temperature)
        
        # Detect phase transition
        transition_occurring = current_phase != future_phase
        
        # Critical temperatures (phase boundaries)
        critical_temps = {
            'FROZEN_to_SOLID': 300,
            'SOLID_to_LIQUID': 800,
            'LIQUID_to_GAS': 2000,
            'GAS_to_PLASMA': 5000
        }
        
        # Find nearest critical temperature
        nearest_critical = None
        nearest_distance = float('inf')
        
        for name, temp in critical_temps.items():
            distance = abs(current_temperature - temp)
            if distance < nearest_distance:
                nearest_distance = distance
                nearest_critical = (name, temp)
        
        return {
            'current_phase': current_phase.display_name,
            'current_temperature': current_temperature,
            'future_temperature_7d': future_temperature,
            'future_phase': future_phase.display_name,
            'transition_occurring': transition_occurring,
            'temperature_trend': 'heating' if temperature_rate_of_change > 0 else 'cooling',
            'rate_k_per_day': temperature_rate_of_change,
            'nearest_critical_point': nearest_critical[0] if nearest_critical else None,
            'distance_to_critical_k': nearest_distance,
            'days_to_critical': abs(nearest_distance / temperature_rate_of_change) if temperature_rate_of_change != 0 else float('inf')
        }


# Singleton instance
_engine = None

def get_avogadro_engine() -> AvogadroEconomicsEngine:
    """Get singleton Avogadro economics engine"""
    global _engine
    if _engine is None:
        _engine = AvogadroEconomicsEngine()
    return _engine
