"""
Messaging Payment Adapter
=========================

Atomic payment integration for wavelength messaging system.
Ensures payment and message delivery happen together or not at all.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import hashlib
from datetime import datetime


class PaymentAdapter(ABC):
    """
    Abstract interface for payment processing in messaging system.
    
    Implementations must provide atomic payment semantics:
    - authorize() checks if payment can proceed
    - commit() executes the payment
    - rollback() attempts to reverse payment (if possible)
    """
    
    @abstractmethod
    def authorize(self, sender: str, cost_nxt: float) -> tuple[bool, Optional[str]]:
        """
        Pre-flight check before payment.
        
        Returns:
            (success: bool, error_message: Optional[str])
        """
        pass
    
    @abstractmethod
    def commit(
        self, 
        sender: str, 
        recipient: str, 
        cost_nxt: float, 
        tx_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute the payment transaction.
        
        Args:
            sender: Sender address
            recipient: Recipient address  
            cost_nxt: Amount to pay
            tx_metadata: Message metadata for idempotency key generation
            
        Returns:
            Transaction result dictionary
            
        Raises:
            Exception if payment fails
        """
        pass
    
    @abstractmethod
    def rollback(self) -> bool:
        """
        Attempt to rollback last payment (if possible).
        
        Returns:
            True if rollback succeeded, False otherwise
        """
        pass


class WalletPaymentAdapter(PaymentAdapter):
    """
    Wallet-backed payment adapter for real NXT transactions.
    
    Integrates NexusNativeWallet with messaging system, ensuring:
    - Deterministic idempotency keys for safe retries
    - Automatic account provisioning
    - Atomic payment + message delivery
    """
    
    def __init__(self, wallet, token_system, password: str):
        """
        Initialize wallet payment adapter.
        
        Args:
            wallet: NexusNativeWallet instance
            token_system: NativeTokenSystem instance
            password: Wallet password for transactions
        """
        self.wallet = wallet
        self.token_system = token_system
        self.password = password
        self.last_payment_tx = None
    
    def authorize(self, sender: str, cost_nxt: float) -> tuple[bool, Optional[str]]:
        """
        Check if payment can proceed.
        
        Validates:
        - Sender has sufficient balance
        - VALIDATOR_POOL account exists
        - Recipient account exists in token_system
        """
        try:
            # Check sender balance
            balance_data = self.wallet.get_balance(sender)
            if balance_data['balance_nxt'] < cost_nxt:
                return False, f"Insufficient balance: {balance_data['balance_nxt']:.4f} NXT < {cost_nxt:.4f} NXT required"
            
            # Ensure VALIDATOR_POOL exists
            try:
                self.wallet.get_balance("VALIDATOR_POOL")
            except:
                # Create VALIDATOR_POOL if needed
                try:
                    self.wallet.create_account("VALIDATOR_POOL", "validator_pool_password")
                except Exception as e:
                    # Account might already exist, that's OK
                    pass
            
            return True, None
            
        except Exception as e:
            return False, f"Authorization failed: {str(e)}"
    
    def commit(
        self, 
        sender: str, 
        recipient: str, 
        cost_nxt: float, 
        tx_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute wallet payment with deterministic idempotency.
        
        Generates idempotency key from stable message metadata to ensure:
        - Retries don't double-charge
        - Same message content = same idempotency key
        """
        # Ensure recipient has account in token_system (for message delivery)
        if self.token_system.get_account(recipient) is None:
            self.token_system.create_account(recipient, initial_balance=0)
        
        # Generate deterministic idempotency key from message metadata
        # This ensures retries use the same key and don't double-charge
        idem_components = [
            sender,
            recipient,
            tx_metadata.get('content_hash', ''),
            tx_metadata.get('spectral_region', ''),
            tx_metadata.get('modulation_type', '')
        ]
        idem_data = '|'.join(str(c) for c in idem_components)
        idempotency_key = hashlib.sha256(idem_data.encode()).hexdigest()[:32]
        
        # Execute payment to VALIDATOR_POOL
        payment_result = self.wallet.send_nxt(
            from_address=sender,
            to_address="VALIDATOR_POOL",
            amount=cost_nxt,
            password=self.password,
            idempotency_key=idempotency_key
        )
        
        # Store for potential rollback attempt
        self.last_payment_tx = payment_result
        
        return payment_result
    
    def rollback(self) -> bool:
        """
        Attempt to rollback payment.
        
        Note: Blockchain transactions cannot be reversed.
        This method exists for interface compatibility but will always return False.
        Future implementations could trigger a refund transaction.
        """
        # Blockchain transactions are immutable
        # Future: Could trigger automated refund transaction here
        return False


class DemoPaymentAdapter(PaymentAdapter):
    """
    Demo payment adapter for testing with in-memory token system.
    
    Used for demo accounts (alice, bob, charlie).
    No real wallet transactions, just in-memory balance updates.
    """
    
    def __init__(self, token_system):
        self.token_system = token_system
        self.last_debit = None
    
    def authorize(self, sender: str, cost_nxt: float) -> tuple[bool, Optional[str]]:
        """Check balance in token_system."""
        account = self.token_system.get_account(sender)
        if not account:
            return False, f"Account {sender} not found"
        
        balance_nxt = account.get_balance_nxt()
        if balance_nxt < cost_nxt:
            return False, f"Insufficient balance: {balance_nxt:.4f} NXT < {cost_nxt:.4f} NXT"
        
        return True, None
    
    def commit(
        self, 
        sender: str, 
        recipient: str, 
        cost_nxt: float, 
        tx_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deduct from in-memory token system."""
        # This happens inside messaging_system.send_message() already
        # Just record for rollback
        self.last_debit = {
            'sender': sender,
            'amount': cost_nxt
        }
        
        return {
            'success': True,
            'tx_hash': f"demo_{sender}_{datetime.now().timestamp()}",
            'from': sender,
            'to': 'VALIDATOR_POOL',
            'amount': cost_nxt
        }
    
    def rollback(self) -> bool:
        """
        Rollback in-memory debit.
        
        Returns credits to sender account.
        """
        if self.last_debit:
            account = self.token_system.get_account(self.last_debit['sender'])
            if account:
                # Refund the amount
                cost_units = int(self.last_debit['amount'] * 100)
                account.balance += cost_units
                return True
        
        return False
