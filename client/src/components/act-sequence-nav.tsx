import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

const ALL_ACTS = [
  { n: 1,  title: "Theory of Compression States", sub: "Λ=hf/c²",                href: "/oscillating-quanta" },
  { n: 2,  title: "The Universal ONE",             sub: "f₀ derives Λ",            href: "/universal-one" },
  { n: 3,  title: "Unified Compression Theory",    sub: "4 forces=1 Λ",            href: "/unified-compression-theory" },
  { n: 4,  title: "The Mechanism",                 sub: "ΔE=hf₀(2ⁿ²−2ⁿ¹)",        href: "/matter-protocol" },
  { n: 5,  title: "The Address",                   sub: "∀ Λ : ∃! Ψ",             href: "/universal-address" },
  { n: 6,  title: "The Catalogue",                 sub: "n=log₂(mc²/E₀)",          href: "/element-catalogue" },
  { n: 7,  title: "The Trap",                      sub: "Ψ(+k̂)⊗Ψ(−k̂)",          href: "/standing-wave-trap" },
  { n: 8,  title: "The Lossless Channel",          sub: "α=0, C=ZPE floor",        href: "/lossless-channel" },
  { n: 9,  title: "The Cavity",                    sub: "WGM resonance, r_c",      href: "/resonance-cavity" },
  { n: 10, title: "The Exchange",                  sub: "Ω_R=2g",                  href: "/polariton-exchange" },
  { n: 11, title: "The Emitter",                   sub: "F_p=(3/4π²)(λ/n)³(Q/V)", href: "/the-emitter" },
  { n: 12, title: "The Network",                   sub: "ω(k)=ω₀−2J·cos(ka)",     href: "/the-network" },
  { n: 13, title: "The Observer",                  sub: "χ=g²/Δ",                  href: "/the-observer" },
  { n: 14, title: "The Memory",                    sub: "T₂≤2T₁",                  href: "/the-memory" },
  { n: 15, title: "The Void",                      sub: "n_ZPE=264.71",            href: "/cosmic-lattice" },
  { n: 16, title: "The Entangler",                 sub: "|Φ⁺⟩=(|00⟩+|11⟩)/√2",   href: "/the-entangler" },
  { n: 17, title: "The Field",                     sub: "[â,â†]=1",                href: "/the-field" },
  { n: 18, title: "The Coherent State",            sub: "â|α⟩=α|α⟩",             href: "/the-coherent-state" },
  { n: 19, title: "The Squeezed State",            sub: "ΔX₁·ΔX₂ ≥ ¼",           href: "/the-squeezed-state" },
];

interface Props { current: number }

export function ActSequenceNav({ current }: Props) {
  const prev = ALL_ACTS.find(a => a.n === current - 1);
  const next = ALL_ACTS.find(a => a.n === current + 1);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4 space-y-2">
      <p className="text-[9px] font-mono text-slate-500 tracking-widest text-center">
        THE SEQUENCE — ACT {current} OF {ALL_ACTS.length}
      </p>
      <div className="grid grid-cols-3 gap-2">

        {/* ← Prev */}
        <div>
          {prev ? (
            <Link href={prev.href}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900
                         hover:border-slate-500 hover:bg-slate-800 transition-colors p-2.5 h-full group">
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
              <div className="min-w-0">
                <p className="text-[7px] font-mono text-slate-500 tracking-widest">ACT {prev.n}</p>
                <p className="text-[9px] text-slate-300 font-medium leading-tight line-clamp-2">{prev.title}</p>
                <p className="text-[7px] text-slate-500 font-mono truncate">{prev.sub}</p>
              </div>
            </Link>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-2.5 h-full
                            flex items-center justify-center">
              <p className="text-[7px] text-slate-700 font-mono tracking-widest">ORIGIN</p>
            </div>
          )}
        </div>

        {/* ⌂ Hub */}
        <div className="flex">
          <Link href="/"
            className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-700
                       bg-slate-900 hover:border-slate-500 hover:bg-slate-800 transition-colors p-2.5 w-full group">
            <Home className="w-4 h-4 text-slate-400 group-hover:text-white" />
            <p className="text-[7px] font-mono text-slate-500 group-hover:text-slate-300 tracking-widest">HUB</p>
          </Link>
        </div>

        {/* Next → */}
        <div>
          {next ? (
            <Link href={next.href}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900
                         hover:border-slate-500 hover:bg-slate-800 transition-colors p-2.5 h-full group">
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[7px] font-mono text-slate-500 tracking-widest">ACT {next.n}</p>
                <p className="text-[9px] text-slate-300 font-medium leading-tight line-clamp-2">{next.title}</p>
                <p className="text-[7px] text-slate-500 font-mono truncate">{next.sub}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0" />
            </Link>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-2.5 h-full
                            flex items-center justify-center">
              <p className="text-[7px] text-slate-600 font-mono tracking-widest">FRONTIER</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
