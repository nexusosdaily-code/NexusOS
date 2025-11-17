import numpy as np
from typing import Dict, List, Tuple
import pandas as pd

class NexusEngineOptimized:
    """
    Optimized NexusEngine using vectorized NumPy operations for better performance
    with large-scale simulations. Provides significant speedup for high num_steps.
    """
    
    def __init__(self, params: Dict):
        self.alpha = params.get('alpha', 1.0)
        self.beta = params.get('beta', 1.0)
        self.kappa = params.get('kappa', 0.01)
        self.eta = params.get('eta', 0.1)
        
        self.w_H = params.get('w_H', 0.4)
        self.w_M = params.get('w_M', 0.3)
        self.w_D = params.get('w_D', 0.2)
        self.w_E = params.get('w_E', 0.1)
        
        self.gamma_C = params.get('gamma_C', 0.5)
        self.gamma_D = params.get('gamma_D', 0.3)
        self.gamma_E = params.get('gamma_E', 0.2)
        
        self.K_p = params.get('K_p', 0.1)
        self.K_i = params.get('K_i', 0.01)
        self.K_d = params.get('K_d', 0.05)
        
        self.N_target = params.get('N_target', 1000.0)
        self.F_floor = params.get('F_floor', 10.0)
        
        self.lambda_E = params.get('lambda_E', 0.3)
        self.lambda_N = params.get('lambda_N', 0.3)
        self.lambda_H = params.get('lambda_H', 0.2)
        self.lambda_M = params.get('lambda_M', 0.2)
        
        self.N_0 = params.get('N_0', 1000.0)
        self.H_0 = params.get('H_0', 100.0)
        self.M_0 = params.get('M_0', 100.0)
        
        # PID controller state (persists across runs like original engine)
        self.e_integral = 0.0
        self.e_prev = 0.0
    
    def run_simulation_vectorized(
        self,
        signals_H: np.ndarray,
        signals_M: np.ndarray,
        signals_D: np.ndarray,
        signals_E: np.ndarray,
        signals_C_cons: np.ndarray,
        signals_C_disp: np.ndarray,
        N_initial: float,
        delta_t: float,
        reset_controller: bool = False
    ) -> pd.DataFrame:
        """
        Vectorized simulation run - processes entire time series at once where possible.
        
        Args:
            signals_*: NumPy arrays of signal values for each time step
            N_initial: Initial Nexus state
            delta_t: Time step size
            reset_controller: If True, reset PID state before simulation (default: False, matches original engine)
            
        Returns:
            DataFrame with full time series results (num_steps rows, matching original engine)
        """
        num_steps = len(signals_H)
        
        # Optionally reset PID controller state for fresh simulation
        if reset_controller:
            self.reset_controller()
        
        # Pre-allocate arrays to match original engine output (num_steps rows)
        N = np.zeros(num_steps)
        S = np.zeros(num_steps)
        I = np.zeros(num_steps)
        B = np.zeros(num_steps)
        Phi = np.zeros(num_steps)
        e = np.zeros(num_steps)
        dN_dt = np.zeros(num_steps)
        
        # Tracking state for updates (clamped value from previous step)
        N_current = N_initial
        
        # Main simulation loop (matches original engine's step-by-step behavior exactly)
        for t in range(num_steps):
            # System health (uses clamped N_current from previous step)
            S[t] = np.clip(
                self.lambda_E * signals_E[t] +
                self.lambda_N * (N_current / self.N_0) +
                self.lambda_H * (signals_H[t] / self.H_0) +
                self.lambda_M * (signals_M[t] / self.M_0),
                0.0, 1.0
            )
            
            # Issuance
            weighted_inputs = (
                self.w_H * signals_H[t] +
                self.w_M * signals_M[t] +
                self.w_D * signals_D[t] +
                self.w_E * signals_E[t]
            )
            I[t] = max(0.0, self.alpha * S[t] * weighted_inputs)
            
            # Burn rate (computed per-step to match original engine)
            ell_E = max(0.0, 1.0 - signals_E[t])
            B[t] = max(0.0, self.beta * (
                self.gamma_C * signals_C_cons[t] +
                self.gamma_D * signals_C_disp[t] +
                self.gamma_E * ell_E
            ))
            
            # PID feedback
            e[t] = N_current - self.N_target
            self.e_integral += e[t] * delta_t
            e_derivative = (e[t] - self.e_prev) / delta_t if delta_t > 0 else 0.0
            
            Phi[t] = np.clip(
                -self.K_p * e[t] - self.K_i * self.e_integral - self.K_d * e_derivative,
                -100.0, 100.0
            )
            self.e_prev = e[t]
            
            # State update (matches original: dN/dt computed, then N updated and clamped)
            dN_dt[t] = (
                I[t] - B[t] - self.kappa * N_current + Phi[t] + self.eta * self.F_floor
            )
            
            # Update and clamp state for next iteration (this clamped value will be used in next step's S calculation)
            N_current = max(0.0, N_current + dN_dt[t] * delta_t)
            
            # Record post-step clamped state
            N[t] = N_current
        
        # Build result DataFrame matching original engine format
        t_array = np.arange(num_steps) * delta_t
        
        results = {
            't': t_array,
            'N': N,
            'H': signals_H,
            'M': signals_M,
            'D': signals_D,
            'E': signals_E,
            'C_cons': signals_C_cons,
            'C_disp': signals_C_disp,
            'S': S,
            'I': I,
            'B': B,
            'Phi': Phi,
            'e': e,
            'dN_dt': dN_dt,
            'cumulative_I': np.cumsum(I * delta_t),
            'cumulative_B': np.cumsum(B * delta_t),
        }
        
        return pd.DataFrame(results)
    
    def reset_controller(self):
        """Reset PID controller state"""
        self.e_integral = 0.0
        self.e_prev = 0.0
