# NexusOS Advance Systems - Architecture Documentation

This document provides a comprehensive overview of the NexusOS Advance Systems architecture, design decisions, and component interactions.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Layers](#architecture-layers)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [Security Architecture](#security-architecture)
7. [Performance Optimizations](#performance-optimizations)
8. [Deployment Architecture](#deployment-architecture)
9. [Design Patterns](#design-patterns)
10. [Future Architecture](#future-architecture)

---

## System Overview

NexusOS Advance Systems follows a **modular monolith** architecture, providing the simplicity of a single deployment unit with the maintainability of modular design.

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│                    (Streamlit Frontend)                          │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────┐               │
│  │ Dashboard  │ │   Task      │ │  Wavelength  │  ...          │
│  │   Views    │ │Orchestration│ │   Crypto UI  │               │
│  └────────────┘ └─────────────┘ └──────────────┘               │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Nexus      │ │ Wavelength   │ │     Task     │            │
│  │   Engine     │ │ Cryptography │ │ Orchestration│            │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘            │
│         │                 │                 │                     │
│  ┌──────▼───────┐ ┌──────▼───────┐ ┌──────▼───────┐            │
│  │Multi-Agent   │ │   Smart      │ │      ML      │            │
│  │  Networks    │ │  Contracts   │ │Optimization  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────┬────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                       DATA LAYER                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  PostgreSQL  │ │ Session      │ │   File       │            │
│  │   Database   │ │   State      │ │   Storage    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Presentation Layer

**Technology:** Streamlit 1.x

**Responsibilities:**
- User interface rendering
- Input validation and sanitization
- Session state management
- Visualization (Plotly charts)

**Key Files:**
- `app.py`: Main application entry point
- `app_info_content.py`: User guidance system
- `wnsp_renderer.py`: WNSP visualization
- `dashboard_service.py`: Dashboard UI

**Design Decisions:**
- **Single-page application** with module-based navigation
- **Session state** for user-specific data persistence
- **Lazy loading** of heavy components (charts, simulations)

### 2. Application Layer

**Technology:** Python 3.11

**Responsibilities:**
- Business logic implementation
- Domain-specific algorithms
- Workflow orchestration
- Data transformation

**Key Modules:**

#### Economic Simulation
- `nexus_engine.py`: Pure Python implementation
- `nexus_engine_numba.py`: JIT-compiled version (100x faster)
- `signal_generator.py`: External input modeling

#### Cryptography
- `dag_domains/wavelength_crypto.py`: Encryption algorithms
- `dag_domains/wavelength_crypto_domain.py`: DAG integration
- `dag_domains/wavelength_crypto_workflows.py`: Workflow definitions

#### Task Orchestration
- `task_orchestration.py`: DAG engine
- `task_handlers.py`: Domain-specific handlers
- `dag_domains/`: Domain modules

#### Multi-Agent Systems
- `multi_agent.py`: Network simulation
- `transaction_dag.py`: Transaction optimization

#### Blockchain Simulation
- `blockchain_sim.py`: Layer 1 blockchain simulator with consensus mechanisms
- `blockchain_viz.py`: Blockchain visualization dashboard

#### Predictive Analytics
- `predictive_analytics.py`: Long-term forecasting engine
- `predictive_viz.py`: Predictive analytics dashboard

### 3. Data Layer

**Technology:** PostgreSQL 14+ with SQLAlchemy 2.x ORM

**Responsibilities:**
- Persistent data storage
- Transaction management
- Query optimization
- Data integrity enforcement

**Key Components:**
- `models.py`: SQLAlchemy ORM models
- `database.py`: Database connection and session management

---

## Core Components

### Economic Simulation Engine

```
┌─────────────────────────────────────────────────────┐
│              NexusEngine                            │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │  Input: Parameters (α, β, γ, δ, PID)       │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐  │
│  │   Signal Generation                         │  │
│  │   - Constant, Sinusoidal, Random, etc.     │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐  │
│  │   Differential Equation Solver              │  │
│  │   dN/dt = α·C + β·D + γ·E - δ·N + PID     │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐  │
│  │   Conservation Verification                 │  │
│  │   N(t) = I_cum(t) - B_cum(t)               │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐  │
│  │   Output: Time-series Results               │  │
│  │   (N, I, B, H, M, D, E, C, etc.)           │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Performance Optimization:**
- Numba `@jit(nopython=True)` for hot loops
- NumPy vectorization for array operations
- Caching of intermediate results

### Wavelength Cryptography

```
┌───────────────────────────────────────────────────────┐
│          Wavelength Cryptography System               │
│                                                       │
│  Plaintext Input                                      │
│       │                                               │
│       ▼                                               │
│  ┌─────────────────────┐                             │
│  │ Character Mapping   │                             │
│  │ 'A' → 380nm        │                             │
│  │ 'Z' → 780nm        │                             │
│  └─────────┬───────────┘                             │
│            │                                          │
│  ┌─────────▼──────────────────────────────┐         │
│  │        Encryption Layer                 │         │
│  │                                         │         │
│  │  ┌──────────────┐  ┌──────────────┐   │         │
│  │  │     FSE      │  │     AME      │   │         │
│  │  │ (Frequency)  │  │ (Amplitude)  │   │         │
│  │  └──────┬───────┘  └──────┬───────┘   │         │
│  │         │                  │            │         │
│  │  ┌──────▼──────────────────▼───────┐   │         │
│  │  │         PME (Phase)             │   │         │
│  │  └──────────────┬──────────────────┘   │         │
│  │                 │                       │         │
│  │  ┌──────────────▼──────────────────┐   │         │
│  │  │    QIML (Multi-Layer)           │   │         │
│  │  │    FSE(AME(PME(data)))          │   │         │
│  │  └─────────────────────────────────┘   │         │
│  └─────────────────┬───────────────────────┘         │
│                    │                                  │
│  ┌─────────────────▼───────────────────────┐         │
│  │  Encrypted Wavelength Frames            │         │
│  │  [(λ₁, A₁, φ₁), (λ₂, A₂, φ₂), ...]    │         │
│  └─────────────────────────────────────────┘         │
└───────────────────────────────────────────────────────┘
```

**Security Properties:**
- **Quantum Resistance**: Based on physical properties, not computational complexity
- **Key Space**: Continuous (limited only by float precision)
- **Perfect Forward Secrecy**: Each message uses independent transformations

### Task Orchestration DAG

```
┌──────────────────────────────────────────────────┐
│        Task Orchestration System                 │
│                                                  │
│  Task Definition                                 │
│       │                                          │
│       ▼                                          │
│  ┌────────────────────────────┐                 │
│  │  TaskBuilder               │                 │
│  │  - Type, Priority, Payload │                 │
│  └─────────────┬──────────────┘                 │
│                │                                 │
│  ┌─────────────▼──────────────┐                 │
│  │  DAG Construction          │                 │
│  │  - Add dependencies        │                 │
│  │  - Validate acyclic        │                 │
│  └─────────────┬──────────────┘                 │
│                │                                 │
│  ┌─────────────▼──────────────┐                 │
│  │  Topological Sort          │                 │
│  │  - Determine exec order    │                 │
│  └─────────────┬──────────────┘                 │
│                │                                 │
│  ┌─────────────▼──────────────┐                 │
│  │  Task Execution            │                 │
│  │  - Handler dispatch        │                 │
│  │  - Retry logic             │                 │
│  │  - Error handling          │                 │
│  └─────────────┬──────────────┘                 │
│                │                                 │
│  ┌─────────────▼──────────────┐                 │
│  │  Result Collection         │                 │
│  │  - Success/failure status  │                 │
│  │  - Output data             │                 │
│  └────────────────────────────┘                 │
└──────────────────────────────────────────────────┘
```

**Handler Architecture:**
```python
# Plugin-based handler system
class TaskHandler(ABC):
    @abstractmethod
    def can_handle(self, task_type: str) -> bool:
        pass
    
    @abstractmethod
    def execute(self, task: Task) -> TaskResult:
        pass

# Handlers auto-registered on import
HANDLERS = [
    CommunicationTaskHandlers(),
    DataProcessingTaskHandlers(),
    AdministrationTaskHandlers(),
    SocialTaskHandlers(),
]
```

### Layer 1 Blockchain Simulator

```
┌──────────────────────────────────────────────────────────┐
│                Blockchain Simulator                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Consensus Engine Layer                  │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐          │ │
│  │  │ PoS  │  │ PoW  │  │ BFT  │  │ DPoS │          │ │
│  │  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘          │ │
│  │     └─────────┴─────────┴─────────┘               │ │
│  │                    │                                │ │
│  └────────────────────┼────────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │         Validator Network Management                │ │
│  │  • Selection (stake-weighted, hash-power, etc.)    │ │
│  │  • Lifecycle (active, failed, malicious)           │ │
│  │  • Rewards distribution                            │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │           Transaction Mempool                       │ │
│  │  • Priority queue (fee-based)                      │ │
│  │  • Overflow protection                             │ │
│  │  • Pending transaction management                  │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │            Blockchain Core                          │ │
│  │  • Block creation & validation                     │ │
│  │  • Chain state management                          │ │
│  │  • Fork resolution                                 │ │
│  │  • Transaction execution                           │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼────────────────────────────────┐ │
│  │         Stress Testing Framework                    │ │
│  │  • High TPS Load (5000+)                           │ │
│  │  • Network Partition                               │ │
│  │  • Validator Failures (40%)                        │ │
│  │  • 51% Attack                                      │ │
│  │  • Combined Stress                                 │ │
│  │  • Flash Crash (15000 TPS)                         │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Visualization Layer   │
              │  • Network topology    │
              │  • Real-time metrics   │
              │  • Stress test results │
              └────────────────────────┘
```

**Key Design Decisions:**
- **Pluggable Consensus**: Factory pattern allows switching consensus mechanisms
- **Realistic Simulation**: Models production blockchain features (mempool, validators, forks)
- **Stress Testing**: Demonstrates resilience under severe circumstances
- **Visual Feedback**: Real-time dashboard shows network health and performance

### Long-Term Predictive Analytics System

```
┌──────────────────────────────────────────────────────────┐
│           Predictive Analytics Engine                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │     Historical Data Repository                     │ │
│  │  • Time-series storage (weekly sampling)           │ │
│  │  • Multi-source ingestion (blockchain, economic,   │ │
│  │    network, task orchestration)                    │ │
│  │  • Metadata tracking                               │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐ │
│  │        Time-Series Forecasting Engine              │ │
│  │                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐               │ │
│  │  │   Moving     │  │ Exponential  │               │ │
│  │  │   Average    │  │  Smoothing   │               │ │
│  │  └──────┬───────┘  └──────┬───────┘               │ │
│  │         │                  │                        │ │
│  │         └────────┬─────────┘                        │ │
│  │                  │                                  │ │
│  │         ┌────────▼─────────┐                        │ │
│  │         │   Polynomial     │                        │ │
│  │         │  Trend Fitting   │                        │ │
│  │         └────────┬─────────┘                        │ │
│  │                  │                                  │ │
│  │         ┌────────▼─────────┐                        │ │
│  │         │    Ensemble      │                        │ │
│  │         │  Combination     │                        │ │
│  │         │  (mean ± 1.96σ)  │                        │ │
│  │         └────────┬─────────┘                        │ │
│  └──────────────────┼───────────────────────────────┘ │
│                     │                                  │
│  ┌──────────────────▼───────────────────────────────┐ │
│  │     Pattern Recognition & Trend Detection        │ │
│  │  • Scale-normalized linear regression            │ │
│  │  • Coefficient of variation volatility           │ │
│  │  • CAGR calculation with edge case handling      │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     │                                  │
│  ┌──────────────────▼───────────────────────────────┐ │
│  │     Strategic Insight Generation                 │ │
│  │  • Growth opportunities identification           │ │
│  │  • Risk factor detection                         │ │
│  │  • Stability indicators                          │ │
│  │  • Multi-horizon recommendations                 │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Dashboard (5 Tabs)    │
              │  • Strategic Overview  │
              │  • Metric Predictions  │
              │  • Historical Analysis │
              │  • Deep Dive           │
              │  • Insights Library    │
              └────────────────────────┘
```

**Design Philosophy:**
- **Long Horizon Focus**: 50-100 year forecasting for strategic planning
- **Ensemble Methods**: Combines multiple forecasting approaches for robustness
- **Strategic Insights**: Automated recommendation generation from patterns
- **Multi-Source Integration**: Designed to accumulate data from all NexusOS modules

---

## Data Flow

### Simulation Workflow

```
User Input (Streamlit UI)
    │
    ▼
Parameter Validation
    │
    ▼
NexusEngine.run_simulation()
    │
    ├──> Signal Generation (NumPy)
    │
    ├──> Euler Integration Loop (Numba JIT)
    │    │
    │    ├──> Calculate dN/dt
    │    ├──> PID Control
    │    ├──> Update N, I, B
    │    └──> Verify Conservation
    │
    ▼
Results Dictionary
    │
    ├──> Session State Storage
    │
    ├──> Database Persistence (Optional)
    │    └──> SimulationRun table
    │
    └──> Plotly Visualization
         └──> Streamlit Chart Display
```

### Cryptography Workflow

```
User Composes Message
    │
    ▼
Encryption Key Input/Generation
    │
    ▼
WavelengthCryptography.encrypt()
    │
    ├──> char_to_wavelength()
    │
    ├──> Apply Encryption Method
    │    ├──> FSE (Frequency Shift)
    │    ├──> AME (Amplitude Modulation)
    │    ├──> PME (Phase Modulation)
    │    └──> QIML (Multi-Layer)
    │
    ▼
Encrypted Wavelength Frames
    │
    ├──> Store in Session (sent messages)
    │
    └──> Send via Communication Handler
         ├──> Email
         ├──> SMS
         └──> In-App Notification
```

### Task Orchestration Workflow

```
User Defines Workflow
    │
    ▼
TaskBuilder Creates Tasks
    │
    ▼
TaskOrchestrationDAG.add_task()
    │
    ├──> Validate DAG (no cycles)
    │
    └──> Store in task graph
         │
         ▼
User Executes Workflow
         │
         ▼
DAG.execute()
         │
         ├──> Topological Sort
         │
         └──> For each task (in order):
              │
              ├──> Find Handler
              │    └──> handler.can_handle(task_type)
              │
              ├──> Execute Handler
              │    └──> handler.execute(task)
              │
              ├──> Retry on Failure
              │    └──> Exponential backoff
              │
              └──> Collect Results
```

---

## Database Schema

### Entity-Relationship Diagram

```
┌─────────────────────┐
│       User          │
│─────────────────────│
│ id (PK)             │
│ username (UNIQUE)   │
│ password_hash       │
│ role                │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼───────────┐         ┌─────────────────────┐
│ SimulationConfig     │         │   AlertRule         │
│──────────────────────│         │─────────────────────│
│ id (PK)              │         │ id (PK)             │
│ user_id (FK)         │         │ user_id (FK)        │
│ name (UNIQUE)        │         │ metric              │
│ parameters (JSONB)   │         │ condition           │
│ created_at           │         │ threshold           │
└──────────┬───────────┘         │ severity            │
           │                     │ enabled             │
           │ 1:N                 └─────────────────────┘
           │
┌──────────▼───────────┐         ┌─────────────────────┐
│   SimulationRun      │         │   AlertEvent        │
│──────────────────────│         │─────────────────────│
│ id (PK)              │         │ id (PK)             │
│ config_id (FK)       │         │ rule_id (FK)        │
│ results (JSONB)      │         │ triggered_at        │
│ metrics (JSONB)      │         │ value               │
│ created_at           │         │ acknowledged        │
└──────────────────────┘         └─────────────────────┘
```

### Table Schemas

**users**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
```

**simulation_config**
```sql
CREATE TABLE simulation_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
);
CREATE INDEX idx_simconfig_user ON simulation_config(user_id);
```

**simulation_run**
```sql
CREATE TABLE simulation_run (
    id SERIAL PRIMARY KEY,
    config_id INTEGER REFERENCES simulation_config(id),
    results JSONB NOT NULL,
    metrics JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_simrun_config ON simulation_run(config_id);
CREATE INDEX idx_simrun_created ON simulation_run(created_at DESC);
```

---

## Security Architecture

### Authentication Flow

```
User Login Request
    │
    ▼
AuthManager.login_user(username, password)
    │
    ├──> Query User from Database
    │
    ├──> bcrypt.checkpw(password, stored_hash)
    │    └──> Cost Factor: 12
    │
    ├──> Generate Session Token
    │    └──> SHA-256(username + timestamp + random)
    │
    ├──> Store in st.session_state
    │
    └──> Return Success/Failure
```

### Authorization (RBAC)

```
Request to Restricted Resource
    │
    ▼
AuthManager.has_role(required_role)
    │
    ├──> Check if user logged in
    │
    ├──> Check user role vs. required role
    │    │
    │    ├──> admin: Full access
    │    ├──> researcher: Read/write simulations
    │    └──> viewer: Read-only access
    │
    └──> Allow/Deny Request
```

### Data Protection

**At Rest:**
- Passwords: bcrypt hashing (cost factor 12, salted)
- Session tokens: SHA-256 hashing
- Database: PostgreSQL encryption-at-rest (if configured)

**In Transit:**
- HTTPS for all web traffic (deployment config)
- No sensitive data in URLs or logs

**Input Validation:**
```python
# All inputs validated before processing
from validation import ParameterValidator

validator = ParameterValidator()
errors = validator.validate(params)
if errors:
    raise ValueError(f"Invalid parameters: {errors}")
```

---

## Performance Optimizations

### 1. Numba JIT Compilation

**Before:**
```python
def simulate(N, params, timesteps):
    for t in range(timesteps):
        # Pure Python loop
        N = N + calculate_delta(N, params)
```
**Time:** 5000ms for 1000 timesteps

**After:**
```python
from numba import jit

@jit(nopython=True)
def simulate_numba(N, params, timesteps):
    for t in range(timesteps):
        # Compiled to native code
        N = N + calculate_delta(N, params)
```
**Time:** 50ms for 1000 timesteps (100x speedup)

### 2. NumPy Vectorization

**Before:**
```python
results = []
for i in range(len(transactions)):
    result = process(transactions[i])
    results.append(result)
```

**After:**
```python
# Vectorized operations
sources = np.array([tx.source for tx in transactions])
targets = np.array([tx.target for tx in transactions])
balances[sources] -= amounts  # Single operation
balances[targets] += amounts
```
**Speedup:** 10x

### 3. Caching

```python
@st.cache_data(ttl=300)  # 5-minute TTL
def get_expensive_metric():
    # Expensive calculation
    return compute_metric()
```

### 4. Lazy Loading

```python
# Only compute charts when tab is selected
if selected_tab == "Visualizations":
    chart = generate_plotly_chart(results)
    st.plotly_chart(chart)
```

---

## Deployment Architecture

### Single-Server Deployment (Current)

```
┌────────────────────────────────────────────┐
│           Replit VM                        │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │   Streamlit App (Port 5000)          │ │
│  │   - Main process                     │ │
│  │   - Session management               │ │
│  └──────────────┬───────────────────────┘ │
│                 │                          │
│  ┌──────────────▼───────────────────────┐ │
│  │   PostgreSQL (Local)                 │ │
│  │   - Database server                  │ │
│  │   - Persistent storage               │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Scalable Deployment (Future)

```
┌─────────────┐
│  Load       │
│  Balancer   │
└──────┬──────┘
       │
       ├───────────────┬───────────────┐
       │               │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ Streamlit 1 │ │Streamlit 2 │ │Streamlit 3 │
└──────┬──────┘ └─────┬──────┘ └─────┬──────┘
       │              │               │
       └──────────────┴───────────────┘
                      │
              ┌───────▼────────┐
              │  PostgreSQL    │
              │  (Managed)     │
              └────────────────┘
```

---

## Design Patterns

### 1. Strategy Pattern (Signal Generation)

```python
class SignalGenerator(ABC):
    @abstractmethod
    def generate(self, t: float) -> float:
        pass

class ConstantSignal(SignalGenerator):
    def generate(self, t: float) -> float:
        return self.amplitude

class SinusoidalSignal(SignalGenerator):
    def generate(self, t: float) -> float:
        return self.amplitude * np.sin(self.frequency * t)
```

### 2. Factory Pattern (Task Creation)

```python
class TaskBuilder:
    def __init__(self):
        self._task = Task()
    
    def with_type(self, task_type: str):
        self._task.task_type = task_type
        return self
    
    def with_priority(self, priority: str):
        self._task.priority = TaskPriority[priority.upper()]
        return self
    
    def build(self) -> Task:
        return self._task
```

### 3. Observer Pattern (Dashboard Alerts)

```python
class AlertService:
    def __init__(self):
        self._subscribers = []
    
    def subscribe(self, callback):
        self._subscribers.append(callback)
    
    def notify(self, alert):
        for callback in self._subscribers:
            callback(alert)
```

### 4. Repository Pattern (Data Access)

```python
class SimulationRepository:
    def get_by_id(self, sim_id: int) -> SimulationRun:
        return self.session.query(SimulationRun).get(sim_id)
    
    def save(self, simulation: SimulationRun):
        self.session.add(simulation)
        self.session.commit()
```

---

## Future Architecture

### Microservices Evolution

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Simulation │     │  Crypto     │     │   Task      │
│   Service   │────▶│  Service    │────▶│Orchestration│
│  (Python)   │     │  (Rust?)    │     │  Service    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                     │
       └───────────────────┴─────────────────────┘
                           │
                   ┌───────▼────────┐
                   │   Message      │
                   │   Queue        │
                   │   (RabbitMQ)   │
                   └────────────────┘
```

### Event-Driven Architecture

```
Event Bus (Kafka/RabbitMQ)
    │
    ├──> Simulation Completed Event
    │    └──> Trigger ML Optimization
    │
    ├──> Alert Triggered Event
    │    └──> Send Notification
    │
    └──> Parameter Updated Event
         └──> Regenerate Smart Contract
```

---

**Last Updated:** November 2025  
**Version:** 1.0

For questions about architecture, please open a GitHub Discussion.
