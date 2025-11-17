"""
Regression tests to prove NexusEngineOptimized matches NexusEngine exactly.

Tests cover:
1. Single long-run simulations (step-for-step parity)
2. Back-to-back segmented runs (with/without PID reset)
3. Parameter edge cases (high volatility, varied PID gains)
"""

import numpy as np
import pandas as pd
from nexus_engine import NexusEngine
from nexus_engine_optimized import NexusEngineOptimized
from nexus_engine_numba import NexusEngineNumba


def assert_dataframe_parity(df1: pd.DataFrame, df2: pd.DataFrame, tolerance_abs: float = 1e-8, tolerance_rel: float = 1e-6):
    """
    Assert that two DataFrames are equal within tolerance.
    
    Args:
        df1, df2: DataFrames to compare (uses common columns only)
        tolerance_abs: Absolute tolerance
        tolerance_rel: Relative tolerance
    """
    assert len(df1) == len(df2), f"Length mismatch: {len(df1)} vs {len(df2)}"
    
    # Compare only common columns (optimized engine may have extra columns)
    common_cols = [col for col in df1.columns if col in df2.columns]
    assert len(common_cols) > 0, "No common columns found"
    
    for col in common_cols:
        v1 = df1[col].values
        v2 = df2[col].values
        
        # Check absolute and relative difference
        abs_diff = np.abs(v1 - v2)
        rel_diff = abs_diff / (np.abs(v1) + 1e-10)  # Avoid division by zero
        
        max_abs_diff = np.max(abs_diff)
        max_rel_diff = np.max(rel_diff)
        
        assert max_abs_diff < tolerance_abs or max_rel_diff < tolerance_rel, \
            f"Column '{col}' mismatch: max abs diff={max_abs_diff:.2e}, max rel diff={max_rel_diff:.2e}"


def generate_test_signals(num_steps: int, seed: int = 42) -> dict:
    """Generate deterministic test signals for reproducible testing."""
    np.random.seed(seed)
    
    return {
        'H': np.random.uniform(50, 150, num_steps),
        'M': np.random.uniform(50, 150, num_steps),
        'D': np.random.uniform(50, 150, num_steps),
        'E': np.random.uniform(0.5, 1.0, num_steps),
        'C_cons': np.random.uniform(10, 50, num_steps),
        'C_disp': np.random.uniform(10, 50, num_steps),
    }


def generate_test_params() -> dict:
    """Generate standard test parameters."""
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
        'F_floor': 10.0,
        'lambda_E': 0.3,
        'lambda_N': 0.3,
        'lambda_H': 0.2,
        'lambda_M': 0.2,
        'N_0': 1000.0,
        'H_0': 100.0,
        'M_0': 100.0,
    }


def test_single_long_run_parity():
    """Test that both engines produce identical results for a single long simulation."""
    num_steps = 1000
    signals = generate_test_signals(num_steps)
    params = generate_test_params()
    
    # Create both engines
    engine_original = NexusEngine(params)
    engine_optimized = NexusEngineOptimized(params)
    
    # Run simulations
    df_original = pd.DataFrame()
    N_current = params['N_0']
    for i in range(num_steps):
        N_next, diagnostics = engine_original.step(
            H=signals['H'][i],
            M=signals['M'][i],
            D=signals['D'][i],
            E=signals['E'][i],
            C_cons=signals['C_cons'][i],
            C_disp=signals['C_disp'][i],
            N=N_current,
            delta_t=1.0
        )
        # Combine N and diagnostics into single row
        row = {'N': N_next, **diagnostics}
        df_original = pd.concat([df_original, pd.DataFrame([row])], ignore_index=True)
        N_current = N_next
    
    df_optimized = engine_optimized.run_simulation_vectorized(
        signals_H=signals['H'],
        signals_M=signals['M'],
        signals_D=signals['D'],
        signals_E=signals['E'],
        signals_C_cons=signals['C_cons'],
        signals_C_disp=signals['C_disp'],
        N_initial=params['N_0'],
        delta_t=1.0,
        reset_controller=True  # Fresh start for fair comparison
    )
    
    # Assert parity
    assert_dataframe_parity(df_original, df_optimized)


def test_segmented_runs_with_reset():
    """Test that both engines produce identical results for segmented runs with PID reset."""
    segment_size = 100
    num_segments = 3
    
    signals = generate_test_signals(segment_size * num_segments)
    params = generate_test_params()
    
    # Test each segment independently with reset
    for seg in range(num_segments):
        start_idx = seg * segment_size
        end_idx = (seg + 1) * segment_size
        
        seg_signals = {
            'H': signals['H'][start_idx:end_idx],
            'M': signals['M'][start_idx:end_idx],
            'D': signals['D'][start_idx:end_idx],
            'E': signals['E'][start_idx:end_idx],
            'C_cons': signals['C_cons'][start_idx:end_idx],
            'C_disp': signals['C_disp'][start_idx:end_idx],
        }
        
        # Original engine (fresh instance = fresh PID state)
        engine_original = NexusEngine(params)
        df_original = pd.DataFrame()
        N_current = params['N_0']
        for i in range(segment_size):
            N_next, diagnostics = engine_original.step(
                H=seg_signals['H'][i],
                M=seg_signals['M'][i],
                D=seg_signals['D'][i],
                E=seg_signals['E'][i],
                C_cons=seg_signals['C_cons'][i],
                C_disp=seg_signals['C_disp'][i],
                N=N_current,
                delta_t=1.0
            )
            row = {'N': N_next, **diagnostics}
            df_original = pd.concat([df_original, pd.DataFrame([row])], ignore_index=True)
            N_current = N_next
        
        # Optimized engine (manual reset = fresh PID state)
        engine_optimized = NexusEngineOptimized(params)
        df_optimized = engine_optimized.run_simulation_vectorized(
            signals_H=seg_signals['H'],
            signals_M=seg_signals['M'],
            signals_D=seg_signals['D'],
            signals_E=seg_signals['E'],
            signals_C_cons=seg_signals['C_cons'],
            signals_C_disp=seg_signals['C_disp'],
            N_initial=params['N_0'],
            delta_t=1.0,
            reset_controller=True
        )
        
        # Assert parity for this segment
        assert_dataframe_parity(df_original, df_optimized)


def test_segmented_runs_without_reset():
    """Test that both engines preserve PID state across consecutive runs when not reset."""
    segment_size = 100
    num_segments = 3
    
    signals = generate_test_signals(segment_size * num_segments)
    params = generate_test_params()
    
    # Original engine (reuse instance for state persistence)
    engine_original = NexusEngine(params)
    df_original_full = pd.DataFrame()
    N_current = params['N_0']
    
    for seg in range(num_segments):
        start_idx = seg * segment_size
        end_idx = (seg + 1) * segment_size
        
        for i in range(start_idx, end_idx):
            N_next, diagnostics = engine_original.step(
                H=signals['H'][i],
                M=signals['M'][i],
                D=signals['D'][i],
                E=signals['E'][i],
                C_cons=signals['C_cons'][i],
                C_disp=signals['C_disp'][i],
                N=N_current,
                delta_t=1.0
            )
            row = {'N': N_next, **diagnostics}
            df_original_full = pd.concat([df_original_full, pd.DataFrame([row])], ignore_index=True)
            N_current = N_next
    
    # Optimized engine (reuse instance, no reset for state persistence)
    engine_optimized = NexusEngineOptimized(params)
    df_optimized_full = pd.DataFrame()
    N_current_opt = params['N_0']
    
    for seg in range(num_segments):
        start_idx = seg * segment_size
        end_idx = (seg + 1) * segment_size
        
        seg_signals = {
            'H': signals['H'][start_idx:end_idx],
            'M': signals['M'][start_idx:end_idx],
            'D': signals['D'][start_idx:end_idx],
            'E': signals['E'][start_idx:end_idx],
            'C_cons': signals['C_cons'][start_idx:end_idx],
            'C_disp': signals['C_disp'][start_idx:end_idx],
        }
        
        df_seg = engine_optimized.run_simulation_vectorized(
            signals_H=seg_signals['H'],
            signals_M=seg_signals['M'],
            signals_D=seg_signals['D'],
            signals_E=seg_signals['E'],
            signals_C_cons=seg_signals['C_cons'],
            signals_C_disp=seg_signals['C_disp'],
            N_initial=N_current_opt,
            delta_t=1.0,
            reset_controller=False  # Preserve PID state
        )
        
        df_optimized_full = pd.concat([df_optimized_full, df_seg], ignore_index=True)
        N_current_opt = df_seg['N'].iloc[-1]
    
    # Assert parity across all segments
    assert_dataframe_parity(df_original_full, df_optimized_full)


def test_edge_case_high_volatility():
    """Test with highly volatile signals to stress-test numerical stability."""
    num_steps = 500
    np.random.seed(123)
    
    # Extreme volatility signals
    signals = {
        'H': np.random.uniform(1, 200, num_steps),
        'M': np.random.uniform(1, 200, num_steps),
        'D': np.random.uniform(1, 200, num_steps),
        'E': np.random.uniform(0.1, 1.0, num_steps),
        'C_cons': np.random.uniform(1, 100, num_steps),
        'C_disp': np.random.uniform(1, 100, num_steps),
    }
    
    params = generate_test_params()
    
    # Original engine
    engine_original = NexusEngine(params)
    df_original = pd.DataFrame()
    N_current = params['N_0']
    for i in range(num_steps):
        N_next, diagnostics = engine_original.step(
            H=signals['H'][i],
            M=signals['M'][i],
            D=signals['D'][i],
            E=signals['E'][i],
            C_cons=signals['C_cons'][i],
            C_disp=signals['C_disp'][i],
            N=N_current,
            delta_t=1.0
        )
        row = {'N': N_next, **diagnostics}
        df_original = pd.concat([df_original, pd.DataFrame([row])], ignore_index=True)
        N_current = N_next
    
    # Optimized engine
    engine_optimized = NexusEngineOptimized(params)
    df_optimized = engine_optimized.run_simulation_vectorized(
        signals_H=signals['H'],
        signals_M=signals['M'],
        signals_D=signals['D'],
        signals_E=signals['E'],
        signals_C_cons=signals['C_cons'],
        signals_C_disp=signals['C_disp'],
        N_initial=params['N_0'],
        delta_t=1.0,
        reset_controller=True
    )
    
    # Assert parity
    assert_dataframe_parity(df_original, df_optimized)


def test_edge_case_varied_pid_gains():
    """Test with extreme PID parameter values."""
    num_steps = 300
    signals = generate_test_signals(num_steps)
    
    # Extreme PID gains
    params = generate_test_params()
    params['K_p'] = 1.0  # High proportional
    params['K_i'] = 0.5  # High integral
    params['K_d'] = 0.2  # High derivative
    
    # Original engine
    engine_original = NexusEngine(params)
    df_original = pd.DataFrame()
    N_current = params['N_0']
    for i in range(num_steps):
        N_next, diagnostics = engine_original.step(
            H=signals['H'][i],
            M=signals['M'][i],
            D=signals['D'][i],
            E=signals['E'][i],
            C_cons=signals['C_cons'][i],
            C_disp=signals['C_disp'][i],
            N=N_current,
            delta_t=1.0
        )
        row = {'N': N_next, **diagnostics}
        df_original = pd.concat([df_original, pd.DataFrame([row])], ignore_index=True)
        N_current = N_next
    
    # Optimized engine
    engine_optimized = NexusEngineOptimized(params)
    df_optimized = engine_optimized.run_simulation_vectorized(
        signals_H=signals['H'],
        signals_M=signals['M'],
        signals_D=signals['D'],
        signals_E=signals['E'],
        signals_C_cons=signals['C_cons'],
        signals_C_disp=signals['C_disp'],
        N_initial=params['N_0'],
        delta_t=1.0,
        reset_controller=True
    )
    
    # Assert parity
    assert_dataframe_parity(df_original, df_optimized)


def test_cumulative_conservation():
    """Test that cumulative sums are preserved (conservation law verification)."""
    num_steps = 500
    signals = generate_test_signals(num_steps)
    params = generate_test_params()
    
    # Original engine
    engine_original = NexusEngine(params)
    df_original = pd.DataFrame()
    N_current = params['N_0']
    for i in range(num_steps):
        N_next, diagnostics = engine_original.step(
            H=signals['H'][i],
            M=signals['M'][i],
            D=signals['D'][i],
            E=signals['E'][i],
            C_cons=signals['C_cons'][i],
            C_disp=signals['C_disp'][i],
            N=N_current,
            delta_t=1.0
        )
        row = {'N': N_next, **diagnostics}
        df_original = pd.concat([df_original, pd.DataFrame([row])], ignore_index=True)
        N_current = N_next
    
    # Optimized engine
    engine_optimized = NexusEngineOptimized(params)
    df_optimized = engine_optimized.run_simulation_vectorized(
        signals_H=signals['H'],
        signals_M=signals['M'],
        signals_D=signals['D'],
        signals_E=signals['E'],
        signals_C_cons=signals['C_cons'],
        signals_C_disp=signals['C_disp'],
        N_initial=params['N_0'],
        delta_t=1.0,
        reset_controller=True
    )
    
    # Compute cumulative sums
    for col in ['I', 'B', 'dN_dt']:
        cum_original = df_original[col].cumsum().values
        cum_optimized = df_optimized[col].cumsum().values
        
        abs_diff = np.abs(cum_original - cum_optimized)
        max_abs_diff = np.max(abs_diff)
        
        assert max_abs_diff < 1e-6, \
            f"Cumulative sum mismatch for '{col}': max abs diff={max_abs_diff:.2e}"


def test_numba_engine_parity():
    """Test that Numba JIT engine produces identical results to original engine."""
    num_steps = 1000
    signals = generate_test_signals(num_steps)
    params = generate_test_params()
    
    # Original engine
    engine_original = NexusEngine(params)
    df_original = pd.DataFrame()
    N_current = params['N_0']
    for i in range(num_steps):
        N_next, diagnostics = engine_original.step(
            H=signals['H'][i],
            M=signals['M'][i],
            D=signals['D'][i],
            E=signals['E'][i],
            C_cons=signals['C_cons'][i],
            C_disp=signals['C_disp'][i],
            N=N_current,
            delta_t=1.0
        )
        row = {'N': N_next, **diagnostics}
        df_original = pd.concat([df_original, pd.DataFrame([row])], ignore_index=True)
        N_current = N_next
    
    # Numba engine
    engine_numba = NexusEngineNumba(params)
    df_numba = engine_numba.run_simulation(
        signals_H=signals['H'],
        signals_M=signals['M'],
        signals_D=signals['D'],
        signals_E=signals['E'],
        signals_C_cons=signals['C_cons'],
        signals_C_disp=signals['C_disp'],
        N_initial=params['N_0'],
        delta_t=1.0,
        reset_controller=True
    )
    
    # Assert parity
    assert_dataframe_parity(df_original, df_numba)


if __name__ == '__main__':
    print("Running NexusEngine parity tests...")
    
    test_single_long_run_parity()
    print("✓ Single long run parity test passed")
    
    test_segmented_runs_with_reset()
    print("✓ Segmented runs with reset test passed")
    
    test_segmented_runs_without_reset()
    print("✓ Segmented runs without reset test passed")
    
    test_edge_case_high_volatility()
    print("✓ High volatility edge case test passed")
    
    test_edge_case_varied_pid_gains()
    print("✓ Varied PID gains edge case test passed")
    
    test_cumulative_conservation()
    print("✓ Cumulative conservation test passed")
    
    test_numba_engine_parity()
    print("✓ Numba JIT engine parity test passed")
    
    print("\n✅ All parity tests passed!")
