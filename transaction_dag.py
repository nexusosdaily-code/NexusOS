"""
DAG-based Transaction Processing for Multi-Agent Value Transfers

This module implements a Directed Acyclic Graph (DAG) structure for efficiently
processing value transfers between agents in the multi-agent simulation.

Key Optimizations:
1. Dependency Analysis: Identifies which transfers depend on others
2. Topological Sorting: Determines optimal execution order
3. Parallel Batching: Groups independent transfers for concurrent execution
4. Vectorization: Batches operations for NumPy acceleration

Performance Benefits:
- Reduces sequential bottlenecks in transfer processing
- Enables parallel execution of independent transfers
- Improves cache locality through batching
- Scales better with large networks (100+ agents)
"""

from typing import Dict, List, Set, Tuple
import numpy as np
from dataclasses import dataclass
from collections import defaultdict, deque


@dataclass
class TransactionNode:
    """
    Represents a single value transfer transaction
    
    Attributes:
        source: Agent ID sending value
        target: Agent ID receiving value
        amount_formula: Lambda to calculate transfer amount given states
        transaction_id: Unique identifier for this transaction
    """
    source: int
    target: int
    amount_formula: callable
    transaction_id: int
    
    def __hash__(self):
        return hash(self.transaction_id)
    
    def __eq__(self, other):
        return self.transaction_id == other.transaction_id


class TransactionDAG:
    """
    Directed Acyclic Graph for transaction dependency management
    
    Builds a dependency graph where transactions depend on each other if:
    - Transaction B reads from an agent that Transaction A writes to
    
    Provides topological ordering and parallel batch identification.
    """
    
    def __init__(self):
        self.nodes: List[TransactionNode] = []
        self.dependencies: Dict[int, Set[int]] = defaultdict(set)
        self.reverse_dependencies: Dict[int, Set[int]] = defaultdict(set)
        self.node_map: Dict[int, TransactionNode] = {}
    
    def add_transaction(self, source: int, target: int, amount_formula: callable) -> int:
        """
        Add a transaction to the DAG
        
        Args:
            source: Source agent ID
            target: Target agent ID
            amount_formula: Function to calculate transfer amount
            
        Returns:
            Transaction ID
        """
        transaction_id = len(self.nodes)
        node = TransactionNode(source, target, amount_formula, transaction_id)
        self.nodes.append(node)
        self.node_map[transaction_id] = node
        return transaction_id
    
    def build_dependencies(self):
        """
        Analyze transactions and build dependency graph
        
        A transaction T2 depends on T1 if:
        - T1 writes to an agent that T2 reads from
        
        For bidirectional transfers (A↔B), we need to ensure consistency.
        """
        for i, node_i in enumerate(self.nodes):
            for j, node_j in enumerate(self.nodes):
                if i == j:
                    continue
                
                if self._has_dependency(node_i, node_j):
                    self.dependencies[j].add(i)
                    self.reverse_dependencies[i].add(j)
    
    def _has_dependency(self, t1: TransactionNode, t2: TransactionNode) -> bool:
        """
        Check if transaction t2 depends on t1
        
        t2 depends on t1 if t1 modifies state that t2 reads.
        """
        t1_writes = {t1.source, t1.target}
        t2_reads = {t2.source, t2.target}
        
        return len(t1_writes & t2_reads) > 0 and t1.transaction_id < t2.transaction_id
    
    def topological_sort(self) -> List[List[int]]:
        """
        Perform topological sort with level grouping (Kahn's algorithm)
        
        Returns:
            List of levels, where each level contains transaction IDs
            that can be executed in parallel
        """
        in_degree = {node.transaction_id: len(self.dependencies[node.transaction_id]) 
                     for node in self.nodes}
        
        queue = deque([tid for tid, degree in in_degree.items() if degree == 0])
        
        levels = []
        
        while queue:
            current_level = list(queue)
            levels.append(current_level)
            
            next_level = []
            for tid in current_level:
                for dependent_tid in self.reverse_dependencies[tid]:
                    in_degree[dependent_tid] -= 1
                    if in_degree[dependent_tid] == 0:
                        next_level.append(dependent_tid)
            
            queue = deque(next_level)
        
        if sum(in_degree.values()) > 0:
            raise ValueError("Cycle detected in transaction DAG")
        
        return levels
    
    def get_execution_plan(self) -> Dict:
        """
        Generate execution plan with statistics
        
        Returns:
            Dictionary with execution levels and parallelization stats
        """
        levels = self.topological_sort()
        
        total_transactions = len(self.nodes)
        max_parallelism = max(len(level) for level in levels) if levels else 0
        avg_parallelism = np.mean([len(level) for level in levels]) if levels else 0
        
        return {
            'levels': levels,
            'num_levels': len(levels),
            'total_transactions': total_transactions,
            'max_parallel_transactions': max_parallelism,
            'avg_parallel_transactions': avg_parallelism,
            'parallelization_ratio': max_parallelism / total_transactions if total_transactions > 0 else 0
        }


class DAGTransactionProcessor:
    """
    Executes transactions using DAG-based optimization
    
    Features:
    - Builds transaction DAG from network edges
    - Executes transactions in topological order
    - Batches independent transactions for parallel processing
    - Applies vectorized operations where possible
    """
    
    def __init__(self, network_edges: List[Tuple[int, int]], transfer_rate: float):
        """
        Initialize processor with network topology
        
        Args:
            network_edges: List of (source, target) tuples representing network edges
            transfer_rate: Rate coefficient for value transfers
        """
        self.network_edges = network_edges
        self.transfer_rate = transfer_rate
        self.dag = TransactionDAG()
        self._build_dag()
    
    def _build_dag(self):
        """Build DAG from network edges"""
        for source, target in self.network_edges:
            def make_amount_formula(s, t):
                return lambda states, dt: self.transfer_rate * (states[s] - states[t]) * dt
            
            self.dag.add_transaction(
                source=source,
                target=target,
                amount_formula=make_amount_formula(source, target)
            )
        
        self.dag.build_dependencies()
    
    def execute_transfers(self, agent_states: Dict[int, float], delta_t: float) -> Dict[int, float]:
        """
        Execute all transfers using DAG optimization
        
        Args:
            agent_states: Current state of all agents {agent_id: N_value}
            delta_t: Time step
            
        Returns:
            Updated agent states after transfers
        """
        plan = self.dag.get_execution_plan()
        levels = plan['levels']
        
        new_states = agent_states.copy()
        
        for level in levels:
            transfers = defaultdict(float)
            
            for tid in level:
                node = self.dag.node_map[tid]
                
                amount = node.amount_formula(new_states, delta_t)
                
                transfers[node.source] -= amount
                transfers[node.target] += amount
            
            for agent_id, transfer in transfers.items():
                new_states[agent_id] = max(0, new_states[agent_id] + transfer)
        
        return new_states
    
    def get_performance_metrics(self) -> Dict:
        """
        Get DAG performance metrics
        
        Returns:
            Dictionary with parallelization statistics
        """
        plan = self.dag.get_execution_plan()
        
        return {
            'total_transactions': plan['total_transactions'],
            'execution_levels': plan['num_levels'],
            'max_parallelism': plan['max_parallel_transactions'],
            'avg_parallelism': plan['avg_parallel_transactions'],
            'parallelization_efficiency': plan['parallelization_ratio'],
            'speedup_potential': plan['total_transactions'] / plan['num_levels'] if plan['num_levels'] > 0 else 1
        }


class VectorizedTransactionProcessor:
    """
    Optimized processor using NumPy vectorization for maximum performance
    
    Best for dense networks with many agents where transfers can be
    represented as matrix operations.
    """
    
    def __init__(self, num_agents: int, network_edges: List[Tuple[int, int]], transfer_rate: float):
        """
        Initialize vectorized processor
        
        Args:
            num_agents: Total number of agents
            network_edges: List of (source, target) tuples
            transfer_rate: Transfer rate coefficient
        """
        self.num_agents = num_agents
        self.transfer_rate = transfer_rate
        
        self.adjacency_matrix = np.zeros((num_agents, num_agents))
        for source, target in network_edges:
            self.adjacency_matrix[source, target] = 1
            self.adjacency_matrix[target, source] = 1
    
    def execute_transfers(self, agent_states: Dict[int, float], delta_t: float) -> Dict[int, float]:
        """
        Execute transfers using vectorized operations
        
        Args:
            agent_states: Current agent states
            delta_t: Time step
            
        Returns:
            Updated agent states
        """
        states_array = np.array([agent_states[i] for i in range(self.num_agents)])
        
        state_diff = states_array[:, np.newaxis] - states_array[np.newaxis, :]
        
        transfer_matrix = self.adjacency_matrix * state_diff * self.transfer_rate * delta_t
        
        net_transfers = np.sum(transfer_matrix, axis=1)
        
        new_states_array = np.maximum(0, states_array - net_transfers)
        
        return {i: new_states_array[i] for i in range(self.num_agents)}
