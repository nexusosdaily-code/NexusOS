import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Cpu, Wifi, Code2, Shield, Users, CheckCircle,
  ExternalLink, Radio, Zap, Globe, FlaskConical
} from "lucide-react";

type NodeType = "lab" | "institution" | "independent" | "network_hub";

const CAPABILITIES = [
  { id: "hardware",      label: "Hardware" },
  { id: "software",      label: "Software R&D" },
  { id: "physics",       label: "Physics Research" },
  { id: "education",     label: "Education" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "networking",    label: "Network Infrastructure" },
];

const NODE_TYPES: { id: NodeType; label: string }[] = [
  { id: "lab",          label: "Engineering Lab" },
  { id: "institution",  label: "Institution / University" },
  { id: "independent",  label: "Independent Researcher" },
  { id: "network_hub",  label: "Network Hub" },
];

const STEPS = [
  {
    n: "01",
    icon: Cpu,
    title: "Hardware",
    color: "#8b00ff",
    desc: "Assemble your lab. Spectrometer, compute, network connection. The physics engine speaks in wavelengths — your hardware is the receiver.",
    detail: "SNIC · PHR-1 · Spectral Relay Mesh v1",
    link: { label: "Hardware Spec →", href: "/hardware-spec" },
  },
  {
    n: "02",
    icon: Code2,
    title: "Sync Code",
    color: "#0050ff",
    desc: "Fork the AGPL-3.0 codebase. Run a local node. The code IS the hardware specification — no rewrite needed when photonic ASICs arrive.",
    detail: "git clone github.com/nexusosdaily-code/NexusOS",
    link: { label: "Hardware Lab →", href: "/hardware-lab" },
  },
  {
    n: "03",
    icon: Radio,
    title: "Encode",
    color: "#00cfcf",
    desc: "Register your AI agent or system operator with a Ψ channel identity. Every system gets a deterministic spectral address derived from CE→SE physics.",
    detail: "CE-SE Pipeline · WavelengthScript · WNSP-URI",
    link: { label: "CE-SE Pipeline →", href: "/ce-se-pipeline" },
  },
  {
    n: "04",
    icon: Shield,
    title: "Govern",
    color: "#16a34a",
    desc: "Your node votes on live protocol parameters. Authority by spectral band — not capital. KERNEL band or higher may submit proposals.",
    detail: "51,200 orthogonal Ψ channels · Physics-weighted votes",
    link: { label: "Governance →", href: "/open" },
  },
  {
    n: "05",
    icon: Users,
    title: "Operate",
    color: "#ff8c00",
    desc: "Engineers maintain the lab. No ownership. No authority over systems operators. AGPL-3.0 is the law. Other nations join when ready.",
    detail: "Walter Russell octave layers re-enforced by each new node",
    link: null,
  },
];

function StepCard({ step, isLast }: { step: typeof STEPS[0]; isLast: boolean }) {
  const Icon = step.icon;
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border"
          style={{ borderColor: step.color + "66", background: step.color + "18" }}
        >
          <Icon className="w-4 h-4" style={{ color: step.color }} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 mt-2" style={{ background: step.color + "33", minHeight: 40 }} />
        )}
      </div>
      <div className="pb-10 flex-1">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-xs font-mono" style={{ color: step.color }}>{step.n}</span>
          <h3 className="text-base font-bold text-white">{step.title}</h3>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">{step.desc}</p>
        <p className="text-xs font-mono text-gray-600 mb-2">{step.detail}</p>
        {step.link && (
          <Link
            href={step.link.href}
            className="text-xs font-mono hover:text-white transition-colors"
            style={{ color: step.color }}
          >
            {step.link.label}
          </Link>
        )}
      </div>
    </div>
  );
}

interface LabNode {
  id: string;
  name: string;
  country: string;
  nodeType: string;
  capabilities: string[];
  contactEmail: string;
  psiChannel: string;
  status: string;
  createdAt: string;
}

function NodeCard({ node }: { node: LabNode }) {
  return (
    <div className="border border-gray-800 bg-gray-900/30 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{node.name}</p>
          <p className="text-xs text-gray-500">{node.country}</p>
        </div>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded px-2 py-0.5 whitespace-nowrap">
          {node.psiChannel}
        </span>
      </div>
      {node.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {node.capabilities.map(c => (
            <span key={c} className="text-[10px] font-mono text-gray-500 border border-gray-800 rounded px-1.5 py-0.5">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LabsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", country: "", nodeType: "lab" as NodeType,
    capabilities: [] as string[], contactEmail: "", message: "",
    agplAcknowledged: false,
  });
  const [submitted, setSubmitted] = useState<LabNode | null>(null);

  const { data: nodesData } = useQuery<{ nodes: LabNode[] }>({
    queryKey: ["/api/labs"],
    queryFn: () => fetch("/api/labs").then(r => r.json()),
  });

  const register = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/labs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      return r.json() as Promise<{ node: LabNode }>;
    },
    onSuccess: (data) => {
      setSubmitted(data.node);
      qc.invalidateQueries({ queryKey: ["/api/labs"] });
    },
  });

  function toggleCap(id: string) {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(id)
        ? f.capabilities.filter(c => c !== id)
        : [...f.capabilities, id],
    }));
  }

  const nodes = nodesData?.nodes ?? [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-violet-400 font-mono text-sm tracking-widest uppercase">NexusOS</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500 font-mono text-sm">Lab Node Registry</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-5">
            Engineering Lab Network
          </h1>
          <div className="max-w-2xl space-y-3">
            <p className="text-gray-300 text-lg leading-relaxed">
              The path from hardware to photonic OS. Each lab is a node. Each node re-enforces the
              Walter Russell octave layers that the physics engine is built on.
            </p>
            <p className="text-gray-500 text-sm font-mono border-l-2 border-violet-800 pl-4 py-1">
              No capital. Just capabilities. No owner. No authority over systems operator.
              AGPL-3.0 is the law.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { href: "/hardware-spec", label: "Hardware Spec", icon: Cpu },
              { href: "/hardware-lab",  label: "Physics Lab",   icon: FlaskConical },
              { href: "/oscillating-quanta", label: "First Principles", icon: Zap },
              { href: "/ce-se-pipeline", label: "CE-SE Pipeline", icon: Code2 },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-2 transition-all"
              >
                <Icon className="w-3 h-3" />
                {label}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Left: 5-step path */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-8">
              Hardware → Code → Encode → Govern → Operate
            </p>
            {STEPS.map((step, i) => (
              <StepCard key={step.n} step={step} isLast={i === STEPS.length - 1} />
            ))}
          </div>

          {/* Right: Registry + Registration */}
          <div className="space-y-8">

            {/* Live registry */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">Active Nodes</p>
                {nodes.length > 0 && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {nodes.length} online
                  </span>
                )}
              </div>
              {nodes.length === 0 ? (
                <div className="border border-dashed border-gray-800 rounded-lg p-6 text-center">
                  <Globe className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No active nodes yet.</p>
                  <p className="text-xs text-gray-700 mt-1">Be the first lab to join.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {nodes.map(n => <NodeCard key={n.id} node={n} />)}
                </div>
              )}
            </div>

            {/* Registration */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-4">Register Your Lab</p>

              {submitted ? (
                <div className="border border-emerald-800/50 bg-emerald-950/20 rounded-xl p-6 text-center space-y-3">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h3 className="text-base font-semibold text-white">Node Registered</h3>
                  <p className="text-sm text-gray-400">Your Ψ channel has been assigned.</p>
                  <div className="inline-block bg-black/60 border border-cyan-800/40 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-500 font-mono mb-0.5">ASSIGNED CHANNEL</p>
                    <p className="text-lg font-mono text-cyan-400">{submitted.psiChannel}</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    Status: pending review. You will be contacted at {submitted.contactEmail}.
                  </p>
                  <button
                    onClick={() => setSubmitted(null)}
                    className="text-xs text-gray-500 hover:text-gray-300 underline"
                  >
                    Register another
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={e => { e.preventDefault(); register.mutate(); }}
                  className="border border-gray-800 bg-gray-900/20 rounded-xl p-6 space-y-4"
                >
                  {register.error && (
                    <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2 font-mono">
                      {(register.error as Error).message}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Lab / Institution Name *</label>
                      <input
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="NexusOS Auckland Lab"
                        className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Country *</label>
                      <input
                        required
                        value={form.country}
                        onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                        placeholder="New Zealand"
                        className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Node Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {NODE_TYPES.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, nodeType: t.id }))}
                          className={`text-left text-xs font-mono px-3 py-2 rounded-lg border transition-all ${
                            form.nodeType === t.id
                              ? "border-violet-600 bg-violet-900/30 text-violet-300"
                              : "border-gray-800 text-gray-500 hover:border-gray-700"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Capabilities</label>
                    <div className="flex flex-wrap gap-2">
                      {CAPABILITIES.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCap(c.id)}
                          className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                            form.capabilities.includes(c.id)
                              ? "border-cyan-600 bg-cyan-900/30 text-cyan-300"
                              : "border-gray-800 text-gray-500 hover:border-gray-700"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Contact Email *</label>
                    <input
                      required
                      type="email"
                      value={form.contactEmail}
                      onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                      placeholder="lab@yourinstitution.org"
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Message (optional)</label>
                    <textarea
                      rows={3}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Describe your lab's focus and what you're building..."
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono resize-none"
                    />
                  </div>

                  {/* AGPL gate */}
                  <div
                    className={`rounded-lg border p-4 transition-all cursor-pointer ${
                      form.agplAcknowledged
                        ? "border-emerald-700/50 bg-emerald-950/20"
                        : "border-gray-800 bg-gray-900/20"
                    }`}
                    onClick={() => setForm(f => ({ ...f, agplAcknowledged: !f.agplAcknowledged }))}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                        form.agplAcknowledged ? "border-emerald-500 bg-emerald-600" : "border-gray-600"
                      }`}>
                        {form.agplAcknowledged && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-300 mb-1">
                          I acknowledge the AGPL-3.0 licence
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          This codebase is governed by AGPL-3.0. No owner. No authority over systems operators.
                          Forks must remain open. The protocol is the authority.{" "}
                          <a
                            href="/hardware-spec"
                            className="text-violet-400 hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            Read the spec →
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!form.agplAcknowledged || register.isPending}
                    className="w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-violet-700 hover:bg-violet-600 text-white"
                  >
                    {register.isPending ? "Registering..." : "Register Lab Node"}
                  </button>
                  <p className="text-xs text-gray-600 text-center font-mono">
                    Ψ channel auto-assigned from your lab name + country
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Related resources */}
        <div className="mt-10 pt-6 border-t border-gray-800/60">
          <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wider">Related resources</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/hardware-lab">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-xs hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
                <Cpu className="w-3 h-3" /> Hardware Calibration Lab
              </span>
            </Link>
            <Link href="/hardware-spec">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 text-violet-400 text-xs hover:bg-violet-500/10 hover:border-violet-500/30 transition-all cursor-pointer">
                <Shield className="w-3 h-3" /> Hardware Spec (AGPL-3.0)
              </span>
            </Link>
          </div>
        </div>

        {/* Footer manifest */}
        <div className="mt-16 pt-8 border-t border-gray-900">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Architecture", value: "51,200 Ψ Channels" },
              { label: "Physics Basis", value: "Maxwell · Planck · Russell" },
              { label: "Timeline", value: "Code → ASICs ~2032" },
              { label: "Licence", value: "AGPL-3.0" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-600 font-mono mb-1">{label}</p>
                <p className="text-sm text-gray-300 font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
