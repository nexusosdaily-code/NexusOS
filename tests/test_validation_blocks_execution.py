"""
Integration tests to verify validation blocks invalid simulations.

Tests that weight violations and invalid parameters prevent simulation from running.
"""

import pytest
from validation import ParameterValidator, validate_and_display


class TestValidationBlocksExecution:
    """Tests that validation prevents execution for critical errors"""
    
    def test_weight_sum_violation_blocks_execution(self):
        """Invalid weight sums should block execution"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.7, 'w_M': 0.3, 'w_D': 0.1, 'w_E': 0.1,  # Sums to 1.2
            'gamma_C': 0.34, 'gamma_D': 0.33, 'gamma_E': 0.33,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        
        # validate_and_display returns False if critical errors found
        is_valid = validate_and_display(params)
        assert not is_valid, "Validation should fail for invalid weight sum"
    
    def test_valid_params_allow_execution(self):
        """Valid parameters should allow execution"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,  # Sums to 1.0
            'gamma_C': 0.34, 'gamma_D': 0.33, 'gamma_E': 0.33,  # Sums to 1.0
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        
        # Valid params should return True
        is_valid = validate_and_display(params)
        assert is_valid, "Validation should pass for valid parameters"
    
    def test_negative_weight_blocks_execution(self):
        """Negative weights should block execution"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': -0.1, 'w_M': 0.4, 'w_D': 0.3, 'w_E': 0.4,  # Negative weight
            'gamma_C': 0.34, 'gamma_D': 0.33, 'gamma_E': 0.33,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        
        is_valid = validate_and_display(params)
        assert not is_valid, "Validation should fail for negative weight"
    
    def test_weight_above_one_blocks_execution(self):
        """Weights > 1.0 should block execution"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 1.5, 'w_M': 0.0, 'w_D': 0.0, 'w_E': 0.0,  # Weight > 1.0
            'gamma_C': 0.34, 'gamma_D': 0.33, 'gamma_E': 0.33,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        
        is_valid = validate_and_display(params)
        assert not is_valid, "Validation should fail for weight > 1.0"
    
    def test_burn_weight_sum_violation_blocks_execution(self):
        """Invalid burn weight sums should block execution"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,
            'gamma_C': 0.6, 'gamma_D': 0.3, 'gamma_E': 0.2,  # Sums to 1.1
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.25, 'lambda_N': 0.25, 'lambda_H': 0.25, 'lambda_M': 0.25
        }
        
        is_valid = validate_and_display(params)
        assert not is_valid, "Validation should fail for invalid burn weight sum"
    
    def test_lambda_weight_sum_violation_blocks_execution(self):
        """Invalid lambda weight sums should block execution"""
        params = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.25, 'w_M': 0.25, 'w_D': 0.25, 'w_E': 0.25,
            'gamma_C': 0.34, 'gamma_D': 0.33, 'gamma_E': 0.33,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'delta_t': 0.1, 'num_steps': 1000,
            'lambda_E': 0.4, 'lambda_N': 0.3, 'lambda_H': 0.2, 'lambda_M': 0.2  # Sums to 1.1
        }
        
        is_valid = validate_and_display(params)
        assert not is_valid, "Validation should fail for invalid lambda weight sum"
