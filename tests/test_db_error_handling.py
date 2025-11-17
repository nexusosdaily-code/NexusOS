"""
Tests for database error handling utilities.

Tests error message generation, transaction management, and error recovery.
"""

import pytest
from unittest.mock import Mock, patch
from sqlalchemy.exc import (
    IntegrityError, OperationalError, DataError, TimeoutError as SQLTimeoutError
)
from db_error_handling import (
    DatabaseError, ConstraintViolationError, ConnectionError,
    ErrorMessageBuilder, safe_db_operation, db_transaction, handle_db_error
)


class TestErrorMessageBuilder:
    """Tests for ErrorMessageBuilder"""
    
    def test_integrity_error_unique_email(self):
        """Should provide specific message for duplicate email"""
        mock_error = Mock(spec=IntegrityError)
        mock_error.orig = Mock()
        mock_error.orig.__str__ = Mock(return_value="unique constraint failed: email")
        
        result = ErrorMessageBuilder.build_message(mock_error, "creating user")
        
        assert "email address is already registered" in result['message']
        assert "recovery_hint" in result
        assert len(result['recovery_hint']) > 0
    
    def test_integrity_error_foreign_key(self):
        """Should provide specific message for foreign key violation"""
        mock_error = Mock(spec=IntegrityError)
        mock_error.orig = Mock()
        mock_error.orig.__str__ = Mock(return_value="violates foreign key constraint")
        
        result = ErrorMessageBuilder.build_message(mock_error, "saving data")
        
        assert "referenced data does not exist" in result['message']
        assert "ensure all related records exist" in result['recovery_hint']
    
    def test_integrity_error_not_null(self):
        """Should provide specific message for missing required field"""
        mock_error = Mock(spec=IntegrityError)
        mock_error.orig = Mock()
        mock_error.orig.__str__ = Mock(return_value="not null constraint failed")
        
        result = ErrorMessageBuilder.build_message(mock_error, "saving user")
        
        assert "Missing required information" in result['message']
        assert "required fields" in result['recovery_hint']
    
    def test_connection_error(self):
        """Should provide message for connection errors"""
        mock_error = Mock(spec=OperationalError)
        
        result = ErrorMessageBuilder.build_message(mock_error, "querying data")
        
        assert "connection lost" in result['message'].lower()
        assert "refresh" in result['recovery_hint'].lower()
    
    def test_timeout_error(self):
        """Should provide message for timeout errors"""
        mock_error = Mock(spec=SQLTimeoutError)
        
        result = ErrorMessageBuilder.build_message(mock_error, "complex query")
        
        assert "timed out" in result['message'].lower()
        assert "too long" in result['recovery_hint'].lower()
    
    def test_data_error(self):
        """Should provide message for data format errors"""
        mock_error = Mock(spec=DataError)
        
        result = ErrorMessageBuilder.build_message(mock_error, "inserting values")
        
        assert "Invalid data format" in result['message']
        assert "correct format" in result['recovery_hint']


class TestDatabaseExceptions:
    """Tests for custom exception classes"""
    
    def test_database_error_user_message(self):
        """Should format user-friendly message"""
        error = DatabaseError("Test error", recovery_hint="Try again")
        
        msg = error.get_user_message()
        
        assert "❌" in msg
        assert "Test error" in msg
        assert "💡 Try again" in msg
    
    def test_database_error_technical_details(self):
        """Should include original error in technical details"""
        original = ValueError("Original problem")
        error = DatabaseError("Wrapped error", original_error=original)
        
        details = error.get_technical_details()
        
        assert "Wrapped error" in details
        assert "ValueError" in details
        assert "Original problem" in details
    
    def test_constraint_violation_error(self):
        """ConstraintViolationError should be a DatabaseError subclass"""
        error = ConstraintViolationError("Duplicate key")
        
        assert isinstance(error, DatabaseError)
        assert "Duplicate key" in str(error)
    
    def test_connection_error(self):
        """ConnectionError should be a DatabaseError subclass"""
        error = ConnectionError("Database unavailable")
        
        assert isinstance(error, DatabaseError)
        assert "Database unavailable" in str(error)


class TestSafeDbOperation:
    """Tests for safe_db_operation decorator"""
    
    def test_successful_operation(self):
        """Should return result on success"""
        @safe_db_operation("test operation")
        def successful_func():
            return "success"
        
        result = successful_func()
        
        assert result == "success"
    
    def test_integrity_error_returns_none(self):
        """Should return None on IntegrityError (reraise=False)"""
        @safe_db_operation("test operation", reraise=False)
        def failing_func():
            raise IntegrityError("statement", "params", "orig")
        
        result = failing_func()
        
        assert result is None
    
    def test_integrity_error_reraises(self):
        """Should reraise ConstraintViolationError (reraise=True)"""
        @safe_db_operation("test operation", reraise=True)
        def failing_func():
            raise IntegrityError("statement", "params", "orig")
        
        with pytest.raises(ConstraintViolationError):
            failing_func()
    
    def test_operational_error_returns_none(self):
        """Should return None on OperationalError (reraise=False)"""
        @safe_db_operation("test operation", reraise=False)
        def failing_func():
            raise OperationalError("statement", "params", "orig")
        
        result = failing_func()
        
        assert result is None
    
    def test_operational_error_reraises(self):
        """Should reraise ConnectionError (reraise=True)"""
        @safe_db_operation("test operation", reraise=True)
        def failing_func():
            raise OperationalError("statement", "params", "orig")
        
        with pytest.raises(ConnectionError):
            failing_func()


class TestDbTransaction:
    """Tests for db_transaction context manager"""
    
    def test_successful_transaction_commits(self):
        """Should commit on success"""
        mock_session = Mock()
        
        with db_transaction(mock_session, "test operation"):
            pass
        
        mock_session.commit.assert_called_once()
        mock_session.rollback.assert_not_called()
    
    def test_failed_transaction_rolls_back(self):
        """Should rollback on error"""
        mock_session = Mock()
        
        with pytest.raises(DatabaseError):
            with db_transaction(mock_session, "test operation"):
                raise OperationalError("statement", "params", "orig")
        
        mock_session.rollback.assert_called_once()
        mock_session.commit.assert_not_called()
    
    def test_integrity_error_raises_constraint_violation(self):
        """Should raise ConstraintViolationError for IntegrityError"""
        mock_session = Mock()
        
        with pytest.raises(ConstraintViolationError):
            with db_transaction(mock_session, "test operation"):
                raise IntegrityError("statement", "params", "orig")
    
    def test_operational_error_raises_connection_error(self):
        """Should raise ConnectionError for OperationalError"""
        mock_session = Mock()
        
        with pytest.raises(ConnectionError):
            with db_transaction(mock_session, "test operation"):
                raise OperationalError("statement", "params", "orig")


class TestHandleDbError:
    """Tests for handle_db_error convenience function"""
    
    def test_handles_database_error(self):
        """Should extract message from DatabaseError"""
        error = DatabaseError("Test error", recovery_hint="Try again")
        
        msg = handle_db_error(error, "test operation")
        
        assert "❌ Test error" in msg
        assert "💡 Try again" in msg
    
    def test_handles_sqlalchemy_error(self):
        """Should build message for SQLAlchemy error"""
        error = IntegrityError("statement", "params", "orig")
        
        msg = handle_db_error(error, "saving user")
        
        assert "❌" in msg
        assert len(msg) > 0
    
    def test_handles_generic_error(self):
        """Should handle any exception"""
        error = ValueError("Something went wrong")
        
        msg = handle_db_error(error, "processing data")
        
        assert "❌" in msg
        assert len(msg) > 0
