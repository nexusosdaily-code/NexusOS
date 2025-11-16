import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Callable
from skopt import gp_minimize
from skopt.space import Real
from skopt.utils import use_named_args
from datetime import datetime
import json

PARAMETER_SPACE = {
    'alpha': {'bounds': (0.001, 0.5), 'default': 0.05, 'description': 'Base issuance rate'},
    'beta': {'bounds': (0.001, 0.5), 'default': 0.05, 'description': 'Base burn rate'},
    'kappa': {'bounds': (0.0, 0.1), 'default': 0.01, 'description': 'Temporal decay rate'},
    'eta': {'bounds': (0.0, 1.0), 'default': 0.1, 'description': 'Floor injection coefficient'},
    
    'w_H': {'bounds': (0.0, 1.0), 'default': 0.3, 'description': 'Health weight'},
    'w_M': {'bounds': (0.0, 1.0), 'default': 0.25, 'description': 'Market weight'},
    'w_D': {'bounds': (0.0, 1.0), 'default': 0.25, 'description': 'Demand weight'},
    'w_E': {'bounds': (0.0, 1.0), 'default': 0.2, 'description': 'Energy weight'},
    
    'gamma_C': {'bounds': (0.001, 0.5), 'default': 0.1, 'description': 'Consumption burn coefficient'},
    'gamma_D': {'bounds': (0.001, 0.5), 'default': 0.05, 'description': 'Disposal burn coefficient'},
    'gamma_E': {'bounds': (0.001, 0.5), 'default': 0.08, 'description': 'Environmental burn coefficient'},
    
    'K_p': {'bounds': (0.0, 2.0), 'default': 0.5, 'description': 'PID proportional gain'},
    'K_i': {'bounds': (0.0, 1.0), 'default': 0.1, 'description': 'PID integral gain'},
    'K_d': {'bounds': (0.0, 1.0), 'default': 0.05, 'description': 'PID derivative gain'},
    
    'N_target': {'bounds': (500.0, 2000.0), 'default': 1000.0, 'description': 'Target Nexus state'},
    'F_floor': {'bounds': (0.0, 100.0), 'default': 10.0, 'description': 'Floor value'},
    
    'lambda_E': {'bounds': (0.0, 2.0), 'default': 1.0, 'description': 'Energy issuance multiplier'},
    'lambda_N': {'bounds': (0.0, 2.0), 'default': 1.0, 'description': 'Network issuance multiplier'},
    'lambda_H': {'bounds': (0.0, 2.0), 'default': 1.0, 'description': 'Health issuance multiplier'},
    'lambda_M': {'bounds': (0.0, 2.0), 'default': 1.0, 'description': 'Market issuance multiplier'},
}


class ObjectiveEvaluator:
    @staticmethod
    def stability(results_df: pd.DataFrame) -> float:
        if len(results_df) == 0:
            return float('inf')
        
        N_values = results_df['N'].values
        mean_N = np.mean(N_values)
        std_N = np.std(N_values)
        
        if mean_N == 0:
            return float('inf')
        
        cv = std_N / mean_N
        return cv
    
    @staticmethod
    def conservation(results_df: pd.DataFrame) -> float:
        if len(results_df) == 0:
            return float('inf')
        
        total_issuance = np.sum(results_df['I'].values)
        total_burn = np.sum(results_df['B'].values)
        
        error = abs(total_issuance - total_burn)
        total = max(abs(total_issuance) + abs(total_burn), 1.0)
        
        return error / total
    
    @staticmethod
    def growth(results_df: pd.DataFrame) -> float:
        if len(results_df) == 0:
            return float('inf')
        
        final_N = results_df['N'].iloc[-1]
        initial_N = results_df['N'].iloc[0]
        
        growth_rate = (final_N - initial_N) / max(initial_N, 1.0)
        
        return -growth_rate
    
    @staticmethod
    def stability_and_growth(results_df: pd.DataFrame, stability_weight=0.5, growth_weight=0.5) -> float:
        stability_score = ObjectiveEvaluator.stability(results_df)
        growth_score = ObjectiveEvaluator.growth(results_df)
        
        normalized_stability = stability_score / (stability_score + 1.0)
        normalized_growth = abs(growth_score) / (abs(growth_score) + 1.0)
        
        combined = stability_weight * normalized_stability - growth_weight * normalized_growth
        return combined
    
    @staticmethod
    def custom(results_df: pd.DataFrame, weights: Dict[str, float]) -> float:
        stability_w = weights.get('stability', 0.4)
        conservation_w = weights.get('conservation', 0.3)
        growth_w = weights.get('growth', 0.3)
        
        stability_score = ObjectiveEvaluator.stability(results_df)
        conservation_score = ObjectiveEvaluator.conservation(results_df)
        growth_score = ObjectiveEvaluator.growth(results_df)
        
        norm_stability = stability_score / (stability_score + 1.0)
        norm_conservation = conservation_score / (conservation_score + 1.0)
        norm_growth = abs(growth_score) / (abs(growth_score) + 1.0)
        
        combined = (stability_w * norm_stability + 
                   conservation_w * norm_conservation - 
                   growth_w * norm_growth)
        return combined


class BayesianOptimizer:
    def __init__(
        self,
        simulation_func: Callable,
        parameter_names: List[str],
        objective_type: str = 'stability',
        objective_weights: Optional[Dict[str, float]] = None,
        n_iterations: int = 50,
        warm_start_data: Optional[List[Tuple[Dict, float]]] = None
    ):
        self.simulation_func = simulation_func
        self.parameter_names = parameter_names
        self.objective_type = objective_type
        self.objective_weights = objective_weights or {}
        self.n_iterations = n_iterations
        self.warm_start_data = warm_start_data
        
        self.search_space = [
            Real(PARAMETER_SPACE[param]['bounds'][0], 
                 PARAMETER_SPACE[param]['bounds'][1], 
                 name=param)
            for param in parameter_names
        ]
        
        self.iteration_history = []
        self.best_params = None
        self.best_score = float('inf')
        
    def _evaluate_objective(self, results_df: pd.DataFrame) -> float:
        if self.objective_type == 'stability':
            return ObjectiveEvaluator.stability(results_df)
        elif self.objective_type == 'conservation':
            return ObjectiveEvaluator.conservation(results_df)
        elif self.objective_type == 'growth':
            return ObjectiveEvaluator.growth(results_df)
        elif self.objective_type == 'stability_and_growth':
            return ObjectiveEvaluator.stability_and_growth(results_df)
        elif self.objective_type == 'custom':
            return ObjectiveEvaluator.custom(results_df, self.objective_weights)
        else:
            return ObjectiveEvaluator.stability(results_df)
    
    def _create_objective_function(self, fixed_params: Dict[str, Any]):
        @use_named_args(self.search_space)
        def objective(**trial_params):
            full_params = fixed_params.copy()
            full_params.update(trial_params)
            
            try:
                results_df = self.simulation_func(full_params)
                
                score = self._evaluate_objective(results_df)
                
                self.iteration_history.append({
                    'params': trial_params.copy(),
                    'score': score,
                    'iteration': len(self.iteration_history)
                })
                
                if score < self.best_score:
                    self.best_score = score
                    self.best_params = trial_params.copy()
                
                return score
            
            except Exception as e:
                print(f"Simulation error: {e}")
                return float('inf')
        
        return objective
    
    def optimize(self, fixed_params: Dict[str, Any]) -> Dict[str, Any]:
        objective_func = self._create_objective_function(fixed_params)
        
        x0 = None
        y0 = None
        
        if self.warm_start_data:
            x0 = []
            y0 = []
            for params_dict, score in self.warm_start_data:
                param_values = [params_dict.get(param, PARAMETER_SPACE[param]['default']) 
                               for param in self.parameter_names]
                x0.append(param_values)
                y0.append(score)
        
        result = gp_minimize(
            objective_func,
            self.search_space,
            n_calls=self.n_iterations,
            random_state=42,
            n_initial_points=min(10, self.n_iterations // 5),
            x0=x0,
            y0=y0,
            verbose=False
        )
        
        best_params_dict = {
            param: result.x[i] 
            for i, param in enumerate(self.parameter_names)
        }
        
        return {
            'best_params': best_params_dict,
            'best_score': result.fun,
            'n_iterations': len(result.func_vals),
            'convergence_history': result.func_vals.tolist(),
            'all_params': [
                {param: result.x_iters[i][j] for j, param in enumerate(self.parameter_names)}
                for i in range(len(result.x_iters))
            ]
        }


class HistoricalAnalyzer:
    @staticmethod
    def get_best_runs_from_db(session, objective_type: str, top_n: int = 5) -> List[Tuple[Dict, float]]:
        from database import SimulationRun, SimulationConfig
        
        try:
            runs = session.query(SimulationRun, SimulationConfig).join(
                SimulationConfig,
                SimulationRun.config_id == SimulationConfig.id
            ).all()
            
            if not runs:
                return []
            
            scored_runs = []
            for run, config in runs:
                try:
                    time_series = run.time_series
                    results_df = pd.DataFrame(time_series)
                    
                    if objective_type == 'stability':
                        score = ObjectiveEvaluator.stability(results_df)
                    elif objective_type == 'conservation':
                        score = ObjectiveEvaluator.conservation(results_df)
                    elif objective_type == 'growth':
                        score = ObjectiveEvaluator.growth(results_df)
                    else:
                        score = ObjectiveEvaluator.stability(results_df)
                    
                    params_dict = {
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
                        'F_floor': config.F_floor,
                        'lambda_E': config.lambda_E,
                        'lambda_N': config.lambda_N,
                        'lambda_H': config.lambda_H,
                        'lambda_M': config.lambda_M,
                    }
                    
                    scored_runs.append((params_dict, score))
                
                except Exception as e:
                    print(f"Error processing run: {e}")
                    continue
            
            scored_runs.sort(key=lambda x: x[1])
            return scored_runs[:top_n]
        
        except Exception as e:
            print(f"Error querying database: {e}")
            return []
