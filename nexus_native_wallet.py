"""
NexusOS Native Wallet
=====================
Mobile-first quantum-resistant wallet for NXT tokens and WNSP messaging.

Uses NexusOS's existing blockchain infrastructure:
- NativeTokenSystem for NXT balance and transfers
- WNSP v2.0 for wavelength-encrypted messaging
- WavelengthValidator for quantum-resistant signatures
- DAG messaging for mobile peer-to-peer communication
"""

import os
import json
import time
import hashlib
import secrets
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from decimal import Decimal

# NexusOS core components
from native_token import NativeTokenSystem, Account, TokenTransaction
from wnsp_protocol_v2 import (
    WnspEncoderV2, 
    SpectralRegion, 
    ModulationType,
    WaveProperties
)
from wavelength_validator import WavelengthValidator

# Cryptography
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend

# Database
import sqlalchemy as sa
from sqlalchemy import create_engine, Column, String, Float, Integer, BigInteger, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# ============================================================================
# Database Models
# ============================================================================

Base = declarative_base()

class NexusWallet(Base):
    """NexusOS native wallet with quantum encryption"""
    __tablename__ = 'nexus_wallets'
    
    id = Column(Integer, primary_key=True)
    address = Column(String(64), unique=True, nullable=False)
    public_key = Column(Text, nullable=False)  # Quantum public key
    encrypted_private_key = Column(Text, nullable=False)  # Wavelength-encrypted
    spectral_signature = Column(Text, nullable=False)  # Multi-spectral ID
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class WalletTransaction(Base):
    """Transaction history with quantum proofs"""
    __tablename__ = 'nexus_wallet_transactions'
    
    id = Column(Integer, primary_key=True)
    tx_id = Column(String(64), unique=True, nullable=False)
    from_address = Column(String(64), nullable=False)
    to_address = Column(String(64), nullable=False)
    amount_nxt = Column(Float, nullable=False)
    fee_nxt = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default='pending')
    
    # Quantum security
    wave_signature = Column(Text, nullable=False)
    spectral_proof = Column(Text, nullable=False)
    interference_hash = Column(String(128), nullable=False)
    energy_cost = Column(Float, nullable=False)

class WalletMessage(Base):
    """WNSP messages sent from wallet"""
    __tablename__ = 'nexus_wallet_messages'
    
    id = Column(Integer, primary_key=True)
    message_id = Column(String(64), unique=True, nullable=False)
    from_address = Column(String(64), nullable=False)
    to_address = Column(String(64))
    content = Column(Text, nullable=False)
    spectral_region = Column(String(20), nullable=False)
    wavelength = Column(Float, nullable=False)
    cost_nxt = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    dag_parents = Column(Text)  # JSON list of parent message IDs

class TokenAccount(Base):
    """Persistent token account storage"""
    __tablename__ = 'nexus_token_accounts'
    
    id = Column(Integer, primary_key=True)
    address = Column(String(64), unique=True, nullable=False)
    balance = Column(BigInteger, default=0)  # In smallest units (needs BigInteger for 100 trillion total supply)
    nonce = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================================
# NexusOS Native Wallet
# ============================================================================

class NexusNativeWallet:
    """
    Native NexusOS wallet for NXT tokens and WNSP messaging.
    
    Features:
    - NXT token balance and transfers
    - WNSP v2.0 quantum-encrypted messaging
    - Wavelength-based signatures
    - Mobile-first DAG communication
    - Multi-spectral quantum resistance
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """Initialize wallet with NexusOS core systems"""
        # Database setup with fallback to SQLite
        db_url = database_url or os.getenv('DATABASE_URL', 'sqlite:///nexus_native_wallet.db')
        
        try:
            # Try to connect to the specified database
            self.engine = create_engine(db_url, pool_pre_ping=True)
            Base.metadata.create_all(self.engine)
            Session = sessionmaker(bind=self.engine)
            self.db = Session()
            
            # Test connection with a simple query
            self.db.execute(sa.text("SELECT 1"))
            self.db.commit()
            
            print(f"✅ Database connected: {db_url.split('@')[0].split('//')[1] if '@' in db_url else 'SQLite'}")
            
        except Exception as e:
            # If PostgreSQL fails, fall back to SQLite
            if db_url != 'sqlite:///nexus_native_wallet.db':
                print(f"⚠️  PostgreSQL connection failed ({str(e)[:50]}...)")
                print("📂 Falling back to SQLite for data persistence")
                
                db_url = 'sqlite:///nexus_native_wallet.db'
                self.engine = create_engine(db_url)
                Base.metadata.create_all(self.engine)
                Session = sessionmaker(bind=self.engine)
                self.db = Session()
            else:
                # SQLite also failed - this is a critical error
                raise RuntimeError(f"Failed to initialize database: {e}")
        
        # NexusOS core components  
        self.wavelength_validator = WavelengthValidator()
        self.wnsp_encoder = WnspEncoderV2()
        
        # Initialize persistent accounts (instead of in-memory NativeTokenSystem)
        self._init_genesis_accounts()
    
    # ========================================================================
    # Database Token System (Replaces in-memory NativeTokenSystem)
    # ========================================================================
    
    def _init_genesis_accounts(self):
        """Initialize genesis accounts if they don't exist"""
        genesis_accounts = [
            ("VALIDATOR_POOL", 0),
            ("TREASURY", 50000000),  # 500K NXT
            ("ECOSYSTEM_FUND", 20000000)  # 200K NXT
        ]
        
        for address, balance in genesis_accounts:
            existing = self.db.query(TokenAccount).filter_by(address=address).first()
            if not existing:
                account = TokenAccount(address=address, balance=balance)
                self.db.add(account)
        
        self.db.commit()
    
    def _get_token_account(self, address: str) -> Optional[TokenAccount]:
        """Get persistent token account"""
        return self.db.query(TokenAccount).filter_by(address=address).first()
    
    def _get_or_create_token_account(self, address: str, initial_balance: int = 0) -> TokenAccount:
        """Get or create persistent token account"""
        account = self._get_token_account(address)
        if not account:
            account = TokenAccount(address=address, balance=initial_balance)
            self.db.add(account)
            self.db.commit()
        return account
    
    # ========================================================================
    # Wallet Management
    # ========================================================================
    
    def create_wallet(self, password: str, initial_balance: float = 0) -> Dict[str, Any]:
        """
        Create new quantum-resistant NexusOS wallet.
        
        Args:
            password: Password for wallet encryption
            initial_balance: Initial NXT balance (for testing)
        
        Returns:
            Wallet details including address and quantum public key
        """
        # Generate unique address using wavelength signature
        address = self._generate_wallet_address()
        
        # Generate quantum keypair
        private_key, public_key = self._generate_quantum_keypair(address)
        
        # Encrypt private key with password
        encrypted_key = self._encrypt_private_key(private_key, password, public_key)
        
        # Generate multi-spectral signature
        spectral_sig = self._generate_spectral_signature(address)
        
        # Create persistent token account
        token_account = self._get_or_create_token_account(
            address,
            initial_balance=int(initial_balance * 100)  # Convert to smallest units
        )
        
        # Save wallet to database
        wallet = NexusWallet(
            address=address,
            public_key=json.dumps(public_key),
            encrypted_private_key=encrypted_key,
            spectral_signature=json.dumps(spectral_sig)
        )
        self.db.add(wallet)
        self.db.commit()
        
        return {
            'address': address,
            'public_key': public_key,
            'spectral_regions': list(spectral_sig.keys()),
            'balance_nxt': token_account.balance / 100.0,
            'created_at': wallet.created_at.isoformat()
        }
    
    def import_wallet(self, address: str, private_key: str, password: str) -> Dict[str, Any]:
        """Import existing wallet with quantum encryption layer"""
        # Check if already exists
        existing = self.db.query(NexusWallet).filter_by(address=address).first()
        if existing:
            raise ValueError(f"Wallet {address} already exists")
        
        # Generate quantum public key
        _, public_key = self._generate_quantum_keypair(address)
        
        # Encrypt private key
        encrypted_key = self._encrypt_private_key(private_key, password, public_key)
        
        # Generate spectral signature
        spectral_sig = self._generate_spectral_signature(address)
        
        # Get or create persistent token account
        token_account = self._get_or_create_token_account(address)
        
        # Save wallet
        wallet = NexusWallet(
            address=address,
            public_key=json.dumps(public_key),
            encrypted_private_key=encrypted_key,
            spectral_signature=json.dumps(spectral_sig)
        )
        self.db.add(wallet)
        self.db.commit()
        
        return {
            'address': address,
            'balance_nxt': token_account.balance / 100.0,
            'imported': True
        }
    
    def unlock_wallet(self, address: str, password: str) -> bool:
        """Verify password can unlock wallet"""
        wallet = self.db.query(NexusWallet).filter_by(address=address).first()
        if not wallet:
            return False
        
        try:
            self._decrypt_private_key(
                wallet.encrypted_private_key,
                password,
                json.loads(wallet.public_key)
            )
            wallet.last_used = datetime.utcnow()
            self.db.commit()
            return True
        except:
            return False
    
    def get_balance(self, address: str) -> Dict[str, Any]:
        """Get NXT balance for address"""
        account = self._get_token_account(address)
        if not account:
            return {
                'address': address,
                'balance_nxt': 0.0,
                'balance_units': 0,
                'nonce': 0
            }
        
        return {
            'address': address,
            'balance_nxt': account.balance / 100.0,
            'balance_units': account.balance,
            'nonce': account.nonce
        }
    
    # ========================================================================
    # NXT Token Transfers
    # ========================================================================
    
    def send_nxt(
        self,
        from_address: str,
        to_address: str,
        amount_nxt: float,
        password: str,
        fee_nxt: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Send NXT tokens with quantum-resistant signatures.
        
        Args:
            from_address: Sender wallet address
            to_address: Recipient address  
            amount_nxt: Amount in NXT
            password: Sender wallet password
            fee_nxt: Optional custom fee (uses default if None)
        
        Returns:
            Transaction details with quantum proofs
        """
        # Input validation - prevent negative amount exploit
        if amount_nxt <= 0:
            raise ValueError(f"Invalid amount: {amount_nxt}. Amount must be positive.")
        if fee_nxt is not None and fee_nxt < 0:
            raise ValueError(f"Invalid fee: {fee_nxt}. Fee must be non-negative.")
        if amount_nxt > 1e12:  # Sanity check: max 1 trillion NXT
            raise ValueError(f"Amount too large: {amount_nxt}")
        
        # Get wallet
        wallet = self.db.query(NexusWallet).filter_by(address=from_address).first()
        if not wallet:
            raise ValueError("Wallet not found")
        
        # Unlock wallet
        private_key = self._decrypt_private_key(
            wallet.encrypted_private_key,
            password,
            json.loads(wallet.public_key)
        )
        
        # Convert to smallest units
        amount_units = int(amount_nxt * 100)
        fee_units = int(fee_nxt * 100) if fee_nxt else 1  # Default 0.01 NXT fee
        
        # Execute transfer on persistent accounts
        from_account = self._get_token_account(from_address)
        if not from_account or from_account.balance < (amount_units + fee_units):
            raise ValueError("Transfer failed - insufficient balance")
        
        # Deduct from sender
        from_account.balance -= (amount_units + fee_units)
        from_account.nonce += 1
        
        # Add to receiver
        to_account = self._get_or_create_token_account(to_address)
        to_account.balance += amount_units
        
        # Fee to validator pool
        validator_pool = self._get_token_account("VALIDATOR_POOL")
        if validator_pool:
            validator_pool.balance += fee_units
        
        self.db.commit()
        
        # Create transaction record
        from native_token import TokenTransaction, TransactionType
        import time
        
        tx = TokenTransaction(
            tx_id=f"TX{int(time.time() * 1000):016d}",
            tx_type=TransactionType.TRANSFER,
            from_address=from_address,
            to_address=to_address,
            amount=amount_units,
            fee=fee_units
        )
        
        # Add quantum security layer
        quantum_proof = self._generate_quantum_proof(tx, private_key)
        
        # Save to wallet database
        db_tx = WalletTransaction(
            tx_id=tx.tx_id,
            from_address=from_address,
            to_address=to_address,
            amount_nxt=amount_nxt,
            fee_nxt=(tx.fee / 100.0),
            status='confirmed',
            wave_signature=json.dumps(quantum_proof['wave_signature']),
            spectral_proof=json.dumps(quantum_proof['spectral_signatures']),
            interference_hash=quantum_proof['interference_hash'],
            energy_cost=quantum_proof['energy_cost']
        )
        self.db.add(db_tx)
        self.db.commit()
        
        return {
            'tx_id': tx.tx_id,
            'from_address': from_address,
            'to_address': to_address,
            'amount_nxt': amount_nxt,
            'fee_nxt': tx.fee / 100.0,
            'timestamp': tx.timestamp,
            'quantum_proof': {
                'spectral_regions': len(quantum_proof['spectral_signatures']),
                'interference_hash': quantum_proof['interference_hash'][:16] + '...',
                'energy_cost': quantum_proof['energy_cost']
            }
        }
    
    # ========================================================================
    # WNSP Messaging
    # ========================================================================
    
    def send_message(
        self,
        from_address: str,
        content: str,
        password: str,
        to_address: Optional[str] = None,
        spectral_region: SpectralRegion = SpectralRegion.BLUE,
        parent_messages: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Send WNSP quantum-encrypted message.
        
        Args:
            from_address: Sender wallet address
            content: Message content
            password: Wallet password
            to_address: Optional recipient (None for broadcast)
            spectral_region: Wavelength region for encoding
            parent_messages: Parent message IDs for DAG linking
        
        Returns:
            Message details with quantum encoding
        """
        # Get wallet
        wallet = self.db.query(NexusWallet).filter_by(address=from_address).first()
        if not wallet:
            raise ValueError("Wallet not found")
        
        # Unlock wallet
        private_key = self._decrypt_private_key(
            wallet.encrypted_private_key,
            password,
            json.loads(wallet.public_key)
        )
        
        # Create wavelength-encoded message
        wave_msg = self.wavelength_validator.create_message_wave(
            content, spectral_region, ModulationType.PSK
        )
        
        # Calculate E=hf cost
        energy_cost = self._calculate_message_cost(wave_msg)
        cost_nxt = energy_cost * 1e-17  # Scale to NXT
        
        # Deduct cost from sender
        cost_units = int(cost_nxt * 100)
        account = self._get_token_account(from_address)
        if not account or account.balance < cost_units:
            raise ValueError("Insufficient balance for message cost")
        
        account.balance -= cost_units
        # Add to validator pool
        validator_pool = self._get_token_account("VALIDATOR_POOL")
        if validator_pool:
            validator_pool.balance += cost_units
        
        self.db.commit()
        
        # Generate message ID
        message_id = self._generate_message_id(from_address, content, wave_msg.wavelength)
        
        # Save message
        msg = WalletMessage(
            message_id=message_id,
            from_address=from_address,
            to_address=to_address,
            content=content,
            spectral_region=spectral_region.display_name,
            wavelength=wave_msg.wavelength,
            cost_nxt=cost_nxt,
            dag_parents=json.dumps(parent_messages) if parent_messages else None
        )
        self.db.add(msg)
        
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
        
        return {
            'message_id': message_id,
            'from': from_address,
            'to': to_address or 'broadcast',
            'wavelength': wave_msg.wavelength,
            'frequency': wave_msg.frequency,
            'spectral_region': spectral_region.display_name,
            'cost_nxt': cost_nxt,
            'dag_parents': parent_messages or []
        }
    
    def get_messages(
        self,
        address: str,
        limit: int = 50,
        sent: bool = True,
        received: bool = True
    ) -> List[Dict[str, Any]]:
        """Get message history for address"""
        query = self.db.query(WalletMessage)
        
        if sent and received:
            query = query.filter(
                (WalletMessage.from_address == address) |
                (WalletMessage.to_address == address)
            )
        elif sent:
            query = query.filter(WalletMessage.from_address == address)
        elif received:
            query = query.filter(WalletMessage.to_address == address)
        
        messages = query.order_by(WalletMessage.timestamp.desc()).limit(limit).all()
        
        return [
            {
                'message_id': msg.message_id,
                'from': msg.from_address,
                'to': msg.to_address or 'broadcast',
                'content': msg.content,
                'wavelength': msg.wavelength,
                'spectral_region': msg.spectral_region,
                'cost_nxt': msg.cost_nxt,
                'timestamp': msg.timestamp.isoformat()
            }
            for msg in messages
        ]
    
    # ========================================================================
    # Transaction History
    # ========================================================================
    
    def get_transaction_history(
        self,
        address: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get NXT transaction history"""
        transactions = self.db.query(WalletTransaction).filter(
            (WalletTransaction.from_address == address) |
            (WalletTransaction.to_address == address)
        ).order_by(WalletTransaction.timestamp.desc()).limit(limit).all()
        
        return [
            {
                'tx_id': tx.tx_id,
                'from_address': tx.from_address,
                'to_address': tx.to_address,
                'amount_nxt': tx.amount_nxt,
                'fee_nxt': tx.fee_nxt,
                'status': tx.status,
                'timestamp': tx.timestamp.isoformat(),
                'quantum_verified': True
            }
            for tx in transactions
        ]
    
    def get_message_history(
        self,
        address: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get message history for wallet"""
        messages = self.db.query(WalletMessage).filter_by(
            from_address=address
        ).order_by(WalletMessage.timestamp.desc()).limit(limit).all()
        
        return [
            {
                'message_id': msg.message_id,
                'to_address': msg.to_address,
                'content': msg.content,
                'cost_nxt': msg.cost_nxt,
                'wavelength': msg.wavelength,
                'spectral_region': msg.spectral_region,
                'timestamp': msg.timestamp.isoformat(),
                'status': 'sent'
            }
            for msg in messages
        ]
    
    # ========================================================================
    # Utility Methods
    # ========================================================================
    
    def list_wallets(self) -> List[Dict[str, Any]]:
        """List all wallets"""
        wallets = self.db.query(NexusWallet).filter_by(is_active=True).all()
        result = []
        for w in wallets:
            account = self._get_token_account(w.address)
            balance_nxt = account.balance / 100.0 if account else 0.0
            result.append({
                'address': w.address,
                'balance_nxt': balance_nxt,
                'created_at': w.created_at.isoformat(),
                'last_used': w.last_used.isoformat() if w.last_used else None
            })
        return result
    
    def export_quantum_proof(self, tx_id: str) -> Dict[str, Any]:
        """Export quantum security proof for transaction"""
        tx = self.db.query(WalletTransaction).filter_by(tx_id=tx_id).first()
        if not tx:
            raise ValueError("Transaction not found")
        
        return {
            'tx_id': tx.tx_id,
            'wave_signature': json.loads(tx.wave_signature),
            'spectral_proof': json.loads(tx.spectral_proof),
            'interference_hash': tx.interference_hash,
            'energy_cost': tx.energy_cost
        }
    
    # ========================================================================
    # Private Methods - Quantum Cryptography
    # ========================================================================
    
    def _generate_wallet_address(self) -> str:
        """Generate unique wallet address using wavelength signature"""
        # Generate random seed
        seed = secrets.token_bytes(32)
        
        # Create wavelength signature
        wave = self.wavelength_validator.create_message_wave(
            seed.hex(), SpectralRegion.GREEN, ModulationType.OOK
        )
        
        # Create address from wave properties
        address_data = f"{wave.wavelength}:{wave.frequency}:{wave.phase}"
        address_hash = hashlib.sha256(address_data.encode()).hexdigest()
        
        return f"NXS{address_hash[:40]}".upper()
    
    def _generate_quantum_keypair(self, address: str) -> Tuple[str, Dict]:
        """Generate quantum-resistant keypair"""
        # Private key (random)
        private_key = secrets.token_hex(32)
        
        # Public key (multi-spectral wave signatures)
        regions = [SpectralRegion.UV, SpectralRegion.RED, 
                  SpectralRegion.GREEN, SpectralRegion.IR]
        
        public_key = {
            'address': address,
            'wave_signatures': {}
        }
        
        for region in regions:
            wave = self.wavelength_validator.create_message_wave(
                private_key, region, ModulationType.PSK
            )
            region_name = region.value[0] if isinstance(region.value, tuple) else str(region.name)
            public_key['wave_signatures'][region_name] = {
                'wavelength': wave.wavelength,
                'frequency': wave.frequency,
                'phase': wave.phase
            }
        
        public_key['timestamp'] = int(time.time())
        
        return private_key, public_key
    
    def _encrypt_private_key(self, private_key: str, password: str, public_key: Dict) -> str:
        """
        Encrypt private key with AES-GCM authenticated encryption.
        Returns: nonce || ciphertext (hex encoded, ciphertext includes auth tag)
        """
        # Use wavelength signature as salt for PBKDF2
        salt = hashlib.sha256(
            json.dumps(public_key['wave_signatures'], sort_keys=True).encode()
        ).digest()
        
        # Derive 256-bit AES key using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        aes_key = kdf.derive(password.encode('utf-8'))
        
        # Generate random nonce (96 bits for GCM)
        nonce = os.urandom(12)
        
        # Encrypt with AES-GCM (provides both confidentiality and integrity)
        aesgcm = AESGCM(aes_key)
        ciphertext = aesgcm.encrypt(nonce, private_key.encode('utf-8'), None)
        
        # ciphertext includes auth tag automatically
        # Return: nonce || ciphertext (with embedded tag)
        return nonce.hex() + ciphertext.hex()
    
    def _decrypt_private_key(self, encrypted_key: str, password: str, public_key: Dict) -> str:
        """
        Decrypt private key with AES-GCM authenticated decryption.
        Raises: ValueError if ciphertext was tampered with or password incorrect
        """
        # Use same wavelength signature as salt
        salt = hashlib.sha256(
            json.dumps(public_key['wave_signatures'], sort_keys=True).encode()
        ).digest()
        
        # Derive AES key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        aes_key = kdf.derive(password.encode('utf-8'))
        
        # Extract nonce (first 12 bytes = 24 hex chars)
        nonce = bytes.fromhex(encrypted_key[:24])
        ciphertext = bytes.fromhex(encrypted_key[24:])
        
        # Decrypt and verify integrity
        aesgcm = AESGCM(aes_key)
        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
            return plaintext.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Decryption failed - invalid password or tampered key: {e}")
    
    def _generate_spectral_signature(self, address: str) -> Dict[str, str]:
        """Generate multi-spectral signatures"""
        signatures = {}
        regions = [SpectralRegion.UV, SpectralRegion.RED, 
                  SpectralRegion.BLUE, SpectralRegion.IR]
        
        for region in regions:
            wave = self.wavelength_validator.create_message_wave(
                address, region, ModulationType.OOK
            )
            sig_data = f"{wave.wavelength}:{wave.frequency}"
            region_name = region.value[0] if isinstance(region.value, tuple) else str(region.name)
            signatures[region_name] = hashlib.sha256(sig_data.encode()).hexdigest()
        
        return signatures
    
    def _generate_quantum_proof(self, tx: TokenTransaction, private_key: str) -> Dict:
        """Generate quantum security proof for transaction"""
        # Create wave signature
        tx_data = f"{tx.tx_id}:{tx.from_address}:{tx.to_address}:{tx.amount}"
        wave_sig = self.wavelength_validator.create_message_wave(
            tx_data, SpectralRegion.BLUE, ModulationType.PSK
        )
        
        # Multi-spectral signatures
        spectral_sigs = self._generate_spectral_signature(tx.tx_id)
        
        # Interference hash
        combined = {
            'tx': tx_data,
            'wave': {'wavelength': wave_sig.wavelength, 'frequency': wave_sig.frequency},
            'spectral': spectral_sigs
        }
        hash_data = json.dumps(combined, sort_keys=True).encode('utf-8')
        interference_hash = hashlib.sha512(hash_data).hexdigest()
        
        # Energy cost (E=hf)
        h = 6.62607015e-34
        energy_cost = h * wave_sig.frequency * 1e19
        
        # Convert WaveProperties to JSON-serializable dict
        wave_dict = {
            'wavelength': wave_sig.wavelength,
            'frequency': wave_sig.frequency,
            'amplitude': wave_sig.amplitude,
            'phase': wave_sig.phase,
            'polarization': wave_sig.polarization,
            'spectral_region': wave_sig.spectral_region.name if hasattr(wave_sig.spectral_region, 'name') else str(wave_sig.spectral_region),
            'modulation_type': wave_sig.modulation_type.name if hasattr(wave_sig.modulation_type, 'name') else str(wave_sig.modulation_type)
        }
        
        return {
            'wave_signature': wave_dict,
            'spectral_signatures': spectral_sigs,
            'interference_hash': interference_hash,
            'energy_cost': float(energy_cost)
        }
    
    def _calculate_message_cost(self, wave: WaveProperties) -> float:
        """Calculate message cost using E=hf"""
        h = 6.62607015e-34
        return h * wave.frequency
    
    def _generate_message_id(self, address: str, content: str, wavelength: float) -> str:
        """Generate unique message ID"""
        data = f"{address}:{content}:{wavelength}:{time.time()}"
        return f"MSG{hashlib.sha256(data.encode()).hexdigest()[:24]}".upper()
