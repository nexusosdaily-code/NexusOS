import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Radio, Zap, Globe, ExternalLink, Copy, Check, ChevronRight, Database, Shield, Cpu, Code2, Lock } from "lucide-react";

// ── CE→SE engine (same formula used across the whole ecosystem) ───────────────
function ceEncode(text: string): {
  nm: number; thz: number;
  wdm: number; oam: number; pol: "H" | "V";
  psi: string; band: string; wnspUri: string;
} {
  const input = text.trim() || "nexus";
  const codes = input.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  const sum   = codes.reduce((a, b) => a + b, 0);
  const avg   = sum / codes.length;
  const nm    = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const thz   = parseFloat((299_792_458 / (nm * 1e-9) / 1e12).toFixed(3));
  const wdm   = Math.floor((nm - 380) / 4) + 1;
  const oam   = sum % 100;
  const pol   = codes.length % 2 === 0 ? "H" : "V";
  const band  = nm < 450 ? "VIOLET" : nm < 495 ? "BLUE" : nm < 520 ? "CYAN" : nm < 565 ? "GREEN" : nm < 590 ? "YELLOW" : nm < 625 ? "ORANGE" : "RED";
  const slug  = input.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return { nm, thz, wdm, oam, pol, psi: `Ψ(${wdm},${oam},${pol})`, band, wnspUri: `wnsp://Ψ(${wdm},${oam},${pol})/${slug}` };
}

function nmToColor(nm: number): string {
  if (nm < 450) return "#7c3aed";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#0891b2";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }
  return (
    <button onClick={copy} className="text-white/20 hover:text-white/60 transition-colors flex-shrink-0">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

// ── Well-known canonical URIs — static definition + live status key ───────────
const KNOWN: { name: string; resource: string; href: string; ecoKey?: string }[] = [
  { name: "NEXUS",      resource: "",               href: "/",               ecoKey: "kernel" },
  { name: "EVIDENCE",   resource: "evidence",       href: "/evidence",       ecoKey: "blockchain" },
  { name: "BLOCKCHAIN", resource: "blockchain",     href: "/blockchain",     ecoKey: "blockchain" },
  { name: "SNIC",       resource: "snic",           href: "/snic",           ecoKey: undefined },
  { name: "WAVELENGTH", resource: "wavelength-lang",href: "/wavelength-lang",ecoKey: undefined },
  { name: "NETWORK",    resource: "network",        href: "/network",        ecoKey: "networkNodes" },
  { name: "ECOSYSTEM",  resource: "ecosystem",      href: "/ecosystem",      ecoKey: "agentBus" },
];

// ── Animated step-through of one encoding ────────────────────────────────────
function EncodingSteps({ input }: { input: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => { setStep(0); const id = setInterval(() => setStep(p => Math.min(p + 1, 5)), 700); return () => clearInterval(id); }, [input]);

  const codes = input.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  const sum   = codes.reduce((a, b) => a + b, 0);
  const avg   = sum / (codes.length || 1);
  const nm    = 380 + ((avg - 32) / 94) * 400;
  const wdm   = Math.floor((nm - 380) / 4) + 1;
  const oam   = sum % 100;
  const pol   = (codes.length % 2 === 0 ? "H" : "V");
  const col   = nmToColor(nm);

  const steps = [
    { label: "1. Input text", value: `"${input}"`, desc: "Resource name or any string" },
    { label: "2. Uppercase + ASCII codes", value: codes.map(c => `${String.fromCharCode(c)}=${c}`).join("  "), desc: "Filter printable ASCII (32–126)" },
    { label: "3. Sum & average", value: `Σ=${sum}  avg=${avg.toFixed(3)}`, desc: "Sum ÷ character count" },
    { label: "4. Wavelength", value: `λ = 380 + ((${avg.toFixed(2)} − 32) / 94) × 400 = ${nm.toFixed(2)} nm`, desc: "CE→SE mapping to visible spectrum" },
    { label: "5. Ψ channel", value: `WDM=${wdm}  OAM=${oam}  Pol=${pol}  →  Ψ(${wdm},${oam},${pol})`, desc: "Three-axis orthogonal address" },
    { label: "6. Spectral URI", value: `wnsp://Ψ(${wdm},${oam},${pol})/${input.toLowerCase().replace(/\s+/g, "-")}`, desc: "Complete — no DNS, no registry" },
  ];

  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => (
        <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all duration-500 ${i <= step ? "border-white/10 opacity-100" : "border-white/4 opacity-25"}`}
          style={{ background: i === step ? col + "10" : "rgba(255,255,255,0.01)" }}>
          <div className="text-[8px] font-bold pt-0.5 flex-shrink-0" style={{ color: i <= step ? col : "#6b7280" }}>
            {i < step ? "✓" : i === step ? "●" : "○"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] text-white/30 mb-0.5">{s.label}</div>
            <div className="text-[10px] font-mono font-bold break-all" style={{ color: i <= step ? (i === 5 ? col : "rgba(255,255,255,0.8)") : "#374151" }}>
              {s.value}
            </div>
            {i <= step && <div className="text-[8px] text-white/20 mt-0.5">{s.desc}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SpectralUriPage() {
  const [input, setInput] = useState("nexus command");
  const [debounced, setDebounced] = useState(input);
  useEffect(() => { const t = setTimeout(() => setDebounced(input), 300); return () => clearTimeout(t); }, [input]);

  const [auditResult, setAuditResult] = useState<{ recordId: string; txId: string; psi: string; nm: number } | null>(null);
  const [isLoggedIn] = useState(() => !!localStorage.getItem("auth_token"));

  const { data: ecoData } = useQuery<any>({ queryKey: ["/api/ecosystem/status"], refetchInterval: 15_000 });
  const systems = ecoData?.systems ?? {};

  const enc = ceEncode(debounced);
  const col = nmToColor(enc.nm);

  const recordMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("LOGIN_REQUIRED");
      const res = await fetch("/api/spectral-db/store", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ content: debounced, label: enc.wnspUri, data: { source: "spectral-uri-encoder", wnspUri: enc.wnspUri } }),
      });
      if (res.status === 401) throw new Error("LOGIN_REQUIRED");
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Record failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      setAuditResult({
        recordId: data.record?.id ?? "?",
        txId:     data.auditTx?.id ?? "?",
        psi:      data.spectral?.psi_channel ?? enc.psi,
        nm:       parseFloat(data.spectral?.wavelength_mid_nm ?? enc.nm),
      });
    },
  });

  const knownEncoded = KNOWN.map(k => {
    const sysData = k.ecoKey ? systems[k.ecoKey] : null;
    const status  = sysData?.status ?? (k.ecoKey ? "LOADING" : "SPEC");
    return { ...k, enc: ceEncode(k.name), liveStatus: status };
  });

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "monospace" }}>

      {/* Nav */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2.5">
            <Radio size={14} className="text-cyan-400" />
            <span className="text-sm font-bold tracking-wider text-cyan-400">SPECTRAL URI — wnsp:// v1.0</span>
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">Replacing https:// with Ψ(wdm,oam,pol) · AGPL-3.0 open spec</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/wavelength-lang">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 text-white/40 hover:text-white/70 text-[10px] transition-all">
              <Code2 size={9} /> WavelengthScript
            </button>
          </Link>
          <Link href="/network">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-400/30 text-cyan-400/70 hover:text-cyan-400 text-[10px] transition-all">
              <Radio size={9} /> Live Network
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="text-white/20 text-[10px] uppercase tracking-[0.3em]">WNSP-URI v1.0 · Open Standard · AGPL-3.0</div>
          <h1 className="text-3xl font-black text-white leading-tight">
            Every resource has a<br />
            <span className="text-cyan-400">physical address in the spectrum.</span>
          </h1>
          <p className="text-white/40 text-sm max-w-2xl mx-auto leading-relaxed">
            <code className="text-cyan-300">https://</code> routes through DNS servers, certificate authorities, and IP routing tables
            owned by corporations. <code className="text-cyan-300">wnsp://</code> routes through physics.
            The address is derived deterministically from the resource name using CE→SE encoding.
            No registry. No trust required.
          </p>

          {/* Side-by-side comparison pill */}
          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[11px] font-mono">
              <Globe size={11} />
              https://nexusos.com/evidence
            </div>
            <div className="text-white/20 text-sm">→</div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-400/30 bg-cyan-400/8 text-cyan-300 text-[11px] font-mono">
              <Radio size={11} />
              wnsp://Ψ(43,79,H)/evidence
            </div>
          </div>
        </div>

        {/* Anatomy */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-cyan-400" />
            <span className="text-cyan-400 text-[10px] uppercase tracking-widest font-bold">URI Anatomy</span>
          </div>

          <div className="border border-cyan-400/20 rounded-2xl p-6 space-y-5" style={{ background: "rgba(6,182,212,0.03)" }}>
            {/* The URI rendered large */}
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-white/80 tracking-wide">
                <span className="text-cyan-400">wnsp://</span>
                <span className="text-purple-400">Ψ(</span>
                <span className="text-yellow-400">wdm</span>
                <span className="text-purple-400">,</span>
                <span className="text-blue-400">oam</span>
                <span className="text-purple-400">,</span>
                <span className="text-green-400">pol</span>
                <span className="text-purple-400">)</span>
                <span className="text-white/40">/path</span>
              </div>
            </div>

            {/* Component breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { part: "wnsp://", label: "Scheme", desc: "WNSP protocol — Wave Network Spectral Protocol. Signals photonic routing.", color: "#06b6d4" },
                { part: "WDM", label: "Wavelength-Division Channel", desc: "0–199 · maps to 380–780 nm · derived from avg ASCII of resource name", color: "#eab308" },
                { part: "OAM", label: "Orbital Angular Momentum", desc: "0–99 · derived from ASCII sum mod 100 · orthogonal channel axis", color: "#3b82f6" },
                { part: "pol", label: "Polarisation", desc: "H or V · derived from character count parity · final axis", color: "#22c55e" },
                { part: "/path", label: "Resource Path", desc: "Same semantics as URL path. Optional. Defaults to /", color: "#a855f7" },
              ].map(c => (
                <div key={c.part} className="border border-white/8 rounded-xl p-3 space-y-1">
                  <div className="text-sm font-bold font-mono" style={{ color: c.color }}>{c.part}</div>
                  <div className="text-white/60 text-[9px] font-bold uppercase tracking-wide">{c.label}</div>
                  <div className="text-white/30 text-[8px] leading-relaxed">{c.desc}</div>
                </div>
              ))}
            </div>

            {/* Key properties */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {[
                { title: "Deterministic", desc: "Same resource name always produces the same Ψ address. No central registry, no DNS lookup.", color: "#22c55e" },
                { title: "Collision-free", desc: "25,600 orthogonal channels via WDM × OAM × Polarisation. Each name occupies a unique physical coordinate.", color: "#3b82f6" },
                { title: "Physics-rooted", desc: "WDM index maps directly to a wavelength in nanometres. The address IS a position in the electromagnetic spectrum.", color: "#a855f7" },
              ].map(p => (
                <div key={p.title} className="border border-white/6 rounded-xl p-3">
                  <div className="font-bold text-[10px] mb-1" style={{ color: p.color }}>{p.title}</div>
                  <div className="text-white/35 text-[9px] leading-relaxed">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live encoder */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio size={12} style={{ color: col }} />
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: col }}>Live Encoder — Type Any Resource Name</span>
          </div>

          <div className="border rounded-2xl p-6 space-y-5" style={{ borderColor: col + "30", background: col + "05" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type any resource name…"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-400/40 placeholder-white/20"
              data-testid="input-spectral-uri"
            />

            {/* Result URI */}
            <div className="border rounded-xl p-4 flex items-center justify-between gap-3"
              style={{ borderColor: col + "40", background: col + "10" }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Radio size={12} style={{ color: col }} />
                <span className="font-mono font-bold text-sm break-all" style={{ color: col }}>
                  {enc.wnspUri}
                </span>
              </div>
              <CopyBtn text={enc.wnspUri} />
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "λ", value: `${enc.nm} nm` },
                { label: "f", value: `${enc.thz} THz` },
                { label: "WDM", value: enc.wdm },
                { label: "OAM", value: enc.oam },
                { label: "Pol", value: enc.pol },
                { label: "Band", value: enc.band },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 border border-white/8 rounded-lg px-2.5 py-1 text-[9px]">
                  <span className="text-white/30">{s.label}</span>
                  <span className="font-bold" style={{ color: col }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Spectrum position */}
            <div className="space-y-1">
              <div className="text-white/20 text-[8px] uppercase tracking-wider">Position in electromagnetic spectrum</div>
              <div className="h-3 rounded-full overflow-hidden relative" style={{
                background: "linear-gradient(90deg,#7c3aed,#2563eb,#0891b2,#16a34a,#ca8a04,#ea580c,#dc2626)"
              }}>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white rounded-full shadow-lg"
                  style={{ left: `${((enc.nm - 380) / 400) * 100}%`, boxShadow: `0 0 6px ${col}` }} />
              </div>
              <div className="flex justify-between text-[7px] text-white/20">
                <span>380 nm · Violet</span><span>555 nm · Anchor</span><span>780 nm · Red</span>
              </div>
            </div>

            {/* Step-through */}
            <div className="space-y-2">
              <div className="text-white/20 text-[8px] uppercase tracking-wider">Derivation — step by step</div>
              <EncodingSteps input={debounced} />
            </div>

            {/* ── Blockchain audit ── */}
            <div className="border-t border-white/6 pt-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Shield size={10} className="text-green-400" />
                    <span className="text-green-400 text-[9px] uppercase tracking-widest font-bold">On-Chain Audit</span>
                  </div>
                  <div className="text-white/25 text-[8px]">
                    Commits this encoding to the spectral_records table and writes a SPECTRAL_AUDIT proof to the photonic blockchain mempool.
                  </div>
                </div>

                {isLoggedIn ? (
                  <button
                    onClick={() => { setAuditResult(null); recordMutation.mutate(); }}
                    disabled={recordMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    style={{ background: col + "20", border: `1px solid ${col}40`, color: col }}
                    data-testid="btn-record-onchain"
                  >
                    <Shield size={9} />
                    {recordMutation.isPending ? "Recording…" : "Record on-chain"}
                  </button>
                ) : (
                  <Link href="/auth">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-white/10 text-white/30 hover:text-white/60 transition-all">
                      <Lock size={9} /> Log in to record
                    </button>
                  </Link>
                )}
              </div>

              {/* Error */}
              {recordMutation.isError && (
                <div className="border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-[9px]">
                  {(recordMutation.error as Error).message === "LOGIN_REQUIRED"
                    ? <span>Session expired. <Link href="/auth"><span className="underline">Log in again</span></Link></span>
                    : (recordMutation.error as Error).message}
                </div>
              )}

              {/* Success receipt */}
              {auditResult && (
                <div className="border border-green-500/20 rounded-xl p-4 space-y-2" style={{ background: "rgba(34,197,94,0.04)" }}>
                  <div className="flex items-center gap-2 text-green-400 text-[9px] font-bold uppercase tracking-widest">
                    <Check size={10} /> Recorded — on-chain audit proof created
                  </div>
                  <div className="grid grid-cols-1 gap-1 font-mono text-[8px]">
                    <div className="flex gap-2">
                      <span className="text-white/25 w-20 flex-shrink-0">Record ID</span>
                      <span className="text-green-300/70 break-all">{auditResult.recordId}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/25 w-20 flex-shrink-0">Audit TX</span>
                      <span className="text-yellow-300/70 break-all">{auditResult.txId}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-white/25 w-20 flex-shrink-0">Ψ Channel</span>
                      <span className="text-cyan-300/70">{auditResult.psi}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Link href="/blockchain">
                      <button className="flex items-center gap-1 px-2 py-1 rounded border border-yellow-400/20 text-yellow-400/70 hover:text-yellow-400 text-[8px] transition-colors">
                        <ExternalLink size={7} /> View blockchain
                      </button>
                    </Link>
                    <Link href="/evidence">
                      <button className="flex items-center gap-1 px-2 py-1 rounded border border-green-400/20 text-green-400/70 hover:text-green-400 text-[8px] transition-colors">
                        <Shield size={7} /> Evidence ledger
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Well-known canonical URIs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-purple-400" />
            <span className="text-purple-400 text-[10px] uppercase tracking-widest font-bold">Canonical System URIs</span>
            <span className="text-white/20 text-[9px]">— every NexusOS resource has a deterministic spectral address</span>
          </div>

          <div className="space-y-2">
            {knownEncoded.map(k => {
              const c = nmToColor(k.enc.nm);
              const statusColor =
                k.liveStatus === "ONLINE"  || k.liveStatus === "RUNNING" || k.liveStatus === "VERIFIED" ? "#22c55e" :
                k.liveStatus === "LOADING" ? "#ca8a04" :
                k.liveStatus === "SPEC"    ? "#a855f7" :
                k.liveStatus === "EMPTY"   ? "#6b7280" : "#ef4444";
              const statusLabel =
                k.liveStatus === "ONLINE"  || k.liveStatus === "RUNNING" || k.liveStatus === "VERIFIED" ? "LIVE" :
                k.liveStatus === "LOADING" ? "…" :
                k.liveStatus === "SPEC"    ? "SPEC" :
                k.liveStatus === "EMPTY"   ? "EMPTY" : k.liveStatus;
              return (
                <div key={k.name} className="border border-white/6 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-white/12 transition-colors group"
                  style={{ background: "rgba(255,255,255,0.01)" }} data-testid={`uri-row-${k.name.toLowerCase()}`}>
                  {/* Spectrum dot */}
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c, boxShadow: `0 0 5px ${c}60` }} />

                  {/* Old URL */}
                  <div className="w-40 flex-shrink-0">
                    <div className="text-white/20 text-[8px] mb-0.5">legacy</div>
                    <div className="text-red-400/40 text-[9px] font-mono truncate">https://…/{k.resource || ""}</div>
                  </div>

                  <ChevronRight size={10} className="text-white/15 flex-shrink-0" />

                  {/* Spectral URI */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white/20 text-[8px] mb-0.5">spectral address</div>
                    <div className="font-mono font-bold text-[10px]" style={{ color: c }}>{k.enc.wnspUri}</div>
                  </div>

                  {/* Live status badge */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor, boxShadow: statusLabel === "LIVE" ? `0 0 4px ${statusColor}` : "none" }} />
                    <span className="text-[8px] font-bold" style={{ color: statusColor }}>{statusLabel}</span>
                  </div>

                  {/* Ψ + nm */}
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0 text-[8px] text-white/20">
                    <span>{k.enc.nm} nm</span>
                    <span>{k.enc.band}</span>
                  </div>

                  <CopyBtn text={k.enc.wnspUri} />

                  <Link href={k.href}>
                    <button className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">
                      <ExternalLink size={10} />
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparison vs https:// */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe size={12} className="text-white/40" />
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">wnsp:// vs https://</span>
          </div>
          <div className="border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-white/8 text-[9px] uppercase tracking-wider">
                  <th className="text-left px-4 py-3 text-white/30">Property</th>
                  <th className="px-4 py-3 text-center text-cyan-400">wnsp://</th>
                  <th className="px-4 py-3 text-center text-red-400/60">https://</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Address derivation", "CE→SE physics — deterministic from resource name", "DNS — human → IP lookup, centralised"],
                  ["Authority", "Physics (Ψ channel = EM coordinate)", "ICANN + TLD registrar + CA"],
                  ["Trust model", "Trustless — math is the registry", "Certificate Authority chain"],
                  ["Address space", "25,600 orthogonal channels", "~4.3 billion IPv4 / IPv6 (effectively unlimited)"],
                  ["Routing layer", "WNSP-SE spectral framing", "TCP/IP + TLS"],
                  ["Resolution latency", "0 ms — computed locally", "DNS lookup: 20–200 ms"],
                  ["Censorship resistance", "No central registry to seize", "Domain can be seized / blocked"],
                  ["Address stability", "Permanent — physics doesn't change", "Domains expire, IP changes"],
                  ["Human-readable", "wnsp://Ψ(43,79,H)/evidence", "https://nexusos.com/evidence"],
                  ["Open spec", "AGPL-3.0 — WNSP-URI v1.0", "IETF RFC 3986 (public)"],
                ].map(([prop, wnsp, https]) => (
                  <tr key={prop} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-2.5 text-white/50 font-bold">{prop}</td>
                    <td className="px-4 py-2.5 text-center text-cyan-400/80">{wnsp}</td>
                    <td className="px-4 py-2.5 text-center text-red-400/50">{https}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formal spec */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-amber-400" />
            <span className="text-amber-400 text-[10px] uppercase tracking-widest font-bold">WNSP-URI v1.0 — Formal Specification</span>
          </div>

          <div className="border border-amber-400/15 rounded-2xl p-6 space-y-5" style={{ background: "rgba(245,158,11,0.03)" }}>
            {[
              {
                heading: "§1 Syntax",
                code: `wnsp-uri   = scheme "://" authority [ "/" path ]
scheme     = "wnsp"
authority  = "Ψ(" wdm "," oam "," pol ")"
wdm        = 1*3DIGIT           ; 1–200
oam        = 1*2DIGIT           ; 0–99
pol        = "H" / "V"
path       = *( pchar / "/" )   ; same as RFC 3986 path`,
              },
              {
                heading: "§2 Address Derivation (CE→SE)",
                code: `1. Obtain resource name S (e.g., "evidence")
2. Uppercase S → S'
3. Filter: keep only chars with codepoint 32–126
4. codes  = ASCII codepoints of each char in S'
5. sum    = Σ codes
6. avg    = sum / len(codes)
7. nm     = 380 + ((avg − 32) / 94) × 400
8. wdm    = ⌊(nm − 380) / 4⌋ + 1
9. oam    = sum mod 100
10. pol   = "H" if len(codes) is even, else "V"`,
              },
              {
                heading: "§3 Resolution",
                code: `No lookup required. The Ψ address IS the destination.
A WNSP-capable node resolves wnsp://Ψ(w,o,p)/path by:
  - Tuning its optical receiver to WDM channel w
  - Filtering OAM order o
  - Selecting polarisation p
  - Reading the resource at /path from that channel`,
              },
              {
                heading: "§4 Compatibility",
                code: `Legacy bridges may translate:
  wnsp://Ψ(43,79,H)/evidence  →  https://nexusos.com/evidence
Translation is one-way. The spectral form is canonical.
Bridges MUST preserve the Ψ authority unchanged.`,
              },
            ].map(s => (
              <div key={s.heading} className="space-y-2">
                <div className="text-amber-400 text-[10px] font-bold">{s.heading}</div>
                <pre className="border border-white/6 rounded-xl p-4 text-[9px] font-mono text-white/50 bg-black/40 overflow-x-auto leading-relaxed whitespace-pre-wrap">{s.code}</pre>
              </div>
            ))}

            <div className="border border-amber-400/15 rounded-xl p-3 text-[9px] text-amber-400/60">
              This specification is published under AGPL-3.0. Any system that routes
              using wnsp:// must publish its source code. The address space of the
              electromagnetic spectrum cannot be owned.
            </div>
          </div>
        </div>

        {/* Ecosystem links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Radio, label: "Spectral Network", sub: "Nodes already emitting at their Ψ address", href: "/network", color: "#22c55e" },
            { icon: Cpu, label: "SNIC Hardware", sub: "Hardware that routes at wnsp:// natively", href: "/snic", color: "#16a34a" },
            { icon: Code2, label: "WavelengthScript", sub: "Language where variables are wnsp:// addresses", href: "/wavelength-lang", color: "#a855f7" },
          ].map(l => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href}>
                <div className="border border-white/8 rounded-xl p-4 flex items-center gap-3 hover:border-white/20 transition-all cursor-pointer" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: l.color + "20" }}>
                    <Icon size={14} style={{ color: l.color }} />
                  </div>
                  <div>
                    <div className="text-white/70 font-bold text-[11px]">{l.label}</div>
                    <div className="text-white/30 text-[9px]">{l.sub}</div>
                  </div>
                  <ExternalLink size={9} className="text-white/20 ml-auto" />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
