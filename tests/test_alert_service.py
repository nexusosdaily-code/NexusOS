"""
Unit tests for Alert Service

Tests alert rule creation, evaluation logic, CRUD operations,
event management, and alert lifecycle.
"""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, AlertRule, AlertEvent, User, Role
from alert_service import AlertService


@pytest.fixture(scope='function')
def db_session():
    """Create an in-memory SQLite database for testing"""
    engine = create_engine('sqlite:///:memory:', echo=False)
    
    # Enable foreign key support
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


@pytest.fixture(scope='function')
def alert_service(db_session):
    """Create AlertService instance with test database"""
    # Create a sessionmaker that returns the same test session
    test_session_factory = lambda: db_session
    
    # Explicitly set test_mode=True to prevent closing the shared session
    service = AlertService(session_factory=test_session_factory, test_mode=True)
    return service


@pytest.fixture(scope='function')
def test_user(db_session):
    """Create a test user for alert ownership"""
    user = User(email='testuser@example.com', password_hash='hash', is_active=True)
    db_session.add(user)
    db_session.commit()
    return user


class TestAlertRuleCreation:
    """Tests for creating alert rules"""
    
    def test_create_basic_rule(self, alert_service, test_user):
        """Test creating a basic alert rule"""
        rule = alert_service.create_rule(
            name='High Nexus Alert',
            metric_key='final_N',
            comparator='gt',
            threshold=2000.0,
            severity='warning',
            created_by=test_user.id
        )
        
        assert rule.id is not None
        assert rule.name == 'High Nexus Alert'
        assert rule.metric_key == 'final_N'
        assert rule.comparator == 'gt'
        assert rule.threshold == 2000.0
        assert rule.is_active is True
    
    def test_create_rule_with_evaluation_window(self, alert_service, test_user):
        """Test creating rule with evaluation window"""
        rule = alert_service.create_rule(
            name='Conservation Error',
            metric_key='conservation_error',
            comparator='gt',
            threshold=0.1,
            severity='critical',
            created_by=test_user.id,
            evaluation_window=60
        )
        
        assert rule.evaluation_window == 60
        assert rule.severity == 'critical'
    
    def test_create_multiple_rules(self, alert_service, test_user):
        """Test creating multiple alert rules"""
        rule1 = alert_service.create_rule(
            name='Rule 1', metric_key='final_N', comparator='gt',
            threshold=1000.0, created_by=test_user.id
        )
        rule2 = alert_service.create_rule(
            name='Rule 2', metric_key='avg_issuance', comparator='lt',
            threshold=50.0, created_by=test_user.id
        )
        
        assert rule1.id != rule2.id
        assert rule1.name == 'Rule 1'
        assert rule2.name == 'Rule 2'


class TestAlertRuleEvaluation:
    """Tests for alert rule evaluation logic"""
    
    def test_evaluate_greater_than(self, alert_service, test_user):
        """Test greater than comparison"""
        rule = alert_service.create_rule(
            name='Test GT', metric_key='test_metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        
        # Should trigger
        assert alert_service.evaluate_rule(rule, {'test_metric': 150.0}) is True
        
        # Should not trigger
        assert alert_service.evaluate_rule(rule, {'test_metric': 50.0}) is False
        assert alert_service.evaluate_rule(rule, {'test_metric': 100.0}) is False
    
    def test_evaluate_less_than(self, alert_service, test_user):
        """Test less than comparison"""
        rule = alert_service.create_rule(
            name='Test LT', metric_key='test_metric', comparator='lt',
            threshold=100.0, created_by=test_user.id
        )
        
        assert alert_service.evaluate_rule(rule, {'test_metric': 50.0}) is True
        assert alert_service.evaluate_rule(rule, {'test_metric': 150.0}) is False
    
    def test_evaluate_equal(self, alert_service, test_user):
        """Test equality comparison"""
        rule = alert_service.create_rule(
            name='Test EQ', metric_key='test_metric', comparator='eq',
            threshold=100.0, created_by=test_user.id
        )
        
        assert alert_service.evaluate_rule(rule, {'test_metric': 100.0}) is True
        assert alert_service.evaluate_rule(rule, {'test_metric': 100.00005}) is True
        assert alert_service.evaluate_rule(rule, {'test_metric': 101.0}) is False
    
    def test_evaluate_missing_metric(self, alert_service, test_user):
        """Test evaluation with missing metric"""
        rule = alert_service.create_rule(
            name='Test Missing', metric_key='missing_metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        
        assert alert_service.evaluate_rule(rule, {'other_metric': 50.0}) is False
    
    def test_evaluate_none_value(self, alert_service, test_user):
        """Test evaluation with None metric value"""
        rule = alert_service.create_rule(
            name='Test None', metric_key='test_metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        
        assert alert_service.evaluate_rule(rule, {'test_metric': None}) is False


class TestAlertEventManagement:
    """Tests for alert event creation and management"""
    
    def test_evaluate_all_rules_creates_event(self, alert_service, test_user, db_session):
        """Test that triggered rule creates alert event"""
        rule = alert_service.create_rule(
            name='Create Event Test', metric_key='nexus_state', comparator='gt',
            threshold=1500.0, created_by=test_user.id
        )
        
        metrics = {'nexus_state': 2000.0}
        triggered = alert_service.evaluate_all_rules(metrics)
        
        assert len(triggered) == 1
        assert triggered[0]['rule'].id == rule.id
        assert triggered[0]['event'].status == 'active'
    
    def test_no_duplicate_events(self, alert_service, test_user, db_session):
        """Test that existing active alert prevents duplicate"""
        rule = alert_service.create_rule(
            name='Duplicate Test', metric_key='nexus_state', comparator='gt',
            threshold=1500.0, created_by=test_user.id
        )
        
        metrics = {'nexus_state': 2000.0}
        
        # First evaluation creates event
        triggered1 = alert_service.evaluate_all_rules(metrics)
        assert len(triggered1) == 1
        
        # Second evaluation should not create duplicate
        triggered2 = alert_service.evaluate_all_rules(metrics)
        assert len(triggered2) == 0
    
    def test_acknowledge_alert(self, alert_service, test_user, db_session):
        """Test acknowledging an alert event"""
        rule = alert_service.create_rule(
            name='Ack Test', metric_key='metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        
        # Create event
        alert_service.evaluate_all_rules({'metric': 200.0})
        events = alert_service.get_active_alerts()
        assert len(events) > 0
        
        # Acknowledge
        event_id = events[0].id
        alert_service.acknowledge_alert(event_id, test_user.id)
        
        # Verify
        event = db_session.query(AlertEvent).filter_by(id=event_id).first()
        assert event.acknowledged_by == test_user.id
        assert event.acknowledged_at is not None
    
    def test_resolve_alert(self, alert_service, test_user, db_session):
        """Test resolving an alert event"""
        rule = alert_service.create_rule(
            name='Resolve Test', metric_key='metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        
        # Create event
        alert_service.evaluate_all_rules({'metric': 200.0})
        events = alert_service.get_active_alerts()
        event_id = events[0].id
        
        # Resolve
        alert_service.resolve_alert(event_id)
        
        # Verify
        event = db_session.query(AlertEvent).filter_by(id=event_id).first()
        assert event.status == 'resolved'
        assert event.resolved_at is not None


class TestAlertRuleCRUD:
    """Tests for alert rule CRUD operations"""
    
    def test_get_active_rules(self, alert_service, test_user):
        """Test retrieving only active rules"""
        rule1 = alert_service.create_rule(
            name='Active 1', metric_key='m1', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        rule2 = alert_service.create_rule(
            name='Active 2', metric_key='m2', comparator='lt',
            threshold=50.0, created_by=test_user.id
        )
        
        # Deactivate one
        alert_service.toggle_rule(rule2.id, False)
        
        active = alert_service.get_active_rules()
        assert len(active) == 1
        assert active[0].id == rule1.id
    
    def test_toggle_rule(self, alert_service, test_user, db_session):
        """Test toggling rule active state"""
        rule = alert_service.create_rule(
            name='Toggle Test', metric_key='metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        
        assert rule.is_active is True
        
        # Deactivate
        alert_service.toggle_rule(rule.id, False)
        updated = db_session.query(AlertRule).filter_by(id=rule.id).first()
        assert updated.is_active is False
        
        # Reactivate
        alert_service.toggle_rule(rule.id, True)
        updated = db_session.query(AlertRule).filter_by(id=rule.id).first()
        assert updated.is_active is True
    
    def test_delete_rule(self, alert_service, test_user, db_session):
        """Test deleting an alert rule"""
        rule = alert_service.create_rule(
            name='Delete Test', metric_key='metric', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        rule_id = rule.id
        
        alert_service.delete_rule(rule_id)
        
        deleted = db_session.query(AlertRule).filter_by(id=rule_id).first()
        assert deleted is None


class TestProductionMode:
    """Test that production mode handles sessions correctly."""
    
    def test_production_mode_closes_sessions_and_objects_usable(self, db_session, test_user):
        """Verify sessions close in production mode and objects remain usable."""
        from sqlalchemy.orm import sessionmaker
        
        # Get the engine from the test session
        engine = db_session.get_bind()
        
        # Create a proper sessionmaker that creates NEW sessions (like production)
        production_sessionmaker = sessionmaker(bind=engine, expire_on_commit=False)
        
        # Create a production-mode service (test_mode=False)
        production_service = AlertService(
            session_factory=production_sessionmaker, 
            test_mode=False  # Production mode - will close sessions
        )
        
        # Create a rule - session should close after this
        rule = production_service.create_rule(
            name="Prod Test Rule",
            metric_key="test_metric",
            comparator="gt",
            threshold=100.0,
            severity="warning",
            created_by=test_user.id
        )
        
        # Object should remain usable even though session closed
        # This tests that expire_on_commit=False works correctly
        assert rule.id is not None
        assert rule.name == "Prod Test Rule"
        assert rule.metric_key == "test_metric"
        assert rule.threshold == 100.0
        
        # Get rules - should also work and objects should be usable
        rules = production_service.get_all_rules()
        assert len(rules) > 0
        assert rules[0].name == "Prod Test Rule"
        assert rules[0].is_active == True


class TestAlertStatistics:
    """Tests for alert statistics"""
    
    def test_get_statistics(self, alert_service, test_user):
        """Test retrieving alert statistics"""
        # Create rules
        rule1 = alert_service.create_rule(
            name='Stat Test 1', metric_key='m1', comparator='gt',
            threshold=100.0, created_by=test_user.id
        )
        rule2 = alert_service.create_rule(
            name='Stat Test 2', metric_key='m2', comparator='lt',
            threshold=50.0, created_by=test_user.id
        )
        
        # Trigger one
        alert_service.evaluate_all_rules({'m1': 200.0, 'm2': 60.0})
        
        stats = alert_service.get_alert_statistics()
        assert stats['total_rules'] == 2
        assert stats['active_rules'] == 2
        assert stats['active_alerts'] >= 1


class TestComparatorConstants:
    """Tests for comparator constants"""
    
    def test_comparator_functions(self):
        """Test that all comparators work correctly"""
        assert AlertService.COMPARATORS['gt'](150, 100) is True
        assert AlertService.COMPARATORS['gt'](50, 100) is False
        
        assert AlertService.COMPARATORS['gte'](100, 100) is True
        assert AlertService.COMPARATORS['gte'](150, 100) is True
        
        assert AlertService.COMPARATORS['lt'](50, 100) is True
        assert AlertService.COMPARATORS['lt'](150, 100) is False
        
        assert AlertService.COMPARATORS['lte'](100, 100) is True
        assert AlertService.COMPARATORS['lte'](50, 100) is True
        
        assert AlertService.COMPARATORS['eq'](100.0, 100.0) is True
        assert AlertService.COMPARATORS['eq'](100.00005, 100.0) is True
        
        assert AlertService.COMPARATORS['neq'](150.0, 100.0) is True
        assert AlertService.COMPARATORS['neq'](100.0, 100.0) is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
