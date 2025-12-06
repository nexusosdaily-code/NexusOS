"""
Community Health Sector Adapter

Universal physics-based governance for community health programs worldwide.
Nutrition, fitness, health education in local languages, and remote infrastructure.
BHLS floor of 1,150 NXT/month guaranteed for ALL peoples.

Key Features:
- Fund allocation and tracking for health programs
- Child nutrition programs
- Fitness and wellness programs
- Health education in ANY local language
- Remote infrastructure development
- BHLS distribution guarantee
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
from .base import (
    IndustryAdapter,
    IndustryOperation,
    OperationResult,
    Attestation,
    SpectralBand,
    load_sector_policy,
    calculate_lambda_mass
)


class ProgramType(Enum):
    NUTRITION = "nutrition"
    CHILD_NUTRITION = "child_nutrition"
    FITNESS = "fitness"
    HEALTH_EDUCATION = "health_education"
    MEDICAL_SERVICES = "medical_services"
    MATERNAL_HEALTH = "maternal_health"
    ELDER_CARE = "elder_care"
    INFRASTRUCTURE = "infrastructure"
    EMERGENCY_RESPONSE = "emergency_response"
    MEDICAL_DEVICES = "medical_devices"
    VISION_CARE = "vision_care"
    HEARING_CARE = "hearing_care"


class DeviceType(Enum):
    COLORBLIND_GLASSES = "colorblind_glasses"
    CORRECTIVE_GLASSES = "corrective_glasses"
    HEARING_AIDS = "hearing_aids"
    PROSTHETICS = "prosthetics"
    MOBILITY_AIDS = "mobility_aids"
    DIABETES_MONITORS = "diabetes_monitors"
    BLOOD_PRESSURE_MONITORS = "blood_pressure_monitors"


class ColorblindType(Enum):
    PROTAN = "protan"      # Red-weak
    DEUTAN = "deutan"      # Green-weak
    TRITAN = "tritan"      # Blue-weak


class CommunityHealthAdapter(IndustryAdapter):
    """
    Community Health Sector Adapter
    
    Universal health programs for ALL peoples worldwide.
    Ensures BHLS floor reaches every registered member.
    """
    
    BHLS_MONTHLY_FLOOR = 1150  # NXT per person per month
    
    def __init__(self):
        super().__init__(sector_id="community_health")
        self._communities: Dict[str, Dict] = {}
        self._members: Dict[str, Dict] = {}
        self._programs: Dict[str, Dict] = {}
        self._fund_allocations: Dict[str, Dict] = {}
        self._disbursements: List[Dict] = []
        self._bhls_distributions: Dict[str, List[Dict]] = {}
        self._infrastructure_projects: Dict[str, Dict] = {}
        self._manufactured_devices: Dict[str, Dict] = {}
        self._device_distributions: List[Dict] = []
        self._vision_screenings: List[Dict] = []
    
    def register_community(
        self,
        community_id: str,
        name: str,
        location: Dict,
        population: int,
        languages: List[str],
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Register a community for health program access."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="community_registration",
            entity_id=community_id,
            payload={
                "name": name,
                "location": location,
                "population": population,
                "languages": languages
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._communities[community_id] = {
                "name": name,
                "location": location,
                "population": population,
                "languages": languages,
                "registered_date": datetime.now().isoformat(),
                "member_count": 0,
                "programs_active": [],
                "bhls_eligible": True,
                "total_bhls_distributed": 0.0
            }
        
        return result
    
    def enroll_member(
        self,
        member_id: str,
        community_id: str,
        name: str,
        age: int,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Enroll community member in health programs with BHLS guarantee."""
        if community_id not in self._communities:
            return OperationResult(
                success=False,
                message=f"Community {community_id} not registered"
            )
        
        is_child = age < 18
        is_elder = age >= 65
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="member_enrollment",
            entity_id=member_id,
            payload={
                "community_id": community_id,
                "name": name,
                "age": age,
                "is_child": is_child,
                "is_elder": is_elder
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            supplement = 0
            if is_child:
                supplement = self.BHLS_MONTHLY_FLOOR * 0.25
            elif is_elder:
                supplement = self.BHLS_MONTHLY_FLOOR * 0.15
            
            self._members[member_id] = {
                "community_id": community_id,
                "name": name,
                "age": age,
                "is_child": is_child,
                "is_elder": is_elder,
                "enrolled_date": datetime.now().isoformat(),
                "bhls_amount": self.BHLS_MONTHLY_FLOOR + supplement,
                "programs_enrolled": [],
                "health_records": []
            }
            self._communities[community_id]["member_count"] += 1
            self._bhls_distributions[member_id] = []
        
        return result
    
    def allocate_funds(
        self,
        allocation_id: str,
        program_type: ProgramType,
        amount_nxt: float,
        target_communities: List[str],
        duration_months: int,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Allocate funds to a specific health program."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="fund_allocation",
            entity_id=allocation_id,
            payload={
                "program_type": program_type.value,
                "amount_nxt": amount_nxt,
                "target_communities": target_communities,
                "duration_months": duration_months
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._fund_allocations[allocation_id] = {
                "program_type": program_type.value,
                "total_amount": amount_nxt,
                "remaining_amount": amount_nxt,
                "target_communities": target_communities,
                "duration_months": duration_months,
                "created_date": datetime.now().isoformat(),
                "disbursements": [],
                "status": "active"
            }
        
        return result
    
    def disburse_funds(
        self,
        allocation_id: str,
        recipient_id: str,
        amount_nxt: float,
        purpose: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Disburse allocated funds to program operators."""
        if allocation_id not in self._fund_allocations:
            return OperationResult(
                success=False,
                message=f"Allocation {allocation_id} not found"
            )
        
        allocation = self._fund_allocations[allocation_id]
        if amount_nxt > allocation["remaining_amount"]:
            return OperationResult(
                success=False,
                message=f"Insufficient funds: {allocation['remaining_amount']:.2f} NXT available, {amount_nxt:.2f} requested"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="fund_disbursement",
            entity_id=recipient_id,
            payload={
                "allocation_id": allocation_id,
                "amount_nxt": amount_nxt,
                "purpose": purpose
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            allocation["remaining_amount"] -= amount_nxt
            disbursement = {
                "recipient_id": recipient_id,
                "amount_nxt": amount_nxt,
                "purpose": purpose,
                "timestamp": datetime.now().isoformat(),
                "lambda_mass": result.lambda_mass
            }
            allocation["disbursements"].append(disbursement)
            self._disbursements.append(disbursement)
        
        return result
    
    def deliver_nutrition(
        self,
        community_id: str,
        delivery_id: str,
        recipients: int,
        package_type: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Track nutrition package delivery to communities."""
        if community_id not in self._communities:
            return OperationResult(
                success=False,
                message=f"Community {community_id} not registered"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="nutrition_delivery",
            entity_id=delivery_id,
            payload={
                "community_id": community_id,
                "recipients": recipients,
                "package_type": package_type
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def record_child_nutrition(
        self,
        child_id: str,
        community_id: str,
        meal_type: str,
        calories: int,
        nutrients: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Specialized nutrition tracking for children."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="child_nutrition",
            entity_id=child_id,
            payload={
                "community_id": community_id,
                "meal_type": meal_type,
                "calories": calories,
                "nutrients": nutrients
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def record_fitness_session(
        self,
        session_id: str,
        community_id: str,
        activity_type: str,
        participants: int,
        duration_minutes: int,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Record community fitness and wellness session."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="fitness_program",
            entity_id=session_id,
            payload={
                "community_id": community_id,
                "activity_type": activity_type,
                "participants": participants,
                "duration_minutes": duration_minutes
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def deliver_health_education(
        self,
        session_id: str,
        community_id: str,
        topic: str,
        language: str,
        attendees: int,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Health education delivered in local language."""
        if community_id in self._communities:
            community_languages = self._communities[community_id].get("languages", [])
            if language not in community_languages:
                community_languages.append(language)
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="health_education",
            entity_id=session_id,
            payload={
                "community_id": community_id,
                "topic": topic,
                "language": language,
                "attendees": attendees
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def create_language_content(
        self,
        content_id: str,
        language: str,
        content_type: str,
        topic: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Create health education materials in local languages worldwide."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="language_content",
            entity_id=content_id,
            payload={
                "language": language,
                "content_type": content_type,
                "topic": topic
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def start_infrastructure_project(
        self,
        project_id: str,
        community_id: str,
        project_type: str,
        budget_nxt: float,
        milestones: List[str],
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Start infrastructure development in remote areas."""
        if community_id not in self._communities:
            return OperationResult(
                success=False,
                message=f"Community {community_id} not registered"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="infrastructure_project",
            entity_id=project_id,
            payload={
                "community_id": community_id,
                "project_type": project_type,
                "budget_nxt": budget_nxt,
                "milestones": milestones
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._infrastructure_projects[project_id] = {
                "community_id": community_id,
                "project_type": project_type,
                "budget_nxt": budget_nxt,
                "spent_nxt": 0.0,
                "milestones": milestones,
                "completed_milestones": [],
                "status": "active",
                "started_date": datetime.now().isoformat()
            }
        
        return result
    
    def complete_infrastructure_milestone(
        self,
        project_id: str,
        milestone_name: str,
        cost_nxt: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Record infrastructure milestone completion."""
        if project_id not in self._infrastructure_projects:
            return OperationResult(
                success=False,
                message=f"Project {project_id} not found"
            )
        
        project = self._infrastructure_projects[project_id]
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="infrastructure_milestone",
            entity_id=project_id,
            payload={
                "milestone_name": milestone_name,
                "cost_nxt": cost_nxt
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            project["completed_milestones"].append(milestone_name)
            project["spent_nxt"] += cost_nxt
            
            if len(project["completed_milestones"]) == len(project["milestones"]):
                project["status"] = "completed"
        
        return result
    
    def distribute_bhls(
        self,
        member_id: str,
        month: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Distribute monthly BHLS floor to community member.
        1,150 NXT/month base + supplements for children, elders.
        """
        if member_id not in self._members:
            return OperationResult(
                success=False,
                message=f"Member {member_id} not enrolled"
            )
        
        member = self._members[member_id]
        bhls_amount = member["bhls_amount"]
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="bhls_distribution",
            entity_id=member_id,
            payload={
                "month": month,
                "amount_nxt": bhls_amount,
                "base_amount": self.BHLS_MONTHLY_FLOOR,
                "supplement": bhls_amount - self.BHLS_MONTHLY_FLOOR
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._bhls_distributions[member_id].append({
                "month": month,
                "amount_nxt": bhls_amount,
                "timestamp": datetime.now().isoformat(),
                "lambda_mass": result.lambda_mass
            })
            
            community = self._communities.get(member["community_id"])
            if community:
                community["total_bhls_distributed"] += bhls_amount
            
            result.message = f"BHLS distributed: {bhls_amount:.2f} NXT to {member['name']}"
        
        return result
    
    def record_emergency_response(
        self,
        emergency_id: str,
        community_id: str,
        emergency_type: str,
        response_details: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Emergency medical response to community."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="emergency_response",
            entity_id=emergency_id,
            payload={
                "community_id": community_id,
                "emergency_type": emergency_type,
                "response_details": response_details
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def get_community_stats(self, community_id: str) -> Optional[Dict]:
        """Get community health program statistics."""
        return self._communities.get(community_id)
    
    def get_member_bhls_history(self, member_id: str) -> List[Dict]:
        """Get BHLS distribution history for a member."""
        return self._bhls_distributions.get(member_id, [])
    
    def get_fund_allocation(self, allocation_id: str) -> Optional[Dict]:
        """Get fund allocation details."""
        return self._fund_allocations.get(allocation_id)
    
    def get_infrastructure_project(self, project_id: str) -> Optional[Dict]:
        """Get infrastructure project status."""
        return self._infrastructure_projects.get(project_id)
    
    def calculate_total_bhls_required(self) -> Tuple[float, int]:
        """Calculate total BHLS required for all enrolled members."""
        total = 0.0
        count = 0
        for member in self._members.values():
            total += member["bhls_amount"]
            count += 1
        return total, count
    
    def get_program_fund_status(self) -> Dict:
        """Get overview of all program fund allocations."""
        status = {
            "total_allocated": 0.0,
            "total_disbursed": 0.0,
            "total_remaining": 0.0,
            "by_program": {}
        }
        
        for alloc_id, alloc in self._fund_allocations.items():
            program = alloc["program_type"]
            if program not in status["by_program"]:
                status["by_program"][program] = {
                    "allocated": 0.0,
                    "remaining": 0.0
                }
            
            status["total_allocated"] += alloc["total_amount"]
            status["total_remaining"] += alloc["remaining_amount"]
            status["by_program"][program]["allocated"] += alloc["total_amount"]
            status["by_program"][program]["remaining"] += alloc["remaining_amount"]
        
        status["total_disbursed"] = status["total_allocated"] - status["total_remaining"]
        
        return status
    
    def manufacture_colorblind_glasses(
        self,
        batch_id: str,
        colorblind_type: ColorblindType,
        quantity: int,
        wavelength_specs: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Manufacture colorblind glasses with wavelength filtering.
        Uses notch filter technology to filter specific wavelengths.
        
        Wavelength specs should include:
        - target_wavelength_nm: Target wavelength to filter (530-560nm typical)
        - filter_bandwidth_nm: Width of filter notch (10-20nm typical)
        """
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="colorblind_glasses",
            entity_id=batch_id,
            payload={
                "colorblind_type": colorblind_type.value,
                "quantity": quantity,
                "wavelength_specs": wavelength_specs,
                "device_type": DeviceType.COLORBLIND_GLASSES.value
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._manufactured_devices[batch_id] = {
                "device_type": DeviceType.COLORBLIND_GLASSES.value,
                "colorblind_type": colorblind_type.value,
                "quantity": quantity,
                "quantity_distributed": 0,
                "wavelength_specs": wavelength_specs,
                "manufactured_date": datetime.now().isoformat(),
                "lambda_mass": result.lambda_mass,
                "status": "manufactured"
            }
        
        return result
    
    def manufacture_device(
        self,
        batch_id: str,
        device_type: DeviceType,
        quantity: int,
        specifications: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Manufacture medical devices (glasses, hearing aids, prosthetics)."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="device_manufacturing",
            entity_id=batch_id,
            payload={
                "device_type": device_type.value,
                "quantity": quantity,
                "specifications": specifications
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._manufactured_devices[batch_id] = {
                "device_type": device_type.value,
                "quantity": quantity,
                "quantity_distributed": 0,
                "specifications": specifications,
                "manufactured_date": datetime.now().isoformat(),
                "lambda_mass": result.lambda_mass,
                "status": "manufactured"
            }
        
        return result
    
    def conduct_vision_screening(
        self,
        screening_id: str,
        community_id: str,
        participants: int,
        conditions_identified: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Conduct community vision screening to identify needs.
        Identifies colorblindness, myopia, hyperopia, etc.
        """
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="vision_screening",
            entity_id=screening_id,
            payload={
                "community_id": community_id,
                "participants": participants,
                "conditions_identified": conditions_identified
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._vision_screenings.append({
                "screening_id": screening_id,
                "community_id": community_id,
                "participants": participants,
                "conditions": conditions_identified,
                "timestamp": datetime.now().isoformat()
            })
        
        return result
    
    def distribute_device(
        self,
        distribution_id: str,
        batch_id: str,
        recipient_id: str,
        community_id: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Distribute medical device to community member."""
        if batch_id not in self._manufactured_devices:
            return OperationResult(
                success=False,
                message=f"Batch {batch_id} not found"
            )
        
        batch = self._manufactured_devices[batch_id]
        if batch["quantity_distributed"] >= batch["quantity"]:
            return OperationResult(
                success=False,
                message=f"Batch {batch_id} fully distributed"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="device_distribution",
            entity_id=distribution_id,
            payload={
                "batch_id": batch_id,
                "recipient_id": recipient_id,
                "community_id": community_id,
                "device_type": batch["device_type"]
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            batch["quantity_distributed"] += 1
            self._device_distributions.append({
                "distribution_id": distribution_id,
                "batch_id": batch_id,
                "recipient_id": recipient_id,
                "community_id": community_id,
                "device_type": batch["device_type"],
                "timestamp": datetime.now().isoformat()
            })
        
        return result
    
    def fit_device(
        self,
        fitting_id: str,
        recipient_id: str,
        device_type: DeviceType,
        fitting_details: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Professional fitting of medical devices."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="device_fitting",
            entity_id=fitting_id,
            payload={
                "recipient_id": recipient_id,
                "device_type": device_type.value,
                "fitting_details": fitting_details
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def track_health_outcome(
        self,
        tracking_id: str,
        recipient_id: str,
        device_type: DeviceType,
        baseline: Dict,
        current: Dict,
        improvement_notes: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Track health improvement from device usage."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="outcome_tracking",
            entity_id=tracking_id,
            payload={
                "recipient_id": recipient_id,
                "device_type": device_type.value,
                "baseline": baseline,
                "current": current,
                "improvement_notes": improvement_notes
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def get_manufactured_devices(self, device_type: Optional[DeviceType] = None) -> Dict:
        """Get manufactured device inventory."""
        if device_type:
            return {
                k: v for k, v in self._manufactured_devices.items()
                if v["device_type"] == device_type.value
            }
        return self._manufactured_devices
    
    def get_device_distribution_stats(self) -> Dict:
        """Get device distribution statistics."""
        stats = {
            "total_manufactured": 0,
            "total_distributed": 0,
            "by_device_type": {}
        }
        
        for batch in self._manufactured_devices.values():
            device_type = batch["device_type"]
            if device_type not in stats["by_device_type"]:
                stats["by_device_type"][device_type] = {
                    "manufactured": 0,
                    "distributed": 0
                }
            
            stats["total_manufactured"] += batch["quantity"]
            stats["total_distributed"] += batch["quantity_distributed"]
            stats["by_device_type"][device_type]["manufactured"] += batch["quantity"]
            stats["by_device_type"][device_type]["distributed"] += batch["quantity_distributed"]
        
        return stats
    
    def get_vision_screening_results(self, community_id: Optional[str] = None) -> List[Dict]:
        """Get vision screening results."""
        if community_id:
            return [s for s in self._vision_screenings if s["community_id"] == community_id]
        return self._vision_screenings
