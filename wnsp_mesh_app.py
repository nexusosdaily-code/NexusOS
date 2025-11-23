"""
WNSP Unified Mesh Stack - Standalone Application
Decentralized Knowledge Infrastructure

Run: streamlit run wnsp_mesh_app.py --server.port 5000
"""

import streamlit as st

st.set_page_config(
    page_title="WNSP Unified Mesh Stack",
    page_icon="🌐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Import after page config
from wnsp_unified_mesh_dashboard import render_wnsp_unified_mesh_dashboard

# Custom CSS for WNSP theme
st.markdown("""
    <style>
    .main {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
    }
    
    h1, h2, h3 {
        color: #00d4ff;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
    }
    
    .stMetric {
        background: rgba(255, 255, 255, 0.05);
        padding: 15px;
        border-radius: 10px;
        border: 1px solid rgba(0, 212, 255, 0.2);
    }
    
    .stButton>button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 24px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    </style>
""", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.title("🌐 WNSP Mesh")
    st.markdown("**Decentralized Knowledge Infrastructure**")
    st.divider()
    
    st.markdown("""
    ### 🎯 Mission
    Break free from centralized internet control
    
    ### 🏗️ 4-Layer Stack
    1. 📡 **Community Mesh ISP**  
       Phone-to-phone network
    
    2. 🛡️ **Censorship-Resistant**  
       Wavelength routing
    
    3. 🔐 **Privacy Messaging**  
       Quantum encryption
    
    4. 📚 **Offline Knowledge**  
       Wikipedia without internet
    
    ---
    
    ### 🚀 Use Cases
    - University campus networks
    - Refugee communication
    - Rural area connectivity
    - Crisis response networks
    - Censorship bypass
    """)
    
    st.divider()
    
    st.info("**Status:** Demo/Architecture Phase")
    
# Main content
render_wnsp_unified_mesh_dashboard()

# Footer
st.divider()
st.caption("WNSP Unified Mesh Stack - Physics-Governed Decentralized Infrastructure")
