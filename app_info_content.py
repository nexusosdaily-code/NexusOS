"""
Informational content for NexusOS modules - How to Use guides and Documentation
"""

import streamlit as st


def render_info_tabs(module_name: str):
    """
    Render informational tabs for any module
    
    Args:
        module_name: Name of the module (e.g., 'secure_messaging', 'dashboard', 'task_orchestration')
    """
    
    info_content = {
        'secure_messaging': {
            'how_to': """
### 🚀 Quick Start Guide

**Step 1: Set Up Your Encryption Key**
1. Click the "🔑 Manage Keys" button at the top
2. Choose "Generate Random Key" for automatic secure key generation
3. **Important**: Copy and save your key somewhere safe - you'll need it to decrypt messages!

**Step 2: Compose Your Secure Email**
1. Enter the recipient's email address
2. Add a subject line (optional)
3. Type your confidential message
4. Choose your security level using the slider
5. Click "🚀 Send Encrypted Email"

**Step 3: View and Decrypt Messages**
- Sent messages appear in the "Sent Messages" panel
- Click "🔓 Decrypt" to view the original message
- Your encryption key must be active to decrypt

**Security Levels:**
- ⚡ **Fast**: Quick encryption for less sensitive data
- 🌊 **Standard**: Balanced security and speed
- 🔮 **Advanced**: Enhanced protection
- 🔐 **Maximum**: Highest security (recommended for confidential data)
""",
            'documentation': """
### 📚 What is Secure Messaging?

**Purpose:**
Secure Messaging integrates wavelength-based cryptography into NexusOS communications, enabling users to send emails, SMS, and notifications with electromagnetic theory-based encryption.

**What Problems Does It Solve?**

1. **Traditional Encryption Limitations**
   - Standard encryption uses mathematical algorithms that could be vulnerable to quantum computing
   - Our wavelength cryptography simulates electromagnetic phenomena (light behavior), providing a unique security layer

2. **Complex Encryption Made Simple**
   - Users don't need to understand electromagnetic theory
   - One-click encryption/decryption workflows
   - Automated key management options

3. **Multi-Channel Secure Communication**
   - Encrypt emails, SMS, and in-app messages with the same system
   - Unified interface for all secure communications
   - Integration with existing workflow automation

**How It Works:**

**Wavelength Cryptography** uses four methods based on real electromagnetic physics:

- **FSE (Frequency Shift Encryption)**: Simulates electron energy transitions between quantum states
- **AME (Amplitude Modulation Encryption)**: Varies photon intensity like light dimming/brightening
- **PME (Phase Modulation Encryption)**: Uses wave interference patterns
- **QIML (Quantum-Inspired Multi-Layer)**: Combines all three methods for maximum security

Based on the Planck-Einstein relation: **E = hc/λ** (Energy equals Planck's constant × speed of light ÷ wavelength)

**Use Cases:**
- Confidential business communications
- Secure project collaboration
- Sensitive data transmission
- Privacy-focused messaging
- Research collaboration requiring data confidentiality
""",
        },
        
        'task_orchestration': {
            'how_to': """
### 🚀 Getting Started with Task Orchestration

**What is Task Orchestration?**
Automate complex workflows with dependencies, priorities, and multi-step processes.

**Step 1: Choose a Workflow Template**
1. Select a domain (Core, Data Processing, or Wavelength Crypto)
2. Click on any workflow button to load a pre-built template
3. View execution results in real-time

**Step 2: Monitor Execution**
- Watch the progress in the "Execution Results" section
- See task status: Completed, Failed, or Cancelled
- Review execution times and dependencies

**Popular Workflows:**
- **User Onboarding**: Automate new user setup with email notifications
- **Multi-Channel Alert**: Send alerts via email + SMS simultaneously
- **Secure Messaging**: Send encrypted communications
- **Data Processing**: ETL pipelines and quality checks

**Pro Tips:**
- Tasks execute in dependency order automatically
- High-priority tasks run first within each level
- Failed tasks trigger retry logic automatically
""",
            'documentation': """
### 📚 Task Orchestration Documentation

**What It Does:**
NexusOS Task Orchestration is a DAG-based (Directed Acyclic Graph) workflow automation system that manages complex, multi-step processes with dependencies, priorities, and error handling.

**Problems It Solves:**

1. **Manual Process Complexity**
   - Eliminates manual coordination of multi-step workflows
   - Ensures tasks execute in correct order automatically
   - Handles failures and retries intelligently

2. **Cross-Domain Integration**
   - Unifies administration, communication, data processing, and integrations
   - Single platform for all automation needs
   - Consistent API across different task types

3. **Scalability and Reliability**
   - Parallel task execution when possible
   - Sequential execution when dependencies exist
   - Built-in error handling and retry logic

**Technical Architecture:**

**DAG (Directed Acyclic Graph) System:**
- Nodes represent tasks with specific operations
- Edges represent dependencies between tasks
- Topological sorting ensures correct execution order

**Task Handlers:**
- **Admin**: User management, system events, data export
- **Communication**: Email, SMS, notifications, wavelength encryption
- **Social**: Twitter, LinkedIn posting
- **Data**: Transformations, reports, quality checks
- **Integration**: Webhooks, API calls

**Key Features:**
- Priority scheduling (HIGH, NORMAL, LOW)
- Dependency management (tasks wait for prerequisites)
- Automatic retry on failure
- Domain-based organization
- Real-time execution monitoring

**Use Cases:**
- User onboarding automation
- Multi-channel notifications
- Data pipeline orchestration
- Secure message workflows
- Social media campaign scheduling
- System event logging and reporting
""",
        },
        
        'dashboard': {
            'how_to': """
### 🚀 Dashboard Quick Guide

**Real-Time Monitoring Made Simple**

**What You See:**
- **Live KPIs**: Total Value, System Health, Conservation Score, Issuance Rate
- **Auto-Refresh**: Updates every 5 seconds automatically
- **Visual Indicators**: Color-coded status (🟢 Good, 🟡 Warning, 🔴 Critical)
- **Recent Activity**: Last 10 system events

**How to Use:**

1. **Monitor System Health**
   - Watch the System Health percentage
   - Green (>90%): Excellent
   - Yellow (70-90%): Needs attention
   - Red (<70%): Critical

2. **Track Alerts**
   - Active alerts appear in the Alerts panel
   - Click to view details and recommended actions
   - Acknowledge alerts to clear them

3. **View Activity**
   - Recent events show latest system changes
   - Timestamps help track when changes occurred
   - Priority levels indicate importance

**Best Practices:**
- Check dashboard regularly for system status
- Address yellow/red indicators promptly
- Review alerts and take recommended actions
""",
            'documentation': """
### 📚 Production Dashboard Documentation

**Purpose:**
Real-time monitoring and alerting system for NexusOS economic simulations and multi-agent networks.

**What Problems Does It Solve?**

1. **Lack of Real-Time Visibility**
   - Traditional systems require manual checks
   - Our dashboard provides live, auto-refreshing metrics
   - Instant awareness of system state changes

2. **Alert Fatigue**
   - Intelligent alert rules prevent notification overload
   - Configurable thresholds for each metric
   - Priority-based alert organization

3. **System Health Monitoring**
   - Multi-factor health calculation
   - Conservation constraints monitoring
   - Issuance/burn rate tracking
   - PID controller feedback visualization

**Technical Details:**

**KPI Metrics:**
- **Total Value (N)**: Current supply in the economic system
- **System Health**: Composite score from multiple factors
- **Conservation Score**: Compliance with conservation laws
- **Issuance Rate**: Current rate of value creation/destruction

**Alert System:**
- Configurable rules with conditions and thresholds
- Priority levels: Critical, High, Normal, Low
- Auto-acknowledgment and manual dismiss options
- Event-driven triggers

**Use Cases:**
- Production system monitoring
- Economic simulation oversight
- Multi-agent network health tracking
- Real-time anomaly detection
- Performance optimization
""",
        },
        
        'economic_simulator': {
            'how_to': """
### 🚀 Economic Simulator Guide

**Run Your First Simulation:**

1. **Set Parameters** (Parameters Tab)
   - Adjust system constants (w_C, w_D, w_E)
   - Configure PID controller gains
   - Set initial conditions

2. **Run Simulation** (Run Simulation Tab)
   - Click "▶️ Run Simulation"
   - Watch real-time visualization
   - Review results in interactive charts

3. **Analyze Results**
   - Total Value (N) shows supply dynamics
   - System Health tracks multi-factor stability
   - Conservation metrics verify physics constraints
   - PID output shows feedback control

**Quick Tips:**
- Start with default parameters if unsure
- Enable Numba acceleration for faster runs
- Save successful configurations as scenarios
- Export data for external analysis
""",
            'documentation': """
### 📚 Economic Simulator Documentation

**What It Does:**
Simulates self-regulating economic systems based on the Nexus equation with issuance/burn mechanics, PID feedback control, and conservation constraints.

**Problems Solved:**

1. **Economic System Stability**
   - Models feedback loops that maintain equilibrium
   - Tests different controller parameters
   - Identifies unstable configurations before deployment

2. **Multi-Factor Complexity**
   - Handles interactions between Credit (C), Demand (D), and Exogenous (E) factors
   - Simulates realistic economic dynamics
   - Provides conservation law verification

3. **Real-World Testing**
   - Prototype economic mechanisms safely
   - Optimize parameters for desired behavior
   - Generate data for analysis and validation

**Technical Architecture:**

**Core Equation (Nexus):**
```
dN/dt = α·C + β·D + γ·E - δ·N + PID_control
```

Where:
- N = Total Value (system supply)
- C, D, E = Multi-factor components
- PID = Proportional-Integral-Derivative controller

**Features:**
- Differential equation solver
- Multi-signal input (constant, sinusoidal, random walk, etc.)
- Conservation constraint enforcement
- Numba JIT compilation for performance
- Interactive Plotly visualizations

**Use Cases:**
- Cryptocurrency economics design
- Automated market maker optimization
- Smart contract parameter tuning
- Economic research and modeling
- Policy simulation and testing
""",
        },
        
        'about_nexusos': """
### 🌐 About NexusOS Advance Systems

**Unified Intelligence Platform for Economic Modeling & Advanced Communications**

NexusOS Advance Systems is a comprehensive platform that combines economic simulation, multi-agent systems, smart contract generation, machine learning optimization, and wavelength-based secure communications into a single, integrated ecosystem.

**What We Built:**

🔬 **Economic Simulation Engine**
- Self-regulating economic systems with PID feedback control
- Multi-factor modeling (Credit, Demand, Exogenous factors)
- Conservation law verification
- Monte Carlo and sensitivity analysis

🌐 **Multi-Agent Network Simulation**
- Network topology modeling (mesh, hub-spoke, ring, random)
- Inter-node value transfer via DAG optimization
- Sequential and vectorized transaction processing
- Network influence mechanisms

📜 **Smart Contract Generation**
- Automatic Solidity code generation (Ethereum/EVM)
- Rust/ink! generation (Substrate/Polkadot)
- Deployable contracts from simulation parameters
- Production-ready code output

🔗 **Oracle Integration Framework**
- External data source integration
- Retry logic with exponential backoff
- Circuit breaker pattern for reliability
- Error handling and resilience

🤖 **ML-Based Optimization**
- Bayesian optimization for parameter tuning
- Multi-objective optimization (stability, conservation, growth)
- Scikit-optimize integration
- Automated hyperparameter search

🔐 **Wavelength Cryptography**
- Electromagnetic theory-based encryption
- Four encryption methods (FSE, AME, PME, QIML)
- Based on Planck-Einstein relation (E=hc/λ)
- Photon-based secure messaging

🔄 **Task Orchestration**
- DAG-based workflow automation
- Multi-domain handlers (admin, communication, data, social)
- Dependency management and priority scheduling
- Real-time execution monitoring

📊 **Production Dashboard**
- Live KPI monitoring with auto-refresh
- Intelligent alerting system
- Event management and tracking
- System health visualization

📡 **WNSP Protocol**
- Wavelength-Native Signaling Protocol
- Optical communication for mesh networking
- Letter-to-wavelength mapping
- Frame encoding/decoding

**Our Mission:**
Provide robust, production-ready tools for economic modeling, secure communications, and intelligent automation - making complex systems accessible through intuitive interfaces.

**Technology Stack:**
- **Frontend**: Streamlit (Python)
- **Backend**: SQLAlchemy, PostgreSQL
- **Computation**: NumPy, Pandas, SciPy, Numba
- **Visualization**: Plotly
- **ML**: scikit-optimize, Bayesian optimization
- **Security**: bcrypt, wavelength cryptography
- **Networks**: NetworkX

**Why NexusOS Advance Systems?**
We believe complex systems should be both powerful and accessible. NexusOS Advance Systems hides the complexity of electromagnetic cryptography, economic differential equations, and DAG-based workflows behind simple, one-click interfaces - because advanced technology should empower users, not overwhelm them.

---

**Built with care by the NexusOS Advance Systems team**  
Making complexity simple, one wavelength at a time. 🌊
""",
    }
    
    if module_name not in info_content:
        st.warning(f"No info content available for {module_name}")
        return
    
    content = info_content[module_name]
    
    if module_name == 'about_nexusos':
        st.markdown(content)
        return
    
    tab1, tab2 = st.tabs(["📖 How to Use", "📚 Documentation"])
    
    with tab1:
        st.markdown(content['how_to'])
    
    with tab2:
        st.markdown(content['documentation'])


def show_help_icon(module_name: str, key_suffix: str = ""):
    """
    Show a help icon that opens info content in an expander
    
    Args:
        module_name: Module to show help for
        key_suffix: Unique suffix for button key to avoid conflicts
    """
    if st.button("ℹ️ Help", key=f"help_{module_name}_{key_suffix}", help="Click for usage guide and documentation"):
        st.session_state[f'show_help_{module_name}'] = not st.session_state.get(f'show_help_{module_name}', False)
    
    if st.session_state.get(f'show_help_{module_name}', False):
        with st.expander("📖 Help & Documentation", expanded=True):
            render_info_tabs(module_name)
