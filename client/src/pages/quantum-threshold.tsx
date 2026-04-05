import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Cpu, Zap, Activity, ArrowRight } from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────
const H_PLANCK   = 6.626e-34;
const M_ELECTRON = 9.109e-31;
const K_BOLTZMANN= 1.380e-23;
const T_ROOM     = 300;          // K
const EV         = 1.602e-19;    // J per eV
const C_LIGHT    = 2.998e8;      // m/s
const FIRST_OSC  = 555e12;       // Hz — Nexus First Oscillation

// de Broglie wavelength of a thermal electron (nm)
function deBroglieNm(eV_energy = 0.026): number {
  const E_J = eV_energy * EV;
  const lambda_m = H_PLANCK / Math.sqrt(2 * M_ELECTRON * E_J);
  return lambda_m * 1e9;
}

// Tunneling transmission coefficient (WKB approximation)
// T ≈ exp(-2 * κ * d), κ = sqrt(2m(V-E)) / ħ
function tunnelingT(barrierNm: number, barrierEv = 3.1): number {
  const d   = barrierNm * 1e-9;
  const V_J = barrierEv * EV;
  const E_J = 0.026 * EV; // thermal energy
  if (V_J <= E_J) return 1.0;
  const hbar = H_PLANCK / (2 * Math.PI);
  const kappa = Math.sqrt(2 * M_ELECTRON * (V_J - E_J)) / hbar;
  return Math.exp(-2 * kappa * d);
}

// ── Moore's Law data ──────────────────────────────────────────────
const MOORE_DATA: { year: number; nm: number; maker: string; label: string }[] = [
  { year: 1971, nm: 10000, maker: "Intel",  label: "4004 (10 μm)" },
  { year: 1978, nm: 3000,  maker: "Intel",  label: "8086 (3 μm)" },
  { year: 1985, nm: 1000,  maker: "Intel",  label: "386 (1 μm)" },
  { year: 1993, nm: 600,   maker: "Intel",  label: "Pentium (600 nm)" },
  { year: 1997, nm: 250,   maker: "Intel",  label: "P2 (250 nm)" },
  { year: 2001, nm: 130,   maker: "Intel",  label: "P4 (130 nm)" },
  { year: 2005, nm: 65,    maker: "Intel",  label: "Core (65 nm)" },
  { year: 2009, nm: 32,    maker: "Intel",  label: "Core i7 (32 nm)" },
  { year: 2012, nm: 22,    maker: "Intel",  label: "Ivy Bridge (22 nm)" },
  { year: 2016, nm: 10,    maker: "TSMC",   label: "A10 (10 nm)" },
  { year: 2018, nm: 7,     maker: "TSMC",   label: "A12 (7 nm)" },
  { year: 2020, nm: 5,     maker: "TSMC",   label: "M1 (5 nm)" },
  { year: 2022, nm: 3,     maker: "TSMC",   label: "M2 (3 nm)" },
  { year: 2024, nm: 2,     maker: "TSMC",   label: "A18 (2 nm)" },
  // Projected
  { year: 2027, nm: 1,     maker: "?",      label: "1 nm (~4 atoms)" },
  { year: 2029, nm: 0.5,   maker: "?",      label: "0.5 nm (~2 atoms)" },
  { year: 2031, nm: 0.28,  maker: "?",      label: "1 atom — physics limit" },
];

const DE_BROGLIE_NM = deBroglieNm(0.026); // ~7.6 nm thermal electrons

// ── SVG Moore's Law Chart ─────────────────────────────────────────
function MooresLawChart() {
  const W = 660; const H = 320;
  const PAD = { top: 20, right: 30, bottom: 40, left: 60 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const years = MOORE_DATA.map(d => d.year);
  const minYear = 1971; const maxYear = 2032;
  const xScale = (y: number) => ((y - minYear) / (maxYear - minYear)) * cW;

  // Log scale for nm (10000 → 0.28)
  const logMax = Math.log10(10000);
  const logMin = Math.log10(0.28);
  const yScale = (nm: number) =>
    cH - ((Math.log10(nm) - logMin) / (logMax - logMin)) * cH;

  // De Broglie and tunneling thresholds
  const deBroglieY  = yScale(DE_BROGLIE_NM);   // ~7.6 nm
  const tunnelingY  = yScale(2);                // 2 nm — significant tunneling
  const atomLimitY  = yScale(0.5);              // 0.5 nm — one atom

  const polyline = MOORE_DATA
    .filter(d => d.year <= 2024)
    .map(d => `${PAD.left + xScale(d.year)},${PAD.top + yScale(d.nm)}`)
    .join(" ");

  const projected = MOORE_DATA
    .filter(d => d.year >= 2024)
    .map(d => `${PAD.left + xScale(d.year)},${PAD.top + yScale(d.nm)}`)
    .join(" ");

  const yTicks = [10000, 1000, 100, 10, 1, 0.5, 0.28];
  const xTicks = [1971, 1980, 1990, 2000, 2010, 2020, 2030];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 340 }}
        data-testid="moores-law-chart"
      >
        {/* Background zones */}
        {/* Classical silicon zone */}
        <rect
          x={PAD.left} y={PAD.top}
          width={cW}
          height={deBroglieY}
          fill="rgba(0,200,100,0.06)"
        />
        {/* Quantum concern zone */}
        <rect
          x={PAD.left}
          y={PAD.top + deBroglieY}
          width={cW}
          height={tunnelingY - deBroglieY}
          fill="rgba(255,200,0,0.08)"
        />
        {/* Tunneling dominant zone */}
        <rect
          x={PAD.left}
          y={PAD.top + tunnelingY}
          width={cW}
          height={cH - tunnelingY}
          fill="rgba(255,60,60,0.1)"
        />

        {/* Grid */}
        {yTicks.map(nm => (
          <g key={nm}>
            <line
              x1={PAD.left} y1={PAD.top + yScale(nm)}
              x2={PAD.left + cW} y2={PAD.top + yScale(nm)}
              stroke="rgba(255,255,255,0.07)" strokeWidth={1}
            />
            <text
              x={PAD.left - 6} y={PAD.top + yScale(nm) + 4}
              textAnchor="end" fill="#6b7280" fontSize={10} fontFamily="monospace"
            >
              {nm < 1 ? `${nm}` : nm >= 1000 ? `${nm/1000}μm` : `${nm}nm`}
            </text>
          </g>
        ))}
        {xTicks.map(yr => (
          <g key={yr}>
            <line
              x1={PAD.left + xScale(yr)} y1={PAD.top}
              x2={PAD.left + xScale(yr)} y2={PAD.top + cH}
              stroke="rgba(255,255,255,0.07)" strokeWidth={1}
            />
            <text
              x={PAD.left + xScale(yr)} y={PAD.top + cH + 16}
              textAnchor="middle" fill="#6b7280" fontSize={10} fontFamily="monospace"
            >
              {yr}
            </text>
          </g>
        ))}

        {/* Threshold lines */}
        {/* de Broglie threshold */}
        <line
          x1={PAD.left} y1={PAD.top + deBroglieY}
          x2={PAD.left + cW} y2={PAD.top + deBroglieY}
          stroke="#facc15" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text
          x={PAD.left + cW - 4} y={PAD.top + deBroglieY - 4}
          textAnchor="end" fill="#facc15" fontSize={9} fontFamily="monospace"
        >
          λ_dB ≈ {DE_BROGLIE_NM.toFixed(1)} nm — electron wave onset
        </text>

        {/* Tunneling dominant */}
        <line
          x1={PAD.left} y1={PAD.top + tunnelingY}
          x2={PAD.left + cW} y2={PAD.top + tunnelingY}
          stroke="#f87171" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text
          x={PAD.left + cW - 4} y={PAD.top + tunnelingY - 4}
          textAnchor="end" fill="#f87171" fontSize={9} fontFamily="monospace"
        >
          2 nm — tunneling dominant
        </text>

        {/* Atom limit */}
        <line
          x1={PAD.left} y1={PAD.top + atomLimitY}
          x2={PAD.left + cW} y2={PAD.top + atomLimitY}
          stroke="#c084fc" strokeWidth={1.5} strokeDasharray="4 2"
        />
        <text
          x={PAD.left + cW - 4} y={PAD.top + atomLimitY - 4}
          textAnchor="end" fill="#c084fc" fontSize={9} fontFamily="monospace"
        >
          ~0.5 nm — 2-atom gate — Λ substrate takes over
        </text>

        {/* Moore's Law line (historical) */}
        <polyline
          points={polyline}
          fill="none" stroke="#34d399" strokeWidth={2.5}
        />

        {/* Projected (dashed) */}
        <polyline
          points={projected}
          fill="none" stroke="#f87171" strokeWidth={2} strokeDasharray="5 4"
        />

        {/* Data points */}
        {MOORE_DATA.map((d, i) => {
          const cx = PAD.left + xScale(d.year);
          const cy = PAD.top + yScale(d.nm);
          const projected = d.year > 2024;
          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={4}
                fill={projected ? "#f87171" : "#34d399"}
                stroke="#0f172a" strokeWidth={1.5}
              />
              {[1971, 2020, 2022, 2027, 2031].includes(d.year) && (
                <text
                  x={cx} y={cy - 8}
                  textAnchor="middle"
                  fill={projected ? "#fca5a5" : "#86efac"}
                  fontSize={8} fontFamily="monospace"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={PAD.left - 40} y={PAD.top + cH / 2}
          textAnchor="middle" fill="#9ca3af" fontSize={11}
          transform={`rotate(-90, ${PAD.left - 40}, ${PAD.top + cH / 2})`}
          fontFamily="monospace"
        >
          Transistor Node Size
        </text>
        <text
          x={PAD.left + cW / 2} y={H - 4}
          textAnchor="middle" fill="#9ca3af" fontSize={11}
          fontFamily="monospace"
        >
          Year
        </text>

        {/* Zone labels */}
        <text x={PAD.left + 8} y={PAD.top + 14} fill="#4ade80" fontSize={9} fontFamily="monospace">
          ● Classical CMOS — fully controlled
        </text>
        <text x={PAD.left + 8} y={PAD.top + deBroglieY + 14} fill="#facc15" fontSize={9} fontFamily="monospace">
          ⚠ Quantum concern — wave effects emerge
        </text>
        <text x={PAD.left + 8} y={PAD.top + tunnelingY + 14} fill="#f87171" fontSize={9} fontFamily="monospace">
          ✕ Tunneling dominant — gate control lost
        </text>
      </svg>
    </div>
  );
}

// ── Tunneling visualizer ──────────────────────────────────────────
function TunnelingVisualizer() {
  const [gateNm, setGateNm] = useState(2.0);
  const T = tunnelingT(gateNm);
  const percent = Math.min(100, T * 100);
  const leakPercent = Math.min(100, percent * 2.5);

  const wavePoints = (amplitude: number, phase: number) => {
    const pts: string[] = [];
    for (let x = 0; x <= 300; x += 2) {
      const y = 60 + amplitude * Math.sin((x / 300) * 4 * Math.PI + phase);
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  };

  const barrierStart = 120;
  const barrierEnd   = barrierStart + Math.max(4, gateNm * 20);
  const attenuated   = Math.max(0.05, 1 - T * 1.2);

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Adjust the gate oxide thickness. When the barrier is thinner than the
        electron's de Broglie wavelength (~{DE_BROGLIE_NM.toFixed(1)} nm), the
        wavefunction tunnels straight through. The gate loses control.
      </p>

      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-slate-400 w-32">
          Gate oxide: <span className="text-cyan-300">{gateNm.toFixed(1)} nm</span>
        </span>
        <Slider
          value={[gateNm]}
          onValueChange={([v]) => setGateNm(v)}
          min={0.3} max={10} step={0.1}
          className="flex-1"
          data-testid="slider-gate-nm"
        />
        <span className="text-xs font-mono text-slate-500 w-24 text-right">
          (~{Math.round(gateNm / 0.25)} atoms)
        </span>
      </div>

      {/* Wave visualization */}
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
        <svg viewBox="0 0 300 120" className="w-full" style={{ height: 120 }}>
          {/* Barrier */}
          <rect
            x={barrierStart} y={0}
            width={barrierEnd - barrierStart} height={120}
            fill={`rgba(239,68,68,${0.15 + (1 - T) * 0.3})`}
          />
          <line x1={barrierStart} y1={0} x2={barrierStart} y2={120}
            stroke="#ef4444" strokeWidth={1.5} />
          <line x1={barrierEnd} y1={0} x2={barrierEnd} y2={120}
            stroke="#ef4444" strokeWidth={1.5} />
          <text x={(barrierStart + barrierEnd) / 2} y={14}
            textAnchor="middle" fill="#fca5a5" fontSize={8} fontFamily="monospace">
            Gate oxide
          </text>
          <text x={(barrierStart + barrierEnd) / 2} y={25}
            textAnchor="middle" fill="#fca5a5" fontSize={8} fontFamily="monospace">
            {gateNm.toFixed(1)} nm
          </text>

          {/* Incident wave */}
          <polyline points={wavePoints(20, 0).split(" ").filter((_, i) => {
            const x = parseFloat(_.split(",")[0]);
            return x <= barrierStart;
          }).join(" ")}
            fill="none" stroke="#34d399" strokeWidth={2}
          />

          {/* Evanescent decay inside barrier */}
          {Array.from({ length: Math.floor((barrierEnd - barrierStart) / 2) }, (_, i) => {
            const x = barrierStart + i * 2;
            const decay = Math.exp(-i * 0.15 * (3 / gateNm));
            const y = 60 + 20 * decay * Math.sin((i / 10) * Math.PI);
            return <circle key={i} cx={x} cy={y} r={1}
              fill={`rgba(251,191,36,${decay})`} />;
          })}

          {/* Transmitted wave (attenuated) */}
          <polyline
            points={wavePoints(20 * (1 - attenuated * 0.92), 0.5).split(" ").filter((_, i) => {
              const x = parseFloat(_.split(",")[0]);
              return x >= barrierEnd;
            }).join(" ")}
            fill="none" stroke={T > 0.01 ? "#f87171" : "#374151"} strokeWidth={T > 0.01 ? 2 : 0.5}
          />

          {/* Labels */}
          <text x={60} y={106} textAnchor="middle" fill="#6ee7b7" fontSize={8} fontFamily="monospace">
            incident electron
          </text>
          <text x={barrierEnd + 50} y={106} textAnchor="middle" fill={T > 0.01 ? "#fca5a5" : "#4b5563"}
            fontSize={8} fontFamily="monospace">
            {T > 0.01 ? "tunneled!" : "blocked"}
          </text>
        </svg>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-900 rounded p-2 border border-slate-700">
          <p className="text-slate-500">Gate thickness</p>
          <p className="text-cyan-300">{gateNm.toFixed(1)} nm</p>
        </div>
        <div className="bg-slate-900 rounded p-2 border border-slate-700">
          <p className="text-slate-500">Transmission T</p>
          <p className={T > 0.001 ? "text-red-400" : "text-green-400"}>
            {T < 1e-10 ? "< 10⁻¹⁰" : T.toExponential(2)}
          </p>
        </div>
        <div className="bg-slate-900 rounded p-2 border border-slate-700">
          <p className="text-slate-500">Gate control</p>
          <p className={T < 0.0001 ? "text-green-400" : T < 0.01 ? "text-yellow-400" : "text-red-400"}>
            {T < 0.0001 ? "Reliable" : T < 0.01 ? "Degraded" : "LOST"}
          </p>
        </div>
        <div className="bg-slate-900 rounded p-2 border border-slate-700">
          <p className="text-slate-500">vs λ_dB</p>
          <p className={gateNm < DE_BROGLIE_NM ? "text-red-400" : "text-green-400"}>
            {(gateNm / DE_BROGLIE_NM).toFixed(2)}×
          </p>
        </div>
      </div>

      <div className="rounded p-3 text-xs font-mono"
        style={{
          background: T > 0.01 ? "rgba(239,68,68,0.1)" : T > 0.001 ? "rgba(250,204,21,0.1)" : "rgba(74,222,128,0.1)",
          border: `1px solid ${T > 0.01 ? "#ef4444" : T > 0.001 ? "#facc15" : "#4ade80"}60`,
        }}>
        {T > 0.01 && (
          <p className="text-red-400">
            ✕ GATE CONTROL LOST — tunneling current exceeds switch current.
            This transistor cannot be reliably switched. Moore's Law ends here.
          </p>
        )}
        {T > 0.001 && T <= 0.01 && (
          <p className="text-yellow-400">
            ⚠ DEGRADED — significant leakage. Heat dissipation and noise floor are
            approaching the Landauer limit (kT·ln2 per bit).
          </p>
        )}
        {T <= 0.001 && (
          <p className="text-green-400">
            ✓ Classical regime — gate barrier is effective. Electron wavefunction
            does not bridge the oxide. Normal CMOS operation.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Lambda Crossover ──────────────────────────────────────────────
function LambdaCrossover() {
  const rows = [
    {
      prop: "Fundamental carrier",
      silicon: "Electron (m = 9.1×10⁻³¹ kg)",
      lambda:  "Photon (m = 0)",
      winner: "lambda",
    },
    {
      prop: "Speed limit",
      silicon: "Electron drift ~10⁵ m/s",
      lambda:  "c = 2.998×10⁸ m/s (3,000× faster)",
      winner: "lambda",
    },
    {
      prop: "Tunneling barrier",
      silicon: "Exponential leakage below 2 nm",
      lambda:  "None — photons have no barrier interaction",
      winner: "lambda",
    },
    {
      prop: "Heat dissipation",
      silicon: "Landauer limit: kT·ln2 ≈ 2.8×10⁻²¹ J per bit",
      lambda:  "Near-zero (reversible photonic gates)",
      winner: "lambda",
    },
    {
      prop: "Gate size limit",
      silicon: "~0.5 nm — 2 atoms — physics wall",
      lambda:  "Wavelength-limited: λ/2 for a 555 THz photon ≈ 270 nm",
      winner: "both",
    },
    {
      prop: "Interference",
      silicon: "EM noise → bit errors at high density",
      lambda:  "Orthogonal channels ⟨Ψᵢ|Ψⱼ⟩ = 0 — physics-enforced isolation",
      winner: "lambda",
    },
    {
      prop: "Clock frequency",
      silicon: "3–5 GHz (EM skin effect & heat limit)",
      lambda:  "555 THz — 1.8 femtosecond cycle (First Oscillation)",
      winner: "lambda",
    },
    {
      prop: "Logic primitive",
      silicon: "MOSFET gate (voltage-controlled resistor)",
      lambda:  "Lambda Gate (phase-controlled photon path)",
      winner: "lambda",
    },
    {
      prop: "Addresses",
      silicon: "Memory offset (arbitrary)",
      lambda:  "Wavelength position (physics-grounded, deterministic)",
      winner: "lambda",
    },
    {
      prop: "Manufacturer",
      silicon: "TSMC / Intel / Samsung",
      lambda:  "Open — AGPL-3.0 — Nexus substrate",
      winner: "lambda",
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        When the tunneling wall is reached, the Λ substrate takes over.
        Every property that makes silicon fail is a property photons do not have.
      </p>

      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700">
              <th className="p-3 text-left text-slate-400 font-mono text-xs w-36">Property</th>
              <th className="p-3 text-left text-red-400 font-mono text-xs">Silicon CMOS</th>
              <th className="p-3 text-left text-violet-400 font-mono text-xs">Λ Photonic Substrate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="p-3 text-xs text-slate-400 font-mono">{row.prop}</td>
                <td className="p-3 text-xs text-slate-300">
                  <span className={row.winner === "lambda" ? "text-slate-500" : "text-slate-200"}>
                    {row.silicon}
                  </span>
                </td>
                <td className="p-3 text-xs">
                  <span className={row.winner === "lambda" ? "text-green-400" : "text-slate-300"}>
                    {row.winner === "lambda" && <span className="text-green-500 mr-1">✓</span>}
                    {row.lambda}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Clock comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="bg-slate-900 border-red-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-red-400">Silicon Clock — 3 GHz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs font-mono text-slate-400">
            <p>Cycle time: <span className="text-slate-200">333 picoseconds</span></p>
            <p>Limited by: electron mass, heat, EM skin effect</p>
            <p>Heat: ~100W TDP — fans, liquid cooling required</p>
            <p>Architecture: serial voltage transitions</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-violet-900/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-violet-400">Λ First Oscillation — 555 THz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs font-mono text-slate-400">
            <p>Cycle time: <span className="text-violet-300">1.80 femtoseconds</span></p>
            <p>Speed ratio: <span className="text-green-400">{(555e12 / 3e9).toLocaleString()}× faster</span></p>
            <p>Heat: near-zero — reversible photonic logic</p>
            <p>Architecture: parallel orthogonal channels</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Spectral Clock ────────────────────────────────────────────────
function SpectralClock() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const t = tick * 0.05;

  // 555 THz photon clock — visualized as rotating phase
  const phaseAngle = (t * Math.PI * 2) % (Math.PI * 2);

  // Silicon 3 GHz scaled animation — much slower relative
  const siAngle = (t * 0.0054 * Math.PI * 2) % (Math.PI * 2);

  const toXY = (angle: number, r: number, cx: number, cy: number) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  const lambdaHand = toXY(phaseAngle, 55, 80, 80);
  const siHand     = toXY(siAngle,   55, 260, 80);

  const keyMetrics = [
    { label: "Λ frequency",   value: "555 THz",    color: "#a78bfa" },
    { label: "Λ cycle",       value: "1.80 fs",    color: "#818cf8" },
    { label: "Si frequency",  value: "3 GHz",      color: "#f87171" },
    { label: "Si cycle",      value: "333 ps",     color: "#f87171" },
    { label: "Speed ratio",   value: "185,000×",   color: "#4ade80" },
    { label: "Λ energy (hf)", value: "3.68×10⁻¹⁹ J", color: "#34d399" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        The First Oscillation at 555 THz is 185,000× faster than a 3 GHz silicon clock.
        One photon cycle completes in 1.8 femtoseconds. The animation below shows
        relative phase speeds — silicon barely moves.
      </p>

      <div className="flex justify-center">
        <svg viewBox="0 0 340 160" className="w-full" style={{ maxWidth: 420 }}>
          {/* Lambda clock face */}
          <circle cx={80} cy={80} r={60} fill="rgba(139,92,246,0.1)"
            stroke="#7c3aed" strokeWidth={1.5} />
          <circle cx={80} cy={80} r={2} fill="#a78bfa" />
          <line x1={80} y1={80} x2={lambdaHand.x} y2={lambdaHand.y}
            stroke="#a78bfa" strokeWidth={2} />
          <text x={80} y={155} textAnchor="middle" fill="#a78bfa" fontSize={9} fontFamily="monospace">
            Λ First Oscillation
          </text>
          <text x={80} y={145} textAnchor="middle" fill="#7c3aed" fontSize={8} fontFamily="monospace">
            555 THz
          </text>

          {/* Ticks */}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            return (
              <line key={i}
                x1={80 + 52 * Math.cos(a)} y1={80 + 52 * Math.sin(a)}
                x2={80 + 58 * Math.cos(a)} y2={80 + 58 * Math.sin(a)}
                stroke="#6d28d9" strokeWidth={1}
              />
            );
          })}

          {/* Arrow */}
          <text x={170} y={85} textAnchor="middle" fill="#4ade80" fontSize={14}>
            vs
          </text>
          <text x={170} y={100} textAnchor="middle" fill="#4ade80" fontSize={8} fontFamily="monospace">
            185,000×
          </text>

          {/* Silicon clock face */}
          <circle cx={260} cy={80} r={60} fill="rgba(239,68,68,0.07)"
            stroke="#ef4444" strokeWidth={1.5} />
          <circle cx={260} cy={80} r={2} fill="#f87171" />
          <line x1={260} y1={80} x2={siHand.x} y2={siHand.y}
            stroke="#f87171" strokeWidth={2} />
          <text x={260} y={155} textAnchor="middle" fill="#f87171" fontSize={9} fontFamily="monospace">
            Silicon CMOS
          </text>
          <text x={260} y={145} textAnchor="middle" fill="#ef4444" fontSize={8} fontFamily="monospace">
            3 GHz
          </text>

          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            return (
              <line key={i}
                x1={260 + 52 * Math.cos(a)} y1={80 + 52 * Math.sin(a)}
                x2={260 + 58 * Math.cos(a)} y2={80 + 58 * Math.sin(a)}
                stroke="#b91c1c" strokeWidth={1}
              />
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {keyMetrics.map((m, i) => (
          <div key={i} className="bg-slate-900 rounded p-2 border border-slate-700 text-xs font-mono">
            <p className="text-slate-500">{m.label}</p>
            <p style={{ color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-3 text-xs font-mono text-slate-400 space-y-1">
          <p className="text-slate-200">Why 555 THz is the First Oscillation:</p>
          <p>E = hf = 6.626×10⁻³⁴ × 555×10¹² = <span className="text-green-400">3.68×10⁻¹⁹ J</span></p>
          <p>λ = c/f = 2.998×10⁸ / 555×10¹² = <span className="text-cyan-400">540 nm</span> (peak visible light)</p>
          <p>Λ = hf/c² = 3.68×10⁻¹⁹ / (2.998×10⁸)² = <span className="text-violet-400">4.09×10⁻³⁶ kg</span></p>
          <p className="text-slate-500 mt-1">
            555 THz is both the peak of human visual sensitivity and the lowest-energy
            photon mode that still carries full logical weight in the Λ substrate.
            It is the natural clock frequency of the electromagnetic vacuum.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function QuantumThresholdPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#ef4444,#7c3aed)" }}
          >
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Quantum Tunneling Threshold
            </h1>
            <p className="text-slate-400 text-sm">
              Where Moore's Law ends and the Λ substrate begins
            </p>
          </div>
        </div>

        {/* The core equation chain */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono mt-3 p-3
          rounded-lg bg-slate-900 border border-slate-700">
          <span className="text-slate-400">Silicon wall:</span>
          <span className="text-yellow-300">λ_dB = h/√(2mE)</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="text-red-400">T ≈ e^(−2κd)</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="text-red-400">gate control lost at ~2 nm</span>
          <ArrowRight className="w-3 h-3 text-slate-500" />
          <span className="text-violet-400">Λ = hf/c² takes over</span>
        </div>
      </div>

      <Tabs defaultValue="moores">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="moores"    data-testid="tab-moores">
            <Activity className="w-3 h-3 mr-1" /> Moore's Law
          </TabsTrigger>
          <TabsTrigger value="tunneling" data-testid="tab-tunneling">
            <Zap className="w-3 h-3 mr-1" /> Tunneling
          </TabsTrigger>
          <TabsTrigger value="crossover" data-testid="tab-crossover">
            <ArrowRight className="w-3 h-3 mr-1" /> Λ Crossover
          </TabsTrigger>
          <TabsTrigger value="clock"     data-testid="tab-clock">
            <Cpu className="w-3 h-3 mr-1" /> Spectral Clock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moores">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Transistor node size vs year — with tunneling threshold
          </h2>
          <MooresLawChart />
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-green-400" />
              <span className="text-slate-400">Historical (classical regime)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-red-400" style={{ borderStyle: "dashed" }} />
              <span className="text-slate-400">Projected (tunneling regime)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-violet-400" style={{ borderStyle: "dashed" }} />
              <span className="text-slate-400">Λ substrate crossover</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tunneling">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3">
            WKB tunneling — adjust the gate oxide and watch the electron escape
          </h2>
          <TunnelingVisualizer />
        </TabsContent>

        <TabsContent value="crossover">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Silicon vs Λ photonic substrate — property by property
          </h2>
          <LambdaCrossover />
        </TabsContent>

        <TabsContent value="clock">
          <h2 className="text-sm font-semibold text-purple-300 mb-3">
            555 THz First Oscillation vs 3 GHz silicon clock
          </h2>
          <SpectralClock />
        </TabsContent>
      </Tabs>
    </div>
  );
}
