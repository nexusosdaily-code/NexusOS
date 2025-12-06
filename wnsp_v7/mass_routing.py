"""
WNSP v7.0 — Mass-Weighted Routing

Integration layer connecting Lambda Boson Substrate with Harmonic Protocol.
Routes packets based on gravitational potential from Lambda mass distribution.

Physics Foundation:
- Heavy packets (high Λ) experience gravitational effects
- Nodes with stored value (standing waves) create potential wells
- Routing follows paths of least gravitational resistance
- Conservation of mass-energy is enforced at every hop

Author: Founder Te Rata Pou
License: GPL v3.0
"""

import math
import hashlib
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any

from .protocol import (
    PLANCK_CONSTANT, SPEED_OF_LIGHT,
    HarmonicPacket, HarmonicNode, HarmonicNetwork,
    CarrierWave, ToneSignature, ExcitationEvent, ExcitationState
)

from .substrate import (
    OscillatorState, OscillationRegister, SubstrateEncoder,
    MassLedger, StandingWaveRegistry, GravitationalField, OscillationField,
    lambda_mass_from_frequency
)


@dataclass
class MassRoute:
    """A route weighted by Lambda mass."""
    path: List[str]
    total_distance: float
    gravitational_potential: float
    resonance_score: float
    lambda_cost: float
    
    @property
    def combined_score(self) -> float:
        """
        Combined routing score.
        
        Higher = better route.
        Balances resonance (harmonic alignment) with gravitational cost.
        """
        if self.lambda_cost == 0:
            return self.resonance_score
        return self.resonance_score * 1e35 / (1 + abs(self.gravitational_potential) * self.lambda_cost)


class MassWeightedRouter:
    """
    Router that considers Lambda mass in path selection.
    
    Uses gravitational potential from stored Lambda to influence routing.
    Heavy packets are attracted to or repelled from mass concentrations.
    """
    
    ATTRACTION_MODE = "attract"
    REPULSION_MODE = "repel"
    
    def __init__(self, network: HarmonicNetwork, field: OscillationField,
                 mode: str = None):
        self.network = network
        self.field = field
        self.mode = mode or self.REPULSION_MODE
        
        for node_id in network.nodes:
            if node_id not in field.node_positions:
                pos = self._node_to_position(node_id)
                field.register_node(node_id, pos)
    
    def _node_to_position(self, node_id: str) -> Tuple[float, float]:
        """Convert node_id to consistent 2D position."""
        h = hashlib.sha256(node_id.encode()).hexdigest()
        x = int(h[:8], 16) / 0xFFFFFFFF * 100
        y = int(h[8:16], 16) / 0xFFFFFFFF * 100
        return (x, y)
    
    def find_routes(self, packet: HarmonicPacket, source_id: str,
                   max_routes: int = 5) -> List[MassRoute]:
        """
        Find routes weighted by Lambda mass.
        
        Returns routes sorted by combined score (resonance + gravitational).
        """
        source_node = self.network.get_node(source_id)
        if not source_node:
            return []
        
        target_node = None
        if packet.target_tone:
            target_node = self.network.get_node_by_tone(packet.target_tone)
        
        routes = []
        resonant_routes = source_node.find_resonant_routes(packet)
        
        for next_id, resonance, ratio in resonant_routes[:max_routes * 2]:
            path = [source_id, next_id]
            
            distance = self._calculate_distance(source_id, next_id)
            
            grav_pot = self._calculate_gravitational_potential(path, packet.lambda_mass)
            
            lambda_cost = packet.lambda_mass * distance * self.field.ledger.DISSIPATION_RATE
            
            route = MassRoute(
                path=path,
                total_distance=distance,
                gravitational_potential=grav_pot,
                resonance_score=resonance,
                lambda_cost=lambda_cost
            )
            routes.append(route)
        
        if self.mode == self.ATTRACTION_MODE:
            routes.sort(key=lambda r: -r.gravitational_potential)
        else:
            routes.sort(key=lambda r: r.combined_score, reverse=True)
        
        return routes[:max_routes]
    
    def _calculate_distance(self, from_id: str, to_id: str) -> float:
        """Calculate distance between nodes."""
        pos1 = self.field.node_positions.get(from_id, (0, 0))
        pos2 = self.field.node_positions.get(to_id, (0, 0))
        
        dx = pos2[0] - pos1[0]
        dy = pos2[1] - pos1[1]
        return math.sqrt(dx*dx + dy*dy)
    
    def _calculate_gravitational_potential(self, path: List[str], 
                                          packet_lambda: float) -> float:
        """Calculate total gravitational potential along path."""
        total_potential = 0.0
        
        for node_id in path:
            pos = self.field.node_positions.get(node_id, (0, 0))
            node_potential = self.field.gravity.potential_at(pos)
            total_potential += node_potential
        
        return total_potential * packet_lambda * 1e30
    
    def route_and_transfer(self, packet: HarmonicPacket, source_id: str,
                           register: OscillationRegister = None) -> Tuple[
        Optional[HarmonicPacket], List[str], Dict[str, Any]
    ]:
        """
        Route packet through network with mass-weighted routing.
        
        If register is provided, uses it for substrate transfers.
        Otherwise, only does protocol-level routing.
        
        Returns:
        - Final packet (or None if dropped)
        - Path taken
        - Routing metadata
        """
        routes = self.find_routes(packet, source_id)
        
        if not routes:
            return None, [], {"error": "No routes found"}
        
        best_route = routes[0]
        
        current_node_id = source_id
        path_taken = [source_id]
        
        for next_id in best_route.path[1:]:
            if register:
                register = self.field.transfer(register, current_node_id, next_id)
            current_node_id = next_id
            path_taken.append(next_id)
            
            next_node = self.network.get_node(next_id)
            if next_node:
                result = next_node.on_receive(packet)
                if result:
                    packet = result
        
        metadata = {
            "route_score": best_route.combined_score,
            "gravitational_potential": best_route.gravitational_potential,
            "lambda_cost": best_route.lambda_cost,
            "final_lambda": register.total_lambda_mass if register else 0,
            "path_length": len(path_taken)
        }
        
        return packet, path_taken, metadata


class SubstrateNode:
    """
    A node that operates on the Lambda Boson substrate.
    
    Extends HarmonicNode with substrate integration:
    - Stores value as standing waves
    - Creates packets as oscillation registers
    - Routes based on gravitational potential
    """
    
    def __init__(self, harmonic_node: HarmonicNode, field: OscillationField):
        self.node = harmonic_node
        self.field = field
        self.encoder = SubstrateEncoder()
        
        if harmonic_node.node_id not in field.node_positions:
            h = hashlib.sha256(harmonic_node.node_id.encode()).hexdigest()
            x = int(h[:8], 16) / 0xFFFFFFFF * 100
            y = int(h[8:16], 16) / 0xFFFFFFFF * 100
            field.register_node(harmonic_node.node_id, (x, y))
    
    @property
    def node_id(self) -> str:
        return self.node.node_id
    
    @property
    def stored_lambda(self) -> float:
        """Lambda mass stored at this node."""
        return self.field.get_balance(self.node_id)
    
    @property
    def gravitational_potential(self) -> float:
        """Gravitational potential at this node."""
        pos = self.field.node_positions.get(self.node_id, (0, 0))
        return self.field.gravity.potential_at(pos)
    
    def inject_message(self, data: bytes, authority: int = 0) -> OscillationRegister:
        """Inject message as oscillation into the substrate."""
        return self.field.inject(self.node_id, data, authority)
    
    def store_value(self, register: OscillationRegister) -> float:
        """Store oscillation register as standing wave (stored value)."""
        wave = self.field.store(self.node_id, register)
        return wave.lambda_mass
    
    def retrieve_value(self, amount: float) -> Optional[OscillationRegister]:
        """Retrieve stored Lambda as oscillation register."""
        return self.field.retrieve(self.node_id, amount)
    
    def create_substrate_packet(self, data: bytes, target_tone: Optional[str] = None,
                                authority: int = 0) -> Tuple[HarmonicPacket, OscillationRegister]:
        """
        Create both a HarmonicPacket and OscillationRegister.
        
        The packet carries the protocol information.
        The register carries the actual oscillation (Lambda mass).
        """
        packet = self.node.create_packet(data, target_tone, authority)
        
        register = self.inject_message(data, authority)
        
        packet.meta["oscillation_register_id"] = register.register_id
        packet.meta["lambda_mass"] = register.total_lambda_mass
        
        return packet, register
    
    def status(self) -> Dict[str, Any]:
        """Get extended status including substrate info."""
        base_status = self.node.status()
        base_status.update({
            "stored_lambda": self.stored_lambda,
            "gravitational_potential": self.gravitational_potential,
            "substrate_position": self.field.node_positions.get(self.node_id)
        })
        return base_status


class SubstrateNetwork:
    """
    A network operating on the Lambda Boson substrate.
    
    Wraps HarmonicNetwork with substrate integration.
    All operations go through the OscillationField.
    """
    
    def __init__(self, network: HarmonicNetwork = None):
        self.harmonic_network = network or HarmonicNetwork()
        self.field = OscillationField()
        self.router = MassWeightedRouter(self.harmonic_network, self.field)
        self.substrate_nodes: Dict[str, SubstrateNode] = {}
    
    def add_node(self, node_id: str, stake: float = 1.0) -> SubstrateNode:
        """Add a node to both protocol and substrate layers."""
        harmonic_node = self.harmonic_network.add_node(node_id, stake)
        substrate_node = SubstrateNode(harmonic_node, self.field)
        self.substrate_nodes[node_id] = substrate_node
        return substrate_node
    
    def get_node(self, node_id: str) -> Optional[SubstrateNode]:
        """Get a substrate node."""
        return self.substrate_nodes.get(node_id)
    
    def send_message(self, source_id: str, data: bytes, target_tone: str = None,
                    authority: int = 0) -> Tuple[Optional[HarmonicPacket], Dict[str, Any]]:
        """
        Send a message through the substrate.
        
        The Lambda mass is stored at the destination node upon delivery.
        This completes the conservation cycle: inject → transfer → store.
        
        Returns the final packet and routing metadata.
        """
        source_node = self.substrate_nodes.get(source_id)
        if not source_node:
            return None, {"error": f"Source node {source_id} not found"}
        
        packet, register = source_node.create_substrate_packet(data, target_tone, authority)
        initial_lambda = register.total_lambda_mass
        
        result_packet, path, metadata = self.router.route_and_transfer(
            packet, source_id, register
        )
        
        destination_id = path[-1] if path else source_id
        destination_node = self.substrate_nodes.get(destination_id)
        if destination_node and register.oscillators:
            destination_node.store_value(register)
            metadata["stored_at"] = destination_id
            metadata["stored_lambda"] = register.total_lambda_mass
        
        metadata["path"] = path
        metadata["initial_lambda"] = initial_lambda
        metadata["final_lambda"] = register.total_lambda_mass
        
        return result_packet, metadata
    
    def store_value(self, node_id: str, data: bytes, authority: int = 0) -> Dict[str, Any]:
        """Store value at a node as standing wave."""
        node = self.substrate_nodes.get(node_id)
        if not node:
            return {"error": f"Node {node_id} not found"}
        
        register = node.inject_message(data, authority)
        stored_lambda = node.store_value(register)
        
        return {
            "node_id": node_id,
            "data_size": len(data),
            "lambda_stored": stored_lambda,
            "total_stored": node.stored_lambda
        }
    
    def transfer_value(self, from_id: str, to_id: str, amount: float) -> Dict[str, Any]:
        """Transfer stored Lambda between nodes."""
        from_node = self.substrate_nodes.get(from_id)
        to_node = self.substrate_nodes.get(to_id)
        
        if not from_node or not to_node:
            return {"error": "Node not found"}
        
        if from_node.stored_lambda < amount:
            return {"error": "Insufficient balance"}
        
        register = from_node.retrieve_value(amount)
        if not register:
            return {"error": "Retrieval failed"}
        
        register = self.field.transfer(register, from_id, to_id)
        
        stored = to_node.store_value(register)
        
        return {
            "from": from_id,
            "to": to_id,
            "requested": amount,
            "transferred": stored,
            "dissipated": amount - stored,
            "from_balance": from_node.stored_lambda,
            "to_balance": to_node.stored_lambda
        }
    
    def verify_conservation(self) -> Tuple[bool, float]:
        """Verify mass conservation across the network."""
        return self.field.verify_conservation()
    
    def status(self) -> Dict[str, Any]:
        """Get network status."""
        is_conserved, imbalance = self.verify_conservation()
        
        return {
            "nodes": len(self.substrate_nodes),
            "total_stored_lambda": self.field.standing_waves.get_total_stored(),
            "network_lambda": self.field.ledger.get_network_lambda(),
            "conservation": {
                "is_conserved": is_conserved,
                "imbalance": imbalance
            },
            "node_balances": {
                node_id: node.stored_lambda 
                for node_id, node in self.substrate_nodes.items()
            },
            "ledger_entries": len(self.field.ledger.entries)
        }


if __name__ == "__main__":
    print("=" * 60)
    print("WNSP v7.0 — Mass-Weighted Routing Test")
    print("=" * 60)
    
    network = SubstrateNetwork()
    
    print("\n1. Creating nodes...")
    alice = network.add_node("alice", stake=10.0)
    bob = network.add_node("bob", stake=5.0)
    charlie = network.add_node("charlie", stake=2.0)
    dave = network.add_node("dave", stake=1.0)
    
    print(f"   Created 4 nodes")
    
    print("\n2. Storing value at bob (creating gravity well)...")
    result = network.store_value("bob", b"Stored value at Bob" * 100, authority=5)
    print(f"   Stored: Λ = {result['lambda_stored']:.3e} kg")
    
    print("\n3. Sending message from alice to charlie...")
    packet, metadata = network.send_message("alice", b"Hello Charlie!", 
                                           target_tone=charlie.node.tone_hash, authority=3)
    print(f"   Path: {metadata.get('path', [])}")
    print(f"   Route score: {metadata.get('route_score', 0):.3f}")
    print(f"   Gravitational potential: {metadata.get('gravitational_potential', 0):.3e}")
    
    print("\n4. Transferring value from bob to charlie...")
    transfer_result = network.transfer_value("bob", "charlie", result['lambda_stored'] / 2)
    print(f"   Transferred: {transfer_result.get('transferred', 0):.3e} kg")
    print(f"   Bob balance: {transfer_result.get('from_balance', 0):.3e} kg")
    print(f"   Charlie balance: {transfer_result.get('to_balance', 0):.3e} kg")
    
    print("\n5. Verifying conservation...")
    is_conserved, imbalance = network.verify_conservation()
    print(f"   Conservation: {'✓ PASSED' if is_conserved else '✗ FAILED'}")
    print(f"   Imbalance: {imbalance:.3e} kg")
    
    print("\n" + "=" * 60)
    print("Network Status:")
    import json
    print(json.dumps(network.status(), indent=2, default=str))
    print("=" * 60)
