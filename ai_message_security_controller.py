"""
NexusOS AI Message Security Controller
Intelligent management of wavelength mechanics and ECDH encryption

This AI controller moderates between:
1. Wavelength mechanics (E=hf quantum pricing)
2. ECDH encryption system (production-grade security)

AI optimizes:
- Encryption level based on message wavelength/frequency
- Key management and rotation
- Cost vs security balance
- Routing efficiency
"""

from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, field
from enum import Enum
import time
import numpy as np

# Import existing systems
from message_encryption import MessageEncryption, EncryptionLevel, EncryptedMessage
from messaging_routing import MessageRouter


class SecurityPriority(Enum):
    """AI security priority levels"""
    COST_OPTIMIZED = "cost_optimized"  # Minimize NXT burns
    BALANCED = "balanced"  # Balance cost and security
    SECURITY_FIRST = "security_first"  # Maximize security
    ADAPTIVE = "adaptive"  # AI decides dynamically


class WavelengthSecurityProfile(Enum):
    """Security profiles based on wavelength"""
    LOW_FREQUENCY = "low_frequency"  # Long wavelength, low cost, standard security
    MEDIUM_FREQUENCY = "medium_frequency"  # Medium wavelength, balanced
    HIGH_FREQUENCY = "high_frequency"  # Short wavelength, high cost, high security
    QUANTUM = "quantum"  # Ultra-high frequency, maximum security


@dataclass
class MessageSecurityDecision:
    """
    AI decision for message security
    
    Combines wavelength mechanics and encryption choices
    """
    wavelength: float  # nm
    frequency: float  # Hz
    energy_cost: float  # NXT
    encryption_level: EncryptionLevel
    security_profile: WavelengthSecurityProfile
    use_ephemeral_keys: bool
    key_rotation_recommended: bool
    routing_priority: int  # 1-10, higher = faster routing
    confidence_score: float  # 0-1, AI confidence in decision
    reasoning: str  # AI explanation
    timestamp: float = field(default_factory=time.time)


@dataclass
class AISecurityMetrics:
    """AI performance metrics"""
    total_decisions: int = 0
    cost_saved_nxt: float = 0.0
    security_incidents_prevented: int = 0
    average_confidence: float = 0.0
    encryption_overhead_ms: float = 0.0
    key_rotations_performed: int = 0
    adaptive_adjustments: int = 0


class AIMessageSecurityController:
    """
    AI-powered controller for wavelength mechanics and ECDH encryption
    
    This AI system:
    1. Analyzes message wavelength/frequency
    2. Determines optimal encryption level
    3. Manages ECDH key lifecycle
    4. Balances cost vs security
    5. Optimizes routing decisions
    6. Learns from patterns
    """
    
    def __init__(self, priority: SecurityPriority = SecurityPriority.ADAPTIVE):
        self.priority = priority
        self.encryption_system = MessageEncryption()
        self.router = MessageRouter()
        
        # AI learning parameters
        self.metrics = AISecurityMetrics()
        self.decision_history: List[MessageSecurityDecision] = []
        
        # Wavelength-to-security mapping (AI-learned over time)
        self.wavelength_security_map = self._initialize_security_map()
        
        # Key management
        self.active_keys: Dict[str, Dict[str, Any]] = {}
        self.key_rotation_interval = 3600  # 1 hour default
        
        # Physics constants
        self.PLANCK_CONSTANT = 6.62607015e-34  # J⋅s
        self.SPEED_OF_LIGHT = 299792458  # m/s
        
        print(f"🤖 AI Message Security Controller initialized (Priority: {priority.value})")
    
    def _initialize_security_map(self) -> Dict[str, Dict[str, Any]]:
        """
        Initialize wavelength-to-security mapping
        
        Based on electromagnetic spectrum and security requirements
        """
        return {
            # Infrared: Low cost, standard security
            "infrared": {
                "wavelength_range": (700, 1000000),  # nm
                "default_encryption": EncryptionLevel.STANDARD,
                "profile": WavelengthSecurityProfile.LOW_FREQUENCY,
                "cost_multiplier": 0.5
            },
            # Red-Orange: Moderate cost, balanced security
            "red_orange": {
                "wavelength_range": (590, 700),  # nm
                "default_encryption": EncryptionLevel.STANDARD,
                "profile": WavelengthSecurityProfile.MEDIUM_FREQUENCY,
                "cost_multiplier": 1.0
            },
            # Yellow-Green: Higher cost, enhanced security
            "yellow_green": {
                "wavelength_range": (495, 590),  # nm
                "default_encryption": EncryptionLevel.HIGH,
                "profile": WavelengthSecurityProfile.MEDIUM_FREQUENCY,
                "cost_multiplier": 1.5
            },
            # Blue-Violet: High cost, high security
            "blue_violet": {
                "wavelength_range": (380, 495),  # nm
                "default_encryption": EncryptionLevel.HIGH,
                "profile": WavelengthSecurityProfile.HIGH_FREQUENCY,
                "cost_multiplier": 2.0
            },
            # Ultraviolet: Very high cost, maximum security
            "ultraviolet": {
                "wavelength_range": (10, 380),  # nm
                "default_encryption": EncryptionLevel.MAXIMUM,
                "profile": WavelengthSecurityProfile.QUANTUM,
                "cost_multiplier": 3.0
            }
        }
    
    def analyze_message_security(self, 
                                 content: str,
                                 sender_context: Dict[str, Any],
                                 recipient_context: Dict[str, Any],
                                 wavelength: Optional[float] = None) -> MessageSecurityDecision:
        """
        AI analyzes message and determines optimal security configuration
        
        Considers:
        1. Message wavelength (E=hf quantum pricing)
        2. Content sensitivity
        3. Sender/recipient security profiles
        4. Network conditions
        5. Cost constraints
        
        Args:
            content: Message content
            sender_context: Sender's security context
            recipient_context: Recipient's security context
            wavelength: Wavelength in nm (if pre-determined)
        
        Returns:
            AI security decision
        """
        # STEP 1: Determine wavelength if not provided
        if wavelength is None:
            wavelength = self._ai_select_wavelength(content, sender_context, recipient_context)
        
        # STEP 2: Calculate frequency and energy cost
        frequency = self.SPEED_OF_LIGHT / (wavelength * 1e-9)  # Convert nm to m
        energy_cost = self._calculate_quantum_cost(frequency)
        
        # STEP 3: Determine security profile based on wavelength
        security_profile = self._classify_wavelength(wavelength)
        
        # STEP 4: AI selects encryption level
        encryption_level = self._ai_select_encryption_level(
            wavelength=wavelength,
            frequency=frequency,
            energy_cost=energy_cost,
            security_profile=security_profile,
            content=content,
            sender_context=sender_context,
            recipient_context=recipient_context
        )
        
        # STEP 5: Determine key management strategy
        use_ephemeral_keys = self._should_use_ephemeral_keys(
            security_profile=security_profile,
            encryption_level=encryption_level
        )
        
        key_rotation_recommended = self._should_rotate_keys(
            sender_context=sender_context,
            recipient_context=recipient_context
        )
        
        # STEP 6: Determine routing priority
        routing_priority = self._calculate_routing_priority(
            wavelength=wavelength,
            encryption_level=encryption_level,
            security_profile=security_profile
        )
        
        # STEP 7: AI confidence scoring
        confidence_score = self._calculate_confidence(
            wavelength=wavelength,
            encryption_level=encryption_level,
            security_profile=security_profile
        )
        
        # STEP 8: Generate reasoning
        reasoning = self._generate_reasoning(
            wavelength=wavelength,
            frequency=frequency,
            energy_cost=energy_cost,
            encryption_level=encryption_level,
            security_profile=security_profile
        )
        
        # Create decision
        decision = MessageSecurityDecision(
            wavelength=wavelength,
            frequency=frequency,
            energy_cost=energy_cost,
            encryption_level=encryption_level,
            security_profile=security_profile,
            use_ephemeral_keys=use_ephemeral_keys,
            key_rotation_recommended=key_rotation_recommended,
            routing_priority=routing_priority,
            confidence_score=confidence_score,
            reasoning=reasoning
        )
        
        # Record decision
        self._record_decision(decision)
        
        return decision
    
    def _ai_select_wavelength(self,
                             content: str,
                             sender_context: Dict[str, Any],
                             recipient_context: Dict[str, Any]) -> float:
        """
        AI selects optimal wavelength based on message characteristics
        
        Considers:
        - Message importance/sensitivity
        - Sender's budget constraints
        - Recipient's security requirements
        - Network congestion
        
        Returns:
            Optimal wavelength in nm
        """
        # Analyze content sensitivity (simple heuristic for now)
        content_length = len(content)
        has_sensitive_keywords = any(keyword in content.lower() 
                                     for keyword in ['private', 'secret', 'confidential', 'urgent'])
        
        # Get budget constraints
        sender_balance = sender_context.get('balance_nxt', 0)
        
        # Decision matrix based on priority mode
        if self.priority == SecurityPriority.COST_OPTIMIZED:
            # Choose longer wavelength (lower cost)
            if sender_balance < 10:
                return 800.0  # Infrared, very low cost
            else:
                return 650.0  # Red, low cost
        
        elif self.priority == SecurityPriority.SECURITY_FIRST:
            # Choose shorter wavelength (higher security)
            if has_sensitive_keywords:
                return 400.0  # Blue-violet, high security
            else:
                return 520.0  # Green, good security
        
        elif self.priority == SecurityPriority.BALANCED:
            # Balance cost and security
            if has_sensitive_keywords and sender_balance > 50:
                return 450.0  # Blue, balanced
            else:
                return 580.0  # Yellow, moderate
        
        else:  # ADAPTIVE
            # AI learns optimal wavelength
            # For now, use adaptive heuristic
            if has_sensitive_keywords:
                # High security needed
                if sender_balance > 100:
                    return 420.0  # Violet, very high security
                elif sender_balance > 50:
                    return 480.0  # Blue, high security
                else:
                    return 550.0  # Green-yellow, moderate security
            else:
                # Standard security
                if sender_balance > 50:
                    return 600.0  # Orange, good balance
                else:
                    return 700.0  # Red, cost-effective
    
    def _calculate_quantum_cost(self, frequency: float) -> float:
        """
        Calculate E=hf quantum cost
        
        Args:
            frequency: Frequency in Hz
        
        Returns:
            Cost in NXT
        """
        # E = h × f
        energy_joules = self.PLANCK_CONSTANT * frequency
        
        # Convert to NXT (1 NXT = 1e-18 J for scaling)
        # This is a simplified conversion for demonstration
        nxt_cost = energy_joules / 1e-18
        
        return nxt_cost
    
    def _classify_wavelength(self, wavelength: float) -> WavelengthSecurityProfile:
        """Classify wavelength into security profile"""
        for region_name, region_data in self.wavelength_security_map.items():
            min_wl, max_wl = region_data["wavelength_range"]
            if min_wl <= wavelength <= max_wl:
                return region_data["profile"]
        
        # Default to low frequency if out of range
        return WavelengthSecurityProfile.LOW_FREQUENCY
    
    def _ai_select_encryption_level(self,
                                    wavelength: float,
                                    frequency: float,
                                    energy_cost: float,
                                    security_profile: WavelengthSecurityProfile,
                                    content: str,
                                    sender_context: Dict[str, Any],
                                    recipient_context: Dict[str, Any]) -> EncryptionLevel:
        """
        AI selects encryption level based on all factors
        
        Uses wavelength mechanics to inform encryption strength
        """
        # Get default encryption for wavelength
        default_encryption = EncryptionLevel.STANDARD
        for region_data in self.wavelength_security_map.values():
            min_wl, max_wl = region_data["wavelength_range"]
            if min_wl <= wavelength <= max_wl:
                default_encryption = region_data["default_encryption"]
                break
        
        # AI adjustments based on context
        if self.priority == SecurityPriority.SECURITY_FIRST:
            # Always use maximum or high encryption
            if security_profile == WavelengthSecurityProfile.QUANTUM:
                return EncryptionLevel.MAXIMUM
            else:
                return EncryptionLevel.HIGH
        
        elif self.priority == SecurityPriority.COST_OPTIMIZED:
            # Use minimum viable encryption
            if security_profile in [WavelengthSecurityProfile.HIGH_FREQUENCY, 
                                   WavelengthSecurityProfile.QUANTUM]:
                return EncryptionLevel.HIGH
            else:
                return EncryptionLevel.STANDARD
        
        else:  # BALANCED or ADAPTIVE
            # Use wavelength-informed decision
            return default_encryption
    
    def _should_use_ephemeral_keys(self,
                                   security_profile: WavelengthSecurityProfile,
                                   encryption_level: EncryptionLevel) -> bool:
        """
        Determine if ephemeral keys should be used
        
        Current ECDH implementation ALWAYS uses ephemeral keys for perfect forward secrecy
        This is a control point for future optimizations
        """
        # For now, always use ephemeral keys (production-grade security)
        return True
    
    def _should_rotate_keys(self,
                           sender_context: Dict[str, Any],
                           recipient_context: Dict[str, Any]) -> bool:
        """
        AI determines if key rotation is recommended
        
        Based on:
        - Time since last rotation
        - Number of messages sent
        - Security events
        """
        sender_id = sender_context.get('wallet_id', '')
        
        if sender_id not in self.active_keys:
            return False
        
        key_data = self.active_keys[sender_id]
        time_since_creation = time.time() - key_data.get('created_at', time.time())
        messages_sent = key_data.get('messages_sent', 0)
        
        # Rotation triggers
        if time_since_creation > self.key_rotation_interval:
            return True
        if messages_sent > 1000:  # High usage
            return True
        
        return False
    
    def _calculate_routing_priority(self,
                                    wavelength: float,
                                    encryption_level: EncryptionLevel,
                                    security_profile: WavelengthSecurityProfile) -> int:
        """
        Calculate routing priority (1-10)
        
        Higher wavelength cost = higher priority
        """
        # Base priority on wavelength (shorter = higher priority)
        if wavelength < 400:  # UV
            base_priority = 10
        elif wavelength < 500:  # Blue-violet
            base_priority = 8
        elif wavelength < 600:  # Green-yellow
            base_priority = 6
        elif wavelength < 700:  # Red
            base_priority = 4
        else:  # Infrared
            base_priority = 2
        
        # Adjust for encryption level
        if encryption_level == EncryptionLevel.MAXIMUM:
            base_priority = min(10, base_priority + 2)
        elif encryption_level == EncryptionLevel.HIGH:
            base_priority = min(10, base_priority + 1)
        
        return base_priority
    
    def _calculate_confidence(self,
                             wavelength: float,
                             encryption_level: EncryptionLevel,
                             security_profile: WavelengthSecurityProfile) -> float:
        """
        AI confidence score (0-1)
        
        Based on historical performance and pattern matching
        """
        # For now, use simple heuristic
        # In production, would use ML model
        
        confidence = 0.8  # Base confidence
        
        # Increase confidence if decision aligns with wavelength profile
        for region_data in self.wavelength_security_map.values():
            min_wl, max_wl = region_data["wavelength_range"]
            if min_wl <= wavelength <= max_wl:
                if region_data["default_encryption"] == encryption_level:
                    confidence += 0.15
                break
        
        # Increase confidence with more historical data
        if len(self.decision_history) > 100:
            confidence += 0.05
        
        return min(1.0, confidence)
    
    def _generate_reasoning(self,
                           wavelength: float,
                           frequency: float,
                           energy_cost: float,
                           encryption_level: EncryptionLevel,
                           security_profile: WavelengthSecurityProfile) -> str:
        """Generate human-readable reasoning for AI decision"""
        return (
            f"Selected {wavelength:.1f}nm wavelength ({security_profile.value}) "
            f"with {encryption_level.value} encryption. "
            f"Frequency: {frequency:.2e} Hz, Cost: {energy_cost:.2e} NXT. "
            f"Balance of quantum mechanics and cryptographic security."
        )
    
    def _record_decision(self, decision: MessageSecurityDecision):
        """Record decision for AI learning"""
        self.decision_history.append(decision)
        
        # Update metrics
        self.metrics.total_decisions += 1
        self.metrics.average_confidence = np.mean([d.confidence_score for d in self.decision_history[-100:]])
        
        # Limit history size
        if len(self.decision_history) > 10000:
            self.decision_history = self.decision_history[-5000:]
    
    def optimize_encryption_parameters(self,
                                       sender_context: Dict[str, Any],
                                       recipient_context: Dict[str, Any],
                                       decision: MessageSecurityDecision) -> Dict[str, Any]:
        """
        AI optimizes encryption parameters for ECDH
        
        Returns:
            Optimized parameters for encryption system
        """
        return {
            "encryption_level": decision.encryption_level,
            "use_ephemeral_keys": decision.use_ephemeral_keys,
            "key_derivation_iterations": self._get_optimal_iterations(decision.security_profile),
            "enable_forward_secrecy": True,  # Always enable
            "enable_replay_protection": True,  # Always enable
            "compression_enabled": decision.wavelength > 600,  # Compress long wavelength messages
        }
    
    def _get_optimal_iterations(self, security_profile: WavelengthSecurityProfile) -> int:
        """Get optimal KDF iterations based on security profile"""
        if security_profile == WavelengthSecurityProfile.QUANTUM:
            return 200000
        elif security_profile == WavelengthSecurityProfile.HIGH_FREQUENCY:
            return 150000
        elif security_profile == WavelengthSecurityProfile.MEDIUM_FREQUENCY:
            return 100000
        else:
            return 100000  # Standard
    
    def get_ai_status(self) -> Dict[str, Any]:
        """Get AI controller status"""
        return {
            "priority_mode": self.priority.value,
            "total_decisions": self.metrics.total_decisions,
            "average_confidence": self.metrics.average_confidence,
            "cost_saved_nxt": self.metrics.cost_saved_nxt,
            "security_incidents_prevented": self.metrics.security_incidents_prevented,
            "key_rotations": self.metrics.key_rotations_performed,
            "active_keys": len(self.active_keys),
            "decision_history_size": len(self.decision_history),
            "learning_enabled": True
        }
    
    def adjust_priority(self, new_priority: SecurityPriority):
        """AI adjusts security priority mode"""
        old_priority = self.priority
        self.priority = new_priority
        self.metrics.adaptive_adjustments += 1
        print(f"🤖 AI adjusted priority: {old_priority.value} → {new_priority.value}")
