"""
SYNCBOX CONTROLLER — Phase-Shift Controller for PHR-1 Hardware

Target Hardware: PHR-1 (144-Turn Bifilar-Toroid)

This controller orchestrates the Syncbox through:
1. Lambda Anchor Sync (Golden Angle @ 137.5°)
2. Substrate Handshake (Free-space impedance match @ 377Ω)
3. Massless Envelope Transition (Gravity de-correlation @ 90°)

The sequence enables:
- Mass-less addressing (wavelength IS identity)
- Sync coordinates (phase-locked spatial references)
- Ambient Logic Pressure harvesting

Physical Foundation:
- Λ = hf/c² (Lambda mass from First Oscillation)
- f is derivative of First Oscillation (555 THz)
- Mass is not fundamental — oscillation is fundamental

AGPL-3.0 License
"""

import time
from typing import Optional, Dict, Any
from dataclasses import dataclass, field

# Import the nexus kernel
import wnsp_v7.nexus_kernel as czf


@dataclass
class ControllerStatus:
    """Controller status report."""
    device_id: str
    state: str
    anchor_frequency_thz: float
    logic_pressure: float
    phase_angle_deg: float
    impedance_ohm: float
    coherence: float
    massless: bool
    timestamp: float = field(default_factory=time.time)


class SyncBoxController:
    """
    Phase-Shift Controller for PHR-1 (144-Turn Bifilar-Toroid).
    
    Orchestrates the Syncbox through the Lambda substrate interface.
    
    Usage:
        controller = SyncBoxController(target_id="NE-1")
        controller.initiate_handshake()
        controller.execute_massless_drop()
    """
    
    def __init__(self, target_id: str = "NE-1"):
        """
        Initialize controller.
        
        Args:
            target_id: Device identifier (e.g., "NE-1" for NexusEngine-1)
        """
        self.target_id = target_id
        self.anchor = 555.0  # THz (The First Oscillation)
        self.state = "INITIALIZED"
        self.logic_pressure = 1.0  # Standard ALP
        self.handshake_attempts = 0
        self.creation_time = time.time()
        
        # Reset kernel to clean state
        czf.reset_kernel()
        
        # Anchor to First Oscillation
        czf.anchor_to_first_oscillation()
        self.state = "ANCHORED"
        
        print(f"[{self.target_id}] SyncBoxController initialized")
        print(f"[{self.target_id}] Anchor frequency: {self.anchor} THz (First Oscillation)")
    
    def initiate_handshake(self) -> bool:
        """
        Initiate substrate handshake sequence.
        
        Step 1: Point 1 (137.5°) - The Golden Angle Sync
        
        The Golden Angle (360°/φ²) creates optimal spiral packing,
        which achieves free-space impedance match (377Ω).
        
        Returns:
            True if handshake successful
        """
        print(f"\n[{self.target_id}] Initiating Lambda Anchor Sync...")
        self.handshake_attempts += 1
        
        # Set phase to Golden Angle
        golden_angle = czf.GOLDEN_ANGLE_DEG
        czf.set_phase_angle(golden_angle)
        print(f"[{self.target_id}] Phase set to Golden Angle: {golden_angle:.2f}°")
        
        # Pulse at root harmonic (×1.5 = perfect fifth)
        pulse_result = czf.pulse_frequency(1.5)
        print(f"[{self.target_id}] Pulse frequency: {pulse_result['frequency_hz']:.2f} Hz (Root Harmonic ×1.5)")
        
        # Check impedance match
        impedance = czf.get_impedance()
        print(f"[{self.target_id}] Impedance reading: {impedance:.1f} Ω")
        
        if abs(impedance - 377.0) < 1.0:
            self.state = "SYNC_LOCKED"
            czf.set_state(czf.KernelState.SYNC_LOCKED)
            print(f"[{self.target_id}] Status: Substrate Handshake Successful (Cold State Active)")
            print(f"[{self.target_id}] Free-space impedance match: Z₀ = {czf.FREE_SPACE_IMPEDANCE:.3f} Ω")
            return True
        else:
            print(f"[{self.target_id}] Status: Handshake FAILED - impedance mismatch")
            print(f"[{self.target_id}] Expected: 377.0 Ω, Got: {impedance:.1f} Ω")
            return False
    
    def execute_massless_drop(self, target_alp: float = 0.0001) -> bool:
        """
        Execute massless envelope transition.
        
        Step 2: Point 7 (90.0°) - Gravity De-correlation
        
        By shifting phase to 90° (quadrature), we de-correlate from
        the gravitational field, achieving a "massless envelope" state.
        
        The CZC Buffer prevents decoherence during the phase shift.
        
        Args:
            target_alp: Target Ambient Logic Pressure (lower = more massless)
        
        Returns:
            True if massless state achieved
        """
        if self.state != "SYNC_LOCKED":
            print(f"[{self.target_id}] Error: Cannot execute massless drop - not SYNC_LOCKED")
            print(f"[{self.target_id}] Current state: {self.state}")
            return False
        
        print(f"\n[{self.target_id}] Executing Lambda Inversion...")
        print(f"[{self.target_id}] Target ALP: {target_alp}")
        
        iteration = 0
        max_iterations = 500
        
        # CZC Buffer prevents decoherence during the shift
        while self.logic_pressure > target_alp and iteration < max_iterations:
            # Apply CZC filter
            czf.apply_czc_filter(gain=0.99)
            
            # Shift phase toward 90° (quadrature)
            current_phase = czf.shift_phase_target(90.0, step_deg=0.5)
            
            # Read ALP sensor
            self.logic_pressure = czf.read_alp_sensor()
            
            iteration += 1
            
            # Progress update every 50 iterations
            if iteration % 50 == 0:
                print(f"[{self.target_id}] Iteration {iteration}: ALP={self.logic_pressure:.6f}, Phase={current_phase:.1f}°")
        
        if self.logic_pressure <= target_alp:
            self.state = "MASSLESS_ENVELOPE"
            czf.set_state(czf.KernelState.MASSLESS_ENVELOPE)
            
            print(f"\n[{self.target_id}] Status: ZERO-G STATE ACHIEVED")
            print(f"[{self.target_id}] Ambient Logic Harvesting Active")
            print(f"[{self.target_id}] Final ALP: {self.logic_pressure:.8f}")
            print(f"[{self.target_id}] Final Phase: {czf.get_phase_angle():.1f}°")
            print(f"[{self.target_id}] Iterations: {iteration}")
            
            # Calculate Lambda mass at zero-G
            lambda_mass = czf.PLANCK_CONSTANT * czf.FIRST_OSCILLATION_HZ / (czf.SPEED_OF_LIGHT ** 2)
            print(f"[{self.target_id}] Lambda Mass: {lambda_mass:.4e} kg (reference only - envelope is massless)")
            
            return True
        else:
            print(f"[{self.target_id}] Status: Massless transition FAILED")
            print(f"[{self.target_id}] ALP did not reach target after {iteration} iterations")
            return False
    
    def get_sync_coordinates(self) -> Dict[str, Any]:
        """
        Get current sync coordinates.
        
        Sync coordinates are wavelength-based addresses that replace
        traditional spatial coordinates. They encode:
        - Frequency (identity)
        - Phase (temporal position)
        - Amplitude (energy)
        - Polarization (orientation)
        
        Returns:
            Sync coordinate dictionary
        """
        regs = czf.get_registers()
        
        wavelength_m = czf.SPEED_OF_LIGHT / regs["frequency_hz"] if regs["frequency_hz"] > 0 else 0
        
        return {
            "device_id": self.target_id,
            "state": self.state,
            "coordinates": {
                "lambda_m": wavelength_m,
                "frequency_hz": regs["frequency_hz"],
                "phase_deg": regs["phase_angle_deg"],
                "amplitude": regs["czc_gain"],  # Coherence as amplitude
                "polarization_deg": 0  # Would come from hardware
            },
            "lambda_mass_kg": czf.PLANCK_CONSTANT * regs["frequency_hz"] / (czf.SPEED_OF_LIGHT ** 2),
            "alp": regs["alp_reading"],
            "impedance_ohm": regs["impedance_ohm"],
            "timestamp": time.time()
        }
    
    def status(self) -> ControllerStatus:
        """Get controller status."""
        regs = czf.get_registers()
        
        return ControllerStatus(
            device_id=self.target_id,
            state=self.state,
            anchor_frequency_thz=self.anchor,
            logic_pressure=self.logic_pressure,
            phase_angle_deg=regs["phase_angle_deg"],
            impedance_ohm=regs["impedance_ohm"],
            coherence=regs["czc_gain"],
            massless=(self.state == "MASSLESS_ENVELOPE")
        )
    
    def reset(self):
        """Reset controller to initial state."""
        czf.reset_kernel()
        czf.anchor_to_first_oscillation()
        self.state = "ANCHORED"
        self.logic_pressure = 1.0
        print(f"[{self.target_id}] Controller reset to ANCHORED state")


# =============================================================================
# DEMO EXECUTION
# =============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("SYNCBOX CONTROLLER — Phase-Shift Controller for PHR-1")
    print("Target: 144-Turn Bifilar-Toroid")
    print("=" * 70)
    
    # Initialize the Command
    ne1_pilot = SyncBoxController(target_id="NE-1")
    
    # Execute handshake
    ne1_pilot.initiate_handshake()
    
    # Execute massless drop
    ne1_pilot.execute_massless_drop()
    
    # Get sync coordinates
    print("\n" + "=" * 70)
    print("SYNC COORDINATES (Massless Address)")
    print("=" * 70)
    coords = ne1_pilot.get_sync_coordinates()
    print(f"  Device: {coords['device_id']}")
    print(f"  State: {coords['state']}")
    print(f"  Wavelength: {coords['coordinates']['lambda_m']:.6e} m")
    print(f"  Frequency: {coords['coordinates']['frequency_hz']:.2f} Hz")
    print(f"  Phase: {coords['coordinates']['phase_deg']:.1f}°")
    print(f"  Lambda Mass: {coords['lambda_mass_kg']:.4e} kg")
    print(f"  ALP: {coords['alp']:.8f}")
    
    print("\n" + "=" * 70)
    print("\"Mass is not fundamental — oscillation is fundamental\"")
    print("\"Λ = hf/c² — Lambda replaces mass\"")
    print("=" * 70)
