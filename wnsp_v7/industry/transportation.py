"""
Transportation Sector Adapter

Physics-based transit and logistics for ALL peoples worldwide.
Movement is oscillation through space; every journey has Lambda mass.

Core Principle: Movement IS wave propagation.
- Journeys = Oscillation from origin to destination
- Freight = Lambda mass transfer through physical space
- Routing = Optimal wave path through network
- Tickets = Frequency tokens for transit access

BHLS Integration: Basic transportation access guaranteed for all citizens.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, calculate_lambda_mass
)

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class TransportMode(Enum):
    """Modes of transportation"""
    BUS = "bus"
    TRAIN = "train"
    SUBWAY = "subway"
    FERRY = "ferry"
    PLANE = "plane"
    BICYCLE = "bicycle"
    WALKING = "walking"
    RIDE_SHARE = "ride_share"
    FREIGHT_TRUCK = "freight_truck"
    FREIGHT_SHIP = "freight_ship"
    FREIGHT_AIR = "freight_air"


class TicketType(Enum):
    """Types of transit tickets"""
    SINGLE = "single"
    DAY_PASS = "day_pass"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ANNUAL = "annual"
    BHLS_FREE = "bhls_free"


class ShipmentStatus(Enum):
    """Status of freight shipments"""
    BOOKED = "booked"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    CUSTOMS = "customs"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    RETURNED = "returned"


@dataclass
class Route:
    """A transportation route"""
    route_id: str
    mode: TransportMode
    origin: str
    destination: str
    distance_km: float
    duration_minutes: int
    stops: List[str] = field(default_factory=list)
    fare_nxt: float = 0.0
    lambda_energy: float = 0.0
    
    def __post_init__(self):
        frequency = 5e14
        self.lambda_energy = (PLANCK_CONSTANT * frequency * self.distance_km) / (SPEED_OF_LIGHT ** 2)
    
    def to_dict(self) -> Dict:
        return {
            'route_id': self.route_id,
            'mode': self.mode.value,
            'origin': self.origin,
            'destination': self.destination,
            'distance_km': self.distance_km,
            'duration_minutes': self.duration_minutes,
            'stops': self.stops,
            'fare_nxt': self.fare_nxt
        }


@dataclass
class Ticket:
    """A transit ticket"""
    ticket_id: str
    holder_id: str
    ticket_type: TicketType
    routes: List[str]
    valid_from: datetime
    valid_until: datetime
    price_nxt: float
    uses_remaining: int = -1
    is_active: bool = True
    
    @property
    def is_valid(self) -> bool:
        """Check if ticket is currently valid"""
        now = datetime.now()
        return (self.is_active and 
                self.valid_from <= now <= self.valid_until and
                (self.uses_remaining == -1 or self.uses_remaining > 0))
    
    def to_dict(self) -> Dict:
        return {
            'ticket_id': self.ticket_id,
            'holder_id': self.holder_id,
            'type': self.ticket_type.value,
            'valid_from': self.valid_from.isoformat(),
            'valid_until': self.valid_until.isoformat(),
            'price_nxt': self.price_nxt,
            'uses_remaining': self.uses_remaining,
            'is_valid': self.is_valid
        }


@dataclass
class Journey:
    """A passenger journey"""
    journey_id: str
    passenger_id: str
    ticket_id: str
    route_id: str
    origin: str
    destination: str
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    fare_paid_nxt: float = 0.0
    lambda_distance: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'journey_id': self.journey_id,
            'passenger_id': self.passenger_id,
            'ticket_id': self.ticket_id,
            'route_id': self.route_id,
            'origin': self.origin,
            'destination': self.destination,
            'fare_paid': self.fare_paid_nxt,
            'completed': self.completed_at is not None
        }


@dataclass
class Shipment:
    """A freight shipment"""
    shipment_id: str
    shipper_id: str
    receiver_id: str
    origin: str
    destination: str
    weight_kg: float
    dimensions_cm: Tuple[float, float, float]
    mode: TransportMode
    status: ShipmentStatus = ShipmentStatus.BOOKED
    tracking_updates: List[Dict] = field(default_factory=list)
    cost_nxt: float = 0.0
    lambda_mass: float = 0.0
    
    def __post_init__(self):
        frequency = 5e14
        self.lambda_mass = (PLANCK_CONSTANT * frequency * self.weight_kg) / (SPEED_OF_LIGHT ** 2)
    
    @property
    def volume_cm3(self) -> float:
        """Calculate shipment volume"""
        return self.dimensions_cm[0] * self.dimensions_cm[1] * self.dimensions_cm[2]
    
    def add_tracking(self, location: str, status: ShipmentStatus, notes: str = ""):
        """Add tracking update"""
        self.tracking_updates.append({
            'timestamp': datetime.now().isoformat(),
            'location': location,
            'status': status.value,
            'notes': notes
        })
        self.status = status
    
    def to_dict(self) -> Dict:
        return {
            'shipment_id': self.shipment_id,
            'shipper_id': self.shipper_id,
            'receiver_id': self.receiver_id,
            'origin': self.origin,
            'destination': self.destination,
            'weight_kg': self.weight_kg,
            'volume_cm3': self.volume_cm3,
            'mode': self.mode.value,
            'status': self.status.value,
            'cost_nxt': self.cost_nxt,
            'tracking': self.tracking_updates
        }


class TransportationAdapter(IndustryAdapter):
    """
    Transportation Sector Adapter
    
    Key Operations:
    - create_route: Define new transit route
    - purchase_ticket: Buy transit ticket
    - validate_ticket: Check ticket at entry
    - start_journey: Begin passenger journey
    - complete_journey: End passenger journey
    - book_shipment: Book freight shipment
    - update_shipment: Update shipment status
    - deliver_shipment: Mark shipment delivered
    - bhls_transit_pass: Issue free BHLS transit pass
    
    Physics Rules:
    - Journey energy = Lambda mass × distance
    - Fare calculation based on E = hf × distance
    - Shipment cost proportional to Lambda mass
    - Route optimization via wave propagation
    """
    
    BHLS_FREE_JOURNEYS_PER_MONTH = 60
    BASE_FARE_PER_KM = 0.05
    FREIGHT_RATE_PER_KG_KM = 0.01
    
    def __init__(self):
        super().__init__(sector_id='transportation')
        self.routes: Dict[str, Route] = {}
        self.tickets: Dict[str, Ticket] = {}
        self.journeys: Dict[str, Journey] = {}
        self.shipments: Dict[str, Shipment] = {}
        self._init_sample_routes()
    
    def _init_sample_routes(self):
        """Initialize sample transit routes"""
        sample_routes = [
            ("RT001", TransportMode.BUS, "Central Station", "Airport", 25.0, 45, ["Downtown", "Industrial Zone"]),
            ("RT002", TransportMode.SUBWAY, "North Terminal", "South Terminal", 15.0, 30, ["Central", "University", "Hospital"]),
            ("RT003", TransportMode.TRAIN, "City Center", "Suburbs", 40.0, 35, ["Tech Park", "Residential"]),
        ]
        
        for route_id, mode, origin, dest, dist, dur, stops in sample_routes:
            fare = dist * self.BASE_FARE_PER_KM
            self.routes[route_id] = Route(
                route_id=route_id,
                mode=mode,
                origin=origin,
                destination=dest,
                distance_km=dist,
                duration_minutes=dur,
                stops=stops,
                fare_nxt=fare
            )
    
    def create_route(
        self,
        mode: TransportMode,
        origin: str,
        destination: str,
        distance_km: float,
        duration_minutes: int,
        stops: List[str] = None
    ) -> OperationResult:
        """Create a new transit route"""
        import hashlib
        
        route_id = f"RT{hashlib.sha256(f'{origin}:{destination}:{mode.value}'.encode()).hexdigest()[:8].upper()}"
        
        fare = distance_km * self.BASE_FARE_PER_KM
        
        route = Route(
            route_id=route_id,
            mode=mode,
            origin=origin,
            destination=destination,
            distance_km=distance_km,
            duration_minutes=duration_minutes,
            stops=stops or [],
            fare_nxt=fare
        )
        self.routes[route_id] = route
        
        operation = IndustryOperation(
            operation_id='create_route',
            sector_id='transportation',
            data={'route': route.to_dict()},
            attestations=[
                Attestation(type='operator_license', value=route_id, issuer='transport_authority')
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Route {route_id} created: {origin} → {destination} ({distance_km} km, {fare:.2f} NXT)"
        return result
    
    def purchase_ticket(
        self,
        holder_id: str,
        ticket_type: TicketType,
        routes: List[str] = None
    ) -> OperationResult:
        """Purchase a transit ticket"""
        import hashlib
        
        ticket_id = f"TKT{hashlib.sha256(f'{holder_id}:{ticket_type.value}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        valid_from = datetime.now()
        
        pricing = {
            TicketType.SINGLE: (1.0, timedelta(hours=2), 1),
            TicketType.DAY_PASS: (5.0, timedelta(days=1), -1),
            TicketType.WEEKLY: (25.0, timedelta(days=7), -1),
            TicketType.MONTHLY: (80.0, timedelta(days=30), -1),
            TicketType.ANNUAL: (800.0, timedelta(days=365), -1),
            TicketType.BHLS_FREE: (0.0, timedelta(days=30), 60),
        }
        
        price, duration, uses = pricing.get(ticket_type, (1.0, timedelta(hours=2), 1))
        valid_until = valid_from + duration
        
        ticket = Ticket(
            ticket_id=ticket_id,
            holder_id=holder_id,
            ticket_type=ticket_type,
            routes=routes or list(self.routes.keys()),
            valid_from=valid_from,
            valid_until=valid_until,
            price_nxt=price,
            uses_remaining=uses
        )
        self.tickets[ticket_id] = ticket
        
        operation = IndustryOperation(
            operation_id='purchase_ticket',
            sector_id='transportation',
            data={'ticket': ticket.to_dict()}
        )
        
        result = self.execute_operation(operation)
        result.message = f"Ticket {ticket_id} purchased. Type: {ticket_type.value}, Price: {price} NXT"
        return result
    
    def start_journey(
        self,
        passenger_id: str,
        ticket_id: str,
        route_id: str
    ) -> OperationResult:
        """Start a passenger journey"""
        import hashlib
        
        if ticket_id not in self.tickets:
            return OperationResult(success=False, message=f"Ticket {ticket_id} not found")
        
        ticket = self.tickets[ticket_id]
        
        if not ticket.is_valid:
            return OperationResult(success=False, message="Ticket is not valid")
        
        if ticket.holder_id != passenger_id:
            return OperationResult(success=False, message="Ticket belongs to different passenger")
        
        if route_id not in self.routes:
            return OperationResult(success=False, message=f"Route {route_id} not found")
        
        route = self.routes[route_id]
        
        journey_id = f"JRN{hashlib.sha256(f'{passenger_id}:{route_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        journey = Journey(
            journey_id=journey_id,
            passenger_id=passenger_id,
            ticket_id=ticket_id,
            route_id=route_id,
            origin=route.origin,
            destination=route.destination,
            fare_paid_nxt=route.fare_nxt if ticket.ticket_type == TicketType.SINGLE else 0
        )
        self.journeys[journey_id] = journey
        
        if ticket.uses_remaining > 0:
            ticket.uses_remaining -= 1
        
        operation = IndustryOperation(
            operation_id='start_journey',
            sector_id='transportation',
            data={'journey': journey.to_dict()},
            attestations=[
                Attestation(type='valid_ticket', value=ticket_id, issuer='validator')
            ]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Journey started: {route.origin} → {route.destination}. ETA: {route.duration_minutes} min"
        return result
    
    def book_shipment(
        self,
        shipper_id: str,
        receiver_id: str,
        origin: str,
        destination: str,
        weight_kg: float,
        dimensions_cm: Tuple[float, float, float],
        mode: TransportMode
    ) -> OperationResult:
        """Book a freight shipment"""
        import hashlib
        
        shipment_id = f"SHP{hashlib.sha256(f'{shipper_id}:{receiver_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        estimated_distance = 500
        cost = weight_kg * estimated_distance * self.FREIGHT_RATE_PER_KG_KM
        
        mode_multipliers = {
            TransportMode.FREIGHT_AIR: 5.0,
            TransportMode.FREIGHT_SHIP: 0.5,
            TransportMode.FREIGHT_TRUCK: 1.0
        }
        cost *= mode_multipliers.get(mode, 1.0)
        
        shipment = Shipment(
            shipment_id=shipment_id,
            shipper_id=shipper_id,
            receiver_id=receiver_id,
            origin=origin,
            destination=destination,
            weight_kg=weight_kg,
            dimensions_cm=dimensions_cm,
            mode=mode,
            cost_nxt=cost
        )
        shipment.add_tracking(origin, ShipmentStatus.BOOKED, "Shipment booked")
        self.shipments[shipment_id] = shipment
        
        operation = IndustryOperation(
            operation_id='book_shipment',
            sector_id='transportation',
            data={'shipment': shipment.to_dict()},
            attestations=[
                Attestation(type='shipper_verification', value=shipper_id, issuer='system')
            ]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Shipment {shipment_id} booked. Weight: {weight_kg} kg, Cost: {cost:.2f} NXT"
        return result
    
    def update_shipment(
        self,
        shipment_id: str,
        location: str,
        status: ShipmentStatus,
        notes: str = ""
    ) -> OperationResult:
        """Update shipment tracking"""
        if shipment_id not in self.shipments:
            return OperationResult(success=False, message=f"Shipment {shipment_id} not found")
        
        shipment = self.shipments[shipment_id]
        shipment.add_tracking(location, status, notes)
        
        operation = IndustryOperation(
            operation_id='update_shipment',
            sector_id='transportation',
            data={
                'shipment_id': shipment_id,
                'location': location,
                'status': status.value
            }
        )
        
        result = self.execute_operation(operation)
        result.message = f"Shipment {shipment_id} updated: {status.value} at {location}"
        return result
    
    def issue_bhls_transit_pass(self, holder_id: str) -> OperationResult:
        """Issue free BHLS transit pass"""
        return self.purchase_ticket(
            holder_id=holder_id,
            ticket_type=TicketType.BHLS_FREE
        )
    
    def get_route(self, route_id: str) -> Optional[Dict]:
        """Get route details"""
        if route_id in self.routes:
            return self.routes[route_id].to_dict()
        return None
    
    def get_shipment(self, shipment_id: str) -> Optional[Dict]:
        """Get shipment details with tracking"""
        if shipment_id in self.shipments:
            return self.shipments[shipment_id].to_dict()
        return None
    
    def list_routes(self) -> List[Dict]:
        """List all available routes"""
        return [r.to_dict() for r in self.routes.values()]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get transportation sector statistics"""
        return {
            'total_routes': len(self.routes),
            'active_tickets': sum(1 for t in self.tickets.values() if t.is_valid),
            'total_journeys': len(self.journeys),
            'completed_journeys': sum(1 for j in self.journeys.values() if j.completed_at is not None),
            'total_shipments': len(self.shipments),
            'shipments_in_transit': sum(1 for s in self.shipments.values() if s.status == ShipmentStatus.IN_TRANSIT),
            'shipments_delivered': sum(1 for s in self.shipments.values() if s.status == ShipmentStatus.DELIVERED),
            'bhls_passes_issued': sum(1 for t in self.tickets.values() if t.ticket_type == TicketType.BHLS_FREE),
            'total_distance_km': sum(r.distance_km for r in self.routes.values())
        }
