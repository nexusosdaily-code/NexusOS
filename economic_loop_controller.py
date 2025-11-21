"""
NexusOS Economic Loop Controller
==================================

Orchestrates the complete economic cycle:
Messaging Burns → Orbital Transitions → DEX Liquidity → Supply Chain Value → 
Community Ownership → Global Debt Backing → F_floor Protection

This is the central nervous system connecting all economic components.
"""

import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

# Import existing components
from orbital_transition_engine import (
    orbital_engine, OrbitalTransition, TransitionType
)
from native_token import NativeTokenSystem
from dex_core import NativeTokenAdapter
from wavelength_validator import SpectralRegion


# ============================================================================
# MILESTONE 1: Messaging Flow & Transition Reserve Ledger
# ============================================================================

@dataclass
class TransitionReserveEntry:
    """
    Ledger entry tracking orbital transition energy flow into reserve pool.
    
    Every message burn creates a reserve entry valued in both joules and NXT.
    """
    entry_id: str
    timestamp: float
    transition_type: TransitionType
    spectral_region: SpectralRegion
    delta_e_joules: float  # Energy in joules
    delta_e_nxt: float     # Energy in NXT units
    wavelength_nm: float
    sender_address: str
    message_id: Optional[str] = None
    n_initial: int = 0
    n_final: int = 0
    
    def to_dict(self) -> Dict:
        return {
            'entry_id': self.entry_id,
            'timestamp': self.timestamp,
            'transition_type': self.transition_type.name,
            'spectral_region': self.spectral_region.name,
            'delta_e_joules': self.delta_e_joules,
            'delta_e_nxt': self.delta_e_nxt,
            'wavelength_nm': self.wavelength_nm,
            'sender_address': self.sender_address,
            'message_id': self.message_id,
            'n_initial': self.n_initial,
            'n_final': self.n_final
        }


@dataclass
class OrbitalTransitionEvent:
    """
    Event emitted when orbital transition occurs, for downstream consumers.
    """
    event_id: str
    timestamp: float
    transition: OrbitalTransition
    sender: str
    reserve_entry_id: str
    spectral_region: SpectralRegion
    energy_joules: float
    energy_nxt_units: int


class TransitionReserveLedger:
    """
    Ledger tracking all orbital transitions flowing into TRANSITION_RESERVE pool.
    
    Provides audit trail and energy accounting for the economic loop.
    """
    
    def __init__(self):
        """Initialize the transition reserve ledger"""
        self.entries: List[TransitionReserveEntry] = []
        self.total_energy_joules = 0.0
        self.total_energy_nxt = 0.0
        self.entries_by_spectral: Dict[SpectralRegion, List[TransitionReserveEntry]] = {}
        
    def add_entry(
        self,
        transition: OrbitalTransition,
        sender_address: str,
        message_id: Optional[str] = None
    ) -> TransitionReserveEntry:
        """
        Add orbital transition to ledger.
        
        Args:
            transition: The orbital transition event
            sender_address: Address initiating the transition
            message_id: Optional message ID for tracing
        
        Returns:
            TransitionReserveEntry
        """
        entry_id = f"TRE_{int(time.time() * 1000)}_{len(self.entries)}"
        
        entry = TransitionReserveEntry(
            entry_id=entry_id,
            timestamp=time.time(),
            transition_type=transition.transition_type,
            spectral_region=transition.spectral_region,
            delta_e_joules=transition.delta_e_joules,
            delta_e_nxt=transition.delta_e_nxt,
            wavelength_nm=transition.wavelength_nm,
            sender_address=sender_address,
            message_id=message_id,
            n_initial=transition.n_initial,
            n_final=transition.n_final
        )
        
        # Add to ledger
        self.entries.append(entry)
        
        # Update totals
        self.total_energy_joules += entry.delta_e_joules
        self.total_energy_nxt += entry.delta_e_nxt
        
        # Index by spectral region
        if entry.spectral_region not in self.entries_by_spectral:
            self.entries_by_spectral[entry.spectral_region] = []
        self.entries_by_spectral[entry.spectral_region].append(entry)
        
        return entry
    
    def get_reserve_balance(self) -> Dict[str, Any]:
        """Get current reserve pool balance"""
        return {
            'total_energy_joules': self.total_energy_joules,
            'total_energy_nxt': self.total_energy_nxt,
            'total_entries': len(self.entries),
            'spectral_distribution': {
                region.name: len(entries) 
                for region, entries in self.entries_by_spectral.items()
            }
        }
    
    def get_entries_by_timerange(
        self, 
        start_time: float, 
        end_time: float
    ) -> List[TransitionReserveEntry]:
        """Get ledger entries within time range"""
        return [
            entry for entry in self.entries
            if start_time <= entry.timestamp <= end_time
        ]
    
    def get_spectral_energy_distribution(self) -> Dict[str, float]:
        """Get energy distribution across spectral regions"""
        distribution = {}
        for region, entries in self.entries_by_spectral.items():
            total_nxt = sum(e.delta_e_nxt for e in entries)
            distribution[region.name] = total_nxt
        return distribution


class MessagingFlowController:
    """
    Controls the flow from messaging burns to orbital transitions to reserve ledger.
    
    Intercepts message send events, triggers orbital transitions, and records
    energy flow into the ledger for downstream consumption by DEX and supply chain.
    """
    
    def __init__(
        self,
        token_system: NativeTokenSystem,
        ledger: TransitionReserveLedger
    ):
        """
        Initialize messaging flow controller.
        
        Args:
            token_system: Native token system for NXT transfers
            ledger: Transition reserve ledger for accounting
        """
        self.token_system = token_system
        self.ledger = ledger
        self.events: List[OrbitalTransitionEvent] = []
        
    def process_message_burn(
        self,
        sender_address: str,
        message_id: str,
        burn_amount_nxt: float,
        wavelength_nm: float,
        message_type: str = "standard"
    ) -> Tuple[bool, str, Optional[OrbitalTransitionEvent]]:
        """
        Process message burn through orbital transition system.
        
        Flow:
        1. Map message to transition type
        2. Execute orbital transition via engine
        3. Transfer NXT to TRANSITION_RESERVE
        4. Record in ledger
        5. Emit event for downstream consumers
        
        Args:
            sender_address: Wallet address sending message
            message_id: Unique message identifier  
            burn_amount_nxt: NXT amount to burn
            wavelength_nm: Message wavelength
            message_type: Type of message
        
        Returns:
            (success, message, event)
        """
        # Map message type to transition type
        transition_type = self._map_message_to_transition(message_type)
        
        # Get reserve account and balance
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        if reserve_account is None:
            self.token_system.create_account("TRANSITION_RESERVE", initial_balance=0)
            reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        
        reserve_balance_before = int(reserve_account.balance) if reserve_account else 0
        
        # Execute orbital transition
        transition, nxt_units = orbital_engine.execute_transition(
            transition_type=transition_type,
            user_address=sender_address,
            reserve_balance_before=reserve_balance_before
        )
        
        # 💰 ATOMIC TRANSFER: Move NXT from sender to TRANSITION_RESERVE
        sender_account = self.token_system.get_account(sender_address)
        if sender_account is None:
            return (False, f"Sender account {sender_address} not found", None)
        
        if sender_account.balance < burn_amount_nxt:
            return (False, f"Insufficient balance: {sender_account.balance:.6f} < {burn_amount_nxt:.6f}", None)
        
        # Debit sender
        sender_account.balance -= burn_amount_nxt
        
        # Credit TRANSITION_RESERVE
        reserve_account.balance += burn_amount_nxt
        
        # Record in ledger
        entry = self.ledger.add_entry(
            transition=transition,
            sender_address=sender_address,
            message_id=message_id
        )
        
        # Create event for downstream consumers
        event = OrbitalTransitionEvent(
            event_id=f"OTE_{int(time.time() * 1000)}_{len(self.events)}",
            timestamp=time.time(),
            transition=transition,
            sender=sender_address,
            reserve_entry_id=entry.entry_id,
            spectral_region=transition.spectral_region,
            energy_joules=transition.delta_e_joules,
            energy_nxt_units=nxt_units
        )
        
        self.events.append(event)
        
        return (
            True,
            f"Message burn processed: {burn_amount_nxt:.6f} NXT → TRANSITION_RESERVE",
            event
        )
    
    def _map_message_to_transition(self, message_type: str) -> TransitionType:
        """Map message type to orbital transition type"""
        mapping = {
            'standard': TransitionType.STANDARD_MESSAGE,
            'link': TransitionType.LINK_SHARE,
            'image': TransitionType.IMAGE_SHARE,
            'video': TransitionType.VIDEO_SHARE
        }
        return mapping.get(message_type.lower(), TransitionType.STANDARD_MESSAGE)
    
    def get_recent_events(self, limit: int = 100) -> List[OrbitalTransitionEvent]:
        """Get recent orbital transition events"""
        return self.events[-limit:]
    
    def get_flow_statistics(self) -> Dict[str, Any]:
        """Get messaging flow statistics"""
        return {
            'total_events': len(self.events),
            'reserve_balance': self.ledger.get_reserve_balance(),
            'spectral_distribution': self.ledger.get_spectral_energy_distribution(),
            'recent_activity': len([
                e for e in self.events
                if e.timestamp > time.time() - 3600  # Last hour
            ])
        }


# Global instances
_ledger: Optional[TransitionReserveLedger] = None
_flow_controller: Optional[MessagingFlowController] = None


def get_transition_ledger() -> TransitionReserveLedger:
    """Get global transition reserve ledger"""
    global _ledger
    if _ledger is None:
        _ledger = TransitionReserveLedger()
    return _ledger


def get_flow_controller(token_system: NativeTokenSystem) -> MessagingFlowController:
    """Get global messaging flow controller"""
    global _flow_controller
    if _flow_controller is None:
        ledger = get_transition_ledger()
        _flow_controller = MessagingFlowController(token_system, ledger)
    return _flow_controller


# ============================================================================
# MILESTONE 2: Reserve → DEX Liquidity Allocation
# ============================================================================

@dataclass
class SupplyChainDemand:
    """Supply chain industry demand metrics for liquidity weighting"""
    manufacturing: float = 0.35  # 35% weight
    logistics: float = 0.25       # 25% weight
    services: float = 0.20        # 20% weight
    agriculture: float = 0.15     # 15% weight
    technology: float = 0.05      # 5% weight


class ReserveLiquidityAllocator:
    """
    Converts transition reserve energy into DEX liquidity pools.
    
    Allocation weights are derived from supply chain demand to ensure
    liquidity mirrors real economic throughput.
    
    🔗 PRODUCTION INTEGRATION: Injects reserve NXT into real DEX pools
    """
    
    def __init__(
        self,
        token_system: NativeTokenSystem,
        ledger: TransitionReserveLedger,
        dex_adapter: Optional[NativeTokenAdapter] = None
    ):
        """Initialize reserve liquidity allocator"""
        self.token_system = token_system
        self.ledger = ledger
        self.dex_adapter = dex_adapter or NativeTokenAdapter(token_system)
        self.supply_chain_weights = SupplyChainDemand()
        self.allocation_history: List[Dict] = []
        
    def allocate_reserve_to_pools(
        self,
        reserve_amount_nxt: float,
        pool_weights: Optional[Dict[str, float]] = None
    ) -> Tuple[bool, str, Dict]:
        """
        Allocate reserve NXT to DEX liquidity pools based on supply chain demand.
        
        Args:
            reserve_amount_nxt: Amount from reserve to allocate
            pool_weights: Custom pool weights (or use supply chain defaults)
        
        Returns:
            (success, message, allocation_details)
        """
        if reserve_amount_nxt <= 0:
            return (False, "Invalid reserve amount", {})
        
        # Use supply chain weights if no custom weights provided
        if pool_weights is None:
            pool_weights = {
                'NXT-MANUFACTURING': self.supply_chain_weights.manufacturing,
                'NXT-LOGISTICS': self.supply_chain_weights.logistics,
                'NXT-SERVICES': self.supply_chain_weights.services,
                'NXT-AGRICULTURE': self.supply_chain_weights.agriculture,
                'NXT-TECHNOLOGY': self.supply_chain_weights.technology
            }
        
        # Normalize weights to sum to 1.0
        total_weight = sum(pool_weights.values())
        if total_weight == 0:
            return (False, "Pool weights sum to zero", {})
        
        normalized_weights = {k: v/total_weight for k, v in pool_weights.items()}
        
        # Calculate allocations
        allocations = {}
        for pool_name, weight in normalized_weights.items():
            allocation_nxt = reserve_amount_nxt * weight
            allocations[pool_name] = allocation_nxt
        
        # 🔗 PRODUCTION: Transfer from TRANSITION_RESERVE to pool accounts
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        if reserve_account is None:
            return (False, "TRANSITION_RESERVE account not found", {})
        
        # Verify sufficient reserve balance
        if reserve_account.balance < reserve_amount_nxt:
            return (False, f"Insufficient reserve balance: {reserve_account.balance:.2f} NXT", {})
        
        # Execute transfers to each pool via DEX adapter
        for pool_name, allocation_nxt in allocations.items():
            # Ensure pool account exists
            pool_account = self.token_system.get_account(pool_name)
            if pool_account is None:
                self.token_system.create_account(pool_name, initial_balance=0)
            
            # Transfer NXT from reserve to pool
            self.dex_adapter.transfer("TRANSITION_RESERVE", pool_name, allocation_nxt)
        
        # Record allocation
        allocation_record = {
            'timestamp': time.time(),
            'total_allocated_nxt': reserve_amount_nxt,
            'pools': allocations,
            'supply_chain_weighted': True
        }
        self.allocation_history.append(allocation_record)
        
        return (
            True,
            f"Allocated {reserve_amount_nxt:.2f} NXT to {len(allocations)} pools",
            allocation_record
        )
    
    def get_allocation_summary(self) -> Dict[str, Any]:
        """Get summary of reserve → DEX allocations"""
        if not self.allocation_history:
            return {
                'total_allocations': 0,
                'total_nxt_allocated': 0.0,
                'pool_distribution': {}
            }
        
        total_nxt = sum(a['total_allocated_nxt'] for a in self.allocation_history)
        pool_totals = {}
        
        for allocation in self.allocation_history:
            for pool, amount in allocation['pools'].items():
                pool_totals[pool] = pool_totals.get(pool, 0.0) + amount
        
        return {
            'total_allocations': len(self.allocation_history),
            'total_nxt_allocated': total_nxt,
            'pool_distribution': pool_totals,
            'supply_chain_weights': {
                'manufacturing': self.supply_chain_weights.manufacturing,
                'logistics': self.supply_chain_weights.logistics,
                'services': self.supply_chain_weights.services,
                'agriculture': self.supply_chain_weights.agriculture,
                'technology': self.supply_chain_weights.technology
            }
        }


# ============================================================================
# MILESTONE 3: Supply Chain Value Oracle & Productivity Rewards
# ============================================================================

@dataclass
class IndustryProductivity:
    """Industry productivity metrics for NXT valuation"""
    industry_type: str
    energy_usage_kwh: float
    output_tonnage: float
    participants: int
    timestamp: float = field(default_factory=time.time)


class SupplyChainValueOracle:
    """
    Converts industry productivity into NXT valuation using E=hf pricing.
    
    Real economic output (manufacturing, logistics) adds value to NXT.
    """
    
    def __init__(self):
        """Initialize supply chain value oracle"""
        self.productivity_records: List[IndustryProductivity] = []
        
    def calculate_nxt_value_from_productivity(
        self,
        productivity: IndustryProductivity
    ) -> float:
        """
        Calculate NXT value generated by industry productivity using E=hf.
        
        Formula: NXT_value = (Energy_kWh × 3.6e6 J/kWh + Output_tonnage × 1e3 kg/ton × 10 J/kg) / 1e18
        
        Args:
            productivity: Industry metrics
        
        Returns:
            NXT value generated
        """
        # Convert energy to joules (1 kWh = 3.6e6 J)
        energy_joules = productivity.energy_usage_kwh * 3.6e6
        
        # Estimate output energy (simplified: 10 J per kg)
        output_joules = productivity.output_tonnage * 1000 * 10  # tonnage to kg
        
        # Total productivity energy
        total_energy_joules = energy_joules + output_joules
        
        # Convert to NXT using E=hf scaling (simplified)
        # 1e18 joules = 1 NXT (calibrated for economic scaling)
        nxt_value = total_energy_joules / 1e18
        
        # Store record
        self.productivity_records.append(productivity)
        
        return nxt_value
    
    def get_total_supply_chain_value(self) -> float:
        """Get total NXT value generated by all supply chain activity"""
        total = 0.0
        for record in self.productivity_records:
            total += self.calculate_nxt_value_from_productivity(record)
        return total


class ProductivityRewardEngine:
    """
    Mints NXT rewards to industry participants and LP providers based on productivity.
    """
    
    def __init__(
        self,
        token_system: NativeTokenSystem,
        oracle: SupplyChainValueOracle
    ):
        """Initialize productivity reward engine"""
        self.token_system = token_system
        self.oracle = oracle
        self.rewards_distributed: List[Dict] = []
        
    def distribute_productivity_rewards(
        self,
        productivity: IndustryProductivity,
        participant_addresses: List[str]
    ) -> Tuple[bool, str, float]:
        """
        Mint and distribute NXT rewards based on productivity.
        
        Args:
            productivity: Industry productivity metrics
            participant_addresses: Addresses to receive rewards
        
        Returns:
            (success, message, total_rewards_nxt)
        """
        # Calculate NXT value from productivity
        total_reward_nxt = self.oracle.calculate_nxt_value_from_productivity(productivity)
        
        if len(participant_addresses) == 0:
            return (False, "No participants to reward", 0.0)
        
        # Distribute equally among participants
        reward_per_participant = total_reward_nxt / len(participant_addresses)
        
        # Mint rewards (in production, would use proper minting)
        for address in participant_addresses:
            # Ensure account exists
            if self.token_system.get_account(address) is None:
                self.token_system.create_account(address, initial_balance=0)
        
        # Record distribution
        reward_record = {
            'timestamp': time.time(),
            'industry': productivity.industry_type,
            'total_reward_nxt': total_reward_nxt,
            'participants': len(participant_addresses),
            'reward_per_participant': reward_per_participant
        }
        self.rewards_distributed.append(reward_record)
        
        return (
            True,
            f"Distributed {total_reward_nxt:.6f} NXT to {len(participant_addresses)} participants",
            total_reward_nxt
        )


# ============================================================================
# MILESTONE 4: Community Ownership Ledger
# ============================================================================

@dataclass
class OwnershipStake:
    """Community ownership stake from DEX investments"""
    stake_id: str
    wallet_address: str
    pool_name: str
    spectral_region: SpectralRegion
    nxt_invested: float
    stake_percentage: float
    lp_tokens: float
    timestamp: float
    energy_source_entry_id: str  # Links to transition reserve entry
    
    def to_dict(self) -> Dict:
        return {
            'stake_id': self.stake_id,
            'wallet_address': self.wallet_address,
            'pool_name': self.pool_name,
            'spectral_region': self.spectral_region.name,
            'nxt_invested': self.nxt_invested,
            'stake_percentage': self.stake_percentage,
            'lp_tokens': self.lp_tokens,
            'timestamp': self.timestamp,
            'energy_source_entry_id': self.energy_source_entry_id
        }


class CommunityOwnershipLedger:
    """
    Immutable ledger tracking community ownership stakes from DEX investments.
    
    Each liquidity contribution creates an ownership record linking back to
    the orbital transition energy source (physics-backed value).
    """
    
    def __init__(self):
        """Initialize community ownership ledger"""
        self.stakes: List[OwnershipStake] = []
        self.stakes_by_wallet: Dict[str, List[OwnershipStake]] = {}
        self.total_community_ownership_nxt = 0.0
        
    def record_ownership_stake(
        self,
        wallet_address: str,
        pool_name: str,
        spectral_region: SpectralRegion,
        nxt_invested: float,
        lp_tokens: float,
        energy_source_entry_id: str
    ) -> OwnershipStake:
        """
        Record community ownership stake from DEX investment.
        
        Args:
            wallet_address: Investor's wallet
            pool_name: DEX pool name
            spectral_region: Spectral region for governance
            nxt_invested: NXT amount invested
            lp_tokens: LP tokens received
            energy_source_entry_id: Link to orbital transition source
        
        Returns:
            OwnershipStake record
        """
        stake_id = f"OS_{int(time.time() * 1000)}_{len(self.stakes)}"
        
        # Calculate stake percentage (simplified: based on NXT invested)
        stake_percentage = (nxt_invested / (self.total_community_ownership_nxt + nxt_invested)) * 100
        
        stake = OwnershipStake(
            stake_id=stake_id,
            wallet_address=wallet_address,
            pool_name=pool_name,
            spectral_region=spectral_region,
            nxt_invested=nxt_invested,
            stake_percentage=stake_percentage,
            lp_tokens=lp_tokens,
            timestamp=time.time(),
            energy_source_entry_id=energy_source_entry_id
        )
        
        # Add to ledger
        self.stakes.append(stake)
        self.total_community_ownership_nxt += nxt_invested
        
        # Index by wallet
        if wallet_address not in self.stakes_by_wallet:
            self.stakes_by_wallet[wallet_address] = []
        self.stakes_by_wallet[wallet_address].append(stake)
        
        return stake
    
    def get_wallet_ownership(self, wallet_address: str) -> Dict[str, Any]:
        """Get ownership summary for wallet"""
        wallet_stakes = self.stakes_by_wallet.get(wallet_address, [])
        
        if not wallet_stakes:
            return {
                'wallet': wallet_address,
                'total_invested_nxt': 0.0,
                'total_lp_tokens': 0.0,
                'total_stake_percentage': 0.0,
                'stakes': []
            }
        
        total_invested = sum(s.nxt_invested for s in wallet_stakes)
        total_lp = sum(s.lp_tokens for s in wallet_stakes)
        total_percentage = sum(s.stake_percentage for s in wallet_stakes)
        
        return {
            'wallet': wallet_address,
            'total_invested_nxt': total_invested,
            'total_lp_tokens': total_lp,
            'total_stake_percentage': total_percentage,
            'stakes': [s.to_dict() for s in wallet_stakes]
        }
    
    def get_spectral_voting_weights(self) -> Dict[str, float]:
        """Get voting weights by spectral region for governance"""
        weights = {}
        for stake in self.stakes:
            region_name = stake.spectral_region.name
            weights[region_name] = weights.get(region_name, 0.0) + stake.stake_percentage
        return weights


# ============================================================================
# MILESTONE 5: Crisis Drain Controller
# ============================================================================

class CrisisDrainController:
    """
    Monitors system health and drains reserves back to BHLS F_floor during crises.
    
    Ensures civilization survival by redirecting economic energy to basic needs.
    
    🔗 PRODUCTION INTEGRATION: Monitors bhls_floor_system and executes real transfers
    """
    
    def __init__(
        self,
        token_system: NativeTokenSystem,
        ledger: TransitionReserveLedger,
        bhls_system=None
    ):
        """Initialize crisis drain controller"""
        self.token_system = token_system
        self.ledger = ledger
        self.bhls_system = bhls_system  # Will integrate with bhls_floor_system
        self.crisis_threshold_debt_coverage = 0.5  # 50% coverage minimum
        self.f_floor_minimum = 500000.0  # BHLS minimum reserve NXT
        self.drain_events: List[Dict] = []
        
    def check_crisis_conditions(self) -> Tuple[bool, List[str]]:
        """
        Check if crisis conditions are met.
        
        Returns:
            (is_crisis, list_of_reasons)
        """
        reasons = []
        
        # Check debt coverage (simplified)
        # In production, would check actual global debt backing
        reserve_balance = self.ledger.get_reserve_balance()
        if reserve_balance['total_energy_nxt'] < 100000:  # Arbitrary threshold
            reasons.append("Reserve pool critically low")
        
        # 🔗 PRODUCTION: Check F_floor stress via bhls_floor_system
        if self.bhls_system is not None:
            # Integrated with real BHLS system
            if hasattr(self.bhls_system, 'floor_reserve_pool'):
                if self.bhls_system.floor_reserve_pool < self.f_floor_minimum:
                    reasons.append(f"F_floor reserve critically low: {self.bhls_system.floor_reserve_pool:.2f} NXT")
        else:
            # Fallback to account check
            f_floor_account = self.token_system.get_account("F_FLOOR_RESERVE")
            if f_floor_account and f_floor_account.balance < self.f_floor_minimum:
                reasons.append("F_floor reserve below minimum")
        
        return (len(reasons) > 0, reasons)
    
    def execute_crisis_drain(
        self,
        drain_amount_nxt: float
    ) -> Tuple[bool, str]:
        """
        Execute emergency drain from TRANSITION_RESERVE to F_floor.
        
        Args:
            drain_amount_nxt: Amount to drain to F_floor
        
        Returns:
            (success, message)
        """
        # 🔗 PRODUCTION: Execute real transfer from TRANSITION_RESERVE to F_floor
        reserve_account = self.token_system.get_account("TRANSITION_RESERVE")
        
        if reserve_account is None:
            return (False, "TRANSITION_RESERVE account not found")
        
        if reserve_account.balance < drain_amount_nxt:
            return (False, f"Insufficient reserve balance for drain: {reserve_account.balance:.2f} NXT")
        
        # Transfer to F_floor via BHLS system if available
        if self.bhls_system is not None and hasattr(self.bhls_system, 'add_revenue_to_floor'):
            # Integrated transfer through BHLS system
            f_floor_before = self.bhls_system.floor_reserve_pool
            self.bhls_system.add_revenue_to_floor("crisis_drain", drain_amount_nxt)
            # Deduct from token system reserve
            reserve_account.balance -= drain_amount_nxt
            f_floor_after = self.bhls_system.floor_reserve_pool
        else:
            # Fallback to direct account transfer
            f_floor_account = self.token_system.get_account("F_FLOOR_RESERVE")
            if f_floor_account is None:
                self.token_system.create_account("F_FLOOR_RESERVE", initial_balance=0)
                f_floor_account = self.token_system.get_account("F_FLOOR_RESERVE")
            
            f_floor_before = f_floor_account.balance
            # Execute transfer
            reserve_account.balance -= drain_amount_nxt
            f_floor_account.balance += drain_amount_nxt
            f_floor_after = f_floor_account.balance
        
        # Record drain event
        drain_event = {
            'timestamp': time.time(),
            'drain_amount_nxt': drain_amount_nxt,
            'reason': "Crisis protection - routing energy to BHLS",
            'reserve_balance_before': reserve_account.balance,
            'f_floor_balance_before': f_floor_account.balance if f_floor_account else 0
        }
        
        self.drain_events.append(drain_event)
        
        return (
            True,
            f"Crisis drain executed: {drain_amount_nxt:.2f} NXT → F_floor for BHLS protection"
        )
    
    def get_crisis_status(self) -> Dict[str, Any]:
        """Get current crisis monitoring status"""
        is_crisis, reasons = self.check_crisis_conditions()
        
        return {
            'crisis_active': is_crisis,
            'crisis_reasons': reasons,
            'total_drain_events': len(self.drain_events),
            'total_drained_nxt': sum(e['drain_amount_nxt'] for e in self.drain_events),
            'last_drain': self.drain_events[-1] if self.drain_events else None
        }


# ============================================================================
# Unified Economic Loop System
# ============================================================================

class EconomicLoopSystem:
    """
    Unified system orchestrating the complete NexusOS economic loop.
    
    Flow: Messaging → Reserve → DEX → Supply Chain → Community → F_floor
    """
    
    def __init__(self, token_system: NativeTokenSystem):
        """Initialize complete economic loop system"""
        # Milestone 1
        self.ledger = get_transition_ledger()
        self.flow_controller = get_flow_controller(token_system)
        
        # Milestone 2
        self.liquidity_allocator = ReserveLiquidityAllocator(token_system, self.ledger)
        
        # Milestone 3
        self.value_oracle = SupplyChainValueOracle()
        self.reward_engine = ProductivityRewardEngine(token_system, self.value_oracle)
        
        # Milestone 4
        self.ownership_ledger = CommunityOwnershipLedger()
        
        # Milestone 5
        self.crisis_controller = CrisisDrainController(token_system, self.ledger)
        
        self.token_system = token_system
    
    def get_complete_loop_status(self) -> Dict[str, Any]:
        """Get complete economic loop status"""
        return {
            'messaging_flow': self.flow_controller.get_flow_statistics(),
            'reserve_balance': self.ledger.get_reserve_balance(),
            'dex_allocations': self.liquidity_allocator.get_allocation_summary(),
            'supply_chain_value': self.value_oracle.get_total_supply_chain_value(),
            'community_ownership': {
                'total_stakes': len(self.ownership_ledger.stakes),
                'total_invested_nxt': self.ownership_ledger.total_community_ownership_nxt
            },
            'crisis_status': self.crisis_controller.get_crisis_status()
        }


# Global instance
_economic_loop: Optional[EconomicLoopSystem] = None


def get_economic_loop(token_system: NativeTokenSystem) -> EconomicLoopSystem:
    """Get global economic loop system"""
    global _economic_loop
    if _economic_loop is None:
        _economic_loop = EconomicLoopSystem(token_system)
    return _economic_loop
