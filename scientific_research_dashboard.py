"""
NexusOS Scientific Research Platform - Dashboard Interface
===========================================================
Streamlit-based UI for experiment design, simulation, and reporting.
"""

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime
import json

from scientific_research_platform import (
    ScientificResearchPlatform,
    ExperimentCategory,
    ReportType,
    EXPERIMENT_TEMPLATES,
    LambdaBosonPhysicsEngine,
    DataAnalyzer
)

try:
    from wnsp_v7.curriculum import WNSPCurriculum, GradeLevel, Subject
    CURRICULUM_AVAILABLE = True
except ImportError:
    CURRICULUM_AVAILABLE = False

try:
    from wavelength_information_physics import (
        WavelengthInformationPhysics, 
        ResearchDomain, 
        AcademicLevel,
        get_wip_field
    )
    WIP_AVAILABLE = True
except ImportError:
    WIP_AVAILABLE = False


def get_platform():
    """Get or create platform instance in session state."""
    if 'research_platform' not in st.session_state:
        st.session_state.research_platform = ScientificResearchPlatform()
    return st.session_state.research_platform


def render_header():
    """Render the dashboard header."""
    st.markdown("""
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); 
                padding: 2rem; border-radius: 15px; margin-bottom: 2rem;">
        <h1 style="color: #e94560; margin: 0; font-size: 2.5rem;">🔬 Scientific Research Platform</h1>
        <p style="color: #a0a0a0; margin-top: 0.5rem; font-size: 1.1rem;">
            Lambda Boson Physics Engine | Λ = hf/c²
        </p>
    </div>
    """, unsafe_allow_html=True)


def render_physics_fundamentals():
    """Show Lambda Boson physics fundamentals."""
    st.markdown("### 🌌 Physics Foundation")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div style="background: #1a1a2e; padding: 1.5rem; border-radius: 10px; border-left: 4px solid #e94560;">
            <h4 style="color: #e94560; margin: 0;">E = hf</h4>
            <p style="color: #a0a0a0; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                Planck (1900)<br/>Energy from frequency
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div style="background: #1a1a2e; padding: 1.5rem; border-radius: 10px; border-left: 4px solid #00d9ff;">
            <h4 style="color: #00d9ff; margin: 0;">E = mc²</h4>
            <p style="color: #a0a0a0; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                Einstein (1905)<br/>Mass-energy equivalence
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div style="background: #1a1a2e; padding: 1.5rem; border-radius: 10px; border-left: 4px solid #00ff88;">
            <h4 style="color: #00ff88; margin: 0;">Λ = hf/c²</h4>
            <p style="color: #a0a0a0; font-size: 0.9rem; margin: 0.5rem 0 0 0;">
                Lambda Boson (2025)<br/>Mass-equivalent of oscillation
            </p>
        </div>
        """, unsafe_allow_html=True)


def render_experiment_designer():
    """Render the experiment design interface."""
    st.markdown("### 🧪 Experiment Designer")
    
    platform = get_platform()
    
    # Template selection
    use_template = st.checkbox("Use pre-built template", value=True)
    
    if use_template:
        template_name = st.selectbox(
            "Select Template",
            options=list(EXPERIMENT_TEMPLATES.keys()),
            format_func=lambda x: EXPERIMENT_TEMPLATES[x]['name']
        )
        template = EXPERIMENT_TEMPLATES[template_name]
        
        # Show template details
        st.info(f"**{template['name']}**\n\n{template['description']}")
        
        name = template['name']
        category = template['category']
        hypothesis = template['hypothesis']
        description = template['description']
        methodology = template['methodology']
        variables = template['variables']
    else:
        name = st.text_input("Experiment Name", "My Experiment")
        category = ExperimentCategory(st.selectbox(
            "Category",
            options=[c.value for c in ExperimentCategory]
        ))
        hypothesis = st.text_area("Hypothesis Statement", "")
        description = st.text_area("Description", "")
        methodology = st.text_area("Methodology", "")
        
        # Variable definition
        st.markdown("#### Variables")
        num_vars = st.number_input("Number of Variables", min_value=1, max_value=10, value=3)
        
        variables = []
        for i in range(int(num_vars)):
            with st.expander(f"Variable {i+1}"):
                var_name = st.text_input(f"Name", key=f"var_name_{i}")
                var_type = st.selectbox(f"Type", ["independent", "dependent", "control"], key=f"var_type_{i}")
                var_unit = st.text_input(f"Unit", key=f"var_unit_{i}")
                col1, col2, col3 = st.columns(3)
                with col1:
                    var_min = st.number_input(f"Min", key=f"var_min_{i}")
                with col2:
                    var_max = st.number_input(f"Max", key=f"var_max_{i}")
                with col3:
                    var_default = st.number_input(f"Default", key=f"var_default_{i}")
                var_desc = st.text_input(f"Description", key=f"var_desc_{i}")
                
                if var_name:
                    variables.append({
                        'name': var_name,
                        'type': var_type,
                        'unit': var_unit,
                        'min': var_min,
                        'max': var_max,
                        'default': var_default,
                        'description': var_desc
                    })
    
    # Iterations
    iterations = st.slider("Simulation Iterations", min_value=100, max_value=5000, value=1000, step=100)
    
    # Create experiment button
    if st.button("🚀 Create Experiment", type="primary"):
        try:
            experiment = platform.create_experiment(
                name=name,
                category=category if isinstance(category, ExperimentCategory) else ExperimentCategory(category),
                hypothesis_statement=hypothesis,
                description=description,
                methodology=methodology,
                variables=variables,
                iterations=iterations
            )
            st.success(f"✅ Experiment created: **{experiment.id}**")
            st.session_state.current_experiment_id = experiment.id
        except Exception as e:
            st.error(f"Error creating experiment: {e}")


def render_simulation_runner():
    """Render the simulation runner interface."""
    st.markdown("### ⚡ Simulation Runner")
    
    platform = get_platform()
    experiments = platform.list_experiments()
    
    if not experiments:
        st.warning("No experiments created yet. Design an experiment first.")
        return
    
    # Select experiment
    exp_options = {e['id']: f"{e['name']} ({e['id']})" for e in experiments}
    
    selected_exp_id = st.selectbox(
        "Select Experiment",
        options=list(exp_options.keys()),
        format_func=lambda x: exp_options[x]
    )
    
    if selected_exp_id:
        experiment = platform.experiments[selected_exp_id]
        
        # Parameter inputs
        st.markdown("#### Simulation Parameters")
        
        params = {}
        cols = st.columns(3)
        
        for i, var in enumerate(experiment.variables):
            with cols[i % 3]:
                if var.var_type.value != 'dependent':
                    params[var.name] = st.number_input(
                        f"{var.name} ({var.unit})",
                        min_value=float(var.min_value),
                        max_value=float(var.max_value),
                        value=float(var.default_value),
                        format="%.2e" if var.max_value > 1000 else "%.4f",
                        key=f"param_{var.name}"
                    )
        
        # Run simulation
        if st.button("🔬 Run Simulation", type="primary"):
            with st.spinner(f"Running {experiment.iterations} iterations..."):
                try:
                    results, analysis = platform.run_experiment(selected_exp_id, params)
                    
                    st.success(f"✅ Simulation complete! {len(results)} iterations processed.")
                    
                    # Store for visualization
                    st.session_state.last_results = results
                    st.session_state.last_analysis = analysis
                    st.session_state.last_experiment_id = selected_exp_id
                    
                    # Quick results
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("Sample Size", analysis.sample_size)
                    with col2:
                        st.metric("p-value", f"{analysis.p_value:.6f}")
                    with col3:
                        st.metric("Effect Size", f"{analysis.effect_size:.4f}")
                    with col4:
                        anomalies = len([r for r in results if r.anomaly_detected])
                        st.metric("Anomalies", anomalies)
                    
                    # Hypothesis result
                    if analysis.p_value < 0.05:
                        st.success(f"🎯 {analysis.hypothesis_result}")
                    else:
                        st.info(f"📊 {analysis.hypothesis_result}")
                        
                except Exception as e:
                    st.error(f"Simulation error: {e}")


def render_analysis_dashboard():
    """Render the analysis dashboard with visualizations."""
    st.markdown("### 📊 Analysis Dashboard")
    
    if 'last_results' not in st.session_state or 'last_analysis' not in st.session_state:
        st.info("Run a simulation first to see analysis results.")
        return
    
    results = st.session_state.last_results
    analysis = st.session_state.last_analysis
    
    # Create DataFrame for visualization
    analyzer = DataAnalyzer(results)
    df = analyzer.df
    
    # Tabs for different visualizations
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📈 Time Series", "📊 Distributions", "🔗 Correlations", "🔍 Anomalies", "📋 Statistics"
    ])
    
    with tab1:
        render_time_series(df)
    
    with tab2:
        render_distributions(df, analysis)
    
    with tab3:
        render_correlations(df)
    
    with tab4:
        render_anomalies(df, results)
    
    with tab5:
        render_statistics(analysis)


def render_time_series(df):
    """Render time series plots."""
    st.markdown("#### Time Series Analysis")
    
    numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns 
                   if c not in ['iteration', 'anomaly']]
    
    if not numeric_cols:
        st.warning("No numeric columns to plot.")
        return
    
    selected_vars = st.multiselect(
        "Select variables to plot",
        options=numeric_cols,
        default=numeric_cols[:3]
    )
    
    if selected_vars:
        fig = make_subplots(rows=len(selected_vars), cols=1,
                           subplot_titles=selected_vars,
                           vertical_spacing=0.1)
        
        colors = px.colors.qualitative.Set2
        
        for i, var in enumerate(selected_vars):
            fig.add_trace(
                go.Scatter(
                    x=df['iteration'],
                    y=df[var],
                    mode='lines',
                    name=var,
                    line=dict(color=colors[i % len(colors)])
                ),
                row=i+1, col=1
            )
        
        fig.update_layout(
            height=250 * len(selected_vars),
            showlegend=True,
            template="plotly_dark"
        )
        
        st.plotly_chart(fig, use_container_width=True)


def render_distributions(df, analysis):
    """Render distribution plots."""
    st.markdown("#### Distribution Analysis")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if 'energy' in df.columns:
            fig = px.histogram(
                df, x='energy', nbins=50,
                title="Energy Distribution",
                color_discrete_sequence=['#e94560']
            )
            fig.update_layout(template="plotly_dark")
            st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        if 'lambda_mass' in df.columns:
            fig = px.histogram(
                df, x='lambda_mass', nbins=50,
                title="Lambda Mass Distribution",
                color_discrete_sequence=['#00d9ff']
            )
            fig.update_layout(template="plotly_dark")
            st.plotly_chart(fig, use_container_width=True)
    
    # Box plots for all numeric variables
    numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns 
                   if c not in ['iteration', 'anomaly']]
    
    if len(numeric_cols) > 1:
        # Normalize for comparison
        df_norm = df[numeric_cols].apply(lambda x: (x - x.mean()) / x.std())
        df_melt = df_norm.melt(var_name='Variable', value_name='Normalized Value')
        
        fig = px.box(
            df_melt, x='Variable', y='Normalized Value',
            title="Variable Distributions (Normalized)",
            color='Variable'
        )
        fig.update_layout(template="plotly_dark", showlegend=False)
        st.plotly_chart(fig, use_container_width=True)


def render_correlations(df):
    """Render correlation matrix."""
    st.markdown("#### Correlation Analysis")
    
    numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns 
                   if c not in ['iteration', 'anomaly']]
    
    if len(numeric_cols) < 2:
        st.warning("Not enough numeric variables for correlation analysis.")
        return
    
    corr_matrix = df[numeric_cols].corr()
    
    fig = px.imshow(
        corr_matrix,
        text_auto='.2f',
        aspect='auto',
        color_continuous_scale='RdBu_r',
        title="Correlation Matrix"
    )
    fig.update_layout(template="plotly_dark")
    st.plotly_chart(fig, use_container_width=True)
    
    # Highlight strong correlations
    st.markdown("**Strong Correlations (|r| > 0.7):**")
    strong_corrs = []
    for i, row in enumerate(numeric_cols):
        for j, col in enumerate(numeric_cols):
            if i < j and abs(corr_matrix.loc[row, col]) > 0.7:
                strong_corrs.append(f"- {row} ↔ {col}: {corr_matrix.loc[row, col]:.3f}")
    
    if strong_corrs:
        st.markdown("\n".join(strong_corrs))
    else:
        st.info("No strong correlations detected.")


def render_anomalies(df, results):
    """Render anomaly analysis."""
    st.markdown("#### Anomaly Detection")
    
    anomaly_results = [r for r in results if r.anomaly_detected]
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric("Total Anomalies", len(anomaly_results))
    with col2:
        st.metric("Anomaly Rate", f"{len(anomaly_results)/len(results)*100:.2f}%")
    
    if anomaly_results:
        # Anomaly scatter plot
        fig = px.scatter(
            df, x='iteration', y='energy',
            color='anomaly',
            color_discrete_map={True: '#e94560', False: '#00d9ff'},
            title="Anomaly Distribution Over Iterations"
        )
        fig.update_layout(template="plotly_dark")
        st.plotly_chart(fig, use_container_width=True)
        
        # Anomaly details
        with st.expander("View Anomaly Details"):
            anomaly_df = df[df['anomaly'] == True]
            st.dataframe(anomaly_df)
    else:
        st.success("No anomalies detected in this experiment run.")


def render_statistics(analysis):
    """Render statistical summary."""
    st.markdown("#### Statistical Summary")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Hypothesis Testing**")
        st.markdown(f"""
        - **Sample Size**: {analysis.sample_size}
        - **t-statistic**: {analysis.t_statistic:.4f}
        - **p-value**: {analysis.p_value:.6f}
        - **Effect Size (Cohen's d)**: {analysis.effect_size:.4f}
        """)
        
        if analysis.p_value < 0.05:
            st.success(f"✅ {analysis.hypothesis_result}")
        else:
            st.warning(f"⚠️ {analysis.hypothesis_result}")
    
    with col2:
        st.markdown("**Effect Size Interpretation**")
        effect = abs(analysis.effect_size)
        if effect < 0.2:
            st.info("📊 Negligible effect")
        elif effect < 0.5:
            st.info("📊 Small effect")
        elif effect < 0.8:
            st.warning("📈 Medium effect")
        else:
            st.success("📈 Large effect")
    
    # Detailed statistics table
    st.markdown("**Descriptive Statistics**")
    
    stats_data = []
    for key in list(analysis.mean.keys())[:10]:
        stats_data.append({
            'Variable': key,
            'Mean': f"{analysis.mean[key]:.4e}",
            'Std Dev': f"{analysis.std_dev[key]:.4e}",
            'Min': f"{analysis.min_values[key]:.4e}",
            'Max': f"{analysis.max_values[key]:.4e}",
            '95% CI Lower': f"{analysis.confidence_intervals[key][0]:.4e}",
            '95% CI Upper': f"{analysis.confidence_intervals[key][1]:.4e}"
        })
    
    st.dataframe(pd.DataFrame(stats_data), hide_index=True)


def render_report_generator():
    """Render the report generation interface."""
    st.markdown("### 📝 Report Generator")
    
    platform = get_platform()
    experiments = platform.list_experiments()
    
    # Filter experiments with results
    experiments_with_results = [e for e in experiments if e['has_results']]
    
    if not experiments_with_results:
        st.warning("No experiments with results. Run a simulation first.")
        return
    
    # Select experiment
    exp_options = {e['id']: f"{e['name']} ({e['id']})" for e in experiments_with_results}
    
    selected_exp_id = st.selectbox(
        "Select Experiment",
        options=list(exp_options.keys()),
        format_func=lambda x: exp_options[x],
        key="report_exp_select"
    )
    
    # Report type selection
    col1, col2 = st.columns(2)
    
    with col1:
        report_type = st.selectbox(
            "Report Type",
            options=[rt.value for rt in ReportType],
            format_func=lambda x: x.capitalize()
        )
    
    with col2:
        export_format = st.selectbox(
            "Export Format",
            options=['markdown', 'json']
        )
    
    # Report type descriptions
    report_descriptions = {
        'executive': "Non-technical summary for stakeholders and decision-makers",
        'technical': "Detailed methodology, statistics, and technical analysis",
        'academic': "Academic paper format with abstract, methods, results, discussion",
        'patent': "Patent application format with claims and specifications",
        'investor': "Investment brief with key metrics and market opportunity"
    }
    
    st.info(report_descriptions.get(report_type, ""))
    
    # Generate report
    if st.button("📄 Generate Report", type="primary"):
        with st.spinner("Generating report..."):
            try:
                report = platform.generate_report(
                    selected_exp_id, 
                    ReportType(report_type)
                )
                
                st.success(f"✅ Report generated: **{report.report_id}**")
                
                # Export
                content = platform.export_report(
                    selected_exp_id,
                    report.report_id,
                    export_format
                )
                
                # Display report
                st.markdown("---")
                st.markdown("#### Report Preview")
                
                if export_format == 'markdown':
                    st.markdown(content)
                else:
                    st.json(json.loads(content))
                
                # Download button
                st.download_button(
                    label=f"⬇️ Download {export_format.upper()}",
                    data=content,
                    file_name=f"report_{report.report_id}.{export_format if export_format == 'json' else 'md'}",
                    mime="application/json" if export_format == 'json' else "text/markdown"
                )
                
            except Exception as e:
                st.error(f"Error generating report: {e}")
    
    # Show existing reports
    if selected_exp_id in platform.reports and platform.reports[selected_exp_id]:
        st.markdown("---")
        st.markdown("#### Existing Reports")
        
        for report in platform.reports[selected_exp_id]:
            col1, col2, col3 = st.columns([2, 1, 1])
            with col1:
                st.markdown(f"**{report.report_id}**")
            with col2:
                st.caption(report.report_type.value.capitalize())
            with col3:
                st.caption(report.generated_at[:10])


def render_experiment_history():
    """Render experiment history and management."""
    st.markdown("### 📚 Experiment History")
    
    platform = get_platform()
    experiments = platform.list_experiments()
    
    if not experiments:
        st.info("No experiments yet. Start by designing a new experiment.")
        return
    
    # Experiment cards
    for exp in experiments:
        with st.expander(f"🧪 {exp['name']} ({exp['id']})"):
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.markdown(f"**Category**: {exp['category']}")
            with col2:
                st.markdown(f"**Created**: {exp['created_at'][:10]}")
            with col3:
                status = "✅ Results" if exp['has_results'] else "⏳ Pending"
                st.markdown(f"**Status**: {status}")
            with col4:
                st.markdown(f"**Reports**: {exp['report_count']}")
            
            if exp['has_results']:
                summary = platform.get_experiment_summary(exp['id'])
                if 'analysis_summary' in summary:
                    st.markdown("**Quick Results:**")
                    a = summary['analysis_summary']
                    st.markdown(f"- p-value: {a['p_value']:.6f}")
                    st.markdown(f"- Effect size: {a['effect_size']:.4f}")
                    st.markdown(f"- {a['hypothesis_result']}")


def render_lambda_calculator():
    """Interactive Lambda Boson calculator."""
    st.markdown("### 🔢 Lambda Boson Calculator")
    
    physics = LambdaBosonPhysicsEngine()
    
    calc_type = st.selectbox(
        "Calculation Type",
        ["Frequency → Lambda Mass", "Energy → Frequency", "Wavelength → Frequency", 
         "Temperature → Thermal Energy", "Interference Pattern"]
    )
    
    if calc_type == "Frequency → Lambda Mass":
        freq = st.number_input("Frequency (Hz)", value=5e14, format="%.2e")
        
        if st.button("Calculate"):
            lambda_mass = physics.calculate_lambda_mass(freq)
            energy = physics.calculate_energy(freq)
            wavelength = physics.calculate_wavelength(freq)
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Lambda Mass (kg)", f"{lambda_mass:.4e}")
            with col2:
                st.metric("Energy (J)", f"{energy:.4e}")
            with col3:
                st.metric("Wavelength (m)", f"{wavelength:.4e}")
    
    elif calc_type == "Energy → Frequency":
        energy = st.number_input("Energy (Joules)", value=1e-19, format="%.2e")
        
        if st.button("Calculate"):
            freq = physics.calculate_frequency_from_energy(energy)
            lambda_mass = physics.calculate_lambda_mass(freq)
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Frequency (Hz)", f"{freq:.4e}")
            with col2:
                st.metric("Lambda Mass (kg)", f"{lambda_mass:.4e}")
    
    elif calc_type == "Wavelength → Frequency":
        wavelength = st.number_input("Wavelength (meters)", value=550e-9, format="%.2e")
        
        if st.button("Calculate"):
            freq = physics.c / wavelength
            energy = physics.calculate_energy(freq)
            lambda_mass = physics.calculate_lambda_mass(freq)
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Frequency (Hz)", f"{freq:.4e}")
            with col2:
                st.metric("Energy (J)", f"{energy:.4e}")
            with col3:
                st.metric("Lambda Mass (kg)", f"{lambda_mass:.4e}")
    
    elif calc_type == "Temperature → Thermal Energy":
        temp = st.number_input("Temperature (Kelvin)", value=300.0)
        
        if st.button("Calculate"):
            thermal_e = physics.calculate_thermal_energy(temp)
            equiv_freq = physics.calculate_frequency_from_energy(thermal_e)
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Thermal Energy (J)", f"{thermal_e:.4e}")
            with col2:
                st.metric("Equivalent Frequency (Hz)", f"{equiv_freq:.4e}")
    
    elif calc_type == "Interference Pattern":
        col1, col2 = st.columns(2)
        with col1:
            freq1 = st.number_input("Frequency 1 (Hz)", value=1e6, format="%.2e")
        with col2:
            freq2 = st.number_input("Frequency 2 (Hz)", value=1.1e6, format="%.2e")
        
        if st.button("Generate Pattern"):
            # Generate interference pattern
            duration = 1e-5  # 10 microseconds
            t = np.linspace(0, duration, 1000)
            pattern = physics.interference_pattern(freq1, freq2, t)
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(x=t*1e6, y=pattern, mode='lines', name='Interference'))
            fig.update_layout(
                title="Interference Pattern",
                xaxis_title="Time (μs)",
                yaxis_title="Amplitude",
                template="plotly_dark"
            )
            st.plotly_chart(fig, use_container_width=True)
            
            beat_freq = abs(freq2 - freq1)
            st.info(f"Beat frequency: {beat_freq:.2e} Hz")


def render_wavelength_information_physics():
    """Render the Wavelength Information Physics field definition."""
    st.markdown("### 🌊 Wavelength Information Physics")
    st.markdown("*A New Scientific Field — Founded 2025*")
    
    if not WIP_AVAILABLE:
        st.warning("Wavelength Information Physics module not available.")
        return
    
    # Get WIP field
    if 'wip_field' not in st.session_state:
        st.session_state.wip_field = get_wip_field()
    wip = st.session_state.wip_field
    
    # Field Overview
    st.divider()
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Core Axioms", len(wip.axioms))
    with col2:
        st.metric("Research Domains", len(ResearchDomain))
    with col3:
        st.metric("Founded", wip.definition.founded)
    
    # Tabs for different sections
    wip_tabs = st.tabs(["📜 Definition", "⚛️ Core Axioms", "🔬 Research Areas", "🎓 Academic Path", "📖 Citation"])
    
    with wip_tabs[0]:
        st.markdown("#### Formal Field Definition")
        
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    padding: 2rem; border-radius: 15px; margin-bottom: 1rem;">
            <h3 style="color: #e94560; margin: 0;">{wip.definition.name} ({wip.definition.abbreviation})</h3>
            <p style="color: #00d9ff; margin-top: 0.5rem;">
                Origin: {wip.definition.origin_protocol} / {wip.definition.origin_system}
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("**Formal Definition:**")
        st.markdown(wip.definition.formal_definition)
        
        st.markdown("---")
        st.markdown("**Core Thesis:**")
        st.info(wip.definition.core_thesis)
        
        st.markdown("---")
        st.markdown("**Paradigm Shift:**")
        st.markdown(wip.definition.paradigm_shift)
    
    with wip_tabs[1]:
        st.markdown("#### The Six Core Axioms of WIP")
        
        for axiom_id, axiom in wip.axioms.items():
            with st.expander(f"**{axiom.axiom_id}: {axiom.name}**"):
                st.markdown(f"**Statement:** {axiom.statement}")
                
                st.markdown(f"""
                <div style="background: #1a1a2e; padding: 1rem; border-radius: 8px; 
                            font-family: monospace; color: #00ff88; margin: 1rem 0;">
                    {axiom.mathematical_form}
                </div>
                """, unsafe_allow_html=True)
                
                st.markdown("**Implications:**")
                for imp in axiom.implications:
                    st.markdown(f"- {imp}")
                
                st.markdown(f"*Discovered by: {axiom.discovered_by} ({axiom.year})*")
    
    with wip_tabs[2]:
        st.markdown("#### Research Domains")
        
        domain_filter = st.selectbox(
            "Filter by Domain",
            options=["All"] + [d.value.replace("_", " ").title() for d in ResearchDomain]
        )
        
        for area_id, area in wip.research_areas.items():
            domain_name = area.domain.value.replace("_", " ").title()
            if domain_filter != "All" and domain_name != domain_filter:
                continue
                
            with st.expander(f"**{area.name}** ({domain_name})"):
                st.markdown(f"*{area.description}*")
                
                st.markdown("**Key Research Questions:**")
                for q in area.key_questions:
                    st.markdown(f"- {q}")
                
                st.markdown("**Methodologies:**")
                for m in area.methodologies:
                    st.markdown(f"- {m}")
                
                st.markdown("**Applications:**")
                for app in area.applications:
                    st.markdown(f"- {app}")
                
                st.markdown(f"**Related Fields:** {', '.join(area.related_fields)}")
    
    with wip_tabs[3]:
        st.markdown("#### Academic Curriculum")
        
        level = st.selectbox(
            "Select Academic Level",
            options=[l.value.replace("_", " ").title() for l in AcademicLevel]
        )
        
        level_enum = AcademicLevel(level.lower().replace(" ", "_"))
        curriculum = wip.get_curriculum_outline(level_enum)
        
        st.markdown(f"### {curriculum.get('level', level)}")
        
        if 'courses' in curriculum:
            st.markdown("**Courses:**")
            for course in curriculum['courses']:
                st.markdown(f"- {course}")
        
        if 'prerequisites' in curriculum:
            st.markdown("**Prerequisites:**")
            for prereq in curriculum['prerequisites']:
                st.markdown(f"- {prereq}")
        
        if 'outcomes' in curriculum:
            st.markdown("**Learning Outcomes:**")
            for outcome in curriculum['outcomes']:
                st.markdown(f"- {outcome}")
        
        if 'research_areas' in curriculum:
            st.markdown("**Research Areas:**")
            for area in curriculum['research_areas']:
                st.markdown(f"- {area}")
        
        if 'requirements' in curriculum:
            st.markdown("**Requirements:**")
            for req in curriculum['requirements']:
                st.markdown(f"- {req}")
    
    with wip_tabs[4]:
        st.markdown("#### Academic Citation")
        
        citation = wip.generate_citation()
        
        st.code(citation, language="text")
        
        st.markdown("---")
        st.markdown("**How to Cite:**")
        st.markdown("""
        When referencing Wavelength Information Physics in academic work:
        
        1. **For the field itself:**
           > Wavelength Information Physics (WIP). (2025). NexusOS/WNSP Protocol.
           > https://github.com/nexusosdaily-code/WNSP-P2P-Hub
        
        2. **For the Lambda Boson:**
           > Lambda Boson Theory. (2025). Λ = hf/c² — The mass-equivalent of oscillation.
           > Wavelength Information Physics Foundation.
        
        3. **For specific axioms:**
           > WIP Axiom [ID]. [Name]. Wavelength Information Physics, 2025.
        """)
        
        st.markdown("---")
        st.info("📄 This field is **open-source** and **community-owned** under GPL v3.0. All research and implementations contribute to the global commons.")


def render_education_links():
    """Render education links connecting research to WNSP High School curriculum."""
    st.markdown("### 🎓 Education Links")
    st.markdown("Connect your research to grade-level curriculum content")
    
    if not CURRICULUM_AVAILABLE:
        st.warning("Curriculum module not available. Please check installation.")
        return
    
    # Get curriculum
    if 'curriculum' not in st.session_state:
        st.session_state.curriculum = WNSPCurriculum()
    curriculum = st.session_state.curriculum
    
    # Grade level selector
    st.divider()
    grade_col, subject_col = st.columns(2)
    
    with grade_col:
        selected_grade = st.selectbox(
            "Select Grade Level",
            options=[g.value for g in GradeLevel],
            format_func=lambda x: {
                "grade_9": "Grade 9: Foundations of Wave Physics",
                "grade_10": "Grade 10: Core NexusOS Concepts", 
                "grade_11": "Grade 11: Industry Applications",
                "grade_12": "Grade 12: Mastery and Leadership"
            }.get(x, x)
        )
    
    with subject_col:
        selected_subject = st.selectbox(
            "Filter by Subject",
            options=["All"] + [s.value for s in Subject],
            format_func=lambda x: {
                "All": "All Subjects",
                "lambda_physics": "Lambda Boson Physics",
                "wave_mechanics": "Wave Mechanics",
                "blockchain_fundamentals": "Blockchain Fundamentals",
                "decentralized_governance": "Decentralized Governance",
                "physics_economics": "Physics Economics",
                "spectral_authority": "Spectral Authority",
                "constitutional_law": "Constitutional Law",
                "industry_applications": "Industry Applications",
                "civics_bhls": "Civics & BHLS",
                "wavelang_programming": "WaveLang Programming"
            }.get(x, x)
        )
    
    st.divider()
    
    # Get curriculum path for selected grade
    grade_enum = GradeLevel(selected_grade)
    if grade_enum in curriculum.curriculum_paths:
        path = curriculum.curriculum_paths[grade_enum]
        
        # Display grade overview
        st.markdown(f"### {path.name}")
        st.markdown(path.description)
        st.markdown(f"**Total Credits:** {path.total_credits}")
        
        # Show lessons
        st.markdown("---")
        st.markdown("### 📚 Lessons")
        
        lessons_to_show = path.lessons
        if selected_subject != "All":
            lessons_to_show = [l for l in path.lessons if l.subject.value == selected_subject]
        
        if not lessons_to_show:
            st.info(f"No lessons found for the selected subject in {selected_grade.replace('_', ' ').title()}")
        else:
            for lesson in lessons_to_show:
                with st.expander(f"📖 {lesson.title} ({lesson.duration_minutes} min)"):
                    st.markdown(f"**Subject:** {lesson.subject.value.replace('_', ' ').title()}")
                    st.markdown(f"**Description:** {lesson.description}")
                    
                    st.markdown("**Learning Objectives:**")
                    for obj in lesson.objectives:
                        st.markdown(f"- {obj}")
                    
                    st.markdown("**Activities:**")
                    for act in lesson.activities:
                        st.markdown(f"- {act}")
                    
                    # Link to related experiment templates
                    st.markdown("---")
                    st.markdown("**🔬 Related Research Templates:**")
                    
                    related_templates = []
                    lesson_keywords = lesson.title.lower() + " " + lesson.description.lower()
                    
                    for template_key, template in EXPERIMENT_TEMPLATES.items():
                        template_text = (template['name'] + " " + template['description']).lower()
                        if any(word in template_text for word in ['wave', 'frequency', 'energy', 'lambda', 'photon', 'light']):
                            if 'wave' in lesson_keywords or 'energy' in lesson_keywords or 'frequency' in lesson_keywords or 'lambda' in lesson_keywords:
                                related_templates.append((template_key, template['name']))
                        if 'network' in template_text and 'network' in lesson_keywords:
                            related_templates.append((template_key, template['name']))
                        if 'quantum' in template_text and ('quantum' in lesson_keywords or 'physics' in lesson_keywords):
                            related_templates.append((template_key, template['name']))
                    
                    related_templates = list(set(related_templates))[:3]  # Limit to 3
                    
                    if related_templates:
                        for key, name in related_templates:
                            st.markdown(f"- **{name}** (go to 🧪 Design tab)")
                    else:
                        st.markdown("- *Use Custom Experiment to design your own research*")
                    
                    st.markdown(f"**Lambda Signature:** {lesson.lambda_signature:.4e} kg")
        
        # Show assessments
        st.markdown("---")
        st.markdown("### 🎯 Assessments")
        
        assessments_to_show = path.assessments
        if selected_subject != "All":
            assessments_to_show = [a for a in path.assessments if a.subject.value == selected_subject]
        
        if not assessments_to_show:
            st.info(f"No assessments found for the selected subject in {selected_grade.replace('_', ' ').title()}")
        else:
            for assessment in assessments_to_show:
                with st.expander(f"📝 {assessment.title} ({assessment.assessment_type.value.upper()})"):
                    st.markdown(f"**Type:** {assessment.assessment_type.value.title()}")
                    st.markdown(f"**Duration:** {assessment.duration_minutes} minutes")
                    st.markdown(f"**Max Score:** {assessment.max_score}")
                    st.markdown(f"**Passing Score:** {assessment.passing_score}")
                    
                    st.markdown("**How Research Platform Can Help:**")
                    if assessment.assessment_type.value == "lab":
                        st.markdown("- Use the **⚡ Simulate** tab to run physics simulations")
                        st.markdown("- Generate data for lab reports using Monte Carlo methods")
                    elif assessment.assessment_type.value == "project":
                        st.markdown("- Design your experiment in **🧪 Design** tab")
                        st.markdown("- Create professional reports in **📝 Reports** tab")
                    elif assessment.assessment_type.value == "exam":
                        st.markdown("- Practice calculations with **🔢 Calculator** tab")
                        st.markdown("- Review physics fundamentals in **🌌 Physics** tab")
    
    # Quick links to curriculum page
    st.divider()
    st.markdown("### 🔗 Quick Links")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div style="background: #1a1a2e; padding: 1rem; border-radius: 10px; text-align: center;">
            <h4 style="color: #e94560; margin: 0;">📚 Full Curriculum</h4>
            <p style="color: #a0a0a0; font-size: 0.85rem;">Access complete WNSP High School program</p>
            <p style="color: #00ff88; font-size: 0.8rem;">Go to: pages/wnsp_curriculum.py</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div style="background: #1a1a2e; padding: 1rem; border-radius: 10px; text-align: center;">
            <h4 style="color: #00d9ff; margin: 0;">🆓 BHLS Guarantee</h4>
            <p style="color: #a0a0a0; font-size: 0.85rem;">All courses FREE under Basic Human Living Standards</p>
            <p style="color: #00ff88; font-size: 0.8rem;">10 FREE courses per student</p>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div style="background: #1a1a2e; padding: 1rem; border-radius: 10px; text-align: center;">
            <h4 style="color: #ffd700; margin: 0;">🎓 Certification</h4>
            <p style="color: #a0a0a0; font-size: 0.85rem;">Earn Lambda-verified credentials</p>
            <p style="color: #00ff88; font-size: 0.8rem;">Stored on-chain permanently</p>
        </div>
        """, unsafe_allow_html=True)


def render_getting_started():
    """Render the Getting Started guide with step-by-step instructions."""
    st.markdown("### 👋 Welcome to the Scientific Research Platform!")
    
    st.markdown("""
    This platform helps you design experiments, run simulations, and generate professional reports 
    — all grounded in **Lambda Boson physics** (Λ = hf/c²).
    """)
    
    st.divider()
    
    # Quick Start Steps
    st.markdown("### 🚀 Quick Start Guide")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown("""
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
            <h4 style="color: #e94560; margin: 0;">Step 1: Design Your Experiment</h4>
            <p style="color: #a0a0a0; margin-top: 0.5rem;">
                Go to the <b>🧪 Design</b> tab. Choose a pre-built template (like "Light-Data Encoding") 
                or create your own custom experiment with your hypothesis and variables.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
            <h4 style="color: #00d9ff; margin: 0;">Step 2: Run Simulation</h4>
            <p style="color: #a0a0a0; margin-top: 0.5rem;">
                Go to the <b>⚡ Simulate</b> tab. Select your experiment and set how many 
                Monte Carlo iterations to run (more = more accurate). Click "Run Simulation".
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
            <h4 style="color: #00ff88; margin: 0;">Step 3: Analyze Results</h4>
            <p style="color: #a0a0a0; margin-top: 0.5rem;">
                Go to the <b>📊 Analyze</b> tab. View your data with interactive charts, 
                see statistical summaries, detect trends, and identify anomalies automatically.
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
            <h4 style="color: #ffd700; margin: 0;">Step 4: Generate Report</h4>
            <p style="color: #a0a0a0; margin-top: 0.5rem;">
                Go to the <b>📝 Reports</b> tab. Choose your format (Executive, Technical, Academic, 
                Patent, or Investor) and generate a professional report with one click.
            </p>
        </div>
        """, unsafe_allow_html=True)
    
    st.divider()
    
    # Tab descriptions
    st.markdown("### 📑 Tab Guide")
    
    tab_info = {
        "🎓 Education": "Browse WNSP High School curriculum by grade level (9-12) with linked lessons and assessments",
        "🌌 Physics": "Learn the Lambda Boson fundamentals (E=hf, E=mc², Λ=hf/c²) that power all calculations",
        "🧪 Design": "Create experiments using templates or custom setup with variables and hypotheses",
        "⚡ Simulate": "Run Monte Carlo simulations with configurable iterations for statistical power",
        "📊 Analyze": "View data visualizations, statistics, trends, correlations, and anomaly detection",
        "📝 Reports": "Generate publication-ready reports in 5 different professional formats",
        "📚 History": "Browse all past experiments with their results and timestamps",
        "🔢 Calculator": "Interactive Lambda Boson calculator for wavelength, energy, and frequency"
    }
    
    for tab, desc in tab_info.items():
        st.markdown(f"**{tab}** — {desc}")
    
    st.divider()
    
    # Example workflow
    with st.expander("📖 Example: Running Your First Experiment"):
        st.markdown("""
        **Scenario**: You want to test how light frequency affects data encoding efficiency.
        
        1. **Go to 🧪 Design tab**
           - Check "Use pre-built template" 
           - Select "photonics_encoding" (Light-Data Encoding Efficiency)
           - Click "Create Experiment"
        
        2. **Go to ⚡ Simulate tab**
           - Select your new experiment from the dropdown
           - Set iterations to 100 (for a quick test) or 1000 (for better accuracy)
           - Click "Run Simulation" and wait for results
        
        3. **Go to 📊 Analyze tab**
           - View the charts showing your simulation data
           - Check the statistical summary (mean, std dev, etc.)
           - Look for trends and any anomalies detected
        
        4. **Go to 📝 Reports tab**
           - Select your experiment
           - Choose "Academic" for a research paper format
           - Click "Generate Report" to create a publication-ready document
        
        **That's it!** You've completed a full research workflow.
        """)
    
    # Tips
    with st.expander("💡 Pro Tips"):
        st.markdown("""
        - **More iterations = more accuracy**: Use 1000+ iterations for publishable results
        - **Use templates first**: They're pre-configured with sensible defaults
        - **Check History**: All experiments are saved automatically for future reference
        - **Lambda Calculator**: Use it to convert between wavelength, frequency, and energy
        - **Multiple report formats**: Academic for papers, Executive for quick summaries, Patent for IP
        """)


def main():
    """Main dashboard entry point."""
    
    render_header()
    
    # Check if we should default to a specific tab (from Quick Access buttons)
    tab_names = ["📖 Getting Started", "🎓 Education", "🌊 WIP Field", "🌌 Physics", "🧪 Design", "⚡ Simulate", "📊 Analyze", "📝 Reports", "📚 History", "🔢 Calculator"]
    
    # Map tab names to indices
    tab_map = {
        "getting_started": 0,
        "education": 1,
        "wip": 2,
        "physics": 3,
        "design": 4,
        "simulate": 5,
        "analyze": 6,
        "reports": 7,
        "history": 8,
        "calculator": 9
    }
    
    # Get default tab from session state (set by Quick Access buttons)
    default_tab = st.session_state.get("research_default_tab", None)
    default_index = tab_map.get(default_tab, 0) if default_tab else 0
    
    # Clear the flag after using it
    if default_tab:
        st.session_state.research_default_tab = None
    
    # Show breadcrumb navigation
    st.markdown(f"""
    <div style="background: rgba(26, 26, 46, 0.3); padding: 0.5rem 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <span style="color: #a0a0a0;">📍 Home → Scientific Research Platform</span>
    </div>
    """, unsafe_allow_html=True)
    
    # Navigation - Getting Started first for new users
    tabs = st.tabs(tab_names)
    
    with tabs[0]:
        render_getting_started()
    
    with tabs[1]:
        render_education_links()
    
    with tabs[2]:
        render_wavelength_information_physics()
    
    with tabs[3]:
        render_physics_fundamentals()
    
    with tabs[4]:
        render_experiment_designer()
    
    with tabs[5]:
        render_simulation_runner()
    
    with tabs[6]:
        render_analysis_dashboard()
    
    with tabs[7]:
        render_report_generator()
    
    with tabs[8]:
        render_experiment_history()
    
    with tabs[9]:
        render_lambda_calculator()


if __name__ == "__main__":
    main()
