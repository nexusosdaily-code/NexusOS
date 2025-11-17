import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import networkx as nx
from nexus_engine import NexusEngine
from signal_generators import SignalGenerator
from transaction_dag import DAGTransactionProcessor, VectorizedTransactionProcessor


class NetworkTopology:
    """Factory for creating different network topologies"""
    
    @staticmethod
    def fully_connected(num_nodes: int) -> nx.Graph:
        """Create a fully connected network where every node connects to every other node"""
        return nx.complete_graph(num_nodes)
    
    @staticmethod
    def hub_and_spoke(num_nodes: int) -> nx.Graph:
        """Create a hub-and-spoke network with one central hub connected to all others"""
        G = nx.Graph()
        G.add_nodes_from(range(num_nodes))
        
        hub = 0
        for node in range(1, num_nodes):
            G.add_edge(hub, node)
        
        return G
    
    @staticmethod
    def random_graph(num_nodes: int, connection_prob: float = 0.3) -> nx.Graph:
        """Create a random graph with given connection probability"""
        return nx.erdos_renyi_graph(num_nodes, connection_prob)
    
    @staticmethod
    def ring(num_nodes: int) -> nx.Graph:
        """Create a ring network where each node connects to its neighbors"""
        return nx.cycle_graph(num_nodes)
    
    @staticmethod
    def small_world(num_nodes: int, k: int = 4, p: float = 0.3) -> nx.Graph:
        """Create a small-world network (Watts-Strogatz model)"""
        return nx.watts_strogatz_graph(num_nodes, k, p)


class MultiAgentNexusSimulation:
    """
    Multi-agent Nexus simulation where multiple nodes interact in a network.
    Each node has its own Nexus state N(t) and can transfer value to connected neighbors.
    """
    
    def __init__(
        self,
        num_agents: int,
        base_params: Dict,
        signal_configs: Dict,
        network_topology: str = 'fully_connected',
        transfer_rate: float = 0.01,
        network_influence: float = 0.1,
        use_dag_optimization: bool = True,
        use_vectorized: bool = False
    ):
        """
        Initialize multi-agent simulation
        
        Args:
            num_agents: Number of agents in the network
            base_params: Base parameter set for each agent
            signal_configs: Signal configurations for inputs
            network_topology: Type of network ('fully_connected', 'hub_spoke', 'random', 'ring', 'small_world')
            transfer_rate: Rate at which value transfers occur between connected nodes
            network_influence: How much network neighbors influence each node's system health
            use_dag_optimization: Whether to use DAG-based transaction processing (default: True)
            use_vectorized: Whether to use vectorized matrix operations (default: False, overrides DAG if True)
        """
        self.num_agents = num_agents
        self.base_params = base_params
        self.signal_configs = signal_configs
        self.transfer_rate = transfer_rate
        self.network_influence = network_influence
        self.use_dag_optimization = use_dag_optimization
        self.use_vectorized = use_vectorized
        
        self.network = self._create_network(network_topology)
        
        self.engines = [NexusEngine(base_params.copy()) for _ in range(num_agents)]
        
        self.agent_states = {
            i: base_params['N_initial'] for i in range(num_agents)
        }
        
        network_edges = list(self.network.edges())
        if self.use_vectorized:
            self.transaction_processor = VectorizedTransactionProcessor(
                num_agents, network_edges, transfer_rate
            )
        elif self.use_dag_optimization:
            self.transaction_processor = DAGTransactionProcessor(
                network_edges, transfer_rate
            )
        else:
            self.transaction_processor = None
        
    def _create_network(self, topology: str) -> nx.Graph:
        """Create network based on specified topology"""
        if topology == 'fully_connected':
            return NetworkTopology.fully_connected(self.num_agents)
        elif topology == 'hub_spoke':
            return NetworkTopology.hub_and_spoke(self.num_agents)
        elif topology == 'random':
            return NetworkTopology.random_graph(self.num_agents, connection_prob=0.3)
        elif topology == 'ring':
            return NetworkTopology.ring(self.num_agents)
        elif topology == 'small_world':
            return NetworkTopology.small_world(self.num_agents, k=min(4, self.num_agents-1), p=0.3)
        else:
            raise ValueError(f"Unknown topology: {topology}")
    
    def _calculate_network_health(self, agent_id: int) -> float:
        """
        Calculate network-influenced health for an agent based on neighbors' states
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            Network health contribution (0-1 scale)
        """
        neighbors = list(self.network.neighbors(agent_id))
        
        if not neighbors:
            return 1.0
        
        neighbor_states = [self.agent_states[n] for n in neighbors]
        avg_neighbor_state = np.mean(neighbor_states)
        
        own_state = self.agent_states[agent_id]
        
        if own_state == 0:
            return 0.0
        
        network_health = min(1.0, avg_neighbor_state / (own_state + 1e-10))
        
        return network_health
    
    def _execute_value_transfers(self, delta_t: float):
        """
        Execute value transfers between connected nodes
        
        Transfers flow from nodes with higher N to nodes with lower N,
        simulating resource redistribution in the network.
        
        Uses DAG-based optimization if enabled for better performance.
        """
        if self.transaction_processor is not None:
            self.agent_states = self.transaction_processor.execute_transfers(
                self.agent_states, delta_t
            )
        else:
            transfers = {}
            
            for edge in self.network.edges():
                node_a, node_b = edge
                
                N_a = self.agent_states[node_a]
                N_b = self.agent_states[node_b]
                
                transfer_amount = self.transfer_rate * (N_a - N_b) * delta_t
                
                if node_a not in transfers:
                    transfers[node_a] = 0
                if node_b not in transfers:
                    transfers[node_b] = 0
                
                transfers[node_a] -= transfer_amount
                transfers[node_b] += transfer_amount
            
            for agent_id, transfer in transfers.items():
                self.agent_states[agent_id] = max(0, self.agent_states[agent_id] + transfer)
    
    def run_simulation(
        self,
        agent_signals: Dict[int, Dict] | None = None,
        enable_transfers: bool = True
    ) -> pd.DataFrame:
        """
        Run multi-agent simulation
        
        Args:
            agent_signals: Optional dict mapping agent_id to custom signal configs
                          If None, all agents use the same base signal configs
            enable_transfers: Whether to enable value transfers between agents
            
        Returns:
            DataFrame with time series for all agents
        """
        num_steps = self.base_params['num_steps']
        delta_t = self.base_params['delta_t']
        
        if agent_signals is None:
            agent_signals = {i: self.signal_configs for i in range(self.num_agents)}
        
        generated_signals = {}
        for agent_id in range(self.num_agents):
            signals = agent_signals[agent_id]
            generated_signals[agent_id] = {
                'H': SignalGenerator.generate_from_config(signals['H'], num_steps, delta_t),
                'M': SignalGenerator.generate_from_config(signals['M'], num_steps, delta_t),
                'D': SignalGenerator.generate_from_config(signals['D'], num_steps, delta_t),
                'E': SignalGenerator.generate_from_config(signals['E'], num_steps, delta_t),
                'C_cons': SignalGenerator.generate_from_config(signals['C_cons'], num_steps, delta_t),
                'C_disp': SignalGenerator.generate_from_config(signals['C_disp'], num_steps, delta_t),
            }
        
        results = {
            't': [],
        }
        
        for agent_id in range(self.num_agents):
            results[f'N_{agent_id}'] = []
            results[f'I_{agent_id}'] = []
            results[f'B_{agent_id}'] = []
            results[f'S_{agent_id}'] = []
        
        for step in range(num_steps):
            t = step * delta_t
            results['t'].append(t)
            
            step_states = {}
            
            for agent_id in range(self.num_agents):
                N = self.agent_states[agent_id]
                signals = generated_signals[agent_id]
                
                H = signals['H'][step]
                M = signals['M'][step]
                D = signals['D'][step]
                E = np.clip(signals['E'][step], 0.0, 1.0)
                C_cons = signals['C_cons'][step]
                C_disp = signals['C_disp'][step]
                
                network_health = self._calculate_network_health(agent_id)
                E_effective = (1 - self.network_influence) * E + self.network_influence * network_health
                E_effective = np.clip(E_effective, 0.0, 1.0)
                
                N_next, diagnostics = self.engines[agent_id].step(
                    N, H, M, D, E_effective, C_cons, C_disp, delta_t
                )
                
                step_states[agent_id] = N_next
                
                results[f'N_{agent_id}'].append(N_next)
                results[f'I_{agent_id}'].append(diagnostics['I'])
                results[f'B_{agent_id}'].append(diagnostics['B'])
                results[f'S_{agent_id}'].append(diagnostics['S'])
            
            for agent_id in range(self.num_agents):
                self.agent_states[agent_id] = step_states[agent_id]
            
            if enable_transfers:
                self._execute_value_transfers(delta_t)
        
        return pd.DataFrame(results)
    
    def get_network_metrics(self) -> Dict:
        """Calculate network topology metrics"""
        return {
            'num_nodes': self.network.number_of_nodes(),
            'num_edges': self.network.number_of_edges(),
            'density': nx.density(self.network),
            'avg_clustering': nx.average_clustering(self.network),
            'diameter': nx.diameter(self.network) if nx.is_connected(self.network) else None,
            'avg_degree': np.mean([d for n, d in self.network.degree()]),
            'is_connected': nx.is_connected(self.network)
        }
    
    def get_network_layout(self) -> Dict[int, Tuple[float, float]]:
        """Get network layout positions for visualization"""
        return nx.spring_layout(self.network, seed=42)
    
    def get_transaction_metrics(self) -> Dict:
        """
        Get transaction processing metrics (only available with DAG optimization)
        
        Returns:
            Dictionary with parallelization statistics, or None if DAG not enabled
        """
        if hasattr(self.transaction_processor, 'get_performance_metrics'):
            return self.transaction_processor.get_performance_metrics()
        return {
            'optimization': 'sequential',
            'message': 'Enable use_dag_optimization=True for detailed metrics'
        }
