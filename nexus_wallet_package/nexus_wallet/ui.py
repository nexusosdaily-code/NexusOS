"""
NexusOS Web3 Wallet - Streamlit UI
===================================
Interactive dashboard for quantum-resistant wallet operations.
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Launch Streamlit UI for NexusOS Web3 Wallet"""
    # Get the package directory
    package_dir = Path(__file__).parent
    dashboard_file = package_dir / "dashboard.py"
    
    # Check if dashboard exists
    if not dashboard_file.exists():
        print("Error: Dashboard file not found")
        print(f"Expected location: {dashboard_file}")
        sys.exit(1)
    
    # Set environment variables for Streamlit
    os.environ.setdefault("STREAMLIT_SERVER_PORT", "5000")
    os.environ.setdefault("STREAMLIT_SERVER_ADDRESS", "0.0.0.0")
    
    # Launch Streamlit
    print("🔐 Launching NexusOS Web3 Wallet Dashboard...")
    print("📍 Opening at http://localhost:5000")
    print("Press Ctrl+C to stop\n")
    
    try:
        subprocess.run([
            sys.executable, "-m", "streamlit", "run",
            str(dashboard_file),
            "--server.port", "5000",
            "--server.address", "0.0.0.0",
            "--theme.base", "dark"
        ])
    except KeyboardInterrupt:
        print("\n\n👋 Wallet dashboard stopped")
        sys.exit(0)

if __name__ == '__main__':
    main()
