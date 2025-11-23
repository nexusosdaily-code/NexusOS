"""
WNSP v3.0 Adaptive Encoding System
===================================

Dual-mode encoding for optimal throughput:
- SCIENTIFIC MODE: 170+ character wavelength encoding (human messages)
- BINARY MODE: Spectral binary encoding (machine-to-machine, 10x faster)

AI automatically selects encoding based on content type:
- Human text → Scientific mode (readable, physics-based)
- Blockchain sync → Binary mode (fast, efficient)
- Validator consensus → Binary mode (throughput critical)
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
import time

from wavelength_validator import SpectralRegion, ModulationType
from wnsp_protocol_v2 import EXTENDED_CHAR_MAP, SCIENTIFIC_CHAR_MAP


class EncodingMode(Enum):
    """Adaptive encoding modes"""
    SCIENTIFIC = "scientific"          # 170+ chars, human-readable
    BINARY_FAST = "binary_fast"        # Binary via spectral regions, 10x faster
    HYBRID = "hybrid"                  # Mix both based on content
    AUTO = "auto"                      # AI decides


class ContentType(Enum):
    """Message content classification"""
    HUMAN_TEXT = "human_text"          # Chat, messaging
    BLOCKCHAIN_DATA = "blockchain_data"  # Blocks, transactions
    VALIDATOR_CONSENSUS = "validator_consensus"  # Consensus messages
    FILE_TRANSFER = "file_transfer"    # Binary files
    MIXED = "mixed"                    # Mixed content


@dataclass
class EncodingDecision:
    """AI decision on encoding strategy"""
    mode: EncodingMode
    content_type: ContentType
    estimated_size_bytes: int
    estimated_cost_nxt: float
    estimated_latency_ms: float
    reasoning: str


@dataclass
class SpectralBinaryEncoding:
    """Binary encoding using 8 spectral regions as 8-bit channels"""
    data_bytes: bytes
    spectral_chunks: List[Tuple[SpectralRegion, int]]  # (region, byte_value)
    total_chunks: int
    encoding_efficiency: float  # bits per symbol


class WNSPAdaptiveEncoder:
    """
    WNSP v3.0 Adaptive Encoding Engine
    
    Automatically selects optimal encoding:
    1. Analyze content type (human vs machine)
    2. Calculate size/cost tradeoffs
    3. Choose encoding mode
    4. Encode efficiently
    """
    
    def __init__(self):
        # Encoding statistics
        self.total_messages_encoded: int = 0
        self.scientific_mode_count: int = 0
        self.binary_mode_count: int = 0
        self.hybrid_mode_count: int = 0
        
        # Performance tracking
        self.avg_scientific_throughput_bps: float = 0.0
        self.avg_binary_throughput_bps: float = 0.0
        
        # Spectral region assignment for binary mode
        self.spectral_regions = [
            SpectralRegion.UV,
            SpectralRegion.VIOLET,
            SpectralRegion.BLUE,
            SpectralRegion.GREEN,
            SpectralRegion.YELLOW,
            SpectralRegion.ORANGE,
            SpectralRegion.RED,
            SpectralRegion.IR
        ]
    
    def analyze_content(self, content: Any) -> ContentType:
        """
        Classify content to determine optimal encoding
        
        Args:
            content: Message content (str, bytes, dict)
        
        Returns:
            Content classification
        """
        # If bytes, likely binary
        if isinstance(content, bytes):
            return ContentType.FILE_TRANSFER
        
        # If dict, check for blockchain structures
        if isinstance(content, dict):
            blockchain_keys = {'block_id', 'transactions', 'validator', 'consensus'}
            if any(key in content for key in blockchain_keys):
                return ContentType.BLOCKCHAIN_DATA
            
            consensus_keys = {'proposal_id', 'vote', 'signature', 'spectral_signature'}
            if any(key in content for key in consensus_keys):
                return ContentType.VALIDATOR_CONSENSUS
        
        # If string, check content patterns
        if isinstance(content, str):
            # Check for human language patterns
            common_words = {'the', 'is', 'and', 'to', 'of', 'a', 'in', 'that'}
            words = set(content.lower().split())
            if len(words & common_words) > 0:
                return ContentType.HUMAN_TEXT
            
            # Check for blockchain hex patterns
            if content.startswith('0x') or all(c in '0123456789abcdefABCDEF' for c in content.replace('0x', '')):
                return ContentType.BLOCKCHAIN_DATA
        
        return ContentType.MIXED
    
    def decide_encoding(
        self,
        content: Any,
        priority: str = "normal",
        force_mode: Optional[EncodingMode] = None
    ) -> EncodingDecision:
        """
        AI decision on optimal encoding mode
        
        Args:
            content: Message content
            priority: Message priority (low, normal, high, critical)
            force_mode: Override AI decision
        
        Returns:
            Encoding decision with reasoning
        """
        content_type = self.analyze_content(content)
        
        # Force mode if specified
        if force_mode and force_mode != EncodingMode.AUTO:
            return EncodingDecision(
                mode=force_mode,
                content_type=content_type,
                estimated_size_bytes=len(str(content)),
                estimated_cost_nxt=0.02,
                estimated_latency_ms=10,
                reasoning=f"Manual override: {force_mode.value}"
            )
        
        # AI decision logic
        if content_type == ContentType.HUMAN_TEXT:
            # Human messages use scientific encoding (readable)
            return EncodingDecision(
                mode=EncodingMode.SCIENTIFIC,
                content_type=content_type,
                estimated_size_bytes=len(str(content)),
                estimated_cost_nxt=0.025,  # Slightly higher cost
                estimated_latency_ms=15,  # Slower but preserves meaning
                reasoning="Human text detected - using scientific encoding for readability"
            )
        
        elif content_type in [ContentType.BLOCKCHAIN_DATA, ContentType.VALIDATOR_CONSENSUS]:
            # Machine data uses binary mode (10x faster)
            return EncodingDecision(
                mode=EncodingMode.BINARY_FAST,
                content_type=content_type,
                estimated_size_bytes=len(str(content)) // 2,  # Binary more compact
                estimated_cost_nxt=0.015,  # Lower cost
                estimated_latency_ms=3,  # 10x faster
                reasoning=f"{content_type.value} - using binary mode for speed"
            )
        
        elif content_type == ContentType.FILE_TRANSFER:
            # Files always binary
            return EncodingDecision(
                mode=EncodingMode.BINARY_FAST,
                content_type=content_type,
                estimated_size_bytes=len(content) if isinstance(content, bytes) else len(str(content)),
                estimated_cost_nxt=0.01,
                estimated_latency_ms=5,
                reasoning="Binary file - using binary mode"
            )
        
        else:
            # Mixed content - use hybrid
            return EncodingDecision(
                mode=EncodingMode.HYBRID,
                content_type=content_type,
                estimated_size_bytes=len(str(content)),
                estimated_cost_nxt=0.02,
                estimated_latency_ms=10,
                reasoning="Mixed content - using hybrid encoding"
            )
    
    def encode_binary_spectral(
        self,
        data: bytes
    ) -> SpectralBinaryEncoding:
        """
        Encode binary data using 8 spectral regions as byte channels
        
        Strategy:
        - 8 spectral regions = 8 parallel channels
        - Each region transmits 1 byte per symbol
        - Throughput: 8 bytes per symbol (8x improvement over character encoding)
        
        Args:
            data: Binary data to encode
        
        Returns:
            Spectral binary encoding
        """
        spectral_chunks = []
        
        # Split data into 8-byte chunks (one per spectral region)
        for i in range(0, len(data), 8):
            chunk = data[i:i+8]
            
            # Assign each byte to a spectral region
            for j, byte_val in enumerate(chunk):
                if j < len(self.spectral_regions):
                    spectral_chunks.append((self.spectral_regions[j], byte_val))
        
        # Pad last chunk if needed
        while len(spectral_chunks) % 8 != 0:
            spectral_chunks.append((SpectralRegion.IR, 0))
        
        return SpectralBinaryEncoding(
            data_bytes=data,
            spectral_chunks=spectral_chunks,
            total_chunks=len(spectral_chunks),
            encoding_efficiency=8.0  # 8 bits per spectral symbol
        )
    
    def decode_binary_spectral(
        self,
        encoding: SpectralBinaryEncoding
    ) -> bytes:
        """
        Decode spectral binary encoding back to bytes
        
        Args:
            encoding: Spectral binary encoding
        
        Returns:
            Original binary data
        """
        # Extract bytes from spectral chunks
        decoded_bytes = bytearray()
        
        for region, byte_val in encoding.spectral_chunks:
            if byte_val != 0 or len(decoded_bytes) < len(encoding.data_bytes):
                decoded_bytes.append(byte_val)
        
        return bytes(decoded_bytes[:len(encoding.data_bytes)])
    
    def encode_scientific_wavelength(
        self,
        text: str
    ) -> List[Tuple[str, float]]:
        """
        Encode text using scientific character→wavelength mapping
        
        Preserves human readability and physics meaning
        
        Args:
            text: Human-readable text
        
        Returns:
            List of (character, wavelength_nm) pairs
        """
        encoded = []
        
        for char in text:
            # Check scientific map first (170+ chars)
            if char in SCIENTIFIC_CHAR_MAP:
                wavelength = SCIENTIFIC_CHAR_MAP[char]
                encoded.append((char, wavelength))
            # Fallback to extended map (64 chars)
            elif char in EXTENDED_CHAR_MAP:
                wavelength = EXTENDED_CHAR_MAP[char]
                encoded.append((char, wavelength))
            # Unknown character - use space
            else:
                wavelength = EXTENDED_CHAR_MAP.get(' ', 596)
                encoded.append((char, wavelength))
        
        return encoded
    
    def decode_scientific_wavelength(
        self,
        wavelength_pairs: List[Tuple[str, float]]
    ) -> str:
        """
        Decode wavelength encoding back to text
        
        Args:
            wavelength_pairs: List of (character, wavelength_nm) pairs
        
        Returns:
            Decoded text
        """
        return ''.join(char for char, _ in wavelength_pairs)
    
    def estimate_throughput(
        self,
        mode: EncodingMode,
        data_size_bytes: int
    ) -> Dict[str, float]:
        """
        Estimate encoding throughput for comparison
        
        Args:
            mode: Encoding mode
            data_size_bytes: Data size
        
        Returns:
            Throughput estimates
        """
        if mode == EncodingMode.SCIENTIFIC:
            # Scientific: ~1 char per symbol, ~1000 bps
            symbols_needed = data_size_bytes
            bits_per_symbol = 8
            symbols_per_second = 125  # Conservative estimate
            throughput_bps = symbols_per_second * bits_per_symbol
            latency_ms = (symbols_needed / symbols_per_second) * 1000
        
        elif mode == EncodingMode.BINARY_FAST:
            # Binary: 8 bytes per symbol, ~10,000 bps (10x faster)
            symbols_needed = data_size_bytes // 8
            bits_per_symbol = 64
            symbols_per_second = 156  # 8x improvement
            throughput_bps = symbols_per_second * bits_per_symbol
            latency_ms = (symbols_needed / symbols_per_second) * 1000
        
        else:  # HYBRID
            # Average of both
            throughput_bps = 5500
            latency_ms = (data_size_bytes / (5500 / 8)) * 1000
        
        return {
            "throughput_bps": throughput_bps,
            "latency_ms": max(latency_ms, 1),  # Min 1ms
            "symbols_needed": symbols_needed if mode != EncodingMode.HYBRID else data_size_bytes,
            "efficiency_multiplier": throughput_bps / 1000  # Relative to baseline
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get encoding statistics"""
        total = self.total_messages_encoded
        
        return {
            "total_messages_encoded": total,
            "scientific_mode_pct": (self.scientific_mode_count / max(total, 1)) * 100,
            "binary_mode_pct": (self.binary_mode_count / max(total, 1)) * 100,
            "hybrid_mode_pct": (self.hybrid_mode_count / max(total, 1)) * 100,
            "avg_scientific_throughput_bps": self.avg_scientific_throughput_bps,
            "avg_binary_throughput_bps": self.avg_binary_throughput_bps,
            "throughput_improvement": (
                self.avg_binary_throughput_bps / max(self.avg_scientific_throughput_bps, 1)
            )
        }


# Singleton instance
_adaptive_encoder = None

def get_adaptive_encoder() -> WNSPAdaptiveEncoder:
    """Get singleton adaptive encoder instance"""
    global _adaptive_encoder
    if _adaptive_encoder is None:
        _adaptive_encoder = WNSPAdaptiveEncoder()
    return _adaptive_encoder
