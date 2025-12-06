"""
NexusOS Web3 Wallet Dashboard
==============================
Interactive Streamlit interface for quantum-resistant wallet.
"""

import streamlit as st
import os
from dotenv import load_dotenv

# Import existing dashboard
import sys
from pathlib import Path

# Add parent directory to path to import web3_wallet_dashboard
parent_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(parent_dir))

try:
    from web3_wallet_dashboard import render_web3_wallet_dashboard
    
    # Page config
    st.set_page_config(
        page_title="NexusOS Web3 Wallet",
        page_icon="🔐",
        layout="wide"
    )
    
    # Load environment
    load_dotenv()
    
    # Title
    st.title("🔐 NexusOS Web3 Wallet")
    st.markdown("**Quantum-Resistant Cryptocurrency Wallet**")
    st.markdown("---")
    
    # Render main dashboard
    render_web3_wallet_dashboard()
    
except ImportError as e:
    st.error(f"Failed to load wallet dashboard: {e}")
    st.info("Please ensure you're running from the correct directory")
