import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUnisat } from "@/hooks/use-unisat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Zap, ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft,
  Clock, CheckCircle2, XCircle, Copy, RefreshCw, AlertTriangle,
  Bitcoin, Radio, Waves, Activity, ArrowDownLeft, ArrowUpRight,
  Atom, Send, Users, Lock, Unlock, TrendingUp, Heart, QrCode, BookMarked,
  ExternalLink, Smartphone, ArrowRight, CircleDot,
} from "lucide-react";

const TABS = ["receive", "transmit", "swap", "send", "stake", "unisat", "log"] as const;
type Tab = typeof TABS[number];

function satsDisplay(sats: number) {
  if (sats >= 1_000_000_000) return `${(sats / 1_000_000_000).toFixed(2)}B`;
  if (sats >= 1_000_000)     return `${(sats / 1_000_000).toFixed(2)}M`;
  if (sats >= 1_000)         return `${(sats / 1_000).toFixed(1)}K`;
  return String(sats);
}

function formatNxt(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v >= 1e9) return (v / 1e9).toFixed(3) + "B";
  if (v >= 1e6) return (v / 1e6).toFixed(3) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(3) + "K";
  return v.toFixed(8);
}

function fmtTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed" || status === "confirmed" || status === "paid")
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Transmitted</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
  if (status === "queued" || status === "processing")
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]"><Clock className="w-3 h-3 mr-1" />Auto-paying</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
}

function QueueProgress({ txId }: { txId: number }) {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: [`/api/lightning/queue/${txId}`],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/lightning/queue/${txId}`);
      return r.json();
    },
    refetchInterval: (d: any) => (d?.paid < d?.total ? 5_000 : false),
  } as any);

  const retry = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/lightning/queue/retry/${txId}`);
      return r.json();
    },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] }); },
  });

  if (!data) return null;
  const { paid, total, paidSats, totalSats, items = [] } = data;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const allDone = paid >= total && total > 0;
  const hasFailed = items.some((i: any) => i.status === "failed" && i.attempts >= 5);

  return (
    <div className="bg-blue-900/15 border border-blue-500/25 rounded p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] text-blue-300 font-semibold">
          {allDone
            ? `✓ All ${total} invoice${total > 1 ? "s" : ""} paid`
            : `Auto-paying: ${paid}/${total} invoices${total > 1 ? ` (${satsDisplay(paidSats)}/${satsDisplay(totalSats)} sats)` : ""}`}
        </div>
        {!allDone && (
          <Button size="sm" variant="outline" className="h-5 px-2 text-[9px] border-blue-500/40 text-blue-300"
            onClick={() => retry.mutate()} disabled={retry.isPending}>
            {retry.isPending ? "…" : "Retry now"}
          </Button>
        )}
      </div>
      {/* Progress bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hasFailed && (
        <div className="text-[9px] text-red-400">
          Some invoices failed (max retries reached). Connect a Lightning provider (Alby/LNbits) and click Retry.
        </div>
      )}
    </div>
  );
}

function nmToRgb(nm: number): string {
  if (nm < 450) return "#7c3aed";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#059669";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}

function ChannelPulse({ nm }: { nm: number }) {
  const color = nmToRgb(nm);
  return (
    <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
  );
}

function UniSatReceiveTab({
  mempoolLive,
  addressBook,
  onRefreshAddressBook,
  onFillWithdrawAddr,
}: {
  mempoolLive: any;
  addressBook: any[];
  onRefreshAddressBook: () => void;
  onFillWithdrawAddr: (addr: string) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { available, connected, connect, address, balance, providerName, error: walletError, disconnect } = useUnisat();
  const [manualAddr, setManualAddr]   = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel]       = useState("");
  const [newAddr, setNewAddr]         = useState("");

  // ── Multi-wallet BTC watcher ────────────────────────────────────────────
  const { data: watchedData, refetch: refetchWatched } = useQuery<any>({
    queryKey: ["/api/admin/watched-wallets"],
    queryFn: () => fetch("/api/admin/watched-wallets", { credentials: "include" }).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const [watchLabel, setWatchLabel] = useState("");

  const addWatchMut = useMutation({
    mutationFn: ({ btcAddress, label }: { btcAddress: string; label: string }) =>
      fetch("/api/admin/watched-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ btcAddress, label }),
      }).then(r => r.json()),
    onSuccess: (d: any) => {
      if (d.ok) {
        toast({ title: "💧 Watching wallet", description: "Every BTC received here auto-credits to your NexusOS balance." });
        setWatchLabel("");
        refetchWatched();
      } else {
        toast({ title: "Error", description: d.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const removeWatchMut = useMutation({
    mutationFn: (addr: string) =>
      fetch(`/api/admin/watched-wallets/${encodeURIComponent(addr)}`, {
        method: "DELETE", credentials: "include",
      }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Wallet removed" }); refetchWatched(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const displayAddr   = connected && address ? address : manualAddr.trim() || null;
  const watchedList: any[] = watchedData?.wallets ?? [];
  const totalFed      = watchedData?.totalFed ?? 0;
  const isWatched     = !!(displayAddr && watchedList.find((w: any) => w.address === displayAddr));
  const qrUrl = displayAddr
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`bitcoin:${displayAddr}`)}&bgcolor=0f172a&color=ffffff&qzone=2`
    : null;
  const shortAddr = (a: string) => `${a.slice(0, 10)}…${a.slice(-8)}`;
  const adminEntry = addressBook.find((e: any) => e.isAdmin);

  const saveAdminWallet = useMutation({
    mutationFn: (btcAddress: string) =>
      fetch("/api/user/admin-btc-wallet", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ btcAddress, label: "Admin Wallet" }),
      }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d; }),
    onSuccess: (d: any) => {
      if (d.type === "lightning") {
        toast({ title: "⚡ Lightning Address saved", description: `${d.lightningAddress} set as your withdrawal address.` });
        qc.invalidateQueries({ queryKey: ["/api/user/lightning-address"] });
      } else {
        toast({ title: "✓ Admin wallet linked", description: "This address is now your admin/distribution wallet." });
        qc.invalidateQueries({ queryKey: ["/api/lightning/address-book"] });
        onRefreshAddressBook();
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addAddress = useMutation({
    mutationFn: ({ btcAddress, label }: { btcAddress: string; label: string }) =>
      fetch("/api/lightning/address-book", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ btcAddress, label }),
      }).then(r => r.json()),
    onSuccess: (d: any) => {
      if (d.error) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Address saved ✓" });
      setNewAddr(""); setNewLabel(""); setShowAddForm(false);
      qc.invalidateQueries({ queryKey: ["/api/lightning/address-book"] });
      onRefreshAddressBook();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeAddress = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/lightning/address-book/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Address removed" });
      qc.invalidateQueries({ queryKey: ["/api/lightning/address-book"] });
      onRefreshAddressBook();
    },
  });

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-5">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Bitcoin className="w-4 h-4 text-orange-400" />
          Receive via UniSat / BTC address
        </h2>

        <div className="space-y-3">
          {!connected ? (
            <div className="space-y-3">
              {available ? (
                <Button onClick={connect} className="w-full bg-orange-600 hover:bg-orange-700" data-testid="button-unisat-connect">
                  <Bitcoin className="w-4 h-4 mr-2" />
                  Connect {providerName} wallet
                </Button>
              ) : (
                <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    No Bitcoin wallet extension detected. Install{" "}
                    <a href="https://unisat.io" target="_blank" rel="noopener noreferrer" className="underline">UniSat</a>,
                    Xverse, or OKX — or paste your BTC address below.
                  </span>
                </div>
              )}
              {walletError && <div className="text-red-400 text-xs">{walletError}</div>}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="flex-1 h-px bg-slate-700" />
                <span>or enter address manually</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <Input
                value={manualAddr}
                onChange={e => setManualAddr(e.target.value)}
                placeholder="bc1p… or 1… or 3…"
                className="bg-slate-800/50 border-slate-700 font-mono text-sm"
                data-testid="input-unisat-manual-addr"
              />
            </div>
          ) : (
            <div className="bg-orange-900/20 border border-orange-500/20 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <div>
                  <div className="text-[10px] text-orange-400/70 font-semibold uppercase tracking-wider">{providerName} connected</div>
                  <div className="text-orange-200 font-mono text-xs mt-0.5">{shortAddr(address!)}</div>
                </div>
              </div>
              <button onClick={disconnect} className="text-xs text-gray-500 hover:text-gray-300 underline">Disconnect</button>
            </div>
          )}

          {connected && balance && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { label: "Confirmed",   value: balance.confirmed.toLocaleString() },
                { label: "Unconfirmed", value: balance.unconfirmed.toLocaleString() },
                { label: "Total",       value: balance.total.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800/50 rounded-lg p-2">
                  <div className="text-gray-500 text-[9px] uppercase tracking-wider">{label}</div>
                  <div className="font-mono text-orange-300 font-bold mt-0.5">{value}</div>
                  <div className="text-gray-600 text-[9px]">sats</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin wallet banner */}
        {displayAddr && (
          <div className="space-y-2">
            {adminEntry?.btcAddress === displayAddr ? (
              <div className="bg-orange-900/20 border border-orange-500/40 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                <span className="text-orange-400 font-semibold">★ Admin wallet</span>
                <span className="text-gray-500 font-mono">{shortAddr(displayAddr)}</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-orange-500/40 text-orange-300 hover:bg-orange-900/20 text-xs"
                onClick={() => saveAdminWallet.mutate(displayAddr)}
                disabled={saveAdminWallet.isPending}
                data-testid="button-save-admin-wallet"
              >
                {saveAdminWallet.isPending ? "Saving…" : "★ Set as admin / owner wallet"}
              </Button>
            )}
          </div>
        )}

        {/* ── Multi-wallet BTC → NexusOS sats watcher ─────────────── */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400">Auto-credit BTC → sats</span>
            {watchedList.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                {watchedList.length} wallet{watchedList.length !== 1 ? "s" : ""} LIVE
              </span>
            )}
          </div>

          <p className="text-[10px] text-gray-500 leading-relaxed">
            Add any BTC wallet — UniSat, Ledger, Exodus, any address. Every confirmed inbound TX auto-credits sats to your NexusOS balance.
          </p>

          {/* Current address quick-add */}
          {displayAddr && !isWatched && (
            <div className="space-y-1.5">
              <Input
                value={watchLabel}
                onChange={e => setWatchLabel(e.target.value)}
                placeholder={`Label (e.g. "UniSat main") — optional`}
                className="bg-slate-900/60 border-slate-700 text-xs font-mono h-8"
                data-testid="input-watch-label"
              />
              <Button
                size="sm"
                className="w-full bg-cyan-700 hover:bg-cyan-600 text-white text-xs"
                onClick={() => addWatchMut.mutate({ btcAddress: displayAddr, label: watchLabel.trim() })}
                disabled={addWatchMut.isPending}
                data-testid="button-watch-current-addr"
              >
                {addWatchMut.isPending ? "Adding…" : `💧 Watch this address`}
              </Button>
            </div>
          )}

          {displayAddr && isWatched && (
            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-1.5 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-cyan-300 flex-1">This address is being watched</span>
              <button
                onClick={() => removeWatchMut.mutate(displayAddr)}
                className="text-gray-500 hover:text-red-400 text-[9px]"
                data-testid="button-remove-current-watch"
              >✕</button>
            </div>
          )}

          {/* Manual add — different address */}
          {!displayAddr && (
            <div className="text-[10px] text-gray-600 text-center">Connect or paste a BTC address above to watch it</div>
          )}

          {/* All watched wallets */}
          {watchedList.length > 0 && (
            <div className="space-y-1.5 mt-1">
              <div className="text-[9px] text-gray-600 uppercase tracking-wider font-mono">Watched wallets ({watchedList.length})</div>
              {watchedList.map((w: any) => (
                <div key={w.address} className="flex items-start gap-2 bg-slate-900/60 rounded-lg p-2 text-[10px] font-mono"
                  data-testid={`row-watched-wallet-${w.address.slice(0, 8)}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                      <span className="font-semibold text-white truncate">{w.label || "Unlabelled"}</span>
                    </div>
                    <div className="text-gray-600 truncate mt-0.5">{w.address.slice(0, 14)}…{w.address.slice(-8)}</div>
                    {w.snapshot && (
                      <div className="flex gap-3 mt-1 text-[9px]">
                        <span className="text-orange-300">{w.snapshot.confirmed?.toLocaleString()} sats on-chain</span>
                        {w.satsFed > 0 && <span className="text-cyan-400">+{w.satsFed.toLocaleString()} credited</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <a href={`https://mempool.space/address/${w.address}`} target="_blank" rel="noopener noreferrer"
                      className="text-gray-600 hover:text-orange-400">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={() => removeWatchMut.mutate(w.address)}
                      className="text-gray-600 hover:text-red-400 text-[9px]"
                      data-testid={`button-remove-watch-${w.address.slice(0, 8)}`}>✕</button>
                  </div>
                </div>
              ))}
              {totalFed > 0 && (
                <div className="text-[9px] text-gray-500 font-mono text-right">
                  Session total: <span className="text-cyan-300 font-semibold">+{totalFed.toLocaleString()} sats</span> auto-credited
                </div>
              )}
            </div>
          )}
        </div>

        {displayAddr ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-slate-950 border border-orange-500/20 rounded-xl p-3">
                <img src={qrUrl!} alt="BTC receive QR" className="w-[180px] h-[180px] rounded-lg" data-testid="img-unisat-qr" />
              </div>
              <div className="text-[10px] text-orange-400/60 uppercase tracking-wider">Scan with UniSat or any Bitcoin wallet</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1 font-mono text-xs text-orange-200 break-all">{displayAddr}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(displayAddr); toast({ title: "Address copied" }); }}
                className="shrink-0 text-gray-400 hover:text-white transition-colors"
                data-testid="button-unisat-copy-addr"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-gray-500 space-y-1.5">
              <div>• Sats sent here land directly in your wallet — no NexusOS account needed</div>
              <div>• Share the QR or copy the address so anyone can pay you</div>
              {mempoolLive?.ok && (
                <div className={`flex items-center gap-1 ${mempoolLive.congestionLevel === "low" ? "text-green-400" : mempoolLive.congestionLevel === "medium" ? "text-amber-400" : "text-orange-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${mempoolLive.congestionLevel === "low" ? "bg-green-400" : mempoolLive.congestionLevel === "medium" ? "bg-amber-400" : "bg-orange-400"}`} />
                  Network: {mempoolLive.medium} sat/vB · ~{mempoolLive.confirmEta?.medium ?? 30}min confirmation
                </div>
              )}
            </div>

            <a
              href={`https://mempool.space/address/${displayAddr}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-gray-500 hover:text-orange-300 border border-slate-700/50 rounded-lg transition-colors"
              data-testid="link-unisat-mempool"
            >
              <Activity className="w-3.5 h-3.5" />
              View on mempool.space
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-gray-600">
            <QrCode className="w-12 h-12 opacity-20" />
            <div className="text-sm text-center">Connect your wallet or paste an address<br />to generate a receive QR code</div>
          </div>
        )}
      </Card>

      {/* ── Address Book ─────────────────────────────────────────── */}
      <Card className="bg-slate-900/60 border-slate-700/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-orange-400" />
            Distribution address book
          </h2>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded px-2 py-1"
            data-testid="button-toggle-add-address"
          >
            {showAddForm ? "Cancel" : "+ Add address"}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3 space-y-2">
            <Input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Label (e.g. Cold storage)"
              className="bg-slate-900/50 border-slate-700 text-sm"
              data-testid="input-new-addr-label"
            />
            <Input
              value={newAddr}
              onChange={e => setNewAddr(e.target.value)}
              placeholder="bc1p… Bitcoin address"
              className="bg-slate-900/50 border-slate-700 font-mono text-xs"
              data-testid="input-new-addr-value"
            />
            <Button
              size="sm"
              className="w-full bg-orange-600 hover:bg-orange-700 text-xs"
              disabled={!newAddr.trim() || addAddress.isPending}
              onClick={() => addAddress.mutate({ btcAddress: newAddr.trim(), label: newLabel.trim() || "Wallet" })}
              data-testid="button-save-new-address"
            >
              {addAddress.isPending ? "Saving…" : "Save address"}
            </Button>
          </div>
        )}

        {addressBook.length === 0 ? (
          <div className="text-xs text-gray-600 text-center py-4">No saved addresses yet. Add one above.</div>
        ) : (
          <div className="space-y-2">
            {addressBook.map((entry: any) => (
              <div
                key={entry.id}
                className={`flex items-center gap-2 rounded-lg p-2.5 border ${entry.isAdmin ? "bg-orange-900/10 border-orange-500/30" : "bg-slate-800/30 border-slate-700/40"}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-300 truncate">{entry.label}</span>
                    {entry.isAdmin && <span className="text-[9px] text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>}
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 truncate mt-0.5">{entry.btcAddress}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { navigator.clipboard.writeText(entry.btcAddress); toast({ title: "Address copied" }); }}
                    className="text-gray-500 hover:text-gray-300 p-1"
                    title="Copy"
                    data-testid={`button-copy-addr-${entry.id}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFillWithdrawAddr(entry.btcAddress)}
                    className="text-orange-500 hover:text-orange-300 text-[10px] border border-orange-500/30 rounded px-1.5 py-0.5"
                    title="Use for withdrawal"
                    data-testid={`button-use-addr-${entry.id}`}
                  >
                    Send →
                  </button>
                  {!entry.isAdmin && (
                    <button
                      onClick={() => saveAdminWallet.mutate(entry.btcAddress)}
                      className="text-gray-500 hover:text-orange-400 text-[10px] border border-slate-600/40 rounded px-1.5 py-0.5"
                      title="Set as admin wallet"
                      data-testid={`button-set-admin-${entry.id}`}
                    >
                      ★
                    </button>
                  )}
                  <button
                    onClick={() => removeAddress.mutate(entry.id)}
                    className="text-gray-600 hover:text-red-400 p-1"
                    title="Remove"
                    data-testid={`button-remove-addr-${entry.id}`}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ChannelDashboard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("receive");
  const { connected: btcConnected, address: btcWalletAddr } = useUnisat();

  const [depositSats, setDepositSats] = useState("10000");
  const [depositMemo, setDepositMemo] = useState("");
  const [invoice, setInvoice]         = useState<{ paymentRequest: string; paymentHash: string; txId: number } | null>(null);
  const [depositPaid, setDepositPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bolt11, setBolt11] = useState("");

  const [swapDir, setSwapDir]   = useState<"to_nxt" | "to_sats" | "sats_to_btc" | "btc_to_sats" | "sats_to_ln">("to_nxt");
  const [swapSats, setSwapSats] = useState("1000");
  const [swapNxt, setSwapNxt]   = useState("1");
  const [withdrawBtcAddr, setWithdrawBtcAddr] = useState("");
  const [withdrawSats, setWithdrawSats]       = useState("10000");
  const [withdrawDone, setWithdrawDone]       = useState<any>(null);
  const [feeTier, setFeeTier]                 = useState<"slow"|"medium"|"fast">("medium");

  // Lightning Address withdrawal state
  const [lnAddr, setLnAddr]         = useState("");
  const [lnAddrSats, setLnAddrSats] = useState("10000");
  const [lnAddrSave, setLnAddrSave] = useState(true);
  const [lnAddrResult, setLnAddrResult] = useState<any>(null);

  // Send P2P
  const [sendRecipient, setSendRecipient] = useState("");
  const [sendSats, setSendSats]           = useState("1000");
  const [sendMemo, setSendMemo]           = useState("");
  const [sendOk, setSendOk]              = useState(false);

  // Stake
  const [stakeAmount, setStakeAmount] = useState("1000000");
  const [stakeDays, setStakeDays]     = useState<7|14|30|90|180|365>(30);

  const { data: status } = useQuery({
    queryKey: ["/api/lightning/status"],
    refetchInterval: 30_000,
  });

  const { data: lnBalance, refetch: refetchBal } = useQuery({
    queryKey: ["/api/lightning/balance"],
    refetchInterval: 15_000,
  });

  const { data: nxtData } = useQuery({
    queryKey: ["/api/wallet"],
    refetchInterval: 15_000,
  });

  const { data: spectral } = useQuery({
    queryKey: ["/api/spectral/my-canonical"],
    refetchInterval: 60_000,
  });

  const { data: mempoolLive } = useQuery<any>({
    queryKey: ["/api/mempool/live"],
    queryFn: () => fetch("/api/mempool/live").then(r => r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: arbitrage } = useQuery<any>({
    queryKey: ["/api/mempool/arbitrage"],
    queryFn: () => fetch("/api/mempool/arbitrage").then(r => r.json()),
    enabled: tab === "stake",
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: lnHistory } = useQuery({
    queryKey: ["/api/lightning/transactions"],
    enabled: tab === "log",
    refetchInterval: 10_000,
  });

  const { data: stakesData, refetch: refetchStakes } = useQuery({
    queryKey: ["/api/lightning/stakes"],
    enabled: tab === "stake",
    refetchInterval: 30_000,
  });

  const { data: addressBookData, refetch: refetchAddressBook } = useQuery<{ ok: boolean; entries: any[] }>({
    queryKey: ["/api/lightning/address-book"],
    queryFn: () => fetch("/api/lightning/address-book", { credentials: "include" }).then(r => r.json()),
    staleTime: 30_000,
  });
  const addressBook = addressBookData?.entries ?? [];

  const { data: depositInfo } = useQuery<{
    depositAddress: string; satsPerNxt: number; minDepositSats: number;
  }>({
    queryKey: ["/api/btc/deposit/info"],
    staleTime: 5 * 60_000,
  });

  const { data: mktPrice } = useQuery<{
    btcUsd: number; satUsd: number; nxtUsd: number; nxtMcap: number;
    nxtSupply: number; stale?: boolean;
  }>({
    queryKey: ["/api/market/price"],
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (!invoice || depositPaid) return;
    const check = async () => {
      try {
        const r = await fetch(`/api/lightning/invoice/check?txId=${invoice.txId}`, { credentials: "include" });
        const d = await r.json();
        if (d.paid) {
          setDepositPaid(true);
          setInvoice(null);
          refetchBal();
          qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
          toast({ title: "⚡ Signal received!", description: `${d.amountSats} sats credited to your channel.` });
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    };
    pollRef.current = setInterval(check, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [invoice, depositPaid]);

  const createInvoice = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/invoice", { amountSats: parseInt(depositSats), memo: depositMemo });
      return res.json();
    },
    onSuccess: (data: any) => { setInvoice(data); setDepositPaid(false); toast({ title: "Channel open", description: "Invoice ready — awaiting incoming transmission." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payInvoice = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/pay", { bolt11 });
      return res.json();
    },
    onSuccess: (data: any) => {
      setBolt11("");
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "⚡ Transmission sent", description: `${data.amountSats} sats transmitted.` });
    },
    onError: (e: any) => toast({ title: "Transmission failed", description: e.message, variant: "destructive" }),
  });

  const swapToNxt = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/swap/to-nxt", { amountSats: parseInt(swapSats) });
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "Channel swap complete", description: `${data.amountSats} sats → ${data.nxtAmount} NXT` });
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const swapToSats = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/swap/to-sats", { nxtAmount: parseFloat(swapNxt) });
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "Channel swap complete", description: `${data.nxtAmount} NXT → ${data.amountSats} sats` });
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const sendP2P = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/send", {
        recipientUsername: sendRecipient.trim(),
        amountSats: parseInt(sendSats),
        memo: sendMemo.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSendOk(true);
      setSendRecipient(""); setSendSats("1000"); setSendMemo("");
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      toast({ title: "⚡ Sent!", description: `${data.amountSats} sats → ${data.to}` });
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const stakeMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/stake", { amountSats: parseInt(stakeAmount), lockDays: stakeDays });
      return res.json();
    },
    onSuccess: () => {
      refetchBal();
      refetchStakes();
      toast({ title: "📈 Staked!", description: `${stakeAmount} sats locked for ${stakeDays} days.` });
    },
    onError: (e: any) => toast({ title: "Stake failed", description: e.message, variant: "destructive" }),
  });

  const [earlyWithdrawId, setEarlyWithdrawId] = useState<number | null>(null);

  const unstakeMut = useMutation({
    mutationFn: async (stakeId: number) => {
      const res = await apiRequest("POST", `/api/lightning/unstake/${stakeId}`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchBal();
      refetchStakes();
      setEarlyWithdrawId(null);
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      if (data.isEarly) {
        toast({
          title: "⚠️ Early withdrawal complete",
          description: `${data.amountSats} sats returned · ${parseFloat(data.nxtYield).toFixed(4)} NXT credited · ${parseFloat(data.penaltyNxt).toFixed(4)} NXT penalty → treasury`,
          variant: "destructive",
        });
      } else {
        toast({ title: "✅ Withdrawn!", description: `${data.amountSats} sats returned · ${parseFloat(data.nxtYield).toFixed(4)} NXT yield credited` });
      }
    },
    onError: (e: any) => toast({ title: "Withdraw failed", description: e.message, variant: "destructive" }),
  });

  const [extendingId, setExtendingId] = useState<number | null>(null);
  const [extendDays, setExtendDays]   = useState<7|14|30|90|180|365>(90);

  const extendMut = useMutation({
    mutationFn: async ({ stakeId, lockDays }: { stakeId: number; lockDays: number }) => {
      const res = await apiRequest("POST", `/api/lightning/extend/${stakeId}`, { lockDays });
      return res.json();
    },
    onSuccess: (data: any) => {
      refetchStakes();
      setExtendingId(null);
      const label = data.lockDays >= 365 ? "1 year" : data.lockDays >= 180 ? "6 months" : data.lockDays >= 90 ? "3 months" : `${data.lockDays} days`;
      toast({ title: "🔒 Extended!", description: `Stake re-locked for ${label} · +${parseFloat(data.extraYield).toFixed(4)} NXT added` });
    },
    onError: (e: any) => toast({ title: "Extend failed", description: e.message, variant: "destructive" }),
  });

  const withdrawToBtc = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/withdraw-to-btc", {
        amountSats: parseInt(withdrawSats),
        btcAddress: withdrawBtcAddr.trim(),
        feeTier,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Withdrawal failed");
      return d;
    },
    onSuccess: (data: any) => {
      refetchBal();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      if (data.status === "paid") {
        setLnAddrResult(data);
        toast({ title: "⚡ Sent!", description: `${data.amountSats?.toLocaleString()} sats → ${data.lightningAddress}` });
      } else if (data.status === "queued") {
        setLnAddrResult(data);
        toast({ title: "⚡ Queued!", description: `${data.invoiceCount} invoice${data.invoiceCount > 1 ? "s" : ""} queued — NexusOS will pay them automatically.` });
      } else if (data.status === "pending_manual") {
        setLnAddrResult(data);
        toast({ title: "📋 Invoice ready", description: "Pay the invoice below from any Lightning wallet to complete withdrawal." });
      } else {
        setWithdrawDone(data);
        toast({ title: "⚡→🔴 Withdrawal queued", description: `${data.netSats?.toLocaleString()} sats → BTC at ${data.feeRateSatVbyte} sat/vB · ~${data.confirmEtaMins}min` });
      }
    },
    onError: (e: any) => toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" }),
  });

  // ── Auto-sweep status ──────────────────────────────────────────────────────
  const { data: sweepStatus, refetch: refetchSweep } = useQuery({
    queryKey: ["/api/lightning/sweep-status"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/lightning/sweep-status");
      return r.json();
    },
    refetchInterval: 30000,
  });

  // ── Saved Lightning Address ────────────────────────────────────────────────
  const { data: savedLnAddrData, refetch: refetchLnAddr } = useQuery({
    queryKey: ["/api/user/lightning-address"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/user/lightning-address");
      return r.json();
    },
    onSuccess: (d: any) => { if (d.lightningAddress && !lnAddr) setLnAddr(d.lightningAddress); },
  } as any);

  const savedLnAddress: string | null = savedLnAddrData?.lightningAddress ?? null;

  const sendToLnAddress = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lightning/send-to-ln-address", {
        lightningAddress: lnAddr.trim(),
        amountSats: parseInt(lnAddrSats),
        save: lnAddrSave,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      return data;
    },
    onSuccess: (data: any) => {
      setLnAddrResult(data);
      refetchBal();
      refetchLnAddr();
      qc.invalidateQueries({ queryKey: ["/api/lightning/transactions"] });
      if (data.status === "paid") {
        toast({ title: "⚡ Sent!", description: `${parseInt(lnAddrSats).toLocaleString()} sats → ${lnAddr}` });
      } else if (data.status === "queued") {
        toast({ title: "⚡ Queued!", description: `${data.invoiceCount} invoice${data.invoiceCount > 1 ? "s" : ""} queued — processing automatically.` });
      } else {
        toast({ title: "⚡ Invoice ready", description: "Pay the invoice from your wallet to complete the withdrawal." });
      }
    },
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied to clipboard" }); };

  const configured       = status?.configured;
  const provider         = status?.provider ?? "—";
  const lightningAddress = status?.lightningAddress as string | undefined;
  const sats             = lnBalance?.satsBalance ?? 0;
  const nxtBalance = nxtData?.wallet ? parseFloat(nxtData.wallet.balance) : 0;
  const nxtAddress = nxtData?.wallet?.address ?? "";
  const nxtLocked  = nxtData?.wallet ? parseFloat(nxtData.wallet.lockedBalance) : 0;

  const psi      = spectral?.spectral?.psi ?? "Ψ(—)";
  const wnspUri  = spectral?.spectral?.uri ?? "wnsp://—";
  const nm       = spectral?.spectral?.nm ?? 550;
  const band     = spectral?.spectral?.band ?? "—";
  const freqTHz  = spectral?.spectral?.freqTHz ?? 0;
  const chanColor = nmToRgb(nm);

  const qrUrl = invoice
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.paymentRequest.toUpperCase())}&size=220x220&margin=8&color=ffffff&bgcolor=000000`
    : null;

  const nxtTxs  = (nxtData?.recentTransactions ?? []) as any[];
  const lnTxs   = (lnHistory?.transactions ?? []) as any[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8" data-testid="page-channel-dashboard">
      <div className="max-w-2xl mx-auto">

        {/* ── Back nav ── */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-400 text-sm font-mono">Channel Dashboard</span>
          </div>
          <div className="flex-1" />
          {configured === false && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />No provider
            </Badge>
          )}
          {configured === true && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              <Zap className="w-3 h-3 mr-1" />{provider}
            </Badge>
          )}
        </div>

        {/* ── Identity hero card ── */}
        <Card
          className="p-6 mb-5 border relative overflow-hidden"
          style={{ borderColor: chanColor + "44", background: `linear-gradient(135deg, ${chanColor}08 0%, #0f172a 100%)` }}
        >
          {/* Animated ring */}
          <div className="absolute top-4 right-4 opacity-20">
            <div className="w-20 h-20 rounded-full border-2 animate-pulse" style={{ borderColor: chanColor }} />
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 shrink-0"
              style={{ borderColor: chanColor + "88", background: chanColor + "18" }}>
              <Waves className="w-6 h-6" style={{ color: chanColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <ChannelPulse nm={nm} />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{band} band · {nm.toFixed(1)} nm · {freqTHz.toFixed(2)} THz</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-1" data-testid="text-psi-address">{psi}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono truncate" style={{ color: chanColor + "cc" }}>{wnspUri}</span>
                <button onClick={() => copy(wnspUri)} className="text-gray-600 hover:text-gray-300 shrink-0">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              {nxtAddress && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono text-gray-600">{nxtAddress}</span>
                  <button onClick={() => copy(nxtAddress)} className="text-gray-700 hover:text-gray-400">
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Unified balance row ── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* NXT */}
          <Card className="bg-gradient-to-br from-amber-900/20 to-slate-900/60 border-amber-500/20 p-4">
            <div className="text-amber-400/60 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Atom className="w-3 h-3" /> NXT Channel Balance
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300" data-testid="text-nxt-balance">
              {formatNxt(nxtBalance)}
            </div>
            <div className="text-amber-400/40 text-[10px] font-mono mt-0.5">NXT</div>
            {nxtLocked > 0 && (
              <div className="text-[10px] font-mono text-gray-500 mt-1">🔒 {formatNxt(nxtLocked)} locked</div>
            )}
          </Card>

          {/* ⚡ sats */}
          <Card className="bg-gradient-to-br from-yellow-900/20 to-slate-900/60 border-yellow-500/20 p-4">
            <div className="text-yellow-400/60 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Lightning Balance
            </div>
            <div className="text-2xl font-bold font-mono text-yellow-300" data-testid="text-sats-balance">
              {satsDisplay(sats)}
            </div>
            <div className="text-yellow-400/40 text-[10px] font-mono mt-0.5">sats · ≈ {lnBalance?.nxtEquivalent ?? "0"} NXT</div>
            {lightningAddress && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono text-yellow-400/50 truncate">{lightningAddress}</span>
                <button onClick={() => copy(lightningAddress)} className="text-yellow-400/30 hover:text-yellow-400 shrink-0">
                  <Copy className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <div className="text-[10px] font-mono text-gray-600">↓ {satsDisplay(lnBalance?.totalDeposited ?? 0)}</div>
              <div className="text-[10px] font-mono text-gray-600">↑ {satsDisplay(lnBalance?.totalWithdrawn ?? 0)}</div>
              <button onClick={() => refetchBal()} className="ml-auto text-yellow-400/30 hover:text-yellow-400 transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </div>

        {/* ── Not configured warning ── */}
        {configured === false && (
          <Card className="bg-amber-900/20 border-amber-500/30 p-4 mb-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="w-full">
                <div className="text-amber-400 font-semibold mb-2">Connect a Lightning provider to activate your channel</div>

                {/* Option A — Coinos (recommended) */}
                <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 mb-2">
                  <div className="text-green-300 font-semibold text-sm mb-1">✅ Option A — Coinos (free, works now)</div>
                  <ol className="text-green-200/70 text-xs space-y-1 list-decimal list-inside mb-2">
                    <li>Go to <a href="https://coinos.io" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">coinos.io</a> → Register free</li>
                    <li>Top-right menu → <strong>Settings → API Token</strong> → copy it</li>
                    <li>Add to Replit Secrets:</li>
                  </ol>
                  <div className="font-mono text-xs bg-black/30 rounded p-2 text-green-300">COINOS_TOKEN = &lt;your token&gt;</div>
                </div>

                {/* Option B — LNbits */}
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3">
                  <div className="text-gray-400 font-semibold text-xs mb-1">Option B — Self-hosted LNbits</div>
                  <div className="font-mono text-xs bg-black/30 rounded p-2 text-gray-500 space-y-0.5">
                    <div>LNBITS_URL · LNBITS_ADMIN_KEY · LNBITS_INVOICE_KEY</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Tabs ── */}
        <div className="grid grid-cols-3 gap-1 mb-3 bg-slate-900/50 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              data-testid={`tab-${t}`}
              className={`flex items-center justify-center gap-1 py-2 rounded text-[10px] font-semibold transition-all ${
                tab === t
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "receive"  && <><ArrowDownToLine className="w-3 h-3" />Receive</>}
              {t === "transmit" && <><Send            className="w-3 h-3" />Transmit</>}
              {t === "swap"     && <><ArrowRightLeft  className="w-3 h-3" />Swap</>}
              {t === "send"     && <><Users           className="w-3 h-3" />Send P2P</>}
              {t === "stake"    && <><TrendingUp      className="w-3 h-3" />Stake</>}
              {t === "unisat"   && <><Bitcoin         className="w-3 h-3" />UniSat</>}
              {t === "log"      && <><Activity        className="w-3 h-3" />Log</>}
            </button>
          ))}
        </div>

        {/* ── RECEIVE ── */}
        {tab === "receive" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-green-400" />
              Receive via Lightning channel
            </h2>

            {depositPaid && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-green-400 font-semibold">⚡ Signal received!</div>
                <div className="text-green-300/60 text-sm">Your channel balance has been updated.</div>
                <Button className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => { setDepositPaid(false); setInvoice(null); }}>
                  Open another channel
                </Button>
              </div>
            )}

            {!depositPaid && !invoice && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Amount (sats)</Label>
                  <Input
                    type="number"
                    value={depositSats}
                    onChange={(e) => setDepositSats(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    placeholder="10000"
                    min="1"
                    data-testid="input-deposit-sats"
                  />
                  <div className="text-xs text-gray-500">≈ {(parseInt(depositSats || "0") / 1000).toFixed(3)} NXT equivalent</div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Memo (optional)</Label>
                  <Input
                    value={depositMemo}
                    onChange={(e) => setDepositMemo(e.target.value)}
                    className="bg-slate-800/50 border-slate-700"
                    placeholder="Channel memo…"
                    data-testid="input-deposit-memo"
                  />
                </div>
                <Button
                  onClick={() => createInvoice.mutate()}
                  disabled={createInvoice.isPending || !configured}
                  className="w-full bg-green-600 hover:bg-green-700"
                  data-testid="button-create-invoice"
                >
                  {createInvoice.isPending ? "Opening channel…" : "Generate Lightning Invoice"}
                </Button>
              </div>
            )}

            {invoice && !depositPaid && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-green-400 text-sm mb-3 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    Channel open — awaiting transmission…
                  </div>
                  {qrUrl && (
                    <div className="inline-block bg-black rounded-xl p-3 border border-cyan-500/20 mb-3">
                      <img src={qrUrl} alt="Lightning invoice QR" width={220} height={220} className="rounded" data-testid="img-invoice-qr" />
                    </div>
                  )}
                  <div className="text-xs text-gray-400 font-mono break-all bg-black/40 rounded p-3 border border-slate-700 text-left">
                    {invoice.paymentRequest}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 border-slate-700" onClick={() => copy(invoice.paymentRequest)}>
                      <Copy className="w-3.5 h-3.5 mr-1" />Copy Invoice
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-slate-700" onClick={() => { setInvoice(null); setDepositPaid(false); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── TRANSMIT ── */}
        {tab === "transmit" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Send className="w-4 h-4 text-red-400" />
              Transmit via Lightning
            </h2>

            {!lnAddrResult ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Amount (sats)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={lnAddrSats}
                      onChange={e => setLnAddrSats(e.target.value)}
                      min="1"
                      placeholder="e.g. 50000"
                      data-testid="input-transmit-amount"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-2.5 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      className="text-xs text-cyan-400 border border-cyan-700/50 rounded-md px-3 hover:bg-cyan-900/30 whitespace-nowrap"
                      onClick={() => setLnAddrSats(String(Math.max(1, sats - 10)))}
                      data-testid="button-transmit-max"
                    >Max</button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-medium">Destination Lightning Address</label>
                  <input
                    type="text"
                    value={lnAddr}
                    onChange={e => setLnAddr(e.target.value)}
                    placeholder="you@walletofsatoshi.com"
                    data-testid="input-transmit-ln-address"
                    className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2.5 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  />
                  {savedLnAddress && savedLnAddress !== lnAddr && (
                    <button className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                      onClick={() => setLnAddr(savedLnAddress)}>
                      Use saved: {savedLnAddress}
                    </button>
                  )}
                </div>

                <Button
                  onClick={async () => {
                    try {
                      const res = await apiRequest("POST", "/api/lightning/get-invoices", {
                        lightningAddress: lnAddr.trim(),
                        amountSats: parseInt(lnAddrSats),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed");
                      setLnAddrResult({ ...data, status: "ready" });
                    } catch (e: any) {
                      toast({ title: "Error", description: e.message, variant: "destructive" });
                    }
                  }}
                  disabled={!lnAddr.trim() || parseInt(lnAddrSats) < 1}
                  className="w-full bg-red-600 hover:bg-red-700 font-semibold"
                  data-testid="button-get-invoice"
                >
                  ⚡ Get Invoice
                </Button>
              </div>
            ) : lnAddrResult?.status === "ready" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-white font-semibold">
                    {lnAddrResult.invoiceCount > 1
                      ? `${lnAddrResult.invoiceCount} invoices — pay each from WoS`
                      : "Pay this invoice from WoS"}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {parseInt(lnAddrSats).toLocaleString()} sats → {lnAddr}
                  </div>
                </div>

                {lnAddrResult.invoices.map((inv: any, i: number) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-600 rounded-lg p-3 space-y-2">
                    {lnAddrResult.invoiceCount > 1 && (
                      <div className="text-[11px] text-gray-400 font-semibold">
                        Invoice {i + 1} of {lnAddrResult.invoiceCount} — {inv.amountSats.toLocaleString()} sats
                      </div>
                    )}
                    <div className="font-mono text-[11px] text-cyan-300 break-all leading-relaxed bg-slate-900/50 rounded p-2">
                      {inv.invoice}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-cyan-700 hover:bg-cyan-600 text-xs font-semibold"
                      data-testid={`button-copy-invoice-${i}`}
                      onClick={() => { navigator.clipboard.writeText(inv.invoice); toast({ title: `Invoice ${i + 1} copied!`, description: "Open WoS → paste → pay" }); }}
                    >
                      Copy Invoice {lnAddrResult.invoiceCount > 1 ? `#${i + 1}` : ""} → paste into WoS
                    </Button>
                  </div>
                ))}

                <div className="text-[11px] text-gray-500 text-center">
                  Open Wallet of Satoshi → tap ⚡ Send → paste the invoice → confirm
                </div>

                <Button size="sm" variant="outline" className="border-slate-600 text-xs w-full"
                  onClick={() => { setLnAddrResult(null); }}>
                  ← New payment
                </Button>
              </div>
            ) : null}
          </Card>
        )}

        {/* ── SWAP / BRIDGE ── */}
        {tab === "swap" && (
          <>
          {/* ── Market price card ── */}
          {mktPrice && (
            <Card className="bg-slate-900/60 border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Bitcoin className="w-3 h-3 text-orange-400" />
                  Live NXT market price
                  {mktPrice.stale && <span className="text-amber-500/60">(cached)</span>}
                </div>
                <div className="text-[10px] text-gray-600">via BTC/USD · 1 NXT = 1,000 sats</div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-3">
                  <div className="text-[10px] text-orange-400/70 uppercase tracking-wider mb-1">BTC / USD</div>
                  <div className="text-white font-mono font-bold text-lg">${mktPrice.btcUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">1 sat = ${mktPrice.satUsd.toFixed(7)}</div>
                </div>
                <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="text-[10px] text-purple-400/70 uppercase tracking-wider mb-1">NXT / USD</div>
                  <div className="text-white font-mono font-bold text-lg">${mktPrice.nxtUsd.toFixed(4)}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">= BTC ÷ 100,000</div>
                </div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-3 space-y-1.5">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Implied collateral model</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Your NXT holding</span>
                  <span className="font-mono text-purple-300">{formatNxt(nxtBalance)} NXT</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">USD value (at swap rate)</span>
                  <span className="font-mono text-emerald-300">${(nxtBalance * mktPrice.nxtUsd).toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Your ⚡ sats</span>
                  <span className="font-mono text-yellow-300">{satsDisplay(sats)} sats · ${(sats * mktPrice.satUsd).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700/50 pt-1.5 flex justify-between text-xs">
                  <span className="text-gray-400">Total hot wallet USD</span>
                  <span className="font-mono text-white font-bold">
                    ${((nxtBalance * mktPrice.nxtUsd) + (sats * mktPrice.satUsd)).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-[10px] text-gray-600 pt-1 border-t border-slate-700/30">
                  21B NXT supply → implied market cap: <span className="text-purple-400/70">${(mktPrice.nxtMcap / 1e9).toFixed(2)}B</span>
                </div>
              </div>
            </Card>
          )}

          {/* ── Auto-sweep status card ── */}
          <Card className="bg-slate-900/80 border-cyan-500/30 p-4" data-testid="card-autosweep-status">
            <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Payment Flow — WNSP.io → UniSat → WoS
            </div>

            {/* Flow diagram */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              <div className="shrink-0 text-center">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto mb-1">
                  <Atom className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-[9px] text-purple-300 font-semibold">WNSP.io</div>
                <div className="text-[8px] text-gray-500">NXT</div>
              </div>
              <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
              <div className="shrink-0 text-center">
                <div className="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-1">
                  <Bitcoin className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-[9px] text-orange-300 font-semibold">UniSat</div>
                <div className="text-[8px] text-gray-500">Sats</div>
              </div>
              <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
              <div className="shrink-0 text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 border ${sweepStatus?.providerReady ? "bg-cyan-500/20 border-cyan-500/40" : "bg-amber-500/20 border-amber-500/40"}`}>
                  <Zap className={`w-4 h-4 ${sweepStatus?.providerReady ? "text-cyan-400" : "text-amber-400"}`} />
                </div>
                <div className={`text-[9px] font-semibold ${sweepStatus?.providerReady ? "text-cyan-300" : "text-amber-300"}`}>
                  {sweepStatus?.provider ? sweepStatus.provider.charAt(0).toUpperCase() + sweepStatus.provider.slice(1) : "Alby"}
                </div>
                <div className="text-[8px] text-gray-500">Lightning</div>
              </div>
              <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
              <div className="shrink-0 text-center">
                <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-1">
                  <Smartphone className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-[9px] text-green-300 font-semibold">WoS</div>
                <div className="text-[8px] text-gray-500">Phone</div>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-green-900/10 border border-green-500/20 rounded-lg px-3 py-2">
                <Smartphone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-green-400/70 uppercase tracking-wider">Auto-sweep destination</div>
                  <div className="text-xs text-green-300 font-mono truncate">
                    {sweepStatus?.destination ?? "wispydice094@walletofsatoshi.com"}
                  </div>
                </div>
                {sweepStatus?.enabled
                  ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] shrink-0"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                  : <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[9px] shrink-0"><Clock className="w-3 h-3 mr-1" />No address</Badge>
                }
              </div>

              {/* Provider status */}
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${sweepStatus?.providerReady ? "bg-cyan-900/10 border-cyan-500/20" : "bg-amber-900/10 border-amber-500/20"}`}>
                <CircleDot className={`w-3.5 h-3.5 shrink-0 ${sweepStatus?.providerReady ? "text-cyan-400" : "text-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[9px] uppercase tracking-wider ${sweepStatus?.providerReady ? "text-cyan-400/70" : "text-amber-400/70"}`}>
                    Lightning provider
                  </div>
                  <div className={`text-xs truncate ${sweepStatus?.providerReady ? "text-cyan-300" : "text-amber-300"}`}>
                    {sweepStatus?.providerNote ?? "Checking…"}
                  </div>
                </div>
                {!sweepStatus?.providerReady && (
                  <a href="https://getalby.com/node/embrace_albyhub" target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-400 hover:text-white text-[9px] h-6 px-2 shrink-0">
                      <ExternalLink className="w-3 h-3 mr-1" />Fund Alby
                    </Button>
                  </a>
                )}
              </div>

              {/* Recent sweep activity */}
              {sweepStatus?.recentSweeps?.length > 0 && (
                <div className="mt-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Recent auto-sweeps</div>
                  <div className="space-y-1">
                    {sweepStatus.recentSweeps.slice(0, 3).map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-[10px]">
                        <StatusBadge status={s.status} />
                        <span className="font-mono text-yellow-300">{Number(s.amountSats).toLocaleString()} sats</span>
                        <span className="text-gray-600 ml-auto">{fmtTime(s.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[9px] text-gray-600 pt-1">
                Every NXT→sats swap triggers an automatic sweep to your WoS phone wallet. Payments execute via the queue worker every 60s.
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              Hot wallet transfers
              {mempoolLive?.ok && (() => {
                const lvl = mempoolLive.congestionLevel ?? "medium";
                const col = lvl === "low" ? "text-green-400 bg-green-500/15" : lvl === "medium" ? "text-amber-400 bg-amber-500/15" : lvl === "high" ? "text-orange-400 bg-orange-500/15" : "text-red-400 bg-red-500/15";
                const dot = lvl === "low" ? "bg-green-400" : lvl === "medium" ? "bg-amber-400" : lvl === "high" ? "bg-orange-400" : "bg-red-400";
                return (
                  <span className={`ml-auto flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${col}`} data-testid="badge-mempool-congestion">
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dot}`} />
                    {mempoolLive.medium} sat/vB
                  </span>
                );
              })()}
            </h2>

            {/* Direction selector */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSwapDir("to_nxt")}
                  data-testid="button-swap-to-nxt"
                  className={`py-2 rounded text-xs font-semibold transition-all ${swapDir === "to_nxt" ? "bg-purple-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"}`}
                >⚡ Sats → 🔬 NXT</button>
                <button
                  onClick={() => setSwapDir("to_sats")}
                  data-testid="button-swap-to-sats"
                  className={`py-2 rounded text-xs font-semibold transition-all ${swapDir === "to_sats" ? "bg-purple-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"}`}
                >🔬 NXT → ⚡ Sats</button>
                <button
                  onClick={() => { setSwapDir("sats_to_btc"); if (btcWalletAddr && !withdrawBtcAddr) setWithdrawBtcAddr(btcWalletAddr); }}
                  data-testid="button-swap-sats-to-btc"
                  className={`py-2 rounded text-xs font-semibold transition-all ${swapDir === "sats_to_btc" ? "bg-orange-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"}`}
                >⚡ Sats → 🔴 BTC</button>
                <button
                  onClick={() => setSwapDir("btc_to_sats")}
                  data-testid="button-swap-btc-to-sats"
                  className={`py-2 rounded text-xs font-semibold transition-all ${swapDir === "btc_to_sats" ? "bg-orange-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"}`}
                >🔴 BTC → ⚡ Sats</button>
              </div>
              {/* Lightning Address withdrawal — full-width, recommended */}
              <button
                onClick={() => { setSwapDir("sats_to_ln"); setLnAddrResult(null); if (savedLnAddress && !lnAddr) setLnAddr(savedLnAddress); }}
                data-testid="button-swap-sats-to-ln"
                className={`w-full py-2 rounded text-xs font-semibold transition-all border ${swapDir === "sats_to_ln" ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-800/50 border-slate-700/50 text-cyan-400 hover:border-cyan-600/50 hover:text-white"}`}
              >⚡ Sats → ⚡ Lightning Address <span className="opacity-70 font-normal">(instant)</span></button>
            </div>

            {/* Balance summary */}
            <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400 space-y-1">
              {(swapDir === "to_nxt" || swapDir === "to_sats") && (
                <>
                  <div>Rate: <span className="text-purple-300 font-mono">1 NXT = 1,000 sats</span></div>
                  <div>⚡ <span className="text-yellow-300 font-mono">{satsDisplay(sats)} sats</span>
                    · 🔬 <span className="text-amber-300 font-mono">{formatNxt(nxtBalance)} NXT</span></div>
                </>
              )}
              {(swapDir === "sats_to_btc" || swapDir === "btc_to_sats") && (
                <>
                  <div>⚡ <span className="text-yellow-300 font-mono">{satsDisplay(sats)} sats</span>
                    {btcConnected && <> · 🔴 <span className="text-orange-300 font-mono">BTC wallet connected</span></>}</div>
                  <div className="text-gray-500">On-chain BTC · min 1,000 sats
                    {mempoolLive?.ok && <> · <span className={`font-mono ${mempoolLive.congestionLevel === "low" ? "text-green-400" : mempoolLive.congestionLevel === "medium" ? "text-amber-400" : "text-orange-400"}`}>{mempoolLive.medium} sat/vB · {mempoolLive.congestionLevel}</span></>}
                  </div>
                </>
              )}
              {swapDir === "sats_to_ln" && (
                <>
                  <div>⚡ <span className="text-yellow-300 font-mono">{satsDisplay(sats)} sats</span>
                    {savedLnAddress && <> · saved: <span className="text-cyan-300 font-mono">{savedLnAddress}</span></>}
                  </div>
                  <div className="text-gray-500">Lightning Network · instant · no on-chain fee</div>
                </>
              )}
            </div>

            {/* ── sats → NXT ── */}
            {swapDir === "to_nxt" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Sats to convert</Label>
                  <Input
                    type="number"
                    value={swapSats}
                    onChange={(e) => setSwapSats(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    min="100"
                    data-testid="input-swap-sats"
                  />
                  <div className="text-xs text-purple-400">→ {(parseInt(swapSats || "0") / 1000).toFixed(3)} NXT</div>
                </div>
                <Button
                  onClick={() => swapToNxt.mutate()}
                  disabled={swapToNxt.isPending || parseInt(swapSats) < 100 || parseInt(swapSats) > sats}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  data-testid="button-execute-swap-to-nxt"
                >
                  {swapToNxt.isPending ? "Converting…" : `Convert ${swapSats} sats → NXT`}
                </Button>
              </div>
            )}

            {/* ── NXT → sats ── */}
            {swapDir === "to_sats" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-400 text-xs">NXT to convert</Label>
                    <button
                      type="button"
                      onClick={() => setSwapNxt(nxtBalance.toString())}
                      className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                      data-testid="button-swap-nxt-max"
                    >
                      MAX ({formatNxt(nxtBalance)} NXT)
                    </button>
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    value={swapNxt}
                    onChange={(e) => setSwapNxt(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    min="0.001"
                    max={nxtBalance}
                    data-testid="input-swap-nxt"
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-yellow-400">→ ⚡ {Math.floor(parseFloat(swapNxt || "0") * 1000).toLocaleString()} sats</div>
                    {parseFloat(swapNxt) > nxtBalance && (
                      <div className="text-xs text-red-400 font-semibold">Exceeds balance</div>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => swapToSats.mutate()}
                  disabled={swapToSats.isPending || parseFloat(swapNxt) < 0.001 || parseFloat(swapNxt) > nxtBalance}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  data-testid="button-execute-swap-to-sats"
                >
                  {swapToSats.isPending ? "Converting…" : `Convert ${swapNxt} NXT → sats`}
                </Button>
              </div>
            )}

            {/* ── sats → BTC on-chain ── */}
            {swapDir === "sats_to_btc" && (
              <div className="space-y-3">
                {withdrawDone ? (
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 text-center space-y-2">
                    <Bitcoin className="w-8 h-8 text-orange-400 mx-auto" />
                    <div className="text-orange-300 font-semibold">Withdrawal queued ✓</div>
                    <div className="text-xs text-gray-400 font-mono break-all">{withdrawDone.btcAddress}</div>
                    <div className="text-xs text-slate-300">
                      <span className="text-orange-300 font-mono">{withdrawDone.netSats?.toLocaleString()} sats</span>
                      <span className="text-gray-500"> (after {withdrawDone.feeSats} sat fee)</span>
                    </div>
                    <div className="text-[10px] text-gray-500">{withdrawDone.note}</div>
                    <Button size="sm" className="bg-slate-700 hover:bg-slate-600 mt-2" onClick={() => setWithdrawDone(null)}>New withdrawal</Button>
                  </div>
                ) : (
                  <>
                    {/* Address book quick-pick */}
                    {addressBook.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-gray-500 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <BookMarked className="w-3 h-3" /> Saved addresses
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {addressBook.map((entry: any) => (
                            <button
                              key={entry.id}
                              onClick={() => setWithdrawBtcAddr(entry.btcAddress)}
                              className={`flex items-center gap-1 text-[10px] rounded px-2 py-1 border transition-all ${withdrawBtcAddr === entry.btcAddress ? "bg-orange-900/30 border-orange-500/60 text-orange-300" : "bg-slate-800/50 border-slate-700/50 text-gray-400 hover:text-orange-300 hover:border-orange-500/30"}`}
                              data-testid={`button-pick-addr-${entry.id}`}
                            >
                              {entry.isAdmin && <span className="text-orange-400">★</span>}
                              <span className="font-semibold">{entry.label}</span>
                              <span className="font-mono opacity-60">{entry.btcAddress.slice(0, 8)}…</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-400 text-xs">Destination BTC address</Label>
                        {btcConnected && btcWalletAddr && (
                          <button
                            className="text-[10px] text-orange-400 hover:text-orange-300 font-mono"
                            onClick={() => setWithdrawBtcAddr(btcWalletAddr)}
                            data-testid="button-autofill-btc-addr"
                          >
                            Use connected wallet ↗
                          </button>
                        )}
                      </div>
                      <Input
                        value={withdrawBtcAddr}
                        onChange={(e) => setWithdrawBtcAddr(e.target.value)}
                        className="bg-slate-800/50 border-slate-700 font-mono text-xs"
                        placeholder="bc1p…"
                        data-testid="input-withdraw-btc-address"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-400 text-xs">Amount (sats)</Label>
                      <Input
                        type="number"
                        value={withdrawSats}
                        onChange={(e) => setWithdrawSats(e.target.value)}
                        className="bg-slate-800/50 border-slate-700 font-mono"
                        min="1000"
                        max="10000000000"
                        data-testid="input-withdraw-sats"
                      />
                      <div className="flex justify-end text-xs">
                        <button className="text-orange-400 hover:text-orange-300" onClick={() => setWithdrawSats(String(sats))}>MAX</button>
                      </div>
                    </div>

                    {/* Fee tier picker */}
                    <div className="space-y-1.5">
                      <div className="text-gray-400 text-xs">Network fee tier</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { key: "slow"   as const, label: "Economy", rate: mempoolLive?.slow   ?? 8,  eta: 60, cls: "text-green-300 bg-green-500/15 border-green-500/40" },
                          { key: "medium" as const, label: "Normal",  rate: mempoolLive?.medium ?? 20, eta: 30, cls: "text-amber-300 bg-amber-500/15 border-amber-500/40" },
                          { key: "fast"   as const, label: "Fast",    rate: mempoolLive?.fast   ?? 50, eta: 10, cls: "text-red-300 bg-red-500/15 border-red-500/40" },
                        ]).map(t => (
                          <button key={t.key} onClick={() => setFeeTier(t.key)}
                            data-testid={`button-fee-tier-${t.key}`}
                            className={`rounded-lg p-2 text-center border transition-all ${feeTier === t.key ? t.cls : "bg-slate-800/40 border-slate-700/40 text-gray-500 hover:text-gray-300"}`}>
                            <div className="text-[10px] font-semibold">{t.label}</div>
                            <div className="text-[11px] font-mono">{t.rate} sat/vB</div>
                            <div className="text-[9px] opacity-70">~{t.eta}min</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fee efficiency guide */}
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-semibold text-gray-300">Fee guide</span>
                        <span className="text-green-400 font-mono">5–72 sat/vB = efficient</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-slate-700/60 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 right-0 rounded-full"
                          style={{ background: "linear-gradient(to right, #22c55e 0%, #84cc16 20%, #eab308 50%, #f97316 75%, #ef4444 100%)" }} />
                        <div className="absolute inset-y-0 rounded-full bg-slate-700/80"
                          style={{ left: `${Math.min(100, ((5-1)/(150-1))*100)}%`, right: `${100 - Math.min(100, ((72-1)/(150-1))*100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                        <span>1</span>
                        <span className="text-green-400">5</span>
                        <span className="text-green-400">efficient range</span>
                        <span className="text-green-400">72</span>
                        <span>150+</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[9px] text-center">
                        {[
                          { range: "1–4",   label: "Slow",      cls: "text-gray-500 bg-slate-700/40" },
                          { range: "5–20",  label: "✓ Good",    cls: "text-green-400 bg-green-500/10 border border-green-500/30" },
                          { range: "21–72", label: "✓ Fast",    cls: "text-amber-400 bg-amber-500/10 border border-amber-500/30" },
                          { range: "73+",   label: "Overpaid",  cls: "text-red-400 bg-red-500/10 border border-red-500/30" },
                        ].map(b => (
                          <div key={b.range} className={`rounded px-1 py-0.5 ${b.cls}`}>
                            <div className="font-mono">{b.range}</div>
                            <div>{b.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic fee breakdown */}
                    {(() => {
                      const amt = parseInt(withdrawSats) || 0;
                      const rate = feeTier === "fast" ? (mempoolLive?.fast ?? 50) : feeTier === "slow" ? (mempoolLive?.slow ?? 8) : (mempoolLive?.medium ?? 20);
                      const netFee = rate * 200;
                      const platFee = Math.max(300, Math.round(amt * 0.003));
                      const net = Math.max(0, amt - netFee - platFee);
                      return (
                        <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">You send</span>
                            <span className="font-mono text-yellow-300">⚡ {amt.toLocaleString()} sats</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Network ({rate} sat/vB × 200 vB)</span>
                            <span className="font-mono text-orange-400">−{netFee.toLocaleString()} sats</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Platform (0.3%, min 300)</span>
                            <span className="font-mono text-orange-400">−{platFee.toLocaleString()} sats</span>
                          </div>
                          <div className="flex justify-between border-t border-orange-500/20 pt-1">
                            <span className="text-gray-400">BTC received</span>
                            <span className="font-mono text-orange-300 font-bold">{net.toLocaleString()} sats</span>
                          </div>
                        </div>
                      );
                    })()}
                    <Button
                      onClick={() => withdrawToBtc.mutate()}
                      disabled={withdrawToBtc.isPending || !withdrawBtcAddr.trim() || (parseInt(withdrawSats) || 0) < 1000 || (parseInt(withdrawSats) || 0) > sats}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                      data-testid="button-withdraw-to-btc"
                    >
                      <Bitcoin className="w-4 h-4 mr-2" />
                      {withdrawToBtc.isPending ? "Queuing…" : "Withdraw to Bitcoin"}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* ── BTC on-chain → sats ── */}
            {swapDir === "btc_to_sats" && (
              <div className="space-y-4">
                <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-4 space-y-3">
                  <div className="text-xs text-orange-300 font-semibold uppercase tracking-wider flex items-center gap-2">
                    <QrCode className="w-3.5 h-3.5" />
                    Send BTC to this address
                  </div>
                  <div className="font-mono text-[11px] text-white break-all select-all bg-slate-800 rounded p-2 leading-relaxed">
                    {depositInfo?.depositAddress ?? "Loading…"}
                  </div>
                  {depositInfo?.depositAddress && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-xs"
                        onClick={() => copy(depositInfo.depositAddress)}
                        data-testid="button-copy-deposit-address">
                        <Copy className="w-3 h-3 mr-1" />Copy address
                      </Button>
                      <a
                        href={`https://mempool.space/address/${depositInfo.depositAddress}`}
                        target="_blank" rel="noreferrer"
                        className="flex-1"
                      >
                        <Button size="sm" variant="outline" className="w-full border-slate-600 text-xs">
                          <Activity className="w-3 h-3 mr-1" />mempool.space
                        </Button>
                      </a>
                    </div>
                  )}
                  {btcConnected && btcWalletAddr && (
                    <div className="text-[10px] text-gray-500">
                      Your connected wallet: <span className="text-orange-300 font-mono">{btcWalletAddr.slice(0, 10)}…{btcWalletAddr.slice(-6)}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 space-y-1.5">
                  <div>• Min deposit: <span className="text-orange-300 font-mono">{(depositInfo?.minDepositSats ?? 5000).toLocaleString()} sats</span></div>
                  <div>• ⚡ Lightning sats credited within ~30 seconds of broadcast</div>
                  <div>• Your sender address is auto-detected via the block scanner</div>
                  {mempoolLive?.ok && (
                    <div className={`flex items-center gap-1 ${mempoolLive.congestionLevel === "low" ? "text-green-400" : mempoolLive.congestionLevel === "medium" ? "text-amber-400" : "text-orange-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${mempoolLive.congestionLevel === "low" ? "bg-green-400" : mempoolLive.congestionLevel === "medium" ? "bg-amber-400" : "bg-orange-400"}`} />
                      Mempool: {mempoolLive.medium} sat/vB · {mempoolLive.pendingTxs ? `${(mempoolLive.pendingTxs/1000).toFixed(0)}K pending txs` : mempoolLive.congestionLevel}
                    </div>
                  )}
                  {/* Fee efficiency guide — deposit context */}
                  <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-2 mt-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-400 font-semibold">Fee guide</span>
                      <span className="text-green-400 font-mono">5–72 sat/vB = efficient</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[9px] text-center">
                      {[
                        { range: "1–4",   label: "Slow",     cls: "text-gray-500 bg-slate-700/40" },
                        { range: "5–20",  label: "✓ Good",   cls: "text-green-400 bg-green-500/10 border border-green-500/30" },
                        { range: "21–72", label: "✓ Fast",   cls: "text-amber-400 bg-amber-500/10 border border-amber-500/30" },
                        { range: "73+",   label: "Overpaid", cls: "text-red-400 bg-red-500/10 border border-red-500/30" },
                      ].map(b => (
                        <div key={b.range} className={`rounded px-1 py-0.5 ${b.cls}`}>
                          <div className="font-mono">{b.range}</div>
                          <div>{b.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Sats → Lightning Address ── */}
            {swapDir === "sats_to_ln" && (
              <div className="space-y-4">
                <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-lg p-4 space-y-3">
                  <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    Send to Lightning Address
                  </div>

                  {/* Address input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Lightning Address</label>
                    <input
                      type="text"
                      value={lnAddr}
                      onChange={e => setLnAddr(e.target.value)}
                      placeholder="you@walletofsatoshi.com"
                      data-testid="input-ln-address"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                    />
                    {savedLnAddress && savedLnAddress !== lnAddr && (
                      <button
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 underline"
                        onClick={() => setLnAddr(savedLnAddress)}
                      >
                        Use saved: {savedLnAddress}
                      </button>
                    )}
                  </div>

                  {/* Amount input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider">Amount (sats)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={lnAddrSats}
                        onChange={e => setLnAddrSats(e.target.value)}
                        min="1"
                        max={sats}
                        data-testid="input-ln-amount-sats"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        className="text-[10px] text-cyan-400 border border-cyan-700/50 rounded px-2 hover:bg-cyan-900/30"
                        onClick={() => setLnAddrSats(String(Math.max(1, sats - 10)))}
                      >Max</button>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Balance: <span className="text-yellow-300 font-mono">{satsDisplay(sats)} sats</span>
                    </div>
                  </div>

                  {/* Save checkbox */}
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={lnAddrSave}
                      onChange={e => setLnAddrSave(e.target.checked)}
                      data-testid="checkbox-ln-save-address"
                      className="accent-cyan-500"
                    />
                    Remember this address
                  </label>

                  {/* Send button */}
                  {!lnAddrResult && (
                    <Button
                      onClick={() => sendToLnAddress.mutate()}
                      disabled={sendToLnAddress.isPending || !lnAddr.trim() || parseInt(lnAddrSats) < 1}
                      data-testid="button-send-to-ln-address"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm"
                    >
                      {sendToLnAddress.isPending ? "Resolving & sending…" : `⚡ Send ${parseInt(lnAddrSats || "0").toLocaleString()} sats`}
                    </Button>
                  )}

                  {/* Result — auto-paid */}
                  {lnAddrResult?.status === "paid" && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 space-y-2">
                      <div className="text-green-400 font-semibold text-sm">✓ Sent!</div>
                      <div className="text-xs text-gray-300">
                        <span className="text-yellow-300 font-mono">{lnAddrResult.amountSats?.toLocaleString()} sats</span>
                        {" → "}
                        <span className="text-cyan-300 font-mono">{lnAddrResult.lightningAddress}</span>
                      </div>
                      {lnAddrResult.paymentHash && (
                        <div className="text-[10px] text-gray-500 font-mono break-all">
                          hash: {lnAddrResult.paymentHash}
                        </div>
                      )}
                      <Button size="sm" variant="outline" className="border-slate-600 text-xs w-full"
                        onClick={() => { setLnAddrResult(null); setLnAddrSats("10000"); }}>
                        Send another
                      </Button>
                    </div>
                  )}

                  {/* Result — queued for automatic processing */}
                  {lnAddrResult?.status === "queued" && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 space-y-2">
                      <div className="text-blue-400 font-semibold text-sm flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        Queued — processing automatically
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="text-yellow-300 font-mono">{lnAddrResult.amountSats?.toLocaleString()} sats</span>
                        {" → "}
                        <span className="text-cyan-300 font-mono">{lnAddrResult.lightningAddress}</span>
                      </div>
                      <div className="text-xs text-blue-300">
                        {lnAddrResult.invoiceCount > 1
                          ? `Split into ${lnAddrResult.invoiceCount} invoices. NexusOS pays each one automatically every 60s.`
                          : "NexusOS will process this invoice automatically within 60s."}
                      </div>
                      <div className="text-[10px] text-gray-500">Check the Log tab for live payment progress. When a provider (Alby, LNbits) is connected all queued invoices drain automatically.</div>
                      <Button size="sm" variant="outline" className="border-slate-600 text-xs w-full"
                        onClick={() => { setLnAddrResult(null); setLnAddrSats("10000"); }}>
                        Send another
                      </Button>
                    </div>
                  )}

                  {/* Result — manual invoice(s) (no provider configured, or provider failed) */}
                  {lnAddrResult?.status === "pending_manual" && (() => {
                    // Normalise: server may return `invoices` array or legacy `invoice` string
                    const items: Array<{ amountSats: number; invoice: string }> =
                      lnAddrResult.invoices
                        ? lnAddrResult.invoices
                        : lnAddrResult.invoice
                          ? [{ amountSats: lnAddrResult.amountSats, invoice: lnAddrResult.invoice }]
                          : [];
                    return (
                      <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 space-y-3">
                        <div className="text-amber-400 font-semibold text-sm flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {items.length > 1
                            ? `Pay all ${items.length} invoices to complete withdrawal`
                            : "Pay this invoice to complete withdrawal"}
                        </div>
                        <div className="text-xs text-gray-400">
                          Your <span className="text-yellow-300 font-mono">{lnAddrResult.amountSats?.toLocaleString()} sats</span> are reserved.
                          Pay {items.length > 1 ? "each invoice" : "the invoice"} below from any Lightning wallet to send them to{" "}
                          <span className="text-cyan-300 font-mono">{lnAddrResult.lightningAddress}</span>.
                        </div>
                        {items.map((item, idx) => (
                          <div key={idx} className="space-y-1.5">
                            {items.length > 1 && (
                              <div className="text-[10px] text-amber-300 font-semibold">
                                Invoice {idx + 1} / {items.length} — ⚡ {item.amountSats.toLocaleString()} sats
                              </div>
                            )}
                            <div className="font-mono text-[10px] text-white break-all bg-slate-800 rounded p-2 leading-relaxed select-all">
                              {item.invoice}
                            </div>
                            <Button size="sm" variant="outline" className="border-slate-600 text-xs w-full"
                              onClick={() => copy(item.invoice)}>
                              <Copy className="w-3 h-3 mr-1" />
                              {items.length > 1 ? `Copy invoice ${idx + 1}` : "Copy invoice"}
                            </Button>
                          </div>
                        ))}
                        <div className="text-[10px] text-gray-500">{lnAddrResult.note}</div>
                      </div>
                    );
                  })()}
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 space-y-1.5">
                  <div>• Works with any Lightning Address: Wallet of Satoshi, Strike, Cash App, Alby…</div>
                  <div>• <span className="text-cyan-400">Instant</span> — no block confirmations, no on-chain fee</div>
                  <div>• Min: <span className="text-cyan-300 font-mono">1 sat</span> · No platform fee on Lightning withdrawals</div>
                </div>

                {/* Reserve top-up guide */}
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg p-3 space-y-2">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Reserve top-up guide</div>
                  <div className="text-[10px] text-gray-500 space-y-1">
                    <div>To add BTC reserves to NexusOS, send BTC from Wallet of Satoshi or any wallet to the service wallet:</div>
                    <div
                      className="font-mono text-[9px] text-orange-300 break-all bg-slate-800 rounded p-1.5 select-all cursor-pointer"
                      onClick={() => copy("bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m")}
                      title="Click to copy"
                    >
                      bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m
                    </div>
                    <div className="text-gray-600">Click address to copy · reserves back NexusOS withdrawals</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
          </>
        )}

        {/* ── SEND P2P ── */}
        {tab === "send" && (
          <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Send sats to a NexusOS user
            </h2>

            {sendOk && (
              <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-green-400 font-semibold">⚡ Transmission complete!</div>
                <div className="text-green-300/60 text-sm">Sats delivered instantly to their channel.</div>
                <Button className="mt-3 bg-green-600 hover:bg-green-700" onClick={() => setSendOk(false)}>Send again</Button>
              </div>
            )}

            {!sendOk && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Recipient username</Label>
                  <Input
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    placeholder="nexus-username"
                    data-testid="input-send-recipient"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Amount (sats)</Label>
                  <Input
                    type="number"
                    value={sendSats}
                    onChange={(e) => setSendSats(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 font-mono"
                    min="1"
                    data-testid="input-send-sats"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>≈ {(parseInt(sendSats || "0") / 1000).toFixed(3)} NXT</span>
                    <button className="text-cyan-400 hover:text-cyan-300" onClick={() => setSendSats(String(sats))}>MAX</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">Memo (optional)</Label>
                  <Input
                    value={sendMemo}
                    onChange={(e) => setSendMemo(e.target.value)}
                    className="bg-slate-800/50 border-slate-700"
                    placeholder="What's this for?"
                    data-testid="input-send-memo"
                  />
                </div>
                <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-gray-400 space-y-1">
                  <div>Your balance: <span className="text-yellow-300 font-mono">⚡ {satsDisplay(sats)} sats</span></div>
                  <div className="text-gray-500">No fees. Instant. Wallet-to-wallet inside NexusOS.</div>
                </div>
                <Button
                  onClick={() => sendP2P.mutate()}
                  disabled={sendP2P.isPending || !sendRecipient.trim() || parseInt(sendSats) < 1 || parseInt(sendSats) > sats}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  data-testid="button-send-p2p"
                >
                  {sendP2P.isPending ? "Sending…" : `⚡ Send ${satsDisplay(parseInt(sendSats) || 0)} sats`}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ── STAKE ── */}
        {tab === "stake" && (
          <div className="space-y-4">
            <Card className="bg-slate-900/60 border-slate-700/50 p-6 space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Stake sats → earn NXT yield
              </h2>

              <div className="grid grid-cols-3 gap-2">
                {([7, 14, 30, 90, 180, 365] as const).map((d) => {
                  const RATES: Record<number, string> = { 7: "5%", 14: "12%", 30: "28%", 90: "90%", 180: "200%", 365: "420%" };
                  const isLong = d >= 90;
                  return (
                    <button
                      key={d}
                      onClick={() => setStakeDays(d)}
                      data-testid={`stake-period-${d}`}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        stakeDays === d
                          ? isLong
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                            : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-700 bg-slate-800/30 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <div className="text-lg font-bold">{d >= 365 ? "1yr" : d >= 180 ? "6mo" : d >= 90 ? "3mo" : `${d}d`}</div>
                      <div className={`text-xs font-semibold ${isLong ? "text-amber-400" : "text-emerald-400"}`}>{RATES[d]} NXT</div>
                      <div className="text-[9px] text-gray-500">yield rate</div>
                    </button>
                  );
                })}
              </div>

              {/* Arbitrage signal */}
              {arbitrage?.ok && (
                <div className={`rounded-lg p-3 text-xs border ${arbitrage.stakingWins ? "bg-emerald-900/20 border-emerald-500/20" : "bg-slate-800/30 border-slate-700/30"}`} data-testid="card-stake-arbitrage">
                  <div className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${arbitrage.stakingWins ? "text-emerald-400" : "text-gray-500"}`}>
                    {arbitrage.stakingWins ? "⚡ Staking beats moving BTC right now" : "ℹ Move vs. stake comparison"}
                  </div>
                  <div className="space-y-1 text-gray-400">
                    <div className="flex justify-between">
                      <span>Move {(arbitrage.exampleSats/1_000).toFixed(0)}K sats on-chain (fee)</span>
                      <span className="font-mono text-orange-400">−{arbitrage.networkFee.toLocaleString()} sats</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stake same for 7 days → NXT yield</span>
                      <span className="font-mono text-emerald-400">+{arbitrage.stakeYieldSats.toLocaleString()} sats</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700/30 pt-1">
                      <span>Net advantage</span>
                      <span className={`font-mono font-bold ${arbitrage.stakingWins ? "text-emerald-300" : "text-red-400"}`}>
                        {arbitrage.stakingWins ? "+" : ""}{arbitrage.netAdvantage.toLocaleString()} sats
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-600 pt-0.5 flex items-center gap-2">
                      <span>{arbitrage.feeRateSatVbyte} sat/vB · {arbitrage.congestionLevel}</span>
                      {arbitrage.yieldBoost > 1 && <span className="text-amber-400/70">+{((arbitrage.yieldBoost - 1) * 100).toFixed(0)}% congestion yield boost</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">Amount to stake (sats)</Label>
                <Input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 font-mono"
                  min="1000"
                  data-testid="input-stake-amount"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Min: 1,000 sats</span>
                  <button className="text-emerald-400 hover:text-emerald-300" onClick={() => setStakeAmount(String(sats))}>MAX</button>
                </div>
              </div>

              {(() => {
                const RATE_MAP: Record<number, number> = { 7: 0.05, 14: 0.12, 30: 0.28, 90: 0.90, 180: 2.00, 365: 4.20 };
                const amt = parseInt(stakeAmount) || 0;
                const nxtEarned = ((amt / 1000) * RATE_MAP[stakeDays]).toFixed(4);
                return (
                  <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-4 space-y-2">
                    <div className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Yield preview</div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">You stake</span>
                      <span className="font-mono text-yellow-300">⚡ {satsDisplay(amt)} sats</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Lock period</span>
                      <span className="font-mono text-white">{stakeDays} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">NXT yield</span>
                      <span className="font-mono text-emerald-400 font-bold">+{nxtEarned} NXT</span>
                    </div>
                    <div className="border-t border-emerald-500/20 pt-2 text-[10px] text-gray-500">
                      Sats returned in full at maturity + NXT yield credited to your spectral wallet
                    </div>
                  </div>
                );
              })()}

              <Button
                onClick={() => stakeMut.mutate()}
                disabled={stakeMut.isPending || parseInt(stakeAmount) < 1000 || parseInt(stakeAmount) > sats}
                className={`w-full ${stakeDays >= 90 ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                data-testid="button-stake"
              >
                {stakeMut.isPending ? "Staking…" : (() => {
                  const label = stakeDays >= 365 ? "1 year" : stakeDays >= 180 ? "6 months" : stakeDays >= 90 ? "3 months" : `${stakeDays} days`;
                  return `Lock ${satsDisplay(parseInt(stakeAmount) || 0)} sats for ${label}`;
                })()}
              </Button>
            </Card>

            {/* Active positions */}
            {(stakesData as any)?.stakes?.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-4">
                <div className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Active Positions
                </div>
                <div className="space-y-3">
                  {(stakesData as any).stakes.map((s: any) => {
                    const matDate = new Date(s.maturesAt);
                    const diff = matDate.getTime() - Date.now();
                    const daysLeft = Math.max(0, Math.ceil(diff / 86_400_000));
                    const isExpanding    = extendingId === s.id;
                    const isEarlyPanel  = earlyWithdrawId === s.id;
                    const EXTEND_RATES: Record<number, string> = { 7: "5%", 14: "12%", 30: "28%", 90: "90%", 180: "200%", 365: "420%" };
                    const extraNxt = ((s.amountSats / 1000) * ({ 7: 0.05, 14: 0.12, 30: 0.28, 90: 0.90, 180: 2.00, 365: 4.20 }[extendDays] ?? 0)).toFixed(4);
                    // Early-exit penalty preview
                    const fullYield     = parseFloat(s.nxtYield || "0");
                    const penaltyFrac   = !s.isMatured && s.status === "active" ? daysLeft / s.lockDays : 0;
                    const penaltyNxt    = (fullYield * penaltyFrac).toFixed(4);
                    const receivedNxt   = Math.max(0, fullYield - parseFloat(penaltyNxt)).toFixed(4);
                    return (
                      <div key={s.id} data-testid={`stake-position-${s.id}`}
                        className={`p-3 bg-black/20 rounded-lg border transition-all ${
                          s.isMatured && s.status === "active" ? "border-emerald-600/40" :
                          isEarlyPanel ? "border-red-700/50" : "border-slate-800/60"
                        }`}>
                        {/* Main row */}
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${s.isMatured ? "bg-emerald-500/20" : "bg-amber-500/10"}`}>
                            {s.isMatured ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-mono">⚡ {satsDisplay(s.amountSats)} sats</div>
                            <div className="text-[10px] text-gray-500">
                              {s.status === "claimed" ? "Withdrawn" : s.isMatured ? "✅ Matured — choose an action" : `${daysLeft}d left · ${s.lockDays}d lock`}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] text-emerald-400/70">+{parseFloat(s.nxtYield || "0").toFixed(4)} NXT yield</div>
                              {parseFloat(s.wnusdMinted || "0") > 0 && s.status === "active" && (
                                <div className="text-[10px] text-green-300/70">· ${parseFloat(s.wnusdMinted).toFixed(2)} WNUSD backed</div>
                              )}
                            </div>
                          </div>
                          {s.status === "claimed" && (
                            <Badge className="bg-slate-700/50 text-gray-400 border-slate-600 text-[9px]">Withdrawn</Badge>
                          )}
                          {/* Early-exit toggle for locked stakes */}
                          {!s.isMatured && s.status === "active" && !isEarlyPanel && (
                            <button
                              onClick={() => setEarlyWithdrawId(s.id)}
                              className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors underline underline-offset-2"
                              data-testid={`button-early-exit-${s.id}`}
                            >
                              early exit
                            </button>
                          )}
                        </div>

                        {/* Early-exit penalty confirmation panel */}
                        {!s.isMatured && s.status === "active" && isEarlyPanel && (
                          <div className="mt-3 space-y-3 bg-red-950/30 border border-red-700/40 rounded-lg p-3">
                            <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              ⚠️ Early exit penalty
                            </div>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Time remaining</span>
                                <span className="font-mono text-amber-300">{daysLeft} of {s.lockDays} days</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Sats returned</span>
                                <span className="font-mono text-yellow-300">⚡ {satsDisplay(s.amountSats)} sats</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">NXT you receive</span>
                                <span className="font-mono text-emerald-400">+{receivedNxt} NXT</span>
                              </div>
                              <div className="flex justify-between border-t border-red-700/30 pt-1.5">
                                <span className="text-red-400">Penalty → treasury</span>
                                <span className="font-mono text-red-400">−{penaltyNxt} NXT</span>
                              </div>
                            </div>
                            <div className="text-[9px] text-gray-600">
                              Penalty = {(penaltyFrac * 100).toFixed(0)}% of yield · proportional to time remaining
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => unstakeMut.mutate(s.id)}
                                disabled={unstakeMut.isPending}
                                className="flex-1 bg-red-700 hover:bg-red-600 text-xs"
                                data-testid={`button-confirm-early-${s.id}`}
                              >
                                {unstakeMut.isPending ? "Processing…" : "Confirm early exit"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEarlyWithdrawId(null)}
                                className="flex-1 border-slate-700 text-gray-400 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Action buttons — only for matured active stakes */}
                        {s.isMatured && s.status === "active" && !isExpanding && (
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => { setExtendingId(s.id); setExtendDays(90); }}
                              className="flex-1 bg-amber-600/80 hover:bg-amber-600 text-xs"
                              data-testid={`button-extend-${s.id}`}
                            >
                              🔒 Extend
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => unstakeMut.mutate(s.id)}
                              disabled={unstakeMut.isPending}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
                              data-testid={`button-unstake-${s.id}`}
                            >
                              ✅ Withdraw
                            </Button>
                          </div>
                        )}

                        {/* Inline extend picker */}
                        {s.isMatured && s.status === "active" && isExpanding && (
                          <div className="mt-3 space-y-3 bg-slate-800/40 rounded-lg p-3">
                            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Choose new lock period</div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {([7, 14, 30, 90, 180, 365] as const).map((d) => (
                                <button
                                  key={d}
                                  onClick={() => setExtendDays(d)}
                                  data-testid={`extend-period-${d}`}
                                  className={`py-2 px-1 rounded-lg border text-center text-[10px] transition-all ${
                                    extendDays === d
                                      ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                                      : "border-slate-700 bg-slate-800/30 text-gray-400 hover:text-gray-200"
                                  }`}
                                >
                                  <div className="font-bold">{d >= 365 ? "1yr" : d >= 180 ? "6mo" : d >= 90 ? "3mo" : `${d}d`}</div>
                                  <div className="text-amber-400/80">{EXTEND_RATES[d]}</div>
                                </button>
                              ))}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              Adds <span className="text-emerald-400 font-mono">+{extraNxt} NXT</span> on top of existing yield
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => extendMut.mutate({ stakeId: s.id, lockDays: extendDays })}
                                disabled={extendMut.isPending}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-xs"
                                data-testid={`button-confirm-extend-${s.id}`}
                              >
                                {extendMut.isPending ? "Extending…" : "Confirm Extend"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExtendingId(null)}
                                className="flex-1 border-slate-700 text-gray-400 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {(stakesData as any)?.stakes?.length === 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-6 text-center">
                <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <div className="text-gray-500 text-sm">No active positions yet.</div>
                <div className="text-gray-600 text-xs mt-1">Lock sats above to start earning NXT.</div>
              </Card>
            )}
          </div>
        )}

        {/* ── UNISAT RECEIVE ── */}
        {tab === "unisat" && (
          <UniSatReceiveTab
            mempoolLive={mempoolLive}
            addressBook={addressBook}
            onRefreshAddressBook={refetchAddressBook}
            onFillWithdrawAddr={(addr) => { setWithdrawBtcAddr(addr); setSwapDir("sats_to_btc"); setTab("swap"); }}
          />
        )}

        {/* ── TRANSMISSIONS LOG ── */}
        {tab === "log" && (
          <div className="space-y-3">
            {/* Lightning transmissions */}
            {lnTxs.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-4">
                <div className="text-xs font-semibold text-yellow-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Lightning Channel Transmissions
                </div>
                <div className="space-y-2">
                  {lnTxs.map((tx: any) => (
                    <div
                      key={tx.id}
                      data-testid={`row-ln-tx-${tx.id}`}
                      className="p-3 bg-black/20 rounded-lg border border-slate-800/60 space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {tx.type === "deposit"       && <ArrowDownToLine className="w-4 h-4 text-green-400" />}
                          {tx.type === "withdrawal"    && <ArrowUpFromLine className="w-4 h-4 text-red-400" />}
                          {tx.type?.startsWith("swap") && <ArrowRightLeft  className="w-4 h-4 text-purple-400" />}
                          {tx.type === "send_p2p"      && <Users            className="w-4 h-4 text-cyan-400" />}
                          {tx.type === "receive_p2p"   && <Users            className="w-4 h-4 text-green-400" />}
                          {tx.type === "tip_sent"      && <Heart            className="w-4 h-4 text-pink-400" />}
                          {tx.type === "tip_received"  && <Heart            className="w-4 h-4 text-pink-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium">
                            {tx.type === "deposit"      && "⚡ Inbound"}
                            {tx.type === "withdrawal"   && "⚡ Outbound"}
                            {tx.type === "swap_to_nxt"  && "⇄ → NXT"}
                            {tx.type === "swap_to_sats" && "⇄ → Sats"}
                            {tx.type === "send_p2p"     && "→ P2P Sent"}
                            {tx.type === "receive_p2p"  && "← P2P Received"}
                            {tx.type === "tip_sent"     && "💜 Tip Sent"}
                            {tx.type === "tip_received" && "💜 Tip Received"}
                            {!["deposit","withdrawal","swap_to_nxt","swap_to_sats","send_p2p","receive_p2p","tip_sent","tip_received"].includes(tx.type) && tx.type}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{tx.memo || tx.paymentHash?.slice(0, 20) + "…" || "—"}</div>
                          {tx.createdAt && <div className="text-[10px] text-gray-600 mt-0.5">{fmtTime(tx.createdAt)}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-sm text-yellow-300">⚡ {satsDisplay(tx.amount_sats ?? tx.amountSats ?? 0)}</div>
                          <div className="mt-0.5"><StatusBadge status={tx.status} /></div>
                        </div>
                      </div>
                      {/* Queued — show auto-payment progress */}
                      {(tx.status === "queued" || tx.status === "processing") && tx.id && (
                        <QueueProgress txId={tx.id} />
                      )}

                      {/* Pending manual invoice(s) — show bolt11(s) so user can pay from any wallet */}
                      {tx.status === "pending_manual" && tx.paymentRequest && (() => {
                        // paymentRequest may be a JSON array (batch) or a plain bolt11
                        let items: Array<{ amountSats: number; payment_request: string }>;
                        try {
                          const parsed = JSON.parse(tx.paymentRequest);
                          items = Array.isArray(parsed) ? parsed : [{ amountSats: tx.amountSats ?? tx.amount_sats ?? 0, payment_request: tx.paymentRequest }];
                        } catch {
                          items = [{ amountSats: tx.amountSats ?? tx.amount_sats ?? 0, payment_request: tx.paymentRequest }];
                        }
                        return (
                          <div className="bg-amber-900/20 border border-amber-500/30 rounded p-2 space-y-1.5">
                            <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {items.length > 1
                                ? `Awaiting payment — pay all ${items.length} invoices to complete withdrawal`
                                : "Awaiting payment — pay this invoice to complete withdrawal"}
                            </div>
                            {items.map((item, idx) => (
                              <div key={idx} className="space-y-1">
                                {items.length > 1 && (
                                  <div className="text-[9px] text-amber-300 font-semibold">
                                    Invoice {idx + 1}/{items.length} — ⚡ {item.amountSats.toLocaleString()} sats
                                  </div>
                                )}
                                <div className="font-mono text-[9px] text-white break-all bg-slate-900 rounded p-1.5 select-all leading-relaxed">
                                  {item.payment_request}
                                </div>
                                <Button size="sm" variant="outline" className="border-slate-600 text-[10px] h-6 px-2 w-full"
                                  onClick={() => copy(item.payment_request)}>
                                  <Copy className="w-3 h-3 mr-1" />
                                  {items.length > 1 ? `Copy invoice ${idx + 1}` : "Copy invoice"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* NXT channel transmissions */}
            {nxtTxs.length > 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-4">
                <div className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Atom className="w-3.5 h-3.5" /> NXT Spectral Transmissions
                </div>
                <div className="space-y-2">
                  {nxtTxs.slice(0, 10).map((tx: any) => {
                    const nm2    = tx.wavelength ? parseFloat(tx.wavelength) : 550;
                    const color2 = nmToRgb(nm2);
                    const earnSet = new Set(["message_earning","stream_earning","document_earning"]);
                    const burnSet = new Set(["protocol_burn"]);
                    const isBurn = burnSet.has(tx.type);
                    const isIn   = earnSet.has(tx.type) || (!isBurn && tx.toWalletId && tx.toWalletId === nxtData?.wallet?.id);
                    const TX_LABELS: Record<string,string> = {
                      transfer: "Transfer", message_fee: "Msg Fee", message_earning: "Msg Earned",
                      stream_fee: "Stream Fee", stream_earning: "Stream Earned",
                      document_fee: "Doc Fee", document_earning: "Doc Earned",
                      upload_fee: "Upload Fee", protocol_burn: "Protocol Burn",
                    };
                    const label = TX_LABELS[tx.type] ?? tx.type.replace(/_/g," ");
                    return (
                      <div
                        key={tx.id}
                        data-testid={`row-nxt-tx-${tx.id}`}
                        className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-slate-800/60"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isBurn ? "bg-orange-500/15 text-orange-400" :
                          isIn   ? "bg-green-500/15 text-green-400"  : "bg-red-500/15 text-red-400"
                        }`}>
                          {isBurn ? "🔥" : isIn
                            ? <ArrowDownLeft className="w-3.5 h-3.5" />
                            : <ArrowUpRight  className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-white">{label}</span>
                            {tx.wavelength && <ChannelPulse nm={nm2} />}
                            {tx.wavelength && <span className="text-[9px] font-mono" style={{ color: color2 }}>{nm2.toFixed(0)}nm</span>}
                          </div>
                          <div className="text-[10px] text-gray-600">{fmtTime(tx.createdAt)}</div>
                        </div>
                        <div className={`font-mono text-sm font-bold shrink-0 ${isBurn ? "text-orange-400" : isIn ? "text-green-400" : "text-red-400"}`}>
                          {isBurn ? "🔥 " : isIn ? "+" : "−"}{formatNxt(tx.amount)} NXT
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {lnTxs.length === 0 && nxtTxs.length === 0 && (
              <Card className="bg-slate-900/60 border-slate-700/50 p-8 text-center">
                <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <div className="text-gray-500">No transmissions yet.<br />Your channel activity will appear here.</div>
              </Card>
            )}
          </div>
        )}

        {/* ── Channel info footer ── */}
        <div className="mt-6 flex items-center gap-3 text-[10px] text-gray-600 font-mono">
          <Bitcoin className="w-3.5 h-3.5 text-orange-400/50" />
          <span>Lightning · 1 NXT = 1,000 sats · WNSP E=hf · Λ=hf/c²</span>
          <span className="ml-auto">{psi}</span>
        </div>

      </div>
    </div>
  );
}
