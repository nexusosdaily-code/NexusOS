"""
NexusOS - Civilization Operating System
Unified Dashboard Launcher
=========================================

Central hub providing access to all NexusOS modules:
1. Civilization Dashboard (7 tabs with Mobile Wallet)
2. Web3 Wallet Dashboard
3. WNSP Protocol v2.0
4. Mobile DAG Messaging (Blockchain Messaging)
5. Blockchain Explorer (Live Block/Transaction Visualization)
6. DEX - Decentralized Exchange (AMM with NXT pairs)
7. GhostDAG System (Parallel Processing & DAG Optimization)
8. Payment Layer (Native Token POW Mining)
9. Proof of Spectrum (Wavelength Consensus)
10. Validator Economics (Staking & Delegation)
11. Wavelength Economics (Physics Validation)
12. Nexus Consensus (Unified Consensus Engine)
13. Mobile Connectivity (Device Network Monitoring)
14. Long-term Supply Forecasting (50-100 Year Predictions)
15. AI Management Control (Centralized AI Governance)
16. Talk to Nexus AI (Conversational Governance Interface)
17. Offline Mesh Network (Peer-to-Peer Internet WITHOUT WiFi/Data)
"""

import streamlit as st

# Import all dashboard modules
from civilization_dashboard import main as civilization_main
from web3_wallet_dashboard import render_web3_wallet_dashboard
from wnsp_dashboard_v2 import render_wnsp_v2_dashboard
from wavelength_economics_dashboard import render_wavelength_economics_dashboard
from nexus_consensus_dashboard import render_nexus_consensus_dashboard
from mobile_connectivity_dashboard import show_mobile_connectivity_dashboard
from longterm_supply_dashboard import render_longterm_supply_dashboard
from mobile_dag_messaging import render_mobile_dag_messaging
from blockchain_viz import render_blockchain_dashboard
from dex_page import render_dex_page
from ghostdag_page import render_ghostdag_system
from payment_layer_page import render_payment_layer_page
from proof_of_spectrum_page import render_proof_of_spectrum
from validator_economics_page import render_validator_economics_page
from ai_management_dashboard import render_ai_management_dashboard
from nexus_ai_chat import render_nexus_ai_chat
from offline_mesh_dashboard import render_offline_mesh_dashboard
from wavelength_code_interface import render_wavelength_code_interface
from wavelang_ai_teacher import render_wavelang_ai_teacher
from wavelang_compiler import render_wavelang_compiler_dashboard
from quantum_wavelang_analyzer import render_quantum_wavelang_analyzer
from civic_governance_dashboard import main as civic_governance_main
from mobile_blockchain_hub import render_mobile_blockchain_hub


def main():
    """Unified NexusOS Dashboard Launcher"""
    
    # Page config
    st.set_page_config(
        page_title="NexusOS - Civilization Operating System",
        page_icon="🌍",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    
    # Sidebar - Module Selector
    with st.sidebar:
        st.title("🌍 NexusOS")
        st.markdown("**Civilization Operating System**")
        st.divider()
        
        # Module selector - clean and simple
        module = st.selectbox(
            "**Select Dashboard**",
            [
                "📱 Mobile Blockchain Hub",
                "🌍 Civilization Dashboard",
                "💎 Web3 Wallet",
                "📡 WNSP Protocol v2.0",
                "💬 Mobile DAG Messaging",
                "🔗 Blockchain Explorer",
                "💱 DEX (Token Exchange)",
                "⚡ GhostDAG System",
                "💰 Payment Layer",
                "🌈 Proof of Spectrum",
                "🏛️ Validator Economics",
                "💵 Wavelength Economics",
                "⚙️ Nexus Consensus",
                "📱 Mobile Connectivity",
                "📊 Long-term Supply",
                "🤖 AI Management Control",
                "💬 Talk to Nexus AI",
                "🌐 Offline Mesh Network",
                "🏛️ Civic Governance",
                "🌊 WaveLang Studio",
                "🤖 WaveLang AI Teacher",
                "💻 WaveLang Binary Compiler",
                "⚛️ Quantum Analyzer"
            ],
            key="module_selector"
        )
        
        st.divider()
        
        # Simple module info
        module_info = {
            "📱 Mobile Blockchain Hub": {
                "icon": "📱",
                "desc": "Unified mobile blockchain interface - Your phone IS the blockchain node",
                "features": ["💎 Web3 Wallet", "📨 DAG Messaging", "🔗 Explorer", "💱 DEX", "🏛️ Validators", "⚛️ Wavelength", "🌐 Network (GhostDAG/PoS/Consensus/Mesh)", "🗳️ Governance", "🔌 Connectivity"]
            },
            "🌍 Civilization Dashboard": {
                "icon": "🌍",
                "desc": "Complete civilization architecture with 7 integrated systems",
                "features": ["Wave Computation", "BHLS Floor", "Circular Economy", "Civilization Simulator", "Governance", "Supply Chain", "**Mobile Wallet** 💰"]
            },
            "💎 Web3 Wallet": {
                "icon": "💎",
                "desc": "Native quantum-resistant wallet for NXT tokens",
                "features": ["Create Wallets", "Send NXT", "WNSP Messaging", "Transaction History"]
            },
            "📡 WNSP Protocol v2.0": {
                "icon": "📡",
                "desc": "Wavelength-Native Signaling Protocol with quantum cryptography",
                "features": ["64 Characters", "DAG Messaging", "E=hf Pricing", "Network Visualization"]
            },
            "💬 Mobile DAG Messaging": {
                "icon": "💬",
                "desc": "Mobile blockchain messaging with E=hf quantum pricing",
                "features": ["Send Messages", "DAG Network View", "Message Inbox", "Cost Analytics"]
            },
            "🔗 Blockchain Explorer": {
                "icon": "🔗",
                "desc": "Real-time blockchain visualization and transaction explorer",
                "features": ["Live Blocks", "Transaction History", "Network Stats", "Validator Activity"]
            },
            "💱 DEX (Token Exchange)": {
                "icon": "💱",
                "desc": "Decentralized Exchange with AMM (NXT-paired liquidity pools)",
                "features": ["Token Swaps", "Liquidity Pools", "Add/Remove Liquidity", "Pool Analytics", "0.3% Fees to Validators"]
            },
            "⚡ GhostDAG System": {
                "icon": "⚡",
                "desc": "DAG-based parallel processing and bottleneck elimination",
                "features": ["GhostDAG Consensus", "DAG Optimizer", "Bottleneck Analysis", "Performance Dashboard", "Live Simulation"]
            },
            "💰 Payment Layer": {
                "icon": "💰",
                "desc": "Native token (NXT) payment system with POW mining",
                "features": ["Token Economics", "POW Mining", "Messaging Payments", "Account Management", "Analytics"]
            },
            "🌈 Proof of Spectrum": {
                "icon": "🌈",
                "desc": "Wavelength-inspired consensus eliminating 51% attacks",
                "features": ["Spectral Diversity", "Attack Resistance", "Validator Distribution", "Wave Interference Validation"]
            },
            "🏛️ Validator Economics": {
                "icon": "🏛️",
                "desc": "Staking, delegation, and validator reward system",
                "features": ["Stake NXT", "Delegate Tokens", "Validator Rankings", "Performance Metrics", "Profitability Calculator"]
            },
            "💵 Wavelength Economics": {
                "icon": "💰",
                "desc": "Physics-based economic validation system",
                "features": ["Wave Validation", "E=hf Economics", "Spectral Consensus"]
            },
            "⚙️ Nexus Consensus": {
                "icon": "⚙️",
                "desc": "Unified consensus engine with GhostDAG + PoS",
                "features": ["Parallel Processing", "Spectral Diversity", "AI Optimization"]
            },
            "📱 Mobile Connectivity": {
                "icon": "📱",
                "desc": "Real-time mobile device network monitoring",
                "features": ["Connected Devices", "Validator Network", "Network Health"]
            },
            "📊 Long-term Supply": {
                "icon": "📊",
                "desc": "50-100 year supply forecasting and analytics",
                "features": ["Predictive Models", "Trend Analysis", "Strategic Insights"]
            },
            "🤖 AI Management Control": {
                "icon": "🤖",
                "desc": "Centralized AI governance and control across all components",
                "features": ["AI System Status", "Decision History", "Component Integration", "Learning Analytics", "Real-time Activity", "F_floor Protection"]
            },
            "💬 Talk to Nexus AI": {
                "icon": "💬",
                "desc": "Conversational interface to the civilization governance AI",
                "features": ["Ask About Vision", "F_floor Explanations", "Learned Patterns", "Governance Decisions", "Economics Discussion", "100-Year Planning"]
            },
            "🌊 WaveLang Studio": {
                "icon": "🌊",
                "desc": "Revolutionary code using wavelengths instead of syntax - ZERO syntax errors ever",
                "features": ["Visual Builder", "Energy Calculator", "Error Prevention", "Comparison", "Save Programs"]
            },
            "🤖 WaveLang AI Teacher": {
                "icon": "🤖",
                "desc": "NexusOS AI assistant for learning WaveLang - text-to-wavelength encoder/decoder",
                "features": ["Text→Wavelength", "Wavelength→English", "Optimizer", "Validator", "Advisor"]
            },
            "💻 WaveLang Binary Compiler": {
                "icon": "💻",
                "desc": "See how binary CPUs execute wavelength code - shows full compilation pipeline",
                "features": ["Wavelength→Bytecode", "Bytecode→Assembly", "Bytecode→Python", "Full Pipeline"]
            },
            "⚛️ Quantum Analyzer": {
                "icon": "⚛️",
                "desc": "Quantum-level program analysis using wave properties and physics mechanics",
                "features": ["Wave Interference", "Superposition Paths", "Coherence Metrics", "Phase Locking", "Harmonics", "State Collapse"]
            },
            "🏛️ Civic Governance": {
                "icon": "🏛️",
                "desc": "Innovation campaigns where validators burn NXT to promote ideas, community votes, AI analyzes results",
                "features": ["Create Campaigns", "Community Voting", "AI Analysis Reports", "Campaign Analytics", "NXT Burn Economics"]
            }
        }
        
        if module in module_info:
            info = module_info[module]
            with st.expander(f"{info['icon']} About this module"):
                st.write(info['desc'])
                st.markdown("**Features:**")
                for feature in info['features']:
                    st.markdown(f"• {feature}")
        
        st.divider()
        st.caption("🌊 NexusOS v3.0")
        st.caption("Production Ready ✅")
    
    # Main content area - Route to selected module
    if module == "📱 Mobile Blockchain Hub":
        # Mobile blockchain hub - unified interface
        render_mobile_blockchain_hub()
    
    elif module == "🌍 Civilization Dashboard":
        # Full civilization dashboard with 7 tabs
        civilization_main()
    
    elif module == "💎 Web3 Wallet":
        # Native wallet interface
        render_web3_wallet_dashboard()
    
    elif module == "📡 WNSP Protocol v2.0":
        # WNSP protocol dashboard
        render_wnsp_v2_dashboard()
    
    elif module == "💬 Mobile DAG Messaging":
        # Mobile blockchain messaging
        render_mobile_dag_messaging()
    
    elif module == "🔗 Blockchain Explorer":
        # Blockchain visualization
        render_blockchain_dashboard()
    
    elif module == "💱 DEX (Token Exchange)":
        # Decentralized Exchange
        render_dex_page()
    
    elif module == "⚡ GhostDAG System":
        # GhostDAG ecosystem
        render_ghostdag_system()
    
    elif module == "💰 Payment Layer":
        # Native token payment layer
        render_payment_layer_page()
    
    elif module == "🌈 Proof of Spectrum":
        # Proof of Spectrum consensus
        render_proof_of_spectrum()
    
    elif module == "🏛️ Validator Economics":
        # Validator staking and economics
        render_validator_economics_page()
    
    elif module == "💵 Wavelength Economics":
        # Economics dashboard
        render_wavelength_economics_dashboard()
    
    elif module == "⚙️ Nexus Consensus":
        # Consensus dashboard
        render_nexus_consensus_dashboard()
    
    elif module == "📱 Mobile Connectivity":
        # Mobile connectivity monitor
        show_mobile_connectivity_dashboard()
    
    elif module == "📊 Long-term Supply":
        # Long-term supply forecasting
        render_longterm_supply_dashboard()
    
    elif module == "🤖 AI Management Control":
        # AI management and governance dashboard
        render_ai_management_dashboard()
    
    elif module == "💬 Talk to Nexus AI":
        # Conversational interface to governance AI
        render_nexus_ai_chat()
    
    elif module == "🌐 Offline Mesh Network":
        # Offline peer-to-peer internet infrastructure
        render_offline_mesh_dashboard()
    
    elif module == "🌊 WaveLang Studio":
        # WaveLang visual interface
        render_wavelength_code_interface()
    
    elif module == "🤖 WaveLang AI Teacher":
        # WaveLang AI assistant
        render_wavelang_ai_teacher()
    
    elif module == "💻 WaveLang Binary Compiler":
        # WaveLang compilation pipeline
        render_wavelang_compiler_dashboard()
    
    elif module == "⚛️ Quantum Analyzer":
        # Quantum-level WaveLang analysis
        render_quantum_wavelang_analyzer()
    
    elif module == "🏛️ Civic Governance":
        # Civic governance innovation campaigns
        civic_governance_main()


if __name__ == "__main__":
    main()
