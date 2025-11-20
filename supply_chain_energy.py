"""
Supply Chain & Energy Systems - NexusOS Civilization OS
Track resource flows, energy throughput, production chains, waste streams
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime, timedelta
from enum import Enum

class ResourceType(Enum):
    """Types of resources in the economy"""
    FOOD = "Food"
    WATER = "Water"
    ENERGY = "Energy"
    MATERIALS = "Raw Materials"
    MANUFACTURED = "Manufactured Goods"
    SERVICES = "Services"

class EnergySource(Enum):
    """Energy generation sources"""
    SOLAR = "Solar"
    WIND = "Wind"
    HYDRO = "Hydroelectric"
    GEOTHERMAL = "Geothermal"
    NUCLEAR = "Nuclear"
    FOSSIL = "Fossil Fuels"

@dataclass
class ResourceNode:
    """Node in the supply chain (producer, processor, distributor)"""
    node_id: str
    node_type: str  # "PRODUCER", "PROCESSOR", "DISTRIBUTOR"
    resource_type: ResourceType
    location: str
    capacity_per_day: float
    current_output: float = 0.0
    efficiency: float = 0.85  # 0-1
    energy_consumption_kwh: float = 0.0
    
    def daily_production(self) -> float:
        """Calculate actual daily production"""
        return self.capacity_per_day * self.efficiency


@dataclass
class SupplyChainLink:
    """Connection between supply chain nodes"""
    from_node: str
    to_node: str
    resource_type: ResourceType
    daily_flow: float
    transport_energy_kwh: float
    transit_time_hours: float


@dataclass
class EnergyGrid:
    """Civilization's energy infrastructure"""
    grid_id: str
    total_capacity_mw: float
    sources: Dict[EnergySource, float] = field(default_factory=dict)
    current_demand_mw: float = 0.0
    storage_capacity_mwh: float = 0.0
    current_storage_mwh: float = 0.0
    
    def capacity_utilization(self) -> float:
        """Percentage of capacity being used"""
        return (self.current_demand_mw / self.total_capacity_mw) * 100 if self.total_capacity_mw > 0 else 0
    
    def renewable_percentage(self) -> float:
        """Percentage of energy from renewable sources"""
        renewable_sources = {EnergySource.SOLAR, EnergySource.WIND, 
                           EnergySource.HYDRO, EnergySource.GEOTHERMAL}
        
        total = sum(self.sources.values())
        renewable = sum(capacity for source, capacity in self.sources.items() 
                       if source in renewable_sources)
        
        return (renewable / total * 100) if total > 0 else 0


class SupplyChainSystem:
    """
    Manages resource flows, supply chains, and energy systems
    """
    
    def __init__(self):
        # Supply chain nodes
        self.nodes: Dict[str, ResourceNode] = {}
        self.links: List[SupplyChainLink] = []
        
        # Energy system
        self.energy_grids: Dict[str, EnergyGrid] = {}
        
        # Resource tracking
        self.daily_production: Dict[ResourceType, float] = {rt: 0.0 for rt in ResourceType}
        self.daily_consumption: Dict[ResourceType, float] = {rt: 0.0 for rt in ResourceType}
        
        # Waste and efficiency
        self.waste_generated_kg: float = 0.0
        self.waste_recycled_kg: float = 0.0
        self.total_energy_consumption_kwh: float = 0.0
        
    def add_resource_node(self, node: ResourceNode):
        """Add a node to the supply chain"""
        self.nodes[node.node_id] = node
    
    def add_supply_link(self, link: SupplyChainLink):
        """Add a connection between nodes"""
        if link.from_node not in self.nodes:
            raise ValueError(f"Source node {link.from_node} not found")
        if link.to_node not in self.nodes:
            raise ValueError(f"Destination node {link.to_node} not found")
        
        self.links.append(link)
    
    def add_energy_grid(self, grid: EnergyGrid):
        """Add an energy grid to the system"""
        self.energy_grids[grid.grid_id] = grid
    
    def simulate_daily_production(self):
        """Simulate one day of production across all nodes"""
        # Reset daily counters
        self.daily_production = {rt: 0.0 for rt in ResourceType}
        total_energy = 0.0
        
        # Calculate production from each node
        for node in self.nodes.values():
            production = node.daily_production()
            node.current_output = production
            
            self.daily_production[node.resource_type] += production
            total_energy += node.energy_consumption_kwh
        
        self.total_energy_consumption_kwh = total_energy
        
        # Update energy grid demand
        for grid in self.energy_grids.values():
            grid.current_demand_mw = total_energy / 24 / 1000  # Convert kWh to MW
    
    def calculate_supply_chain_efficiency(self) -> float:
        """Calculate overall supply chain efficiency"""
        if not self.nodes:
            return 0.0
        
        avg_efficiency = np.mean([node.efficiency for node in self.nodes.values()])
        return avg_efficiency
    
    def calculate_energy_sustainability(self) -> float:
        """Calculate renewable energy percentage across all grids"""
        if not self.energy_grids:
            return 0.0
        
        renewable_percentages = [grid.renewable_percentage() for grid in self.energy_grids.values()]
        return np.mean(renewable_percentages)
    
    def track_resource_flow(self, resource_type: ResourceType) -> dict:
        """Track flow of a specific resource through the supply chain"""
        # Find all nodes handling this resource
        relevant_nodes = [n for n in self.nodes.values() if n.resource_type == resource_type]
        
        producers = [n for n in relevant_nodes if n.node_type == "PRODUCER"]
        processors = [n for n in relevant_nodes if n.node_type == "PROCESSOR"]
        distributors = [n for n in relevant_nodes if n.node_type == "DISTRIBUTOR"]
        
        total_production = sum(n.current_output for n in producers)
        total_processing = sum(n.current_output for n in processors)
        total_distribution = sum(n.current_output for n in distributors)
        
        return {
            "resource_type": resource_type.value,
            "producers": len(producers),
            "total_production": total_production,
            "processors": len(processors),
            "total_processing": total_processing,
            "distributors": len(distributors),
            "total_distribution": total_distribution,
            "supply_chain_stages": len(producers) + len(processors) + len(distributors)
        }
    
    def get_system_stats(self) -> dict:
        """Get comprehensive supply chain and energy statistics"""
        total_capacity = sum(grid.total_capacity_mw for grid in self.energy_grids.values())
        total_demand = sum(grid.current_demand_mw for grid in self.energy_grids.values())
        
        resource_summary = {
            rt.value: {
                "production": self.daily_production[rt],
                "consumption": self.daily_consumption[rt],
                "balance": self.daily_production[rt] - self.daily_consumption[rt]
            }
            for rt in ResourceType
        }
        
        return {
            "total_nodes": len(self.nodes),
            "total_supply_links": len(self.links),
            "supply_chain_efficiency": self.calculate_supply_chain_efficiency(),
            "total_energy_capacity_mw": total_capacity,
            "total_energy_demand_mw": total_demand,
            "energy_utilization": (total_demand / total_capacity * 100) if total_capacity > 0 else 0,
            "renewable_energy_percent": self.calculate_energy_sustainability(),
            "waste_generated_kg": self.waste_generated_kg,
            "waste_recycled_kg": self.waste_recycled_kg,
            "recycling_rate": (self.waste_recycled_kg / max(1, self.waste_generated_kg)) * 100,
            "resource_summary": resource_summary
        }


# Example usage
if __name__ == "__main__":
    print("=" * 70)
    print("SUPPLY CHAIN & ENERGY SYSTEMS")
    print("=" * 70)
    
    # Initialize system
    supply_chain = SupplyChainSystem()
    
    # Add energy grid
    print("\n1. ENERGY INFRASTRUCTURE:")
    main_grid = EnergyGrid(
        grid_id="GRID-001",
        total_capacity_mw=1000.0,
        sources={
            EnergySource.SOLAR: 300.0,
            EnergySource.WIND: 250.0,
            EnergySource.NUCLEAR: 350.0,
            EnergySource.FOSSIL: 100.0
        },
        storage_capacity_mwh=500.0
    )
    supply_chain.add_energy_grid(main_grid)
    print(f"   Grid capacity: {main_grid.total_capacity_mw:,.0f} MW")
    print(f"   Renewable: {main_grid.renewable_percentage():.1f}%")
    
    # Add supply chain nodes
    print("\n2. SUPPLY CHAIN NODES:")
    
    # Food production
    farm = ResourceNode(
        node_id="FARM-001",
        node_type="PRODUCER",
        resource_type=ResourceType.FOOD,
        location="Region-A",
        capacity_per_day=10000.0,  # kg
        efficiency=0.90,
        energy_consumption_kwh=500.0
    )
    supply_chain.add_resource_node(farm)
    print(f"   Added: {farm.node_id} - Food Producer")
    
    # Food processing
    processor = ResourceNode(
        node_id="PROC-001",
        node_type="PROCESSOR",
        resource_type=ResourceType.FOOD,
        location="Region-B",
        capacity_per_day=8000.0,
        efficiency=0.85,
        energy_consumption_kwh=300.0
    )
    supply_chain.add_resource_node(processor)
    print(f"   Added: {processor.node_id} - Food Processor")
    
    # Distribution
    distributor = ResourceNode(
        node_id="DIST-001",
        node_type="DISTRIBUTOR",
        resource_type=ResourceType.FOOD,
        location="Region-C",
        capacity_per_day=7000.0,
        efficiency=0.95,
        energy_consumption_kwh=200.0
    )
    supply_chain.add_resource_node(distributor)
    print(f"   Added: {distributor.node_id} - Food Distributor")
    
    # Add supply links
    supply_chain.add_supply_link(SupplyChainLink(
        from_node="FARM-001",
        to_node="PROC-001",
        resource_type=ResourceType.FOOD,
        daily_flow=9000.0,
        transport_energy_kwh=100.0,
        transit_time_hours=2.0
    ))
    
    # Simulate daily operations
    print("\n3. DAILY PRODUCTION SIMULATION:")
    supply_chain.simulate_daily_production()
    
    food_flow = supply_chain.track_resource_flow(ResourceType.FOOD)
    print(f"   Food production: {food_flow['total_production']:,.0f} kg/day")
    print(f"   Food processing: {food_flow['total_processing']:,.0f} kg/day")
    print(f"   Food distribution: {food_flow['total_distribution']:,.0f} kg/day")
    
    # System statistics
    print("\n4. SYSTEM STATISTICS:")
    stats = supply_chain.get_system_stats()
    print(f"   Supply chain efficiency: {stats['supply_chain_efficiency']:.1%}")
    print(f"   Energy capacity: {stats['total_energy_capacity_mw']:,.0f} MW")
    print(f"   Energy demand: {stats['total_energy_demand_mw']:.2f} MW")
    print(f"   Utilization: {stats['energy_utilization']:.1f}%")
    print(f"   Renewable energy: {stats['renewable_energy_percent']:.1f}%")
    
    print("\n" + "=" * 70)
    print("Supply chain and energy systems operational!")
    print("=" * 70)
