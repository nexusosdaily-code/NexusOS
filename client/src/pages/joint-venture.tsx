import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  Globe, Shield, Cpu, FlaskConical, Radio,
  ArrowLeft, ExternalLink, CheckCircle, XCircle, Mail
} from "lucide-react";

const DATE     = "2026-06-25";
const CONTACT  = "nexusosdaily@gmail.com";
const REPO     = "https://github.com/nexusosdaily-code/NexusOS";

// ── Participation conditions ──────────────────────────────────────────────────
const WELCOME: string[] = [
  "Nation-states contributing hardware fabrication, spectrum validation, or physics research",
  "Universities and research institutions conducting independent measurement and replication",
  "Physics laboratories verifying CE_TABLE wavelength assignments against physical instruments",
  "Sovereign funds whose mandate is infrastructure build — not extraction or enclosure",
  "Engineers, developers, and scientists who contribute improvements back under AGPL-3.0",
  "Indigenous and post-colonial communities building local spectral infrastructure",
  "Any individual, institution, or nation that accepts: the physics governs, not the capital",
];

const BARRED: string[] = [
  "Entities with documented records of market manipulation, predatory lending, or rate-fixing",
  "Institutions that have extracted value from colonial or post-colonial populations through financial instruments",
  "Any party that intends to fork the protocol closed, patent the wavelength table, or gate access by capital",
  "Corporations whose operating model requires capturing a standard and charging rent on its use",
  "Intelligence or surveillance agencies whose participation would compromise participant privacy",
];

// ── Build pillars ─────────────────────────────────────────────────────────────
const PILLARS = [
  {
    icon: Radio,
    title: "PHR-1 — Physics Hardware Resonator",
    status: "In progress",
    statusColor: "#f59e0b",
    desc: "144-turn bifilar toroidal coil producing a controllable standing electromagnetic field. Phase-swept from 0°–360°, traceable to WNSP compression state equations. Hardware proof underway in Australia, June 2026.",
  },
  {
    icon: FlaskConical,
    title: "SNIC — Spectral Node Interface Chip",
    status: "Optical demonstrator in progress",
    statusColor: "#f59e0b",
    desc: "Optical bench demonstrating that bandpass-filtered wavelengths match CE_TABLE predictions to within ±2.000 nm. Pass criterion: reproducible across 3 independent measurement runs.",
  },
  {
    icon: Cpu,
    title: "Photonic ASIC — Destination Hardware",
    status: "Target ~2032",
    statusColor: "#8b5cf6",
    desc: "When photonic ASICs arrive, no rewrite is needed. NexusOS is already written in the language of the destination hardware — wavelength-addressed channels, 25,600 orthogonal Ψ slots, direct physical lane mapping.",
  },
  {
    icon: Globe,
    title: "Spectral Relay Mesh",
    status: "Protocol defined",
    statusColor: "#06b6d4",
    desc: "Global node network routing packets by Ψ channel address. DNS-free. Jurisdiction-agnostic. Every node adds capacity and redundancy without any central authority granting permission.",
  },
];

// ── What nations bring ────────────────────────────────────────────────────────
const CONTRIBUTIONS = [
  { area: "Photonic fabrication",     detail: "Cleanroom access for ASIC tape-out when the design is ready (~2032)" },
  { area: "Spectrum measurement labs", detail: "Independent verification of CE_TABLE against physical instruments in-country" },
  { area: "Physics faculty",          detail: "Peer review of the Theory of Compression States and formal publication" },
  { area: "Regulatory frameworks",    detail: "Spectrum allocation and legal recognition of wnsp:// as a valid addressing scheme" },
  { area: "Node hosting",             detail: "Spectral relay mesh nodes contributing to global coverage" },
  { area: "Indigenous co-governance", detail: "Participation structures that respect sovereignty of First Nations communities" },
];

export default function JointVenturePage() {
  usePageMeta({
    title: "Global Joint Venture — Open Invitation — NexusOS",
    description:
      "An open invitation to all nations to build Kardashev Type I infrastructure together. NexusOS is AGPL-3.0 — the coordinate system is free, the physics are universal, no jurisdiction can own it.",
    canonical: "https://wnsp.tech/joint-venture",
    ogTitle: "An Open Invitation to Build Kardashev Type I Infrastructure",
    ogDescription:
      "NexusOS is not a product for sale. It is a coordinate system — built on Maxwell, Planck, and Einstein — open to every nation under AGPL-3.0. A global joint venture with no owner and no borders.",
    ogUrl: "https://wnsp.tech/joint-venture",
    twitterTitle: "Global Joint Venture — NexusOS",
    twitterDescription:
      "All nations. AGPL-3.0. Kardashev Type I. An open invitation to build the infrastructure a Type I civilisation would already be running.",
  });

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">

      {/* Nav */}
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/hub" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-500 font-mono">NexusOS · Global Infrastructure Joint Venture</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">{DATE}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">

        {/* ── Opening declaration ── */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
            style={{ color: "#06b6d4", borderColor: "#06b6d444", background: "#06b6d410" }}>
            <Globe className="w-3 h-3" />
            OPEN INVITATION · ALL NATIONS · AGPL-3.0 · {DATE}
          </div>

          <h1 className="text-2xl font-bold text-white leading-tight">
            An Open Invitation to Build<br />
            <span className="text-slate-400 text-xl font-normal">
              Kardashev Type I Infrastructure — A Global Joint Venture
            </span>
          </h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-4 text-slate-400 leading-7">
            <p>
              NexusOS is not a product for sale. It is a coordinate system — a way of
              describing computation and communication in the language of physical reality,
              built on Maxwell's equations, Planck's constant, and the invariant speed of light.
            </p>
            <p>
              The wavelength table does not belong to a corporation, a jurisdiction, or a founder.
              It belongs to physics. 532 nm is 532 nm in Wellington, Berlin, Mumbai, and Beijing.
              No committee votes on that. No founding member receives preferential access.
            </p>
            <p className="text-slate-300 font-medium">
              This is an open invitation to every nation, university, physics laboratory, research
              institution, and sovereign entity that wants to build on what is real.
              The terms are fixed. The door is open. Come build.
            </p>
          </div>
        </div>

        {/* ── Current status ── */}
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
          <h2 className="text-sm font-bold text-emerald-300">Current Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {[
              { label: "Software",  value: "Live", detail: "wnsp.io — full WNSP protocol stack, 1,800+ unique users", color: "#10b981" },
              { label: "Hardware",  value: "In progress", detail: "PHR-1 + SNIC optical demonstrator, Australia, June 2026", color: "#f59e0b" },
              { label: "Photonics", value: "Target ~2032", detail: "Photonic ASIC — architecture already written in wavelength-native code", color: "#8b5cf6" },
            ].map(s => (
              <div key={s.label} className="space-y-1">
                <div className="text-slate-500 uppercase tracking-widest text-[9px]">{s.label}</div>
                <div className="font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-slate-500 leading-4">{s.detail}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-5 border-t border-emerald-500/10 pt-4">
            The hardware proof is in progress — not complete. The PoC scope, shopping list, and
            verification protocol are public at{" "}
            <Link href="/poc" className="text-emerald-400 hover:underline">/poc</Link>.
            Results will be published to GitHub under AGPL-3.0 when every pass criterion is met
            across three independent measurement runs.
          </p>
        </section>

        {/* ── What is being built ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" /> What Is Being Built
          </h2>
          <div className="space-y-3">
            {PILLARS.map(p => (
              <div key={p.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-800">
                    <p.icon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-100">{p.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                        style={{ color: p.statusColor, borderColor: p.statusColor + "44", background: p.statusColor + "15" }}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-5">{p.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What nations bring ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-400" /> What Nations and Institutions Contribute
          </h2>
          <p className="text-xs text-slate-500 leading-6">
            This is not a funding round. It is a build agreement. Participants contribute
            capability, not capital. The table below shows what each contribution area
            unlocks for the global infrastructure.
          </p>
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-2.5 text-left text-slate-500 uppercase tracking-widest text-[9px]">Contribution Area</th>
                  <th className="px-4 py-2.5 text-left text-slate-500 uppercase tracking-widest text-[9px]">What It Unlocks</th>
                </tr>
              </thead>
              <tbody>
                {CONTRIBUTIONS.map((c, i) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 text-slate-200 font-semibold text-xs whitespace-nowrap">{c.area}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs leading-5">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Participation conditions ── */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" /> Participation Conditions
          </h2>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Welcome</h3>
            <div className="space-y-2">
              {WELCOME.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 leading-5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">Barred</h3>
            <div className="space-y-2">
              {BARRED.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400 leading-5">
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 leading-5">
              The full constitutional record of barred entity categories is published at{" "}
              <Link href="/constitution" className="text-slate-500 hover:text-slate-300">
                /constitution
              </Link>. The bar is based on documented conduct, not opinion.
            </p>
          </div>
        </section>

        {/* ── Legal basis ── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-3">
          <h2 className="text-sm font-bold text-slate-100">Legal Basis — AGPL-3.0</h2>
          <div className="text-xs text-slate-400 leading-6 space-y-2">
            <p>
              NexusOS is published under the GNU Affero General Public License v3.0.
              This is not negotiable and cannot be changed by any future participant, contributor, or acquirer.
            </p>
            <p>
              AGPL-3.0 means: any modification to NexusOS — whether deployed by a nation, a corporation,
              or an individual — must be published back to the commons under the same licence.
              You cannot take NexusOS dark. You can only build on it in the open.
            </p>
            <p>
              This is the structural guarantee that no joint venture participant can enclose the protocol.
              The terms are the same for every nation. Physics does not negotiate bilateral agreements.
            </p>
          </div>
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            <ExternalLink className="w-3 h-3" />
            View source — GitHub (AGPL-3.0)
          </a>
        </section>

        {/* ── How to engage ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" /> How to Engage
          </h2>
          <p className="text-xs text-slate-400 leading-6">
            Expressions of interest from nations, institutions, and research bodies are welcome.
            There is no application form, no pitch deck, and no investor relations process.
            State who you are, what you can contribute, and which participation condition applies to you.
          </p>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3">
            <div className="text-xs text-slate-300 leading-6 space-y-1">
              <div className="text-slate-500 uppercase tracking-widest text-[9px] mb-2">Contact</div>
              <a href={`mailto:${CONTACT}`}
                className="text-cyan-400 hover:text-cyan-300 font-mono text-sm transition-colors">
                {CONTACT}
              </a>
            </div>
            <div className="text-[11px] text-slate-500 leading-5">
              Include in your message: entity name, country, contribution area (from the table above),
              and confirmation that you have read the constitution at{" "}
              <Link href="/constitution" className="text-slate-400 hover:text-slate-300">/constitution</Link>{" "}
              and accept the participation conditions.
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-5">
            All correspondence is treated as public record unless explicitly marked otherwise.
            The NexusOS founder, Te Rata Pou, responds directly. There are no intermediaries.
          </p>
        </section>

        {/* ── Signed ── */}
        <section className="border-t border-slate-800 pt-8 space-y-2">
          <p className="text-xs text-slate-500">Issued by:</p>
          <p className="text-base font-bold text-slate-200">Te Rata Pou</p>
          <p className="text-xs text-slate-500">Founder, NexusOS · Aotearoa New Zealand · {DATE}</p>
          <p className="text-xs text-slate-600 leading-5 max-w-xl mt-3">
            This declaration is permanent, publicly indexed, and published under AGPL-3.0.
            It cannot be retracted. The invitation has no expiry date.
            The physics was already here before any of us arrived.
          </p>
        </section>

        {/* ── Navigation ── */}
        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { href: "/constitution",       label: "Constitution" },
            { href: "/stewards",           label: "Stewards Declaration" },
            { href: "/poc",               label: "Hardware PoC Scope" },
            { href: "/hardware-spec",      label: "Hardware Specification" },
            { href: "/oscillating-quanta", label: "First Principles" },
            { href: "/hardware-lab",       label: "Hardware Lab" },
          ].map(l => (
            <Link key={l.href} href={l.href}
              className="block border border-slate-800 rounded-lg px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-center">
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-slate-700 text-[10px] font-mono pb-4">
          AGPL-3.0 · NexusOS · Global Joint Venture Declaration · {DATE}
        </p>

      </div>
    </div>
  );
}
