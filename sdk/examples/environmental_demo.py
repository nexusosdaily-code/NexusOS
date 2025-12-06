"""
Environmental & Extraction Sector Demo

Demonstrates the NexusOS Environmental Adapter for extraction operations
with mandatory restoration escrow and carbon tracking.

Conservation Law: Λ_extracted ≤ Λ_restored + Λ_escrowed

Run: python sdk/examples/environmental_demo.py
"""

import sys
sys.path.insert(0, '.')

from wnsp_v7.industry import EnvironmentalAdapter
from wnsp_v7.industry.base import Attestation, SpectralBand


def main():
    print("=" * 70)
    print("NexusOS Environmental & Extraction Sector Demo")
    print("Physics-Based Conservation: Companies Cannot Extract Without Restoration")
    print("=" * 70)
    
    adapter = EnvironmentalAdapter()
    
    print(f"\nSector: {adapter.sector_id}")
    print(f"Restoration Escrow Minimum: {adapter.policy.constraints.get('restoration_escrow_minimum_percent', 150)}%")
    print(f"Conservation Law: {adapter.policy.constraints.get('conservation_law', 'N/A')}")
    print(f"\nAvailable Operations:")
    for op_id in adapter.list_operations():
        op_info = adapter.get_operation_info(op_id)
        print(f"  - {op_id}: {op_info.get('name', 'N/A')} (Band: {op_info.get('required_band', 'N/A')})")
    
    print("\n" + "-" * 70)
    print("1. EXTRACTION PERMIT APPLICATION (YOCTO-Level)")
    print("-" * 70)
    
    eia = Attestation(
        type="environmental_impact_assessment",
        value="EIA-2025-001",
        issuer="EnvironmentalAuthority",
        band_level=SpectralBand.YOCTO
    )
    restoration_plan = Attestation(
        type="restoration_plan",
        value="RESTORE-PLAN-001",
        issuer="EcologicalConsultants",
        band_level=SpectralBand.YOCTO
    )
    escrow_commit = Attestation(
        type="escrow_commitment",
        value="ESCROW-150-PERCENT",
        issuer="FinancialAuthority",
        band_level=SpectralBand.YOCTO
    )
    community = Attestation(
        type="community_consent",
        value="CONSENT-LOCAL-COMMUNITY",
        issuer="CommunityCouncil",
        band_level=SpectralBand.YOCTO
    )
    
    estimated_extraction_value = 1000000
    required_escrow = estimated_extraction_value * 1.5
    
    print(f"\nCompany: MINING-CORP-001")
    print(f"Site: COPPER-MINE-ALPHA")
    print(f"Estimated Extraction Value: {estimated_extraction_value:,} NXT")
    print(f"Required Restoration Escrow (150%): {required_escrow:,.0f} NXT")
    
    result = adapter.apply_for_permit(
        company_id="MINING-CORP-001",
        site_id="COPPER-MINE-ALPHA",
        resource_type="copper_ore",
        estimated_extraction_value_nxt=estimated_extraction_value,
        restoration_plan={
            "phases": ["soil_remediation", "revegetation", "water_treatment"],
            "timeline_years": 5,
            "target_ecosystem": "native_grassland"
        },
        environmental_impact={
            "affected_hectares": 500,
            "water_sources": ["river_delta"],
            "endangered_species": ["local_birds"]
        },
        attestations=[eia, restoration_plan, escrow_commit, community],
        energy_escrow_nxt=required_escrow
    )
    
    print(f"\nPermit Result: {'APPROVED' if result.success else 'DENIED'}")
    print(f"Message: {result.message}")
    print(f"Lambda Mass: {result.lambda_mass:.6e} kg")
    print(f"Escrow Locked: {adapter.get_escrow_balance('COPPER-MINE-ALPHA'):,.0f} NXT")
    
    print("\n" + "-" * 70)
    print("2. RESOURCE EXTRACTION (ZEPTO-Level)")
    print("-" * 70)
    
    extraction_license = Attestation(
        type="extraction_license",
        value="LICENSE-2025-COPPER",
        issuer="MiningAuthority",
        band_level=SpectralBand.ZEPTO
    )
    measurement = Attestation(
        type="quantity_measurement",
        value="CALIBRATED-SCALE-001",
        issuer="MeasurementBureau",
        band_level=SpectralBand.ZEPTO
    )
    coordinates = Attestation(
        type="site_coordinates",
        value="GPS:45.123,-110.456",
        issuer="SurveyOffice",
        band_level=SpectralBand.ZEPTO
    )
    
    result = adapter.extract_resource(
        site_id="COPPER-MINE-ALPHA",
        quantity=10000,
        unit="metric_tons",
        value_nxt=100000,
        attestations=[extraction_license, measurement, coordinates],
        energy_escrow_nxt=10000
    )
    
    print(f"\nExtraction: 10,000 metric tons copper ore")
    print(f"Value: 100,000 NXT")
    print(f"Result: {'RECORDED' if result.success else 'BLOCKED'}")
    print(f"Band Used: {result.band_used.name}")
    
    print("\n" + "-" * 70)
    print("3. CONSERVATION LAW VERIFICATION")
    print("-" * 70)
    
    is_conserved, message, balance = adapter.verify_conservation("COPPER-MINE-ALPHA")
    
    print(f"\nConservation Status: {'SATISFIED' if is_conserved else 'VIOLATION'}")
    print(f"Message: {message}")
    print(f"\nLambda Balance:")
    print(f"  Λ_extracted: {balance['lambda_extracted']:.6e} kg")
    print(f"  Λ_restored:  {balance['lambda_restored']:.6e} kg")
    print(f"  Λ_escrowed:  {balance['lambda_escrowed']:.6e} kg")
    print(f"\nEscrow Remaining: {balance['escrow_nxt']:,.0f} NXT")
    
    print("\n" + "-" * 70)
    print("4. RESTORATION MILESTONE (ATTO-Level)")
    print("-" * 70)
    
    restoration_verify = Attestation(
        type="restoration_verification",
        value="PHASE-1-COMPLETE",
        issuer="RestorationInspector",
        band_level=SpectralBand.ATTO
    )
    ecological = Attestation(
        type="ecological_survey",
        value="ECOLOGY-SURVEY-001",
        issuer="EcologyDepartment",
        band_level=SpectralBand.ATTO
    )
    audit = Attestation(
        type="third_party_audit",
        value="AUDIT-RESTORATION-001",
        issuer="IndependentAuditors",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.record_restoration(
        site_id="COPPER-MINE-ALPHA",
        restoration_type="soil_remediation",
        area_restored_hectares=100,
        restoration_value_nxt=200000,
        attestations=[restoration_verify, ecological, audit],
        energy_escrow_nxt=1000
    )
    
    print(f"\nRestoration Type: Soil Remediation")
    print(f"Area Restored: 100 hectares")
    print(f"Result: {'VERIFIED' if result.success else 'REJECTED'}")
    print(f"Message: {result.message}")
    
    site_status = adapter.get_site_status("COPPER-MINE-ALPHA")
    print(f"Restoration Progress: {site_status['restoration_progress']:.1f}%")
    
    print("\n" + "-" * 70)
    print("5. CARBON EMISSION & OFFSET TRACKING")
    print("-" * 70)
    
    emission_measure = Attestation(
        type="emission_measurement",
        value="SENSOR-CO2-001",
        issuer="EmissionMonitoring",
        band_level=SpectralBand.FEMTO
    )
    source_id = Attestation(
        type="source_identification",
        value="MINING-EQUIPMENT",
        issuer="AssetRegistry",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.record_emission(
        entity_id="MINING-CORP-001",
        emission_type="mining_operations",
        tons_co2=5000,
        source="diesel_equipment",
        attestations=[emission_measure, source_id],
        energy_escrow_nxt=100
    )
    
    print(f"\nEmission Recorded: 5,000 tons CO2")
    print(f"Source: Diesel Equipment")
    print(f"Result: {'RECORDED' if result.success else 'FAILED'}")
    
    offset_cert = Attestation(
        type="offset_certificate",
        value="CERT-FOREST-001",
        issuer="CarbonRegistry",
        band_level=SpectralBand.ZEPTO
    )
    verifier = Attestation(
        type="verification_body",
        value="VERIFIED-CARBON-ORG",
        issuer="CarbonStandard",
        band_level=SpectralBand.ZEPTO
    )
    permanence = Attestation(
        type="permanence_guarantee",
        value="50-YEAR-GUARANTEE",
        issuer="ForestTrust",
        band_level=SpectralBand.ZEPTO
    )
    
    result = adapter.register_offset(
        entity_id="MINING-CORP-001",
        offset_type="reforestation",
        tons_co2=6000,
        verification_body="CarbonStandard",
        project_details={
            "location": "Amazon Basin",
            "area_hectares": 1000,
            "species": "native_hardwood"
        },
        attestations=[offset_cert, verifier, permanence],
        energy_escrow_nxt=10000
    )
    
    print(f"\nOffset Registered: 6,000 tons CO2 (Reforestation)")
    print(f"Project: Amazon Basin - 1,000 hectares")
    print(f"Result: {'REGISTERED' if result.success else 'FAILED'}")
    
    is_neutral, carbon_msg, carbon_status = adapter.get_carbon_balance("MINING-CORP-001")
    print(f"\nCarbon Balance:")
    print(f"  Emissions: {carbon_status['total_emissions_tons']:,.0f} tons")
    print(f"  Offsets:   {carbon_status['total_offsets_tons']:,.0f} tons")
    print(f"  Net:       {carbon_status['net_balance_tons']:,.0f} tons")
    print(f"  Status:    {'CARBON NEUTRAL' if is_neutral else 'CARBON DEFICIT'}")
    
    print("\n" + "-" * 70)
    print("6. ENVIRONMENTAL VIOLATION (YOCTO-Level)")
    print("-" * 70)
    
    print("\nScenario: Water contamination detected at another site")
    
    adapter.apply_for_permit(
        company_id="BAD-MINING-CORP",
        site_id="VIOLATION-SITE",
        resource_type="lithium",
        estimated_extraction_value_nxt=500000,
        restoration_plan={"phases": ["basic"]},
        environmental_impact={"affected_hectares": 100},
        attestations=[eia, restoration_plan, escrow_commit, community],
        energy_escrow_nxt=750000
    )
    
    violation_evidence = Attestation(
        type="violation_evidence",
        value="WATER-SAMPLE-CONTAMINATED",
        issuer="EnvironmentalLab",
        band_level=SpectralBand.YOCTO
    )
    regulatory = Attestation(
        type="regulatory_authority",
        value="EPA-ENFORCEMENT",
        issuer="EPA",
        band_level=SpectralBand.YOCTO
    )
    damage = Attestation(
        type="damage_assessment",
        value="SEVERE-WATER-DAMAGE",
        issuer="DamageAssessors",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.record_violation(
        site_id="VIOLATION-SITE",
        violation_type="water_contamination",
        severity="critical",
        evidence={
            "contaminant": "heavy_metals",
            "concentration_ppm": 500,
            "affected_water_source": "local_aquifer"
        },
        damage_assessment_nxt=300000,
        attestations=[violation_evidence, regulatory, damage],
        energy_escrow_nxt=100000
    )
    
    print(f"\nViolation Type: Water Contamination (Critical)")
    print(f"Damage Assessment: 300,000 NXT")
    print(f"Result: {'ENFORCED' if result.success else 'FAILED'}")
    print(f"Message: {result.message}")
    
    violations = adapter.get_violations("BAD-MINING-CORP")
    print(f"\nViolations on Record: {len(violations)}")
    
    bad_site = adapter.get_site_status("VIOLATION-SITE")
    print(f"Site Status: {bad_site['status'].upper()}")
    print(f"Remaining Escrow: {adapter.get_escrow_balance('VIOLATION-SITE'):,.0f} NXT")
    
    print("\n" + "-" * 70)
    print("7. COMMUNITY BENEFIT DISTRIBUTION")
    print("-" * 70)
    
    benefit_calc = Attestation(
        type="benefit_calculation",
        value="CALC-ROYALTY-5PCT",
        issuer="BenefitCalculator",
        band_level=SpectralBand.ATTO
    )
    community_reg = Attestation(
        type="community_registry",
        value="COMMUNITY-ALPHA-001",
        issuer="CommunityRegistry",
        band_level=SpectralBand.ATTO
    )
    dist_verify = Attestation(
        type="distribution_verification",
        value="DIST-VERIFIED",
        issuer="DistributionAuthority",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.distribute_community_benefit(
        site_id="COPPER-MINE-ALPHA",
        community_id="LOCAL-COMMUNITY-001",
        benefit_amount_nxt=50000,
        benefit_type="extraction_royalty",
        attestations=[benefit_calc, community_reg, dist_verify],
        energy_escrow_nxt=1000
    )
    
    print(f"\nCommunity: LOCAL-COMMUNITY-001")
    print(f"Benefit Amount: 50,000 NXT")
    print(f"Type: Extraction Royalty")
    print(f"Result: {'DISTRIBUTED' if result.success else 'FAILED'}")
    
    print("\n" + "=" * 70)
    print("PHYSICS RULES FOR ENVIRONMENTAL GOVERNANCE")
    print("=" * 70)
    print("""
    Conservation Law:
        Λ_extracted ≤ Λ_restored + Λ_escrowed
        
    Carbon Balance:
        Σ_emissions ≤ Σ_offsets + Σ_sequestration
        
    Ecosystem Integrity:
        biodiversity_post ≥ biodiversity_pre × 0.9
        
    Escrow Enforcement:
        - 150% minimum restoration escrow BEFORE extraction
        - Automatic seizure on violations
        - Released only upon verified restoration milestones
        
    Constitutional Protection:
        - Community consent required (YOCTO attestation)
        - Third-party audits mandatory
        - Violations trigger PLANCK-level emergency shutdown
    """)
    print("=" * 70)
    print("EXTRACTION WITHOUT RESTORATION IS PHYSICALLY IMPOSSIBLE")
    print("The substrate enforces conservation - not regulators who can be bought.")
    print("=" * 70)


if __name__ == "__main__":
    main()
