"""
Database error handling utilities.

Provides consistent error handling, recovery strategies, and user-friendly
error messages for all database operations.
"""

from typing import Optional, Callable, Any, TypeVar, Dict
from functools import wraps
import traceback
from sqlalchemy.exc import (
    IntegrityError, OperationalError, SQLAlchemyError,
    DataError, DatabaseError as SQLDatabaseError, DisconnectionError,
    TimeoutError as SQLTimeoutError
)
from contextlib import contextmanager

T = TypeVar('T')


class DatabaseError(Exception):
    """Base class for database errors with user-friendly messages."""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None, 
                 recovery_hint: Optional[str] = None):
        self.message = message
        self.original_error = original_error
        self.recovery_hint = recovery_hint
        super().__init__(self.message)
    
    def get_user_message(self) -> str:
        """Get user-friendly error message."""
        msg = f"❌ {self.message}"
        if self.recovery_hint:
            msg += f"\n💡 {self.recovery_hint}"
        return msg
    
    def get_technical_details(self) -> str:
        """Get technical error details for logging."""
        if self.original_error:
            return f"{self.message}\nCaused by: {type(self.original_error).__name__}: {str(self.original_error)}"
        return self.message


class ConnectionError(DatabaseError):
    """Database connection errors."""
    pass


class ConstraintViolationError(DatabaseError):
    """Data constraint violation errors."""
    pass


class DataValidationError(DatabaseError):
    """Data validation errors."""
    pass


class TransactionError(DatabaseError):
    """Transaction-related errors."""
    pass


class ErrorMessageBuilder:
    """Builds user-friendly error messages from SQLAlchemy exceptions."""
    
    @staticmethod
    def build_message(error: Exception, operation: str) -> Dict[str, str]:
        """
        Build user-friendly error message and recovery hint.
        
        Args:
            error: SQLAlchemy exception
            operation: Description of operation (e.g., "saving scenario")
            
        Returns:
            Dictionary with 'message' and 'recovery_hint' keys
        """
        if isinstance(error, IntegrityError):
            return ErrorMessageBuilder._handle_integrity_error(error, operation)
        elif isinstance(error, (OperationalError, DisconnectionError)):
            return ErrorMessageBuilder._handle_connection_error(error, operation)
        elif isinstance(error, SQLTimeoutError):
            return ErrorMessageBuilder._handle_timeout_error(error, operation)
        elif isinstance(error, DataError):
            return ErrorMessageBuilder._handle_data_error(error, operation)
        else:
            return {
                'message': f"Database error while {operation}",
                'recovery_hint': "Please try again. If the problem persists, contact support."
            }
    
    @staticmethod
    def _handle_integrity_error(error: IntegrityError, operation: str) -> Dict[str, str]:
        """Handle integrity constraint violations."""
        error_str = str(error.orig).lower() if hasattr(error, 'orig') else str(error).lower()
        
        if 'unique' in error_str or 'duplicate' in error_str:
            if 'email' in error_str:
                return {
                    'message': "This email address is already registered",
                    'recovery_hint': "Please use a different email address or try logging in."
                }
            elif 'name' in error_str:
                return {
                    'message': "A record with this name already exists",
                    'recovery_hint': "Please choose a different name."
                }
            else:
                return {
                    'message': "This record already exists in the database",
                    'recovery_hint': "Please modify your input to make it unique."
                }
        
        elif 'foreign key' in error_str or 'violates foreign key constraint' in error_str:
            return {
                'message': f"Cannot complete {operation}: referenced data does not exist",
                'recovery_hint': "Please ensure all related records exist first."
            }
        
        elif 'not null' in error_str:
            return {
                'message': f"Missing required information for {operation}",
                'recovery_hint': "Please fill in all required fields."
            }
        
        else:
            return {
                'message': f"Data constraint violated while {operation}",
                'recovery_hint': "Please check your input and try again."
            }
    
    @staticmethod
    def _handle_connection_error(error: Exception, operation: str) -> Dict[str, str]:
        """Handle database connection errors."""
        return {
            'message': f"Database connection lost while {operation}",
            'recovery_hint': "Please refresh the page and try again. If the problem persists, the database may be temporarily unavailable."
        }
    
    @staticmethod
    def _handle_timeout_error(error: Exception, operation: str) -> Dict[str, str]:
        """Handle database timeout errors."""
        return {
            'message': f"Database operation timed out while {operation}",
            'recovery_hint': "The operation is taking too long. Please try again with a smaller dataset or simpler query."
        }
    
    @staticmethod
    def _handle_data_error(error: DataError, operation: str) -> Dict[str, str]:
        """Handle data type/format errors."""
        return {
            'message': f"Invalid data format while {operation}",
            'recovery_hint': "Please check that all values are in the correct format (e.g., numbers, dates)."
        }


def safe_db_operation(operation_name: str, reraise: bool = False):
    """
    Decorator for safe database operations with automatic error handling.
    
    Args:
        operation_name: User-friendly description of operation
        reraise: If True, re-raises wrapped exceptions after logging
        
    Usage:
        @safe_db_operation("creating user")
        def create_user(db, email, password):
            user = User(email=email, password=password)
            db.add(user)
            db.commit()
            return user
    """
    def decorator(func: Callable[..., T]) -> Callable[..., Optional[T]]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Optional[T]:
            try:
                return func(*args, **kwargs)
            except IntegrityError as e:
                error_info = ErrorMessageBuilder.build_message(e, operation_name)
                db_error = ConstraintViolationError(
                    error_info['message'],
                    original_error=e,
                    recovery_hint=error_info['recovery_hint']
                )
                print(f"Constraint violation: {db_error.get_technical_details()}")
                if reraise:
                    raise db_error
                return None
            except (OperationalError, DisconnectionError) as e:
                error_info = ErrorMessageBuilder.build_message(e, operation_name)
                db_error = ConnectionError(
                    error_info['message'],
                    original_error=e,
                    recovery_hint=error_info['recovery_hint']
                )
                print(f"Connection error: {db_error.get_technical_details()}")
                if reraise:
                    raise db_error
                return None
            except SQLTimeoutError as e:
                error_info = ErrorMessageBuilder.build_message(e, operation_name)
                db_error = TransactionError(
                    error_info['message'],
                    original_error=e,
                    recovery_hint=error_info['recovery_hint']
                )
                print(f"Timeout error: {db_error.get_technical_details()}")
                if reraise:
                    raise db_error
                return None
            except SQLAlchemyError as e:
                error_info = ErrorMessageBuilder.build_message(e, operation_name)
                db_error = DatabaseError(
                    error_info['message'],
                    original_error=e,
                    recovery_hint=error_info['recovery_hint']
                )
                print(f"Database error: {db_error.get_technical_details()}")
                if reraise:
                    raise db_error
                return None
            except Exception as e:
                # Unexpected error
                print(f"Unexpected error during {operation_name}: {traceback.format_exc()}")
                if reraise:
                    raise
                return None
        return wrapper
    return decorator


@contextmanager
def db_transaction(session, operation_name: str = "database operation"):
    """
    Context manager for database transactions with automatic rollback on error.
    
    Usage:
        with db_transaction(session, "saving scenario") as db:
            config = SimulationConfig(...)
            db.add(config)
            # Commits automatically on success, rolls back on error
    """
    try:
        yield session
        session.commit()
    except IntegrityError as e:
        session.rollback()
        error_info = ErrorMessageBuilder.build_message(e, operation_name)
        raise ConstraintViolationError(
            error_info['message'],
            original_error=e,
            recovery_hint=error_info['recovery_hint']
        )
    except (OperationalError, DisconnectionError) as e:
        session.rollback()
        error_info = ErrorMessageBuilder.build_message(e, operation_name)
        raise ConnectionError(
            error_info['message'],
            original_error=e,
            recovery_hint=error_info['recovery_hint']
        )
    except SQLAlchemyError as e:
        session.rollback()
        error_info = ErrorMessageBuilder.build_message(e, operation_name)
        raise DatabaseError(
            error_info['message'],
            original_error=e,
            recovery_hint=error_info['recovery_hint']
        )
    except Exception as e:
        session.rollback()
        print(f"Unexpected error during {operation_name}: {traceback.format_exc()}")
        raise


def handle_db_error(error: Exception, operation: str) -> str:
    """
    Convenience function to get user-friendly error message.
    
    Args:
        error: Exception that occurred
        operation: Description of operation
        
    Returns:
        User-friendly error message string
    """
    if isinstance(error, DatabaseError):
        return error.get_user_message()
    
    error_info = ErrorMessageBuilder.build_message(error, operation)
    message = f"❌ {error_info['message']}"
    if error_info['recovery_hint']:
        message += f"\n💡 {error_info['recovery_hint']}"
    return message
