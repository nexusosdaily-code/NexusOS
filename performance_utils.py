"""
Performance utilities for NexusOS
Provides caching, batch processing, and profiling helpers
"""

import time
import functools
from typing import Callable, Any, Dict
import streamlit as st


class PerformanceTimer:
    """Context manager for timing code blocks with statistics"""
    
    def __init__(self, name: str, verbose: bool = False):
        self.name = name
        self.verbose = verbose
        self.start_time = None
        self.elapsed = None
        self.timings = []
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, *args):
        self.elapsed = time.time() - self.start_time
        self.timings.append(self.elapsed)
        if self.verbose:
            print(f"⏱️ {self.name}: {self.elapsed:.3f}s")
    
    def get_elapsed(self) -> float:
        return self.elapsed if self.elapsed is not None else 0.0
    
    def get_statistics(self) -> Dict[str, float]:
        """Get timing statistics across multiple runs"""
        if not self.timings:
            return {}
        import numpy as np
        return {
            'count': len(self.timings),
            'mean': np.mean(self.timings),
            'std': np.std(self.timings),
            'min': np.min(self.timings),
            'max': np.max(self.timings),
            'total': np.sum(self.timings)
        }


def timing_decorator(name: str = None, verbose: bool = False):
    """
    Decorator for automatic performance tracking of functions
    
    Args:
        name: Name for the timing metric (defaults to function name)
        verbose: If True, print timing information
    """
    def decorator(func: Callable) -> Callable:
        metric_name = name or func.__name__
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = func(*args, **kwargs)
            elapsed = time.time() - start
            
            # Record to global profiler
            profiler = get_profiler()
            profiler.record_metric(f"timing_{metric_name}", elapsed)
            
            if verbose:
                print(f"⏱️ {metric_name}: {elapsed:.3f}s")
            
            return result
        
        return wrapper
    return decorator


class CachingLayer:
    """
    LRU-based caching layer for expensive computations
    """
    
    def __init__(self, max_size: int = 128, ttl: int = 300):
        """
        Args:
            max_size: Maximum number of cached entries (LRU eviction)
            ttl: Time to live in seconds
        """
        self.max_size = max_size
        self.ttl = ttl
        self.cache = {}
        self.access_order = []
    
    def get(self, key: str) -> Any:
        """Get cached value if valid"""
        if key not in self.cache:
            return None
        
        value, timestamp = self.cache[key]
        
        # Check TTL
        if time.time() - timestamp > self.ttl:
            del self.cache[key]
            self.access_order.remove(key)
            return None
        
        # Update LRU order
        self.access_order.remove(key)
        self.access_order.append(key)
        
        return value
    
    def set(self, key: str, value: Any):
        """Set cached value with LRU eviction"""
        # Evict oldest if at capacity
        if len(self.cache) >= self.max_size and key not in self.cache:
            oldest_key = self.access_order.pop(0)
            del self.cache[oldest_key]
        
        # Update or add entry
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)
        
        self.cache[key] = (value, time.time())
    
    def clear(self):
        """Clear all cached entries"""
        self.cache = {}
        self.access_order = []
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'ttl': self.ttl,
            'keys': list(self.cache.keys())
        }


def performance_cache(ttl: int = 300):
    """
    Decorator for caching expensive computations with TTL (time-to-live)
    Uses Streamlit session state for persistence across reruns
    
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


class PerformanceProfiler:
    """
    Comprehensive profiler for tracking simulation performance metrics
    Provides detailed reports and statistics
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
            'median': np.median(values),
            'p95': np.percentile(values, 95),
            'p99': np.percentile(values, 99),
            'total': np.sum(values)
        }
    
    def get_all_stats(self) -> Dict[str, Dict[str, float]]:
        """Get statistics for all metrics"""
        return {name: self.get_stats(name) for name in self.metrics.keys()}
    
    def get_detailed_report(self) -> str:
        """Generate detailed performance report"""
        report = ["=== Performance Profiler Report ===\n"]
        
        all_stats = self.get_all_stats()
        for name, stats in all_stats.items():
            report.append(f"\n{name}:")
            report.append(f"  Count: {stats.get('count', 0)}")
            report.append(f"  Mean: {stats.get('mean', 0):.4f}s")
            report.append(f"  Std: {stats.get('std', 0):.4f}s")
            report.append(f"  Min: {stats.get('min', 0):.4f}s")
            report.append(f"  Max: {stats.get('max', 0):.4f}s")
            report.append(f"  Median: {stats.get('median', 0):.4f}s")
            report.append(f"  P95: {stats.get('p95', 0):.4f}s")
            report.append(f"  P99: {stats.get('p99', 0):.4f}s")
            report.append(f"  Total: {stats.get('total', 0):.4f}s")
        
        return "\n".join(report)
    
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
_global_profiler = PerformanceProfiler()


def get_profiler() -> PerformanceProfiler:
    """Get the global profiler instance"""
    return _global_profiler
