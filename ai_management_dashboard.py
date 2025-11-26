"""
AI Management Control Dashboard
Centralized oversight and control of all AI systems in NexusOS

AI Systems Managed:
1. AI Message Router - Message routing & validator selection
2. AI Security Controller - Security decisions & encryption levels
3. Nexus AI Governance - Parameter adaptation & F_floor enforcement
4. Bayesian Optimizer - ML-based parameter tuning
5. Nexus Consensus AI - Dynamic reward adjustment
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
from typing import Dict, List, Optional, Any
from datetime import datetime
import time

# Import AI systems
try:
    from nexus_ai_governance import get_ai_governance, GovernanceDecision
except ImportError:
    get_ai_governance = None

try:
    from messaging_routing import AIMessageRouter
except ImportError:
    AIMessageRouter = None

try:
    from ai_message_security_controller import AIMessageSecurityController
except ImportError:
    AIMessageSecurityController = None

try:
    from ai_arbitration_controller import get_arbitration_controller
except ImportError:
    get_arbitration_controller = None


def render_ai_system_status():
    """Render status of all AI systems with runtime verification"""
    st.subheader("🤖 AI System Status")
    
    # Get AI governance instance (real instance with error handling)
    ai_gov = None
    gov_error = None
    try:
        if get_ai_governance:
            ai_gov = get_ai_governance()
    except Exception as e:
        gov_error = str(e)
    
    # Check AI Message Router (class available - used by messaging when configured)
    if AIMessageRouter:
        router_status = '✅ Class Available'
    else:
        router_status = '⚠️ Class Not Loaded'
    
    # Check AI Security Controller (class available - used by messaging when configured)
    if AIMessageSecurityController:
        security_status = '✅ Class Available'
    else:
        security_status = '⚠️ Class Not Loaded'
    
    # Check AI Governance status (actual instance required for F_floor protection)
    gov_status = '✅ Instance Active' if ai_gov and not gov_error else f'⚠️ Error: {gov_error[:50]}' if gov_error else '⚠️ Not Loaded'
    
    # Check Bayesian Optimizer availability (function import)
    bayesian_status = '⚠️ Module Not Found'
    try:
        from ml_optimization import bayesian_optimize_parameters
        bayesian_status = '✅ Function Available'
    except ImportError:
        pass
    except Exception as e:
        bayesian_status = f'⚠️ Import Error'
    
    # Check Nexus Consensus AI integration (class import)
    consensus_ai_status = '⚠️ Module Not Found'
    try:
        from nexus_consensus import NexusConsensus
        consensus_ai_status = '✅ Class Available'
    except ImportError:
        pass
    except Exception as e:
        consensus_ai_status = f'⚠️ Import Error'
    
    # Check AI Arbitration Controller (instance available)
    arbitration_status = '⚠️ Module Not Found'
    if get_arbitration_controller:
        try:
            arbitration_controller = get_arbitration_controller()
            arbitration_status = '✅ Instance Active'
        except Exception:
            arbitration_status = '⚠️ Error'
    
    ai_systems = [
        {
            'System': '🎯 AI Message Router',
            'Function': 'Message routing & validator selection',
            'Status': router_status,
            'Control': 'Autonomous',
            'Priority': 'Critical'
        },
        {
            'System': '🔐 AI Security Controller',
            'Function': 'Security decisions & encryption levels',
            'Status': security_status,
            'Control': 'Autonomous',
            'Priority': 'Critical'
        },
        {
            'System': '🏛️ Nexus AI Governance',
            'Function': 'Parameter adaptation & F_floor enforcement',
            'Status': gov_status,
            'Control': 'Autonomous',
            'Priority': 'Critical'
        },
        {
            'System': '🧪 Bayesian Optimizer',
            'Function': 'ML-based parameter tuning',
            'Status': bayesian_status,
            'Control': 'On-Demand',
            'Priority': 'High'
        },
        {
            'System': '⚙️ Nexus Consensus AI',
            'Function': 'Dynamic reward adjustment',
            'Status': consensus_ai_status,
            'Control': 'Autonomous',
            'Priority': 'Critical'
        },
        {
            'System': '⚖️ AI Arbitration Controller',
            'Function': 'Dispute resolution & moderation',
            'Status': arbitration_status,
            'Control': 'On-Demand',
            'Priority': 'High'
        }
    ]
    
    df = pd.DataFrame(ai_systems)
    st.dataframe(df, width="stretch", hide_index=True)
    
    # System health metrics (real data)
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        available_count = sum(1 for sys in ai_systems if '✅' in sys['Status'])
        st.metric("Available AI Systems", f"{available_count}/{len(ai_systems)}")
        st.caption("Class/function availability")
    
    with col2:
        observation_count = len(ai_gov.observations) if ai_gov else 0
        st.metric("Research Observations", f"{observation_count:,}")
        st.caption("Total recorded observations")
    
    with col3:
        decision_count = len(ai_gov.decisions) if ai_gov else 0
        st.metric("AI Decisions Made", f"{decision_count:,}")
        st.caption("Total governance decisions")
    
    with col4:
        # Count actual F_floor violations from learned patterns
        violation_count = 0
        if ai_gov and ai_gov.learned_patterns:
            for component, patterns in ai_gov.learned_patterns.items():
                violation_count += len(patterns.get('f_floor_violations', []))
        st.metric("F_floor Violations", f"{violation_count}")
        if violation_count == 0:
            st.caption("✅ No violations detected")
        else:
            st.caption("⚠️ Violations prevented by AI")


def render_ai_governance_control():
    """Render AI governance control panel"""
    st.subheader("🎛️ AI Governance Control")
    
    ai_gov = get_ai_governance() if get_ai_governance else None
    
    if not ai_gov:
        st.warning("AI Governance system not loaded")
        return
    
    # Current governance parameters
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Critical Thresholds")
        
        st.markdown(f"**F_floor Minimum**: `{ai_gov.f_floor_minimum:.2f} NXT`")
        st.caption("Basic Human Living Standards floor - NEVER compromised")
        
        st.markdown(f"**Civilization Horizon**: `{ai_gov.civilization_horizon_years} years`")
        st.caption("Long-term planning window")
        
        st.markdown("**Learning Status**: ✅ Active")
        st.caption("AI learns from all research observations")
    
    with col2:
        st.markdown("### AI Authority Level")
        
        st.info("""
        **AI Governance Mode: Active Instance**
        
        The running AI Governance instance has authority to:
        - Learn from research observations
        - Enforce F_floor minimum (1,150 NXT/month per citizen)
        - Identify risks and recommend adaptations
        - Log all decisions with civilization impact
        
        Other AI systems (Router, Security) are code-available but require
        configuration/context to instantiate for active control.
        """)


def render_decision_history():
    """Render AI decision history"""
    st.subheader("📜 AI Decision History")
    
    ai_gov = get_ai_governance() if get_ai_governance else None
    
    if not ai_gov or len(ai_gov.decisions) == 0:
        st.info("No AI decisions recorded yet. AI will log decisions as it governs system adaptation.")
        return
    
    # Display recent decisions
    recent_decisions = list(reversed(ai_gov.decisions[-10:]))  # Last 10 decisions
    
    for i, decision in enumerate(recent_decisions):
        with st.expander(f"🤖 Decision #{len(ai_gov.decisions) - i} - {decision.timestamp}", expanded=(i==0)):
            col1, col2 = st.columns([2, 1])
            
            with col1:
                st.markdown("**Rationale**")
                st.write(decision.rationale)
                
                if decision.parameter_adjustments:
                    st.markdown("**Parameter Adjustments**")
                    for param, value in decision.parameter_adjustments.items():
                        st.write(f"• `{param}`: {value:.6f}")
                
                st.markdown("**Civilization Impact**")
                st.write(decision.civilization_impact)
            
            with col2:
                # F_floor preservation status
                if decision.f_floor_preserved:
                    st.success("✅ F_floor Preserved")
                    st.caption("Basic living standards maintained")
                else:
                    st.error("❌ F_floor Violated")
                    st.caption("CRITICAL: Review needed")
                
                st.metric("Decision #", f"{len(ai_gov.decisions) - i}")


def render_component_ai_integration():
    """Show which components have AI integration with runtime verification"""
    st.subheader("🔗 Component AI Integration")
    
    st.info("""
    **AI Integration Status Across Components**
    
    This section shows which NexusOS components are integrated with AI systems.
    Status indicates code availability - AI Governance shows actual runtime instance status.
    """)
    
    # Runtime verification of AI systems (class availability, not instantiation)
    router_ready = AIMessageRouter is not None
    security_ready = AIMessageSecurityController is not None
    
    gov_ready = False
    try:
        if get_ai_governance:
            test_gov = get_ai_governance()
            gov_ready = test_gov is not None
    except Exception:
        pass
    
    # Define integration status (code availability + instance check for governance)
    router_status = '✅ Code Available' if router_ready else '⚠️ Not Available'
    security_status = '✅ Code Available' if security_ready else '⚠️ Not Available'
    gov_status = '✅ Instance Active' if gov_ready else '⚠️ Not Available'
    
    components = [
        {
            'Component': '💬 Mobile DAG Messaging',
            'AI Routing': router_status,
            'AI Security': security_status,
            'AI Economics': gov_status,
            'Integration Level': 'AI Code Available' if (router_ready and security_ready) else 'Partial'
        },
        {
            'Component': '📡 WNSP Protocol v2.0',
            'AI Routing': router_status,
            'AI Security': security_status,
            'AI Economics': '✅ E=hf Pricing',
            'Integration Level': 'AI Code Available' if (router_ready and security_ready) else 'Partial'
        },
        {
            'Component': '🌊 Economic Simulator',
            'AI Routing': 'N/A',
            'AI Security': 'N/A',
            'AI Economics': '✅ Nexus AI Reports',
            'Integration Level': 'AI Research'
        },
        {
            'Component': '⚙️ Nexus Consensus',
            'AI Routing': 'N/A',
            'AI Security': 'N/A',
            'AI Economics': '✅ AI Block Rewards',
            'Integration Level': 'AI Optimized'
        },
        {
            'Component': '💱 DEX (Token Exchange)',
            'AI Routing': 'N/A',
            'AI Security': 'N/A',
            'AI Economics': '✅ Nexus AI Reports',
            'Integration Level': 'AI Research'
        },
        {
            'Component': '🏛️ Validator Economics',
            'AI Routing': 'N/A',
            'AI Security': 'N/A',
            'AI Economics': '✅ Nexus AI Reports',
            'Integration Level': 'AI Research'
        },
        {
            'Component': '🏦 Payment Layer',
            'AI Routing': 'N/A',
            'AI Security': 'N/A',
            'AI Economics': '✅ Orbital Transitions',
            'Integration Level': 'AI Economics'
        },
        {
            'Component': '🏛️ Pool Ecosystem',
            'AI Routing': 'N/A',
            'AI Security': 'N/A',
            'AI Economics': gov_status + ' (F_floor)' if gov_ready else '⚠️ Unavailable',
            'Integration Level': 'AI Governed' if gov_ready else 'Ungoverned'
        }
    ]
    
    df = pd.DataFrame(components)
    st.dataframe(df, width="stretch", hide_index=True)
    
    # Integration summary
    col1, col2, col3 = st.columns(3)
    
    with col1:
        components_with_ai = sum(1 for c in components if '✅' in c['AI Economics'])
        st.metric("Components with AI", f"{components_with_ai}/8")
    
    with col2:
        code_integrated = sum(1 for c in components if c['Integration Level'] == 'AI Code Available')
        st.metric("AI Code Integrated", f"{code_integrated}")
        if code_integrated > 0:
            st.caption("Classes available, awaiting config")
        else:
            st.caption("No AI code integrated")
    
    with col3:
        if gov_ready:
            try:
                ai_gov = get_ai_governance()
                st.metric("Governance Active", "✅ Yes")
                st.caption(f"F_floor: {ai_gov.f_floor_minimum} NXT")
            except Exception:
                st.metric("Governance Active", "⚠️ Error")
        else:
            st.metric("Governance Active", "⚠️ No")
            st.caption("AI governance unavailable")


def render_learning_analytics():
    """Render AI learning analytics"""
    st.subheader("📊 AI Learning Analytics")
    
    ai_gov = get_ai_governance() if get_ai_governance else None
    
    if not ai_gov:
        st.warning("AI Governance system not loaded")
        return
    
    # Learned patterns summary
    if ai_gov.learned_patterns:
        st.markdown("### Learned Patterns by Component")
        
        for component, patterns in ai_gov.learned_patterns.items():
            with st.expander(f"🧠 {component.replace('_', ' ').title()}", expanded=False):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.markdown("**Successful Configurations**")
                    st.metric("Count", len(patterns.get('successful_configs', [])))
                    
                    st.markdown("**Failed Configurations**")
                    st.metric("Count", len(patterns.get('failed_configs', [])))
                
                with col2:
                    st.markdown("**Optimal Parameter Ranges**")
                    optimal_ranges = patterns.get('optimal_ranges', {})
                    if optimal_ranges:
                        for param, ranges in list(optimal_ranges.items())[:3]:
                            # Safe type conversion for min/max values
                            try:
                                min_val = float(ranges.get('min', 0))
                                max_val = float(ranges.get('max', 0))
                                st.caption(f"• `{param}`: {min_val:.4f} - {max_val:.4f}")
                            except (ValueError, TypeError):
                                # Skip non-numeric ranges
                                st.caption(f"• `{param}`: {ranges.get('min', 'N/A')} - {ranges.get('max', 'N/A')}")
                    else:
                        st.caption("Learning in progress...")
                
                # F_floor violations
                violations = patterns.get('f_floor_violations', [])
                if violations:
                    st.error(f"⚠️ {len(violations)} F_floor violation(s) detected and prevented")
    else:
        st.info("AI is initializing. Learning patterns will appear as research is conducted.")
    
    # Observation timeline
    if ai_gov.observations:
        st.markdown("### Research Activity Timeline")
        
        # Group observations by component
        component_counts = {}
        for obs in ai_gov.observations:
            component_counts[obs.component] = component_counts.get(obs.component, 0) + 1
        
        if component_counts:
            fig = go.Figure(data=[
                go.Bar(
                    x=list(component_counts.keys()),
                    y=list(component_counts.values()),
                    marker_color='#4CAF50'
                )
            ])
            
            fig.update_layout(
                title="Research Observations by Component",
                xaxis_title="Component",
                yaxis_title="Observation Count",
                height=300
            )
            
            st.plotly_chart(fig, width="stretch")


def render_real_time_ai_activity():
    """Render real-time AI activity monitor"""
    st.subheader("⚡ Real-Time AI Activity Monitor")
    
    st.info("""
    **Monitoring Framework Status**: Active
    
    This tab provides real-time monitoring capabilities for AI system activity.
    Currently displaying AI activity framework - full telemetry integration in progress.
    """)
    
    # Get AI governance for actual activity data
    ai_gov = None
    try:
        if get_ai_governance:
            ai_gov = get_ai_governance()
    except Exception:
        pass
    
    # Display actual recent observations if available
    if ai_gov and ai_gov.observations:
        st.markdown("### Recent Research Observations")
        recent_obs = list(reversed(ai_gov.observations[-5:]))  # Last 5
        
        obs_data = []
        for obs in recent_obs:
            obs_data.append({
                'Timestamp': obs.timestamp,
                'Component': obs.component,
                'Parameters': str(list(obs.parameters.keys())[:3]) + '...' if len(obs.parameters) > 3 else str(list(obs.parameters.keys())),
                'Metrics Tracked': len(obs.metrics)
            })
        
        df = pd.DataFrame(obs_data)
        st.dataframe(df, width="stretch", hide_index=True)
    else:
        st.caption("No recent observations. AI will log activity as components are used.")
    
    # Activity monitoring capabilities
    st.markdown("### AI Activity Monitoring Capabilities")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Message Router**")
        st.caption("• Validator selection decisions")
        st.caption("• Routing path optimization")
        st.caption("• E=hf cost calculations")
        st.caption("• Burn/issuance tracking")
        
        st.markdown("**Security Controller**")
        st.caption("• Wavelength selection")
        st.caption("• Encryption level decisions")
        st.caption("• Key rotation recommendations")
        st.caption("• Security confidence scoring")
    
    with col2:
        st.markdown("**Governance AI**")
        st.caption("• Parameter adjustments")
        st.caption("• F_floor enforcement")
        st.caption("• Risk identification")
        st.caption("• Civilization impact analysis")
        
        st.markdown("**Consensus AI**")
        st.caption("• Block reward optimization")
        st.caption("• System health calculations")
        st.caption("• Contribution scoring")
        st.caption("• Dynamic issuance/burn")


def render_ai_management_dashboard():
    """Main AI Management Control Dashboard"""
    st.title("🤖 AI Management Control")
    st.markdown("**Centralized oversight of AI systems in NexusOS**")
    
    st.info("""
    💡 **AI System Status Dashboard**
    
    This dashboard shows AI code availability and integration points across NexusOS.
    - **Code Availability**: AI classes/functions exist in codebase (Router, Security, Bayesian, Consensus)
    - **Active Instance**: AI Governance is running (learns from research, governs parameters, enforces F_floor)
    - **Integration Points**: Shows which components use which AI features
    """)
    
    st.divider()
    
    # Navigation tabs
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "🎯 System Status",
        "🎛️ Governance Control",
        "📜 Decision History",
        "🔗 Component Integration",
        "📊 Learning Analytics",
        "⚡ Real-Time Activity"
    ])
    
    with tab1:
        render_ai_system_status()
    
    with tab2:
        render_ai_governance_control()
    
    with tab3:
        render_decision_history()
    
    with tab4:
        render_component_ai_integration()
    
    with tab5:
        render_learning_analytics()
    
    with tab6:
        render_real_time_ai_activity()
    
    st.divider()
    
    # AI Architecture Documentation
    with st.expander("📚 AI Architecture Documentation", expanded=False):
        st.markdown("""
        ### Complete AI Architecture
        
        **1. AI Message Router** (`messaging_routing.py`)
        - Selects optimal validators using spectral regions
        - Calculates E=hf quantum pricing
        - Balances network load
        - Manages burn/issuance flow
        
        **2. AI Security Controller** (`ai_message_security_controller.py`)
        - Analyzes message content for security needs
        - Selects wavelength (Infrared → UV)
        - Determines encryption level (STANDARD/HIGH/MAXIMUM)
        - Recommends key rotation
        
        **3. Nexus AI Governance** (`nexus_ai_governance.py`)
        - Learns from research observations
        - Governs parameter adaptation
        - Enforces F_floor minimum (CRITICAL)
        - Plans for 100+ year civilization sustainability
        
        **4. Bayesian Optimizer** (`ml_optimization.py`)
        - ML-driven parameter tuning
        - Multi-objective optimization
        - Stability, conservation, growth targets
        
        **5. Nexus Consensus AI** (`nexus_consensus.py`)
        - Dynamically adjusts block rewards
        - Based on system health (H×M×D score)
        - Weights community governance
        - AI-optimized issuance/burn
        
        ### AI Decision Flow
        
        ```
        Research Activity → Nexus AI Governance
                ↓
        Learn Patterns & Optimal Ranges
                ↓
        Identify Risks (Supply Depletion, Validator Exodus)
                ↓
        Govern Forward Adaptation
                ↓
        Enforce F_floor Minimum ✅
                ↓
        Adjust Parameters (Burn Rate, Validator Rewards)
                ↓
        Log Decision & Civilization Impact
        ```
        
        ### F_floor Protection (Critical)
        
        The AI's PRIMARY directive is preserving basic human living standards:
        - Minimum floor: 1,150 NXT/month per citizen
        - Never compromised for optimization
        - All decisions logged with F_floor status
        - Violations prevented automatically
        
        ### Integration Points
        
        - **Mobile DAG Messaging**: AI routing, security, economics
        - **DEX**: AI economic governance via pool ecosystem
        - **Payment Layer**: AI security and economics
        - **Validator Economics**: AI reward optimization
        - **Economic Simulator**: ML parameter tuning
        - **Pool Ecosystem**: AI governance of F_floor support
        """)


if __name__ == "__main__":
    render_ai_management_dashboard()
