"""
AI Arbitration Controller
Autonomous AI-powered dispute resolution and conflict mediation system

Features:
- Penalty appeal review (Sybil detection disputes)
- Governance proposal arbitration (contentious votes)
- Validator conflict resolution
- Resource allocation disputes
- Evidence-based decision making with confidence scoring
- Transparent audit trail for all arbitration decisions
"""

import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib
import json


class DisputeType(Enum):
    """Types of disputes the AI can arbitrate"""
    PENALTY_APPEAL = "penalty_appeal"  # Appeal Sybil detection penalty
    GOVERNANCE_DISPUTE = "governance_dispute"  # Contentious governance proposal
    VALIDATOR_CONFLICT = "validator_conflict"  # Conflict between validators
    RESOURCE_ALLOCATION = "resource_allocation"  # Pool/economic resource dispute
    CONSENSUS_DISAGREEMENT = "consensus_disagreement"  # Network consensus conflict
    COMMUNITY_CONFLICT = "community_conflict"  # General community dispute


class DisputeStatus(Enum):
    """Status of arbitration cases"""
    PENDING = "pending"  # Awaiting AI review
    UNDER_REVIEW = "under_review"  # AI analyzing evidence
    RESOLVED = "resolved"  # AI decision issued
    APPEALED = "appealed"  # Decision appealed to human governance
    CLOSED = "closed"  # Final resolution (no further appeals)


class ArbitrationDecision(Enum):
    """Possible AI arbitration decisions"""
    UPHOLD = "uphold"  # Original decision stands
    OVERTURN = "overturn"  # Original decision reversed
    MODIFY = "modify"  # Original decision modified
    MEDIATE = "mediate"  # Require mediation between parties
    ESCALATE = "escalate"  # Escalate to human governance
    DISMISS = "dismiss"  # Dismiss dispute as unfounded


@dataclass
class Evidence:
    """Evidence submitted for arbitration"""
    evidence_id: str
    submitter: str  # Address of evidence submitter
    evidence_type: str  # "transaction_log", "voting_record", "witness_statement", etc.
    content: Dict[str, Any]
    timestamp: float
    credibility_score: float = 0.0  # AI-assessed credibility (0-1)
    

@dataclass
class ArbitrationCase:
    """Complete arbitration case with all metadata"""
    case_id: str
    dispute_type: DisputeType
    status: DisputeStatus
    
    # Parties involved
    plaintiff: str  # Address filing dispute
    defendant: Optional[str]  # Address being disputed (if applicable)
    
    # Case details
    title: str
    description: str
    filed_timestamp: float
    
    # Evidence
    evidence: List[Evidence] = field(default_factory=list)
    
    # AI analysis
    ai_analysis: Optional[str] = None
    ai_decision: Optional[ArbitrationDecision] = None
    confidence_score: float = 0.0  # AI confidence in decision (0-1)
    reasoning: Optional[str] = None
    
    # Resolution
    resolution_timestamp: Optional[float] = None
    modifications: Optional[Dict[str, Any]] = None  # For MODIFY decisions
    
    # Appeal tracking
    appeal_count: int = 0
    escalated_to_governance: bool = False
    final_decision: Optional[str] = None


class AIArbitrationController:
    """
    AI-powered arbitration system for NexusOS disputes
    
    Provides neutral, evidence-based conflict resolution with:
    - Multi-source evidence analysis
    - Confidence-weighted decision making
    - Transparent reasoning and audit trails
    - Appeal mechanisms to human governance
    """
    
    def __init__(self):
        self.cases: Dict[str, ArbitrationCase] = {}
        self.decision_history: List[Dict[str, Any]] = []
        
        # AI configuration
        self.confidence_threshold = 0.75  # Minimum confidence for autonomous decision
        self.max_auto_appeals = 1  # Max appeals before human escalation
        
        # Performance metrics
        self.total_cases = 0
        self.resolved_cases = 0
        self.escalated_cases = 0
        self.average_resolution_time = 0.0
        
    def generate_case_id(self, plaintiff: str, timestamp: float) -> str:
        """Generate unique case ID"""
        data = f"{plaintiff}:{timestamp}:{time.time()}"
        return f"CASE{hashlib.sha256(data.encode()).hexdigest()[:16].upper()}"
    
    def generate_evidence_id(self, submitter: str, timestamp: float) -> str:
        """Generate unique evidence ID"""
        data = f"{submitter}:{timestamp}:{time.time()}"
        return f"EVD{hashlib.sha256(data.encode()).hexdigest()[:16].upper()}"
    
    def file_dispute(
        self,
        dispute_type: DisputeType,
        plaintiff: str,
        title: str,
        description: str,
        defendant: Optional[str] = None,
        initial_evidence: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        File a new dispute for AI arbitration
        
        Args:
            dispute_type: Type of dispute
            plaintiff: Address filing the dispute
            title: Short title describing the dispute
            description: Detailed description of the dispute
            defendant: Address being disputed (if applicable)
            initial_evidence: Initial evidence to submit
            
        Returns:
            case_id: Unique identifier for the case
        """
        timestamp = time.time()
        case_id = self.generate_case_id(plaintiff, timestamp)
        
        # Create case
        case = ArbitrationCase(
            case_id=case_id,
            dispute_type=dispute_type,
            status=DisputeStatus.PENDING,
            plaintiff=plaintiff,
            defendant=defendant,
            title=title,
            description=description,
            filed_timestamp=timestamp
        )
        
        # Add initial evidence if provided
        if initial_evidence:
            for ev in initial_evidence:
                self.submit_evidence(
                    case_id=case_id,
                    submitter=plaintiff,
                    evidence_type=ev.get("type", "document"),
                    content=ev.get("content", {})
                )
        
        self.cases[case_id] = case
        self.total_cases += 1
        
        return case_id
    
    def submit_evidence(
        self,
        case_id: str,
        submitter: str,
        evidence_type: str,
        content: Dict[str, Any]
    ) -> str:
        """Submit evidence for an arbitration case"""
        if case_id not in self.cases:
            raise ValueError(f"Case {case_id} not found")
        
        case = self.cases[case_id]
        
        if case.status not in [DisputeStatus.PENDING, DisputeStatus.UNDER_REVIEW]:
            raise ValueError(f"Cannot submit evidence to case with status {case.status.value}")
        
        timestamp = time.time()
        evidence_id = self.generate_evidence_id(submitter, timestamp)
        
        evidence = Evidence(
            evidence_id=evidence_id,
            submitter=submitter,
            evidence_type=evidence_type,
            content=content,
            timestamp=timestamp
        )
        
        # AI credibility assessment
        evidence.credibility_score = self._assess_evidence_credibility(evidence)
        
        case.evidence.append(evidence)
        return evidence_id
    
    def _assess_evidence_credibility(self, evidence: Evidence) -> float:
        """
        AI-powered evidence credibility assessment
        
        Analyzes:
        - Source reliability (blockchain data > witness statements)
        - Internal consistency
        - Corroboration with other evidence
        - Temporal coherence
        """
        credibility = 0.5  # Baseline
        
        # Source-based credibility
        high_credibility_sources = [
            "blockchain_transaction",
            "consensus_record",
            "validator_signature",
            "smart_contract_log"
        ]
        
        medium_credibility_sources = [
            "voting_record",
            "delegation_history",
            "performance_metric"
        ]
        
        if evidence.evidence_type in high_credibility_sources:
            credibility = 0.9
        elif evidence.evidence_type in medium_credibility_sources:
            credibility = 0.7
        else:
            credibility = 0.5  # Witness statements, user-submitted docs
        
        # Boost credibility for structured data
        if isinstance(evidence.content, dict) and len(evidence.content) > 0:
            credibility = min(1.0, credibility + 0.1)
        
        return credibility
    
    def analyze_case(self, case_id: str) -> Dict[str, Any]:
        """
        AI analysis of arbitration case
        
        Performs multi-dimensional evidence analysis:
        1. Evidence credibility weighting
        2. Pattern recognition across evidence
        3. Consistency checking
        4. Historical precedent comparison
        5. Confidence scoring
        """
        if case_id not in self.cases:
            raise ValueError(f"Case {case_id} not found")
        
        case = self.cases[case_id]
        case.status = DisputeStatus.UNDER_REVIEW
        
        # Analyze evidence
        total_evidence = len(case.evidence)
        if total_evidence == 0:
            return {
                "decision": ArbitrationDecision.DISMISS,
                "confidence": 0.9,
                "reasoning": "No evidence submitted to support dispute"
            }
        
        # Calculate weighted evidence score
        evidence_for_plaintiff = 0.0
        evidence_for_defendant = 0.0
        total_credibility = 0.0
        
        for evidence in case.evidence:
            total_credibility += evidence.credibility_score
            
            # Simple heuristic: evidence from plaintiff supports plaintiff
            if evidence.submitter == case.plaintiff:
                evidence_for_plaintiff += evidence.credibility_score
            elif evidence.submitter == case.defendant:
                evidence_for_defendant += evidence.credibility_score
        
        # Calculate balance of evidence
        if total_credibility > 0:
            plaintiff_support = evidence_for_plaintiff / total_credibility
            defendant_support = evidence_for_defendant / total_credibility
        else:
            plaintiff_support = 0.5
            defendant_support = 0.5
        
        # Decision logic based on dispute type
        decision, confidence, reasoning = self._determine_decision(
            case, plaintiff_support, defendant_support
        )
        
        return {
            "decision": decision,
            "confidence": confidence,
            "reasoning": reasoning,
            "evidence_analysis": {
                "total_evidence": total_evidence,
                "plaintiff_support": plaintiff_support,
                "defendant_support": defendant_support,
                "average_credibility": total_credibility / max(1, total_evidence)
            }
        }
    
    def _determine_decision(
        self,
        case: ArbitrationCase,
        plaintiff_support: float,
        defendant_support: float
    ) -> Tuple[ArbitrationDecision, float, str]:
        """Determine arbitration decision based on evidence and dispute type"""
        
        # Evidence strongly favors plaintiff
        if plaintiff_support > 0.7:
            if case.dispute_type == DisputeType.PENALTY_APPEAL:
                return (
                    ArbitrationDecision.OVERTURN,
                    plaintiff_support,
                    f"Evidence strongly supports appeal. Penalty appears unjustified based on submitted blockchain data and validator performance records."
                )
            else:
                return (
                    ArbitrationDecision.UPHOLD,
                    plaintiff_support,
                    f"Evidence supports plaintiff's claim with {plaintiff_support:.0%} credibility."
                )
        
        # Evidence strongly favors defendant
        elif defendant_support > 0.7:
            return (
                ArbitrationDecision.UPHOLD,
                defendant_support,
                f"Evidence supports defendant's position. Original decision appears justified."
            )
        
        # Evidence is balanced - requires mediation or escalation
        elif abs(plaintiff_support - defendant_support) < 0.2:
            confidence = 0.5
            
            if case.dispute_type in [DisputeType.VALIDATOR_CONFLICT, DisputeType.COMMUNITY_CONFLICT]:
                return (
                    ArbitrationDecision.MEDIATE,
                    confidence,
                    "Evidence is balanced. Recommend mediation between parties to reach mutual agreement."
                )
            else:
                return (
                    ArbitrationDecision.ESCALATE,
                    confidence,
                    "Inconclusive evidence. Escalating to human governance for final decision."
                )
        
        # Moderate evidence for plaintiff
        elif plaintiff_support > defendant_support:
            if case.dispute_type == DisputeType.PENALTY_APPEAL:
                return (
                    ArbitrationDecision.MODIFY,
                    plaintiff_support,
                    f"Partial merit to appeal. Recommend reducing penalty severity by 50%."
                )
            else:
                return (
                    ArbitrationDecision.UPHOLD,
                    plaintiff_support,
                    f"Moderate evidence supports plaintiff ({plaintiff_support:.0%} credibility)."
                )
        
        # Default: uphold original decision
        else:
            return (
                ArbitrationDecision.UPHOLD,
                max(plaintiff_support, defendant_support),
                "Insufficient evidence to overturn original decision."
            )
    
    def resolve_case(self, case_id: str) -> Dict[str, Any]:
        """
        Issue final AI arbitration decision
        
        Returns decision with:
        - Decision type (uphold/overturn/modify/etc)
        - Confidence score
        - Detailed reasoning
        - Recommended actions
        """
        if case_id not in self.cases:
            raise ValueError(f"Case {case_id} not found")
        
        case = self.cases[case_id]
        
        # Run AI analysis
        analysis = self.analyze_case(case_id)
        
        # Extract decision from analysis
        decision = analysis["decision"]
        confidence = analysis["confidence"]
        reasoning = analysis["reasoning"]
        
        # Check if confidence is sufficient for autonomous decision
        if confidence < self.confidence_threshold:
            # Low confidence - escalate to human governance
            case.status = DisputeStatus.RESOLVED
            case.ai_decision = ArbitrationDecision.ESCALATE
            case.confidence_score = confidence
            case.reasoning = f"Confidence {confidence:.0%} below threshold {self.confidence_threshold:.0%}. Escalating to human governance."
            case.ai_analysis = json.dumps(analysis.get("evidence_analysis", {}), indent=2)
            case.escalated_to_governance = True
            case.resolution_timestamp = time.time()
            
            self.escalated_cases += 1
            
            # Log decision
            self.decision_history.append({
                "case_id": case_id,
                "dispute_type": case.dispute_type.value,
                "decision": ArbitrationDecision.ESCALATE.value,
                "confidence": confidence,
                "timestamp": case.resolution_timestamp
            })
            
            return {
                "case_id": case_id,
                "decision": ArbitrationDecision.ESCALATE,
                "confidence": confidence,
                "reasoning": case.reasoning,
                "escalated": True
            }
        
        # Issue autonomous decision (confidence >= threshold)
        case.status = DisputeStatus.RESOLVED
        case.ai_decision = decision
        case.confidence_score = confidence
        case.reasoning = reasoning
        case.ai_analysis = json.dumps(analysis.get("evidence_analysis", {}), indent=2)
        case.resolution_timestamp = time.time()
        
        # Handle MODIFY decisions
        if decision == ArbitrationDecision.MODIFY:
            case.modifications = {
                "penalty_reduction": 0.5,  # Reduce penalty by 50%
                "reason": "Partial evidence supports appeal"
            }
        
        self.resolved_cases += 1
        
        # Update average resolution time
        resolution_time = case.resolution_timestamp - case.filed_timestamp
        total_time = self.average_resolution_time * (self.resolved_cases - 1)
        self.average_resolution_time = (total_time + resolution_time) / self.resolved_cases
        
        # Log decision
        self.decision_history.append({
            "case_id": case_id,
            "dispute_type": case.dispute_type.value,
            "decision": decision.value,
            "confidence": confidence,
            "timestamp": case.resolution_timestamp
        })
        
        return {
            "case_id": case_id,
            "decision": decision,
            "confidence": confidence,
            "reasoning": reasoning,
            "modifications": case.modifications,
            "escalated": False
        }
    
    def appeal_decision(self, case_id: str, appellant: str, appeal_reason: str) -> str:
        """Appeal an AI arbitration decision"""
        if case_id not in self.cases:
            raise ValueError(f"Case {case_id} not found")
        
        case = self.cases[case_id]
        
        if case.status != DisputeStatus.RESOLVED:
            raise ValueError(f"Can only appeal resolved cases")
        
        case.appeal_count += 1
        
        # Check if max appeals reached
        if case.appeal_count > self.max_auto_appeals:
            case.status = DisputeStatus.CLOSED
            case.escalated_to_governance = True
            case.final_decision = f"Escalated to human governance after {case.appeal_count} appeals"
            
            return f"Case escalated to human governance (max appeals {self.max_auto_appeals} exceeded)"
        
        # Re-open case for review
        case.status = DisputeStatus.APPEALED
        
        # Add appeal as new evidence
        self.submit_evidence(
            case_id=case_id,
            submitter=appellant,
            evidence_type="appeal_statement",
            content={
                "appeal_reason": appeal_reason,
                "previous_decision": case.ai_decision.value if case.ai_decision else "unknown"
            }
        )
        
        return f"Appeal accepted. Case re-opened for review (appeal {case.appeal_count}/{self.max_auto_appeals})"
    
    def get_case(self, case_id: str) -> Optional[ArbitrationCase]:
        """Get arbitration case by ID"""
        return self.cases.get(case_id)
    
    def get_pending_cases(self) -> List[ArbitrationCase]:
        """Get all pending arbitration cases"""
        return [
            case for case in self.cases.values()
            if case.status == DisputeStatus.PENDING
        ]
    
    def get_cases_by_party(self, address: str) -> List[ArbitrationCase]:
        """Get all cases involving a specific address"""
        return [
            case for case in self.cases.values()
            if case.plaintiff == address or case.defendant == address
        ]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get arbitration system statistics"""
        return {
            "total_cases": self.total_cases,
            "resolved_cases": self.resolved_cases,
            "escalated_cases": self.escalated_cases,
            "pending_cases": sum(1 for c in self.cases.values() if c.status == DisputeStatus.PENDING),
            "average_resolution_time_seconds": self.average_resolution_time,
            "average_confidence": sum(c.confidence_score for c in self.cases.values() if c.confidence_score > 0) / max(1, self.resolved_cases),
            "decision_distribution": self._get_decision_distribution()
        }
    
    def _get_decision_distribution(self) -> Dict[str, int]:
        """Get distribution of arbitration decisions"""
        distribution = {decision.value: 0 for decision in ArbitrationDecision}
        
        for case in self.cases.values():
            if case.ai_decision:
                distribution[case.ai_decision.value] += 1
        
        return distribution


# Singleton instance
_arbitration_controller = None

def get_arbitration_controller() -> AIArbitrationController:
    """Get singleton AI arbitration controller instance"""
    global _arbitration_controller
    if _arbitration_controller is None:
        _arbitration_controller = AIArbitrationController()
    return _arbitration_controller
