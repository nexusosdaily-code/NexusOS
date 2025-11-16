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

def run_simulation(params, signal_configs):
    engine = NexusEngine(params)
    
    num_steps = params['num_steps']
    delta_t = params['delta_t']
    
    H_signal = SignalGenerator.generate_from_config(signal_configs['H'], num_steps, delta_t)
    M_signal = SignalGenerator.generate_from_config(signal_configs['M'], num_steps, delta_t)
    D_signal = SignalGenerator.generate_from_config(signal_configs['D'], num_steps, delta_t)
    E_signal = SignalGenerator.generate_from_config(signal_configs['E'], num_steps, delta_t)
    C_cons_signal = SignalGenerator.generate_from_config(signal_configs['C_cons'], num_steps, delta_t)
    C_disp_signal = SignalGenerator.generate_from_config(signal_configs['C_disp'], num_steps, delta_t)
    
    N = params['N_initial']
    
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
        'C_disp': []
    }
    
    for step in range(num_steps):
        t = step * delta_t
        
        H = H_signal[step]
        M = M_signal[step]
        D = D_signal[step]
        E = np.clip(E_signal[step], 0.0, 1.0)
        C_cons = C_cons_signal[step]
        C_disp = C_disp_signal[step]
        
        N_next, diagnostics = engine.step(N, H, M, D, E, C_cons, C_disp, delta_t)
        
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
        
        N = N_next
    
    df = pd.DataFrame(results)
    
    df['cumulative_I'] = np.cumsum(df['I']) * delta_t
    df['cumulative_B'] = np.cumsum(df['B']) * delta_t
    df['conservation_error'] = df['cumulative_I'] - df['cumulative_B']
    
    return df

def main():
    init_db()
    init_session_state()
    
    st.title("🔄 NexusOS - Foundational Economic System Simulator")
    st.markdown("""
    A comprehensive platform implementing the Nexus equation: a self-regulating economic system 
    with issuance/burn mechanics, feedback control, and conservation constraints.
    """)
    
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Dashboard", 
        "⚙️ Parameter Control", 
        "📈 Simulation", 
        "💾 Scenarios"
    ])
    
    with tab1:
        render_dashboard()
    
    with tab2:
        render_parameter_control()
    
    with tab3:
        render_simulation()
    
    with tab4:
        render_scenarios()

def render_dashboard():
    st.header("System Overview")
    
    if st.session_state.simulation_results is not None:
        df = st.session_state.simulation_results
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Final Nexus State (N)",
                f"{df['N'].iloc[-1]:.2f}",
                f"{df['N'].iloc[-1] - df['N'].iloc[0]:.2f}"
            )
        
        with col2:
            avg_I = df['I'].mean()
            st.metric(
                "Avg Issuance Rate",
                f"{avg_I:.2f}"
            )
        
        with col3:
            avg_B = df['B'].mean()
            st.metric(
                "Avg Burn Rate",
                f"{avg_B:.2f}"
            )
        
        with col4:
            conservation_error = abs(df['cumulative_I'].iloc[-1] - df['cumulative_B'].iloc[-1])
            st.metric(
                "Conservation Error",
                f"{conservation_error:.2f}",
                f"{(conservation_error / df['cumulative_I'].iloc[-1] * 100):.2f}%"
            )
        
        st.subheader("Nexus State Evolution")
        fig_n = go.Figure()
        fig_n.add_trace(go.Scatter(
            x=df['t'], 
            y=df['N'],
            mode='lines',
            name='N(t)',
            line=dict(color='#1f77b4', width=2)
        ))
        fig_n.add_hline(
            y=st.session_state.params['N_target'], 
            line_dash="dash", 
            line_color="red",
            annotation_text="Target N*"
        )
        fig_n.update_layout(
            xaxis_title="Time",
            yaxis_title="Nexus State N(t)",
            height=400,
            hovermode='x unified'
        )
        st.plotly_chart(fig_n, use_container_width=True)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Issuance vs Burn Dynamics")
            fig_ib = go.Figure()
            fig_ib.add_trace(go.Scatter(
                x=df['t'], 
                y=df['I'],
                mode='lines',
                name='Issuance I(t)',
                line=dict(color='green')
            ))
            fig_ib.add_trace(go.Scatter(
                x=df['t'], 
                y=df['B'],
                mode='lines',
                name='Burn B(t)',
                line=dict(color='red')
            ))
            fig_ib.update_layout(
                xaxis_title="Time",
                yaxis_title="Rate",
                height=350,
                hovermode='x unified'
            )
            st.plotly_chart(fig_ib, use_container_width=True)
        
        with col2:
            st.subheader("System Health Index")
            fig_s = go.Figure()
            fig_s.add_trace(go.Scatter(
                x=df['t'], 
                y=df['S'],
                mode='lines',
                name='S(t)',
                fill='tozeroy',
                line=dict(color='purple')
            ))
            fig_s.update_layout(
                xaxis_title="Time",
                yaxis_title="System Health S(t)",
                yaxis_range=[0, 1],
                height=350,
                hovermode='x unified'
            )
            st.plotly_chart(fig_s, use_container_width=True)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("PID Controller Output")
            fig_phi = go.Figure()
            fig_phi.add_trace(go.Scatter(
                x=df['t'], 
                y=df['Phi'],
                mode='lines',
                name='Φ(t)',
                line=dict(color='orange')
            ))
            fig_phi.add_hline(y=0, line_dash="dot", line_color="gray")
            fig_phi.update_layout(
                xaxis_title="Time",
                yaxis_title="Feedback Φ(t)",
                height=350,
                hovermode='x unified'
            )
            st.plotly_chart(fig_phi, use_container_width=True)
        
        with col2:
            st.subheader("Conservation Monitor")
            fig_cons = go.Figure()
            fig_cons.add_trace(go.Scatter(
                x=df['t'], 
                y=df['cumulative_I'],
                mode='lines',
                name='∫I(t)dt',
                line=dict(color='green')
            ))
            fig_cons.add_trace(go.Scatter(
                x=df['t'], 
                y=df['cumulative_B'],
                mode='lines',
                name='∫B(t)dt',
                line=dict(color='red')
            ))
            fig_cons.update_layout(
                xaxis_title="Time",
                yaxis_title="Cumulative",
                height=350,
                hovermode='x unified'
            )
            st.plotly_chart(fig_cons, use_container_width=True)
        
    else:
        st.info("👈 Configure parameters and run a simulation to see results")

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
            with st.spinner("Running simulation..."):
                df = run_simulation(st.session_state.params, st.session_state.signal_configs)
                st.session_state.simulation_results = df
                st.success(f"Simulation completed! {len(df)} time steps processed.")
                st.rerun()
    
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
        st.plotly_chart(fig, use_container_width=True)

def render_scenarios():
    st.header("Scenario Management")
    
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
                    
                except Exception as e:
                    st.error(f"Error saving scenario: {str(e)}")
    
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

if __name__ == "__main__":
    main()
