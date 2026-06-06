import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowUpDown, Copy, CheckCircle2, ExternalLink,
  Bitcoin, Zap, Clock, ArrowRight, Info,
} from "lucide-react";

const SERVICE_WALLET = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";
const RUNE_NAME = "NEXUS•WAVELENGTH";

type Dir = "nxt_to_rune" | "rune_to_nxt";

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

export default function RuneSwapPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dir, setDir] = useState<Dir>("rune_to_nxt");
  const [runeAmt, setRuneAmt] = useState("1000");
  const [btcAddr, setBtcAddr] = useState("");
  const [btcTxid, setBtcTxid] = useState("");

  const { data: rate } = useQuery<any>({ queryKey: ["/api/rune-swap/rate"] });
  const { data: wallet } = useQuery<any>({ queryKey: ["/api/wallet"], refetchInterval: 15000 });
  const { data: history = [], isLoading: histLoading } = useQuery<any[]>({
    queryKey: ["/api/rune-swap/history"],
    refetchInterval: 30000,
  });

  const runes = parseInt(runeAmt) || 0;
  const nxtVal = runes * (rate?.rate ?? 1);
  const nxtBal = parseFloat(wallet?.wallet?.balance ?? "0");

  const swapMut = useMutation({
    mutationFn: async () => {
      const endpoint = dir === "nxt_to_rune"
        ? "/api/rune-swap/nxt-to-rune"
        : "/api/rune-swap/rune-to-nxt";
      const body = dir === "nxt_to_rune"
        ? { runeAmount: runes, btcAddress: btcAddr }
        : { runeAmount: runes, btcTxid, btcAddress: btcAddr };
      return apiRequest("POST", endpoint, body);
    },
    onSuccess: (data: any) => {
      toast({ title: "Swap submitted!", description: data.message });
      qc.invalidateQueries({ queryKey: ["/api/rune-swap/history"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      setBtcTxid("");
    },
    onError: (e: any) => toast({ title: "Swap failed", description: e.message, variant: "destructive" }),
  });

  const canSwap = dir === "nxt_to_rune"
    ? runes >= 100 && btcAddr.length > 10 && nxtBal >= nxtVal
    : runes >= 100 && btcTxid.length >= 30;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
              <Bitcoin className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold">NXWV ↔ NXT Bridge</h1>
              <p className="text-white/40 text-xs">NEXUS•WAVELENGTH Rune ↔ NXT Token</p>
            </div>
          </div>
        </div>

        {/* Rate card */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="font-mono text-sm flex items-center gap-3">
            <span className="text-purple-300 font-bold">1 NXWV</span>
            <span className="text-white/30">=</span>
            <span className="text-orange-300 font-bold">1 NXT</span>
            <span className="text-white/20 text-xs">· Physics parity</span>
          </div>
          <div className="flex gap-3 text-xs text-white/40">
            <span>Min: 100</span>
            <span>Max: 100,000</span>
          </div>
        </div>

        {/* Direction toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          {(["rune_to_nxt", "nxt_to_rune"] as Dir[]).map(d => (
            <button
              key={d}
              onClick={() => setDir(d)}
              data-testid={`dir-${d}`}
              className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                dir === d
                  ? "bg-purple-600 text-white shadow"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {d === "rune_to_nxt"
                ? <span className="flex items-center justify-center gap-2"><Bitcoin className="w-3.5 h-3.5" />NXWV → NXT</span>
                : <span className="flex items-center justify-center gap-2"><Zap className="w-3.5 h-3.5" />NXT → NXWV</span>
              }
            </button>
          ))}
        </div>

        {/* Swap form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">

          {/* Amount */}
          <div>
            <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
              {dir === "rune_to_nxt" ? "NEXUS•WAVELENGTH to send" : "NEXUS•WAVELENGTH to receive"}
            </label>
            <div className="relative">
              <Input
                type="number"
                value={runeAmt}
                onChange={e => setRuneAmt(e.target.value)}
                min={100}
                step={100}
                data-testid="input-rune-amount"
                className="bg-black/30 border-white/10 text-white font-mono pr-20"
                placeholder="1000"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-300 font-mono">NXWV</span>
            </div>
            <p className="text-xs text-white/30 mt-1">= {nxtVal.toLocaleString()} NXT</p>
          </div>

          {/* NXT → RUNE: need BTC address for delivery */}
          {dir === "nxt_to_rune" && (
            <div>
              <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                Your Bitcoin address (Rune delivery)
              </label>
              <Input
                value={btcAddr}
                onChange={e => setBtcAddr(e.target.value)}
                data-testid="input-btc-address"
                className="bg-black/30 border-white/10 text-white font-mono text-xs"
                placeholder="bc1p… or bc1q…"
              />
              <p className="text-xs text-white/30 mt-1">
                NXT goes to Orbital Treasury · {RUNE_NAME} sent to your BTC address from service wallet
              </p>
            </div>
          )}

          {/* RUNE → NXT: send to service wallet, paste txid */}
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
                <a
                  href={`https://unisat.io/address/${SERVICE_WALLET}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                >
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
                  <a
                    href={`https://mempool.space/tx/${btcTxid}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Verify on mempool.space
                  </a>
                )}
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-widest mb-1.5 block">
                  Your Bitcoin address (optional — for records)
                </label>
                <Input
                  value={btcAddr}
                  onChange={e => setBtcAddr(e.target.value)}
                  data-testid="input-btc-address-optional"
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                  placeholder="bc1p… (optional)"
                />
              </div>
            </div>
          )}

          {/* Balance */}
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
            className="w-full bg-purple-600 hover:bg-purple-700 gap-2 font-semibold"
          >
            {swapMut.isPending ? (
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Processing…</span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                {dir === "rune_to_nxt"
                  ? `Credit ${nxtVal.toLocaleString()} NXT`
                  : `Swap ${runes.toLocaleString()} NXWV → NXT`
                }
              </span>
            )}
          </Button>

          {!canSwap && runes > 0 && (
            <p className="text-xs text-red-400 text-center">
              {dir === "nxt_to_rune" && nxtBal < nxtVal
                ? `Need ${nxtVal} NXT — you have ${nxtBal.toFixed(2)}`
                : dir === "nxt_to_rune" && !btcAddr
                ? "Enter a Bitcoin address for delivery"
                : dir === "rune_to_nxt" && btcTxid.length < 30
                ? "Paste the Bitcoin transaction ID from your Unisat send"
                : runes < 100
                ? "Minimum 100 NEXUS•WAVELENGTH"
                : ""}
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2">
            <Info className="w-4 h-4" /> How the bridge works
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-white/50 leading-relaxed">
            <div>
              <p className="text-purple-300 font-semibold mb-1">NXWV → NXT</p>
              <p>1. Send NEXUS•WAVELENGTH to the service wallet on Unisat</p>
              <p>2. Paste the Bitcoin TXID above</p>
              <p>3. NXT is credited to your NexusOS wallet immediately</p>
            </div>
            <div>
              <p className="text-orange-300 font-semibold mb-1">NXT → NXWV</p>
              <p>1. Enter how many Runes you want + your BTC address</p>
              <p>2. NXT moves to Orbital Treasury (never burned)</p>
              <p>3. NEXUS•WAVELENGTH sent to your BTC address from service wallet</p>
            </div>
          </div>
          <p className="text-[11px] text-white/20">
            Rate: 1 NXWV = 1 NXT · Physics parity · NXT is never destroyed — always redirected to Orbital Treasury
          </p>
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
              {(history as any[]).map((s: any) => (
                <div key={s.id} data-testid={`swap-row-${s.id}`}
                  className="rounded-xl border border-white/8 bg-white/3 p-4 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      s.direction === "rune_to_nxt" ? "bg-purple-500/20" : "bg-orange-500/20"
                    }`}>
                      {s.direction === "rune_to_nxt" ? "💜" : "🟠"}
                    </div>
                    <div>
                      <p className="text-sm font-mono text-white">
                        {s.direction === "rune_to_nxt"
                          ? `${parseInt(s.runeAmount).toLocaleString()} NXWV → ${parseFloat(s.nxtAmount).toLocaleString()} NXT`
                          : `${parseFloat(s.nxtAmount).toLocaleString()} NXT → ${parseInt(s.runeAmount).toLocaleString()} NXWV`
                        }
                      </p>
                      <p className="text-[11px] text-white/30 font-mono">
                        #{s.id} · {new Date(s.createdAt).toLocaleDateString()}
                        {s.btcTxid && <> · <a href={`https://mempool.space/tx/${s.btcTxid}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">{s.btcTxid.slice(0, 10)}…</a></>}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
