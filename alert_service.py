import streamlit as st
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import sessionmaker
from sqlalchemy import desc, and_

from database import get_engine, AlertRule, AlertEvent, User

class AlertService:
    """
    Service for managing alert rules and evaluating alert conditions.
    Handles alert lifecycle: creation, evaluation, triggering, acknowledgment, resolution.
    """
    
    COMPARATORS = {
        'gt': lambda val, threshold: val > threshold,
        'gte': lambda val, threshold: val >= threshold,
        'lt': lambda val, threshold: val < threshold,
        'lte': lambda val, threshold: val <= threshold,
        'eq': lambda val, threshold: abs(val - threshold) < 0.0001,
        'neq': lambda val, threshold: abs(val - threshold) >= 0.0001
    }
    
    COMPARATOR_LABELS = {
        'gt': 'Greater Than',
        'gte': 'Greater Than or Equal',
        'lt': 'Less Than',
        'lte': 'Less Than or Equal',
        'eq': 'Equal',
        'neq': 'Not Equal'
    }
    
    SEVERITY_LEVELS = ['info', 'warning', 'error', 'critical']
    
    def __init__(self, session_factory=None, test_mode=False):
        """
        Initialize AlertService.
        
        Args:
            session_factory: Optional sessionmaker for dependency injection.
                           If None, creates default production sessionmaker.
            test_mode: Explicit flag to control session lifecycle.
                      If True, sessions won't be closed (for testing with shared sessions).
                      If False (default), sessions are closed after use (production mode).
        """
        if session_factory:
            self.SessionLocal = session_factory
        else:
            self.engine = get_engine()
            self.SessionLocal = sessionmaker(bind=self.engine, expire_on_commit=False)
        
        self._test_mode = test_mode
    
    def _get_session(self):
        """
        Get a database session.
        
        Returns:
            Tuple of (session, should_close) where should_close indicates
            whether the session should be closed after use.
        """
        session = self.SessionLocal()
        should_close = not self._test_mode
        return session, should_close
    
    def create_rule(self, name: str, metric_key: str, comparator: str, 
                   threshold: float, severity: str = 'warning', 
                   created_by: Optional[int] = None, evaluation_window: Optional[int] = None) -> AlertRule:
        """
        Create a new alert rule.
        
        Args:
            name: Human-readable rule name
            metric_key: Metric to monitor (e.g., 'final_N', 'conservation_error')
            comparator: Comparison operator ('gt', 'lt', 'eq', etc.')
            threshold: Threshold value for the alert
            severity: Alert severity level
            created_by: User ID who created the rule
            evaluation_window: Optional window in seconds for time-based evaluation
            
        Returns:
            Created AlertRule object
        """
        db, should_close = self._get_session()
        try:
            rule = AlertRule(
                name=name,
                metric_key=metric_key,
                comparator=comparator,
                threshold=threshold,
                severity=severity,
                created_by=created_by,
                evaluation_window=evaluation_window,
                is_active=True,
                channels={'in_app': True}
            )
            db.add(rule)
            db.commit()
            db.refresh(rule)
            return rule
        finally:
            if should_close:
                db.close()
    
    def get_active_rules(self) -> List[AlertRule]:
        """Get all active alert rules."""
        db, should_close = self._get_session()
        try:
            return db.query(AlertRule).filter(AlertRule.is_active == True).all()
        finally:
            if should_close:
                db.close()
    
    def get_all_rules(self) -> List[AlertRule]:
        """Get all alert rules (active and inactive)."""
        db, should_close = self._get_session()
        try:
            return db.query(AlertRule).order_by(desc(AlertRule.created_at)).all()
        finally:
            if should_close:
                db.close()
    
    def evaluate_rule(self, rule: AlertRule, current_metrics: Dict[str, Any]) -> bool:
        """
        Evaluate a single rule against current metrics.
        
        Args:
            rule: AlertRule to evaluate
            current_metrics: Current metric values
            
        Returns:
            True if alert condition is met, False otherwise
        """
        if rule.metric_key not in current_metrics:
            return False
        
        metric_value = current_metrics[rule.metric_key]
        
        if metric_value is None:
            return False
        
        comparator_func = self.COMPARATORS.get(rule.comparator)
        if not comparator_func:
            return False
        
        try:
            threshold_value = rule.threshold
            return comparator_func(float(metric_value), float(threshold_value))
        except (ValueError, TypeError):
            return False
    
    def evaluate_all_rules(self, current_metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Evaluate all active rules and trigger alerts as needed.
        
        Args:
            current_metrics: Current metric values
            
        Returns:
            List of triggered alerts with rule and event details
        """
        db, should_close = self._get_session()
        triggered_alerts = []
        
        try:
            active_rules = db.query(AlertRule).filter(AlertRule.is_active == True).all()
            
            for rule in active_rules:
                now = datetime.utcnow()
                last_eval = rule.last_evaluated_at
                
                if last_eval is not None:
                    time_since_eval = (now - last_eval).total_seconds()
                    if time_since_eval < 5:
                        continue
                
                is_triggered = self.evaluate_rule(rule, current_metrics)
                
                if is_triggered:
                    existing_active = db.query(AlertEvent).filter(
                        and_(
                            AlertEvent.rule_id == rule.id,
                            AlertEvent.status == 'active'
                        )
                    ).first()
                    
                    if not existing_active:
                        threshold_value = rule.threshold
                        event = AlertEvent(
                            rule_id=rule.id,
                            triggered_at=now,
                            status='active',
                            payload={
                                'metric_key': rule.metric_key,
                                'metric_value': current_metrics.get(rule.metric_key),
                                'threshold': float(threshold_value),
                                'comparator': rule.comparator,
                                'severity': rule.severity
                            }
                        )
                        db.add(event)
                        db.flush()
                        
                        triggered_alerts.append({
                            'rule': rule,
                            'event': event,
                            'metric_value': current_metrics.get(rule.metric_key)
                        })
                
                db.query(AlertRule).filter(AlertRule.id == rule.id).update({'last_evaluated_at': now})
            
            db.commit()
            
        finally:
            if should_close:
                db.close()
        
        return triggered_alerts
    
    def get_active_alerts(self, limit: int = 50) -> List[AlertEvent]:
        """Get currently active (unresolved) alert events."""
        db, should_close = self._get_session()
        try:
            return db.query(AlertEvent).filter(
                AlertEvent.status == 'active'
            ).order_by(desc(AlertEvent.triggered_at)).limit(limit).all()
        finally:
            if should_close:
                db.close()
    
    def get_recent_alerts(self, hours: int = 24, limit: int = 100) -> List[AlertEvent]:
        """Get recent alert events within the specified time window."""
        db, should_close = self._get_session()
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            return db.query(AlertEvent).filter(
                AlertEvent.triggered_at >= cutoff
            ).order_by(desc(AlertEvent.triggered_at)).limit(limit).all()
        finally:
            if should_close:
                db.close()
    
    def acknowledge_alert(self, event_id: int, user_id: int) -> bool:
        """
        Acknowledge an alert event.
        
        Args:
            event_id: Alert event ID
            user_id: User acknowledging the alert
            
        Returns:
            True if successful
        """
        db, should_close = self._get_session()
        try:
            event = db.query(AlertEvent).filter(AlertEvent.id == event_id).first()
            if event:
                db.query(AlertEvent).filter(AlertEvent.id == event_id).update({
                    'acknowledged_by': user_id,
                    'acknowledged_at': datetime.utcnow()
                })
                db.commit()
                return True
            return False
        finally:
            if should_close:
                db.close()
    
    def resolve_alert(self, event_id: int) -> bool:
        """
        Resolve an active alert event.
        
        Args:
            event_id: Alert event ID
            
        Returns:
            True if successful
        """
        db, should_close = self._get_session()
        try:
            event = db.query(AlertEvent).filter(AlertEvent.id == event_id).first()
            if event and str(event.status) == 'active':
                db.query(AlertEvent).filter(AlertEvent.id == event_id).update({
                    'resolved_at': datetime.utcnow(),
                    'status': 'resolved'
                })
                db.commit()
                return True
            return False
        finally:
            if should_close:
                db.close()
    
    def toggle_rule(self, rule_id: int, is_active: bool) -> bool:
        """
        Enable or disable an alert rule.
        
        Args:
            rule_id: Alert rule ID
            is_active: New active status
            
        Returns:
            True if successful
        """
        db, should_close = self._get_session()
        try:
            rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
            if rule:
                db.query(AlertRule).filter(AlertRule.id == rule_id).update({
                    'is_active': is_active,
                    'updated_at': datetime.utcnow()
                })
                db.commit()
                return True
            return False
        finally:
            if should_close:
                db.close()
    
    def delete_rule(self, rule_id: int) -> bool:
        """
        Delete an alert rule and all associated events.
        
        Args:
            rule_id: Alert rule ID
            
        Returns:
            True if successful
        """
        db, should_close = self._get_session()
        try:
            rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
            if rule:
                db.delete(rule)
                db.commit()
                return True
            return False
        finally:
            if should_close:
                db.close()
    
    def get_alert_statistics(self) -> Dict[str, Any]:
        """
        Get alert system statistics.
        
        Returns:
            Dictionary with alert metrics
        """
        db, should_close = self._get_session()
        try:
            total_rules = db.query(AlertRule).count()
            active_rules = db.query(AlertRule).filter(AlertRule.is_active == True).count()
            active_alerts = db.query(AlertEvent).filter(AlertEvent.status == 'active').count()
            
            last_24h = datetime.utcnow() - timedelta(hours=24)
            alerts_24h = db.query(AlertEvent).filter(
                AlertEvent.triggered_at >= last_24h
            ).count()
            
            return {
                'total_rules': total_rules,
                'active_rules': active_rules,
                'active_alerts': active_alerts,
                'alerts_last_24h': alerts_24h
            }
        finally:
            if should_close:
                db.close()

@st.cache_resource
def get_alert_service() -> AlertService:
    """Get or create singleton AlertService instance."""
    return AlertService()
