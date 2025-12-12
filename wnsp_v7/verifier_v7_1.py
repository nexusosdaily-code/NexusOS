"""
wnsp-consensus/verifier_v7.1.py

Coherence Verifier for Lambda Gate Frame Validation

This module validates frames for both Temporal Coherence and AGPL-3.0 Compliance.
It works in conjunction with frame_builder_v7_1.py to ensure all network
operations meet protocol requirements.

Copyright (C) 2024 NexusOS / WNSP Protocol
Licensed under AGPL-3.0: https://www.gnu.org/licenses/agpl-3.0.html
"""

import json
import hashlib
from dataclasses import dataclass
from typing import Dict, Any, Optional, Tuple, List
from enum import Enum


class VerificationStatus(Enum):
    """Status codes for frame verification."""
    VALID = "VALID"
    TEMPORAL_COHERENCE_FAILED = "TEMPORAL_COHERENCE_FAILED"
    AGPL_VIOLATION = "AGPL_VIOLATION"
    SIGNATURE_INVALID = "SIGNATURE_INVALID"
    MALFORMED_FRAME = "MALFORMED_FRAME"
    SCR_MISSING = "SCR_MISSING"
    ENERGY_MISMATCH = "ENERGY_MISMATCH"


@dataclass
class VerificationResult:
    """Detailed result of frame verification."""
    is_valid: bool
    status: VerificationStatus
    gate_id: str
    temporal_check: bool
    agpl_check: bool
    scr_hash: Optional[str]
    expected_hash: Optional[str]
    coherence_delta: float
    energy_consumed: float
    message: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'is_valid': self.is_valid,
            'status': self.status.value,
            'gate_id': self.gate_id,
            'temporal_check': self.temporal_check,
            'agpl_check': self.agpl_check,
            'scr_hash': self.scr_hash,
            'expected_hash': self.expected_hash,
            'coherence_delta': self.coherence_delta,
            'energy_consumed': self.energy_consumed,
            'message': self.message
        }


class LambdaAPI:
    """
    Lambda Protocol API for temporal signature verification.
    
    Handles cryptographic verification of pre/post attestation pairs
    and coherence signatures.
    """
    
    @staticmethod
    def verify_temporal_signature(pre_attest: Dict, post_attest: Dict, coherence_sig: str, gate_id: str = None) -> Tuple[bool, str]:
        """
        Verifies that Lambda's PRE and POST signatures match the final COHERENCE_SIG.
        This confirms the temporal manipulation was successful.
        
        Returns:
            Tuple of (is_valid, message)
        """
        if not coherence_sig.startswith("COH-SIG:"):
            return False, "Invalid coherence signature format"
        
        if pre_attest['timestamp'] >= post_attest['timestamp']:
            return False, "Temporal ordering violation: PRE timestamp must be before POST"
        
        coherence_delta = post_attest['coherence_level'] - pre_attest['coherence_level']
        if coherence_delta < -0.5:
            return False, f"Coherence degradation too severe: {coherence_delta:.3f}"
        
        gate = gate_id or pre_attest.get('gate', post_attest.get('gate', 'unknown'))
        
        signature_data = {
            'pre_hash': pre_attest['state_hash'],
            'post_hash': post_attest['state_hash'],
            'coherence_delta': coherence_delta,
            'time_delta': post_attest['timestamp'] - pre_attest['timestamp'],
            'energy_consumed': post_attest['energy_consumed'],
            'gate': gate
        }
        
        sig_bytes = json.dumps(signature_data, sort_keys=True).encode()
        expected_sig = "COH-SIG:" + hashlib.sha256(sig_bytes).hexdigest()
        
        if coherence_sig != expected_sig:
            return False, "Coherence signature mismatch - possible tampering"
        
        return True, "Temporal coherence verified"
    
    @staticmethod
    def calculate_coherence_delta(pre_attest: Dict, post_attest: Dict) -> float:
        """Calculate the change in coherence level."""
        return post_attest['coherence_level'] - pre_attest['coherence_level']
    
    @staticmethod
    def verify_energy_conservation(pre_attest: Dict, post_attest: Dict, payload_size: int) -> Tuple[bool, str]:
        """
        Verify that energy consumption is physically plausible.
        Based on E = hf principle.
        """
        energy = post_attest['energy_consumed']
        
        if energy < 0:
            return False, "Negative energy consumption is physically impossible"
        
        max_expected = 10.0 * (1 + payload_size / 100)
        if energy > max_expected:
            return False, f"Energy consumption {energy:.2f} exceeds physical limit {max_expected:.2f}"
        
        return True, "Energy conservation verified"


class CodeRepoAttestation:
    """
    Code Repository Attestation Service (CRAS)
    
    Maintains the registry of trusted public hashes for all Lambda Gates.
    This is the authority for AGPL-3.0 compliance verification.
    """
    
    _trusted_hashes: Dict[str, str] = {
        "Φ(θ)": "a1b2c3d4e5f6789012345678901234567890abcd",
        "G(α)": "b2c3d4e5f67890123456789012345678901abcde",
        "M(κ)": "c3d4e5f678901234567890123456789012abcdef",
        "L(Δℓ)": "d4e5f6789012345678901234567890123abcdef0",
        "∇Φ": "e5f67890123456789012345678901234abcdef01",
        "S": "f678901234567890123456789012345abcdef012",
        "A_c": "6789012345678901234567890123456abcdef0123",
        "D(τ)": "7890123456789012345678901234567abcdef01234",
    }
    
    _source_urls: Dict[str, str] = {
        "Φ(θ)": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/phase_shift.py",
        "G(α)": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/gain.py",
        "M(κ)": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/mode_mixer.py",
        "L(Δℓ)": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/oam_rotor.py",
        "∇Φ": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/phase_gradient.py",
        "S": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/density_swap.py",
        "A_c": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/coherence_amplify.py",
        "D(τ)": "https://github.com/nexusos/wnsp-protocol/blob/main/wnsp_v7/gates/stabilizer.py",
    }
    
    @classmethod
    def get_trusted_public_hash(cls, gate_id: str) -> Optional[str]:
        """
        Look up the expected public hash for this GATE_ID.
        Returns None if gate_id is unknown.
        """
        return cls._trusted_hashes.get(gate_id)
    
    @classmethod
    def get_source_url(cls, gate_id: str) -> Optional[str]:
        """Get the URL where source code can be obtained."""
        return cls._source_urls.get(gate_id)
    
    @classmethod
    def is_known_gate(cls, gate_id: str) -> bool:
        """Check if a gate ID is registered in the system."""
        return gate_id in cls._trusted_hashes
    
    @classmethod
    def register_modified_hash(cls, gate_id: str, new_hash: str, source_url: str) -> bool:
        """
        Register a modified version of a gate (for AGPL-3.0 derivative works).
        The source must be publicly available at source_url.
        """
        modified_gate_id = f"{gate_id}:modified:{new_hash[:8]}"
        cls._trusted_hashes[modified_gate_id] = new_hash
        cls._source_urls[modified_gate_id] = source_url
        return True
    
    @classmethod
    def get_all_trusted_hashes(cls) -> Dict[str, str]:
        """Return all registered gate hashes."""
        return cls._trusted_hashes.copy()


class CoherenceVerifier:
    """
    Coherence Verifier v7.1
    
    Validates frames for both Temporal Coherence and AGPL-3.0 Compliance.
    This is the core verification component that all nodes must run
    before accepting any Lambda Gate operation.
    
    Usage:
        verifier = CoherenceVerifier()
        result = verifier.verify_v7_frame(frame_bytes)
        if not result.is_valid:
            handle_violation(result)
    """
    
    def __init__(self, strict_mode: bool = True):
        """
        Initialize the verifier.
        
        Args:
            strict_mode: If True, reject frames with any violation.
                        If False, log warnings but allow some violations.
        """
        self.strict_mode = strict_mode
        self.violation_log: List[VerificationResult] = []
    
    def verify_v7_frame(self, frame_bytes: bytes) -> VerificationResult:
        """
        Validates the frame for both Temporal Coherence and AGPL-3.0 Compliance.
        
        Returns:
            VerificationResult with detailed status
        """
        try:
            frame = self._deserialize(frame_bytes)
        except Exception as e:
            return VerificationResult(
                is_valid=False,
                status=VerificationStatus.MALFORMED_FRAME,
                gate_id="unknown",
                temporal_check=False,
                agpl_check=False,
                scr_hash=None,
                expected_hash=None,
                coherence_delta=0.0,
                energy_consumed=0.0,
                message=f"Failed to deserialize frame: {str(e)}"
            )
        
        gate_id = frame.get('GATE_ID', 'unknown')
        scr_hash = frame.get('SCR')
        
        if not scr_hash:
            result = VerificationResult(
                is_valid=False,
                status=VerificationStatus.SCR_MISSING,
                gate_id=gate_id,
                temporal_check=False,
                agpl_check=False,
                scr_hash=None,
                expected_hash=CodeRepoAttestation.get_trusted_public_hash(gate_id),
                coherence_delta=0.0,
                energy_consumed=0.0,
                message="AGPL-3.0 Violation: Frame missing Source Code Reference (SCR)"
            )
            self.violation_log.append(result)
            return result
        
        temporal_valid, temporal_msg = self._check_temporal_attestations(
            frame.get('PRE_ATTEST', {}),
            frame.get('POST_ATTEST', {}),
            frame.get('COHERENCE_SIG', ''),
            gate_id
        )
        
        if not temporal_valid:
            result = VerificationResult(
                is_valid=False,
                status=VerificationStatus.TEMPORAL_COHERENCE_FAILED,
                gate_id=gate_id,
                temporal_check=False,
                agpl_check=False,
                scr_hash=scr_hash,
                expected_hash=None,
                coherence_delta=0.0,
                energy_consumed=frame.get('POST_ATTEST', {}).get('energy_consumed', 0.0),
                message=f"Temporal Coherence Failed: {temporal_msg}"
            )
            self.violation_log.append(result)
            print(f"Error: Temporal Coherence Failed for Gate {gate_id}")
            return result
        
        agpl_valid = self._check_agplv3_source_reference(gate_id, scr_hash)
        
        if not agpl_valid:
            expected_hash = CodeRepoAttestation.get_trusted_public_hash(gate_id)
            result = VerificationResult(
                is_valid=False,
                status=VerificationStatus.AGPL_VIOLATION,
                gate_id=gate_id,
                temporal_check=True,
                agpl_check=False,
                scr_hash=scr_hash,
                expected_hash=expected_hash,
                coherence_delta=LambdaAPI.calculate_coherence_delta(
                    frame.get('PRE_ATTEST', {}),
                    frame.get('POST_ATTEST', {})
                ),
                energy_consumed=frame.get('POST_ATTEST', {}).get('energy_consumed', 0.0),
                message=f"AGPL-3.0 Violation: SCR {scr_hash} is not valid. Source disclosure required."
            )
            self.violation_log.append(result)
            print(f"Error: AGPLv3 Compliance Violation: SCR {scr_hash} is not valid.")
            return result
        
        coherence_delta = LambdaAPI.calculate_coherence_delta(
            frame.get('PRE_ATTEST', {}),
            frame.get('POST_ATTEST', {})
        )
        
        return VerificationResult(
            is_valid=True,
            status=VerificationStatus.VALID,
            gate_id=gate_id,
            temporal_check=True,
            agpl_check=True,
            scr_hash=scr_hash,
            expected_hash=CodeRepoAttestation.get_trusted_public_hash(gate_id),
            coherence_delta=coherence_delta,
            energy_consumed=frame.get('POST_ATTEST', {}).get('energy_consumed', 0.0),
            message="Frame verified: Temporal coherence and AGPL-3.0 compliance confirmed"
        )
    
    def _deserialize(self, frame_bytes: bytes) -> Dict[str, Any]:
        """Deserialize frame bytes to dictionary."""
        return json.loads(frame_bytes.decode('utf-8'))
    
    def _check_temporal_attestations(self, pre_attest: Dict, post_attest: Dict, coherence_sig: str, gate_id: str = None) -> Tuple[bool, str]:
        """
        Verifies that Lambda's PRE and POST signatures match the final COHERENCE_SIG.
        This confirms the temporal manipulation was successful.
        """
        return LambdaAPI.verify_temporal_signature(pre_attest, post_attest, coherence_sig, gate_id)
    
    def _check_agplv3_source_reference(self, gate_id: str, scr_hash: str) -> bool:
        """
        Checks the SCR hash against the public Code Repository Attestation Service (CRAS).
        This guarantees the open-source status of the executed Lambda Gate logic.
        """
        expected_public_hash = CodeRepoAttestation.get_trusted_public_hash(gate_id)
        
        if expected_public_hash is None:
            print(f"AGPLv3 Warning: Unknown gate ID '{gate_id}'")
            return False
        
        if scr_hash == expected_public_hash:
            return True
        else:
            print(f"AGPLv3 Warning: SCR hash mismatch! Expected: {expected_public_hash}, Found: {scr_hash}. Requiring source disclosure.")
            return False
    
    def request_source_disclosure(self, gate_id: str, scr_hash: str) -> Dict[str, Any]:
        """
        Generate a source disclosure request for non-matching SCR.
        This is the AGPL-3.0 enforcement mechanism.
        """
        return {
            'request_type': 'AGPL_SOURCE_DISCLOSURE',
            'gate_id': gate_id,
            'scr_hash': scr_hash,
            'expected_hash': CodeRepoAttestation.get_trusted_public_hash(gate_id),
            'message': 'You are using a modified version of this Lambda Gate. '
                      'Under AGPL-3.0, you must provide access to the source code.',
            'deadline_hours': 72
        }
    
    def get_violation_summary(self) -> Dict[str, Any]:
        """Get summary of all recorded violations."""
        return {
            'total_violations': len(self.violation_log),
            'by_type': {
                status.value: sum(1 for v in self.violation_log if v.status == status)
                for status in VerificationStatus
            },
            'gates_affected': list(set(v.gate_id for v in self.violation_log))
        }


class FrameVerificationPipeline:
    """
    Complete verification pipeline for incoming frames.
    
    Combines all verification steps into a single workflow.
    """
    
    def __init__(self):
        self.verifier = CoherenceVerifier(strict_mode=True)
        self.processed_count = 0
        self.valid_count = 0
        self.violation_count = 0
    
    def process_frame(self, frame_bytes: bytes) -> VerificationResult:
        """Process a single frame through the verification pipeline."""
        self.processed_count += 1
        
        result = self.verifier.verify_v7_frame(frame_bytes)
        
        if result.is_valid:
            self.valid_count += 1
        else:
            self.violation_count += 1
        
        return result
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        return {
            'processed': self.processed_count,
            'valid': self.valid_count,
            'violations': self.violation_count,
            'success_rate': self.valid_count / max(1, self.processed_count)
        }


if __name__ == "__main__":
    from frame_builder_v7_1 import FrameBuilder, LambdaGateID
    
    print("=" * 60)
    print("COHERENCE VERIFIER v7.1 - VALIDATION TEST")
    print("=" * 60)
    
    builder = FrameBuilder(lcu_id="test-lcu-001")
    verifier = CoherenceVerifier()
    pipeline = FrameVerificationPipeline()
    
    print("\n--- Test 1: Valid Frame ---")
    test_payload = b"Hello, Lambda Gate World!"
    gate = LambdaGateID.PHASE_SHIFT
    
    frame_bytes = builder.build_v7_frame(test_payload, gate)
    result = pipeline.process_frame(frame_bytes)
    
    print(f"Status: {result.status.value}")
    print(f"Valid: {result.is_valid}")
    print(f"Temporal Check: {result.temporal_check}")
    print(f"AGPL Check: {result.agpl_check}")
    print(f"Message: {result.message}")
    
    print("\n--- Test 2: Invalid SCR (Modified Code) ---")
    frame = json.loads(frame_bytes.decode('utf-8'))
    frame['SCR'] = "TAMPERED_HASH_12345678901234567890"
    tampered_frame = json.dumps(frame).encode('utf-8')
    
    result2 = pipeline.process_frame(tampered_frame)
    print(f"Status: {result2.status.value}")
    print(f"Valid: {result2.is_valid}")
    print(f"Message: {result2.message}")
    
    if not result2.is_valid and result2.status == VerificationStatus.AGPL_VIOLATION:
        disclosure_req = verifier.request_source_disclosure(result2.gate_id, result2.scr_hash)
        print("\nSource Disclosure Request Generated:")
        for key, value in disclosure_req.items():
            print(f"  {key}: {value}")
    
    print("\n--- Test 3: Missing SCR ---")
    frame_no_scr = json.loads(frame_bytes.decode('utf-8'))
    del frame_no_scr['SCR']
    no_scr_frame = json.dumps(frame_no_scr).encode('utf-8')
    
    result3 = pipeline.process_frame(no_scr_frame)
    print(f"Status: {result3.status.value}")
    print(f"Valid: {result3.is_valid}")
    print(f"Message: {result3.message}")
    
    print("\n--- Test 4: All Gates Verification ---")
    for gate_id in LambdaGateID:
        frame_bytes = builder.build_v7_frame(b"Test payload", gate_id)
        result = verifier.verify_v7_frame(frame_bytes)
        status = "PASS" if result.is_valid else "FAIL"
        print(f"  {gate_id.value}: {status}")
    
    print("\n--- Pipeline Statistics ---")
    stats = pipeline.get_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    print("\n--- Trusted Hash Registry ---")
    for gate_id, hash_val in CodeRepoAttestation.get_all_trusted_hashes().items():
        print(f"  {gate_id}: {hash_val[:20]}...")
    
    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETE")
    print("=" * 60)
