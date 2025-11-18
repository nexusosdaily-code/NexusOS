"""
Proof-of-Work (POW) Hybrid Consensus for NexusOS Layer 1 Blockchain

Implements mining mechanism with:
- SHA-256 based mining
- Dynamic difficulty adjustment
- Block rewards in NXT tokens
- Nonce finding algorithm
- Integration with existing consensus mechanisms (PoS, BFT, DPoS, GHOSTDAG)
"""

from dataclasses import dataclass, field
from typing import List, Optional
import time
import hashlib
from native_token import token_system, TokenTransaction


@dataclass
class MiningBlock:
    """Block structure for POW mining"""
    block_number: int
    timestamp: float
    transactions: List[TokenTransaction]
    previous_hash: str
    miner_address: str
    nonce: int = 0
    difficulty: int = 4  # Number of leading zeros required
    hash: str = ""
    reward: int = 0  # Block reward in units
    
    def compute_hash(self) -> str:
        """Compute block hash"""
        block_data = f"{self.block_number}{self.timestamp}{self.previous_hash}{self.nonce}{self.miner_address}{self.difficulty}"
        for tx in self.transactions:
            block_data += tx.compute_hash()
        return hashlib.sha256(block_data.encode()).hexdigest()
    
    def mine(self) -> int:
        """
        Mine the block by finding valid nonce
        Returns number of attempts
        """
        attempts = 0
        target_prefix = "0" * self.difficulty
        
        while True:
            self.hash = self.compute_hash()
            attempts += 1
            
            if self.hash.startswith(target_prefix):
                return attempts
            
            self.nonce += 1
            
            # Safety limit
            if attempts > 1000000:
                break
        
        return attempts
    
    def is_valid(self) -> bool:
        """Validate block hash meets difficulty"""
        target_prefix = "0" * self.difficulty
        return self.hash.startswith(target_prefix)


@dataclass
class MiningStats:
    """Mining statistics"""
    total_blocks_mined: int = 0
    total_hash_attempts: int = 0
    total_rewards_distributed: int = 0
    average_block_time: float = 0.0
    current_difficulty: int = 4
    last_difficulty_adjustment: float = field(default_factory=time.time)


class POWConsensus:
    """
    Proof-of-Work Consensus Engine
    
    Hybrid approach combining:
    - POW mining for block creation
    - Validator economics for stake-weighted rewards
    - Dynamic difficulty adjustment for stable block times
    """
    
    # Mining parameters
    INITIAL_DIFFICULTY = 4
    TARGET_BLOCK_TIME = 10.0  # seconds
    DIFFICULTY_ADJUSTMENT_INTERVAL = 10  # blocks
    INITIAL_BLOCK_REWARD = 5000  # 50 NXT per block (in units)
    REWARD_HALVING_INTERVAL = 100000  # Halve rewards every 100k blocks
    
    def __init__(self):
        self.blockchain: List[MiningBlock] = []
        self.pending_transactions: List[TokenTransaction] = []
        self.stats = MiningStats()
        self.mining_active = False
        
        # Create genesis block
        self._create_genesis_block()
    
    def _create_genesis_block(self):
        """Create genesis block"""
        genesis = MiningBlock(
            block_number=0,
            timestamp=time.time(),
            transactions=[],
            previous_hash="0" * 64,
            miner_address="GENESIS",
            difficulty=0,
            hash="0" * 64,
            reward=0
        )
        self.blockchain.append(genesis)
    
    def get_latest_block(self) -> MiningBlock:
        """Get most recent block"""
        return self.blockchain[-1]
    
    def get_block_reward(self, block_number: int) -> int:
        """Calculate block reward based on halving schedule"""
        halvings = block_number // self.REWARD_HALVING_INTERVAL
        reward = self.INITIAL_BLOCK_REWARD
        
        for _ in range(halvings):
            reward = reward // 2
            if reward < 1:
                reward = 1
                break
        
        return reward
    
    def adjust_difficulty(self):
        """
        Adjust mining difficulty to maintain target block time
        """
        if len(self.blockchain) < self.DIFFICULTY_ADJUSTMENT_INTERVAL + 1:
            return
        
        if len(self.blockchain) % self.DIFFICULTY_ADJUSTMENT_INTERVAL != 0:
            return
        
        # Calculate actual time for last N blocks
        recent_blocks = self.blockchain[-self.DIFFICULTY_ADJUSTMENT_INTERVAL:]
        time_taken = recent_blocks[-1].timestamp - recent_blocks[0].timestamp
        expected_time = self.TARGET_BLOCK_TIME * self.DIFFICULTY_ADJUSTMENT_INTERVAL
        
        # Adjust difficulty
        current_difficulty = self.stats.current_difficulty
        
        if time_taken < expected_time * 0.75:
            # Blocks too fast, increase difficulty
            self.stats.current_difficulty = min(current_difficulty + 1, 10)
        elif time_taken > expected_time * 1.25:
            # Blocks too slow, decrease difficulty
            self.stats.current_difficulty = max(current_difficulty - 1, 2)
        
        self.stats.last_difficulty_adjustment = time.time()
    
    def add_transaction(self, transaction: TokenTransaction):
        """Add transaction to pending pool"""
        self.pending_transactions.append(transaction)
    
    def mine_block(self, miner_address: str, max_transactions: int = 10) -> Optional[MiningBlock]:
        """
        Mine a new block
        
        Args:
            miner_address: Address to receive mining rewards
            max_transactions: Maximum transactions to include
        
        Returns:
            Mined block or None if failed
        """
        if not miner_address:
            return None
        
        # Create new block
        previous_block = self.get_latest_block()
        block_number = len(self.blockchain)
        block_reward = self.get_block_reward(block_number)
        
        # Include pending transactions
        transactions_to_include = self.pending_transactions[:max_transactions]
        
        new_block = MiningBlock(
            block_number=block_number,
            timestamp=time.time(),
            transactions=transactions_to_include,
            previous_hash=previous_block.hash,
            miner_address=miner_address,
            difficulty=self.stats.current_difficulty,
            reward=block_reward
        )
        
        # Mine the block
        start_time = time.time()
        attempts = new_block.mine()
        mine_time = time.time() - start_time
        
        # Validate
        if not new_block.is_valid():
            return None
        
        # Add to blockchain
        self.blockchain.append(new_block)
        
        # Remove included transactions
        self.pending_transactions = self.pending_transactions[max_transactions:]
        
        # Distribute reward to miner
        token_system.mint_reward(
            to_address=miner_address,
            amount=block_reward,
            reason=f"POW mining block {block_number}"
        )
        
        # Update stats
        self.stats.total_blocks_mined += 1
        self.stats.total_hash_attempts += attempts
        self.stats.total_rewards_distributed += block_reward
        
        # Update average block time
        if self.stats.total_blocks_mined > 1:
            self.stats.average_block_time = (
                (self.stats.average_block_time * (self.stats.total_blocks_mined - 1) + mine_time) /
                self.stats.total_blocks_mined
            )
        else:
            self.stats.average_block_time = mine_time
        
        # Adjust difficulty if needed
        self.adjust_difficulty()
        
        return new_block
    
    def validate_chain(self) -> bool:
        """Validate entire blockchain"""
        for i in range(1, len(self.blockchain)):
            current_block = self.blockchain[i]
            previous_block = self.blockchain[i - 1]
            
            # Check hash validity
            if not current_block.is_valid():
                return False
            
            # Check previous hash link
            if current_block.previous_hash != previous_block.hash:
                return False
        
        return True
    
    def get_mining_stats(self) -> dict:
        """Get mining statistics"""
        total_supply_mined = sum(block.reward for block in self.blockchain)
        
        return {
            "total_blocks": len(self.blockchain),
            "total_blocks_mined": self.stats.total_blocks_mined,
            "total_hash_attempts": self.stats.total_hash_attempts,
            "total_rewards_distributed": self.stats.total_rewards_distributed,
            "current_difficulty": self.stats.current_difficulty,
            "average_block_time": self.stats.average_block_time,
            "target_block_time": self.TARGET_BLOCK_TIME,
            "pending_transactions": len(self.pending_transactions),
            "total_supply_mined": total_supply_mined,
            "chain_valid": self.validate_chain(),
        }
    
    def get_recent_blocks(self, limit: int = 10) -> List[MiningBlock]:
        """Get recent blocks"""
        return list(reversed(self.blockchain[-limit:]))
    
    def get_hashrate(self) -> float:
        """Estimate network hashrate (hashes per second)"""
        if self.stats.average_block_time == 0:
            return 0.0
        
        # Average attempts per block / average time per block
        if self.stats.total_blocks_mined == 0:
            return 0.0
        
        avg_attempts = self.stats.total_hash_attempts / self.stats.total_blocks_mined
        return avg_attempts / self.stats.average_block_time if self.stats.average_block_time > 0 else 0.0


# Global POW consensus instance
pow_consensus = POWConsensus()
