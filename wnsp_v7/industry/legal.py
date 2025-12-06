"""
Legal & Justice Sector Adapter

Physics-based dispute resolution and contract enforcement for ALL peoples worldwide.
Justice flows as oscillation; contracts are phase-locked agreements.

Core Principle: Agreement IS resonance.
- Contracts = Phase-locked oscillation between parties
- Disputes = Destructive interference (needs resolution)
- Arbitration = Frequency harmonization
- Verdicts = Standing wave consensus

BHLS Integration: Basic legal aid guaranteed for all citizens.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, calculate_lambda_mass
)

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class ContractType(Enum):
    """Types of legal contracts"""
    EMPLOYMENT = "employment"
    SALE = "sale"
    LEASE = "lease"
    SERVICE = "service"
    PARTNERSHIP = "partnership"
    LICENSING = "licensing"
    SETTLEMENT = "settlement"
    BHLS_GUARANTEE = "bhls_guarantee"


class ContractStatus(Enum):
    """Status of contracts"""
    DRAFT = "draft"
    PENDING = "pending"
    ACTIVE = "active"
    FULFILLED = "fulfilled"
    BREACHED = "breached"
    TERMINATED = "terminated"
    DISPUTED = "disputed"


class DisputeType(Enum):
    """Types of legal disputes"""
    CONTRACT = "contract"
    PROPERTY = "property"
    EMPLOYMENT = "employment"
    CONSUMER = "consumer"
    FAMILY = "family"
    CIVIL = "civil"
    ADMINISTRATIVE = "administrative"


class DisputeStatus(Enum):
    """Status of disputes"""
    FILED = "filed"
    MEDIATION = "mediation"
    ARBITRATION = "arbitration"
    HEARING = "hearing"
    RESOLVED = "resolved"
    APPEALED = "appealed"


@dataclass
class Contract:
    """A legally binding contract with Lambda signature"""
    contract_id: str
    contract_type: ContractType
    parties: List[str]
    terms: Dict[str, Any]
    value_nxt: float
    status: ContractStatus = ContractStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.now)
    effective_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    lambda_signature: float = 0.0
    verification_hash: str = ""
    
    def __post_init__(self):
        import hashlib
        frequency = 5e14
        self.lambda_signature = (PLANCK_CONSTANT * frequency * self.value_nxt) / (SPEED_OF_LIGHT ** 2)
        terms_str = str(sorted(self.terms.items()))
        self.verification_hash = hashlib.sha256(
            f"{self.parties}:{terms_str}:{self.value_nxt}".encode()
        ).hexdigest()[:32]
    
    @property
    def is_active(self) -> bool:
        """Check if contract is currently active"""
        if self.status != ContractStatus.ACTIVE:
            return False
        now = datetime.now()
        if self.effective_date and now < self.effective_date:
            return False
        if self.expiration_date and now > self.expiration_date:
            return False
        return True
    
    def to_dict(self) -> Dict:
        return {
            'contract_id': self.contract_id,
            'type': self.contract_type.value,
            'parties': self.parties,
            'terms': self.terms,
            'value_nxt': self.value_nxt,
            'status': self.status.value,
            'is_active': self.is_active,
            'verification_hash': self.verification_hash
        }


@dataclass
class Dispute:
    """A legal dispute between parties"""
    dispute_id: str
    dispute_type: DisputeType
    complainant: str
    respondent: str
    description: str
    amount_claimed_nxt: float
    related_contract: Optional[str] = None
    status: DisputeStatus = DisputeStatus.FILED
    filed_at: datetime = field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None
    award_nxt: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'dispute_id': self.dispute_id,
            'type': self.dispute_type.value,
            'complainant': self.complainant,
            'respondent': self.respondent,
            'description': self.description,
            'amount_claimed': self.amount_claimed_nxt,
            'status': self.status.value,
            'filed_at': self.filed_at.isoformat(),
            'resolution': self.resolution,
            'award': self.award_nxt
        }


@dataclass
class ArbitrationCase:
    """An arbitration case for dispute resolution"""
    case_id: str
    dispute_id: str
    arbitrator_id: str
    evidence: List[Dict[str, Any]] = field(default_factory=list)
    hearings: List[datetime] = field(default_factory=list)
    verdict: Optional[str] = None
    award_nxt: float = 0.0
    lambda_consensus: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'case_id': self.case_id,
            'dispute_id': self.dispute_id,
            'arbitrator_id': self.arbitrator_id,
            'evidence_count': len(self.evidence),
            'hearings_count': len(self.hearings),
            'verdict': self.verdict,
            'award': self.award_nxt
        }


class LegalAdapter(IndustryAdapter):
    """
    Legal & Justice Sector Adapter
    
    Key Operations:
    - create_contract: Draft new contract
    - sign_contract: Party signs contract (Lambda lock)
    - execute_contract: Activate signed contract
    - fulfill_contract: Mark contract obligations met
    - breach_contract: Record contract breach
    - file_dispute: File legal dispute
    - mediate: Attempt mediation
    - arbitrate: Submit to arbitration
    - resolve_dispute: Record dispute resolution
    - appeal: Appeal decision
    - bhls_legal_aid: Free legal assistance
    
    Physics Rules:
    - Contracts = Phase-locked agreement between parties
    - Signatures = Lambda mass commitment
    - Disputes = Destructive interference (imbalanced oscillation)
    - Resolution = Frequency harmonization to consensus
    """
    
    BHLS_LEGAL_AID_HOURS = 5
    MEDIATION_FEE_RATE = 0.01
    ARBITRATION_FEE_RATE = 0.02
    
    def __init__(self):
        super().__init__(sector_id='legal')
        self.contracts: Dict[str, Contract] = {}
        self.disputes: Dict[str, Dispute] = {}
        self.arbitrations: Dict[str, ArbitrationCase] = {}
        self.signatures: Dict[str, List[str]] = {}
    
    def create_contract(
        self,
        contract_type: ContractType,
        parties: List[str],
        terms: Dict[str, Any],
        value_nxt: float,
        duration_days: int = 365
    ) -> OperationResult:
        """Create a new contract"""
        import hashlib
        
        contract_id = f"CTR{hashlib.sha256(f'{parties}:{value_nxt}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        effective_date = datetime.now()
        expiration_date = effective_date + timedelta(days=duration_days)
        
        contract = Contract(
            contract_id=contract_id,
            contract_type=contract_type,
            parties=parties,
            terms=terms,
            value_nxt=value_nxt,
            effective_date=effective_date,
            expiration_date=expiration_date
        )
        self.contracts[contract_id] = contract
        self.signatures[contract_id] = []
        
        operation = IndustryOperation(
            operation_id='create_contract',
            sector_id='legal',
            data={'contract': contract.to_dict()}
        )
        
        result = self.execute_operation(operation)
        result.message = f"Contract {contract_id} created. Awaiting signatures from {len(parties)} parties."
        return result
    
    def sign_contract(self, contract_id: str, party_id: str) -> OperationResult:
        """Sign a contract"""
        if contract_id not in self.contracts:
            return OperationResult(success=False, message=f"Contract {contract_id} not found")
        
        contract = self.contracts[contract_id]
        
        if party_id not in contract.parties:
            return OperationResult(success=False, message=f"Party {party_id} not in contract")
        
        if party_id in self.signatures.get(contract_id, []):
            return OperationResult(success=False, message=f"Party {party_id} already signed")
        
        self.signatures[contract_id].append(party_id)
        
        all_signed = len(self.signatures[contract_id]) == len(contract.parties)
        if all_signed:
            contract.status = ContractStatus.PENDING
        
        operation = IndustryOperation(
            operation_id='sign_contract',
            sector_id='legal',
            data={
                'contract_id': contract_id,
                'party': party_id,
                'signatures': len(self.signatures[contract_id]),
                'required': len(contract.parties)
            },
            attestations=[
                Attestation(type='identity_verification', value=party_id, issuer='system'),
                Attestation(type='consent', value='agreed', issuer=party_id)
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        if all_signed:
            result.message = f"Contract {contract_id} fully signed. Ready for execution."
        else:
            remaining = len(contract.parties) - len(self.signatures[contract_id])
            result.message = f"Signature recorded. {remaining} signature(s) remaining."
        return result
    
    def execute_contract(self, contract_id: str) -> OperationResult:
        """Execute a fully signed contract"""
        if contract_id not in self.contracts:
            return OperationResult(success=False, message=f"Contract {contract_id} not found")
        
        contract = self.contracts[contract_id]
        
        if len(self.signatures.get(contract_id, [])) != len(contract.parties):
            return OperationResult(success=False, message="Not all parties have signed")
        
        contract.status = ContractStatus.ACTIVE
        
        operation = IndustryOperation(
            operation_id='execute_contract',
            sector_id='legal',
            data={'contract': contract.to_dict()},
            attestations=[
                Attestation(type='all_signatures', value=contract_id, issuer='system')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Contract {contract_id} is now ACTIVE. Lambda-locked until {contract.expiration_date.strftime('%Y-%m-%d')}"
        return result
    
    def file_dispute(
        self,
        dispute_type: DisputeType,
        complainant: str,
        respondent: str,
        description: str,
        amount_claimed_nxt: float,
        related_contract: Optional[str] = None
    ) -> OperationResult:
        """File a legal dispute"""
        import hashlib
        
        dispute_id = f"DSP{hashlib.sha256(f'{complainant}:{respondent}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        dispute = Dispute(
            dispute_id=dispute_id,
            dispute_type=dispute_type,
            complainant=complainant,
            respondent=respondent,
            description=description,
            amount_claimed_nxt=amount_claimed_nxt,
            related_contract=related_contract
        )
        self.disputes[dispute_id] = dispute
        
        if related_contract and related_contract in self.contracts:
            self.contracts[related_contract].status = ContractStatus.DISPUTED
        
        operation = IndustryOperation(
            operation_id='file_dispute',
            sector_id='legal',
            data={'dispute': dispute.to_dict()},
            attestations=[
                Attestation(type='identity_verification', value=complainant, issuer='system')
            ]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Dispute {dispute_id} filed. Claim: {amount_claimed_nxt} NXT"
        return result
    
    def arbitrate(self, dispute_id: str, arbitrator_id: str) -> OperationResult:
        """Submit dispute to arbitration"""
        import hashlib
        
        if dispute_id not in self.disputes:
            return OperationResult(success=False, message=f"Dispute {dispute_id} not found")
        
        dispute = self.disputes[dispute_id]
        dispute.status = DisputeStatus.ARBITRATION
        
        case_id = f"ARB{hashlib.sha256(f'{dispute_id}:{arbitrator_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        case = ArbitrationCase(
            case_id=case_id,
            dispute_id=dispute_id,
            arbitrator_id=arbitrator_id
        )
        self.arbitrations[case_id] = case
        
        operation = IndustryOperation(
            operation_id='arbitrate',
            sector_id='legal',
            data={'case': case.to_dict()},
            attestations=[
                Attestation(type='arbitrator_certification', value=arbitrator_id, issuer='bar_association'),
                Attestation(type='party_consent', value='both_parties', issuer='system')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Arbitration case {case_id} opened. Arbitrator: {arbitrator_id}"
        return result
    
    def resolve_dispute(
        self,
        dispute_id: str,
        resolution: str,
        award_to_complainant_nxt: float
    ) -> OperationResult:
        """Resolve a dispute with award"""
        if dispute_id not in self.disputes:
            return OperationResult(success=False, message=f"Dispute {dispute_id} not found")
        
        dispute = self.disputes[dispute_id]
        dispute.status = DisputeStatus.RESOLVED
        dispute.resolved_at = datetime.now()
        dispute.resolution = resolution
        dispute.award_nxt = award_to_complainant_nxt
        
        if dispute.related_contract and dispute.related_contract in self.contracts:
            self.contracts[dispute.related_contract].status = ContractStatus.TERMINATED
        
        operation = IndustryOperation(
            operation_id='resolve_dispute',
            sector_id='legal',
            data={
                'dispute_id': dispute_id,
                'resolution': resolution,
                'award': award_to_complainant_nxt
            },
            attestations=[
                Attestation(type='resolution_authority', value=dispute_id, issuer='arbitrator')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Dispute {dispute_id} resolved. Award: {award_to_complainant_nxt} NXT"
        return result
    
    def get_contract(self, contract_id: str) -> Optional[Dict]:
        """Get contract details"""
        if contract_id in self.contracts:
            return self.contracts[contract_id].to_dict()
        return None
    
    def get_dispute(self, dispute_id: str) -> Optional[Dict]:
        """Get dispute details"""
        if dispute_id in self.disputes:
            return self.disputes[dispute_id].to_dict()
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get legal sector statistics"""
        return {
            'total_contracts': len(self.contracts),
            'active_contracts': sum(1 for c in self.contracts.values() if c.status == ContractStatus.ACTIVE),
            'total_disputes': len(self.disputes),
            'pending_disputes': sum(1 for d in self.disputes.values() if d.status not in [DisputeStatus.RESOLVED]),
            'resolved_disputes': sum(1 for d in self.disputes.values() if d.status == DisputeStatus.RESOLVED),
            'arbitration_cases': len(self.arbitrations),
            'total_value_locked_nxt': sum(c.value_nxt for c in self.contracts.values() if c.is_active)
        }
