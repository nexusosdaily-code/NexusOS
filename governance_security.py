"""
NexusOS Governance Security
Protection against governance attacks and plutocracy

Features:
- Quadratic voting to prevent vote buying
- Proposal creation burns (anti-spam)
- Vote delegation limits
- Plutocracy prevention mechanisms
"""

import hashlib
import time
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from collections import defaultdict
import math

# Active intervention integration
try:
    from active_intervention_engine import get_intervention_engine
except ImportError:
    get_intervention_engine = None


@dataclass
class Proposal:
    """Governance proposal"""
    proposal_id: str
    creator: str
    title: str
    description: str
    creation_time: float
    voting_deadline: float
    required_burn: float  # NXT burned to create proposal
    status: str  # "active", "passed", "rejected", "cancelled"
    
    # Voting results
    votes_for: float = 0.0
    votes_against: float = 0.0
    unique_voters: int = 0


@dataclass
class Vote:
    """Individual vote record"""
    voter: str
    proposal_id: str
    voting_power_raw: float  # Raw NXT staked
    voting_power_quadratic: float  # Quadratic voting power
    direction: str  # "for" or "against"
    timestamp: float


class QuadraticVotingSystem:
    """
    Quadratic voting to prevent plutocracy
    
    Voting power = sqrt(NXT staked)
    
    This reduces the influence of wealthy voters while maintaining
    stake-weighted governance. A voter with 100x the stake only gets
    10x the voting power.
    """
    
    def __init__(self):
        # Proposals
        self.proposals: Dict[str, Proposal] = {}
        
        # Votes (proposal_id -> list of votes)
        self.votes: Dict[str, List[Vote]] = defaultdict(list)
        
        # Voter participation (address -> set of proposal_ids)
        self.voter_history: Dict[str, Set[str]] = defaultdict(set)
        
        # Proposal creation burn requirement (derived from BHLS economics)
        # Equal to ~10% of monthly connectivity allocation (75 NXT × 10% ≈ 7.5 NXT, rounded up)
        # This ensures proposals have meaningful economic commitment without excluding participation
        # Connectivity is the lowest BHLS tier, making proposals accessible while preventing spam
        self.proposal_burn_amount = 7.5  # ~10% of BHLS connectivity tier (anti-spam, economically derived)
        
        # Voting power caps
        self.max_voting_power_percentage = 0.1  # No single voter can have >10% of total votes
        
        # Delegation tracking
        self.delegations: Dict[str, str] = {}  # delegator -> delegate
        self.delegation_limits = 5  # Max 5 delegators per delegate
    
    def calculate_quadratic_power(self, stake: float) -> float:
        """
        Calculate quadratic voting power
        
        Power = sqrt(stake)
        """
        if stake <= 0:
            return 0.0
        
        return math.sqrt(stake)
    
    def create_proposal(
        self,
        creator: str,
        title: str,
        description: str,
        burn_amount: float,
        voting_period_hours: int = 72
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Create governance proposal with burn requirement
        
        Returns:
            (success: bool, proposal_id: Optional[str], error: Optional[str])
        """
        # Verify burn amount
        if burn_amount < self.proposal_burn_amount:
            return False, None, f"Must burn {self.proposal_burn_amount} NXT to create proposal (provided {burn_amount})"
        
        # Create proposal
        proposal_id = hashlib.sha256(
            f"{creator}:{title}:{time.time()}".encode()
        ).hexdigest()[:16]
        
        current_time = time.time()
        voting_deadline = current_time + (voting_period_hours * 3600)
        
        proposal = Proposal(
            proposal_id=proposal_id,
            creator=creator,
            title=title,
            description=description,
            creation_time=current_time,
            voting_deadline=voting_deadline,
            required_burn=burn_amount,
            status="active"
        )
        
        self.proposals[proposal_id] = proposal
        
        return True, proposal_id, None
    
    def cast_vote(
        self,
        voter: str,
        proposal_id: str,
        stake: float,
        direction: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Cast quadratic vote
        
        Returns:
            (success: bool, error: Optional[str])
        """
        # Validate proposal exists
        if proposal_id not in self.proposals:
            return False, "Proposal not found"
        
        proposal = self.proposals[proposal_id]
        
        # Check voting deadline
        if time.time() > proposal.voting_deadline:
            return False, "Voting period has ended"
        
        # Check if already voted
        if proposal_id in self.voter_history[voter]:
            return False, "Already voted on this proposal"
        
        # Validate direction
        if direction not in ["for", "against"]:
            return False, "Vote direction must be 'for' or 'against'"
        
        # Calculate quadratic voting power
        voting_power = self.calculate_quadratic_power(stake)
        
        # Apply voting power cap
        total_votes_so_far = proposal.votes_for + proposal.votes_against
        
        if total_votes_so_far > 0:
            max_allowed_power = total_votes_so_far * self.max_voting_power_percentage
            
            if voting_power > max_allowed_power:
                voting_power = max_allowed_power
        
        # 🛡️ ACTIVE INTERVENTION: Detect vote concentration spikes
        if get_intervention_engine:
            # Check recent vote concentration (last 60 seconds)
            recent_votes = [v for v in self.votes[proposal_id] if time.time() - v.timestamp < 60]
            if recent_votes:
                recent_power = sum(v.voting_power_quadratic for v in recent_votes)
                total_power = proposal.votes_for + proposal.votes_against + voting_power
                
                if total_power > 0:
                    vote_concentration = recent_power / total_power
                    
                    # Check if concentration threshold reached (>40% = HIGH threat)
                    if vote_concentration > 0.20:  # Monitor at >20%
                        intervention_engine = get_intervention_engine()
                        intervention_engine.detect_and_intervene(
                            threat_type="sudden_vote_concentration",
                            entity=f"proposal_{proposal_id}",
                            metric_value=vote_concentration,
                            evidence=f"{len(recent_votes)} votes in 60s ({vote_concentration*100:.1f}% of total power)"
                        )
        
        # Record vote
        vote = Vote(
            voter=voter,
            proposal_id=proposal_id,
            voting_power_raw=stake,
            voting_power_quadratic=voting_power,
            direction=direction,
            timestamp=time.time()
        )
        
        self.votes[proposal_id].append(vote)
        self.voter_history[voter].add(proposal_id)
        
        # Update proposal totals
        if direction == "for":
            proposal.votes_for += voting_power
        else:
            proposal.votes_against += voting_power
        
        proposal.unique_voters += 1
        
        return True, None
    
    def delegate_voting_power(
        self,
        delegator: str,
        delegate: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Delegate voting power to another address
        
        Returns:
            (success: bool, error: Optional[str])
        """
        # Check delegation limit
        current_delegators = sum(
            1 for del_addr, deleg in self.delegations.items()
            if deleg == delegate
        )
        
        if current_delegators >= self.delegation_limits:
            return False, f"Delegate has reached maximum delegators ({self.delegation_limits})"
        
        # Prevent circular delegation
        if delegate in self.delegations and self.delegations[delegate] == delegator:
            return False, "Circular delegation not allowed"
        
        # Record delegation
        self.delegations[delegator] = delegate
        
        return True, None
    
    def finalize_proposal(self, proposal_id: str) -> Tuple[bool, str, Optional[str]]:
        """
        Finalize proposal after voting period
        
        Returns:
            (success: bool, result: str, error: Optional[str])
        """
        if proposal_id not in self.proposals:
            return False, "", "Proposal not found"
        
        proposal = self.proposals[proposal_id]
        
        # Check if voting period ended
        if time.time() < proposal.voting_deadline:
            return False, "", "Voting period still active"
        
        # Determine result
        if proposal.votes_for > proposal.votes_against:
            proposal.status = "passed"
            result = "passed"
        else:
            proposal.status = "rejected"
            result = "rejected"
        
        return True, result, None
    
    def get_proposal_stats(self, proposal_id: str) -> Optional[Dict]:
        """Get detailed proposal statistics"""
        if proposal_id not in self.proposals:
            return None
        
        proposal = self.proposals[proposal_id]
        votes = self.votes.get(proposal_id, [])
        
        # Calculate participation metrics
        total_voting_power = proposal.votes_for + proposal.votes_against
        
        # Gini coefficient for vote concentration
        if votes:
            powers = sorted([v.voting_power_quadratic for v in votes])
            n = len(powers)
            index_sum = sum((i + 1) * power for i, power in enumerate(powers))
            
            if total_voting_power > 0:
                gini = (2 * index_sum) / (n * total_voting_power) - (n + 1) / n
            else:
                gini = 0.0
        else:
            gini = 0.0
        
        return {
            "proposal_id": proposal_id,
            "title": proposal.title,
            "status": proposal.status,
            "votes_for": proposal.votes_for,
            "votes_against": proposal.votes_against,
            "total_voters": proposal.unique_voters,
            "vote_concentration_gini": gini,
            "time_remaining": max(0, proposal.voting_deadline - time.time()),
            "burn_required": proposal.required_burn
        }


class ValidatorCollisionDetection:
    """
    Detect validator collusion and coordinated attacks
    
    Monitors:
    - Coordinated voting patterns
    - Synchronized stake changes
    - Reward sharing networks
    """
    
    def __init__(self):
        # Validator voting history (validator -> list of (proposal_id, direction))
        self.voting_patterns: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
        
        # Stake change tracking (validator -> list of (timestamp, stake_change))
        self.stake_changes: Dict[str, List[Tuple[float, float]]] = defaultdict(list)
        
        # Collusion threshold
        self.voting_correlation_threshold = 0.85  # 85% vote agreement = suspicious
        
        # Time window for synchronized activity
        self.sync_window = 300  # 5 minutes
    
    def record_vote(self, validator: str, proposal_id: str, direction: str):
        """Record validator vote for pattern analysis"""
        self.voting_patterns[validator].append((proposal_id, direction))
    
    def record_stake_change(self, validator: str, stake_change: float):
        """Record stake change for synchronization detection"""
        self.stake_changes[validator].append((time.time(), stake_change))
    
    def detect_voting_collusion(
        self,
        validator1: str,
        validator2: str
    ) -> Tuple[bool, float]:
        """
        Detect if two validators vote together suspiciously often
        
        Returns:
            (is_collusion: bool, correlation: float)
        """
        # Get common proposals
        votes1 = {pid: direction for pid, direction in self.voting_patterns[validator1]}
        votes2 = {pid: direction for pid, direction in self.voting_patterns[validator2]}
        
        common_proposals = set(votes1.keys()) & set(votes2.keys())
        
        if len(common_proposals) < 5:
            return False, 0.0  # Need at least 5 common votes
        
        # Calculate agreement rate
        agreements = sum(
            1 for pid in common_proposals
            if votes1[pid] == votes2[pid]
        )
        
        correlation = agreements / len(common_proposals)
        
        is_collusion = correlation >= self.voting_correlation_threshold
        
        return is_collusion, correlation
    
    def detect_synchronized_staking(
        self,
        validators: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """
        Detect if validators coordinate stake changes
        
        Returns:
            (is_synchronized: bool, evidence: Optional[str])
        """
        current_time = time.time()
        
        # Get recent stake changes within sync window
        recent_changes = {}
        
        for validator in validators:
            changes_in_window = [
                (t, amount) for t, amount in self.stake_changes[validator]
                if current_time - t < self.sync_window
            ]
            
            if changes_in_window:
                recent_changes[validator] = changes_in_window
        
        # Check if multiple validators changed stake at similar time
        if len(recent_changes) >= 3:
            # Get timestamps
            timestamps = [
                t for validator_changes in recent_changes.values()
                for t, _ in validator_changes
            ]
            
            if timestamps:
                # Check time clustering
                timestamps.sort()
                max_gap = max(
                    timestamps[i+1] - timestamps[i]
                    for i in range(len(timestamps) - 1)
                ) if len(timestamps) > 1 else 0
                
                if max_gap < 60:  # All within 60 seconds
                    evidence = f"{len(recent_changes)} validators changed stake within 60s"
                    return True, evidence
        
        return False, None


# Singleton instance
_quadratic_voting = None
_collusion_detector = None

def get_quadratic_voting() -> QuadraticVotingSystem:
    """Get singleton quadratic voting system"""
    global _quadratic_voting
    if _quadratic_voting is None:
        _quadratic_voting = QuadraticVotingSystem()
    return _quadratic_voting

def get_collusion_detector() -> ValidatorCollisionDetection:
    """Get singleton collusion detector"""
    global _collusion_detector
    if _collusion_detector is None:
        _collusion_detector = ValidatorCollisionDetection()
    return _collusion_detector
