#!/usr/bin/env python3
"""
NexusOS WNSP P2P Hub Integration
Adds two-phase transaction methods to NexusNativeWallet for unified wallet system
"""

import hashlib
import secrets
from datetime import datetime
from typing import Dict, Any
from nexus_native_wallet import NexusNativeWallet, DeviceWalletMapping, EnergyReservation

UNITS_PER_NXT = 100_000_000

class NexusWNSPWallet(NexusNativeWallet):
    """
    Extended NexusNativeWallet with WNSP P2P Hub integration
    
    Adds:
    - Simple device-based authentication
    - Two-phase energy reservation system (reserve/finalize/cancel)
    - ACID-compliant transactions for E=hf enforcement
    """
    
    def create_device_wallet(self, device_name: str, contact: str, password: str, 
                            initial_balance_nxt: float = 1.0) -> Dict[str, Any]:
        """
        Create wallet with simple device credentials for WNSP P2P Hub
        
        Args:
            device_name: Device display name
            contact: Contact info (email/phone)
            password: Wallet password  
            initial_balance_nxt: Initial NXT balance
        
        Returns:
            Device ID, auth token, and wallet address
        """
        # Generate unique device ID
        device_id = hashlib.sha256(f"{contact}{secrets.token_hex(8)}".encode()).hexdigest()[:16]
        auth_token = secrets.token_urlsafe(32)
        
        # Create blockchain wallet
        wallet_result = self.create_wallet(password=password, initial_balance=initial_balance_nxt)
        nexus_address = wallet_result['address']
        
        # Map device to address
        session = self.SessionMaker()
        try:
            mapping = DeviceWalletMapping(
                device_id=device_id,
                device_name=device_name,
                contact=contact,
                nexus_address=nexus_address,
                auth_token=auth_token
            )
            session.add(mapping)
            session.commit()
            
            # Get exact balance from ledger (no float reconstruction)
            balance_result = super().get_balance(nexus_address)
            
            return {
                'success': True,
                'wallet': {
                    'device_id': device_id,
                    'device_name': device_name,
                    'auth_token': auth_token,
                    'nexus_address': nexus_address,
                    'balance_units': balance_result['balance_units'],  # Direct from ledger
                    'balance_nxt': balance_result['balance_nxt']
                }
            }
        except Exception as e:
            session.rollback()
            return {'success': False, 'error': f'Failed to create device wallet: {str(e)}'}
        finally:
            session.close()
    
    def authenticate(self, device_id: str, auth_token: str) -> Dict[str, Any]:
        """Authenticate device and return wallet info"""
        session = self.SessionMaker()
        try:
            mapping = session.query(DeviceWalletMapping).filter_by(device_id=device_id).first()
            
            if not mapping:
                return {'success': False, 'error': 'Device not found'}
            
            if mapping.auth_token != auth_token:
                return {'success': False, 'error': 'Invalid authentication token'}
            
            # Get exact balance from ledger (no float reconstruction)
            balance_result = super().get_balance(mapping.nexus_address)
            
            # Update last seen
            mapping.last_seen = datetime.utcnow()
            session.commit()
            
            return {
                'success': True,
                'wallet': {
                    'device_id': device_id,
                    'device_name': mapping.device_name,
                    'nexus_address': mapping.nexus_address,
                    'balance_units': balance_result['balance_units'],  # Direct from ledger
                    'balance_nxt': balance_result['balance_nxt']
                }
            }
        except Exception as e:
            return {'success': False, 'error': f'Authentication failed: {str(e)}'}
        finally:
            session.close()
    
    def get_balance(self, device_id: str) -> Dict[str, Any]:
        """Get balance for device"""
        session = self.SessionMaker()
        try:
            mapping = session.query(DeviceWalletMapping).filter_by(device_id=device_id).first()
            
            if not mapping:
                return {'success': False, 'error': 'Device not found'}
            
            # Get exact balance from ledger (no float reconstruction)  
            balance_result = super().get_balance(mapping.nexus_address)
            
            return {
                'success': True,
                'balance_units': balance_result['balance_units'],  # Direct from ledger
                'balance_nxt': balance_result['balance_nxt'],
                'nexus_address': mapping.nexus_address
            }
        except Exception as e:
            return {'success': False, 'error': f'Failed to get balance: {str(e)}'}
        finally:
            session.close()
    
    def reserve_energy_cost(self, device_id: str, amount_units: int, filename: str,
                           file_size: int, wavelength_nm: float = None,
                           energy_description: str = None) -> Dict[str, Any]:
        """
        Phase 1: Reserve energy cost for WNSP file propagation
        
        ACID-compliant transaction that holds funds without final deduction
        """
        session = self.SessionMaker()
        try:
            # Get nexus address from device mapping
            mapping = session.query(DeviceWalletMapping).filter_by(device_id=device_id).first()
            
            if not mapping:
                return {'success': False, 'error': 'Device not found'}
            
            address = mapping.nexus_address
            
            # Get token account and check balance
            account = self._get_token_account(address)
            if not account:
                return {'success': False, 'error': 'Account not found'}
            
            balance_units = account.balance
            
            if balance_units < amount_units:
                return {
                    'success': False,
                    'error': f'Insufficient balance. Need {amount_units} units, have {balance_units} units'
                }
            
            # 🔒 CRITICAL: Actually deduct reserved amount from blockchain balance (LOCK FUNDS)
            account.balance -= amount_units
            
            # Create reservation
            reservation = EnergyReservation(
                address=address,
                device_id=device_id,
                reserved_amount_units=amount_units,
                filename=filename,
                file_size=file_size,
                wavelength_nm=wavelength_nm,
                status='reserved'
            )
            session.add(reservation)
            session.commit()
            
            # Get new balance after reservation
            new_balance = account.balance
            
            return {
                'success': True,
                'reservation_id': reservation.id,
                'reserved_amount': amount_units,
                'new_balance': new_balance,
                'balance_nxt': new_balance / UNITS_PER_NXT
            }
        except Exception as e:
            session.rollback()
            return {'success': False, 'error': f'Reservation failed: {str(e)}'}
        finally:
            session.close()
    
    def finalize_energy_cost(self, device_id: str, reservation_id: int,
                            actual_amount_units: int, reserved_amount_units: int) -> Dict[str, Any]:
        """
        Phase 2: Finalize reservation with actual energy cost
        
        Performs blockchain deduction for exact amount
        Refunds if overcharged, charges top-up if undercharged
        """
        session = self.SessionMaker()
        try:
            # Get reservation
            reservation = session.query(EnergyReservation).filter_by(
                id=reservation_id,
                device_id=device_id,
                status='reserved'
            ).first()
            
            if not reservation:
                return {'success': False, 'error': 'Reservation not found or already finalized'}
            
            address = reservation.address
            
            # Calculate adjustment
            adjustment = reserved_amount_units - actual_amount_units
            adjustment_type = 'NONE'
            
            if adjustment > 0:
                adjustment_type = 'REFUND'
            elif adjustment < 0:
                adjustment_type = 'TOP_UP'
            
            # Get token account for adjustment
            account = self._get_token_account(address)
            if not account:
                return {'success': False, 'error': 'Account not found'}
            
            # 💰 RECONCILE: Refund excess or charge deficit (funds already locked in reserve)
            if adjustment > 0:
                # Refund excess (actual < reserved)
                account.balance += adjustment
            elif adjustment < 0:
                # Charge deficit (actual > reserved) - need more funds
                deficit = abs(adjustment)
                if account.balance < deficit:
                    return {
                        'success': False,
                        'error': f'Insufficient balance for top-up. Need {deficit} more units.'
                    }
                account.balance -= deficit
            
            # Update reservation
            reservation.actual_amount_units = actual_amount_units
            reservation.status = 'finalized'
            reservation.finalized_at = datetime.utcnow()
            
            session.commit()
            
            # Get final balance (already in correct units)
            final_balance_units = account.balance
            
            return {
                'success': True,
                'adjustment_type': adjustment_type,
                'adjustment_amount': abs(adjustment),
                'actual_cost': actual_amount_units,
                'final_balance': final_balance_units,
                'balance_nxt': final_balance_units / UNITS_PER_NXT
            }
        except Exception as e:
            session.rollback()
            return {'success': False, 'error': f'Finalization failed: {str(e)}'}
        finally:
            session.close()
    
    def cancel_reservation(self, device_id: str, reservation_id: int,
                          reserved_amount_units: int) -> Dict[str, Any]:
        """Cancel reservation and refund (for failed uploads)"""
        session = self.SessionMaker()
        try:
            # Get reservation
            reservation = session.query(EnergyReservation).filter_by(
                id=reservation_id,
                device_id=device_id
            ).first()
            
            if not reservation:
                return {'success': False, 'error': 'Reservation not found'}
            
            # Get token account and refund reserved funds
            address = reservation.address
            account = self._get_token_account(address)
            if not account:
                return {'success': False, 'error': 'Account not found'}
            
            # 💸 REFUND: Return locked funds to blockchain balance
            account.balance += reserved_amount_units
            
            # Mark as cancelled
            reservation.status = 'cancelled'
            reservation.finalized_at = datetime.utcnow()
            
            session.commit()
            
            # Get final balance after refund
            final_balance = account.balance
            
            return {
                'success': True,
                'refunded_amount': reserved_amount_units,
                'final_balance': final_balance,
                'balance_nxt': final_balance / UNITS_PER_NXT
            }
        except Exception as e:
            session.rollback()
            return {'success': False, 'error': f'Cancellation failed: {str(e)}'}
        finally:
            session.close()
    
    def add_balance(self, device_id: str, amount_units: int, description: str = "Manual top-up") -> Dict[str, Any]:
        """Add balance to wallet (admin/testing function)"""
        session = self.SessionMaker()
        try:
            # Get nexus address
            mapping = session.query(DeviceWalletMapping).filter_by(device_id=device_id).first()
            
            if not mapping:
                return {'success': False, 'error': 'Device not found'}
            
            nexus_address = mapping.nexus_address
            
            # Add to token account (already in correct units)
            token_account = self._get_or_create_token_account(nexus_address)
            token_account.balance += amount_units
            
            session.commit()
            
            # Get new balance (already in correct units)
            new_balance_units = token_account.balance
            
            return {
                'success': True,
                'new_balance_units': new_balance_units,
                'new_balance_nxt': new_balance_units / UNITS_PER_NXT,
                'added_amount': amount_units
            }
        except Exception as e:
            session.rollback()
            return {'success': False, 'error': f'Failed to add balance: {str(e)}'}
        finally:
            session.close()
