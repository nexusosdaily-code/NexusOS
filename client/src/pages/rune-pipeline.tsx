import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Zap, Bitcoin, CheckCircle2, Loader2, Layers,
  Radio, TrendingUp, AlertCircle, Copy, ExternalLink, ArrowRight,
} from "lucide-react";

const SATS_PER_NXWV = 100;
const PIPELINE_FEE  = 0.01; // 1% on NXT→Sats

type Stage = "configure" | "step2" | "step3" | "complete";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded hover:bg-white/10 transition-colors shrink-0"
    >
      {copied
        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5 text-white/30" />}
    </button>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all duration-300 ${
      done   ? "bg-green-600  border-green-500  text-white" :
      active ? "bg-purple-600 border-purple-400 text-white scale-110" :
               "bg-white/5   border-white/15    text-white/25"
    }`}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
    </div>
  );
}

function ProgressBar({ stage }: { stage: Stage }) {
  const steps = [
    { label: "Configure",   key: "configure" },
    { label: "NXT → Sats", key: "step2" },
    { label: "Sats → NXWV",key: "step3" },
    { label: "Complete",    key: "complete" },
  ];
  const idx = steps.findIndex(s => s.key === stage);
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <StepDot n={i + 1} active={i === idx} done={i < idx} />
          <span className={i === idx ? "text-white font-semibold" : i < idx ? "text-white/40" : "text-white/15"}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`w-6 h-px ${i < idx ? "bg-green-600" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

const BTC_PRICES = [60_000, 100_000, 200_000, 500_000];

function AppreciationTable({ goal, btcUsd }: { goal: number; btcUsd: number }) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-4 space-y-3">
      <p className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5" />
        {goal > 0
          ? `Your ${goal.toLocaleString()} NXWV — value at BTC price targets`
          : "NXWV value at BTC price targets"}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        {BTC_PRICES.map(price => {
          const satUsd  = price / 100_000_000;
          const perNxwv = (SATS_PER_NXWV * satUsd).toFixed(3);
          const total   = goal > 0 ? Math.round(goal * SATS_PER_NXWV * satUsd) : null;
          const nearest = BTC_PRICES.reduce((a, b) => Math.abs(b - btcUsd) < Math.abs(a - btcUsd) ? b : a);
          const isCurrent = price === nearest;
          return (
            <div key={price} className={`rounded-lg bg-black/30 p-2.5 space-y-0.5 ${isCurrent ? "border border-yellow-500/30" : ""}`}>
              <p className="text-white/30">${(price / 1000).toFixed(0)}k BTC</p>
              <p className={`font-mono font-bold text-sm ${isCurrent ? "text-yellow-300" : "text-white"}`}>
                ${perNxwv}
              </p>
              <p className="text-white/20 text-[10px]">per NXWV</p>
              {total !== null && (
                <p className="text-green-400 text-[10px] font-mono">${total.toLocaleString()} total</p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-white/20 text-center">
        Floor in sats stays {SATS_PER_NXWV} · USD value rises with BTC · Rune scarcity compounds on top
      </p>
    </div>
  );
}

export default function RunePipelinePage() {
  const { toast }  = useToast();
  const qc         = useQueryClient();

  const [stage,       setStage]       = useState<Stage>("configure");
  const [nxwvGoal,    setNxwvGoal]    = useState("1000");
  const [btcAddress,  setBtcAddress]  = useState("");
  const [step2Data,   setStep2Data]   = useState<any>(null);
  const [step3Data,   setStep3Data]   = useState<any>(null);
  const [broadcastTxt,setBroadcastTxt]= useState("");

  const goal     = Math.max(0, parseInt(nxwvGoal) || 0);
  const satsNeeded = goal * SATS_PER_NXWV;
  const nxtBase    = goal / 10;
  const nxtFee     = parseFloat((nxtBase * PIPELINE_FEE).toFixed(8));
  const nxtTotal   = parseFloat((nxtBase * (1 + PIPELINE_FEE)).toFixed(8));

  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"],            refetchInterval: 8000 });
  const { data: lightData  } = useQuery<any>({ queryKey: ["/api/lightning/balance"],  refetchInterval: 8000 });
  const { data: marketData } = useQuery<any>({ queryKey: ["/api/market/price"],       refetchInterval: 30000 });

  const nxtBal  = parseFloat(walletData?.wallet?.balance ?? "0");
  const satsBal = Number(lightData?.satsBalance ?? 0);
  const btcUsd  = marketData?.btcUsd ?? 60000;

  // ── Step 2: NXT → Sats ──────────────────────────────────────────────────────
  const step2 = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pipeline/step2", { nxwvGoal: goal }),
    onSuccess: (data: any) => {
      setStep2Data(data);
      setStage("step3");
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/balance"] });
      toast({ title: "⚡ Step 2 complete", description: `${Number(data.satsCredited).toLocaleString()} sats credited to Lightning wallet` });
    },
    onError: (e: any) => toast({ title: "Step 2 failed", description: e.message, variant: "destructive" }),
  });

  // ── Step 3: Sats → NXWV ─────────────────────────────────────────────────────
  const step3 = useMutation({
    mutationFn: () => apiRequest("POST", "/api/rune-swap/sats-to-rune", { runeAmount: goal, btcAddress }),
    onSuccess: (data: any) => {
      setStep3Data(data);
      setStage("complete");
      qc.invalidateQueries({ queryKey: ["/api/lightning/balance"] });
      const note = [
        `💜⚡ Just ran the NexusOS Pipeline!`,
        ``,
        `Acquired ${goal.toLocaleString()} NEXUS•WAVELENGTH Runes on Bitcoin`,
        ``,
        `NXT → Sats → NXWV (Bitcoin UTXO)`,
        ``,
        `Pipeline rate: 1 NXT = 10 NXWV at launch`,
        `Floor: ${SATS_PER_NXWV} sats/NXWV — rises with every BTC cycle`,
        ``,
        `Triple value stack:`,
        `🟠 BTC appreciation (sats worth more USD as BTC rises)`,
        `🟣 Rune scarcity (21M fixed supply)`,
        `⚡ NXT utility (bridge back to NexusOS)`,
        ``,
        `Try the pipeline → wnsp.tech/rune-pipeline`,
        ``,
        `#Bitcoin #Runes #NEXUSWAVELENGTH #NXT #WNSP #NexusOS`,
      ].join("\n");
      setBroadcastTxt(note);
      toast({ title: "🎉 Pipeline complete!", description: `${goal.toLocaleString()} NXWV queued for delivery to your Bitcoin address` });
    },
    onError: (e: any) => toast({ title: "Step 3 failed", description: e.message, variant: "destructive" }),
  });

  // ── Nostr broadcast ──────────────────────────────────────────────────────────
  const [broadcastLinks, setBroadcastLinks] = useState<{ primal: string; njump: string } | null>(null);

  const broadcast = useMutation({
    mutationFn: () => apiRequest("POST", "/api/nostr/broadcast", {
      content: broadcastTxt,
      hashtags: ["Bitcoin", "Runes", "NEXUSWAVELENGTH", "NXT", "WNSP", "NexusOS"],
    }),
    onSuccess: (data: any) => {
      if (data.primal) setBroadcastLinks({ primal: data.primal, njump: data.njump });
      toast({ title: "📡 Broadcast sent!", description: `Published to ${data.relays?.length ?? 8} Nostr relays` });
    },
    onError: (e: any) => toast({ title: "Broadcast failed", description: e.message, variant: "destructive" }),
  });

  const canStep2 = goal >= 100 && nxtBal >= nxtTotal && btcAddress.length >= 10;
  const canStep3 = satsBal >= satsNeeded;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 via-yellow-500 to-green-500 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">NXT → NXWV Pipeline</h1>
            <p className="text-xs text-white/35">
              Buy Bitcoin Runes with NXT · No BTC wallet needed to start
            </p>
          </div>
        </div>

        {/* ── Progress ── */}
        <div className="overflow-x-auto">
          <ProgressBar stage={stage} />
        </div>

        {/* ══════════ STAGE: configure ══════════ */}
        {stage === "configure" && (
          <div className="space-y-4">

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
              <h2 className="text-sm font-bold text-white/80">Configure your pipeline</h2>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                  How many NXWV on Bitcoin?
                </label>
                <div className="relative">
                  <Input
                    type="number" min={100} step={100}
                    value={nxwvGoal}
                    onChange={e => setNxwvGoal(e.target.value)}
                    data-testid="input-nxwv-goal"
                    className="bg-black/30 border-white/10 text-white font-mono text-lg pr-20"
                    placeholder="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-300 font-mono">NXWV</span>
                </div>
                <p className="text-[11px] text-white/25 mt-1">Min 100 · 1,000 per mint on Unisat</p>
              </div>

              <div>
                <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">
                  Your Bitcoin address (Rune delivery)
                </label>
                <Input
                  value={btcAddress}
                  onChange={e => setBtcAddress(e.target.value)}
                  data-testid="input-btc-address"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="bc1p… or bc1q…"
                />
              </div>
            </div>

            {/* Cost breakdown */}
            {goal >= 100 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-950/10 p-5 space-y-3">
                <h3 className="text-xs font-bold text-yellow-300 uppercase tracking-widest">Pipeline Cost</h3>
                <div className="space-y-1 text-xs divide-y divide-white/5">
                  <div className="flex justify-between py-2">
                    <span className="text-white/45">⚡ Step 2 — NXT base</span>
                    <span className="font-mono text-white">{nxtBase.toFixed(2)} NXT → {satsNeeded.toLocaleString()} sats</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-white/45">🏛 Pipeline fee (1%)</span>
                    <span className="font-mono text-orange-300">{nxtFee.toFixed(4)} NXT → Orbital Treasury</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-yellow-300 font-semibold">Total NXT cost</span>
                    <span className="font-mono text-yellow-300 font-bold">{nxtTotal.toFixed(4)} NXT</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-white/45">🟢 Step 3 — wrap to NXWV</span>
                    <span className="font-mono text-white">{satsNeeded.toLocaleString()} sats → {goal.toLocaleString()} NXWV</span>
                  </div>
                </div>

                <div className="rounded-xl bg-black/30 border border-green-500/15 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-white/35">You pay</span>
                  <div className="font-mono text-sm font-bold flex items-center gap-2">
                    <span className="text-yellow-300">{nxtTotal.toFixed(2)} NXT</span>
                    <ArrowRight className="w-4 h-4 text-white/20" />
                    <span className="text-green-300">{goal.toLocaleString()} NXWV</span>
                    <span className="text-white/20 text-xs">on Bitcoin</span>
                  </div>
                </div>

                <div className="flex justify-between text-xs pt-1">
                  <span className="text-white/35">Your NXT balance</span>
                  <span className={nxtBal >= nxtTotal ? "text-green-400 font-mono" : "text-red-400 font-mono"}>
                    {nxtBal.toLocaleString(undefined, { maximumFractionDigits: 4 })} NXT
                    {nxtBal < nxtTotal && ` · need ${(nxtTotal - nxtBal).toFixed(2)} more`}
                  </span>
                </div>
              </div>
            )}

            {/* Appreciation preview */}
            {goal >= 100 && <AppreciationTable goal={goal} btcUsd={btcUsd} />}

            <Button
              onClick={() => setStage("step2")}
              disabled={!canStep2}
              data-testid="button-to-step2"
              className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 font-bold py-3 gap-2"
            >
              <Layers className="w-4 h-4" />
              {goal < 100            ? "Enter at least 100 NXWV"
               : !btcAddress         ? "Enter a Bitcoin address"
               : nxtBal < nxtTotal   ? `Need ${nxtTotal.toFixed(2)} NXT (have ${nxtBal.toFixed(2)})`
               : `Proceed — Convert ${nxtTotal.toFixed(2)} NXT → ${satsNeeded.toLocaleString()} sats`}
            </Button>
          </div>
        )}

        {/* ══════════ STAGE: step2 ══════════ */}
        {stage === "step2" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-950/15 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-600/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="font-bold text-yellow-300 text-sm">Step 2 — Convert NXT → Sats</h2>
                  <p className="text-xs text-white/35">{nxtTotal.toFixed(4)} NXT deducted · {satsNeeded.toLocaleString()} sats credited</p>
                </div>
              </div>

              <div className="space-y-0 text-xs divide-y divide-white/5">
                <div className="flex justify-between py-2.5">
                  <span className="text-white/45">NXT converted (base)</span>
                  <span className="font-mono">{nxtBase.toFixed(4)} NXT → {satsNeeded.toLocaleString()} sats</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-white/45">Pipeline fee (1%)</span>
                  <span className="font-mono text-orange-300">{nxtFee.toFixed(4)} NXT → Orbital Treasury</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-yellow-300 font-semibold">Total NXT deducted</span>
                  <span className="font-mono text-yellow-300 font-bold">{nxtTotal.toFixed(4)} NXT</span>
                </div>
              </div>

              <div className="rounded-xl bg-black/30 border border-yellow-500/15 p-4">
                <p className="text-xs text-white/35 mb-1">You will receive</p>
                <p className="font-mono text-2xl font-bold text-yellow-300">{satsNeeded.toLocaleString()} sats</p>
                <p className="text-xs text-white/25">Credited to your NexusOS Lightning wallet</p>
              </div>

              <Button
                onClick={() => step2.mutate()}
                disabled={step2.isPending}
                data-testid="button-execute-step2"
                className="w-full bg-yellow-600 hover:bg-yellow-700 font-bold gap-2 py-3"
              >
                {step2.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting…</>
                  : <><Zap className="w-4 h-4" /> Pay {nxtTotal.toFixed(4)} NXT → Receive {satsNeeded.toLocaleString()} sats</>}
              </Button>
              <button onClick={() => setStage("configure")} className="w-full text-xs text-white/20 hover:text-white/40 py-1 transition-colors">
                ← Back to configure
              </button>
            </div>
          </div>
        )}

        {/* ══════════ STAGE: step3 ══════════ */}
        {stage === "step3" && (
          <div className="space-y-4">
            {/* Step 2 receipt */}
            {step2Data && (
              <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <div className="text-xs">
                  <p className="text-green-300 font-semibold">Step 2 complete ✓</p>
                  <p className="text-white/35">{step2Data.nxtDeducted} NXT deducted · {Number(step2Data.satsCredited).toLocaleString()} sats added to Lightning wallet</p>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-green-500/30 bg-green-950/15 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center">
                  <Bitcoin className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="font-bold text-green-300 text-sm">Step 3 — Wrap Sats → NXWV on Bitcoin</h2>
                  <p className="text-xs text-white/35">{satsNeeded.toLocaleString()} sats → {goal.toLocaleString()} NXWV Rune</p>
                </div>
              </div>

              <div className="space-y-0 text-xs divide-y divide-white/5">
                <div className="flex justify-between py-2.5">
                  <span className="text-white/45">Sats to spend</span>
                  <span className="font-mono">{satsNeeded.toLocaleString()} sats</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-white/45">Rate</span>
                  <span className="font-mono">{SATS_PER_NXWV} sats / NXWV</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-white/45">Deliver to</span>
                  <span className="font-mono text-purple-300 text-[11px] truncate max-w-[220px]">{btcAddress}</span>
                </div>
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-white/35">Lightning wallet</span>
                <span className={satsBal >= satsNeeded ? "text-green-400 font-mono" : "text-red-400 font-mono"}>
                  {satsBal.toLocaleString()} sats available
                </span>
              </div>

              {!canStep3 && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Need {(satsNeeded - satsBal).toLocaleString()} more sats — add Lightning balance first
                </div>
              )}

              <div className="rounded-xl bg-black/30 border border-purple-500/15 p-4">
                <p className="text-xs text-white/35 mb-1">You will receive</p>
                <p className="font-mono text-2xl font-bold text-purple-300">{goal.toLocaleString()} NXWV</p>
                <p className="text-xs text-white/25">NEXUS•WAVELENGTH Rune queued for delivery to your Bitcoin address</p>
              </div>

              <Button
                onClick={() => step3.mutate()}
                disabled={step3.isPending || !canStep3}
                data-testid="button-execute-step3"
                className="w-full bg-green-600 hover:bg-green-700 font-bold gap-2 py-3"
              >
                {step3.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Wrapping…</>
                  : <><Bitcoin className="w-4 h-4" /> Pay {satsNeeded.toLocaleString()} sats → Deliver {goal.toLocaleString()} NXWV to Bitcoin</>}
              </Button>
            </div>
          </div>
        )}

        {/* ══════════ STAGE: complete ══════════ */}
        {stage === "complete" && (
          <div className="space-y-5">
            {/* Success banner */}
            <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-950/50 to-green-950/30 p-7 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-green-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Pipeline Complete! 🎉</h2>
                <p className="text-white/50 text-sm mt-1">
                  <span className="text-green-300 font-bold font-mono">{goal.toLocaleString()} NXWV</span> queued for delivery to Bitcoin
                </p>
              </div>
              <div className="rounded-xl bg-black/30 p-3 text-left space-y-1.5">
                <p className="text-xs text-white/35">Delivery address</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-purple-300 font-mono break-all flex-1">{btcAddress}</code>
                  <CopyBtn value={btcAddress} />
                </div>
                <a
                  href={`https://unisat.io/address/${btcAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1"
                >
                  <ExternalLink className="w-3 h-3" /> Check balance on Unisat
                </a>
              </div>
            </div>

            {/* Receipt */}
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-0 text-xs divide-y divide-white/5">
              <h3 className="text-white/40 font-semibold uppercase tracking-widest pb-2">Pipeline Receipt</h3>
              <div className="flex justify-between py-2.5">
                <span className="text-white/35">NXT converted (base)</span>
                <span className="font-mono text-white">{nxtBase.toFixed(4)} NXT</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-white/35">Pipeline fee paid (1%)</span>
                <span className="font-mono text-orange-300">{nxtFee.toFixed(4)} NXT → Treasury</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-white/35">Sats wrapped</span>
                <span className="font-mono text-yellow-300">{satsNeeded.toLocaleString()} sats</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-green-300 font-semibold">NXWV delivered</span>
                <span className="font-mono text-green-300 font-bold">{goal.toLocaleString()} NXWV → Bitcoin</span>
              </div>
            </div>

            {/* BTC appreciation */}
            <AppreciationTable goal={goal} btcUsd={btcUsd} />

            {/* Nostr broadcast */}
            <div className="rounded-2xl border border-purple-500/25 bg-purple-950/15 p-5 space-y-3">
              <p className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <Radio className="w-4 h-4" /> Broadcast to Nostr
              </p>
              <textarea
                value={broadcastTxt}
                onChange={e => setBroadcastTxt(e.target.value)}
                rows={9}
                data-testid="input-broadcast-text"
                className="w-full bg-black/40 border border-purple-500/15 rounded-lg text-white font-mono text-xs p-3 resize-none leading-relaxed outline-none focus:border-purple-500/40"
              />
              <Button
                onClick={() => broadcast.mutate()}
                disabled={broadcast.isPending || broadcastTxt.length < 10}
                data-testid="button-broadcast"
                className="w-full bg-purple-600 hover:bg-purple-700 font-bold gap-2"
              >
                {broadcast.isPending
                  ? <><Radio className="w-4 h-4 animate-pulse" /> Publishing…</>
                  : <><Radio className="w-4 h-4" /> Publish to 8 Nostr Relays</>}
              </Button>
              {broadcast.isSuccess && (
                <div className="space-y-2">
                  <p className="text-xs text-green-400 text-center font-semibold">✓ Published to {broadcast.data?.relays?.length ?? 8} Nostr relays</p>
                  {broadcastLinks && (
                    <div className="flex gap-2">
                      <a href={broadcastLinks.primal} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center text-xs bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/30 rounded-lg py-2 text-purple-300 hover:text-purple-200 transition-colors flex items-center justify-center gap-1.5">
                        <ExternalLink className="w-3 h-3" /> View on Primal
                      </a>
                      <a href={broadcastLinks.njump} target="_blank" rel="noopener noreferrer"
                        className="flex-1 text-center text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg py-2 text-white/50 hover:text-white/70 transition-colors flex items-center justify-center gap-1.5">
                        <ExternalLink className="w-3 h-3" /> njump.me
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Next step — Stake & Earn */}
            <Link href="/stake-earn">
              <div className="rounded-xl border border-purple-500/30 bg-purple-900/15 p-4 flex items-center gap-4 hover:bg-purple-900/25 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Put your sats to work →</div>
                  <div className="text-xs text-white/40 mt-0.5">Stake sats · earn NXT yield · auto-mint WNUSD stablecoin</div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <button
              onClick={() => { setStage("configure"); setStep2Data(null); setStep3Data(null); setBroadcastTxt(""); }}
              className="w-full text-xs text-white/20 hover:text-white/45 py-2 transition-colors"
            >
              ↩ Run pipeline again
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
