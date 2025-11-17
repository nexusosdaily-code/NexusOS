"""
Oracle Error Handling Infrastructure

Provides custom exceptions, retry logic, timeout handling, and graceful
degradation for external API/oracle data sources.

Similar to db_error_handling.py but specialized for API/network operations.
"""

import time
import requests
from typing import Optional, Callable, TypeVar, Any
from functools import wraps
from datetime import datetime, timedelta


T = TypeVar('T')


class OracleError(Exception):
    """Base exception for all oracle-related errors"""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None, recovery_hint: Optional[str] = None):
        self.message = message
        self.original_error = original_error
        self.recovery_hint = recovery_hint
        super().__init__(message)
    
    def get_user_message(self) -> str:
        """Get user-friendly error message with recovery hint"""
        msg = f"❌ {self.message}"
        if self.recovery_hint:
            msg += f"\n💡 {self.recovery_hint}"
        return msg
    
    def get_technical_details(self) -> str:
        """Get technical details for logging"""
        details = f"{self.__class__.__name__}: {self.message}"
        if self.original_error:
            details += f"\nOriginal error: {type(self.original_error).__name__}: {str(self.original_error)}"
        return details


class OracleConnectionError(OracleError):
    """Raised when unable to connect to oracle data source"""
    pass


class OracleTimeoutError(OracleError):
    """Raised when oracle request times out"""
    pass


class OracleDataError(OracleError):
    """Raised when oracle returns invalid or malformed data"""
    pass


class OracleAuthError(OracleError):
    """Raised when oracle authentication fails"""
    pass


class OracleRateLimitError(OracleError):
    """Raised when oracle rate limit is exceeded"""
    pass


class ErrorMessageBuilder:
    """Builds user-friendly error messages for common oracle failures"""
    
    @staticmethod
    def build_message(error: Exception, operation: str) -> dict:
        """
        Build user-friendly error message from exception.
        
        Args:
            error: Exception that occurred
            operation: Description of the operation (e.g., "fetching environmental data")
            
        Returns:
            Dict with 'message' and 'recovery_hint'
        """
        if isinstance(error, requests.exceptions.Timeout):
            return {
                'message': f"Request timed out while {operation}",
                'recovery_hint': "The external API is taking too long to respond. Try again in a few moments, or increase the timeout setting."
            }
        
        elif isinstance(error, requests.exceptions.ConnectionError):
            return {
                'message': f"Could not connect to external API while {operation}",
                'recovery_hint': "Check your internet connection. The API server may be down or unreachable. Try again later."
            }
        
        elif isinstance(error, requests.exceptions.HTTPError):
            status_code = error.response.status_code if hasattr(error, 'response') else None
            
            if status_code == 401 or status_code == 403:
                return {
                    'message': f"Authentication failed while {operation}",
                    'recovery_hint': "Check your API credentials or authentication tokens. They may be invalid or expired."
                }
            elif status_code == 404:
                return {
                    'message': f"API endpoint not found while {operation}",
                    'recovery_hint': "The requested data endpoint does not exist. Check the API configuration and endpoint URLs."
                }
            elif status_code == 429:
                return {
                    'message': f"API rate limit exceeded while {operation}",
                    'recovery_hint': "Too many requests sent to the API. Wait a few minutes before trying again."
                }
            elif status_code and status_code >= 500:
                return {
                    'message': f"External API server error while {operation}",
                    'recovery_hint': "The API server is experiencing problems. Try again in a few minutes."
                }
            else:
                return {
                    'message': f"HTTP error {status_code} while {operation}",
                    'recovery_hint': "An unexpected HTTP error occurred. Check the API documentation or try again later."
                }
        
        elif isinstance(error, ValueError):
            return {
                'message': f"Invalid data format received while {operation}",
                'recovery_hint': "The API returned data in an unexpected format. Check the API documentation or contact support."
            }
        
        elif isinstance(error, KeyError):
            return {
                'message': f"Expected data field missing while {operation}",
                'recovery_hint': "The API response is missing required fields. The API structure may have changed."
            }
        
        else:
            return {
                'message': f"Unexpected error while {operation}: {str(error)}",
                'recovery_hint': "An unexpected error occurred. Check the logs or try again later."
            }


class RetryHandler:
    """Handles retry logic with exponential backoff"""
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, max_delay: float = 10.0):
        """
        Initialize retry handler.
        
        Args:
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds (will be exponentially increased)
            max_delay: Maximum delay between retries in seconds
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
    
    def get_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt using exponential backoff"""
        delay = self.base_delay * (2 ** attempt)
        return min(delay, self.max_delay)
    
    def should_retry(self, error: Exception) -> bool:
        """Determine if error is retryable"""
        # Retry on connection errors and timeouts
        if isinstance(error, (requests.exceptions.Timeout, requests.exceptions.ConnectionError)):
            return True
        
        # Retry on server errors (5xx)
        if isinstance(error, requests.exceptions.HTTPError):
            if hasattr(error, 'response') and error.response.status_code >= 500:
                return True
        
        # Don't retry on auth errors or client errors
        return False
    
    def execute(self, func: Callable[[], T], operation_name: str) -> T:
        """
        Execute function with retry logic.
        
        Args:
            func: Function to execute
            operation_name: Name of operation for logging
            
        Returns:
            Result of function execution
            
        Raises:
            OracleError: If all retries fail
        """
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return func()
            except Exception as e:
                last_error = e
                
                if attempt < self.max_retries and self.should_retry(e):
                    delay = self.get_delay(attempt)
                    print(f"Retry {attempt + 1}/{self.max_retries} for {operation_name} after {delay:.1f}s delay")
                    time.sleep(delay)
                    continue
                else:
                    # No more retries or non-retryable error
                    break
        
        # All retries failed, convert to friendly error
        if last_error is None:
            raise OracleError("Operation failed with no error details", None, "Please try again later.")
        
        error_info = ErrorMessageBuilder.build_message(last_error, operation_name)
        
        if isinstance(last_error, requests.exceptions.Timeout):
            raise OracleTimeoutError(
                error_info['message'],
                last_error,
                error_info['recovery_hint']
            )
        elif isinstance(last_error, requests.exceptions.ConnectionError):
            raise OracleConnectionError(
                error_info['message'],
                last_error,
                error_info['recovery_hint']
            )
        elif isinstance(last_error, requests.exceptions.HTTPError):
            status_code = last_error.response.status_code if hasattr(last_error, 'response') else None
            if status_code in (401, 403):
                raise OracleAuthError(
                    error_info['message'],
                    last_error,
                    error_info['recovery_hint']
                )
            elif status_code == 429:
                raise OracleRateLimitError(
                    error_info['message'],
                    last_error,
                    error_info['recovery_hint']
                )
            else:
                raise OracleError(
                    error_info['message'],
                    last_error,
                    error_info['recovery_hint']
                )
        elif isinstance(last_error, (ValueError, KeyError)):
            raise OracleDataError(
                error_info['message'],
                last_error,
                error_info['recovery_hint']
            )
        else:
            raise OracleError(
                error_info['message'],
                last_error,
                error_info['recovery_hint']
            )


class CircuitBreaker:
    """
    Circuit breaker pattern for graceful degradation.
    
    Prevents repeated calls to failing services by "opening" the circuit
    after a threshold of failures.
    """
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        """
        Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of failures before opening circuit
            timeout: Seconds to wait before attempting to close circuit
        """
        self.failure_threshold = failure_threshold
        self.timeout = timedelta(seconds=timeout)
        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = 'closed'  # closed, open, half_open
    
    def is_open(self) -> bool:
        """Check if circuit is open (service unavailable)"""
        if self.state == 'open':
            # Check if timeout has passed
            if self.last_failure_time and datetime.now() - self.last_failure_time > self.timeout:
                self.state = 'half_open'
                return False
            return True
        return False
    
    def record_success(self):
        """Record successful operation"""
        self.failure_count = 0
        self.state = 'closed'
    
    def record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'open'
            print(f"Circuit breaker opened after {self.failure_count} failures")
    
    def get_status(self) -> dict:
        """Get circuit breaker status"""
        return {
            'state': self.state,
            'failure_count': self.failure_count,
            'last_failure': self.last_failure_time.isoformat() if self.last_failure_time else None
        }


def with_retry(max_retries: int = 3, base_delay: float = 1.0):
    """Decorator to add retry logic to a function"""
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            retry_handler = RetryHandler(max_retries, base_delay)
            return retry_handler.execute(
                lambda: func(*args, **kwargs),
                func.__name__
            )
        return wrapper
    return decorator


def handle_oracle_error(error: Exception, operation: str) -> str:
    """
    Convenience function to get user-friendly error message.
    
    Args:
        error: Exception that occurred
        operation: Description of operation
        
    Returns:
        User-friendly error message string
    """
    if isinstance(error, OracleError):
        return error.get_user_message()
    
    error_info = ErrorMessageBuilder.build_message(error, operation)
    message = f"❌ {error_info['message']}"
    if error_info['recovery_hint']:
        message += f"\n💡 {error_info['recovery_hint']}"
    return message
