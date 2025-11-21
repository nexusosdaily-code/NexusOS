"""
Nexus AI - Comprehensive Reporting System for Researchers
Generates user-friendly explanations, insights, and recommendations across all NexusOS components

Integrated with Nexus AI Governance that learns from research and ensures
basic human living standards (F_floor) are never compromised.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import streamlit as st
from nexus_ai_governance import get_ai_governance, GovernanceDecision


class NexusAI:
    """
    Nexus AI provides comprehensive analysis and reporting for researchers
    testing theories and exploring the NexusOS ecosystem.
    """
    
    @staticmethod
    def render_report_section(title: str, content: str, report_type: str = "info"):
        """Render a visually appealing report section"""
        colors = {
            "info": "#4A90E2",
            "success": "#32CD32", 
            "warning": "#FFD700",
            "critical": "#FF6B6B",
            "insight": "#9370DB"
        }
        
        color = colors.get(report_type, "#4A90E2")
        
        st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.2));
            border-left: 4px solid {color};
            padding: 15px 20px;
            border-radius: 8px;
            margin: 10px 0;
            backdrop-filter: blur(10px);
        ">
            <h4 style="color: {color}; margin: 0 0 10px 0;">🤖 {title}</h4>
            <p style="color: rgba(255,255,255,0.9); margin: 0; line-height: 1.6;">{content}</p>
        </div>
        """, unsafe_allow_html=True)
    
    @staticmethod
    def generate_economic_simulator_report(params: Dict, results: Optional[Dict] = None) -> None:
        """Generate comprehensive report for Economic Simulator results"""
        st.markdown("### 🤖 Nexus AI Research Report")
        st.markdown("---")
        
        # Parameter Analysis
        NexusAI.render_report_section(
            "Parameter Configuration Analysis",
            f"""Your simulation uses a base burn rate of {params.get('base_burn_rate', 0.01):.4f} and 
            adjustment rate of {params.get('adjustment_rate', 0.001):.4f}. These parameters control how 
            aggressively the system responds to economic imbalances. A higher adjustment rate means faster 
            adaptation but potential instability.""",
            "info"
        )
        
        # PID Analysis
        kp = params.get('kp', 0.1)
        ki = params.get('ki', 0.01)
        kd = params.get('kd', 0.05)
        
        if kp > 0.2:
            report_type = "warning"
            message = f"""High proportional gain (Kp={kp}) detected. This creates aggressive immediate responses 
            to economic deviations. While this can quickly stabilize the system, it may cause overshooting. 
            Consider reducing Kp if you observe oscillations in your results."""
        elif kp < 0.05:
            report_type = "insight"
            message = f"""Conservative proportional gain (Kp={kp}) detected. The system will respond slowly 
            to imbalances, which promotes stability but may allow prolonged deviations from target states. 
            This is ideal for long-term sustainability testing."""
        else:
            report_type = "success"
            message = f"""Balanced proportional gain (Kp={kp}) detected. This provides moderate responsiveness 
            without excessive oscillation - a good starting point for most research scenarios."""
        
        NexusAI.render_report_section("PID Controller Analysis", message, report_type)
        
        # Integral Component
        if ki > 0.05:
            NexusAI.render_report_section(
                "Integral Component Insight",
                f"""Your integral gain (Ki={ki}) is relatively high, which helps eliminate steady-state errors 
                but may introduce integral windup. Monitor for cumulative effects over long simulations.""",
                "warning"
            )
        
        # Results Analysis (if provided)
        if results:
            NexusAI.render_report_section(
                "Research Recommendations",
                """Based on your configuration, I recommend:
                
                1. **Run Duration**: Test for at least 1000 time steps to observe equilibrium behavior
                2. **Sensitivity Analysis**: Vary your PID parameters by ±20% to understand robustness
                3. **Stress Testing**: Introduce shock events to test system recovery
                4. **Documentation**: Record baseline metrics for comparison with future experiments
                
                Your theory testing will benefit from comparing multiple parameter sets systematically.""",
                "insight"
            )
    
    @staticmethod
    def generate_wavelength_economics_report(wave_data: Dict) -> None:
        """Generate report for Wavelength Economics validation"""
        st.markdown("### 🤖 Nexus AI Wavelength Analysis")
        st.markdown("---")
        
        wavelength = wave_data.get('wavelength', 0)
        region = wave_data.get('region', 'Unknown')
        cost = wave_data.get('cost', 0)
        
        NexusAI.render_report_section(
            "Wavelength Physics Explanation",
            f"""You selected wavelength {wavelength:.1f} nm in the {region} region. According to the Planck 
            relation E=hf (where f=c/λ), shorter wavelengths carry more energy and thus cost more NXT. 
            Your selected wavelength costs {cost:,} units, reflecting the quantum mechanical energy 
            requirements for transmission.""",
            "info"
        )
        
        # Energy efficiency analysis
        if wavelength < 450:
            efficiency_note = """Ultraviolet and deep violet wavelengths are high-energy but experience 
            atmospheric scattering. While quantum-secure, they're less efficient for long-range transmission."""
            report_type = "warning"
        elif 450 <= wavelength < 600:
            efficiency_note = """Green-blue wavelengths offer excellent penetration and moderate energy costs. 
            This is optimal for most messaging applications - balancing security and efficiency."""
            report_type = "success"
        else:
            efficiency_note = """Red and infrared wavelengths are energy-efficient but carry less information 
            density per photon. Ideal for bulk data transmission where cost minimization is priority."""
            report_type = "insight"
        
        NexusAI.render_report_section("Energy Efficiency Assessment", efficiency_note, report_type)
        
        NexusAI.render_report_section(
            "Research Application",
            f"""For your research into wavelength-based validation:
            
            - **Security Testing**: Different spectral regions use different hash algorithms - test cross-region attacks
            - **Cost Optimization**: Model user behavior under different pricing schemes (E=hf vs flat rate)
            - **Network Analysis**: Simulate how wavelength diversity affects consensus reliability
            - **Economic Impact**: Measure how message costs influence network activity patterns
            
            Your wavelength choice directly impacts both cryptographic security and economic sustainability.""",
            "insight"
        )
    
    @staticmethod
    def generate_consensus_report(consensus_data: Dict) -> None:
        """Generate report for consensus mechanism analysis"""
        st.markdown("### 🤖 Nexus AI Consensus Analysis")
        st.markdown("---")
        
        mechanism = consensus_data.get('mechanism', 'Unknown')
        validator_count = consensus_data.get('validators', 0)
        tps = consensus_data.get('tps', 0)
        
        # Mechanism explanation
        explanations = {
            "GhostDAG": """GhostDAG enables parallel block creation through DAG structure, eliminating the 
            traditional blockchain bottleneck. Multiple validators can propose blocks simultaneously, with 
            the PHANTOM protocol ordering them for conflict resolution. This dramatically increases throughput 
            while maintaining security.""",
            
            "Proof of Spectrum": """Proof of Spectrum assigns validators to different spectral regions, each 
            using distinct cryptographic algorithms (UV→SHA-3, Blue→BLAKE3, etc.). Block validation requires 
            consensus across regions, making single-algorithm attacks impossible. This creates quantum-resistant 
            security through diversity.""",
            
            "Nexus Consensus": """Nexus Consensus combines GhostDAG's parallel processing with Proof of Spectrum's 
            cryptographic diversity and AI-optimized economics. The system health score (H×M×D) dynamically adjusts 
            validator rewards, creating adaptive equilibrium. This represents the full integration of wavelength 
            mechanics with blockchain consensus."""
        }
        
        NexusAI.render_report_section(
            f"How {mechanism} Works",
            explanations.get(mechanism, f"Analyzing {mechanism} consensus properties..."),
            "info"
        )
        
        # Performance analysis
        if tps > 1000:
            perf_type = "success"
            perf_msg = f"""Excellent throughput: {tps:,} TPS exceeds most traditional blockchains. Your 
            configuration with {validator_count} validators achieves high parallelism."""
        elif tps > 100:
            perf_type = "info"
            perf_msg = f"""Moderate throughput: {tps:,} TPS is typical for this validator count. Consider 
            increasing parallelism or optimizing block propagation."""
        else:
            perf_type = "warning"
            perf_msg = f"""Low throughput: {tps:,} TPS suggests bottlenecks. Check validator connectivity, 
            block size, or consensus timeout parameters."""
        
        NexusAI.render_report_section("Performance Assessment", perf_msg, perf_type)
        
        NexusAI.render_report_section(
            "Research Directions",
            f"""For testing consensus theory with {mechanism}:
            
            1. **Scalability**: Vary validator count (10 → 100 → 1000) and measure TPS degradation
            2. **Byzantine Fault Tolerance**: Introduce malicious validators and test recovery
            3. **Network Partitions**: Simulate connectivity failures and observe healing behavior
            4. **Economic Incentives**: Measure how reward distribution affects validator behavior
            5. **Cross-Region Analysis** (PoS): Test attack resistance when regions are compromised
            
            Compare your results against baseline metrics to validate theoretical predictions.""",
            "insight"
        )
    
    @staticmethod
    def generate_validator_economics_report(validator_data: Dict) -> None:
        """Generate report for validator economics analysis"""
        st.markdown("### 🤖 Nexus AI Validator Economics Report")
        st.markdown("---")
        
        stake = validator_data.get('stake', 0)
        rewards = validator_data.get('rewards', 0)
        apr = validator_data.get('apr', 0)
        uptime = validator_data.get('uptime', 100)
        
        NexusAI.render_report_section(
            "Staking Economics Explanation",
            f"""With {stake:,} NXT staked, you're participating in network security. Validators earn rewards 
            proportional to stake, uptime, and system health contribution. Your current APR of {apr:.2f}% 
            reflects the AI-optimized reward distribution based on network conditions.""",
            "info"
        )
        
        # APR analysis
        if apr > 15:
            apr_type = "success"
            apr_msg = f"""Strong returns: {apr:.2f}% APR indicates healthy network economics. The AI reward 
            system has identified optimal conditions. Consider this a baseline for comparison during stress tests."""
        elif apr > 5:
            apr_type = "info"
            apr_msg = f"""Moderate returns: {apr:.2f}% APR is sustainable long-term. This suggests balanced 
            supply/demand dynamics with room for optimization through improved uptime or delegation strategies."""
        else:
            apr_type = "warning"
            apr_msg = f"""Low returns: {apr:.2f}% APR may indicate oversaturation or poor system health. 
            Review network metrics (H×M×D score) and consider parameter adjustments in your research model."""
        
        NexusAI.render_report_section("APR Analysis", apr_msg, apr_type)
        
        # Uptime impact
        if uptime < 95:
            NexusAI.render_report_section(
                "Uptime Impact",
                f"""Your {uptime:.1f}% uptime affects rewards through slashing penalties. Each percentage below 
                95% reduces effective stake by ~0.5%. For research purposes, test how uptime requirements impact 
                validator decentralization and network resilience.""",
                "warning"
            )
        
        NexusAI.render_report_section(
            "Research Framework",
            """For validator economics research:
            
            **Game Theory Testing**:
            - Model rational validator behavior under varying reward structures
            - Test delegation dynamics with different commission rates
            - Simulate collusion scenarios and measure countermeasures
            
            **Economic Sustainability**:
            - Long-term APR trends under different inflation schedules
            - Impact of token burns on validator profitability
            - Equilibrium stake distribution across validator sets
            
            **Network Security**:
            - Minimum viable stake for 51% attack resistance
            - Cost of censorship attacks vs. validator rewards
            - Slashing effectiveness in deterring malicious behavior
            
            Document your findings with controlled variable experimentation.""",
            "insight"
        )
    
    @staticmethod
    def generate_dex_report(dex_data: Dict) -> None:
        """Generate report for DEX trading analysis"""
        st.markdown("### 🤖 Nexus AI DEX Analysis")
        st.markdown("---")
        
        pair = dex_data.get('pair', 'NXT/TOKEN')
        liquidity = dex_data.get('liquidity', 0)
        volume = dex_data.get('volume', 0)
        price_impact = dex_data.get('price_impact', 0)
        
        NexusAI.render_report_section(
            "Automated Market Maker Mechanics",
            f"""The {pair} pool uses the constant product formula (x × y = k) for price discovery. 
            With {liquidity:,} NXT in liquidity, trades automatically execute against the pool. Larger 
            trades cause greater price impact due to the k-constant constraint.""",
            "info"
        )
        
        # Liquidity depth analysis
        if liquidity > 1000000:
            liq_type = "success"
            liq_msg = f"""Deep liquidity: {liquidity:,} NXT enables large trades with minimal slippage. 
            This pool can handle institutional volumes while maintaining price stability."""
        elif liquidity > 100000:
            liq_type = "info"
            liq_msg = f"""Adequate liquidity: {liquidity:,} NXT supports typical retail trading. Monitor 
            for depletion during high-volume periods."""
        else:
            liq_type = "warning"
            liq_msg = f"""Shallow liquidity: {liquidity:,} NXT means high slippage for large orders. 
            Test how liquidity incentives affect pool depth in your research model."""
        
        NexusAI.render_report_section("Liquidity Assessment", liq_msg, liq_type)
        
        # Price impact analysis
        if price_impact > 5:
            NexusAI.render_report_section(
                "Price Impact Warning",
                f"""Your trade causes {price_impact:.2f}% price impact - a significant market move. Large 
                impacts indicate either thin liquidity or oversized orders. Research how MEV (Miner Extractable 
                Value) and sandwich attacks exploit high-impact scenarios.""",
                "warning"
            )
        
        NexusAI.render_report_section(
            "DEX Research Applications",
            f"""For testing DEX theory with {pair}:
            
            **Liquidity Provider Economics**:
            - Impermanent loss calculation under different volatility scenarios
            - Fee accumulation vs. price divergence trade-offs
            - Optimal rebalancing strategies for LPs
            
            **Market Microstructure**:
            - Arbitrage efficiency between DEX and external markets
            - Front-running profitability and mitigation strategies
            - Slippage curves and their impact on trader behavior
            
            **Protocol Design**:
            - Concentrated liquidity (Uniswap v3) vs. uniform distribution
            - Dynamic fee structures based on volatility
            - Multi-hop routing optimization for token swaps
            
            Use controlled experiments to validate AMM mathematical models.""",
            "insight"
        )
    
    @staticmethod
    def generate_wnsp_report(message_data: Dict) -> None:
        """Generate report for WNSP protocol analysis"""
        st.markdown("### 🤖 Nexus AI WNSP Protocol Report")
        st.markdown("---")
        
        wavelength = message_data.get('wavelength', 0)
        modulation = message_data.get('modulation', 'OOK')
        dag_parents = message_data.get('parents', 1)
        cost = message_data.get('cost', 0)
        
        NexusAI.render_report_section(
            "Optical Mesh Networking Principles",
            f"""WNSP (Wavelength Network Security Protocol) uses {modulation} modulation at {wavelength:.1f} nm 
            for quantum-resistant messaging. Your message links to {dag_parents} parent(s) in the DAG, creating 
            mesh network integrity through cryptographic chaining. The {cost:,} unit cost reflects E=hf energy 
            requirements.""",
            "info"
        )
        
        # Modulation analysis
        mod_analysis = {
            "OOK": "On-Off Keying provides simplicity and reliability. Binary signaling is robust against noise but offers minimal data density.",
            "ASK": "Amplitude Shift Keying enables higher data rates through amplitude modulation. More susceptible to interference but efficient for bandwidth.",
            "FSK": "Frequency Shift Keying excels in noisy environments. Multiple frequency channels provide redundancy and error resistance.",
            "PSK": "Phase Shift Keying achieves maximum spectral efficiency. Complex demodulation required but optimal for high-throughput applications."
        }
        
        NexusAI.render_report_section(
            f"{modulation} Modulation Analysis",
            mod_analysis.get(modulation, "Analyzing modulation scheme..."),
            "info"
        )
        
        # DAG structure analysis
        if dag_parents > 2:
            dag_type = "success"
            dag_msg = f"""Excellent mesh connectivity: {dag_parents} parents create strong DAG integrity. 
            High parent count improves censorship resistance and enables faster consensus propagation."""
        elif dag_parents == 2:
            dag_type = "info"
            dag_msg = f"""Standard DAG configuration: 2 parents balance efficiency and security. Typical for 
            most WNSP applications."""
        else:
            dag_type = "warning"
            dag_msg = f"""Minimal DAG linking: Single parent creates linear chain structure. Consider multi-parent 
            linking to test true DAG properties."""
        
        NexusAI.render_report_section("DAG Structure Assessment", dag_msg, dag_type)
        
        NexusAI.render_report_section(
            "WNSP Research Framework",
            """For optical mesh networking research:
            
            **Physical Layer Testing**:
            - Wavelength propagation characteristics across atmospheric conditions
            - Modulation scheme performance under varying SNR (Signal-to-Noise Ratio)
            - Multi-wavelength multiplexing for throughput maximization
            
            **Cryptographic Security**:
            - Quantum interference patterns for authentication
            - Cross-spectral validation resilience against single-algorithm attacks
            - DAG-based consensus finality probability analysis
            
            **Economic Protocol**:
            - E=hf pricing impact on message frequency and size
            - Network congestion dynamics under different cost models
            - Orbital transition mechanics (quantum spectroscopy-based burns)
            
            **Network Topology**:
            - DAG parent selection algorithms and their impact on finality
            - Mesh network partition resistance and healing mechanisms
            - Message propagation latency vs. security trade-offs
            
            Test each layer independently, then measure emergent system properties.""",
            "insight"
        )
    
    @staticmethod
    def generate_supply_sustainability_report(supply_data: Dict) -> None:
        """Generate report for long-term supply sustainability analysis"""
        st.markdown("### 🤖 Nexus AI Supply Sustainability Report")
        st.markdown("---")
        
        current_supply = supply_data.get('current_supply', 1000000)
        burn_rate = supply_data.get('burn_rate', 0)
        years_remaining = supply_data.get('years_remaining', 0)
        
        NexusAI.render_report_section(
            "Token Economics Fundamentals",
            f"""NexusOS maintains {current_supply:,} NXT in circulation. With current burn rate of 
            {burn_rate:.6f} per transaction, the deflationary mechanism balances messaging activity against 
            supply preservation. Unlike Bitcoin's fixed halving schedule, NXT uses AI-controlled dynamic 
            adjustment for sustainable economics.""",
            "info"
        )
        
        # Sustainability analysis
        if years_remaining > 100:
            sust_type = "success"
            sust_msg = f"""Excellent sustainability: {years_remaining:.0f} years of supply at current burn rates. 
            The system can support multiple generations of users. Your economic model achieves long-term viability."""
        elif years_remaining > 50:
            sust_type = "info"
            sust_msg = f"""Good sustainability: {years_remaining:.0f} years remaining. Within acceptable range 
            for multi-decade protocols. Monitor for acceleration as network grows."""
        else:
            sust_type = "warning"
            sust_msg = f"""Concerning sustainability: {years_remaining:.0f} years may be insufficient. Consider 
            burn reduction mechanisms or alternative tokenomics in your research model."""
        
        NexusAI.render_report_section("Sustainability Assessment", sust_msg, sust_type)
        
        NexusAI.render_report_section(
            "Supply Economics Research",
            """For long-term tokenomics research:
            
            **Deflationary Mechanics**:
            - Dynamic burn adjustment (sqrt dampening) effectiveness
            - Supply floor determination and minimum viable circulation
            - Comparison: Fixed halving vs. AI-controlled adaptive issuance
            
            **Economic Equilibrium**:
            - Token velocity impact on burn rate sustainability
            - Validator reserve pool depletion scenarios
            - Transition reserve accumulation from orbital mechanics
            
            **Network Growth Modeling**:
            - User adoption curves and their impact on burn acceleration
            - Fee elasticity: how price sensitivity affects activity levels
            - Multi-decade projections using ensemble forecasting methods
            
            **Comparative Analysis**:
            - Bitcoin's 100M satoshi denominations vs. NXT 100M units
            - Fixed-supply cryptocurrencies: survival rates beyond 50 years
            - Inflationary vs. deflationary long-term viability
            
            Document your findings with sensitivity analysis across parameter ranges.""",
            "insight"
        )
    
    @staticmethod
    def generate_civilization_simulator_report(sim_data: Dict) -> None:
        """Generate comprehensive report for Civilization Simulator results with global debt analysis"""
        st.markdown("### 🤖 Nexus AI Civilization Simulation Report")
        st.markdown("---")
        
        # Extract simulation data
        initial_state = sim_data.get('initial_state', {})
        final_state = sim_data.get('final_state', {})
        stats = sim_data.get('stats', {})
        simulation_days = stats.get('simulation_days', 0)
        simulation_years = simulation_days / 365
        
        # Global debt calculations
        initial_debt = initial_state.get('global_debt_usd', 300_000_000_000_000.0)
        final_debt = final_state.get('global_debt_usd', 300_000_000_000_000.0)
        debt_growth_pct = ((final_debt - initial_debt) / initial_debt * 100) if initial_debt > 0 else 0
        debt_increase_usd = final_debt - initial_debt
        
        initial_nxt = initial_state.get('nxt_supply', 1)
        final_nxt = final_state.get('nxt_supply', 1)
        
        initial_backing_ratio = initial_debt / initial_nxt if initial_nxt > 0 else 0
        final_backing_ratio = final_debt / final_nxt if final_nxt > 0 else 0
        backing_ratio_change_pct = ((final_backing_ratio - initial_backing_ratio) / initial_backing_ratio * 100) if initial_backing_ratio > 0 else 0
        
        daily_floor_credits = final_state.get('debt_backed_floor_credits', 0)
        final_population = final_state.get('population', 1)
        
        # === SECTION 1: Simulation Overview ===
        NexusAI.render_report_section(
            "Simulation Configuration",
            f"""Simulated {simulation_days:,} days ({simulation_years:.1f} years) of civilization dynamics using the Nexus differential equation:
            
            **dN/dt = αC + βD + γE - δEntropy + PID**
            
            This equation models how Contribution (C), Distribution (D), Economic growth (E), and Entropy interact with 
            PID control to regulate NXT supply. The simulation tracks population growth, BHLS floor sustainability, 
            and most critically: **how $300T+ global debt backs NXT value and funds basic living standards**.""",
            "info"
        )
        
        # === SECTION 2: Global Debt Backing Analysis ===
        NexusAI.render_report_section(
            "Global Debt Backing Mechanism - Core Innovation",
            f"""NexusOS anchors NXT value to the $300+ trillion global debt pool. As sovereign debt expands (inevitable under 
            fiat systems), each NXT token gains intrinsic backing value. This is NOT speculative - it's mathematical reality:
            
            **Initial State (Day 0)**:
            - Global Debt: ${initial_debt/1e12:.2f}T USD
            - NXT Supply: {initial_nxt:,.0f} tokens
            - Debt per NXT: ${initial_backing_ratio:,.2f} USD/token
            
            **Final State (Day {simulation_days:,})**:
            - Global Debt: ${final_debt/1e12:.2f}T USD ({debt_growth_pct:+.2f}%)
            - NXT Supply: {final_nxt:,.0f} tokens
            - Debt per NXT: ${final_backing_ratio:,.2f} USD/token ({backing_ratio_change_pct:+.2f}%)
            
            **Debt Growth Impact**:
            - Total debt increase: ${debt_increase_usd/1e12:.2f}T USD
            - This additional debt backing flows to BHLS floor as guaranteed purchasing power
            - Daily floor credits from debt: {daily_floor_credits:,.2f} NXT ({daily_floor_credits/final_population:.4f} NXT per citizen)""",
            "success" if debt_growth_pct > 0 else "warning"
        )
        
        # === SECTION 3: BHLS Floor Sustainability ===
        floor_reserve = final_state.get('bhls_floor_reserve', 0)
        daily_floor_cost = final_population * 3.75
        sustainability_days = floor_reserve / daily_floor_cost if daily_floor_cost > 0 else 0
        
        if sustainability_days > 365:
            sust_type = "success"
            sust_msg = f"""Excellent BHLS floor sustainability: {sustainability_days:.0f} days ({sustainability_days/365:.1f} years) of 
            guaranteed basic living standards at current population. The floor reserve of {floor_reserve:,.0f} NXT can support 
            {final_population:,} citizens at 1,150 NXT/month (3.75 NXT/day) for over a year. **Debt backing contributes 
            {daily_floor_credits:,.2f} NXT daily**, ensuring perpetual floor funding as global debt grows."""
        elif sustainability_days > 90:
            sust_type = "info"
            sust_msg = f"""Adequate BHLS floor sustainability: {sustainability_days:.0f} days of reserves. Floor can support {final_population:,} 
            citizens for {sustainability_days/30:.1f} months. Debt backing adds {daily_floor_credits:,.2f} NXT daily to extend runway. 
            Monitor population growth vs. debt backing flow."""
        else:
            sust_type = "warning"
            sust_msg = f"""Low BHLS floor reserves: Only {sustainability_days:.0f} days remaining at current burn rate. While debt backing 
            provides {daily_floor_credits:,.2f} NXT daily, may be insufficient for {final_population:,} citizens. Increase recycling 
            participation or adjust floor parameters."""
        
        NexusAI.render_report_section("BHLS Floor Sustainability Analysis", sust_msg, sust_type)
        
        # === SECTION 4: Population & Economic Growth ===
        initial_pop = initial_state.get('population', 1)
        pop_growth_pct = stats.get('population_growth_percent', 0)
        nxt_change_pct = stats.get('nxt_supply_change_percent', 0)
        final_stability = stats.get('final_stability_index', 0)
        avg_stability = stats.get('avg_stability_index', 0)
        
        NexusAI.render_report_section(
            "Civilization Growth Dynamics",
            f"""Over {simulation_years:.1f} years, the civilization evolved significantly:
            
            **Population**: {initial_pop:,} → {final_population:,} citizens ({pop_growth_pct:+.1f}%)
            **NXT Supply**: {initial_nxt:,.0f} → {final_nxt:,.0f} tokens ({nxt_change_pct:+.1f}%)
            **Stability Index**: {avg_stability:.2%} average, {final_stability:.2%} final
            
            The NXT supply adjusted automatically via the Nexus equation to maintain economic balance. {'Positive' if nxt_change_pct > 0 else 'Negative'} 
            supply change indicates {'expansion' if nxt_change_pct > 0 else 'contraction'} driven by civilization metrics (contribution, 
            distribution, growth, entropy).""",
            "success" if final_stability > 0.7 else "warning"
        )
        
        # === SECTION 5: Research Applications ===
        NexusAI.render_report_section(
            "Civilization Economics Research Framework",
            f"""This simulation demonstrates NexusOS's revolutionary debt-backing mechanism. Research applications:
            
            **Debt Backing Theory**:
            - Test how different debt growth rates (3%, 5%, 7% annually) affect NXT value accrual
            - Model scenarios where debt grows faster/slower than NXT supply
            - Calculate optimal USD→NXT conversion rates for floor credit distribution
            - Analyze per-citizen debt backing allocation under different population curves
            
            **BHLS Floor Economics**:
            - Measure floor sustainability under varying recycling participation rates (50%, 70%, 90%)
            - Test shock scenarios: population surges, message burn reductions, recycling collapse
            - Optimize floor credit distribution: daily vs. weekly vs. monthly batches
            - Calculate minimum debt backing required for perpetual floor funding
            
            **Multi-Variable Sensitivity Analysis**:
            - Run parameter sweeps: α, β, γ, δ (Nexus equation coefficients)
            - Test PID controller tuning (Kp, Ki, Kd) for different stability targets
            - Compare entropy reduction strategies: recycling vs. circular economy vs. supply chain efficiency
            - Model validator incentive impacts on contribution index (C parameter)
            
            **Long-Term Projections**:
            - 50-year simulations: Can debt backing sustain BHLS indefinitely?
            - Generational stability: Does civilization health improve over time?
            - Economic equilibrium: At what debt/NXT ratio does system stabilize?
            - Catastrophic scenario testing: What if global debt stops growing?
            
            **Comparative Studies**:
            - NexusOS (debt-backed) vs. Bitcoin (fixed supply) vs. Fiat (inflationary)
            - Spectral diversity consensus vs. Proof-of-Work energy costs
            - Wavelength validation vs. SHA-256 computational requirements
            
            Use this simulation to validate theories about physics-governed civilizations that guarantee basic living 
            standards through mathematical certainty rather than political promises.""",
            "insight"
        )
        
        # === SECTION 6: Key Findings Summary ===
        findings = []
        
        if debt_growth_pct > 4.5:
            findings.append(f"✅ Global debt grew {debt_growth_pct:.1f}% - Strong NXT value backing")
        
        if backing_ratio_change_pct > 0:
            findings.append(f"✅ Debt per NXT increased {backing_ratio_change_pct:.1f}% - Value accrual confirmed")
        
        if sustainability_days > 365:
            findings.append(f"✅ BHLS floor funded for {sustainability_days/365:.1f} years - Citizens protected")
        
        if final_stability > 0.8:
            findings.append(f"✅ High stability ({final_stability:.1%}) - Civilization thriving")
        elif final_stability < 0.5:
            findings.append(f"⚠️ Low stability ({final_stability:.1%}) - Intervention needed")
        
        if daily_floor_credits > daily_floor_cost * 0.1:
            findings.append(f"✅ Debt backing provides {daily_floor_credits/daily_floor_cost*100:.1f}% of daily floor costs")
        
        findings_text = "\n".join([f"- {f}" for f in findings])
        
        NexusAI.render_report_section(
            "Key Simulation Findings",
            findings_text if findings else "Run simulation to generate findings",
            "success" if len([f for f in findings if '✅' in f]) >= 3 else "info"
        )
    
    @staticmethod
    def generate_recycling_analysis_report(recycling_data: Dict) -> None:
        """Generate comprehensive recycling analysis report with real-world calculations and interpretations"""
        st.markdown("### 🤖 Nexus AI Recycling Economics Report")
        st.markdown("---")
        
        # Extract data
        material_weights = recycling_data.get('material_weights', {})
        quality_grade = recycling_data.get('quality_grade', 0.8)
        recycling_rates = recycling_data.get('recycling_rates', {})
        current_stats = recycling_data.get('current_stats', {})
        
        # Calculate real values for each material
        material_calculations = {}
        total_nxt_value = 0.0
        total_weight_kg = 0.0
        
        for material_type, weight_kg in material_weights.items():
            if weight_kg > 0:
                base_rate = recycling_rates.get(material_type, 0.0)
                nxt_value = base_rate * weight_kg * quality_grade
                total_nxt_value += nxt_value
                total_weight_kg += weight_kg
                
                material_calculations[material_type] = {
                    'weight_kg': weight_kg,
                    'base_rate': base_rate,
                    'quality_adjusted_rate': base_rate * quality_grade,
                    'nxt_value': nxt_value,
                    'percentage_of_total': 0.0  # Will calculate after
                }
        
        # Calculate percentages
        for material_type in material_calculations:
            if total_nxt_value > 0:
                material_calculations[material_type]['percentage_of_total'] = (
                    material_calculations[material_type]['nxt_value'] / total_nxt_value * 100
                )
        
        # === SECTION 1: Input Summary ===
        NexusAI.render_report_section(
            "Research Input Configuration",
            f"""You submitted {total_weight_kg:,.2f} kg of recyclable materials across {len([w for w in material_weights.values() if w > 0])} 
            material types with a quality grade of {quality_grade:.1%}. Quality grade represents material condition:
            
            - **1.0 (100%)**: Pristine, clean, ready for reprocessing
            - **0.8 (80%)**: Good condition, minimal contamination (your setting)
            - **0.5 (50%)**: Average, some damage or mixing
            - **0.3 (30%)**: Poor quality, heavily contaminated
            
            The quality grade directly multiplies the base recycling rate to reflect real-world processing costs.""",
            "info"
        )
        
        # === SECTION 2: Material-by-Material Analysis ===
        st.markdown("#### 📊 Detailed Material Analysis")
        
        for material_type, calc in material_calculations.items():
            weight = calc['weight_kg']
            base_rate = calc['base_rate']
            adjusted_rate = calc['quality_adjusted_rate']
            nxt_value = calc['nxt_value']
            percentage = calc['percentage_of_total']
            
            # Determine material-specific insights
            if material_type.name == 'ELECTRONICS':
                insight = f"""E-waste contains valuable metals (gold, copper, rare earths). At {base_rate} NXT/kg base rate, 
                your {weight:,.2f} kg generates {nxt_value:,.2f} NXT - the highest value per kilogram. Critical for circular economy."""
                insight_type = "success"
            elif material_type.name == 'METAL':
                insight = f"""Metals are infinitely recyclable. At {base_rate} NXT/kg, your {weight:,.2f} kg yields {nxt_value:,.2f} NXT. 
                Metal recycling saves 95% energy vs. virgin production."""
                insight_type = "success"
            elif material_type.name == 'PLASTIC':
                insight = f"""Plastic recycling is critical for entropy reduction. Your {weight:,.2f} kg at {base_rate} NXT/kg earns 
                {nxt_value:,.2f} NXT. Each kg prevents ocean/landfill pollution."""
                insight_type = "info"
            elif material_type.name == 'ORGANIC':
                insight = f"""Organic waste has low economic value ({base_rate} NXT/kg) but high entropy reduction. Your {weight:,.2f} kg 
                yields {nxt_value:,.2f} NXT while preventing methane emissions from landfills."""
                insight_type = "info"
            elif material_type.name == 'BATTERIES':
                insight = f"""Batteries require specialized recycling due to toxic materials. At {base_rate} NXT/kg, your {weight:,.2f} kg 
                generates {nxt_value:,.2f} NXT while preventing environmental contamination."""
                insight_type = "warning"
            else:
                insight = f"""Your {weight:,.2f} kg of {material_type.value} at {base_rate} NXT/kg generates {nxt_value:,.2f} NXT 
                ({percentage:.1f}% of total recycling value)."""
                insight_type = "info"
            
            NexusAI.render_report_section(
                f"{material_type.value}: {nxt_value:,.2f} NXT ({percentage:.1f}% of total)",
                f"""**Weight**: {weight:,.2f} kg
                **Base Rate**: {base_rate} NXT/kg
                **Quality-Adjusted Rate**: {adjusted_rate:.2f} NXT/kg (×{quality_grade:.2f} quality factor)
                **Total Value**: {nxt_value:,.2f} NXT
                
                {insight}""",
                insight_type
            )
        
        # === SECTION 3: Economic Impact Summary ===
        # Calculate downstream effects
        bhls_floor_transfer = total_nxt_value * 0.5  # 50% to BHLS floor
        supply_chain_fund = total_nxt_value * 0.3  # 30% to supply chain
        recycler_credits = total_nxt_value * 0.2  # 20% to recycler
        
        # Entropy reduction calculation (rough estimate: 1 kg recycled = 2 kg CO2 equivalent prevented)
        co2_prevented_kg = total_weight_kg * 2.0
        entropy_reduction_normalized = total_weight_kg / 1000  # Normalized entropy score
        
        NexusAI.render_report_section(
            "Economic Impact - Total Value Generated",
            f"""Your {total_weight_kg:,.2f} kg submission generates **{total_nxt_value:,.2f} NXT** in total economic value.
            
            **Value Distribution** (NexusOS Circular Economy):
            - **BHLS Floor**: {bhls_floor_transfer:,.2f} NXT (50%) → Funds guaranteed basic living standards
            - **Supply Chain**: {supply_chain_fund:,.2f} NXT (30%) → Supports renewable energy/resource infrastructure
            - **Recycler Credits**: {recycler_credits:,.2f} NXT (20%) → Direct payment to citizen/business
            
            **Equivalent Purchasing Power**:
            - {total_nxt_value:,.2f} NXT ≈ ${total_nxt_value * 100:,.2f} USD (at $100/NXT market rate)
            - Can support {total_nxt_value / 1150:.2f} citizens with 1 month of BHLS floor (1,150 NXT/month)
            - Equivalent to {total_nxt_value / 3.75:.0f} citizen-days of guaranteed basic living standards
            
            This demonstrates how physical recycling directly backs economic value through physics-anchored tokenomics.""",
            "success" if total_nxt_value > 500 else "info"
        )
        
        # === SECTION 4: Entropy Reduction Analysis ===
        if entropy_reduction_normalized > 0.5:
            entropy_type = "success"
            entropy_msg = f"""Excellent entropy reduction: {total_weight_kg:,.2f} kg recycled prevents ~{co2_prevented_kg:,.0f} kg CO₂ equivalent 
            emissions. Large-scale recycling like this directly improves civilization stability by reducing waste entropy."""
        elif entropy_reduction_normalized > 0.1:
            entropy_type = "info"
            entropy_msg = f"""Good entropy reduction: {total_weight_kg:,.2f} kg recycled prevents ~{co2_prevented_kg:,.0f} kg CO₂ equivalent 
            emissions. Scaling this impact requires broader citizen participation."""
        else:
            entropy_type = "warning"
            entropy_msg = f"""Modest entropy reduction: {total_weight_kg:,.2f} kg recycled prevents ~{co2_prevented_kg:,.0f} kg CO₂ equivalent 
            emissions. Consider scaling up material collection for greater environmental impact."""
        
        NexusAI.render_report_section(
            "Entropy Reduction & Environmental Impact",
            entropy_msg +
            f"""
            
            **Entropy Formula**: Recycling prevents resource depletion and reduces system disorder (2nd Law of Thermodynamics).
            - **Landfill Prevention**: {total_weight_kg:,.2f} kg diverted from waste stream
            - **Energy Savings**: Recycling uses 30-95% less energy than virgin material production
            - **Resource Conservation**: Extends finite material reserves for future generations
            
            In NexusOS's Nexus equation (dN/dt = αC + βD + γE - δEntropy + PID), recycling directly reduces the δEntropy term, 
            allowing the civilization to maintain higher stability indices.""",
            entropy_type
        )
        
        # === SECTION 5: Comparative Analysis ===
        avg_weight_per_material = total_weight_kg / max(len([w for w in material_weights.values() if w > 0]), 1)
        weighted_avg_rate = total_nxt_value / total_weight_kg if total_weight_kg > 0 else 0
        
        NexusAI.render_report_section(
            "Portfolio Optimization Analysis",
            f"""Your material mix achieves a weighted average rate of {weighted_avg_rate:.2f} NXT/kg (quality-adjusted).
            
            **Optimization Recommendations**:
            
            1. **High-Value Materials** (>10 NXT/kg): E-waste ({recycling_rates.get('ELECTRONICS', 0)} NXT/kg base)
               - Your e-waste: {material_weights.get('ELECTRONICS', 0):,.2f} kg
               - Potential: Increase e-waste collection for maximum economic return
            
            2. **Medium-Value Materials** (2-10 NXT/kg): Metal, Plastic, Textiles, Batteries
               - Your submission: {sum([material_weights.get(m, 0) for m in ['METAL', 'PLASTIC', 'TEXTILES', 'BATTERIES']]):,.2f} kg combined
               - Strategy: These materials balance value and volume
            
            3. **High-Volume Materials** (<2 NXT/kg): Paper, Glass, Organic
               - Your submission: {sum([material_weights.get(m, 0) for m in ['PAPER', 'GLASS', 'ORGANIC']]):,.2f} kg combined
               - Impact: Low per-kg value but high entropy reduction and availability
            
            **Quality Grade Impact**:
            - Current grade: {quality_grade:.1%} ({quality_grade * 100:.0f}/100)
            - If perfect quality (1.0): {total_nxt_value / quality_grade:,.2f} NXT (+{(1/quality_grade - 1) * 100:.1f}% increase)
            - If poor quality (0.5): {total_nxt_value * 0.5 / quality_grade:,.2f} NXT ({(0.5/quality_grade - 1) * 100:.1f}% decrease)
            
            **Recommendation**: Invest in sorting/cleaning infrastructure to maximize quality grade → higher NXT returns.""",
            "insight"
        )
        
        # === SECTION 6: Research Applications ===
        NexusAI.render_report_section(
            "Research Applications & Experimental Framework",
            f"""Use this recycling analysis tool to test circular economy theories:
            
            **Economic Experiments**:
            - **Price Sensitivity**: Test how changing recycling rates (NXT/kg) affects citizen participation
            - **Quality Thresholds**: Model minimum quality grades needed for economic viability
            - **Material Substitution**: Compare value of different material compositions
            - **Scale Effects**: Test whether bulk recycling (1000+ kg) improves efficiency
            
            **Entropy Modeling**:
            - **Waste Reduction Scenarios**: Model civilization stability under different recycling rates (50%, 80%, 95%)
            - **Material Lifecycle**: Calculate full cradle-to-grave environmental impact
            - **Landfill Avoidance**: Quantify entropy reduction from diverting materials
            
            **System Integration Testing**:
            - **BHLS Floor Impact**: How much recycling needed to sustain 10,000 citizens?
            - **Circular Flow**: Track NXT from recycling → BHLS → consumption → disposal → recycling
            - **Supply Chain Funding**: Test how recycling revenue supports renewable energy infrastructure
            
            **Comparative Studies**:
            - NexusOS (incentivized recycling) vs. Traditional (landfill fees) vs. Zero-Waste (mandates)
            - Physics-backed value (E=hf, material conservation) vs. Speculative carbon credits
            - Decentralized citizen recycling vs. Centralized waste management
            
            **Parameter Sweeps**:
            - Vary quality grade from 0.1 to 1.0 in 0.1 increments
            - Test material mixes: e-waste-heavy, plastic-heavy, balanced portfolios
            - Model population scaling: 100 citizens → 1M citizens recycling behavior
            
            Document findings to validate circular economy models and inform policy design.""",
            "insight"
        )
        
        # === SECTION 7: Actionable Recommendations ===
        recommendations = []
        
        # High-value material suggestions
        if material_weights.get('ELECTRONICS', 0) < 50:
            recommendations.append("⚡ **Increase E-Waste Collection**: At 15 NXT/kg, e-waste offers 3-6x returns vs. other materials")
        
        # Quality improvement
        if quality_grade < 0.7:
            recommendations.append(f"🔧 **Improve Material Quality**: Current {quality_grade:.0%} grade reduces value by {(1-quality_grade)*100:.0f}%. Invest in sorting/cleaning")
        
        # Volume optimization
        if total_weight_kg < 100:
            recommendations.append("📦 **Scale Up Collection**: Your {total_weight_kg:,.0f} kg submission is small-scale. Industrial volumes (1000+ kg) improve logistics efficiency")
        
        # Material balance
        plastic_pct = material_calculations.get('PLASTIC', {}).get('percentage_of_total', 0)
        if plastic_pct > 50:
            recommendations.append(f"♻️ **Diversify Materials**: Plastic dominates ({plastic_pct:.0f}%). Add metals/e-waste for higher average returns")
        
        # BHLS floor contribution
        citizens_supported = bhls_floor_transfer / 1150
        if citizens_supported < 1:
            recommendations.append(f"👥 **BHLS Impact**: Currently supports {citizens_supported:.2f} citizens/month. Target 1,150+ NXT for 1 citizen guarantee")
        
        recommendations_text = "\n".join([f"- {r}" for r in recommendations])
        
        NexusAI.render_report_section(
            "Actionable Recommendations",
            recommendations_text if recommendations else "✅ Optimal configuration - no immediate changes needed",
            "warning" if len(recommendations) >= 3 else "success"
        )


def render_nexus_ai_button(component_name: str, data: Dict) -> None:
    """
    Render a button that shows Nexus AI analysis when clicked
    Integrates with AI Governance for learning and forward adaptation
    
    Args:
        component_name: Name of the component (e.g., 'economic_simulator', 'dex', 'wnsp')
        data: Component-specific data for analysis
    """
    col1, col2 = st.columns([3, 1])
    
    with col1:
        show_report = st.button("🤖 Generate Nexus AI Research Report", key=f"ai_report_{component_name}", 
                     help="Get comprehensive AI analysis and recommendations")
    
    with col2:
        show_civilization = st.button("🌍 Civilization Report", key=f"civ_report_{component_name}",
                                     help="View long-term sustainability analysis")
    
    if show_report:
        with st.expander("📊 Nexus AI Comprehensive Report", expanded=True):
            ai = NexusAI()
            governance = get_ai_governance()
            
            # Route to appropriate report generator
            report_generators = {
                'economic_simulator': ai.generate_economic_simulator_report,
                'wavelength_economics': ai.generate_wavelength_economics_report,
                'consensus': ai.generate_consensus_report,
                'validator_economics': ai.generate_validator_economics_report,
                'dex': ai.generate_dex_report,
                'wnsp': ai.generate_wnsp_report,
                'supply_sustainability': ai.generate_supply_sustainability_report,
                'civilization_simulator': ai.generate_civilization_simulator_report
            }
            
            generator = report_generators.get(component_name)
            if generator:
                if component_name == 'economic_simulator':
                    generator(data, data.get('results'))
                else:
                    generator(data)
                
                # Record observation for AI learning
                st.divider()
                st.markdown("### 🧠 AI Governance Learning")
                
                # Extract metrics for learning
                metrics = {}
                if component_name == 'economic_simulator':
                    metrics = {
                        'N_final': data.get('N_final', 0),
                        'system_health_avg': data.get('system_health_avg', 0),
                        'F_floor': data.get('F_floor', 10.0)  # CRITICAL: Track F_floor
                    }
                elif component_name == 'validator_economics':
                    metrics = {'apr': data.get('apr', 0), 'uptime': data.get('uptime', 0)}
                elif component_name == 'dex':
                    metrics = {'liquidity': data.get('liquidity', 0), 'volume': data.get('volume', 0)}
                elif component_name == 'wnsp':
                    metrics = {'cost': data.get('cost', 0)}
                elif component_name == 'supply_sustainability':
                    metrics = {'years_remaining': data.get('years_remaining', 0)}
                elif component_name == 'payment_layer':
                    metrics = {'total_burned': data.get('total_burned', 0), 'burn_rate': data.get('burn_rate', 0)}
                
                # Get current user if available
                researcher_email = st.session_state.get('current_user', {}).email if hasattr(st.session_state.get('current_user', {}), 'email') else None
                
                # Record observation
                governance.observe_research(component_name, data, metrics, researcher_email)
                
                # Get and show governance decision
                decision = governance.govern_forward_adaptation(component_name, data)
                
                NexusAI.render_report_section(
                    "AI Governance Decision",
                    f"""**Rationale**: {decision.rationale}
                    
**F_floor (Basic Living Standards) Protected**: {'✅ YES' if decision.f_floor_preserved else '⚠️ NO'}

**Civilization Impact**: {decision.civilization_impact}

**Recommended Adaptations**: {len(decision.parameter_adjustments)} parameters""",
                    "success" if decision.f_floor_preserved else "critical"
                )
                
                if decision.parameter_adjustments:
                    st.json(decision.parameter_adjustments)
                
                # Show learning insights
                insights = governance.get_learning_insights(component_name)
                st.metric("AI Learning Sample Size", insights['sample_size'])
                if insights['risks_identified'] > 0:
                    st.warning(f"⚠️ {insights['risks_identified']} civilization risks identified and monitored")
                if insights['f_floor_violations_prevented'] > 0:
                    st.error(f"🛡️ {insights['f_floor_violations_prevented']} attempts to compromise basic living standards prevented")
            else:
                st.warning(f"Nexus AI report not yet available for {component_name}")
    
    if show_civilization:
        with st.expander("🌍 Civilization Sustainability Report", expanded=True):
            governance = get_ai_governance()
            report = governance.generate_civilization_report()
            st.markdown(report)
