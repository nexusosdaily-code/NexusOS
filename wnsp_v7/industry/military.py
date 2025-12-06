"""
Military Sector Adapter

Domain adapter for defense operations, command & control, and coalition coordination.
Supports confined dominance windows for mission-critical operations while maintaining
constitutional audit at YOCTO/PLANCK level.

Usage:
    from wnsp_v7.industry import MilitaryAdapter
    
    adapter = MilitaryAdapter()
    result = adapter.issue_command(
        commander_id="CDR-001",
        command_type="tactical",
        target_units=["UNIT-A", "UNIT-B"],
        attestations=[commander_auth, mission_context]
    )
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import hashlib

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, load_sector_policy
)


@dataclass
class DominanceWindow:
    """Confined dominance window for mission-critical operations"""
    window_id: str
    authority_id: str
    scope: List[str]
    max_authority_percent: float
    start_time: datetime
    end_time: datetime
    mission_justification: str
    audit_commitment: str
    is_active: bool = True
    
    def to_dict(self) -> Dict:
        return {
            'window_id': self.window_id,
            'authority_id': self.authority_id,
            'scope': self.scope,
            'max_authority_percent': self.max_authority_percent,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat(),
            'mission_justification': self.mission_justification,
            'audit_commitment': self.audit_commitment,
            'is_active': self.is_active,
            'remaining_hours': max(0, (self.end_time - datetime.now()).total_seconds() / 3600)
        }
    
    def is_valid(self) -> bool:
        """Check if window is still valid"""
        now = datetime.now()
        return self.is_active and self.start_time <= now <= self.end_time


@dataclass
class CommandChain:
    """Verified chain of command"""
    chain_id: str
    commands: List[Dict]
    spectral_hash: str
    is_valid: bool = True
    
    def to_dict(self) -> Dict:
        return {
            'chain_id': self.chain_id,
            'command_count': len(self.commands),
            'spectral_hash': self.spectral_hash,
            'is_valid': self.is_valid
        }


class MilitaryAdapter(IndustryAdapter):
    """
    Military sector adapter for defense operations.
    
    Key Operations:
    - issue_command: Issue tactical/operational command
    - execute_order: Acknowledge and execute command
    - intel_report: Submit/query intelligence data
    - logistics: Supply chain and asset movement
    - coalition: Multi-nation coordination
    - mission_auth: Authorize specific mission
    - dominance_window: Grant temporary elevated authority
    - strategic: Strategic-level action (PLANCK)
    
    Special Feature - Confined Dominance Windows:
    Military operations may require temporary elevated authority (>5%)
    for mission-critical situations. These windows must be:
    - Time-bound: Maximum 72 hours
    - Scope-limited: Maximum 25% authority within defined scope
    - YOCTO-level authorized
    - Fully audited at YOCTO/PLANCK level
    
    Prohibited even with dominance window:
    - Civilian targeting
    - Constitutional amendment
    - Evidence destruction
    - Audit trail modification
    """
    
    def __init__(self):
        super().__init__(sector_id='military')
        self._active_windows: Dict[str, DominanceWindow] = {}
        self._command_chains: Dict[str, CommandChain] = {}
        self._roe_active: Dict[str, Dict] = {}  # Rules of engagement
    
    def _generate_chain_hash(self, commands: List[Dict]) -> str:
        """Generate spectral hash for command chain"""
        chain_str = '|'.join([str(c) for c in commands])
        return hashlib.sha256(chain_str.encode()).hexdigest()[:16]
    
    def issue_command(
        self,
        commander_id: str,
        command_type: str,
        target_units: List[str],
        command_details: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 1000.0
    ) -> OperationResult:
        """
        Issue tactical or operational command.
        
        Args:
            commander_id: Issuing commander identifier
            command_type: tactical, operational, strategic
            target_units: Units receiving command
            command_details: Command specifics
            attestations: Required (commander_authority, mission_context)
        """
        operation = IndustryOperation(
            operation_id='military.command',
            sector_id='military',
            data={
                'commander_id': commander_id,
                'command_type': command_type,
                'target_units': target_units,
                'command_details': command_details,
                'issued_at': datetime.now().isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=commander_id
        )
        
        return self.execute_operation(operation)
    
    def execute_order(
        self,
        executor_id: str,
        command_hash: str,
        execution_details: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 1000.0
    ) -> OperationResult:
        """
        Acknowledge and execute received command.
        
        Links execution to original command via hash.
        """
        operation = IndustryOperation(
            operation_id='military.execute',
            sector_id='military',
            data={
                'executor_id': executor_id,
                'command_hash': command_hash,
                'execution_details': execution_details,
                'executed_at': datetime.now().isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=executor_id
        )
        
        return self.execute_operation(operation)
    
    def intel_report(
        self,
        source_id: str,
        intel_type: str,
        classification: str,
        reliability_rating: str,
        intel_data: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100.0
    ) -> OperationResult:
        """
        Submit or query intelligence data.
        
        Classification levels: UNCLASSIFIED, CONFIDENTIAL, SECRET, TOP_SECRET
        Reliability ratings: A (confirmed), B (likely), C (possible), D (doubtful), E (improbable)
        """
        operation = IndustryOperation(
            operation_id='military.intel',
            sector_id='military',
            data={
                'source_id': source_id,
                'intel_type': intel_type,
                'classification': classification,
                'reliability_rating': reliability_rating,
                'intel_data': intel_data
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=source_id
        )
        
        return self.execute_operation(operation)
    
    def logistics(
        self,
        supply_authority_id: str,
        transaction_type: str,
        assets: List[Dict],
        destination: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10000.0
    ) -> OperationResult:
        """
        Supply chain and asset movement.
        
        transaction_type: supply, transfer, requisition, disposal
        """
        operation = IndustryOperation(
            operation_id='military.logistics',
            sector_id='military',
            data={
                'transaction_type': transaction_type,
                'assets': assets,
                'destination': destination,
                'asset_count': len(assets)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=supply_authority_id
        )
        
        return self.execute_operation(operation)
    
    def coalition(
        self,
        lead_nation: str,
        participating_nations: List[str],
        operation_name: str,
        shared_roe: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100000.0
    ) -> OperationResult:
        """
        Multi-nation operation coordination.
        
        Requires nation_signatures and shared_roe attestations.
        YOCTO-level operation with 10x energy multiplier.
        """
        operation = IndustryOperation(
            operation_id='military.coalition',
            sector_id='military',
            data={
                'lead_nation': lead_nation,
                'participating_nations': participating_nations,
                'operation_name': operation_name,
                'shared_roe': shared_roe,
                'nation_count': len(participating_nations)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=lead_nation
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._roe_active[operation_name] = shared_roe
        
        return result
    
    def mission_auth(
        self,
        authorizing_commander: str,
        mission_id: str,
        mission_brief: Dict,
        scope: List[str],
        duration_hours: int,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100000.0
    ) -> OperationResult:
        """
        Authorize specific mission with defined scope.
        
        YOCTO-level operation with 20x energy multiplier.
        """
        operation = IndustryOperation(
            operation_id='military.mission_auth',
            sector_id='military',
            data={
                'mission_id': mission_id,
                'mission_brief': mission_brief,
                'scope': scope,
                'duration_hours': duration_hours,
                'expires_at': (datetime.now() + timedelta(hours=duration_hours)).isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=authorizing_commander
        )
        
        return self.execute_operation(operation)
    
    def grant_dominance_window(
        self,
        authority_id: str,
        scope: List[str],
        duration_hours: int,
        max_authority_percent: float,
        mission_justification: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 500000.0
    ) -> OperationResult:
        """
        Grant temporary elevated authority for mission-critical operation.
        
        CONFINED DOMINANCE WINDOW RULES:
        - Maximum duration: 72 hours
        - Maximum scope authority: 25%
        - YOCTO-level authorization required
        - Full audit trail at YOCTO/PLANCK level
        - Cannot override C-0002 (Immutable Rights)
        
        PROHIBITED ACTIONS even with window:
        - Civilian targeting
        - Constitutional amendment
        - BHLS floor violation (in civilian zones)
        - Evidence destruction
        - Audit trail modification
        """
        max_duration = self.policy.constraints.get('confined_dominance_max_duration_hours', 72)
        max_scope = self.policy.constraints.get('confined_dominance_max_scope_percent', 25)
        
        if duration_hours > max_duration:
            return OperationResult(
                success=False,
                message=f"Duration {duration_hours}h exceeds maximum {max_duration}h"
            )
        
        if max_authority_percent > max_scope:
            return OperationResult(
                success=False,
                message=f"Authority {max_authority_percent}% exceeds maximum {max_scope}%"
            )
        
        window_id = f"CDW_{datetime.now().strftime('%Y%m%d%H%M%S')}_{authority_id[:8]}"
        
        operation = IndustryOperation(
            operation_id='military.dominance_window',
            sector_id='military',
            data={
                'window_id': window_id,
                'scope': scope,
                'duration_hours': duration_hours,
                'max_authority_percent': max_authority_percent,
                'mission_justification': mission_justification,
                'expires_at': (datetime.now() + timedelta(hours=duration_hours)).isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=authority_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            window = DominanceWindow(
                window_id=window_id,
                authority_id=authority_id,
                scope=scope,
                max_authority_percent=max_authority_percent,
                start_time=datetime.now(),
                end_time=datetime.now() + timedelta(hours=duration_hours),
                mission_justification=mission_justification,
                audit_commitment=result.audit_hash
            )
            self._active_windows[window_id] = window
        
        return result
    
    def revoke_dominance_window(self, window_id: str, reason: str) -> OperationResult:
        """Revoke an active dominance window"""
        if window_id not in self._active_windows:
            return OperationResult(
                success=False,
                message=f"Window {window_id} not found"
            )
        
        window = self._active_windows[window_id]
        window.is_active = False
        
        return OperationResult(
            success=True,
            message=f"Window {window_id} revoked: {reason}",
            audit_hash=hashlib.sha256(f"{window_id}:{reason}".encode()).hexdigest()[:16]
        )
    
    def strategic(
        self,
        national_authority_id: str,
        action_type: str,
        action_details: Dict,
        alliance_signatories: List[str],
        attestations: List[Attestation],
        energy_escrow_nxt: float = 1000000.0
    ) -> OperationResult:
        """
        Strategic-level military action.
        
        PLANCK-level operation requiring:
        - 95% quorum
        - National authority attestation
        - Alliance consultation
        - Constitutional compliance
        """
        operation = IndustryOperation(
            operation_id='military.strategic',
            sector_id='military',
            data={
                'action_type': action_type,
                'action_details': action_details,
                'alliance_signatories': alliance_signatories,
                'signatory_count': len(alliance_signatories)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=national_authority_id
        )
        
        return self.execute_operation(operation)
    
    def get_active_windows(self) -> List[Dict]:
        """Get all active dominance windows"""
        self._cleanup_expired_windows()
        return [w.to_dict() for w in self._active_windows.values() if w.is_valid()]
    
    def _cleanup_expired_windows(self):
        """Deactivate expired windows"""
        for window in self._active_windows.values():
            if not window.is_valid():
                window.is_active = False
    
    def get_roe(self, operation_name: str) -> Optional[Dict]:
        """Get rules of engagement for an operation"""
        return self._roe_active.get(operation_name)
    
    def verify_chain_of_command(self, chain_id: str) -> Tuple[bool, str]:
        """Verify command chain integrity via spectral hash"""
        if chain_id not in self._command_chains:
            return False, f"Chain {chain_id} not found"
        
        chain = self._command_chains[chain_id]
        recalculated_hash = self._generate_chain_hash(chain.commands)
        
        if recalculated_hash == chain.spectral_hash:
            return True, "Command chain integrity verified"
        else:
            return False, "Command chain integrity COMPROMISED - hash mismatch"
