"""
NexusOS Web3 Wallet
===================
Quantum-resistant cryptocurrency wallet with wavelength encryption.
"""

__version__ = "1.0.0"
__author__ = "NexusOS Team"
__email__ = "support@nexusos.io"

from .core import NexusWeb3Wallet, NetworkConfig, WalletAccount, QuantumTransaction

__all__ = [
    "NexusWeb3Wallet",
    "NetworkConfig",
    "WalletAccount",
    "QuantumTransaction",
    "__version__",
]
