import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Copy, CheckCheck, Terminal, Cpu, FileText, Users, Zap, Radio, BookOpen, GitBranch, Activity, Globe, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const OPCODES = [
  { op: "TUNE λnm",                    desc: "Set active wavelength channel" },
  { op: 'PUSH "name"',                 desc: "Store a value at current wavelength" },
  { op: "EMIT msg",                    desc: "Broadcast a message on this channel" },
  { op: "PHASE θ",                     desc: "Shift the channel's coherence state" },
  { op: "BROAD msg",                   desc: "Send to all subscribers of this channel" },
  { op: "?λ condition",                desc: "Branch based on wavelength" },
  { op: 'node.register("name", @λnm)', desc: "Register a discoverable network agent" },
  { op: "HALT",                        desc: "End execution" },
];

const ROLES = [
  {
    icon: FileText,
    title: "DevRel / Docs",
    color: "text-cyan-400",
    border: "border-cyan-500/30 bg-cyan-950/10",
    what: "Simplify WavelengthScript for developers who've never seen it. Write guides, examples, and explainers.",
    skills: ["Technical writing", "Developer empathy", "Community sense"],
    reward: "NXT bounty per deliverable",
  },
  {
    icon: Cpu,
    title: "VM & Compiler",
    color: "text-violet-400",
    border: "border-violet-500/30 bg-violet-950/10",
    what: "Extend the WNSP VM — new opcodes, optimise execution, improve the WavelengthScript compiler.",
    skills: ["TypeScript / JavaScript", "Compiler theory", "Bytecode VMs"],
    reward: "NXT bounty per merged feature",
  },
  {
    icon: Radio,
    title: "Physics Engine",
    color: "text-amber-400",
    border: "border-amber-500/30 bg-amber-950/10",
    what: "Extend the Python spectral API — new compression state calculations, Maxwell equation validators, spectral encoding.",
    skills: ["Python", "Physics / E=hf", "Flask APIs"],
    reward: "NXT bounty per merged feature",
  },
  {
    icon: GitBranch,
    title: "Protocol Dev",
    color: "text-emerald-400",
    border: "border-emerald-500/30 bg-emerald-950/10",
    what: "Build on the WNSP protocol layer — spectral routing, P2P mesh, WNSP-URI, channel governance.",
    skills: ["TypeScript", "Networking", "PostgreSQL"],
    reward: "NXT bounty per merged feature",
  },
];

const SAMPLE_PROGRAM = `TUNE 541nm                         ← USER band
PUSH "ReasoningCore"               ← register an agent
node.register("AI", @541nm)        ← make it discoverable
EMIT "Agent online"                ← broadcast
HALT`;

const DEV_COMMANDS = `# 1. Clone
git clone https://github.com/nexusosdaily-code/NexusOS
cd NexusOS

# 2. Install
npm install
pip install flask flask-cors requests psycopg2-binary

# 3. Configure
export DATABASE_URL="postgresql://user:password@localhost:5432/nexusos"
npm run db:push

# 4. Run
npm run dev
# Node.js → port 5000  |  Python Flask → port 5001`;

function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied", description: label });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-black/60 border border-white/10 rounded-lg p-4 text-xs font-mono text-white/80 overflow-x-auto leading-relaxed">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 rounded p-1.5"
        data-testid="button-copy-code"
      >
        {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/60" />}
      </button>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg border border-white/10 bg-white/5">
      <span className={`text-lg font-mono font-bold ${color}`}>{value}</span>
      <span className="text-white/40 text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function BuildWithUsPage() {
  const { data: platform } = useQuery({
    queryKey: ["/api/platform/status"],
    queryFn: () => apiRequest("GET", "/api/platform/status").then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: chain } = useQuery({
    queryKey: ["/api/blockchain/chain"],
    queryFn: () => apiRequest("GET", "/api/blockchain/chain?limit=1").then(r => r.json()),
    staleTime: 30_000,
  });

  const { data: agents } = useQuery({
    queryKey: ["/api/agent-bus/agents"],
    queryFn: () => apiRequest("GET", "/api/agent-bus/agents").then(r => r.json()),
    staleTime: 30_000,
  });

  const blockCount  = chain?.total ?? "—";
  const agentCount  = Array.isArray(agents) ? agents.length : (agents?.count ?? "—");
  const channelCount = platform?.channels ?? 25600;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="border-b border-white/5 bg-gradient-to-b from-cyan-950/20 to-zinc-950">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] uppercase tracking-widest">
            Open Contribution
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Build NexusOS
          </h1>
          <p className="text-white/50 text-lg max-w-2xl leading-relaxed">
            The first OS where variables are wavelengths of light, fees are derived from E=hf, and
            the protocol speaks the language of photonic hardware. It runs today. We're looking for
            people who want to build the infrastructure it runs on.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <a href="/wnsp-vm">
              <Button variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 gap-2" data-testid="button-hero-vm">
                <Terminal className="w-4 h-4" /> Live VM
              </Button>
            </a>
            <a href="/wavelength-lang">
              <Button variant="outline" className="border-violet-500/40 text-violet-400 hover:bg-violet-500/10 gap-2" data-testid="button-hero-lang">
                <Zap className="w-4 h-4" /> Language Spec
              </Button>
            </a>
            <a href="/ce-se-pipeline">
              <Button variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2" data-testid="button-hero-pipeline">
                <Cpu className="w-4 h-4" /> CE→SE Pipeline
              </Button>
            </a>
            <a href="https://github.com/nexusosdaily-code/NexusOS" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-white/20 text-white/60 hover:bg-white/5 gap-2" data-testid="button-hero-github">
                <GitBranch className="w-4 h-4" /> GitHub
              </Button>
            </a>
            <a href="/contact">
              <Button variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-2" data-testid="button-hero-contact">
                <Mail className="w-4 h-4" /> Talk to the Team
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">

        {/* Live stats */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-white/40 text-xs uppercase tracking-widest">Live system</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatPill label="Ψ Channels" value={channelCount.toLocaleString()} color="text-cyan-400" />
            <StatPill label="Blocks mined" value={blockCount} color="text-violet-400" />
            <StatPill label="Kernel agents" value={agentCount} color="text-amber-400" />
            <StatPill label="Protocol" value="WNSP v1.0" color="text-emerald-400" />
            <StatPill label="License" value="AGPL-3.0" color="text-white/60" />
          </div>
        </section>

        {/* Global Venture */}
        <section className="rounded-xl border border-white/8 bg-gradient-to-br from-cyan-950/20 via-zinc-900/30 to-violet-950/20 p-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span className="text-white/40 text-xs uppercase tracking-widest">Global Venture</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">Everyone is invited to build this.</h2>
          <p className="text-white/55 text-base leading-relaxed max-w-3xl mb-6">
            NexusOS is not a startup. It is civilisation-scale infrastructure — the first protocol that
            speaks the language of photonic hardware before the hardware exists. This is a global venture
            and it belongs to everyone who helps build it.
          </p>
          <p className="text-white/45 text-sm leading-relaxed max-w-3xl mb-8">
            You do not need to be a developer. Physicists, hardware engineers, educators, translators,
            community organisers, writers — every discipline has a role. The physics is real.
            The equations are derived from Maxwell, Planck, and Einstein. If you can verify it, you can
            build on it. If you can explain it, you can grow it. If you can fund it, you can accelerate it.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Developers", desc: "TypeScript, Python, compiler theory, networking — extend the VM, protocol, and physics engine.", color: "text-cyan-400", border: "border-cyan-500/20" },
              { label: "Scientists & Engineers", desc: "Validate the compression state equations. Prototype the PHR-1 coil. Push the hardware spec forward.", color: "text-amber-400", border: "border-amber-500/20" },
              { label: "Community Builders", desc: "Translate the vision. Educate others. Grow the network across every language and every country.", color: "text-emerald-400", border: "border-emerald-500/20" },
            ].map(({ label, desc, color, border }) => (
              <div key={label} className={`rounded-lg border ${border} bg-white/3 p-4`}>
                <p className={`text-sm font-semibold mb-2 ${color}`}>{label}</p>
                <p className="text-white/45 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-white/25 text-xs mt-6 font-mono">
            AGPL-3.0 — open forever. Any improvement must be returned to the commons. The protocol is permanent.
          </p>
        </section>

        {/* WavelengthScript intro */}
        <section>
          <h2 className="text-2xl font-bold mb-2">WavelengthScript in 5 minutes</h2>
          <p className="text-white/40 text-sm mb-6">
            The core language of NexusOS. Every value lives at a wavelength. Every channel is a physical address.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-white/50 text-sm mb-3">Most languages:</p>
              <CopyBlock code={`let user = "Alice"\nlet channel = 42`} label="Conventional code" />
            </div>
            <div>
              <p className="text-white/50 text-sm mb-3">WavelengthScript:</p>
              <CopyBlock code={`TUNE 520nm          ← green light channel\nPUSH "Alice"        ← store at 520nm\nEMIT "hello"        ← broadcast on channel\nHALT`} label="WavelengthScript" />
            </div>
          </div>

          <p className="text-white/50 text-sm mb-6">
            Your wavelength determines your authority. Shorter = higher energy = higher permissions.
            This follows directly from <span className="text-cyan-400 font-mono">E = h·f</span>.
          </p>

          {/* Band table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  {["Colour", "Range", "Band", "Role"].map(h => (
                    <th key={h} className="text-left text-white/30 text-[10px] uppercase tracking-widest px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { colour: "Violet", range: "380–405nm", band: "WDM 0–63",   role: "SYSTEM", dot: "bg-violet-400" },
                  { colour: "Blue",   range: "405–480nm", band: "WDM 64–127", role: "KERNEL", dot: "bg-blue-400" },
                  { colour: "Green–Orange", range: "480–630nm", band: "WDM 128–191", role: "USER", dot: "bg-green-400" },
                  { colour: "Red",    range: "630–780nm", band: "WDM 192–255", role: "GUEST", dot: "bg-red-400" },
                ].map(row => (
                  <tr key={row.role} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-3 py-2 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                      <span className="text-white/70">{row.colour}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-white/50 text-xs">{row.range}</td>
                    <td className="px-3 py-2 text-white/40 text-xs">{row.band}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[9px] text-white/60 border-white/20">{row.role}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-semibold text-white/80 mb-3">A real program</h3>
          <CopyBlock code={SAMPLE_PROGRAM} label="Sample WavelengthScript program" />
          <p className="text-white/30 text-xs mt-2">
            Run this live at <a href="/wnsp-vm" className="text-cyan-400 hover:underline">wnsp.io/wnsp-vm</a> — step through instruction by instruction.
          </p>

          <h3 className="text-base font-semibold text-white/80 mt-6 mb-3">Full instruction set</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/30 text-[10px] uppercase tracking-widest px-3 py-2">Instruction</th>
                  <th className="text-left text-white/30 text-[10px] uppercase tracking-widest px-3 py-2">What it does</th>
                </tr>
              </thead>
              <tbody>
                {OPCODES.map(({ op, desc }) => (
                  <tr key={op} className="border-b border-white/5">
                    <td className="px-3 py-2 font-mono text-cyan-300 text-xs whitespace-nowrap">{op}</td>
                    <td className="px-3 py-2 text-white/50 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contributor roles */}
        <section>
          <h2 className="text-2xl font-bold mb-2">Open contributor roles</h2>
          <p className="text-white/40 text-sm mb-6">
            Contributions are rewarded in NXT from the orbital treasury. Payment or NXT stake — not both.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {ROLES.map(role => (
              <Card key={role.title} className={`bg-zinc-900/50 border ${role.border}`} data-testid={`card-role-${role.title.toLowerCase().replace(/\W+/g, "-")}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <role.icon className={`w-4 h-4 ${role.color}`} />
                    <span className={role.color}>{role.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-white/60 text-sm">{role.what}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.skills.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] border-white/15 text-white/40">{s}</Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/30 font-mono">{role.reward}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Dev setup */}
        <section>
          <h2 className="text-2xl font-bold mb-2">Local dev setup</h2>
          <p className="text-white/40 text-sm mb-4">
            Node.js 20+, Python 3.10+, PostgreSQL 14+. Both runtimes start with one command.
          </p>
          <CopyBlock code={DEV_COMMANDS} label="Dev setup commands" />
          <p className="text-white/30 text-xs mt-3">
            After boot: Node.js runs on port 5000 (API, wallet, blockchain) · Python runs on port 5001 (spectral encoder, physics)
          </p>
        </section>

        {/* Key links */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Explore the system</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { href: "/wnsp-vm",            label: "WNSP VM",              desc: "Step-debug WavelengthScript", icon: Terminal,  color: "text-cyan-400" },
              { href: "/wavelength-lang",    label: "Language Spec",        desc: "Full compiler + spec",        icon: Zap,        color: "text-violet-400" },
              { href: "/ce-se-pipeline",     label: "CE→SE Pipeline",       desc: "4-stage encode/compile/exec", icon: Cpu,        color: "text-amber-400" },
              { href: "/blockchain",         label: "Blockchain Explorer",  desc: "Live blocks & mempool",       icon: Activity,   color: "text-emerald-400" },
              { href: "/hardware-spec",      label: "Hardware Spec",        desc: "SNIC, PHR-1, Relay Mesh",     icon: BookOpen,   color: "text-pink-400" },
              { href: "/compression-explorer", label: "Compression Curve", desc: "Interactive Λ=hf/c² viz",     icon: Radio,      color: "text-orange-400" },
              { href: "/governance",         label: "Governance",           desc: "On-chain protocol voting",    icon: Users,      color: "text-blue-400" },
              { href: "/developer",          label: "Developer API",        desc: "/api/dev/* endpoints",        icon: GitBranch,  color: "text-white/50" },
              { href: "/join-community",     label: "Community Roles",      desc: "Moderator, Creator, Engager", icon: Users,      color: "text-yellow-400" },
              { href: "/build-catalogue",    label: "Build Catalogue",       desc: "Full log of shipped features", icon: FileText,   color: "text-slate-400" },
            ].map(({ href, label, desc, icon: Icon, color }) => (
              <a key={href} href={href} data-testid={`link-explore-${label.toLowerCase().replace(/\W+/g, "-")}`}>
                <div className="group flex items-start gap-3 p-4 rounded-lg border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                  <div>
                    <p className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">{label}</p>
                    <p className="text-white/35 text-xs">{desc}</p>
                  </div>
                  <ExternalLink className="w-3 h-3 ml-auto text-white/20 group-hover:text-white/40 transition-colors mt-0.5" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-white/25 text-xs">
            NexusOS is AGPL-3.0. Any implementation must publish its source. First public disclosure 2026-05-16.
          </p>
          <p className="text-white/15 text-xs mt-1">
            The physics doesn't change when any of us are gone. The protocol is permanent.
          </p>
        </div>
      </div>
    </div>
  );
}
