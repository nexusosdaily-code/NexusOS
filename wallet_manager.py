#!/usr/bin/env python3
"""
Wallet Manager for WNSP P2P Hub
Simplified wallet system with PostgreSQL storage
"""

import psycopg2
import os
import hashlib
import secrets
from typing import Dict, Optional

UNITS_PER_NXT = 100_000_000  # 100 million units per NXT

class WalletManager:
    """Manages wallet authentication and NXT balances"""
    
    def __init__(self):
        """Initialize database connection"""
        self.db_url = os.environ.get('DATABASE_URL')
        if not self.db_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        self._init_database()
    
    def _get_connection(self):
        """Get database connection"""
        return psycopg2.connect(self.db_url)
    
    def _init_database(self):
        """Create wallets and transactions tables if they don't exist"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS wallets (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) UNIQUE NOT NULL,
                        device_name VARCHAR(255) NOT NULL,
                        contact VARCHAR(255) NOT NULL,
                        balance_units BIGINT DEFAULT 0,
                        auth_token VARCHAR(255) UNIQUE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS transactions (
                        id SERIAL PRIMARY KEY,
                        device_id VARCHAR(255) NOT NULL,
                        amount_units BIGINT NOT NULL,
                        tx_type VARCHAR(50) NOT NULL,
                        filename VARCHAR(255),
                        file_size BIGINT,
                        wavelength_nm FLOAT,
                        energy_description TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (device_id) REFERENCES wallets(device_id)
                    )
                """)
                conn.commit()
                print("✅ Wallets and transactions tables initialized")
        except Exception as e:
            print(f"❌ Database initialization error: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def create_wallet(self, device_name: str, contact: str) -> Dict:
        """Create new wallet with initial balance"""
        conn = self._get_connection()
        try:
            # Generate unique device ID from contact
            device_id = hashlib.sha256(f"{contact}{secrets.token_hex(8)}".encode()).hexdigest()[:16]
            auth_token = secrets.token_urlsafe(32)
            
            # Initial balance: 1,000,000 units = 0.01 NXT
            initial_balance = 1_000_000
            
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO wallets (device_id, device_name, contact, balance_units, auth_token)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, device_id, balance_units
                """, (device_id, device_name, contact, initial_balance, auth_token))
                
                result = cur.fetchone()
                conn.commit()
                
                if not result:
                    return {
                        'success': False,
                        'error': 'Failed to create wallet'
                    }
                
                return {
                    'success': True,
                    'wallet': {
                        'device_id': device_id,
                        'device_name': device_name,
                        'balance_units': initial_balance,
                        'balance_nxt': initial_balance / UNITS_PER_NXT,
                        'auth_token': auth_token
                    }
                }
        except psycopg2.IntegrityError:
            conn.rollback()
            return {
                'success': False,
                'error': 'Wallet already exists for this contact'
            }
        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            conn.close()
    
    def login_wallet(self, contact: str) -> Dict:
        """Login to wallet using contact"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT device_id, device_name, balance_units, auth_token
                    FROM wallets
                    WHERE contact = %s
                """, (contact,))
                
                row = cur.fetchone()
                
                if not row:
                    return {
                        'success': False,
                        'error': 'Wallet not found. Please create a new wallet.'
                    }
                
                # Update last seen
                cur.execute("""
                    UPDATE wallets SET last_seen = CURRENT_TIMESTAMP
                    WHERE contact = %s
                """, (contact,))
                conn.commit()
                
                return {
                    'success': True,
                    'wallet': {
                        'device_id': row[0],
                        'device_name': row[1],
                        'balance_units': row[2],
                        'balance_nxt': row[2] / UNITS_PER_NXT,
                        'auth_token': row[3]
                    }
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            conn.close()
    
    def get_balance(self, device_id: str) -> Dict:
        """Get wallet balance"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT balance_units FROM wallets
                    WHERE device_id = %s
                """, (device_id,))
                
                row = cur.fetchone()
                
                if not row:
                    return {
                        'success': False,
                        'error': 'Wallet not found'
                    }
                
                return {
                    'success': True,
                    'balance_units': row[0],
                    'balance_nxt': row[0] / UNITS_PER_NXT
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            conn.close()
    
    def deduct_balance(self, device_id: str, amount_units: int) -> bool:
        """Deduct balance from wallet"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Check current balance
                cur.execute("""
                    SELECT balance_units FROM wallets
                    WHERE device_id = %s
                """, (device_id,))
                
                row = cur.fetchone()
                if not row or row[0] < amount_units:
                    return False
                
                # Deduct balance
                cur.execute("""
                    UPDATE wallets
                    SET balance_units = balance_units - %s
                    WHERE device_id = %s
                """, (amount_units, device_id))
                
                conn.commit()
                return True
        except Exception as e:
            print(f"❌ Deduct balance error: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def deduct_energy_cost(self, device_id: str, amount_units: int, filename: str, file_size: int, wavelength_nm: float = None, energy_description: str = None) -> Dict:
        """
        Deduct E=hf energy cost from wallet and record orbital transition
        
        Args:
            device_id: User's device ID
            amount_units: Energy cost in NXT units
            filename: Name of shared file
            file_size: Size of file in bytes
            wavelength_nm: Wavelength used for energy calculation
            energy_description: Description of energy transition
        
        Returns:
            Dict with success status, new balance, and transaction info
        """
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                # Check current balance
                cur.execute("""
                    SELECT balance_units FROM wallets
                    WHERE device_id = %s
                """, (device_id,))
                
                row = cur.fetchone()
                if not row:
                    return {
                        'success': False,
                        'error': 'Wallet not found'
                    }
                
                current_balance = row[0]
                if current_balance < amount_units:
                    return {
                        'success': False,
                        'error': f'Insufficient balance. Required: {amount_units} units, Available: {current_balance} units'
                    }
                
                # Deduct balance
                cur.execute("""
                    UPDATE wallets
                    SET balance_units = balance_units - %s
                    WHERE device_id = %s
                    RETURNING balance_units
                """, (amount_units, device_id))
                
                new_balance = cur.fetchone()[0]
                
                # Record transaction (orbital transition to TRANSITION_RESERVE)
                cur.execute("""
                    INSERT INTO transactions (device_id, amount_units, tx_type, filename, file_size, wavelength_nm, energy_description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (device_id, amount_units, 'ENERGY_COST', filename, file_size, wavelength_nm, energy_description))
                
                tx_id, created_at = cur.fetchone()
                
                conn.commit()
                
                return {
                    'success': True,
                    'transaction_id': tx_id,
                    'amount_deducted': amount_units,
                    'new_balance': new_balance,
                    'balance_nxt': new_balance / UNITS_PER_NXT,
                    'created_at': created_at.isoformat()
                }
        except Exception as e:
            print(f"❌ Energy cost deduction error: {e}")
            conn.rollback()
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            conn.close()
    
    def get_wallet_by_auth(self, auth_token: str) -> Dict:
        """Get wallet info by auth token"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT device_id, device_name, balance_units, contact
                    FROM wallets
                    WHERE auth_token = %s
                """, (auth_token,))
                
                row = cur.fetchone()
                
                if not row:
                    return {
                        'success': False,
                        'error': 'Invalid auth token'
                    }
                
                return {
                    'success': True,
                    'wallet': {
                        'device_id': row[0],
                        'device_name': row[1],
                        'balance_units': row[2],
                        'balance_nxt': row[2] / UNITS_PER_NXT,
                        'contact': row[3]
                    }
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            conn.close()
    
    def get_recent_transactions(self, device_id: str, limit: int = 10) -> Dict:
        """Get recent transactions for a wallet"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, amount_units, tx_type, filename, file_size, wavelength_nm, energy_description, created_at
                    FROM transactions
                    WHERE device_id = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (device_id, limit))
                
                rows = cur.fetchall()
                
                transactions = []
                for row in rows:
                    transactions.append({
                        'id': row[0],
                        'amount_units': row[1],
                        'amount_nxt': row[1] / UNITS_PER_NXT,
                        'type': row[2],
                        'filename': row[3],
                        'file_size': row[4],
                        'wavelength_nm': row[5],
                        'description': row[6],
                        'created_at': row[7].isoformat() if row[7] else None
                    })
                
                return {
                    'success': True,
                    'transactions': transactions
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            conn.close()


# Global instance
wallet_manager = None

def get_wallet_manager():
    """Get or create wallet manager instance"""
    global wallet_manager
    if wallet_manager is None:
        try:
            wallet_manager = WalletManager()
        except Exception as e:
            print(f"❌ Failed to initialize wallet manager: {e}")
            return None
    return wallet_manager
