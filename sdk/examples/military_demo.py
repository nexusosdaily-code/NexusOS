"""
Military Sector Demo

Demonstrates the NexusOS Military Adapter for command & control
with confined dominance windows for mission-critical operations.

Run: python sdk/examples/military_demo.py
"""

import sys
sys.path.insert(0, '.')

from wnsp_v7.industry import MilitaryAdapter
from wnsp_v7.industry.base import Attestation, SpectralBand


def main():
    print("=" * 60)
    print("NexusOS Military Sector Demo")
    print("Command & Control with Constitutional Audit")
    print("=" * 60)
    
    adapter = MilitaryAdapter()
    
    print(f"\nSector: {adapter.sector_id}")
    print(f"BHLS Applicable: {adapter.policy.constraints.get('bhls_applicable', True)}")
    print(f"Confined Dominance Allowed: {adapter.policy.constraints.get('confined_dominance_allowed', False)}")
    print(f"\nAvailable Operations:")
    for op_id in adapter.list_operations():
        op_info = adapter.get_operation_info(op_id)
        print(f"  - {op_id}: {op_info.get('name', 'N/A')} (Band: {op_info.get('required_band', 'N/A')})")
    
    print("\n" + "-" * 60)
    print("1. ISSUE TACTICAL COMMAND (ATTO-Level)")
    print("-" * 60)
    
    commander_auth = Attestation(
        type="commander_authority",
        value="CDR-AUTH-LT001",
        issuer="CommandHQ",
        band_level=SpectralBand.ATTO
    )
    mission_context = Attestation(
        type="mission_context",
        value="MISSION-ALPHA-001",
        issuer="MissionPlanning",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.issue_command(
        commander_id="CDR-LT-SMITH",
        command_type="tactical",
        target_units=["UNIT-ALPHA", "UNIT-BRAVO"],
        command_details={
            "action": "secure_perimeter",
            "coordinates": "GRID-123-456",
            "priority": "high"
        },
        attestations=[commander_auth, mission_context],
        energy_escrow_nxt=1000.0
    )
    
    print(f"Commander: CDR-LT-SMITH")
    print(f"Command Type: tactical")
    print(f"Target Units: UNIT-ALPHA, UNIT-BRAVO")
    print(f"Result: {'SUCCESS' if result.success else 'FAILED'}")
    print(f"Lambda Mass: {result.lambda_mass:.6e} kg")
    print(f"Audit Hash: {result.audit_hash}")
    
    print("\n" + "-" * 60)
    print("2. INTELLIGENCE REPORT (FEMTO-Level)")
    print("-" * 60)
    
    source_class = Attestation(
        type="source_classification",
        value="HUMINT",
        issuer="IntelOps",
        band_level=SpectralBand.FEMTO
    )
    reliability = Attestation(
        type="reliability_rating",
        value="B-LIKELY",
        issuer="IntelAnalysis",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.intel_report(
        source_id="INTEL-AGENT-007",
        intel_type="SIGINT",
        classification="SECRET",
        reliability_rating="B",
        intel_data={
            "target": "OBJECTIVE-CHARLIE",
            "observation": "Movement detected",
            "timestamp": "2025-12-03T14:30:00Z"
        },
        attestations=[source_class, reliability],
        energy_escrow_nxt=100.0
    )
    
    print(f"Source: INTEL-AGENT-007")
    print(f"Classification: SECRET")
    print(f"Reliability: B (Likely)")
    print(f"Result: {'SUBMITTED' if result.success else 'FAILED'}")
    
    print("\n" + "-" * 60)
    print("3. COALITION COORDINATION (YOCTO-Level)")
    print("-" * 60)
    
    nation_sigs = Attestation(
        type="nation_signatures",
        value="USA,UK,AUS",
        issuer="AllianceCommand",
        band_level=SpectralBand.YOCTO
    )
    shared_roe = Attestation(
        type="shared_roe",
        value="ROE-COALITION-001",
        issuer="JointCommand",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.coalition(
        lead_nation="USA",
        participating_nations=["USA", "UK", "AUS"],
        operation_name="OPERATION-UNITY",
        shared_roe={
            "engagement_rules": "proportional_response",
            "civilian_protection": "absolute",
            "escalation_authority": "coalition_command"
        },
        attestations=[nation_sigs, shared_roe],
        energy_escrow_nxt=100000.0
    )
    
    print(f"Operation: OPERATION-UNITY")
    print(f"Lead Nation: USA")
    print(f"Participants: USA, UK, AUS")
    print(f"Result: {'COORDINATED' if result.success else 'FAILED'}")
    print(f"Band Used: {result.band_used.name}")
    
    roe = adapter.get_roe("OPERATION-UNITY")
    if roe:
        print(f"Shared ROE: {roe.get('engagement_rules', 'N/A')}")
    
    print("\n" + "-" * 60)
    print("4. CONFINED DOMINANCE WINDOW (YOCTO-Level)")
    print("-" * 60)
    
    print("\nConfined Dominance Window Rules:")
    print("  - Maximum Duration: 72 hours")
    print("  - Maximum Scope Authority: 25%")
    print("  - YOCTO-level authorization required")
    print("  - Full audit trail at YOCTO/PLANCK level")
    print("  - Cannot override C-0002 (Immutable Rights)")
    print("\n  PROHIBITED even with window:")
    print("  - Civilian targeting")
    print("  - Constitutional amendment")
    print("  - Evidence destruction")
    
    mission_just = Attestation(
        type="mission_justification",
        value="CRITICAL_EXTRACTION",
        issuer="NationalCommand",
        band_level=SpectralBand.YOCTO
    )
    time_bound = Attestation(
        type="time_bound",
        value="24_HOURS",
        issuer="LegalReview",
        band_level=SpectralBand.YOCTO
    )
    scope_limit = Attestation(
        type="scope_limitation",
        value="ZONE-DELTA-ONLY",
        issuer="OperationsCommand",
        band_level=SpectralBand.YOCTO
    )
    audit_commit = Attestation(
        type="audit_commitment",
        value="FULL_AUDIT_YOCTO",
        issuer="OversightBoard",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.grant_dominance_window(
        authority_id="NATL-CMD-001",
        scope=["ZONE-DELTA"],
        duration_hours=24,
        max_authority_percent=20.0,
        mission_justification="Critical asset extraction requiring elevated command authority",
        attestations=[mission_just, time_bound, scope_limit, audit_commit],
        energy_escrow_nxt=500000.0
    )
    
    print(f"\nDominance Window Request:")
    print(f"  Scope: ZONE-DELTA")
    print(f"  Duration: 24 hours")
    print(f"  Max Authority: 20%")
    print(f"  Result: {'GRANTED' if result.success else 'DENIED'}")
    
    active_windows = adapter.get_active_windows()
    if active_windows:
        print(f"\nActive Windows: {len(active_windows)}")
        for w in active_windows:
            print(f"  - {w['window_id']}: {w['remaining_hours']:.1f}h remaining")
    
    print("\n" + "-" * 60)
    print("5. BAND AUTHORITY HIERARCHY")
    print("-" * 60)
    
    print("\n  PLANCK: Strategic Command (95% quorum)")
    print("    - Nuclear authorization")
    print("    - War declaration")
    print("    - Alliance activation")
    print("\n  YOCTO: Mission Authority (80% quorum)")
    print("    - Mission authorization")
    print("    - ROE activation")
    print("    - Confined dominance grant")
    print("\n  ATTO: Tactical Operations")
    print("    - Tactical command")
    print("    - Fire mission")
    print("    - Real-time coordination")
    
    print("\n" + "=" * 60)
    print("Constitutional Constraints:")
    print("  C-0001: No entity > 5% authority (except confined windows)")
    print("  C-0002: Immutable Rights ALWAYS protected")
    print("  C-0003: All actions require energy escrow")
    print("=" * 60)


if __name__ == "__main__":
    main()
