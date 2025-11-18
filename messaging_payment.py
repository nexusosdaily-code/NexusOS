"""
Messaging Payment Layer - Integrating Native Token with Wavelength Cryptography

Enables payment-based secure messaging:
- Pay NXT to send encrypted messages
- Pay NXT to share links
- Pay NXT to share videos
- Burn mechanics create deflationary loop
- Validators earn from transaction fees
"""

from dataclasses import dataclass, field
from typing import Optional, List
from enum import Enum
import time
from native_token import token_system, TokenTransaction, TransactionType


class MessageType(Enum):
    """Types of paid messages"""
    ENCRYPTED_TEXT = "encrypted_text"
    LINK_SHARE = "link_share"
    VIDEO_SHARE = "video_share"
    FILE_SHARE = "file_share"


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
    Payment layer for secure messaging system
    
    Economic Loop:
    1. Users pay NXT to send messages/content
    2. Tokens are burned (deflationary)
    3. Validators earn transaction fees
    4. Reduced supply increases token value
    5. Messaging activity drives token demand
    """
    
    def __init__(self):
        self.paid_messages: List[PaidMessage] = []
        self.message_counter: int = 0
    
    def send_encrypted_message(
        self,
        from_address: str,
        to_address: str,
        encrypted_content: str
    ) -> Optional[PaidMessage]:
        """
        Send encrypted message with payment
        
        Args:
            from_address: Sender's token address
            to_address: Recipient's address
            encrypted_content: Wavelength-encrypted message content
        
        Returns:
            PaidMessage if successful, None if insufficient balance
        """
        # Check balance
        from_account = token_system.get_account(from_address)
        if not from_account:
            return None
        
        cost = token_system.MESSAGE_BURN_RATE
        if not from_account.has_sufficient_balance(cost):
            return None
        
        # Process payment (burn tokens)
        payment_tx = token_system.pay_for_message(from_address)
        if not payment_tx:
            return None
        
        # Create paid message
        message = PaidMessage(
            message_id=f"MSG{self.message_counter:08d}",
            from_address=from_address,
            to_address=to_address,
            message_type=MessageType.ENCRYPTED_TEXT,
            payment_tx=payment_tx,
            encrypted_content=encrypted_content
        )
        
        self.message_counter += 1
        self.paid_messages.append(message)
        
        return message
    
    def share_link(
        self,
        from_address: str,
        to_address: str,
        link_url: str,
        note: str = ""
    ) -> Optional[PaidMessage]:
        """
        Share link with payment
        
        Args:
            from_address: Sender's token address
            to_address: Recipient's address
            link_url: URL to share
            note: Optional note
        
        Returns:
            PaidMessage if successful, None if insufficient balance
        """
        # Check balance
        from_account = token_system.get_account(from_address)
        if not from_account:
            return None
        
        cost = token_system.LINK_SHARE_BURN_RATE
        if not from_account.has_sufficient_balance(cost):
            return None
        
        # Process payment (burn tokens)
        payment_tx = token_system.pay_for_link_share(from_address)
        if not payment_tx:
            return None
        
        # Create paid message
        content = f"{link_url}|||{note}" if note else link_url
        message = PaidMessage(
            message_id=f"LINK{self.message_counter:08d}",
            from_address=from_address,
            to_address=to_address,
            message_type=MessageType.LINK_SHARE,
            payment_tx=payment_tx,
            encrypted_content=content
        )
        
        self.message_counter += 1
        self.paid_messages.append(message)
        
        return message
    
    def share_video(
        self,
        from_address: str,
        to_address: str,
        video_url: str,
        note: str = ""
    ) -> Optional[PaidMessage]:
        """
        Share video with payment
        
        Args:
            from_address: Sender's token address
            to_address: Recipient's address
            video_url: Video URL to share
            note: Optional note
        
        Returns:
            PaidMessage if successful, None if insufficient balance
        """
        # Check balance
        from_account = token_system.get_account(from_address)
        if not from_account:
            return None
        
        cost = token_system.VIDEO_SHARE_BURN_RATE
        if not from_account.has_sufficient_balance(cost):
            return None
        
        # Process payment (burn tokens)
        payment_tx = token_system.pay_for_video_share(from_address)
        if not payment_tx:
            return None
        
        # Create paid message
        content = f"{video_url}|||{note}" if note else video_url
        message = PaidMessage(
            message_id=f"VID{self.message_counter:08d}",
            from_address=from_address,
            to_address=to_address,
            message_type=MessageType.VIDEO_SHARE,
            payment_tx=payment_tx,
            encrypted_content=content
        )
        
        self.message_counter += 1
        self.paid_messages.append(message)
        
        return message
    
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
        """Get messaging statistics"""
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
        
        return {
            "total_messages": total_messages,
            "encrypted_messages": messages_by_type.get(MessageType.ENCRYPTED_TEXT, 0),
            "link_shares": messages_by_type.get(MessageType.LINK_SHARE, 0),
            "video_shares": messages_by_type.get(MessageType.VIDEO_SHARE, 0),
            "total_burned_units": total_burned,
            "total_burned_nxt": token_system.units_to_nxt(total_burned),
            "avg_cost_per_message": total_burned / total_messages if total_messages > 0 else 0,
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
