"""
WNSP v7.0 — Mesh P2P Network for Remote Communities

Physics-based mesh networking for areas without traditional internet.
Enables BHLS distribution and health programs in remote locations.

Key Features:
- Offline-first message queuing with sync on reconnect
- Multi-hop routing through sparse networks
- Solar-powered relay node support
- Store-and-forward for intermittent connectivity
- Community relay stations for hub-and-spoke topology
- Lambda mass conservation even in offline mode

"Connectivity is a human right. The substrate reaches all peoples."

GPL v3.0 License — Community Owned, Physics Governed
"""

import time
import math
import hashlib
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple, Any
from enum import Enum
from collections import deque

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class NodeType(Enum):
    """Types of mesh network nodes."""
    MOBILE = "mobile"              # Phone/tablet with intermittent connectivity
    RELAY = "relay"                # Fixed relay station (solar powered)
    GATEWAY = "gateway"            # Bridge to internet backbone
    COMMUNITY_HUB = "community_hub"  # Central community access point


class ConnectionType(Enum):
    """Types of mesh connections."""
    WIFI_DIRECT = "wifi_direct"    # Device-to-device WiFi
    BLUETOOTH = "bluetooth"        # Short range Bluetooth
    LORA = "lora"                  # Long range radio (rural)
    SATELLITE = "satellite"        # Satellite uplink (gateway)
    MESH_RADIO = "mesh_radio"      # Dedicated mesh radio


class MessagePriority(Enum):
    """Message priority for queuing."""
    EMERGENCY = 0      # Medical emergency, crisis
    BHLS = 1           # BHLS distribution messages
    HEALTH = 2         # Health program updates
    GOVERNANCE = 3     # Voting, proposals
    STANDARD = 4       # Normal messages
    BULK = 5           # Large data sync


@dataclass
class MeshNode:
    """A node in the mesh network."""
    node_id: str
    node_type: NodeType
    community_id: str
    location: Dict[str, float]  # lat, lon, altitude
    power_source: str = "solar"  # solar, battery, grid
    battery_percent: float = 100.0
    connection_types: List[ConnectionType] = field(default_factory=list)
    range_meters: float = 1000.0
    last_seen: float = field(default_factory=time.time)
    is_online: bool = True
    neighbors: Set[str] = field(default_factory=set)
    queued_messages: int = 0
    lambda_mass_stored: float = 0.0
    
    def calculate_distance(self, other: 'MeshNode') -> float:
        """Calculate distance to another node using Haversine formula."""
        R = 6371000  # Earth radius in meters
        
        lat1 = math.radians(self.location.get('lat', 0))
        lat2 = math.radians(other.location.get('lat', 0))
        dlat = lat2 - lat1
        dlon = math.radians(other.location.get('lon', 0) - self.location.get('lon', 0))
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def can_reach(self, other: 'MeshNode') -> bool:
        """Check if this node can directly reach another."""
        distance = self.calculate_distance(other)
        return distance <= self.range_meters and self.is_online


@dataclass
class MeshMessage:
    """A message in the mesh network with store-and-forward capability."""
    message_id: str = ""
    source_node: str = ""
    destination_node: str = ""
    destination_community: str = ""  # For broadcast to community
    payload: bytes = b""
    payload_type: str = "text"
    priority: MessagePriority = MessagePriority.STANDARD
    lambda_mass: float = 0.0
    created_at: float = field(default_factory=time.time)
    expires_at: float = 0.0
    hop_count: int = 0
    max_hops: int = 10
    path: List[str] = field(default_factory=list)
    delivered: bool = False
    delivery_confirmed: bool = False
    
    def __post_init__(self):
        if not self.message_id:
            self.message_id = hashlib.sha256(
                f"{self.source_node}:{self.destination_node}:{self.created_at}:{len(self.payload)}".encode()
            ).hexdigest()[:16]
        
        if self.expires_at == 0:
            # Default expiry: 7 days for standard, 30 days for BHLS
            if self.priority == MessagePriority.BHLS:
                self.expires_at = self.created_at + (30 * 24 * 3600)
            else:
                self.expires_at = self.created_at + (7 * 24 * 3600)
        
        if self.lambda_mass == 0:
            # Calculate Lambda mass from payload size
            frequency = 5e14  # Green light frequency
            energy = PLANCK_CONSTANT * frequency * len(self.payload)
            self.lambda_mass = energy / (SPEED_OF_LIGHT ** 2)
    
    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at
    
    @property
    def can_hop(self) -> bool:
        return self.hop_count < self.max_hops and not self.is_expired


class MeshNetwork:
    """
    Mesh P2P Network Manager for Remote Communities.
    
    Provides connectivity for communities without traditional internet
    through multi-hop mesh routing and store-and-forward messaging.
    """
    
    def __init__(self, network_id: str = "nexus_mesh"):
        self.network_id = network_id
        self._nodes: Dict[str, MeshNode] = {}
        self._message_queue: Dict[str, deque] = {}  # node_id -> queued messages
        self._delivered_messages: Set[str] = set()
        self._routing_table: Dict[str, Dict[str, Tuple[str, int]]] = {}  # dest -> {via_node: (next_hop, hop_count)}
        self._community_gateways: Dict[str, str] = {}  # community_id -> gateway_node_id
        self._sync_pending: Dict[str, List[MeshMessage]] = {}  # node_id -> messages to sync
        self._total_lambda_mass = 0.0
    
    def register_node(
        self,
        node_id: str,
        node_type: NodeType,
        community_id: str,
        location: Dict[str, float],
        connection_types: List[ConnectionType],
        power_source: str = "solar",
        range_meters: float = 1000.0
    ) -> MeshNode:
        """Register a new node in the mesh network."""
        node = MeshNode(
            node_id=node_id,
            node_type=node_type,
            community_id=community_id,
            location=location,
            power_source=power_source,
            connection_types=connection_types,
            range_meters=range_meters
        )
        
        self._nodes[node_id] = node
        self._message_queue[node_id] = deque(maxlen=1000)
        self._sync_pending[node_id] = []
        
        # If this is a gateway, register as community gateway
        if node_type == NodeType.GATEWAY:
            self._community_gateways[community_id] = node_id
        
        # Discover neighbors
        self._discover_neighbors(node_id)
        
        # Update routing table
        self._update_routing_table()
        
        return node
    
    def register_relay_station(
        self,
        relay_id: str,
        community_id: str,
        location: Dict[str, float],
        solar_panel_watts: float = 100.0,
        battery_capacity_wh: float = 500.0,
        range_meters: float = 5000.0
    ) -> MeshNode:
        """Register a solar-powered relay station."""
        return self.register_node(
            node_id=relay_id,
            node_type=NodeType.RELAY,
            community_id=community_id,
            location=location,
            connection_types=[ConnectionType.LORA, ConnectionType.WIFI_DIRECT],
            power_source="solar",
            range_meters=range_meters
        )
    
    def register_community_hub(
        self,
        hub_id: str,
        community_id: str,
        location: Dict[str, float],
        has_satellite: bool = False
    ) -> MeshNode:
        """Register a community hub (central access point)."""
        connection_types = [ConnectionType.WIFI_DIRECT, ConnectionType.LORA]
        if has_satellite:
            connection_types.append(ConnectionType.SATELLITE)
        
        node_type = NodeType.GATEWAY if has_satellite else NodeType.COMMUNITY_HUB
        
        return self.register_node(
            node_id=hub_id,
            node_type=node_type,
            community_id=community_id,
            location=location,
            connection_types=connection_types,
            power_source="solar",
            range_meters=2000.0
        )
    
    def _discover_neighbors(self, node_id: str) -> None:
        """Discover neighboring nodes within range."""
        if node_id not in self._nodes:
            return
        
        node = self._nodes[node_id]
        node.neighbors.clear()
        
        for other_id, other_node in self._nodes.items():
            if other_id != node_id and node.can_reach(other_node):
                node.neighbors.add(other_id)
                other_node.neighbors.add(node_id)
    
    def _update_routing_table(self) -> None:
        """Update routing table using distance-vector algorithm."""
        # Initialize routing table
        self._routing_table.clear()
        
        for node_id in self._nodes:
            self._routing_table[node_id] = {}
            # Direct neighbors are 1 hop
            for neighbor in self._nodes[node_id].neighbors:
                self._routing_table[node_id][neighbor] = (neighbor, 1)
        
        # Bellman-Ford style updates
        changed = True
        iterations = 0
        max_iterations = len(self._nodes)
        
        while changed and iterations < max_iterations:
            changed = False
            iterations += 1
            
            for node_id in self._nodes:
                for dest_id in self._nodes:
                    if dest_id == node_id:
                        continue
                    
                    # Check routes through neighbors
                    for neighbor in self._nodes[node_id].neighbors:
                        if dest_id in self._routing_table.get(neighbor, {}):
                            via_neighbor = self._routing_table[neighbor][dest_id]
                            new_hops = via_neighbor[1] + 1
                            
                            current = self._routing_table[node_id].get(dest_id)
                            if current is None or new_hops < current[1]:
                                self._routing_table[node_id][dest_id] = (neighbor, new_hops)
                                changed = True
    
    def send_message(
        self,
        source_node: str,
        destination_node: str,
        payload: bytes,
        payload_type: str = "text",
        priority: MessagePriority = MessagePriority.STANDARD
    ) -> MeshMessage:
        """Send a message through the mesh network."""
        message = MeshMessage(
            source_node=source_node,
            destination_node=destination_node,
            payload=payload,
            payload_type=payload_type,
            priority=priority
        )
        message.path.append(source_node)
        
        # Track Lambda mass
        self._total_lambda_mass += message.lambda_mass
        
        # Try to route immediately
        if source_node in self._nodes and self._nodes[source_node].is_online:
            self._route_message(message, source_node)
        else:
            # Queue for later delivery
            self._queue_message(source_node, message)
        
        return message
    
    def broadcast_to_community(
        self,
        source_node: str,
        community_id: str,
        payload: bytes,
        payload_type: str = "text",
        priority: MessagePriority = MessagePriority.STANDARD
    ) -> List[MeshMessage]:
        """Broadcast message to all nodes in a community."""
        messages = []
        
        for node_id, node in self._nodes.items():
            if node.community_id == community_id and node_id != source_node:
                message = self.send_message(
                    source_node=source_node,
                    destination_node=node_id,
                    payload=payload,
                    payload_type=payload_type,
                    priority=priority
                )
                messages.append(message)
        
        return messages
    
    def send_bhls_notification(
        self,
        source_node: str,
        recipient_node: str,
        amount_nxt: float,
        month: str
    ) -> MeshMessage:
        """Send BHLS distribution notification with high priority."""
        payload = f"BHLS:{amount_nxt}:{month}".encode()
        
        return self.send_message(
            source_node=source_node,
            destination_node=recipient_node,
            payload=payload,
            payload_type="bhls_notification",
            priority=MessagePriority.BHLS
        )
    
    def send_emergency(
        self,
        source_node: str,
        community_id: str,
        emergency_type: str,
        details: str
    ) -> List[MeshMessage]:
        """Send emergency broadcast to community with highest priority."""
        payload = f"EMERGENCY:{emergency_type}:{details}".encode()
        
        return self.broadcast_to_community(
            source_node=source_node,
            community_id=community_id,
            payload=payload,
            payload_type="emergency",
            priority=MessagePriority.EMERGENCY
        )
    
    def _route_message(self, message: MeshMessage, current_node: str) -> bool:
        """Route message to next hop or deliver if destination reached."""
        if message.message_id in self._delivered_messages:
            return True  # Already delivered
        
        if not message.can_hop:
            return False  # Expired or max hops reached
        
        destination = message.destination_node
        
        # Check if we're at destination
        if current_node == destination:
            message.delivered = True
            self._delivered_messages.add(message.message_id)
            return True
        
        # Find next hop
        if current_node not in self._routing_table:
            self._queue_message(current_node, message)
            return False
        
        routes = self._routing_table[current_node]
        if destination not in routes:
            # No route - queue for later
            self._queue_message(current_node, message)
            return False
        
        next_hop, _ = routes[destination]
        next_node = self._nodes.get(next_hop)
        
        if next_node and next_node.is_online:
            # Forward to next hop
            message.hop_count += 1
            message.path.append(next_hop)
            return self._route_message(message, next_hop)
        else:
            # Next hop offline - queue
            self._queue_message(current_node, message)
            return False
    
    def _queue_message(self, node_id: str, message: MeshMessage) -> None:
        """Queue message for later delivery."""
        if node_id not in self._message_queue:
            self._message_queue[node_id] = deque(maxlen=1000)
        
        # Priority queue - insert based on priority
        queue = self._message_queue[node_id]
        
        # Find insertion point (lower priority value = higher priority)
        inserted = False
        for i, queued in enumerate(queue):
            if message.priority.value < queued.priority.value:
                queue.insert(i, message)
                inserted = True
                break
        
        if not inserted:
            queue.append(message)
        
        # Update node queued count
        if node_id in self._nodes:
            self._nodes[node_id].queued_messages = len(queue)
    
    def sync_node(self, node_id: str) -> Dict[str, Any]:
        """
        Sync a node that comes back online.
        Delivers queued messages and receives pending messages.
        """
        if node_id not in self._nodes:
            return {"error": "Node not found"}
        
        node = self._nodes[node_id]
        node.is_online = True
        node.last_seen = time.time()
        
        results = {
            "node_id": node_id,
            "messages_sent": 0,
            "messages_received": 0,
            "lambda_mass_transferred": 0.0
        }
        
        # Deliver pending messages TO this node
        for other_node_id, queue in self._message_queue.items():
            messages_to_remove = []
            
            for message in queue:
                if message.destination_node == node_id and not message.is_expired:
                    message.delivered = True
                    self._delivered_messages.add(message.message_id)
                    messages_to_remove.append(message)
                    results["messages_received"] += 1
                    results["lambda_mass_transferred"] += message.lambda_mass
            
            for msg in messages_to_remove:
                queue.remove(msg)
        
        # Send queued messages FROM this node
        if node_id in self._message_queue:
            queue = self._message_queue[node_id]
            messages_sent = []
            
            for message in list(queue):
                if not message.is_expired and self._route_message(message, node_id):
                    messages_sent.append(message)
                    results["messages_sent"] += 1
                    results["lambda_mass_transferred"] += message.lambda_mass
            
            for msg in messages_sent:
                if msg in queue:
                    queue.remove(msg)
            
            node.queued_messages = len(queue)
        
        # Update routing table
        self._discover_neighbors(node_id)
        self._update_routing_table()
        
        return results
    
    def set_node_offline(self, node_id: str) -> None:
        """Mark a node as offline."""
        if node_id in self._nodes:
            self._nodes[node_id].is_online = False
            self._update_routing_table()
    
    def get_network_stats(self) -> Dict[str, Any]:
        """Get mesh network statistics."""
        online_nodes = sum(1 for n in self._nodes.values() if n.is_online)
        total_queued = sum(len(q) for q in self._message_queue.values())
        
        communities = {}
        for node in self._nodes.values():
            if node.community_id not in communities:
                communities[node.community_id] = {
                    "nodes": 0,
                    "online": 0,
                    "has_gateway": False
                }
            communities[node.community_id]["nodes"] += 1
            if node.is_online:
                communities[node.community_id]["online"] += 1
            if node.node_type == NodeType.GATEWAY:
                communities[node.community_id]["has_gateway"] = True
        
        return {
            "network_id": self.network_id,
            "total_nodes": len(self._nodes),
            "online_nodes": online_nodes,
            "offline_nodes": len(self._nodes) - online_nodes,
            "total_messages_queued": total_queued,
            "messages_delivered": len(self._delivered_messages),
            "total_lambda_mass": self._total_lambda_mass,
            "communities": communities,
            "gateways": len(self._community_gateways)
        }
    
    def get_node_status(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific node."""
        if node_id not in self._nodes:
            return None
        
        node = self._nodes[node_id]
        
        return {
            "node_id": node_id,
            "node_type": node.node_type.value,
            "community_id": node.community_id,
            "is_online": node.is_online,
            "battery_percent": node.battery_percent,
            "power_source": node.power_source,
            "neighbors": list(node.neighbors),
            "neighbor_count": len(node.neighbors),
            "queued_messages": node.queued_messages,
            "lambda_mass_stored": node.lambda_mass_stored,
            "last_seen": node.last_seen,
            "range_meters": node.range_meters
        }
    
    def find_route(self, source: str, destination: str) -> Optional[List[str]]:
        """Find route between two nodes."""
        if source not in self._nodes or destination not in self._nodes:
            return None
        
        if source == destination:
            return [source]
        
        if source not in self._routing_table:
            return None
        
        if destination not in self._routing_table[source]:
            return None
        
        # Reconstruct path
        path = [source]
        current = source
        visited = set()
        
        while current != destination:
            if current in visited:
                return None  # Loop detected
            visited.add(current)
            
            if current not in self._routing_table:
                return None
            if destination not in self._routing_table[current]:
                return None
            
            next_hop, _ = self._routing_table[current][destination]
            path.append(next_hop)
            current = next_hop
        
        return path
    
    def calculate_connectivity_score(self, community_id: str) -> float:
        """
        Calculate connectivity score for a community (0-100).
        Based on: % online, gateway access, average neighbors.
        """
        community_nodes = [n for n in self._nodes.values() if n.community_id == community_id]
        
        if not community_nodes:
            return 0.0
        
        # Factor 1: Percentage online (40%)
        online = sum(1 for n in community_nodes if n.is_online)
        online_score = (online / len(community_nodes)) * 40
        
        # Factor 2: Has gateway (30%)
        has_gateway = any(n.node_type == NodeType.GATEWAY for n in community_nodes)
        gateway_score = 30 if has_gateway else 0
        
        # Factor 3: Average connectivity (30%)
        if online > 0:
            avg_neighbors = sum(len(n.neighbors) for n in community_nodes if n.is_online) / online
            # Normalize: 3+ neighbors = full score
            neighbor_score = min(avg_neighbors / 3, 1.0) * 30
        else:
            neighbor_score = 0
        
        return online_score + gateway_score + neighbor_score
    
    def get_isolated_communities(self) -> List[str]:
        """Find communities with no gateway access."""
        isolated = []
        
        communities = set(n.community_id for n in self._nodes.values())
        
        for community_id in communities:
            has_gateway = community_id in self._community_gateways
            
            if not has_gateway:
                # Check if can reach any gateway
                community_nodes = [n for n in self._nodes.values() 
                                   if n.community_id == community_id and n.is_online]
                
                can_reach_gateway = False
                for node in community_nodes:
                    for gateway_community, gateway_id in self._community_gateways.items():
                        route = self.find_route(node.node_id, gateway_id)
                        if route:
                            can_reach_gateway = True
                            break
                    if can_reach_gateway:
                        break
                
                if not can_reach_gateway:
                    isolated.append(community_id)
        
        return isolated


class RemoteCommunityMesh:
    """
    High-level interface for remote community mesh networking.
    
    Designed for communities without traditional internet access.
    Ensures BHLS distributions and health programs reach all peoples.
    """
    
    def __init__(self):
        self.mesh = MeshNetwork("nexus_remote_communities")
        self._communities: Dict[str, Dict] = {}
    
    def setup_community(
        self,
        community_id: str,
        community_name: str,
        center_location: Dict[str, float],
        population: int,
        has_satellite: bool = False
    ) -> Dict[str, Any]:
        """Set up mesh network for a remote community."""
        # Register community hub
        hub = self.mesh.register_community_hub(
            hub_id=f"hub_{community_id}",
            community_id=community_id,
            location=center_location,
            has_satellite=has_satellite
        )
        
        self._communities[community_id] = {
            "name": community_name,
            "center_location": center_location,
            "population": population,
            "hub_id": hub.node_id,
            "has_satellite": has_satellite,
            "relay_count": 0
        }
        
        return {
            "community_id": community_id,
            "hub_registered": True,
            "has_internet_gateway": has_satellite,
            "message": f"Community {community_name} mesh network initialized"
        }
    
    def add_relay_station(
        self,
        community_id: str,
        relay_name: str,
        location: Dict[str, float],
        solar_watts: float = 100.0,
        range_km: float = 5.0
    ) -> Dict[str, Any]:
        """Add a solar-powered relay station to extend coverage."""
        if community_id not in self._communities:
            return {"error": f"Community {community_id} not found"}
        
        relay_id = f"relay_{community_id}_{self._communities[community_id]['relay_count']}"
        
        relay = self.mesh.register_relay_station(
            relay_id=relay_id,
            community_id=community_id,
            location=location,
            solar_panel_watts=solar_watts,
            range_meters=range_km * 1000
        )
        
        self._communities[community_id]["relay_count"] += 1
        
        return {
            "relay_id": relay_id,
            "community_id": community_id,
            "location": location,
            "range_km": range_km,
            "power": f"{solar_watts}W solar",
            "neighbors": list(relay.neighbors)
        }
    
    def register_user_device(
        self,
        device_id: str,
        community_id: str,
        location: Dict[str, float]
    ) -> Dict[str, Any]:
        """Register a user's mobile device on the mesh."""
        node = self.mesh.register_node(
            node_id=device_id,
            node_type=NodeType.MOBILE,
            community_id=community_id,
            location=location,
            connection_types=[ConnectionType.WIFI_DIRECT, ConnectionType.BLUETOOTH],
            power_source="battery",
            range_meters=100.0
        )
        
        return {
            "device_id": device_id,
            "registered": True,
            "community": community_id,
            "neighbors": list(node.neighbors),
            "can_reach_hub": f"hub_{community_id}" in node.neighbors
        }
    
    def distribute_bhls(
        self,
        community_id: str,
        distributions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Distribute BHLS notifications to community members."""
        if community_id not in self._communities:
            return {"error": f"Community {community_id} not found"}
        
        hub_id = self._communities[community_id]["hub_id"]
        results = []
        
        for dist in distributions:
            recipient = dist.get("device_id")
            amount = dist.get("amount_nxt", 1150)
            month = dist.get("month", "current")
            
            message = self.mesh.send_bhls_notification(
                source_node=hub_id,
                recipient_node=recipient,
                amount_nxt=amount,
                month=month
            )
            
            results.append({
                "recipient": recipient,
                "amount": amount,
                "message_id": message.message_id,
                "delivered": message.delivered,
                "queued": not message.delivered
            })
        
        delivered = sum(1 for r in results if r["delivered"])
        queued = len(results) - delivered
        
        return {
            "community_id": community_id,
            "total_distributions": len(results),
            "delivered_immediately": delivered,
            "queued_for_sync": queued,
            "results": results
        }
    
    def sync_offline_devices(self, community_id: str) -> Dict[str, Any]:
        """Sync all devices that come online in a community."""
        if community_id not in self._communities:
            return {"error": f"Community {community_id} not found"}
        
        results = []
        
        for node_id, node in self.mesh._nodes.items():
            if node.community_id == community_id:
                sync_result = self.mesh.sync_node(node_id)
                if "error" not in sync_result:
                    results.append(sync_result)
        
        total_sent = sum(r.get("messages_sent", 0) for r in results)
        total_received = sum(r.get("messages_received", 0) for r in results)
        
        return {
            "community_id": community_id,
            "devices_synced": len(results),
            "messages_sent": total_sent,
            "messages_received": total_received
        }
    
    def send_health_alert(
        self,
        community_id: str,
        alert_type: str,
        message: str
    ) -> Dict[str, Any]:
        """Send health program alert to entire community."""
        if community_id not in self._communities:
            return {"error": f"Community {community_id} not found"}
        
        hub_id = self._communities[community_id]["hub_id"]
        
        messages = self.mesh.broadcast_to_community(
            source_node=hub_id,
            community_id=community_id,
            payload=f"HEALTH:{alert_type}:{message}".encode(),
            payload_type="health_alert",
            priority=MessagePriority.HEALTH
        )
        
        delivered = sum(1 for m in messages if m.delivered)
        
        return {
            "community_id": community_id,
            "alert_type": alert_type,
            "recipients": len(messages),
            "delivered": delivered,
            "queued": len(messages) - delivered
        }
    
    def get_community_connectivity(self, community_id: str) -> Dict[str, Any]:
        """Get connectivity status for a community."""
        if community_id not in self._communities:
            return {"error": f"Community {community_id} not found"}
        
        community = self._communities[community_id]
        score = self.mesh.calculate_connectivity_score(community_id)
        
        nodes = [n for n in self.mesh._nodes.values() if n.community_id == community_id]
        online = sum(1 for n in nodes if n.is_online)
        
        return {
            "community_id": community_id,
            "community_name": community["name"],
            "connectivity_score": round(score, 1),
            "total_nodes": len(nodes),
            "online_nodes": online,
            "offline_nodes": len(nodes) - online,
            "relay_stations": community["relay_count"],
            "has_internet_gateway": community["has_satellite"],
            "status": "excellent" if score >= 80 else "good" if score >= 50 else "limited" if score >= 20 else "critical"
        }
    
    def get_all_communities_status(self) -> Dict[str, Any]:
        """Get status of all communities in the mesh."""
        communities = []
        
        for community_id in self._communities:
            status = self.get_community_connectivity(community_id)
            if "error" not in status:
                communities.append(status)
        
        isolated = self.mesh.get_isolated_communities()
        
        return {
            "total_communities": len(communities),
            "communities": communities,
            "isolated_communities": isolated,
            "network_stats": self.mesh.get_network_stats()
        }
