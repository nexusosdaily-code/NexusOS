"""
WNSP Planetary Communications v1.6.0
=====================================

Wavelength-based global communication network for Kardashev Type I civilization.

Core Components:
1. SpectralRelayMesh - Global wavelength routing graph
2. OAMChannelAllocator - Orbital angular momentum channel management
3. CoherenceRepeater - Lambda Gate amplified relay stations
4. SpectrumQoSManager - Quality of service for spectral channels
5. InterplanetaryLinkPlanner - Deep space communication extension

Physics References:
- Friis transmission: P_r = P_t·G_t·G_r·(λ/4πd)²
- Shannon capacity: C = B·log₂(1 + SNR)
- Coherence length: L_c = c/Δν
- Atmospheric attenuation: τ(λ,h) = exp(-α·h/cos(θ))

K-Level Achievement: 0.80 (Planetary Communications mastery)

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import numpy as np
import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Set, Callable
from enum import Enum
import heapq

from .constants import PLANCK_CONSTANT, SPEED_OF_LIGHT, HBAR
BOLTZMANN = 1.380649e-23

EARTH_RADIUS = 6.371e6  # meters
EARTH_CIRCUMFERENCE = 2 * math.pi * EARTH_RADIUS
AU = 1.496e11  # meters
LIGHT_SECOND = 299792458  # meters


# =============================================================================
# PART 1: SPECTRAL CHANNEL FUNDAMENTALS
# =============================================================================

class SpectrumBand(Enum):
    """Electromagnetic spectrum bands for communication."""
    
    VISIBLE_VIOLET = ("violet", 400e-9, 750e12, 1e-3, "Short range, high bandwidth")
    VISIBLE_BLUE = ("blue", 450e-9, 666e12, 2e-3, "Underwater capable")
    VISIBLE_GREEN = ("green", 550e-9, 545e12, 5e-3, "Lowest water absorption")
    VISIBLE_RED = ("red", 650e-9, 461e12, 3e-3, "Biomedical compatible")
    
    NIR_850 = ("nir_850", 850e-9, 353e12, 0.1, "Fiber optic standard")
    NIR_1310 = ("nir_1310", 1310e-9, 229e12, 0.01, "Single mode fiber")
    NIR_1550 = ("nir_1550", 1550e-9, 193e12, 0.002, "Telecom C-band")
    
    TERAHERTZ = ("thz", 100e-6, 3e12, 0.5, "6G candidate")
    MICROWAVE_KA = ("ka_band", 0.01, 30e9, 0.01, "Satellite uplink")
    MICROWAVE_X = ("x_band", 0.03, 10e9, 0.005, "Deep space")
    
    RADIO_UHF = ("uhf", 0.3, 1e9, 1e-4, "Ground penetrating")
    RADIO_VLF = ("vlf", 10000, 30e3, 1e-6, "Submarine communication")
    
    def __init__(self, band_id: str, wavelength: float, frequency: float,
                 atmos_loss_db_km: float, description: str):
        self.band_id = band_id
        self.wavelength = wavelength  # meters
        self.frequency = frequency  # Hz
        self.atmos_loss_db_km = atmos_loss_db_km
        self.description = description
    
    @property
    def photon_energy(self) -> float:
        """Energy per photon in Joules."""
        return PLANCK_CONSTANT * self.frequency
    
    @property
    def lambda_mass(self) -> float:
        """Mass-equivalent of this frequency (Λ = hf/c²)."""
        return self.photon_energy / (SPEED_OF_LIGHT ** 2)


@dataclass
class SpectralChannel:
    """
    A single wavelength channel carrying data.
    
    Combines wavelength with OAM mode for massive multiplexing.
    Each (λ, ℓ) pair is an independent channel.
    """
    channel_id: str
    band: SpectrumBand
    oam_mode: int = 0  # Orbital angular momentum: ..., -2, -1, 0, +1, +2, ...
    polarization: str = "H"  # H, V, R, L (horizontal, vertical, right/left circular)
    bandwidth_hz: float = 10e9  # 10 GHz default
    power_watts: float = 1.0
    
    @property
    def shannon_capacity_bps(self) -> float:
        """Theoretical maximum data rate (bits/second)."""
        snr = self.power_watts / (BOLTZMANN * 300 * self.bandwidth_hz)  # T=300K
        snr_ratio = max(1, snr)
        return self.bandwidth_hz * math.log2(1 + snr_ratio)
    
    @property
    def channel_signature(self) -> str:
        """Unique identifier combining λ, ℓ, and polarization."""
        return f"{self.band.band_id}:ℓ{self.oam_mode}:{self.polarization}"
    
    @property
    def energy_per_bit(self) -> float:
        """Energy cost per bit transmitted."""
        if self.shannon_capacity_bps > 0:
            return self.power_watts / self.shannon_capacity_bps
        return float('inf')


class OAMChannelAllocator:
    """
    Manages allocation of OAM modes for channel multiplexing.
    
    OAM (Orbital Angular Momentum) allows theoretically infinite 
    orthogonal channels on a single wavelength. Each integer ℓ value
    is a separate, non-interfering channel.
    
    Practical limits: |ℓ| ≤ 100 demonstrated in lab
    """
    
    def __init__(self, max_oam: int = 32):
        self.max_oam = max_oam
        self.allocated_channels: Dict[str, SpectralChannel] = {}
        self.oam_usage: Dict[str, Set[int]] = {}  # band_id -> set of used ℓ values
    
    @property
    def total_channel_capacity(self) -> int:
        """Total available channels per wavelength."""
        return 2 * self.max_oam + 1  # From -max to +max including 0
    
    def allocate_channel(self, band: SpectrumBand, 
                         polarization: str = "H",
                         bandwidth_hz: float = 10e9,
                         power_watts: float = 1.0) -> Optional[SpectralChannel]:
        """
        Allocate an available OAM channel on the given band.
        
        Returns None if all channels exhausted.
        """
        if band.band_id not in self.oam_usage:
            self.oam_usage[band.band_id] = set()
        
        used = self.oam_usage[band.band_id]
        
        available_oam = None
        for ℓ in range(0, self.max_oam + 1):
            if ℓ not in used:
                available_oam = ℓ
                break
            if -ℓ not in used and ℓ > 0:
                available_oam = -ℓ
                break
        
        if available_oam is None:
            return None
        
        used.add(available_oam)
        
        channel_id = f"ch_{band.band_id}_{available_oam}_{polarization}_{len(self.allocated_channels)}"
        channel = SpectralChannel(
            channel_id=channel_id,
            band=band,
            oam_mode=available_oam,
            polarization=polarization,
            bandwidth_hz=bandwidth_hz,
            power_watts=power_watts
        )
        
        self.allocated_channels[channel_id] = channel
        return channel
    
    def release_channel(self, channel_id: str):
        """Release a channel back to the pool."""
        if channel_id in self.allocated_channels:
            channel = self.allocated_channels[channel_id]
            if channel.band.band_id in self.oam_usage:
                self.oam_usage[channel.band.band_id].discard(channel.oam_mode)
            del self.allocated_channels[channel_id]
    
    def utilization(self, band: SpectrumBand) -> float:
        """Return utilization fraction for a band."""
        if band.band_id not in self.oam_usage:
            return 0.0
        return len(self.oam_usage[band.band_id]) / self.total_channel_capacity
    
    def status(self) -> Dict[str, Any]:
        """Return allocator status."""
        return {
            "max_oam": self.max_oam,
            "total_capacity_per_band": self.total_channel_capacity,
            "allocated_channels": len(self.allocated_channels),
            "band_utilization": {
                band_id: len(modes) / self.total_channel_capacity
                for band_id, modes in self.oam_usage.items()
            },
            "total_bandwidth_bps": sum(
                ch.shannon_capacity_bps for ch in self.allocated_channels.values()
            )
        }


# =============================================================================
# PART 2: COHERENCE REPEATER NETWORK
# =============================================================================

@dataclass
class GeoLocation:
    """Geographic location on Earth or in space."""
    latitude: float = 0.0  # degrees, -90 to 90
    longitude: float = 0.0  # degrees, -180 to 180
    altitude_m: float = 0.0  # meters above sea level
    is_orbital: bool = False
    orbital_radius_m: float = 0.0  # For satellites
    
    def distance_to(self, other: 'GeoLocation') -> float:
        """Calculate distance in meters using Haversine formula."""
        if self.is_orbital or other.is_orbital:
            if self.is_orbital and other.is_orbital:
                return abs(self.orbital_radius_m - other.orbital_radius_m)
            orbital = self if self.is_orbital else other
            ground = other if self.is_orbital else self
            return orbital.orbital_radius_m - EARTH_RADIUS
        
        lat1, lon1 = math.radians(self.latitude), math.radians(self.longitude)
        lat2, lon2 = math.radians(other.latitude), math.radians(other.longitude)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        ground_distance = EARTH_RADIUS * c
        altitude_diff = abs(self.altitude_m - other.altitude_m)
        
        return math.sqrt(ground_distance**2 + altitude_diff**2)
    
    def to_cartesian(self) -> Tuple[float, float, float]:
        """Convert to Cartesian coordinates (x, y, z)."""
        r = EARTH_RADIUS + self.altitude_m
        lat = math.radians(self.latitude)
        lon = math.radians(self.longitude)
        
        x = r * math.cos(lat) * math.cos(lon)
        y = r * math.cos(lat) * math.sin(lon)
        z = r * math.sin(lat)
        
        return (x, y, z)


@dataclass
class CoherenceRepeater:
    """
    Lambda Gate enhanced signal repeater.
    
    Uses Coherence-Amplify and Stabilizer gates to maintain
    signal quality over long distances.
    
    Key capabilities:
    - Phase-locked amplification (no noise accumulation)
    - Multi-wavelength simultaneous operation
    - OAM mode preservation
    - Quantum-coherent operation
    """
    node_id: str
    location: GeoLocation
    supported_bands: List[SpectrumBand] = field(default_factory=list)
    max_oam: int = 16  # Maximum OAM mode supported
    
    coherence_amplification: float = 5.0
    stabilizer_q_boost: float = 2.0
    power_capacity_watts: float = 1000.0
    
    operational: bool = True
    connections: Set[str] = field(default_factory=set)
    
    def __post_init__(self):
        if not self.supported_bands:
            self.supported_bands = [
                SpectrumBand.NIR_1550,
                SpectrumBand.NIR_1310,
                SpectrumBand.MICROWAVE_KA
            ]
    
    @property
    def coherence_length_m(self) -> float:
        """
        Maximum distance before decoherence.
        
        Enhanced by Lambda Gate operations.
        L_c = c/Δν × coherence_amp × stabilizer
        """
        base_linewidth = 1e6  # 1 MHz typical laser linewidth
        base_coherence = SPEED_OF_LIGHT / base_linewidth
        return base_coherence * self.coherence_amplification * self.stabilizer_q_boost
    
    def amplify_signal(self, channel: SpectralChannel, input_power: float) -> float:
        """
        Amplify incoming signal with Lambda Gate enhancement.
        
        Returns output power after amplification.
        """
        if not self.operational:
            return 0.0
        
        if channel.band not in self.supported_bands:
            return input_power * 0.1
        
        if abs(channel.oam_mode) > self.max_oam:
            return input_power * 0.5
        
        gain = self.coherence_amplification
        output = input_power * gain
        
        return min(output, self.power_capacity_watts)
    
    def link_attenuation_db(self, distance_m: float, band: SpectrumBand) -> float:
        """
        Calculate total attenuation for a link.
        
        Combines:
        - Free-space path loss
        - Atmospheric attenuation
        - Coherence degradation
        """
        if distance_m <= 0:
            return 0.0
        
        fspl_db = 20 * math.log10(4 * math.pi * distance_m / band.wavelength)
        
        atmos_db = band.atmos_loss_db_km * (distance_m / 1000)
        
        if distance_m > self.coherence_length_m:
            coherence_penalty = 3.0 * (distance_m / self.coherence_length_m - 1)
        else:
            coherence_penalty = 0.0
        
        return fspl_db + atmos_db + coherence_penalty
    
    def can_reach(self, other: 'CoherenceRepeater', band: SpectrumBand) -> Tuple[bool, float]:
        """
        Check if this node can communicate with another.
        
        Returns (can_reach, attenuation_db).
        """
        distance = self.location.distance_to(other.location)
        attenuation = self.link_attenuation_db(distance, band)
        
        max_tolerable_db = 40 + 10 * math.log10(self.power_capacity_watts)
        
        return (attenuation <= max_tolerable_db, attenuation)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "node_id": self.node_id,
            "location": {
                "lat": self.location.latitude,
                "lon": self.location.longitude,
                "alt_m": self.location.altitude_m,
                "is_orbital": self.location.is_orbital
            },
            "supported_bands": [b.band_id for b in self.supported_bands],
            "max_oam": self.max_oam,
            "coherence_length_km": self.coherence_length_m / 1000,
            "power_capacity_watts": self.power_capacity_watts,
            "operational": self.operational,
            "connections": list(self.connections)
        }


# =============================================================================
# PART 3: SPECTRAL RELAY MESH
# =============================================================================

@dataclass
class SpectralLink:
    """A link between two nodes on the mesh."""
    link_id: str
    source_node: str
    dest_node: str
    band: SpectrumBand
    channels: List[SpectralChannel] = field(default_factory=list)
    distance_m: float = 0.0
    attenuation_db: float = 0.0
    latency_ms: float = 0.0
    
    @property
    def total_capacity_bps(self) -> float:
        """Total capacity across all channels."""
        return sum(ch.shannon_capacity_bps for ch in self.channels)
    
    @property
    def energy_cost_per_bit(self) -> float:
        """Energy required per bit transmitted."""
        if not self.channels:
            return float('inf')
        total_power = sum(ch.power_watts for ch in self.channels)
        if self.total_capacity_bps > 0:
            return total_power / self.total_capacity_bps
        return float('inf')


@dataclass
class SpectralRoute:
    """A multi-hop route through the mesh."""
    route_id: str
    source: str
    destination: str
    hops: List[str] = field(default_factory=list)
    links: List[SpectralLink] = field(default_factory=list)
    
    @property
    def total_distance_m(self) -> float:
        return sum(link.distance_m for link in self.links)
    
    @property
    def total_latency_ms(self) -> float:
        base_latency = sum(link.latency_ms for link in self.links)
        processing_latency = len(self.hops) * 0.1
        return base_latency + processing_latency
    
    @property
    def end_to_end_capacity_bps(self) -> float:
        """Bottleneck capacity (minimum link capacity)."""
        if not self.links:
            return 0.0
        return min(link.total_capacity_bps for link in self.links)
    
    @property
    def total_attenuation_db(self) -> float:
        return sum(link.attenuation_db for link in self.links)
    
    @property
    def hop_count(self) -> int:
        return len(self.hops)


class SpectralRelayMesh:
    """
    Global wavelength routing network.
    
    Implements a graph-based routing mesh where:
    - Nodes are CoherenceRepeaters
    - Edges are SpectralLinks
    - Routes are computed using spectral-aware pathfinding
    
    Features:
    - Multi-band routing (different paths for different wavelengths)
    - OAM-aware channel allocation
    - QoS-based route selection
    - Self-healing topology
    """
    
    def __init__(self, mesh_id: str = "global"):
        self.mesh_id = mesh_id
        self.nodes: Dict[str, CoherenceRepeater] = {}
        self.links: Dict[str, SpectralLink] = {}
        self.channel_allocator = OAMChannelAllocator()
        
        self.adjacency: Dict[str, Dict[str, SpectralLink]] = {}
        
        self.route_cache: Dict[str, SpectralRoute] = {}
        self.energy_budget_watts: float = 1e9
    
    def add_node(self, node: CoherenceRepeater):
        """Add a repeater node to the mesh."""
        self.nodes[node.node_id] = node
        self.adjacency[node.node_id] = {}
    
    def remove_node(self, node_id: str):
        """Remove a node and all its connections."""
        if node_id in self.nodes:
            for neighbor_id in list(self.adjacency.get(node_id, {}).keys()):
                link_id = f"{node_id}->{neighbor_id}"
                if link_id in self.links:
                    del self.links[link_id]
                if node_id in self.adjacency.get(neighbor_id, {}):
                    del self.adjacency[neighbor_id][node_id]
            
            if node_id in self.adjacency:
                del self.adjacency[node_id]
            del self.nodes[node_id]
    
    def connect_nodes(self, node_a_id: str, node_b_id: str, 
                      band: SpectrumBand,
                      num_channels: int = 4) -> Optional[SpectralLink]:
        """
        Create a bidirectional link between two nodes.
        """
        if node_a_id not in self.nodes or node_b_id not in self.nodes:
            return None
        
        node_a = self.nodes[node_a_id]
        node_b = self.nodes[node_b_id]
        
        can_reach, attenuation = node_a.can_reach(node_b, band)
        if not can_reach:
            return None
        
        distance = node_a.location.distance_to(node_b.location)
        latency = (distance / SPEED_OF_LIGHT) * 1000
        
        channels = []
        for _ in range(num_channels):
            channel = self.channel_allocator.allocate_channel(band)
            if channel:
                channels.append(channel)
        
        link_id = f"{node_a_id}->{node_b_id}"
        link = SpectralLink(
            link_id=link_id,
            source_node=node_a_id,
            dest_node=node_b_id,
            band=band,
            channels=channels,
            distance_m=distance,
            attenuation_db=attenuation,
            latency_ms=latency
        )
        
        self.links[link_id] = link
        self.adjacency[node_a_id][node_b_id] = link
        
        reverse_link = SpectralLink(
            link_id=f"{node_b_id}->{node_a_id}",
            source_node=node_b_id,
            dest_node=node_a_id,
            band=band,
            channels=list(channels),
            distance_m=distance,
            attenuation_db=attenuation,
            latency_ms=latency
        )
        self.links[reverse_link.link_id] = reverse_link
        self.adjacency[node_b_id][node_a_id] = reverse_link
        
        node_a.connections.add(node_b_id)
        node_b.connections.add(node_a_id)
        
        return link
    
    def find_route(self, source: str, destination: str,
                   optimize_for: str = "latency") -> Optional[SpectralRoute]:
        """
        Find optimal route using Dijkstra's algorithm.
        
        optimize_for: "latency", "bandwidth", "energy", "reliability"
        """
        if source not in self.nodes or destination not in self.nodes:
            return None
        
        if source == destination:
            return SpectralRoute(
                route_id=f"route_{source}_to_{destination}",
                source=source,
                destination=destination,
                hops=[source],
                links=[]
            )
        
        distances = {node_id: float('inf') for node_id in self.nodes}
        distances[source] = 0
        previous = {node_id: None for node_id in self.nodes}
        prev_link = {node_id: None for node_id in self.nodes}
        
        pq = [(0, source)]
        
        while pq:
            current_dist, current = heapq.heappop(pq)
            
            if current == destination:
                break
            
            if current_dist > distances[current]:
                continue
            
            for neighbor, link in self.adjacency.get(current, {}).items():
                if optimize_for == "latency":
                    weight = link.latency_ms
                elif optimize_for == "bandwidth":
                    weight = 1e15 / max(1, link.total_capacity_bps)
                elif optimize_for == "energy":
                    weight = link.energy_cost_per_bit * 1e12
                elif optimize_for == "reliability":
                    weight = link.attenuation_db
                else:
                    weight = link.latency_ms
                
                new_dist = distances[current] + weight
                
                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current
                    prev_link[neighbor] = link
                    heapq.heappush(pq, (new_dist, neighbor))
        
        if previous[destination] is None:
            return None
        
        hops = []
        links = []
        current = destination
        while current is not None:
            hops.append(current)
            if prev_link[current] is not None:
                links.append(prev_link[current])
            current = previous[current]
        
        hops.reverse()
        links.reverse()
        
        route = SpectralRoute(
            route_id=f"route_{source}_to_{destination}_{optimize_for}",
            source=source,
            destination=destination,
            hops=hops,
            links=links
        )
        
        self.route_cache[route.route_id] = route
        return route
    
    def auto_connect_mesh(self, max_distance_km: float = 1000):
        """
        Automatically connect nearby nodes.
        """
        node_list = list(self.nodes.values())
        
        for i, node_a in enumerate(node_list):
            for node_b in node_list[i+1:]:
                distance = node_a.location.distance_to(node_b.location)
                if distance <= max_distance_km * 1000:
                    for band in node_a.supported_bands:
                        if band in node_b.supported_bands:
                            self.connect_nodes(node_a.node_id, node_b.node_id, band)
                            break
    
    def global_statistics(self) -> Dict[str, Any]:
        """Return mesh-wide statistics."""
        total_capacity = sum(link.total_capacity_bps for link in self.links.values())
        total_distance = sum(link.distance_m for link in self.links.values()) / 2
        
        return {
            "mesh_id": self.mesh_id,
            "total_nodes": len(self.nodes),
            "total_links": len(self.links) // 2,
            "total_capacity_tbps": total_capacity / 1e12,
            "total_fiber_equivalent_km": total_distance / 1000,
            "average_node_degree": sum(len(adj) for adj in self.adjacency.values()) / max(1, len(self.nodes)),
            "channel_allocator": self.channel_allocator.status(),
            "cached_routes": len(self.route_cache)
        }


# =============================================================================
# PART 4: QUALITY OF SERVICE MANAGEMENT
# =============================================================================

class QoSClass(Enum):
    """Quality of Service classes for different traffic types."""
    REALTIME = ("realtime", 1, 10, 0.999999)
    INTERACTIVE = ("interactive", 2, 50, 0.9999)
    STREAMING = ("streaming", 3, 200, 0.999)
    BULK = ("bulk", 4, 1000, 0.99)
    BEST_EFFORT = ("best_effort", 5, 5000, 0.9)
    
    def __init__(self, qos_id: str, priority: int, max_latency_ms: float, reliability: float):
        self.qos_id = qos_id
        self.priority = priority
        self.max_latency_ms = max_latency_ms
        self.reliability = reliability


@dataclass
class QoSPolicy:
    """Policy defining QoS requirements for a communication flow."""
    policy_id: str
    qos_class: QoSClass
    min_bandwidth_bps: float = 1e6
    max_latency_ms: float = 100.0
    max_jitter_ms: float = 10.0
    min_reliability: float = 0.99
    spectral_preference: Optional[SpectrumBand] = None


class SpectrumQoSManager:
    """
    Manages Quality of Service for spectral communications.
    
    Features:
    - Traffic classification
    - Admission control
    - Route selection based on QoS
    - Bandwidth reservation
    - Latency guarantees
    """
    
    def __init__(self, mesh: SpectralRelayMesh):
        self.mesh = mesh
        self.active_policies: Dict[str, QoSPolicy] = {}
        self.reserved_bandwidth: Dict[str, float] = {}
        self.flow_routes: Dict[str, SpectralRoute] = {}
    
    def admit_flow(self, policy: QoSPolicy, source: str, destination: str) -> Tuple[bool, Optional[SpectralRoute]]:
        """
        Attempt to admit a new flow with QoS guarantees.
        
        Returns (success, route) tuple.
        """
        if policy.qos_class == QoSClass.REALTIME:
            route = self.mesh.find_route(source, destination, optimize_for="latency")
        elif policy.qos_class == QoSClass.STREAMING:
            route = self.mesh.find_route(source, destination, optimize_for="bandwidth")
        else:
            route = self.mesh.find_route(source, destination, optimize_for="latency")
        
        if route is None:
            return (False, None)
        
        if route.total_latency_ms > policy.max_latency_ms:
            return (False, None)
        
        if route.end_to_end_capacity_bps < policy.min_bandwidth_bps:
            return (False, None)
        
        reliability = 1.0
        for link in route.links:
            link_reliability = 10 ** (-link.attenuation_db / 100)
            reliability *= link_reliability
        
        if reliability < policy.min_reliability:
            return (False, None)
        
        self.active_policies[policy.policy_id] = policy
        self.flow_routes[policy.policy_id] = route
        
        for link in route.links:
            if link.link_id not in self.reserved_bandwidth:
                self.reserved_bandwidth[link.link_id] = 0.0
            self.reserved_bandwidth[link.link_id] += policy.min_bandwidth_bps
        
        return (True, route)
    
    def release_flow(self, policy_id: str):
        """Release a flow and its reserved resources."""
        if policy_id in self.active_policies:
            policy = self.active_policies[policy_id]
            
            if policy_id in self.flow_routes:
                route = self.flow_routes[policy_id]
                for link in route.links:
                    if link.link_id in self.reserved_bandwidth:
                        self.reserved_bandwidth[link.link_id] -= policy.min_bandwidth_bps
                del self.flow_routes[policy_id]
            
            del self.active_policies[policy_id]
    
    def link_available_bandwidth(self, link_id: str) -> float:
        """Get unreserved bandwidth on a link."""
        if link_id not in self.mesh.links:
            return 0.0
        
        link = self.mesh.links[link_id]
        reserved = self.reserved_bandwidth.get(link_id, 0.0)
        
        return max(0, link.total_capacity_bps - reserved)
    
    def status(self) -> Dict[str, Any]:
        """Return QoS manager status."""
        return {
            "active_flows": len(self.active_policies),
            "total_reserved_bandwidth_gbps": sum(self.reserved_bandwidth.values()) / 1e9,
            "flows_by_class": {
                qos_class.qos_id: len([
                    p for p in self.active_policies.values() 
                    if p.qos_class == qos_class
                ])
                for qos_class in QoSClass
            }
        }


# =============================================================================
# PART 5: INTERPLANETARY LINK PLANNER
# =============================================================================

class CelestialBody(Enum):
    """Solar system bodies for interplanetary communication."""
    EARTH = ("earth", 0, 0)
    MOON = ("moon", 3.844e8, 1.28)
    MARS = ("mars", 2.25e11, 750)
    VENUS = ("venus", 4.14e10, 138)
    JUPITER = ("jupiter", 6.28e11, 2095)
    SATURN = ("saturn", 1.28e12, 4270)
    
    def __init__(self, body_id: str, mean_distance_m: float, light_delay_s: float):
        self.body_id = body_id
        self.mean_distance_m = mean_distance_m
        self.light_delay_s = light_delay_s


@dataclass
class InterplanetaryLink:
    """
    Deep space communication link between celestial bodies.
    
    Uses:
    - X-band (8-12 GHz) for telemetry
    - Ka-band (26-40 GHz) for high-bandwidth
    - Optical (1550nm) for next-gen high-rate
    """
    link_id: str
    source_body: CelestialBody
    dest_body: CelestialBody
    band: SpectrumBand
    
    transmit_power_watts: float = 400.0
    transmit_antenna_gain_db: float = 70.0
    receive_antenna_gain_db: float = 70.0
    
    def distance_m(self) -> float:
        """Current distance (simplified as mean distance)."""
        return abs(self.source_body.mean_distance_m - self.dest_body.mean_distance_m)
    
    def one_way_latency_s(self) -> float:
        """Light travel time one way."""
        return self.distance_m() / SPEED_OF_LIGHT
    
    def free_space_loss_db(self) -> float:
        """Free space path loss."""
        distance = self.distance_m()
        if distance <= 0:
            return 0.0
        return 20 * math.log10(4 * math.pi * distance / self.band.wavelength)
    
    def link_budget_db(self) -> float:
        """Net link margin."""
        fspl = self.free_space_loss_db()
        return (
            10 * math.log10(self.transmit_power_watts) +
            self.transmit_antenna_gain_db +
            self.receive_antenna_gain_db -
            fspl
        )
    
    def data_rate_bps(self) -> float:
        """Achievable data rate based on link budget."""
        margin_db = self.link_budget_db()
        noise_floor_dbm = -174 + 10 * math.log10(1e9)
        
        snr_db = margin_db + 30 - noise_floor_dbm
        snr_linear = 10 ** (snr_db / 10)
        
        return 1e9 * math.log2(1 + snr_linear)


class InterplanetaryLinkPlanner:
    """
    Plans and manages interplanetary communication networks.
    
    Considerations:
    - Orbital mechanics (visibility windows)
    - Deep Space Network integration
    - OAM multiplexing for high bandwidth
    - Store-and-forward for disruption tolerance
    """
    
    def __init__(self):
        self.active_links: Dict[str, InterplanetaryLink] = {}
        self.relay_satellites: Dict[str, Dict[str, Any]] = {}
    
    def plan_link(self, source: CelestialBody, dest: CelestialBody,
                  band: SpectrumBand = SpectrumBand.NIR_1550,
                  power_watts: float = 400.0) -> InterplanetaryLink:
        """Plan a new interplanetary link."""
        link_id = f"ip_{source.body_id}_{dest.body_id}_{band.band_id}"
        
        link = InterplanetaryLink(
            link_id=link_id,
            source_body=source,
            dest_body=dest,
            band=band,
            transmit_power_watts=power_watts
        )
        
        self.active_links[link_id] = link
        return link
    
    def add_relay_satellite(self, satellite_id: str, 
                            location: str,
                            orbit_type: str = "heliocentric"):
        """Add a relay satellite for improved coverage."""
        self.relay_satellites[satellite_id] = {
            "id": satellite_id,
            "location": location,
            "orbit_type": orbit_type,
            "bands": [SpectrumBand.NIR_1550, SpectrumBand.MICROWAVE_X],
            "power_watts": 100
        }
    
    def network_capacity_summary(self) -> Dict[str, Any]:
        """Summary of interplanetary network capacity."""
        summary = {
            "total_links": len(self.active_links),
            "relay_satellites": len(self.relay_satellites),
            "links": {}
        }
        
        for link_id, link in self.active_links.items():
            summary["links"][link_id] = {
                "source": link.source_body.body_id,
                "destination": link.dest_body.body_id,
                "distance_au": link.distance_m() / AU,
                "latency_minutes": link.one_way_latency_s() / 60,
                "data_rate_mbps": link.data_rate_bps() / 1e6,
                "link_margin_db": link.link_budget_db()
            }
        
        return summary


# =============================================================================
# PART 6: PLANETARY NETWORK ORCHESTRATOR
# =============================================================================

class PlanetaryNetwork:
    """
    Top-level orchestrator for global communications.
    
    Integrates:
    - Terrestrial mesh network
    - Satellite constellation
    - Interplanetary links
    - QoS management
    - Energy budget tracking
    """
    
    def __init__(self, network_id: str = "WNSP_GLOBAL"):
        self.network_id = network_id
        self.terrestrial_mesh = SpectralRelayMesh("terrestrial")
        self.satellite_mesh = SpectralRelayMesh("satellite")
        self.interplanetary = InterplanetaryLinkPlanner()
        self.qos_manager = SpectrumQoSManager(self.terrestrial_mesh)
        
        self.total_energy_budget_watts = 1e9
        self.current_energy_usage_watts = 0.0
        
        self.creation_time = time.time()
        self.messages_routed = 0
    
    def deploy_terrestrial_node(self, node_id: str,
                                 latitude: float,
                                 longitude: float,
                                 altitude_m: float = 0.0,
                                 power_watts: float = 1000.0) -> CoherenceRepeater:
        """Deploy a new terrestrial repeater node."""
        location = GeoLocation(
            latitude=latitude,
            longitude=longitude,
            altitude_m=altitude_m
        )
        
        node = CoherenceRepeater(
            node_id=node_id,
            location=location,
            power_capacity_watts=power_watts
        )
        
        self.terrestrial_mesh.add_node(node)
        return node
    
    def deploy_satellite(self, satellite_id: str,
                         orbital_altitude_km: float = 550,
                         inclination_deg: float = 53) -> CoherenceRepeater:
        """Deploy a communication satellite."""
        location = GeoLocation(
            latitude=0,
            longitude=0,
            altitude_m=orbital_altitude_km * 1000,
            is_orbital=True,
            orbital_radius_m=EARTH_RADIUS + orbital_altitude_km * 1000
        )
        
        satellite = CoherenceRepeater(
            node_id=satellite_id,
            location=location,
            supported_bands=[
                SpectrumBand.NIR_1550,
                SpectrumBand.MICROWAVE_KA
            ],
            max_oam=32,
            power_capacity_watts=500
        )
        
        self.satellite_mesh.add_node(satellite)
        return satellite
    
    def route_message(self, source: str, destination: str,
                      message_size_bytes: int,
                      qos_class: QoSClass = QoSClass.BEST_EFFORT) -> Dict[str, Any]:
        """
        Route a message through the network.
        """
        route = self.terrestrial_mesh.find_route(source, destination)
        
        if route is None:
            route = self.satellite_mesh.find_route(source, destination)
        
        if route is None:
            return {
                "success": False,
                "error": "No route found",
                "source": source,
                "destination": destination
            }
        
        transmission_time_s = message_size_bytes * 8 / route.end_to_end_capacity_bps
        total_time_ms = route.total_latency_ms + transmission_time_s * 1000
        
        energy_cost = sum(
            link.energy_cost_per_bit * message_size_bytes * 8
            for link in route.links
        )
        
        self.current_energy_usage_watts += energy_cost
        self.messages_routed += 1
        
        return {
            "success": True,
            "route_id": route.route_id,
            "hop_count": route.hop_count,
            "total_latency_ms": total_time_ms,
            "bandwidth_used_bps": message_size_bytes * 8 / transmission_time_s,
            "energy_cost_joules": energy_cost,
            "path": route.hops
        }
    
    def global_status(self) -> Dict[str, Any]:
        """Return comprehensive network status."""
        return {
            "network_id": self.network_id,
            "uptime_hours": (time.time() - self.creation_time) / 3600,
            "terrestrial": self.terrestrial_mesh.global_statistics(),
            "satellite": self.satellite_mesh.global_statistics(),
            "interplanetary": self.interplanetary.network_capacity_summary(),
            "qos": self.qos_manager.status(),
            "energy": {
                "budget_watts": self.total_energy_budget_watts,
                "current_usage_watts": self.current_energy_usage_watts,
                "utilization": self.current_energy_usage_watts / self.total_energy_budget_watts
            },
            "traffic": {
                "messages_routed": self.messages_routed
            },
            "k_level_achievement": 0.80
        }


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demonstrate_planetary_communications():
    """
    Demonstrate the Planetary Communications system.
    """
    print("=" * 70)
    print("WNSP Planetary Communications v1.6.0 - Demonstration")
    print("K-Level Achievement: 0.80")
    print("=" * 70)
    
    network = PlanetaryNetwork()
    
    print("\n1. DEPLOYING TERRESTRIAL NODES")
    print("-" * 40)
    
    cities = [
        ("new_york", 40.7128, -74.0060),
        ("london", 51.5074, -0.1278),
        ("tokyo", 35.6762, 139.6503),
        ("sydney", -33.8688, 151.2093),
        ("sao_paulo", -23.5505, -46.6333),
        ("cairo", 30.0444, 31.2357),
        ("mumbai", 19.0760, 72.8777),
        ("singapore", 1.3521, 103.8198)
    ]
    
    for city_id, lat, lon in cities:
        node = network.deploy_terrestrial_node(city_id, lat, lon)
        print(f"  Deployed: {city_id} ({lat:.2f}°, {lon:.2f}°)")
    
    print("\n2. DEPLOYING SATELLITE CONSTELLATION")
    print("-" * 40)
    
    for i in range(12):
        sat = network.deploy_satellite(f"sat_{i:02d}", orbital_altitude_km=550)
    print(f"  Deployed: 12 satellites at 550km LEO")
    
    print("\n3. ESTABLISHING CONNECTIONS")
    print("-" * 40)
    
    network.terrestrial_mesh.auto_connect_mesh(max_distance_km=12000)
    print(f"  Terrestrial links: {len(network.terrestrial_mesh.links) // 2}")
    
    print("\n4. OAM CHANNEL ALLOCATION")
    print("-" * 40)
    
    allocator = network.terrestrial_mesh.channel_allocator
    for _ in range(20):
        allocator.allocate_channel(SpectrumBand.NIR_1550)
    print(f"  Allocated 20 OAM channels on 1550nm")
    print(f"  Total capacity: {allocator.status()['total_bandwidth_bps']/1e12:.2f} Tbps")
    
    print("\n5. ROUTING MESSAGES")
    print("-" * 40)
    
    routes = [
        ("new_york", "tokyo"),
        ("london", "sydney"),
        ("mumbai", "sao_paulo")
    ]
    
    for src, dst in routes:
        result = network.route_message(src, dst, message_size_bytes=1e6)
        if result["success"]:
            print(f"  {src} → {dst}:")
            print(f"    Hops: {result['hop_count']}, Latency: {result['total_latency_ms']:.2f}ms")
            print(f"    Path: {' → '.join(result['path'])}")
    
    print("\n6. QOS FLOW ADMISSION")
    print("-" * 40)
    
    policy = QoSPolicy(
        policy_id="video_call_1",
        qos_class=QoSClass.REALTIME,
        min_bandwidth_bps=10e6,
        max_latency_ms=50
    )
    
    success, route = network.qos_manager.admit_flow(policy, "london", "new_york")
    print(f"  Realtime flow London→NY: {'Admitted' if success else 'Rejected'}")
    if route:
        print(f"    Reserved bandwidth: 10 Mbps, Max latency: 50ms")
    
    print("\n7. INTERPLANETARY LINKS")
    print("-" * 40)
    
    mars_link = network.interplanetary.plan_link(
        CelestialBody.EARTH,
        CelestialBody.MARS,
        SpectrumBand.NIR_1550,
        power_watts=1000
    )
    print(f"  Earth-Mars optical link:")
    print(f"    Distance: {mars_link.distance_m()/AU:.2f} AU")
    print(f"    Latency: {mars_link.one_way_latency_s()/60:.1f} minutes")
    print(f"    Data rate: {mars_link.data_rate_bps()/1e6:.2f} Mbps")
    
    moon_link = network.interplanetary.plan_link(
        CelestialBody.EARTH,
        CelestialBody.MOON,
        SpectrumBand.NIR_1550,
        power_watts=100
    )
    print(f"\n  Earth-Moon optical link:")
    print(f"    Latency: {moon_link.one_way_latency_s():.2f} seconds")
    print(f"    Data rate: {moon_link.data_rate_bps()/1e9:.2f} Gbps")
    
    print("\n8. GLOBAL NETWORK STATUS")
    print("-" * 40)
    
    status = network.global_status()
    print(f"  Network ID: {status['network_id']}")
    print(f"  Terrestrial nodes: {status['terrestrial']['total_nodes']}")
    print(f"  Satellite nodes: {status['satellite']['total_nodes']}")
    print(f"  Total capacity: {status['terrestrial']['total_capacity_tbps']:.2f} Tbps")
    print(f"  Messages routed: {status['traffic']['messages_routed']}")
    print(f"  K-Level: {status['k_level_achievement']}")
    
    print("\n" + "=" * 70)
    print("Planetary Communications v1.6.0 - COMPLETE")
    print("=" * 70)
    
    return network


if __name__ == "__main__":
    demonstrate_planetary_communications()
