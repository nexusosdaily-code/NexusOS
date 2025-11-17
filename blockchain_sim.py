"""
Mock Layer 1 Blockchain Simulation with Stress Testing
Comprehensive blockchain model demonstrating all features for a successful chain
"""

import time
import hashlib
import random
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import numpy as np
from collections import deque

class ConsensusType(Enum):
    """Consensus mechanism types"""
    PROOF_OF_STAKE = "Proof of Stake"
    PROOF_OF_WORK = "Proof of Work"
    BYZANTINE_FT = "Byzantine Fault Tolerant"
    DELEGATED_POS = "Delegated Proof of Stake"


class ValidatorStatus(Enum):
    """Validator node status"""
    ACTIVE = "active"
    OFFLINE = "offline"
    SLASHED = "slashed"
    FAULTY = "faulty"


@dataclass
class Transaction:
    """Blockchain transaction"""
    tx_id: str
    sender: str
    recipient: str
    amount: float
    fee: float
    timestamp: float
    signature: str = ""
    
    def to_dict(self) -> dict:
        return {
            'tx_id': self.tx_id,
            'sender': self.sender,
            'recipient': self.recipient,
            'amount': self.amount,
            'fee': self.fee,
            'timestamp': self.timestamp
        }
    
    def calculate_hash(self) -> str:
        """Calculate transaction hash"""
        tx_string = f"{self.tx_id}{self.sender}{self.recipient}{self.amount}{self.timestamp}"
        return hashlib.sha256(tx_string.encode()).hexdigest()


@dataclass
class Block:
    """Blockchain block"""
    height: int
    timestamp: float
    transactions: List[Transaction]
    previous_hash: str
    proposer: str
    hash: str = ""
    nonce: int = 0
    state_root: str = ""
    gas_used: int = 0
    gas_limit: int = 8000000
    
    def calculate_hash(self) -> str:
        """Calculate block hash"""
        tx_data = "".join([tx.calculate_hash() for tx in self.transactions])
        block_string = f"{self.height}{self.timestamp}{tx_data}{self.previous_hash}{self.nonce}"
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def to_dict(self) -> dict:
        return {
            'height': self.height,
            'timestamp': self.timestamp,
            'num_transactions': len(self.transactions),
            'previous_hash': self.previous_hash[:16] + "...",
            'hash': self.hash[:16] + "...",
            'proposer': self.proposer,
            'gas_used': self.gas_used
        }


@dataclass
class Validator:
    """Validator node"""
    address: str
    stake: float
    status: ValidatorStatus
    blocks_proposed: int = 0
    blocks_validated: int = 0
    uptime: float = 100.0
    latency_ms: float = 50.0
    reputation: float = 100.0
    
    def to_dict(self) -> dict:
        return {
            'address': self.address[:10] + "...",
            'stake': self.stake,
            'status': self.status.value,
            'blocks_proposed': self.blocks_proposed,
            'uptime': f"{self.uptime:.1f}%",
            'reputation': f"{self.reputation:.1f}"
        }


@dataclass
class NetworkPartition:
    """Network partition event"""
    affected_validators: List[str]
    start_time: float
    duration: float
    severity: str


@dataclass
class StressTestScenario:
    """Stress test configuration"""
    name: str
    duration_blocks: int
    target_tps: int  # Transactions per second
    validator_failure_rate: float
    network_partition_prob: float
    double_spend_attempts: int
    attack_type: str = "none"


class BlockchainSimulator:
    """Layer 1 Blockchain Simulator with Stress Testing"""
    
    def __init__(self, 
                 num_validators: int = 21,
                 consensus_type: ConsensusType = ConsensusType.PROOF_OF_STAKE,
                 block_time: float = 2.0):
        """
        Initialize blockchain simulator
        
        Args:
            num_validators: Number of validator nodes
            consensus_type: Consensus mechanism
            block_time: Target block time in seconds
        """
        self.num_validators = num_validators
        self.consensus_type = consensus_type
        self.block_time = block_time
        
        # Blockchain state
        self.chain: List[Block] = []
        self.mempool: List[Transaction] = []
        self.validators: Dict[str, Validator] = {}
        self.accounts: Dict[str, float] = {}
        
        # Performance metrics
        self.tps_history: List[float] = []
        self.block_times: List[float] = []
        self.finality_times: List[float] = []
        
        # Network state
        self.network_partitions: List[NetworkPartition] = []
        self.is_under_attack = False
        self.attack_type = "none"
        
        # Statistics
        self.total_transactions = 0
        self.total_blocks = 0
        self.total_fees_burned = 0.0
        self.total_value_transferred = 0.0
        
        # Initialize genesis
        self._initialize_genesis()
        self._initialize_validators()
    
    def _initialize_genesis(self):
        """Create genesis block"""
        genesis = Block(
            height=0,
            timestamp=time.time(),
            transactions=[],
            previous_hash="0" * 64,
            proposer="genesis"
        )
        genesis.hash = genesis.calculate_hash()
        self.chain.append(genesis)
        self.total_blocks = 1
    
    def _initialize_validators(self):
        """Initialize validator set"""
        for i in range(self.num_validators):
            address = f"validator_{i:03d}_{hashlib.sha256(str(i).encode()).hexdigest()[:8]}"
            stake = random.uniform(1000, 10000)  # Random initial stake
            
            validator = Validator(
                address=address,
                stake=stake,
                status=ValidatorStatus.ACTIVE
            )
            self.validators[address] = validator
            self.accounts[address] = stake
    
    def generate_transaction(self) -> Transaction:
        """Generate a random transaction"""
        active_accounts = list(self.accounts.keys())
        if len(active_accounts) < 2:
            # Create new accounts if needed
            for i in range(10):
                addr = f"user_{i:04d}_{hashlib.sha256(str(random.random()).encode()).hexdigest()[:8]}"
                self.accounts[addr] = random.uniform(100, 1000)
            active_accounts = list(self.accounts.keys())
        
        sender = random.choice(active_accounts)
        recipient = random.choice([a for a in active_accounts if a != sender])
        
        max_amount = self.accounts.get(sender, 100) * 0.1  # Max 10% of balance
        amount = random.uniform(0.1, max(0.1, max_amount))
        fee = amount * 0.001  # 0.1% fee
        
        tx = Transaction(
            tx_id=hashlib.sha256(str(random.random()).encode()).hexdigest()[:16],
            sender=sender,
            recipient=recipient,
            amount=amount,
            fee=fee,
            timestamp=time.time()
        )
        tx.signature = tx.calculate_hash()
        
        return tx
    
    def add_transaction(self, tx: Transaction) -> bool:
        """Add transaction to mempool"""
        # Validate transaction
        if tx.sender not in self.accounts:
            return False
        if self.accounts[tx.sender] < (tx.amount + tx.fee):
            return False
        
        self.mempool.append(tx)
        return True
    
    def select_block_proposer(self) -> Optional[Validator]:
        """Select next block proposer based on consensus"""
        active_validators = [v for v in self.validators.values() 
                           if v.status == ValidatorStatus.ACTIVE]
        
        if not active_validators:
            return None
        
        if self.consensus_type == ConsensusType.PROOF_OF_STAKE:
            # Stake-weighted random selection
            total_stake = sum(v.stake for v in active_validators)
            if total_stake == 0:
                return random.choice(active_validators)
            
            weights = [v.stake / total_stake for v in active_validators]
            idx = np.random.choice(len(active_validators), p=weights)
            return active_validators[idx]
        
        elif self.consensus_type == ConsensusType.DELEGATED_POS:
            # Round-robin among top validators
            active_validators.sort(key=lambda v: v.stake, reverse=True)
            idx = self.total_blocks % len(active_validators)
            return active_validators[idx]
        
        else:
            # Random selection for others
            return random.choice(active_validators)
    
    def create_block(self, max_transactions: int = 100) -> Optional[Block]:
        """Create new block from mempool"""
        if not self.mempool:
            return None
        
        proposer = self.select_block_proposer()
        if not proposer:
            return None
        
        # Select transactions
        selected_txs = self.mempool[:max_transactions]
        self.mempool = self.mempool[max_transactions:]
        
        # Create block
        previous_block = self.chain[-1]
        block = Block(
            height=len(self.chain),
            timestamp=time.time(),
            transactions=selected_txs,
            previous_hash=previous_block.hash,
            proposer=proposer.address
        )
        
        # Calculate gas
        block.gas_used = len(selected_txs) * 21000  # Simplified gas calculation
        
        # Calculate hash
        block.hash = block.calculate_hash()
        block.state_root = hashlib.sha256(f"state_{block.height}".encode()).hexdigest()
        
        return block
    
    def execute_block(self, block: Block) -> bool:
        """Execute block transactions and update state"""
        # Process transactions
        for tx in block.transactions:
            if tx.sender in self.accounts and self.accounts[tx.sender] >= (tx.amount + tx.fee):
                # Deduct from sender
                self.accounts[tx.sender] -= (tx.amount + tx.fee)
                
                # Add to recipient
                if tx.recipient not in self.accounts:
                    self.accounts[tx.recipient] = 0
                self.accounts[tx.recipient] += tx.amount
                
                # Burn fees (deflationary mechanism)
                self.total_fees_burned += tx.fee
                self.total_value_transferred += tx.amount
                self.total_transactions += 1
        
        # Reward proposer
        proposer = self.validators.get(block.proposer)
        if proposer:
            block_reward = 2.0  # Simplified block reward
            self.accounts[block.proposer] = self.accounts.get(block.proposer, 0) + block_reward
            proposer.blocks_proposed += 1
        
        # Add to chain
        self.chain.append(block)
        self.total_blocks += 1
        
        # Update metrics
        if len(self.chain) > 1:
            block_time = block.timestamp - self.chain[-2].timestamp
            self.block_times.append(block_time)
            
            tps = len(block.transactions) / block_time if block_time > 0 else 0
            self.tps_history.append(tps)
        
        return True
    
    def apply_stress_test(self, scenario: StressTestScenario):
        """Apply stress test scenario"""
        self.is_under_attack = scenario.attack_type != "none"
        self.attack_type = scenario.attack_type
        
        # Apply validator failures
        if scenario.validator_failure_rate > 0:
            active_validators = [v for v in self.validators.values() 
                               if v.status == ValidatorStatus.ACTIVE]
            num_failures = int(len(active_validators) * scenario.validator_failure_rate)
            
            for validator in random.sample(active_validators, num_failures):
                validator.status = ValidatorStatus.OFFLINE
                validator.uptime *= 0.5
        
        # Apply network partition
        if random.random() < scenario.network_partition_prob:
            num_affected = random.randint(1, self.num_validators // 3)
            affected = random.sample(list(self.validators.keys()), num_affected)
            
            partition = NetworkPartition(
                affected_validators=affected,
                start_time=time.time(),
                duration=random.uniform(5, 15),
                severity="high" if num_affected > self.num_validators // 4 else "medium"
            )
            self.network_partitions.append(partition)
            
            # Mark validators as faulty during partition
            for addr in affected:
                if self.validators[addr].status == ValidatorStatus.ACTIVE:
                    self.validators[addr].status = ValidatorStatus.FAULTY
    
    def recover_from_stress(self):
        """Recover from stress test"""
        self.is_under_attack = False
        self.attack_type = "none"
        
        # Recover offline validators
        for validator in self.validators.values():
            if validator.status == ValidatorStatus.OFFLINE:
                if random.random() > 0.3:  # 70% recovery rate
                    validator.status = ValidatorStatus.ACTIVE
                    validator.uptime = min(100, validator.uptime + 20)
            
            if validator.status == ValidatorStatus.FAULTY:
                validator.status = ValidatorStatus.ACTIVE
        
        # Clear network partitions
        self.network_partitions = []
    
    def run_simulation(self, num_blocks: int = 10, transactions_per_block: int = 50):
        """Run blockchain simulation"""
        for _ in range(num_blocks):
            # Generate transactions
            for _ in range(transactions_per_block):
                tx = self.generate_transaction()
                self.add_transaction(tx)
            
            # Create and execute block
            block = self.create_block(max_transactions=transactions_per_block)
            if block:
                self.execute_block(block)
                time.sleep(0.01)  # Small delay for visualization
    
    def get_network_health(self) -> dict:
        """Calculate network health metrics"""
        active_validators = sum(1 for v in self.validators.values() 
                               if v.status == ValidatorStatus.ACTIVE)
        total_validators = len(self.validators)
        
        avg_uptime = np.mean([v.uptime for v in self.validators.values()])
        avg_tps = np.mean(self.tps_history[-100:]) if self.tps_history else 0
        avg_block_time = np.mean(self.block_times[-100:]) if self.block_times else 0
        
        return {
            'active_validators': active_validators,
            'total_validators': total_validators,
            'validator_health': (active_validators / total_validators) * 100,
            'avg_uptime': avg_uptime,
            'avg_tps': avg_tps,
            'avg_block_time': avg_block_time,
            'chain_height': len(self.chain),
            'mempool_size': len(self.mempool),
            'under_attack': self.is_under_attack,
            'attack_type': self.attack_type
        }
    
    def get_chain_stats(self) -> dict:
        """Get blockchain statistics"""
        total_supply = sum(self.accounts.values())
        
        return {
            'total_blocks': self.total_blocks,
            'total_transactions': self.total_transactions,
            'total_value_transferred': self.total_value_transferred,
            'total_fees_burned': self.total_fees_burned,
            'total_supply': total_supply,
            'num_accounts': len(self.accounts),
            'num_validators': len(self.validators),
            'consensus_type': self.consensus_type.value
        }


# Predefined stress test scenarios
STRESS_TEST_SCENARIOS = {
    "High TPS Load": StressTestScenario(
        name="High TPS Load",
        duration_blocks=20,
        target_tps=5000,
        validator_failure_rate=0.0,
        network_partition_prob=0.0,
        double_spend_attempts=0,
        attack_type="none"
    ),
    "Network Partition": StressTestScenario(
        name="Network Partition",
        duration_blocks=15,
        target_tps=1000,
        validator_failure_rate=0.0,
        network_partition_prob=0.8,
        double_spend_attempts=0,
        attack_type="partition"
    ),
    "Validator Failures": StressTestScenario(
        name="Validator Failures",
        duration_blocks=20,
        target_tps=1000,
        validator_failure_rate=0.4,
        network_partition_prob=0.0,
        double_spend_attempts=0,
        attack_type="validator_failure"
    ),
    "51% Attack Attempt": StressTestScenario(
        name="51% Attack Attempt",
        duration_blocks=15,
        target_tps=2000,
        validator_failure_rate=0.0,
        network_partition_prob=0.0,
        double_spend_attempts=10,
        attack_type="51_percent"
    ),
    "Combined Stress": StressTestScenario(
        name="Combined Stress (Severe)",
        duration_blocks=25,
        target_tps=8000,
        validator_failure_rate=0.3,
        network_partition_prob=0.5,
        double_spend_attempts=5,
        attack_type="combined"
    ),
    "Flash Crash": StressTestScenario(
        name="Flash Crash Event",
        duration_blocks=10,
        target_tps=15000,
        validator_failure_rate=0.5,
        network_partition_prob=0.7,
        double_spend_attempts=20,
        attack_type="flash_crash"
    )
}
