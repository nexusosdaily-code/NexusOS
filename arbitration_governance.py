"""
Arbitration Governance Integration
AI-powered mediation for contentious governance proposals

Features:
- Analyze vote splits and controversy levels
- Provide neutral analysis of proposal impacts
- Mediate conflicts between voting factions
- Generate comprehensive proposal reports
- Track governance health metrics
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import time

from ai_arbitration_controller import (
    get_arbitration_controller,
    DisputeType,
    ArbitrationDecision
)

try:
    from civic_governance import get_governance_system, Proposal, ProposalStatus
except ImportError:
    get_governance_system = None
    Proposal = None
    ProposalStatus = None


@dataclass
class GovernanceMediation:
    """AI mediation of a contentious governance proposal"""
    mediation_id: str  # Case ID from arbitration controller
    proposal_id: str
    proposal_title: str
    controversy_score: float  # 0-1, higher = more contentious
    
    # Vote analysis
    vote_split: Dict[str, float]  # {"for": 0.55, "against": 0.45, "abstain": 0.0}
    total_voting_power: float
    
    # AI analysis
    ai_recommendation: Optional[str] = None
    impact_analysis: Optional[Dict[str, Any]] = None
    confidence: float = 0.0
    
    # Resolution
    mediation_timestamp: float = 0.0
    escalated: bool = False


class GovernanceArbitrationController:
    """
    AI arbitration for governance disputes
    
    Capabilities:
    - Detect contentious proposals (close votes, high controversy)
    - Analyze proposal impacts on different stakeholder groups
    - Provide neutral recommendations
    - Mediate between opposing factions
    - Generate comprehensive governance reports
    """
    
    def __init__(self):
        self.arbitration = get_arbitration_controller()
        self.mediations: Dict[str, GovernanceMediation] = {}
        
        # Integration with governance system
        self.governance = None
        if get_governance_system:
            try:
                self.governance = get_governance_system()
            except:
                pass
        
        # Controversy detection thresholds
        self.controversy_threshold = 0.6  # Vote split closer than 60-40 triggers review
        self.auto_mediation_threshold = 0.75  # Vote split closer than 75-25 triggers auto-mediation
    
    def analyze_proposal_controversy(
        self,
        proposal_id: str
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Analyze how contentious a proposal is
        
        Returns:
            controversy_score: 0-1, higher = more contentious
            analysis: Detailed controversy analysis
        """
        if not self.governance:
            return 0.0, {"error": "Governance system not available"}
        
        # Get proposal and votes
        proposal = self.governance.get_proposal(proposal_id)
        if not proposal:
            return 0.0, {"error": "Proposal not found"}
        
        votes = self.governance.get_proposal_votes(proposal_id)
        
        # Calculate vote distribution
        total_power = 0.0
        votes_for = 0.0
        votes_against = 0.0
        votes_abstain = 0.0
        
        for vote in votes:
            # Use weight attribute from Vote object
            power = getattr(vote, 'weight', 1.0)
            total_power += power
            
            # Vote.choice is a VoteChoice enum - convert to string for comparison
            choice_str = str(getattr(vote, 'choice', 'ABSTAIN')).lower()
            
            if 'approve' in choice_str or 'for' in choice_str:
                votes_for += power
            elif 'reject' in choice_str or 'against' in choice_str:
                votes_against += power
            else:
                votes_abstain += power
        
        if total_power == 0:
            return 0.0, {"error": "No votes cast"}
        
        # Normalize
        for_pct = votes_for / total_power
        against_pct = votes_against / total_power
        abstain_pct = votes_abstain / total_power
        
        # Controversy score: how close is the vote?
        # Maximum controversy = 50-50 split (score = 1.0)
        # Minimum controversy = 100-0 split (score = 0.0)
        vote_difference = abs(for_pct - against_pct)
        controversy_score = 1.0 - vote_difference  # Closer votes = higher controversy
        
        # Boost controversy if abstention rate is high (indicates confusion/conflict)
        if abstain_pct > 0.2:
            controversy_score = min(1.0, controversy_score * 1.2)
        
        analysis = {
            "vote_split": {
                "for": for_pct,
                "against": against_pct,
                "abstain": abstain_pct
            },
            "total_voting_power": total_power,
            "vote_count": len(votes),
            "controversy_score": controversy_score,
            "requires_mediation": controversy_score >= self.controversy_threshold
        }
        
        return controversy_score, analysis
    
    def request_mediation(
        self,
        proposal_id: str,
        requestor: str,
        reason: Optional[str] = None
    ) -> str:
        """
        Request AI mediation for a contentious proposal
        
        Args:
            proposal_id: ID of the proposal
            requestor: Address requesting mediation
            reason: Optional reason for mediation request
            
        Returns:
            mediation_id: Unique mediation case ID
        """
        controversy_score, analysis = self.analyze_proposal_controversy(proposal_id)
        
        if not self.governance:
            raise ValueError("Governance system not available")
        
        proposal = self.governance.get_proposal(proposal_id)
        if not proposal:
            raise ValueError(f"Proposal {proposal_id} not found")
        
        # Prepare evidence from proposal and votes
        initial_evidence = [
            {
                "type": "proposal_details",
                "content": {
                    "proposal_id": proposal_id,
                    "title": proposal.title,
                    "description": proposal.description[:500],  # Truncate for evidence
                    "proposer": proposal.proposer,
                    "created_at": proposal.created_at
                }
            },
            {
                "type": "vote_analysis",
                "content": analysis
            }
        ]
        
        # File arbitration case
        case_id = self.arbitration.file_dispute(
            dispute_type=DisputeType.GOVERNANCE_DISPUTE,
            plaintiff=requestor,
            title=f"Mediation Request: {proposal.title}",
            description=reason or f"Proposal shows {controversy_score:.0%} controversy score",
            defendant=None,  # No defendant in mediation
            initial_evidence=initial_evidence
        )
        
        # Track mediation
        mediation = GovernanceMediation(
            mediation_id=case_id,
            proposal_id=proposal_id,
            proposal_title=proposal.title,
            controversy_score=controversy_score,
            vote_split=analysis["vote_split"],
            total_voting_power=analysis["total_voting_power"],
            mediation_timestamp=time.time()
        )
        
        self.mediations[case_id] = mediation
        
        return case_id
    
    def generate_proposal_analysis(self, mediation_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive AI analysis of a contentious proposal
        
        Includes:
        - Impact analysis on different stakeholder groups
        - Risk assessment
        - Alternative approaches
        - Neutral recommendation
        """
        if mediation_id not in self.mediations:
            raise ValueError(f"Mediation {mediation_id} not found")
        
        mediation = self.mediations[mediation_id]
        
        # Get AI arbitration analysis
        result = self.arbitration.resolve_case(mediation_id)
        
        # Update mediation record
        mediation.confidence = result["confidence"]
        mediation.escalated = result.get("escalated", False)
        
        # Generate comprehensive analysis
        impact_analysis = self._analyze_proposal_impacts(mediation)
        
        # Generate AI recommendation
        if result["decision"] == ArbitrationDecision.MEDIATE:
            recommendation = self._generate_mediation_recommendation(mediation, impact_analysis)
        elif result["decision"] == ArbitrationDecision.ESCALATE:
            recommendation = "ESCALATE: Insufficient evidence for autonomous recommendation. Recommend extended community discussion period."
        else:
            recommendation = result["reasoning"]
        
        mediation.ai_recommendation = recommendation
        mediation.impact_analysis = impact_analysis
        
        return {
            "mediation_id": mediation_id,
            "proposal_id": mediation.proposal_id,
            "controversy_score": mediation.controversy_score,
            "vote_split": mediation.vote_split,
            "ai_recommendation": recommendation,
            "impact_analysis": impact_analysis,
            "confidence": mediation.confidence,
            "escalated": mediation.escalated
        }
    
    def _analyze_proposal_impacts(
        self,
        mediation: GovernanceMediation
    ) -> Dict[str, Any]:
        """Analyze proposal impacts on different stakeholder groups"""
        
        # Simple impact analysis based on vote split
        # In production, this would analyze proposal content, affected parameters, etc.
        
        vote_split = mediation.vote_split
        
        impacts = {
            "validators": {
                "support_level": vote_split["for"],
                "opposition_level": vote_split["against"],
                "primary_concerns": [
                    "Economic incentives" if vote_split["for"] < 0.5 else "Network security",
                    "Governance power balance"
                ]
            },
            "token_holders": {
                "estimated_impact": "moderate",
                "risk_level": "low" if mediation.controversy_score < 0.5 else "medium"
            },
            "network_health": {
                "consensus_risk": "high" if mediation.controversy_score > 0.8 else "low",
                "recommendation": "Extend discussion period" if mediation.controversy_score > 0.7 else "Proceed to vote"
            }
        }
        
        return impacts
    
    def _generate_mediation_recommendation(
        self,
        mediation: GovernanceMediation,
        impact_analysis: Dict[str, Any]
    ) -> str:
        """Generate AI mediation recommendation"""
        
        vote_split = mediation.vote_split
        controversy = mediation.controversy_score
        
        # High controversy - recommend compromise
        if controversy > 0.8:
            return (
                f"MEDIATION RECOMMENDED: Proposal shows {controversy:.0%} controversy with "
                f"{vote_split['for']:.0%} support vs {vote_split['against']:.0%} opposition. "
                f"Recommend: (1) Extend discussion period by 7 days, (2) Host community forum "
                f"to address concerns, (3) Consider compromise amendments to address opposition concerns."
            )
        
        # Moderate controversy - recommend extended discussion
        elif controversy > 0.6:
            return (
                f"DISCUSSION EXTENSION: Proposal shows {controversy:.0%} controversy. "
                f"Recommend extending voting period by 3 days to allow more deliberation. "
                f"Current split: {vote_split['for']:.0%} for, {vote_split['against']:.0%} against."
            )
        
        # Low controversy - proceed
        else:
            winner = "for" if vote_split["for"] > vote_split["against"] else "against"
            return (
                f"PROCEED TO VOTE: Proposal shows {controversy:.0%} controversy with clear "
                f"{vote_split[winner]:.0%} majority {winner}. No mediation required."
            )
    
    def get_mediation_status(self, mediation_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a governance mediation"""
        if mediation_id not in self.mediations:
            return None
        
        mediation = self.mediations[mediation_id]
        case = self.arbitration.get_case(mediation_id)
        
        return {
            "mediation_id": mediation_id,
            "proposal_id": mediation.proposal_id,
            "proposal_title": mediation.proposal_title,
            "controversy_score": mediation.controversy_score,
            "vote_split": mediation.vote_split,
            "status": case.status.value if case else "unknown",
            "ai_recommendation": mediation.ai_recommendation,
            "confidence": mediation.confidence,
            "escalated": mediation.escalated
        }
    
    def get_contentious_proposals(self) -> List[Dict[str, Any]]:
        """Get all proposals that meet controversy threshold"""
        if not self.governance:
            return []
        
        contentious = []
        
        # Check all active proposals
        proposals = self.governance.get_active_proposals()
        
        for proposal in proposals:
            controversy_score, analysis = self.analyze_proposal_controversy(proposal.id)
            
            if controversy_score >= self.controversy_threshold:
                contentious.append({
                    "proposal_id": proposal.id,
                    "title": proposal.title,
                    "controversy_score": controversy_score,
                    "vote_split": analysis["vote_split"],
                    "requires_mediation": analysis["requires_mediation"]
                })
        
        return sorted(contentious, key=lambda x: x["controversy_score"], reverse=True)
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get governance arbitration statistics"""
        total_mediations = len(self.mediations)
        
        if total_mediations == 0:
            return {
                "total_mediations": 0,
                "average_controversy": 0.0,
                "escalation_rate": 0.0,
                "average_confidence": 0.0
            }
        
        avg_controversy = sum(m.controversy_score for m in self.mediations.values()) / total_mediations
        escalated_count = sum(1 for m in self.mediations.values() if m.escalated)
        
        mediations_with_confidence = [m for m in self.mediations.values() if m.confidence > 0]
        avg_confidence = (
            sum(m.confidence for m in mediations_with_confidence) / max(1, len(mediations_with_confidence))
        )
        
        return {
            "total_mediations": total_mediations,
            "average_controversy": avg_controversy,
            "escalation_rate": escalated_count / total_mediations,
            "average_confidence": avg_confidence
        }


# Singleton instance
_governance_arbitration = None

def get_governance_arbitration() -> GovernanceArbitrationController:
    """Get singleton governance arbitration controller instance"""
    global _governance_arbitration
    if _governance_arbitration is None:
        _governance_arbitration = GovernanceArbitrationController()
    return _governance_arbitration
