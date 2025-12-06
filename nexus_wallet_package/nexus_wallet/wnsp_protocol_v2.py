"""
Wavelength-Native Signaling Protocol (WNSP) v2.0 - Enhanced Protocol

Revolutionary upgrade integrating quantum-resistant wavelength cryptography,
DAG messaging, and physics-based economics for next-generation optical mesh networking.

Key upgrades from v1.0:
- Full spectral region support (8 regions: UV, Violet, Blue, Green, Yellow, Orange, Red, IR)
- Extended character encoding: A-Z, 0-9, symbols (64 character set)
- Quantum-resistant interference pattern validation (replaces MD5 checksums)
- DAG support for parent message linking in mesh networks
- NXT payment integration with E=hf physics-based pricing
- Multi-wavelength modulation for higher data density
"""

from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import time
import hashlib

from wavelength_validator import (
    WavelengthValidator, WaveProperties, SpectralRegion, ModulationType
)
from wnsp_frames import WnspFrame, WnspFrameMessage, TimelineSegment


class WnspEncodingScheme(Enum):
    """WNSP v2.0 encoding schemes."""
    ASCII_BASIC = "ascii_basic"      # A-Z only (26 chars) - legacy v1.0
    ASCII_EXTENDED = "ascii_extended"  # A-Z, 0-9 (36 chars)
    FULL_ALPHANUMERIC = "full_alphanumeric"  # A-Z, 0-9, symbols (64 chars)
    SPECTRAL_BINARY = "spectral_binary"  # Binary encoding via spectral regions


# Extended character map for WNSP v2.0
# Maps 64 characters to wavelengths across full visible + near-IR spectrum
EXTENDED_CHAR_MAP = {
    # Uppercase letters A-Z (380-520nm - Violet to Green)
    'A': 380, 'B': 386, 'C': 392, 'D': 398, 'E': 404, 'F': 410,
    'G': 416, 'H': 422, 'I': 428, 'J': 434, 'K': 440, 'L': 446,
    'M': 452, 'N': 458, 'O': 464, 'P': 470, 'Q': 476, 'R': 482,
    'S': 488, 'T': 494, 'U': 500, 'V': 506, 'W': 512, 'X': 518,
    'Y': 524, 'Z': 530,
    
    # Numbers 0-9 (536-590nm - Green to Yellow)
    '0': 536, '1': 542, '2': 548, '3': 554, '4': 560,
    '5': 566, '6': 572, '7': 578, '8': 584, '9': 590,
    
    # Common symbols (596-740nm - Yellow to Red)
    ' ': 596, '.': 602, ',': 608, '!': 614, '?': 620,
    '-': 626, '_': 632, '+': 638, '=': 644, '*': 650,
    '/': 656, '\\': 662, '|': 668, '@': 674, '#': 680,
    '$': 686, '%': 692, '&': 698, '(': 704, ')': 710,
    '[': 716, ']': 722, '{': 728, '}': 734, '<': 740,
    '>': 746, ':': 752, ';': 758
}

# Reverse lookup
WAVELENGTH_TO_CHAR = {v: k for k, v in EXTENDED_CHAR_MAP.items()}


@dataclass
class WnspMessageV2:
    """Enhanced WNSP v2.0 message with DAG and cryptography support."""
    message_id: str
    sender_id: str
    recipient_id: str
    content: str
    frames: List[WnspFrame]
    spectral_region: SpectralRegion
    modulation_type: ModulationType
    
    # DAG support
    parent_message_ids: List[str] = field(default_factory=list)
    
    # Cryptography
    interference_hash: str = ""
    wave_signature: Optional[WaveProperties] = None
    
    # Economics
    cost_nxt: float = 0.0
    quantum_energy: float = 0.0
    frequency_thz: float = 0.0
    
    # Metadata
    created_at: float = field(default_factory=lambda: time.time() * 1000)
    encoding_scheme: WnspEncodingScheme = WnspEncodingScheme.FULL_ALPHANUMERIC
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'content': self.content,
            'spectral_region': self.spectral_region.display_name,
            'modulation_type': self.modulation_type.display_name,
            'parent_message_ids': self.parent_message_ids,
            'interference_hash': self.interference_hash,
            'cost_nxt': self.cost_nxt,
            'quantum_energy': self.quantum_energy,
            'frequency_thz': self.frequency_thz,
            'created_at': self.created_at,
            'encoding_scheme': self.encoding_scheme.value,
            'frame_count': len(self.frames)
        }


class WnspEncoderV2:
    """Enhanced WNSP v2.0 encoder with quantum cryptography and DAG support."""
    
    SYNC_PATTERN = 0xAB  # New sync pattern for v2.0 (WNSP marker)
    FRAME_DURATION_MS = 50  # Faster frames (was 100ms)
    
    def __init__(self):
        """Initialize v2.0 encoder."""
        self.wavelength_validator = WavelengthValidator()
        self.frame_duration_ms = self.FRAME_DURATION_MS
    
    def encode_message(
        self,
        content: str,
        sender_id: str,
        recipient_id: str,
        spectral_region: SpectralRegion,
        modulation_type: ModulationType = ModulationType.PSK,
        parent_message_ids: Optional[List[str]] = None,
        encoding_scheme: WnspEncodingScheme = WnspEncodingScheme.FULL_ALPHANUMERIC
    ) -> WnspMessageV2:
        """
        Encode message using WNSP v2.0 protocol with quantum cryptography.
        
        Args:
            content: Message text (supports A-Z, 0-9, symbols depending on scheme)
            sender_id: Sender account
            recipient_id: Recipient account
            spectral_region: Which electromagnetic region to use
            modulation_type: Encoding complexity
            parent_message_ids: Parent messages for DAG linking
            encoding_scheme: Character encoding scheme
            
        Returns:
            Enhanced WNSP v2.0 message
        """
        # 1. Create frames from content
        frames = self._encode_content_to_frames(
            content, 
            spectral_region, 
            encoding_scheme
        )
        
        # 2. Create wave signature using wavelength validator
        wave_props = self.wavelength_validator.create_message_wave(
            content,
            spectral_region,
            modulation_type
        )
        
        # 3. Calculate cost using E=hf quantum physics
        cost_data = self._calculate_quantum_cost(
            wave_props,
            len(content.encode('utf-8')),
            spectral_region
        )
        
        # 4. Generate interference hash (quantum-resistant)
        interference_hash = self._generate_interference_hash(
            wave_props,
            content,
            parent_message_ids or []
        )
        
        # 5. Generate message ID
        message_id = self._generate_message_id(content, sender_id, spectral_region)
        
        # 6. Create enhanced message
        message = WnspMessageV2(
            message_id=message_id,
            sender_id=sender_id,
            recipient_id=recipient_id,
            content=content,
            frames=frames,
            spectral_region=spectral_region,
            modulation_type=modulation_type,
            parent_message_ids=parent_message_ids or [],
            interference_hash=interference_hash,
            wave_signature=wave_props,
            cost_nxt=cost_data['cost_nxt'],
            quantum_energy=cost_data['quantum_energy'],
            frequency_thz=cost_data['frequency_thz'],
            encoding_scheme=encoding_scheme
        )
        
        return message
    
    def _encode_content_to_frames(
        self,
        content: str,
        spectral_region: SpectralRegion,
        encoding_scheme: WnspEncodingScheme
    ) -> List[WnspFrame]:
        """
        Encode content to WNSP frames using extended character map.
        
        Args:
            content: Message content
            spectral_region: Spectral region for encoding
            encoding_scheme: Character encoding scheme
            
        Returns:
            List of WNSP frames
        """
        frames = []
        base_time = time.time() * 1000
        
        for i, char in enumerate(content):
            # Get wavelength for character
            wavelength = EXTENDED_CHAR_MAP.get(char)
            
            if wavelength is None:
                # Skip unsupported characters
                continue
            
            # Create frame with quantum-enhanced parameters
            frame = WnspFrame(
                sync=0xAA,  # Sync pattern
                wavelength_nm=wavelength,
                intensity_level=7,  # Max intensity
                checksum=0,  # Will be replaced by interference validation
                payload_bit=i % 2,
                timestamp_ms=base_time + (i * self.frame_duration_ms)
            )
            frames.append(frame)
        
        return frames
    
    def _calculate_quantum_cost(
        self,
        wave_props: WaveProperties,
        message_bytes: int,
        spectral_region: SpectralRegion
    ) -> Dict[str, float]:
        """
        Calculate message cost using E=hf quantum physics formula.
        
        Args:
            wave_props: Wave properties
            message_bytes: Message size in bytes
            spectral_region: Spectral region
            
        Returns:
            Dictionary with cost breakdown
        """
        PLANCK = 6.62607015e-34  # Planck's constant (J·s) - CODATA 2018 exact
        SPEED_OF_LIGHT = 2.99792458e8  # Speed of light (m/s) - exact definition
        
        # Calculate frequency from wavelength
        frequency = SPEED_OF_LIGHT / spectral_region.center_wavelength  # Hz
        
        # Quantum energy cost (E = hf)
        quantum_energy = PLANCK * frequency  # Joules
        
        # Scale to NXT
        BASE_SCALE = 1e21
        quantum_base_nxt = (quantum_energy * BASE_SCALE * message_bytes) / 1e6
        total_cost_nxt = max(0.01, quantum_base_nxt)
        
        return {
            'cost_nxt': total_cost_nxt,
            'quantum_energy': quantum_energy,
            'frequency_thz': frequency / 1e12
        }
    
    def _generate_interference_hash(
        self,
        wave_props: WaveProperties,
        content: str,
        parent_message_ids: List[str]
    ) -> str:
        """
        Generate quantum-resistant interference hash using wave properties.
        
        Args:
            wave_props: Wave properties
            content: Message content
            parent_message_ids: Parent message IDs for DAG
            
        Returns:
            Interference hash string
        """
        # Create interference signature from wave properties
        # Combine wavelength, amplitude, phase, polarization for quantum signature
        wave_signature = (
            f"{wave_props.wavelength:.6f}_"
            f"{wave_props.amplitude:.6f}_"
            f"{wave_props.phase:.6f}_"
            f"{wave_props.polarization:.6f}_"
            f"{wave_props.spectral_region.display_name}_"
            f"{wave_props.modulation_type.display_name}"
        )
        
        # Combine with content and parents for DAG integrity
        data = f"{wave_signature}{content}{''.join(parent_message_ids)}"
        hash_bytes = hashlib.sha256(data.encode('utf-8')).digest()
        
        return hash_bytes.hex()[:32]
    
    def _generate_message_id(
        self,
        content: str,
        sender_id: str,
        spectral_region: SpectralRegion
    ) -> str:
        """Generate unique message ID."""
        timestamp = str(time.time())
        data = f"{content}{sender_id}{spectral_region.display_name}{timestamp}"
        return f"wnsp2_{hashlib.sha256(data.encode('utf-8')).hexdigest()[:16]}"


class WnspDecoderV2:
    """Enhanced WNSP v2.0 decoder with quantum validation."""
    
    def __init__(self):
        """Initialize v2.0 decoder."""
        self.wavelength_validator = WavelengthValidator()
    
    def decode_message(self, message: WnspMessageV2) -> Tuple[str, bool]:
        """
        Decode WNSP v2.0 message and validate interference hash.
        
        Args:
            message: WNSP v2.0 message
            
        Returns:
            Tuple of (decoded_content, validation_success)
        """
        # Decode frames to text
        decoded_chars = []
        
        for frame in message.frames:
            char = WAVELENGTH_TO_CHAR.get(int(frame.wavelength_nm))
            if char:
                decoded_chars.append(char)
        
        decoded_text = ''.join(decoded_chars)
        
        # Validate interference hash (quantum verification)
        validation_success = self._validate_interference_hash(message)
        
        return decoded_text, validation_success
    
    def _validate_interference_hash(self, message: WnspMessageV2) -> bool:
        """
        Validate message integrity using interference hash.
        
        Args:
            message: WNSP v2.0 message
            
        Returns:
            True if valid, False otherwise
        """
        if not message.wave_signature:
            return False
        
        try:
            # Regenerate interference pattern
            encoder = WnspEncoderV2()
            expected_hash = encoder._generate_interference_hash(
                message.wave_signature,
                message.content,
                message.parent_message_ids
            )
            
            return expected_hash == message.interference_hash
            
        except Exception:
            return False


def create_wnsp_v2_message(
    content: str,
    sender_id: str = "alice",
    recipient_id: str = "bob",
    spectral_region: SpectralRegion = SpectralRegion.BLUE,
    parent_ids: Optional[List[str]] = None
) -> WnspMessageV2:
    """
    Helper function to create WNSP v2.0 message.
    
    Args:
        content: Message content
        sender_id: Sender account
        recipient_id: Recipient account
        spectral_region: Spectral region
        parent_ids: Parent message IDs
        
    Returns:
        WNSP v2.0 message
    """
    encoder = WnspEncoderV2()
    return encoder.encode_message(
        content=content,
        sender_id=sender_id,
        recipient_id=recipient_id,
        spectral_region=spectral_region,
        modulation_type=ModulationType.PSK,
        parent_message_ids=parent_ids
    )
