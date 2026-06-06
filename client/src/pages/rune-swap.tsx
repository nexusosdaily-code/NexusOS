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
const SATS_PER_NXT = 1000;     // 1 NXT = 1,000 sats

type Dir = "rune_to_nxt" | "nxt_to_rune" | "rune_to_sats" | "sats_to_rune";

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
  { id: "sats_to_rune", label: "Sats → NXWV",  icon: <Zap className="w-3.5 h-3.5" />,      color: "green"  },
  { id: "nxt_to_rune",  label: "NXT → NXWV",   icon: <Layers className="w-3.5 h-3.5" />,   color: "orange" },
  { id: "rune_to_nxt",  label: "NXWV → NXT",   icon: <Bitcoin className="w-3.5 h-3.5" />,  color: "purple" },
  { id: "rune_to_sats", label: "NXWV → Sats",  icon: <ArrowUpDown className="w-3.5 h-3.5" />, color: "yellow" },
];

const LAUNCH_NOTE = `💜⚡ NEXUS•WAVELENGTH — The Bitcoin UTXO that rises with BTC

NXWV is a Rune on Bitcoin. A real UTXO. Not a promise.

As BTC rises, so does the USD value of every sat you hold.
Your NXWV floor price in sats never changes — but in dollars it compounds with every BTC cycle.

The Triple Value Stack:
🟠 Layer 1 — BTC appreciation (sats worth more USD as BTC rises)
🟣 Layer 2 — Rune scarcity (21M fixed supply, 21,000 max mints)
⚡ Layer 3 — NXT utility (bridge back to the NexusOS ecosystem)

The NexusOS Pipeline — No BTC wallet needed to start:
1️⃣ Buy NXT
2️⃣ Convert NXT → Sats (1 NXT = 1,000 sats)
3️⃣ Wrap Sats → NXWV Runes on Bitcoin (100 sats = 1 NXWV)

1 NXT = 10 NXWV on Bitcoin mainnet at launch rates

Floor today: 100 sats ≈ $0.06/NXWV
Floor @ $100k BTC: 100 sats ≈ $0.10/NXWV
Floor @ $200k BTC: 100 sats ≈ $0.20/NXWV
+ Rune market premium on top

Start the pipeline 👇
https://wnsp.tech/rune-swap

NEXUS•WAVELENGTH | Rune ID: 840000:8472 | Supply: 21,000,000

#Bitcoin #Runes #NEXUSWAVELENGTH #NXT #WNSP #NexusOS #BTC #Ordinals`;

export default function RuneSwapPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dir, setDir] = useState<Dir>("sats_to_rune");
  const [runeAmt, setRuneAmt] = useState("1000");
  const [btcAddr, setBtcAddr] = useState("");
  const [btcTxid, setBtcTxid] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(true);
  const [broadcastText, setBroadcastText] = useState(LAUNCH_NOTE);

  const { data: rate } = useQuery<any>({ queryKey: ["/api/rune-swap/rate"] });
  const { data: wallet } = useQuery<any>({ queryKey: ["/api/wallet"], refetchInterval: 15000 });
  const { data: lightning } = useQuery<any>({ queryKey: ["/api/lightning/balance"], refetchInterval: 15000 });
  const { data: history = [], isLoading: histLoading } = useQuery<any[]>({
    queryKey: ["/api/rune-swap/history"],
    refetchInterval: 30000,
  });

  const runes    = parseInt(runeAmt) || 0;
  const nxtVal   = runes * (rate?.rate ?? 1);
  const satsVal  = runes * RUNE_TO_SATS_RATE;   // NXWV → Sats output
  const satsCost = runes * RUNE_TO_SATS_RATE;   // Sats → NXWV input cost
  const nxtBal   = parseFloat(wallet?.wallet?.balance ?? "0");
  const satsBal  = Number(lightning?.satsBalance ?? 0);

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
      if (dir === "sats_to_rune") {
        return apiRequest("POST", "/api/rune-swap/sats-to-rune", { runeAmount: runes, btcAddress: btcAddr });
      } else if (dir === "nxt_to_rune") {
        return apiRequest("POST", "/api/rune-swap/nxt-to-rune", { runeAmount: runes, btcAddress: btcAddr });
      } else if (dir === "rune_to_sats") {
        return apiRequest("POST", "/api/rune-swap/rune-to-sats", { runeAmount: runes, btcTxid, btcAddress: btcAddr });
      } else {
        return apiRequest("POST", "/api/rune-swap/rune-to-nxt", { runeAmount: runes, btcTxid, btcAddress: btcAddr });
      }
    },
    onSuccess: (data: any) => {
      toast({ title: "✅ Swap submitted!", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/rune-swap/history"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/balance"] });
      setBtcTxid("");
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const canSwap =
    dir === "sats_to_rune" ? runes >= 100 && btcAddr.length > 10 && satsBal >= satsCost :
    dir === "nxt_to_rune"  ? runes >= 100 && btcAddr.length > 10 && nxtBal >= nxtVal :
    dir === "rune_to_sats" ? runes >= 100 && btcTxid.length >= 30 :
                             runes >= 100 && btcTxid.length >= 30;

  const activeColor =
    dir === "sats_to_rune" ? "green"  :
    dir === "rune_to_sats" ? "yellow" :
    dir === "nxt_to_rune"  ? "orange" : "purple";
  const btnClass =
    activeColor === "green"  ? "bg-green-600 hover:bg-green-700"   :
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

        {/* ⚡ Pipeline Hero */}
        <div className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-950/40 to-purple-950/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-300">The NexusOS Pipeline</span>
            <span className="ml-auto text-[11px] text-white/30 font-mono">No BTC wallet needed to start</span>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {/* Step 1 */}
            <div className="rounded-xl border border-orange-500/30 bg-orange-950/30 px-4 py-3 text-center min-w-[110px] shrink-0">
              <p className="text-[10px] text-orange-300/60 uppercase tracking-widest mb-1">Step 1</p>
              <p className="text-sm font-bold text-orange-300">Buy NXT</p>
              <p className="text-[10px] text-white/30 mt-0.5">Entry token</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
            {/* Step 2 */}
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/30 px-4 py-3 text-center min-w-[130px] shrink-0">
              <p className="text-[10px] text-yellow-300/60 uppercase tracking-widest mb-1">Step 2</p>
              <p className="text-sm font-bold text-yellow-300">NXT → Sats</p>
              <p className="text-[10px] text-white/30 mt-0.5 font-mono">1 NXT = 1,000 sats</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
            {/* Step 3 */}
            <div className="rounded-xl border border-green-500/30 bg-green-950/30 px-4 py-3 text-center min-w-[140px] shrink-0">
              <p className="text-[10px] text-green-300/60 uppercase tracking-widest mb-1">Step 3</p>
              <p className="text-sm font-bold text-green-300">Sats → NXWV</p>
              <p className="text-[10px] text-white/30 mt-0.5 font-mono">100 sats = 1 NXWV</p>
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />
            {/* Result */}
            <div className="rounded-xl border border-purple-500/40 bg-purple-950/40 px-4 py-3 text-center min-w-[110px] shrink-0">
              <p className="text-[10px] text-purple-300/60 uppercase tracking-widest mb-1">You get</p>
              <p className="text-sm font-bold text-purple-300">NXWV</p>
              <p className="text-[10px] text-white/30 mt-0.5">Bitcoin Rune</p>
            </div>
          </div>

          {/* The math */}
          <div className="rounded-xl bg-black/30 border border-white/8 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-white/50">
              Pipeline rate at launch prices:
            </div>
            <div className="font-mono text-sm font-bold">
              <span className="text-orange-300">1 NXT</span>
              <span className="text-white/30 mx-2">=</span>
              <span className="text-yellow-300">1,000 sats</span>
              <span className="text-white/30 mx-2">=</span>
              <span className="text-green-300">10 NXWV</span>
              <span className="text-white/20 ml-2 text-xs">on Bitcoin</span>
            </div>
          </div>

          {/* BTC Appreciation Stack */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-4 space-y-3">
            <p className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
              <Bitcoin className="w-3.5 h-3.5" /> NXWV is a Bitcoin UTXO — it rises with BTC
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              NEXUS•WAVELENGTH Runes live on Bitcoin as UTXOs. As BTC price rises, the USD value of your sats and your Rune position both increase — automatically, with zero action required.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-white/30 mb-1">BTC @ $60k</p>
                <p className="font-mono text-white font-semibold">100 sats</p>
                <p className="text-green-400 font-mono">≈ $0.06</p>
                <p className="text-white/20 text-[10px] mt-0.5">per NXWV</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2 border border-yellow-500/20">
                <p className="text-white/30 mb-1">BTC @ $100k</p>
                <p className="font-mono text-white font-semibold">100 sats</p>
                <p className="text-yellow-400 font-mono">≈ $0.10</p>
                <p className="text-white/20 text-[10px] mt-0.5">per NXWV</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2 border border-orange-500/20">
                <p className="text-white/30 mb-1">BTC @ $200k</p>
                <p className="font-mono text-white font-semibold">100 sats</p>
                <p className="text-orange-400 font-mono">≈ $0.20</p>
                <p className="text-white/20 text-[10px] mt-0.5">per NXWV</p>
              </div>
            </div>
            <p className="text-[11px] text-white/25 text-center">
              Floor price in sats stays 100 · USD value rises with every BTC cycle · Rune scarcity compounds on top
            </p>
          </div>

          <button
            onClick={() => setDir("sats_to_rune")}
            data-testid="button-start-pipeline"
            className="w-full rounded-xl bg-green-600 hover:bg-green-700 transition-colors py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> Start Pipeline — Swap Sats → NXWV
          </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setDir(t.id)}
              data-testid={`dir-${t.id}`}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                dir === t.id
                  ? t.color === "green"  ? "bg-green-600 text-white shadow"
                  : t.color === "yellow" ? "bg-yellow-600 text-white shadow"
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
              {dir === "nxt_to_rune" || dir === "sats_to_rune" ? "NEXUS•WAVELENGTH to receive" : "NEXUS•WAVELENGTH to send"}
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
                : dir === "sats_to_rune"
                ? `= ${satsCost.toLocaleString()} sats cost from your Lightning wallet`
                : `= ${nxtVal.toLocaleString()} NXT`}
            </p>
          </div>

          {/* Sats → NXWV: pipeline step 3 */}
          {dir === "sats_to_rune" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-green-500/20 bg-green-950/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-green-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Pipeline Step 3 — Sats → NEXUS•WAVELENGTH
                </p>
                <p className="text-xs text-white/50">
                  Sats are deducted from your Lightning wallet instantly. NXWV is sent to your Bitcoin address.
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Your sats balance</span>
                  <span className={satsBal < satsCost ? "text-red-400 font-mono" : "text-green-400 font-mono"}>
                    {satsBal.toLocaleString()} sats
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                  Your Bitcoin address (NXWV delivery)
                </label>
                <Input
                  value={btcAddr}
                  onChange={e => setBtcAddr(e.target.value)}
                  data-testid="input-btc-address"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="bc1p… or bc1q…"
                />
                <p className="text-xs text-white/30 mt-1">
                  We'll send {runes.toLocaleString()} NXWV to this address from the service wallet
                </p>
              </div>

              <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-3 text-xs text-green-300">
                <p className="font-semibold mb-1">🟣 You will receive</p>
                <p className="font-mono text-lg">{runes.toLocaleString()} NXWV</p>
                <p className="text-green-300/50 mt-0.5">Delivered to your Bitcoin address · {satsCost.toLocaleString()} sats deducted</p>
              </div>
            </div>
          )}

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
            ) : dir === "sats_to_rune" ? (
              <span className="flex items-center gap-2"><Zap className="w-4 h-4" />Spend {satsCost.toLocaleString()} sats → {runes.toLocaleString()} NXWV</span>
            ) : dir === "rune_to_sats" ? (
              <span className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4" />Wrap {runes.toLocaleString()} NXWV → {satsVal.toLocaleString()} sats</span>
            ) : dir === "rune_to_nxt" ? (
              <span className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4" />Credit {nxtVal.toLocaleString()} NXT</span>
            ) : (
              <span className="flex items-center gap-2"><ArrowUpDown className="w-4 h-4" />Swap {runes.toLocaleString()} NXT → NXWV</span>
            )}
          </Button>

          {!canSwap && runes > 0 && (
            <p className="text-xs text-red-400 text-center">
              {dir === "sats_to_rune" && satsBal < satsCost
                ? `Need ${satsCost.toLocaleString()} sats — you have ${satsBal.toLocaleString()}`
                : dir === "sats_to_rune" && !btcAddr
                ? "Enter your Bitcoin address for NXWV delivery"
                : dir === "nxt_to_rune" && nxtBal < nxtVal
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
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-white/50 leading-relaxed">
            <div>
              <p className="text-green-300 font-semibold mb-1">⚡ Sats → NXWV (Pipeline)</p>
              <p>1. Enter NXWV amount + your BTC address</p>
              <p>2. Sats deducted from Lightning wallet</p>
              <p>3. NXWV sent to your Bitcoin address</p>
            </div>
            <div>
              <p className="text-orange-300 font-semibold mb-1">🟠 NXT → NXWV</p>
              <p>1. Enter Rune amount + your BTC address</p>
              <p>2. NXT → Orbital Treasury</p>
              <p>3. NXWV sent to your BTC address</p>
            </div>
            <div>
              <p className="text-purple-300 font-semibold mb-1">🟣 NXWV → NXT</p>
              <p>1. Send NXWV to service wallet on Unisat</p>
              <p>2. Paste BTC txid</p>
              <p>3. NXT credited to your NexusOS wallet instantly</p>
            </div>
            <div>
              <p className="text-yellow-300 font-semibold mb-1">⚡ NXWV → Sats</p>
              <p>1. Send NXWV UTXO to service wallet</p>
              <p>2. Paste BTC txid</p>
              <p>3. Sats credited to Lightning wallet (100 sats/NXWV)</p>
            </div>
          </div>
          <p className="text-[11px] text-white/20">
            NXT is never destroyed — always redirected to Orbital Treasury · Pipeline: 1 NXT = 10 NXWV · Rate: 100 sats/NXWV (launch)
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
                const isSatsToRune = s.direction === "sats_to_rune";
                const isRuneToSats = s.direction === "rune_to_sats";
                const isToRune    = s.direction === "nxt_to_rune";
                const emoji = isSatsToRune ? "🟢" : isRuneToSats ? "⚡" : isToRune ? "🟠" : "💜";
                const amt   = parseInt(s.runeAmount);
                const rate  = parseInt(s.rate ?? "100") || 100;
                const label = isSatsToRune
                  ? `${(amt * rate).toLocaleString()} sats → ${amt.toLocaleString()} NXWV`
                  : isRuneToSats
                  ? `${amt.toLocaleString()} NXWV → ${(amt * rate).toLocaleString()} sats`
                  : isToRune
                  ? `${parseFloat(s.nxtAmount).toLocaleString()} NXT → ${amt.toLocaleString()} NXWV`
                  : `${amt.toLocaleString()} NXWV → ${parseFloat(s.nxtAmount).toLocaleString()} NXT`;
                return (
                  <div key={s.id} data-testid={`swap-row-${s.id}`}
                    className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        isSatsToRune ? "bg-green-500/20" : isRuneToSats ? "bg-yellow-500/20" : isToRune ? "bg-orange-500/20" : "bg-purple-500/20"
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
