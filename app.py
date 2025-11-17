import streamlit as st
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
from datetime import datetime

from database import init_db, get_session, SimulationConfig, SimulationRun
from nexus_engine import NexusEngine
from signal_generators import SignalGenerator, get_default_signal_configs
from monte_carlo_analysis import MonteCarloAnalysis, SensitivityAnalysis
from oracle_sources import OracleManager, get_default_oracle_configs
from auth import AuthManager
from validation import ParameterValidator, validate_and_display

st.set_page_config(
    page_title="NexusOS",
    page_icon="🔄",
    layout="wide",
    initial_sidebar_state="expanded"
)

def init_session_state():
    if 'simulation_results' not in st.session_state:
        st.session_state.simulation_results = None
    if 'signal_configs' not in st.session_state:
        st.session_state.signal_configs = get_default_signal_configs()
    if 'params' not in st.session_state:
        st.session_state.params = get_default_params()
    if 'oracle_manager' not in st.session_state:
        st.session_state.oracle_manager = OracleManager()
        for config in get_default_oracle_configs():
            source = st.session_state.oracle_manager.create_source(
                config['type'], config['name'], config['config']
            )
            st.session_state.oracle_manager.add_source(source)
    if 'use_oracle_data' not in st.session_state:
        st.session_state.use_oracle_data = False

def get_default_params():
    return {
        'alpha': 1.0,
        'beta': 1.0,
        'kappa': 0.01,
        'eta': 0.1,
        'w_H': 0.4,
        'w_M': 0.3,
        'w_D': 0.2,
        'w_E': 0.1,
        'gamma_C': 0.5,
        'gamma_D': 0.3,
        'gamma_E': 0.2,
        'K_p': 0.1,
        'K_i': 0.01,
        'K_d': 0.05,
        'N_target': 1000.0,
        'N_initial': 1000.0,
        'F_floor': 10.0,
        'lambda_E': 0.3,
        'lambda_N': 0.3,
        'lambda_H': 0.2,
        'lambda_M': 0.2,
        'N_0': 1000.0,
        'H_0': 100.0,
        'M_0': 100.0,
        'delta_t': 0.1,
        'num_steps': 1000
    }

def fetch_oracle_value(oracle_manager, variable, default_value):
    if oracle_manager is None:
        return default_value
    
    data_point = oracle_manager.fetch_variable(variable)
    if data_point is not None:
        return data_point.value
    return default_value

def run_simulation(params, signal_configs, oracle_manager=None, use_oracle_data=False, oracle_refresh_interval=10):
    """
    Run simulation with comprehensive error handling and diagnostics.
    
    Raises:
        ValueError: If parameters or signals are invalid
        RuntimeError: If simulation encounters numerical instability
    """
    try:
        engine = NexusEngine(params)
    except Exception as e:
        raise ValueError(f"Failed to initialize simulation engine: {str(e)}")
    
    num_steps = params['num_steps']
    delta_t = params['delta_t']
    
    # Validate time parameters
    if num_steps <= 0:
        raise ValueError("Number of steps must be positive")
    if delta_t <= 0:
        raise ValueError("Time step (delta_t) must be positive")
    
    try:
        H_signal = SignalGenerator.generate_from_config(signal_configs['H'], num_steps, delta_t)
        M_signal = SignalGenerator.generate_from_config(signal_configs['M'], num_steps, delta_t)
        D_signal = SignalGenerator.generate_from_config(signal_configs['D'], num_steps, delta_t)
        E_signal = SignalGenerator.generate_from_config(signal_configs['E'], num_steps, delta_t)
        C_cons_signal = SignalGenerator.generate_from_config(signal_configs['C_cons'], num_steps, delta_t)
        C_disp_signal = SignalGenerator.generate_from_config(signal_configs['C_disp'], num_steps, delta_t)
    except Exception as e:
        raise ValueError(f"Failed to generate signals: {str(e)}")
    
    N = params['N_initial']
    
    oracle_cache = {}
    
    results = {
        't': [],
        'N': [],
        'I': [],
        'B': [],
        'S': [],
        'Phi': [],
        'e': [],
        'H': [],
        'M': [],
        'D': [],
        'E': [],
        'C_cons': [],
        'C_disp': [],
        'oracle_used': []
    }
    
    for step in range(num_steps):
        try:
            t = step * delta_t
            
            if use_oracle_data and oracle_manager:
                should_refresh = (step % oracle_refresh_interval == 0)
                
                if should_refresh:
                    for var in ['H', 'M', 'D', 'E', 'C_cons', 'C_disp']:
                        data_point = oracle_manager.fetch_variable(var)
                        if data_point:
                            oracle_cache[var] = data_point.value
                
                H = oracle_cache.get('H', H_signal[step])
                M = oracle_cache.get('M', M_signal[step])
                D = oracle_cache.get('D', D_signal[step])
                E = oracle_cache.get('E', E_signal[step])
                C_cons = oracle_cache.get('C_cons', C_cons_signal[step])
                C_disp = oracle_cache.get('C_disp', C_disp_signal[step])
                oracle_used = bool(oracle_cache)
            else:
                H = H_signal[step]
                M = M_signal[step]
                D = D_signal[step]
                E = E_signal[step]
                C_cons = C_cons_signal[step]
                C_disp = C_disp_signal[step]
                oracle_used = False
            
            E = np.clip(E, 0.0, 1.0)
            
            N_next, diagnostics = engine.step(N, H, M, D, E, C_cons, C_disp, delta_t)
            
            # Check for numerical instability
            if np.isnan(N_next) or np.isinf(N_next):
                raise RuntimeError(
                    f"Numerical instability detected at step {step}/{num_steps} (t={t:.2f}). "
                    f"N became {'NaN' if np.isnan(N_next) else 'infinite'}. "
                    f"Try reducing delta_t or adjusting PID gains."
                )
            
        except RuntimeError:
            raise  # Re-raise runtime errors with diagnostics
        except Exception as e:
            raise RuntimeError(
                f"Simulation failed at step {step}/{num_steps} (t={t:.2f}): {str(e)}"
            )
        
        results['t'].append(t)
        results['N'].append(N_next)
        results['I'].append(diagnostics['I'])
        results['B'].append(diagnostics['B'])
        results['S'].append(diagnostics['S'])
        results['Phi'].append(diagnostics['Phi'])
        results['e'].append(diagnostics['e'])
        results['H'].append(H)
        results['M'].append(M)
        results['D'].append(D)
        results['E'].append(E)
        results['C_cons'].append(C_cons)
        results['C_disp'].append(C_disp)
        results['oracle_used'].append(oracle_used)
        
        N = N_next
    
    df = pd.DataFrame(results)
    
    df['cumulative_I'] = np.cumsum(df['I']) * delta_t
    df['cumulative_B'] = np.cumsum(df['B']) * delta_t
    df['conservation_error'] = df['cumulative_I'] - df['cumulative_B']
    
    return df

def render_multi_agent():
    st.header("Multi-Agent Network Simulation")
    st.markdown("""
    Simulate multiple Nexus agents interacting in a network. Each agent has its own N(t) state,
    and value flows between connected nodes based on network topology.
    """)
    
    from multi_agent_sim import MultiAgentNexusSimulation
    
    col1, col2 = st.columns(2)
    
    with col1:
        num_agents = st.slider("Number of Agents", 3, 20, 5)
        topology = st.selectbox(
            "Network Topology",
            ['fully_connected', 'hub_spoke', 'random', 'ring', 'small_world'],
            format_func=lambda x: x.replace('_', ' ').title()
        )
    
    with col2:
        transfer_rate = st.slider("Value Transfer Rate", 0.0, 0.1, 0.01, 0.001, 
                                  help="Rate at which value flows between connected nodes")
        network_influence = st.slider("Network Influence on Health", 0.0, 1.0, 0.1, 0.05,
                                      help="How much neighbors' states influence system health")
        enable_transfers = st.checkbox("Enable Value Transfers", value=True)
    
    if st.button("🌐 Run Multi-Agent Simulation", type="primary"):
        with st.spinner(f"Simulating {num_agents} agents..."):
            try:
                sim = MultiAgentNexusSimulation(
                    num_agents=num_agents,
                    base_params=st.session_state.params,
                    signal_configs=st.session_state.signal_configs,
                    network_topology=topology,
                    transfer_rate=transfer_rate,
                    network_influence=network_influence
                )
                
                df = sim.run_simulation(enable_transfers=enable_transfers)
                network_metrics = sim.get_network_metrics()
                network_layout = sim.get_network_layout()
                
                st.session_state['multi_agent_results'] = {
                    'data': df,
                    'network_metrics': network_metrics,
                    'network_layout': network_layout,
                    'sim': sim,
                    'num_agents': num_agents
                }
                
                st.success(f"Multi-agent simulation complete! {num_agents} agents over {len(df)} timesteps.")
                
            except Exception as e:
                st.error(f"Simulation failed: {str(e)}")
                import traceback
                st.code(traceback.format_exc())
    
    if 'multi_agent_results' in st.session_state:
        results = st.session_state['multi_agent_results']
        df = results['data']
        metrics = results['network_metrics']
        layout = results['network_layout']
        sim = results['sim']
        num_agents = results['num_agents']
        
        st.divider()
        st.subheader("Network Topology Metrics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Nodes", metrics['num_nodes'])
        with col2:
            st.metric("Edges", metrics['num_edges'])
        with col3:
            st.metric("Density", f"{metrics['density']:.3f}")
        with col4:
            st.metric("Avg Clustering", f"{metrics['avg_clustering']:.3f}")
        
        st.subheader("Network Visualization")
        
        import plotly.graph_objects as go
        
        edge_x = []
        edge_y = []
        for edge in sim.network.edges():
            x0, y0 = layout[edge[0]]
            x1, y1 = layout[edge[1]]
            edge_x.extend([x0, x1, None])
            edge_y.extend([y0, y1, None])
        
        edge_trace = go.Scatter(
            x=edge_x, y=edge_y,
            line=dict(width=1, color='#888'),
            hoverinfo='none',
            mode='lines'
        )
        
        node_x = []
        node_y = []
        node_text = []
        node_colors = []
        
        for node in sim.network.nodes():
            x, y = layout[node]
            node_x.append(x)
            node_y.append(y)
            final_N = df[f'N_{node}'].iloc[-1]
            node_text.append(f'Agent {node}<br>Final N: {final_N:.2f}')
            node_colors.append(final_N)
        
        node_trace = go.Scatter(
            x=node_x, y=node_y,
            mode='markers+text',
            hovertext=node_text,
            hoverinfo='text',
            text=[str(i) for i in range(num_agents)],
            textposition="top center",
            marker=dict(
                showscale=True,
                colorscale='Viridis',
                size=20,
                color=node_colors,
                colorbar=dict(
                    title="Final N",
                    xanchor='left'
                ),
                line=dict(width=2, color='white')
            )
        )
        
        fig_network = go.Figure(data=[edge_trace, node_trace],
                              layout=go.Layout(
                                  showlegend=False,
                                  hovermode='closest',
                                  margin=dict(b=0,l=0,r=0,t=0),
                                  xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                                  yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
                                  height=400
                              ))
        
        st.plotly_chart(fig_network, width='stretch')
        
        st.subheader("Agent State Evolution")
        
        fig_states = go.Figure()
        
        for agent_id in range(num_agents):
            fig_states.add_trace(go.Scatter(
                x=df['t'],
                y=df[f'N_{agent_id}'],
                mode='lines',
                name=f'Agent {agent_id}',
                line=dict(width=2)
            ))
        
        fig_states.update_layout(
            xaxis_title="Time",
            yaxis_title="Nexus State N(t)",
            height=400,
            hovermode='x unified'
        )
        
        st.plotly_chart(fig_states, width='stretch')
        
        st.subheader("Issuance vs Burn Across Agents")
        
        fig_flows = make_subplots(rows=1, cols=2, subplot_titles=("Total Issuance", "Total Burn"))
        
        for agent_id in range(num_agents):
            fig_flows.add_trace(
                go.Scatter(x=df['t'], y=df[f'I_{agent_id}'], mode='lines', name=f'Agent {agent_id}', showlegend=False),
                row=1, col=1
            )
            fig_flows.add_trace(
                go.Scatter(x=df['t'], y=df[f'B_{agent_id}'], mode='lines', name=f'Agent {agent_id}', showlegend=False),
                row=1, col=2
            )
        
        fig_flows.update_xaxes(title_text="Time", row=1, col=1)
        fig_flows.update_xaxes(title_text="Time", row=1, col=2)
        fig_flows.update_yaxes(title_text="Issuance Rate", row=1, col=1)
        fig_flows.update_yaxes(title_text="Burn Rate", row=1, col=2)
        fig_flows.update_layout(height=400)
        
        st.plotly_chart(fig_flows, width='stretch')
        
        with st.expander("📊 Agent Statistics"):
            stats_data = []
            for agent_id in range(num_agents):
                stats_data.append({
                    'Agent': agent_id,
                    'Final N': df[f'N_{agent_id}'].iloc[-1],
                    'Avg Issuance': df[f'I_{agent_id}'].mean(),
                    'Avg Burn': df[f'B_{agent_id}'].mean(),
                    'Avg System Health': df[f'S_{agent_id}'].mean(),
                    'Degree': sim.network.degree(agent_id)
                })
            
            st.dataframe(pd.DataFrame(stats_data), width='stretch')

def render_smart_contracts():
    st.header("Smart Contract Code Generation")
    st.markdown("""
    Export your validated NexusOS configuration as deployable blockchain smart contracts.
    Supports Ethereum/EVM (Solidity) and Substrate/Polkadot (Rust/ink!) platforms.
    """)
    
    from contract_generator import (
        SolidityContractGenerator,
        RustSubstrateContractGenerator,
        generate_readme
    )
    import zipfile
    import io
    
    st.warning("""
    ⚠️ **Important**: Generated contracts are templates that require review and testing before deployment.
    Always test on a local/test network, conduct security audits, and verify all calculations match your requirements.
    """)
    
    st.info("💡 **Tip**: Test your parameters in simulation mode first to ensure stability before deploying to blockchain.")
    
    col1, col2 = st.columns(2)
    
    with col1:
        contract_name_sol = st.text_input(
            "Solidity Contract Name",
            value="NexusEconomicSystem",
            help="Name for the Solidity contract (PascalCase)"
        )
    
    with col2:
        contract_name_rust = st.text_input(
            "Rust Contract Name",
            value="nexus_economic_system",
            help="Name for the Rust contract (snake_case)"
        )
    
    platform = st.radio(
        "Select Platform",
        ["Both (Recommended)", "Solidity (Ethereum/EVM)", "Rust (Substrate/Polkadot)"],
        help="Choose which smart contract platforms to generate code for"
    )
    
    include_readme = st.checkbox("Include README with deployment instructions", value=True)
    
    if st.button("📜 Generate Smart Contracts", type="primary"):
        with st.spinner("Generating contract code..."):
            try:
                params = st.session_state.params
                
                zip_buffer = io.BytesIO()
                
                with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                    
                    if platform in ["Both (Recommended)", "Solidity (Ethereum/EVM)"]:
                        sol_contract = SolidityContractGenerator.generate_contract(
                            params, contract_name_sol
                        )
                        zip_file.writestr(f"{contract_name_sol}.sol", sol_contract)
                    
                    if platform in ["Both (Recommended)", "Rust (Substrate/Polkadot)"]:
                        rust_contract = RustSubstrateContractGenerator.generate_contract(
                            params, contract_name_rust
                        )
                        zip_file.writestr(f"{contract_name_rust}.rs", rust_contract)
                        
                        cargo_toml = f"""[package]
name = "{contract_name_rust}"
version = "0.1.0"
authors = ["NexusOS Generator"]
edition = "2021"

[dependencies]
ink_primitives = {{ version = "3.4", default-features = false }}
ink_metadata = {{ version = "3.4", default-features = false, features = ["derive"], optional = true }}
ink_env = {{ version = "3.4", default-features = false }}
ink_storage = {{ version = "3.4", default-features = false }}
ink_lang = {{ version = "3.4", default-features = false }}
ink_prelude = {{ version = "3.4", default-features = false }}

scale = {{ package = "parity-scale-codec", version = "3", default-features = false, features = ["derive"] }}
scale-info = {{ version = "2", default-features = false, features = ["derive"], optional = true }}

[lib]
name = "{contract_name_rust}"
path = "{contract_name_rust}.rs"
crate-type = ["cdylib"]

[features]
default = ["std"]
std = [
    "ink_metadata/std",
    "ink_env/std",
    "ink_storage/std",
    "ink_primitives/std",
    "scale/std",
    "scale-info/std",
]
ink-as-dependency = []
"""
                        zip_file.writestr("Cargo.toml", cargo_toml)
                    
                    if include_readme:
                        readme = generate_readme(params)
                        zip_file.writestr("README.md", readme)
                
                zip_buffer.seek(0)
                st.session_state['contract_zip'] = zip_buffer.getvalue()
                
                st.success("✅ Smart contracts generated successfully!")
                
            except Exception as e:
                st.error(f"Contract generation failed: {str(e)}")
                import traceback
                st.code(traceback.format_exc())
    
    if 'contract_zip' in st.session_state:
        st.divider()
        st.subheader("Download Contracts")
        
        st.download_button(
            label="⬇️ Download Contract Package (.zip)",
            data=st.session_state['contract_zip'],
            file_name=f"nexus_contracts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip",
            mime="application/zip",
            help="Download complete smart contract package with deployment instructions"
        )
        
        st.info("""
        **Next Steps:**
        1. Extract the downloaded ZIP file
        2. Review the README.md for deployment instructions
        3. Test contracts on a local/test network first
        4. Consider a security audit before mainnet deployment
        5. Deploy to production blockchain
        """)
        
        with st.expander("📋 Parameter Summary"):
            st.json(st.session_state.params)
        
        with st.expander("⚠️ Security Checklist"):
            st.markdown("""
            Before deploying to mainnet, ensure:
            
            - [ ] All parameters tested in simulation mode
            - [ ] Contracts compiled without errors
            - [ ] Deployed and tested on testnet
            - [ ] Access control properly configured
            - [ ] Emergency pause mechanism tested
            - [ ] Gas costs estimated and acceptable
            - [ ] Security audit completed (for production)
            - [ ] Backup/recovery procedures in place
            - [ ] Monitoring and alerting configured
            """)

def main():
    init_db()
    AuthManager.initialize()
    
    if not AuthManager.is_authenticated():
        AuthManager.render_login()
        return
    
    init_session_state()
    
    AuthManager.render_logout()
    
    st.title("🔄 NexusOS - Foundational Economic System Simulator")
    st.markdown("""
    A comprehensive platform implementing the Nexus equation: a self-regulating economic system 
    with issuance/burn mechanics, feedback control, and conservation constraints.
    """)
    
    tab_list = [
        "📊 Dashboard", 
        "⚙️ Parameter Control", 
        "📈 Simulation", 
        "🔬 Advanced Analysis",
        "🌐 Multi-Agent",
        "📜 Smart Contracts",
        "🔗 Oracles",
        "🤖 ML Optimization",
        "💾 Scenarios",
        "📡 WNSP",
        "🔧 Task Orchestration"
    ]
    
    if AuthManager.has_role('admin'):
        tab_list.append("👥 Admin")
    
    tabs = st.tabs(tab_list)
    
    tab_index = 0
    
    with tabs[tab_index]:
        render_dashboard()
    tab_index += 1
    
    with tabs[tab_index]:
        render_parameter_control()
    tab_index += 1
    
    with tabs[tab_index]:
        render_simulation()
    tab_index += 1
    
    with tabs[tab_index]:
        render_advanced_analysis()
    tab_index += 1
    
    with tabs[tab_index]:
        render_multi_agent()
    tab_index += 1
    
    with tabs[tab_index]:
        render_smart_contracts()
    tab_index += 1
    
    with tabs[tab_index]:
        render_oracles()
    tab_index += 1
    
    with tabs[tab_index]:
        render_ml_optimization()
    tab_index += 1
    
    with tabs[tab_index]:
        render_scenarios()
    tab_index += 1
    
    with tabs[tab_index]:
        render_wnsp()
    tab_index += 1
    
    with tabs[tab_index]:
        render_task_orchestration()
    tab_index += 1
    
    if AuthManager.has_role('admin'):
        with tabs[tab_index]:
            render_admin()

def render_dashboard():
    """Real-time Production Dashboard with live monitoring and alerting."""
    from streamlit_autorefresh import st_autorefresh
    from dashboard_service import get_dashboard_service
    from alert_service import get_alert_service
    from datetime import datetime
    
    st.header("📊 Real-time Production Dashboard")
    st.markdown("Live system monitoring with auto-refresh and intelligent alerting")
    
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        refresh_interval = st.select_slider(
            "Auto-refresh interval",
            options=[5, 10, 15, 30, 60],
            value=15,
            help="Seconds between automatic updates"
        )
    with col2:
        auto_refresh_enabled = st.checkbox("Auto-refresh", value=True)
    with col3:
        if st.button("🔄 Refresh Now"):
            st.rerun()
    
    if auto_refresh_enabled:
        count = st_autorefresh(interval=refresh_interval * 1000, limit=None, key="dashboard_refresh")
    
    dashboard_service = get_dashboard_service()
    alert_service = get_alert_service()
    
    summary = dashboard_service.get_dashboard_summary()
    metrics = summary['metrics']
    health = summary['health']
    
    active_alerts = alert_service.get_active_alerts(limit=10)
    alert_stats = alert_service.get_alert_statistics()
    
    st.divider()
    
    st.subheader("🎯 Live Key Performance Indicators")
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        final_n = metrics.get('final_N')
        if final_n is not None:
            st.metric(
                "Latest Nexus State",
                f"{final_n:.2f}",
                help="Most recent N(t) value from simulations"
            )
        else:
            st.metric("Latest Nexus State", "No data")
    
    with col2:
        avg_issuance = metrics.get('avg_issuance')
        if avg_issuance is not None:
            st.metric(
                "Avg Issuance",
                f"{avg_issuance:.2f}",
                help="Average issuance rate"
            )
        else:
            st.metric("Avg Issuance", "No data")
    
    with col3:
        avg_burn = metrics.get('avg_burn')
        if avg_burn is not None:
            st.metric(
                "Avg Burn",
                f"{avg_burn:.2f}",
                help="Average burn rate"
            )
        else:
            st.metric("Avg Burn", "No data")
    
    with col4:
        conservation_error = metrics.get('conservation_error')
        if conservation_error is not None:
            delta_color = "normal" if abs(conservation_error) < 1.0 else "inverse"
            st.metric(
                "Conservation Error",
                f"{conservation_error:.2f}",
                help="Issuance vs burn balance"
            )
        else:
            st.metric("Conservation Error", "No data")
    
    with col5:
        st.metric(
            "🚨 Active Alerts",
            len(active_alerts),
            delta=f"{alert_stats['alerts_last_24h']} in 24h",
            help="Currently active unresolved alerts"
        )
    
    st.divider()
    
    col1, col2 = st.columns([3, 2])
    
    with col1:
        st.subheader("💚 System Health Status")
        
        db_status = "🟢 Connected" if health['database_connected'] else "🔴 Disconnected"
        db_ping = f"({health.get('db_ping_ms', 0):.1f}ms)" if health.get('db_ping_ms') else ""
        st.write(f"**Database:** {db_status} {db_ping}")
        
        st.write(f"**Total Simulations:** {health.get('total_simulations', 0)}")
        
        last_sim = metrics.get('last_simulation_age_seconds')
        if last_sim is not None:
            if last_sim < 60:
                age_str = f"{last_sim:.0f}s ago"
            elif last_sim < 3600:
                age_str = f"{last_sim / 60:.0f}m ago"
            else:
                age_str = f"{last_sim / 3600:.1f}h ago"
            st.write(f"**Last Simulation:** {age_str}")
        else:
            st.write("**Last Simulation:** Never")
        
        st.write("**Oracle Sources:**")
        for name, oracle_info in health.get('oracle_sources', {}).items():
            status = "🟢" if oracle_info['connected'] else "🔴"
            st.write(f"  - {status} {name} ({oracle_info['type']})")
    
    with col2:
        st.subheader("🚨 Active Alerts")
        
        if active_alerts:
            for alert in active_alerts[:5]:
                alert_id = int(alert.id)
                severity_color = {
                    'info': '🔵',
                    'warning': '🟡',
                    'error': '🟠',
                    'critical': '🔴'
                }.get(alert.payload.get('severity', 'info'), '⚪')
                
                with st.expander(f"{severity_color} {alert.rule.name}"):
                    st.write(f"**Metric:** {alert.payload.get('metric_key')}")
                    st.write(f"**Value:** {alert.payload.get('metric_value')}")
                    st.write(f"**Threshold:** {alert.payload.get('comparator')} {alert.payload.get('threshold')}")
                    st.write(f"**Triggered:** {alert.triggered_at.strftime('%Y-%m-%d %H:%M:%S')}")
                    
                    col_a, col_b = st.columns(2)
                    with col_a:
                        if st.button(f"✓ Acknowledge", key=f"ack_{alert_id}"):
                            if AuthManager.is_authenticated() and hasattr(st.session_state, 'current_user'):
                                alert_service.acknowledge_alert(alert_id, int(st.session_state.current_user.id))
                                st.success("Alert acknowledged")
                                st.rerun()
                    with col_b:
                        if st.button(f"✓ Resolve", key=f"res_{alert_id}"):
                            alert_service.resolve_alert(alert_id)
                            st.success("Alert resolved")
                            st.rerun()
        else:
            st.success("✅ No active alerts")
    
    if AuthManager.has_role('admin') or AuthManager.has_role('researcher'):
        st.divider()
        st.subheader("⚙️ Alert Configuration")
        
        with st.expander("📝 Create New Alert Rule"):
            with st.form("create_alert_rule"):
                rule_name = st.text_input("Rule Name", placeholder="e.g., Low Nexus State Alert")
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    metric_key = st.selectbox(
                        "Metric to Monitor",
                        options=['final_N', 'avg_issuance', 'avg_burn', 'conservation_error'],
                        help="Which metric to monitor"
                    )
                with col2:
                    comparator = st.selectbox(
                        "Condition",
                        options=list(alert_service.COMPARATOR_LABELS.keys()),
                        format_func=lambda x: alert_service.COMPARATOR_LABELS[x]
                    )
                with col3:
                    threshold = st.number_input("Threshold Value", value=0.0, step=0.1)
                
                severity = st.select_slider(
                    "Severity",
                    options=alert_service.SEVERITY_LEVELS,
                    value='warning'
                )
                
                submit_rule = st.form_submit_button("➕ Create Alert Rule")
                
                if submit_rule:
                    if not rule_name:
                        st.error("Rule name is required")
                    else:
                        user_id = int(st.session_state.current_user.id) if hasattr(st.session_state, 'current_user') and st.session_state.current_user else None
                        rule = alert_service.create_rule(
                            name=rule_name,
                            metric_key=metric_key,
                            comparator=comparator,
                            threshold=threshold,
                            severity=severity,
                            created_by=user_id
                        )
                        st.success(f"✅ Alert rule '{rule_name}' created successfully!")
                        st.rerun()
        
        with st.expander("📋 Existing Alert Rules"):
            all_rules = alert_service.get_all_rules()
            
            if all_rules:
                for rule in all_rules:
                    rule_id = int(rule.id)
                    is_active = bool(rule.is_active)
                    status_icon = "✅" if is_active else "⏸️"
                    with st.expander(f"{status_icon} {rule.name}"):
                        st.write(f"**Metric:** {rule.metric_key}")
                        st.write(f"**Condition:** {alert_service.COMPARATOR_LABELS.get(rule.comparator)} {rule.threshold}")
                        st.write(f"**Severity:** {rule.severity}")
                        st.write(f"**Status:** {'Active' if is_active else 'Inactive'}")
                        
                        col_a, col_b, col_c = st.columns(3)
                        with col_a:
                            if is_active:
                                if st.button(f"⏸️ Disable", key=f"disable_{rule_id}"):
                                    alert_service.toggle_rule(rule_id, False)
                                    st.success("Rule disabled")
                                    st.rerun()
                            else:
                                if st.button(f"▶️ Enable", key=f"enable_{rule_id}"):
                                    alert_service.toggle_rule(rule_id, True)
                                    st.success("Rule enabled")
                                    st.rerun()
                        with col_b:
                            pass
                        with col_c:
                            if st.button(f"🗑️ Delete", key=f"delete_rule_{rule_id}"):
                                alert_service.delete_rule(rule_id)
                                st.success("Rule deleted")
                                st.rerun()
            else:
                st.info("No alert rules configured yet")
    
    triggered = alert_service.evaluate_all_rules(metrics)
    if triggered:
        for alert_info in triggered:
            st.toast(f"🚨 Alert: {alert_info['rule'].name}", icon="🚨")

def render_parameter_control():
    st.header("Parameter Control")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.subheader("Core Parameters")
        st.session_state.params['alpha'] = st.slider(
            "Issuance Gain (α)",
            0.0, 5.0, st.session_state.params['alpha'], 0.1,
            help="Adaptive issuance gain"
        )
        st.session_state.params['beta'] = st.slider(
            "Burn Gain (β)",
            0.0, 5.0, st.session_state.params['beta'], 0.1,
            help="Adaptive burn gain"
        )
        st.session_state.params['kappa'] = st.slider(
            "Decay Coefficient (κ)",
            0.0, 0.1, st.session_state.params['kappa'], 0.001,
            help="Temporal decay rate"
        )
        st.session_state.params['eta'] = st.slider(
            "Floor Coupling (η)",
            0.0, 1.0, st.session_state.params['eta'], 0.01,
            help="Floor injection coefficient"
        )
        st.session_state.params['F_floor'] = st.slider(
            "Floor Value (F)",
            0.0, 100.0, st.session_state.params['F_floor'], 1.0,
            help="Baseline guaranteed value"
        )
    
    with col2:
        st.subheader("Input Weights")
        st.session_state.params['w_H'] = st.slider(
            "Human Weight (w_H)",
            0.0, 1.0, st.session_state.params['w_H'], 0.01
        )
        st.session_state.params['w_M'] = st.slider(
            "Machine Weight (w_M)",
            0.0, 1.0, st.session_state.params['w_M'], 0.01
        )
        st.session_state.params['w_D'] = st.slider(
            "Data Weight (w_D)",
            0.0, 1.0, st.session_state.params['w_D'], 0.01
        )
        st.session_state.params['w_E'] = st.slider(
            "Environment Weight (w_E)",
            0.0, 1.0, st.session_state.params['w_E'], 0.01
        )
        
        # Real-time weight sum validation
        input_weight_sum = (st.session_state.params['w_H'] + 
                           st.session_state.params['w_M'] + 
                           st.session_state.params['w_D'] + 
                           st.session_state.params['w_E'])
        if abs(input_weight_sum - 1.0) > 0.05:
            st.error(f"❌ Weight sum: {input_weight_sum:.3f} (must be 1.0 ± 0.05)")
        elif abs(input_weight_sum - 1.0) > 0.01:
            st.warning(f"⚠️ Weight sum: {input_weight_sum:.3f} (close to 1.0)")
        else:
            st.success(f"✅ Weight sum: {input_weight_sum:.3f}")
        
        st.subheader("Burn Weights")
        st.session_state.params['gamma_C'] = st.slider(
            "Consumption (γ_C)",
            0.0, 1.0, st.session_state.params['gamma_C'], 0.01
        )
        st.session_state.params['gamma_D'] = st.slider(
            "Disposal (γ_D)",
            0.0, 1.0, st.session_state.params['gamma_D'], 0.01
        )
        st.session_state.params['gamma_E'] = st.slider(
            "Ecological Load (γ_E)",
            0.0, 1.0, st.session_state.params['gamma_E'], 0.01
        )
        
        # Real-time burn weight sum validation
        burn_weight_sum = (st.session_state.params['gamma_C'] + 
                          st.session_state.params['gamma_D'] + 
                          st.session_state.params['gamma_E'])
        if abs(burn_weight_sum - 1.0) > 0.05:
            st.error(f"❌ Burn weight sum: {burn_weight_sum:.3f} (must be 1.0 ± 0.05)")
        elif abs(burn_weight_sum - 1.0) > 0.01:
            st.warning(f"⚠️ Burn weight sum: {burn_weight_sum:.3f} (close to 1.0)")
        else:
            st.success(f"✅ Burn weight sum: {burn_weight_sum:.3f}")
    
    with col3:
        st.subheader("PID Controller")
        st.session_state.params['K_p'] = st.slider(
            "Proportional Gain (K_p)",
            0.0, 1.0, st.session_state.params['K_p'], 0.01,
            help="Proportional control gain"
        )
        st.session_state.params['K_i'] = st.slider(
            "Integral Gain (K_i)",
            0.0, 0.1, st.session_state.params['K_i'], 0.001,
            help="Integral control gain"
        )
        st.session_state.params['K_d'] = st.slider(
            "Derivative Gain (K_d)",
            0.0, 1.0, st.session_state.params['K_d'], 0.01,
            help="Derivative control gain"
        )
        st.session_state.params['N_target'] = st.slider(
            "Target State (N*)",
            0.0, 2000.0, st.session_state.params['N_target'], 10.0,
            help="Target Nexus state"
        )
        st.session_state.params['N_initial'] = st.slider(
            "Initial State (N_0)",
            0.0, 2000.0, st.session_state.params['N_initial'], 10.0,
            help="Starting Nexus state"
        )
    
    st.subheader("Simulation Settings")
    col1, col2 = st.columns(2)
    with col1:
        st.session_state.params['delta_t'] = st.slider(
            "Time Step (Δt)",
            0.01, 1.0, st.session_state.params['delta_t'], 0.01
        )
    with col2:
        st.session_state.params['num_steps'] = st.slider(
            "Number of Steps",
            100, 5000, st.session_state.params['num_steps'], 100
        )
    
    if st.button("Reset to Defaults", type="secondary"):
        st.session_state.params = get_default_params()
        st.rerun()

def render_simulation():
    st.header("Simulation Engine")
    
    st.subheader("Input Signal Configuration")
    
    signal_names = ['H', 'M', 'D', 'E', 'C_cons', 'C_disp']
    signal_labels = {
        'H': 'Human Contribution (H)',
        'M': 'Machine Contribution (M)',
        'D': 'Data Inflow (D)',
        'E': 'Environmental Index (E)',
        'C_cons': 'Consumption Rate (C_cons)',
        'C_disp': 'Disposal Rate (C_disp)'
    }
    
    cols = st.columns(3)
    for idx, signal_name in enumerate(signal_names):
        with cols[idx % 3]:
            st.markdown(f"**{signal_labels[signal_name]}**")
            
            signal_type = st.selectbox(
                "Type",
                ['constant', 'sinusoidal', 'step', 'random_walk', 'pulse', 'ramp'],
                key=f"{signal_name}_type"
            )
            
            st.session_state.signal_configs[signal_name]['type'] = signal_type
            
            if signal_type == 'constant':
                value = st.number_input(
                    "Value",
                    value=st.session_state.signal_configs[signal_name].get('value', 100.0),
                    key=f"{signal_name}_value"
                )
                st.session_state.signal_configs[signal_name]['value'] = value
            
            elif signal_type == 'sinusoidal':
                offset = st.number_input(
                    "Offset",
                    value=st.session_state.signal_configs[signal_name].get('offset', 100.0),
                    key=f"{signal_name}_offset"
                )
                amplitude = st.number_input(
                    "Amplitude",
                    value=st.session_state.signal_configs[signal_name].get('amplitude', 20.0),
                    key=f"{signal_name}_amplitude"
                )
                frequency = st.number_input(
                    "Frequency",
                    value=st.session_state.signal_configs[signal_name].get('frequency', 0.01),
                    format="%.4f",
                    key=f"{signal_name}_frequency"
                )
                st.session_state.signal_configs[signal_name].update({
                    'offset': offset,
                    'amplitude': amplitude,
                    'frequency': frequency
                })
            
            elif signal_type == 'step':
                initial = st.number_input(
                    "Initial Value",
                    value=st.session_state.signal_configs[signal_name].get('initial', 100.0),
                    key=f"{signal_name}_initial"
                )
                final = st.number_input(
                    "Final Value",
                    value=st.session_state.signal_configs[signal_name].get('final', 150.0),
                    key=f"{signal_name}_final"
                )
                st.session_state.signal_configs[signal_name].update({
                    'initial': initial,
                    'final': final,
                    'step_at': st.session_state.params['num_steps'] // 2
                })
    
    st.divider()
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("▶️ Run Simulation", type="primary", use_container_width=True):
            # Validate parameters and signals before running
            is_valid = validate_and_display(
                st.session_state.params, 
                st.session_state.signal_configs
            )
            
            if is_valid:
                with st.spinner("Running simulation..."):
                    try:
                        oracle_manager = st.session_state.get('oracle_manager')
                        use_oracle = st.session_state.get('use_oracle_data', False)
                        oracle_refresh = st.session_state.get('oracle_refresh_interval', 10)
                        df = run_simulation(
                            st.session_state.params,
                            st.session_state.signal_configs,
                            oracle_manager,
                            use_oracle,
                            oracle_refresh
                        )
                        st.session_state.simulation_results = df
                        
                        if use_oracle and any(df['oracle_used']):
                            st.success(f"✅ Simulation completed with Oracle data! {len(df)} time steps processed.")
                        else:
                            st.success(f"Simulation completed! {len(df)} time steps processed.")
                        st.rerun()
                    except ValueError as e:
                        st.error(f"❌ Invalid simulation parameters\n{str(e)}\n💡 Check your parameter values and signal configurations.")
                    except RuntimeError as e:
                        st.error(f"❌ Simulation error\n{str(e)}\n💡 Try adjusting parameters or reducing the time step.")
                    except Exception as e:
                        st.error(f"❌ Unexpected error: {str(e)}\n💡 Please check the logs or contact support.")
            else:
                st.error("Please fix validation errors before running simulation.")
    
    with col2:
        if st.button("🔄 Reset Signals", type="secondary", use_container_width=True):
            st.session_state.signal_configs = get_default_signal_configs()
            st.rerun()
    
    with col3:
        if st.session_state.simulation_results is not None:
            csv = st.session_state.simulation_results.to_csv(index=False)
            st.download_button(
                "📥 Download Results (CSV)",
                csv,
                f"nexus_simulation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                "text/csv",
                use_container_width=True
            )
    
    if st.session_state.simulation_results is not None:
        st.subheader("Input Signals Preview")
        df = st.session_state.simulation_results
        
        fig = make_subplots(
            rows=2, cols=3,
            subplot_titles=('H(t)', 'M(t)', 'D(t)', 'E(t)', 'C_cons(t)', 'C_disp(t)')
        )
        
        signals = [
            ('H', 1, 1), ('M', 1, 2), ('D', 1, 3),
            ('E', 2, 1), ('C_cons', 2, 2), ('C_disp', 2, 3)
        ]
        
        for signal, row, col in signals:
            fig.add_trace(
                go.Scatter(x=df['t'], y=df[signal], mode='lines', name=signal),
                row=row, col=col
            )
        
        fig.update_layout(height=500, showlegend=False)
        st.plotly_chart(fig, width='stretch')

def render_advanced_analysis():
    st.header("Advanced Analysis Tools")
    
    analysis_type = st.selectbox(
        "Select Analysis Type",
        ["Monte Carlo Simulation", "Sensitivity Analysis", "Stability Region Mapping"]
    )
    
    if analysis_type == "Monte Carlo Simulation":
        render_monte_carlo()
    elif analysis_type == "Sensitivity Analysis":
        render_sensitivity_analysis()
    elif analysis_type == "Stability Region Mapping":
        render_stability_mapping()

def render_monte_carlo():
    st.subheader("Monte Carlo Simulation")
    st.markdown("""
    Run multiple simulations with parameter variations to understand the statistical 
    distribution of outcomes and assess system robustness under uncertainty.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        num_runs = st.slider("Number of Monte Carlo Runs", 10, 500, 100, 10)
        seed = st.number_input("Random Seed", value=42, min_value=0)
    
    with col2:
        st.markdown("**Select Parameters to Vary**")
        vary_alpha = st.checkbox("Issuance Gain (α)", value=True)
        vary_beta = st.checkbox("Burn Gain (β)", value=True)
        vary_kp = st.checkbox("PID Proportional (K_p)", value=False)
        vary_ki = st.checkbox("PID Integral (K_i)", value=False)
    
    st.subheader("Parameter Variation Settings")
    
    param_variations = {}
    
    if vary_alpha:
        col1, col2 = st.columns(2)
        with col1:
            alpha_mean = st.number_input("α Mean", value=st.session_state.params['alpha'], min_value=0.0, step=0.1)
        with col2:
            alpha_std = st.number_input("α Std Dev", value=0.2, min_value=0.0, step=0.05)
        param_variations['alpha'] = (alpha_mean, alpha_std)
    
    if vary_beta:
        col1, col2 = st.columns(2)
        with col1:
            beta_mean = st.number_input("β Mean", value=st.session_state.params['beta'], min_value=0.0, step=0.1)
        with col2:
            beta_std = st.number_input("β Std Dev", value=0.2, min_value=0.0, step=0.05)
        param_variations['beta'] = (beta_mean, beta_std)
    
    if vary_kp:
        col1, col2 = st.columns(2)
        with col1:
            kp_mean = st.number_input("K_p Mean", value=st.session_state.params['K_p'], min_value=0.0, step=0.01)
        with col2:
            kp_std = st.number_input("K_p Std Dev", value=0.02, min_value=0.0, step=0.005)
        param_variations['K_p'] = (kp_mean, kp_std)
    
    if vary_ki:
        col1, col2 = st.columns(2)
        with col1:
            ki_mean = st.number_input("K_i Mean", value=st.session_state.params['K_i'], min_value=0.0, step=0.001, format="%.4f")
        with col2:
            ki_std = st.number_input("K_i Std Dev", value=0.002, min_value=0.0, step=0.0005, format="%.4f")
        param_variations['K_i'] = (ki_mean, ki_std)
    
    if st.button("▶️ Run Monte Carlo Analysis", type="primary"):
        if not param_variations:
            st.warning("Please select at least one parameter to vary")
        else:
            with st.spinner(f"Running {num_runs} Monte Carlo simulations..."):
                mc_analyzer = MonteCarloAnalysis(st.session_state.params, st.session_state.signal_configs)
                mc_results = mc_analyzer.run_monte_carlo(param_variations, num_runs, int(seed))
                
                st.session_state['mc_results'] = mc_results
                
                st.success(f"✅ Completed {mc_results['num_successful_runs']} successful runs!")
    
    if 'mc_results' in st.session_state:
        mc_results = st.session_state['mc_results']
        stats = mc_results['statistics']
        
        st.divider()
        st.subheader("Monte Carlo Results")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Mean Final N",
                f"{stats['final_N']['mean']:.2f}",
                f"±{stats['final_N']['std']:.2f}"
            )
        
        with col2:
            st.metric(
                "95% CI Range",
                f"[{stats['final_N']['ci_lower']:.0f}, {stats['final_N']['ci_upper']:.0f}]"
            )
        
        with col3:
            st.metric(
                "Mean Issuance",
                f"{stats['avg_issuance']['mean']:.2f}",
                f"±{stats['avg_issuance']['std']:.2f}"
            )
        
        with col4:
            st.metric(
                "Mean Burn",
                f"{stats['avg_burn']['mean']:.2f}",
                f"±{stats['avg_burn']['std']:.2f}"
            )
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Final N Distribution")
            fig_hist = go.Figure()
            fig_hist.add_trace(go.Histogram(
                x=mc_results['raw_results']['final_N'],
                nbinsx=30,
                name='Final N',
                marker_color='steelblue'
            ))
            fig_hist.add_vline(
                x=stats['final_N']['mean'],
                line_dash="dash",
                line_color="red",
                annotation_text="Mean"
            )
            fig_hist.add_vline(
                x=stats['final_N']['ci_lower'],
                line_dash="dot",
                line_color="orange",
                annotation_text="95% CI"
            )
            fig_hist.add_vline(
                x=stats['final_N']['ci_upper'],
                line_dash="dot",
                line_color="orange"
            )
            fig_hist.update_layout(
                xaxis_title="Final Nexus State",
                yaxis_title="Frequency",
                height=400
            )
            st.plotly_chart(fig_hist, width='stretch')
        
        with col2:
            st.subheader("Conservation Error Distribution")
            fig_cons = go.Figure()
            fig_cons.add_trace(go.Histogram(
                x=mc_results['raw_results']['conservation_error'],
                nbinsx=30,
                name='Conservation Error',
                marker_color='purple'
            ))
            fig_cons.add_vline(
                x=stats['conservation_error']['mean'],
                line_dash="dash",
                line_color="red",
                annotation_text="Mean"
            )
            fig_cons.update_layout(
                xaxis_title="Conservation Error",
                yaxis_title="Frequency",
                height=400
            )
            st.plotly_chart(fig_cons, width='stretch')
        
        st.subheader("Issuance vs Burn Scatter")
        fig_scatter = go.Figure()
        fig_scatter.add_trace(go.Scatter(
            x=mc_results['raw_results']['avg_issuance'],
            y=mc_results['raw_results']['avg_burn'],
            mode='markers',
            marker=dict(
                color=mc_results['raw_results']['final_N'],
                colorscale='Viridis',
                size=8,
                colorbar=dict(title="Final N"),
                showscale=True
            ),
            text=[f"Run {i+1}" for i in range(len(mc_results['raw_results']['avg_issuance']))],
            hovertemplate='<b>%{text}</b><br>Avg I: %{x:.2f}<br>Avg B: %{y:.2f}<br>Final N: %{marker.color:.2f}<extra></extra>'
        ))
        fig_scatter.add_trace(go.Scatter(
            x=[min(mc_results['raw_results']['avg_issuance']), max(mc_results['raw_results']['avg_issuance'])],
            y=[min(mc_results['raw_results']['avg_issuance']), max(mc_results['raw_results']['avg_issuance'])],
            mode='lines',
            line=dict(dash='dash', color='red'),
            name='I = B (perfect conservation)'
        ))
        fig_scatter.update_layout(
            xaxis_title="Average Issuance",
            yaxis_title="Average Burn",
            height=500
        )
        st.plotly_chart(fig_scatter, width='stretch')
        
        if len(mc_results['param_variations']) > 0:
            st.subheader("Parameter Variation vs Outcomes")
            
            for param_name in mc_results['param_variations'].keys():
                param_values = [p.get(param_name, None) for p in mc_results['raw_results']['params_used']]
                
                if not any(param_values):
                    continue
                
                fig_param = make_subplots(
                    rows=1, cols=3,
                    subplot_titles=(
                        f'{param_name} vs Final N',
                        f'{param_name} vs Avg Issuance',
                        f'{param_name} vs Conservation Error'
                    )
                )
                
                fig_param.add_trace(
                    go.Scatter(
                        x=param_values,
                        y=mc_results['raw_results']['final_N'],
                        mode='markers',
                        marker=dict(size=8, color='steelblue'),
                        name='Final N'
                    ),
                    row=1, col=1
                )
                
                fig_param.add_trace(
                    go.Scatter(
                        x=param_values,
                        y=mc_results['raw_results']['avg_issuance'],
                        mode='markers',
                        marker=dict(size=8, color='green'),
                        name='Avg I'
                    ),
                    row=1, col=2
                )
                
                fig_param.add_trace(
                    go.Scatter(
                        x=param_values,
                        y=mc_results['raw_results']['conservation_error'],
                        mode='markers',
                        marker=dict(size=8, color='red'),
                        name='Cons Error'
                    ),
                    row=1, col=3
                )
                
                fig_param.update_xaxes(title_text=param_name, row=1, col=1)
                fig_param.update_xaxes(title_text=param_name, row=1, col=2)
                fig_param.update_xaxes(title_text=param_name, row=1, col=3)
                
                fig_param.update_layout(height=400, showlegend=False)
                st.plotly_chart(fig_param, width='stretch')
        
        with st.expander("📊 Detailed Statistics"):
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("**Final Nexus State (N)**")
                st.json(stats['final_N'])
                
                st.markdown("**Average Issuance**")
                st.json(stats['avg_issuance'])
            
            with col2:
                st.markdown("**Average Burn**")
                st.json(stats['avg_burn'])
                
                st.markdown("**Conservation Error**")
                st.json(stats['conservation_error'])

def render_sensitivity_analysis():
    st.subheader("Sensitivity Analysis")
    st.markdown("""
    Analyze how individual parameters affect system behavior by varying each parameter
    one at a time while holding others constant.
    """)
    
    col1, col2 = st.columns(2)
    
    with col1:
        variation_range = st.slider(
            "Variation Range (±%)",
            5, 50, 30,
            help="How much to vary each parameter around its current value"
        ) / 100.0
        
        num_points = st.slider(
            "Number of Sample Points",
            10, 50, 20,
            help="How many values to test for each parameter"
        )
    
    with col2:
        st.markdown("**Select Parameters to Analyze**")
        param_options = ['alpha', 'beta', 'kappa', 'eta', 'K_p', 'K_i', 'K_d', 'N_target']
        selected_params = st.multiselect(
            "Parameters",
            param_options,
            default=['alpha', 'beta', 'K_p']
        )
    
    if st.button("▶️ Run Sensitivity Analysis", type="primary"):
        if not selected_params:
            st.warning("Please select at least one parameter to analyze")
        else:
            with st.spinner(f"Running sensitivity analysis on {len(selected_params)} parameters..."):
                sens_analyzer = SensitivityAnalysis(st.session_state.params, st.session_state.signal_configs)
                sens_results = sens_analyzer.run_sensitivity_analysis(
                    selected_params,
                    variation_range,
                    num_points
                )
                
                st.session_state['sens_results'] = sens_results
                st.success("✅ Sensitivity analysis completed!")
    
    if 'sens_results' in st.session_state:
        sens_results = st.session_state['sens_results']
        
        st.divider()
        st.subheader("Sensitivity Results")
        
        rankings = sens_results['sensitivity_rankings']
        
        st.markdown("**Parameter Impact Rankings** (by effect on Final N)")
        ranking_df = pd.DataFrame(rankings)
        ranking_df['rank'] = range(1, len(rankings) + 1)
        ranking_df = ranking_df[['rank', 'parameter', 'impact_range', 'impact_std', 'avg_conservation_error']]
        ranking_df.columns = ['Rank', 'Parameter', 'Impact Range', 'Impact Std Dev', 'Avg Cons. Error']
        st.dataframe(ranking_df, width='stretch', hide_index=True)
        
        st.subheader("Parameter Sensitivity Curves")
        
        detailed = sens_results['detailed_results']
        
        for param_name in selected_params:
            if param_name not in detailed:
                continue
            
            param_data = detailed[param_name]
            
            if len(param_data['values']) == 0:
                continue
            
            st.markdown(f"**{param_name}**")
            
            fig = make_subplots(
                rows=2, cols=2,
                subplot_titles=(
                    'Final N vs Parameter',
                    'Avg Issuance vs Parameter',
                    'Conservation Error vs Parameter',
                    'Stability Metric vs Parameter'
                )
            )
            
            fig.add_trace(
                go.Scatter(x=param_data['values'], y=param_data['final_N'], mode='lines+markers', name='Final N'),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Scatter(x=param_data['values'], y=param_data['avg_issuance'], mode='lines+markers', name='Avg I', line=dict(color='green')),
                row=1, col=2
            )
            
            fig.add_trace(
                go.Scatter(x=param_data['values'], y=param_data['conservation_error'], mode='lines+markers', name='Cons. Error', line=dict(color='red')),
                row=2, col=1
            )
            
            fig.add_trace(
                go.Scatter(x=param_data['values'], y=param_data['stability_metric'], mode='lines+markers', name='Stability', line=dict(color='purple')),
                row=2, col=2
            )
            
            fig.update_xaxes(title_text=param_name, row=1, col=1)
            fig.update_xaxes(title_text=param_name, row=1, col=2)
            fig.update_xaxes(title_text=param_name, row=2, col=1)
            fig.update_xaxes(title_text=param_name, row=2, col=2)
            
            fig.update_layout(height=600, showlegend=False)
            st.plotly_chart(fig, width='stretch')

def render_stability_mapping():
    st.subheader("Stability Region Mapping")
    st.markdown("""
    Explore 2D parameter space to identify regions of stable vs unstable system behavior.
    Generates heatmaps showing which parameter combinations lead to stable operation.
    """)
    
    from monte_carlo_analysis import StabilityMapper
    
    all_params = [
        'alpha_base', 'alpha_H', 'alpha_M', 'alpha_D',
        'beta_base', 'beta_E', 'beta_C',
        'gamma_E', 'gamma_N', 'gamma_H', 'gamma_M',
        'kappa', 'eta_floor', 'F_floor',
        'Kp', 'Ki', 'Kd', 'N_target'
    ]
    
    param_defaults = {
        'alpha_base': 1.0,
        'Kp': 0.1
    }
    
    col1, col2 = st.columns(2)
    
    with col1:
        param1 = st.selectbox("Parameter 1 (X-axis)", all_params, index=0)
        param1_base = st.session_state.params.get(param1, param_defaults.get(param1, 1.0))
        param1_min = st.number_input(
            f"{param1} Min",
            value=float(param1_base * 0.5),
            format="%.4f"
        )
        param1_max = st.number_input(
            f"{param1} Max",
            value=float(param1_base * 1.5),
            format="%.4f"
        )
    
    with col2:
        param2 = st.selectbox("Parameter 2 (Y-axis)", all_params, index=14)
        param2_base = st.session_state.params.get(param2, param_defaults.get(param2, 0.1))
        param2_min = st.number_input(
            f"{param2} Min",
            value=float(param2_base * 0.5),
            format="%.4f"
        )
        param2_max = st.number_input(
            f"{param2} Max",
            value=float(param2_base * 1.5),
            format="%.4f"
        )
    
    resolution = st.slider("Grid Resolution", 10, 30, 15, help="Higher = more accurate but slower")
    
    if st.button("🗺️ Generate Stability Map", type="primary"):
        if param1 == param2:
            st.error("Please select different parameters for X and Y axes")
        else:
            with st.spinner(f"Mapping {resolution}x{resolution} parameter grid... This may take a few minutes."):
                try:
                    mapper = StabilityMapper(st.session_state.params, st.session_state.signal_configs)
                    
                    results = mapper.map_stability_region(
                        param1,
                        param2,
                        (param1_min, param1_max),
                        (param2_min, param2_max),
                        resolution
                    )
                    
                    st.session_state['stability_map_results'] = results
                    st.success(f"Stability map complete! {results['stable_fraction']*100:.1f}% of parameter space is stable.")
                    
                except Exception as e:
                    st.error(f"Stability mapping failed: {str(e)}")
    
    if 'stability_map_results' in st.session_state:
        results = st.session_state['stability_map_results']
        
        st.divider()
        st.subheader("Stability Map Results")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Stable Fraction",
                f"{results['stable_fraction']*100:.1f}%"
            )
        
        with col2:
            st.metric(
                "Stable Combinations",
                f"{len(results['stable_param_combinations'])}/{resolution*resolution}"
            )
        
        with col3:
            avg_cv = np.nanmean(results['cv_grid'])
            st.metric(
                "Avg Coef. of Variation",
                f"{avg_cv:.3f}"
            )
        
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=(
                'Stability Map (Green=Stable)',
                'Coefficient of Variation',
                'Final Nexus State',
                'Conservation Error'
            )
        )
        
        fig.add_trace(
            go.Heatmap(
                x=results['param1_values'],
                y=results['param2_values'],
                z=results['stability_grid'],
                colorscale=[[0, 'red'], [1, 'green']],
                showscale=True,
                colorbar=dict(x=0.46, len=0.4, y=0.75)
            ),
            row=1, col=1
        )
        
        fig.add_trace(
            go.Heatmap(
                x=results['param1_values'],
                y=results['param2_values'],
                z=results['cv_grid'],
                colorscale='Viridis',
                showscale=True,
                colorbar=dict(x=1.02, len=0.4, y=0.75)
            ),
            row=1, col=2
        )
        
        fig.add_trace(
            go.Heatmap(
                x=results['param1_values'],
                y=results['param2_values'],
                z=results['final_N_grid'],
                colorscale='RdYlBu',
                showscale=True,
                colorbar=dict(x=0.46, len=0.4, y=0.25)
            ),
            row=2, col=1
        )
        
        fig.add_trace(
            go.Heatmap(
                x=results['param1_values'],
                y=results['param2_values'],
                z=results['conservation_grid'],
                colorscale='Hot',
                showscale=True,
                colorbar=dict(x=1.02, len=0.4, y=0.25)
            ),
            row=2, col=2
        )
        
        fig.update_xaxes(title_text=results['param1_name'], row=1, col=1)
        fig.update_xaxes(title_text=results['param1_name'], row=1, col=2)
        fig.update_xaxes(title_text=results['param1_name'], row=2, col=1)
        fig.update_xaxes(title_text=results['param1_name'], row=2, col=2)
        
        fig.update_yaxes(title_text=results['param2_name'], row=1, col=1)
        fig.update_yaxes(title_text=results['param2_name'], row=1, col=2)
        fig.update_yaxes(title_text=results['param2_name'], row=2, col=1)
        fig.update_yaxes(title_text=results['param2_name'], row=2, col=2)
        
        fig.update_layout(height=800)
        st.plotly_chart(fig, width='stretch')
        
        with st.expander("📊 Stable Parameter Combinations"):
            if len(results['stable_param_combinations']) > 0:
                st.dataframe(
                    pd.DataFrame(results['stable_param_combinations']),
                    width='stretch'
                )
            else:
                st.warning("No stable parameter combinations found in this region.")

def render_oracles():
    st.header("Oracle Data Sources")
    st.markdown("""
    Connect NexusOS to real-world data sources like environmental sensors, APIs, and IoT devices.
    Oracle data can be used to drive simulations with live external data.
    """)
    
    manager = st.session_state.oracle_manager
    
    st.subheader("Configured Data Sources")
    
    sources = manager.get_all_sources()
    
    if sources:
        status_data = []
        for source in sources:
            status = source.get_status()
            status_data.append({
                'Name': status['name'],
                'Type': status['type'],
                'Status': '✅ Connected' if status['connected'] else '❌ Disconnected',
                'Last Update': status.get('last_update', 'Never'),
                'Error': status.get('error', '')
            })
        
        st.dataframe(pd.DataFrame(status_data), width='stretch')
        
        st.divider()
        
        st.subheader("Manage Sources")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🔌 Connect All", use_container_width=True):
                with st.spinner("Connecting to data sources..."):
                    results = manager.connect_all()
                    success_count = sum(1 for v in results.values() if v)
                    if success_count == len(results):
                        st.success(f"✅ All {len(results)} sources connected")
                    else:
                        st.warning(f"⚠️ {success_count}/{len(results)} sources connected")
                st.rerun()
        
        with col2:
            if st.button("🔌 Disconnect All", use_container_width=True):
                manager.disconnect_all()
                st.success("Disconnected all sources")
                st.rerun()
        
        with col3:
            st.session_state.use_oracle_data = st.checkbox(
                "Use Oracle Data in Simulations",
                value=st.session_state.get('use_oracle_data', False),
                help="When enabled, simulations will fetch real-time data from connected oracles"
            )
        
        if st.session_state.use_oracle_data:
            st.divider()
            st.subheader("Oracle Sampling Settings")
            
            st.session_state.oracle_refresh_interval = st.slider(
                "Oracle Refresh Interval (simulation steps)",
                min_value=1,
                max_value=100,
                value=st.session_state.get('oracle_refresh_interval', 10),
                help="Fetch fresh oracle data every N simulation steps. Lower = more API calls but fresher data. Higher = fewer API calls but data held longer."
            )
            
            num_steps = st.session_state.params.get('num_steps', 1000)
            refresh_interval = st.session_state.oracle_refresh_interval
            total_fetches = (num_steps // refresh_interval) + 1
            total_requests = total_fetches * 6
            
            st.info(f"📊 **Estimated API Load**: ~{total_requests} HTTP requests for {num_steps} simulation steps ({total_fetches} refreshes × 6 variables)")
        
        st.divider()
        
        st.subheader("Test Data Fetch")
        
        col_var, col_source, col_test = st.columns([2, 2, 1])
        
        with col_var:
            test_variable = st.selectbox(
                "Variable to Test",
                ['E', 'H', 'M', 'D', 'C_cons', 'C_disp'],
                key='test_oracle_var'
            )
        
        with col_source:
            source_names = [s.name for s in sources if s.is_connected]
            if source_names:
                test_source = st.selectbox(
                    "Source",
                    ['Auto (First Available)'] + source_names,
                    key='test_oracle_source'
                )
            else:
                st.warning("No connected sources")
                test_source = None
        
        with col_test:
            st.write("")
            st.write("")
            if st.button("🔍 Fetch", use_container_width=True):
                if test_source:
                    source_name = None if test_source == 'Auto (First Available)' else test_source
                    data_point = manager.fetch_variable(test_variable, source_name)
                    
                    if data_point:
                        st.success(f"**{test_variable}** = {data_point.value:.4f}")
                        with st.expander("Details"):
                            st.json(data_point.to_dict())
                    else:
                        st.error(f"Failed to fetch {test_variable}")
    
    else:
        st.info("No oracle data sources configured")
    
    st.divider()
    
    st.subheader("Add New Oracle Source")
    
    with st.form("add_oracle_form"):
        oracle_type = st.selectbox(
            "Oracle Type",
            ['mock_environmental', 'static', 'rest_api'],
            format_func=lambda x: {
                'mock_environmental': 'Mock Environmental Sensor (with noise)',
                'static': 'Static Data (fixed values)',
                'rest_api': 'REST API'
            }[x]
        )
        
        oracle_name = st.text_input("Oracle Name", value=f"New {oracle_type.replace('_', ' ').title()}")
        
        config = {}
        
        if oracle_type == 'mock_environmental':
            variation = st.slider("Variation (%)", 0, 50, 15) / 100.0
            config = {'variation': variation}
        
        elif oracle_type == 'static':
            st.write("Set static values for each variable:")
            col1, col2 = st.columns(2)
            with col1:
                E_val = st.number_input("E (Environmental)", 0.0, 1.0, 0.8)
                H_val = st.number_input("H (Human)", 0.0, 1000.0, 100.0)
                M_val = st.number_input("M (Machine)", 0.0, 1000.0, 100.0)
            with col2:
                D_val = st.number_input("D (Data)", 0.0, 1000.0, 50.0)
                C_cons_val = st.number_input("C_cons (Consumption)", 0.0, 1000.0, 15.0)
                C_disp_val = st.number_input("C_disp (Disposal)", 0.0, 1000.0, 8.0)
            
            config = {
                'data_values': {
                    'E': E_val,
                    'H': H_val,
                    'M': M_val,
                    'D': D_val,
                    'C_cons': C_cons_val,
                    'C_disp': C_disp_val
                }
            }
        
        elif oracle_type == 'rest_api':
            base_url = st.text_input("Base URL", placeholder="https://api.example.com")
            st.write("Configure endpoints for each variable:")
            
            endpoints = {}
            cols = st.columns(2)
            variables = ['E', 'H', 'M', 'D', 'C_cons', 'C_disp']
            for i, var in enumerate(variables):
                with cols[i % 2]:
                    endpoint = st.text_input(
                        f"{var} endpoint",
                        placeholder=f"/api/{var.lower()}",
                        key=f"endpoint_{var}"
                    )
                    if endpoint:
                        endpoints[var] = endpoint
            
            config = {
                'base_url': base_url,
                'variable_endpoints': endpoints,
                'timeout': 10
            }
        
        submitted = st.form_submit_button("➕ Add Oracle Source", use_container_width=True)
        
        if submitted:
            try:
                new_source = manager.create_source(oracle_type, oracle_name, config)
                manager.add_source(new_source)
                st.success(f"✅ Added oracle source: {oracle_name}")
                st.rerun()
            except Exception as e:
                st.error(f"Failed to add oracle: {str(e)}")
    
    st.divider()
    
    with st.expander("ℹ️ About Oracle Integration"):
        st.markdown("""
        ### Oracle Data Sources
        
        Oracles provide external data feeds to NexusOS simulations:
        
        **Mock Environmental Sensor**
        - Simulates realistic sensor data with random variation
        - Useful for testing and development
        - No external dependencies
        
        **Static Data**
        - Fixed values for all variables
        - Useful for baseline testing
        - Deterministic and reproducible
        
        **REST API**
        - Connect to real web APIs
        - Fetch live environmental, economic, or IoT data
        - Requires properly configured endpoints
        
        ### Using Oracle Data
        
        1. Configure and connect your oracle sources
        2. Enable "Use Oracle Data in Simulations"
        3. Run simulations - oracle data will override signal generators
        4. Monitor oracle status and data quality
        
        ### Best Practices
        
        - Test oracle connections before running long simulations
        - Use static or mock oracles for reproducible experiments
        - Monitor oracle errors and connection status
        - Implement fallback strategies for production deployments
        """)

def render_ml_optimization():
    st.header("ML-Based Parameter Optimization")
    
    st.markdown("""
    Automatically find optimal parameter configurations using **Bayesian Optimization** - 
    an intelligent search algorithm that learns from each simulation to explore the parameter space efficiently.
    """)
    
    from ml_optimization import BayesianOptimizer, PARAMETER_SPACE, HistoricalAnalyzer
    from database import OptimizationRun, OptimizationIteration
    
    st.divider()
    
    st.subheader("1️⃣ Select Optimization Objective")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        objective_type = st.selectbox(
            "Objective Function",
            options=['stability', 'conservation', 'growth', 'stability_and_growth', 'custom'],
            format_func=lambda x: {
                'stability': '📊 Stability - Minimize volatility in N(t)',
                'conservation': '⚖️ Conservation - Minimize issuance/burn error',
                'growth': '📈 Growth - Maximize long-term N value',
                'stability_and_growth': '🎯 Balanced - Stability + Growth',
                'custom': '🎨 Custom - Weighted combination'
            }[x],
            help="Choose what aspect of the system to optimize"
        )
    
    objective_weights = {}
    if objective_type == 'custom':
        st.markdown("**Custom Objective Weights** (must sum to ~1.0)")
        col_a, col_b, col_c = st.columns(3)
        with col_a:
            objective_weights['stability'] = st.slider("Stability", 0.0, 1.0, 0.4, 0.05)
        with col_b:
            objective_weights['conservation'] = st.slider("Conservation", 0.0, 1.0, 0.3, 0.05)
        with col_c:
            objective_weights['growth'] = st.slider("Growth", 0.0, 1.0, 0.3, 0.05)
        
        total_weight = sum(objective_weights.values())
        if abs(total_weight - 1.0) > 0.1:
            st.warning(f"⚠️ Weights sum to {total_weight:.2f}, recommended to be close to 1.0")
    
    st.divider()
    
    st.subheader("2️⃣ Select Parameters to Optimize")
    
    st.markdown("Choose which parameters the algorithm should tune (others will be fixed):")
    
    categories = {
        'Core Rates': ['alpha', 'beta', 'kappa', 'eta'],
        'System Health Weights': ['w_H', 'w_M', 'w_D', 'w_E'],
        'Burn Coefficients': ['gamma_C', 'gamma_D', 'gamma_E'],
        'PID Controller': ['K_p', 'K_i', 'K_d'],
        'Issuance Multipliers': ['lambda_E', 'lambda_N', 'lambda_H', 'lambda_M'],
        'Targets': ['N_target', 'F_floor']
    }
    
    selected_params = []
    
    for category, params in categories.items():
        with st.expander(f"**{category}** ({len(params)} parameters)"):
            cols = st.columns(2)
            for idx, param in enumerate(params):
                with cols[idx % 2]:
                    if st.checkbox(
                        f"{param} - {PARAMETER_SPACE[param]['description']}", 
                        value=(category == 'PID Controller'),
                        key=f"opt_param_{param}"
                    ):
                        selected_params.append(param)
    
    if not selected_params:
        st.warning("⚠️ Please select at least one parameter to optimize")
        return
    
    st.success(f"✅ {len(selected_params)} parameters selected for optimization")
    
    st.divider()
    
    st.subheader("3️⃣ Optimization Settings")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        n_iterations = st.number_input(
            "Number of Iterations",
            min_value=10,
            max_value=200,
            value=50,
            step=10,
            help="More iterations = better results but slower"
        )
    
    with col2:
        use_warm_start = st.checkbox(
            "Warm Start from History",
            value=True,
            help="Initialize optimization with best historical runs"
        )
    
    with col3:
        warm_start_count = st.number_input(
            "Historical Runs to Use",
            min_value=1,
            max_value=20,
            value=5,
            disabled=not use_warm_start
        )
    
    st.divider()
    
    st.subheader("4️⃣ Run Optimization")
    
    optimization_name = st.text_input(
        "Optimization Run Name",
        value=f"Optimization_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        help="Name for this optimization run"
    )
    
    if st.button("🚀 Start Optimization", type="primary", use_container_width=True):
        with st.spinner(f"Running Bayesian Optimization ({n_iterations} iterations)..."):
            
            def simulation_wrapper(params_to_test):
                full_params = st.session_state.params.copy()
                full_params.update(params_to_test)
                
                results_df = run_simulation(
                    full_params,
                    st.session_state.signal_configs,
                    oracle_manager=None,
                    use_oracle_data=False
                )
                return results_df
            
            warm_start_data = None
            if use_warm_start:
                session = get_session()
                if session:
                    warm_start_data = HistoricalAnalyzer.get_best_runs_from_db(
                        session, 
                        objective_type, 
                        top_n=warm_start_count
                    )
                    if warm_start_data:
                        st.info(f"📚 Loaded {len(warm_start_data)} historical runs for warm-starting")
            
            optimizer = BayesianOptimizer(
                simulation_func=simulation_wrapper,
                parameter_names=selected_params,
                objective_type=objective_type,
                objective_weights=objective_weights,
                n_iterations=n_iterations,
                warm_start_data=warm_start_data
            )
            
            fixed_params = {k: v for k, v in st.session_state.params.items() 
                           if k not in selected_params}
            
            result = optimizer.optimize(fixed_params)
            
            st.success(f"✅ Optimization complete! Best score: {result['best_score']:.6f}")
            
            session = get_session()
            if session:
                try:
                    opt_run = OptimizationRun(
                        name=optimization_name,
                        objective_type=objective_type,
                        objective_weights=objective_weights,
                        parameters_optimized=selected_params,
                        parameter_bounds={p: PARAMETER_SPACE[p]['bounds'] for p in selected_params},
                        n_iterations=n_iterations,
                        best_params=result['best_params'],
                        best_score=result['best_score'],
                        convergence_history=result['convergence_history'],
                        completed_at=datetime.now()
                    )
                    session.add(opt_run)
                    session.commit()
                    
                    st.session_state.latest_optimization = result
                    st.session_state.latest_optimization_name = optimization_name
                    
                    st.success("💾 Optimization results saved to database")
                except Exception as e:
                    st.warning(f"Could not save to database: {e}")
            
            st.session_state.latest_optimization = result
    
    if 'latest_optimization' in st.session_state:
        st.divider()
        st.subheader("📊 Optimization Results")
        
        result = st.session_state.latest_optimization
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### Best Parameters Found")
            best_params_df = pd.DataFrame([
                {"Parameter": k, "Optimal Value": f"{v:.6f}", 
                 "Description": PARAMETER_SPACE[k]['description']}
                for k, v in result['best_params'].items()
            ])
            st.dataframe(best_params_df, width='stretch')
            
            if st.button("📥 Apply Best Parameters"):
                st.session_state.params.update(result['best_params'])
                st.success("✅ Parameters applied! Go to Simulation tab to run with optimized settings.")
                st.rerun()
        
        with col2:
            st.markdown("### Optimization Metrics")
            st.metric("Best Score Achieved", f"{result['best_score']:.6f}")
            st.metric("Iterations Completed", result['n_iterations'])
            
            if 'convergence_history' in result and result['convergence_history']:
                improvement = result['convergence_history'][0] - result['best_score']
                st.metric("Total Improvement", f"{improvement:.6f}")
        
        if 'convergence_history' in result and result['convergence_history']:
            st.markdown("### Convergence Plot")
            
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=list(range(len(result['convergence_history']))),
                y=result['convergence_history'],
                mode='lines+markers',
                name='Objective Value',
                line=dict(color='#1f77b4')
            ))
            
            best_so_far = []
            current_best = float('inf')
            for val in result['convergence_history']:
                current_best = min(current_best, val)
                best_so_far.append(current_best)
            
            fig.add_trace(go.Scatter(
                x=list(range(len(best_so_far))),
                y=best_so_far,
                mode='lines',
                name='Best So Far',
                line=dict(color='#ff7f0e', dash='dash')
            ))
            
            fig.update_layout(
                title="Optimization Convergence",
                xaxis_title="Iteration",
                yaxis_title="Objective Value (lower is better)",
                height=400,
                hovermode='x unified'
            )
            
            st.plotly_chart(fig, width='stretch')
    
    st.divider()
    
    with st.expander("📖 About ML Optimization"):
        st.markdown("""
        ### How It Works
        
        **Bayesian Optimization** uses a probabilistic model (Gaussian Process) to intelligently search 
        the parameter space. Unlike random or grid search, it:
        
        1. **Learns from each trial** - Builds a model of which parameters lead to good results
        2. **Balances exploration vs exploitation** - Tries new areas while refining promising regions
        3. **Efficient for expensive evaluations** - Finds good solutions with fewer simulations
        
        ### Objective Functions
        
        - **Stability**: Minimizes coefficient of variation in N(t) - good for steady-state systems
        - **Conservation**: Minimizes error between total issuance and burn - ensures balance
        - **Growth**: Maximizes final N value - good for growth-oriented configurations
        - **Balanced**: Weighted combination of stability and growth
        - **Custom**: Define your own weights for multi-objective optimization
        
        ### Tips for Best Results
        
        - Start with 50-100 iterations for good coverage
        - Enable warm-start to leverage historical knowledge
        - Optimize fewer parameters (3-5) first, then add more
        - Review convergence plot - should show improvement over time
        - Run multiple optimizations with different objectives to explore trade-offs
        """)

def render_admin():
    """Admin-only user management interface."""
    from database import User, Role, UserRole, get_engine
    from auth import create_user, get_user_roles, hash_password
    from sqlalchemy.orm import sessionmaker
    from db_error_handling import DatabaseError, ConstraintViolationError, ConnectionError, handle_db_error
    
    if not AuthManager.require_role('admin'):
        return
    
    st.header("👥 User Management")
    st.markdown("Manage system users and their roles")
    
    st.divider()
    
    col1, col2 = st.columns([2, 3])
    
    with col1:
        st.subheader("Create New User")
        
        with st.form("create_user_form"):
            new_email = st.text_input("Email", placeholder="user@example.com")
            new_password = st.text_input("Temporary Password", type="password", help="User should change this on first login")
            
            st.markdown("**Assign Roles:**")
            role_admin = st.checkbox("Admin - Full system access")
            role_researcher = st.checkbox("Researcher - Can create/run simulations", value=True)
            role_viewer = st.checkbox("Viewer - Read-only access")
            
            submit_create = st.form_submit_button("➕ Create User", use_container_width=True)
            
            if submit_create:
                if not new_email or not new_password:
                    st.error("❌ Missing required fields\nEmail and password are required\n💡 All fields must be completed to create a user account.")
                elif len(new_password) < 8:
                    st.error("❌ Password too short\nPassword must be at least 8 characters\n💡 Use a longer password for better security.")
                else:
                    roles = []
                    if role_admin:
                        roles.append('admin')
                    if role_researcher:
                        roles.append('researcher')
                    if role_viewer:
                        roles.append('viewer')
                    
                    if not roles:
                        st.error("Please select at least one role")
                    else:
                        engine = get_engine()
                        SessionLocal = sessionmaker(bind=engine)
                        db = SessionLocal()
                        
                        try:
                            user = create_user(db, new_email, new_password, roles)
                            if user:
                                st.success(f"✅ User '{new_email}' created successfully with roles: {', '.join(roles)}")
                                st.rerun()
                            else:
                                st.error("❌ User with this email already exists\n💡 Please use a different email address.")
                        except (DatabaseError, ConstraintViolationError, ConnectionError) as e:
                            st.error(e.get_user_message())
                        except Exception as e:
                            st.error(handle_db_error(e, "creating user"))
                        finally:
                            db.close()
    
    with col2:
        st.subheader("Existing Users")
        
        engine = get_engine()
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            users = db.query(User).order_by(User.created_at.desc()).all()
            
            if users:
                for user in users:
                    is_active = bool(user.is_active)
                    last_login = user.last_login
                    with st.expander(f"👤 {user.email} {'✅' if is_active else '❌'}"):
                        st.write(f"**ID:** {user.id}")
                        st.write(f"**Created:** {user.created_at.strftime('%Y-%m-%d %H:%M')}")
                        if last_login is not None:
                            st.write(f"**Last Login:** {last_login.strftime('%Y-%m-%d %H:%M')}")
                        else:
                            st.write("**Last Login:** Never")
                        
                        user_roles = get_user_roles(db, user)
                        st.write(f"**Roles:** {', '.join(user_roles) if user_roles else 'None'}")
                        
                        col_a, col_b, col_c = st.columns(3)
                        
                        with col_a:
                            if is_active:
                                if st.button(f"🚫 Deactivate", key=f"deact_{user.id}"):
                                    db.query(User).filter(User.id == user.id).update({'is_active': False})
                                    db.commit()
                                    st.success("User deactivated")
                                    st.rerun()
                            else:
                                if st.button(f"✅ Activate", key=f"act_{user.id}"):
                                    db.query(User).filter(User.id == user.id).update({'is_active': True})
                                    db.commit()
                                    st.success("User activated")
                                    st.rerun()
                        
                        with col_b:
                            if st.button(f"🔑 Reset Password", key=f"reset_{user.id}"):
                                st.info("Password reset feature - provide new temporary password")
                        
                        with col_c:
                            if st.button(f"🗑️ Delete", key=f"del_{user.id}"):
                                if user.email == st.session_state.current_user.email:
                                    st.error("Cannot delete your own account")
                                else:
                                    db.delete(user)
                                    db.commit()
                                    st.success("User deleted")
                                    st.rerun()
            else:
                st.info("No users yet")
        
        except (DatabaseError, ConstraintViolationError, ConnectionError) as e:
            st.error(e.get_user_message())
        except Exception as e:
            st.error(handle_db_error(e, "loading users"))
        finally:
            db.close()
    
    st.divider()
    
    st.subheader("📊 System Statistics")
    
    engine = get_engine()
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Total Users", total_users)
        
        with col2:
            st.metric("Active Users", active_users)
        
        with col3:
            st.metric("Inactive Users", total_users - active_users)
    
    except (DatabaseError, ConstraintViolationError, ConnectionError) as e:
        st.error(e.get_user_message())
    except Exception as e:
        st.error(handle_db_error(e, "loading statistics"))
    finally:
        db.close()

def render_scenarios():
    from db_error_handling import DatabaseError, ConstraintViolationError, ConnectionError, handle_db_error
    
    st.header("Scenario Management")
    
    session = get_session()
    if session is None:
        st.error("⚠️ Database connection unavailable. Scenario management requires database access.")
        st.info("The database may be temporarily unavailable. Please try refreshing the page or contact support if this persists.")
        return
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Save Current Configuration")
        scenario_name = st.text_input("Scenario Name", placeholder="e.g., Baseline Scenario")
        scenario_desc = st.text_area("Description", placeholder="Optional description...")
        
        if st.button("💾 Save Scenario", type="primary"):
            if not scenario_name:
                st.error("Please provide a scenario name")
            else:
                try:
                    session = get_session()
                    if session is None:
                        st.error("Database connection unavailable")
                        return
                    
                    config = SimulationConfig(
                        name=scenario_name,
                        description=scenario_desc,
                        **st.session_state.params,
                        signal_config=st.session_state.signal_configs
                    )
                    
                    session.add(config)
                    session.commit()
                    
                    if st.session_state.simulation_results is not None:
                        df = st.session_state.simulation_results
                        
                        run = SimulationRun(
                            config_id=config.id,
                            time_series=df.to_dict('list'),
                            final_N=float(df['N'].iloc[-1]),
                            avg_issuance=float(df['I'].mean()),
                            avg_burn=float(df['B'].mean()),
                            conservation_error=float(abs(df['cumulative_I'].iloc[-1] - df['cumulative_B'].iloc[-1]))
                        )
                        
                        session.add(run)
                        session.commit()
                    
                    session.close()
                    st.success(f"✅ Scenario '{scenario_name}' saved successfully!")
                    
                except (DatabaseError, ConstraintViolationError, ConnectionError) as e:
                    st.error(e.get_user_message())
                except Exception as e:
                    st.error(handle_db_error(e, "saving scenario"))
    
    with col2:
        st.subheader("Export Options")
        
        if st.session_state.simulation_results is not None:
            json_data = {
                'parameters': st.session_state.params,
                'signal_configs': st.session_state.signal_configs,
                'results': st.session_state.simulation_results.to_dict('list')
            }
            
            st.download_button(
                "📄 Download JSON",
                json.dumps(json_data, indent=2),
                f"nexus_scenario_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                "application/json"
            )
        else:
            st.info("Run a simulation to export data")
    
    st.divider()
    
    st.subheader("Saved Scenarios")
    
    try:
        session = get_session()
        if session is None:
            st.error("Database connection unavailable")
            return
        configs = session.query(SimulationConfig).order_by(SimulationConfig.created_at.desc()).all()
        
        if configs:
            for config in configs:
                with st.expander(f"📊 {config.name} - {config.created_at.strftime('%Y-%m-%d %H:%M')}"):
                    if config.description is not None:
                        st.markdown(f"**Description:** {config.description}")
                    
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        st.metric("α (Issuance)", f"{config.alpha:.2f}")
                        st.metric("β (Burn)", f"{config.beta:.2f}")
                        st.metric("κ (Decay)", f"{config.kappa:.3f}")
                    
                    with col2:
                        st.metric("K_p", f"{config.K_p:.3f}")
                        st.metric("K_i", f"{config.K_i:.4f}")
                        st.metric("K_d", f"{config.K_d:.3f}")
                    
                    with col3:
                        st.metric("N* (Target)", f"{config.N_target:.0f}")
                        st.metric("N_0 (Initial)", f"{config.N_initial:.0f}")
                        st.metric("Steps", f"{config.num_steps}")
                    
                    if st.button(f"Load Scenario", key=f"load_{config.id}"):
                        st.session_state.params = {
                            'alpha': config.alpha,
                            'beta': config.beta,
                            'kappa': config.kappa,
                            'eta': config.eta,
                            'w_H': config.w_H,
                            'w_M': config.w_M,
                            'w_D': config.w_D,
                            'w_E': config.w_E,
                            'gamma_C': config.gamma_C,
                            'gamma_D': config.gamma_D,
                            'gamma_E': config.gamma_E,
                            'K_p': config.K_p,
                            'K_i': config.K_i,
                            'K_d': config.K_d,
                            'N_target': config.N_target,
                            'N_initial': config.N_initial,
                            'F_floor': config.F_floor,
                            'lambda_E': config.lambda_E,
                            'lambda_N': config.lambda_N,
                            'lambda_H': config.lambda_H,
                            'lambda_M': config.lambda_M,
                            'N_0': config.N_0,
                            'H_0': config.H_0,
                            'M_0': config.M_0,
                            'delta_t': config.delta_t,
                            'num_steps': config.num_steps
                        }
                        
                        if config.signal_config is not None:
                            st.session_state.signal_configs = config.signal_config
                        
                        st.success(f"✅ Loaded scenario '{config.name}'")
                        st.rerun()
        else:
            st.info("No saved scenarios yet. Save your first configuration above!")
        
        session.close()
        
    except Exception as e:
        st.error(f"Error loading scenarios: {str(e)}")

def render_wnsp():
    """Render the Wavelength-Native Signaling Protocol (WNSP) interface."""
    from wnsp_renderer import render_wnsp_interface
    render_wnsp_interface()

def render_task_orchestration():
    """Render the Task Orchestration DAG interface."""
    from task_orchestration import TaskOrchestrationDAG, TaskBuilder, TaskStatus, TaskPriority
    from task_handlers import register_all_handlers
    from dag_domains import DomainRegistry
    
    st.header("🔧 Task Orchestration System")
    st.markdown("""
    DAG-based workflow automation for administration, communications, integrations, and more.
    Create complex multi-step workflows with dependency management and error handling.
    """)
    
    if 'task_dag' not in st.session_state:
        st.session_state.task_dag = TaskOrchestrationDAG()
        register_all_handlers(st.session_state.task_dag)
    
    if 'task_execution_results' not in st.session_state:
        st.session_state.task_execution_results = None
    
    st.subheader("📋 Workflow Templates")
    
    # Domain selection
    try:
        from dag_domains.data_processing import DataProcessingDomain
        available_domains = ['Core', 'Data Processing']
    except:
        available_domains = ['Core']
    
    selected_domain = st.selectbox(
        "Select Domain",
        available_domains,
        help="Choose a workflow domain to see available templates"
    )
    
    st.divider()
    
    template_col1, template_col2, template_col3 = st.columns(3)
    
    with template_col1:
        if st.button("📧 User Onboarding", use_container_width=True):
            dag = TaskOrchestrationDAG()
            register_all_handlers(dag)
            
            create_user_task = (TaskBuilder('create-user')
                .type('admin')
                .operation('log_system_event')
                .params({
                    'event_type': 'user_created',
                    'message': 'New user registered in system'
                })
                .priority(TaskPriority.HIGH)
                .build())
            
            send_welcome_task = (TaskBuilder('send-welcome-email')
                .type('communication')
                .operation('send_email')
                .params({
                    'to': 'newuser@example.com',
                    'subject': 'Welcome to NexusOS!',
                    'body': 'Thank you for joining NexusOS. Get started with our platform.'
                })
                .depends_on('create-user')
                .build())
            
            log_complete_task = (TaskBuilder('log-onboarding')
                .type('admin')
                .operation('log_system_event')
                .params({
                    'event_type': 'onboarding_complete',
                    'message': 'User onboarding workflow completed'
                })
                .depends_on('send-welcome-email')
                .build())
            
            dag.add_task(create_user_task)
            dag.add_task(send_welcome_task)
            dag.add_task(log_complete_task)
            
            results = dag.execute_all()
            st.session_state.task_execution_results = results
            st.success("✅ User onboarding workflow executed!")
            st.rerun()
    
    with template_col2:
        if st.button("🔔 Multi-Channel Alert", use_container_width=True):
            dag = TaskOrchestrationDAG()
            register_all_handlers(dag)
            
            email_task = (TaskBuilder('email-alert')
                .type('communication')
                .operation('send_email')
                .params({
                    'to': 'admin@example.com',
                    'subject': 'Simulation Alert',
                    'body': 'Important simulation event detected'
                })
                .priority(TaskPriority.HIGH)
                .build())
            
            sms_task = (TaskBuilder('sms-alert')
                .type('communication')
                .operation('send_sms')
                .params({
                    'to': '+1234567890',
                    'message': 'Simulation alert - check email for details'
                })
                .priority(TaskPriority.HIGH)
                .build())
            
            log_task = (TaskBuilder('log-alert')
                .type('admin')
                .operation('log_system_event')
                .params({
                    'event_type': 'alert_sent',
                    'message': 'Multi-channel alert dispatched'
                })
                .depends_on('email-alert', 'sms-alert')
                .build())
            
            dag.add_task(email_task)
            dag.add_task(sms_task)
            dag.add_task(log_task)
            
            results = dag.execute_all()
            st.session_state.task_execution_results = results
            st.success("✅ Multi-channel alert workflow executed!")
            st.rerun()
    
    with template_col3:
        if selected_domain == 'Core':
            if st.button("📱 Social Media Post", use_container_width=True):
                dag = TaskOrchestrationDAG()
                register_all_handlers(dag)
                
                twitter_task = (TaskBuilder('twitter-post')
                    .type('social')
                    .operation('post_to_twitter')
                    .params({
                        'message': 'Just completed a NexusOS simulation! 🚀 #DataScience #Economics'
                    })
                    .build())
                
                linkedin_task = (TaskBuilder('linkedin-post')
                    .type('social')
                    .operation('post_to_linkedin')
                    .params({
                        'message': 'Excited to share insights from our latest NexusOS economic simulation.',
                        'visibility': 'public'
                    })
                    .build())
                
                log_task = (TaskBuilder('log-social')
                    .type('admin')
                    .operation('log_system_event')
                    .params({
                        'event_type': 'social_posts_published',
                        'message': 'Social media posts published successfully'
                    })
                    .depends_on('twitter-post', 'linkedin-post')
                    .build())
                
                dag.add_task(twitter_task)
                dag.add_task(linkedin_task)
                dag.add_task(log_task)
                
                results = dag.execute_all()
                st.session_state.task_execution_results = results
                st.success("✅ Social media posting workflow executed!")
                st.rerun()
        else:
            if st.button("🤖 ML Training Pipeline", use_container_width=True):
                try:
                    domain = DataProcessingDomain()
                    dag = domain.create_ml_pipeline()
                    results = dag.execute_all()
                    st.session_state.task_execution_results = results
                    st.success("✅ ML training pipeline executed!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
    
    # Data Processing domain workflows
    if selected_domain == 'Data Processing':
        st.divider()
        st.subheader("🔬 Data Processing Workflows")
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("📦 ETL Pipeline", use_container_width=True):
                try:
                    domain = DataProcessingDomain()
                    dag = domain.create_etl_pipeline()
                    results = dag.execute_all()
                    st.session_state.task_execution_results = results
                    st.success("✅ ETL pipeline executed!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
        
        with col2:
            if st.button("✅ Data Quality Check", use_container_width=True):
                try:
                    domain = DataProcessingDomain()
                    dag = domain.create_quality_check()
                    results = dag.execute_all()
                    st.session_state.task_execution_results = results
                    st.success("✅ Quality check completed!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Error: {str(e)}")
    
    st.divider()
    
    if st.session_state.task_execution_results:
        st.subheader("📊 Execution Results")
        
        results = st.session_state.task_execution_results
        
        status_counts = {
            'completed': sum(1 for r in results.values() if r.status == TaskStatus.COMPLETED),
            'failed': sum(1 for r in results.values() if r.status == TaskStatus.FAILED),
            'cancelled': sum(1 for r in results.values() if r.status == TaskStatus.CANCELLED)
        }
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Tasks", len(results))
        with col2:
            st.metric("✅ Completed", status_counts['completed'])
        with col3:
            st.metric("❌ Failed", status_counts['failed'])
        with col4:
            st.metric("🚫 Cancelled", status_counts['cancelled'])
        
        st.divider()
        
        for task_id, result in results.items():
            status_emoji = {
                TaskStatus.COMPLETED: "✅",
                TaskStatus.FAILED: "❌",
                TaskStatus.CANCELLED: "🚫"
            }.get(result.status, "❓")
            
            with st.expander(f"{status_emoji} {task_id} - {result.status.value}"):
                if result.output:
                    st.json(result.output)
                if result.error:
                    st.error(f"Error: {result.error}")
                st.caption(f"Execution time: {result.execution_time:.3f}s | Retries: {result.retry_count}")
    
    st.divider()
    
    st.subheader("🎯 Task Categories")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        **Administration**
        - 👤 User management (create, update roles)
        - 📝 System logging and event tracking
        - 📦 Data export and reporting
        
        **Communications**
        - 📧 Email notifications (SendGrid)
        - 📱 SMS messaging (Twilio)
        - 🔔 In-app notifications
        """)
    
    with col2:
        st.markdown("""
        **Social Media**
        - 🐦 Twitter/X posting
        - 💼 LinkedIn updates
        - 📅 Scheduled posts
        
        **Integrations**
        - 🔗 Webhook calls
        - 🌐 API requests
        - 🔄 Data transformations
        """)
    
    st.info("""
    💡 **Tip**: Task workflows support dependency chaining, priority ordering, automatic retry logic, 
    and error propagation. Failed tasks automatically cancel dependent tasks to maintain data consistency.
    """)

if __name__ == "__main__":
    main()
