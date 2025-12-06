"""
Energy Sector Demo

Demonstrates the NexusOS Energy Adapter for power grid operations.
Shows physics-based validation with conservation law enforcement.

Run: python sdk/examples/energy_demo.py
"""

import sys
sys.path.insert(0, '.')

from wnsp_v7.industry import EnergyAdapter
from wnsp_v7.industry.base import Attestation, SpectralBand
from datetime import datetime


def main():
    print("=" * 60)
    print("NexusOS Energy Sector Demo")
    print("Physics-Based Power Grid Operations")
    print("=" * 60)
    
    adapter = EnergyAdapter()
    
    print(f"\nSector: {adapter.sector_id}")
    print(f"Policy Version: {adapter.policy.version}")
    print(f"\nAvailable Operations:")
    for op_id in adapter.list_operations():
        op_info = adapter.get_operation_info(op_id)
        print(f"  - {op_id}: {op_info.get('name', 'N/A')} (Band: {op_info.get('required_band', 'N/A')})")
    
    print("\n" + "-" * 60)
    print("1. POWER GENERATION")
    print("-" * 60)
    
    generator_cert = Attestation(
        type="generator_certificate",
        value="CERT-GEN-001",
        issuer="GridAuthority",
        band_level=SpectralBand.ZEPTO
    )
    grid_connection = Attestation(
        type="grid_connection",
        value="CONN-GRID-001",
        issuer="GridOperator",
        band_level=SpectralBand.ZEPTO
    )
    
    result = adapter.generate_power(
        generator_id="GEN-SOLAR-001",
        megawatts=50.0,
        attestations=[generator_cert, grid_connection],
        energy_escrow_nxt=1.0
    )
    
    print(f"Generator: GEN-SOLAR-001")
    print(f"Power: 50.0 MW")
    print(f"Result: {'SUCCESS' if result.success else 'FAILED'}")
    print(f"Lambda Mass: {result.lambda_mass:.6e} kg")
    print(f"Band Used: {result.band_used.name}")
    print(f"Transaction ID: {result.transaction_id}")
    
    print("\n" + "-" * 60)
    print("2. POWER CONSUMPTION")
    print("-" * 60)
    
    meter_attestation = Attestation(
        type="meter_id",
        value="METER-INDUSTRIAL-001",
        issuer="MeterAuthority",
        band_level=SpectralBand.FEMTO
    )
    
    result = adapter.consume_power(
        meter_id="METER-INDUSTRIAL-001",
        megawatts=45.0,
        attestations=[meter_attestation],
        energy_escrow_nxt=1.0
    )
    
    print(f"Meter: METER-INDUSTRIAL-001")
    print(f"Consumption: 45.0 MW")
    print(f"Result: {'SUCCESS' if result.success else 'FAILED'}")
    print(f"Lambda Mass: {result.lambda_mass:.6e} kg")
    
    print("\n" + "-" * 60)
    print("3. CONSERVATION LAW VERIFICATION")
    print("-" * 60)
    
    is_balanced, message, balance = adapter.verify_conservation()
    
    print(f"Generated: {balance['generated']:.2f} MW")
    print(f"Consumed: {balance['consumed']:.2f} MW")
    print(f"Losses: {balance['losses']:.2f} MW")
    print(f"Stored: {balance['stored']:.2f} MW")
    print(f"\nConservation Status: {'BALANCED' if is_balanced else 'VIOLATION'}")
    print(f"Message: {message}")
    
    print("\n" + "-" * 60)
    print("4. GRID BALANCING (ATTO-Level)")
    print("-" * 60)
    
    operator_cert = Attestation(
        type="grid_operator_certificate",
        value="OP-CERT-001",
        issuer="NationalGrid",
        band_level=SpectralBand.YOCTO
    )
    
    result = adapter.balance_grid(
        operator_id="GRID-OP-001",
        frequency_adjustment_hz=0.1,
        voltage_adjustment_percent=2.0,
        attestations=[operator_cert],
        energy_escrow_nxt=10.0
    )
    
    print(f"Frequency Adjustment: +0.1 Hz")
    print(f"Voltage Adjustment: +2.0%")
    print(f"Result: {'SUCCESS' if result.success else 'FAILED'}")
    print(f"Band Used: {result.band_used.name}")
    
    print("\n" + "-" * 60)
    print("5. BAND REQUIREMENTS")
    print("-" * 60)
    
    for band in [SpectralBand.PLANCK, SpectralBand.YOCTO, SpectralBand.ATTO, SpectralBand.FEMTO]:
        reqs = adapter.get_band_requirements(band)
        print(f"\n{band.name}:")
        print(f"  Min Escrow: {reqs['min_escrow_nxt']} NXT")
        print(f"  Multi-Party: {reqs['multi_party_required']}")
        print(f"  Quorum: {reqs['quorum_percent']}%")
    
    print("\n" + "=" * 60)
    print("Conservation Law: Λ_generated = Λ_consumed + Λ_losses + Λ_stored")
    print("Physics guarantees no energy can be created from nothing.")
    print("=" * 60)


if __name__ == "__main__":
    main()
