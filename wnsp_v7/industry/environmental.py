"""
Environmental & Extraction Sector Adapter

Physics-based environmental governance ensuring extraction operations
fund mandatory restoration. Conservation law: Λ_extracted ≤ Λ_restored + Λ_escrowed

Key Features:
- Restoration escrow enforcement (150% minimum)
- Carbon emission/offset tracking with Lambda chains
- Ecosystem integrity monitoring
- Community benefit distribution
- Violation penalties with automatic escrow seizure
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from .base import (
    IndustryAdapter,
    IndustryOperation,
    OperationResult,
    Attestation,
    SpectralBand,
    load_sector_policy,
    calculate_lambda_mass
)


class EnvironmentalAdapter(IndustryAdapter):
    """
    Environmental & Extraction Sector Adapter
    
    Enforces conservation law: Λ_extracted ≤ Λ_restored + Λ_escrowed
    Companies cannot extract without proving restoration capacity.
    """
    
    def __init__(self):
        super().__init__(sector_id="environmental")
        self._extraction_sites: Dict[str, Dict] = {}
        self._carbon_ledger: Dict[str, Dict] = {}
        self._restoration_escrow: Dict[str, float] = {}
        self._carbon_credits: Dict[str, float] = {}
        self._violations: List[Dict] = []
    
    def apply_for_permit(
        self,
        company_id: str,
        site_id: str,
        resource_type: str,
        estimated_extraction_value_nxt: float,
        restoration_plan: Dict,
        environmental_impact: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Apply for extraction permit with mandatory restoration escrow.
        Escrow must be >= 150% of estimated extraction value.
        """
        min_escrow_percent = self.policy.constraints.get('restoration_escrow_minimum_percent', 150)
        required_restoration_escrow = estimated_extraction_value_nxt * (min_escrow_percent / 100)
        
        if energy_escrow_nxt < required_restoration_escrow:
            return OperationResult(
                success=False,
                message=f"Restoration escrow insufficient: {energy_escrow_nxt} NXT < {required_restoration_escrow} NXT required ({min_escrow_percent}% of extraction value)"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="extraction_permit",
            entity_id=company_id,
            payload={
                "site_id": site_id,
                "resource_type": resource_type,
                "estimated_value": estimated_extraction_value_nxt,
                "restoration_plan": restoration_plan,
                "environmental_impact": environmental_impact,
                "restoration_escrow": energy_escrow_nxt
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._extraction_sites[site_id] = {
                "company_id": company_id,
                "resource_type": resource_type,
                "estimated_value": estimated_extraction_value_nxt,
                "extracted_value": 0.0,
                "restoration_progress": 0.0,
                "status": "permitted",
                "permit_date": datetime.now().isoformat(),
                "restoration_plan": restoration_plan,
                "lambda_extracted": 0.0,
                "lambda_restored": 0.0
            }
            self._restoration_escrow[site_id] = energy_escrow_nxt
        
        return result
    
    def extract_resource(
        self,
        site_id: str,
        quantity: float,
        unit: str,
        value_nxt: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Record resource extraction with real-time tracking.
        Checks against permitted limits and escrow coverage.
        """
        if site_id not in self._extraction_sites:
            return OperationResult(
                success=False,
                message=f"No valid permit for site: {site_id}"
            )
        
        site = self._extraction_sites[site_id]
        if site["status"] != "permitted" and site["status"] != "active":
            return OperationResult(
                success=False,
                message=f"Site {site_id} is not active. Status: {site['status']}"
            )
        
        new_total_extracted = site["extracted_value"] + value_nxt
        escrow_available = self._restoration_escrow.get(site_id, 0)
        
        min_escrow_percent = self.policy.constraints.get('restoration_escrow_minimum_percent', 150)
        required_escrow = new_total_extracted * (min_escrow_percent / 100)
        
        if escrow_available < required_escrow:
            return OperationResult(
                success=False,
                message=f"Extraction would exceed escrow coverage. Add {required_escrow - escrow_available:.2f} NXT to restoration escrow."
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="mineral_extraction",
            entity_id=site["company_id"],
            payload={
                "site_id": site_id,
                "quantity": quantity,
                "unit": unit,
                "value_nxt": value_nxt
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            site["extracted_value"] = new_total_extracted
            site["status"] = "active"
            site["lambda_extracted"] += result.lambda_mass
        
        return result
    
    def record_restoration(
        self,
        site_id: str,
        restoration_type: str,
        area_restored_hectares: float,
        restoration_value_nxt: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Record verified restoration milestone.
        Releases proportional escrow funds.
        """
        if site_id not in self._extraction_sites:
            return OperationResult(
                success=False,
                message=f"Unknown site: {site_id}"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="restoration_milestone",
            entity_id=self._extraction_sites[site_id]["company_id"],
            payload={
                "site_id": site_id,
                "restoration_type": restoration_type,
                "area_hectares": area_restored_hectares,
                "value_nxt": restoration_value_nxt
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            site = self._extraction_sites[site_id]
            site["lambda_restored"] += result.lambda_mass
            
            if site["extracted_value"] > 0:
                site["restoration_progress"] = min(
                    100.0,
                    (site["lambda_restored"] / max(site["lambda_extracted"], 1)) * 100
                )
            
            release_amount = min(
                restoration_value_nxt,
                self._restoration_escrow.get(site_id, 0)
            )
            self._restoration_escrow[site_id] = max(
                0,
                self._restoration_escrow.get(site_id, 0) - release_amount
            )
            
            result.message += f" Released {release_amount:.2f} NXT from escrow."
        
        return result
    
    def complete_restoration(
        self,
        site_id: str,
        final_ecological_report: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Complete restoration and release remaining escrow.
        Requires YOCTO-level multi-party verification.
        """
        if site_id not in self._extraction_sites:
            return OperationResult(
                success=False,
                message=f"Unknown site: {site_id}"
            )
        
        site = self._extraction_sites[site_id]
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="restoration_complete",
            entity_id=site["company_id"],
            payload={
                "site_id": site_id,
                "final_report": final_ecological_report,
                "lambda_extracted": site["lambda_extracted"],
                "lambda_restored": site["lambda_restored"]
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            site["status"] = "restored"
            remaining_escrow = self._restoration_escrow.get(site_id, 0)
            self._restoration_escrow[site_id] = 0
            result.message += f" Site fully restored. Released remaining escrow: {remaining_escrow:.2f} NXT"
        
        return result
    
    def record_emission(
        self,
        entity_id: str,
        emission_type: str,
        tons_co2: float,
        source: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Record carbon emission from operations."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="carbon_emission",
            entity_id=entity_id,
            payload={
                "emission_type": emission_type,
                "tons_co2": tons_co2,
                "source": source
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            if entity_id not in self._carbon_ledger:
                self._carbon_ledger[entity_id] = {
                    "total_emissions": 0.0,
                    "total_offsets": 0.0,
                    "emission_records": [],
                    "offset_records": []
                }
            
            self._carbon_ledger[entity_id]["total_emissions"] += tons_co2
            self._carbon_ledger[entity_id]["emission_records"].append({
                "type": emission_type,
                "tons_co2": tons_co2,
                "source": source,
                "timestamp": datetime.now().isoformat(),
                "lambda_mass": result.lambda_mass
            })
        
        return result
    
    def register_offset(
        self,
        entity_id: str,
        offset_type: str,
        tons_co2: float,
        verification_body: str,
        project_details: Dict,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Register verified carbon offset with Lambda chain provenance."""
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="carbon_offset",
            entity_id=entity_id,
            payload={
                "offset_type": offset_type,
                "tons_co2": tons_co2,
                "verification_body": verification_body,
                "project": project_details
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            if entity_id not in self._carbon_ledger:
                self._carbon_ledger[entity_id] = {
                    "total_emissions": 0.0,
                    "total_offsets": 0.0,
                    "emission_records": [],
                    "offset_records": []
                }
            
            self._carbon_ledger[entity_id]["total_offsets"] += tons_co2
            self._carbon_ledger[entity_id]["offset_records"].append({
                "type": offset_type,
                "tons_co2": tons_co2,
                "verification_body": verification_body,
                "project": project_details,
                "timestamp": datetime.now().isoformat(),
                "lambda_mass": result.lambda_mass
            })
            
            self._carbon_credits[entity_id] = self._carbon_credits.get(entity_id, 0) + tons_co2
        
        return result
    
    def record_violation(
        self,
        site_id: str,
        violation_type: str,
        severity: str,
        evidence: Dict,
        damage_assessment_nxt: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """
        Record environmental violation with automatic escrow seizure.
        Requires YOCTO-level authority.
        """
        if site_id not in self._extraction_sites:
            return OperationResult(
                success=False,
                message=f"Unknown site: {site_id}"
            )
        
        site = self._extraction_sites[site_id]
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="environmental_violation",
            entity_id="REGULATORY_AUTHORITY",
            payload={
                "site_id": site_id,
                "company_id": site["company_id"],
                "violation_type": violation_type,
                "severity": severity,
                "evidence": evidence,
                "damage_assessment": damage_assessment_nxt
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            escrow_available = self._restoration_escrow.get(site_id, 0)
            seizure_amount = min(damage_assessment_nxt, escrow_available)
            self._restoration_escrow[site_id] = escrow_available - seizure_amount
            
            self._violations.append({
                "site_id": site_id,
                "company_id": site["company_id"],
                "violation_type": violation_type,
                "severity": severity,
                "damage_assessment": damage_assessment_nxt,
                "escrow_seized": seizure_amount,
                "timestamp": datetime.now().isoformat()
            })
            
            if severity == "critical":
                site["status"] = "suspended"
            
            result.message += f" Seized {seizure_amount:.2f} NXT from restoration escrow."
        
        return result
    
    def distribute_community_benefit(
        self,
        site_id: str,
        community_id: str,
        benefit_amount_nxt: float,
        benefit_type: str,
        attestations: List[Attestation],
        energy_escrow_nxt: float
    ) -> OperationResult:
        """Distribute extraction benefits to affected communities."""
        if site_id not in self._extraction_sites:
            return OperationResult(
                success=False,
                message=f"Unknown site: {site_id}"
            )
        
        operation = IndustryOperation(
            sector_id=self.sector_id,
            operation_id="community_benefit",
            entity_id=self._extraction_sites[site_id]["company_id"],
            payload={
                "site_id": site_id,
                "community_id": community_id,
                "amount_nxt": benefit_amount_nxt,
                "benefit_type": benefit_type
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt
        )
        
        return self.execute_operation(operation)
    
    def verify_conservation(self, site_id: str) -> Tuple[bool, str, Dict]:
        """
        Verify conservation law: Λ_extracted ≤ Λ_restored + Λ_escrowed
        """
        if site_id not in self._extraction_sites:
            return False, f"Unknown site: {site_id}", {}
        
        site = self._extraction_sites[site_id]
        escrow = self._restoration_escrow.get(site_id, 0)
        
        escrow_lambda = calculate_lambda_mass(1e12) * escrow
        
        lambda_extracted = site["lambda_extracted"]
        lambda_restored = site["lambda_restored"]
        lambda_escrowed = escrow_lambda
        
        is_conserved = lambda_extracted <= (lambda_restored + lambda_escrowed)
        
        balance = {
            "lambda_extracted": lambda_extracted,
            "lambda_restored": lambda_restored,
            "lambda_escrowed": lambda_escrowed,
            "extraction_value_nxt": site["extracted_value"],
            "escrow_nxt": escrow,
            "restoration_progress_percent": site["restoration_progress"]
        }
        
        if is_conserved:
            message = "Conservation law satisfied: Λ_extracted ≤ Λ_restored + Λ_escrowed"
        else:
            deficit = lambda_extracted - (lambda_restored + lambda_escrowed)
            message = f"Conservation VIOLATION: Deficit of {deficit:.6e} kg Lambda mass"
        
        return is_conserved, message, balance
    
    def get_carbon_balance(self, entity_id: str) -> Tuple[bool, str, Dict]:
        """Check if entity is carbon neutral."""
        if entity_id not in self._carbon_ledger:
            return True, "No carbon activity recorded", {"emissions": 0, "offsets": 0}
        
        ledger = self._carbon_ledger[entity_id]
        emissions = ledger["total_emissions"]
        offsets = ledger["total_offsets"]
        
        is_neutral = offsets >= emissions
        balance = emissions - offsets
        
        status = {
            "total_emissions_tons": emissions,
            "total_offsets_tons": offsets,
            "net_balance_tons": balance,
            "is_carbon_neutral": is_neutral
        }
        
        if is_neutral:
            message = f"Carbon neutral: {offsets:.2f} offsets ≥ {emissions:.2f} emissions"
        else:
            message = f"Carbon deficit: Need {balance:.2f} more tons of offsets"
        
        return is_neutral, message, status
    
    def get_site_status(self, site_id: str) -> Optional[Dict]:
        """Get extraction site status."""
        return self._extraction_sites.get(site_id)
    
    def get_escrow_balance(self, site_id: str) -> float:
        """Get restoration escrow balance for a site."""
        return self._restoration_escrow.get(site_id, 0)
    
    def get_violations(self, company_id: Optional[str] = None) -> List[Dict]:
        """Get violation history, optionally filtered by company."""
        if company_id:
            return [v for v in self._violations if v["company_id"] == company_id]
        return self._violations
    
    def get_carbon_credits(self, entity_id: str) -> float:
        """Get available carbon credits for an entity."""
        return self._carbon_credits.get(entity_id, 0)
