"""
Wavelength Cryptography Domain - DAG-based Encryption/Decryption

Implements encryption and decryption based on electromagnetic wavelength theory:

1. Frequency Shift Encryption (FSE): Mimics electron energy level transitions
   - Higher frequency = higher energy state
   - Encryption shifts wavelength based on key-derived energy delta
   
2. Amplitude Modulation Encryption (AME): Mimics photon intensity variation
   - Modulates intensity levels to encode encrypted data
   - Uses key to determine intensity pattern
   
3. Phase Modulation Encryption (PME): Mimics wave interference patterns
   - Uses payload bits to encode phase information
   - Key determines phase shift pattern
   
4. Quantum-Inspired Multi-Layer (QIML): Combines all three methods
   - Applies FSE → AME → PME in sequence
   - Most secure option

Theory: When an electron absorbs energy, it jumps to a higher orbit (frequency increases).
When it falls back, it emits a photon. We simulate this by shifting wavelengths during
encryption (energy absorption) and restoring them during decryption (photon emission).
"""

from typing import List, Dict, Any, Tuple
import hashlib
import json
import math
from dataclasses import dataclass, asdict
from wnsp_frames import WnspFrame, WnspFrameMessage

# Electromagnetic constants (theory-based)
PLANCK_CONSTANT = 6.626e-34  # Joule-seconds
SPEED_OF_LIGHT = 2.998e8     # meters/second
ELECTRON_VOLT = 1.602e-19    # Joules

# Wavelength bounds (visible spectrum: 380-750 nm)
MIN_WAVELENGTH = 380.0  # nm (violet)
MAX_WAVELENGTH = 750.0  # nm (red)


@dataclass
class EncryptedWavelengthMessage:
    """Encrypted wavelength message with metadata."""
    encrypted_frames: List[Dict[str, Any]]
    encryption_method: str
    key_hash: str  # SHA-256 hash of encryption key for verification
    original_length: int
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EncryptedWavelengthMessage':
        """Create from dictionary."""
        return cls(**data)


class WavelengthCryptoEngine:
    """Core cryptographic engine for wavelength-based encryption."""
    
    def __init__(self, encryption_key: str):
        """
        Initialize crypto engine.
        
        Args:
            encryption_key: Passphrase for encryption/decryption
        """
        self.encryption_key = encryption_key
        self.key_hash = hashlib.sha256(encryption_key.encode()).hexdigest()
        self._key_bytes = self._derive_key_bytes()
    
    def _derive_key_bytes(self) -> bytes:
        """Derive key bytes from encryption key using SHA-256."""
        return hashlib.sha256(self.encryption_key.encode()).digest()
    
    def _calculate_photon_energy(self, wavelength_nm: float) -> float:
        """
        Calculate photon energy from wavelength (E = hc/λ).
        
        Based on electromagnetic theory: E = hf = hc/λ
        where h = Planck constant, c = speed of light, λ = wavelength
        
        Args:
            wavelength_nm: Wavelength in nanometers
            
        Returns:
            Energy in electron volts
        """
        wavelength_m = wavelength_nm * 1e-9  # Convert nm to meters
        energy_joules = (PLANCK_CONSTANT * SPEED_OF_LIGHT) / wavelength_m
        energy_ev = energy_joules / ELECTRON_VOLT
        return energy_ev
    
    def _energy_to_wavelength(self, energy_ev: float) -> float:
        """
        Convert photon energy back to wavelength (λ = hc/E).
        
        Args:
            energy_ev: Energy in electron volts
            
        Returns:
            Wavelength in nanometers
        """
        energy_joules = energy_ev * ELECTRON_VOLT
        wavelength_m = (PLANCK_CONSTANT * SPEED_OF_LIGHT) / energy_joules
        wavelength_nm = wavelength_m * 1e9  # Convert meters to nm
        return wavelength_nm
    
    def _clamp_wavelength(self, wavelength: float) -> float:
        """Clamp wavelength to visible spectrum."""
        return max(MIN_WAVELENGTH, min(MAX_WAVELENGTH, wavelength))
    
    def _get_key_byte(self, index: int) -> int:
        """Get key byte at index (wraps around)."""
        return self._key_bytes[index % len(self._key_bytes)]
    
    def frequency_shift_encrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Frequency Shift Encryption (FSE).
        
        Theory: Mimics electron energy level transitions. When an electron
        absorbs energy, it jumps to a higher orbit, increasing frequency
        (decreasing wavelength). We shift wavelength based on key-derived
        energy delta.
        
        Args:
            frames: Original WNSP frames
            
        Returns:
            Encrypted frames with shifted wavelengths
        """
        encrypted_frames = []
        
        for i, frame in enumerate(frames):
            # Calculate current photon energy
            current_energy = self._calculate_photon_energy(frame.wavelength_nm)
            
            # Get energy shift from key (normalized to ±20% energy variation)
            key_byte = self._get_key_byte(i)
            energy_shift_percent = ((key_byte / 255.0) - 0.5) * 0.4  # ±20%
            energy_shift = current_energy * energy_shift_percent
            
            # Apply energy shift (electron absorbs/releases energy)
            new_energy = current_energy + energy_shift
            
            # Convert back to wavelength
            new_wavelength = self._energy_to_wavelength(new_energy)
            new_wavelength = self._clamp_wavelength(new_wavelength)
            
            # Create encrypted frame
            encrypted_frame = WnspFrame(
                sync=frame.sync,
                wavelength_nm=new_wavelength,
                intensity_level=frame.intensity_level,
                checksum=frame.checksum,
                payload_bit=frame.payload_bit,
                timestamp_ms=frame.timestamp_ms
            )
            encrypted_frames.append(encrypted_frame)
        
        return encrypted_frames
    
    def frequency_shift_decrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Frequency Shift Decryption (FSD).
        
        Reverses the energy shift applied during encryption.
        
        Args:
            frames: Encrypted frames
            
        Returns:
            Decrypted frames with original wavelengths
        """
        decrypted_frames = []
        
        for i, frame in enumerate(frames):
            # Calculate encrypted photon energy
            encrypted_energy = self._calculate_photon_energy(frame.wavelength_nm)
            
            # Get energy shift from key (same as encryption)
            key_byte = self._get_key_byte(i)
            energy_shift_percent = ((key_byte / 255.0) - 0.5) * 0.4
            
            # Reverse: Calculate original energy before shift
            original_energy = encrypted_energy / (1 + energy_shift_percent)
            
            # Convert back to wavelength
            original_wavelength = self._energy_to_wavelength(original_energy)
            original_wavelength = self._clamp_wavelength(original_wavelength)
            
            # Create decrypted frame
            decrypted_frame = WnspFrame(
                sync=frame.sync,
                wavelength_nm=original_wavelength,
                intensity_level=frame.intensity_level,
                checksum=frame.checksum,
                payload_bit=frame.payload_bit,
                timestamp_ms=frame.timestamp_ms
            )
            decrypted_frames.append(decrypted_frame)
        
        return decrypted_frames
    
    def amplitude_modulation_encrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Amplitude Modulation Encryption (AME).
        
        Theory: Photon intensity (amplitude) represents the number of photons
        emitted. We modulate intensity based on key using XOR for perfect reversibility.
        
        Args:
            frames: Original WNSP frames
            
        Returns:
            Encrypted frames with modulated intensity
        """
        encrypted_frames = []
        
        for i, frame in enumerate(frames):
            # Get intensity modulation from key (0-7 range)
            key_byte = self._get_key_byte(i)
            intensity_mask = key_byte % 8  # 0-7
            
            # Apply intensity modulation using XOR (perfectly reversible)
            new_intensity = frame.intensity_level ^ intensity_mask
            
            # Create encrypted frame
            encrypted_frame = WnspFrame(
                sync=frame.sync,
                wavelength_nm=frame.wavelength_nm,
                intensity_level=new_intensity,
                checksum=frame.checksum,
                payload_bit=frame.payload_bit,
                timestamp_ms=frame.timestamp_ms
            )
            encrypted_frames.append(encrypted_frame)
        
        return encrypted_frames
    
    def amplitude_modulation_decrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Amplitude Modulation Decryption (AMD).
        
        Reverses the intensity modulation (XOR is self-inverse).
        
        Args:
            frames: Encrypted frames
            
        Returns:
            Decrypted frames with original intensity
        """
        # XOR is self-inverse, so decryption is same as encryption
        return self.amplitude_modulation_encrypt(frames)
    
    def phase_modulation_encrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Phase Modulation Encryption (PME).
        
        Theory: Wave phase represents the position in the wave cycle.
        We use payload bits to encode phase information based on key.
        
        Args:
            frames: Original WNSP frames
            
        Returns:
            Encrypted frames with modulated phase (payload bits)
        """
        encrypted_frames = []
        
        for i, frame in enumerate(frames):
            # Get phase modulation from key
            key_byte = self._get_key_byte(i)
            phase_flip = (key_byte % 2)  # 0 or 1
            
            # Apply phase modulation (XOR with key bit)
            new_payload_bit = frame.payload_bit ^ phase_flip
            
            # Create encrypted frame
            encrypted_frame = WnspFrame(
                sync=frame.sync,
                wavelength_nm=frame.wavelength_nm,
                intensity_level=frame.intensity_level,
                checksum=frame.checksum,
                payload_bit=new_payload_bit,
                timestamp_ms=frame.timestamp_ms
            )
            encrypted_frames.append(encrypted_frame)
        
        return encrypted_frames
    
    def phase_modulation_decrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Phase Modulation Decryption (PMD).
        
        Reverses the phase modulation (XOR is self-inverse).
        
        Args:
            frames: Encrypted frames
            
        Returns:
            Decrypted frames with original phase
        """
        # Phase modulation is self-inverse (XOR property)
        return self.phase_modulation_encrypt(frames)
    
    def quantum_multi_layer_encrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Quantum-Inspired Multi-Layer Encryption (QIML).
        
        Applies all three encryption methods in sequence:
        1. Frequency Shift (wavelength manipulation)
        2. Amplitude Modulation (intensity variation)
        3. Phase Modulation (payload bit encoding)
        
        Most secure encryption method.
        
        Args:
            frames: Original WNSP frames
            
        Returns:
            Fully encrypted frames
        """
        # Apply layers in sequence
        encrypted = self.frequency_shift_encrypt(frames)
        encrypted = self.amplitude_modulation_encrypt(encrypted)
        encrypted = self.phase_modulation_encrypt(encrypted)
        return encrypted
    
    def quantum_multi_layer_decrypt(self, frames: List[WnspFrame]) -> List[WnspFrame]:
        """
        Quantum-Inspired Multi-Layer Decryption (QIML-D).
        
        Reverses all three encryption methods in reverse sequence:
        1. Phase Modulation (reverse)
        2. Amplitude Modulation (reverse)
        3. Frequency Shift (reverse)
        
        Args:
            frames: Fully encrypted frames
            
        Returns:
            Original frames
        """
        # Reverse layers in reverse sequence
        decrypted = self.phase_modulation_decrypt(frames)
        decrypted = self.amplitude_modulation_decrypt(decrypted)
        decrypted = self.frequency_shift_decrypt(decrypted)
        return decrypted


class WavelengthCryptoHandler:
    """Handler for wavelength cryptography workflows."""
    
    METHODS = {
        'fse': 'Frequency Shift Encryption',
        'ame': 'Amplitude Modulation Encryption',
        'pme': 'Phase Modulation Encryption',
        'qiml': 'Quantum-Inspired Multi-Layer'
    }
    
    @staticmethod
    def encrypt_message(
        message: WnspFrameMessage,
        encryption_key: str,
        method: str = 'qiml'
    ) -> EncryptedWavelengthMessage:
        """
        Encrypt a wavelength message.
        
        Args:
            message: WNSP frame message to encrypt
            encryption_key: Encryption passphrase
            method: Encryption method (fse, ame, pme, qiml)
            
        Returns:
            Encrypted wavelength message
        """
        if method not in WavelengthCryptoHandler.METHODS:
            raise ValueError(f"Unknown method: {method}")
        
        engine = WavelengthCryptoEngine(encryption_key)
        
        # Apply encryption based on method
        if method == 'fse':
            encrypted_frames = engine.frequency_shift_encrypt(message.frames)
        elif method == 'ame':
            encrypted_frames = engine.amplitude_modulation_encrypt(message.frames)
        elif method == 'pme':
            encrypted_frames = engine.phase_modulation_encrypt(message.frames)
        else:  # qiml
            encrypted_frames = engine.quantum_multi_layer_encrypt(message.frames)
        
        # Convert frames to dict for storage
        encrypted_frames_dict = [
            {
                'sync': f.sync,
                'wavelength_nm': f.wavelength_nm,
                'intensity_level': f.intensity_level,
                'checksum': f.checksum,
                'payload_bit': f.payload_bit,
                'timestamp_ms': f.timestamp_ms
            }
            for f in encrypted_frames
        ]
        
        return EncryptedWavelengthMessage(
            encrypted_frames=encrypted_frames_dict,
            encryption_method=method,
            key_hash=engine.key_hash,
            original_length=len(message.frames),
            metadata={
                'message_id': message.message_id,
                'sender_id': message.sender_id,
                'created_at': message.created_at,
                'method_name': WavelengthCryptoHandler.METHODS[method]
            }
        )
    
    @staticmethod
    def decrypt_message(
        encrypted_message: EncryptedWavelengthMessage,
        decryption_key: str
    ) -> WnspFrameMessage:
        """
        Decrypt a wavelength message.
        
        Args:
            encrypted_message: Encrypted message
            decryption_key: Decryption passphrase
            
        Returns:
            Decrypted WNSP frame message
            
        Raises:
            ValueError: If decryption key is incorrect
        """
        engine = WavelengthCryptoEngine(decryption_key)
        
        # Verify key
        if engine.key_hash != encrypted_message.key_hash:
            raise ValueError("Incorrect decryption key")
        
        # Reconstruct frames from dict
        encrypted_frames = [
            WnspFrame(
                sync=f['sync'],
                wavelength_nm=f['wavelength_nm'],
                intensity_level=f['intensity_level'],
                checksum=f['checksum'],
                payload_bit=f['payload_bit'],
                timestamp_ms=f['timestamp_ms']
            )
            for f in encrypted_message.encrypted_frames
        ]
        
        # Apply decryption based on method
        method = encrypted_message.encryption_method
        if method == 'fse':
            decrypted_frames = engine.frequency_shift_decrypt(encrypted_frames)
        elif method == 'ame':
            decrypted_frames = engine.amplitude_modulation_decrypt(encrypted_frames)
        elif method == 'pme':
            decrypted_frames = engine.phase_modulation_decrypt(encrypted_frames)
        else:  # qiml
            decrypted_frames = engine.quantum_multi_layer_decrypt(encrypted_frames)
        
        # Reconstruct message
        return WnspFrameMessage(
            frames=decrypted_frames,
            message_id=encrypted_message.metadata.get('message_id'),
            sender_id=encrypted_message.metadata.get('sender_id'),
            created_at=encrypted_message.metadata.get('created_at', 0)
        )
