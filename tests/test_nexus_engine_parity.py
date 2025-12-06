"""
Parity tests for NexusEngine implementations

Regression tests to prove NexusEngineNumba matches NexusEngine exactly.
Validates:
1. Single long simulation run
2. Back-to-back segmented runs (with/without PID reset)
3. Parameter edge cases (high volatility, varied PID gains)
"""

import numpy as np
import pandas as pd
from nexus_engine import NexusEngine
from nexus_engine_numba import NexusEngineNumba


def assert_dataframe_parity(df1: pd.DataFrame, df2: pd.DataFrame, tolerance_abs: float = 1e-8, tolerance_rel: float = 1e-6):
    """
    Assert that two DataFrames match within numerical tolerances.
    
    Args:
        df1: First DataFrame (reference)
        df2: Second DataFrame (comparison)
        tolerance_abs: Absolute tolerance for small values
        tolerance_rel: Relative tolerance for larger values
    """
    assert len(df1) == len(df2), f"Length mismatch: {len(df1)} vs {len(df2)}"
    
    # Find common columns for comparison (df2 may have additional columns)
    cols1 = set(df1.columns)
    cols2 = set(df2.columns)
    common_cols = cols1 & cols2
    
    # Ensure all df1 columns are in df2
    assert cols1.issubset(cols2), f"Missing columns in df2: {cols1 - cols2}"
    
    # Check each common column
    for col in common_cols:
        v1 = df1[col].values
        v2 = df2[col].values
        
        # Use combined absolute and relative tolerance
        max_abs_diff = np.max(np.abs(v1 - v2))
        max_rel_diff = np.max(np.abs((v1 - v2) / (np.abs(v1) + 1e-12)))
        
        assert max_abs_diff < tolerance_abs or max_rel_diff < tolerance_rel, \
            f"Mismatch in '{col}': max_abs={max_abs_diff:.2e}, max_rel={max_rel_diff:.2e}"


def generate_test_signals(num_steps: int):
    """Generate deterministic test signals"""
    np.random.seed(42)
    return {
        'H': 100 + 20 * np.sin(2 * np.pi * np.arange(num_steps) / 200),
        'M': 80 + 10 * np.sin(2 * np.pi * np.arange(num_steps) / 150),
        'D': 50 + 5 * np.sin(2 * np.pi * np.arange(num_steps) / 100),
        'E': 0.8 + 0.1 * np.sin(2 * np.pi * np.arange(num_steps) / 250),
        'C_cons': 60 + np.random.normal(0, 5, num_steps),
        'C_disp': 40 + np.random.normal(0, 3, num_steps)
    }


def generate_test_params():
    """Generate standard test parameters"""
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
        'M_0': 100.0
    }


def test_single_long_run_parity():
    """
    Test that a single long run produces identical results between
    original and Numba engines.
    """
    num_steps = 1000
    signals = generate_test_signals(num_steps)
    params = generate_test_params()
    
    # Original engine - step-by-step
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


def test_segmented_runs_with_reset():
    """
    Test that segmented runs with PID resets produce identical results.
    """
    num_steps_total = 1000
    segment_size = 200
    signals = generate_test_signals(num_steps_total)
    params = generate_test_params()
    
    # Original engine - segmented with resets
    engine_original = NexusEngine(params)
    df_original_full = pd.DataFrame()
    N_current = params['N_0']
    
    for seg_start in range(0, num_steps_total, segment_size):
        engine_original.reset_controller()
        seg_end = min(seg_start + segment_size, num_steps_total)
        
        for i in range(seg_start, seg_end):
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
    
    # Numba engine - segmented with resets
    engine_numba = NexusEngineNumba(params)
    df_numba_full = pd.DataFrame()
    N_current = params['N_0']
    
    for seg_start in range(0, num_steps_total, segment_size):
        seg_end = min(seg_start + segment_size, num_steps_total)
        
        df_seg = engine_numba.run_simulation(
            signals_H=signals['H'][seg_start:seg_end],
            signals_M=signals['M'][seg_start:seg_end],
            signals_D=signals['D'][seg_start:seg_end],
            signals_E=signals['E'][seg_start:seg_end],
            signals_C_cons=signals['C_cons'][seg_start:seg_end],
            signals_C_disp=signals['C_disp'][seg_start:seg_end],
            N_initial=N_current,
            delta_t=1.0,
            reset_controller=True
        )
        
        N_current = df_seg['N'].iloc[-1]
        df_numba_full = pd.concat([df_numba_full, df_seg], ignore_index=True)
    
    # Assert parity
    assert_dataframe_parity(df_original_full, df_numba_full)


def test_segmented_runs_without_reset():
    """
    Test segmented runs without PID resets maintain controller state.
    """
    num_steps_total = 500
    segment_size = 100
    signals = generate_test_signals(num_steps_total)
    params = generate_test_params()
    
    # Original engine - segmented without resets
    engine_original = NexusEngine(params)
    df_original = pd.DataFrame()
    N_current = params['N_0']
    
    for i in range(num_steps_total):
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
    
    # Numba engine - segmented without resets
    engine_numba = NexusEngineNumba(params)
    df_numba = pd.DataFrame()
    N_current = params['N_0']
    first_segment = True
    
    for seg_start in range(0, num_steps_total, segment_size):
        seg_end = min(seg_start + segment_size, num_steps_total)
        
        df_seg = engine_numba.run_simulation(
            signals_H=signals['H'][seg_start:seg_end],
            signals_M=signals['M'][seg_start:seg_end],
            signals_D=signals['D'][seg_start:seg_end],
            signals_E=signals['E'][seg_start:seg_end],
            signals_C_cons=signals['C_cons'][seg_start:seg_end],
            signals_C_disp=signals['C_disp'][seg_start:seg_end],
            N_initial=N_current,
            delta_t=1.0,
            reset_controller=first_segment
        )
        
        N_current = df_seg['N'].iloc[-1]
        df_numba = pd.concat([df_numba, df_seg], ignore_index=True)
        first_segment = False
    
    # Assert parity
    assert_dataframe_parity(df_original, df_numba)


def test_edge_case_high_volatility():
    """Test parity with high volatility signals"""
    num_steps = 500
    np.random.seed(123)
    signals = {
        'H': 100 + np.random.normal(0, 50, num_steps),
        'M': 80 + np.random.normal(0, 40, num_steps),
        'D': 50 + np.random.normal(0, 30, num_steps),
        'E': np.clip(0.8 + np.random.normal(0, 0.3, num_steps), 0, 1),
        'C_cons': 60 + np.random.normal(0, 30, num_steps),
        'C_disp': 40 + np.random.normal(0, 20, num_steps)
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


def test_edge_case_varied_pid_gains():
    """Test parity with extreme PID gains"""
    num_steps = 500
    signals = generate_test_signals(num_steps)
    
    # High PID gains
    params = generate_test_params()
    params.update({
        'K_p': 5.0,
        'K_i': 1.0,
        'K_d': 2.0
    })
    
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


def test_cumulative_conservation():
    """Test cumulative conservation properties"""
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
    
    # Check cumulative sums match for issuance and burn
    for col in ['I', 'B', 'dN_dt']:
        cum_original = df_original[col].cumsum().values
        cum_numba = df_numba[col].cumsum().values
        max_abs_diff = np.max(np.abs(cum_original - cum_numba))
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
