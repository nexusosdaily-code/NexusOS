"""
GhostDAG System Page
Comprehensive DAG and GhostDAG visualization and control interface.
"""

import streamlit as st
import time
from ghostdag_core import GhostDAGEngine, DAGOptimizer
from ghostdag_viz import (
    create_dag_network_graph,
    create_performance_dashboard,
    create_bottleneck_analysis,
    create_parallelization_comparison,
    create_execution_timeline,
    render_ghostdag_performance_metrics,
    render_dag_optimizer_metrics
)


def initialize_ghostdag():
    """Initialize GhostDAG engine in session state."""
    if 'ghostdag_engine' not in st.session_state:
        st.session_state.ghostdag_engine = GhostDAGEngine(k=3)
    
    if 'dag_optimizer' not in st.session_state:
        st.session_state.dag_optimizer = DAGOptimizer()


def render_ghostdag_system():
    """Main rendering function for GhostDAG system."""
    st.title("⚡ GhostDAG Ecosystem Optimization")
    st.markdown("""
    **Eliminate bottlenecks** across the entire blockchain ecosystem using **DAG** and **GhostDAG** mechanics.
    
    - 🔷 **GhostDAG Consensus**: Parallel block processing for high-throughput blockchain
    - 🔷 **DAG Optimization**: Universal dependency resolution and parallel execution
    - 🔷 **Bottleneck Detection**: Identify and resolve performance issues
    - 🔷 **System-Wide Integration**: Applied to blockchain, agents, and task orchestration
    """)
    
    initialize_ghostdag()
    
    tabs = st.tabs([
        "🌐 GhostDAG Consensus",
        "⚡ DAG Optimizer",
        "🔍 Bottleneck Analysis",
        "📊 Performance Dashboard",
        "🧪 Live Simulation"
    ])
    
    with tabs[0]:
        render_ghostdag_consensus()
    
    with tabs[1]:
        render_dag_optimizer()
    
    with tabs[2]:
        render_bottleneck_detection()
    
    with tabs[3]:
        render_performance_overview()
    
    with tabs[4]:
        render_live_simulation()


def render_ghostdag_consensus():
    """Render GhostDAG consensus visualization."""
    st.header("🌐 GhostDAG Consensus Engine")
    
    st.markdown("""
    **GhostDAG** enables **parallel block creation** using a DAG structure instead of a linear chain.
    This eliminates the fundamental bottleneck of sequential block processing.
    
    **Key Benefits:**
    - ✅ Multiple blocks created simultaneously
    - ✅ No 51% attack vulnerability (requires full spectral coverage)
    - ✅ Byzantine fault tolerance with parameter k
    - ✅ Maintains consensus through topological ordering
    """)
    
    ghostdag = st.session_state.ghostdag_engine
    
    # Configuration
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Configuration")
        k_param = st.slider(
            "Security Parameter (k)",
            min_value=1,
            max_value=10,
            value=3,
            help="Max blocks created in parallel by honest nodes. Higher k = more parallelism."
        )
        
        if k_param != ghostdag.k:
            ghostdag.k = k_param
            st.success(f"Updated k to {k_param}")
    
    with col2:
        st.subheader("Quick Stats")
        render_ghostdag_performance_metrics(ghostdag)
    
    st.divider()
    
    # DAG Visualization
    st.subheader("📊 DAG Network Structure")
    
    dag_structure = ghostdag.get_dag_structure()
    fig_dag = create_dag_network_graph(dag_structure)
    st.plotly_chart(fig_dag, use_container_width=True)
    
    # Consensus Chain
    st.subheader("🔗 Canonical Consensus Chain")
    ordered_chain = ghostdag.get_ordered_chain()
    
    if ordered_chain:
        chain_df = []
        for block in ordered_chain[:20]:  # Show first 20
            chain_df.append({
                "Order": block.topological_order,
                "Block ID": block.block_id,
                "Creator": block.creator,
                "Blue Score": block.blue_score,
                "Parents": len(block.parent_blocks)
            })
        
        import pandas as pd
        st.dataframe(pd.DataFrame(chain_df), use_container_width=True)
        
        if len(ordered_chain) > 20:
            st.caption(f"Showing first 20 of {len(ordered_chain)} blocks")
    else:
        st.info("No blocks in consensus chain yet")
    
    # Attack Detection
    st.divider()
    attack_info = ghostdag.detect_attack()
    
    if attack_info['attack_detected']:
        st.error(f"⚠️ **Attack Detected!** Red block ratio: {attack_info['red_block_ratio']:.1%}")
        st.warning(f"Severity: {attack_info['severity'].upper()}")
    else:
        st.success("✅ No attacks detected. Network is healthy.")


def render_dag_optimizer():
    """Render DAG optimizer interface."""
    st.header("⚡ Universal DAG Optimizer")
    
    st.markdown("""
    **DAG Optimization** resolves dependencies and enables **parallel execution** across the ecosystem.
    
    **Applications:**
    - 🔷 Blockchain transaction processing
    - 🔷 Multi-agent network communications
    - 🔷 Task orchestration workflows
    - 🔷 Economic simulation computations
    """)
    
    optimizer = st.session_state.dag_optimizer
    
    # Task Management
    st.subheader("📋 Task Management")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        task_id = st.text_input("Task ID", value=f"task_{len(optimizer.tasks) + 1}")
        task_name = st.text_input("Task Name", value="New Task")
    
    with col2:
        available_tasks = list(optimizer.tasks.keys())
        dependencies = st.multiselect(
            "Dependencies",
            options=available_tasks,
            help="Select tasks this task depends on"
        )
    
    if st.button("➕ Add Task", type="primary"):
        optimizer.add_task(
            task_id=task_id,
            task_data={"name": task_name},
            dependencies=dependencies
        )
        st.success(f"Added task: {task_id}")
        st.rerun()
    
    if optimizer.tasks:
        st.divider()
        
        # Execution Plan
        st.subheader("🚀 Execution Plan")
        
        execution_plan = optimizer.get_execution_plan()
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            render_dag_optimizer_metrics(optimizer)
        
        with col2:
            st.plotly_chart(
                create_parallelization_comparison(
                    optimizer.calculate_parallelization_gain()
                ),
                use_container_width=True
            )
        
        # Timeline
        st.subheader("📅 Parallel Execution Timeline")
        fig_timeline = create_execution_timeline(execution_plan)
        st.plotly_chart(fig_timeline, use_container_width=True)
        
        # Execution stages
        with st.expander("View Execution Stages"):
            for i, stage in enumerate(execution_plan):
                st.write(f"**Stage {i+1}** (parallel): {', '.join(stage)}")
    
    else:
        st.info("Add tasks to see execution plan")


def render_bottleneck_detection():
    """Render bottleneck detection and analysis."""
    st.header("🔍 Bottleneck Detection & Analysis")
    
    st.markdown("""
    **Automatic bottleneck detection** identifies performance issues in your DAG structure.
    
    **Bottleneck Types:**
    - 🔴 **Dependency Bottleneck**: Many tasks depend on this one (critical path)
    - 🟡 **Waiting Bottleneck**: Task depends on many others (long wait time)
    """)
    
    optimizer = st.session_state.dag_optimizer
    
    if optimizer.tasks:
        bottlenecks = optimizer.detect_bottlenecks()
        critical_path = optimizer.get_critical_path()
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric(
                "Bottlenecks Detected",
                len(bottlenecks),
                delta="Issues" if bottlenecks else "Clean",
                delta_color="inverse" if bottlenecks else "normal"
            )
        
        with col2:
            st.metric(
                "Critical Path Length",
                len(critical_path),
                help="Longest dependency chain"
            )
        
        # Bottleneck visualization
        st.plotly_chart(
            create_bottleneck_analysis(bottlenecks),
            use_container_width=True
        )
        
        # Bottleneck details
        if bottlenecks:
            st.subheader("Bottleneck Details")
            for bn in bottlenecks:
                severity_color = {"high": "🔴", "medium": "🟡", "low": "🟢"}
                st.warning(
                    f"{severity_color[bn['severity']]} **{bn['task_id']}**: "
                    f"{bn['type']} ({bn.get('dependencies', bn.get('waiting_on', 0))} dependencies)"
                )
        
        # Critical path
        if critical_path:
            st.subheader("Critical Path")
            st.info(f"Longest dependency chain: {' → '.join(critical_path)}")
    
    else:
        st.info("Add tasks to the DAG Optimizer to detect bottlenecks")


def render_performance_overview():
    """Render overall performance dashboard."""
    st.header("📊 System-Wide Performance Dashboard")
    
    ghostdag = st.session_state.ghostdag_engine
    optimizer = st.session_state.dag_optimizer
    
    # GhostDAG Performance
    st.subheader("🌐 GhostDAG Consensus Performance")
    
    if ghostdag.total_blocks > 0:
        metrics = ghostdag.simulate_parallel_block_creation(0, 0)  # Get current metrics
        metrics.update({
            'total_blocks': ghostdag.total_blocks,
            'blue_blocks': ghostdag.blue_blocks,
            'red_blocks': ghostdag.red_blocks,
            'blue_percentage': (ghostdag.blue_blocks / ghostdag.total_blocks * 100),
            'dag_width': len(ghostdag.tips),
            'consensus_chain_length': len(ghostdag.get_ordered_chain())
        })
        
        fig_perf = create_performance_dashboard(metrics)
        st.plotly_chart(fig_perf, use_container_width=True)
    else:
        st.info("Run simulation to see GhostDAG performance metrics")
    
    # DAG Optimizer Performance
    st.subheader("⚡ DAG Optimization Performance")
    
    if optimizer.tasks:
        gains = optimizer.calculate_parallelization_gain()
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Tasks", gains['total_tasks'])
        
        with col2:
            st.metric("Sequential Steps", gains['sequential_steps'])
        
        with col3:
            st.metric("Parallel Steps", gains['parallel_steps'])
        
        with col4:
            st.metric(
                "Speedup",
                f"{gains['parallelization_gain']:.2f}x",
                delta=f"{gains['speedup_percentage']:.1f}%"
            )
        
        st.plotly_chart(
            create_parallelization_comparison(gains),
            use_container_width=True
        )
    else:
        st.info("Add tasks to DAG Optimizer to see optimization metrics")


def render_live_simulation():
    """Render live simulation interface."""
    st.header("🧪 Live GhostDAG Simulation")
    
    st.markdown("""
    **Run live simulations** to see GhostDAG and DAG optimization in action.
    Watch how parallel processing eliminates bottlenecks in real-time.
    """)
    
    ghostdag = st.session_state.ghostdag_engine
    
    col1, col2 = st.columns(2)
    
    with col1:
        num_blocks = st.slider(
            "Number of Blocks to Create",
            min_value=10,
            max_value=200,
            value=50,
            step=10
        )
    
    with col2:
        num_creators = st.slider(
            "Number of Parallel Creators",
            min_value=1,
            max_value=20,
            value=5
        )
    
    if st.button("🚀 Run Simulation", type="primary"):
        with st.spinner("Running parallel block creation simulation..."):
            # Reset engine
            st.session_state.ghostdag_engine = GhostDAGEngine(k=ghostdag.k)
            ghostdag = st.session_state.ghostdag_engine
            
            # Run simulation
            start_time = time.time()
            metrics = ghostdag.simulate_parallel_block_creation(
                num_blocks=num_blocks,
                num_creators=num_creators
            )
            end_time = time.time()
            
            st.success(f"✅ Simulation complete in {end_time - start_time:.2f} seconds!")
            
            # Display results
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Total Blocks", metrics['total_blocks'])
                st.metric("Blue Blocks", f"{metrics['blue_percentage']:.1f}%")
            
            with col2:
                st.metric("Blocks/Second", f"{metrics['blocks_per_second']:.1f}")
                st.metric("DAG Width", metrics['dag_width'])
            
            with col3:
                st.metric("Chain Length", metrics['consensus_chain_length'])
                st.metric("Avg Parents", f"{metrics['average_parents_per_block']:.2f}")
            
            # Visualizations
            st.divider()
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("DAG Structure")
                dag_structure = ghostdag.get_dag_structure()
                fig_dag = create_dag_network_graph(dag_structure)
                st.plotly_chart(fig_dag, use_container_width=True)
            
            with col2:
                st.subheader("Performance Metrics")
                fig_perf = create_performance_dashboard(metrics)
                st.plotly_chart(fig_perf, use_container_width=True)
    
    # Show current state
    if ghostdag.total_blocks > 0:
        st.divider()
        st.subheader("Current DAG State")
        
        dag_structure = ghostdag.get_dag_structure()
        fig_dag = create_dag_network_graph(dag_structure)
        st.plotly_chart(fig_dag, use_container_width=True)


if __name__ == "__main__":
    render_ghostdag_system()
