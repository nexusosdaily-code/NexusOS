import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft, Save, Radio, Copy, Check, FileText, Plus, Trash2,
  Zap, Eye, Video, Upload, Play, Film
} from "lucide-react";

// ── Wavelength → visible colour ───────────────────────────────────────────────
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
  if (!v) return "—";
  const exp = Math.floor(Math.log10(Math.abs(v)));
  return `${(v / Math.pow(10, exp)).toFixed(2)}×10^${exp} J`;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  data?: any;
  createdAt?: string;
}

type TabType = "documents" | "videos";

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SpectralWorkspace() {
  const qc = useQueryClient();
  const [tab, setTab]           = useState<TabType>("documents");

  // Document state
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [selected, setSelected] = useState<SpectralRecord | null>(null);
  const [tuneInput, setTuneInput] = useState("");
  const [copied, setCopied]     = useState(false);
  const [view, setView]         = useState<"edit" | "read">("edit");
  const textareaRef             = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (tab === "documents") textareaRef.current?.focus(); }, [tab]);

  // Video state
  const [videoTitle, setVideoTitle]       = useState("");
  const [videoDesc, setVideoDesc]         = useState("");
  const [videoDrag, setVideoDrag]         = useState(false);
  const [videoSelected, setVideoSelected] = useState<SpectralRecord | null>(null);
  const [videoSrc, setVideoSrc]           = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo]   = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile]     = useState<File | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: libData, isLoading: libLoading } = useQuery<{ records: SpectralRecord[] }>({
    queryKey: ["/api/spectral-db/scan"],
    refetchInterval: 8000,
  });
  const { data: vidData, isLoading: vidLoading } = useQuery<{ records: SpectralRecord[] }>({
    queryKey: ["/api/spectral-workspace/videos"],
    refetchInterval: 8000,
  });

  const allRecords = libData?.records ?? [];
  const docRecords = allRecords.filter(r => !r.data || r.data?.type !== "video");
  const vidRecords = vidData?.records ?? [];

  // ── Save document ─────────────────────────────────────────────────────────────
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and content required");
      const res = await apiRequest("POST", "/api/spectral-db/store", { label: title.trim(), content: body.trim() });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      if (data.record) setSelected(data.record);
      setView("read");
    },
  });

  // ── Tune ──────────────────────────────────────────────────────────────────────
  const tuneMut = useMutation({
    mutationFn: async (nm: string) => {
      const res = await apiRequest("GET", `/api/spectral-db/search?wavelength=${encodeURIComponent(nm)}&range=5`);
      return res.json();
    },
    onSuccess: (data) => {
      const records: SpectralRecord[] = data.records ?? [];
      if (records.length > 0) openRecord(records[0]);
    },
  });

  // ── Delete document ───────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/spectral-db/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] }); newDocument(); },
  });

  // ── Upload video ──────────────────────────────────────────────────────────────
  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!videoTitle.trim()) throw new Error("Video title required");
      const base64 = await fileToBase64(file);
      const res = await apiRequest("POST", "/api/spectral-workspace/video", {
        title:     videoTitle.trim(),
        description: videoDesc.trim() || videoTitle.trim(),
        videoData: base64,
        mimeType:  file.type,
        fileSize:  file.size,
        filename:  file.name,
      });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-workspace/videos"] });
      setPendingFile(null);
      setVideoTitle("");
      setVideoDesc("");
      if (data.record) setVideoSelected(data.record);
    },
  });

  // ── Load video for playback ───────────────────────────────────────────────────
  async function loadVideo(rec: SpectralRecord) {
    setVideoSelected(rec);
    setVideoSrc(null);
    setLoadingVideo(true);
    try {
      const videoId = rec.data?.videoId;
      if (!videoId) return;
      const res = await apiRequest("GET", `/api/spectral-workspace/video/${videoId}`);
      const d = await res.json();
      if (d.video?.videoData) {
        setVideoSrc(`data:${d.video.mimeType};base64,${d.video.videoData}`);
      }
    } finally { setLoadingVideo(false); }
  }

  // ── File helpers ──────────────────────────────────────────────────────────────
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data: prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setVideoDrag(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) setPendingFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
  }

  // ── Document helpers ──────────────────────────────────────────────────────────
  function newDocument() { setSelected(null); setTitle(""); setBody(""); setView("edit"); }
  function openRecord(r: SpectralRecord) { setSelected(r); setTitle(r.label); setBody(r.content); setView("read"); }
  function copyWavelength() {
    if (!selected) return;
    navigator.clipboard.writeText(fmtWavelength(selected.wavelengthNm) + " nm");
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }

  const color = selected ? wavelengthToColor(parseFloat(selected.wavelengthNm)) : "#6b7280";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-4 bg-black/80 backdrop-blur">
        <Link href="/nexus-command">
          <button className="text-white/40 hover:text-white transition-colors flex items-center gap-1 text-sm">
            <ArrowLeft size={14} /> Hub
          </button>
        </Link>

        <div className="flex items-center gap-1 border border-white/10 rounded overflow-hidden">
          <button
            onClick={() => setTab("documents")}
            data-testid="tab-documents"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${tab === "documents" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
          >
            <FileText size={11} /> Documents
          </button>
          <button
            onClick={() => setTab("videos")}
            data-testid="tab-videos"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${tab === "videos" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
          >
            <Video size={11} /> Video Clips
            {vidRecords.length > 0 && <span className="bg-white/10 rounded px-1 text-[9px]">{vidRecords.length}</span>}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
          <span className="text-white/50 text-xs uppercase tracking-widest">Spectral Workspace</span>
        </div>

        {tab === "documents" && (
          <>
            <div className="flex items-center gap-2">
              <Radio size={13} className="text-white/40" />
              <input
                type="number" placeholder="Tune nm…" value={tuneInput}
                onChange={e => setTuneInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && tuneInput) tuneMut.mutate(tuneInput); }}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-28 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                data-testid="input-tune-wavelength"
              />
              <button onClick={() => tuneInput && tuneMut.mutate(tuneInput)} disabled={tuneMut.isPending || !tuneInput}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-xs transition-colors disabled:opacity-40" data-testid="button-tune">
                {tuneMut.isPending ? "…" : "Tune"}
              </button>
            </div>
            <button onClick={newDocument}
              className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-3 py-1 text-xs transition-colors" data-testid="button-new-document">
              <Plus size={12} /> New
            </button>
          </>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div className="w-64 border-r border-white/10 flex flex-col bg-black/40">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-white/40 text-xs uppercase tracking-widest">
              {tab === "documents" ? "Documents" : "Video Clips"}
            </span>
            <span className="text-white/20 text-xs">
              {tab === "documents" ? `${docRecords.length}` : `${vidRecords.length}`}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tab === "documents" && (
              <>
                {libLoading && <div className="px-4 py-6 text-white/20 text-xs">Scanning spectrum…</div>}
                {!libLoading && docRecords.length === 0 && (
                  <div className="px-4 py-6 text-white/20 text-xs leading-relaxed">No documents yet. Write something and save it.</div>
                )}
                {docRecords.map(r => {
                  const nm = parseFloat(r.wavelengthNm);
                  const col = wavelengthToColor(nm);
                  const isAct = selected?.id === r.id;
                  return (
                    <button key={r.id} onClick={() => openRecord(r)} data-testid={`doc-item-${r.id}`}
                      className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${isAct ? "bg-white/8" : ""}`}>
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
              </>
            )}

            {tab === "videos" && (
              <>
                {vidLoading && <div className="px-4 py-6 text-white/20 text-xs">Scanning spectrum…</div>}
                {!vidLoading && vidRecords.length === 0 && (
                  <div className="px-4 py-6 text-white/20 text-xs leading-relaxed">No video clips yet. Upload one and it will live at its wavelength.</div>
                )}
                {vidRecords.map(r => {
                  const nm = parseFloat(r.wavelengthNm);
                  const col = wavelengthToColor(nm);
                  const isAct = videoSelected?.id === r.id;
                  return (
                    <button key={r.id} onClick={() => loadVideo(r)} data-testid={`video-item-${r.id}`}
                      className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${isAct ? "bg-white/8" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Film size={11} style={{ color: col, flexShrink: 0 }} />
                        <span className="text-white/80 text-xs truncate flex-1">{r.label}</span>
                      </div>
                      <div className="flex items-center gap-2 pl-4">
                        <span className="text-white/30 text-[10px]">{fmtWavelength(r.wavelengthNm)} nm</span>
                        <span className="text-[9px] px-1 rounded" style={{ color: bandColor(r.band), border: `1px solid ${bandColor(r.band)}40` }}>{r.band}</span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── Main panel ───────────────────────────────────────────── */}
        {tab === "documents" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Wavelength address bar */}
            {selected && (
              <div className="border-b border-white/10 px-6 py-3 flex items-center gap-4" style={{ background: `${wavelengthToColor(parseFloat(selected.wavelengthNm))}08` }}>
                <div className="w-8 h-8 rounded flex-shrink-0" style={{
                  background: `linear-gradient(135deg, ${wavelengthToColor(parseFloat(selected.wavelengthNm))}cc, ${wavelengthToColor(parseFloat(selected.wavelengthNm))}44)`,
                  boxShadow: `0 0 12px ${wavelengthToColor(parseFloat(selected.wavelengthNm))}60`,
                }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">Address</span>
                    <span className="font-bold text-base" style={{ color: wavelengthToColor(parseFloat(selected.wavelengthNm)) }}>{fmtWavelength(selected.wavelengthNm)} nm</span>
                    <span className="text-white/40 text-xs">·</span>
                    <span className="text-white/60 text-xs">{selected.psiChannel}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: bandColor(selected.band), background: `${bandColor(selected.band)}18`, border: `1px solid ${bandColor(selected.band)}40` }}>{selected.band}</span>
                  </div>
                  <div className="text-white/30 text-[11px] mt-0.5">{fmtEnergy(selected.energyJoules)} · λ = hf/c²</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyWavelength} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-xs transition-colors" data-testid="button-copy-wavelength">
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />} {copied ? "Copied" : "Share"}
                  </button>
                  <button onClick={() => setView(v => v === "edit" ? "read" : "edit")} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 text-xs transition-colors" data-testid="button-toggle-view">
                    {view === "edit" ? <Eye size={11} /> : <FileText size={11} />} {view === "edit" ? "Preview" : "Edit"}
                  </button>
                  <button onClick={() => deleteMut.mutate(selected.id)} disabled={deleteMut.isPending} className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded px-2 py-1 text-xs text-red-400 transition-colors" data-testid="button-delete-document">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            )}

            <div className="border-b border-white/5 px-6 pt-6 pb-3">
              <input type="text" placeholder="Document title…" value={title} onChange={e => setTitle(e.target.value)}
                disabled={view === "read"} data-testid="input-document-title"
                className="w-full bg-transparent text-2xl font-bold text-white placeholder-white/20 focus:outline-none disabled:opacity-60" />
            </div>

            <div className="flex-1 overflow-hidden relative">
              {view === "edit" ? (
                <textarea ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
                  placeholder={"Write here…\n\nYour words will be encoded into light.\nEvery sentence becomes a wavelength address."}
                  data-testid="textarea-document-body"
                  className="absolute inset-0 w-full h-full bg-transparent text-white/80 placeholder-white/20 text-sm leading-7 px-6 py-4 resize-none focus:outline-none" />
              ) : (
                <div className="absolute inset-0 overflow-y-auto px-6 py-4">
                  <div className="text-white/80 text-sm leading-7 whitespace-pre-wrap">{body}</div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-6 py-3 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3 text-xs text-white/30">
                {saveMut.isSuccess && selected && <><Zap size={11} className="text-yellow-400" /><span>Stored at <span className="text-white/50">{fmtWavelength(selected.wavelengthNm)} nm</span></span></>}
                {saveMut.isError && <span className="text-red-400">{(saveMut.error as Error).message}</span>}
                {!saveMut.isSuccess && !saveMut.isError && <span>Content is encoded into its natural wavelength on save</span>}
              </div>
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !title.trim() || !body.trim()}
                data-testid="button-save-document"
                className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: "#ffffff15", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}>
                <Save size={13} /> {saveMut.isPending ? "Encoding to spectrum…" : "Save to Spectrum"}
              </button>
            </div>
          </div>
        ) : (
          /* ── VIDEO TAB ────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Video player / upload area */}
            {videoSelected && videoSrc ? (
              <div className="flex-1 flex flex-col">
                {/* Address bar */}
                <div className="border-b border-white/10 px-6 py-3 flex items-center gap-4"
                  style={{ background: `${wavelengthToColor(parseFloat(videoSelected.wavelengthNm))}08` }}>
                  <div className="w-8 h-8 rounded flex-shrink-0" style={{
                    background: `linear-gradient(135deg, ${wavelengthToColor(parseFloat(videoSelected.wavelengthNm))}cc, ${wavelengthToColor(parseFloat(videoSelected.wavelengthNm))}44)`,
                    boxShadow: `0 0 12px ${wavelengthToColor(parseFloat(videoSelected.wavelengthNm))}60`,
                  }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-xs">Address</span>
                      <span className="font-bold" style={{ color: wavelengthToColor(parseFloat(videoSelected.wavelengthNm)) }}>
                        {fmtWavelength(videoSelected.wavelengthNm)} nm
                      </span>
                      <span className="text-white/60 text-xs">{videoSelected.psiChannel}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: bandColor(videoSelected.band), background: `${bandColor(videoSelected.band)}18`, border: `1px solid ${bandColor(videoSelected.band)}40` }}>
                        {videoSelected.band}
                      </span>
                    </div>
                    <div className="text-white/30 text-[11px] mt-0.5">λ = hf/c² · {fmtEnergy(videoSelected.energyJoules)}</div>
                  </div>
                  <span className="text-white/40 text-xs">{videoSelected.label}</span>
                </div>

                {/* Player */}
                <div className="flex-1 flex items-center justify-center bg-black p-6">
                  <video
                    src={videoSrc}
                    controls
                    autoPlay={false}
                    data-testid="video-player"
                    className="max-h-full max-w-full rounded-lg"
                    style={{ boxShadow: `0 0 40px ${wavelengthToColor(parseFloat(videoSelected.wavelengthNm))}30` }}
                  />
                </div>
              </div>
            ) : videoSelected && loadingVideo ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-white/30 text-sm animate-pulse">Loading from spectrum…</div>
              </div>
            ) : (
              /* Upload area */
              <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
                <div className="text-white/50 text-sm mb-2">
                  Upload a video clip — its title gets encoded to a wavelength address. The clip lives at that frequency.
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={e => { e.preventDefault(); setVideoDrag(true); }}
                  onDragLeave={() => setVideoDrag(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="dropzone-video"
                  className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all"
                  style={{ borderColor: videoDrag ? "#22c55e" : "rgba(255,255,255,0.1)", background: videoDrag ? "#22c55e08" : "transparent" }}
                >
                  {pendingFile ? (
                    <div>
                      <Film size={28} className="mx-auto mb-2 text-green-400" />
                      <div className="text-white/70 text-sm font-bold">{pendingFile.name}</div>
                      <div className="text-white/30 text-xs mt-1">{fmtSize(pendingFile.size)} · {pendingFile.type}</div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={28} className="mx-auto mb-2 text-white/20" />
                      <div className="text-white/40 text-sm">Drop a video clip here or click to browse</div>
                      <div className="text-white/20 text-xs mt-1">MP4, WebM, MOV · max 100MB</div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileInput} data-testid="input-video-file" />
                </div>

                {/* Title + description */}
                <input
                  type="text" placeholder="Video title (this becomes the wavelength address)…"
                  value={videoTitle} onChange={e => setVideoTitle(e.target.value)}
                  data-testid="input-video-title"
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                />
                <textarea
                  placeholder="Description (optional)…"
                  value={videoDesc} onChange={e => setVideoDesc(e.target.value)}
                  rows={3} data-testid="textarea-video-desc"
                  className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                />

                <button
                  onClick={() => pendingFile && uploadMut.mutate(pendingFile)}
                  disabled={!pendingFile || !videoTitle.trim() || uploadMut.isPending}
                  data-testid="button-upload-video"
                  className="flex items-center justify-center gap-2 py-3 rounded text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: "#ffffff15", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
                >
                  <Zap size={13} />
                  {uploadMut.isPending ? "Encoding to spectrum…" : "Encode & Store at Wavelength"}
                </button>

                {uploadMut.isSuccess && uploadMut.data?.record && (
                  <div className="text-center text-xs" style={{ color: wavelengthToColor(parseFloat(uploadMut.data.record.wavelengthNm)) }}>
                    Stored at {fmtWavelength(uploadMut.data.record.wavelengthNm)} nm · {uploadMut.data.record.psiChannel}
                  </div>
                )}
                {uploadMut.isError && (
                  <div className="text-red-400 text-xs text-center">{(uploadMut.error as Error).message}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
