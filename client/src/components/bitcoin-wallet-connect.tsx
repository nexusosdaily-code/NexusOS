/**
 * BitcoinWalletConnect — detects UniSat / Xverse / OKX and shows connect UI.
 * Drop this anywhere you need a BTC wallet for PSBT signing or verification.
 */
import { useUnisat } from "@/hooks/use-unisat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bitcoin, Wallet, Zap, ChevronDown, ExternalLink,
  CheckCircle2, AlertCircle, Unplug,
} from "lucide-react";
import { useState } from "react";

const WALLET_INSTALL: Record<string, { name: string; url: string }> = {
  unisat: { name: "UniSat Wallet", url: "https://unisat.io" },
  xverse: { name: "Xverse",        url: "https://www.xverse.app" },
  okx:    { name: "OKX Wallet",    url: "https://www.okx.com/web3" },
};

function fmtAddr(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}
function fmtSats(n: number) {
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(4) + " BTC";
  if (n >= 1_000)       return (n / 1_000).toFixed(3) + "K sats";
  return n.toLocaleString() + " sats";
}

interface Props {
  onConnected?: (address: string) => void;
  compact?: boolean;
  className?: string;
}

export function BitcoinWalletConnect({ onConnected, compact = false, className = "" }: Props) {
  const { available, providerName, connected, address, balance, connect, disconnect, error } = useUnisat();
  const [showMenu, setShowMenu] = useState(false);

  const handleConnect = async () => {
    await connect();
    if (address && onConnected) onConnected(address);
  };

  // Not installed
  if (!available) {
    if (compact) return (
      <a href="https://unisat.io" target="_blank" rel="noreferrer"
        className={`inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-orange-400 transition-colors ${className}`}>
        <Bitcoin className="w-3.5 h-3.5" />Install UniSat
      </a>
    );
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/10 border border-amber-700/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          No Bitcoin wallet detected. Install one to enable on-chain settlement.
        </div>
        <div className="flex gap-2">
          {Object.entries(WALLET_INSTALL).map(([, { name, url }]) => (
            <a key={url} href={url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-400 transition-colors border border-slate-700/50 rounded px-2 py-1">
              <ExternalLink className="w-3 h-3" />{name}
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Connected
  if (connected && address) {
    if (compact) return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowMenu(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-orange-900/20 border border-orange-500/30 rounded-lg px-2.5 py-1.5 text-orange-300 hover:border-orange-400/50 transition-colors"
        >
          <Bitcoin className="w-3.5 h-3.5" />
          {fmtAddr(address)}
          {balance && <span className="text-slate-500">·</span>}
          {balance && <span className="text-slate-400">{fmtSats(balance.confirmed)}</span>}
          <ChevronDown className="w-3 h-3 text-slate-600" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[180px]">
            <div className="text-[10px] text-slate-600 px-2 pb-1 font-mono">{address}</div>
            {balance && (
              <div className="text-[10px] text-slate-500 px-2 pb-1">
                {fmtSats(balance.confirmed)} confirmed<br />
                {fmtSats(balance.unconfirmed)} unconfirmed
              </div>
            )}
            <button
              onClick={() => { disconnect(); setShowMenu(false); }}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-red-400 hover:bg-red-900/10 rounded transition-colors"
            >
              <Unplug className="w-3 h-3" />Disconnect
            </button>
          </div>
        )}
      </div>
    );

    return (
      <div className={`bg-orange-900/10 border border-orange-500/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bitcoin className="w-4 h-4 text-orange-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-mono">{fmtAddr(address)}</span>
                <Badge className="bg-green-500/15 text-green-300 border-green-500/20 text-[10px]">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />{providerName}
                </Badge>
              </div>
              {balance && (
                <div className="text-xs text-slate-400 mt-0.5">
                  <span className="text-orange-300 font-mono">{fmtSats(balance.confirmed)}</span>
                  {balance.unconfirmed > 0 && (
                    <span className="text-slate-600 ml-2">(+{fmtSats(balance.unconfirmed)} unconfirmed)</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={disconnect}
            className="text-slate-600 hover:text-red-400 transition-colors text-xs flex items-center gap-1">
            <Unplug className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Available but not connected
  return (
    <div className={className}>
      <Button
        onClick={handleConnect}
        className="bg-orange-600 hover:bg-orange-700 gap-2"
        data-testid="button-connect-bitcoin"
      >
        <Bitcoin className="w-4 h-4" />Connect {providerName}
      </Button>
      {error && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </div>
      )}
    </div>
  );
}
