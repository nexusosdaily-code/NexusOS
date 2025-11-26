#!/usr/bin/env python3
"""
Twilio SMS Verification System for WNSP P2P Hub
GPL v3.0 License

Provides phone number verification via SMS for:
- User wallet creation
- Friend phone verification
- P2P identity authentication
"""

import os
import random
import string
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import psycopg2

try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("⚠️ Twilio library not installed. SMS verification disabled.")


class TwilioVerificationService:
    """Handles SMS verification codes via Twilio"""
    
    CODE_LENGTH = 6
    CODE_EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 5
    COOLDOWN_SECONDS = 60
    
    def __init__(self):
        """Initialize Twilio client and database connection"""
        self.account_sid = (os.environ.get('TWILIO_ACCOUNT_SID') or '').strip()
        self.auth_token = (os.environ.get('TWILIO_AUTH_TOKEN') or '').strip()
        self.api_key = (os.environ.get('TWILIO_API_KEY') or '').strip()
        self.api_secret = (os.environ.get('TWILIO_API_SECRET') or '').strip()
        self.db_url = os.environ.get('DATABASE_URL')
        
        self.client = None
        self.from_number = None
        
        if TWILIO_AVAILABLE and self.account_sid:
            try:
                if self.auth_token:
                    self.client = Client(self.account_sid, self.auth_token)
                    print("✅ Twilio SMS service initialized (Auth Token)")
                elif self.api_key and self.api_secret:
                    self.client = Client(self.api_key, self.api_secret, self.account_sid)
                    print("✅ Twilio SMS service initialized (API Key auth)")
                self._get_twilio_phone_number()
            except Exception as e:
                print(f"⚠️ Twilio initialization error: {e}")
        else:
            print("⚠️ Twilio credentials not configured. Using demo mode.")
        
        self._init_database()
    
    def _get_twilio_phone_number(self):
        """Get available Twilio phone number for sending SMS"""
        if self.client:
            try:
                incoming_numbers = self.client.incoming_phone_numbers.list(limit=1)
                if incoming_numbers:
                    self.from_number = incoming_numbers[0].phone_number
                    print(f"✅ Twilio phone: {self.from_number[:7]}****")
                else:
                    print("⚠️ No Twilio phone numbers found. Get one at console.twilio.com")
            except Exception as e:
                print(f"⚠️ Could not retrieve Twilio phone number: {e}")
    
    def _get_connection(self):
        """Get database connection"""
        if not self.db_url:
            raise ValueError("DATABASE_URL not set")
        return psycopg2.connect(self.db_url)
    
    def _init_database(self):
        """Create phone_verifications table"""
        if not self.db_url:
            return
            
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS phone_verifications (
                        id SERIAL PRIMARY KEY,
                        phone_number VARCHAR(20) NOT NULL,
                        purpose VARCHAR(50) NOT NULL,
                        code_hash VARCHAR(64) NOT NULL,
                        user_id VARCHAR(255),
                        status VARCHAR(20) DEFAULT 'pending',
                        attempts INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP NOT NULL,
                        verified_at TIMESTAMP,
                        last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone 
                    ON phone_verifications(phone_number, status)
                """)
                
                conn.commit()
                print("✅ Phone verifications table initialized")
        except Exception as e:
            print(f"❌ Database init error: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def _generate_code(self) -> str:
        """Generate a secure 6-digit verification code"""
        return ''.join(random.choices(string.digits, k=self.CODE_LENGTH))
    
    def _hash_code(self, code: str) -> str:
        """Hash the verification code for secure storage"""
        return hashlib.sha256(code.encode()).hexdigest()
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number to E.164 format"""
        phone = ''.join(c for c in phone if c.isdigit() or c == '+')
        if not phone.startswith('+'):
            if phone.startswith('1') and len(phone) == 11:
                phone = '+' + phone
            elif len(phone) == 10:
                phone = '+1' + phone
            else:
                phone = '+' + phone
        return phone
    
    def can_send_code(self, phone: str) -> Tuple[bool, str]:
        """Check if we can send a new code (rate limiting)"""
        phone = self._normalize_phone(phone)
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT last_sent_at, attempts 
                    FROM phone_verifications
                    WHERE phone_number = %s AND status = 'pending'
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (phone,))
                
                row = cur.fetchone()
                if row:
                    last_sent, attempts = row
                    
                    if attempts >= self.MAX_ATTEMPTS:
                        return False, "Too many attempts. Please wait 15 minutes."
                    
                    if last_sent:
                        seconds_since = (datetime.now() - last_sent).total_seconds()
                        if seconds_since < self.COOLDOWN_SECONDS:
                            wait = int(self.COOLDOWN_SECONDS - seconds_since)
                            return False, f"Please wait {wait} seconds before requesting a new code."
                
                return True, "OK"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()
    
    def send_verification_code(self, phone: str, purpose: str = 'user_self', 
                                user_id: Optional[str] = None) -> Dict:
        """
        Send a verification code via SMS
        
        Args:
            phone: Phone number to verify
            purpose: 'user_self' for own phone, 'friend_invite' for friend verification
            user_id: Wallet address of the user initiating verification
            
        Returns:
            Dict with success status and message
        """
        phone = self._normalize_phone(phone)
        
        can_send, message = self.can_send_code(phone)
        if not can_send:
            return {'success': False, 'error': message}
        
        code = self._generate_code()
        code_hash = self._hash_code(code)
        expires_at = datetime.now() + timedelta(minutes=self.CODE_EXPIRY_MINUTES)
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE phone_verifications 
                    SET status = 'expired'
                    WHERE phone_number = %s AND status = 'pending'
                """, (phone,))
                
                cur.execute("""
                    INSERT INTO phone_verifications 
                    (phone_number, purpose, code_hash, user_id, expires_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """, (phone, purpose, code_hash, user_id, expires_at))
                
                verification_id = cur.fetchone()[0]
                conn.commit()
                
                sms_sent = self._send_sms(phone, code)
                
                if sms_sent:
                    return {
                        'success': True,
                        'message': f'Verification code sent to {phone[:6]}****{phone[-2:]}',
                        'verification_id': verification_id,
                        'expires_in': self.CODE_EXPIRY_MINUTES
                    }
                else:
                    return {
                        'success': True,
                        'message': f'Twilio SMS not configured. Code displayed for testing only.',
                        'demo_code': code,
                        'demo_mode': True,
                        'verification_id': verification_id,
                        'expires_in': self.CODE_EXPIRY_MINUTES,
                        'warning': 'Demo mode - SMS not sent. Configure Twilio phone number for production.'
                    }
                    
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def _send_sms(self, phone: str, code: str) -> bool:
        """Send SMS via Twilio"""
        if not self.client or not self.from_number:
            print(f"📱 Demo SMS to {phone}: Your NexusOS verification code is {code}")
            return False
        
        try:
            message = self.client.messages.create(
                body=f"Your NexusOS verification code is: {code}. Valid for {self.CODE_EXPIRY_MINUTES} minutes.",
                from_=self.from_number,
                to=phone
            )
            print(f"✅ SMS sent to {phone[:6]}**** (SID: {message.sid})")
            return True
        except Exception as e:
            print(f"❌ SMS send error: {e}")
            return False
    
    def verify_code(self, phone: str, code: str) -> Dict:
        """
        Verify a submitted code
        
        Args:
            phone: Phone number being verified
            code: Code submitted by user
            
        Returns:
            Dict with success status
        """
        phone = self._normalize_phone(phone)
        code_hash = self._hash_code(code)
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, code_hash, expires_at, attempts, purpose, user_id
                    FROM phone_verifications
                    WHERE phone_number = %s AND status = 'pending'
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (phone,))
                
                row = cur.fetchone()
                
                if not row:
                    return {'success': False, 'error': 'No pending verification found. Request a new code.'}
                
                ver_id, stored_hash, expires_at, attempts, purpose, user_id = row
                
                if datetime.now() > expires_at:
                    cur.execute("""
                        UPDATE phone_verifications SET status = 'expired' WHERE id = %s
                    """, (ver_id,))
                    conn.commit()
                    return {'success': False, 'error': 'Code expired. Request a new code.'}
                
                if attempts >= self.MAX_ATTEMPTS:
                    return {'success': False, 'error': 'Too many failed attempts. Request a new code.'}
                
                if code_hash != stored_hash:
                    cur.execute("""
                        UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = %s
                    """, (ver_id,))
                    conn.commit()
                    remaining = self.MAX_ATTEMPTS - attempts - 1
                    return {'success': False, 'error': f'Invalid code. {remaining} attempts remaining.'}
                
                cur.execute("""
                    UPDATE phone_verifications 
                    SET status = 'verified', verified_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (ver_id,))
                conn.commit()
                
                return {
                    'success': True,
                    'message': 'Phone number verified!',
                    'phone': phone,
                    'purpose': purpose,
                    'user_id': user_id
                }
                
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
        finally:
            conn.close()
    
    def is_phone_verified(self, phone: str, purpose: str = 'user_self', 
                          within_hours: int = 24) -> bool:
        """Check if a phone was recently verified"""
        phone = self._normalize_phone(phone)
        
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT verified_at FROM phone_verifications
                    WHERE phone_number = %s 
                      AND purpose = %s 
                      AND status = 'verified'
                      AND verified_at > NOW() - INTERVAL '%s hours'
                    ORDER BY verified_at DESC
                    LIMIT 1
                """, (phone, purpose, within_hours))
                
                return cur.fetchone() is not None
        except Exception:
            return False
        finally:
            conn.close()
    
    def cleanup_expired(self):
        """Clean up expired verification records"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE phone_verifications 
                    SET status = 'expired'
                    WHERE status = 'pending' AND expires_at < NOW()
                """)
                
                cur.execute("""
                    DELETE FROM phone_verifications
                    WHERE created_at < NOW() - INTERVAL '7 days'
                """)
                
                conn.commit()
        except Exception as e:
            print(f"Cleanup error: {e}")
            conn.rollback()
        finally:
            conn.close()


_verification_service = None

def get_verification_service() -> TwilioVerificationService:
    """Get or create the global verification service instance"""
    global _verification_service
    if _verification_service is None:
        _verification_service = TwilioVerificationService()
    return _verification_service


def send_verification(phone: str, purpose: str = 'user_self', user_id: str = None) -> Dict:
    """Convenience function to send verification code"""
    service = get_verification_service()
    return service.send_verification_code(phone, purpose, user_id)


def verify_phone(phone: str, code: str) -> Dict:
    """Convenience function to verify a code"""
    service = get_verification_service()
    return service.verify_code(phone, code)


def is_verified(phone: str, purpose: str = 'user_self') -> bool:
    """Convenience function to check verification status"""
    service = get_verification_service()
    return service.is_phone_verified(phone, purpose)
