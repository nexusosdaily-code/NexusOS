"""
WNSP K1 Orchestration Runtime v1.0
===================================

MULTI-HARMONIC COORDINATION & UNIFIED TELEMETRY

This module implements the K1 Orchestration Runtime that coordinates:
1. OperationalSubstrate (Lambda-boson field dynamics)
2. CompleteSubstrate (NLSE physics with soliton propagation)

The runtime provides:
- Multi-harmonic coordination between substrates
- Unified telemetry dashboard with real-time metrics
- Cross-substrate feedback loops
- Emergent behavior monitoring
- Performance optimization through harmonic resonance

Core Principle:
Both substrates operate in parallel, with their harmonics locked
through shared coherence targets and synchronized evolution.

K-Level: 1.0 (Type I Complete Orchestration)

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import time
import hashlib
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable
from enum import Enum
from collections import deque
import numpy as np

PLANCK_CONSTANT = 6.62607015e-34
HBAR = PLANCK_CONSTANT / (2 * math.pi)
SPEED_OF_LIGHT = 299792458


class OrchestrationState(Enum):
    """States of the K1 orchestration runtime."""
    INITIALIZING = ("initializing", "Substrates being configured")
    SYNCHRONIZED = ("synchronized", "Harmonics locked, substrates synchronized")
    EVOLVING = ("evolving", "Active evolution with coordination")
    RESONANT = ("resonant", "High coherence resonant state")
    DEGRADED = ("degraded", "Coherence below threshold, recovery mode")
    HALTED = ("halted", "Runtime stopped")
    
    def __init__(self, state_id: str, description: str):
        self.state_id = state_id
        self.description = description


@dataclass
class HarmonicLock:
    """
    Represents a harmonic lock between two frequencies.
    
    When locked, the substrates evolve in phase with coupling
    strength determining how tightly they influence each other.
    """
    lock_id: str
    freq_1_hz: float
    freq_2_hz: float
    coupling_strength: float
    phase_offset: float = 0.0
    is_locked: bool = True
    lock_time: float = field(default_factory=time.time)
    
    @property
    def frequency_ratio(self) -> float:
        return self.freq_1_hz / self.freq_2_hz if self.freq_2_hz > 0 else 0.0
    
    @property
    def is_harmonic(self) -> bool:
        """Check if frequencies are in harmonic ratio (integer or simple fraction)."""
        ratio = self.frequency_ratio
        for n in range(1, 10):
            for m in range(1, 10):
                if abs(ratio - n/m) < 0.01:
                    return True
        return False
    
    @property
    def harmonic_quality(self) -> float:
        """Quality of the harmonic relationship (0-1)."""
        ratio = self.frequency_ratio
        best_match = 1.0
        for n in range(1, 10):
            for m in range(1, 10):
                diff = abs(ratio - n/m)
                if diff < best_match:
                    best_match = diff
        return max(0.0, 1.0 - best_match * 10)


@dataclass
class TelemetrySnapshot:
    """
    A unified telemetry snapshot from both substrates.
    """
    timestamp: float
    tick: int
    
    # Operational substrate metrics
    op_state: str
    op_coherence: float
    op_n_modes: int
    op_n_bosons: int
    op_total_energy: float
    op_lambda_mass: float
    
    # NLSE substrate metrics
    nlse_state: str
    nlse_load_ratio: float
    nlse_phase_ratio: float
    nlse_peak_power: float
    nlse_energy: float
    nlse_recursion_depth: int
    nlse_lambda_modes: int
    
    # Cross-substrate metrics
    harmonic_locks: int
    sync_quality: float
    resonance_strength: float
    orchestration_state: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "tick": self.tick,
            "operational": {
                "state": self.op_state,
                "coherence": self.op_coherence,
                "n_modes": self.op_n_modes,
                "n_bosons": self.op_n_bosons,
                "total_energy": self.op_total_energy,
                "lambda_mass": self.op_lambda_mass
            },
            "nlse": {
                "state": self.nlse_state,
                "load_ratio": self.nlse_load_ratio,
                "phase_ratio": self.nlse_phase_ratio,
                "peak_power": self.nlse_peak_power,
                "energy": self.nlse_energy,
                "recursion_depth": self.nlse_recursion_depth,
                "lambda_modes": self.nlse_lambda_modes
            },
            "orchestration": {
                "harmonic_locks": self.harmonic_locks,
                "sync_quality": self.sync_quality,
                "resonance_strength": self.resonance_strength,
                "state": self.orchestration_state
            }
        }


class CoherenceSynchronizer:
    """
    Synchronizes coherence between the two substrates.
    
    Uses a PID-like controller to maintain coherence parity,
    with adjustable coupling strength.
    """
    
    def __init__(self, target_coherence: float = 0.9):
        self.target_coherence = target_coherence
        self.kp = 0.5  # Proportional gain
        self.ki = 0.1  # Integral gain
        self.kd = 0.05  # Derivative gain
        
        self.error_integral = 0.0
        self.last_error = 0.0
        self.last_time = time.time()
        
    def compute_correction(self, op_coherence: float, nlse_load_ratio: float) -> Tuple[float, float]:
        """
        Compute correction signals for both substrates.
        
        Returns (op_correction, nlse_correction) as boost values.
        """
        # Convert NLSE load ratio to effective coherence (inverted)
        nlse_effective_coherence = 1.0 - nlse_load_ratio
        
        # Average coherence
        avg_coherence = (op_coherence + nlse_effective_coherence) / 2
        
        # Error from target
        error = self.target_coherence - avg_coherence
        
        # Time delta
        t_now = time.time()
        dt = t_now - self.last_time
        self.last_time = t_now
        
        # PID terms
        self.error_integral += error * dt
        self.error_integral = max(-1.0, min(1.0, self.error_integral))  # Anti-windup
        
        derivative = (error - self.last_error) / dt if dt > 0 else 0.0
        self.last_error = error
        
        # Correction signal
        correction = self.kp * error + self.ki * self.error_integral + self.kd * derivative
        
        # Split correction based on current states
        if op_coherence < nlse_effective_coherence:
            op_correction = correction * 0.7
            nlse_correction = correction * 0.3
        else:
            op_correction = correction * 0.3
            nlse_correction = correction * 0.7
            
        return (op_correction, nlse_correction)


class HarmonicCoordinator:
    """
    Coordinates harmonic relationships between substrate frequencies.
    
    Establishes and maintains phase locks between operational substrate
    modes and NLSE carrier frequency.
    """
    
    def __init__(self):
        self.locks: Dict[str, HarmonicLock] = {}
        self.lock_history: deque = deque(maxlen=100)
        
    def create_lock(self, freq_1_hz: float, freq_2_hz: float, 
                   coupling: float = 0.5) -> HarmonicLock:
        """Create a harmonic lock between two frequencies."""
        lock_id = hashlib.sha256(
            f"lock:{freq_1_hz}:{freq_2_hz}:{time.time()}".encode()
        ).hexdigest()[:12]
        
        lock = HarmonicLock(
            lock_id=lock_id,
            freq_1_hz=freq_1_hz,
            freq_2_hz=freq_2_hz,
            coupling_strength=coupling
        )
        
        self.locks[lock_id] = lock
        self.lock_history.append({
            "action": "created",
            "lock_id": lock_id,
            "time": time.time(),
            "is_harmonic": lock.is_harmonic
        })
        
        return lock
    
    def update_locks(self, op_modes: List[float], nlse_freq: float) -> int:
        """
        Update locks based on current mode frequencies.
        
        Returns number of active harmonic locks.
        """
        # Remove stale locks
        current_freqs = set(op_modes)
        stale = [lid for lid, lock in self.locks.items() 
                 if lock.freq_1_hz not in current_freqs]
        for lid in stale:
            del self.locks[lid]
            
        # Create new locks for unmatched modes
        for freq in op_modes:
            has_lock = any(lock.freq_1_hz == freq for lock in self.locks.values())
            if not has_lock:
                self.create_lock(freq, nlse_freq)
                
        return sum(1 for lock in self.locks.values() if lock.is_locked and lock.is_harmonic)
    
    def get_average_quality(self) -> float:
        """Get average harmonic quality across all locks."""
        if not self.locks:
            return 0.0
        return sum(lock.harmonic_quality for lock in self.locks.values()) / len(self.locks)
    
    def apply_phase_correction(self, lock_id: str, phase_delta: float):
        """Apply phase correction to a specific lock."""
        if lock_id in self.locks:
            self.locks[lock_id].phase_offset += phase_delta
            self.locks[lock_id].phase_offset %= (2 * math.pi)


class K1OrchestrationRuntime:
    """
    The K1 Orchestration Runtime - Master coordinator for WNSP substrates.
    
    Integrates:
    - OperationalSubstrate (Lambda-boson field dynamics)
    - CompleteSubstrate (NLSE soliton physics)
    
    Through:
    - Multi-harmonic coordination
    - Coherence synchronization
    - Unified telemetry
    - Cross-substrate feedback
    """
    
    VERSION = "1.0.0"
    
    def __init__(self, runtime_id: str = "k1_runtime"):
        self.runtime_id = runtime_id
        self.state = OrchestrationState.INITIALIZING
        
        # Substrates (lazy loaded)
        self._op_substrate = None
        self._nlse_substrate = None
        
        # Coordination components
        self.synchronizer = CoherenceSynchronizer(target_coherence=0.9)
        self.coordinator = HarmonicCoordinator()
        
        # Telemetry
        self.telemetry: deque = deque(maxlen=10000)
        self.tick = 0
        
        # Runtime control
        self.running = False
        self._evolution_thread: Optional[threading.Thread] = None
        
        # Metrics
        self.sync_quality = 0.0
        self.resonance_strength = 0.0
        
    @property
    def op_substrate(self):
        """Lazy load operational substrate."""
        if self._op_substrate is None:
            from wnsp_v7.operational_substrate import OperationalSubstrate
            self._op_substrate = OperationalSubstrate(f"{self.runtime_id}_op")
        return self._op_substrate
    
    @property
    def nlse_substrate(self):
        """Lazy load NLSE substrate."""
        if self._nlse_substrate is None:
            from wnsp_v7.nlse_substrate import CompleteSubstrate, SubstrateDesignKnobs
            # Configure NLSE substrate with default optical parameters
            knobs = SubstrateDesignKnobs(
                carrier_freq_hz=200e12,  # 200 THz optical
                amplitude=1.0,
                quality_factor=1e6,
                nonlinearity_gamma=1e-3,
                pulse_width_s=1e-12,
                dispersion_beta2=-20e-27
            )
            self._nlse_substrate = CompleteSubstrate(
                substrate_id=f"{self.runtime_id}_nlse",
                knobs=knobs
            )
        return self._nlse_substrate
    
    def initialize(self) -> Dict[str, Any]:
        """
        Initialize the orchestration runtime.
        
        Sets up both substrates and establishes initial harmonic locks.
        """
        # Initialize operational substrate with seed modes
        seed_frequencies = [5e14, 6e14, 7e14]  # Visible light frequencies
        for freq in seed_frequencies:
            self.op_substrate.field.add_mode(
                frequency_hz=freq,
                amplitude=1.0 + 0j,
                quantum_number=1
            )
        
        # Create initial harmonic locks
        nlse_freq = self.nlse_substrate.knobs.carrier_freq_hz
        for freq in seed_frequencies:
            self.coordinator.create_lock(freq, nlse_freq, coupling=0.5)
        
        self.state = OrchestrationState.SYNCHRONIZED
        
        return {
            "status": "initialized",
            "op_modes": len(self.op_substrate.field.modes),
            "nlse_state": self.nlse_substrate.get_status()["state"],
            "harmonic_locks": len(self.coordinator.locks),
            "state": self.state.state_id
        }
    
    def evolve_step(self, dt: float = 0.001) -> TelemetrySnapshot:
        """
        Execute one coordinated evolution step.
        
        1. Evolve both substrates
        2. Apply coherence synchronization
        3. Update harmonic locks
        4. Compute cross-substrate feedback
        5. Generate telemetry
        """
        self.tick += 1
        self.state = OrchestrationState.EVOLVING
        
        # Evolve operational substrate
        op_result = self.op_substrate.evolve_step(dt)
        
        # Evolve NLSE substrate (propagate through dispersion length)
        L_D = self.nlse_substrate.knobs.dispersion_length
        nlse_result = self.nlse_substrate.evolve(distance=L_D * dt * 1000, n_steps=10)
        
        # Get current states
        op_coherence = self.op_substrate.field.total_coherence
        nlse_status = self.nlse_substrate.get_status()
        nlse_load_ratio = nlse_status["diagram"]["load_ratio"]
        
        # Apply coherence synchronization
        op_correction, nlse_correction = self.synchronizer.compute_correction(
            op_coherence, nlse_load_ratio
        )
        
        # Apply corrections
        if op_correction > 0:
            self.op_substrate.field.amplify_coherence(min(op_correction, 0.1))
        if nlse_correction > 0:
            # For NLSE, adjust amplitude slightly
            current_amp = self.nlse_substrate.knobs.amplitude
            self.nlse_substrate.knobs.amplitude = current_amp * (1 + nlse_correction * 0.01)
        
        # Update harmonic locks
        op_freqs = [m.frequency_hz for m in self.op_substrate.field.modes.values()]
        harmonic_count = self.coordinator.update_locks(op_freqs, 
                                                        self.nlse_substrate.knobs.carrier_freq_hz)
        
        # Compute sync quality
        self.sync_quality = self._compute_sync_quality(op_coherence, nlse_load_ratio)
        
        # Compute resonance strength
        self.resonance_strength = self._compute_resonance_strength()
        
        # Update orchestration state
        self._update_orchestration_state()
        
        # Generate telemetry snapshot
        snapshot = TelemetrySnapshot(
            timestamp=time.time(),
            tick=self.tick,
            op_state=self.op_substrate.field.state.state_id,
            op_coherence=op_coherence,
            op_n_modes=len(self.op_substrate.field.modes),
            op_n_bosons=len(self.op_substrate.field.bosons),
            op_total_energy=sum(m.energy for m in self.op_substrate.field.modes.values()),
            op_lambda_mass=sum(b.current_mass for b in self.op_substrate.field.bosons.values()),
            nlse_state=nlse_status["state"],
            nlse_load_ratio=nlse_load_ratio,
            nlse_phase_ratio=nlse_status["diagram"]["phase_ratio"],
            nlse_peak_power=nlse_status["carrier"]["peak_power"],
            nlse_energy=nlse_status["carrier"]["energy"],
            nlse_recursion_depth=nlse_status["recursion"]["max_depth"],
            nlse_lambda_modes=nlse_status["lambda_modes_formed"],
            harmonic_locks=harmonic_count,
            sync_quality=self.sync_quality,
            resonance_strength=self.resonance_strength,
            orchestration_state=self.state.state_id
        )
        
        self.telemetry.append(snapshot)
        
        return snapshot
    
    def _compute_sync_quality(self, op_coherence: float, nlse_load_ratio: float) -> float:
        """Compute synchronization quality between substrates."""
        # Effective NLSE coherence (inverse of load)
        nlse_coherence = 1.0 - nlse_load_ratio
        
        # Sync quality based on coherence proximity
        coherence_diff = abs(op_coherence - nlse_coherence)
        coherence_sync = max(0.0, 1.0 - coherence_diff)
        
        # Harmonic quality contribution
        harmonic_quality = self.coordinator.get_average_quality()
        
        # Combined sync quality
        return 0.6 * coherence_sync + 0.4 * harmonic_quality
    
    def _compute_resonance_strength(self) -> float:
        """Compute resonance strength across substrates."""
        # Resonance strength based on:
        # 1. Number of harmonic locks
        # 2. Sync quality
        # 3. Combined coherence
        
        lock_factor = min(1.0, len(self.coordinator.locks) / 5)
        
        op_coh = self.op_substrate.field.total_coherence
        nlse_status = self.nlse_substrate.get_status()
        nlse_coh = 1.0 - nlse_status["diagram"]["load_ratio"]
        combined_coh = (op_coh + nlse_coh) / 2
        
        resonance = lock_factor * self.sync_quality * combined_coh
        
        # Boost if both are in high coherence states
        if op_coh > 0.8 and nlse_coh > 0.8:
            resonance *= 1.2
            
        return min(1.0, resonance)
    
    def _update_orchestration_state(self):
        """Update orchestration state based on current metrics."""
        if self.resonance_strength > 0.8:
            self.state = OrchestrationState.RESONANT
        elif self.sync_quality > 0.6:
            self.state = OrchestrationState.SYNCHRONIZED
        elif self.sync_quality > 0.3:
            self.state = OrchestrationState.EVOLVING
        else:
            self.state = OrchestrationState.DEGRADED
    
    def run_evolution(self, n_steps: int = 100, dt: float = 0.001) -> List[TelemetrySnapshot]:
        """Run multiple evolution steps and collect telemetry."""
        snapshots = []
        for _ in range(n_steps):
            snapshot = self.evolve_step(dt)
            snapshots.append(snapshot)
        return snapshots
    
    def start_background_evolution(self, dt: float = 0.001):
        """Start background evolution thread."""
        if self.running:
            return
            
        self.running = True
        
        def evolve_loop():
            while self.running:
                self.evolve_step(dt)
                time.sleep(dt)
                
        self._evolution_thread = threading.Thread(target=evolve_loop, daemon=True)
        self._evolution_thread.start()
    
    def stop_background_evolution(self):
        """Stop background evolution."""
        self.running = False
        if self._evolution_thread:
            self._evolution_thread.join(timeout=1.0)
        self.state = OrchestrationState.HALTED
    
    def get_status(self) -> Dict[str, Any]:
        """Get complete runtime status."""
        op_status = self.op_substrate.field.status()
        nlse_status = self.nlse_substrate.get_status()
        
        return {
            "version": self.VERSION,
            "runtime_id": self.runtime_id,
            "state": self.state.state_id,
            "state_description": self.state.description,
            "tick": self.tick,
            "operational_substrate": {
                "state": op_status["state"],
                "coherence": op_status["total_coherence"],
                "n_modes": op_status["n_modes"],
                "n_bosons": op_status["n_bosons"],
                "total_energy": op_status["total_energy"],
                "lambda_mass": op_status["total_lambda_mass"]
            },
            "nlse_substrate": {
                "version": nlse_status["version"],
                "state": nlse_status["state"],
                "load_ratio": nlse_status["diagram"]["load_ratio"],
                "phase_ratio": nlse_status["diagram"]["phase_ratio"],
                "soliton_order": nlse_status["knobs"]["soliton_order"],
                "is_stable": nlse_status["knobs"]["is_soliton_stable"],
                "lambda_modes": nlse_status["lambda_modes_formed"]
            },
            "coordination": {
                "harmonic_locks": len(self.coordinator.locks),
                "average_lock_quality": self.coordinator.get_average_quality(),
                "sync_quality": self.sync_quality,
                "resonance_strength": self.resonance_strength
            },
            "telemetry_entries": len(self.telemetry)
        }
    
    def get_telemetry_summary(self, last_n: int = 100) -> Dict[str, Any]:
        """Get summary of recent telemetry."""
        if not self.telemetry:
            return {"error": "No telemetry data"}
            
        recent = list(self.telemetry)[-last_n:]
        
        return {
            "entries": len(recent),
            "time_range": {
                "start": recent[0].timestamp,
                "end": recent[-1].timestamp
            },
            "averages": {
                "op_coherence": sum(t.op_coherence for t in recent) / len(recent),
                "nlse_load_ratio": sum(t.nlse_load_ratio for t in recent) / len(recent),
                "sync_quality": sum(t.sync_quality for t in recent) / len(recent),
                "resonance_strength": sum(t.resonance_strength for t in recent) / len(recent)
            },
            "peaks": {
                "max_op_coherence": max(t.op_coherence for t in recent),
                "max_resonance": max(t.resonance_strength for t in recent),
                "min_nlse_load": min(t.nlse_load_ratio for t in recent)
            },
            "state_distribution": self._compute_state_distribution(recent)
        }
    
    def _compute_state_distribution(self, snapshots: List[TelemetrySnapshot]) -> Dict[str, float]:
        """Compute distribution of orchestration states."""
        counts: Dict[str, int] = {}
        for s in snapshots:
            counts[s.orchestration_state] = counts.get(s.orchestration_state, 0) + 1
        total = len(snapshots)
        return {k: v/total for k, v in counts.items()}


def demo_k1_orchestration():
    """Demonstrate the K1 Orchestration Runtime."""
    print("=" * 70)
    print("WNSP K1 Orchestration Runtime v1.0 - DEMONSTRATION")
    print("=" * 70)
    print()
    
    # Create runtime
    print("1. Creating K1 Orchestration Runtime...")
    runtime = K1OrchestrationRuntime("demo_k1")
    
    # Initialize
    print("2. Initializing substrates and harmonic locks...")
    init_result = runtime.initialize()
    print(f"   Operational modes: {init_result['op_modes']}")
    print(f"   NLSE state: {init_result['nlse_state']}")
    print(f"   Harmonic locks: {init_result['harmonic_locks']}")
    print(f"   Runtime state: {init_result['state']}")
    print()
    
    # Run evolution
    print("3. Running coordinated evolution (100 steps)...")
    snapshots = runtime.run_evolution(n_steps=100, dt=0.001)
    print(f"   Collected {len(snapshots)} telemetry snapshots")
    
    # Get final status
    status = runtime.get_status()
    print()
    print("4. Final Runtime Status:")
    print(f"   State: {status['state']} - {status['state_description']}")
    print(f"   Tick: {status['tick']}")
    print()
    print("   Operational Substrate:")
    print(f"      Coherence: {status['operational_substrate']['coherence']:.4f}")
    print(f"      Modes: {status['operational_substrate']['n_modes']}")
    print(f"      Bosons: {status['operational_substrate']['n_bosons']}")
    print(f"      Lambda Mass: {status['operational_substrate']['lambda_mass']:.4e} kg")
    print()
    print("   NLSE Substrate:")
    print(f"      State: {status['nlse_substrate']['state']}")
    print(f"      Load Ratio: {status['nlse_substrate']['load_ratio']:.4f}")
    print(f"      Soliton Order: {status['nlse_substrate']['soliton_order']:.4f}")
    print(f"      Stable: {status['nlse_substrate']['is_stable']}")
    print()
    print("   Coordination:")
    print(f"      Harmonic Locks: {status['coordination']['harmonic_locks']}")
    print(f"      Lock Quality: {status['coordination']['average_lock_quality']:.4f}")
    print(f"      Sync Quality: {status['coordination']['sync_quality']:.4f}")
    print(f"      Resonance Strength: {status['coordination']['resonance_strength']:.4f}")
    print()
    
    # Telemetry summary
    summary = runtime.get_telemetry_summary(last_n=50)
    print("5. Telemetry Summary (last 50 steps):")
    print(f"   Average OP Coherence: {summary['averages']['op_coherence']:.4f}")
    print(f"   Average NLSE Load: {summary['averages']['nlse_load_ratio']:.4f}")
    print(f"   Average Sync Quality: {summary['averages']['sync_quality']:.4f}")
    print(f"   Average Resonance: {summary['averages']['resonance_strength']:.4f}")
    print()
    print("   State Distribution:")
    for state, fraction in summary['state_distribution'].items():
        print(f"      {state}: {fraction*100:.1f}%")
    print()
    
    # Final assessment
    print("=" * 70)
    print("K1 ORCHESTRATION RUNTIME OPERATIONAL")
    print("=" * 70)
    print()
    print("Components Status:")
    print(f"  [{'✓' if status['operational_substrate']['coherence'] > 0.5 else '✗'}] Operational Substrate: {'COHERENT' if status['operational_substrate']['coherence'] > 0.5 else 'DEGRADED'}")
    print(f"  [{'✓' if status['nlse_substrate']['is_stable'] else '✗'}] NLSE Substrate: {'STABLE' if status['nlse_substrate']['is_stable'] else 'UNSTABLE'}")
    print(f"  [{'✓' if status['coordination']['sync_quality'] > 0.5 else '✗'}] Harmonic Coordination: {'LOCKED' if status['coordination']['sync_quality'] > 0.5 else 'UNLOCKED'}")
    print(f"  [{'✓' if status['coordination']['resonance_strength'] > 0.3 else '✗'}] Resonance: {'ACTIVE' if status['coordination']['resonance_strength'] > 0.3 else 'WEAK'}")
    print()
    
    return runtime


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "background":
        # Run with background evolution
        print("Starting K1 Runtime with background evolution...")
        runtime = K1OrchestrationRuntime("bg_k1")
        runtime.initialize()
        runtime.start_background_evolution(dt=0.01)
        
        try:
            for i in range(10):
                time.sleep(1)
                status = runtime.get_status()
                print(f"[{i+1}s] State: {status['state']}, "
                      f"Sync: {status['coordination']['sync_quality']:.3f}, "
                      f"Resonance: {status['coordination']['resonance_strength']:.3f}")
        finally:
            runtime.stop_background_evolution()
            print("\nRuntime stopped.")
    else:
        # Run demo
        demo_k1_orchestration()
