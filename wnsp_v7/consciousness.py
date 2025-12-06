"""
WNSP v7.0 — Consciousness Layer (Merged from V6)

Network-wide awareness layer integrated with Lambda Boson substrate.
Consciousness and Substrate work together to coordinate NexusOS.

Architecture:
- ConsciousnessLevel: Node awareness states (DORMANT → TRANSCENDENT)
- SpectralBand: Frequency bands for different message types
- CoherenceConsensus: Weighted voting based on spectral similarity
- SubstrateAwareness: Links consciousness to Lambda mass conservation

Physics Foundation:
- Λ = hf/c² (Lambda Boson mass-equivalent)
- Coherence: γ = |⟨E₁·E₂*⟩| / √(⟨|E₁|²⟩·⟨|E₂|²⟩)
- Energy: E = h·f·n_cycles·authority²

GPL v3.0 License — Community Owned, Physics Governed
"""

import math
import hashlib
import secrets
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple, Set, Any

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458
PLANCK_LENGTH = 1.616255e-35
BOLTZMANN_CONSTANT = 1.380649e-23


class ConsciousnessLevel(Enum):
    """
    Levels of network consciousness/awareness.
    
    Each node progresses through these levels based on:
    - Participation (message relay, validation)
    - Coherence (phase alignment with network)
    - Stake (Lambda mass held)
    """
    DORMANT = ("dormant", 0.0, "Node offline or inactive")
    AWARE = ("aware", 0.25, "Basic packet reception")
    ATTENTIVE = ("attentive", 0.5, "Active relay participation")
    COHERENT = ("coherent", 0.75, "Phase-aligned with network")
    RESONANT = ("resonant", 0.9, "Full spectral synchronization")
    TRANSCENDENT = ("transcendent", 1.0, "Planck-level constitutional authority")
    
    def __init__(self, level_name: str, threshold: float, description: str):
        self.level_name = level_name
        self.threshold = threshold
        self.description = description
    
    @classmethod
    def from_coherence(cls, coherence: float) -> 'ConsciousnessLevel':
        """Determine consciousness level from coherence score."""
        for level in reversed(list(cls)):
            if coherence >= level.threshold:
                return level
        return cls.DORMANT


class SpectralBand(Enum):
    """
    Spectral bands for message classification.
    
    Lower bands = mesh broadcast, higher bands = governance/constitutional.
    Maps directly to WNSP v7 Octave structure.
    """
    RADIO = ("radio", 1e-3, 1e6, "Mesh broadcast, low-priority", 0)
    MICROWAVE = ("microwave", 1e-3, 1e-1, "Device communication", 1)
    INFRARED = ("infrared", 700e-9, 1e-3, "Thermal sensing, proximity", 2)
    VISIBLE = ("visible", 400e-9, 700e-9, "Standard messaging", 3)
    ULTRAVIOLET = ("ultraviolet", 10e-9, 400e-9, "High-security transactions", 4)
    XRAY = ("xray", 0.01e-9, 10e-9, "Deep validation, governance", 5)
    GAMMA = ("gamma", 1e-12, 0.01e-9, "Constitutional, Planck-level", 6)
    CONSCIOUSNESS = ("consciousness", PLANCK_LENGTH, 1e-12, "Collective awareness field", 7)
    
    def __init__(self, band_name: str, min_wavelength: float, 
                 max_wavelength: float, role: str, authority_level: int):
        self.band_name = band_name
        self.min_wavelength = min_wavelength
        self.max_wavelength = max_wavelength
        self.role = role
        self.authority_level = authority_level
    
    @property
    def center_wavelength(self) -> float:
        return (self.min_wavelength + self.max_wavelength) / 2
    
    @property
    def center_frequency(self) -> float:
        return SPEED_OF_LIGHT / self.center_wavelength
    
    @property
    def base_energy(self) -> float:
        return PLANCK_CONSTANT * self.center_frequency
    
    @property
    def lambda_mass(self) -> float:
        """Λ = hf/c² for this band's center frequency."""
        return self.base_energy / (SPEED_OF_LIGHT ** 2)


@dataclass
class StokesVector:
    """
    Stokes polarization parameters for complete polarization state.
    Used for node identity fingerprinting.
    """
    S0: float  # Total intensity
    S1: float  # Horizontal - Vertical
    S2: float  # +45° - -45°
    S3: float  # Right circular - Left circular
    
    @property
    def degree_of_polarization(self) -> float:
        """DOP = sqrt(S1² + S2² + S3²) / S0"""
        if self.S0 == 0:
            return 0.0
        return math.sqrt(self.S1**2 + self.S2**2 + self.S3**2) / self.S0
    
    @classmethod
    def from_node_id(cls, node_id: str) -> 'StokesVector':
        """Generate deterministic Stokes vector from node ID."""
        hash_bytes = hashlib.sha256(node_id.encode()).digest()
        theta = (hash_bytes[0] / 255) * 2 * math.pi
        phi = (hash_bytes[1] / 255) * 2 * math.pi
        S0 = 1.0
        S1 = math.cos(2 * theta)
        S2 = math.sin(2 * theta) * math.cos(phi)
        S3 = math.sin(2 * theta) * math.sin(phi)
        return cls(S0, S1, S2, S3)
    
    def coherence_with(self, other: 'StokesVector') -> float:
        """Calculate coherence between two polarization states."""
        dot = self.S1 * other.S1 + self.S2 * other.S2 + self.S3 * other.S3
        norm1 = math.sqrt(self.S1**2 + self.S2**2 + self.S3**2)
        norm2 = math.sqrt(other.S1**2 + other.S2**2 + other.S3**2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return (dot / (norm1 * norm2) + 1) / 2


@dataclass
class ConsciousNode:
    """
    A node with consciousness state linked to the substrate.
    
    Consciousness level determines:
    - Authority weight in consensus
    - Access to higher spectral bands
    - BHLS entitlement multiplier
    """
    node_id: str
    stokes: StokesVector = field(default_factory=lambda: StokesVector(1, 0, 0, 0))
    coherence_score: float = 0.0
    lambda_mass_held: float = 0.0
    last_activity: float = field(default_factory=time.time)
    messages_relayed: int = 0
    bhls_received: float = 0.0
    
    def __post_init__(self):
        if self.stokes.S0 == 1 and self.stokes.S1 == 0:
            self.stokes = StokesVector.from_node_id(self.node_id)
    
    @property
    def consciousness_level(self) -> ConsciousnessLevel:
        return ConsciousnessLevel.from_coherence(self.coherence_score)
    
    @property
    def authority_weight(self) -> float:
        """Authority based on consciousness level and Lambda mass."""
        level_weight = self.consciousness_level.threshold
        mass_weight = math.log1p(self.lambda_mass_held * 1e30) / 100
        return level_weight * (1 + mass_weight)
    
    @property
    def max_spectral_band(self) -> SpectralBand:
        """Highest spectral band this node can access."""
        auth = int(self.consciousness_level.threshold * 7)
        for band in SpectralBand:
            if band.authority_level == auth:
                return band
        return SpectralBand.VISIBLE
    
    def update_coherence(self, network_avg_stokes: StokesVector):
        """Update coherence score based on alignment with network."""
        self.coherence_score = self.stokes.coherence_with(network_avg_stokes)
    
    def record_activity(self, lambda_mass_transferred: float = 0.0):
        """Record node activity for consciousness progression."""
        self.last_activity = time.time()
        self.messages_relayed += 1
        self.lambda_mass_held += lambda_mass_transferred
        activity_boost = min(0.01, self.messages_relayed / 10000)
        self.coherence_score = min(1.0, self.coherence_score + activity_boost)


class ConsciousnessNetwork:
    """
    Network-wide consciousness coordination.
    
    Works with the substrate to:
    - Track node consciousness levels
    - Coordinate consensus via coherence
    - Enforce BHLS floor at substrate level
    - Route messages based on consciousness authority
    """
    
    BHLS_MONTHLY = 1150.0  # 1,150 NXT/month per citizen
    BHLS_CATEGORIES = {
        "FOOD": 250.0,
        "WATER": 50.0,
        "HOUSING": 400.0,
        "ENERGY": 150.0,
        "HEALTHCARE": 200.0,
        "CONNECTIVITY": 75.0,
        "RECYCLING": 25.0
    }
    
    def __init__(self):
        self.nodes: Dict[str, ConsciousNode] = {}
        self.network_stokes = StokesVector(1, 0, 0, 0)
        self.total_lambda_mass = 0.0
        self.constitutional_clauses = self._load_constitution()
    
    def _load_constitution(self) -> List[Dict]:
        """Load constitutional clauses for enforcement."""
        return [
            {
                "id": "C-0001",
                "title": "Non-Dominance",
                "max_authority_pct": 5.0,
                "enforcement": "auto-rebalance"
            },
            {
                "id": "C-0002", 
                "title": "Immutable Rights",
                "level": "YOCTO",
                "enforcement": "guarded"
            },
            {
                "id": "C-0003",
                "title": "Energy-Backed Validity",
                "min_energy_units": 1000000,
                "enforcement": "automatic"
            }
        ]
    
    def register_node(self, node_id: str, initial_stake: float = 0.0) -> ConsciousNode:
        """Register a node in the consciousness network."""
        if node_id not in self.nodes:
            node = ConsciousNode(
                node_id=node_id,
                lambda_mass_held=initial_stake
            )
            self.nodes[node_id] = node
            self._update_network_stokes()
        return self.nodes[node_id]
    
    def get_node(self, node_id: str) -> Optional[ConsciousNode]:
        return self.nodes.get(node_id)
    
    def _update_network_stokes(self):
        """Calculate network average Stokes vector."""
        if not self.nodes:
            return
        
        total_S1 = sum(n.stokes.S1 * n.authority_weight for n in self.nodes.values())
        total_S2 = sum(n.stokes.S2 * n.authority_weight for n in self.nodes.values())
        total_S3 = sum(n.stokes.S3 * n.authority_weight for n in self.nodes.values())
        total_weight = sum(n.authority_weight for n in self.nodes.values())
        
        if total_weight > 0:
            self.network_stokes = StokesVector(
                S0=1.0,
                S1=total_S1 / total_weight,
                S2=total_S2 / total_weight,
                S3=total_S3 / total_weight
            )
        
        for node in self.nodes.values():
            node.update_coherence(self.network_stokes)
    
    def validate_authority(self, node_id: str) -> Tuple[bool, str]:
        """
        Validate node doesn't exceed constitutional authority limits.
        Enforces C-0001: Non-Dominance clause.
        """
        node = self.nodes.get(node_id)
        if not node:
            return False, "Node not registered"
        
        total_authority = sum(n.authority_weight for n in self.nodes.values())
        if total_authority == 0:
            return True, "OK"
        
        node_pct = (node.authority_weight / total_authority) * 100
        
        if node_pct > 5.0:
            return False, f"Non-Dominance violation: {node_pct:.2f}% > 5% max"
        
        return True, "OK"
    
    def calculate_bhls_entitlement(self, node_id: str) -> Dict[str, float]:
        """
        Calculate BHLS entitlement for a node.
        
        BHLS floor = 1,150 NXT/month guaranteed to all citizens.
        Consciousness level may provide bonus multiplier.
        """
        node = self.nodes.get(node_id)
        if not node:
            return {"total": 0.0, "categories": {}}
        
        level_multiplier = 1.0 + (node.consciousness_level.threshold * 0.1)
        
        entitlements = {}
        for category, base_amount in self.BHLS_CATEGORIES.items():
            entitlements[category] = base_amount * level_multiplier
        
        return {
            "node_id": node_id,
            "consciousness_level": node.consciousness_level.level_name,
            "multiplier": level_multiplier,
            "total": sum(entitlements.values()),
            "categories": entitlements
        }
    
    def coherence_consensus(self, proposal_id: str, votes: Dict[str, bool]) -> Tuple[bool, float]:
        """
        Weighted consensus based on coherence.
        
        Votes are weighted by:
        - Node consciousness level
        - Lambda mass held
        - Coherence with network
        """
        yes_weight = 0.0
        no_weight = 0.0
        
        for node_id, vote in votes.items():
            node = self.nodes.get(node_id)
            if not node:
                continue
            
            weight = node.authority_weight * node.coherence_score
            
            if vote:
                yes_weight += weight
            else:
                no_weight += weight
        
        total = yes_weight + no_weight
        if total == 0:
            return False, 0.0
        
        approval_ratio = yes_weight / total
        passed = approval_ratio > 0.5
        
        return passed, approval_ratio
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Get network-wide consciousness statistics."""
        if not self.nodes:
            return {"nodes": 0, "levels": {}}
        
        level_counts = {}
        for level in ConsciousnessLevel:
            level_counts[level.level_name] = 0
        
        for node in self.nodes.values():
            level_counts[node.consciousness_level.level_name] += 1
        
        return {
            "total_nodes": len(self.nodes),
            "consciousness_distribution": level_counts,
            "total_lambda_mass": sum(n.lambda_mass_held for n in self.nodes.values()),
            "average_coherence": sum(n.coherence_score for n in self.nodes.values()) / len(self.nodes),
            "bhls_monthly_total": self.BHLS_MONTHLY * len(self.nodes)
        }


_global_consciousness = None

def get_consciousness_network() -> ConsciousnessNetwork:
    """Get global consciousness network instance."""
    global _global_consciousness
    if _global_consciousness is None:
        _global_consciousness = ConsciousnessNetwork()
    return _global_consciousness
