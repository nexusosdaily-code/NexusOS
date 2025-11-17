"""
Input validation and error handling for NexusOS simulation parameters.

Provides comprehensive validation for all user inputs with clear error messages.
"""

from typing import Dict, List, Tuple, Optional
import streamlit as st


class ValidationError(Exception):
    """Custom exception for validation errors with user-friendly messages."""
    pass


class ParameterValidator:
    """Validates simulation parameters and provides helpful error messages."""
    
    @staticmethod
    def validate_positive(value: float, name: str, allow_zero: bool = False) -> None:
        """
        Validate that a value is positive (or non-negative if allow_zero=True).
        
        Args:
            value: The value to validate
            name: Parameter name for error messages
            allow_zero: Whether zero is acceptable
            
        Raises:
            ValidationError: If validation fails
        """
        if allow_zero:
            if value < 0:
                raise ValidationError(f"{name} must be non-negative (got {value})")
        else:
            if value <= 0:
                raise ValidationError(f"{name} must be positive (got {value})")
    
    @staticmethod
    def validate_range(value: float, name: str, min_val: float, max_val: float) -> None:
        """
        Validate that a value is within a specified range.
        
        Args:
            value: The value to validate
            name: Parameter name for error messages
            min_val: Minimum acceptable value (inclusive)
            max_val: Maximum acceptable value (inclusive)
            
        Raises:
            ValidationError: If validation fails
        """
        if not (min_val <= value <= max_val):
            raise ValidationError(
                f"{name} must be between {min_val} and {max_val} (got {value})"
            )
    
    @staticmethod
    def validate_weights_sum(weights: Dict[str, float], name: str, 
                           tolerance: float = 0.1) -> Tuple[bool, str]:
        """
        Validate that weights sum to approximately 1.0.
        
        Args:
            weights: Dictionary of weight names and values
            name: Group name for error messages (e.g., "Input Weights")
            tolerance: Acceptable deviation from 1.0
            
        Returns:
            Tuple of (is_valid, message)
        """
        total = sum(weights.values())
        if abs(total - 1.0) > tolerance:
            weight_str = ", ".join([f"{k}={v:.3f}" for k, v in weights.items()])
            return (
                False,
                f"{name} sum to {total:.3f} (expected ~1.0 ± {tolerance}). "
                f"Current values: {weight_str}"
            )
        return (True, "")
    
    @staticmethod
    def validate_simulation_params(params: Dict) -> List[str]:
        """
        Validate all simulation parameters and return list of warnings/errors.
        
        Args:
            params: Dictionary of simulation parameters
            
        Returns:
            List of warning/error messages (empty if all valid)
        """
        warnings = []
        
        try:
            # Validate core parameters
            ParameterValidator.validate_positive(params['alpha'], "Issuance Gain (α)", allow_zero=True)
            ParameterValidator.validate_positive(params['beta'], "Burn Gain (β)", allow_zero=True)
            ParameterValidator.validate_range(params['kappa'], "Decay Coefficient (κ)", 0.0, 1.0)
            ParameterValidator.validate_range(params['eta'], "Floor Coupling (η)", 0.0, 1.0)
            ParameterValidator.validate_positive(params['F_floor'], "Floor Value (F)", allow_zero=True)
            
            # Validate individual input weights are in [0,1]
            ParameterValidator.validate_range(params['w_H'], "Human Weight (w_H)", 0.0, 1.0)
            ParameterValidator.validate_range(params['w_M'], "Machine Weight (w_M)", 0.0, 1.0)
            ParameterValidator.validate_range(params['w_D'], "Data Weight (w_D)", 0.0, 1.0)
            ParameterValidator.validate_range(params['w_E'], "Environment Weight (w_E)", 0.0, 1.0)
            
            # Validate input weights sum
            input_weights = {
                'w_H': params['w_H'],
                'w_M': params['w_M'],
                'w_D': params['w_D'],
                'w_E': params['w_E']
            }
            is_valid, msg = ParameterValidator.validate_weights_sum(input_weights, "Input Weights", tolerance=0.05)
            if not is_valid:
                # Weight sum violations are CRITICAL errors, not warnings
                warnings.append(f"❌ {msg}")
            
            # Validate individual burn weights are in [0,1]
            ParameterValidator.validate_range(params['gamma_C'], "Consumption Burn (γ_C)", 0.0, 1.0)
            ParameterValidator.validate_range(params['gamma_D'], "Disposal Burn (γ_D)", 0.0, 1.0)
            ParameterValidator.validate_range(params['gamma_E'], "Ecological Burn (γ_E)", 0.0, 1.0)
            
            # Validate burn weights sum
            burn_weights = {
                'γ_C': params['gamma_C'],
                'γ_D': params['gamma_D'],
                'γ_E': params['gamma_E']
            }
            is_valid, msg = ParameterValidator.validate_weights_sum(burn_weights, "Burn Weights", tolerance=0.05)
            if not is_valid:
                # Weight sum violations are CRITICAL errors, not warnings
                warnings.append(f"❌ {msg}")
            
            # Validate PID gains
            ParameterValidator.validate_positive(params['K_p'], "Proportional Gain (K_p)", allow_zero=True)
            ParameterValidator.validate_positive(params['K_i'], "Integral Gain (K_i)", allow_zero=True)
            ParameterValidator.validate_positive(params['K_d'], "Derivative Gain (K_d)", allow_zero=True)
            
            # Check for extremely high PID gains that might cause instability
            if params['K_p'] > 2.0:
                warnings.append(f"⚠️ High K_p ({params['K_p']:.2f}) may cause oscillations")
            if params['K_i'] > 0.5:
                warnings.append(f"⚠️ High K_i ({params['K_i']:.3f}) may cause integral windup")
            if params['K_d'] > 1.0:
                warnings.append(f"⚠️ High K_d ({params['K_d']:.2f}) may amplify noise")
            
            # Validate target and initial conditions
            ParameterValidator.validate_positive(params['N_target'], "Target Nexus (N_target)")
            ParameterValidator.validate_positive(params['N_initial'], "Initial Nexus (N_initial)", allow_zero=True)
            
            # Validate time parameters
            ParameterValidator.validate_positive(params['delta_t'], "Time Step (Δt)")
            ParameterValidator.validate_positive(params['num_steps'], "Number of Steps")
            
            # Check for reasonable time step
            if params['delta_t'] > 1.0:
                warnings.append(f"⚠️ Large time step ({params['delta_t']}) may reduce accuracy")
            if params['delta_t'] < 0.001:
                warnings.append(f"⚠️ Very small time step ({params['delta_t']}) may slow simulation")
            
            # Check for reasonable number of steps
            if params['num_steps'] > 10000:
                warnings.append(f"⚠️ Large number of steps ({params['num_steps']}) may be slow. Consider using Numba backend.")
            
            # Validate individual lambda parameters are in [0,1]
            if 'lambda_E' in params:
                ParameterValidator.validate_range(params['lambda_E'], "Lambda E (λ_E)", 0.0, 1.0)
            if 'lambda_N' in params:
                ParameterValidator.validate_range(params['lambda_N'], "Lambda N (λ_N)", 0.0, 1.0)
            if 'lambda_H' in params:
                ParameterValidator.validate_range(params['lambda_H'], "Lambda H (λ_H)", 0.0, 1.0)
            if 'lambda_M' in params:
                ParameterValidator.validate_range(params['lambda_M'], "Lambda M (λ_M)", 0.0, 1.0)
            
            # Validate lambda parameters sum (should sum to 1.0)
            lambda_weights = {
                'λ_E': params.get('lambda_E', 0.0),
                'λ_N': params.get('lambda_N', 0.0),
                'λ_H': params.get('lambda_H', 0.0),
                'λ_M': params.get('lambda_M', 0.0)
            }
            is_valid, msg = ParameterValidator.validate_weights_sum(lambda_weights, "Lambda Weights", tolerance=0.05)
            if not is_valid:
                # Weight sum violations are CRITICAL errors, not warnings
                warnings.append(f"❌ {msg}")
                
        except ValidationError as e:
            warnings.append(f"❌ {str(e)}")
        
        return warnings
    
    @staticmethod
    def validate_signal_config(config: Dict, signal_name: str) -> List[str]:
        """
        Validate signal configuration parameters.
        
        Args:
            config: Signal configuration dictionary
            signal_name: Name of the signal (for error messages)
            
        Returns:
            List of warning/error messages
        """
        warnings = []
        signal_type = config.get('type', 'constant')
        
        try:
            if signal_type == 'sinusoidal':
                amplitude = config.get('amplitude', 0)
                frequency = config.get('frequency', 0)
                ParameterValidator.validate_positive(amplitude, f"{signal_name} amplitude", allow_zero=True)
                ParameterValidator.validate_positive(frequency, f"{signal_name} frequency", allow_zero=True)
                
                if frequency > 10.0:
                    warnings.append(f"⚠️ {signal_name}: High frequency ({frequency}) may not be visible in results")
            
            elif signal_type == 'step':
                step_time = config.get('step_time', 0)
                if step_time < 0:
                    warnings.append(f"❌ {signal_name}: Step time must be non-negative")
            
            elif signal_type == 'random_walk':
                volatility = config.get('volatility', 0)
                ParameterValidator.validate_positive(volatility, f"{signal_name} volatility", allow_zero=True)
                
                if volatility > 10.0:
                    warnings.append(f"⚠️ {signal_name}: High volatility ({volatility}) may cause extreme values")
            
            elif signal_type == 'pulse':
                pulse_width = config.get('pulse_width', 0)
                pulse_interval = config.get('pulse_interval', 0)
                ParameterValidator.validate_positive(pulse_width, f"{signal_name} pulse width")
                ParameterValidator.validate_positive(pulse_interval, f"{signal_name} pulse interval")
                
                if pulse_width > pulse_interval:
                    warnings.append(f"⚠️ {signal_name}: Pulse width ({pulse_width}) > interval ({pulse_interval})")
            
            elif signal_type == 'linear_ramp':
                initial = config.get('initial', 0)
                final = config.get('final', 0)
                
                if abs(final - initial) < 0.001:
                    warnings.append(f"ℹ️ {signal_name}: Ramp has very small change (essentially constant)")
                    
        except ValidationError as e:
            warnings.append(f"❌ {str(e)}")
        
        return warnings


def display_validation_warnings(warnings: List[str]) -> None:
    """
    Display validation warnings in Streamlit UI with appropriate styling.
    
    Args:
        warnings: List of warning messages
    """
    if not warnings:
        return
    
    # Separate errors from warnings
    errors = [w for w in warnings if w.startswith("❌")]
    warns = [w for w in warnings if w.startswith("⚠️")]
    infos = [w for w in warnings if w.startswith("ℹ️")]
    
    if errors:
        st.error("**Validation Errors:**\n\n" + "\n\n".join(errors))
    
    if warns:
        st.warning("**Validation Warnings:**\n\n" + "\n\n".join(warns))
    
    if infos:
        st.info("**Information:**\n\n" + "\n\n".join(infos))


def validate_and_display(params: Dict, signal_configs: Optional[Dict] = None) -> bool:
    """
    Validate parameters and signals, display warnings, and return whether to proceed.
    
    Args:
        params: Simulation parameters
        signal_configs: Optional signal configurations
        
    Returns:
        True if validation passed (no errors), False if critical errors found
    """
    all_warnings = []
    
    # Validate parameters
    param_warnings = ParameterValidator.validate_simulation_params(params)
    all_warnings.extend(param_warnings)
    
    # Validate signals if provided
    if signal_configs:
        for signal_name, config in signal_configs.items():
            signal_warnings = ParameterValidator.validate_signal_config(config, signal_name)
            all_warnings.extend(signal_warnings)
    
    # Display warnings
    display_validation_warnings(all_warnings)
    
    # Return False if any critical errors (❌)
    has_errors = any(w.startswith("❌") for w in all_warnings)
    return not has_errors
