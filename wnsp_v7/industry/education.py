"""
Education Sector Adapter

Physics-based learning and credentialing for ALL peoples worldwide.
Knowledge flows as oscillation; credentials are standing wave attestations.

Core Principle: Learning IS resonance.
- Courses = Structured frequency patterns
- Progress = Phase alignment with knowledge
- Credentials = Standing wave certificates (permanent)
- Skills = Harmonic frequencies added to learner profile

BHLS Integration: Basic education access guaranteed for all citizens.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, calculate_lambda_mass
)

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class EducationLevel(Enum):
    """Levels of education"""
    PRIMARY = "primary"
    SECONDARY = "secondary"
    VOCATIONAL = "vocational"
    UNDERGRADUATE = "undergraduate"
    GRADUATE = "graduate"
    DOCTORAL = "doctoral"
    CONTINUING = "continuing"
    BHLS_BASIC = "bhls_basic"


class CredentialType(Enum):
    """Types of credentials"""
    CERTIFICATE = "certificate"
    DIPLOMA = "diploma"
    DEGREE = "degree"
    LICENSE = "license"
    BADGE = "badge"
    SKILL_ATTESTATION = "skill_attestation"


class CourseStatus(Enum):
    """Status of course enrollment"""
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"
    FAILED = "failed"


@dataclass
class Course:
    """An educational course"""
    course_id: str
    title: str
    description: str
    level: EducationLevel
    duration_hours: int
    credits: float
    skills: List[str]
    lambda_signature: float = 0.0
    
    def __post_init__(self):
        frequency = 5e14
        self.lambda_signature = (PLANCK_CONSTANT * frequency * self.credits) / (SPEED_OF_LIGHT ** 2)
    
    def to_dict(self) -> Dict:
        return {
            'course_id': self.course_id,
            'title': self.title,
            'description': self.description,
            'level': self.level.value,
            'duration_hours': self.duration_hours,
            'credits': self.credits,
            'skills': self.skills
        }


@dataclass
class Enrollment:
    """A student's enrollment in a course"""
    enrollment_id: str
    student_id: str
    course_id: str
    status: CourseStatus = CourseStatus.ENROLLED
    progress_percent: float = 0.0
    grade: Optional[float] = None
    enrolled_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        return {
            'enrollment_id': self.enrollment_id,
            'student_id': self.student_id,
            'course_id': self.course_id,
            'status': self.status.value,
            'progress': self.progress_percent,
            'grade': self.grade,
            'enrolled_at': self.enrolled_at.isoformat()
        }


@dataclass
class Credential:
    """A verified educational credential"""
    credential_id: str
    holder_id: str
    credential_type: CredentialType
    title: str
    issuer: str
    level: EducationLevel
    skills: List[str]
    issued_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    lambda_signature: float = 0.0
    verification_hash: str = ""
    
    def __post_init__(self):
        import hashlib
        frequency = 5e14
        self.lambda_signature = (PLANCK_CONSTANT * frequency * 100) / (SPEED_OF_LIGHT ** 2)
        self.verification_hash = hashlib.sha256(
            f"{self.holder_id}:{self.title}:{self.issuer}:{self.issued_at.isoformat()}".encode()
        ).hexdigest()[:32]
    
    @property
    def is_valid(self) -> bool:
        """Check if credential is still valid"""
        if self.expires_at is None:
            return True
        return datetime.now() < self.expires_at
    
    def to_dict(self) -> Dict:
        return {
            'credential_id': self.credential_id,
            'holder_id': self.holder_id,
            'type': self.credential_type.value,
            'title': self.title,
            'issuer': self.issuer,
            'level': self.level.value,
            'skills': self.skills,
            'issued_at': self.issued_at.isoformat(),
            'is_valid': self.is_valid,
            'verification_hash': self.verification_hash
        }


@dataclass
class LearnerProfile:
    """A learner's educational profile"""
    learner_id: str
    name: str
    skills: Dict[str, float] = field(default_factory=dict)
    credentials: List[str] = field(default_factory=list)
    total_credits: float = 0.0
    lambda_knowledge: float = 0.0
    
    def add_skill(self, skill: str, proficiency: float):
        """Add or update skill proficiency (0-100)"""
        self.skills[skill] = min(100, max(0, proficiency))
    
    def to_dict(self) -> Dict:
        return {
            'learner_id': self.learner_id,
            'name': self.name,
            'skills': self.skills,
            'credentials_count': len(self.credentials),
            'total_credits': self.total_credits,
            'lambda_knowledge': self.lambda_knowledge
        }


class EducationAdapter(IndustryAdapter):
    """
    Education Sector Adapter
    
    Key Operations:
    - create_course: Register new course
    - enroll: Enroll student in course
    - update_progress: Track learning progress
    - complete_course: Mark course completed
    - issue_credential: Issue verified credential
    - verify_credential: Verify credential authenticity
    - add_skill: Add skill to learner profile
    - transfer_credits: Transfer credits between institutions
    - bhls_enroll: Free BHLS basic education access
    
    Physics Rules:
    - Knowledge = Lambda mass accumulated through learning
    - Credentials = Standing wave certificates (permanent, verifiable)
    - Skills = Harmonic frequencies in learner profile
    - Verification = Lambda signature matching
    """
    
    BHLS_FREE_COURSES = 10
    PASSING_GRADE = 60.0
    
    def __init__(self):
        super().__init__(sector_id='education')
        self.courses: Dict[str, Course] = {}
        self.enrollments: Dict[str, Enrollment] = {}
        self.credentials: Dict[str, Credential] = {}
        self.learners: Dict[str, LearnerProfile] = {}
        self._init_bhls_courses()
    
    def _init_bhls_courses(self):
        """Initialize free BHLS basic courses"""
        bhls_courses = [
            ("BHLS_LITERACY", "Basic Literacy", "Reading and writing fundamentals", 40),
            ("BHLS_NUMERACY", "Basic Numeracy", "Mathematics fundamentals", 40),
            ("BHLS_DIGITAL", "Digital Literacy", "Computer and internet basics", 30),
            ("BHLS_HEALTH", "Health Education", "Personal and community health", 20),
            ("BHLS_FINANCE", "Financial Literacy", "Money management basics", 20),
            ("BHLS_CIVIC", "Civic Education", "Rights, responsibilities, governance", 20),
            ("BHLS_ENVIRONMENT", "Environmental Awareness", "Sustainability basics", 15),
            ("BHLS_SAFETY", "Safety & First Aid", "Emergency response basics", 15),
            ("BHLS_COMMUNICATION", "Communication Skills", "Effective speaking and listening", 20),
            ("BHLS_CRITICAL", "Critical Thinking", "Logic and problem solving", 20)
        ]
        
        for course_id, title, desc, hours in bhls_courses:
            self.courses[course_id] = Course(
                course_id=course_id,
                title=title,
                description=desc,
                level=EducationLevel.BHLS_BASIC,
                duration_hours=hours,
                credits=hours / 10,
                skills=[title.lower().replace(" ", "_")]
            )
    
    def register_learner(self, learner_id: str, name: str) -> LearnerProfile:
        """Register a new learner"""
        if learner_id not in self.learners:
            self.learners[learner_id] = LearnerProfile(
                learner_id=learner_id,
                name=name
            )
        return self.learners[learner_id]
    
    def create_course(
        self,
        course_id: str,
        title: str,
        description: str,
        level: EducationLevel,
        duration_hours: int,
        credits: float,
        skills: List[str]
    ) -> OperationResult:
        """Create a new course"""
        course = Course(
            course_id=course_id,
            title=title,
            description=description,
            level=level,
            duration_hours=duration_hours,
            credits=credits,
            skills=skills
        )
        self.courses[course_id] = course
        
        operation = IndustryOperation(
            operation_id='create_course',
            sector_id='education',
            data={'course': course.to_dict()},
            attestations=[
                Attestation(type='institution_verification', value=course_id, issuer='accreditation_body')
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Course {course_id} created: {title}"
        return result
    
    def enroll(self, student_id: str, course_id: str, student_name: str = "") -> OperationResult:
        """Enroll student in course"""
        import hashlib
        
        if course_id not in self.courses:
            return OperationResult(success=False, message=f"Course {course_id} not found")
        
        self.register_learner(student_id, student_name or student_id)
        
        enrollment_id = f"ENR{hashlib.sha256(f'{student_id}:{course_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        enrollment = Enrollment(
            enrollment_id=enrollment_id,
            student_id=student_id,
            course_id=course_id,
            status=CourseStatus.IN_PROGRESS
        )
        self.enrollments[enrollment_id] = enrollment
        
        operation = IndustryOperation(
            operation_id='enroll',
            sector_id='education',
            data={'enrollment': enrollment.to_dict()},
            attestations=[
                Attestation(type='identity_verification', value=student_id, issuer='system')
            ]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Enrolled in {self.courses[course_id].title}"
        return result
    
    def complete_course(self, enrollment_id: str, grade: float) -> OperationResult:
        """Complete a course with grade"""
        if enrollment_id not in self.enrollments:
            return OperationResult(success=False, message=f"Enrollment {enrollment_id} not found")
        
        enrollment = self.enrollments[enrollment_id]
        course = self.courses.get(enrollment.course_id)
        
        if not course:
            return OperationResult(success=False, message="Course not found")
        
        passed = grade >= self.PASSING_GRADE
        enrollment.status = CourseStatus.COMPLETED if passed else CourseStatus.FAILED
        enrollment.grade = grade
        enrollment.progress_percent = 100.0
        enrollment.completed_at = datetime.now()
        
        if passed and enrollment.student_id in self.learners:
            learner = self.learners[enrollment.student_id]
            learner.total_credits += course.credits
            
            frequency = 5e14
            knowledge_gain = (PLANCK_CONSTANT * frequency * course.credits) / (SPEED_OF_LIGHT ** 2)
            learner.lambda_knowledge += knowledge_gain
            
            for skill in course.skills:
                current = learner.skills.get(skill, 0)
                learner.add_skill(skill, current + 20)
        
        operation = IndustryOperation(
            operation_id='complete_course',
            sector_id='education',
            data={
                'enrollment_id': enrollment_id,
                'grade': grade,
                'passed': passed,
                'credits_earned': course.credits if passed else 0
            },
            attestations=[
                Attestation(type='instructor_verification', value=enrollment_id, issuer='instructor')
            ]
        )
        
        result = self.execute_operation(operation)
        status = "Passed" if passed else "Failed"
        result.message = f"Course completed. Grade: {grade}% ({status})"
        return result
    
    def issue_credential(
        self,
        holder_id: str,
        credential_type: CredentialType,
        title: str,
        issuer: str,
        level: EducationLevel,
        skills: List[str]
    ) -> OperationResult:
        """Issue a verified credential"""
        import hashlib
        
        credential_id = f"CRED{hashlib.sha256(f'{holder_id}:{title}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        credential = Credential(
            credential_id=credential_id,
            holder_id=holder_id,
            credential_type=credential_type,
            title=title,
            issuer=issuer,
            level=level,
            skills=skills
        )
        self.credentials[credential_id] = credential
        
        if holder_id in self.learners:
            self.learners[holder_id].credentials.append(credential_id)
        
        operation = IndustryOperation(
            operation_id='issue_credential',
            sector_id='education',
            data={'credential': credential.to_dict()},
            attestations=[
                Attestation(type='institution_verification', value=issuer, issuer='accreditation'),
                Attestation(type='completion_verification', value=holder_id, issuer=issuer)
            ],
            energy_escrow_nxt=10.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Credential {credential_id} issued: {title}"
        return result
    
    def verify_credential(self, credential_id: str) -> OperationResult:
        """Verify a credential's authenticity"""
        if credential_id not in self.credentials:
            return OperationResult(success=False, message=f"Credential {credential_id} not found")
        
        credential = self.credentials[credential_id]
        
        operation = IndustryOperation(
            operation_id='verify_credential',
            sector_id='education',
            data={
                'credential': credential.to_dict(),
                'is_valid': credential.is_valid,
                'verification_hash': credential.verification_hash
            }
        )
        
        result = self.execute_operation(operation)
        status = "VALID" if credential.is_valid else "EXPIRED"
        result.message = f"Credential {credential_id}: {status} - {credential.title} from {credential.issuer}"
        return result
    
    def get_learner_profile(self, learner_id: str) -> Optional[Dict]:
        """Get learner profile"""
        if learner_id in self.learners:
            return self.learners[learner_id].to_dict()
        return None
    
    def list_bhls_courses(self) -> List[Dict]:
        """List all free BHLS courses"""
        return [
            course.to_dict()
            for course in self.courses.values()
            if course.level == EducationLevel.BHLS_BASIC
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get education sector statistics"""
        return {
            'total_courses': len(self.courses),
            'bhls_courses': len([c for c in self.courses.values() if c.level == EducationLevel.BHLS_BASIC]),
            'total_enrollments': len(self.enrollments),
            'active_enrollments': sum(1 for e in self.enrollments.values() if e.status == CourseStatus.IN_PROGRESS),
            'completed_enrollments': sum(1 for e in self.enrollments.values() if e.status == CourseStatus.COMPLETED),
            'total_credentials': len(self.credentials),
            'total_learners': len(self.learners)
        }
