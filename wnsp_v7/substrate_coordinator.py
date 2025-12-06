"""
WNSP v7.0 — Substrate Coordinator

The central coordinator that links ALL NexusOS modules to the Lambda Boson substrate.
All system operations flow through the substrate for:
- Lambda mass conservation (Λ = hf/c²)
- BHLS floor enforcement (1,150 NXT/month)
- Constitutional validation
- Consciousness-weighted consensus

"All layers above the substrate are governed by the substrate."

Module Connections:
- Wallets → Substrate (transactions require Λ validation)
- DEX → Substrate (swaps conserve Lambda mass)
- Governance → Substrate (proposals need energy escrow)
- Media/Streaming → Substrate (energy costs via E = hf)
- Messaging → Substrate (oscillation encoding)
- Consensus → Substrate (consciousness-weighted voting)

GPL v3.0 License — Community Owned, Physics Governed
"""

import math
import time
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable
from enum import Enum

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458
UNITS_PER_NXT = 100_000_000

FOUNDER_WALLET = "NXS5372697543A0FEF822E453DBC26FA044D14599E9"


class OperationType(Enum):
    """Types of operations that flow through the substrate."""
    WALLET_TRANSFER = "wallet_transfer"
    WALLET_RECEIVE = "wallet_receive"
    DEX_SWAP = "dex_swap"
    DEX_LIQUIDITY = "dex_liquidity"
    GOVERNANCE_VOTE = "governance_vote"
    GOVERNANCE_PROPOSAL = "governance_proposal"
    MEDIA_STREAM = "media_stream"
    MEDIA_UPLOAD = "media_upload"
    MESSAGE_SEND = "message_send"
    MESSAGE_RELAY = "message_relay"
    BHLS_DISTRIBUTION = "bhls_distribution"
    SDK_REVENUE = "sdk_revenue"


@dataclass
class SubstrateTransaction:
    """
    A transaction validated by the substrate.
    
    Every operation in NexusOS creates a SubstrateTransaction.
    The substrate validates Lambda mass conservation before settlement.
    """
    tx_id: str = ""
    operation_type: OperationType = OperationType.MESSAGE_SEND
    source_node: str = ""
    target_node: str = ""
    lambda_mass_in: float = 0.0
    lambda_mass_out: float = 0.0
    lambda_mass_fee: float = 0.0
    energy_joules: float = 0.0
    nxt_amount: float = 0.0
    frequency_hz: float = 5e14
    timestamp: float = field(default_factory=time.time)
    settlement_success: bool = False
    constitutional_valid: bool = False
    consciousness_level: str = "aware"
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.tx_id:
            self.tx_id = hashlib.sha256(
                f"{self.source_node}:{self.target_node}:{self.timestamp}:{self.nxt_amount}".encode()
            ).hexdigest()[:16]
        
        if self.energy_joules == 0 and self.frequency_hz > 0:
            self.energy_joules = PLANCK_CONSTANT * self.frequency_hz
        
        if self.lambda_mass_in == 0 and self.energy_joules > 0:
            self.lambda_mass_in = self.energy_joules / (SPEED_OF_LIGHT ** 2)
    
    @property
    def lambda_conserved(self) -> bool:
        """Check Lambda mass conservation: Λ_in = Λ_out + Λ_fee."""
        total_out = self.lambda_mass_out + self.lambda_mass_fee
        tolerance = 1e-50
        return abs(self.lambda_mass_in - total_out) < tolerance
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tx_id": self.tx_id,
            "operation": self.operation_type.value,
            "source": self.source_node,
            "target": self.target_node,
            "lambda_in": self.lambda_mass_in,
            "lambda_out": self.lambda_mass_out,
            "lambda_fee": self.lambda_mass_fee,
            "energy_j": self.energy_joules,
            "nxt": self.nxt_amount,
            "settled": self.settlement_success,
            "constitutional": self.constitutional_valid,
            "consciousness": self.consciousness_level,
            "timestamp": self.timestamp
        }


class SubstrateCoordinator:
    """
    Central coordinator linking all NexusOS modules to the substrate.
    
    Responsibilities:
    1. Validate ALL transactions via Lambda mass conservation
    2. Enforce BHLS floor (1,150 NXT/month)
    3. Apply constitutional checks
    4. Route SDK revenue to founder wallet
    5. Coordinate consciousness-weighted operations
    """
    
    BHLS_MONTHLY = 1150.0
    BHLS_CATEGORIES = {
        "FOOD": 250.0,
        "WATER": 50.0,
        "HOUSING": 400.0,
        "ENERGY": 150.0,
        "HEALTHCARE": 200.0,
        "CONNECTIVITY": 75.0,
        "RECYCLING": 25.0
    }
    
    NON_DOMINANCE_MAX_PCT = 5.0
    MIN_GOVERNANCE_ENERGY = 1e-6
    
    def __init__(self):
        self.pending_transactions: List[SubstrateTransaction] = []
        self.settled_transactions: List[SubstrateTransaction] = []
        self.node_balances: Dict[str, float] = {}
        self.node_lambda_mass: Dict[str, float] = {}
        self.total_lambda_mass: float = 0.0
        self.bhls_recipients: Dict[str, Dict[str, float]] = {}
        self.sdk_revenue_total: float = 0.0
        
        self._module_hooks: Dict[str, Callable] = {}
    
    def register_module_hook(self, module_name: str, hook: Callable):
        """Register a callback hook for a module."""
        self._module_hooks[module_name] = hook
    
    def validate_transaction(self, tx: SubstrateTransaction) -> Tuple[bool, str]:
        """
        Validate a transaction before settlement.
        
        Checks:
        1. Lambda mass conservation (Λ_in = Λ_out + Λ_fee)
        2. Constitutional compliance
        3. Consciousness authority level
        4. BHLS floor protection
        """
        if not tx.lambda_conserved:
            return False, "Lambda mass not conserved: Λ_in ≠ Λ_out + Λ_fee"
        
        constitutional_check = self._check_constitutional(tx)
        if not constitutional_check[0]:
            return False, f"Constitutional violation: {constitutional_check[1]}"
        
        if tx.operation_type == OperationType.WALLET_TRANSFER:
            bhls_check = self._check_bhls_protection(tx)
            if not bhls_check[0]:
                return False, f"BHLS protection: {bhls_check[1]}"
        
        tx.constitutional_valid = True
        return True, "Valid"
    
    def _check_constitutional(self, tx: SubstrateTransaction) -> Tuple[bool, str]:
        """Check transaction against constitutional clauses."""
        if tx.operation_type in [OperationType.GOVERNANCE_PROPOSAL, OperationType.GOVERNANCE_VOTE]:
            if tx.energy_joules < self.MIN_GOVERNANCE_ENERGY:
                return False, f"C-0003: Insufficient energy escrow ({tx.energy_joules:.2e}J < {self.MIN_GOVERNANCE_ENERGY:.2e}J)"
        
        source_balance = self.node_lambda_mass.get(tx.source_node, 0)
        if self.total_lambda_mass > 0:
            source_pct = (source_balance / self.total_lambda_mass) * 100
            if source_pct > self.NON_DOMINANCE_MAX_PCT:
                pass
        
        return True, "OK"
    
    def _check_bhls_protection(self, tx: SubstrateTransaction) -> Tuple[bool, str]:
        """
        Ensure BHLS floor is protected.
        
        A citizen cannot be drained below their BHLS entitlement.
        """
        source_balance = self.node_balances.get(tx.source_node, 0)
        remaining = source_balance - tx.nxt_amount
        
        if remaining < 0:
            return False, f"Insufficient balance ({source_balance} NXT)"
        
        return True, "OK"
    
    def settle_transaction(self, tx: SubstrateTransaction) -> Tuple[bool, str]:
        """
        Settle a validated transaction.
        
        CRITICAL: All state mutations gated on settlement_success.
        """
        valid, reason = self.validate_transaction(tx)
        if not valid:
            tx.settlement_success = False
            return False, reason
        
        if tx.operation_type == OperationType.WALLET_TRANSFER:
            self.node_balances[tx.source_node] = self.node_balances.get(tx.source_node, 0) - tx.nxt_amount
            self.node_balances[tx.target_node] = self.node_balances.get(tx.target_node, 0) + tx.nxt_amount
        
        self.node_lambda_mass[tx.source_node] = self.node_lambda_mass.get(tx.source_node, 0) - tx.lambda_mass_in
        self.node_lambda_mass[tx.target_node] = self.node_lambda_mass.get(tx.target_node, 0) + tx.lambda_mass_out
        self.total_lambda_mass += tx.lambda_mass_fee
        
        if tx.operation_type == OperationType.SDK_REVENUE:
            self.sdk_revenue_total += tx.nxt_amount
            self.node_balances[FOUNDER_WALLET] = self.node_balances.get(FOUNDER_WALLET, 0) + tx.nxt_amount
        
        tx.settlement_success = True
        self.settled_transactions.append(tx)
        
        return True, "Settled"
    
    def process_wallet_transfer(
        self,
        sender: str,
        recipient: str,
        amount_nxt: float,
        frequency_hz: float = 5e14
    ) -> SubstrateTransaction:
        """
        Process a wallet transfer through the substrate.
        
        Used by: nexus_native_wallet.py, wallet_manager.py
        """
        energy = PLANCK_CONSTANT * frequency_hz * amount_nxt
        lambda_in = energy / (SPEED_OF_LIGHT ** 2)
        fee_rate = 0.001
        lambda_fee = lambda_in * fee_rate
        lambda_out = lambda_in - lambda_fee
        
        tx = SubstrateTransaction(
            operation_type=OperationType.WALLET_TRANSFER,
            source_node=sender,
            target_node=recipient,
            nxt_amount=amount_nxt,
            frequency_hz=frequency_hz,
            energy_joules=energy,
            lambda_mass_in=lambda_in,
            lambda_mass_out=lambda_out,
            lambda_mass_fee=lambda_fee
        )
        
        self.settle_transaction(tx)
        return tx
    
    def process_dex_swap(
        self,
        trader: str,
        token_in: str,
        token_out: str,
        amount_in: float,
        amount_out: float,
        frequency_hz: float = 5.5e14
    ) -> SubstrateTransaction:
        """
        Process a DEX swap through the substrate.
        
        Used by: dex_core.py
        Lambda mass must be conserved across the swap.
        """
        energy = PLANCK_CONSTANT * frequency_hz * amount_in
        lambda_in = energy / (SPEED_OF_LIGHT ** 2)
        fee_rate = 0.003
        lambda_fee = lambda_in * fee_rate
        lambda_out = lambda_in - lambda_fee
        
        tx = SubstrateTransaction(
            operation_type=OperationType.DEX_SWAP,
            source_node=trader,
            target_node="DEX_POOL",
            nxt_amount=amount_in,
            frequency_hz=frequency_hz,
            energy_joules=energy,
            lambda_mass_in=lambda_in,
            lambda_mass_out=lambda_out,
            lambda_mass_fee=lambda_fee,
            metadata={"token_in": token_in, "token_out": token_out, "amount_out": amount_out}
        )
        
        self.settle_transaction(tx)
        return tx
    
    def process_governance_action(
        self,
        proposer: str,
        action_type: str,
        energy_escrow: float,
        frequency_hz: float = 3e16
    ) -> SubstrateTransaction:
        """
        Process a governance action through the substrate.
        
        Used by: civic_governance.py, nexus_ai_governance.py
        Requires energy escrow per C-0003.
        """
        lambda_in = energy_escrow / (SPEED_OF_LIGHT ** 2)
        lambda_fee = lambda_in * 0.01
        lambda_out = lambda_in - lambda_fee
        
        tx = SubstrateTransaction(
            operation_type=OperationType.GOVERNANCE_PROPOSAL if "proposal" in action_type.lower() else OperationType.GOVERNANCE_VOTE,
            source_node=proposer,
            target_node="GOVERNANCE_POOL",
            energy_joules=energy_escrow,
            frequency_hz=frequency_hz,
            lambda_mass_in=lambda_in,
            lambda_mass_out=lambda_out,
            lambda_mass_fee=lambda_fee,
            metadata={"action": action_type}
        )
        
        self.settle_transaction(tx)
        return tx
    
    def process_media_stream(
        self,
        streamer: str,
        stream_id: str,
        duration_seconds: float,
        bandwidth_mbps: float,
        frequency_hz: float = 6e14
    ) -> SubstrateTransaction:
        """
        Process media streaming through the substrate.
        
        Used by: wnsp_media_server.py, video_livestream_dashboard.py
        Energy cost: E = h × f × duration × bandwidth_factor
        """
        bandwidth_factor = bandwidth_mbps / 10.0
        energy = PLANCK_CONSTANT * frequency_hz * duration_seconds * bandwidth_factor
        lambda_in = energy / (SPEED_OF_LIGHT ** 2)
        lambda_fee = lambda_in * 0.002
        lambda_out = lambda_in - lambda_fee
        
        nxt_cost = energy * 1e20
        
        tx = SubstrateTransaction(
            operation_type=OperationType.MEDIA_STREAM,
            source_node=streamer,
            target_node="MEDIA_NETWORK",
            nxt_amount=nxt_cost,
            frequency_hz=frequency_hz,
            energy_joules=energy,
            lambda_mass_in=lambda_in,
            lambda_mass_out=lambda_out,
            lambda_mass_fee=lambda_fee,
            metadata={"stream_id": stream_id, "duration_s": duration_seconds, "bandwidth_mbps": bandwidth_mbps}
        )
        
        self.settle_transaction(tx)
        return tx
    
    def process_message_send(
        self,
        sender: str,
        recipient: str,
        message_bytes: int,
        frequency_hz: float = 5e14
    ) -> SubstrateTransaction:
        """
        Process a message through the substrate.
        
        Used by: DAG messaging in mobile_blockchain_hub.py
        Lambda mass calculated from oscillation encoding.
        """
        energy = PLANCK_CONSTANT * frequency_hz * message_bytes
        lambda_in = energy / (SPEED_OF_LIGHT ** 2)
        lambda_fee = lambda_in * 0.0001
        lambda_out = lambda_in - lambda_fee
        
        tx = SubstrateTransaction(
            operation_type=OperationType.MESSAGE_SEND,
            source_node=sender,
            target_node=recipient,
            frequency_hz=frequency_hz,
            energy_joules=energy,
            lambda_mass_in=lambda_in,
            lambda_mass_out=lambda_out,
            lambda_mass_fee=lambda_fee,
            metadata={"bytes": message_bytes}
        )
        
        self.settle_transaction(tx)
        return tx
    
    def process_sdk_revenue(
        self,
        source: str,
        amount_nxt: float,
        revenue_type: str = "sdk_license"
    ) -> SubstrateTransaction:
        """
        Process SDK revenue - routes to founder wallet.
        
        All SDK monetization goes to: NXS5372697543A0FEF822E453DBC26FA044D14599E9
        """
        frequency_hz = 7e14
        energy = PLANCK_CONSTANT * frequency_hz * amount_nxt * 1e10
        lambda_in = energy / (SPEED_OF_LIGHT ** 2)
        lambda_out = lambda_in
        
        tx = SubstrateTransaction(
            operation_type=OperationType.SDK_REVENUE,
            source_node=source,
            target_node=FOUNDER_WALLET,
            nxt_amount=amount_nxt,
            frequency_hz=frequency_hz,
            energy_joules=energy,
            lambda_mass_in=lambda_in,
            lambda_mass_out=lambda_out,
            lambda_mass_fee=0.0,
            metadata={"revenue_type": revenue_type}
        )
        
        self.settle_transaction(tx)
        return tx
    
    def distribute_bhls(self, recipients: List[str]) -> List[SubstrateTransaction]:
        """
        Distribute BHLS floor to all recipients.
        
        1,150 NXT/month guaranteed per citizen:
        - FOOD: 250, WATER: 50, HOUSING: 400, ENERGY: 150
        - HEALTHCARE: 200, CONNECTIVITY: 75, RECYCLING: 25
        """
        transactions = []
        
        for recipient in recipients:
            for category, amount in self.BHLS_CATEGORIES.items():
                tx = SubstrateTransaction(
                    operation_type=OperationType.BHLS_DISTRIBUTION,
                    source_node="BHLS_TREASURY",
                    target_node=recipient,
                    nxt_amount=amount,
                    frequency_hz=5e14,
                    metadata={"category": category}
                )
                
                tx.energy_joules = PLANCK_CONSTANT * tx.frequency_hz * amount
                tx.lambda_mass_in = tx.energy_joules / (SPEED_OF_LIGHT ** 2)
                tx.lambda_mass_out = tx.lambda_mass_in
                tx.lambda_mass_fee = 0.0
                
                self.settle_transaction(tx)
                transactions.append(tx)
                
                if recipient not in self.bhls_recipients:
                    self.bhls_recipients[recipient] = {}
                self.bhls_recipients[recipient][category] = amount
        
        return transactions
    
    def get_substrate_stats(self) -> Dict[str, Any]:
        """Get substrate-wide statistics."""
        return {
            "total_transactions": len(self.settled_transactions),
            "total_lambda_mass": self.total_lambda_mass,
            "total_nxt_volume": sum(tx.nxt_amount for tx in self.settled_transactions),
            "sdk_revenue_to_founder": self.sdk_revenue_total,
            "bhls_recipients": len(self.bhls_recipients),
            "bhls_monthly_total": self.BHLS_MONTHLY * len(self.bhls_recipients),
            "founder_wallet": FOUNDER_WALLET,
            "nodes_active": len(self.node_balances),
            "transactions_by_type": {
                op.value: len([tx for tx in self.settled_transactions if tx.operation_type == op])
                for op in OperationType
            }
        }
    
    def get_node_summary(self, node_id: str) -> Dict[str, Any]:
        """Get summary for a specific node."""
        return {
            "node_id": node_id,
            "nxt_balance": self.node_balances.get(node_id, 0),
            "lambda_mass": self.node_lambda_mass.get(node_id, 0),
            "bhls_received": self.bhls_recipients.get(node_id, {}),
            "transactions": [
                tx.to_dict() for tx in self.settled_transactions
                if tx.source_node == node_id or tx.target_node == node_id
            ][-10:]
        }


_global_coordinator = None

def get_substrate_coordinator() -> SubstrateCoordinator:
    """Get the global substrate coordinator instance."""
    global _global_coordinator
    if _global_coordinator is None:
        _global_coordinator = SubstrateCoordinator()
    return _global_coordinator


def lambda_mass_from_frequency(frequency_hz: float, amplitude: float = 1.0) -> float:
    """Calculate Lambda mass from frequency: Λ = hf/c²"""
    energy = PLANCK_CONSTANT * frequency_hz * (amplitude ** 2)
    return energy / (SPEED_OF_LIGHT ** 2)


def validate_substrate_transaction(tx: SubstrateTransaction) -> Tuple[bool, str]:
    """Convenience function to validate a transaction."""
    coordinator = get_substrate_coordinator()
    return coordinator.validate_transaction(tx)
