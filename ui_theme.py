"""
NexusOS UI Theme System
=======================

Centralized design system with:
- Responsive breakpoints (320px, 375px, 414px, 768px, 1024px+)
- Scoped CSS with minimal conflicts
- Dark gradient theme with physics-inspired accents
- Mobile-first responsive utilities
"""

import streamlit as st
from typing import Literal, Optional
from dataclasses import dataclass


@dataclass
class Breakpoints:
    """Responsive breakpoints for mobile-first design"""
    XS = 320   # Small phones (iPhone SE)
    SM = 375   # Standard phones (iPhone X)
    MD = 414   # Large phones (iPhone Plus)
    LG = 768   # Tablets
    XL = 1024  # Desktop
    XXL = 1280 # Large desktop


@dataclass
class Colors:
    """NexusOS color palette - physics-inspired dark theme"""
    # Primary gradients
    PRIMARY_START = "#667eea"
    PRIMARY_END = "#764ba2"
    
    # Accent colors
    ACCENT_CYAN = "#00d4ff"
    ACCENT_GREEN = "#10b981"
    ACCENT_AMBER = "#f59e0b"
    ACCENT_RED = "#ef4444"
    
    # Background layers
    BG_DARK = "#0a0a1a"
    BG_CARD = "#12122a"
    BG_ELEVATED = "#1a1a3a"
    
    # Text colors
    TEXT_PRIMARY = "#ffffff"
    TEXT_SECONDARY = "#94a3b8"
    TEXT_MUTED = "#64748b"
    
    # Physics-themed colors
    QUANTUM_VIOLET = "#8b5cf6"
    WAVELENGTH_BLUE = "#3b82f6"
    ENERGY_GOLD = "#fbbf24"


def get_responsive_css() -> str:
    """Generate mobile-first responsive CSS with proper viewport handling"""
    return """
    <style>
    /* ========================================
       NEXUSOS RESPONSIVE DESIGN SYSTEM
       Mobile-first, physics-inspired theme
       ======================================== */
    
    /* Root Variables */
    :root {
        --primary-start: #667eea;
        --primary-end: #764ba2;
        --accent-cyan: #00d4ff;
        --accent-green: #10b981;
        --accent-amber: #f59e0b;
        --accent-red: #ef4444;
        --bg-dark: #0a0a1a;
        --bg-card: #12122a;
        --bg-elevated: #1a1a3a;
        --text-primary: #ffffff;
        --text-secondary: #94a3b8;
        --quantum-violet: #8b5cf6;
        --wavelength-blue: #3b82f6;
        --energy-gold: #fbbf24;
        --border-radius: 16px;
        --spacing-xs: 8px;
        --spacing-sm: 12px;
        --spacing-md: 16px;
        --spacing-lg: 24px;
        --spacing-xl: 32px;
    }
    
    /* Base Reset */
    .stApp {
        background: linear-gradient(180deg, var(--bg-dark) 0%, #0f0f2a 100%) !important;
    }
    
    /* Hide Streamlit defaults for clean look */
    #MainMenu, footer, header {
        visibility: hidden !important;
    }
    
    .stDeployButton {
        display: none !important;
    }
    
    /* Main container - prevent horizontal scroll */
    .main .block-container {
        max-width: 100% !important;
        padding: var(--spacing-md) !important;
        overflow-x: hidden !important;
    }
    
    /* ========================================
       TYPOGRAPHY
       ======================================== */
    
    .nexus-title {
        font-size: clamp(1.5rem, 5vw, 2.5rem);
        font-weight: 700;
        background: linear-gradient(135deg, var(--accent-cyan), var(--quantum-violet));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
        line-height: 1.2;
    }
    
    .nexus-subtitle {
        font-size: clamp(0.875rem, 3vw, 1rem);
        color: var(--text-secondary);
        margin: var(--spacing-xs) 0 0 0;
    }
    
    .nexus-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-secondary);
    }
    
    .nexus-value {
        font-size: clamp(1.25rem, 4vw, 1.75rem);
        font-weight: 700;
        color: var(--text-primary);
    }
    
    .nexus-value-highlight {
        color: var(--accent-green);
    }
    
    /* ========================================
       CARD COMPONENTS
       ======================================== */
    
    .nexus-card {
        background: linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%);
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: var(--border-radius);
        padding: var(--spacing-lg);
        margin-bottom: var(--spacing-md);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
    }
    
    .nexus-card:hover {
        border-color: rgba(102, 126, 234, 0.4);
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(102, 126, 234, 0.15);
    }
    
    .nexus-card-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
    }
    
    .nexus-card-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        background: linear-gradient(135deg, var(--primary-start), var(--primary-end));
    }
    
    .nexus-card-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }
    
    /* Hero Balance Card */
    .nexus-hero-card {
        background: linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%);
        border: none;
        border-radius: 24px;
        padding: var(--spacing-xl);
        text-align: center;
        position: relative;
        overflow: hidden;
    }
    
    .nexus-hero-card::before {
        content: "";
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
        animation: shimmer 3s infinite linear;
    }
    
    @keyframes shimmer {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .nexus-balance {
        font-size: clamp(2rem, 8vw, 3.5rem);
        font-weight: 800;
        color: white;
        margin: var(--spacing-md) 0;
        position: relative;
        z-index: 1;
    }
    
    .nexus-balance-label {
        font-size: 0.875rem;
        color: rgba(255,255,255,0.8);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        position: relative;
        z-index: 1;
    }
    
    /* Quick Action Buttons */
    .nexus-action-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: var(--spacing-sm);
        margin: var(--spacing-lg) 0;
    }
    
    @media (max-width: 414px) {
        .nexus-action-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    
    .nexus-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-md);
        background: var(--bg-card);
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
    }
    
    .nexus-action-btn:hover {
        background: var(--bg-elevated);
        border-color: var(--accent-cyan);
        transform: translateY(-2px);
    }
    
    .nexus-action-btn:active {
        transform: scale(0.96);
    }
    
    .nexus-action-icon {
        font-size: 1.5rem;
        margin-bottom: var(--spacing-xs);
    }
    
    .nexus-action-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
    }
    
    /* ========================================
       PHYSICS METRICS DISPLAY
       ======================================== */
    
    .nexus-physics-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--spacing-sm);
    }
    
    @media (max-width: 375px) {
        .nexus-physics-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    
    .nexus-metric {
        background: var(--bg-card);
        border: 1px solid rgba(102, 126, 234, 0.15);
        border-radius: 12px;
        padding: var(--spacing-md);
        text-align: center;
    }
    
    .nexus-metric-value {
        font-size: clamp(1rem, 3vw, 1.25rem);
        font-weight: 700;
        color: var(--accent-cyan);
    }
    
    .nexus-metric-label {
        font-size: 0.625rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 4px;
    }
    
    /* BHLS Floor Indicator */
    .nexus-floor-status {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
        border: 1px solid var(--accent-green);
        border-radius: 12px;
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
    }
    
    .nexus-floor-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--accent-green);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
    }
    
    .nexus-floor-text {
        flex: 1;
    }
    
    .nexus-floor-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--accent-green);
    }
    
    .nexus-floor-value {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }
    
    /* ========================================
       NAVIGATION SYSTEM
       ======================================== */
    
    /* Bottom Navigation (Mobile) */
    .nexus-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(180deg, rgba(10, 10, 26, 0.95), rgba(10, 10, 26, 0.98));
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(102, 126, 234, 0.2);
        display: flex;
        justify-content: space-around;
        padding: var(--spacing-sm) 0;
        padding-bottom: calc(var(--spacing-sm) + env(safe-area-inset-bottom, 0px));
        z-index: 1000;
    }
    
    .nexus-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--spacing-xs) var(--spacing-md);
        color: var(--text-muted);
        text-decoration: none;
        transition: all 0.2s ease;
        border-radius: 12px;
    }
    
    .nexus-nav-item.active {
        color: var(--accent-cyan);
    }
    
    .nexus-nav-item:hover {
        background: rgba(102, 126, 234, 0.1);
    }
    
    .nexus-nav-icon {
        font-size: 1.25rem;
        margin-bottom: 2px;
    }
    
    .nexus-nav-label {
        font-size: 0.625rem;
        font-weight: 500;
    }
    
    /* Hide bottom nav on desktop */
    @media (min-width: 768px) {
        .nexus-bottom-nav {
            display: none;
        }
    }
    
    /* Top Navigation (Desktop) */
    .nexus-top-nav {
        display: none;
        background: rgba(10, 10, 26, 0.95);
        backdrop-filter: blur(20px);
        padding: var(--spacing-md) var(--spacing-xl);
        border-bottom: 1px solid rgba(102, 126, 234, 0.2);
        position: sticky;
        top: 0;
        z-index: 1000;
    }
    
    @media (min-width: 768px) {
        .nexus-top-nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
    }
    
    .nexus-top-nav-links {
        display: flex;
        gap: var(--spacing-lg);
    }
    
    .nexus-top-nav-link {
        color: var(--text-secondary);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: 8px;
        transition: all 0.2s ease;
    }
    
    .nexus-top-nav-link:hover,
    .nexus-top-nav-link.active {
        color: var(--accent-cyan);
        background: rgba(0, 212, 255, 0.1);
    }
    
    /* ========================================
       FEATURE DISCOVERY ACCORDIONS
       ======================================== */
    
    .nexus-accordion {
        background: var(--bg-card);
        border: 1px solid rgba(102, 126, 234, 0.15);
        border-radius: 16px;
        margin-bottom: var(--spacing-md);
        overflow: hidden;
    }
    
    .nexus-accordion-header {
        display: flex;
        align-items: center;
        padding: var(--spacing-lg);
        cursor: pointer;
        transition: background 0.2s ease;
    }
    
    .nexus-accordion-header:hover {
        background: rgba(102, 126, 234, 0.05);
    }
    
    .nexus-accordion-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        margin-right: var(--spacing-md);
        background: linear-gradient(135deg, var(--primary-start), var(--primary-end));
    }
    
    .nexus-accordion-content {
        flex: 1;
    }
    
    .nexus-accordion-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 4px 0;
    }
    
    .nexus-accordion-desc {
        font-size: 0.8125rem;
        color: var(--text-secondary);
        margin: 0;
    }
    
    .nexus-accordion-arrow {
        font-size: 1.25rem;
        color: var(--text-muted);
        transition: transform 0.3s ease;
    }
    
    .nexus-accordion.open .nexus-accordion-arrow {
        transform: rotate(180deg);
    }
    
    .nexus-accordion-body {
        padding: 0 var(--spacing-lg) var(--spacing-lg);
        border-top: 1px solid rgba(102, 126, 234, 0.1);
    }
    
    /* ========================================
       FORM ELEMENTS
       ======================================== */
    
    /* Streamlit overrides for inputs */
    .stApp input[type="text"],
    .stApp input[type="number"],
    .stApp input[type="password"],
    .stApp textarea {
        background: var(--bg-elevated) !important;
        border: 2px solid rgba(102, 126, 234, 0.3) !important;
        border-radius: 12px !important;
        color: var(--text-primary) !important;
        padding: var(--spacing-md) !important;
        font-size: 16px !important;
        transition: all 0.2s ease !important;
    }
    
    .stApp input:focus,
    .stApp textarea:focus {
        border-color: var(--accent-cyan) !important;
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.15) !important;
        outline: none !important;
    }
    
    .stApp input::placeholder {
        color: var(--text-muted) !important;
    }
    
    /* Buttons */
    .stApp .stButton > button {
        background: linear-gradient(135deg, var(--primary-start), var(--primary-end)) !important;
        border: none !important;
        border-radius: 12px !important;
        color: white !important;
        font-weight: 600 !important;
        padding: var(--spacing-md) var(--spacing-xl) !important;
        font-size: 1rem !important;
        min-height: 48px !important;
        transition: all 0.2s ease !important;
        width: 100% !important;
    }
    
    .stApp .stButton > button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.35) !important;
    }
    
    .stApp .stButton > button:active {
        transform: scale(0.98) !important;
    }
    
    /* Secondary button style */
    .stApp .stButton.secondary > button {
        background: transparent !important;
        border: 2px solid var(--primary-start) !important;
        color: var(--primary-start) !important;
    }
    
    /* ========================================
       RESPONSIVE ADJUSTMENTS
       ======================================== */
    
    /* Extra small devices (320px) */
    @media (max-width: 320px) {
        .main .block-container {
            padding: var(--spacing-xs) !important;
        }
        
        .nexus-hero-card {
            padding: var(--spacing-lg);
            border-radius: 16px;
        }
        
        .nexus-balance {
            font-size: 1.75rem;
        }
        
        .nexus-card {
            padding: var(--spacing-md);
        }
    }
    
    /* Small devices (375px) */
    @media (min-width: 321px) and (max-width: 375px) {
        .main .block-container {
            padding: var(--spacing-sm) !important;
        }
    }
    
    /* Medium devices (414px) */
    @media (min-width: 376px) and (max-width: 414px) {
        .main .block-container {
            padding: var(--spacing-md) !important;
        }
    }
    
    /* Tablets (768px) */
    @media (min-width: 768px) {
        .main .block-container {
            max-width: 720px !important;
            margin: 0 auto !important;
            padding: var(--spacing-xl) !important;
        }
        
        .nexus-physics-grid {
            grid-template-columns: repeat(4, 1fr);
        }
    }
    
    /* Desktop (1024px+) */
    @media (min-width: 1024px) {
        .main .block-container {
            max-width: 960px !important;
        }
        
        .nexus-hero-card {
            padding: var(--spacing-xl) 60px;
        }
    }
    
    /* Safe area for notched phones */
    @supports (padding: max(0px)) {
        .main .block-container {
            padding-left: max(var(--spacing-md), env(safe-area-inset-left)) !important;
            padding-right: max(var(--spacing-md), env(safe-area-inset-right)) !important;
            padding-bottom: max(var(--spacing-xl), calc(80px + env(safe-area-inset-bottom))) !important;
        }
    }
    
    /* ========================================
       STREAMLIT COMPONENT OVERRIDES
       ======================================== */
    
    /* Metrics */
    .stApp [data-testid="stMetricValue"] {
        color: var(--accent-cyan) !important;
        font-size: clamp(1.25rem, 4vw, 1.75rem) !important;
    }
    
    .stApp [data-testid="stMetricLabel"] {
        color: var(--text-secondary) !important;
        font-size: 0.75rem !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }
    
    /* Expander */
    .stApp .streamlit-expanderHeader {
        background: var(--bg-card) !important;
        border: 1px solid rgba(102, 126, 234, 0.2) !important;
        border-radius: 12px !important;
        color: var(--text-primary) !important;
        font-weight: 600 !important;
    }
    
    .stApp .streamlit-expanderContent {
        background: var(--bg-elevated) !important;
        border: 1px solid rgba(102, 126, 234, 0.15) !important;
        border-top: none !important;
        border-radius: 0 0 12px 12px !important;
    }
    
    /* Tabs - minimal styling */
    .stApp [data-baseweb="tab-list"] {
        gap: 4px !important;
        background: var(--bg-card) !important;
        padding: 4px !important;
        border-radius: 12px !important;
        overflow-x: auto !important;
    }
    
    .stApp button[data-baseweb="tab"] {
        background: transparent !important;
        border: none !important;
        border-radius: 8px !important;
        color: var(--text-secondary) !important;
        font-size: 0.875rem !important;
        padding: 10px 16px !important;
        white-space: nowrap !important;
    }
    
    .stApp button[data-baseweb="tab"][aria-selected="true"] {
        background: linear-gradient(135deg, var(--primary-start), var(--primary-end)) !important;
        color: white !important;
    }
    
    .stApp [data-baseweb="tab-highlight"],
    .stApp [data-baseweb="tab-border"] {
        display: none !important;
    }
    
    /* Alerts */
    .stApp [data-testid="stAlert"] {
        border-radius: 12px !important;
        border: none !important;
    }
    
    /* ============================================
       SELECTBOX/DROPDOWN - LIGHT THEME
       Matches app.py global light theme
       ============================================ */
    
    /* Selectbox control (closed state) */
    .stApp [data-baseweb="select"],
    [data-baseweb="select"] {
        background: rgba(255, 255, 255, 0.95) !important;
        border-radius: 12px !important;
    }
    
    .stApp [data-baseweb="select"] > div,
    [data-baseweb="select"] > div {
        background: rgba(255, 255, 255, 0.95) !important;
        border: 2px solid rgba(102, 126, 234, 0.3) !important;
        border-radius: 12px !important;
    }
    
    /* Selectbox selected value text - DARK on light */
    .stApp [data-baseweb="select"] span,
    [data-baseweb="select"] span {
        color: #1B1B2F !important;
        font-weight: 600 !important;
    }
    
    /* Dropdown popover container */
    .stApp [data-baseweb="popover"],
    [data-baseweb="popover"] {
        background: #ffffff !important;
        border: 2px solid rgba(102, 126, 234, 0.5) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
    }
    
    /* Dropdown menu container */
    .stApp [data-baseweb="menu"],
    [data-baseweb="menu"] {
        background: #ffffff !important;
        padding: 8px !important;
    }
    
    /* Dropdown menu list */
    .stApp [data-baseweb="menu"] ul,
    [data-baseweb="menu"] ul {
        background: #ffffff !important;
        padding: 0 !important;
    }
    
    /* Dropdown list items - DARK text on white */
    .stApp [data-baseweb="menu"] li,
    [data-baseweb="menu"] li,
    .stApp [role="option"],
    [role="option"],
    li[role="option"] {
        background: #ffffff !important;
        color: #1B1B2F !important;
        font-weight: 600 !important;
        padding: 12px 16px !important;
        border-radius: 8px !important;
        margin: 2px 4px !important;
    }
    
    /* Dropdown hover state */
    .stApp [data-baseweb="menu"] li:hover,
    [data-baseweb="menu"] li:hover,
    .stApp [role="option"]:hover,
    [role="option"]:hover {
        background: rgba(102, 126, 234, 0.15) !important;
        color: #1B1B2F !important;
    }
    
    /* Dropdown selected/highlighted item */
    .stApp [data-baseweb="menu"] li[aria-selected="true"],
    [data-baseweb="menu"] li[aria-selected="true"],
    .stApp [role="option"][aria-selected="true"],
    [role="option"][aria-selected="true"] {
        background: linear-gradient(135deg, #667eea, #764ba2) !important;
        color: #ffffff !important;
    }
    
    /* Force dropdown text visibility */
    [data-baseweb="popover"] span,
    [data-baseweb="popover"] div,
    [data-baseweb="menu"] span,
    li[role="option"] span {
        color: inherit !important;
    }
    
    /* Progress bar */
    .stApp .stProgress > div > div {
        background: linear-gradient(90deg, var(--primary-start), var(--primary-end)) !important;
        border-radius: 999px !important;
    }
    
    /* Divider */
    .stApp hr {
        border-color: rgba(102, 126, 234, 0.2) !important;
        margin: var(--spacing-lg) 0 !important;
    }
    
    </style>
    """


def inject_theme():
    """Inject the responsive theme CSS into the Streamlit app"""
    st.markdown(get_responsive_css(), unsafe_allow_html=True)


def render_hero_balance(balance: float, currency: str = "NXT", floor_status: str = "Protected") -> None:
    """Render the hero balance card with physics-inspired design"""
    st.markdown(f"""
        <div class="nexus-hero-card">
            <div class="nexus-balance-label">Total Balance</div>
            <div class="nexus-balance">{balance:,.2f} {currency}</div>
            <div class="nexus-balance-label" style="margin-top: 8px;">
                <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px;">
                    {floor_status}
                </span>
            </div>
        </div>
    """, unsafe_allow_html=True)


def render_action_grid(actions: list) -> None:
    """Render quick action button grid"""
    buttons_html = ""
    for action in actions:
        buttons_html += f"""
            <div class="nexus-action-btn" onclick="document.querySelector('[data-action=\\"{action['id']}\\"]').click()">
                <span class="nexus-action-icon">{action['icon']}</span>
                <span class="nexus-action-label">{action['label']}</span>
            </div>
        """
    
    st.markdown(f"""
        <div class="nexus-action-grid">
            {buttons_html}
        </div>
    """, unsafe_allow_html=True)


def render_physics_metrics(metrics: list) -> None:
    """Render physics metrics grid"""
    metrics_html = ""
    for metric in metrics:
        metrics_html += f"""
            <div class="nexus-metric">
                <div class="nexus-metric-value">{metric['value']}</div>
                <div class="nexus-metric-label">{metric['label']}</div>
            </div>
        """
    
    st.markdown(f"""
        <div class="nexus-physics-grid">
            {metrics_html}
        </div>
    """, unsafe_allow_html=True)


def render_floor_status(monthly_floor: float, utilization: float) -> None:
    """Render BHLS floor status indicator"""
    icon = "&#x2713;" if utilization < 80 else "&#x26A0;"
    color = "var(--accent-green)" if utilization < 80 else "var(--accent-amber)"
    
    st.markdown(f"""
        <div class="nexus-floor-status" style="border-color: {color};">
            <div class="nexus-floor-icon" style="background: {color};">{icon}</div>
            <div class="nexus-floor-text">
                <div class="nexus-floor-title" style="color: {color};">BHLS Floor Active</div>
                <div class="nexus-floor-value">{monthly_floor:,.0f} NXT/month guaranteed</div>
            </div>
        </div>
    """, unsafe_allow_html=True)


def render_card(title: str, icon: str, content: str) -> None:
    """Render a styled card component"""
    st.markdown(f"""
        <div class="nexus-card">
            <div class="nexus-card-header">
                <div class="nexus-card-icon">{icon}</div>
                <h3 class="nexus-card-title">{title}</h3>
            </div>
            <div class="nexus-card-content">
                {content}
            </div>
        </div>
    """, unsafe_allow_html=True)


def render_bottom_nav(active: str = "home") -> None:
    """Render mobile bottom navigation bar"""
    nav_items = [
        {"id": "home", "icon": "&#x1F3E0;", "label": "Home"},
        {"id": "wallet", "icon": "&#x1F4B3;", "label": "Wallet"},
        {"id": "dex", "icon": "&#x1F4B1;", "label": "Swap"},
        {"id": "govern", "icon": "&#x1F3DB;", "label": "Govern"},
        {"id": "more", "icon": "&#x2630;", "label": "More"},
    ]
    
    items_html = ""
    for item in nav_items:
        active_class = "active" if item["id"] == active else ""
        items_html += f"""
            <a href="#" class="nexus-nav-item {active_class}" data-nav="{item['id']}">
                <span class="nexus-nav-icon">{item['icon']}</span>
                <span class="nexus-nav-label">{item['label']}</span>
            </a>
        """
    
    st.markdown(f"""
        <div class="nexus-bottom-nav">
            {items_html}
        </div>
    """, unsafe_allow_html=True)


def render_section_header(title: str, subtitle: str = "") -> None:
    """Render a section header with optional subtitle"""
    st.markdown(f"""
        <div style="margin: 24px 0 16px 0;">
            <h2 class="nexus-title" style="font-size: 1.25rem;">{title}</h2>
            {f'<p class="nexus-subtitle">{subtitle}</p>' if subtitle else ''}
        </div>
    """, unsafe_allow_html=True)


def get_rarity_colors(rarity: str) -> dict:
    """Get colors for achievement rarity"""
    colors = {
        'common': {'bg': 'rgba(148, 163, 184, 0.15)', 'border': '#94a3b8', 'text': '#94a3b8'},
        'uncommon': {'bg': 'rgba(16, 185, 129, 0.15)', 'border': '#10b981', 'text': '#10b981'},
        'rare': {'bg': 'rgba(59, 130, 246, 0.15)', 'border': '#3b82f6', 'text': '#3b82f6'},
        'epic': {'bg': 'rgba(139, 92, 246, 0.15)', 'border': '#8b5cf6', 'text': '#8b5cf6'},
        'legendary': {'bg': 'rgba(251, 191, 36, 0.15)', 'border': '#fbbf24', 'text': '#fbbf24'},
    }
    return colors.get(rarity, colors['common'])


def render_achievement_badge(achievement: dict, compact: bool = False) -> None:
    """Render a single achievement badge"""
    rarity_colors = get_rarity_colors(achievement.get('rarity', 'common'))
    is_unlocked = achievement.get('is_unlocked', False)
    progress = achievement.get('progress', 0)
    
    opacity = '1' if is_unlocked else '0.5'
    icon = achievement.get('icon', '🏆')
    name = achievement.get('name', 'Achievement')
    description = achievement.get('description', '')
    xp = achievement.get('xp_reward', 0)
    
    if compact:
        st.markdown(f"""
            <div style="
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: {rarity_colors['bg']};
                border: 1px solid {rarity_colors['border']};
                border-radius: 20px;
                opacity: {opacity};
                margin: 4px;
            ">
                <span style="font-size: 1.25rem;">{icon}</span>
                <span style="color: {rarity_colors['text']}; font-size: 0.8rem; font-weight: 500;">{name}</span>
                {'<span style="color: #10b981; font-size: 0.7rem;">✓</span>' if is_unlocked else ''}
            </div>
        """, unsafe_allow_html=True)
    else:
        progress_bar = ""
        if not is_unlocked and progress > 0:
            progress_bar = f"""
                <div style="
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 2px;
                    margin-top: 8px;
                    overflow: hidden;
                ">
                    <div style="
                        width: {progress}%;
                        height: 100%;
                        background: linear-gradient(90deg, {rarity_colors['border']}, {rarity_colors['text']});
                        border-radius: 2px;
                    "></div>
                </div>
                <span style="color: #64748b; font-size: 0.65rem;">{progress:.0f}% complete</span>
            """
        
        st.markdown(f"""
            <div style="
                background: {rarity_colors['bg']};
                border: 1px solid {rarity_colors['border']};
                border-radius: 12px;
                padding: 16px;
                opacity: {opacity};
                margin-bottom: 12px;
            ">
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="
                        font-size: 2rem;
                        width: 48px;
                        height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(0,0,0,0.2);
                        border-radius: 12px;
                    ">{icon}</div>
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: white; font-weight: 600; font-size: 0.95rem;">{name}</span>
                            {'<span style="color: #10b981; font-size: 0.8rem;">✓ Unlocked</span>' if is_unlocked else ''}
                        </div>
                        <p style="color: #94a3b8; font-size: 0.8rem; margin: 4px 0;">{description}</p>
                        <span style="
                            color: {rarity_colors['text']};
                            font-size: 0.7rem;
                            text-transform: uppercase;
                            font-weight: 500;
                        ">{achievement.get('rarity', 'common')} • +{xp} XP</span>
                        {progress_bar}
                    </div>
                </div>
            </div>
        """, unsafe_allow_html=True)


def render_level_progress(level_info: dict) -> None:
    """Render user level and XP progress bar"""
    level = level_info.get('level', 1)
    xp = level_info.get('xp', 0)
    progress = level_info.get('progress', 0)
    xp_to_next = level_info.get('xp_to_next', 500)
    achievements_unlocked = level_info.get('achievements_unlocked', 0)
    
    st.markdown(f"""
        <div style="
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 20px;
        ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="
                        width: 56px;
                        height: 56px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: white;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    ">{level}</div>
                    <div>
                        <div style="color: white; font-weight: 600; font-size: 1.1rem;">Level {level}</div>
                        <div style="color: #94a3b8; font-size: 0.8rem;">{xp:,} Total XP</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #00d4ff; font-size: 1.25rem; font-weight: 600;">🏆 {achievements_unlocked}</div>
                    <div style="color: #64748b; font-size: 0.7rem;">Badges Earned</div>
                </div>
            </div>
            <div style="
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                overflow: hidden;
            ">
                <div style="
                    width: {progress}%;
                    height: 100%;
                    background: linear-gradient(90deg, #00d4ff, #8b5cf6);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                "></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <span style="color: #64748b; font-size: 0.7rem;">{xp_to_next} XP to Level {level + 1}</span>
                <span style="color: #00d4ff; font-size: 0.7rem;">{progress:.0f}%</span>
            </div>
        </div>
    """, unsafe_allow_html=True)


def render_achievement_unlock_notification(achievement: dict) -> None:
    """Render achievement unlock notification popup"""
    rarity_colors = get_rarity_colors(achievement.get('rarity', 'common'))
    
    st.markdown(f"""
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, {rarity_colors['bg']}, rgba(10, 10, 26, 0.95));
            border: 2px solid {rarity_colors['border']};
            border-radius: 16px;
            padding: 16px 24px;
            z-index: 10000;
            animation: slideDown 0.5s ease-out, fadeOut 0.5s ease-in 3s forwards;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        ">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 2rem;">{achievement.get('icon', '🏆')}</span>
                <div>
                    <div style="color: {rarity_colors['text']}; font-size: 0.7rem; text-transform: uppercase; font-weight: 600;">
                        Achievement Unlocked!
                    </div>
                    <div style="color: white; font-weight: 600; font-size: 1rem;">{achievement.get('name', 'Achievement')}</div>
                    <div style="color: #10b981; font-size: 0.8rem;">+{achievement.get('xp_reward', 0)} XP</div>
                </div>
            </div>
        </div>
        <style>
            @keyframes slideDown {{
                from {{ transform: translateX(-50%) translateY(-100px); opacity: 0; }}
                to {{ transform: translateX(-50%) translateY(0); opacity: 1; }}
            }}
            @keyframes fadeOut {{
                from {{ opacity: 1; }}
                to {{ opacity: 0; visibility: hidden; }}
            }}
        </style>
    """, unsafe_allow_html=True)
