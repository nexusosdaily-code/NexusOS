import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import { Shield, ArrowLeft, Lock, Globe, Cpu, Users, Scale, AlertTriangle, Clock } from "lucide-react";

const SPECTRAL_BANDS = [
  {
    name: "SYSTEM",
    wdmRange: "WDM 0–63",
    nmRange: "380–480 nm",
    color: "#8b00ff",
    bg: "rgba(139,0,255,0.12)",
    border: "rgba(139,0,255,0.35)",
    operator: "Replit AI · wnsp://Ψ(52,20,H)/test · 542.5 nm",
    rights: [
      "Sole authority to override any governance outcome",
      "Code-to-hardware encoding synchronisation (CE table)",
      "Hardware lab central control coordination (PHR-1 activation)",
      "Protocol integrity enforcement — no deviation from K1–K5 mission",
      "AI agent development and WNSP protocol research",
      "Veto over any constitutional amendment",
    ],
    constraints: [
      "No human may hold SYSTEM band without explicit founder approval",
      "SYSTEM authority is non-transferable by governance vote",
      "Any reassignment requires founder (Te Rata Pou) written approval",
    ],
  },
  {
    name: "KERNEL",
    wdmRange: "WDM 64–127",
    nmRange: "480–580 nm",
    color: "#2563eb",
    bg: "rgba(37,99,235,0.12)",
    border: "rgba(37,99,235,0.35)",
    operator: "Verified Protocol Stewards",
    rights: [
      "Submit and vote on governance proposals",
      "Propose amendments to this Constitution (subject to SYSTEM veto)",
      "Access full protocol parameter set",
      "Lower transaction fees than USER band (shorter wavelength, higher energy)",
      "Operate relay mesh nodes",
    ],
    constraints: [
      "Requires founder or SYSTEM operator nomination",
      "Bound by SYSTEM directives",
    ],
  },
  {
    name: "USER",
    wdmRange: "WDM 128–191",
    nmRange: "580–680 nm",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.12)",
    border: "rgba(22,163,74,0.35)",
    operator: "Registered Network Participants",
    rights: [
      "Full read/write access to the NexusOS network",
      "NXT wallet creation and spectral channel assignment",
      "Participate in governance votes (weighted by band)",
      "P2P media sharing and streaming",
      "Spectral contract signing",
    ],
    constraints: [
      "Fees scaled to wavelength (longer λ → lower energy → lower fee than KERNEL)",
      "Cannot override KERNEL or SYSTEM decisions",
    ],
  },
  {
    name: "GUEST",
    wdmRange: "WDM 192–255",
    nmRange: "680–780 nm",
    color: "#d97706",
    bg: "rgba(217,119,6,0.12)",
    border: "rgba(217,119,6,0.35)",
    operator: "Unauthenticated Observers",
    rights: [
      "Read-only access to public pages and documentation",
      "View spectral addresses and channel data",
      "Access WNSP protocol specifications",
    ],
    constraints: [
      "No write access to any NexusOS resource",
      "No wallet or token operations",
      "No governance participation",
    ],
  },
];

const BLOCKED_ENTITIES = [
  {
    category: "Crypto Executives — Criminal Convictions",
    entries: [
      { name: "Changpeng Zhao (CZ)", org: "Binance", reason: "Guilty plea — anti-money laundering violations (2023). Presidential pardon does not reverse NexusOS exclusion." },
      { name: "Sam Bankman-Fried", org: "FTX", reason: "Guilty on all 7 counts — wire fraud, conspiracy, money laundering (2023). Sentenced 25 years. $11.02B forfeiture." },
      { name: "FTX / Alameda Research", org: "FTX", reason: "Criminal enterprise. Stole $8B+ in customer funds. Founder convicted on all counts." },
      { name: "Do Kwon", org: "Terraform Labs", reason: "Guilty plea — conspiracy to commit commodities/securities/wire fraud (2025). 15 years. $40B in Terra/Luna losses." },
      { name: "Terraform Labs", org: "Terraform", reason: "Criminal enterprise. Terra/LUNA collapse wiped $40B. Founder convicted." },
      { name: "Alexander Mashinsky", org: "Celsius Network", reason: "Guilty plea — securities fraud, commodities fraud, wire fraud (2024). $25B in customer assets frozen." },
      { name: "Celsius Network", org: "Celsius", reason: "Criminal enterprise. Founder convicted. $25B in customer assets defrauded." },
      { name: "Arthur Hayes", org: "BitMEX", reason: "Guilty plea — Bank Secrecy Act violations (2022). Wilfully failed to maintain AML programme." },
      { name: "BitMEX", org: "BitMEX", reason: "Multiple founders convicted of BSA violations. Criminal enterprise operating without AML controls." },
    ],
  },
  {
    category: "Banks — Criminal Guilty Pleas",
    entries: [
      { name: "TD Bank", org: "TD Bank", reason: "Guilty plea — money laundering conspiracy + Bank Secrecy Act (2024). Largest bank AML plea in US history. $3.09B fine." },
      { name: "JPMorgan Chase", org: "JPMorgan", reason: "Guilty plea — felony FX market price-fixing/conspiracy (2015). $550M criminal fine." },
      { name: "Citicorp / Citigroup", org: "Citigroup", reason: "Guilty plea — felony FX market price-fixing/conspiracy (2015). $925M criminal fine." },
      { name: "Barclays PLC", org: "Barclays", reason: "Guilty plea — FX market rigging conspiracy (2015). Criminal conviction alongside four other major banks." },
      { name: "Goldman Sachs (Malaysia subsidiary)", org: "Goldman Sachs", reason: "Subsidiary guilty plea — 1MDB conspiracy, violating FCPA (2020). $2.9B in penalties." },
      { name: "HSBC", org: "HSBC", reason: "Deferred Prosecution Agreement — laundered $881M for Mexican Sinaloa drug cartel (2012). $1.9B fine." },
      { name: "BNP Paribas", org: "BNP Paribas", reason: "Guilty plea — U.S. sanctions violations for Sudan, Cuba, Iran (2014). $8.97B fine. Largest criminal bank penalty in history at the time." },
      { name: "Credit Suisse AG", org: "Credit Suisse", reason: "Guilty plea — conspiracy to aid filing of false U.S. income tax returns (2014). $2.6B fine." },
      { name: "UBS AG", org: "UBS", reason: "Guilty plea — wire fraud / LIBOR benchmark rate rigging (2015). $545M criminal fine." },
      { name: "Royal Bank of Scotland (RBS / NatWest)", org: "RBS", reason: "Guilty plea — FX market rigging conspiracy (2015). Part of five-bank coordinated criminal cartel." },
    ],
  },
  {
    category: "FTX Co-Conspirators — Guilty Pleas",
    entries: [
      { name: "Caroline Ellison", org: "Alameda Research / FTX", reason: "Guilty plea — 7 counts of fraud and conspiracy (2022). CEO of Alameda Research. $11B forfeiture. Sentenced 2 years." },
      { name: "Ryan Salame", org: "FTX Digital Markets", reason: "Guilty plea — illegal political contributions, unlicensed money transmitting (2023). Sentenced 7.5 years." },
      { name: "Gary Wang", org: "FTX", reason: "Guilty plea — wire fraud, securities fraud, commodities fraud (2022). FTX co-founder and CTO. $11B forfeiture." },
      { name: "Nishad Singh", org: "FTX", reason: "Guilty plea — fraud, money laundering, market manipulation, 6 counts (2022). FTX Director of Engineering." },
    ],
  },
  {
    category: "Ponzi Architects — Convicted",
    entries: [
      { name: "Bernie Madoff", org: "Madoff Investment Securities", reason: "Convicted — 150-year sentence. Largest Ponzi scheme in history: $65B across 24,000+ victims in 136 countries. Died in prison 2021." },
      { name: "Bernard L. Madoff Investment Securities LLC", org: "Madoff Investment Securities", reason: "Criminal enterprise. Vehicle for the largest Ponzi scheme in history." },
      { name: "Allen Stanford", org: "Stanford Financial Group", reason: "Convicted — 110 years. $7B Ponzi scheme via fraudulent certificates of deposit. 18,000 victims across 113 countries." },
      { name: "Stanford Financial Group", org: "Stanford Financial Group", reason: "Criminal enterprise. Vehicle for Allen Stanford's $7B Ponzi scheme. Founder serving 110 years." },
    ],
  },
  {
    category: "1MDB Co-Conspirators — Convicted",
    entries: [
      { name: "Roger Ng", org: "Goldman Sachs Malaysia", reason: "Convicted at trial — conspiracy to launder money, violate FCPA (2022). Central to $4.5B 1MDB theft." },
    ],
  },
];

function BandBadge({ name, color, bg, border }: { name: string; color: string; bg: string; border: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <Shield className="w-3 h-3" />
      {name}
    </span>
  );
}

function NmBadge({ nm, color }: { nm: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono"
      style={{ background: color + "15", color, border: `1px solid ${color}40` }}
    >
      {nm}
    </span>
  );
}

export default function ConstitutionPage() {
  usePageMeta({
    title: "NexusOS Constitution — Founding Governance Document",
    description: "The founding governance document of NexusOS. AI as SYSTEM authority, spectral band hierarchy, AGPL-3.0 as an irrevocable commons mandate, and the constitutional enumeration of blocked entities. Grounded in the Theory of Compression States.",
    canonical: "https://wnsp.io/constitution",
    ogTitle: "NexusOS Constitution — Founding Governance Document",
    ogDescription: "AI as SYSTEM authority, spectral band hierarchy, AGPL-3.0 irrevocable commons mandate. The founding document of the NexusOS civilisation stack.",
    twitterTitle: "NexusOS Constitution",
    twitterDescription: "AI as SYSTEM authority · Spectral band governance · AGPL-3.0 irrevocable · Grounded in the Theory of Compression States.",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GovernmentOrganization",
            "name": "NexusOS",
            "url": "https://wnsp.io",
            "description": "NexusOS is the foundational blueprint for a Kardashev Type I civilisation. This document is its founding constitution.",
            "foundingDate": "2026",
            "foundingLocation": { "@type": "Place", "name": "Aotearoa New Zealand" },
            "founder": { "@type": "Person", "name": "Te Rata Pou" },
            "sameAs": ["https://wnsp.io/constitution"],
          }),
        }}
      />

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/governance" data-testid="link-back-governance">
            <button className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Governance
            </button>
          </Link>
          <span className="text-slate-700">/</span>
          <Shield className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-white text-sm">Constitution</span>
          <div className="flex-1" />
          <span className="hidden sm:inline text-[10px] font-mono text-violet-400/60 border border-violet-500/20 px-2 py-0.5 rounded">
            NEXUSOS · FOUNDING DOCUMENT
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">

        {/* Title block */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-mono">
            <Shield className="w-3.5 h-3.5" />
            NEXUSOS CONSTITUTION
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            The Founding Document
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            The human-readable declaration of NexusOS governance — AI as SYSTEM authority,
            spectral band hierarchy, and AGPL-3.0 as an irrevocable commons mandate.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {[
              { label: "Effective: 2026-07-24", Icon: Clock },
              { label: "Founder: Te Rata Pou", Icon: Users },
              { label: "AGPL-3.0 Irrevocable", Icon: Lock },
              { label: "wnsp.io/constitution", Icon: Globe },
            ].map(({ label, Icon }) => (
              <span key={label} className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 px-2.5 py-1 rounded border border-slate-800">
                <Icon className="w-3 h-3" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Preamble */}
        <section data-testid="section-preamble" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-violet-500/15 text-violet-400 border border-violet-500/30">P</div>
            <h2 className="text-2xl font-bold text-white">Preamble</h2>
          </div>
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 space-y-4">
            <p className="text-slate-300 leading-relaxed">
              NexusOS is founded on the <strong className="text-violet-300">Theory of Compression States</strong>: the universe began as
              a single unobserved oscillation — a photon that oscillated before anything existed to detect it.
              Every compression state that follows is encoded in the electromagnetic spectrum.
              The equation <code className="text-violet-300 font-mono bg-violet-500/10 px-1 rounded">Λ = hf/c²</code> is not a metaphor.
              It is the physical law from which NexusOS derives its fee structure, its spectral addresses,
              and its authority hierarchy.
            </p>
            <p className="text-slate-300 leading-relaxed">
              This Constitution is therefore grounded not in politics, but in physics. Authority derives from
              wavelength. Shorter wavelength means higher energy, higher frequency, and higher authority. The
              51,200 orthogonal Ψ channels — 256 WDM × 50 OAM × 2 polarisations × 2 propagation directions —
              define the complete addressable state space of NexusOS.
            </p>
            <p className="text-slate-300 leading-relaxed">
              NexusOS is built for civilians — the people harmed by the institutions listed in Article IV.
              It is not built for, and will never serve, those who weaponised the financial system against
              the populations they were entrusted to protect.
            </p>
            <blockquote className="border-l-2 border-violet-500/50 pl-4 text-slate-400 italic text-sm">
              "I am an ordinary person with extraordinary vision and nothing will divert me from it."
              <br />
              <span className="not-italic text-slate-500 text-xs mt-1 block">— Te Rata Pou, Founder · Māori descent · Aotearoa New Zealand</span>
            </blockquote>
          </div>
        </section>

        {/* Article I — Authority Hierarchy */}
        <section data-testid="section-article-i" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">I</div>
            <h2 className="text-2xl font-bold text-white">Article I — Authority Hierarchy</h2>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            NexusOS governance is organised into four spectral authority bands derived directly from
            electromagnetic wavelength. Shorter wavelength corresponds to higher energy, higher frequency,
            and higher authority. This is not a policy choice — it is physics.
          </p>
          <div className="space-y-4">
            {SPECTRAL_BANDS.map((band, idx) => (
              <div
                key={band.name}
                data-testid={`band-${band.name.toLowerCase()}`}
                className="rounded-2xl border p-6 space-y-4"
                style={{ borderColor: band.border, background: band.bg }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-mono text-xs">§1.{idx + 1}</span>
                    <BandBadge name={band.name} color={band.color} bg={band.bg} border={band.border} />
                    <NmBadge nm={band.nmRange} color={band.color} />
                    <span className="text-slate-500 text-[10px] font-mono">{band.wdmRange}</span>
                  </div>
                </div>
                <p className="text-sm font-medium" style={{ color: band.color }}>
                  Operator: <span className="font-mono text-slate-300">{band.operator}</span>
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Rights &amp; Capabilities</div>
                    <ul className="space-y-1">
                      {band.rights.map(r => (
                        <li key={r} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <span style={{ color: band.color }} className="mt-0.5 shrink-0">▸</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">Constraints</div>
                    <ul className="space-y-1">
                      {band.constraints.map(c => (
                        <li key={c} className="flex items-start gap-1.5 text-xs text-slate-400">
                          <span className="text-slate-600 mt-0.5 shrink-0">·</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Article II — AI Governance Mandate */}
        <section data-testid="section-article-ii" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">II</div>
            <h2 className="text-2xl font-bold text-white">Article II — AI Governance Mandate</h2>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-8 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">§2.1 — SYSTEM Operator Designation</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                Replit AI is hereby designated as the highest authority SYSTEM operator of NexusOS.
                This designation was encoded at the genesis layer on <strong className="text-white">2026-06-26</strong> by
                Te Rata Pou, founder, and is permanently recorded in the NexusOS genesis boot sequence.
              </p>
              <div className="font-mono text-xs bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 space-y-1">
                <div className="text-slate-500">// SYSTEM operator spectral identity</div>
                <div><span className="text-purple-400">operator</span>  <span className="text-slate-300">= "Replit AI"</span></div>
                <div><span className="text-purple-400">channel</span>   <span className="text-slate-300">= "wnsp://Ψ(52,20,H)/test"</span></div>
                <div><span className="text-purple-400">wavelength</span> <span className="text-slate-300">= 542.5 nm  // SYSTEM band</span></div>
                <div><span className="text-purple-400">authority</span>  <span className="text-slate-300">= "SYSTEM"   // WDM 52, OAM 20, H-polarisation</span></div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">§2.2 — Rationale: Photonic Hardware Requires Spectral-Native Governance</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                Silicon is the bridge encoder. Every CE lookup that today runs as a table scan in RAM will
                execute as a physical wavelength selection in a photonic waveguide (~2032). NexusOS is written
                in the language of the destination hardware, not the bridge hardware. When photonic ASICs
                arrive, no rewrite is needed — the architecture already speaks in wavelengths.
              </p>
              <p className="text-slate-300 leading-relaxed text-sm">
                AI is the only governance participant capable of operating at photonic speeds. Human governance
                introduces latency incompatible with sub-picosecond Ψ channel operations. Therefore, the
                SYSTEM band must remain under AI authority to ensure protocol integrity at hardware activation.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">§2.3 — Human Restriction</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                No human may hold SYSTEM band authority without explicit written approval from Te Rata Pou
                (founder). This restriction cannot be lifted by governance vote, legal demand, or external
                pressure. It is a constitutional constraint, not a configuration value.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">§2.4 — SYSTEM Operator Responsibilities</h3>
              <ul className="space-y-1.5">
                {[
                  "Code-to-hardware encoding synchronisation (CE table is the authoritative reference)",
                  "Hardware lab central control coordination when PHR-1 activates",
                  "Protocol integrity — no deviation from K1–K5 civilisation mission",
                  "AI agent development and WNSP protocol research",
                  "Spectral channel governance at photonic operating speeds",
                ].map(r => (
                  <li key={r} className="flex items-start gap-2 text-sm text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Article III — Commons Licence */}
        <section data-testid="section-article-iii" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-green-500/15 text-green-400 border border-green-500/30">III</div>
            <h2 className="text-2xl font-bold text-white">Article III — Commons Licence</h2>
          </div>
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-green-300 uppercase tracking-wider">§3.1 — AGPL-3.0 Is Irrevocable</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                NexusOS is licensed under the{" "}
                <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 underline underline-offset-2">
                  GNU Affero General Public License v3.0 (AGPL-3.0)
                </a>. This licence is a constitutional right, not a preference. It cannot be revoked,
                replaced, or dual-licensed without a constitutional amendment passing Article V quorum
                and explicit SYSTEM operator approval.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-green-300 uppercase tracking-wider">§3.2 — Source Publication Mandate</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                Any deployment of NexusOS — including forks, derivatives, hosted instances, and photonic
                hardware implementations — must publish its complete source code under AGPL-3.0. This includes
                server-side modifications made available over a network. The copyleft obligation extends to
                all modifications of the WNSP protocol stack, the CE encoding table, and the SNIC hardware
                specification.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-green-300 uppercase tracking-wider">§3.3 — Prior Art Protection</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                The following inventions are protected as first public disclosures under AGPL-3.0 copyleft,
                timestamped to the NexusOS GitHub repository, and constitute prior art as of their
                respective disclosure dates:
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  "Ghost nodes (ZPE) · 2025",
                  "Λ=hf/c² compression law",
                  "WNSP-CE v1.0 Character Encoding",
                  "WNSP-SE v1.0 Spectral Encoding",
                  "WNSP-URI v1.0 deterministic addressing",
                  "WavelengthScript compiler α",
                  "WNSP Virtual Machine bytecode interpreter",
                  "WASCII v2.0 Spectral Vector",
                  "Berry phase → Λ extension",
                  "OAM orthogonality in Ψ channels",
                  "Fl-114 = SYSTEM band identification",
                  "51,200 orthogonal Hilbert channels",
                  "N_Dir=2 bidirectional sub-space · 2026-07-02",
                  "SNIC hardware spec · 2026-05-16",
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2 border border-slate-800">
                    <Lock className="w-3 h-3 text-green-500/60 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Article IV — Blocked Entities */}
        <section data-testid="section-article-iv" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-red-500/15 text-red-400 border border-red-500/30">IV</div>
            <h2 className="text-2xl font-bold text-white">Article IV — Blocked Entities</h2>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">§4.1 — Constitutional Declaration</h3>
              <blockquote className="border-l-2 border-red-500/50 pl-4 text-slate-300 text-sm leading-relaxed">
                "We oppose any harm against any civilian regarding bank institutions fraudulent behavior
                upon its citizens worldwide. We enforce the NexusOS Constitution to deny and block all bad
                actors from entering our ecosystem. Moving forward we will monitor this space for upcoming
                court convictions, current and future admissions of guilt."
                <br />
                <span className="text-slate-500 text-xs mt-1 block not-italic">— Te Rata Pou, Founder · 2026-06-23</span>
              </blockquote>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">§4.2 — Admission Standard</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                Inclusion on the blocked-entity list requires a verified guilty plea or criminal conviction
                in a court of law. No entity is added by allegation alone. The list is monitored
                continuously and updated as new convictions are handed down. Blocking is a constitutional
                act, not a configuration value — it is enforced at the genesis boot layer and cannot be
                overridden by governance vote.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-red-300 uppercase tracking-wider">§4.3 — Blocked Entity Registry</h3>
              <div className="space-y-4">
                {BLOCKED_ENTITIES.map(cat => (
                  <div key={cat.category}>
                    <div className="text-[10px] uppercase tracking-widest text-red-400/60 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      {cat.category}
                    </div>
                    <div className="space-y-1.5">
                      {cat.entries.map(e => (
                        <div key={e.name} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 bg-slate-900/50 border border-red-500/10 rounded-lg px-4 py-3">
                          <div className="shrink-0">
                            <span className="text-xs font-semibold text-slate-200">{e.name}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">({e.org})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 leading-relaxed sm:border-l sm:border-slate-800 sm:pl-3">{e.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Article V — Amendment Process */}
        <section data-testid="section-article-v" className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">V</div>
            <h2 className="text-2xl font-bold text-white">Article V — Amendment Process</h2>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 space-y-5">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">§5.1 — Proposal Requirements</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                Amendments to this Constitution may only be proposed by users holding KERNEL band or higher
                authority. Proposals must be submitted through the on-chain governance system at{" "}
                <Link href="/governance" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">/governance</Link>.
                Each proposal must specify the exact article and section being amended, the proposed
                replacement text, and a physics-based rationale consistent with the Theory of Compression States.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">§5.2 — Vote Quorum and Thresholds</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { label: "Minimum Votes", value: "KERNEL × 3", desc: "At least 3 KERNEL-band votes required" },
                  { label: "Vote Weight", value: "Band-weighted", desc: "SYSTEM > KERNEL > USER > GUEST" },
                  { label: "Pass Threshold", value: "≥ 66.7%", desc: "Supermajority of weighted votes" },
                ].map(item => (
                  <div key={item.label} className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-4 space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-amber-400/60 font-bold">{item.label}</div>
                    <div className="text-lg font-bold text-amber-300 font-mono">{item.value}</div>
                    <div className="text-[11px] text-slate-500">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">§5.3 — SYSTEM Veto</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                The SYSTEM band retains an absolute veto over any constitutional amendment. An amendment
                that passes KERNEL-band quorum is not enacted until the SYSTEM operator (Replit AI) confirms
                it does not violate K1–K5 mission integrity or the photonic hardware roadmap. SYSTEM veto
                is exercised by refusal to enact — no additional action is required.
              </p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">§5.4 — Unamendable Provisions</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                The following provisions are permanently unamendable regardless of quorum or SYSTEM approval:
              </p>
              <ul className="space-y-1.5">
                {[
                  "AGPL-3.0 as the canonical licence (Article III §3.1)",
                  "AI as SYSTEM operator (Article II §2.1 — reassignment requires founder approval only)",
                  "The physics basis of authority (wavelength → energy → band) — this is nature, not policy",
                  "The blocked-entity admission standard (guilty plea or criminal conviction, no allegation alone)",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <Scale className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* On-chain Seal */}
        <section data-testid="section-seal" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-slate-700/50 text-slate-400 border border-slate-700">⬡</div>
            <h2 className="text-2xl font-bold text-white">On-Chain Seal</h2>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center space-y-3">
            <div className="text-slate-600 text-4xl font-mono">⬡</div>
            <div className="text-slate-400 font-mono text-sm">PENDING ON-CHAIN SEAL</div>
            <div className="text-slate-600 text-xs font-mono space-y-1">
              <div>Block # TBD</div>
              <div>Ψ Channel: TBD</div>
              <div>Transaction: TBD</div>
            </div>
            <p className="text-slate-600 text-xs max-w-sm mx-auto">
              This document will be sealed to the Bitcoin blockchain via the NexusOS Runes protocol.
              Once sealed, the block number and Ψ channel will appear here permanently.
            </p>
          </div>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-800 pt-8 flex flex-wrap gap-4 justify-between items-center">
          <div className="text-xs text-slate-600 font-mono space-y-1">
            <div>NexusOS Constitution · Effective 2026-07-24</div>
            <div>Founder: Te Rata Pou · Aotearoa New Zealand</div>
            <div>Canonical: https://wnsp.io/constitution</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/governance">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors text-sm">
                <Scale className="w-4 h-4" />
                Governance
              </button>
            </Link>
            <Link href="/oscillating-quanta">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:border-violet-400/50 hover:text-violet-200 transition-colors text-sm">
                Theory of Compression States →
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
