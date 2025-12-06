"""
WNSP v7.0 — Lambda Boson Substrate

The computational substrate where oscillation IS the message.
Messages are not bytes with wavelength tags — they ARE oscillation states.

Physics Foundation:
- Λ = hf/c² (mass-equivalent of oscillation)
- E = hf (energy from frequency)
- Conservation: ΣΛ_in = ΣΛ_out + ΣΛ_stored + ΣΛ_dissipated

Core Components:
1. OscillationField - The substrate layer managing oscillator states
2. OscillatorState - Individual oscillation unit (f, A, φ, coherence)
3. OscillationRegister - Array of oscillator states encoding data
4. SubstrateEncoder - Encode data as oscillation (not bytes)
5. MassLedger - Global Λ conservation accounting
6. StandingWaveRegistry - Detect localized oscillation as stored value
7. GravitationalField - Mass-weighted routing via Λ potential

Author: Founder Te Rata Pou
License: GPL v3.0
"""

import math
import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum

from .protocol import (
    PLANCK_CONSTANT, SPEED_OF_LIGHT, A4_FREQUENCY,
    HarmonicPacket, HarmonicNode, CarrierWave, ToneSignature,
    Octave, HarmonicRatio, ExcitationEvent, ExcitationState
)


@dataclass
class OscillatorState:
    """
    A single oscillator in the substrate.
    
    The fundamental unit of the Lambda Boson substrate.
    Each oscillator represents one mode of vibration.
    
    Properties:
    - frequency (f): Oscillations per second (Hz)
    - amplitude (A): Strength of oscillation (0.0 - 1.0)
    - phase (φ): Position in cycle (0 - 2π radians)
    - coherence (τ): How long the oscillation maintains phase (seconds)
    """
    frequency: float
    amplitude: float = 1.0
    phase: float = 0.0
    coherence: float = 1.0
    created_at: float = field(default_factory=time.time)
    
    @property
    def energy(self) -> float:
        """E = hf × A² (energy scales with amplitude squared)"""
        return PLANCK_CONSTANT * self.frequency * (self.amplitude ** 2)
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² × A² (mass-equivalent of this oscillator)"""
        return self.energy / (SPEED_OF_LIGHT ** 2)
    
    @property
    def wavelength(self) -> float:
        """λ = c/f (wavelength in meters)"""
        return SPEED_OF_LIGHT / self.frequency
    
    @property
    def period(self) -> float:
        """T = 1/f (time for one complete cycle)"""
        return 1.0 / self.frequency
    
    @property
    def angular_frequency(self) -> float:
        """ω = 2πf (radians per second)"""
        return 2 * math.pi * self.frequency
    
    def value_at_time(self, t: float) -> float:
        """
        Get instantaneous value of oscillation at time t.
        
        y(t) = A × cos(ωt + φ) × e^(-t/τ)
        
        Includes exponential decay based on coherence time.
        """
        age = t - self.created_at
        decay = math.exp(-age / self.coherence) if self.coherence > 0 else 1.0
        return self.amplitude * decay * math.cos(self.angular_frequency * t + self.phase)
    
    def is_coherent(self, t: Optional[float] = None) -> bool:
        """Check if oscillator is still coherent (amplitude > 1% of original)."""
        if t is None:
            t = time.time()
        age = t - self.created_at
        decay = math.exp(-age / self.coherence) if self.coherence > 0 else 1.0
        return decay > 0.01
    
    def resonate_with(self, other: 'OscillatorState') -> float:
        """
        Calculate resonance strength with another oscillator.
        
        Resonance is strongest when:
        - Frequencies are harmonically related (1:1, 2:1, 3:2, etc.)
        - Phases are aligned
        """
        if other.frequency == 0 or self.frequency == 0:
            return 0.0
        
        ratio = max(self.frequency, other.frequency) / min(self.frequency, other.frequency)
        
        harmonic_ratios = [1.0, 2.0, 1.5, 4/3, 5/4, 6/5, 5/3, 8/5]
        min_distance = min(abs(ratio - hr) for hr in harmonic_ratios)
        harmonic_resonance = math.exp(-min_distance * 10)
        
        phase_diff = abs(self.phase - other.phase) % (2 * math.pi)
        phase_alignment = math.cos(phase_diff)
        phase_factor = (phase_alignment + 1) / 2
        
        return harmonic_resonance * phase_factor * self.amplitude * other.amplitude
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "frequency": self.frequency,
            "amplitude": self.amplitude,
            "phase": self.phase,
            "coherence": self.coherence,
            "energy": self.energy,
            "lambda_mass": self.lambda_mass,
            "wavelength": self.wavelength
        }


@dataclass
class OscillationRegister:
    """
    A register of oscillator states encoding information.
    
    Like a quantum register, but for oscillation states.
    Data is encoded as a superposition of oscillator modes.
    
    The total Lambda mass is the sum of all oscillator masses.
    """
    oscillators: List[OscillatorState] = field(default_factory=list)
    register_id: str = ""
    
    def __post_init__(self):
        if not self.register_id:
            self.register_id = hashlib.sha256(
                f"{time.time()}:{id(self)}".encode()
            ).hexdigest()[:12]
    
    @property
    def total_energy(self) -> float:
        """Total energy across all oscillators."""
        return sum(o.energy for o in self.oscillators)
    
    @property
    def total_lambda_mass(self) -> float:
        """Total Λ mass across all oscillators."""
        return sum(o.lambda_mass for o in self.oscillators)
    
    @property
    def dominant_frequency(self) -> float:
        """Frequency of highest-amplitude oscillator."""
        if not self.oscillators:
            return 0.0
        return max(self.oscillators, key=lambda o: o.amplitude).frequency
    
    @property
    def bandwidth(self) -> Tuple[float, float]:
        """Frequency range covered by oscillators."""
        if not self.oscillators:
            return (0.0, 0.0)
        freqs = [o.frequency for o in self.oscillators]
        return (min(freqs), max(freqs))
    
    def add_oscillator(self, osc: OscillatorState):
        """Add an oscillator to the register."""
        self.oscillators.append(osc)
    
    def superpose(self, t: float) -> float:
        """
        Get superposed value at time t.
        
        Sum of all oscillator values (interference pattern).
        """
        return sum(o.value_at_time(t) for o in self.oscillators)
    
    def prune_decoherent(self, t: Optional[float] = None):
        """Remove oscillators that have lost coherence."""
        if t is None:
            t = time.time()
        self.oscillators = [o for o in self.oscillators if o.is_coherent(t)]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "register_id": self.register_id,
            "oscillator_count": len(self.oscillators),
            "total_energy": self.total_energy,
            "total_lambda_mass": self.total_lambda_mass,
            "dominant_frequency": self.dominant_frequency,
            "bandwidth": self.bandwidth,
            "oscillators": [o.to_dict() for o in self.oscillators]
        }


class SubstrateEncoder:
    """
    Encode data as oscillation states.
    
    This is the core of the Lambda Boson substrate:
    Data doesn't USE wavelength — data IS wavelength.
    
    Encoding strategy:
    1. Each byte is mapped to a frequency in the spectrum
    2. Byte value determines amplitude
    3. Position determines phase
    4. Authority level determines coherence time
    
    The resulting OscillationRegister IS the message.
    """
    
    BASE_FREQUENCY = 4.3e14
    FREQUENCY_STEP = 1e12
    MAX_COHERENCE = 3600.0
    
    def __init__(self, base_frequency: float = None, frequency_step: float = None):
        self.base_frequency = base_frequency or self.BASE_FREQUENCY
        self.frequency_step = frequency_step or self.FREQUENCY_STEP
    
    def encode(self, data: bytes, authority: int = 0) -> OscillationRegister:
        """
        Encode bytes as oscillation register.
        
        Each byte becomes an oscillator:
        - frequency = base + (byte_position × step)
        - amplitude = byte_value / 255
        - phase = (byte_position / total_bytes) × 2π
        - coherence = authority-based decay time
        """
        register = OscillationRegister()
        
        coherence = self.MAX_COHERENCE * (1 + authority / 10)
        
        for i, byte_val in enumerate(data):
            frequency = self.base_frequency + (i * self.frequency_step)
            amplitude = (byte_val + 1) / 256
            phase = (i / max(len(data), 1)) * 2 * math.pi
            
            oscillator = OscillatorState(
                frequency=frequency,
                amplitude=amplitude,
                phase=phase,
                coherence=coherence
            )
            register.add_oscillator(oscillator)
        
        return register
    
    def decode(self, register: OscillationRegister) -> bytes:
        """
        Decode oscillation register back to bytes.
        
        Reverse the encoding process.
        """
        if not register.oscillators:
            return b""
        
        sorted_oscs = sorted(register.oscillators, key=lambda o: o.frequency)
        
        byte_values = []
        for osc in sorted_oscs:
            byte_val = int(osc.amplitude * 256) - 1
            byte_val = max(0, min(255, byte_val))
            byte_values.append(byte_val)
        
        return bytes(byte_values)
    
    def encode_with_harmonics(self, data: bytes, authority: int = 0, 
                              harmonics: int = 3) -> OscillationRegister:
        """
        Encode with harmonic overtones for richer signal.
        
        Each byte generates fundamental + harmonics.
        This increases Lambda mass but improves signal integrity.
        """
        register = OscillationRegister()
        coherence = self.MAX_COHERENCE * (1 + authority / 10)
        
        for i, byte_val in enumerate(data):
            base_freq = self.base_frequency + (i * self.frequency_step)
            base_amplitude = (byte_val + 1) / 256
            base_phase = (i / max(len(data), 1)) * 2 * math.pi
            
            register.add_oscillator(OscillatorState(
                frequency=base_freq,
                amplitude=base_amplitude,
                phase=base_phase,
                coherence=coherence
            ))
            
            for h in range(2, harmonics + 2):
                harmonic_freq = base_freq * h
                harmonic_amplitude = base_amplitude / h
                
                register.add_oscillator(OscillatorState(
                    frequency=harmonic_freq,
                    amplitude=harmonic_amplitude,
                    phase=base_phase,
                    coherence=coherence / h
                ))
        
        return register


@dataclass
class MassLedgerEntry:
    """A single entry in the mass ledger."""
    timestamp: float
    node_id: str
    packet_id: str
    lambda_in: float
    lambda_out: float
    lambda_stored: float
    lambda_dissipated: float
    event_type: str
    
    @property
    def lambda_balance(self) -> float:
        """Should be zero if conservation holds."""
        return self.lambda_in - (self.lambda_out + self.lambda_stored + self.lambda_dissipated)


class MassLedger:
    """
    Global Lambda mass conservation ledger.
    
    Tracks all mass-equivalent transfers in the network.
    Enforces conservation: ΣΛ_in = ΣΛ_out + ΣΛ_stored + ΣΛ_dissipated
    
    This is the "physics law enforcement" of the substrate.
    """
    
    CONSERVATION_TOLERANCE = 1e-50
    DISSIPATION_RATE = 0.001
    
    def __init__(self):
        self.entries: List[MassLedgerEntry] = []
        self.total_lambda_created: float = 0.0
        self.total_lambda_destroyed: float = 0.0
        self.stored_lambda: Dict[str, float] = {}
    
    def record_injection(self, node_id: str, packet_id: str, 
                         register: OscillationRegister) -> MassLedgerEntry:
        """Record Lambda injection into the network."""
        entry = MassLedgerEntry(
            timestamp=time.time(),
            node_id=node_id,
            packet_id=packet_id,
            lambda_in=register.total_lambda_mass,
            lambda_out=0.0,
            lambda_stored=0.0,
            lambda_dissipated=0.0,
            event_type="injection"
        )
        self.entries.append(entry)
        self.total_lambda_created += register.total_lambda_mass
        return entry
    
    def record_transfer(self, from_node: str, to_node: str, packet_id: str,
                       lambda_transferred: float, lambda_dissipated: float) -> MassLedgerEntry:
        """
        Record Lambda transfer between nodes.
        
        Transfer is a zero-sum operation (no new Lambda created):
        - Lambda comes in from propagating wave
        - Lambda goes out to next node minus dissipation
        - Dissipated Lambda is destroyed (converts to heat/entropy)
        """
        entry = MassLedgerEntry(
            timestamp=time.time(),
            node_id=f"{from_node}->{to_node}",
            packet_id=packet_id,
            lambda_in=0.0,
            lambda_out=0.0,
            lambda_stored=0.0,
            lambda_dissipated=lambda_dissipated,
            event_type="transfer"
        )
        self.entries.append(entry)
        self.total_lambda_destroyed += lambda_dissipated
        return entry
    
    def record_storage(self, node_id: str, packet_id: str,
                      lambda_stored: float) -> MassLedgerEntry:
        """Record Lambda stored as standing wave."""
        entry = MassLedgerEntry(
            timestamp=time.time(),
            node_id=node_id,
            packet_id=packet_id,
            lambda_in=0.0,
            lambda_out=0.0,
            lambda_stored=lambda_stored,
            lambda_dissipated=0.0,
            event_type="storage"
        )
        self.entries.append(entry)
        self.stored_lambda[node_id] = self.stored_lambda.get(node_id, 0.0) + lambda_stored
        return entry
    
    def record_retrieval(self, node_id: str, packet_id: str,
                        lambda_retrieved: float) -> MassLedgerEntry:
        """
        Record Lambda retrieved from standing wave.
        
        Retrieval converts stored Lambda to propagating Lambda.
        This is an internal conversion (standing wave → propagating wave),
        not an exit from the network.
        """
        entry = MassLedgerEntry(
            timestamp=time.time(),
            node_id=node_id,
            packet_id=packet_id,
            lambda_in=0.0,
            lambda_out=0.0,
            lambda_stored=-lambda_retrieved,
            lambda_dissipated=0.0,
            event_type="retrieval"
        )
        self.entries.append(entry)
        self.stored_lambda[node_id] = max(0, self.stored_lambda.get(node_id, 0.0) - lambda_retrieved)
        return entry
    
    def verify_conservation(self) -> Tuple[bool, float]:
        """
        Verify global mass conservation.
        
        Lambda can be in three states:
        1. Stored (standing waves) - tracked by total_stored
        2. Dissipated (lost to entropy) - tracked by total_dissipated
        3. Active (propagating waves) - injected but not yet stored
        
        Conservation law:
        total_in = total_out + total_stored + total_dissipated + total_active
        
        Where total_active = active Lambda in propagating waves.
        
        Returns (is_conserved, active_lambda).
        Active_lambda should be positive or zero, never negative.
        """
        total_in = sum(e.lambda_in for e in self.entries)
        total_out = sum(e.lambda_out for e in self.entries)
        total_stored = sum(e.lambda_stored for e in self.entries)
        total_dissipated = sum(e.lambda_dissipated for e in self.entries)
        
        active_lambda = total_in - (total_out + total_stored + total_dissipated)
        
        is_conserved = active_lambda >= -self.CONSERVATION_TOLERANCE
        
        return is_conserved, active_lambda
    
    def verify_strict_conservation(self) -> Tuple[bool, float]:
        """
        Verify strict conservation (all Lambda must be stored or dissipated).
        
        This is stricter than verify_conservation() which allows active Lambda.
        Use this after all operations are complete and Lambda should be fully accounted.
        """
        total_in = sum(e.lambda_in for e in self.entries)
        total_out = sum(e.lambda_out for e in self.entries)
        total_stored = sum(e.lambda_stored for e in self.entries)
        total_dissipated = sum(e.lambda_dissipated for e in self.entries)
        
        imbalance = total_in - (total_out + total_stored + total_dissipated)
        is_conserved = abs(imbalance) < self.CONSERVATION_TOLERANCE
        
        return is_conserved, imbalance
    
    def get_network_lambda(self) -> float:
        """Get total Lambda currently in the network."""
        return self.total_lambda_created - self.total_lambda_destroyed
    
    def get_stored_lambda(self) -> float:
        """Get total Lambda stored as standing waves."""
        return sum(self.stored_lambda.values())
    
    def get_node_stored_lambda(self, node_id: str) -> float:
        """Get Lambda stored at a specific node."""
        return self.stored_lambda.get(node_id, 0.0)
    
    def status(self) -> Dict[str, Any]:
        """Get ledger status summary."""
        is_conserved, active_lambda = self.verify_conservation()
        is_strict, imbalance = self.verify_strict_conservation()
        
        total_stored = sum(e.lambda_stored for e in self.entries)
        total_dissipated = sum(e.lambda_dissipated for e in self.entries)
        
        return {
            "total_entries": len(self.entries),
            "total_lambda_created": self.total_lambda_created,
            "total_lambda_destroyed": self.total_lambda_destroyed,
            "total_lambda_stored": total_stored,
            "total_lambda_dissipated": total_dissipated,
            "active_lambda": active_lambda,
            "network_lambda": self.get_network_lambda(),
            "is_conserved": is_conserved,
            "is_strict_conserved": is_strict,
            "imbalance": imbalance,
            "nodes_with_storage": len(self.stored_lambda)
        }


@dataclass
class StandingWave:
    """
    A standing wave representing stored value.
    
    When oscillation localizes (doesn't propagate), it becomes
    a standing wave — stored Lambda mass at a node.
    
    This is how the substrate stores value:
    - Propagating wave = transaction in flight
    - Standing wave = stored balance
    """
    node_id: str
    register: OscillationRegister
    created_at: float = field(default_factory=time.time)
    stability: float = 1.0
    
    @property
    def lambda_mass(self) -> float:
        """Total Lambda mass stored in this standing wave."""
        return self.register.total_lambda_mass
    
    @property
    def age(self) -> float:
        """Age of the standing wave in seconds."""
        return time.time() - self.created_at
    
    @property
    def is_stable(self) -> bool:
        """Check if standing wave is stable (not decaying)."""
        return self.stability > 0.5
    
    def decay(self, dt: float, decay_rate: float = 0.0001):
        """Apply decay to standing wave stability."""
        self.stability *= math.exp(-decay_rate * dt)
    
    def reinforce(self, energy: float):
        """Reinforce standing wave with additional energy."""
        self.stability = min(1.0, self.stability + energy * 1e30)


class StandingWaveRegistry:
    """
    Registry of all standing waves in the network.
    
    Manages stored value across nodes.
    Detects when propagating waves become standing waves.
    Handles retrieval (re-ignition) of stored waves.
    """
    
    STABILITY_THRESHOLD = 0.1
    
    def __init__(self, ledger: MassLedger):
        self.waves: Dict[str, List[StandingWave]] = {}
        self.ledger = ledger
    
    def store(self, node_id: str, register: OscillationRegister, 
              packet_id: str = "") -> StandingWave:
        """Store a register as a standing wave at a node."""
        wave = StandingWave(
            node_id=node_id,
            register=register
        )
        
        if node_id not in self.waves:
            self.waves[node_id] = []
        self.waves[node_id].append(wave)
        
        self.ledger.record_storage(node_id, packet_id, register.total_lambda_mass)
        
        return wave
    
    def retrieve(self, node_id: str, amount: float, 
                 packet_id: str = "") -> Optional[OscillationRegister]:
        """
        Retrieve stored Lambda as oscillation register.
        
        Removes oscillators until requested amount is retrieved.
        """
        if node_id not in self.waves or not self.waves[node_id]:
            return None
        
        retrieved = OscillationRegister()
        remaining_amount = amount
        
        waves_to_remove = []
        
        for wave in self.waves[node_id]:
            if remaining_amount <= 0:
                break
            
            for osc in wave.register.oscillators[:]:
                if remaining_amount <= 0:
                    break
                
                if osc.lambda_mass <= remaining_amount:
                    retrieved.add_oscillator(osc)
                    remaining_amount -= osc.lambda_mass
                    wave.register.oscillators.remove(osc)
                else:
                    fraction = remaining_amount / osc.lambda_mass
                    partial_osc = OscillatorState(
                        frequency=osc.frequency,
                        amplitude=osc.amplitude * math.sqrt(fraction),
                        phase=osc.phase,
                        coherence=osc.coherence
                    )
                    retrieved.add_oscillator(partial_osc)
                    osc.amplitude *= math.sqrt(1 - fraction)
                    remaining_amount = 0
            
            if not wave.register.oscillators:
                waves_to_remove.append(wave)
        
        for wave in waves_to_remove:
            self.waves[node_id].remove(wave)
        
        if retrieved.oscillators:
            self.ledger.record_retrieval(node_id, packet_id, retrieved.total_lambda_mass)
        
        return retrieved if retrieved.oscillators else None
    
    def get_node_balance(self, node_id: str) -> float:
        """Get total Lambda stored at a node."""
        if node_id not in self.waves:
            return 0.0
        return sum(w.lambda_mass for w in self.waves[node_id])
    
    def get_total_stored(self) -> float:
        """Get total Lambda stored across all nodes."""
        return sum(self.get_node_balance(nid) for nid in self.waves)
    
    def decay_all(self, dt: float):
        """Apply decay to all standing waves."""
        for node_id in list(self.waves.keys()):
            for wave in self.waves[node_id][:]:
                wave.decay(dt)
                if not wave.is_stable:
                    self.waves[node_id].remove(wave)
            
            if not self.waves[node_id]:
                del self.waves[node_id]
    
    def status(self) -> Dict[str, Any]:
        """Get registry status."""
        return {
            "nodes_with_storage": len(self.waves),
            "total_waves": sum(len(waves) for waves in self.waves.values()),
            "total_lambda_stored": self.get_total_stored(),
            "node_balances": {nid: self.get_node_balance(nid) for nid in self.waves}
        }


@dataclass
class GravitationalNode:
    """A node with gravitational potential from its Lambda mass."""
    node_id: str
    position: Tuple[float, float]
    lambda_mass: float
    
    @property
    def gravitational_potential(self) -> float:
        """
        Simplified gravitational potential.
        
        Φ = -G × Λ (potential at the node itself)
        
        In full implementation, this would be computed
        relative to other nodes.
        """
        G = 6.674e-11
        return -G * self.lambda_mass


class GravitationalField:
    """
    Gravitational field from Lambda mass distribution.
    
    High-mass packets and stored Lambda create gravitational
    potential that influences routing.
    
    Heavier paths (more Λ) create "gravity wells" that can
    attract or repel packets based on their mass.
    """
    
    G = 6.674e-11
    
    def __init__(self):
        self.nodes: Dict[str, GravitationalNode] = {}
        self.potential_cache: Dict[str, float] = {}
    
    def update_node(self, node_id: str, position: Tuple[float, float], 
                   lambda_mass: float):
        """Update or add a node to the field."""
        self.nodes[node_id] = GravitationalNode(
            node_id=node_id,
            position=position,
            lambda_mass=lambda_mass
        )
        self.potential_cache.clear()
    
    def remove_node(self, node_id: str):
        """Remove a node from the field."""
        if node_id in self.nodes:
            del self.nodes[node_id]
            self.potential_cache.clear()
    
    def potential_at(self, position: Tuple[float, float]) -> float:
        """
        Calculate gravitational potential at a position.
        
        Φ = -Σ (G × Λᵢ / rᵢ)
        
        where rᵢ is distance to node i.
        """
        total_potential = 0.0
        
        for node in self.nodes.values():
            dx = position[0] - node.position[0]
            dy = position[1] - node.position[1]
            r = math.sqrt(dx*dx + dy*dy)
            
            if r > 0.001:
                total_potential -= self.G * node.lambda_mass / r
        
        return total_potential
    
    def gradient_at(self, position: Tuple[float, float]) -> Tuple[float, float]:
        """
        Calculate gravitational gradient (force direction) at position.
        
        Returns unit vector pointing toward highest potential (steepest descent).
        """
        dx = 0.001
        
        pot_here = self.potential_at(position)
        pot_x = self.potential_at((position[0] + dx, position[1]))
        pot_y = self.potential_at((position[0], position[1] + dx))
        
        grad_x = (pot_x - pot_here) / dx
        grad_y = (pot_y - pot_here) / dx
        
        mag = math.sqrt(grad_x*grad_x + grad_y*grad_y)
        if mag > 0:
            return (grad_x / mag, grad_y / mag)
        return (0.0, 0.0)
    
    def routing_weight(self, from_pos: Tuple[float, float], 
                       to_pos: Tuple[float, float],
                       packet_lambda: float) -> float:
        """
        Calculate routing weight based on gravitational potential.
        
        Lower potential difference = easier route.
        """
        pot_from = self.potential_at(from_pos)
        pot_to = self.potential_at(to_pos)
        
        delta_pot = pot_to - pot_from
        
        weight = 1.0 / (1.0 + abs(delta_pot * packet_lambda * 1e30))
        
        return weight


class OscillationField:
    """
    The Lambda Boson Substrate.
    
    This is the core computational layer where all operations
    happen as oscillation transformations.
    
    Features:
    - Manages oscillator states across nodes
    - Enforces mass conservation
    - Handles standing wave storage
    - Computes gravitational routing
    """
    
    def __init__(self):
        self.ledger = MassLedger()
        self.standing_waves = StandingWaveRegistry(self.ledger)
        self.gravity = GravitationalField()
        self.encoder = SubstrateEncoder()
        
        self.node_positions: Dict[str, Tuple[float, float]] = {}
        self.active_registers: Dict[str, OscillationRegister] = {}
        
        self.last_update = time.time()
    
    def register_node(self, node_id: str, position: Tuple[float, float] = None):
        """Register a node in the substrate."""
        if position is None:
            import random
            position = (random.random() * 100, random.random() * 100)
        self.node_positions[node_id] = position
        self.gravity.update_node(node_id, position, 0.0)
    
    def inject(self, node_id: str, data: bytes, authority: int = 0) -> OscillationRegister:
        """
        Inject data into the substrate as oscillation.
        
        This is how messages enter the network:
        1. Encode bytes as oscillation register
        2. Record Lambda injection in ledger
        3. Return the register for propagation
        """
        if node_id not in self.node_positions:
            self.register_node(node_id)
        
        register = self.encoder.encode(data, authority)
        
        packet_id = hashlib.sha256(data).hexdigest()[:16]
        self.ledger.record_injection(node_id, packet_id, register)
        
        self.active_registers[packet_id] = register
        
        self._update_gravity(node_id)
        
        return register
    
    def transfer(self, register: OscillationRegister, 
                 from_node: str, to_node: str) -> OscillationRegister:
        """
        Transfer oscillation register between nodes.
        
        Applies dissipation based on distance/route quality.
        Updates gravitational field.
        """
        if from_node not in self.node_positions:
            self.register_node(from_node)
        if to_node not in self.node_positions:
            self.register_node(to_node)
        
        from_pos = self.node_positions[from_node]
        to_pos = self.node_positions[to_node]
        
        dx = to_pos[0] - from_pos[0]
        dy = to_pos[1] - from_pos[1]
        distance = math.sqrt(dx*dx + dy*dy)
        
        dissipation_rate = self.ledger.DISSIPATION_RATE * (1 + distance / 100)
        
        initial_lambda = register.total_lambda_mass
        
        for osc in register.oscillators:
            osc.amplitude *= (1 - dissipation_rate)
        
        final_lambda = register.total_lambda_mass
        lambda_dissipated = initial_lambda - final_lambda
        
        self.ledger.record_transfer(
            from_node, to_node, 
            register.register_id,
            final_lambda, lambda_dissipated
        )
        
        self._update_gravity(from_node)
        self._update_gravity(to_node)
        
        return register
    
    def store(self, node_id: str, register: OscillationRegister) -> StandingWave:
        """Store oscillation as standing wave at node."""
        return self.standing_waves.store(node_id, register, register.register_id)
    
    def retrieve(self, node_id: str, amount: float) -> Optional[OscillationRegister]:
        """Retrieve stored Lambda as oscillation."""
        return self.standing_waves.retrieve(node_id, amount)
    
    def get_balance(self, node_id: str) -> float:
        """Get stored Lambda balance at node."""
        return self.standing_waves.get_node_balance(node_id)
    
    def route_weight(self, from_node: str, to_node: str, 
                     packet_lambda: float) -> float:
        """Get routing weight between nodes based on gravity."""
        if from_node not in self.node_positions or to_node not in self.node_positions:
            return 1.0
        
        return self.gravity.routing_weight(
            self.node_positions[from_node],
            self.node_positions[to_node],
            packet_lambda
        )
    
    def propagate(self, dt: float):
        """
        Advance the substrate by time dt.
        
        - Decays standing waves
        - Prunes decoherent oscillators
        - Updates gravitational field
        """
        now = time.time()
        
        self.standing_waves.decay_all(dt)
        
        for register in self.active_registers.values():
            register.prune_decoherent(now)
        
        for node_id in self.node_positions:
            self._update_gravity(node_id)
        
        self.last_update = now
    
    def _update_gravity(self, node_id: str):
        """Update gravitational field for a node."""
        stored_lambda = self.standing_waves.get_node_balance(node_id)
        position = self.node_positions.get(node_id, (0, 0))
        self.gravity.update_node(node_id, position, stored_lambda)
    
    def verify_conservation(self) -> Tuple[bool, float]:
        """Verify mass conservation across the substrate."""
        return self.ledger.verify_conservation()
    
    def status(self) -> Dict[str, Any]:
        """Get substrate status."""
        is_conserved, imbalance = self.verify_conservation()
        return {
            "nodes": len(self.node_positions),
            "active_registers": len(self.active_registers),
            "ledger": self.ledger.status(),
            "standing_waves": self.standing_waves.status(),
            "conservation": {
                "is_conserved": is_conserved,
                "imbalance": imbalance
            }
        }


def lambda_mass_from_frequency(frequency: float) -> float:
    """Calculate Lambda mass from frequency: Λ = hf/c²"""
    return (PLANCK_CONSTANT * frequency) / (SPEED_OF_LIGHT ** 2)


def lambda_mass_from_wavelength(wavelength: float) -> float:
    """Calculate Lambda mass from wavelength: Λ = h/(λc)"""
    return PLANCK_CONSTANT / (wavelength * SPEED_OF_LIGHT)


def energy_from_lambda(lambda_mass: float) -> float:
    """Calculate energy from Lambda mass: E = Λc²"""
    return lambda_mass * (SPEED_OF_LIGHT ** 2)


def frequency_from_lambda(lambda_mass: float) -> float:
    """Calculate frequency from Lambda mass: f = Λc²/h"""
    return (lambda_mass * SPEED_OF_LIGHT ** 2) / PLANCK_CONSTANT


if __name__ == "__main__":
    print("=" * 60)
    print("WNSP v7.0 — Lambda Boson Substrate Test")
    print("Oscillation IS the message. Mass IS conserved.")
    print("=" * 60)
    
    field = OscillationField()
    
    field.register_node("alice", (0, 0))
    field.register_node("bob", (50, 50))
    field.register_node("charlie", (100, 0))
    
    print("\n1. Injecting message as oscillation...")
    message = b"Hello Lambda Boson!"
    register = field.inject("alice", message, authority=5)
    print(f"   Message: {message.decode()}")
    print(f"   Oscillators: {len(register.oscillators)}")
    print(f"   Total Energy: {register.total_energy:.3e} J")
    print(f"   Total Lambda Mass: {register.total_lambda_mass:.3e} kg")
    
    print("\n2. Transferring through network...")
    register = field.transfer(register, "alice", "bob")
    print(f"   After alice->bob: Λ = {register.total_lambda_mass:.3e} kg")
    register = field.transfer(register, "bob", "charlie")
    print(f"   After bob->charlie: Λ = {register.total_lambda_mass:.3e} kg")
    
    print("\n3. Storing as standing wave...")
    wave = field.store("charlie", register)
    print(f"   Stored at charlie: Λ = {wave.lambda_mass:.3e} kg")
    print(f"   Charlie balance: {field.get_balance('charlie'):.3e} kg")
    
    print("\n4. Verifying conservation...")
    is_conserved, imbalance = field.verify_conservation()
    print(f"   Conservation: {'PASSED' if is_conserved else 'FAILED'}")
    print(f"   Imbalance: {imbalance:.3e} kg")
    
    print("\n5. Retrieving stored Lambda...")
    retrieved = field.retrieve("charlie", wave.lambda_mass / 2)
    if retrieved:
        print(f"   Retrieved: Λ = {retrieved.total_lambda_mass:.3e} kg")
        print(f"   Charlie balance now: {field.get_balance('charlie'):.3e} kg")
    
    print("\n6. Decoding message...")
    decoded = field.encoder.decode(register)
    print(f"   Decoded: {decoded}")
    
    print("\n" + "=" * 60)
    print("Substrate Status:")
    import json
    print(json.dumps(field.status(), indent=2, default=str))
    print("=" * 60)
