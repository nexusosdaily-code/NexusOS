"""
NexusOS Web3 Wallet - CLI Interface
====================================
Command-line interface for quantum-resistant wallet operations.
"""

import os
import sys
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from dotenv import load_dotenv

from .core import NexusWeb3Wallet

# Load environment variables
load_dotenv()

console = Console()

@click.group()
@click.version_option(version="1.0.0")
def main():
    """
    NexusOS Web3 Wallet - Quantum-Resistant Cryptocurrency Wallet
    
    A production Web3 wallet with wavelength encryption for hacker-proof security.
    """
    pass

@main.command()
@click.option('--password', prompt=True, hide_input=True, 
              confirmation_prompt=True, help='Wallet password')
@click.option('--db', default=None, help='Database URL (default: SQLite)')
def create(password, db):
    """Create a new quantum-resistant wallet"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        result = wallet.create_quantum_wallet(password)
        
        console.print("\n[green]✓[/green] Quantum wallet created successfully!\n")
        
        table = Table(title="Wallet Details", show_header=False)
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Address", result['address'])
        table.add_row("Spectral Regions", str(len(result['spectral_regions'])))
        table.add_row("Created", result['created_at'])
        
        console.print(table)
        console.print("\n[yellow]⚠ Save your password! It cannot be recovered.[/yellow]\n")
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

@main.command()
@click.option('--private-key', prompt=True, hide_input=True, 
              help='Private key to import')
@click.option('--password', prompt=True, hide_input=True,
              confirmation_prompt=True, help='Wallet password')
@click.option('--db', default=None, help='Database URL')
def import_wallet(private_key, password, db):
    """Import existing wallet with quantum encryption"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        result = wallet.import_wallet(private_key, password)
        
        console.print("\n[green]✓[/green] Wallet imported successfully!\n")
        console.print(f"[cyan]Address:[/cyan] {result['address']}\n")
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

@main.command()
@click.argument('address')
@click.option('--network', default='ethereum_sepolia', 
              help='Network (ethereum_mainnet, ethereum_sepolia, bsc_mainnet, polygon_mainnet)')
@click.option('--db', default=None, help='Database URL')
def balance(address, network, db):
    """Check wallet balance"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        wallet.active_network = network
        result = wallet.get_balance(address, network)
        
        panel = Panel(
            f"[green]{result['balance']} {result['currency']}[/green]",
            title=f"Balance for {address[:8]}...{address[-6:]}",
            subtitle=result['network']
        )
        console.print(panel)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

@main.command()
@click.option('--from', 'from_address', required=True, help='Sender address')
@click.option('--to', 'to_address', required=True, help='Recipient address')
@click.option('--amount', required=True, type=float, help='Amount to send (ETH)')
@click.option('--password', prompt=True, hide_input=True, help='Wallet password')
@click.option('--network', default='ethereum_sepolia', help='Network')
@click.option('--gas-limit', default=21000, type=int, help='Gas limit')
@click.option('--db', default=None, help='Database URL')
def send(from_address, to_address, amount, password, network, gas_limit, db):
    """Send quantum-encrypted transaction"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        wallet.active_network = network
        
        console.print(f"\n[yellow]Sending {amount} ETH to {to_address}...[/yellow]\n")
        
        result = wallet.create_transaction(
            from_address=from_address,
            to_address=to_address,
            amount_eth=str(amount),
            password=password,
            network_key=network,
            gas_limit=gas_limit
        )
        
        console.print("[green]✓[/green] Transaction sent!\n")
        
        table = Table(show_header=False)
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("TX Hash", result['tx_hash'])
        table.add_row("From", result['from'])
        table.add_row("To", result['to'])
        table.add_row("Amount", f"{result['value_eth']} ETH")
        table.add_row("Network", result['network'])
        table.add_row("Explorer", result['explorer_url'])
        
        console.print(table)
        
        # Show quantum security
        console.print("\n[bold cyan]Quantum Security:[/bold cyan]")
        qs = result['quantum_security']
        console.print(f"  Spectral Regions: {qs['spectral_regions']}")
        console.print(f"  Energy Cost: {qs['energy_cost_joules']:.2e} J")
        console.print(f"  Interference Hash: {qs['interference_hash']}")
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

@main.command()
@click.argument('address')
@click.option('--limit', default=10, type=int, help='Number of transactions')
@click.option('--db', default=None, help='Database URL')
def history(address, limit, db):
    """View transaction history"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        transactions = wallet.get_transaction_history(address, limit)
        
        if not transactions:
            console.print("[yellow]No transactions found[/yellow]")
            return
        
        table = Table(title=f"Transaction History - {address[:8]}...{address[-6:]}")
        table.add_column("TX Hash", style="cyan")
        table.add_column("From/To", style="white")
        table.add_column("Value", style="green")
        table.add_column("Status", style="yellow")
        table.add_column("Quantum", style="magenta")
        
        for tx in transactions:
            direction = "→" if tx['from'].lower() == address.lower() else "←"
            tx_hash_short = f"{tx['tx_hash'][:8]}...{tx['tx_hash'][-6:]}"
            quantum_icon = "🔐" if tx['quantum_verified'] else "❌"
            
            table.add_row(
                tx_hash_short,
                direction,
                tx['value_wei'],
                tx['status'],
                quantum_icon
            )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

@main.command()
@click.argument('tx_hash')
@click.option('--db', default=None, help='Database URL')
def export_proof(tx_hash, db):
    """Export quantum security proof"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        proof = wallet.export_quantum_proof(tx_hash)
        
        console.print("\n[bold cyan]Quantum Security Proof[/bold cyan]\n")
        console.print(f"TX Hash: {proof['tx_hash']}")
        console.print(f"Quantum Verified: {'✓' if proof['quantum_verified'] else '✗'}")
        console.print(f"Energy Cost: {proof['energy_cost_joules']:.2e} J")
        console.print(f"Interference Hash: {proof['interference_hash'][:32]}...")
        console.print(f"Spectral Signatures: {len(proof['spectral_signatures'])} regions")
        
        # Option to save to file
        if click.confirm("\nSave proof to file?"):
            import json
            filename = f"quantum_proof_{tx_hash[:16]}.json"
            with open(filename, 'w') as f:
                json.dump(proof, f, indent=2)
            console.print(f"[green]✓[/green] Proof saved to {filename}")
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

@main.command()
@click.option('--db', default=None, help='Database URL')
def list_wallets(db):
    """List all wallets"""
    try:
        wallet = NexusWeb3Wallet(database_url=db)
        wallets = wallet.list_wallets()
        
        if not wallets:
            console.print("[yellow]No wallets found. Create one with 'nexus-wallet-cli create'[/yellow]")
            return
        
        table = Table(title="Quantum Wallets")
        table.add_column("Address", style="cyan")
        table.add_column("Created", style="white")
        table.add_column("Last Used", style="yellow")
        
        for w in wallets:
            table.add_row(
                w['address'],
                w['created_at'][:10],
                w['last_used'][:10] if w['last_used'] else "Never"
            )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
