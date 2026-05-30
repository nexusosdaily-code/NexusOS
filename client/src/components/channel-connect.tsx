import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap, Atom, ArrowUpFromLine, Radio } from "lucide-react";

interface ChannelConnectProps {
  requiredNxt?: number;
  label?: string;
}

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(3) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(3) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(3) + "K";
  return n.toFixed(2);
}

function fmtSats(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(3) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export function ChannelConnect({ requiredNxt, label }: ChannelConnectProps) {
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"], refetchInterval: 15_000 });
  const { data: lnData }     = useQuery<any>({ queryKey: ["/api/lightning/balance"], refetchInterval: 15_000 });

  const nxt   = walletData?.wallet ? parseFloat(walletData.wallet.balance) / 1e8 : null;
  const sats  = lnData?.satsBalance ?? null;
  const enough = requiredNxt == null || nxt == null || nxt >= requiredNxt;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border text-xs font-mono mb-5 flex-wrap ${
        enough
          ? "bg-slate-900/60 border-cyan-500/20"
          : "bg-red-900/20 border-red-500/30"
      }`}
      data-testid="channel-connect-bar"
    >
      <div className="flex items-center gap-1.5 text-cyan-400/70">
        <Radio className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-widest text-gray-500">Channel</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Atom className="w-3 h-3 text-amber-400/70" />
        <span className={enough ? "text-amber-300" : "text-red-400"}>
          {nxt == null ? "—" : fmt(nxt)}
        </span>
        <span className="text-gray-600">NXT</span>
      </div>

      {requiredNxt != null && (
        <div className="text-gray-600">
          need <span className={enough ? "text-gray-400" : "text-red-400"}>{requiredNxt.toFixed(4)}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <Zap className="w-3 h-3 text-yellow-400/70" />
        <span className="text-yellow-300">{sats == null ? "—" : fmtSats(sats)}</span>
        <span className="text-gray-600">sats</span>
      </div>

      <div className="flex-1" />

      {!enough && requiredNxt != null && (
        <span className="text-red-400 text-[10px]">Insufficient NXT — top up via Lightning</span>
      )}

      <Link href="/lightning-wallet">
        <button
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 transition-colors text-[11px]"
          data-testid="button-channel-topup"
        >
          <ArrowUpFromLine className="w-3 h-3" />
          {label ?? "Top up ⚡"}
        </button>
      </Link>
    </div>
  );
}
