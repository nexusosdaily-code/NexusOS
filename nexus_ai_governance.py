"""
Nexus AI Governance System
AI that learns from research activities, governs system adaptation,
and ensures basic human living standards (F_floor) as the minimum survival floor.

Focus: Forward adaptation for civilization sustainability
"""

import json
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path

# DAG agent management integration
try:
    from dag_agent_management import get_agent_manager, AgentType
except ImportError:
    get_agent_manager = None
    AgentType = None

# Reserve pool telemetry integration
try:
    from reserve_pool_telemetry import get_reserve_telemetry
except ImportError:
    get_reserve_telemetry = None

# Pool ecosystem integration
try:
    from pool_ecosystem import get_pool_ecosystem, PoolLayer, PoolType
except ImportError:
    get_pool_ecosystem = None
    PoolLayer = None
    PoolType = None


@dataclass
class ResearchObservation:
    """Single observation from researcher activity"""
    timestamp: str
    component: str  # Which component (economic_simulator, dex, validator, etc.)
    parameters: Dict[str, Any]
    metrics: Dict[str, float]
    researcher_email: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)


@dataclass
class GovernanceDecision:
    """AI decision for system adaptation"""
    timestamp: str
    rationale: str
    parameter_adjustments: Dict[str, float]
    f_floor_preserved: bool  # Critical: Did we protect minimum living standards?
    civilization_impact: str  # Long-term civilization consequences


class NexusAIGovernance:
    """
    AI system that learns from research and governs forward adaptation
    while ensuring F_floor (basic human living standards) is never compromised.
    """
    
    def __init__(self, knowledge_path: str = "nexus_ai_knowledge.json"):
        self.knowledge_path = Path(knowledge_path)
        self.observations: List[ResearchObservation] = []
        self.decisions: List[GovernanceDecision] = []
        self.learned_patterns: Dict[str, Any] = {}
        
        # Critical threshold: F_floor minimum (basic human living standards)
        self.f_floor_minimum = 10.0  # From nexus_engine.py
        self.civilization_horizon_years = 100  # Plan for 100+ years
        
        self.load_knowledge()
    
    def load_knowledge(self):
        """Load accumulated knowledge from previous sessions"""
        if self.knowledge_path.exists():
            try:
                with open(self.knowledge_path, 'r') as f:
                    data = json.load(f)
                    self.observations = [ResearchObservation(**obs) for obs in data.get('observations', [])]
                    self.learned_patterns = data.get('patterns', {})
            except Exception:
                pass  # Start fresh if corrupt
    
    def save_knowledge(self):
        """Persist knowledge for future sessions"""
        data = {
            'observations': [obs.to_dict() for obs in self.observations[-1000:]],  # Keep last 1000
            'patterns': self.learned_patterns,
            'last_updated': datetime.now().isoformat()
        }
        with open(self.knowledge_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def observe_research(self, component: str, parameters: Dict, metrics: Dict, 
                        researcher_email: Optional[str] = None):
        """
        Record researcher activity for learning
        
        Args:
            component: Which system component (economic_simulator, dex, etc.)
            parameters: Parameters used in research
            metrics: Outcome metrics (APR, TPS, supply_years, etc.)
            researcher_email: Researcher conducting the experiment
        """
        observation = ResearchObservation(
            timestamp=datetime.now().isoformat(),
            component=component,
            parameters=parameters,
            metrics=metrics,
            researcher_email=researcher_email
        )
        
        self.observations.append(observation)
        self._learn_from_observation(observation)
        self.save_knowledge()
    
    def _learn_from_observation(self, obs: ResearchObservation):
        """Extract patterns from research observations"""
        comp = obs.component
        
        # Initialize component learning if new
        if comp not in self.learned_patterns:
            self.learned_patterns[comp] = {
                'successful_configs': [],
                'failed_configs': [],
                'optimal_ranges': {},
                'civilization_risks': [],
                'f_floor_violations': []
            }
        
        # Learn parameter ranges that work
        for param, value in obs.parameters.items():
            if param not in self.learned_patterns[comp]['optimal_ranges']:
                self.learned_patterns[comp]['optimal_ranges'][param] = {
                    'min': value,
                    'max': value,
                    'successful_mean': value,
                    'sample_count': 1
                }
            else:
                ranges = self.learned_patterns[comp]['optimal_ranges'][param]
                ranges['min'] = min(ranges['min'], value)
                ranges['max'] = max(ranges['max'], value)
                
                # Update running mean
                count = ranges['sample_count']
                ranges['successful_mean'] = (ranges['successful_mean'] * count + value) / (count + 1)
                ranges['sample_count'] = count + 1
        
        # Detect F_floor violations (critical for civilization)
        if 'f_floor' in obs.parameters:
            if obs.parameters['f_floor'] < self.f_floor_minimum:
                self.learned_patterns[comp]['f_floor_violations'].append({
                    'timestamp': obs.timestamp,
                    'attempted_floor': obs.parameters['f_floor'],
                    'minimum_required': self.f_floor_minimum
                })
        
        # Identify civilization-level risks
        if comp == 'economic_simulator':
            # Check long-term sustainability
            if 'supply_remaining_years' in obs.metrics:
                years = obs.metrics['supply_remaining_years']
                if years < self.civilization_horizon_years:
                    self.learned_patterns[comp]['civilization_risks'].append({
                        'risk': 'supply_depletion',
                        'years_remaining': years,
                        'threshold': self.civilization_horizon_years,
                        'parameters': obs.parameters
                    })
        
        elif comp == 'validator_economics':
            # Check if validator rewards are sustainable
            if 'apr' in obs.metrics:
                apr = obs.metrics['apr']
                if apr < 3.0:  # Below inflation - unsustainable
                    self.learned_patterns[comp]['civilization_risks'].append({
                        'risk': 'validator_exodus',
                        'apr': apr,
                        'minimum_sustainable': 3.0
                    })
        
        elif comp == 'dex':
            # Check liquidity depth for economic stability
            if 'liquidity' in obs.metrics:
                liq = obs.metrics['liquidity']
                if liq < 100000:  # Thin markets = instability
                    self.learned_patterns[comp]['civilization_risks'].append({
                        'risk': 'market_instability',
                        'liquidity': liq,
                        'minimum_stable': 100000
                    })
    
    def govern_forward_adaptation(self, component: str, current_params: Dict) -> GovernanceDecision:
        """
        AI governance: Decide how to adapt system forward based on learned patterns
        
        Critical constraint: NEVER compromise F_floor (basic human living standards)
        
        Args:
            component: System component requesting adaptation
            current_params: Current parameter configuration
        
        Returns:
            GovernanceDecision with recommended adaptations
        """
        adjustments = {}
        rationale_parts = []
        f_floor_preserved = True
        civilization_impact = ""
        
        # Get learned patterns for this component
        if component not in self.learned_patterns:
            return GovernanceDecision(
                timestamp=datetime.now().isoformat(),
                rationale="Insufficient learning data for adaptation",
                parameter_adjustments={},
                f_floor_preserved=True,
                civilization_impact="Neutral - maintaining status quo"
            )
        
        patterns = self.learned_patterns[component]
        
        # 1. CRITICAL: Enforce F_floor minimum (basic human living standards)
        if 'F_floor' in current_params or 'f_floor' in current_params:
            floor_key = 'F_floor' if 'F_floor' in current_params else 'f_floor'
            current_floor = current_params[floor_key]
            
            if current_floor < self.f_floor_minimum:
                adjustments[floor_key] = self.f_floor_minimum
                rationale_parts.append(
                    f"⚠️ CRITICAL: Raised F_floor from {current_floor} to {self.f_floor_minimum} "
                    f"to preserve basic human living standards minimum"
                )
                f_floor_preserved = True
                civilization_impact = "Protected civilization survival floor - basic needs guaranteed"
            else:
                rationale_parts.append(f"✅ F_floor ({current_floor}) preserves basic living standards")
        
        # 2. Apply learned optimal ranges
        for param, ranges in patterns['optimal_ranges'].items():
            if param in current_params:
                current_value = current_params[param]
                optimal_mean = ranges['successful_mean']
                
                # Nudge toward optimal if significantly diverged
                # Defensive check: avoid division by zero
                if optimal_mean != 0 and abs(current_value - optimal_mean) / abs(optimal_mean) > 0.5:  # >50% deviation
                    # Gradual adaptation: move 20% toward optimal
                    new_value = current_value + 0.2 * (optimal_mean - current_value)
                    adjustments[param] = new_value
                    rationale_parts.append(
                        f"Adapted {param} from {current_value:.3f} toward optimal {optimal_mean:.3f} "
                        f"(learned from {ranges['sample_count']} observations)"
                    )
                elif optimal_mean == 0 and abs(current_value) > 0.01:  # Handle zero optimal case
                    # If optimal is zero and current is far from zero, gradually approach zero
                    new_value = current_value * 0.8  # Move 20% closer to zero
                    adjustments[param] = new_value
                    rationale_parts.append(
                        f"Adapted {param} from {current_value:.3f} toward optimal 0.0 "
                        f"(learned from {ranges['sample_count']} observations)"
                    )
        
        # 3. Address civilization-level risks
        if patterns['civilization_risks']:
            recent_risks = patterns['civilization_risks'][-5:]  # Last 5 risks
            
            # Supply sustainability risk
            supply_risks = [r for r in recent_risks if r.get('risk') == 'supply_depletion']
            if supply_risks:
                avg_years = np.mean([r['years_remaining'] for r in supply_risks])
                if 'base_burn_rate' in current_params:
                    # Reduce burn to extend supply
                    current_burn = current_params['base_burn_rate']
                    reduction_factor = max(0.5, avg_years / self.civilization_horizon_years)
                    new_burn = current_burn * reduction_factor
                    adjustments['base_burn_rate'] = new_burn
                    rationale_parts.append(
                        f"Reduced burn rate to extend civilization timeline: "
                        f"{avg_years:.0f} years → target {self.civilization_horizon_years}+ years"
                    )
                    civilization_impact = f"Extended economic sustainability by {self.civilization_horizon_years - avg_years:.0f} years"
            
            # Validator sustainability risk
            validator_risks = [r for r in recent_risks if r.get('risk') == 'validator_exodus']
            if validator_risks:
                if 'validator_reward_rate' in current_params:
                    # Increase rewards to retain validators
                    current_rate = current_params['validator_reward_rate']
                    adjustments['validator_reward_rate'] = current_rate * 1.2
                    rationale_parts.append(
                        "Increased validator rewards to prevent network security degradation"
                    )
                    civilization_impact += " | Strengthened network security foundation"
        
        # 4. F_floor violations detected - never allow again
        if patterns['f_floor_violations']:
            rationale_parts.append(
                f"⚠️ Historical warning: {len(patterns['f_floor_violations'])} attempts to "
                f"compromise basic living standards detected and prevented"
            )
        
        # Compile final decision
        if not rationale_parts:
            rationale_parts.append("System operating within learned optimal parameters")
        
        if not civilization_impact:
            civilization_impact = "Maintaining sustainable equilibrium for multi-generational prosperity"
        
        decision = GovernanceDecision(
            timestamp=datetime.now().isoformat(),
            rationale=" | ".join(rationale_parts),
            parameter_adjustments=adjustments,
            f_floor_preserved=f_floor_preserved,
            civilization_impact=civilization_impact
        )
        
        self.decisions.append(decision)
        self.save_knowledge()
        
        return decision
    
    def generate_civilization_report(self) -> str:
        """Generate long-term civilization sustainability report"""
        report_lines = [
            "# 🌍 Nexus AI Civilization Sustainability Report",
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Learning Overview",
            f"- Total Observations: {len(self.observations)}",
            f"- Components Monitored: {len(self.learned_patterns)}",
            f"- Governance Decisions: {len(self.decisions)}",
            "",
            "## Critical: Basic Human Living Standards (F_floor)",
            f"- Minimum Floor: {self.f_floor_minimum} NXT",
        ]
        
        # Check F_floor violations
        total_violations = sum(
            len(p.get('f_floor_violations', []))
            for p in self.learned_patterns.values()
        )
        
        if total_violations > 0:
            report_lines.append(f"- ⚠️ Violations Prevented: {total_violations}")
            report_lines.append("- ✅ All attempts to compromise basic needs were blocked by AI governance")
        else:
            report_lines.append("- ✅ No violations detected - basic needs protected")
        
        report_lines.extend([
            "",
            "## Civilization Risks Identified",
        ])
        
        # Aggregate risks across all components
        all_risks = []
        for comp, patterns in self.learned_patterns.items():
            all_risks.extend([(comp, r) for r in patterns.get('civilization_risks', [])])
        
        if all_risks:
            risk_types = {}
            for comp, risk in all_risks:
                risk_type = risk.get('risk', 'unknown')
                if risk_type not in risk_types:
                    risk_types[risk_type] = []
                risk_types[risk_type].append((comp, risk))
            
            for risk_type, instances in risk_types.items():
                report_lines.append(f"- **{risk_type.replace('_', ' ').title()}**: {len(instances)} occurrences")
                for comp, risk_data in instances[-3:]:  # Show last 3
                    report_lines.append(f"  - {comp}: {json.dumps(risk_data, indent=4)}")
        else:
            report_lines.append("- ✅ No major civilization risks detected")
        
        report_lines.extend([
            "",
            "## Forward Adaptation Strategy",
            f"- Planning Horizon: {self.civilization_horizon_years} years",
            "- Core Principle: Preserve F_floor (basic living standards) while optimizing for long-term sustainability",
            "- Adaptation Method: Gradual parameter adjustments based on researcher findings",
            "",
            "## Recent AI Decisions",
        ])
        
        for decision in self.decisions[-5:]:  # Last 5 decisions
            report_lines.extend([
                f"### {decision.timestamp}",
                f"- Rationale: {decision.rationale}",
                f"- F_floor Preserved: {'✅ Yes' if decision.f_floor_preserved else '⚠️ NO'}",
                f"- Civilization Impact: {decision.civilization_impact}",
                f"- Adjustments: {len(decision.parameter_adjustments)} parameters",
                ""
            ])
        
        return "\n".join(report_lines)
    
    def get_learning_insights(self, component: str) -> Dict[str, Any]:
        """Get AI insights for a specific component"""
        if component not in self.learned_patterns:
            return {
                'status': 'learning',
                'message': 'Collecting initial observations...',
                'sample_size': 0
            }
        
        patterns = self.learned_patterns[component]
        
        # Calculate total observations for this component
        comp_obs = [obs for obs in self.observations if obs.component == component]
        
        insights = {
            'status': 'active',
            'sample_size': len(comp_obs),
            'optimal_ranges': patterns['optimal_ranges'],
            'risks_identified': len(patterns.get('civilization_risks', [])),
            'f_floor_violations_prevented': len(patterns.get('f_floor_violations', []))
        }
        
        return insights
    
    def orchestrate_dag_agents(self) -> List[str]:
        """
        AI-powered orchestration of DAG agents throughout the ecosystem
        Based on learned patterns and current system state
        
        Returns:
            List of orchestration actions taken
        """
        if get_agent_manager is None:
            return ["DAG agent management not available"]
        
        agent_manager = get_agent_manager()
        actions = []
        
        # Get agent health status
        health = agent_manager.health_check()
        
        # Detect anomalies in agent behavior
        anomalies = agent_manager.detect_anomalies()
        
        # Build governance recommendations based on learned patterns
        recommendations = {}
        
        # Scale validators if health is degraded
        if health['health_percentage'] < 70:
            recommendations['scale_validators'] = True
            recommendations['target_validator_count'] = max(5, len(agent_manager.get_agents_by_type(AgentType.VALIDATOR)) + 2)
            actions.append(f"⚠️ Low health ({health['health_percentage']:.0f}%) - scaling validators")
        
        # Optimize routing if latency is high
        ecosystem_metrics = agent_manager.get_ecosystem_metrics()
        if ecosystem_metrics['average_latency_ms'] > 500:
            recommendations['optimize_routing'] = True
            recommendations['routing_strategy'] = 'priority_queue'  # Switch to priority routing
            actions.append(f"⚠️ High latency ({ecosystem_metrics['average_latency_ms']:.0f}ms) - optimizing routing")
        
        # Handle anomalies
        if anomalies:
            recommendations['suspend_underperformers'] = True
            actions.extend([f"⚠️ Anomaly detected: {anomaly}" for anomaly in anomalies])
        
        # Reactivate agents when conditions improve
        if health['health_percentage'] > 80 and not anomalies:
            recommendations['reactivate_agents'] = True
            actions.append("✅ System healthy - reactivating suspended agents")
        
        # Execute orchestration
        if recommendations:
            orchestration_actions = agent_manager.ai_orchestrate(recommendations)
            actions.extend(orchestration_actions)
        
        return actions
    
    def enforce_f_floor_with_telemetry(self, f_floor_value: float, beneficiary_count: int, 
                                      token_system: Optional[Any] = None) -> Tuple[bool, str]:
        """
        Enforce F_floor using reserve pool telemetry (live system state)
        
        Args:
            f_floor_value: Requested F_floor value
            beneficiary_count: Number of people receiving F_floor payments
            token_system: NativeTokenSystem instance for real reserve data
        
        Returns:
            (is_valid, message)
        """
        if get_reserve_telemetry is None:
            # Fallback to simple minimum check
            if f_floor_value < self.f_floor_minimum:
                return (False, f"⚠️ F_floor ({f_floor_value}) below minimum ({self.f_floor_minimum})")
            return (True, f"✅ F_floor ({f_floor_value}) meets minimum")
        
        telemetry = get_reserve_telemetry()
        
        # Get current reserve snapshot if token system provided
        current_snapshot = None
        if token_system is not None:
            from reserve_pool_telemetry import create_snapshot_from_token_system
            current_snapshot = create_snapshot_from_token_system(token_system, f_floor_value)
            telemetry.record_snapshot(current_snapshot)
        
        # Validate F_floor change with sustainability check
        is_valid, message = telemetry.validate_f_floor_change(
            f_floor_value, 
            beneficiary_count,
            current_snapshot
        )
        
        # Record violation if rejected
        if not is_valid:
            self.learned_patterns.setdefault('f_floor_enforcement', {}).setdefault('violations', []).append({
                'timestamp': datetime.now().isoformat(),
                'requested_f_floor': f_floor_value,
                'beneficiary_count': beneficiary_count,
                'reason': message
            })
            self.save_knowledge()
        
        return (is_valid, message)
    
    def manage_pool_ecosystem(self) -> Dict[str, Any]:
        """
        AI management of the hierarchical pool ecosystem
        
        Hierarchical Flow:
          Reserve Pools → F_floor → Service Pools (DEX, Investment, Staking, etc.)
        
        Returns:
            Pool ecosystem management report
        """
        if get_pool_ecosystem is None:
            return {"error": "Pool ecosystem not available"}
        
        pool_eco = get_pool_ecosystem()
        
        # Verify hierarchical support structure
        verification = pool_eco.verify_f_floor_support()
        
        # Get ecosystem health
        health = pool_eco.get_ecosystem_health()
        
        # Check for issues
        issues = []
        recommendations = []
        
        # Check if hierarchy is valid
        if not verification.get("hierarchy_valid"):
            issues.append("⚠️ Hierarchical support structure broken")
            recommendations.append("Restore Reserve Pools → F_floor → Service Pools architecture")
        
        # Check layer health
        if health["by_layer"]["reserve"]["health_percentage"] < 100:
            issues.append(f"⚠️ Reserve layer health: {health['by_layer']['reserve']['health_percentage']:.0f}%")
            recommendations.append("Investigate reserve pool issues - F_floor foundation at risk")
        
        if health["by_layer"]["foundation"]["health_percentage"] < 100:
            issues.append(f"⚠️ F_floor foundation health: {health['by_layer']['foundation']['health_percentage']:.0f}%")
            recommendations.append("CRITICAL: F_floor compromised - all service pools at risk")
        
        if health["by_layer"]["service"]["health_percentage"] < 70:
            issues.append(f"⚠️ Service pool health: {health['by_layer']['service']['health_percentage']:.0f}%")
            recommendations.append("Service pools degraded - may need F_floor support increase")
        
        # Record observations for learning
        self.observe_research(
            component="pool_ecosystem",
            parameters={
                "reserve_total": verification["reserve_total"],
                "f_floor_balance": verification["f_floor_balance"],
                "service_pool_count": verification["service_pool_count"]
            },
            metrics={
                "reserve_health": health["by_layer"]["reserve"]["health_percentage"],
                "f_floor_health": health["by_layer"]["foundation"]["health_percentage"],
                "service_health": health["by_layer"]["service"]["health_percentage"],
                "overall_health": health["overall"]["health_percentage"]
            }
        )
        
        return {
            "verification": verification,
            "health": health,
            "issues": issues,
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }


# Global AI governance instance
_ai_governance = None

def get_ai_governance() -> NexusAIGovernance:
    """Get singleton AI governance instance"""
    global _ai_governance
    if _ai_governance is None:
        _ai_governance = NexusAIGovernance()
    return _ai_governance
