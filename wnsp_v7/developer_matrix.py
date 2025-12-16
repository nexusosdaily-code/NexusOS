"""
WNSP Developer Matrix v1.0
===========================

A structured learning and credibility pathway for engineers, builders, and developers
to understand WNSP technology and begin constructing infrastructure.

The matrix answers:
1. WHAT do I need to know? (Knowledge Domains)
2. HOW do I prove I understand? (Certification Tracks)
3. WHAT can I build? (Infrastructure Tiers)
4. WHERE does my work anchor? (Substrate Connection)

Author: NexusOS / WNSP Protocol
License: AGPL v3.0
"""

import math
import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


# =============================================================================
# KNOWLEDGE DOMAINS - What You Need to Know
# =============================================================================

class KnowledgeDomain(Enum):
    """Core knowledge domains required for WNSP development."""
    
    # Foundation Layer
    WAVE_PHYSICS = ("wave_physics", 1, "Wave equation c=fλ, electromagnetic spectrum, photon energy E=hf")
    LAMBDA_BOSON = ("lambda_boson", 1, "Lambda mass Λ=hf/c², mass-equivalent of oscillation")
    
    # Protocol Layer
    WASCII_ENCODING = ("wascii_encoding", 2, "170+ character wavelength mapping, spectral bands")
    SPECTRAL_ROUTING = ("spectral_routing", 2, "Wavelength-based message routing, band allocation")
    
    # Substrate Layer
    LAMBDA_GATES = ("lambda_gates", 3, "8 photonic gates: Phase-Shift, Gain, Mode-Mixer, OAM-Rotor, etc.")
    CE1_PROTOCOL = ("ce1_protocol", 3, "Coherence Engineering: energy pools, coherence margin, non-dominance")
    
    # Constitutional Layer
    CONSTITUTIONAL_LAW = ("constitutional", 4, "C-0001 Non-Dominance, C-0002 Immutable Rights, C-0003 Energy-Backed")
    BHLS_ECONOMICS = ("bhls_economics", 4, "Basic Human Living Standards: 1,150 NXT floor, 7 categories")
    
    # Governance Layer
    AUTHORITY_BANDS = ("authority_bands", 5, "7-tier spectral hierarchy: Individual to Planetary")
    SIGMA_VOTING = ("sigma_voting", 5, "Coherence-weighted voting, interference tallying")
    
    # Infrastructure Layer
    PHOTONIC_COMPUTING = ("photonic_computing", 6, "Photonic logic gates, wavelength-division computing")
    PLANETARY_COMMS = ("planetary_comms", 6, "Spectral relay mesh, OAM channels, interplanetary links")
    RESOURCE_ORCHESTRATION = ("resource_orchestration", 6, "Wavelength ledger, lambda valuation, logistics")
    K1_ENERGY = ("k1_energy", 6, "Resonance harvesting, orbital solar, fusion photonics")
    
    def __init__(self, domain_id: str, level: int, description: str):
        self.domain_id = domain_id
        self.level = level
        self.description = description


class CertificationTrack(Enum):
    """Certification tracks for different builder roles."""
    
    PROTOCOL_DEVELOPER = ("protocol_dev", [
        KnowledgeDomain.WAVE_PHYSICS,
        KnowledgeDomain.LAMBDA_BOSON,
        KnowledgeDomain.WASCII_ENCODING,
        KnowledgeDomain.SPECTRAL_ROUTING
    ], "Build messaging, encoding, and communication systems")
    
    SUBSTRATE_ENGINEER = ("substrate_eng", [
        KnowledgeDomain.WAVE_PHYSICS,
        KnowledgeDomain.LAMBDA_BOSON,
        KnowledgeDomain.LAMBDA_GATES,
        KnowledgeDomain.CE1_PROTOCOL
    ], "Build core substrate operations and gate programs")
    
    GOVERNANCE_ARCHITECT = ("governance_arch", [
        KnowledgeDomain.CONSTITUTIONAL_LAW,
        KnowledgeDomain.BHLS_ECONOMICS,
        KnowledgeDomain.AUTHORITY_BANDS,
        KnowledgeDomain.SIGMA_VOTING
    ], "Build governance, voting, and constitutional systems")
    
    INFRASTRUCTURE_BUILDER = ("infra_builder", [
        KnowledgeDomain.LAMBDA_GATES,
        KnowledgeDomain.PHOTONIC_COMPUTING,
        KnowledgeDomain.PLANETARY_COMMS,
        KnowledgeDomain.RESOURCE_ORCHESTRATION
    ], "Build K1 civilization infrastructure: energy, comms, computing")
    
    FULL_STACK_ARCHITECT = ("full_stack", list(KnowledgeDomain), "Complete mastery of all domains")
    
    def __init__(self, track_id: str, domains: List[KnowledgeDomain], description: str):
        self.track_id = track_id
        self.required_domains = domains
        self.description = description


# =============================================================================
# INFRASTRUCTURE TIERS - What You Can Build
# =============================================================================

class InfrastructureTier(Enum):
    """Infrastructure tiers with authority requirements."""
    
    # Personal/Learning
    SANDBOX = ("sandbox", 0, "INDIVIDUAL", [
        "Personal wallets",
        "Test message encoding",
        "Learning exercises",
        "Prototype apps"
    ])
    
    # Community Tools
    COMMUNITY = ("community", 1, "LOCAL", [
        "Community messaging apps",
        "Local mesh networks",
        "Neighborhood resource sharing",
        "Education platforms"
    ])
    
    # Municipal Systems
    MUNICIPAL = ("municipal", 2, "MUNICIPAL", [
        "City-scale mesh networks",
        "Municipal resource tracking",
        "Local governance tools",
        "Urban energy grids"
    ])
    
    # Regional Infrastructure
    REGIONAL = ("regional", 3, "REGIONAL", [
        "Regional communication networks",
        "Multi-city resource orchestration",
        "Regional voting systems",
        "Interstate energy trading"
    ])
    
    # National Systems
    NATIONAL = ("national", 4, "NATIONAL", [
        "National spectrum allocation",
        "Country-wide energy grids",
        "National governance platforms",
        "Large-scale manufacturing"
    ])
    
    # Continental Networks
    CONTINENTAL = ("continental", 5, "CONTINENTAL", [
        "Continental relay networks",
        "Multi-nation resource coordination",
        "Continental governance",
        "Cross-border infrastructure"
    ])
    
    # Planetary Infrastructure
    PLANETARY = ("planetary", 6, "PLANETARY", [
        "Global communication backbone",
        "Planetary energy harvesting",
        "World governance systems",
        "Interplanetary links"
    ])
    
    def __init__(self, tier_id: str, level: int, authority_band: str, capabilities: List[str]):
        self.tier_id = tier_id
        self.level = level
        self.authority_band = authority_band
        self.capabilities = capabilities


# =============================================================================
# DEVELOPER PROFILE
# =============================================================================

@dataclass
class DeveloperProfile:
    """A developer's credibility profile in the ecosystem."""
    
    developer_id: str
    name: str
    created_at: float = field(default_factory=time.time)
    
    # Knowledge Progress
    completed_domains: List[str] = field(default_factory=list)
    domain_scores: Dict[str, float] = field(default_factory=dict)  # 0.0 to 1.0
    
    # Certifications
    certifications: List[str] = field(default_factory=list)
    certification_dates: Dict[str, float] = field(default_factory=dict)
    
    # Infrastructure Access
    current_tier: str = "sandbox"
    authority_band: str = "INDIVIDUAL"
    
    # Attestations (on-chain proofs)
    attestation_hashes: List[str] = field(default_factory=list)
    
    # Contribution Metrics
    projects_contributed: int = 0
    code_commits: int = 0
    peer_reviews: int = 0
    mentorship_hours: float = 0.0
    
    def __post_init__(self):
        if not self.developer_id:
            self.developer_id = hashlib.sha256(
                f"{self.name}:{self.created_at}".encode()
            ).hexdigest()[:16]
    
    @property
    def knowledge_level(self) -> int:
        """Calculate overall knowledge level (1-6)."""
        if not self.completed_domains:
            return 0
        max_level = 0
        for domain in KnowledgeDomain:
            if domain.domain_id in self.completed_domains:
                max_level = max(max_level, domain.level)
        return max_level
    
    @property
    def credibility_score(self) -> float:
        """
        Calculate overall credibility score (0.0 to 1.0).
        
        Based on:
        - Knowledge completion (40%)
        - Certifications (30%)
        - Contributions (30%)
        """
        # Knowledge score
        total_domains = len(KnowledgeDomain)
        knowledge_pct = len(self.completed_domains) / total_domains if total_domains > 0 else 0
        
        # Certification score
        total_tracks = len(CertificationTrack)
        cert_pct = len(self.certifications) / total_tracks if total_tracks > 0 else 0
        
        # Contribution score (normalized)
        contrib_score = min(1.0, (
            self.projects_contributed * 0.1 +
            self.code_commits * 0.01 +
            self.peer_reviews * 0.05 +
            self.mentorship_hours * 0.02
        ))
        
        return (knowledge_pct * 0.4) + (cert_pct * 0.3) + (contrib_score * 0.3)
    
    @property
    def spectral_signature(self) -> str:
        """Generate unique spectral signature for this developer."""
        sig_data = f"{self.developer_id}:{self.credibility_score:.4f}:{len(self.certifications)}"
        return hashlib.sha256(sig_data.encode()).hexdigest()[:32]
    
    def can_build_tier(self, tier: InfrastructureTier) -> Tuple[bool, str]:
        """Check if developer can build at this infrastructure tier."""
        tier_levels = {
            "sandbox": 0, "community": 1, "municipal": 2,
            "regional": 3, "national": 4, "continental": 5, "planetary": 6
        }
        
        current_level = tier_levels.get(self.current_tier, 0)
        required_level = tier.level
        
        if current_level >= required_level:
            return True, "Authorized"
        
        # Check what's missing
        missing = []
        for domain in KnowledgeDomain:
            if domain.level <= required_level and domain.domain_id not in self.completed_domains:
                missing.append(domain.domain_id)
        
        if missing:
            return False, f"Complete domains: {', '.join(missing[:3])}"
        
        return False, f"Requires {tier.authority_band} authority band"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "developer_id": self.developer_id,
            "name": self.name,
            "knowledge_level": self.knowledge_level,
            "credibility_score": round(self.credibility_score, 3),
            "current_tier": self.current_tier,
            "authority_band": self.authority_band,
            "completed_domains": len(self.completed_domains),
            "total_domains": len(KnowledgeDomain),
            "certifications": self.certifications,
            "spectral_signature": self.spectral_signature,
            "projects": self.projects_contributed,
            "commits": self.code_commits
        }


# =============================================================================
# DEVELOPER MATRIX ENGINE
# =============================================================================

class DeveloperMatrix:
    """
    The Developer Matrix - credibility and capability tracking system.
    
    Provides:
    1. Knowledge domain tracking
    2. Certification management
    3. Infrastructure tier authorization
    4. Contribution attestation
    """
    
    def __init__(self):
        self.developers: Dict[str, DeveloperProfile] = {}
        self.domain_assessments: Dict[str, List[Dict]] = {}  # developer_id -> assessments
        self.tier_promotions: List[Dict[str, Any]] = []
    
    def register_developer(self, name: str) -> DeveloperProfile:
        """Register a new developer in the matrix."""
        profile = DeveloperProfile(
            developer_id="",
            name=name
        )
        self.developers[profile.developer_id] = profile
        return profile
    
    def complete_domain(self, developer_id: str, domain: KnowledgeDomain, 
                        score: float = 1.0) -> Tuple[bool, str]:
        """Mark a knowledge domain as completed with assessment score."""
        if developer_id not in self.developers:
            return False, "Developer not found"
        
        profile = self.developers[developer_id]
        
        # Check prerequisites (must complete lower levels first)
        for prereq in KnowledgeDomain:
            if prereq.level < domain.level and prereq.domain_id not in profile.completed_domains:
                return False, f"Complete {prereq.domain_id} first (Level {prereq.level})"
        
        # Record completion
        profile.completed_domains.append(domain.domain_id)
        profile.domain_scores[domain.domain_id] = score
        
        # Record assessment
        if developer_id not in self.domain_assessments:
            self.domain_assessments[developer_id] = []
        
        self.domain_assessments[developer_id].append({
            "domain": domain.domain_id,
            "score": score,
            "timestamp": time.time(),
            "level": domain.level
        })
        
        return True, f"Completed {domain.domain_id} (Level {domain.level})"
    
    def award_certification(self, developer_id: str, 
                           track: CertificationTrack) -> Tuple[bool, str]:
        """Award a certification track to a developer."""
        if developer_id not in self.developers:
            return False, "Developer not found"
        
        profile = self.developers[developer_id]
        
        # Check all required domains are completed
        missing = []
        for domain in track.required_domains:
            if domain.domain_id not in profile.completed_domains:
                missing.append(domain.domain_id)
        
        if missing:
            return False, f"Missing domains: {', '.join(missing)}"
        
        # Check minimum scores (0.7 required)
        low_scores = []
        for domain in track.required_domains:
            score = profile.domain_scores.get(domain.domain_id, 0)
            if score < 0.7:
                low_scores.append(f"{domain.domain_id} ({score:.0%})")
        
        if low_scores:
            return False, f"Improve scores: {', '.join(low_scores)}"
        
        # Award certification
        profile.certifications.append(track.track_id)
        profile.certification_dates[track.track_id] = time.time()
        
        # Generate attestation hash
        attestation = hashlib.sha256(
            f"{developer_id}:{track.track_id}:{time.time()}".encode()
        ).hexdigest()
        profile.attestation_hashes.append(attestation)
        
        return True, f"Certified as {track.track_id} (Attestation: {attestation[:16]})"
    
    def promote_tier(self, developer_id: str, 
                     target_tier: InfrastructureTier) -> Tuple[bool, str]:
        """Promote developer to a new infrastructure tier."""
        if developer_id not in self.developers:
            return False, "Developer not found"
        
        profile = self.developers[developer_id]
        can_build, reason = profile.can_build_tier(target_tier)
        
        if not can_build:
            return False, reason
        
        # Check credibility threshold
        required_credibility = target_tier.level * 0.15  # 15% per tier
        if profile.credibility_score < required_credibility:
            return False, f"Need {required_credibility:.0%} credibility (have {profile.credibility_score:.0%})"
        
        # Promote
        profile.current_tier = target_tier.tier_id
        profile.authority_band = target_tier.authority_band
        
        self.tier_promotions.append({
            "developer_id": developer_id,
            "from_tier": profile.current_tier,
            "to_tier": target_tier.tier_id,
            "timestamp": time.time()
        })
        
        return True, f"Promoted to {target_tier.tier_id} ({target_tier.authority_band} authority)"
    
    def get_learning_path(self, target_track: CertificationTrack) -> List[Dict[str, Any]]:
        """Get the learning path for a certification track."""
        path = []
        for domain in target_track.required_domains:
            path.append({
                "step": len(path) + 1,
                "domain": domain.domain_id,
                "level": domain.level,
                "description": domain.description,
                "estimated_hours": domain.level * 10  # Rough estimate
            })
        return sorted(path, key=lambda x: x["level"])
    
    def get_buildable_infrastructure(self, developer_id: str) -> List[Dict[str, Any]]:
        """Get all infrastructure the developer can build."""
        if developer_id not in self.developers:
            return []
        
        profile = self.developers[developer_id]
        buildable = []
        
        for tier in InfrastructureTier:
            can_build, reason = profile.can_build_tier(tier)
            buildable.append({
                "tier": tier.tier_id,
                "authority": tier.authority_band,
                "can_build": can_build,
                "reason": reason,
                "capabilities": tier.capabilities if can_build else []
            })
        
        return buildable
    
    def get_matrix_summary(self) -> Dict[str, Any]:
        """Get full matrix summary for display."""
        return {
            "knowledge_domains": [
                {
                    "domain": d.domain_id,
                    "level": d.level,
                    "description": d.description
                }
                for d in KnowledgeDomain
            ],
            "certification_tracks": [
                {
                    "track": t.track_id,
                    "description": t.description,
                    "required_domains": [d.domain_id for d in t.required_domains]
                }
                for t in CertificationTrack
            ],
            "infrastructure_tiers": [
                {
                    "tier": t.tier_id,
                    "level": t.level,
                    "authority": t.authority_band,
                    "capabilities": t.capabilities
                }
                for t in InfrastructureTier
            ],
            "total_developers": len(self.developers),
            "total_certifications": sum(len(d.certifications) for d in self.developers.values()),
            "tier_promotions": len(self.tier_promotions)
        }


# =============================================================================
# GLOBAL INSTANCE
# =============================================================================

_global_matrix: Optional[DeveloperMatrix] = None

def get_developer_matrix() -> DeveloperMatrix:
    """Get the global developer matrix instance."""
    global _global_matrix
    if _global_matrix is None:
        _global_matrix = DeveloperMatrix()
    return _global_matrix


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demo_developer_journey():
    """Demonstrate a developer's journey through the matrix."""
    
    print("=" * 70)
    print("WNSP DEVELOPER MATRIX - Credibility & Capability System")
    print("=" * 70)
    
    matrix = get_developer_matrix()
    
    # Register a new developer
    print("\n1. REGISTERING NEW DEVELOPER")
    dev = matrix.register_developer("Alex Builder")
    print(f"   Developer ID: {dev.developer_id}")
    print(f"   Initial Tier: {dev.current_tier}")
    print(f"   Credibility: {dev.credibility_score:.1%}")
    
    # Learning journey
    print("\n2. LEARNING PATH (Protocol Developer Track)")
    path = matrix.get_learning_path(CertificationTrack.PROTOCOL_DEVELOPER)
    for step in path:
        print(f"   Step {step['step']}: {step['domain']} (Level {step['level']}) - ~{step['estimated_hours']}h")
    
    # Complete domains
    print("\n3. COMPLETING KNOWLEDGE DOMAINS")
    domains_to_complete = [
        KnowledgeDomain.WAVE_PHYSICS,
        KnowledgeDomain.LAMBDA_BOSON,
        KnowledgeDomain.WASCII_ENCODING,
        KnowledgeDomain.SPECTRAL_ROUTING
    ]
    
    for domain in domains_to_complete:
        success, msg = matrix.complete_domain(dev.developer_id, domain, score=0.85)
        print(f"   {domain.domain_id}: {msg}")
    
    print(f"\n   Knowledge Level: {dev.knowledge_level}")
    print(f"   Credibility: {dev.credibility_score:.1%}")
    
    # Get certification
    print("\n4. EARNING CERTIFICATION")
    success, msg = matrix.award_certification(dev.developer_id, CertificationTrack.PROTOCOL_DEVELOPER)
    print(f"   {msg}")
    
    # Check buildable infrastructure
    print("\n5. BUILDABLE INFRASTRUCTURE")
    buildable = matrix.get_buildable_infrastructure(dev.developer_id)
    for tier in buildable:
        status = "✅" if tier["can_build"] else "❌"
        print(f"   {status} {tier['tier']} ({tier['authority']})")
        if tier["can_build"] and tier["capabilities"]:
            for cap in tier["capabilities"][:2]:
                print(f"      - {cap}")
    
    # Show matrix summary
    print("\n6. MATRIX SUMMARY")
    summary = matrix.get_matrix_summary()
    print(f"   Knowledge Domains: {len(summary['knowledge_domains'])}")
    print(f"   Certification Tracks: {len(summary['certification_tracks'])}")
    print(f"   Infrastructure Tiers: {len(summary['infrastructure_tiers'])}")
    
    print("\n" + "=" * 70)
    print("The Developer Matrix anchors all credibility to the substrate.")
    print("Physics validates knowledge. Attestations are permanent.")
    print("=" * 70)


if __name__ == "__main__":
    demo_developer_journey()
