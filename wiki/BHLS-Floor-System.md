# BHLS Floor System

## Basic Human Living Standards

The BHLS Floor System guarantees every citizen a minimum monthly allocation of **1,150 NXT** to cover fundamental living needs. This isn't charity—it's physics-based economics ensuring prosperity for all.

---

## The Seven Fundamental Rights

Every citizen receives monthly allocations across 7 categories:

| Category | Monthly NXT | Purpose |
|----------|-------------|---------|
| Food & Nutrition | 250 | Healthy meals and groceries |
| Clean Water | 50 | Drinking water and sanitation |
| Shelter & Housing | 400 | Rent and housing costs |
| Energy Access | 150 | Electricity and heating |
| Medical Care | 200 | Healthcare and medicine |
| Communication & Internet | 75 | Connectivity and phone |
| Waste & Recycling | 25 | Environmental services |
| **Total** | **1,150** | |

---

## How It Works

### Funding Sources

The BHLS floor is funded through multiple sustainable channels:

```
┌─────────────────────────────────────────────────────┐
│                  FUNDING SOURCES                    │
├─────────────────────────────────────────────────────┤
│  1. Message Burns (E=hf)      → TRANSITION_RESERVE  │
│  2. DEX Trading Fees (0.3%)   → DEX_LIQUIDITY       │
│  3. Validator Inflation (2%)  → VALIDATOR_POOL      │
│  4. Recycling Liquidity       → SERVICE_POOLS       │
│  5. Global Debt Backing       → Direct to F_FLOOR   │
├─────────────────────────────────────────────────────┤
│                       ↓                             │
│              F_FLOOR RESERVE POOL                   │
│                       ↓                             │
│             CITIZEN BHLS ALLOCATIONS                │
└─────────────────────────────────────────────────────┘
```

### Distribution Cycle

1. **Daily Calculation**: System calculates total floor requirements
2. **Pool Verification**: Ensures F_FLOOR has sufficient reserves
3. **Pro-rata Distribution**: Each citizen receives their share
4. **Usage Tracking**: Citizens spend allocations at approved vendors
5. **Recycling**: Unused allocations return to reserve pool

---

## Pool Hierarchy

### Three-Layer Architecture

```
Layer 1: RESERVE POOLS (Top Level)
├── TRANSITION_RESERVE  → Message burn energy
├── DEX_LIQUIDITY       → Trading fee collection
└── VALIDATOR_POOL      → Staking rewards source

Layer 2: F_FLOOR (Middle Level)
└── Basic Human Living Standards guarantee
    → Minimum reserve: 575,000 NXT

Layer 3: SERVICE POOLS (Bottom Level)
├── NXT-ELECTRICITY     (12%)
├── NXT-WATER           (8%)
├── NXT-MANUFACTURING   (12%)
├── NXT-LOGISTICS       (8%)
├── NXT-FOOD            (10%)
├── NXT-AGRICULTURE     (10%)
├── NXT-HORTICULTURE    (8%)
├── NXT-AQUACULTURE     (7%)
├── NXT-SERVICES        (10%)
├── NXT-TECHNOLOGY      (5%)
├── NXT-CARBON          (5%)
└── NXT-ENVIRONMENTAL   (5%)
```

---

## Economic Loop

The self-sustaining economic cycle:

### 1. Messaging → Energy
Every message costs NXT based on E=hf physics:
```
Message sent → NXT burned → Energy to TRANSITION_RESERVE
```

### 2. Trading → Liquidity
DEX transactions generate fees:
```
Swap executed → 0.3% fee → DEX_LIQUIDITY pool
```

### 3. Validation → Rewards
Validators maintain the network:
```
Block validated → Reward from VALIDATOR_POOL
```

### 4. Pools → Floor
All pools contribute to BHLS:
```
Reserve pools → F_FLOOR → Citizen allocations
```

### 5. Usage → Recycling
Spending creates circular flow:
```
Citizen spends → Vendor receives → Vendor validates → Back to pools
```

---

## Stability Mechanisms

### Floor Stability Index

The system maintains a stability index:
```python
stability_index = floor_reserve_pool / total_floor_requirements

if stability_index >= 1.0:
    status = "FULLY FUNDED"
elif stability_index >= 0.75:
    status = "STABLE"
elif stability_index >= 0.5:
    status = "WARNING"
else:
    status = "CRITICAL - CRISIS MODE"
```

### Crisis Protection

When stability drops below threshold:

1. **Emergency Drain**: TRANSITION_RESERVE flows directly to F_FLOOR
2. **Reduced Burn Rate**: Message burns dampened to preserve supply
3. **Priority Allocation**: Essential categories (Food, Water, Energy) prioritized
4. **Community Alert**: Citizens notified of temporary adjustments

### Minimum Reserve
Physics-based minimum: **575,000 NXT** permanently locked to guarantee continuity.

---

## Citizen Enrollment

### Requirements
- Valid wallet address
- Phone verification (Twilio SMS)
- One wallet per citizen

### Allocation Process
```python
def enroll_citizen(wallet_address: str, verified_phone: str):
    """
    Enroll citizen in BHLS system
    """
    citizen = Citizen(
        wallet=wallet_address,
        phone=verified_phone,
        allocations={
            BHLSCategory.FOOD: 250,
            BHLSCategory.WATER: 50,
            BHLSCategory.HOUSING: 400,
            BHLSCategory.ENERGY: 150,
            BHLSCategory.HEALTHCARE: 200,
            BHLSCategory.CONNECTIVITY: 75,
            BHLSCategory.RECYCLING: 25
        }
    )
    return citizen
```

---

## Service Usage

Citizens spend allocations through approved service providers:

### Example: Food Purchase
```
1. Citizen visits approved grocery store
2. Scans QR code with NexusOS wallet
3. System checks Food allocation balance (250 NXT)
4. Deducts purchase amount (e.g., 45 NXT)
5. Vendor receives payment
6. Remaining balance: 205 NXT
```

### Rollover Policy
- Unused allocations do NOT roll over
- Monthly reset on the 1st
- Encourages consistent resource utilization

---

## Global Debt Integration

### How Debt Becomes Value

NXT tokens are backed by global sovereign debt:

```
Debt per NXT = Global Debt / NXT Supply

$315.4 trillion ÷ 3.46 trillion NXT = $91.14 per NXT
```

### Daily Floor Credits
Debt backing flows daily to the floor:
```
Daily Floor Credit = Population × Debt per NXT × Conversion Rate
```

This creates a direct link between global economics and citizen welfare.

---

## Verification System

### Floor Support Verification
```python
def verify_f_floor_support():
    """
    Verify BHLS system is adequately funded
    """
    return {
        'reserve_total': sum([pool.balance for pool in reserve_pools]),
        'f_floor_balance': f_floor_pool.balance,
        'service_pools_total': sum([pool.balance for pool in service_pools]),
        'citizens_supported': f_floor_balance / monthly_allocation,
        'stability_index': calculate_stability_index()
    }
```

---

## Why BHLS Matters

### Traditional Welfare
- Bureaucratic gatekeeping
- Means testing humiliation
- Inconsistent availability
- Political vulnerability

### NexusOS BHLS
- **Automatic**: Physics-based, no gatekeepers
- **Guaranteed**: Constitutional floor, not charity
- **Transparent**: All flows visible on blockchain
- **Sustainable**: Self-funding through economic activity

---

## Implementation Files

```
bhls_floor_system.py           # Core BHLS logic
economic_loop_controller.py    # Pool management
hierarchical_pool_ecosystem.py # Pool hierarchy
service_pools_page.py          # Dashboard UI
```

---

*GPL v3.0 License — Community Owned, Physics Governed*
