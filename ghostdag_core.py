"""
GhostDAG Core Engine - PHANTOM Protocol Implementation
Enables parallel block processing and DAG-based consensus for high-throughput blockchain.

Based on the PHANTOM protocol: A Scalable BlockDAG Protocol
Eliminates bottlenecks by allowing multiple blocks to be created in parallel.
"""

import hashlib
import time
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from collections import deque
import networkx as nx
import numpy as np

@dataclass
class DAGBlock:
    """Block in the GhostDAG structure."""
    block_id: str
    timestamp: float
    parent_blocks: List[str]  # Multiple parents allowed (DAG structure)
    data: Dict
    creator: str
    hash: str = ""
    
    # GhostDAG specific
    blue_score: int = 0  # Number of blue (honest) blocks in past
    is_blue: bool = True  # Blue = honest chain, Red = potential attack
    topological_order: int = -1
    
    def __post_init__(self):
        if not self.hash:
            self.hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        """Compute block hash."""
        content = f"{self.block_id}{self.timestamp}{self.parent_blocks}{self.data}{self.creator}"
        return hashlib.sha256(content.encode()).hexdigest()


class GhostDAGEngine:
    """
    GhostDAG consensus engine implementing PHANTOM protocol.
    
    Key Features:
    - Parallel block creation (no linear chain bottleneck)
    - Byzantine fault tolerance with parameter k
    - Topological ordering for consensus
    - Blue/Red block classification (honest vs. attack)
    """
    
    def __init__(self, k: int = 3):
        """
        Initialize GhostDAG engine.
        
        Args:
            k: Security parameter - max number of blocks created in parallel
               by honest nodes. Higher k = more parallelism but slower consensus.
        """
        self.k = k
        self.dag = nx.DiGraph()  # Directed Acyclic Graph
        self.blocks: Dict[str, DAGBlock] = {}
        self.genesis_id = "genesis"
        self.tips: Set[str] = set()  # Current DAG tips (blocks with no children)
        
        # Performance metrics
        self.total_blocks = 0
        self.blue_blocks = 0
        self.red_blocks = 0
        self.average_confirmation_time = 0.0
        
        # Initialize genesis block
        self._create_genesis()
    
    def _create_genesis(self):
        """Create the genesis block."""
        genesis = DAGBlock(
            block_id=self.genesis_id,
            timestamp=time.time(),
            parent_blocks=[],
            data={"type": "genesis"},
            creator="system",
            blue_score=0,
            is_blue=True,
            topological_order=0
        )
        self.blocks[self.genesis_id] = genesis
        self.dag.add_node(self.genesis_id)
        self.tips.add(self.genesis_id)
    
    def add_block(self, block_id: str, data: Dict, creator: str, 
                  parent_blocks: Optional[List[str]] = None) -> DAGBlock:
        """
        Add a new block to the DAG.
        
        Args:
            block_id: Unique identifier
            data: Block data payload
            creator: Block creator/validator
            parent_blocks: Parent block IDs. If None, uses current tips.
        
        Returns:
            Created DAGBlock
        """
        if parent_blocks is None:
            # Reference all current tips for maximum parallelism
            parent_blocks = list(self.tips)
        
        # Create block
        block = DAGBlock(
            block_id=block_id,
            timestamp=time.time(),
            parent_blocks=parent_blocks,
            data=data,
            creator=creator
        )
        
        # Add to DAG
        self.blocks[block_id] = block
        self.dag.add_node(block_id)
        
        # Add edges from parents
        for parent_id in parent_blocks:
            if parent_id in self.blocks:
                self.dag.add_edge(parent_id, block_id)
        
        # Update tips
        self.tips.add(block_id)
        for parent_id in parent_blocks:
            if parent_id in self.tips:
                self.tips.discard(parent_id)
        
        # Run PHANTOM protocol to classify block
        self._classify_block(block)
        
        # Update topological order
        self._update_topological_order()
        
        self.total_blocks += 1
        if block.is_blue:
            self.blue_blocks += 1
        else:
            self.red_blocks += 1
        
        return block
    
    def _classify_block(self, block: DAGBlock):
        """
        Classify block as blue (honest) or red (attack) using PHANTOM protocol.
        
        A block is blue if it has at most k red blocks in its anticone.
        Anticone = blocks that are neither ancestors nor descendants.
        """
        block_id = block.block_id
        
        # Get all ancestors
        ancestors = set(nx.ancestors(self.dag, block_id))
        
        # Get all descendants (should be empty for new block, but general case)
        descendants = set(nx.descendants(self.dag, block_id))
        
        # Anticone = all other blocks that are neither ancestors nor descendants
        all_blocks = set(self.blocks.keys())
        anticone = all_blocks - ancestors - descendants - {block_id}
        
        # Count red blocks in anticone
        red_in_anticone = sum(
            1 for bid in anticone 
            if bid in self.blocks and not self.blocks[bid].is_blue
        )
        
        # Classify: blue if red_in_anticone <= k
        block.is_blue = (red_in_anticone <= self.k)
        
        # Calculate blue score (number of blue ancestors)
        block.blue_score = sum(
            1 for bid in ancestors 
            if bid in self.blocks and self.blocks[bid].is_blue
        )
    
    def _update_topological_order(self):
        """
        Update topological ordering of all blocks.
        This determines the consensus ordering of blocks.
        """
        try:
            # Get topological sort
            ordered_blocks = list(nx.topological_sort(self.dag))
            
            # Assign topological order
            for i, block_id in enumerate(ordered_blocks):
                if block_id in self.blocks:
                    self.blocks[block_id].topological_order = i
        except nx.NetworkXError:
            # Cycle detected - shouldn't happen in DAG
            pass
    
    def get_ordered_chain(self) -> List[DAGBlock]:
        """
        Get the canonical chain of blue blocks in topological order.
        This is the consensus ordering.
        """
        blue_blocks = [
            block for block in self.blocks.values() 
            if block.is_blue
        ]
        return sorted(blue_blocks, key=lambda b: b.topological_order)
    
    def get_tips(self) -> List[DAGBlock]:
        """Get current DAG tips."""
        return [self.blocks[tip_id] for tip_id in self.tips if tip_id in self.blocks]
    
    def simulate_parallel_block_creation(self, num_blocks: int, 
                                         num_creators: int = 5) -> Dict:
        """
        Simulate parallel block creation to test DAG performance.
        
        Args:
            num_blocks: Number of blocks to create
            num_creators: Number of parallel block creators
        
        Returns:
            Performance metrics
        """
        start_time = time.time()
        creators = [f"creator_{i}" for i in range(num_creators)]
        
        # Simulate parallel creation
        for i in range(num_blocks):
            creator = creators[i % num_creators]
            
            # Randomly select 1-3 recent tips as parents (simulates network latency)
            available_tips = list(self.tips)
            num_parents = min(len(available_tips), np.random.randint(1, 4))
            parent_blocks = np.random.choice(available_tips, num_parents, replace=False).tolist()
            
            self.add_block(
                block_id=f"block_{i}",
                data={
                    "transactions": f"tx_batch_{i}",
                    "value": np.random.randint(1, 1000)
                },
                creator=creator,
                parent_blocks=parent_blocks
            )
        
        end_time = time.time()
        
        # Calculate metrics
        ordered_chain = self.get_ordered_chain()
        
        return {
            "total_blocks": self.total_blocks,
            "blue_blocks": self.blue_blocks,
            "red_blocks": self.red_blocks,
            "blue_percentage": (self.blue_blocks / self.total_blocks * 100) if self.total_blocks > 0 else 0,
            "dag_width": len(self.tips),
            "consensus_chain_length": len(ordered_chain),
            "processing_time": end_time - start_time,
            "blocks_per_second": num_blocks / (end_time - start_time) if end_time > start_time else 0,
            "average_parents_per_block": np.mean([len(b.parent_blocks) for b in self.blocks.values() if b.block_id != self.genesis_id])
        }
    
    def detect_attack(self, threshold: float = 0.2) -> Dict:
        """
        Detect potential attacks by analyzing red block ratio.
        
        Args:
            threshold: Red block ratio threshold for attack detection
        
        Returns:
            Attack detection results
        """
        red_ratio = self.red_blocks / self.total_blocks if self.total_blocks > 0 else 0
        
        return {
            "attack_detected": red_ratio > threshold,
            "red_block_ratio": red_ratio,
            "red_blocks": self.red_blocks,
            "blue_blocks": self.blue_blocks,
            "severity": "high" if red_ratio > 0.4 else "medium" if red_ratio > threshold else "low"
        }
    
    def get_dag_structure(self) -> Dict:
        """Get DAG structure for visualization."""
        nodes = []
        edges = []
        
        for block_id, block in self.blocks.items():
            nodes.append({
                "id": block_id,
                "label": block_id,
                "blue_score": block.blue_score,
                "is_blue": block.is_blue,
                "topological_order": block.topological_order,
                "creator": block.creator,
                "timestamp": block.timestamp
            })
        
        for parent, child in self.dag.edges():
            edges.append({
                "from": parent,
                "to": child
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "metrics": {
                "total_blocks": self.total_blocks,
                "blue_blocks": self.blue_blocks,
                "red_blocks": self.red_blocks,
                "tips": len(self.tips)
            }
        }


class DAGOptimizer:
    """
    Universal DAG optimization layer for dependency resolution and parallel execution.
    Applies to tasks, transactions, computations across the ecosystem.
    """
    
    def __init__(self):
        self.dag = nx.DiGraph()
        self.tasks: Dict[str, Dict] = {}
        self.completed: Set[str] = set()
        self.in_progress: Set[str] = set()
        
    def add_task(self, task_id: str, task_data: Dict, dependencies: List[str] = None):
        """Add task with dependencies to DAG."""
        self.tasks[task_id] = task_data
        self.dag.add_node(task_id)
        
        if dependencies:
            for dep_id in dependencies:
                self.dag.add_edge(dep_id, task_id)
    
    def get_ready_tasks(self) -> List[str]:
        """Get tasks ready for parallel execution (all dependencies met)."""
        ready = []
        for task_id in self.tasks:
            if task_id in self.completed or task_id in self.in_progress:
                continue
            
            # Check if all dependencies are completed
            dependencies = list(self.dag.predecessors(task_id))
            if all(dep in self.completed for dep in dependencies):
                ready.append(task_id)
        
        return ready
    
    def mark_in_progress(self, task_id: str):
        """Mark task as in progress."""
        self.in_progress.add(task_id)
    
    def mark_completed(self, task_id: str):
        """Mark task as completed."""
        self.in_progress.discard(task_id)
        self.completed.add(task_id)
    
    def get_execution_plan(self) -> List[List[str]]:
        """
        Get parallel execution plan.
        Returns list of task batches that can execute in parallel.
        """
        plan = []
        remaining = set(self.tasks.keys()) - self.completed
        
        while remaining:
            # Get tasks with all dependencies met
            batch = [
                task_id for task_id in remaining
                if all(dep in self.completed for dep in self.dag.predecessors(task_id))
            ]
            
            if not batch:
                # Circular dependency or error
                break
            
            plan.append(batch)
            self.completed.update(batch)
            remaining -= set(batch)
        
        # Reset completed for actual execution
        self.completed.clear()
        
        return plan
    
    def detect_bottlenecks(self) -> List[Dict]:
        """
        Detect bottlenecks in the DAG.
        Bottlenecks are nodes with high in-degree or out-degree.
        """
        bottlenecks = []
        
        for task_id in self.tasks:
            in_degree = self.dag.in_degree(task_id)
            out_degree = self.dag.out_degree(task_id)
            
            # High out-degree = many tasks depend on this one (critical path)
            if out_degree > 3:
                bottlenecks.append({
                    "task_id": task_id,
                    "type": "dependency_bottleneck",
                    "dependencies": out_degree,
                    "severity": "high" if out_degree > 5 else "medium"
                })
            
            # High in-degree = task depends on many others (long wait)
            if in_degree > 3:
                bottlenecks.append({
                    "task_id": task_id,
                    "type": "waiting_bottleneck",
                    "waiting_on": in_degree,
                    "severity": "high" if in_degree > 5 else "medium"
                })
        
        return bottlenecks
    
    def get_critical_path(self) -> List[str]:
        """Get the critical path (longest path) through the DAG."""
        try:
            return list(nx.dag_longest_path(self.dag))
        except:
            return []
    
    def calculate_parallelization_gain(self) -> Dict:
        """Calculate potential speedup from parallelization."""
        total_tasks = len(self.tasks)
        if total_tasks == 0:
            return {"gain": 0, "sequential_steps": 0, "parallel_steps": 0}
        
        execution_plan = self.get_execution_plan()
        parallel_steps = len(execution_plan)
        sequential_steps = total_tasks
        
        gain = sequential_steps / parallel_steps if parallel_steps > 0 else 1
        
        return {
            "total_tasks": total_tasks,
            "sequential_steps": sequential_steps,
            "parallel_steps": parallel_steps,
            "parallelization_gain": gain,
            "speedup_percentage": ((gain - 1) * 100)
        }


if __name__ == "__main__":
    # Test GhostDAG
    print("=== Testing GhostDAG Engine ===")
    ghostdag = GhostDAGEngine(k=3)
    
    # Simulate parallel block creation
    metrics = ghostdag.simulate_parallel_block_creation(num_blocks=50, num_creators=5)
    print(f"\nPerformance Metrics:")
    print(f"  Total Blocks: {metrics['total_blocks']}")
    print(f"  Blue Blocks: {metrics['blue_blocks']} ({metrics['blue_percentage']:.1f}%)")
    print(f"  Red Blocks: {metrics['red_blocks']}")
    print(f"  Blocks/Second: {metrics['blocks_per_second']:.1f}")
    print(f"  Avg Parents per Block: {metrics['average_parents_per_block']:.2f}")
    
    # Test DAG Optimizer
    print("\n=== Testing DAG Optimizer ===")
    optimizer = DAGOptimizer()
    
    # Create sample task DAG
    optimizer.add_task("task1", {"name": "Fetch data"}, [])
    optimizer.add_task("task2", {"name": "Process A"}, ["task1"])
    optimizer.add_task("task3", {"name": "Process B"}, ["task1"])
    optimizer.add_task("task4", {"name": "Process C"}, ["task1"])
    optimizer.add_task("task5", {"name": "Combine"}, ["task2", "task3", "task4"])
    
    plan = optimizer.get_execution_plan()
    print(f"\nExecution Plan ({len(plan)} parallel stages):")
    for i, batch in enumerate(plan):
        print(f"  Stage {i+1}: {batch}")
    
    gains = optimizer.calculate_parallelization_gain()
    print(f"\nParallelization Gain: {gains['parallelization_gain']:.2f}x speedup")
    print(f"Speedup: {gains['speedup_percentage']:.1f}%")
