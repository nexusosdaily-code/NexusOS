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
from wnsp_v3_dashboard import render_wnsp_v3_dashboard
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
from mobile_hub_v2 import render_mobile_hub
from economic_loop_dashboard import render_economic_loop_dashboard
from avogadro_economics_dashboard import main as avogadro_economics_main
from napp_deployment_center import render_napp_deployment_center
from transaction_search_explorer import render_transaction_search_explorer
from sybil_dashboard import render_sybil_detection_dashboard
from ai_arbitration_dashboard import render_arbitration_dashboard
from security_dashboard import security_dashboard


def main():
    """Unified NexusOS Dashboard Launcher"""
    
    # Page config
    st.set_page_config(
        page_title="NexusOS - Civilization Operating System",
        page_icon="🌍",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Quantum-Themed CSS with Wave Animations & Glowing Effects
    st.markdown("""
        <style>
        /* ============================================
           QUANTUM WAVE BACKGROUND ANIMATION
           ============================================ */
        @keyframes quantumWaves {
            0% { background-position: 0% 0%; }
            25% { background-position: 100% 100%; }
            50% { background-position: 0% 100%; }
            75% { background-position: 100% 0%; }
            100% { background-position: 0% 0%; }
        }
        
        @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
            50% { box-shadow: 0 0 40px rgba(102, 126, 234, 0.8), 0 0 60px rgba(118, 75, 162, 0.6); }
        }
        
        @keyframes ripple {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.2); opacity: 0; }
        }
        
        @keyframes particleFloat {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(-10px) translateX(5px); }
            50% { transform: translateY(0px) translateX(10px); }
            75% { transform: translateY(10px) translateX(5px); }
        }
        
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
        
        /* Main app background - LIGHT SPECTRUM GRADIENT */
        .stApp {
            background: linear-gradient(135deg, 
                rgba(255, 235, 235, 0.95),  /* Soft red */
                rgba(255, 245, 220, 0.95),  /* Soft orange */
                rgba(255, 255, 235, 0.95),  /* Soft yellow */
                rgba(235, 255, 235, 0.95),  /* Soft green */
                rgba(235, 250, 255, 0.95),  /* Soft cyan */
                rgba(240, 240, 255, 0.95),  /* Soft blue */
                rgba(250, 240, 255, 0.95)   /* Soft violet */
            ) !important;
            color: #1B1B2F !important;
        }
        
        /* Global typography - DARK text on light background */
        body, p, span, div, label, li, td, th {
            color: #1B1B2F !important;
            font-weight: 500;
        }
        
        /* Ensure all text elements are dark */
        .stMarkdown, .stText {
            color: #1B1B2F !important;
        }
        
        /* Table text - DARK on light background */
        .dataframe, .dataframe td, .dataframe th {
            color: #1B1B2F !important;
            background: rgba(255, 255, 255, 0.85) !important;
            border: 1px solid rgba(136, 170, 255, 0.3) !important;
        }
        
        .dataframe th {
            background: rgba(200, 220, 255, 0.6) !important;
            font-weight: 700 !important;
        }
        
        /* Sidebar text - BLACK text for visibility on light background */
        [data-testid="stSidebar"] p, 
        [data-testid="stSidebar"] span,
        [data-testid="stSidebar"] label,
        [data-testid="stSidebar"] div {
            color: #000000 !important;
            background: transparent !important;
            font-weight: 600 !important;
        }
        
        /* Sidebar dropdown/selectbox - BLACK text */
        [data-testid="stSidebar"] .stSelectbox label,
        [data-testid="stSidebar"] .stSelectbox div[data-baseweb="select"] {
            color: #000000 !important;
            background: transparent !important;
            font-weight: 700 !important;
            font-size: 16px !important;
        }
        
        /* Sidebar selectbox selected value - make it dark and visible */
        [data-testid="stSidebar"] [data-baseweb="select"] > div {
            color: #000000 !important;
            background: rgba(255, 255, 255, 0.95) !important;
            font-weight: 600 !important;
        }
        
        /* Sidebar selectbox - the actual input field */
        [data-testid="stSidebar"] select {
            color: #000000 !important;
            background: rgba(255, 255, 255, 0.95) !important;
            font-weight: 600 !important;
            font-size: 15px !important;
        }
        
        /* Streamlit dropdown popover - renders OUTSIDE sidebar in root DOM */
        div[data-baseweb="popover"] {
            background: #ffffff !important;
            border: 2px solid rgba(102, 126, 234, 0.5) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }
        
        /* Dropdown menu items - CRITICAL for visibility */
        div[data-baseweb="popover"] ul[role="listbox"] div[data-baseweb="option"] {
            color: #1B1B2F !important;
            background: #ffffff !important;
            font-weight: 600 !important;
            font-size: 15px !important;
            padding: 10px 15px !important;
        }
        
        /* Dropdown menu item text - ALL text elements */
        div[data-baseweb="popover"] ul[role="listbox"] div[data-baseweb="option"] span,
        div[data-baseweb="popover"] ul[role="listbox"] div[data-baseweb="option"] div,
        div[data-baseweb="popover"] ul[role="listbox"] div[data-baseweb="option"] p {
            color: #1B1B2F !important;
            font-weight: 600 !important;
        }
        
        /* Dropdown menu item hover */
        div[data-baseweb="popover"] ul[role="listbox"] div[data-baseweb="option"]:hover {
            color: #1B1B2F !important;
            background: rgba(200, 230, 255, 0.8) !important;
        }
        
        /* Force ALL dropdown list text to be visible */
        div[data-baseweb="popover"] * {
            color: #1B1B2F !important;
        }
        
        /* Sidebar selectbox options in dropdown - DARK text on light background */
        [data-testid="stSidebar"] option {
            color: #000000 !important;
            background: #f0f4f8 !important;
            font-weight: 600 !important;
            font-size: 14px !important;
        }
        
        /* When hovering over dropdown options */
        [data-testid="stSidebar"] option:hover {
            color: #000000 !important;
            background: #d0e0f0 !important;
        }
        
        /* Code blocks - light background */
        code {
            background: rgba(240, 245, 255, 0.9) !important;
            color: #2a3f5f !important;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid rgba(136, 170, 255, 0.3);
        }
        
        /* Link colors - readable on light background */
        a {
            color: #4a6fdd !important;
            font-weight: 600;
        }
        
        a:hover {
            color: #667eea !important;
        }
        
        /* Sidebar with WAVE SPECTRUM colors - electromagnetic spectrum gradient */
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, 
                rgba(255, 200, 200, 0.85),  /* Red (long wavelength) */
                rgba(255, 220, 180, 0.85),  /* Orange */
                rgba(255, 255, 200, 0.85),  /* Yellow */
                rgba(200, 255, 200, 0.85),  /* Green */
                rgba(200, 240, 255, 0.85),  /* Cyan */
                rgba(200, 200, 255, 0.85),  /* Blue */
                rgba(230, 200, 255, 0.85)   /* Violet (short wavelength) */
            ) !important;
            border-right: 4px solid rgba(136, 170, 255, 0.9);
            box-shadow: 5px 0 50px rgba(136, 170, 255, 0.8), 
                        inset -2px 0 20px rgba(255, 255, 255, 0.3);
        }
        
        [data-testid="stSidebar"] h1 {
            color: #1e3a5f !important;
            text-shadow: 0 0 5px rgba(136, 170, 255, 0.5) !important;
            font-size: 32px !important;
            font-weight: 700 !important;
        }
        
        /* Make "Civilization Operating System" text dark and visible */
        [data-testid="stSidebar"] .stMarkdown p {
            color: #1e3a5f !important;
            font-weight: 700 !important;
            font-size: 15px !important;
            background: transparent !important;
        }
        
        /* Sidebar captions at bottom */
        [data-testid="stSidebar"] .stCaption {
            color: #2a5f8e !important;
            font-weight: 600 !important;
        }
        
        /* Enhanced buttons with spectrum gradient */
        .stButton > button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 12px !important;
            padding: 12px 24px !important;
            font-weight: 700 !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4) !important;
            position: relative;
            overflow: hidden;
        }
        
        .stButton > button:before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .stButton > button:hover:before {
            width: 300px;
            height: 300px;
        }
        
        .stButton > button:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6), 0 0 40px rgba(118, 75, 162, 0.4) !important;
        }
        
        .stButton > button:active {
            transform: translateY(-1px) !important;
        }
        
        /* Animated selectbox */
        .stSelectbox > div > div {
            background: rgba(15, 52, 96, 0.6) !important;
            border: 2px solid rgba(102, 126, 234, 0.4) !important;
            border-radius: 10px !important;
            transition: all 0.3s ease !important;
        }
        
        .stSelectbox > div > div:hover {
            border-color: rgba(102, 126, 234, 0.8) !important;
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3) !important;
        }
        
        /* Light metric cards with spectrum border */
        [data-testid="metric-container"] {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 2px solid rgba(136, 170, 255, 0.5);
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        [data-testid="metric-container"]:hover {
            transform: translateY(-5px) scale(1.02);
            border-color: rgba(102, 126, 234, 0.6);
        }
        
        /* Enhanced tabs with light spectrum styling */
        .stTabs [data-baseweb="tab-list"] {
            gap: 8px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 12px;
            padding: 8px;
            border: 1px solid rgba(136, 170, 255, 0.3);
        }
        
        .stTabs [data-baseweb="tab"] {
            background: transparent;
            border-radius: 8px;
            color: #4a6f8f !important;
            transition: all 0.3s ease;
            border: 1px solid transparent;
            font-weight: 600;
        }
        
        .stTabs [data-baseweb="tab"]:hover {
            background: rgba(200, 220, 255, 0.5);
            color: #2a3f5f !important;
            border-color: rgba(102, 126, 234, 0.4);
        }
        
        .stTabs [data-baseweb="tab"][aria-selected="true"] {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
            color: #1B1B2F !important;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
            border: 2px solid rgba(102, 126, 234, 0.4);
        }
        
        /* Text input - light styling */
        .stTextInput > div > div > input {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 2px solid rgba(102, 126, 234, 0.3) !important;
            color: #1B1B2F !important;
            border-radius: 10px !important;
            transition: all 0.3s ease !important;
            font-weight: 500;
        }
        
        .stTextInput > div > div > input:focus {
            border-color: rgba(102, 126, 234, 0.8) !important;
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.4) !important;
        }
        
        /* Expander with glow */
        .streamlit-expanderHeader {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
            border-radius: 10px;
            border: 1px solid rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
        }
        
        .streamlit-expanderHeader:hover {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.25), rgba(118, 75, 162, 0.25));
            box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
        }
        
        /* Dataframe quantum styling */
        .stDataFrame {
            border: 2px solid rgba(102, 126, 234, 0.3);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
        }
        
        /* Headers with spectrum accent colors - READABLE */
        h1 {
            color: #2a3f5f !important;
            text-shadow: 2px 2px 4px rgba(136, 170, 255, 0.3);
            font-weight: 700 !important;
        }
        
        h2 {
            color: #3a5f7f !important;
            font-weight: 600 !important;
        }
        
        h3 {
            color: #4a6f8f !important;
            font-weight: 600 !important;
        }
        
        /* Divider with quantum glow */
        hr {
            border: none;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.6), transparent);
            margin: 20px 0;
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.4);
        }
        
        /* Success/Info boxes - light styling */
        .stAlert {
            border-radius: 12px;
            border-left: 4px solid rgba(102, 126, 234, 0.8);
            background: rgba(240, 250, 255, 0.9) !important;
            color: #1B1B2F !important;
        }
        
        /* Quantum particles decoration (subtle) */
        .stApp::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 20% 50%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(118, 75, 162, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 20%, rgba(102, 126, 234, 0.08) 0%, transparent 50%);
            pointer-events: none;
            animation: particleFloat 10s ease-in-out infinite;
        }
        
        /* Scrollbar quantum styling */
        ::-webkit-scrollbar {
            width: 12px;
        }
        
        ::-webkit-scrollbar-track {
            background: rgba(26, 26, 46, 0.5);
        }
        
        ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 6px;
            box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
        }
        
        ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #764ba2, #667eea);
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Handle navigation requests from other modules (before widget instantiation)
    if "nav_request" in st.session_state and st.session_state.nav_request:
        # Set the module_selector value BEFORE the widget is created
        st.session_state.module_selector = st.session_state.nav_request
        st.session_state.nav_request = None  # Clear the request
    
    # Sidebar - Module Selector
    with st.sidebar:
        st.title("🌍 NexusOS")
        st.markdown("**Civilization Operating System**")
        st.divider()
        
        # Module selector - clean and simple
        module = st.selectbox(
            "**Select Dashboard**",
            [
                "🏠 Home",
                "📱 Mobile Blockchain Hub",
                "💫 Economic Loop Dashboard",
                "⚛️ Avogadro Economics",
                "🌍 Civilization Dashboard",
                "💎 Web3 Wallet",
                "📡 WNSP Protocol v2.0",
                "🚀 WNSP Protocol v3.0",
                "💬 Mobile DAG Messaging",
                "🔗 Blockchain Explorer",
                "🔍 Transaction Search Explorer",
                "🚀 Napp Deployment Center",
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
                "🛡️ Sybil Detection System",
                "⚖️ AI Arbitration & Moderation",
                "🔒 Security Command Center",
                "🌊 WaveLang Studio",
                "🤖 WaveLang AI Teacher",
                "💻 WaveLang Binary Compiler",
                "⚛️ Quantum Analyzer",
                "🚀 Resonance Propulsion"
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
            "💫 Economic Loop Dashboard": {
                "icon": "💫",
                "desc": "Complete economic cycle: Messaging→Reserve→DEX→Supply Chain→Community→F_floor",
                "features": ["📨 Messaging Burns", "⚛️ Orbital Transitions", "💧 DEX Liquidity", "🏭 Supply Chain Value", "🤝 Community Ownership", "🛡️ Crisis Protection"]
            },
            "⚛️ Avogadro Economics": {
                "icon": "⚛️",
                "desc": "Statistical mechanics applied to civilization economics - bridge quantum to macroscopic scale",
                "features": ["📐 Molar Metrics (N_A)", "🌡️ Economic Temperature & Entropy", "📊 Boltzmann Wealth Distribution", "⚖️ Chemical Equilibrium", "💨 Ideal Gas Law (PV=nRT)", "🔄 Phase Transitions"]
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
            "🚀 WNSP Protocol v3.0": {
                "icon": "🚀",
                "desc": "WNSP v3.0 Architecture - Hardware abstraction roadmap for deployment on current devices",
                "features": ["🔧 Hardware Abstraction Design", "⚡ Binary Encoding Architecture", "📱 Validation Tier Concept", "🌍 LoRa Range Planning", "⚛️ Economics Model", "📋 Deployment Roadmap"]
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
            "🔍 Transaction Search Explorer": {
                "icon": "🔍",
                "desc": "Search addresses and transactions with physics metrics - READ ONLY, safe to use",
                "features": ["🔍 Address Search", "📊 Transaction Lookup", "💬 Message History", "🌐 Network Stats", "⚛️ E=hf Energy Metrics", "🌊 Wavelength Proofs", "✅ Quantum Security Validation"]
            },
            "🚀 Napp Deployment Center": {
                "icon": "🚀",
                "desc": "Deploy NexusOS Apps (Napps) with physics-based smart contracts - not Dapps!",
                "features": ["🛠️ Smart Contract Generator", "🔗 Napp Explorer", "🚀 Deployment Manager", "📚 Pre-built Templates", "⚛️ E=hf Validation", "🌊 Maxwell Compliance"]
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
            },
            "🛡️ Sybil Detection System": {
                "icon": "🛡️",
                "desc": "Multi-dimensional cluster analysis to detect coordinated validator attacks using 7 detection vectors",
                "features": ["Temporal Clustering", "Behavioral Analysis", "Economic Tracing", "Network Topology", "Spectral Coordination", "Device Fingerprinting", "Auto-Penalty System"]
            },
            "⚖️ AI Arbitration & Moderation": {
                "icon": "⚖️",
                "desc": "AI-powered dispute resolution and conflict mediation system with evidence-based decision making",
                "features": ["Penalty Appeals", "Governance Mediation", "Validator Conflicts", "Evidence Analysis", "Confidence Scoring", "Transparent Reasoning"]
            },
            "🔒 Security Command Center": {
                "icon": "🔒",
                "desc": "Comprehensive security framework protecting against 8 major attack vectors",
                "features": ["🚦 Rate Limiting", "💱 DEX MEV Protection", "📊 Multi-Oracle", "🗳️ Quadratic Voting", "🤖 AI Anomaly Detection", "💧 Liquidity Time-Locks", "🛡️ Collusion Detection", "📈 Security Analytics"]
            },
            "🚀 Resonance Propulsion": {
                "icon": "🚀",
                "desc": "Electromagnetic resonance propulsion research based on Lambda Boson substrate (Λ = hf/c²)",
                "features": ["⚛️ Lambda Boson Calculations", "📐 Cavity Geometry Design", "🔬 Thrust Simulation", "📊 WNSP Spectral Analysis", "📈 Propulsion Comparison", "🧪 Research Platform"]
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
    # Show visual dashboard grid if no module selected or on home
    if not module or module == "🏠 Home":
        st.title("🌍 NexusOS Civilization Operating System")
        st.markdown("### Select a Dashboard")
        
        # Create visual dashboard cards
        dashboards = [
            {"name": "📱 Mobile Blockchain Hub", "desc": "All-in-one mobile blockchain interface", "color": "#88aaff"},
            {"name": "💱 DEX (Token Exchange)", "desc": "Decentralized token exchange & liquidity", "color": "#aa88ff"},
            {"name": "🏛️ Validator Economics", "desc": "Staking, delegation & validator rewards", "color": "#88ddff"},
            {"name": "💵 Wavelength Economics", "desc": "Physics-based validation economics", "color": "#ff88dd"},
            {"name": "💬 Mobile DAG Messaging", "desc": "Blockchain messaging with E=hf pricing", "color": "#ddff88"},
            {"name": "🔗 Blockchain Explorer", "desc": "Real-time block & transaction explorer", "color": "#88ffaa"},
            {"name": "💎 Web3 Wallet", "desc": "Quantum-resistant NXT wallet", "color": "#ffaa88"},
            {"name": "⚡ GhostDAG System", "desc": "Parallel block processing DAG", "color": "#aa88dd"},
            {"name": "🌈 Proof of Spectrum", "desc": "Wavelength-based consensus", "color": "#88aadd"},
            {"name": "⚙️ Nexus Consensus", "desc": "Unified consensus engine", "color": "#ddaa88"},
            {"name": "🌍 Civilization Dashboard", "desc": "Complete civilization architecture", "color": "#88ddaa"},
            {"name": "💫 Economic Loop Dashboard", "desc": "Full economic cycle visualization", "color": "#dd88ff"}
        ]
        
        # Display in 3-column grid
        cols = st.columns(3)
        for idx, dashboard in enumerate(dashboards):
            with cols[idx % 3]:
                if st.button(
                    f"{dashboard['name']}\n\n{dashboard['desc']}", 
                    key=f"btn_{idx}",
                    width="stretch"
                ):
                    st.session_state.nav_request = dashboard['name']
                    st.rerun()
        
        st.divider()
        st.markdown("### 📚 More Dashboards")
        
        # Additional dashboards in expandable section
        with st.expander("🔧 System & Advanced Dashboards"):
            more_cols = st.columns(3)
            more_dashboards = [
                "📡 WNSP Protocol v2.0",
                "🚀 WNSP Protocol v3.0",
                "🔍 Transaction Search Explorer",
                "🚀 Napp Deployment Center",
                "💰 Payment Layer",
                "📱 Mobile Connectivity",
                "📊 Long-term Supply",
                "🤖 AI Management Control",
                "💬 Talk to Nexus AI",
                "🌐 Offline Mesh Network",
                "🏛️ Civic Governance",
                "🛡️ Sybil Detection System",
                "🔒 Security Command Center",
                "⚛️ Avogadro Economics",
                "🌊 WaveLang Studio",
                "🤖 WaveLang AI Teacher",
                "💻 WaveLang Binary Compiler",
                "⚛️ Quantum Analyzer"
            ]
            
            for idx, dash_name in enumerate(more_dashboards):
                with more_cols[idx % 3]:
                    if st.button(dash_name, key=f"more_btn_{idx}", width="stretch"):
                        st.session_state.nav_request = dash_name
                        st.rerun()
    
    elif module == "📱 Mobile Blockchain Hub":
        # Mobile blockchain hub v2 - redesigned mobile-first interface
        render_mobile_hub()
    
    elif module == "💫 Economic Loop Dashboard":
        # Economic loop system
        render_economic_loop_dashboard()
    
    elif module == "⚛️ Avogadro Economics":
        # Avogadro statistical mechanics economics
        avogadro_economics_main()
    
    elif module == "🌍 Civilization Dashboard":
        # Full civilization dashboard with 7 tabs
        civilization_main()
    
    elif module == "💎 Web3 Wallet":
        # Native wallet interface
        render_web3_wallet_dashboard()
    
    elif module == "📡 WNSP Protocol v2.0":
        # WNSP protocol dashboard
        render_wnsp_v2_dashboard()
    
    elif module == "🚀 WNSP Protocol v3.0":
        # WNSP v3.0 - Hardware Abstraction + Adaptive Encoding
        render_wnsp_v3_dashboard()
    
    elif module == "💬 Mobile DAG Messaging":
        # Mobile blockchain messaging
        render_mobile_dag_messaging()
    
    elif module == "🔗 Blockchain Explorer":
        # Blockchain visualization
        render_blockchain_dashboard()
    
    elif module == "🔍 Transaction Search Explorer":
        # Transaction and address search (READ-ONLY)
        render_transaction_search_explorer()
    
    elif module == "🚀 Napp Deployment Center":
        # Napp deployment center - smart contract generator + explorer
        render_napp_deployment_center()
    
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
    
    elif module == "🛡️ Sybil Detection System":
        # Multi-dimensional Sybil attack detection
        render_sybil_detection_dashboard()
    
    elif module == "⚖️ AI Arbitration & Moderation":
        # AI-powered dispute resolution and moderation
        render_arbitration_dashboard()
    
    elif module == "🔒 Security Command Center":
        # Comprehensive security monitoring and protection
        security_dashboard()
    
    elif module == "🚀 Resonance Propulsion":
        # Electromagnetic resonance propulsion research
        from resonance_propulsion import ResonancePropulsionSimulator, ResonantCavity, LambdaBosonField
        import numpy as np
        
        st.title("🚀 Resonance Propulsion Research")
        st.markdown("### Lambda Boson Substrate: Λ = hf/c²")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Cavity Design")
            large_dia = st.slider("Large End (cm)", 10.0, 50.0, 28.0) / 100
            small_dia = st.slider("Small End (cm)", 5.0, 30.0, 15.0) / 100
            length = st.slider("Length (cm)", 10.0, 50.0, 22.0) / 100
            
        with col2:
            st.subheader("RF Parameters")
            freq_ghz = st.slider("Frequency (GHz)", 1.0, 10.0, 2.45)
            power = st.slider("Power (Watts)", 10, 5000, 1000)
        
        cavity = ResonantCavity(large_dia, small_dia, length)
        field = LambdaBosonField(freq_ghz * 1e9, power)
        sim = ResonancePropulsionSimulator(cavity, field)
        
        thrust = sim.calculate_theoretical_thrust()
        spectral = sim.calculate_wnsp_spectral_bands()
        
        st.divider()
        
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Lambda Boson Mass", f"{spectral['lambda_boson_mass_kg']:.2e} kg")
        m2.metric("WNSP Band", spectral['wnsp_band'])
        m3.metric("Q-Enhanced Thrust", f"{thrust['q_enhanced_thrust_n']*1e6:.4f} µN")
        m4.metric("Thrust/Power", f"{thrust['thrust_per_watt']*1e6:.6f} µN/W")
        
        st.info("**Λ = hf/c²** - Oscillation IS mass. This module simulates electromagnetic propulsion based on Lambda Boson physics.")


if __name__ == "__main__":
    main()
