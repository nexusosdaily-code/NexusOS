"""
Arbitration Penalty Appeals Integration
Bridges Sybil Detection penalties with AI Arbitration Controller

Allows validators to:
- Appeal Sybil detection penalties
- Submit evidence of false positive
- Request AI review of automated decisions
- Track appeal status and outcomes
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import time

from ai_arbitration_controller import (
    get_arbitration_controller,
    DisputeType,
    ArbitrationDecision
)

try:
    from sybil_penalty_system import PenaltyRecord, get_penalty_system
except ImportError:
    PenaltyRecord = None
    get_penalty_system = None


@dataclass
class PenaltyAppeal:
    """Appeal of a Sybil detection penalty"""
    appeal_id: str  # Case ID from arbitration controller
    penalty_id: str  # Original penalty ID
    validator_address: str
    appeal_reason: str
    submitted_timestamp: float
    
    # Outcome
    decision: Optional[ArbitrationDecision] = None
    confidence: float = 0.0
    reasoning: Optional[str] = None
    penalty_modified: bool = False


class ArbitrationPenaltyBridge:
    """
    Integration layer between Sybil Penalty System and AI Arbitration
    
    Provides:
    - Penalty appeal submission
    - Evidence extraction from penalty records
    - Automated penalty modification based on AI decisions
    - Appeal tracking and statistics
    """
    
    def __init__(self):
        self.arbitration = get_arbitration_controller()
        self.appeals: Dict[str, PenaltyAppeal] = {}
        
        # Integration with penalty system
        self.penalty_system = None
        if get_penalty_system:
            try:
                self.penalty_system = get_penalty_system()
            except:
                pass
    
    def file_penalty_appeal(
        self,
        penalty_id: str,
        validator_address: str,
        appeal_reason: str,
        evidence: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        File an appeal against a Sybil detection penalty
        
        Args:
            penalty_id: ID of the penalty being appealed
            validator_address: Address of validator filing appeal
            appeal_reason: Reason for the appeal
            evidence: Additional evidence to submit
            
        Returns:
            appeal_id: Unique appeal identifier (case ID)
        """
        # Get penalty record if available
        penalty_record = None
        if self.penalty_system:
            penalty_record = self.penalty_system.get_penalty_record(penalty_id)
        
        # Prepare evidence from penalty record
        initial_evidence = evidence or []
        
        if penalty_record:
            # Add penalty details as evidence
            initial_evidence.append({
                "type": "penalty_record",
                "content": {
                    "penalty_id": penalty_id,
                    "penalty_type": penalty_record.penalty_type,
                    "severity": penalty_record.severity,
                    "cluster_id": penalty_record.cluster_id,
                    "applied_timestamp": penalty_record.timestamp,
                    "validators_affected": len(penalty_record.affected_validators)
                }
            })
            
            # Add detection evidence
            initial_evidence.append({
                "type": "detection_evidence",
                "content": {
                    "detection_vectors": penalty_record.detection_vectors,
                    "confidence_score": penalty_record.confidence_score,
                    "false_positive_risk": 1.0 - penalty_record.confidence_score
                }
            })
        
        # File arbitration case
        case_id = self.arbitration.file_dispute(
            dispute_type=DisputeType.PENALTY_APPEAL,
            plaintiff=validator_address,
            title=f"Appeal Sybil Penalty {penalty_id}",
            description=appeal_reason,
            defendant="SYBIL_DETECTION_SYSTEM",
            initial_evidence=initial_evidence
        )
        
        # Track appeal
        appeal = PenaltyAppeal(
            appeal_id=case_id,
            penalty_id=penalty_id,
            validator_address=validator_address,
            appeal_reason=appeal_reason,
            submitted_timestamp=time.time()
        )
        
        self.appeals[case_id] = appeal
        
        return case_id
    
    def submit_appeal_evidence(
        self,
        appeal_id: str,
        evidence_type: str,
        content: Dict[str, Any]
    ) -> str:
        """Submit additional evidence for a penalty appeal"""
        if appeal_id not in self.appeals:
            raise ValueError(f"Appeal {appeal_id} not found")
        
        appeal = self.appeals[appeal_id]
        
        return self.arbitration.submit_evidence(
            case_id=appeal_id,
            submitter=appeal.validator_address,
            evidence_type=evidence_type,
            content=content
        )
    
    def process_appeal(self, appeal_id: str) -> Dict[str, Any]:
        """
        Process a penalty appeal through AI arbitration
        
        Returns AI decision with recommended actions
        """
        if appeal_id not in self.appeals:
            raise ValueError(f"Appeal {appeal_id} not found")
        
        appeal = self.appeals[appeal_id]
        
        # Get AI decision
        result = self.arbitration.resolve_case(appeal_id)
        
        # Update appeal record
        appeal.decision = result["decision"]
        appeal.confidence = result["confidence"]
        appeal.reasoning = result["reasoning"]
        
        # Apply decision to penalty system
        if self.penalty_system and not result.get("escalated", False):
            self._apply_arbitration_decision(appeal, result)
        
        return result
    
    def _apply_arbitration_decision(
        self,
        appeal: PenaltyAppeal,
        arbitration_result: Dict[str, Any]
    ):
        """Apply AI arbitration decision to penalty system"""
        decision = arbitration_result["decision"]
        penalty_id = appeal.penalty_id
        
        if decision == ArbitrationDecision.OVERTURN:
            # Reverse penalty completely
            self.penalty_system.reverse_penalty(
                penalty_id=penalty_id,
                reason=f"AI Arbitration: {arbitration_result['reasoning']}"
            )
            appeal.penalty_modified = True
            
        elif decision == ArbitrationDecision.MODIFY:
            # Reduce penalty severity
            modifications = arbitration_result.get("modifications", {})
            reduction_factor = modifications.get("penalty_reduction", 0.5)
            
            self.penalty_system.modify_penalty(
                penalty_id=penalty_id,
                reduction_factor=reduction_factor,
                reason=f"AI Arbitration: {arbitration_result['reasoning']}"
            )
            appeal.penalty_modified = True
            
        elif decision == ArbitrationDecision.UPHOLD:
            # Penalty stands - no action needed
            pass
        
        elif decision == ArbitrationDecision.ESCALATE:
            # Mark for human review
            if hasattr(self.penalty_system, 'mark_for_human_review'):
                self.penalty_system.mark_for_human_review(
                    penalty_id=penalty_id,
                    reason="AI confidence below threshold"
                )
    
    def get_appeal_status(self, appeal_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a penalty appeal"""
        if appeal_id not in self.appeals:
            return None
        
        appeal = self.appeals[appeal_id]
        case = self.arbitration.get_case(appeal_id)
        
        return {
            "appeal_id": appeal_id,
            "penalty_id": appeal.penalty_id,
            "validator": appeal.validator_address,
            "status": case.status.value if case else "unknown",
            "decision": appeal.decision.value if appeal.decision else None,
            "confidence": appeal.confidence,
            "reasoning": appeal.reasoning,
            "penalty_modified": appeal.penalty_modified,
            "evidence_count": len(case.evidence) if case else 0
        }
    
    def get_validator_appeals(self, validator_address: str) -> List[Dict[str, Any]]:
        """Get all appeals filed by a validator"""
        appeals = []
        for appeal_id, appeal in self.appeals.items():
            if appeal.validator_address == validator_address:
                status = self.get_appeal_status(appeal_id)
                if status:
                    appeals.append(status)
        return appeals
    
    def get_appeal_statistics(self) -> Dict[str, Any]:
        """Get penalty appeal statistics"""
        total_appeals = len(self.appeals)
        
        if total_appeals == 0:
            return {
                "total_appeals": 0,
                "successful_appeals": 0,
                "success_rate": 0.0,
                "average_confidence": 0.0,
                "penalties_modified": 0
            }
        
        successful = sum(
            1 for appeal in self.appeals.values()
            if appeal.decision in [ArbitrationDecision.OVERTURN, ArbitrationDecision.MODIFY]
        )
        
        penalties_modified = sum(1 for appeal in self.appeals.values() if appeal.penalty_modified)
        
        decided_appeals = [a for a in self.appeals.values() if a.decision is not None]
        avg_confidence = sum(a.confidence for a in decided_appeals) / max(1, len(decided_appeals))
        
        return {
            "total_appeals": total_appeals,
            "successful_appeals": successful,
            "success_rate": successful / total_appeals,
            "average_confidence": avg_confidence,
            "penalties_modified": penalties_modified,
            "decision_breakdown": self._get_decision_breakdown()
        }
    
    def _get_decision_breakdown(self) -> Dict[str, int]:
        """Get breakdown of appeal decisions"""
        breakdown = {}
        
        for appeal in self.appeals.values():
            if appeal.decision:
                decision_name = appeal.decision.value
                breakdown[decision_name] = breakdown.get(decision_name, 0) + 1
        
        return breakdown


# Singleton instance
_penalty_bridge = None

def get_penalty_bridge() -> ArbitrationPenaltyBridge:
    """Get singleton penalty appeal bridge instance"""
    global _penalty_bridge
    if _penalty_bridge is None:
        _penalty_bridge = ArbitrationPenaltyBridge()
    return _penalty_bridge
