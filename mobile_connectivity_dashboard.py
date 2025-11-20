"""
Mobile Connectivity Dashboard
==============================

Streamlit dashboard showing mobile devices connected to the NexusOS web platform.
Displays real-time connection status, network topology, and mobile validator activity.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
import numpy as np
from datetime import datetime
import time
import random

def get_simulated_network_status():
    """Generate simulated network status data"""
    return {
        'connected_mobiles': random.randint(15, 25),
        'active_validators': random.randint(8, 15),
        'total_nxt_staked': random.uniform(50000, 100000),
        'network_health': random.choice(['healthy', 'healthy', 'healthy', 'degraded'])
    }

def get_simulated_mobile_devices():
    """Generate simulated mobile device data"""
    spectral_regions = ['Infrared', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Violet', 'Ultraviolet']
    device_names = [
        'iPhone 15 Pro', 'Samsung Galaxy S24', 'Google Pixel 8', 'OnePlus 12',
        'Xiaomi 14', 'iPhone 14', 'Samsung Galaxy A54', 'Google Pixel 7a',
        'Motorola Edge 40', 'Nothing Phone 2', 'ASUS ROG Phone 7', 'Sony Xperia 1 V',
        'Realme GT 5', 'Oppo Find X6', 'Vivo X100', 'Honor Magic 6'
    ]
    
    current_time = time.time()
    mobiles = []
    
    for i in range(random.randint(12, 20)):
        connected_at = current_time - random.uniform(60, 86400)
        last_seen = current_time - random.uniform(0, 300)
        is_validator = random.random() > 0.5
        
        mobiles.append({
            'device_id': f'mobile_{i:03d}',
            'device_name': random.choice(device_names),
            'account_id': f'0x{random.randint(100000, 999999):06x}',
            'spectral_region': random.choice(spectral_regions),
            'is_validator': is_validator,
            'stake_nxt': random.uniform(1000, 10000) if is_validator else 0,
            'connected_at': connected_at,
            'last_seen': last_seen
        })
    
    return mobiles

def show_mobile_connectivity_dashboard():
    """Main dashboard showing mobile connectivity"""
    
    st.title("📱 Mobile Connectivity Dashboard")
    st.markdown("### Real-time view of mobile devices connected to NexusOS")
    st.info("💡 **Demo Mode**: Showing simulated mobile connectivity data")
    
    # Network status with simulated data
    status = get_simulated_network_status()
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "Connected Mobiles",
            status.get('connected_mobiles', 0),
            delta=None
        )
    
    with col2:
        st.metric(
            "Active Validators",
            status.get('active_validators', 0),
            delta=None
        )
    
    with col3:
        st.metric(
            "Total NXT Staked",
            f"{status.get('total_nxt_staked', 0):,.2f}",
            delta=None
        )
    
    with col4:
        health = status.get('network_health', 'healthy')
        health_emoji = "🟢" if health == "healthy" else "🟡"
        st.metric(
            "Network Health",
            f"{health_emoji} {health.title()}",
            delta=None
        )
    
    st.divider()
    
    # Mobile devices list
    st.subheader("📱 Connected Mobile Devices")
    
    # Get simulated mobile devices
    mobiles = get_simulated_mobile_devices()
    
    if mobiles:
        # Create DataFrame
        df = pd.DataFrame(mobiles)
        
        # Calculate online status
        current_time = time.time()
        df['online'] = df['last_seen'].apply(
            lambda x: '🟢 Online' if (current_time - x) < 60 else '🔴 Offline'
        )
        
        # Format timestamps
        df['connected_since'] = df['connected_at'].apply(
            lambda x: datetime.fromtimestamp(x).strftime('%Y-%m-%d %H:%M:%S')
        )
        
        df['last_active'] = df['last_seen'].apply(
            lambda x: datetime.fromtimestamp(x).strftime('%Y-%m-%d %H:%M:%S')
        )
        
        # Display table
        display_df = df[[
            'device_name', 
            'account_id', 
            'spectral_region', 
            'is_validator',
            'stake_nxt',
            'online',
            'connected_since',
            'last_active'
        ]].rename(columns={
            'device_name': 'Device Name',
            'account_id': 'Account ID',
            'spectral_region': 'Spectral Region',
            'is_validator': 'Validator',
            'stake_nxt': 'Stake (NXT)',
            'online': 'Status',
            'connected_since': 'Connected Since',
            'last_active': 'Last Active'
        })
        
        st.dataframe(display_df, use_container_width=True, height=300)
            
        # Spectral region distribution
        st.subheader("🌈 Spectral Diversity Distribution")
        
        region_counts = df['spectral_region'].value_counts()
        
        fig_regions = go.Figure(data=[
            go.Bar(
                x=region_counts.index,
                y=region_counts.values,
                marker_color=['#8B00FF', '#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#FF0000'][:len(region_counts)]
            )
        ])
        
        fig_regions.update_layout(
            title="Mobile Devices by Spectral Region",
            xaxis_title="Spectral Region",
            yaxis_title="Number of Devices",
            height=300
        )
        
        st.plotly_chart(fig_regions, use_container_width=True)
            
        # Validator vs Non-validator
        col1, col2 = st.columns(2)
        
        with col1:
            validator_counts = df['is_validator'].value_counts()
            
            fig_validators = go.Figure(data=[
                go.Pie(
                    labels=['Validators', 'Regular Users'],
                    values=[
                        validator_counts.get(True, 0),
                        validator_counts.get(False, 0)
                    ],
                    marker_colors=['#00FF00', '#808080']
                )
            ])
            
            fig_validators.update_layout(
                title="Validator Distribution",
                height=300
            )
            
            st.plotly_chart(fig_validators, use_container_width=True)
        
        with col2:
            # Total stake by region
            stake_by_region = df[df['is_validator']].groupby('spectral_region')['stake_nxt'].sum()
            
            if len(stake_by_region) > 0:
                fig_stake = go.Figure(data=[
                    go.Bar(
                        x=stake_by_region.index,
                        y=stake_by_region.values,
                        marker_color='#FFD700'
                    )
                ])
                
                fig_stake.update_layout(
                    title="NXT Staked by Spectral Region",
                    xaxis_title="Region",
                    yaxis_title="NXT Staked",
                    height=300
                )
                
                st.plotly_chart(fig_stake, use_container_width=True)
            else:
                st.info("No validators staked yet")
        
        st.divider()
        
        # Connection Statistics
        st.subheader("📊 Connection Statistics")
        
        # Connection duration distribution
        df['connection_duration_minutes'] = (current_time - df['connected_at']) / 60
        
        fig_duration = px.histogram(
            df,
            x='connection_duration_minutes',
            nbins=20,
            title="Connection Duration Distribution",
            labels={'connection_duration_minutes': 'Duration (minutes)'}
        )
        
        st.plotly_chart(fig_duration, use_container_width=True)
        
        # Average stats
        col1, col2, col3 = st.columns(3)
        
        with col1:
            avg_duration = df['connection_duration_minutes'].mean()
            st.metric("Avg Connection Time", f"{avg_duration:.1f} min")
        
        with col2:
            online_count = (df['online'] == '🟢 Online').sum()
            online_pct = (online_count / len(df)) * 100
            st.metric("Online Rate", f"{online_pct:.1f}%")
        
        with col3:
            total_stake = df['stake_nxt'].sum()
            st.metric("Total Staked", f"{total_stake:.2f} NXT")
    
    else:
        st.info("No mobile devices connected yet. Register a mobile device to get started!")
        
        with st.expander("🔧 How to Connect Mobile Devices"):
            st.markdown("""
            ### Quick Start Guide
            
            1. **Mobile App Registration**:
               - Download NexusOS mobile app (iOS/Android)
               - Create wallet or import existing
               - Connect to network via spectral region
            
            2. **Become a Validator** (optional):
               - Stake minimum 1,000 NXT
               - Select spectral region
               - Start validating transactions
            
            3. **Mobile Features**:
               - ✅ Send WNSP messages
               - ✅ Transfer NXT
               - ✅ Trade on DEX
               - ✅ View blockchain
               - ✅ Participate in governance
            """)
    
    st.divider()
    
    # Mobile-to-Web Architecture
    st.subheader("🏗️ Mobile-to-Web Architecture")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### How It Works
        
        **Mobile phones connect to existing web platform:**
        
        1. 📱 **Mobile App** → Sends request via REST/WebSocket
        2. 🌐 **API Gateway** → Receives request (port 5001)
        3. ⚙️ **Web Platform** → Processes using existing code
        4. 📤 **Response** → Sent back to mobile
        
        **Example Flow (Send WNSP Message):**
        ```
        Mobile: "Send message via WNSP"
            ↓
        API Gateway: Authenticate mobile
            ↓
        Web Platform: Use existing WnspEncoderV2
            ↓
        Calculate E=hf cost, create interference hash
            ↓
        Broadcast to all connected mobiles
            ↓
        Mobile: Receives confirmation + cost
        ```
        """)
    
    with col2:
        st.markdown("""
        ### Key Benefits
        
        ✅ **No Code Duplication**
        - Mobile uses existing web features
        - All logic stays on web platform
        
        ✅ **Lightweight Mobile**
        - Just UI + API calls
        - No blockchain storage needed
        
        ✅ **Real-time Updates**
        - WebSocket for instant notifications
        - Live block/transaction feeds
        
        ✅ **Zero Infrastructure**
        - No separate mobile servers
        - Uses existing web platform
        
        ✅ **Easy Updates**
        - Fix bugs once (web platform)
        - All mobiles benefit instantly
        """)
    
    st.divider()
    
    # Refresh button
    st.divider()
    if st.button("🔄 Refresh Dashboard", use_container_width=True):
        st.rerun()


if __name__ == "__main__":
    show_mobile_connectivity_dashboard()
