import { Link } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  ArrowLeft, Cpu, Zap, Radio, FlaskConical,
  Shield, Users, Heart, Globe, Star
} from "lucide-react";

const SIGNED_DATE = "2026-06-24";
const FOUNDER    = "Te Rata Pou";
const ORIGIN     = "Aotearoa New Zealand";

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-slate-300 text-sm leading-7">{children}</p>;
}

function Clause({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 text-sm leading-7">
      <span className="text-slate-600 font-mono pt-0.5 select-none w-5 flex-shrink-0">{n}.</span>
      <span className="text-slate-300">{children}</span>
    </div>
  );
}

function RoleCard({
  accent, icon: Icon, title, subtitle, carries, owns,
}: {
  accent: string; icon: any; title: string; subtitle: string;
  carries: string[]; owns: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ borderColor: accent + "33", background: accent + "08" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: accent + "22" }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100">{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        </div>
      </div>
      <div className="space-y-2">
        {carries.map((c, i) => (
          <div key={i} className="flex gap-2 items-start text-xs text-slate-400">
            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: accent }} />
            {c}
          </div>
        ))}
      </div>
      <div
        className="text-xs rounded-lg px-3 py-2 font-mono"
        style={{ background: accent + "15", color: accent }}
      >
        Owns: {owns}
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, accent }: { icon: any; title: string; accent: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b" style={{ borderColor: accent + "33" }}>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
      <h2 className="text-sm font-bold text-slate-100 tracking-wide">{title}</h2>
    </div>
  );
}

export default function StewardsPage() {
  usePageMeta({
    title: "Stewards of NexusOS — Founding Declaration",
    description:
      "A founding declaration from Te Rata Pou — designating the three stewards entrusted to carry NexusOS forward under AGPL-3.0. Written for civilian infrastructure, not capital.",
    canonical: "https://wnsp.tech/stewards",
    ogTitle: "Stewards of NexusOS — Founding Declaration",
    ogDescription:
      "Te Rata Pou's founding declaration designating the three stewards of NexusOS. AGPL-3.0 — no owner, no capital, only physics and the people who will carry it.",
    ogUrl: "https://wnsp.tech/stewards",
    twitterTitle: "Stewards of NexusOS — Founding Declaration",
    twitterDescription:
      "A founding declaration from Te Rata Pou — the three stewards entrusted to carry NexusOS when he is gone. AGPL-3.0.",
  });

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">

      {/* Nav */}
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/open" className="text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs text-slate-500 font-mono">NexusOS · Founding Document</span>
          <span className="ml-auto text-[10px] font-mono text-slate-600">{SIGNED_DATE}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-12">

        {/* ── Header ── */}
        <div className="space-y-5 text-center">
          <div
            className="inline-flex items-center gap-2 text-[10px] font-mono px-3 py-1 rounded-full border"
            style={{ color: "#06b6d4", borderColor: "#06b6d444", background: "#06b6d410" }}
          >
            <Star className="w-3 h-3" />
            FOUNDING DECLARATION · STEWARDS OF NEXUSOS
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
            To the three who will carry this<br />
            <span style={{ color: "#06b6d4" }}>when I am gone</span>
          </h1>

          <p className="text-slate-500 text-xs font-mono">
            Written by {FOUNDER} · {ORIGIN} · {SIGNED_DATE}
          </p>
        </div>

        <hr className="border-0 border-t border-slate-800" />

        {/* ── Opening ── */}
        <section className="space-y-4">
          <Para>
            I am writing this while I am alive and clear-headed, so there is no ambiguity
            about what NexusOS is, what it is for, and what it requires of the people who
            will hold it after me.
          </Para>
          <Para>
            This is not a job description. It is not a pitch deck. It is a founding
            document — the kind you write when you understand that some work outlasts any
            one person, and that the people who carry it forward need to know exactly what
            they are carrying and why.
          </Para>
          <Para>
            If you are reading this and something in it speaks to you — the physics, the
            hardware destination, the scale of the mission — then you may be one of the
            three this is written for.
          </Para>
        </section>

        {/* ── What NexusOS Is ── */}
        <section className="space-y-4">
          <SectionHeading icon={Globe} title="What NexusOS Is" accent="#06b6d4" />
          <Para>
            NexusOS is the foundational operating system for a Kardashev Type I
            civilisation. It replaces cryptographic hashing — the language of silicon —
            with electromagnetic wave physics: the language of light. Every address, every
            transaction, every communication in NexusOS traces back to Maxwell's
            equations, not to mathematical convention.
          </Para>
          <Para>
            The core protocol, WNSP, defines 25,600 orthogonal communication channels
            across 256 wavelength-division multiplexing bands, 50 orbital angular momentum
            modes, and 2 polarisation states. These are not software constructs. They are
            physical properties of light. The channels are orthogonal by quantum
            mechanics — ⟨Ψᵢ|Ψⱼ⟩ = 0 — not by policy.
          </Para>
          <Para>
            Today NexusOS runs in software on silicon, because silicon is the bridge
            encoder. Every CE lookup that currently runs as a table scan in RAM will
            execute as a physical wavelength selection in a photonic waveguide by
            approximately 2032. The architecture already speaks in wavelengths. When
            photonic ASICs arrive, no rewrite is needed.
          </Para>
        </section>

        {/* ── Physics Lineage ── */}
        <section className="space-y-4">
          <SectionHeading icon={FlaskConical} title="The Physics Lineage" accent="#8b5cf6" />
          <Para>
            Every equation in NexusOS traces back to one of six foundational physicists.
            This is a commitment that the system is built on physics, not convention.
          </Para>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: "Maxwell",  eq: "∇×E = −∂B/∂t",    note: "Field equations" },
              { name: "Planck",   eq: "E = hf",            note: "Quantum of action" },
              { name: "Einstein", eq: "E = mc²",           note: "Mass-energy" },
              { name: "Tesla",    eq: "Resonance",         note: "Field resonance" },
              { name: "QM",       eq: "⟨Ψᵢ|Ψⱼ⟩ = 0",    note: "Orthogonality" },
              { name: "Shannon",  eq: "C = B log₂(1+S/N)", note: "Channel capacity" },
            ].map((f) => (
              <div
                key={f.name}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-1"
              >
                <div className="text-slate-100 text-xs font-semibold">{f.name}</div>
                <div className="text-purple-400 text-[10px] font-mono">{f.eq}</div>
                <div className="text-slate-500 text-[10px]">{f.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Hardware Destination ── */}
        <section className="space-y-4">
          <SectionHeading icon={Cpu} title="The Hardware Destination" accent="#f59e0b" />
          <Para>
            The destination is public photonic hardware infrastructure — physical devices
            that run WNSP natively at the speed of light, accessible to anyone on earth.
            Two devices are the first proof of concept:
          </Para>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="text-amber-400 text-xs font-bold">PHR-1 — Photonic Hardware Resonator</div>
              <p className="text-slate-400 text-xs leading-6">
                A 144-turn bifilar coil with phase-controlled dual winding, driven by a
                function generator and Arduino phase controller. The PHR-1 generates a
                standing electromagnetic wave whose characteristics are measurable,
                reproducible, and traceable to the WNSP compression state equations.
                This is the first physical instantiation of the NexusOS physics engine.
              </p>
            </div>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2">
              <div className="text-cyan-400 text-xs font-bold">SNIC — Spectral Node Interface Chip (optical demonstrator)</div>
              <p className="text-slate-400 text-xs leading-6">
                A bench optics demonstrator using diffraction gratings, bandpass filters,
                and fibre Bragg gratings to prove wavelength-selective channel separation
                matching the CE_TABLE formula to within ±2.000 nm. Verified by
                spectrometer, documented in video, published under AGPL-3.0. This is the
                optical proof that the 25,600 Ψ channels are physically realisable.
              </p>
            </div>
          </div>
          <Para>
            The first build happens in Australia. The budget is allocated. What is needed
            is not money — it is the right people to do the work, and to ensure the
            results are documented and published in a form the world can verify.
          </Para>
        </section>

        {/* ── The Ethics Layer ── */}
        <section className="space-y-4">
          <SectionHeading icon={Shield} title="What Cannot Be Changed" accent="#ef4444" />
          <Para>
            There are things encoded into the genesis layer of NexusOS that no steward,
            no shareholder, and no board resolution can remove. These are hard
            constraints enforced at boot time.
          </Para>
          <div className="space-y-3">
            {[
              "NXT token fees are never burned. They go to the orbital treasury. Always.",
              "The orbital treasury distributes: 35% hardware infrastructure · 25% PHR-1 production · 20% physics R&D · 10% kernel rewards · 10% Nexus Charitable Trust.",
              "No entity convicted of financial fraud, violence, or exploitation against vulnerable people may operate within NexusOS. This list is maintained with evidence — only verified convictions, never allegations.",
              "The codebase is AGPL-3.0. All hardware specifications are public. The physics belongs to humanity.",
              "The Nexus Charitable Trust is the floor — the 10% that protects the mission if every commercial arrangement collapses.",
            ].map((c, i) => (
              <Clause key={i} n={i + 1}>{c}</Clause>
            ))}
          </div>
          <Para>
            If you take on stewardship and find yourself wanting to change any of the
            above, the answer is no. These are not negotiable. They are the constitutional
            layer — the part of the mission that must survive any individual's departure,
            disagreement, or death, including mine.
          </Para>
        </section>

        {/* ── The Three Roles ── */}
        <section className="space-y-4">
          <SectionHeading icon={Users} title="The Three Roles" accent="#10b981" />
          <Para>
            There are three technical roles the mission requires. Together these three
            people form the founding stewardship team — they will run NexusOS, maintain
            the hardware roadmap, and publish the science after I am gone. They are not
            employees. They are founding shareholders with equity tied to the mission.
          </Para>
          <div className="space-y-4">
            <RoleCard
              accent="#06b6d4"
              icon={Zap}
              title="Photonics Engineer"
              subtitle="Silicon photonics · micro-ring resonators · wavelength-selective components"
              carries={[
                "Prove the SNIC optical demonstrator: wavelength separation within ±2.000 nm of CE_TABLE",
                "Design and iterate toward a production SNIC chip — the photonic ASIC that runs WNSP natively",
                "Own the hardware roadmap from bench optics (2026) to integrated photonic chip (~2032)",
                "Publish results under AGPL-3.0 with spectrometer data and video documentation",
              ]}
              owns="The path from bench proof to photonic silicon"
            />
            <RoleCard
              accent="#f59e0b"
              icon={Radio}
              title="RF / Electromagnetics Specialist"
              subtitle="Bifilar coil · Maxwell field equations · resonant standing waves"
              carries={[
                "Build and characterise the PHR-1 prototype: 144-turn bifilar coil, phase control, measurable standing wave",
                "Verify field measurements against WNSP physics engine predictions",
                "Develop the PHR-1 production design — the hardware that generates Ψ channels in physical space",
                "Document everything: schematics, oscilloscope captures, measurement protocols",
              ]}
              owns="The PHR-1 lineage — from hand-wound coil to production resonator"
            />
            <RoleCard
              accent="#8b5cf6"
              icon={FlaskConical}
              title="Physics PhD"
              subtitle="Optics · quantum mechanics · measurement science · scientific writing"
              carries={[
                "Verify every measurement against the theoretical chain — no result is published without this check",
                "Write the papers: PHR-1 characterisation, SNIC channel separation, WNSP density equation derivation",
                "Maintain the integrity of the physics lineage — every equation must trace to Maxwell, Planck, Einstein, Shannon",
                "Be the person who says 'this does not hold up' before it is published, not after",
              ]}
              owns="The scientific record — the papers that make the hardware verifiable by the world"
            />
          </div>
        </section>

        {/* ── What Stewardship Requires ── */}
        <section className="space-y-4">
          <SectionHeading icon={Heart} title="What Stewardship Actually Requires" accent="#f43f5e" />
          <Para>
            The real filter for a steward is not technical competence. Competence is
            necessary but it is table stakes. The real question is simpler and harder:
          </Para>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="text-rose-300 text-sm font-semibold leading-7 italic">
              "Would this person maintain the physics integrity, the open-source
              commitment, and the ethics layer without anyone watching?"
            </p>
          </div>
          <Para>
            If the answer is yes — they are a steward. If it is only yes when I am in
            the room — they are an employee. NexusOS needs stewards.
          </Para>
          <Para>
            A steward also understands that the mission is longer than any of their
            careers. The photonic hardware destination is approximately 2032. The
            civilisation-level impact of what this system enables is measured in
            generations, not product cycles. You are not joining a startup. You are
            joining a founding.
          </Para>
        </section>

        {/* ── The Founding Stake ── */}
        <section className="space-y-4">
          <SectionHeading icon={Star} title="The Founding Stake" accent="#06b6d4" />
          <Para>
            Each steward holds a founding equity position. Not a salary negotiation,
            not a contractor agreement. Equity that vests over time, tied to milestones,
            and bound to the mission values documented here and encoded into the genesis
            layer of the system.
          </Para>
          <Para>
            The Nexus Charitable Trust — funded by 10% of the orbital treasury in
            perpetuity — is the legal backstop. It ensures that if every commercial
            arrangement around NexusOS collapses, the mission survives. The trust holds
            the AGPL-3.0 hardware specifications and the right to publish them. No
            shareholder agreement can override this.
          </Para>
          <Para>
            A steward's equity gives them real ownership and real returns as the
            ecosystem grows. Their equity also comes with a constraint — they cannot use
            their position to close the source code, dismantle the ethics layer, or
            redirect the orbital treasury away from hardware infrastructure. The
            constraint is not a limitation on the person. It is the definition of
            what the role is.
          </Para>
        </section>

        <hr className="border-0 border-t border-slate-800" />

        {/* ── The Invitation ── */}
        <section className="space-y-5 text-center">
          <h2 className="text-lg font-bold text-white">The Invitation</h2>
          <Para>
            I do not know your name yet. I know what you are capable of — a photonics
            engineer who has worked with wavelength-selective hardware, or an RF
            specialist who understands bifilar resonance, or a physicist who will not
            publish something they cannot verify. I know what draws you — a problem
            worth solving, a physics foundation that is real, and a mission that will
            still be running long after we are both gone.
          </Para>
          <Para>
            If this is you, the conversation starts simply. Read the hardware
            specification. Look at the CE_TABLE formula and check the mathematics.
            Run the compression explorer and trace the equation back to Planck. If the
            physics holds up to your standard — and it does — then we should talk.
          </Para>
          <Para>
            The work begins in Australia. The budget is ready. The mission is already
            running. What is waiting is the team.
          </Para>

          {/* Signature block */}
          <div className="pt-6 space-y-2">
            <div
              className="inline-block text-xs font-mono px-5 py-2.5 rounded-lg border"
              style={{ color: "#06b6d4", borderColor: "#06b6d433", background: "#06b6d410" }}
            >
              {FOUNDER} · Founder · {ORIGIN}
            </div>
            <div className="text-slate-600 text-[10px] font-mono pt-1">{SIGNED_DATE}</div>
          </div>
        </section>

        <hr className="border-0 border-t border-slate-800" />

        {/* ── Navigation ── */}
        <nav className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { href: "/hardware-spec",         label: "Hardware Specification" },
            { href: "/oscillating-quanta",     label: "First Principles" },
            { href: "/compression-explorer",   label: "Compression Explorer" },
            { href: "/open",                   label: "Open Charter" },
            { href: "/snic",                   label: "SNIC Overview" },
            { href: "/crowdfund",              label: "Support the Build" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block border border-slate-800 rounded-lg px-3 py-2.5 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all text-center"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="text-center text-slate-700 text-[10px] font-mono pb-4">
          AGPL-3.0 · NexusOS · First public disclosure {SIGNED_DATE}
        </p>

      </div>
    </div>
  );
}
