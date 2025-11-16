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
