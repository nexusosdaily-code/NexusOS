"""
Payment Layer Dashboard - NexusOS Native Token Interface

Unified interface for:
- Token economics & statistics
- POW mining operations
- Messaging payments
- Account management
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import time
from native_token import token_system
from pow_consensus import pow_consensus
from messaging_payment import messaging_payment, MessageType


def render_payment_layer_page():
    """Main payment layer interface"""
    st.title("💰 NexusOS Payment Layer")
    st.caption("Native Token (NXT) - Layer 1 Blockchain Currency")
    
    # Main tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Token Economics",
        "⛏️ POW Mining",
        "💬 Messaging Payments",
        "👤 My Account",
        "📈 Analytics"
    ])
    
    with tab1:
        render_token_economics()
    
    with tab2:
        render_pow_mining()
    
    with tab3:
        render_messaging_payments()
    
    with tab4:
        render_account_management()
    
    with tab5:
        render_analytics()


def render_token_economics():
    """Token economics dashboard"""
    st.header("Token Economics - NexusToken (NXT)")
    
    # Get stats
    stats = token_system.get_token_stats()
    
    # KPI tiles
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Supply",
            token_system.format_balance(stats['total_supply']),
            "Maximum"
        )
    
    with col2:
        st.metric(
            "Circulating Supply",
            token_system.format_balance(stats['circulating_supply']),
            f"-{token_system.format_balance(stats['total_burned'])} burned"
        )
    
    with col3:
        st.metric(
            "Total Burned",
            token_system.format_balance(stats['total_burned']),
            f"{stats['burn_rate_percent']:.2f}% burn rate"
        )
    
    with col4:
        st.metric(
            "Active Accounts",
            f"{stats['total_accounts']:,}",
            f"{stats['total_transactions']:,} txs"
        )
    
    st.divider()
    
    # Supply visualization
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Supply Distribution")
        
        fig = go.Figure(data=[go.Pie(
            labels=['Circulating', 'Burned', 'Validator Reserve', 'Ecosystem Fund'],
            values=[
                stats['circulating_supply'] - stats['validator_reserve'] - stats['ecosystem_reserve'],
                stats['total_burned'],
                stats['validator_reserve'],
                stats['ecosystem_reserve']
            ],
            hole=0.4,
            marker=dict(colors=['#4CAF50', '#F44336', '#2196F3', '#FF9800'])
        )])
        
        fig.update_layout(height=350, margin=dict(t=30, b=0))
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Token Allocation")
        
        total = stats['total_supply']
        data = {
            "Category": ["Genesis (50%)", "Validators (30%)", "Ecosystem (20%)"],
            "Amount (NXT)": [
                token_system.units_to_nxt(token_system.GENESIS_SUPPLY),
                token_system.units_to_nxt(token_system.VALIDATOR_RESERVE),
                token_system.units_to_nxt(token_system.ECOSYSTEM_RESERVE)
            ]
        }
        
        st.dataframe(data, use_container_width=True, hide_index=True)
        
        st.info("""
        **Economic Model:**
        - 💰 **Deflationary**: Tokens burned for messaging
        - ⛏️ **Controlled Inflation**: POW block rewards
        - 🏦 **Validator Reserve**: 300K NXT for rewards
        - 🌱 **Ecosystem Fund**: 200K NXT for development
        """)


def render_pow_mining():
    """POW mining interface"""
    st.header("⛏️ Proof-of-Work Mining")
    
    # Get mining stats
    mining_stats = pow_consensus.get_mining_stats()
    
    # Mining KPIs
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Blocks Mined",
            f"{mining_stats['total_blocks']:,}",
            "Total"
        )
    
    with col2:
        st.metric(
            "Current Difficulty",
            mining_stats['current_difficulty'],
            "Leading zeros"
        )
    
    with col3:
        st.metric(
            "Avg Block Time",
            f"{mining_stats['average_block_time']:.2f}s",
            f"Target: {mining_stats['target_block_time']}s"
        )
    
    with col4:
        hashrate = pow_consensus.get_hashrate()
        st.metric(
            "Hashrate",
            f"{hashrate:.2f} H/s",
            "Network"
        )
    
    st.divider()
    
    # Mining interface
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Mine New Block")
        
        if 'miner_address' not in st.session_state:
            st.session_state.miner_address = "MINER_001"
        
        miner_address = st.text_input(
            "Miner Address (to receive rewards)",
            value=st.session_state.miner_address,
            key="mining_address_input"
        )
        
        col_a, col_b = st.columns(2)
        
        with col_a:
            if st.button("⛏️ Mine Block", type="primary", use_container_width=True):
                with st.spinner("Mining block..."):
                    # Ensure account exists
                    token_system.get_or_create_account(miner_address)
                    
                    start = time.time()
                    block = pow_consensus.mine_block(miner_address)
                    mine_time = time.time() - start
                    
                    if block:
                        st.success(f"✅ Block #{block.block_number} mined in {mine_time:.2f}s!")
                        st.success(f"💰 Reward: {token_system.format_balance(block.reward)}")
                        st.info(f"🔐 Hash: `{block.hash[:32]}...`")
                        st.info(f"🎲 Nonce: {block.nonce:,}")
                    else:
                        st.error("Mining failed")
        
        with col_b:
            num_blocks = st.number_input("Mine Multiple", min_value=1, max_value=10, value=1)
            if st.button("⛏️ Mine Multiple", use_container_width=True):
                with st.spinner(f"Mining {num_blocks} blocks..."):
                    token_system.get_or_create_account(miner_address)
                    
                    progress = st.progress(0)
                    for i in range(num_blocks):
                        pow_consensus.mine_block(miner_address)
                        progress.progress((i + 1) / num_blocks)
                    
                    st.success(f"✅ Mined {num_blocks} blocks!")
                    st.rerun()
    
    with col2:
        st.subheader("Rewards Info")
        
        current_block = len(pow_consensus.blockchain)
        current_reward = pow_consensus.get_block_reward(current_block)
        next_halving = ((current_block // pow_consensus.REWARD_HALVING_INTERVAL) + 1) * pow_consensus.REWARD_HALVING_INTERVAL
        
        st.metric("Current Reward", token_system.format_balance(current_reward))
        st.metric("Next Halving", f"Block {next_halving:,}")
        st.metric("Total Rewards", token_system.format_balance(mining_stats['total_rewards_distributed']))
    
    # Recent blocks
    st.subheader("Recent Blocks")
    
    recent_blocks = pow_consensus.get_recent_blocks(10)
    if recent_blocks:
        blocks_data = []
        for block in recent_blocks:
            blocks_data.append({
                "Block #": block.block_number,
                "Miner": block.miner_address[:15],
                "Reward": token_system.format_balance(block.reward),
                "Difficulty": block.difficulty,
                "Nonce": f"{block.nonce:,}",
                "Hash": block.hash[:16] + "...",
            })
        
        st.dataframe(blocks_data, use_container_width=True, hide_index=True)


def render_messaging_payments():
    """Messaging payment interface"""
    st.header("💬 Secure Messaging Payments")
    
    # Get pricing
    pricing = messaging_payment.get_pricing()
    
    # Pricing display
    st.subheader("💰 Messaging Costs")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric(
            "📨 Encrypted Message",
            pricing['encrypted_message']['formatted'],
            "Per message"
        )
    
    with col2:
        st.metric(
            "🔗 Link Share",
            pricing['link_share']['formatted'],
            "Per link"
        )
    
    with col3:
        st.metric(
            "🎥 Video Share",
            pricing['video_share']['formatted'],
            "Per video"
        )
    
    st.divider()
    
    # Send message interface
    st.subheader("Send Paid Message")
    
    if 'msg_from' not in st.session_state:
        st.session_state.msg_from = "USER_001"
    if 'msg_to' not in st.session_state:
        st.session_state.msg_to = "USER_002"
    
    col1, col2 = st.columns(2)
    
    with col1:
        from_address = st.text_input("From Address", value=st.session_state.msg_from)
    
    with col2:
        to_address = st.text_input("To Address", value=st.session_state.msg_to)
    
    # Check balance
    from_account = token_system.get_or_create_account(from_address)
    st.info(f"💰 Your Balance: {token_system.format_balance(from_account.balance)}")
    
    message_type = st.selectbox(
        "Message Type",
        ["Encrypted Message", "Link Share", "Video Share"]
    )
    
    if message_type == "Encrypted Message":
        content = st.text_area("Message Content", placeholder="Enter message to encrypt...")
        cost = token_system.MESSAGE_BURN_RATE
        
        if st.button("📨 Send Encrypted Message", type="primary"):
            if not content:
                st.error("Please enter a message")
            elif not from_account.has_sufficient_balance(cost):
                st.error(f"Insufficient balance. Need {token_system.format_balance(cost)}")
            else:
                msg = messaging_payment.send_encrypted_message(from_address, to_address, content)
                if msg:
                    st.success(f"✅ Message sent! Cost: {token_system.format_balance(cost)}")
                    st.success(f"🔥 Tokens burned: {token_system.format_balance(cost)}")
                else:
                    st.error("Failed to send message")
    
    elif message_type == "Link Share":
        link_url = st.text_input("Link URL", placeholder="https://...")
        note = st.text_input("Note (optional)", placeholder="Optional note...")
        cost = token_system.LINK_SHARE_BURN_RATE
        
        if st.button("🔗 Share Link", type="primary"):
            if not link_url:
                st.error("Please enter a link")
            elif not from_account.has_sufficient_balance(cost):
                st.error(f"Insufficient balance. Need {token_system.format_balance(cost)}")
            else:
                msg = messaging_payment.share_link(from_address, to_address, link_url, note)
                if msg:
                    st.success(f"✅ Link shared! Cost: {token_system.format_balance(cost)}")
                    st.success(f"🔥 Tokens burned: {token_system.format_balance(cost)}")
                else:
                    st.error("Failed to share link")
    
    else:  # Video Share
        video_url = st.text_input("Video URL", placeholder="https://...")
        note = st.text_input("Note (optional)", placeholder="Optional note...")
        cost = token_system.VIDEO_SHARE_BURN_RATE
        
        if st.button("🎥 Share Video", type="primary"):
            if not video_url:
                st.error("Please enter a video URL")
            elif not from_account.has_sufficient_balance(cost):
                st.error(f"Insufficient balance. Need {token_system.format_balance(cost)}")
            else:
                msg = messaging_payment.share_video(from_address, to_address, video_url, note)
                if msg:
                    st.success(f"✅ Video shared! Cost: {token_system.format_balance(cost)}")
                    st.success(f"🔥 Tokens burned: {token_system.format_balance(cost)}")
                else:
                    st.error("Failed to share video")


def render_account_management():
    """Account management interface"""
    st.header("👤 Account Management")
    
    # Account lookup
    address = st.text_input("Enter Account Address", value="USER_001")
    
    account = token_system.get_or_create_account(address)
    
    # Account info
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Balance", token_system.format_balance(account.balance))
    
    with col2:
        st.metric("Nonce", f"{account.nonce:,}")
    
    with col3:
        balance_usd = token_system.units_to_nxt(account.balance) * 10  # Mock $10 per NXT
        st.metric("Value (USD)", f"${balance_usd:,.2f}")
    
    st.divider()
    
    # Transfer interface
    st.subheader("💸 Transfer Tokens")
    
    col1, col2 = st.columns(2)
    
    with col1:
        to_address = st.text_input("To Address", key="transfer_to")
    
    with col2:
        amount_nxt = st.number_input("Amount (NXT)", min_value=0.01, step=0.01, format="%.2f")
    
    if st.button("💸 Transfer", type="primary"):
        amount_units = token_system.nxt_to_units(amount_nxt)
        
        if not to_address:
            st.error("Please enter recipient address")
        elif not account.has_sufficient_balance(amount_units + token_system.BASE_TRANSFER_FEE):
            st.error(f"Insufficient balance (including {token_system.format_balance(token_system.BASE_TRANSFER_FEE)} fee)")
        else:
            tx = token_system.transfer(address, to_address, amount_units)
            if tx:
                st.success(f"✅ Transferred {token_system.format_balance(amount_units)}")
                st.success(f"💳 Fee: {token_system.format_balance(token_system.BASE_TRANSFER_FEE)}")
                st.rerun()
            else:
                st.error("Transfer failed")
    
    # Recent transactions
    st.subheader("Recent Transactions")
    
    txs = token_system.get_account_transactions(address, 10)
    
    if txs:
        tx_data = []
        for tx in txs:
            direction = "➡️ Sent" if tx.from_address == address else "⬅️ Received"
            other_party = tx.to_address if tx.from_address == address else tx.from_address
            
            tx_data.append({
                "Type": tx.tx_type.value.title(),
                "Direction": direction,
                "Party": other_party[:15],
                "Amount": token_system.format_balance(tx.amount),
                "Fee": token_system.format_balance(tx.fee),
                "TX ID": tx.tx_id
            })
        
        st.dataframe(tx_data, use_container_width=True, hide_index=True)
    else:
        st.info("No transactions yet")


def render_analytics():
    """Analytics dashboard"""
    st.header("📈 Payment Layer Analytics")
    
    # Get all stats
    token_stats = token_system.get_token_stats()
    mining_stats = pow_consensus.get_mining_stats()
    msg_stats = messaging_payment.get_messaging_stats()
    
    # Overview metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Total Messages",
            f"{msg_stats['total_messages']:,}",
            "All time"
        )
    
    with col2:
        st.metric(
            "Burned by Messages",
            token_system.format_balance(msg_stats['total_burned_units']),
            f"{(msg_stats['total_burned_units'] / token_stats['total_burned'] * 100) if token_stats['total_burned'] > 0 else 0:.1f}% of total"
        )
    
    with col3:
        st.metric(
            "Mining Rewards",
            token_system.format_balance(mining_stats['total_rewards_distributed']),
            "Distributed"
        )
    
    with col4:
        deflation_rate = (msg_stats['total_burned_units'] - mining_stats['total_rewards_distributed']) / token_stats['total_supply'] * 100
        st.metric(
            "Net Deflation",
            f"{abs(deflation_rate):.2f}%",
            "Burned - Minted"
        )
    
    st.divider()
    
    # Message activity breakdown
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Message Activity")
        
        fig = go.Figure(data=[go.Pie(
            labels=['Encrypted Messages', 'Link Shares', 'Video Shares'],
            values=[
                msg_stats['encrypted_messages'],
                msg_stats['link_shares'],
                msg_stats['video_shares']
            ],
            marker=dict(colors=['#4CAF50', '#2196F3', '#FF5722'])
        )])
        
        fig.update_layout(height=300, margin=dict(t=30, b=0))
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Economic Loop Health")
        
        st.metric("Messages Sent", f"{msg_stats['total_messages']:,}")
        st.metric("Tokens Burned", f"{msg_stats['total_burned_nxt']:.2f} NXT")
        st.metric("Blocks Mined", f"{mining_stats['total_blocks_mined']:,}")
        st.metric("Validators Rewarded", token_system.format_balance(mining_stats['total_rewards_distributed']))
        
        st.success("✅ Economic loop active: Users pay → Tokens burn → Validators earn → Deflation")


if __name__ == "__main__":
    render_payment_layer_page()
