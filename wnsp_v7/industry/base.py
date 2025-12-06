"""
Base Industry Adapter

Provides the foundation for all industry-specific adapters.
Loads sector policies and validates operations against the
Lambda Boson substrate.
"""

import json
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
from datetime import datetime

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class SpectralBand(Enum):
    """7-Band Spectral Authority Hierarchy"""
    PLANCK = 7  # Constitutional - highest authority
    YOCTO = 6   # Governance
    ZEPTO = 5   # Economic
    ATTO = 4    # Consensus
    FEMTO = 3   # Contract
    PICO = 2    # Standard
    NANO = 1    # Micro - lowest authority


@dataclass
class Attestation:
    """Proof or certificate required for operation"""
    type: str
    value: str
    issuer: str
    timestamp: datetime = field(default_factory=datetime.now)
    band_level: SpectralBand = SpectralBand.FEMTO
    
    def to_dict(self) -> Dict:
        return {
            'type': self.type,
            'value': self.value,
            'issuer': self.issuer,
            'timestamp': self.timestamp.isoformat(),
            'band_level': self.band_level.name
        }


@dataclass
class IndustryOperation:
    """A sector-specific operation to be validated and executed"""
    operation_id: str
    sector_id: str
    data: Dict[str, Any]
    attestations: List[Attestation] = field(default_factory=list)
    energy_escrow_nxt: float = 0.0
    operator_id: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        return {
            'operation_id': self.operation_id,
            'sector_id': self.sector_id,
            'data': self.data,
            'attestations': [a.to_dict() for a in self.attestations],
            'energy_escrow_nxt': self.energy_escrow_nxt,
            'operator_id': self.operator_id,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class OperationResult:
    """Result of an industry operation"""
    success: bool
    message: str
    lambda_mass: float = 0.0
    transaction_id: str = ""
    band_used: SpectralBand = SpectralBand.NANO
    audit_hash: str = ""
    
    def to_dict(self) -> Dict:
        return {
            'success': self.success,
            'message': self.message,
            'lambda_mass': self.lambda_mass,
            'transaction_id': self.transaction_id,
            'band_used': self.band_used.name,
            'audit_hash': self.audit_hash
        }


class SectorPolicy:
    """Loaded sector policy pack"""
    
    def __init__(self, policy_data: Dict):
        self.sector_id = policy_data.get('sector_id', '')
<<<<<<< HEAD
        self.sector_name = policy_data.get('sector_name', policy_data.get('name', ''))
        self.version = policy_data.get('version', '0.0.0')
        self.description = policy_data.get('description', '')
        self.band_mappings = policy_data.get('band_mappings', policy_data.get('band_requirements', {}))
        
        # Handle operations as either dict (keyed by operation_id) or list
        raw_ops = policy_data.get('operations', {})
        if isinstance(raw_ops, dict):
            # Operations stored as {operation_id: {...}, ...}
            self.operations = {op_id: {**op_data, 'operation_id': op_id} for op_id, op_data in raw_ops.items()}
        elif isinstance(raw_ops, list):
            # Operations stored as [{operation_id: ..., ...}, ...]
            self.operations = {op['operation_id']: op for op in raw_ops}
        else:
            self.operations = {}
        
=======
        self.sector_name = policy_data.get('sector_name', '')
        self.version = policy_data.get('version', '0.0.0')
        self.description = policy_data.get('description', '')
        self.band_mappings = policy_data.get('band_mappings', {})
        self.operations = {op['operation_id']: op for op in policy_data.get('operations', [])}
>>>>>>> f141339b87d1249df922e7e081e7b68a91e7f12a
        self.constraints = policy_data.get('constraints', {})
        self.attestations = policy_data.get('attestations', [])
        self.physics_rules = policy_data.get('physics_rules', {})
        self._raw = policy_data
    
    def get_required_band(self, operation_id: str) -> Optional[SpectralBand]:
        """Get the required spectral band for an operation"""
        op = self.operations.get(operation_id)
        if op:
            band_name = op.get('required_band', 'NANO')
<<<<<<< HEAD
            try:
                return SpectralBand[band_name]
            except KeyError:
                return SpectralBand.NANO
=======
            return SpectralBand[band_name]
>>>>>>> f141339b87d1249df922e7e081e7b68a91e7f12a
        return None
    
    def get_min_escrow(self, band: SpectralBand) -> float:
        """Get minimum energy escrow for a band"""
        band_config = self.band_mappings.get(band.name, {})
<<<<<<< HEAD
        # Support both key formats
        return band_config.get('min_energy_escrow_nxt', band_config.get('min_escrow_nxt', 0.0))
=======
        return band_config.get('min_energy_escrow_nxt', 0.0)
>>>>>>> f141339b87d1249df922e7e081e7b68a91e7f12a
    
    def requires_multi_party(self, band: SpectralBand) -> bool:
        """Check if band requires multi-party consensus"""
        band_config = self.band_mappings.get(band.name, {})
        return band_config.get('multi_party_required', False)
    
    def get_quorum_percent(self, band: SpectralBand) -> float:
        """Get required quorum percentage for band"""
        band_config = self.band_mappings.get(band.name, {})
        return band_config.get('quorum_percent', 0)
    
    def get_required_attestations(self, operation_id: str) -> List[str]:
        """Get required attestation types for an operation"""
        op = self.operations.get(operation_id)
        if op:
<<<<<<< HEAD
            # Support both key formats
            return op.get('attestations_required', op.get('required_attestations', []))
=======
            return op.get('attestations_required', [])
>>>>>>> f141339b87d1249df922e7e081e7b68a91e7f12a
        return []
    
    def get_energy_multiplier(self, operation_id: str) -> float:
        """Get energy cost multiplier for operation"""
        op = self.operations.get(operation_id)
        if op:
            return op.get('energy_cost_multiplier', 1.0)
        return 1.0
    
    def is_reversible(self, operation_id: str) -> bool:
        """Check if operation is reversible"""
        op = self.operations.get(operation_id)
        if op:
            return op.get('reversible', True)
        return True


def load_sector_policy(sector_id: str) -> SectorPolicy:
    """Load a sector policy pack from JSON file"""
    policy_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'sector_policies')
    policy_file = os.path.join(policy_dir, f'{sector_id}.json')
    
    if not os.path.exists(policy_file):
        raise FileNotFoundError(f"Sector policy not found: {sector_id}")
    
    with open(policy_file, 'r') as f:
        policy_data = json.load(f)
    
    return SectorPolicy(policy_data)


def calculate_lambda_mass(frequency_hz: float) -> float:
    """Calculate Lambda Boson mass from frequency: Λ = hf/c²"""
    return (PLANCK_CONSTANT * frequency_hz) / (SPEED_OF_LIGHT ** 2)


def calculate_operation_frequency(band: SpectralBand, base_frequency: float = 1e12) -> float:
    """Calculate frequency for operation based on band"""
    band_multipliers = {
        SpectralBand.PLANCK: 1e23,
        SpectralBand.YOCTO: 1e17,
        SpectralBand.ZEPTO: 1e11,
        SpectralBand.ATTO: 1e5,
        SpectralBand.FEMTO: 1e-1,
        SpectralBand.PICO: 1e-7,
        SpectralBand.NANO: 1e-13
    }
    return base_frequency * band_multipliers.get(band, 1.0)


class IndustryAdapter:
    """Base class for industry-specific adapters"""
    
    def __init__(self, sector_id: Optional[str] = None, policy: Optional[SectorPolicy] = None):
        if policy:
            self.policy = policy
        elif sector_id:
            self.policy = load_sector_policy(sector_id)
        else:
            raise ValueError("Either sector_id or policy must be provided")
        
        self.sector_id = self.policy.sector_id
        self._transaction_counter = 0
    
    def _generate_transaction_id(self) -> str:
        """Generate unique transaction ID"""
        self._transaction_counter += 1
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"{self.sector_id}_{timestamp}_{self._transaction_counter:06d}"
    
    def _calculate_audit_hash(self, operation: IndustryOperation) -> str:
        """Calculate Lambda-based audit hash for operation"""
        import hashlib
        op_str = json.dumps(operation.to_dict(), sort_keys=True)
        return hashlib.sha256(op_str.encode()).hexdigest()[:16]
    
    def validate_operation(self, operation: IndustryOperation) -> Tuple[bool, str]:
        """Validate operation against sector policy"""
        
        if operation.sector_id != self.sector_id:
            return False, f"Operation sector {operation.sector_id} does not match adapter sector {self.sector_id}"
        
        if operation.operation_id not in self.policy.operations:
            return False, f"Unknown operation: {operation.operation_id}"
        
        required_band = self.policy.get_required_band(operation.operation_id)
        if not required_band:
            return False, f"No band mapping for operation: {operation.operation_id}"
        
        min_escrow = self.policy.get_min_escrow(required_band)
        if operation.energy_escrow_nxt < min_escrow:
            return False, f"Insufficient energy escrow: {operation.energy_escrow_nxt} < {min_escrow} NXT required for {required_band.name}"
        
        required_attestations = self.policy.get_required_attestations(operation.operation_id)
        provided_attestation_types = {a.type for a in operation.attestations}
        missing = set(required_attestations) - provided_attestation_types
        if missing:
            return False, f"Missing attestations: {missing}"
        
        max_dominance = self.policy.constraints.get('max_dominance_percent', 5)
        
        return True, "Validation passed"
    
    def execute_operation(self, operation: IndustryOperation) -> OperationResult:
        """Execute a validated operation"""
        
        valid, reason = self.validate_operation(operation)
        if not valid:
            return OperationResult(
                success=False,
                message=reason
            )
        
        required_band = self.policy.get_required_band(operation.operation_id)
        if required_band is None:
            required_band = SpectralBand.NANO
        
        frequency = calculate_operation_frequency(required_band)
        lambda_mass = calculate_lambda_mass(frequency)
        
        energy_multiplier = self.policy.get_energy_multiplier(operation.operation_id)
        lambda_mass *= energy_multiplier
        
        transaction_id = self._generate_transaction_id()
        audit_hash = self._calculate_audit_hash(operation)
        
        return OperationResult(
            success=True,
            message=f"Operation {operation.operation_id} executed successfully",
            lambda_mass=lambda_mass,
            transaction_id=transaction_id,
            band_used=required_band,
            audit_hash=audit_hash
        )
    
    def get_operation_info(self, operation_id: str) -> Optional[Dict]:
        """Get information about an operation"""
        return self.policy.operations.get(operation_id)
    
    def list_operations(self) -> List[str]:
        """List all available operations for this sector"""
        return list(self.policy.operations.keys())
    
    def get_band_requirements(self, band: SpectralBand) -> Dict:
        """Get requirements for a specific band"""
        return {
            'min_escrow_nxt': self.policy.get_min_escrow(band),
            'multi_party_required': self.policy.requires_multi_party(band),
            'quorum_percent': self.policy.get_quorum_percent(band)
        }
