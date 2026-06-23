import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import {
  Send, Bot, Users, ExternalLink, Zap, Radio,
  Code2, Waves, FlaskConical, TrendingUp, Wrench,
  ClipboardList, Building2, Eye, Telescope, ChevronRight, ArrowLeft,
} from "lucide-react";

const BOT_USERNAME    = "Nexuswnspbot";
const CHANNEL_USERNAME = "troglodytememe";

interface Message { from: "user" | "bot"; text: string; ts: number; }

// ── Bot modules ───────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "encoding",
    icon: <Waves size={14} />,
    label: "Encoding",
    color: "#0ea5e9",
    tagline: "CE-SE · text → wavelength",
    commands: [
      { emoji: "⚡", label: "What is CE?",             cmd: "/ce" },
      { emoji: "🌈", label: "What is SE?",             cmd: "/se" },
      { emoji: "🔢", label: "Encode NEXUSOS",          cmd: "/encode NEXUSOS" },
      { emoji: "📊", label: "Compare: A (ASCII vs CE)",cmd: "/compare A" },
      { emoji: "🖼️", label: "Spectral frame",          cmd: "/frame NEXUSOS" },
      { emoji: "🔭", label: "Character fingerprint",   cmd: "/spectrum WNSP" },
      { emoji: "🔐", label: "Full text fingerprint",   cmd: "/fingerprint Hello world this is NexusOS" },
    ],
  },
  {
    id: "wls",
    icon: <Code2 size={14} />,
    label: "WavelengthScript",
    color: "#f59e0b",
    tagline: "Code written in frequencies",
    commands: [
      { emoji: "👋", label: "Hello World",         cmd: "/wls hello" },
      { emoji: "🤖", label: "Define an agent",     cmd: "/wls agent" },
      { emoji: "🔄", label: "Loops",               cmd: "/wls loop" },
      { emoji: "💸", label: "Token transfer",      cmd: "/wls transfer" },
      { emoji: "🗄️", label: "Write to Spectral DB",cmd: "/wls store" },
      { emoji: "📋", label: "Full program",        cmd: "/wls full" },
      { emoji: "📖", label: "Syntax reference",    cmd: "/wls syntax" },
      { emoji: "🏗️", label: "Generate: encoder",  cmd: "/codegen encoder" },
      { emoji: "🔮", label: "Generate: oracle",    cmd: "/codegen oracle" },
      { emoji: "💰", label: "Generate: wallet",    cmd: "/codegen wallet" },
    ],
  },
  {
    id: "mirror",
    icon: <Eye size={14} />,
    label: "Spectral Mirror",
    color: "#8b5cf6",
    tagline: "Every message → physics address",
    commands: [
      { emoji: "🪞", label: "Store a message",         cmd: "/mirror store Hello from NexusOS" },
      { emoji: "📊", label: "Archive stats",           cmd: "/mirror stats" },
      { emoji: "⚡", label: "Highest-energy message",  cmd: "/mirror dominant" },
      { emoji: "🔍", label: "Search USER band",        cmd: "/mirror search 520 625" },
      { emoji: "🕐", label: "Last 5 messages",         cmd: "/mirror last" },
    ],
  },
  {
    id: "oracle",
    icon: <Telescope size={14} />,
    label: "Physics Oracle",
    color: "#06b6d4",
    tagline: "Ask anything about spectral physics",
    commands: [
      { emoji: "🔭", label: "Energy of 530nm",              cmd: "/oracle what is the energy of 530nm" },
      { emoji: "💡", label: "Fee calculation",              cmd: "/oracle how are fees calculated" },
      { emoji: "🖥️", label: "Moore's Law",                  cmd: "/oracle what happens at 2nm transistor" },
      { emoji: "🔐", label: "CE vs SHA-256",                cmd: "/oracle how does spectral fingerprinting compare to sha256" },
      { emoji: "📐", label: "Planck's Law",                 cmd: "/law planck" },
      { emoji: "📐", label: "Maxwell's Equations",          cmd: "/law maxwell" },
      { emoji: "📐", label: "Heisenberg Uncertainty",       cmd: "/law heisenberg" },
      { emoji: "📐", label: "Einstein — Λ=hf/c²",          cmd: "/law einstein" },
    ],
  },
  {
    id: "science",
    icon: <FlaskConical size={14} />,
    label: "Science",
    color: "#10b981",
    tagline: "8-module curriculum · 4 verified trials",
    commands: [
      { emoji: "〰️", label: "Mod 0 — Waves",            cmd: "/lesson 0" },
      { emoji: "🌌", label: "Mod 1 — Reposed State",    cmd: "/lesson 1" },
      { emoji: "⚡", label: "Mod 2 — CE",               cmd: "/lesson 2" },
      { emoji: "📡", label: "Mod 3 — WNSP",             cmd: "/lesson 3" },
      { emoji: "🧑‍💻", label: "Mod 4 — WLS",             cmd: "/lesson 4" },
      { emoji: "💱", label: "Mod 5 — Economy",          cmd: "/lesson 5" },
      { emoji: "💡", label: "Mod 6 — Photonics",        cmd: "/lesson 6" },
      { emoji: "⚗️", label: "Mod 7 — Trials",           cmd: "/lesson 7" },
      { emoji: "✅", label: "Trial 4 — VM proof",       cmd: "/trial 4" },
      { emoji: "❓", label: "Quiz",                     cmd: "/quiz" },
    ],
  },
  {
    id: "traction",
    icon: <TrendingUp size={14} />,
    label: "Traction",
    color: "#f97316",
    tagline: "Live GitHub · npm · ecosystem stats",
    commands: [
      { emoji: "📈", label: "GitHub clone stats",  cmd: "/traction" },
      { emoji: "📦", label: "npm downloads",       cmd: "/npm" },
      { emoji: "🌐", label: "Full ecosystem",      cmd: "/ecosystem" },
    ],
  },
  {
    id: "developer",
    icon: <Wrench size={14} />,
    label: "Developer",
    color: "#a78bfa",
    tagline: "Fees · queries · snippets · channels",
    commands: [
      { emoji: "💱", label: "Fee: 100 NXT @ 480nm",   cmd: "/fee 100 480.6" },
      { emoji: "🗄️", label: "Query USER band",         cmd: "/query 520 625" },
      { emoji: "📡", label: "Channel Ψ(128,10,H)",     cmd: "/channel 128 10 H" },
      { emoji: "🟣", label: "SYSTEM band info",        cmd: "/band system" },
      { emoji: "🟢", label: "USER band info",          cmd: "/band user" },
      { emoji: "📝", label: "Node.js CE snippet",      cmd: "/snippet node encode" },
      { emoji: "🐍", label: "Python CE snippet",       cmd: "/snippet python encode" },
      { emoji: "🌐", label: "Browser CE snippet",      cmd: "/snippet browser encode" },
      { emoji: "💸", label: "Node.js fee snippet",     cmd: "/snippet node fee" },
    ],
  },
  {
    id: "experiments",
    icon: <ClipboardList size={14} />,
    label: "Experiment Logger",
    color: "#34d399",
    tagline: "Open science · log results via bot",
    commands: [
      { emoji: "📋", label: "Recent experiments",      cmd: "/experiments" },
      { emoji: "✅", label: "Log: pass result",        cmd: "/log Green LED test | pass | 532 | Clean spectral emission" },
      { emoji: "❌", label: "Log: fail result",        cmd: "/log Dark chamber test | fail | | No measurable output" },
      { emoji: "⏳", label: "Log: pending",            cmd: "/log Photonic waveguide test | pending | | Setup in progress" },
      { emoji: "⚗️", label: "Trial 1",                cmd: "/trial 1" },
      { emoji: "⚗️", label: "Trial 4 (latest)",       cmd: "/trial 4" },
    ],
  },
  {
    id: "governance",
    icon: <Building2 size={14} />,
    label: "Governance",
    color: "#f43f5e",
    tagline: "On-chain proposals · live parameters",
    commands: [
      { emoji: "🏛️", label: "Active proposals",       cmd: "/governance" },
      { emoji: "⚙️", label: "Live protocol params",   cmd: "/params" },
      { emoji: "🟣", label: "KERNEL band (authority)", cmd: "/band kernel" },
    ],
  },
  {
    id: "broadcast",
    icon: <Radio size={14} />,
    label: "Broadcast",
    color: "#fb923c",
    tagline: "Multidimensional · one result, 7 formats",
    commands: [
      { emoji: "📡", label: "All platforms overview",         cmd: "/refract" },
      { emoji: "🔶", label: "Hacker News — Show HN post",    cmd: "/refract hn" },
      { emoji: "🟠", label: "Reddit r/compsci",              cmd: "/refract reddit" },
      { emoji: "🌍", label: "Reddit r/Futurology",           cmd: "/refract future" },
      { emoji: "🧵", label: "Threads — short post",          cmd: "/refract threads" },
      { emoji: "❓", label: "Quora — answer format",         cmd: "/refract quora" },
      { emoji: "▶️", label: "YouTube — title + description", cmd: "/refract youtube" },
      { emoji: "📄", label: "ArXiv — abstract",              cmd: "/refract arxiv" },
    ],
  },
];

export default function TelegramHubPage() {
  const [input, setInput]           = useState("");
  const [activeModule, setActiveModule] = useState("encoding");
  const [messages, setMessages]     = useState<Message[]>([
    {
      from: "bot",
      text: `👁 NexusOS Spectral Assistant — 10 bot modules

Pick a module on the left to explore its commands.
Or type any command directly below.

Quick starts:
  /encode YOURNAME      → CE encode
  /wls hello            → first WLS program
  /mirror store TEXT    → archive with physics address
  /oracle what is 530nm → physics answer
  /traction             → GitHub stats`,
      ts: Date.now(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendCommand(cmd: string) {
    if (!cmd.trim() || loading) return;
    setMessages(m => [...m, { from: "user", text: cmd.trim(), ts: Date.now() }]);
    setInput("");
    setLoading(true);
    try {
      const res  = await fetch("/api/telegram/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cmd.trim() }),
      });
      const data = await res.json();
      setMessages(m => [...m, { from: "bot", text: data.reply ?? "No response.", ts: Date.now() }]);
    } catch {
      setMessages(m => [...m, { from: "bot", text: "⚠️ Connection error.", ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(input); }
  }

  const mod = MODULES.find(m => m.id === activeModule) ?? MODULES[0];

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg,#0a0a0f 0%,#0d0d1a 100%)" }}>

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs mb-2 transition-colors" data-testid="link-back-hub">
              <ArrowLeft size={13} /> Hub
            </Link>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Bot size={20} className="text-sky-400" />
              NexusOS · Spectral Bot Suite
            </h1>
            <p className="text-white/40 text-sm mt-0.5">
              9 modules · CE-SE · WLS · Mirror · Oracle · Science · Traction · Dev · Lab · Governance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href={`https://t.me/${CHANNEL_USERNAME}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-sky-400/30 text-sky-400 hover:border-sky-400/60 hover:bg-sky-400/5 transition-all"
              data-testid="link-join-channel">
              <Users size={14} /> Channel <ExternalLink size={12} className="opacity-50" />
            </a>
            <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-violet-400/30 text-violet-400 hover:border-violet-400/60 hover:bg-violet-400/5 transition-all"
              data-testid="link-start-bot">
              <Bot size={14} /> @{BOT_USERNAME} <ExternalLink size={12} className="opacity-50" />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col lg:flex-row gap-5">

        {/* Left column — module selector + commands */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-3">

          {/* Channel mini-card */}
          <div className="rounded-2xl border border-sky-400/15 p-4 flex items-center gap-3" style={{ background: "rgba(14,165,233,0.04)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.3),rgba(14,165,233,0.3))", border: "1px solid rgba(139,92,246,0.3)" }}>
              👁
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">NexusOS WNSP</div>
              <div className="text-sky-400 text-[11px]">@{CHANNEL_USERNAME}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <a href={`https://t.me/${CHANNEL_USERNAME}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                style={{ background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", color: "#38bdf8" }}
                data-testid="link-open-channel">
                <Users size={9} /> Open
              </a>
              <a href={`https://t.me/${BOT_USERNAME}?start=web`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
                data-testid="link-open-bot">
                <Bot size={9} /> Bot
              </a>
            </div>
          </div>

          {/* Onboarding hint */}
          <div className="rounded-xl border border-amber-400/15 px-3 py-2.5 flex gap-2 items-start" style={{ background: "rgba(245,158,11,0.04)" }}>
            <span className="text-amber-400 text-sm flex-shrink-0">①</span>
            <div className="text-[10px] text-white/40 leading-relaxed">
              <span className="text-amber-400/80 font-medium">New to Telegram?</span>{" "}
              Tap the Bot link → press <strong className="text-white/60">START</strong> → all 9 modules appear instantly.
            </div>
          </div>

          {/* Module list */}
          <div className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-1.5 mt-1">
            <Radio size={9} /> 9 Bot Modules
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden flex flex-col" style={{ background: "rgba(255,255,255,0.01)" }}>
            {MODULES.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-white/4 last:border-0 group ${activeModule === m.id ? "" : "hover:bg-white/2"}`}
                style={{ background: activeModule === m.id ? `${m.color}10` : "transparent" }}
                data-testid={`button-module-${m.id}`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: activeModule === m.id ? `${m.color}20` : "rgba(255,255,255,0.04)", color: activeModule === m.id ? m.color : "rgba(255,255,255,0.3)", border: activeModule === m.id ? `1px solid ${m.color}30` : "1px solid rgba(255,255,255,0.06)" }}>
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: activeModule === m.id ? m.color : "rgba(255,255,255,0.65)" }}>{m.label}</div>
                  <div className="text-[9px] text-white/25 truncate">{m.tagline}</div>
                </div>
                <ChevronRight size={10} style={{ color: activeModule === m.id ? m.color : "rgba(255,255,255,0.1)" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Middle column — command list */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">
          <div className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <Zap size={9} style={{ color: mod.color }} />
            <span style={{ color: `${mod.color}90` }}>{mod.label}</span>
            <span className="text-white/20">— click to run</span>
          </div>

          <div className="rounded-2xl border border-white/5 overflow-hidden flex-1" style={{ background: "rgba(255,255,255,0.01)" }}>
            <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2"
              style={{ background: `${mod.color}08` }}>
              <span style={{ color: mod.color }}>{mod.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: mod.color }}>{mod.tagline}</span>
            </div>
            <div className="p-2 space-y-0.5">
              {mod.commands.map(c => (
                <button
                  key={c.cmd}
                  onClick={() => sendCommand(c.cmd)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 text-left transition-all group"
                  data-testid={`button-cmd-${c.cmd.replace(/[\s/]+/g,"-").slice(0,30)}`}
                >
                  <span className="text-base flex-shrink-0 w-6 text-center">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/65 group-hover:text-white/90 transition-colors leading-tight">{c.label}</div>
                    <div className="text-[9px] font-mono truncate mt-0.5" style={{ color: `${mod.color}60` }}>{c.cmd}</div>
                  </div>
                  <Send size={9} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — chat */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-widest">
            <Zap size={9} /> Live Bot Interface — same engine as @{BOT_USERNAME}
          </div>

          {/* Chat window */}
          <div className="rounded-2xl border border-white/8 flex flex-col overflow-hidden flex-1"
            style={{ background: "rgba(255,255,255,0.015)", minHeight: 480 }}>

            <div className="border-b border-white/5 px-4 py-2.5 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/40">@{BOT_USERNAME} · 9 modules active</span>
              <span className="ml-auto text-[10px] font-mono text-white/20">WNSP-CE v1.0 · Flask :5001</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.from==="user"?"justify-end":"justify-start"}`}
                  data-testid={`message-${msg.from}-${idx}`}>
                  {msg.from === "bot" && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                      style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
                      <Bot size={11} className="text-violet-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs font-mono whitespace-pre-wrap leading-relaxed ${msg.from==="user"?"rounded-tr-sm":"rounded-tl-sm"}`}
                    style={{
                      background: msg.from==="user" ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                      border:     msg.from==="user" ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      color:      msg.from==="user" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.82)",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center mr-2"
                    style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
                    <Bot size={11} className="text-violet-400" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-xs"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-white/30 animate-pulse">computing…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-white/5 p-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="/encode WORD · /wls hello · /mirror store TEXT · /oracle 530nm"
                className="flex-1 bg-transparent text-white/80 text-xs font-mono placeholder-white/20 outline-none px-3 py-2 rounded-xl border border-white/8 focus:border-white/20 transition-all"
                data-testid="input-bot-command"
              />
              <button
                onClick={() => sendCommand(input)}
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-xl border border-violet-400/30 text-violet-400 hover:border-violet-400/60 hover:bg-violet-400/5 transition-all disabled:opacity-30"
                data-testid="button-send-command"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Footer stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Bot modules",    value: "10",                         color: "#8b5cf6" },
              { label: "Ψ channels",     value: "25,600",                     color: "#0ea5e9" },
              { label: "CE formula",     value: "λ=380+(n%128×3.125)nm",      color: "#10b981" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/5 p-3 text-center"
                style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-xs font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
