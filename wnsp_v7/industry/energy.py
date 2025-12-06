"""
Energy Sector Adapter

Domain adapter for power grid, utilities, and energy metering.
Enforces conservation laws at the protocol level.

Usage:
    from wnsp_v7.industry import EnergyAdapter
    
    adapter = EnergyAdapter()
    result = adapter.generate_power(
        generator_id="GEN-001",
        megawatts=100.0,
        attestations=[generator_cert, grid_connection]
    )
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

from .base import (
    IndustryAdapter, IndustryOperation, OperationResult,
    Attestation, SpectralBand, load_sector_policy
)


@dataclass
class EnergyReading:
    """Energy meter reading with Lambda mass proof"""
    meter_id: str
    reading_kwh: float
    timestamp: datetime
    lambda_signature: str
    
    def to_dict(self) -> Dict:
        return {
            'meter_id': self.meter_id,
            'reading_kwh': self.reading_kwh,
            'timestamp': self.timestamp.isoformat(),
            'lambda_signature': self.lambda_signature
        }


@dataclass 
class GridNode:
    """Power grid node with physics-based state"""
    node_id: str
    node_type: str  # generator, consumer, transformer, bus
    voltage_kv: float
    frequency_hz: float = 50.0
    lambda_state: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'node_id': self.node_id,
            'node_type': self.node_type,
            'voltage_kv': self.voltage_kv,
            'frequency_hz': self.frequency_hz,
            'lambda_state': self.lambda_state
        }


class EnergyAdapter(IndustryAdapter):
    """
    Energy sector adapter for power grid operations.
    
    Key Operations:
    - generate_power: Register power generation
    - consume_power: Register power consumption  
    - transfer_power: Transfer between grid nodes
    - balance_grid: Real-time frequency/voltage regulation
    - settle_energy: Financial settlement
    - black_start: Grid restoration (PLANCK level)
    
    Physics Rules:
    - Conservation: Λ_generated = Λ_consumed + Λ_losses + Λ_stored
    - Efficiency minimum: 85%
    - Frequency stability: Δf < 0.5 Hz
    """
    
    def __init__(self):
        super().__init__(sector_id='energy')
        self._grid_state: Dict[str, GridNode] = {}
        self._energy_balance: Dict[str, float] = {
            'generated': 0.0,
            'consumed': 0.0,
            'losses': 0.0,
            'stored': 0.0
        }
    
    def generate_power(
        self,
        generator_id: str,
        megawatts: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 1.0
    ) -> OperationResult:
        """
        Register power generation with Lambda mass proof.
        
        Args:
            generator_id: Unique generator identifier
            megawatts: Power generated in MW
            attestations: Required certificates (generator_certificate, grid_connection)
            energy_escrow_nxt: Energy escrow for operation
            
        Returns:
            OperationResult with Lambda mass signature
        """
        operation = IndustryOperation(
            operation_id='energy.generate',
            sector_id='energy',
            data={
                'generator_id': generator_id,
                'megawatts': megawatts,
                'energy_joules': megawatts * 1e6 * 3600  # MW to J/hour
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=generator_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._energy_balance['generated'] += megawatts
        
        return result
    
    def consume_power(
        self,
        meter_id: str,
        megawatts: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 1.0
    ) -> OperationResult:
        """
        Register power consumption with metered verification.
        
        Args:
            meter_id: Smart meter identifier
            megawatts: Power consumed in MW
            attestations: Required certificates (meter_id)
            energy_escrow_nxt: Energy escrow for operation
        """
        operation = IndustryOperation(
            operation_id='energy.consume',
            sector_id='energy',
            data={
                'meter_id': meter_id,
                'megawatts': megawatts
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=meter_id
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            self._energy_balance['consumed'] += megawatts
        
        return result
    
    def transfer_power(
        self,
        source_node: str,
        destination_node: str,
        megawatts: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10.0
    ) -> OperationResult:
        """
        Transfer power between grid nodes with conservation check.
        
        Conservation Law Enforcement:
        Λ_source = Λ_destination + Λ_transmission_loss
        """
        loss_percent = self.policy.constraints.get('loss_tolerance_percent', 5)
        max_loss = megawatts * (loss_percent / 100)
        
        operation = IndustryOperation(
            operation_id='energy.transfer',
            sector_id='energy',
            data={
                'source_node': source_node,
                'destination_node': destination_node,
                'megawatts': megawatts,
                'max_loss_mw': max_loss
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=source_node
        )
        
        result = self.execute_operation(operation)
        
        if result.success:
            actual_loss = max_loss * 0.5  # Simulate 50% of max loss
            self._energy_balance['losses'] += actual_loss
        
        return result
    
    def balance_grid(
        self,
        operator_id: str,
        frequency_adjustment_hz: float,
        voltage_adjustment_percent: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10.0
    ) -> OperationResult:
        """
        Real-time grid balancing operation.
        
        Triggers:
        - Δf > 0.5 Hz → ATTO-level response
        - ΔV > 10% → YOCTO-level response
        """
        freq_band = self.policy.constraints.get('frequency_band_hz', [49.5, 50.5])
        voltage_tolerance = self.policy.constraints.get('voltage_tolerance_percent', 10)
        
        if abs(frequency_adjustment_hz) > 0.5:
            required_band = SpectralBand.YOCTO
        else:
            required_band = SpectralBand.ATTO
        
        operation = IndustryOperation(
            operation_id='energy.balance',
            sector_id='energy',
            data={
                'frequency_adjustment_hz': frequency_adjustment_hz,
                'voltage_adjustment_percent': voltage_adjustment_percent,
                'target_frequency_hz': 50.0 + frequency_adjustment_hz,
                'required_band': required_band.name
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=operator_id
        )
        
        return self.execute_operation(operation)
    
    def settle_energy(
        self,
        buyer_id: str,
        seller_id: str,
        energy_mwh: float,
        price_per_mwh: float,
        attestations: List[Attestation],
        energy_escrow_nxt: float = 100.0
    ) -> OperationResult:
        """
        Financial settlement for energy transaction.
        
        Requires:
        - meter_proof: Verified consumption/generation
        - price_oracle: Market price verification
        """
        total_value = energy_mwh * price_per_mwh
        
        operation = IndustryOperation(
            operation_id='energy.settle',
            sector_id='energy',
            data={
                'buyer_id': buyer_id,
                'seller_id': seller_id,
                'energy_mwh': energy_mwh,
                'price_per_mwh': price_per_mwh,
                'total_value_nxt': total_value
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=buyer_id
        )
        
        return self.execute_operation(operation)
    
    def black_start(
        self,
        operator_id: str,
        affected_zones: List[str],
        attestations: List[Attestation],
        energy_escrow_nxt: float = 10000.0
    ) -> OperationResult:
        """
        Grid restoration after complete outage.
        
        PLANCK-level operation requiring:
        - emergency_declaration
        - multi_operator_consensus (80% quorum)
        """
        operation = IndustryOperation(
            operation_id='energy.blackstart',
            sector_id='energy',
            data={
                'affected_zones': affected_zones,
                'restoration_sequence': 'staged',
                'priority': 'critical_infrastructure_first'
            },
            attestations=attestations,
            energy_escrow_nxt=energy_escrow_nxt,
            operator_id=operator_id
        )
        
        return self.execute_operation(operation)
    
    def verify_conservation(self) -> Tuple[bool, str, Dict]:
        """
        Verify energy conservation law is satisfied.
        
        Returns:
            (is_balanced, message, balance_data)
        """
        generated = self._energy_balance['generated']
        consumed = self._energy_balance['consumed']
        losses = self._energy_balance['losses']
        stored = self._energy_balance['stored']
        
        total_out = consumed + losses + stored
        difference = abs(generated - total_out)
        tolerance = generated * 0.01  # 1% tolerance
        
        is_balanced = difference <= tolerance
        
        if is_balanced:
            message = "Conservation law satisfied: Λ_gen = Λ_consumed + Λ_losses + Λ_stored"
        else:
            message = f"Conservation violation detected: Δ = {difference:.2f} MW"
        
        return is_balanced, message, self._energy_balance.copy()
    
    def get_grid_state(self) -> Dict:
        """Get current grid state summary"""
        return {
            'nodes': {k: v.to_dict() for k, v in self._grid_state.items()},
            'energy_balance': self._energy_balance.copy(),
            'conservation_valid': self.verify_conservation()[0]
        }
