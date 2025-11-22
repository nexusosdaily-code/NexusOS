"""
NexusOS Real Blockchain Explorer
Live visualization of actual blockchain transactions, messages, and network state
"""

import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from nexus_native_wallet import NexusNativeWallet
import json


def create_transaction_timeline(transactions):
    """Create transaction timeline visualization"""
    if not transactions:
        fig = go.Figure()
        fig.update_layout(
            title="Transaction Timeline",
            annotations=[{
                'text': 'No transactions found',
                'xref': 'paper',
                'yref': 'paper',
                'showarrow': False,
                'font': {'size': 20}
            }]
        )
        return fig
    
    # Parse timestamps and amounts
    df = pd.DataFrame(transactions)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    fig = go.Figure()
    
    # Transaction volume over time
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['amount_nxt'],
        mode='markers+lines',
        name='Transactions',
        marker=dict(
            size=10,
            color=df['amount_nxt'],
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(title="NXT Amount")
        ),
        text=[f"TX: {tx['tx_id'][:16]}...<br>Amount: {tx['amount_nxt']:.2f} NXT<br>Fee: {tx['fee_nxt']:.6f} NXT" 
              for tx in transactions],
        hoverinfo='text'
    ))
    
    fig.update_layout(
        title="Transaction Timeline",
        xaxis_title="Time",
        yaxis_title="Amount (NXT)",
        height=400,
        hovermode='closest'
    )
    
    return fig


def create_spectral_distribution(messages):
    """Create spectral region distribution chart"""
    if not messages:
        fig = go.Figure()
        fig.update_layout(
            title="Message Spectral Distribution",
            annotations=[{
                'text': 'No messages found',
                'xref': 'paper',
                'yref': 'paper',
                'showarrow': False,
                'font': {'size': 20}
            }]
        )
        return fig
    
    # Count messages by spectral region
    df = pd.DataFrame(messages)
    spectral_counts = df['spectral_region'].value_counts()
    
    # Define colors for each spectral region
    spectral_colors = {
        'Ultraviolet': '#8B00FF',
        'Visible': '#00FF00',
        'Infrared': '#FF0000',
        'Radio': '#FFA500',
        'Microwave': '#FFFF00',
        'X-Ray': '#0000FF',
        'Gamma': '#FF00FF'
    }
    
    colors = [spectral_colors.get(str(region), '#808080') for region in spectral_counts.index]
    
    fig = go.Figure(data=[go.Pie(
        labels=spectral_counts.index,
        values=spectral_counts.values,
        hole=0.3,
        marker=dict(colors=colors)
    )])
    
    fig.update_layout(
        title="Message Spectral Distribution",
        height=400
    )
    
    return fig


def create_network_activity_chart(transactions, messages):
    """Create network activity comparison chart"""
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('Transaction Activity', 'Message Activity'),
        specs=[[{'type': 'indicator'}, {'type': 'indicator'}]]
    )
    
    # Transaction metrics
    total_tx_value = sum(tx['amount_nxt'] for tx in transactions) if transactions else 0
    total_tx_fees = sum(tx['fee_nxt'] for tx in transactions) if transactions else 0
    
    fig.add_trace(go.Indicator(
        mode="number+delta",
        value=len(transactions),
        title={'text': f"Total Transactions<br><span style='font-size:0.8em'>{total_tx_value:.2f} NXT transferred</span>"},
        delta={'reference': 0},
        domain={'x': [0, 1], 'y': [0, 1]}
    ), row=1, col=1)
    
    # Message metrics
    total_msg_cost = sum(msg['cost_nxt'] for msg in messages) if messages else 0
    
    fig.add_trace(go.Indicator(
        mode="number+delta",
        value=len(messages),
        title={'text': f"Total Messages<br><span style='font-size:0.8em'>{total_msg_cost:.6f} NXT burned</span>"},
        delta={'reference': 0},
        domain={'x': [0, 1], 'y': [0, 1]}
    ), row=1, col=2)
    
    fig.update_layout(height=250)
    
    return fig


def create_wallet_distribution_chart(wallets):
    """Create wallet balance distribution chart"""
    if not wallets:
        fig = go.Figure()
        fig.update_layout(
            title="Wallet Balance Distribution",
            annotations=[{
                'text': 'No wallets found',
                'xref': 'paper',
                'yref': 'paper',
                'showarrow': False,
                'font': {'size': 20}
            }]
        )
        return fig
    
    df = pd.DataFrame(wallets)
    df = df.sort_values('balance_nxt', ascending=False).head(20)
    
    fig = go.Figure(data=[go.Bar(
        x=[f"{addr[:10]}..." for addr in df['address']],
        y=df['balance_nxt'],
        marker=dict(
            color=df['balance_nxt'],
            colorscale='Blues',
            showscale=True,
            colorbar=dict(title="NXT Balance")
        ),
        text=[f"{bal:.2f} NXT" for bal in df['balance_nxt']],
        textposition='outside'
    )])
    
    fig.update_layout(
        title="Top 20 Wallets by Balance",
        xaxis_title="Wallet Address",
        yaxis_title="Balance (NXT)",
        height=500,
        showlegend=False
    )
    
    return fig


def render_blockchain_dashboard():
    """Render the REAL blockchain explorer dashboard"""
    st.title("⛓️ NexusOS Blockchain Explorer")
    st.markdown("**🔴 LIVE DATA** - Real transactions, messages, and network state from production blockchain")
    
    # Initialize wallet system
    try:
        wallet_system = NexusNativeWallet()
    except Exception as e:
        st.error(f"❌ Failed to connect to blockchain database: {str(e)}")
        st.info("Make sure the PostgreSQL database is running and accessible.")
        return
    
    # Fetch real blockchain data
    with st.spinner("📡 Loading blockchain data..."):
        try:
            # Efficient bulk queries - single database call each
            all_wallets = wallet_system.list_wallets()
            all_transactions = wallet_system.get_all_transactions(limit=10000)
            all_messages = wallet_system.get_all_messages(limit=10000)
            
        except Exception as e:
            st.error(f"❌ Failed to load blockchain data: {str(e)}")
            return
    
    # Sidebar metrics
    st.sidebar.header("🌐 Network Overview")
    
    total_value = sum(tx['amount_nxt'] for tx in all_transactions)
    total_fees = sum(tx['fee_nxt'] for tx in all_transactions)
    total_msg_burns = sum(msg['cost_nxt'] for msg in all_messages)
    total_supply_circulating = sum(w['balance_nxt'] for w in all_wallets)
    
    st.sidebar.metric("Active Wallets", len(all_wallets))
    st.sidebar.metric("Total Transactions", len(all_transactions))
    st.sidebar.metric("Total Messages", len(all_messages))
    st.sidebar.metric("Circulating Supply", f"{total_supply_circulating:.2f} NXT")
    
    st.sidebar.divider()
    
    st.sidebar.subheader("💰 Economic Metrics")
    st.sidebar.metric("Total Value Transferred", f"{total_value:.2f} NXT")
    st.sidebar.metric("Total TX Fees", f"{total_fees:.6f} NXT")
    st.sidebar.metric("Total Message Burns", f"{total_msg_burns:.6f} NXT")
    st.sidebar.metric("Total Burned (Deflationary)", f"{total_fees + total_msg_burns:.6f} NXT")
    
    # Main dashboard tabs
    tabs = st.tabs(["📊 Overview", "💸 Transactions", "📨 Messages", "👥 Wallets", "⚛️ Physics Metrics"])
    
    with tabs[0]:  # Overview
        st.header("Network Activity")
        
        # Activity indicators
        st.plotly_chart(create_network_activity_chart(all_transactions, all_messages), use_container_width=True)
        
        st.divider()
        
        # Key metrics grid
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Wallets", len(all_wallets))
        
        with col2:
            avg_balance = total_supply_circulating / len(all_wallets) if all_wallets else 0
            st.metric("Avg Balance", f"{avg_balance:.2f} NXT")
        
        with col3:
            avg_tx_value = total_value / len(all_transactions) if all_transactions else 0
            st.metric("Avg TX Value", f"{avg_tx_value:.2f} NXT")
        
        with col4:
            avg_msg_cost = total_msg_burns / len(all_messages) if all_messages else 0
            st.metric("Avg Message Cost", f"{avg_msg_cost:.6f} NXT")
        
        st.divider()
        
        # Charts grid
        col1, col2 = st.columns(2)
        
        with col1:
            if all_transactions:
                st.plotly_chart(create_transaction_timeline(all_transactions), use_container_width=True)
            else:
                st.info("No transactions found in the blockchain")
        
        with col2:
            if all_messages:
                st.plotly_chart(create_spectral_distribution(all_messages), use_container_width=True)
            else:
                st.info("No messages found in the blockchain")
    
    with tabs[1]:  # Transactions
        st.header("Transaction History")
        
        if all_transactions:
            # Sort by timestamp (most recent first)
            sorted_txs = sorted(all_transactions, key=lambda x: x['timestamp'], reverse=True)
            
            # Display controls
            col1, col2 = st.columns([3, 1])
            with col1:
                search_tx = st.text_input("🔍 Search Transaction ID", placeholder="Enter TX ID to filter")
            with col2:
                limit = st.selectbox("Show entries", [10, 25, 50, 100, 500], index=1)
            
            # Filter transactions
            if search_tx:
                filtered_txs = [tx for tx in sorted_txs if search_tx.lower() in tx['tx_id'].lower()]
            else:
                filtered_txs = sorted_txs[:limit]
            
            # Display transaction table
            if filtered_txs:
                tx_df = pd.DataFrame(filtered_txs)
                st.dataframe(
                    tx_df[[
                        'tx_id', 'from_address', 'to_address', 
                        'amount_nxt', 'fee_nxt', 'status', 'timestamp'
                    ]],
                    use_container_width=True,
                    height=600
                )
            else:
                st.warning("No transactions match your search criteria")
            
            st.info(f"Showing {len(filtered_txs)} of {len(all_transactions)} total transactions")
            
            # Transaction details expander
            if filtered_txs:
                st.subheader("Transaction Details")
                selected_tx_id = st.selectbox("Select transaction to view quantum proof", 
                                             [tx['tx_id'] for tx in filtered_txs[:20]])
                
                if selected_tx_id:
                    try:
                        proof = wallet_system.export_quantum_proof(selected_tx_id)
                        
                        col1, col2 = st.columns(2)
                        
                        with col1:
                            st.json({
                                'transaction_id': proof['tx_id'],
                                'interference_hash': proof['interference_hash'],
                                'energy_cost': proof['energy_cost']
                            })
                        
                        with col2:
                            st.json({
                                'wave_signature': proof['wave_signature'],
                                'spectral_proof': proof['spectral_proof']
                            })
                    except Exception as e:
                        st.error(f"Failed to load quantum proof: {str(e)}")
        else:
            st.info("No transactions found. Send your first NXT transaction to see it here!")
    
    with tabs[2]:  # Messages
        st.header("DAG Message History")
        
        if all_messages:
            # Sort by timestamp (most recent first)
            sorted_msgs = sorted(all_messages, key=lambda x: x['timestamp'], reverse=True)
            
            # Display controls
            col1, col2 = st.columns([3, 1])
            with col1:
                search_msg = st.text_input("🔍 Search Message", placeholder="Enter message ID or content")
            with col2:
                limit = st.selectbox("Show messages", [10, 25, 50, 100, 500], index=1, key="msg_limit")
            
            # Filter messages
            if search_msg:
                filtered_msgs = [msg for msg in sorted_msgs if 
                                search_msg.lower() in msg['message_id'].lower() or
                                search_msg.lower() in msg['content'].lower()]
            else:
                filtered_msgs = sorted_msgs[:limit]
            
            # Display message table
            if filtered_msgs:
                msg_df = pd.DataFrame(filtered_msgs)
                st.dataframe(
                    msg_df[[
                        'message_id', 'from_address', 'to_address', 
                        'content', 'spectral_region', 'wavelength', 
                        'cost_nxt', 'timestamp'
                    ]],
                    use_container_width=True,
                    height=600
                )
            else:
                st.warning("No messages match your search criteria")
            
            st.info(f"Showing {len(filtered_msgs)} of {len(all_messages)} total messages")
        else:
            st.info("No messages found. Send your first DAG message to see it here!")
    
    with tabs[3]:  # Wallets
        st.header("Network Wallets")
        
        if all_wallets:
            # Wallet distribution chart
            st.plotly_chart(create_wallet_distribution_chart(all_wallets), use_container_width=True)
            
            st.divider()
            
            # Wallet table
            wallet_df = pd.DataFrame(all_wallets)
            wallet_df = wallet_df.sort_values('balance_nxt', ascending=False)
            
            st.dataframe(
                wallet_df[['address', 'balance_nxt', 'created_at', 'last_used']],
                use_container_width=True,
                height=500
            )
            
            st.info(f"Total active wallets: {len(all_wallets)}")
        else:
            st.info("No wallets found. Create your first wallet to get started!")
    
    with tabs[4]:  # Physics Metrics
        st.header("⚛️ Quantum Physics Metrics")
        
        st.markdown("""
        NexusOS uses electromagnetic wavelength mechanics (E=hf) instead of traditional cryptographic hashing.
        Every message is validated using Maxwell's equations and Planck's quantum theory.
        """)
        
        if all_messages:
            st.subheader("Wavelength Distribution")
            
            # Create wavelength histogram
            msg_df = pd.DataFrame(all_messages)
            
            fig = go.Figure()
            fig.add_trace(go.Histogram(
                x=msg_df['wavelength'],
                nbinsx=50,
                name='Wavelength Distribution',
                marker=dict(
                    color='rgba(0, 100, 200, 0.7)',
                    line=dict(color='white', width=1)
                )
            ))
            
            fig.update_layout(
                title="Message Wavelength Distribution (nm)",
                xaxis_title="Wavelength (nm)",
                yaxis_title="Count",
                height=400
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            st.divider()
            
            # Energy cost analysis
            st.subheader("Energy Cost Analysis (E=hf)")
            
            total_energy = sum(msg['cost_nxt'] for msg in all_messages)
            avg_energy = total_energy / len(all_messages)
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Total Energy Burned", f"{total_energy:.8f} NXT")
            
            with col2:
                st.metric("Avg Energy/Message", f"{avg_energy:.8f} NXT")
            
            with col3:
                # Calculate from wavelength: E = hc/λ
                h = 6.62607015e-34  # Planck constant (J⋅s)
                c = 299792458  # Speed of light (m/s)
                avg_wavelength = msg_df['wavelength'].mean() * 1e-9  # Convert nm to meters
                avg_photon_energy = (h * c / avg_wavelength) if avg_wavelength > 0 else 0
                st.metric("Avg Photon Energy", f"{avg_photon_energy:.2e} J")
            
            st.divider()
            
            # Spectral region breakdown
            st.subheader("Spectral Region Usage")
            
            spectral_stats = msg_df.groupby('spectral_region').agg({
                'cost_nxt': ['sum', 'mean', 'count'],
                'wavelength': ['min', 'max', 'mean']
            }).round(6)
            
            st.dataframe(spectral_stats, use_container_width=True)
            
        else:
            st.info("No message data available for physics analysis")
        
        # Genesis block information
        st.divider()
        st.subheader("🎉 Genesis Block Information")
        
        st.markdown("""
        **Historic Achievement: November 22, 2025, 09:13:54 UTC**
        
        NexusOS successfully deployed the world's first physics-based blockchain using electromagnetic wavelength mechanics (E=hf).
        
        - **Genesis Block ID**: MSG53B1B15204713C7D0A8E7CB1
        - **Spectral Region**: Ultraviolet (λ = 250nm)
        - **Energy Cost**: 7.95×10⁻³⁶ NXT
        - **Validation**: Maxwell's equations + Planck's quantum theory
        - **Security**: Quantum-resistant, mobile-first architecture
        """)
    
    # Refresh button
    st.divider()
    col1, col2, col3 = st.columns([1, 1, 1])
    with col2:
        if st.button("🔄 Refresh Data", use_container_width=True):
            st.rerun()
