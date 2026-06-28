import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import {
  Layers, Zap, Send, Clock, ChevronDown, ChevronRight,
  Link as LinkIcon, Globe2, Hash, Radio, ArrowRight, ExternalLink,
  Activity, RefreshCw
} from "lucide-react";

const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#8b00ff", AUTH: "#2563eb", STREAM: "#06b6d4",
  CORE: "#16a34a", UI: "#ca8a04", EVENT: "#ea580c", STORAGE: "#dc2626",
  KERNEL: "#2563eb", USER: "#16a34a", GUEST: "#dc2626",
};
const bandColor = (b: string) => BAND_COLOR[b] ?? "#94a3b8";

function bandFromNm(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 490) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "CORE";
  if (nm < 590) return "UI";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}

function SpectrumBar() {
  return (
    <div className="h-1 w-full rounded"
      style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
  );
}

function PsiTag({ psi, band }: { psi: string; band: string }) {
  const bc = bandColor(band);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs"
      style={{ background: `${bc}15`, color: bc, border: `1px solid ${bc}30` }}>
      {psi}
    </span>
  );
}

function GenesisBadge() {
  return (
    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider"
      style={{ background: "#2563eb20", color: "#2563eb", border: "1px solid #2563eb40" }}>
      Genesis
    </span>
  );
}

// ── Animated chain visualiser ─────────────────────────────────────
function ChainVisualiser({ blocks }: { blocks: any[] }) {
  const reversed = [...blocks].reverse().slice(0, 8);
  if (reversed.length === 0) return null;
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max">
        {reversed.map((block, i) => {
          const bc = bandColor(block.band);
          const isLatest = i === 0;
          return (
            <div key={block.id} className="flex items-center">
              {i > 0 && (
                <div className="flex items-center">
                  <div className="h-px w-6 bg-slate-700" />
                  <ArrowRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                </div>
              )}
              <div className="flex flex-col items-center gap-1 px-2">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all"
                  style={{
                    background: `${bc}15`,
                    border: `2px solid ${isLatest ? bc : bc + "60"}`,
                    color: bc,
                    boxShadow: isLatest ? `0 0 16px ${bc}40` : "none",
                  }}>
                  #{block.blockNumber}
                </div>
                <div className="text-xs font-mono text-center" style={{ color: bc }}>
                  {parseFloat(block.wavelengthNm).toFixed(0)}nm
                </div>
                <div className="text-xs text-slate-600 text-center" style={{ fontSize: "9px" }}>
                  {block.band}
                </div>
              </div>
            </div>
          );
        })}
        {blocks.length > 8 && (
          <div className="text-xs text-slate-600 font-mono pl-2">+{blocks.length - 8} more</div>
        )}
      </div>
    </div>
  );
}

// ── Block card ────────────────────────────────────────────────────
function BlockCard({ block, isLatest }: { block: any; isLatest: boolean }) {
  const [open, setOpen] = useState(block.blockNumber === 0);
  const bc   = bandColor(block.band);
  const wl   = parseFloat(block.wavelengthNm).toFixed(1);
  const e    = parseFloat(block.energyJoules).toExponential(3);
  const date = new Date(block.minedAt).toLocaleString();
  const isGenesis = block.blockNumber === 0;

  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{ borderColor: isLatest ? `${bc}60` : "#1e293b", background: isLatest ? `${bc}06` : "#0f172a" }}>
      <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
        data-testid={`block-header-${block.blockNumber}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-sm font-bold"
          style={{ background: `${bc}20`, color: bc }}>
          {block.blockNumber}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-200">{block.band} band</span>
            {isGenesis && <GenesisBadge />}
            {isLatest && !isGenesis && (
              <span className="text-xs text-green-400 font-mono animate-pulse">latest</span>
            )}
            <PsiTag psi={block.psiChannel} band={block.band} />
          </div>
          <div className="text-xs text-slate-500 font-mono mt-0.5">λ = {wl} nm · {e} J · {date}</div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
      </button>

      {block.previousPsi && (
        <div className="px-4 py-1 flex items-center gap-2 text-xs font-mono text-slate-600 border-t border-slate-800/40">
          <LinkIcon className="w-3 h-3" />
          <span>linked to</span>
          <PsiTag psi={block.previousPsi} band="CORE" />
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800/40 space-y-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Block position on spectrum</div>
            <div className="relative h-4">
              <div className="absolute inset-0 rounded"
                style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
              <div className="absolute top-0 bottom-0 w-1 bg-white rounded shadow-lg"
                style={{ left: `${((parseFloat(block.wavelengthNm) - 380) / 400) * 100}%`, transform: "translateX(-50%)" }} />
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-700 mt-0.5">
              <span>380nm</span><span>580nm</span><span>780nm</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Wavelength",  value: `${wl} nm`,          color: bc },
              { label: "Ψ Channel",   value: block.psiChannel,     color: bc },
              { label: "Energy",      value: `${e} J`,             color: null },
              { label: "WDM / OAM",   value: `${block.wdm} / ${block.oam} ${block.polarisation}`, color: null },
              { label: "Band",        value: block.band,           color: bc },
              { label: "NXT Reward",  value: `${parseFloat(block.nxtReward).toFixed(2)} NXT`, color: "#16a34a" },
              { label: "Transactions",value: String(block.txCount), color: null },
              { label: "Miner",       value: block.minerAddress ?? "—", color: null },
            ].map((m, i) => (
              <div key={i} className="p-2 rounded bg-slate-900 space-y-0.5">
                <div className="text-xs text-slate-600">{m.label}</div>
                <div className="text-xs font-mono truncate" style={{ color: m.color ?? "#e2e8f0" }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-500 mb-1">Block content</div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">{block.content}</p>
          </div>

          {/* Cross-link to Agent Bus */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <Radio className="w-3 h-3 text-slate-600" />
            <span className="text-slate-600">Block minted at</span>
            <PsiTag psi={block.psiChannel} band={block.band} />
            <Link href="/agent-bus" className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
              <ExternalLink className="w-3 h-3" /> route on bus
            </Link>
          </div>

          {isGenesis && (
            <div className="p-3 rounded border text-xs font-mono leading-relaxed"
              style={{ borderColor: "#2563eb30", background: "#2563eb08", color: "#93c5fd" }}>
              This is block #0 — the genesis block of the first wavelength blockchain.
              Its identity is not a SHA256 hash. It is a physical address in the
              electromagnetic spectrum: {block.psiChannel} at {wl} nm.
              All subsequent blocks link back to this Ψ channel.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chain tab ─────────────────────────────────────────────────────
function ChainTab({ blocks }: { blocks: any[] }) {
  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <div className="text-center py-12 text-slate-600 font-mono text-sm">Loading chain…</div>
      ) : (
        [...blocks].reverse().map((block, i) => (
          <BlockCard key={block.id} block={block} isLatest={i === 0} />
        ))
      )}
    </div>
  );
}

// ── Mine tab ─────────────────────────────────────────────────────
function MineTab({ onMined }: { onMined?: () => void }) {
  const qc = useQueryClient();
  const [content, setContent]     = useState("");
  const [miner,   setMiner]       = useState("");
  const [result,  setResult]      = useState<any>(null);
  const [sendToBus, setSendToBus] = useState(false);
  const [busResult, setBusResult] = useState<any>(null);

  const PRESETS = [
    "NexusOS kernel event bus register agent auth_gateway spectral band SYSTEM authority",
    "Wavelength blockchain block two photonic ledger Lambda equals hf over c squared",
    "K1 energy infrastructure orbital solar array resonance harvester fusion photonics",
    "Spectral database content addressed storage wavelength is the address AGPL-3.0",
    "NXT token transfer 500 units wallet spectral authority USER band confirmed",
    "Agent message dispatched os_kernel to auth_gateway verify session TOKEN",
  ];

  const mineMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/blockchain/mine", { content, minerAddress: miner || undefined })
        .then(r => r.json()),
    onSuccess: async (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["/api/blockchain/chain"] });
      onMined?.();
      // Cross-link: also announce to agent bus if toggled
      if (sendToBus && data?.block) {
        try {
          const busRes = await apiRequest("POST", "/api/agent-bus/send", {
            src: "os_kernel",
            dst: "bus_router",
            payload: `BLOCK_MINED #${data.block.blockNumber} ${data.block.psiChannel} ${data.block.band} λ=${parseFloat(data.block.wavelengthNm).toFixed(1)}nm`,
            priority: 3,
            msgType: "EVENT",
          });
          setBusResult(await busRes.json());
        } catch {}
      }
    },
  });

  const bc = result?.block ? bandColor(result.block.band) : "#06b6d4";

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Mining on the wavelength blockchain means encoding your block content
        through CE→SE to derive its physical Ψ channel. No hash function.
        No proof of work. The physics derives the address.
      </p>

      <div className="space-y-2">
        <Label className="text-xs text-slate-400">Block content</Label>
        <Textarea value={content} onChange={e => setContent(e.target.value)}
          className="bg-slate-800 border-slate-600 text-slate-200 text-sm min-h-20 font-mono"
          placeholder="Describe what this block represents…"
          data-testid="input-block-content" />
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setContent(p); setResult(null); setBusResult(null); }}
              className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono"
              data-testid={`preset-mine-${i}`}>
              preset {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Miner address (optional)</Label>
          <Input value={miner} onChange={e => setMiner(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            placeholder="your address" data-testid="input-miner" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Cross-link to Agent Bus</Label>
          <label className="flex items-center gap-2 cursor-pointer h-9">
            <input type="checkbox" checked={sendToBus} onChange={e => setSendToBus(e.target.checked)}
              className="rounded" data-testid="check-bus-link" />
            <span className="text-xs text-slate-400">Announce mined block to bus</span>
          </label>
        </div>
      </div>

      <Button className="w-full md:w-auto" onClick={() => mineMutation.mutate()}
        disabled={mineMutation.isPending || !content}
        data-testid="btn-mine">
        <Zap className="w-3 h-3 mr-1" />
        {mineMutation.isPending ? "Encoding & Mining…" : "Mine Block"}
      </Button>

      {result?.success && (
        <div className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: `${bc}50`, background: `${bc}08` }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: bc }} />
            <span className="font-bold text-slate-100">Block #{result.block.blockNumber} mined</span>
            <PsiTag psi={result.block.psiChannel} band={result.block.band} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            {[
              { label: "Wavelength",  value: `${parseFloat(result.block.wavelengthNm).toFixed(1)} nm`, color: bc },
              { label: "Energy",      value: `${parseFloat(result.block.energyJoules).toExponential(2)} J` },
              { label: "NXT Reward",  value: "1.00000000 NXT", color: "#16a34a" },
              { label: "Linked to",   value: result.block.previousPsi ?? "genesis" },
              { label: "Band",        value: result.block.band, color: bc },
              { label: "Txs sealed",  value: String(result.confirmedTxs) },
            ].map((m, i) => (
              <div key={i} className="p-2 bg-slate-900 rounded">
                <div className="text-slate-500 mb-0.5">{m.label}</div>
                <div style={{ color: m.color ?? "#e2e8f0" }}>{m.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs font-mono text-slate-500">
            Block identity derived from physics — not assigned by an algorithm.
            This block lives permanently at {result.block.psiChannel}.
          </p>
          {busResult?.success && (
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Radio className="w-3 h-3" />
              <span>Bus notified: {busResult.route}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Transact tab ──────────────────────────────────────────────────
function TransactTab() {
  const qc = useQueryClient();
  const [from,   setFrom]   = useState("");
  const [to,     setTo]     = useState("");
  const [amount, setAmount] = useState("1.0");
  const [memo,   setMemo]   = useState("");
  const [result, setResult] = useState<any>(null);

  const PRESETS = [
    { from: "nexus_wallet_01", to: "nexus_wallet_02", amount: "5.0", memo: "K1 energy node subscription payment" },
    { from: "auth_gateway",    to: "os_kernel",        amount: "0.1", memo: "session authority verification fee" },
    { from: "spectral_store",  to: "nexus_archive",    amount: "0.5", memo: "lambda record storage fee" },
  ];

  const txMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/blockchain/transact", {
        fromAddress: from, toAddress: to,
        amountNxt: parseFloat(amount), memo: memo || undefined,
      }).then(r => r.json()),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["/api/blockchain/mempool"] });
    },
  });

  const bc = result?.wavelengthNm
    ? bandColor(bandFromNm(parseFloat(result.wavelengthNm)))
    : "#06b6d4";

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Transaction fees are derived from the memo's spectral encoding — E=hf
        of the instruction determines the cost. Longer, more complex memos cost
        more energy, which costs more NXT. Physics prices the transaction.
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p, i) => (
          <button key={i}
            onClick={() => { setFrom(p.from); setTo(p.to); setAmount(p.amount); setMemo(p.memo); setResult(null); }}
            className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono"
            data-testid={`preset-tx-${i}`}>
            preset {i + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">From address</Label>
          <Input value={from} onChange={e => setFrom(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            placeholder="sender address" data-testid="input-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">To address</Label>
          <Input value={to} onChange={e => setTo(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            placeholder="recipient address" data-testid="input-to" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Amount (NXT)</Label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-amount" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Memo — encodes to set the fee</Label>
          <Input value={memo} onChange={e => setMemo(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            placeholder="transaction purpose (optional)"
            data-testid="input-memo" />
        </div>
      </div>

      <Button onClick={() => txMutation.mutate()}
        disabled={txMutation.isPending || !from || !to || !amount}
        data-testid="btn-transact">
        <Send className="w-3 h-3 mr-1" />
        {txMutation.isPending ? "Encoding fee…" : "Submit to Mempool"}
      </Button>

      {result?.success && (
        <div className="rounded-xl border p-4 space-y-2"
          style={{ borderColor: `${bc}50`, background: `${bc}08` }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: bc }} />
            <span className="text-sm font-semibold text-slate-200">Transaction in mempool</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
            {[
              { label: "Status",    value: "PENDING", color: "#ca8a04" },
              { label: "Fee",       value: `${result.feePaid} NXT` },
              { label: "Channel",   value: result.psiChannel ?? "—", color: bc },
              { label: "Wavelength",value: result.wavelengthNm ? `${parseFloat(result.wavelengthNm).toFixed(1)} nm` : "—", color: bc },
            ].map((m, i) => (
              <div key={i} className="p-2 bg-slate-900 rounded">
                <div className="text-slate-500 mb-0.5">{m.label}</div>
                <div style={{ color: m.color ?? "#e2e8f0" }}>{m.value}</div>
              </div>
            ))}
          </div>
          <p className="text-xs font-mono text-slate-600">
            Mine a new block to confirm this transaction and seal it into the chain.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Mempool tab ────────────────────────────────────────────────────
function MempoolTab({ onMinePending }: { onMinePending: (memo: string) => void }) {
  const { data, refetch } = useQuery<any>({
    queryKey: ["/api/blockchain/mempool"],
    refetchInterval: 4000,
  });
  const txs: any[] = data?.txs ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          Pending transactions waiting to be sealed into the next block.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">{txs.length} pending</span>
          <button onClick={() => refetch()} className="text-slate-600 hover:text-slate-400 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="text-center py-12 text-slate-700 font-mono text-sm">
          Mempool is empty — submit a transaction to add it here.
        </div>
      ) : (
        txs.map((tx, i) => {
          const bc = tx.wavelengthNm ? bandColor(bandFromNm(parseFloat(tx.wavelengthNm))) : "#475569";
          return (
            <div key={i} className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 space-y-2"
              data-testid={`mempool-tx-${i}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <Clock className="w-3 h-3 text-yellow-500 animate-pulse" />
                  <span className="text-yellow-500 font-semibold">PENDING</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{parseFloat(tx.amountNxt).toFixed(8)} NXT</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-500">fee {parseFloat(tx.feePaid).toFixed(8)} NXT</span>
                </div>
                <button
                  onClick={() => onMinePending(tx.memo ?? `Seal tx ${tx.fromAddress}→${tx.toAddress}`)}
                  className="text-xs font-mono px-2 py-0.5 rounded border transition-colors"
                  style={{ borderColor: `${bc}40`, color: bc, background: `${bc}10` }}
                  title="Mine a block to confirm this tx">
                  <Zap className="w-3 h-3 inline mr-1" />seal
                </button>
              </div>
              <div className="flex gap-4 text-xs font-mono text-slate-500">
                <span><span className="text-slate-600">from</span> {tx.fromAddress}</span>
                <span>→</span>
                <span><span className="text-slate-600">to</span> {tx.toAddress}</span>
              </div>
              {tx.memo && <p className="text-xs text-slate-400 italic">"{tx.memo}"</p>}
              {tx.wavelengthNm && (
                <div className="flex items-center gap-2 text-xs font-mono" style={{ color: bc }}>
                  <span>λ = {parseFloat(tx.wavelengthNm).toFixed(1)} nm</span>
                  {tx.psiChannel && <span>· {tx.psiChannel}</span>}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function BlockchainPage() {
  const qc = useQueryClient();
  const [activeTab,  setActiveTab]  = useState("chain");
  const [minePreset, setMinePreset] = useState("");

  const { data } = useQuery<any>({ queryKey: ["/api/blockchain/chain"], refetchInterval: 5000 });
  const { data: busStatus } = useQuery<any>({ queryKey: ["/api/agent-bus/status"], refetchInterval: 5000 });

  const blocks: any[] = data?.blocks ?? [];
  const height  = blocks.length;
  const latest  = blocks.at(-1);
  const genesis = blocks.at(0);
  const busQueued = busStatus?.queued ?? 0;

  // Computed live from chain
  const totalVerifiedRecords = blocks.reduce((sum: number, b: any) => sum + (parseInt(b.txCount) || 0), 0);
  const breakthroughBlock = blocks.find((b: any) =>
    typeof b.content === "string" && b.content.includes("BREAKTHROUGH_PROOF")
  );

  const handleMinePreset = (content: string) => {
    setMinePreset(content);
    setActiveTab("mine");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#2563eb,#8b00ff)" }}>
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Wavelength Blockchain</h1>
            <p className="text-slate-400 text-sm">
              First photonic ledger — block identity is a Ψ channel, not a hash
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs font-mono text-slate-500">
            <Link href="/agent-bus" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
              <Radio className="w-3 h-3" />
              <span className={busQueued > 0 ? "text-yellow-400" : ""}>
                {busQueued > 0 ? `${busQueued} queued` : "Agent Bus"}
              </span>
            </Link>
            <div className="text-right space-y-0.5">
              <div>Height: <span className="text-slate-300">{height}</span></div>
              {latest && <div>Latest: <span style={{ color: bandColor(latest.band) }}>{latest.psiChannel}</span></div>}
            </div>
          </div>
        </div>

        <SpectrumBar />

        {/* Chain visualiser */}
        {blocks.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-slate-600 font-mono mb-2">Chain topology (most recent first)</div>
            <ChainVisualiser blocks={blocks} />
          </div>
        )}

        {/* Stats row */}
        {genesis && (
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { label: "Genesis Ψ",         value: genesis.psiChannel,                                    color: bandColor("AUTH") },
              { label: "Genesis λ",         value: `${parseFloat(genesis.wavelengthNm).toFixed(1)} nm`,   color: bandColor("AUTH") },
              { label: "Chain height",      value: String(height),                                         color: "#e2e8f0" },
              { label: "Records verified",  value: totalVerifiedRecords > 0 ? String(totalVerifiedRecords) : "0", color: "#16a34a" },
              { label: "Latest Ψ",          value: latest?.psiChannel ?? "—",                             color: latest ? bandColor(latest.band) : "#64748b" },
              { label: "AGPL-3.0",          value: "open source",                                          color: "#16a34a" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-600">{s.label}:</span>
                <span style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Breakthrough block callout */}
        {breakthroughBlock && (
          <div className="mt-4 rounded-xl border px-4 py-3 flex flex-wrap items-center gap-4"
            style={{ borderColor: "#ca8a0460", background: "rgba(202,138,4,0.06)" }}>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Breakthrough Proof</span>
            </div>
            <div className="text-xs font-mono text-slate-300 flex-1 min-w-0">
              <span className="text-amber-400">Block #{breakthroughBlock.blockNumber}</span>
              {" · "}
              <span style={{ color: bandColor(breakthroughBlock.band) }}>{breakthroughBlock.psiChannel}</span>
              {" · "}
              <span className="text-slate-400">{parseFloat(breakthroughBlock.wavelengthNm).toFixed(2)} nm</span>
              {" · "}
              <span className="text-slate-300">First video in spectrum — "angry birds" 25MB encoded at Λ=hf/c²</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono text-slate-500">
              <Hash className="w-3 h-3" />
              <span>{breakthroughBlock.txCount} tx confirmed</span>
            </div>
          </div>
        )}
      </div>

      {/* Genesis Block Hero */}
      {genesis && (
        <div className="mb-6 rounded-2xl border overflow-hidden relative"
          style={{ borderColor: "#2563eb50", background: "linear-gradient(135deg,#0f172a,#1e1b4b)" }}>
          {/* animated top line */}
          <div className="h-0.5 w-full"
            style={{ background: "linear-gradient(90deg,transparent,#2563eb,#8b00ff,#2563eb,transparent)" }} />

          <div className="p-5 grid md:grid-cols-2 gap-4">
            {/* Left: identity */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-lg flex-shrink-0"
                  style={{ background: "#2563eb20", border: "2px solid #2563eb60", color: "#2563eb",
                    boxShadow: "0 0 20px #2563eb40" }}>
                  0
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">Genesis Block</span>
                    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse"
                      style={{ background: "#2563eb20", color: "#60a5fa", border: "1px solid #2563eb40" }}>
                      Block #0
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Foundation of the wavelength blockchain
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Ψ Channel",   value: genesis.psiChannel,                                   color: "#2563eb" },
                  { label: "Wavelength",  value: `${parseFloat(genesis.wavelengthNm).toFixed(2)} nm`,  color: "#60a5fa" },
                  { label: "Band",        value: genesis.band,                                          color: "#2563eb" },
                  { label: "Coinbase",    value: `${(parseFloat(genesis.nxtReward)/1e6).toFixed(0)}M NXT`, color: "#16a34a" },
                ].map((m, i) => (
                  <div key={i} className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-xs text-slate-600">{m.label}</div>
                    <div className="text-xs font-mono font-semibold" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: meaning */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What makes this different</div>
              <div className="space-y-1.5 text-xs font-mono text-slate-400 leading-relaxed">
                {[
                  { icon: "λ", text: "Block identity is a physical wavelength, not a SHA-256 hash" },
                  { icon: "Ψ", text: "Every block links to its predecessor via Ψ channel — not a merkle root" },
                  { icon: "E", text: "Transaction fees derived from E=hf — physics prices the cost, not policy" },
                  { icon: "Λ", text: "Content lives at its spectral address — encoded by Λ=hf/c²" },
                ].map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: "#2563eb15", color: "#2563eb" }}>{p.icon}</span>
                    <span>{p.text}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 text-xs font-mono text-slate-600 italic">
                Mined by: {genesis.minerAddress} · AGPL-3.0 licensed
              </div>
            </div>
          </div>

          {/* bottom shimmer line */}
          <div className="h-px w-full" style={{ background: "#2563eb20" }} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="chain"    data-testid="tab-chain">
            <Layers className="w-3 h-3 mr-1" /> Chain ({height})
          </TabsTrigger>
          <TabsTrigger value="mine"     data-testid="tab-mine">
            <Zap className="w-3 h-3 mr-1" /> Mine
          </TabsTrigger>
          <TabsTrigger value="transact" data-testid="tab-transact">
            <Send className="w-3 h-3 mr-1" /> Transact
          </TabsTrigger>
          <TabsTrigger value="mempool"  data-testid="tab-mempool">
            <Clock className="w-3 h-3 mr-1" /> Mempool
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chain">
          <h2 className="text-sm font-semibold text-blue-300 mb-3">
            Each block linked by its predecessor's Ψ channel — not a hash
          </h2>
          <ChainTab blocks={blocks} />
        </TabsContent>

        <TabsContent value="mine">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Mine by encoding — CE→SE derives the block's physical address
          </h2>
          <MineTab
            onMined={() => qc.invalidateQueries({ queryKey: ["/api/blockchain/chain"] })}
          />
        </TabsContent>

        <TabsContent value="transact">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Transaction fees priced by E=hf — the memo's wavelength sets the cost
          </h2>
          <TransactTab />
        </TabsContent>

        <TabsContent value="mempool">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Pending transactions — sealed into the chain when a block is mined
          </h2>
          <MempoolTab onMinePending={handleMinePreset} />
        </TabsContent>
      </Tabs>

      <div className="mt-8 pt-6 border-t border-slate-800">
        <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Related resources</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/nexus-explorer">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-500/20 bg-blue-500/5 text-blue-300 text-xs hover:bg-blue-500/10 hover:border-blue-500/30 transition-all cursor-pointer">
              <Globe2 className="w-3 h-3" /> Nexus Explorer
            </span>
          </Link>
          <Link href="/nexus-analytics">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 text-xs hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
              <Activity className="w-3 h-3" /> Nexus Analytics
            </span>
          </Link>
          <Link href="/psi-board">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 text-violet-300 text-xs hover:bg-violet-500/10 hover:border-violet-500/30 transition-all cursor-pointer">
              <Radio className="w-3 h-3" /> Ψ Board
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
