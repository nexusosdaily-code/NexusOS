"""
Native Payment Token System for NexusOS Layer 1 Blockchain

NexusToken (NXT): The native currency powering the entire ecosystem
- Total Supply: 1,000,000 NXT
- Denomination: 100 units = 1 NXT (smallest unit: 0.01 NXT)
- Use Cases: Validator rewards, messaging payments, DEX trading, transaction fees
- Deflationary Model: Tokens burned for messaging activities
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum
import time
import hashlib


class TransactionType(Enum):
    """Types of token transactions"""
    TRANSFER = "transfer"
    BURN = "burn"
    MINT = "mint"
    REWARD = "reward"
    FEE = "fee"
    MESSAGE_PAYMENT = "message_payment"
    LINK_SHARE_PAYMENT = "link_share_payment"
    VIDEO_SHARE_PAYMENT = "video_share_payment"


@dataclass
class TokenTransaction:
    """Represents a token transaction"""
    tx_id: str
    tx_type: TransactionType
    from_address: str
    to_address: str
    amount: int  # In smallest units (0.01 NXT)
    fee: int = 0
    timestamp: float = field(default_factory=time.time)
    data: dict = field(default_factory=dict)
    signature: str = ""
    
    def compute_hash(self) -> str:
        """Compute transaction hash"""
        tx_data = f"{self.tx_id}{self.tx_type.value}{self.from_address}{self.to_address}{self.amount}{self.fee}{self.timestamp}"
        return hashlib.sha256(tx_data.encode()).hexdigest()


@dataclass
class Account:
    """Token account"""
    address: str
    balance: int = 0  # In smallest units
    nonce: int = 0
    created_at: float = field(default_factory=time.time)
    
    def get_balance_nxt(self) -> float:
        """Get balance in NXT (human-readable)"""
        return self.balance / 100.0
    
    def has_sufficient_balance(self, amount: int) -> bool:
        """Check if account has sufficient balance"""
        return self.balance >= amount


class NativeTokenSystem:
    """
    Native Token System for NexusOS
    
    Token Economics:
    - Total Supply: 1,000,000 NXT (100,000,000 units)
    - Circulating Supply: Total - Burned
    - Deflationary: Tokens burned for messaging activities
    - Inflationary: Block rewards for validators (controlled rate)
    """
    
    # Token constants
    TOTAL_SUPPLY = 100_000_000  # 1M NXT in units (100 units = 1 NXT)
    UNITS_PER_NXT = 100
    GENESIS_SUPPLY = 50_000_000  # 500K NXT for genesis distribution
    VALIDATOR_RESERVE = 30_000_000  # 300K NXT for validator rewards
    ECOSYSTEM_RESERVE = 20_000_000  # 200K NXT for ecosystem development
    
    # Burn rates for messaging activities (in units)
    MESSAGE_BURN_RATE = 10  # 0.1 NXT per encrypted message
    LINK_SHARE_BURN_RATE = 5  # 0.05 NXT per link share
    VIDEO_SHARE_BURN_RATE = 20  # 0.2 NXT per video share
    
    # Transaction fees
    BASE_TRANSFER_FEE = 1  # 0.01 NXT
    
    def __init__(self):
        self.accounts: Dict[str, Account] = {}
        self.transactions: List[TokenTransaction] = []
        self.total_burned: int = 0
        self.total_minted: int = self.TOTAL_SUPPLY  # All tokens minted at genesis
        self.tx_counter: int = 0
        
        # Genesis account
        self._create_genesis_accounts()
    
    def _create_genesis_accounts(self):
        """Create initial accounts with genesis distribution"""
        # Main treasury account
        self.create_account("TREASURY", initial_balance=self.GENESIS_SUPPLY)
        
        # Validator rewards pool
        self.create_account("VALIDATOR_POOL", initial_balance=self.VALIDATOR_RESERVE)
        
        # Ecosystem development fund
        self.create_account("ECOSYSTEM_FUND", initial_balance=self.ECOSYSTEM_RESERVE)
        
        # Burn address (tokens sent here are burned)
        self.create_account("BURN_ADDRESS", initial_balance=0)
    
    def create_account(self, address: str, initial_balance: int = 0) -> Account:
        """Create new account"""
        if address in self.accounts:
            return self.accounts[address]
        
        account = Account(address=address, balance=initial_balance)
        self.accounts[address] = account
        return account
    
    def get_account(self, address: str) -> Optional[Account]:
        """Get account by address"""
        return self.accounts.get(address)
    
    def get_or_create_account(self, address: str) -> Account:
        """Get existing account or create new one"""
        if address not in self.accounts:
            return self.create_account(address)
        return self.accounts[address]
    
    def transfer(self, from_address: str, to_address: str, amount: int, fee: int = None) -> Optional[TokenTransaction]:
        """Transfer tokens between accounts"""
        if fee is None:
            fee = self.BASE_TRANSFER_FEE
        
        from_account = self.get_account(from_address)
        if not from_account:
            return None
        
        total_deduct = amount + fee
        if not from_account.has_sufficient_balance(total_deduct):
            return None
        
        # Deduct from sender
        from_account.balance -= total_deduct
        from_account.nonce += 1
        
        # Add to receiver
        to_account = self.get_or_create_account(to_address)
        to_account.balance += amount
        
        # Fee goes to validator pool (or can be distributed to validators)
        if fee > 0:
            validator_pool = self.get_account("VALIDATOR_POOL")
            if validator_pool:
                validator_pool.balance += fee
        
        # Create transaction record
        tx = TokenTransaction(
            tx_id=f"TX{self.tx_counter:08d}",
            tx_type=TransactionType.TRANSFER,
            from_address=from_address,
            to_address=to_address,
            amount=amount,
            fee=fee
        )
        self.tx_counter += 1
        self.transactions.append(tx)
        
        return tx
    
    def burn(self, from_address: str, amount: int, reason: str = "") -> Optional[TokenTransaction]:
        """Burn tokens (deflationary mechanism)"""
        from_account = self.get_account(from_address)
        if not from_account or not from_account.has_sufficient_balance(amount):
            return None
        
        # Deduct from account
        from_account.balance -= amount
        from_account.nonce += 1
        
        # Update total burned
        self.total_burned += amount
        
        # Optional: track in burn address
        burn_account = self.get_account("BURN_ADDRESS")
        if burn_account:
            burn_account.balance += amount
        
        # Create transaction record
        tx = TokenTransaction(
            tx_id=f"TX{self.tx_counter:08d}",
            tx_type=TransactionType.BURN,
            from_address=from_address,
            to_address="BURN_ADDRESS",
            amount=amount,
            data={"reason": reason}
        )
        self.tx_counter += 1
        self.transactions.append(tx)
        
        return tx
    
    def mint_reward(self, to_address: str, amount: int, reason: str = "") -> Optional[TokenTransaction]:
        """Mint new tokens as validator rewards (controlled inflation)"""
        # Check if we have reserve
        validator_pool = self.get_account("VALIDATOR_POOL")
        if not validator_pool or not validator_pool.has_sufficient_balance(amount):
            return None
        
        # Deduct from validator pool
        validator_pool.balance -= amount
        
        # Add to recipient
        to_account = self.get_or_create_account(to_address)
        to_account.balance += amount
        
        # Create transaction record
        tx = TokenTransaction(
            tx_id=f"TX{self.tx_counter:08d}",
            tx_type=TransactionType.REWARD,
            from_address="VALIDATOR_POOL",
            to_address=to_address,
            amount=amount,
            data={"reason": reason}
        )
        self.tx_counter += 1
        self.transactions.append(tx)
        
        return tx
    
    def pay_for_message(self, from_address: str) -> Optional[TokenTransaction]:
        """Pay and burn tokens for sending encrypted message"""
        tx = self.burn(from_address, self.MESSAGE_BURN_RATE, "Encrypted message payment")
        if tx:
            tx.tx_type = TransactionType.MESSAGE_PAYMENT
        return tx
    
    def pay_for_link_share(self, from_address: str) -> Optional[TokenTransaction]:
        """Pay and burn tokens for sharing link"""
        tx = self.burn(from_address, self.LINK_SHARE_BURN_RATE, "Link share payment")
        if tx:
            tx.tx_type = TransactionType.LINK_SHARE_PAYMENT
        return tx
    
    def pay_for_video_share(self, from_address: str) -> Optional[TokenTransaction]:
        """Pay and burn tokens for sharing video"""
        tx = self.burn(from_address, self.VIDEO_SHARE_BURN_RATE, "Video share payment")
        if tx:
            tx.tx_type = TransactionType.VIDEO_SHARE_PAYMENT
        return tx
    
    def get_circulating_supply(self) -> int:
        """Calculate circulating supply (total minted - burned)"""
        return self.total_minted - self.total_burned
    
    def get_total_supply(self) -> int:
        """Get total possible supply"""
        return self.TOTAL_SUPPLY
    
    def get_burn_rate(self) -> float:
        """Calculate current burn rate (percentage)"""
        if self.total_minted == 0:
            return 0.0
        return (self.total_burned / self.total_minted) * 100
    
    def get_token_stats(self) -> dict:
        """Get comprehensive token statistics"""
        validator_pool = self.get_account("VALIDATOR_POOL")
        ecosystem_fund = self.get_account("ECOSYSTEM_FUND")
        
        return {
            "total_supply": self.TOTAL_SUPPLY,
            "total_minted": self.total_minted,
            "circulating_supply": self.get_circulating_supply(),
            "total_burned": self.total_burned,
            "burn_rate_percent": self.get_burn_rate(),
            "total_accounts": len(self.accounts),
            "total_transactions": len(self.transactions),
            "validator_reserve": validator_pool.balance if validator_pool else 0,
            "ecosystem_reserve": ecosystem_fund.balance if ecosystem_fund else 0,
        }
    
    def get_account_transactions(self, address: str, limit: int = 100) -> List[TokenTransaction]:
        """Get transactions for an account"""
        account_txs = [
            tx for tx in self.transactions
            if tx.from_address == address or tx.to_address == address
        ]
        return sorted(account_txs, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def units_to_nxt(self, units: int) -> float:
        """Convert units to NXT"""
        return units / self.UNITS_PER_NXT
    
    def nxt_to_units(self, nxt: float) -> int:
        """Convert NXT to units"""
        return int(nxt * self.UNITS_PER_NXT)
    
    def format_balance(self, units: int) -> str:
        """Format balance for display"""
        nxt = self.units_to_nxt(units)
        return f"{nxt:,.2f} NXT"


# Global token system instance
token_system = NativeTokenSystem()
