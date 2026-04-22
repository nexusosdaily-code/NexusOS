import { useState, useEffect, useRef } from "react";

// ── Physics constants ─────────────────────────────────────────────
const H = 6.626e-34;
const C = 2.998e8;

// ── CE 128-band lookup table ──────────────────────────────────────
const CE_TABLE: number[] = Array.from({ length: 128 }, (_, i) => 380 + (i / 128) * 400);

export function charToNm(char: string): number {
  if (!char || char.charCodeAt(0) === 32) return 0;
  return CE_TABLE[char.charCodeAt(0) % 128];
}

// ── Wavelength → RGB ──────────────────────────────────────────────
export function nmToRgb(nm: number): string {
  if (!nm) return "rgb(40,44,52)";
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  const boost = 0.85;
  return `rgb(${Math.round(r * 255 * boost + 255 * (1 - boost) * 0.1)},${Math.round(g * 255 * boost + 255 * (1 - boost) * 0.1)},${Math.round(b * 255 * boost + 255 * (1 - boost) * 0.1)})`;
}

// ── Scientific notation formatting ───────────────────────────────
function toSci(n: number, dp = 2): string {
  if (!n) return "0";
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mant = n / Math.pow(10, exp);
  return `${mant.toFixed(dp)}×10${superscript(exp)}`;
}

function superscript(n: number): string {
  const map: Record<string, string> = {
    "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","-":"⁻"
  };
  return String(n).split("").map(c => map[c] ?? c).join("");
}

// ── Per-character physics ─────────────────────────────────────────
function charPhysics(char: string) {
  const nm = charToNm(char);
  if (!nm) return null;
  const f  = C / (nm * 1e-9);
  const lm = H * f / (C * C);
  return { nm, f, lm };
}

// ══════════════════════════════════════════════════════════════════
// Component 1 — Spectral Character Table (screenshot 1 style)
// ══════════════════════════════════════════════════════════════════
interface CharTableProps {
  text: string;
  title?: string;
  maxChars?: number;
}

export function SpectralCharTable({ text, title = "CE Spectral Encoding", maxChars = 40 }: CharTableProps) {
  const chars = text.slice(0, maxChars).split("").filter(c => c !== " ");
  if (!chars.length) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">{title}</span>
        <span className="text-xs text-slate-600 font-mono">Λ = hf/c²</span>
      </div>
      <div className="p-4 space-y-1 font-mono text-xs">
        {chars.map((ch, i) => {
          const p = charPhysics(ch);
          if (!p) return null;
          const color = nmToRgb(p.nm);
          return (
            <div key={i} className="flex items-center gap-3 group">
              <span
                className="w-6 h-5 rounded flex items-center justify-center text-black font-bold text-xs flex-shrink-0"
                style={{ background: color }}
              >
                {ch}
              </span>
              <span className="text-slate-500">→</span>
              <span className="text-slate-300">
                λ=<span className="text-white">{p.nm.toFixed(2)}</span>nm
              </span>
              <span className="text-slate-600 hidden sm:inline">,</span>
              <span className="text-slate-300 hidden sm:inline">
                f=<span className="text-cyan-400">{toSci(p.f)}</span>Hz
              </span>
              <span className="text-slate-600 hidden md:inline">,</span>
              <span className="text-slate-300 hidden md:inline">
                Λ=<span className="text-violet-400">{toSci(p.lm)}</span>kg
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Component 2 — Rhythm Grid (screenshot 2 style)
// ══════════════════════════════════════════════════════════════════
type Rhythm = "Short" | "Normal" | "Slow";
const RHYTHM_MS: Record<Rhythm, number> = { Short: 80, Normal: 200, Slow: 500 };
const COLS = 14;

interface RhythmGridProps {
  text: string;
  title?: string;
  showWavelengthData?: boolean;
}

export function RhythmGrid({ text, title = "Spectral Grid", showWavelengthData = true }: RhythmGridProps) {
  const [rhythm, setRhythm] = useState<Rhythm>("Normal");
  const [active, setActive] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tokens = text.split("").map(ch => ({
    char: ch,
    nm: charToNm(ch),
  }));

  const rows: typeof tokens[] = [];
  for (let i = 0; i < tokens.length; i += COLS) {
    rows.push(tokens.slice(i, i + COLS));
  }

  const wavelengths = tokens.map(t => t.nm);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let idx = 0;
    intervalRef.current = setInterval(() => {
      setActive(idx % tokens.length);
      idx++;
    }, RHYTHM_MS[rhythm]);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [rhythm, tokens.length]);

  if (!text.trim()) return null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">{title}</span>
        <div className="flex gap-1">
          {(["Short", "Normal", "Slow"] as Rhythm[]).map(r => (
            <button
              key={r}
              onClick={() => setRhythm(r)}
              className={`px-3 py-0.5 rounded-full text-xs font-medium border transition-all ${
                rhythm === r
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-lg overflow-hidden bg-slate-900 p-3">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1">
              {row.map((tok, ci) => {
                const globalIdx = ri * COLS + ci;
                const isActive = active === globalIdx;
                const isEmpty  = tok.nm === 0;

                return (
                  <div
                    key={ci}
                    title={isEmpty ? "space" : `'${tok.char}' λ=${tok.nm.toFixed(1)}nm`}
                    className="flex-1 min-w-0 aspect-square rounded-md flex items-center justify-center text-xs font-bold transition-all duration-75"
                    style={{
                      background: isEmpty ? "rgba(255,255,255,0.05)" : nmToRgb(tok.nm),
                      opacity: isEmpty ? 0.4 : isActive ? 1 : 0.82,
                      transform: isActive ? "scale(1.08)" : "scale(1)",
                      boxShadow: isActive && !isEmpty ? `0 0 10px ${nmToRgb(tok.nm)}` : "none",
                      color: isEmpty ? "rgba(255,255,255,0.3)" : "transparent",
                      fontSize: "0.55rem",
                    }}
                  >
                    {isEmpty ? "?" : ""}
                  </div>
                );
              })}
              {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                <div key={`pad-${i}`} className="flex-1 min-w-0 aspect-square" />
              ))}
            </div>
          ))}
        </div>

        {showWavelengthData && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs text-cyan-500 font-semibold mb-1 font-mono">Wavelength Data (nm)</p>
            <p className="text-xs font-mono text-slate-400 leading-relaxed break-all">
              [{wavelengths.map((w, i) => (
                <span key={i} style={{ color: w ? nmToRgb(w) : "#4b5563" }}>
                  {w ? w.toFixed(0) : "0"}
                  {i < wavelengths.length - 1 ? <span className="text-slate-600">, </span> : ""}
                </span>
              ))}]
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Component 3 — Combined panel (both in one block)
// ══════════════════════════════════════════════════════════════════
export function SpectralPanel({ text, label }: { text: string; label?: string }) {
  if (!text.trim()) return null;
  return (
    <div className="space-y-4">
      <RhythmGrid text={text} title={label ? `${label} — Spectral Grid` : "Spectral Grid"} />
      <SpectralCharTable text={text} title={label ? `${label} — CE Encoding` : "CE Spectral Encoding"} />
    </div>
  );
}
