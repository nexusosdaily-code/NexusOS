#!/usr/bin/env python3
"""
Wallet Manager for WNSP P2P Hub
Now uses unified NexusOS blockchain wallet system

This module provides backward compatibility wrapper around NexusWNSPWallet
"""

import os
from typing import Dict, Optional

UNITS_PER_NXT = 100_000_000  # 100 million units per NXT

# Global wallet instance
_wallet_instance = None

def get_wallet_manager():
    """Get unified wallet instance (returns WalletManager for compatibility)"""
    return WalletManager()

class WalletManager:
    """
    Unified Wallet Manager
    
    Wraps NexusWNSPWallet to provide backward compatibility with existing
    WNSP P2P Hub code while using blockchain backend
    """
    
    def __init__(self):
        """Initialize unified NexusOS blockchain wallet"""
        from nexus_wnsp_integration import NexusWNSPWallet
        self.wallet = NexusWNSPWallet(database_url=os.environ.get('DATABASE_URL'))
    
    def create_wallet(self, device_name: str, contact: str) -> Dict:
        """Create new wallet with blockchain backend"""
        password = contact  # Simple password (user can change later)
        return self.wallet.create_device_wallet(device_name, contact, password, initial_balance_nxt=1.0)
    
    def login_wallet(self, contact: str) -> Dict:
        """
        Login to wallet using contact
        
        Note: For unified system, this searches device mappings by contact
        Returns first matching device
        """
        # This is a compatibility method - unified system uses device_id + auth_token
        # For now, we'll search by contact in the mapping table
        try:
            import psycopg2
            db_url = os.environ.get('DATABASE_URL')
            conn = psycopg2.connect(db_url)
            
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT device_id, device_name, auth_token, nexus_address
                        FROM nexus_device_wallet_mapping
                        WHERE contact = %s
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (contact,))
                    
                    row = cur.fetchone()
                    
                    if not row:
                        return {
                            'success': False,
                            'error': 'Wallet not found. Please create a new wallet.'
                        }
                    
                    device_id, device_name, auth_token, nexus_address = row
                    
                    # Get balance from blockchain
                    balance_result = self.wallet.get_balance(device_id)
                    
                    if balance_result['success']:
                        return {
                            'success': True,
                            'wallet': {
                                'device_id': device_id,
                                'device_name': device_name,
                                'balance_units': balance_result['balance_units'],
                                'balance_nxt': balance_result['balance_nxt'],
                                'auth_token': auth_token
                            }
                        }
                    else:
                        return balance_result
            finally:
                conn.close()
        except Exception as e:
            return {
                'success': False,
                'error': f'Login failed: {str(e)}'
            }
    
    def authenticate(self, device_id: str, auth_token: str) -> Dict:
        """Authenticate device with auth token"""
        return self.wallet.authenticate(device_id, auth_token)
    
    def get_balance(self, device_id: str) -> Dict:
        """Get wallet balance from blockchain"""
        return self.wallet.get_balance(device_id)
    
    def reserve_energy_cost(self, device_id: str, amount_units: int, filename: str,
                           file_size: int, wavelength_nm: float = None,
                           energy_description: str = None) -> Dict:
        """Phase 1: Reserve energy cost (ACID-compliant)"""
        return self.wallet.reserve_energy_cost(
            device_id, amount_units, filename, file_size, wavelength_nm, energy_description
        )
    
    def finalize_energy_cost(self, device_id: str, reservation_id: int,
                            actual_amount_units: int, reserved_amount_units: int) -> Dict:
        """Phase 2: Finalize with actual energy cost"""
        return self.wallet.finalize_energy_cost(
            device_id, reservation_id, actual_amount_units, reserved_amount_units
        )
    
    def cancel_reservation(self, device_id: str, reservation_id: int,
                          reserved_amount_units: int) -> Dict:
        """Cancel reservation and refund"""
        return self.wallet.cancel_reservation(device_id, reservation_id, reserved_amount_units)
    
    def add_balance(self, device_id: str, amount_units: int, description: str = "Manual top-up") -> Dict:
        """Add balance to wallet (admin/testing)"""
        return self.wallet.add_balance(device_id, amount_units, description)
