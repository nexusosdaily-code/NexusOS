import numpy as np
from typing import List, Dict

class SignalGenerator:
    @staticmethod
    def constant(value: float, num_steps: int) -> np.ndarray:
        """Generate constant signal"""
        return np.full(num_steps, value)
    
    @staticmethod
    def sinusoidal(
        amplitude: float,
        offset: float,
        frequency: float,
        num_steps: int,
        delta_t: float
    ) -> np.ndarray:
        """Generate sinusoidal signal"""
        t = np.arange(num_steps) * delta_t
        return offset + amplitude * np.sin(2 * np.pi * frequency * t)
    
    @staticmethod
    def step_change(
        initial_value: float,
        final_value: float,
        step_at: int,
        num_steps: int
    ) -> np.ndarray:
        """Generate step change signal"""
        signal = np.full(num_steps, initial_value)
        signal[step_at:] = final_value
        return signal
    
    @staticmethod
    def random_walk(
        initial_value: float,
        volatility: float,
        num_steps: int,
        seed: int | None = None
    ) -> np.ndarray:
        """Generate random walk signal"""
        if seed is not None:
            np.random.seed(seed)
        
        changes = np.random.normal(0, volatility, num_steps)
        signal = initial_value + np.cumsum(changes)
        return np.clip(signal, 0, None)
    
    @staticmethod
    def pulse_train(
        baseline: float,
        pulse_height: float,
        pulse_width: int,
        pulse_period: int,
        num_steps: int
    ) -> np.ndarray:
        """Generate pulse train signal"""
        signal = np.full(num_steps, baseline)
        for i in range(0, num_steps, pulse_period):
            end_idx = min(i + pulse_width, num_steps)
            signal[i:end_idx] = baseline + pulse_height
        return signal
    
    @staticmethod
    def linear_ramp(
        start_value: float,
        end_value: float,
        num_steps: int
    ) -> np.ndarray:
        """Generate linear ramp signal"""
        return np.linspace(start_value, end_value, num_steps)
    
    @staticmethod
    def generate_from_config(config: Dict, num_steps: int, delta_t: float) -> np.ndarray:
        """Generate signal from configuration dictionary"""
        signal_type = config.get('type', 'constant')
        
        if signal_type == 'constant':
            return SignalGenerator.constant(
                config.get('value', 100.0),
                num_steps
            )
        
        elif signal_type == 'sinusoidal':
            return SignalGenerator.sinusoidal(
                config.get('amplitude', 20.0),
                config.get('offset', 100.0),
                config.get('frequency', 0.01),
                num_steps,
                delta_t
            )
        
        elif signal_type == 'step':
            return SignalGenerator.step_change(
                config.get('initial', 100.0),
                config.get('final', 150.0),
                config.get('step_at', num_steps // 2),
                num_steps
            )
        
        elif signal_type == 'random_walk':
            return SignalGenerator.random_walk(
                config.get('initial', 100.0),
                config.get('volatility', 5.0),
                num_steps,
                config.get('seed', 42)
            )
        
        elif signal_type == 'pulse':
            return SignalGenerator.pulse_train(
                config.get('baseline', 100.0),
                config.get('pulse_height', 50.0),
                config.get('pulse_width', 10),
                config.get('pulse_period', 100),
                num_steps
            )
        
        elif signal_type == 'ramp':
            return SignalGenerator.linear_ramp(
                config.get('start', 100.0),
                config.get('end', 200.0),
                num_steps
            )
        
        else:
            return SignalGenerator.constant(100.0, num_steps)

def get_default_signal_configs() -> Dict:
    """Get default signal configurations for H, M, D, E inputs"""
    return {
        'H': {'type': 'constant', 'value': 100.0},
        'M': {'type': 'constant', 'value': 80.0},
        'D': {'type': 'constant', 'value': 50.0},
        'E': {'type': 'constant', 'value': 0.8},
        'C_cons': {'type': 'constant', 'value': 60.0},
        'C_disp': {'type': 'constant', 'value': 40.0}
    }
