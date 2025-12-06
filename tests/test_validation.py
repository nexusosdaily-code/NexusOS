"""
Unit tests for input validation module.

Tests parameter validation, signal validation, weight constraints, and error messages.
"""

import pytest
from validation import ParameterValidator, ValidationError


class TestPositiveValidation:
    """Tests for positive number validation"""
    
    def test_positive_allows_positive_values(self):
        """Should pass for positive values"""
        ParameterValidator.validate_positive(1.0, "test", allow_zero=False)
        ParameterValidator.validate_positive(100.5, "test", allow_zero=False)
    
    def test_positive_rejects_negative(self):
        """Should fail for negative values"""
        with pytest.raises(ValidationError, match="must be positive"):
            ParameterValidator.validate_positive(-1.0, "test", allow_zero=False)
    
    def test_positive_rejects_zero_when_not_allowed(self):
        """Should fail for zero when allow_zero=False"""
        with pytest.raises(ValidationError, match="must be positive"):
            ParameterValidator.validate_positive(0.0, "test", allow_zero=False)
    
    def test_positive_allows_zero_when_allowed(self):
        """Should pass for zero when allow_zero=True"""
        ParameterValidator.validate_positive(0.0, "test", allow_zero=True)
    
    def test_positive_allows_negative_zero(self):
        """Should pass for -0.0 when allow_zero=True"""
        ParameterValidator.validate_positive(-0.0, "test", allow_zero=True)


class TestRangeValidation:
    """Tests for range validation"""
    
    def test_range_allows_values_within_range(self):
        """Should pass for values within range"""
        ParameterValidator.validate_range(0.5, "test", 0.0, 1.0)
        ParameterValidator.validate_range(0.0, "test", 0.0, 1.0)
        ParameterValidator.validate_range(1.0, "test", 0.0, 1.0)
    
    def test_range_rejects_values_below_min(self):
        """Should fail for values below minimum"""
        with pytest.raises(ValidationError, match="must be between"):
            ParameterValidator.validate_range(-0.1, "test", 0.0, 1.0)
    
    def test_range_rejects_values_above_max(self):
        """Should fail for values above maximum"""
        with pytest.raises(ValidationError, match="must be between"):
            ParameterValidator.validate_range(1.1, "test", 0.0, 1.0)


class TestWeightsSumValidation:
    """Tests for weight sum validation"""
    
    def test_weights_sum_allows_exactly_one(self):
        """Should pass when weights sum to exactly 1.0"""
        weights = {'w1': 0.25, 'w2': 0.25, 'w3': 0.25, 'w4': 0.25}
        is_valid, msg = ParameterValidator.validate_weights_sum(weights, "Test Weights")
        assert is_valid
        assert msg == ""
    
    def test_weights_sum_allows_within_tolerance(self):
        """Should pass when weights sum to 1.0 ± tolerance"""
        weights = {'w1': 0.3, 'w2': 0.3, 'w3': 0.2, 'w4': 0.15}  # Sums to 0.95
        is_valid, msg = ParameterValidator.validate_weights_sum(weights, "Test Weights", tolerance=0.1)
        assert is_valid
    
    def test_weights_sum_rejects_outside_tolerance(self):
        """Should fail when weights sum is outside tolerance"""
        weights = {'w1': 0.5, 'w2': 0.3, 'w3': 0.1, 'w4': 0.05}  # Sums to 0.95
        is_valid, msg = ParameterValidator.validate_weights_sum(weights, "Test Weights", tolerance=0.01)
        assert not is_valid
        assert "sum to" in msg
        assert "0.95" in msg
    
    def test_weights_sum_provides_detailed_message(self):
        """Should provide detailed error message with weight values"""
        weights = {'w_H': 0.4, 'w_M': 0.3, 'w_D': 0.2, 'w_E': 0.05}  # Sums to 0.95
        is_valid, msg = ParameterValidator.validate_weights_sum(weights, "Input Weights", tolerance=0.01)
        assert not is_valid
        assert "w_H" in msg
        assert "0.400" in msg


class TestSimulationParamsValidation:
    """Tests for full simulation parameter validation"""
    
    def test_valid_params_pass(self):
        """Should pass for valid default parameters"""
        params = {
            'alpha': 1.0,
            'beta': 1.0,
            'kappa': 0.01,
            'eta': 0.1,
            'w_H': 0.4,
            'w_M': 0.3,
            'w_D': 0.2,
            'w_E': 0.1,
            'gamma_C': 0.5,
            'gamma_D': 0.3,
            'gamma_E': 0.2,
            'K_p': 0.1,
            'K_i': 0.01,
            'K_d': 0.05,
            'N_target': 1000.0,
            'N_initial': 1000.0,
            'F_floor': 10.0,
            'delta_t': 0.1,
            'num_steps': 1000,
            'lambda_E': 0.25,
            'lambda_N': 0.25,
            'lambda_H': 0.25,
            'lambda_M': 0.25
        }
        warnings = ParameterValidator.validate_simulation_params(params)
        errors = [w for w in warnings if w.startswith("❌")]
        assert len(errors) == 0
    
    def test_negative_alpha_produces_error(self):
        """Should produce error for negative alpha"""
        params = {
            'alpha': -1.0,
            'beta': 1.0,
            'kappa': 0.01,
            'eta': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,
            'gamma_C': 0.33, 'gamma_D': 0.33, 'gamma_E': 0.34,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        warnings = ParameterValidator.validate_simulation_params(params)
        errors = [w for w in warnings if w.startswith("❌")]
        assert len(errors) > 0
        assert any("alpha" in e.lower() or "α" in e for e in errors)
    
    def test_invalid_weight_sum_produces_error(self):
        """Should produce ERROR (not warning) when weights don't sum to 1.0"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.7, 'w_M': 0.3, 'w_D': 0.1, 'w_E': 0.05,  # Sums to 1.15, clearly outside tolerance
            'gamma_C': 0.33, 'gamma_D': 0.33, 'gamma_E': 0.34,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        warnings = ParameterValidator.validate_simulation_params(params)
        # Weight sum violations should now be ERRORS, not warnings
        weight_errors = [w for w in warnings if w.startswith("❌") and "Input Weights" in w]
        assert len(weight_errors) > 0
    
    def test_high_pid_gains_produce_warning(self):
        """Should produce warning for extremely high PID gains"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,
            'gamma_C': 0.33, 'gamma_D': 0.33, 'gamma_E': 0.34,
            'K_p': 5.0,  # Very high
            'K_i': 0.01,
            'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        warnings = ParameterValidator.validate_simulation_params(params)
        kp_warnings = [w for w in warnings if "K_p" in w and "oscillation" in w.lower()]
        assert len(kp_warnings) > 0
    
    def test_large_num_steps_produces_warning(self):
        """Should produce warning for very large number of steps"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,
            'gamma_C': 0.33, 'gamma_D': 0.33, 'gamma_E': 0.34,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1,
            'num_steps': 50000,  # Very large
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        warnings = ParameterValidator.validate_simulation_params(params)
        step_warnings = [w for w in warnings if "steps" in w.lower() and "slow" in w.lower()]
        assert len(step_warnings) > 0


class TestSignalConfigValidation:
    """Tests for signal configuration validation"""
    
    def test_constant_signal_valid(self):
        """Should pass for valid constant signal"""
        config = {'type': 'constant', 'value': 100.0}
        warnings = ParameterValidator.validate_signal_config(config, "H")
        assert len(warnings) == 0
    
    def test_sinusoidal_negative_amplitude_produces_error(self):
        """Should produce error for negative amplitude"""
        config = {'type': 'sinusoidal', 'amplitude': -10.0, 'frequency': 1.0}
        warnings = ParameterValidator.validate_signal_config(config, "H")
        errors = [w for w in warnings if w.startswith("❌")]
        assert len(errors) > 0
    
    def test_sinusoidal_high_frequency_produces_warning(self):
        """Should produce warning for very high frequency"""
        config = {'type': 'sinusoidal', 'amplitude': 10.0, 'frequency': 15.0}
        warnings = ParameterValidator.validate_signal_config(config, "H")
        freq_warnings = [w for w in warnings if "frequency" in w.lower()]
        assert len(freq_warnings) > 0
    
    def test_step_negative_time_produces_warning(self):
        """Should produce warning for negative step time"""
        config = {'type': 'step', 'step_time': -5.0}
        warnings = ParameterValidator.validate_signal_config(config, "H")
        errors = [w for w in warnings if w.startswith("❌")]
        assert len(errors) > 0
    
    def test_pulse_width_greater_than_interval_warning(self):
        """Should produce warning when pulse width > interval"""
        config = {'type': 'pulse', 'pulse_width': 10.0, 'pulse_interval': 5.0}
        warnings = ParameterValidator.validate_signal_config(config, "H")
        assert any("width" in w and "interval" in w for w in warnings)
    
    def test_linear_ramp_minimal_change_info(self):
        """Should produce info message for ramp with minimal change"""
        config = {'type': 'linear_ramp', 'initial': 100.0, 'final': 100.0001}
        warnings = ParameterValidator.validate_signal_config(config, "H")
        infos = [w for w in warnings if w.startswith("ℹ️")]
        assert len(infos) > 0
