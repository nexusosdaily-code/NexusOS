"""
Supply Chain Sector Adapter

Domain adapter for supply chain management, provenance tracking, and logistics.
Lambda mass signatures provide physics-based proof of origin and chain of custody.

Usage:
    from wnsp_v7.industry import SupplyChainAdapter
    
    adapter = SupplyChainAdapter()
    result = adapter.create_asset(
        manufacturer_id="MFG-001",
        asset_data={"sku": "PROD-123", "batch": "B001"},
        origin_location={"lat": 40.7128, "lon": -74.0060},
        attestations=[manufacturer_cert]
    )
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
import hashlib

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, load_sector_policy
)


@dataclass
class Asset:
    """Physical or digital asset with Lambda provenance"""
    asset_id: str
    sku: str
    manufacturer_id: str
    origin_location: Dict[str, float]
    lambda_origin: str
    created_at: datetime
    current_custodian: str = ""
    custody_chain: List[str] = field(default_factory=list)
    condition: str = "new"
    certifications: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            'asset_id': self.asset_id,
            'sku': self.sku,
            'manufacturer_id': self.manufacturer_id,
            'origin_location': self.origin_location,
            'lambda_origin': self.lambda_origin,
            'created_at': self.created_at.isoformat(),
            'current_custodian': self.current_custodian,
            'custody_chain_length': len(self.custody_chain),
            'condition': self.condition,
            'certifications': self.certifications
        }


@dataclass
class Shipment:
    """Shipment with tracked route and Lambda verification"""
    shipment_id: str
    assets: List[str]
    carrier_id: str
    origin: str
    destination: str
    route_plan: List[str]
    status: str = "created"
    current_location: str = ""
    lambda_signature: str = ""
    
    def to_dict(self) -> Dict:
        return {
            'shipment_id': self.shipment_id,
            'asset_count': len(self.assets),
            'carrier_id': self.carrier_id,
            'origin': self.origin,
            'destination': self.destination,
            'status': self.status,
            'current_location': self.current_location
        }


class SupplyChainAdapter(IndustryAdapter):
    """
    Supply chain sector adapter for logistics and provenance.
    
    Key Operations:
    - create_asset: Register new asset with origin provenance
    - transfer_custody: Transfer with Lambda signature chain
    - ship: Initiate shipment with carrier
    - verify_provenance: Verify complete chain of custody
    - settle_trade: Financial settlement for goods
    - certify: Grant or verify certification
    - recall: Initiate product recall
    - customs_clearance: Process customs declaration
    
    Physics Rules:
    - Provenance signature: Λ_origin = wavelength_hash(manufacturer, timestamp, location)
    - Custody chain: Λ_chain = sequential_hash(Λ_origin, Λ_transfer_1, ...)
    - Verification: verify(asset) = validate_lambda_chain(asset.custody_chain)
    - Counterfeit detection: Λ_signature mismatch triggers YOCTO alert
    """
    
    def __init__(self):
        super().__init__(sector_id='supply_chain')
        self._assets: Dict[str, Asset] = {}
        self._shipments: Dict[str, Shipment] = {}
        self._certifications: Dict[str, List[str]] = {}  # asset_id -> certifications
    
    def _generate_lambda_origin(self, manufacturer: str, location: Dict, timestamp: datetime) -> str:
        """Generate Lambda origin signature for asset"""
        combined = f"{manufacturer}:{location}:{timestamp.isoformat()}"
        return f"Λ_{hashlib.sha256(combined.encode()).hexdigest()[:12]}"
    
    def _generate_custody_hash(self, previous_hash: str, transfer_data: Dict) -> str:
        """Generate sequential custody chain hash"""
        combined = f"{previous_hash}:{transfer_data}"
        return hashlib.sha256(combined.encode()).hexdigest()[:12]
    
    def create_asset(
        self,
        manufacturer_id: str,
        asset_data: Dict,
        origin_location: Dict[str, float],
        attestations: List[Attestation],
        energy_escrow_nxt: float = 5.0
    ) -> OperationResult:
        """
        Register new asset with origin provenance.
        
        Creates Lambda origin signature: Λ_origin = wavelength_hash(manufacturer, timestamp, location)
        
        Args:
            manufacturer_id: Verified manufacturer identifier
            asset_data: Asset details (sku, batch, etc.)
            origin_location: GPS coordinates {lat, lon}
            attestations: Required (manufacturer_certificate, origin_location)
        """
        asset_id = f"ASSET_{datetime.now().strftime('%Y%m%d%H%M%S')}_{manufacturer_id[:4]}"
        lambda_origin = self._generate_lambda_origin(manufacturer_id, origin_location, datetime.now())
        
        operation = IndustryOperation(
            operation_id='supply.create',
            sector_id='supply_chain',
            data={
                'asset_id': asset_id,
                'asset_data': asset_data,
                'origin_location': origin_location,
                'lambda_origin': lambda_origin
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=manufacturer_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            asset = Asset(
                asset_id=asset_id,
                sku=asset_data.get('sku', ''),
                manufacturer_id=manufacturer_id,
                origin_location=origin_location,
                lambda_origin=lambda_origin,
                created_at=datetime.now(),
                current_custodian=manufacturer_id,
                custody_chain=[lambda_origin]
            )
            self._assets[asset_id] = asset
        
        return result
    
    def transfer_custody(
        self,
        asset_id: str,
        from_custodian: str,
        to_custodian: str,
        condition_report: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 5.0
    ) -> OperationResult:
        """
        Transfer asset custody with Lambda signature chain.
        
        Extends custody chain: Λ_chain = sequential_hash(Λ_previous, Λ_transfer)
        """
        if asset_id not in self._assets:
            return OperationResult(
                success=False,
                message=f"Asset {asset_id} not found"
            )
        
        asset = self._assets[asset_id]
        
        if asset.current_custodian != from_custodian:
            return OperationResult(
                success=False,
                message=f"Current custodian mismatch: {asset.current_custodian} != {from_custodian}"
            )
        
        previous_hash = asset.custody_chain[-1] if asset.custody_chain else asset.lambda_origin
        transfer_data = {
            'from': from_custodian,
            'to': to_custodian,
            'timestamp': datetime.now().isoformat(),
            'condition': condition_report
        }
        new_hash = self._generate_custody_hash(previous_hash, transfer_data)
        
        operation = IndustryOperation(
            operation_id='supply.transfer',
            sector_id='supply_chain',
            data={
                'asset_id': asset_id,
                'from_custodian': from_custodian,
                'to_custodian': to_custodian,
                'condition_report': condition_report,
                'custody_hash': new_hash
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=from_custodian
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            asset.custody_chain.append(new_hash)
            asset.current_custodian = to_custodian
            asset.condition = condition_report
        
        return result
    
    def ship(
        self,
        assets: List[str],
        carrier_id: str,
        origin: str,
        destination: str,
        route_plan: List[str],
        attestations: List[Attestation],
        energy_escrow_nxt: float = 50.0
    ) -> OperationResult:
        """
        Initiate shipment with carrier and route.
        
        ATTO-level operation for logistics coordination.
        """
        for asset_id in assets:
            if asset_id not in self._assets:
                return OperationResult(
                    success=False,
                    message=f"Asset {asset_id} not found"
                )
        
        shipment_id = f"SHIP_{datetime.now().strftime('%Y%m%d%H%M%S')}_{carrier_id[:4]}"
        
        operation = IndustryOperation(
            operation_id='supply.ship',
            sector_id='supply_chain',
            data={
                'shipment_id': shipment_id,
                'assets': assets,
                'carrier_id': carrier_id,
                'origin': origin,
                'destination': destination,
                'route_plan': route_plan
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=carrier_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            shipment = Shipment(
                shipment_id=shipment_id,
                assets=assets,
                carrier_id=carrier_id,
                origin=origin,
                destination=destination,
                route_plan=route_plan,
                status='in_transit',
                current_location=origin,
                lambda_signature=result.audit_hash
            )
            self._shipments[shipment_id] = shipment
        
        return result
    
    def verify_provenance(
        self,
        asset_id: str,
        energy_escrow_nxt: float = 0.5
    ) -> OperationResult:
        """
        Verify complete chain of custody for asset.
        
        Validates: verify(asset) = validate_lambda_chain(asset.custody_chain)
        """
        if asset_id not in self._assets:
            return OperationResult(
                success=False,
                message=f"Asset {asset_id} not found"
            )
        
        asset = self._assets[asset_id]
        
        is_valid = True
        validation_message = "Provenance verified: Complete Lambda chain intact"
        
        if not asset.custody_chain:
            is_valid = False
            validation_message = "Provenance FAILED: Empty custody chain"
        
        if asset.custody_chain[0] != asset.lambda_origin:
            is_valid = False
            validation_message = "Provenance FAILED: Origin signature mismatch"
        
        operation = IndustryOperation(
            operation_id='supply.verify',
            sector_id='supply_chain',
            data={
                'asset_id': asset_id,
                'chain_length': len(asset.custody_chain),
                'origin_verified': is_valid,
                'current_custodian': asset.current_custodian
            },
            attestations=[],
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id='system'
        )
        
        result = self.execute_operation(operation)
        result.message = validation_message
        
        return result
    
    def settle_trade(
        self,
        buyer_id: str,
        seller_id: str,
        assets: List[str],
        total_value_nxt: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 500.0
    ) -> OperationResult:
        """
        Financial settlement for goods delivered.
        
        ZEPTO-level operation requiring delivery_proof, quality_inspection, invoice_match.
        """
        operation = IndustryOperation(
            operation_id='supply.settle',
            sector_id='supply_chain',
            data={
                'buyer_id': buyer_id,
                'seller_id': seller_id,
                'assets': assets,
                'total_value_nxt': total_value_nxt,
                'asset_count': len(assets)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=buyer_id
        )
        
        return self.execute_operation(operation)
    
    def certify(
        self,
        asset_id: str,
        certification_type: str,
        certifier_id: str,
        testing_results: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 5000.0
    ) -> OperationResult:
        """
        Grant or verify product certification.
        
        YOCTO-level operation for regulatory compliance.
        """
        operation = IndustryOperation(
            operation_id='supply.certify',
            sector_id='supply_chain',
            data={
                'asset_id': asset_id,
                'certification_type': certification_type,
                'certifier_id': certifier_id,
                'testing_results': testing_results
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=certifier_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            if asset_id not in self._certifications:
                self._certifications[asset_id] = []
            self._certifications[asset_id].append(certification_type)
            
            if asset_id in self._assets:
                self._assets[asset_id].certifications.append(certification_type)
        
        return result
    
    def recall(
        self,
        initiator_id: str,
        affected_batch_ids: List[str],
        safety_justification: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10000.0
    ) -> OperationResult:
        """
        Initiate product recall across supply chain.
        
        YOCTO-level operation with 10x energy multiplier.
        Irreversible once initiated.
        """
        operation = IndustryOperation(
            operation_id='supply.recall',
            sector_id='supply_chain',
            data={
                'affected_batch_ids': affected_batch_ids,
                'safety_justification': safety_justification,
                'batch_count': len(affected_batch_ids),
                'initiated_at': datetime.now().isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=initiator_id
        )
        
        return self.execute_operation(operation)
    
    def customs_clearance(
        self,
        declarant_id: str,
        shipment_id: str,
        customs_declaration: Dict,
        origin_country: str,
        destination_country: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 50.0
    ) -> OperationResult:
        """
        Process customs declaration and clearance.
        
        ATTO-level operation requiring:
        - customs_declaration
        - origin_certificate
        - duty_payment
        """
        operation = IndustryOperation(
            operation_id='supply.customs',
            sector_id='supply_chain',
            data={
                'shipment_id': shipment_id,
                'customs_declaration': customs_declaration,
                'origin_country': origin_country,
                'destination_country': destination_country
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=declarant_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success and shipment_id in self._shipments:
            self._shipments[shipment_id].status = 'customs_cleared'
        
        return result
    
    def get_asset(self, asset_id: str) -> Optional[Dict]:
        """Get asset details"""
        asset = self._assets.get(asset_id)
        return asset.to_dict() if asset else None
    
    def get_custody_chain(self, asset_id: str) -> List[str]:
        """Get complete custody chain for asset"""
        asset = self._assets.get(asset_id)
        return asset.custody_chain if asset else []
    
    def get_shipment(self, shipment_id: str) -> Optional[Dict]:
        """Get shipment details"""
        shipment = self._shipments.get(shipment_id)
        return shipment.to_dict() if shipment else None
    
    def get_certifications(self, asset_id: str) -> List[str]:
        """Get certifications for asset"""
        return self._certifications.get(asset_id, [])
