"""
NexusOS Constitutional Enforcer

Enforces constitutional clauses against governance frames and actions.
Integrates with physics governance primitives for band-based authority.
"""
import os
import time
import json
import hashlib
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

CONSTITUTION_PATH = os.path.join(os.path.dirname(__file__), "constitution.json")

def load_constitution() -> Dict[str, Any]:
    """Load constitution from JSON file"""
    try:
        with open(CONSTITUTION_PATH, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"meta": {}, "clauses": []}

CONSTITUTION = load_constitution()

BAND_LEVEL_MAP = {
    "NANO": 0,
    "PICO": 1,
    "FEMTO": 2,
    "ATTO": 3,
    "ZEPTO": 4,
    "YOCTO": 5,
    "PLANCK": 6
}

LEVEL_BAND_MAP = {v: k for k, v in BAND_LEVEL_MAP.items()}


class EnforcementStatus(Enum):
    PASSED = "passed"
    FAILED = "failed"
    PENDING_ATTESTATION = "pending_attestation"
    QUARANTINED = "quarantined"


@dataclass
class EnforcementResult:
    """Result of constitutional enforcement check"""
    status: EnforcementStatus
    clause_id: Optional[str] = None
    clause_title: Optional[str] = None
    message: str = ""
    action: str = "nop"
    required_attestations: List[str] = field(default_factory=list)
    missing_attestations: List[str] = field(default_factory=list)
    energy_required: int = 0
    energy_supplied: int = 0
    remedy: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "clause_id": self.clause_id,
            "clause_title": self.clause_title,
            "message": self.message,
            "action": self.action,
            "required_attestations": self.required_attestations,
            "missing_attestations": self.missing_attestations,
            "energy_required": self.energy_required,
            "energy_supplied": self.energy_supplied,
            "remedy": self.remedy,
            "timestamp": self.timestamp
        }


SPECTRUM_LEDGER: Dict[str, int] = {}
VALIDATOR_WEIGHTS: Dict[str, float] = {}
AUTHORITY_DISTRIBUTION: Dict[str, float] = {}


def compute_energy_units(band: int, cycles: int = 1) -> int:
    """
    Compute energy units from band level and cycles.
    
    Uses exponential scaling based on authority band:
    E = base_energy × cycles × 10^(band_level)
    """
    band_base = {
        0: 1,
        1: 10,
        2: 100,
        3: 1000,
        4: 10000,
        5: 100000,
        6: 10**9
    }
    return band_base.get(band, 1) * cycles


def check_attestations(frame: Dict[str, Any], required: List[str]) -> Tuple[bool, List[str]]:
    """
    Check if frame contains all required attestations.
    
    Returns (all_present, missing_list)
    """
    attest = frame.get("attest", {})
    missing = []
    for req in required:
        if req not in attest:
            missing.append(req)
    return len(missing) == 0, missing


def get_clause_by_id(clause_id: str) -> Optional[Dict[str, Any]]:
    """Get constitutional clause by ID"""
    for clause in CONSTITUTION.get("clauses", []):
        if clause["id"] == clause_id:
            return clause
    return None


def get_clauses_by_level(level: str) -> List[Dict[str, Any]]:
    """Get all clauses at a specific authority level"""
    return [c for c in CONSTITUTION.get("clauses", []) if c.get("level") == level]


class ConstitutionalEnforcer:
    """
    Main enforcement engine for NexusOS Constitution.
    
    Enforces all constitutional clauses against governance actions,
    integrating with the physics-based authority band system.
    """
    
    def __init__(self):
        self.constitution = load_constitution()
        self.enforcement_log: List[EnforcementResult] = []
        self.quarantine_list: Dict[str, Tuple[str, float]] = {}
        self.pending_attestations: Dict[str, Dict[str, Any]] = {}
    
    def reload_constitution(self):
        """Reload constitution from file"""
        self.constitution = load_constitution()
    
    def get_clause(self, clause_id: str) -> Optional[Dict[str, Any]]:
        """Get clause by ID"""
        for clause in self.constitution.get("clauses", []):
            if clause["id"] == clause_id:
                return clause
        return None
    
    def get_all_clauses(self) -> List[Dict[str, Any]]:
        """Get all constitutional clauses"""
        return self.constitution.get("clauses", [])
    
    def check_non_dominance(self, 
                            entity_id: str,
                            authority_weights: Dict[str, float]) -> EnforcementResult:
        """
        Enforce C-0001: Non-Dominance clause
        
        No entity may hold >5% effective authority without PLANCK consensus.
        """
        clause = self.get_clause("C-0001")
        if not clause:
            return EnforcementResult(
                status=EnforcementStatus.PASSED,
                message="Non-dominance clause not found"
            )
        
        total_weight = sum(authority_weights.values())
        if total_weight == 0:
            return EnforcementResult(
                status=EnforcementStatus.PASSED,
                clause_id="C-0001",
                clause_title=clause["title"],
                message="No authority weight registered"
            )
        
        entity_weight = authority_weights.get(entity_id, 0)
        entity_share = entity_weight / total_weight
        
        if entity_share > 0.05:
            return EnforcementResult(
                status=EnforcementStatus.FAILED,
                clause_id="C-0001",
                clause_title=clause["title"],
                message=f"Entity {entity_id} holds {entity_share:.1%} authority (>5% limit)",
                required_attestations=clause["enforcement"]["required_attestations"],
                remedy=clause["enforcement"]["remedy"],
                action="trigger_rebalance"
            )
        
        return EnforcementResult(
            status=EnforcementStatus.PASSED,
            clause_id="C-0001",
            clause_title=clause["title"],
            message=f"Entity authority {entity_share:.1%} within limits"
        )
    
    def check_energy_escrow(self,
                            action: str,
                            supplied_energy: int,
                            attestations: Dict[str, Any]) -> EnforcementResult:
        """
        Enforce C-0003: Energy-Backed Validity
        
        System-level actions require minimum energy escrow.
        """
        clause = self.get_clause("C-0003")
        if not clause:
            return EnforcementResult(
                status=EnforcementStatus.PASSED,
                message="Energy escrow clause not found"
            )
        
        energy_actions = [
            "validator_rotation",
            "constitutional_amendment",
            "planetary_transfer",
            "cross_chain_transfer",
            "network_genesis"
        ]
        
        if action not in energy_actions:
            return EnforcementResult(
                status=EnforcementStatus.PASSED,
                clause_id="C-0003",
                clause_title=clause["title"],
                message=f"Action '{action}' does not require energy escrow"
            )
        
        required_energy = clause.get("parameters", {}).get("min_energy_units", 1000000)
        required_attestations = clause.get("enforcement", {}).get("required_attestations", [])
        
        has_attestations, missing = check_attestations(
            {"attest": attestations},
            required_attestations
        )
        
        if supplied_energy < required_energy:
            return EnforcementResult(
                status=EnforcementStatus.FAILED,
                clause_id="C-0003",
                clause_title=clause["title"],
                message=f"Insufficient energy escrow: {supplied_energy:,} < {required_energy:,}",
                energy_required=required_energy,
                energy_supplied=supplied_energy,
                required_attestations=required_attestations,
                remedy=clause.get("enforcement", {}).get("remedy", "action rejected"),
                action="reject"
            )
        
        if not has_attestations:
            return EnforcementResult(
                status=EnforcementStatus.PENDING_ATTESTATION,
                clause_id="C-0003",
                clause_title=clause["title"],
                message=f"Missing attestations for {action}",
                energy_required=required_energy,
                energy_supplied=supplied_energy,
                required_attestations=required_attestations,
                missing_attestations=missing,
                action="await_attestation"
            )
        
        return EnforcementResult(
            status=EnforcementStatus.PASSED,
            clause_id="C-0003",
            clause_title=clause["title"],
            message=f"Energy escrow validated: {supplied_energy:,} units",
            energy_required=required_energy,
            energy_supplied=supplied_energy,
            action=action
        )
    
    def check_immutable_rights(self,
                               action: str,
                               authority_band: int,
                               attestations: Dict[str, Any]) -> EnforcementResult:
        """
        Enforce C-0002: Immutable Rights
        
        Basic rights cannot be suspended except via PLANCK consensus.
        """
        clause = self.get_clause("C-0002")
        if not clause:
            return EnforcementResult(
                status=EnforcementStatus.PASSED,
                message="Immutable rights clause not found"
            )
        
        rights_affecting_actions = [
            "suspend_privacy",
            "restrict_emergency_access",
            "revoke_basic_rights",
            "censor_communication"
        ]
        
        if action not in rights_affecting_actions:
            return EnforcementResult(
                status=EnforcementStatus.PASSED,
                clause_id="C-0002",
                clause_title=clause["title"],
                message=f"Action '{action}' does not affect basic rights"
            )
        
        planck_level = BAND_LEVEL_MAP["PLANCK"]
        
        if authority_band < planck_level:
            return EnforcementResult(
                status=EnforcementStatus.FAILED,
                clause_id="C-0002",
                clause_title=clause["title"],
                message=f"Rights-affecting action requires PLANCK authority (level {planck_level}), got level {authority_band}",
                required_attestations=["PLANCK_CONSENSUS"],
                remedy=clause.get("enforcement", {}).get("remedy", "action rejected"),
                action="reject"
            )
        
        return EnforcementResult(
            status=EnforcementStatus.PASSED,
            clause_id="C-0002",
            clause_title=clause["title"],
            message="PLANCK-level authority confirmed for rights-affecting action",
            action=action
        )
    
    def enforce_frame(self, frame_obj: Any, 
                       authority_weights: Optional[Dict[str, float]] = None) -> EnforcementResult:
        """
        Main enforcement entry point for WNSP frames.
        
        Checks all applicable constitutional clauses:
        - C-0001: Non-Dominance (authority concentration limits)
        - C-0002: Immutable Rights (PLANCK-protected rights)
        - C-0003: Energy-Backed Validity (energy escrow for system actions)
        """
        try:
            if hasattr(frame_obj, 'band_hdr'):
                band = frame_obj.band_hdr.primary_band
                attest = getattr(frame_obj, 'attest', {})
            else:
                band = frame_obj.get("band_hdr", {}).get("primary_band", 0)
                attest = frame_obj.get("attest", {})
        except Exception:
            band = 0
            attest = {}
        
        action = attest.get("action", "")
        energy_units = int(attest.get("energy_units", 0))
        entity_id = attest.get("entity_id", "unknown")
        
        if authority_weights is None:
            authority_weights = AUTHORITY_DISTRIBUTION.copy()
        
        if entity_id != "unknown":
            if not authority_weights:
                if action in ["validator_rotation", "stake_delegation", "authority_claim"]:
                    missing_weights_result = EnforcementResult(
                        status=EnforcementStatus.PENDING_ATTESTATION,
                        clause_id="C-0001",
                        clause_title="Non-Dominance",
                        message=f"Authority weights required for action '{action}' but not available",
                        required_attestations=["FEMTO_MULTI_ENDORSEMENT", "ATTO_STAKE_CHECK"],
                        action="await_authority_data"
                    )
                    self.enforcement_log.append(missing_weights_result)
                    return missing_weights_result
            else:
                non_dom_result = self.check_non_dominance(entity_id, authority_weights)
                if non_dom_result.status == EnforcementStatus.FAILED:
                    self.enforcement_log.append(non_dom_result)
                    if non_dom_result.action == "trigger_rebalance":
                        self.quarantine_entity(entity_id, "Non-dominance violation: >5% authority")
                    return non_dom_result
        
        rights_result = self.check_immutable_rights(action, band, attest)
        if rights_result.status == EnforcementStatus.FAILED:
            self.enforcement_log.append(rights_result)
            return rights_result
        
        energy_result = self.check_energy_escrow(action, energy_units, attest)
        if energy_result.status in [EnforcementStatus.FAILED, EnforcementStatus.PENDING_ATTESTATION]:
            self.enforcement_log.append(energy_result)
            return energy_result
        
        result = EnforcementResult(
            status=EnforcementStatus.PASSED,
            message="All constitutional checks passed",
            action=action if action else "nop"
        )
        self.enforcement_log.append(result)
        return result
    
    def update_authority_distribution(self, entity_id: str, weight: float) -> EnforcementResult:
        """
        Update authority distribution and check non-dominance.
        
        Called whenever validator/stake weights change to ensure
        no entity exceeds the 5% authority threshold.
        """
        global AUTHORITY_DISTRIBUTION
        AUTHORITY_DISTRIBUTION[entity_id] = weight
        
        result = self.check_non_dominance(entity_id, AUTHORITY_DISTRIBUTION)
        if result.status == EnforcementStatus.FAILED:
            self.enforcement_log.append(result)
            self.quarantine_entity(entity_id, "Non-dominance violation: authority rebalance required")
        return result
    
    def quarantine_entity(self, entity_id: str, reason: str) -> bool:
        """Add entity to quarantine list"""
        self.quarantine_list[entity_id] = (reason, time.time())
        return True
    
    def release_from_quarantine(self, entity_id: str) -> bool:
        """Remove entity from quarantine"""
        if entity_id in self.quarantine_list:
            del self.quarantine_list[entity_id]
            return True
        return False
    
    def is_quarantined(self, entity_id: str) -> bool:
        """Check if entity is quarantined"""
        return entity_id in self.quarantine_list
    
    def get_enforcement_log(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent enforcement log entries"""
        return [r.to_dict() for r in self.enforcement_log[-limit:]]
    
    def get_constitution_hash(self) -> str:
        """Get hash of current constitution for integrity verification"""
        constitution_bytes = json.dumps(self.constitution, sort_keys=True).encode()
        return hashlib.sha3_256(constitution_bytes).hexdigest()


GLOBAL_ENFORCER = ConstitutionalEnforcer()


def enforce_frame(frame_obj: Any) -> Dict[str, Any]:
    """Convenience function for frame enforcement"""
    result = GLOBAL_ENFORCER.enforce_frame(frame_obj)
    return result.to_dict()
