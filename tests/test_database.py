"""
Unit tests for Database Models

Tests CRUD operations, foreign key constraints, cascading deletes,
and data integrity for all SQLAlchemy models.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import (
    Base, SimulationConfig, SimulationRun, User, Role, UserRole,
    Session, MonitoringSnapshot, AlertRule, AlertEvent,
    OptimizationRun, OptimizationIteration
)


@pytest.fixture(scope='function')
def db_session():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine('sqlite:///:memory:', echo=False)
    
    # Enable foreign key support for SQLite
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
    
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    yield session
    
    session.close()


class TestSimulationConfig:
    """Tests for SimulationConfig model"""
    
    def test_create_simulation_config(self, db_session):
        """Test creating a simulation configuration"""
        config = SimulationConfig(
            name='Test Config',
            description='A test configuration',
            alpha=1.0, beta=1.0, kappa=0.01, eta=0.1,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.1, K_i=0.01, K_d=0.05,
            N_target=1000.0, N_initial=1000.0, F_floor=10.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1000.0, H_0=100.0, M_0=100.0,
            delta_t=1.0, num_steps=1000,
            signal_config={'H': {'type': 'constant', 'value': 100.0}}
        )
        
        db_session.add(config)
        db_session.commit()
        
        assert config.id is not None
        assert config.name == 'Test Config'
        assert config.created_at is not None
    
    def test_query_simulation_config(self, db_session):
        """Test querying simulation configurations"""
        config1 = SimulationConfig(
            name='Config 1', description='First config',
            alpha=1.0, beta=1.0, kappa=0.01, eta=0.1,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.1, K_i=0.01, K_d=0.05,
            N_target=1000.0, N_initial=1000.0, F_floor=10.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1000.0, H_0=100.0, M_0=100.0,
            delta_t=1.0, num_steps=1000
        )
        config2 = SimulationConfig(
            name='Config 2', description='Second config',
            alpha=1.5, beta=1.2, kappa=0.02, eta=0.15,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.2, K_i=0.02, K_d=0.1,
            N_target=1500.0, N_initial=1500.0, F_floor=15.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1500.0, H_0=150.0, M_0=150.0,
            delta_t=1.0, num_steps=2000
        )
        
        db_session.add_all([config1, config2])
        db_session.commit()
        
        results = db_session.query(SimulationConfig).all()
        assert len(results) == 2
        
        found = db_session.query(SimulationConfig).filter_by(name='Config 1').first()
        assert found.alpha == 1.0
    
    def test_update_simulation_config(self, db_session):
        """Test updating a simulation configuration"""
        config = SimulationConfig(
            name='Original Name', description='Original',
            alpha=1.0, beta=1.0, kappa=0.01, eta=0.1,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.1, K_i=0.01, K_d=0.05,
            N_target=1000.0, N_initial=1000.0, F_floor=10.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1000.0, H_0=100.0, M_0=100.0,
            delta_t=1.0, num_steps=1000
        )
        
        db_session.add(config)
        db_session.commit()
        
        config.name = 'Updated Name'
        config.alpha = 2.0
        db_session.commit()
        
        updated = db_session.query(SimulationConfig).filter_by(id=config.id).first()
        assert updated.name == 'Updated Name'
        assert updated.alpha == 2.0
    
    def test_delete_simulation_config(self, db_session):
        """Test deleting a simulation configuration"""
        config = SimulationConfig(
            name='To Delete', description='Will be deleted',
            alpha=1.0, beta=1.0, kappa=0.01, eta=0.1,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.1, K_i=0.01, K_d=0.05,
            N_target=1000.0, N_initial=1000.0, F_floor=10.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1000.0, H_0=100.0, M_0=100.0,
            delta_t=1.0, num_steps=1000
        )
        
        db_session.add(config)
        db_session.commit()
        config_id = config.id
        
        db_session.delete(config)
        db_session.commit()
        
        result = db_session.query(SimulationConfig).filter_by(id=config_id).first()
        assert result is None


class TestSimulationRun:
    """Tests for SimulationRun model"""
    
    def test_create_simulation_run(self, db_session):
        """Test creating a simulation run"""
        run = SimulationRun(
            config_id=1,
            time_series={'N': [1000, 1010, 1020], 'I': [10, 12, 15]},
            final_N=1020.0,
            avg_issuance=12.3,
            avg_burn=8.5,
            conservation_error=0.01
        )
        
        db_session.add(run)
        db_session.commit()
        
        assert run.id is not None
        assert run.config_id == 1
        assert run.final_N == 1020.0
        assert run.run_at is not None
    
    def test_query_simulation_runs_by_config(self, db_session):
        """Test querying simulation runs by config_id"""
        run1 = SimulationRun(
            config_id=1,
            time_series={'N': [1000, 1010]},
            final_N=1010.0
        )
        run2 = SimulationRun(
            config_id=1,
            time_series={'N': [1000, 1015]},
            final_N=1015.0
        )
        run3 = SimulationRun(
            config_id=2,
            time_series={'N': [2000, 2010]},
            final_N=2010.0
        )
        
        db_session.add_all([run1, run2, run3])
        db_session.commit()
        
        config1_runs = db_session.query(SimulationRun).filter_by(config_id=1).all()
        assert len(config1_runs) == 2


class TestUser:
    """Tests for User model"""
    
    def test_create_user(self, db_session):
        """Test creating a user"""
        user = User(
            email='test@example.com',
            password_hash='hashed_password_123',
            is_active=True
        )
        
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.email == 'test@example.com'
        assert user.created_at is not None
    
    def test_user_email_unique_constraint(self, db_session):
        """Test that email must be unique"""
        user1 = User(email='duplicate@example.com', password_hash='hash1')
        user2 = User(email='duplicate@example.com', password_hash='hash2')
        
        db_session.add(user1)
        db_session.commit()
        
        db_session.add(user2)
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()
    
    def test_update_user_last_login(self, db_session):
        """Test updating user last login time"""
        user = User(email='login@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        now = datetime.utcnow()
        user.last_login = now
        db_session.commit()
        
        updated = db_session.query(User).filter_by(id=user.id).first()
        assert updated.last_login is not None


class TestUserRoleRelationships:
    """Tests for User-Role relationships"""
    
    def test_create_role(self, db_session):
        """Test creating a role"""
        role = Role(name='admin', description='Administrator role')
        db_session.add(role)
        db_session.commit()
        
        assert role.id is not None
        assert role.name == 'admin'
    
    def test_assign_role_to_user(self, db_session):
        """Test assigning role to user"""
        user = User(email='roletest@example.com', password_hash='hash')
        role = Role(name='researcher', description='Researcher role')
        
        db_session.add_all([user, role])
        db_session.commit()
        
        user_role = UserRole(user_id=user.id, role_id=role.id)
        db_session.add(user_role)
        db_session.commit()
        
        # Query to verify
        assigned_roles = db_session.query(UserRole).filter_by(user_id=user.id).all()
        assert len(assigned_roles) == 1
        assert assigned_roles[0].role_id == role.id
    
    def test_cascade_delete_user_roles(self, db_session):
        """Test that deleting user cascades to user_roles"""
        user = User(email='cascade@example.com', password_hash='hash')
        role = Role(name='viewer', description='Viewer role')
        
        db_session.add_all([user, role])
        db_session.commit()
        
        user_role = UserRole(user_id=user.id, role_id=role.id)
        db_session.add(user_role)
        db_session.commit()
        
        user_id = user.id
        
        # Delete user
        db_session.delete(user)
        db_session.commit()
        
        # Check that user_role was also deleted
        remaining = db_session.query(UserRole).filter_by(user_id=user_id).all()
        assert len(remaining) == 0


class TestSession:
    """Tests for Session model"""
    
    def test_create_session(self, db_session):
        """Test creating a user session"""
        user = User(email='session@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        session = Session(
            user_id=user.id,
            token_hash='token_hash_123',
            expires_at=datetime.utcnow() + timedelta(days=7),
            user_agent='Mozilla/5.0'
        )
        
        db_session.add(session)
        db_session.commit()
        
        assert session.id is not None
        assert session.user_id == user.id
        assert session.expires_at > datetime.utcnow()
    
    def test_cascade_delete_sessions_on_user_delete(self, db_session):
        """Test that deleting user cascades to sessions"""
        user = User(email='sessioncascade@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        session = Session(
            user_id=user.id,
            token_hash='token_123',
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db_session.add(session)
        db_session.commit()
        
        user_id = user.id
        
        # Delete user
        db_session.delete(user)
        db_session.commit()
        
        # Sessions should be deleted
        remaining = db_session.query(Session).filter_by(user_id=user_id).all()
        assert len(remaining) == 0


class TestAlertRuleAndEvent:
    """Tests for AlertRule and AlertEvent models"""
    
    def test_create_alert_rule(self, db_session):
        """Test creating an alert rule"""
        user = User(email='alertuser@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        rule = AlertRule(
            name='High Nexus Alert',
            metric_key='nexus_state',
            comparator='gt',
            threshold=2000.0,
            severity='critical',
            is_active=True,
            created_by=user.id
        )
        
        db_session.add(rule)
        db_session.commit()
        
        assert rule.id is not None
        assert rule.name == 'High Nexus Alert'
        assert rule.is_active is True
    
    def test_create_alert_event(self, db_session):
        """Test creating an alert event"""
        user = User(email='eventuser@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        rule = AlertRule(
            name='Test Rule',
            metric_key='test_metric',
            comparator='gt',
            threshold=100.0,
            created_by=user.id
        )
        db_session.add(rule)
        db_session.commit()
        
        event = AlertEvent(
            rule_id=rule.id,
            status='active',
            payload={'value': 150.0, 'threshold': 100.0}
        )
        db_session.add(event)
        db_session.commit()
        
        assert event.id is not None
        assert event.rule_id == rule.id
        assert event.status == 'active'
    
    def test_alert_event_cascade_delete(self, db_session):
        """Test that deleting alert rule cascades to events"""
        user = User(email='cascadetest@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        rule = AlertRule(
            name='Cascade Test',
            metric_key='metric',
            comparator='gt',
            threshold=50.0,
            created_by=user.id
        )
        db_session.add(rule)
        db_session.commit()
        
        event1 = AlertEvent(rule_id=rule.id, status='active')
        event2 = AlertEvent(rule_id=rule.id, status='resolved')
        db_session.add_all([event1, event2])
        db_session.commit()
        
        rule_id = rule.id
        
        # Delete rule
        db_session.delete(rule)
        db_session.commit()
        
        # Events should be deleted
        remaining = db_session.query(AlertEvent).filter_by(rule_id=rule_id).all()
        assert len(remaining) == 0
    
    def test_acknowledge_alert_event(self, db_session):
        """Test acknowledging an alert event"""
        user = User(email='ackuser@example.com', password_hash='hash')
        db_session.add(user)
        db_session.commit()
        
        rule = AlertRule(
            name='Ack Test',
            metric_key='metric',
            comparator='gt',
            threshold=10.0,
            created_by=user.id
        )
        db_session.add(rule)
        db_session.commit()
        
        event = AlertEvent(rule_id=rule.id, status='active')
        db_session.add(event)
        db_session.commit()
        
        # Acknowledge event
        event.acknowledged_by = user.id
        event.acknowledged_at = datetime.utcnow()
        db_session.commit()
        
        updated = db_session.query(AlertEvent).filter_by(id=event.id).first()
        assert updated.acknowledged_by == user.id
        assert updated.acknowledged_at is not None


class TestMonitoringSnapshot:
    """Tests for MonitoringSnapshot model"""
    
    def test_create_monitoring_snapshot(self, db_session):
        """Test creating a monitoring snapshot"""
        snapshot = MonitoringSnapshot(
            metrics={
                'nexus_state': 1000.0,
                'avg_issuance': 50.0,
                'avg_burn': 45.0,
                'conservation_error': 0.01
            },
            source_latency={'oracle1': 120, 'oracle2': 85}
        )
        
        db_session.add(snapshot)
        db_session.commit()
        
        assert snapshot.id is not None
        assert snapshot.captured_at is not None
        assert 'nexus_state' in snapshot.metrics


class TestOptimizationModels:
    """Tests for OptimizationRun and OptimizationIteration models"""
    
    def test_create_optimization_run(self, db_session):
        """Test creating an optimization run"""
        opt_run = OptimizationRun(
            name='Test Optimization',
            objective_type='stability',
            objective_weights={'stability': 0.5, 'growth': 0.5},
            parameters_optimized=['alpha', 'beta', 'K_p'],
            parameter_bounds={'alpha': [0.5, 2.0], 'beta': [0.5, 2.0]},
            n_iterations=50,
            best_params={'alpha': 1.2, 'beta': 1.1, 'K_p': 0.15},
            best_score=0.92
        )
        
        db_session.add(opt_run)
        db_session.commit()
        
        assert opt_run.id is not None
        assert opt_run.name == 'Test Optimization'
        assert opt_run.objective_type == 'stability'
    
    def test_create_optimization_iteration(self, db_session):
        """Test creating an optimization iteration"""
        opt_run = OptimizationRun(
            name='Test Opt',
            objective_type='growth',
            parameters_optimized=['alpha'],
            parameter_bounds={'alpha': [0.5, 2.0]},
            n_iterations=10
        )
        db_session.add(opt_run)
        db_session.commit()
        
        iteration = OptimizationIteration(
            optimization_id=opt_run.id,
            iteration_num=1,
            parameters={'alpha': 1.2},
            score=0.85,
            simulation_id=123
        )
        db_session.add(iteration)
        db_session.commit()
        
        assert iteration.id is not None
        assert iteration.optimization_id == opt_run.id
        assert iteration.iteration_num == 1
    
    def test_query_optimization_iterations(self, db_session):
        """Test querying iterations for an optimization run"""
        opt_run = OptimizationRun(
            name='Multi-iteration Test',
            objective_type='conservation',
            parameters_optimized=['K_p', 'K_i'],
            parameter_bounds={},
            n_iterations=5
        )
        db_session.add(opt_run)
        db_session.commit()
        
        for i in range(5):
            iteration = OptimizationIteration(
                optimization_id=opt_run.id,
                iteration_num=i+1,
                parameters={'K_p': 0.1 + i*0.01},
                score=0.7 + i*0.05
            )
            db_session.add(iteration)
        
        db_session.commit()
        
        iterations = db_session.query(OptimizationIteration).filter_by(
            optimization_id=opt_run.id
        ).all()
        
        assert len(iterations) == 5


class TestDataIntegrity:
    """Tests for data integrity and constraints"""
    
    def test_json_field_storage(self, db_session):
        """Test that JSON fields store and retrieve correctly"""
        config = SimulationConfig(
            name='JSON Test',
            alpha=1.0, beta=1.0, kappa=0.01, eta=0.1,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.1, K_i=0.01, K_d=0.05,
            N_target=1000.0, N_initial=1000.0, F_floor=10.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1000.0, H_0=100.0, M_0=100.0,
            delta_t=1.0, num_steps=1000,
            signal_config={
                'H': {'type': 'sinusoidal', 'amplitude': 20.0, 'offset': 100.0},
                'M': {'type': 'constant', 'value': 80.0}
            }
        )
        
        db_session.add(config)
        db_session.commit()
        
        retrieved = db_session.query(SimulationConfig).filter_by(id=config.id).first()
        assert retrieved.signal_config['H']['type'] == 'sinusoidal'
        assert retrieved.signal_config['M']['value'] == 80.0
    
    def test_nullable_fields(self, db_session):
        """Test that nullable fields work correctly"""
        config = SimulationConfig(
            name='Nullable Test',
            description=None,  # nullable
            alpha=1.0, beta=1.0, kappa=0.01, eta=0.1,
            w_H=0.4, w_M=0.3, w_D=0.2, w_E=0.1,
            gamma_C=0.5, gamma_D=0.3, gamma_E=0.2,
            K_p=0.1, K_i=0.01, K_d=0.05,
            N_target=1000.0, N_initial=1000.0, F_floor=10.0,
            lambda_E=0.3, lambda_N=0.3, lambda_H=0.2, lambda_M=0.2,
            N_0=1000.0, H_0=100.0, M_0=100.0,
            delta_t=1.0, num_steps=1000,
            signal_config=None  # nullable
        )
        
        db_session.add(config)
        db_session.commit()
        
        retrieved = db_session.query(SimulationConfig).filter_by(id=config.id).first()
        assert retrieved.description is None
        assert retrieved.signal_config is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
