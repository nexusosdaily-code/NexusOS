import streamlit as st
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import sessionmaker
from sqlalchemy import desc
import time

from database import get_engine, MonitoringSnapshot, SimulationRun, User
from oracle_sources import OracleManager

class DashboardDataService:
    """
    Singleton service for aggregating real-time dashboard data.
    Caches oracle feeds, simulation metrics, and system health.
    """
    
    def __init__(self):
        self.engine = get_engine()
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.oracle_manager = None
        self._last_oracle_refresh = None
        self._oracle_cache = {}
    
    def get_oracle_manager(self) -> OracleManager:
        """Get or create oracle manager instance."""
        if self.oracle_manager is None:
            self.oracle_manager = OracleManager()
        return self.oracle_manager
    
    def capture_snapshot(self, metrics: Dict[str, Any], user_id: Optional[int] = None) -> MonitoringSnapshot:
        """
        Capture and persist a monitoring snapshot.
        
        Args:
            metrics: Dictionary of metric key-value pairs
            user_id: Optional user ID who triggered the snapshot
            
        Returns:
            MonitoringSnapshot object
        """
        db = self.SessionLocal()
        try:
            snapshot = MonitoringSnapshot(
                captured_at=datetime.utcnow(),
                metrics=metrics,
                source_latency={},
                created_by=user_id
            )
            db.add(snapshot)
            db.commit()
            db.refresh(snapshot)
            return snapshot
        finally:
            db.close()
    
    def get_latest_metrics(self) -> Dict[str, Any]:
        """
        Get latest system metrics from most recent snapshot or simulation.
        
        Returns:
            Dictionary with latest metrics
        """
        db = self.SessionLocal()
        try:
            latest_snapshot = db.query(MonitoringSnapshot).order_by(
                desc(MonitoringSnapshot.captured_at)
            ).first()
            
            latest_run = db.query(SimulationRun).order_by(
                desc(SimulationRun.run_at)
            ).first()
            
            metrics = {
                'timestamp': datetime.utcnow().isoformat(),
                'final_N': None,
                'avg_issuance': None,
                'avg_burn': None,
                'conservation_error': None,
                'active_alerts': 0,
                'snapshot_age_seconds': None,
                'last_simulation_age_seconds': None
            }
            
            if latest_snapshot:
                age = (datetime.utcnow() - latest_snapshot.captured_at).total_seconds()
                metrics['snapshot_age_seconds'] = age
                metrics.update(latest_snapshot.metrics)
            
            if latest_run:
                age = (datetime.utcnow() - latest_run.run_at).total_seconds()
                metrics['last_simulation_age_seconds'] = age
                
                metrics.update({
                    'final_N': latest_run.final_N,
                    'avg_issuance': latest_run.avg_issuance,
                    'avg_burn': latest_run.avg_burn,
                    'conservation_error': latest_run.conservation_error
                })
            
            return metrics
        finally:
            db.close()
    
    def get_metric_history(self, metric_key: str, hours: int = 24, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get historical values for a specific metric.
        
        Args:
            metric_key: The metric to retrieve
            hours: How many hours of history to fetch
            limit: Maximum number of data points
            
        Returns:
            List of {timestamp, value} dictionaries
        """
        db = self.SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            
            snapshots = db.query(MonitoringSnapshot).filter(
                MonitoringSnapshot.captured_at >= cutoff
            ).order_by(desc(MonitoringSnapshot.captured_at)).limit(limit).all()
            
            history = []
            for snapshot in reversed(snapshots):
                if metric_key in snapshot.metrics:
                    history.append({
                        'timestamp': snapshot.captured_at.isoformat(),
                        'value': snapshot.metrics[metric_key]
                    })
            
            return history
        finally:
            db.close()
    
    @st.cache_data(ttl=10)
    def get_oracle_data(_self, refresh: bool = False) -> Dict[str, Any]:
        """
        Get current oracle data with caching.
        
        Args:
            refresh: Force refresh from oracles
            
        Returns:
            Dictionary of oracle feed values
        """
        current_time = time.time()
        
        if not refresh and _self._last_oracle_refresh:
            time_since_refresh = current_time - _self._last_oracle_refresh
            if time_since_refresh < 10:
                return _self._oracle_cache
        
        oracle_manager = _self.get_oracle_manager()
        oracle_data = {}
        
        try:
            for source in oracle_manager.sources.values():
                if source.is_connected:
                    for var_name in ['H', 'M', 'D', 'E', 'C_cons', 'C_disp']:
                        try:
                            data_point = source.fetch_data(var_name)
                            if data_point:
                                oracle_data[f"{source.name}_{var_name}"] = data_point.value
                        except:
                            pass
            
            _self._oracle_cache = oracle_data
            _self._last_oracle_refresh = current_time
            
        except Exception as e:
            print(f"Oracle fetch error: {e}")
        
        return oracle_data
    
    def get_system_health(self) -> Dict[str, Any]:
        """
        Get system health metrics including oracle status and database health.
        
        Returns:
            Dictionary with health indicators
        """
        health = {
            'database_connected': False,
            'oracle_sources': {},
            'last_simulation': None,
            'total_simulations': 0,
            'db_ping_ms': None
        }
        
        db = self.SessionLocal()
        try:
            start = time.time()
            db.execute('SELECT 1')
            health['db_ping_ms'] = (time.time() - start) * 1000
            health['database_connected'] = True
            
            sim_count = db.query(SimulationRun).count()
            health['total_simulations'] = sim_count
            
            latest_sim = db.query(SimulationRun).order_by(
                desc(SimulationRun.run_at)
            ).first()
            
            if latest_sim:
                health['last_simulation'] = latest_sim.run_at.isoformat()
        except Exception as e:
            print(f"Database health check error: {e}")
        finally:
            db.close()
        
        oracle_manager = self.get_oracle_manager()
        for name, source in oracle_manager.sources.items():
            health['oracle_sources'][name] = {
                'connected': source.is_connected,
                'type': source.__class__.__name__,
                'last_fetch': None
            }
        
        return health
    
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """
        Get complete dashboard summary including metrics, oracles, and health.
        
        Returns:
            Comprehensive dashboard data dictionary
        """
        return {
            'metrics': self.get_latest_metrics(),
            'oracles': self.get_oracle_data(),
            'health': self.get_system_health(),
            'generated_at': datetime.utcnow().isoformat()
        }

@st.cache_resource
def get_dashboard_service() -> DashboardDataService:
    """Get or create singleton DashboardDataService instance."""
    return DashboardDataService()
