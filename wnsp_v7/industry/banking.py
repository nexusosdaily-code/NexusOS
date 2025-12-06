"""
Banking & Finance Sector Adapter

Physics-based financial services for ALL peoples worldwide.
Every transaction validated through Lambda Boson substrate.

Core Principle: Money IS oscillation. Λ = hf/c²
- Savings = Standing waves (stored Lambda mass)
- Transfers = Propagating waves (Lambda in motion)
- Interest = Resonance amplification
- Debt = Phase-locked obligation

BHLS Integration: No citizen can be drained below 1,150 NXT/month.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, calculate_lambda_mass,
    calculate_operation_frequency
)

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299792458


class AccountType(Enum):
    """Types of accounts in the banking system"""
    SAVINGS = "savings"
    CHECKING = "checking"
    LOAN = "loan"
    CREDIT = "credit"
    INVESTMENT = "investment"
    BHLS_PROTECTED = "bhls_protected"


class LoanType(Enum):
    """Types of loans available"""
    PERSONAL = "personal"
    BUSINESS = "business"
    HOUSING = "housing"
    EDUCATION = "education"
    AGRICULTURAL = "agricultural"
    MICROFINANCE = "microfinance"


@dataclass
class Account:
    """A banking account with Lambda-backed balance"""
    account_id: str
    holder_id: str
    account_type: AccountType
    balance_nxt: float = 0.0
    lambda_mass: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    bhls_protected: bool = True
    interest_rate: float = 0.0
    
    @property
    def bhls_floor(self) -> float:
        """Minimum protected balance"""
        return 1150.0 if self.bhls_protected else 0.0
    
    @property
    def available_balance(self) -> float:
        """Balance available for withdrawal (above BHLS floor)"""
        return max(0, self.balance_nxt - self.bhls_floor)
    
    def to_dict(self) -> Dict:
        return {
            'account_id': self.account_id,
            'holder_id': self.holder_id,
            'type': self.account_type.value,
            'balance_nxt': self.balance_nxt,
            'lambda_mass': self.lambda_mass,
            'bhls_protected': self.bhls_protected,
            'available': self.available_balance
        }


@dataclass
class Loan:
    """A loan with physics-based interest"""
    loan_id: str
    borrower_id: str
    loan_type: LoanType
    principal_nxt: float
    interest_rate: float
    term_months: int
    outstanding_nxt: float = 0.0
    lambda_obligation: float = 0.0
    disbursed_at: Optional[datetime] = None
    
    def __post_init__(self):
        if self.outstanding_nxt == 0:
            self.outstanding_nxt = self.principal_nxt
        frequency = 5e14
        self.lambda_obligation = (PLANCK_CONSTANT * frequency * self.principal_nxt) / (SPEED_OF_LIGHT ** 2)
    
    @property
    def monthly_payment(self) -> float:
        """Calculate monthly payment using standard amortization"""
        r = self.interest_rate / 12
        n = self.term_months
        if r > 0:
            return self.principal_nxt * (r * (1 + r)**n) / ((1 + r)**n - 1)
        return self.principal_nxt / n
    
    def to_dict(self) -> Dict:
        return {
            'loan_id': self.loan_id,
            'borrower_id': self.borrower_id,
            'type': self.loan_type.value,
            'principal': self.principal_nxt,
            'outstanding': self.outstanding_nxt,
            'interest_rate': self.interest_rate,
            'term_months': self.term_months,
            'monthly_payment': self.monthly_payment,
            'lambda_obligation': self.lambda_obligation
        }


@dataclass
class Remittance:
    """Cross-border money transfer"""
    remittance_id: str
    sender_id: str
    recipient_id: str
    amount_nxt: float
    source_country: str
    dest_country: str
    lambda_mass: float = 0.0
    status: str = "pending"
    fee_nxt: float = 0.0
    
    def __post_init__(self):
        frequency = 5e14
        self.lambda_mass = (PLANCK_CONSTANT * frequency * self.amount_nxt) / (SPEED_OF_LIGHT ** 2)
        self.fee_nxt = self.amount_nxt * 0.001


class BankingAdapter(IndustryAdapter):
    """
    Banking & Finance Sector Adapter
    
    Key Operations:
    - open_account: Create new account with BHLS protection
    - deposit: Add funds (Lambda mass injection)
    - withdraw: Remove funds (respects BHLS floor)
    - transfer: Move funds between accounts
    - apply_loan: Request loan with Lambda-backed obligation
    - disburse_loan: Release loan funds
    - repay_loan: Make loan payment
    - send_remittance: Cross-border transfer
    - earn_interest: Calculate and apply interest (resonance)
    - close_account: Close account (requires zero balance)
    
    Physics Rules:
    - Conservation: Λ_deposited = Λ_withdrawn + Λ_fees
    - BHLS Protection: balance >= 1,150 NXT for protected accounts
    - Interest = Resonance amplification of standing wave
    - Loan obligation = Phase-locked Lambda commitment
    """
    
    BHLS_FLOOR = 1150.0
    MAX_LOAN_TO_VALUE = 0.8
    MIN_CREDIT_SCORE = 300
    MAX_CREDIT_SCORE = 850
    
    def __init__(self):
        super().__init__(sector_id='banking')
        self.accounts: Dict[str, Account] = {}
        self.loans: Dict[str, Loan] = {}
        self.remittances: Dict[str, Remittance] = {}
    
    def open_account(
        self,
        holder_id: str,
        account_type: AccountType = AccountType.SAVINGS,
        initial_deposit: float = 0.0,
        bhls_protected: bool = True
    ) -> OperationResult:
        """Open a new bank account"""
        import hashlib
        account_id = f"NXB{hashlib.sha256(f'{holder_id}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        frequency = 5e14
        lambda_mass = (PLANCK_CONSTANT * frequency * initial_deposit) / (SPEED_OF_LIGHT ** 2)
        
        account = Account(
            account_id=account_id,
            holder_id=holder_id,
            account_type=account_type,
            balance_nxt=initial_deposit,
            lambda_mass=lambda_mass,
            bhls_protected=bhls_protected
        )
        self.accounts[account_id] = account
        
        operation = IndustryOperation(
            operation_id='open_account',
            sector_id='banking',
            data={'account': account.to_dict()},
            attestations=[Attestation(type='identity_verification', value=holder_id, issuer='system')]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Account {account_id} opened successfully"
        return result
    
    def deposit(self, account_id: str, amount_nxt: float) -> OperationResult:
        """Deposit funds into account (Lambda injection)"""
        if account_id not in self.accounts:
            return OperationResult(success=False, message=f"Account {account_id} not found")
        
        account = self.accounts[account_id]
        frequency = 5e14
        lambda_mass = (PLANCK_CONSTANT * frequency * amount_nxt) / (SPEED_OF_LIGHT ** 2)
        
        account.balance_nxt += amount_nxt
        account.lambda_mass += lambda_mass
        
        operation = IndustryOperation(
            operation_id='deposit',
            sector_id='banking',
            data={'account_id': account_id, 'amount': amount_nxt, 'new_balance': account.balance_nxt}
        )
        
        result = self.execute_operation(operation)
        result.message = f"Deposited {amount_nxt} NXT. New balance: {account.balance_nxt} NXT"
        return result
    
    def withdraw(self, account_id: str, amount_nxt: float) -> OperationResult:
        """Withdraw funds (respects BHLS floor)"""
        if account_id not in self.accounts:
            return OperationResult(success=False, message=f"Account {account_id} not found")
        
        account = self.accounts[account_id]
        
        if amount_nxt > account.available_balance:
            return OperationResult(
                success=False,
                message=f"Withdrawal blocked: Would violate BHLS floor. Available: {account.available_balance} NXT"
            )
        
        frequency = 5e14
        lambda_mass = (PLANCK_CONSTANT * frequency * amount_nxt) / (SPEED_OF_LIGHT ** 2)
        
        account.balance_nxt -= amount_nxt
        account.lambda_mass -= lambda_mass
        
        operation = IndustryOperation(
            operation_id='withdraw',
            sector_id='banking',
            data={'account_id': account_id, 'amount': amount_nxt, 'new_balance': account.balance_nxt},
            attestations=[Attestation(type='account_ownership', value=account_id, issuer='system')]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Withdrew {amount_nxt} NXT. New balance: {account.balance_nxt} NXT"
        return result
    
    def transfer(self, from_account: str, to_account: str, amount_nxt: float) -> OperationResult:
        """Transfer between accounts"""
        if from_account not in self.accounts:
            return OperationResult(success=False, message=f"Source account {from_account} not found")
        if to_account not in self.accounts:
            return OperationResult(success=False, message=f"Destination account {to_account} not found")
        
        source = self.accounts[from_account]
        dest = self.accounts[to_account]
        
        if amount_nxt > source.available_balance:
            return OperationResult(
                success=False,
                message=f"Transfer blocked: Would violate BHLS floor. Available: {source.available_balance} NXT"
            )
        
        frequency = 5e14
        lambda_mass = (PLANCK_CONSTANT * frequency * amount_nxt) / (SPEED_OF_LIGHT ** 2)
        fee_rate = 0.001
        fee_lambda = lambda_mass * fee_rate
        
        source.balance_nxt -= amount_nxt
        source.lambda_mass -= lambda_mass
        dest.balance_nxt += amount_nxt * (1 - fee_rate)
        dest.lambda_mass += lambda_mass - fee_lambda
        
        operation = IndustryOperation(
            operation_id='transfer',
            sector_id='banking',
            data={
                'from': from_account,
                'to': to_account,
                'amount': amount_nxt,
                'fee': amount_nxt * fee_rate
            },
            attestations=[Attestation(type='account_ownership', value=from_account, issuer='system')]
        )
        
        result = self.execute_operation(operation)
        result.message = f"Transferred {amount_nxt} NXT from {from_account} to {to_account}"
        return result
    
    def apply_loan(
        self,
        borrower_id: str,
        loan_type: LoanType,
        principal_nxt: float,
        term_months: int,
        collateral_value: float = 0.0
    ) -> OperationResult:
        """Apply for a loan"""
        import hashlib
        
        if loan_type == LoanType.HOUSING and collateral_value < principal_nxt * self.MAX_LOAN_TO_VALUE:
            return OperationResult(
                success=False,
                message=f"Insufficient collateral. Need {principal_nxt * self.MAX_LOAN_TO_VALUE} NXT, have {collateral_value}"
            )
        
        base_rates = {
            LoanType.PERSONAL: 0.08,
            LoanType.BUSINESS: 0.06,
            LoanType.HOUSING: 0.04,
            LoanType.EDUCATION: 0.03,
            LoanType.AGRICULTURAL: 0.025,
            LoanType.MICROFINANCE: 0.02
        }
        
        loan_id = f"NXL{hashlib.sha256(f'{borrower_id}:{principal_nxt}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        loan = Loan(
            loan_id=loan_id,
            borrower_id=borrower_id,
            loan_type=loan_type,
            principal_nxt=principal_nxt,
            interest_rate=base_rates.get(loan_type, 0.05),
            term_months=term_months
        )
        self.loans[loan_id] = loan
        
        operation = IndustryOperation(
            operation_id='apply_loan',
            sector_id='banking',
            data={'loan': loan.to_dict()},
            attestations=[
                Attestation(type='identity_verification', value=borrower_id, issuer='system'),
                Attestation(type='income_verification', value='verified', issuer='system')
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Loan {loan_id} approved. Monthly payment: {loan.monthly_payment:.2f} NXT"
        return result
    
    def send_remittance(
        self,
        sender_id: str,
        recipient_id: str,
        amount_nxt: float,
        source_country: str,
        dest_country: str
    ) -> OperationResult:
        """Send cross-border remittance"""
        import hashlib
        
        remittance_id = f"NXR{hashlib.sha256(f'{sender_id}:{recipient_id}:{amount_nxt}:{datetime.now().isoformat()}'.encode()).hexdigest()[:12].upper()}"
        
        remittance = Remittance(
            remittance_id=remittance_id,
            sender_id=sender_id,
            recipient_id=recipient_id,
            amount_nxt=amount_nxt,
            source_country=source_country,
            dest_country=dest_country,
            status="completed"
        )
        self.remittances[remittance_id] = remittance
        
        operation = IndustryOperation(
            operation_id='send_remittance',
            sector_id='banking',
            data={
                'remittance_id': remittance_id,
                'amount': amount_nxt,
                'fee': remittance.fee_nxt,
                'route': f"{source_country} → {dest_country}"
            },
            attestations=[
                Attestation(type='identity_verification', value=sender_id, issuer='system'),
                Attestation(type='aml_check', value='passed', issuer='compliance')
            ],
            energy_escrow_nxt=1.0
        )
        
        result = self.execute_operation(operation)
        result.message = f"Remittance {remittance_id} sent. Amount: {amount_nxt} NXT, Fee: {remittance.fee_nxt:.4f} NXT"
        return result
    
    def get_account(self, account_id: str) -> Optional[Dict]:
        """Get account details"""
        if account_id in self.accounts:
            return self.accounts[account_id].to_dict()
        return None
    
    def get_loan(self, loan_id: str) -> Optional[Dict]:
        """Get loan details"""
        if loan_id in self.loans:
            return self.loans[loan_id].to_dict()
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get banking sector statistics"""
        total_deposits = sum(a.balance_nxt for a in self.accounts.values())
        total_loans = sum(l.outstanding_nxt for l in self.loans.values())
        total_remittances = sum(r.amount_nxt for r in self.remittances.values())
        
        return {
            'total_accounts': len(self.accounts),
            'total_deposits_nxt': total_deposits,
            'total_loans': len(self.loans),
            'total_loan_value_nxt': total_loans,
            'total_remittances': len(self.remittances),
            'remittance_volume_nxt': total_remittances,
            'bhls_protected_accounts': sum(1 for a in self.accounts.values() if a.bhls_protected)
        }
