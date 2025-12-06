# 💼 WNSP P2P Hub - Current Features & User Guide

## Complete Feature List & How-To Guide

This document covers all working features in the WNSP P2P Hub and provides step-by-step instructions for users.

---

## 🔐 Authentication System

### Phone Number Registration

**How It Works:**
1. Enter your phone number (with country code)
2. System creates a wallet with 500,000,000 units (5 NXT)
3. Phone number becomes your unique identifier

**Technical Details:**
- Format: E.164 standard (e.g., +1234567890)
- Storage: PostgreSQL with bcrypt hashing
- Wallet: Automatic creation on first login

**⚠️ PROTOTYPE NOTICE:**
Current implementation accepts phone numbers WITHOUT SMS verification. Production deployment requires Twilio or similar SMS provider integration.

---

## 💰 NXT Wallet System

### Token Economics

| Property | Value |
|----------|-------|
| Token Name | NexusToken (NXT) |
| Decimals | 8 (like Bitcoin) |
| 1 NXT | 100,000,000 units |
| Starting Balance | 500,000,000 units (5 NXT) |
| Total Supply | 21 Billion NXT |

### Wallet Features

**View Balance:**
- Dashboard shows NXT balance
- Real-time updates after transactions
- E=hf cost preview before actions

**Transaction History:**
- All broadcasts logged
- Energy costs recorded
- Friend transfers tracked

---

## 👥 Friend Management

### Adding Friends

**Step-by-Step:**
1. Navigate to "Friends" section
2. Enter friend's phone number
3. Click "Add Friend"
4. Friend appears in your list

**Rules:**
- Must use full phone number with country code
- Both users must be registered
- Friendship is one-directional (they must add you back)

### Friend List Features

| Feature | Description |
|---------|-------------|
| View Online Status | See who's available |
| Remove Friend | Delete from your list |
| Select for Broadcast | Choose who can view your stream |
| View Their Broadcasts | See when friends go live |

---

## 📹 Live Video Broadcasting

### Starting a Broadcast

**Step-by-Step:**
1. Go to "Live Streaming" section
2. Click "Start Broadcast"
3. Allow camera/microphone access
4. Select friends who can view (optional)
5. Click "Go Live"

**E=hf Energy Cost:**
- Cost calculated based on wavelength and duration
- Energy reserved when broadcast starts
- Final cost deducted when you stop

### Broadcast Options

| Option | Description |
|--------|-------------|
| Public | Anyone can view |
| Friends Only | Only selected friends |
| Private | Specific friend list |

### Viewing a Broadcast

**Step-by-Step:**
1. Look for "🔴 LIVE" indicators
2. Click on active broadcast
3. Video plays automatically
4. Use touch controls on mobile

**Mobile Controls:**
- Tap to show/hide controls
- Fullscreen toggle available
- Audio mute option

---

## 🔋 E=hf Energy System

### How Energy Costs Work

Every action in WNSP costs energy based on quantum physics:

```
E = h × f
Energy = Planck's constant × Frequency
```

### Cost Breakdown

| Action | Approximate Cost |
|--------|------------------|
| Send text message | 0.0001 NXT |
| Share image | 0.01-0.05 NXT |
| 1 minute video stream | 0.5-1 NXT |
| 1 hour live broadcast | 20-30 NXT |

### Two-Phase Transaction

**Phase 1 - Reserve:**
When you start a broadcast, energy is reserved (locked)

**Phase 2 - Finalize:**
When you stop, actual cost is calculated and deducted

This prevents:
- Insufficient balance during broadcast
- Overcharging users
- Energy fraud

---

## 📊 DAG Messaging

### What is DAG?

DAG (Directed Acyclic Graph) allows messages to reference multiple previous messages, creating a web instead of a chain.

### Benefits

| Blockchain | DAG |
|------------|-----|
| Sequential | Parallel |
| Slow | Fast |
| One parent | Multiple parents |
| Mining | Instant |

### Using DAG Messages

**Features:**
- Interactive DAG visualization
- Parent message references
- Wavelength validation
- AI security analysis

---

## 🌐 Mesh Networking

### How Mesh Works

Your phone connects to nearby phones, creating a network without central servers.

```
┌─────┐     ┌─────┐     ┌─────┐
│Phone│◄───►│Phone│◄───►│Phone│
│  A  │     │  B  │     │  C  │
└─────┘     └─────┘     └─────┘
    │           │           │
    └───────────┼───────────┘
                │
            ┌─────┐
            │Phone│
            │  D  │
            └─────┘
```

### Mesh Features

- **Multi-hop routing**: Messages hop between phones
- **Offline capable**: Works without internet
- **Self-healing**: Network adapts if phones leave
- **AI-optimized**: Smart routing decisions

---

## 🔒 Security Features

### Encryption

| Layer | Method |
|-------|--------|
| Transport | TLS 1.3 |
| Messages | AES-256-GCM |
| Keys | Quantum-resistant lattice |
| Signatures | 5D wave signatures |

### Privacy

- Phone numbers not shared publicly
- Friend lists are private
- Broadcasts require permission
- No central data storage

---

## 📱 Mobile Optimization

### Touch Controls

| Gesture | Action |
|---------|--------|
| Tap | Toggle controls |
| Swipe | Navigate |
| Pinch | Zoom |
| Long press | Menu |

### Responsive Design

- Works on phones, tablets, desktops
- Portrait and landscape modes
- Auto-adjusts for screen size

---

## 🐛 Troubleshooting

### Camera Not Working

**Solution:**
1. Check browser permissions
2. HTTPS required (not HTTP)
3. Try different browser
4. Restart app

### Friend Can't See My Broadcast

**Solution:**
1. Verify they're added as friend
2. Check they're in allowed list
3. Ensure broadcast is active
4. Confirm their login status

### Wallet Balance Issues

**Solution:**
1. Refresh the page
2. Check transaction history
3. Verify phone number format
4. Contact support if persists

### Connection Failed

**Solution:**
1. Check internet connection
2. Refresh browser
3. Clear cache
4. Try different network

---

## 📞 Support

For issues or feature requests:
- GitHub Issues: Report bugs
- Community Forum: Ask questions
- Documentation: Read the wiki

---

*User Guide Last Updated: November 2025*
