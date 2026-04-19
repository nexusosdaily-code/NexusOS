import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Layers, Zap, CheckCircle, XCircle, Radio, GitBranch, Lock, Cpu, Waves } from "lucide-react";

// ── physics helpers ───────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 450) return "#7c3aed"; if (nm < 495) return "#2563eb";
  if (nm < 520) return "#0891b2"; if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04"; if (nm < 625) return "#ea580c";
  return "#dc2626";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM"; if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM"; if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE"; if (nm < 625) return "EVENT";
  return "STORAGE";
}
function nmFromWdm(wdm: number): number { return 380 + (wdm - 1) * 4; }
function polToStr(p: number) { return p === 0 ? "H" : "V"; }

// ── inner product ─────────────────────────────────────────────────────────────
// ⟨Ψ₁|Ψ₂⟩ = δ(wdm₁,wdm₂) · δ(oam₁,oam₂) · δ(pol₁,pol₂)
function innerProduct(w1: number, o1: number, p1: number, w2: number, o2: number, p2: number) {
  return (w1 === w2 ? 1 : 0) * (o1 === o2 ? 1 : 0) * (p1 === p2 ? 1 : 0);
}
function dimMatch(a: number, b: number) { return a === b; }

// ── SOP formal axioms ─────────────────────────────────────────────────────────
const AXIOMS = [
  {
    id: "A1", label: "Hilbert Basis",
    math: "H = span{ |λ⟩ ⊗ |ℓ⟩ ⊗ |σ⟩ }",
    plain: "Every channel address lives in the tensor product of three independent physical spaces: wavelength (WDM), orbital angular momentum (OAM), and polarisation. No channel exists outside this space.",
  },
  {
    id: "A2", label: "Orthogonality",
    math: "⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ = 1 if i=j, else 0",
    plain: "Two channels are orthogonal if they differ in any single dimension. Orthogonal channels cannot interfere — by physics, not by protocol convention. No collision detection layer is required.",
  },
  {
    id: "A3", label: "Density",
    math: "D = N_λ × N_OAM × N_Pol × R_sym × M = 25,600",
    plain: "The total channel count is the product of all orthogonal dimensions. Each dimension multiplies — not adds — the capacity. This is why OAM multiplexing is powerful: 50 OAM states × existing WDM = 50× capacity on the same fibre.",
  },
  {
    id: "A4", label: "Projection Demodulation",
    math: "P̂ᵢ = |Ψᵢ⟩⟨Ψᵢ|   →   payload_i = P̂ᵢ · signal",
    plain: "A receiver recovers payload on channel i by projecting the incoming signal onto |Ψᵢ⟩. Because all other channels are orthogonal, they project to zero — perfect isolation without filtering.",
  },
];

// ── dimension definitions ─────────────────────────────────────────────────────
const DIMS = [
  { id: "N_λ",   label: "Wavelength (WDM)",   count: 100, unit: "channels", color: "#22d3ee", note: "380–780nm · 4nm spacing · implemented in CE→SE", live: true },
  { id: "N_OAM", label: "Orbital Angular Momentum", count: 50, unit: "ℓ states", color: "#a78bfa", note: "ℓ = 0…49 · topological charge · implemented via sum(codes)%50", live: true },
  { id: "N_Pol", label: "Polarisation",        count: 2,   unit: "states",   color: "#34d399", note: "H / V · implemented via char-count parity", live: true },
  { id: "R_sym", label: "Symbol Rate ×",       count: 2,   unit: "mult",     color: "#fb923c", note: "time-domain multiplexing · awaiting PHR-1 hardware", live: false },
  { id: "M",     label: "Modulation Depth ×",  count: 128, unit: "levels",   color: "#f87171", note: "amplitude/phase encoding · awaiting PHR-1 hardware", live: false },
];

// ── TCP/IP vs SOP comparison ──────────────────────────────────────────────────
const COMPARE = [
  { aspect: "Addressing",         tcp: "32-bit integer (IPv4) / 128-bit (IPv6)",    sop: "Ψ(wdm, oam, pol) — physics-derived from content" },
  { aspect: "Channel isolation",  tcp: "Software-enforced ports, firewalls",         sop: "Physical orthogonality — hardware guarantee" },
  { aspect: "Collision handling", tcp: "CSMA/CD, ACK/NACK, retransmit",             sop: "Impossible between orthogonal channels — zero overhead" },
  { aspect: "Capacity scaling",   tcp: "More cables / spectrum licences",            sop: "Add OAM/pol dimensions — same physical medium" },
  { aspect: "Address authority",  tcp: "IANA, ISPs, governments can revoke",         sop: "CE→SE from content — physics cannot be revoked" },
  { aspect: "Fee model",          tcp: "Arbitrary ISP pricing",                      sop: "E = hf — energy cost, derived from wavelength" },
  { aspect: "Encryption",         tcp: "RSA/TLS — algorithm-based, breakable",       sop: "Spectral signing: SHA-256 ⊕ hex(λ)" },
];

// ── simultaneous stream sim ───────────────────────────────────────────────────
const DEMO_STREAMS = [
  { wdm: 60, oam: 12, pol: 0, payload: "Nexus → ReasoningCore: init handshake" },
  { wdm: 60, oam: 27, pol: 0, payload: "Alice → DataNode: query block #9" },
  { wdm: 60, oam: 12, pol: 1, payload: "Kernel → blockchain_auditor: cycle 6" },
  { wdm: 80, oam: 12, pol: 0, payload: "SOP broadcast: governance proposal #3" },
];

// ── component ─────────────────────────────────────────────────────────────────
export default function SOPPage() {
  // Orthogonality calculator state
  const [wdm1, setWdm1] = useState(60); const [oam1, setOam1] = useState(12); const [pol1, setPol1] = useState(0);
  const [wdm2, setWdm2] = useState(60); const [oam2, setOam2] = useState(27); const [pol2, setPol2] = useState(0);

  const ip = innerProduct(wdm1, oam1, pol1, wdm2, oam2, pol2);
  const nm1 = nmFromWdm(wdm1); const nm2 = nmFromWdm(wdm2);
  const isOrthogonal = ip === 0;

  const wMatch = dimMatch(wdm1, wdm2);
  const oMatch = dimMatch(oam1, oam2);
  const pMatch = dimMatch(pol1, pol2);

  const density10k = 100 * 50 * 2;
  const density25k = 100 * 50 * 2 * 2 * 128;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <Waves size={14} className="text-cyan-400" />
          <span className="text-sm font-bold tracking-wider text-cyan-400">SPECTRAL ORTHOGONAL PROTOCOL</span>
          <span className="text-white/20 text-[9px] px-2 py-0.5 border border-white/10 rounded-full">SOP v1.0</span>
        </div>
        <div className="text-white/20 text-[9px]">Hilbert-space channel isolation · 25,600 orthogonal channels · collision-free by physics</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* hero statement */}
        <div className="border border-cyan-400/20 rounded-xl p-6" style={{ background: "rgba(34,211,238,0.03)" }}>
          <div className="max-w-3xl">
            <div className="text-cyan-400/50 text-[9px] uppercase tracking-widest mb-2">Protocol Statement</div>
            <div className="text-white/80 text-sm leading-relaxed mb-3">
              SOP defines communication over a Hilbert space of orthogonal electromagnetic modes. Two channels that differ in <em>any</em> physical dimension — wavelength, orbital angular momentum, or polarisation — are mathematically guaranteed not to interfere. No collision detection, no arbitration, no retransmit logic. Isolation is a consequence of physics, not engineering convention.
            </div>
            <div className="flex items-center gap-4 text-[9px]">
              <span className="text-emerald-400">✓ 10,000 channels live today (λ × OAM × pol)</span>
              <span className="text-white/30">·</span>
              <span className="text-amber-400">25,600 at full density (+ R_sym × M · PHR-1 hardware)</span>
              <span className="text-white/30">·</span>
              <span className="text-cyan-400/60">AGPL-3.0 · free infrastructure</span>
            </div>
          </div>
        </div>

        {/* Axioms */}
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Lock size={9} /> Formal Axioms
          </div>
          <div className="grid grid-cols-2 gap-3">
            {AXIOMS.map(ax => (
              <div key={ax.id} className="border border-white/8 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] px-1.5 py-0.5 rounded border border-cyan-400/30 text-cyan-400/60 font-bold">{ax.id}</span>
                  <span className="text-white/50 text-[10px] font-bold">{ax.label}</span>
                </div>
                <div className="text-cyan-300/70 text-[10px] font-mono mb-2 px-2 py-1.5 rounded" style={{ background: "rgba(34,211,238,0.06)" }}>
                  {ax.math}
                </div>
                <div className="text-white/30 text-[9px] leading-relaxed">{ax.plain}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 5 Dimensions */}
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Layers size={9} /> The Five Orthogonal Dimensions
          </div>
          <div className="border border-white/8 rounded-xl overflow-hidden">
            <div className="grid grid-cols-5 divide-x divide-white/5">
              {DIMS.map((d, idx) => {
                const runningProduct = DIMS.slice(0, idx + 1).reduce((a, x) => a * x.count, 1);
                return (
                  <div key={d.id} className="p-4 relative" style={{ background: d.live ? `${d.color}08` : "rgba(255,255,255,0.01)" }}>
                    {/* status badge */}
                    <div className={`absolute top-3 right-3 w-1.5 h-1.5 rounded-full ${d.live ? "animate-pulse" : "opacity-20"}`} style={{ background: d.color }} />
                    <div className="text-[8px] text-white/20 mb-1">{d.id}</div>
                    <div className="text-[10px] font-bold mb-1" style={{ color: d.color }}>{d.label}</div>
                    <div className="text-2xl font-bold mb-1" style={{ color: d.live ? d.color : "#6b7280" }}>{d.count.toLocaleString()}</div>
                    <div className="text-[7px] text-white/25 mb-2">{d.unit}</div>
                    <div className="text-[7px] mb-2 px-1.5 py-1 rounded" style={{ background: "rgba(0,0,0,0.3)", color: d.live ? "#6ee7b7" : "#d97706" }}>
                      {d.live ? "● live" : "○ PHR-1"}
                    </div>
                    <div className="text-[6px] text-white/15 leading-relaxed">{d.note}</div>
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[7px] text-white/20">Running product</div>
                      <div className="text-[9px] font-bold text-white/40">{runningProduct.toLocaleString()} ch</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[9px] text-white/30">D_WNSP = N_λ × N_OAM × N_Pol × R_sym × M</div>
              <div className="flex items-center gap-4 text-[9px]">
                <span className="text-emerald-400">Live today: {density10k.toLocaleString()} channels</span>
                <span className="text-white/20">·</span>
                <span className="text-amber-400">Full density: {density25k.toLocaleString()} channels</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orthogonality Calculator */}
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Cpu size={9} /> Orthogonality Calculator — ⟨Ψ₁|Ψ₂⟩
          </div>
          <div className="grid grid-cols-5 gap-4">
            {/* Channel 1 */}
            <div className="col-span-2 border border-white/10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3">Channel Ψ₁</div>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] text-white/20 block mb-1">WDM (1–100)</label>
                  <input type="range" min={1} max={100} value={wdm1} onChange={e => setWdm1(+e.target.value)} className="w-full accent-cyan-400" />
                  <div className="flex justify-between text-[8px] mt-1">
                    <span style={{ color: nmToColor(nm1) }}>wdm={wdm1} · λ={nm1}nm</span>
                    <span className="text-white/20">{nmToBand(nm1)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[8px] text-white/20 block mb-1">OAM ℓ (0–49)</label>
                  <input type="range" min={0} max={49} value={oam1} onChange={e => setOam1(+e.target.value)} className="w-full accent-purple-400" />
                  <div className="text-[8px] text-purple-400/60 mt-1">ℓ = {oam1}</div>
                </div>
                <div>
                  <label className="text-[8px] text-white/20 block mb-1">Polarisation</label>
                  <div className="flex gap-2">
                    {[0, 1].map(v => (
                      <button key={v} onClick={() => setPol1(v)}
                        className={`flex-1 py-1 rounded text-[9px] font-bold border transition-all ${pol1 === v ? "border-emerald-400/50 text-emerald-400 bg-emerald-400/10" : "border-white/10 text-white/20"}`}>
                        {polToStr(v)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border border-white/5 rounded-lg px-3 py-2 text-center" style={{ background: `${nmToColor(nm1)}10` }}>
                  <div className="text-[8px] text-white/20 mb-0.5">Ψ₁</div>
                  <div className="text-[11px] font-bold" style={{ color: nmToColor(nm1) }}>Ψ({wdm1},{oam1},{polToStr(pol1)})</div>
                  <div className="text-[8px] text-white/25">λ={nm1}nm</div>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="col-span-1 flex flex-col items-center justify-center gap-3">
              <div className="text-white/15 text-[9px] text-center">inner product</div>
              <div className={`text-4xl font-bold ${isOrthogonal ? "text-emerald-400" : "text-red-400"}`}>
                {ip}
              </div>
              <div className="text-[8px] text-center font-mono text-white/25">⟨Ψ₁|Ψ₂⟩ = {ip}</div>
              <div className={`flex items-center gap-1.5 text-[9px] font-bold px-3 py-1.5 rounded-full border ${isOrthogonal ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/10" : "border-red-400/40 text-red-400 bg-red-400/10"}`}>
                {isOrthogonal ? <><CheckCircle size={10} /> ORTHOGONAL</> : <><XCircle size={10} /> SAME CHANNEL</>}
              </div>
              <div className="text-[7px] text-white/15 text-center leading-relaxed px-2">
                {isOrthogonal
                  ? "These channels can carry simultaneous independent streams. Zero interference guaranteed by physics."
                  : "These are the same channel. Only one stream can occupy it at a time."}
              </div>

              {/* dimension breakdown */}
              <div className="w-full space-y-1 mt-1">
                {[
                  { label: "λ match", match: wMatch, val: `${wdm1} vs ${wdm2}` },
                  { label: "OAM match", match: oMatch, val: `ℓ${oam1} vs ℓ${oam2}` },
                  { label: "Pol match", match: pMatch, val: `${polToStr(pol1)} vs ${polToStr(pol2)}` },
                ].map(({ label, match, val }) => (
                  <div key={label} className="flex items-center justify-between text-[7px] px-2 py-1 rounded" style={{ background: match ? "rgba(239,68,68,0.08)" : "rgba(52,211,153,0.08)" }}>
                    <span className="text-white/25">{label}</span>
                    <span className="text-white/20 font-mono">{val}</span>
                    <span className={match ? "text-red-400" : "text-emerald-400"}>{match ? "same" : "orthog"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel 2 */}
            <div className="col-span-2 border border-white/10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.015)" }}>
              <div className="text-[9px] text-white/30 uppercase tracking-widest mb-3">Channel Ψ₂</div>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] text-white/20 block mb-1">WDM (1–100)</label>
                  <input type="range" min={1} max={100} value={wdm2} onChange={e => setWdm2(+e.target.value)} className="w-full accent-cyan-400" />
                  <div className="flex justify-between text-[8px] mt-1">
                    <span style={{ color: nmToColor(nm2) }}>wdm={wdm2} · λ={nm2}nm</span>
                    <span className="text-white/20">{nmToBand(nm2)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-[8px] text-white/20 block mb-1">OAM ℓ (0–49)</label>
                  <input type="range" min={0} max={49} value={oam2} onChange={e => setOam2(+e.target.value)} className="w-full accent-purple-400" />
                  <div className="text-[8px] text-purple-400/60 mt-1">ℓ = {oam2}</div>
                </div>
                <div>
                  <label className="text-[8px] text-white/20 block mb-1">Polarisation</label>
                  <div className="flex gap-2">
                    {[0, 1].map(v => (
                      <button key={v} onClick={() => setPol2(v)}
                        className={`flex-1 py-1 rounded text-[9px] font-bold border transition-all ${pol2 === v ? "border-emerald-400/50 text-emerald-400 bg-emerald-400/10" : "border-white/10 text-white/20"}`}>
                        {polToStr(v)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border border-white/5 rounded-lg px-3 py-2 text-center" style={{ background: `${nmToColor(nm2)}10` }}>
                  <div className="text-[8px] text-white/20 mb-0.5">Ψ₂</div>
                  <div className="text-[11px] font-bold" style={{ color: nmToColor(nm2) }}>Ψ({wdm2},{oam2},{polToStr(pol2)})</div>
                  <div className="text-[8px] text-white/25">λ={nm2}nm</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simultaneous streams demo */}
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Radio size={9} /> Simultaneous Orthogonal Streams — same λ=620nm fibre
          </div>
          <div className="border border-white/8 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-white/5 text-[8px] text-white/20 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              All four streams share wdm=60 (λ=620nm). Each is isolated by OAM and/or polarisation — orthogonal by A2.
            </div>
            {DEMO_STREAMS.map((s, idx) => {
              const nm = nmFromWdm(s.wdm);
              const col = nmToColor(nm);
              // inner products with all others
              const conflicts = DEMO_STREAMS.filter((_, i) => i !== idx && innerProduct(s.wdm, s.oam, s.pol, DEMO_STREAMS[i].wdm, DEMO_STREAMS[i].oam, DEMO_STREAMS[i].pol) === 1);
              return (
                <div key={idx} className="border-b border-white/5 last:border-0 px-4 py-3 flex items-center gap-4" style={{ background: col + "06" }}>
                  <div className="w-20 flex-shrink-0">
                    <div className="text-[8px] font-mono font-bold" style={{ color: col }}>Ψ({s.wdm},{s.oam},{polToStr(s.pol)})</div>
                    <div className="text-[6px] text-white/20">λ={nm}nm · ℓ={s.oam} · {polToStr(s.pol)}</div>
                  </div>
                  <div className="flex-1 text-[9px] text-white/40 font-mono truncate">{s.payload}</div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {conflicts.length === 0
                      ? <span className="flex items-center gap-1 text-[7px] text-emerald-400"><CheckCircle size={8} /> isolated</span>
                      : <span className="flex items-center gap-1 text-[7px] text-red-400"><XCircle size={8} /> conflict</span>}
                  </div>
                  {/* orthogonality to others */}
                  <div className="flex gap-1 flex-shrink-0">
                    {DEMO_STREAMS.map((t, ti) => {
                      if (ti === idx) return null;
                      const ip2 = innerProduct(s.wdm, s.oam, s.pol, t.wdm, t.oam, t.pol);
                      return (
                        <div key={ti} className={`w-4 h-4 rounded text-[6px] flex items-center justify-center font-bold ${ip2 === 0 ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                          {ip2}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="px-4 py-2 text-[7px] text-white/15 border-t border-white/5" style={{ background: "rgba(0,0,0,0.2)" }}>
              Inner product matrix: green 0 = orthogonal (no interference) · red 1 = same channel
            </div>
          </div>
        </div>

        {/* SOP vs TCP/IP */}
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <GitBranch size={9} /> SOP vs TCP/IP
          </div>
          <div className="border border-white/8 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 border-b border-white/8 text-[8px] text-white/25 uppercase tracking-widest">
              <div className="px-4 py-2">Aspect</div>
              <div className="px-4 py-2 border-l border-white/5">TCP/IP</div>
              <div className="px-4 py-2 border-l border-white/5 text-cyan-400/50">SOP</div>
            </div>
            {COMPARE.map(row => (
              <div key={row.aspect} className="grid grid-cols-3 border-b border-white/5 last:border-0 text-[8px]">
                <div className="px-4 py-2.5 text-white/30 font-bold">{row.aspect}</div>
                <div className="px-4 py-2.5 text-white/20 border-l border-white/5">{row.tcp}</div>
                <div className="px-4 py-2.5 text-cyan-300/60 border-l border-white/5">{row.sop}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Protocol Stack */}
        <div>
          <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap size={9} /> SOP Protocol Stack
          </div>
          <div className="border border-white/8 rounded-xl overflow-hidden">
            {[
              { layer: "L5", name: "Application",          desc: "User data, WavelengthScript programs, governance proposals", color: "#a78bfa", impl: "WavelengthScript VM, Governance, P2P Media" },
              { layer: "L4", name: "Spectral Addressing",  desc: "CE→SE derives Ψ(wdm,oam,pol) from content. No DNS. No IANA.", color: "#22d3ee", impl: "ceEncode() · WNSP-CE v1.0 · WNSP-SE v1.0" },
              { layer: "L3", name: "Orthogonal Routing",   desc: "Adaptive weight routing across orthogonal channels. Hysteresis-governed, attractor-classified.", color: "#34d399", impl: "Spectral Router · weight/(Δλ+1) · H∈[0.88,0.92]" },
              { layer: "L2", name: "Channel Isolation",    desc: "⟨Ψᵢ|Ψⱼ⟩ = δᵢⱼ. Orthogonal channels do not interfere. No collision detection.", color: "#fb923c", impl: "Physics — Maxwell equations" },
              { layer: "L1", name: "Physical Medium",      desc: "Silicon (today via TCP/IP overlay). Photonic waveguide (PHR-1 ~2032).", color: "#f87171", impl: "WNSP Bridge · TCP/IP overlay · wnsp:// URIs" },
            ].map(l => (
              <div key={l.layer} className="border-b border-white/5 last:border-0 px-4 py-3 flex items-start gap-4" style={{ background: l.color + "05" }}>
                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-[8px] font-bold border" style={{ borderColor: l.color + "40", color: l.color }}>
                  {l.layer}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold mb-0.5" style={{ color: l.color }}>{l.name}</div>
                  <div className="text-[8px] text-white/30 mb-1">{l.desc}</div>
                  <div className="text-[7px] text-white/15 font-mono">{l.impl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* footer note */}
        <div className="border border-white/5 rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="text-white/20 text-[9px] leading-relaxed">
            SOP v1.0 · AGPL-3.0 · NexusOS · Genesis Ψ(228,45,H) · λ≈737.6nm<br />
            The orthogonality of the visible spectrum is a physical fact. This protocol is a formal specification of that fact applied to communication.<br />
            Silicon encodes today. Photons carry natively from ~2032. The address space does not change.
          </div>
        </div>

      </div>
    </div>
  );
}
