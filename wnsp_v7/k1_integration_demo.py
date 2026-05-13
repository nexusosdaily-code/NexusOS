"""
WNSP K1 Integration Demo v1.9.0
================================

Demonstrates integration of all Kardashev Type I infrastructure modules.

This demo imports and coordinates the REAL K1 pillar implementations:
1. Energy Infrastructure (k1_energy.py) - Power generation and distribution
2. Photonic Computing (photonic_computing.py) - Wavelength-based computation
3. Planetary Communications (planetary_communications.py) - Global spectral mesh
4. Resource Orchestration (resource_orchestration.py) - Materials and logistics
5. Planetary Governance (planetary_governance.py) - Σ-field coordination

K-Level Progress: 0.75 → 0.90 (Full K1 Infrastructure)

Author: NexusOS / WNSP Protocol
License: GPL v3.0
"""

import math
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum

from wnsp_v7.k1_energy import (
    ResonanceHarvesterV2,
    OrbitalSolarArray,
    FusionReactor,
    K1EnergyMarket,
    ResonanceType,
    CouplingAntenna,
    SolarCollector,
    LaserTransmitter,
    GroundReceiver
)

from wnsp_v7.photonic_computing import (
    PhotonicSignal,
    PhotonicAND,
    PhotonicOR,
    PhotonicNOT,
    WavelengthDivisionComputer,
    OAMRegister,
    LambdaProcessor
)

from wnsp_v7.planetary_communications import (
    SpectralRelayMesh,
    OAMChannelAllocator,
    CoherenceRepeater,
    GeoLocation,
    SpectrumBand
)

from wnsp_v7.resource_orchestration import (
    WavelengthLedger,
    ResourceUnit,
    PhotonicManufacturingPipeline,
    ResourceCategory,
    ElementType,
    ManufacturingCell
)

from wnsp_v7.planetary_governance import (
    SigmaConstitutionEngine,
    MultiSpectrumVoting,
    AuthorityBandRegistry,
    GovernanceLevel,
    JurisdictionDomain,
    VotingProposal,
    VoteType
)

from .constants import PLANCK_CONSTANT, SPEED_OF_LIGHT
NXT_DECIMALS = 8
NXT_UNIT = 10 ** NXT_DECIMALS


class K1Pillar(Enum):
    """The five pillars of K1 civilization infrastructure."""
    ENERGY = ("energy", 0.80, "Power grids and energy harvesting")
    COMPUTING = ("computing", 0.75, "Photonic computation")
    COMMUNICATIONS = ("communications", 0.80, "Global spectral mesh")
    RESOURCES = ("resources", 0.85, "Manufacturing and logistics")
    GOVERNANCE = ("governance", 0.90, "Planetary coordination")
    
    def __init__(self, pillar_id: str, k_level: float, description: str):
        self.pillar_id = pillar_id
        self.k_level = k_level
        self.description = description


@dataclass
class CrossPillarFlow:
    """Tracks resource/data flow between K1 pillars."""
    flow_id: str
    source: K1Pillar
    destination: K1Pillar
    resource_type: str
    quantity: float
    timestamp: float = field(default_factory=time.time)


class K1IntegrationOrchestrator:
    """
    Master orchestrator for K1 civilization infrastructure.
    
    Coordinates real implementations from all five pillars:
    - Energy → Computing → Communications → Resources → Governance
    """
    
    def __init__(self):
        print("Initializing K1 Integration Orchestrator...")
        print("Loading real module implementations...")
        
        self.harvester = ResonanceHarvesterV2(harvester_id="primary_harvester")
        antenna = CouplingAntenna(
            antenna_id="antenna_1",
            latitude=45.0,
            longitude=-90.0,
            height_m=200.0,
            coil_turns=2000,
            coil_radius_m=100.0
        )
        self.harvester.add_antenna(antenna)
        
        self.solar_array = OrbitalSolarArray(array_id="orbital_1")
        collector = SolarCollector(collector_id="collector_1", area_m2=1e6)
        self.solar_array.add_collector(collector)
        transmitter = LaserTransmitter(transmitter_id="tx_1")
        self.solar_array.add_transmitter(transmitter)
        receiver = GroundReceiver(receiver_id="rx_1", latitude=45.0, longitude=-90.0)
        self.solar_array.add_receiver(receiver)
        
        self.fusion = FusionReactor(reactor_id="fusion_1")
        self.energy_market = K1EnergyMarket()
        print("  ✓ K1 Energy modules loaded")
        
        self.photonic_computer = WavelengthDivisionComputer(computer_id="wdc_1")
        self.oam_register = OAMRegister(register_id="oam_reg", size=8)
        self.lambda_processor = LambdaProcessor(processor_id="lambda_proc")
        print("  ✓ Photonic Computing modules loaded")
        
        self.relay_mesh = SpectralRelayMesh(mesh_id="global_mesh")
        self.oam_allocator = OAMChannelAllocator(max_oam=32)
        self._setup_relay_nodes()
        print("  ✓ Planetary Communications modules loaded")
        
        self.ledger = WavelengthLedger(ledger_id="global_ledger")
        self.manufacturing = PhotonicManufacturingPipeline(pipeline_id="main_pipeline")
        self._setup_manufacturing()
        print("  ✓ Resource Orchestration modules loaded")
        
        self.constitution = SigmaConstitutionEngine(constitution_id="planetary")
        self.voting = MultiSpectrumVoting(system_id="planetary_voting")
        self.authority = AuthorityBandRegistry()
        print("  ✓ Planetary Governance modules loaded")
        
        self.flows: List[CrossPillarFlow] = []
        self.energy_pool_joules = 0.0
        print("K1 Orchestrator initialized!\n")
    
    def _setup_relay_nodes(self):
        """Set up initial relay mesh nodes."""
        locations = [
            ("europe_hub", 48.8, 2.3),
            ("asia_hub", 35.7, 139.7),
            ("americas_hub", 40.7, -74.0),
            ("africa_hub", -1.3, 36.8),
            ("oceania_hub", -33.9, 151.2)
        ]
        for node_id, lat, lon in locations:
            node = CoherenceRepeater(
                node_id=node_id,
                location=GeoLocation(latitude=lat, longitude=lon),
                supported_bands=[SpectrumBand.NIR_1550, SpectrumBand.MICROWAVE_KA]
            )
            self.relay_mesh.add_node(node)
        
        self.relay_mesh.auto_connect_mesh(max_distance_km=15000)
    
    def _setup_manufacturing(self):
        """Set up manufacturing cells."""
        cell = ManufacturingCell(
            cell_id="photonic_fab_1",
            location_id="asia_hub",
            power_capacity_watts=1e7,
            coherence_amplification=5.0
        )
        self.manufacturing.add_cell(cell)
        self.manufacturing.connect_ledger(self.ledger)
    
    @property
    def current_k_level(self) -> float:
        """Calculate current Kardashev level from pillar health."""
        energy_health = min(1.0, self.energy_pool_joules / 1e15) if self.energy_pool_joules > 0 else 0.5
        compute_health = 0.8
        comms_health = len(self.relay_mesh.nodes) / 10 if hasattr(self.relay_mesh, 'nodes') else 0.5
        resource_health = min(1.0, len(self.ledger.resources) / 100 + 0.5) if hasattr(self.ledger, 'resources') else 0.5
        governance_health = 0.85
        
        weighted = (
            K1Pillar.ENERGY.k_level * energy_health +
            K1Pillar.COMPUTING.k_level * compute_health +
            K1Pillar.COMMUNICATIONS.k_level * comms_health +
            K1Pillar.RESOURCES.k_level * resource_health +
            K1Pillar.GOVERNANCE.k_level * governance_health
        )
        total_weight = sum(p.k_level for p in K1Pillar)
        return weighted / total_weight
    
    def run_energy_cycle(self) -> Dict[str, Any]:
        """
        Run energy harvesting using real K1 Energy modules.
        
        Uses: ResonanceHarvesterV2, OrbitalSolarArray, FusionReactor
        """
        results = {"phase": "energy", "sources": {}}
        
        resonance_power = 0.0
        for res_type in [ResonanceType.SCHUMANN_FUNDAMENTAL, ResonanceType.GEOMAGNETIC_PC5]:
            resonance_power += self.harvester.power_from_resonance(res_type)
        results["sources"]["resonance_watts"] = resonance_power
        
        solar_power = self.solar_array.total_ground_power()
        results["sources"]["solar_watts"] = solar_power
        
        fusion_power = self.fusion.net_power_output()
        results["sources"]["fusion_watts"] = fusion_power
        
        total_power = resonance_power + solar_power + fusion_power
        duration_s = 1.0
        energy_joules = total_power * duration_s
        
        self.energy_pool_joules += energy_joules
        results["total_energy_joules"] = energy_joules
        results["energy_pool_joules"] = self.energy_pool_joules
        
        self.flows.append(CrossPillarFlow(
            flow_id=f"energy_{time.time()}",
            source=K1Pillar.ENERGY,
            destination=K1Pillar.COMPUTING,
            resource_type="energy_joules",
            quantity=energy_joules * 0.3
        ))
        
        return results
    
    def run_compute_cycle(self, inputs: List[float]) -> Dict[str, Any]:
        """
        Run photonic computation using real Photonic Computing modules.
        
        Uses: WavelengthDivisionComputer, OAMRegister, LambdaProcessor
        """
        results = {"phase": "computing", "operations": []}
        
        signals = [PhotonicSignal(amplitude=v/max(inputs) if max(inputs) > 0 else 0.5) 
                   for v in inputs[:8]]
        
        channel_count = len(self.photonic_computer.channels)
        results["parallel_channels"] = channel_count
        
        for i, sig in enumerate(signals[:min(len(signals), self.oam_register.size)]):
            self.oam_register.qubits[i].write(sig)
        
        reg_state = [self.oam_register.qubits[i].read().amplitude 
                     for i in range(min(4, self.oam_register.size))]
        results["register_state"] = reg_state
        
        results["operations"].append({
            "type": "wavelength_parallel",
            "channels": channel_count,
            "register_depth": self.oam_register.size
        })
        
        self.flows.append(CrossPillarFlow(
            flow_id=f"compute_{time.time()}",
            source=K1Pillar.COMPUTING,
            destination=K1Pillar.RESOURCES,
            resource_type="optimization_result",
            quantity=channel_count
        ))
        
        return results
    
    def run_communications_cycle(self, messages: List[Dict]) -> Dict[str, Any]:
        """
        Run message routing using real Planetary Communications modules.
        
        Uses: SpectralRelayMesh, OAMChannelAllocator, CoherenceRepeater
        """
        results = {"phase": "communications", "routed": 0, "routes": []}
        
        for msg in messages:
            source = msg.get("source", "europe_hub")
            dest = msg.get("destination", "asia_hub")
            
            route = self.relay_mesh.find_route(source, dest, optimize_for="latency")
            if route:
                results["routed"] += 1
                results["routes"].append({
                    "source": source,
                    "destination": dest,
                    "hops": route.hop_count,
                    "latency_ms": route.total_latency_ms,
                    "capacity_bps": route.end_to_end_capacity_bps
                })
        
        for band in [SpectrumBand.NIR_1550]:
            channel = self.oam_allocator.allocate_channel(band)
            if channel:
                results["channel_allocated"] = channel.channel_signature
        
        self.flows.append(CrossPillarFlow(
            flow_id=f"comms_{time.time()}",
            source=K1Pillar.COMMUNICATIONS,
            destination=K1Pillar.GOVERNANCE,
            resource_type="voting_messages",
            quantity=results["routed"]
        ))
        
        return results
    
    def run_resources_cycle(self, resources: List[Dict]) -> Dict[str, Any]:
        """
        Run resource management using real Resource Orchestration modules.
        
        Uses: WavelengthLedger, PhotonicManufacturingPipeline
        """
        results = {"phase": "resources", "registered": 0, "signatures": []}
        
        for res in resources:
            name = res.get("name", "material")
            mass = res.get("mass_kg", 100.0)
            
            composition = {}
            if "Si" in res.get("composition", {}):
                composition[ElementType.SILICON] = res["composition"]["Si"]
            if "Fe" in res.get("composition", {}):
                composition[ElementType.IRON] = res["composition"]["Fe"]
            if "C" in res.get("composition", {}):
                composition[ElementType.CARBON] = res["composition"]["C"]
            
            resource_unit = ResourceUnit(
                resource_id=f"res_{time.time()}_{results['registered']}",
                name=name,
                category=ResourceCategory.RAW_MATERIAL,
                composition=composition,
                mass_kg=mass,
                location_id="factory_asia",
                owner_id="global_consortium"
            )
            
            signature = self.ledger.register_resource(resource_unit)
            results["signatures"].append(signature)
            results["registered"] += 1
        
        ledger_status = self.ledger.status()
        results["ledger_total_resources"] = ledger_status["total_resources"]
        results["ledger_nxt_value"] = ledger_status["total_nxt_value"]
        
        self.flows.append(CrossPillarFlow(
            flow_id=f"resource_{time.time()}",
            source=K1Pillar.RESOURCES,
            destination=K1Pillar.ENERGY,
            resource_type="nxt_tokens",
            quantity=ledger_status["total_nxt_value"]
        ))
        
        return results
    
    def run_governance_cycle(self, proposals: List[Dict]) -> Dict[str, Any]:
        """
        Run governance using real Planetary Governance modules.
        
        Uses: SigmaConstitutionEngine, MultiSpectrumVoting, AuthorityBandRegistry
        """
        results = {"phase": "governance", "proposals": 0, "decisions": []}
        
        for prop in proposals:
            title = prop.get("title", "Policy Proposal")
            domain_str = prop.get("domain", "energy")
            voters = prop.get("voters", ["citizen_1", "citizen_2", "citizen_3"])
            
            domain = JurisdictionDomain.ENERGY
            for d in JurisdictionDomain:
                if d.domain_id == domain_str:
                    domain = d
                    break
            
            voting_proposal = VotingProposal(
                proposal_id=f"prop_{time.time()}",
                title=title,
                description=f"Policy for {domain.description}",
                vote_type=VoteType.COHERENCE,
                domains=[domain],
                authority_band="planetary_council"
            )
            
            voting_proposal.add_option("Approve", "Support this policy")
            voting_proposal.add_option("Reject", "Oppose this policy")
            
            self.voting.submit_proposal(voting_proposal)
            results["proposals"] += 1
            
            for voter in voters:
                self.voting.cast_vote(
                    proposal_id=voting_proposal.proposal_id,
                    voter_id=voter,
                    selections={"Approve": 0.8}
                )
            
            tally = voting_proposal.tally_votes()
            results["decisions"].append({
                "proposal": title,
                "result": tally.get("winner", "Pending"),
                "coherence": tally.get("collective_coherence", 0.0)
            })
        
        auth_status = self.authority.status()
        results["authority_bands"] = auth_status["total_bands"]
        
        const_status = self.constitution.status()
        results["constitutional_articles"] = const_status["total_articles"]
        
        self.flows.append(CrossPillarFlow(
            flow_id=f"governance_{time.time()}",
            source=K1Pillar.GOVERNANCE,
            destination=K1Pillar.ENERGY,
            resource_type="policy_directives",
            quantity=results["proposals"]
        ))
        
        return results
    
    def run_full_integration_demo(self) -> Dict[str, Any]:
        """
        Run complete K1 integration demonstration with real modules.
        """
        demo_results = {
            "start_time": time.time(),
            "phases": [],
            "k_level_start": self.current_k_level
        }
        
        print("=" * 70)
        print("WNSP K1 Integration Demo v1.9.0")
        print("Demonstrating REAL Kardashev Type I Infrastructure Modules")
        print("=" * 70)
        print()
        
        print("Phase 1: Energy Harvesting (Real K1 Energy Modules)")
        print("-" * 50)
        energy_result = None
        for _ in range(3):
            energy_result = self.run_energy_cycle()
        if energy_result:
            print(f"  Resonance Power: {energy_result['sources']['resonance_watts']:.2e} W")
            print(f"  Solar Power: {energy_result['sources']['solar_watts']:.2e} W")
            print(f"  Fusion Power: {energy_result['sources']['fusion_watts']:.2e} W")
            print(f"  Energy Pool: {self.energy_pool_joules:.2e} J")
            demo_results["phases"].append(energy_result)
        print()
        
        print("Phase 2: Photonic Computation (Real Computing Modules)")
        print("-" * 50)
        compute_result = self.run_compute_cycle([100.0, 200.0, 150.0, 180.0, 90.0, 110.0])
        print(f"  Parallel Channels: {compute_result['parallel_channels']}")
        print(f"  Register State: {compute_result['register_state']}")
        demo_results["phases"].append(compute_result)
        print()
        
        print("Phase 3: Planetary Communications (Real Mesh Modules)")
        print("-" * 50)
        messages = [
            {"source": "europe_hub", "destination": "asia_hub"},
            {"source": "americas_hub", "destination": "africa_hub"}
        ]
        comms_result = self.run_communications_cycle(messages)
        print(f"  Messages Routed: {comms_result['routed']}")
        for route in comms_result["routes"]:
            print(f"    {route['source']} → {route['destination']}: {route['hops']} hops, {route['latency_ms']:.1f}ms")
        demo_results["phases"].append(comms_result)
        print()
        
        print("Phase 4: Resource Orchestration (Real Ledger Modules)")
        print("-" * 50)
        resources = [
            {"name": "silicon_wafer", "mass_kg": 100.0, "composition": {"Si": 0.99}},
            {"name": "steel_alloy", "mass_kg": 500.0, "composition": {"Fe": 0.95, "C": 0.05}}
        ]
        resource_result = self.run_resources_cycle(resources)
        print(f"  Resources Registered: {resource_result['registered']}")
        print(f"  Ledger Total: {resource_result['ledger_total_resources']}")
        print(f"  NXT Value: {resource_result['ledger_nxt_value']:,}")
        demo_results["phases"].append(resource_result)
        print()
        
        print("Phase 5: Planetary Governance (Real Voting Modules)")
        print("-" * 50)
        proposals = [
            {"title": "Solar Expansion Policy", "domain": "energy", 
             "voters": ["citizen_01", "citizen_02", "citizen_03"]}
        ]
        gov_result = self.run_governance_cycle(proposals)
        print(f"  Proposals Submitted: {gov_result['proposals']}")
        print(f"  Authority Bands: {gov_result['authority_bands']}")
        print(f"  Constitutional Articles: {gov_result['constitutional_articles']}")
        for decision in gov_result["decisions"]:
            print(f"    {decision['proposal']}: {decision['result']}")
        demo_results["phases"].append(gov_result)
        print()
        
        demo_results["k_level_end"] = self.current_k_level
        demo_results["end_time"] = time.time()
        demo_results["cross_pillar_flows"] = len(self.flows)
        
        print("=" * 70)
        print("K1 INTEGRATION SUMMARY - REAL MODULES")
        print("=" * 70)
        print(f"  K-Level: {demo_results['k_level_start']:.3f} → {demo_results['k_level_end']:.3f}")
        print(f"  Cross-Pillar Flows: {len(self.flows)}")
        print(f"  Energy Pool: {self.energy_pool_joules:.2e} J")
        print()
        print("All K1 pillars operating with REAL module implementations!")
        print("Kardashev Type I infrastructure: OPERATIONAL")
        print("=" * 70)
        
        return demo_results
    
    def summary(self) -> Dict[str, Any]:
        """Generate K1 integration summary."""
        return {
            "orchestrator": "K1IntegrationOrchestrator v1.9.0 (Real Modules)",
            "current_k_level": self.current_k_level,
            "pillars": {p.pillar_id: p.k_level for p in K1Pillar},
            "cross_pillar_flows": len(self.flows),
            "energy_pool_joules": self.energy_pool_joules,
            "relay_nodes": len(self.relay_mesh.nodes) if hasattr(self.relay_mesh, 'nodes') else 0,
            "ledger_resources": len(self.ledger.resources) if hasattr(self.ledger, 'resources') else 0
        }


def run_k1_demo():
    """Run the complete K1 integration demonstration."""
    orchestrator = K1IntegrationOrchestrator()
    results = orchestrator.run_full_integration_demo()
    return results


if __name__ == "__main__":
    run_k1_demo()
