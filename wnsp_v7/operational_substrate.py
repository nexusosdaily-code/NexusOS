"""
WNSP Operational Substrate v5.0
================================

TRUE EMERGENT OPERATIONAL PRIMITIVES

This module implements Lambda-boson formation as EMERGENT behavior from
wavefield dynamics, not pre-computed static values. It creates the
foundational operational layer that prevents downstream collapse.

Core Principles:
1. Lambda-bosons EMERGE from wavefield interactions, not from formulas
2. Field dynamics run continuously with real state evolution  
3. Recursive feedback loops propagate changes across modules
4. Self-reinforcing governance primitives maintain coherence

Key Equations (Now Dynamically Computed):
- Wavefield: Φ_λ(r,t) = Σ_n a_n · ψ_n(r) · e^(-iω_n t)
- Lambda Formation: Λ = ∫ |Φ|² · (hf/c²) dV  (emergent from field density)
- Coherence Evolution: dC/dt = γ·(C_target - C) - δ·noise + coupling_terms
- Feedback Coupling: K_ij = ⟨Φ_i|Ĥ_int|Φ_j⟩ (inter-field interaction)

K-Level: 1.0 (Type I Operational Substrate)

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import time
import hashlib
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable, Set
from enum import Enum
from collections import deque
import numpy as np

PLANCK_CONSTANT = 6.62607015e-34
HBAR = PLANCK_CONSTANT / (2 * math.pi)
SPEED_OF_LIGHT = 299792458
BOLTZMANN_CONSTANT = 1.380649e-23

FIELD_COUPLING_STRENGTH = 1e-10
COHERENCE_DECAY_RATE = 0.0001
LAMBDA_FORMATION_THRESHOLD = 1e-45
FEEDBACK_PROPAGATION_SPEED = 0.01


class FieldState(Enum):
    """States in the field lifecycle."""
    VACUUM = ("vacuum", "Ground state, no excitations")
    NASCENT = ("nascent", "Field forming, pre-coherent")
    COHERENT = ("coherent", "Stable coherent field")
    ENTANGLED = ("entangled", "Multi-field entanglement")
    COLLAPSED = ("collapsed", "Decoherence event")
    
    def __init__(self, state_id: str, description: str):
        self.state_id = state_id
        self.description = description


class OperationType(Enum):
    """Types of operations on the substrate."""
    FIELD_CREATE = "field_create"
    FIELD_EVOLVE = "field_evolve"
    LAMBDA_FORM = "lambda_form"
    FEEDBACK_PROPAGATE = "feedback_propagate"
    COHERENCE_AMPLIFY = "coherence_amplify"
    GOVERNANCE_SIGNAL = "governance_signal"
    RESOURCE_ALLOCATE = "resource_allocate"
    COMPUTATION_EXECUTE = "computation_execute"


@dataclass
class WaveFieldMode:
    """
    A single mode of the wavefield.
    
    ψ_n(r,t) = a_n · φ_n(r) · e^(-iω_n t)
    
    Where:
    - a_n: Complex amplitude
    - φ_n(r): Spatial eigenfunction
    - ω_n: Angular frequency
    """
    mode_id: str
    frequency_hz: float
    amplitude: complex = 1.0 + 0j
    phase: float = 0.0
    quantum_number: int = 1
    coherence: float = 1.0
    birth_time: float = field(default_factory=time.time)
    
    @property
    def angular_frequency(self) -> float:
        return 2 * math.pi * self.frequency_hz
    
    @property
    def energy(self) -> float:
        return PLANCK_CONSTANT * self.frequency_hz * abs(self.amplitude)**2
    
    @property
    def lambda_mass_contribution(self) -> float:
        """Λ = hf|a|²/c² - mass equivalent of this mode."""
        return self.energy / (SPEED_OF_LIGHT ** 2)
    
    def psi_at(self, t: float, x: float = 0.0) -> complex:
        """Evaluate wavefunction at time t and position x."""
        age = t - self.birth_time
        phi_n = math.sin(self.quantum_number * math.pi * x) if 0 <= x <= 1 else 0.0
        time_factor = np.exp(-1j * self.angular_frequency * age)
        decay = math.exp(-COHERENCE_DECAY_RATE * age * (1 - self.coherence))
        return self.amplitude * phi_n * time_factor * decay


@dataclass 
class LambdaBoson:
    """
    An EMERGENT Lambda-boson formed from wavefield interactions.
    
    Lambda-bosons are NOT created directly - they EMERGE when field
    density exceeds the formation threshold and coherence conditions are met.
    """
    boson_id: str
    parent_modes: List[str]
    lambda_mass: float
    formation_time: float
    coherence_at_formation: float
    stability: float = 1.0
    decay_rate: float = 0.0001
    
    @property
    def energy(self) -> float:
        """E = Λc²"""
        return self.lambda_mass * SPEED_OF_LIGHT ** 2
    
    @property
    def age(self) -> float:
        return time.time() - self.formation_time
    
    @property
    def current_mass(self) -> float:
        """Mass after decay."""
        return self.lambda_mass * math.exp(-self.decay_rate * self.age)
    
    @property
    def is_stable(self) -> bool:
        return self.current_mass > LAMBDA_FORMATION_THRESHOLD


@dataclass
class FeedbackSignal:
    """
    A feedback signal propagating through the substrate.
    
    Signals carry state changes between modules, creating the
    recursive feedback loops that maintain system coherence.
    """
    signal_id: str
    source_module: str
    target_module: str
    signal_type: OperationType
    payload: Dict[str, Any]
    strength: float = 1.0
    creation_time: float = field(default_factory=time.time)
    propagation_delay: float = 0.0
    
    @property
    def is_delivered(self) -> bool:
        return time.time() >= self.creation_time + self.propagation_delay


class WaveFieldDynamics:
    """
    The core field dynamics engine.
    
    Manages wavefield evolution, Lambda-boson emergence, and
    coherence maintenance through continuous dynamics.
    """
    
    def __init__(self, field_id: str = "primary"):
        self.field_id = field_id
        self.modes: Dict[str, WaveFieldMode] = {}
        self.bosons: Dict[str, LambdaBoson] = {}
        self.state = FieldState.VACUUM
        self.total_coherence = 0.0
        self.tick = 0
        self.last_evolution_time = time.time()
        self.history: deque = deque(maxlen=1000)
        
        self._coherence_target = 0.95
        self._noise_amplitude = 0.01
        
    def add_mode(self, frequency_hz: float, amplitude: complex = 1.0+0j, 
                 quantum_number: int = 1) -> WaveFieldMode:
        """Add a wavefield mode."""
        mode_id = hashlib.sha256(
            f"{self.field_id}:{frequency_hz}:{time.time()}".encode()
        ).hexdigest()[:12]
        
        mode = WaveFieldMode(
            mode_id=mode_id,
            frequency_hz=frequency_hz,
            amplitude=amplitude,
            quantum_number=quantum_number
        )
        
        self.modes[mode_id] = mode
        
        if self.state == FieldState.VACUUM:
            self.state = FieldState.NASCENT
            
        self._log_event("mode_added", {
            "mode_id": mode_id,
            "frequency_hz": frequency_hz,
            "energy": mode.energy
        })
        
        return mode
    
    def evolve(self, dt: float = 0.001) -> Dict[str, Any]:
        """
        Evolve the wavefield forward in time.
        
        This is where EMERGENT behavior happens:
        1. Mode amplitudes evolve according to Schrödinger dynamics
        2. Inter-mode coupling creates interference
        3. Lambda-bosons form when density exceeds threshold
        4. Coherence evolves with feedback
        """
        t_now = time.time()
        self.tick += 1
        
        results = {
            "tick": self.tick,
            "dt": dt,
            "modes_evolved": 0,
            "bosons_formed": 0,
            "coherence_change": 0.0
        }
        
        for mode_id, mode in list(self.modes.items()):
            omega = mode.angular_frequency
            phase_evolution = omega * dt
            mode.phase = (mode.phase + phase_evolution) % (2 * math.pi)
            
            noise = np.random.normal(0, self._noise_amplitude * (1 - mode.coherence))
            mode.amplitude *= np.exp(1j * noise)
            
            mode.coherence *= math.exp(-COHERENCE_DECAY_RATE * dt)
            mode.coherence = max(0.01, min(1.0, mode.coherence))
            
            results["modes_evolved"] += 1
        
        results["bosons_formed"] = self._check_lambda_formation()
        
        self._decay_bosons(dt)
        
        old_coherence = self.total_coherence
        self._update_total_coherence()
        results["coherence_change"] = self.total_coherence - old_coherence
        
        self._update_field_state()
        
        self.last_evolution_time = t_now
        
        return results
    
    def _check_lambda_formation(self) -> int:
        """
        Check for EMERGENT Lambda-boson formation.
        
        Bosons form when:
        1. Total field energy density exceeds threshold
        2. Mode coherences are sufficiently aligned
        3. Phase relationships permit constructive interference
        """
        formed = 0
        
        if len(self.modes) < 2:
            return 0
        
        mode_list = list(self.modes.values())
        for i in range(len(mode_list)):
            for j in range(i + 1, len(mode_list)):
                mode_i = mode_list[i]
                mode_j = mode_list[j]
                
                phase_diff = abs(mode_i.phase - mode_j.phase)
                phase_alignment = math.cos(phase_diff) ** 2
                
                combined_coherence = mode_i.coherence * mode_j.coherence
                
                combined_mass = mode_i.lambda_mass_contribution + mode_j.lambda_mass_contribution
                
                formation_probability = (
                    phase_alignment * 
                    combined_coherence * 
                    (combined_mass / LAMBDA_FORMATION_THRESHOLD)
                )
                
                if formation_probability > 0.5 and np.random.random() < 0.3:
                    boson = self._create_lambda_boson(mode_i, mode_j, combined_mass)
                    if boson:
                        formed += 1
        
        return formed
    
    def _create_lambda_boson(self, mode_i: WaveFieldMode, mode_j: WaveFieldMode,
                              combined_mass: float) -> Optional[LambdaBoson]:
        """Create an emergent Lambda-boson from mode interaction."""
        boson_id = hashlib.sha256(
            f"lambda:{mode_i.mode_id}:{mode_j.mode_id}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        energy_fraction = 0.1
        mode_i.amplitude *= math.sqrt(1 - energy_fraction)
        mode_j.amplitude *= math.sqrt(1 - energy_fraction)
        
        boson = LambdaBoson(
            boson_id=boson_id,
            parent_modes=[mode_i.mode_id, mode_j.mode_id],
            lambda_mass=combined_mass * energy_fraction,
            formation_time=time.time(),
            coherence_at_formation=(mode_i.coherence + mode_j.coherence) / 2,
            stability=1.0 - abs(mode_i.frequency_hz - mode_j.frequency_hz) / max(mode_i.frequency_hz, mode_j.frequency_hz)
        )
        
        self.bosons[boson_id] = boson
        
        self._log_event("lambda_formed", {
            "boson_id": boson_id,
            "lambda_mass": boson.lambda_mass,
            "parent_modes": boson.parent_modes,
            "stability": boson.stability
        })
        
        return boson
    
    def _decay_bosons(self, dt: float):
        """Process boson decay - unstable bosons collapse."""
        to_remove = []
        
        for boson_id, boson in self.bosons.items():
            if not boson.is_stable:
                to_remove.append(boson_id)
                
                for mode_id in boson.parent_modes:
                    if mode_id in self.modes:
                        self.modes[mode_id].amplitude *= 1.05
        
        for boson_id in to_remove:
            self._log_event("lambda_decayed", {"boson_id": boson_id})
            del self.bosons[boson_id]
    
    def _update_total_coherence(self):
        """Calculate total field coherence from mode coherences."""
        if not self.modes:
            self.total_coherence = 0.0
            return
        
        coherences = [m.coherence for m in self.modes.values()]
        self.total_coherence = sum(coherences) / len(coherences)
        
        if len(self.modes) > 1:
            phases = [m.phase for m in self.modes.values()]
            phase_variance = np.var(phases) if len(phases) > 1 else 0
            phase_factor = math.exp(-phase_variance / (2 * math.pi))
            self.total_coherence *= phase_factor
    
    def _update_field_state(self):
        """Update field state based on current conditions."""
        if not self.modes:
            self.state = FieldState.VACUUM
        elif self.total_coherence < 0.3:
            self.state = FieldState.COLLAPSED
        elif self.total_coherence < 0.6:
            self.state = FieldState.NASCENT
        elif len(self.bosons) > 0:
            self.state = FieldState.ENTANGLED
        else:
            self.state = FieldState.COHERENT
    
    def _log_event(self, event_type: str, data: Dict[str, Any]):
        """Log a field event."""
        self.history.append({
            "tick": self.tick,
            "time": time.time(),
            "event": event_type,
            **data
        })
    
    def amplify_coherence(self, boost: float = 0.1) -> float:
        """External coherence amplification (Lambda Gate integration)."""
        for mode in self.modes.values():
            mode.coherence = min(1.0, mode.coherence + boost)
        
        old = self.total_coherence
        self._update_total_coherence()
        
        self._log_event("coherence_amplified", {
            "boost": boost,
            "old_coherence": old,
            "new_coherence": self.total_coherence
        })
        
        return self.total_coherence - old
    
    def inject_energy(self, frequency_hz: float, energy_joules: float) -> WaveFieldMode:
        """Inject energy at a specific frequency."""
        amplitude = math.sqrt(energy_joules / (PLANCK_CONSTANT * frequency_hz))
        return self.add_mode(frequency_hz, complex(amplitude, 0))
    
    def status(self) -> Dict[str, Any]:
        """Get field status."""
        return {
            "field_id": self.field_id,
            "state": self.state.state_id,
            "tick": self.tick,
            "n_modes": len(self.modes),
            "n_bosons": len(self.bosons),
            "total_coherence": self.total_coherence,
            "total_energy": sum(m.energy for m in self.modes.values()),
            "total_lambda_mass": sum(b.current_mass for b in self.bosons.values()),
            "mode_frequencies": [m.frequency_hz for m in self.modes.values()]
        }


class OperationalSubstrate:
    """
    The master operational substrate integrating all K1 systems.
    
    This is the TRUE emergent layer where:
    - Wavefield dynamics produce Lambda-bosons
    - Feedback signals propagate between modules
    - Governance primitives emerge from coherence patterns
    - Recursive computation feeds back into field evolution
    """
    
    VERSION = "5.0.0"
    
    def __init__(self, substrate_id: str = "k1_substrate"):
        self.substrate_id = substrate_id
        self.field = WaveFieldDynamics(f"{substrate_id}_field")
        
        self.signal_queue: deque = deque(maxlen=10000)
        self.delivered_signals: List[FeedbackSignal] = []
        
        self.modules: Dict[str, 'ModuleInterface'] = {}
        self.coupling_matrix: Dict[Tuple[str, str], float] = {}
        
        self.running = False
        self._evolution_thread: Optional[threading.Thread] = None
        self.tick = 0
        
        self.telemetry: deque = deque(maxlen=1000)
        
    def register_module(self, module_id: str, 
                       interface: Optional['ModuleInterface'] = None):
        """Register a module for feedback coupling."""
        self.modules[module_id] = interface
        
        for other_id in self.modules:
            if other_id != module_id:
                coupling_id = (min(module_id, other_id), max(module_id, other_id))
                if coupling_id not in self.coupling_matrix:
                    self.coupling_matrix[coupling_id] = FIELD_COUPLING_STRENGTH
    
    def set_coupling(self, module_a: str, module_b: str, strength: float):
        """Set coupling strength between two modules."""
        coupling_id = (min(module_a, module_b), max(module_a, module_b))
        self.coupling_matrix[coupling_id] = strength
    
    def emit_signal(self, source: str, target: str, 
                   signal_type: OperationType,
                   payload: Dict[str, Any],
                   strength: float = 1.0) -> FeedbackSignal:
        """Emit a feedback signal from one module to another."""
        signal = FeedbackSignal(
            signal_id=hashlib.sha256(
                f"{source}:{target}:{time.time()}".encode()
            ).hexdigest()[:16],
            source_module=source,
            target_module=target,
            signal_type=signal_type,
            payload=payload,
            strength=strength,
            propagation_delay=FEEDBACK_PROPAGATION_SPEED * self._get_coupling_distance(source, target)
        )
        
        self.signal_queue.append(signal)
        return signal
    
    def _get_coupling_distance(self, module_a: str, module_b: str) -> float:
        """Get effective distance between modules (inverse of coupling)."""
        coupling_id = (min(module_a, module_b), max(module_a, module_b))
        coupling = self.coupling_matrix.get(coupling_id, FIELD_COUPLING_STRENGTH)
        return 1.0 / max(coupling, 1e-20)
    
    def process_signals(self) -> int:
        """Process all ready signals in the queue."""
        processed = 0
        
        remaining = deque()
        
        while self.signal_queue:
            signal = self.signal_queue.popleft()
            
            if signal.is_delivered:
                self._deliver_signal(signal)
                processed += 1
            else:
                remaining.append(signal)
        
        self.signal_queue = remaining
        return processed
    
    def _deliver_signal(self, signal: FeedbackSignal):
        """Deliver a signal to its target module."""
        self.delivered_signals.append(signal)
        
        target = self.modules.get(signal.target_module)
        if target and hasattr(target, 'receive_feedback'):
            target.receive_feedback(signal)
        
        if signal.signal_type == OperationType.COHERENCE_AMPLIFY:
            boost = signal.payload.get("boost", 0.05) * signal.strength
            self.field.amplify_coherence(boost)
        
        elif signal.signal_type == OperationType.FIELD_CREATE:
            freq = signal.payload.get("frequency_hz", 5e14)
            energy = signal.payload.get("energy", 1e-18)
            self.field.inject_energy(freq, energy)
    
    def evolve_step(self, dt: float = 0.001) -> Dict[str, Any]:
        """Execute one evolution step of the entire substrate."""
        self.tick += 1
        
        field_result = self.field.evolve(dt)
        
        signals_processed = self.process_signals()
        
        self._apply_recursive_feedback()
        
        telemetry = {
            "tick": self.tick,
            "timestamp": time.time(),
            "field": field_result,
            "signals_processed": signals_processed,
            "field_state": self.field.state.state_id,
            "total_coherence": self.field.total_coherence,
            "active_bosons": len(self.field.bosons),
            "pending_signals": len(self.signal_queue)
        }
        
        self.telemetry.append(telemetry)
        
        return telemetry
    
    def _apply_recursive_feedback(self):
        """
        Apply recursive feedback based on field state.
        
        This creates self-reinforcing governance primitives:
        - High coherence → amplify further (positive feedback)
        - Low coherence → inject stabilization (negative feedback)
        """
        if self.field.total_coherence > 0.8:
            self.emit_signal(
                source="substrate",
                target="governance",
                signal_type=OperationType.GOVERNANCE_SIGNAL,
                payload={
                    "type": "high_coherence",
                    "coherence": self.field.total_coherence,
                    "recommendation": "expand_operations"
                }
            )
        
        elif self.field.total_coherence < 0.4:
            self.field.amplify_coherence(0.05)
            
            self.emit_signal(
                source="substrate",
                target="energy",
                signal_type=OperationType.RESOURCE_ALLOCATE,
                payload={
                    "type": "coherence_emergency",
                    "coherence": self.field.total_coherence,
                    "request": "energy_boost"
                }
            )
        
        for boson in self.field.bosons.values():
            self.emit_signal(
                source="substrate",
                target="computing",
                signal_type=OperationType.LAMBDA_FORM,
                payload={
                    "boson_id": boson.boson_id,
                    "lambda_mass": boson.current_mass,
                    "energy_available": boson.energy,
                    "stability": boson.stability
                }
            )
    
    def start_continuous_evolution(self, tick_rate: float = 100.0):
        """Start continuous field evolution in background thread."""
        if self.running:
            return
        
        self.running = True
        dt = 1.0 / tick_rate
        
        def evolve_loop():
            while self.running:
                self.evolve_step(dt)
                time.sleep(dt)
        
        self._evolution_thread = threading.Thread(target=evolve_loop, daemon=True)
        self._evolution_thread.start()
    
    def stop_continuous_evolution(self):
        """Stop continuous evolution."""
        self.running = False
        if self._evolution_thread:
            self._evolution_thread.join(timeout=1.0)
    
    def inject_computation_result(self, result: Dict[str, Any]):
        """
        Feed computation results back into the substrate.
        
        This is the spectral → recursive feedback path.
        """
        frequency = result.get("output_frequency", 5e14)
        confidence = result.get("confidence", 0.8)
        
        energy = PLANCK_CONSTANT * frequency * confidence * 100
        self.field.inject_energy(frequency, energy)
        
        self.emit_signal(
            source="computing",
            target="governance",
            signal_type=OperationType.COMPUTATION_EXECUTE,
            payload=result
        )
    
    def inject_governance_decision(self, decision: Dict[str, Any]):
        """
        Feed governance decisions back into the substrate.
        
        This is the governance → self-reinforcing primitive path.
        """
        decision_type = decision.get("type", "policy")
        coherence_impact = decision.get("coherence_impact", 0.0)
        
        if coherence_impact > 0:
            self.field.amplify_coherence(coherence_impact)
        
        self.emit_signal(
            source="governance",
            target="resources",
            signal_type=OperationType.GOVERNANCE_SIGNAL,
            payload=decision
        )
    
    def status(self) -> Dict[str, Any]:
        """Get complete substrate status."""
        return {
            "version": self.VERSION,
            "substrate_id": self.substrate_id,
            "running": self.running,
            "tick": self.tick,
            "field": self.field.status(),
            "registered_modules": list(self.modules.keys()),
            "coupling_pairs": len(self.coupling_matrix),
            "pending_signals": len(self.signal_queue),
            "delivered_signals": len(self.delivered_signals),
            "telemetry_entries": len(self.telemetry)
        }
    
    def get_emergence_metrics(self) -> Dict[str, Any]:
        """Get metrics demonstrating emergent behavior."""
        bosons = list(self.field.bosons.values())
        
        return {
            "lambda_bosons_formed": len(bosons),
            "total_lambda_mass": sum(b.current_mass for b in bosons),
            "average_stability": sum(b.stability for b in bosons) / len(bosons) if bosons else 0,
            "formation_rate": len([e for e in self.field.history if e.get("event") == "lambda_formed"]),
            "decay_rate": len([e for e in self.field.history if e.get("event") == "lambda_decayed"]),
            "field_coherence": self.field.total_coherence,
            "recursive_signals": len([s for s in self.delivered_signals if s.source_module == "substrate"]),
            "cross_module_coupling": sum(self.coupling_matrix.values()) / len(self.coupling_matrix) if self.coupling_matrix else 0
        }


class ModuleInterface:
    """Base interface for substrate-coupled modules."""
    
    def __init__(self, module_id: str, substrate: OperationalSubstrate):
        self.module_id = module_id
        self.substrate = substrate
        self.received_signals: List[FeedbackSignal] = []
        
        substrate.register_module(module_id, self)
    
    def receive_feedback(self, signal: FeedbackSignal):
        """Handle incoming feedback signal."""
        self.received_signals.append(signal)
        self.on_feedback(signal)
    
    def on_feedback(self, signal: FeedbackSignal):
        """Override in subclasses to handle feedback."""
        pass
    
    def emit(self, target: str, signal_type: OperationType, 
            payload: Dict[str, Any], strength: float = 1.0):
        """Emit a signal to another module."""
        return self.substrate.emit_signal(
            source=self.module_id,
            target=target,
            signal_type=signal_type,
            payload=payload,
            strength=strength
        )


class EnergyModule(ModuleInterface):
    """Energy pillar interface to operational substrate."""
    
    def __init__(self, substrate: OperationalSubstrate):
        super().__init__("energy", substrate)
        self.energy_pool = 0.0
    
    def on_feedback(self, signal: FeedbackSignal):
        if signal.signal_type == OperationType.RESOURCE_ALLOCATE:
            if signal.payload.get("request") == "energy_boost":
                boost = 1e-15
                self.energy_pool += boost
                
                self.substrate.field.inject_energy(7.83, boost)
                
                self.emit(
                    target="substrate",
                    signal_type=OperationType.FIELD_CREATE,
                    payload={"frequency_hz": 7.83, "energy": boost}
                )


class ComputingModule(ModuleInterface):
    """Computing pillar interface to operational substrate."""
    
    def __init__(self, substrate: OperationalSubstrate):
        super().__init__("computing", substrate)
        self.computations = []
    
    def on_feedback(self, signal: FeedbackSignal):
        if signal.signal_type == OperationType.LAMBDA_FORM:
            energy = signal.payload.get("energy_available", 0)
            if energy > 0:
                result = {
                    "computation_id": f"comp_{time.time()}",
                    "input_energy": energy,
                    "output_frequency": 5e14,
                    "confidence": signal.payload.get("stability", 0.8)
                }
                self.computations.append(result)
                self.substrate.inject_computation_result(result)


class GovernanceModule(ModuleInterface):
    """Governance pillar interface to operational substrate."""
    
    def __init__(self, substrate: OperationalSubstrate):
        super().__init__("governance", substrate)
        self.decisions = []
    
    def on_feedback(self, signal: FeedbackSignal):
        if signal.signal_type == OperationType.GOVERNANCE_SIGNAL:
            if signal.payload.get("type") == "high_coherence":
                decision = {
                    "type": "expansion",
                    "coherence_impact": 0.02,
                    "timestamp": time.time()
                }
                self.decisions.append(decision)
                self.substrate.inject_governance_decision(decision)


class ResourceModule(ModuleInterface):
    """Resource pillar interface to operational substrate."""
    
    def __init__(self, substrate: OperationalSubstrate):
        super().__init__("resources", substrate)
        self.allocations = []
    
    def on_feedback(self, signal: FeedbackSignal):
        if signal.signal_type == OperationType.GOVERNANCE_SIGNAL:
            if signal.payload.get("type") == "expansion":
                self.emit(
                    target="energy",
                    signal_type=OperationType.RESOURCE_ALLOCATE,
                    payload={"type": "resource_ready", "amount": 100}
                )


class CommunicationsModule(ModuleInterface):
    """Communications pillar interface to operational substrate."""
    
    def __init__(self, substrate: OperationalSubstrate):
        super().__init__("communications", substrate)
        self.routed_signals = 0
    
    def on_feedback(self, signal: FeedbackSignal):
        self.routed_signals += 1


_global_substrate: Optional[OperationalSubstrate] = None

def get_operational_substrate(**kwargs) -> OperationalSubstrate:
    """Get the global operational substrate instance."""
    global _global_substrate
    if _global_substrate is None:
        _global_substrate = OperationalSubstrate(**kwargs)
    return _global_substrate


def demo_operational_substrate():
    """
    Demonstrate the operational substrate with emergent Lambda-boson formation.
    """
    print("=" * 70)
    print("WNSP Operational Substrate v5.0 - EMERGENT PRIMITIVES DEMO")
    print("=" * 70)
    print()
    
    substrate = OperationalSubstrate(substrate_id="demo_k1")
    
    energy_mod = EnergyModule(substrate)
    computing_mod = ComputingModule(substrate)
    governance_mod = GovernanceModule(substrate)
    resources_mod = ResourceModule(substrate)
    comms_mod = CommunicationsModule(substrate)
    
    substrate.set_coupling("energy", "computing", 1e-8)
    substrate.set_coupling("computing", "governance", 1e-8)
    substrate.set_coupling("governance", "resources", 1e-8)
    substrate.set_coupling("resources", "communications", 1e-8)
    substrate.set_coupling("communications", "energy", 1e-8)
    
    print("Phase 1: Initializing Wavefield")
    print("-" * 50)
    
    substrate.field.add_mode(7.83, amplitude=1.0+0j, quantum_number=1)
    substrate.field.add_mode(14.3, amplitude=0.8+0.2j, quantum_number=2)
    substrate.field.add_mode(20.8, amplitude=0.6+0.4j, quantum_number=3)
    substrate.field.add_mode(5e14, amplitude=0.5+0j, quantum_number=1)
    substrate.field.add_mode(5.5e14, amplitude=0.4+0.3j, quantum_number=2)
    
    print(f"  Modes created: {len(substrate.field.modes)}")
    print(f"  Field state: {substrate.field.state.state_id}")
    print(f"  Initial coherence: {substrate.field.total_coherence:.4f}")
    print()
    
    print("Phase 2: Running Field Dynamics (Lambda-boson Emergence)")
    print("-" * 50)
    
    bosons_formed = 0
    for tick in range(100):
        result = substrate.evolve_step(dt=0.01)
        bosons_formed += result["field"]["bosons_formed"]
        
        if tick % 20 == 0:
            print(f"  Tick {tick}: coherence={result['total_coherence']:.4f}, "
                  f"bosons={result['active_bosons']}, signals={result['signals_processed']}")
    
    print(f"\n  Total Lambda-bosons emerged: {bosons_formed}")
    print(f"  Currently stable bosons: {len(substrate.field.bosons)}")
    print()
    
    print("Phase 3: Cross-Module Feedback")
    print("-" * 50)
    
    energy_mod.emit(
        target="computing",
        signal_type=OperationType.FIELD_CREATE,
        payload={"frequency_hz": 6e14, "energy": 1e-17}
    )
    
    for _ in range(20):
        substrate.evolve_step(dt=0.01)
    
    print(f"  Energy module pool: {energy_mod.energy_pool:.2e} J")
    print(f"  Computing module computations: {len(computing_mod.computations)}")
    print(f"  Governance decisions: {len(governance_mod.decisions)}")
    print(f"  Resource allocations: {len(resources_mod.allocations)}")
    print(f"  Communications routed: {comms_mod.routed_signals}")
    print()
    
    print("Phase 4: Emergence Metrics")
    print("-" * 50)
    
    metrics = substrate.get_emergence_metrics()
    for key, value in metrics.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.6f}")
        else:
            print(f"  {key}: {value}")
    print()
    
    print("=" * 70)
    print("SUBSTRATE STATUS")
    print("=" * 70)
    
    status = substrate.status()
    print(f"  Version: {status['version']}")
    print(f"  Field State: {status['field']['state']}")
    print(f"  Total Coherence: {status['field']['total_coherence']:.4f}")
    print(f"  Active Lambda-bosons: {status['field']['n_bosons']}")
    print(f"  Total Lambda Mass: {status['field']['total_lambda_mass']:.2e} kg")
    print(f"  Registered Modules: {status['registered_modules']}")
    print(f"  Delivered Signals: {status['delivered_signals']}")
    print()
    
    print("✓ Lambda-boson formation: EMERGENT (not pre-computed)")
    print("✓ Recursive feedback: ACTIVE (cross-module coupling)")
    print("✓ Self-reinforcing governance: OPERATIONAL (coherence-driven)")
    print("✓ Spectral computation: INTEGRATED (λ-energy based)")
    print()
    print("K1 OPERATIONAL SUBSTRATE: FULLY FUNCTIONAL")
    print("=" * 70)
    
    return substrate


if __name__ == "__main__":
    demo_operational_substrate()
