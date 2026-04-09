import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, Clock, AlertTriangle, Zap, ChevronRight, Pickaxe, BarChart3, Link2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function wavelengthToColor(nm: number): string {
  if (nm < 380) return "#8b00ff";
  if (nm < 450) return "#7b2fff";
  if (nm < 490) return "#0047ff";
  if (nm < 520) return "#00c8ff";
  if (nm < 565) return "#00e04b";
  if (nm < 590) return "#ffe000";
  if (nm < 625) return "#ff8000";
  return "#ff2000";
}
function fmt(nm: string | number) { return parseFloat(String(nm)).toFixed(2); }
function shortHash(h: string) { return h ? `${h.slice(0, 8)}…${h.slice(-6)}` : "—"; }

interface AuditStatus {
  total: number;
  confirmed: number;
  pending: number;
  unaudited: number;
  blockCount: number;
  pendingAuditTxs: number;
  latestBlocks: Block[];
}
interface Block {
  id: string;
  blockNumber: number;
  content: string;
  wavelengthNm: string;
  psiChannel: string;
  band: string;
  txCount: number;
  previousPsi: string | null;
  minedAt: string;
}
interface AuditRecord {
  id: string;
  label: string;
  wavelengthNm: string;
  psiChannel: string;
  band: string;
  data?: { contentHash?: string; auditStatus?: string; auditTxId?: string; proofBlockNumber?: number; proofBlockPsi?: string };
  createdAt?: string;
}

const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#a855f7", AUTH: "#3b82f6", USER: "#22c55e", GUEST: "#ef4444", CORE: "#6b7280",
};

export default function SpectralAudit() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "unaudited">("all");
  const [mineLog, setMineLog] = useState<string | null>(null);

  // ── Status overview ───────────────────────────────────────────────────────
  const { data: status, isLoading: statusLoading } = useQuery<AuditStatus>({
    queryKey: ["/api/spectral-db/audit-status"],
    refetchInterval: 10_000,
  });

  // ── All records (with audit info) ─────────────────────────────────────────
  const { data: scanData, isLoading: scanLoading } = useQuery<{ records: AuditRecord[] }>({
    queryKey: ["/api/spectral-db/scan"],
    refetchInterval: 15_000,
  });

  const allRecords = scanData?.records ?? [];
  const filtered = allRecords.filter(r => {
    const s = r.data?.auditStatus;
    if (filter === "confirmed")  return s === "confirmed";
    if (filter === "pending")    return s === "pending";
    if (filter === "unaudited")  return !s;
    return true;
  });

  // ── Mine proof block ──────────────────────────────────────────────────────
  const mineMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/spectral-db/audit-mine", {});
      return res.json();
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/audit-status"] });
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      if (d.blockMined) {
        setMineLog(`Block #${d.block?.blockNumber} mined — ${d.recordsProven} records proven at ${fmt(d.block?.wavelengthNm)} nm · ${d.block?.psiChannel}`);
      } else {
        setMineLog(d.message ?? "No pending audit transactions.");
      }
    },
    onError: (e: any) => setMineLog(`Error: ${e.message}`),
  });

  const backfillMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/spectral-db/audit-backfill", {});
      return res.json();
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/audit-status"] });
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      setMineLog(d.message ?? `${d.queued} records queued`);
    },
    onError: (e: any) => setMineLog(`Backfill error: ${e.message}`),
  });

  const pct = status ? Math.round((status.confirmed / Math.max(status.total, 1)) * 100) : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-4 bg-black/80 backdrop-blur flex-shrink-0">
        <Link href="/nexus-command">
          <button className="text-white/40 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <ArrowLeft size={14} /> Hub
          </button>
        </Link>
        <div className="w-2 h-2 rounded-full animate-pulse bg-green-400" />
        <span className="text-white/50 text-xs uppercase tracking-widest">Spectral Audit Ledger</span>
        <span className="text-white/20 text-xs">blockchain-verified proof of work</span>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Stats banner ─────────────────────────────────────────────────── */}
        <div className="border-b border-white/10 px-6 py-5 grid grid-cols-2 md:grid-cols-5 gap-4">
          <Stat label="Total Records"  value={status?.total ?? "…"}      color="#ffffff" />
          <Stat label="Proven On-Chain" value={status?.confirmed ?? "…"}  color="#22c55e" />
          <Stat label="Pending Proof"  value={status?.pendingAuditTxs ?? "…"} color="#eab308" />
          <Stat label="Unaudited"      value={status?.unaudited ?? "…"}   color="#ef4444" />
          <Stat label="Blocks Mined"   value={status?.blockCount ?? "…"}  color="#3b82f6" />
        </div>

        {/* ── Proof coverage bar ────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/40 text-xs uppercase tracking-widest">Proof Coverage</span>
            <span className="text-white text-sm font-bold">{pct}%</span>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct === 100 ? "#22c55e" : pct > 50 ? "#eab308" : "#ef4444" }}
            />
          </div>
          <div className="mt-2 text-white/25 text-[11px] leading-relaxed">
            Every spectral record is SHA-256 hashed and submitted to the blockchain mempool on write.
            Mining a proof block bundles pending audit transactions into a Λ=hf/c² block,
            creating a tamper-evident chain anyone can verify.
          </div>
        </div>

        {/* ── Mine action ───────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
          {/* Backfill existing records */}
          <button
            onClick={() => { setMineLog(null); backfillMut.mutate(); }}
            disabled={backfillMut.isPending || mineMut.isPending}
            data-testid="button-backfill"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "#3b82f618", border: "1px solid #3b82f640", color: "#3b82f6" }}
          >
            <Zap size={13} />
            {backfillMut.isPending ? "Queuing records…" : `Submit All to Mempool (${status?.unaudited ?? 0} unaudited)`}
          </button>

          {/* Mine proof block */}
          <button
            onClick={() => { setMineLog(null); mineMut.mutate(); }}
            disabled={mineMut.isPending || backfillMut.isPending || !status?.pendingAuditTxs}
            data-testid="button-mine-proof"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: status?.pendingAuditTxs ? "#22c55e18" : "#ffffff08", border: `1px solid ${status?.pendingAuditTxs ? "#22c55e40" : "rgba(255,255,255,0.1)"}`, color: status?.pendingAuditTxs ? "#22c55e" : "rgba(255,255,255,0.4)" }}
          >
            <Pickaxe size={13} />
            {mineMut.isPending ? "Mining proof block…" : `Mine Proof Block (${status?.pendingAuditTxs ?? 0} in mempool)`}
          </button>

          {mineLog && (
            <div className="flex items-center gap-2 text-xs" style={{ color: mineLog.startsWith("Error") || mineLog.startsWith("Backfill error") ? "#ef4444" : "#22c55e" }}>
              {(mineLog.startsWith("Error") || mineLog.startsWith("Backfill")) ? <AlertTriangle size={11} /> : <ShieldCheck size={11} />}
              {mineLog}
            </div>
          )}
        </div>

        {/* ── Latest blocks chain ───────────────────────────────────────────── */}
        {(status?.latestBlocks?.length ?? 0) > 0 && (
          <div className="px-6 py-4 border-b border-white/10">
            <div className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Latest Proof Blocks</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {[...(status?.latestBlocks ?? [])].reverse().map((b, i, arr) => {
                const nm = parseFloat(b.wavelengthNm);
                const col = wavelengthToColor(nm);
                return (
                  <div key={b.id} className="flex items-center gap-2 flex-shrink-0">
                    <div className="border border-white/10 rounded-lg px-3 py-2 min-w-[140px]" style={{ background: `${col}08` }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: col }} />
                        <span className="text-white/60 text-[10px] font-bold">Block #{b.blockNumber}</span>
                      </div>
                      <div className="text-[10px]" style={{ color: col }}>{fmt(b.wavelengthNm)} nm</div>
                      <div className="text-white/30 text-[9px]">{b.psiChannel}</div>
                      <div className="text-white/20 text-[9px] mt-1">{b.txCount} audits · {b.band}</div>
                    </div>
                    {i < arr.length - 1 && <Link2 size={12} className="text-white/20 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Records list ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-white/30 text-xs mr-1">Show:</span>
            {(["all", "confirmed", "pending", "unaudited"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                data-testid={`filter-${f}`}
                className="px-3 py-1 rounded text-xs transition-all"
                style={{
                  background: filter === f ? "rgba(255,255,255,0.1)" : "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: filter === f ? "white" : "rgba(255,255,255,0.4)",
                }}>
                {f === "all" ? `All (${status?.total ?? 0})` :
                 f === "confirmed" ? `Proven (${status?.confirmed ?? 0})` :
                 f === "pending" ? `Pending (${status?.pendingAuditTxs ?? 0})` :
                 `Unaudited (${status?.unaudited ?? 0})`}
              </button>
            ))}
          </div>

          {scanLoading && <div className="text-white/20 text-sm py-8 text-center animate-pulse">Loading spectral records…</div>}

          <div className="space-y-px">
            {filtered.map(r => {
              const nm     = parseFloat(r.wavelengthNm);
              const col    = wavelengthToColor(nm);
              const status = r.data?.auditStatus;
              const hash   = r.data?.contentHash;
              const block  = r.data?.proofBlockNumber;
              const parts  = r.label.split("/");
              const fname  = parts[parts.length - 1];
              const dir    = parts.slice(0, -1).join("/");

              return (
                <div key={r.id} data-testid={`audit-row-${r.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/3 transition-colors border border-transparent hover:border-white/5">

                  {/* Status icon */}
                  <div className="flex-shrink-0 w-5 flex justify-center">
                    {status === "confirmed" && <ShieldCheck size={13} className="text-green-400" />}
                    {status === "pending"   && <Clock size={13} className="text-yellow-400" />}
                    {!status               && <AlertTriangle size={13} className="text-red-500/60" />}
                  </div>

                  {/* Wavelength dot */}
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: col }} />

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-xs font-bold truncate">{fname}</span>
                      <span className="text-xs px-1 rounded flex-shrink-0" style={{ color: BAND_COLOR[r.band] ?? "#6b7280", border: `1px solid ${BAND_COLOR[r.band] ?? "#6b7280"}30` }}>{r.band}</span>
                    </div>
                    {dir && <div className="text-white/25 text-[10px] truncate">{dir}</div>}
                  </div>

                  {/* Wavelength */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <div className="text-[11px]" style={{ color: col }}>{fmt(nm)} nm</div>
                    <div className="text-white/25 text-[9px]">{r.psiChannel}</div>
                  </div>

                  {/* Hash / proof */}
                  <div className="text-right flex-shrink-0 w-36 hidden md:block">
                    {hash ? (
                      <div className="text-white/30 text-[9px] font-mono">{shortHash(hash)}</div>
                    ) : (
                      <div className="text-white/15 text-[9px]">no hash</div>
                    )}
                    {block !== undefined && block !== null ? (
                      <div className="text-green-400/60 text-[9px]">Block #{block}</div>
                    ) : status === "pending" ? (
                      <div className="text-yellow-400/60 text-[9px]">in mempool</div>
                    ) : (
                      <div className="text-red-500/40 text-[9px]">not submitted</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Verification guide ────────────────────────────────────────────── */}
        <div className="mx-6 mb-6 border border-white/10 rounded-lg p-4">
          <div className="text-white/40 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <BarChart3 size={11} /> How to verify independently
          </div>
          <div className="text-white/35 text-xs leading-6 space-y-1">
            <div>1. Take any content from the spectral DB</div>
            <div>2. Run it through the WNSP-CE→SE encoder at <span className="text-white/60">/api/nexus/dev/encode</span></div>
            <div>3. The output wavelength must match what is recorded in the spectral record</div>
            <div>4. The SHA-256 hash of the content must match the <span className="text-white/60">contentHash</span> in the blockchain tx memo</div>
            <div>5. The tx must appear in a confirmed block — the block's Ψ channel links back through the chain</div>
            <div className="text-white/20 pt-1">Λ = hf/c² is deterministic. The physics is the proof. No admin can alter it.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="border border-white/10 rounded-lg px-4 py-3">
      <div className="text-white/30 text-[10px] uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
