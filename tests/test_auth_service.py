"""
Unit tests for Authentication Service

Tests password hashing, user authentication, session management,
role checking, and access control.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, User, Role, UserRole, Session
from auth import (
    hash_password, verify_password, generate_session_token,
    hash_token, create_user, authenticate_user, validate_session,
    logout_user, get_user_roles, user_has_role
)


@pytest.fixture(scope='function')
def db_session():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine('sqlite:///:memory:', echo=False)
    
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    # Create default roles
    roles = [
        Role(name='admin', description='Administrator'),
        Role(name='researcher', description='Researcher'),
        Role(name='viewer', description='Viewer')
    ]
    session.add_all(roles)
    session.commit()
    
    yield session
    
    session.close()


class TestPasswordHashing:
    """Tests for password hashing and verification"""
    
    def test_hash_password(self):
        """Test password hashing produces valid hash"""
        password = 'TestPassword123!'
        hashed = hash_password(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed != password
    
    def test_verify_correct_password(self):
        """Test verifying correct password"""
        password = 'MySecurePassword'
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_incorrect_password(self):
        """Test verifying incorrect password"""
        password = 'MySecurePassword'
        hashed = hash_password(password)
        
        assert verify_password('WrongPassword', hashed) is False
    
    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = 'TestPassword'
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestSessionTokens:
    """Tests for session token generation and hashing"""
    
    def test_generate_session_token(self):
        """Test session token generation"""
        token1 = generate_session_token()
        token2 = generate_session_token()
        
        assert token1 is not None
        assert token2 is not None
        assert token1 != token2
    
    def test_hash_token(self):
        """Test token hashing"""
        token = 'test_token_123'
        hashed = hash_token(token)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed != token
    
    def test_same_token_same_hash(self):
        """Test that same token produces same hash"""
        token = 'test_token_123'
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        
        assert hash1 == hash2


class TestUserCreation:
    """Tests for user creation"""
    
    def test_create_user_with_roles(self, db_session):
        """Test creating a user with roles"""
        user = create_user(
            db_session,
            email='test@example.com',
            password='password123',
            role_names=['admin', 'researcher']
        )
        
        assert user is not None
        assert user.email == 'test@example.com'
        assert user.is_active is True
        assert len(user.user_roles) == 2
    
    def test_create_user_duplicate_email(self, db_session):
        """Test that duplicate email returns None"""
        create_user(db_session, 'dup@example.com', 'pass123', ['viewer'])
        
        duplicate = create_user(db_session, 'dup@example.com', 'pass456', ['admin'])
        assert duplicate is None
    
    def test_create_user_invalid_role(self, db_session):
        """Test creating user with non-existent role"""
        user = create_user(
            db_session,
            email='test@example.com',
            password='pass123',
            role_names=['admin', 'invalid_role']
        )
        
        # Should still create user, just skip invalid role
        assert user is not None
        assert len(user.user_roles) == 1


class TestAuthentication:
    """Tests for user authentication"""
    
    def test_authenticate_valid_user(self, db_session):
        """Test authenticating with valid credentials"""
        create_user(db_session, 'user@example.com', 'password123', ['viewer'])
        
        result = authenticate_user(db_session, 'user@example.com', 'password123')
        assert result is not None
        
        user, token = result
        assert user.email == 'user@example.com'
        assert token is not None
    
    def test_authenticate_wrong_password(self, db_session):
        """Test authentication fails with wrong password"""
        create_user(db_session, 'user@example.com', 'password123', ['viewer'])
        
        result = authenticate_user(db_session, 'user@example.com', 'wrongpassword')
        assert result is None
    
    def test_authenticate_nonexistent_user(self, db_session):
        """Test authentication fails for non-existent user"""
        result = authenticate_user(db_session, 'ghost@example.com', 'password')
        assert result is None
    
    def test_authenticate_inactive_user(self, db_session):
        """Test authentication fails for inactive user"""
        user = create_user(db_session, 'inactive@example.com', 'pass123', ['viewer'])
        user.is_active = False
        db_session.commit()
        
        result = authenticate_user(db_session, 'inactive@example.com', 'pass123')
        assert result is None
    
    def test_authenticate_updates_last_login(self, db_session):
        """Test that authentication updates last_login"""
        user = create_user(db_session, 'user@example.com', 'pass123', ['viewer'])
        initial_login = user.last_login
        
        authenticate_user(db_session, 'user@example.com', 'pass123')
        
        updated_user = db_session.query(User).filter_by(email='user@example.com').first()
        assert updated_user.last_login is not None
        assert updated_user.last_login != initial_login


class TestSessionValidation:
    """Tests for session validation"""
    
    def test_validate_valid_session(self, db_session):
        """Test validating a valid session token"""
        create_user(db_session, 'user@example.com', 'pass123', ['viewer'])
        _, token = authenticate_user(db_session, 'user@example.com', 'pass123')
        
        user = validate_session(db_session, token)
        assert user is not None
        assert user.email == 'user@example.com'
    
    def test_validate_invalid_token(self, db_session):
        """Test validating invalid token"""
        user = validate_session(db_session, 'invalid_token_123')
        assert user is None
    
    def test_validate_expired_session(self, db_session):
        """Test that expired sessions are invalid"""
        create_user(db_session, 'user@example.com', 'pass123', ['viewer'])
        _, token = authenticate_user(db_session, 'user@example.com', 'pass123')
        
        # Manually expire the session
        token_hash = hash_token(token)
        session = db_session.query(Session).filter_by(token_hash=token_hash).first()
        session.expires_at = datetime.utcnow() - timedelta(days=1)
        db_session.commit()
        
        user = validate_session(db_session, token)
        assert user is None
    
    def test_validate_updates_last_seen(self, db_session):
        """Test that validation updates last_seen timestamp"""
        create_user(db_session, 'user@example.com', 'pass123', ['viewer'])
        _, token = authenticate_user(db_session, 'user@example.com', 'pass123')
        
        token_hash = hash_token(token)
        session = db_session.query(Session).filter_by(token_hash=token_hash).first()
        initial_last_seen = session.last_seen
        
        validate_session(db_session, token)
        
        updated_session = db_session.query(Session).filter_by(token_hash=token_hash).first()
        assert updated_session.last_seen > initial_last_seen


class TestLogout:
    """Tests for user logout"""
    
    def test_logout_user(self, db_session):
        """Test logging out removes session"""
        create_user(db_session, 'user@example.com', 'pass123', ['viewer'])
        _, token = authenticate_user(db_session, 'user@example.com', 'pass123')
        
        # Session should exist
        token_hash = hash_token(token)
        session = db_session.query(Session).filter_by(token_hash=token_hash).first()
        assert session is not None
        
        # Logout
        logout_user(db_session, token)
        
        # Session should be deleted
        session = db_session.query(Session).filter_by(token_hash=token_hash).first()
        assert session is None
    
    def test_logout_invalid_token(self, db_session):
        """Test logging out with invalid token doesn't raise error"""
        logout_user(db_session, 'invalid_token_123')


class TestRoleManagement:
    """Tests for role checking and management"""
    
    def test_get_user_roles(self, db_session):
        """Test getting user roles"""
        user = create_user(
            db_session,
            'multi@example.com',
            'pass123',
            ['admin', 'researcher']
        )
        
        roles = get_user_roles(db_session, user)
        assert 'admin' in roles
        assert 'researcher' in roles
        assert len(roles) == 2
    
    def test_user_has_role_true(self, db_session):
        """Test checking for existing role"""
        user = create_user(db_session, 'admin@example.com', 'pass123', ['admin'])
        
        assert user_has_role(db_session, user, 'admin') is True
    
    def test_user_has_role_false(self, db_session):
        """Test checking for non-existing role"""
        user = create_user(db_session, 'viewer@example.com', 'pass123', ['viewer'])
        
        assert user_has_role(db_session, user, 'admin') is False
    
    def test_user_no_roles(self, db_session):
        """Test user with no roles"""
        user = create_user(db_session, 'noroles@example.com', 'pass123', [])
        
        roles = get_user_roles(db_session, user)
        assert len(roles) == 0
        assert user_has_role(db_session, user, 'admin') is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
