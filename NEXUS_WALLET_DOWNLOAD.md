# 🔐 Download NexusOS Native Wallet

## What is NexusOS Wallet?

A quantum-resistant mobile-first wallet for **NXT tokens** and **WNSP messaging** on the NexusOS blockchain.

### 🌟 Features

- ✅ **NXT Token Management**: Send, receive, and track native NXT tokens
- ✅ **WNSP v2.0 Messaging**: Quantum-encrypted wavelength-based messaging
- ✅ **Quantum-Resistant Security**: Multi-spectral signatures and wave interference
- ✅ **Mobile-First**: Designed for NexusOS's phone-based blockchain network
- ✅ **DAG Messaging**: Peer-to-peer communication via directed acyclic graph
- ✅ **E=hf Cost Model**: Physics-based message pricing

---

## 📥 Quick Download & Install

### Option 1: Direct Install (Python Required)

```bash
# Download from Replit
# Files are in the project root directory

# Install dependencies
pip install -r requirements.txt

# Run the wallet
python nexus_wallet_cli.py --help
```

### Option 2: Clone from Repository

```bash
git clone <your-nexusos-repo>
cd nexusos
pip install -r requirements.txt
python nexus_wallet_cli.py --help
```

---

## 🚀 Quick Start

### Create Your First Wallet

```bash
python nexus_wallet_cli.py create --initial-balance 100.0
```

You'll be prompted for a password. **Save it securely!**

### Check Balance

```bash
python nexus_wallet_cli.py balance NXSYOURADDRESS
```

### Send NXT Tokens

```bash
python nexus_wallet_cli.py send \
  --from NXSYOURADDRESS \
  --to NXSRECIPIENT \
  --amount 10.0
```

### Send WNSP Message

```bash
python nexus_wallet_cli.py message \
  --from NXSYOURADDRESS \
  --content "Hello from NexusOS!" \
  --region VISIBLE_BLUE
```

### View Transaction History

```bash
python nexus_wallet_cli.py history NXSYOURADDRESS
```

### List All Wallets

```bash
python nexus_wallet_cli.py list
```

---

## 🎨 Interactive Dashboard

Launch the Streamlit UI:

```bash
streamlit run app.py --server.port 5000
```

Then navigate to **🔐 Web3 Wallet** in the sidebar.

---

## 📦 What's Included

### Core Files

| File | Purpose |
|------|---------|
| `nexus_native_wallet.py` | Core wallet logic |
| `nexus_wallet_cli.py` | Command-line interface |
| `native_token.py` | NXT token system |
| `wnsp_protocol_v2.py` | Quantum messaging protocol |
| `wavelength_validator.py` | Quantum security |

### Database

Wallet data stored in SQLite:
- `nexus_native_wallet.db` - Created automatically
- Contains wallets, transactions, and messages

---

## 🔒 Security Features

### Quantum-Resistant Encryption

1. **Multi-Spectral Signatures**: Each wallet uses 4 spectral regions (UV, Red, Green, IR)
2. **Wave Interference Hashing**: SHA-512 with wave superposition
3. **PBKDF2 Key Derivation**: 100,000 iterations
4. **E=hf Energy Proofs**: Physics-based transaction validation

### Private Key Protection

- Encrypted with password + quantum public key
- Never stored in plaintext
- XOR encryption with PBKDF2-derived keys

---

## 💾 System Requirements

- **Python**: 3.8 or higher
- **OS**: Linux, macOS, Windows
- **RAM**: 256MB minimum
- **Disk**: 50MB for wallet + database
- **Network**: For NexusOS mobile DAG network

---

## 📖 CLI Reference

### Commands

| Command | Description |
|---------|-------------|
| `create` | Create new quantum wallet |
| `balance` | Check NXT balance |
| `send` | Send NXT tokens |
| `message` | Send WNSP quantum message |
| `history` | View transaction history |
| `messages` | View message history |
| `list` | List all wallets |

### Examples

**Create wallet with initial balance:**
```bash
python nexus_wallet_cli.py create --initial-balance 1000.0
```

**Send tokens with custom fee:**
```bash
python nexus_wallet_cli.py send \
  --from NXSADDRESS1 \
  --to NXSADDRESS2 \
  --amount 50.0 \
  --fee 0.05
```

**Send broadcast message:**
```bash
python nexus_wallet_cli.py message \
  --from NXSADDRESS \
  --content "Hello NexusOS network!" \
  --region VISIBLE_RED
```

---

## 🌈 WNSP Spectral Regions

Choose wavelength region for messages:

| Region | Wavelength | Use Case |
|--------|-----------|----------|
| `UV` | 100-400nm | High-security messages |
| `VISIBLE_VIOLET` | 380-450nm | Private communications |
| `VISIBLE_BLUE` | 450-495nm | Default messages (recommended) |
| `VISIBLE_GREEN` | 495-570nm | Public broadcasts |
| `VISIBLE_RED` | 620-750nm | Announcements |
| `NEAR_IR` | 750-1400nm | Low-cost messages |

---

## 🔧 Configuration

Create `.env` file:

```env
# Database (optional)
DATABASE_URL=sqlite:///nexus_native_wallet.db

# Or use PostgreSQL
# DATABASE_URL=postgresql://user:pass@localhost/nexus_wallet
```

---

## 📱 Mobile-First Blockchain

NexusOS wallets connect to the mobile DAG network:

1. **Your phone is a node** - No central servers
2. **WNSP messaging** - Peer-to-peer communication
3. **DAG structure** - Messages link to parents
4. **Wavelength validation** - Quantum-resistant consensus

---

## 🆘 Troubleshooting

### Command Not Found

```bash
# Run directly
python nexus_wallet_cli.py --help

# Or add to PATH
export PATH="$PATH:$(pwd)"
```

### Database Errors

```bash
# Reset database
rm nexus_native_wallet.db

# Wallet will create fresh database
python nexus_wallet_cli.py create
```

### Insufficient Balance

- Check balance: `python nexus_wallet_cli.py balance YOUR_ADDRESS`
- Create with balance: `python nexus_wallet_cli.py create --initial-balance 100.0`

---

## 🌟 Unique Features

### Physics-Based Security

- **E=hf Pricing**: Messages cost based on electromagnetic energy
- **Wave Interference**: Quantum-resistant transaction hashing
- **Spectral Diversity**: Multi-region signature verification

### Mobile-First Design

- Lightweight (runs on phones)
- DAG messaging (no blockchain bloat)
- Peer-to-peer (no servers)
- Offline-capable (sync when online)

---

## 📚 Learn More

- **NexusOS Docs**: See `replit.md`
- **WNSP Protocol**: Check `MOBILE_FIRST_BLOCKCHAIN_OS.md`
- **Wave Theory**: Review `wavelength_validator.py`

---

## 🤝 Support

- **Issues**: Report in project
- **Questions**: Check documentation
- **Security**: Report vulnerabilities privately

---

## ⚠️ Important Notes

1. **Test with small amounts first**
2. **Backup your wallet database**
3. **Never share your password**
4. **Save your wallet address**
5. **NXT tokens are native to NexusOS blockchain** (not Ethereum/BSC)

---

## 🎯 Next Steps

1. ✅ Install the wallet
2. ✅ Create your first wallet
3. ✅ Send test transactions
4. ✅ Try WNSP messaging
5. ✅ Export quantum proofs
6. ✅ Connect to mobile network

---

**🔐 Welcome to NexusOS - The Mobile-First Quantum Blockchain!**

Made with ❤️ using wavelength cryptography
