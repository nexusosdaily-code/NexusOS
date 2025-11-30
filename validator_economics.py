"""
Validator Economics Module with Full Substrate Compliance
===========================================================

Staking, delegation, reward distribution, slashing, and reputation system for validators.

Physics-Based Spectral Weighting:
- Validators are assigned spectral regions based on their total stake
- Higher stake = higher frequency = higher energy = larger reward multiplier
- E=hf (Planck's equation): more "massive" validators operate at higher energy levels
- Λ=hf/c² (Lambda Boson): reward mass-equivalence tracking

Substrate Integration:
- Orbital burns → TransitionReserveLedger
- BHLS GOVERNANCE allocation integration
- SDK fee routing (0.5%) to founder wallet
"""

import time
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import random

from physics_economics_adapter import (
    get_physics_adapter,
    EconomicModule,
    SubstrateTransaction
)

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 2.99792458e8

# Spectral regions for validator reward multipliers
# Higher frequency = higher energy = higher reward multiplier
# This creates physics-aligned incentives: larger validators contribute more security, earn more rewards
VALIDATOR_SPECTRAL_TIERS = {
    'GAMMA':      {'frequency_hz': 3e19,  'multiplier': 1.50, 'min_stake': 50_000},   # 50%+ bonus for top validators
    'X_RAY':      {'frequency_hz': 3e17,  'multiplier': 1.30, 'min_stake': 20_000},   # 30% bonus
    'ULTRAVIOLET':{'frequency_hz': 1e16,  'multiplier': 1.20, 'min_stake': 10_000},   # 20% bonus
    'VISIBLE':    {'frequency_hz': 5e14,  'multiplier': 1.10, 'min_stake': 5_000},    # 10% bonus
    'INFRARED':   {'frequency_hz': 3e13,  'multiplier': 1.05, 'min_stake': 2_000},    # 5% bonus
    'MICROWAVE':  {'frequency_hz': 3e10,  'multiplier': 1.00, 'min_stake': 0},        # Base rewards
}


def assign_validator_spectral_region(total_stake: float) -> str:
    """
    Assign spectral region to a validator based on total stake.
    
    Physics Rationale:
    - Stake represents "mass" in economic terms
    - More massive validators operate at higher energy levels (E=hf)
    - This mirrors how larger atoms have higher energy electron transitions
    
    Returns: spectral region name
    """
    if total_stake >= 50_000:
        return 'GAMMA'
    elif total_stake >= 20_000:
        return 'X_RAY'
    elif total_stake >= 10_000:
        return 'ULTRAVIOLET'
    elif total_stake >= 5_000:
        return 'VISIBLE'
    elif total_stake >= 2_000:
        return 'INFRARED'
    else:
        return 'MICROWAVE'


def calculate_spectral_reward(base_reward: float, spectral_region: str) -> Tuple[float, float, dict]:
    """
    Calculate physics-based reward using spectral region multiplier.
    
    Args:
        base_reward: The base block reward in NXT
        spectral_region: The validator's assigned spectral region
        
    Returns:
        (final_reward, energy_joules, breakdown_dict)
    """
    tier = VALIDATOR_SPECTRAL_TIERS.get(spectral_region.upper(), VALIDATOR_SPECTRAL_TIERS['MICROWAVE'])
    
    # Calculate quantum energy: E = hf
    energy_joules = PLANCK_CONSTANT * tier['frequency_hz']
    
    # Apply spectral multiplier
    final_reward = base_reward * tier['multiplier']
    
    breakdown = {
        'spectral_region': spectral_region.upper(),
        'frequency_hz': tier['frequency_hz'],
        'energy_joules': energy_joules,
        'base_reward': base_reward,
        'multiplier': tier['multiplier'],
        'final_reward': final_reward,
        'physics_formula': f"E = h × f = {PLANCK_CONSTANT:.2e} × {tier['frequency_hz']:.2e} = {energy_joules:.2e} J"
    }
    
    return final_reward, energy_joules, breakdown


class SlashingType(Enum):
    """Types of slashable offenses"""
    DOWNTIME = "Extended Downtime"
    DOUBLE_SIGN = "Double Signing"
    MALICIOUS_BLOCK = "Malicious Block Proposal"
    BYZANTINE_BEHAVIOR = "Byzantine Behavior"
    NETWORK_ATTACK = "Network Attack Participation"


class DelegationStatus(Enum):
    """Status of a delegation"""
    ACTIVE = "active"
    UNBONDING = "unbonding"
    WITHDRAWN = "withdrawn"


@dataclass
class Delegation:
    """Delegator stake to a validator"""
    delegator_address: str
    validator_address: str
    amount: float
    status: DelegationStatus = DelegationStatus.ACTIVE
    delegated_at: float = field(default_factory=time.time)
    unbonding_started: Optional[float] = None
    unbonding_period: float = 604800.0  # 7 days in seconds
    
    # Rewards tracking
    accumulated_rewards: float = 0.0
    last_reward_claim: float = field(default_factory=time.time)
    total_rewards_claimed: float = 0.0
    
    def start_unbonding(self):
        """Start unbonding period"""
        self.status = DelegationStatus.UNBONDING
        self.unbonding_started = time.time()
    
    def can_withdraw(self) -> bool:
        """Check if unbonding period completed"""
        if self.status != DelegationStatus.UNBONDING or self.unbonding_started is None:
            return False
        return (time.time() - self.unbonding_started) >= self.unbonding_period
    
    def claim_rewards(self) -> float:
        """Claim accumulated rewards"""
        rewards = self.accumulated_rewards
        self.total_rewards_claimed += rewards
        self.accumulated_rewards = 0.0
        self.last_reward_claim = time.time()
        return rewards


@dataclass
class ValidatorEconomics:
    """
    Extended validator with economic metrics and physics-based spectral rewards.
    
    Physics Integration:
    - Each validator is assigned a spectral region based on total stake
    - Higher stake = higher frequency = higher energy (E=hf)
    - Spectral region determines reward multiplier (1.0x to 1.5x)
    """
    address: str
    stake: float  # Self-bonded stake
    commission_rate: float = 0.10  # 10% commission
    
    # Delegation tracking
    total_delegated: float = 0.0
    delegations: List[Delegation] = field(default_factory=list)
    
    # Performance metrics
    blocks_proposed: int = 0
    blocks_validated: int = 0
    uptime_percentage: float = 100.0
    reputation_score: float = 100.0
    
    # Physics-based spectral economics
    spectral_region: str = 'MICROWAVE'  # Default to lowest tier
    total_energy_processed: float = 0.0  # Cumulative E=hf energy in Joules
    
    # Rewards
    total_rewards_earned: float = 0.0
    total_commission_earned: float = 0.0
    pending_rewards: float = 0.0
    
    # Slashing history
    slashing_events: List[dict] = field(default_factory=list)
    total_slashed: float = 0.0
    is_jailed: bool = False
    jail_until: Optional[float] = None
    
    # Timestamps
    activated_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
    
    def __post_init__(self):
        """Initialize spectral region based on initial stake"""
        self.spectral_region = assign_validator_spectral_region(self.get_total_stake())
    
    def get_total_stake(self) -> float:
        """Get total stake (self + delegated)"""
        return self.stake + self.total_delegated
    
    def get_voting_power(self, total_network_stake: float) -> float:
        """Calculate voting power as percentage of network"""
        if total_network_stake == 0:
            return 0.0
        return (self.get_total_stake() / total_network_stake) * 100
    
    def add_delegation(self, delegation: Delegation):
        """Add new delegation and update spectral region"""
        self.delegations.append(delegation)
        self.total_delegated += delegation.amount
        # Update spectral region after stake change
        self.update_spectral_region()
    
    def remove_delegation(self, delegation: Delegation):
        """Remove delegation after unbonding and update spectral region"""
        if delegation in self.delegations:
            self.delegations.remove(delegation)
            self.total_delegated -= delegation.amount
            # Update spectral region after stake change
            self.update_spectral_region()
    
    def update_spectral_region(self):
        """
        Update spectral region based on current total stake.
        Called after stake changes to ensure reward alignment.
        """
        self.spectral_region = assign_validator_spectral_region(self.get_total_stake())
    
    def get_spectral_multiplier(self) -> float:
        """Get the current spectral reward multiplier"""
        tier = VALIDATOR_SPECTRAL_TIERS.get(self.spectral_region.upper(), VALIDATOR_SPECTRAL_TIERS['MICROWAVE'])
        return tier['multiplier']
    
    def distribute_rewards(self, block_reward: float):
        """
        Distribute block rewards to validator and delegators with spectral weighting.
        
        Physics-Based Reward Calculation:
        1. Update spectral region based on current stake
        2. Apply spectral multiplier to base reward (E=hf principle)
        3. Track energy processed for this block
        4. Distribute according to stake proportions
        """
        # Update spectral region based on current stake
        self.update_spectral_region()
        
        # Apply physics-based spectral multiplier
        spectral_reward, energy_joules, _ = calculate_spectral_reward(block_reward, self.spectral_region)
        self.total_energy_processed += energy_joules
        
        # Validator commission (from spectral-adjusted reward)
        commission = spectral_reward * self.commission_rate
        self.total_commission_earned += commission
        self.total_rewards_earned += commission
        
        # Remaining rewards distributed proportionally
        remaining_rewards = spectral_reward - commission
        total_stake = self.get_total_stake()
        
        if total_stake > 0:
            # Validator's share based on self-bonded stake
            validator_share = (self.stake / total_stake) * remaining_rewards
            self.total_rewards_earned += validator_share
            self.pending_rewards += validator_share
            
            # Delegators' shares
            for delegation in self.delegations:
                if delegation.status == DelegationStatus.ACTIVE:
                    delegator_share = (delegation.amount / total_stake) * remaining_rewards
                    delegation.accumulated_rewards += delegator_share
    
    def slash(self, slash_type: SlashingType, slash_percentage: float, reason: str = ""):
        """Apply slashing penalty"""
        total_stake = self.get_total_stake()
        slash_amount = total_stake * (slash_percentage / 100)
        original_slash = slash_amount
        
        # Slash validator's stake first
        if self.stake >= slash_amount:
            self.stake -= slash_amount
            slash_amount = 0  # All slashing absorbed by validator stake
        else:
            slash_amount -= self.stake
            self.stake = 0
            
            # Slash delegated stake proportionally
            total_delegated_slashed = 0.0
            if self.total_delegated > 0:
                for delegation in self.delegations:
                    if delegation.status == DelegationStatus.ACTIVE:
                        delegation_slash = (delegation.amount / self.total_delegated) * slash_amount
                        delegation.amount = max(0, delegation.amount - delegation_slash)  # Clamp to 0
                        total_delegated_slashed += delegation_slash
                
                # Update total_delegated to reflect slashing
                self.total_delegated = max(0, self.total_delegated - total_delegated_slashed)
        
        # Record slashing event
        self.slashing_events.append({
            'type': slash_type.value,
            'percentage': slash_percentage,
            'amount': original_slash,
            'reason': reason,
            'timestamp': time.time()
        })
        
        self.total_slashed += original_slash
        
        # Impact reputation
        self.reputation_score = max(0, self.reputation_score - (slash_percentage * 2))
        
        # Update spectral region after stake reduction
        self.update_spectral_region()
    
    def jail(self, duration_seconds: float = 86400.0):
        """Jail validator temporarily (default 24 hours)"""
        self.is_jailed = True
        self.jail_until = time.time() + duration_seconds
    
    def unjail(self):
        """Release validator from jail if period expired"""
        if self.is_jailed and self.jail_until and time.time() >= self.jail_until:
            self.is_jailed = False
            self.jail_until = None
            return True
        return False
    
    def update_reputation(self, uptime_percentage: float, blocks_proposed: int):
        """Update reputation score based on performance"""
        self.uptime_percentage = uptime_percentage
        self.blocks_proposed = blocks_proposed
        
        # Reputation factors
        uptime_score = uptime_percentage  # 0-100
        performance_score = min(100, blocks_proposed * 2)  # More blocks = better score
        slashing_penalty = len(self.slashing_events) * 10  # Each slash reduces score
        
        # Weighted reputation
        self.reputation_score = max(0, min(100, 
            (uptime_score * 0.5) + 
            (performance_score * 0.3) - 
            slashing_penalty +
            20  # Base score
        ))
    
    def to_dict(self) -> dict:
        """Convert to dictionary with physics-based spectral information"""
        tier = VALIDATOR_SPECTRAL_TIERS.get(self.spectral_region.upper(), VALIDATOR_SPECTRAL_TIERS['MICROWAVE'])
        return {
            'address': self.address[:10] + "...",
            'self_stake': self.stake,
            'total_delegated': self.total_delegated,
            'total_stake': self.get_total_stake(),
            'commission_rate': f"{self.commission_rate * 100:.1f}%",
            'delegators': len(self.delegations),
            'blocks_proposed': self.blocks_proposed,
            'uptime': f"{self.uptime_percentage:.1f}%",
            'reputation': f"{self.reputation_score:.1f}",
            'total_rewards': self.total_rewards_earned,
            'is_jailed': self.is_jailed,
            'slashing_events': len(self.slashing_events),
            # Physics-based spectral information
            'spectral_region': self.spectral_region,
            'spectral_multiplier': f"{tier['multiplier']:.2f}x",
            'spectral_frequency_hz': tier['frequency_hz'],
            'total_energy_processed_j': self.total_energy_processed
        }


class StakingEconomy:
    """
    Blockchain staking economy manager with full substrate compliance.
    
    Physics Economics Integration:
    - Orbital burns for staking/delegation actions
    - BHLS GOVERNANCE allocation integration
    - SDK fee routing (0.5%) to founder wallet
    - Lambda Boson mass tracking
    """
    
    TOTAL_SUPPLY = 1_000_000
    MIN_VALIDATOR_STAKE = 1_000
    MAX_VALIDATOR_STAKE = 10_000
    MIN_DELEGATION = 10
    MAX_DELEGATION_PER_VALIDATOR = 50_000
    
    def __init__(self, block_reward: float = 2.0, inflation_rate: float = 0.05):
        """
        Initialize staking economy with physics economics integration.
        
        Args:
            block_reward: Reward per block
            inflation_rate: Annual inflation rate (5% default)
        """
        self.block_reward = block_reward
        self.inflation_rate = inflation_rate
        
        self.validators: Dict[str, ValidatorEconomics] = {}
        self.delegations: Dict[str, List[Delegation]] = {}
        
        self.total_staked = 0.0
        self.total_rewards_distributed = 0.0
        self.total_slashed = 0.0
        self.current_apy = 0.0
        
        self._physics_adapter = get_physics_adapter()
        self.substrate_transactions: List[SubstrateTransaction] = []
        self.total_energy_joules = 0.0
        self.total_lambda_mass_kg = 0.0
        self.total_sdk_fees_nxt = 0.0
        
        self.slashing_params = {
            SlashingType.DOWNTIME: 1.0,
            SlashingType.DOUBLE_SIGN: 5.0,
            SlashingType.MALICIOUS_BLOCK: 10.0,
            SlashingType.BYZANTINE_BEHAVIOR: 20.0,
            SlashingType.NETWORK_ATTACK: 100.0,
        }
    
    def register_validator(self, address: str, self_stake: float, commission_rate: float = 0.10) -> Tuple[bool, str]:
        """
        Register new validator with whale protection limits
        
        Returns:
            Tuple[bool, str]: (success, message)
        """
        if address in self.validators:
            return False, "Validator already registered"
        
        # Whale Protection: Enforce staking limits
        if self_stake < self.MIN_VALIDATOR_STAKE:
            return False, f"Minimum stake is {self.MIN_VALIDATOR_STAKE:,} NXT"
        
        if self_stake > self.MAX_VALIDATOR_STAKE:
            return False, f"Maximum stake is {self.MAX_VALIDATOR_STAKE:,} NXT (1% of supply for decentralization)"
        
        validator = ValidatorEconomics(
            address=address,
            stake=self_stake,
            commission_rate=commission_rate
        )
        self.validators[address] = validator
        self.total_staked += self_stake
        
        return True, f"Validator registered with {self_stake:,} NXT stake"
    
    def delegate(self, delegator: str, validator_address: str, amount: float) -> Tuple[bool, str]:
        """Delegate stake to validator with whale protection limits"""
        if validator_address not in self.validators:
            return False, "Validator not found"
        
        if amount <= 0:
            return False, "Invalid amount"
        
        # Whale Protection: Minimum delegation
        if amount < self.MIN_DELEGATION:
            return False, f"Minimum delegation is {self.MIN_DELEGATION} NXT"
        
        validator = self.validators[validator_address]
        
        if validator.is_jailed:
            return False, "Validator is jailed"
        
        # Whale Protection: Check if validator would exceed max delegation cap
        if validator.total_delegated + amount > self.MAX_DELEGATION_PER_VALIDATOR:
            remaining = self.MAX_DELEGATION_PER_VALIDATOR - validator.total_delegated
            if remaining <= 0:
                return False, f"Validator has reached max delegation cap ({self.MAX_DELEGATION_PER_VALIDATOR:,} NXT)"
            return False, f"Validator can only accept {remaining:,} more NXT (5% supply cap)"
        
        # Create delegation
        delegation = Delegation(
            delegator_address=delegator,
            validator_address=validator_address,
            amount=amount
        )
        
        # Add to validator
        validator.add_delegation(delegation)
        
        # Track delegator's delegations
        if delegator not in self.delegations:
            self.delegations[delegator] = []
        self.delegations[delegator].append(delegation)
        
        self.total_staked += amount
        
        return True, f"Delegated {amount:,} NXT to {validator_address[:10]}..."
    
    def undelegate(self, delegator: str, validator_address: str, amount: float) -> Tuple[bool, str]:
        """Start undelegation process"""
        if delegator not in self.delegations:
            return False, "No delegations found"
        
        # Find delegation
        delegation = None
        for d in self.delegations[delegator]:
            if d.validator_address == validator_address and d.status == DelegationStatus.ACTIVE:
                if d.amount >= amount:
                    delegation = d
                    break
        
        if not delegation:
            return False, "Insufficient delegated amount"
        
        # If unbonding partial amount, create new delegation
        if delegation.amount > amount:
            delegation.amount -= amount
            new_delegation = Delegation(
                delegator_address=delegator,
                validator_address=validator_address,
                amount=amount
            )
            new_delegation.start_unbonding()
            self.delegations[delegator].append(new_delegation)
        else:
            delegation.start_unbonding()
        
        return True, f"Unbonding {amount} (7 day unbonding period)"
    
    def withdraw_delegation(self, delegator: str, validator_address: str) -> Tuple[bool, float, str]:
        """Withdraw completed unbonded stake"""
        if delegator not in self.delegations:
            return False, 0.0, "No delegations found"
        
        total_withdrawn = 0.0
        delegations_to_remove = []
        
        for delegation in self.delegations[delegator]:
            if (delegation.validator_address == validator_address and 
                delegation.status == DelegationStatus.UNBONDING and 
                delegation.can_withdraw()):
                
                total_withdrawn += delegation.amount
                delegation.status = DelegationStatus.WITHDRAWN
                delegations_to_remove.append(delegation)
                
                # Remove from validator
                validator = self.validators[validator_address]
                validator.remove_delegation(delegation)
        
        # Remove withdrawn delegations
        for delegation in delegations_to_remove:
            self.delegations[delegator].remove(delegation)
        
        if total_withdrawn > 0:
            self.total_staked -= total_withdrawn
            return True, total_withdrawn, f"Withdrawn {total_withdrawn}"
        
        return False, 0.0, "No unbonded delegations ready for withdrawal"
    
    def distribute_block_reward(self, validator_address: str) -> Optional[SubstrateTransaction]:
        """
        Distribute block reward to validator with substrate integration.
        
        Physics Flow:
        1. Calculate spectral reward with E=hf multiplier
        2. Process orbital burn for reward distribution
        3. Route SDK fee (0.5%) to founder wallet
        4. Track Lambda Boson mass
        """
        if validator_address not in self.validators:
            return None
        
        validator = self.validators[validator_address]
        validator.distribute_rewards(self.block_reward)
        validator.blocks_proposed += 1
        validator.last_active = time.time()
        
        tier = VALIDATOR_SPECTRAL_TIERS.get(validator.spectral_region, VALIDATOR_SPECTRAL_TIERS['MICROWAVE'])
        wavelength_nm = (SPEED_OF_LIGHT / tier['frequency_hz']) * 1e9
        
        reward_id = f"REWARD_{validator_address[:8]}_{int(time.time())}"
        substrate_tx = self._physics_adapter.process_orbital_burn(
            sender_address="VALIDATOR_POOL",
            amount_nxt=self.block_reward * tier['multiplier'],
            wavelength_nm=min(wavelength_nm, 700),
            module=EconomicModule.VALIDATOR,
            message_id=reward_id,
            bhls_category=None
        )
        
        self.substrate_transactions.append(substrate_tx)
        self.total_energy_joules += substrate_tx.energy_joules
        self.total_lambda_mass_kg += substrate_tx.lambda_boson_kg
        self.total_sdk_fees_nxt += substrate_tx.sdk_fee_routed
        
        self.total_rewards_distributed += self.block_reward
        
        return substrate_tx
    
    def apply_slashing(self, validator_address: str, slash_type: SlashingType, reason: str = ""):
        """Apply slashing penalty to validator"""
        if validator_address not in self.validators:
            return
        
        validator = self.validators[validator_address]
        slash_percentage = self.slashing_params.get(slash_type, 1.0)
        
        validator.slash(slash_type, slash_percentage, reason)
        self.total_slashed += validator.total_slashed
        
        # Jail for serious offenses
        if slash_type in [SlashingType.DOUBLE_SIGN, SlashingType.BYZANTINE_BEHAVIOR, SlashingType.NETWORK_ATTACK]:
            validator.jail(duration_seconds=86400.0)  # 24 hours
    
    def claim_rewards(self, delegator: str) -> Tuple[float, List[str]]:
        """Claim all accumulated rewards for delegator"""
        if delegator not in self.delegations:
            return 0.0, []
        
        total_claimed = 0.0
        claims = []
        
        for delegation in self.delegations[delegator]:
            if delegation.status == DelegationStatus.ACTIVE and delegation.accumulated_rewards > 0:
                rewards = delegation.claim_rewards()
                total_claimed += rewards
                claims.append(
                    f"{rewards:.4f} from {delegation.validator_address[:10]}..."
                )
        
        return total_claimed, claims
    
    def get_validator_rankings(self) -> List[ValidatorEconomics]:
        """Get validators ranked by total stake"""
        return sorted(
            self.validators.values(),
            key=lambda v: v.get_total_stake(),
            reverse=True
        )
    
    def calculate_apy(self) -> float:
        """Calculate current staking APY"""
        if self.total_staked == 0:
            return 0.0
        
        # Simplified APY calculation
        # Annual rewards = blocks per year * block reward
        blocks_per_year = (365 * 24 * 60 * 60) / 2.0  # Assuming 2s block time
        annual_rewards = blocks_per_year * self.block_reward
        
        self.current_apy = (annual_rewards / self.total_staked) * 100
        return self.current_apy
    
    def simulate_validator_profitability(
        self, 
        self_stake: float, 
        commission_rate: float, 
        delegated_stake: float,
        blocks_per_day: int
    ) -> dict:
        """Simulate validator profitability"""
        total_stake = self_stake + delegated_stake
        
        # Daily rewards
        daily_rewards = blocks_per_day * self.block_reward
        
        # Commission earnings
        commission_earnings = daily_rewards * commission_rate
        
        # Stake-based earnings (after commission)
        remaining_rewards = daily_rewards - commission_earnings
        stake_earnings = (self_stake / total_stake) * remaining_rewards if total_stake > 0 else 0
        
        # Total validator earnings
        total_daily_earnings = commission_earnings + stake_earnings
        
        # Annual extrapolation
        annual_earnings = total_daily_earnings * 365
        annual_roi = (annual_earnings / self_stake * 100) if self_stake > 0 else 0
        
        return {
            'daily_earnings': total_daily_earnings,
            'monthly_earnings': total_daily_earnings * 30,
            'annual_earnings': annual_earnings,
            'annual_roi': annual_roi,
            'commission_earnings_daily': commission_earnings,
            'stake_earnings_daily': stake_earnings,
            'effective_apy': self.calculate_apy()
        }
    
    def get_delegator_stats(self, delegator: str) -> dict:
        """Get comprehensive stats for a delegator"""
        if delegator not in self.delegations:
            return {
                'total_delegated': 0.0,
                'active_delegations': 0,
                'unbonding_delegations': 0,
                'pending_rewards': 0.0,
                'total_claimed': 0.0,
                'delegations': []
            }
        
        total_delegated = 0.0
        active = 0
        unbonding = 0
        pending_rewards = 0.0
        total_claimed = 0.0
        delegation_list = []
        
        for delegation in self.delegations[delegator]:
            if delegation.status == DelegationStatus.ACTIVE:
                total_delegated += delegation.amount
                active += 1
            elif delegation.status == DelegationStatus.UNBONDING:
                unbonding += 1
            
            pending_rewards += delegation.accumulated_rewards
            total_claimed += delegation.total_rewards_claimed
            
            delegation_list.append({
                'validator': delegation.validator_address[:10] + "...",
                'amount': delegation.amount,
                'status': delegation.status.value,
                'pending_rewards': delegation.accumulated_rewards,
                'total_claimed': delegation.total_rewards_claimed
            })
        
        return {
            'total_delegated': total_delegated,
            'active_delegations': active,
            'unbonding_delegations': unbonding,
            'pending_rewards': pending_rewards,
            'total_claimed': total_claimed,
            'delegations': delegation_list
        }
    
    def get_staking_limits(self) -> dict:
        """Get staking limits for UI display - Whale Protection Info"""
        return {
            'total_supply': self.TOTAL_SUPPLY,
            'min_validator_stake': self.MIN_VALIDATOR_STAKE,
            'max_validator_stake': self.MAX_VALIDATOR_STAKE,
            'min_delegation': self.MIN_DELEGATION,
            'max_delegation_per_validator': self.MAX_DELEGATION_PER_VALIDATOR,
            'min_validators_for_security': self.TOTAL_SUPPLY // self.MAX_VALIDATOR_STAKE,
            'description': (
                f"Whale Protection: Max {self.MAX_VALIDATOR_STAKE:,} NXT per validator (1% of supply). "
                f"This ensures minimum {self.TOTAL_SUPPLY // self.MAX_VALIDATOR_STAKE} validators "
                f"are needed to secure the network, preventing centralization."
            )
        }
    
    def get_physics_economics_stats(self) -> Dict[str, Any]:
        """Get physics economics statistics for validator operations"""
        return {
            "total_validators": len(self.validators),
            "total_staked_nxt": self.total_staked,
            "total_rewards_distributed_nxt": self.total_rewards_distributed,
            "total_slashed_nxt": self.total_slashed,
            "current_apy": self.current_apy,
            "physics_economics": {
                "total_energy_joules": self.total_energy_joules,
                "total_lambda_mass_kg": self.total_lambda_mass_kg,
                "total_sdk_fees_nxt": self.total_sdk_fees_nxt,
                "substrate_transactions": len(self.substrate_transactions),
                "energy_formula": "E = h × f (Planck)",
                "lambda_formula": "Λ = hf/c² (Lambda Boson)",
                "sdk_wallet": "NXS5372697543A0FEF822E453DBC26FA044D14599E9"
            }
        }
