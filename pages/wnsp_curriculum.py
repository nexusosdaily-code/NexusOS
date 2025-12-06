"""
WNSP High School Curriculum Dashboard

Official NexusOS education program - FREE for ALL students worldwide.
Teaching Lambda Boson physics, blockchain governance, and civilization architecture.
"""

import streamlit as st
from datetime import datetime

st.set_page_config(
    page_title="WNSP High School Curriculum",
    page_icon="🎓",
    layout="wide"
)

from wnsp_v7.curriculum import WNSPCurriculum, GradeLevel, Subject

@st.cache_resource
def get_curriculum():
    return WNSPCurriculum()

curriculum = get_curriculum()

st.title("🎓 WNSP High School Curriculum")
st.markdown("**Official NexusOS Education Program** - FREE under BHLS (Basic Human Living Standards)")

st.markdown("---")

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📚 Overview",
    "📖 Curriculum",
    "👤 Student Portal",
    "📊 Progress",
    "🎯 Assessments"
])

with tab1:
    st.header("Curriculum Overview")
    
    col1, col2, col3, col4 = st.columns(4)
    
    stats = curriculum.get_curriculum_stats()
    
    with col1:
        st.metric("Total Lessons", stats["total_lessons"])
    with col2:
        st.metric("Total Assessments", stats["total_assessments"])
    with col3:
        st.metric("Total Credits", stats["total_credits"])
    with col4:
        st.metric("BHLS Status", "FREE" if stats["bhls_free"] else "Paid")
    
    st.markdown("---")
    
    st.subheader("4-Year Curriculum Structure")
    
    grade_cards = [
        ("Grade 9", "Foundations of Wave Physics", "🌊", 
         "Introduction to wave mechanics, Lambda Boson physics (Λ = hf/c²), blockchain basics, and BHLS civics."),
        ("Grade 10", "Core NexusOS Concepts", "⚡",
         "Deep dive into blockchain, spectral authority bands, constitutional law, and physics economics."),
        ("Grade 11", "Industry Applications", "🏭",
         "Applying NexusOS across all 12 industry sectors - banking, healthcare, education, and more."),
        ("Grade 12", "Mastery and Leadership", "🎯",
         "WaveLang programming, governance leadership, capstone project, and graduation.")
    ]
    
    for i in range(0, 4, 2):
        col1, col2 = st.columns(2)
        
        with col1:
            grade, title, icon, desc = grade_cards[i]
            st.markdown(f"""
            ### {icon} {grade}: {title}
            {desc}
            
            **Credits:** {[10, 12, 14, 16][i]} | **Lessons:** 10 | **Assessments:** {[3, 2, 3, 3][i]}
            """)
        
        with col2:
            if i + 1 < 4:
                grade, title, icon, desc = grade_cards[i + 1]
                st.markdown(f"""
                ### {icon} {grade}: {title}
                {desc}
                
                **Credits:** {[10, 12, 14, 16][i+1]} | **Lessons:** 10 | **Assessments:** {[3, 2, 3, 3][i+1]}
                """)
    
    st.markdown("---")
    
    st.subheader("Core Subjects")
    
    subjects_info = [
        (Subject.LAMBDA_PHYSICS, "Lambda Boson Physics", "The foundation: Λ = hf/c² - oscillation IS mass"),
        (Subject.WAVE_MECHANICS, "Wave Mechanics", "Frequency, wavelength, amplitude, and resonance"),
        (Subject.BLOCKCHAIN_FUNDAMENTALS, "Blockchain Fundamentals", "DAG, consensus, hashing, and decentralization"),
        (Subject.SPECTRAL_AUTHORITY, "Spectral Authority", "The 7-band authority system (NANO→PLANCK)"),
        (Subject.PHYSICS_ECONOMICS, "Physics Economics", "NXT tokenomics, energy escrow, and BHLS"),
        (Subject.CONSTITUTIONAL_LAW, "Constitutional Law", "The 3 constitutional clauses and amendments"),
        (Subject.DECENTRALIZED_GOVERNANCE, "Decentralized Governance", "Validators, voting, and leadership"),
        (Subject.INDUSTRY_APPLICATIONS, "Industry Applications", "All 12 sector implementations"),
        (Subject.WAVELANG_PROGRAMMING, "WaveLang Programming", "NexusOS's native programming language"),
        (Subject.CIVICS_BHLS, "Civics & BHLS", "Rights, responsibilities, and basic standards")
    ]
    
    cols = st.columns(2)
    for i, (subject, name, desc) in enumerate(subjects_info):
        with cols[i % 2]:
            st.markdown(f"**{name}**: {desc}")
    
    st.markdown("---")
    
    st.subheader("Why WNSP Curriculum?")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        ### 🌍 Global Standard
        Same curriculum worldwide. Physics doesn't change based on borders.
        Every student learns the same foundational truths.
        """)
    
    with col2:
        st.markdown("""
        ### 💰 Completely FREE
        BHLS guarantees 10 free courses including this entire curriculum.
        No student excluded due to financial barriers.
        """)
    
    with col3:
        st.markdown("""
        ### 🔗 Lambda-Verified
        All credentials are Lambda-signed standing wave certificates.
        Permanent, unforgeable, and globally recognized.
        """)

with tab2:
    st.header("Curriculum Content")
    
    selected_grade = st.selectbox(
        "Select Grade Level",
        [GradeLevel.GRADE_9, GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12],
        format_func=lambda x: f"Grade {x.value.split('_')[1]}"
    )
    
    path = curriculum.get_curriculum_path(selected_grade)
    
    if path:
        st.markdown(f"### {path['name']}")
        st.markdown(path['description'])
        st.markdown(f"**Total Credits:** {path['total_credits']} | **Subjects:** {', '.join(path['subjects'])}")
    else:
        st.error("Curriculum path not found")
    
    st.markdown("---")
    
    lessons = curriculum.get_all_lessons(selected_grade)
    
    st.subheader(f"Lessons ({len(lessons)})")
    
    for i, lesson in enumerate(lessons):
        with st.expander(f"📖 Lesson {i+1}: {lesson['title']}"):
            st.markdown(f"**Subject:** {lesson['subject']}")
            st.markdown(f"**Duration:** {lesson['duration_minutes']} minutes")
            st.markdown(f"**Description:** {lesson['description']}")
            
            st.markdown("**Learning Objectives:**")
            for obj in lesson['objectives']:
                st.markdown(f"- {obj}")
            
            st.markdown("**Activities:**")
            for act in lesson['activities']:
                st.markdown(f"- {act}")
            
            full_lesson = curriculum.get_lesson(lesson['lesson_id'])
            if full_lesson and full_lesson.get('content'):
                st.markdown("**Content Preview:**")
                st.code(full_lesson['content'][:500] + "..." if len(full_lesson['content']) > 500 else full_lesson['content'])

with tab3:
    st.header("Student Portal")
    
    st.markdown("### Enroll in WNSP Curriculum")
    
    col1, col2 = st.columns(2)
    
    with col1:
        student_id = st.text_input("Student ID", placeholder="Enter your NexusOS citizen ID")
        student_name = st.text_input("Full Name", placeholder="Enter your name")
    
    with col2:
        enrollment_grade = st.selectbox(
            "Starting Grade",
            [GradeLevel.GRADE_9, GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12],
            format_func=lambda x: f"Grade {x.value.split('_')[1]}"
        )
        
        if st.button("Enroll Now (FREE)", type="primary"):
            if student_id and student_name:
                student = curriculum.enroll_student(student_id, enrollment_grade)
                st.success(f"Enrolled {student_name} in Grade {enrollment_grade.value.split('_')[1]}!")
                st.balloons()
            else:
                st.error("Please enter both Student ID and Name")
    
    st.markdown("---")
    
    st.subheader("Already Enrolled? Check Your Progress")
    
    lookup_id = st.text_input("Enter Student ID to lookup", key="lookup")
    
    if lookup_id:
        progress = curriculum.get_student_progress(lookup_id)
        if progress:
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric("Grade", progress['grade_level'].replace('_', ' ').title())
            with col2:
                st.metric("Progress", f"{progress['progress_percent']:.1f}%")
            with col3:
                st.metric("Credits", progress['total_credits'])
            with col4:
                st.metric("Avg Score", f"{progress['average_score']:.1f}%")
            
            st.progress(progress['progress_percent'] / 100)
            
            st.markdown(f"**Lessons Completed:** {progress['lessons_completed']}")
            st.markdown(f"**Certifications:** {len(progress['certifications'])}")
        else:
            st.warning("Student not found. Please enroll first.")

with tab4:
    st.header("Learning Progress")
    
    st.markdown("### Complete a Lesson")
    
    col1, col2 = st.columns(2)
    
    with col1:
        progress_student_id = st.text_input("Student ID", key="progress_student")
    
    with col2:
        all_lessons = curriculum.get_all_lessons()
        lesson_options = {f"{l['lesson_id']}: {l['title']}": l['lesson_id'] for l in all_lessons}
        selected_lesson = st.selectbox("Select Lesson", list(lesson_options.keys()))
    
    if st.button("Mark Lesson Complete"):
        if progress_student_id:
            lesson_id = lesson_options[selected_lesson]
            success = curriculum.complete_lesson(progress_student_id, lesson_id)
            if success:
                st.success(f"Completed: {selected_lesson}")
            else:
                st.error("Could not complete lesson. Check student ID.")
        else:
            st.error("Please enter Student ID")
    
    st.markdown("---")
    
    st.subheader("Curriculum Statistics")
    
    stats = curriculum.get_curriculum_stats()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        | Metric | Value |
        |--------|-------|
        | Total Lessons | {} |
        | Total Assessments | {} |
        | Active Students | {} |
        | BHLS Status | {} |
        """.format(
            stats['total_lessons'],
            stats['total_assessments'],
            stats['total_students'],
            'FREE' if stats['bhls_free'] else 'Paid'
        ))
    
    with col2:
        st.markdown("""
        ### Credit Distribution
        - Grade 9: 10 credits
        - Grade 10: 12 credits
        - Grade 11: 14 credits
        - Grade 12: 16 credits
        - **Total: 52 credits**
        """)

with tab5:
    st.header("Assessments")
    
    st.markdown("### Available Assessments")
    
    assessment_grade = st.selectbox(
        "Filter by Grade",
        [None, GradeLevel.GRADE_9, GradeLevel.GRADE_10, GradeLevel.GRADE_11, GradeLevel.GRADE_12],
        format_func=lambda x: "All Grades" if x is None else f"Grade {x.value.split('_')[1]}"
    )
    
    all_assessments = []
    for assessment_id, assessment in curriculum.assessments.items():
        if assessment_grade is None or assessment.grade_level == assessment_grade:
            all_assessments.append(assessment)
    
    for assessment in all_assessments:
        with st.expander(f"📝 {assessment.title} ({assessment.assessment_type.value.title()})"):
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.markdown(f"**Grade:** {assessment.grade_level.value.replace('_', ' ').title()}")
            with col2:
                st.markdown(f"**Duration:** {assessment.duration_minutes} min")
            with col3:
                st.markdown(f"**Passing Score:** {assessment.passing_score}/{assessment.max_score}")
            
            st.markdown(f"**Subject:** {assessment.subject.value.replace('_', ' ').title()}")
            
            st.markdown("**Sample Questions:**")
            for i, q in enumerate(assessment.questions[:3]):
                st.markdown(f"{i+1}. {q['q']} ({q['type']})")
    
    st.markdown("---")
    
    st.subheader("Record Assessment Score")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        assess_student_id = st.text_input("Student ID", key="assess_student")
    
    with col2:
        assessment_options = {f"{a.assessment_id}: {a.title}": a.assessment_id for a in curriculum.assessments.values()}
        selected_assessment = st.selectbox("Select Assessment", list(assessment_options.keys()))
    
    with col3:
        score = st.number_input("Score (0-100)", min_value=0.0, max_value=100.0, value=0.0)
    
    if st.button("Record Score"):
        if assess_student_id:
            assessment_id = assessment_options[selected_assessment]
            success = curriculum.record_assessment(assess_student_id, assessment_id, score)
            if success:
                assessment = curriculum.assessments[assessment_id]
                if score >= assessment.passing_score:
                    st.success(f"PASSED with {score}%!")
                else:
                    st.warning(f"Score recorded: {score}% (below passing threshold of {assessment.passing_score}%)")
            else:
                st.error("Could not record score. Check student ID.")
        else:
            st.error("Please enter Student ID")

st.markdown("---")
st.markdown("""
<div style='text-align: center; color: #666;'>
<p>🎓 WNSP High School Curriculum v1.0</p>
<p>Official NexusOS Education Program - Lambda Boson Substrate (Λ = hf/c²)</p>
<p>FREE for ALL students worldwide under BHLS guarantees</p>
</div>
""", unsafe_allow_html=True)
