import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Save, Radio, Copy, Check, FileText, Plus, Trash2, Zap, Eye } from "lucide-react";

// ── Wavelength → visible colour ──────────────────────────────────────────────
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

function wavelengthToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 520) return "AUTH";
  if (nm < 625) return "USER";
  return "GUEST";
}

function bandColor(band: string): string {
  const map: Record<string, string> = {
    SYSTEM: "#a855f7", AUTH: "#3b82f6", USER: "#22c55e", GUEST: "#ef4444", CORE: "#6b7280",
  };
  return map[band] ?? "#6b7280";
}

function fmtWavelength(nm: string | number): string {
  return parseFloat(String(nm)).toFixed(2);
}

function fmtEnergy(j: string | number): string {
  const v = parseFloat(String(j));
  if (v === 0) return "—";
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const coeff = (v / Math.pow(10, exp)).toFixed(2);
  return `${coeff}×10^${exp} J`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpectralRecord {
  id: string;
  label: string;
  content: string;
  wavelengthNm: string;
  psiChannel: string;
  band: string;
  energyJoules: string;
  frequencyHz: string;
  createdAt?: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SpectralWorkspace() {
  const qc = useQueryClient();

  // Editor state
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [selected, setSelected] = useState<SpectralRecord | null>(null);
  const [tuneInput, setTuneInput] = useState("");
  const [copied, setCopied]     = useState(false);
  const [view, setView]         = useState<"edit" | "read">("edit");
  const textareaRef             = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Library — all stored spectral records
  const { data: libData, isLoading: libLoading } = useQuery<{ records: SpectralRecord[] }>({
    queryKey: ["/api/spectral-db/scan"],
    refetchInterval: 8000,
  });
  const library = libData?.records ?? [];

  // Save document mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and content required");
      const res = await apiRequest("POST", "/api/spectral-db/store", {
        label:   title.trim(),
        content: body.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      if (data.record) setSelected(data.record);
      setView("read");
    },
  });

  // Tune — load document by wavelength
  const tuneMut = useMutation({
    mutationFn: async (nm: string) => {
      const res = await apiRequest("GET", `/api/spectral-db/search?wavelength=${encodeURIComponent(nm)}&range=5`);
      return res.json();
    },
    onSuccess: (data) => {
      const records: SpectralRecord[] = data.records ?? [];
      if (records.length > 0) {
        openRecord(records[0]);
      }
    },
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/spectral-db/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      if (selected) { newDocument(); }
    },
  });

  function newDocument() {
    setSelected(null);
    setTitle("");
    setBody("");
    setView("edit");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function openRecord(r: SpectralRecord) {
    setSelected(r);
    setTitle(r.label);
    setBody(r.content);
    setView("read");
  }

  function copyWavelength() {
    if (!selected) return;
    navigator.clipboard.writeText(fmtWavelength(selected.wavelengthNm) + " nm");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const color   = selected ? wavelengthToColor(parseFloat(selected.wavelengthNm)) : "#6b7280";
  const isSaving = saveMut.isPending;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-4 bg-black/80 backdrop-blur">
        <Link href="/nexus-command">
          <button className="text-white/40 hover:text-white transition-colors flex items-center gap-1 text-sm">
            <ArrowLeft size={14} /> Hub
          </button>
        </Link>

        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
          <span className="text-white/50 text-xs uppercase tracking-widest">Spectral Workspace</span>
        </div>

        {/* Tune bar */}
        <div className="flex items-center gap-2">
          <Radio size={13} className="text-white/40" />
          <input
            type="number"
            placeholder="Tune nm…"
            value={tuneInput}
            onChange={e => setTuneInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && tuneInput) tuneMut.mutate(tuneInput); }}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-28 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            data-testid="input-tune-wavelength"
          />
          <button
            onClick={() => tuneInput && tuneMut.mutate(tuneInput)}
            disabled={tuneMut.isPending || !tuneInput}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-xs transition-colors disabled:opacity-40"
            data-testid="button-tune"
          >
            {tuneMut.isPending ? "…" : "Tune"}
          </button>
        </div>

        <button
          onClick={newDocument}
          className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-3 py-1 text-xs transition-colors"
          data-testid="button-new-document"
        >
          <Plus size={12} /> New
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar — spectral library ───────────────────── */}
        <div className="w-64 border-r border-white/10 flex flex-col bg-black/40">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-white/40 text-xs uppercase tracking-widest">Library</span>
            <span className="text-white/20 text-xs">{library.length} docs</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {libLoading && (
              <div className="px-4 py-6 text-white/20 text-xs">Scanning spectrum…</div>
            )}
            {!libLoading && library.length === 0 && (
              <div className="px-4 py-6 text-white/20 text-xs leading-relaxed">
                No documents yet.<br />Write something and save it — it will live at its wavelength.
              </div>
            )}
            {library.map(r => {
              const nm   = parseFloat(r.wavelengthNm);
              const col  = wavelengthToColor(nm);
              const isAct = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => openRecord(r)}
                  data-testid={`doc-item-${r.id}`}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${isAct ? "bg-white/8" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col }} />
                    <span className="text-white/80 text-xs truncate flex-1">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-2 pl-3.5">
                    <span className="text-white/30 text-[10px]">{fmtWavelength(r.wavelengthNm)} nm</span>
                    <span className="text-[9px] px-1 rounded" style={{ color: bandColor(r.band), border: `1px solid ${bandColor(r.band)}40` }}>{r.band}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Editor / Reader ──────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Wavelength address bar — shown when document is saved */}
          {selected && (
            <div
              className="border-b border-white/10 px-6 py-3 flex items-center gap-4"
              style={{ background: `${wavelengthToColor(parseFloat(selected.wavelengthNm))}08` }}
            >
              {/* Spectrum swatch */}
              <div
                className="w-8 h-8 rounded flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${wavelengthToColor(parseFloat(selected.wavelengthNm))}cc, ${wavelengthToColor(parseFloat(selected.wavelengthNm))}44)`,
                  boxShadow: `0 0 12px ${wavelengthToColor(parseFloat(selected.wavelengthNm))}60`,
                }}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-xs">Address</span>
                  <span className="font-bold text-base" style={{ color: wavelengthToColor(parseFloat(selected.wavelengthNm)) }}>
                    {fmtWavelength(selected.wavelengthNm)} nm
                  </span>
                  <span className="text-white/40 text-xs">·</span>
                  <span className="text-white/60 text-xs">{selected.psiChannel}</span>
                  <span className="text-white/40 text-xs">·</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: bandColor(selected.band), background: `${bandColor(selected.band)}18`, border: `1px solid ${bandColor(selected.band)}40` }}>
                    {selected.band}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-white/30 text-[11px]">{fmtEnergy(selected.energyJoules)}</span>
                  <span className="text-white/20 text-[11px]">·</span>
                  <span className="text-white/30 text-[11px] truncate max-w-xs">λ = hf/c²</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyWavelength}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-xs transition-colors"
                  data-testid="button-copy-wavelength"
                >
                  {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                  {copied ? "Copied" : "Share"}
                </button>
                <button
                  onClick={() => setView(v => v === "edit" ? "read" : "edit")}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-xs transition-colors"
                  data-testid="button-toggle-view"
                >
                  {view === "edit" ? <Eye size={11} /> : <FileText size={11} />}
                  {view === "edit" ? "Preview" : "Edit"}
                </button>
                <button
                  onClick={() => deleteMut.mutate(selected.id)}
                  disabled={deleteMut.isPending}
                  className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded px-2 py-1 text-xs text-red-400 transition-colors disabled:opacity-40"
                  data-testid="button-delete-document"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="border-b border-white/5 px-6 pt-6 pb-3">
            <input
              type="text"
              placeholder="Document title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={view === "read"}
              data-testid="input-document-title"
              className="w-full bg-transparent text-2xl font-bold text-white placeholder-white/20 focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden relative">
            {view === "edit" ? (
              <textarea
                ref={textareaRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={"Write here…\n\nYour words will be encoded into light.\nEvery sentence becomes a wavelength address.\nNo URL. No server. Just physics."}
                data-testid="textarea-document-body"
                className="absolute inset-0 w-full h-full bg-transparent text-white/80 placeholder-white/20 text-sm leading-7 px-6 py-4 resize-none focus:outline-none"
              />
            ) : (
              <div className="absolute inset-0 overflow-y-auto px-6 py-4">
                <div className="text-white/80 text-sm leading-7 whitespace-pre-wrap">{body}</div>
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="border-t border-white/10 px-6 py-3 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3 text-xs text-white/30">
              {saveMut.isSuccess && selected && (
                <>
                  <Zap size={11} className="text-yellow-400" />
                  <span>Stored at <span className="text-white/50">{fmtWavelength(selected.wavelengthNm)} nm</span></span>
                </>
              )}
              {saveMut.isError && (
                <span className="text-red-400">{(saveMut.error as Error).message}</span>
              )}
              {tuneMut.isSuccess && (tuneMut.data?.records?.length === 0) && (
                <span className="text-yellow-400/70">Nothing found at that wavelength ±5nm</span>
              )}
              {!saveMut.isSuccess && !saveMut.isError && (
                <span>Content is encoded into its natural wavelength on save</span>
              )}
            </div>

            <button
              onClick={() => saveMut.mutate()}
              disabled={isSaving || !title.trim() || !body.trim()}
              data-testid="button-save-document"
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: isSaving ? "#ffffff10" : "#ffffff15",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
            >
              <Save size={13} />
              {isSaving ? "Encoding to spectrum…" : "Save to Spectrum"}
            </button>
          </div>
        </div>

        {/* ── Spectral info panel (right) — shown when doc is selected ── */}
        {selected && (
          <div className="w-56 border-l border-white/10 bg-black/40 flex flex-col">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-white/40 text-xs uppercase tracking-widest">Spectral Info</span>
            </div>

            {/* Spectrum strip */}
            <div
              className="mx-4 mt-4 h-2 rounded-full"
              style={{
                background: "linear-gradient(to right, #8b00ff, #7b2fff, #0047ff, #00c8ff, #00e04b, #ffe000, #ff8000, #ff2000)",
              }}
            />
            {/* Indicator */}
            <div className="mx-4 relative h-3">
              <div
                className="absolute top-0 w-0.5 h-3 rounded"
                style={{
                  left: `${Math.min(100, Math.max(0, ((parseFloat(selected.wavelengthNm) - 380) / (780 - 380)) * 100))}%`,
                  background: wavelengthToColor(parseFloat(selected.wavelengthNm)),
                  boxShadow: `0 0 6px ${wavelengthToColor(parseFloat(selected.wavelengthNm))}`,
                }}
              />
            </div>

            <div className="px-4 mt-4 space-y-3 text-xs">
              <InfoRow label="Wavelength" value={`${fmtWavelength(selected.wavelengthNm)} nm`} color={color} />
              <InfoRow label="Channel"    value={selected.psiChannel} />
              <InfoRow label="Band"       value={selected.band} color={bandColor(selected.band)} />
              <InfoRow label="Energy"     value={fmtEnergy(selected.energyJoules)} />
              <InfoRow label="Equation"   value="Λ = hf/c²" />
            </div>

            <div className="mt-auto px-4 pb-4">
              <div className="border border-white/5 rounded p-3 text-[10px] text-white/30 leading-relaxed">
                This document exists at {fmtWavelength(selected.wavelengthNm)} nm in the electromagnetic spectrum.
                No server owns it. Physics addresses it.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-white/25 uppercase tracking-wider text-[9px]">{label}</span>
      <span className="text-white/70 break-all" style={color ? { color } : {}}>{value}</span>
    </div>
  );
}
