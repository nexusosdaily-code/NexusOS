"""
NexusOS Native Wallet - Command Line Interface
===============================================
CLI for managing NXT tokens and WNSP messaging
"""

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import print as rprint
from dotenv import load_dotenv

from nexus_native_wallet import NexusNativeWallet

load_dotenv()
console = Console()

@click.group()
@click.version_option(version="1.0.0")
def main():
    """NexusOS Native Wallet - Quantum-Resistant NXT Token & WNSP Messaging"""
    pass

@main.command()
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
@click.option('--initial-balance', default=0.0, type=float, help='Initial NXT balance (testing)')
def create(password, initial_balance):
    """Create new NexusOS quantum wallet"""
    try:
        wallet = NexusNativeWallet()
        result = wallet.create_wallet(password, initial_balance)
        
        console.print("\n[green]✓[/green] NexusOS wallet created!\n")
        
        table = Table(title="Wallet Details", show_header=False)
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Address", result['address'])
        table.add_row("Balance", f"{result['balance_nxt']} NXT")
        table.add_row("Spectral Regions", str(len(result['spectral_regions'])))
        table.add_row("Created", result['created_at'])
        
        console.print(table)
        console.print("\n[yellow]⚠ Save your password! Cannot be recovered.[/yellow]\n")
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

@main.command()
@click.argument('address')
def balance(address):
    """Check NXT balance"""
    try:
        wallet = NexusNativeWallet()
        result = wallet.get_balance(address)
        
        panel = Panel(
            f"[green]{result['balance_nxt']} NXT[/green]\n"
            f"[dim]({result['balance_units']} units)[/dim]",
            title=f"Balance - {address[:12]}...{address[-8:]}",
            subtitle=f"Nonce: {result['nonce']}"
        )
        console.print(panel)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

@main.command()
@click.option('--from', 'from_address', required=True)
@click.option('--to', 'to_address', required=True)
@click.option('--amount', required=True, type=float, help='Amount in NXT')
@click.option('--password', prompt=True, hide_input=True)
@click.option('--fee', default=None, type=float, help='Custom fee (default: 0.01 NXT)')
def send(from_address, to_address, amount, password, fee):
    """Send NXT tokens"""
    try:
        wallet = NexusNativeWallet()
        
        console.print(f"\n[yellow]Sending {amount} NXT to {to_address}...[/yellow]\n")
        
        result = wallet.send_nxt(from_address, to_address, amount, password, fee)
        
        console.print("[green]✓[/green] Transaction sent!\n")
        
        table = Table(show_header=False)
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("TX ID", result['tx_id'])
        table.add_row("From", result['from'])
        table.add_row("To", result['to'])
        table.add_row("Amount", f"{result['amount_nxt']} NXT")
        table.add_row("Fee", f"{result['fee_nxt']} NXT")
        
        console.print(table)
        
        # Quantum security info
        console.print("\n[bold cyan]Quantum Security:[/bold cyan]")
        qs = result['quantum_proof']
        console.print(f"  Spectral Regions: {qs['spectral_regions']}")
        console.print(f"  Energy Cost: {qs['energy_cost']:.2e} J")
        console.print(f"  Hash: {qs['interference_hash']}")
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

@main.command()
@click.option('--from', 'from_address', required=True)
@click.option('--content', required=True, help='Message content')
@click.option('--password', prompt=True, hide_input=True)
@click.option('--to', default=None, help='Recipient address (broadcast if omitted)')
@click.option('--region', default='BLUE', help='Spectral region')
def message(from_address, content, password, to, region):
    """Send WNSP quantum message"""
    try:
        from wnsp_protocol_v2 import SpectralRegion
        
        wallet = NexusNativeWallet()
        spectral = SpectralRegion[region]
        
        result = wallet.send_message(
            from_address, content, password, to, spectral
        )
        
        console.print("\n[green]✓[/green] Message sent!\n")
        
        table = Table(show_header=False)
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Message ID", result['message_id'])
        table.add_row("From", result['from'])
        table.add_row("To", result['to'])
        table.add_row("Wavelength", f"{result['wavelength']:.2f} nm")
        table.add_row("Frequency", f"{result['frequency']:.2e} Hz")
        table.add_row("Cost", f"{result['cost_nxt']:.6f} NXT")
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

@main.command()
@click.argument('address')
@click.option('--limit', default=10, type=int)
def history(address, limit):
    """View transaction history"""
    try:
        wallet = NexusNativeWallet()
        transactions = wallet.get_transaction_history(address, limit)
        
        if not transactions:
            console.print("[yellow]No transactions found[/yellow]")
            return
        
        table = Table(title=f"Transaction History - {address[:12]}...{address[-8:]}")
        table.add_column("TX ID", style="cyan")
        table.add_column("From/To", style="white")
        table.add_column("Amount", style="green")
        table.add_column("Fee", style="yellow")
        table.add_column("Status", style="magenta")
        
        for tx in transactions:
            direction = "→" if tx['from'] == address else "←"
            
            table.add_row(
                tx['tx_id'][:12],
                direction,
                f"{tx['amount_nxt']} NXT",
                f"{tx['fee_nxt']} NXT",
                tx['status']
            )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

@main.command()
@click.argument('address')
@click.option('--limit', default=10, type=int)
def messages(address, limit):
    """View message history"""
    try:
        wallet = NexusNativeWallet()
        msgs = wallet.get_messages(address, limit)
        
        if not msgs:
            console.print("[yellow]No messages found[/yellow]")
            return
        
        table = Table(title=f"Messages - {address[:12]}...{address[-8:]}")
        table.add_column("ID", style="cyan")
        table.add_column("From/To", style="white")
        table.add_column("Content", style="green")
        table.add_column("Wavelength", style="yellow")
        table.add_column("Cost", style="magenta")
        
        for msg in msgs:
            direction = "→" if msg['from'] == address else "←"
            content_short = msg['content'][:30] + "..." if len(msg['content']) > 30 else msg['content']
            
            table.add_row(
                msg['message_id'][:12],
                direction,
                content_short,
                f"{msg['wavelength']:.1f}nm",
                f"{msg['cost_nxt']:.6f} NXT"
            )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

@main.command()
def list():
    """List all wallets"""
    try:
        wallet = NexusNativeWallet()
        wallets = wallet.list_wallets()
        
        if not wallets:
            console.print("[yellow]No wallets found. Create one with 'nexus-wallet create'[/yellow]")
            return
        
        table = Table(title="NexusOS Wallets")
        table.add_column("Address", style="cyan")
        table.add_column("Balance", style="green")
        table.add_column("Created", style="white")
        table.add_column("Last Used", style="yellow")
        
        for w in wallets:
            table.add_row(
                f"{w['address'][:12]}...{w['address'][-8:]}",
                f"{w['balance_nxt']} NXT",
                w['created_at'][:10],
                w['last_used'][:10] if w['last_used'] else "Never"
            )
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[red]✗ Error:[/red] {str(e)}")

if __name__ == '__main__':
    main()
