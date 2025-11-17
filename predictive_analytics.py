"""
Long-Term Analytics & Prediction System
Accumulates historical data over decades and performs predictive analysis for forward-thinking strategies
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
from scipy import stats
from scipy.signal import savgol_filter
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


class DataSourceType(Enum):
    """Types of data sources"""
    BLOCKCHAIN = "blockchain"
    ECONOMIC_SIM = "economic_simulation"
    MULTI_AGENT = "multi_agent_network"
    ORACLE = "oracle_data"
    TASK_ORCHESTRATION = "task_orchestration"
    WAVELENGTH_CRYPTO = "wavelength_crypto"


class PredictionHorizon(Enum):
    """Time horizons for predictions"""
    SHORT_TERM = "1-5 years"
    MEDIUM_TERM = "5-20 years"
    LONG_TERM = "20-50 years"
    ULTRA_LONG_TERM = "50-100 years"


@dataclass
class HistoricalDataPoint:
    """Single historical data point"""
    timestamp: datetime
    source_type: DataSourceType
    metric_name: str
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'source_type': self.source_type.value,
            'metric_name': self.metric_name,
            'value': self.value,
            'metadata': self.metadata
        }


@dataclass
class PredictionResult:
    """Result of a prediction analysis"""
    metric_name: str
    horizon: PredictionHorizon
    predicted_values: List[float]
    timestamps: List[datetime]
    confidence_interval: Tuple[List[float], List[float]]
    trend: str  # 'increasing', 'decreasing', 'stable', 'volatile'
    annual_growth_rate: float
    strategic_insights: List[str]
    risk_factors: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'metric_name': self.metric_name,
            'horizon': self.horizon.value,
            'predicted_values': self.predicted_values,
            'timestamps': [t.isoformat() for t in self.timestamps],
            'confidence_interval': {
                'lower': self.confidence_interval[0],
                'upper': self.confidence_interval[1]
            },
            'trend': self.trend,
            'annual_growth_rate': self.annual_growth_rate,
            'strategic_insights': self.strategic_insights,
            'risk_factors': self.risk_factors
        }


class TimeSeriesForecaster:
    """Advanced time-series forecasting engine"""
    
    def __init__(self):
        self.scaler = StandardScaler()
    
    def detect_trend(self, values: np.ndarray) -> str:
        """Detect overall trend in data with scale-normalized thresholds"""
        if len(values) < 10:
            return 'insufficient_data'
        
        # Normalize values to remove scale dependency
        value_range = np.max(values) - np.min(values)
        if value_range == 0:
            return 'stable'
        
        normalized_values = (values - np.min(values)) / value_range
        
        # Linear regression on normalized data
        X = np.arange(len(normalized_values)).reshape(-1, 1)
        y = normalized_values
        
        model = LinearRegression()
        model.fit(X, y)
        slope = model.coef_[0]
        
        # Calculate coefficient of variation for volatility (scale-independent)
        cv = np.std(values) / np.abs(np.mean(values)) if np.mean(values) != 0 else 0
        
        # Determine trend with improved thresholds
        if cv > 0.5:
            return 'volatile'
        elif abs(slope) < 0.005:  # Relative to normalized scale
            return 'stable'
        elif slope > 0:
            return 'increasing'
        else:
            return 'decreasing'
    
    def calculate_growth_rate(self, values: np.ndarray, time_years: float) -> float:
        """Calculate compound annual growth rate with proper handling of edge cases"""
        if len(values) < 2 or time_years <= 0:
            return 0.0
        
        start_value = values[0]
        end_value = values[-1]
        
        # Handle negative or zero starting values
        if start_value <= 0:
            if end_value > 0:
                # Went from zero/negative to positive - calculate based on absolute change
                return (abs(end_value - start_value) / max(abs(start_value), 1.0)) * 100 / time_years
            else:
                # Both negative or zero - return simple percentage change
                return ((end_value - start_value) / max(abs(start_value), 1.0)) * 100 / time_years
        
        # Standard CAGR formula for positive start value
        if end_value > 0:
            cagr = (np.power(end_value / start_value, 1 / time_years) - 1) * 100
        else:
            # Went from positive to zero/negative - negative growth
            cagr = -100.0
        
        return cagr
    
    def moving_average_forecast(
        self, 
        historical_values: np.ndarray,
        forecast_steps: int,
        window_size: int = 10
    ) -> np.ndarray:
        """Forecast using moving average"""
        forecasts = []
        current_data = list(historical_values)
        
        for _ in range(forecast_steps):
            window = current_data[-window_size:]
            next_value = np.mean(window)
            forecasts.append(next_value)
            current_data.append(next_value)
        
        return np.array(forecasts)
    
    def exponential_smoothing_forecast(
        self,
        historical_values: np.ndarray,
        forecast_steps: int,
        alpha: float = 0.3
    ) -> np.ndarray:
        """Forecast using exponential smoothing with proper implementation"""
        # Apply exponential smoothing to historical data first
        smoothed = []
        s = historical_values[0]
        
        for value in historical_values:
            s = alpha * value + (1 - alpha) * s
            smoothed.append(s)
        
        # For forecast, use the trend from smoothed data
        if len(smoothed) >= 2:
            trend = smoothed[-1] - smoothed[-2]
        else:
            trend = 0
        
        # Generate forecasts with trend
        forecasts = []
        last_value = smoothed[-1]
        
        for i in range(forecast_steps):
            next_value = last_value + trend
            forecasts.append(next_value)
            last_value = next_value
        
        return np.array(forecasts)
    
    def polynomial_trend_forecast(
        self,
        historical_values: np.ndarray,
        forecast_steps: int,
        degree: int = 2
    ) -> np.ndarray:
        """Forecast using polynomial trend extrapolation"""
        X = np.arange(len(historical_values))
        
        # Fit polynomial
        coeffs = np.polyfit(X, historical_values, degree)
        poly = np.poly1d(coeffs)
        
        # Generate forecast
        future_X = np.arange(len(historical_values), len(historical_values) + forecast_steps)
        forecasts = poly(future_X)
        
        return forecasts
    
    def ensemble_forecast(
        self,
        historical_values: np.ndarray,
        forecast_steps: int
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Ensemble of multiple forecasting methods with confidence intervals"""
        # Apply different methods
        ma_forecast = self.moving_average_forecast(historical_values, forecast_steps)
        exp_forecast = self.exponential_smoothing_forecast(historical_values, forecast_steps)
        poly_forecast = self.polynomial_trend_forecast(historical_values, forecast_steps)
        
        # Ensemble average
        forecasts = np.array([ma_forecast, exp_forecast, poly_forecast])
        mean_forecast = np.mean(forecasts, axis=0)
        
        # Calculate confidence intervals
        std_forecast = np.std(forecasts, axis=0)
        lower_bound = mean_forecast - 1.96 * std_forecast
        upper_bound = mean_forecast + 1.96 * std_forecast
        
        return mean_forecast, lower_bound, upper_bound


class StrategicInsightGenerator:
    """Generates strategic insights from historical patterns and predictions"""
    
    def generate_insights(
        self,
        metric_name: str,
        trend: str,
        growth_rate: float,
        predicted_values: np.ndarray,
        historical_values: np.ndarray
    ) -> Tuple[List[str], List[str]]:
        """Generate strategic insights and risk factors"""
        insights = []
        risks = []
        
        # Trend-based insights
        if trend == 'increasing':
            if growth_rate > 10:
                insights.append(f"{metric_name} shows strong positive growth ({growth_rate:.1f}% annually)")
                insights.append("Consider scaling infrastructure to accommodate rapid expansion")
            elif growth_rate > 5:
                insights.append(f"{metric_name} exhibits steady growth ({growth_rate:.1f}% annually)")
                insights.append("Maintain current strategies with gradual optimization")
            else:
                insights.append(f"{metric_name} shows modest growth ({growth_rate:.1f}% annually)")
        
        elif trend == 'decreasing':
            risks.append(f"{metric_name} declining at {abs(growth_rate):.1f}% annually")
            insights.append("Immediate intervention required to reverse negative trend")
            risks.append("Current trajectory unsustainable without strategic pivot")
        
        elif trend == 'volatile':
            risks.append(f"{metric_name} exhibits high volatility")
            insights.append("Implement risk mitigation strategies and stabilization mechanisms")
            insights.append("Consider diversification to reduce exposure to fluctuations")
        
        elif trend == 'stable':
            insights.append(f"{metric_name} maintains stability")
            insights.append("Equilibrium achieved - focus on efficiency optimization")
        
        # Magnitude-based insights
        if len(predicted_values) > 0:
            future_max = np.max(predicted_values)
            historical_max = np.max(historical_values)
            
            if future_max > historical_max * 2:
                insights.append(f"Predicted to exceed historical peak by {((future_max/historical_max - 1) * 100):.0f}%")
                insights.append("Prepare for unprecedented scale and complexity")
            
            future_mean = np.mean(predicted_values)
            historical_mean = np.mean(historical_values)
            
            if future_mean < historical_mean * 0.5:
                risks.append("Future performance predicted below 50% of historical average")
                risks.append("System degradation likely without corrective action")
        
        # Pattern-based insights
        if len(historical_values) > 20:
            recent_trend = self._detect_recent_shift(historical_values)
            if recent_trend == 'acceleration':
                insights.append("Recent acceleration detected - capitalize on momentum")
            elif recent_trend == 'deceleration':
                risks.append("Recent deceleration - investigate root causes")
        
        # Long-term strategic insights
        insights.append("Historical data enables informed decision-making")
        insights.append("Continuous monitoring recommended for early trend detection")
        
        return insights, risks
    
    def _detect_recent_shift(self, values: np.ndarray, lookback: int = 10) -> str:
        """Detect recent acceleration or deceleration"""
        if len(values) < lookback * 2:
            return 'insufficient_data'
        
        recent = values[-lookback:]
        previous = values[-lookback*2:-lookback]
        
        recent_mean = np.mean(recent)
        previous_mean = np.mean(previous)
        
        if recent_mean > previous_mean * 1.2:
            return 'acceleration'
        elif recent_mean < previous_mean * 0.8:
            return 'deceleration'
        else:
            return 'steady'


class HistoricalDataRepository:
    """Repository for storing and retrieving historical data"""
    
    def __init__(self):
        self.data_points: List[HistoricalDataPoint] = []
        self.data_index: Dict[str, List[int]] = {}  # metric_name -> indices
    
    def add_data_point(self, data_point: HistoricalDataPoint):
        """Add a historical data point"""
        idx = len(self.data_points)
        self.data_points.append(data_point)
        
        if data_point.metric_name not in self.data_index:
            self.data_index[data_point.metric_name] = []
        self.data_index[data_point.metric_name].append(idx)
    
    def get_metric_history(
        self,
        metric_name: str,
        source_type: Optional[DataSourceType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Retrieve historical data for a specific metric"""
        if metric_name not in self.data_index:
            return pd.DataFrame()
        
        indices = self.data_index[metric_name]
        data_points = [self.data_points[i] for i in indices]
        
        # Filter by source type
        if source_type:
            data_points = [dp for dp in data_points if dp.source_type == source_type]
        
        # Filter by date range
        if start_date:
            data_points = [dp for dp in data_points if dp.timestamp >= start_date]
        if end_date:
            data_points = [dp for dp in data_points if dp.timestamp <= end_date]
        
        # Convert to DataFrame
        df = pd.DataFrame([
            {
                'timestamp': dp.timestamp,
                'value': dp.value,
                'source_type': dp.source_type.value,
                'metadata': dp.metadata
            }
            for dp in data_points
        ])
        
        if not df.empty:
            df = df.sort_values('timestamp')
        
        return df
    
    def get_all_metrics(self) -> List[str]:
        """Get list of all tracked metrics"""
        return list(self.data_index.keys())
    
    def simulate_historical_data(self, years: int = 10):
        """Generate simulated historical data for demonstration"""
        base_date = datetime.now() - timedelta(days=365 * years)
        
        metrics = [
            ('blockchain_tps', DataSourceType.BLOCKCHAIN, 1000, 100, 0.1),
            ('blockchain_validators', DataSourceType.BLOCKCHAIN, 50, 5, 0.05),
            ('economic_total_value', DataSourceType.ECONOMIC_SIM, 1000000, 50000, 0.15),
            ('network_nodes', DataSourceType.MULTI_AGENT, 100, 10, 0.08),
            ('task_completion_rate', DataSourceType.TASK_ORCHESTRATION, 0.85, 0.05, 0.02),
        ]
        
        days = years * 365
        
        for metric_name, source_type, base_value, volatility, trend in metrics:
            for day in range(0, days, 7):  # Weekly data points
                timestamp = base_date + timedelta(days=day)
                
                # Simulate growth with noise
                time_factor = day / days
                growth = base_value * (1 + trend * time_factor)
                noise = np.random.normal(0, volatility)
                value = max(0, growth + noise)
                
                data_point = HistoricalDataPoint(
                    timestamp=timestamp,
                    source_type=source_type,
                    metric_name=metric_name,
                    value=value,
                    metadata={'simulated': True}
                )
                
                self.add_data_point(data_point)


class PredictiveAnalyticsEngine:
    """Main engine for long-term predictive analytics"""
    
    def __init__(self):
        self.repository = HistoricalDataRepository()
        self.forecaster = TimeSeriesForecaster()
        self.insight_generator = StrategicInsightGenerator()
    
    def capture_data_point(
        self,
        metric_name: str,
        value: float,
        source_type: DataSourceType,
        metadata: Dict[str, Any] = None
    ):
        """Capture a new data point"""
        data_point = HistoricalDataPoint(
            timestamp=datetime.now(),
            source_type=source_type,
            metric_name=metric_name,
            value=value,
            metadata=metadata or {}
        )
        self.repository.add_data_point(data_point)
    
    def generate_prediction(
        self,
        metric_name: str,
        horizon: PredictionHorizon,
        source_type: Optional[DataSourceType] = None
    ) -> Optional[PredictionResult]:
        """Generate prediction for a specific metric"""
        # Get historical data
        df = self.repository.get_metric_history(metric_name, source_type)
        
        if df.empty or len(df) < 10:
            return None
        
        historical_values = df['value'].values
        historical_timestamps = df['timestamp'].values
        
        # Determine forecast steps based on horizon
        horizon_steps = {
            PredictionHorizon.SHORT_TERM: 52,  # 1 year weekly
            PredictionHorizon.MEDIUM_TERM: 260,  # 5 years weekly
            PredictionHorizon.LONG_TERM: 520,  # 10 years weekly
            PredictionHorizon.ULTRA_LONG_TERM: 1040,  # 20 years weekly
        }
        
        forecast_steps = horizon_steps[horizon]
        
        # Generate forecast
        predicted_values, lower_bound, upper_bound = self.forecaster.ensemble_forecast(
            historical_values, forecast_steps
        )
        
        # Generate timestamps for predictions
        last_timestamp = pd.Timestamp(historical_timestamps[-1])
        prediction_timestamps = [
            (last_timestamp + pd.Timedelta(weeks=i)).to_pydatetime()
            for i in range(1, forecast_steps + 1)
        ]
        
        # Detect trend
        trend = self.forecaster.detect_trend(historical_values)
        
        # Calculate growth rate
        total_years = len(historical_values) / 52  # Assuming weekly data
        growth_rate = self.forecaster.calculate_growth_rate(historical_values, total_years)
        
        # Generate insights
        insights, risks = self.insight_generator.generate_insights(
            metric_name, trend, growth_rate, predicted_values, historical_values
        )
        
        return PredictionResult(
            metric_name=metric_name,
            horizon=horizon,
            predicted_values=predicted_values.tolist(),
            timestamps=prediction_timestamps,
            confidence_interval=(lower_bound.tolist(), upper_bound.tolist()),
            trend=trend,
            annual_growth_rate=growth_rate,
            strategic_insights=insights,
            risk_factors=risks
        )
    
    def generate_multi_metric_forecast(
        self,
        metrics: List[str],
        horizon: PredictionHorizon
    ) -> Dict[str, PredictionResult]:
        """Generate forecasts for multiple metrics"""
        results = {}
        
        for metric in metrics:
            prediction = self.generate_prediction(metric, horizon)
            if prediction:
                results[metric] = prediction
        
        return results
    
    def get_strategic_summary(self, horizon: PredictionHorizon) -> Dict[str, Any]:
        """Generate comprehensive strategic summary across all metrics"""
        all_metrics = self.repository.get_all_metrics()
        predictions = self.generate_multi_metric_forecast(all_metrics, horizon)
        
        if not predictions:
            return {}
        
        summary = {
            'horizon': horizon.value,
            'num_metrics_analyzed': len(predictions),
            'overall_trends': {},
            'key_insights': [],
            'critical_risks': [],
            'growth_metrics': [],
            'declining_metrics': []
        }
        
        for metric_name, prediction in predictions.items():
            summary['overall_trends'][metric_name] = prediction.trend
            
            if prediction.trend == 'increasing':
                summary['growth_metrics'].append({
                    'metric': metric_name,
                    'growth_rate': prediction.annual_growth_rate
                })
            elif prediction.trend == 'decreasing':
                summary['declining_metrics'].append({
                    'metric': metric_name,
                    'decline_rate': prediction.annual_growth_rate
                })
            
            summary['key_insights'].extend(prediction.strategic_insights[:2])
            summary['critical_risks'].extend(prediction.risk_factors)
        
        # Deduplicate insights and risks
        summary['key_insights'] = list(set(summary['key_insights']))[:10]
        summary['critical_risks'] = list(set(summary['critical_risks']))[:10]
        
        return summary
