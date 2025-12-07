"""
NexusOS Web3 Wallet - Setup Configuration
==========================================
Quantum-resistant cryptocurrency wallet with wavelength encryption.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="nexus-web3-wallet",
    version="1.0.0",
    author="NexusOS Team",
    author_email="support@nexusos.io",
    description="Quantum-resistant Web3 wallet with wavelength encryption",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/nexusos/web3-wallet",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Intended Audience :: Financial and Insurance Industry",
        "Topic :: Security :: Cryptography",
        "Topic :: Office/Business :: Financial",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "nexus-wallet-cli=nexus_wallet.cli:main",
            "nexus-wallet-ui=nexus_wallet.ui:main",
        ],
    },
    include_package_data=True,
    package_data={
        "nexus_wallet": ["*.py", "data/*"],
    },
    keywords="web3 cryptocurrency wallet quantum-resistant blockchain ethereum",
    project_urls={
        "Bug Reports": "https://github.com/nexusos/web3-wallet/issues",
        "Documentation": "https://docs.nexusos.io/wallet",
        "Source": "https://github.com/nexusos/web3-wallet",
    },
)
