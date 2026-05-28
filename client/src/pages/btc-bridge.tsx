import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Bitcoin, Zap, Shield, RefreshCw, CheckCircle2, Clock, ExternalLink,
  AlertTriangle, Copy, ChevronDown, ChevronUp, Play, Settings, Wallet
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
interface WalletInfo { configured: boolean; address: string | null; network: string; hint: string; balance: { confirmed: number; unconfirmed: number; total: number } | null; }
interface QueueItem { id: number; event_type: string; event_ref: string | null; anchor_name: string; psi_channel: string | null; status: string; inscription_id: string | null; inscription_content: string; content_bytes: number | null; triggered_by: string | null; created_at: string; confirmed_at: string | null; }
interface FeeRates { fast: number; medium: number; slow: number; unit: string; }

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-amber-500/10",   text: "text-amber-400",  label: "⧖ PENDING"   },
  signed:    { bg: "bg-blue-500/10",    text: "text-blue-400",   label: "✎ SIGNED"    },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400",label: "✓ CONFIRMED" },
  failed:    { bg: "bg-red-500/10",     text: "text-red-400",    label: "✗ FAILED"    },
};

const EVENT_COLORS: Record<string, string> = {
  NXT_TRANSFER:   "#fbbf24",
  GOVERNANCE:     "#a78bfa",
  KERNEL:         "#22d3ee",
  WASCII_MANUAL:  "#34d399",
  ORDINAL_DEPOSIT:"#f97316",
};

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ── Wallet card ───────────────────────────────────────────────────────────────
function WalletCard({ info }: { info: WalletInfo }) {
  const [copied, setCopied] = useState(false);
  function satsToBtc(s: number) { return (s / 1e8).toFixed(6); }
  function satsToUsd(s: number) { return "$" + ((s / 1e8) * 105000).toFixed(2); } // rough BTC price

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${info.configured ? "border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-900/5" : "border-white/8 bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={15} className={info.configured ? "text-orange-400" : "text-white/30"} />
          <span className="text-xs font-mono font-bold text-white">Service Wallet</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">DEDICATED · NOT YOUR MAIN</span>
        </div>
        <div className={`text-[10px] font-mono px-2 py-1 rounded-full border ${info.configured ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
          {info.configured ? "✓ READY" : "⧖ NOT SET"}
        </div>
      </div>

      {info.configured && info.address ? (
        <>
          <div className="rounded-xl bg-black/40 border border-white/5 p-3">
            <div className="text-[9px] font-mono text-white/30 uppercase mb-1">Taproot Address (bc1p)</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-orange-300 break-all flex-1">{info.address}</span>
              <button onClick={() => { navigator.clipboard.writeText(info.address!); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-white/30 hover:text-white/60 shrink-0">
                {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
              </button>
            </div>
          </div>
          {info.balance && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Confirmed", sats: info.balance.confirmed },
                { label: "Pending",   sats: info.balance.unconfirmed },
                { label: "Total",     sats: info.balance.total },
              ].map(item => (
                <div key={item.label} className="rounded-lg bg-black/30 border border-white/5 p-2.5 text-center">
                  <div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">{item.label}</div>
                  <div className="text-xs font-mono font-bold text-orange-300">{satsToBtc(item.sats)} BTC</div>
                  <div className="text-[9px] font-mono text-white/30">{satsToUsd(item.sats)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] font-mono text-white/30 leading-relaxed">
            Fund this address with <strong className="text-white/60">$50–200 worth of BTC</strong> for inscription fees.
            Keep your main $3,900 wallet in Unisat — never send it here.
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] text-white/50 leading-relaxed">
            Full automation requires a dedicated service wallet. Generate a new Taproot address
            in Unisat (don't use your main one), export its WIF private key, and add it as a secret.
          </p>
          <div className="rounded-xl bg-black/40 border border-amber-500/20 p-3 space-y-1.5">
            {[
              "1. In Unisat: Create a NEW wallet (not your main one)",
              "2. Settings → Export Private Key → copy the WIF string",
              "3. In Replit: add secret  BTC_INSCRIPTION_WALLET_WIF",
              "4. Paste the WIF key as the value",
              "5. Restart the app — automation activates immediately",
            ].map((s, i) => (
              <div key={i} className="flex gap-2 text-[11px] text-white/50"><span className="text-amber-500/60 shrink-0">→</span>{s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fee Rate card ─────────────────────────────────────────────────────────────
function FeeCard({ fees }: { fees: FeeRates | undefined }) {
  if (!fees) return null;
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[9px] font-mono text-white/30 uppercase mb-2">Live Network Fee Rates · mempool.space</div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Fast (~10min)", value: fees.fast, color: "#f87171" },
          { label: "Medium (~1hr)", value: fees.medium, color: "#fbbf24" },
          { label: "Slow (~1day)", value: fees.slow, color: "#34d399" },
        ].map(f => (
          <div key={f.label} className="rounded-lg bg-black/30 border border-white/5 p-2.5 text-center">
            <div className="text-[9px] font-mono text-white/30 mb-0.5">{f.label}</div>
            <div className="text-sm font-mono font-bold" style={{ color: f.color }}>{f.value}</div>
            <div className="text-[9px] font-mono text-white/30">sat/vbyte</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Queue item card ───────────────────────────────────────────────────────────
function QueueCard({ item, onInscribe, inscribing }: { item: QueueItem; onInscribe: (id: number) => void; inscribing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [manualId, setManualId] = useState("");
  const qc = useQueryClient();

  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
  const eventColor  = EVENT_COLORS[item.event_type] ?? "#94a3b8";

  async function confirmManual() {
    if (!manualId.trim()) return;
    await apiFetch(`/api/btc-bridge/queue/${item.id}/confirm`, {
      method: "PATCH",
      body: JSON.stringify({ inscriptionId: manualId.trim() }),
    });
    qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: eventColor + "15", color: eventColor, borderColor: eventColor + "30" }}>
              {item.event_type}
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text}`} style={{ borderColor: "transparent" }}>
              {statusStyle.label}
            </span>
            {item.psi_channel && <span className="text-[10px] font-mono text-cyan-400/60">{item.psi_channel}</span>}
          </div>
          <span className="text-[9px] font-mono text-white/20 shrink-0">#{item.id}</span>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-white/30 mb-3 flex-wrap">
          {item.anchor_name && <span>⚓ {item.anchor_name}</span>}
          {item.triggered_by && <span>by {item.triggered_by}</span>}
          {item.content_bytes && <span>{item.content_bytes.toLocaleString()} bytes</span>}
          <span>{new Date(item.created_at).toLocaleString()}</span>
        </div>

        {item.inscription_id ? (
          <a href={`https://ordinals.com/inscription/${item.inscription_id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors">
            <ExternalLink size={10} /> {item.inscription_id.slice(0, 20)}...i0
          </a>
        ) : item.status === "pending" ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onInscribe(item.id)} disabled={inscribing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-mono hover:bg-orange-500/30 transition-all disabled:opacity-40"
              data-testid={`button-auto-inscribe-${item.id}`}>
              {inscribing ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
              Auto-Inscribe
            </button>
            <span className="text-[10px] font-mono text-white/20">or</span>
            <div className="flex gap-1">
              <input value={manualId} onChange={e => setManualId(e.target.value)}
                placeholder="paste inscription ID from Unisat..."
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 w-48" />
              <button onClick={confirmManual} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-white/50 hover:text-white/80">
                <CheckCircle2 size={11} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => navigator.clipboard.writeText(item.inscription_content)}
            className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">
            <Copy size={9} /> Copy content
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">
            {expanded ? <><ChevronUp size={10} /> Hide</> : <><ChevronDown size={10} /> Preview</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 bg-black/50 p-3 max-h-48 overflow-y-auto">
          <pre className="text-[9px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap">{item.inscription_content}</pre>
        </div>
      )}
    </div>
  );
}

// ── Manual trigger ────────────────────────────────────────────────────────────
function ManualTrigger() {
  const qc = useQueryClient();
  const [type, setType] = useState("WASCII_MANUAL");
  const [note, setNote]  = useState("");
  const [busy, setBusy]  = useState(false);
  const [msg, setMsg]    = useState("");

  async function trigger() {
    setBusy(true); setMsg("");
    try {
      const res = await apiFetch("/api/btc-bridge/queue/trigger", {
        method: "POST",
        body: JSON.stringify({ eventType: type, data: { note } }),
      });
      setMsg(`Queued #${res.queued?.id} — ready to inscribe`);
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
    } catch (e: any) { setMsg("Error: " + e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">Manual Queue Trigger</div>
      <div className="flex gap-2 flex-wrap">
        <select value={type} onChange={e => setType(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/20">
          {["NXT_TRANSFER","GOVERNANCE","KERNEL","WASCII_MANUAL","ORDINAL_DEPOSIT"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note..."
          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 min-w-32" />
        <button onClick={trigger} disabled={busy}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-mono hover:bg-violet-500/30 transition-all disabled:opacity-40"
          data-testid="button-manual-trigger">
          {busy ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />} Queue
        </button>
      </div>
      {msg && <div className={`text-[11px] font-mono ${msg.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>{msg}</div>}
    </div>
  );
}

// ── Anchor config ──────────────────────────────────────────────────────────────
function AnchorConfig() {
  const qc = useQueryClient();
  const [parentId, setParentId] = useState("");
  const [address, setAddress]   = useState("");
  const [saved, setSaved]       = useState(false);

  async function save() {
    await apiFetch("/api/btc-bridge/anchor", {
      method: "POST",
      body: JSON.stringify({ address: address || null, parentInscriptionId: parentId || null }),
    });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-900/5 p-4 space-y-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/60">wnsp.sats Anchor Config</div>
      <p className="text-[11px] text-white/50 leading-relaxed">
        Set the parent inscription ID of <strong className="text-white/70">wnsp.sats</strong> so all auto-inscriptions are child inscriptions linked to it on Bitcoin.
      </p>
      <div className="space-y-2">
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="wnsp.sats Taproot address (bc1p...)"
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/30" />
        <input value={parentId} onChange={e => setParentId(e.target.value)} placeholder="wnsp.sats inscription ID (hex...i0)"
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/30" />
        <button onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-mono hover:bg-violet-500/30 transition-all"
          data-testid="button-save-anchor">
          {saved ? <><CheckCircle2 size={11} /> Saved</> : <><Settings size={11} /> Save Anchor</>}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BtcBridgePage() {
  const qc = useQueryClient();
  const [inscribingId, setInscribingId] = useState<number | null>(null);
  const [inscribeMsg, setInscribeMsg]   = useState<Record<number, string>>({});

  const { data: walletData, isLoading: walletLoading } = useQuery<WalletInfo>({
    queryKey: ["/api/btc-bridge/wallet"],
    refetchInterval: 30_000,
  });

  const { data: queueData, isLoading: queueLoading } = useQuery<{ items: QueueItem[]; total: number }>({
    queryKey: ["/api/btc-bridge/queue"],
    refetchInterval: 10_000,
  });

  const { data: feeData } = useQuery<FeeRates>({
    queryKey: ["/api/btc-bridge/fee-rate"],
    refetchInterval: 60_000,
  });

  async function handleAutoInscribe(id: number) {
    setInscribingId(id);
    setInscribeMsg(m => ({ ...m, [id]: "" }));
    try {
      const result = await apiFetch(`/api/btc-bridge/inscribe/${id}`, { method: "POST", body: JSON.stringify({}) });
      setInscribeMsg(m => ({ ...m, [id]: `✓ ${result.inscriptionId}` }));
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/wallet"] });
    } catch (e: any) {
      setInscribeMsg(m => ({ ...m, [id]: "Error: " + e.message }));
    } finally { setInscribingId(null); }
  }

  const pending   = queueData?.items.filter(i => i.status === "pending")   ?? [];
  const confirmed = queueData?.items.filter(i => i.status === "confirmed") ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/wnsp/ordinals" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors">← Ordinals</Link>
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">NexusOS → Bitcoin Bridge · Full Auto</span>
        <button onClick={() => { qc.invalidateQueries({ queryKey: ["/api/btc-bridge/wallet"] }); qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] }); }}
          className="text-white/30 hover:text-white/60 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin size={18} className="text-orange-400" />
            <h1 className="text-xl font-bold text-white">NexusOS → Bitcoin Bridge</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">FULL AUTO</span>
          </div>
          <p className="text-white/50 text-xs leading-relaxed max-w-xl">
            Every NexusOS event — NXT transfers, governance executions, kernel state changes — is automatically
            encoded as a WASCII inscription and written to Bitcoin, anchored to <strong className="text-white/70">wnsp.sats</strong>.
            Permanent. Unburnable. On-chain forever.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 overflow-x-auto pb-1">
          {["NexusOS Event", "→", "WASCII Encoder", "→", "BTC Bridge Queue", "→", "Taproot Inscription", "→", "wnsp.sats anchor"].map((s, i) => (
            <span key={i} className={s === "→" ? "text-white/15 shrink-0" : "px-2 py-1 rounded bg-white/5 border border-white/5 shrink-0 text-white/50"}>{s}</span>
          ))}
        </div>

        {/* Wallet */}
        {walletLoading ? (
          <div className="h-24 rounded-2xl bg-white/[0.02] border border-white/8 animate-pulse" />
        ) : walletData ? (
          <WalletCard info={walletData} />
        ) : null}

        {/* Fees */}
        <FeeCard fees={feeData} />

        {/* Anchor config */}
        <AnchorConfig />

        {/* Manual trigger */}
        <ManualTrigger />

        {/* Pending queue */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-0.5">Inscription Queue</div>
              <div className="text-sm font-bold text-white">
                {pending.length} pending
                {confirmed.length > 0 && <span className="text-white/30 font-normal text-xs ml-2">· {confirmed.length} confirmed</span>}
              </div>
            </div>
            {queueLoading && <RefreshCw size={12} className="text-white/30 animate-spin" />}
          </div>

          {queueData?.items.length === 0 && (
            <div className="text-center text-white/20 text-xs font-mono py-8 rounded-xl border border-white/5">
              No inscriptions queued yet. Use the trigger above or generate one from the WASCII generator.
            </div>
          )}

          <div className="space-y-3">
            {queueData?.items.map(item => (
              <div key={item.id}>
                <QueueCard item={item} onInscribe={handleAutoInscribe} inscribing={inscribingId === item.id} />
                {inscribeMsg[item.id] && (
                  <div className={`text-[10px] font-mono mt-1 px-3 ${inscribeMsg[item.id].startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
                    {inscribeMsg[item.id]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What gets inscribed */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">Auto-Inscription Triggers</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { type: "NXT_TRANSFER",    desc: "Any NXT transfer ≥ 100 NXT gets inscribed with sender, receiver, amount, wavelength", color: "#fbbf24" },
              { type: "GOVERNANCE",      desc: "Every governance proposal execution is inscribed with proposal ID, title, outcome", color: "#a78bfa" },
              { type: "KERNEL",          desc: "Kernel state changes, boot events, agent watchdog alerts", color: "#22d3ee" },
              { type: "ORDINAL_DEPOSIT", desc: "NexusOS ordinal fee deposits to treasury", color: "#f97316" },
            ].map(t => (
              <div key={t.type} className="rounded-lg bg-black/30 border border-white/5 p-3">
                <div className="text-[10px] font-mono font-bold mb-1" style={{ color: t.color }}>{t.type}</div>
                <div className="text-[10px] text-white/40 leading-relaxed">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
          <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-300/70 leading-relaxed">
            <strong className="text-amber-300">Security:</strong> The service wallet WIF key is stored as a Replit secret, never in code.
            Keep only $50–200 in the service wallet at any time. Your main Unisat wallet ($3,900) stays
            in Unisat — never import that key here. Each inscription costs ~$5–30 depending on network congestion.
          </div>
        </div>

        {/* Footer links */}
        <div className="text-center text-[10px] font-mono text-white/20 flex items-center justify-center gap-4 pb-4">
          <Link href="/wnsp/ordinals" className="hover:text-white/50 transition-colors">Ordinals Page</Link>
          <a href="https://mempool.space" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">mempool.space <ExternalLink size={9} /></a>
          <a href="https://ordinals.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">ordinals.com <ExternalLink size={9} /></a>
          <a href="https://unisat.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">unisat.io <ExternalLink size={9} /></a>
        </div>

      </div>
    </div>
  );
}
