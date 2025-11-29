"""
WNSP v7.0 — Harmonic Octave Protocol

Energy is vibration. Vibration has frequency. Frequency organizes into octaves.
Light is the carrier of energy. Messages are the carrier of meaning.

Architecture based on Founder Te Rata Pou's insights:
- "Light is the spectrum projection of invisible energy"
- "A conduit of energy that radiates reflection"
- "Energy is alternating wavelength frequency vibration octave tone"

Core Principles:
1. OCTAVE STRUCTURE: Frequencies organized into doubling bands (f, 2f, 4f, 8f...)
2. TONE SIGNATURE: Each node has a fundamental frequency (like a musical note)
3. CARRIER-PAYLOAD: Separate the wave (carrier) from the information (payload)
4. EXCITATION CHAIN: Messages propagate via absorb → process → re-emit
5. HARMONIC RESONANCE: Nodes resonate when tone ratios are harmonic (2:1, 3:2, 4:3)

Physics Foundation:
- E = h × f (energy IS frequency)
- Octave: f₂ = 2 × f₁ (doubling = one octave)
- Harmonics: f_n = n × f₀ (integer multiples of fundamental)
- Resonance: Energy transfers efficiently when f_source ≈ f_receiver

Backwards compatible with WNSP v6.0 via encapsulation.

GPL v3.0 License — Community Owned, Physics Governed
"""

import hashlib
import secrets
import time
import math
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set, Any

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458
PLANCK_FREQUENCY = 1.85e43
A4_FREQUENCY = 440.0


class Octave(Enum):
    """
    Octave bands spanning the electromagnetic spectrum.
    Each octave doubles the previous frequency range.
    Named after musical convention: C0 is lowest, C10 is highest usable.
    
    Physical mapping:
    - Lower octaves: Radio/Microwave (mesh broadcast)
    - Middle octaves: Infrared/Visible (standard messaging)  
    - Upper octaves: UV/X-ray/Gamma (governance/constitutional)
    """
    C0 = (0, 1e3, 1e6, "Sub-radio mesh sync")
    C1 = (1, 1e6, 1e9, "Radio broadcast")
    C2 = (2, 1e9, 1e12, "Microwave device link")
    C3 = (3, 1e12, 1e13, "Far infrared sensing")
    C4 = (4, 1e13, 1e14, "Near infrared proximity")
    C5 = (5, 4.3e14, 7.5e14, "Visible light messaging")
    C6 = (6, 7.5e14, 3e16, "Ultraviolet secure")
    C7 = (7, 3e16, 3e19, "X-ray governance")
    C8 = (8, 3e19, 3e22, "Gamma constitutional")
    C9 = (9, 3e22, 1e25, "High-energy Planck")
    C10 = (10, 1e25, PLANCK_FREQUENCY, "Planck boundary")
    
    def __init__(self, octave_number: int, freq_min: float, 
                 freq_max: float, role: str):
        self.octave_number = octave_number
        self.freq_min = freq_min
        self.freq_max = freq_max
        self.role = role
    
    @property
    def center_frequency(self) -> float:
        return math.sqrt(self.freq_min * self.freq_max)
    
    @property
    def bandwidth(self) -> float:
        return self.freq_max - self.freq_min
    
    @property
    def energy_range(self) -> Tuple[float, float]:
        return (PLANCK_CONSTANT * self.freq_min, 
                PLANCK_CONSTANT * self.freq_max)
    
    def contains_frequency(self, freq: float) -> bool:
        return self.freq_min <= freq <= self.freq_max
    
    @classmethod
    def from_frequency(cls, freq: float) -> 'Octave':
        for octave in cls:
            if octave.contains_frequency(freq):
                return octave
        return cls.C5


class HarmonicRatio(Enum):
    """
    Musical intervals as frequency ratios.
    These represent resonant relationships between tones.
    """
    UNISON = (1, 1, "Perfect resonance")
    OCTAVE = (2, 1, "Doubling — maximum harmonic")
    FIFTH = (3, 2, "Strong consonance")
    FOURTH = (4, 3, "Stable consonance")
    MAJOR_THIRD = (5, 4, "Warm consonance")
    MINOR_THIRD = (6, 5, "Soft consonance")
    MAJOR_SIXTH = (5, 3, "Bright consonance")
    MINOR_SIXTH = (8, 5, "Mellow consonance")
    TRITONE = (45, 32, "Tension — unstable")
    
    def __init__(self, numerator: int, denominator: int, quality: str):
        self.numerator = numerator
        self.denominator = denominator
        self.quality = quality
    
    @property
    def ratio(self) -> float:
        return self.numerator / self.denominator
    
    def resonance_strength(self) -> float:
        complexity = self.numerator + self.denominator
        return 1.0 / math.log2(complexity + 1)


@dataclass
class ToneSignature:
    """
    Every node has a fundamental tone — like a musical note.
    This defines the node's resonant identity in the network.
    
    Properties:
    - fundamental_freq: The base frequency (like A4 = 440 Hz)
    - harmonics: Integer multiples that also resonate (880, 1320, 1760...)
    - timbre: The unique "color" from harmonic amplitudes
    """
    node_id: str
    fundamental_freq: float
    harmonic_amplitudes: List[float]
    phase_offset: float
    creation_time: float
    
    @property
    def octave(self) -> Octave:
        return Octave.from_frequency(self.fundamental_freq)
    
    @property
    def note_name(self) -> str:
        if self.fundamental_freq <= 0:
            return "SILENT"
        semitones_from_a4 = 12 * math.log2(self.fundamental_freq / A4_FREQUENCY)
        note_names = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']
        note_index = int(round(semitones_from_a4)) % 12
        octave_num = 4 + int((round(semitones_from_a4) + 9) // 12)
        return f"{note_names[note_index]}{octave_num}"
    
    def harmonic_frequency(self, n: int) -> float:
        return self.fundamental_freq * n
    
    def harmonic_energy(self, n: int) -> float:
        if n <= 0 or n > len(self.harmonic_amplitudes):
            return 0.0
        amplitude = self.harmonic_amplitudes[n - 1]
        freq = self.harmonic_frequency(n)
        return PLANCK_CONSTANT * freq * (amplitude ** 2)
    
    def total_energy(self) -> float:
        return sum(self.harmonic_energy(n) for n in range(1, len(self.harmonic_amplitudes) + 1))
    
    def resonance_with(self, other: 'ToneSignature') -> Tuple[float, HarmonicRatio]:
        ratio = self.fundamental_freq / other.fundamental_freq
        if ratio < 1:
            ratio = 1 / ratio
        
        best_match = HarmonicRatio.TRITONE
        best_diff = float('inf')
        
        for harmonic in HarmonicRatio:
            diff = abs(ratio - harmonic.ratio)
            if diff < best_diff:
                best_diff = diff
                best_match = harmonic
        
        tolerance = 0.05
        if best_diff <= tolerance:
            resonance = best_match.resonance_strength() * (1 - best_diff / tolerance)
        else:
            resonance = 0.1 / (1 + best_diff)
        
        return (resonance, best_match)
    
    def signature_hash(self) -> str:
        content = json.dumps({
            "node_id": self.node_id,
            "fundamental": self.fundamental_freq,
            "harmonics": self.harmonic_amplitudes,
            "phase": self.phase_offset
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    @classmethod
    def generate(cls, node_id: str, seed: Optional[bytes] = None) -> 'ToneSignature':
        if seed is None:
            seed = hashlib.sha256(f"{node_id}:{time.time()}:{secrets.token_hex(8)}".encode()).digest()
        
        base_octave = 5 + (seed[0] % 4)
        note_offset = seed[1] % 12
        fundamental = A4_FREQUENCY * (2 ** (base_octave - 4)) * (2 ** (note_offset / 12))
        
        num_harmonics = 8
        harmonics = []
        for i in range(num_harmonics):
            amplitude = 1.0 / (i + 1)
            variation = (seed[i + 2] - 128) / 256.0 * 0.3
            harmonics.append(max(0.1, amplitude + variation))
        
        phase = (seed[10] / 255.0) * 2 * math.pi
        
        return cls(
            node_id=node_id,
            fundamental_freq=fundamental,
            harmonic_amplitudes=harmonics,
            phase_offset=phase,
            creation_time=time.time()
        )


@dataclass
class CarrierWave:
    """
    The carrier wave — like light carrying energy.
    Separate from the payload (meaning) it carries.
    
    "Light is the carrier of energy from its source"
    
    Properties:
    - frequency: The carrier frequency
    - amplitude: Wave intensity
    - phase: Wave position in cycle
    - polarization: Orientation of oscillation
    """
    frequency: float
    amplitude: float
    phase: float
    polarization_angle: float
    modulation_depth: float = 0.0
    
    @property
    def wavelength(self) -> float:
        if self.frequency <= 0:
            return float('inf')
        return SPEED_OF_LIGHT / self.frequency
    
    @property
    def energy(self) -> float:
        return PLANCK_CONSTANT * self.frequency * (self.amplitude ** 2)
    
    @property
    def octave(self) -> Octave:
        return Octave.from_frequency(self.frequency)
    
    def at_time(self, t: float) -> float:
        return self.amplitude * math.sin(2 * math.pi * self.frequency * t + self.phase)
    
    def modulate_with(self, payload_signal: float) -> 'CarrierWave':
        new_amplitude = self.amplitude * (1 + self.modulation_depth * payload_signal)
        return CarrierWave(
            frequency=self.frequency,
            amplitude=new_amplitude,
            phase=self.phase,
            polarization_angle=self.polarization_angle,
            modulation_depth=self.modulation_depth
        )
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "frequency": self.frequency,
            "amplitude": self.amplitude,
            "phase": self.phase,
            "polarization": self.polarization_angle,
            "modulation_depth": self.modulation_depth
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> 'CarrierWave':
        return cls(
            frequency=data["frequency"],
            amplitude=data["amplitude"],
            phase=data["phase"],
            polarization_angle=data.get("polarization", 0.0),
            modulation_depth=data.get("modulation_depth", 0.0)
        )
    
    @classmethod
    def from_octave(cls, octave: Octave, amplitude: float = 1.0) -> 'CarrierWave':
        return cls(
            frequency=octave.center_frequency,
            amplitude=amplitude,
            phase=0.0,
            polarization_angle=0.0,
            modulation_depth=0.5
        )


@dataclass
class HarmonicPayload:
    """
    The payload — the meaning carried by the wave.
    Encoded as harmonic content modulating the carrier.
    
    Like how atoms absorb light and re-emit at different frequencies,
    the payload transforms through the network.
    """
    content_hash: str
    harmonic_encoding: List[float]
    timestamp: float
    authority_level: int
    
    @property
    def num_harmonics(self) -> int:
        return len(self.harmonic_encoding)
    
    def energy_content(self, fundamental_freq: float) -> float:
        total = 0.0
        for n, amplitude in enumerate(self.harmonic_encoding, 1):
            freq = fundamental_freq * n
            total += PLANCK_CONSTANT * freq * (amplitude ** 2)
        return total
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "content_hash": self.content_hash,
            "harmonic_encoding": self.harmonic_encoding,
            "timestamp": self.timestamp,
            "authority": self.authority_level
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HarmonicPayload':
        return cls(
            content_hash=data["content_hash"],
            harmonic_encoding=data["harmonic_encoding"],
            timestamp=data["timestamp"],
            authority_level=data.get("authority", 0)
        )
    
    @classmethod
    def encode(cls, data: bytes, authority: int = 0) -> 'HarmonicPayload':
        content_hash = hashlib.sha256(data).hexdigest()[:32]
        
        harmonics = []
        for i in range(0, min(len(data), 16)):
            normalized = data[i] / 255.0
            harmonics.append(normalized)
        
        while len(harmonics) < 8:
            harmonics.append(0.0)
        
        return cls(
            content_hash=content_hash,
            harmonic_encoding=harmonics,
            timestamp=time.time(),
            authority_level=authority
        )


class ExcitationState(Enum):
    """
    States in the excitation-reflection chain.
    Like atomic energy levels.
    """
    GROUND = ("ground", 0, "Resting state")
    ABSORBING = ("absorbing", 1, "Receiving energy")
    EXCITED = ("excited", 2, "Processing — elevated state")
    EMITTING = ("emitting", 3, "Re-radiating energy")
    DECAYING = ("decaying", 4, "Returning to ground")
    
    def __init__(self, state_name: str, level: int, description: str):
        self.state_name = state_name
        self.level = level
        self.description = description


@dataclass
class ExcitationEvent:
    """
    A single excitation in the chain.
    Records how a node absorbed, processed, and re-emitted.
    """
    node_id: str
    node_tone_hash: str
    absorbed_frequency: float
    emitted_frequency: float
    energy_absorbed: float
    energy_emitted: float
    processing_time_ms: float
    excitation_state: ExcitationState
    timestamp: float
    
    @property
    def energy_retained(self) -> float:
        return self.energy_absorbed - self.energy_emitted
    
    @property
    def frequency_shift(self) -> float:
        return self.emitted_frequency - self.absorbed_frequency
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "tone_hash": self.node_tone_hash,
            "absorbed_freq": self.absorbed_frequency,
            "emitted_freq": self.emitted_frequency,
            "energy_in": self.energy_absorbed,
            "energy_out": self.energy_emitted,
            "process_ms": self.processing_time_ms,
            "state": self.excitation_state.state_name,
            "timestamp": self.timestamp
        }


@dataclass
class HarmonicPacket:
    """
    WNSP v7.0 Harmonic Octave Packet
    
    Combines carrier wave (the light) with payload (the meaning).
    Tracks the excitation chain as it propagates.
    
    Structure:
    {
        "version": "wnsp-v7",
        "packet_id": "<hash>",
        "source_tone": "<tone-signature-hash>",
        "target_tone": "<tone-signature-hash|null>",
        "carrier": {frequency, amplitude, phase, polarization},
        "payload": {content_hash, harmonic_encoding, authority},
        "excitation_chain": [events...],
        "resonance_requirements": {min_resonance, allowed_ratios},
        "energy_budget": float,
        "hop_limit": int,
        "signature": "<spectral-sig>"
    }
    """
    version: str = "wnsp-v7"
    packet_id: str = ""
    source_tone: str = ""
    target_tone: Optional[str] = None
    carrier: CarrierWave = field(default_factory=lambda: CarrierWave(5e14, 1.0, 0.0, 0.0))
    payload: HarmonicPayload = field(default_factory=lambda: HarmonicPayload("", [], 0.0, 0))
    excitation_chain: List[ExcitationEvent] = field(default_factory=list)
    min_resonance: float = 0.05
    allowed_ratios: List[str] = field(default_factory=lambda: ["OCTAVE", "FIFTH", "FOURTH", "MAJOR_THIRD", "MINOR_THIRD", "MAJOR_SIXTH"])
    energy_budget: float = 1e-6
    hop_limit: int = 16
    signature: str = ""
    meta: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.packet_id:
            self.packet_id = hashlib.sha256(
                f"{self.source_tone}:{time.time()}:{secrets.token_hex(8)}".encode()
            ).hexdigest()[:16]
    
    @property
    def hop_count(self) -> int:
        return len(self.excitation_chain)
    
    @property
    def total_energy_consumed(self) -> float:
        return sum(e.energy_retained for e in self.excitation_chain)
    
    @property
    def remaining_energy(self) -> float:
        return self.energy_budget - self.total_energy_consumed
    
    @property
    def current_frequency(self) -> float:
        if self.excitation_chain:
            return self.excitation_chain[-1].emitted_frequency
        return self.carrier.frequency
    
    @property
    def current_octave(self) -> Octave:
        return Octave.from_frequency(self.current_frequency)
    
    def can_propagate(self) -> bool:
        return (self.remaining_energy > 0 and 
                self.hop_count < self.hop_limit)
    
    def add_excitation(self, event: ExcitationEvent):
        self.excitation_chain.append(event)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "packet_id": self.packet_id,
            "source_tone": self.source_tone,
            "target_tone": self.target_tone,
            "carrier": self.carrier.to_dict(),
            "payload": self.payload.to_dict(),
            "excitation_chain": [e.to_dict() for e in self.excitation_chain],
            "min_resonance": self.min_resonance,
            "allowed_ratios": self.allowed_ratios,
            "energy_budget": self.energy_budget,
            "hop_limit": self.hop_limit,
            "signature": self.signature,
            "meta": self.meta
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HarmonicPacket':
        excitation_chain = []
        for e in data.get("excitation_chain", []):
            excitation_chain.append(ExcitationEvent(
                node_id=e["node_id"],
                node_tone_hash=e["tone_hash"],
                absorbed_frequency=e["absorbed_freq"],
                emitted_frequency=e["emitted_freq"],
                energy_absorbed=e["energy_in"],
                energy_emitted=e["energy_out"],
                processing_time_ms=e["process_ms"],
                excitation_state=ExcitationState[e["state"].upper()],
                timestamp=e["timestamp"]
            ))
        
        return cls(
            version=data.get("version", "wnsp-v7"),
            packet_id=data.get("packet_id", ""),
            source_tone=data.get("source_tone", ""),
            target_tone=data.get("target_tone"),
            carrier=CarrierWave.from_dict(data.get("carrier", {})),
            payload=HarmonicPayload.from_dict(data.get("payload", {})),
            excitation_chain=excitation_chain,
            min_resonance=data.get("min_resonance", 0.3),
            allowed_ratios=data.get("allowed_ratios", ["OCTAVE", "FIFTH", "FOURTH"]),
            energy_budget=data.get("energy_budget", 1e-6),
            hop_limit=data.get("hop_limit", 16),
            signature=data.get("signature", ""),
            meta=data.get("meta", {})
        )


class HarmonicNode:
    """
    A node in the WNSP v7 Harmonic Octave network.
    
    Like an atom in physics:
    - Has a fundamental tone (like atomic resonant frequency)
    - Absorbs packets at resonant frequencies
    - Gets "excited" to higher energy state during processing
    - Re-emits packets (possibly at shifted frequency)
    
    "Light excites the atomic structure... to reflect"
    """
    
    ABSORPTION_THRESHOLD = 0.05
    PROCESSING_ENERGY_RATIO = 0.1
    
    def __init__(self, node_id: str, stake: float = 1.0):
        self.node_id = node_id
        self.stake = stake
        self.tone = ToneSignature.generate(node_id)
        self.excitation_state = ExcitationState.GROUND
        self.energy_level = 0.0
        self.connected_nodes: Dict[str, ToneSignature] = {}
        self.received_packets: List[HarmonicPacket] = []
        self.emitted_packets: List[HarmonicPacket] = []
        self.processing_start: float = 0.0
    
    @property
    def tone_hash(self) -> str:
        return self.tone.signature_hash()
    
    def connect(self, other_node_id: str, other_tone: ToneSignature):
        self.connected_nodes[other_node_id] = other_tone
    
    def disconnect(self, other_node_id: str):
        self.connected_nodes.pop(other_node_id, None)
    
    def resonance_with_packet(self, packet: HarmonicPacket) -> Tuple[float, HarmonicRatio]:
        packet_freq = packet.current_frequency
        my_freq = self.tone.fundamental_freq
        
        ratio = packet_freq / my_freq
        if ratio < 1:
            ratio = 1 / ratio
        
        best_match = HarmonicRatio.TRITONE
        best_diff = float('inf')
        
        for harmonic in HarmonicRatio:
            if harmonic.name in packet.allowed_ratios or harmonic == HarmonicRatio.UNISON:
                diff = abs(ratio - harmonic.ratio)
                if diff < best_diff:
                    best_diff = diff
                    best_match = harmonic
        
        tolerance = 0.08
        if best_diff <= tolerance:
            resonance = best_match.resonance_strength() * (1 - best_diff / tolerance)
        else:
            resonance = 0.05 / (1 + best_diff)
        
        return (resonance, best_match)
    
    def can_absorb(self, packet: HarmonicPacket) -> bool:
        if not packet.can_propagate():
            return False
        
        resonance, _ = self.resonance_with_packet(packet)
        effective_threshold = max(packet.min_resonance, self.ABSORPTION_THRESHOLD)
        if resonance < effective_threshold:
            return False
        
        for event in packet.excitation_chain:
            if event.node_id == self.node_id:
                return False
        
        return True
    
    def absorb(self, packet: HarmonicPacket) -> bool:
        if not self.can_absorb(packet):
            return False
        
        self.excitation_state = ExcitationState.ABSORBING
        self.energy_level = packet.remaining_energy
        self.processing_start = time.time()
        self.received_packets.append(packet)
        
        return True
    
    def process(self, packet: HarmonicPacket) -> Optional[HarmonicPacket]:
        if self.excitation_state != ExcitationState.ABSORBING:
            return None
        
        self.excitation_state = ExcitationState.EXCITED
        
        resonance, ratio = self.resonance_with_packet(packet)
        
        processing_energy = packet.remaining_energy * self.PROCESSING_ENERGY_RATIO * (1 - resonance)
        processing_energy = min(processing_energy, packet.remaining_energy * 0.5)
        
        absorbed_freq = packet.current_frequency
        
        if ratio == HarmonicRatio.OCTAVE:
            emitted_freq = absorbed_freq
        elif ratio == HarmonicRatio.FIFTH:
            emitted_freq = absorbed_freq * 1.001
        else:
            shift_factor = 1 + (1 - resonance) * 0.01
            emitted_freq = absorbed_freq * shift_factor
        
        processing_time = (time.time() - self.processing_start) * 1000
        
        event = ExcitationEvent(
            node_id=self.node_id,
            node_tone_hash=self.tone_hash,
            absorbed_frequency=absorbed_freq,
            emitted_frequency=emitted_freq,
            energy_absorbed=packet.remaining_energy,
            energy_emitted=packet.remaining_energy - processing_energy,
            processing_time_ms=processing_time,
            excitation_state=ExcitationState.EMITTING,
            timestamp=time.time()
        )
        
        self.excitation_state = ExcitationState.EMITTING
        
        new_carrier = CarrierWave(
            frequency=emitted_freq,
            amplitude=packet.carrier.amplitude * math.sqrt(1 - processing_energy / packet.remaining_energy),
            phase=packet.carrier.phase + self.tone.phase_offset,
            polarization_angle=packet.carrier.polarization_angle,
            modulation_depth=packet.carrier.modulation_depth
        )
        
        new_packet = HarmonicPacket(
            version="wnsp-v7",
            packet_id=packet.packet_id,
            source_tone=packet.source_tone,
            target_tone=packet.target_tone,
            carrier=new_carrier,
            payload=packet.payload,
            excitation_chain=packet.excitation_chain + [event],
            min_resonance=packet.min_resonance,
            allowed_ratios=packet.allowed_ratios,
            energy_budget=packet.energy_budget,
            hop_limit=packet.hop_limit,
            signature=self._sign_packet(packet),
            meta=packet.meta
        )
        
        self.emitted_packets.append(new_packet)
        
        self.excitation_state = ExcitationState.DECAYING
        self.energy_level = 0.0
        self.excitation_state = ExcitationState.GROUND
        
        return new_packet
    
    def _sign_packet(self, packet: HarmonicPacket) -> str:
        content = f"{packet.packet_id}:{self.tone_hash}:{time.time()}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    def create_packet(self, data: bytes, target_tone: Optional[str] = None,
                      authority: int = 0, energy_budget: float = 1e-6,
                      octave: Optional[Octave] = None) -> HarmonicPacket:
        carrier = CarrierWave(
            frequency=self.tone.fundamental_freq,
            amplitude=1.0,
            phase=self.tone.phase_offset,
            polarization_angle=0.0,
            modulation_depth=0.5
        )
        payload = HarmonicPayload.encode(data, authority)
        
        packet = HarmonicPacket(
            source_tone=self.tone_hash,
            target_tone=target_tone,
            carrier=carrier,
            payload=payload,
            energy_budget=energy_budget,
            meta={
                "origin_node": self.node_id,
                "origin_octave": self.tone.octave.name,
                "created": time.time()
            }
        )
        
        packet.signature = self._sign_packet(packet)
        return packet
    
    def find_resonant_routes(self, packet: HarmonicPacket) -> List[Tuple[str, float, HarmonicRatio]]:
        routes = []
        
        for node_id, tone in self.connected_nodes.items():
            resonance, ratio = self.tone.resonance_with(tone)
            if resonance >= packet.min_resonance:
                routes.append((node_id, resonance, ratio))
        
        routes.sort(key=lambda x: x[1], reverse=True)
        return routes
    
    def on_receive(self, packet: HarmonicPacket) -> Optional[HarmonicPacket]:
        if not self.absorb(packet):
            return None
        
        if packet.target_tone == self.tone_hash:
            processing_time = (time.time() - self.processing_start) * 1000
            event = ExcitationEvent(
                node_id=self.node_id,
                node_tone_hash=self.tone_hash,
                absorbed_frequency=packet.current_frequency,
                emitted_frequency=0.0,
                energy_absorbed=packet.remaining_energy,
                energy_emitted=0.0,
                processing_time_ms=processing_time,
                excitation_state=ExcitationState.GROUND,
                timestamp=time.time()
            )
            final_packet = HarmonicPacket(
                version=packet.version,
                packet_id=packet.packet_id,
                source_tone=packet.source_tone,
                target_tone=packet.target_tone,
                carrier=packet.carrier,
                payload=packet.payload,
                excitation_chain=packet.excitation_chain + [event],
                min_resonance=packet.min_resonance,
                allowed_ratios=packet.allowed_ratios,
                energy_budget=packet.energy_budget,
                hop_limit=packet.hop_limit,
                signature=packet.signature,
                meta=packet.meta
            )
            self.excitation_state = ExcitationState.GROUND
            self.energy_level = 0.0
            return final_packet
        
        return self.process(packet)
    
    def status(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "tone_hash": self.tone_hash,
            "note": self.tone.note_name,
            "fundamental_freq": self.tone.fundamental_freq,
            "octave": self.tone.octave.name,
            "excitation_state": self.excitation_state.state_name,
            "energy_level": self.energy_level,
            "stake": self.stake,
            "connections": len(self.connected_nodes),
            "packets_received": len(self.received_packets),
            "packets_emitted": len(self.emitted_packets)
        }


class HarmonicNetwork:
    """
    The WNSP v7 Harmonic Octave Network.
    
    A mesh of nodes connected by resonance relationships.
    Packets propagate via excitation chains, like light
    reflecting through a hall of mirrors — each mirror
    absorbs and re-emits, slightly transformed.
    """
    
    def __init__(self):
        self.nodes: Dict[str, HarmonicNode] = {}
        self.packet_history: List[HarmonicPacket] = []
        self.network_stats = {
            "packets_created": 0,
            "packets_delivered": 0,
            "packets_dropped": 0,
            "total_energy_consumed": 0.0,
            "average_hops": 0.0
        }
    
    def add_node(self, node_id: str, stake: float = 1.0) -> HarmonicNode:
        node = HarmonicNode(node_id, stake)
        self.nodes[node_id] = node
        
        for other_id, other_node in self.nodes.items():
            if other_id != node_id:
                resonance, _ = node.tone.resonance_with(other_node.tone)
                if resonance > 0.02:
                    node.connect(other_id, other_node.tone)
                    other_node.connect(node_id, node.tone)
        
        return node
    
    def remove_node(self, node_id: str):
        if node_id in self.nodes:
            for other_node in self.nodes.values():
                other_node.disconnect(node_id)
            del self.nodes[node_id]
    
    def get_node(self, node_id: str) -> Optional[HarmonicNode]:
        return self.nodes.get(node_id)
    
    def get_node_by_tone(self, tone_hash: str) -> Optional[HarmonicNode]:
        for node in self.nodes.values():
            if node.tone_hash == tone_hash:
                return node
        return None
    
    def propagate(self, packet: HarmonicPacket, start_node_id: str) -> List[ExcitationEvent]:
        all_events = []
        current_node = self.nodes.get(start_node_id)
        
        if not current_node:
            return all_events
        
        self.network_stats["packets_created"] += 1
        current_packet = packet
        visited = {start_node_id}
        
        while current_packet and current_packet.can_propagate():
            if current_packet.target_tone:
                target_node = self.get_node_by_tone(current_packet.target_tone)
                if target_node and target_node.node_id in current_node.connected_nodes:
                    result = target_node.on_receive(current_packet)
                    if result:
                        all_events.extend(result.excitation_chain[len(current_packet.excitation_chain):])
                    self.network_stats["packets_delivered"] += 1
                    self.packet_history.append(current_packet)
                    break
            
            routes = current_node.find_resonant_routes(current_packet)
            
            next_node = None
            for node_id, resonance, ratio in routes:
                if node_id not in visited:
                    next_node = self.nodes.get(node_id)
                    break
            
            if not next_node:
                self.network_stats["packets_dropped"] += 1
                break
            
            result = next_node.on_receive(current_packet)
            if result:
                all_events.extend(result.excitation_chain[len(current_packet.excitation_chain):])
                current_packet = result
                visited.add(next_node.node_id)
                current_node = next_node
            else:
                break
        
        if current_packet:
            self.network_stats["total_energy_consumed"] += current_packet.total_energy_consumed
            total_packets = self.network_stats["packets_delivered"] + self.network_stats["packets_dropped"]
            if total_packets > 0:
                total_hops = sum(len(p.excitation_chain) for p in self.packet_history)
                self.network_stats["average_hops"] = total_hops / len(self.packet_history) if self.packet_history else 0
        
        return all_events
    
    def broadcast(self, packet: HarmonicPacket, source_node_id: str) -> Dict[str, List[ExcitationEvent]]:
        results = {}
        source_node = self.nodes.get(source_node_id)
        
        if not source_node:
            return results
        
        for node_id in source_node.connected_nodes:
            packet_copy = HarmonicPacket.from_dict(packet.to_dict())
            packet_copy.packet_id = hashlib.sha256(
                f"{packet.packet_id}:{node_id}".encode()
            ).hexdigest()[:16]
            
            events = self.propagate(packet_copy, node_id)
            results[node_id] = events
        
        return results
    
    def network_topology(self) -> Dict[str, Any]:
        topology = {
            "nodes": {},
            "connections": [],
            "octave_distribution": {}
        }
        
        for node_id, node in self.nodes.items():
            topology["nodes"][node_id] = {
                "tone_hash": node.tone_hash,
                "note": node.tone.note_name,
                "octave": node.tone.octave.name,
                "fundamental": node.tone.fundamental_freq
            }
            
            octave_name = node.tone.octave.name
            topology["octave_distribution"][octave_name] = \
                topology["octave_distribution"].get(octave_name, 0) + 1
            
            for conn_id in node.connected_nodes:
                if node_id < conn_id:
                    resonance, ratio = node.tone.resonance_with(
                        self.nodes[conn_id].tone
                    )
                    topology["connections"].append({
                        "from": node_id,
                        "to": conn_id,
                        "resonance": resonance,
                        "ratio": ratio.name
                    })
        
        return topology
    
    def status(self) -> Dict[str, Any]:
        return {
            "total_nodes": len(self.nodes),
            "total_connections": sum(len(n.connected_nodes) for n in self.nodes.values()) // 2,
            "packets_in_history": len(self.packet_history),
            "stats": self.network_stats
        }


def convert_v6_to_v7(v6_packet: Dict[str, Any]) -> HarmonicPacket:
    """
    Backwards compatibility: Convert WNSP v6 packet to v7.
    """
    band_nm = v6_packet.get("band_nm", [400, 700])
    center_wavelength = (band_nm[0] + band_nm[1]) / 2 * 1e-9
    center_freq = SPEED_OF_LIGHT / center_wavelength
    
    complex_samples = v6_packet.get("complex_samples", [])
    if complex_samples:
        amplitude = math.sqrt(sum(s[1]**2 + s[2]**2 for s in complex_samples) / len(complex_samples))
    else:
        amplitude = 1.0
    
    stokes = v6_packet.get("stokes", [1, 0, 0, 0])
    polarization = math.atan2(stokes[2], stokes[1]) if len(stokes) >= 3 else 0.0
    
    carrier = CarrierWave(
        frequency=center_freq,
        amplitude=amplitude,
        phase=0.0,
        polarization_angle=polarization,
        modulation_depth=0.5
    )
    
    harmonics = []
    for i, sample in enumerate(complex_samples[:8]):
        harmonics.append(math.sqrt(sample[1]**2 + sample[2]**2))
    while len(harmonics) < 8:
        harmonics.append(0.0)
    
    payload = HarmonicPayload(
        content_hash=v6_packet.get("pkt_id", "")[:32],
        harmonic_encoding=harmonics,
        timestamp=v6_packet.get("t_start", time.time()),
        authority_level=0
    )
    
    return HarmonicPacket(
        version="wnsp-v7",
        packet_id=v6_packet.get("pkt_id", ""),
        source_tone=v6_packet.get("src_spec", ""),
        target_tone=v6_packet.get("dst_spec"),
        carrier=carrier,
        payload=payload,
        energy_budget=v6_packet.get("energy_budget_j", 1e-6),
        meta={
            "converted_from": "wnsp-v6",
            "original_band": v6_packet.get("meta", {}).get("band", "visible")
        }
    )


def convert_v7_to_v6(v7_packet: HarmonicPacket) -> Dict[str, Any]:
    """
    Backwards compatibility: Convert WNSP v7 packet to v6 format.
    """
    wavelength_nm = (SPEED_OF_LIGHT / v7_packet.carrier.frequency) * 1e9
    
    complex_samples = []
    for i, amp in enumerate(v7_packet.payload.harmonic_encoding):
        wl = wavelength_nm * (1 + i * 0.05)
        phase = v7_packet.carrier.phase + i * 0.1
        real = amp * math.cos(phase)
        imag = amp * math.sin(phase)
        complex_samples.append([wl, real, imag])
    
    pol = v7_packet.carrier.polarization_angle
    stokes = [1.0, math.cos(pol), math.sin(pol), 0.0]
    
    return {
        "version": "wnsp-v6",
        "pkt_id": v7_packet.packet_id,
        "src_spec": v7_packet.source_tone,
        "dst_spec": v7_packet.target_tone,
        "t_start": v7_packet.payload.timestamp,
        "duration_ms": 2.0,
        "band_nm": [wavelength_nm * 0.9, wavelength_nm * 1.1],
        "complex_samples": complex_samples,
        "stokes": stokes,
        "phase_seq_token": f"PSQ-{v7_packet.signature[:24]}-TTL10",
        "coherence_token": f"C-{v7_packet.packet_id}",
        "energy_budget_j": v7_packet.energy_budget,
        "qos": {"latency_ms": 50, "reliability": 0.95},
        "sig": v7_packet.signature,
        "meta": {
            "converted_from": "wnsp-v7",
            "original_octave": v7_packet.current_octave.name,
            **v7_packet.meta
        }
    }


if __name__ == "__main__":
    print("=" * 60)
    print("WNSP v7.0 — Harmonic Octave Protocol")
    print("Energy is vibration. Vibration organizes into octaves.")
    print("=" * 60)
    
    network = HarmonicNetwork()
    
    print("\nCreating harmonic nodes...")
    node_a = network.add_node("alice", stake=1.0)
    node_b = network.add_node("bob", stake=1.0)
    node_c = network.add_node("charlie", stake=0.5)
    node_d = network.add_node("diana", stake=0.8)
    
    print(f"\nNode tones:")
    for node_id, node in network.nodes.items():
        res_b, ratio_b = node.tone.resonance_with(node_b.tone) if node_id != "bob" else (1.0, HarmonicRatio.UNISON)
        print(f"  {node_id}: {node.tone.note_name} @ {node.tone.fundamental_freq:.2f} Hz " +
              f"(Octave {node.tone.octave.name}, resonance with bob: {res_b:.3f} [{ratio_b.name}])")
    
    print("\nNetwork topology:")
    topology = network.network_topology()
    print(f"  Connections: {len(topology['connections'])}")
    for conn in topology['connections'][:5]:
        print(f"    {conn['from']} <-> {conn['to']}: {conn['resonance']:.3f} ({conn['ratio']})")
    
    print("\nCreating test packet...")
    test_data = b"Hello from the harmonic octave network!"
    packet = node_a.create_packet(
        test_data,
        target_tone=node_b.tone_hash,
        authority=0,
        energy_budget=1e-5
    )
    print(f"  Packet ID: {packet.packet_id}")
    print(f"  Carrier: {packet.carrier.frequency:.2e} Hz (Octave {packet.current_octave.name})")
    print(f"  Energy budget: {packet.energy_budget:.2e} J")
    
    print("\nPropagating packet...")
    events = network.propagate(packet, "alice")
    print(f"  Excitation events: {len(events)}")
    for event in events:
        print(f"    Node {event.node_id}: {event.absorbed_frequency:.2e} Hz -> " +
              f"{event.emitted_frequency:.2e} Hz (retained {event.energy_retained:.2e} J)")
    
    print("\nNetwork status:")
    status = network.status()
    print(f"  Total nodes: {status['total_nodes']}")
    print(f"  Packets delivered: {status['stats']['packets_delivered']}")
    print(f"  Total energy consumed: {status['stats']['total_energy_consumed']:.2e} J")
    
    print("\n" + "=" * 60)
    print("WNSP v7.0 — Harmonic Octave Protocol initialized")
    print("\"Energy is alternating wavelength frequency vibration octave tone\"")
    print("=" * 60)
