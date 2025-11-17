"""
Performance utilities for NexusOS
Provides caching, batch processing, and profiling helpers
"""

import time
import functools
from typing import Callable, Any, Dict
import streamlit as st


class PerformanceTimer:
    """Context manager for timing code blocks"""
    
    def __init__(self, name: str, verbose: bool = False):
        self.name = name
        self.verbose = verbose
        self.start_time = None
        self.elapsed = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args):
        self.elapsed = time.time() - self.start_time
        if self.verbose:
            print(f"⏱️ {self.name}: {self.elapsed:.3f}s")
    
    def get_elapsed(self) -> float:
        return self.elapsed if self.elapsed is not None else 0.0


def performance_cache(ttl: int = 300):
    """
    Decorator for caching expensive computations with TTL (time-to-live)
    
    Args:
        ttl: Time to live in seconds (default: 300s = 5min)
    """
    def decorator(func: Callable) -> Callable:
        cache_key = f"perf_cache_{func.__name__}"
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache entry key from function args
            args_key = str(args) + str(sorted(kwargs.items()))
            
            # Check if we have a valid cache entry
            if cache_key in st.session_state:
                cached_data, timestamp = st.session_state[cache_key].get(args_key, (None, 0))
                if cached_data is not None and (time.time() - timestamp) < ttl:
                    return cached_data
            
            # Compute and cache
            result = func(*args, **kwargs)
            
            if cache_key not in st.session_state:
                st.session_state[cache_key] = {}
            
            st.session_state[cache_key][args_key] = (result, time.time())
            
            return result
        
        return wrapper
    return decorator


class BatchProcessor:
    """
    Batch processor for handling large-scale simulations efficiently
    """
    
    @staticmethod
    def process_in_batches(
        items: list,
        process_fn: Callable,
        batch_size: int = 100,
        progress_callback: Callable[[int, int], None] = None
    ) -> list:
        """
        Process items in batches with optional progress reporting
        
        Args:
            items: List of items to process
            process_fn: Function to apply to each batch
            batch_size: Number of items per batch
            progress_callback: Optional callback (current, total)
            
        Returns:
            List of processed results
        """
        results = []
        total_items = len(items)
        
        for i in range(0, total_items, batch_size):
            batch = items[i:i + batch_size]
            batch_results = process_fn(batch)
            results.extend(batch_results)
            
            if progress_callback:
                progress_callback(min(i + batch_size, total_items), total_items)
        
        return results


class SimulationProfiler:
    """
    Profiler for tracking simulation performance metrics
    """
    
    def __init__(self):
        self.metrics = {}
        self.enabled = True
    
    def record_metric(self, name: str, value: float):
        """Record a performance metric"""
        if not self.enabled:
            return
        
        if name not in self.metrics:
            self.metrics[name] = []
        
        self.metrics[name].append(value)
    
    def get_stats(self, name: str) -> Dict[str, float]:
        """Get statistics for a metric"""
        if name not in self.metrics or not self.metrics[name]:
            return {}
        
        import numpy as np
        values = self.metrics[name]
        
        return {
            'count': len(values),
            'mean': np.mean(values),
            'std': np.std(values),
            'min': np.min(values),
            'max': np.max(values),
            'total': np.sum(values)
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """Get statistics for all metrics"""
        return {name: self.get_stats(name) for name in self.metrics.keys()}
    
    def reset(self):
        """Reset all metrics"""
        self.metrics = {}
    
    def enable(self):
        """Enable profiling"""
        self.enabled = True
    
    def disable(self):
        """Disable profiling"""
        self.enabled = False


# Global profiler instance
_global_profiler = SimulationProfiler()


def get_profiler() -> SimulationProfiler:
    """Get the global profiler instance"""
    return _global_profiler
