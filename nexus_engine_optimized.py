"""
DEPRECATED: This module is deprecated.

The original "optimized" vectorized approach using pure NumPy was found to be 
slower than the original implementation (0.88x average, 12% slower) due to
Python loop overhead outweighing benefits from pre-allocation. The approach
has been removed from the codebase.

Use `NexusEngineNumba` from nexus_engine_numba.py instead, which provides:
- 56x average speedup (proven via benchmarks)
- 96x peak speedup at 5000 steps
- Exact numerical parity with original engine
- JIT compilation to machine code via Numba

This file exists only to maintain import compatibility and should not be used.
"""

import warnings

class NexusEngineOptimized:
    """
    DEPRECATED: This class has been removed.
    
    Use NexusEngineNumba from nexus_engine_numba.py instead.
    """
    def __init__(self, *args, **kwargs):
        raise DeprecationWarning(
            "NexusEngineOptimized has been deprecated and removed. "
            "The NumPy vectorized approach proved slower than the original. "
            "Use NexusEngineNumba instead for 56x speedup."
        )
