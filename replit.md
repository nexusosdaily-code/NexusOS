# NexusOS

### Overview
NexusOS is a comprehensive economic system simulator based on the Nexus equation, a self-regulating system with issuance/burn mechanics, PID feedback control, and conservation constraints. It models a multi-factor ecosystem, offering configurable parameters, real-time visualization, scenario management with PostgreSQL persistence, and data export. The platform also includes advanced features like Monte Carlo and Sensitivity Analysis, Multi-Agent Network Simulation, Smart Contract Code Generation (Solidity, Rust/ink!), Oracle Integration, and ML-Based Adaptive Parameter Tuning. It also provides User Authentication and Role-Based Access Control.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

#### UI/UX Decisions
The application uses Streamlit for a single-page, wide-layout dashboard with an expanded sidebar for parameter configuration. Session state manages simulation results, signal configurations, and parameter sets. Plotly is used for interactive visualizations, including subplot-based time-series plots.

#### Technical Implementations
**Core Engine**: The `NexusEngine` class implements the mathematical simulation using differential equations and feedback loops. It includes multi-factor system health calculation, a PID controller, dynamic issuance mechanisms, and time-series signal processing.

**Data Storage**: SQLAlchemy ORM manages two primary tables: `SimulationConfig` for storing parameter sets and `SimulationRun` for simulation results (including complete time-series data as JSON). Parameters are stored as individual columns for queryability.

**Signal Generation**: A Strategy pattern with static factory methods in the `SignalGenerator` class provides various signal types (constant, sinusoidal, step, random walk, pulse, linear ramp) for external inputs.

**Advanced Scenario Analysis**:
- **Monte Carlo Simulation**: Runs multiple simulations with parameter variations for statistical distributions.
- **Sensitivity Analysis**: Performs one-at-a-time parameter sweeps to identify and rank parameter importance.
- **Stability Region Mapping**: Uses 2D parameter space heatmaps to explore stable vs. unstable regions.

**Multi-Agent Network Simulation**: Supports multi-node simulations where each agent has its own NexusEngine. It includes various network topologies, inter-node value transfer, and network influence mechanisms, with interactive visualizations.

**Smart Contract Code Generation**: Generates deployable smart contracts for Ethereum/EVM (Solidity) and Substrate/Polkadot (Rust/ink!) from simulation parameters, including fixed-point arithmetic, core economic functions, and security features.

**Oracle Integration Framework**: Provides an abstraction layer for integrating external data sources via `OracleDataSource`, `RestAPIOracle`, `StaticDataOracle`, and `MockEnvironmentalOracle`. It includes UI integration, configurable refresh intervals, and error handling.

**ML-Based Adaptive Parameter Tuning**: Utilizes Bayesian Optimization (scikit-optimize) to find optimal parameter configurations for multiple objective functions (stability, conservation, growth). It supports parameter subset selection, warm-starting from historical data, and a comprehensive UI.

**User Authentication & Role-Based Access Control**: Implements user accounts, roles (admin, researcher, viewer), and session-based authentication using bcrypt for password hashing and SHA-256 for session tokens. An admin UI allows user management.

### External Dependencies

#### Core Libraries
- **Streamlit**: Web application framework
- **NumPy**: Numerical computing
- **Pandas**: Data manipulation
- **Plotly**: Interactive visualizations
- **SQLAlchemy**: SQL toolkit and ORM
- **NetworkX**: Network analysis for multi-agent topologies
- **SciPy**: Scientific computing
- **scikit-optimize**: Bayesian optimization

#### Database
- **PostgreSQL**: Production-ready persistence for scenarios and simulation runs. Configured via `DATABASE_URL` environment variable.

#### Deployment
- **Replit**: Current development and hosting environment.