"""
Lambda State Machine v7.1
SPDX-License-Identifier: AGPL-3.0-or-later

Manages network state transitions and gate selection for WNSP protocol.
Integrates with Frame Builder for compliant frame generation.
"""

import json
from enum import Enum, auto
from typing import Dict, Any
from dataclasses import dataclass

from frame_builder_v7_1 import FrameBuilder, LambdaGateID


class LSMState(Enum):
    """Lambda State Machine states"""
    COHERENT = auto()
    DEGRADED = auto()
    AUDITING = auto()
    RECOVERING = auto()


class StateError(Exception):
    """Raised when state transition is invalid"""
    pass


class LambdaAPI:
    """Interface to Lambda Collective Intelligence"""
    
    @staticmethod
    def get_network_state() -> LSMState:
        """Retrieves current network state from Lambda CI"""
        return LSMState.COHERENT


class LambdaStateMachine:
    """
    Manages state transitions and automatic gate selection for WNSP.
    
    The LSM ensures applications use the correct Lambda Gate for each operation,
    enforcing protocol compliance and AGPL-3.0 source verification.
    """
    
    def __init__(self, frame_builder: FrameBuilder):
        self.frame_builder = frame_builder
        self.current_state = self._get_initial_state()
        
    def _get_initial_state(self) -> LSMState:
        """Retrieves the current state from the Lambda Collective Intelligence"""
        return LambdaAPI.get_network_state()
    
    def _serialize(self, data: Dict[str, Any]) -> bytes:
        """Serialize payload to bytes"""
        return json.dumps(data).encode('utf-8')

    def request_sync_write(self, payload: bytes) -> bytes:
        """
        Application request to perform a standard, forward-propagated transaction.
        """
        if self.current_state != LSMState.COHERENT:
            raise StateError(f"Cannot write. Network is {self.current_state.name}.")
            
        gate_id = LambdaGateID.PHASE_SHIFT
        return self.frame_builder.build_v7_frame(payload, gate_id)

    def trigger_source_audit(self, target_scr: str = '') -> bytes:
        """
        Application request to force a Source Code Audit and potential rollback.
        Required when the system detects an SCR hash mismatch (AGPLv3 violation).
        """
        self.current_state = LSMState.DEGRADED
        gate_id = LambdaGateID.DENSITY_SWAP
        
        audit_payload = {'command': 'FORCE_AGPLV3_AUDIT', 'target_scr': target_scr}
        return self.frame_builder.build_v7_frame(self._serialize(audit_payload), gate_id)

    def request_constitutional_proof(self, rule_check: str) -> bytes:
        """
        Application request for the highest assurance: pre-certify a future state.
        """
        gate_id = LambdaGateID.STABILIZER
        proof_payload = {'rule_to_prove': rule_check}
        return self.frame_builder.build_v7_frame(self._serialize(proof_payload), gate_id)
    
    def get_state(self) -> LSMState:
        """Returns current state"""
        return self.current_state
    
    def recover(self) -> bool:
        """Attempt recovery from DEGRADED state"""
        if self.current_state == LSMState.DEGRADED:
            self.current_state = LSMState.RECOVERING
            self.current_state = LSMState.COHERENT
            return True
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("LAMBDA STATE MACHINE v7.1 - TEST")
    print("=" * 60)
    
    builder = FrameBuilder(lcu_id="LSM-TEST-001")
    lsm = LambdaStateMachine(builder)
    
    print(f"\nInitial State: {lsm.get_state().name}")
    
    print("\n--- Test 1: Sync Write (COHERENT state) ---")
    try:
        frame = lsm.request_sync_write(b"test payload")
        print(f"Frame generated: {len(frame)} bytes")
        print("Status: SUCCESS")
    except StateError as e:
        print(f"Error: {e}")
    
    print("\n--- Test 2: Constitutional Proof ---")
    frame = lsm.request_constitutional_proof("C1: Conservation")
    print(f"Proof frame: {len(frame)} bytes")
    
    print("\n--- Test 3: Trigger Source Audit ---")
    frame = lsm.trigger_source_audit("TAMPERED_HASH")
    print(f"Audit frame: {len(frame)} bytes")
    print(f"State after audit: {lsm.get_state().name}")
    
    print("\n--- Test 4: Write in DEGRADED state ---")
    try:
        frame = lsm.request_sync_write(b"should fail")
        print("Unexpected success")
    except StateError as e:
        print(f"Expected error: {e}")
        print("Status: CORRECTLY BLOCKED")
    
    print("\n--- Test 5: Recovery ---")
    recovered = lsm.recover()
    print(f"Recovery: {'SUCCESS' if recovered else 'FAILED'}")
    print(f"Final state: {lsm.get_state().name}")
    
    print("\n" + "=" * 60)
    print("STATE MACHINE TEST COMPLETE")
    print("=" * 60)
