"""
Unit tests for Smart Contract Generation

Tests Solidity and Rust/ink! contract code generation
from NexusOS simulation parameters.
"""

import pytest
from contract_generator import SolidityContractGenerator, RustSubstrateContractGenerator


@pytest.fixture
def sample_params():
    """Sample NexusOS parameters for contract generation"""
    return {
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
        'lambda_E': 0.3,
        'lambda_N': 0.3,
        'lambda_H': 0.2,
        'lambda_M': 0.2,
        'N_0': 1000.0,
        'H_0': 100.0,
        'M_0': 100.0
    }


class TestSolidityGenerator:
    """Tests for Solidity contract generation"""
    
    def test_generate_basic_contract(self, sample_params):
        """Test generating a basic Solidity contract"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert contract is not None
        assert isinstance(contract, str)
        assert len(contract) > 0
    
    def test_contract_has_pragma(self, sample_params):
        """Test that contract includes pragma directive"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert 'pragma solidity' in contract
        assert 'SPDX-License-Identifier' in contract
    
    def test_contract_has_nexus_state(self, sample_params):
        """Test that contract includes nexusState variable"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert 'nexusState' in contract
        assert 'uint256' in contract
    
    def test_contract_has_parameters(self, sample_params):
        """Test that contract includes all key parameters"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert 'alpha' in contract
        assert 'beta' in contract
        assert 'kappa' in contract
        assert 'Kp' in contract or 'K_p' in contract
    
    def test_contract_has_events(self, sample_params):
        """Test that contract includes event definitions"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert 'event' in contract
        assert 'StateUpdated' in contract or 'ParametersUpdated' in contract
    
    def test_contract_has_constructor(self, sample_params):
        """Test that contract includes constructor"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert 'constructor' in contract
    
    def test_contract_has_core_functions(self, sample_params):
        """Test that contract includes core economic functions"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        # Should have system health calculation
        assert 'SystemHealth' in contract or 'systemHealth' in contract
    
    def test_custom_contract_name(self, sample_params):
        """Test generating contract with custom name"""
        custom_name = "MyCustomEconomicSystem"
        contract = SolidityContractGenerator.generate_contract(
            sample_params,
            contract_name=custom_name
        )
        
        assert custom_name in contract
    
    def test_fixed_point_conversion(self):
        """Test fixed-point number conversion"""
        fixed = SolidityContractGenerator._to_fixed_point(1.0)
        
        assert fixed == '1000000000000000000'  # 1 * 10^18
    
    def test_contract_imports_openzeppelin(self, sample_params):
        """Test that contract imports OpenZeppelin libraries"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        assert '@openzeppelin/contracts' in contract or 'Ownable' in contract


class TestRustSubstrateGenerator:
    """Tests for Rust/Substrate contract generation"""
    
    def test_generate_basic_rust_contract(self, sample_params):
        """Test generating a basic Rust contract"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        assert contract is not None
        assert isinstance(contract, str)
        assert len(contract) > 0
    
    def test_rust_contract_has_module(self, sample_params):
        """Test that Rust contract has module declaration"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        assert '#[ink::contract]' in contract or 'ink_lang' in contract
    
    def test_rust_contract_has_storage(self, sample_params):
        """Test that Rust contract has storage struct"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        assert '#[ink(storage)]' in contract or 'NexusEconomicSystem' in contract
        assert 'nexus_state' in contract
    
    def test_rust_contract_has_parameters(self, sample_params):
        """Test that Rust contract includes parameters"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        assert 'alpha' in contract
        assert 'beta' in contract
        assert 'kappa' in contract
    
    def test_rust_contract_has_events(self, sample_params):
        """Test that Rust contract includes event definitions"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        assert '#[ink(event)]' in contract
    
    def test_rust_contract_has_constructor(self, sample_params):
        """Test that Rust contract has constructor"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        assert 'pub fn new' in contract or 'constructor' in contract
    
    def test_rust_fixed_point_conversion(self):
        """Test Rust fixed-point conversion (12 decimals)"""
        fixed = RustSubstrateContractGenerator._to_fixed_point_u128(1.0)
        
        assert fixed == '1000000000000'  # 1 * 10^12
    
    def test_custom_rust_contract_name(self, sample_params):
        """Test generating Rust contract with custom name"""
        custom_name = "my_economic_system"
        contract = RustSubstrateContractGenerator.generate_contract(
            sample_params,
            contract_name=custom_name
        )
        
        assert custom_name in contract


class TestContractValidation:
    """Tests for contract validation and correctness"""
    
    def test_solidity_parameter_encoding(self, sample_params):
        """Test that Solidity parameters are correctly encoded"""
        contract = SolidityContractGenerator.generate_contract(sample_params)
        
        # Check that alpha=1.0 is encoded as 10^18
        assert '1000000000000000000' in contract  # 1.0 in fixed-point
    
    def test_rust_parameter_encoding(self, sample_params):
        """Test that Rust parameters are correctly encoded"""
        contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        # Check that parameters use fixed-point (12 decimals)
        assert '1000000000000' in contract  # 1.0 in u128 fixed-point
    
    def test_contracts_include_comments(self, sample_params):
        """Test that contracts include documentation comments"""
        sol_contract = SolidityContractGenerator.generate_contract(sample_params)
        rust_contract = RustSubstrateContractGenerator.generate_contract(sample_params)
        
        # Solidity should have /** */ comments
        assert '/**' in sol_contract or '//' in sol_contract
        
        # Rust should have /// or //! comments
        assert '//!' in rust_contract or '///' in rust_contract
    
    def test_different_param_values(self):
        """Test that different parameter values are reflected in contract"""
        params1 = {
            'alpha': 1.0, 'beta': 1.0, 'kappa': 0.01, 'eta': 0.1,
            'w_H': 0.4, 'w_M': 0.3, 'w_D': 0.2, 'w_E': 0.1,
            'gamma_C': 0.5, 'gamma_D': 0.3, 'gamma_E': 0.2,
            'K_p': 0.1, 'K_i': 0.01, 'K_d': 0.05,
            'N_target': 1000.0, 'N_initial': 1000.0, 'F_floor': 10.0,
            'lambda_E': 0.3, 'lambda_N': 0.3, 'lambda_H': 0.2, 'lambda_M': 0.2,
            'N_0': 1000.0, 'H_0': 100.0, 'M_0': 100.0
        }
        
        params2 = {
            'alpha': 2.0, 'beta': 1.5, 'kappa': 0.02, 'eta': 0.2,
            'w_H': 0.4, 'w_M': 0.3, 'w_D': 0.2, 'w_E': 0.1,
            'gamma_C': 0.5, 'gamma_D': 0.3, 'gamma_E': 0.2,
            'K_p': 0.2, 'K_i': 0.02, 'K_d': 0.1,
            'N_target': 2000.0, 'N_initial': 2000.0, 'F_floor': 20.0,
            'lambda_E': 0.3, 'lambda_N': 0.3, 'lambda_H': 0.2, 'lambda_M': 0.2,
            'N_0': 2000.0, 'H_0': 200.0, 'M_0': 200.0
        }
        
        contract1 = SolidityContractGenerator.generate_contract(params1)
        contract2 = SolidityContractGenerator.generate_contract(params2)
        
        # Contracts should be different
        assert contract1 != contract2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
