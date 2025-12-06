"""
Security Sector Demo

Demonstrates the NexusOS Security Adapter for access control
and secure communications with wavelength-encoded identity.

Run: python sdk/examples/security_demo.py
"""

import sys
sys.path.insert(0, '.')

from wnsp_v7.industry import SecurityAdapter
from wnsp_v7.industry.base import Attestation, SpectralBand


def main():
    print("=" * 60)
    print("NexusOS Security Sector Demo")
    print("Wavelength-Encoded Identity & Secure Communications")
    print("=" * 60)
    
    adapter = SecurityAdapter()
    
    print(f"\nSector: {adapter.sector_id}")
    print(f"Current Threat Level: {adapter.get_threat_level()}")
    print(f"\nAvailable Operations:")
    for op_id in adapter.list_operations():
        op_info = adapter.get_operation_info(op_id)
        print(f"  - {op_id}: {op_info.get('name', 'N/A')}")
    
    print("\n" + "-" * 60)
    print("1. IDENTITY AUTHENTICATION")
    print("-" * 60)
    
    spectral_sig = Attestation(
        type="spectral_signature",
        value="λ_SIG_7a8b9c0d1e2f",
        issuer="IdentityAuthority",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.authenticate(
        identity_id="USER-ALICE-001",
        spectral_signature="λ_SIG_7a8b9c0d1e2f",
        attestations=[spectral_sig],
        energy_escrow_nxt=10.0
    )
    
    print(f"Identity: USER-ALICE-001")
    print(f"Signature: λ_SIG_7a8b9c0d1e2f")
    print(f"Result: {'AUTHENTICATED' if result.success else 'FAILED'}")
    print(f"Lambda Mass: {result.lambda_mass:.6e} kg")
    
    print("\n" + "-" * 60)
    print("2. ACCESS AUTHORIZATION (ZEPTO-Level)")
    print("-" * 60)
    
    identity_proof = Attestation(
        type="identity_proof",
        value="VERIFIED",
        issuer="AuthSystem",
        band_level=SpectralBand.ZEPTO
    )
    clearance = Attestation(
        type="clearance_level",
        value="SECRET",
        issuer="ClearanceOffice",
        band_level=SpectralBand.ZEPTO
    )
    zone_perm = Attestation(
        type="zone_permission",
        value="ZONE-ALPHA",
        issuer="ZoneController",
        band_level=SpectralBand.ZEPTO
    )
    
    result = adapter.authorize(
        identity_id="USER-ALICE-001",
        zone_id="ZONE-ALPHA",
        access_type="read",
        attestations=[identity_proof, clearance, zone_perm],
        energy_escrow_nxt=1000.0
    )
    
    print(f"Identity: USER-ALICE-001")
    print(f"Zone: ZONE-ALPHA")
    print(f"Access Type: read")
    print(f"Result: {'AUTHORIZED' if result.success else 'DENIED'}")
    print(f"Band Used: {result.band_used.name}")
    
    grants = adapter.get_access_grants("USER-ALICE-001")
    print(f"Active Zone Access: {grants}")
    
    print("\n" + "-" * 60)
    print("3. SECURE COMMUNICATION")
    print("-" * 60)
    
    sender_sig = Attestation(
        type="sender_signature",
        value="λ_SEND_abc123",
        issuer="USER-ALICE-001",
        band_level=SpectralBand.FEMTO
    )
    recipient_key = Attestation(
        type="recipient_key",
        value="λ_RECV_def456",
        issuer="USER-BOB-001",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.communicate(
        sender_id="USER-ALICE-001",
        recipient_id="USER-BOB-001",
        message_content="Secure message with Lambda signature",
        attestations=[sender_sig, recipient_key],
        energy_escrow_nxt=10.0
    )
    
    print(f"From: USER-ALICE-001")
    print(f"To: USER-BOB-001")
    print(f"Result: {'SENT' if result.success else 'FAILED'}")
    print(f"Audit Hash: {result.audit_hash}")
    print(f"Message integrity guaranteed by Lambda signature")
    
    print("\n" + "-" * 60)
    print("4. THREAT ALERT (ATTO-Level)")
    print("-" * 60)
    
    threat_assessment = Attestation(
        type="threat_assessment",
        value="PERIMETER_BREACH",
        issuer="SecurityOps",
        band_level=SpectralBand.ATTO
    )
    authority_sig = Attestation(
        type="authority_signature",
        value="AUTH-SEC-CMD",
        issuer="SecurityCommand",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.alert(
        authority_id="SEC-CMD-001",
        alert_type="PERIMETER_BREACH",
        affected_zones=["ZONE-ALPHA", "ZONE-BETA"],
        threat_assessment="Unauthorized access detected",
        attestations=[threat_assessment, authority_sig],
        energy_escrow_nxt=100.0
    )
    
    print(f"Alert Type: PERIMETER_BREACH")
    print(f"Affected Zones: ZONE-ALPHA, ZONE-BETA")
    print(f"Result: {'BROADCAST' if result.success else 'FAILED'}")
    print(f"Band Used: {result.band_used.name} (5x energy multiplier)")
    
    print("\n" + "-" * 60)
    print("5. THREAT ESCALATION (YOCTO-Level)")
    print("-" * 60)
    
    threat_evidence = Attestation(
        type="threat_evidence",
        value="CONFIRMED_INTRUSION",
        issuer="IntelAnalysis",
        band_level=SpectralBand.YOCTO
    )
    multi_auth = Attestation(
        type="multi_authority_consensus",
        value="3_OF_5_CONFIRMED",
        issuer="SecurityCouncil",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.escalate(
        authority_id="SEC-COUNCIL",
        new_threat_level="ELEVATED",
        evidence={"reason": "Confirmed intrusion", "assets_affected": 3},
        attestations=[threat_evidence, multi_auth],
        energy_escrow_nxt=10000.0
    )
    
    print(f"Previous Level: NORMAL")
    print(f"New Level: ELEVATED")
    print(f"Result: {'ESCALATED' if result.success else 'FAILED'}")
    print(f"Current Threat Level: {adapter.get_threat_level()}")
    
    print("\n" + "=" * 60)
    print("Physics Rules:")
    print("  λ_identity = wavelength_signature(public_key, frequency_band)")
    print("  message_hash = Λ_signature(content)")
    print("  Tamper detection: Δλ > threshold triggers ATTO alert")
    print("=" * 60)


if __name__ == "__main__":
    main()
