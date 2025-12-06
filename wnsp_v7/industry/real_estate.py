"""
Real Estate & Housing Sector Adapter

Physics-based property rights and transfers for ALL peoples worldwide.
Property ownership is a standing wave claim on physical space.

Core Principle: Ownership IS localized oscillation.
- Title = Standing wave at property coordinates
- Transfer = Wave propagation to new owner
- Lease = Temporary resonance coupling
- Mortgage = Phase-locked obligation with property collateral

BHLS Integration: Basic housing assistance guaranteed for all citizens.
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


class PropertyType(Enum):
    """Types of real estate property"""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    INDUSTRIAL = "industrial"
    AGRICULTURAL = "agricultural"
    MIXED_USE = "mixed_use"
    VACANT_LAND = "vacant_land"
    COMMUNITY = "community"
    BHLS_HOUSING = "bhls_housing"


class TitleStatus(Enum):
    """Status of property title"""
    CLEAR = "clear"
    ENCUMBERED = "encumbered"
    PENDING_TRANSFER = "pending_transfer"
    DISPUTED = "disputed"
    BHLS_PROTECTED = "bhls_protected"


class LeaseType(Enum):
    """Types of property leases"""
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    SHORT_TERM = "short_term"
    GROUND = "ground"
    BHLS_SUBSIDIZED = "bhls_subsidized"


@dataclass
class Property:
    """A real estate property with Lambda-backed title"""
    property_id: str
    property_type: PropertyType
    address: str
    coordinates: Tuple[float, float]
    area_sqm: float
    owner_id: str
    value_nxt: float
    title_status: TitleStatus = TitleStatus.CLEAR
    registered_at: datetime = field(default_factory=datetime.now)
    lambda_signature: float = 0.0
    title_hash: str = ""
    
    def __post_init__(self):
        import hashlib
        frequency = 5e14
        self.lambda_signature = (PLANCK_CONSTANT * frequency * self.value_nxt) / (SPEED_OF_LIGHT ** 2)
        self.title_hash = hashlib.sha256(
            f"{self.property_id}:{self.owner_id}:{self.coordinates}".encode()
        ).hexdigest()[:32]
    
    def to_dict(self) -> Dict:
        return {
            'property_id': self.property_id,
            'type': self.property_type.value,
            'address': self.address,
            'coordinates': self.coordinates,
            'area_sqm': self.area_sqm,
            'owner_id': self.owner_id,
            'value_nxt': self.value_nxt,
            'title_status': self.title_status.value,
            'title_hash': self.title_hash
        }


@dataclass
class Lease:
    """A property lease agreement"""
    lease_id: str
    property_id: str
    lessor_id: str
    lessee_id: str
    lease_type: LeaseType
    monthly_rent_nxt: float
    deposit_nxt: float
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    lambda_bond: float = 0.0
    
    def __post_init__(self):
        frequency = 5e14
        total_value = self.monthly_rent_nxt * 12 + self.deposit_nxt
        self.lambda_bond = (PLANCK_CONSTANT * frequency * total_value) / (SPEED_OF_LIGHT ** 2)
    
    @property
    def remaining_months(self) -> int:
        """Calculate remaining months on lease"""
        if not self.is_active:
            return 0
        now = datetime.now()
        if now > self.end_date:
            return 0
        delta = self.end_date - now
        return max(0, delta.days // 30)
    
    def to_dict(self) -> Dict:
        return {
            'lease_id': self.lease_id,
            'property_id': self.property_id,
            'lessor_id': self.lessor_id,
            'lessee_id': self.lessee_id,
            'type': self.lease_type.value,
            'monthly_rent': self.monthly_rent_nxt,
            'deposit': self.deposit_nxt,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'remaining_months': self.remaining_months,
            'is_active': self.is_active
        }


@dataclass
class Mortgage:
    """A property mortgage"""
    mortgage_id: str
    property_id: str
    borrower_id: str
    lender_id: str
    principal_nxt: float
    interest_rate: float
    term_months: int
    outstanding_nxt: float = 0.0
    monthly_payment_nxt: float = 0.0
    lambda_lien: float = 0.0
    
    def __post_init__(self):
        if self.outstanding_nxt == 0:
            self.outstanding_nxt = self.principal_nxt
        
        r = self.interest_rate / 12
        n = self.term_months
        if r > 0:
            self.monthly_payment_nxt = self.principal_nxt * (r * (1 + r)**n) / ((1 + r)**n - 1)
        else:
            self.monthly_payment_nxt = self.principal_nxt / n
        
        frequency = 5e14
        self.lambda_lien = (PLANCK_CONSTANT * frequency * self.principal_nxt) / (SPEED_OF_LIGHT ** 2)
    
    def to_dict(self) -> Dict:
        return {
            'mortgage_id': self.mortgage_id,
            'property_id': self.property_id,
            'borrower_id': self.borrower_id,
            'lender_id': self.lender_id,
            'principal': self.principal_nxt,
            'outstanding': self.outstanding_nxt,
            'interest_rate': self.interest_rate,
            'term_months': self.term_months,
            'monthly_payment': self.monthly_payment_nxt
        }


@dataclass
class Transfer:
    """A property ownership transfer"""
    transfer_id: str
    property_id: str
    seller_id: str
    buyer_id: str
    sale_price_nxt: float
    status: str = "pending"
    initiated_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            'transfer_id': self.transfer_id,
            'property_id': self.property_id,
            'seller_id': self.seller_id,
            'buyer_id': self.buyer_id,
            'sale_price': self.sale_price_nxt,
            'status': self.status
        }


class RealEstateAdapter(IndustryAdapter):
    """
    Real Estate & Housing Sector Adapter
    
    Key Operations:
    - register_property: Register new property with title
    - transfer_ownership: Transfer property to new owner
    - create_lease: Create rental agreement
    - pay_rent: Process rent payment
    - terminate_lease: End lease agreement
    - create_mortgage: Create property mortgage
    - pay_mortgage: Process mortgage payment
    - verify_title: Verify property ownership
    - bhls_housing: Apply for BHLS housing assistance
    
    Physics Rules:
    - Title = Standing wave claim at property coordinates
    - Transfer = Wave propagation from seller to buyer
    - Lease = Temporary resonance coupling between parties
    - Mortgage = Phase-locked lien on property Lambda mass
    """
    
    BHLS_HOUSING_SUBSIDY_PCT = 0.5
    TRANSFER_FEE_RATE = 0.02
    MAX_LTV_RATIO = 0.8
    
    def __init__(self):
        super().__init__(sector_id='real_estate')
        self.properties: Dict[str, Property] = {}
        self.leases: Dict[str, Lease] = {}
        self.mortgages: Dict[str, Mortgage] = {}
        self.transfers: Dict[str, Transfer] = {}
    
    def register_property(
        self,
        property_type: PropertyType,
        address: str,
        coordinates: Tuple[float, float],
        area_sqm: float,
        owner_id: str,
        value_nxt: float
    ) -> OperationResult:
        """Register a new property with title"""
        import hashlib
        
        property_id = f"PROP{hashlib.sha256(f'{address}:{coordinates}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        prop = Property(
            property_id=property_id,
            property_type=property_type,
            address=address,
            coordinates=coordinates,
            area_sqm=area_sqm,
            owner_id=owner_id,
            value_nxt=value_nxt
        )
        self.properties[property_id] = prop
        
        operation = IndustryOperation(
            operation_id='register_property',
            sector_id='real_estate',
            data={'property': prop.to_dict()},
            attestations=[
                Attestation(type='survey_certification', value=property_id, issuer='surveyor'),
                Attestation(type='ownership_proof', value=owner_id, issuer='land_registry')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Property {property_id} registered. Owner: {owner_id}, Value: {value_nxt} NXT"
        return result
    
    def transfer_ownership(
        self,
        property_id: str,
        seller_id: str,
        buyer_id: str,
        sale_price_nxt: float
    ) -> OperationResult:
        """Transfer property ownership"""
        import hashlib
        
        if property_id not in self.properties:
            return OperationResult(success=False, message=f"Property {property_id} not found")
        
        prop = self.properties[property_id]
        
        if prop.owner_id != seller_id:
            return OperationResult(success=False, message=f"Seller {seller_id} is not the owner")
        
        if prop.title_status == TitleStatus.ENCUMBERED:
            return OperationResult(success=False, message="Property has encumbrances. Clear before transfer.")
        
        transfer_id = f"TRF{hashlib.sha256(f'{property_id}:{buyer_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        transfer = Transfer(
            transfer_id=transfer_id,
            property_id=property_id,
            seller_id=seller_id,
            buyer_id=buyer_id,
            sale_price_nxt=sale_price_nxt
        )
        
        prop.owner_id = buyer_id
        prop.value_nxt = sale_price_nxt
        prop.registered_at = datetime.now()
        
        import hashlib as hl
        prop.title_hash = hl.sha256(
            f"{prop.property_id}:{prop.owner_id}:{prop.coordinates}".encode()
        ).hexdigest()[:32]
        
        transfer.status = "completed"
        transfer.completed_at = datetime.now()
        self.transfers[transfer_id] = transfer
        
        fee = sale_price_nxt * self.TRANSFER_FEE_RATE
        
        operation = IndustryOperation(
            operation_id='transfer_ownership',
            sector_id='real_estate',
            data={
                'transfer': transfer.to_dict(),
                'fee': fee,
                'new_title_hash': prop.title_hash
            },
            attestations=[
                Attestation(type='seller_consent', value=seller_id, issuer='seller'),
                Attestation(type='buyer_verification', value=buyer_id, issuer='system'),
                Attestation(type='title_search', value='clear', issuer='title_company')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Property {property_id} transferred to {buyer_id}. Sale: {sale_price_nxt} NXT, Fee: {fee:.2f} NXT"
        return result
    
    def create_lease(
        self,
        property_id: str,
        lessee_id: str,
        lease_type: LeaseType,
        monthly_rent_nxt: float,
        deposit_nxt: float,
        term_months: int = 12
    ) -> OperationResult:
        """Create a property lease"""
        import hashlib
        
        if property_id not in self.properties:
            return OperationResult(success=False, message=f"Property {property_id} not found")
        
        prop = self.properties[property_id]
        
        lease_id = f"LSE{hashlib.sha256(f'{property_id}:{lessee_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        start_date = datetime.now()
        end_date = start_date + timedelta(days=term_months * 30)
        
        lease = Lease(
            lease_id=lease_id,
            property_id=property_id,
            lessor_id=prop.owner_id,
            lessee_id=lessee_id,
            lease_type=lease_type,
            monthly_rent_nxt=monthly_rent_nxt,
            deposit_nxt=deposit_nxt,
            start_date=start_date,
            end_date=end_date
        )
        self.leases[lease_id] = lease
        
        operation = IndustryOperation(
            operation_id='create_lease',
            sector_id='real_estate',
            data={'lease': lease.to_dict()},
            attestations=[
                Attestation(type='owner_consent', value=prop.owner_id, issuer='owner'),
                Attestation(type='tenant_verification', value=lessee_id, issuer='system')
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Lease {lease_id} created. Rent: {monthly_rent_nxt} NXT/month, Term: {term_months} months"
        return result
    
    def create_mortgage(
        self,
        property_id: str,
        borrower_id: str,
        lender_id: str,
        principal_nxt: float,
        interest_rate: float,
        term_months: int
    ) -> OperationResult:
        """Create a property mortgage"""
        import hashlib
        
        if property_id not in self.properties:
            return OperationResult(success=False, message=f"Property {property_id} not found")
        
        prop = self.properties[property_id]
        
        if prop.owner_id != borrower_id:
            return OperationResult(success=False, message="Borrower must be property owner")
        
        ltv = principal_nxt / prop.value_nxt
        if ltv > self.MAX_LTV_RATIO:
            return OperationResult(
                success=False,
                message=f"LTV ratio {ltv:.1%} exceeds maximum {self.MAX_LTV_RATIO:.0%}"
            )
        
        mortgage_id = f"MTG{hashlib.sha256(f'{property_id}:{borrower_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        mortgage = Mortgage(
            mortgage_id=mortgage_id,
            property_id=property_id,
            borrower_id=borrower_id,
            lender_id=lender_id,
            principal_nxt=principal_nxt,
            interest_rate=interest_rate,
            term_months=term_months
        )
        self.mortgages[mortgage_id] = mortgage
        
        prop.title_status = TitleStatus.ENCUMBERED
        
        operation = IndustryOperation(
            operation_id='create_mortgage',
            sector_id='real_estate',
            data={
                'mortgage': mortgage.to_dict(),
                'ltv_ratio': ltv
            },
            attestations=[
                Attestation(type='property_appraisal', value=str(prop.value_nxt), issuer='appraiser'),
                Attestation(type='credit_verification', value=borrower_id, issuer='credit_bureau')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Mortgage {mortgage_id} created. Principal: {principal_nxt} NXT, Monthly: {mortgage.monthly_payment_nxt:.2f} NXT"
        return result
    
    def verify_title(self, property_id: str) -> OperationResult:
        """Verify property title"""
        if property_id not in self.properties:
            return OperationResult(success=False, message=f"Property {property_id} not found")
        
        prop = self.properties[property_id]
        
        import hashlib
        expected_hash = hashlib.sha256(
            f"{prop.property_id}:{prop.owner_id}:{prop.coordinates}".encode()
        ).hexdigest()[:32]
        
        verified = prop.title_hash == expected_hash
        
        operation = IndustryOperation(
            operation_id='verify_title',
            sector_id='real_estate',
            data={
                'property': prop.to_dict(),
                'verified': verified,
                'title_hash': prop.title_hash
            }
        )
        
        result = self.execute_operation(operation)
        status = "VERIFIED" if verified else "INVALID"
        result.message = f"Title {status}. Owner: {prop.owner_id}, Status: {prop.title_status.value}"
        return result
    
    def apply_bhls_housing(
        self,
        applicant_id: str,
        property_id: str
    ) -> OperationResult:
        """Apply for BHLS housing subsidy"""
        if property_id not in self.properties:
            return OperationResult(success=False, message=f"Property {property_id} not found")
        
        prop = self.properties[property_id]
        
        active_leases = [l for l in self.leases.values() 
                        if l.property_id == property_id and l.lessee_id == applicant_id and l.is_active]
        
        if not active_leases:
            return OperationResult(success=False, message="No active lease found for applicant")
        
        lease = active_leases[0]
        subsidy = lease.monthly_rent_nxt * self.BHLS_HOUSING_SUBSIDY_PCT
        
        operation = IndustryOperation(
            operation_id='bhls_housing',
            sector_id='real_estate',
            data={
                'applicant_id': applicant_id,
                'property_id': property_id,
                'monthly_rent': lease.monthly_rent_nxt,
                'subsidy': subsidy,
                'net_rent': lease.monthly_rent_nxt - subsidy
            },
            attestations=[
                Attestation(type='bhls_eligibility', value=applicant_id, issuer='bhls_system'),
                Attestation(type='income_verification', value='eligible', issuer='system')
            ]
        )
        
        result = self.execute_operation(operation)
        result.message = f"BHLS housing approved. Subsidy: {subsidy:.2f} NXT/month ({self.BHLS_HOUSING_SUBSIDY_PCT:.0%} of rent)"
        return result
    
    def get_property(self, property_id: str) -> Optional[Dict]:
        """Get property details"""
        if property_id in self.properties:
            return self.properties[property_id].to_dict()
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get real estate sector statistics"""
        total_value = sum(p.value_nxt for p in self.properties.values())
        mortgage_value = sum(m.outstanding_nxt for m in self.mortgages.values())
        
        return {
            'total_properties': len(self.properties),
            'total_value_nxt': total_value,
            'residential': sum(1 for p in self.properties.values() if p.property_type == PropertyType.RESIDENTIAL),
            'commercial': sum(1 for p in self.properties.values() if p.property_type == PropertyType.COMMERCIAL),
            'active_leases': sum(1 for l in self.leases.values() if l.is_active),
            'total_mortgages': len(self.mortgages),
            'mortgage_value_nxt': mortgage_value,
            'transfers_completed': sum(1 for t in self.transfers.values() if t.status == 'completed'),
            'bhls_housing_properties': sum(1 for p in self.properties.values() if p.property_type == PropertyType.BHLS_HOUSING)
        }
