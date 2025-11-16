import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from nexus_engine import NexusEngine
from signal_generators import SignalGenerator

class MonteCarloAnalysis:
    def __init__(self, base_params: Dict, signal_configs: Dict):
        self.base_params = base_params.copy()
        self.signal_configs = signal_configs
        
    def run_monte_carlo(
        self,
        param_variations: Dict[str, Tuple[float, float]],
        num_runs: int = 100,
        seed: int = 42
    ) -> Dict:
        """
        Run Monte Carlo simulation with parameter variations
        
        Args:
            param_variations: Dict mapping parameter names to (mean, std_dev) tuples
            num_runs: Number of Monte Carlo runs
            seed: Random seed for reproducibility
            
        Returns:
            Dict containing results and statistics
        """
        np.random.seed(seed)
        
        results = {
            'final_N': [],
            'avg_issuance': [],
            'avg_burn': [],
            'conservation_error': [],
            'max_N': [],
            'min_N': [],
            'final_S': [],
            'params_used': []
        }
        
        for run_idx in range(num_runs):
            run_params = self.base_params.copy()
            
            param_sample = {}
            for param_name, (mean, std_dev) in param_variations.items():
                if param_name in run_params:
                    if param_name in ['num_steps']:
                        sampled_value = int(max(100, np.random.normal(mean, std_dev)))
                    else:
                        sampled_value = max(0.0, np.random.normal(mean, std_dev))
                    run_params[param_name] = sampled_value
                    param_sample[param_name] = sampled_value
            
            try:
                df = self._run_single_simulation(run_params)
                
                results['final_N'].append(float(df['N'].iloc[-1]))
                results['avg_issuance'].append(float(df['I'].mean()))
                results['avg_burn'].append(float(df['B'].mean()))
                results['conservation_error'].append(
                    float(abs(df['cumulative_I'].iloc[-1] - df['cumulative_B'].iloc[-1]))
                )
                results['max_N'].append(float(df['N'].max()))
                results['min_N'].append(float(df['N'].min()))
                results['final_S'].append(float(df['S'].iloc[-1]))
                results['params_used'].append(param_sample)
                
            except Exception as e:
                print(f"Run {run_idx} failed: {str(e)}")
                continue
        
        statistics = {
            'final_N': {
                'mean': np.mean(results['final_N']),
                'std': np.std(results['final_N']),
                'min': np.min(results['final_N']),
                'max': np.max(results['final_N']),
                'median': np.median(results['final_N']),
                'q25': np.percentile(results['final_N'], 25),
                'q75': np.percentile(results['final_N'], 75),
                'ci_lower': np.percentile(results['final_N'], 2.5),
                'ci_upper': np.percentile(results['final_N'], 97.5)
            },
            'avg_issuance': {
                'mean': np.mean(results['avg_issuance']),
                'std': np.std(results['avg_issuance']),
                'min': np.min(results['avg_issuance']),
                'max': np.max(results['avg_issuance']),
                'median': np.median(results['avg_issuance']),
                'q25': np.percentile(results['avg_issuance'], 25),
                'q75': np.percentile(results['avg_issuance'], 75),
                'ci_lower': np.percentile(results['avg_issuance'], 2.5),
                'ci_upper': np.percentile(results['avg_issuance'], 97.5)
            },
            'avg_burn': {
                'mean': np.mean(results['avg_burn']),
                'std': np.std(results['avg_burn']),
                'min': np.min(results['avg_burn']),
                'max': np.max(results['avg_burn']),
                'median': np.median(results['avg_burn']),
                'q25': np.percentile(results['avg_burn'], 25),
                'q75': np.percentile(results['avg_burn'], 75),
                'ci_lower': np.percentile(results['avg_burn'], 2.5),
                'ci_upper': np.percentile(results['avg_burn'], 97.5)
            },
            'conservation_error': {
                'mean': np.mean(results['conservation_error']),
                'std': np.std(results['conservation_error']),
                'min': np.min(results['conservation_error']),
                'max': np.max(results['conservation_error']),
                'median': np.median(results['conservation_error']),
                'q25': np.percentile(results['conservation_error'], 25),
                'q75': np.percentile(results['conservation_error'], 75),
                'ci_lower': np.percentile(results['conservation_error'], 2.5),
                'ci_upper': np.percentile(results['conservation_error'], 97.5)
            }
        }
        
        return {
            'raw_results': results,
            'statistics': statistics,
            'num_successful_runs': len(results['final_N']),
            'param_variations': param_variations
        }
    
    def _run_single_simulation(self, params: Dict) -> pd.DataFrame:
        """Run a single simulation with given parameters"""
        engine = NexusEngine(params)
        
        num_steps = params['num_steps']
        delta_t = params['delta_t']
        
        H_signal = SignalGenerator.generate_from_config(
            self.signal_configs['H'], num_steps, delta_t
        )
        M_signal = SignalGenerator.generate_from_config(
            self.signal_configs['M'], num_steps, delta_t
        )
        D_signal = SignalGenerator.generate_from_config(
            self.signal_configs['D'], num_steps, delta_t
        )
        E_signal = SignalGenerator.generate_from_config(
            self.signal_configs['E'], num_steps, delta_t
        )
        C_cons_signal = SignalGenerator.generate_from_config(
            self.signal_configs['C_cons'], num_steps, delta_t
        )
        C_disp_signal = SignalGenerator.generate_from_config(
            self.signal_configs['C_disp'], num_steps, delta_t
        )
        
        N = params['N_initial']
        
        results = {
            't': [],
            'N': [],
            'I': [],
            'B': [],
            'S': [],
            'Phi': [],
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
            
            N = N_next
        
        df = pd.DataFrame(results)
        df['cumulative_I'] = np.cumsum(df['I']) * delta_t
        df['cumulative_B'] = np.cumsum(df['B']) * delta_t
        
        return df


class SensitivityAnalysis:
    def __init__(self, base_params: Dict, signal_configs: Dict):
        self.base_params = base_params.copy()
        self.signal_configs = signal_configs
        
    def _run_single_simulation(self, params: Dict) -> pd.DataFrame:
        """Run a single simulation with given parameters"""
        engine = NexusEngine(params)
        
        num_steps = params['num_steps']
        delta_t = params['delta_t']
        
        H_signal = SignalGenerator.generate_from_config(
            self.signal_configs['H'], num_steps, delta_t
        )
        M_signal = SignalGenerator.generate_from_config(
            self.signal_configs['M'], num_steps, delta_t
        )
        D_signal = SignalGenerator.generate_from_config(
            self.signal_configs['D'], num_steps, delta_t
        )
        E_signal = SignalGenerator.generate_from_config(
            self.signal_configs['E'], num_steps, delta_t
        )
        C_cons_signal = SignalGenerator.generate_from_config(
            self.signal_configs['C_cons'], num_steps, delta_t
        )
        C_disp_signal = SignalGenerator.generate_from_config(
            self.signal_configs['C_disp'], num_steps, delta_t
        )
        
        N = params['N_initial']
        
        results = {
            't': [],
            'N': [],
            'I': [],
            'B': [],
            'S': [],
            'Phi': [],
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
            
            N = N_next
        
        df = pd.DataFrame(results)
        df['cumulative_I'] = np.cumsum(df['I']) * delta_t
        df['cumulative_B'] = np.cumsum(df['B']) * delta_t
        
        return df
        
    def run_sensitivity_analysis(
        self,
        parameters_to_vary: List[str],
        variation_range: float = 0.3,
        num_points: int = 20
    ) -> Dict:
        """
        Perform one-at-a-time sensitivity analysis
        
        Args:
            parameters_to_vary: List of parameter names to analyze
            variation_range: Fractional range to vary each parameter (±range)
            num_points: Number of points to sample for each parameter
            
        Returns:
            Dict containing sensitivity results
        """
        results = {}
        
        for param_name in parameters_to_vary:
            if param_name not in self.base_params:
                continue
                
            base_value = self.base_params[param_name]
            
            if param_name in ['num_steps']:
                min_val = int(max(100, base_value * (1 - variation_range)))
                max_val = int(base_value * (1 + variation_range))
                param_values = np.linspace(min_val, max_val, num_points, dtype=int)
            else:
                min_val = max(0.0, base_value * (1 - variation_range))
                max_val = base_value * (1 + variation_range)
                param_values = np.linspace(min_val, max_val, num_points)
            
            param_results = {
                'values': [],
                'final_N': [],
                'avg_issuance': [],
                'avg_burn': [],
                'conservation_error': [],
                'stability_metric': []
            }
            
            for param_val in param_values:
                test_params = self.base_params.copy()
                test_params[param_name] = param_val
                
                try:
                    df = self._run_single_simulation(test_params)
                    
                    param_results['values'].append(float(param_val))
                    param_results['final_N'].append(float(df['N'].iloc[-1]))
                    param_results['avg_issuance'].append(float(df['I'].mean()))
                    param_results['avg_burn'].append(float(df['B'].mean()))
                    param_results['conservation_error'].append(
                        float(abs(df['cumulative_I'].iloc[-1] - df['cumulative_B'].iloc[-1]))
                    )
                    
                    stability = np.std(df['N']) / (np.mean(df['N']) + 1e-10)
                    param_results['stability_metric'].append(float(stability))
                    
                except Exception as e:
                    print(f"Sensitivity analysis failed for {param_name}={param_val}: {e}")
                    continue
            
            results[param_name] = param_results
        
        sensitivity_rankings = self._calculate_sensitivity_rankings(results)
        
        return {
            'detailed_results': results,
            'sensitivity_rankings': sensitivity_rankings
        }
    
    def _calculate_sensitivity_rankings(self, results: Dict) -> List[Dict]:
        """Calculate which parameters have the most impact"""
        rankings = []
        
        for param_name, param_results in results.items():
            if len(param_results['final_N']) < 2:
                continue
                
            final_N_range = np.max(param_results['final_N']) - np.min(param_results['final_N'])
            final_N_std = np.std(param_results['final_N'])
            
            rankings.append({
                'parameter': param_name,
                'impact_range': final_N_range,
                'impact_std': final_N_std,
                'avg_conservation_error': np.mean(param_results['conservation_error'])
            })
        
        rankings = sorted(rankings, key=lambda x: x['impact_range'], reverse=True)
        
        return rankings


class StabilityMapper:
    def __init__(self, base_params: Dict, signal_configs: Dict):
        self.base_params = base_params.copy()
        self.signal_configs = signal_configs
    
    def _run_single_simulation(self, params: Dict) -> pd.DataFrame:
        """Run a single simulation with given parameters"""
        engine = NexusEngine(params)
        
        num_steps = params['num_steps']
        delta_t = params['delta_t']
        
        H_signal = SignalGenerator.generate_from_config(
            self.signal_configs['H'], num_steps, delta_t
        )
        M_signal = SignalGenerator.generate_from_config(
            self.signal_configs['M'], num_steps, delta_t
        )
        D_signal = SignalGenerator.generate_from_config(
            self.signal_configs['D'], num_steps, delta_t
        )
        E_signal = SignalGenerator.generate_from_config(
            self.signal_configs['E'], num_steps, delta_t
        )
        C_cons_signal = SignalGenerator.generate_from_config(
            self.signal_configs['C_cons'], num_steps, delta_t
        )
        C_disp_signal = SignalGenerator.generate_from_config(
            self.signal_configs['C_disp'], num_steps, delta_t
        )
        
        N = params['N_initial']
        
        results = {
            't': [],
            'N': [],
            'I': [],
            'B': [],
            'S': [],
            'Phi': [],
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
            
            N = N_next
        
        df = pd.DataFrame(results)
        df['cumulative_I'] = np.cumsum(df['I']) * delta_t
        df['cumulative_B'] = np.cumsum(df['B']) * delta_t
        
        return df
    
    def _calculate_stability_metrics(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculate various stability metrics for a simulation run"""
        N_values = df['N'].values
        
        metrics = {
            'coefficient_of_variation': np.std(N_values) / (np.mean(N_values) + 1e-10),
            'max_deviation': np.max(np.abs(N_values - np.mean(N_values))),
            'oscillation_amplitude': (np.max(N_values) - np.min(N_values)) / 2.0,
            'convergence_rate': self._estimate_convergence_rate(N_values),
            'conservation_error': abs(df['cumulative_I'].iloc[-1] - df['cumulative_B'].iloc[-1]),
            'final_N': N_values[-1],
            'is_stable': self._assess_stability(N_values)
        }
        
        return metrics
    
    def _estimate_convergence_rate(self, N_values: np.ndarray) -> float:
        """Estimate how quickly the system converges to steady state"""
        if len(N_values) < 100:
            return 0.0
        
        second_half = N_values[len(N_values)//2:]
        
        std_second_half = np.std(second_half)
        mean_second_half = np.mean(second_half)
        
        return std_second_half / (mean_second_half + 1e-10)
    
    def _assess_stability(self, N_values: np.ndarray) -> float:
        """Binary stability assessment: 1.0 if stable, 0.0 if unstable"""
        cv = np.std(N_values) / (np.mean(N_values) + 1e-10)
        
        has_nan_or_inf = np.any(np.isnan(N_values)) or np.any(np.isinf(N_values))
        has_negative = np.any(N_values < 0)
        high_volatility = cv > 1.0
        
        if has_nan_or_inf or has_negative or high_volatility:
            return 0.0
        else:
            return 1.0
    
    def map_stability_region(
        self,
        param1_name: str,
        param2_name: str,
        param1_range: tuple,
        param2_range: tuple,
        resolution: int = 20
    ) -> Dict:
        """
        Map stability across 2D parameter space
        
        Args:
            param1_name: Name of first parameter to vary
            param2_name: Name of second parameter to vary
            param1_range: (min, max) for first parameter
            param2_range: (min, max) for second parameter
            resolution: Grid resolution (NxN grid)
            
        Returns:
            Dict containing parameter grids and stability metrics
        """
        param1_values = np.linspace(param1_range[0], param1_range[1], resolution)
        param2_values = np.linspace(param2_range[0], param2_range[1], resolution)
        
        stability_grid = np.zeros((resolution, resolution))
        cv_grid = np.zeros((resolution, resolution))
        final_N_grid = np.zeros((resolution, resolution))
        conservation_grid = np.zeros((resolution, resolution))
        
        total_sims = resolution * resolution
        completed = 0
        
        for i, p1_val in enumerate(param1_values):
            for j, p2_val in enumerate(param2_values):
                test_params = self.base_params.copy()
                test_params[param1_name] = float(p1_val)
                test_params[param2_name] = float(p2_val)
                
                try:
                    df = self._run_single_simulation(test_params)
                    metrics = self._calculate_stability_metrics(df)
                    
                    stability_grid[j, i] = metrics['is_stable']
                    cv_grid[j, i] = metrics['coefficient_of_variation']
                    final_N_grid[j, i] = metrics['final_N']
                    conservation_grid[j, i] = metrics['conservation_error']
                    
                except Exception as e:
                    stability_grid[j, i] = 0.0
                    cv_grid[j, i] = np.nan
                    final_N_grid[j, i] = np.nan
                    conservation_grid[j, i] = np.nan
                
                completed += 1
                
                if completed % 20 == 0:
                    print(f"Stability mapping progress: {completed}/{total_sims} ({100*completed/total_sims:.1f}%)")
        
        return {
            'param1_name': param1_name,
            'param2_name': param2_name,
            'param1_values': param1_values,
            'param2_values': param2_values,
            'stability_grid': stability_grid,
            'cv_grid': cv_grid,
            'final_N_grid': final_N_grid,
            'conservation_grid': conservation_grid,
            'stable_fraction': np.mean(stability_grid),
            'stable_param_combinations': self._identify_stable_regions(
                param1_values, param2_values, stability_grid
            )
        }
    
    def _identify_stable_regions(
        self,
        param1_values: np.ndarray,
        param2_values: np.ndarray,
        stability_grid: np.ndarray
    ) -> list:
        """Identify parameter combinations that yield stable behavior"""
        stable_combos = []
        
        for i in range(len(param1_values)):
            for j in range(len(param2_values)):
                if stability_grid[j, i] == 1.0:
                    stable_combos.append({
                        'param1': float(param1_values[i]),
                        'param2': float(param2_values[j])
                    })
        
        return stable_combos
