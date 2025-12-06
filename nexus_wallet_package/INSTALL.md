# NexusOS Web3 Wallet - Installation Guide

## Installation Methods

### Method 1: pip Install (Recommended)

The simplest way to install:

```bash
pip install nexus-web3-wallet
```

Verify installation:
```bash
nexus-wallet-cli --version
```

### Method 2: From Source

For developers or latest features:

```bash
# Clone repository
git clone https://github.com/nexusos/web3-wallet.git
cd web3-wallet/nexus_wallet_package

# Install in development mode
pip install -e .
```

### Method 3: Virtual Environment (Recommended for Isolation)

Create an isolated environment:

```bash
# Create virtual environment
python -m venv nexus-env

# Activate (Linux/Mac)
source nexus-env/bin/activate

# Activate (Windows)
nexus-env\Scripts\activate

# Install wallet
pip install nexus-web3-wallet

# Verify
nexus-wallet-cli --version
```

### Method 4: Docker (Advanced Users)

Run in container without installing Python:

```bash
# Build image
cd nexus_wallet_package
docker build -t nexus-wallet .

# Run UI mode
docker run -it -p 5000:5000 \
  -v $(pwd)/wallet_data:/data \
  nexus-wallet

# Run CLI mode
docker run -it nexus-wallet \
  nexus-wallet-cli create
```

---

## Quick Start

### 1. Create Your First Wallet

```bash
# CLI
nexus-wallet-cli create

# Or launch UI
nexus-wallet-ui
```

### 2. Import Existing Wallet

```bash
nexus-wallet-cli import-wallet
# Enter your private key when prompted
```

### 3. Check Balance

```bash
nexus-wallet-cli balance 0xYourAddress
```

### 4. Send Transaction

```bash
nexus-wallet-cli send \
  --from 0xYourAddress \
  --to 0xRecipientAddress \
  --amount 0.1 \
  --network ethereum_sepolia
```

---

## Configuration

### Environment Variables

Create `.env` file in your working directory:

```env
# Database
DATABASE_URL=sqlite:///nexus_wallet.db

# Default network (optional)
NEXUS_DEFAULT_NETWORK=ethereum_sepolia

# Custom RPC URLs (optional)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BSC_RPC_URL=https://bsc-dataseed.binance.org
```

### Database Options

#### SQLite (Default)
No setup needed - automatically created

#### PostgreSQL (Production)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/nexus_wallet
```

---

## Platform-Specific Instructions

### macOS

```bash
# Install Python 3.11 if needed
brew install python@3.11

# Install wallet
pip3 install nexus-web3-wallet

# Run
nexus-wallet-ui
```

### Linux (Ubuntu/Debian)

```bash
# Install Python and dependencies
sudo apt update
sudo apt install python3.11 python3-pip python3-venv

# Install wallet
pip3 install nexus-web3-wallet

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Run
nexus-wallet-ui
```

### Windows

```powershell
# Install Python 3.11 from python.org

# Install wallet
pip install nexus-web3-wallet

# Run
nexus-wallet-ui
```

---

## Troubleshooting

### Command Not Found

If `nexus-wallet-cli` is not found:

```bash
# Check installation
pip show nexus-web3-wallet

# Add to PATH (Linux/Mac)
export PATH="$HOME/.local/bin:$PATH"

# Or run directly
python -m nexus_wallet.cli --help
```

### Permission Errors

```bash
# Install for user only
pip install --user nexus-web3-wallet

# Or use sudo (not recommended)
sudo pip install nexus-web3-wallet
```

### Database Errors

```bash
# Reset database
rm nexus_wallet.db

# Or use PostgreSQL
export DATABASE_URL=postgresql://localhost/nexus_wallet
```

### Port Already in Use (UI Mode)

```bash
# Change port
STREAMLIT_SERVER_PORT=8080 nexus-wallet-ui

# Or find and kill process
lsof -ti:5000 | xargs kill -9
```

---

## Upgrading

```bash
# Upgrade to latest version
pip install --upgrade nexus-web3-wallet

# Check version
nexus-wallet-cli --version
```

---

## Uninstallation

```bash
# Remove wallet
pip uninstall nexus-web3-wallet

# Remove data (optional)
rm -rf nexus_wallet.db wallet_data/
```

---

## Next Steps

1. **Read the docs**: https://docs.nexusos.io/wallet
2. **Try testnet**: Use `ethereum_sepolia` network first
3. **Secure your wallet**: Keep password safe, enable 2FA
4. **Explore features**: Check quantum security proofs

---

## Support

- **Issues**: https://github.com/nexusos/web3-wallet/issues
- **Discord**: https://discord.gg/nexusos
- **Email**: support@nexusos.io

---

**🔐 Welcome to quantum-resistant Web3!**
