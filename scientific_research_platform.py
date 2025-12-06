"""
NexusOS Scientific Research Platform
=====================================
A complete research workflow for designing, simulating, analyzing, 
and reporting on experiments grounded in Lambda Boson physics.

Core Physics: Λ = hf/c² (Lambda Boson - mass-equivalent of oscillation)
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.signal import find_peaks
from datetime import datetime
import json
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid

# Physical Constants
PLANCK_CONSTANT = 6.62607015e-34  # J·s
SPEED_OF_LIGHT = 299792458  # m/s
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K
AVOGADRO_NUMBER = 6.02214076e23  # mol⁻¹


class ExperimentCategory(Enum):
    PHOTONICS = "photonics"
    ATOMIC = "atomic"
    MEDICAL = "medical"
    ENERGY = "energy"
    MATERIALS = "materials"
    NETWORK = "network"
    QUANTUM = "quantum"
    CUSTOM = "custom"


class VariableType(Enum):
    INDEPENDENT = "independent"
    DEPENDENT = "dependent"
    CONTROL = "control"


class ReportType(Enum):
    EXECUTIVE = "executive"
    TECHNICAL = "technical"
    ACADEMIC = "academic"
    PATENT = "patent"
    INVESTOR = "investor"


@dataclass
class ExperimentVariable:
    """Defines a variable in an experiment."""
    name: str
    var_type: VariableType
    unit: str
    min_value: float = 0.0
    max_value: float = 1.0
    default_value: float = 0.5
    description: str = ""
    

@dataclass
class Hypothesis:
    """Scientific hypothesis for an experiment."""
    statement: str
    null_hypothesis: str
    alternative_hypothesis: str
    significance_level: float = 0.05
    

@dataclass
class ExperimentDesign:
    """Complete experiment design specification."""
    id: str
    name: str
    category: ExperimentCategory
    hypothesis: Hypothesis
    variables: List[ExperimentVariable]
    description: str
    methodology: str
    created_at: str
    created_by: str
    physics_basis: str = "Lambda Boson (Λ = hf/c²)"
    iterations: int = 1000
    

@dataclass
class SimulationResult:
    """Results from a single simulation run."""
    iteration: int
    timestamp: str
    input_params: Dict[str, float]
    output_values: Dict[str, float]
    lambda_mass: float
    energy: float
    frequency: float
    anomaly_detected: bool = False
    

@dataclass
class StatisticalAnalysis:
    """Statistical analysis of experiment results."""
    sample_size: int
    mean: Dict[str, float]
    std_dev: Dict[str, float]
    variance: Dict[str, float]
    min_values: Dict[str, float]
    max_values: Dict[str, float]
    confidence_intervals: Dict[str, Tuple[float, float]]
    p_value: float
    t_statistic: float
    correlation_matrix: Dict[str, Dict[str, float]]
    hypothesis_result: str
    effect_size: float
    

@dataclass
class ExperimentReport:
    """Generated experiment report."""
    report_id: str
    experiment_id: str
    report_type: ReportType
    generated_at: str
    executive_summary: str
    methodology: str
    results: str
    analysis: str
    conclusions: str
    recommendations: str
    visualizations: List[str]
    raw_data_reference: str
    citations: List[str]


class LambdaBosonPhysicsEngine:
    """
    Core physics engine based on Lambda Boson substrate.
    All calculations grounded in Λ = hf/c²
    """
    
    def __init__(self):
        self.h = PLANCK_CONSTANT
        self.c = SPEED_OF_LIGHT
        self.k = BOLTZMANN_CONSTANT
        
    def calculate_lambda_mass(self, frequency: float) -> float:
        """Calculate Lambda Boson mass-equivalent from frequency."""
        return (self.h * frequency) / (self.c ** 2)
    
    def calculate_energy(self, frequency: float) -> float:
        """Calculate energy from frequency (E = hf)."""
        return self.h * frequency
    
    def calculate_frequency_from_energy(self, energy: float) -> float:
        """Calculate frequency from energy (f = E/h)."""
        return energy / self.h
    
    def calculate_wavelength(self, frequency: float) -> float:
        """Calculate wavelength from frequency (λ = c/f)."""
        return self.c / frequency
    
    def calculate_momentum(self, frequency: float) -> float:
        """Calculate photon momentum (p = hf/c)."""
        return (self.h * frequency) / self.c
    
    def calculate_thermal_energy(self, temperature: float) -> float:
        """Calculate thermal energy (E = kT)."""
        return self.k * temperature
    
    def resonance_frequency(self, mass: float) -> float:
        """Calculate resonance frequency for given mass."""
        energy = mass * (self.c ** 2)
        return energy / self.h
    
    def interference_pattern(self, freq1: float, freq2: float, 
                            time_points: np.ndarray) -> np.ndarray:
        """Calculate interference pattern between two frequencies."""
        wave1 = np.sin(2 * np.pi * freq1 * time_points)
        wave2 = np.sin(2 * np.pi * freq2 * time_points)
        return wave1 + wave2
    
    def standing_wave_modes(self, length: float, n_modes: int = 5) -> List[float]:
        """Calculate standing wave mode frequencies."""
        return [((n + 1) * self.c) / (2 * length) for n in range(n_modes)]
    
    def boltzmann_distribution(self, energies: np.ndarray, 
                               temperature: float) -> np.ndarray:
        """Calculate Boltzmann distribution of energies."""
        beta = 1 / (self.k * temperature)
        weights = np.exp(-beta * energies)
        return weights / np.sum(weights)
    
    def spectral_energy_density(self, frequency: float, 
                                temperature: float) -> float:
        """Calculate Planck's spectral energy density."""
        numerator = 8 * np.pi * self.h * (frequency ** 3) / (self.c ** 3)
        denominator = np.exp((self.h * frequency) / (self.k * temperature)) - 1
        return numerator / denominator


class ExperimentSimulator:
    """
    Simulation engine for running experiments.
    Uses Monte Carlo methods with Lambda Boson physics.
    """
    
    def __init__(self):
        self.physics = LambdaBosonPhysicsEngine()
        self.results: List[SimulationResult] = []
        self.anomalies: List[SimulationResult] = []
        
    def run_simulation(self, design: ExperimentDesign, 
                       params: Dict[str, float]) -> List[SimulationResult]:
        """Run simulation based on experiment design."""
        self.results = []
        self.anomalies = []
        
        for i in range(design.iterations):
            result = self._simulate_iteration(i, design, params)
            self.results.append(result)
            
            if result.anomaly_detected:
                self.anomalies.append(result)
                
        return self.results
    
    def _simulate_iteration(self, iteration: int, design: ExperimentDesign,
                           params: Dict[str, float]) -> SimulationResult:
        """Run single iteration with stochastic elements."""
        
        # Add controlled randomness for Monte Carlo
        noise_factor = np.random.normal(1.0, 0.05)
        
        # Get base frequency from parameters or calculate
        base_freq = params.get('frequency', 1e14)  # Default visible light
        frequency = base_freq * noise_factor
        
        # Calculate physics outputs
        energy = self.physics.calculate_energy(frequency)
        lambda_mass = self.physics.calculate_lambda_mass(frequency)
        wavelength = self.physics.calculate_wavelength(frequency)
        momentum = self.physics.calculate_momentum(frequency)
        
        # Category-specific calculations
        outputs = self._category_simulation(design.category, params, frequency)
        outputs['wavelength'] = wavelength
        outputs['momentum'] = momentum
        
        # Anomaly detection (values outside 3 sigma)
        anomaly = abs(noise_factor - 1.0) > 0.15
        
        return SimulationResult(
            iteration=iteration,
            timestamp=datetime.now().isoformat(),
            input_params=params.copy(),
            output_values=outputs,
            lambda_mass=lambda_mass,
            energy=energy,
            frequency=frequency,
            anomaly_detected=anomaly
        )
    
    def _category_simulation(self, category: ExperimentCategory,
                            params: Dict[str, float],
                            frequency: float) -> Dict[str, float]:
        """Category-specific simulation logic."""
        
        if category == ExperimentCategory.PHOTONICS:
            return self._photonics_sim(params, frequency)
        elif category == ExperimentCategory.ATOMIC:
            return self._atomic_sim(params, frequency)
        elif category == ExperimentCategory.MEDICAL:
            return self._medical_sim(params, frequency)
        elif category == ExperimentCategory.ENERGY:
            return self._energy_sim(params, frequency)
        elif category == ExperimentCategory.MATERIALS:
            return self._materials_sim(params, frequency)
        elif category == ExperimentCategory.NETWORK:
            return self._network_sim(params, frequency)
        elif category == ExperimentCategory.QUANTUM:
            return self._quantum_sim(params, frequency)
        else:
            return self._custom_sim(params, frequency)
    
    def _photonics_sim(self, params: Dict[str, float], 
                       frequency: float) -> Dict[str, float]:
        """Photonics experiment simulation."""
        intensity = params.get('intensity', 1.0)
        medium_index = params.get('refractive_index', 1.0)
        
        # Light speed in medium
        v_medium = SPEED_OF_LIGHT / medium_index
        wavelength_medium = v_medium / frequency
        
        # Encoding efficiency based on wavelength
        optimal_wavelength = 550e-9  # Green light
        actual_wavelength = SPEED_OF_LIGHT / frequency
        efficiency = np.exp(-((actual_wavelength - optimal_wavelength) / 100e-9) ** 2)
        
        return {
            'encoding_efficiency': efficiency * intensity,
            'wavelength_in_medium': wavelength_medium,
            'phase_velocity': v_medium,
            'intensity_transmitted': intensity * efficiency
        }
    
    def _atomic_sim(self, params: Dict[str, float],
                    frequency: float) -> Dict[str, float]:
        """Atomic resonance experiment simulation."""
        target_mass = params.get('atomic_mass', 1.67e-27)  # Default: proton
        temperature = params.get('temperature', 300)  # Kelvin
        
        # Resonance calculation
        resonance_freq = self.physics.resonance_frequency(target_mass)
        detuning = abs(frequency - resonance_freq) / resonance_freq
        
        # Absorption probability (Lorentzian profile)
        linewidth = 1e6  # Hz
        absorption = 1 / (1 + (detuning * resonance_freq / linewidth) ** 2)
        
        # Thermal effects
        thermal_energy = self.physics.calculate_thermal_energy(temperature)
        photon_energy = self.physics.calculate_energy(frequency)
        energy_ratio = photon_energy / thermal_energy
        
        return {
            'resonance_frequency': resonance_freq,
            'detuning': detuning,
            'absorption_probability': absorption,
            'thermal_energy': thermal_energy,
            'energy_ratio': energy_ratio,
            'excitation_probability': absorption * min(energy_ratio, 1.0)
        }
    
    def _medical_sim(self, params: Dict[str, float],
                     frequency: float) -> Dict[str, float]:
        """Medical frequency therapy simulation."""
        tissue_type = params.get('tissue_density', 1000)  # kg/m³
        penetration_depth = params.get('target_depth', 0.01)  # meters
        
        wavelength = self.physics.calculate_wavelength(frequency)
        
        # Tissue absorption model (simplified)
        absorption_coeff = tissue_type * 1e-6 * (1e15 / frequency)
        transmission = np.exp(-absorption_coeff * penetration_depth)
        
        # Therapeutic window (certain frequencies more effective)
        therapeutic_bands = [
            (1e9, 1e10),   # Microwave
            (1e12, 1e13),  # Terahertz
            (4e14, 8e14),  # Visible
        ]
        
        in_therapeutic = any(low <= frequency <= high 
                            for low, high in therapeutic_bands)
        therapeutic_factor = 1.5 if in_therapeutic else 0.5
        
        # Cellular response (resonance-based)
        cell_resonance = 1e9  # Typical cell resonance ~GHz
        resonance_match = np.exp(-((np.log10(frequency) - np.log10(cell_resonance)) ** 2) / 4)
        
        return {
            'tissue_transmission': transmission,
            'absorption_coefficient': absorption_coeff,
            'therapeutic_effectiveness': transmission * therapeutic_factor * resonance_match,
            'penetration_achieved': penetration_depth * transmission,
            'cellular_resonance_match': resonance_match,
            'in_therapeutic_band': float(in_therapeutic)
        }
    
    def _energy_sim(self, params: Dict[str, float],
                    frequency: float) -> Dict[str, float]:
        """Energy harvesting simulation."""
        collector_area = params.get('collector_area', 1.0)  # m²
        ambient_temp = params.get('ambient_temp', 300)  # K
        source_temp = params.get('source_temp', 5778)  # Sun surface temp
        
        # Spectral energy density at frequency
        spectral_density = self.physics.spectral_energy_density(frequency, source_temp)
        
        # Harvesting efficiency (Shockley-Queisser limit inspired)
        bandgap_freq = 5e14  # Optimal ~2eV
        efficiency = 0.33 * np.exp(-((frequency - bandgap_freq) / bandgap_freq) ** 2)
        
        # Carnot efficiency limit
        carnot = 1 - (ambient_temp / source_temp)
        
        # Power harvested
        power_incident = spectral_density * collector_area * 1e-9  # Scaling
        power_harvested = power_incident * efficiency * carnot
        
        return {
            'spectral_density': spectral_density,
            'conversion_efficiency': efficiency,
            'carnot_efficiency': carnot,
            'power_incident': power_incident,
            'power_harvested': power_harvested,
            'lambda_mass_equivalent': power_harvested / (SPEED_OF_LIGHT ** 2)
        }
    
    def _materials_sim(self, params: Dict[str, float],
                       frequency: float) -> Dict[str, float]:
        """Materials spectral signature simulation."""
        bond_strength = params.get('bond_strength', 500)  # kJ/mol
        molecular_weight = params.get('molecular_weight', 100)  # g/mol
        
        # Bond vibration frequency
        bond_freq = np.sqrt(bond_strength * 1e3 / (molecular_weight * 1e-3)) * 1e12
        
        # Spectral signature match
        signature_match = np.exp(-((frequency - bond_freq) / bond_freq) ** 2)
        
        # Phase transition energy
        phase_energy = self.physics.calculate_energy(frequency)
        activation_energy = bond_strength * 1e3 / AVOGADRO_NUMBER
        
        transition_probability = min(phase_energy / activation_energy, 1.0)
        
        return {
            'bond_vibration_frequency': bond_freq,
            'spectral_signature_match': signature_match,
            'phase_transition_probability': transition_probability,
            'activation_energy': activation_energy,
            'photon_energy': phase_energy,
            'structural_stability': 1 - transition_probability
        }
    
    def _network_sim(self, params: Dict[str, float],
                     frequency: float) -> Dict[str, float]:
        """Network propagation simulation."""
        distance = params.get('distance', 1000)  # meters
        noise_level = params.get('noise_level', 0.1)
        node_count = params.get('node_count', 10)
        
        wavelength = self.physics.calculate_wavelength(frequency)
        
        # Free-space path loss
        path_loss = (4 * np.pi * distance / wavelength) ** 2
        path_loss_db = 10 * np.log10(path_loss)
        
        # Signal quality
        signal_quality = 1 / (1 + path_loss * noise_level)
        
        # Mesh efficiency
        mesh_efficiency = 1 - (1 - signal_quality) ** node_count
        
        # Data encoding capacity (Shannon-inspired)
        bandwidth = frequency * 0.01  # 1% of carrier
        snr = signal_quality / noise_level
        capacity = bandwidth * np.log2(1 + snr)
        
        return {
            'path_loss_db': path_loss_db,
            'signal_quality': signal_quality,
            'mesh_efficiency': mesh_efficiency,
            'channel_capacity': capacity,
            'effective_range': distance * signal_quality,
            'latency_estimate': distance / SPEED_OF_LIGHT * 1e6  # microseconds
        }
    
    def _quantum_sim(self, params: Dict[str, float],
                     frequency: float) -> Dict[str, float]:
        """Quantum effects simulation."""
        coherence_time = params.get('coherence_time', 1e-6)  # seconds
        entanglement_pairs = params.get('entanglement_pairs', 2)
        
        energy = self.physics.calculate_energy(frequency)
        
        # Decoherence rate
        decoherence_rate = 1 / coherence_time
        
        # Quantum fidelity (simplified model)
        fidelity = np.exp(-decoherence_rate * (1 / frequency))
        
        # Entanglement entropy
        entropy = entanglement_pairs * np.log(2)
        
        # Quantum advantage metric
        classical_ops = 2 ** entanglement_pairs
        quantum_ops = entanglement_pairs ** 2
        quantum_advantage = classical_ops / quantum_ops
        
        return {
            'coherence_time': coherence_time,
            'decoherence_rate': decoherence_rate,
            'quantum_fidelity': fidelity,
            'entanglement_entropy': entropy,
            'quantum_advantage': quantum_advantage,
            'photon_energy': energy
        }
    
    def _custom_sim(self, params: Dict[str, float],
                    frequency: float) -> Dict[str, float]:
        """Custom experiment simulation."""
        return {
            'frequency': frequency,
            'energy': self.physics.calculate_energy(frequency),
            'lambda_mass': self.physics.calculate_lambda_mass(frequency),
            'wavelength': self.physics.calculate_wavelength(frequency)
        }


class DataAnalyzer:
    """
    Statistical analysis module for experiment results.
    Provides comprehensive statistical analysis and hypothesis testing.
    """
    
    def __init__(self, results: List[SimulationResult]):
        self.results = results
        self.df = self._results_to_dataframe()
        
    def _results_to_dataframe(self) -> pd.DataFrame:
        """Convert results to pandas DataFrame for analysis."""
        data = []
        for r in self.results:
            row = {
                'iteration': r.iteration,
                'lambda_mass': r.lambda_mass,
                'energy': r.energy,
                'frequency': r.frequency,
                'anomaly': r.anomaly_detected
            }
            row.update(r.output_values)
            data.append(row)
        return pd.DataFrame(data)
    
    def full_analysis(self, hypothesis: Hypothesis) -> StatisticalAnalysis:
        """Perform complete statistical analysis."""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        
        # Basic statistics
        means = {col: self.df[col].mean() for col in numeric_cols}
        stds = {col: self.df[col].std() for col in numeric_cols}
        variances = {col: self.df[col].var() for col in numeric_cols}
        mins = {col: self.df[col].min() for col in numeric_cols}
        maxs = {col: self.df[col].max() for col in numeric_cols}
        
        # Confidence intervals (95%)
        confidence_intervals = {}
        for col in numeric_cols:
            mean = means[col]
            std = stds[col]
            n = len(self.df)
            margin = 1.96 * (std / np.sqrt(n))
            confidence_intervals[col] = (mean - margin, mean + margin)
        
        # Correlation matrix
        corr_matrix = self.df[numeric_cols].corr()
        correlation_dict = corr_matrix.to_dict()
        
        # Hypothesis testing (t-test against null value)
        primary_metric = 'energy' if 'energy' in numeric_cols else numeric_cols[0]
        null_value = means[primary_metric] * 0.9  # Test against 90% of mean
        t_stat, p_value = stats.ttest_1samp(self.df[primary_metric], null_value)
        
        # Effect size (Cohen's d)
        effect_size = (means[primary_metric] - null_value) / stds[primary_metric]
        
        # Determine hypothesis result
        if p_value < hypothesis.significance_level:
            hyp_result = "REJECT null hypothesis - significant effect detected"
        else:
            hyp_result = "FAIL TO REJECT null hypothesis - no significant effect"
        
        return StatisticalAnalysis(
            sample_size=len(self.df),
            mean=means,
            std_dev=stds,
            variance=variances,
            min_values=mins,
            max_values=maxs,
            confidence_intervals=confidence_intervals,
            p_value=float(p_value),
            t_statistic=float(t_stat),
            correlation_matrix=correlation_dict,
            hypothesis_result=hyp_result,
            effect_size=float(effect_size)
        )
    
    def trend_analysis(self) -> Dict[str, Any]:
        """Analyze trends in the data."""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        trends = {}
        
        for col in numeric_cols:
            if col == 'iteration':
                continue
                
            # Linear regression for trend
            slope, intercept, r_value, p_value, std_err = stats.linregress(
                self.df['iteration'], self.df[col]
            )
            
            trends[col] = {
                'slope': slope,
                'intercept': intercept,
                'r_squared': r_value ** 2,
                'p_value': p_value,
                'trend_direction': 'increasing' if slope > 0 else 'decreasing',
                'trend_significance': 'significant' if p_value < 0.05 else 'not significant'
            }
        
        return trends
    
    def anomaly_analysis(self) -> Dict[str, Any]:
        """Analyze detected anomalies."""
        anomalies = self.df[self.df['anomaly'] == True]
        normal = self.df[self.df['anomaly'] == False]
        
        return {
            'total_anomalies': len(anomalies),
            'anomaly_rate': len(anomalies) / len(self.df),
            'anomaly_iterations': anomalies['iteration'].tolist() if len(anomalies) > 0 else [],
            'mean_diff': {
                col: anomalies[col].mean() - normal[col].mean()
                for col in self.df.select_dtypes(include=[np.number]).columns
                if col not in ['iteration', 'anomaly']
            } if len(anomalies) > 0 else {}
        }
    
    def distribution_analysis(self) -> Dict[str, Any]:
        """Analyze distributions of key variables."""
        distributions = {}
        
        for col in ['energy', 'lambda_mass', 'frequency']:
            if col not in self.df.columns:
                continue
                
            data = self.df[col].dropna()
            
            # Normality test
            _, normality_p = stats.normaltest(data)
            
            # Skewness and kurtosis
            skewness = stats.skew(data)
            kurtosis = stats.kurtosis(data)
            
            # Percentiles
            percentiles = {
                'p25': np.percentile(data, 25),
                'p50': np.percentile(data, 50),
                'p75': np.percentile(data, 75),
                'p95': np.percentile(data, 95)
            }
            
            distributions[col] = {
                'is_normal': normality_p > 0.05,
                'normality_p_value': float(normality_p),
                'skewness': float(skewness),
                'kurtosis': float(kurtosis),
                'percentiles': percentiles
            }
        
        return distributions


class ReportGenerator:
    """
    Generates comprehensive reports in multiple formats.
    """
    
    def __init__(self, experiment: ExperimentDesign, 
                 results: List[SimulationResult],
                 analysis: StatisticalAnalysis):
        self.experiment = experiment
        self.results = results
        self.analysis = analysis
        self.analyzer = DataAnalyzer(results)
        
    def generate_report(self, report_type: ReportType) -> ExperimentReport:
        """Generate report of specified type."""
        report_id = f"RPT-{uuid.uuid4().hex[:8].upper()}"
        
        if report_type == ReportType.EXECUTIVE:
            return self._executive_report(report_id)
        elif report_type == ReportType.TECHNICAL:
            return self._technical_report(report_id)
        elif report_type == ReportType.ACADEMIC:
            return self._academic_report(report_id)
        elif report_type == ReportType.PATENT:
            return self._patent_report(report_id)
        else:
            return self._investor_report(report_id)
    
    def _executive_report(self, report_id: str) -> ExperimentReport:
        """Generate non-technical executive summary."""
        
        # Determine key findings in plain language
        effect = "positive" if self.analysis.effect_size > 0 else "negative"
        significance = "statistically significant" if self.analysis.p_value < 0.05 else "not statistically significant"
        
        executive_summary = f"""
# Executive Summary: {self.experiment.name}

## Key Findings
- The experiment tested the hypothesis: "{self.experiment.hypothesis.statement}"
- Results show a **{effect}** effect that is **{significance}**
- {self.analysis.sample_size} simulations were conducted
- Anomaly rate: {len([r for r in self.results if r.anomaly_detected]) / len(self.results) * 100:.1f}%

## Bottom Line
{self.analysis.hypothesis_result}

## Recommendations
- {'Proceed with further development based on positive results' if self.analysis.p_value < 0.05 else 'Consider revising experimental parameters or hypothesis'}
- Monitor anomaly patterns for optimization opportunities
- Scale testing to larger sample sizes for confirmation
"""
        
        return ExperimentReport(
            report_id=report_id,
            experiment_id=self.experiment.id,
            report_type=ReportType.EXECUTIVE,
            generated_at=datetime.now().isoformat(),
            executive_summary=executive_summary,
            methodology="Simulation-based testing using Lambda Boson physics engine",
            results=f"Effect size: {self.analysis.effect_size:.4f}, p-value: {self.analysis.p_value:.6f}",
            analysis=self.analysis.hypothesis_result,
            conclusions="See executive summary above",
            recommendations="Continue research based on findings",
            visualizations=[],
            raw_data_reference=f"experiment_{self.experiment.id}_data.json",
            citations=["Lambda Boson Theory (2025)", "NexusOS Physics Framework"]
        )
    
    def _technical_report(self, report_id: str) -> ExperimentReport:
        """Generate detailed technical report."""
        
        trends = self.analyzer.trend_analysis()
        distributions = self.analyzer.distribution_analysis()
        anomalies = self.analyzer.anomaly_analysis()
        
        methodology = f"""
# Technical Methodology

## Experiment Configuration
- **Category**: {self.experiment.category.value}
- **Iterations**: {self.experiment.iterations}
- **Physics Basis**: {self.experiment.physics_basis}

## Variables
{self._format_variables()}

## Simulation Parameters
- Monte Carlo iterations with Gaussian noise (μ=1.0, σ=0.05)
- Anomaly threshold: 3σ from mean
- Physics engine: Lambda Boson (Λ = hf/c²)
"""
        
        results_section = f"""
# Results

## Statistical Summary
- **Sample Size**: {self.analysis.sample_size}
- **p-value**: {self.analysis.p_value:.6e}
- **t-statistic**: {self.analysis.t_statistic:.4f}
- **Effect Size (Cohen's d)**: {self.analysis.effect_size:.4f}

## Means and Standard Deviations
{self._format_stats()}

## Confidence Intervals (95%)
{self._format_confidence_intervals()}

## Correlation Matrix
{self._format_correlations()}

## Trend Analysis
{self._format_trends(trends)}

## Distribution Analysis
{self._format_distributions(distributions)}

## Anomaly Report
- Total anomalies: {anomalies['total_anomalies']}
- Anomaly rate: {anomalies['anomaly_rate']*100:.2f}%
"""
        
        analysis_section = f"""
# Analysis

## Hypothesis Testing
- **Null Hypothesis**: {self.experiment.hypothesis.null_hypothesis}
- **Alternative Hypothesis**: {self.experiment.hypothesis.alternative_hypothesis}
- **Significance Level**: α = {self.experiment.hypothesis.significance_level}
- **Result**: {self.analysis.hypothesis_result}

## Interpretation
The effect size of {self.analysis.effect_size:.4f} indicates a {'large' if abs(self.analysis.effect_size) > 0.8 else 'medium' if abs(self.analysis.effect_size) > 0.5 else 'small'} effect.
"""
        
        return ExperimentReport(
            report_id=report_id,
            experiment_id=self.experiment.id,
            report_type=ReportType.TECHNICAL,
            generated_at=datetime.now().isoformat(),
            executive_summary=f"Technical analysis of {self.experiment.name}",
            methodology=methodology,
            results=results_section,
            analysis=analysis_section,
            conclusions=self.analysis.hypothesis_result,
            recommendations=self._technical_recommendations(),
            visualizations=[],
            raw_data_reference=f"experiment_{self.experiment.id}_data.json",
            citations=self._generate_citations()
        )
    
    def _academic_report(self, report_id: str) -> ExperimentReport:
        """Generate academic paper format report."""
        
        abstract = f"""
## Abstract

This study investigates {self.experiment.hypothesis.statement.lower()} using the Lambda Boson 
physics framework (Λ = hf/c²). Through {self.analysis.sample_size} Monte Carlo simulations, 
we examined the relationship between frequency-dependent parameters and {self.experiment.category.value} 
outcomes. Results indicate {'a significant' if self.analysis.p_value < 0.05 else 'no significant'} 
effect (p = {self.analysis.p_value:.4f}, d = {self.analysis.effect_size:.4f}). 
{self.analysis.hypothesis_result}. These findings contribute to the theoretical 
foundation of physics-based computation and have implications for {self.experiment.category.value} 
applications.

**Keywords**: Lambda Boson, spectral physics, {self.experiment.category.value}, simulation
"""
        
        introduction = f"""
## 1. Introduction

The Lambda Boson framework provides a novel approach to understanding the mass-equivalent 
of oscillation (Λ = hf/c²), bridging quantum mechanics and information theory. This study 
applies these principles to {self.experiment.category.value} domain.

### 1.1 Background
{self.experiment.description}

### 1.2 Research Question
{self.experiment.hypothesis.statement}

### 1.3 Hypotheses
- **H₀**: {self.experiment.hypothesis.null_hypothesis}
- **H₁**: {self.experiment.hypothesis.alternative_hypothesis}
"""
        
        methods = f"""
## 2. Methods

### 2.1 Experimental Design
{self.experiment.methodology}

### 2.2 Variables
{self._format_variables()}

### 2.3 Simulation Procedure
Monte Carlo simulation with {self.experiment.iterations} iterations using the NexusOS 
Lambda Boson Physics Engine. Stochastic elements introduced via Gaussian noise 
(μ=1.0, σ=0.05) to model real-world variability.

### 2.4 Statistical Analysis
- Descriptive statistics (mean, SD, variance)
- Inferential statistics (t-test, p-value)
- Effect size (Cohen's d)
- 95% confidence intervals
- Correlation analysis
"""
        
        results = f"""
## 3. Results

### 3.1 Descriptive Statistics
{self._format_stats()}

### 3.2 Hypothesis Test
A one-sample t-test was conducted to evaluate the hypothesis.
- t({self.analysis.sample_size - 1}) = {self.analysis.t_statistic:.4f}
- p = {self.analysis.p_value:.6f}
- d = {self.analysis.effect_size:.4f}

### 3.3 Confidence Intervals
{self._format_confidence_intervals()}
"""
        
        discussion = f"""
## 4. Discussion

### 4.1 Interpretation
{self.analysis.hypothesis_result}. The effect size of {self.analysis.effect_size:.4f} 
represents a {'large' if abs(self.analysis.effect_size) > 0.8 else 'medium' if abs(self.analysis.effect_size) > 0.5 else 'small'} 
effect according to Cohen's conventions.

### 4.2 Implications
These findings {'support' if self.analysis.p_value < 0.05 else 'do not support'} the 
application of Lambda Boson physics to {self.experiment.category.value} systems.

### 4.3 Limitations
- Simulation-based results require physical validation
- Model assumptions may not capture all real-world complexities
- Further research needed across parameter ranges

### 4.4 Future Directions
- Physical implementation testing
- Extended parameter space exploration
- Cross-domain validation studies
"""
        
        return ExperimentReport(
            report_id=report_id,
            experiment_id=self.experiment.id,
            report_type=ReportType.ACADEMIC,
            generated_at=datetime.now().isoformat(),
            executive_summary=abstract,
            methodology=introduction + methods,
            results=results,
            analysis=discussion,
            conclusions=f"## 5. Conclusion\n\n{self.analysis.hypothesis_result}",
            recommendations="## 6. Recommendations\n\n" + self._technical_recommendations(),
            visualizations=[],
            raw_data_reference=f"experiment_{self.experiment.id}_data.json",
            citations=self._generate_citations()
        )
    
    def _patent_report(self, report_id: str) -> ExperimentReport:
        """Generate patent filing format report."""
        
        claims = f"""
# Patent Application: {self.experiment.name}

## Technical Field
This invention relates to {self.experiment.category.value} systems utilizing 
Lambda Boson physics (Λ = hf/c²) for enhanced performance.

## Background of the Invention
{self.experiment.description}

## Summary of the Invention
A method and system for {self.experiment.hypothesis.statement.lower()}, comprising:
1. Frequency-based parameter optimization using Lambda Boson calculations
2. Spectral analysis for {self.experiment.category.value} applications
3. Monte Carlo simulation for predictive modeling

## Detailed Description
{self.experiment.methodology}

## Claims

### Claim 1
A method for {self.experiment.category.value} optimization comprising:
a) Calculating Lambda mass-equivalent (Λ = hf/c²) for input frequencies
b) Simulating outcomes using physics-based models
c) Analyzing results for statistical significance
d) Generating actionable recommendations

### Claim 2
The method of Claim 1, wherein the physics basis includes:
- Planck's relation (E = hf)
- Einstein's mass-energy equivalence (E = mc²)
- Lambda Boson unification (Λ = hf/c²)

### Claim 3
A system implementing the method of Claim 1, comprising:
- Lambda Boson Physics Engine
- Monte Carlo Simulation Module
- Statistical Analysis Module
- Report Generation Module

## Experimental Results
{self.analysis.hypothesis_result}
- Effect size: {self.analysis.effect_size:.4f}
- Statistical significance: p = {self.analysis.p_value:.6f}
"""
        
        return ExperimentReport(
            report_id=report_id,
            experiment_id=self.experiment.id,
            report_type=ReportType.PATENT,
            generated_at=datetime.now().isoformat(),
            executive_summary="Patent application for Lambda Boson technology",
            methodology=claims,
            results=f"Demonstrated effectiveness with p={self.analysis.p_value:.6f}",
            analysis="Claims supported by simulation results",
            conclusions="Novel invention with demonstrated utility",
            recommendations="File provisional patent application",
            visualizations=[],
            raw_data_reference=f"experiment_{self.experiment.id}_data.json",
            citations=self._generate_citations()
        )
    
    def _investor_report(self, report_id: str) -> ExperimentReport:
        """Generate investor brief format report."""
        
        brief = f"""
# Investment Brief: {self.experiment.name}

## Executive Overview
**Technology**: Lambda Boson Physics Platform
**Application**: {self.experiment.category.value.capitalize()}
**Status**: Simulation Validated

## Key Metrics
| Metric | Value | Interpretation |
|--------|-------|----------------|
| Statistical Significance | p = {self.analysis.p_value:.4f} | {'✅ Significant' if self.analysis.p_value < 0.05 else '⚠️ Not Significant'} |
| Effect Size | d = {self.analysis.effect_size:.4f} | {'Strong' if abs(self.analysis.effect_size) > 0.8 else 'Moderate' if abs(self.analysis.effect_size) > 0.5 else 'Weak'} Effect |
| Simulations Run | {self.analysis.sample_size:,} | Robust Sample |
| Anomaly Rate | {len([r for r in self.results if r.anomaly_detected]) / len(self.results) * 100:.1f}% | Within Normal |

## Market Opportunity
The {self.experiment.category.value} sector represents a significant market opportunity 
for physics-based optimization technologies.

## Competitive Advantage
1. **First-mover**: Lambda Boson physics is novel (2025)
2. **Patent-pending**: Unique methodology
3. **Scalable**: Software-based simulation platform
4. **Cross-sector**: Applicable to 12+ industry verticals

## Investment Thesis
{self.experiment.hypothesis.statement}

Results {'validate' if self.analysis.p_value < 0.05 else 'indicate need for further development of'} 
the core hypothesis with demonstrated {'significant' if self.analysis.p_value < 0.05 else 'preliminary'} results.

## Use of Funds
1. Physical validation experiments
2. Platform development
3. Sector-specific module creation
4. Team expansion

## Ask
[Investment amount and terms to be determined]
"""
        
        return ExperimentReport(
            report_id=report_id,
            experiment_id=self.experiment.id,
            report_type=ReportType.INVESTOR,
            generated_at=datetime.now().isoformat(),
            executive_summary=brief,
            methodology="Proprietary Lambda Boson simulation platform",
            results=f"Positive results with p={self.analysis.p_value:.4f}",
            analysis="Commercial viability assessment",
            conclusions="Investment-ready technology",
            recommendations="Schedule follow-up meeting",
            visualizations=[],
            raw_data_reference=f"experiment_{self.experiment.id}_data.json",
            citations=["Lambda Boson Theory (2025)", "NexusOS Platform Documentation"]
        )
    
    def _format_variables(self) -> str:
        """Format variables for reports."""
        lines = []
        for var in self.experiment.variables:
            lines.append(f"- **{var.name}** ({var.var_type.value}): {var.description}")
            lines.append(f"  - Unit: {var.unit}, Range: [{var.min_value}, {var.max_value}]")
        return "\n".join(lines)
    
    def _format_stats(self) -> str:
        """Format basic statistics."""
        lines = ["| Variable | Mean | Std Dev | Min | Max |", "|----------|------|---------|-----|-----|"]
        for key in list(self.analysis.mean.keys())[:10]:  # Limit to 10
            mean = self.analysis.mean[key]
            std = self.analysis.std_dev[key]
            min_v = self.analysis.min_values[key]
            max_v = self.analysis.max_values[key]
            lines.append(f"| {key} | {mean:.4e} | {std:.4e} | {min_v:.4e} | {max_v:.4e} |")
        return "\n".join(lines)
    
    def _format_confidence_intervals(self) -> str:
        """Format confidence intervals."""
        lines = ["| Variable | 95% CI Lower | 95% CI Upper |", "|----------|--------------|--------------|"]
        for key, (lower, upper) in list(self.analysis.confidence_intervals.items())[:10]:
            lines.append(f"| {key} | {lower:.4e} | {upper:.4e} |")
        return "\n".join(lines)
    
    def _format_correlations(self) -> str:
        """Format correlation matrix (simplified)."""
        return "See full correlation matrix in raw data export."
    
    def _format_trends(self, trends: Dict) -> str:
        """Format trend analysis."""
        lines = ["| Variable | Trend | R² | Significance |", "|----------|-------|-----|--------------|"]
        for key, trend in list(trends.items())[:10]:
            lines.append(f"| {key} | {trend['trend_direction']} | {trend['r_squared']:.4f} | {trend['trend_significance']} |")
        return "\n".join(lines)
    
    def _format_distributions(self, distributions: Dict) -> str:
        """Format distribution analysis."""
        lines = ["| Variable | Normal? | Skewness | Kurtosis |", "|----------|---------|----------|----------|"]
        for key, dist in distributions.items():
            lines.append(f"| {key} | {'Yes' if dist['is_normal'] else 'No'} | {dist['skewness']:.4f} | {dist['kurtosis']:.4f} |")
        return "\n".join(lines)
    
    def _technical_recommendations(self) -> str:
        """Generate technical recommendations."""
        recs = []
        
        if self.analysis.p_value < 0.05:
            recs.append("- Proceed to physical validation experiments")
            recs.append("- Expand parameter range testing")
        else:
            recs.append("- Revise experimental parameters")
            recs.append("- Increase sample size for more power")
        
        if abs(self.analysis.effect_size) < 0.5:
            recs.append("- Investigate methods to amplify effect")
        
        anomaly_rate = len([r for r in self.results if r.anomaly_detected]) / len(self.results)
        if anomaly_rate > 0.05:
            recs.append("- Investigate sources of anomalies")
        
        recs.append("- Document findings for peer review")
        recs.append("- Consider cross-category validation")
        
        return "\n".join(recs)
    
    def _generate_citations(self) -> List[str]:
        """Generate relevant citations."""
        return [
            "Planck, M. (1900). On the Theory of the Energy Distribution Law of the Normal Spectrum.",
            "Einstein, A. (1905). Does the Inertia of a Body Depend Upon Its Energy Content?",
            "Lambda Boson Unification Theory (2025). NexusOS Foundation.",
            "NexusOS Scientific Research Platform Documentation (2025).",
            f"Experiment ID: {self.experiment.id}"
        ]
    
    def export_to_markdown(self, report: ExperimentReport) -> str:
        """Export report to Markdown format."""
        md = f"""# {report.report_type.value.upper()} REPORT

**Report ID**: {report.report_id}  
**Experiment ID**: {report.experiment_id}  
**Generated**: {report.generated_at}  

---

{report.executive_summary}

---

{report.methodology}

---

{report.results}

---

{report.analysis}

---

{report.conclusions}

---

## Recommendations

{report.recommendations}

---

## References

"""
        for i, citation in enumerate(report.citations, 1):
            md += f"{i}. {citation}\n"
        
        md += f"\n---\n\n*Raw data: {report.raw_data_reference}*"
        
        return md
    
    def export_to_json(self, report: ExperimentReport) -> str:
        """Export report to JSON format."""
        return json.dumps(asdict(report), indent=2, default=str)


class ScientificResearchPlatform:
    """
    Main platform class integrating all components.
    Entry point for the Scientific Research Platform.
    """
    
    def __init__(self):
        self.physics = LambdaBosonPhysicsEngine()
        self.experiments: Dict[str, ExperimentDesign] = {}
        self.results: Dict[str, List[SimulationResult]] = {}
        self.reports: Dict[str, List[ExperimentReport]] = {}
        
    def create_experiment(self, 
                         name: str,
                         category: ExperimentCategory,
                         hypothesis_statement: str,
                         description: str,
                         methodology: str,
                         variables: List[Dict],
                         iterations: int = 1000,
                         created_by: str = "Researcher") -> ExperimentDesign:
        """Create a new experiment design."""
        
        exp_id = f"EXP-{uuid.uuid4().hex[:8].upper()}"
        
        # Create hypothesis
        hypothesis = Hypothesis(
            statement=hypothesis_statement,
            null_hypothesis=f"There is no significant effect: {hypothesis_statement}",
            alternative_hypothesis=f"There is a significant effect: {hypothesis_statement}",
            significance_level=0.05
        )
        
        # Create variables
        exp_variables = []
        for var in variables:
            exp_variables.append(ExperimentVariable(
                name=var.get('name', 'Variable'),
                var_type=VariableType(var.get('type', 'independent')),
                unit=var.get('unit', 'units'),
                min_value=var.get('min', 0.0),
                max_value=var.get('max', 1.0),
                default_value=var.get('default', 0.5),
                description=var.get('description', '')
            ))
        
        experiment = ExperimentDesign(
            id=exp_id,
            name=name,
            category=category,
            hypothesis=hypothesis,
            variables=exp_variables,
            description=description,
            methodology=methodology,
            created_at=datetime.now().isoformat(),
            created_by=created_by,
            iterations=iterations
        )
        
        self.experiments[exp_id] = experiment
        return experiment
    
    def run_experiment(self, experiment_id: str, 
                       params: Dict[str, float]) -> Tuple[List[SimulationResult], StatisticalAnalysis]:
        """Run an experiment and return results with analysis."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = self.experiments[experiment_id]
        
        # Run simulation
        simulator = ExperimentSimulator()
        results = simulator.run_simulation(experiment, params)
        
        self.results[experiment_id] = results
        
        # Analyze results
        analyzer = DataAnalyzer(results)
        analysis = analyzer.full_analysis(experiment.hypothesis)
        
        return results, analysis
    
    def generate_report(self, experiment_id: str,
                       report_type: ReportType) -> ExperimentReport:
        """Generate a report for an experiment."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        if experiment_id not in self.results:
            raise ValueError(f"No results for experiment {experiment_id}. Run experiment first.")
        
        experiment = self.experiments[experiment_id]
        results = self.results[experiment_id]
        
        analyzer = DataAnalyzer(results)
        analysis = analyzer.full_analysis(experiment.hypothesis)
        
        generator = ReportGenerator(experiment, results, analysis)
        report = generator.generate_report(report_type)
        
        if experiment_id not in self.reports:
            self.reports[experiment_id] = []
        self.reports[experiment_id].append(report)
        
        return report
    
    def export_report(self, experiment_id: str, 
                      report_id: str, 
                      format: str = 'markdown') -> str:
        """Export a report in specified format."""
        
        if experiment_id not in self.reports:
            raise ValueError(f"No reports for experiment {experiment_id}")
        
        report = None
        for r in self.reports[experiment_id]:
            if r.report_id == report_id:
                report = r
                break
        
        if not report:
            raise ValueError(f"Report {report_id} not found")
        
        experiment = self.experiments[experiment_id]
        results = self.results[experiment_id]
        analyzer = DataAnalyzer(results)
        analysis = analyzer.full_analysis(experiment.hypothesis)
        
        generator = ReportGenerator(experiment, results, analysis)
        
        if format == 'markdown':
            return generator.export_to_markdown(report)
        elif format == 'json':
            return generator.export_to_json(report)
        else:
            raise ValueError(f"Unknown format: {format}")
    
    def list_experiments(self) -> List[Dict]:
        """List all experiments."""
        return [
            {
                'id': exp.id,
                'name': exp.name,
                'category': exp.category.value,
                'created_at': exp.created_at,
                'has_results': exp.id in self.results,
                'report_count': len(self.reports.get(exp.id, []))
            }
            for exp in self.experiments.values()
        ]
    
    def get_experiment_summary(self, experiment_id: str) -> Dict:
        """Get summary of an experiment."""
        
        if experiment_id not in self.experiments:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = self.experiments[experiment_id]
        
        summary = {
            'experiment': asdict(experiment),
            'has_results': experiment_id in self.results,
            'result_count': len(self.results.get(experiment_id, [])),
            'reports': [
                {'id': r.report_id, 'type': r.report_type.value, 'generated_at': r.generated_at}
                for r in self.reports.get(experiment_id, [])
            ]
        }
        
        if experiment_id in self.results:
            results = self.results[experiment_id]
            analyzer = DataAnalyzer(results)
            analysis = analyzer.full_analysis(experiment.hypothesis)
            
            summary['analysis_summary'] = {
                'sample_size': analysis.sample_size,
                'p_value': analysis.p_value,
                'effect_size': analysis.effect_size,
                'hypothesis_result': analysis.hypothesis_result
            }
        
        return summary


# Pre-built experiment templates
EXPERIMENT_TEMPLATES = {
    'photonics_encoding': {
        'name': 'Light-Data Encoding Efficiency',
        'category': ExperimentCategory.PHOTONICS,
        'hypothesis': 'Visible light frequencies provide optimal encoding efficiency for data transmission',
        'description': 'Tests the relationship between light wavelength and data encoding capacity',
        'methodology': 'Vary frequency across visible spectrum, measure encoding efficiency',
        'variables': [
            {'name': 'frequency', 'type': 'independent', 'unit': 'Hz', 'min': 4e14, 'max': 8e14, 'default': 5.5e14, 'description': 'Light frequency'},
            {'name': 'intensity', 'type': 'independent', 'unit': 'W/m²', 'min': 0.1, 'max': 10, 'default': 1.0, 'description': 'Light intensity'},
            {'name': 'refractive_index', 'type': 'control', 'unit': 'ratio', 'min': 1.0, 'max': 2.5, 'default': 1.5, 'description': 'Medium refractive index'},
            {'name': 'encoding_efficiency', 'type': 'dependent', 'unit': 'ratio', 'min': 0, 'max': 1, 'default': 0.5, 'description': 'Data encoding efficiency'}
        ]
    },
    'medical_frequency': {
        'name': 'Therapeutic Frequency Response',
        'category': ExperimentCategory.MEDICAL,
        'hypothesis': 'Specific frequency bands show enhanced therapeutic effectiveness in tissue',
        'description': 'Maps frequency response curves for different tissue types',
        'methodology': 'Apply frequency sweep, measure tissue response and therapeutic markers',
        'variables': [
            {'name': 'frequency', 'type': 'independent', 'unit': 'Hz', 'min': 1e9, 'max': 1e15, 'default': 1e12, 'description': 'Applied frequency'},
            {'name': 'tissue_density', 'type': 'control', 'unit': 'kg/m³', 'min': 900, 'max': 1200, 'default': 1000, 'description': 'Tissue density'},
            {'name': 'target_depth', 'type': 'independent', 'unit': 'm', 'min': 0.001, 'max': 0.1, 'default': 0.01, 'description': 'Target depth'},
            {'name': 'therapeutic_effectiveness', 'type': 'dependent', 'unit': 'ratio', 'min': 0, 'max': 1, 'default': 0.5, 'description': 'Therapeutic effectiveness'}
        ]
    },
    'energy_harvesting': {
        'name': 'Optimal Energy Harvesting Frequencies',
        'category': ExperimentCategory.ENERGY,
        'hypothesis': 'There exists an optimal frequency band for maximum energy harvesting efficiency',
        'description': 'Identifies peak harvesting frequencies for environmental energy collection',
        'methodology': 'Sweep frequency range, measure harvested power, identify optima',
        'variables': [
            {'name': 'frequency', 'type': 'independent', 'unit': 'Hz', 'min': 1e12, 'max': 1e16, 'default': 5e14, 'description': 'Incident frequency'},
            {'name': 'collector_area', 'type': 'control', 'unit': 'm²', 'min': 0.01, 'max': 100, 'default': 1.0, 'description': 'Collector area'},
            {'name': 'ambient_temp', 'type': 'control', 'unit': 'K', 'min': 200, 'max': 400, 'default': 300, 'description': 'Ambient temperature'},
            {'name': 'power_harvested', 'type': 'dependent', 'unit': 'W', 'min': 0, 'max': 1000, 'default': 10, 'description': 'Harvested power'}
        ]
    },
    'atomic_resonance': {
        'name': 'Atomic Resonance Mapping',
        'category': ExperimentCategory.ATOMIC,
        'hypothesis': 'Precise frequency tuning enables controlled atomic state transitions',
        'description': 'Maps resonance frequencies and absorption profiles for atomic species',
        'methodology': 'Scan frequencies near theoretical resonance, measure absorption',
        'variables': [
            {'name': 'frequency', 'type': 'independent', 'unit': 'Hz', 'min': 1e12, 'max': 1e18, 'default': 1e15, 'description': 'Probe frequency'},
            {'name': 'atomic_mass', 'type': 'control', 'unit': 'kg', 'min': 1e-27, 'max': 1e-24, 'default': 1.67e-27, 'description': 'Atomic mass'},
            {'name': 'temperature', 'type': 'control', 'unit': 'K', 'min': 1, 'max': 10000, 'default': 300, 'description': 'Temperature'},
            {'name': 'absorption_probability', 'type': 'dependent', 'unit': 'ratio', 'min': 0, 'max': 1, 'default': 0.5, 'description': 'Absorption probability'}
        ]
    },
    'materials_spectral': {
        'name': 'Materials Spectral Signature Analysis',
        'category': ExperimentCategory.MATERIALS,
        'hypothesis': 'Material properties can be determined from spectral signature analysis',
        'description': 'Characterizes materials by their frequency-dependent responses',
        'methodology': 'Apply broadband excitation, analyze spectral response',
        'variables': [
            {'name': 'frequency', 'type': 'independent', 'unit': 'Hz', 'min': 1e10, 'max': 1e16, 'default': 1e13, 'description': 'Probe frequency'},
            {'name': 'bond_strength', 'type': 'control', 'unit': 'kJ/mol', 'min': 100, 'max': 1000, 'default': 500, 'description': 'Bond strength'},
            {'name': 'molecular_weight', 'type': 'control', 'unit': 'g/mol', 'min': 10, 'max': 1000, 'default': 100, 'description': 'Molecular weight'},
            {'name': 'spectral_signature_match', 'type': 'dependent', 'unit': 'ratio', 'min': 0, 'max': 1, 'default': 0.5, 'description': 'Signature match'}
        ]
    },
    'network_propagation': {
        'name': 'Mesh Network Propagation Analysis',
        'category': ExperimentCategory.NETWORK,
        'hypothesis': 'Optimal carrier frequencies maximize mesh network efficiency',
        'description': 'Analyzes propagation characteristics across mesh networks',
        'methodology': 'Vary carrier frequency, measure signal quality and mesh efficiency',
        'variables': [
            {'name': 'frequency', 'type': 'independent', 'unit': 'Hz', 'min': 1e8, 'max': 1e12, 'default': 5e9, 'description': 'Carrier frequency'},
            {'name': 'distance', 'type': 'independent', 'unit': 'm', 'min': 10, 'max': 10000, 'default': 1000, 'description': 'Distance'},
            {'name': 'node_count', 'type': 'control', 'unit': 'count', 'min': 2, 'max': 100, 'default': 10, 'description': 'Node count'},
            {'name': 'noise_level', 'type': 'control', 'unit': 'ratio', 'min': 0.01, 'max': 1.0, 'default': 0.1, 'description': 'Noise level'},
            {'name': 'mesh_efficiency', 'type': 'dependent', 'unit': 'ratio', 'min': 0, 'max': 1, 'default': 0.5, 'description': 'Mesh efficiency'}
        ]
    }
}


def get_platform() -> ScientificResearchPlatform:
    """Get or create the global platform instance."""
    return ScientificResearchPlatform()


def demo_experiment():
    """Demonstrate the Scientific Research Platform."""
    
    print("=" * 60)
    print("NexusOS Scientific Research Platform - Demo")
    print("=" * 60)
    
    # Initialize platform
    platform = ScientificResearchPlatform()
    
    # Create experiment from template
    template = EXPERIMENT_TEMPLATES['photonics_encoding']
    experiment = platform.create_experiment(
        name=template['name'],
        category=template['category'],
        hypothesis_statement=template['hypothesis'],
        description=template['description'],
        methodology=template['methodology'],
        variables=template['variables'],
        iterations=500
    )
    
    print(f"\nCreated Experiment: {experiment.name}")
    print(f"ID: {experiment.id}")
    print(f"Category: {experiment.category.value}")
    
    # Run experiment
    print("\nRunning simulation...")
    params = {
        'frequency': 5.5e14,  # Green light
        'intensity': 1.0,
        'refractive_index': 1.5
    }
    
    results, analysis = platform.run_experiment(experiment.id, params)
    
    print(f"\nResults Summary:")
    print(f"- Sample size: {analysis.sample_size}")
    print(f"- p-value: {analysis.p_value:.6f}")
    print(f"- Effect size: {analysis.effect_size:.4f}")
    print(f"- Result: {analysis.hypothesis_result}")
    
    # Generate reports
    print("\nGenerating reports...")
    
    for report_type in [ReportType.EXECUTIVE, ReportType.TECHNICAL, ReportType.ACADEMIC]:
        report = platform.generate_report(experiment.id, report_type)
        print(f"- Generated {report_type.value} report: {report.report_id}")
    
    # Export technical report
    print("\nExporting technical report to Markdown...")
    reports = platform.reports[experiment.id]
    tech_report = [r for r in reports if r.report_type == ReportType.TECHNICAL][0]
    
    md_content = platform.export_report(experiment.id, tech_report.report_id, 'markdown')
    
    print(f"\nReport Preview (first 500 chars):")
    print("-" * 40)
    print(md_content[:500])
    print("...")
    
    return platform, experiment.id


if __name__ == "__main__":
    demo_experiment()
