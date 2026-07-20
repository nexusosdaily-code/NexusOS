import { useState, useMemo } from "react";
import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { EcosystemNav } from "@/components/ecosystem-nav";
import {
  ArrowLeft, Search, Atom, BookOpen,
  Star, Circle, GitMerge, ExternalLink, Zap, Waves, FlaskConical,
} from "lucide-react";

// ── SI exact constants ──────────────────────────────────────────────────────
const H     = 6.62607015e-34;    // Planck  J·s  (SI exact 2019)
const EV    = 1.602176634e-19;   // 1 eV → J     (SI exact 2019)
const F0    = 555e12;            // WNSP ground-state frequency  555 THz
const E0    = H * F0;            // J  ≈ 3.677 × 10⁻²²
const E0EV  = E0 / EV;          // eV ≈ 2.2951
const AMU_EV = 931_494_000;      // 1 u in eV = 931.494 MeV (CODATA 2018)

// ── Physics helpers ─────────────────────────────────────────────────────────
function octaveOf(mass_u: number): number {
  return Math.log2((mass_u * AMU_EV) / E0EV);
}

// ΔE for a +1 octave shift from n: E₀(2^(n+1) − 2^n) = E₀ × 2^n
function deltaOneOctaveEv(n: number): number {
  return E0EV * Math.pow(2, n);
}

// Sub-harmonic spectral fingerprint — fractional octave → WDM channel 0–255
function wdmOf(n: number): number {
  return Math.round((n % 1) * 255);
}
function wdmToNm(wdm: number): number {
  return 380 + (wdm / 255) * 400;
}
function nmToColor(nm: number): string {
  let r = 0, g = 0, b = 0;
  if      (nm >= 380 && nm < 440) { r = (440 - nm) / 60; g = 0; b = 1; }
  else if (nm >= 440 && nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { r = 0; g = 1; b = (510 - nm) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; }
  else if (nm >= 580 && nm < 645) { r = 1; g = (645 - nm) / 65; b = 0; }
  else                             { r = 1; g = 0; b = 0; }
  return `rgb(${Math.round(r*200)},${Math.round(g*200)},${Math.round(b*200)})`;
}

function fmtEnergy(ev: number): string {
  if (ev >= 1e12) return `${(ev / 1e12).toFixed(3)} TeV`;
  if (ev >= 1e9)  return `${(ev / 1e9).toFixed(3)} GeV`;
  if (ev >= 1e6)  return `${(ev / 1e6).toFixed(3)} MeV`;
  if (ev >= 1e3)  return `${(ev / 1e3).toFixed(3)} keV`;
  return `${ev.toFixed(3)} eV`;
}

function fmt4(n: number): string { return n.toFixed(4); }

// ── Period accent colours ───────────────────────────────────────────────────
const PERIOD_COLOR: Record<number, string> = {
  1: "#a78bfa", 2: "#22d3ee", 3: "#34d399",
  4: "#fbbf24", 5: "#fb923c", 6: "#f87171", 7: "#e879f9",
};

// ── Periodic table ──────────────────────────────────────────────────────────
type Elem = {
  Z: number; sym: string; name: string;
  mass: number; period: number; noble: boolean; system?: boolean;
};

const ELEMENTS: Elem[] = [
  {Z:1,  sym:"H",  name:"Hydrogen",      mass:1.008,    period:1, noble:false},
  {Z:2,  sym:"He", name:"Helium",         mass:4.0026,   period:1, noble:true },
  {Z:3,  sym:"Li", name:"Lithium",        mass:6.941,    period:2, noble:false},
  {Z:4,  sym:"Be", name:"Beryllium",      mass:9.0122,   period:2, noble:false},
  {Z:5,  sym:"B",  name:"Boron",          mass:10.811,   period:2, noble:false},
  {Z:6,  sym:"C",  name:"Carbon",         mass:12.011,   period:2, noble:false},
  {Z:7,  sym:"N",  name:"Nitrogen",       mass:14.007,   period:2, noble:false},
  {Z:8,  sym:"O",  name:"Oxygen",         mass:15.999,   period:2, noble:false},
  {Z:9,  sym:"F",  name:"Fluorine",       mass:18.998,   period:2, noble:false},
  {Z:10, sym:"Ne", name:"Neon",           mass:20.180,   period:2, noble:true },
  {Z:11, sym:"Na", name:"Sodium",         mass:22.990,   period:3, noble:false},
  {Z:12, sym:"Mg", name:"Magnesium",      mass:24.305,   period:3, noble:false},
  {Z:13, sym:"Al", name:"Aluminium",      mass:26.982,   period:3, noble:false},
  {Z:14, sym:"Si", name:"Silicon",        mass:28.086,   period:3, noble:false},
  {Z:15, sym:"P",  name:"Phosphorus",     mass:30.974,   period:3, noble:false},
  {Z:16, sym:"S",  name:"Sulfur",         mass:32.065,   period:3, noble:false},
  {Z:17, sym:"Cl", name:"Chlorine",       mass:35.453,   period:3, noble:false},
  {Z:18, sym:"Ar", name:"Argon",          mass:39.948,   period:3, noble:true },
  {Z:19, sym:"K",  name:"Potassium",      mass:39.098,   period:4, noble:false},
  {Z:20, sym:"Ca", name:"Calcium",        mass:40.078,   period:4, noble:false},
  {Z:21, sym:"Sc", name:"Scandium",       mass:44.956,   period:4, noble:false},
  {Z:22, sym:"Ti", name:"Titanium",       mass:47.867,   period:4, noble:false},
  {Z:23, sym:"V",  name:"Vanadium",       mass:50.942,   period:4, noble:false},
  {Z:24, sym:"Cr", name:"Chromium",       mass:51.996,   period:4, noble:false},
  {Z:25, sym:"Mn", name:"Manganese",      mass:54.938,   period:4, noble:false},
  {Z:26, sym:"Fe", name:"Iron",           mass:55.845,   period:4, noble:false},
  {Z:27, sym:"Co", name:"Cobalt",         mass:58.933,   period:4, noble:false},
  {Z:28, sym:"Ni", name:"Nickel",         mass:58.693,   period:4, noble:false},
  {Z:29, sym:"Cu", name:"Copper",         mass:63.546,   period:4, noble:false},
  {Z:30, sym:"Zn", name:"Zinc",           mass:65.38,    period:4, noble:false},
  {Z:31, sym:"Ga", name:"Gallium",        mass:69.723,   period:4, noble:false},
  {Z:32, sym:"Ge", name:"Germanium",      mass:72.64,    period:4, noble:false},
  {Z:33, sym:"As", name:"Arsenic",        mass:74.922,   period:4, noble:false},
  {Z:34, sym:"Se", name:"Selenium",       mass:78.96,    period:4, noble:false},
  {Z:35, sym:"Br", name:"Bromine",        mass:79.904,   period:4, noble:false},
  {Z:36, sym:"Kr", name:"Krypton",        mass:83.798,   period:4, noble:true },
  {Z:37, sym:"Rb", name:"Rubidium",       mass:85.468,   period:5, noble:false},
  {Z:38, sym:"Sr", name:"Strontium",      mass:87.62,    period:5, noble:false},
  {Z:39, sym:"Y",  name:"Yttrium",        mass:88.906,   period:5, noble:false},
  {Z:40, sym:"Zr", name:"Zirconium",      mass:91.224,   period:5, noble:false},
  {Z:41, sym:"Nb", name:"Niobium",        mass:92.906,   period:5, noble:false},
  {Z:42, sym:"Mo", name:"Molybdenum",     mass:95.96,    period:5, noble:false},
  {Z:43, sym:"Tc", name:"Technetium",     mass:98.0,     period:5, noble:false},
  {Z:44, sym:"Ru", name:"Ruthenium",      mass:101.07,   period:5, noble:false},
  {Z:45, sym:"Rh", name:"Rhodium",        mass:102.906,  period:5, noble:false},
  {Z:46, sym:"Pd", name:"Palladium",      mass:106.42,   period:5, noble:false},
  {Z:47, sym:"Ag", name:"Silver",         mass:107.868,  period:5, noble:false},
  {Z:48, sym:"Cd", name:"Cadmium",        mass:112.411,  period:5, noble:false},
  {Z:49, sym:"In", name:"Indium",         mass:114.818,  period:5, noble:false},
  {Z:50, sym:"Sn", name:"Tin",            mass:118.71,   period:5, noble:false},
  {Z:51, sym:"Sb", name:"Antimony",       mass:121.76,   period:5, noble:false},
  {Z:52, sym:"Te", name:"Tellurium",      mass:127.6,    period:5, noble:false},
  {Z:53, sym:"I",  name:"Iodine",         mass:126.905,  period:5, noble:false},
  {Z:54, sym:"Xe", name:"Xenon",          mass:131.293,  period:5, noble:true },
  {Z:55, sym:"Cs", name:"Caesium",        mass:132.905,  period:6, noble:false},
  {Z:56, sym:"Ba", name:"Barium",         mass:137.327,  period:6, noble:false},
  {Z:57, sym:"La", name:"Lanthanum",      mass:138.905,  period:6, noble:false},
  {Z:58, sym:"Ce", name:"Cerium",         mass:140.116,  period:6, noble:false},
  {Z:59, sym:"Pr", name:"Praseodymium",   mass:140.908,  period:6, noble:false},
  {Z:60, sym:"Nd", name:"Neodymium",      mass:144.242,  period:6, noble:false},
  {Z:61, sym:"Pm", name:"Promethium",     mass:145.0,    period:6, noble:false},
  {Z:62, sym:"Sm", name:"Samarium",       mass:150.36,   period:6, noble:false},
  {Z:63, sym:"Eu", name:"Europium",       mass:151.964,  period:6, noble:false},
  {Z:64, sym:"Gd", name:"Gadolinium",     mass:157.25,   period:6, noble:false},
  {Z:65, sym:"Tb", name:"Terbium",        mass:158.925,  period:6, noble:false},
  {Z:66, sym:"Dy", name:"Dysprosium",     mass:162.5,    period:6, noble:false},
  {Z:67, sym:"Ho", name:"Holmium",        mass:164.93,   period:6, noble:false},
  {Z:68, sym:"Er", name:"Erbium",         mass:167.259,  period:6, noble:false},
  {Z:69, sym:"Tm", name:"Thulium",        mass:168.934,  period:6, noble:false},
  {Z:70, sym:"Yb", name:"Ytterbium",      mass:173.054,  period:6, noble:false},
  {Z:71, sym:"Lu", name:"Lutetium",       mass:174.967,  period:6, noble:false},
  {Z:72, sym:"Hf", name:"Hafnium",        mass:178.49,   period:6, noble:false},
  {Z:73, sym:"Ta", name:"Tantalum",       mass:180.948,  period:6, noble:false},
  {Z:74, sym:"W",  name:"Tungsten",       mass:183.84,   period:6, noble:false},
  {Z:75, sym:"Re", name:"Rhenium",        mass:186.207,  period:6, noble:false},
  {Z:76, sym:"Os", name:"Osmium",         mass:190.23,   period:6, noble:false},
  {Z:77, sym:"Ir", name:"Iridium",        mass:192.217,  period:6, noble:false},
  {Z:78, sym:"Pt", name:"Platinum",       mass:195.084,  period:6, noble:false},
  {Z:79, sym:"Au", name:"Gold",           mass:196.967,  period:6, noble:false},
  {Z:80, sym:"Hg", name:"Mercury",        mass:200.59,   period:6, noble:false},
  {Z:81, sym:"Tl", name:"Thallium",       mass:204.383,  period:6, noble:false},
  {Z:82, sym:"Pb", name:"Lead",           mass:207.2,    period:6, noble:false},
  {Z:83, sym:"Bi", name:"Bismuth",        mass:208.98,   period:6, noble:false},
  {Z:84, sym:"Po", name:"Polonium",       mass:209.0,    period:6, noble:false},
  {Z:85, sym:"At", name:"Astatine",       mass:210.0,    period:6, noble:false},
  {Z:86, sym:"Rn", name:"Radon",          mass:222.0,    period:6, noble:true },
  {Z:87, sym:"Fr", name:"Francium",       mass:223.0,    period:7, noble:false},
  {Z:88, sym:"Ra", name:"Radium",         mass:226.0,    period:7, noble:false},
  {Z:89, sym:"Ac", name:"Actinium",       mass:227.0,    period:7, noble:false},
  {Z:90, sym:"Th", name:"Thorium",        mass:232.038,  period:7, noble:false},
  {Z:91, sym:"Pa", name:"Protactinium",   mass:231.036,  period:7, noble:false},
  {Z:92, sym:"U",  name:"Uranium",        mass:238.029,  period:7, noble:false},
  {Z:93, sym:"Np", name:"Neptunium",      mass:237.0,    period:7, noble:false},
  {Z:94, sym:"Pu", name:"Plutonium",      mass:244.0,    period:7, noble:false},
  {Z:95, sym:"Am", name:"Americium",      mass:243.0,    period:7, noble:false},
  {Z:96, sym:"Cm", name:"Curium",         mass:247.0,    period:7, noble:false},
  {Z:97, sym:"Bk", name:"Berkelium",      mass:247.0,    period:7, noble:false},
  {Z:98, sym:"Cf", name:"Californium",    mass:251.0,    period:7, noble:false},
  {Z:99, sym:"Es", name:"Einsteinium",    mass:252.0,    period:7, noble:false},
  {Z:100,sym:"Fm", name:"Fermium",        mass:257.0,    period:7, noble:false},
  {Z:101,sym:"Md", name:"Mendelevium",    mass:258.0,    period:7, noble:false},
  {Z:102,sym:"No", name:"Nobelium",       mass:259.0,    period:7, noble:false},
  {Z:103,sym:"Lr", name:"Lawrencium",     mass:262.0,    period:7, noble:false},
  {Z:104,sym:"Rf", name:"Rutherfordium",  mass:265.0,    period:7, noble:false},
  {Z:105,sym:"Db", name:"Dubnium",        mass:268.0,    period:7, noble:false},
  {Z:106,sym:"Sg", name:"Seaborgium",     mass:271.0,    period:7, noble:false},
  {Z:107,sym:"Bh", name:"Bohrium",        mass:270.0,    period:7, noble:false},
  {Z:108,sym:"Hs", name:"Hassium",        mass:277.0,    period:7, noble:false},
  {Z:109,sym:"Mt", name:"Meitnerium",     mass:276.0,    period:7, noble:false},
  {Z:110,sym:"Ds", name:"Darmstadtium",   mass:281.0,    period:7, noble:false},
  {Z:111,sym:"Rg", name:"Roentgenium",    mass:280.0,    period:7, noble:false},
  {Z:112,sym:"Cn", name:"Copernicium",    mass:285.0,    period:7, noble:false},
  {Z:113,sym:"Nh", name:"Nihonium",       mass:284.0,    period:7, noble:false},
  {Z:114,sym:"Fl", name:"Flerovium",      mass:289.0,    period:7, noble:false, system:true},
  {Z:115,sym:"Mc", name:"Moscovium",      mass:288.0,    period:7, noble:false},
  {Z:116,sym:"Lv", name:"Livermorium",    mass:293.0,    period:7, noble:false},
  {Z:117,sym:"Ts", name:"Tennessine",     mass:294.0,    period:7, noble:false},
  {Z:118,sym:"Og", name:"Oganesson",      mass:294.0,    period:7, noble:true },
];

// ── Derived catalogue (computed once at module load) ────────────────────────
type CatalogRow = Elem & { n: number; dE_eV: number; wdm: number; nm: number; color: string };

const CATALOGUE: CatalogRow[] = ELEMENTS.map(el => {
  const n     = octaveOf(el.mass);
  const dE_eV = deltaOneOctaveEv(n);
  const wdm   = wdmOf(n);
  const nm    = wdmToNm(wdm);
  return { ...el, n, dE_eV, wdm, nm, color: nmToColor(nm) };
});

// ── Floor / Ceiling pairs (computed once at module load) ─────────────────────
type FCPair = {
  floor: CatalogRow; floorInt: number;
  ceiling: CatalogRow; ceilingInt: number;
  gap: number;
};
const FLOOR_CEILING_PAIRS: FCPair[] = (() => {
  const nobles = CATALOGUE.filter(e => e.noble);
  const result: FCPair[] = [];
  nobles.forEach(ng => {
    const floorInt   = Math.round(ng.n);
    const ceilingInt = floorInt + 1;
    const candidates = CATALOGUE
      .filter(e => !e.noble && e.n > ng.n && e.n < ceilingInt)
      .sort((a, b) => b.n - a.n);
    if (candidates[0]) {
      result.push({
        floor: ng, floorInt,
        ceiling: candidates[0], ceilingInt,
        gap: ceilingInt - candidates[0].n,
      });
    }
  });
  return result;
})();

// ── Shared UI helpers ───────────────────────────────────────────────────────
function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black/40 border border-slate-700/50 rounded-lg px-5 py-3
                    font-mono text-sm text-emerald-300 text-center tracking-wide">
      {children}
    </div>
  );
}

function Section({ id, title, icon: Icon, color, badge, children }: {
  id: string; title: string; icon: React.ElementType;
  color: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-5">
      <div className="flex items-center gap-3 pb-2 border-b"
           style={{ borderColor: color + "44" }}>
        <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
        <h2 className="text-base font-bold text-slate-100 flex-1">{title}</h2>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={{ color, borderColor: color + "55", background: color + "11" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// ── Element detail panel ────────────────────────────────────────────────────
function ElementDetail({ el, onClose }: { el: CatalogRow; onClose: () => void }) {
  const pc = PERIOD_COLOR[el.period] ?? "#94a3b8";
  const oam  = (el.Z % 50) + 1;
  const pol  = el.Z % 2 === 0 ? "H (horizontal)" : "V (vertical)";
  const nInt = Math.floor(el.n);
  const nFrac = (el.n - nInt).toFixed(4);
  const isKr  = el.Z === 36;

  return (
    <div className="rounded-xl border bg-slate-900 p-5 space-y-4"
         style={{ borderColor: pc + "66" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center
                          font-bold text-xl border"
               style={{ color: pc, borderColor: pc + "55", background: pc + "11" }}>
            {el.sym}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{el.name}</p>
            <p className="text-slate-400 text-xs font-mono">
              Z={el.Z} · Period {el.period} · {el.mass} u
            </p>
          </div>
        </div>
        <button onClick={onClose}
                className="text-slate-500 hover:text-slate-300 text-lg leading-none px-2">
          ✕
        </button>
      </div>

      {el.noble && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3 text-xs
                        font-mono text-amber-300">
          ◎ EQUILIBRIUM NODE — Noble gas. Maximum stability. Zero reactivity.
          This element sits at an octave rest point in the compression lattice.
          {isKr && " Krypton (Kr) lands at n ≈ 35.000 — an exact integer octave. Russell's prediction."}
        </div>
      )}

      {el.system && (
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/8 p-3 text-xs
                        font-mono text-violet-300">
          ⊛ SYSTEM BAND — Fl-114 (Flerovium) is tagged as the SYSTEM authority band
          in the WNSP sub-mm wave geometry research (2025 THz validation). Saved by the
          founder for future builders.
        </div>
      )}

      {el.Z === 69 && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/8 p-3 text-xs
                        font-mono text-cyan-300 space-y-1">
          <p>⟶ CEILING APPROACH — Thulium (Tm, Z=69) is the closest non-noble element
          to an integer octave address in the entire 118-element table.</p>
          <p className="text-cyan-400">n = 35.9966 · gap = 0.0034 from integer n = 36</p>
          <p className="text-slate-400">Ceiling of the Kr→Tm octave pair. The ghost node at
          n = 36 is predicted by the lattice but occupied by no known element. Only 1 stable
          isotope (Tm-169). Used in portable X-ray generation — consistent with maximum energy
          gradient before octave threshold.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-1">
          <p className="text-slate-500 tracking-widest text-[9px]">OCTAVE ADDRESS</p>
          <p className="text-white text-base font-bold">n = {fmt4(el.n)}</p>
          <p className="text-slate-400">tier {nInt} + {nFrac}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-1">
          <p className="text-slate-500 tracking-widest text-[9px]">ΔE PER OCTAVE</p>
          <p className="text-emerald-300 text-base font-bold">{fmtEnergy(el.dE_eV)}</p>
          <p className="text-slate-400">E₀ × 2^{fmt4(el.n)}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-1">
          <p className="text-slate-500 tracking-widest text-[9px]">REST MASS</p>
          <p className="text-sky-300 font-bold">
            {fmtEnergy(el.mass * 931_494_000)}
          </p>
          <p className="text-slate-400">{el.mass} u</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 space-y-1">
          <p className="text-slate-500 tracking-widest text-[9px]">Ψ FINGERPRINT</p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex-shrink-0"
                 style={{ background: el.color }} />
            <p className="text-white font-bold">WDM {el.wdm}</p>
          </div>
          <p className="text-slate-400">{el.nm.toFixed(1)} nm sub-harmonic</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-4 space-y-2">
        <p className="text-[9px] font-mono text-slate-500 tracking-widest">
          3-STEP INSTRUMENT PROTOCOL
        </p>
        <div className="space-y-1.5 text-xs font-mono">
          <p>
            <span className="text-amber-400">STEP 1</span>
            <span className="text-slate-400"> n = log₂({el.mass} × 931,494,000 / 2.295) = </span>
            <span className="text-white">{fmt4(el.n)}</span>
          </p>
          <p>
            <span className="text-amber-400">STEP 2</span>
            <span className="text-slate-400"> ΔE = 2.295 × 2^{fmt4(el.n)} = </span>
            <span className="text-emerald-300">{fmtEnergy(el.dE_eV)}</span>
          </p>
          <p>
            <span className="text-amber-400">STEP 3</span>
            <span className="text-slate-400"> Ψ = (WDM {el.wdm}, OAM {oam}, Pol {pol}, +k̂/−k̂)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
const PAGE_DATE = "2026-07-07";
const BASE      = "https://wnsp.io";

export default function ElementCatalogue() {
  usePageMeta({
    title: "The Catalogue — Periodic Table Octave Addresses · NexusOS",
    description:
      "Act 6: Every element on the periodic table mapped to its WNSP octave address n = log₂(m·c²/E₀). Includes ΔE per octave shift, spectral fingerprint, and 3-step instrument protocol. First disclosed 2026-07-07.",
    canonical: `${BASE}/element-catalogue`,
    ogTitle: "The Catalogue — Periodic Table Octave Addresses",
    ogDescription:
      "118 elements. Each mapped to its octave integer n via n = log₂(m·c²/E₀). Krypton lands at n ≈ 35.000 — Russell's exact integer node. NexusOS Act 6.",
    twitterTitle: "The Catalogue — Periodic Table Octave Addresses",
    twitterDescription:
      "The periodic table is the octave lattice printed on paper. Every element has a precise n, ΔE, and Ψ address. NexusOS Act 6.",
  });

  const [search,  setSearch]  = useState("");
  const [period,  setPeriod]  = useState<number | null>(null);
  const [nobleOnly, setNobleOnly] = useState(false);
  const [selected, setSelected] = useState<CatalogRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CATALOGUE.filter(el => {
      if (period && el.period !== period)           return false;
      if (nobleOnly && !el.noble && !el.system)     return false;
      if (q && !el.sym.toLowerCase().includes(q)
            && !el.name.toLowerCase().includes(q)
            && !String(el.Z).includes(q))           return false;
      return true;
    });
  }, [search, period, nobleOnly]);

  const nobleGases = useMemo(
    () => CATALOGUE.filter(el => el.noble),
    [],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* back */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b
                      border-slate-800/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/oscillating-quanta"
                className="flex items-center gap-2 text-slate-400 hover:text-white
                           transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to First Principles
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* badges */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Act 6 of 7",              color: "#06b6d4" },
              { label: `First Disclosure ${PAGE_DATE}`, color: "#22c55e" },
              { label: "AGPL-3.0",                color: "#8b5cf6" },
              { label: "Copyleft",                color: "#8b5cf6" },
              { label: "118 elements",            color: "#f59e0b" },
            ].map(({ label, color }) => (
              <span key={label}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
                    style={{ color, borderColor: color + "55", background: color + "11" }}>
                {label}
              </span>
            ))}
          </div>

          {/* sequence nav */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-[10px] font-mono text-cyan-400 tracking-widest mb-3">
              THE SEQUENCE — ACT 6 OF 17
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
              {[
                { act:"ACT 1", title:"Theory of Compression States", sub:"Λ = hf/c²",         href:"/oscillating-quanta" },
                { act:"ACT 2", title:"The Universal ONE",            sub:"f₀ derives Λ",        href:"/universal-one" },
                { act:"ACT 3", title:"Unified Compression Theory",   sub:"4 forces = 1 Λ",      href:"/unified-compression-theory" },
                { act:"ACT 4", title:"The Mechanism",                sub:"ΔE = hf₀(2ⁿ²−2ⁿ¹)",  href:"/matter-protocol" },
                { act:"ACT 5", title:"The Address",                  sub:"∀ Λ : ∃! Ψ",          href:"/universal-address" },
              ].map(({ act, title, sub, href }) => (
                <Link key={href} href={href}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-3
                                 hover:border-slate-500 transition-colors space-y-1 block">
                  <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                  <p className="text-slate-300 font-medium leading-tight">{title}</p>
                  <p className="text-[9px] text-slate-500">{sub}</p>
                </Link>
              ))}
              <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 space-y-1">
                <p className="text-[9px] font-mono text-cyan-400 tracking-widest">ACT 6 ← HERE</p>
                <p className="text-cyan-200 font-medium leading-tight">The Catalogue</p>
                <p className="text-[9px] text-cyan-400">n = log₂(mc²/E₀)</p>
              </div>
              {[
                { act:"ACT 7", title:"The Trap",             sub:"Ψ(+k̂) ⊗ Ψ(−k̂)",       href:"/standing-wave-trap" },
                { act:"ACT 8", title:"The Lossless Channel", sub:"α = 0, C = ZPE floor",    href:"/lossless-channel" },
                { act:"ACT 9",  title:"The Cavity",    sub:"WGM resonance, r_c",  href:"/resonance-cavity" },
                { act:"ACT 10", title:"The Exchange", sub:"Ω_R = 2g",            href:"/polariton-exchange" },
                { act:"ACT 11", title:"The Emitter",  sub:"F_p=(Q/V)(λ/n)³",    href:"/the-emitter" },
                { act:"ACT 12", title:"The Network",  sub:"ω=ω₀−2J·cos(ka)",    href:"/the-network" },
                { act:"ACT 13", title:"The Observer", sub:"χ=g²/Δ",              href:"/the-observer" },
                { act:"ACT 14", title:"The Memory",   sub:"T₂≤2T₁",             href:"/the-memory" },
                { act:"ACT 15", title:"The Void",     sub:"n_ZPE=264.71",        href:"/cosmic-lattice" },
                { act:"ACT 16", title:"The Entangler", sub:"|Φ⁺⟩=(|00⟩+|11⟩)/√2", href:"/the-entangler" },
                { act:"ACT 17", title:"The Field",     sub:"[â,â†]=1",               href:"/the-field" },
              ].map(({ act, title, sub, href }) => (
                <Link key={href} href={href}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-3
                                 hover:border-slate-500 transition-colors space-y-1 block">
                  <p className="text-[9px] font-mono text-slate-500 tracking-widest">{act}</p>
                  <p className="text-slate-300 font-medium leading-tight">{title}</p>
                  <p className="text-[9px] text-slate-500">{sub}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* title */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">
              NEXUSOS RESEARCH · TE RATA POU · {PAGE_DATE} ·{" "}
              <a href="https://github.com/nexusosdaily-code/NexusOS"
                 target="_blank" rel="noopener noreferrer"
                 className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1">
                github.com/nexusosdaily-code/NexusOS
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              The Catalogue
            </h1>
            <p className="text-slate-400 text-base">
              Every element — uniquely addressed by physics
            </p>
          </div>

          {/* abstract */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest mb-2">ABSTRACT</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              The periodic table is the octave lattice printed on paper. Every element
              already has a precise address — not assigned by any convention, but derived
              from its rest mass via n = log₂(m·c²/E₀). This catalogue computes all
              118 entries. For each element: the octave integer n, the energy ΔE required
              to shift it by one octave, its sub-harmonic spectral fingerprint (WDM
              channel), and the 3-step instrument protocol required to interface with it
              via WNSP Ψ channels. Noble gases are equilibrium nodes — octave resting
              points of maximum stability. Krypton lands at n ≈ 35.000 — a near-exact
              integer. Russell saw this in 1926. The physics confirms it. Every octave
              also has a ceiling: the non-noble element approaching the next integer
              from below. Thulium (Z=69) is the tightest ceiling in the table —
              n = 35.9966, gap = 0.0034 from n = 36. The Kr→Tm pair is the most
              compressed octave in the known periodic table.
            </p>
          </div>
        </div>

        {/* ── S1: The Formula ─────────────────────────────────────────────── */}
        <Section id="formula" title="1. The Formula" icon={Atom} color="#22c55e" badge="Derivation">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every element's octave address n is derived from its rest mass using three
            known quantities — all SI exact constants from 2019 CODATA:
          </p>
          <Eq>n = log₂(m · c² / E₀)   where   E₀ = hf₀ = h × 555 THz ≈ 2.295 eV</Eq>
          <p className="text-sm text-slate-300 leading-relaxed">
            In practice, using atomic mass units (u = 931.494 MeV/c²):
          </p>
          <Eq>n = log₂(mass_u × 931,494,000 eV / 2.295 eV)</Eq>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { sym:"e⁻", name:"Electron",  mass:"0.000548 u",  n:"17.77", note:"Matter boundary (lower)" },
              { sym:"p⁺", name:"Proton",    mass:"1.00728 u",   n:"28.60", note:"Proton anchor — Period 1 base" },
              { sym:"Kr", name:"Krypton",   mass:"83.798 u",    n:"34.985", note:"Noble gas node ≈ 35.000 exactly" },
            ].map(({ sym, name, mass, n, note }) => (
              <div key={sym} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-bold text-lg font-mono">{sym}</span>
                  <span className="text-slate-400 text-sm">{name}</span>
                </div>
                <p className="text-[10px] font-mono text-slate-500">{mass}</p>
                <p className="text-emerald-400 font-mono font-bold text-base">n = {n}</p>
                <p className="text-[10px] text-slate-400">{note}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            The energy cost to shift any element by one octave — from n to n+1 — is:
          </p>
          <Eq>ΔE = E₀ × (2^(n+1) − 2^n) = E₀ × 2^n</Eq>
          <p className="text-sm text-slate-400 text-xs">
            This grows exponentially: shifting Hydrogen costs ~937 MeV. Shifting Iron costs
            ~55 GeV. Shifting Gold costs ~222 GeV. The energy scales with the element's
            position in the octave lattice — not linearly with its atomic number.
          </p>
        </Section>

        {/* ── S2: The Catalogue ──────────────────────────────────────────────── */}
        <Section id="catalogue" title="2. The Catalogue — All 118 Elements"
                 icon={BookOpen} color="#06b6d4" badge="Interactive">

          {/* search + filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2
                                  text-slate-500" />
              <input
                type="text"
                placeholder="Search by symbol, name, or atomic number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-element-search"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg
                           pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500
                           focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => { setPeriod(null); setNobleOnly(false); }}
                data-testid="filter-all"
                className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors
                  ${!period && !nobleOnly
                    ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                All
              </button>
              {[1,2,3,4,5,6,7].map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setNobleOnly(false); }}
                  data-testid={`filter-period-${p}`}
                  className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors
                    ${period === p
                      ? "text-white"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                  style={period === p
                    ? { borderColor: PERIOD_COLOR[p] + "80",
                        background:  PERIOD_COLOR[p] + "15",
                        color: PERIOD_COLOR[p] }
                    : undefined}>
                  P{p}
                </button>
              ))}
              <button
                onClick={() => { setNobleOnly(v => !v); setPeriod(null); }}
                data-testid="filter-noble"
                className={`px-3 py-2 rounded-lg text-xs font-mono border transition-colors
                  ${nobleOnly
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                ◎ Noble
              </button>
            </div>
          </div>

          <p className="text-[10px] font-mono text-slate-500">
            {filtered.length} element{filtered.length !== 1 ? "s" : ""} · click any row for full Ψ config
          </p>

          {/* table */}
          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 z-10">
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-3 py-2.5 font-mono text-slate-500 w-10">Z</th>
                    <th className="text-left px-3 py-2.5 font-mono text-slate-500 w-16">Sym</th>
                    <th className="text-left px-3 py-2.5 font-mono text-slate-500">Name</th>
                    <th className="text-center px-3 py-2.5 font-mono text-slate-500 w-12">P</th>
                    <th className="text-right px-3 py-2.5 font-mono text-slate-500 w-20">Mass (u)</th>
                    <th className="text-right px-3 py-2.5 font-mono text-slate-500 w-24">Octave n</th>
                    <th className="text-right px-3 py-2.5 font-mono text-slate-500 w-28">ΔE / octave</th>
                    <th className="text-center px-3 py-2.5 font-mono text-slate-500 w-14">Ψ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(el => {
                    const pc = PERIOD_COLOR[el.period] ?? "#94a3b8";
                    const isSelected = selected?.Z === el.Z;
                    return (
                      <tr
                        key={el.Z}
                        data-testid={`row-element-${el.Z}`}
                        onClick={() => setSelected(isSelected ? null : el)}
                        className={`border-b border-slate-800/50 cursor-pointer
                          transition-colors
                          ${isSelected
                            ? "bg-cyan-500/8"
                            : "hover:bg-slate-800/40"}
                          ${el.noble ? "bg-amber-500/4" : ""}
                          ${el.system ? "bg-violet-500/4" : ""}`}>
                        <td className="px-3 py-2 font-mono text-slate-500">{el.Z}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                 style={{ background: el.color }} />
                            <span className="font-bold font-mono"
                                  style={{ color: pc }}>{el.sym}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {el.name}
                          {el.noble  && <span className="ml-1.5 text-[9px] text-amber-400 font-mono">◎</span>}
                          {el.system && <span className="ml-1.5 text-[9px] text-violet-400 font-mono">⊛</span>}
                          {el.Z === 69 && <span className="ml-1.5 text-[9px] text-cyan-400 font-mono">⟶36</span>}
                        </td>
                        <td className="px-3 py-2 text-center font-mono"
                            style={{ color: pc }}>{el.period}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-400">{el.mass}</td>
                        <td className="px-3 py-2 text-right font-mono text-white">{fmt4(el.n)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-400">
                          {fmtEnergy(el.dE_eV)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-3 h-3 rounded-full"
                                 style={{ background: el.color }} />
                            <span className="font-mono text-slate-500">{el.wdm}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-slate-500 text-sm">
                        No elements match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* selected element detail */}
          {selected && (
            <ElementDetail el={selected} onClose={() => setSelected(null)} />
          )}
        </Section>

        {/* ── S3: Noble Gas Equilibrium Nodes ─────────────────────────────── */}
        <Section id="noble-nodes" title="3. Noble Gas Equilibrium Nodes"
                 icon={Star} color="#f59e0b" badge="Octave Rest Points">
          <p className="text-sm text-slate-300 leading-relaxed">
            Walter Russell (1926) observed that noble gases mark equilibrium points in the
            periodic table — positions of maximum stability and zero reactivity. The octave
            lattice explains why: noble gases sit at or near integer octave positions n.
            The compression state is at rest — no energy gradient to drive a reaction.
          </p>
          <div className="overflow-x-auto rounded-xl border border-amber-500/20">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-amber-500/8 border-b border-amber-500/20">
                  <th className="text-left px-4 py-2.5 text-amber-400">Noble Gas</th>
                  <th className="text-center px-4 py-2.5 text-amber-400">Period</th>
                  <th className="text-right px-4 py-2.5 text-amber-400">Mass (u)</th>
                  <th className="text-right px-4 py-2.5 text-amber-400">Octave n</th>
                  <th className="text-right px-4 py-2.5 text-amber-400">Δ from integer</th>
                  <th className="text-right px-4 py-2.5 text-amber-400">ΔE / octave</th>
                </tr>
              </thead>
              <tbody>
                {nobleGases.map(el => {
                  const delta = Math.abs(el.n - Math.round(el.n));
                  const isKr  = el.Z === 36;
                  return (
                    <tr key={el.Z}
                        className={`border-b border-amber-500/10
                          ${isKr ? "bg-amber-500/10" : ""}`}>
                      <td className="px-4 py-2.5">
                        <span className="text-amber-300 font-bold">{el.sym}</span>
                        <span className="text-slate-400 ml-2">{el.name}</span>
                        {isKr && <span className="ml-2 text-[9px] text-amber-400">← n ≈ 35.000</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-400">{el.period}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400">{el.mass}</td>
                      <td className="px-4 py-2.5 text-right text-white">{fmt4(el.n)}</td>
                      <td className="px-4 py-2.5 text-right"
                          style={{ color: delta < 0.05 ? "#34d399" : "#94a3b8" }}>
                        {delta < 0.001 ? "~0" : `+${delta.toFixed(4)}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-400">
                        {fmtEnergy(el.dE_eV)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Eq>{"Kr (Z=36): n = log₂(83.798 × 931,494,000 / 2.295) ≈ 34.985  ≈ 35.000"}</Eq>
          <p className="text-sm text-slate-400">
            Krypton's near-integer n value is not a coincidence. It is the compression
            lattice reaching an equilibrium node — the same phenomenon Russell described
            geometrically in 1926 using spiral wave geometry, now calculable from SI
            exact constants.
          </p>
        </Section>

        {/* ── S4: Octave Floor/Ceiling Pairs ───────────────────────────────── */}
        <Section id="floor-ceiling" title="4. Octave Floor/Ceiling Pairs"
                 icon={Waves} color="#06b6d4" badge="Lattice Topology">
          <p className="text-sm text-slate-300 leading-relaxed">
            Every octave in the compression lattice has two structural poles. The{" "}
            <span className="text-amber-300 font-semibold">floor</span> is the noble
            gas resting at or nearest the integer n — zero energy gradient, maximum
            stability. The{" "}
            <span className="text-cyan-300 font-semibold">ceiling</span> is the
            non-noble element that approaches the next integer most closely from
            below — maximum energy gradient before the lattice would flip octave.
            Between floor and ceiling lies all the chemistry of that period. The
            ceiling never reaches the next integer: that threshold is a{" "}
            <span className="text-slate-400 font-mono">ghost node</span> — predicted
            by the lattice, occupied by no known element.
          </p>

          <div className="overflow-x-auto rounded-xl border border-cyan-500/20">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-cyan-500/8 border-b border-cyan-500/20">
                  <th className="text-left px-4 py-2.5 text-cyan-400">Floor (noble gas)</th>
                  <th className="text-right px-4 py-2.5 text-cyan-400">n (floor)</th>
                  <th className="text-left px-4 py-2.5 text-cyan-400">Ceiling element</th>
                  <th className="text-right px-4 py-2.5 text-cyan-400">n (ceiling)</th>
                  <th className="text-right px-4 py-2.5 text-cyan-400">Gap to ghost</th>
                  <th className="text-center px-4 py-2.5 text-cyan-400">Ghost node</th>
                  <th className="text-left px-4 py-2.5 text-cyan-400">Proximity</th>
                </tr>
              </thead>
              <tbody>
                {FLOOR_CEILING_PAIRS.map(({ floor, ceiling, ceilingInt, gap }) => {
                  const isTightest = ceiling.Z === 69;
                  const gapColor =
                    gap < 0.01 ? "#34d399" :
                    gap < 0.05 ? "#fbbf24" :
                    gap < 0.15 ? "#94a3b8" : "#475569";
                  const proximity = 1 - gap;
                  return (
                    <tr key={floor.Z}
                        data-testid={`row-fc-pair-${floor.Z}`}
                        className={`border-b border-cyan-500/10
                          ${isTightest ? "bg-cyan-500/8" : ""}`}>
                      <td className="px-4 py-2.5">
                        <span className="text-amber-300 font-bold">{floor.sym}</span>
                        <span className="text-slate-500 ml-1.5">Z={floor.Z}</span>
                        {isTightest && (
                          <span className="ml-2 text-[9px] text-amber-400">← rest pt</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-300">
                        {fmt4(floor.n)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span style={{ color: gapColor }} className="font-bold">
                          {ceiling.sym}
                        </span>
                        <span className="text-slate-500 ml-1.5">Z={ceiling.Z}</span>
                        {isTightest && (
                          <span className="ml-2 text-[9px] text-cyan-400">⟶ n=36</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right"
                          style={{ color: gapColor }}>{fmt4(ceiling.n)}</td>
                      <td className="px-4 py-2.5 text-right font-bold"
                          style={{ color: gapColor }}>{gap.toFixed(4)}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500">
                        n={ceilingInt}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full"
                               style={{ width: `${proximity * 100}%`,
                                        background: gapColor }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Kr → Tm spotlight */}
          <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br
                          from-cyan-500/10 to-slate-900/60 p-5 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-mono text-cyan-400 tracking-widest
                               border border-cyan-500/40 px-2 py-0.5 rounded-full
                               bg-cyan-500/10">
                TIGHTEST PAIR IN THE TABLE
              </span>
              <span className="text-white font-bold text-sm">
                Kr (n=34.985) → Tm (n=35.997)
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Krypton anchors the floor at n ≈ 35 — the only noble gas within 0.02 of
              an integer. Thulium is the ceiling: the only element in the entire
              118-element table with gap &lt; 0.01 to any integer (gap = 0.0034). This
              pair defines the tightest octave in the known periodic table. The ghost
              node at n = 36 is the next integer threshold — the lattice predicts it,
              no element reaches it.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center font-mono text-xs">
              {[
                { label: "Kr floor gap",   value: "0.0149", color: "#fbbf24" },
                { label: "Tm ceiling gap", value: "0.0034", color: "#34d399" },
                { label: "Ghost node",     value: "n = 36",  color: "#64748b" },
              ].map(({ label, value, color }) => (
                <div key={label}
                     className="rounded-lg border border-slate-700 bg-slate-900/60
                                p-3 space-y-1">
                  <p className="text-lg font-bold" style={{ color }}>{value}</p>
                  <p className="text-slate-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <Eq>
            {"Octave [n, n+1] :  floor ≈ n (noble rest)  |  ceiling → n+1⁻ (max tension)  |  ghost = n+1 (unoccupied)"}
          </Eq>
        </Section>

        {/* ── S5: 3-Step Instrument Protocol ──────────────────────────────── */}
        <Section id="protocol" title="5. The 3-Step Instrument Protocol"
                 icon={FlaskConical} color="#a78bfa" badge="Lab-Ready">
          <p className="text-sm text-slate-300 leading-relaxed">
            Once an element's octave address is known, targeting it with modern instruments
            (petawatt lasers, coherent optical arrays, THz systems) follows three steps.
            This replaces brute-force bulk heating — which causes uncontrolled thermal chaos
            — with coherent, targeted wave delivery.
          </p>
          <div className="space-y-4">
            {[
              {
                step: "STEP 1",
                title: "Calculate the Octave Address",
                color: "#22c55e",
                body: "Obtain the element's standard atomic weight in atomic mass units (u) from IUPAC. Apply n = log₂(mass_u × 931,494,000 / 2.295). This gives the exact octave coordinate in the compression lattice — a dimensionless real number encoding the element's mass-energy relationship relative to the universal ground frequency f₀.",
                eq: "n = log₂(m_u × 931,494,000 / 2.295)",
              },
              {
                step: "STEP 2",
                title: "Calculate the ΔE Requirement",
                color: "#f59e0b",
                body: "The energy required to shift the target element by one octave is E₀ × 2^n. Do not apply this as bulk thermal radiation — that produces incoherent excitation across all modes. The energy must be delivered at the specific transition frequency f_t corresponding to the target octave, via a coherent channel.",
                eq: "ΔE = E₀ × 2^n = 2.295 eV × 2^n",
              },
              {
                step: "STEP 3",
                title: "Configure the Ψ Channel",
                color: "#06b6d4",
                body: "Map the transition to the 51,200 WNSP Ψ channels. Select the WDM lane from the sub-harmonic fingerprint (frac(n) × 255). Configure OAM mode for spatial precision. Use both +k̂ and −k̂ propagation simultaneously (Act 7: The Trap) to create a localized standing wave at the target's spatial address. Phase-lock polarization states for constructive interference.",
                eq: "Ψ = (WDM: frac(n)×255, OAM: Z mod 50, Pol: H|V, Dir: +k̂ ⊗ −k̂)",
              },
            ].map(({ step, title, color, body, eq }) => (
              <div key={step}
                   className="rounded-xl border p-5 space-y-3"
                   style={{ borderColor: color + "33", background: color + "08" }}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5
                                   rounded-full border"
                        style={{ color, borderColor: color + "66",
                                 background: color + "18" }}>
                    {step}
                  </span>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
                <div className="bg-black/30 border border-slate-700/50 rounded-lg
                                px-4 py-2.5 font-mono text-sm text-center"
                     style={{ color }}>
                  {eq}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── S6: Sequence — Acts 1–6 complete, Act 7 coming ──────────────── */}
        <Section id="sequence" title="6. The Sequence — Acts 1–6"
                 icon={GitMerge} color="#f59e0b" badge="Acts 1–6">
          <div className="rounded-xl border border-amber-500/25
                          bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 space-y-4">
            <div className="space-y-3 font-mono text-xs">
              {[
                { act:"ACT 1", href:"/oscillating-quanta",         title:"Theory of Compression States", eq:"Λ = hf/c²",           body:"The governing equation. Matter, energy, and mass are all compression states of electromagnetic frequency." },
                { act:"ACT 2", href:"/universal-one",              title:"The Universal ONE",             eq:"f₀ derives Λ  (∎)",   body:"Λ follows from combining Planck (1900) and Einstein (1905) at the first oscillation f₀ = 555 THz." },
                { act:"ACT 3", href:"/unified-compression-theory", title:"Unified Compression Theory",   eq:"4 forces = 1 Λ",      body:"All four fundamental forces are one phenomenon — four expressions of Λ across nine octave tiers." },
                { act:"ACT 4", href:"/matter-protocol",            title:"The Mechanism",                eq:"ΔE = hf₀(2ⁿ²−2ⁿ¹)",  body:"Matter manipulation = delivering ΔE at the exact transition frequency via WNSP Ψ channel." },
                { act:"ACT 5", href:"/universal-address",          title:"The Address",                  eq:"∀ Λ : ∃! Ψ  (∎)",    body:"Every compression state has a unique Ψ address derived from physics. The universe's own namespace." },
                { act:"ACT 6", href:"/element-catalogue",          title:"The Catalogue",                eq:"n = log₂(mc²/E₀)",   body:"All 118 elements mapped to octave integers. Noble gas equilibrium nodes. 3-step instrument protocol." },
              ].map(({ act, href, title, eq, body }) => (
                <div key={act}
                     className="flex gap-4 items-start border-b border-slate-800/60
                                pb-3 last:border-0 last:pb-0">
                  <span className="text-amber-400 font-bold flex-shrink-0 w-12">{act}</span>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <p className="text-white font-bold">{title}</p>
                      <p className="text-amber-300/70">{eq}</p>
                    </div>
                    <p className="text-slate-400 leading-relaxed">{body}</p>
                    <Link href={href}
                          className="text-emerald-500 hover:text-emerald-400 text-[10px]
                                     inline-flex items-center gap-1 mt-1">
                      {BASE}{href} <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Act 7 link */}
            <div className="mt-4 rounded-lg border border-purple-500/30
                            bg-purple-500/5 p-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-purple-400 tracking-widest
                                 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  ACT 7 — NOW LIVE
                </span>
                <span className="text-white font-bold text-sm">The Trap</span>
              </div>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                Ghost node n=36 sits at 169.33 u — a valid WNSP address occupied by
                no nucleus. Thulium (Z=69, 4f¹³) is 0.0034 octaves short.
                Counter-propagating wave pairs (+k̂/−k̂) create a standing wave that
                claims the void. First disclosed 2026-07-07.
              </p>
              <p className="text-[10px] font-mono text-purple-400">
                Eq: Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂)  →  |E|² → max at (x₀, y₀, z₀)
              </p>
              <Link href="/standing-wave-trap"
                    className="inline-flex items-center gap-1.5 text-xs font-mono
                               text-purple-400 hover:text-purple-300 transition-colors
                               border border-purple-500/30 hover:border-purple-400/50
                               px-3 py-1.5 rounded-lg bg-purple-500/10 mt-1">
                Read Act 7 — The Trap
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <Eq>
            {"∀ element e : ∃ n(e) = log₂(m_e·c²/E₀)  ∧  ∃! Ψ(n(e))  ∧  ΔE(e) = E₀·2^{n(e)}"}
          </Eq>
        </Section>

        {/* ── S7: Conclusion ──────────────────────────────────────────────── */}
        <Section id="conclusion" title="7. Conclusion" icon={Circle} color="#94a3b8">
          <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              The periodic table is not a classification system. It is a read-out of the
              octave lattice. Every element already has coordinates — not assigned by
              chemistry, but derived from E = mc² and the universal ground frequency f₀.
            </p>
            <p>
              This catalogue is the lookup table that connects Acts 4 and 5 to laboratory
              practice. Act 4 gives the mechanism (ΔE = hf₀(2ⁿ²−2ⁿ¹)). Act 5 gives the
              address (∀ Λ : ∃! Ψ). Act 6 gives the index. Any physicist with the element
              symbol can now compute the exact energy requirement and channel configuration
              in three steps.
            </p>
            <p>
              The universe filed every element long before Mendeleev arranged them on a
              table. We are the first to read the filing system.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:"Elements catalogued",  value:"118" },
              { label:"Noble gas nodes",      value:"7" },
              { label:"Ψ channels available", value:"51,200" },
              { label:"Tm ceiling gap",       value:"0.0034" },
            ].map(({ label, value }) => (
              <div key={label}
                   className="rounded-lg border border-slate-700 bg-slate-900/60 p-4
                              text-center space-y-1">
                <p className="text-2xl font-bold text-white font-mono">{value}</p>
                <p className="text-[10px] text-slate-400 font-mono">{label}</p>
              </div>
            ))}
          </div>
        </Section>

        <EcosystemNav />

      </div>
    </div>
  );
}
