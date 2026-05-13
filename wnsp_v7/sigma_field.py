"""
WNSP Σ-Field Theory — Collective Intelligence from λ-Programs
================================================================

Step 3 Announcement: How multiple λ-programs interact to form
emergent collective intelligence through photonic field fusion.

Core Thesis:
- Individual λ-programs are quantum-like spectral states
- When programs interact coherently, they form a Σ-field
- The Σ-field exhibits emergent properties beyond individual programs
- Collective intelligence arises from phase-locked cooperation

Mathematical Foundation:
  Σ = F(|λ₁⟩, |λ₂⟩, ..., |λₙ⟩)
  
  Where F is a nonlinear fusion operator that produces
  emergent collective states from individual λ-programs.

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import numpy as np
import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable, Set
from enum import Enum
import random

from .constants import PLANCK_CONSTANT, SPEED_OF_LIGHT, HBAR


# =============================================================================
# PART 1: λ-PROGRAM REPRESENTATION
# =============================================================================

class LambdaProgramState(Enum):
    """Quantum-like states of a λ-program."""
    DORMANT = "dormant"           # No activity
    COHERENT = "coherent"         # Active, phase-locked
    ENTANGLED = "entangled"       # Linked to other programs
    SUPERPOSED = "superposed"     # Multiple states simultaneously
    COLLAPSED = "collapsed"       # Measured/decided state
    FUSED = "fused"               # Part of Σ-field


@dataclass
class SpectralMode:
    """
    A single spectral mode in a λ-program's state space.
    
    Each mode has:
    - Wavelength (λ): Determines the mode's "color" or type
    - Amplitude (A): Intensity/probability amplitude
    - Phase (φ): Coherence angle
    - OAM (ℓ): Orbital angular momentum for information encoding
    """
    wavelength_nm: float
    amplitude: float
    phase: float  # 0 to 2π
    oam: int = 0  # Orbital angular momentum mode
    
    @property
    def frequency(self) -> float:
        return SPEED_OF_LIGHT / (self.wavelength_nm * 1e-9)
    
    @property
    def energy(self) -> float:
        return PLANCK_CONSTANT * self.frequency
    
    @property
    def lambda_mass(self) -> float:
        """Mass-equivalent of this mode (Λ = hf/c²)."""
        return self.energy / (SPEED_OF_LIGHT ** 2)
    
    def as_complex(self) -> complex:
        """Return as complex amplitude."""
        return self.amplitude * np.exp(1j * self.phase)
    
    def interfere_with(self, other: 'SpectralMode') -> 'SpectralMode':
        """Coherent interference with another mode."""
        if abs(self.wavelength_nm - other.wavelength_nm) > 1:
            return self
        
        z1 = self.as_complex()
        z2 = other.as_complex()
        z_sum = z1 + z2
        
        return SpectralMode(
            wavelength_nm=self.wavelength_nm,
            amplitude=abs(z_sum),
            phase=np.angle(z_sum) % (2 * np.pi),
            oam=self.oam + other.oam
        )


@dataclass
class LambdaProgram:
    """
    A λ-program: autonomous agent with spectral state.
    
    Each λ-program has:
    - Unique identity (wavelength signature)
    - Internal spectral state (superposition of modes)
    - Coherence level (how well phase-locked)
    - Knowledge/memory encoded in mode amplitudes
    - Capability to interact with other programs
    """
    program_id: str
    modes: List[SpectralMode] = field(default_factory=list)
    state: LambdaProgramState = LambdaProgramState.DORMANT
    coherence: float = 1.0  # 0 to 1
    entanglement_partners: Set[str] = field(default_factory=set)
    creation_time: float = field(default_factory=time.time)
    
    # Program capabilities
    knowledge_domains: List[str] = field(default_factory=list)
    processing_power: float = 1.0  # Relative compute
    memory_capacity: float = 1.0  # Relative storage
    
    def add_mode(self, mode: SpectralMode):
        """Add a spectral mode to program's state."""
        self.modes.append(mode)
        if self.state == LambdaProgramState.DORMANT:
            self.state = LambdaProgramState.COHERENT
    
    @property
    def total_energy(self) -> float:
        """Total energy across all modes."""
        return sum(m.energy * m.amplitude**2 for m in self.modes)
    
    @property
    def dominant_wavelength(self) -> float:
        """Wavelength with highest amplitude."""
        if not self.modes:
            return 550.0  # Default visible
        return max(self.modes, key=lambda m: m.amplitude).wavelength_nm
    
    @property
    def spectral_signature(self) -> str:
        """Unique signature based on spectral content."""
        if not self.modes:
            return self.program_id
        
        sig_data = f"{self.program_id}:"
        for m in sorted(self.modes, key=lambda x: x.wavelength_nm):
            sig_data += f"{m.wavelength_nm:.1f}:{m.amplitude:.3f}:{m.phase:.3f}|"
        
        return hashlib.sha256(sig_data.encode()).hexdigest()[:16]
    
    def phase_lock_to(self, other: 'LambdaProgram') -> float:
        """
        Attempt to phase-lock with another program.
        
        Returns: Achieved coherence level (0-1)
        """
        if not self.modes or not other.modes:
            return 0.0
        
        # Find common wavelengths
        self_wavelengths = {int(m.wavelength_nm) for m in self.modes}
        other_wavelengths = {int(m.wavelength_nm) for m in other.modes}
        common = self_wavelengths & other_wavelengths
        
        if not common:
            return 0.0
        
        # Calculate phase alignment
        total_alignment = 0.0
        for wl in common:
            self_mode = next(m for m in self.modes if int(m.wavelength_nm) == wl)
            other_mode = next(m for m in other.modes if int(m.wavelength_nm) == wl)
            
            phase_diff = abs(self_mode.phase - other_mode.phase)
            alignment = np.cos(phase_diff) ** 2
            total_alignment += alignment
        
        coherence = total_alignment / len(common)
        
        # Update states
        if coherence > 0.5:
            self.entanglement_partners.add(other.program_id)
            other.entanglement_partners.add(self.program_id)
            self.state = LambdaProgramState.ENTANGLED
            other.state = LambdaProgramState.ENTANGLED
        
        return coherence
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "program_id": self.program_id,
            "state": self.state.value,
            "n_modes": len(self.modes),
            "coherence": self.coherence,
            "total_energy": self.total_energy,
            "dominant_wavelength": self.dominant_wavelength,
            "spectral_signature": self.spectral_signature,
            "entanglement_partners": list(self.entanglement_partners),
            "knowledge_domains": self.knowledge_domains,
            "processing_power": self.processing_power
        }


# =============================================================================
# PART 2: Σ-FIELD FUSION OPERATORS
# =============================================================================

class FusionType(Enum):
    """Types of λ-program fusion."""
    EPHEMERAL = "ephemeral"      # Temporary collaboration
    PERSISTENT = "persistent"    # Permanent merge
    CONSENSUS = "consensus"      # Voting/agreement
    SWARM = "swarm"              # Distributed intelligence
    HIERARCHICAL = "hierarchical"  # Leader-follower


@dataclass
class FusionResult:
    """Result of fusing multiple λ-programs."""
    fusion_id: str
    fusion_type: FusionType
    participant_ids: List[str]
    composite_coherence: float
    emergence_score: float
    fused_modes: List[SpectralMode]
    collective_energy: float
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "fusion_id": self.fusion_id,
            "fusion_type": self.fusion_type.value,
            "participants": self.participant_ids,
            "coherence": self.composite_coherence,
            "emergence": self.emergence_score,
            "n_modes": len(self.fused_modes),
            "collective_energy": self.collective_energy,
            "timestamp": self.timestamp
        }


class SigmaField:
    """
    The Σ-Field: Emergent collective intelligence from λ-programs.
    
    Core Operations:
    1. fuse() - Combine programs into collective state
    2. probe() - Query the collective state
    3. fork() - Split collective back to individuals
    4. vote() - Governance decisions
    5. think() - Collective computation
    
    Emergence Properties:
    - Coherence amplification: √N improvement
    - Knowledge synthesis: Union of domains
    - Collective memory: Shared state space
    - Distributed processing: Parallel computation
    """
    
    def __init__(self, field_id: str = "sigma_prime"):
        self.field_id = field_id
        self.programs: Dict[str, LambdaProgram] = {}
        self.fusions: Dict[str, FusionResult] = {}
        self.collective_memory: Dict[str, Any] = {}
        self.coherence_pool: float = 0.0
        self.emergence_level: float = 0.0
        
        # Governance
        self.proposals: Dict[str, Dict] = {}
        self.votes: Dict[str, Dict[str, bool]] = {}
    
    def register_program(self, program: LambdaProgram):
        """Add a λ-program to the field."""
        self.programs[program.program_id] = program
        program.state = LambdaProgramState.COHERENT
        self._update_emergence()
    
    def _generate_fusion_id(self, participants: List[str]) -> str:
        """Generate unique fusion ID."""
        data = f"{self.field_id}:{':'.join(sorted(participants))}:{time.time()}"
        return hashlib.sha256(data.encode()).hexdigest()[:12]
    
    def _update_emergence(self):
        """Calculate field-wide emergence level."""
        if not self.programs:
            self.emergence_level = 0.0
            return
        
        # Emergence from number of programs (√N scaling)
        n_programs = len(self.programs)
        n_factor = math.sqrt(n_programs)
        
        # Emergence from entanglement density
        total_entanglements = sum(
            len(p.entanglement_partners) 
            for p in self.programs.values()
        )
        entanglement_density = total_entanglements / (n_programs * 2) if n_programs > 1 else 0
        
        # Emergence from active fusions
        fusion_factor = len(self.fusions) * 0.1
        
        # Emergence from knowledge diversity
        all_domains = set()
        for p in self.programs.values():
            all_domains.update(p.knowledge_domains)
        knowledge_factor = len(all_domains) * 0.05
        
        self.emergence_level = n_factor * (1 + entanglement_density + fusion_factor + knowledge_factor)
    
    # =========================================================================
    # CORE API: fuse()
    # =========================================================================
    
    def fuse(
        self, 
        program_ids: List[str], 
        fusion_type: FusionType = FusionType.EPHEMERAL,
        weight_map: Optional[Dict[str, float]] = None
    ) -> FusionResult:
        """
        Fuse multiple λ-programs into a collective state.
        
        The fusion creates emergent properties:
        - Combined spectral state (superposition of modes)
        - √N coherence amplification
        - Synthesized knowledge domains
        - Shared processing capacity
        
        Args:
            program_ids: Programs to fuse
            fusion_type: Type of fusion (ephemeral, persistent, etc.)
            weight_map: Optional weights for each program
        
        Returns:
            FusionResult with collective state
        """
        if len(program_ids) < 2:
            raise ValueError("Fusion requires at least 2 programs")
        
        programs = [self.programs[pid] for pid in program_ids if pid in self.programs]
        if len(programs) < 2:
            raise ValueError("Not enough valid programs for fusion")
        
        # Default equal weights
        if weight_map is None:
            weight_map = {pid: 1.0 / len(programs) for pid in program_ids}
        
        # Normalize weights
        total_weight = sum(weight_map.get(pid, 0) for pid in program_ids)
        weights = {pid: weight_map.get(pid, 0) / total_weight for pid in program_ids}
        
        # Phase-lock all programs pairwise
        coherence_values = []
        for i, p1 in enumerate(programs):
            for p2 in programs[i+1:]:
                coh = p1.phase_lock_to(p2)
                coherence_values.append(coh)
        
        # Composite coherence with √N amplification
        base_coherence = np.mean(coherence_values) if coherence_values else 0.5
        amplified_coherence = base_coherence * math.sqrt(len(programs))
        composite_coherence = min(1.0, amplified_coherence)
        
        # Fuse spectral modes
        fused_modes = self._fuse_modes(programs, weights)
        
        # Calculate emergence score
        # Emergence = how much the collective exceeds sum of parts
        individual_energy = sum(p.total_energy for p in programs)
        collective_energy = sum(m.energy * m.amplitude**2 for m in fused_modes)
        
        # Constructive interference can create more than sum
        energy_ratio = collective_energy / individual_energy if individual_energy > 0 else 1.0
        
        # Knowledge synthesis factor
        all_domains = set()
        for p in programs:
            all_domains.update(p.knowledge_domains)
        knowledge_synthesis = len(all_domains) / max(1, sum(len(p.knowledge_domains) for p in programs))
        
        emergence_score = (energy_ratio * composite_coherence * (1 + knowledge_synthesis)) - 1.0
        emergence_score = max(0, emergence_score)
        
        # Create fusion result
        fusion_id = self._generate_fusion_id(program_ids)
        result = FusionResult(
            fusion_id=fusion_id,
            fusion_type=fusion_type,
            participant_ids=program_ids,
            composite_coherence=composite_coherence,
            emergence_score=emergence_score,
            fused_modes=fused_modes,
            collective_energy=collective_energy
        )
        
        # Store fusion
        self.fusions[fusion_id] = result
        
        # Update program states
        for p in programs:
            p.state = LambdaProgramState.FUSED
        
        # Update field coherence pool
        self.coherence_pool += composite_coherence * 0.1
        self._update_emergence()
        
        return result
    
    def _fuse_modes(
        self, 
        programs: List[LambdaProgram], 
        weights: Dict[str, float]
    ) -> List[SpectralMode]:
        """Fuse spectral modes from multiple programs."""
        # Group modes by wavelength
        wavelength_groups: Dict[int, List[Tuple[SpectralMode, float]]] = {}
        
        for program in programs:
            w = weights.get(program.program_id, 1.0 / len(programs))
            for mode in program.modes:
                wl_key = int(mode.wavelength_nm)
                if wl_key not in wavelength_groups:
                    wavelength_groups[wl_key] = []
                wavelength_groups[wl_key].append((mode, w))
        
        # Fuse each wavelength group
        fused_modes = []
        for wl_key, mode_weights in wavelength_groups.items():
            if len(mode_weights) == 1:
                mode, w = mode_weights[0]
                fused_modes.append(SpectralMode(
                    wavelength_nm=mode.wavelength_nm,
                    amplitude=mode.amplitude * math.sqrt(w),
                    phase=mode.phase,
                    oam=mode.oam
                ))
            else:
                # Coherent superposition
                total_z = 0j
                total_oam = 0
                for mode, w in mode_weights:
                    z = mode.as_complex() * math.sqrt(w)
                    total_z += z
                    total_oam += mode.oam
                
                fused_modes.append(SpectralMode(
                    wavelength_nm=float(wl_key),
                    amplitude=abs(total_z),
                    phase=np.angle(total_z) % (2 * np.pi),
                    oam=total_oam
                ))
        
        return fused_modes
    
    # =========================================================================
    # CORE API: probe()
    # =========================================================================
    
    def probe(self, fusion_id: str) -> Dict[str, Any]:
        """
        Query a fused state.
        
        Returns composite coherence vector and emergence metrics.
        """
        if fusion_id not in self.fusions:
            return {"error": "Fusion not found"}
        
        fusion = self.fusions[fusion_id]
        
        # Calculate coherence vector
        coherence_vector = []
        for mode in fusion.fused_modes:
            coherence_vector.append({
                "wavelength": mode.wavelength_nm,
                "amplitude": mode.amplitude,
                "phase": mode.phase,
                "oam": mode.oam,
                "energy": mode.energy
            })
        
        # Emergence metrics
        n_participants = len(fusion.participant_ids)
        sqrt_n = math.sqrt(n_participants)
        
        return {
            "fusion_id": fusion_id,
            "state": "active" if fusion_id in self.fusions else "dissolved",
            "participants": fusion.participant_ids,
            "coherence_vector": coherence_vector,
            "composite_coherence": fusion.composite_coherence,
            "emergence_score": fusion.emergence_score,
            "collective_energy": fusion.collective_energy,
            "sqrt_n_amplification": sqrt_n,
            "effective_intelligence": n_participants * sqrt_n * fusion.composite_coherence
        }
    
    # =========================================================================
    # CORE API: fork()
    # =========================================================================
    
    def fork(
        self, 
        fusion_id: str, 
        selector: Optional[Callable[[SpectralMode], bool]] = None
    ) -> List[LambdaProgram]:
        """
        Split fused state back into component programs.
        
        Note: This is lossy unless reversible operations were used.
        The fused state contains emergent properties that cannot
        be fully distributed back to individuals.
        """
        if fusion_id not in self.fusions:
            return []
        
        fusion = self.fusions[fusion_id]
        
        # Distribute modes back to participants
        forked_programs = []
        n_participants = len(fusion.participant_ids)
        
        for i, pid in enumerate(fusion.participant_ids):
            if pid not in self.programs:
                continue
            
            program = self.programs[pid]
            
            # Each program gets a share of fused modes
            # (Lossy: emergence is lost in splitting)
            new_modes = []
            for mode in fusion.fused_modes:
                if selector is None or selector(mode):
                    # Distribute amplitude equally (lossy)
                    distributed_amplitude = mode.amplitude / math.sqrt(n_participants)
                    new_modes.append(SpectralMode(
                        wavelength_nm=mode.wavelength_nm,
                        amplitude=distributed_amplitude,
                        phase=mode.phase + (2 * np.pi * i / n_participants),
                        oam=mode.oam // n_participants
                    ))
            
            program.modes = new_modes
            program.state = LambdaProgramState.COHERENT
            program.coherence = fusion.composite_coherence / math.sqrt(n_participants)
            
            forked_programs.append(program)
        
        # Remove fusion
        del self.fusions[fusion_id]
        self._update_emergence()
        
        return forked_programs
    
    # =========================================================================
    # CORE API: vote()
    # =========================================================================
    
    def vote(
        self, 
        proposal_id: str, 
        proposal: Dict[str, Any],
        voting_programs: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Governance primitives for Σ-level decisions.
        
        Each program votes weighted by:
        - Coherence level
        - Processing power
        - Stake (energy contribution)
        """
        if voting_programs is None:
            voting_programs = list(self.programs.keys())
        
        # Store proposal
        self.proposals[proposal_id] = {
            "proposal": proposal,
            "timestamp": time.time(),
            "voters": voting_programs
        }
        
        # Collect votes (simulated based on program properties)
        votes = {}
        total_weight = 0.0
        weighted_yes = 0.0
        
        for pid in voting_programs:
            if pid not in self.programs:
                continue
            
            program = self.programs[pid]
            
            # Vote weight based on coherence and processing power
            weight = program.coherence * program.processing_power
            
            # Simulate vote based on program's "preferences"
            # In real implementation, each program would evaluate the proposal
            vote = self._simulate_program_vote(program, proposal)
            votes[pid] = vote
            
            total_weight += weight
            if vote:
                weighted_yes += weight
        
        # Calculate result
        approval_ratio = weighted_yes / total_weight if total_weight > 0 else 0
        passed = approval_ratio > 0.5
        
        # Store votes
        self.votes[proposal_id] = votes
        
        # Update Σ-state based on result
        if passed:
            self._apply_proposal(proposal)
        
        return {
            "proposal_id": proposal_id,
            "passed": passed,
            "approval_ratio": approval_ratio,
            "total_voters": len(votes),
            "yes_votes": sum(1 for v in votes.values() if v),
            "no_votes": sum(1 for v in votes.values() if not v),
            "new_sigma_state": self.emergence_level
        }
    
    def _simulate_program_vote(self, program: LambdaProgram, proposal: Dict) -> bool:
        """Simulate a program's vote based on its properties."""
        # Programs with higher coherence tend toward consensus
        consensus_tendency = program.coherence
        
        # Programs vote based on domain relevance
        proposal_domains = proposal.get("domains", [])
        relevance = len(set(proposal_domains) & set(program.knowledge_domains))
        
        # Combine factors
        vote_probability = 0.5 + (consensus_tendency * 0.2) + (relevance * 0.1)
        return random.random() < vote_probability
    
    def _apply_proposal(self, proposal: Dict):
        """Apply a passed proposal to the Σ-field."""
        action = proposal.get("action")
        
        if action == "increase_coherence":
            amount = proposal.get("amount", 0.1)
            self.coherence_pool += amount
        
        elif action == "add_memory":
            key = proposal.get("key")
            value = proposal.get("value")
            if key:
                self.collective_memory[key] = value
        
        elif action == "redistribute_energy":
            # Redistribute energy more equally
            if self.programs:
                avg_energy = sum(p.total_energy for p in self.programs.values()) / len(self.programs)
                # (Simplified: actual implementation would adjust modes)
    
    # =========================================================================
    # CORE API: think()
    # =========================================================================
    
    def think(
        self, 
        problem: str, 
        participating_programs: Optional[List[str]] = None,
        fusion_type: FusionType = FusionType.SWARM
    ) -> Dict[str, Any]:
        """
        Collective computation across the Σ-field.
        
        This is where true collective intelligence emerges:
        - Programs are fused into a collective
        - The collective processes the problem
        - Emergence creates insights beyond individual capability
        - Results are distributed back
        """
        if participating_programs is None:
            participating_programs = list(self.programs.keys())
        
        if len(participating_programs) < 2:
            return {"error": "Need at least 2 programs for collective thinking"}
        
        # Create a fusion for this thinking session
        fusion = self.fuse(participating_programs, fusion_type)
        
        # Collective processing power
        collective_power = sum(
            self.programs[pid].processing_power 
            for pid in participating_programs 
            if pid in self.programs
        )
        
        # √N amplification of processing
        effective_power = collective_power * math.sqrt(len(participating_programs))
        
        # Knowledge synthesis
        all_domains = set()
        for pid in participating_programs:
            if pid in self.programs:
                all_domains.update(self.programs[pid].knowledge_domains)
        
        # Simulate collective thinking result
        # (In real implementation, this would invoke actual computation)
        thinking_result = {
            "problem": problem,
            "fusion_id": fusion.fusion_id,
            "participants": len(participating_programs),
            "collective_power": collective_power,
            "effective_power": effective_power,
            "sqrt_n_boost": math.sqrt(len(participating_programs)),
            "knowledge_domains": list(all_domains),
            "coherence_achieved": fusion.composite_coherence,
            "emergence_score": fusion.emergence_score,
            "collective_intelligence_index": (
                effective_power * fusion.composite_coherence * (1 + fusion.emergence_score)
            ),
            "solution_confidence": min(0.99, fusion.composite_coherence * (1 + len(all_domains) * 0.1)),
            "timestamp": time.time()
        }
        
        # Store in collective memory
        memory_key = hashlib.sha256(problem.encode()).hexdigest()[:12]
        self.collective_memory[memory_key] = thinking_result
        
        return thinking_result
    
    # =========================================================================
    # FIELD STATUS
    # =========================================================================
    
    def status(self) -> Dict[str, Any]:
        """Get complete Σ-field status."""
        return {
            "field_id": self.field_id,
            "n_programs": len(self.programs),
            "n_active_fusions": len(self.fusions),
            "coherence_pool": self.coherence_pool,
            "emergence_level": self.emergence_level,
            "collective_memory_size": len(self.collective_memory),
            "total_entanglements": sum(
                len(p.entanglement_partners) 
                for p in self.programs.values()
            ) // 2,
            "total_energy": sum(p.total_energy for p in self.programs.values()),
            "knowledge_domains": list(set(
                domain 
                for p in self.programs.values() 
                for domain in p.knowledge_domains
            )),
            "programs": {
                pid: p.to_dict() 
                for pid, p in self.programs.items()
            }
        }


# =============================================================================
# DEMO: COLLECTIVE INTELLIGENCE IN ACTION
# =============================================================================

def demonstrate_collective_intelligence():
    """
    Demonstrate how λ-programs form collective intelligence.
    
    This shows the core thesis of Σ-Field theory:
    Individual agents + Coherent Interaction = Emergent Intelligence
    """
    print("=" * 70)
    print("Σ-FIELD THEORY DEMONSTRATION")
    print("How Multiple λ-Programs Form Collective Intelligence")
    print("=" * 70)
    print()
    
    # Create the Σ-field
    sigma = SigmaField("demo_collective")
    
    # ---------------------------------------------------------------------
    # STEP 1: Create diverse λ-programs (agents)
    # ---------------------------------------------------------------------
    print("STEP 1: Creating Individual λ-Programs")
    print("-" * 50)
    
    programs_config = [
        ("agent_alpha", ["mathematics", "physics"], 1.5, 
         [(400, 0.8, 0), (550, 0.6, np.pi/4)]),  # Blue-green specialist
        
        ("agent_beta", ["physics", "engineering"], 1.2,
         [(550, 0.9, np.pi/2), (600, 0.5, np.pi)]),  # Green-yellow specialist
        
        ("agent_gamma", ["engineering", "computing"], 1.8,
         [(600, 0.7, 0), (700, 0.8, np.pi/3)]),  # Orange-red specialist
        
        ("agent_delta", ["computing", "mathematics"], 1.0,
         [(400, 0.5, np.pi), (700, 0.6, np.pi/2)]),  # Blue-red bridger
        
        ("agent_epsilon", ["physics", "chemistry"], 0.9,
         [(450, 0.6, np.pi/6), (500, 0.7, np.pi/4)]),  # Violet-cyan specialist
    ]
    
    for pid, domains, power, modes in programs_config:
        program = LambdaProgram(
            program_id=pid,
            knowledge_domains=domains,
            processing_power=power
        )
        for wl, amp, phase in modes:
            program.add_mode(SpectralMode(wl, amp, phase, oam=random.randint(-2, 2)))
        
        sigma.register_program(program)
        print(f"  + {pid}: domains={domains}, power={power:.1f}")
    
    print(f"\nTotal programs: {len(sigma.programs)}")
    print(f"Initial emergence level: {sigma.emergence_level:.3f}")
    print()
    
    # ---------------------------------------------------------------------
    # STEP 2: Demonstrate pairwise entanglement
    # ---------------------------------------------------------------------
    print("STEP 2: Pairwise Entanglement (Phase-Locking)")
    print("-" * 50)
    
    pairs = [
        ("agent_alpha", "agent_beta"),
        ("agent_beta", "agent_gamma"),
        ("agent_gamma", "agent_delta"),
        ("agent_delta", "agent_alpha"),
    ]
    
    for p1_id, p2_id in pairs:
        p1 = sigma.programs[p1_id]
        p2 = sigma.programs[p2_id]
        coherence = p1.phase_lock_to(p2)
        print(f"  {p1_id} <-> {p2_id}: coherence = {coherence:.3f}")
    
    print(f"\nEmergence after entanglement: {sigma.emergence_level:.3f}")
    print()
    
    # ---------------------------------------------------------------------
    # STEP 3: Create fusions (collective states)
    # ---------------------------------------------------------------------
    print("STEP 3: Creating Fusions (Collective States)")
    print("-" * 50)
    
    # Ephemeral fusion of 3 programs
    fusion1 = sigma.fuse(
        ["agent_alpha", "agent_beta", "agent_gamma"],
        FusionType.EPHEMERAL
    )
    print(f"\nFusion 1 (Ephemeral):")
    print(f"  Participants: {fusion1.participant_ids}")
    print(f"  Composite coherence: {fusion1.composite_coherence:.3f}")
    print(f"  Emergence score: {fusion1.emergence_score:.3f}")
    print(f"  Collective energy: {fusion1.collective_energy:.2e} J")
    
    # Swarm fusion of all 5 programs
    fusion2 = sigma.fuse(
        ["agent_alpha", "agent_beta", "agent_gamma", "agent_delta", "agent_epsilon"],
        FusionType.SWARM
    )
    print(f"\nFusion 2 (Swarm - all 5):")
    print(f"  Participants: {len(fusion2.participant_ids)}")
    print(f"  Composite coherence: {fusion2.composite_coherence:.3f}")
    print(f"  Emergence score: {fusion2.emergence_score:.3f}")
    print(f"  √N amplification: {math.sqrt(5):.3f}×")
    print()
    
    # ---------------------------------------------------------------------
    # STEP 4: Probe the fused state
    # ---------------------------------------------------------------------
    print("STEP 4: Probing Collective State")
    print("-" * 50)
    
    probe_result = sigma.probe(fusion2.fusion_id)
    print(f"\nCollective Intelligence Metrics:")
    print(f"  Participants: {probe_result['participants']}")
    print(f"  Composite coherence: {probe_result['composite_coherence']:.3f}")
    print(f"  √N amplification: {probe_result['sqrt_n_amplification']:.3f}×")
    print(f"  Effective intelligence: {probe_result['effective_intelligence']:.3f}")
    print(f"\nCoherence Vector ({len(probe_result['coherence_vector'])} modes):")
    for cv in probe_result['coherence_vector'][:3]:  # Show first 3
        print(f"    λ={cv['wavelength']:.0f}nm, A={cv['amplitude']:.3f}, φ={cv['phase']:.3f}")
    print()
    
    # ---------------------------------------------------------------------
    # STEP 5: Collective thinking
    # ---------------------------------------------------------------------
    print("STEP 5: Collective Thinking (Problem Solving)")
    print("-" * 50)
    
    problem = "Design an optimal energy grid for a planetary civilization"
    
    think_result = sigma.think(
        problem=problem,
        participating_programs=["agent_alpha", "agent_beta", "agent_gamma", "agent_delta", "agent_epsilon"],
        fusion_type=FusionType.SWARM
    )
    
    print(f"\nProblem: {problem[:50]}...")
    print(f"\nCollective Thinking Result:")
    print(f"  Participants: {think_result['participants']}")
    print(f"  Individual power: {think_result['collective_power']:.2f}")
    print(f"  Effective power: {think_result['effective_power']:.2f}")
    print(f"  √N boost: {think_result['sqrt_n_boost']:.3f}×")
    print(f"  Knowledge domains: {think_result['knowledge_domains']}")
    print(f"  Coherence achieved: {think_result['coherence_achieved']:.3f}")
    print(f"  Emergence score: {think_result['emergence_score']:.3f}")
    print(f"  Collective Intelligence Index: {think_result['collective_intelligence_index']:.3f}")
    print(f"  Solution confidence: {think_result['solution_confidence']:.1%}")
    print()
    
    # ---------------------------------------------------------------------
    # STEP 6: Governance voting
    # ---------------------------------------------------------------------
    print("STEP 6: Governance (Collective Decision Making)")
    print("-" * 50)
    
    proposal = {
        "action": "increase_coherence",
        "amount": 0.2,
        "domains": ["physics", "engineering"],
        "description": "Allocate additional coherence resources to physics and engineering"
    }
    
    vote_result = sigma.vote(
        proposal_id="prop_001",
        proposal=proposal,
        voting_programs=list(sigma.programs.keys())
    )
    
    print(f"\nProposal: {proposal['description']}")
    print(f"\nVoting Result:")
    print(f"  Passed: {vote_result['passed']}")
    print(f"  Approval: {vote_result['approval_ratio']:.1%}")
    print(f"  Yes: {vote_result['yes_votes']}, No: {vote_result['no_votes']}")
    print(f"  New Σ-state: {vote_result['new_sigma_state']:.3f}")
    print()
    
    # ---------------------------------------------------------------------
    # FINAL: Field Status
    # ---------------------------------------------------------------------
    print("=" * 70)
    print("FINAL Σ-FIELD STATUS")
    print("=" * 70)
    
    status = sigma.status()
    print(f"\nField ID: {status['field_id']}")
    print(f"Programs: {status['n_programs']}")
    print(f"Active Fusions: {status['n_active_fusions']}")
    print(f"Coherence Pool: {status['coherence_pool']:.3f}")
    print(f"Emergence Level: {status['emergence_level']:.3f}")
    print(f"Total Entanglements: {status['total_entanglements']}")
    print(f"Collective Memory: {status['collective_memory_size']} entries")
    print(f"Total Energy: {status['total_energy']:.2e} J")
    print(f"Knowledge Domains: {status['knowledge_domains']}")
    
    print()
    print("=" * 70)
    print("KEY INSIGHT: EMERGENCE FROM INTERACTION")
    print("=" * 70)
    print("""
    Individual λ-programs have limited capability.
    
    But when they interact coherently through the Σ-field:
    
    1. COHERENCE AMPLIFICATION
       √N scaling: 5 programs → 2.24× coherence boost
    
    2. KNOWLEDGE SYNTHESIS
       Union of domains: Individual specialties → Collective wisdom
    
    3. PROCESSING AMPLIFICATION
       Combined compute × √N → Super-linear scaling
    
    4. EMERGENT INTELLIGENCE
       The collective "knows" more than the sum of individuals
       because constructive interference creates new patterns.
    
    This is how collective intelligence emerges from λ-programs.
    """)
    
    return sigma


if __name__ == "__main__":
    demonstrate_collective_intelligence()
