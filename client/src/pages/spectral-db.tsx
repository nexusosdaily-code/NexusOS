import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import {
  Database, Search, Zap, Map, Trash2, Copy, Check,
  Download, Upload, Radio, ArrowRight, Layers, Send,
  Play, Pause, Film, Lock, X, ChevronRight, Activity,
} from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────────────────
const h = 6.626e-34, c_light = 299_792_458;

// ── WASCII v1.0 table (202 chars, CE→SE encoding standard) ───────────────────
const WASCII: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(65 + i), 380 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(97 + i), 383 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 536 + i * 6])),
  " ": 596, ".": 602, ",": 608, "!": 614, "?": 620, ":": 626, ";": 632,
  "-": 638, "_": 644, "/": 650, "\\": 656, "@": 662, "#": 668, "$": 674,
  "%": 680, "&": 686, "*": 692, "(": 698, ")": 704, "[": 710, "]": 716,
  "{": 722, "}": 728, "|": 734, "<": 740, ">": 746, "=": 752, "+": 758,
  "λ": 790, "Λ": 839, "ψ": 823, "Ψ": 854, "π": 802,
};

function wasciiNm(char: string): number {
  return WASCII[char] ?? (380 + (char.charCodeAt(0) % 256) / 255 * 400);
}

function ceToSe(text: string) {
  if (!text) return null;
  const chars = Array.from(text);
  const nms = chars.map(c => wasciiNm(c));
  const avg = nms.reduce((a, b) => a + b, 0) / nms.length;
  const sum = chars.reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const wdm = Math.floor((avg - 380) / 4) + 1;
  const oam = sum % 100;
  const pol = chars.length % 2 === 0 ? "H" : "V";
  const freq = c_light / (avg * 1e-9);
  const energy = h * freq;
  return {
    nm: avg, wdm, oam, pol,
    psi: `Ψ(${wdm},${oam},${pol})`,
    uri: `wnsp://Ψ(${wdm},${oam},${pol})/${encodeURIComponent(text.toLowerCase().replace(/\s+/g, "-"))}`,
    freq, energy,
    chars: chars.map((ch, i) => ({ ch, nm: nms[i], inWascii: ch in WASCII })),
  };
}

// ── Band helpers ──────────────────────────────────────────────────────────────
function getBand(nm: number) {
  if (nm < 450) return { name: "SYSTEM", color: "#8b00ff" };
  if (nm < 490) return { name: "AUTH",   color: "#0050ff" };
  if (nm < 520) return { name: "STREAM", color: "#00cfcf" };
  if (nm < 565) return { name: "CORE",   color: "#00c800" };
  if (nm < 590) return { name: "UI",     color: "#cccc00" };
  if (nm < 625) return { name: "EVENT",  color: "#ff8c00" };
  return               { name: "STORAGE",color: "#cc0000" };
}
function bandColor(band: string) {
  const m: Record<string, string> = {
    SYSTEM: "#8b00ff", AUTH: "#0050ff", STREAM: "#00cfcf",
    CORE: "#00c800",   UI: "#cccc00",   EVENT: "#ff8c00", STORAGE: "#cc0000",
  };
  return m[band] ?? "#94a3b8";
}
function nmToHex(nm: number): string {
  const t = Math.max(0, Math.min(1, (nm - 380) / 400));
  const stops: [number, string][] = [
    [0,    "#8b00ff"], [0.18, "#0050ff"], [0.35, "#00cfcf"],
    [0.5,  "#00c800"], [0.65, "#cccc00"], [0.8,  "#ff8c00"], [1,    "#cc0000"],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const lerp = (a: number, b: number) => Math.round(a + (b - a) * f);
      const r0 = parseInt(c0.slice(1, 3), 16), g0 = parseInt(c0.slice(3, 5), 16), b0 = parseInt(c0.slice(5, 7), 16);
      const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
      return `#${lerp(r0,r1).toString(16).padStart(2,'0')}${lerp(g0,g1).toString(16).padStart(2,'0')}${lerp(b0,b1).toString(16).padStart(2,'0')}`;
    }
  }
  return "#94a3b8";
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function SpectrumRuler({ records, highlightNm }: { records: any[]; highlightNm?: number }) {
  return (
    <div className="relative">
      <div className="h-3 w-full rounded"
        style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }}>
        {records.map((r, i) => {
          const nm = parseFloat(r.wavelengthNm ?? r.nm ?? 540);
          const pct = ((nm - 380) / 400) * 100;
          return <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: `${pct}%` }} />;
        })}
        {highlightNm != null && (
          <div className="absolute top-0 bottom-0 w-1 bg-white rounded"
            style={{ left: `${((highlightNm - 380) / 400) * 100}%`, transform: "translateX(-50%)" }} />
        )}
      </div>
      <div className="flex justify-between text-xs font-mono text-slate-700 mt-0.5">
        <span>380nm</span><span>480nm</span><span>560nm</span><span>630nm</span><span>780nm</span>
      </div>
    </div>
  );
}

function RecordCard({ record, onDelete, onSendToBus }: { record: any; onDelete: () => void; onSendToBus: (r: any) => void }) {
  const nm  = parseFloat(record.wavelengthNm);
  const bc  = bandColor(record.band ?? getBand(nm).name);
  return (
    <div className="rounded-lg border p-3 bg-slate-900/60" style={{ borderColor: `${bc}40` }}
      data-testid={`record-${record.id}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: bc }} />
          <span className="font-semibold text-sm text-slate-100 truncate">{record.label}</span>
          <span className="text-xs px-1 py-0.5 rounded font-mono flex-shrink-0"
            style={{ background: `${bc}20`, color: bc, border: `1px solid ${bc}40` }}>
            {record.band}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onSendToBus(record)} className="text-slate-700 hover:text-cyan-400 transition-colors" title="Route to agent bus">
            <Radio className="w-3.5 h-3.5" />
          </button>
          <CopyBtn text={record.psiChannel} />
          <button onClick={onDelete} className="text-slate-700 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-2 line-clamp-1">{record.content}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono text-slate-500">
        <span style={{ color: bc }}>λ {nm.toFixed(1)} nm</span>
        <span className="text-slate-400">{record.psiChannel}</span>
        <span>{parseFloat(record.energyJoules ?? 0).toExponential(2)} J</span>
      </div>
    </div>
  );
}

// ── TAB: WRITE — CE→SE encoder + store ───────────────────────────────────────
const WRITE_PRESETS = [
  { label: "nexus_os_kernel",     content: "spectral operating system kernel managing photonic channels and agent communication" },
  { label: "wnsp_uri_resolver",   content: "WNSP URI resolver maps physical wavelength addresses to network endpoints" },
  { label: "lambda_gate_photon",  content: "photonic logic gate operator performing Boolean operations on polarised light beams" },
  { label: "auth_spectral_token", content: "spectral authentication token encoded at authority band wavelength" },
  { label: "video_stream_node",   content: "video streaming node distributing media over spectral mesh network" },
];

function WriteTab({ onStored, records }: { onStored: () => void; records: any[] }) {
  const [content, setContent] = useState(WRITE_PRESETS[0].content);
  const [label,   setLabel]   = useState(WRITE_PRESETS[0].label);
  const [mineToo, setMineToo] = useState(false);
  const [result,  setResult]  = useState<any>(null);
  const [mineResult, setMineResult] = useState<any>(null);

  const enc = ceToSe(content);
  const bc  = enc ? nmToHex(enc.nm) : "#06b6d4";

  const storeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/spectral-db/store", { content, label }).then(r => r.json()),
    onSuccess: async (data) => {
      setResult(data);
      onStored();
      if (mineToo && data?.success) {
        try {
          const mr = await apiRequest("POST", "/api/blockchain/mine", {
            content: `SPECTRAL_WRITE ${label} λ=${data.spectral?.wavelength_mid_nm?.toFixed(1)}nm ${data.spectral?.psi_channel}`,
          });
          setMineResult(await mr.json());
        } catch {}
      }
    },
  });

  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">
        Describe what you are writing. The CE→SE process derives a physical wavelength address from the text —
        that wavelength <em>is</em> the address. No ID is assigned; physics assigns the location.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Content — what you are writing to the spectral DB</Label>
            <Textarea value={content} onChange={e => { setContent(e.target.value); setResult(null); }}
              className="bg-slate-800 border-slate-600 text-slate-200 text-sm min-h-24"
              data-testid="input-content" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WRITE_PRESETS.map((p, i) => (
              <button key={i} onClick={() => { setContent(p.content); setLabel(p.label); setResult(null); }}
                className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-500 hover:text-slate-200 hover:border-slate-500 font-mono"
                data-testid={`preset-${i}`}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Label / key</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)}
              className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
              data-testid="input-label" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
            <input type="checkbox" checked={mineToo} onChange={e => setMineToo(e.target.checked)}
              className="rounded" data-testid="check-mine" />
            Anchor to blockchain
          </label>
          <Button className="w-full bg-cyan-700 hover:bg-cyan-600" onClick={() => storeMutation.mutate()}
            disabled={storeMutation.isPending || !content || !label}
            data-testid="btn-store">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {storeMutation.isPending ? "Writing…" : "Write to Spectral DB"}
          </Button>
        </div>
      </div>

      {/* Live CE→SE derivation */}
      {enc && content.length > 0 && (
        <div className="rounded-xl border border-slate-700 p-4 space-y-4 bg-slate-900/50">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Live CE→SE Derivation</div>

          {/* Char table (first 12 chars) */}
          <div className="overflow-x-auto">
            <table className="text-xs font-mono w-full min-w-0">
              <thead>
                <tr className="text-slate-600">
                  <th className="text-left pr-3 pb-1">char</th>
                  <th className="text-left pr-3 pb-1">nm</th>
                  <th className="text-left pr-3 pb-1">color</th>
                  <th className="text-left pb-1">WASCII</th>
                </tr>
              </thead>
              <tbody>
                {enc.chars.slice(0, 12).map((c, i) => (
                  <tr key={i}>
                    <td className="pr-3 text-slate-200 font-bold">{c.ch === " " ? "·" : c.ch}</td>
                    <td className="pr-3" style={{ color: nmToHex(c.nm) }}>{c.nm.toFixed(0)}</td>
                    <td className="pr-3">
                      <div className="w-4 h-4 rounded-sm" style={{ background: nmToHex(c.nm) }} />
                    </td>
                    <td className="text-slate-600">{c.inWascii ? "✓" : "derived"}</td>
                  </tr>
                ))}
                {enc.chars.length > 12 && (
                  <tr><td colSpan={4} className="text-slate-600 pt-1">+{enc.chars.length - 12} more chars…</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Spectrum position */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-500 mb-1">
              <span>avg λ = <span style={{ color: bc }}>{enc.nm.toFixed(2)} nm</span></span>
              <span>sum mod 100 = {enc.oam} (OAM)</span>
              <span>len {enc.chars.length} → pol {enc.pol}</span>
            </div>
            <div className="relative h-5 rounded overflow-hidden"
              style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }}>
              <div className="absolute top-0 bottom-0 w-2 rounded-full border-2 border-white"
                style={{ left: `${((enc.nm - 380) / 400) * 100}%`, transform: "translateX(-50%)", background: bc }} />
            </div>
          </div>

          {/* Derived address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { label: "Ψ Channel",   value: enc.psi,            color: bc },
              { label: "WDM",         value: String(enc.wdm) },
              { label: "OAM / Pol",   value: `${enc.oam} / ${enc.pol}` },
              { label: "λ",           value: `${enc.nm.toFixed(2)} nm`,  color: bc },
              { label: "Frequency",   value: `${(enc.freq / 1e12).toFixed(3)} THz` },
              { label: "Energy",      value: `${enc.energy.toExponential(2)} J` },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-slate-800 rounded text-xs font-mono">
                <div className="text-slate-500 mb-0.5">{item.label}</div>
                <div style={{ color: item.color ?? "#e2e8f0" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* WNSP-URI */}
          <div className="flex items-center gap-2 p-2 rounded bg-slate-800 border border-slate-700">
            <span className="text-xs font-mono text-slate-500">URI</span>
            <span className="text-xs font-mono text-cyan-300 flex-1 truncate">{enc.uri}</span>
            <CopyBtn text={enc.uri} />
          </div>
        </div>
      )}

      {/* Success receipt */}
      {result?.success && (
        <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: `${bc}50`, background: `${bc}08` }}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="font-semibold text-slate-100 text-sm">Written to spectral DB</span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            {label} → λ {result.spectral?.wavelength_mid_nm?.toFixed(2)} nm · {result.spectral?.psi_channel}
          </div>
          {mineResult?.success && (
            <div className="flex items-center gap-2 text-xs font-mono text-violet-400">
              <Layers className="w-3 h-3" />
              Block #{mineResult.block?.blockNumber} anchored on-chain
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TAB: RETRIEVE — search + all records ─────────────────────────────────────
function RetrieveTab({ records, onDelete, onSendToBus, onExport }: {
  records: any[]; onDelete: (id: string) => void; onSendToBus: (r: any) => void; onExport: () => void;
}) {
  const [search,    setSearch]    = useState("");
  const [bandFilter,setBandFilter]= useState("ALL");
  const [wavelength,setWavelength]= useState(540);
  const [range,     setRange]     = useState(30);
  const [proxResults,setProxResults] = useState<any[] | null>(null);
  const [proxLoading,setProxLoading] = useState(false);
  const [mode, setMode] = useState<"browse"|"proximity">("browse");

  const BANDS = ["ALL","SYSTEM","AUTH","STREAM","CORE","UI","EVENT","STORAGE"];

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.label?.toLowerCase().includes(q) || r.content?.toLowerCase().includes(q) || r.psiChannel?.includes(q);
    const matchBand = bandFilter === "ALL" || r.band === bandFilter;
    return matchSearch && matchBand;
  }).sort((a, b) => parseFloat(a.wavelengthNm) - parseFloat(b.wavelengthNm));

  const runProximity = async () => {
    setProxLoading(true);
    try {
      const r = await apiRequest("GET", `/api/spectral-db/search?wavelength=${wavelength}&range=${range}`);
      const d = await r.json();
      setProxResults(d.records ?? []);
    } finally { setProxLoading(false); }
  };

  const displayRecords = mode === "proximity" ? (proxResults ?? []) : filtered;

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button onClick={() => setMode("browse")}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${mode==="browse" ? "bg-cyan-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
          Browse / Filter
        </button>
        <button onClick={() => setMode("proximity")}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${mode==="proximity" ? "bg-violet-700 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
          Proximity Search
        </button>
        <button onClick={onExport} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded text-xs font-mono bg-slate-800 text-slate-400 hover:text-white transition-all">
          <Download className="w-3 h-3" /> Export JSON
        </button>
      </div>

      {mode === "browse" && (
        <div className="flex flex-wrap gap-2">
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search labels, content, channel…"
            className="bg-slate-800 border-slate-600 text-slate-200 text-sm flex-1 min-w-48"
            data-testid="input-search" />
          <select value={bandFilter} onChange={e => setBandFilter(e.target.value)}
            className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs font-mono">
            {BANDS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
      )}

      {mode === "proximity" && (
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg bg-slate-900 border border-slate-700">
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Center wavelength (nm)</Label>
            <Input type="number" value={wavelength} onChange={e => setWavelength(Number(e.target.value))}
              className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm w-36" min={380} max={780} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Range ± (nm)</Label>
            <Input type="number" value={range} onChange={e => setRange(Number(e.target.value))}
              className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm w-28" min={1} max={200} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[{l:"SYSTEM",nm:420},{l:"AUTH",nm:470},{l:"STREAM",nm:505},{l:"CORE",nm:540},{l:"UI",nm:577},{l:"EVENT",nm:607},{l:"STORAGE",nm:700}].map(b => (
              <button key={b.l} onClick={() => setWavelength(b.nm)}
                className="px-2 py-1 text-xs font-mono rounded border transition-colors"
                style={{ borderColor: bandColor(b.l), color: bandColor(b.l), background: `${bandColor(b.l)}15` }}>
                {b.l}
              </button>
            ))}
          </div>
          <Button onClick={runProximity} disabled={proxLoading} className="bg-violet-700 hover:bg-violet-600">
            <Search className="w-3.5 h-3.5 mr-1" />
            {proxLoading ? "Searching…" : "Search"}
          </Button>
        </div>
      )}

      <div className="text-xs font-mono text-slate-600">
        {mode === "proximity" && proxResults !== null
          ? `${proxResults.length} records within ±${range}nm of ${wavelength}nm`
          : `${filtered.length} of ${records.length} records`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {displayRecords.map((r: any) => (
          <RecordCard key={r.id} record={r} onDelete={() => onDelete(r.id)} onSendToBus={onSendToBus} />
        ))}
        {displayRecords.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-600 font-mono text-sm">
            {mode === "proximity" && proxResults === null ? "Run a proximity search above." : "No records found."}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TAB: MEDIA — video upload + library ───────────────────────────────────────
function MediaTab() {
  const qc = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("auth_token"));
  const [showUpload, setShowUpload]  = useState(false);
  const [uploadFile, setUploadFile]  = useState<File | null>(null);
  const [uploadForm, setUploadForm]  = useState({ title: "", description: "" });
  const [uploadOk, setUploadOk]      = useState<string | null>(null);
  const [playingId, setPlayingId]    = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem("auth_token"));
    check();
    window.addEventListener("storage", check);
    window.addEventListener("focus", check);
    return () => { window.removeEventListener("storage", check); window.removeEventListener("focus", check); };
  }, []);

  const { data: videosData, isLoading } = useQuery<any>({
    queryKey: ["/api/spectral-workspace/videos"],
    refetchInterval: 30_000,
  });
  const videos: any[] = videosData?.videos ?? [];

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("No file selected");
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("LOGIN_REQUIRED");
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("title", uploadForm.title || uploadFile.name);
      if (uploadForm.description) form.append("description", uploadForm.description);
      const res = await fetch("/api/spectral-workspace/video", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: form,
      });
      if (res.status === 401) throw new Error("LOGIN_REQUIRED");
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Upload failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setUploadOk(data.videoId);
      setUploadForm({ title: "", description: "" });
      setUploadFile(null);
      setShowUpload(false);
      qc.refetchQueries({ queryKey: ["/api/spectral-workspace/videos"] });
    },
  });

  const enc = uploadFile ? ceToSe(uploadForm.title || uploadFile.name) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-slate-300 font-semibold">Spectral Media Store</div>
          <div className="text-xs text-slate-500">Videos encoded to Ψ channels — stream direct, no CDN, no DNS</div>
        </div>
        {isLoggedIn ? (
          <button onClick={() => { setShowUpload(v => !v); setUploadOk(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm transition-all"
            data-testid="btn-upload-video">
            <Upload className="w-4 h-4" /> Upload Media
          </button>
        ) : (
          <Link href="/auth">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:text-white transition-all">
              <Lock className="w-4 h-4" /> Log in to upload
            </button>
          </Link>
        )}
      </div>

      {/* Upload success banner */}
      {uploadOk && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-green-700/40 bg-green-900/20 text-green-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          Video uploaded and registered at its Ψ channel. It is now in the library below.
          <button onClick={() => setUploadOk(null)} className="ml-auto text-green-600 hover:text-green-400"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Upload form */}
      {showUpload && isLoggedIn && (
        <div className="rounded-xl border border-purple-800/40 bg-slate-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-purple-300 text-sm">Upload a Video</span>
              <span className="text-slate-600 text-xs">Max 200 MB</span>
            </div>
            <button onClick={() => setShowUpload(false)} className="text-slate-600 hover:text-slate-400"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Video file *</label>
                <input type="file" accept="video/*"
                  onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadOk(null); }}
                  className="block w-full text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:bg-purple-900/50 file:text-purple-300 hover:file:bg-purple-900"
                  data-testid="input-video-file" />
                {uploadFile && <div className="text-xs text-slate-500 mt-1">{uploadFile.name} — {(uploadFile.size / 1024 / 1024).toFixed(1)} MB</div>}
              </div>
              <Input placeholder="Title (defaults to filename)"
                value={uploadForm.title}
                onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white text-sm"
                data-testid="input-video-title" />
              <Textarea placeholder="Description (optional)"
                value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white text-sm resize-none" rows={2}
                data-testid="input-video-description" />
            </div>

            {/* Live CE→SE preview for title */}
            {enc && (
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
                <div className="text-xs font-mono text-slate-500">Storage address from title</div>
                <div className="text-sm font-mono" style={{ color: nmToHex(enc.nm) }}>{enc.psi}</div>
                <div className="text-xs font-mono text-slate-500">λ = {enc.nm.toFixed(1)} nm · {enc.pol} polarisation</div>
                <div className="relative h-2 rounded overflow-hidden"
                  style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }}>
                  <div className="absolute top-0 bottom-0 w-1 bg-white"
                    style={{ left: `${((enc.nm - 380) / 400) * 100}%`, transform: "translateX(-50%)" }} />
                </div>
                <div className="text-xs font-mono text-cyan-500 truncate">{enc.uri}</div>
              </div>
            )}
          </div>

          {uploadMutation.isError && (
            <div className="text-red-400 text-xs border border-red-800/40 rounded px-3 py-2">
              {(uploadMutation.error as Error).message === "LOGIN_REQUIRED"
                ? "You must be logged in. Go to /auth and sign in."
                : (uploadMutation.error as Error).message}
            </div>
          )}
          {uploadMutation.isPending && (
            <div className="text-purple-300 text-xs border border-purple-800/40 rounded px-3 py-2">
              Uploading — large files take 15–60 seconds, please wait…
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => uploadMutation.mutate()}
              disabled={!uploadFile || uploadMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm transition-all"
              data-testid="btn-confirm-upload">
              <Upload className="w-3.5 h-3.5" />
              {uploadMutation.isPending ? "Uploading…" : "Upload & Register"}
            </button>
            <button onClick={() => setShowUpload(false)} className="px-3 py-2 text-sm text-slate-400 hover:text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Video library */}
      {isLoading ? (
        <div className="text-slate-600 text-sm font-mono text-center py-8">Loading media library…</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 text-slate-600 font-mono text-sm">
          No videos stored yet.{" "}
          {isLoggedIn
            ? <button onClick={() => setShowUpload(true)} className="text-purple-400 hover:text-purple-300 underline">Upload one now.</button>
            : <Link href="/auth"><span className="text-purple-400 hover:text-purple-300 underline cursor-pointer">Log in to upload.</span></Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videos.map((v: any) => {
            const videoEnc = ceToSe(v.filename.replace(/\.[^.]+$/, ""));
            const bc = videoEnc ? nmToHex(videoEnc.nm) : "#8b5cf6";
            const isPlaying = playingId === v.id;
            return (
              <div key={v.id} className="rounded-xl border bg-slate-900/60 overflow-hidden"
                style={{ borderColor: `${bc}40` }}
                data-testid={`video-card-${v.id}`}>
                {isPlaying ? (
                  <div className="space-y-0">
                    <video ref={videoRef} controls autoPlay className="w-full max-h-64 bg-black"
                      src={`/api/spectral-workspace/video/${v.id}/stream`} />
                    <button onClick={() => setPlayingId(null)}
                      className="w-full py-2 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors">
                      <X className="w-3 h-3" /> Close player
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setPlayingId(v.id)}
                    className="w-full h-32 flex items-center justify-center gap-3 group transition-all"
                    style={{ background: `linear-gradient(135deg, ${bc}20, ${bc}08)` }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110"
                      style={{ borderColor: bc, background: `${bc}25` }}>
                      <Play className="w-5 h-5 ml-0.5" style={{ color: bc }} />
                    </div>
                    <Film className="w-6 h-6 text-slate-600 group-hover:text-slate-400" />
                  </button>
                )}
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100 text-sm truncate">{v.filename}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">{(v.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  {videoEnc && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span style={{ color: bc }}>{videoEnc.psi}</span>
                      <span className="text-slate-600">λ {videoEnc.nm.toFixed(0)} nm</span>
                      <CopyBtn text={`/api/spectral-workspace/video/${v.id}/stream`} />
                    </div>
                  )}
                  <div className="text-xs text-slate-600">
                    {new Date(v.createdAt).toLocaleDateString()} · uploaded by {v.uploaderName}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TAB: MAP — spectrum visualization ────────────────────────────────────────
function MapTab({ records }: { records: any[] }) {
  const [hovered, setHovered] = useState<any>(null);
  const BAND_ORDER = ["SYSTEM","AUTH","STREAM","CORE","UI","EVENT","STORAGE"];
  const bandGroups: Record<string, any[]> = {};
  records.forEach(r => {
    const b = r.band ?? "CORE";
    if (!bandGroups[b]) bandGroups[b] = [];
    bandGroups[b].push(r);
  });

  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">
        Every record mapped to its physical position on the electromagnetic spectrum.
        Auth records cluster in violet, core logic in green, storage in red.
        Physics categorises automatically — no tags, no folders.
      </p>
      {records.length === 0 ? (
        <div className="text-center py-12 text-slate-600 font-mono text-sm">
          No records yet — use Write to add data to the spectral database.
        </div>
      ) : (
        <>
          <div className="relative">
            <div className="h-12 w-full rounded-lg"
              style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }}>
              {records.map((r, i) => {
                const nm = parseFloat(r.wavelengthNm);
                const pct = ((nm - 380) / 400) * 100;
                return (
                  <div key={i} className="absolute top-0 bottom-0 flex items-center cursor-pointer"
                    style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                    onMouseEnter={() => setHovered(r)} onMouseLeave={() => setHovered(null)}
                    data-testid={`marker-${r.id}`}>
                    <div className="w-2.5 h-12 rounded-full border border-white/50 bg-white/20 hover:bg-white/60 transition-colors" />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs font-mono text-slate-600 mt-1">
              {BAND_ORDER.map((b, i) => (
                <span key={i} style={{ color: bandColor(b) }}>{b}</span>
              ))}
            </div>
          </div>

          {hovered && (
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono">
              <span className="text-slate-200 font-bold">{hovered.label}</span>
              <span className="text-slate-500 mx-2">·</span>
              <span style={{ color: bandColor(hovered.band) }}>λ {parseFloat(hovered.wavelengthNm).toFixed(1)} nm</span>
              <span className="text-slate-500 mx-2">·</span>
              <span className="text-slate-400">{hovered.psiChannel}</span>
              <p className="text-slate-600 mt-1 truncate">{hovered.content}</p>
            </div>
          )}

          <div>
            <div className="text-xs text-slate-500 font-mono mb-2">Records per band</div>
            {Object.entries(bandGroups)
              .sort(([a], [b]) => BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b))
              .map(([band, recs]) => {
                const bc = bandColor(band);
                const pct = Math.min(100, (recs.length / records.length) * 100 * 3);
                return (
                  <div key={band} className="flex items-center gap-2 mb-1.5">
                    <div className="w-14 text-right text-xs font-mono flex-shrink-0" style={{ color: bc }}>{band}</div>
                    <div className="flex-1 h-3 rounded bg-slate-900 overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: bc }} />
                    </div>
                    <span className="text-xs font-mono text-slate-600 w-8 text-right">{recs.length}</span>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

// ── TAB: IMPORT — bulk import ─────────────────────────────────────────────────
const IMPORT_EXAMPLE = `nexus_kernel | spectral operating system kernel managing photonic channels and agents
wnsp_protocol | WNSP spectral communication protocol replacing traditional network addressing
lambda_boson | Lambda boson theory extending mass-energy equivalence to oscillating quanta
snic_hardware | Spectral Network Interface Card providing 185000x multiplier via photonic routing
k1_energy | Kardashev Type One energy infrastructure integrating resonance and fusion photonics`;

function ImportTab({ onImported }: { onImported: () => void }) {
  const [text, setText]       = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runImport = async () => {
    const lines = text.split("\n").filter(l => l.includes("|"));
    if (!lines.length) return;
    setLoading(true); setResults([]);
    const out: any[] = [];
    for (const line of lines) {
      const [label, ...rest] = line.split("|");
      const content = rest.join("|").trim();
      try {
        const r = await apiRequest("POST", "/api/spectral-db/store", { label: label.trim(), content });
        const d = await r.json();
        out.push({ label: label.trim(), success: d.success, nm: d.spectral?.wavelength_mid_nm, band: d.spectral?.band, psi: d.spectral?.psi_channel });
      } catch (e: any) {
        out.push({ label: label.trim(), success: false, error: e.message });
      }
    }
    setResults(out); setLoading(false); onImported();
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Bulk-write records. Each line: <code className="text-slate-300 font-mono">label | content</code>.
        Each is independently encoded through CE→SE to its physical wavelength address.
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-400">Records (one per line)</Label>
          <button onClick={() => setText(IMPORT_EXAMPLE)}
            className="text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors">
            Load example
          </button>
        </div>
        <Textarea value={text} onChange={e => setText(e.target.value)}
          className="bg-slate-800 border-slate-600 text-slate-200 text-xs font-mono min-h-40"
          placeholder="label | content describing what this record means"
          data-testid="input-bulk" />
        <div className="text-xs text-slate-600 font-mono">
          {text.split("\n").filter(l => l.includes("|")).length} records to import
        </div>
      </div>
      <Button onClick={runImport} disabled={loading || !text.includes("|")} data-testid="btn-import">
        <Upload className="w-3 h-3 mr-1" />
        {loading ? "Writing…" : "Write All to Spectral DB"}
      </Button>
      {results.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-mono text-slate-500">
            {results.filter(r => r.success).length}/{results.length} written successfully
          </div>
          {results.map((r, i) => {
            const bc = r.band ? bandColor(r.band) : "#94a3b8";
            return (
              <div key={i} className="flex items-center gap-2 text-xs font-mono p-2 rounded bg-slate-900/60"
                data-testid={`import-result-${i}`}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: r.success ? "#16a34a" : "#dc2626" }} />
                <span className="text-slate-300">{r.label}</span>
                {r.success && <>
                  <ArrowRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                  <span style={{ color: bc }}>{r.nm?.toFixed(1)}nm</span>
                  <span className="text-slate-600">{r.psi}</span>
                </>}
                {!r.success && <span className="text-red-400">{r.error ?? "failed"}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Bus send panel ────────────────────────────────────────────────────────────
const AGENTS = ["os_kernel","bus_router","auth_gateway","scheduler_daemon","watchdog_daemon","blockchain_auditor"];

function BusSendPanel({ record, onDone }: { record: any; onDone: () => void }) {
  const [src, setSrc] = useState("os_kernel");
  const [dst, setDst] = useState("bus_router");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<any>(null);
  const bc = bandColor(record.band);

  const send = async () => {
    setSending(true);
    try {
      const r = await apiRequest("POST", "/api/agent-bus/send", {
        src, dst,
        payload: `SPECTRAL_RECORD ${record.label} λ=${parseFloat(record.wavelengthNm).toFixed(1)}nm ${record.psiChannel} — ${record.content?.slice(0, 60)}`,
        priority: 4, msgType: "EVENT",
      });
      setSent(await r.json());
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-xl border p-4 space-y-3 mb-4" style={{ borderColor: `${bc}40`, background: `${bc}08` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4" style={{ color: bc }} />
          <span className="text-sm font-semibold text-slate-200">Route to agent bus</span>
        </div>
        <button onClick={onDone} className="text-slate-600 hover:text-slate-400 text-xs"><X className="w-4 h-4" /></button>
      </div>
      <div className="text-xs font-mono" style={{ color: bc }}>
        {record.label} · {parseFloat(record.wavelengthNm).toFixed(1)}nm · {record.psiChannel}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[["From", src, setSrc], ["To", dst, setDst]].map(([lbl, val, setter]: any, i) => (
          <div key={i} className="space-y-1">
            <Label className="text-xs text-slate-400">{lbl}</Label>
            <select value={val} onChange={e => setter(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-xs">
              {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={send} disabled={sending || src === dst}>
          <Send className="w-3 h-3 mr-1" />
          {sending ? "Routing…" : "Send to Bus"}
        </Button>
        <Link href="/agent-bus" className="text-xs text-slate-600 hover:text-slate-400 font-mono">view bus →</Link>
      </div>
      {sent?.success && <p className="text-xs font-mono text-cyan-400">{sent.route} · depth {sent.queue_depth}</p>}
      {sent?.error   && <p className="text-xs font-mono text-red-400">{sent.error} — {sent.reason}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SpectralDbPage() {
  const [busPanelRecord, setBusPanelRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") ?? "write";
  });

  const { data: scanData, refetch } = useQuery<any>({
    queryKey: ["/api/spectral-db/scan"],
    refetchInterval: 10_000,
  });
  const { data: chainData } = useQuery<any>({
    queryKey: ["/api/blockchain/chain"],
    refetchInterval: 10_000,
  });
  const { data: videosData } = useQuery<any>({
    queryKey: ["/api/spectral-workspace/videos"],
    refetchInterval: 30_000,
  });

  const records: any[]  = scanData?.records ?? [];
  const chainHeight     = (chainData?.blocks ?? []).length;
  const videoCount      = videosData?.count ?? 0;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/spectral-db/${id}`).then(r => r.json()),
    onSuccess: () => refetch(),
  });

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "spectral_db_export.json"; a.click();
    URL.revokeObjectURL(url);
  };

  // Update URL param on tab change
  const goTab = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const BANDS = ["SYSTEM","AUTH","STREAM","CORE","UI","EVENT","STORAGE"];
  const bandCounts = BANDS.reduce((acc, b) => {
    acc[b] = records.filter(r => r.band === b).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 px-4 md:px-6 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#8b00ff 0%,#00c800 50%,#ff8c00 100%)" }}>
              <Database className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white leading-tight">Nexus Spectral Framework</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Communication database — CE→SE encoding, media storage, spectral addressing, on-chain audit
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-500 flex-shrink-0">
              <Link href="/blockchain" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                <Layers className="w-3 h-3" /> Chain {chainHeight}
              </Link>
              <Link href="/agent-bus" className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                <Radio className="w-3 h-3" /> Bus
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Spectral Records", value: records.length, color: "#00c800" },
              { label: "Media Files",      value: videoCount,     color: "#8b5cf6" },
              { label: "Chain Blocks",     value: chainHeight,    color: "#3b82f6" },
              { label: "Ψ Channels Used",  value: new Set(records.map(r => r.psiChannel)).size, color: "#00cfcf" },
              { label: "Total Capacity",   value: "25,600",       color: "#ff8c00" },
            ].map((s, i) => (
              <div key={i} className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
                <div className="text-lg font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Spectrum ruler with all record positions */}
          <SpectrumRuler records={records} />

          {/* Band density pills */}
          <div className="flex flex-wrap gap-2 mt-2">
            {BANDS.filter(b => bandCounts[b] > 0).map(b => (
              <button key={b} onClick={() => goTab("retrieve")}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono transition-all hover:opacity-80"
                style={{ background: `${bandColor(b)}20`, color: bandColor(b), border: `1px solid ${bandColor(b)}40` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: bandColor(b) }} />
                {b} {bandCounts[b]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {busPanelRecord && (
          <BusSendPanel record={busPanelRecord} onDone={() => setBusPanelRecord(null)} />
        )}

        <Tabs value={activeTab} onValueChange={goTab}>
          <TabsList className="bg-slate-900 border border-slate-700 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="write"   className="data-[state=active]:bg-cyan-700 data-[state=active]:text-white" data-testid="tab-write">
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Write
            </TabsTrigger>
            <TabsTrigger value="retrieve" className="data-[state=active]:bg-violet-700 data-[state=active]:text-white" data-testid="tab-retrieve">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Retrieve
            </TabsTrigger>
            <TabsTrigger value="media"  className="data-[state=active]:bg-purple-700 data-[state=active]:text-white" data-testid="tab-media">
              <Film className="w-3.5 h-3.5 mr-1.5" /> Media
            </TabsTrigger>
            <TabsTrigger value="map"    className="data-[state=active]:bg-green-700 data-[state=active]:text-white" data-testid="tab-map">
              <Map className="w-3.5 h-3.5 mr-1.5" /> Spectrum Map
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-orange-700 data-[state=active]:text-white" data-testid="tab-import">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write">
            <div className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Write — CE→SE encode and store at physical wavelength address
            </div>
            <WriteTab onStored={() => refetch()} records={records} />
          </TabsContent>

          <TabsContent value="retrieve">
            <div className="text-xs font-mono text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> Retrieve — browse, filter, and proximity-search the spectral database
            </div>
            <RetrieveTab
              records={records}
              onDelete={id => deleteMutation.mutate(id)}
              onSendToBus={r => setBusPanelRecord(r)}
              onExport={handleExport}
            />
          </TabsContent>

          <TabsContent value="media">
            <div className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Film className="w-3.5 h-3.5" /> Media — upload and stream video at spectral Ψ channel addresses
            </div>
            <MediaTab />
          </TabsContent>

          <TabsContent value="map">
            <div className="text-xs font-mono text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Map className="w-3.5 h-3.5" /> Spectrum Map — every record at its electromagnetic position
            </div>
            <MapTab records={records} />
          </TabsContent>

          <TabsContent value="import">
            <div className="text-xs font-mono text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Upload className="w-3.5 h-3.5" /> Bulk Import — write many records in one operation
            </div>
            <ImportTab onImported={() => refetch()} />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Footer note ───────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800 px-4 md:px-6 py-4 mt-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
          <span>Nexus Spectral Framework · AGPL-3.0</span>
          <span>CE→SE: nm = 380 + ((avg−32)/94)×400</span>
          <span>Ψ(wdm, oam, pol) · 25,600 channels</span>
          <span>Λ = hf/c²</span>
          <Link href="/open" className="text-slate-500 hover:text-slate-300 transition-colors ml-auto">Charter →</Link>
          <Link href="/blockchain" className="text-slate-500 hover:text-slate-300 transition-colors">Blockchain →</Link>
          <Link href="/nexus-command" className="text-slate-500 hover:text-slate-300 transition-colors">Command →</Link>
        </div>
      </div>
    </div>
  );
}
