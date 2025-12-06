# NexusOS Web3 Wallet 🔐

> **Quantum-resistant cryptocurrency wallet with wavelength encryption**

A production-ready Web3 wallet that combines standard blockchain functionality with NexusOS's revolutionary quantum-resistant wavelength cryptography for hacker-proof security against classical and quantum computing attacks.

## ✨ Features

### 🌐 Web3 Integration
- ✅ **Multi-Chain Support**: Ethereum, BSC, Polygon, and more
- ✅ **Real Blockchain Transactions**: Full Web3.py integration
- ✅ **Gas Optimization**: Automatic gas estimation and pricing
- ✅ **Balance Tracking**: Real-time balance updates across chains
- ✅ **Transaction History**: Complete on-chain transaction records

### 🌈 Quantum-Resistant Security
- ✅ **Wavelength Encryption**: WNSP v2.0 quantum cryptography
- ✅ **Multi-Spectral Signatures**: 3+ spectral regions for diversity
- ✅ **Wave Interference Hashing**: Quantum-resistant transaction signing
- ✅ **E=hf Physics Proofs**: Planck equation-based security
- ✅ **Replay Protection**: Cryptographic nonce management

### 💾 Data Persistence
- ✅ **SQLite (Default)**: Lightweight local storage
- ✅ **PostgreSQL Support**: Production-grade database option
- ✅ **Encrypted Storage**: Quantum-encrypted private keys
- ✅ **Transaction Archive**: Complete history with quantum proofs

### 🎨 Dual Interface
- ✅ **CLI Mode**: Fast command-line operations
- ✅ **UI Mode**: Beautiful Streamlit dashboard
- ✅ **Interactive Visualizations**: Real-time quantum security metrics
- ✅ **Multi-Wallet Management**: Manage multiple accounts

---

## 📦 Installation

### Quick Install (Recommended)

```bash
pip install nexus-web3-wallet
```

### From Source

```bash
git clone https://github.com/nexusos/web3-wallet.git
cd web3-wallet/nexus_wallet_package
pip install -e .
```

### With Virtual Environment

```bash
python -m venv nexus-env
source nexus-env/bin/activate  # On Windows: nexus-env\Scripts\activate
pip install nexus-web3-wallet
```

---

## 🚀 Quick Start

### CLI Mode

Create a new quantum-resistant wallet:
```bash
nexus-wallet-cli create --password "your-secure-password"
```

Check balance:
```bash
nexus-wallet-cli balance 0xYourAddress
```

Send transaction:
```bash
nexus-wallet-cli send \
  --from 0xYourAddress \
  --to 0xRecipientAddress \
  --amount 0.1 \
  --password "your-secure-password"
```

### UI Mode

Launch the interactive dashboard:
```bash
nexus-wallet-ui
```

Then open your browser to `http://localhost:5000`

---

## 📖 Usage Examples

### Creating a Wallet

```python
from nexus_wallet import NexusWeb3Wallet

# Initialize wallet
wallet = NexusWeb3Wallet()

# Create new quantum-encrypted account
account = wallet.create_quantum_wallet(password="secure-password")
print(f"Address: {account['address']}")
print(f"Quantum Public Key: {account['quantum_public_key']}")
```

### Sending Transactions

```python
# Send Ethereum with quantum encryption
result = wallet.create_transaction(
    from_address="0xYourAddress",
    to_address="0xRecipient",
    amount_eth="0.1",
    password="secure-password",
    network_key="ethereum_sepolia"  # Use testnet first!
)

print(f"Transaction Hash: {result['tx_hash']}")
print(f"Explorer: {result['explorer_url']}")
print(f"Quantum Security: {result['quantum_security']}")
```

### Checking Transaction Status

```python
# Get transaction status
status = wallet.get_transaction_status(tx_hash="0x...")
print(f"Status: {status['status']}")
print(f"Block: {status['block_number']}")
```

### Exporting Quantum Proofs

```python
# Export quantum security proof
proof = wallet.export_quantum_proof(tx_hash="0x...")
print(f"Wave Signature: {proof['wave_signature']}")
print(f"Spectral Regions: {len(proof['spectral_signatures'])}")
print(f"Energy Cost: {proof['energy_cost_joules']} J")
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in your working directory:

```env
# Database (optional - defaults to SQLite)
DATABASE_URL=postgresql://user:pass@localhost/nexus_wallet

# Default Network (optional - defaults to testnet)
NEXUS_DEFAULT_NETWORK=ethereum_sepolia

# RPC URLs (optional - uses public RPCs by default)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
POLYGON_RPC_URL=https://polygon-rpc.com
```

### Supported Networks

| Network | Chain ID | Currency | Testnet |
|---------|----------|----------|---------|
| Ethereum Mainnet | 1 | ETH | ❌ |
| Ethereum Sepolia | 11155111 | ETH | ✅ |
| BSC Mainnet | 56 | BNB | ❌ |
| Polygon Mainnet | 137 | MATIC | ❌ |

---

## 🔒 Security Features

### Multi-Layer Quantum Resistance

1. **Wavelength Signatures**: Each transaction signed using electromagnetic wave properties
2. **Spectral Diversity**: Signatures from UV, Visible, and IR regions
3. **Wave Interference**: Superposition-based hashing for quantum resistance
4. **Energy Proofs**: E=hf calculations create verifiable physics-based proofs
5. **Multi-Round Hashing**: 10+ rounds of SHA-512 for added security

### Private Key Protection

- Keys encrypted with quantum-derived encryption layer
- Password-based key derivation (PBKDF2, 100,000 iterations)
- Never stored in plaintext
- Quantum public keys for verification

---

## 🐳 Docker Support (Advanced)

### Build Docker Image

```bash
cd nexus_wallet_package
docker build -t nexus-wallet .
```

### Run in Container

```bash
docker run -it \
  -p 5000:5000 \
  -v $(pwd)/wallet_data:/data \
  -e DATABASE_URL=sqlite:////data/nexus_wallet.db \
  nexus-wallet nexus-wallet-ui
```

---

## 🧪 Development

### Running Tests

```bash
pip install -e ".[dev]"
pytest tests/ -v --cov=nexus_wallet
```

### Code Quality

```bash
# Format code
black nexus_wallet/

# Lint
flake8 nexus_wallet/

# Type checking
mypy nexus_wallet/
```

---

## 📚 CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `create` | Create new quantum wallet |
| `import` | Import existing wallet |
| `balance` | Check wallet balance |
| `send` | Send transaction |
| `history` | View transaction history |
| `export-proof` | Export quantum security proof |
| `list` | List all wallets |

### Options

Run `nexus-wallet-cli --help` for full command reference.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation**: https://docs.nexusos.io/wallet
- **Issues**: https://github.com/nexusos/web3-wallet/issues
- **Discord**: https://discord.gg/nexusos
- **Email**: support@nexusos.io

---

## ⚠️ Disclaimer

This wallet is in beta. While we've implemented quantum-resistant security:
- Always test on testnets first
- Never share your password or private keys
- Keep backups of your wallet data
- Use at your own risk for production transactions

---

## 🌟 Acknowledgments

Built on:
- **Web3.py** - Ethereum integration
- **WNSP v2.0** - Quantum-resistant wavelength protocol
- **Streamlit** - Beautiful UI framework
- **SQLAlchemy** - Database ORM

---

**Made with ❤️ by the NexusOS Team**
