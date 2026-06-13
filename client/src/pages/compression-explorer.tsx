import { useState, useRef, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import { ArrowLeft, Zap, Activity, Layers } from "lucide-react";

const H_PLANCK = 6.626e-34, C = 3e8, K_B = 1.380649e-23;
const PLANCK_FREQ = 1.855e43; // Hz — Planck frequency
const PLANCK_NM = C / PLANCK_FREQ * 1e9; // theoretical — near zero

function visNmToColor(nm: number): string {
  if (nm < 380) return "#1a0033";
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  if (nm < 780) return "#ff3300";
  return "#330000";
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
function calcLambda(nm: number) {
  const lam = nm * 1e-9;
  const f = C / lam;
  const E = H_PLANCK * f;
  const mass = E / (C * C);
  return { f, E, mass, lam };
}

const BAND_RANGES: Record<string, [number, number]> = {
  SYSTEM: [380, 450], AUTH: [450, 495], STREAM: [495, 520],
  LOGIC: [520, 565], INTERFACE: [565, 590], EVENT: [590, 625], STORAGE: [625, 780],
};
function calcBoltzmann(nm: number, band: string) {
  const [bMin, bMax] = BAND_RANGES[band] ?? [380, 780];
  const wdmStep = 400 / 256;
  const wdmChannels = Math.max(1, Math.floor((bMax - bMin) / wdmStep));
  const W = wdmChannels * 50 * 2;
  const S = K_B * Math.log(W);
  const S_max = K_B * Math.log(256 * 50 * 2);
  return {
    W,
    S: S.toExponential(3),
    Sraw: S,
    wdmChannels,
    Snorm: parseFloat((S / S_max).toFixed(4)),
  };
}

const BANDS = [
  { label: "SYSTEM", min: 380, max: 449, color: "#6600cc" },
  { label: "AUTH", min: 450, max: 494, color: "#0044ff" },
  { label: "STREAM", min: 495, max: 519, color: "#00aaff" },
  { label: "LOGIC", min: 520, max: 564, color: "#00cc44" },
  { label: "INTERFACE", min: 565, max: 589, color: "#aacc00" },
  { label: "EVENT", min: 590, max: 624, color: "#ffaa00" },
  { label: "STORAGE", min: 625, max: 780, color: "#ff3300" },
];

const LANDMARKS = [
  { nm: 380, label: "UV boundary", note: "Minimum visible λ · Highest Λ mass in visible range" },
  { nm: 420, label: "Λ onset", note: "Compression state threshold · Theory of Compression States" },
  { nm: 468, label: "NexusOS Kernel", note: "Ψ(22,45,H) · KERNEL-band · AUTH authority" },
  { nm: 520, label: "Reference λ", note: "Green standard · fee multiplier = 1.0× (baseline)" },
  { nm: 578, label: "Nexus channel", note: "Ψ(126,0,H) · 0.9695× fee multiplier · USER band" },
  { nm: 737, label: "Genesis Ψ", note: "Ψ(228,45,H) · Λ genesis fingerprint" },
  { nm: 780, label: "IR boundary", note: "Maximum visible λ · Minimum Λ mass in visible range" },
];

const WIDTH = 820, HEIGHT = 340;
const NM_MIN = 380, NM_MAX = 780;
const MARGIN = { left: 60, right: 20, top: 20, bottom: 45 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function nmToX(nm: number) {
  return MARGIN.left + ((nm - NM_MIN) / (NM_MAX - NM_MIN)) * PLOT_W;
}
function massToY(mass: number, massMin: number, massMax: number) {
  const t = (mass - massMin) / (massMax - massMin);
  return MARGIN.top + PLOT_H - t * PLOT_H;
}

export default function CompressionExplorerPage() {
  usePageMeta({
    title: "Compression Explorer — Interactive Λ=hf/c² Curve Visualisation",
    description: "Interactive SVG visualisation of the Λ=hf/c² compression curve. Authority band overlays, photon energy, compression mass, fee multiplier, normalized Λ, and Boltzmann entropy across the full visible spectrum.",
    canonical: "https://nexusos.replit.app/compression-explorer",
    ogTitle: "Compression Explorer — Λ=hf/c² Visualisation",
    ogDescription: "Interactive compression curve: authority bands, photon energy, Boltzmann entropy, fee multipliers. The physics of NexusOS, rendered across 380–780nm.",
    twitterTitle: "Compression Explorer — Λ=hf/c² Live",
    twitterDescription: "Interactive Λ=hf/c² compression curve. Authority bands, photon energies, fee multipliers. NexusOS physics, live.",
  });
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverNm, setHoverNm] = useState<number | null>(null);
  const [selectedNm, setSelectedNm] = useState<number>(520);
  const [sliderNm, setSliderNm] = useState<number>(520);

  // Build curve points
  const points: { nm: number; mass: number }[] = [];
  for (let nm = NM_MIN; nm <= NM_MAX; nm += 1) {
    points.push({ nm, mass: calcLambda(nm).mass });
  }
  const masses = points.map(p => p.mass);
  const massMin = Math.min(...masses);
  const massMax = Math.max(...masses);

  const pathD = points.map((p, i) => {
    const x = nmToX(p.nm);
    const y = massToY(p.mass, massMin, massMax);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const fillD = pathD + ` L${nmToX(NM_MAX).toFixed(1)},${(MARGIN.top + PLOT_H).toFixed(1)} L${nmToX(NM_MIN).toFixed(1)},${(MARGIN.top + PLOT_H).toFixed(1)} Z`;

  function getPhysics(nm: number) {
    const { f, E, mass } = calcLambda(nm);
    const band = nmToBand(nm);
    const boltz = calcBoltzmann(nm, band);
    return {
      f: (f / 1e12).toFixed(2),
      E: E.toExponential(3),
      mass: mass.toExponential(3),
      band,
      feeMulti: ((520 / nm) * 1.0).toFixed(4),
      normalizedMass: ((mass - massMin) / (massMax - massMin) * 100).toFixed(1),
      boltz,
    };
  }

  const activeNm = hoverNm ?? sliderNm;
  const physics = getPhysics(activeNm);
  const activeX = nmToX(activeNm);
  const activeY = massToY(calcLambda(activeNm).mass, massMin, massMax);

  function handleSvgMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const nm = NM_MIN + ((x - MARGIN.left) / PLOT_W) * (NM_MAX - NM_MIN);
    if (nm >= NM_MIN && nm <= NM_MAX) setHoverNm(parseFloat(nm.toFixed(1)));
  }
  function handleSvgLeave() { setHoverNm(null); }
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const nm = NM_MIN + ((x - MARGIN.left) / PLOT_W) * (NM_MAX - NM_MIN);
    if (nm >= NM_MIN && nm <= NM_MAX) { setSelectedNm(parseFloat(nm.toFixed(1))); setSliderNm(parseFloat(nm.toFixed(1))); }
  }

  const refPhysics = getPhysics(520);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/nexus-command">
          <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
        </Link>
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-orange-400" />
          <span className="text-sm font-bold tracking-wider text-orange-400">COMPRESSION STATE EXPLORER</span>
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
        </div>
        <span className="text-white/20 text-[10px]">Theory of Compression States · Λ=hf/c² · first unobserved oscillation</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Theory header */}
        <div className="border border-orange-400/15 rounded-xl p-5" style={{ background: "rgba(251,146,60,0.03)" }}>
          <div className="grid grid-cols-3 gap-6 text-[10px]">
            <div>
              <div className="text-orange-400/60 font-bold mb-2 flex items-center gap-2"><Zap size={10} /> First Oscillation</div>
              <div className="text-white/30 leading-relaxed">The universe's evolution began from the <span className="text-white/50">first unobserved oscillation</span>. This oscillation at the Planck frequency defines the maximum compression state. Every subsequent wavelength represents a specific compression state — longer λ = lower energy = less compressed.</div>
            </div>
            <div>
              <div className="text-orange-400/60 font-bold mb-2 flex items-center gap-2"><Activity size={10} /> Λ = hf/c²</div>
              <div className="text-white/30 leading-relaxed">Planck energy (E=hf) compressed into mass: <span className="text-white/50">Λ = hf/c²</span>. At higher frequency (shorter λ), the photon carries more energy, and thus maps to a larger compression-state mass. SYSTEM band (380–450nm) carries ~1.4× the compression of the reference green (520nm).</div>
            </div>
            <div>
              <div className="text-orange-400/60 font-bold mb-2 flex items-center gap-2"><Layers size={10} /> Authority from Physics</div>
              <div className="text-white/30 leading-relaxed">Spectral authority is not assigned — it is <span className="text-white/50">derived from compression state</span>. Closer to the Planck frequency = higher energy = higher authority = higher fee. SYSTEM pays ~1.4× base fee. STORAGE pays ~0.65× base fee.</div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <span className="text-white/30 text-[9px] uppercase tracking-widest">Λ=hf/c² Compression Curve · 380nm → 780nm visible spectrum</span>
            <span className="text-orange-400/50 text-[9px]">hover or drag slider to explore</span>
          </div>
          <div className="p-4">
            <svg ref={svgRef} width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              onMouseMove={handleSvgMove} onMouseLeave={handleSvgLeave} onClick={handleSvgClick}
              className="cursor-crosshair select-none" style={{ maxWidth: "100%" }}>

              {/* Band overlays */}
              {BANDS.map(b => (
                <rect key={b.label}
                  x={nmToX(b.min)} y={MARGIN.top}
                  width={nmToX(b.max) - nmToX(b.min)} height={PLOT_H}
                  fill={b.color} opacity={0.06}
                />
              ))}

              {/* Y grid */}
              {[0, 25, 50, 75, 100].map(pct => {
                const mass = massMin + (pct / 100) * (massMax - massMin);
                const y = massToY(mass, massMin, massMax);
                return (
                  <g key={pct}>
                    <line x1={MARGIN.left} y1={y} x2={MARGIN.left + PLOT_W} y2={y} stroke="rgba(255,255,255,0.04)" />
                    <text x={MARGIN.left - 5} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={8}>{pct}%</text>
                  </g>
                );
              })}

              {/* X axis */}
              {[380, 450, 495, 520, 565, 590, 625, 700, 780].map(nm => (
                <g key={nm}>
                  <line x1={nmToX(nm)} y1={MARGIN.top + PLOT_H} x2={nmToX(nm)} y2={MARGIN.top + PLOT_H + 4} stroke="rgba(255,255,255,0.2)" />
                  <text x={nmToX(nm)} y={MARGIN.top + PLOT_H + 14} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={8}>{nm}</text>
                </g>
              ))}

              {/* Fill area under curve */}
              <path d={fillD} fill="url(#curveGrad)" opacity={0.2} />
              <defs>
                <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6600cc" />
                  <stop offset="18%" stopColor="#0044ff" />
                  <stop offset="30%" stopColor="#00aaff" />
                  <stop offset="47%" stopColor="#00cc44" />
                  <stop offset="63%" stopColor="#aacc00" />
                  <stop offset="74%" stopColor="#ffaa00" />
                  <stop offset="100%" stopColor="#ff3300" />
                </linearGradient>
              </defs>

              {/* Main curve */}
              <path d={pathD} fill="none" stroke="url(#curveGrad)" strokeWidth={2} />

              {/* Axis labels */}
              <text x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 5} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={9}>wavelength λ (nm)</text>
              <text x={12} y={MARGIN.top + PLOT_H / 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={9} transform={`rotate(-90, 12, ${MARGIN.top + PLOT_H / 2})`}>Λ mass (normalized)</text>

              {/* Band labels */}
              {BANDS.map(b => {
                const midX = (nmToX(b.min) + nmToX(b.max)) / 2;
                return <text key={b.label} x={midX} y={MARGIN.top + 12} textAnchor="middle" fill={b.color} fontSize={7} opacity={0.7}>{b.label}</text>;
              })}

              {/* Landmark lines */}
              {LANDMARKS.filter(l => l.nm >= NM_MIN && l.nm <= NM_MAX).map(l => {
                const x = nmToX(l.nm);
                const { mass } = calcLambda(l.nm);
                const y = massToY(mass, massMin, massMax);
                return (
                  <g key={l.nm}>
                    <line x1={x} y1={y} x2={x} y2={MARGIN.top + PLOT_H} stroke={visNmToColor(l.nm)} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />
                    <circle cx={x} cy={y} r={3} fill={visNmToColor(l.nm)} opacity={0.8} />
                  </g>
                );
              })}

              {/* Active cursor */}
              {activeNm >= NM_MIN && activeNm <= NM_MAX && (
                <g>
                  <line x1={activeX} y1={MARGIN.top} x2={activeX} y2={MARGIN.top + PLOT_H} stroke={visNmToColor(activeNm)} strokeWidth={1} opacity={0.8} />
                  <circle cx={activeX} cy={activeY} r={5} fill={visNmToColor(activeNm)} />
                  <circle cx={activeX} cy={activeY} r={8} fill="none" stroke={visNmToColor(activeNm)} strokeWidth={1} opacity={0.4} />
                  <rect x={activeX + 8} y={activeY - 28} width={90} height={24} rx={3} fill="rgba(0,0,0,0.8)" stroke={visNmToColor(activeNm)} strokeWidth={0.5} opacity={0.9} />
                  <text x={activeX + 13} y={activeY - 18} fill={visNmToColor(activeNm)} fontSize={8} fontWeight="bold">{activeNm}nm · {physics.band}</text>
                  <text x={activeX + 13} y={activeY - 8} fill="rgba(255,255,255,0.4)" fontSize={7}>Λ = {physics.normalizedMass}%</text>
                </g>
              )}
            </svg>

            {/* Slider */}
            <div className="px-2 mt-2">
              <input type="range" min={NM_MIN} max={NM_MAX} step={0.5} value={sliderNm}
                onChange={e => { setSliderNm(parseFloat(e.target.value)); setHoverNm(null); }}
                className="w-full accent-orange-400"
                style={{ background: "transparent" }}
                data-testid="slider-wavelength"
              />
            </div>
          </div>
        </div>

        {/* State readout */}
        <div className="grid grid-cols-4 gap-4">
          {/* Active state panel */}
          <div className="col-span-2 border rounded-xl p-5 transition-all" style={{ borderColor: visNmToColor(activeNm) + "40", background: visNmToColor(activeNm) + "06" }}>
            <div className="text-white/30 text-[9px] uppercase tracking-widest mb-4">Compression State at {activeNm}nm</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Wavelength λ", value: `${activeNm} nm`, col: visNmToColor(activeNm) },
                { label: "Band", value: physics.band, col: visNmToColor(activeNm) },
                { label: "Frequency f", value: `${physics.f} THz`, col: "#a78bfa" },
                { label: "Photon energy E=hf", value: physics.E + " J", col: "#f59e0b" },
                { label: "Compression mass Λ", value: physics.mass + " kg", col: "#f97316" },
                { label: "Normalized Λ", value: `${physics.normalizedMass}%`, col: "#f97316" },
                { label: "Fee multiplier", value: physics.feeMulti + "×", col: "#16a34a" },
                { label: "vs GREEN (520nm)", value: parseFloat(physics.feeMulti) > 1 ? `+${((parseFloat(physics.feeMulti) - 1) * 100).toFixed(1)}% higher` : `${((1 - parseFloat(physics.feeMulti)) * 100).toFixed(1)}% lower`, col: "#16a34a" },
              ].map(({ label, value, col }) => (
                <div key={label} className="border border-white/5 rounded-lg px-3 py-2">
                  <div className="text-[7px] text-white/20 mb-0.5">{label}</div>
                  <div className="text-[10px] font-bold" style={{ color: col }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Boltzmann entropy block */}
            <div className="mt-3 border border-orange-400/15 rounded-lg px-4 py-3" style={{ background: "rgba(251,146,60,0.04)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[7px] text-orange-400/60 font-bold uppercase tracking-widest">Boltzmann Entropy — S = k·ln(W)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[7px] text-white/20 mb-0.5">W (microstates)</div>
                  <div className="text-[10px] font-bold text-orange-400">{physics.boltz.W.toLocaleString()}</div>
                  <div className="text-[7px] text-white/15">{physics.boltz.wdmChannels} WDM × 50 OAM × 2 Pol</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/20 mb-0.5">S = k·ln(W)</div>
                  <div className="text-[10px] font-bold text-orange-300">{physics.boltz.S} J/K</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/20 mb-1">S / S_max</div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-0.5">
                    <div className="h-full rounded-full bg-orange-400" style={{ width: `${physics.boltz.Snorm * 100}%` }} />
                  </div>
                  <div className="text-[8px] font-bold text-orange-400">{(physics.boltz.Snorm * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-[7px] text-white/15 mt-2">
                Fewer WDM channels per band → fewer degenerate states → lower entropy → more compressed. SYSTEM band lowest S, STORAGE highest S.
              </div>
            </div>
          </div>

          {/* Landmarks */}
          <div className="col-span-2 border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="text-white/25 text-[9px] uppercase tracking-widest mb-4">Key Spectral Landmarks</div>
            <div className="space-y-2">
              {LANDMARKS.map(l => {
                const lPhysics = getPhysics(l.nm);
                const col = visNmToColor(l.nm);
                const isActive = Math.abs(activeNm - l.nm) < 5;
                return (
                  <button key={l.nm}
                    onClick={() => { setSliderNm(l.nm); setHoverNm(null); }}
                    className={`w-full flex items-start gap-3 border rounded-lg px-3 py-2 text-left transition-all ${isActive ? "border-white/20" : "border-white/5 hover:border-white/15"}`}
                    style={{ background: isActive ? col + "10" : "transparent" }}
                    data-testid={`landmark-${l.nm}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: col }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold" style={{ color: col }}>{l.nm}nm</span>
                        <span className="text-[8px] text-white/40">{l.label}</span>
                      </div>
                      <div className="text-[8px] text-white/20 mt-0.5">{l.note}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[8px] font-bold" style={{ color: col }}>Λ={lPhysics.normalizedMass}%</div>
                      <div className="text-[7px] text-white/20">{lPhysics.feeMulti}× fee</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Reference equations */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-white/8 rounded-xl px-6 py-4 text-center" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="text-white/40 text-lg font-bold tracking-wider mb-1">Λ = hf / c²</div>
            <div className="text-white/20 text-[10px] space-x-4">
              <span>h = 6.626×10⁻³⁴ J·s (Planck constant)</span>
              <span>f = c/λ</span>
              <span>c = 3×10⁸ m/s</span>
            </div>
            <div className="text-white/10 text-[9px] mt-2">
              At λ=520nm: f={refPhysics.f}THz · E={refPhysics.E}J · Λ={refPhysics.mass}kg · fee=1.0000×
            </div>
          </div>
          <div className="border border-orange-400/10 rounded-xl px-6 py-4 text-center" style={{ background: "rgba(251,146,60,0.02)" }}>
            <div className="text-orange-400/50 text-lg font-bold tracking-wider mb-1">S = k · ln(W)</div>
            <div className="text-white/20 text-[10px] space-x-4">
              <span>k = 1.381×10⁻²³ J/K (Boltzmann constant)</span>
              <span>W = Ψ channel microstates</span>
            </div>
            <div className="text-white/10 text-[9px] mt-2">
              At λ=520nm ({refPhysics.band}): W={refPhysics.boltz.W.toLocaleString()} states · S={refPhysics.boltz.S} J/K · {(refPhysics.boltz.Snorm * 100).toFixed(1)}% of S_max
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
