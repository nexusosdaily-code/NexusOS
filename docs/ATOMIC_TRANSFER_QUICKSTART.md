# Atomic Transfer System - Quick Start Guide

## 📚 Table of Contents

**Fast-Track Guide for Developers**

### ⚡ Getting Started
1. [**What is the Atomic Transfer System?**](#what-is-the-atomic-transfer-system) - Overview
2. [**Quick Example**](#quick-example) - Copy-paste code to get started

### 🔧 Understanding Atomicity
3. [**How It Works**](#how-it-works) - 3-step process (snapshot, execute, rollback)
4. [**Why Use Atomic Transfers?**](#why-use-atomic-transfers) - Safety benefits

### 💻 Practical Usage
5. [**Basic Transfers**](#basic-transfers) - Standard account-to-account transfers
6. [**Economic Loop Usage**](#economic-loop-usage) - Message burns, DEX allocations
7. [**Error Handling**](#error-handling) - Dealing with failures

### 📊 Advanced Topics
8. [**Integration Examples**](#integration-examples) - Real-world code patterns
9. [**Best Practices**](#best-practices) - Do's and Don'ts
10. [**Performance Tips**](#performance-tips) - Optimization strategies

**Perfect for**: Python developers, NexusOS integrators, blockchain app builders

---

## What is the Atomic Transfer System?

The Atomic Transfer System ensures **all-or-nothing** transaction safety in NexusOS. If any step of a transfer fails, all changes are automatically rolled back - preventing partial states and balance corruption.

---

## Quick Example

```python
from native_token import NativeTokenSystem

# Initialize token system
token_system = NativeTokenSystem()

# Create accounts
token_system.create_account("alice", initial_balance=100_000_000)  # 1 NXT
token_system.create_account("bob", initial_balance=0)

# Execute atomic transfer
success, tx, msg = token_system.transfer_atomic(
    from_address="alice",
    to_address="bob",
    amount=10_000_000,  # 0.1 NXT (in units: 100M units = 1 NXT)
    fee=1_000,          # 0.00001 NXT fee
    reason="Payment for services"
)

if success:
    print(f"✅ Transfer completed: {tx.tx_id}")
    print(f"Message: {msg}")
else:
    print(f"❌ Transfer failed: {msg}")
    # All balances automatically rolled back!
```

---

## How It Works

### 1. Before Transfer
```python
# System snapshots all balances
from_balance_before = from_account.balance
from_nonce_before = from_account.nonce
to_balance_before = to_account.balance
```

### 2. Execute Transfer
```python
try:
    # Atomic block - all or nothing
    from_account.balance -= (amount + fee)
    from_account.nonce += 1
    to_account.balance += amount
    validator_pool.balance += fee
    
    # Create transaction record
    tx = TokenTransaction(...)
    
except Exception as e:
    # Any error triggers rollback (Step 3)
```

### 3. On Error: Automatic Rollback
```python
# Restore all snapshots
from_account.balance = from_balance_before
from_account.nonce = from_nonce_before
to_account.balance = to_balance_before
validator_pool.balance = validator_balance_before

return (False, None, "Transfer failed and rolled back")
```

---

## Economic Loop Integration

### Message Burns

Every message sent burns NXT tokens atomically:

```python
from economic_loop_controller import get_economic_loop

economic_loop = get_economic_loop(token_system)

# User sends message → burns NXT
success, msg, event = economic_loop.flow_controller.process_message_burn(
    sender_address="alice",
    message_id="MSG_001",
    burn_amount_nxt=0.000057,  # Standard message cost
    wavelength_nm=656.4,
    message_type="standard"
)

if success:
    # alice debited 0.000057 NXT
    # TRANSITION_RESERVE credited 0.000057 NXT
    # Total supply conserved ✅
```

### DEX Liquidity Allocation

Reserve automatically allocates to DEX pools:

```python
# Reserve → DEX pools (weighted by supply chain demand)
success, msg, details = economic_loop.liquidity_allocator.allocate_reserve_to_pools(
    reserve_amount_nxt=0.01  # Allocate 0.01 NXT
)

if success:
    # Reserve decreased by 0.01 NXT
    # Pools received proportional allocations
    # All transfers atomic ✅
```

### Crisis Drain Protection

Emergency drain to F_floor for BHLS support:

```python
# Crisis detected → drain reserve to F_floor
success, msg = economic_loop.crisis_controller.execute_crisis_drain(
    drain_amount_nxt=0.05  # Emergency 0.05 NXT to F_floor
)

if success:
    # Reserve decreased by 0.05 NXT
    # F_FLOOR_RESERVE increased by 0.05 NXT
    # BHLS protection funded ✅
```

---

## Unit Conversion

NexusOS uses **Bitcoin-style units**:

```
1 NXT = 100,000,000 units (like 1 BTC = 100,000,000 satoshis)
```

### Conversion Examples

```python
# NXT → Units
nxt_amount = 1.5
units = int(nxt_amount * token_system.UNITS_PER_NXT)
# units = 150,000,000

# Units → NXT
units = 5_000_000
nxt = units / token_system.UNITS_PER_NXT
# nxt = 0.05

# Display balance
account = token_system.get_account("alice")
print(account.get_balance_nxt())  # 1.234567 NXT
print(account.balance)             # 123456700 units
```

---

## Error Handling

### Insufficient Balance

```python
success, tx, msg = token_system.transfer_atomic(
    from_address="alice",
    to_address="bob",
    amount=999_999_999_999,  # More than alice has!
    fee=0
)

# success = False
# tx = None
# msg = "Insufficient balance: need 999999999999 units, have 100000000 units"
# Alice's balance unchanged ✅
```

### Account Not Found

```python
success, tx, msg = token_system.transfer_atomic(
    from_address="nonexistent_user",
    to_address="bob",
    amount=1_000
)

# success = False
# tx = None
# msg = "Sender account 'nonexistent_user' not found"
# No state changes ✅
```

---

## Best Practices

### ✅ DO

- **Always check success flag** before using transaction object
- **Use integer units** for internal calculations (no floating-point errors)
- **Provide reason** for transactions (helps with debugging/auditing)
- **Sync wallets** with on-chain state before/after operations

### ❌ DON'T

- **Don't manipulate balances directly** - use `transfer_atomic()` only
- **Don't ignore error messages** - they contain valuable debugging info
- **Don't use floating-point** for transfer amounts - convert to units first
- **Don't assume success** - always check the return value

---

## Wallet Synchronization

Mobile wallets stay synchronized with on-chain state:

```python
from mobile_dag_protocol import MobileDAGProtocol

protocol = MobileDAGProtocol(token_system=token_system)

# Wallet syncs before message send
wallet = protocol.create_wallet("alice")

# Send message (burns NXT atomically)
success, msg, tx = protocol.send_message(
    wallet_id="alice",
    recipient="bob",
    content="Hello!",
    encryption_level=3
)

if success:
    # Wallet balance = on-chain balance (authoritative) ✅
    onchain = token_system.get_account("alice")
    assert wallet.balance_nxt == onchain.balance / token_system.UNITS_PER_NXT
```

---

## Testing Your Implementation

### Simple Test

```python
# Setup
token_system = NativeTokenSystem()
token_system.create_account("alice", initial_balance=100_000_000)

# Record initial balance
alice = token_system.get_account("alice")
balance_before = alice.balance

# Execute transfer
success, tx, msg = token_system.transfer_atomic(
    from_address="alice",
    to_address="bob",
    amount=10_000_000,
    fee=1_000
)

# Verify
assert success == True
assert alice.balance == balance_before - 10_000_000 - 1_000
print("✅ Test passed!")
```

### Rollback Test

```python
# Attempt transfer with insufficient balance
token_system.create_account("poor_user", initial_balance=100)

poor = token_system.get_account("poor_user")
balance_before = poor.balance

success, tx, msg = token_system.transfer_atomic(
    from_address="poor_user",
    to_address="alice",
    amount=999_999_999
)

# Verify rollback
assert success == False
assert poor.balance == balance_before  # Unchanged!
assert "Insufficient balance" in msg
print("✅ Rollback test passed!")
```

---

## Next Steps

- **Read Full Specs**: [ATOMIC_TRANSFER_SPECIFICATIONS.md](../ATOMIC_TRANSFER_SPECIFICATIONS.md)
- **View Code**: `native_token.py:transfer_atomic()`
- **Integration Tests**: `test_economic_loop_integration.py`
- **Economic Loop**: [Economic Loop Dashboard](../economic_loop_dashboard.py)

---

**Status**: Production Ready ✅  
**Documentation**: Complete  
**Safety**: All-or-nothing atomicity guaranteed
