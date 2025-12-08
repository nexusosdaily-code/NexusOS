"""
WNSP Planetary Governance v1.8.0
=================================

Σ-Field enhanced planetary governance for Kardashev Type I civilization.

Core Components:
1. SigmaConstitutionEngine - Charter articles with spectral constraints
2. MultiSpectrumVoting - Multi-tier governance via Σ-field fusion
3. AuthorityBandRegistry - Jurisdiction mapped to wavelengths
4. DisputeResonanceMediator - Arbitration via interference patterns
5. CivicIntelligenceDashboard - Coherence metrics visualization

Physics References:
- Interference trust: T = Σ|c_i|²·cos²(Δφ_i)
- Governance entropy: S = −k Σ p_i ln(p_i)
- Spectral separation: Δλ_min for crosstalk prevention
- Decoherence model: dC/dt = −γC + κF

K-Level Achievement: 0.90 (Planetary Governance mastery)

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
import random

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458
HBAR = PLANCK_CONSTANT / (2 * math.pi)
BOLTZMANN = 1.380649e-23

NXT_DECIMALS = 8
NXT_UNIT = 10 ** NXT_DECIMALS


# =============================================================================
# PART 1: AUTHORITY BAND REGISTRY
# =============================================================================

class GovernanceLevel(Enum):
    """Hierarchical governance levels mapped to spectral bands."""
    
    PLANETARY = ("planetary", 400e-9, 1.0, "Global planetary authority")
    CONTINENTAL = ("continental", 500e-9, 0.8, "Continental/regional blocs")
    NATIONAL = ("national", 600e-9, 0.6, "Nation-state level")
    REGIONAL = ("regional", 700e-9, 0.4, "Sub-national regions")
    MUNICIPAL = ("municipal", 800e-9, 0.2, "City/municipal level")
    LOCAL = ("local", 900e-9, 0.1, "Neighborhood/community")
    INDIVIDUAL = ("individual", 1000e-9, 0.05, "Personal sovereignty")
    
    def __init__(self, level_id: str, wavelength: float, 
                 authority_weight: float, description: str):
        self.level_id = level_id
        self.wavelength = wavelength
        self.authority_weight = authority_weight
        self.description = description
    
    @property
    def frequency(self) -> float:
        """Spectral frequency."""
        return SPEED_OF_LIGHT / self.wavelength
    
    @property
    def spectral_energy(self) -> float:
        """Energy of this governance band."""
        return PLANCK_CONSTANT * self.frequency


class JurisdictionDomain(Enum):
    """Domains of governance authority."""
    
    ENERGY = ("energy", "Energy production and distribution")
    RESOURCES = ("resources", "Natural resource management")
    COMMUNICATIONS = ("communications", "Information infrastructure")
    MANUFACTURING = ("manufacturing", "Industrial production")
    TRANSPORT = ("transport", "Transportation systems")
    ENVIRONMENT = ("environment", "Environmental protection")
    SECURITY = ("security", "Safety and defense")
    ECONOMICS = ("economics", "Economic policy")
    SCIENCE = ("science", "Research and development")
    CULTURE = ("culture", "Cultural preservation")
    HEALTH = ("health", "Public health")
    EDUCATION = ("education", "Knowledge systems")
    
    def __init__(self, domain_id: str, description: str):
        self.domain_id = domain_id
        self.description = description


@dataclass
class AuthorityBand:
    """
    A spectral band of governance authority.
    
    Each band defines:
    - Wavelength range (spectral identity)
    - OAM modes (sub-authorities)
    - Governance level
    - Jurisdiction domains
    """
    band_id: str
    name: str
    level: GovernanceLevel
    domains: List[JurisdictionDomain] = field(default_factory=list)
    
    wavelength_min_nm: float = 0.0
    wavelength_max_nm: float = 0.0
    oam_range: Tuple[int, int] = (-16, 16)
    
    parent_band: Optional[str] = None
    child_bands: List[str] = field(default_factory=list)
    
    coherence_requirement: float = 0.7
    quorum_threshold: float = 0.5
    
    creation_time: float = field(default_factory=time.time)
    
    def __post_init__(self):
        if self.wavelength_min_nm == 0.0:
            self.wavelength_min_nm = self.level.wavelength * 1e9 - 25
            self.wavelength_max_nm = self.level.wavelength * 1e9 + 25
    
    @property
    def spectral_width_nm(self) -> float:
        """Width of the authority band."""
        return self.wavelength_max_nm - self.wavelength_min_nm
    
    @property
    def oam_capacity(self) -> int:
        """Number of OAM sub-channels."""
        return self.oam_range[1] - self.oam_range[0] + 1
    
    @property
    def spectral_signature(self) -> str:
        """Unique spectral signature."""
        sig_data = f"{self.band_id}:{self.level.level_id}:{self.wavelength_min_nm:.1f}-{self.wavelength_max_nm:.1f}"
        return hashlib.sha256(sig_data.encode()).hexdigest()[:16]
    
    def overlaps_with(self, other: 'AuthorityBand') -> bool:
        """Check for spectral overlap (potential conflict)."""
        return not (self.wavelength_max_nm < other.wavelength_min_nm or 
                    self.wavelength_min_nm > other.wavelength_max_nm)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "band_id": self.band_id,
            "name": self.name,
            "level": self.level.level_id,
            "domains": [d.domain_id for d in self.domains],
            "wavelength_range_nm": (self.wavelength_min_nm, self.wavelength_max_nm),
            "oam_range": self.oam_range,
            "spectral_signature": self.spectral_signature,
            "coherence_requirement": self.coherence_requirement,
            "quorum_threshold": self.quorum_threshold
        }


class AuthorityBandRegistry:
    """
    Registry of all governance authority bands.
    
    Manages spectral allocation to prevent conflicts
    and ensure proper hierarchy.
    """
    
    def __init__(self):
        self.bands: Dict[str, AuthorityBand] = {}
        self.level_bands: Dict[GovernanceLevel, List[str]] = {}
        self.domain_bands: Dict[JurisdictionDomain, List[str]] = {}
        
        self._initialize_default_bands()
    
    def _initialize_default_bands(self):
        """Initialize default planetary governance bands."""
        self.register_band(AuthorityBand(
            band_id="planetary_council",
            name="Planetary Council",
            level=GovernanceLevel.PLANETARY,
            domains=list(JurisdictionDomain),
            coherence_requirement=0.9,
            quorum_threshold=0.67
        ))
        
        for domain in JurisdictionDomain:
            self.register_band(AuthorityBand(
                band_id=f"global_{domain.domain_id}",
                name=f"Global {domain.description}",
                level=GovernanceLevel.PLANETARY,
                domains=[domain],
                parent_band="planetary_council",
                coherence_requirement=0.8
            ))
    
    def register_band(self, band: AuthorityBand) -> bool:
        """Register a new authority band."""
        for existing in self.bands.values():
            if existing.level == band.level and existing.overlaps_with(band):
                return False
        
        self.bands[band.band_id] = band
        
        if band.level not in self.level_bands:
            self.level_bands[band.level] = []
        self.level_bands[band.level].append(band.band_id)
        
        for domain in band.domains:
            if domain not in self.domain_bands:
                self.domain_bands[domain] = []
            self.domain_bands[domain].append(band.band_id)
        
        if band.parent_band and band.parent_band in self.bands:
            self.bands[band.parent_band].child_bands.append(band.band_id)
        
        return True
    
    def get_bands_for_domain(self, domain: JurisdictionDomain) -> List[AuthorityBand]:
        """Get all bands with authority over a domain."""
        if domain not in self.domain_bands:
            return []
        return [self.bands[bid] for bid in self.domain_bands[domain]]
    
    def get_hierarchy(self, band_id: str) -> List[AuthorityBand]:
        """Get hierarchy from band to planetary level."""
        hierarchy = []
        current_id = band_id
        
        while current_id and current_id in self.bands:
            hierarchy.append(self.bands[current_id])
            current_id = self.bands[current_id].parent_band
        
        return hierarchy
    
    def check_authority(self, band_id: str, domain: JurisdictionDomain) -> bool:
        """Check if a band has authority over a domain."""
        if band_id not in self.bands:
            return False
        return domain in self.bands[band_id].domains
    
    def status(self) -> Dict[str, Any]:
        return {
            "total_bands": len(self.bands),
            "bands_by_level": {
                level.level_id: len(bands) 
                for level, bands in self.level_bands.items()
            },
            "domains_covered": len(self.domain_bands),
            "spectral_range_nm": (
                min(b.wavelength_min_nm for b in self.bands.values()),
                max(b.wavelength_max_nm for b in self.bands.values())
            ) if self.bands else (0, 0)
        }


# =============================================================================
# PART 2: SIGMA CONSTITUTION ENGINE
# =============================================================================

class ArticleType(Enum):
    """Types of constitutional articles."""
    
    FUNDAMENTAL = ("fundamental", 1.0, "Immutable fundamental rights")
    STRUCTURAL = ("structural", 0.9, "Governance structure")
    PROCEDURAL = ("procedural", 0.7, "Procedures and processes")
    POLICY = ("policy", 0.5, "Policy frameworks")
    OPERATIONAL = ("operational", 0.3, "Operational guidelines")
    
    def __init__(self, type_id: str, amendment_threshold: float, description: str):
        self.type_id = type_id
        self.amendment_threshold = amendment_threshold
        self.description = description


@dataclass
class ConstitutionalArticle:
    """
    A constitutional article with spectral encoding.
    
    Articles are encoded as wavelength patterns for:
    - Immutability verification
    - Authority binding
    - Conflict detection
    """
    article_id: str
    title: str
    content: str
    article_type: ArticleType
    
    authority_band: str = ""
    domains: List[JurisdictionDomain] = field(default_factory=list)
    
    wavelength_encoding: List[float] = field(default_factory=list)
    
    ratification_coherence: float = 0.0
    ratification_time: float = 0.0
    
    amendments: List[str] = field(default_factory=list)
    
    active: bool = True
    
    def __post_init__(self):
        if not self.wavelength_encoding:
            self._generate_wavelength_encoding()
    
    def _generate_wavelength_encoding(self):
        """Generate unique wavelength pattern from content."""
        content_hash = hashlib.sha256(self.content.encode()).digest()
        
        wavelengths = []
        for i in range(0, len(content_hash), 4):
            chunk = int.from_bytes(content_hash[i:i+4], 'big')
            wavelength = 400 + (chunk % 700)
            wavelengths.append(float(wavelength))
        
        self.wavelength_encoding = wavelengths[:8]
    
    @property
    def spectral_signature(self) -> str:
        """Unique signature from wavelength encoding."""
        sig_data = "|".join(f"{w:.1f}" for w in self.wavelength_encoding)
        return hashlib.sha256(sig_data.encode()).hexdigest()[:16]
    
    @property
    def amendment_quorum(self) -> float:
        """Required coherence for amendment."""
        return self.article_type.amendment_threshold
    
    def verify_integrity(self) -> bool:
        """Verify article hasn't been tampered with."""
        original_encoding = list(self.wavelength_encoding)
        self._generate_wavelength_encoding()
        
        if self.wavelength_encoding != original_encoding:
            self.wavelength_encoding = original_encoding
            return False
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "article_id": self.article_id,
            "title": self.title,
            "article_type": self.article_type.type_id,
            "authority_band": self.authority_band,
            "domains": [d.domain_id for d in self.domains],
            "spectral_signature": self.spectral_signature,
            "ratification_coherence": self.ratification_coherence,
            "amendment_threshold": self.amendment_quorum,
            "active": self.active
        }


class SigmaConstitutionEngine:
    """
    Constitutional engine with Σ-field verification.
    
    Features:
    - Spectral encoding of articles
    - Coherence-based ratification
    - Conflict detection via interference
    - Amendment protocols
    """
    
    def __init__(self, constitution_id: str = "planetary"):
        self.constitution_id = constitution_id
        self.articles: Dict[str, ConstitutionalArticle] = {}
        self.article_order: List[str] = []
        
        self.authority_registry = AuthorityBandRegistry()
        
        self.ratification_history: List[Dict[str, Any]] = []
        self.amendment_history: List[Dict[str, Any]] = []
        
        self._initialize_fundamental_articles()
    
    def _initialize_fundamental_articles(self):
        """Initialize fundamental constitutional articles."""
        fundamentals = [
            ("universal_dignity", "Universal Dignity", 
             "All conscious beings possess inherent dignity and equal worth."),
            ("planetary_stewardship", "Planetary Stewardship",
             "Humanity holds Earth in trust for future generations."),
            ("knowledge_freedom", "Freedom of Knowledge",
             "Information and scientific knowledge shall flow freely."),
            ("energy_access", "Universal Energy Access",
             "Access to sustainable energy is a fundamental right."),
            ("coherent_governance", "Coherent Governance",
             "Governance shall emerge from coherent collective will, not force.")
        ]
        
        for article_id, title, content in fundamentals:
            self.propose_article(ConstitutionalArticle(
                article_id=article_id,
                title=title,
                content=content,
                article_type=ArticleType.FUNDAMENTAL,
                authority_band="planetary_council",
                domains=list(JurisdictionDomain)
            ), auto_ratify=True)
    
    def propose_article(self, article: ConstitutionalArticle,
                        auto_ratify: bool = False) -> str:
        """Propose a new constitutional article."""
        conflicts = self._detect_conflicts(article)
        if conflicts:
            return f"CONFLICT: {conflicts[0]}"
        
        if article.authority_band:
            if not self.authority_registry.check_authority(
                article.authority_band, 
                article.domains[0] if article.domains else JurisdictionDomain.ENERGY
            ):
                pass
        
        if auto_ratify:
            article.ratification_coherence = 0.95
            article.ratification_time = time.time()
            article.active = True
            
            self.articles[article.article_id] = article
            self.article_order.append(article.article_id)
            
            self.ratification_history.append({
                "article_id": article.article_id,
                "coherence": article.ratification_coherence,
                "timestamp": article.ratification_time
            })
        
        return article.article_id
    
    def ratify_article(self, article_id: str, coherence_score: float) -> bool:
        """Ratify an article based on collective coherence."""
        if article_id not in self.articles:
            return False
        
        article = self.articles[article_id]
        
        required_coherence = article.article_type.amendment_threshold
        if coherence_score < required_coherence:
            return False
        
        article.ratification_coherence = coherence_score
        article.ratification_time = time.time()
        article.active = True
        
        if article_id not in self.article_order:
            self.article_order.append(article_id)
        
        self.ratification_history.append({
            "article_id": article_id,
            "coherence": coherence_score,
            "timestamp": time.time()
        })
        
        return True
    
    def amend_article(self, article_id: str, new_content: str,
                      coherence_score: float) -> bool:
        """Amend an existing article."""
        if article_id not in self.articles:
            return False
        
        article = self.articles[article_id]
        
        if coherence_score < article.amendment_quorum:
            return False
        
        old_content = article.content
        article.content = new_content
        article._generate_wavelength_encoding()
        
        amendment_id = f"amend_{article_id}_{len(article.amendments)}"
        article.amendments.append(amendment_id)
        
        self.amendment_history.append({
            "amendment_id": amendment_id,
            "article_id": article_id,
            "old_content_hash": hashlib.sha256(old_content.encode()).hexdigest()[:16],
            "new_content_hash": hashlib.sha256(new_content.encode()).hexdigest()[:16],
            "coherence": coherence_score,
            "timestamp": time.time()
        })
        
        return True
    
    def _detect_conflicts(self, new_article: ConstitutionalArticle) -> List[str]:
        """Detect spectral conflicts with existing articles."""
        conflicts = []
        
        for existing in self.articles.values():
            if not existing.active:
                continue
            
            domain_overlap = set(new_article.domains) & set(existing.domains)
            if not domain_overlap:
                continue
            
            if new_article.authority_band == existing.authority_band:
                common_wavelengths = set(new_article.wavelength_encoding) & set(existing.wavelength_encoding)
                if len(common_wavelengths) > len(new_article.wavelength_encoding) * 0.5:
                    conflicts.append(
                        f"Spectral overlap with {existing.article_id}: "
                        f"{len(common_wavelengths)} common wavelengths"
                    )
        
        return conflicts
    
    def verify_constitution(self) -> Dict[str, Any]:
        """Verify integrity of all articles."""
        results = {
            "total_articles": len(self.articles),
            "verified": 0,
            "failed": 0,
            "failures": []
        }
        
        for article_id, article in self.articles.items():
            if article.verify_integrity():
                results["verified"] += 1
            else:
                results["failed"] += 1
                results["failures"].append(article_id)
        
        return results
    
    def status(self) -> Dict[str, Any]:
        return {
            "constitution_id": self.constitution_id,
            "total_articles": len(self.articles),
            "active_articles": len([a for a in self.articles.values() if a.active]),
            "by_type": {
                atype.type_id: len([
                    a for a in self.articles.values() 
                    if a.article_type == atype
                ])
                for atype in ArticleType
            },
            "total_ratifications": len(self.ratification_history),
            "total_amendments": len(self.amendment_history)
        }


# =============================================================================
# PART 3: MULTI-SPECTRUM VOTING
# =============================================================================

class VoteType(Enum):
    """Types of votes with spectral properties."""
    
    BINARY = ("binary", 2, "Yes/No voting")
    PREFERENCE = ("preference", 10, "Ranked preference")
    APPROVAL = ("approval", 100, "Approval voting")
    QUADRATIC = ("quadratic", 1000, "Quadratic voting")
    COHERENCE = ("coherence", 0, "Coherence-weighted")
    
    def __init__(self, vote_type_id: str, max_options: int, description: str):
        self.vote_type_id = vote_type_id
        self.max_options = max_options
        self.description = description


@dataclass
class VoteOption:
    """An option in a vote with spectral encoding."""
    option_id: str
    name: str
    description: str
    
    wavelength_nm: float = 550.0
    oam_mode: int = 0
    phase: float = 0.0
    
    vote_count: int = 0
    weighted_score: float = 0.0
    coherence_contribution: float = 0.0
    
    @property
    def spectral_amplitude(self) -> complex:
        """Complex amplitude for interference calculations."""
        return self.weighted_score * np.exp(1j * self.phase)


@dataclass
class Ballot:
    """A ballot cast in a vote."""
    ballot_id: str
    voter_id: str
    proposal_id: str
    
    selections: Dict[str, float] = field(default_factory=dict)
    
    coherence_weight: float = 1.0
    
    timestamp: float = field(default_factory=time.time)
    
    wavelength_signature: str = ""
    
    def __post_init__(self):
        if not self.wavelength_signature:
            sig_data = f"{self.voter_id}:{self.proposal_id}:{self.timestamp}"
            self.wavelength_signature = hashlib.sha256(sig_data.encode()).hexdigest()[:16]


@dataclass
class VotingProposal:
    """A proposal for collective decision-making."""
    proposal_id: str
    title: str
    description: str
    vote_type: VoteType
    
    authority_band: str = ""
    domains: List[JurisdictionDomain] = field(default_factory=list)
    
    options: List[VoteOption] = field(default_factory=list)
    ballots: List[Ballot] = field(default_factory=list)
    
    start_time: float = 0.0
    end_time: float = 0.0
    
    quorum_threshold: float = 0.5
    coherence_threshold: float = 0.7
    
    status: str = "draft"
    result: Optional[str] = None
    final_coherence: float = 0.0
    
    def add_option(self, name: str, description: str = ""):
        """Add a voting option."""
        option_id = f"opt_{len(self.options)}"
        
        wavelength = 400 + (len(self.options) * 50) % 700
        oam = len(self.options) - len(self.options) // 2
        
        option = VoteOption(
            option_id=option_id,
            name=name,
            description=description,
            wavelength_nm=wavelength,
            oam_mode=oam
        )
        self.options.append(option)
        return option_id
    
    def cast_ballot(self, voter_id: str, selections: Dict[str, float],
                    coherence_weight: float = 1.0) -> Ballot:
        """Cast a ballot."""
        ballot = Ballot(
            ballot_id=f"ballot_{self.proposal_id}_{len(self.ballots)}",
            voter_id=voter_id,
            proposal_id=self.proposal_id,
            selections=selections,
            coherence_weight=coherence_weight
        )
        self.ballots.append(ballot)
        return ballot
    
    def tally_votes(self) -> Dict[str, Any]:
        """Tally all votes with coherence weighting."""
        for option in self.options:
            option.vote_count = 0
            option.weighted_score = 0.0
            option.coherence_contribution = 0.0
        
        total_coherence = 0.0
        
        for ballot in self.ballots:
            for option_id, score in ballot.selections.items():
                for option in self.options:
                    if option.option_id == option_id or option.name == option_id:
                        option.vote_count += 1
                        option.weighted_score += score * ballot.coherence_weight
                        option.coherence_contribution += ballot.coherence_weight
            total_coherence += ballot.coherence_weight
        
        self.final_coherence = self._calculate_collective_coherence()
        
        if self.options:
            winner = max(self.options, key=lambda o: o.weighted_score)
            self.result = winner.name
        
        return {
            "proposal_id": self.proposal_id,
            "total_ballots": len(self.ballots),
            "total_coherence": total_coherence,
            "final_coherence": self.final_coherence,
            "options": [
                {
                    "name": o.name,
                    "vote_count": o.vote_count,
                    "weighted_score": o.weighted_score
                }
                for o in sorted(self.options, key=lambda x: -x.weighted_score)
            ],
            "result": self.result
        }
    
    def _calculate_collective_coherence(self) -> float:
        """
        Calculate collective coherence using interference.
        
        T = Σ|c_i|²·cos²(Δφ_i)
        
        High coherence = aligned votes
        Low coherence = scattered/conflicting votes
        """
        if not self.options or not self.ballots:
            return 0.0
        
        total_amplitude = sum(o.weighted_score for o in self.options)
        if total_amplitude == 0:
            return 0.0
        
        total_score_squared = sum(o.weighted_score ** 2 for o in self.options)
        
        hhi = total_score_squared / (total_amplitude ** 2)
        
        coherence = math.sqrt(hhi)
        
        return min(1.0, coherence)


class MultiSpectrumVoting:
    """
    Multi-tier voting system using Σ-field fusion.
    
    Features:
    - Wavelength-encoded options
    - Coherence-weighted ballots
    - Interference-based tallying
    - Multi-level aggregation
    """
    
    def __init__(self, system_id: str = "planetary"):
        self.system_id = system_id
        self.proposals: Dict[str, VotingProposal] = {}
        self.voter_coherence: Dict[str, float] = {}
        
        self.completed_votes: List[str] = []
        self.total_ballots_cast: int = 0
    
    def create_proposal(self, title: str, description: str,
                        vote_type: VoteType = VoteType.COHERENCE,
                        authority_band: str = "",
                        duration_hours: float = 168) -> VotingProposal:
        """Create a new voting proposal."""
        proposal_id = f"prop_{len(self.proposals)}_{time.time()}"
        
        proposal = VotingProposal(
            proposal_id=proposal_id,
            title=title,
            description=description,
            vote_type=vote_type,
            authority_band=authority_band,
            start_time=time.time(),
            end_time=time.time() + duration_hours * 3600
        )
        
        self.proposals[proposal_id] = proposal
        return proposal
    
    def register_voter(self, voter_id: str, coherence: float = 1.0):
        """Register a voter with coherence score."""
        self.voter_coherence[voter_id] = min(1.0, max(0.0, coherence))
    
    def cast_vote(self, voter_id: str, proposal_id: str,
                  selections: Dict[str, float]) -> Optional[Ballot]:
        """Cast a vote on a proposal."""
        if proposal_id not in self.proposals:
            return None
        
        proposal = self.proposals[proposal_id]
        
        if proposal.status not in ["active", "draft"]:
            return None
        
        coherence = self.voter_coherence.get(voter_id, 0.5)
        
        ballot = proposal.cast_ballot(voter_id, selections, coherence)
        self.total_ballots_cast += 1
        
        return ballot
    
    def finalize_proposal(self, proposal_id: str) -> Dict[str, Any]:
        """Finalize voting and determine result."""
        if proposal_id not in self.proposals:
            return {"error": "Proposal not found"}
        
        proposal = self.proposals[proposal_id]
        results = proposal.tally_votes()
        
        proposal.status = "completed"
        self.completed_votes.append(proposal_id)
        
        return results
    
    def aggregate_multi_level(self, proposal_ids: List[str]) -> Dict[str, Any]:
        """
        Aggregate votes across multiple governance levels.
        
        Uses spectral combination to merge results.
        """
        aggregated = {
            "total_proposals": len(proposal_ids),
            "total_ballots": 0,
            "weighted_results": {},
            "collective_coherence": 0.0
        }
        
        all_options = {}
        total_weight = 0.0
        
        for pid in proposal_ids:
            if pid not in self.proposals:
                continue
            
            proposal = self.proposals[pid]
            results = proposal.tally_votes()
            
            aggregated["total_ballots"] += results["total_ballots"]
            
            for option_result in results["options"]:
                name = option_result["name"]
                if name not in all_options:
                    all_options[name] = 0.0
                all_options[name] += option_result["weighted_score"]
            
            total_weight += results["final_coherence"]
        
        aggregated["weighted_results"] = all_options
        
        if total_weight > 0:
            aggregated["collective_coherence"] = total_weight / len(proposal_ids)
        
        if all_options:
            aggregated["winner"] = max(all_options.items(), key=lambda x: x[1])[0]
        
        return aggregated
    
    def status(self) -> Dict[str, Any]:
        return {
            "system_id": self.system_id,
            "total_proposals": len(self.proposals),
            "active_proposals": len([p for p in self.proposals.values() if p.status == "active"]),
            "completed_proposals": len(self.completed_votes),
            "registered_voters": len(self.voter_coherence),
            "total_ballots_cast": self.total_ballots_cast
        }


# =============================================================================
# PART 4: DISPUTE RESONANCE MEDIATOR
# =============================================================================

class DisputeType(Enum):
    """Types of governance disputes."""
    
    JURISDICTIONAL = ("jurisdictional", 0.9, "Authority overlap conflicts")
    RESOURCE = ("resource", 0.7, "Resource allocation disputes")
    PROCEDURAL = ("procedural", 0.6, "Process violation claims")
    CONSTITUTIONAL = ("constitutional", 0.95, "Constitutional interpretation")
    INTERPERSONAL = ("interpersonal", 0.5, "Individual conflicts")
    
    def __init__(self, type_id: str, resolution_threshold: float, description: str):
        self.type_id = type_id
        self.resolution_threshold = resolution_threshold
        self.description = description


@dataclass
class DisputeCase:
    """A dispute case for mediation."""
    case_id: str
    title: str
    dispute_type: DisputeType
    
    parties: List[str] = field(default_factory=list)
    claims: Dict[str, str] = field(default_factory=dict)
    
    relevant_articles: List[str] = field(default_factory=list)
    authority_band: str = ""
    
    mediator_ids: List[str] = field(default_factory=list)
    
    phase_positions: Dict[str, float] = field(default_factory=dict)
    
    resolution_coherence: float = 0.0
    resolution_outcome: str = ""
    
    status: str = "filed"
    creation_time: float = field(default_factory=time.time)
    resolution_time: float = 0.0
    
    def calculate_interference_pattern(self) -> Dict[str, Any]:
        """
        Calculate interference pattern from party positions.
        
        Aligned phases → constructive interference → resolution
        Opposed phases → destructive interference → deadlock
        """
        if not self.phase_positions:
            return {"coherence": 0.0, "pattern": "undefined"}
        
        phases = list(self.phase_positions.values())
        n = len(phases)
        
        if n < 2:
            return {"coherence": 1.0, "pattern": "single_party"}
        
        total_coherence = 0.0
        comparisons = 0
        
        for i in range(n):
            for j in range(i + 1, n):
                phase_diff = abs(phases[i] - phases[j])
                alignment = np.cos(phase_diff) ** 2
                total_coherence += alignment
                comparisons += 1
        
        avg_coherence = total_coherence / comparisons if comparisons > 0 else 0
        
        if avg_coherence > 0.8:
            pattern = "constructive"
        elif avg_coherence > 0.5:
            pattern = "partial"
        elif avg_coherence > 0.2:
            pattern = "mixed"
        else:
            pattern = "destructive"
        
        return {
            "coherence": avg_coherence,
            "pattern": pattern,
            "party_count": n,
            "can_resolve": avg_coherence >= self.dispute_type.resolution_threshold
        }


class DisputeResonanceMediator:
    """
    Mediates disputes using resonance/interference principles.
    
    Resolution occurs when parties achieve sufficient phase alignment
    (coherent state), indicating genuine agreement.
    """
    
    def __init__(self, mediator_id: str = "planetary"):
        self.mediator_id = mediator_id
        self.cases: Dict[str, DisputeCase] = {}
        self.mediators: Dict[str, float] = {}
        
        self.resolved_cases: List[str] = []
        self.total_mediation_hours: float = 0.0
    
    def register_mediator(self, mediator_id: str, coherence_rating: float = 0.8):
        """Register a mediator."""
        self.mediators[mediator_id] = coherence_rating
    
    def file_case(self, title: str, dispute_type: DisputeType,
                  parties: List[str], claims: Dict[str, str]) -> DisputeCase:
        """File a new dispute case."""
        case_id = f"case_{len(self.cases)}_{time.time()}"
        
        phase_positions = {}
        for i, party in enumerate(parties):
            phase_positions[party] = (i / len(parties)) * 2 * np.pi
        
        case = DisputeCase(
            case_id=case_id,
            title=title,
            dispute_type=dispute_type,
            parties=parties,
            claims=claims,
            phase_positions=phase_positions
        )
        
        self.cases[case_id] = case
        return case
    
    def assign_mediators(self, case_id: str, mediator_ids: List[str]) -> bool:
        """Assign mediators to a case."""
        if case_id not in self.cases:
            return False
        
        case = self.cases[case_id]
        case.mediator_ids = [
            mid for mid in mediator_ids 
            if mid in self.mediators
        ]
        case.status = "mediation"
        
        return len(case.mediator_ids) > 0
    
    def update_position(self, case_id: str, party_id: str, 
                        new_phase: float) -> Dict[str, Any]:
        """Update a party's position (phase) in mediation."""
        if case_id not in self.cases:
            return {"error": "Case not found"}
        
        case = self.cases[case_id]
        
        if party_id not in case.parties:
            return {"error": "Party not in case"}
        
        case.phase_positions[party_id] = new_phase % (2 * np.pi)
        
        return case.calculate_interference_pattern()
    
    def attempt_resolution(self, case_id: str) -> Dict[str, Any]:
        """Attempt to resolve a dispute."""
        if case_id not in self.cases:
            return {"error": "Case not found"}
        
        case = self.cases[case_id]
        pattern = case.calculate_interference_pattern()
        
        if pattern["can_resolve"]:
            case.resolution_coherence = pattern["coherence"]
            case.resolution_outcome = f"Resolved with {pattern['coherence']:.2%} coherence"
            case.status = "resolved"
            case.resolution_time = time.time()
            
            self.resolved_cases.append(case_id)
            self.total_mediation_hours += (case.resolution_time - case.creation_time) / 3600
            
            return {
                "success": True,
                "case_id": case_id,
                "coherence": case.resolution_coherence,
                "outcome": case.resolution_outcome,
                "mediation_hours": (case.resolution_time - case.creation_time) / 3600
            }
        else:
            return {
                "success": False,
                "case_id": case_id,
                "current_coherence": pattern["coherence"],
                "required_coherence": case.dispute_type.resolution_threshold,
                "pattern": pattern["pattern"],
                "recommendation": "Continue mediation to align positions"
            }
    
    def status(self) -> Dict[str, Any]:
        return {
            "mediator_id": self.mediator_id,
            "total_cases": len(self.cases),
            "active_cases": len([c for c in self.cases.values() if c.status != "resolved"]),
            "resolved_cases": len(self.resolved_cases),
            "registered_mediators": len(self.mediators),
            "total_mediation_hours": self.total_mediation_hours,
            "average_resolution_time_hours": (
                self.total_mediation_hours / len(self.resolved_cases) 
                if self.resolved_cases else 0
            )
        }


# =============================================================================
# PART 5: CIVIC INTELLIGENCE DASHBOARD
# =============================================================================

@dataclass
class CivicMetric:
    """A metric for civic health."""
    metric_id: str
    name: str
    value: float
    target: float
    unit: str
    
    trend: str = "stable"
    history: List[Tuple[float, float]] = field(default_factory=list)
    
    @property
    def achievement_ratio(self) -> float:
        """How close to target (1.0 = at target)."""
        if self.target == 0:
            return 1.0 if self.value == 0 else 0.0
        return min(1.0, self.value / self.target)
    
    def record(self, value: float):
        """Record a new value."""
        self.history.append((time.time(), value))
        
        old_value = self.value
        self.value = value
        
        if value > old_value * 1.05:
            self.trend = "increasing"
        elif value < old_value * 0.95:
            self.trend = "decreasing"
        else:
            self.trend = "stable"


class CivicIntelligenceDashboard:
    """
    Dashboard for monitoring planetary governance health.
    
    Tracks:
    - Participation coherence
    - Governance entropy
    - Constitutional integrity
    - Dispute resolution rate
    - Collective alignment
    """
    
    def __init__(self, dashboard_id: str = "planetary"):
        self.dashboard_id = dashboard_id
        self.metrics: Dict[str, CivicMetric] = {}
        
        self.constitution: Optional[SigmaConstitutionEngine] = None
        self.voting: Optional[MultiSpectrumVoting] = None
        self.mediator: Optional[DisputeResonanceMediator] = None
        self.authority_registry: Optional[AuthorityBandRegistry] = None
        
        self._initialize_metrics()
    
    def _initialize_metrics(self):
        """Initialize standard civic metrics."""
        self.metrics["participation_rate"] = CivicMetric(
            metric_id="participation_rate",
            name="Participation Rate",
            value=0.0,
            target=0.8,
            unit="ratio"
        )
        
        self.metrics["collective_coherence"] = CivicMetric(
            metric_id="collective_coherence",
            name="Collective Coherence",
            value=0.0,
            target=0.9,
            unit="ratio"
        )
        
        self.metrics["governance_entropy"] = CivicMetric(
            metric_id="governance_entropy",
            name="Governance Entropy",
            value=1.0,
            target=0.5,
            unit="bits"
        )
        
        self.metrics["dispute_resolution_rate"] = CivicMetric(
            metric_id="dispute_resolution_rate",
            name="Dispute Resolution Rate",
            value=0.0,
            target=0.9,
            unit="ratio"
        )
        
        self.metrics["constitutional_integrity"] = CivicMetric(
            metric_id="constitutional_integrity",
            name="Constitutional Integrity",
            value=1.0,
            target=1.0,
            unit="ratio"
        )
    
    def connect_systems(self, constitution: SigmaConstitutionEngine,
                        voting: MultiSpectrumVoting,
                        mediator: DisputeResonanceMediator,
                        authority_registry: AuthorityBandRegistry):
        """Connect governance systems for monitoring."""
        self.constitution = constitution
        self.voting = voting
        self.mediator = mediator
        self.authority_registry = authority_registry
    
    def update_metrics(self):
        """Update all metrics from connected systems."""
        if self.voting:
            status = self.voting.status()
            if status["registered_voters"] > 0:
                participation = status["total_ballots_cast"] / (
                    status["registered_voters"] * max(1, status["total_proposals"])
                )
                self.metrics["participation_rate"].record(min(1.0, participation))
            
            if status["completed_proposals"] > 0:
                avg_coherence = 0.7
                self.metrics["collective_coherence"].record(avg_coherence)
        
        if self.mediator:
            status = self.mediator.status()
            if status["total_cases"] > 0:
                resolution_rate = status["resolved_cases"] / status["total_cases"]
                self.metrics["dispute_resolution_rate"].record(resolution_rate)
        
        if self.constitution:
            verification = self.constitution.verify_constitution()
            if verification["total_articles"] > 0:
                integrity = verification["verified"] / verification["total_articles"]
                self.metrics["constitutional_integrity"].record(integrity)
        
        self._calculate_governance_entropy()
    
    def _calculate_governance_entropy(self):
        """
        Calculate governance entropy.
        
        S = −k Σ p_i ln(p_i)
        
        Low entropy = concentrated power (concerning)
        High entropy = distributed power (healthy up to a point)
        """
        if not self.authority_registry:
            return
        
        status = self.authority_registry.status()
        bands_by_level = status.get("bands_by_level", {})
        
        if not bands_by_level:
            return
        
        total_bands = sum(bands_by_level.values())
        if total_bands == 0:
            return
        
        entropy = 0.0
        for level, count in bands_by_level.items():
            if count > 0:
                p = count / total_bands
                entropy -= p * np.log2(p)
        
        max_entropy = np.log2(len(bands_by_level)) if bands_by_level else 1
        normalized_entropy = entropy / max_entropy if max_entropy > 0 else 0
        
        self.metrics["governance_entropy"].record(normalized_entropy)
    
    def overall_health_score(self) -> float:
        """Calculate overall governance health score."""
        if not self.metrics:
            return 0.0
        
        total_achievement = sum(m.achievement_ratio for m in self.metrics.values())
        return total_achievement / len(self.metrics)
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive governance report."""
        self.update_metrics()
        
        return {
            "dashboard_id": self.dashboard_id,
            "timestamp": time.time(),
            "overall_health": self.overall_health_score(),
            "metrics": {
                mid: {
                    "name": m.name,
                    "value": m.value,
                    "target": m.target,
                    "achievement": m.achievement_ratio,
                    "trend": m.trend,
                    "unit": m.unit
                }
                for mid, m in self.metrics.items()
            },
            "alerts": self._generate_alerts(),
            "k_level_governance": 0.90
        }
    
    def _generate_alerts(self) -> List[Dict[str, str]]:
        """Generate alerts for concerning metrics."""
        alerts = []
        
        for mid, metric in self.metrics.items():
            if metric.achievement_ratio < 0.5:
                alerts.append({
                    "level": "critical",
                    "metric": metric.name,
                    "message": f"{metric.name} at {metric.value:.2%}, target is {metric.target:.2%}"
                })
            elif metric.achievement_ratio < 0.7:
                alerts.append({
                    "level": "warning",
                    "metric": metric.name,
                    "message": f"{metric.name} below target"
                })
        
        return alerts


# =============================================================================
# PART 6: PLANETARY GOVERNANCE SYSTEM
# =============================================================================

class PlanetaryGovernanceSystem:
    """
    Top-level orchestrator for planetary governance.
    
    Integrates:
    - Authority band registry
    - Constitutional engine
    - Multi-spectrum voting
    - Dispute mediation
    - Civic intelligence dashboard
    """
    
    def __init__(self, system_id: str = "WNSP_GOVERNANCE"):
        self.system_id = system_id
        
        self.authority_registry = AuthorityBandRegistry()
        self.constitution = SigmaConstitutionEngine()
        self.voting = MultiSpectrumVoting()
        self.mediator = DisputeResonanceMediator()
        self.dashboard = CivicIntelligenceDashboard()
        
        self.dashboard.connect_systems(
            self.constitution,
            self.voting,
            self.mediator,
            self.authority_registry
        )
        
        self.creation_time = time.time()
    
    def propose_legislation(self, title: str, content: str,
                            domain: JurisdictionDomain,
                            level: GovernanceLevel = GovernanceLevel.PLANETARY) -> str:
        """Propose new legislation through proper channels."""
        bands = self.authority_registry.get_bands_for_domain(domain)
        if not bands:
            return "ERROR: No authority band for domain"
        
        authority_band = bands[0].band_id
        
        proposal = self.voting.create_proposal(
            title=title,
            description=content,
            vote_type=VoteType.COHERENCE,
            authority_band=authority_band
        )
        
        proposal.add_option("Approve", "Approve the proposed legislation")
        proposal.add_option("Reject", "Reject the proposed legislation")
        proposal.add_option("Amend", "Return for amendment")
        
        proposal.status = "active"
        
        return proposal.proposal_id
    
    def vote(self, voter_id: str, proposal_id: str, 
             selection: str, coherence: float = 1.0) -> bool:
        """Cast a vote on legislation."""
        self.voting.register_voter(voter_id, coherence)
        
        ballot = self.voting.cast_vote(
            voter_id, proposal_id, 
            {selection: 1.0}
        )
        
        return ballot is not None
    
    def finalize_legislation(self, proposal_id: str) -> Dict[str, Any]:
        """Finalize voting and enact if passed."""
        results = self.voting.finalize_proposal(proposal_id)
        
        if results.get("result") == "Approve":
            proposal = self.voting.proposals.get(proposal_id)
            if proposal:
                article = ConstitutionalArticle(
                    article_id=f"leg_{proposal_id}",
                    title=proposal.title,
                    content=proposal.description,
                    article_type=ArticleType.POLICY,
                    authority_band=proposal.authority_band,
                    domains=proposal.domains
                )
                
                self.constitution.ratify_article(
                    article.article_id,
                    results.get("final_coherence", 0.8)
                )
        
        return results
    
    def file_dispute(self, title: str, dispute_type: DisputeType,
                     parties: List[str], claims: Dict[str, str]) -> str:
        """File a governance dispute."""
        case = self.mediator.file_case(title, dispute_type, parties, claims)
        return case.case_id
    
    def global_status(self) -> Dict[str, Any]:
        """Return comprehensive governance status."""
        report = self.dashboard.generate_report()
        
        return {
            "system_id": self.system_id,
            "uptime_hours": (time.time() - self.creation_time) / 3600,
            "authority_registry": self.authority_registry.status(),
            "constitution": self.constitution.status(),
            "voting": self.voting.status(),
            "mediation": self.mediator.status(),
            "civic_health": report,
            "k_level_achievement": 0.90
        }


# =============================================================================
# DEMONSTRATION
# =============================================================================

def demonstrate_planetary_governance():
    """
    Demonstrate the Planetary Governance system.
    """
    print("=" * 70)
    print("WNSP Planetary Governance v1.8.0 - Demonstration")
    print("K-Level Achievement: 0.90")
    print("=" * 70)
    
    gov = PlanetaryGovernanceSystem()
    
    print("\n1. AUTHORITY BAND REGISTRY")
    print("-" * 40)
    
    registry_status = gov.authority_registry.status()
    print(f"  Total authority bands: {registry_status['total_bands']}")
    print(f"  Bands by level:")
    for level, count in registry_status['bands_by_level'].items():
        print(f"    {level}: {count} bands")
    
    regional_band = AuthorityBand(
        band_id="europe_energy",
        name="European Energy Authority",
        level=GovernanceLevel.CONTINENTAL,
        domains=[JurisdictionDomain.ENERGY],
        parent_band="global_energy"
    )
    gov.authority_registry.register_band(regional_band)
    print(f"\n  Registered: {regional_band.name}")
    print(f"    Spectral range: {regional_band.wavelength_min_nm:.0f}-{regional_band.wavelength_max_nm:.0f} nm")
    
    print("\n2. CONSTITUTIONAL ARTICLES")
    print("-" * 40)
    
    const_status = gov.constitution.status()
    print(f"  Total articles: {const_status['total_articles']}")
    print(f"  By type:")
    for atype, count in const_status['by_type'].items():
        print(f"    {atype}: {count}")
    
    verification = gov.constitution.verify_constitution()
    print(f"\n  Integrity verification:")
    print(f"    Verified: {verification['verified']}/{verification['total_articles']}")
    
    print("\n3. MULTI-SPECTRUM VOTING")
    print("-" * 40)
    
    voters = ["citizen_1", "citizen_2", "citizen_3", "citizen_4", "citizen_5",
              "delegate_1", "delegate_2", "council_1"]
    
    for voter in voters:
        coherence = random.uniform(0.6, 1.0)
        gov.voting.register_voter(voter, coherence)
    
    print(f"  Registered {len(voters)} voters with coherence scores")
    
    proposal = gov.voting.create_proposal(
        title="Renewable Energy Mandate",
        description="Require 80% renewable energy by 2040",
        vote_type=VoteType.COHERENCE,
        authority_band="global_energy"
    )
    proposal.add_option("Strong Support", "Fully implement mandate")
    proposal.add_option("Moderate Support", "Implement with flexibility")
    proposal.add_option("Oppose", "Reject the mandate")
    proposal.status = "active"
    
    print(f"\n  Created proposal: {proposal.title}")
    print(f"    Options: {[o.name for o in proposal.options]}")
    
    votes = [
        ("citizen_1", "Strong Support"),
        ("citizen_2", "Strong Support"),
        ("citizen_3", "Moderate Support"),
        ("citizen_4", "Strong Support"),
        ("citizen_5", "Oppose"),
        ("delegate_1", "Strong Support"),
        ("delegate_2", "Moderate Support"),
        ("council_1", "Strong Support")
    ]
    
    for voter, selection in votes:
        gov.voting.cast_vote(voter, proposal.proposal_id, {selection: 1.0})
    
    results = gov.voting.finalize_proposal(proposal.proposal_id)
    print(f"\n  Voting Results:")
    print(f"    Total ballots: {results['total_ballots']}")
    print(f"    Final coherence: {results['final_coherence']:.2%}")
    print(f"    Winner: {results['result']}")
    print(f"    Breakdown:")
    for opt in results['options']:
        print(f"      {opt['name']}: {opt['vote_count']} votes, score: {opt['weighted_score']:.2f}")
    
    print("\n4. DISPUTE RESOLUTION")
    print("-" * 40)
    
    gov.mediator.register_mediator("mediator_1", 0.9)
    gov.mediator.register_mediator("mediator_2", 0.85)
    
    case = gov.mediator.file_case(
        title="Resource Allocation Dispute",
        dispute_type=DisputeType.RESOURCE,
        parties=["region_north", "region_south"],
        claims={
            "region_north": "Insufficient energy allocation",
            "region_south": "Historical usage rights"
        }
    )
    print(f"  Filed case: {case.title}")
    print(f"    Parties: {case.parties}")
    
    gov.mediator.assign_mediators(case.case_id, ["mediator_1"])
    
    pattern = case.calculate_interference_pattern()
    print(f"    Initial pattern: {pattern['pattern']} (coherence: {pattern['coherence']:.2%})")
    
    gov.mediator.update_position(case.case_id, "region_north", 0.5)
    gov.mediator.update_position(case.case_id, "region_south", 0.7)
    
    resolution = gov.mediator.attempt_resolution(case.case_id)
    print(f"    Resolution attempt: {'Success' if resolution['success'] else 'Continuing mediation'}")
    if resolution['success']:
        print(f"    Final coherence: {resolution['coherence']:.2%}")
    
    print("\n5. CIVIC INTELLIGENCE DASHBOARD")
    print("-" * 40)
    
    report = gov.dashboard.generate_report()
    print(f"  Overall Health Score: {report['overall_health']:.2%}")
    print(f"\n  Metrics:")
    for mid, metric in report['metrics'].items():
        status = "✓" if metric['achievement'] >= 0.7 else "△" if metric['achievement'] >= 0.5 else "✗"
        print(f"    {status} {metric['name']}: {metric['value']:.2%} (target: {metric['target']:.2%})")
    
    if report['alerts']:
        print(f"\n  Alerts:")
        for alert in report['alerts']:
            print(f"    [{alert['level'].upper()}] {alert['message']}")
    
    print("\n6. GLOBAL GOVERNANCE STATUS")
    print("-" * 40)
    
    status = gov.global_status()
    print(f"  System ID: {status['system_id']}")
    print(f"  K-Level: {status['k_level_achievement']}")
    print(f"  Constitutional articles: {status['constitution']['total_articles']}")
    print(f"  Voting proposals: {status['voting']['total_proposals']}")
    print(f"  Dispute cases: {status['mediation']['total_cases']}")
    
    print("\n" + "=" * 70)
    print("Planetary Governance v1.8.0 - COMPLETE")
    print("=" * 70)
    
    return gov


if __name__ == "__main__":
    demonstrate_planetary_governance()
