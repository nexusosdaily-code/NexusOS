# Mobile Hub User Guide

## Your Phone IS the Blockchain Node

The Nexus Blockchain Hub is a unified mobile-first interface that puts the entire NexusOS ecosystem in your pocket.

---

## Getting Started

### Accessing the Hub

1. Open your web browser on any device
2. Navigate to your NexusOS deployment URL
3. The hub automatically adapts to mobile screens

### Navigation

The bottom navigation bar provides access to all modules:

| Icon | Module | Function |
|------|--------|----------|
| Wallet | Web3 Wallet | Manage NXT tokens |
| Messages | DAG Messaging | Send wavelength-encoded messages |
| Exchange | DEX | Trade tokens with physics-based fees |
| Explore | Explorer | View blockchain activity |
| More | Additional Modules | Governance, Validators, P2P Hub |

---

## Wallet Module

### Your NXT Balance
- **Current Balance**: Your available NXT tokens
- **Debt Backing**: USD value backed per NXT
- **Total Value**: Balance × Debt Backing ratio
- **Floor Support**: Daily contribution to BHLS

### Sending Tokens
1. Tap **Send**
2. Enter recipient wallet address
3. Enter amount in NXT
4. Review E=hf energy cost
5. Confirm transaction

### Receiving Tokens
1. Tap **Receive**
2. Share your wallet address or QR code
3. Tokens arrive after wavelength validation

### Transaction History
View all past transactions with:
- Timestamp
- Amount
- Energy cost (E=hf)
- Spectral region used
- Confirmation status

---

## DAG Messaging

### Sending Messages

1. Tap **New Message**
2. Enter recipient address
3. Type your message
4. Select wavelength (affects cost):
   - Visible (550nm) - Standard cost
   - Infrared (800nm) - Lower cost
   - Ultraviolet (350nm) - Higher cost, more secure
5. Review E=hf cost estimate
6. Send

### Message Cost Formula
```
Cost = h × (c / λ) × message_size_factor
```
Shorter wavelengths = Higher energy = Higher cost

### DAG Visualization
Messages form a Directed Acyclic Graph:
- Each message references parent messages
- Enables parallel processing
- Natural ordering without central authority

### AI Security Controller
The AI analyzes messages for:
- Spam detection
- Phishing attempts
- Wavelength anomalies
- Economic sustainability

---

## DEX (Decentralized Exchange)

### Swapping Tokens

1. Select **From** token (e.g., NXT)
2. Select **To** token (e.g., NXT-FOOD)
3. Enter amount
4. Review swap details:
   - Exchange rate
   - E=hf fee (0.3%)
   - Spectral pool used
5. Confirm swap

### LP Farming

Provide liquidity to earn rewards:

1. Tap **Add Liquidity**
2. Select token pair
3. Enter amounts
4. Receive LP tokens
5. Stake LP tokens for farming rewards

### Energy Tiers
Pools are assigned spectral regions based on TVL:

| TVL | Energy Tier | Reward Multiplier |
|-----|-------------|-------------------|
| 1M+ NXT | Gamma | 5.0x |
| 500K+ NXT | X-Ray | 3.0x |
| 100K+ NXT | UV | 2.0x |
| 50K+ NXT | Visible | 1.5x |
| < 50K NXT | Infrared | 1.0x |

---

## Blockchain Explorer

### Network Overview
- Total blocks validated
- Active validators
- Spectral distribution
- Network throughput

### Block Details
Click any block to see:
- Block hash
- Timestamp
- Transactions included
- Validator signatures
- Spectral regions represented
- Interference pattern

### Transaction Search
Search by:
- Transaction ID
- Wallet address
- Block number
- Time range

---

## Validator Economics

### Becoming a Validator

1. Navigate to **Validators**
2. Tap **Stake NXT**
3. Enter stake amount (minimum 1,000 NXT)
4. Confirm staking transaction
5. Wait for spectral region assignment

### Spectral Assignment
Your stake determines your region:

| Stake | Region | Wavelength |
|-------|--------|------------|
| 50,000+ | Gamma | 0.001 nm |
| 20,000+ | X-Ray | 1 nm |
| 10,000+ | UV | 300 nm |
| 5,000+ | Visible | 550 nm |
| 2,000+ | Infrared | 1000 nm |
| < 2,000 | Microwave | 10 mm |

### Viewing Rewards
- Daily reward earnings
- Spectral multiplier applied
- Performance score
- Historical rewards chart

---

## Civic Governance

### Viewing Proposals
Active governance proposals show:
- Title and description
- Proposer wallet
- Voting deadline
- Current vote counts
- AI analysis report

### Voting on Proposals
1. Read proposal details
2. Review AI analysis
3. Tap **Vote For** or **Vote Against**
4. Confirm with wallet signature
5. Vote weight = Your stake

### Creating Proposals
Validators can create proposals:
1. Tap **New Proposal**
2. Select proposal type:
   - Policy Change
   - Budget Allocation
   - Infrastructure Project
3. Write description
4. Set voting period
5. Submit (requires minimum stake)

---

## P2P Hub

### Phone Verification

1. Navigate to **P2P Hub**
2. Tap **Verify Phone**
3. Enter phone number
4. Receive SMS code (via Twilio)
5. Enter verification code
6. Phone linked to wallet

### Finding Friends
Search for verified users by:
- Phone number (if they opted in)
- Wallet address
- Username

### Direct Messaging
Send encrypted messages directly:
1. Select friend from contacts
2. Messages use E=hf pricing
3. End-to-end quantum encryption

### Mesh Network
When internet is unavailable:
- Connect via BLE/WiFi Direct
- Messages hop through nearby devices
- Reaches destination via mesh routing

---

## Achievements

### Earning Achievements
Complete actions to unlock physics-themed badges:

| Achievement | Requirement |
|-------------|-------------|
| First Photon | Send your first message |
| Quantum Leap | Reach 1,000 NXT balance |
| Spectral Master | Use all wavelength tiers |
| Mesh Pioneer | Connect 10 P2P friends |
| Validator Hero | Stake and validate blocks |

### Achievement Rewards
Some achievements unlock:
- NXT bonuses
- Special wavelength access
- Governance voting multipliers
- Exclusive features

---

## Settings

### Wallet Settings
- Backup seed phrase
- Change PIN
- Enable biometrics

### Network Settings
- Preferred spectral region
- Default wavelength for messages
- Mesh network on/off

### Notification Settings
- Transaction alerts
- Governance voting reminders
- BHLS allocation updates

---

## Troubleshooting

### Transaction Pending
- Check network connectivity
- Verify sufficient NXT for E=hf cost
- Wait for spectral validation (10ms - 5s)

### Message Not Delivered
- Confirm recipient address
- Check DAG synchronization status
- Retry with different wavelength

### DEX Swap Failed
- Ensure sufficient liquidity in pool
- Check slippage tolerance
- Verify token approval

### Phone Verification Issues
- Use valid mobile number
- Check SMS not blocked
- Request new code after 60 seconds

---

## Support

- **Wiki**: Full documentation
- **Governance**: Submit improvement proposals
- **Community**: Connect via P2P Hub

---

*GPL v3.0 License — Community Owned, Physics Governed*
