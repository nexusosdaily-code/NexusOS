"""
Lambda State Machine v7.1
SPDX-License-Identifier: AGPL-3.0-or-later

Manages network state transitions and gate selection for WNSP protocol.
Integrates with Frame Builder for compliant frame generation.
"""

import json
from enum import Enum
from typing import Dict, Any

from frame_builder_v7_1 import FrameBuilder, LambdaGateID


class LSMState(Enum):
    """Lambda State Machine states based on phase coherence delta"""
    COHERENT = "COHERENT"       # Full operations permitted (Delta_phi ≈ 0)
    DEGRADED = "DEGRADED"       # Partial operations, correction required
    PLANCK_LOCK = "PLANCK_LOCK" # Read-only, emergency state


class LSMGateID(Enum):
    """Core Lambda Gates used by the LSM"""
    GATE_FORWARD_SYNC = 0x01    # Standard state propagation (COHERENT -> COHERENT)
    GATE_VECTOR_RESET = 0x07    # Forced rollback and reset (DEGRADED -> COHERENT attempt)
    GATE_COHERENCE_DRIFT = 0x08 # Dynamical decoupling and phase correction
    GATE_CLOCK_ANCHOR = 0x09    # Emergency clock re-synchronization (PLANCK_LOCK)
    GATE_YOCTO_PROVE = 0x0A     # Constitutional proof request


class StateError(Exception):
    """Custom error for illegal state transitions or requests."""
    pass


class LambdaStateMachine:
    """
    Manages state transitions and automatic gate selection for WNSP.
    
    The LSM ensures applications use the correct Lambda Gate for each operation,
    enforcing protocol compliance and AGPL-3.0 source verification.
    
    State Thresholds:
    - EPSILON_NOISE = 1e-9 (nanoradian noise floor)
    - EPSILON_AGPL = 1e-6 (microradian constitutional breach)
    """
    
    EPSILON_NOISE = 1e-9  # Nanoradian noise floor
    EPSILON_AGPL = 1e-6   # Microradian legal/constitutional breach threshold
    
    def __init__(self, frame_builder: FrameBuilder):
        self.frame_builder = frame_builder
        self._current_state = LSMState.COHERENT
        
    @property
    def current_state(self) -> LSMState:
        return self._current_state
    
    def _serialize(self, data: Dict[str, Any]) -> bytes:
        """Serialize payload to bytes"""
        return json.dumps(data).encode('utf-8')
    
    def _update_state_from_delta_phi(self, delta_phi: float):
        """
        Simulates the feedback loop from the wnsp-consensus layer's phase delta measurement.
        This function handles the Decoherence Detection and Correction Logic.
        """
        abs_phi = abs(delta_phi)

        if abs_phi <= self.EPSILON_NOISE:
            self._current_state = LSMState.COHERENT
        elif self.EPSILON_NOISE < abs_phi < self.EPSILON_AGPL:
            print(f"Decoherence Detected (Delta_phi={abs_phi}). Entering DEGRADED state.")
            self._current_state = LSMState.DEGRADED
            self.frame_builder.build_v7_frame(b'CORRECTIVE_DRIFT', LambdaGateID.COHERENCE_AMPLIFY)
        else:
            print(f"Constitutional Breach (Delta_phi={abs_phi}). Entering PLANCK_LOCK.")
            self._current_state = LSMState.PLANCK_LOCK
            self.frame_builder.build_v7_frame(b'EMERGENCY_CLOCK_SYNC', LambdaGateID.STABILIZER)

    def request_sync_write(self, payload: bytes) -> bytes:
        """
        Application request to perform a standard, forward-propagated transaction.
        Requires COHERENT state.
        """
        if self._current_state != LSMState.COHERENT:
            raise StateError(f"Cannot write. Network is {self._current_state.value}. Requires GATE_VECTOR_RESET.")
            
        gate_id = LambdaGateID.PHASE_SHIFT
        print(f"LSM: Executing GATE_FORWARD_SYNC in state {self._current_state.value}")
        return self.frame_builder.build_v7_frame(payload, gate_id)

    def trigger_source_audit_and_reset(self, target_scr: str = '') -> bytes:
        """
        Application request to force a Source Code Audit and potential rollback.
        This is the primary recovery method from DEGRADED state.
        """
        if self._current_state != LSMState.DEGRADED:
            print("Warning: Forcing reset outside of DEGRADED state.")
        
        gate_id = LambdaGateID.DENSITY_SWAP
        audit_payload = {'command': 'FORCE_AGPLV3_AUDIT', 'target_scr': target_scr}
        print(f"LSM: Executing GATE_VECTOR_RESET to attempt coherence recovery.")
        return self.frame_builder.build_v7_frame(self._serialize(audit_payload), gate_id)

    def request_constitutional_proof(self, rule_check: str) -> bytes:
        """
        Application request for the highest assurance: pre-certify a future state.
        Valid in any state as proving rules is always necessary for safety.
        """
        gate_id = LambdaGateID.STABILIZER
        proof_payload = {'rule_to_prove': rule_check}
        print(f"LSM: Executing GATE_YOCTO_PROVE for rule: {rule_check}")
        return self.frame_builder.build_v7_frame(self._serialize(proof_payload), gate_id)
    
    def get_state(self) -> LSMState:
        """Returns current state"""
        return self._current_state
    
    def recover(self) -> bool:
        """Attempt recovery from DEGRADED/PLANCK_LOCK state"""
        if self._current_state in (LSMState.DEGRADED, LSMState.PLANCK_LOCK):
            print(f"LSM: Attempting recovery from {self._current_state.value}")
            self._current_state = LSMState.COHERENT
            return True
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("LAMBDA STATE MACHINE v7.1 - TEST")
    print("=" * 60)
    
    builder = FrameBuilder(lcu_id="LSM-TEST-001")
    lsm = LambdaStateMachine(builder)
    
    print(f"\nInitial State: {lsm.get_state().value}")
    
    print("\n--- Test 1: Normal Operation (COHERENT) ---")
    try:
        frame = lsm.request_sync_write(b"Knowledge_Addition_V1")
        print(f"Frame generated: {len(frame)} bytes")
    except StateError as e:
        print(f"Error: {e}")
    
    print("\n--- Test 2: Simulate Decoherence (delta_phi=2e-7) ---")
    lsm._update_state_from_delta_phi(2e-7)
    print(f"State after decoherence: {lsm.get_state().value}")
    
    print("\n--- Test 3: Write in DEGRADED state ---")
    try:
        frame = lsm.request_sync_write(b"Knowledge_Addition_V2")
    except StateError as e:
        print(f"Expected error: {e}")
        print("Status: CORRECTLY BLOCKED")
    
    print("\n--- Test 4: Trigger Recovery ---")
    frame = lsm.trigger_source_audit_and_reset()
    print(f"Audit frame: {len(frame)} bytes")
    
    print("\n--- Test 5: Constitutional Breach (delta_phi=2e-5) ---")
    lsm.recover()
    lsm._update_state_from_delta_phi(2e-5)
    print(f"State after breach: {lsm.get_state().value}")
    
    print("\n--- Test 6: Recovery from PLANCK_LOCK ---")
    recovered = lsm.recover()
    print(f"Recovery: {'SUCCESS' if recovered else 'FAILED'}")
    print(f"Final state: {lsm.get_state().value}")
    
    print("\n" + "=" * 60)
    print("STATE MACHINE TEST COMPLETE")
    print("=" * 60)
