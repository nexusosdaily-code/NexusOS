import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
import bcrypt as bcrypt_lib
import streamlit as st
from sqlalchemy.orm import Session as DBSession
from database import User, Role, UserRole, Session, get_engine
from sqlalchemy.orm import sessionmaker
from db_error_handling import (
    DatabaseError, ConstraintViolationError, ConnectionError,
    TransactionError, ErrorMessageBuilder, safe_db_operation, db_transaction
)
from sqlalchemy.exc import (
    OperationalError, DisconnectionError, 
    TimeoutError as SQLTimeoutError, SQLAlchemyError
)

SESSION_EXPIRY_DAYS = 30

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt_lib.gensalt()
    password_hash = bcrypt_lib.hashpw(password.encode('utf-8'), salt)
    return password_hash.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt_lib.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def generate_session_token() -> str:
    """Generate a secure random session token."""
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    """Hash a token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()

def create_user(db: DBSession, email: str, password: str, role_names: List[str]) -> Optional[User]:
    """
    Create a new user with the specified roles.
    
    Args:
        db: Database session
        email: User email address
        password: Plain text password (will be hashed)
        role_names: List of role names to assign
        
    Returns:
        User object if successful, None if user already exists
        
    Raises:
        ConstraintViolationError: If duplicate email constraint is violated
        DatabaseError: If database operation fails
        ConnectionError: If database connection is lost
    """
    # Wrap ALL database operations to catch connection errors properly
    try:
        # Check for existing user - this is the only case where we return None
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            return None  # Explicit duplicate email case
    except (OperationalError, DisconnectionError, SQLTimeoutError, SQLAlchemyError) as e:
        # Database error during duplicate check - convert to friendly error
        error_info = ErrorMessageBuilder.build_message(e, "checking for existing user")
        if isinstance(e, (OperationalError, DisconnectionError)):
            raise ConnectionError(error_info['message'], e, error_info['recovery_hint'])
        elif isinstance(e, SQLTimeoutError):
            raise TransactionError(error_info['message'], e, error_info['recovery_hint'])
        else:
            raise DatabaseError(error_info['message'], e, error_info['recovery_hint'])
    
    # Create user with transaction protection
    with db_transaction(db, "creating user"):
        user = User(
            email=email,
            password_hash=hash_password(password),
            is_active=True
        )
        db.add(user)
        db.flush()
        
        # Assign roles
        for role_name in role_names:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                user_role = UserRole(user_id=user.id, role_id=role.id)
                db.add(user_role)
    
    return user

def authenticate_user(db: DBSession, email: str, password: str) -> Optional[Tuple[User, str]]:
    """
    Authenticate a user and create a session.
    
    Args:
        db: Database session
        email: User email address
        password: Plain text password to verify
        
    Returns:
        Tuple of (user, session_token) on success, None if invalid credentials
        
    Raises:
        DatabaseError: If database operation fails
        ConnectionError: If database connection is lost
    """
    # Wrap ALL database operations to catch connection errors properly
    try:
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
    except (OperationalError, DisconnectionError, SQLTimeoutError, SQLAlchemyError) as e:
        # Database error during user lookup - convert to friendly error
        error_info = ErrorMessageBuilder.build_message(e, "looking up user")
        if isinstance(e, (OperationalError, DisconnectionError)):
            raise ConnectionError(error_info['message'], e, error_info['recovery_hint'])
        elif isinstance(e, SQLTimeoutError):
            raise TransactionError(error_info['message'], e, error_info['recovery_hint'])
        else:
            raise DatabaseError(error_info['message'], e, error_info['recovery_hint'])
    
    # Invalid credentials - this is the only case where we return None
    if not user or not verify_password(password, user.password_hash):
        return None
    
    # Create session with transaction protection
    with db_transaction(db, "creating session"):
        session_token = generate_session_token()
        token_hash = hash_token(session_token)
        
        session = Session(
            user_id=user.id,
            token_hash=token_hash,
            issued_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=SESSION_EXPIRY_DAYS),
            user_agent=None
        )
        db.add(session)
        
        user.last_login = datetime.utcnow()
    
    return user, session_token

def validate_session(db: DBSession, session_token: str) -> Optional[User]:
    """Validate a session token and return the user if valid."""
    token_hash = hash_token(session_token)
    
    session = db.query(Session).filter(
        Session.token_hash == token_hash,
        Session.expires_at > datetime.utcnow()
    ).first()
    
    if not session:
        return None
    
    session.last_seen = datetime.utcnow()
    db.commit()
    
    user = db.query(User).filter(User.id == session.user_id, User.is_active == True).first()
    return user

def logout_user(db: DBSession, session_token: str):
    """Invalidate a session token."""
    token_hash = hash_token(session_token)
    session = db.query(Session).filter(Session.token_hash == token_hash).first()
    if session:
        db.delete(session)
        db.commit()

def get_user_roles(db: DBSession, user: User) -> List[str]:
    """Get all role names for a user."""
    role_ids = [ur.role_id for ur in user.user_roles]
    roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
    return [role.name for role in roles]

def user_has_role(db: DBSession, user: User, role_name: str) -> bool:
    """Check if a user has a specific role."""
    roles = get_user_roles(db, user)
    return role_name in roles

def init_roles(db: DBSession):
    """Initialize default roles if they don't exist."""
    default_roles = [
        ('admin', 'Full system access, can manage users and all features'),
        ('researcher', 'Can create and run simulations, scenarios, and optimizations'),
        ('viewer', 'Read-only access to simulations and results')
    ]
    
    for role_name, description in default_roles:
        existing_role = db.query(Role).filter(Role.name == role_name).first()
        if not existing_role:
            role = Role(name=role_name, description=description)
            db.add(role)
    
    db.commit()

def bootstrap_admin(db: DBSession, email: str, password: str) -> bool:
    """Create an admin user if no admin exists."""
    admin_role = db.query(Role).filter(Role.name == 'admin').first()
    if not admin_role:
        init_roles(db)
        admin_role = db.query(Role).filter(Role.name == 'admin').first()
    
    existing_admin = db.query(User).join(UserRole).filter(
        UserRole.role_id == admin_role.id
    ).first()
    
    if existing_admin:
        return False
    
    user = create_user(db, email, password, ['admin'])
    return user is not None

class AuthManager:
    """Manages authentication state and UI for Streamlit."""
    
    @staticmethod
    def is_auth_enabled() -> bool:
        """Check if authentication is enabled via environment variable."""
        return os.getenv('AUTH_ENABLED', 'false').lower() == 'true'
    
    @staticmethod
    def initialize():
        """Initialize authentication system and session state."""
        if 'auth_initialized' not in st.session_state:
            st.session_state.auth_initialized = True
            st.session_state.current_user = None
            st.session_state.session_token = None
            st.session_state.user_roles = []
        
        if not AuthManager.is_auth_enabled():
            st.session_state.auth_bypass = True
            return
        
        engine = get_engine()
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            init_roles(db)
            
            if st.session_state.session_token:
                user = validate_session(db, st.session_state.session_token)
                if user:
                    st.session_state.current_user = user
                    st.session_state.user_roles = get_user_roles(db, user)
                else:
                    st.session_state.session_token = None
                    st.session_state.current_user = None
                    st.session_state.user_roles = []
        finally:
            db.close()
    
    @staticmethod
    def render_login():
        """Render the login form."""
        st.title("🔐 NexusOS Login")
        st.markdown("### Regenerative Economic System Simulator")
        
        st.divider()
        
        with st.form("login_form"):
            email = st.text_input("Email", placeholder="user@example.com")
            password = st.text_input("Password", type="password")
            submit = st.form_submit_button("Login", use_container_width=True)
            
            if submit:
                if not email or not password:
                    st.error("❌ Missing credentials\nPlease enter both email and password\n💡 All fields are required to log in.")
                    return
                
                engine = get_engine()
                SessionLocal = sessionmaker(bind=engine)
                db = SessionLocal()
                
                try:
                    result = authenticate_user(db, email, password)
                    if result:
                        user, session_token = result
                        st.session_state.session_token = session_token
                        st.session_state.current_user = user
                        st.session_state.user_roles = get_user_roles(db, user)
                        st.success(f"Welcome back, {user.email}!")
                        st.rerun()
                    else:
                        st.error("❌ Invalid credentials\nEmail or password is incorrect\n💡 Check your email and password, or contact your administrator for help.")
                except (DatabaseError, ConstraintViolationError, ConnectionError) as e:
                    st.error(e.get_user_message())
                except Exception as e:
                    st.error(f"❌ Login failed: {str(e)}\n💡 Please try again or contact support if the problem persists.")
                finally:
                    db.close()
        
        st.divider()
        
        with st.expander("ℹ️ About NexusOS"):
            st.markdown("""
            NexusOS is a comprehensive economic system simulator implementing 
            self-regulating issuance/burn mechanics with PID feedback control.
            
            **Features:**
            - Real-time simulation and visualization
            - Advanced scenario analysis (Monte Carlo, Sensitivity, Stability)
            - Multi-agent network modeling
            - Smart contract code generation
            - Oracle integration for real-world data
            - ML-based parameter optimization
            
            Contact your administrator for access credentials.
            """)
    
    @staticmethod
    def render_logout():
        """Render logout button in sidebar."""
        if not AuthManager.is_auth_enabled():
            return
        
        if st.session_state.current_user:
            with st.sidebar:
                st.divider()
                st.write(f"👤 **{st.session_state.current_user.email}**")
                st.write(f"🎭 Roles: {', '.join(st.session_state.user_roles)}")
                
                if st.button("🚪 Logout", use_container_width=True):
                    engine = get_engine()
                    SessionLocal = sessionmaker(bind=engine)
                    db = SessionLocal()
                    
                    try:
                        if st.session_state.session_token:
                            logout_user(db, st.session_state.session_token)
                    finally:
                        db.close()
                    
                    st.session_state.session_token = None
                    st.session_state.current_user = None
                    st.session_state.user_roles = []
                    st.rerun()
    
    @staticmethod
    def is_authenticated() -> bool:
        """Check if user is authenticated (or auth is disabled)."""
        if not AuthManager.is_auth_enabled():
            return True
        return st.session_state.current_user is not None
    
    @staticmethod
    def has_role(role_name: str) -> bool:
        """Check if current user has a specific role."""
        if not AuthManager.is_auth_enabled():
            return True
        return role_name in st.session_state.user_roles
    
    @staticmethod
    def require_role(role_name: str) -> bool:
        """
        Check if user has required role, show error if not.
        Returns True if user has permission, False otherwise.
        """
        if not AuthManager.is_auth_enabled():
            return True
        
        if AuthManager.has_role(role_name):
            return True
        
        st.error(f"⛔ Access denied. This feature requires the '{role_name}' role.")
        st.info(f"Your roles: {', '.join(st.session_state.user_roles) if st.session_state.user_roles else 'None'}")
        return False
