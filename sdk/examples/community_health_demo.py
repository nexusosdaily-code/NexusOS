"""
Community Health Sector Demo

Universal health programs for ALL peoples worldwide.
Nutrition, fitness, health education in local languages, and remote infrastructure.
BHLS floor of 1,150 NXT/month guaranteed for every person.

Run: python sdk/examples/community_health_demo.py
"""

import sys
sys.path.insert(0, '.')

from wnsp_v7.industry import CommunityHealthAdapter, ProgramType
from wnsp_v7.industry.base import Attestation, SpectralBand


def main():
    print("=" * 70)
    print("NexusOS Community Health Sector Demo")
    print("Universal Health Programs for ALL Peoples Worldwide")
    print("=" * 70)
    
    adapter = CommunityHealthAdapter()
    
    print(f"\nSector: {adapter.sector_id}")
    print(f"BHLS Monthly Floor: {adapter.BHLS_MONTHLY_FLOOR:,} NXT per person")
    print(f"Universal Coverage: {adapter.policy.constraints.get('universal_coverage', True)}")
    
    print("\n" + "-" * 70)
    print("1. REGISTER COMMUNITIES (YOCTO-Level)")
    print("-" * 70)
    
    leader = Attestation(
        type="community_leadership_approval",
        value="LEADER-APPROVAL-001",
        issuer="CommunityCouncil",
        band_level=SpectralBand.YOCTO
    )
    location = Attestation(
        type="location_verification",
        value="GPS:12.345,67.890",
        issuer="GeographicRegistry",
        band_level=SpectralBand.YOCTO
    )
    census = Attestation(
        type="population_census",
        value="CENSUS-2025",
        issuer="PopulationAuthority",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.register_community(
        community_id="VILLAGE-SUNRISE",
        name="Sunrise Village",
        location={"country": "Global South", "region": "Mountain Valley", "remote": True},
        population=500,
        languages=["Local Language A", "English"],
        attestations=[leader, location, census],
        energy_escrow_nxt=10000
    )
    print(f"\nCommunity: Sunrise Village")
    print(f"Population: 500")
    print(f"Languages: Local Language A, English")
    print(f"Result: {'REGISTERED' if result.success else 'FAILED'}")
    
    result = adapter.register_community(
        community_id="COASTAL-HAVEN",
        name="Coastal Haven",
        location={"country": "Pacific Islands", "region": "Coastal", "remote": True},
        population=300,
        languages=["Pacific Language B", "French"],
        attestations=[leader, location, census],
        energy_escrow_nxt=10000
    )
    print(f"\nCommunity: Coastal Haven")
    print(f"Population: 300")
    print(f"Languages: Pacific Language B, French")
    print(f"Result: {'REGISTERED' if result.success else 'FAILED'}")
    
    print("\n" + "-" * 70)
    print("2. ENROLL MEMBERS WITH BHLS GUARANTEE (ATTO-Level)")
    print("-" * 70)
    
    identity = Attestation(
        type="identity_verification",
        value="ID-VERIFIED",
        issuer="IdentityAuthority",
        band_level=SpectralBand.ATTO
    )
    membership = Attestation(
        type="community_membership",
        value="MEMBER-CONFIRMED",
        issuer="CommunityRegistry",
        band_level=SpectralBand.ATTO
    )
    bhls_eligible = Attestation(
        type="bhls_eligibility",
        value="ELIGIBLE",
        issuer="BHLSAuthority",
        band_level=SpectralBand.ATTO
    )
    
    members = [
        ("MEMBER-001", "Maria Santos", 35),
        ("MEMBER-002", "Child A", 8),
        ("MEMBER-003", "Elder B", 72),
        ("MEMBER-004", "Young Adult C", 22),
    ]
    
    for member_id, name, age in members:
        result = adapter.enroll_member(
            member_id=member_id,
            community_id="VILLAGE-SUNRISE",
            name=name,
            age=age,
            attestations=[identity, membership, bhls_eligible],
            energy_escrow_nxt=100
        )
        
        member = adapter._members.get(member_id, {})
        supplement_type = ""
        if age < 18:
            supplement_type = " (+25% child supplement)"
        elif age >= 65:
            supplement_type = " (+15% elder supplement)"
        
        print(f"{name} (age {age}): {member.get('bhls_amount', 0):,.0f} NXT/month{supplement_type}")
    
    total_bhls, member_count = adapter.calculate_total_bhls_required()
    print(f"\nTotal BHLS Required: {total_bhls:,.0f} NXT/month for {member_count} members")
    
    print("\n" + "-" * 70)
    print("3. ALLOCATE FUNDS TO PROGRAMS (ZEPTO-Level)")
    print("-" * 70)
    
    budget = Attestation(
        type="budget_approval",
        value="BUDGET-APPROVED",
        issuer="FundingAuthority",
        band_level=SpectralBand.ZEPTO
    )
    program = Attestation(
        type="program_verification",
        value="PROGRAM-VERIFIED",
        issuer="HealthMinistry",
        band_level=SpectralBand.ZEPTO
    )
    oversight = Attestation(
        type="oversight_committee",
        value="OVERSIGHT-ACTIVE",
        issuer="CommunityOversight",
        band_level=SpectralBand.ZEPTO
    )
    
    allocations = [
        ("ALLOC-NUTRITION", ProgramType.NUTRITION, 500000, "Nutrition Programs"),
        ("ALLOC-CHILD", ProgramType.CHILD_NUTRITION, 300000, "Child Nutrition"),
        ("ALLOC-FITNESS", ProgramType.FITNESS, 200000, "Fitness Programs"),
        ("ALLOC-EDUCATION", ProgramType.HEALTH_EDUCATION, 250000, "Health Education"),
        ("ALLOC-INFRA", ProgramType.INFRASTRUCTURE, 1000000, "Remote Infrastructure"),
    ]
    
    for alloc_id, prog_type, amount, name in allocations:
        result = adapter.allocate_funds(
            allocation_id=alloc_id,
            program_type=prog_type,
            amount_nxt=amount,
            target_communities=["VILLAGE-SUNRISE", "COASTAL-HAVEN"],
            duration_months=12,
            attestations=[budget, program, oversight],
            energy_escrow_nxt=1000
        )
        print(f"{name}: {amount:,} NXT allocated")
    
    fund_status = adapter.get_program_fund_status()
    print(f"\nTotal Allocated: {fund_status['total_allocated']:,.0f} NXT")
    
    print("\n" + "-" * 70)
    print("4. DISBURSE FUNDS TO OPERATORS")
    print("-" * 70)
    
    alloc_ref = Attestation(
        type="allocation_reference",
        value="ALLOC-NUTRITION",
        issuer="FundManager",
        band_level=SpectralBand.ATTO
    )
    recipient = Attestation(
        type="recipient_verification",
        value="RECIPIENT-VERIFIED",
        issuer="OperatorRegistry",
        band_level=SpectralBand.ATTO
    )
    approval = Attestation(
        type="disbursement_approval",
        value="DISBURSEMENT-APPROVED",
        issuer="FinanceCommittee",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.disburse_funds(
        allocation_id="ALLOC-NUTRITION",
        recipient_id="LOCAL-NUTRITION-ORG",
        amount_nxt=50000,
        purpose="Q1 nutrition program delivery",
        attestations=[alloc_ref, recipient, approval],
        energy_escrow_nxt=100
    )
    print(f"Disbursed 50,000 NXT to LOCAL-NUTRITION-ORG: {'SUCCESS' if result.success else 'FAILED'}")
    
    alloc = adapter.get_fund_allocation("ALLOC-NUTRITION")
    print(f"Nutrition Fund Remaining: {alloc['remaining_amount']:,.0f} NXT")
    
    print("\n" + "-" * 70)
    print("5. CHILD NUTRITION PROGRAM")
    print("-" * 70)
    
    child_reg = Attestation(
        type="child_registry",
        value="CHILD-REGISTERED",
        issuer="ChildWelfare",
        band_level=SpectralBand.ATTO
    )
    growth = Attestation(
        type="growth_tracking",
        value="GROWTH-MONITORED",
        issuer="HealthClinic",
        band_level=SpectralBand.ATTO
    )
    nutrition_assess = Attestation(
        type="nutrition_assessment",
        value="NUTRITION-OK",
        issuer="Nutritionist",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.record_child_nutrition(
        child_id="MEMBER-002",
        community_id="VILLAGE-SUNRISE",
        meal_type="school_lunch",
        calories=650,
        nutrients={"protein_g": 25, "carbs_g": 80, "vitamins": ["A", "C", "D"]},
        attestations=[child_reg, growth, nutrition_assess],
        energy_escrow_nxt=100
    )
    print(f"Child A - School Lunch: 650 calories")
    print(f"Nutrients: 25g protein, 80g carbs, Vitamins A/C/D")
    print(f"Result: {'RECORDED' if result.success else 'FAILED'}")
    
    print("\n" + "-" * 70)
    print("6. FITNESS PROGRAM")
    print("-" * 70)
    
    instructor = Attestation(
        type="instructor_certification",
        value="CERTIFIED-INSTRUCTOR",
        issuer="FitnessAuthority",
        band_level=SpectralBand.FEMTO
    )
    attendance = Attestation(
        type="attendance_record",
        value="ATTENDANCE-LOGGED",
        issuer="SessionManager",
        band_level=SpectralBand.FEMTO
    )
    activity = Attestation(
        type="activity_log",
        value="ACTIVITY-COMPLETE",
        issuer="FitnessTracker",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.record_fitness_session(
        session_id="FITNESS-001",
        community_id="VILLAGE-SUNRISE",
        activity_type="community_yoga",
        participants=45,
        duration_minutes=60,
        attestations=[instructor, attendance, activity],
        energy_escrow_nxt=10
    )
    print(f"Community Yoga: 45 participants, 60 minutes")
    print(f"Result: {'RECORDED' if result.success else 'FAILED'}")
    
    print("\n" + "-" * 70)
    print("7. HEALTH EDUCATION IN LOCAL LANGUAGE")
    print("-" * 70)
    
    lang_cert = Attestation(
        type="language_certification",
        value="NATIVE-SPEAKER",
        issuer="LanguageAuthority",
        band_level=SpectralBand.ATTO
    )
    content = Attestation(
        type="content_approval",
        value="CONTENT-APPROVED",
        issuer="HealthEducationBoard",
        band_level=SpectralBand.ATTO
    )
    community_accept = Attestation(
        type="community_acceptance",
        value="COMMUNITY-ACCEPTED",
        issuer="CommunityCouncil",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.deliver_health_education(
        session_id="EDU-001",
        community_id="VILLAGE-SUNRISE",
        topic="Maternal Health & Prenatal Care",
        language="Local Language A",
        attendees=85,
        attestations=[lang_cert, content, community_accept],
        energy_escrow_nxt=100
    )
    print(f"Topic: Maternal Health & Prenatal Care")
    print(f"Language: Local Language A (native)")
    print(f"Attendees: 85")
    print(f"Result: {'DELIVERED' if result.success else 'FAILED'}")
    
    print("\n" + "-" * 70)
    print("8. REMOTE INFRASTRUCTURE PROJECT")
    print("-" * 70)
    
    need = Attestation(
        type="community_need_assessment",
        value="NEED-ASSESSED",
        issuer="InfrastructureAuthority",
        band_level=SpectralBand.YOCTO
    )
    env_clear = Attestation(
        type="environmental_clearance",
        value="ENV-CLEARED",
        issuer="EnvironmentMinistry",
        band_level=SpectralBand.YOCTO
    )
    funding = Attestation(
        type="funding_allocation",
        value="FUNDING-SECURED",
        issuer="InfrastructureFund",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.start_infrastructure_project(
        project_id="INFRA-WATER-001",
        community_id="VILLAGE-SUNRISE",
        project_type="clean_water_system",
        budget_nxt=200000,
        milestones=["site_preparation", "well_drilling", "pump_installation", "water_testing", "community_training"],
        attestations=[need, env_clear, funding],
        energy_escrow_nxt=10000
    )
    print(f"Project: Clean Water System for Sunrise Village")
    print(f"Budget: 200,000 NXT")
    print(f"Milestones: 5 phases")
    print(f"Result: {'STARTED' if result.success else 'FAILED'}")
    
    construction = Attestation(
        type="construction_verification",
        value="CONSTRUCTION-VERIFIED",
        issuer="EngineeringTeam",
        band_level=SpectralBand.ATTO
    )
    inspection = Attestation(
        type="quality_inspection",
        value="QUALITY-PASSED",
        issuer="QualityInspector",
        band_level=SpectralBand.ATTO
    )
    comm_oversight = Attestation(
        type="community_oversight",
        value="COMMUNITY-APPROVED",
        issuer="CommunityCouncil",
        band_level=SpectralBand.ATTO
    )
    
    result = adapter.complete_infrastructure_milestone(
        project_id="INFRA-WATER-001",
        milestone_name="site_preparation",
        cost_nxt=20000,
        attestations=[construction, inspection, comm_oversight],
        energy_escrow_nxt=100
    )
    print(f"\nMilestone Completed: Site Preparation (20,000 NXT)")
    
    project = adapter.get_infrastructure_project("INFRA-WATER-001")
    print(f"Progress: {len(project['completed_milestones'])}/{len(project['milestones'])} milestones")
    
    print("\n" + "-" * 70)
    print("9. BHLS DISTRIBUTION - 1,150 NXT/MONTH FOR ALL")
    print("-" * 70)
    
    eligibility = Attestation(
        type="eligibility_verification",
        value="ELIGIBLE",
        issuer="BHLSAuthority",
        band_level=SpectralBand.ATTO
    )
    identity_conf = Attestation(
        type="identity_confirmation",
        value="IDENTITY-CONFIRMED",
        issuer="IdentityAuthority",
        band_level=SpectralBand.ATTO
    )
    receipt = Attestation(
        type="receipt_confirmation",
        value="RECEIPT-CONFIRMED",
        issuer="PaymentSystem",
        band_level=SpectralBand.ATTO
    )
    
    print("\nDistributing BHLS for January 2025:")
    for member_id, name, age in members:
        result = adapter.distribute_bhls(
            member_id=member_id,
            month="2025-01",
            attestations=[eligibility, identity_conf, receipt],
            energy_escrow_nxt=100
        )
        member = adapter._members.get(member_id, {})
        print(f"  {name}: {member.get('bhls_amount', 0):,.0f} NXT distributed")
    
    community = adapter.get_community_stats("VILLAGE-SUNRISE")
    print(f"\nTotal BHLS Distributed to Sunrise Village: {community['total_bhls_distributed']:,.0f} NXT")
    
    print("\n" + "=" * 70)
    print("UNIVERSAL HEALTH GUARANTEE")
    print("=" * 70)
    print("""
    BHLS Floor: 1,150 NXT/month for EVERY person
    
    Supplements:
    - Children: +25% (1,437.50 NXT/month)
    - Elders:   +15% (1,322.50 NXT/month)
    - Maternal: +20% (1,380 NXT/month)
    
    Programs Funded:
    - Nutrition delivery to remote areas
    - Child nutrition with growth tracking
    - Fitness and wellness programs
    - Health education in LOCAL LANGUAGES
    - Infrastructure: water, solar, connectivity
    
    Physics Guarantee:
    - BHLS_distributed >= population x 1,150 NXT
    - Fund conservation: disbursed <= allocated
    - Every person covered regardless of location
    
    NO EXCLUSIONS. NO DISCRIMINATION. ALL PEOPLES.
    """)
    print("=" * 70)


if __name__ == "__main__":
    main()
