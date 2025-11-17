"""
Wavelength-Native Signaling Protocol (WNSP) - Frame Types and Encoding

Defines frame structures, encoding, decoding, and message handling for optical signaling.
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import time
import hashlib


@dataclass
class WnspFrame:
    """A single WNSP frame representing an optical symbol in time."""
    sync: int                    # Sync pattern identifier
    wavelength_nm: float         # Encoded symbol wavelength
    intensity_level: int         # Discrete level, e.g. 0-7
    checksum: int                # Simple checksum for error detection
    payload_bit: int             # A single bit carried in this frame (0 or 1)
    timestamp_ms: float          # Local timestamp when frame was created
    
    def __post_init__(self):
        """Validate frame data."""
        if self.payload_bit not in (0, 1):
            raise ValueError(f"payload_bit must be 0 or 1, got {self.payload_bit}")
        if not (0 <= self.intensity_level <= 7):
            raise ValueError(f"intensity_level must be 0-7, got {self.intensity_level}")


@dataclass
class WnspFrameMessage:
    """A message is an ordered sequence of frames."""
    frames: List[WnspFrame] = field(default_factory=list)
    message_id: Optional[str] = None
    sender_id: Optional[str] = None
    created_at: float = field(default_factory=lambda: time.time() * 1000)
    
    def add_frame(self, frame: WnspFrame) -> None:
        """Add a frame to the message."""
        self.frames.append(frame)
    
    def get_duration_ms(self) -> float:
        """Calculate total message duration in milliseconds."""
        if not self.frames:
            return 0.0
        return max(f.timestamp_ms for f in self.frames) - min(f.timestamp_ms for f in self.frames)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary for serialization."""
        return {
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'created_at': self.created_at,
            'frame_count': len(self.frames),
            'frames': [self._frame_to_dict(f) for f in self.frames]
        }
    
    @staticmethod
    def _frame_to_dict(frame: WnspFrame) -> Dict[str, Any]:
        """Convert frame to dictionary."""
        return {
            'sync': frame.sync,
            'wavelength_nm': frame.wavelength_nm,
            'intensity_level': frame.intensity_level,
            'checksum': frame.checksum,
            'payload_bit': frame.payload_bit,
            'timestamp_ms': frame.timestamp_ms
        }


@dataclass
class TimelineSegment:
    """
    Represents a continuous time segment displaying a specific wavelength at intensity.
    Used for rendering optical signals as flashing colored lights.
    """
    t_start_ms: float          # Start time in milliseconds
    t_end_ms: float            # End time in milliseconds
    wavelength_nm: float       # Wavelength to display
    intensity_level: int       # Intensity level 0-7
    
    def duration_ms(self) -> float:
        """Get segment duration in milliseconds."""
        return self.t_end_ms - self.t_start_ms
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            't_ms': self.t_start_ms,
            'wavelength_nm': self.wavelength_nm,
            'intensity_level': self.intensity_level,
            'duration_ms': self.duration_ms()
        }


class WnspEncoder:
    """Encoder for converting text messages to WNSP frames."""
    
    SYNC_PATTERN = 0xAA  # Standard sync pattern
    DEFAULT_INTENSITY = 7  # Maximum intensity
    FRAME_DURATION_MS = 100  # Default frame duration
    
    def __init__(self, frame_duration_ms: float = FRAME_DURATION_MS):
        """
        Initialize encoder.
        
        Args:
            frame_duration_ms: Duration of each frame in milliseconds
        """
        self.frame_duration_ms = frame_duration_ms
    
    def encode_message(self, text: str, intensity: int = DEFAULT_INTENSITY) -> WnspFrameMessage:
        """
        Encode a text message into WNSP frames.
        
        Args:
            text: Text message to encode (A-Z only)
            intensity: Intensity level 0-7
            
        Returns:
            WnspFrameMessage containing encoded frames
        """
        from wavelength_map import get_wavelength_for_letter
        
        frames = []
        base_time = time.time() * 1000  # Current time in milliseconds
        
        for i, char in enumerate(text.upper()):
            if not char.isalpha() or not ('A' <= char <= 'Z'):
                continue
            
            wavelength = get_wavelength_for_letter(char)
            if wavelength is None:
                continue
            
            # Create frame
            frame = WnspFrame(
                sync=self.SYNC_PATTERN,
                wavelength_nm=wavelength,
                intensity_level=intensity,
                checksum=self._compute_checksum(char, wavelength),
                payload_bit=i % 2,  # Alternate bits
                timestamp_ms=base_time + (i * self.frame_duration_ms)
            )
            frames.append(frame)
        
        # Create message
        message_id = self._generate_message_id(text)
        return WnspFrameMessage(
            frames=frames,
            message_id=message_id,
            sender_id="nexusos",
            created_at=base_time
        )
    
    def frames_to_timeline(self, message: WnspFrameMessage, gap_ms: float = 10.0) -> List[TimelineSegment]:
        """
        Convert frames to timeline segments for rendering.
        
        Args:
            message: WNSP frame message
            gap_ms: Gap between frames in milliseconds
            
        Returns:
            List of timeline segments
        """
        segments = []
        
        for frame in message.frames:
            segment = TimelineSegment(
                t_start_ms=frame.timestamp_ms,
                t_end_ms=frame.timestamp_ms + self.frame_duration_ms - gap_ms,
                wavelength_nm=frame.wavelength_nm,
                intensity_level=frame.intensity_level
            )
            segments.append(segment)
        
        return segments
    
    @staticmethod
    def _compute_checksum(char: str, wavelength: float) -> int:
        """Compute simple checksum for error detection."""
        data = f"{char}{wavelength}".encode('utf-8')
        hash_bytes = hashlib.md5(data).digest()
        return int.from_bytes(hash_bytes[:2], 'big') % 256
    
    @staticmethod
    def _generate_message_id(text: str) -> str:
        """Generate unique message ID."""
        timestamp = str(time.time())
        data = f"{text}{timestamp}".encode('utf-8')
        return hashlib.sha256(data).hexdigest()[:16]


class WnspDecoder:
    """Decoder for converting WNSP frames back to text messages."""
    
    def __init__(self):
        """Initialize decoder."""
        pass
    
    def decode_message(self, message: WnspFrameMessage) -> str:
        """
        Decode WNSP frames back to text.
        
        Args:
            message: WNSP frame message
            
        Returns:
            Decoded text message
        """
        from wavelength_map import get_letter_for_wavelength
        
        decoded_chars = []
        
        for frame in message.frames:
            letter = get_letter_for_wavelength(frame.wavelength_nm)
            if letter:
                decoded_chars.append(letter)
        
        return ''.join(decoded_chars)
    
    def decode_frames(self, frames: List[WnspFrame]) -> str:
        """
        Decode a list of frames to text.
        
        Args:
            frames: List of WNSP frames
            
        Returns:
            Decoded text message
        """
        message = WnspFrameMessage(frames=frames)
        return self.decode_message(message)
    
    def verify_checksum(self, frame: WnspFrame) -> bool:
        """
        Verify frame checksum.
        
        Args:
            frame: WNSP frame to verify
            
        Returns:
            True if checksum valid, False otherwise
        """
        from wavelength_map import get_letter_for_wavelength
        
        letter = get_letter_for_wavelength(frame.wavelength_nm)
        if not letter:
            return False
        
        expected = WnspEncoder._compute_checksum(letter, frame.wavelength_nm)
        return frame.checksum == expected


def create_test_message(text: str = "HELLO") -> WnspFrameMessage:
    """
    Create a test WNSP message for demonstration.
    
    Args:
        text: Text to encode (default "HELLO")
        
    Returns:
        Encoded WNSP message
    """
    encoder = WnspEncoder()
    return encoder.encode_message(text)
