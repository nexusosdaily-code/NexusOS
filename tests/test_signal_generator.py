"""
Unit tests for SignalGenerator

Tests all signal generation strategies for correctness, edge cases, and
parameter validation.
"""

import numpy as np
import pytest
from signal_generators import SignalGenerator


class TestConstantSignal:
    """Tests for constant signal generation"""
    
    def test_constant_signal_basic(self):
        """Test constant signal produces fixed value"""
        signal = SignalGenerator.constant(value=5.0, num_steps=100)
        assert len(signal) == 100
        assert np.all(signal == 5.0)
    
    def test_constant_signal_zero(self):
        """Test constant signal with zero amplitude"""
        signal = SignalGenerator.constant(value=0.0, num_steps=50)
        assert np.all(signal == 0.0)
    
    def test_constant_signal_negative(self):
        """Test constant signal with negative amplitude"""
        signal = SignalGenerator.constant(value=-3.5, num_steps=50)
        assert np.all(signal == -3.5)


class TestSinusoidalSignal:
    """Tests for sinusoidal signal generation"""
    
    def test_sinusoidal_basic(self):
        """Test sinusoidal signal properties"""
        signal = SignalGenerator.sinusoidal(
            amplitude=2.0, offset=0.0, frequency=0.01, 
            num_steps=1000, delta_t=1.0
        )
        
        # Check amplitude bounds (offset + amplitude)
        assert np.max(signal) <= 2.0 + 1e-10
        assert np.min(signal) >= -2.0 - 1e-10
        
        # Check mean is near offset
        assert abs(np.mean(signal) - 0.0) < 0.1
    
    def test_sinusoidal_with_offset(self):
        """Test sinusoidal with offset"""
        signal = SignalGenerator.sinusoidal(
            amplitude=1.0, offset=5.0, frequency=0.01,
            num_steps=1000, delta_t=1.0
        )
        
        # Should oscillate around offset
        assert abs(np.mean(signal) - 5.0) < 0.1
        assert np.max(signal) <= 6.0 + 1e-10
        assert np.min(signal) >= 4.0 - 1e-10
    
    def test_sinusoidal_frequency(self):
        """Test sinusoidal frequency parameter"""
        # Higher frequency should have more zero crossings
        signal_low = SignalGenerator.sinusoidal(
            amplitude=1.0, offset=0.0, frequency=0.005,
            num_steps=1000, delta_t=1.0
        )
        signal_high = SignalGenerator.sinusoidal(
            amplitude=1.0, offset=0.0, frequency=0.02,
            num_steps=1000, delta_t=1.0
        )
        
        # Count zero crossings
        crossings_low = np.sum(np.diff(np.sign(signal_low)) != 0)
        crossings_high = np.sum(np.diff(np.sign(signal_high)) != 0)
        
        assert crossings_high > crossings_low


class TestStepSignal:
    """Tests for step signal generation"""
    
    def test_step_basic(self):
        """Test step signal transitions"""
        signal = SignalGenerator.step_change(
            initial_value=1.0, final_value=5.0,
            step_at=50, num_steps=100
        )
        
        # First half should be initial value
        assert np.all(signal[:50] == 1.0)
        
        # Second half should be final value
        assert np.all(signal[50:] == 5.0)
    
    def test_step_early_transition(self):
        """Test step signal with early transition"""
        signal = SignalGenerator.step_change(
            initial_value=0.0, final_value=10.0,
            step_at=20, num_steps=100
        )
        
        assert np.all(signal[:20] == 0.0)
        assert np.all(signal[20:] == 10.0)
    
    def test_step_negative_change(self):
        """Test step signal with negative change"""
        signal = SignalGenerator.step_change(
            initial_value=10.0, final_value=2.0,
            step_at=50, num_steps=100
        )
        
        assert np.all(signal[:50] == 10.0)
        assert np.all(signal[50:] == 2.0)


class TestRandomWalkSignal:
    """Tests for random walk signal generation"""
    
    def test_random_walk_basic(self):
        """Test random walk signal generation"""
        signal = SignalGenerator.random_walk(
            initial_value=100.0, volatility=5.0,
            num_steps=100, seed=42
        )
        
        assert len(signal) == 100
        
        # Check that values change (not constant)
        assert not np.all(signal == 100.0)
        
        # All values should be non-negative (clipped at 0)
        assert np.all(signal >= 0.0)
    
    def test_random_walk_reproducibility(self):
        """Test random walk is reproducible with same seed"""
        signal1 = SignalGenerator.random_walk(
            initial_value=100.0, volatility=5.0,
            num_steps=100, seed=42
        )
        signal2 = SignalGenerator.random_walk(
            initial_value=100.0, volatility=5.0,
            num_steps=100, seed=42
        )
        
        assert np.array_equal(signal1, signal2)
    
    def test_random_walk_different_seeds(self):
        """Test random walk differs with different seeds"""
        signal1 = SignalGenerator.random_walk(
            initial_value=100.0, volatility=5.0,
            num_steps=100, seed=42
        )
        signal2 = SignalGenerator.random_walk(
            initial_value=100.0, volatility=5.0,
            num_steps=100, seed=123
        )
        
        assert not np.array_equal(signal1, signal2)
    
    def test_random_walk_clipping(self):
        """Test random walk clips at zero"""
        # High volatility with low initial value should hit zero
        signal = SignalGenerator.random_walk(
            initial_value=5.0, volatility=50.0,
            num_steps=1000, seed=42
        )
        
        # Should have some zeros due to clipping
        assert np.all(signal >= 0.0)


class TestPulseTrainSignal:
    """Tests for pulse train signal generation"""
    
    def test_pulse_train_basic(self):
        """Test pulse train signal generation"""
        signal = SignalGenerator.pulse_train(
            baseline=10.0, pulse_height=5.0,
            pulse_width=10, pulse_period=50, num_steps=200
        )
        
        # First pulse at start
        assert np.all(signal[0:10] == 15.0)  # baseline + pulse_height
        assert np.all(signal[10:50] == 10.0)  # baseline only
        
        # Second pulse
        assert np.all(signal[50:60] == 15.0)
        assert np.all(signal[60:100] == 10.0)
    
    def test_pulse_train_negative_pulse(self):
        """Test pulse train with negative pulse height"""
        signal = SignalGenerator.pulse_train(
            baseline=10.0, pulse_height=-3.0,
            pulse_width=5, pulse_period=20, num_steps=100
        )
        
        # Pulses should drop below baseline
        assert np.all(signal[0:5] == 7.0)
        assert np.all(signal[5:20] == 10.0)


class TestLinearRampSignal:
    """Tests for linear ramp signal generation"""
    
    def test_linear_ramp_basic(self):
        """Test linear ramp signal"""
        signal = SignalGenerator.linear_ramp(
            start_value=0.0, end_value=100.0, num_steps=101
        )
        
        assert signal[0] == 0.0
        assert signal[-1] == 100.0
        
        # Check linearity (equal spacing)
        diffs = np.diff(signal)
        assert np.allclose(diffs, diffs[0], atol=1e-10)
    
    def test_linear_ramp_decreasing(self):
        """Test decreasing linear ramp"""
        signal = SignalGenerator.linear_ramp(
            start_value=100.0, end_value=0.0, num_steps=101
        )
        
        assert signal[0] == 100.0
        assert signal[-1] == 0.0
        
        # Should be strictly decreasing
        assert np.all(np.diff(signal) < 0)
    
    def test_linear_ramp_negative_range(self):
        """Test linear ramp with negative values"""
        signal = SignalGenerator.linear_ramp(
            start_value=-50.0, end_value=50.0, num_steps=101
        )
        
        assert signal[0] == -50.0
        assert signal[-1] == 50.0
        
        # Should cross zero around midpoint
        assert signal[50] == 0.0


class TestGenerateFromConfig:
    """Tests for generate_from_config method"""
    
    def test_constant_config(self):
        """Test constant signal from config"""
        config = {'type': 'constant', 'value': 42.0}
        signal = SignalGenerator.generate_from_config(config, num_steps=100, delta_t=1.0)
        
        assert len(signal) == 100
        assert np.all(signal == 42.0)
    
    def test_sinusoidal_config(self):
        """Test sinusoidal signal from config"""
        config = {
            'type': 'sinusoidal',
            'amplitude': 10.0,
            'offset': 50.0,
            'frequency': 0.01
        }
        signal = SignalGenerator.generate_from_config(config, num_steps=1000, delta_t=1.0)
        
        # Check oscillation around offset
        assert abs(np.mean(signal) - 50.0) < 1.0
    
    def test_step_config(self):
        """Test step signal from config"""
        config = {
            'type': 'step',
            'initial': 10.0,
            'final': 20.0,
            'step_at': 50
        }
        signal = SignalGenerator.generate_from_config(config, num_steps=100, delta_t=1.0)
        
        assert np.all(signal[:50] == 10.0)
        assert np.all(signal[50:] == 20.0)
    
    def test_random_walk_config(self):
        """Test random walk signal from config"""
        config = {
            'type': 'random_walk',
            'initial': 100.0,
            'volatility': 5.0,
            'seed': 42
        }
        signal = SignalGenerator.generate_from_config(config, num_steps=100, delta_t=1.0)
        
        # Should be reproducible
        signal2 = SignalGenerator.generate_from_config(config, num_steps=100, delta_t=1.0)
        assert np.array_equal(signal, signal2)
    
    def test_pulse_config(self):
        """Test pulse signal from config"""
        config = {
            'type': 'pulse',
            'baseline': 10.0,
            'pulse_height': 5.0,
            'pulse_width': 10,
            'pulse_period': 50
        }
        signal = SignalGenerator.generate_from_config(config, num_steps=100, delta_t=1.0)
        
        assert np.all(signal[0:10] == 15.0)
    
    def test_ramp_config(self):
        """Test ramp signal from config"""
        config = {
            'type': 'ramp',
            'start': 0.0,
            'end': 100.0
        }
        signal = SignalGenerator.generate_from_config(config, num_steps=101, delta_t=1.0)
        
        assert signal[0] == 0.0
        assert signal[-1] == 100.0
    
    def test_unknown_type_defaults_to_constant(self):
        """Test unknown type defaults to constant signal"""
        config = {'type': 'unknown_type'}
        signal = SignalGenerator.generate_from_config(config, num_steps=100, delta_t=1.0)
        
        # Should default to constant at 100.0
        assert np.all(signal == 100.0)


class TestEdgeCases:
    """Tests for edge cases"""
    
    def test_zero_steps(self):
        """Test signal generation with zero steps"""
        signal = SignalGenerator.constant(value=1.0, num_steps=0)
        assert len(signal) == 0
    
    def test_single_step(self):
        """Test signal generation with single step"""
        signal = SignalGenerator.constant(value=5.0, num_steps=1)
        assert len(signal) == 1
        assert signal[0] == 5.0
    
    def test_large_num_steps(self):
        """Test signal generation with large number of steps"""
        signal = SignalGenerator.constant(value=1.0, num_steps=1000000)
        assert len(signal) == 1000000


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
