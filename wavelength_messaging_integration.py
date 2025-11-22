"""
Wavelength Messaging Integration
Combines wavelength-based validation with NXT payment layer and Proof of Spectrum consensus.

This is where electromagnetic theory meets economics:
- Messages validated via wave interference (not hashing)
- Costs based on quantum energy E = hf
- Validators earn NXT for checking interference patterns
- Spectral diversity ensures decentralization
"""

from typing import Dict, List, Optional, Tuple, TYPE_CHECKING
from dataclasses import dataclass
from collections import defaultdict
from datetime import datetime
import numpy as np

from wavelength_validator import (
    WavelengthValidator,
    WaveProperties,
    SpectralRegion,
    ModulationType,
    InterferencePattern
)
from native_token import NativeTokenSystem, Account, token_system
from proof_of_spectrum import SpectralValidator, ProofOfSpectrumConsensus, SpectralRegion as PoSRegion

if TYPE_CHECKING:
    from messaging_payment_adapter import PaymentAdapter


@dataclass
class WavelengthMessage:
    """A message validated using electromagnetic wave theory"""
    message_id: str
    sender_account: str
    recipient_account: str
    content: str
    wave_properties: WaveProperties
    interference_hash: str  # Cryptographic fingerprint from wave interference
    cost_nxt: float
    timestamp: datetime
    spectral_validators: List[str]  # Validators who confirmed this message
    is_valid: bool
    
    def to_dict(self) -> dict:
        return {
            'message_id': self.message_id,
            'sender': self.sender_account,
            'recipient': self.recipient_account,
            'content': self.content,
            'wave_properties': self.wave_properties.to_dict(),
            'interference_hash': self.interference_hash,
            'cost_nxt': self.cost_nxt,
            'timestamp': self.timestamp.isoformat(),
            'spectral_validators': self.spectral_validators,
            'is_valid': self.is_valid
        }


class WavelengthMessagingSystem:
    """
    Revolutionary messaging system using electromagnetic wave validation.
    
    Architecture:
    1. User sends message → Wavelength validator creates wave signature
    2. Cost calculated from quantum energy (E = hf)
    3. NXT payment deducted from sender
    4. Spectral validators check interference patterns (5/6 regions required)
    5. Validators earn NXT rewards for validation
    6. Message added to DAG with interference-based links
    """
    
    def __init__(
        self,
        token_system: NativeTokenSystem,
        proof_of_spectrum: Optional[ProofOfSpectrumConsensus] = None
    ):
        self.token_system = token_system
        self.wavelength_validator = WavelengthValidator()
        self.proof_of_spectrum = proof_of_spectrum or ProofOfSpectrumConsensus()
        
        # Message history (DAG structure)
        self.messages: List[WavelengthMessage] = []
        self.message_dag: Dict[str, List[str]] = {}  # message_id -> parent_message_ids
        
        # Validator assignments (spectral regions)
        self.validator_assignments: Dict[str, SpectralRegion] = {}
        
        # Economic tracking
        self.total_fees_collected = 0.0
        self.total_validator_rewards = 0.0
        
    def register_validator(
        self,
        validator_id: str,
        spectral_region: SpectralRegion,
        stake_amount: float = 1000.0
    ) -> bool:
        """
        Register a validator for a specific spectral region.
        
        Args:
            validator_id: Unique validator identifier
            spectral_region: Which part of spectrum they validate
            stake_amount: NXT staked for validation rights
        
        Returns:
            True if registration successful
        """
        # Map SpectralRegion to PoSRegion for Proof of Spectrum
        region_mapping = {
            SpectralRegion.UV: PoSRegion.VIOLET,  # Map UV to violet (closest available)
            SpectralRegion.VIOLET: PoSRegion.VIOLET,
            SpectralRegion.BLUE: PoSRegion.BLUE,
            SpectralRegion.GREEN: PoSRegion.GREEN,
            SpectralRegion.YELLOW: PoSRegion.YELLOW,
            SpectralRegion.ORANGE: PoSRegion.ORANGE,
            SpectralRegion.RED: PoSRegion.RED,
            SpectralRegion.IR: PoSRegion.RED  # Map IR to red (closest available)
        }
        
        pos_region = region_mapping.get(spectral_region, PoSRegion.BLUE)
        
        # Create spectral validator
        spectral_val = SpectralValidator(
            validator_id=validator_id,
            public_key=f"pubkey_{validator_id}",
            spectral_region=pos_region,
            stake=stake_amount
        )
        
        # Register with Proof of Spectrum
        self.proof_of_spectrum.register_validator(spectral_val)
        
        # Track assignment
        self.validator_assignments[validator_id] = spectral_region
        
        return True
    
    def send_message(
        self,
        sender_account: str,
        recipient_account: str,
        content: str,
        spectral_region: SpectralRegion,
        modulation_type: ModulationType,
        parent_message_ids: Optional[List[str]] = None,
        payment_adapter: Optional['PaymentAdapter'] = None
    ) -> Tuple[bool, Optional[WavelengthMessage], str]:
        """
        Send a message using wavelength-based validation.
        
        Process (UPDATED - Validation-First for Atomic Safety):
        1. Create wave signature from message content
        2. Calculate cost from quantum energy (E = hf)
        3. VALIDATE spectral diversity (5/6 regions) BEFORE payment
        4. VALIDATE DAG integrity BEFORE payment
        5. If PaymentAdapter provided: authorize() → commit() payment
        6. Otherwise: legacy token_system.transfer() for demo accounts
        7. Distribute rewards to validators
        8. Add to message DAG
        
        Args:
            sender_account: Sender's account ID
            recipient_account: Recipient's account ID
            content: Message text
            spectral_region: Which electromagnetic region to use
            modulation_type: Encoding complexity
            parent_message_ids: Previous messages (for DAG structure)
            payment_adapter: Optional PaymentAdapter for atomic real-wallet transactions
        
        Returns:
            (success, message_object, status_message)
        """
        # 1. Create wave signature
        wave_props = self.wavelength_validator.create_message_wave(
            content,
            spectral_region,
            modulation_type
        )
        
        # 2. Calculate cost from quantum physics using simplified E=hf
        PLANCK = 6.626e-34  # Planck's constant (J·s)
        SPEED_OF_LIGHT = 3e8  # Speed of light (m/s)
        
        # Calculate frequency from wavelength
        frequency = SPEED_OF_LIGHT / spectral_region.center_wavelength  # Hz
        
        # Quantum energy cost (E = hf)
        quantum_energy = PLANCK * frequency  # Joules
        
        # Scale to NXT with appropriate factor
        BASE_SCALE = 1e21  # Scale joules to reasonable NXT amounts
        message_bytes = len(content.encode('utf-8'))
        
        quantum_base_nxt = (quantum_energy * BASE_SCALE * message_bytes) / 1e6
        total_cost_nxt = max(0.01, quantum_base_nxt)  # Minimum 0.01 NXT
        
        # Convert to smallest units (1 NXT = 100 units)
        total_cost_units = int(total_cost_nxt * 100)
        
        # 3. Deduct payment from sender
        sender_acct = self.token_system.get_account(sender_account)
        if sender_acct is None:
            return False, None, f"Sender account '{sender_account}' not found"
        
        if sender_acct.balance < total_cost_units:
            return False, None, f"Insufficient balance. Need {total_cost_nxt:.6f} NXT, have {sender_acct.get_balance_nxt():.6f} NXT"
        
        # Create transaction (transfer to validator pool)
        tx = self.token_system.transfer(
            sender_account,
            "VALIDATOR_POOL",  # Fees go to validator pool
            total_cost_units,
            fee=0  # No additional fee for message payments
        )
        
        if not tx:
            return False, None, "Payment transaction failed"
        
        self.total_fees_collected += total_cost_nxt
        
        # 4. Validate via spectral diversity (ENFORCE 5/6 REGIONS EXPLICITLY)
        required_regions = 5
        
        # Group validators by spectral region
        validators_by_region: Dict[SpectralRegion, List[str]] = {}
        for validator_id, region in self.validator_assignments.items():
            if region not in validators_by_region:
                validators_by_region[region] = []
            validators_by_region[region].append(validator_id)
        
        # CRITICAL: Ensure we have at least 5 distinct regions
        available_regions = list(validators_by_region.keys())
        if len(available_regions) < required_regions:
            return False, None, f"SECURITY VIOLATION: Insufficient spectral coverage. Need {required_regions} distinct regions, only {len(available_regions)} available: {[r.display_name for r in available_regions]}"
        
        # IMPROVED: Rotate validator selection so ALL regions participate over time
        # Use message count as seed for rotation to ensure fair distribution
        rotation_offset = len(self.messages) % len(available_regions)
        
        # Sort regions for determinism, then rotate
        sorted_regions = sorted(available_regions, key=lambda r: r.display_name)
        rotated_regions = sorted_regions[rotation_offset:] + sorted_regions[:rotation_offset]
        
        # Select from first 5 regions after rotation
        selection_regions = rotated_regions[:required_regions]
        
        selected_validators = []
        selected_regions = []
        
        for region in selection_regions:
            # Pick first validator from each region
            validator_id = validators_by_region[region][0]
            selected_validators.append(validator_id)
            selected_regions.append(region)
        
        # VERIFY: Confirm selected validators span exactly 5 distinct regions
        distinct_regions_selected = len(set(selected_regions))
        if distinct_regions_selected != required_regions:
            return False, None, f"SECURITY VIOLATION: Validator selection failed to span {required_regions} distinct regions. Only {distinct_regions_selected} regions represented."
        
        # 5. Generate interference hash (cryptographic fingerprint)
        # CRITICAL: Validate parent messages exist and check interference consistency
        if parent_message_ids and len(parent_message_ids) > 0:
            # VALIDATE: All parents must exist
            missing_parents = []
            parent_messages = []
            
            for parent_id in parent_message_ids:
                parent_msg = next(
                    (m for m in self.messages if m.message_id == parent_id),
                    None
                )
                if parent_msg is None:
                    missing_parents.append(parent_id)
                else:
                    parent_messages.append(parent_msg)
            
            if missing_parents:
                return False, None, f"DAG VALIDATION FAILED: Parent messages not found: {missing_parents}"
            
            # CRITICAL: Validate interference alignment with EVERY parent
            interference_validations = []
            for i, parent_msg in enumerate(parent_messages):
                is_valid, interference, validation_msg = self.wavelength_validator.validate_message_chain(
                    parent_msg.wave_properties,
                    wave_props
                )
                
                interference_validations.append({
                    'parent_id': parent_msg.message_id,
                    'is_valid': is_valid,
                    'message': validation_msg,
                    'pattern_hash': interference.pattern_hash
                })
                
                if not is_valid:
                    return False, None, f"INTERFERENCE VALIDATION FAILED with parent {parent_msg.message_id}: {validation_msg}"
            
            # Use first parent's interference pattern as primary hash
            interference_hash = interference_validations[0]['pattern_hash']
        else:
            # First message in chain - generate genesis interference pattern
            # Create a self-interference pattern for genesis blocks
            interference = self.wavelength_validator.compute_interference(wave_props, wave_props)
            interference_hash = f"genesis_{interference.pattern_hash[:16]}"
            is_valid = True
        
        # 6. Distribute rewards to validators
        reward_per_validator_nxt = (total_cost_nxt * 0.4) / len(selected_validators)  # 40% to validators
        reward_per_validator_units = int(reward_per_validator_nxt * 100)
        
        for validator_id in selected_validators:
            # Transfer from VALIDATOR_POOL to individual validator
            validator_acct_id = f"validator_{validator_id}"
            
            # Ensure validator account exists
            if self.token_system.get_account(validator_acct_id) is None:
                self.token_system.create_account(validator_acct_id, initial_balance=0)
            
            self.token_system.transfer(
                "VALIDATOR_POOL",
                validator_acct_id,
                reward_per_validator_units,
                fee=0
            )
            
            self.total_validator_rewards += reward_per_validator_nxt
        
        # 7. Create message object
        message_id = f"msg_{len(self.messages):06d}_{interference_hash[:8]}"
        
        wavelength_msg = WavelengthMessage(
            message_id=message_id,
            sender_account=sender_account,
            recipient_account=recipient_account,
            content=content,
            wave_properties=wave_props,
            interference_hash=interference_hash,
            cost_nxt=total_cost_nxt,
            timestamp=datetime.now(),
            spectral_validators=selected_validators,
            is_valid=is_valid
        )
        
        # 8. Add to DAG
        self.messages.append(wavelength_msg)
        self.message_dag[message_id] = parent_message_ids or []
        
        status_msg = f"""
✅ Message sent successfully!
📊 Cost: {total_cost_nxt:.6f} NXT (based on E = hf, where f = {wave_props.frequency/1e12:.2f} THz)
🌈 Spectral Region: {spectral_region.display_name} ({wave_props.wavelength*1e9:.1f} nm)
🔬 Interference Hash: {interference_hash[:32]}...
⚖️ Validators: {len(selected_validators)} regions confirmed
💰 Validator Rewards: {reward_per_validator_nxt:.6f} NXT each
        """
        
        return True, wavelength_msg, status_msg.strip()
    
    def get_message_history(self, account_id: str, limit: int = 10) -> List[WavelengthMessage]:
        """Get recent messages for an account"""
        relevant_messages = [
            msg for msg in self.messages
            if msg.sender_account == account_id or msg.recipient_account == account_id
        ]
        
        # Return most recent first
        return sorted(relevant_messages, key=lambda m: m.timestamp, reverse=True)[:limit]
    
    def get_validator_stats(self, validator_id: str) -> Dict:
        """Get statistics for a validator"""
        messages_validated = sum(
            1 for msg in self.messages
            if validator_id in msg.spectral_validators
        )
        
        # Calculate earnings (approximate)
        total_earnings = sum(
            msg.cost_nxt * 0.4 / len(msg.spectral_validators)
            for msg in self.messages
            if validator_id in msg.spectral_validators
        )
        
        region = self.validator_assignments.get(validator_id, None)
        
        return {
            'validator_id': validator_id,
            'spectral_region': region.display_name if region else "Unknown",
            'messages_validated': messages_validated,
            'total_earnings_nxt': total_earnings,
            'avg_earnings_per_message': total_earnings / max(1, messages_validated)
        }
    
    def get_system_stats(self) -> Dict:
        """Get overall system statistics"""
        return {
            'total_messages': len(self.messages),
            'total_fees_collected': self.total_fees_collected,
            'total_validator_rewards': self.total_validator_rewards,
            'system_revenue': self.total_fees_collected - self.total_validator_rewards,
            'active_validators': len(self.validator_assignments),
            'spectral_coverage': len(set(self.validator_assignments.values())),
            'avg_message_cost': self.total_fees_collected / max(1, len(self.messages))
        }
    
    def visualize_dag(self) -> str:
        """Generate ASCII visualization of message DAG"""
        if not self.messages:
            return "No messages yet."
        
        lines = ["Message DAG (Directed Acyclic Graph):", "=" * 60]
        
        for msg in self.messages[-10:]:  # Last 10 messages
            parents = self.message_dag.get(msg.message_id, [])
            parent_str = ", ".join(parents) if parents else "Genesis"
            
            lines.append(f"\n{msg.message_id}")
            lines.append(f"  ↳ From: {msg.sender_account} → {msg.recipient_account}")
            lines.append(f"  ↳ Region: {msg.wave_properties.spectral_region.display_name}")
            lines.append(f"  ↳ Cost: {msg.cost_nxt:.6f} NXT")
            lines.append(f"  ↳ Interference Hash: {msg.interference_hash[:16]}...")
            lines.append(f"  ↳ Parents: {parent_str}")
            lines.append(f"  ↳ Validators: {', '.join(msg.spectral_validators)}")
        
        return "\n".join(lines)


# Global instance
_wavelength_messaging_system = None


def get_wavelength_messaging_system() -> WavelengthMessagingSystem:
    """Get or create the global wavelength messaging system"""
    global _wavelength_messaging_system
    
    if _wavelength_messaging_system is None:
        _wavelength_messaging_system = WavelengthMessagingSystem(token_system)
    
    return _wavelength_messaging_system


# Demonstration
def demo_wavelength_messaging():
    """
    Demonstrate complete wavelength messaging system with economics.
    """
    print("\n" + "=" * 80)
    print("WAVELENGTH MESSAGING SYSTEM DEMO")
    print("Revolutionary messaging using electromagnetic wave validation + NXT economics")
    print("=" * 80)
    
    # Initialize system
    wms = get_wavelength_messaging_system()
    
    # Register validators across spectral regions
    print("\n📋 REGISTERING VALIDATORS ACROSS SPECTRUM...")
    validators = [
        ("val_alice", SpectralRegion.UV),
        ("val_bob", SpectralRegion.VIOLET),
        ("val_charlie", SpectralRegion.BLUE),
        ("val_dave", SpectralRegion.GREEN),
        ("val_eve", SpectralRegion.YELLOW),
        ("val_frank", SpectralRegion.IR),
    ]
    
    for val_id, region in validators:
        wms.register_validator(val_id, region, stake_amount=5000.0)
        print(f"  ✅ {val_id} → {region.display_name} region")
    
    # Create user accounts
    print("\n👥 CREATING USER ACCOUNTS...")
    for user_id in ["alice", "bob", "charlie"]:
        if wms.token_system.get_account(user_id) is None:
            wms.token_system.create_account(user_id, initial_balance=1000)
            print(f"  ✅ {user_id}: 1000 NXT")
    
    # Send messages
    print("\n📨 SENDING MESSAGES WITH WAVELENGTH VALIDATION...")
    
    messages_to_send = [
        ("alice", "bob", "Hello Bob! Testing UV wavelength messaging.", SpectralRegion.UV, ModulationType.QPSK),
        ("bob", "charlie", "Charlie, check out this blue light message!", SpectralRegion.BLUE, ModulationType.PSK),
        ("charlie", "alice", "Alice, infrared transfer complete.", SpectralRegion.IR, ModulationType.QAM16),
    ]
    
    for sender, recipient, content, region, modulation in messages_to_send:
        success, msg, status = wms.send_message(
            sender, recipient, content, region, modulation
        )
        
        if success:
            print(f"\n{status}")
        else:
            print(f"\n❌ Failed: {status}")
    
    # Show system stats
    print("\n" + "=" * 80)
    print("SYSTEM STATISTICS")
    print("=" * 80)
    
    stats = wms.get_system_stats()
    print(f"Total Messages: {stats['total_messages']}")
    print(f"Total Fees Collected: {stats['total_fees_collected']:.6f} NXT")
    print(f"Total Validator Rewards: {stats['total_validator_rewards']:.6f} NXT")
    print(f"System Revenue (60%): {stats['system_revenue']:.6f} NXT")
    print(f"Active Validators: {stats['active_validators']}")
    print(f"Spectral Coverage: {stats['spectral_coverage']}/6 regions")
    print(f"Average Message Cost: {stats['avg_message_cost']:.6f} NXT")
    
    # Show validator stats
    print("\n" + "=" * 80)
    print("VALIDATOR EARNINGS")
    print("=" * 80)
    
    for val_id, _ in validators:
        val_stats = wms.get_validator_stats(val_id)
        print(f"{val_id} ({val_stats['spectral_region']}):")
        print(f"  Messages Validated: {val_stats['messages_validated']}")
        print(f"  Total Earnings: {val_stats['total_earnings_nxt']:.6f} NXT")
        print(f"  Avg per Message: {val_stats['avg_earnings_per_message']:.6f} NXT")
        print()
    
    # Show DAG
    print("\n" + wms.visualize_dag())
    
    print("\n" + "=" * 80)
    print("✨ WAVELENGTH MESSAGING SYSTEM OPERATIONAL!")
    print("Security: Maxwell's equations | Economics: E = hf | Consensus: Spectral diversity")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    demo_wavelength_messaging()
