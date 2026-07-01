import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import {
  ArrowLeft, Play, Zap, Radio, Cpu, CheckCircle2,
  Clock, Code2, Binary, Activity, Copy, Check, ChevronDown
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────
const LARGE_FILE_THRESHOLD = 250; // lines — triggers async chunked mode + loader
const CHUNK_SIZE = 200;           // lines processed per yield
const LINE_H = 20;                // px per output line (font-mono text-xs)
const VSCROLL_BUFFER = 30;        // extra lines rendered above/below viewport

// ── MessageChannel yield — not throttled unlike setTimeout(0) ─────────────────
function yieldFrame(): Promise<void> {
  return new Promise(resolve => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => resolve();
    ch.port2.postMessage(null);
  });
}

// ── Physics ────────────────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
function ceEncode(name: string): { nm: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 100;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToBand(nm) };
}

// ── Transpiler ─────────────────────────────────────────────────────────────────
function transpile(src: string, lang: "python" | "javascript" | "rust" | "java" | "go" | "cpp"): string {
  if (!src.trim()) return "";
  const lines = src.split("\n");
  const out: string[] = [
    `// WavelengthScript v1.0 · NexusOS · AGPL-3.0`,
    `// ${lang.toUpperCase()} → WLS · ${new Date().toISOString().slice(0, 19)}Z`,
    ``,
  ];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(""); continue; }
    if (line.startsWith("#") || line.startsWith("//") || line.startsWith("--")) {
      out.push(`// ${line.replace(/^[#/\-]+\s*/, "")}`); continue;
    }
    const fnMatch = line.match(/^(?:def|function|fn|func|fun|void|int|string|bool|float|double)\s+(\w+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const [, name, params] = fnMatch;
      const enc = ceEncode(name);
      const paramList = params.split(",").map(p => p.trim()).filter(Boolean)
        .map(p => { const pe = ceEncode(p.replace(/[^a-zA-Z]/g, "") || "x"); return `@${pe.nm}nm ${p.trim()}`; }).join(", ");
      out.push(`@emit(${enc.nm}nm, ${enc.psi}) // λ=${enc.nm}nm · ${enc.band}`);
      out.push(`fn ${name}(${paramList}) {`); continue;
    }
    const classMatch = line.match(/^(?:class|struct|interface|type)\s+(\w+)/);
    if (classMatch) {
      const enc = ceEncode(classMatch[1]);
      out.push(`@channel(${enc.psi}) // ${enc.nm}nm · ${enc.band}`);
      out.push(`type ${classMatch[1]} : SpectralNode {`); continue;
    }
    const varMatch = line.match(/^(?:let|const|var|val|auto)?\s*(\w+)\s*[:=]+\s*(.+)/);
    if (varMatch && !varMatch[1].match(/^(?:if|else|for|while|return|import|from|use|fn|def|class|struct|type|func|fun)$/)) {
      const [, vname, val] = varMatch;
      const enc = ceEncode(vname);
      out.push(`@${enc.nm}nm let ${vname} := ${val.replace(/;$/, "")}  // ${enc.psi}`); continue;
    }
    if (line.startsWith("return")) { out.push(`  emit ${line.slice(6).trim()}  // → spectral output`); continue; }
    if (line.match(/^(?:import|from|use|require|include|using)/)) {
      const modMatch = line.match(/["']([^"']+)["']/) || line.match(/\s+(\w+)\s*$/);
      const modName = modMatch ? modMatch[1] : "module";
      const enc = ceEncode(modName.replace(/[^a-zA-Z]/g, "") || "mod");
      out.push(`tune(${enc.nm}nm)  // ${modName} → ${enc.psi}`); continue;
    }
    if (line.match(/^(?:print|console\.log|println!|printf|fmt\.Print|System\.out|echo|puts)\b/)) {
      out.push(`  broadcast(${line.replace(/^[^(]+/, "")})  // STREAM`); continue;
    }
    if (line.startsWith("if ") || line === "else" || line.startsWith("else")) {
      out.push(`  ?λ ${line.replace(/^else\s*/, "// else ")}:`); continue;
    }
    if (line.match(/^(?:for|while|loop)\b/)) {
      out.push(`  oscillate(${line.replace(/^(?:for|while|loop)\s+/, "")}) {`); continue;
    }
    if (line === "}" || line.match(/^end(\s|$)/)) { out.push("}"); continue; }
    const enc = ceEncode(line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op");
    out.push(`  /* @${enc.nm}nm */ ${line}`);
  }
  out.push("");
  out.push("// ── Spectral manifest ───────────────────────────");
  const identifiers = Array.from(new Set(src.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) ?? [])).slice(0, 8);
  for (const id of identifiers) {
    const enc = ceEncode(id);
    out.push(`// ${id.padEnd(18)} → ${enc.nm}nm  ${enc.psi}  [${enc.band}]`);
  }
  return out.join("\n");
}

// ── Async chunked transpiler — yields between chunks so UI stays alive ─────────
async function transpileAsync(
  src: string,
  lang: "python" | "javascript" | "rust" | "java" | "go" | "cpp",
  onProgress: (done: number, total: number, nm: number) => void,
  signal: { cancelled: boolean }
): Promise<string[]> {
  const lines = src.split("\n");
  const total = lines.length;
  const out: string[] = [
    `// WavelengthScript v1.0 · NexusOS · AGPL-3.0`,
    `// ${lang.toUpperCase()} → WLS · ${new Date().toISOString().slice(0, 19)}Z`,
    ``,
  ];
  const processLine = (raw: string) => {
    const line = raw.trim();
    if (!line) { out.push(""); return; }
    if (line.startsWith("#") || line.startsWith("//") || line.startsWith("--")) {
      out.push(`// ${line.replace(/^[#/\-]+\s*/, "")}`); return;
    }
    const fnMatch = line.match(/^(?:def|function|fn|func|fun|void|int|string|bool|float|double)\s+(\w+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const [, name, params] = fnMatch;
      const enc = ceEncode(name);
      const paramList = params.split(",").map(p => p.trim()).filter(Boolean)
        .map(p => { const pe = ceEncode(p.replace(/[^a-zA-Z]/g, "") || "x"); return `@${pe.nm}nm ${p.trim()}`; }).join(", ");
      out.push(`@emit(${enc.nm}nm, ${enc.psi}) // λ=${enc.nm}nm · ${enc.band}`);
      out.push(`fn ${name}(${paramList}) {`); return;
    }
    const classMatch = line.match(/^(?:class|struct|interface|type)\s+(\w+)/);
    if (classMatch) {
      const enc = ceEncode(classMatch[1]);
      out.push(`@channel(${enc.psi}) // ${enc.nm}nm · ${enc.band}`);
      out.push(`type ${classMatch[1]} : SpectralNode {`); return;
    }
    const varMatch = line.match(/^(?:let|const|var|val|auto)?\s*(\w+)\s*[:=]+\s*(.+)/);
    if (varMatch && !varMatch[1].match(/^(?:if|else|for|while|return|import|from|use|fn|def|class|struct|type|func|fun)$/)) {
      const [, vname, val] = varMatch;
      const enc = ceEncode(vname);
      out.push(`@${enc.nm}nm let ${vname} := ${val.replace(/;$/, "")}  // ${enc.psi}`); return;
    }
    if (line.startsWith("return")) { out.push(`  emit ${line.slice(6).trim()}  // → spectral output`); return; }
    if (line.match(/^(?:import|from|use|require|include|using)/)) {
      const modMatch = line.match(/["']([^"']+)["']/) || line.match(/\s+(\w+)\s*$/);
      const modName = modMatch ? modMatch[1] : "module";
      const enc = ceEncode(modName.replace(/[^a-zA-Z]/g, "") || "mod");
      out.push(`tune(${enc.nm}nm)  // ${modName} → ${enc.psi}`); return;
    }
    if (line.match(/^(?:print|console\.log|println!|printf|fmt\.Print|System\.out|echo|puts)\b/)) {
      out.push(`  broadcast(${line.replace(/^[^(]+/, "")})  // STREAM`); return;
    }
    if (line.startsWith("if ") || line === "else" || line.startsWith("else")) {
      out.push(`  ?λ ${line.replace(/^else\s*/, "// else ")}:`); return;
    }
    if (line.match(/^(?:for|while|loop)\b/)) {
      out.push(`  oscillate(${line.replace(/^(?:for|while|loop)\s+/, "")}) {`); return;
    }
    if (line === "}" || line.match(/^end(\s|$)/)) { out.push("}"); return; }
    const enc = ceEncode(line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op");
    out.push(`  /* @${enc.nm}nm */ ${line}`);
  };

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    if (signal.cancelled) return [];
    const chunk = lines.slice(i, i + CHUNK_SIZE);
    chunk.forEach(processLine);
    const pct = Math.min(i + CHUNK_SIZE, total) / total;
    const nm = parseFloat((380 + pct * 400).toFixed(1));
    onProgress(Math.min(i + CHUNK_SIZE, total), total, nm);
    await yieldFrame(); // yield without setTimeout throttling
  }

  out.push("");
  out.push("// ── Spectral manifest ───────────────────────────");
  const identifiers = Array.from(new Set(src.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) ?? [])).slice(0, 8);
  for (const id of identifiers) {
    const enc = ceEncode(id);
    out.push(`// ${id.padEnd(18)} → ${enc.nm}nm  ${enc.psi}  [${enc.band}]`);
  }
  return out;
}

// ── Spectral loading animation ─────────────────────────────────────────────────
const LOAD_MSGS = [
  "Scanning 25,600 Ψ channels…",
  "Mapping λ coordinates…",
  "Encoding to WavelengthScript…",
  "Resolving spectral manifold…",
  "Applying CE table…",
  "Deriving Ψ(WDM,OAM,POL) addresses…",
  "Building spectral manifest…",
  "Collapsing wavefunctions…",
  "Verifying Maxwell constraints…",
  "Almost there — compressing state…",
];

const COMPILE_MSGS = [
  "Parsing WavelengthScript opcodes…",
  "Mapping λ addresses to bytecode…",
  "Resolving Ψ channel registers…",
  "Encoding EMIT / TUNE / PUSH ops…",
  "Building WNSP instruction set…",
  "Verifying opcode boundaries…",
  "Linking spectral labels…",
  "Finalising bytecode manifest…",
];

function SpectralLoader({ linesTotal, linesDone, activeNm, label = "TRANSPILING" }: {
  linesTotal: number; linesDone: number; activeNm: number; label?: string;
}) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [tick, setTick] = useState(0);

  const msgs = label === "COMPILING" ? COMPILE_MSGS : LOAD_MSGS;
  useEffect(() => {
    const mi = setInterval(() => setMsgIdx(m => (m + 1) % msgs.length), 1100);
    const ti = setInterval(() => setTick(t => t + 1), 30);
    return () => { clearInterval(mi); clearInterval(ti); };
  }, [msgs.length]);

  const pct = linesTotal > 0 ? linesDone / linesTotal : 0;
  const col = (nm: number) => {
    if (nm < 450) return "#8b00ff";
    if (nm < 495) return "#2563eb";
    if (nm < 520) return "#06b6d4";
    if (nm < 565) return "#16a34a";
    if (nm < 590) return "#ca8a04";
    if (nm < 625) return "#ea580c";
    return "#dc2626";
  };
  const c = col(activeNm);

  // SVG waveform: 3 layered sine waves
  const W = 480; const H = 80; const cx = W / 2;
  const waves = [
    { amp: 22, freq: 2.5, phase: tick * 0.04,       color: c,       op: 0.8 },
    { amp: 14, freq: 4,   phase: tick * 0.06 + 1,   color: "#06b6d4", op: 0.5 },
    { amp: 8,  freq: 6,   phase: tick * 0.09 + 2.5, color: "#8b00ff", op: 0.35 },
  ];
  const path = (amp: number, freq: number, phase: number) => {
    const pts = Array.from({ length: W + 1 }, (_, x) => {
      const y = H / 2 + amp * Math.sin((x / W) * Math.PI * 2 * freq + phase);
      return `${x === 0 ? "M" : "L"}${x},${y}`;
    });
    return pts.join(" ");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-5 select-none"
         style={{ background: "#020c08" }}>

      {/* Waveform display */}
      <div className="relative w-full max-w-lg px-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ filter: `drop-shadow(0 0 8px ${c})` }}>
          {waves.map((w, i) => (
            <path key={i} d={path(w.amp, w.freq, w.phase)}
              stroke={w.color} strokeWidth={i === 0 ? 2 : 1}
              fill="none" opacity={w.op} />
          ))}
          {/* Cursor line */}
          <line x1={cx} y1={0} x2={cx} y2={H} stroke={c} strokeWidth={1} opacity={0.3} />
        </svg>
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)" }} />
      </div>

      {/* Active wavelength */}
      <div className="text-center">
        <div className="text-3xl font-bold font-mono tabular-nums"
             style={{ color: c, textShadow: `0 0 20px ${c}` }}>
          {activeNm.toFixed(1)}nm
        </div>
        <div className="text-[11px] font-mono mt-1" style={{ color: c, opacity: 0.6 }}>
          {activeNm < 450 ? "SYSTEM" : activeNm < 495 ? "AUTH" : activeNm < 520 ? "STREAM"
           : activeNm < 565 ? "LOGIC" : activeNm < 590 ? "INTERFACE" : activeNm < 625 ? "EVENT" : "STORAGE"} band
        </div>
      </div>

      {/* Progress bar */}
      {linesTotal > 0 && (
        <div className="w-full max-w-md px-8">
          <div className="flex justify-between text-[10px] font-mono mb-1.5" style={{ color: c, opacity: 0.7 }}>
            <span>{linesDone.toLocaleString()} / {linesTotal.toLocaleString()} lines</span>
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-200"
                 style={{ width: `${pct * 100}%`, backgroundColor: c, boxShadow: `0 0 8px ${c}` }} />
          </div>
        </div>
      )}

      {/* Phase label */}
      <div className="text-[9px] font-mono tracking-widest uppercase mb-[-12px]" style={{ color: c, opacity: 0.4 }}>{label}</div>
      {/* Cycling message */}
      <div className="text-[12px] font-mono text-center px-6" style={{ color: c, opacity: 0.8 }}>
        {msgs[msgIdx]}
      </div>

      {/* Spectrum bar — all 7 bands lighting up in sequence */}
      <div className="flex gap-1 items-end px-8 w-full max-w-md h-8">
        {["#8b00ff","#2563eb","#06b6d4","#16a34a","#ca8a04","#ea580c","#dc2626"].map((bc, i) => {
          const active = Math.floor(pct * 7) >= i;
          const isCurrent = Math.floor(pct * 7) === i;
          const barH = active ? (isCurrent ? 20 + (tick % 8) * 1.5 : 14) : 4;
          return (
            <div key={i} className="flex-1 rounded-t transition-all duration-200"
                 style={{ height: `${barH}px`, backgroundColor: bc,
                          boxShadow: isCurrent ? `0 0 10px ${bc}` : "none",
                          opacity: active ? 1 : 0.15 }} />
          );
        })}
      </div>

      <div className="text-[10px] text-gray-700 font-mono">NexusOS · WavelengthScript Transpiler · Browser-native</div>
    </div>
  );
}

// ── Virtual-scrolled WLS output ────────────────────────────────────────────────
function VirtualWLSOutput({ lines }: { lines: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerH(el.clientHeight);
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / LINE_H) - VSCROLL_BUFFER);
  const endIdx   = Math.min(lines.length, Math.ceil((scrollTop + containerH) / LINE_H) + VSCROLL_BUFFER);
  const totalH   = lines.length * LINE_H;
  const topPad   = startIdx * LINE_H;
  const botPad   = Math.max(0, (lines.length - endIdx) * LINE_H);

  const visibleLines = useMemo(() => lines.slice(startIdx, endIdx), [lines, startIdx, endIdx]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto font-mono text-xs"
         style={{ lineHeight: `${LINE_H}px` }}
         onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
      <div style={{ paddingTop: topPad, paddingBottom: botPad }}>
        {visibleLines.map((line, i) => {
          const idx = startIdx + i;
          const nmMatch = line.match(/(\d{3,3}\.\d+)nm/);
          const nm = nmMatch ? parseFloat(nmMatch[1]) : null;
          return (
            <div key={idx} className="flex gap-2 px-4" style={{ height: LINE_H }}>
              <span className="text-gray-700 select-none w-6 text-right shrink-0 text-[10px]">{idx + 1}</span>
              <span style={{ color: nm ? nmToColor(nm) : line.startsWith("//") ? "#4b5563" : "#86efac" }}>
                {line || "\u00A0"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Bytecode compiler ──────────────────────────────────────────────────────────
interface Ins { off: number; op: number; mnem: string; args: string; nm?: number; psi?: string; cmt: string; }

function compileWLS(src: string): Ins[] {
  if (!src.trim()) return [];
  const ins: Ins[] = [];
  let off = 0;
  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, psi?: string) {
    ins.push({ off, op, mnem, args, nm, psi, cmt });
    if (op !== 0x00) off += 8;
  }
  add(0x00, ".WNSP", "v1.0", "NexusOS WNSP Bytecode");
  add(0x00, ".ARCH", "WDM256·OAM50·POL2", "25,600 Ψ channels");
  off = 0;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith(";") || line.startsWith("#")) continue;
    const m1 = line.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);
    if (m1) { const nm = parseFloat(m1[1]); add(0x03, "EMIT", `λ=${nm}nm  ${m1[2]}`, `emit · ${nmToBand(nm)}`, nm, m1[2]); continue; }
    const m2 = line.match(/tune\((\d+\.?\d*)nm\)/);
    if (m2) { const nm = parseFloat(m2[1]); add(0x01, "TUNE", `λ=${nm}nm`, `tune → ${nmToBand(nm)}`, nm); continue; }
    const m4 = line.match(/^fn\s+(\w+)/);
    if (m4) { const e = ceEncode(m4[1]); add(0x07, "LABEL", `${m4[1]}  ${e.psi}`, `fn λ=${e.nm}nm`, e.nm, e.psi); continue; }
    const m6 = line.match(/oscillate\(([^)]+)\)/);
    if (m6) { add(0x06, "OCS", m6[1].trim(), "wave loop"); continue; }
    const m7 = line.match(/broadcast\(([^)]+)\)/);
    if (m7) { const e = ceEncode(m7[1].replace(/[^a-zA-Z]/g, "") || "data"); add(0x05, "BROAD", m7[1].trim(), `broadcast λ=${e.nm}nm`, e.nm); continue; }
    const m8 = line.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);
    if (m8) { add(0x02, "PUSH", `@${m8[1]}nm  "${m8[2]}"`, `bind λ=${m8[1]}nm`, parseFloat(m8[1])); continue; }
    const m9 = line.match(/^\s*emit\s+(.+)/);
    if (m9) { const e = ceEncode(m9[1].replace(/[^a-zA-Z]/g, "") || "out"); add(0x03, "EMIT", m9[1].trim(), `output λ=${e.nm}nm`, e.nm); continue; }
    if (line.startsWith("?λ ")) { add(0x08, "JMPZ", line.slice(3).trim(), "photon branch"); continue; }
    if (line === "}" || line.match(/^end\b/)) { add(0xFE, "RET", "", "scope end"); continue; }
    const e = ceEncode(line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op");
    add(0x0B, "EXEC", `@${e.nm}nm`, line.slice(0, 50), e.nm);
  }
  add(0xFF, "HALT", "", "wavefunction terminated");
  return ins;
}

// ── Async chunked compiler — same logic, yields between chunks ─────────────────
async function compileWLSAsync(
  src: string,
  onProgress: (done: number, total: number, nm: number) => void,
  signal: { cancelled: boolean }
): Promise<Ins[]> {
  const srcLines = src.split("\n");
  const total = srcLines.length;
  const ins: Ins[] = [];
  let off = 0;
  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, psi?: string) {
    ins.push({ off, op, mnem, args, nm, psi, cmt });
    if (op !== 0x00) off += 8;
  }
  add(0x00, ".WNSP", "v1.0", "NexusOS WNSP Bytecode");
  add(0x00, ".ARCH", "WDM256·OAM50·POL2", "25,600 Ψ channels");
  off = 0;

  const processLine = (raw: string) => {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith(";") || line.startsWith("#")) return;
    const m1 = line.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);
    if (m1) { const nm = parseFloat(m1[1]); add(0x03, "EMIT", `λ=${nm}nm  ${m1[2]}`, `emit · ${nmToBand(nm)}`, nm, m1[2]); return; }
    const m2 = line.match(/tune\((\d+\.?\d*)nm\)/);
    if (m2) { const nm = parseFloat(m2[1]); add(0x01, "TUNE", `λ=${nm}nm`, `tune → ${nmToBand(nm)}`, nm); return; }
    const m4 = line.match(/^fn\s+(\w+)/);
    if (m4) { const e = ceEncode(m4[1]); add(0x07, "LABEL", `${m4[1]}  ${e.psi}`, `fn λ=${e.nm}nm`, e.nm, e.psi); return; }
    const m6 = line.match(/oscillate\(([^)]+)\)/);
    if (m6) { add(0x06, "OCS", m6[1].trim(), "wave loop"); return; }
    const m7 = line.match(/broadcast\(([^)]+)\)/);
    if (m7) { const e = ceEncode(m7[1].replace(/[^a-zA-Z]/g, "") || "data"); add(0x05, "BROAD", m7[1].trim(), `broadcast λ=${e.nm}nm`, e.nm); return; }
    const m8 = line.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);
    if (m8) { add(0x02, "PUSH", `@${m8[1]}nm  "${m8[2]}"`, `bind λ=${m8[1]}nm`, parseFloat(m8[1])); return; }
    const m9 = line.match(/^\s*emit\s+(.+)/);
    if (m9) { const e = ceEncode(m9[1].replace(/[^a-zA-Z]/g, "") || "out"); add(0x03, "EMIT", m9[1].trim(), `output λ=${e.nm}nm`, e.nm); return; }
    if (line.startsWith("?λ ")) { add(0x08, "JMPZ", line.slice(3).trim(), "photon branch"); return; }
    if (line === "}" || line.match(/^end\b/)) { add(0xFE, "RET", "", "scope end"); return; }
    const e = ceEncode(line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op");
    add(0x0B, "EXEC", `@${e.nm}nm`, line.slice(0, 50), e.nm);
  };

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    if (signal.cancelled) return [];
    srcLines.slice(i, i + CHUNK_SIZE).forEach(processLine);
    const pct = Math.min(i + CHUNK_SIZE, total) / total;
    onProgress(Math.min(i + CHUNK_SIZE, total), total, parseFloat((380 + pct * 400).toFixed(1)));
    await yieldFrame(); // MessageChannel — no throttle
  }
  add(0xFF, "HALT", "", "wavefunction terminated");
  return ins;
}

// ── Virtual-scrolled bytecode table ───────────────────────────────────────────
const ROW_H = 28;
function VirtualBytecodeTable({ rows }: { rows: Ins[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(220);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerH(el.clientHeight);
    const ro = new ResizeObserver(() => setContainerH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - VSCROLL_BUFFER);
  const endIdx   = Math.min(rows.length, Math.ceil((scrollTop + containerH) / ROW_H) + VSCROLL_BUFFER);
  const topPad   = startIdx * ROW_H;
  const botPad   = Math.max(0, (rows.length - endIdx) * ROW_H);
  const visible  = rows.slice(startIdx, endIdx);

  return (
    <div ref={containerRef} className="overflow-auto flex-1"
         onScroll={e => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
      <table className="w-full font-mono text-xs">
        <thead className="border-b border-white/5 sticky top-0 bg-black/90 z-10">
          <tr className="text-gray-600">
            <th className="px-3 py-1.5 text-left">Offset</th>
            <th className="px-3 py-1.5 text-left">Op</th>
            <th className="px-3 py-1.5 text-left">Mnem</th>
            <th className="px-3 py-1.5 text-left">Args</th>
            <th className="px-3 py-1.5 text-left hidden md:table-cell">λ</th>
            <th className="px-3 py-1.5 text-left hidden lg:table-cell">Comment</th>
          </tr>
        </thead>
        <tbody>
          {topPad > 0 && <tr style={{ height: topPad }}><td colSpan={6} /></tr>}
          {visible.map((ins, i) => (
            <tr key={startIdx + i} className="border-b border-white/5 hover:bg-white/5"
                style={{ height: ROW_H }}>
              <td className="px-3 text-gray-700">{ins.op !== 0x00 ? `0x${ins.off.toString(16).padStart(4,"0")}` : ""}</td>
              <td className="px-3 text-gray-600">{ins.op !== 0x00 ? `0x${ins.op.toString(16).padStart(2,"0")}` : ""}</td>
              <td className="px-3 font-bold" style={{ color: ins.nm ? nmToColor(ins.nm) : "#6b7280" }}>{ins.mnem}</td>
              <td className="px-3 text-gray-300 max-w-[180px] truncate">{ins.args}</td>
              <td className="px-3 text-gray-600 hidden md:table-cell">{ins.nm ? `${ins.nm}nm` : ""}</td>
              <td className="px-3 text-gray-700 max-w-[200px] truncate hidden lg:table-cell">{ins.cmt}</td>
            </tr>
          ))}
          {botPad > 0 && <tr style={{ height: botPad }}><td colSpan={6} /></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── Starter code ───────────────────────────────────────────────────────────────
const STARTERS: Record<string, string> = {
  python: `def greet(name):
    message = "Hello, " + name
    print(message)
    return message

def add(a, b):
    result = a + b
    return result

greet("World")
add(3, 4)`,
  javascript: `function greet(name) {
  const message = "Hello, " + name
  console.log(message)
  return message
}

function add(a, b) {
  const result = a + b
  return result
}

greet("World")
add(3, 4)`,
  rust: `fn greet(name: &str) -> String {
    let message = format!("Hello, {}", name);
    println!("{}", message);
    return message;
}

fn add(a: i32, b: i32) -> i32 {
    let result = a + b;
    return result;
}`,
  java: `public class Main {
    public static String greet(String name) {
        String message = "Hello, " + name;
        System.out.println(message);
        return message;
    }

    public static int add(int a, int b) {
        int result = a + b;
        return result;
    }
}`,
  go: `func greet(name string) string {
    message := "Hello, " + name
    fmt.Println(message)
    return message
}

func add(a int, b int) int {
    result := a + b
    return result
}`,
  cpp: `std::string greet(std::string name) {
    std::string message = "Hello, " + name;
    std::cout << message << std::endl;
    return message;
}

int add(int a, int b) {
    int result = a + b;
    return result;
}`,
};

const LANGS = [
  { id: "python",     label: "Python"     },
  { id: "javascript", label: "JavaScript" },
  { id: "rust",       label: "Rust"       },
  { id: "java",       label: "Java"       },
  { id: "go",         label: "Go"         },
  { id: "cpp",        label: "C++"        },
];

// ── Copy button ────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-white/10 text-gray-500 hover:text-white hover:border-white/30 transition-all"
    >
      {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

// ── Spectrum bands for visualiser ─────────────────────────────────────────────
const BANDS = [
  { label: "SYSTEM",    min: 380, max: 450, color: "#8b00ff" },
  { label: "AUTH",      min: 450, max: 495, color: "#2563eb" },
  { label: "STREAM",    min: 495, max: 520, color: "#06b6d4" },
  { label: "LOGIC",     min: 520, max: 565, color: "#16a34a" },
  { label: "INTERFACE", min: 565, max: 590, color: "#ca8a04" },
  { label: "EVENT",     min: 590, max: 625, color: "#ea580c" },
  { label: "STORAGE",   min: 625, max: 780, color: "#dc2626" },
];

// ── Main ───────────────────────────────────────────────────────────────────────
export default function LearnPage() {
  usePageMeta({
    title: "CE→SE Pipeline — Any Language to Spectral Bytecode",
    description: "The unified 4-stage CE→SE pipeline: paste any language → transpile to WavelengthScript → compile to WNSP bytecode → execute in the WNSP VM. The central demonstration of the NexusOS physics stack.",
    canonical: "https://wnsp.io/ce-se-pipeline",
    ogTitle: "CE→SE Pipeline — Any Language to Spectral Bytecode",
    ogDescription: "4-stage pipeline: any language → WavelengthScript transpile → WNSP bytecode compile → WNSP VM execution. Physics-native computing, live in your browser.",
    twitterTitle: "CE→SE Pipeline — 4-Stage Spectral Compiler",
    twitterDescription: "Paste any language → WavelengthScript → WNSP bytecode → execute in WNSP VM. The NexusOS physics stack, live.",
  });
  const [lang, setLang] = useState("python");
  const [code, setCode] = useState(STARTERS.python);
  const [wlsLines, setWlsLines] = useState<string[]>([]);
  const [transpiling, setTranspiling] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0, nm: 380 });
  const [instructions, setInstructions] = useState<Ins[]>([]);
  const [compiled, setCompiled] = useState(false);
  const [executed, setExecuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [displayedIns, setDisplayedIns] = useState<Ins[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [hitBands, setHitBands] = useState<Record<string, number>>({}); // band → hit count
  const [timing, setTiming] = useState({ translate: 0, compile: 0, execute: 0 });
  const [showDropdown, setShowDropdown] = useState(false);
  const translateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const logRef = useRef<HTMLDivElement>(null);

  // Live translation as user types (debounced 200ms)
  useEffect(() => {
    clearTimeout(translateTimer.current);
    cancelRef.current.cancelled = true;

    if (!code.trim()) {
      setWlsLines([]); setTranspiling(false); return;
    }

    const lineCount = code.split("\n").length;
    const isLarge = lineCount >= LARGE_FILE_THRESHOLD;

    // ── For large files: show loader IMMEDIATELY (before debounce fires) ──
    if (isLarge) {
      setTranspiling(true);
      setLoadProgress({ done: 0, total: lineCount, nm: 380 });
      setInstructions([]); setCompiled(false); setExecuted(false);
      setDisplayedIns([]); setActiveIdx(-1); setHitBands({});
    }

    // Debounce — small files 200ms, large files 0ms (loader already showing, start immediately)
    const debounceMs = isLarge ? 0 : 200;

    translateTimer.current = setTimeout(async () => {
      const signal = { cancelled: false };
      cancelRef.current = signal;

      if (isLarge) {
        const t1 = performance.now();
        const lines = await transpileAsync(
          code, lang as any,
          (done, total, nm) => { if (!signal.cancelled) setLoadProgress({ done, total, nm }); },
          signal
        );
        if (signal.cancelled) return;
        const t2 = performance.now();
        setWlsLines(lines);
        setTranspiling(false);
        setTiming({ translate: parseFloat((t2 - t1).toFixed(2)), compile: 0, execute: 0 });
      } else {
        setInstructions([]); setCompiled(false); setExecuted(false);
        setDisplayedIns([]); setActiveIdx(-1); setHitBands({});
        const t1 = performance.now();
        const result = transpile(code, lang as any);
        const t2 = performance.now();
        setWlsLines(result.split("\n"));
        setTiming({ translate: parseFloat((t2 - t1).toFixed(2)), compile: 0, execute: 0 });
      }
    }, debounceMs);

    return () => { clearTimeout(translateTimer.current); };
  }, [code, lang]);

  const wls = useMemo(() => wlsLines.join("\n"), [wlsLines]);

  const resetExec = () => {
    clearTimeout(animTimer.current);
    setInstructions([]); setCompiled(false); setExecuted(false); setRunning(false);
    setDisplayedIns([]); setActiveIdx(-1); setHitBands({});
    setTiming(prev => ({ ...prev, compile: 0, execute: 0 }));
  };

  const handleLang = (l: string) => {
    setLang(l); setCode(STARTERS[l] ?? ""); setWlsLines([]);
    cancelRef.current.cancelled = true;
    setTranspiling(false);
    resetExec(); setShowDropdown(false);
    setTiming({ translate: 0, compile: 0, execute: 0 });
  };

  const doCompile = useCallback(async () => {
    const lineCount = wlsLines.length;
    const isLarge = lineCount >= LARGE_FILE_THRESHOLD;
    setExecuted(false); setDisplayedIns([]); setActiveIdx(-1); setHitBands({});

    if (isLarge) {
      setCompiling(true);
      setLoadProgress({ done: 0, total: lineCount, nm: 380 });
      const signal = { cancelled: false };
      const t1 = performance.now();
      const ins = await compileWLSAsync(
        wls, 
        (done, total, nm) => setLoadProgress({ done, total, nm }),
        signal
      );
      const t2 = performance.now();
      setInstructions(ins); setCompiled(true); setCompiling(false);
      setTiming(prev => ({ ...prev, compile: parseFloat((t2 - t1).toFixed(2)), execute: 0 }));
    } else {
      const t1 = performance.now();
      const ins = compileWLS(wls);
      const t2 = performance.now();
      setInstructions(ins); setCompiled(true);
      setTiming(prev => ({ ...prev, compile: parseFloat((t2 - t1).toFixed(2)), execute: 0 }));
    }
  }, [wls, wlsLines.length]);

  const doExecute = useCallback(() => {
    const real = instructions.filter(i => i.op !== 0x00 && i.mnem && !i.mnem.startsWith("."));
    if (!real.length) return;
    const t0 = performance.now();
    const delay = Math.max(30, Math.min(120, 800 / real.length));
    setRunning(true); setExecuted(false); setDisplayedIns([]); setActiveIdx(-1); setHitBands({});
    let idx = 0;
    const bands: Record<string, number> = {};
    function step() {
      if (idx >= real.length) {
        const elapsed = parseFloat((performance.now() - t0).toFixed(2));
        setRunning(false); setExecuted(true); setActiveIdx(-1);
        setTiming(prev => ({ ...prev, execute: elapsed }));
        return;
      }
      const ins = real[idx];
      setDisplayedIns(prev => [...prev, ins]);
      setActiveIdx(idx);
      if (ins.nm) {
        const band = BANDS.find(b => ins.nm! >= b.min && ins.nm! < b.max);
        if (band) { bands[band.label] = (bands[band.label] ?? 0) + 1; setHitBands({ ...bands }); }
      }
      // auto-scroll
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      idx++;
      animTimer.current = setTimeout(step, delay);
    }
    step();
  }, [instructions]);

  const realIns = instructions.filter(i => i.op !== 0x00 && i.mnem && !i.mnem.startsWith("."));
  const totalMs = timing.translate + timing.compile + timing.execute;
  const langLabel = LANGS.find(l => l.id === lang)?.label ?? lang;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* Top bar */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/wnsp">
          <button className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
        </Link>
        <div className="h-4 w-px bg-white/15" />
        <Radio size={14} className="text-violet-400" />
        <h1 className="text-sm font-semibold text-white">WavelengthScript Translator</h1>
        <span className="text-xs text-gray-600 hidden sm:block">Any language → WLS → Bytecode → Execute · Browser-native · Zero server</span>
        <div className="ml-auto flex items-center gap-2">
          {timing.translate > 0 && (
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <Clock size={10} /> {timing.translate}ms
            </span>
          )}
          {totalMs > 0 && executed && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${totalMs < 1000 ? "border-green-500/40 text-green-400 bg-green-950/30" : "border-yellow-500/40 text-yellow-400"}`}>
              {totalMs.toFixed(1)}ms total
            </span>
          )}
        </div>
      </div>

      {/* Language selector bar */}
      <div className="border-b border-white/10 px-4 py-2 flex items-center gap-2 flex-shrink-0 bg-black/20">
        <h2 className="text-[10px] text-gray-600 uppercase tracking-wider mr-1">Source language</h2>
        {/* Desktop: pill buttons */}
        <div className="hidden sm:flex gap-1">
          {LANGS.map(l => (
            <button
              key={l.id}
              data-testid={`lang-${l.id}`}
              onClick={() => handleLang(l.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                lang === l.id
                  ? "bg-violet-600 text-white"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {/* Mobile: dropdown */}
        <div className="relative sm:hidden">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-violet-600 text-xs font-medium"
          >
            {langLabel} <ChevronDown size={12} />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-[#111] border border-white/10 rounded-lg overflow-hidden z-20 shadow-xl">
              {LANGS.map(l => (
                <button key={l.id} onClick={() => handleLang(l.id)}
                  className="block w-full px-4 py-2 text-left text-xs hover:bg-white/10 transition-colors">
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="ml-auto text-[10px] text-gray-600">
          {code.length.toLocaleString()} chars
        </div>
      </div>

      {/* Main split view */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

        {/* Left — source code */}
        <div className="flex-1 flex flex-col border-r border-white/10 min-h-0">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/10 flex-shrink-0">
            <Code2 size={12} className="text-gray-500" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{langLabel}</span>
          </div>
          <textarea
            data-testid="code-input"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 w-full bg-transparent p-4 font-mono text-sm text-green-300 resize-none focus:outline-none leading-relaxed"
            spellCheck={false}
            placeholder="Paste or type any code here..."
          />
        </div>

        {/* Right — WavelengthScript output */}
        <div className="flex-1 flex flex-col min-h-0 border-t lg:border-t-0 border-white/10">
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-violet-950/20 flex-shrink-0">
            <Radio size={12} className={transpiling ? "text-yellow-400 animate-pulse" : "text-violet-400"} />
            <h2 className={`text-[10px] uppercase tracking-wider ${transpiling ? "text-yellow-400" : "text-violet-400"}`}>
              WavelengthScript
            </h2>
            <span className="text-[10px] text-gray-600 ml-1">
              {transpiling
                ? `${loadProgress.done.toLocaleString()} / ${loadProgress.total.toLocaleString()} lines…`
                : wlsLines.length > 0 ? `${wlsLines.length.toLocaleString()} lines · live`
                : "live"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {wlsLines.length > 0 && !transpiling && <CopyBtn text={wls} />}
            </div>
          </div>

          {transpiling ? (
            <SpectralLoader
              linesTotal={loadProgress.total}
              linesDone={loadProgress.done}
              activeNm={loadProgress.nm}
            />
          ) : wlsLines.length > 0 ? (
            <VirtualWLSOutput lines={wlsLines} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-gray-700 text-xs text-center px-6">
                Type or paste code on the left — WavelengthScript appears here instantly.
                <br /><span className="text-gray-800 text-[10px]">Large files (250+ lines) show a spectral loading screen.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0 bg-black/30 flex-wrap">
        {/* Step 1 already done (live translation) — show step 2 button */}
        <button
          data-testid="btn-compile"
          onClick={doCompile}
          disabled={!wls || transpiling || compiling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            compiled
              ? "bg-cyan-900/60 border border-cyan-500/30 text-cyan-400"
              : "bg-cyan-700 hover:bg-cyan-600 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          {compiling
            ? <><span className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" /> Compiling…</>
            : <><Binary size={14} /> {compiled ? "Bytecode ready" : "Compile to Bytecode"}</>
          }
        </button>

        {/* Arrow */}
        <span className="text-gray-700 text-xs hidden sm:block">→</span>

        {/* Step 3 — Execute */}
        <button
          data-testid="btn-execute"
          onClick={doExecute}
          disabled={!compiled || running}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            executed
              ? "bg-green-900/60 border border-green-500/30 text-green-400"
              : running
              ? "bg-green-800/60 border border-green-500/20 text-green-300 cursor-wait"
              : "bg-green-700 hover:bg-green-600 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          {running
            ? <><span className="w-3 h-3 rounded-full border-2 border-green-400 border-t-transparent animate-spin" /> Running…</>
            : <><Play size={14} /> {executed ? "Executed ✓" : "Execute in VM"}</>
          }
        </button>

        {/* Reset */}
        {(compiled || executed) && (
          <button
            onClick={() => { setInstructions([]); setCompiled(false); setExecuted(false); setTiming(prev => ({ ...prev, compile: 0, execute: 0 })); }}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-500 hover:text-white transition-colors"
          >
            Reset
          </button>
        )}

        <div className="ml-auto flex items-center gap-3 text-[10px]">
          {timing.translate > 0 && <span className="text-gray-600">WLS <span className="text-violet-400">{timing.translate}ms</span></span>}
          {timing.compile > 0 && <span className="text-gray-600">compile <span className="text-cyan-400">{timing.compile}ms</span></span>}
          {timing.execute > 0 && <span className="text-gray-600">execute <span className="text-green-400">{timing.execute}ms</span></span>}
          {executed && (
            <span className={`font-bold px-2 py-0.5 rounded border ${totalMs < 1000 ? "border-green-500/40 text-green-300 bg-green-950/30" : "border-yellow-500/40 text-yellow-300"}`}>
              {totalMs.toFixed(2)}ms total
            </span>
          )}
        </div>
      </div>

      {/* Bytecode — loader while compiling, virtual table when done */}
      {(compiling || (compiled && instructions.length > 0)) && (
        <div className={`border-t border-cyan-500/20 bg-black/40 flex-shrink-0 flex flex-col ${compiling ? "h-72" : "max-h-56"}`}>
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/80 flex-shrink-0">
            <Binary size={12} className={compiling ? "text-yellow-400 animate-pulse" : "text-cyan-400"} />
            <h2 className={`text-[10px] uppercase tracking-wider ${compiling ? "text-yellow-400" : "text-cyan-400"}`}>WNSP Bytecode</h2>
            <span className="text-[10px] text-gray-600 ml-1">
              {compiling
                ? `${loadProgress.done.toLocaleString()} / ${loadProgress.total.toLocaleString()} lines…`
                : `${realIns.length.toLocaleString()} instructions · ${timing.compile}ms`}
            </span>
            {compiled && !compiling && (
              <div className="ml-auto">
                <CopyBtn text={instructions.map(i => `0x${i.op.toString(16).padStart(2,"0")}  ${i.mnem.padEnd(6)}  ${i.args}`).join("\n")} />
              </div>
            )}
          </div>
          {compiling ? (
            <SpectralLoader
              linesTotal={loadProgress.total}
              linesDone={loadProgress.done}
              activeNm={loadProgress.nm}
              label="COMPILING"
            />
          ) : (
            <VirtualBytecodeTable
              rows={instructions.filter(i => i.mnem && !["", ".WNSP", ".ARCH", ".MODEL"].includes(i.mnem))}
            />
          )}
        </div>
      )}

      {/* ── VM animated monitor — shows while running and after ── */}
      {(running || executed) && (
        <div className="border-t border-green-500/20 bg-black flex-shrink-0">

          {/* Monitor header */}
          <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/90">
            <div className={`w-2 h-2 rounded-full ${running ? "bg-green-400 animate-pulse" : "bg-green-600"}`} />
            <Activity size={12} className="text-green-400" />
            <span className="text-[10px] text-green-400 uppercase tracking-wider font-mono">
              WNSP VM {running ? `— executing ${displayedIns.length}/${realIns.length}` : `— HALT`}
            </span>
            {executed && (
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${totalMs < 1000 ? "border-green-500/40 text-green-300 bg-green-950/30" : "border-yellow-500/40 text-yellow-300"}`}>
                {totalMs.toFixed(2)}ms total {totalMs < 1000 ? "· ✓ under 1s" : ""}
              </span>
            )}
          </div>

          <div className="flex flex-col lg:flex-row">

            {/* CRT monitor log */}
            <div className="flex-1 relative overflow-hidden" style={{ minHeight: "200px", maxHeight: "280px" }}>
              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none z-10" style={{
                background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)"
              }} />
              {/* Vignette */}
              <div className="absolute inset-0 pointer-events-none z-10" style={{
                background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)"
              }} />
              <div ref={logRef} className="h-full overflow-auto p-4 font-mono text-xs space-y-px" style={{ background: "#020805" }}>
                <div className="text-green-700 mb-2 opacity-70">[WNSP VM v1.0] Boot sequence · 25,600 Ψ channels ready</div>
                {displayedIns.map((ins, idx) => {
                  const isActive = idx === activeIdx;
                  const col = ins.nm ? nmToColor(ins.nm) : "#4b5563";
                  return (
                    <div key={idx}
                      className="flex gap-3 py-px transition-all duration-150"
                      style={{ opacity: isActive ? 1 : 0.75 }}
                    >
                      {/* Active cursor glow */}
                      {isActive && (
                        <span className="w-1 shrink-0 rounded-full self-stretch" style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}` }} />
                      )}
                      {!isActive && <span className="w-1 shrink-0" />}
                      <span className="text-gray-600 w-8 shrink-0">{`0x${ins.op.toString(16).padStart(2,"0")}`}</span>
                      <span className="w-14 shrink-0 font-bold" style={{ color: col, textShadow: isActive ? `0 0 8px ${col}` : "none" }}>
                        {ins.mnem}
                      </span>
                      <span className="text-gray-400 flex-1 truncate">{ins.args}</span>
                      {ins.nm && <span className="shrink-0 hidden sm:block" style={{ color: col, opacity: 0.6 }}>{ins.nm}nm</span>}
                    </div>
                  );
                })}
                {/* Blinking cursor while running */}
                {running && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-green-400 animate-pulse font-bold">█</span>
                    <span className="text-green-700 text-[10px]">executing…</span>
                  </div>
                )}
                {executed && (
                  <div className="mt-2 pt-2 border-t border-green-900/40 text-green-600">
                    [WNSP VM] HALT · {realIns.length} instructions · wavefunction collapsed
                  </div>
                )}
              </div>
            </div>

            {/* Spectrum visualiser */}
            <div className="lg:w-56 border-t lg:border-t-0 lg:border-l border-white/10 p-4 flex flex-col gap-2" style={{ background: "#020805" }}>
              <h3 className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 font-mono">Spectrum Activity</h3>
              {BANDS.map(band => {
                const count = hitBands[band.label] ?? 0;
                const maxCount = Math.max(1, ...Object.values(hitBands));
                const pct = count > 0 ? Math.max(8, (count / maxCount) * 100) : 0;
                const active = realIns[activeIdx]?.nm
                  ? realIns[activeIdx].nm! >= band.min && realIns[activeIdx].nm! < band.max
                  : false;
                return (
                  <div key={band.label} className="flex items-center gap-2">
                    <div className="w-16 text-[9px] font-mono shrink-0" style={{ color: band.color, opacity: count > 0 ? 1 : 0.25 }}>
                      {band.label}
                    </div>
                    <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: band.color,
                          boxShadow: active ? `0 0 8px ${band.color}` : "none",
                          opacity: count > 0 ? (active ? 1 : 0.6) : 0,
                        }}
                      />
                    </div>
                    <div className="w-6 text-right text-[9px] font-mono shrink-0" style={{ color: band.color, opacity: count > 0 ? 1 : 0.2 }}>
                      {count > 0 ? count : ""}
                    </div>
                  </div>
                );
              })}
              {/* Active wavelength display */}
              {running && realIns[activeIdx]?.nm && (
                <div className="mt-2 pt-2 border-t border-white/10 text-center">
                  <div className="text-[9px] text-gray-600 font-mono mb-1">Active λ</div>
                  <div
                    className="text-lg font-bold font-mono"
                    style={{ color: nmToColor(realIns[activeIdx].nm!), textShadow: `0 0 12px ${nmToColor(realIns[activeIdx].nm!)}` }}
                  >
                    {realIns[activeIdx].nm}nm
                  </div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: nmToColor(realIns[activeIdx].nm!), opacity: 0.7 }}>
                    {realIns[activeIdx].psi ?? nmToBand(realIns[activeIdx].nm!)}
                  </div>
                </div>
              )}
              {executed && (
                <div className="mt-auto pt-2 border-t border-white/10">
                  <div className="text-[9px] text-gray-600 font-mono mb-1">Channels used</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(hitBands).map(([label, count]) => {
                      const band = BANDS.find(b => b.label === label)!;
                      return (
                        <span key={label} className="text-[8px] px-1.5 py-0.5 rounded font-mono"
                          style={{ backgroundColor: `${band.color}20`, color: band.color, border: `1px solid ${band.color}40` }}>
                          {label} ×{count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Related resources — crawlable internal links */}
      <div className="border-t border-white/8 px-4 py-4 flex-shrink-0 bg-black/20">
        <h2 className="text-[9px] text-gray-600 uppercase tracking-widest mb-3">Related Resources</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/wavelength-lang" className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">WavelengthScript Language Spec</Link>
          <Link href="/wnsp-vm" className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">WNSP Virtual Machine</Link>
          <Link href="/hardware-spec" className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">Hardware Specification</Link>
          <Link href="/compression-explorer" className="text-[11px] text-green-400 hover:text-green-300 transition-colors">Compression State Explorer</Link>
          <Link href="/oscillating-quanta" className="text-[11px] text-yellow-400 hover:text-yellow-300 transition-colors">Theory of Compression States</Link>
          <Link href="/ce-code-writer" className="text-[11px] text-pink-400 hover:text-pink-300 transition-colors">CE→SE Code Writer</Link>
        </div>
      </div>
    </div>
  );
}
