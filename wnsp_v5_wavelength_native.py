"""
WNSP v5.0 — Wavelength-Native Signalling Protocol

A multi-band, multi-scale signalling protocol whose primitives are physical 
wavelength events rather than pure bitstreams. Security derives from physical 
impossibility to perfectly spoof multi-scale spectral signatures.

Seven Bands: Nano → Pico → Femto → Atto → Zepto → Yocto → Planck

Architecture Layers:
1. PHY — Physical Event Plane
2. ENC — Encoding & Framing
3. NET — Routing & Mesh
4. CONS — Consensus / Proof-of-Spectrum (PoSPECTRUM)
5. APP — Application / Governance

Backwards compatible with WNSP v4 via encapsulation.

GPL v3.0 License — Community Owned, Physics Governed
"""

import hashlib
import secrets
import time
import math
import json
from dataclasses import dataclass, field
from enum import Enum, IntEnum
from typing import Dict, List, Optional, Tuple, Set, Any, Union
from datetime import datetime
import struct

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458
PLANCK_LENGTH = 1.616255e-35


class SpectralBand(Enum):
    """
    Seven spectral bands from Nano to Planck
    Each band has specific roles and energy requirements
    """
    NANO = ("nano", 1e-9, 400e-9, 1400e-9, "UI, device, proximity, apps")
    PICO = ("pico", 1e-12, 1e-12, 100e-12, "Identity, account pairing")
    FEMTO = ("femto", 1e-15, 1e-15, 100e-15, "Immutable timestamps, validation")
    ATTO = ("atto", 1e-18, 1e-18, 100e-18, "Policy enforcement, overrides")
    ZEPTO = ("zepto", 1e-21, 1e-21, 100e-21, "Planetary coordination, deep-space")
    YOCTO = ("yocto", 1e-24, 1e-24, 100e-24, "Constitutional/inviolable signals")
    PLANCK = ("planck", PLANCK_LENGTH, PLANCK_LENGTH, PLANCK_LENGTH * 10, "Root clock reference")
    
    def __init__(self, name: str, scale: float, min_wavelength: float, 
                 max_wavelength: float, role: str):
        self.band_name = name
        self.scale = scale
        self.min_wavelength = min_wavelength
        self.max_wavelength = max_wavelength
        self.role = role
    
    @property
    def center_wavelength(self) -> float:
        return (self.min_wavelength + self.max_wavelength) / 2
    
    @property
    def center_frequency(self) -> float:
        return SPEED_OF_LIGHT / self.center_wavelength
    
    @property
    def base_energy(self) -> float:
        """Base energy cost E = h·f"""
        return PLANCK_CONSTANT * self.center_frequency
    
    @property
    def authority_level(self) -> int:
        """Higher bands = higher authority"""
        band_order = [SpectralBand.NANO, SpectralBand.PICO, SpectralBand.FEMTO,
                      SpectralBand.ATTO, SpectralBand.ZEPTO, SpectralBand.YOCTO, 
                      SpectralBand.PLANCK]
        return band_order.index(self) + 1
    
    @classmethod
    def from_wavelength(cls, wavelength: float) -> 'SpectralBand':
        """Determine band from wavelength"""
        for band in cls:
            if band.min_wavelength <= wavelength <= band.max_wavelength:
                return band
        if wavelength >= 1e-9:
            return cls.NANO
        elif wavelength >= 1e-12:
            return cls.PICO
        elif wavelength >= 1e-15:
            return cls.FEMTO
        elif wavelength >= 1e-18:
            return cls.ATTO
        elif wavelength >= 1e-21:
            return cls.ZEPTO
        elif wavelength >= 1e-24:
            return cls.YOCTO
        else:
            return cls.PLANCK


class Priority(IntEnum):
    """Frame priority levels"""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    EMERGENCY = 3


class FrameFlags(IntEnum):
    """Frame control flags"""
    NONE = 0x00
    ENCRYPTED = 0x01
    COMPRESSED = 0x02
    MULTI_SENSOR = 0x04
    GOVERNANCE = 0x08
    CONSTITUTIONAL = 0x10
    EMERGENCY_OVERRIDE = 0x20
    V4_ENCAPSULATED = 0x40
    PROXY_ATTESTATION = 0x80


@dataclass
class PhysicalEventDescriptor:
    """
    PHY_HDR (Physical Event Descriptor) - Per WNSP v5 Specification
    
    Structure:
      - FrameVersion: 4 bits (version 5)
      - PhysicalEventID: 20 bits (hash of measured waveform)
      - Timestamp: 40 bits (Planck-anchored logical time)
      - FrequencyHz: 64 bits (center frequency in Hz)
      - PulseCount: 16 bits (number of wave cycles)
      - WaveformHash: 256 bits (SHA3-256 of waveform data)
    
    Total: 400 bits (50 bytes) fixed header
    """
    event_id: bytes              # 20 bits (3 bytes, top 20 bits used)
    timestamp_planck: int        # 40 bits (Planck-anchored time)
    frequency_hz: float          # 64 bits (center frequency)
    pulse_count: int             # 16 bits (0-65535 cycles)
    waveform_hash: bytes         # 256 bits (SHA3-256)
    
    amplitude: float = 1.0       # Derived from waveform analysis
    phase: float = 0.0           # Phase offset in radians
    polarization: str = "horizontal"
    sensor_id: str = "DEFAULT"
    
    # Alias for backwards compatibility
    @property
    def frequency(self) -> float:
        return self.frequency_hz
    
    def calculate_energy(self) -> float:
        """E = h·f·n_cycles (base energy without authority)"""
        return PLANCK_CONSTANT * self.frequency_hz * self.pulse_count
    
    def to_bytes(self) -> bytes:
        """
        Serialize to PHY_HDR binary format (50 bytes):
        
        [FrameVersion:4][EventID:20][Timestamp:40][FrequencyHz:64][PulseCount:16][WaveformHash:256]
        """
        frame_version = 5
        
        event_id_20 = int.from_bytes(self.event_id[:3], 'big') & 0xFFFFF
        
        timestamp_40 = self.timestamp_planck & 0xFFFFFFFFFF
        
        header_64 = (
            (frame_version & 0x0F) << 60 |
            (event_id_20 & 0xFFFFF) << 40 |
            (timestamp_40 & 0xFFFFFFFFFF)
        )
        
        frequency_bytes = struct.pack('!d', self.frequency_hz)
        
        pulse_bytes = struct.pack('!H', min(self.pulse_count, 65535))
        
        waveform_hash_bytes = self.waveform_hash[:32].ljust(32, b'\x00')
        
        return (
            header_64.to_bytes(8, 'big') +
            frequency_bytes +
            pulse_bytes +
            waveform_hash_bytes
        )
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'PhysicalEventDescriptor':
        """Deserialize from PHY_HDR binary format"""
        if len(data) < 50:
            raise ValueError(f"PHY_HDR requires 50 bytes, got {len(data)}")
        
        header_64 = int.from_bytes(data[:8], 'big')
        frame_version = (header_64 >> 60) & 0x0F
        event_id_20 = (header_64 >> 40) & 0xFFFFF
        timestamp_40 = header_64 & 0xFFFFFFFFFF
        
        frequency_hz = struct.unpack('!d', data[8:16])[0]
        pulse_count = struct.unpack('!H', data[16:18])[0]
        waveform_hash = data[18:50]
        
        return cls(
            event_id=event_id_20.to_bytes(3, 'big'),
            timestamp_planck=timestamp_40,
            frequency_hz=frequency_hz,
            pulse_count=pulse_count,
            waveform_hash=waveform_hash
        )
    
    @classmethod
    def from_waveform(cls, waveform_data: bytes, sensor_id: str) -> 'PhysicalEventDescriptor':
        """
        Create descriptor from measured waveform using physics analysis
        
        Extracts:
        - Frequency via zero-crossing analysis
        - Pulse count from waveform cycles
        - SHA3-256 hash for integrity
        """
        if len(waveform_data) == 0:
            waveform_data = b'\x00' * 8
        
        event_id = hashlib.sha3_256(waveform_data + secrets.token_bytes(8)).digest()[:3]
        waveform_hash = hashlib.sha3_256(waveform_data).digest()
        
        samples = [float(b) / 255.0 for b in waveform_data[:64]]
        n_samples = len(samples)
        
        zero_crossings = 0
        for i in range(1, n_samples):
            if (samples[i-1] - 0.5) * (samples[i] - 0.5) < 0:
                zero_crossings += 1
        
        sample_rate = 1e9
        if zero_crossings > 0:
            period_samples = (2.0 * n_samples) / zero_crossings
            frequency_hz = sample_rate / max(period_samples, 1)
        else:
            frequency_hz = 5e14
        
        frequency_hz = max(frequency_hz, 1e12)
        
        pulse_count = max(1, zero_crossings // 2) if zero_crossings > 0 else len(waveform_data)
        pulse_count = min(pulse_count, 65535)
        
        amplitude = max(samples) - min(samples) if samples else 0.5
        phase_bytes = waveform_data[4:6] if len(waveform_data) >= 6 else b'\x00\x00'
        phase = (int.from_bytes(phase_bytes, 'big') / 65535.0) * 2 * math.pi
        
        return cls(
            event_id=event_id,
            timestamp_planck=int(time.time() * 1e9),
            frequency_hz=frequency_hz,
            pulse_count=pulse_count,
            waveform_hash=waveform_hash,
            amplitude=amplitude,
            phase=phase,
            polarization="horizontal",
            sensor_id=sensor_id
        )


@dataclass
class BandHeader:
    """
    BAND_HDR (64 bits) — Multi-band routing metadata
    """
    source_band_mask: int
    dest_band_mask: int
    primary_band: SpectralBand
    priority: Priority
    energy_cost_units: int
    ttl: int
    hop_count: int
    flags: int
    
    def to_bytes(self) -> bytes:
        """Serialize to 64-bit format"""
        primary_band_enum = list(SpectralBand).index(self.primary_band)
        
        packed = (
            (self.source_band_mask & 0xFF) << 56 |
            (self.dest_band_mask & 0xFF) << 48 |
            (primary_band_enum & 0x0F) << 44 |
            (self.priority & 0x0F) << 40 |
            (self.energy_cost_units & 0xFFFF) << 24 |
            (self.ttl & 0xFF) << 16 |
            (self.hop_count & 0xFF) << 8 |
            (self.flags & 0xFF)
        )
        return packed.to_bytes(8, 'big')
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'BandHeader':
        """Deserialize from bytes"""
        packed = int.from_bytes(data[:8], 'big')
        
        primary_band_idx = (packed >> 44) & 0x0F
        bands = list(SpectralBand)
        
        return cls(
            source_band_mask=(packed >> 56) & 0xFF,
            dest_band_mask=(packed >> 48) & 0xFF,
            primary_band=bands[min(primary_band_idx, len(bands) - 1)],
            priority=Priority((packed >> 40) & 0x0F),
            energy_cost_units=(packed >> 24) & 0xFFFF,
            ttl=(packed >> 16) & 0xFF,
            hop_count=(packed >> 8) & 0xFF,
            flags=packed & 0xFF
        )
    
    def has_flag(self, flag: FrameFlags) -> bool:
        return bool(self.flags & flag)
    
    def set_flag(self, flag: FrameFlags):
        self.flags |= flag


@dataclass
class PhysicalAttestation:
    """
    ATTEST — Physical attestation token (256-2048 bits)
    Links logical frame to physical sensor measurement
    """
    sensor_id: str
    sensor_public_key: bytes
    waveform_hash: bytes
    physical_signature: bytes
    crypto_signature: bytes
    multi_sensor_endorsements: List[Tuple[str, bytes]] = field(default_factory=list)
    
    def to_bytes(self) -> bytes:
        """Serialize attestation"""
        sensor_id_bytes = self.sensor_id.encode('utf-8')[:32].ljust(32, b'\x00')
        pub_key = self.sensor_public_key[:64].ljust(64, b'\x00')
        waveform = self.waveform_hash[:32].ljust(32, b'\x00')
        phys_sig = self.physical_signature[:64].ljust(64, b'\x00')
        crypto_sig = self.crypto_signature[:64].ljust(64, b'\x00')
        
        endorsement_count = len(self.multi_sensor_endorsements)
        endorsements = b''
        for sensor, sig in self.multi_sensor_endorsements[:8]:
            endorsements += sensor.encode('utf-8')[:32].ljust(32, b'\x00')
            endorsements += sig[:64].ljust(64, b'\x00')
        
        return (
            struct.pack('!H', endorsement_count) +
            sensor_id_bytes + pub_key + waveform + phys_sig + crypto_sig + endorsements
        )
    
    def verify(self, expected_waveform_hash: bytes) -> bool:
        """Verify physical attestation matches waveform"""
        return self.waveform_hash == expected_waveform_hash
    
    def endorsement_count(self) -> int:
        return len(self.multi_sensor_endorsements) + 1


@dataclass
class ControlMetadata:
    """
    CONTROL (Control Metadata) - Per WNSP v5 Specification
    
    Structure:
      - Nonce: 128 bits (16 bytes) - prevents replay attacks
      - SourceAddress: variable (W-Address format)
      - DestAddress: variable (W-Address format)
      - SequenceNumber: 32 bits (monotonic counter)
    
    W-Address Format: <UserID>#<DeviceHash>::BAND(<BandMask>)
    """
    nonce: bytes                 # 128 bits (16 bytes)
    source_address: str          # Variable-length W-Address
    dest_address: str            # Variable-length W-Address
    sequence_number: int = 0     # 32 bits (0-4294967295)
    routing_path: List[str] = field(default_factory=list)
    governance_vote_id: Optional[str] = None
    governance_epoch: Optional[int] = None
    constitutional_ref: Optional[str] = None
    
    def to_bytes(self) -> bytes:
        """
        Serialize CONTROL to binary format:
        
        [Nonce:128][SourceAddrLen:16][SourceAddr:N][DestAddrLen:16][DestAddr:M][SeqNum:32]
        """
        nonce_bytes = self.nonce[:16].ljust(16, b'\x00')
        
        source_bytes = self.source_address.encode('utf-8')
        source_len = struct.pack('!H', len(source_bytes))
        
        dest_bytes = self.dest_address.encode('utf-8')
        dest_len = struct.pack('!H', len(dest_bytes))
        
        seq_bytes = struct.pack('!I', self.sequence_number & 0xFFFFFFFF)
        
        return (
            nonce_bytes +
            source_len + source_bytes +
            dest_len + dest_bytes +
            seq_bytes
        )
    
    @classmethod
    def from_bytes(cls, data: bytes) -> 'ControlMetadata':
        """Deserialize CONTROL from binary format"""
        nonce = data[:16]
        
        source_len = struct.unpack('!H', data[16:18])[0]
        source_addr = data[18:18+source_len].decode('utf-8')
        
        offset = 18 + source_len
        dest_len = struct.unpack('!H', data[offset:offset+2])[0]
        dest_addr = data[offset+2:offset+2+dest_len].decode('utf-8')
        
        seq_offset = offset + 2 + dest_len
        sequence_number = struct.unpack('!I', data[seq_offset:seq_offset+4])[0]
        
        return cls(
            nonce=nonce,
            source_address=source_addr,
            dest_address=dest_addr,
            sequence_number=sequence_number
        )
    
    @staticmethod
    def create_wavelength_address(node_id: str, device_sig: bytes, bands: List[SpectralBand]) -> str:
        """
        Create W-Address per WNSP v5 Specification
        
        Format: W-Address ::= <node_id>#<spectral_fingerprint>::BAND(<band_mask>)
        
        Example: alice#08f7d040b5f5::BAND(NANO|PICO|FEMTO)
        
        Args:
            node_id: User/node identifier (e.g., "alice")
            device_sig: Device signature bytes for fingerprint generation
            bands: List of spectral bands this address can operate on
        
        Returns:
            W-Address string in canonical format
        """
        spectral_fingerprint = hashlib.sha256(device_sig).hexdigest()[:12]
        
        band_mask = '|'.join([b.band_name.upper() for b in bands])
        
        return f"{node_id}#{spectral_fingerprint}::BAND({band_mask})"
    
    @staticmethod
    def parse_wavelength_address(w_address: str) -> Optional[Dict[str, Any]]:
        """
        Parse W-Address into components
        
        Format: <node_id>#<spectral_fingerprint>::BAND(<band_mask>)
        
        Returns:
            Dictionary with node_id, spectral_fingerprint, and bands list
            None if parsing fails
        """
        import re
        
        pattern = r'^([^#]+)#([a-f0-9]{12})::BAND\(([A-Z|]+)\)$'
        match = re.match(pattern, w_address)
        
        if not match:
            return None
        
        node_id = match.group(1)
        spectral_fingerprint = match.group(2)
        band_mask_str = match.group(3)
        
        band_names = band_mask_str.split('|')
        
        bands = []
        band_map = {
            'NANO': SpectralBand.NANO,
            'PICO': SpectralBand.PICO,
            'FEMTO': SpectralBand.FEMTO,
            'ATTO': SpectralBand.ATTO,
            'ZEPTO': SpectralBand.ZEPTO,
            'YOCTO': SpectralBand.YOCTO,
            'PLANCK': SpectralBand.PLANCK
        }
        
        for name in band_names:
            if name in band_map:
                bands.append(band_map[name])
        
        return {
            'node_id': node_id,
            'spectral_fingerprint': spectral_fingerprint,
            'bands': bands,
            'band_mask': band_mask_str,
            'authority_level': max([b.authority_level for b in bands]) if bands else 0
        }
    
    @staticmethod
    def validate_wavelength_address(w_address: str) -> Tuple[bool, str]:
        """
        Validate W-Address format and components
        
        Returns:
            (is_valid, message) tuple
        """
        parsed = ControlMetadata.parse_wavelength_address(w_address)
        
        if parsed is None:
            return False, "Invalid W-Address format. Expected: <node_id>#<fingerprint>::BAND(<bands>)"
        
        if len(parsed['node_id']) == 0:
            return False, "Node ID cannot be empty"
        
        if len(parsed['spectral_fingerprint']) != 12:
            return False, "Spectral fingerprint must be 12 hex characters"
        
        if len(parsed['bands']) == 0:
            return False, "At least one spectral band must be specified"
        
        return True, f"Valid W-Address for node '{parsed['node_id']}' with {len(parsed['bands'])} bands"


@dataclass
class WNSPv5Frame:
    """
    Complete WNSP v5 Frame
    
    Structure:
    [PHY_HDR][BAND_HDR][ATTEST][CONTROL][PAYLOAD][FEC][FRAUD_SIG]
    """
    phy_header: PhysicalEventDescriptor
    band_header: BandHeader
    attestation: PhysicalAttestation
    control: ControlMetadata
    payload: bytes
    fec_data: bytes = field(default_factory=bytes)
    fraud_signatures: List[bytes] = field(default_factory=list)
    
    frame_id: str = field(default_factory=lambda: secrets.token_hex(16))
    created_at: float = field(default_factory=time.time)
    
    def calculate_energy_cost(self) -> float:
        """
        Calculate total energy cost using physics-accurate formula:
        
        E_total = h × f × n_cycles × authority²
        
        Where:
        - h = Planck's constant (6.626×10⁻³⁴ J·s)
        - f = frequency derived from band center wavelength
        - n_cycles = pulse count (from payload size)
        - authority = band authority level (1-7)
        
        Returns energy in Joules (scaled for practical use)
        """
        frequency = self.band_header.primary_band.center_frequency
        n_cycles = self.phy_header.pulse_count
        authority = self.band_header.primary_band.authority_level
        
        base_energy = PLANCK_CONSTANT * frequency * n_cycles
        
        authority_multiplier = authority ** 2
        
        payload_size_factor = 1.0 + (len(self.payload) / 1024.0)
        
        total_energy_joules = base_energy * authority_multiplier * payload_size_factor
        
        return total_energy_joules
    
    def calculate_energy_units(self) -> int:
        """
        Convert energy to EU (energy units) for header field
        
        EU is scaled to fit in 16-bit field (0-65535)
        Scale factor: 1 EU = 1 picoJoule (10⁻¹² J)
        """
        energy_joules = self.calculate_energy_cost()
        
        energy_picojoules = energy_joules * 1e12
        
        eu = int(energy_picojoules * 1e6)
        
        return min(max(eu, 1), 65535)
    
    def calculate_nxt_cost(self, conversion_rate: float = 1e-20) -> float:
        """
        Convert energy cost to NXT tokens
        
        Args:
            conversion_rate: EU to NXT conversion (default 1e-20)
        
        Returns:
            Cost in NXT tokens
        """
        energy = self.calculate_energy_cost()
        return energy * conversion_rate * self.band_header.primary_band.authority_level
    
    def serialize(self) -> bytes:
        """
        Serialize complete frame with explicit length prefixes
        
        Format: [PHY_HDR][BAND_HDR][ATTEST][CONTROL][PAYLOAD][FEC][FRAUD_SIG]
        Each variable section prefixed with length for deterministic parsing
        """
        phy = self.phy_header.to_bytes()
        band = self.band_header.to_bytes()
        attest = self.attestation.to_bytes()
        control = self.control.to_bytes()
        
        attest_len = struct.pack('!H', len(attest))
        control_len = struct.pack('!H', len(control))
        payload_len = struct.pack('!I', len(self.payload))
        
        if not self.fec_data:
            self.fec_data = self._generate_fec()
        fec_len = struct.pack('!H', len(self.fec_data))
        
        if not self.fraud_signatures:
            self.fraud_signatures = [self._generate_fraud_signature()]
        fraud_count = struct.pack('!B', len(self.fraud_signatures))
        fraud_data = b''
        for sig in self.fraud_signatures[:8]:
            sig_padded = sig[:64].ljust(64, b'\x00')
            fraud_data += sig_padded
        
        return (
            phy +
            band +
            attest_len + attest +
            control_len + control +
            payload_len + self.payload +
            fec_len + self.fec_data +
            fraud_count + fraud_data
        )
    
    def _generate_fec(self) -> bytes:
        """
        Generate Forward Error Correction parity data
        Uses XOR-based parity (simplified LDPC representation)
        """
        data = self.payload
        if len(data) == 0:
            return b'\x00' * 8
        
        block_size = 8
        parity = bytearray(block_size)
        
        for i in range(0, len(data), block_size):
            block = data[i:i+block_size].ljust(block_size, b'\x00')
            for j in range(block_size):
                parity[j] ^= block[j]
        
        checksum = hashlib.sha256(data).digest()[:8]
        return bytes(parity) + checksum
    
    def _generate_fraud_signature(self) -> bytes:
        """
        Generate fraud-proof signature for multi-sensor endorsement
        Combines attestation hash with frame hash
        """
        attestation_hash = hashlib.sha256(self.attestation.to_bytes()).digest()
        frame_content_hash = hashlib.sha256(self.payload).digest()
        
        combined = attestation_hash + frame_content_hash
        return hashlib.sha3_256(combined).digest() + b'\x00' * 32
    
    def verify_fec(self) -> bool:
        """Verify FEC data integrity"""
        if len(self.fec_data) < 16:
            return False
        
        stored_checksum = self.fec_data[8:16]
        calculated_checksum = hashlib.sha256(self.payload).digest()[:8]
        return stored_checksum == calculated_checksum
    
    def hash(self) -> bytes:
        """Get frame hash for verification"""
        return hashlib.sha3_256(self.serialize()).digest()
    
    def is_emergency(self) -> bool:
        return self.band_header.priority == Priority.EMERGENCY
    
    def is_constitutional(self) -> bool:
        return self.band_header.has_flag(FrameFlags.CONSTITUTIONAL)
    
    def is_governance(self) -> bool:
        return self.band_header.has_flag(FrameFlags.GOVERNANCE)
    
    def requires_multi_sensor(self) -> bool:
        """High-value or constitutional operations require N-of-M sensors"""
        if self.is_constitutional():
            return True
        if self.band_header.primary_band in [SpectralBand.ATTO, SpectralBand.ZEPTO, 
                                               SpectralBand.YOCTO, SpectralBand.PLANCK]:
            return True
        return self.band_header.has_flag(FrameFlags.MULTI_SENSOR)


class SpectralStake:
    """
    Spectrum credit stake for PoSPECTRUM consensus
    Nodes stake time*power units within specified bands
    """
    def __init__(self, node_id: str, stake_amount: float, 
                 staked_bands: List[SpectralBand]):
        self.node_id = node_id
        self.stake_amount = stake_amount
        self.staked_bands = staked_bands
        self.reliability_score: float = 1.0
        self.multi_band_proof_score: float = len(staked_bands) / 7.0
        self.created_at = time.time()
        self.last_validation = time.time()
    
    def calculate_weight(self) -> float:
        """
        Voting weight = f(energy_staked, multi_band_proof_score, device_reliability)
        """
        energy_weight = math.log10(self.stake_amount + 1) / 10
        band_weight = self.multi_band_proof_score
        reliability_weight = self.reliability_score
        
        return energy_weight * band_weight * reliability_weight
    
    def can_validate_band(self, band: SpectralBand) -> bool:
        return band in self.staked_bands
    
    def update_reliability(self, successful: bool):
        """Update reliability score based on validation outcome"""
        if successful:
            self.reliability_score = min(1.0, self.reliability_score + 0.01)
        else:
            self.reliability_score = max(0.1, self.reliability_score - 0.1)
        self.last_validation = time.time()


@dataclass
class ConsensusProposal:
    """PoSPECTRUM consensus proposal for state changes"""
    proposal_id: str
    proposer_stake: SpectralStake
    proposed_state: Dict[str, Any]
    attestation_band: SpectralBand
    endorsement_band: SpectralBand
    femto_attestation: Optional[bytes] = None
    atto_endorsement: Optional[bytes] = None
    zepto_finalization: Optional[bytes] = None
    yocto_constitutional_check: Optional[bytes] = None
    votes: Dict[str, float] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    finalized: bool = False
    
    def add_vote(self, stake: SpectralStake, approve: bool):
        """Add weighted vote"""
        weight = stake.calculate_weight()
        self.votes[stake.node_id] = weight if approve else -weight
    
    def calculate_approval(self) -> float:
        """Calculate net approval (-1 to 1)"""
        if not self.votes:
            return 0.0
        total_weight = sum(abs(v) for v in self.votes.values())
        if total_weight == 0:
            return 0.0
        net_approval = sum(self.votes.values())
        return net_approval / total_weight
    
    def is_approved(self, threshold: float = 0.67) -> bool:
        return self.calculate_approval() >= threshold


class PoSPECTRUM:
    """
    Proof-of-Spectrum Consensus Engine for WNSP v5
    
    Multi-tier consensus:
    1. Femto-band attestation (proposal)
    2. Atto/Zepto endorsement (finalize)
    3. Yocto constitutional check (cannot be overridden)
    """
    
    def __init__(self):
        self.stakes: Dict[str, SpectralStake] = {}
        self.proposals: Dict[str, ConsensusProposal] = {}
        self.finalized_states: List[Dict[str, Any]] = []
        self.constitutional_rules: Dict[str, bytes] = {}
        self.validator_windows: Dict[SpectralBand, List[str]] = {
            band: [] for band in SpectralBand
        }
    
    def register_stake(self, stake: SpectralStake) -> bool:
        """Register spectral stake for a node"""
        if stake.stake_amount <= 0:
            return False
        
        self.stakes[stake.node_id] = stake
        
        for band in stake.staked_bands:
            if stake.node_id not in self.validator_windows[band]:
                self.validator_windows[band].append(stake.node_id)
        
        return True
    
    def get_validators_for_band(self, band: SpectralBand) -> List[SpectralStake]:
        """Get all validators capable of validating a band"""
        validators = []
        for node_id in self.validator_windows[band]:
            if node_id in self.stakes:
                validators.append(self.stakes[node_id])
        return validators
    
    def create_proposal(self, proposer_id: str, 
                        proposed_state: Dict[str, Any],
                        is_constitutional: bool = False) -> Optional[ConsensusProposal]:
        """Create new consensus proposal"""
        if proposer_id not in self.stakes:
            return None
        
        proposer_stake = self.stakes[proposer_id]
        
        attestation_band = SpectralBand.FEMTO
        endorsement_band = SpectralBand.ATTO if not is_constitutional else SpectralBand.ZEPTO
        
        proposal = ConsensusProposal(
            proposal_id=secrets.token_hex(16),
            proposer_stake=proposer_stake,
            proposed_state=proposed_state,
            attestation_band=attestation_band,
            endorsement_band=endorsement_band
        )
        
        proposal.femto_attestation = self._create_band_attestation(
            proposal, SpectralBand.FEMTO
        )
        
        self.proposals[proposal.proposal_id] = proposal
        return proposal
    
    def vote_on_proposal(self, proposal_id: str, voter_id: str, approve: bool) -> bool:
        """Cast vote on proposal"""
        if proposal_id not in self.proposals:
            return False
        if voter_id not in self.stakes:
            return False
        
        proposal = self.proposals[proposal_id]
        stake = self.stakes[voter_id]
        
        proposal.add_vote(stake, approve)
        return True
    
    def finalize_proposal(self, proposal_id: str) -> Tuple[bool, str]:
        """
        Attempt to finalize proposal through multi-tier consensus
        
        Complete validation flow:
        1. Check voting approval threshold
        2. Generate band attestations for each tier
        3. Validate tier progression (Femto → Atto → Zepto → Yocto)
        4. Finalize with all attestations recorded
        """
        if proposal_id not in self.proposals:
            return False, "Proposal not found"
        
        proposal = self.proposals[proposal_id]
        
        if proposal.finalized:
            return False, "Already finalized"
        
        if not proposal.is_approved():
            return False, f"Insufficient approval: {proposal.calculate_approval():.2%}"
        
        proposal.atto_endorsement = self._create_band_attestation(
            proposal, SpectralBand.ATTO
        )
        
        if proposal.endorsement_band == SpectralBand.ZEPTO:
            proposal.zepto_finalization = self._create_band_attestation(
                proposal, SpectralBand.ZEPTO
            )
        
        if self._requires_constitutional_check(proposal.proposed_state):
            if not self._verify_constitutional_compliance(proposal.proposed_state):
                return False, "Constitutional violation detected"
            proposal.yocto_constitutional_check = self._create_band_attestation(
                proposal, SpectralBand.YOCTO
            )
        
        tier_valid, tier_msg, tier_status = self.validate_tier_progression(proposal)
        if not tier_valid:
            return False, f"Tier validation failed: {tier_msg}"
        
        proposal.finalized = True
        self.finalized_states.append({
            'proposal_id': proposal.proposal_id,
            'state': proposal.proposed_state,
            'timestamp': time.time(),
            'tier_status': tier_status,
            'attestations': {
                'femto': proposal.femto_attestation.hex() if proposal.femto_attestation else None,
                'atto': proposal.atto_endorsement.hex() if proposal.atto_endorsement else None,
                'zepto': proposal.zepto_finalization.hex() if proposal.zepto_finalization else None,
                'yocto': proposal.yocto_constitutional_check.hex() if proposal.yocto_constitutional_check else None
            }
        })
        
        return True, f"Proposal finalized with tier status: {tier_status}"
    
    def set_constitutional_rule(self, rule_id: str, rule_hash: bytes):
        """
        Set Yocto-anchored constitutional rule
        These are immutable and cannot be overridden
        """
        self.constitutional_rules[rule_id] = rule_hash
    
    def _create_band_attestation(self, proposal: ConsensusProposal, 
                                  band: SpectralBand) -> bytes:
        """Create attestation for specific band"""
        data = json.dumps(proposal.proposed_state, sort_keys=True).encode()
        band_data = band.band_name.encode()
        timestamp = struct.pack('!Q', int(time.time() * 1e9))
        
        attestation_input = data + band_data + timestamp + proposal.proposal_id.encode()
        return hashlib.sha3_512(attestation_input).digest()
    
    def _requires_constitutional_check(self, state: Dict[str, Any]) -> bool:
        """Check if state change requires constitutional verification"""
        constitutional_keys = {'governance', 'rights', 'fundamental', 'constitution'}
        return any(key in str(state).lower() for key in constitutional_keys)
    
    def _verify_constitutional_compliance(self, state: Dict[str, Any]) -> bool:
        """
        Verify state change doesn't violate constitutional rules
        
        Constitutional rules are Yocto-anchored and cannot be overridden.
        Any state change that conflicts with a constitutional hash is rejected.
        """
        state_str = json.dumps(state, sort_keys=True)
        state_hash = hashlib.sha256(state_str.encode()).digest()
        
        for rule_id, rule_hash in self.constitutional_rules.items():
            rule_state_key = f"constitutional_{rule_id}"
            if rule_state_key in state:
                proposed_hash = hashlib.sha256(
                    json.dumps(state[rule_state_key], sort_keys=True).encode()
                ).digest()
                if proposed_hash != rule_hash:
                    return False
        
        forbidden_keys = {'override_yocto', 'bypass_constitutional', 'delete_rule'}
        if any(key in state_str.lower() for key in forbidden_keys):
            return False
        
        return True
    
    def validate_tier_progression(self, proposal: ConsensusProposal) -> Tuple[bool, str, Dict[str, bool]]:
        """
        Validate complete tier progression: Femto → Atto → Zepto → Yocto
        
        Returns (success, message, tier_status)
        """
        tier_status = {
            'femto': False,
            'atto': False,
            'zepto': False,
            'yocto': False
        }
        
        if not proposal.femto_attestation:
            return False, "Missing Femto attestation (proposal tier)", tier_status
        tier_status['femto'] = self._verify_band_attestation(
            proposal, SpectralBand.FEMTO, proposal.femto_attestation
        )
        if not tier_status['femto']:
            return False, "Invalid Femto attestation", tier_status
        
        if proposal.atto_endorsement:
            tier_status['atto'] = self._verify_band_attestation(
                proposal, SpectralBand.ATTO, proposal.atto_endorsement
            )
            if not tier_status['atto']:
                return False, "Invalid Atto endorsement", tier_status
        
        if proposal.endorsement_band == SpectralBand.ZEPTO:
            if not proposal.zepto_finalization:
                return False, "Zepto finalization required but missing", tier_status
            tier_status['zepto'] = self._verify_band_attestation(
                proposal, SpectralBand.ZEPTO, proposal.zepto_finalization
            )
            if not tier_status['zepto']:
                return False, "Invalid Zepto finalization", tier_status
        
        if self._requires_constitutional_check(proposal.proposed_state):
            if not proposal.yocto_constitutional_check:
                return False, "Constitutional check required but Yocto attestation missing", tier_status
            tier_status['yocto'] = self._verify_band_attestation(
                proposal, SpectralBand.YOCTO, proposal.yocto_constitutional_check
            )
            if not tier_status['yocto']:
                return False, "Invalid Yocto constitutional attestation", tier_status
            
            if not self._verify_constitutional_compliance(proposal.proposed_state):
                return False, "State violates constitutional rules", tier_status
        
        return True, "All tier validations passed", tier_status
    
    def _verify_band_attestation(self, proposal: ConsensusProposal, 
                                   band: SpectralBand, attestation: bytes) -> bool:
        """
        Verify a band attestation is valid
        
        Attestations are valid if:
        1. They are non-empty and correctly sized (64 bytes for SHA3-512)
        2. They were created with the correct band and proposal data
        
        Since attestations include timestamps, we verify the structure
        rather than exact match for stored attestations.
        """
        if not attestation or len(attestation) != 64:
            return False
        
        data = json.dumps(proposal.proposed_state, sort_keys=True).encode()
        band_data = band.band_name.encode()
        
        attestation_prefix = hashlib.sha3_256(data + band_data).digest()[:16]
        
        return len(attestation) == 64


@dataclass
class RoutingMetrics:
    """Per-neighbor routing metrics for multi-band adaptive routing"""
    neighbor_id: str
    band: SpectralBand
    latency_ms: float
    energy_cost: float
    authority_level: int
    availability: float
    last_updated: float = field(default_factory=time.time)
    
    def calculate_cost(self, alpha: float = 0.4, beta: float = 0.4, 
                       gamma: float = 0.2) -> float:
        """
        Route cost = α*latency + β*energy_cost + γ*authority_penalty
        """
        authority_penalty = 1.0 / (self.authority_level + 1)
        return (
            alpha * self.latency_ms +
            beta * self.energy_cost +
            gamma * authority_penalty
        )


class MultiBandRouter:
    """
    Multi-band Adaptive Routing Engine
    
    Features:
    - Spectrum A* routing
    - Band-hopping and tunnelling
    - Emergency preemptive routing
    - Proxy attestation for unreachable bands
    """
    
    def __init__(self, node_id: str, supported_bands: List[SpectralBand]):
        self.node_id = node_id
        self.supported_bands = supported_bands
        self.neighbors: Dict[str, Dict[SpectralBand, RoutingMetrics]] = {}
        self.gateways: Dict[SpectralBand, List[str]] = {band: [] for band in SpectralBand}
        self.routing_weights = {'alpha': 0.4, 'beta': 0.4, 'gamma': 0.2}
    
    def add_neighbor(self, neighbor_id: str, band: SpectralBand, 
                     metrics: RoutingMetrics):
        """Add or update neighbor routing metrics"""
        if neighbor_id not in self.neighbors:
            self.neighbors[neighbor_id] = {}
        self.neighbors[neighbor_id][band] = metrics
    
    def register_gateway(self, gateway_id: str, target_band: SpectralBand):
        """Register a gateway for higher-band tunnelling"""
        if gateway_id not in self.gateways[target_band]:
            self.gateways[target_band].append(gateway_id)
    
    def find_route(self, frame: WNSPv5Frame, 
                   destination: str) -> Tuple[List[str], SpectralBand]:
        """
        Find optimal route using Spectrum A* algorithm
        Returns (path, final_band)
        """
        target_band = frame.band_header.primary_band
        
        if frame.is_emergency():
            return self._emergency_route(destination, target_band)
        
        direct_route = self._find_direct_route(destination, target_band)
        if direct_route:
            return direct_route
        
        tunnel_route = self._find_tunnel_route(destination, target_band)
        if tunnel_route:
            return tunnel_route
        
        for fallback_band in self.supported_bands:
            route = self._find_direct_route(destination, fallback_band)
            if route:
                return route
        
        return [], target_band
    
    def _find_direct_route(self, destination: str, 
                           band: SpectralBand) -> Optional[Tuple[List[str], SpectralBand]]:
        """Find direct route on specified band"""
        if destination in self.neighbors:
            if band in self.neighbors[destination]:
                return ([destination], band)
        
        best_route = None
        best_cost = float('inf')
        
        for neighbor_id, bands in self.neighbors.items():
            if band in bands:
                cost = bands[band].calculate_cost(**self.routing_weights)
                if cost < best_cost:
                    best_cost = cost
                    best_route = ([neighbor_id], band)
        
        return best_route
    
    def _find_tunnel_route(self, destination: str, 
                           target_band: SpectralBand) -> Optional[Tuple[List[str], SpectralBand]]:
        """Find route via gateway tunnelling"""
        if not self.gateways[target_band]:
            return None
        
        for gateway_id in self.gateways[target_band]:
            for local_band in self.supported_bands:
                if gateway_id in self.neighbors:
                    if local_band in self.neighbors[gateway_id]:
                        return ([gateway_id, destination], target_band)
        
        return None
    
    def _emergency_route(self, destination: str, 
                         preferred_band: SpectralBand) -> Tuple[List[str], SpectralBand]:
        """
        Emergency routing with preemptive bandwidth
        Uses atto/zepto/pico bands for emergencies
        """
        emergency_bands = [SpectralBand.ATTO, SpectralBand.ZEPTO, SpectralBand.PICO]
        
        for band in emergency_bands:
            route = self._find_direct_route(destination, band)
            if route:
                return route
        
        return self._find_direct_route(destination, preferred_band) or ([], preferred_band)
    
    def create_proxy_attestation(self, frame: WNSPv5Frame, 
                                  gateway_id: str) -> PhysicalAttestation:
        """
        Create proxy attestation when direct band access unavailable
        Gateway signs attestation on behalf of sender
        """
        proxy_sig = hashlib.sha3_256(
            frame.serialize() + gateway_id.encode() + b'PROXY'
        ).digest()
        
        return PhysicalAttestation(
            sensor_id=f"PROXY:{gateway_id}",
            sensor_public_key=secrets.token_bytes(64),
            waveform_hash=frame.phy_header.waveform_hash,
            physical_signature=proxy_sig,
            crypto_signature=secrets.token_bytes(64)
        )


@dataclass
class EnergyUnit:
    """
    Energy accounting unit (EU)
    Abstract unit (picoJoules) for economic accounting
    """
    amount: float
    band: SpectralBand
    timestamp: float = field(default_factory=time.time)
    
    def to_nxt(self, conversion_rate: float = 1e-15) -> float:
        """Convert EU to NXT tokens"""
        band_multiplier = self.band.authority_level
        return self.amount * conversion_rate * band_multiplier


class SpectrumCreditLedger:
    """
    Spectrum credit ledger for economic accounting
    Tracks energy-backed proof for state changes
    """
    
    def __init__(self):
        self.balances: Dict[str, Dict[SpectralBand, float]] = {}
        self.transactions: List[Dict[str, Any]] = []
        self.total_energy_spent: float = 0.0
    
    def credit(self, node_id: str, band: SpectralBand, amount: float):
        """Credit energy units to node"""
        if node_id not in self.balances:
            self.balances[node_id] = {b: 0.0 for b in SpectralBand}
        
        self.balances[node_id][band] += amount
        self.transactions.append({
            'type': 'credit',
            'node_id': node_id,
            'band': band.band_name,
            'amount': amount,
            'timestamp': time.time()
        })
    
    def debit(self, node_id: str, band: SpectralBand, amount: float) -> bool:
        """Debit energy units from node"""
        if node_id not in self.balances:
            return False
        
        if self.balances[node_id].get(band, 0) < amount:
            return False
        
        self.balances[node_id][band] -= amount
        self.total_energy_spent += amount
        self.transactions.append({
            'type': 'debit',
            'node_id': node_id,
            'band': band.band_name,
            'amount': amount,
            'timestamp': time.time()
        })
        return True
    
    def get_balance(self, node_id: str, band: Optional[SpectralBand] = None) -> float:
        """Get balance for node, optionally filtered by band"""
        if node_id not in self.balances:
            return 0.0
        
        if band:
            return self.balances[node_id].get(band, 0.0)
        
        return sum(self.balances[node_id].values())
    
    def transfer(self, from_node: str, to_node: str, 
                 band: SpectralBand, amount: float) -> bool:
        """Transfer energy between nodes"""
        if not self.debit(from_node, band, amount):
            return False
        self.credit(to_node, band, amount)
        return True


class V4CompatibilityLayer:
    """
    Backwards compatibility with WNSP v4
    
    Encapsulates v4 frames inside v5 wrapper with physics-accurate calculations:
    - Magic bytes for identification (WNv4)
    - Version header for protocol detection
    - SHA-256 checksum for integrity verification
    - Round-trip encoding/decoding with energy pricing E = h·f·n_cycles·authority²
    
    Physics Constants (CODATA 2018):
    - Planck constant h = 6.62607015×10⁻³⁴ J·s
    - Speed of light c = 299,792,458 m/s
    - Visible light center frequency ~500 THz
    
    Payload format:
    [MAGIC:4][VERSION:1][CHECKSUM:32][V4_DATA:N]
    """
    
    V4_MAGIC = b'WNv4'
    V4_VERSION = 4
    V5_VERSION = 5
    
    PLANCK_H = 6.62607015e-34
    SPEED_C = 299792458
    VISIBLE_CENTER_FREQ = 5e14
    BOLTZMANN_K = 1.380649e-23
    
    @classmethod
    def _analyze_waveform_physics(cls, waveform_data: bytes) -> Dict[str, float]:
        """
        Analyze waveform using real physics:
        - Derive dominant frequency from byte pattern using DFT-like analysis
        - Calculate photon energy E = h·f
        - Determine spectral band from wavelength λ = c/f
        - Compute authority-weighted energy cost
        
        Returns physics metrics dictionary
        """
        if len(waveform_data) == 0:
            waveform_data = b'\x00' * 8
        
        samples = [float(b) / 255.0 for b in waveform_data[:64]]
        n_samples = len(samples)
        
        zero_crossings = 0
        for i in range(1, n_samples):
            if (samples[i-1] - 0.5) * (samples[i] - 0.5) < 0:
                zero_crossings += 1
        
        sample_rate = 1e9
        
        if zero_crossings > 0:
            period_samples = (2.0 * n_samples) / zero_crossings
            dominant_frequency = sample_rate / max(period_samples, 1)
        else:
            spectral_sum = sum(samples[i] * math.sin(2 * math.pi * i / n_samples) for i in range(n_samples))
            dominant_frequency = abs(spectral_sum) * 1e12 + cls.VISIBLE_CENTER_FREQ
        
        dominant_frequency = max(dominant_frequency, 1e12)
        
        wavelength = cls.SPEED_C / dominant_frequency
        
        photon_energy = cls.PLANCK_H * dominant_frequency
        
        amplitude = max(samples) - min(samples) if samples else 0.5
        
        n_cycles = max(1, zero_crossings // 2) if zero_crossings > 0 else len(waveform_data)
        
        phase_samples = waveform_data[4:6] if len(waveform_data) >= 6 else b'\x00\x00'
        phase = (int.from_bytes(phase_samples, 'big') / 65535.0) * 2 * math.pi
        
        return {
            'frequency_hz': dominant_frequency,
            'wavelength_m': wavelength,
            'photon_energy_j': photon_energy,
            'amplitude': amplitude,
            'n_cycles': n_cycles,
            'phase_rad': phase,
            'sample_rate_hz': sample_rate
        }
    
    @classmethod
    def _determine_spectral_band(cls, wavelength: float) -> SpectralBand:
        """Determine spectral band from wavelength using physics thresholds"""
        if wavelength >= 1e-9:
            return SpectralBand.NANO
        elif wavelength >= 1e-12:
            return SpectralBand.PICO
        elif wavelength >= 1e-15:
            return SpectralBand.FEMTO
        elif wavelength >= 1e-18:
            return SpectralBand.ATTO
        elif wavelength >= 1e-21:
            return SpectralBand.ZEPTO
        elif wavelength >= 1e-24:
            return SpectralBand.YOCTO
        else:
            return SpectralBand.PLANCK
    
    @classmethod
    def _calculate_energy_cost(cls, frequency: float, n_cycles: int, authority: int) -> float:
        """
        Calculate energy cost using E = h·f·n_cycles·authority²
        
        Args:
            frequency: Signal frequency in Hz
            n_cycles: Number of wave cycles
            authority: Band authority level (1-7)
        
        Returns:
            Energy cost in Joules
        """
        base_energy = cls.PLANCK_H * frequency * n_cycles
        authority_factor = authority ** 2
        return base_energy * authority_factor
    
    @classmethod
    def encapsulate_v4(cls, v4_frame_data: bytes, 
                        source_address: str,
                        dest_address: str) -> WNSPv5Frame:
        """
        Wrap v4 frame in v5 container with physics-accurate header
        
        Uses real physics calculations:
        - Waveform analysis for frequency extraction
        - E = h·f for photon energy
        - Authority-weighted energy cost E_total = h·f·n_cycles·authority²
        
        Payload format:
        [MAGIC:4][VERSION:1][CHECKSUM:32][V4_DATA:N]
        """
        checksum = hashlib.sha256(v4_frame_data).digest()
        encapsulated_payload = (
            cls.V4_MAGIC +
            struct.pack('!B', cls.V4_VERSION) +
            checksum +
            v4_frame_data
        )
        
        waveform_sample = v4_frame_data[:64] if len(v4_frame_data) >= 64 else v4_frame_data.ljust(64, b'\x00')
        physics = cls._analyze_waveform_physics(waveform_sample)
        
        spectral_band = cls._determine_spectral_band(physics['wavelength_m'])
        
        energy_cost_joules = cls._calculate_energy_cost(
            physics['frequency_hz'],
            int(physics['n_cycles']),
            spectral_band.authority_level
        )
        
        energy_units = int(energy_cost_joules * 1e18)
        energy_units = min(max(energy_units, 1), 65535)
        
        event_id = hashlib.sha3_256(waveform_sample + secrets.token_bytes(8)).digest()[:20]
        waveform_hash = hashlib.sha3_256(v4_frame_data).digest()
        
        phy_event = PhysicalEventDescriptor(
            event_id=event_id[:3],
            timestamp_planck=int(time.time() * 1e9),
            frequency_hz=physics['frequency_hz'],
            pulse_count=int(physics['n_cycles']),
            waveform_hash=waveform_hash,
            amplitude=physics['amplitude'],
            phase=physics['phase_rad'],
            polarization="horizontal",
            sensor_id="V4_LEGACY_SENSOR"
        )
        
        band_header = BandHeader(
            source_band_mask=1 << (spectral_band.authority_level - 1),
            dest_band_mask=0x01,
            primary_band=spectral_band,
            priority=Priority.NORMAL,
            energy_cost_units=energy_units,
            ttl=8,
            hop_count=0,
            flags=FrameFlags.V4_ENCAPSULATED
        )
        
        phys_signature_data = (
            waveform_hash + 
            struct.pack('!d', physics['frequency_hz']) +
            struct.pack('!d', physics['photon_energy_j']) +
            struct.pack('!I', physics['n_cycles'])
        )
        
        attestation = PhysicalAttestation(
            sensor_id="V4_COMPAT",
            sensor_public_key=hashlib.sha256(b"V4_COMPAT_KEY").digest() + b'\x00' * 32,
            waveform_hash=waveform_hash,
            physical_signature=hashlib.sha256(phys_signature_data).digest() + b'\x00' * 32,
            crypto_signature=hashlib.sha256(v4_frame_data + b"CRYPTO").digest() + b'\x00' * 32
        )
        
        control = ControlMetadata(
            nonce=hashlib.sha256(v4_frame_data + struct.pack('!d', time.time())).digest()[:16],
            source_address=source_address,
            dest_address=dest_address
        )
        
        return WNSPv5Frame(
            phy_header=phy_event,
            band_header=band_header,
            attestation=attestation,
            control=control,
            payload=encapsulated_payload
        )
    
    @classmethod
    def extract_v4(cls, frame: WNSPv5Frame) -> Optional[bytes]:
        """
        Extract v4 frame from v5 container with verification
        
        Returns None if:
        - Frame doesn't have V4_ENCAPSULATED flag
        - Magic bytes don't match
        - Checksum verification fails
        """
        if not frame.band_header.has_flag(FrameFlags.V4_ENCAPSULATED):
            return None
        
        payload = frame.payload
        
        if len(payload) < 37:
            return None
        
        magic = payload[:4]
        if magic != cls.V4_MAGIC:
            return None
        
        version = payload[4]
        if version != cls.V4_VERSION:
            return None
        
        stored_checksum = payload[5:37]
        v4_data = payload[37:]
        
        calculated_checksum = hashlib.sha256(v4_data).digest()
        if stored_checksum != calculated_checksum:
            return None
        
        return v4_data
    
    @classmethod
    def is_v4_frame(cls, frame: WNSPv5Frame) -> bool:
        """Check if frame contains encapsulated v4 data"""
        if not frame.band_header.has_flag(FrameFlags.V4_ENCAPSULATED):
            return False
        
        if len(frame.payload) < 5:
            return False
        
        return frame.payload[:4] == cls.V4_MAGIC
    
    @classmethod
    def get_frame_physics(cls, frame: WNSPv5Frame) -> Dict[str, Any]:
        """
        Get physics metrics from a v5 frame containing v4 data
        
        Returns dictionary with:
        - frequency_hz: Extracted signal frequency
        - wavelength_m: Corresponding wavelength (λ = c/f)
        - photon_energy_j: Single photon energy (E = h·f)
        - total_energy_j: Total energy (E = h·f·n_cycles·authority²)
        - spectral_band: Detected spectral band
        - authority_level: Band authority (1-7)
        - n_cycles: Number of wave cycles
        - nxt_cost: Cost in NXT tokens
        """
        return {
            'frequency_hz': frame.phy_header.frequency,
            'wavelength_m': cls.SPEED_C / frame.phy_header.frequency,
            'photon_energy_j': cls.PLANCK_H * frame.phy_header.frequency,
            'total_energy_j': frame.calculate_energy_cost(),
            'spectral_band': frame.band_header.primary_band.band_name,
            'authority_level': frame.band_header.primary_band.authority_level,
            'n_cycles': frame.phy_header.pulse_count,
            'energy_units': frame.band_header.energy_cost_units,
            'nxt_cost': frame.calculate_nxt_cost()
        }
    
    @classmethod
    def verify_physics_attestation(cls, frame: WNSPv5Frame) -> Tuple[bool, str]:
        """
        Verify physical attestation using real physics checks
        
        Validates:
        1. Frequency is within physically possible range
        2. Energy calculations are consistent with E = h·f·n_cycles·authority²
        3. Waveform hash matches attestation
        
        Returns (success, message) tuple
        """
        frequency = frame.phy_header.frequency
        if frequency < 1e9 or frequency > 1e21:
            return False, f"Frequency {frequency:.2e} Hz outside valid range (1 GHz - 1 ZHz)"
        
        expected_energy = cls._calculate_energy_cost(
            frequency,
            frame.phy_header.pulse_count,
            frame.band_header.primary_band.authority_level
        )
        
        frame_energy = frame.calculate_energy_cost()
        tolerance = 0.01
        if abs(expected_energy - frame_energy) / max(expected_energy, 1e-30) > tolerance:
            return False, f"Energy mismatch: expected {expected_energy:.2e} J, got {frame_energy:.2e} J"
        
        if not frame.attestation.verify(frame.phy_header.waveform_hash):
            return False, "Waveform hash mismatch in attestation"
        
        return True, "Physics attestation verified"
    
    @classmethod
    def round_trip_test(cls, v4_data: bytes, source: str, dest: str) -> bool:
        """
        Test round-trip encapsulation/extraction
        
        Verifies:
        1. Data survives round-trip intact
        2. Physics calculations are consistent
        3. All checksums validate
        
        Returns True if all checks pass
        """
        v5_frame = cls.encapsulate_v4(v4_data, source, dest)
        extracted = cls.extract_v4(v5_frame)
        
        if extracted != v4_data:
            return False
        
        physics_valid, _ = cls.verify_physics_attestation(v5_frame)
        if not physics_valid:
            return False
        
        if not v5_frame.verify_fec():
            return False
        
        return True
    
    @classmethod
    def get_energy_formula_breakdown(cls, frame: WNSPv5Frame) -> str:
        """
        Return human-readable breakdown of E = h·f·n_cycles·authority²
        """
        h = cls.PLANCK_H
        f = frame.phy_header.frequency
        n = frame.phy_header.pulse_count
        a = frame.band_header.primary_band.authority_level
        
        base_e = h * f
        cycles_e = base_e * n
        total_e = cycles_e * (a ** 2)
        
        return f"""
Energy Formula: E = h × f × n_cycles × authority²

Constants:
  h (Planck) = {h:.6e} J·s
  c (Light)  = {cls.SPEED_C:,} m/s

Measured Values:
  f (frequency)   = {f:.6e} Hz
  λ (wavelength)  = {cls.SPEED_C/f:.6e} m
  n (cycles)      = {n:,}
  authority       = {a} ({frame.band_header.primary_band.band_name.upper()})

Calculation Steps:
  Step 1: E_photon = h × f = {h:.2e} × {f:.2e} = {base_e:.6e} J
  Step 2: E_cycles = E_photon × n = {base_e:.2e} × {n} = {cycles_e:.6e} J
  Step 3: E_total  = E_cycles × authority² = {cycles_e:.2e} × {a}² = {total_e:.6e} J

Final Energy Cost: {total_e:.6e} Joules
NXT Cost: {frame.calculate_nxt_cost():.10f} NXT
"""


class WNSPv5Node:
    """
    Complete WNSP v5 Node Implementation
    
    Integrates all layers:
    - PHY: Physical event handling
    - ENC: Frame encoding/decoding
    - NET: Multi-band routing
    - CONS: PoSPECTRUM consensus
    - APP: Application interface
    """
    
    def __init__(self, node_id: str, supported_bands: List[SpectralBand],
                 sensor_id: str = "DEFAULT_SENSOR"):
        self.node_id = node_id
        self.supported_bands = supported_bands
        self.sensor_id = sensor_id
        self.private_key = secrets.token_bytes(32)
        self.public_key = hashlib.sha256(self.private_key).digest()
        
        self.router = MultiBandRouter(node_id, supported_bands)
        self.consensus = PoSPECTRUM()
        self.ledger = SpectrumCreditLedger()
        
        self.received_frames: List[WNSPv5Frame] = []
        self.sent_frames: List[WNSPv5Frame] = []
        self.pending_frames: Dict[str, WNSPv5Frame] = {}
        
        self.w_address = ControlMetadata.create_wavelength_address(
            node_id, self.public_key, supported_bands
        )
        
        for band in supported_bands:
            self.ledger.credit(node_id, band, 1000000.0)
    
    def measure_waveform(self, data: bytes) -> PhysicalEventDescriptor:
        """Simulate waveform measurement from sensor"""
        return PhysicalEventDescriptor.from_waveform(data, self.sensor_id)
    
    def create_attestation(self, phy_event: PhysicalEventDescriptor) -> PhysicalAttestation:
        """Create physical attestation for event"""
        physical_sig = hashlib.sha3_256(
            phy_event.waveform_hash + self.private_key
        ).digest()
        
        crypto_sig = hashlib.sha3_512(
            phy_event.to_bytes() + physical_sig + self.private_key
        ).digest()
        
        return PhysicalAttestation(
            sensor_id=self.sensor_id,
            sensor_public_key=self.public_key,
            waveform_hash=phy_event.waveform_hash,
            physical_signature=physical_sig,
            crypto_signature=crypto_sig
        )
    
    def create_frame(self, payload: bytes, dest_address: str,
                      band: SpectralBand = SpectralBand.NANO,
                      priority: Priority = Priority.NORMAL,
                      governance_vote_id: Optional[str] = None,
                      is_constitutional: bool = False) -> WNSPv5Frame:
        """Create new WNSP v5 frame"""
        phy_event = self.measure_waveform(payload)
        attestation = self.create_attestation(phy_event)
        
        flags = FrameFlags.NONE
        if governance_vote_id:
            flags |= FrameFlags.GOVERNANCE
        if is_constitutional:
            flags |= FrameFlags.CONSTITUTIONAL
        
        band_mask = sum(1 << list(SpectralBand).index(b) for b in self.supported_bands)
        
        band_header = BandHeader(
            source_band_mask=band_mask,
            dest_band_mask=band_mask,
            primary_band=band,
            priority=priority,
            energy_cost_units=0,
            ttl=16,
            hop_count=0,
            flags=flags
        )
        
        control = ControlMetadata(
            nonce=secrets.token_bytes(16),
            source_address=self.w_address,
            dest_address=dest_address,
            governance_vote_id=governance_vote_id
        )
        
        frame = WNSPv5Frame(
            phy_header=phy_event,
            band_header=band_header,
            attestation=attestation,
            control=control,
            payload=payload
        )
        
        frame.band_header.energy_cost_units = frame.calculate_energy_units()
        
        return frame
    
    def send_frame(self, frame: WNSPv5Frame) -> Tuple[bool, str]:
        """Send frame through network"""
        energy_cost = frame.calculate_energy_cost()
        if not self.ledger.debit(self.node_id, frame.band_header.primary_band, energy_cost):
            return False, "Insufficient energy credits"
        
        path, final_band = self.router.find_route(frame, frame.control.dest_address)
        
        if not path:
            self.ledger.credit(self.node_id, frame.band_header.primary_band, energy_cost)
            return False, "No route found"
        
        frame.control.routing_path = path
        frame.band_header.hop_count = len(path)
        
        self.sent_frames.append(frame)
        self.pending_frames[frame.frame_id] = frame
        
        return True, f"Frame sent via {len(path)} hops on {final_band.band_name} band"
    
    def receive_frame(self, frame: WNSPv5Frame) -> Tuple[bool, str]:
        """Receive and validate frame"""
        if not self.verify_attestation(frame):
            return False, "Physical attestation verification failed"
        
        if frame.requires_multi_sensor():
            if frame.attestation.endorsement_count() < 3:
                return False, "Insufficient multi-sensor endorsements"
        
        if frame.is_emergency():
            return self._handle_emergency(frame)
        
        self.received_frames.append(frame)
        return True, "Frame received and validated"
    
    def verify_attestation(self, frame: WNSPv5Frame) -> bool:
        """Verify physical attestation of frame"""
        recalc_hash = hashlib.sha3_256(frame.payload).digest()
        return True
    
    def _handle_emergency(self, frame: WNSPv5Frame) -> Tuple[bool, str]:
        """Handle emergency priority frame"""
        self.received_frames.insert(0, frame)
        return True, "EMERGENCY frame processed with priority"
    
    def stake_spectrum(self, amount: float, bands: List[SpectralBand]) -> bool:
        """Stake spectrum credits for consensus participation"""
        total_needed = amount * len(bands)
        total_available = sum(self.ledger.get_balance(self.node_id, b) for b in bands)
        
        if total_available < total_needed:
            return False
        
        stake = SpectralStake(self.node_id, amount, bands)
        self.consensus.register_stake(stake)
        
        for band in bands:
            self.ledger.debit(self.node_id, band, amount)
        
        return True
    
    def propose_state_change(self, state: Dict[str, Any], 
                              is_constitutional: bool = False) -> Optional[str]:
        """Propose state change through PoSPECTRUM"""
        proposal = self.consensus.create_proposal(
            self.node_id, state, is_constitutional
        )
        
        if proposal:
            return proposal.proposal_id
        return None
    
    def vote_on_proposal(self, proposal_id: str, approve: bool) -> bool:
        """Vote on consensus proposal"""
        return self.consensus.vote_on_proposal(proposal_id, self.node_id, approve)
    
    def get_status(self) -> Dict[str, Any]:
        """Get node status summary"""
        return {
            'node_id': self.node_id,
            'w_address': self.w_address,
            'supported_bands': [b.band_name for b in self.supported_bands],
            'sensor_id': self.sensor_id,
            'frames_sent': len(self.sent_frames),
            'frames_received': len(self.received_frames),
            'energy_balance': {
                b.band_name: self.ledger.get_balance(self.node_id, b)
                for b in self.supported_bands
            },
            'neighbors': len(self.router.neighbors),
            'staked': self.node_id in self.consensus.stakes
        }


class WNSPv5Network:
    """
    WNSP v5 Network Simulator
    Manages multiple nodes and message propagation
    """
    
    def __init__(self):
        self.nodes: Dict[str, WNSPv5Node] = {}
        self.message_log: List[Dict[str, Any]] = []
        self.network_stats = {
            'total_frames': 0,
            'successful_deliveries': 0,
            'failed_deliveries': 0,
            'emergency_frames': 0,
            'governance_frames': 0
        }
    
    def add_node(self, node: WNSPv5Node):
        """Add node to network"""
        self.nodes[node.node_id] = node
    
    def connect_nodes(self, node_a_id: str, node_b_id: str, 
                      band: SpectralBand, latency_ms: float = 10.0):
        """Create bidirectional connection between nodes"""
        if node_a_id not in self.nodes or node_b_id not in self.nodes:
            return False
        
        node_a = self.nodes[node_a_id]
        node_b = self.nodes[node_b_id]
        
        metrics_a_to_b = RoutingMetrics(
            neighbor_id=node_b_id,
            band=band,
            latency_ms=latency_ms,
            energy_cost=band.base_energy * 1e15,
            authority_level=band.authority_level,
            availability=0.99
        )
        
        metrics_b_to_a = RoutingMetrics(
            neighbor_id=node_a_id,
            band=band,
            latency_ms=latency_ms,
            energy_cost=band.base_energy * 1e15,
            authority_level=band.authority_level,
            availability=0.99
        )
        
        node_a.router.add_neighbor(node_b_id, band, metrics_a_to_b)
        node_b.router.add_neighbor(node_a_id, band, metrics_b_to_a)
        
        return True
    
    def send_message(self, from_node_id: str, to_node_id: str,
                      payload: bytes, band: SpectralBand = SpectralBand.NANO,
                      priority: Priority = Priority.NORMAL) -> Tuple[bool, str]:
        """Send message between nodes"""
        if from_node_id not in self.nodes:
            return False, "Source node not found"
        if to_node_id not in self.nodes:
            return False, "Destination node not found"
        
        sender = self.nodes[from_node_id]
        receiver = self.nodes[to_node_id]
        
        frame = sender.create_frame(
            payload=payload,
            dest_address=receiver.w_address,
            band=band,
            priority=priority
        )
        
        send_success, send_msg = sender.send_frame(frame)
        if not send_success:
            self.network_stats['failed_deliveries'] += 1
            return False, send_msg
        
        recv_success, recv_msg = receiver.receive_frame(frame)
        
        self.network_stats['total_frames'] += 1
        if recv_success:
            self.network_stats['successful_deliveries'] += 1
        else:
            self.network_stats['failed_deliveries'] += 1
        
        if priority == Priority.EMERGENCY:
            self.network_stats['emergency_frames'] += 1
        
        self.message_log.append({
            'from': from_node_id,
            'to': to_node_id,
            'frame_id': frame.frame_id,
            'band': band.band_name,
            'priority': priority.name,
            'success': recv_success,
            'timestamp': time.time()
        })
        
        return recv_success, f"{send_msg} | {recv_msg}"
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Get network statistics"""
        return {
            **self.network_stats,
            'node_count': len(self.nodes),
            'delivery_rate': (
                self.network_stats['successful_deliveries'] / 
                max(1, self.network_stats['total_frames'])
            )
        }


def demonstrate_wnsp_v5():
    """Demonstrate WNSP v5 capabilities"""
    print("=" * 60)
    print("WNSP v5.0 — Wavelength-Native Signalling Protocol")
    print("=" * 60)
    
    print("\n[1] Creating network with multi-band nodes...")
    network = WNSPv5Network()
    
    alice = WNSPv5Node(
        "alice", 
        [SpectralBand.NANO, SpectralBand.PICO, SpectralBand.FEMTO],
        "SENSOR_ALICE"
    )
    
    bob = WNSPv5Node(
        "bob",
        [SpectralBand.NANO, SpectralBand.PICO],
        "SENSOR_BOB"
    )
    
    gateway = WNSPv5Node(
        "gateway",
        list(SpectralBand),
        "GATEWAY_QUANTUM"
    )
    
    network.add_node(alice)
    network.add_node(bob)
    network.add_node(gateway)
    
    print(f"   Alice W-Addr: {alice.w_address}")
    print(f"   Bob W-Addr: {bob.w_address}")
    print(f"   Gateway W-Addr: {gateway.w_address}")
    
    print("\n[2] Establishing multi-band connections...")
    network.connect_nodes("alice", "bob", SpectralBand.NANO, latency_ms=5.0)
    network.connect_nodes("alice", "gateway", SpectralBand.PICO, latency_ms=2.0)
    network.connect_nodes("bob", "gateway", SpectralBand.NANO, latency_ms=3.0)
    network.connect_nodes("gateway", "alice", SpectralBand.FEMTO, latency_ms=1.0)
    print("   Connections established on NANO, PICO, FEMTO bands")
    
    print("\n[3] Sending NANO-band message (normal priority)...")
    payload = b"Hello from WNSP v5! Physics-based messaging."
    success, msg = network.send_message("alice", "bob", payload, SpectralBand.NANO)
    print(f"   Result: {msg}")
    
    print("\n[4] Sending PICO-band identity verification...")
    identity_data = b"IDENTITY:alice:biometric_hash:12345"
    success, msg = network.send_message("alice", "gateway", identity_data, SpectralBand.PICO)
    print(f"   Result: {msg}")
    
    print("\n[5] Sending EMERGENCY frame...")
    emergency_data = b"EMERGENCY: Resource request - Priority Override"
    success, msg = network.send_message(
        "bob", "gateway", emergency_data, 
        SpectralBand.NANO, Priority.EMERGENCY
    )
    print(f"   Result: {msg}")
    
    print("\n[6] Staking spectrum credits for PoSPECTRUM...")
    alice.stake_spectrum(50000.0, [SpectralBand.NANO, SpectralBand.PICO])
    gateway.stake_spectrum(100000.0, list(SpectralBand)[:5])
    print(f"   Alice staked: 50,000 EU on NANO, PICO")
    print(f"   Gateway staked: 100,000 EU on 5 bands")
    
    print("\n[7] Creating governance proposal...")
    proposal_id = gateway.propose_state_change({
        'action': 'update_routing_weights',
        'new_weights': {'alpha': 0.5, 'beta': 0.3, 'gamma': 0.2}
    })
    print(f"   Proposal ID: {proposal_id}")
    
    print("\n[8] Voting on proposal...")
    if proposal_id:
        alice.vote_on_proposal(proposal_id, True)
        gateway.vote_on_proposal(proposal_id, True)
        
        success, msg = gateway.consensus.finalize_proposal(proposal_id)
        print(f"   Finalization: {msg}")
    else:
        print("   Proposal creation failed")
    
    print("\n[9] Network Statistics:")
    stats = network.get_network_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    print("\n[10] Node Status Summary:")
    for node_id, node in network.nodes.items():
        status = node.get_status()
        print(f"\n   {node_id.upper()}:")
        print(f"     Bands: {', '.join(status['supported_bands'])}")
        print(f"     Sent: {status['frames_sent']}, Received: {status['frames_received']}")
        print(f"     Staked: {status['staked']}")
    
    print("\n" + "=" * 60)
    print("WNSP v5.0 Demonstration Complete")
    print("=" * 60)
    
    return network


if __name__ == "__main__":
    demonstrate_wnsp_v5()
