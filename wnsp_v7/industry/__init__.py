"""
NexusOS Industry Adapters

Domain-specific adapters built on the universal Lambda Boson substrate.
Each adapter translates industry operations into substrate transactions
while enforcing sector-specific policy packs.

Supported Industries (12 Sectors):
- Energy: Power grid, utilities, metering
- Security: Access control, secure communications
- Military: Command & control, logistics
- SupplyChain: Provenance, logistics, trade
- Environmental: Extraction, restoration, carbon tracking
- CommunityHealth: Nutrition, fitness, education, infrastructure for ALL peoples
- Banking: Savings, loans, credit, remittances (BHLS protected)
- Insurance: Risk pooling, claims, actuarial (BHLS basic coverage)
- Education: Credentials, certificates, learning (BHLS free courses)
- Legal: Contracts, disputes, arbitration (BHLS legal aid)
- RealEstate: Property rights, transfers, housing (BHLS subsidized)
- Transportation: Transit, freight, logistics (BHLS free journeys)

Usage:
    from wnsp_v7.industry import EnergyAdapter, BankingAdapter, EducationAdapter
    
    # Energy sector
    energy = EnergyAdapter()
    result = energy.generate_power(generator_id, megawatts, attestations)
    
    # Banking sector with BHLS protection
    banking = BankingAdapter()
    result = banking.open_account(holder_id, AccountType.SAVINGS)
    
    # Education with free BHLS courses
    education = EducationAdapter()
    courses = education.list_bhls_courses()

All 12 sectors are now global-ready for the WNSP operating system.
"""

from .base import IndustryAdapter, load_sector_policy, SectorPolicy
from .energy import EnergyAdapter
from .security import SecurityAdapter
from .military import MilitaryAdapter
from .supply_chain import SupplyChainAdapter
from .environmental import EnvironmentalAdapter
from .community_health import CommunityHealthAdapter, ProgramType, DeviceType, ColorblindType
from .banking import BankingAdapter, AccountType, LoanType
from .insurance import InsuranceAdapter, InsuranceType, ClaimStatus
from .education import EducationAdapter, EducationLevel, CredentialType
from .legal import LegalAdapter, ContractType, DisputeType
from .real_estate import RealEstateAdapter, PropertyType, LeaseType
from .transportation import TransportationAdapter, TransportMode, TicketType, ShipmentStatus

__all__ = [
    'IndustryAdapter',
    'load_sector_policy',
    'SectorPolicy',
    'EnergyAdapter',
    'SecurityAdapter',
    'MilitaryAdapter',
    'SupplyChainAdapter',
    'EnvironmentalAdapter',
    'CommunityHealthAdapter',
    'ProgramType',
    'DeviceType',
    'ColorblindType',
    'BankingAdapter',
    'AccountType',
    'LoanType',
    'InsuranceAdapter',
    'InsuranceType',
    'ClaimStatus',
    'EducationAdapter',
    'EducationLevel',
    'CredentialType',
    'LegalAdapter',
    'ContractType',
    'DisputeType',
    'RealEstateAdapter',
    'PropertyType',
    'LeaseType',
    'TransportationAdapter',
    'TransportMode',
    'TicketType',
    'ShipmentStatus'
]

__version__ = '2.0.0'
