import { Link } from "wouter";
import { useState } from "react";
import { ExternalLink, Layers, Code2, Zap, ChevronRight, Globe, Shield } from "lucide-react";

// ── Founding shareholder registry — data fixed at 2026-06-17 ──────────────
// Founding era closed. All 21 wallets received NXT during the genesis period.
// No new founding allocations are possible; future NXT is earned through the protocol.

const TOTAL_SUPPLY  = 21_000_000_000;
const DISCLOSURE_DATE = "2026-06-17";

const SHAREHOLDERS = [
  { rank: 1,  username: "Dsmart",       band: "SYSTEM", nxt: 500_000_977.73, joined: "2026-06-11", wallet: "NXT-0FVT-J1JE-G833-6JAKS" },
  { rank: 2,  username: "Over3496",     band: "KERNEL", nxt: 500_000_000.00, joined: "2026-04-26", wallet: "NXT-3AVX-1ZSN-YHWW-WI5C1" },
  { rank: 3,  username: "jefffay95",    band: "GUEST",  nxt: 500_000_000.00, joined: "2026-04-29", wallet: "NXT-VSE3-KASG-PGZX-11CO0" },
  { rank: 4,  username: "test",         band: "USER",   nxt: 500_000_000.00, joined: "2026-05-06", wallet: "NXT-P0JG-WQ00-6PYX-W6VDT" },
  { rank: 5,  username: "Reti",         band: "USER",   nxt: 500_000_000.00, joined: "2026-06-16", wallet: "NXT-DJ4M-UU14-G4KI-SAU8J" },
  { rank: 6,  username: "Leps",         band: "KERNEL", nxt: 500_000_000.00, joined: "2026-05-11", wallet: "NXT-PMPD-U9FC-XPQT-X8M8Q" },
  { rank: 7,  username: "b546***",      band: "GUEST",  nxt: 500_000_000.00, joined: "2026-06-08", wallet: "NXT-75PK-SQBK-52AX-GQIUF" },
  { rank: 8,  username: "probandonexus",band: "SYSTEM", nxt: 500_000_000.00, joined: "2026-06-08", wallet: "NXT-K30M-X18V-DH6N-WXU1R" },
  { rank: 9,  username: "Shusha",       band: "SYSTEM", nxt: 500_000_000.00, joined: "2026-04-14", wallet: "NXT-8F85-AS05-VZMH-SMEEJ" },
  { rank: 10, username: "Dr.Malito",    band: "USER",   nxt: 500_000_000.00, joined: "2026-06-11", wallet: "NXT-ED3M-3WI8-QXLH-JDXMI" },
  { rank: 11, username: "mudiga",       band: "SYSTEM", nxt: 500_000_000.00, joined: "2026-06-11", wallet: "NXT-162I-L4LL-W9AY-G51MU" },
  { rank: 12, username: "shazmataz",    band: "GUEST",  nxt: 500_000_000.00, joined: "2026-06-14", wallet: "NXT-4560-LRGU-Q65R-12U1S" },
  { rank: 13, username: "Oogee",        band: "SYSTEM", nxt: 500_000_000.00, joined: "2026-06-15", wallet: "NXT-45Z0-CDBS-UR2I-0RMC3" },
  { rank: 14, username: "trixie",       band: "KERNEL", nxt: 500_000_000.00, joined: "2026-06-15", wallet: "NXT-WKKU-Q8BX-36ND-1U129" },
  { rank: 15, username: "emzy",         band: "USER",   nxt: 499_999_995.87, joined: "2026-06-14", wallet: "NXT-LJ7H-W06I-EOIH-6FOAO" },
  { rank: 16, username: "nikita",       band: "USER",   nxt: 499_999_899.00, joined: "2026-06-11", wallet: "NXT-YPTM-NVWJ-QOXS-EXP3W" },
  { rank: 17, username: "nathaniel***", band: "USER",   nxt: 497_939_500.00, joined: "2026-06-11", wallet: "NXT-VXER-CQ1M-OAO3-AVKT5" },
  { rank: 18, username: "derekdaman",   band: "KERNEL", nxt: 400_000_000.00, joined: "2026-06-15", wallet: "NXT-GCEB-L49R-3IB1-BMELP" },
  { rank: 19, username: "awa",          band: "KERNEL", nxt: 399_884_598.00, joined: "2026-06-12", wallet: "NXT-DXU3-2FZV-5180-Q3F42" },
  { rank: 20, username: "Nexus",        band: "SYSTEM", nxt: 229_933_504.00, joined: "2026-06-07", wallet: "NXT-NEXS-OS1K-7F3A-OMEGA" },
  { rank: 21, username: "UncJuddy",     band: "USER",   nxt: 199_989_869.90, joined: "2026-06-03", wallet: "NXT-VNHY-979Z-91CS-6AI76" },
];

const BAND_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  SYSTEM: { bg: "bg-violet-900/30", text: "text-violet-300", dot: "bg-violet-400" },
  KERNEL: { bg: "bg-cyan-900/30",   text: "text-cyan-300",   dot: "bg-cyan-400"   },
  USER:   { bg: "bg-green-900/30",  text: "text-green-300",  dot: "bg-green-400"  },
  GUEST:  { bg: "bg-slate-800/50",  text: "text-slate-400",  dot: "bg-slate-500"  },
};

const totalAllocated = SHAREHOLDERS.reduce((s, h) => s + h.nxt, 0);
const remaining      = TOTAL_SUPPLY - totalAllocated;
const pctAllocated   = (totalAllocated / TOTAL_SUPPLY * 100).toFixed(2);
const pctRemaining   = (remaining / TOTAL_SUPPLY * 100).toFixed(2);

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(3) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  return n.toLocaleString();
}

export default function ShareholdersPage() {
  const [showWallets, setShowWallets] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Header ── */}
      <div className="border-b border-slate-800/60 bg-slate-950/90 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/crowdfund">
            <span className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm">← Crowdfund</span>
          </Link>
          <span className="text-xs font-mono text-slate-500">PUBLIC DISCLOSURE · {DISCLOSURE_DATE}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">

        {/* ── Hero ── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-900/20 text-amber-400 text-xs mb-6 font-mono uppercase tracking-widest">
            <Shield className="w-3 h-3" /> Founding Shareholder Registry
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            NXT Blockchain Shareholders
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            These 21 wallets are the founding shareholders of the NexusOS blockchain.
            Each holds NXT — the native token — as their stake in the network.
            The founding era is now closed.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-400/70 font-mono">No new founding allocations possible from {DISCLOSURE_DATE}</span>
          </div>
        </div>

        {/* ── Supply summary ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Founding Shareholders", value: "21", sub: "wallet holders" },
            { label: "NXT Distributed",  value: fmt(totalAllocated), sub: `${pctAllocated}% of supply` },
            { label: "NXT Remaining",    value: fmt(remaining),      sub: `${pctRemaining}% in protocol` },
            { label: "Total Supply",     value: "21B NXT",            sub: "hard cap · 8 decimals" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-center">
              <div className="text-2xl font-bold text-white font-mono">{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Supply bar ── */}
        <div className="mb-12 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex justify-between text-xs text-slate-500 mb-2 font-mono">
            <span>Founding allocation — {pctAllocated}%</span>
            <span>Protocol reserve — {pctRemaining}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              style={{ width: `${pctAllocated}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-600 mt-3 text-center">
            Remaining {fmt(remaining)} NXT accumulates in the orbital_treasury through protocol fee flows
          </p>
        </div>

        {/* ── Shareholder table ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Founding Wallet Registry</h2>
            <button
              onClick={() => setShowWallets(!showWallets)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors font-mono"
              data-testid="button-toggle-wallets"
            >
              {showWallets ? "Hide" : "Show"} wallet addresses
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-10">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Holder</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Band</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">NXT Balance</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">% Supply</th>
                  {showWallets && <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Wallet Address</th>}
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody>
                {SHAREHOLDERS.map((h, i) => {
                  const bs = BAND_STYLE[h.band] ?? BAND_STYLE.USER;
                  const pct = (h.nxt / TOTAL_SUPPLY * 100).toFixed(4);
                  return (
                    <tr
                      key={h.rank}
                      className={`border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors ${i % 2 === 0 ? "" : "bg-slate-900/20"}`}
                      data-testid={`row-shareholder-${h.rank}`}
                    >
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{h.rank}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white text-sm">{h.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${bs.bg} ${bs.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${bs.dot}`} />
                          {h.band}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-white">
                        {h.nxt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{pct}%</td>
                      {showWallets && (
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{h.wallet}</td>
                      )}
                      <td className="px-4 py-3 text-right text-xs text-slate-500 font-mono">{h.joined}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── What shareholders own ── */}
        <div className="grid md:grid-cols-3 gap-4 mb-16">
          {[
            {
              title: "Governance Votes",
              desc: "NXT holders vote on the 11 live protocol parameters — fee rates, burn ratios, authority band thresholds. Voting weight is proportional to spectral authority band.",
              icon: "⚖️",
            },
            {
              title: "Fee Revenue Share",
              desc: "All protocol fees flow to the orbital_treasury. Staked NXT earns yield from this pool — the more the network is used, the more shareholders earn.",
              icon: "⚡",
            },
            {
              title: "Physics Authority",
              desc: "Each wallet has a unique Ψ channel derived from their spectral band. Higher band = shorter wavelength = higher energy = more authority in the physics layer.",
              icon: "🌊",
            },
          ].map(f => (
            <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* ── WavelengthScript as the everyday tool ── */}
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 via-slate-900 to-violet-900/10 p-8 mb-10">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-900/40 flex items-center justify-center shrink-0">
              <Code2 className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">WavelengthScript — The Everyday Tool</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                The mechanism that attracts momentum. WavelengthScript is the intermediate interpreter
                that bridges every current software language into the NexusOS physics stack.
                Developers don't rewrite their code — they execute it through WavelengthScript.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">How it works</div>
              {[
                ["1. Paste any language", "Python, JS, Rust, Go — anything"],
                ["2. Transpile → WavelengthScript", "Your logic mapped to spectral operations"],
                ["3. Compile → bytecode", "Physics-native instruction set"],
                ["4. Execute in WNSP VM", "Runs on Ψ channel registers — not CPU registers"],
              ].map(([step, desc]) => (
                <div key={step} className="flex items-start gap-3 mb-3 last:mb-0">
                  <ChevronRight className="w-3 h-3 text-cyan-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">{step}</div>
                    <div className="text-[11px] text-slate-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Why this matters</div>
              <p className="text-[12px] text-slate-400 leading-relaxed mb-3">
                Every developer tool today targets a CPU. WavelengthScript targets a <em className="text-cyan-300">wavelength</em>.
                When photonic ASICs arrive (~2032), no rewrite is needed — the architecture already speaks in wavelengths.
              </p>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                Shareholders fund this bridge layer. Developers using the API generate fees.
                Fees flow to the orbital_treasury. Treasury yields return to shareholders.
                That's the loop.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/ce-se-pipeline">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all" data-testid="button-try-pipeline">
                <Zap className="w-4 h-4" /> Try the Pipeline
              </button>
            </Link>
            <Link href="/wavelength-lang">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-semibold transition-all" data-testid="button-view-spec">
                <Code2 className="w-4 h-4" /> Language Spec
              </button>
            </Link>
            <Link href="/developer">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-semibold transition-all" data-testid="button-developer-api">
                <Globe className="w-4 h-4" /> Developer API
              </button>
            </Link>
          </div>
        </div>

        {/* ── Legal note ── */}
        <div className="text-center">
          <p className="text-[11px] text-slate-600 max-w-2xl mx-auto leading-relaxed">
            This registry is a voluntary public disclosure of founding NXT allocations on the NexusOS blockchain.
            NXT is a utility token powering the WNSP spectral protocol. Holding NXT does not constitute an
            investment contract, equity, or debt instrument. The founding era closed on {DISCLOSURE_DATE}.
            All future NXT must be earned or purchased through the protocol.
            AGPL-3.0 · wnsp.io
          </p>
        </div>

      </div>
    </div>
  );
}
