/**
 * P2P Aligned Sync Terminal — NexusOS
 * Two in-browser Lambda State Machine nodes wired over a simulated P2P channel.
 *
 * Fixes vs original:
 *  - useRef for state machines (not useMemo — they are mutable objects)
 *  - useEffect runs once on mount (empty deps array)
 *  - Enter key commits the transaction
 *  - Band colours displayed on every block row
 *  - Ψ channel shown per block
 *  - data-testid on all interactive / display elements
 *  - Unused PhotonicTransaction import removed
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Zap, Radio, CheckCircle2, AlertTriangle } from "lucide-react";
import { LambdaStateMachine, LedgerBlock, getBandColor, getBandName } from "@/utils/lambda-state";
import { P2PSyncEngine } from "@/utils/p2p-sync-engine";

// ── Block row ─────────────────────────────────────────────────────────────────
function BlockRow({ block }: { block: LedgerBlock }) {
  const nm  = block.blockWavelengthAnchor;
  const col = getBandColor(nm);
  const band = getBandName(nm);
  const tx = block.transactions[0];

  return (
    <div
      className="p-2 rounded border bg-slate-950 flex justify-between items-center gap-2"
      style={{ borderColor: col + "44" }}
      data-testid={`block-row-${block.blockIndex}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {block.isValidated
          ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
          : <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />}
        <span className="text-[10px] text-slate-500 flex-shrink-0">#{block.blockIndex}</span>
        {tx && (
          <span className="text-[10px] text-slate-400 truncate">"{tx.payload}"</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 text-right">
        {tx && (
          <span className="text-[9px] text-slate-600 font-mono hidden sm:inline">{tx.psiChannel}</span>
        )}
        <span className="text-[10px] font-bold font-mono" style={{ color: col }}>
          {nm.toFixed(3)} nm
        </span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest"
          style={{ background: col + "22", color: col }}
        >
          {band}
        </span>
      </div>
    </div>
  );
}

// ── Node panel ────────────────────────────────────────────────────────────────
function NodePanel({
  label,
  accent,
  chain,
  nodeId,
}: {
  label: string;
  accent: string;
  chain: LedgerBlock[];
  nodeId: string;
}) {
  return (
    <div
      className="p-4 bg-slate-900 rounded-lg border space-y-3"
      style={{ borderColor: accent + "44" }}
      data-testid={`node-panel-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: accent + "33" }}>
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5" style={{ color: accent }} />
          <span className="text-xs font-bold font-mono" style={{ color: accent }}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono text-slate-500 hidden sm:inline truncate max-w-[120px]"
            data-testid={`text-nodeid-${label}`}
          >
            {nodeId}
          </span>
          <span
            className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono"
            data-testid={`text-blockcount-${label}`}
          >
            {chain.length} blocks
          </span>
        </div>
      </div>

      {/* Block list */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono">
        {chain.length === 0 && (
          <p className="text-[10px] text-slate-600 text-center py-4">No blocks yet</p>
        )}
        {[...chain].reverse().map((b) => (
          <BlockRow key={b.blockIndex} block={b} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function P2PTerminalPage() {
  // Mutable state machines — useRef, NOT useMemo
  const stateAlpha = useRef(new LambdaStateMachine());
  const stateBeta  = useRef(new LambdaStateMachine());
  const syncAlpha  = useRef(new P2PSyncEngine(stateAlpha.current, "ALPHA"));
  const syncBeta   = useRef(new P2PSyncEngine(stateBeta.current,  "BETA"));

  const [chainAlpha, setChainAlpha] = useState<LedgerBlock[]>(() => stateAlpha.current.getChain());
  const [chainBeta,  setChainBeta]  = useState<LedgerBlock[]>(() => stateBeta.current.getChain());
  const [inputText, setInputText]   = useState("");
  const [lastSync, setLastSync]     = useState<string | null>(null);

  // Wire P2P channels once on mount — empty deps, runs exactly once
  useEffect(() => {
    syncAlpha.current.bindOnChainUpdate((chain) => {
      setChainAlpha(chain);
      setLastSync(`Beta → Alpha  ${new Date().toLocaleTimeString()}`);
    });
    syncBeta.current.bindOnChainUpdate((chain) => {
      setChainBeta(chain);
      setLastSync(`Alpha → Beta  ${new Date().toLocaleTimeString()}`);
    });

    // Virtual cross-pipe with 50 ms simulated latency
    const toBeta  = (msg: string) => setTimeout(() => syncBeta.current.handleIncomingMessage(msg),  50);
    const toAlpha = (msg: string) => setTimeout(() => syncAlpha.current.handleIncomingMessage(msg), 50);

    syncAlpha.current.connectPeer(syncBeta.current.getNodeId(),  toBeta);
    syncBeta.current.connectPeer(syncAlpha.current.getNodeId(), toAlpha);
  }, []); // ← empty array: runs once, avoids re-wiring on every render

  const commit = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    try {
      const tx = stateAlpha.current.compileTransaction(text);
      stateAlpha.current.commitBlock([tx]);
      const fullChain = stateAlpha.current.getChain();
      setChainAlpha(fullChain);
      syncAlpha.current.broadcastNewBlock(fullChain);
      setInputText("");
    } catch {
      // swallow — payload empty guard is in the engine
    }
  }, [inputText]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Spectrum bar */}
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#16a34a,#cccc00,#ff8c00,#cc0000)" }}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href="/" className="mt-1 text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">P2P Aligned Sync Terminal</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Lambda State Machine v7.1 · Distributed Consensus via Spectral Framework Vectors
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-[11px] text-slate-500 bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-3 space-y-1">
          <p><span className="text-indigo-400 font-semibold">Node Alpha</span> is your local client. Committing a payload here broadcasts it over the simulated P2P channel.</p>
          <p><span className="text-emerald-400 font-semibold">Node Beta</span> receives the broadcast and runs spectral consensus. If Alpha's chain is longer and all block hashes verify, Beta adopts it.</p>
          <p className="text-slate-600">Consensus rule: longer chain wins — only if genesis = 380.000 nm and every block fingerprint matches.</p>
        </div>

        {/* Commit panel */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Inject payload → Node Alpha (Enter or click Commit)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={onKey}
              placeholder="Inject transaction payload into Node Alpha…"
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
              data-testid="input-payload-alpha"
            />
            <button
              onClick={commit}
              disabled={!inputText.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              data-testid="btn-commit-alpha"
            >
              <Zap className="w-3.5 h-3.5" /> Commit on Alpha
            </button>
          </div>
          {lastSync && (
            <p
              className="text-[10px] font-mono text-emerald-600"
              data-testid="text-last-sync"
            >
              ↳ Last sync: {lastSync}
            </p>
          )}
        </div>

        {/* Side-by-side node panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NodePanel
            label="NODE ALPHA (Local)"
            accent="#22d3ee"
            chain={chainAlpha}
            nodeId={syncAlpha.current.getNodeId()}
          />
          <NodePanel
            label="NODE BETA (Remote Peer)"
            accent="#4ade80"
            chain={chainBeta}
            nodeId={syncBeta.current.getNodeId()}
          />
        </div>
      </div>
    </div>
  );
}
