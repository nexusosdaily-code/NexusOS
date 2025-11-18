"""
GhostDAG Visualization Components
Real-time DAG structure visualization and performance monitoring.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from typing import Dict, List
import networkx as nx

def create_dag_network_graph(dag_structure: Dict) -> go.Figure:
    """
    Create interactive DAG network visualization.
    
    Args:
        dag_structure: DAG structure from GhostDAGEngine.get_dag_structure()
    
    Returns:
        Plotly figure
    """
    nodes = dag_structure['nodes']
    edges = dag_structure['edges']
    
    if not nodes:
        fig = go.Figure()
        fig.add_annotation(text="No blocks in DAG yet", showarrow=False, font_size=16)
        return fig
    
    # Create NetworkX graph for layout
    G = nx.DiGraph()
    for node in nodes:
        G.add_node(node['id'])
    for edge in edges:
        G.add_edge(edge['from'], edge['to'])
    
    # Use hierarchical layout
    try:
        pos = nx.spring_layout(G, k=2, iterations=50)
    except:
        pos = {node['id']: (i, 0) for i, node in enumerate(nodes)}
    
    # Create edge traces
    edge_x = []
    edge_y = []
    for edge in edges:
        x0, y0 = pos[edge['from']]
        x1, y1 = pos[edge['to']]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])
    
    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        line=dict(width=1, color='#888'),
        hoverinfo='none',
        mode='lines'
    )
    
    # Create node traces (separate for blue and red)
    blue_nodes = [n for n in nodes if n['is_blue']]
    red_nodes = [n for n in nodes if not n['is_blue']]
    
    # Blue nodes (honest chain)
    blue_x = [pos[node['id']][0] for node in blue_nodes]
    blue_y = [pos[node['id']][1] for node in blue_nodes]
    blue_text = [
        f"Block: {node['id']}<br>"
        f"Creator: {node['creator']}<br>"
        f"Blue Score: {node['blue_score']}<br>"
        f"Order: {node['topological_order']}"
        for node in blue_nodes
    ]
    
    blue_trace = go.Scatter(
        x=blue_x, y=blue_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n['id'].replace('block_', 'B') if 'block_' in n['id'] else n['id'][:4] for n in blue_nodes],
        textposition="top center",
        hovertext=blue_text,
        marker=dict(
            size=20,
            color=[n['blue_score'] for n in blue_nodes],
            colorscale='Blues',
            showscale=True,
            colorbar=dict(title="Blue Score", x=1.1),
            line=dict(width=2, color='white')
        ),
        name='Blue Blocks (Honest)'
    )
    
    # Red nodes (potential attack)
    red_trace = None
    if red_nodes:
        red_x = [pos[node['id']][0] for node in red_nodes]
        red_y = [pos[node['id']][1] for node in red_nodes]
        red_text = [
            f"Block: {node['id']}<br>"
            f"Creator: {node['creator']}<br>"
            f"⚠️ Red Block (Attack)<br>"
            f"Order: {node['topological_order']}"
            for node in red_nodes
        ]
        
        red_trace = go.Scatter(
            x=red_x, y=red_y,
            mode='markers+text',
            hoverinfo='text',
            text=[n['id'].replace('block_', 'R') if 'block_' in n['id'] else n['id'][:4] for n in red_nodes],
            textposition="top center",
            hovertext=red_text,
            marker=dict(
                size=20,
                color='red',
                line=dict(width=2, color='white')
            ),
            name='Red Blocks (Attack)'
        )
    
    # Create figure
    fig_data = [edge_trace, blue_trace]
    if red_trace:
        fig_data.append(red_trace)
    
    fig = go.Figure(data=fig_data)
    
    fig.update_layout(
        title="GhostDAG Network Structure",
        showlegend=True,
        hovermode='closest',
        margin=dict(b=0, l=0, r=0, t=40),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        plot_bgcolor='rgba(0,0,0,0.05)',
        height=500
    )
    
    return fig


def create_performance_dashboard(metrics: Dict) -> go.Figure:
    """Create performance metrics dashboard."""
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=[
            'Block Classification',
            'Throughput',
            'DAG Statistics',
            'Parallelization Metrics'
        ],
        specs=[
            [{"type": "pie"}, {"type": "indicator"}],
            [{"type": "bar"}, {"type": "indicator"}]
        ]
    )
    
    # Block classification pie chart
    fig.add_trace(
        go.Pie(
            labels=['Blue Blocks (Honest)', 'Red Blocks (Attack)'],
            values=[metrics.get('blue_blocks', 0), metrics.get('red_blocks', 0)],
            marker_colors=['#2E86AB', '#EE6352'],
            hole=0.4
        ),
        row=1, col=1
    )
    
    # Throughput indicator
    fig.add_trace(
        go.Indicator(
            mode="number+delta",
            value=metrics.get('blocks_per_second', 0),
            title={'text': "Blocks/Second"},
            delta={'reference': 10, 'relative': False},
            domain={'x': [0, 1], 'y': [0, 1]}
        ),
        row=1, col=2
    )
    
    # DAG statistics bar chart
    dag_stats = pd.DataFrame({
        'Metric': ['Total Blocks', 'DAG Width', 'Chain Length'],
        'Value': [
            metrics.get('total_blocks', 0),
            metrics.get('dag_width', 0),
            metrics.get('consensus_chain_length', 0)
        ]
    })
    
    fig.add_trace(
        go.Bar(
            x=dag_stats['Metric'],
            y=dag_stats['Value'],
            marker_color=['#A23B72', '#F18F01', '#2E86AB'],
            text=dag_stats['Value'],
            textposition='auto'
        ),
        row=2, col=1
    )
    
    # Average parents indicator
    fig.add_trace(
        go.Indicator(
            mode="gauge+number",
            value=metrics.get('average_parents_per_block', 0),
            title={'text': "Avg Parents/Block"},
            gauge={
                'axis': {'range': [0, 5]},
                'bar': {'color': "#2E86AB"},
                'steps': [
                    {'range': [0, 1], 'color': "#EEE"},
                    {'range': [1, 2], 'color': "#DDD"},
                    {'range': [2, 5], 'color': "#CCC"}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 4
                }
            }
        ),
        row=2, col=2
    )
    
    fig.update_layout(
        height=600,
        showlegend=False,
        title_text="GhostDAG Performance Dashboard"
    )
    
    return fig


def create_bottleneck_analysis(bottlenecks: List[Dict]) -> go.Figure:
    """Create bottleneck analysis visualization."""
    if not bottlenecks:
        fig = go.Figure()
        fig.add_annotation(
            text="✅ No bottlenecks detected!",
            showarrow=False,
            font=dict(size=20, color="green")
        )
        return fig
    
    df = pd.DataFrame(bottlenecks)
    
    fig = px.scatter(
        df,
        x='task_id',
        y='dependencies' if 'dependencies' in df.columns else 'waiting_on',
        color='severity',
        size='dependencies' if 'dependencies' in df.columns else 'waiting_on',
        hover_data=df.columns,
        color_discrete_map={'high': 'red', 'medium': 'orange', 'low': 'yellow'}
    )
    
    fig.update_layout(
        title="Bottleneck Detection",
        xaxis_title="Task ID",
        yaxis_title="Dependencies",
        height=400
    )
    
    return fig


def create_parallelization_comparison(gains: Dict) -> go.Figure:
    """Create parallelization gain visualization."""
    categories = ['Sequential Execution', 'Parallel Execution (DAG)']
    values = [gains['sequential_steps'], gains['parallel_steps']]
    
    fig = go.Figure(data=[
        go.Bar(
            x=categories,
            y=values,
            text=values,
            textposition='auto',
            marker_color=['#EE6352', '#2E86AB']
        )
    ])
    
    speedup = gains.get('parallelization_gain', 1)
    
    fig.update_layout(
        title=f"Parallelization Gain: {speedup:.2f}x Speedup ({gains.get('speedup_percentage', 0):.1f}% faster)",
        yaxis_title="Execution Steps",
        height=400,
        annotations=[
            dict(
                x=0.5,
                y=max(values) * 0.9,
                text=f"<b>{speedup:.2f}x</b> faster",
                showarrow=False,
                font=dict(size=24, color='green')
            )
        ]
    )
    
    return fig


def create_execution_timeline(execution_plan: List[List[str]]) -> go.Figure:
    """Create execution timeline showing parallel stages."""
    # Create Gantt-style chart
    df_rows = []
    
    for stage_idx, stage in enumerate(execution_plan):
        for task in stage:
            df_rows.append({
                'Task': task,
                'Start': stage_idx,
                'Finish': stage_idx + 1,
                'Stage': f'Stage {stage_idx + 1}'
            })
    
    df = pd.DataFrame(df_rows)
    
    fig = px.timeline(
        df,
        x_start='Start',
        x_end='Finish',
        y='Task',
        color='Stage',
        title='Parallel Execution Timeline'
    )
    
    fig.update_yaxes(autorange="reversed")
    fig.update_layout(height=max(400, len(df_rows) * 30))
    
    return fig


def render_ghostdag_performance_metrics(ghostdag_engine):
    """Render comprehensive GhostDAG performance metrics."""
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Blocks",
            ghostdag_engine.total_blocks,
            delta=None
        )
    
    with col2:
        blue_pct = (ghostdag_engine.blue_blocks / ghostdag_engine.total_blocks * 100) \
                   if ghostdag_engine.total_blocks > 0 else 0
        st.metric(
            "Blue Blocks",
            ghostdag_engine.blue_blocks,
            delta=f"{blue_pct:.1f}%",
            delta_color="normal"
        )
    
    with col3:
        st.metric(
            "Red Blocks",
            ghostdag_engine.red_blocks,
            delta="Attack" if ghostdag_engine.red_blocks > 0 else "None",
            delta_color="inverse"
        )
    
    with col4:
        st.metric(
            "DAG Tips",
            len(ghostdag_engine.tips),
            delta="Active" if len(ghostdag_engine.tips) > 1 else "Single"
        )


def render_dag_optimizer_metrics(optimizer):
    """Render DAG optimizer performance metrics."""
    gains = optimizer.calculate_parallelization_gain()
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "Total Tasks",
            gains['total_tasks']
        )
    
    with col2:
        st.metric(
            "Parallel Stages",
            gains['parallel_steps'],
            delta=f"{gains['sequential_steps']} sequential",
            delta_color="inverse"
        )
    
    with col3:
        st.metric(
            "Speedup",
            f"{gains['parallelization_gain']:.2f}x",
            delta=f"{gains['speedup_percentage']:.1f}% faster",
            delta_color="normal"
        )
