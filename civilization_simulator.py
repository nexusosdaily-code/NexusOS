"""
Civilization Simulator - NexusOS Civilization OS
Multi-agent model with population dynamics, supply chains, civic behavior

Simulates the complete civilization using the Nexus differential equation:
dN/dt = αC + βD + γE - δEntropy + PID
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta

@dataclass
class CivilizationState:
    """Complete state of the civilization at a point in time"""
    time_days: int
    population: int
    nxt_supply: float
    bhls_floor_reserve: float
    recycling_liquidity: float
    contribution_index: float  # Average civic participation
    distribution_efficiency: float  # How well BHLS reaches citizens
    economic_growth_rate: float  # Percentage
    entropy: float  # Waste, friction, resource depletion
    stability_index: float  # Overall civilization health (0-1)
    
    def __repr__(self) -> str:
        return (f"CivState(t={self.time_days}d, pop={self.population:,}, "
                f"NXT={self.nxt_supply:,.0f}, stability={self.stability_index:.2f})")


class NexusEquationEngine:
    """
    Implements the Nexus differential equation for civilization metabolism:
    dN/dt = α·C + β·D + γ·E - δ·Entropy + PID
    """
    
    def __init__(self):
        # Equation coefficients (tunable parameters)
        self.alpha = 0.15  # Contribution weight
        self.beta = 0.25   # Distribution weight
        self.gamma = 0.10  # Economic expansion weight
        self.delta = 0.20  # Entropy penalty
        
        # PID controller for stability
        self.kp = 0.5  # Proportional gain
        self.ki = 0.1  # Integral gain
        self.kd = 0.2  # Derivative gain
        
        self.setpoint = 1.0  # Target stability
        self.integral_error = 0.0
        self.previous_error = 0.0
    
    def compute_derivative(self, C: float, D: float, E: float, entropy: float, 
                          stability: float, dt: float = 1.0) -> Tuple[float, float]:
        """
        Compute dN/dt and PID correction
        
        Returns: (dN/dt, PID_correction)
        """
        # PID controller
        error = self.setpoint - stability
        self.integral_error += error * dt
        derivative_error = (error - self.previous_error) / dt
        
        pid_correction = (
            self.kp * error +
            self.ki * self.integral_error +
            self.kd * derivative_error
        )
        
        self.previous_error = error
        
        # Nexus equation
        dN_dt = (
            self.alpha * C +
            self.beta * D +
            self.gamma * E -
            self.delta * entropy +
            pid_correction
        )
        
        return dN_dt, pid_correction
    
    def reset_pid(self):
        """Reset PID controller state"""
        self.integral_error = 0.0
        self.previous_error = 0.0


class CivilizationSimulator:
    """
    Simulates complete civilization dynamics over time
    """
    
    def __init__(self, initial_population: int = 10000, initial_nxt_supply: float = 1_000_000):
        self.initial_population = initial_population
        self.initial_nxt_supply = initial_nxt_supply
        
        # Nexus equation engine
        self.nexus_engine = NexusEquationEngine()
        
        # Simulation history
        self.history: List[CivilizationState] = []
        
        # Current state
        self.current_state = CivilizationState(
            time_days=0,
            population=initial_population,
            nxt_supply=initial_nxt_supply,
            bhls_floor_reserve=initial_nxt_supply * 0.30,  # 30% allocated to floor
            recycling_liquidity=100_000.0,
            contribution_index=0.70,  # 70% civic participation
            distribution_efficiency=0.85,  # 85% efficient distribution
            economic_growth_rate=2.5,  # 2.5% annual growth
            entropy=0.15,  # 15% entropy/waste
            stability_index=0.90  # 90% stable
        )
        
        self.history.append(self.current_state)
        
        # Behavior parameters
        self.population_growth_rate = 0.02  # 2% annual
        self.recycling_participation_rate = 0.60  # 60% recycle
        self.contribution_variance = 0.15  # Civic participation varies ±15%
    
    def simulate_day(self):
        """Simulate one day of civilization dynamics"""
        prev_state = self.current_state
        
        # Calculate factors for Nexus equation
        C = prev_state.contribution_index  # Contribution
        D = prev_state.distribution_efficiency  # Distribution
        E = prev_state.economic_growth_rate / 365  # Daily economic growth
        entropy = prev_state.entropy
        
        # Compute Nexus equation
        dN_dt, pid_correction = self.nexus_engine.compute_derivative(
            C, D, E, entropy, prev_state.stability_index, dt=1.0
        )
        
        # Update NXT supply based on Nexus equation
        new_nxt_supply = prev_state.nxt_supply * (1 + dN_dt / 100)
        
        # Population dynamics
        daily_pop_growth = self.population_growth_rate / 365
        new_population = int(prev_state.population * (1 + daily_pop_growth))
        
        # BHLS floor reserve (funded by messaging + recycling)
        daily_messaging_revenue = new_population * 0.5  # Avg 0.5 NXT per person/day
        daily_recycling_revenue = new_population * 0.2  # Avg 0.2 NXT per person/day
        daily_floor_cost = new_population * 3.75  # 1150 NXT/month ≈ 3.75/day
        
        new_floor_reserve = (
            prev_state.bhls_floor_reserve +
            daily_messaging_revenue +
            daily_recycling_revenue -
            daily_floor_cost
        )
        
        # Recycling liquidity
        new_recycling_liquidity = prev_state.recycling_liquidity + daily_recycling_revenue * 2
        
        # Contribution index (varies with noise)
        contribution_noise = np.random.normal(0, self.contribution_variance)
        new_contribution = np.clip(prev_state.contribution_index + contribution_noise, 0.3, 1.0)
        
        # Distribution efficiency (improves slowly over time)
        new_distribution = np.clip(prev_state.distribution_efficiency + 0.0001, 0.5, 1.0)
        
        # Economic growth (small random fluctuations)
        growth_noise = np.random.normal(0, 0.5)
        new_growth_rate = np.clip(prev_state.economic_growth_rate + growth_noise, -5, 10)
        
        # Entropy (decreases with recycling, increases with population)
        recycling_effect = -0.0001 * self.recycling_participation_rate
        population_effect = 0.00005 * (new_population / self.initial_population)
        new_entropy = np.clip(prev_state.entropy + recycling_effect + population_effect, 0.05, 0.50)
        
        # Stability index (composite of all factors)
        floor_stability = 1.0 if new_floor_reserve > 0 else 0.0
        economic_stability = np.clip(new_growth_rate / 10, 0, 1)
        entropy_stability = 1.0 - new_entropy
        
        new_stability = (
            0.40 * floor_stability +
            0.30 * new_contribution +
            0.20 * economic_stability +
            0.10 * entropy_stability
        )
        
        # Create new state
        new_state = CivilizationState(
            time_days=prev_state.time_days + 1,
            population=new_population,
            nxt_supply=new_nxt_supply,
            bhls_floor_reserve=new_floor_reserve,
            recycling_liquidity=new_recycling_liquidity,
            contribution_index=new_contribution,
            distribution_efficiency=new_distribution,
            economic_growth_rate=new_growth_rate,
            entropy=new_entropy,
            stability_index=new_stability
        )
        
        self.current_state = new_state
        self.history.append(new_state)
        
        return new_state
    
    def simulate_days(self, days: int, verbose: bool = False):
        """Simulate multiple days"""
        for day in range(days):
            state = self.simulate_day()
            
            if verbose and (day % 30 == 0):  # Print monthly updates
                print(f"Day {day:4d}: {state}")
        
        return self.current_state
    
    def simulate_years(self, years: int, verbose: bool = False):
        """Simulate multiple years"""
        return self.simulate_days(years * 365, verbose=verbose)
    
    def get_summary_stats(self) -> dict:
        """Get summary statistics from simulation"""
        if not self.history:
            return {}
        
        final_state = self.history[-1]
        initial_state = self.history[0]
        
        # Population metrics
        pop_growth = ((final_state.population - initial_state.population) / 
                     initial_state.population * 100)
        
        # Economic metrics
        nxt_change = ((final_state.nxt_supply - initial_state.nxt_supply) / 
                     initial_state.nxt_supply * 100)
        
        # Stability metrics
        avg_stability = np.mean([s.stability_index for s in self.history])
        min_stability = np.min([s.stability_index for s in self.history])
        
        # Floor metrics
        floor_sustainability_days = (
            final_state.bhls_floor_reserve / 
            (final_state.population * 3.75) if final_state.population > 0 else 0
        )
        
        return {
            "simulation_days": final_state.time_days,
            "initial_population": initial_state.population,
            "final_population": final_state.population,
            "population_growth_percent": pop_growth,
            "initial_nxt_supply": initial_state.nxt_supply,
            "final_nxt_supply": final_state.nxt_supply,
            "nxt_supply_change_percent": nxt_change,
            "final_floor_reserve": final_state.bhls_floor_reserve,
            "floor_sustainability_days": floor_sustainability_days,
            "final_stability_index": final_state.stability_index,
            "avg_stability_index": avg_stability,
            "min_stability_index": min_stability,
            "final_entropy": final_state.entropy,
            "final_contribution": final_state.contribution_index
        }


# Example usage
if __name__ == "__main__":
    print("=" * 70)
    print("CIVILIZATION SIMULATOR - NexusOS")
    print("=" * 70)
    
    # Create simulator
    sim = CivilizationSimulator(initial_population=10000, initial_nxt_supply=1_000_000)
    
    print(f"\nInitial State: {sim.current_state}")
    
    # Simulate 10 years
    print("\nSimulating 10 years of civilization dynamics...")
    print("Using Nexus Equation: dN/dt = αC + βD + γE - δEntropy + PID\n")
    
    final_state = sim.simulate_years(10, verbose=True)
    
    print(f"\nFinal State: {final_state}")
    
    # Get statistics
    stats = sim.get_summary_stats()
    
    print("\n" + "=" * 70)
    print("SIMULATION RESULTS")
    print("=" * 70)
    
    print(f"\nPOPULATION:")
    print(f"  Initial: {stats['initial_population']:,}")
    print(f"  Final:   {stats['final_population']:,}")
    print(f"  Growth:  {stats['population_growth_percent']:.1f}%")
    
    print(f"\nECONOMY:")
    print(f"  NXT Supply Change: {stats['nxt_supply_change_percent']:+.2f}%")
    print(f"  Final Supply:      {stats['final_nxt_supply']:,.0f} NXT")
    
    print(f"\nBHLS FLOOR:")
    print(f"  Reserve: {stats['final_floor_reserve']:,.0f} NXT")
    print(f"  Sustainability: {stats['floor_sustainability_days']:.0f} days")
    
    print(f"\nSTABILITY:")
    print(f"  Final:   {stats['final_stability_index']:.2%}")
    print(f"  Average: {stats['avg_stability_index']:.2%}")
    print(f"  Minimum: {stats['min_stability_index']:.2%}")
    
    print(f"\nSYSTEM HEALTH:")
    print(f"  Entropy:      {stats['final_entropy']:.2%}")
    print(f"  Contribution: {stats['final_contribution']:.2%}")
    
    print("\n" + "=" * 70)
    print("Civilization simulation complete!")
    print("=" * 70)
