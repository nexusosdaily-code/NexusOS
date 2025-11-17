"""
Long-Term Analytics & Prediction Visualization Dashboard
Displays historical trends, predictions, and strategic insights
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from predictive_analytics import (
    PredictiveAnalyticsEngine, 
    PredictionHorizon,
    DataSourceType
)


def create_prediction_chart(prediction):
    """Create interactive prediction chart with confidence intervals"""
    historical_df = st.session_state.analytics_engine.repository.get_metric_history(
        prediction.metric_name
    )
    
    fig = go.Figure()
    
    # Historical data
    if not historical_df.empty:
        fig.add_trace(go.Scatter(
            x=historical_df['timestamp'],
            y=historical_df['value'],
            mode='lines',
            name='Historical Data',
            line=dict(color='blue', width=2)
        ))
    
    # Predicted values
    fig.add_trace(go.Scatter(
        x=prediction.timestamps,
        y=prediction.predicted_values,
        mode='lines',
        name='Prediction',
        line=dict(color='red', width=2, dash='dash')
    ))
    
    # Confidence interval
    fig.add_trace(go.Scatter(
        x=prediction.timestamps,
        y=prediction.confidence_interval[1],
        mode='lines',
        name='Upper Bound',
        line=dict(width=0),
        showlegend=False
    ))
    
    fig.add_trace(go.Scatter(
        x=prediction.timestamps,
        y=prediction.confidence_interval[0],
        mode='lines',
        name='Lower Bound',
        fill='tonexty',
        fillcolor='rgba(255,0,0,0.2)',
        line=dict(width=0),
        showlegend=True
    ))
    
    fig.update_layout(
        title=f"{prediction.metric_name} - {prediction.horizon.value} Forecast",
        xaxis_title="Time",
        yaxis_title="Value",
        hovermode='x unified',
        height=500
    )
    
    return fig


def create_multi_metric_comparison(predictions):
    """Create comparison chart for multiple metrics"""
    fig = make_subplots(
        rows=len(predictions),
        cols=1,
        subplot_titles=[p.metric_name for p in predictions],
        vertical_spacing=0.05
    )
    
    for idx, prediction in enumerate(predictions, 1):
        # Historical data
        historical_df = st.session_state.analytics_engine.repository.get_metric_history(
            prediction.metric_name
        )
        
        if not historical_df.empty:
            fig.add_trace(
                go.Scatter(
                    x=historical_df['timestamp'],
                    y=historical_df['value'],
                    mode='lines',
                    name=f'{prediction.metric_name} (Historical)',
                    line=dict(width=1.5),
                    showlegend=False
                ),
                row=idx, col=1
            )
        
        # Predicted values
        fig.add_trace(
            go.Scatter(
                x=prediction.timestamps,
                y=prediction.predicted_values,
                mode='lines',
                name=f'{prediction.metric_name} (Predicted)',
                line=dict(width=1.5, dash='dash'),
                showlegend=False
            ),
            row=idx, col=1
        )
    
    fig.update_layout(
        height=300 * len(predictions),
        showlegend=False
    )
    
    return fig


def create_trend_summary_chart(summary):
    """Create summary chart of trends across all metrics"""
    trend_counts = {}
    for metric, trend in summary['overall_trends'].items():
        trend_counts[trend] = trend_counts.get(trend, 0) + 1
    
    fig = go.Figure(data=[go.Pie(
        labels=list(trend_counts.keys()),
        values=list(trend_counts.values()),
        hole=0.3,
        marker=dict(colors=['green', 'red', 'orange', 'gray', 'blue'])
    )])
    
    fig.update_layout(
        title="Overall Trend Distribution",
        height=400
    )
    
    return fig


def create_growth_rate_chart(summary):
    """Create bar chart of growth rates"""
    growth_data = summary.get('growth_metrics', [])
    declining_data = summary.get('declining_metrics', [])
    
    if not growth_data and not declining_data:
        return None
    
    metrics = []
    rates = []
    colors = []
    
    for item in growth_data:
        metrics.append(item['metric'])
        rates.append(item['growth_rate'])
        colors.append('green')
    
    for item in declining_data:
        metrics.append(item['metric'])
        rates.append(item['decline_rate'])
        colors.append('red')
    
    fig = go.Figure(data=[go.Bar(
        x=metrics,
        y=rates,
        marker=dict(color=colors)
    )])
    
    fig.update_layout(
        title="Annual Growth/Decline Rates (%)",
        xaxis_title="Metric",
        yaxis_title="Annual Rate (%)",
        height=400
    )
    
    return fig


def render_predictive_analytics_dashboard():
    """Render the main predictive analytics dashboard"""
    st.title("🔮 Long-Term Analytics & Prediction System")
    st.markdown("**Accumulate decades of data and generate forward-thinking strategic insights**")
    
    # Initialize analytics engine in session state
    if 'analytics_engine' not in st.session_state:
        st.session_state.analytics_engine = PredictiveAnalyticsEngine()
        # Simulate historical data for demonstration
        st.session_state.analytics_engine.repository.simulate_historical_data(years=10)
    
    if 'data_capture_message' not in st.session_state:
        st.session_state.data_capture_message = None
    
    engine = st.session_state.analytics_engine
    
    # Show success message if present
    if st.session_state.data_capture_message:
        st.success(st.session_state.data_capture_message)
        st.session_state.data_capture_message = None
    
    # Sidebar controls
    st.sidebar.header("⚙️ Analysis Configuration")
    
    # Time horizon selection
    horizon_map = {
        "Short-Term (1-5 years)": PredictionHorizon.SHORT_TERM,
        "Medium-Term (5-20 years)": PredictionHorizon.MEDIUM_TERM,
        "Long-Term (20-50 years)": PredictionHorizon.LONG_TERM,
        "Ultra Long-Term (50-100 years)": PredictionHorizon.ULTRA_LONG_TERM
    }
    
    selected_horizon_name = st.sidebar.selectbox(
        "Prediction Horizon",
        list(horizon_map.keys()),
        index=2  # Default to Long-Term
    )
    
    horizon = horizon_map[selected_horizon_name]
    
    st.sidebar.divider()
    
    # Metrics available
    all_metrics = engine.repository.get_all_metrics()
    
    st.sidebar.subheader("📊 Available Metrics")
    st.sidebar.info(f"{len(all_metrics)} metrics tracked")
    
    for metric in all_metrics[:5]:
        st.sidebar.write(f"• {metric}")
    
    if len(all_metrics) > 5:
        st.sidebar.write(f"• ... and {len(all_metrics) - 5} more")
    
    st.sidebar.divider()
    
    # Data capture simulation
    st.sidebar.subheader("📥 Data Capture")
    
    if st.sidebar.button("Simulate Year of Data", use_container_width=True):
        engine.repository.simulate_historical_data(years=1)
        st.session_state.data_capture_message = "✅ Year of data added!"
        st.rerun()
    
    if st.sidebar.button("Simulate Decade of Data", use_container_width=True):
        engine.repository.simulate_historical_data(years=10)
        st.session_state.data_capture_message = "✅ Decade of data added!"
        st.rerun()
    
    # Main dashboard tabs
    tabs = st.tabs([
        "🎯 Strategic Overview",
        "📈 Metric Predictions",
        "📊 Historical Analysis",
        "🔍 Deep Dive",
        "💡 Insights"
    ])
    
    with tabs[0]:  # Strategic Overview
        st.header("Strategic Overview")
        
        with st.spinner("Generating strategic analysis..."):
            summary = engine.get_strategic_summary(horizon)
        
        if summary:
            # Key metrics
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric(
                    "Metrics Analyzed",
                    summary['num_metrics_analyzed']
                )
            
            with col2:
                st.metric(
                    "Growth Metrics",
                    len(summary.get('growth_metrics', []))
                )
            
            with col3:
                st.metric(
                    "Declining Metrics",
                    len(summary.get('declining_metrics', []))
                )
            
            st.divider()
            
            # Visualizations
            col1, col2 = st.columns(2)
            
            with col1:
                trend_chart = create_trend_summary_chart(summary)
                st.plotly_chart(trend_chart, use_container_width=True)
            
            with col2:
                growth_chart = create_growth_rate_chart(summary)
                if growth_chart:
                    st.plotly_chart(growth_chart, use_container_width=True)
            
            st.divider()
            
            # Strategic insights
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("🎯 Key Strategic Insights")
                for insight in summary.get('key_insights', []):
                    st.success(f"✓ {insight}")
            
            with col2:
                st.subheader("⚠️ Critical Risk Factors")
                for risk in summary.get('critical_risks', []):
                    st.warning(f"⚠ {risk}")
        else:
            st.info("Insufficient data for strategic analysis. Add more historical data.")
    
    with tabs[1]:  # Metric Predictions
        st.header("Metric Predictions")
        
        # Metric selection
        selected_metrics = st.multiselect(
            "Select Metrics to Forecast",
            all_metrics,
            default=all_metrics[:3] if len(all_metrics) >= 3 else all_metrics
        )
        
        if selected_metrics and st.button("Generate Forecasts", use_container_width=True):
            with st.spinner("Generating predictions..."):
                predictions = engine.generate_multi_metric_forecast(selected_metrics, horizon)
            
            if predictions:
                st.success(f"✅ Generated forecasts for {len(predictions)} metrics")
                
                # Display each prediction
                for metric_name, prediction in predictions.items():
                    with st.expander(f"📈 {metric_name}", expanded=True):
                        # Prediction chart
                        fig = create_prediction_chart(prediction)
                        st.plotly_chart(fig, use_container_width=True)
                        
                        # Statistics
                        col1, col2, col3, col4 = st.columns(4)
                        
                        with col1:
                            st.metric("Trend", prediction.trend.replace('_', ' ').title())
                        
                        with col2:
                            st.metric(
                                "Annual Growth",
                                f"{prediction.annual_growth_rate:.2f}%"
                            )
                        
                        with col3:
                            st.metric(
                                "Predicted Peak",
                                f"{max(prediction.predicted_values):.2f}"
                            )
                        
                        with col4:
                            st.metric(
                                "Predicted Low",
                                f"{min(prediction.predicted_values):.2f}"
                            )
                        
                        # Insights
                        if prediction.strategic_insights:
                            st.write("**Strategic Insights:**")
                            for insight in prediction.strategic_insights[:3]:
                                st.info(f"💡 {insight}")
                        
                        if prediction.risk_factors:
                            st.write("**Risk Factors:**")
                            for risk in prediction.risk_factors[:2]:
                                st.warning(f"⚠️ {risk}")
            else:
                st.error("No predictions generated. Check data availability.")
    
    with tabs[2]:  # Historical Analysis
        st.header("Historical Data Analysis")
        
        selected_metric = st.selectbox("Select Metric", all_metrics)
        
        if selected_metric:
            df = engine.repository.get_metric_history(selected_metric)
            
            if not df.empty:
                # Stats
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("Data Points", len(df))
                
                with col2:
                    st.metric("Average", f"{df['value'].mean():.2f}")
                
                with col3:
                    st.metric("Max", f"{df['value'].max():.2f}")
                
                with col4:
                    st.metric("Min", f"{df['value'].min():.2f}")
                
                # Historical chart
                fig = go.Figure()
                
                fig.add_trace(go.Scatter(
                    x=df['timestamp'],
                    y=df['value'],
                    mode='lines+markers',
                    name='Historical Data',
                    line=dict(color='blue', width=2)
                ))
                
                fig.update_layout(
                    title=f"Historical Data: {selected_metric}",
                    xaxis_title="Time",
                    yaxis_title="Value",
                    height=500
                )
                
                st.plotly_chart(fig, use_container_width=True)
                
                # Data table
                st.subheader("Recent Data Points")
                st.dataframe(df.tail(20), use_container_width=True)
            else:
                st.info("No historical data available for this metric")
    
    with tabs[3]:  # Deep Dive
        st.header("Deep Dive Analysis")
        
        selected_metric = st.selectbox("Select Metric for Deep Dive", all_metrics, key='deep_dive')
        
        col1, col2 = st.columns(2)
        
        with col1:
            analyze_short = st.checkbox("Short-Term (1-5 years)", value=True)
            analyze_medium = st.checkbox("Medium-Term (5-20 years)", value=True)
        
        with col2:
            analyze_long = st.checkbox("Long-Term (20-50 years)", value=True)
            analyze_ultra = st.checkbox("Ultra Long-Term (50-100 years)", value=False)
        
        if st.button("Run Deep Dive Analysis", use_container_width=True):
            horizons = []
            if analyze_short:
                horizons.append(PredictionHorizon.SHORT_TERM)
            if analyze_medium:
                horizons.append(PredictionHorizon.MEDIUM_TERM)
            if analyze_long:
                horizons.append(PredictionHorizon.LONG_TERM)
            if analyze_ultra:
                horizons.append(PredictionHorizon.ULTRA_LONG_TERM)
            
            if horizons:
                predictions = []
                for h in horizons:
                    pred = engine.generate_prediction(selected_metric, h)
                    if pred:
                        predictions.append(pred)
                
                if predictions:
                    # Multi-horizon comparison
                    fig = go.Figure()
                    
                    # Historical
                    df = engine.repository.get_metric_history(selected_metric)
                    if not df.empty:
                        fig.add_trace(go.Scatter(
                            x=df['timestamp'],
                            y=df['value'],
                            mode='lines',
                            name='Historical',
                            line=dict(color='blue', width=2)
                        ))
                    
                    colors = ['red', 'orange', 'purple', 'pink']
                    for pred, color in zip(predictions, colors):
                        fig.add_trace(go.Scatter(
                            x=pred.timestamps,
                            y=pred.predicted_values,
                            mode='lines',
                            name=pred.horizon.value,
                            line=dict(color=color, width=2, dash='dash')
                        ))
                    
                    fig.update_layout(
                        title=f"Multi-Horizon Forecast: {selected_metric}",
                        xaxis_title="Time",
                        yaxis_title="Value",
                        height=600
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Comparison table
                    st.subheader("Forecast Comparison")
                    
                    comparison_data = []
                    for pred in predictions:
                        comparison_data.append({
                            'Horizon': pred.horizon.value,
                            'Trend': pred.trend,
                            'Annual Growth Rate': f"{pred.annual_growth_rate:.2f}%",
                            'Predicted Peak': f"{max(pred.predicted_values):.2f}",
                            'Predicted Average': f"{np.mean(pred.predicted_values):.2f}"
                        })
                    
                    st.table(pd.DataFrame(comparison_data))
    
    with tabs[4]:  # Insights
        st.header("Strategic Insights Library")
        
        st.markdown("""
        ### 🎯 Forward-Thinking Strategy Framework
        
        This system accumulates historical data over decades (potentially 50-100 years) and uses it to:
        
        1. **Quantify Prediction Analysis**
           - Time-series forecasting with ensemble methods
           - Trend detection and pattern recognition
           - Statistical confidence intervals
        
        2. **Generate Strategic Insights**
           - Growth opportunity identification
           - Risk factor detection
           - Performance optimization recommendations
        
        3. **Support Long-Term Planning**
           - Multi-horizon forecasting (1-100 years)
           - Scenario analysis and comparison
           - Data-driven decision making
        
        ### 📊 Key Capabilities
        
        - **Historical Data Repository**: Stores data from all NexusOS modules
        - **Ensemble Forecasting**: Combines multiple prediction methods
        - **Trend Analysis**: Detects acceleration, deceleration, volatility
        - **Growth Rate Calculation**: CAGR and compound growth metrics
        - **Strategic Insight Generation**: Automated recommendations
        - **Risk Assessment**: Identifies potential challenges
        
        ### 🔮 Future Enhancements
        
        - Integration with blockchain historical data
        - Economic simulation result tracking
        - Multi-agent network performance analysis
        - ML model training on accumulated data
        - Real-time anomaly detection
        - Automated alert system for trend changes
        """)
        
        # Data volume stats
        st.divider()
        st.subheader("📈 Data Accumulation Statistics")
        
        total_points = len(engine.repository.data_points)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric("Total Data Points", f"{total_points:,}")
        
        with col2:
            st.metric("Metrics Tracked", len(all_metrics))
        
        with col3:
            if total_points > 0:
                oldest = min(dp.timestamp for dp in engine.repository.data_points)
                time_span = (datetime.now() - oldest).days / 365
                st.metric("Time Span (Years)", f"{time_span:.1f}")
