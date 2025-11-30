"""
Physics Economics Adapter - Unified Substrate Layer Compliance
==============================================================

This adapter ensures ALL economic modules comply with NexusOS substrate:
- E=hf energy pricing (Planck's equation)
- Λ=hf/c² Lambda Boson mass-equivalence
- Orbital transition burns → TransitionReserveLedger
- BHLS floor allocation integration
- SDK fee routing to founder wallet

Every NXT transaction flows through this adapter for physics compliance.
"""

import time
from typing import Dict, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 2.99792458e8
SDK_WALLET = "NXS5372697543A0FEF822E453DBC26FA044D14599E9"
SDK_FEE_RATE = 0.005


class EconomicModule(Enum):
    """Economic modules requiring physics integration"""
    MESSAGING = "messaging"
    VIDEO = "video"
    DEX = "dex"
    VALIDATOR = "validator"
    GOVERNANCE = "governance"
    FARMING = "farming"
    LOTTERY = "lottery"
    SERVICE_POOLS = "service_pools"


@dataclass
class PhysicsEnergyResult:
    """Result from E=hf energy calculation"""
    energy_joules: float
    energy_nxt: float
    lambda_boson_kg: float
    frequency_hz: float
    wavelength_nm: float
    sdk_fee_nxt: float
    net_to_reserve_nxt: float
    physics_formula: str


@dataclass
class SubstrateTransaction:
    """Transaction routed through substrate layer"""
    tx_id: str
    timestamp: float
    module: EconomicModule
    sender: str
    amount_nxt: float
    energy_joules: float
    lambda_boson_kg: float
    burned_to_reserve: float
    sdk_fee_routed: float
    bhls_category: Optional[str]
    bhls_deducted: float
    success: bool
    message: str


class PhysicsEconomicsAdapter:
    """
    Unified adapter for physics-based economics across all NexusOS modules.
    
    Ensures substrate compliance:
    1. E=hf energy calculation for all transactions
    2. Λ=hf/c² Lambda Boson mass tracking
    3. Orbital burns routed to TransitionReserveLedger
    4. BHLS allocations checked and deducted
    5. SDK fees routed to founder wallet
    """
    
    def __init__(self):
        self._token_system = None
        self._flow_controller = None
        self._bhls_system = None
        self._ledger = None
        self.transactions: list = []
        self.total_energy_processed_joules = 0.0
        self.total_lambda_mass_kg = 0.0
        self.total_sdk_fees_nxt = 0.0
        
    def _lazy_init(self):
        """Lazy initialization of dependent systems"""
        if self._token_system is None:
            try:
                from native_token import NativeTokenSystem
                self._token_system = NativeTokenSystem()
                
                for acc_name in ["TRANSITION_RESERVE", SDK_WALLET, "DEX_FEES", "VALIDATOR_POOL"]:
                    if self._token_system.get_account(acc_name) is None:
                        self._token_system.create_account(acc_name, initial_balance=0)
            except Exception as e:
                print(f"Could not initialize token system: {e}")
                
        if self._flow_controller is None:
            try:
                from economic_loop_controller import (
                    MessagingFlowController,
                    TransitionReserveLedger,
                    get_transition_ledger
                )
                self._ledger = get_transition_ledger()
                if self._token_system:
                    self._flow_controller = MessagingFlowController(
                        self._token_system, self._ledger
                    )
            except Exception as e:
                print(f"Could not initialize flow controller: {e}")
                
        if self._bhls_system is None:
            try:
                from bhls_floor_system import BHLSFloorSystem
                self._bhls_system = BHLSFloorSystem()
            except Exception as e:
                print(f"Could not initialize BHLS system: {e}")
    
    def calculate_energy(
        self,
        wavelength_nm: float = 550.0,
        amount_nxt: float = 0.0,
        duration_seconds: float = 1.0
    ) -> PhysicsEnergyResult:
        """
        Calculate physics-based energy using E=hf and Λ=hf/c².
        
        Args:
            wavelength_nm: Wavelength in nanometers (default visible light)
            amount_nxt: Transaction amount in NXT
            duration_seconds: Duration for time-based services
            
        Returns:
            PhysicsEnergyResult with full energy breakdown
        """
        wavelength_m = wavelength_nm * 1e-9
        frequency_hz = SPEED_OF_LIGHT / wavelength_m
        
        energy_joules = PLANCK_CONSTANT * frequency_hz * duration_seconds
        lambda_boson_kg = PLANCK_CONSTANT * frequency_hz / (SPEED_OF_LIGHT ** 2)
        
        ENERGY_TO_NXT_SCALE = 1e21
        energy_nxt = max(amount_nxt, energy_joules * ENERGY_TO_NXT_SCALE / 1e6)
        
        sdk_fee_nxt = energy_nxt * SDK_FEE_RATE
        net_to_reserve = energy_nxt - sdk_fee_nxt
        
        return PhysicsEnergyResult(
            energy_joules=energy_joules,
            energy_nxt=energy_nxt,
            lambda_boson_kg=lambda_boson_kg,
            frequency_hz=frequency_hz,
            wavelength_nm=wavelength_nm,
            sdk_fee_nxt=sdk_fee_nxt,
            net_to_reserve_nxt=net_to_reserve,
            physics_formula=f"E = hf = {PLANCK_CONSTANT:.2e} × {frequency_hz:.2e} = {energy_joules:.2e} J; Λ = hf/c² = {lambda_boson_kg:.2e} kg"
        )
    
    def get_bhls_allocation(
        self,
        wallet_address: str,
        category: str
    ) -> Dict[str, Any]:
        """
        Get BHLS allocation for a category.
        
        Args:
            wallet_address: User's wallet address
            category: BHLS category (CONNECTIVITY, FOOD, ENERGY, etc.)
            
        Returns:
            Dict with allocation details
        """
        self._lazy_init()
        
        BHLS_DEFAULTS = {
            "CONNECTIVITY": 75.0,
            "FOOD": 250.0,
            "WATER": 50.0,
            "HOUSING": 400.0,
            "ENERGY": 150.0,
            "HEALTHCARE": 200.0,
            "RECYCLING": 25.0
        }
        
        monthly_allocation = BHLS_DEFAULTS.get(category.upper(), 0.0)
        used = 0.0
        
        if self._bhls_system:
            for cid, citizen in self._bhls_system.citizens.items():
                if citizen.wallet_address == wallet_address:
                    from bhls_floor_system import BHLSCategory
                    try:
                        cat_enum = BHLSCategory[category.upper()]
                        if cat_enum in citizen.bhls_allocations:
                            alloc = citizen.bhls_allocations[cat_enum]
                            monthly_allocation = alloc.monthly_allocation
                            used = alloc.usage_current_month
                    except (KeyError, AttributeError):
                        pass
                    break
        
        return {
            "category": category.upper(),
            "monthly_allocation_nxt": monthly_allocation,
            "used_nxt": used,
            "remaining_nxt": max(0, monthly_allocation - used),
            "wallet_address": wallet_address
        }
    
    def deduct_bhls(
        self,
        wallet_address: str,
        category: str,
        amount_nxt: float
    ) -> Tuple[bool, str]:
        """
        Deduct from BHLS allocation.
        
        Args:
            wallet_address: User's wallet address
            category: BHLS category
            amount_nxt: Amount to deduct
            
        Returns:
            (success, message)
        """
        self._lazy_init()
        
        allocation = self.get_bhls_allocation(wallet_address, category)
        
        if allocation["remaining_nxt"] < amount_nxt:
            return False, f"Insufficient BHLS {category}: {allocation['remaining_nxt']:.2f} remaining, need {amount_nxt:.2f}"
        
        if self._bhls_system:
            for cid, citizen in self._bhls_system.citizens.items():
                if citizen.wallet_address == wallet_address:
                    from bhls_floor_system import BHLSCategory
                    try:
                        cat_enum = BHLSCategory[category.upper()]
                        if cat_enum in citizen.bhls_allocations:
                            citizen.bhls_allocations[cat_enum].usage_current_month += amount_nxt
                            return True, f"Deducted {amount_nxt:.4f} NXT from BHLS {category}"
                    except (KeyError, AttributeError):
                        pass
                    break
        
        return True, f"BHLS {category} deduction recorded: {amount_nxt:.4f} NXT"
    
    def process_orbital_burn(
        self,
        sender_address: str,
        amount_nxt: float,
        wavelength_nm: float,
        module: EconomicModule,
        message_id: Optional[str] = None,
        bhls_category: Optional[str] = None
    ) -> SubstrateTransaction:
        """
        Process transaction through orbital transition burn.
        
        Complete flow:
        1. Calculate E=hf energy
        2. Check/deduct BHLS if applicable
        3. Execute orbital transition
        4. Route to TransitionReserveLedger
        5. Route SDK fee to founder wallet
        
        Args:
            sender_address: Wallet sending funds
            amount_nxt: Amount in NXT
            wavelength_nm: Wavelength for energy calculation
            module: Which economic module
            message_id: Optional transaction ID
            bhls_category: Optional BHLS category to deduct from
            
        Returns:
            SubstrateTransaction with full details
        """
        self._lazy_init()
        
        tx_id = f"SUBSTRATE_{module.value}_{int(time.time() * 1000)}"
        
        energy = self.calculate_energy(
            wavelength_nm=wavelength_nm,
            amount_nxt=amount_nxt
        )
        
        bhls_deducted = 0.0
        if bhls_category:
            success, msg = self.deduct_bhls(sender_address, bhls_category, amount_nxt)
            if success:
                bhls_deducted = amount_nxt
        
        orbital_success = False
        orbital_message = "Orbital transition pending"
        
        if self._flow_controller:
            try:
                success, msg, event = self._flow_controller.process_message_burn(
                    sender_address=sender_address,
                    message_id=message_id or tx_id,
                    burn_amount_nxt=energy.net_to_reserve_nxt,
                    wavelength_nm=wavelength_nm,
                    message_type=module.value
                )
                orbital_success = success
                orbital_message = msg
            except Exception as e:
                orbital_message = f"Orbital transition error: {e}"
        
        sdk_routed = self._route_sdk_fee(energy.sdk_fee_nxt, tx_id)
        
        self.total_energy_processed_joules += energy.energy_joules
        self.total_lambda_mass_kg += energy.lambda_boson_kg
        self.total_sdk_fees_nxt += energy.sdk_fee_nxt if sdk_routed else 0
        
        tx = SubstrateTransaction(
            tx_id=tx_id,
            timestamp=time.time(),
            module=module,
            sender=sender_address,
            amount_nxt=amount_nxt,
            energy_joules=energy.energy_joules,
            lambda_boson_kg=energy.lambda_boson_kg,
            burned_to_reserve=energy.net_to_reserve_nxt,
            sdk_fee_routed=energy.sdk_fee_nxt if sdk_routed else 0,
            bhls_category=bhls_category,
            bhls_deducted=bhls_deducted,
            success=orbital_success,
            message=orbital_message
        )
        
        self.transactions.append(tx)
        return tx
    
    def _route_sdk_fee(self, fee_nxt: float, tx_id: str) -> bool:
        """Route SDK fee to founder wallet"""
        if fee_nxt <= 0 or not self._token_system:
            return False
            
        try:
            if self._token_system.get_account("TRANSITION_RESERVE") is None:
                self._token_system.create_account("TRANSITION_RESERVE", initial_balance=0)
            if self._token_system.get_account(SDK_WALLET) is None:
                self._token_system.create_account(SDK_WALLET, initial_balance=0)
            
            fee_units = int(fee_nxt * self._token_system.UNITS_PER_NXT)
            
            reserve_account = self._token_system.get_account("TRANSITION_RESERVE")
            if reserve_account and hasattr(reserve_account, 'balance'):
                if reserve_account.balance >= fee_units:
                    success, tx, msg = self._token_system.transfer_atomic(
                        from_address="TRANSITION_RESERVE",
                        to_address=SDK_WALLET,
                        amount=fee_units,
                        fee=0,
                        reason=f"SDK fee: {tx_id}"
                    )
                    return success
            return False
        except Exception as e:
            print(f"SDK fee routing error: {e}")
            return False
    
    def get_substrate_summary(self) -> Dict[str, Any]:
        """Get summary of substrate layer activity"""
        module_stats = {}
        for module in EconomicModule:
            module_txs = [t for t in self.transactions if t.module == module]
            module_stats[module.value] = {
                "transaction_count": len(module_txs),
                "total_nxt": sum(t.amount_nxt for t in module_txs),
                "total_energy_joules": sum(t.energy_joules for t in module_txs)
            }
        
        return {
            "total_transactions": len(self.transactions),
            "total_energy_processed_joules": self.total_energy_processed_joules,
            "total_lambda_mass_kg": self.total_lambda_mass_kg,
            "total_sdk_fees_nxt": self.total_sdk_fees_nxt,
            "sdk_wallet": SDK_WALLET,
            "module_breakdown": module_stats,
            "physics_formulas": {
                "energy": "E = h × f (Planck 1900)",
                "lambda_boson": "Λ = hf/c² (Lambda Boson 2024)",
                "planck_constant": PLANCK_CONSTANT,
                "speed_of_light": SPEED_OF_LIGHT
            }
        }


_adapter_instance = None


def get_physics_adapter() -> PhysicsEconomicsAdapter:
    """Get singleton physics economics adapter"""
    global _adapter_instance
    if _adapter_instance is None:
        _adapter_instance = PhysicsEconomicsAdapter()
    return _adapter_instance
