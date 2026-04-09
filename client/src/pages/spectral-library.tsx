import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Search, X, FileText, Film, Zap, Copy, Check, ChevronRight, Trash2, Coins, AlertTriangle } from "lucide-react";

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

function bandColor(band: string) {
  return { SYSTEM: "#a855f7", AUTH: "#3b82f6", USER: "#22c55e", GUEST: "#ef4444", CORE: "#6b7280" }[band] ?? "#6b7280";
}

function fmt(nm: string | number) { return parseFloat(String(nm)).toFixed(2); }
function fmtFreq(hz: string | number) {
  const v = parseFloat(String(hz));
  if (!v) return "—";
  const t = v / 1e12;
  return t >= 1 ? `${t.toFixed(2)} THz` : `${(v / 1e9).toFixed(2)} GHz`;
}

const BANDS = ["ALL", "SYSTEM", "AUTH", "USER", "GUEST", "CORE"] as const;
type Band = typeof BANDS[number];

interface SlimRecord {
  id: string;
  label: string;
  wavelengthNm: string;
  psiChannel: string;
  band: string;
  energyJoules: string;
  frequencyHz: string;
  data?: any;
  createdAt?: string;
}
interface FullRecord extends SlimRecord { content: string; }

// ── Spectrum strip ────────────────────────────────────────────────────────────
function SpectrumStrip({ records, onSelect }: { records: SlimRecord[]; onSelect: (nm: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Rainbow gradient background (380–700 nm)
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,    "#8b00ff");
    grad.addColorStop(0.2,  "#0047ff");
    grad.addColorStop(0.37, "#00c8ff");
    grad.addColorStop(0.53, "#00e04b");
    grad.addColorStop(0.66, "#ffe000");
    grad.addColorStop(0.79, "#ff8000");
    grad.addColorStop(1,    "#ff2000");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.5);

    // Tick marks for each record
    for (const r of records) {
      const nm = parseFloat(r.wavelengthNm);
      const x  = ((nm - 380) / (700 - 380)) * W;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, H * 0.5);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }, [records]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const nm = 380 + (x / canvas.width) * (700 - 380);
    onSelect(Math.round(nm));
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={1200}
        height={48}
        onClick={handleClick}
        className="w-full rounded cursor-crosshair"
        style={{ height: 48, imageRendering: "pixelated" }}
        data-testid="spectrum-strip"
      />
      <div className="flex justify-between mt-1 px-1">
        {[380, 450, 490, 520, 565, 590, 625, 700].map(nm => (
          <span key={nm} className="text-white/20 text-[9px]">{nm}nm</span>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SpectralLibrary() {
  const qc                    = useQueryClient();
  const [q, setQ]             = useState("");
  const [band, setBand]       = useState<Band>("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fullRecord, setFullRecord] = useState<FullRecord | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [tuneNm, setTuneNm]   = useState<number | null>(null);
  const searchRef             = useRef<HTMLInputElement>(null);

  // Build query key + params
  const params = new URLSearchParams();
  if (q)             params.set("q",    q);
  if (band !== "ALL") params.set("band", band);
  if (tuneNm !== null) { params.set("q", ""); params.set("wavelength", String(tuneNm)); }
  params.set("limit", "300");

  const { data, isFetching } = useQuery<{ records: SlimRecord[]; count: number }>({
    queryKey: ["/api/spectral-db/text-search", q, band, tuneNm],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/spectral-db/text-search?${params}`);
      return res.json();
    },
    staleTime: 15_000,
  });

  const records = data?.records ?? [];

  // Load full record when selected
  async function openRecord(id: string) {
    setActiveId(id);
    setFullRecord(null);
    setLoadingFull(true);
    try {
      const res = await apiRequest("GET", `/api/spectral-db/record/${id}`);
      const d   = await res.json();
      setFullRecord(d.record ?? null);
    } finally { setLoadingFull(false); }
  }

  function handleSpectrumClick(nm: number) {
    setTuneNm(nm);
    setQ("");
    setBand("ALL");
  }

  function clearFilters() { setQ(""); setBand("ALL"); setTuneNm(null); }

  function copyLabel() {
    if (!fullRecord) return;
    navigator.clipboard.writeText(fullRecord.label);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<any>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/spectral-db/${id}`, undefined);
      return res.json();
    },
    onSuccess: (d) => {
      setDeleteResult(d);
      setDeleteConfirm(false);
      setActiveId(null);
      setFullRecord(null);
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      qc.invalidateQueries({ queryKey: ["/api/orbital-treasury"] });
    },
    onError: (e: any) => { setDeleteConfirm(false); setDeleteResult({ error: e.message }); },
  });

  const activeRecord = records.find(r => r.id === activeId) ?? null;
  const displayRecord = fullRecord ?? (activeRecord as any);

  // ── File-type icon ──
  function RecordIcon({ rec }: { rec: SlimRecord }) {
    if (rec.data?.type === "video")     return <Film size={11} />;
    if (rec.data?.type === "chronicle") return <Zap size={11} />;
    return <FileText size={11} />;
  }

  // ── Extension badge ──
  function extBadge(label: string) {
    const parts = label.split(".");
    const ext   = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
    const map: Record<string, string> = {
      ts: "#3178c6", tsx: "#61dafb", py: "#f7cc45", md: "#c0c0c0",
      json: "#cb9820", sql: "#ff6f00", txt: "#aaa", js: "#f7df1e",
      css: "#2965f1", html: "#e44d26",
    };
    if (!ext || ext.length > 5) return null;
    return (
      <span className="text-[9px] px-1 rounded font-mono" style={{ background: (map[ext] ?? "#444") + "28", color: map[ext] ?? "#888", border: `1px solid ${map[ext] ?? "#888"}40` }}>
        .{ext}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-4 bg-black/80 backdrop-blur flex-shrink-0">
        <Link href="/nexus-command">
          <button className="text-white/40 hover:text-white text-sm flex items-center gap-1 transition-colors">
            <ArrowLeft size={14} /> Hub
          </button>
        </Link>
        <div className="w-2 h-2 rounded-full animate-pulse bg-green-400" />
        <span className="text-white/50 text-xs uppercase tracking-widest">Spectral Library</span>
        <span className="text-white/20 text-xs">
          {isFetching ? "searching…" : `${data?.count ?? 0} records`}
        </span>
        <div className="flex-1" />
        <Link href="/orbital-treasury">
          <button className="flex items-center gap-1 text-xs rounded px-2.5 py-1 transition-all"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
            <Coins size={10} /> Orbital Treasury
          </button>
        </Link>
        {deleteResult && !deleteResult.error && (
          <div className="flex items-center gap-2 text-[10px]" style={{ color: "#4ade80" }}>
            <Check size={10} />
            <span>{parseInt(deleteResult.ordinalReclaimedNxtUnits ?? "0").toLocaleString()} NXT units → Treasury</span>
            <button onClick={() => setDeleteResult(null)} className="text-white/20 hover:text-white/40">✕</button>
          </div>
        )}
      </div>

      {/* ── Search + filters ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-3 flex flex-col gap-3 flex-shrink-0">
        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search files, code, content… (searches 620+ spectral records)"
            value={q}
            onChange={e => { setQ(e.target.value); setTuneNm(null); }}
            data-testid="input-library-search"
            className="w-full bg-white/5 border border-white/10 rounded pl-8 pr-8 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/30"
          />
          {(q || tuneNm !== null) && (
            <button onClick={clearFilters} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Band filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/30 text-xs">Band:</span>
          {BANDS.map(b => (
            <button
              key={b}
              onClick={() => { setBand(b); setTuneNm(null); }}
              data-testid={`filter-band-${b}`}
              className="px-2 py-0.5 rounded text-xs transition-all"
              style={{
                color:      b === "ALL" ? "#fff" : bandColor(b),
                background: band === b ? (b === "ALL" ? "rgba(255,255,255,0.15)" : bandColor(b) + "25") : "transparent",
                border:     `1px solid ${b === "ALL" ? "rgba(255,255,255,0.2)" : bandColor(b) + "60"}`,
                opacity:    band !== b ? 0.5 : 1,
              }}
            >
              {b}
            </button>
          ))}
          {tuneNm !== null && (
            <span className="text-white/40 text-xs ml-2">Tuned to ~{tuneNm} nm</span>
          )}
        </div>

        {/* Spectrum strip */}
        <SpectrumStrip records={records} onSelect={handleSpectrumClick} />
      </div>

      {/* ── Body: list + detail ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Results list ──────────────────────────────────────────── */}
        <div className="w-80 border-r border-white/10 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-white/30 text-[10px] uppercase tracking-widest">Results</span>
            <span className="text-white/20 text-[10px]">{records.length} shown</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {records.length === 0 && !isFetching && (
              <div className="px-4 py-8 text-white/20 text-xs leading-relaxed text-center">
                No records match.{"\n"}Try a different search or band filter.
              </div>
            )}
            {records.map(r => {
              const nm  = parseFloat(r.wavelengthNm);
              const col = wavelengthToColor(nm);
              const isAct = activeId === r.id;
              const parts = r.label.split("/");
              const filename = parts[parts.length - 1];
              const dir = parts.slice(0, -1).join("/");
              return (
                <button
                  key={r.id}
                  onClick={() => openRecord(r.id)}
                  data-testid={`record-${r.id}`}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors flex items-start gap-2 ${isAct ? "bg-white/8" : ""}`}
                >
                  {/* wavelength stripe */}
                  <div className="w-0.5 self-stretch rounded flex-shrink-0 mt-0.5" style={{ background: col, minHeight: 32 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ color: col + "aa" }} className="flex-shrink-0"><RecordIcon rec={r} /></span>
                      <span className="text-white/80 text-xs truncate font-bold flex-1">{filename}</span>
                      {extBadge(filename)}
                    </div>
                    {dir && <div className="text-white/25 text-[10px] truncate mb-1">{dir}</div>}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: col }}>{fmt(r.wavelengthNm)} nm</span>
                      <span className="text-white/20 text-[10px]">{r.psiChannel}</span>
                      <span className="text-[9px] px-1 rounded" style={{ color: bandColor(r.band), border: `1px solid ${bandColor(r.band)}30` }}>{r.band}</span>
                    </div>
                  </div>
                  {isAct && <ChevronRight size={10} className="text-white/40 flex-shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detail panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="text-5xl opacity-10">◈</div>
              <div className="text-white/30 text-sm leading-relaxed max-w-sm">
                Select any file from the list to view its content and spectral address.<br /><br />
                Click the spectrum strip above to tune to a wavelength range.<br /><br />
                Every file in the NexusOS codebase lives at a permanent λ address.
              </div>
            </div>
          )}

          {activeId && (
            <>
              {/* Address bar */}
              {displayRecord && (
                <>
                <div
                  className="border-b border-white/10 px-5 py-3 flex items-center gap-4 flex-shrink-0"
                  style={{ background: `${wavelengthToColor(parseFloat(displayRecord.wavelengthNm))}08` }}
                >
                  <div className="w-8 h-8 rounded flex-shrink-0" style={{
                    background: `linear-gradient(135deg, ${wavelengthToColor(parseFloat(displayRecord.wavelengthNm))}cc, ${wavelengthToColor(parseFloat(displayRecord.wavelengthNm))}44)`,
                    boxShadow:  `0 0 16px ${wavelengthToColor(parseFloat(displayRecord.wavelengthNm))}50`,
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold" style={{ color: wavelengthToColor(parseFloat(displayRecord.wavelengthNm)) }}>
                        {fmt(displayRecord.wavelengthNm)} nm
                      </span>
                      <span className="text-white/50 text-xs">{displayRecord.psiChannel}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{
                        color:      bandColor(displayRecord.band),
                        background: bandColor(displayRecord.band) + "18",
                        border:     `1px solid ${bandColor(displayRecord.band)}40`,
                      }}>{displayRecord.band}</span>
                      <span className="text-white/25 text-xs">{fmtFreq(displayRecord.frequencyHz)}</span>
                    </div>
                    <div className="text-white/30 text-[11px] mt-0.5 truncate">{displayRecord.label}</div>
                  </div>
                  <button onClick={copyLabel} className="flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 transition-colors" data-testid="button-copy-label">
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy path"}
                  </button>
                  {!deleteConfirm && (
                    <button onClick={() => setDeleteConfirm(true)}
                      data-testid="button-delete-record"
                      className="flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                      <Trash2 size={10} /> Delete
                    </button>
                  )}
                </div>

                {/* Delete confirmation panel */}
                {deleteConfirm && displayRecord && (
                  <div className="border-t border-white/10 px-5 py-3 flex flex-col gap-2"
                    style={{ background: "rgba(239,68,68,0.04)" }}>
                    <div className="flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle size={11} />
                      <span className="font-bold">Delete this spectral record?</span>
                    </div>
                    <div className="text-white/40 text-[10px] leading-relaxed">
                      The ordinal <span className="text-amber-400 font-bold">
                        ~{Math.round(parseFloat(displayRecord.frequencyHz ?? "5.45e14") / 1e6).toLocaleString()} NXT units
                      </span> ({((parseFloat(displayRecord.frequencyHz ?? "5.45e14") / 1e6) / 1e8).toFixed(8)} NXT) will be
                      deposited to the Orbital Treasury. The Ψ address is preserved on-chain. Content is soft-deleted only.
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => activeId && deleteMut.mutate(activeId)}
                        disabled={deleteMut.isPending}
                        data-testid="button-confirm-delete"
                        className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold transition-all"
                        style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                        <Coins size={9} />
                        {deleteMut.isPending ? "Depositing to treasury…" : "Confirm → Send to Orbital Treasury"}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded text-xs text-white/30 hover:text-white/60 transition-colors border border-white/10">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                </>
              )}

              {/* Content viewer */}
              <div className="flex-1 overflow-y-auto p-5">
                {loadingFull && (
                  <div className="text-white/20 text-sm animate-pulse">Loading from spectrum…</div>
                )}
                {!loadingFull && fullRecord && (
                  <pre className="text-white/70 text-xs leading-6 whitespace-pre-wrap break-words font-mono">
                    {fullRecord.content}
                  </pre>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
