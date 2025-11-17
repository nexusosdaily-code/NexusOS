# NexusOS Advance Systems - API Reference

Complete API documentation for all major modules and classes.

---

## Table of Contents

1. [Economic Simulation](#economic-simulation)
2. [Wavelength Cryptography](#wavelength-cryptography)
3. [Task Orchestration](#task-orchestration)
4. [Multi-Agent Networks](#multi-agent-networks)
5. [ML Optimization](#ml-optimization)
6. [Smart Contracts](#smart-contracts)
7. [Oracle Integration](#oracle-integration)
8. [Authentication](#authentication)
9. [Database Models](#database-models)

---

## Economic Simulation

### NexusEngine

Core economic simulation engine implementing the Nexus equation.

```python
class NexusEngine:
    """Economic simulation engine with PID control and conservation laws."""
    
    def __init__(self, params: dict):
        """Initialize engine with parameters.
        
        Args:
            params: Dictionary containing:
                - alpha: Credit factor weight
                - beta: Demand factor weight
                - gamma: Exogenous factor weight
                - delta: Decay/burn rate
                - Kp, Ki, Kd: PID controller gains
                - N_target: Target value
                - dt: Timestep size
        """
    
    def run_simulation(self, timesteps: int, signals: dict) -> dict:
        """Run simulation for specified timesteps.
        
        Args:
            timesteps: Number of time steps to simulate
            signals: Dictionary of signal generators for H, M, D, E, C_cons, C_disp
        
        Returns:
            Dictionary containing time-series data:
                - 'N': Total value array
                - 'I': Issuance array
                - 'B': Burn array
                - 'H': Human contribution array
                - 'M': Machine contribution array
                - 'D': Demand array
                - 'E': Exogenous factors array
                - 'C': Total contribution array
                - 'time': Time array
        
        Example:
            >>> engine = NexusEngine({'alpha': 0.5, 'beta': 0.3, 'delta': 0.1})
            >>> results = engine.run_simulation(timesteps=1000, signals=signals)
            >>> print(f"Final N: {results['N'][-1]}")
        """
```

### NexusEngineNumba

JIT-compiled version for high performance.

```python
class NexusEngineNumba:
    """Numba-optimized economic simulation engine (100x faster)."""
    
    def run_simulation_numba(self, timesteps: int, signals_array: np.ndarray) -> dict:
        """Run optimized simulation using Numba JIT compilation.
        
        Args:
            timesteps: Number of time steps
            signals_array: Pre-computed signals as NumPy array (timesteps x 6)
        
        Returns:
            Same as NexusEngine.run_simulation()
        
        Performance:
            - Pure Python: ~5000ms for 1000 timesteps
            - Numba JIT: ~50ms for 1000 timesteps (100x speedup)
        """
```

### SignalGenerator

Factory for creating different signal types.

```python
class SignalGenerator:
    """Generate various signal types for simulation inputs."""
    
    @staticmethod
    def constant(amplitude: float = 1.0) -> callable:
        """Constant signal: f(t) = A"""
    
    @staticmethod
    def sinusoidal(amplitude: float = 1.0, frequency: float = 0.1, phase: float = 0.0) -> callable:
        """Sinusoidal signal: f(t) = A·sin(ωt + φ)"""
    
    @staticmethod
    def step(amplitude: float = 1.0, step_time: float = 50.0) -> callable:
        """Step signal: f(t) = A if t ≥ t_step else 0"""
    
    @staticmethod
    def random_walk(initial: float = 1.0, volatility: float = 0.1) -> callable:
        """Random walk: f(t) = f(t-1) + N(0, σ²)"""
    
    @staticmethod
    def pulse(amplitude: float = 1.0, start: float = 25.0, duration: float = 10.0) -> callable:
        """Pulse signal: f(t) = A if start ≤ t < start+duration else 0"""
    
    @staticmethod
    def linear_ramp(final_value: float = 2.0, duration: float = 100.0) -> callable:
        """Linear ramp: f(t) = A·t/T"""
```

---

## Wavelength Cryptography

### WavelengthCryptography

Main cryptography interface with multiple encryption methods.

```python
class WavelengthCryptography:
    """Wavelength-based encryption using electromagnetic theory."""
    
    def encrypt(self, plaintext: str, key: str, method: str = 'FSE') -> EncryptedWavelengthMessage:
        """Encrypt message using specified method.
        
        Args:
            plaintext: Message to encrypt
            key: Encryption key (minimum 8 characters)
            method: Encryption method - 'FSE', 'AME', 'PME', or 'QIML'
        
        Returns:
            EncryptedWavelengthMessage containing wavelength frames
        
        Raises:
            ValueError: If key is too short or method is invalid
        
        Example:
            >>> crypto = WavelengthCryptography()
            >>> encrypted = crypto.encrypt("Hello", key="mykey123", method="QIML")
            >>> print(f"Encrypted to {len(encrypted.frames)} frames")
        """
    
    def decrypt(self, encrypted: EncryptedWavelengthMessage, key: str) -> str:
        """Decrypt message.
        
        Args:
            encrypted: EncryptedWavelengthMessage to decrypt
            key: Decryption key (must match encryption key)
        
        Returns:
            Decrypted plaintext string
        
        Raises:
            ValueError: If decryption fails
        """
```

### Encryption Methods

```python
class FrequencyShiftEncryption:
    """FSE: Simulates electron energy level transitions."""
    
    def encrypt_char(self, char: str, key_factor: float) -> WavelengthFrame:
        """Encrypt single character using frequency shift.
        
        Formula: λ_encrypted = λ_base + Δλ(char, key)
        """

class AmplitudeModulationEncryption:
    """AME: Varies photon intensity based on plaintext."""
    
    def encrypt_char(self, char: str, key_factor: float) -> WavelengthFrame:
        """Encrypt using amplitude modulation.
        
        Formula: A_encrypted = A_base × (1 + key_factor × char_value)
        """

class PhaseModulationEncryption:
    """PME: Uses wave interference patterns."""
    
    def encrypt_char(self, char: str, key_factor: float) -> WavelengthFrame:
        """Encrypt using phase modulation.
        
        Formula: φ_encrypted = φ_base + key_factor × char_value × 2π
        """

class QuantumInspiredMultiLayerEncryption:
    """QIML: Combines FSE, AME, and PME for enhanced security."""
    
    def encrypt_char(self, char: str, key: str) -> WavelengthFrame:
        """Three-layer encryption: FSE(AME(PME(char)))"""
```

---

## Task Orchestration

### TaskOrchestrationDAG

DAG-based task execution engine.

```python
class TaskOrchestrationDAG:
    """Directed Acyclic Graph task orchestration system."""
    
    def add_task(self, task: Task):
        """Add task to DAG.
        
        Args:
            task: Task object to add
        
        Raises:
            ValueError: If task creates cycle in DAG
        """
    
    def add_dependency(self, task_id: str, depends_on: str):
        """Add dependency between tasks.
        
        Args:
            task_id: Dependent task ID
            depends_on: Dependency task ID
        """
    
    def execute(self) -> List[TaskResult]:
        """Execute all tasks in topological order.
        
        Returns:
            List of TaskResult objects
        
        Process:
            1. Topological sort to determine execution order
            2. For each task:
               - Find compatible handler
               - Execute with retry logic
               - Collect results
            3. Return all results
        """
    
    def get_status(self) -> dict:
        """Get execution status of all tasks.
        
        Returns:
            Dictionary mapping task_id -> status
        """
```

### TaskBuilder

Fluent interface for task creation.

```python
class TaskBuilder:
    """Builder pattern for Task creation."""
    
    def with_type(self, task_type: str) -> 'TaskBuilder':
        """Set task type."""
    
    def with_priority(self, priority: str) -> 'TaskBuilder':
        """Set priority: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'."""
    
    def with_payload(self, payload: dict) -> 'TaskBuilder':
        """Set task payload data."""
    
    def with_dependencies(self, deps: List[str]) -> 'TaskBuilder':
        """Set task dependencies."""
    
    def build(self) -> Task:
        """Build and return Task object.
        
        Example:
            >>> task = TaskBuilder() \\
            ...     .with_type("send_email") \\
            ...     .with_priority("HIGH") \\
            ...     .with_payload({"to": "user@example.com"}) \\
            ...     .build()
        """
```

### Task Handlers

```python
class CommunicationTaskHandlers:
    """Handlers for communication tasks."""
    
    def send_email(self, payload: dict) -> TaskResult:
        """Send email.
        
        Payload:
            - to: Recipient email
            - subject: Email subject
            - body: Email body
            - cc: CC recipients (optional)
        """
    
    def send_sms(self, payload: dict) -> TaskResult:
        """Send SMS message.
        
        Payload:
            - to: Phone number
            - message: SMS text
        """
    
    def send_wavelength_encrypted_message(self, payload: dict) -> TaskResult:
        """Send encrypted message using wavelength cryptography.
        
        Payload:
            - to: Recipient
            - message: Plaintext message
            - encryption_key: Key for encryption
            - method: Encryption method (FSE/AME/PME/QIML)
        """
```

---

## Multi-Agent Networks

### MultiAgentNetwork

Network simulation with value transfer.

```python
class MultiAgentNetwork:
    """Multi-agent network simulation with transaction processing."""
    
    def __init__(self, num_agents: int, topology: str = 'mesh'):
        """Initialize network.
        
        Args:
            num_agents: Number of agents in network
            topology: Network topology - 'mesh', 'hub_spoke', 'ring', 'random'
        """
    
    def add_transaction(self, source: int, target: int, amount: float):
        """Add value transfer transaction.
        
        Args:
            source: Source agent ID
            target: Target agent ID
            amount: Value to transfer
        """
    
    def execute_transactions_sequential(self) -> dict:
        """Execute transactions sequentially (FIFO).
        
        Returns:
            Execution statistics and final balances
        """
    
    def execute_transactions_dag(self) -> dict:
        """Execute using DAG optimization for parallelization.
        
        Returns:
            Execution statistics and final balances
        
        Performance: ~2.5x faster than sequential
        """
    
    def execute_transactions_vectorized(self) -> dict:
        """Execute using NumPy vectorization.
        
        Returns:
            Execution statistics and final balances
        
        Performance: ~10x faster than sequential
        """
    
    def verify_conservation(self) -> bool:
        """Verify total value conservation.
        
        Returns:
            True if Σ(balances) unchanged, False otherwise
        """
```

---

## ML Optimization

### Bayesian Optimization

```python
def run_bayesian_optimization(
    objective: str = 'stability',
    n_calls: int = 50,
    param_bounds: dict = None
) -> dict:
    """Run Bayesian optimization for parameter tuning.
    
    Args:
        objective: Optimization objective - 'stability', 'conservation', 'growth'
        n_calls: Number of iterations
        param_bounds: Parameter search space bounds
    
    Returns:
        Dictionary containing:
            - 'best_params': Optimal parameter configuration
            - 'best_score': Best objective value achieved
            - 'convergence': Convergence trace
    
    Algorithm:
        Uses Gaussian Process-based Bayesian optimization with
        Expected Improvement acquisition function.
    
    Example:
        >>> results = run_bayesian_optimization(
        ...     objective='stability',
        ...     n_calls=50
        ... )
        >>> print(f"Best alpha: {results['best_params']['alpha']}")
    """
```

---

## Smart Contracts

### Code Generation

```python
def generate_solidity_contract(params: dict, contract_name: str = "NexusToken") -> str:
    """Generate Solidity smart contract from simulation parameters.
    
    Args:
        params: Simulation parameters (alpha, beta, delta, etc.)
        contract_name: Name of generated contract
    
    Returns:
        Complete Solidity contract source code
    
    Features:
        - ERC20-compatible token
        - Minting and burning functions
        - PID controller implementation
        - Access control (onlyOwner)
        - Events for all state changes
    
    Example:
        >>> params = {'alpha': 0.5, 'beta': 0.3, 'delta': 0.1}
        >>> solidity_code = generate_solidity_contract(params)
        >>> print(solidity_code)
    """

def generate_ink_contract(params: dict, contract_name: str = "NexusToken") -> str:
    """Generate Rust/ink! smart contract for Substrate.
    
    Args:
        params: Simulation parameters
        contract_name: Contract name
    
    Returns:
        Complete Rust/ink! contract source code
    
    Features:
        - PSP22-compatible token
        - SafeMath operations
        - Comprehensive error handling
        - Storage optimization
    """
```

---

## Oracle Integration

### OracleManager

```python
class OracleManager:
    """Manage external data sources with retry and circuit breaker."""
    
    def fetch_data(self, source: str, endpoint: str) -> dict:
        """Fetch data from external oracle.
        
        Args:
            source: Oracle source identifier
            endpoint: API endpoint
        
        Returns:
            Fetched data dictionary
        
        Features:
            - Automatic retry (3 attempts, exponential backoff)
            - Circuit breaker (opens after 5 consecutive failures)
            - Timeout handling (5 seconds)
            - Fallback to mock data
        
        Raises:
            OracleError: If all retries exhausted and circuit open
        """
    
    def register_oracle(self, name: str, config: dict):
        """Register new oracle source.
        
        Args:
            name: Oracle identifier
            config: Configuration dictionary:
                - url: Base URL
                - auth: Authentication method
                - timeout: Request timeout
        """
```

---

## Authentication

### AuthManager

```python
class AuthManager:
    """User authentication and session management."""
    
    @staticmethod
    def register_user(username: str, password: str, role: str = 'viewer') -> bool:
        """Register new user.
        
        Args:
            username: Unique username
            password: Password (minimum 8 characters)
            role: User role - 'admin', 'researcher', or 'viewer'
        
        Returns:
            True if registration successful
        
        Security:
            - Password hashed with bcrypt (cost factor 12)
            - Username uniqueness enforced at database level
        """
    
    @staticmethod
    def login_user(username: str, password: str) -> bool:
        """Authenticate user.
        
        Args:
            username: Username
            password: Password
        
        Returns:
            True if authentication successful
        
        Side Effects:
            - Creates session token in st.session_state
            - Sets current_user in session
        """
    
    @staticmethod
    def has_role(required_role: str) -> bool:
        """Check if current user has required role.
        
        Args:
            required_role: Role to check
        
        Returns:
            True if user has role or higher privilege
        
        Role Hierarchy:
            admin > researcher > viewer
        """
```

---

## Database Models

### User

```python
class User(Base):
    """User account model."""
    
    __tablename__ = 'users'
    
    id: int  # Primary key
    username: str  # Unique username
    password_hash: str  # bcrypt hash
    role: str  # 'admin', 'researcher', or 'viewer'
    created_at: datetime  # Registration timestamp
```

### SimulationConfig

```python
class SimulationConfig(Base):
    """Saved simulation parameter set."""
    
    __tablename__ = 'simulation_config'
    
    id: int
    user_id: int  # Foreign key to users
    name: str  # Configuration name (unique per user)
    parameters: dict  # JSONB field with all parameters
    created_at: datetime
```

### SimulationRun

```python
class SimulationRun(Base):
    """Simulation execution result."""
    
    __tablename__ = 'simulation_run'
    
    id: int
    config_id: int  # Foreign key to simulation_config
    results: dict  # JSONB: time-series data (N, I, B, etc.)
    metrics: dict  # JSONB: aggregated metrics
    created_at: datetime
```

---

## Error Handling

### Custom Exceptions

```python
class NexusError(Exception):
    """Base exception for NexusOS errors."""

class ValidationError(NexusError):
    """Parameter validation failed."""

class ConservationError(NexusError):
    """Conservation law violated."""

class DAGCycleError(NexusError):
    """Cycle detected in DAG."""

class EncryptionError(NexusError):
    """Encryption/decryption failed."""

class OracleError(NexusError):
    """External oracle request failed."""
```

---

## Constants and Enums

### TaskStatus

```python
class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
```

### TaskPriority

```python
class TaskPriority(Enum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
```

### EncryptionMethod

```python
class EncryptionMethod(Enum):
    FSE = "FSE"  # Frequency Shift
    AME = "AME"  # Amplitude Modulation
    PME = "PME"  # Phase Modulation
    QIML = "QIML"  # Quantum-Inspired Multi-Layer
```

---

## Utility Functions

### Parameter Validation

```python
def validate_parameters(params: dict) -> List[str]:
    """Validate simulation parameters.
    
    Args:
        params: Parameter dictionary
    
    Returns:
        List of validation error messages (empty if valid)
    
    Checks:
        - All required parameters present
        - Values within valid ranges
        - Type correctness
    """
```

### Data Export

```python
def export_results_csv(results: dict, filename: str):
    """Export simulation results to CSV.
    
    Args:
        results: Simulation results dictionary
        filename: Output file path
    """

def export_results_json(results: dict, filename: str):
    """Export simulation results to JSON.
    
    Args:
        results: Simulation results dictionary
        filename: Output file path
    """
```

---

## Performance Tips

### 1. Use Numba Engine for Large Simulations

```python
# Slow
engine = NexusEngine(params)
results = engine.run_simulation(timesteps=10000)

# Fast (100x speedup)
engine = NexusEngineNumba(params)
results = engine.run_simulation_numba(timesteps=10000)
```

### 2. Vectorize Transaction Processing

```python
# Slow
network.execute_transactions_sequential()

# Fast (10x speedup)
network.execute_transactions_vectorized()
```

### 3. Cache Expensive Computations

```python
@st.cache_data(ttl=300)
def expensive_analysis():
    return compute_results()
```

---

**Last Updated:** November 2025  
**Version:** 1.0

For questions about the API, please consult the [whitepaper](../WHITEPAPER.md) or open a GitHub issue.
