# NexusOS

### Overview
NexusOS is a comprehensive economic system simulator based on the Nexus equation, a self-regulating system with issuance/burn mechanics, PID feedback control, and conservation constraints. It models a multi-factor ecosystem, offering configurable parameters, real-time visualization, scenario management with PostgreSQL persistence, and data export. The platform also includes advanced features like Monte Carlo and Sensitivity Analysis, Multi-Agent Network Simulation, Smart Contract Code Generation (Solidity, Rust/ink!), Oracle Integration, and ML-Based Adaptive Parameter Tuning. It also provides User Authentication and Role-Based Access Control.

**Testing**: Comprehensive test suite with 252 tests covering all core modules (100% pass rate). Includes 29 validation tests, 22 error handling tests, and 26 DAG transaction processing tests. See Testing section below for details.

**Production Error Handling & Validation**: Comprehensive error handling infrastructure with consistent ❌/💡 message pattern across all application layers. Covers six critical areas: (1) Input Validation - blocks execution for constraint violations with recovery hints; (2) Database Error Handling - custom exception hierarchy with auto-rollback via db_transaction context manager; (3) Oracle/API Error Handling - retry logic with exponential backoff, circuit breaker pattern, graceful degradation; (4) Real-time Form Validation - live weight sum indicators (✅/⚠️/❌) during parameter entry; (5) Simulation Error Recovery - detects numerical instability (NaN/Inf) with step-level diagnostics; (6) Authentication Error Messages - clear guidance for login/registration failures. All errors include specific recovery actions in non-technical language. 226 tests passing with 29 validation tests, 22 database error tests.

### User Preferences
Preferred communication style: Simple, everyday language.

### System Architecture

#### UI/UX Decisions
The application uses Streamlit for a single-page, wide-layout dashboard with an expanded sidebar for parameter configuration. Session state manages simulation results, signal configurations, and parameter sets. Plotly is used for interactive visualizations, including subplot-based time-series plots.

#### Technical Implementations
**Core Engine**: The `NexusEngine` class implements the mathematical simulation using differential equations and feedback loops. It includes multi-factor system health calculation, a PID controller, dynamic issuance mechanisms, and time-series signal processing. `NexusEngineNumba` provides a JIT-compiled implementation using Numba for 10-100x performance improvement on large-scale simulations (proven via benchmarks: 56x average speedup, 96x at 5000 steps). `performance_utils.py` provides `PerformanceTimer` with statistics, `timing_decorator` for automatic profiling, `CachingLayer` with LRU eviction, `PerformanceProfiler` with detailed reports, and `BatchProcessor` for efficient batch processing.

**Data Storage**: SQLAlchemy ORM manages two primary tables: `SimulationConfig` for storing parameter sets and `SimulationRun` for simulation results (including complete time-series data as JSON). Parameters are stored as individual columns for queryability.

**Signal Generation**: A Strategy pattern with static factory methods in the `SignalGenerator` class provides various signal types (constant, sinusoidal, step, random walk, pulse, linear ramp) for external inputs.

**Advanced Scenario Analysis**:
- **Monte Carlo Simulation**: Runs multiple simulations with parameter variations for statistical distributions.
- **Sensitivity Analysis**: Performs one-at-a-time parameter sweeps to identify and rank parameter importance.
- **Stability Region Mapping**: Uses 2D parameter space heatmaps to explore stable vs. unstable regions.

**Multi-Agent Network Simulation**: Supports multi-node simulations where each agent has its own NexusEngine. It includes various network topologies, inter-node value transfer with DAG-based optimization, and network influence mechanisms, with interactive visualizations. Features three transaction processing modes: sequential (baseline), DAG-optimized (dependency analysis with frozen snapshot semantics), and vectorized (matrix operations for dense networks).

**Smart Contract Code Generation**: Generates deployable smart contracts for Ethereum/EVM (Solidity) and Substrate/Polkadot (Rust/ink!) from simulation parameters, including fixed-point arithmetic, core economic functions, and security features.

**Oracle Integration Framework**: Provides an abstraction layer for integrating external data sources via `OracleDataSource`, `RestAPIOracle`, `StaticDataOracle`, and `MockEnvironmentalOracle`. Features comprehensive error handling infrastructure (`oracle_error_handling.py`) with custom exception hierarchy, retry logic with exponential backoff (3 retries, 1-10s delays), circuit breaker pattern for graceful degradation (opens after 5 failures, 60s timeout), timeout handling, and user-friendly ❌/💡 error messages. API failures are automatically retried, and repeated failures trigger circuit breaker to prevent cascading failures.

**ML-Based Adaptive Parameter Tuning**: Utilizes Bayesian Optimization (scikit-optimize) to find optimal parameter configurations for multiple objective functions (stability, conservation, growth). It supports parameter subset selection, warm-starting from historical data, and a comprehensive UI.

**User Authentication & Role-Based Access Control**: Implements user accounts, roles (admin, researcher, viewer), and session-based authentication using bcrypt for password hashing and SHA-256 for session tokens. An admin UI allows user management.

**Real-time Production Dashboard**: A comprehensive monitoring dashboard with auto-refresh capability (5-60 second intervals using streamlit-autorefresh). Features live KPI tiles tracking Latest Nexus State, Average Issuance/Burn, Conservation Error, and Active Alerts. System health monitoring displays database connectivity (with ping time), simulation counts, and oracle source status. Intelligent alerting system with configurable rules (metric thresholds, comparators, severity levels) and event management (acknowledge/resolve workflows). Alert configuration is role-gated (admin/researcher only). DashboardDataService aggregates metrics from SimulationRun table and oracle feeds. AlertService evaluates rules in real-time and triggers in-app notifications via st.toast. Database schema includes monitoring_snapshots, alert_rules, and alert_events tables for persistence.

**WNSP (Wavelength-Native Signaling Protocol) Integration**: Integrates optical/light-based communication protocol for mesh networking capabilities. Maps A-Z letters to wavelengths 380-740nm evenly distributed across the visible spectrum. Implementation includes three core modules: `wavelength_map.py` for letter-to-wavelength mapping with RGB color conversion, `wnsp_frames.py` for frame encoding/decoding with sync patterns and checksums, and `wnsp_renderer.py` for Streamlit visualization. The WNSP tab provides three interfaces: Encode & Transmit (message preview with color swatches, signal timeline visualization, transmission metadata), Decode (round-trip encode/decode simulation), and Spectrum Analysis (character frequency distribution, wavelength statistics). Visual rendering displays messages as sequences of colored light across the spectrum from violet (A=380nm) to red (Z=740nm), with multi-row layout for long messages. Protocol filters non-alphabetic characters and converts all input to uppercase for consistent encoding.

### Testing & Quality Assurance

**Comprehensive Test Suite**: 252 tests with 100% pass rate covering all major modules:
- **test_signal_generator.py** (28 tests): All signal types, configuration generation, edge cases
- **test_database.py** (24 tests): Full CRUD, foreign key cascades, data integrity for 11 models
- **test_alert_service.py** (18 tests): Alert rules, event management, production session lifecycle
- **test_oracle_integration.py** (25 tests): All oracle sources, manager, data fetching
- **test_auth_service.py** (25 tests): Password hashing, session management, RBAC
- **test_wnsp.py** (28 tests): Wavelength mapping, frame encoding/decoding, message round-trips
- **test_smart_contract_generation.py** (20 tests): Solidity and Rust/ink! contract generation
- **test_validation.py** (23 tests): Parameter validation, weight constraints, signal validation
- **test_validation_blocks_execution.py** (6 tests): Execution blocking for invalid parameters
- **test_db_error_handling.py** (22 tests): Error message building, transaction management, exception handling
- **test_transaction_dag.py** (26 tests): DAG construction, topological sorting, transaction processing modes, regression tests for chain/hub topologies

**Production Fixes & Error Handling Infrastructure**:

**AlertService**: Refactored with dependency injection pattern (`session_factory` parameter and explicit `test_mode` flag) to prevent DetachedInstanceError. All methods use `_get_session()` helper with proper session lifecycle management (`expire_on_commit=False` for production safety).

**Error Handling Infrastructure (Tasks 5a-5f, All Architect-Approved):**

1. **Input Validation (Task 5a)**: Comprehensive validation framework (`validation.py`) validates all simulation parameters, weight constraints, and signal configurations. Critical violations (weight sums ≠ 1.0, parameter ranges) block execution with ❌ error messages and 💡 recovery hints. Includes 29 validation tests and 6 execution-blocking tests.

2. **Database Error Handling (Task 5b)**: Complete error handling infrastructure (`db_error_handling.py`) translates SQLAlchemy exceptions into user-friendly messages. Custom exception hierarchy (DatabaseError, ConnectionError, ConstraintViolationError) with automatic rollback via `db_transaction` context manager. All database operations in authentication, admin, and scenario management layers properly propagate errors to UI. Includes 22 database error handling tests.

3. **Oracle/API Error Handling (Task 5c)**: Retry logic with exponential backoff (3 retries, 1-10s delays), circuit breaker pattern (opens after 5 failures, 60s timeout), graceful degradation with user-friendly ❌/💡 error messages. API failures are automatically retried, repeated failures trigger circuit breaker to prevent cascading failures. Includes 25 oracle integration tests.

4. **Real-time Form Validation (Task 5d)**: Live validation feedback for weight sums during parameter entry. Shows ✅ (valid, sum=1.0), ⚠️ (warning, sum≠1.0), or ❌ (critical error) indicators as users adjust sliders. Maintains existing validation.py execution blocking for critical errors.

5. **Simulation Error Recovery (Task 5e)**: Comprehensive error handling for simulation failures with precise diagnostics. Validates time parameters (num_steps, delta_t > 0), catches signal generation errors, detects numerical instability (NaN/Inf) with step-level precision (shows exact step number and time). Provides specific recovery hints (reduce delta_t, adjust PID gains). All simulation runs wrapped in try/except with user-friendly error display.

6. **Authentication Error Messages (Task 5f)**: Enhanced login/registration error messages with consistent ❌/💡 pattern. Covers empty credentials, invalid login, password length requirements, duplicate emails, and database errors. All messages provide clear descriptions and actionable recovery hints in non-technical language.

**DAG-Based Transaction Processing (Task 6, Architect-Approved)**:

Implemented directed acyclic graph (DAG) optimization for multi-agent value transfers to improve efficiency while preserving exact simulation semantics. Implementation includes:

1. **Transaction DAG Module** (`transaction_dag.py`): Three classes for transaction optimization:
   - `TransactionDAG`: Builds dependency graph using Kahn's algorithm for topological sorting with level grouping
   - `DAGTransactionProcessor`: Executes transfers using frozen snapshot semantics to preserve original physics
   - `VectorizedTransactionProcessor`: Matrix-based operations for dense networks using NumPy acceleration

2. **Frozen Snapshot Semantics**: All transfer amounts computed from pre-transfer state snapshot, ensuring identical results to sequential baseline (verified at 1e-10 tolerance)

3. **Multi-Agent Integration**: Three execution modes in `MultiAgentNexusSimulation`:
   - Sequential (baseline, use_dag_optimization=False)
   - DAG-optimized (dependency analysis, use_dag_optimization=True, default)
   - Vectorized (matrix operations, use_vectorized=True)

4. **Comprehensive Testing**: 26 tests covering DAG construction, topological sorting, transfer execution, performance metrics, and regression tests for chain/hub/ring topologies to verify correctness

5. **Performance Metrics**: `get_transaction_metrics()` provides parallelization statistics including execution levels, max parallelism, and speedup potential

### External Dependencies

#### Core Libraries
- **Streamlit**: Web application framework
- **streamlit-autorefresh**: Auto-refresh component for real-time dashboard updates
- **NumPy**: Numerical computing
- **Pandas**: Data manipulation
- **Plotly**: Interactive visualizations
- **SQLAlchemy**: SQL toolkit and ORM
- **NetworkX**: Network analysis for multi-agent topologies
- **SciPy**: Scientific computing
- **scikit-optimize**: Bayesian optimization
- **bcrypt**: Password hashing for authentication
- **Numba**: JIT compilation for high-performance numerical code (56x average speedup)

#### Database
- **PostgreSQL**: Production-ready persistence for scenarios and simulation runs. Configured via `DATABASE_URL` environment variable.

#### Deployment
- **Replit**: Current development and hosting environment.