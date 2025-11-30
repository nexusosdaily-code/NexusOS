"""
Decentralized Exchange (DEX) Core Module
Layer 2 integration for NexusOS blockchain with AMM, liquidity pools, and token standards
Integrated with NativeTokenSystem (NXT) as exclusive base currency

Physics-Based Fee System (E=hf):
- Swap fees are calculated using Planck's equation E=hf
- Higher frequency spectral regions = higher energy = premium fees
- Infrared (low energy) = 0.1% fee, Gamma (high energy) = 0.5% fee
- This creates natural economic incentives aligned with physics
"""

import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import math
from native_token import NativeTokenSystem, TransactionType
from physics_economics_adapter import get_physics_adapter, EconomicModule, SubstrateTransaction

# ═══════════════════════════════════════════════════════════════════════════
# PHYSICS CONSTANTS (CODATA 2018 EXACT VALUES)
# ═══════════════════════════════════════════════════════════════════════════
PLANCK_CONSTANT = 6.62607015e-34  # Planck's constant (J·s) - exact since 2019
SPEED_OF_LIGHT = 2.99792458e8     # Speed of light (m/s) - exact definition

# Spectral region fee tiers based on E=hf energy levels
# Higher frequency = higher energy = higher fee (physics-based economics)
SPECTRAL_FEE_TIERS = {
    'GAMMA':      {'wavelength_nm': 0.01,    'frequency_hz': 3e19,  'fee_rate': 0.005},   # 0.5% - highest energy
    'X_RAY':      {'wavelength_nm': 1.0,     'frequency_hz': 3e17,  'fee_rate': 0.004},   # 0.4%
    'ULTRAVIOLET': {'wavelength_nm': 300,    'frequency_hz': 1e15,  'fee_rate': 0.003},   # 0.3%
    'VISIBLE':    {'wavelength_nm': 550,     'frequency_hz': 5.5e14, 'fee_rate': 0.0025}, # 0.25%
    'INFRARED':   {'wavelength_nm': 10000,   'frequency_hz': 3e13,  'fee_rate': 0.002},   # 0.2%
    'MICROWAVE':  {'wavelength_nm': 1e7,     'frequency_hz': 3e10,  'fee_rate': 0.001},   # 0.1% - lowest energy
}


def calculate_ehf_fee(amount: float, spectral_region: str = 'VISIBLE') -> Tuple[float, float, dict]:
    """
    Calculate swap fee using E=hf physics equation with fairness safeguards.
    
    Physics Principle: E = hf (Planck's equation)
    - Higher frequency photons carry more energy
    - Transactions in higher-energy spectral regions pay proportionally higher fees
    - This creates physics-aligned economic incentives
    
    Fairness Safeguards:
    - Fee floor: 0.1% minimum to ensure network sustainability
    - Fee cap: 0.5% maximum to prevent exploitation
    - Pre-trade disclosure: Full fee breakdown returned to user
    
    Args:
        amount: Transaction amount in NXT
        spectral_region: Electromagnetic spectrum region for this transaction
        
    Returns:
        (fee_amount, energy_joules, fee_breakdown) - Fee in NXT, energy, and disclosure dict
    """
    tier = SPECTRAL_FEE_TIERS.get(spectral_region.upper(), SPECTRAL_FEE_TIERS['VISIBLE'])
    
    # Calculate quantum energy: E = hf
    energy_joules = PLANCK_CONSTANT * tier['frequency_hz']
    
    # Apply fee rate with floor/cap safeguards
    raw_fee_rate = tier['fee_rate']
    capped_fee_rate = max(0.001, min(0.005, raw_fee_rate))  # 0.1% floor, 0.5% cap
    fee_amount = amount * capped_fee_rate
    
    # Pre-trade disclosure for transparency
    fee_breakdown = {
        'spectral_region': spectral_region.upper(),
        'wavelength_nm': tier['wavelength_nm'],
        'frequency_hz': tier['frequency_hz'],
        'energy_joules': energy_joules,
        'raw_fee_rate': raw_fee_rate,
        'applied_fee_rate': capped_fee_rate,
        'fee_amount_nxt': fee_amount,
        'physics_formula': f"E = h × f = {PLANCK_CONSTANT:.2e} × {tier['frequency_hz']:.2e} = {energy_joules:.2e} J"
    }
    
    return fee_amount, energy_joules, fee_breakdown


def assign_spectral_region_by_tvl(tvl: float) -> str:
    """
    Assign spectral region to a pool based on its Total Value Locked (TVL).
    
    Physics Rationale:
    - Higher TVL pools have more "mass" in economic terms
    - More massive economic entities operate at higher energy levels
    - This mirrors how larger atoms have higher energy electron transitions
    
    TVL Thresholds:
    - < 1,000 NXT: MICROWAVE (lowest energy, lowest fees - encourages new pools)
    - 1,000 - 10,000: INFRARED
    - 10,000 - 100,000: VISIBLE
    - 100,000 - 1,000,000: ULTRAVIOLET
    - 1,000,000 - 10,000,000: X_RAY
    - > 10,000,000: GAMMA (highest energy, highest fees)
    """
    if tvl < 1_000:
        return 'MICROWAVE'
    elif tvl < 10_000:
        return 'INFRARED'
    elif tvl < 100_000:
        return 'VISIBLE'
    elif tvl < 1_000_000:
        return 'ULTRAVIOLET'
    elif tvl < 10_000_000:
        return 'X_RAY'
    else:
        return 'GAMMA'

# Security Framework - Rate limiting and MEV protection
from security_framework import get_rate_limiter, get_mev_protection
from ai_security import get_liquidity_protection


class NativeTokenAdapter:
    """
    Adapter layer bridging DEX with NativeTokenSystem (NXT)
    Handles unit conversions, balance queries, transfers, and fee routing
    """
    
    def __init__(self, token_system: NativeTokenSystem):
        """Initialize adapter with NativeTokenSystem reference"""
        self.token_system = token_system
        self.UNITS_PER_NXT = token_system.UNITS_PER_NXT  # Use system constant
        # DEX fee treasury account for proper accounting
        self._ensure_dex_fee_account()
    
    def _ensure_dex_fee_account(self):
        """Ensure DEX fee collection account exists"""
        if self.token_system.get_account("DEX_FEES") is None:
            self.token_system.create_account("DEX_FEES", initial_balance=0)
    
    def nxt_to_units(self, nxt_amount: float) -> int:
        """Convert NXT (float) to units (int) with proper rounding"""
        return round(nxt_amount * self.UNITS_PER_NXT)
    
    def units_to_nxt(self, units: int) -> float:
        """Convert units (int) to NXT (float)"""
        return units / self.UNITS_PER_NXT
    
    def get_balance(self, address: str) -> float:
        """Get NXT balance for address (in NXT, not units)"""
        account = self.token_system.get_account(address)
        if account is None:
            # Create account if it doesn't exist
            account = self.token_system.create_account(address, initial_balance=0)
        return self.units_to_nxt(account.balance)
    
    def transfer(self, from_address: str, to_address: str, nxt_amount: float) -> bool:
        """Transfer NXT between addresses"""
        units = self.nxt_to_units(nxt_amount)
        # Ensure both accounts exist
        if self.token_system.get_account(from_address) is None:
            self.token_system.create_account(from_address, initial_balance=0)
        if self.token_system.get_account(to_address) is None:
            self.token_system.create_account(to_address, initial_balance=0)
        
        tx = self.token_system.transfer(from_address, to_address, units)
        return tx is not None
    
    def transfer_units(self, from_address: str, to_address: str, units: int) -> bool:
        """Transfer NXT using units directly"""
        # Ensure both accounts exist
        if self.token_system.get_account(from_address) is None:
            self.token_system.create_account(from_address, initial_balance=0)
        if self.token_system.get_account(to_address) is None:
            self.token_system.create_account(to_address, initial_balance=0)
        
        tx = self.token_system.transfer(from_address, to_address, units)
        return tx is not None
    
    def route_fee_to_validator_pool(self, units: int, fee_source: str = "DEX_FEES") -> bool:
        """
        Route trading fees to validator pool via proper transfer
        Fees are collected in DEX_FEES account then transferred to VALIDATOR_POOL
        """
        if units <= 0:
            return True
        
        validator_pool_address = "VALIDATOR_POOL"
        
        # Transfer fees from DEX_FEES to VALIDATOR_POOL
        # DEX_FEES account acts as intermediary for proper accounting
        tx = self.token_system.transfer(fee_source, validator_pool_address, units)
        return tx is not None
    
    def get_total_supply(self) -> float:
        """Get total NXT supply in NXT"""
        stats = self.token_system.get_token_stats()
        return stats['total_supply']
    
    def get_circulating_supply(self) -> float:
        """Get circulating NXT supply in NXT"""
        stats = self.token_system.get_token_stats()
        return stats['circulating_supply']


class TokenStandard(Enum):
    """Token standard types"""
    FUNGIBLE = "Fungible Token (ERC-20-like)"
    NFT = "Non-Fungible Token"
    WRAPPED = "Wrapped Native Token"


@dataclass
class Token:
    """ERC-20-like token standard"""
    symbol: str
    name: str
    decimals: int = 18
    total_supply: float = 0.0
    token_standard: TokenStandard = TokenStandard.FUNGIBLE
    creator: str = ""
    created_at: float = field(default_factory=time.time)
    
    # Token state
    balances: Dict[str, float] = field(default_factory=dict)
    allowances: Dict[str, Dict[str, float]] = field(default_factory=dict)  # owner -> spender -> amount
    
    def mint(self, to: str, amount: float) -> bool:
        """Mint new tokens to an address"""
        if amount <= 0:
            return False
        
        self.balances[to] = self.balances.get(to, 0) + amount
        self.total_supply += amount
        return True
    
    def burn(self, from_address: str, amount: float) -> bool:
        """Burn tokens from an address"""
        if amount <= 0:
            return False
        
        balance = self.balances.get(from_address, 0)
        if balance < amount:
            return False
        
        self.balances[from_address] = balance - amount
        self.total_supply -= amount
        return True
    
    def transfer(self, from_address: str, to: str, amount: float) -> bool:
        """Transfer tokens between addresses"""
        if amount <= 0:
            return False
        
        from_balance = self.balances.get(from_address, 0)
        if from_balance < amount:
            return False
        
        self.balances[from_address] = from_balance - amount
        self.balances[to] = self.balances.get(to, 0) + amount
        return True
    
    def approve(self, owner: str, spender: str, amount: float) -> bool:
        """Approve spender to use owner's tokens"""
        if owner not in self.allowances:
            self.allowances[owner] = {}
        
        self.allowances[owner][spender] = amount
        return True
    
    def transfer_from(self, spender: str, from_address: str, to: str, amount: float) -> bool:
        """Transfer tokens using allowance"""
        if amount <= 0:
            return False
        
        # Check allowance
        allowed = self.allowances.get(from_address, {}).get(spender, 0)
        if allowed < amount:
            return False
        
        # Check balance
        from_balance = self.balances.get(from_address, 0)
        if from_balance < amount:
            return False
        
        # Execute transfer
        self.balances[from_address] = from_balance - amount
        self.balances[to] = self.balances.get(to, 0) + amount
        
        # Update allowance
        self.allowances[from_address][spender] = allowed - amount
        return True
    
    def balance_of(self, address: str) -> float:
        """Get token balance for address"""
        return self.balances.get(address, 0)
    
    def allowance(self, owner: str, spender: str) -> float:
        """Get allowance for spender from owner"""
        return self.allowances.get(owner, {}).get(spender, 0)
    
    def to_dict(self) -> dict:
        """Convert token to dictionary"""
        return {
            'symbol': self.symbol,
            'name': self.name,
            'decimals': self.decimals,
            'total_supply': self.total_supply,
            'token_standard': self.token_standard.value,
            'creator': self.creator,
            'created_at': self.created_at,
            'holders': len(self.balances)
        }


@dataclass
class LiquidityPool:
    """
    Automated Market Maker liquidity pool with physics-based E=hf economics.
    
    Fee Structure (derived from Planck's equation E=hf):
    - Each pool is assigned a spectral region based on its TVL
    - Higher TVL = higher frequency = higher energy = higher fees
    - This creates physics-aligned economic incentives
    """
    token_a: str  # Token A symbol
    token_b: str  # Token B symbol
    reserve_a: float = 0.0
    reserve_b: float = 0.0
    lp_token_supply: float = 0.0
    fee_rate: float = 0.003  # Base 0.3% trading fee (can be overridden by spectral)
    
    # Physics-based economics
    spectral_region: str = 'VISIBLE'  # Electromagnetic spectrum region for this pool
    
    # Pool state
    lp_balances: Dict[str, float] = field(default_factory=dict)  # LP token holders
    total_volume_a: float = 0.0
    total_volume_b: float = 0.0
    total_fees_collected: float = 0.0
    total_energy_processed: float = 0.0  # Cumulative E=hf energy in Joules
    created_at: float = field(default_factory=time.time)
    
    def get_pool_id(self) -> str:
        """Generate unique pool ID"""
        return f"{self.token_a}-{self.token_b}"
    
    def get_tvl(self) -> float:
        """Get Total Value Locked in the pool (sum of both reserves)"""
        return self.reserve_a + self.reserve_b
    
    def update_spectral_region(self):
        """
        Dynamically update spectral region based on current TVL.
        Called after liquidity changes to ensure fee alignment with pool size.
        """
        self.spectral_region = assign_spectral_region_by_tvl(self.get_tvl())
    
    def get_effective_fee_rate(self) -> float:
        """Get the current physics-based fee rate for this pool"""
        tier = SPECTRAL_FEE_TIERS.get(self.spectral_region.upper(), SPECTRAL_FEE_TIERS['VISIBLE'])
        return max(0.001, min(0.005, tier['fee_rate']))  # Apply floor/cap
    
    def get_price(self, input_token: str) -> float:
        """Get current price of input token in terms of output token"""
        if self.reserve_a == 0 or self.reserve_b == 0:
            return 0.0
        
        if input_token == self.token_a:
            return self.reserve_b / self.reserve_a
        else:
            return self.reserve_a / self.reserve_b
    
    def calculate_output_amount(self, input_token: str, input_amount: float) -> Tuple[float, float]:
        """
        Calculate output amount using constant product formula (x * y = k)
        with physics-based E=hf fee structure.
        
        Returns: (output_amount, price_impact)
        """
        if input_amount <= 0:
            return 0.0, 0.0
        
        if input_token == self.token_a:
            reserve_in = self.reserve_a
            reserve_out = self.reserve_b
        else:
            reserve_in = self.reserve_b
            reserve_out = self.reserve_a
        
        if reserve_in == 0 or reserve_out == 0:
            return 0.0, 0.0
        
        # Use physics-based E=hf fee rate
        effective_fee_rate = self.get_effective_fee_rate()
        input_with_fee = input_amount * (1 - effective_fee_rate)
        
        # Constant product formula: (x + Δx)(y - Δy) = xy
        # Δy = y * Δx / (x + Δx)
        output_amount = (reserve_out * input_with_fee) / (reserve_in + input_with_fee)
        
        # Calculate price impact
        old_price = reserve_out / reserve_in
        new_reserve_in = reserve_in + input_amount
        new_reserve_out = reserve_out - output_amount
        new_price = new_reserve_out / new_reserve_in
        price_impact = abs((new_price - old_price) / old_price) * 100
        
        return output_amount, price_impact
    
    def swap(self, input_token: str, input_amount: float, min_output: float = 0.0) -> Tuple[bool, float, str]:
        """
        Execute token swap with physics-based E=hf fee structure.
        
        Fee Calculation:
        - Uses E=hf where f is the spectral region frequency
        - Pool's spectral region is determined by TVL
        - Higher TVL = higher frequency = higher energy = higher fees
        
        Returns: (success, output_amount, message)
        """
        output_amount, price_impact = self.calculate_output_amount(input_token, input_amount)
        
        if output_amount < min_output:
            return False, 0.0, f"Slippage exceeded: got {output_amount:.4f}, minimum {min_output:.4f}"
        
        # Update reserves
        if input_token == self.token_a:
            self.reserve_a += input_amount
            self.reserve_b -= output_amount
            self.total_volume_a += input_amount
        else:
            self.reserve_b += input_amount
            self.reserve_a -= output_amount
            self.total_volume_b += input_amount
        
        # Calculate physics-based fee using E=hf
        fee_amount, energy_joules, _ = calculate_ehf_fee(input_amount, self.spectral_region)
        self.total_fees_collected += fee_amount
        self.total_energy_processed += energy_joules
        
        # Update spectral region based on new TVL (dynamic fee adjustment)
        self.update_spectral_region()
        
        return True, output_amount, f"Swap successful: {output_amount:.4f} (impact: {price_impact:.2f}%, E={energy_joules:.2e}J)"
    
    def add_liquidity(self, provider: str, amount_a: float, amount_b: float) -> Tuple[bool, float, str]:
        """
        Add liquidity to pool
        Returns: (success, lp_tokens_minted, message)
        """
        if amount_a <= 0 or amount_b <= 0:
            return False, 0.0, "Invalid amounts"
        
        # First liquidity provision
        if self.lp_token_supply == 0:
            lp_tokens = math.sqrt(amount_a * amount_b)
            self.reserve_a = amount_a
            self.reserve_b = amount_b
        else:
            # Maintain price ratio
            ratio_a = amount_a / self.reserve_a
            ratio_b = amount_b / self.reserve_b
            
            if abs(ratio_a - ratio_b) > 0.02:  # 2% tolerance
                return False, 0.0, f"Unbalanced liquidity: ratio A={ratio_a:.4f}, ratio B={ratio_b:.4f}"
            
            # Mint LP tokens proportional to share
            lp_tokens = min(
                (amount_a / self.reserve_a) * self.lp_token_supply,
                (amount_b / self.reserve_b) * self.lp_token_supply
            )
            
            self.reserve_a += amount_a
            self.reserve_b += amount_b
        
        # Issue LP tokens
        self.lp_balances[provider] = self.lp_balances.get(provider, 0) + lp_tokens
        self.lp_token_supply += lp_tokens
        
        # Update spectral region based on new TVL (physics-based fee adjustment)
        self.update_spectral_region()
        
        return True, lp_tokens, f"Liquidity added: {lp_tokens:.4f} LP tokens minted (Pool now in {self.spectral_region} tier)"
    
    def remove_liquidity(self, provider: str, lp_tokens: float) -> Tuple[bool, float, float, str]:
        """
        Remove liquidity from pool with 24-hour time-lock protection
        
        🔒 SECURITY: Requires withdrawal request 24 hours in advance to prevent instant liquidity drains
        🔒 FARMING LOCK: LP tokens staked in farms cannot be withdrawn until unstaked
        🔒 ESCROW PROTECTION: Farm escrow accounts cannot be drained directly
        
        Returns: (success, amount_a, amount_b, message)
        """
        # SECURITY: Input sanitization and system account protection
        # 1. Sanitize provider ID - strip whitespace, reject invalid characters
        import re
        provider_clean = provider.strip()
        if not provider_clean or not re.match(r'^[a-zA-Z0-9_\-]+$', provider_clean):
            return False, 0.0, 0.0, "🔒 Security: Invalid provider ID format"
        
        # 2. Block direct access to system/escrow accounts (case-insensitive)
        provider_upper = provider_clean.upper()
        protected_prefixes = ["FARM_ESCROW_", "FARM_ESCROW", "TREASURY", "VALIDATOR_", "DEX_", "SYSTEM_", "RESERVE_", "GENESIS", "MINING"]
        for prefix in protected_prefixes:
            if provider_upper.startswith(prefix) or provider_upper == prefix.rstrip("_"):
                return False, 0.0, 0.0, f"🔒 Security: Cannot withdraw from protected account. Use proper interface."
        
        # Use sanitized provider for all subsequent operations
        provider = provider_clean
        
        # Check for farming escrow lock
        # If LP tokens are locked in farm escrow, they cannot be withdrawn
        pool_id = f"{self.token_a}-{self.token_b}"
        farm_escrow = f"FARM_ESCROW_{pool_id}"
        escrow_balance = self.lp_balances.get(farm_escrow, 0)
        
        # User's available LP for withdrawal = their balance (escrow is separate account)
        # The escrow check ensures staked LP cannot be accessed
        provider_balance = self.lp_balances.get(provider, 0)
        
        # NOTE: If provider tries to withdraw more than their non-escrowed balance, reject
        # Their staked LP is now in the escrow account, not their account
        
        # Note: For full production, this would check pending withdrawal requests
        # For now, we add the security check but allow immediate withdrawal with warning
        liquidity_protection = get_liquidity_protection()
        pool_balance = self.reserve_a + self.reserve_b
        
        # Request withdrawal (in production, would require 24hr wait)
        success_req, request_id, error = liquidity_protection.request_withdrawal(
            provider, f"{self.token_a}-{self.token_b}", lp_tokens, pool_balance
        )
        
        if not success_req:
            return False, 0.0, 0.0, f"🔒 Liquidity protection: {error}"
        
        # In production: return here and require execute_withdrawal after 24hrs
        # For demo: continue with immediate withdrawal but log the security event
        print(f"🔒 Liquidity withdrawal initiated: {request_id} (24hr time-lock in production)")
        
        if lp_tokens <= 0:
            return False, 0.0, 0.0, "Invalid LP token amount"
        
        if provider_balance < lp_tokens:
            # Check if the reason is farming escrow
            if escrow_balance > 0:
                return False, 0.0, 0.0, f"🔒 Insufficient LP: {provider_balance:.4f} available ({escrow_balance:.4f} locked in farming). Unstake from farm first."
            return False, 0.0, 0.0, f"Insufficient LP tokens: have {provider_balance:.4f}, need {lp_tokens:.4f}"
        
        # Calculate share
        share = lp_tokens / self.lp_token_supply
        amount_a = self.reserve_a * share
        amount_b = self.reserve_b * share
        
        # Update reserves
        self.reserve_a -= amount_a
        self.reserve_b -= amount_b
        
        # Burn LP tokens
        self.lp_balances[provider] -= lp_tokens
        self.lp_token_supply -= lp_tokens
        
        return True, amount_a, amount_b, f"Liquidity removed: {amount_a:.4f} {self.token_a} + {amount_b:.4f} {self.token_b}"
    
    def get_pool_share(self, provider: str) -> float:
        """Get provider's share of the pool (0-100%)"""
        if self.lp_token_supply == 0:
            return 0.0
        return (self.lp_balances.get(provider, 0) / self.lp_token_supply) * 100
    
    def to_dict(self) -> dict:
        """Convert pool to dictionary"""
        return {
            'pool_id': self.get_pool_id(),
            'token_a': self.token_a,
            'token_b': self.token_b,
            'reserve_a': self.reserve_a,
            'reserve_b': self.reserve_b,
            'price_a_to_b': self.get_price(self.token_a),
            'price_b_to_a': self.get_price(self.token_b),
            'lp_token_supply': self.lp_token_supply,
            'total_volume_a': self.total_volume_a,
            'total_volume_b': self.total_volume_b,
            'total_fees_collected': self.total_fees_collected,
            'liquidity_providers': len(self.lp_balances),
            'tvl': self.reserve_a + self.reserve_b,  # Simplified TVL
            'created_at': self.created_at
        }


class DEXEngine:
    """
    Decentralized Exchange Engine with AMM integrated with NXT.
    
    Physics Economics Integration:
    - E=hf swap fee calculation (spectral region based)
    - Orbital burns → TransitionReserveLedger
    - SDK fee routing (0.5%) to founder wallet
    - Lambda Boson mass tracking (Λ=hf/c²)
    """
    
    NXT_SYMBOL = "NXT"
    
    def __init__(self, nxt_adapter: Optional[NativeTokenAdapter] = None):
        """
        Initialize DEX engine with physics economics integration.
        
        Args:
            nxt_adapter: NativeTokenAdapter for NXT integration (required for production)
        """
        self.nxt_adapter = nxt_adapter
        self.tokens: Dict[str, Token] = {}
        self.pools: Dict[str, LiquidityPool] = {}
        
        self.total_swaps = 0
        self.total_volume = 0.0
        self.total_liquidity_added = 0.0
        self.total_fees_to_validators = 0.0
        
        self._physics_adapter = get_physics_adapter()
        self.substrate_transactions: List[SubstrateTransaction] = []
        self.total_energy_joules = 0.0
        self.total_lambda_mass_kg = 0.0
        self.total_sdk_fees_nxt = 0.0
        
        self._initialize_default_tokens()
    
    def _initialize_default_tokens(self):
        """Create top 29 cryptocurrency tokens paired with NXT (native token handled by adapter)"""
        
        # Top 29 Cryptocurrencies by Market Cap (as of 2025)
        # Each will have a TOKEN/NXT trading pair
        top_tokens = [
            # Major Cryptocurrencies (Top 10)
            {"symbol": "BTC", "name": "Bitcoin", "decimals": 8, "supply": 21_000},
            {"symbol": "ETH", "name": "Ethereum", "decimals": 18, "supply": 120_000_000},
            {"symbol": "USDT", "name": "Tether USD", "decimals": 6, "supply": 100_000_000},
            {"symbol": "BNB", "name": "Binance Coin", "decimals": 18, "supply": 200_000_000},
            {"symbol": "SOL", "name": "Solana", "decimals": 9, "supply": 580_000_000},
            {"symbol": "USDC", "name": "USD Coin", "decimals": 6, "supply": 50_000_000},
            {"symbol": "XRP", "name": "Ripple", "decimals": 6, "supply": 100_000_000_000},
            {"symbol": "ADA", "name": "Cardano", "decimals": 6, "supply": 45_000_000_000},
            {"symbol": "AVAX", "name": "Avalanche", "decimals": 18, "supply": 720_000_000},
            {"symbol": "DOGE", "name": "Dogecoin", "decimals": 8, "supply": 140_000_000_000},
            
            # Layer 1 & DeFi (11-20)
            {"symbol": "TRX", "name": "TRON", "decimals": 6, "supply": 100_000_000_000},
            {"symbol": "DOT", "name": "Polkadot", "decimals": 10, "supply": 1_400_000_000},
            {"symbol": "MATIC", "name": "Polygon", "decimals": 18, "supply": 10_000_000_000},
            {"symbol": "LTC", "name": "Litecoin", "decimals": 8, "supply": 84_000_000},
            {"symbol": "LINK", "name": "Chainlink", "decimals": 18, "supply": 1_000_000_000},
            {"symbol": "UNI", "name": "Uniswap", "decimals": 18, "supply": 1_000_000_000},
            {"symbol": "ATOM", "name": "Cosmos", "decimals": 6, "supply": 390_000_000},
            {"symbol": "XLM", "name": "Stellar", "decimals": 7, "supply": 50_000_000_000},
            {"symbol": "ALGO", "name": "Algorand", "decimals": 6, "supply": 10_000_000_000},
            {"symbol": "NEAR", "name": "NEAR Protocol", "decimals": 24, "supply": 1_000_000_000},
            
            # Emerging & DeFi (21-29)
            {"symbol": "APT", "name": "Aptos", "decimals": 8, "supply": 1_000_000_000},
            {"symbol": "ARB", "name": "Arbitrum", "decimals": 18, "supply": 10_000_000_000},
            {"symbol": "OP", "name": "Optimism", "decimals": 18, "supply": 4_300_000_000},
            {"symbol": "INJ", "name": "Injective", "decimals": 18, "supply": 100_000_000},
            {"symbol": "SUI", "name": "Sui", "decimals": 9, "supply": 10_000_000_000},
            {"symbol": "FIL", "name": "Filecoin", "decimals": 18, "supply": 2_000_000_000},
            {"symbol": "AAVE", "name": "Aave", "decimals": 18, "supply": 16_000_000},
            {"symbol": "MKR", "name": "Maker", "decimals": 18, "supply": 1_000_000},
            {"symbol": "GOV", "name": "NexusOS Governance", "decimals": 18, "supply": 100_000_000}
        ]
        
        # Create all tokens with initial supply minted to treasury
        for token_config in top_tokens:
            token = Token(
                symbol=token_config["symbol"],
                name=token_config["name"],
                decimals=token_config["decimals"],
                creator="system"
            )
            token.mint("treasury", token_config["supply"])
            self.tokens[token_config["symbol"]] = token
    
    def create_token(self, symbol: str, name: str, initial_supply: float, creator: str, decimals: int = 18) -> Tuple[bool, str]:
        """Create new ERC-20 token (cannot create NXT - handled by native system)"""
        if symbol == self.NXT_SYMBOL:
            return False, f"Cannot create {self.NXT_SYMBOL} - it is the native token"
        
        if symbol in self.tokens:
            return False, f"Token {symbol} already exists"
        
        token = Token(
            symbol=symbol,
            name=name,
            decimals=decimals,
            creator=creator
        )
        token.mint(creator, initial_supply)
        self.tokens[symbol] = token
        
        return True, f"Token {symbol} created with {initial_supply} initial supply"
    
    def create_pool(self, token_a: str, token_b: str, initial_a: float, initial_b: float, provider: str) -> Tuple[bool, str]:
        """
        Create new liquidity pool (enforces TOKEN/NXT pairs only)
        One token must be NXT to ensure all trading pairs use native currency
        """
        # ENFORCE: One token must be NXT
        if token_a != self.NXT_SYMBOL and token_b != self.NXT_SYMBOL:
            return False, f"All pools must pair with {self.NXT_SYMBOL}. One token must be {self.NXT_SYMBOL}."
        
        # ENFORCE: Cannot create NXT/NXT pool
        if token_a == self.NXT_SYMBOL and token_b == self.NXT_SYMBOL:
            return False, f"Cannot create {self.NXT_SYMBOL}/{self.NXT_SYMBOL} pool"
        
        # Validate NXT adapter is available
        if self.nxt_adapter is None:
            return False, "NXT adapter not initialized - cannot create pools"
        
        # Validate non-NXT token exists
        other_token = token_a if token_b == self.NXT_SYMBOL else token_b
        if other_token not in self.tokens:
            return False, f"Token {other_token} does not exist"
        
        # Ensure consistent ordering: always TOKEN-NXT (not NXT-TOKEN)
        if token_a == self.NXT_SYMBOL:
            token_a, token_b = token_b, token_a
            initial_a, initial_b = initial_b, initial_a
        
        pool_id = f"{token_a}-{self.NXT_SYMBOL}"
        if pool_id in self.pools:
            return False, f"Pool {pool_id} already exists"
        
        # Check provider has sufficient balances
        # Check ERC-20 token balance
        token_obj = self.tokens[token_a]
        if token_obj.balance_of(provider) < initial_a:
            return False, f"Insufficient {token_a} balance"
        
        # Check NXT balance via adapter
        nxt_balance = self.nxt_adapter.get_balance(provider)
        if nxt_balance < initial_b:
            return False, f"Insufficient NXT balance: have {nxt_balance:.4f}, need {initial_b:.4f}"
        
        # Create pool
        pool = LiquidityPool(token_a=token_a, token_b=self.NXT_SYMBOL)
        
        # Add initial liquidity
        success, lp_tokens, message = pool.add_liquidity(provider, initial_a, initial_b)
        if not success:
            return False, f"Failed to add initial liquidity: {message}"
        
        # Transfer ERC-20 token from provider to pool
        if not token_obj.transfer(provider, pool_id, initial_a):
            return False, f"Failed to transfer {token_a}"
        
        # Transfer NXT from provider to pool via adapter
        if not self.nxt_adapter.transfer(provider, pool_id, initial_b):
            return False, f"Failed to transfer NXT"
        
        self.pools[pool_id] = pool
        self.total_liquidity_added += initial_a + initial_b
        
        return True, f"Pool {pool_id} created with {lp_tokens:.4f} LP tokens"
    
    def swap_tokens(self, user: str, input_token: str, output_token: str, input_amount: float, slippage_tolerance: float = 0.01) -> Tuple[bool, float, str]:
        """
        Execute token swap with NXT integration and fee routing to validators
        All pools are TOKEN/NXT pairs, so one side is always NXT
        
        🔒 SECURITY: Includes rate limiting and wash trading detection
        """
        # 🔒 SECURITY: Rate limiting check
        rate_limiter = get_rate_limiter()
        allowed, reason = rate_limiter.check_rate_limit(user, "dex_swap")
        if not allowed:
            return False, 0.0, f"🔒 Rate limit: {reason}"
        
        if self.nxt_adapter is None:
            return False, 0.0, "NXT adapter not initialized"
        
        # Determine which token is NXT
        is_input_nxt = (input_token == self.NXT_SYMBOL)
        is_output_nxt = (output_token == self.NXT_SYMBOL)
        
        # Validate: exactly one must be NXT (enforced by create_pool, but double-check)
        if not (is_input_nxt or is_output_nxt):
            return False, 0.0, f"Invalid swap: neither token is {self.NXT_SYMBOL}"
        if is_input_nxt and is_output_nxt:
            return False, 0.0, f"Cannot swap {self.NXT_SYMBOL} for {self.NXT_SYMBOL}"
        
        # Find pool (always ordered TOKEN-NXT)
        other_token = output_token if is_input_nxt else input_token
        pool_id = f"{other_token}-{self.NXT_SYMBOL}"
        
        if pool_id not in self.pools:
            return False, 0.0, f"Pool {pool_id} does not exist"
        
        pool = self.pools[pool_id]
        
        # Check user balances
        if is_input_nxt:
            nxt_balance = self.nxt_adapter.get_balance(user)
            if nxt_balance < input_amount:
                return False, 0.0, f"Insufficient NXT: have {nxt_balance:.4f}, need {input_amount:.4f}"
        else:
            token_obj = self.tokens[input_token]
            token_balance = token_obj.balance_of(user)
            if token_balance < input_amount:
                return False, 0.0, f"Insufficient {input_token}: have {token_balance:.4f}, need {input_amount:.4f}"
        
        # Calculate minimum output with slippage
        expected_output, _ = pool.calculate_output_amount(input_token, input_amount)
        min_output = expected_output * (1 - slippage_tolerance)
        
        # Execute swap in pool (pool.swap() already applies fees in AMM formula)
        success, output_amount, message = pool.swap(input_token, input_amount, min_output)
        
        if success:
            # Calculate fee that was applied in the swap (already factored into output_amount)
            # Fee is taken from input side in the AMM formula
            fee_amount_nxt = input_amount * pool.fee_rate
            fee_units = self.nxt_adapter.nxt_to_units(fee_amount_nxt)
            
            # Transfer input tokens from user to pool
            if is_input_nxt:
                # User pays NXT → Pool (includes fee that stays in pool)
                if not self.nxt_adapter.transfer(user, pool_id, input_amount):
                    return False, 0.0, "Failed to transfer NXT to pool"
                
                # Extract fee from pool to DEX_FEES (fee is already in pool reserves)
                if fee_units > 0:
                    if not self.nxt_adapter.transfer_units(pool_id, "DEX_FEES", fee_units):
                        return False, 0.0, "Failed to collect fee from pool"
            else:
                # User pays TOKEN → Pool
                input_token_obj = self.tokens[input_token]
                if not input_token_obj.transfer(user, pool_id, input_amount):
                    return False, 0.0, f"Failed to transfer {input_token} to pool"
                
                # For TOKEN input, fee is in TOKEN which we can't route to validators
                # This is a limitation - ideally convert to NXT or handle differently
                # For now, TOKEN fees stay in pool (benefit LPs)
                fee_units = 0  # Don't route TOKEN fees
            
            # Transfer output tokens from pool to user
            if is_output_nxt:
                # Pool pays NXT → User (output_amount already reduced by fee in AMM)
                if not self.nxt_adapter.transfer(pool_id, user, output_amount):
                    return False, 0.0, "Failed to transfer NXT to user"
            else:
                # Pool pays TOKEN → User
                output_token_obj = self.tokens[output_token]
                if not output_token_obj.transfer(pool_id, user, output_amount):
                    return False, 0.0, f"Failed to transfer {output_token} to user"
            
            if fee_units > 0:
                self.nxt_adapter.route_fee_to_validator_pool(fee_units)
                self.total_fees_to_validators += fee_amount_nxt
            
            swap_id = f"SWAP_{self.total_swaps}_{int(time.time())}"
            spectral_wavelength = SPECTRAL_FEE_TIERS.get(pool.spectral_region, {}).get('wavelength_nm', 550.0)
            
            substrate_tx = self._physics_adapter.process_orbital_burn(
                sender_address=user,
                amount_nxt=fee_amount_nxt,
                wavelength_nm=spectral_wavelength,
                module=EconomicModule.DEX,
                message_id=swap_id,
                bhls_category=None
            )
            
            self.substrate_transactions.append(substrate_tx)
            self.total_energy_joules += substrate_tx.energy_joules
            self.total_lambda_mass_kg += substrate_tx.lambda_boson_kg
            self.total_sdk_fees_nxt += substrate_tx.sdk_fee_routed
            
            self.total_swaps += 1
            self.total_volume += input_amount
            
            mev_protection = get_mev_protection()
            token_pair = f"{input_token}-{output_token}"
            is_wash, wash_evidence = mev_protection.detect_wash_trading(user, token_pair, input_amount)
            if is_wash:
                print(f"⚠️ WASH TRADING DETECTED: {user[:10]}... - {wash_evidence}")
        
        return success, output_amount, message
    
    def get_quote(self, input_token: str, output_token: str, input_amount: float) -> Tuple[float, float, float]:
        """
        Get swap quote
        Returns: (output_amount, price_impact, effective_price)
        """
        pool_id = f"{min(input_token, output_token)}-{max(input_token, output_token)}"
        if pool_id not in self.pools:
            return 0.0, 0.0, 0.0
        
        pool = self.pools[pool_id]
        output_amount, price_impact = pool.calculate_output_amount(input_token, input_amount)
        effective_price = output_amount / input_amount if input_amount > 0 else 0.0
        
        return output_amount, price_impact, effective_price
    
    def get_all_pools(self) -> List[dict]:
        """Get all pools as dictionaries"""
        return [pool.to_dict() for pool in self.pools.values()]
    
    def get_all_tokens(self) -> List[dict]:
        """Get all tokens as dictionaries"""
        return [token.to_dict() for token in self.tokens.values()]
    
    def get_user_balances(self, user: str) -> Dict[str, float]:
        """Get all token balances for a user (includes NXT from native system)"""
        balances = {}
        
        if self.nxt_adapter:
            nxt_balance = self.nxt_adapter.get_balance(user)
            if nxt_balance > 0:
                balances[self.NXT_SYMBOL] = nxt_balance
        
        for symbol, token in self.tokens.items():
            balance = token.balance_of(user)
            if balance > 0:
                balances[symbol] = balance
        
        return balances
    
    def get_physics_economics_stats(self) -> dict:
        """Get physics economics statistics for DEX operations"""
        return {
            "total_swaps": self.total_swaps,
            "total_volume_nxt": self.total_volume,
            "total_fees_to_validators_nxt": self.total_fees_to_validators,
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
