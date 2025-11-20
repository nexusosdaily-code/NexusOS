"""
BHLS (Basic Human Living Standard) Floor System
Guarantees fundamental rights: food, water, housing, energy, healthcare, connectivity

This is the permanent, non-negotiable foundation of the civilization.
Every citizen receives these guarantees as rights, funded by physics-based economics.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum

class BHLSCategory(Enum):
    """Fundamental human needs guaranteed by the civilization"""
    FOOD = "Food & Nutrition"
    WATER = "Clean Water"
    HOUSING = "Shelter & Housing"
    ENERGY = "Energy Access"
    HEALTHCARE = "Medical Care"
    CONNECTIVITY = "Communication & Internet"
    RECYCLING = "Waste & Recycling Services"

@dataclass
class BHLSAllocation:
    """Individual citizen's BHLS allocation"""
    citizen_id: str
    category: BHLSCategory
    monthly_allocation: float  # In NXT tokens
    usage_current_month: float = 0.0
    last_distribution: Optional[datetime] = None
    
    def remaining_balance(self) -> float:
        """Calculate remaining allocation for the month"""
        return max(0, self.monthly_allocation - self.usage_current_month)
    
    def utilization_rate(self) -> float:
        """Percentage of allocation used"""
        if self.monthly_allocation == 0:
            return 0.0
        return (self.usage_current_month / self.monthly_allocation) * 100


@dataclass
class Citizen:
    """Citizen in the Nexus Civilization"""
    citizen_id: str
    name: str
    wallet_address: str
    registration_date: datetime
    bhls_allocations: Dict[BHLSCategory, BHLSAllocation] = field(default_factory=dict)
    contribution_score: float = 0.0  # Civic participation
    recycling_credits: float = 0.0   # From recycling participation
    
    def total_monthly_floor(self) -> float:
        """Total BHLS floor allocation per month"""
        return sum(alloc.monthly_allocation for alloc in self.bhls_allocations.values())
    
    def total_usage(self) -> float:
        """Total BHLS usage this month"""
        return sum(alloc.usage_current_month for alloc in self.bhls_allocations.values())
    
    def floor_utilization(self) -> float:
        """Percentage of floor used"""
        total_floor = self.total_monthly_floor()
        if total_floor == 0:
            return 0.0
        return (self.total_usage() / total_floor) * 100


class BHLSFloorSystem:
    """
    Manages the guaranteed basic living standard for all citizens
    Funded by: physics-priced messaging, validator rewards, recycling liquidity
    """
    
    def __init__(self):
        self.citizens: Dict[str, Citizen] = {}
        
        # Default monthly allocations per citizen (in NXT)
        self.base_allocations = {
            BHLSCategory.FOOD: 250.0,
            BHLSCategory.WATER: 50.0,
            BHLSCategory.HOUSING: 400.0,
            BHLSCategory.ENERGY: 150.0,
            BHLSCategory.HEALTHCARE: 200.0,
            BHLSCategory.CONNECTIVITY: 75.0,
            BHLSCategory.RECYCLING: 25.0
        }
        
        # Funding pools
        self.floor_reserve_pool: float = 1_000_000.0  # NXT tokens
        self.monthly_burn_revenue: float = 0.0
        self.recycling_liquidity: float = 0.0
        self.validator_contribution: float = 0.0
        
        # Statistics
        self.total_citizens: int = 0
        self.monthly_distributions: float = 0.0
        self.floor_stability_index: float = 1.0
    
    def register_citizen(self, citizen_id: str, name: str, wallet_address: str) -> Citizen:
        """Register a new citizen and allocate BHLS floor"""
        if citizen_id in self.citizens:
            raise ValueError(f"Citizen {citizen_id} already registered")
        
        # Create citizen
        citizen = Citizen(
            citizen_id=citizen_id,
            name=name,
            wallet_address=wallet_address,
            registration_date=datetime.now()
        )
        
        # Allocate BHLS guarantees
        for category, amount in self.base_allocations.items():
            citizen.bhls_allocations[category] = BHLSAllocation(
                citizen_id=citizen_id,
                category=category,
                monthly_allocation=amount,
                last_distribution=datetime.now()
            )
        
        self.citizens[citizen_id] = citizen
        self.total_citizens += 1
        
        return citizen
    
    def distribute_monthly_floor(self):
        """
        Distribute monthly BHLS allocations to all citizens
        Called automatically at the start of each month
        """
        total_required = 0.0
        
        for citizen in self.citizens.values():
            for allocation in citizen.bhls_allocations.values():
                # Reset usage counter
                allocation.usage_current_month = 0.0
                allocation.last_distribution = datetime.now()
                total_required += allocation.monthly_allocation
        
        self.monthly_distributions = total_required
        
        # Verify funding
        if total_required > self.floor_reserve_pool:
            self.floor_stability_index = self.floor_reserve_pool / total_required
            print(f"⚠️  WARNING: Floor reserve insufficient! Stability: {self.floor_stability_index:.2%}")
        else:
            self.floor_stability_index = 1.0
        
        return total_required
    
    def use_bhls_service(self, citizen_id: str, category: BHLSCategory, amount: float):
        """
        Citizen uses BHLS service (e.g., purchases food, pays rent)
        Deducts from their monthly allocation
        """
        if citizen_id not in self.citizens:
            raise ValueError(f"Citizen {citizen_id} not found")
        
        citizen = self.citizens[citizen_id]
        
        if category not in citizen.bhls_allocations:
            raise ValueError(f"Category {category} not allocated for citizen")
        
        allocation = citizen.bhls_allocations[category]
        
        # Check if allocation is sufficient
        if allocation.usage_current_month + amount > allocation.monthly_allocation:
            raise ValueError(
                f"Insufficient {category.value} allocation. "
                f"Remaining: {allocation.remaining_balance():.2f} NXT"
            )
        
        # Deduct usage
        allocation.usage_current_month += amount
        
        return allocation.remaining_balance()
    
    def add_revenue_to_floor(self, source: str, amount: float):
        """
        Add revenue to floor reserve from various sources:
        - Messaging burns (E=hf pricing)
        - Validator rewards
        - Recycling liquidity
        """
        self.floor_reserve_pool += amount
        
        if source == "messaging_burn":
            self.monthly_burn_revenue += amount
        elif source == "recycling":
            self.recycling_liquidity += amount
        elif source == "validator":
            self.validator_contribution += amount
    
    def calculate_floor_sustainability(self, months_ahead: int = 12) -> float:
        """
        Calculate how many months the floor can sustain current population
        """
        monthly_cost = sum(c.total_monthly_floor() for c in self.citizens.values())
        
        if monthly_cost == 0:
            return float('inf')
        
        return self.floor_reserve_pool / monthly_cost
    
    def get_system_stats(self) -> dict:
        """Get comprehensive floor system statistics"""
        return {
            "total_citizens": self.total_citizens,
            "floor_reserve_pool": self.floor_reserve_pool,
            "monthly_distributions": self.monthly_distributions,
            "floor_stability_index": self.floor_stability_index,
            "sustainability_months": self.calculate_floor_sustainability(),
            "revenue_sources": {
                "messaging_burn": self.monthly_burn_revenue,
                "recycling": self.recycling_liquidity,
                "validator": self.validator_contribution
            },
            "per_citizen_monthly_cost": self.monthly_distributions / max(1, self.total_citizens)
        }
    
    def get_citizen_dashboard(self, citizen_id: str) -> dict:
        """Get individual citizen's BHLS dashboard"""
        if citizen_id not in self.citizens:
            raise ValueError(f"Citizen {citizen_id} not found")
        
        citizen = self.citizens[citizen_id]
        
        allocations_detail = {}
        for category, allocation in citizen.bhls_allocations.items():
            allocations_detail[category.value] = {
                "monthly_allocation": allocation.monthly_allocation,
                "used": allocation.usage_current_month,
                "remaining": allocation.remaining_balance(),
                "utilization": allocation.utilization_rate()
            }
        
        return {
            "citizen_id": citizen.citizen_id,
            "name": citizen.name,
            "total_monthly_floor": citizen.total_monthly_floor(),
            "total_usage": citizen.total_usage(),
            "floor_utilization": citizen.floor_utilization(),
            "contribution_score": citizen.contribution_score,
            "recycling_credits": citizen.recycling_credits,
            "allocations": allocations_detail
        }


# Example usage
if __name__ == "__main__":
    print("=" * 70)
    print("BHLS FLOOR SYSTEM - Guaranteed Human Living Standards")
    print("=" * 70)
    
    # Initialize system
    bhls = BHLSFloorSystem()
    
    # Register citizens
    print("\n1. REGISTERING CITIZENS:")
    alice = bhls.register_citizen("CIT-001", "Alice", "0xABC123")
    bob = bhls.register_citizen("CIT-002", "Bob", "0xDEF456")
    charlie = bhls.register_citizen("CIT-003", "Charlie", "0xGHI789")
    
    print(f"   Registered: {bhls.total_citizens} citizens")
    print(f"   Monthly floor per citizen: {alice.total_monthly_floor():.2f} NXT")
    
    # Distribute monthly floor
    print("\n2. MONTHLY FLOOR DISTRIBUTION:")
    total_dist = bhls.distribute_monthly_floor()
    print(f"   Total distributed: {total_dist:,.2f} NXT")
    print(f"   Reserve remaining: {bhls.floor_reserve_pool:,.2f} NXT")
    
    # Simulate usage
    print("\n3. CITIZEN USAGE:")
    bhls.use_bhls_service("CIT-001", BHLSCategory.FOOD, 150.0)
    bhls.use_bhls_service("CIT-001", BHLSCategory.HOUSING, 400.0)
    bhls.use_bhls_service("CIT-002", BHLSCategory.ENERGY, 75.0)
    
    alice_dash = bhls.get_citizen_dashboard("CIT-001")
    print(f"   Alice's utilization: {alice_dash['floor_utilization']:.1f}%")
    print(f"   Alice's food remaining: {alice_dash['allocations']['Food & Nutrition']['remaining']:.2f} NXT")
    
    # Add revenue to floor
    print("\n4. REVENUE TO FLOOR:")
    bhls.add_revenue_to_floor("messaging_burn", 50000.0)
    bhls.add_revenue_to_floor("recycling", 25000.0)
    bhls.add_revenue_to_floor("validator", 30000.0)
    
    stats = bhls.get_system_stats()
    print(f"   Floor reserve: {stats['floor_reserve_pool']:,.2f} NXT")
    print(f"   Sustainability: {stats['sustainability_months']:.1f} months")
    print(f"   Messaging revenue: {stats['revenue_sources']['messaging_burn']:,.2f} NXT")
    
    print("\n5. SYSTEM HEALTH:")
    print(f"   Floor stability index: {stats['floor_stability_index']:.2%}")
    print(f"   Per-citizen monthly cost: {stats['per_citizen_monthly_cost']:.2f} NXT")
    
    print("\n" + "=" * 70)
    print("BHLS Floor System operational - All citizens guaranteed living standards!")
    print("=" * 70)
