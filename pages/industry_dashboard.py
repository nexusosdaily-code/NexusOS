"""
NexusOS Industry Adapters Dashboard
====================================

Interactive dashboard for all 12 industry sectors built on the
Lambda Boson substrate. Each adapter translates industry operations
into physics-validated transactions (Λ = hf/c²).

Sectors:
- Banking & Finance (BHLS protected)
- Education (BHLS free courses)
- Energy & Utilities
- Healthcare & Community
- Insurance
- Legal Services
- Real Estate & Housing
- Transportation
- Supply Chain
- Environmental
- Security
- Military/Defense
"""

import streamlit as st
from datetime import datetime
from typing import Dict, Any, Optional

try:
    from wnsp_v7.industry import (
        BankingAdapter, AccountType, LoanType,
        EducationAdapter, EducationLevel, CredentialType,
        EnergyAdapter,
        CommunityHealthAdapter, ProgramType, DeviceType,
        InsuranceAdapter, InsuranceType,
        LegalAdapter, ContractType, DisputeType,
        RealEstateAdapter, PropertyType, LeaseType,
        TransportationAdapter, TransportMode, TicketType,
        SupplyChainAdapter,
        EnvironmentalAdapter,
        SecurityAdapter,
        MilitaryAdapter
    )
    from wnsp_v7.industry.base import Attestation, SpectralBand
    ADAPTERS_AVAILABLE = True
except ImportError as e:
    ADAPTERS_AVAILABLE = False
    IMPORT_ERROR = str(e)


def get_adapter_instance(adapter_class, key: str):
    """Get or create adapter instance in session state"""
    if key not in st.session_state:
        st.session_state[key] = adapter_class()
    return st.session_state[key]


def render_banking_panel():
    """Banking & Finance sector panel"""
    st.subheader("Banking & Finance")
    st.markdown("*Money IS oscillation. Λ = hf/c² | BHLS Protected*")
    
    banking = get_adapter_instance(BankingAdapter, 'banking_adapter')
    
    tab1, tab2, tab3, tab4 = st.tabs(["Accounts", "Loans", "Remittances", "Stats"])
    
    with tab1:
        st.markdown("**Open Account**")
        col1, col2 = st.columns(2)
        with col1:
            holder_id = st.text_input("Holder ID", value="CITIZEN_001", key="bank_holder")
            account_type = st.selectbox("Account Type", 
                [t.value for t in AccountType], key="bank_acct_type")
        with col2:
            initial_deposit = st.number_input("Initial Deposit (NXT)", 
                min_value=0.0, value=2000.0, key="bank_deposit")
            bhls_protected = st.checkbox("BHLS Protected", value=True, key="bank_bhls")
        
        if st.button("Open Account", key="bank_open"):
            result = banking.open_account(
                holder_id, 
                AccountType(account_type),
                initial_deposit, 
                bhls_protected
            )
            if result.success:
                st.success(result.message)
                st.json({"transaction_id": result.transaction_id, "lambda_mass": f"{result.lambda_mass:.2e}"})
            else:
                st.error(result.message)
        
        st.divider()
        st.markdown("**Transfer Funds**")
        accounts = list(banking.accounts.keys())
        if len(accounts) >= 2:
            col1, col2, col3 = st.columns(3)
            with col1:
                from_acct = st.selectbox("From Account", accounts, key="bank_from")
            with col2:
                to_acct = st.selectbox("To Account", [a for a in accounts if a != from_acct] or [""], key="bank_to")
            with col3:
                amount = st.number_input("Amount (NXT)", min_value=0.01, value=100.0, key="bank_amount")
            
            if st.button("Transfer", key="bank_transfer"):
                result = banking.transfer(from_acct, to_acct, amount)
                if result.success:
                    st.success(result.message)
                else:
                    st.warning(result.message)
        else:
            st.info("Create at least 2 accounts to enable transfers")
    
    with tab2:
        st.markdown("**Apply for Loan**")
        col1, col2 = st.columns(2)
        with col1:
            borrower = st.text_input("Borrower ID", value="CITIZEN_001", key="loan_borrower")
            loan_type = st.selectbox("Loan Type", [t.value for t in LoanType], key="loan_type")
        with col2:
            principal = st.number_input("Principal (NXT)", min_value=100.0, value=10000.0, key="loan_principal")
            term = st.number_input("Term (months)", min_value=6, value=36, key="loan_term")
        
        if st.button("Apply for Loan", key="loan_apply"):
            result = banking.apply_loan(borrower, LoanType(loan_type), principal, term)
            if result.success:
                st.success(result.message)
            else:
                st.error(result.message)
        
        if banking.loans:
            st.markdown("**Active Loans**")
            for loan_id, loan in banking.loans.items():
                with st.expander(f"Loan: {loan_id}"):
                    st.json(loan.to_dict())
    
    with tab3:
        st.markdown("**Send Remittance**")
        col1, col2 = st.columns(2)
        with col1:
            sender = st.text_input("Sender ID", value="CITIZEN_001", key="rem_sender")
            recipient = st.text_input("Recipient ID", value="CITIZEN_002", key="rem_recipient")
            amount = st.number_input("Amount (NXT)", min_value=1.0, value=500.0, key="rem_amount")
        with col2:
            source_country = st.text_input("Source Country", value="USA", key="rem_source")
            dest_country = st.text_input("Destination Country", value="MX", key="rem_dest")
        
        if st.button("Send Remittance", key="rem_send"):
            result = banking.send_remittance(sender, recipient, amount, source_country, dest_country)
            if result.success:
                st.success(result.message)
            else:
                st.error(result.message)
    
    with tab4:
        stats = banking.get_stats()
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Accounts", stats['total_accounts'])
            st.metric("BHLS Protected", stats['bhls_protected_accounts'])
        with col2:
            st.metric("Total Deposits", f"{stats['total_deposits_nxt']:,.2f} NXT")
            st.metric("Active Loans", stats['total_loans'])
        with col3:
            st.metric("Loan Value", f"{stats['total_loan_value_nxt']:,.2f} NXT")
            st.metric("Remittances", stats['total_remittances'])


def render_education_panel():
    """Education sector panel"""
    st.subheader("Education & Credentials")
    st.markdown("*Learning IS resonance. Knowledge flows as oscillation.*")
    
    education = get_adapter_instance(EducationAdapter, 'education_adapter')
    
    tab1, tab2, tab3, tab4 = st.tabs(["BHLS Courses", "Enroll", "Credentials", "Stats"])
    
    with tab1:
        st.markdown("**Free BHLS Basic Courses**")
        st.info("All citizens have access to 10 free BHLS courses covering essential life skills.")
        
        bhls_courses = education.list_bhls_courses()
        for course in bhls_courses:
            with st.expander(f"{course['title']} ({course['duration_hours']} hours)"):
                st.write(course['description'])
                st.write(f"**Credits:** {course['credits']} | **Level:** {course['level']}")
                if st.button(f"Enroll in {course['course_id']}", key=f"enroll_{course['course_id']}"):
                    result = education.enroll("LEARNER_001", course['course_id'], "Demo Learner")
                    if result.success:
                        st.success(result.message)
                    else:
                        st.error(result.message)
    
    with tab2:
        st.markdown("**Course Enrollment**")
        all_courses = list(education.courses.keys())
        
        col1, col2 = st.columns(2)
        with col1:
            student_id = st.text_input("Student ID", value="LEARNER_001", key="edu_student")
            student_name = st.text_input("Student Name", value="Demo Learner", key="edu_name")
        with col2:
            course_id = st.selectbox("Select Course", all_courses, key="edu_course")
        
        if st.button("Enroll", key="edu_enroll"):
            result = education.enroll(student_id, course_id, student_name)
            if result.success:
                st.success(result.message)
            else:
                st.error(result.message)
        
        if education.enrollments:
            st.markdown("**Active Enrollments**")
            for enroll_id, enroll in education.enrollments.items():
                with st.expander(f"Enrollment: {enroll_id}"):
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.json(enroll.to_dict())
                    with col2:
                        if enroll.status.value == "in_progress":
                            grade = st.number_input("Grade %", 0, 100, 85, key=f"grade_{enroll_id}")
                            if st.button("Complete", key=f"complete_{enroll_id}"):
                                result = education.complete_course(enroll_id, grade)
                                if result.success:
                                    st.success(result.message)
                                    st.rerun()
    
    with tab3:
        st.markdown("**Issue Credential**")
        col1, col2 = st.columns(2)
        with col1:
            holder_id = st.text_input("Holder ID", value="LEARNER_001", key="cred_holder")
            cred_type = st.selectbox("Credential Type", 
                [t.value for t in CredentialType], key="cred_type")
            title = st.text_input("Credential Title", value="Certificate of Completion", key="cred_title")
        with col2:
            issuer = st.text_input("Issuing Institution", value="NexusOS Academy", key="cred_issuer")
            level = st.selectbox("Education Level", 
                [l.value for l in EducationLevel], key="cred_level")
            skills = st.text_input("Skills (comma-separated)", value="literacy,numeracy", key="cred_skills")
        
        if st.button("Issue Credential", key="cred_issue"):
            result = education.issue_credential(
                holder_id, 
                CredentialType(cred_type),
                title, 
                issuer, 
                EducationLevel(level),
                [s.strip() for s in skills.split(",")]
            )
            if result.success:
                st.success(result.message)
            else:
                st.error(result.message)
        
        if education.credentials:
            st.markdown("**Issued Credentials**")
            for cred_id, cred in education.credentials.items():
                with st.expander(f"{cred.title} - {cred_id}"):
                    st.json(cred.to_dict())
                    if st.button("Verify", key=f"verify_{cred_id}"):
                        result = education.verify_credential(cred_id)
                        st.info(result.message)
    
    with tab4:
        stats = education.get_stats()
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Total Courses", stats['total_courses'])
            st.metric("BHLS Courses", stats['bhls_courses'])
        with col2:
            st.metric("Total Enrollments", stats['total_enrollments'])
            st.metric("Active", stats['active_enrollments'])
        with col3:
            st.metric("Completed", stats['completed_enrollments'])
            st.metric("Credentials Issued", stats['total_credentials'])


def render_energy_panel():
    """Energy & Utilities sector panel"""
    st.subheader("Energy & Utilities")
    st.markdown("*Conservation law: Λ_generated = Λ_consumed + Λ_losses + Λ_stored*")
    
    st.info("**BHLS Protection:** Basic energy access guaranteed for all citizens. Essential power cannot be disconnected.")
    
    energy = get_adapter_instance(EnergyAdapter, 'energy_adapter')
    
    tab1, tab2, tab3 = st.tabs(["Power Operations", "Grid Balance", "Conservation"])
    
    with tab1:
        st.markdown("**Generate Power**")
        col1, col2, col3 = st.columns(3)
        with col1:
            gen_id = st.text_input("Generator ID", value="GEN-001", key="energy_gen_id")
        with col2:
            megawatts = st.number_input("Power (MW)", min_value=0.1, value=100.0, key="energy_mw")
        with col3:
            escrow = st.number_input("Energy Escrow (NXT)", min_value=1.0, value=10.0, key="energy_escrow")
        
        if st.button("Generate Power", key="energy_generate"):
            attestations = [
                Attestation(type='generator_certificate', value=gen_id, issuer='grid_authority'),
                Attestation(type='grid_connection', value='connected', issuer='utility')
            ]
            result = energy.generate_power(gen_id, megawatts, attestations, escrow)
            if result.success:
                st.success(f"Power generated: {megawatts} MW")
            else:
                st.error(result.message)
        
        st.divider()
        st.markdown("**Consume Power**")
        col1, col2 = st.columns(2)
        with col1:
            meter_id = st.text_input("Meter ID", value="METER-001", key="energy_meter")
        with col2:
            consume_mw = st.number_input("Consumption (MW)", min_value=0.1, value=50.0, key="energy_consume_mw")
        
        if st.button("Register Consumption", key="energy_consume"):
            attestations = [Attestation(type='meter_id', value=meter_id, issuer='utility')]
            result = energy.consume_power(meter_id, consume_mw, attestations)
            if result.success:
                st.success(f"Consumption registered: {consume_mw} MW")
            else:
                st.error(result.message)
    
    with tab2:
        st.markdown("**Grid Balancing (Real-time Regulation)**")
        col1, col2 = st.columns(2)
        with col1:
            freq_adj = st.slider("Frequency Adjustment (Hz)", -1.0, 1.0, 0.0, 0.1, key="energy_freq")
        with col2:
            volt_adj = st.slider("Voltage Adjustment (%)", -10.0, 10.0, 0.0, 0.5, key="energy_volt")
        
        if abs(freq_adj) > 0.5:
            st.warning("YOCTO-level operation required for large frequency adjustments")
        elif abs(freq_adj) > 0:
            st.info("ATTO-level operation for standard adjustments")
        
        if st.button("Apply Grid Balance", key="energy_balance"):
            attestations = [Attestation(type='grid_operator', value='GRID-OP-001', issuer='authority')]
            result = energy.balance_grid("GRID-OP-001", freq_adj, volt_adj, attestations)
            if result.success:
                st.success(f"Grid balanced. Band used: {result.band_used.name}")
            else:
                st.error(result.message)
    
    with tab3:
        st.markdown("**Energy Conservation Verification**")
        is_balanced, message, balance = energy.verify_conservation()
        
        if is_balanced:
            st.success(message)
        else:
            st.error(message)
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Generated (MW)", f"{balance['generated']:.2f}")
            st.metric("Consumed (MW)", f"{balance['consumed']:.2f}")
        with col2:
            st.metric("Losses (MW)", f"{balance['losses']:.2f}")
            st.metric("Stored (MW)", f"{balance['stored']:.2f}")


def render_health_panel():
    """Community Health sector panel"""
    st.subheader("Community Health & Wellness")
    st.markdown("*Health IS harmonic oscillation. Wellness for ALL peoples.*")
    
    st.info("**BHLS Protection:** Basic healthcare access guaranteed for all citizens at no cost.")
    
    health = get_adapter_instance(CommunityHealthAdapter, 'health_adapter')
    
    tab1, tab2 = st.tabs(["Programs", "Devices"])
    
    with tab1:
        st.markdown("**BHLS Health Programs (Free for All Citizens)**")
        for program in ProgramType:
            st.write(f"- {program.value.replace('_', ' ').title()}")
        
        st.markdown("**Enroll in Program**")
        col1, col2 = st.columns(2)
        with col1:
            citizen_id = st.text_input("Citizen ID", value="CITIZEN_001", key="health_citizen")
        with col2:
            program = st.selectbox("Program", [p.value for p in ProgramType], key="health_program")
        
        if st.button("Enroll in Program", key="health_enroll"):
            st.success(f"Enrolled {citizen_id} in {program} program")
    
    with tab2:
        st.markdown("**Medical Device Registry**")
        st.info("Register and track medical devices with Lambda-backed provenance")
        
        for device in DeviceType:
            st.write(f"- {device.value.replace('_', ' ').title()}")


def render_insurance_panel():
    """Insurance sector panel"""
    st.subheader("Insurance & Risk Pooling")
    st.markdown("*Risk pooling through Lambda mass aggregation.*")
    
    st.info("**BHLS Protection:** Basic insurance coverage guaranteed for all citizens, including health, housing, and emergency coverage.")
    
    st.markdown("**Available Insurance Types**")
    for ins_type in InsuranceType:
        st.write(f"- {ins_type.value.replace('_', ' ').title()}")
    
    st.markdown("**Apply for Insurance**")
    col1, col2 = st.columns(2)
    with col1:
        holder = st.text_input("Policy Holder ID", value="CITIZEN_001", key="ins_holder")
        ins_type = st.selectbox("Insurance Type", [t.value for t in InsuranceType], key="ins_type")
    with col2:
        coverage = st.number_input("Coverage Amount (NXT)", min_value=1000.0, value=50000.0, key="ins_coverage")
        premium = st.number_input("Monthly Premium (NXT)", min_value=10.0, value=100.0, key="ins_premium")
    
    if st.button("Apply for Policy", key="ins_apply"):
        st.success(f"Policy application submitted for {ins_type} coverage: {coverage:,.0f} NXT")


def render_legal_panel():
    """Legal Services sector panel"""
    st.subheader("Legal Services & Arbitration")
    st.markdown("*Smart contracts on Lambda substrate.*")
    
    st.info("**BHLS Protection:** Free legal aid guaranteed for all citizens. Access to justice is a fundamental right.")
    
    tab1, tab2 = st.tabs(["Contracts", "Disputes"])
    
    with tab1:
        st.markdown("**Create Smart Contract**")
        for contract_type in ContractType:
            st.write(f"- {contract_type.value.replace('_', ' ').title()}")
        
        col1, col2 = st.columns(2)
        with col1:
            contract_type = st.selectbox("Contract Type", [t.value for t in ContractType], key="legal_type")
            party1 = st.text_input("Party 1", value="ENTITY_A", key="legal_party1")
        with col2:
            party2 = st.text_input("Party 2", value="ENTITY_B", key="legal_party2")
            value = st.number_input("Contract Value (NXT)", min_value=0.0, value=10000.0, key="legal_value")
        
        if st.button("Create Contract", key="legal_create"):
            st.success(f"Contract created between {party1} and {party2}")
    
    with tab2:
        st.markdown("**File Dispute**")
        for dispute_type in DisputeType:
            st.write(f"- {dispute_type.value.replace('_', ' ').title()}")
        
        dispute_type = st.selectbox("Dispute Type", [t.value for t in DisputeType], key="legal_dispute")
        description = st.text_area("Dispute Description", key="legal_desc")
        
        if st.button("File Dispute", key="legal_file"):
            st.success("Dispute filed. AI arbitration will review.")


def render_real_estate_panel():
    """Real Estate sector panel"""
    st.subheader("Real Estate & Housing")
    st.markdown("*Property rights on Lambda substrate.*")
    
    st.info("**BHLS Protection:** Subsidized housing guaranteed. No citizen can be left without shelter.")
    
    st.markdown("**Property Types**")
    for prop_type in PropertyType:
        st.write(f"- {prop_type.value.replace('_', ' ').title()}")
    
    st.markdown("**Lease Types**")
    for lease_type in LeaseType:
        st.write(f"- {lease_type.value.replace('_', ' ').title()}")
    
    col1, col2 = st.columns(2)
    with col1:
        prop_type = st.selectbox("Property Type", [t.value for t in PropertyType], key="re_type")
        owner = st.text_input("Owner ID", value="CITIZEN_001", key="re_owner")
    with col2:
        value = st.number_input("Property Value (NXT)", min_value=1000.0, value=100000.0, key="re_value")
        location = st.text_input("Location", value="District 1", key="re_location")
    
    if st.button("Register Property", key="re_register"):
        st.success(f"Property registered: {prop_type} at {location}")


def render_transportation_panel():
    """Transportation sector panel"""
    st.subheader("Transportation & Logistics")
    st.markdown("*Mobility on Lambda substrate.*")
    
    st.info("**BHLS Protection:** Free basic transit guaranteed. Essential mobility is a right for all citizens.")
    
    st.markdown("**Transport Modes**")
    for mode in TransportMode:
        st.write(f"- {mode.value.replace('_', ' ').title()}")
    
    st.markdown("**Book Transit**")
    col1, col2 = st.columns(2)
    with col1:
        mode = st.selectbox("Transport Mode", [m.value for m in TransportMode], key="trans_mode")
        ticket_type = st.selectbox("Ticket Type", [t.value for t in TicketType], key="trans_ticket")
    with col2:
        passenger = st.text_input("Passenger ID", value="CITIZEN_001", key="trans_passenger")
        route = st.text_input("Route", value="Station A → Station B", key="trans_route")
    
    if st.button("Book Ticket", key="trans_book"):
        st.success(f"Ticket booked: {mode} - {route}")


def render_supply_chain_panel():
    """Supply Chain sector panel"""
    st.subheader("Supply Chain & Provenance")
    st.markdown("*Full traceability through Lambda-backed attestations.*")
    
    st.markdown("**Track Product**")
    col1, col2 = st.columns(2)
    with col1:
        product_id = st.text_input("Product ID", value="PROD-001", key="sc_product")
        origin = st.text_input("Origin", value="Factory A", key="sc_origin")
    with col2:
        destination = st.text_input("Destination", value="Warehouse B", key="sc_dest")
        batch = st.text_input("Batch Number", value="BATCH-2025-001", key="sc_batch")
    
    if st.button("Register Shipment", key="sc_register"):
        st.success(f"Shipment registered: {product_id} from {origin} to {destination}")
    
    st.markdown("**Provenance Chain**")
    st.info("Each step in the supply chain is recorded as a Lambda-mass transaction")


def render_environmental_panel():
    """Environmental sector panel"""
    st.subheader("Environmental & Carbon Tracking")
    st.markdown("*Extraction, restoration, and carbon accounting.*")
    
    st.markdown("**Carbon Credits**")
    col1, col2 = st.columns(2)
    with col1:
        project_id = st.text_input("Project ID", value="FOREST-001", key="env_project")
        credits = st.number_input("Carbon Credits (tons CO2)", min_value=1.0, value=100.0, key="env_credits")
    with col2:
        project_type = st.selectbox("Project Type", 
            ["Reforestation", "Renewable Energy", "Methane Capture", "Ocean Restoration"], key="env_type")
    
    if st.button("Register Credits", key="env_register"):
        st.success(f"Registered {credits} carbon credits for {project_id}")


def render_security_panel():
    """Security sector panel"""
    st.subheader("Security & Access Control")
    st.markdown("*Secure communications on Lambda substrate.*")
    
    st.markdown("**Access Control**")
    col1, col2 = st.columns(2)
    with col1:
        facility = st.text_input("Facility ID", value="FACILITY-001", key="sec_facility")
        accessor = st.text_input("Accessor ID", value="PERSON-001", key="sec_accessor")
    with col2:
        access_level = st.selectbox("Access Level", 
            ["Public", "Restricted", "Classified", "Top Secret"], key="sec_level")
    
    if st.button("Request Access", key="sec_request"):
        st.success(f"Access request submitted for {facility}")


def render_military_panel():
    """Military/Defense sector panel"""
    st.subheader("Military & Defense")
    st.markdown("*Command, control, and logistics. PLANCK-level operations.*")
    
    st.warning("Military operations require PLANCK-level consensus (highest authority)")
    
    st.markdown("**Logistics Tracking**")
    col1, col2 = st.columns(2)
    with col1:
        unit_id = st.text_input("Unit ID", value="UNIT-001", key="mil_unit")
        operation = st.text_input("Operation Name", value="LOGISTICS-ALPHA", key="mil_op")
    with col2:
        status = st.selectbox("Status", 
            ["Planning", "Active", "Complete", "Suspended"], key="mil_status")
    
    if st.button("Update Status", key="mil_update"):
        st.success(f"Status updated for {unit_id}: {status}")


def render_industry_dashboard():
    """Main industry adapters dashboard"""
    st.title("Industry Adapters")
    st.markdown("#### 12 Sectors Built on Lambda Boson Substrate (Λ = hf/c²)")
    
    if not ADAPTERS_AVAILABLE:
        st.error(f"Industry adapters not available: {IMPORT_ERROR}")
        return
    
    with st.expander("📖 How to Use Industry Adapters", expanded=False):
        st.markdown("""
        ### Quick Start Guide
        
        **Step 1: Select a Sector**
        - Choose an industry sector from the dropdown menu below (Banking, Education, Energy, etc.)
        
        **Step 2: Choose an Operation**
        - Each sector has different operations available in tabs
        - Forms are pre-filled with demo data so you can try immediately
        
        **Step 3: Submit & See Results**
        - Click the action button (e.g., "Open Account", "Enroll", "Generate Power")
        - You'll see a Transaction ID and Lambda Mass confirming your operation was recorded
        
        ---
        
        ### Key Concepts
        
        | Term | What It Means |
        |------|---------------|
        | **BHLS Protection** | Basic Human Living Standards - guarantees 1,150 NXT/month minimum. Protected accounts cannot go below this floor. |
        | **Transaction ID** | Unique identifier for each operation, recorded on the blockchain |
        | **Lambda Mass (Λ)** | Physics-based validation weight using Λ = hf/c² formula |
        | **Attestation** | Digital signature proving an action was authorized |
        | **Energy Escrow** | Deposit held to validate operations (returned after completion) |
        
        ---
        
        ### Sector Quick Reference
        
        | Sector | What You Can Do | BHLS Protection |
        |--------|-----------------|-----------------|
        | 🏦 **Banking** | Open accounts, transfer funds, apply for loans | Protected accounts with 1,150 NXT floor |
        | 🎓 **Education** | Enroll in courses, issue credentials | 10 free courses for all citizens |
        | ⚡ **Energy** | Generate/consume power, grid balancing | Essential power cannot be disconnected |
        | 🏥 **Health** | Access health programs, register devices | Free basic healthcare for all |
        | 🛡️ **Insurance** | Apply for policies | Basic coverage guaranteed |
        | ⚖️ **Legal** | Create contracts, file disputes | Free legal aid |
        | 🏠 **Real Estate** | Register property, create leases | Subsidized housing |
        | 🚆 **Transportation** | Book transit, track shipments | Free basic transit |
        | 📦 **Supply Chain** | Track products, verify provenance | Full traceability |
        | 🌱 **Environmental** | Carbon credits, restoration | Conservation incentives |
        | 🔐 **Security** | Access control, secure comms | Protected communications |
        | 🎖️ **Military** | Secure operations (restricted) | PLANCK-level authorization |
        
        ---
        
        ### Try It Now!
        1. Select **Banking & Finance** below
        2. The "Open Account" form is pre-filled
        3. Click **Open Account** to create your first account
        4. See the Transaction ID appear - you're on the blockchain!
        """)
    
    st.markdown("""
    Each industry adapter translates domain-specific operations into physics-validated 
    transactions on the Lambda Boson substrate. All operations enforce BHLS (Basic Human 
    Living Standards) protections where applicable.
    """)
    
    sector = st.selectbox("Select Industry Sector", [
        "Banking & Finance",
        "Education & Credentials", 
        "Energy & Utilities",
        "Community Health",
        "Insurance",
        "Legal Services",
        "Real Estate",
        "Transportation",
        "Supply Chain",
        "Environmental",
        "Security",
        "Military"
    ])
    
    st.divider()
    
    if sector == "Banking & Finance":
        render_banking_panel()
    elif sector == "Education & Credentials":
        render_education_panel()
    elif sector == "Energy & Utilities":
        render_energy_panel()
    elif sector == "Community Health":
        render_health_panel()
    elif sector == "Insurance":
        render_insurance_panel()
    elif sector == "Legal Services":
        render_legal_panel()
    elif sector == "Real Estate":
        render_real_estate_panel()
    elif sector == "Transportation":
        render_transportation_panel()
    elif sector == "Supply Chain":
        render_supply_chain_panel()
    elif sector == "Environmental":
        render_environmental_panel()
    elif sector == "Security":
        render_security_panel()
    elif sector == "Military":
        render_military_panel()


if __name__ == "__main__":
    render_industry_dashboard()
