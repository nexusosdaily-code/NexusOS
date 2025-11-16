# NexusOS

## Overview

NexusOS is a comprehensive economic system simulator implementing the foundational Nexus equation: a self-regulating system with issuance/burn mechanics, PID feedback control, and conservation constraints. Built with Streamlit and Python scientific computing libraries, it models a multi-factor ecosystem where the Nexus state N(t) evolves according to:

**dN/dt = I(t) - B(t) - κN(t) + Φ(t) + ηF(t)**

Where:
- I(t) = issuance rate based on validated human/machine contributions and system health
- B(t) = burn rate tied to consumption, disposal, and ecological load
- κN(t) = temporal decay
- Φ(t) = PID feedback controller for stability
- ηF(t) = floor injection for baseline guaranteed value

The platform features configurable parameters, real-time visualization, scenario management with PostgreSQL persistence, and data export capabilities for research and analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology**: Streamlit web framework

**Design Pattern**: Single-page application with session state management

The UI is organized into a wide-layout dashboard with an expanded sidebar for parameter configuration. Session state (`st.session_state`) maintains simulation results, signal configurations, and parameter sets across reruns. The architecture separates presentation (app.py) from business logic (nexus_engine.py) and data generation (signal_generators.py).

**Rationale**: Streamlit was chosen for rapid prototyping of data-centric applications with minimal frontend code. The framework's reactive model automatically handles state updates and re-rendering.

### Backend Architecture

**Core Engine**: NexusEngine class implementing mathematical simulation

The simulation engine uses differential equations and feedback loops to model system behavior. Key components include:

1. **Multi-factor system health calculation** - Weighted combination of energy (E), network (N), health (H), and market (M) metrics
2. **PID controller** - Proportional-Integral-Derivative control for system stability
3. **Issuance mechanism** - Dynamic resource allocation based on system state
4. **Signal processing** - Time-series generation for external inputs

The engine accepts a parameter dictionary at initialization and maintains internal state (integral error, previous error) for PID calculations. Simulation proceeds via step-by-step numerical integration.

**Design Choice**: Class-based architecture with dependency injection of parameters allows for multiple simulation instances with different configurations.

### Data Storage Solutions

**Database**: SQLAlchemy ORM with configurable backend

Two primary tables:

1. **SimulationConfig** - Stores parameter sets with metadata (name, description, timestamp)
   - Contains ~30 float parameters for engine configuration
   - Includes simulation settings (delta_t, num_steps)
   
2. **SimulationRun** - Stores simulation execution results
   - Links to SimulationConfig via config_id
   - Stores complete time-series data as JSON
   - Tracks final_N, avg_issuance, avg_burn, conservation_error

**Schema Design**: Parameters are stored as individual columns rather than JSON for queryability. This enables filtering and comparison of configurations by specific parameter values.

**Rationale**: SQLAlchemy provides database-agnostic abstraction, allowing deployment with SQLite for development or PostgreSQL for production without code changes.

### Visualization Layer

**Technology**: Plotly for interactive charts

**Approach**: Subplot-based dashboard with time-series plots

The system uses `plotly.graph_objects` and `make_subplots` for composing multi-panel visualizations. This supports comparative analysis of different state variables over time.

**Alternatives Considered**: Matplotlib was likely rejected due to lack of interactivity; Altair for lighter weight visualizations.

**Pros**: Plotly provides zoom, pan, hover tooltips, and export capabilities out-of-box.

### Signal Generation System

**Pattern**: Strategy pattern with static factory methods

The `SignalGenerator` class provides multiple signal types:
- Constant baseline
- Sinusoidal oscillations
- Step changes (shock events)
- Random walks (stochastic processes)
- Pulse trains (periodic events)
- Linear ramps

Each generator accepts parameters and returns numpy arrays representing time-series data. This allows testing system response to various input patterns for H(t), M(t), D(t), E(t), C_cons(t), and C_disp(t).

**Design Rationale**: Static methods avoid unnecessary state while providing a clean namespace. Users can configure signal types and parameters through the UI, enabling scenario testing without code changes.

## Current Implementation Status

### MVP Features (Complete)
1. ✅ Core Nexus equation engine with all mathematical components
2. ✅ Discrete-time simulation engine (configurable Δt and num_steps)
3. ✅ Interactive parameter control with sliders for 20+ parameters
4. ✅ Real-time visualization suite (N(t), I vs B, S(t), E(t), Φ(t))
5. ✅ Input signal generators with 6 pattern types
6. ✅ System health index S(t) with configurable weights
7. ✅ Conservation constraint monitor (∫I(t)dt vs ∫B(t)dt)
8. ✅ PostgreSQL persistence for scenarios and runs
9. ✅ Scenario save/load functionality
10. ✅ Data export (CSV, JSON)

### Advanced Scenario Analysis (Complete - November 2025)
1. ✅ Monte Carlo Simulation - Runs multiple simulations with parameter variations, generates full statistical distributions (mean, std, CI, percentiles) for final N, issuance, burn, and conservation error. Includes parameter variation scatter plots.
2. ✅ Sensitivity Analysis - One-at-a-time parameter sweeps with properly re-instantiated engine for each variation. Visualizes sensitivity curves for all key metrics and ranks parameter importance.
3. ✅ Stability Region Mapping - 2D parameter space heatmap exploration identifying stable vs unstable regions. Calculates coefficient of variation, convergence rates, and binary stability assessment across parameter grids.

### Multi-Agent Network Simulation (Complete - November 2025)
1. ✅ Network Architecture - Multi-node simulation where each agent has its own NexusEngine instance and N(t) state. Supports 5 network topologies: fully connected, hub-and-spoke, random (Erdős-Rényi), ring, and small-world (Watts-Strogatz).
2. ✅ Inter-Node Dynamics - Value transfer mechanics flow resources from high-N to low-N nodes based on network connections. Network influence mechanism allows neighbors' states to affect each agent's system health S(t). Configurable transfer rate and network influence parameters.
3. ✅ Network Visualization - Interactive Plotly network graph showing agent nodes and connections, color-coded by final N state. Real-time evolution plots for all agents' N(t) trajectories. Comparative issuance/burn analysis across agents. Network topology metrics (density, clustering, degree distribution).

### Next Phase Features (Planned)
1. Smart contract code generation (Solidity/Rust templates with fixed-point arithmetic)
3. Oracle integration framework for real-world data feeds (environmental sensors, IoT, blockchain oracles)
4. ML-based adaptive parameter tuning (historical pattern analysis, RL-based optimization)
5. User authentication and role-based access (admin/researcher/viewer roles)
6. Real-time production dashboard with live oracle feeds and alerting
7. Audit trail and provenance tracking (event logging, cryptographic hashing)

## External Dependencies

### Core Libraries

- **Streamlit** - Web application framework for data apps
- **NumPy** - Numerical computing and array operations
- **Pandas** - Data manipulation and analysis
- **Plotly** - Interactive visualization library
- **SQLAlchemy** - SQL toolkit and ORM
- **NetworkX** - Network analysis and graph theory library for multi-agent topologies
- **SciPy** - Scientific computing (used in signal generation)

### Database

- **PostgreSQL** (via DATABASE_URL environment variable)
- Production-ready persistence for scenarios and simulation runs
- SQLAlchemy ORM for database-agnostic abstraction

### Deployment

- **Replit** - Current development and hosting environment
- Streamlit runs on port 5000 with webview output
- Configured for autoscale deployment

The application is currently self-contained with local computation and storage. Future phases will integrate external APIs for oracles, authentication, and blockchain interactions.