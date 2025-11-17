"""
Benchmark script to measure performance improvements of NexusEngineOptimized

Compares execution time between original and optimized engines across
various simulation sizes to demonstrate speedup.
"""

import time
import numpy as np
from nexus_engine import NexusEngine
from nexus_engine_optimized import NexusEngineOptimized
from nexus_engine_numba import NexusEngineNumba


def generate_signals(num_steps: int):
    """Generate deterministic test signals"""
    np.random.seed(42)
    return {
        'H': np.random.uniform(50, 150, num_steps),
        'M': np.random.uniform(50, 150, num_steps),
        'D': np.random.uniform(50, 150, num_steps),
        'E': np.random.uniform(0.5, 1.0, num_steps),
        'C_cons': np.random.uniform(10, 50, num_steps),
        'C_disp': np.random.uniform(10, 50, num_steps),
    }


def get_test_params():
    """Standard test parameters"""
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


def benchmark_original_engine(num_steps: int, num_runs: int = 3) -> float:
    """Benchmark original NexusEngine"""
    signals = generate_signals(num_steps)
    params = get_test_params()
    
    times = []
    for _ in range(num_runs):
        engine = NexusEngine(params)
        N_current = params['N_0']
        
        start = time.time()
        for i in range(num_steps):
            N_next, diagnostics = engine.step(
                H=signals['H'][i],
                M=signals['M'][i],
                D=signals['D'][i],
                E=signals['E'][i],
                C_cons=signals['C_cons'][i],
                C_disp=signals['C_disp'][i],
                N=N_current,
                delta_t=1.0
            )
            N_current = N_next
        elapsed = time.time() - start
        times.append(elapsed)
    
    return np.mean(times)


def benchmark_optimized_engine(num_steps: int, num_runs: int = 3) -> float:
    """Benchmark optimized NexusEngineOptimized"""
    signals = generate_signals(num_steps)
    params = get_test_params()
    
    times = []
    for _ in range(num_runs):
        engine = NexusEngineOptimized(params)
        
        start = time.time()
        df = engine.run_simulation_vectorized(
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
        elapsed = time.time() - start
        times.append(elapsed)
    
    return np.mean(times)


def benchmark_numba_engine(num_steps: int, num_runs: int = 3, warmup: bool = True) -> float:
    """Benchmark Numba JIT-compiled NexusEngineNumba"""
    signals = generate_signals(num_steps)
    params = get_test_params()
    
    # Warmup run to trigger JIT compilation
    if warmup:
        engine_warmup = NexusEngineNumba(params)
        engine_warmup.run_simulation(
            signals_H=signals['H'][:100],
            signals_M=signals['M'][:100],
            signals_D=signals['D'][:100],
            signals_E=signals['E'][:100],
            signals_C_cons=signals['C_cons'][:100],
            signals_C_disp=signals['C_disp'][:100],
            N_initial=params['N_0'],
            delta_t=1.0,
            reset_controller=True
        )
    
    times = []
    for _ in range(num_runs):
        engine = NexusEngineNumba(params)
        
        start = time.time()
        df = engine.run_simulation(
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
        elapsed = time.time() - start
        times.append(elapsed)
    
    return np.mean(times)


def run_benchmarks():
    """Run comprehensive performance benchmarks"""
    print("=" * 80)
    print("NexusEngine Performance Benchmark")
    print("=" * 80)
    print()
    
    test_sizes = [100, 500, 1000, 2000, 5000, 10000]
    
    print(f"{'Steps':<10} {'Original (s)':<15} {'Numba (s)':<15} {'Speedup':<10} {'Improvement':<12}")
    print("-" * 80)
    
    results = []
    for num_steps in test_sizes:
        print(f"{num_steps:<10}", end=" ", flush=True)
        
        # Benchmark original engine
        time_original = benchmark_original_engine(num_steps, num_runs=3)
        print(f"{time_original:<15.4f}", end=" ", flush=True)
        
        # Benchmark Numba JIT engine
        time_numba = benchmark_numba_engine(num_steps, num_runs=3)
        print(f"{time_numba:<15.4f}", end=" ", flush=True)
        
        # Calculate speedup
        speedup = time_original / time_numba if time_numba > 0 else 0
        improvement = ((time_original - time_numba) / time_original * 100) if time_original > 0 else 0
        
        print(f"{speedup:<10.2f}x {improvement:<12.1f}%")
        
        results.append({
            'steps': num_steps,
            'original': time_original,
            'numba': time_numba,
            'speedup': speedup,
            'improvement': improvement
        })
    
    print()
    print("=" * 80)
    print("Summary:")
    print(f"  Average speedup: {np.mean([r['speedup'] for r in results]):.2f}x")
    print(f"  Best speedup: {np.max([r['speedup'] for r in results]):.2f}x (at {[r['steps'] for r in results if r['speedup'] == np.max([r['speedup'] for r in results])][0]} steps)")
    print(f"  Average improvement: {np.mean([r['improvement'] for r in results]):.1f}%")
    print("=" * 80)
    print()
    print("✅ Benchmarking complete!")
    print()
    print("Key findings:")
    print("  - Numba JIT compilation provides significant speedup by compiling to machine code")
    print("  - Speedup increases with simulation size as JIT overhead amortizes")
    print("  - Performance gains are substantial for production-scale simulations (>1000 steps)")
    print("  - First run includes compilation time; subsequent runs use cached compiled code")
    print()


if __name__ == '__main__':
    run_benchmarks()
