"""
WIP Analysis Module - Statistical Analysis for Wavelength Information Physics
==============================================================================

A comprehensive statistical analysis toolkit for Lambda Boson experiments.
Provides correlations, confidence intervals, hypothesis testing, and more.

Core Physics: Λ = hf/c² (Lambda Boson - mass-equivalent of oscillation)

Author: NexusOS / WNSP Protocol
License: GNU GPLv3
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import json


# =============================================================================
# PHYSICAL CONSTANTS
# =============================================================================

PLANCK_CONSTANT = 6.62607015e-34  # J·s (exact, SI 2019)
SPEED_OF_LIGHT = 299792458  # m/s (exact)
BOLTZMANN_CONSTANT = 1.380649e-23  # J/K (exact)


# =============================================================================
# DATA STRUCTURES
# =============================================================================

class ConfidenceLevel(Enum):
    """Standard confidence levels for statistical analysis."""
    CL_90 = (0.90, 1.645, "90%")
    CL_95 = (0.95, 1.960, "95%")
    CL_99 = (0.99, 2.576, "99%")
    CL_999 = (0.999, 3.291, "99.9%")
    
    def __init__(self, level: float, z_score: float, label: str):
        self.level = level
        self.z_score = z_score
        self.label = label


@dataclass
class DescriptiveStats:
    """Descriptive statistics for a variable."""
    variable: str
    count: int
    mean: float
    std_dev: float
    variance: float
    min_value: float
    max_value: float
    median: float
    q25: float
    q75: float
    iqr: float
    skewness: float
    kurtosis: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ConfidenceInterval:
    """Confidence interval for a statistic."""
    variable: str
    statistic: str
    point_estimate: float
    lower_bound: float
    upper_bound: float
    confidence_level: str
    margin_of_error: float
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def __str__(self) -> str:
        return f"{self.variable}: {self.point_estimate:.4f} [{self.lower_bound:.4f}, {self.upper_bound:.4f}] ({self.confidence_level})"


@dataclass
class CorrelationResult:
    """Result of correlation analysis between two variables."""
    var1: str
    var2: str
    pearson_r: float
    pearson_p_value: float
    spearman_rho: float
    spearman_p_value: float
    interpretation: str
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class HypothesisTestResult:
    """Result of a hypothesis test."""
    test_name: str
    null_hypothesis: str
    alternative_hypothesis: str
    test_statistic: float
    p_value: float
    degrees_of_freedom: Optional[float]
    significance_level: float
    reject_null: bool
    conclusion: str
    effect_size: Optional[float]
    effect_interpretation: Optional[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class RegressionResult:
    """Result of linear regression analysis."""
    independent_var: str
    dependent_var: str
    slope: float
    intercept: float
    r_squared: float
    adjusted_r_squared: float
    std_error: float
    p_value: float
    confidence_interval_slope: Tuple[float, float]
    trend_direction: str
    is_significant: bool
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['confidence_interval_slope'] = list(self.confidence_interval_slope)
        return result


# =============================================================================
# MAIN ANALYSIS CLASS
# =============================================================================

class WIPAnalysisModule:
    """
    Statistical Analysis Module for Wavelength Information Physics (WIP)
    
    Provides comprehensive statistical analysis including:
    - Descriptive statistics
    - Confidence intervals (90%, 95%, 99%, 99.9%)
    - Correlation analysis (Pearson and Spearman)
    - Hypothesis testing (t-tests, ANOVA, chi-square)
    - Regression analysis
    - Distribution analysis
    - Lambda Boson specific calculations
    
    Example:
        analyzer = WIPAnalysisModule(data)
        stats = analyzer.descriptive_stats('energy')
        ci = analyzer.confidence_interval('lambda_mass')
        corr = analyzer.correlation('frequency', 'energy')
    """
    
    def __init__(self, data: pd.DataFrame):
        """
        Initialize the analysis module with data.
        
        Args:
            data: pandas DataFrame with experimental data
        """
        self.data = data
        self.n = len(data)
        self._validate_data()
    
    def _validate_data(self):
        """Validate input data."""
        if self.data.empty:
            raise ValueError("Data cannot be empty")
        if self.n < 2:
            raise ValueError("Need at least 2 observations for analysis")
    
    # =========================================================================
    # DESCRIPTIVE STATISTICS
    # =========================================================================
    
    def descriptive_stats(self, variable: str) -> DescriptiveStats:
        """
        Calculate comprehensive descriptive statistics for a variable.
        
        Args:
            variable: Column name in the data
            
        Returns:
            DescriptiveStats with all measures
            
        Example:
            stats = analyzer.descriptive_stats('energy')
            print(f"Mean: {stats.mean}, Std: {stats.std_dev}")
        """
        if variable not in self.data.columns:
            raise ValueError(f"Variable '{variable}' not found in data")
        
        col = self.data[variable].dropna()
        
        return DescriptiveStats(
            variable=variable,
            count=len(col),
            mean=float(col.mean()),
            std_dev=float(col.std()),
            variance=float(col.var()),
            min_value=float(col.min()),
            max_value=float(col.max()),
            median=float(col.median()),
            q25=float(col.quantile(0.25)),
            q75=float(col.quantile(0.75)),
            iqr=float(col.quantile(0.75) - col.quantile(0.25)),
            skewness=float(stats.skew(col)),
            kurtosis=float(stats.kurtosis(col))
        )
    
    def all_descriptive_stats(self) -> Dict[str, DescriptiveStats]:
        """Get descriptive statistics for all numeric columns."""
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        return {col: self.descriptive_stats(col) for col in numeric_cols}
    
    # =========================================================================
    # CONFIDENCE INTERVALS
    # =========================================================================
    
    def confidence_interval(
        self, 
        variable: str,
        confidence: ConfidenceLevel = ConfidenceLevel.CL_95
    ) -> ConfidenceInterval:
        """
        Calculate confidence interval for the mean of a variable.
        
        Args:
            variable: Column name
            confidence: Confidence level (90%, 95%, 99%, 99.9%)
            
        Returns:
            ConfidenceInterval with bounds and margin of error
            
        Example:
            ci = analyzer.confidence_interval('lambda_mass', ConfidenceLevel.CL_99)
            print(f"99% CI: [{ci.lower_bound}, {ci.upper_bound}]")
        """
        if variable not in self.data.columns:
            raise ValueError(f"Variable '{variable}' not found")
        
        col = self.data[variable].dropna()
        n = len(col)
        mean = col.mean()
        std = col.std()
        
        # Use t-distribution for small samples, z for large
        if n < 30:
            t_crit = stats.t.ppf((1 + confidence.level) / 2, df=n-1)
            margin = t_crit * (std / np.sqrt(n))
        else:
            margin = confidence.z_score * (std / np.sqrt(n))
        
        return ConfidenceInterval(
            variable=variable,
            statistic="mean",
            point_estimate=float(mean),
            lower_bound=float(mean - margin),
            upper_bound=float(mean + margin),
            confidence_level=confidence.label,
            margin_of_error=float(margin)
        )
    
    def all_confidence_intervals(
        self,
        confidence: ConfidenceLevel = ConfidenceLevel.CL_95
    ) -> Dict[str, ConfidenceInterval]:
        """Get confidence intervals for all numeric columns."""
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        return {col: self.confidence_interval(col, confidence) for col in numeric_cols}
    
    def bootstrap_confidence_interval(
        self,
        variable: str,
        statistic: str = 'mean',
        n_bootstrap: int = 10000,
        confidence: float = 0.95
    ) -> ConfidenceInterval:
        """
        Calculate bootstrap confidence interval for any statistic.
        
        Args:
            variable: Column name
            statistic: 'mean', 'median', 'std', or custom function
            n_bootstrap: Number of bootstrap samples
            confidence: Confidence level (0-1)
            
        Returns:
            ConfidenceInterval from bootstrap distribution
        """
        col = self.data[variable].dropna().values
        
        stat_funcs = {
            'mean': np.mean,
            'median': np.median,
            'std': np.std
        }
        stat_func = stat_funcs.get(statistic, np.mean)
        
        bootstrap_stats = []
        for _ in range(n_bootstrap):
            sample = np.random.choice(col, size=len(col), replace=True)
            bootstrap_stats.append(stat_func(sample))
        
        alpha = (1 - confidence) / 2
        lower = np.percentile(bootstrap_stats, alpha * 100)
        upper = np.percentile(bootstrap_stats, (1 - alpha) * 100)
        point_est = stat_func(col)
        
        return ConfidenceInterval(
            variable=variable,
            statistic=statistic,
            point_estimate=float(point_est),
            lower_bound=float(lower),
            upper_bound=float(upper),
            confidence_level=f"{confidence*100:.0f}% (bootstrap)",
            margin_of_error=float((upper - lower) / 2)
        )
    
    # =========================================================================
    # CORRELATION ANALYSIS
    # =========================================================================
    
    def correlation(self, var1: str, var2: str) -> CorrelationResult:
        """
        Calculate correlation between two variables.
        
        Computes both Pearson (linear) and Spearman (monotonic) correlations.
        
        Args:
            var1: First variable name
            var2: Second variable name
            
        Returns:
            CorrelationResult with coefficients, p-values, and interpretation
            
        Example:
            corr = analyzer.correlation('frequency', 'energy')
            print(f"Pearson r = {corr.pearson_r}, p = {corr.pearson_p_value}")
        """
        if var1 not in self.data.columns or var2 not in self.data.columns:
            raise ValueError("Both variables must exist in data")
        
        # Get clean paired data
        clean_data = self.data[[var1, var2]].dropna()
        x = clean_data[var1]
        y = clean_data[var2]
        
        # Pearson correlation (linear relationship)
        pearson_r, pearson_p = stats.pearsonr(x, y)
        
        # Spearman correlation (monotonic relationship)
        spearman_rho, spearman_p = stats.spearmanr(x, y)
        
        # Interpretation
        r = abs(pearson_r)
        if r < 0.1:
            strength = "negligible"
        elif r < 0.3:
            strength = "weak"
        elif r < 0.5:
            strength = "moderate"
        elif r < 0.7:
            strength = "strong"
        else:
            strength = "very strong"
        
        direction = "positive" if pearson_r > 0 else "negative"
        sig = "significant" if pearson_p < 0.05 else "not significant"
        
        interpretation = f"{strength.capitalize()} {direction} correlation ({sig} at α=0.05)"
        
        return CorrelationResult(
            var1=var1,
            var2=var2,
            pearson_r=float(pearson_r),
            pearson_p_value=float(pearson_p),
            spearman_rho=float(spearman_rho),
            spearman_p_value=float(spearman_p),
            interpretation=interpretation
        )
    
    def correlation_matrix(self) -> pd.DataFrame:
        """
        Calculate correlation matrix for all numeric variables.
        
        Returns:
            DataFrame with Pearson correlations
        """
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        return self.data[numeric_cols].corr()
    
    def correlation_matrix_with_pvalues(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Calculate correlation matrix with p-values.
        
        Returns:
            Tuple of (correlation_matrix, p_value_matrix)
        """
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        n_vars = len(numeric_cols)
        
        corr_matrix = np.zeros((n_vars, n_vars))
        p_matrix = np.zeros((n_vars, n_vars))
        
        for i, col1 in enumerate(numeric_cols):
            for j, col2 in enumerate(numeric_cols):
                if i == j:
                    corr_matrix[i, j] = 1.0
                    p_matrix[i, j] = 0.0
                else:
                    clean = self.data[[col1, col2]].dropna()
                    r, p = stats.pearsonr(clean[col1], clean[col2])
                    corr_matrix[i, j] = r
                    p_matrix[i, j] = p
        
        return (
            pd.DataFrame(corr_matrix, index=numeric_cols, columns=numeric_cols),
            pd.DataFrame(p_matrix, index=numeric_cols, columns=numeric_cols)
        )
    
    # =========================================================================
    # HYPOTHESIS TESTING
    # =========================================================================
    
    def one_sample_ttest(
        self,
        variable: str,
        population_mean: float,
        alpha: float = 0.05,
        alternative: str = 'two-sided'
    ) -> HypothesisTestResult:
        """
        One-sample t-test: Compare sample mean to known population mean.
        
        Args:
            variable: Column name
            population_mean: Hypothesized population mean
            alpha: Significance level
            alternative: 'two-sided', 'less', or 'greater'
            
        Returns:
            HypothesisTestResult with test statistics and conclusion
        """
        col = self.data[variable].dropna()
        t_stat, p_value = stats.ttest_1samp(col, population_mean)
        
        # Adjust p-value for one-sided tests
        if alternative == 'less':
            p_value = p_value / 2 if t_stat < 0 else 1 - p_value / 2
        elif alternative == 'greater':
            p_value = p_value / 2 if t_stat > 0 else 1 - p_value / 2
        
        # Cohen's d effect size
        effect_size = (col.mean() - population_mean) / col.std()
        
        if abs(effect_size) < 0.2:
            effect_interp = "small"
        elif abs(effect_size) < 0.8:
            effect_interp = "medium"
        else:
            effect_interp = "large"
        
        reject = p_value < alpha
        
        return HypothesisTestResult(
            test_name="One-Sample t-Test",
            null_hypothesis=f"μ = {population_mean}",
            alternative_hypothesis=f"μ ≠ {population_mean}" if alternative == 'two-sided' else f"μ {'<' if alternative == 'less' else '>'} {population_mean}",
            test_statistic=float(t_stat),
            p_value=float(p_value),
            degrees_of_freedom=float(len(col) - 1),
            significance_level=alpha,
            reject_null=reject,
            conclusion=f"{'Reject' if reject else 'Fail to reject'} null hypothesis at α={alpha}",
            effect_size=float(effect_size),
            effect_interpretation=effect_interp
        )
    
    def two_sample_ttest(
        self,
        var1: str,
        var2: str,
        alpha: float = 0.05,
        equal_variance: bool = True
    ) -> HypothesisTestResult:
        """
        Two-sample t-test: Compare means of two variables.
        
        Args:
            var1, var2: Column names
            alpha: Significance level
            equal_variance: Assume equal variances (if False, uses Welch's t-test)
            
        Returns:
            HypothesisTestResult
        """
        x = self.data[var1].dropna()
        y = self.data[var2].dropna()
        
        t_stat, p_value = stats.ttest_ind(x, y, equal_var=equal_variance)
        
        # Pooled standard deviation for effect size
        pooled_std = np.sqrt(((len(x)-1)*x.std()**2 + (len(y)-1)*y.std()**2) / (len(x)+len(y)-2))
        effect_size = (x.mean() - y.mean()) / pooled_std
        
        if abs(effect_size) < 0.2:
            effect_interp = "small"
        elif abs(effect_size) < 0.8:
            effect_interp = "medium"
        else:
            effect_interp = "large"
        
        reject = p_value < alpha
        test_type = "Independent t-Test" if equal_variance else "Welch's t-Test"
        
        return HypothesisTestResult(
            test_name=test_type,
            null_hypothesis=f"μ({var1}) = μ({var2})",
            alternative_hypothesis=f"μ({var1}) ≠ μ({var2})",
            test_statistic=float(t_stat),
            p_value=float(p_value),
            degrees_of_freedom=float(len(x) + len(y) - 2),
            significance_level=alpha,
            reject_null=reject,
            conclusion=f"{'Reject' if reject else 'Fail to reject'} null hypothesis at α={alpha}",
            effect_size=float(effect_size),
            effect_interpretation=effect_interp
        )
    
    def anova(
        self,
        groups: List[str],
        alpha: float = 0.05
    ) -> HypothesisTestResult:
        """
        One-way ANOVA: Compare means across multiple groups.
        
        Args:
            groups: List of column names to compare
            alpha: Significance level
            
        Returns:
            HypothesisTestResult
        """
        group_data = [self.data[g].dropna() for g in groups]
        f_stat, p_value = stats.f_oneway(*group_data)
        
        # Effect size (eta-squared)
        all_data = np.concatenate(group_data)
        grand_mean = all_data.mean()
        ss_between = sum(len(g) * (g.mean() - grand_mean)**2 for g in group_data)
        ss_total = sum((all_data - grand_mean)**2)
        eta_squared = ss_between / ss_total if ss_total > 0 else 0
        
        if eta_squared < 0.01:
            effect_interp = "small"
        elif eta_squared < 0.06:
            effect_interp = "medium"
        else:
            effect_interp = "large"
        
        reject = p_value < alpha
        
        return HypothesisTestResult(
            test_name="One-Way ANOVA",
            null_hypothesis="All group means are equal",
            alternative_hypothesis="At least one group mean differs",
            test_statistic=float(f_stat),
            p_value=float(p_value),
            degrees_of_freedom=float(len(groups) - 1),
            significance_level=alpha,
            reject_null=reject,
            conclusion=f"{'Reject' if reject else 'Fail to reject'} null hypothesis at α={alpha}",
            effect_size=float(eta_squared),
            effect_interpretation=f"{effect_interp} (η² = {eta_squared:.4f})"
        )
    
    # =========================================================================
    # REGRESSION ANALYSIS
    # =========================================================================
    
    def linear_regression(
        self,
        independent: str,
        dependent: str,
        confidence: float = 0.95
    ) -> RegressionResult:
        """
        Simple linear regression: y = mx + b
        
        Args:
            independent: X variable (predictor)
            dependent: Y variable (outcome)
            confidence: Confidence level for slope CI
            
        Returns:
            RegressionResult with coefficients and diagnostics
        """
        clean = self.data[[independent, dependent]].dropna()
        x = clean[independent]
        y = clean[dependent]
        
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        
        r_squared = r_value ** 2
        n = len(x)
        adjusted_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - 2)
        
        # Confidence interval for slope
        t_crit = stats.t.ppf((1 + confidence) / 2, df=n-2)
        ci_lower = slope - t_crit * std_err
        ci_upper = slope + t_crit * std_err
        
        return RegressionResult(
            independent_var=independent,
            dependent_var=dependent,
            slope=float(slope),
            intercept=float(intercept),
            r_squared=float(r_squared),
            adjusted_r_squared=float(adjusted_r_squared),
            std_error=float(std_err),
            p_value=float(p_value),
            confidence_interval_slope=(float(ci_lower), float(ci_upper)),
            trend_direction="increasing" if slope > 0 else "decreasing",
            is_significant=p_value < 0.05
        )
    
    # =========================================================================
    # DISTRIBUTION ANALYSIS
    # =========================================================================
    
    def normality_test(self, variable: str) -> Dict[str, Any]:
        """
        Test if a variable follows a normal distribution.
        
        Uses Shapiro-Wilk test (n<5000) or D'Agostino-Pearson test.
        
        Returns:
            Dict with test results and interpretation
        """
        col = self.data[variable].dropna()
        
        # Shapiro-Wilk for smaller samples
        if len(col) < 5000:
            stat, p_value = stats.shapiro(col)
            test_name = "Shapiro-Wilk"
        else:
            stat, p_value = stats.normaltest(col)
            test_name = "D'Agostino-Pearson"
        
        is_normal = p_value > 0.05
        
        return {
            "variable": variable,
            "test": test_name,
            "statistic": float(stat),
            "p_value": float(p_value),
            "is_normal": is_normal,
            "interpretation": f"Data {'appears' if is_normal else 'does not appear'} to be normally distributed (α=0.05)"
        }
    
    def distribution_summary(self, variable: str) -> Dict[str, Any]:
        """
        Complete distribution analysis for a variable.
        
        Returns:
            Dict with normality, skewness, kurtosis, and percentiles
        """
        col = self.data[variable].dropna()
        
        normality = self.normality_test(variable)
        
        return {
            "variable": variable,
            "normality": normality,
            "skewness": float(stats.skew(col)),
            "kurtosis": float(stats.kurtosis(col)),
            "percentiles": {
                "p1": float(np.percentile(col, 1)),
                "p5": float(np.percentile(col, 5)),
                "p10": float(np.percentile(col, 10)),
                "p25": float(np.percentile(col, 25)),
                "p50": float(np.percentile(col, 50)),
                "p75": float(np.percentile(col, 75)),
                "p90": float(np.percentile(col, 90)),
                "p95": float(np.percentile(col, 95)),
                "p99": float(np.percentile(col, 99))
            }
        }
    
    # =========================================================================
    # LAMBDA BOSON SPECIFIC ANALYSIS
    # =========================================================================
    
    def lambda_energy_analysis(
        self,
        frequency_col: str = 'frequency',
        energy_col: str = 'energy'
    ) -> Dict[str, Any]:
        """
        Analyze the E = hf relationship in experimental data.
        
        Tests whether observed energy follows Planck's relation.
        
        Returns:
            Analysis of energy-frequency relationship with deviations
        """
        if frequency_col not in self.data.columns:
            raise ValueError(f"Frequency column '{frequency_col}' not found")
        
        clean = self.data[[frequency_col]].dropna()
        frequencies = clean[frequency_col]
        
        # Calculate expected energy from E = hf
        expected_energy = PLANCK_CONSTANT * frequencies
        
        # If we have observed energy, compare
        if energy_col in self.data.columns:
            observed = self.data[energy_col].dropna()
            if len(observed) == len(expected_energy):
                deviation = observed - expected_energy
                return {
                    "relationship": "E = hf",
                    "planck_constant_used": PLANCK_CONSTANT,
                    "sample_size": len(frequencies),
                    "mean_expected_energy": float(expected_energy.mean()),
                    "mean_observed_energy": float(observed.mean()),
                    "mean_deviation": float(deviation.mean()),
                    "std_deviation": float(deviation.std()),
                    "max_deviation": float(deviation.abs().max()),
                    "correlation": float(np.corrcoef(observed, expected_energy)[0, 1])
                }
        
        # Just return expected energy stats
        return {
            "relationship": "E = hf",
            "planck_constant_used": PLANCK_CONSTANT,
            "sample_size": len(frequencies),
            "mean_frequency": float(frequencies.mean()),
            "mean_expected_energy": float(expected_energy.mean()),
            "min_expected_energy": float(expected_energy.min()),
            "max_expected_energy": float(expected_energy.max())
        }
    
    def lambda_mass_analysis(
        self,
        frequency_col: str = 'frequency'
    ) -> Dict[str, Any]:
        """
        Analyze Lambda Boson mass (Λ = hf/c²) in experimental data.
        
        Returns:
            Analysis of lambda mass distribution and statistics
        """
        if frequency_col not in self.data.columns:
            raise ValueError(f"Frequency column '{frequency_col}' not found")
        
        frequencies = self.data[frequency_col].dropna()
        
        # Calculate lambda mass: Λ = hf/c²
        lambda_masses = (PLANCK_CONSTANT * frequencies) / (SPEED_OF_LIGHT ** 2)
        
        return {
            "equation": "Λ = hf/c²",
            "planck_constant": PLANCK_CONSTANT,
            "speed_of_light": SPEED_OF_LIGHT,
            "sample_size": len(frequencies),
            "lambda_mass_stats": {
                "mean": float(lambda_masses.mean()),
                "std": float(lambda_masses.std()),
                "min": float(lambda_masses.min()),
                "max": float(lambda_masses.max()),
                "median": float(lambda_masses.median())
            },
            "frequency_stats": {
                "mean": float(frequencies.mean()),
                "std": float(frequencies.std()),
                "min": float(frequencies.min()),
                "max": float(frequencies.max())
            }
        }
    
    # =========================================================================
    # COMPREHENSIVE REPORT
    # =========================================================================
    
    def full_analysis_report(self) -> Dict[str, Any]:
        """
        Generate a comprehensive analysis report.
        
        Returns:
            Dict with all statistical analyses
        """
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns.tolist()
        
        report = {
            "summary": {
                "total_observations": len(self.data),
                "numeric_variables": len(numeric_cols),
                "variable_names": numeric_cols
            },
            "descriptive_statistics": {},
            "confidence_intervals_95": {},
            "normality_tests": {},
            "correlation_matrix": None
        }
        
        # Descriptive stats for each variable
        for col in numeric_cols:
            report["descriptive_statistics"][col] = self.descriptive_stats(col).to_dict()
            report["confidence_intervals_95"][col] = self.confidence_interval(col).to_dict()
            report["normality_tests"][col] = self.normality_test(col)
        
        # Correlation matrix
        if len(numeric_cols) > 1:
            report["correlation_matrix"] = self.correlation_matrix().to_dict()
        
        return report
    
    def export_report_json(self, filepath: str):
        """Export full analysis report to JSON file."""
        report = self.full_analysis_report()
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
        return filepath


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def analyze_data(data: pd.DataFrame) -> WIPAnalysisModule:
    """Create an analysis module from data."""
    return WIPAnalysisModule(data)


def quick_stats(data: pd.DataFrame, variable: str) -> Dict[str, Any]:
    """Get quick statistics for a single variable."""
    analyzer = WIPAnalysisModule(data)
    return {
        "descriptive": analyzer.descriptive_stats(variable).to_dict(),
        "confidence_interval": analyzer.confidence_interval(variable).to_dict(),
        "normality": analyzer.normality_test(variable)
    }


def quick_correlation(data: pd.DataFrame, var1: str, var2: str) -> Dict[str, Any]:
    """Get quick correlation between two variables."""
    analyzer = WIPAnalysisModule(data)
    return analyzer.correlation(var1, var2).to_dict()


# =============================================================================
# DEMONSTRATION
# =============================================================================

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║              WIP ANALYSIS MODULE - Statistical Analysis Toolkit              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Wavelength Information Physics (WIP) Statistical Analysis                   ║
║  Based on Lambda Boson Physics: Λ = hf/c²                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Create sample data
    np.random.seed(42)
    n = 100
    
    frequencies = np.random.uniform(4e14, 7e14, n)  # Visible light frequencies
    energies = PLANCK_CONSTANT * frequencies + np.random.normal(0, 1e-20, n)
    lambda_masses = (PLANCK_CONSTANT * frequencies) / (SPEED_OF_LIGHT ** 2)
    
    sample_data = pd.DataFrame({
        'frequency': frequencies,
        'energy': energies,
        'lambda_mass': lambda_masses,
        'signal_strength': np.random.normal(0.5, 0.1, n)
    })
    
    # Run analysis
    analyzer = WIPAnalysisModule(sample_data)
    
    print("\n📊 DESCRIPTIVE STATISTICS")
    print("-" * 40)
    stats = analyzer.descriptive_stats('frequency')
    print(f"Frequency: Mean = {stats.mean:.2e} Hz, Std = {stats.std_dev:.2e} Hz")
    
    print("\n📈 CONFIDENCE INTERVALS")
    print("-" * 40)
    for level in [ConfidenceLevel.CL_95, ConfidenceLevel.CL_99]:
        ci = analyzer.confidence_interval('frequency', level)
        print(f"{ci.confidence_level}: [{ci.lower_bound:.2e}, {ci.upper_bound:.2e}]")
    
    print("\n🔗 CORRELATIONS")
    print("-" * 40)
    corr = analyzer.correlation('frequency', 'energy')
    print(f"Frequency ↔ Energy: r = {corr.pearson_r:.4f}, p = {corr.pearson_p_value:.2e}")
    print(f"  → {corr.interpretation}")
    
    print("\n⚛️ LAMBDA BOSON ANALYSIS")
    print("-" * 40)
    lambda_analysis = analyzer.lambda_mass_analysis('frequency')
    print(f"Mean Λ-mass: {lambda_analysis['lambda_mass_stats']['mean']:.2e} kg")
    
    print("\n✅ Analysis Complete!")
