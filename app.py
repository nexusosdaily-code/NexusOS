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
    
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Dashboard", 
        "⚙️ Parameter Control", 
        "📈 Simulation", 
        "🔬 Advanced Analysis",
        "💾 Scenarios"
    ])
    
    with tab1:
        render_dashboard()
    
    with tab2:
        render_parameter_control()
    
    with tab3:
        render_simulation()
    
    with tab4:
        render_advanced_analysis()
    
    with tab5:
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
            st.plotly_chart(fig_hist, use_container_width=True)
        
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
            st.plotly_chart(fig_cons, use_container_width=True)
        
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
        st.plotly_chart(fig_scatter, use_container_width=True)
        
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
                st.plotly_chart(fig_param, use_container_width=True)
        
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
        st.dataframe(ranking_df, use_container_width=True, hide_index=True)
        
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
            st.plotly_chart(fig, use_container_width=True)

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
        st.plotly_chart(fig, use_container_width=True)
        
        with st.expander("📊 Stable Parameter Combinations"):
            if len(results['stable_param_combinations']) > 0:
                st.dataframe(
                    pd.DataFrame(results['stable_param_combinations']),
                    use_container_width=True
                )
            else:
                st.warning("No stable parameter combinations found in this region.")

def render_scenarios():
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
