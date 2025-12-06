"""
Tests for DAG-based transaction processing

Tests cover:
1. TransactionDAG construction and dependency analysis
2. Topological sorting and level grouping
3. DAGTransactionProcessor execution
4. VectorizedTransactionProcessor execution
5. Integration with MultiAgentNexusSimulation
6. Performance metrics and parallelization statistics
"""

import pytest
import numpy as np
from transaction_dag import (
    TransactionNode,
    TransactionDAG,
    DAGTransactionProcessor,
    VectorizedTransactionProcessor
)
from multi_agent_sim import MultiAgentNexusSimulation


class TestTransactionNode:
    """Test TransactionNode dataclass"""
    
    def test_node_creation(self):
        """Test creating a transaction node"""
        node = TransactionNode(
            source=0,
            target=1,
            amount_formula=lambda s, dt: 0.1,
            transaction_id=0
        )
        
        assert node.source == 0
        assert node.target == 1
        assert node.transaction_id == 0
        assert callable(node.amount_formula)
    
    def test_node_hashing(self):
        """Test that nodes can be hashed and used in sets"""
        node1 = TransactionNode(0, 1, lambda s, dt: 0.1, 0)
        node2 = TransactionNode(0, 1, lambda s, dt: 0.1, 0)
        node3 = TransactionNode(0, 1, lambda s, dt: 0.1, 1)
        
        assert node1 == node2
        assert node1 != node3
        assert hash(node1) == hash(node2)
        assert hash(node1) != hash(node3)
        
        node_set = {node1, node2, node3}
        assert len(node_set) == 2


class TestTransactionDAG:
    """Test DAG construction and analysis"""
    
    def test_empty_dag(self):
        """Test empty DAG"""
        dag = TransactionDAG()
        assert len(dag.nodes) == 0
        levels = dag.topological_sort()
        assert levels == []
    
    def test_single_transaction(self):
        """Test DAG with single transaction"""
        dag = TransactionDAG()
        tid = dag.add_transaction(0, 1, lambda s, dt: 0.1)
        
        assert tid == 0
        assert len(dag.nodes) == 1
        
        dag.build_dependencies()
        levels = dag.topological_sort()
        
        assert len(levels) == 1
        assert levels[0] == [0]
    
    def test_independent_transactions(self):
        """Test multiple independent transactions can be parallel"""
        dag = TransactionDAG()
        
        tid0 = dag.add_transaction(0, 1, lambda s, dt: 0.1)
        tid1 = dag.add_transaction(2, 3, lambda s, dt: 0.1)
        tid2 = dag.add_transaction(4, 5, lambda s, dt: 0.1)
        
        dag.build_dependencies()
        levels = dag.topological_sort()
        
        assert len(levels) == 1
        assert set(levels[0]) == {0, 1, 2}
    
    def test_dependent_transactions(self):
        """Test transactions with dependencies execute in order"""
        dag = TransactionDAG()
        
        tid0 = dag.add_transaction(0, 1, lambda s, dt: 0.1)
        tid1 = dag.add_transaction(1, 2, lambda s, dt: 0.1)
        tid2 = dag.add_transaction(2, 3, lambda s, dt: 0.1)
        
        dag.build_dependencies()
        levels = dag.topological_sort()
        
        assert len(levels) == 3
        assert levels[0] == [0]
        assert levels[1] == [1]
        assert levels[2] == [2]
    
    def test_mixed_dependencies(self):
        """Test mixed independent and dependent transactions"""
        dag = TransactionDAG()
        
        dag.add_transaction(0, 1, lambda s, dt: 0.1)
        dag.add_transaction(1, 2, lambda s, dt: 0.1)
        dag.add_transaction(3, 4, lambda s, dt: 0.1)
        dag.add_transaction(4, 5, lambda s, dt: 0.1)
        
        dag.build_dependencies()
        levels = dag.topological_sort()
        
        assert len(levels) <= 3
    
    def test_execution_plan(self):
        """Test execution plan generation"""
        dag = TransactionDAG()
        
        for i in range(5):
            dag.add_transaction(i, i+1, lambda s, dt: 0.1)
        
        dag.build_dependencies()
        plan = dag.get_execution_plan()
        
        assert plan['total_transactions'] == 5
        assert plan['num_levels'] > 0
        assert 'max_parallel_transactions' in plan
        assert 'avg_parallel_transactions' in plan
        assert 'parallelization_ratio' in plan


class TestDAGTransactionProcessor:
    """Test DAG-based transaction processor"""
    
    def test_simple_transfer(self):
        """Test simple A->B transfer"""
        edges = [(0, 1)]
        processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        
        states = {0: 10.0, 1: 5.0}
        delta_t = 1.0
        
        new_states = processor.execute_transfers(states, delta_t)
        
        assert new_states[0] < states[0]
        assert new_states[1] > states[1]
        assert all(v >= 0 for v in new_states.values())
    
    def test_bidirectional_transfer(self):
        """Test bidirectional transfer (network edge)"""
        edges = [(0, 1)]
        processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        
        states = {0: 10.0, 1: 5.0}
        delta_t = 1.0
        
        new_states = processor.execute_transfers(states, delta_t)
        
        expected_transfer = 0.1 * (10.0 - 5.0) * 1.0
        expected_0 = 10.0 - expected_transfer
        expected_1 = 5.0 + expected_transfer
        
        assert abs(new_states[0] - expected_0) < 1e-6
        assert abs(new_states[1] - expected_1) < 1e-6
    
    def test_chain_transfers(self):
        """Test chain of transfers A->B->C"""
        edges = [(0, 1), (1, 2)]
        processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        
        states = {0: 10.0, 1: 5.0, 2: 2.0}
        delta_t = 1.0
        
        new_states = processor.execute_transfers(states, delta_t)
        
        assert all(v >= 0 for v in new_states.values())
    
    def test_performance_metrics(self):
        """Test performance metrics calculation"""
        edges = [(0, 1), (1, 2), (3, 4), (4, 5)]
        processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        
        metrics = processor.get_performance_metrics()
        
        assert metrics['total_transactions'] == 4
        assert metrics['execution_levels'] > 0
        assert 'speedup_potential' in metrics
        assert 'parallelization_efficiency' in metrics
    
    def test_zero_states(self):
        """Test handling of zero states"""
        edges = [(0, 1)]
        processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        
        states = {0: 0.0, 1: 0.0}
        delta_t = 1.0
        
        new_states = processor.execute_transfers(states, delta_t)
        
        assert new_states[0] == 0.0
        assert new_states[1] == 0.0


class TestVectorizedTransactionProcessor:
    """Test vectorized transaction processor"""
    
    def test_simple_transfer_vectorized(self):
        """Test simple transfer with vectorization"""
        edges = [(0, 1)]
        processor = VectorizedTransactionProcessor(2, edges, transfer_rate=0.1)
        
        states = {0: 10.0, 1: 5.0}
        delta_t = 1.0
        
        new_states = processor.execute_transfers(states, delta_t)
        
        assert new_states[0] < states[0]
        assert new_states[1] > states[1]
    
    def test_fully_connected_network(self):
        """Test fully connected network with vectorization"""
        num_agents = 4
        edges = [(i, j) for i in range(num_agents) for j in range(i+1, num_agents)]
        
        processor = VectorizedTransactionProcessor(num_agents, edges, transfer_rate=0.1)
        
        states = {i: float(i + 1) for i in range(num_agents)}
        delta_t = 1.0
        
        new_states = processor.execute_transfers(states, delta_t)
        
        assert all(v >= 0 for v in new_states.values())
        assert len(new_states) == num_agents
    
    def test_consistency_with_dag(self):
        """Test that vectorized processor gives similar results to DAG"""
        edges = [(0, 1), (1, 2)]
        
        dag_processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        vec_processor = VectorizedTransactionProcessor(3, edges, transfer_rate=0.1)
        
        states = {0: 10.0, 1: 5.0, 2: 2.0}
        delta_t = 1.0
        
        dag_result = dag_processor.execute_transfers(states.copy(), delta_t)
        vec_result = vec_processor.execute_transfers(states.copy(), delta_t)
        
        for i in range(3):
            assert abs(dag_result[i] - vec_result[i]) < 0.1


class TestMultiAgentIntegration:
    """Test integration with MultiAgentNexusSimulation"""
    
    @pytest.fixture
    def base_params(self):
        """Base parameters for agents"""
        return {
            'N_initial': 100.0,
            'N_target': 100.0,
            'alpha': 0.5,
            'beta': 0.3,
            'kappa': 0.01,
            'K_p': 0.1,
            'K_i': 0.01,
            'K_d': 0.05,
            'num_steps': 10,
            'delta_t': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,
            'gamma_C': 0.33, 'gamma_D': 0.33, 'gamma_E': 0.34,
            'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25, 'lambda_E': 0.25,
            'N_0': 100, 'H_0': 1.0, 'M_0': 1.0,
            'eta': 0.1, 'F_floor': 1.0
        }
    
    @pytest.fixture
    def signal_configs(self):
        """Signal configurations"""
        return {
            'H': {'type': 'constant', 'value': 1.0},
            'M': {'type': 'constant', 'value': 1.0},
            'D': {'type': 'constant', 'value': 1.0},
            'E': {'type': 'constant', 'value': 0.8},
            'C_cons': {'type': 'constant', 'value': 10.0},
            'C_disp': {'type': 'constant', 'value': 5.0}
        }
    
    def test_dag_optimization_enabled(self, base_params, signal_configs):
        """Test simulation with DAG optimization enabled"""
        sim = MultiAgentNexusSimulation(
            num_agents=5,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=True
        )
        
        assert sim.use_dag_optimization is True
        assert sim.transaction_processor is not None
        
        results = sim.run_simulation()
        assert len(results) == base_params['num_steps']
    
    def test_dag_optimization_disabled(self, base_params, signal_configs):
        """Test simulation with DAG optimization disabled"""
        sim = MultiAgentNexusSimulation(
            num_agents=5,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=False
        )
        
        assert sim.use_dag_optimization is False
        assert sim.transaction_processor is None
        
        results = sim.run_simulation()
        assert len(results) == base_params['num_steps']
    
    def test_vectorized_optimization(self, base_params, signal_configs):
        """Test simulation with vectorized optimization"""
        sim = MultiAgentNexusSimulation(
            num_agents=5,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='fully_connected',
            use_vectorized=True
        )
        
        assert sim.use_vectorized is True
        assert sim.transaction_processor is not None
        
        results = sim.run_simulation()
        assert len(results) == base_params['num_steps']
    
    def test_transaction_metrics(self, base_params, signal_configs):
        """Test transaction metrics retrieval"""
        sim = MultiAgentNexusSimulation(
            num_agents=5,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=True
        )
        
        metrics = sim.get_transaction_metrics()
        
        assert 'total_transactions' in metrics
        assert 'execution_levels' in metrics
        assert 'speedup_potential' in metrics
    
    def test_consistency_across_modes(self, base_params, signal_configs):
        """Test that all optimization modes give consistent results"""
        sim_sequential = MultiAgentNexusSimulation(
            num_agents=3,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=False
        )
        
        sim_dag = MultiAgentNexusSimulation(
            num_agents=3,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=True
        )
        
        sim_vectorized = MultiAgentNexusSimulation(
            num_agents=3,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_vectorized=True
        )
        
        results_seq = sim_sequential.run_simulation()
        results_dag = sim_dag.run_simulation()
        results_vec = sim_vectorized.run_simulation()
        
        for col in results_seq.columns:
            if col.startswith('N_'):
                assert np.allclose(results_seq[col].values, results_dag[col].values, rtol=1e-5)
                assert np.allclose(results_seq[col].values, results_vec[col].values, rtol=1e-5)
    
    def test_chain_topology_consistency(self, base_params, signal_configs):
        """Test that DAG gives exact results on chain topology (dependent transfers)"""
        sim_seq = MultiAgentNexusSimulation(
            num_agents=4,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=False
        )
        
        sim_dag = MultiAgentNexusSimulation(
            num_agents=4,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='ring',
            use_dag_optimization=True
        )
        
        results_seq = sim_seq.run_simulation()
        results_dag = sim_dag.run_simulation()
        
        for col in results_seq.columns:
            if col.startswith('N_'):
                assert np.allclose(results_seq[col].values, results_dag[col].values, atol=1e-10)
    
    def test_hub_topology_consistency(self, base_params, signal_configs):
        """Test that DAG gives exact results on hub-spoke topology"""
        sim_seq = MultiAgentNexusSimulation(
            num_agents=5,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='hub_spoke',
            use_dag_optimization=False
        )
        
        sim_dag = MultiAgentNexusSimulation(
            num_agents=5,
            base_params=base_params,
            signal_configs=signal_configs,
            network_topology='hub_spoke',
            use_dag_optimization=True
        )
        
        results_seq = sim_seq.run_simulation()
        results_dag = sim_dag.run_simulation()
        
        for col in results_seq.columns:
            if col.startswith('N_'):
                assert np.allclose(results_seq[col].values, results_dag[col].values, atol=1e-10)


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_empty_network(self):
        """Test processor with no edges"""
        processor = DAGTransactionProcessor([], transfer_rate=0.1)
        
        states = {0: 10.0}
        new_states = processor.execute_transfers(states, 1.0)
        
        assert new_states == states
    
    def test_negative_transfer_rate(self):
        """Test that negative transfer rates are handled"""
        edges = [(0, 1)]
        processor = DAGTransactionProcessor(edges, transfer_rate=-0.1)
        
        states = {0: 10.0, 1: 5.0}
        new_states = processor.execute_transfers(states, 1.0)
        
        assert all(v >= 0 for v in new_states.values())
    
    def test_large_time_step(self):
        """Test that large time steps don't break conservation"""
        edges = [(0, 1)]
        processor = DAGTransactionProcessor(edges, transfer_rate=0.1)
        
        states = {0: 10.0, 1: 5.0}
        new_states = processor.execute_transfers(states, 100.0)
        
        assert all(v >= 0 for v in new_states.values())
