"""
Messaging Payment Layer - Physics-Based Secure Communication
=============================================================

Integrates with NexusOS substrate layer for physics-based economics:
- E=hf energy pricing (Planck's equation)
- Λ=hf/c² Lambda Boson mass tracking
- Orbital burns → TransitionReserveLedger
- BHLS CONNECTIVITY allocation integration
- SDK fee routing to founder wallet

Every message transaction flows through the substrate for physics compliance.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from enum import Enum
import time
from native_token import token_system, TokenTransaction, TransactionType
from physics_economics_adapter import (
    get_physics_adapter, 
    EconomicModule,
    PhysicsEnergyResult,
    SubstrateTransaction
)

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 2.99792458e8


class MessageType(Enum):
    """Types of paid messages with spectral wavelengths"""
    ENCRYPTED_TEXT = "encrypted_text"
    LINK_SHARE = "link_share"
    VIDEO_SHARE = "video_share"
    FILE_SHARE = "file_share"
    
    @property
    def wavelength_nm(self) -> float:
        """Get characteristic wavelength for message type"""
        wavelengths = {
            "encrypted_text": 450.0,
            "link_share": 520.0,
            "video_share": 380.0,
            "file_share": 550.0
        }
        return wavelengths.get(self.value, 550.0)


@dataclass
class PaidMessage:
    """Represents a paid message"""
    message_id: str
    from_address: str
    to_address: str
    message_type: MessageType
    payment_tx: TokenTransaction
    encrypted_content: str
    timestamp: float = field(default_factory=time.time)
    delivered: bool = False
    
    def get_cost_nxt(self) -> float:
        """Get message cost in NXT"""
        return token_system.units_to_nxt(self.payment_tx.amount)


class MessagingPaymentSystem:
    """
    Payment layer for secure messaging with full substrate compliance.
    
    Physics Economics Flow:
    1. E=hf energy calculation based on message wavelength
    2. BHLS CONNECTIVITY allocation check/deduction
    3. Orbital transition burn → TransitionReserveLedger
    4. SDK fee routing to founder wallet (0.5%)
    5. Lambda Boson mass tracking (Λ=hf/c²)
    
    Every message transaction is physics-compliant.
    """
    
    def __init__(self):
        self.paid_messages: List[PaidMessage] = []
        self.message_counter: int = 0
        self._physics_adapter = get_physics_adapter()
        self.substrate_transactions: List[SubstrateTransaction] = []
        self.total_energy_joules = 0.0
        self.total_lambda_mass_kg = 0.0
    
    def send_encrypted_message(
        self,
        from_address: str,
        to_address: str,
        encrypted_content: str,
        use_bhls: bool = True
    ) -> Tuple[Optional[PaidMessage], Optional[SubstrateTransaction]]:
        """
        Send encrypted message with physics-based payment.
        
        Physics Flow:
        1. Calculate E=hf energy for message wavelength (450nm blue)
        2. Check/deduct BHLS CONNECTIVITY allocation if enabled
        3. Process orbital transition burn
        4. Route 0.5% SDK fee to founder wallet
        5. Track Lambda Boson mass (Λ=hf/c²)
        
        Args:
            from_address: Sender's token address
            to_address: Recipient's address
            encrypted_content: Wavelength-encrypted message content
            use_bhls: Whether to deduct from BHLS CONNECTIVITY allocation
        
        Returns:
            (PaidMessage, SubstrateTransaction) if successful
        """
        from_account = token_system.get_account(from_address)
        if not from_account:
            return None, None
        
        cost = token_system.MESSAGE_BURN_RATE
        if not from_account.has_sufficient_balance(cost):
            return None, None
        
        message_id = f"MSG{self.message_counter:08d}"
        wavelength_nm = MessageType.ENCRYPTED_TEXT.wavelength_nm
        cost_nxt = token_system.units_to_nxt(cost)
        
        substrate_tx = self._physics_adapter.process_orbital_burn(
            sender_address=from_address,
            amount_nxt=cost_nxt,
            wavelength_nm=wavelength_nm,
            module=EconomicModule.MESSAGING,
            message_id=message_id,
            bhls_category="CONNECTIVITY" if use_bhls else None
        )
        
        if not substrate_tx.success:
            return None, substrate_tx
        
        self.substrate_transactions.append(substrate_tx)
        self.total_energy_joules += substrate_tx.energy_joules
        self.total_lambda_mass_kg += substrate_tx.lambda_boson_kg
        
        payment_tx = TokenTransaction(
            tx_type=TransactionType.BURN,
            from_address=from_address,
            to_address="BURN",
            amount=cost,
            timestamp=time.time(),
            tx_hash=message_id
        )
        
        message = PaidMessage(
            message_id=message_id,
            from_address=from_address,
            to_address=to_address,
            message_type=MessageType.ENCRYPTED_TEXT,
            payment_tx=payment_tx,
            encrypted_content=encrypted_content
        )
        
        self.message_counter += 1
        self.paid_messages.append(message)
        
        return message, substrate_tx
    
    def share_link(
        self,
        from_address: str,
        to_address: str,
        link_url: str,
        note: str = "",
        use_bhls: bool = True
    ) -> Tuple[Optional[PaidMessage], Optional[SubstrateTransaction]]:
        """
        Share link with physics-based payment.
        
        Physics Flow:
        1. Calculate E=hf energy for link wavelength (520nm green)
        2. Check/deduct BHLS CONNECTIVITY allocation
        3. Process orbital transition burn
        4. Route SDK fee to founder wallet
        
        Args:
            from_address: Sender's token address
            to_address: Recipient's address
            link_url: URL to share
            note: Optional note
            use_bhls: Whether to deduct from BHLS
        
        Returns:
            (PaidMessage, SubstrateTransaction) if successful
        """
        from_account = token_system.get_account(from_address)
        if not from_account:
            return None, None
        
        cost = token_system.LINK_SHARE_BURN_RATE
        if not from_account.has_sufficient_balance(cost):
            return None, None
        
        message_id = f"LINK{self.message_counter:08d}"
        wavelength_nm = MessageType.LINK_SHARE.wavelength_nm
        cost_nxt = token_system.units_to_nxt(cost)
        
        substrate_tx = self._physics_adapter.process_orbital_burn(
            sender_address=from_address,
            amount_nxt=cost_nxt,
            wavelength_nm=wavelength_nm,
            module=EconomicModule.MESSAGING,
            message_id=message_id,
            bhls_category="CONNECTIVITY" if use_bhls else None
        )
        
        if not substrate_tx.success:
            return None, substrate_tx
        
        self.substrate_transactions.append(substrate_tx)
        self.total_energy_joules += substrate_tx.energy_joules
        self.total_lambda_mass_kg += substrate_tx.lambda_boson_kg
        
        payment_tx = TokenTransaction(
            tx_type=TransactionType.BURN,
            from_address=from_address,
            to_address="BURN",
            amount=cost,
            timestamp=time.time(),
            tx_hash=message_id
        )
        
        content = f"{link_url}|||{note}" if note else link_url
        message = PaidMessage(
            message_id=message_id,
            from_address=from_address,
            to_address=to_address,
            message_type=MessageType.LINK_SHARE,
            payment_tx=payment_tx,
            encrypted_content=content
        )
        
        self.message_counter += 1
        self.paid_messages.append(message)
        
        return message, substrate_tx
    
    def share_video(
        self,
        from_address: str,
        to_address: str,
        video_url: str,
        note: str = "",
        use_bhls: bool = True
    ) -> Tuple[Optional[PaidMessage], Optional[SubstrateTransaction]]:
        """
        Share video with physics-based payment.
        
        Physics Flow:
        1. Calculate E=hf energy for video wavelength (380nm UV - high energy)
        2. Check/deduct BHLS CONNECTIVITY allocation
        3. Process orbital transition burn
        4. Route SDK fee to founder wallet
        
        Args:
            from_address: Sender's token address
            to_address: Recipient's address
            video_url: Video URL to share
            note: Optional note
            use_bhls: Whether to deduct from BHLS
        
        Returns:
            (PaidMessage, SubstrateTransaction) if successful
        """
        from_account = token_system.get_account(from_address)
        if not from_account:
            return None, None
        
        cost = token_system.VIDEO_SHARE_BURN_RATE
        if not from_account.has_sufficient_balance(cost):
            return None, None
        
        message_id = f"VID{self.message_counter:08d}"
        wavelength_nm = MessageType.VIDEO_SHARE.wavelength_nm
        cost_nxt = token_system.units_to_nxt(cost)
        
        substrate_tx = self._physics_adapter.process_orbital_burn(
            sender_address=from_address,
            amount_nxt=cost_nxt,
            wavelength_nm=wavelength_nm,
            module=EconomicModule.MESSAGING,
            message_id=message_id,
            bhls_category="CONNECTIVITY" if use_bhls else None
        )
        
        if not substrate_tx.success:
            return None, substrate_tx
        
        self.substrate_transactions.append(substrate_tx)
        self.total_energy_joules += substrate_tx.energy_joules
        self.total_lambda_mass_kg += substrate_tx.lambda_boson_kg
        
        payment_tx = TokenTransaction(
            tx_type=TransactionType.BURN,
            from_address=from_address,
            to_address="BURN",
            amount=cost,
            timestamp=time.time(),
            tx_hash=message_id
        )
        
        content = f"{video_url}|||{note}" if note else video_url
        message = PaidMessage(
            message_id=message_id,
            from_address=from_address,
            to_address=to_address,
            message_type=MessageType.VIDEO_SHARE,
            payment_tx=payment_tx,
            encrypted_content=content
        )
        
        self.message_counter += 1
        self.paid_messages.append(message)
        
        return message, substrate_tx
    
    def get_inbox(self, address: str, limit: int = 50) -> List[PaidMessage]:
        """Get received messages for an address"""
        inbox = [
            msg for msg in self.paid_messages
            if msg.to_address == address
        ]
        return sorted(inbox, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_sent_messages(self, address: str, limit: int = 50) -> List[PaidMessage]:
        """Get sent messages for an address"""
        sent = [
            msg for msg in self.paid_messages
            if msg.from_address == address
        ]
        return sorted(sent, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_messaging_stats(self) -> dict:
        """Get messaging statistics with physics economics data"""
        total_messages = len(self.paid_messages)
        
        messages_by_type = {
            MessageType.ENCRYPTED_TEXT: 0,
            MessageType.LINK_SHARE: 0,
            MessageType.VIDEO_SHARE: 0,
        }
        
        total_burned = 0
        
        for msg in self.paid_messages:
            messages_by_type[msg.message_type] = messages_by_type.get(msg.message_type, 0) + 1
            total_burned += msg.payment_tx.amount
        
        total_sdk_fees = sum(t.sdk_fee_routed for t in self.substrate_transactions)
        
        return {
            "total_messages": total_messages,
            "encrypted_messages": messages_by_type.get(MessageType.ENCRYPTED_TEXT, 0),
            "link_shares": messages_by_type.get(MessageType.LINK_SHARE, 0),
            "video_shares": messages_by_type.get(MessageType.VIDEO_SHARE, 0),
            "total_burned_units": total_burned,
            "total_burned_nxt": token_system.units_to_nxt(total_burned),
            "avg_cost_per_message": total_burned / total_messages if total_messages > 0 else 0,
            "physics_economics": {
                "total_energy_joules": self.total_energy_joules,
                "total_lambda_mass_kg": self.total_lambda_mass_kg,
                "total_sdk_fees_nxt": total_sdk_fees,
                "substrate_transactions": len(self.substrate_transactions),
                "energy_formula": "E = h × f (Planck)",
                "lambda_formula": "Λ = hf/c² (Lambda Boson)"
            }
        }
    
    def get_pricing(self) -> dict:
        """Get current messaging pricing"""
        return {
            "encrypted_message": {
                "units": token_system.MESSAGE_BURN_RATE,
                "nxt": token_system.units_to_nxt(token_system.MESSAGE_BURN_RATE),
                "formatted": token_system.format_balance(token_system.MESSAGE_BURN_RATE)
            },
            "link_share": {
                "units": token_system.LINK_SHARE_BURN_RATE,
                "nxt": token_system.units_to_nxt(token_system.LINK_SHARE_BURN_RATE),
                "formatted": token_system.format_balance(token_system.LINK_SHARE_BURN_RATE)
            },
            "video_share": {
                "units": token_system.VIDEO_SHARE_BURN_RATE,
                "nxt": token_system.units_to_nxt(token_system.VIDEO_SHARE_BURN_RATE),
                "formatted": token_system.format_balance(token_system.VIDEO_SHARE_BURN_RATE)
            }
        }


# Global messaging payment system
messaging_payment = MessagingPaymentSystem()
