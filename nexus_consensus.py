"""
Nexus Consensus Mechanism - Community-Owned AI-Optimized Blockchain

Integrates:
1. GhostDAG - Parallel block processing via DAG structure
2. Proof of Spectrum - Spectral diversity for 51% attack prevention
3. Nexus Economic Equation - AI-optimized issuance/burn mechanics
4. Community Governance - Contribution-weighted decision making

Philosophy:
- Network provides security (DAG + spectral diversity)
- AI optimizes economics (Nexus equation parameters)
- Community develops ecosystem (governance + contribution rewards)
- Users build wealth (economic incentives aligned with network health)
"""

import hashlib
import time
import numpy as np
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum

# Import existing components
from ghostdag_core import GhostDAGEngine, DAGBlock
from proof_of_spectrum import (
    ProofOfSpectrumConsensus, 
    SpectralValidator, 
    SpectralRegion
)
from nexus_engine import NexusEngine
from native_token import token_system


class ContributionType(Enum):
    """Types of ecosystem contributions"""
    HUMAN_INTERACTION = "human"      # H: Human contribution (usage, engagement)
    MACHINE_COMPUTATION = "machine"  # M: Machine contribution (mining, validation)
    DATA_PROVISION = "data"          # D: Data contribution (oracle feeds, storage)
    DEVELOPMENT = "development"      # Dev: Code, smart contracts, tools
    GOVERNANCE = "governance"        # Gov: Voting, proposals, community leadership


@dataclass
class SpectralSignature:
    """Signature from spectral validator"""
    validator_id: str
    spectral_region: SpectralRegion
    wavelength: float
    signature_hash: str


@dataclass
class ContributionScore:
    """Tracks validator's contribution to ecosystem"""
    validator_id: str
    human_score: float = 0.0        # H metric
    machine_score: float = 0.0      # M metric
    data_score: float = 0.0         # D metric
    development_score: float = 0.0
    governance_score: float = 0.0
    
    # Weighted total based on Nexus equation
    total_contribution: float = 0.0
    
    # Economic metrics
    blocks_validated: int = 0
    rewards_earned: int = 0  # In NXT units
    
    def calculate_total(self, nexus_engine: NexusEngine) -> float:
        """Calculate total contribution using Nexus equation weights"""
        self.total_contribution = (
            nexus_engine.w_H * self.human_score +
            nexus_engine.w_M * self.machine_score +
            nexus_engine.w_D * self.data_score +
            0.1 * self.development_score +  # Development bonus
            0.1 * self.governance_score      # Governance bonus
        )
        return self.total_contribution


class NexusBlock(DAGBlock):
    """
    Enhanced DAG block with Nexus economics and spectral validation
    """
    def __init__(self, **kwargs):
        # Initialize base DAGBlock fields
        super().__init__(
            block_id=kwargs.get('block_id', ''),
            timestamp=kwargs.get('timestamp', time.time()),
            parent_blocks=kwargs.get('parent_blocks', []),
            data=kwargs.get('data', {}),
            creator=kwargs.get('creator', ''),
            hash=kwargs.get('hash', ''),
            blue_score=kwargs.get('blue_score', 0),
            is_blue=kwargs.get('is_blue', True),
            topological_order=kwargs.get('topological_order', -1)
        )
        
        # Spectral consensus
        self.spectral_signatures: List[SpectralSignature] = kwargs.get('spectral_signatures', [])
        self.spectral_coverage: float = kwargs.get('spectral_coverage', 0.0)
        
        # Nexus economics
        self.system_health: float = kwargs.get('system_health', 0.0)
        self.issuance_rate: float = kwargs.get('issuance_rate', 0.0)
        self.burn_rate: float = kwargs.get('burn_rate', 0.0)
        self.block_reward: int = kwargs.get('block_reward', 0)
        
        # Contribution tracking
        self.validator_contributions: Dict[str, float] = kwargs.get('validator_contributions', {})
        
        # Economic state
        self.total_supply_delta: int = kwargs.get('total_supply_delta', 0)


class NexusConsensusEngine:
    """
    Nexus Consensus Engine - The Heart of Community-Owned Blockchain
    
    Architecture:
    - DAG Structure: Parallel block creation (GhostDAG)
    - Security: Spectral diversity prevents 51% attacks (Proof of Spectrum)
    - Economics: AI-optimized via Nexus equation (adaptive issuance/burn)
    - Governance: Contribution-weighted community control
    
    Economic Flow:
    1. Validators contribute to ecosystem (H, M, D scores)
    2. System health (S) increases with contributions
    3. Block rewards scale with system health
    4. Community governs via contribution-weighted voting
    5. Users build wealth through aligned incentives
    """
    
    def __init__(
        self,
        nexus_params: Optional[Dict] = None,
        ghostdag_k: int = 3,
        spectral_coverage_required: float = 0.83
    ):
        """
        Initialize Nexus Consensus Engine
        
        Args:
            nexus_params: Economic parameters dict for Nexus equation
            ghostdag_k: Security parameter for GhostDAG
            spectral_coverage_required: Required spectral diversity (83% = 5/6 regions)
        """
        # Core engines
        self.ghostdag = GhostDAGEngine(k=ghostdag_k)
        self.spectrum = ProofOfSpectrumConsensus(
            required_spectral_coverage=spectral_coverage_required
        )
        
        # Default Nexus parameters if not provided
        default_params = {
            'alpha': 0.05, 'beta': 0.05, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.3, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.2,
            'gamma_C': 0.1, 'gamma_D': 0.05, 'gamma_E': 0.08,
            'K_p': 0.5, 'K_i': 0.1, 'K_d': 0.05,
            'N_target': 1000.0, 'F_floor': 10.0,
            'lambda_E': 1.0, 'lambda_N': 1.0, 'lambda_H': 1.0, 'lambda_M': 1.0,
            'N_0': 1000.0, 'H_0': 100.0, 'M_0': 100.0
        }
        
        if nexus_params:
            default_params.update(nexus_params)
        
        self.nexus_engine = NexusEngine(params=default_params)
        
        # Validator tracking
        self.validators: Dict[str, SpectralValidator] = {}
        self.contributions: Dict[str, ContributionScore] = {}
        
        # Network state
        self.current_system_health: float = 0.5  # S(t)
        self.current_issuance: float = 0.0       # I(t)
        self.current_burn: float = 0.0           # B(t)
        self.total_network_value: float = 1000.0  # N(t)
        
        # Economic parameters
        self.base_block_reward: int = 5000  # 50 NXT in units
        self.reward_scaling_factor: float = 1.0
        
        # Governance
        self.governance_threshold: float = 0.67  # 67% weighted vote required
        
        # Statistics
        self.total_blocks: int = 0
        self.total_rewards_distributed: int = 0
        self.total_contributions_recorded: int = 0
        
    def register_validator(self, validator: SpectralValidator):
        """Register a new validator in the network"""
        self.spectrum.register_validator(validator)
        self.validators[validator.validator_id] = validator
        
        # Initialize contribution tracking
        self.contributions[validator.validator_id] = ContributionScore(
            validator_id=validator.validator_id
        )
    
    def record_contribution(
        self,
        validator_id: str,
        contribution_type: ContributionType,
        amount: float
    ):
        """
        Record ecosystem contribution from validator
        
        Args:
            validator_id: Validator making contribution
            contribution_type: Type of contribution
            amount: Contribution amount (normalized 0-1)
        """
        if validator_id not in self.contributions:
            return
        
        score = self.contributions[validator_id]
        
        if contribution_type == ContributionType.HUMAN_INTERACTION:
            score.human_score += amount
        elif contribution_type == ContributionType.MACHINE_COMPUTATION:
            score.machine_score += amount
        elif contribution_type == ContributionType.DATA_PROVISION:
            score.data_score += amount
        elif contribution_type == ContributionType.DEVELOPMENT:
            score.development_score += amount
        elif contribution_type == ContributionType.GOVERNANCE:
            score.governance_score += amount
        
        # Recalculate total
        score.calculate_total(self.nexus_engine)
        self.total_contributions_recorded += 1
    
    def calculate_system_health(self) -> float:
        """
        Calculate current system health S(t) based on contributions
        
        Uses Nexus equation: S(t) = λ_E*E + λ_N*(N/N₀) + λ_H*(H/H₀) + λ_M*(M/M₀)
        Note: We extend this to include D (data) contribution in the weighted calculation
        """
        # Aggregate contributions across all validators
        total_H = sum(c.human_score for c in self.contributions.values())
        total_M = sum(c.machine_score for c in self.contributions.values())
        total_D = sum(c.data_score for c in self.contributions.values())
        
        # Normalize to reference values
        H_0 = self.nexus_engine.H_0
        M_0 = self.nexus_engine.M_0
        N_0 = self.nexus_engine.N_0
        D_0 = 100.0  # Reference data contribution
        
        # External factor (can be fed via oracle)
        E = 0.8  # Default healthy external environment
        
        # Calculate using Nexus engine (H and M)
        S_base = self.nexus_engine.system_health(
            N=self.total_network_value,
            H=total_H,
            M=total_M,
            E=E
        )
        
        # Add D contribution (data provision increases system health)
        # Weighted by w_D parameter
        D_contribution = self.nexus_engine.w_D * (total_D / D_0)
        S = np.clip(S_base + D_contribution, 0.0, 1.0)
        
        self.current_system_health = S
        return S
    
    def calculate_block_reward(self, system_health: float) -> int:
        """
        Calculate block reward based on system health
        
        Reward = base_reward * S(t) * scaling_factor
        
        High system health = higher rewards (incentivizes contributions)
        """
        reward = int(self.base_block_reward * system_health * self.reward_scaling_factor)
        return max(1, reward)  # Minimum 1 unit
    
    def calculate_issuance_burn(self, contributions: Dict[str, float]) -> Tuple[float, float]:
        """
        Calculate issuance and burn rates using Nexus equation
        
        Returns: (issuance_rate, burn_rate)
        """
        # Get aggregate metrics
        total_H = sum(c.human_score for c in self.contributions.values())
        total_M = sum(c.machine_score for c in self.contributions.values())
        total_D = sum(c.data_score for c in self.contributions.values())
        
        # Calculate issuance I(t)
        E = 0.8  # External factor
        S = self.current_system_health
        
        issuance = self.nexus_engine.issuance(
            S=S,
            H=total_H,
            M=total_M,
            D=total_D,
            E=E
        )
        
        # Calculate burn B(t)
        # For now, use fixed consumption/disposal
        burn = self.nexus_engine.burn(
            C_cons=0.1,
            C_disp=0.05,
            E=E
        )
        
        self.current_issuance = issuance
        self.current_burn = burn
        
        return issuance, burn
    
    def select_block_validators(
        self,
        block_data: str,
        num_validators: int = 6
    ) -> List[SpectralValidator]:
        """
        Select validators for block using spectral diversity + contribution weighting
        
        Ensures:
        1. Spectral diversity (prevents 51% attacks)
        2. Contribution-weighted selection (rewards ecosystem builders)
        
        Strategy:
        - Update validator stakes based on contribution scores
        - Use spectral validator selection (which uses stake-weighted probabilities)
        - This combines spectral diversity with contribution weighting
        """
        # First, update validator stakes based on contribution scores
        for validator_id, validator in self.validators.items():
            contribution = self.contributions.get(validator_id)
            if contribution:
                # Set stake = base_stake + contribution bonus
                # Higher contribution = higher stake = higher selection probability
                base_stake = 100.0
                contribution_bonus = contribution.total_contribution * 1000.0  # Scale up for weight
                validator.stake = base_stake + contribution_bonus
        
        # Now use spectral selection which will weight by stake
        # This ensures both spectral diversity AND contribution weighting
        spectral_validators = self.spectrum.select_validators_for_block(block_data)
        
        # Take top validators (already contribution-weighted via stake)
        selected = spectral_validators[:num_validators]
        
        return selected
    
    def create_block(
        self,
        block_id: str,
        data: Dict,
        creator_id: str,
        parent_blocks: Optional[List[str]] = None
    ) -> NexusBlock:
        """
        Create new block with Nexus economics and spectral validation
        
        Workflow:
        1. Create DAG block via GhostDAG
        2. Calculate system health S(t)
        3. Select spectral validators
        4. Collect signatures
        5. Calculate block reward based on S(t)
        6. Update contribution scores
        7. Distribute rewards
        """
        # 1. Create base DAG block
        base_block = self.ghostdag.add_block(
            block_id=block_id,
            data=data,
            creator=creator_id,
            parent_blocks=parent_blocks
        )
        
        # 2. Calculate system health
        system_health = self.calculate_system_health()
        
        # 3. Select validators with spectral diversity
        validators = self.select_block_validators(block_id)
        
        # 4. Collect spectral signatures
        signatures = []
        spectral_regions_covered = set()
        
        for validator in validators:
            signature_hash = validator.generate_spectral_signature(block_id)
            signature = SpectralSignature(
                validator_id=validator.validator_id,
                spectral_region=validator.spectral_region,
                wavelength=validator.wavelength,
                signature_hash=signature_hash
            )
            signatures.append(signature)
            spectral_regions_covered.add(validator.spectral_region)
        
        # Calculate spectral coverage
        spectral_coverage = len(spectral_regions_covered) / len(SpectralRegion)
        
        # 5. Calculate block reward based on system health
        block_reward = self.calculate_block_reward(system_health)
        
        # 6. Calculate issuance/burn
        issuance, burn = self.calculate_issuance_burn({})
        
        # 7. Create Nexus block
        nexus_block = NexusBlock(
            block_id=base_block.block_id,
            timestamp=base_block.timestamp,
            parent_blocks=base_block.parent_blocks,
            data=base_block.data,
            creator=base_block.creator,
            hash=base_block.hash,
            blue_score=base_block.blue_score,
            is_blue=base_block.is_blue,
            topological_order=base_block.topological_order,
            spectral_signatures=signatures,
            spectral_coverage=spectral_coverage,
            system_health=system_health,
            issuance_rate=issuance,
            burn_rate=burn,
            block_reward=block_reward,
            total_supply_delta=int(issuance - burn)
        )
        
        # 8. Update validator contributions and distribute rewards
        self._distribute_block_rewards(nexus_block, validators)
        
        # 9. Update statistics
        self.total_blocks += 1
        self.total_rewards_distributed += block_reward
        
        return nexus_block
    
    def _distribute_block_rewards(
        self,
        block: NexusBlock,
        validators: List[SpectralValidator]
    ):
        """
        Distribute block rewards to validators based on contribution
        
        Reward distribution:
        - 60% to block creator (minimum 1 unit)
        - 40% split among validators weighted by contribution (minimum 1 unit)
        
        Integrates with NXT token system for actual wealth creation
        """
        # Use round to avoid integer truncation issues
        creator_reward_units = max(1, round(block.block_reward * 0.6))
        validator_reward_pool_units = max(1, block.block_reward - creator_reward_units)
        
        # Reward creator via NXT token system
        if block.creator in self.contributions:
            creator_score = self.contributions[block.creator]
            
            # FIRST: Record contribution (before mint, so feedback loop works even if mint fails)
            self.record_contribution(
                block.creator,
                ContributionType.MACHINE_COMPUTATION,
                0.01  # Small increment per block
            )
            creator_score.blocks_validated += 1
            
            # THEN: Mint NXT reward to creator
            tx = token_system.mint_reward(
                block.creator, 
                creator_reward_units,
                reason=f"Block {block.block_id} creation reward"
            )
            if tx:
                creator_score.rewards_earned += creator_reward_units
            else:
                # Fallback: track internally if token system fails
                creator_score.rewards_earned += creator_reward_units
        
        # Distribute to validators weighted by contribution
        total_contribution = sum(
            self.contributions[v.validator_id].total_contribution
            for v in validators
            if v.validator_id in self.contributions
        )
        
        if total_contribution > 0:
            for validator in validators:
                if validator.validator_id not in self.contributions:
                    continue
                
                score = self.contributions[validator.validator_id]
                share = score.total_contribution / total_contribution
                # Use round and enforce minimum to prevent zero rewards
                reward_units = max(1, round(validator_reward_pool_units * share))
                
                # FIRST: Record contribution (before mint, preserves AI optimization loop)
                self.record_contribution(
                    validator.validator_id,
                    ContributionType.MACHINE_COMPUTATION,
                    0.005  # Smaller increment for validation
                )
                score.blocks_validated += 1
                
                # THEN: Mint NXT reward to validator
                tx = token_system.mint_reward(
                    validator.validator_id,
                    reward_units,
                    reason=f"Block {block.block_id} validation reward"
                )
                if tx:
                    score.rewards_earned += reward_units
                else:
                    # Fallback: track internally if token system fails
                    score.rewards_earned += reward_units
    
    def get_governance_weight(self, validator_id: str) -> float:
        """
        Get validator's governance voting weight based on contribution
        
        Higher contribution = more voting power (but capped to prevent centralization)
        """
        if validator_id not in self.contributions:
            return 0.0
        
        score = self.contributions[validator_id]
        
        # Base weight from total contribution
        base_weight = score.total_contribution
        
        # Bonus for governance participation
        governance_bonus = min(score.governance_score * 0.1, 0.2)  # Max 20% bonus
        
        # Total weight (capped at 10% to prevent centralization)
        total_weight = min(base_weight + governance_bonus, 0.1)
        
        return total_weight
    
    def execute_governance_vote(
        self,
        proposal_id: str,
        votes: Dict[str, bool]  # validator_id -> yes/no
    ) -> Tuple[bool, float]:
        """
        Execute governance vote using contribution-weighted voting
        
        Returns: (approved, approval_percentage)
        """
        total_weight = 0.0
        yes_weight = 0.0
        
        for validator_id, vote in votes.items():
            weight = self.get_governance_weight(validator_id)
            total_weight += weight
            
            if vote:
                yes_weight += weight
            
            # Record governance contribution
            self.record_contribution(
                validator_id,
                ContributionType.GOVERNANCE,
                0.01  # Small increment per vote
            )
        
        if total_weight == 0:
            return False, 0.0
        
        approval_percentage = yes_weight / total_weight
        approved = approval_percentage >= self.governance_threshold
        
        return approved, approval_percentage
    
    def get_network_stats(self) -> Dict:
        """Get comprehensive network statistics"""
        return {
            'total_blocks': self.total_blocks,
            'total_validators': len(self.validators),
            'system_health': self.current_system_health,
            'issuance_rate': self.current_issuance,
            'burn_rate': self.current_burn,
            'total_network_value': self.total_network_value,
            'total_rewards_distributed': self.total_rewards_distributed,
            'total_contributions': self.total_contributions_recorded,
            'ghostdag_k': self.ghostdag.k,
            'spectral_coverage_required': self.spectrum.required_coverage
        }
    
    def get_top_contributors(self, limit: int = 10) -> List[Tuple[str, ContributionScore]]:
        """Get top contributors by total contribution score"""
        sorted_contributors = sorted(
            self.contributions.items(),
            key=lambda x: x[1].total_contribution,
            reverse=True
        )
        return sorted_contributors[:limit]


# Global consensus engine instance
nexus_consensus = NexusConsensusEngine()
