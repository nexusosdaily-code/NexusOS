"""
Regenerative Circular Economy - NexusOS Civilization OS
Buy → Consume → Dispose → Return → Recycle → Liquidity → BHLS Floor

This module implements the waste-to-liquidity cycle where recycling
generates economic value that feeds back into the BHLS floor system.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum

class MaterialType(Enum):
    """Types of recyclable materials"""
    PLASTIC = "Plastic"
    METAL = "Metal"
    GLASS = "Glass"
    PAPER = "Paper & Cardboard"
    ELECTRONICS = "E-Waste"
    ORGANIC = "Organic Waste"
    TEXTILES = "Textiles & Fabrics"
    BATTERIES = "Batteries"

@dataclass
class RecyclableItem:
    """Item submitted for recycling"""
    material_type: MaterialType
    weight_kg: float
    quality_grade: float  # 0-1, affects value
    citizen_id: str
    submission_date: datetime = field(default_factory=datetime.now)
    
    def calculate_value(self, base_rates: Dict[MaterialType, float]) -> float:
        """Calculate NXT value based on material, weight, and quality"""
        base_rate = base_rates.get(self.material_type, 0.0)
        return base_rate * self.weight_kg * self.quality_grade


@dataclass
class Product:
    """Product in the economy with lifecycle tracking"""
    product_id: str
    name: str
    purchase_price: float  # NXT
    materials: Dict[MaterialType, float]  # Material composition in kg
    purchase_date: Optional[datetime] = None
    disposal_date: Optional[datetime] = None
    recycled: bool = False
    
    def lifecycle_days(self) -> int:
        """Calculate product lifetime in days"""
        if not self.purchase_date or not self.disposal_date:
            return 0
        return (self.disposal_date - self.purchase_date).days
    
    def recyclable_value(self, base_rates: Dict[MaterialType, float], quality: float = 0.8) -> float:
        """Estimate recycling value"""
        total = 0.0
        for material, weight in self.materials.items():
            total += base_rates.get(material, 0.0) * weight * quality
        return total


class RegenerativeEconomy:
    """
    Manages the circular economy loop
    Tracks consumption, waste, recycling, and liquidity generation
    """
    
    def __init__(self):
        # Base recycling rates (NXT per kg)
        self.recycling_rates = {
            MaterialType.PLASTIC: 2.5,
            MaterialType.METAL: 5.0,
            MaterialType.GLASS: 1.5,
            MaterialType.PAPER: 1.0,
            MaterialType.ELECTRONICS: 15.0,
            MaterialType.ORGANIC: 0.5,
            MaterialType.TEXTILES: 2.0,
            MaterialType.BATTERIES: 20.0
        }
        
        # Economy tracking
        self.products_sold: List[Product] = []
        self.recycling_submissions: List[RecyclableItem] = []
        self.citizen_recycling_credits: Dict[str, float] = {}
        
        # Liquidity pools
        self.recycling_liquidity_pool: float = 100_000.0  # Initial fund
        self.bhls_floor_transfer: float = 0.0
        self.supply_chain_fund: float = 0.0
        
        # Statistics
        self.total_products_purchased: int = 0
        self.total_waste_generated_kg: float = 0.0
        self.total_recycled_kg: float = 0.0
        self.recycling_rate_percent: float = 0.0
        self.entropy_reduction: float = 0.0  # Waste prevented from landfill
    
    def purchase_product(self, product: Product, citizen_id: str):
        """Citizen purchases a product - enters the economy"""
        product.purchase_date = datetime.now()
        self.products_sold.append(product)
        self.total_products_purchased += 1
    
    def dispose_product(self, product_id: str):
        """Product is disposed (becomes waste)"""
        product = next((p for p in self.products_sold if p.product_id == product_id), None)
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        product.disposal_date = datetime.now()
        
        # Calculate waste weight
        waste_weight = sum(product.materials.values())
        self.total_waste_generated_kg += waste_weight
        
        # Update recycling rate
        if self.total_waste_generated_kg > 0:
            self.recycling_rate_percent = (self.total_recycled_kg / self.total_waste_generated_kg) * 100
    
    def recycle_materials(self, citizen_id: str, materials: List[RecyclableItem]) -> float:
        """
        Citizen submits materials for recycling
        Returns NXT tokens credited to citizen
        """
        total_credits = 0.0
        total_weight = 0.0
        
        for item in materials:
            # Calculate value
            value = item.calculate_value(self.recycling_rates)
            total_credits += value
            total_weight += item.weight_kg
            
            # Record submission
            self.recycling_submissions.append(item)
        
        # Update citizen's recycling credits
        if citizen_id not in self.citizen_recycling_credits:
            self.citizen_recycling_credits[citizen_id] = 0.0
        self.citizen_recycling_credits[citizen_id] += total_credits
        
        # Update statistics
        self.total_recycled_kg += total_weight
        self.entropy_reduction += total_weight  # Waste diverted from landfill
        
        # Update recycling rate
        if self.total_waste_generated_kg > 0:
            self.recycling_rate_percent = (self.total_recycled_kg / self.total_waste_generated_kg) * 100
        
        # Deduct from recycling pool (paid to citizen)
        self.recycling_liquidity_pool -= total_credits
        
        return total_credits
    
    def distribute_to_floor(self, percentage: float = 0.30):
        """
        Transfer liquidity to BHLS floor
        Default: 30% of recycling pool flows to floor
        """
        transfer_amount = self.recycling_liquidity_pool * percentage
        self.bhls_floor_transfer += transfer_amount
        self.recycling_liquidity_pool -= transfer_amount
        
        return transfer_amount
    
    def distribute_to_supply_chain(self, percentage: float = 0.20):
        """
        Transfer liquidity to supply chain fund
        Supports producers using recycled materials
        """
        transfer_amount = self.recycling_liquidity_pool * percentage
        self.supply_chain_fund += transfer_amount
        self.recycling_liquidity_pool -= transfer_amount
        
        return transfer_amount
    
    def get_citizen_recycling_stats(self, citizen_id: str) -> dict:
        """Get recycling statistics for a citizen"""
        citizen_submissions = [s for s in self.recycling_submissions if s.citizen_id == citizen_id]
        
        total_weight = sum(s.weight_kg for s in citizen_submissions)
        total_credits = self.citizen_recycling_credits.get(citizen_id, 0.0)
        
        material_breakdown = {}
        for material_type in MaterialType:
            weight = sum(s.weight_kg for s in citizen_submissions if s.material_type == material_type)
            if weight > 0:
                material_breakdown[material_type.value] = weight
        
        return {
            "citizen_id": citizen_id,
            "total_submissions": len(citizen_submissions),
            "total_weight_kg": total_weight,
            "total_credits_nxt": total_credits,
            "material_breakdown": material_breakdown
        }
    
    def get_economy_stats(self) -> dict:
        """Get comprehensive economy statistics"""
        return {
            "products_purchased": self.total_products_purchased,
            "total_waste_kg": self.total_waste_generated_kg,
            "total_recycled_kg": self.total_recycled_kg,
            "recycling_rate_percent": self.recycling_rate_percent,
            "entropy_reduction_kg": self.entropy_reduction,
            "recycling_liquidity_pool": self.recycling_liquidity_pool,
            "bhls_floor_transfer": self.bhls_floor_transfer,
            "supply_chain_fund": self.supply_chain_fund,
            "active_recyclers": len(self.citizen_recycling_credits),
            "avg_credits_per_recycler": np.mean(list(self.citizen_recycling_credits.values())) if self.citizen_recycling_credits else 0.0
        }
    
    def simulate_circular_loop(self, citizen_id: str, iterations: int = 10):
        """
        Simulate complete circular economy loop
        Buy → Consume → Dispose → Recycle → Liquidity → Floor
        """
        results = []
        
        for i in range(iterations):
            # 1. BUY - Citizen purchases product
            product = Product(
                product_id=f"PROD-{i:04d}",
                name=f"Product {i}",
                purchase_price=50.0,
                materials={
                    MaterialType.PLASTIC: 0.5,
                    MaterialType.METAL: 0.3,
                    MaterialType.PAPER: 0.2
                }
            )
            self.purchase_product(product, citizen_id)
            
            # 2. CONSUME - Simulate product use (instant for demo)
            
            # 3. DISPOSE - Product becomes waste
            self.dispose_product(product.product_id)
            
            # 4. RECYCLE - Citizen returns materials
            recyclables = [
                RecyclableItem(MaterialType.PLASTIC, 0.5, 0.8, citizen_id),
                RecyclableItem(MaterialType.METAL, 0.3, 0.9, citizen_id),
                RecyclableItem(MaterialType.PAPER, 0.2, 0.7, citizen_id)
            ]
            credits = self.recycle_materials(citizen_id, recyclables)
            
            # 5. LIQUIDITY GENERATION
            floor_transfer = self.distribute_to_floor(0.30)
            chain_transfer = self.distribute_to_supply_chain(0.20)
            
            results.append({
                "iteration": i,
                "credits_earned": credits,
                "floor_transfer": floor_transfer,
                "chain_transfer": chain_transfer,
                "recycling_rate": self.recycling_rate_percent
            })
        
        return results


# Example usage
if __name__ == "__main__":
    print("=" * 70)
    print("REGENERATIVE CIRCULAR ECONOMY - Waste to Liquidity")
    print("=" * 70)
    
    # Initialize economy
    economy = RegenerativeEconomy()
    
    print("\n1. RECYCLING RATES (NXT per kg):")
    for material, rate in economy.recycling_rates.items():
        print(f"   {material.value:20s}: {rate:6.2f} NXT/kg")
    
    # Simulate circular loop
    print("\n2. SIMULATING CIRCULAR ECONOMY LOOP:")
    print("   Buy → Consume → Dispose → Recycle → Liquidity → Floor")
    
    results = economy.simulate_circular_loop("CIT-001", iterations=5)
    
    print(f"\n   Completed {len(results)} cycles")
    print(f"   Total credits earned: {sum(r['credits_earned'] for r in results):.2f} NXT")
    
    # Check citizen stats
    print("\n3. CITIZEN RECYCLING PROFILE:")
    citizen_stats = economy.get_citizen_recycling_stats("CIT-001")
    print(f"   Total submissions: {citizen_stats['total_submissions']}")
    print(f"   Total weight: {citizen_stats['total_weight_kg']:.2f} kg")
    print(f"   Total credits: {citizen_stats['total_credits_nxt']:.2f} NXT")
    print(f"   Materials recycled:")
    for material, weight in citizen_stats['material_breakdown'].items():
        print(f"      - {material}: {weight:.2f} kg")
    
    # Economy-wide stats
    print("\n4. ECONOMY STATISTICS:")
    stats = economy.get_economy_stats()
    print(f"   Products purchased: {stats['products_purchased']}")
    print(f"   Total waste: {stats['total_waste_kg']:.2f} kg")
    print(f"   Total recycled: {stats['total_recycled_kg']:.2f} kg")
    print(f"   Recycling rate: {stats['recycling_rate_percent']:.1f}%")
    print(f"   Entropy reduced: {stats['entropy_reduction_kg']:.2f} kg")
    
    print("\n5. LIQUIDITY FLOWS:")
    print(f"   Recycling pool: {stats['recycling_liquidity_pool']:,.2f} NXT")
    print(f"   → BHLS Floor: {stats['bhls_floor_transfer']:,.2f} NXT")
    print(f"   → Supply Chain: {stats['supply_chain_fund']:,.2f} NXT")
    
    print("\n" + "=" * 70)
    print("Circular economy operational - Waste becomes liquidity!")
    print("=" * 70)
