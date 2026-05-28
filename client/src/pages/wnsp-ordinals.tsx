import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Copy, CheckCircle2, ExternalLink, Bitcoin, Shield, Zap, Waves,
  ChevronDown, ChevronUp, Search, RefreshCw, Link2, Globe, Hash,
  Wallet, AlertTriangle, Play, Settings, Activity
} from "lucide-react";

// ── WASCII v2.0 ─────────────────────────────────────────────────────────────
const WASCII_TABLE: Record<string, number> = {
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(65 + i), 380 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 26 }, (_, i) => [String.fromCharCode(97 + i), 383 + i * 6])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 536 + i * 6])),
  " ": 596, ".": 602, ",": 608, "!": 614, "?": 620, ":": 626, ";": 632,
  "-": 638, "_": 644, "/": 650, "\\": 656, "@": 662, "#": 668, "$": 674,
  "%": 680, "&": 686, "*": 692, "(": 698, ")": 704, "[": 710, "]": 716,
  "{": 722, "}": 728, "|": 734, "<": 740, ">": 746, "=": 752, "+": 758,
};

function wasciiNm(ch: string) { return WASCII_TABLE[ch] ?? (380 + (ch.charCodeAt(0) % 256) / 255 * 400); }
function wasciiband(nm: number) {
  if (nm < 450) return { name: "SYSTEM",  color: "#8b5cf6" };
  if (nm < 490) return { name: "KERNEL",  color: "#3b82f6" };
  if (nm < 520) return { name: "STREAM",  color: "#22d3ee" };
  if (nm < 565) return { name: "CORE",    color: "#34d399" };
  if (nm < 590) return { name: "UI",      color: "#fbbf24" };
  if (nm < 625) return { name: "EVENT",   color: "#f97316" };
  return               { name: "STORAGE", color: "#f87171" };
}

function encodeWascii(text: string) {
  if (!text.trim()) return null;
  const CL = 3e8, HL = 6.626e-34, EVL = 1.602e-19;
  const chars = Array.from(text).map(ch => {
    const nm = wasciiNm(ch); const freq = CL / (nm * 1e-9); const energy = (HL * freq) / EVL;
    const b = wasciiband(nm);
    return { ch, nm, freq: freq / 1e12, energy, band: b.name, bandColor: b.color, unicode: `U+${ch.charCodeAt(0).toString(16).padStart(4,"0").toUpperCase()}` };
  });
  const meanNm = chars.reduce((s, c) => s + c.nm, 0) / chars.length;
  const sumCode = Array.from(text).reduce((s, c) => s + c.charCodeAt(0), 0);
  const wdm = Math.floor((meanNm - 380) / 4) + 1, oam = sumCode % 100, pol = text.length % 2 === 0 ? "H" : "V";
  const freq = (CL / (meanNm * 1e-9)) / 1e12, energy = (HL * (CL / (meanNm * 1e-9))) / EVL;
  const psi = `Ψ(${wdm},${oam},${pol})`;
  const slug = text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return { chars, meanNm, wdm, oam, pol, psi, uri: `wnsp://${psi}/${slug}`, freq, energy };
}

function buildInscription(text: string, enc: ReturnType<typeof encodeWascii>): string {
  if (!enc) return "";
  const sep = "═".repeat(63), sep2 = "─".repeat(63);
  const lines = [
    "WASCII-v2.0 SPECTRAL INSCRIPTION", "NexusOS · Wavelength Network Spectral Protocol",
    "AGPL-3.0 | https://wnsp.io | " + new Date().toISOString().split("T")[0],
    sep, `TEXT    : "${text}"`, `CHARS   : ${enc.chars.length}`,
    `ENCODING: WASCII-v2.0 CE→SE (charCode → nm → Ψ)`, sep,
    "SPECTRAL CHARACTER MAP", sep2, "CHAR  UNICODE   λ(nm)     FREQ(THz)  ENERGY(eV)  BAND", sep2,
  ];
  enc.chars.forEach(c => lines.push(`${c.ch === " " ? "SPC" : c.ch.padEnd(6)}${c.unicode.padEnd(10)}${c.nm.toFixed(2).padEnd(10)}${c.freq.toFixed(4).padEnd(11)}${c.energy.toExponential(3).padEnd(12)}${c.band}`));
  lines.push(sep, "AGGREGATE SPECTRAL CHANNEL", sep2,
    `mean_λ  : ${enc.meanNm.toFixed(4)} nm`, `freq    : ${enc.freq.toFixed(6)} THz`,
    `energy  : ${enc.energy.toExponential(6)} J`, `WDM     : ${enc.wdm}`, `OAM     : ${enc.oam}`,
    `POL     : ${enc.pol}`, `Ψ       : ${enc.psi}`, `WNSP URI: ${enc.uri}`,
    `BAND    : ${wasciiband(enc.meanNm).name}`, sep, "WASCII DENSITY VECTOR", sep2);
  [...enc.chars].sort((a, b) => a.nm - b.nm).forEach(c => {
    const bar = "█".repeat(Math.max(1, Math.round((c.nm - 380) / 400 * 20)));
    lines.push(`${c.nm.toFixed(1).padEnd(8)} ${c.band.padEnd(8)} ${bar.padEnd(20)} ${c.ch === " " ? "SPC" : c.ch}`);
  });
  lines.push(sep, "ALGORITHM : WASCII-v2.0 | CE→SE", "LICENSE   : AGPL-3.0", "NOTE      : This inscription is permanent on Bitcoin.");
  return lines.join("\n");
}

// ── CE table for protocol inscriptions ──────────────────────────────────────
const BAND_WIDTH = 400 / 128, C = 3e8, H = 6.626e-34, EV = 1.602e-19;
function ceEncode(code: number) {
  const band = code % 128, lambda = 380 + band * BAND_WIDTH + BAND_WIDTH / 2;
  const freq = (C / (lambda * 1e-9)) / 1e12, energy = (H * freq * 1e12) / EV;
  const wdm = Math.floor(((lambda - 380) / 400) * 256), oam = code % 50, pol = code % 2 === 0 ? "H" : "V";
  return { band, lambda, freq, energy, wdm, oam, pol };
}
function generateCETable(): string {
  const lines = ["WNSP-CE-TABLE-v1.0","Wavelength Network Spectral Protocol — Character Encoding Table","Algorithm: CE_TABLE[charCode % 128] | 128 bands | 380-780nm | 3.125nm/band","AGPL-3.0 | NexusOS | First inscription: 2026","═".repeat(72),"CHAR  CODE  BAND  LAMBDA(nm)   FREQ(THz)    ENERGY(eV)   PSI_CHANNEL","─".repeat(72)];
  for (let code = 32; code < 127; code++) {
    const { band, lambda, freq, energy, wdm, oam, pol } = ceEncode(code);
    const char = code === 32 ? "SPC" : String.fromCharCode(code);
    lines.push(`${char.padEnd(6)}${String(code).padEnd(6)}${String(band).padEnd(6)}${lambda.toFixed(4).padEnd(13)}${freq.toFixed(6).padEnd(13)}${energy.toFixed(6).padEnd(13)}PS(${wdm},${oam},${pol})`);
  }
  lines.push("─".repeat(72),"VERIFICATION: SHA256 of this table = canonical CE-v1 fingerprint");
  return lines.join("\n");
}
const CE_TABLE_ASCII = generateCETable();
const WNSP_SPEC_ASCII = `WNSP-SPEC-v1.0\nWavelength Network Spectral Protocol — Core Specification\nAGPL-3.0 | NexusOS | First public disclosure: 2026-05-16\n${"═".repeat(72)}\n\nCHANNEL SPACE\n  WDM channels  : 256\n  OAM modes     : 50\n  Polarisations : 2\n  Total channels: 25,600 orthogonal Psi channels\n\nORTHOGONALITY\n  <Psi_i|Psi_j> = 0 for all i != j\n\nCHARACTER ENCODING (CE v1.0)\n  CE_TABLE[charCode % 128]\n  lambda = 380 + (charCode % 128) * 3.125 + 1.5625 (nm)\n  f = c / lambda  |  E = hf\n\nCOMPRESSION STATE EQUATION\n  Lambda_compress = hf / c^2\n\nAUTHORITY BANDS\n  SYSTEM : lambda < 450nm\n  KERNEL : lambda 450-495nm\n  USER   : lambda 495-590nm\n  GUEST  : lambda > 590nm\n\nWNSP URI FORMAT\n  wnsp://Psi(wdm,oam,pol)/path\n\nSOURCE: https://wnsp.io\n${"─".repeat(72)}\nThis inscription is permanent. The protocol is free.`;

// ── Shared helpers ───────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">
      {c ? <><CheckCircle2 size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> {label}</>}
    </button>
  );
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — WASCII GENERATOR + PROTOCOL INSCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════
const PROTO_INSCRIPTIONS = [
  { id: "CE-TABLE-v1", title: "WNSP CE Encoding Table", subtitle: "128-band character-to-wavelength lookup", icon: Zap, color: "#fbbf24", content: CE_TABLE_ASCII, why: "The atomic unit of WNSP. Every character anyone encodes traces back here. On Bitcoin it's permanently verifiable by any physicist — no server required." },
  { id: "SPEC-v1", title: "WNSP Core Specification", subtitle: "25,600 Ψ channels, URI format, authority bands", icon: Waves, color: "#22d3ee", content: WNSP_SPEC_ASCII, why: "The Hilbert space, compression state equation, and authority bands — timestamped on Bitcoin as the canonical protocol reference. Owned by no one." },
  { id: "HARDWARE-v1", title: "Hardware Spec (AGPL-3.0)", subtitle: "SNIC, PHR-1, Spectral Relay Mesh, WavelengthScript Compiler α", icon: Shield, color: "#a78bfa", content: "", why: "First published 2026-05-16. Bitcoin timestamp proves prior art — verifiable by any court or patent office. AGPL-3.0 protects the IP." },
];

function WasciiTab() {
  const [text, setText] = useState("wnsp");
  const enc = useMemo(() => encodeWascii(text), [text]);
  const inscription = useMemo(() => enc ? buildInscription(text, enc) : "", [text, enc]);
  const [showRaw, setShowRaw] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {/* Generator */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-900/5 overflow-hidden">
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/60 mb-1">WASCII-v2.0 Inscription Generator</div>
            <h2 className="text-lg font-bold text-white">Encode any text as a spectral inscription.</h2>
            <p className="text-xs text-white/50 mt-1 leading-relaxed">Every character maps to a physical wavelength. The result is a spectral vector document ready to inscribe on Bitcoin.</p>
          </div>
          <div className="flex gap-2">
            <input value={text} onChange={e => setText(e.target.value.slice(0, 120))} placeholder="Enter text to encode..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40"
              data-testid="input-wascii-text" />
            <div className="text-[10px] font-mono text-white/20 self-center px-2">{text.length}/120</div>
          </div>
          {enc && (<>
            <div className="flex flex-wrap gap-1.5">
              {enc.chars.map((c, i) => (
                <div key={i} className="rounded-lg px-2 py-1 text-center" style={{ backgroundColor: c.bandColor + "18", border: `1px solid ${c.bandColor}30` }}>
                  <div className="text-xs font-mono font-bold" style={{ color: c.bandColor }}>{c.ch === " " ? "·" : c.ch}</div>
                  <div className="text-[9px] font-mono text-white/40">{c.nm.toFixed(0)}nm</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[{ label: "Ψ Channel", value: enc.psi, color: "#22d3ee" }, { label: "mean λ", value: `${enc.meanNm.toFixed(2)} nm`, color: "#34d399" }, { label: "Freq", value: `${enc.freq.toFixed(3)} THz`, color: "#fbbf24" }, { label: "Band", value: wasciiband(enc.meanNm).name, color: wasciiband(enc.meanNm).color }].map(item => (
                <div key={item.label} className="rounded-lg bg-black/40 border border-white/5 p-2.5">
                  <div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">{item.label}</div>
                  <div className="text-xs font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-black/40 border border-emerald-500/20 px-3 py-2 font-mono text-xs text-emerald-300 flex items-center justify-between gap-3">
              <span className="truncate">{enc.uri}</span>
              <button onClick={() => navigator.clipboard.writeText(enc.uri)} className="text-white/30 hover:text-white/60 shrink-0"><Copy size={11} /></button>
            </div>
            <div>
              <div className="text-[9px] font-mono text-white/30 uppercase mb-1.5">Spectral density — 380nm → 780nm</div>
              <div className="h-4 rounded-lg overflow-hidden flex">
                {[...enc.chars].sort((a, b) => a.nm - b.nm).map((c, i) => (
                  <div key={i} title={`${c.ch} → ${c.nm.toFixed(1)}nm`} className="flex-1 opacity-80 hover:opacity-100 transition-opacity" style={{ backgroundColor: c.bandColor }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <CopyBtn text={inscription} label="Copy WASCII Inscription" />
              <button onClick={() => setShowRaw(!showRaw)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors">
                {showRaw ? <><ChevronUp size={11} /> Hide</> : <><ChevronDown size={11} /> Preview</>}
              </button>
              <div className="ml-auto text-[10px] font-mono text-white/20">{new TextEncoder().encode(inscription).length.toLocaleString()} bytes</div>
            </div>
          </>)}
        </div>
        {showRaw && enc && <div className="border-t border-white/5 bg-black/50 p-4 max-h-80 overflow-y-auto"><pre className="text-[10px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{inscription}</pre></div>}
      </div>

      {/* Protocol inscriptions */}
      <div>
        <div className="mb-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Protocol Data Inscriptions</div>
          <h2 className="text-lg font-bold text-white">Three inscriptions. The entire foundation.</h2>
          <p className="text-white/40 text-xs mt-1 leading-relaxed">Copy → paste into Unisat Inscribe → Text → content-type: text/plain. Use a bc1p Taproot wallet.</p>
        </div>
        <div className="space-y-4">
          {PROTO_INSCRIPTIONS.map(ins => (
            <div key={ins.id} className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ins.color + "18", border: `1px solid ${ins.color}33` }}>
                      <ins.icon size={16} style={{ color: ins.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{ins.title}</div>
                      <div className="text-[11px] text-white/40">{ins.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400 shrink-0">⧖ PENDING</span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-4">{ins.why}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {ins.content && <CopyBtn text={ins.content} label="Copy ASCII" />}
                  {ins.content && <button onClick={() => setExpanded(expanded === ins.id ? null : ins.id)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">
                    {expanded === ins.id ? <><ChevronUp size={11} /> Hide</> : <><ChevronDown size={11} /> Preview</>}
                  </button>}
                </div>
              </div>
              {expanded === ins.id && ins.content && <div className="border-t border-white/5 bg-black/40 p-4 max-h-64 overflow-y-auto"><pre className="text-[10px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap">{ins.content}</pre></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — FULL-AUTO BRIDGE (was /btc-bridge)
// ══════════════════════════════════════════════════════════════════════════════
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "⧖ PENDING"   },
  signed:    { bg: "bg-blue-500/10",    text: "text-blue-400",    label: "✎ SIGNED"    },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "✓ CONFIRMED" },
  failed:    { bg: "bg-red-500/10",     text: "text-red-400",     label: "✗ FAILED"    },
};
const EVENT_COLORS: Record<string, string> = {
  NXT_TRANSFER: "#fbbf24", GOVERNANCE: "#a78bfa", KERNEL: "#22d3ee",
  WASCII_MANUAL: "#34d399", ORDINAL_DEPOSIT: "#f97316",
};

function WalletCard({ info }: { info: any }) {
  const [copied, setCopied] = useState(false);
  const satsToBtc = (s: number) => (s / 1e8).toFixed(6);
  const satsToUsd = (s: number) => "$" + ((s / 1e8) * 105000).toFixed(2);
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
      {info.configured && info.address ? (<>
        <div className="rounded-xl bg-black/40 border border-white/5 p-3">
          <div className="text-[9px] font-mono text-white/30 uppercase mb-1">Taproot Address (bc1p)</div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-orange-300 break-all flex-1">{info.address}</span>
            <button onClick={() => { navigator.clipboard.writeText(info.address); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-white/30 hover:text-white/60 shrink-0">
              {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
            </button>
          </div>
        </div>
        {info.balance && (
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Confirmed", sats: info.balance.confirmed }, { label: "Pending", sats: info.balance.unconfirmed }, { label: "Total", sats: info.balance.total }].map(item => (
              <div key={item.label} className="rounded-lg bg-black/30 border border-white/5 p-2.5 text-center">
                <div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">{item.label}</div>
                <div className="text-xs font-mono font-bold text-orange-300">{satsToBtc(item.sats)} BTC</div>
                <div className="text-[9px] font-mono text-white/30">{satsToUsd(item.sats)}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] font-mono text-white/30">Fund with <strong className="text-white/60">$50–200 BTC</strong> for fees. Keep your main wallet in Unisat.</p>
      </>) : (
        <div className="rounded-xl bg-black/40 border border-amber-500/20 p-3 space-y-1.5">
          {["1. In Unisat: Create a NEW wallet (not your main one)", "2. Settings → Export Private Key → copy the hex string", "3. In Replit: add secret  BTC_INSCRIPTION_WALLET_WIF", "4. Paste the hex key as the value", "5. Restart the app — automation activates immediately"].map((s, i) => (
            <div key={i} className="flex gap-2 text-[11px] text-white/50"><span className="text-amber-500/60 shrink-0">→</span>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function QueueCard({ item, onInscribe, inscribing }: { item: any; onInscribe: (id: number) => void; inscribing: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [manualId, setManualId] = useState("");
  const qc = useQueryClient();
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
  const eventColor = EVENT_COLORS[item.event_type] ?? "#94a3b8";

  async function confirmManual() {
    if (!manualId.trim()) return;
    await apiFetch(`/api/btc-bridge/queue/${item.id}/confirm`, { method: "PATCH", body: JSON.stringify({ inscriptionId: manualId.trim() }) });
    qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: eventColor + "15", color: eventColor, borderColor: eventColor + "30" }}>{item.event_type}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
            {item.psi_channel && <span className="text-[10px] font-mono text-cyan-400/60">{item.psi_channel}</span>}
          </div>
          <span className="text-[9px] font-mono text-white/20 shrink-0">#{item.id}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/30 mb-3 flex-wrap">
          {item.triggered_by && <span>by {item.triggered_by}</span>}
          {item.content_bytes && <span>{item.content_bytes.toLocaleString()} bytes</span>}
          <span>{new Date(item.created_at).toLocaleString()}</span>
        </div>
        {item.inscription_id ? (
          <a href={`https://ordinals.com/inscription/${item.inscription_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors">
            <ExternalLink size={10} /> {item.inscription_id.slice(0, 24)}...i0
          </a>
        ) : item.status === "pending" ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => onInscribe(item.id)} disabled={inscribing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-mono hover:bg-orange-500/30 transition-all disabled:opacity-40"
              data-testid={`button-auto-inscribe-${item.id}`}>
              {inscribing ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />} Auto-Inscribe
            </button>
            <div className="flex gap-1">
              <input value={manualId} onChange={e => setManualId(e.target.value)} placeholder="or paste inscription ID..."
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 w-44" />
              <button onClick={confirmManual} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-white/50 hover:text-white/80"><CheckCircle2 size={11} /></button>
            </div>
          </div>
        ) : null}
        <div className="flex items-center gap-2 mt-2">
          <button onClick={() => navigator.clipboard.writeText(item.inscription_content)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors"><Copy size={9} /> Copy content</button>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">{expanded ? <><ChevronUp size={10} /> Hide</> : <><ChevronDown size={10} /> Preview</>}</button>
        </div>
      </div>
      {expanded && <div className="border-t border-white/5 bg-black/50 p-3 max-h-48 overflow-y-auto"><pre className="text-[9px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap">{item.inscription_content}</pre></div>}
    </div>
  );
}

function AutoBridgeTab() {
  const qc = useQueryClient();
  const [inscribingId, setInscribingId] = useState<number | null>(null);
  const [inscribeMsg, setInscribeMsg] = useState<Record<number, string>>({});
  const [anchorAddress, setAnchorAddress] = useState("");
  const [parentId, setParentId] = useState("");
  const [anchorSaved, setAnchorSaved] = useState(false);
  const [triggerType, setTriggerType] = useState("WASCII_MANUAL");
  const [triggerNote, setTriggerNote] = useState("");
  const [triggerMsg, setTriggerMsg] = useState("");
  const [triggerBusy, setTriggerBusy] = useState(false);

  const { data: walletData, isLoading: walletLoading } = useQuery<any>({ queryKey: ["/api/btc-bridge/wallet"], refetchInterval: 30_000 });
  const { data: queueData, isLoading: queueLoading } = useQuery<any>({ queryKey: ["/api/btc-bridge/queue"], refetchInterval: 8_000 });
  const { data: feeData } = useQuery<any>({ queryKey: ["/api/btc-bridge/fee-rate"], refetchInterval: 60_000 });
  const { data: statusData } = useQuery<any>({ queryKey: ["/api/btc-bridge/status"], refetchInterval: 5_000 });

  async function handleAutoInscribe(id: number) {
    setInscribingId(id); setInscribeMsg(m => ({ ...m, [id]: "" }));
    try {
      const result = await apiFetch(`/api/btc-bridge/inscribe/${id}`, { method: "POST", body: JSON.stringify({}) });
      setInscribeMsg(m => ({ ...m, [id]: `✓ ${result.inscriptionId}` }));
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/wallet"] });
    } catch (e: any) { setInscribeMsg(m => ({ ...m, [id]: "Error: " + e.message })); }
    finally { setInscribingId(null); }
  }

  async function saveAnchor() {
    await apiFetch("/api/btc-bridge/anchor", { method: "POST", body: JSON.stringify({ address: anchorAddress || null, parentInscriptionId: parentId || null }) });
    setAnchorSaved(true); setTimeout(() => setAnchorSaved(false), 2000);
  }

  async function triggerQueue() {
    setTriggerBusy(true); setTriggerMsg("");
    try {
      const res = await apiFetch("/api/btc-bridge/queue/trigger", { method: "POST", body: JSON.stringify({ eventType: triggerType, data: { note: triggerNote } }) });
      setTriggerMsg(`Queued #${res.queued?.id} — ready to inscribe`);
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
    } catch (e: any) { setTriggerMsg("Error: " + e.message); }
    finally { setTriggerBusy(false); }
  }

  async function toggleProcessor(enabled: boolean) {
    try {
      await apiFetch("/api/btc-bridge/processor/toggle", { method: "POST", body: JSON.stringify({ enabled }) });
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/status"] });
    } catch { /* ignore */ }
  }

  const isLive   = statusData?.running && statusData?.enabled;
  const isPaused = statusData?.running && !statusData?.enabled;

  return (
    <div className="space-y-6">
      {/* ── Auto-Processor Live Status ─────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 space-y-3 ${isLive ? "border-emerald-500/30 bg-emerald-500/5" : isPaused ? "border-amber-500/30 bg-amber-500/5" : "border-white/8 bg-white/[0.02]"}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-2.5 w-2.5 shrink-0`}>
              <span className={`${isLive ? "animate-ping bg-emerald-400" : isPaused ? "bg-amber-400" : "bg-white/20"} absolute inline-flex h-full w-full rounded-full opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? "bg-emerald-400" : isPaused ? "bg-amber-400" : "bg-white/20"}`} />
            </span>
            <div>
              <div className="text-[11px] font-mono font-bold text-white/80">
                Auto-Processor&nbsp;
                <span className={isLive ? "text-emerald-400" : isPaused ? "text-amber-400" : "text-white/30"}>
                  {isLive ? "LIVE" : isPaused ? "PAUSED" : statusData ? "STOPPED" : "—"}
                </span>
              </div>
              <div className="text-[9px] font-mono text-white/30">
                Checks queue every {statusData ? Math.round(statusData.intervalMs / 1000) : 30}s · min {statusData?.minBalanceSats?.toLocaleString() ?? "5,000"} sats to inscribe
              </div>
            </div>
          </div>
          {statusData && (
            <button
              onClick={() => toggleProcessor(!statusData.enabled)}
              data-testid="button-processor-toggle"
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${statusData.enabled ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"}`}>
              {statusData.enabled ? "Pause" : "Resume"}
            </button>
          )}
        </div>

        {statusData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Inscribed", value: statusData.totalProcessed ?? 0, color: "text-emerald-400" },
              { label: "Failed",    value: statusData.totalFailed ?? 0,    color: "text-red-400" },
              { label: "Pending",  value: statusData.queueDepth ?? 0,      color: "text-amber-400" },
              { label: "Wallet",   value: statusData.walletConfigured ? "READY" : "NOT SET", color: statusData.walletConfigured ? "text-emerald-400" : "text-red-400" },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                <div className="text-[8px] font-mono text-white/25 uppercase">{s.label}</div>
                <div className={`text-sm font-mono font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {statusData?.lastInscriptionId && (
          <div className="rounded-lg bg-black/40 border border-white/5 px-3 py-2">
            <div className="text-[8px] font-mono text-white/25 uppercase mb-1">Last Inscription</div>
            <div className="text-[10px] font-mono text-emerald-400 truncate">{statusData.lastInscriptionId}</div>
            {statusData.lastInscriptionTime && (
              <div className="text-[9px] font-mono text-white/30 mt-0.5">{new Date(statusData.lastInscriptionTime).toLocaleString()}</div>
            )}
          </div>
        )}

        {statusData?.lastError && (
          <div className="rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2">
            <div className="text-[8px] font-mono text-red-400/60 uppercase mb-0.5">Last Error {statusData.lastErrorTime ? `· ${new Date(statusData.lastErrorTime).toLocaleTimeString()}` : ""}</div>
            <div className="text-[10px] font-mono text-red-300/70">{statusData.lastError}</div>
          </div>
        )}

        <div className="text-[9px] font-mono text-white/25 border-t border-white/5 pt-2">
          Auto-inscribes NXT transfers ≥100 NXT + governance executions → wnsp.sats anchor on Bitcoin
        </div>
      </div>

      {/* Flow */}
      <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 overflow-x-auto pb-1">
        {["NexusOS Event", "→", "WASCII Encoder", "→", "BTC Queue", "→", "Taproot Inscription", "→", "wnsp.sats anchor"].map((s, i) => (
          <span key={i} className={s === "→" ? "text-white/15 shrink-0" : "px-2 py-1 rounded bg-white/5 border border-white/5 shrink-0 text-white/50"}>{s}</span>
        ))}
      </div>

      {/* Wallet */}
      {walletLoading ? <div className="h-24 rounded-2xl bg-white/[0.02] border border-white/8 animate-pulse" /> : walletData ? <WalletCard info={walletData} /> : null}

      {/* Fee rates */}
      {feeData && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="text-[9px] font-mono text-white/30 uppercase mb-2">Live Network Fee Rates</div>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: "Fast (~10min)", value: feeData.fast, color: "#f87171" }, { label: "Medium (~1hr)", value: feeData.medium, color: "#fbbf24" }, { label: "Slow (~1day)", value: feeData.slow, color: "#34d399" }].map(f => (
              <div key={f.label} className="rounded-lg bg-black/30 border border-white/5 p-2.5 text-center">
                <div className="text-[9px] font-mono text-white/30 mb-0.5">{f.label}</div>
                <div className="text-sm font-mono font-bold" style={{ color: f.color }}>{f.value}</div>
                <div className="text-[9px] font-mono text-white/30">sat/vbyte</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anchor config */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-900/5 p-4 space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/60">wnsp.sats Anchor</div>
        <p className="text-[11px] text-white/50">Link all auto-inscriptions as children of <strong className="text-white/70">wnsp.sats</strong> on Bitcoin.</p>
        <div className="space-y-2">
          <input value={anchorAddress} onChange={e => setAnchorAddress(e.target.value)} placeholder="wnsp.sats Taproot address (bc1p...)"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/30" />
          <input value={parentId} onChange={e => setParentId(e.target.value)} placeholder="wnsp.sats inscription ID (hex...i0)"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/30" />
          <button onClick={saveAnchor} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-mono hover:bg-violet-500/30 transition-all" data-testid="button-save-anchor">
            {anchorSaved ? <><CheckCircle2 size={11} /> Saved</> : <><Settings size={11} /> Save Anchor</>}
          </button>
        </div>
      </div>

      {/* Manual trigger */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">Manual Queue Trigger</div>
        <div className="flex gap-2 flex-wrap">
          <select value={triggerType} onChange={e => setTriggerType(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/20">
            {["NXT_TRANSFER","GOVERNANCE","KERNEL","WASCII_MANUAL","ORDINAL_DEPOSIT"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={triggerNote} onChange={e => setTriggerNote(e.target.value)} placeholder="Optional note..."
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 min-w-32" />
          <button onClick={triggerQueue} disabled={triggerBusy} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-mono hover:bg-violet-500/30 transition-all disabled:opacity-40" data-testid="button-manual-trigger">
            {triggerBusy ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />} Queue
          </button>
        </div>
        {triggerMsg && <div className={`text-[11px] font-mono ${triggerMsg.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>{triggerMsg}</div>}
      </div>

      {/* Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-0.5">Inscription Queue</div>
            <div className="text-sm font-bold text-white">{queueData?.items?.filter((i: any) => i.status === "pending").length ?? 0} pending · {queueData?.items?.filter((i: any) => i.status === "confirmed").length ?? 0} confirmed</div>
          </div>
          <div className="flex items-center gap-2">
            {queueLoading && <RefreshCw size={12} className="text-white/30 animate-spin" />}
            <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] })} className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw size={13} /></button>
          </div>
        </div>
        {(!queueData?.items || queueData.items.length === 0) && (
          <div className="text-center text-white/20 text-xs font-mono py-8 rounded-xl border border-white/5">No inscriptions queued yet. Use the trigger above.</div>
        )}
        <div className="space-y-3">
          {queueData?.items?.map((item: any) => (
            <div key={item.id}>
              <QueueCard item={item} onInscribe={handleAutoInscribe} inscribing={inscribingId === item.id} />
              {inscribeMsg[item.id] && <div className={`text-[10px] font-mono mt-1 px-3 ${inscribeMsg[item.id].startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>{inscribeMsg[item.id]}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-300/70 leading-relaxed">
          <strong className="text-amber-300">Security:</strong> Service wallet WIF stored as Replit secret — never in code. Keep only $50–200 at a time. Your main Unisat wallet stays in Unisat.
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — IDENTITY (naming + resolver)
// ══════════════════════════════════════════════════════════════════════════════
const NAME_TYPES = [
  { key: "sats", icon: Hash, color: "#f59e0b", badge: "wnsp.sats", title: ".sats Names", protocol: "Sats Names Protocol · Bitcoin", desc: "Inscribe 'wnsp.sats' directly on Bitcoin via the Sats Names protocol. Tradeable, transferable, permanent Ordinal. Resolves to your Taproot address.", steps: ["Open Unisat → Names tab", "Search 'wnsp'", "Mint wnsp.sats", "Costs ~$10–30 in BTC fees"], registryUrl: "https://unisat.io/market/name" },
  { key: "btc", icon: Globe, color: "#22d3ee", badge: "wnsp.btc", title: ".btc Domains", protocol: "Bitcoin Name System · Stacks L2", desc: "BNS (.btc) domains live on Stacks, a Bitcoin L2. Resolves to a Bitcoin address and can serve a site via IPFS. Owned forever with one upfront payment.", steps: ["Visit app.stacks.id or btc.us", "Search 'wnsp'", "Register wnsp.btc", "Link to bc1p Taproot address"], registryUrl: "https://btc.us" },
  { key: "4letter", icon: Bitcoin, color: "#a78bfa", badge: '"wnsp"', title: "4-Letter Ordinal", protocol: "Raw Bitcoin Ordinal Inscription", desc: "Inscribe the 4 characters 'wnsp' as a raw text Ordinal. 4-letter inscriptions are genuinely scarce — an immutable on-chain timestamp at a specific block height.", steps: ["Open Unisat → Inscribe → Text", "Type exactly: wnsp", "Set content-type: text/plain", "Confirm with Taproot (bc1p) wallet"], registryUrl: "https://unisat.io/inscribe" },
];

function IdentityTab() {
  const [open, setOpen] = useState<string | null>(null);
  const [resolveInput, setResolveInput] = useState("");
  const [resolveResult, setResolveResult] = useState<any>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveError, setResolveError] = useState("");

  async function resolve() {
    const name = resolveInput.trim().toLowerCase();
    if (!name) return;
    setResolveLoading(true); setResolveError(""); setResolveResult(null);
    try {
      const res = await fetch(`/api/btc-bridge/resolve/${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resolution failed");
      setResolveResult(data);
    } catch (e: any) { setResolveError(e.message); }
    finally { setResolveLoading(false); }
  }

  return (
    <div className="space-y-8">
      {/* Resolver */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-blue-900/5 p-5 space-y-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/60 mb-1">Live Bridge Resolver</div>
          <p className="text-xs text-white/50">Enter a Bitcoin name → get its WNSP Ψ channel instantly.</p>
        </div>
        <div className="flex gap-2">
          <input value={resolveInput} onChange={e => setResolveInput(e.target.value)} onKeyDown={e => e.key === "Enter" && resolve()} placeholder="wnsp.sats  /  wnsp.btc  /  bc1p..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/40" data-testid="input-btc-resolver" />
          <button onClick={resolve} disabled={resolveLoading} className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-mono hover:bg-cyan-500/30 transition-all disabled:opacity-40 flex items-center gap-2" data-testid="button-btc-resolve">
            {resolveLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />} Resolve
          </button>
        </div>
        {resolveError && <div className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{resolveError}</div>}
        {resolveResult && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[{ label: "Name", value: resolveResult.name, color: "#fbbf24" }, { label: "Type", value: resolveResult.nameType?.toUpperCase(), color: "#a78bfa" }, { label: "Ψ Channel", value: resolveResult.psi, color: "#22d3ee" }, { label: "λ (nm)", value: resolveResult.lambdaNm ? Number(resolveResult.lambdaNm).toFixed(2) + " nm" : "—", color: "#34d399" }].map(item => (
                <div key={item.label} className="rounded-lg bg-black/40 border border-white/5 p-2.5">
                  <div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">{item.label}</div>
                  <div className="text-xs font-mono font-bold truncate" style={{ color: item.color }}>{item.value || "—"}</div>
                </div>
              ))}
            </div>
            {resolveResult.btcAddress && (
              <div className="rounded-lg bg-black/40 border border-white/5 p-3 flex items-center justify-between gap-3">
                <div><div className="text-[9px] font-mono text-white/30 uppercase mb-0.5">Bitcoin Address</div><div className="text-[11px] font-mono text-orange-300 break-all">{resolveResult.btcAddress}</div></div>
                <CopyBtn text={resolveResult.btcAddress} label="Copy" />
              </div>
            )}
            {resolveResult.source && <div className="text-[10px] font-mono text-white/30 flex items-center gap-1.5"><Link2 size={9} /> Resolved via: {resolveResult.source}{resolveResult.status === "live" && <span className="text-emerald-400"> · live on-chain</span>}</div>}
          </div>
        )}
      </div>

      {/* Name types */}
      <div>
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30 mb-1">Bitcoin Identity Layer</div>
          <h2 className="text-lg font-bold text-white">Claim wnsp on Bitcoin's naming systems.</h2>
          <p className="text-white/40 text-xs mt-1">Three protocols, all on-chain, all censorship-proof. Each maps to a WNSP Ψ channel.</p>
        </div>
        <div className="space-y-4">
          {NAME_TYPES.map(item => (
            <div key={item.key} className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + "18", border: `1px solid ${item.color}33` }}><item.icon size={16} style={{ color: item.color }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: item.color + "15", color: item.color, border: `1px solid ${item.color}30` }}>{item.badge}</span>
                    </div>
                    <div className="text-[10px] font-mono text-white/30">{item.protocol}</div>
                  </div>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-4">{item.desc}</p>
                <div className="flex items-center gap-3">
                  <a href={item.registryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono hover:opacity-80 transition-opacity" style={{ color: item.color }}><ExternalLink size={10} /> Register now</a>
                  <button onClick={() => setOpen(open === item.key ? null : item.key)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">{open === item.key ? <><ChevronUp size={11} /> Hide steps</> : <><ChevronDown size={11} /> How to</>}</button>
                </div>
              </div>
              {open === item.key && (
                <div className="border-t border-white/5 bg-black/40 p-4 space-y-1.5">
                  {item.steps.map((s, i) => <div key={i} className="flex items-start gap-2.5"><span className="text-[9px] font-mono mt-0.5 shrink-0" style={{ color: item.color + "80" }}>0{i + 1}</span><span className="text-[11px] text-white/60">{s}</span></div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bridge mechanics */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-900/5 p-6 space-y-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-violet-400/60">How the Bridge Works</div>
        <h2 className="text-base font-bold text-white">Name → Address → Ψ Channel. Fully automated.</h2>
        <div className="space-y-2.5">
          {[
            { step: "01", color: "#f59e0b", label: "Resolve name", detail: "wnsp.sats → Unisat API → bc1p... Taproot address." },
            { step: "02", color: "#22d3ee", label: "CE-encode the address", detail: "Every character of the Bitcoin address maps to a wavelength (380–780nm)." },
            { step: "03", color: "#a78bfa", label: "Derive the Ψ channel", detail: "Mean wavelength → WDM. Sum of char codes → OAM (% 50). Parity → Polarisation. Result: Ψ(wdm, oam, pol)." },
            { step: "04", color: "#34d399", label: "Physics-routed traffic", detail: "Any WNSP packet addressed to wnsp.sats is routed through the derived Ψ channel — deterministic and reproducible by anyone." },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-3 rounded-xl border border-white/5 bg-black/20">
              <div className="text-xl font-bold font-mono shrink-0 opacity-30" style={{ color: s.color }}>{s.step}</div>
              <div><div className="text-xs font-semibold text-white mb-0.5">{s.label}</div><div className="text-[11px] text-white/50 leading-relaxed">{s.detail}</div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "inscriptions", label: "Inscriptions",  icon: Waves },
  { id: "bridge",       label: "Auto-Bridge",   icon: Zap   },
  { id: "identity",     label: "Identity",      icon: Bitcoin },
];

export default function WnspOrdinalsPage() {
  const [tab, setTab] = useState("inscriptions");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors">← Hub</Link>
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">NexusOS × Bitcoin</span>
        <Link href="/hardware-spec" className="text-[11px] font-mono px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center gap-1.5 hover:bg-orange-500/20 transition-colors">
          <Shield size={10} /> AGPL-3.0
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
            <Bitcoin size={11} /> NexusOS × Bitcoin Ordinals
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            The protocol lives<br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">on Bitcoin. Forever.</span>
          </h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-xl">
            NexusOS writes its physics engine, tokenomics, and hardware spec permanently to Bitcoin. Every NXT transfer, governance vote, and kernel event auto-inscribes to the chain — anchored to <strong className="text-white/80">wnsp.sats</strong>.
          </p>

          {/* Impact summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {[
              { label: "Economics",   detail: "NXT fee burns inscribed on-chain — immutable monetary audit trail", color: "#fbbf24", icon: Activity },
              { label: "Tokenomics",  detail: "Every token emission & governance change timestamped on Bitcoin", color: "#34d399", icon: Zap },
              { label: "Hardware IP", detail: "SNIC + PHR-1 prior art protected by AGPL-3.0 Bitcoin inscription", color: "#a78bfa", icon: Shield },
              { label: "Protocol",   detail: "WNSP spec + CE table owned by no one — permanently public domain", color: "#22d3ee", icon: Waves },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <item.icon size={11} style={{ color: item.color }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: item.color }}>{item.label}</span>
                </div>
                <p className="text-[9px] text-white/40 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono transition-all ${tab === t.id ? "bg-orange-500/20 text-orange-400 border border-orange-500/20" : "text-white/40 hover:text-white/60"}`}
              data-testid={`tab-${t.id}`}>
              <t.icon size={11} /> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "inscriptions" && <WasciiTab />}
        {tab === "bridge"       && <AutoBridgeTab />}
        {tab === "identity"     && <IdentityTab />}

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-white/20 flex items-center justify-center gap-4 pb-4 flex-wrap">
          <Link href="/" className="hover:text-white/50 transition-colors">Hub</Link>
          <Link href="/hardware-spec" className="hover:text-white/50 transition-colors">Hardware Spec</Link>
          <Link href="/campaign" className="hover:text-white/50 transition-colors">Campaign</Link>
          <a href="https://ordinals.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">ordinals.com <ExternalLink size={9} /></a>
          <a href="https://mempool.space" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">mempool.space <ExternalLink size={9} /></a>
          <a href="https://unisat.io" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors flex items-center gap-1">unisat.io <ExternalLink size={9} /></a>
        </div>

      </div>
    </div>
  );
}
