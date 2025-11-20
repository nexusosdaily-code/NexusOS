# NexusOS Civilization Operating System

## Overview
NexusOS is a revolutionary civilization architecture built on physics instead of speculation. It replaces binary computation with electromagnetic wave states, anchors economics to quantum energy (E=hf), and guarantees every citizen's basic living standards through the BHLS floor system. The complete system spans 7 integrated modules: Wave Computation, BHLS Floor, Regenerative Circular Economy, Civilization Simulator (Nexus equation), Civic Governance (Proof of Spectrum), Supply Chain & Energy, and Interactive Dashboard.

## User Preferences
- **Communication Style**: Simple, everyday language
- **Technical Approach**: Physics-first, quantum-inspired economics
- **Architecture**: Wavelength-based validation over traditional cryptographic hashing

## System Architecture

### UI/UX Decisions
Interactive dashboards with Streamlit and Plotly provide real-time visualization, including a 6-tab WNSP v2.0 dashboard, an economics dashboard, a DAG network view, and mobile-optimized interfaces. Nexus AI is integrated for analysis, governance, and DAG agent orchestration. User authentication includes sign-in/sign-up, role-based access (viewer, researcher), and a real-time production dashboard with KPIs and alerts.

### Technical Implementations & Feature Specifications
1.  **Economic Simulation Engine**: A comprehensive simulator based on the Nexus equation with self-regulating issuance/burn, PID control, multi-factor ecosystem health, and conservation constraints.
2.  **WNSP v2.0 Protocol (Optical Mesh Networking)**: A quantum cryptography-enabled optical communication protocol with DAG messaging, 64-character encoding across visible/near-IR spectrum, and NXT payment integration with E=hf quantum pricing.
3.  **Wavelength-Economic Validation System**: Replaces SHA-256 with physics-based blockchain validation using Maxwell equation solvers, wave superposition, 5D wave signature validation, and physics-based economics (E=hf). Spectral Diversity Consensus ensures quantum-resistant security.
4.  **Mobile DAG Messaging System**: Mobile-optimized platform leveraging wavelength validation, real-time E=hf cost estimation, interactive DAG visualization, and NXT payment integration.
5.  **Layer 1 Blockchain Simulator**: Supports various consensus mechanisms (PoS, PoW, BFT, DPoS) with real-time transaction processing and validator network simulation.
6.  **Proof of Spectrum (PoS) Consensus**: Wavelength-inspired consensus where validators are assigned spectral regions, using different cryptographic hashes, with wave interference for final validation.
7.  **GhostDAG Ecosystem Optimization**: Implements parallel block processing via the PHANTOM Protocol for increased throughput and reduced orphan rates.
8.  **Nexus Consensus Engine**: Unifies GhostDAG, Proof of Spectrum, and an AI-optimized Nexus Economic Layer for dynamic block rewards.
9.  **DEX (Decentralized Exchange)**: Layer 2 Automated Market Maker using a constant product formula, exclusively using NXT as the base currency, with liquidity pools and 0.3% trading fees to the validator pool.
10. **Enhanced Validator Economics**: Staking and delegation system with a minimum 1,000 NXT stake, configurable commission rates, unbonding period, slashing conditions, and a reputation system.
11. **Native Payment Layer - NexusToken (NXT)**: Bitcoin-style tokenomics with a fixed supply of 1,000,000 NXT (100M units per NXT). Features deflationary mechanics via messaging burns, AI-controlled validator rewards from the VALIDATOR_RESERVE pool, and dynamic burn reduction.
11a. **Orbital Transition Engine**: Replaces token burns with quantum physics-inspired orbital transitions using the Rydberg formula. Message payments trigger electron emissions, with released energy flowing into the TRANSITION_RESERVE pool.
12. **Multi-Agent Network Simulation**: Simulates economic interactions across various network topologies, modeling value transfer, influence, and attack scenarios.
13. **Smart Contract Code Generation**: Automatically generates deployable smart contracts for EVM and Substrate/Polkadot platforms, focusing on audited, gas-optimized, and secure code.
14. **Oracle Integration Framework**: Abstraction layer for external data sources (REST APIs, WebSockets, databases) with error handling, validation, caching, and rate limiting.
15. **ML-Based Adaptive Parameter Tuning**: Utilizes Bayesian Optimization for multi-objective parameter tuning (PID controllers, economic parameters, consensus).
16. **Long-Term Predictive Analytics**: Employs ensemble methods for 50-100 year forecasting of supply, economic growth, network scaling, and validator rewards.
17. **Mobile DAG Messaging Protocol** - THE COMPLETE MESSAGING CONNECTIVITY LOOP (Steps 1-5):
    - **Step 1: AI-Controlled Message Routing** (`messaging_routing.py`): AI manages message flow, selects validators using spectral regions, applies E=hf quantum pricing, monitors burn/issuance balance
    - **Step 2: Secure Wallet Connection** (`secure_wallet.py`): Mobile-first wallet with ECDSA keypair generation, private keys encrypted and never leave device, transaction signing, asset protection that CANNOT be compromised
    - **Step 3: Message Cost Calculation**: E=hf quantum pricing where Energy = h × frequency, shorter wavelength = higher cost, burns feed TRANSITION_RESERVE
    - **Step 4: Personal Data Encryption** (`message_encryption.py`): Production-grade ECDH key agreement with ephemeral keypairs, HKDF key derivation, dual-layer AES-256-GCM encryption (session key + content), full GCM authentication tags, zero-knowledge architecture, only sender/recipient can decrypt. **PRODUCTION-READY**: Complete encrypt→decrypt round-trip with proper key transport.
    - **Step 5: Mobile-First DAG Protocol** (`mobile_dag_protocol.py`): Complete integration - THE LOOP: User sends → Wallet burns NXT → Message encrypted → AI routes → Validator processes → Mints NXT → Energy to TRANSITION_RESERVE → Feeds F_floor → Services → Loop continues. This is the LIFEBLOOD of the Nexus equation.
17a. **AI Message Security Controller** (`ai_message_security_controller.py`): **INTELLIGENT MODERATOR** between wavelength mechanics and ECDH encryption. AI analyzes messages and makes adaptive security decisions: selects optimal wavelength (Infrared→UV spectrum), determines encryption level (STANDARD/HIGH/MAXIMUM with different ECC curves), manages key rotation, balances cost vs security, provides confidence scoring. Integration: AI makes decision BEFORE encryption, ensuring wavelength consistency throughout pipeline (burn→encrypt→route). Encryption levels materially differ: STANDARD (SECP256R1+SHA256), HIGH (SECP384R1+SHA384), MAXIMUM (SECP521R1+SHA512).
18. **Hierarchical Pool Ecosystem** (`pool_ecosystem.py`): Reserve Pools → F_floor → Service Pools architecture with 10 service pool types (DEX, Investment, Staking, Bonus, Lottery, Environmental, Recycling, Product/Service, Community, Innovation), all enabled by F_floor foundation which is supported by reserve pools (VALIDATOR_POOL, TRANSITION_RESERVE, ECOSYSTEM_FUND).

### Technology Stack
-   **Frontend**: Streamlit, Plotly
-   **Backend**: Python 3.11, NumPy, Pandas, SciPy, NetworkX, Numba
-   **Database**: PostgreSQL, SQLAlchemy
-   **Optimization**: scikit-optimize, bcrypt, passlib
-   **Deployment**: Replit

## External Dependencies
-   **PostgreSQL**: Primary database.
-   **SQLAlchemy**: Python ORM.
-   **Plotly**: Interactive data visualizations.
-   **Streamlit**: Web application framework.
-   **Numba**: JIT compilation.
-   **scikit-optimize**: Bayesian optimization.
-   **bcrypt**: Password hashing.
-   **passlib**: Password hashing utility.
-   **Replit**: Cloud hosting platform.
-   **External REST APIs/WebSockets**: Integrated via Oracle Integration Framework.