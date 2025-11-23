"""
WNSP v3.0 Hardware Abstraction Layer (HAL)
==========================================

Revolutionary upgrade: Maps wavelength physics to existing radio protocols.
Enables WNSP deployment on current devices WITHOUT optical transceivers.

Key Innovation:
- Preserves E=hf quantum economics on conventional hardware
- Maintains spectral diversity using frequency-domain mapping
- Backward compatible with v2.0 optical implementation
- Drop-in replacement when optical hardware becomes available

Supported Protocols:
- Bluetooth Low Energy (BLE): 2.4 GHz ISM band
- WiFi Direct: 2.4/5 GHz bands
- LoRa: 433/868/915 MHz bands (long-range)
- Future: Li-Fi optical transceivers (direct wavelength mapping)
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
import time
import hashlib

from wavelength_validator import SpectralRegion, ModulationType, WaveProperties


class RadioProtocol(Enum):
    """Physical radio protocols available on current devices"""
    BLUETOOTH_LE = "bluetooth_le"      # 2.4 GHz, ~100m range, ubiquitous
    WIFI_DIRECT = "wifi_direct"        # 2.4/5 GHz, ~200m range, high bandwidth
    LORA = "lora"                      # Sub-GHz, ~10km range, low power
    LIFI_OPTICAL = "lifi_optical"      # Future: direct wavelength mapping
    SATELLITE_UPLINK = "satellite"     # Global backbone (v3.0 Phase 2)


class ValidationTier(Enum):
    """Progressive validation tiers for different device capabilities"""
    FULL_VALIDATOR = "full"            # Desktop, always-on, full consensus
    INTERMITTENT_VALIDATOR = "intermittent"  # Mobile when charging
    LIGHT_NODE = "light"               # Mobile on battery, messaging only
    RELAY_NODE = "relay"               # Forwards messages, earns NXT


@dataclass
class RadioChannel:
    """Maps WNSP wavelength to radio frequency channel"""
    wavelength_nm: float               # Original WNSP wavelength (350-1033nm)
    radio_frequency_hz: float          # Mapped radio frequency
    radio_protocol: RadioProtocol
    channel_number: int                # Protocol-specific channel
    bandwidth_hz: float
    spectral_region: SpectralRegion
    
    def __post_init__(self):
        """Calculate derived properties"""
        # Speed of light: c = λf (for original wavelength)
        self.optical_frequency_hz = 299792458 / (self.wavelength_nm * 1e-9)
        
        # Quantum energy preserved via mathematical mapping
        self.quantum_energy_joules = 6.62607015e-34 * self.optical_frequency_hz


@dataclass
class HardwareAbstractionMapping:
    """Complete mapping from wavelength physics to radio implementation"""
    spectral_region: SpectralRegion
    wavelength_range_nm: Tuple[float, float]
    
    # Radio mapping
    radio_channels: List[RadioChannel] = field(default_factory=list)
    preferred_protocol: RadioProtocol = RadioProtocol.BLUETOOTH_LE
    
    # Economic preservation
    base_cost_nxt: float = 0.0
    energy_multiplier: float = 1.0
    
    # Performance
    max_throughput_bps: int = 0
    typical_latency_ms: float = 0.0
    max_range_meters: float = 0.0


class WNSPHardwareAbstractionLayer:
    """
    WNSP v3.0 HAL: Bridge between wavelength physics and radio hardware
    
    Architecture:
    1. Map 8 spectral regions → radio frequency channels
    2. Preserve E=hf quantum economics via mathematical transform
    3. Maintain spectral diversity using frequency-domain separation
    4. Enable progressive validation based on device capability
    """
    
    def __init__(self):
        # Wavelength → Radio mapping tables
        self.spectral_mappings: Dict[SpectralRegion, HardwareAbstractionMapping] = {}
        
        # Device capability detection
        self.available_protocols: List[RadioProtocol] = []
        self.device_tier: ValidationTier = ValidationTier.LIGHT_NODE
        
        # Performance tracking
        self.total_messages_mapped: int = 0
        self.radio_utilization: Dict[RadioProtocol, float] = {}
        
        # Initialize mappings
        self._initialize_spectral_radio_mapping()
        self._detect_device_capabilities()
    
    def _initialize_spectral_radio_mapping(self):
        """
        Map 8 spectral regions to radio frequency channels
        
        Strategy: Use frequency-domain diversity instead of wavelength diversity
        - UV/Violet → Bluetooth LE channels 0-12
        - Blue/Green → Bluetooth LE channels 13-25
        - Yellow/Orange → WiFi 2.4 GHz channels
        - Red/IR → WiFi 5 GHz channels + LoRa
        """
        
        # UV Region (350-380nm) → BLE Channels 0-4
        self.spectral_mappings[SpectralRegion.UV] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.UV,
            wavelength_range_nm=(350, 380),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=365,  # UV center
                    radio_frequency_hz=2.402e9,  # BLE channel 0
                    radio_protocol=RadioProtocol.BLUETOOTH_LE,
                    channel_number=0,
                    bandwidth_hz=2e6,
                    spectral_region=SpectralRegion.UV
                )
            ],
            preferred_protocol=RadioProtocol.BLUETOOTH_LE,
            base_cost_nxt=0.05,  # Highest cost (shortest wavelength)
            energy_multiplier=1.8,
            max_throughput_bps=1_000_000,
            typical_latency_ms=10,
            max_range_meters=100
        )
        
        # Violet Region (380-450nm) → BLE Channels 5-9
        self.spectral_mappings[SpectralRegion.VIOLET] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.VIOLET,
            wavelength_range_nm=(380, 450),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=415,
                    radio_frequency_hz=2.426e9,  # BLE channel 5
                    radio_protocol=RadioProtocol.BLUETOOTH_LE,
                    channel_number=5,
                    bandwidth_hz=2e6,
                    spectral_region=SpectralRegion.VIOLET
                )
            ],
            preferred_protocol=RadioProtocol.BLUETOOTH_LE,
            base_cost_nxt=0.04,
            energy_multiplier=1.6,
            max_throughput_bps=1_000_000,
            typical_latency_ms=10,
            max_range_meters=100
        )
        
        # Blue Region (450-495nm) → BLE Channels 10-14
        self.spectral_mappings[SpectralRegion.BLUE] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.BLUE,
            wavelength_range_nm=(450, 495),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=472,
                    radio_frequency_hz=2.450e9,  # BLE channel 10
                    radio_protocol=RadioProtocol.BLUETOOTH_LE,
                    channel_number=10,
                    bandwidth_hz=2e6,
                    spectral_region=SpectralRegion.BLUE
                )
            ],
            preferred_protocol=RadioProtocol.BLUETOOTH_LE,
            base_cost_nxt=0.03,
            energy_multiplier=1.4,
            max_throughput_bps=1_000_000,
            typical_latency_ms=10,
            max_range_meters=100
        )
        
        # Green Region (495-570nm) → BLE Channels 15-20
        self.spectral_mappings[SpectralRegion.GREEN] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.GREEN,
            wavelength_range_nm=(495, 570),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=532,
                    radio_frequency_hz=2.474e9,  # BLE channel 15
                    radio_protocol=RadioProtocol.BLUETOOTH_LE,
                    channel_number=15,
                    bandwidth_hz=2e6,
                    spectral_region=SpectralRegion.GREEN
                )
            ],
            preferred_protocol=RadioProtocol.BLUETOOTH_LE,
            base_cost_nxt=0.025,
            energy_multiplier=1.2,
            max_throughput_bps=1_000_000,
            typical_latency_ms=10,
            max_range_meters=100
        )
        
        # Yellow Region (570-590nm) → WiFi 2.4 GHz Channel 1
        self.spectral_mappings[SpectralRegion.YELLOW] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.YELLOW,
            wavelength_range_nm=(570, 590),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=580,
                    radio_frequency_hz=2.412e9,  # WiFi channel 1
                    radio_protocol=RadioProtocol.WIFI_DIRECT,
                    channel_number=1,
                    bandwidth_hz=20e6,
                    spectral_region=SpectralRegion.YELLOW
                )
            ],
            preferred_protocol=RadioProtocol.WIFI_DIRECT,
            base_cost_nxt=0.02,
            energy_multiplier=1.0,
            max_throughput_bps=10_000_000,
            typical_latency_ms=5,
            max_range_meters=200
        )
        
        # Orange Region (590-620nm) → WiFi 2.4 GHz Channel 6
        self.spectral_mappings[SpectralRegion.ORANGE] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.ORANGE,
            wavelength_range_nm=(590, 620),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=605,
                    radio_frequency_hz=2.437e9,  # WiFi channel 6
                    radio_protocol=RadioProtocol.WIFI_DIRECT,
                    channel_number=6,
                    bandwidth_hz=20e6,
                    spectral_region=SpectralRegion.ORANGE
                )
            ],
            preferred_protocol=RadioProtocol.WIFI_DIRECT,
            base_cost_nxt=0.018,
            energy_multiplier=0.9,
            max_throughput_bps=10_000_000,
            typical_latency_ms=5,
            max_range_meters=200
        )
        
        # Red Region (620-750nm) → WiFi 5 GHz Channel 36
        self.spectral_mappings[SpectralRegion.RED] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.RED,
            wavelength_range_nm=(620, 750),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=685,
                    radio_frequency_hz=5.180e9,  # WiFi 5GHz channel 36
                    radio_protocol=RadioProtocol.WIFI_DIRECT,
                    channel_number=36,
                    bandwidth_hz=20e6,
                    spectral_region=SpectralRegion.RED
                )
            ],
            preferred_protocol=RadioProtocol.WIFI_DIRECT,
            base_cost_nxt=0.015,
            energy_multiplier=0.8,
            max_throughput_bps=20_000_000,
            typical_latency_ms=3,
            max_range_meters=200
        )
        
        # IR Region (750-1033nm) → LoRa 868 MHz (long-range)
        self.spectral_mappings[SpectralRegion.IR] = HardwareAbstractionMapping(
            spectral_region=SpectralRegion.IR,
            wavelength_range_nm=(750, 1033),
            radio_channels=[
                RadioChannel(
                    wavelength_nm=891,
                    radio_frequency_hz=868e6,  # LoRa EU band
                    radio_protocol=RadioProtocol.LORA,
                    channel_number=0,
                    bandwidth_hz=125e3,
                    spectral_region=SpectralRegion.IR
                )
            ],
            preferred_protocol=RadioProtocol.LORA,
            base_cost_nxt=0.01,  # Lowest cost (longest wavelength)
            energy_multiplier=0.6,
            max_throughput_bps=5_000,  # Low but long-range
            typical_latency_ms=100,
            max_range_meters=10_000  # 10km range!
        )
    
    def _detect_device_capabilities(self):
        """
        Detect available radio protocols and assign validation tier
        
        In production: Query actual device hardware
        For now: Assume BLE + WiFi available (typical smartphone)
        """
        # Simulated detection - in production would query hardware
        self.available_protocols = [
            RadioProtocol.BLUETOOTH_LE,
            RadioProtocol.WIFI_DIRECT
        ]
        
        # Determine validation tier based on capabilities
        # In production: check battery status, CPU, memory, network
        self.device_tier = ValidationTier.LIGHT_NODE
    
    def wavelength_to_radio_channel(
        self,
        wavelength_nm: float,
        spectral_region: SpectralRegion
    ) -> Optional[RadioChannel]:
        """
        Map WNSP wavelength to radio frequency channel
        
        Args:
            wavelength_nm: Original WNSP wavelength (350-1033nm)
            spectral_region: Which spectral region this belongs to
        
        Returns:
            RadioChannel configuration for transmission
        """
        mapping = self.spectral_mappings.get(spectral_region)
        if not mapping:
            return None
        
        # Return primary channel for this spectral region
        if mapping.radio_channels:
            return mapping.radio_channels[0]
        
        return None
    
    def calculate_message_cost_hal(
        self,
        wavelength_nm: float,
        spectral_region: SpectralRegion,
        data_size_bytes: int,
        modulation_type: ModulationType
    ) -> Dict[str, float]:
        """
        Calculate message cost preserving E=hf quantum economics
        
        Even though we're using radio, costs are based on ORIGINAL wavelength
        This preserves the physics-based economic model
        
        Args:
            wavelength_nm: Original WNSP wavelength
            spectral_region: Spectral region
            data_size_bytes: Message size
            modulation_type: Encoding complexity
        
        Returns:
            Cost breakdown maintaining quantum economics
        """
        mapping = self.spectral_mappings.get(spectral_region)
        if not mapping:
            return {"total_cost_nxt": 0.01}
        
        # Base quantum cost (preserved from wavelength)
        quantum_base = mapping.base_cost_nxt * mapping.energy_multiplier
        
        # Modulation complexity
        modulation_premium = quantum_base * (modulation_type.complexity_multiplier - 1.0)
        
        # Bandwidth cost
        bandwidth_cost = data_size_bytes * 0.00001
        
        # Total cost (quantum economics preserved)
        total_cost = quantum_base + modulation_premium + bandwidth_cost
        
        return {
            "quantum_base_nxt": quantum_base,
            "modulation_premium_nxt": modulation_premium,
            "bandwidth_cost_nxt": bandwidth_cost,
            "total_cost_nxt": total_cost,
            "energy_multiplier": mapping.energy_multiplier,
            "radio_protocol": mapping.preferred_protocol.value
        }
    
    def get_validation_tier_requirements(
        self,
        tier: ValidationTier
    ) -> Dict[str, Any]:
        """Get hardware requirements for validation tier"""
        requirements = {
            ValidationTier.FULL_VALIDATOR: {
                "min_protocols": [RadioProtocol.BLUETOOTH_LE, RadioProtocol.WIFI_DIRECT],
                "min_uptime_hours": 24,
                "min_bandwidth_mbps": 10,
                "battery_requirement": "AC powered or >80%",
                "contribution_multiplier": 1.0,
                "can_validate_blocks": True,
                "can_relay_messages": True,
                "nxt_earnings_rate": 1.0
            },
            ValidationTier.INTERMITTENT_VALIDATOR: {
                "min_protocols": [RadioProtocol.BLUETOOTH_LE],
                "min_uptime_hours": 4,
                "min_bandwidth_mbps": 1,
                "battery_requirement": "Charging",
                "contribution_multiplier": 0.5,
                "can_validate_blocks": True,
                "can_relay_messages": True,
                "nxt_earnings_rate": 0.5
            },
            ValidationTier.LIGHT_NODE: {
                "min_protocols": [RadioProtocol.BLUETOOTH_LE],
                "min_uptime_hours": 0,
                "min_bandwidth_mbps": 0.1,
                "battery_requirement": "Any",
                "contribution_multiplier": 0.1,
                "can_validate_blocks": False,
                "can_relay_messages": False,
                "nxt_earnings_rate": 0.0
            },
            ValidationTier.RELAY_NODE: {
                "min_protocols": [RadioProtocol.BLUETOOTH_LE, RadioProtocol.WIFI_DIRECT],
                "min_uptime_hours": 12,
                "min_bandwidth_mbps": 5,
                "battery_requirement": "AC powered or >50%",
                "contribution_multiplier": 0.7,
                "can_validate_blocks": False,
                "can_relay_messages": True,
                "nxt_earnings_rate": 0.3  # Earns for relaying
            }
        }
        
        return requirements.get(tier, requirements[ValidationTier.LIGHT_NODE])
    
    def get_stats(self) -> Dict[str, Any]:
        """Get HAL statistics"""
        return {
            "total_messages_mapped": self.total_messages_mapped,
            "available_protocols": [p.value for p in self.available_protocols],
            "device_tier": self.device_tier.value,
            "spectral_regions_mapped": len(self.spectral_mappings),
            "tier_requirements": self.get_validation_tier_requirements(self.device_tier)
        }


# Singleton instance
_hal_instance = None

def get_wnsp_hal() -> WNSPHardwareAbstractionLayer:
    """Get singleton HAL instance"""
    global _hal_instance
    if _hal_instance is None:
        _hal_instance = WNSPHardwareAbstractionLayer()
    return _hal_instance
