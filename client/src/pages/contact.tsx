import { useState } from "react";
import { Link } from "wouter";
import { Shield, TrendingUp, Code2, Mail, Globe, Lock, CheckCircle, ExternalLink } from "lucide-react";
import { PSI_CHANNELS } from "@/lib/channel-model";

type Track = "regulatory" | "investment" | "developer" | "security";

const TRACKS = [
  {
    id: "regulatory" as Track,
    icon: Shield,
    label: "Regulatory Inquiry",
    color: "blue",
    description: "For regulators, compliance teams, and government bodies assessing NexusOS under applicable virtual asset frameworks.",
    fields: ["Organisation", "Jurisdiction", "Regulatory Framework", "Nature of Inquiry"],
    note: "NXT was distributed as a free airdrop — no investment of money occurred. All token holders are community participants, not investors. NexusOS operates under AGPL-3.0.",
  },
  {
    id: "investment" as Track,
    icon: TrendingUp,
    label: "Investment & Partnership",
    color: "emerald",
    description: "For sovereign wealth funds, institutional investors, and strategic partners evaluating NexusOS as infrastructure.",
    fields: ["Organisation", "Fund Size / AUM", "Interest Area", "Preferred Timeline"],
    note: "NexusOS holds 6.2B+ sats on Lightning Network. 20+ founding shareholders received NXT at zero cost basis. Physics-based fee model replaces percentage-based transaction fees.",
  },
  {
    id: "developer" as Track,
    icon: Code2,
    label: "Developer Integration",
    color: "violet",
    description: "For developers, teams, and organisations building integrations using the NexusOS API, CE encoder, or WNSP protocol.",
    fields: ["Name", "Integration Type", "Tech Stack", "Use Case"],
    note: "npm package: nexusos-ce-encoder@1.0.0. Python SDK available via GitHub. Developer API keys available with NXT creation fee. Full REST + WebSocket API.",
  },
  {
    id: "security" as Track,
    icon: Lock,
    label: "Security Disclosure",
    color: "amber",
    description: "For security researchers reporting vulnerabilities under responsible disclosure. All reports acknowledged within 48 hours.",
    fields: ["Handle / Name", "Vulnerability Class", "Affected Endpoint", "CVSS Estimate"],
    note: "NexusOS operates under AGPL-3.0. Responsible disclosure is welcomed. We acknowledge all reporters publicly (with permission). See /.well-known/security.txt for canonical contact.",
  },
];

const COLOR_MAP: Record<string, string> = {
  blue:    "border-blue-500/40 bg-blue-500/5 text-blue-400",
  emerald: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
  violet:  "border-violet-500/40 bg-violet-500/5 text-violet-400",
  amber:   "border-amber-500/40 bg-amber-500/5 text-amber-400",
};

const ICON_COLOR: Record<string, string> = {
  blue:    "text-blue-400",
  emerald: "text-emerald-400",
  violet:  "text-violet-400",
  amber:   "text-amber-400",
};

const BUTTON_COLOR: Record<string, string> = {
  blue:    "bg-blue-600 hover:bg-blue-500",
  emerald: "bg-emerald-600 hover:bg-emerald-500",
  violet:  "bg-violet-600 hover:bg-violet-500",
  amber:   "bg-amber-600 hover:bg-amber-500",
};

export default function ContactPage() {
  const [activeTrack, setActiveTrack] = useState<Track>("regulatory");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const track = TRACKS.find(t => t.id === activeTrack)!;

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setForm({});
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-blue-400 font-mono text-sm tracking-widest uppercase">NexusOS</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500 font-mono text-sm">Institutional Contact</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Contact &amp; Inquiry
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed">
            NexusOS is a physics-based civilization OS — the first system where transaction fees
            are derived from Maxwell's equations, not percentage tables. Select the track that
            matches your inquiry.
          </p>
        </div>

        {/* Status strip */}
        <div className="flex flex-wrap gap-4 mb-10 pb-10 border-b border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Lightning node active
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            AGPL-3.0 licensed
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            20+ founding shareholders
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            First disclosure: 2026-05-16
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Track selector */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">Inquiry Track</p>
            {TRACKS.map(t => {
              const Icon = t.icon;
              const active = t.id === activeTrack;
              return (
                <button
                  key={t.id}
                  onClick={() => { setActiveTrack(t.id); setForm({}); setSubmitted(false); }}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    active
                      ? `${COLOR_MAP[t.color]} border-opacity-100`
                      : "border-gray-800 bg-gray-900/30 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? ICON_COLOR[t.color] : "text-gray-500"}`} />
                    <span className={`text-sm font-medium ${active ? "text-white" : "text-gray-400"}`}>
                      {t.label}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Direct contact */}
            <div className="mt-6 pt-6 border-t border-gray-800 space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">Direct</p>
              <a
                href="mailto:security@wnsp.tech"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4" />
                security@wnsp.tech
              </a>
              <a
                href="https://wnsp.tech/.well-known/security.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Globe className="w-4 h-4" />
                security.txt
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Inquiry Received</h3>
                <p className="text-gray-400 max-w-sm">
                  Your {track.label.toLowerCase()} has been logged. We acknowledge all formal inquiries
                  within 48 hours.
                </p>
              </div>
            ) : (
              <div className={`rounded-xl border p-8 ${COLOR_MAP[track.color]}`}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">{track.label}</h2>
                  <p className="text-sm text-gray-400 leading-relaxed">{track.description}</p>
                </div>

                {/* Context note */}
                <div className="mb-6 p-4 bg-black/40 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">{track.note}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {track.fields.map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1 font-mono">
                        {field}
                      </label>
                      {field === "Nature of Inquiry" || field === "Use Case" || field === "Interest Area" ? (
                        <textarea
                          rows={3}
                          value={form[field] || ""}
                          onChange={e => handleChange(field, e.target.value)}
                          placeholder={`Describe your ${field.toLowerCase()}...`}
                          className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[field] || ""}
                          onChange={e => handleChange(field, e.target.value)}
                          placeholder={field}
                          className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
                        />
                      )}
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider mb-1 font-mono">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form["Email"] || ""}
                      onChange={e => handleChange("Email", e.target.value)}
                      placeholder="your@organisation.com"
                      className="w-full bg-black/60 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className={`w-full py-3 px-6 rounded-lg text-white font-semibold text-sm transition-colors ${BUTTON_COLOR[track.color]}`}
                    >
                      Submit {track.label}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Related resources */}
            <div className="mt-6 pt-5 border-t border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-mono mb-3">Related Resources</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <Link href="/developer" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Developer Docs</Link>
                <Link href="/wavelength-lang" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">WavelengthScript</Link>
                <Link href="/crowdfund" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">Crowdfund Campaign</Link>
                <Link href="/hardware-spec" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Hardware Specification</Link>
                <Link href="/constitution" className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">Constitution</Link>
                <Link href="/wnsp" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">WNSP Protocol</Link>
              </div>
            </div>

            {/* Technical facts footer */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                { label: "Token Supply", value: "21B NXT" },
                { label: "Decimals", value: "8" },
                { label: "Lightning Sats", value: "6.2B+" },
                { label: "WNSP Channels", value: PSI_CHANNELS },
                { label: "License", value: "AGPL-3.0" },
                { label: "First Disclosure", value: "2026-05-16" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900/40 border border-gray-800 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 font-mono mb-1">{label}</p>
                  <p className="text-sm text-white font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
