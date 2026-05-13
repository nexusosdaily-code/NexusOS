import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Zap, CheckCircle2, AlertTriangle,
  Copy, Check, Activity, Lock, Unlock
} from "lucide-react";
import {
  LambdaStateMachine, LedgerBlock,
  getBandColor, getBandName
} from "@/utils/lambda-state";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtEnergy(j: number): string {
  if (j === 0) return "0 J";
  return j.toExponential(4) + " J";
}
function fmtEv(ev: number): string {
  if (ev === 0) return "0 eV";
  return ev.toFixed(3) + " eV";
}
function fmtTs(ts: number): string {
  if (ts === 0) return "Genesis — T₀";
  return new Date(ts).toLocaleTimeString();
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Block card ────────────────────────────────────────────────────────────────
function BlockCard({ block }: { block: LedgerBlock }) {
  const [expanded, setExpanded] = useState(block.blockIndex === 0);
  const tx = block.transactions[0];
  const nm  = block.blockWavelengthAnchor;
  const col = getBandColor(nm);
  const band = getBandName(nm);

  return (
    <div
      className="rounded-lg border bg-slate-900/60 font-mono text-xs overflow-hidden"
      style={{ borderColor: col + "55" }}
      data-testid={`block-${block.blockIndex}`}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: col + "22", color: col }}
          >
            #{block.blockIndex}
          </span>
          {block.isValidated
            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
          <span className="text-slate-300 truncate max-w-[160px]">
            "{tx?.payload}"
          </span>
        </div>
        <div className="flex items-center gap-3 text-right flex-shrink-0">
          <span className="font-bold" style={{ color: col }}>{nm.toFixed(3)} nm</span>
          <span className="text-[10px] uppercase tracking-widest" style={{ color: col }}>{band}</span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-3" style={{ borderColor: col + "33" }}>
          {block.transactions.map((t, i) => (
            <div key={i} className="space-y-1.5">
              {/* txId */}
              <div className="flex items-center text-[10px] text-slate-500">
                <span className="w-28 flex-shrink-0 text-slate-600">TX ID</span>
                <span className="text-slate-400">{t.txId}</span>
                <CopyBtn text={t.txId} />
              </div>

              {/* timestamp */}
              <div className="flex items-center text-[10px] text-slate-500">
                <span className="w-28 flex-shrink-0 text-slate-600">Timestamp</span>
                <span className="text-slate-400">{fmtTs(t.timestamp)}</span>
              </div>

              {/* Ψ channel */}
              <div className="flex items-center text-[10px]">
                <span className="w-28 flex-shrink-0 text-slate-600">Ψ Channel</span>
                <span className="font-bold" style={{ color: col }}>{t.psiChannel}</span>
              </div>

              {/* λ */}
              <div className="flex items-center text-[10px] text-slate-500">
                <span className="w-28 flex-shrink-0 text-slate-600">Mean λ</span>
                <span className="text-slate-300">{t.spectralFingerprint.mean_lambda_nm.toFixed(3)} nm</span>
              </div>

              {/* Energy */}
              <div className="flex items-center text-[10px] text-slate-500">
                <span className="w-28 flex-shrink-0 text-slate-600">Energy</span>
                <span className="text-slate-300">
                  {fmtEnergy(t.spectralFingerprint.total_energy_joules)}
                  {" · "}
                  <span style={{ color: col }}>{fmtEv(t.spectralFingerprint.total_energy_ev)}</span>
                </span>
              </div>

              {/* Mass */}
              <div className="flex items-center text-[10px] text-slate-500">
                <span className="w-28 flex-shrink-0 text-slate-600">Λ mass</span>
                <span className="text-slate-300">
                  {t.spectralFingerprint.aggregate_mass_kg.toExponential(4)} kg
                </span>
              </div>

              {/* Stream length */}
              <div className="flex items-center text-[10px] text-slate-500">
                <span className="w-28 flex-shrink-0 text-slate-600">Stream len</span>
                <span className="text-slate-300">{t.spectralFingerprint.stream_length} chars</span>
              </div>
            </div>
          ))}

          {/* Chain link */}
          <div className="pt-1 border-t text-[10px] text-slate-600" style={{ borderColor: col + "22" }}>
            <span className="text-slate-700">← </span>
            {block.previousWavelengthHash}
          </div>

          {/* Validation note */}
          <div className={`text-[10px] ${block.isValidated ? "text-emerald-600" : "text-rose-500"}`}>
            {block.isValidated ? "✓" : "✗"} {block.validationNote}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PhotonicLedgerPage() {
  const machine = useRef<LambdaStateMachine>(new LambdaStateMachine());
  const [chain, setChain] = useState<LedgerBlock[]>(machine.current.getChain());
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [auditResult, setAuditResult] = useState<{ valid: boolean; faults: number[] } | null>(null);

  const commit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    try {
      const tx = machine.current.compileTransaction(text);
      machine.current.commitBlock([tx]);
      setChain(machine.current.getChain());
      setInput("");
      setError("");
      setAuditResult(null);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    }
  }, [input]);

  const audit = useCallback(() => {
    setAuditResult(machine.current.auditChain());
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
  };

  // Stats
  const totalBlocks = chain.length;
  const totalTx     = chain.reduce((s, b) => s + b.transactions.length, 0);
  const totalEnergy = chain.reduce(
    (s, b) => s + b.transactions.reduce(
      (ss, t) => ss + t.spectralFingerprint.total_energy_joules, 0
    ), 0
  );
  const invalidCount = chain.filter(b => !b.isValidated).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Spectrum bar */}
      <div className="h-1 w-full"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)" }} />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href="/" className="mt-1 text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Photonic Distributed Ledger</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Lambda State Machine v7.1 · WNSP-CE · AGPL-3.0 · Zero external deps
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Blocks",   value: totalBlocks,                     color: "#a78bfa" },
            { label: "Tx",       value: totalTx,                          color: "#22d3ee" },
            { label: "Energy",   value: totalEnergy.toExponential(3)+" J", color: "#16a34a" },
            { label: "Invalid",  value: invalidCount,                     color: invalidCount > 0 ? "#f87171" : "#4ade80" },
          ].map(s => (
            <div key={s.label}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</div>
              <div className="text-sm font-mono font-bold mt-0.5" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            New payload — press Enter or click Commit
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => { setInput(e.target.value); setError(""); }}
              onKeyDown={onKey}
              placeholder="Enter payload string…"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              data-testid="input-payload"
            />
            <button
              onClick={commit}
              disabled={!input.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              data-testid="btn-commit"
            >
              <Zap className="w-3.5 h-3.5" /> Commit
            </button>
            <button
              onClick={audit}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
              data-testid="btn-audit"
              title="Audit chain integrity"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-400 font-mono">{error}</p>
          )}
          {auditResult && (
            <div className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg border ${
              auditResult.valid
                ? "border-emerald-800 bg-emerald-950/40 text-emerald-400"
                : "border-rose-800 bg-rose-950/40 text-rose-400"
            }`}>
              {auditResult.valid
                ? <><Lock className="w-3.5 h-3.5" /> Chain intact — all block hashes verified</>
                : <><Unlock className="w-3.5 h-3.5" /> Chain fault at block(s): {auditResult.faults.join(", ")}</>}
            </div>
          )}
        </div>

        {/* Chain */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Committed block sequence
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              newest first
            </span>
          </div>
          <div className="space-y-2">
            {[...chain].reverse().map(block => (
              <BlockCard key={block.blockIndex} block={block} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
