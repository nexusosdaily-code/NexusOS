import numpy as np
from typing import Dict, List, Tuple, Callable

class NexusEngine:
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
        
        self.e_integral = 0.0
        self.e_prev = 0.0
    
    def system_health(self, N: float, H: float, M: float, E: float) -> float:
        """Calculate system health index S(t)"""
        S_raw = (
            self.lambda_E * E +
            self.lambda_N * (N / self.N_0) +
            self.lambda_H * (H / self.H_0) +
            self.lambda_M * (M / self.M_0)
        )
        return np.clip(S_raw, 0.0, 1.0)
    
    def issuance(self, S: float, H: float, M: float, D: float, E: float) -> float:
        """Calculate issuance rate I(t)"""
        weighted_inputs = (
            self.w_H * H +
            self.w_M * M +
            self.w_D * D +
            self.w_E * E
        )
        I = self.alpha * S * weighted_inputs
        return max(0.0, I)
    
    def ecological_load(self, E: float) -> float:
        """Calculate ecological load function ℓ(E)"""
        return max(0.0, 1.0 - E)
    
    def burn(self, C_cons: float, C_disp: float, E: float) -> float:
        """Calculate burn rate B(t)"""
        ell_E = self.ecological_load(E)
        B = self.beta * (
            self.gamma_C * C_cons +
            self.gamma_D * C_disp +
            self.gamma_E * ell_E
        )
        return max(0.0, B)
    
    def feedback_controller(self, e: float, delta_t: float) -> float:
        """PID feedback controller Φ(t)"""
        self.e_integral += e * delta_t
        
        e_derivative = (e - self.e_prev) / delta_t if delta_t > 0 else 0.0
        
        Phi = (
            -self.K_p * e +
            -self.K_i * self.e_integral +
            -self.K_d * e_derivative
        )
        
        self.e_prev = e
        
        Phi_max = 100.0
        return np.clip(Phi, -Phi_max, Phi_max)
    
    def step(
        self,
        N: float,
        H: float,
        M: float,
        D: float,
        E: float,
        C_cons: float,
        C_disp: float,
        delta_t: float
    ) -> Tuple[float, Dict]:
        """
        Single discrete-time step of the Nexus equation
        Returns: (N_next, diagnostics)
        """
        S = self.system_health(N, H, M, E)
        
        I = self.issuance(S, H, M, D, E)
        
        B = self.burn(C_cons, C_disp, E)
        
        e = N - self.N_target
        Phi = self.feedback_controller(e, delta_t)
        
        dN_dt = (
            I
            - B
            - self.kappa * N
            + Phi
            + self.eta * self.F_floor
        )
        
        N_next = N + dN_dt * delta_t
        N_next = max(0.0, N_next)
        
        diagnostics = {
            'S': S,
            'I': I,
            'B': B,
            'Phi': Phi,
            'e': e,
            'dN_dt': dN_dt
        }
        
        return N_next, diagnostics
    
    def reset_controller(self):
        """Reset PID controller state"""
        self.e_integral = 0.0
        self.e_prev = 0.0
