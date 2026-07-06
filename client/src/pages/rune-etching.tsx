import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChannelConnect } from "@/components/channel-connect";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Gem, Bitcoin, Zap, Shield, Cpu, Globe2,
  TrendingUp, Lock, Flame, Coins, ArrowRight, CheckCircle2,
  ExternalLink, Hash, Layers, Activity, RefreshCw, Rocket,
} from "lucide-react";

function Stat({ label, val, sub, color = "text-cyan-300" }: { label: string; val: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4">
      <div className={`text-2xl font-bold font-mono ${color}`}>{val}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, val, mono = false }: { label: string; val: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-800/60 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`text-white text-sm ${mono ? "font-mono" : ""}`}>{val}</span>
    </div>
  );
}

export default function RuneEtchingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<any>({ queryKey: ["/api/rune/info"], refetchInterval: 30_000 });
  const { data: me } = useQuery<any>({ queryKey: ["/api/user"] });

  // WNSP•WAVELENGTHSCRIPT etch status
  const { data: wlsStatus, refetch: refetchWls } = useQuery<any>({
    queryKey: ["/api/btc/wnsp-wavelengthscript/etch-status"],
    refetchInterval: 15_000,
  });

  // WNSP•BTC etch status
  const { data: btcStatus, refetch: refetchBtc } = useQuery<any>({
    queryKey: ["/api/btc/wnsp-btc/etch-status"],
    refetchInterval: 15_000,
  });

  const isKernel = me?.authorityBand === "KERNEL";

  // WLS mutations
  const forceWlsMut = useMutation({
    mutationFn: () => fetch("/api/btc/wnsp-wavelengthscript/force-etch", { method: "POST" }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.ok) toast({ title: "Etch triggered!", description: d.txid ? `TXID: ${d.txid}` : "Working…" });
      else      toast({ title: "Failed", description: d.error, variant: "destructive" });
      refetchWls();
    },
    onError: () => toast({ title: "Error", description: "Could not trigger etch", variant: "destructive" }),
  });

  // BTC mutations
  const forceBtcMut = useMutation({
    mutationFn: () => fetch("/api/btc/wnsp-btc/force-etch", { method: "POST" }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.ok) toast({ title: "Triggered!", description: d.txid ? `TXID: ${d.txid}` : "Step started" });
      else      toast({ title: "Failed", description: d.error, variant: "destructive" });
      refetchBtc();
    },
    onError: () => toast({ title: "Error", description: "Could not trigger etch", variant: "destructive" }),
  });

  const resetBtcMut = useMutation({
    mutationFn: () => fetch("/api/btc/wnsp-btc/reset-etch", { method: "POST" }).then(r => r.json()),
    onSuccess: (d) => {
      if (d.ok) toast({ title: "Reset", description: "BTC etch state reset to pending" });
      else      toast({ title: "Failed", description: d.error, variant: "destructive" });
      refetchBtc();
    },
    onError: () => toast({ title: "Error", description: "Could not reset", variant: "destructive" }),
  });

  // Derived values
  const wlsEtched   = wlsStatus?.status === "etched";
  const confirmedSats = wlsStatus?.confirmed ?? 0;
  const unconfirmedSats = wlsStatus?.unconfirmed ?? 0;
  const WLS_THRESHOLD = wlsStatus?.etchThreshold ?? 8_000;

  const btcCommitted = btcStatus?.status === "committed";
  const btcCommitConfs = btcStatus?.commitConfirmations ?? 0;
  const btcCommitRequired = btcStatus?.commitRequired ?? 6;
  const btcCommitTxid = btcStatus?.commit_txid as string | undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/nexus-command">
            <button className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <Gem className="w-6 h-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">WNSP•WAVELENGTHSCRIPT</h1>
              <p className="text-xs text-slate-400">Bitcoin Rune · NexusOS Canonical Token</p>
            </div>
          </div>
          <div className="flex-1" />
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Rune Protocol</Badge>
        </div>

        <ChannelConnect label="Top up ⚡" />

        {/* ── WNSP•WAVELENGTHSCRIPT etch status panel ── */}
        {!wlsEtched && (
          <Card className="bg-slate-900/80 border-purple-500/30 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-sm text-white">WNSP•WAVELENGTHSCRIPT Etch Status</span>
              <Badge className={`ml-auto text-[10px] border-0 ${
                wlsStatus?.status === "etched"      ? "bg-green-500/20 text-green-300"    :
                wlsStatus?.status === "in_progress" ? "bg-yellow-500/20 text-yellow-300"  :
                wlsStatus?.status === "error"       ? "bg-red-500/20 text-red-300"        :
                "bg-slate-700 text-slate-400"
              }`}>{wlsStatus?.status ?? "loading…"}</Badge>
              <button onClick={() => refetchWls()} className="text-slate-500 hover:text-slate-300 ml-1">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Service wallet confirmed sats</span>
                <span className="font-mono">{confirmedSats.toLocaleString()} / {WLS_THRESHOLD.toLocaleString()} needed</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${confirmedSats >= WLS_THRESHOLD ? "bg-green-500" : "bg-purple-500"}`}
                  style={{ width: `${Math.min(100, (confirmedSats / WLS_THRESHOLD) * 100).toFixed(1)}%` }}
                />
              </div>
              {unconfirmedSats > 0 && (
                <div className="text-[10px] text-yellow-400 mt-1">
                  ⏳ {unconfirmedSats.toLocaleString()} sats unconfirmed
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 mb-3">
              20-char name — no commitment required · single-TX etch · fires automatically at threshold
            </div>

            {wlsStatus?.error_msg && (
              <div className="text-[10px] text-red-400 bg-red-500/10 rounded p-2 mb-3 font-mono">{wlsStatus.error_msg}</div>
            )}

            {isKernel && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs w-full"
                onClick={() => forceWlsMut.mutate()}
                disabled={forceWlsMut.isPending || wlsStatus?.status === "in_progress"}
              >
                <Rocket className="w-3 h-3 mr-1" />
                {forceWlsMut.isPending ? "Etching…" : "Force Etch WNSP•WAVELENGTHSCRIPT (KERNEL)"}
              </Button>
            )}
          </Card>
        )}

        {wlsEtched && wlsStatus?.etch_txid && (
          <Card className="bg-green-900/20 border-green-500/30 p-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-semibold">WNSP•WAVELENGTHSCRIPT etched on-chain</span>
              <a href={`https://mempool.space/tx/${wlsStatus.etch_txid}`} target="_blank" rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300">
                view TX <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>
        )}

        {/* ── WNSP•BTC etch status (compact) ── */}
        {btcStatus?.status !== "etched" && (
          <Card className={`bg-slate-900/60 border-${btcCommitted ? "blue" : "orange"}-500/20 p-3 mb-4`}>
            <div className="flex items-center gap-2">
              <Bitcoin className={`w-3.5 h-3.5 ${btcCommitted ? "text-blue-400" : "text-orange-400"}`} />
              <span className="text-sm text-slate-300">WNSP•BTC</span>
              <Badge className={`text-[10px] border-0 ${
                btcCommitted          ? "bg-blue-500/20 text-blue-300"     :
                btcStatus?.status === "in_progress" ? "bg-yellow-500/20 text-yellow-300" :
                "bg-slate-700 text-slate-400"
              }`}>{btcStatus?.status ?? "…"}</Badge>
              {btcCommitted && btcCommitTxid && (
                <span className="text-[10px] text-blue-300 ml-1">
                  {btcCommitConfs}/{btcCommitRequired} blocks
                </span>
              )}
              <button onClick={() => refetchBtc()} className="text-slate-600 hover:text-slate-400 ml-auto">
                <RefreshCw className="w-3 h-3" />
              </button>
              {isKernel && !btcCommitted && (
                <Button size="sm" variant="ghost"
                  className="text-[10px] text-orange-400 hover:text-orange-300 h-6 px-2"
                  onClick={() => forceBtcMut.mutate()} disabled={forceBtcMut.isPending}>
                  {forceBtcMut.isPending ? "…" : "Force"}
                </Button>
              )}
              {isKernel && (
                <Button size="sm" variant="ghost"
                  className="text-[10px] text-slate-500 hover:text-red-400 h-6 px-2"
                  onClick={() => resetBtcMut.mutate()} disabled={resetBtcMut.isPending}>
                  Reset
                </Button>
              )}
            </div>
            {btcCommitted && btcCommitTxid && (
              <div className="mt-2">
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (btcCommitConfs / btcCommitRequired) * 100)}%` }} />
                </div>
              </div>
            )}
          </Card>
        )}
        {btcStatus?.status === "etched" && btcStatus?.etch_txid && (
          <Card className="bg-orange-900/10 border-orange-500/20 p-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-orange-300 text-sm">WNSP•BTC etched</span>
              <a href={`https://mempool.space/tx/${btcStatus.etch_txid}`} target="_blank" rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300">
                view TX <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>
        )}

        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 via-slate-900 to-cyan-900/10 p-8 mb-6">
          <div className="absolute inset-0 opacity-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="absolute text-6xl font-mono text-purple-400 select-none"
                style={{ left: `${i * 14}%`, top: `${(i % 3) * 30}%`, transform: "rotate(-15deg)" }}>Ψ</div>
            ))}
          </div>
          <div className="relative">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-3xl">Ψ</div>
              <div className="flex-1">
                <div className="text-3xl font-bold text-white mb-1">WNSP•WAVELENGTHSCRIPT</div>
                <div className="text-slate-400 text-sm mb-3">The canonical Bitcoin Rune of the NexusOS ecosystem — and the on-chain identity of WavelengthScript, the spectral programming language. 100% premined to the NexusOS service wallet. Each token represents a compute unit in the WNSP physics stack.</div>
                <div className="flex flex-wrap gap-2">
                  {["Bitcoin Native", "UTXO-based", "100% Premine", "AGPL-3.0", "Physics-signed", "No open minting"].map(t => (
                    <Badge key={t} className="bg-slate-800/80 text-slate-300 border-slate-700 text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Total Supply" val="21B" sub="21,000,000,000 Ψ" color="text-purple-300" />
          <Stat label="Decimals" val="8" sub="div = 8" color="text-cyan-300" />
          <Stat label="Symbol" val="Ψ" sub="Psi — spectral channel" color="text-amber-300" />
          <Stat label="Mint Type" val="Premine" sub="100% to service wallet" color="text-green-300" />
        </div>

        {/* Two-column spec */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-900/60 border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-sm text-white">Rune Specification</span>
            </div>
            <Row label="Rune Name"    val="WNSP•WAVELENGTHSCRIPT" mono />
            <Row label="Rune ID"      val={wlsEtched ? (wlsStatus?.rune_id ?? "pending") : <span className="text-yellow-400 text-xs">pending etch</span>} mono={wlsEtched} />
            <Row label="Symbol"       val="Ψ (Psi)" mono />
            <Row label="Decimals"     val="8" mono />
            <Row label="Total Supply" val="21,000,000,000 Ψ" mono />
            <Row label="Premine"      val="100% to service wallet" mono />
            <Row label="Open Mint"    val="None" mono />
            <Row label="Protocol"     val={<Badge className="bg-purple-500/15 text-purple-300 border-purple-500/20 text-[10px]">Runes (OP_RETURN)</Badge>} />
            {wlsEtched && wlsStatus?.etch_txid && (
              <Row label="Etch TX" val={<a href={`https://mempool.space/tx/${wlsStatus.etch_txid}`} target="_blank" rel="noreferrer"
                className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-[11px]">
                {wlsStatus.etch_txid.slice(0, 12)}… <ExternalLink className="w-3 h-3" />
              </a>} />
            )}
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-white">WavelengthScript Identity</span>
            </div>
            <Row label="Language"       val="WavelengthScript" />
            <Row label="Purpose"        val="Spectral compute unit" />
            <Row label="VM"             val="WNSP Virtual Machine" />
            <Row label="Channel ops"    val="51,200 Ψ channels" mono />
            <Row label="Encoding"       val="CE-SE v1.0" mono />
            <Row label="Physics basis"  val="E = hf, Λ = hf/c²" mono />
            <Row label="Photonic target" val="~2032 ASIC" />
            <Row label="License"        val="AGPL-3.0" />
          </Card>
        </div>

        {/* Why Runes */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm text-white">Why Runes over BRC-20?</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: <Bitcoin className="w-4 h-4 text-orange-400" />, title: "UTXO-native", desc: "Lives directly in Bitcoin UTXOs. No inscription indexer, no ord nodes required." },
              { icon: <Zap className="w-4 h-4 text-yellow-400" />, title: "Cheaper transfers", desc: "Encoded in OP_RETURN. Lower sat-dust, fewer UTXOs, faster propagation." },
              { icon: <Lock className="w-4 h-4 text-green-400" />, title: "Atomic swaps ready", desc: "PSBT-compatible. Trustless marketplace trades without custodial bridges." },
            ].map(f => (
              <div key={f.title} className="bg-slate-800/40 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">{f.icon}<span className="text-white text-xs font-semibold">{f.title}</span></div>
                <div className="text-slate-400 text-xs">{f.desc}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* On-Chain Proof */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-sm text-white">On-Chain Records</span>
          </div>
          <div className="space-y-3">

            {/* WNSP•WAVELENGTHSCRIPT etch status */}
            <div className={`rounded-lg p-3 border ${wlsEtched ? "bg-green-900/20 border-green-500/20" : "bg-purple-900/10 border-purple-500/20"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${wlsEtched ? "text-green-300" : "text-purple-300"}`}>WNSP•WAVELENGTHSCRIPT Rune</span>
                <span className={`text-[10px] font-mono ${wlsEtched ? "text-green-400" : "text-yellow-400"}`}>
                  {wlsEtched ? "✓ Live on Bitcoin" : "⏳ Pending etch"}
                </span>
              </div>
              {wlsEtched && wlsStatus?.etch_txid ? (
                <>
                  <div className="font-mono text-[11px] text-slate-300 break-all mb-2">{wlsStatus.etch_txid}</div>
                  <div className="flex flex-wrap gap-2">
                    <a href={`https://mempool.space/tx/${wlsStatus.etch_txid}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded px-2 py-1">
                      mempool.space <ExternalLink className="w-3 h-3" />
                    </a>
                    <a href={`https://ordiscan.com/rune/WNSP%E2%80%A2WAVELENGTHSCRIPT`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded px-2 py-1">
                      ordiscan.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-slate-400">
                  Etch fires automatically when service wallet reaches {WLS_THRESHOLD.toLocaleString()} confirmed sats.
                  {confirmedSats > 0 && ` Currently: ${confirmedSats.toLocaleString()} sats.`}
                </div>
              )}
            </div>

            {/* WNSP•BTC */}
            <div className="bg-orange-900/10 border border-orange-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-orange-300 text-xs font-semibold">WNSP•BTC Rune</span>
                <span className={`text-[10px] font-mono ${btcStatus?.status === "etched" ? "text-green-400" : "text-yellow-400"}`}>
                  {btcStatus?.status === "etched" ? "✓ Live on Bitcoin" : "⏳ Commit / Reveal pending"}
                </span>
              </div>
              {btcStatus?.status === "etched" && btcStatus?.etch_txid ? (
                <>
                  <div className="font-mono text-[11px] text-slate-300 break-all mb-2">{btcStatus.etch_txid}</div>
                  <a href={`https://mempool.space/tx/${btcStatus.etch_txid}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 bg-orange-500/10 rounded px-2 py-1 w-fit">
                    mempool.space <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              ) : (
                <div className="text-[10px] text-slate-400">
                  {btcCommitted
                    ? `Commit TX confirmed — waiting for ${btcCommitRequired - btcCommitConfs} more block(s) before reveal.`
                    : "2-step commit/reveal etch — fires automatically at threshold."}
                </div>
              )}
            </div>


          </div>
        </Card>

        {/* CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/wavelength-lang">
            <Card className="bg-purple-900/20 border-purple-500/30 p-4 hover:border-purple-400/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">WavelengthScript</span>
                <ArrowRight className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <div className="text-slate-400 text-xs">The spectral programming language backed by WNSP•WAVELENGTHSCRIPT on Bitcoin</div>
            </Card>
          </Link>
          <Link href="/wnsp-vm">
            <Card className="bg-cyan-900/10 border-cyan-500/20 p-4 hover:border-cyan-400/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold text-sm">WNSP VM</span>
                <ArrowRight className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <div className="text-slate-400 text-xs">Execute WavelengthScript bytecode — each Ψ register is a spectral channel</div>
            </Card>
          </Link>
          <Link href="/hardware-spec">
            <Card className="bg-amber-900/10 border-amber-500/20 p-4 hover:border-amber-400/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                <Globe2 className="w-4 h-4 text-amber-400" />
                <span className="text-white font-semibold text-sm">Hardware Spec</span>
                <ArrowRight className="w-3 h-3 text-slate-500 ml-auto" />
              </div>
              <div className="text-slate-400 text-xs">AGPL-3.0 formal spec — SNIC, PHR-1, Spectral Relay Mesh v1</div>
            </Card>
          </Link>
        </div>

      </div>
    </div>
  );
}
