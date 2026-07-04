import { useState, useMemo, useEffect } from "react";
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
const WNSP_SPEC_ASCII = `WNSP-SPEC-v1.0\nWavelength Network Spectral Protocol — Core Specification\nAGPL-3.0 | NexusOS | First public disclosure: 2026-05-16\n${"═".repeat(72)}\n\nCHANNEL SPACE\n  WDM channels  : 256\n  OAM modes     : 50\n  Polarisations : 2\n  Prop dirs     : 2 (+k forward / -k backward)\n  Total channels: 51,200 orthogonal Psi channels\n\nORTHOGONALITY\n  <Psi_i|Psi_j> = 0 for all i != j\n\nCHARACTER ENCODING (CE v1.0)\n  CE_TABLE[charCode % 128]\n  lambda = 380 + (charCode % 128) * 3.125 + 1.5625 (nm)\n  f = c / lambda  |  E = hf\n\nCOMPRESSION STATE EQUATION\n  Lambda_compress = hf / c^2\n\nAUTHORITY BANDS\n  SYSTEM : lambda < 450nm\n  KERNEL : lambda 450-495nm\n  USER   : lambda 495-590nm\n  GUEST  : lambda > 590nm\n\nWNSP URI FORMAT\n  wnsp://Psi(wdm,oam,pol)/path\n\nSOURCE: https://wnsp.io\n${"─".repeat(72)}\nThis inscription is permanent. The protocol is free.`;

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
  { id: "SPEC-v1", title: "WNSP Core Specification", subtitle: "51,200 Ψ channels, URI format, authority bands", icon: Waves, color: "#22d3ee", content: WNSP_SPEC_ASCII, why: "The Hilbert space, compression state equation, and authority bands — timestamped on Bitcoin as the canonical protocol reference. Owned by no one." },
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
  const eventColor = EVENT_COLORS[item.eventType] ?? "#94a3b8";

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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ backgroundColor: eventColor + "15", color: eventColor, borderColor: eventColor + "30" }}>{item.eventType}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
            {item.psiChannel && <span className="text-[10px] font-mono text-cyan-400/60">{item.psiChannel}</span>}
          </div>
          <span className="text-[9px] font-mono text-white/20 shrink-0">#{item.id}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/30 mb-3 flex-wrap">
          {item.triggeredBy && <span>by {item.triggeredBy}</span>}
          {item.contentBytes && <span>{item.contentBytes.toLocaleString()} bytes</span>}
          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</span>
        </div>
        {item.inscriptionId ? (
          <a href={`https://ordinals.com/inscription/${item.inscriptionId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors">
            <ExternalLink size={10} /> {item.inscriptionId.slice(0, 24)}...i0
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
          <button onClick={() => navigator.clipboard.writeText(item.inscriptionContent)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors"><Copy size={9} /> Copy content</button>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors ml-auto">{expanded ? <><ChevronUp size={10} /> Hide</> : <><ChevronDown size={10} /> Preview</>}</button>
        </div>
      </div>
      {expanded && <div className="border-t border-white/5 bg-black/50 p-3 max-h-48 overflow-y-auto"><pre className="text-[9px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap">{item.inscriptionContent}</pre></div>}
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
  const [triggerWallet, setTriggerWallet] = useState("");
  const [triggerToWallet, setTriggerToWallet] = useState("");
  const [triggerAmount, setTriggerAmount] = useState("");
  const [triggerLabel, setTriggerLabel] = useState("");
  const [triggerPsi, setTriggerPsi] = useState("");
  const [triggerMsg, setTriggerMsg] = useState("");
  const [triggerBusy, setTriggerBusy] = useState(false);

  const { data: walletData, isLoading: walletLoading } = useQuery<any>({ queryKey: ["/api/btc-bridge/wallet"], refetchInterval: 30_000 });
  const { data: queueData, isLoading: queueLoading } = useQuery<any>({ queryKey: ["/api/btc-bridge/queue"], refetchInterval: 8_000 });
  const { data: feeData } = useQuery<any>({ queryKey: ["/api/btc-bridge/fee-rate"], refetchInterval: 60_000 });
  const { data: statusData } = useQuery<any>({ queryKey: ["/api/btc-bridge/status"], refetchInterval: 5_000 });
  const { data: anchorData } = useQuery<any>({ queryKey: ["/api/btc-bridge/anchor"] });

  // Pre-populate anchor fields from saved DB values
  useEffect(() => {
    if (anchorData?.address    && !anchorAddress) setAnchorAddress(anchorData.address);
    if (anchorData?.parentInscriptionId && !parentId) setParentId(anchorData.parentInscriptionId);
  }, [anchorData]);

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
      const data: Record<string, string> = {};
      if (triggerNote)     data.note        = triggerNote;
      if (triggerWallet)   data.from_wallet = triggerWallet;
      if (triggerToWallet) data.to_wallet   = triggerToWallet;
      if (triggerAmount)   data.amount_nxt  = triggerAmount;
      if (triggerLabel)    data.label       = triggerLabel;
      if (triggerPsi)      data.psi_channel = triggerPsi;
      data.platform = "wnsp.io"; data.org = "wnsp.io";
      const res = await apiFetch("/api/btc-bridge/queue/trigger", {
        method: "POST", body: JSON.stringify({ eventType: triggerType, data }),
      });
      setTriggerMsg(`✓ Queued #${res.queued?.id} (${res.queued?.psi ?? "Ψ..."}) — auto-inscribing to Bitcoin`);
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

      {/* Manual trigger — full ecosystem */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">Manual Queue Trigger</div>
          <div className="text-[9px] font-mono text-white/20">Inscribes to Bitcoin via wnsp.sats anchor</div>
        </div>

        {/* Category tabs */}
        {(() => {
          const cats: { label: string; color: string; types: string[] }[] = [
            { label: "Tokenomics", color: "#f59e0b", types: ["NXT_TRANSFER","NXT_BURN","NXT_EMISSION"] },
            // NXT_BURN = Orbital Treasury deposit (wnsp.io) — NXT is never destroyed on-chain
            { label: "Governance", color: "#8b5cf6", types: ["GOVERNANCE","PROTOCOL_UPDATE"] },
            { label: "Spectral",   color: "#22d3ee", types: ["SPECTRAL_RECORD","WASCII_ENCODE","WASCII_MANUAL","CHANNEL_OPEN"] },
            { label: "Network",    color: "#34d399", types: ["NODE_REGISTER","CONTRACT_SIGN","ORDINAL_DEPOSIT"] },
            { label: "Campaign",   color: "#f97316", types: ["CAMPAIGN_LAUNCH","CAMPAIGN_MILESTONE"] },
            { label: "Kernel/AI",  color: "#a78bfa", types: ["KERNEL","AGENT_ACTION"] },
          ];
          const activeCat = cats.find(c => c.types.includes(triggerType)) ?? cats[0];
          return (
            <div className="space-y-3">
              {/* Category pills */}
              <div className="flex gap-1.5 flex-wrap">
                {cats.map(c => {
                  const active = c.types.includes(triggerType);
                  return (
                    <button key={c.label} onClick={() => setTriggerType(c.types[0])}
                      className="px-2.5 py-1 rounded-full text-[10px] font-mono border transition-all"
                      style={active ? { backgroundColor: c.color + "20", color: c.color, borderColor: c.color + "40" } : { color: "#ffffff40", borderColor: "#ffffff10" }}>
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Event type within category */}
              <div className="flex gap-2 flex-wrap">
                <select value={triggerType} onChange={e => setTriggerType(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white/20 flex-1"
                  style={{ color: activeCat.color }}>
                  {cats.map(c => (
                    <optgroup key={c.label} label={`── ${c.label} ──`}>
                      {c.types.map(t => <option key={t} value={t} style={{ color: "#fff" }}>
                        {t === "NXT_BURN" ? "NXT_BURN  →  Orbital Treasury (wnsp.io)" : t}
                      </option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Context-sensitive fields */}
              <div className="space-y-2">
                {/* Wallet address fields — Tokenomics & Network */}
                {["NXT_TRANSFER","NXT_BURN","NXT_EMISSION","CONTRACT_SIGN","NODE_REGISTER","ORDINAL_DEPOSIT"].includes(triggerType) && (
                  <input value={triggerWallet} onChange={e => setTriggerWallet(e.target.value)}
                    placeholder="From wallet address (NXT-... or bc1p...)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30" />
                )}
                {["NXT_TRANSFER","NXT_EMISSION"].includes(triggerType) && (
                  <input value={triggerToWallet} onChange={e => setTriggerToWallet(e.target.value)}
                    placeholder="To wallet address (NXT-... or bc1p...)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30" />
                )}
                {/* Amount — Tokenomics */}
                {["NXT_TRANSFER","NXT_BURN","NXT_EMISSION"].includes(triggerType) && (
                  <input value={triggerAmount} onChange={e => setTriggerAmount(e.target.value)}
                    placeholder="Amount NXT (e.g. 1000.00000000)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30" />
                )}
                {/* Wallet — Spectral, Campaign, Agent */}
                {["SPECTRAL_RECORD","WASCII_ENCODE","CHANNEL_OPEN","CAMPAIGN_LAUNCH","CAMPAIGN_MILESTONE","AGENT_ACTION"].includes(triggerType) && (
                  <input value={triggerWallet} onChange={e => setTriggerWallet(e.target.value)}
                    placeholder="Wallet address (NXT-... or bc1p...) — optional"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30" />
                )}
                {/* Label / Name */}
                {["SPECTRAL_RECORD","CHANNEL_OPEN","CAMPAIGN_LAUNCH","CAMPAIGN_MILESTONE","CONTRACT_SIGN","NODE_REGISTER","AGENT_ACTION"].includes(triggerType) && (
                  <input value={triggerLabel} onChange={e => setTriggerLabel(e.target.value)}
                    placeholder={
                      triggerType === "CAMPAIGN_LAUNCH" || triggerType === "CAMPAIGN_MILESTONE" ? "Campaign name" :
                      triggerType === "CONTRACT_SIGN" ? "Contract title" :
                      triggerType === "AGENT_ACTION"  ? "Agent name / action" :
                      triggerType === "NODE_REGISTER" ? "Node ID / alias" :
                      "Label / record name"
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30" />
                )}
                {/* Milestone */}
                {triggerType === "CAMPAIGN_MILESTONE" && (
                  <input value={triggerNote} onChange={e => setTriggerNote(e.target.value)}
                    placeholder="Milestone description (e.g. 1000 users, $10k raised)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/30" />
                )}
                {/* PSI channel */}
                {["SPECTRAL_RECORD","WASCII_ENCODE","CHANNEL_OPEN","NODE_REGISTER"].includes(triggerType) && (
                  <input value={triggerPsi} onChange={e => setTriggerPsi(e.target.value)}
                    placeholder="Ψ channel (e.g. Ψ(27,56,H)) — optional"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30" />
                )}
                {/* Universal note */}
                {triggerType !== "CAMPAIGN_MILESTONE" && (
                  <input value={triggerNote} onChange={e => setTriggerNote(e.target.value)}
                    placeholder="Note / description (optional)"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-white/20" />
                )}
              </div>

              {/* Inscribe preview label */}
              <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2 text-[10px] font-mono text-white/30 flex items-center gap-2">
                <span style={{ color: activeCat.color }}>⬡</span>
                <span>Will inscribe: <span className="text-white/50">{triggerType}</span> · WASCII-v2.0 · wnsp.sats anchor · wnsp.io / wnsp.io</span>
              </div>

              <button onClick={triggerQueue} disabled={triggerBusy}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-mono text-xs disabled:opacity-40"
                style={{ backgroundColor: activeCat.color + "15", color: activeCat.color, borderColor: activeCat.color + "30" }}
                data-testid="button-manual-trigger">
                {triggerBusy ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                Queue {triggerType} Inscription
              </button>
            </div>
          );
        })()}

        {triggerMsg && (
          <div className={`text-[11px] font-mono px-3 py-2 rounded-lg border ${triggerMsg.startsWith("Error") ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"}`}>
            {triggerMsg}
          </div>
        )}
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
  { key: "sats", icon: Hash, color: "#f59e0b", badge: "wnsp.sats", title: ".sats Names", protocol: "Sats Names Protocol · Bitcoin", owned: true, desc: "wnsp.sats is confirmed — permanently inscribed on Bitcoin via the Sats Names protocol. This is the primary anchor for all NexusOS auto-inscriptions.", steps: ["wnsp.sats registered ✓", "Configured as inscription anchor", "All auto-queue events child of wnsp.sats", "Resolves to bc1pkpap9g... Taproot address"], registryUrl: "https://unisat.io/market/name" },
  { key: "btc", icon: Globe, color: "#22d3ee", badge: "wnsp.btc", title: ".btc Domains", protocol: "Bitcoin Name System · BNS", owned: true, desc: "wnsp.btc is confirmed — registered on the Bitcoin Name System (BNS), a Stacks L2 protocol. Resolves to a Bitcoin address and serves wnsp.io via IPFS.", steps: ["wnsp.btc registered ✓", "Resolves to bc1p Taproot address", "Links to wnsp.io platform", "Permanent — no renewal fee"], registryUrl: "https://btc.us" },
  { key: "unisat", icon: Bitcoin, color: "#a78bfa", badge: "wnsp.unisat", title: "UniSat Name", protocol: "UniSat Name Service · Bitcoin", owned: true, desc: "wnsp.unisat is confirmed — registered on UniSat's naming layer. Resolves on the UniSat explorer and links to the wnsp.io organisation wallet and inscription history.", steps: ["wnsp.unisat registered ✓", "Visible on unisat.io profile", "Links to wnsp.io org", "Full inscription history indexed"], registryUrl: "https://unisat.io" },
  { key: "sat", icon: Hash, color: "#34d399", badge: "wnsp.sat", title: ".sat Names", protocol: "UniSat .sat Protocol · Bitcoin", owned: true, desc: "wnsp.sat is confirmed — registered on UniSat's .sat naming protocol. Complementary to wnsp.sats, providing dual-name coverage across both Sats naming standards.", steps: ["wnsp.sat registered ✓", "UniSat .sat TLD", "Resolves alongside wnsp.sats", "Cross-resolver compatible"], registryUrl: "https://unisat.io/market/name" },
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
          <input value={resolveInput} onChange={e => setResolveInput(e.target.value)} onKeyDown={e => e.key === "Enter" && resolve()} placeholder="wnsp.sats  /  wnsp.btc  /  wnsp.unisat  /  wnsp.sat  /  bc1p..."
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
          <p className="text-white/40 text-xs mt-1">Four confirmed Bitcoin names — all on-chain, all censorship-proof. Each maps to a WNSP Ψ channel.</p>
        </div>
        <div className="space-y-4">
          {NAME_TYPES.map(item => (
            <div key={item.key} className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + "18", border: `1px solid ${item.color}33` }}><item.icon size={16} style={{ color: item.color }} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: item.color + "15", color: item.color, border: `1px solid ${item.color}30` }}>{item.badge}</span>
                      {(item as any).owned && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">CONFIRMED ✓</span>}
                    </div>
                    <div className="text-[10px] font-mono text-white/30">{item.protocol}</div>
                  </div>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-4">{item.desc}</p>
                <div className="flex items-center gap-3">
                  <a href={item.registryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono hover:opacity-80 transition-opacity" style={{ color: item.color }}><ExternalLink size={10} /> {(item as any).owned ? "View on explorer" : "Register now"}</a>
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
            { step: "01", color: "#f59e0b", label: "Resolve name", detail: "wnsp.sats / wnsp.sat / wnsp.btc / wnsp.unisat → resolver API → bc1p... Taproot address." },
            { step: "02", color: "#22d3ee", label: "CE-encode the address", detail: "Every character of the Bitcoin address maps to a wavelength (380–780nm)." },
            { step: "03", color: "#a78bfa", label: "Derive the Ψ channel", detail: "Mean wavelength → WDM. Sum of char codes → OAM (% 50). Parity → Polarisation. Result: Ψ(wdm, oam, pol)." },
            { step: "04", color: "#34d399", label: "Physics-routed traffic", detail: "Any WNSP packet addressed to wnsp.sats, wnsp.sat, wnsp.btc, or wnsp.unisat routes through the same derived Ψ channel — deterministic and reproducible by anyone." },
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
// TAB 4 — BRC-20 (deploy · mint · transfer)
// ══════════════════════════════════════════════════════════════════════════════
function Brc20Tab() {
  const qc = useQueryClient();

  // Deploy state
  const [deployTick, setDeployTick]   = useState("wnsp");
  const [deployMax,  setDeployMax]    = useState("21000000000");
  const [deployLim,  setDeployLim]    = useState("1000");
  const [deployBusy, setDeployBusy]   = useState(false);
  const [deployMsg,  setDeployMsg]    = useState("");
  const [deployJson, setDeployJson]   = useState("");

  // Mint state
  const [mintTick,   setMintTick]     = useState("wnsp");
  const [mintAmt,    setMintAmt]      = useState("1000");
  const [mintBusy,   setMintBusy]     = useState(false);
  const [mintMsg,    setMintMsg]      = useState("");
  const [mintCount,  setMintCount]    = useState(1);

  // BRC-20 Transfer state
  const [xfrAmt,     setXfrAmt]       = useState("");
  const [xfrBusy,    setXfrBusy]      = useState(false);
  const [xfrMsg,     setXfrMsg]       = useState("");

  // NXT WaveChannel Transfer state
  const [nxtTo,      setNxtTo]        = useState("");
  const [nxtAmt,     setNxtAmt]       = useState("");
  const [nxtMemo,    setNxtMemo]      = useState("");
  const [nxtBusy,    setNxtBusy]      = useState(false);
  const [nxtMsg,     setNxtMsg]       = useState("");

  const { data: queueData }  = useQuery<any>({ queryKey: ["/api/btc-bridge/queue"],  refetchInterval: 8_000 });
  const { data: liveWallet } = useQuery<any>({ queryKey: ["/api/btc-bridge/wallet"], refetchInterval: 15_000 });
  const { data: nxtWallet }  = useQuery<any>({ queryKey: ["/api/wallet"],            refetchInterval: 15_000 });
  const brc20Items = (queueData?.items ?? []).filter((i: any) => ["BRC20_DEPLOY","BRC20_MINT","BRC20_TRANSFER"].includes(i.eventType));

  const confirmedSats   = liveWallet?.balance?.confirmed   ?? 0;
  const unconfirmedSats = liveWallet?.balance?.unconfirmed ?? 0;
  const canInscribe     = confirmedSats >= 5000;

  function authErr(e: any): string {
    const msg = e?.message ?? "";
    if (msg.toLowerCase().includes("authoriz") || msg.toLowerCase().includes("401") || msg.toLowerCase().includes("log in") || msg.toLowerCase().includes("session"))
      return "AUTH";
    return msg;
  }

  async function doDeploy() {
    setDeployBusy(true); setDeployMsg(""); setDeployJson("");
    try {
      const res = await apiFetch("/api/btc-bridge/brc20/deploy", { method: "POST",
        body: JSON.stringify({ tick: deployTick, max: deployMax, lim: deployLim }) });
      setDeployMsg(`✓ Queued #${res.queued?.id} — auto-inscribing to Bitcoin`);
      setDeployJson(res.content ?? "");
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
    } catch (e: any) { setDeployMsg(authErr(e) === "AUTH" ? "AUTH" : "Error: " + e.message); }
    finally { setDeployBusy(false); }
  }

  async function doMint(count = 1) {
    setMintBusy(true); setMintMsg("");
    try {
      for (let i = 0; i < count; i++) {
        await apiFetch("/api/btc-bridge/brc20/mint", { method: "POST",
          body: JSON.stringify({ tick: mintTick, amt: mintAmt }) });
      }
      setMintMsg(`✓ ${count}× mint queued — auto-inscribing`);
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
    } catch (e: any) { setMintMsg(authErr(e) === "AUTH" ? "AUTH" : "Error: " + e.message); }
    finally { setMintBusy(false); }
  }

  async function doTransfer() {
    setXfrBusy(true); setXfrMsg("");
    try {
      const res = await apiFetch("/api/btc-bridge/brc20/transfer", { method: "POST",
        body: JSON.stringify({ tick: mintTick, amt: xfrAmt }) });
      setXfrMsg(`✓ Transfer queued #${res.queued?.id}`);
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/queue"] });
    } catch (e: any) { setXfrMsg(authErr(e) === "AUTH" ? "AUTH" : "Error: " + e.message); }
    finally { setXfrBusy(false); }
  }

  async function doNxtTransfer() {
    setNxtBusy(true); setNxtMsg("");
    try {
      const body: any = { toAddress: nxtTo.trim(), amount: nxtAmt.trim() };
      if (nxtMemo.trim()) body.memo = nxtMemo.trim();
      await apiFetch("/api/wallet/transfer", { method: "POST", body: JSON.stringify(body) });
      setNxtMsg(`✓ Sent ${nxtAmt} NXT → ${nxtTo.trim().slice(0, 20)}…`);
      setNxtAmt(""); setNxtMemo("");
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    } catch (e: any) { setNxtMsg(authErr(e) === "AUTH" ? "AUTH" : "Error: " + e.message); }
    finally { setNxtBusy(false); }
  }

  function AuthBanner() {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/8 border border-amber-500/25 px-4 py-3">
        <div className="text-amber-400 mt-0.5">⚠</div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-mono font-bold text-amber-400">Log in to NexusOS first</div>
          <div className="text-[11px] text-white/50 mt-0.5">BRC-20 operations queue a real Bitcoin transaction — authentication is required to authorise it.</div>
        </div>
        <a href="/auth" className="shrink-0 text-[11px] font-mono px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 transition-all">
          Log in →
        </a>
      </div>
    );
  }

  const previewJson = JSON.stringify({ p: "brc-20", op: "deploy", tick: deployTick.toLowerCase(), max: deployMax, lim: deployLim }, null, 2);
  const maxNum = parseFloat(deployMax) || 0;
  const limNum = parseFloat(deployLim) || 0;
  const totalMints = limNum > 0 ? Math.ceil(maxNum / limNum) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-amber-900/5 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            <Bitcoin size={15} className="text-orange-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">BRC-20 Token Operations</div>
            <div className="text-[10px] font-mono text-white/30">Deploy · Mint · Transfer — inscribed directly to Bitcoin via NexusOS</div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap pt-1">
          {["wnsp.btc","wnsp.unisat","wnsp.sats","wnsp.sat"].map(n => (
            <span key={n} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">{n}</span>
          ))}
        </div>
      </div>

      {/* DEPLOY — wnsp BRC-20 (not yet on Bitcoin) */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-black p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-bold text-white font-mono">Deploy wnsp BRC-20 → Bitcoin</span>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Step 1 of 2 · Not yet inscribed</span>
        </div>

        {/* What will be inscribed */}
        <div className="rounded-xl bg-black/60 border border-amber-500/15 p-3 font-mono text-[12px] text-amber-300">
          {"{"}"p":"brc-20","op":"deploy","tick":"wnsp","max":"21000000000","lim":"1000"{"}"}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Max Supply",  value: "21,000,000,000", sub: "wnsp total" },
            { label: "Per Mint",    value: "1,000",           sub: "wnsp / mint" },
            { label: "Total Mints", value: "21,000,000",      sub: "to fill supply" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-black/40 border border-white/5 px-2 py-3">
              <div className="text-[10px] font-mono text-white/30 uppercase mb-1">{s.label}</div>
              <div className="text-sm font-mono font-bold text-amber-400">{s.value}</div>
              <div className="text-[9px] text-white/20 font-mono">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Live wallet status */}
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${canInscribe ? "bg-emerald-500/8 border-emerald-500/20" : "bg-amber-500/8 border-amber-500/20"}`}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${canInscribe ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Service Wallet — live</span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${canInscribe ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-amber-500/15 text-amber-400 border-amber-500/25"}`}>
                {canInscribe ? "Ready to inscribe" : "Waiting for block"}
              </span>
            </div>
            <div className="flex gap-4 mt-1 flex-wrap">
              <span className="text-[11px] font-mono">
                <span className="text-white/30">Confirmed: </span>
                <span className={canInscribe ? "text-emerald-400 font-bold" : "text-white/60"}>{confirmedSats.toLocaleString()} sats</span>
              </span>
              <span className="text-[11px] font-mono">
                <span className="text-white/30">Pending: </span>
                <span className="text-amber-400">{Math.abs(unconfirmedSats).toLocaleString()} sats</span>
              </span>
            </div>
            {!canInscribe && (
              <div className="text-[10px] text-white/30 mt-1 font-mono">
                Pending sats confirm with the next Bitcoin block (~10 min avg). Bridge auto-fires once ready.
              </div>
            )}
          </div>
          <a href={`https://mempool.space/address/${liveWallet?.address ?? ""}`} target="_blank" rel="noopener noreferrer"
            className="text-[9px] font-mono text-cyan-400/60 hover:text-cyan-400 flex items-center gap-0.5 shrink-0 transition-colors">
            <ExternalLink size={9} /> mempool
          </a>
        </div>

        <button onClick={doDeploy} disabled={deployBusy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-400 font-mono text-sm font-bold hover:bg-amber-500/30 transition-all disabled:opacity-40"
          data-testid="button-brc20-deploy">
          {deployBusy ? <RefreshCw size={14} className="animate-spin" /> : <Bitcoin size={14} />}
          Queue wnsp Deploy → Bitcoin
        </button>

        {deployMsg === "AUTH" ? <AuthBanner /> : deployMsg && (
          <div className={`text-[11px] font-mono px-3 py-2 rounded-lg border ${deployMsg.startsWith("Error") ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"}`}>
            {deployMsg}
          </div>
        )}
        {deployJson && (
          <div className="text-[10px] font-mono text-white/30 bg-black/30 rounded-lg px-3 py-2 border border-white/5">
            Queued: <span className="text-amber-400">{deployJson}</span>
          </div>
        )}
      </div>

      {/* MINT — Step 2 */}
      <div className="rounded-2xl border border-emerald-500/20 bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/70">Step 2 — Mint wnsp</div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">Requires deploy to confirm first</span>
        </div>
        <div className="text-[11px] text-white/40 font-mono">
          After the deploy confirms on Bitcoin (~30 min), each mint inscription claims 1,000 wnsp. Batch up to 50× in one click — each queued as a separate Taproot inscription.
        </div>
        {/* Mint preview */}
        <div className="rounded-xl bg-black/50 border border-amber-500/10 p-3 font-mono text-[12px] text-amber-300/80">
          {"{"}"p":"brc-20","op":"mint","tick":"wnsp","amt":"1000"{"}"}
        </div>

        {/* Batch selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono text-white/30">How many mints?</div>
            <div className="text-[10px] font-mono text-amber-400">{mintCount * 1000} wnsp total</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 50].map(n => (
              <button key={n} onClick={() => setMintCount(n)}
                className={`py-2.5 rounded-xl text-[13px] font-mono font-bold border transition-all ${mintCount === n ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/60"}`}>
                ×{n}
              </button>
            ))}
          </div>
          <div className="text-[9px] font-mono text-white/20 text-center">
            {mintCount} inscription{mintCount > 1 ? "s" : ""} · {mintCount * 1000} wnsp · ~{mintCount * 30} min on-chain
          </div>
        </div>

        <button onClick={() => doMint(mintCount)} disabled={mintBusy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-400 font-mono text-sm font-bold hover:bg-amber-500/30 transition-all disabled:opacity-40"
          data-testid="button-brc20-mint">
          {mintBusy ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          Mint {mintCount > 1 ? `${mintCount}×` : ""} wnsp → Bitcoin
        </button>
        {mintMsg === "AUTH" ? <AuthBanner /> : mintMsg && (
          <div className={`text-[11px] font-mono px-3 py-2 rounded-lg border ${mintMsg.startsWith("Error") ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"}`}>{mintMsg}</div>
        )}
      </div>

      {/* TRANSFER */}
      <div className="rounded-2xl border border-cyan-500/20 bg-white/[0.02] p-5 space-y-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/70">3. Transfer Inscription</div>
        <div className="text-[11px] text-white/40">Creates a BRC-20 transfer inscription. Send it to the recipient's address to complete the transfer.</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-white/30 uppercase">Tick</div>
            <input value={mintTick} onChange={e => setMintTick(e.target.value.slice(0,5))}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/40" />
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-white/30 uppercase">Amount</div>
            <input value={xfrAmt} onChange={e => setXfrAmt(e.target.value)} placeholder="e.g. 1000"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/40"
              data-testid="input-brc20-xfr-amt" />
          </div>
        </div>
        <div className="rounded-xl bg-black/50 border border-cyan-500/10 p-3 font-mono text-[11px] text-cyan-300/70">
          {JSON.stringify({ p: "brc-20", op: "transfer", tick: mintTick.toLowerCase(), amt: xfrAmt || "..." })}
        </div>
        <button onClick={doTransfer} disabled={xfrBusy || !xfrAmt}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-xs hover:bg-cyan-500/25 transition-all disabled:opacity-40"
          data-testid="button-brc20-transfer">
          {xfrBusy ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
          Queue Transfer
        </button>
        {xfrMsg === "AUTH" ? <AuthBanner /> : xfrMsg && <div className={`text-[11px] font-mono px-3 py-2 rounded-lg border ${xfrMsg.startsWith("Error") ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"}`}>{xfrMsg}</div>}
      </div>

      {/* NXT WAVECHANNEL TRANSFER */}
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/20 to-black p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Zap size={13} className="text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-white/80">NXT WaveChannel Transfer</div>
              <div className="text-[9px] font-mono text-white/30">Send NXT to any spectral wallet address on-platform</div>
            </div>
          </div>
          {/* Live NXT balance */}
          {nxtWallet?.wallet && (
            <div className="flex items-center gap-2 rounded-lg bg-violet-500/8 border border-violet-500/20 px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[10px] font-mono text-white/50">Balance:</span>
              <span className="text-[11px] font-mono font-bold text-violet-300">
                {parseFloat(nxtWallet.wallet.balance ?? "0").toLocaleString(undefined, { maximumFractionDigits: 2 })} NXT
              </span>
            </div>
          )}
        </div>

        {/* Destination address */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider">WaveChannel Wallet Address</div>
          <input
            value={nxtTo}
            onChange={e => setNxtTo(e.target.value)}
            placeholder="NXT-XXXX-XXXX-XXXX-XXXXX"
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
            data-testid="input-nxt-to"
          />
        </div>

        {/* Amount + Memo row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Amount (NXT)</div>
            <input
              value={nxtAmt}
              onChange={e => setNxtAmt(e.target.value)}
              placeholder="e.g. 1000"
              type="number"
              min="0"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
              data-testid="input-nxt-amount"
            />
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider">Memo (optional)</div>
            <input
              value={nxtMemo}
              onChange={e => setNxtMemo(e.target.value)}
              placeholder="e.g. wnsp mint reward"
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
              data-testid="input-nxt-memo"
            />
          </div>
        </div>

        {/* Preview row */}
        {nxtTo && nxtAmt && (
          <div className="rounded-xl bg-black/50 border border-violet-500/10 px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 text-[10px] font-mono text-violet-300/60 truncate">
              {parseFloat(nxtAmt).toLocaleString()} NXT → {nxtTo.trim()}
            </div>
            {nxtMemo && <div className="text-[10px] font-mono text-white/30 truncate max-w-[120px]">"{nxtMemo}"</div>}
          </div>
        )}

        <button
          onClick={doNxtTransfer}
          disabled={nxtBusy || !nxtTo.trim() || !nxtAmt}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500/20 border border-violet-500/35 text-violet-400 font-mono text-sm font-bold hover:bg-violet-500/30 transition-all disabled:opacity-40"
          data-testid="button-nxt-transfer">
          {nxtBusy ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          Send NXT via WaveChannel
        </button>

        {nxtMsg === "AUTH" ? <AuthBanner /> : nxtMsg && (
          <div className={`text-[11px] font-mono px-3 py-2 rounded-lg border ${nxtMsg.startsWith("Error") ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"}`}>
            {nxtMsg}
          </div>
        )}
      </div>

      {/* BRC-20 queue items */}
      {brc20Items.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">BRC-20 Queue</div>
          {brc20Items.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-white/8 bg-black/30 p-3 flex items-center gap-3">
              <div className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${item.status === "confirmed" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : item.status === "signed" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-white/5 text-white/40 border border-white/10"}`}>{item.status}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-white/70 truncate">{item.eventType}</div>
                <div className="text-[10px] font-mono text-white/30 truncate">{item.inscriptionContent}</div>
              </div>
              {item.inscriptionId && (
                <a href={`https://unisat.io/inscription/${item.inscriptionId}`} target="_blank" rel="noopener noreferrer"
                  className="text-[9px] font-mono text-orange-400 hover:text-orange-300 flex items-center gap-0.5">
                  <ExternalLink size={9} /> UniSat
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-1">
        <div className="text-[10px] font-mono text-white/30 uppercase tracking-wider">How BRC-20 works via NexusOS</div>
        <div className="text-[11px] text-white/40 space-y-1 leading-relaxed">
          <p>1. Each operation queues a raw JSON inscription to Bitcoin — <span className="text-white/60">no WASCII wrapper</span>, just the exact BRC-20 format indexers expect.</p>
          <p>2. The auto-processor picks it up within 30s and broadcasts via commit+reveal Taproot.</p>
          <p>3. After ~3 Bitcoin blocks (~30 min) the inscription is indexed by UniSat, OKX, and all BRC-20 indexers.</p>
          <p>4. Service wallet: <span className="font-mono text-amber-400/70">bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m</span></p>
        </div>
      </div>

      {/* Economic Integration Bridge */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-black p-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
            <Waves size={13} className="text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Economic Integration</div>
            <div className="text-[10px] font-mono text-white/30">wnsp BRC-20 ↔ NXT ↔ Campaign Tiers ↔ Hardware</div>
          </div>
        </div>

        <p className="text-[12px] text-white/50 leading-relaxed">
          Both NXT and wnsp BRC-20 share the same <span className="text-amber-400 font-mono">21,000,000,000</span> maximum supply — natural 1:1 parity.
          Holding wnsp on Bitcoin unlocks the same campaign tiers as holding NXT, giving anyone on UniSat or OKX a Bitcoin-native entry into the NexusOS hardware economy.
        </p>

        {/* Tier mapping table */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-2">Tier Equivalents — hold wnsp BRC-20 to unlock</div>
          {[
            { tier: "Photon",          nxt: "100",         wnsp: "100",         color: "#a78bfa", shares: "100 Nexus Shares",      class: "Class C" },
            { tier: "Resonator",       nxt: "1,000",       wnsp: "1,000",       color: "#34d399", shares: "1,000 Nexus Shares",    class: "Class C" },
            { tier: "Kernel Agent",    nxt: "10,000",      wnsp: "10,000",      color: "#fbbf24", shares: "10,000 Nexus Shares",   class: "Class B" },
            { tier: "Hardware Founder",nxt: "100,000",     wnsp: "100,000",     color: "#f87171", shares: "100,000 Nexus Shares",  class: "Class A + PHR-1 unit" },
            { tier: "Nexus Partner",   nxt: "1,000,000",   wnsp: "1,000,000",   color: "#60a5fa", shares: "1,000,000 Nexus Shares",class: "Class A+ Board Seat" },
          ].map(t => (
            <div key={t.tier} className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/5 px-3 py-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-white/80">{t.tier}</div>
                <div className="text-[9px] text-white/30">{t.shares} · {t.class}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-mono text-amber-400">{t.wnsp} wnsp</div>
                <div className="text-[9px] font-mono text-white/25">= {t.nxt} NXT</div>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign phase allocation */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-2">Campaign Phase Supplement — wnsp BRC-20 allocation per phase</div>
          {[
            { phase: "Phase 1 — SNIC",                 pct: "5%", nxt: "1.05 B NXT", wnsp: "1.05 B wnsp", color: "#22d3ee" },
            { phase: "Phase 2 — PHR-1",                pct: "5%", nxt: "1.05 B NXT", wnsp: "1.05 B wnsp", color: "#a78bfa" },
            { phase: "Phase 3 — Spectral Relay Mesh",  pct: "5%", nxt: "1.05 B NXT", wnsp: "1.05 B wnsp", color: "#34d399" },
            { phase: "Phase 4 — WavelengthScript α",   pct: "5%", nxt: "1.05 B NXT", wnsp: "1.05 B wnsp", color: "#fb923c" },
          ].map(p => (
            <div key={p.phase} className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/5 px-3 py-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 text-[11px] font-mono text-white/70">{p.phase}</div>
              <div className="text-right shrink-0 space-y-0.5">
                <div className="text-[10px] font-mono text-amber-400">{p.wnsp}</div>
                <div className="text-[9px] font-mono text-white/25">{p.pct} supply</div>
              </div>
            </div>
          ))}
        </div>

        {/* Flow */}
        <div className="rounded-xl bg-black/50 border border-amber-500/10 p-3 space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/25 mb-2">Participation Flow</div>
          {[
            { step: "1", label: "Mint wnsp BRC-20 on Bitcoin", detail: "1,000 per inscription · anyone can mint · UniSat / OKX", color: "#fbbf24" },
            { step: "2", label: "Accumulate to tier threshold",  detail: "100 → Photon · 1,000 → Resonator · 100,000 → Hardware Founder", color: "#a78bfa" },
            { step: "3", label: "Prove holdings → unlock NXT",  detail: "wnsp holding verification → equivalent NXT campaign allocation", color: "#34d399" },
            { step: "4", label: "Hardware pre-order priority",   detail: "100,000 wnsp = Class A Hardware Founder · PHR-1 first batch", color: "#f87171" },
          ].map(s => (
            <div key={s.step} className="flex gap-2.5 items-start py-1">
              <div className="w-5 h-5 rounded-full border shrink-0 flex items-center justify-center text-[9px] font-bold font-mono mt-0.5" style={{ borderColor: s.color, color: s.color }}>
                {s.step}
              </div>
              <div>
                <div className="text-[11px] text-white/70 font-mono">{s.label}</div>
                <div className="text-[10px] text-white/30">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <a href="https://unisat.io/brc20" target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all flex items-center gap-1">
            <ExternalLink size={9} /> UniSat BRC-20
          </a>
          <a href="/crowdfund" className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all flex items-center gap-1">
            <Waves size={9} /> Campaign Tiers
          </a>
          <a href="/campaign" className="text-[10px] font-mono px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1">
            <Zap size={9} /> Tokenomics
          </a>
        </div>
      </div>
    </div>
  );
}

// TAB 5 — RUNES BRIDGE
// ══════════════════════════════════════════════════════════════════════════════
function RunesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/btc-bridge/runes"],
    refetchInterval: 60_000,
  });

  const [etchMode, setEtchMode] = useState(false);
  const [selectedBand, setSelectedBand] = useState<any>(null);
  const [customName, setCustomName] = useState("");
  const [mintCap, setMintCap]   = useState("210000");
  const [mintAmt, setMintAmt]   = useState("100000");
  const [iconInscriptionId, setIconInscriptionId] = useState("");
  const [etchBusy, setEtchBusy] = useState(false);
  const [etchMsg, setEtchMsg]   = useState("");
  const [etchJson, setEtchJson] = useState("");
  const [mintRuneName, setMintRuneName] = useState("");
  const [mintAmt2, setMintAmt2] = useState("100000");
  const [mintBusy, setMintBusy] = useState(false);
  const [mintMsg, setMintMsg]   = useState("");
  // Art inscription state: band → { busy, msg, queueId }
  const [artState, setArtState] = useState<Record<string, { busy: boolean; msg: string; queueId?: number }>>({});
  const [previewBand, setPreviewBand] = useState<string | null>(null);

  const wnspRuneMap: any[] = data?.wnspRuneMap ?? [];
  const chainBalances: any[] = data?.chainBalances ?? [];
  const runeQueue: any[] = data?.runeQueue ?? [];

  async function apiFetch(url: string, opts: RequestInit = {}) {
    const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) }, credentials: "include" });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "Request failed");
    return d;
  }

  async function handleInscribeArt(band: string) {
    setArtState(prev => ({ ...prev, [band]: { busy: true, msg: "" } }));
    try {
      const result = await apiFetch("/api/btc-bridge/runes/inscribe-art", {
        method: "POST", body: JSON.stringify({ band }),
      });
      setArtState(prev => ({ ...prev, [band]: { busy: false, msg: `Queued #${result.queued?.id} — use inscription ID as Rune icon once confirmed`, queueId: result.queued?.id } }));
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/runes"] });
    } catch (err: any) {
      setArtState(prev => ({ ...prev, [band]: { busy: false, msg: `Error: ${err.message}` } }));
    }
  }

  async function handleEtch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBand) return;
    setEtchBusy(true); setEtchMsg(""); setEtchJson("");
    try {
      const runeName = customName.trim() || selectedBand.runeName;
      const result = await apiFetch("/api/btc-bridge/runes/etch", {
        method: "POST",
        body: JSON.stringify({ runeName, band: selectedBand.band, symbol: selectedBand.symbol, supply: selectedBand.supply, mintCap, mintAmount: mintAmt, turbo: true, iconInscriptionId: iconInscriptionId.trim() || undefined }),
      });
      setEtchJson(JSON.stringify(result.queued ?? {}, null, 2));
      setEtchMsg(`Claim inscription queued for ${runeName}`);
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/runes"] });
    } catch (err: any) { setEtchMsg(`Error: ${err.message}`); }
    finally { setEtchBusy(false); }
  }

  async function handleMint(e: React.FormEvent) {
    e.preventDefault();
    setMintBusy(true); setMintMsg("");
    try {
      const result = await apiFetch("/api/btc-bridge/runes/mint", {
        method: "POST",
        body: JSON.stringify({ runeName: mintRuneName, amount: mintAmt2 }),
      });
      setMintMsg(`Mint queued for ${result.runeName}`);
      qc.invalidateQueries({ queryKey: ["/api/btc-bridge/runes"] });
    } catch (err: any) { setMintMsg(`Error: ${err.message}`); }
    finally { setMintBusy(false); }
  }

  const bandBg: Record<string, string> = {
    SYSTEM: "#8b5cf622", KERNEL: "#3b82f622", STREAM: "#22d3ee22", CORE: "#34d39922",
    UI: "#fbbf2422", EVENT: "#f9731622", STORAGE: "#f8717122", NXT: "#a78bfa22", WNSP: "#fb923c22",
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-purple-400" />
            <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">WNSP × Runes Protocol</span>
          </div>
          {data?.address && (
            <a href={data.unisatRunesUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-mono transition-colors">
              <ExternalLink size={9} /> View on Unisat
            </a>
          )}
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed">
          Each WNSP authority band maps to a canonical Rune name. Etching these Runes on Bitcoin permanently links NexusOS spectral encoding standards to the Runes protocol — every band becomes a tradeable, physics-named Bitcoin asset.
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: "7 spectral bands", sub: "→ 7 canonical Rune names", color: "#a78bfa" },
            { label: "21B supply each", sub: "mirrors NXT token economics", color: "#34d399" },
            { label: "Unisat + Hiro", sub: "live chain discovery", color: "#f97316" },
          ].map(({ label, sub, color }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
              <div className="text-[10px] font-mono font-bold" style={{ color }}>{label}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* On-chain Rune balances */}
      {chainBalances.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wallet size={12} className="text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">On-Chain Rune Balances</span>
          </div>
          <div className="space-y-1.5">
            {chainBalances.map((b: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                <div>
                  <div className="font-mono text-xs text-white/80">{b.name ?? b.rune}</div>
                  <div className="text-[9px] text-white/30">Balance: {Number(b.balance ?? 0).toLocaleString()}</div>
                </div>
                <a href={`https://unisat.io/runes/${b.name ?? b.rune}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors">
                  <ExternalLink size={9} /> Unisat
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WNSP → Rune name mapping table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves size={12} className="text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">Spectral Band → Rune Mapping</span>
          </div>
          <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/btc-bridge/runes"] })}
            className="text-white/30 hover:text-white/60 transition-colors"><RefreshCw size={12} /></button>
        </div>

        {isLoading && <div className="text-xs text-white/30 text-center py-4 font-mono">Loading Rune map…</div>}

        <div className="space-y-2">
          {wnspRuneMap.map((r: any) => {
            const art = artState[r.band];
            const artUrl = `/api/btc-bridge/runes/band-art/${r.band}`;
            return (
              <div key={r.band} className="rounded-xl border border-white/8 space-y-0 overflow-hidden transition-all hover:border-white/20"
                style={{ background: bandBg[r.band] ?? "#ffffff08" }}>

                {/* Card header — click to etch */}
                <div className="p-3 space-y-2 cursor-pointer" onClick={() => { setSelectedBand(r); setCustomName(r.runeName); setIconInscriptionId(""); setEtchMode(true); }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg" style={{ color: r.color }}>{r.symbol}</span>
                      <div>
                        <div className="font-mono text-xs font-bold" style={{ color: r.color }}>{r.band}</div>
                        <div className="text-[9px] text-white/30">{r.nm[0]}–{r.nm[1]}nm</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={r.unisatUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-mono transition-colors">
                        <ExternalLink size={9} /> Unisat
                      </a>
                      <a href={r.ordinalsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors">
                        <ExternalLink size={9} /> Magic Eden
                      </a>
                      <a href={r.marketUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono transition-colors">
                        <ExternalLink size={9} /> Market
                      </a>
                    </div>
                  </div>
                  <div className="font-mono text-[11px] text-white/60 tracking-wider">{r.runeName}</div>
                  <div className="text-[9px] text-white/30">{r.desc}</div>
                  <div className="text-[9px] text-white/20">Supply: {Number(r.supply).toLocaleString()} · Click card to etch</div>
                </div>

                {/* Art strip */}
                <div className="border-t border-white/5 px-3 py-2 flex items-center gap-3">
                  {/* Thumbnail toggle */}
                  <button onClick={() => setPreviewBand(previewBand === r.band ? null : r.band)}
                    className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                    style={{ color: r.color }}>
                    {previewBand === r.band ? "▲ Hide art" : "◀ Preview art"}
                  </button>

                  <div className="flex-1" />

                  {/* Inscribe art button */}
                  <button disabled={art?.busy}
                    onClick={e => { e.stopPropagation(); handleInscribeArt(r.band); }}
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg border transition-all disabled:opacity-40"
                    style={{ color: r.color, borderColor: r.color + "44" }}>
                    {art?.busy ? "Queuing…" : "Inscribe Band Art →"}
                  </button>
                </div>

                {/* Art status */}
                {art?.msg && (
                  <div className={`mx-3 mb-2 text-[9px] font-mono p-1.5 rounded ${art.msg.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {art.msg}
                  </div>
                )}

                {/* SVG preview panel */}
                {previewBand === r.band && (
                  <div className="mx-3 mb-3 rounded-xl overflow-hidden border border-white/10">
                    <img src={artUrl} alt={`${r.band} band art`} className="w-full block" loading="lazy" />
                    <div className="px-3 py-2 bg-black/40 flex items-center justify-between">
                      <span className="text-[9px] text-white/30 font-mono">600×420px SVG · inscription-ready</span>
                      <a href={artUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px]" style={{ color: r.color }}>
                        <ExternalLink size={9} /> Open SVG
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Etch form */}
      {etchMode && selectedBand && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash size={12} className="text-purple-400" />
              <span className="text-xs font-mono font-bold text-purple-400 uppercase">Etch Rune — {selectedBand.band} Band</span>
            </div>
            <button onClick={() => setEtchMode(false)} className="text-white/30 hover:text-white/60 text-xs">✕</button>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed">
            This inscribes the spectral channel claim permanently on Bitcoin via an Ordinal, then links to the Unisat Rune etch wizard to complete the on-chain Rune creation. Two-step: claim first, etch second.
          </p>
          <form onSubmit={handleEtch} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 font-mono uppercase">Rune Name</label>
              <input value={customName} onChange={e => setCustomName(e.target.value.toUpperCase().replace(/[^A-Z•]/g, ""))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-purple-500/50"
                placeholder="NEXUSOS•KERNEL•BAND" />
              <div className="text-[9px] text-white/20">A-Z and • separator only</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono uppercase">Mint Cap</label>
                <input value={mintCap} onChange={e => setMintCap(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="210000" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-mono uppercase">Amount / Mint</label>
                <input value={mintAmt} onChange={e => setMintAmt(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="100000" />
              </div>
            </div>

            {/* Icon inscription — links band art SVG to this Rune on Unisat */}
            <div className="space-y-1">
              <label className="text-[10px] text-white/40 font-mono uppercase flex items-center gap-2">
                Icon Inscription ID <span className="text-white/20 normal-case">(optional — paste art inscription ID to set Rune image)</span>
              </label>
              <div className="flex gap-2">
                <input value={iconInscriptionId} onChange={e => setIconInscriptionId(e.target.value.trim())}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-500/50"
                  placeholder="abc123…i0" />
                {iconInscriptionId && (
                  <a href={`https://unisat.io/inscription/${iconInscriptionId}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-orange-400 px-2 border border-orange-500/30 rounded-lg hover:bg-orange-500/10 transition-all whitespace-nowrap">
                    <ExternalLink size={9} /> Preview
                  </a>
                )}
              </div>
              <div className="text-[9px] text-white/20">
                Inscribe the band art first (button on the card), paste the confirmed inscription ID here → Unisat shows your SVG as the Rune icon permanently.
              </div>
              {selectedBand && (
                <div className="rounded-lg overflow-hidden border border-white/5 mt-1">
                  <img src={`/api/btc-bridge/runes/band-art/${selectedBand.band}`} alt="band art preview"
                    className="w-full block max-h-32 object-cover object-top" />
                </div>
              )}
            </div>

            <button type="submit" disabled={etchBusy || !customName.trim()}
              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-mono font-bold transition-all">
              {etchBusy ? "Inscribing claim…" : `Inscribe Claim → ${customName || selectedBand.runeName}`}
            </button>
            {etchMsg && <div className={`text-[10px] font-mono p-2 rounded-lg ${etchMsg.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{etchMsg}</div>}
            {etchJson && (
              <>
                <div className="text-[9px] text-white/30 font-mono">Then complete the etch on Unisat:</div>
                <a href={data?.etchWizardUrl ?? "https://unisat.io/runes/etch"} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs font-mono transition-all">
                  <ExternalLink size={11} /> Open Unisat Rune Etch Wizard
                </a>
                <pre className="text-[9px] text-white/30 font-mono bg-black/30 rounded-lg p-2 overflow-auto max-h-32">{etchJson}</pre>
              </>
            )}
          </form>
        </div>
      )}

      {/* Mint existing Rune */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Play size={12} className="text-emerald-400" />
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Mint Existing Rune</span>
        </div>
        <form onSubmit={handleMint} className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 space-y-1 min-w-32">
            <label className="text-[10px] text-white/40 font-mono uppercase">Rune Name</label>
            <input value={mintRuneName} onChange={e => setMintRuneName(e.target.value.toUpperCase().replace(/[^A-Z•]/g, ""))}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="NEXUSOS•KERNEL•BAND" />
          </div>
          <div className="w-28 space-y-1">
            <label className="text-[10px] text-white/40 font-mono uppercase">Amount</label>
            <input value={mintAmt2} onChange={e => setMintAmt2(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="100000" />
          </div>
          <button type="submit" disabled={mintBusy || !mintRuneName.trim()}
            className="py-2 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-mono font-bold transition-all">
            {mintBusy ? "…" : "Mint"}
          </button>
        </form>
        {mintMsg && <div className={`text-[10px] font-mono p-2 rounded-lg ${mintMsg.startsWith("Error") ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{mintMsg}</div>}
      </div>

      {/* Queued Rune operations */}
      {runeQueue.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-white/40 uppercase tracking-wider">Queued Rune Operations ({runeQueue.length})</div>
          {runeQueue.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-purple-400">{item.eventType}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${item.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400" : item.status === "pending" ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/20 text-cyan-400"}`}>{item.status}</span>
              </div>
              <div className="font-mono text-[9px] text-white/30 truncate">{item.contentPreview}</div>
            </div>
          ))}
        </div>
      )}

      {/* Protocol explanation */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Why Runes + WNSP</div>
        <ul className="text-[10px] text-white/30 space-y-1">
          <li>→ Runes use base-26 naming (A-Z + •) — the same conceptual space as WASCII spectral encoding</li>
          <li>→ A Rune name <em>is</em> a spectral fingerprint: <span className="text-purple-400">NEXUSOS•KERNEL•BAND</span> encodes authority, wavelength range, and function</li>
          <li>→ 21B supply per band mirrors NXT economics — physics-consistent scarcity</li>
          <li>→ Runes use OP_RETURN (more efficient than BRC-20 inscriptions) — lower fees, faster confirmation</li>
          <li>→ WNSP•PROTOCOL supply = 51,200 — exactly the number of orthogonal Ψ channels in Hilbert space</li>
          <li>→ Once etched, each Rune is permanently owned by Bitcoin — no server, no permission required</li>
        </ul>
      </div>

    </div>
  );
}

// TAB 6 — UNISAT BRIDGE
// ══════════════════════════════════════════════════════════════════════════════
function UniSatBridgeTab() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ["/api/btc-bridge/unisat-bridge"],
    refetchInterval: 60_000,
  });

  const eventColor: Record<string, string> = {
    KERNEL: "#3b82f6", NXT_TRANSFER: "#34d399", GOVERNANCE_VOTE: "#a78bfa",
    GOVERNANCE_PROPOSAL: "#f97316", KERNEL_HEARTBEAT: "#22d3ee",
    BRC20_DEPLOY: "#fbbf24", BRC20_MINT: "#fb923c", BRC20_TRANSFER: "#4ade80",
    AGENT_ACTION: "#e879f9",
  };

  function shortId(id: string | null) {
    if (!id) return "—";
    return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id;
  }
  function ago(d: string | null) {
    if (!d) return "";
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const dbItems: any[] = data?.dbItems ?? [];
  const hiroInscriptions: any[] = data?.hiroInscriptions ?? [];
  const brc20Ticks: any[] = data?.brc20Ticks ?? [];

  // On-chain IDs not yet in our DB (discovered via Hiro)
  const dbIds = new Set(dbItems.map((i: any) => i.inscriptionId).filter(Boolean));
  const chainOnly = hiroInscriptions.filter((h: any) => !dbIds.has(h.id));

  return (
    <div className="space-y-6">

      {/* Wallet identity card */}
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-orange-400" />
          <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">Service Wallet — On Every Explorer</span>
        </div>

        {data?.address ? (
          <>
            <div className="font-mono text-[11px] text-white/60 break-all bg-black/20 rounded-lg px-3 py-2 border border-white/5">
              {data.address}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { label: "Unisat", url: data.unisatWalletUrl,   color: "#f97316", desc: "Wallet + Ordinals + BRC-20" },
                { label: "Ordinals", url: data.ordinalsWalletUrl, color: "#fbbf24", desc: "Canonical Ordinals explorer" },
                { label: "Mempool", url: data.mempoolUrl,        color: "#22d3ee", desc: "UTXO & transaction history" },
              ].map(({ label, url, color, desc }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] transition-all group">
                  <ExternalLink size={11} style={{ color }} />
                  <div>
                    <div className="text-xs font-mono font-bold" style={{ color }}>{label}</div>
                    <div className="text-[9px] text-white/30 group-hover:text-white/50">{desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="text-xs text-white/40">No service wallet configured</div>
        )}
      </div>

      {/* BRC-20 tokens on Unisat */}
      {brc20Ticks.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-amber-400" />
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">BRC-20 Tokens on Unisat</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {brc20Ticks.map(({ tick, unisatUrl, marketUrl }: any) => (
              <div key={tick} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-2">
                <div className="font-mono text-sm font-bold text-amber-300">{tick}</div>
                <div className="flex flex-col gap-1">
                  <a href={unisatUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors">
                    <ExternalLink size={9} /> Token page
                  </a>
                  <a href={marketUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                    <ExternalLink size={9} /> Marketplace
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed inscriptions from our DB */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash size={13} className="text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              Confirmed Inscriptions ({dbItems.length})
            </span>
          </div>
          <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/btc-bridge/unisat-bridge"] })}
            className="text-white/30 hover:text-white/60 transition-colors" title="Refresh">
            <RefreshCw size={12} />
          </button>
        </div>

        {isLoading && <div className="text-xs text-white/30 font-mono py-4 text-center">Fetching inscriptions…</div>}

        {dbItems.length === 0 && !isLoading && (
          <div className="text-xs text-white/30 text-center py-6">No confirmed inscriptions yet — waiting for UTXOs to confirm.</div>
        )}

        <div className="space-y-2">
          {dbItems.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: (eventColor[item.eventType] ?? "#888") + "22", color: eventColor[item.eventType] ?? "#888" }}>
                    {item.eventType}
                  </span>
                  <span className="text-[10px] text-white/30">{ago(item.confirmedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.unisatUrl && (
                    <a href={item.unisatUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-mono transition-colors">
                      <ExternalLink size={9} /> Unisat
                    </a>
                  )}
                  {item.ordinalsUrl && (
                    <a href={item.ordinalsUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-mono transition-colors">
                      <ExternalLink size={9} /> Ordinals
                    </a>
                  )}
                  {item.gamma && (
                    <a href={item.gamma} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 font-mono transition-colors">
                      <ExternalLink size={9} /> Gamma
                    </a>
                  )}
                </div>
              </div>
              <div className="font-mono text-[10px] text-white/40 break-all">
                ID: {shortId(item.inscriptionId)}
              </div>
              <div className="font-mono text-[9px] text-white/20 truncate">
                {item.contentPreview}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chain-discovered inscriptions not yet in our DB */}
      {chainOnly.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-violet-400" />
            <span className="text-xs font-mono font-bold text-violet-400 uppercase tracking-wider">
              On-Chain Only ({chainOnly.length}) — not yet synced to NexusOS
            </span>
          </div>
          <div className="space-y-2">
            {chainOnly.map((h: any) => (
              <div key={h.id} className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[10px] text-violet-300 break-all">{shortId(h.id)}</span>
                  <div className="flex items-center gap-2">
                    <a href={`https://unisat.io/inscription/${h.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-mono transition-colors">
                      <ExternalLink size={9} /> Unisat
                    </a>
                    <a href={`https://ordinals.com/inscription/${h.id}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-mono transition-colors">
                      <ExternalLink size={9} /> Ordinals
                    </a>
                  </div>
                </div>
                {h.content_type && (
                  <div className="text-[9px] text-white/30 font-mono">{h.content_type} · #{h.number}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.hiroError && (
        <div className="text-[10px] text-white/20 font-mono text-center">
          Chain sync: {data.hiroError} — showing DB records only
        </div>
      )}

      {/* Info callout */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">How the Bridge Works</div>
        <ul className="text-[10px] text-white/30 space-y-1 list-none">
          <li>→ Every confirmed NexusOS inscription is permanently visible on Unisat, Ordinals.com, and Gamma</li>
          <li>→ BRC-20 ticks (wnsp) are tradeable on Unisat marketplace — fully decentralized</li>
          <li>→ Hiro API cross-checks on-chain state to discover any inscriptions not yet indexed here</li>
          <li>→ No API key required — all public Bitcoin infrastructure</li>
          <li>→ Links are permanent: even if NexusOS goes offline, the content lives on Bitcoin forever</li>
        </ul>
      </div>

    </div>
  );
}

// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: "inscriptions", label: "Inscriptions",  icon: Waves },
  { id: "bridge",       label: "Auto-Bridge",   icon: Zap   },
  { id: "identity",     label: "Identity",      icon: Bitcoin },
  { id: "brc20",        label: "BRC-20",        icon: Activity },
  { id: "runes",        label: "Runes",         icon: Hash   },
  { id: "unisat",       label: "Unisat Bridge", icon: Globe  },
];

export default function WnspOrdinalsPage() {
  const [tab, setTab] = useState("inscriptions");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <div className="border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/wnsp" className="text-white/40 hover:text-white/70 text-xs flex items-center gap-1.5 transition-colors">← WNSP</Link>
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
        {tab === "brc20"        && <Brc20Tab />}
        {tab === "runes"        && <RunesTab />}
        {tab === "unisat"       && <UniSatBridgeTab />}

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-white/20 flex items-center justify-center gap-4 pb-4 flex-wrap">
          <Link href="/wnsp" className="hover:text-white/50 transition-colors">WNSP</Link>
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
