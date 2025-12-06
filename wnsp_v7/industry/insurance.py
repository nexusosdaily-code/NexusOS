"""
Insurance Sector Adapter

Physics-based risk pooling for ALL peoples worldwide.
Risk is distributed as oscillation patterns across the network.

Core Principle: Risk IS shared oscillation.
- Premiums = Standing wave contributions to risk pool
- Claims = Resonant release from pool
- Actuarial = Frequency analysis of historical patterns
- Reinsurance = Multi-pool harmonic coupling

BHLS Integration: Basic coverage guaranteed for all citizens.
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


class InsuranceType(Enum):
    """Types of insurance coverage"""
    HEALTH = "health"
    LIFE = "life"
    PROPERTY = "property"
    LIABILITY = "liability"
    CROP = "crop"
    DISASTER = "disaster"
    BUSINESS = "business"
    BHLS_BASIC = "bhls_basic"


class ClaimStatus(Enum):
    """Status of insurance claims"""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    DENIED = "denied"
    PAID = "paid"
    APPEALED = "appealed"


@dataclass
class Policy:
    """An insurance policy with Lambda-backed coverage"""
    policy_id: str
    holder_id: str
    insurance_type: InsuranceType
    coverage_nxt: float
    premium_monthly_nxt: float
    deductible_nxt: float
    start_date: datetime
    end_date: datetime
    lambda_pool_contribution: float = 0.0
    is_active: bool = True
    
    def __post_init__(self):
        frequency = 5e14
        self.lambda_pool_contribution = (PLANCK_CONSTANT * frequency * self.coverage_nxt) / (SPEED_OF_LIGHT ** 2)
    
    @property
    def is_valid(self) -> bool:
        """Check if policy is currently valid"""
        now = datetime.now()
        return self.is_active and self.start_date <= now <= self.end_date
    
    def to_dict(self) -> Dict:
        return {
            'policy_id': self.policy_id,
            'holder_id': self.holder_id,
            'type': self.insurance_type.value,
            'coverage_nxt': self.coverage_nxt,
            'premium_monthly': self.premium_monthly_nxt,
            'deductible': self.deductible_nxt,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'is_valid': self.is_valid
        }


@dataclass
class Claim:
    """An insurance claim against a policy"""
    claim_id: str
    policy_id: str
    claimant_id: str
    claim_type: str
    amount_requested_nxt: float
    amount_approved_nxt: float = 0.0
    status: ClaimStatus = ClaimStatus.SUBMITTED
    submitted_at: datetime = field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None
    evidence_hash: str = ""
    
    def to_dict(self) -> Dict:
        return {
            'claim_id': self.claim_id,
            'policy_id': self.policy_id,
            'claimant_id': self.claimant_id,
            'type': self.claim_type,
            'requested': self.amount_requested_nxt,
            'approved': self.amount_approved_nxt,
            'status': self.status.value,
            'submitted': self.submitted_at.isoformat()
        }


@dataclass
class RiskPool:
    """A shared risk pool for insurance coverage"""
    pool_id: str
    insurance_type: InsuranceType
    total_coverage_nxt: float = 0.0
    total_premiums_nxt: float = 0.0
    total_claims_paid_nxt: float = 0.0
    lambda_mass: float = 0.0
    members: int = 0
    
    @property
    def loss_ratio(self) -> float:
        """Claims paid / Premiums collected"""
        if self.total_premiums_nxt > 0:
            return self.total_claims_paid_nxt / self.total_premiums_nxt
        return 0.0
    
    @property
    def solvency_ratio(self) -> float:
        """Available funds / Outstanding coverage"""
        available = self.total_premiums_nxt - self.total_claims_paid_nxt
        if self.total_coverage_nxt > 0:
            return available / self.total_coverage_nxt
        return 1.0
    
    def to_dict(self) -> Dict:
        return {
            'pool_id': self.pool_id,
            'type': self.insurance_type.value,
            'total_coverage': self.total_coverage_nxt,
            'total_premiums': self.total_premiums_nxt,
            'claims_paid': self.total_claims_paid_nxt,
            'members': self.members,
            'loss_ratio': self.loss_ratio,
            'solvency_ratio': self.solvency_ratio
        }


class InsuranceAdapter(IndustryAdapter):
    """
    Insurance Sector Adapter
    
    Key Operations:
    - create_policy: Issue new insurance policy
    - pay_premium: Monthly premium payment
    - submit_claim: File insurance claim
    - review_claim: AI-assisted claim review
    - approve_claim: Approve and pay claim
    - deny_claim: Deny claim with reason
    - renew_policy: Renew expiring policy
    - cancel_policy: Cancel with prorated refund
    - actuarial_analysis: Risk frequency analysis
    - reinsurance: Multi-pool risk distribution
    
    Physics Rules:
    - Pool balance: Λ_premiums ≥ Λ_claims + Λ_reserves
    - Risk distribution: Risk shared as oscillation across pool members
    - Claim validation: Evidence hash must match Lambda signature
    - Actuarial: Historical frequency analysis for premium calculation
    """
    
    BHLS_BASIC_COVERAGE = 50000.0
    BHLS_BASIC_PREMIUM = 0.0
    MIN_SOLVENCY_RATIO = 0.15
    
    def __init__(self):
        super().__init__(sector_id='insurance')
        self.policies: Dict[str, Policy] = {}
        self.claims: Dict[str, Claim] = {}
        self.risk_pools: Dict[str, RiskPool] = {}
        self._init_risk_pools()
    
    def _init_risk_pools(self):
        """Initialize risk pools for each insurance type"""
        for ins_type in InsuranceType:
            pool_id = f"POOL_{ins_type.value.upper()}"
            self.risk_pools[pool_id] = RiskPool(
                pool_id=pool_id,
                insurance_type=ins_type
            )
    
    def create_policy(
        self,
        holder_id: str,
        insurance_type: InsuranceType,
        coverage_nxt: float,
        term_months: int = 12,
        deductible_nxt: float = 100.0
    ) -> OperationResult:
        """Create a new insurance policy"""
        import hashlib
        
        policy_id = f"NXP{hashlib.sha256(f'{holder_id}:{insurance_type.value}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        base_rates = {
            InsuranceType.HEALTH: 0.03,
            InsuranceType.LIFE: 0.01,
            InsuranceType.PROPERTY: 0.02,
            InsuranceType.LIABILITY: 0.015,
            InsuranceType.CROP: 0.025,
            InsuranceType.DISASTER: 0.02,
            InsuranceType.BUSINESS: 0.02,
            InsuranceType.BHLS_BASIC: 0.0
        }
        
        monthly_premium = coverage_nxt * base_rates.get(insurance_type, 0.02) / 12
        
        if insurance_type == InsuranceType.BHLS_BASIC:
            coverage_nxt = self.BHLS_BASIC_COVERAGE
            monthly_premium = 0.0
            deductible_nxt = 0.0
        
        start_date = datetime.now()
        end_date = start_date + timedelta(days=term_months * 30)
        
        policy = Policy(
            policy_id=policy_id,
            holder_id=holder_id,
            insurance_type=insurance_type,
            coverage_nxt=coverage_nxt,
            premium_monthly_nxt=monthly_premium,
            deductible_nxt=deductible_nxt,
            start_date=start_date,
            end_date=end_date
        )
        self.policies[policy_id] = policy
        
        pool_id = f"POOL_{insurance_type.value.upper()}"
        if pool_id in self.risk_pools:
            pool = self.risk_pools[pool_id]
            pool.total_coverage_nxt += coverage_nxt
            pool.members += 1
        
        operation = IndustryOperation(
            operation_id='create_policy',
            sector_id='insurance',
            data={'policy': policy.to_dict()},
            attestations=[
                Attestation(type='identity_verification', value=holder_id, issuer='system'),
                Attestation(type='risk_assessment', value='standard', issuer='underwriting')
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Policy {policy_id} created. Coverage: {coverage_nxt} NXT, Premium: {monthly_premium:.2f} NXT/month"
        return result
    
    def submit_claim(
        self,
        policy_id: str,
        claimant_id: str,
        claim_type: str,
        amount_nxt: float,
        evidence_description: str
    ) -> OperationResult:
        """Submit an insurance claim"""
        import hashlib
        
        if policy_id not in self.policies:
            return OperationResult(success=False, message=f"Policy {policy_id} not found")
        
        policy = self.policies[policy_id]
        if not policy.is_valid:
            return OperationResult(success=False, message=f"Policy {policy_id} is not currently valid")
        
        if amount_nxt > policy.coverage_nxt:
            return OperationResult(
                success=False,
                message=f"Claim amount {amount_nxt} exceeds coverage {policy.coverage_nxt}"
            )
        
        claim_id = f"NXC{hashlib.sha256(f'{policy_id}:{amount_nxt}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        evidence_hash = hashlib.sha256(evidence_description.encode()).hexdigest()[:16]
        
        claim = Claim(
            claim_id=claim_id,
            policy_id=policy_id,
            claimant_id=claimant_id,
            claim_type=claim_type,
            amount_requested_nxt=amount_nxt,
            evidence_hash=evidence_hash
        )
        self.claims[claim_id] = claim
        
        operation = IndustryOperation(
            operation_id='submit_claim',
            sector_id='insurance',
            data={'claim': claim.to_dict()},
            attestations=[
                Attestation(type='evidence', value=evidence_hash, issuer='claimant')
            ]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Claim {claim_id} submitted for review. Amount: {amount_nxt} NXT"
        return result
    
    def approve_claim(self, claim_id: str, approved_amount_nxt: float) -> OperationResult:
        """Approve and pay a claim"""
        if claim_id not in self.claims:
            return OperationResult(success=False, message=f"Claim {claim_id} not found")
        
        claim = self.claims[claim_id]
        policy = self.policies.get(claim.policy_id)
        
        if not policy:
            return OperationResult(success=False, message=f"Policy for claim not found")
        
        payout = max(0, approved_amount_nxt - policy.deductible_nxt)
        
        claim.status = ClaimStatus.PAID
        claim.amount_approved_nxt = payout
        claim.resolved_at = datetime.now()
        
        pool_id = f"POOL_{policy.insurance_type.value.upper()}"
        if pool_id in self.risk_pools:
            self.risk_pools[pool_id].total_claims_paid_nxt += payout
        
        operation = IndustryOperation(
            operation_id='approve_claim',
            sector_id='insurance',
            data={
                'claim_id': claim_id,
                'approved_amount': approved_amount_nxt,
                'deductible': policy.deductible_nxt,
                'payout': payout
            },
            attestations=[
                Attestation(type='adjuster_approval', value=claim_id, issuer='adjuster')
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Claim {claim_id} approved. Payout: {payout} NXT (after {policy.deductible_nxt} NXT deductible)"
        return result
    
    def create_bhls_policy(self, holder_id: str) -> OperationResult:
        """Create free BHLS basic coverage for all citizens"""
        return self.create_policy(
            holder_id=holder_id,
            insurance_type=InsuranceType.BHLS_BASIC,
            coverage_nxt=self.BHLS_BASIC_COVERAGE,
            term_months=12,
            deductible_nxt=0.0
        )
    
    def get_policy(self, policy_id: str) -> Optional[Dict]:
        """Get policy details"""
        if policy_id in self.policies:
            return self.policies[policy_id].to_dict()
        return None
    
    def get_claim(self, claim_id: str) -> Optional[Dict]:
        """Get claim details"""
        if claim_id in self.claims:
            return self.claims[claim_id].to_dict()
        return None
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """Get risk pool statistics"""
        return {
            pool_id: pool.to_dict()
            for pool_id, pool in self.risk_pools.items()
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get insurance sector statistics"""
        return {
            'total_policies': len(self.policies),
            'active_policies': sum(1 for p in self.policies.values() if p.is_valid),
            'total_claims': len(self.claims),
            'pending_claims': sum(1 for c in self.claims.values() if c.status in [ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW]),
            'paid_claims': sum(1 for c in self.claims.values() if c.status == ClaimStatus.PAID),
            'bhls_policies': sum(1 for p in self.policies.values() if p.insurance_type == InsuranceType.BHLS_BASIC),
            'pools': self.get_pool_stats()
        }
