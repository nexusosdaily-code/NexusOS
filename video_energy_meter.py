"""
NexusOS Video Energy Meter
===========================

Physics-based pricing for video/livestreaming using Lambda Boson substrate.

Video = photon streams at specific frequencies
- Frame rate × spectral bandwidth = oscillation frequency (f)
- Energy cost: E = hf × duration × quality_factor
- Lambda Boson: Λ = hf/c² (mass-equivalent of oscillation)

Integration with Economic Loop:
- Video sessions register as continuous energy consumption
- Costs flow through TransitionReserveLedger → DEX Liquidity → BHLS
- Unpaid sessions escrowed in BHLS buffer until wallet linked
"""

import time
from typing import Dict, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

PLANCK_CONSTANT = 6.62607015e-34
SPEED_OF_LIGHT = 299_792_458
JOULES_PER_NXT = 1e-18
SDK_WALLET = "NXS5372697543A0FEF822E453DBC26FA044D14599E9"


class VideoQuality(Enum):
    """Video quality tiers mapped to spectral frequencies"""
    AUDIO_ONLY = ("Audio Only", 16_000, 0.1)
    LOW_240P = ("240p", 240 * 320 * 15, 0.3)
    MEDIUM_480P = ("480p", 480 * 640 * 24, 0.5)
    HD_720P = ("720p", 720 * 1280 * 30, 0.7)
    FHD_1080P = ("1080p", 1080 * 1920 * 30, 1.0)
    UHD_4K = ("4K", 2160 * 3840 * 60, 2.5)
    
    def __init__(self, display_name: str, base_frequency: float, quality_factor: float):
        self.display_name = display_name
        self.base_frequency = base_frequency
        self.quality_factor = quality_factor


class StreamType(Enum):
    """Types of video streams with different energy profiles"""
    VIDEO_CALL = ("Video Call", 1.0, "P2P bidirectional")
    LIVESTREAM = ("Livestream", 1.5, "One-to-many broadcast")
    CONFERENCE = ("Conference", 2.0, "Multi-party mesh")
    SCREEN_SHARE = ("Screen Share", 0.8, "Lower frame rate")
    
    def __init__(self, display_name: str, multiplier: float, description: str):
        self.display_name = display_name
        self.multiplier = multiplier
        self.description = description


@dataclass
class VideoSessionCost:
    """Cost calculation for a video session"""
    session_id: str
    wallet_address: Optional[str]
    stream_type: StreamType
    quality: VideoQuality
    duration_seconds: float
    frequency_hz: float
    energy_joules: float
    energy_nxt: float
    lambda_boson_kg: float
    sdk_fee_nxt: float
    timestamp: datetime = field(default_factory=datetime.now)
    is_escrowed: bool = False
    
    def to_dict(self) -> Dict:
        return {
            'session_id': self.session_id,
            'wallet_address': self.wallet_address,
            'stream_type': self.stream_type.display_name,
            'quality': self.quality.display_name,
            'duration_seconds': self.duration_seconds,
            'frequency_hz': self.frequency_hz,
            'energy_joules': self.energy_joules,
            'energy_nxt': self.energy_nxt,
            'lambda_boson_kg': self.lambda_boson_kg,
            'sdk_fee_nxt': self.sdk_fee_nxt,
            'is_escrowed': self.is_escrowed,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class VideoEscrowEntry:
    """Escrowed video charges when wallet not linked"""
    escrow_id: str
    session_id: str
    user_identity: str
    energy_nxt: float
    sdk_fee_nxt: float
    created_at: datetime
    resolved: bool = False
    resolved_wallet: Optional[str] = None
    resolved_at: Optional[datetime] = None


class VideoEnergyMeter:
    """
    Physics-based energy metering for video streams.
    
    Calculates costs using E = hf formula where:
    - h = Planck constant (6.626×10⁻³⁴ J·s)
    - f = effective frequency (frame_rate × resolution × quality_factor)
    
    Lambda Boson mass-equivalent: Λ = hf/c²
    """
    
    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
        self.completed_sessions: list = []
        self.escrow_pool: Dict[str, VideoEscrowEntry] = {}
        self.total_energy_consumed_joules = 0.0
        self.total_energy_consumed_nxt = 0.0
        self.sdk_fees_collected_nxt = 0.0
        
        self.SDK_FEE_PERCENT = 0.02
        self.BHLS_MONTHLY_ALLOWANCE_NXT = 1150
        self.BHLS_VIDEO_ALLOCATION = 0.10
        self.bhls_video_budget_nxt = self.BHLS_MONTHLY_ALLOWANCE_NXT * self.BHLS_VIDEO_ALLOCATION
    
    def calculate_frequency(
        self,
        quality: VideoQuality,
        stream_type: StreamType
    ) -> float:
        """
        Calculate effective oscillation frequency for video stream.
        
        f_effective = base_frequency × quality_factor × stream_multiplier
        
        Returns frequency in Hz.
        """
        return quality.base_frequency * quality.quality_factor * stream_type.multiplier
    
    def calculate_energy_cost(
        self,
        quality: VideoQuality,
        stream_type: StreamType,
        duration_seconds: float
    ) -> Tuple[float, float, float]:
        """
        Calculate energy cost using E = hf × duration.
        
        Returns:
            Tuple of (energy_joules, energy_nxt, lambda_boson_kg)
        """
        frequency = self.calculate_frequency(quality, stream_type)
        energy_joules = PLANCK_CONSTANT * frequency * duration_seconds
        energy_nxt = energy_joules / JOULES_PER_NXT
        lambda_boson_kg = energy_joules / (SPEED_OF_LIGHT ** 2)
        
        return energy_joules, energy_nxt, lambda_boson_kg
    
    def validate_wallet_session(
        self,
        wallet_address: Optional[str],
        user_identity: str
    ) -> Tuple[bool, str]:
        """
        Validate wallet is properly linked for video session.
        
        Returns:
            Tuple of (is_valid, status_message)
        """
        if not wallet_address:
            return False, "WALLET_NOT_LINKED"
        
        if wallet_address.startswith("NXS_GUEST"):
            return False, "GUEST_WALLET"
        
        if not wallet_address.startswith("NXS"):
            return False, "INVALID_WALLET_FORMAT"
        
        return True, "WALLET_VALID"
    
    def start_session(
        self,
        session_id: str,
        wallet_address: Optional[str],
        user_identity: str,
        quality: VideoQuality = VideoQuality.HD_720P,
        stream_type: StreamType = StreamType.VIDEO_CALL
    ) -> Dict[str, Any]:
        """
        Start metering a video session.
        
        If wallet not linked, session proceeds but charges go to escrow.
        """
        is_valid, wallet_status = self.validate_wallet_session(wallet_address, user_identity)
        
        frequency = self.calculate_frequency(quality, stream_type)
        energy_per_second_j = PLANCK_CONSTANT * frequency
        energy_per_second_nxt = energy_per_second_j / JOULES_PER_NXT
        
        session = {
            'session_id': session_id,
            'wallet_address': wallet_address if is_valid else None,
            'user_identity': user_identity,
            'wallet_status': wallet_status,
            'is_escrowed': not is_valid,
            'quality': quality,
            'stream_type': stream_type,
            'frequency_hz': frequency,
            'energy_per_second_j': energy_per_second_j,
            'energy_per_second_nxt': energy_per_second_nxt,
            'start_time': time.time(),
            'accumulated_energy_j': 0.0,
            'accumulated_energy_nxt': 0.0,
            'accumulated_sdk_fee_nxt': 0.0,
            'last_meter_time': time.time()
        }
        
        self.active_sessions[session_id] = session
        
        return {
            'success': True,
            'session_id': session_id,
            'wallet_status': wallet_status,
            'is_escrowed': not is_valid,
            'energy_rate_nxt_per_minute': energy_per_second_nxt * 60,
            'quality': quality.display_name,
            'stream_type': stream_type.display_name,
            'frequency_hz': frequency,
            'bhls_video_budget_remaining': self.bhls_video_budget_nxt
        }
    
    def meter_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Update energy accumulation for active session.
        
        Should be called periodically (e.g., every 10 seconds).
        """
        if session_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[session_id]
        current_time = time.time()
        elapsed = current_time - session['last_meter_time']
        
        energy_j = session['energy_per_second_j'] * elapsed
        energy_nxt = energy_j / JOULES_PER_NXT
        sdk_fee = energy_nxt * self.SDK_FEE_PERCENT
        
        session['accumulated_energy_j'] += energy_j
        session['accumulated_energy_nxt'] += energy_nxt
        session['accumulated_sdk_fee_nxt'] += sdk_fee
        session['last_meter_time'] = current_time
        
        return {
            'session_id': session_id,
            'elapsed_seconds': current_time - session['start_time'],
            'interval_energy_nxt': energy_nxt,
            'total_energy_nxt': session['accumulated_energy_nxt'],
            'total_sdk_fee_nxt': session['accumulated_sdk_fee_nxt'],
            'is_escrowed': session['is_escrowed']
        }
    
    def end_session(self, session_id: str) -> Optional[VideoSessionCost]:
        """
        End video session and finalize charges.
        
        If escrowed, creates escrow entry for later resolution.
        """
        if session_id not in self.active_sessions:
            return None
        
        self.meter_session(session_id)
        session = self.active_sessions.pop(session_id)
        
        duration = time.time() - session['start_time']
        energy_j, energy_nxt, lambda_kg = self.calculate_energy_cost(
            session['quality'],
            session['stream_type'],
            duration
        )
        
        sdk_fee = energy_nxt * self.SDK_FEE_PERCENT
        
        cost = VideoSessionCost(
            session_id=session_id,
            wallet_address=session['wallet_address'],
            stream_type=session['stream_type'],
            quality=session['quality'],
            duration_seconds=duration,
            frequency_hz=session['frequency_hz'],
            energy_joules=energy_j,
            energy_nxt=energy_nxt,
            lambda_boson_kg=lambda_kg,
            sdk_fee_nxt=sdk_fee,
            is_escrowed=session['is_escrowed']
        )
        
        if session['is_escrowed']:
            escrow_id = f"VE_{int(time.time() * 1000)}_{session_id[:8]}"
            escrow = VideoEscrowEntry(
                escrow_id=escrow_id,
                session_id=session_id,
                user_identity=session['user_identity'],
                energy_nxt=energy_nxt,
                sdk_fee_nxt=sdk_fee,
                created_at=datetime.now()
            )
            self.escrow_pool[escrow_id] = escrow
        else:
            self.total_energy_consumed_nxt += energy_nxt
            self.sdk_fees_collected_nxt += sdk_fee
        
        self.total_energy_consumed_joules += energy_j
        self.completed_sessions.append(cost)
        
        return cost
    
    def link_wallet_to_escrow(
        self,
        user_identity: str,
        wallet_address: str
    ) -> Dict[str, Any]:
        """
        Resolve escrowed charges when wallet is linked.
        
        Finds all escrow entries for user and processes payment.
        """
        resolved_entries = []
        total_resolved_nxt = 0.0
        total_sdk_fee_nxt = 0.0
        
        for escrow_id, escrow in self.escrow_pool.items():
            if escrow.user_identity == user_identity and not escrow.resolved:
                escrow.resolved = True
                escrow.resolved_wallet = wallet_address
                escrow.resolved_at = datetime.now()
                
                total_resolved_nxt += escrow.energy_nxt
                total_sdk_fee_nxt += escrow.sdk_fee_nxt
                resolved_entries.append(escrow_id)
        
        if resolved_entries:
            self.total_energy_consumed_nxt += total_resolved_nxt
            self.sdk_fees_collected_nxt += total_sdk_fee_nxt
        
        return {
            'success': True,
            'wallet_address': wallet_address,
            'resolved_escrow_count': len(resolved_entries),
            'total_resolved_nxt': total_resolved_nxt,
            'total_sdk_fee_nxt': total_sdk_fee_nxt,
            'escrow_ids': resolved_entries
        }
    
    def get_bhls_video_status(self, wallet_address: str) -> Dict[str, Any]:
        """
        Get BHLS video budget status for wallet.
        
        BHLS provides 1,150 NXT/month with 10% allocated to video.
        """
        user_sessions = [
            s for s in self.completed_sessions 
            if s.wallet_address == wallet_address
        ]
        
        total_used = sum(s.energy_nxt for s in user_sessions)
        remaining = max(0, self.bhls_video_budget_nxt - total_used)
        
        return {
            'wallet_address': wallet_address,
            'bhls_video_budget_nxt': self.bhls_video_budget_nxt,
            'used_nxt': total_used,
            'remaining_nxt': remaining,
            'sessions_count': len(user_sessions),
            'is_over_budget': total_used > self.bhls_video_budget_nxt
        }
    
    def get_sdk_revenue_summary(self) -> Dict[str, Any]:
        """
        Get SDK revenue summary for founder wallet.
        """
        return {
            'sdk_wallet': SDK_WALLET,
            'total_fees_collected_nxt': self.sdk_fees_collected_nxt,
            'total_sessions': len(self.completed_sessions),
            'active_sessions': len(self.active_sessions),
            'escrow_pending': len([
                e for e in self.escrow_pool.values() 
                if not e.resolved
            ])
        }
    
    def get_physics_formula(self) -> Dict[str, str]:
        """
        Return the physics formulas used for video energy pricing.
        """
        return {
            'energy_formula': "E = hf × t (Energy = Planck × frequency × time)",
            'lambda_boson': "Λ = hf/c² (Mass-equivalent of oscillation)",
            'frequency': "f = resolution × frame_rate × quality_factor × stream_multiplier",
            'planck_constant': f"h = {PLANCK_CONSTANT:.6e} J·s",
            'speed_of_light': f"c = {SPEED_OF_LIGHT:,} m/s",
            'nxt_conversion': f"1 NXT = {JOULES_PER_NXT:.0e} Joules"
        }


video_energy_meter = VideoEnergyMeter()
