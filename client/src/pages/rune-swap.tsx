import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowUpDown, Copy, CheckCircle2, ExternalLink,
  Bitcoin, Zap, Clock, ArrowRight, Info, Layers, Radio, ChevronDown, ChevronUp,
} from "lucide-react";

const SERVICE_WALLET = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";
const RUNE_NAME = "NEXUS•WAVELENGTH";
const RUNE_TO_SATS_RATE = 100; // sats per NXWV

type Dir = "rune_to_nxt" | "nxt_to_rune" | "rune_to_sats";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    queued:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
    detected:  "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    credited:  "bg-green-500/20 text-green-300 border-green-500/30",
    delivered: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    failed:    "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border font-mono ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
    </button>
  );
}

const TABS: { id: Dir; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "rune_to_nxt",  label: "NXWV → NXT",  icon: <Bitcoin className="w-3.5 h-3.5" />,  color: "purple" },
  { id: "rune_to_sats", label: "NXWV → Sats", icon: <Zap className="w-3.5 h-3.5" />,      color: "yellow" },
  { id: "nxt_to_rune",  label: "NXT → NXWV",  icon: <Layers className="w-3.5 h-3.5" />,   color: "orange" },
];

const LAUNCH_NOTE = `💜⚡ NEXUS•WAVELENGTH is officially etched on Bitcoin!

Rune ID: 840000:8472 | Supply: 21,000,000 | 1,000 per mint | 21,000 max mints
Etch TX: 03e96173f181e3323be796736cfa193b6f11bac374cc1ef7f8f8ecdf0150df3b

You can now:
🔴 Mint NXWV on Bitcoin (Unisat)
🟣 Bridge NXWV → NXT (physics parity 1:1)
⚡ Wrap NXWV UTXO → Sats (100 sats/NXWV launch rate)

Mint on Unisat 👇
https://unisat.io/runes/detail/NEXUS%E2%80%A2WAVELENGTH

Verify etch on mempool.space 👇
https://mempool.space/tx/03e96173f181e3323be796736cfa193b6f11bac374cc1ef7f8f8ecdf0150df3b

Bridge & wrap at wnsp.tech/rune-swap

Built on the Theory of Compression States — the first physics-native token protocol on Bitcoin.

#Bitcoin #Runes #NEXUSWAVELENGTH #WNSP #NexusOS #BTC #Ordinals`;

export default function RuneSwapPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dir, setDir] = useState<Dir>("rune_to_nxt");
  const [runeAmt, setRuneAmt] = useState("1000");
  const [btcAddr, setBtcAddr] = useState("");
  const [btcTxid, setBtcTxid] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(true);
  const [broadcastText, setBroadcastText] = useState(LAUNCH_NOTE);

  const { data: rate } = useQuery<any>({ queryKey: ["/api/rune-swap/rate"] });
  const { data: wallet } = useQuery<any>({ queryKey: ["/api/wallet"], refetchInterval: 15000 });
  const { data: history = [], isLoading: histLoading } = useQuery<any[]>({
    queryKey: ["/api/rune-swap/history"],
    refetchInterval: 30000,
  });

  const runes   = parseInt(runeAmt) || 0;
  const nxtVal  = runes * (rate?.rate ?? 1);
  const satsVal = runes * RUNE_TO_SATS_RATE;
  const nxtBal  = parseFloat(wallet?.wallet?.balance ?? "0");

  const broadcastMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/nostr/broadcast", {
      content:  broadcastText,
      hashtags: ["Bitcoin", "Runes", "NEXUSWAVELENGTH", "WNSP", "NexusOS"],
    }),
    onSuccess: (data: any) => toast({
      title: "📡 Broadcast sent to Nostr!",
      description: data.eventId
        ? `Event ${data.eventId.slice(0, 16)}… published to ${data.relays?.length ?? 8} relay(s)`
        : `Note published to 8 Nostr relays — check your profile`,
    }),
    onError: (e: any) => toast({ title: "Broadcast failed", description: e.message, variant: "destructive" }),
  });

  const swapMut = useMutation({
    mutationFn: async () => {
      if (dir === "nxt_to_rune") {
        return apiRequest("POST", "/api/rune-swap/nxt-to-rune", { runeAmount: runes, btcAddress: btcAddr });
      } else if (dir === "rune_to_sats") {
        return apiRequest("POST", "/api/rune-swap/rune-to-sats", { runeAmount: runes, btcTxid, btcAddress: btcAddr });
      } else {
        return apiRequest("POST", "/api/rune-swap/rune-to-nxt", { runeAmount: runes, btcTxid, btcAddress: btcAddr });
      }
    },
    onSuccess: (data: any) => {
      toast({ title: "Swap submitted!", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/rune-swap/history"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/wallet"] });
      setBtcTxid("");
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const canSwap =
    dir === "nxt_to_rune"  ? runes >= 100 && btcAddr.length > 10 && nxtBal >= nxtVal :
    dir === "rune_to_sats" ? runes >= 100 && btcTxid.length >= 30 :
                             runes >= 100 && btcTxid.length >= 30;

  const activeColor = dir === "rune_to_sats" ? "yellow" : dir === "nxt_to_rune" ? "orange" : "purple";
  const btnClass =
    activeColor === "yellow" ? "bg-yellow-600 hover:bg-yellow-700" :
    activeColor === "orange" ? "bg-orange-600 hover:bg-orange-700" :
                               "bg-purple-600 hover:bg-purple-700";

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-yellow-500 flex items-center justify-center">
              <Bitcoin className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold">NXWV Bridge & Wrap</h1>
              <p className="text-white/40 text-xs">NEXUS•WAVELENGTH Rune ↔ NXT · Sats · Bitcoin</p>
            </div>
          </div>
        </div>

        {/* 📡 Nostr Broadcast Panel — TOP */}
        <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 overflow-hidden">
          <button
            onClick={() => setShowBroadcast(v => !v)}
            data-testid="toggle-broadcast"
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-purple-300">
              <Radio className="w-4 h-4 text-purple-400" /> 📡 Broadcast to Nostr
            </span>
            {showBroadcast ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>

          {showBroadcast && (
            <div className="px-5 pb-5 space-y-3 border-t border-purple-500/20">
              <p className="text-xs text-white/40 pt-3">
                Signs & publishes to 8 Nostr relays instantly. Edit below or send as-is.
              </p>
              <Textarea
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                rows={10}
                data-testid="input-broadcast-content"
                className="bg-black/40 border-purple-500/20 text-white font-mono text-xs resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setBroadcastText(LAUNCH_NOTE)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Reset to launch note
                </button>
                <Button
                  onClick={() => broadcastMut.mutate()}
                  disabled={broadcastMut.isPending || broadcastText.length < 10}
                  data-testid="button-broadcast-send"
                  className="bg-purple-600 hover:bg-purple-700 gap-2 font-bold text-sm px-6"
                >
                  {broadcastMut.isPending
                    ? <span className="flex items-center gap-2"><Radio className="w-4 h-4 animate-pulse" /> Sending…</span>
                    : <span className="flex items-center gap-2"><Radio className="w-4 h-4" /> Send to Nostr</span>
                  }
                </Button>
              </div>
              {broadcastMut.isSuccess && (
                <p className="text-xs text-green-400 text-center font-semibold">
                  ✓ Broadcast confirmed — check your Nostr profile
                </p>
              )}
            </div>
          )}
        </div>

        {/* Rate cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
            <p className="text-[11px] text-white/30 mb-1">Bridge rate</p>
            <p className="font-mono text-sm"><span className="text-purple-300 font-bold">1 NXWV</span> <span className="text-white/30">=</span> <span className="text-orange-300 font-bold">1 NXT</span></p>
            <p className="text-[10px] text-white/20 mt-0.5">Physics parity</p>
          </div>
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
            <p className="text-[11px] text-white/30 mb-1">Wrap rate (launch)</p>
            <p className="font-mono text-sm"><span className="text-yellow-300 font-bold">1 NXWV</span> <span className="text-white/30">=</span> <span className="text-green-300 font-bold">100 sats</span></p>
            <p className="text-[10px] text-white/20 mt-0.5">≈ $0.10 @ $100k BTC</p>
          </div>
        </div>

        {/* Direction tabs */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setDir(t.id)}
              data-testid={`dir-${t.id}`}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                dir === t.id
                  ? t.color === "yellow" ? "bg-yellow-600 text-white shadow"
                  : t.color === "orange" ? "bg-orange-600 text-white shadow"
                  : "bg-purple-600 text-white shadow"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Swap form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">

          {/* Amount */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
              {dir === "nxt_to_rune" ? "NEXUS•WAVELENGTH to receive" : "NEXUS•WAVELENGTH to send"}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={runeAmt}
                onChange={e => setRuneAmt(e.target.value)}
                min={100} step={100}
                data-testid="input-rune-amount"
                className="bg-black/30 border-white/10 text-white font-mono pr-20"
                placeholder="1000"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-300 font-mono">NXWV</span>
            </div>
            <p className="text-xs text-white/30 mt-1">
              {dir === "rune_to_sats"
                ? `= ${satsVal.toLocaleString()} sats (${RUNE_TO_SATS_RATE} sats/NXWV launch rate)`
                : `= ${nxtVal.toLocaleString()} NXT`}
            </p>
          </div>

          {/* NXWV → Sats: send UTXO, paste txid, get sats */}
          {dir === "rune_to_sats" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-yellow-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Step 1 — Send your NXWV UTXO on Bitcoin
                </p>
                <p className="text-xs text-white/50">
                  Send <span className="text-white font-mono">{runes || "?"} {RUNE_NAME}</span> to the service wallet on Unisat:
                </p>
                <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2.5">
                  <code className="text-xs text-yellow-300 font-mono break-all flex-1">{SERVICE_WALLET}</code>
                  <CopyBtn value={SERVICE_WALLET} />
                </div>
                <a href={`https://unisat.io/address/${SERVICE_WALLET}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Verify on Unisat
                </a>
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                  Step 2 — Paste your Bitcoin Transaction ID
                </label>
                <Input
                  value={btcTxid}
                  onChange={e => setBtcTxid(e.target.value)}
                  data-testid="input-btc-txid"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="txid (64 hex chars)"
                />
                {btcTxid.length > 20 && (
                  <a href={`https://mempool.space/tx/${btcTxid}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 mt-1 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Verify on mempool.space
                  </a>
                )}
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                  Your Bitcoin address (optional — for records)
                </label>
                <Input value={btcAddr} onChange={e => setBtcAddr(e.target.value)}
                  data-testid="input-btc-address-optional"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="bc1p… (optional)" />
              </div>

              <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-3 text-xs text-green-300">
                <p className="font-semibold mb-1">⚡ You will receive</p>
                <p className="font-mono text-lg">{satsVal.toLocaleString()} sats</p>
                <p className="text-green-300/50 mt-0.5">Credited to your NexusOS Lightning wallet instantly</p>
              </div>
            </div>
          )}

          {/* NXWV → NXT: send to service wallet, paste txid */}
          {dir === "rune_to_nxt" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Step 1 — Send your Rune on Bitcoin
                </p>
                <p className="text-xs text-white/50">
                  Send <span className="text-white font-mono">{runes || "?"} {RUNE_NAME}</span> to the service wallet on Unisat or Magic Eden:
                </p>
                <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2.5">
                  <code className="text-xs text-purple-300 font-mono break-all flex-1">{SERVICE_WALLET}</code>
                  <CopyBtn value={SERVICE_WALLET} />
                </div>
                <a href={`https://unisat.io/address/${SERVICE_WALLET}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Verify on Unisat
                </a>
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                  Step 2 — Paste your Bitcoin Transaction ID
                </label>
                <Input value={btcTxid} onChange={e => setBtcTxid(e.target.value)}
                  data-testid="input-btc-txid"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="txid (64 hex chars)" />
                {btcTxid.length > 20 && (
                  <a href={`https://mempool.space/tx/${btcTxid}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1 transition-colors">
                    <ExternalLink className="w-3 h-3" /> Verify on mempool.space
                  </a>
                )}
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                  Your Bitcoin address (optional)
                </label>
                <Input value={btcAddr} onChange={e => setBtcAddr(e.target.value)}
                  data-testid="input-btc-address-optional"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="bc1p… (optional)" />
              </div>
            </div>
          )}

          {/* NXT → NXWV: need BTC address */}
          {dir === "nxt_to_rune" && (
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                Your Bitcoin address (Rune delivery)
              </label>
              <Input value={btcAddr} onChange={e => setBtcAddr(e.target.value)}
                data-testid="input-btc-address"
                className="bg-black/30 border-white/10 text-white font-mono text-xs"
                placeholder="bc1p… or bc1q…" />
              <p className="text-xs text-white/30 mt-1">
                NXT goes to Orbital Treasury · {RUNE_NAME} sent to your BTC address from service wallet
              </p>
            </div>
          )}

          {/* NXT balance row */}
          {dir === "nxt_to_rune" && (
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Your NXT balance</span>
              <span className={nxtBal < nxtVal ? "text-red-400" : "text-green-400"}>
                {nxtBal.toLocaleString(undefined, { maximumFractionDigits: 2 })} NXT
              </span>
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={() => swapMut.mutate()}
            disabled={!canSwap || swapMut.isPending}
            data-testid="button-swap-submit"
            className={`w-full gap-2 font-semibold ${btnClass}`}
          >
            {swapMut.isPending ? (
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Processing…</span>
            ) : dir === "rune_to_sats" ? (
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" />Wrap {runes.toLocaleString()} NXWV → {satsVal.toLocaleString()} sats</span>
            ) : dir === "rune_to_nxt" ? (
              <span className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4" />Credit {nxtVal.toLocaleString()} NXT</span>
            ) : (
              <span className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4" />Swap {runes.toLocaleString()} NXWV → NXT</span>
            )}
          </Button>

          {!canSwap && runes > 0 && (
            <p className="text-xs text-red-400 text-center">
              {dir === "nxt_to_rune" && nxtBal < nxtVal
                ? `Need ${nxtVal} NXT — you have ${nxtBal.toFixed(2)}`
                : dir === "nxt_to_rune" && !btcAddr
                ? "Enter a Bitcoin address for delivery"
                : btcTxid.length < 30
                ? "Paste the Bitcoin transaction ID"
                : runes < 100
                ? "Minimum 100 NEXUS•WAVELENGTH"
                : ""}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2">
            <Info className="w-4 h-4" /> How it works
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-white/50 leading-relaxed">
            <div>
              <p className="text-purple-300 font-semibold mb-1">NXWV → NXT</p>
              <p>1. Send NXWV to service wallet on Unisat</p>
              <p>2. Paste BTC txid</p>
              <p>3. NXT credited to your NexusOS wallet instantly</p>
            </div>
            <div>
              <p className="text-yellow-300 font-semibold mb-1">NXWV → Sats ⚡</p>
              <p>1. Send NXWV UTXO to service wallet</p>
              <p>2. Paste BTC txid</p>
              <p>3. Sats credited to your Lightning wallet (100 sats/NXWV)</p>
            </div>
            <div>
              <p className="text-orange-300 font-semibold mb-1">NXT → NXWV</p>
              <p>1. Enter Rune amount + your BTC address</p>
              <p>2. NXT → Orbital Treasury</p>
              <p>3. NXWV sent to your BTC address</p>
            </div>
          </div>
          <p className="text-[11px] text-white/20">
            NXT is never destroyed — always redirected to Orbital Treasury · Wrap rate: 100 sats/NXWV (launch)
          </p>
        </div>

        {/* 📡 Nostr Broadcast Panel */}
        <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 overflow-hidden">
          <button
            onClick={() => setShowBroadcast(v => !v)}
            data-testid="toggle-broadcast"
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-purple-300">
              <Radio className="w-4 h-4" /> Broadcast to Nostr
            </span>
            {showBroadcast ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
          </button>

          {showBroadcast && (
            <div className="px-5 pb-5 space-y-3 border-t border-purple-500/20">
              <p className="text-xs text-white/40 pt-3">
                Publishes a signed Nostr note to 8 relays instantly. Edit the content below or send as-is.
              </p>
              <Textarea
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                rows={10}
                data-testid="input-broadcast-content"
                className="bg-black/40 border-purple-500/20 text-white font-mono text-xs resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setBroadcastText(LAUNCH_NOTE)}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Reset to launch note
                </button>
                <Button
                  onClick={() => broadcastMut.mutate()}
                  disabled={broadcastMut.isPending || broadcastText.length < 10}
                  data-testid="button-broadcast-send"
                  className="bg-purple-600 hover:bg-purple-700 gap-2 font-semibold"
                >
                  {broadcastMut.isPending
                    ? <span className="flex items-center gap-2"><Radio className="w-4 h-4 animate-pulse" /> Sending…</span>
                    : <span className="flex items-center gap-2"><Radio className="w-4 h-4" /> Send to Nostr</span>
                  }
                </Button>
              </div>
              {broadcastMut.isSuccess && (
                <p className="text-xs text-green-400 text-center">
                  ✓ Broadcast confirmed — check your Nostr profile for the new note
                </p>
              )}
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Your swap history
          </h2>
          {histLoading ? (
            <p className="text-white/30 text-sm text-center py-6">Loading…</p>
          ) : (history as any[]).length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/3 p-8 text-center">
              <ArrowRight className="w-6 h-6 text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No swaps yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(history as any[]).map((s: any) => {
                const isSats = s.direction === "rune_to_sats";
                const isToRune = s.direction === "nxt_to_rune";
                const emoji = isSats ? "⚡" : isToRune ? "🟠" : "💜";
                const label = isSats
                  ? `${parseInt(s.runeAmount).toLocaleString()} NXWV → ${(parseInt(s.runeAmount) * 100).toLocaleString()} sats`
                  : isToRune
                  ? `${parseFloat(s.nxtAmount).toLocaleString()} NXT → ${parseInt(s.runeAmount).toLocaleString()} NXWV`
                  : `${parseInt(s.runeAmount).toLocaleString()} NXWV → ${parseFloat(s.nxtAmount).toLocaleString()} NXT`;
                return (
                  <div key={s.id} data-testid={`swap-row-${s.id}`}
                    className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        isSats ? "bg-yellow-500/20" : isToRune ? "bg-orange-500/20" : "bg-purple-500/20"
                      }`}>{emoji}</div>
                      <div>
                        <p className="text-sm font-mono text-white">{label}</p>
                        <p className="text-[11px] text-white/30 font-mono">
                          #{s.id} · {new Date(s.createdAt).toLocaleDateString()}
                          {s.btcTxid && <> · <a href={`https://mempool.space/tx/${s.btcTxid}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">{s.btcTxid.slice(0, 10)}…</a></>}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={s.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
