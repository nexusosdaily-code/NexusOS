# NexusOS

### Overview
NexusOS is a comprehensive economic system simulator based on the Nexus equation, offering a self-regulating system with issuance/burn mechanics, PID feedback control, and conservation constraints. It models a multi-factor ecosystem, providing configurable parameters, real-time visualization, scenario management with PostgreSQL persistence, and data export. Key capabilities include Monte Carlo and Sensitivity Analysis, Multi-Agent Network Simulation, Smart Contract Code Generation (Solidity, Rust/ink!), Oracle Integration, ML-Based Adaptive Parameter Tuning, and User Authentication with Role-Based Access Control. The platform aims to provide robust tools for economic modeling and analysis.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

#### UI/UX Decisions
The application utilizes Streamlit for a single-page, wide-layout dashboard with an expanded sidebar for parameter configuration. Session state is used to manage simulation results, signal configurations, and parameter sets. Plotly provides interactive visualizations, including subplot-based time-series plots.

#### Technical Implementations
**Core Engine**: The `NexusEngine` implements the mathematical simulation, incorporating differential equations, feedback loops, multi-factor system health calculation, a PID controller, and dynamic issuance mechanisms. A Numba-optimized version (`NexusEngineNumba`) significantly improves performance for large-scale simulations.

**Data Storage**: SQLAlchemy ORM manages `SimulationConfig` for parameter sets and `SimulationRun` for simulation results, including time-series data stored as JSON.

**Signal Generation**: A Strategy pattern with a `SignalGenerator` class provides various signal types (constant, sinusoidal, step, random walk, pulse, linear ramp) for external inputs.

**Advanced Scenario Analysis**: Includes Monte Carlo Simulation for statistical distributions, Sensitivity Analysis for parameter importance, and Stability Region Mapping using 2D parameter space heatmaps.

**Multi-Agent Network Simulation**: Supports multi-node simulations with individual NexusEngines, various network topologies, inter-node value transfer via DAG-based optimization, and network influence mechanisms. It features sequential, DAG-optimized, and vectorized transaction processing modes.

**Smart Contract Code Generation**: Automatically generates deployable smart contracts for Ethereum/EVM (Solidity) and Substrate/Polkadot (Rust/ink!) based on simulation parameters.

**Oracle Integration Framework**: Provides an abstraction layer for integrating external data sources, featuring comprehensive error handling with retry logic, exponential backoff, and a circuit breaker pattern.

**ML-Based Adaptive Parameter Tuning**: Uses Bayesian Optimization (scikit-optimize) to optimize parameter configurations for multiple objective functions (stability, conservation, growth).

**User Authentication & Role-Based Access Control**: Implements user accounts, roles (admin, researcher, viewer), and session-based authentication using bcrypt for password hashing and SHA-256 for session tokens.

**Real-time Production Dashboard**: A comprehensive monitoring dashboard with auto-refresh, live KPI tiles, system health monitoring, and an intelligent alerting system with configurable rules and event management.

**WNSP (Wavelength-Native Signaling Protocol) Integration**: Integrates an optical communication protocol for mesh networking, mapping letters to wavelengths. It includes modules for wavelength mapping, frame encoding/decoding, and a Streamlit visualization interface for encoding, decoding, and spectrum analysis.

**Wavelength Cryptography Domain**: A DAG-based encryption/decryption system using electromagnetic theory principles. Implements four encryption methods: Frequency Shift (FSE) simulating electron energy transitions, Amplitude Modulation (AME) varying photon intensity, Phase Modulation (PME) using wave interference, and Quantum-Inspired Multi-Layer (QIML) combining all three. Based on E=hc/λ (Planck-Einstein relation) and discrete electron energy levels. Fully integrated into Task Orchestration with workflow automation for encrypt, decrypt, and theory demonstration operations.

### External Dependencies

#### Core Libraries
- **Streamlit**: Web application framework
- **streamlit-autorefresh**: For real-time dashboard updates
- **NumPy**: Numerical computing
- **Pandas**: Data manipulation
- **Plotly**: Interactive visualizations
- **SQLAlchemy**: SQL toolkit and ORM
- **NetworkX**: Network analysis
- **SciPy**: Scientific computing
- **scikit-optimize**: Bayesian optimization
- **bcrypt**: Password hashing
- **Numba**: JIT compilation

#### Database
- **PostgreSQL**: Production-ready persistence for scenarios and simulation runs.

#### Deployment
- **Replit**: Development and hosting environment.