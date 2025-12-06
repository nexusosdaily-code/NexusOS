"""
Supply Chain Sector Demo

Demonstrates the NexusOS Supply Chain Adapter for provenance
tracking and logistics with Lambda mass signatures.

Run: python sdk/examples/supply_chain_demo.py
"""

import sys
sys.path.insert(0, '.')

from wnsp_v7.industry import SupplyChainAdapter
from wnsp_v7.industry.base import Attestation, SpectralBand


def main():
    print("=" * 60)
    print("NexusOS Supply Chain Sector Demo")
    print("Lambda-Backed Provenance & Chain of Custody")
    print("=" * 60)
    
    adapter = SupplyChainAdapter()
    
    print(f"\nSector: {adapter.sector_id}")
    print(f"Provenance Required: {adapter.policy.constraints.get('provenance_required', True)}")
    print(f"Chain of Custody: {adapter.policy.constraints.get('chain_of_custody', 'unbroken')}")
    print(f"\nAvailable Operations:")
    for op_id in adapter.list_operations():
        op_info = adapter.get_operation_info(op_id)
        print(f"  - {op_id}: {op_info.get('name', 'N/A')}")
    
    print("\n" + "-" * 60)
    print("1. CREATE ASSET WITH ORIGIN PROVENANCE")
    print("-" * 60)
    
    mfg_cert = Attestation(
        type="manufacturer_certificate",
        value="MFG-CERT-ACME-001",
        issuer="ManufacturerRegistry",
        band_level=SpectralBand.ZEPTO
    )
    origin_loc = Attestation(
        type="origin_location",
        value="GPS:40.7128,-74.0060",
        issuer="LocationVerifier",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.create_asset(
        manufacturer_id="ACME-MFG-001",
        asset_data={
            "sku": "WIDGET-PRO-500",
            "batch": "BATCH-2025-001",
            "serial": "SN-00001",
            "description": "Industrial Widget Pro 500"
        },
        origin_location={"lat": 40.7128, "lon": -74.0060},
        attestations=[mfg_cert, origin_loc],
        energy_escrow_nxt=5.0
    )
    
    print(f"Manufacturer: ACME-MFG-001")
    print(f"SKU: WIDGET-PRO-500")
    print(f"Origin: New York (40.7128, -74.0060)")
    print(f"Result: {'CREATED' if result.success else 'FAILED'}")
    print(f"Transaction ID: {result.transaction_id}")
    
    asset_id = result.transaction_id.replace("supply_chain_", "ASSET_") if result.success else None
    assets = list(adapter._assets.keys())
    if assets:
        asset_id = assets[0]
        asset = adapter.get_asset(asset_id)
        print(f"\nAsset ID: {asset_id}")
        print(f"Lambda Origin: {asset.get('lambda_origin', 'N/A')}")
    
    print("\n" + "-" * 60)
    print("2. CUSTODY TRANSFER WITH LAMBDA CHAIN")
    print("-" * 60)
    
    if asset_id:
        sender_sig = Attestation(
            type="sender_signature",
            value="SIG-ACME-001",
            issuer="ACME-MFG-001",
            band_level=SpectralBand.FEMTO
        )
        receiver_sig = Attestation(
            type="receiver_signature",
            value="SIG-DIST-001",
            issuer="DIST-WAREHOUSE-001",
            band_level=SpectralBand.FEMTO
        )
        condition = Attestation(
            type="condition_attestation",
            value="GOOD",
            issuer="QualityControl",
            band_level=SpectralBand.FEMTO
        )
        
        result = adapter.transfer_custody(
            asset_id=asset_id,
            from_custodian="ACME-MFG-001",
            to_custodian="DIST-WAREHOUSE-001",
            condition_report="Excellent - factory sealed",
            attestations=[sender_sig, receiver_sig, condition],
            energy_escrow_nxt=5.0
        )
        
        print(f"From: ACME-MFG-001 (Manufacturer)")
        print(f"To: DIST-WAREHOUSE-001 (Distributor)")
        print(f"Condition: Excellent - factory sealed")
        print(f"Result: {'TRANSFERRED' if result.success else 'FAILED'}")
        
        chain = adapter.get_custody_chain(asset_id)
        print(f"\nCustody Chain Length: {len(chain)}")
        for i, hash_val in enumerate(chain):
            label = "Origin" if i == 0 else f"Transfer {i}"
            print(f"  {i+1}. [{label}] {hash_val}")
    
    print("\n" + "-" * 60)
    print("3. INITIATE SHIPMENT (ATTO-Level)")
    print("-" * 60)
    
    if asset_id:
        carrier_id_att = Attestation(
            type="carrier_id",
            value="CARRIER-EXPRESS-001",
            issuer="CarrierRegistry",
            band_level=SpectralBand.ATTO
        )
        route_plan = Attestation(
            type="route_plan",
            value="NYC-CHI-LA",
            issuer="LogisticsPlanning",
            band_level=SpectralBand.ATTO
        )
        insurance = Attestation(
            type="insurance_proof",
            value="INS-CARGO-001",
            issuer="InsuranceProvider",
            band_level=SpectralBand.ATTO
        )
        
        result = adapter.ship(
            assets=[asset_id],
            carrier_id="CARRIER-EXPRESS-001",
            origin="NYC-WAREHOUSE",
            destination="LA-RETAIL",
            route_plan=["NYC", "CHICAGO", "DENVER", "LA"],
            attestations=[carrier_id_att, route_plan, insurance],
            energy_escrow_nxt=50.0
        )
        
        print(f"Carrier: CARRIER-EXPRESS-001")
        print(f"Route: NYC → Chicago → Denver → LA")
        print(f"Assets: 1")
        print(f"Result: {'SHIPPED' if result.success else 'FAILED'}")
        print(f"Band Used: {result.band_used.name}")
    
    print("\n" + "-" * 60)
    print("4. VERIFY PROVENANCE")
    print("-" * 60)
    
    if asset_id:
        result = adapter.verify_provenance(
            asset_id=asset_id,
            energy_escrow_nxt=0.5
        )
        
        print(f"Asset ID: {asset_id}")
        print(f"Verification Result: {result.message}")
        
        chain = adapter.get_custody_chain(asset_id)
        print(f"\nComplete Chain of Custody:")
        print(f"  Origin → Manufacturer → Distributor (verified)")
        print(f"  {len(chain)} Lambda signatures in chain")
    
    print("\n" + "-" * 60)
    print("5. PRODUCT CERTIFICATION (YOCTO-Level)")
    print("-" * 60)
    
    if asset_id:
        testing = Attestation(
            type="testing_results",
            value="PASSED-ALL",
            issuer="TestingLab",
            band_level=SpectralBand.ZEPTO
        )
        regulatory = Attestation(
            type="regulatory_compliance",
            value="FDA-APPROVED",
            issuer="FDA",
            band_level=SpectralBand.YOCTO
        )
        certifier = Attestation(
            type="certifier_authority",
            value="CERT-AUTH-001",
            issuer="CertificationBoard",
            band_level=SpectralBand.YOCTO
        )
        
        result = adapter.certify(
            asset_id=asset_id,
            certification_type="FDA_APPROVED",
            certifier_id="FDA-CERT-OFFICE",
            testing_results={
                "safety": "PASS",
                "efficacy": "PASS",
                "quality": "PASS"
            },
            attestations=[testing, regulatory, certifier],
            energy_escrow_nxt=5000.0
        )
        
        print(f"Certification: FDA_APPROVED")
        print(f"Certifier: FDA-CERT-OFFICE")
        print(f"Result: {'CERTIFIED' if result.success else 'FAILED'}")
        
        certs = adapter.get_certifications(asset_id)
        print(f"Asset Certifications: {certs}")
    
    print("\n" + "-" * 60)
    print("PHYSICS RULES")
    print("-" * 60)
    
    print("""
Provenance Signature:
  Λ_origin = wavelength_hash(manufacturer, timestamp, location)

Custody Chain:
  Λ_chain = sequential_hash(Λ_origin, Λ_transfer_1, Λ_transfer_2, ...)

Verification:
  verify(asset) = validate_lambda_chain(asset.custody_chain)

Counterfeit Detection:
  Λ_signature mismatch → YOCTO-level alert
    """)
    
    print("=" * 60)
    print("Every transfer adds to the Lambda chain.")
    print("Counterfeit products have broken chains.")
    print("Physics provides provenance, not paperwork.")
    print("=" * 60)


if __name__ == "__main__":
    main()
