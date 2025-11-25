"""
WNSP Economic Engine: E=hf Energy Economics Simulator
Demonstrates how wavelength energy costs create NXT token economics and BHLS floor guarantee.
Production-ready implementation for practitioners building on WNSP.
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import numpy as np
import pandas as pd
from dataclasses import dataclass
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import json

# Physics constants
PLANCK_CONSTANT = 6.626e-34  # Joules·seconds
SPEED_OF_LIGHT = 3e8  # meters/second
BOLTZMANN_CONSTANT = 1.380649e-23  # Joules/Kelvin

# Economic constants
NXT_SUPPLY_TOTAL = 21_000_000  # Fixed supply like Bitcoin
ENERGY_TO_NXT_RATIO = 1e15  # Energy units to NXT conversion (tunable)
BHLS_FLOOR_PERCENT = 0.05  # 5% of reserves dedicated to floor

@dataclass
class WavelengthBand:
    """Represents a spectrum band and its economic properties"""
    name: str
    frequency_hz: float  # Hz
    wavelength_m: float  # meters
    bandwidth_mhz: float  # MHz
    energy_per_bit: float  # Joules per bit
    nxt_per_bit: float  # NXT per bit
    use_case: str
    node_count: int = 0

class WNSPEconomicEngine:
    """Core economic simulation engine"""
    
    def __init__(self):
        self.initialize_spectrum()
        self.initialize_pools()
        self.transaction_history = []
        self.validator_stats = {}
        self.timestamp = datetime.now()
    
    def initialize_spectrum(self):
        """Initialize standard WNSP wavelength bands"""
        self.bands = {
            "ELF": WavelengthBand(
                name="ELF (Extremely Low Frequency)",
                frequency_hz=50,
                wavelength_m=6e6,
                bandwidth_mhz=0.001,
                energy_per_bit=1.66e-33,
                nxt_per_bit=1e-18,
                use_case="Long-range mesh, BHLS signaling"
            ),
            "VLF": WavelengthBand(
                name="VLF (Very Low Frequency)",
                frequency_hz=10e3,
                wavelength_m=3e4,
                bandwidth_mhz=0.1,
                energy_per_bit=3.33e-31,
                nxt_per_bit=1e-16,
                use_case="Regional mesh, governance"
            ),
            "LF": WavelengthBand(
                name="LF (Low Frequency)",
                frequency_hz=100e3,
                wavelength_m=3e3,
                bandwidth_mhz=1,
                energy_per_bit=3.33e-29,
                nxt_per_bit=1e-14,
                use_case="Local mesh, communities"
            ),
            "MF": WavelengthBand(
                name="MF (Medium Frequency)",
                frequency_hz=1e6,
                wavelength_m=300,
                bandwidth_mhz=10,
                energy_per_bit=3.33e-28,
                nxt_per_bit=1e-13,
                use_case="City-scale, transactions"
            ),
            "HF": WavelengthBand(
                name="HF (High Frequency)",
                frequency_hz=10e6,
                wavelength_m=30,
                bandwidth_mhz=100,
                energy_per_bit=3.33e-27,
                nxt_per_bit=1e-12,
                use_case="Short-range, high throughput"
            ),
            "VHF": WavelengthBand(
                name="VHF (Very High Frequency)",
                frequency_hz=100e6,
                wavelength_m=3,
                bandwidth_mhz=1000,
                energy_per_bit=3.33e-26,
                nxt_per_bit=1e-11,
                use_case="Mobile, P2P"
            ),
        }
    
    def initialize_pools(self):
        """Initialize economic reserve pools"""
        self.pools = {
            "reserve": {"balance": NXT_SUPPLY_TOTAL * 0.40, "purpose": "Core reserve"},
            "f_floor": {"balance": NXT_SUPPLY_TOTAL * 0.15, "purpose": "BHLS floor guarantee"},
            "service_pools": {
                f"pool_{i}": {"balance": NXT_SUPPLY_TOTAL * 0.05, "purpose": f"Service {i+1}"}
                for i in range(5)
            },
            "validator_rewards": {"balance": NXT_SUPPLY_TOTAL * 0.20, "purpose": "Validator incentives"},
            "dex_liquidity": {"balance": NXT_SUPPLY_TOTAL * 0.10, "purpose": "DEX pools"},
        }
    
    def calculate_message_cost(self, message_bytes: int, frequency_hz: float) -> Tuple[float, float, float]:
        """
        Calculate E=hf cost of sending a message.
        Returns: (energy_joules, nxt_cost, bell_violation_quality)
        """
        bits = message_bytes * 8
        energy_per_bit = PLANCK_CONSTANT * frequency_hz
        total_energy = energy_per_bit * bits
        nxt_cost = total_energy * ENERGY_TO_NXT_RATIO / 1e15
        
        # Bell violation quality (0-1, higher = better entanglement proof)
        bell_quality = min(0.95, 0.5 + (frequency_hz / 1e9) * 0.001)
        
        return total_energy, nxt_cost, bell_quality
    
    def process_transaction(self, 
                           sender: str, 
                           receiver: str, 
                           amount_nxt: float,
                           message_bytes: int = 256,
                           frequency_hz: float = 1e6,
                           validator_count: int = 5) -> Dict:
        """Process a transaction and allocate through economic system"""
        
        # Calculate energy cost
        tx_energy, tx_cost, bell_quality = self.calculate_message_cost(message_bytes, frequency_hz)
        
        # Total cost = transaction amount + energy overhead
        total_cost = amount_nxt + tx_cost
        
        # Allocate through pools (Economic Loop System)
        validator_reward = total_cost * 0.15 / validator_count
        f_floor_contribution = total_cost * 0.05
        dex_fee = total_cost * 0.02
        reserve_allocation = total_cost * 0.03
        
        # Update pools
        self.pools["validator_rewards"]["balance"] += validator_reward * validator_count
        self.pools["f_floor"]["balance"] += f_floor_contribution
        self.pools["dex_liquidity"]["balance"] += dex_fee
        self.pools["reserve"]["balance"] += reserve_allocation
        
        tx_record = {
            "timestamp": datetime.now(),
            "sender": sender,
            "receiver": receiver,
            "amount_nxt": amount_nxt,
            "tx_cost_nxt": tx_cost,
            "total_cost_nxt": total_cost,
            "energy_joules": tx_energy,
            "frequency_hz": frequency_hz,
            "message_bytes": message_bytes,
            "bell_violation": bell_quality,
            "validator_reward_nxt": validator_reward,
            "f_floor_contribution": f_floor_contribution,
            "dex_fee": dex_fee,
        }
        
        self.transaction_history.append(tx_record)
        
        # Update validator stats
        if validator_count not in self.validator_stats:
            self.validator_stats[validator_count] = {"count": 0, "reward": 0}
        self.validator_stats[validator_count]["count"] += 1
        self.validator_stats[validator_count]["reward"] += validator_reward * validator_count
        
        return tx_record
    
    def calculate_bhls_floor_value(self, world_population: int = 8_000_000_000) -> Dict:
        """Calculate guaranteed basic living standard per person"""
        floor_pool = self.pools["f_floor"]["balance"]
        nxt_per_person = floor_pool / world_population
        
        # Convert to daily energy equivalent
        daily_energy_joules = (nxt_per_person / ENERGY_TO_NXT_RATIO) * 1e15
        daily_energy_kwh = daily_energy_joules / 3.6e6
        
        return {
            "floor_pool_nxt": floor_pool,
            "nxt_per_person": nxt_per_person,
            "daily_energy_joules": daily_energy_joules,
            "daily_energy_kwh": daily_energy_kwh,
            "annual_energy_kwh": daily_energy_kwh * 365,
            "world_population": world_population,
        }
    
    def simulate_daily_activity(self, days: int = 30, 
                                transactions_per_day: int = 1000,
                                nodes: int = 100) -> pd.DataFrame:
        """Simulate network activity over time"""
        results = []
        
        for day in range(days):
            daily_volume = 0
            daily_energy = 0
            daily_f_floor = 0
            
            for _ in range(transactions_per_day):
                # Random transaction
                amount = np.random.exponential(10)
                freq = np.random.choice([1e6, 10e6, 100e6, 1e9])
                msg_size = np.random.randint(64, 512)
                validators = np.random.randint(3, 11)
                
                tx = self.process_transaction(
                    f"node_{np.random.randint(0, nodes)}",
                    f"node_{np.random.randint(0, nodes)}",
                    amount,
                    msg_size,
                    freq,
                    validators
                )
                
                daily_volume += tx["total_cost_nxt"]
                daily_energy += tx["energy_joules"]
                daily_f_floor += tx["f_floor_contribution"]
            
            bhls = self.calculate_bhls_floor_value()
            results.append({
                "day": day,
                "total_volume_nxt": daily_volume,
                "total_energy_joules": daily_energy,
                "f_floor_contribution": daily_f_floor,
                "f_floor_balance": self.pools["f_floor"]["balance"],
                "nxt_per_person_daily": bhls["nxt_per_person"],
                "daily_energy_kwh": bhls["daily_energy_kwh"],
            })
        
        return pd.DataFrame(results)

def render_dashboard():
    """Main Streamlit dashboard"""
    st.set_page_config(page_title="WNSP Economic Engine", layout="wide")
    
    st.title("⚡ WNSP Economic Engine")
    st.markdown("**E=hf Energy Economics to Basic Human Living Standards**")
    st.divider()
    
    # Initialize engine
    if "engine" not in st.session_state:
        st.session_state.engine = WNSPEconomicEngine()
    
    engine = st.session_state.engine
    
    # Sidebar controls
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        sim_days = st.slider("Simulation days", 1, 365, 30)
        daily_txs = st.slider("Transactions per day", 100, 10000, 1000, step=100)
        num_nodes = st.slider("Network nodes", 10, 1000, 100, step=10)
        world_pop = st.number_input("World population", value=8_000_000_000, step=1_000_000_000)
        
        if st.button("Run Simulation", use_container_width=True):
            with st.spinner("Running economic simulation..."):
                st.session_state.results = engine.simulate_daily_activity(
                    days=sim_days,
                    transactions_per_day=daily_txs,
                    nodes=num_nodes
                )
                st.session_state.bhls = engine.calculate_bhls_floor_value(world_pop)
                st.success("✅ Simulation complete!")
    
    # Main content tabs
    tab1, tab2, tab3, tab4 = st.tabs(["📊 Economic Overview", "⚡ Energy Economics", "🏦 Pool Distribution", "🌍 BHLS Guarantee"])
    
    if "results" in st.session_state:
        results = st.session_state.results
        bhls = st.session_state.bhls
        
        # Tab 1: Economic Overview
        with tab1:
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                total_volume = results["total_volume_nxt"].sum()
                st.metric("Total Transaction Volume", f"{total_volume:.2f} NXT", "Over simulation period")
            
            with col2:
                avg_daily = results["total_volume_nxt"].mean()
                st.metric("Avg Daily Volume", f"{avg_daily:.2f} NXT", "Daily transaction throughput")
            
            with col3:
                total_energy = results["total_energy_joules"].sum()
                total_kwh = total_energy / 3.6e6
                st.metric("Network Energy Cost", f"{total_kwh:.0f} kWh", "Cumulative energy over period")
            
            with col4:
                f_floor_today = results["f_floor_balance"].iloc[-1] if len(results) > 0 else bhls["floor_pool_nxt"]
                st.metric("F_floor Balance", f"{f_floor_today:.0f} NXT", "Current BHLS guarantee reserve")
            
            # Volume over time
            st.subheader("Transaction Volume Timeline")
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=results["day"],
                y=results["total_volume_nxt"],
                mode='lines+markers',
                name='Daily Volume',
                line=dict(color='#0066CC', width=2),
                fill='tozeroy',
                fillcolor='rgba(0, 102, 204, 0.2)'
            ))
            fig.update_layout(hovermode='x unified', height=400, template='plotly_dark')
            st.plotly_chart(fig, use_container_width=True)
        
        # Tab 2: Energy Economics
        with tab2:
            st.subheader("E=hf Energy to NXT Conversion")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("""
                **Planck's Equation: E = hf**
                - Energy cost is universal (not arbitrary)
                - Every message has exact physical cost
                - Cost proportional to frequency
                - Economics pegged to physics
                """)
            
            with col2:
                # Show wavelength bands
                band_data = []
                for name, band in engine.bands.items():
                    band_data.append({
                        "Band": band.name,
                        "Frequency (Hz)": f"{band.frequency_hz:.2e}",
                        "Energy/bit (J)": f"{band.energy_per_bit:.2e}",
                        "NXT/bit": f"{band.nxt_per_bit:.2e}",
                        "Use Case": band.use_case
                    })
                
                st.dataframe(pd.DataFrame(band_data), use_container_width=True, hide_index=True)
            
            # Energy efficiency chart
            st.subheader("Daily Energy Consumption")
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=results["day"],
                y=results["daily_energy_kwh"],
                mode='lines',
                name='Energy (kWh)',
                line=dict(color='#FF6B35', width=2),
                fill='tozeroy',
                fillcolor='rgba(255, 107, 53, 0.2)'
            ))
            fig.update_layout(hovermode='x unified', height=400, template='plotly_dark')
            st.plotly_chart(fig, use_container_width=True)
        
        # Tab 3: Pool Distribution
        with tab3:
            st.subheader("Economic Loop System - 5 Milestones")
            
            # Get current pool state
            pools_dict = {
                "Reserve": engine.pools["reserve"]["balance"],
                "F_floor (BHLS)": engine.pools["f_floor"]["balance"],
                "Validator Rewards": engine.pools["validator_rewards"]["balance"],
                "DEX Liquidity": engine.pools["dex_liquidity"]["balance"],
                "Service Pools": sum(p["balance"] for p in engine.pools["service_pools"].values())
            }
            
            col1, col2 = st.columns(2)
            
            with col1:
                fig = go.Figure(data=[go.Pie(
                    labels=list(pools_dict.keys()),
                    values=list(pools_dict.values()),
                    marker=dict(colors=['#0066CC', '#00CC66', '#FFAA00', '#FF6B35', '#AA00FF'])
                )])
                fig.update_layout(height=400, template='plotly_dark')
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                pool_table = pd.DataFrame({
                    "Pool": list(pools_dict.keys()),
                    "Balance (NXT)": [f"{v:.0f}" for v in pools_dict.values()],
                    "% of Total": [f"{(v/NXT_SUPPLY_TOTAL)*100:.1f}%" for v in pools_dict.values()]
                })
                st.dataframe(pool_table, use_container_width=True, hide_index=True)
        
        # Tab 4: BHLS Guarantee
        with tab4:
            st.subheader("🌍 Basic Human Living Standards Floor")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric(
                    "NXT Per Person (Daily)",
                    f"{bhls['nxt_per_person']:.2e}",
                    "From F_floor allocation"
                )
            
            with col2:
                st.metric(
                    "Daily Energy Guarantee",
                    f"{bhls['daily_energy_kwh']:.2f} kWh",
                    "Equivalent energy per person"
                )
            
            with col3:
                st.metric(
                    "Annual Energy Guarantee",
                    f"{bhls['annual_energy_kwh']:.0f} kWh",
                    "Per capita yearly allocation"
                )
            
            st.divider()
            
            # Sustainability analysis
            st.markdown("""
            ### Physics-Guaranteed Floor
            
            The BHLS floor works because:
            
            1. **Energy is Universal** - Every person can harvest ambient energy (Schumann resonance, cosmic rays, geomagnetic fields)
            2. **Wavelength is Infinite** - Spectrum bandwidth never depletes (unlike physical resources)
            3. **Economics is Physical** - E=hf pegs value to measurable quantity, preventing inflation
            4. **Math is Inevitable** - When energy = money, and everyone can harvest energy, basic prosperity is thermodynamic inevitability
            
            **Result**: BHLS isn't a policy. It's physics.
            """)
            
            # BHLS growth over time
            if len(results) > 1:
                st.subheader("F_floor Growth Over Time")
                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=results["day"],
                    y=results["f_floor_balance"],
                    mode='lines+markers',
                    name='F_floor Balance',
                    line=dict(color='#00CC66', width=2),
                    fill='tozeroy',
                    fillcolor='rgba(0, 204, 102, 0.2)'
                ))
                fig.update_layout(hovermode='x unified', height=400, template='plotly_dark')
                st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("👈 Configure simulation parameters and click 'Run Simulation' to begin")

if __name__ == "__main__":
    render_dashboard()
