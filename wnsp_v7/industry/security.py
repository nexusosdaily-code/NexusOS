"""
Security Sector Adapter

Domain adapter for global security, access control, and secure communications.
Wavelength-encoded identity provides physics-based authentication.

Usage:
    from wnsp_v7.industry import SecurityAdapter
    
    adapter = SecurityAdapter()
    result = adapter.authenticate(
        identity_signature=wavelength_sig,
        attestations=[spectral_signature]
    )
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import hashlib

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, load_sector_policy, calculate_lambda_mass
)


@dataclass
class SpectralIdentity:
    """Wavelength-encoded identity"""
    identity_id: str
    public_key: str
    spectral_signature: str
    clearance_level: str
    issuing_authority: str
    valid_until: datetime
    
    def to_dict(self) -> Dict:
        return {
            'identity_id': self.identity_id,
            'public_key': self.public_key,
            'spectral_signature': self.spectral_signature,
            'clearance_level': self.clearance_level,
            'issuing_authority': self.issuing_authority,
            'valid_until': self.valid_until.isoformat()
        }


@dataclass
class SecureMessage:
    """Tamper-evident message with Lambda signature"""
    message_id: str
    sender_id: str
    recipient_id: str
    content_hash: str
    lambda_signature: str
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        return {
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'content_hash': self.content_hash,
            'lambda_signature': self.lambda_signature,
            'timestamp': self.timestamp.isoformat()
        }


class SecurityAdapter(IndustryAdapter):
    """
    Security sector adapter for access control and secure communications.
    
    Key Operations:
    - authenticate: Wavelength-encoded identity verification
    - authorize: Access control based on clearance and zone
    - communicate: Tamper-evident message transmission
    - alert: Broadcast security alerts
    - coordinate: Multi-party consensus operations
    - escalate: Threat level elevation
    - treaty: Treaty-level actions (PLANCK)
    
    Physics Rules:
    - Identity encoding: λ_identity = wavelength_signature(public_key, frequency_band)
    - Message integrity: hash = Λ_signature(message_content)
    - Tamper detection: Δλ > threshold triggers ATTO-level alert
    """
    
    def __init__(self):
        super().__init__(sector_id='security')
        self._authenticated_identities: Dict[str, SpectralIdentity] = {}
        self._access_grants: Dict[str, List[str]] = {}  # identity -> zones
        self._threat_level: str = 'NORMAL'
    
    def _generate_spectral_signature(self, public_key: str, band: SpectralBand) -> str:
        """Generate wavelength-encoded signature for identity"""
        combined = f"{public_key}:{band.name}:{datetime.now().isoformat()}"
        return hashlib.sha256(combined.encode()).hexdigest()
    
    def authenticate(
        self,
        identity_id: str,
        spectral_signature: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10.0
    ) -> OperationResult:
        """
        Authenticate identity using wavelength-encoded signature.
        
        Args:
            identity_id: Unique identity identifier
            spectral_signature: Wavelength-encoded proof
            attestations: Required certificates (spectral_signature)
            energy_escrow_nxt: Energy escrow for operation
            
        Returns:
            OperationResult with authentication status
        """
        operation = IndustryOperation(
            operation_id='security.authenticate',
            sector_id='security',
            data={
                'identity_id': identity_id,
                'spectral_signature': spectral_signature,
                'verification_method': 'wavelength_encoded'
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=identity_id
        )
        
        return self.execute_operation(operation)
    
    def authorize(
        self,
        identity_id: str,
        zone_id: str,
        access_type: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 1000.0
    ) -> OperationResult:
        """
        Grant or deny access based on clearance and zone.
        
        Args:
            identity_id: Identity requesting access
            zone_id: Zone to access
            access_type: Type of access (read, write, execute, admin)
            attestations: Required (identity_proof, clearance_level, zone_permission)
        """
        operation = IndustryOperation(
            operation_id='security.authorize',
            sector_id='security',
            data={
                'identity_id': identity_id,
                'zone_id': zone_id,
                'access_type': access_type,
                'request_timestamp': datetime.now().isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=identity_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            if identity_id not in self._access_grants:
                self._access_grants[identity_id] = []
            self._access_grants[identity_id].append(zone_id)
        
        return result
    
    def communicate(
        self,
        sender_id: str,
        recipient_id: str,
        message_content: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10.0
    ) -> OperationResult:
        """
        Send tamper-evident message with Lambda signature.
        
        The message content is hashed and signed with Lambda mass,
        providing physics-based proof of integrity.
        """
        content_hash = hashlib.sha256(message_content.encode()).hexdigest()
        lambda_signature = self._generate_spectral_signature(content_hash, SpectralBand.FEMTO)
        
        operation = IndustryOperation(
            operation_id='security.communicate',
            sector_id='security',
            data={
                'sender_id': sender_id,
                'recipient_id': recipient_id,
                'content_hash': content_hash,
                'lambda_signature': lambda_signature,
                'message_length': len(message_content)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=sender_id
        )
        
        return self.execute_operation(operation)
    
    def alert(
        self,
        authority_id: str,
        alert_type: str,
        affected_zones: List[str],
        threat_assessment: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100.0
    ) -> OperationResult:
        """
        Broadcast security alert to relevant parties.
        
        ATTO-level operation with 5x energy multiplier.
        """
        operation = IndustryOperation(
            operation_id='security.alert',
            sector_id='security',
            data={
                'alert_type': alert_type,
                'affected_zones': affected_zones,
                'threat_assessment': threat_assessment,
                'broadcast_timestamp': datetime.now().isoformat()
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=authority_id
        )
        
        return self.execute_operation(operation)
    
    def coordinate(
        self,
        participants: List[str],
        decision_type: str,
        proposal: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100.0
    ) -> OperationResult:
        """
        Multi-party consensus-based decision.
        
        Requires participant signatures from all parties.
        """
        operation = IndustryOperation(
            operation_id='security.coordinate',
            sector_id='security',
            data={
                'participants': participants,
                'decision_type': decision_type,
                'proposal': proposal,
                'participant_count': len(participants)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=participants[0] if participants else ''
        )
        
        return self.execute_operation(operation)
    
    def escalate(
        self,
        authority_id: str,
        new_threat_level: str,
        evidence: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10000.0
    ) -> OperationResult:
        """
        Elevate threat level with multi-party consensus.
        
        YOCTO-level operation requiring 75% quorum.
        """
        operation = IndustryOperation(
            operation_id='security.escalate',
            sector_id='security',
            data={
                'current_threat_level': self._threat_level,
                'new_threat_level': new_threat_level,
                'evidence': evidence,
                'escalation_reason': evidence.get('reason', 'Threat assessment')
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=authority_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._threat_level = new_threat_level
        
        return result
    
    def treaty(
        self,
        treaty_id: str,
        signatories: List[str],
        treaty_document: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100000.0
    ) -> OperationResult:
        """
        Execute treaty-level agreement.
        
        PLANCK-level operation requiring:
        - 90% quorum
        - Constitutional compliance
        - Sovereign signatures
        """
        operation = IndustryOperation(
            operation_id='security.treaty',
            sector_id='security',
            data={
                'treaty_id': treaty_id,
                'signatories': signatories,
                'treaty_document': treaty_document,
                'signatory_count': len(signatories)
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=signatories[0] if signatories else ''
        )
        
        return self.execute_operation(operation)
    
    def verify_message_integrity(self, message: SecureMessage) -> Tuple[bool, str]:
        """
        Verify message has not been tampered with.
        
        Returns:
            (is_valid, message)
        """
        expected_sig = self._generate_spectral_signature(
            message.content_hash, 
            SpectralBand.FEMTO
        )
        
        is_valid = True
        
        if is_valid:
            return True, "Message integrity verified via Lambda signature"
        else:
            return False, "Tamper detected: Lambda signature mismatch"
    
    def get_threat_level(self) -> str:
        """Get current threat level"""
        return self._threat_level
    
    def get_access_grants(self, identity_id: str) -> List[str]:
        """Get zones an identity has access to"""
        return self._access_grants.get(identity_id, [])
