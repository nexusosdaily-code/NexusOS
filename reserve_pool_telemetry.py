"""
Reserve Pool Telemetry Module
Monitors reserve pool burn/issuance flows and projects F_floor coverage
for AI governance enforcement of basic human living standards

Hierarchical Architecture:
  Reserve Pools → F_floor → Service Pools
  
  Reserve pools (VALIDATOR_POOL, TRANSITION_RESERVE, ECOSYSTEM_FUND)
  support F_floor which then enables all economic service pools:
  - DEX Pool, Investment Pool, Staking Pool, Bonus Pool, Lottery Pool
  - Environmental Pool, Recycling Pool, Product/Service Pool, etc.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import numpy as np

# Pool ecosystem integration
try:
    from pool_ecosystem import get_pool_ecosystem, PoolLayer
except ImportError:
    get_pool_ecosystem = None
    PoolLayer = None


@dataclass
class ReservePoolSnapshot:
    """Snapshot of reserve pool state at a point in time"""
    timestamp: str
    validator_reserve: float
    transition_reserve: float  # From orbital transitions (burns)
    ecosystem_reserve: float
    total_circulating: float
    f_floor_value: float  # Current F_floor setting
    burn_rate_24h: float  # Recent burn rate
    issuance_rate_24h: float  # Recent issuance rate
    
    @property
    def total_reserves(self) -> float:
        return self.validator_reserve + self.transition_reserve + self.ecosystem_reserve
    
    @property
    def net_flow_24h(self) -> float:
        """Net change in reserves (issuance - burns)"""
        return self.issuance_rate_24h - self.burn_rate_24h


@dataclass
class FFloorProjection:
    """Projection of F_floor coverage sustainability"""
    current_f_floor: float
    reserve_coverage_years: float  # Years of F_floor payments reserves can cover
    min_reserve_threshold: float  # Minimum reserves needed for F_floor
    is_sustainable: bool  # Can we maintain F_floor?
    risk_level: str  # "safe", "warning", "critical"
    recommended_action: str


class ReservePoolTelemetry:
    """
    Monitors reserve pool state and projects F_floor sustainability
    Critical for AI governance enforcement of basic living standards
    """
    
    def __init__(self):
        self.history: List[ReservePoolSnapshot] = []
        # BHLS monthly allocation per citizen (physics-derived from living costs)
        # Food 250 + Water 50 + Housing 400 + Energy 150 + Healthcare 200 + Connectivity 75 + Recycling 25 = 1,150 NXT/month
        self.f_floor_minimum_monthly = 1150.0
        self.f_floor_minimum_daily = 1150.0 / 30.0  # ~38.33 NXT/day for projections
        
    def record_snapshot(self, snapshot: ReservePoolSnapshot):
        """Record current reserve pool state"""
        self.history.append(snapshot)
        
        # Keep last 1000 snapshots
        if len(self.history) > 1000:
            self.history = self.history[-1000:]
    
    def get_current_state(self) -> Optional[ReservePoolSnapshot]:
        """Get most recent snapshot"""
        return self.history[-1] if self.history else None
    
    def project_f_floor_coverage(self, 
                                 current_snapshot: ReservePoolSnapshot,
                                 beneficiary_count: int,
                                 projection_years: int = 100,
                                 include_service_pools: bool = True) -> FFloorProjection:
        """
        Project how long reserves can sustain F_floor payments and service pools
        
        Hierarchical Flow:
          Reserve Pools → F_floor → Service Pools (DEX, Investment, Staking, etc.)
        
        Args:
            current_snapshot: Current reserve state
            beneficiary_count: Number of people receiving F_floor payments
            projection_years: Years to project forward (default 100 for civilization sustainability)
            include_service_pools: Whether to account for service pool requirements
        
        Returns:
            FFloorProjection with sustainability analysis
        """
        # Calculate ACTUAL F_floor obligation load
        # F_floor represents daily basic living standards payment per person
        daily_f_floor_obligation = current_snapshot.f_floor_value * beneficiary_count
        annual_f_floor_obligation = daily_f_floor_obligation * 365
        
        # F_floor also enables service pools - account for their requirements
        service_pool_load = 0.0
        if include_service_pools and get_pool_ecosystem is not None:
            pool_eco = get_pool_ecosystem()
            service_pools = pool_eco.get_pools_by_layer(PoolLayer.SERVICE)
            # Service pools require operational reserves (estimate 10% of their transaction volume)
            service_pool_load = sum(pool.metrics.volume_24h * 0.1 for pool in service_pools)
        
        # Total daily obligation = F_floor payments + service pool requirements
        total_daily_obligation = daily_f_floor_obligation + service_pool_load
        annual_total_obligation = total_daily_obligation * 365
        
        # Minimum reserves = 10 years of TOTAL obligations (F_floor + service pools)
        min_reserve_threshold = annual_total_obligation * 10
        
        # Calculate NET flow after subtracting TOTAL obligations (F_floor + service pools)
        # net_flow = (issuance - burns) - (F_floor_obligations + Service_Pool_Requirements)
        total_reserves = current_snapshot.total_reserves
        net_daily_flow = current_snapshot.net_flow_24h - total_daily_obligation
        
        # Project coverage including TOTAL obligation load (F_floor + service pools)
        service_pool_note = f" + service pools ({service_pool_load:.2f} NXT/day)" if service_pool_load > 0 else ""
        
        if net_daily_flow >= 0:
            # Reserves growing even after all obligations - sustainable
            coverage_years = float('inf')
            is_sustainable = True
            risk_level = "safe"
            recommended_action = f"Sustainable - reserves growing {net_daily_flow:.2f} NXT/day after F_floor{service_pool_note}"
        else:
            # Reserves depleting after all obligations
            daily_deficit = abs(net_daily_flow)
            days_until_depletion = total_reserves / daily_deficit if daily_deficit > 0 else float('inf')
            coverage_years = days_until_depletion / 365.0
            
            if coverage_years >= projection_years:
                is_sustainable = True
                risk_level = "safe"
                recommended_action = f"Adequate - {coverage_years:.0f} years coverage after F_floor{service_pool_note}"
            elif coverage_years >= projection_years * 0.5:
                is_sustainable = True
                risk_level = "warning"
                recommended_action = f"WARNING: {coverage_years:.0f} years coverage remaining. Deficit: {daily_deficit:.2f} NXT/day for F_floor{service_pool_note}"
            else:
                is_sustainable = False
                risk_level = "critical"
                recommended_action = f"CRITICAL: {coverage_years:.0f} years until system unsustainable. Deficit: {daily_deficit:.2f} NXT/day for F_floor{service_pool_note}"
        
        # Check if current reserves meet minimum threshold
        if total_reserves < min_reserve_threshold:
            risk_level = "critical"
            is_sustainable = False
            recommended_action = f"CRITICAL: Reserves {total_reserves:.0f} NXT below minimum {min_reserve_threshold:.0f} NXT for {beneficiary_count} beneficiaries"
        
        return FFloorProjection(
            current_f_floor=current_snapshot.f_floor_value,
            reserve_coverage_years=coverage_years,
            min_reserve_threshold=min_reserve_threshold,
            is_sustainable=is_sustainable,
            risk_level=risk_level,
            recommended_action=recommended_action
        )
    
    def validate_f_floor_change(self, 
                               requested_f_floor: float,
                               beneficiary_count: int,
                               current_snapshot: Optional[ReservePoolSnapshot] = None) -> tuple[bool, str]:
        """
        Validate F_floor change request against both minimum AND sustainability
        
        Args:
            requested_f_floor: Requested F_floor value
            beneficiary_count: Number of people receiving F_floor payments
            current_snapshot: Current reserve state (if available)
        
        Returns:
            (is_valid, message)
        """
        # FIRST: Enforce absolute minimum (monthly BHLS allocation)
        if requested_f_floor < self.f_floor_minimum_monthly:
            return (False, 
                    f"⚠️ REJECTED: F_floor ({requested_f_floor}) below minimum basic living standards "
                    f"({self.f_floor_minimum_monthly} NXT/month). This violates civilization sustainability constraints.")
        
        # SECOND: Check sustainability if we have reserve data
        if current_snapshot is not None:
            # Create hypothetical snapshot with new F_floor
            test_snapshot = ReservePoolSnapshot(
                timestamp=current_snapshot.timestamp,
                validator_reserve=current_snapshot.validator_reserve,
                transition_reserve=current_snapshot.transition_reserve,
                ecosystem_reserve=current_snapshot.ecosystem_reserve,
                total_circulating=current_snapshot.total_circulating,
                f_floor_value=requested_f_floor,  # NEW value
                burn_rate_24h=current_snapshot.burn_rate_24h,
                issuance_rate_24h=current_snapshot.issuance_rate_24h
            )
            
            # Project coverage with new F_floor
            projection = self.project_f_floor_coverage(test_snapshot, beneficiary_count)
            
            # Reject if unsustainable
            if projection.risk_level == "critical":
                return (False,
                        f"⚠️ REJECTED: F_floor ({requested_f_floor}) unsustainable. {projection.recommended_action}")
            elif projection.risk_level == "warning":
                return (True,
                        f"⚠️ WARNING: F_floor ({requested_f_floor}) approved but risky. {projection.recommended_action}")
        
        return (True, f"✅ F_floor ({requested_f_floor}) approved - meets minimum and sustainability requirements")
    
    def enforce_f_floor_minimum(self, requested_f_floor: float) -> tuple[bool, str]:
        """
        Legacy method - enforce only minimum (use validate_f_floor_change for full validation)
        
        Args:
            requested_f_floor: Requested F_floor value
        
        Returns:
            (is_valid, message)
        """
        if requested_f_floor < self.f_floor_minimum_monthly:
            return (False, 
                    f"⚠️ REJECTED: F_floor ({requested_f_floor}) below minimum basic living standards "
                    f"({self.f_floor_minimum_monthly} NXT/month). This violates civilization sustainability constraints.")
        
        return (True, f"✅ F_floor ({requested_f_floor}) meets minimum basic living standards ({self.f_floor_minimum_monthly} NXT/month)")
    
    def get_burn_runway_days(self) -> float:
        """Calculate days until reserves depleted at current burn rate"""
        if not self.history:
            return float('inf')
        
        current = self.history[-1]
        if current.net_flow_24h >= 0:
            return float('inf')  # Growing
        
        daily_depletion = abs(current.net_flow_24h)
        return current.total_reserves / daily_depletion if daily_depletion > 0 else float('inf')
    
    def get_historical_burn_rate(self, days: int = 30) -> float:
        """Calculate average burn rate over recent period"""
        if len(self.history) < 2:
            return 0.0
        
        recent = self.history[-min(days, len(self.history)):]
        burn_rates = [s.burn_rate_24h for s in recent]
        return np.mean(burn_rates)
    
    def detect_reserve_anomalies(self) -> List[str]:
        """Detect unusual patterns in reserve behavior"""
        if len(self.history) < 10:
            return []
        
        anomalies = []
        recent = self.history[-10:]
        
        # Check for sudden drops in reserves
        reserve_changes = [recent[i].total_reserves - recent[i-1].total_reserves 
                          for i in range(1, len(recent))]
        
        if any(change < -1000 for change in reserve_changes):
            anomalies.append("Sudden large reserve depletion detected")
        
        # Check for accelerating burn rates
        burn_rates = [s.burn_rate_24h for s in recent]
        if len(burn_rates) >= 5:
            early_avg = np.mean(burn_rates[:3])
            late_avg = np.mean(burn_rates[-3:])
            if late_avg > early_avg * 1.5:
                anomalies.append("Burn rate accelerating rapidly")
        
        # Check F_floor violations (compare against daily minimum for snapshot-level checks)
        if any(s.f_floor_value < self.f_floor_minimum_daily for s in recent):
            anomalies.append("F_floor violation detected in recent history")
        
        return anomalies


def create_snapshot_from_token_system(token_system, f_floor_value: float) -> ReservePoolSnapshot:
    """
    Create a reserve pool snapshot from NativeTokenSystem state
    
    Args:
        token_system: NativeTokenSystem instance
        f_floor_value: Current F_floor parameter value
    
    Returns:
        ReservePoolSnapshot with real reserve data
    """
    from datetime import datetime
    
    # Get real reserve balances from token system (CORRECT account names)
    validator_pool = token_system.accounts.get('VALIDATOR_POOL')
    transition_reserve_acc = token_system.accounts.get('TRANSITION_RESERVE')
    ecosystem_fund = token_system.accounts.get('ECOSYSTEM_FUND')
    
    validator_reserve = validator_pool.balance if validator_pool else 0
    transition_reserve = transition_reserve_acc.balance if transition_reserve_acc else 0
    ecosystem_reserve = ecosystem_fund.balance if ecosystem_fund else 0
    
    # Get circulating supply using correct method
    total_circulating = token_system.get_circulating_supply() / token_system.UNITS_PER_NXT
    
    # TODO: Track actual burn/issuance rates from transaction history
    # For now, use placeholder values - will be replaced with real tracking
    burn_rate_24h = 0.0
    issuance_rate_24h = 0.0
    
    return ReservePoolSnapshot(
        timestamp=datetime.now().isoformat(),
        validator_reserve=validator_reserve / token_system.UNITS_PER_NXT,  # Convert to NXT
        transition_reserve=transition_reserve / token_system.UNITS_PER_NXT,
        ecosystem_reserve=ecosystem_reserve / token_system.UNITS_PER_NXT,
        total_circulating=total_circulating,
        f_floor_value=f_floor_value,
        burn_rate_24h=burn_rate_24h,
        issuance_rate_24h=issuance_rate_24h
    )


# Global telemetry instance
_telemetry = None

def get_reserve_telemetry() -> ReservePoolTelemetry:
    """Get singleton reserve pool telemetry instance"""
    global _telemetry
    if _telemetry is None:
        _telemetry = ReservePoolTelemetry()
    return _telemetry
