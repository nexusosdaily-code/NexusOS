import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";

const PAGES: { route: string; title: string; desc: string; keywords: string[] }[] = [
  { route: "/", title: "Home / Hub", desc: "Main dashboard — all NexusOS sections", keywords: ["home","hub","dashboard","start","main","overview","begin","where"] },
  { route: "/ce-se-pipeline", title: "CE-SE Pipeline", desc: "Paste any language → transpile to WavelengthScript → compile to bytecode → run in WNSP VM", keywords: ["pipeline","transpile","compile","execute","run","bytecode","wavelengthscript","ce-se","ce se","code","language","convert","transform","demo"] },
  { route: "/wnsp-vm", title: "WNSP Virtual Machine", desc: "Browser-native bytecode interpreter — step/run execution, Ψ channel registers", keywords: ["vm","virtual machine","bytecode","interpreter","step","run","execute","registers","psi","channel","wnsp vm"] },
  { route: "/wavelength-lang", title: "WavelengthScript", desc: "WavelengthScript language spec, transpiler, and compiler", keywords: ["wavelengthscript","language","spec","syntax","transpiler","compiler","wsl","script","wavelength lang"] },
  { route: "/ce-code-writer", title: "CE Code Writer", desc: "Human First Contact CE-SE encoder, live encode, code builder, integration kit", keywords: ["encoder","ce","first contact","code builder","integration","snippet","encode","character","wascii","linter"] },
  { route: "/compression-explorer", title: "Compression Explorer", desc: "Interactive Λ=hf/c² compression curve visualisation with band overlays", keywords: ["compression","curve","lambda","visualise","visualize","graph","chart","band","frequency","energy","hf","photon"] },
  { route: "/oscillating-quanta", title: "Theory of Compression States", desc: "First Principles — the physics theory behind NexusOS", keywords: ["theory","first principles","quanta","oscillating","physics","compression states","origin","universe","science"] },
  { route: "/hardware-lab", title: "Hardware Lab", desc: "Physics calibration verifier, live spectrometer", keywords: ["hardware","lab","calibration","spectrometer","verify","physical","device","sensor"] },
  { route: "/hardware-spec", title: "Hardware Spec", desc: "AGPL-3.0 formal specification — SNIC, PHR-1, Spectral Relay Mesh, Compiler α", keywords: ["spec","snic","phr","relay","mesh","agpl","specification","formal","photonic","chip"] },
  { route: "/wnsp-ordinals", title: "Bitcoin Ordinals / BRC-20 / Runes", desc: "Deploy, mint, transfer wnsp BRC-20 token — Ordinals inscriptions, Runes etching", keywords: ["bitcoin","btc","ordinals","brc20","brc-20","rune","runes","inscription","mint","deploy","wnsp token","etch","wallet","sats","satoshi"] },
  { route: "/spectral-router", title: "Spectral Router", desc: "DNS-free packet routing between nodes using Ψ channel addressing", keywords: ["router","routing","dns","packet","node","spectral router","address","wnsp uri"] },
  { route: "/spectral-search", title: "Spectral Search", desc: "Cross-layer search across nodes, agents, users, documents, and channels", keywords: ["search","find","query","node","agent","document","cross-layer","spectral search"] },
  { route: "/spectral-contracts", title: "Spectral Contracts", desc: "Sign documents using spectral wavelength keys — physics-signed contracts", keywords: ["contract","sign","document","signature","pki","wavelength key","legal","signing"] },
  { route: "/wnsp-bridge", title: "WNSP Bridge", desc: "TCP/IP overlay for wnsp:// URIs — maps Ψ channels to HTTP resources", keywords: ["bridge","tcp","ip","uri","http","overlay","wnsp bridge","registry"] },
  { route: "/divergence-test", title: "Divergence Test", desc: "Channel-dynamics engine — attractors, feedback iterations, regime prediction", keywords: ["divergence","attractor","dynamics","feedback","regime","chaos","system","iterate"] },
  { route: "/compression-explorer", title: "Compression Explorer", desc: "Λ=hf/c² curve, band overlays, fee multiplier, Boltzmann entropy", keywords: ["boltzmann","entropy","fee","multiplier","band overlay"] },
  { route: "/network", title: "Spectral Network", desc: "Node distribution by authority band, spectral proximity", keywords: ["network","nodes","authority","band","proximity","map","spectral network"] },
  { route: "/packages", title: "Published Packages", desc: "npm nexusos-ce-encoder + Python pip package — installable CE encoder", keywords: ["package","npm","pip","install","library","sdk","ce encoder","publish"] },
  { route: "/mobile-sdk", title: "Mobile SDK", desc: "Native iOS Swift and Android Kotlin SDKs for spectral-native apps", keywords: ["mobile","ios","android","swift","kotlin","sdk","app","native"] },
  { route: "/governance", title: "Governance", desc: "On-chain protocol governance — proposals, voting, parameter changes", keywords: ["governance","vote","proposal","protocol","parameter","change","policy"] },
  { route: "/wallet", title: "NXT Wallet", desc: "NXT token wallet — balance, send, receive, transaction history", keywords: ["wallet","nxt","balance","send","receive","transfer","transaction","token","money"] },
  { route: "/auth", title: "Login / Register", desc: "Phone-based authentication — log in or create an account", keywords: ["login","register","auth","sign in","phone","account","create","access"] },
  { route: "/k1-orchestration", title: "K1 Orchestration", desc: "Kardashev Type I orchestration layer — AI agent coordination", keywords: ["k1","kardashev","orchestration","agent","ai","coordinate","type 1"] },
  { route: "/spectral-search", title: "Spectral Search", desc: "Search nodes, agents, channels by wavelength proximity", keywords: ["wavelength proximity","shannon","coherence","ranking"] },
  { route: "/community-mint", title: "Community Mint Portal", desc: "Mint 1,000 wnsp BRC-20 on Bitcoin — burn 50 NXT fee, auto-inscribed", keywords: ["community mint","mint wnsp","brc20 mint","burn nxt","inscribe","bitcoin mint","wnsp mint","community"] },
  { route: "/wnsp-staking", title: "wnsp Staking Dashboard", desc: "Lock wnsp inscription ID → earn 100 NXT per 24h epoch, claim anytime", keywords: ["staking","stake","earn","nxt reward","epoch","lock","yield","wnsp stake","inscription stake"] },
  { route: "/fractal-btc", title: "Fractal Bitcoin Bridge", desc: "Bridge inscriptions to Fractal Bitcoin L2 — same Taproot format, faster blocks", keywords: ["fractal","fractal bitcoin","l2","layer 2","bridge","faster","scaling","fractal inscription"] },
  { route: "/nxt-fb-swap", title: "NXT ↔ Fractal Bitcoin Swap", desc: "Swap NXT for wnsp on Fractal Bitcoin — or redeem wnsp back to NXT at physics rate 1 NXT = 20 wnsp", keywords: ["swap","exchange","nxt to wnsp","wnsp to nxt","fractal swap","atomic swap","defi","bridge swap","convert","nxt fb","fb to nxt"] },
];

type Msg = { from: "user" | "bot"; text: string; route?: string; title?: string };

function matchPage(input: string) {
  const q = input.toLowerCase();
  let best: { page: typeof PAGES[0]; score: number } | null = null;
  for (const page of PAGES) {
    let score = 0;
    for (const kw of page.keywords) {
      if (q.includes(kw)) score += kw.split(" ").length * 10;
    }
    if (page.title.toLowerCase().split(/\s+/).some(w => q.includes(w))) score += 5;
    if (score > 0 && (!best || score > best.score)) best = { page, score };
  }
  return best?.page ?? null;
}

const SUGGESTIONS = [
  "How do I deploy a BRC-20 token?",
  "Show me the WNSP Virtual Machine",
  "What is the Theory of Compression States?",
  "How does the CE-SE pipeline work?",
  "Where is the NXT wallet?",
  "Show me the spectral network",
  "How do I sign a contract with my wavelength?",
  "What is WavelengthScript?",
];

export default function GuideBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi! I'm the NexusOS guide. Ask me anything — I'll open the right page for you." },
  ]);
  const [, navigate] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    const userMsg: Msg = { from: "user", text: q };
    const page = matchPage(q);
    let botMsg: Msg;
    if (page) {
      botMsg = {
        from: "bot",
        text: `Opening **${page.title}** — ${page.desc}`,
        route: page.route,
        title: page.title,
      };
      setTimeout(() => navigate(page.route), 400);
      setTimeout(() => setOpen(false), 900);
    } else {
      botMsg = {
        from: "bot",
        text: "I'm not sure which page that is. Try asking about Bitcoin, wallets, the VM, pipeline, compression, contracts, or governance — or pick a suggestion below.",
      };
    }
    setMessages(m => [...m, userMsg, botMsg]);
  }

  return (
    <>
      {/* Floating trigger button — bottom left */}
      <button
        onClick={() => setOpen(o => !o)}
        title="NexusOS Guide"
        style={{ position: "fixed", bottom: "24px", left: "24px", zIndex: 9998 }}
        className="group flex items-center gap-2 rounded-full bg-violet-600 shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 hover:scale-105 transition-all duration-200 pr-4 pl-1 py-1"
        data-testid="button-guide-bot-open"
      >
        <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-lg">
          {open ? "✕" : "✦"}
        </div>
        <span className="text-white font-semibold text-sm whitespace-nowrap">
          {open ? "Close Guide" : "Ask NexusOS"}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{ position: "fixed", bottom: "80px", left: "24px", zIndex: 9997, width: "min(380px, calc(100vw - 48px))" }}
          className="rounded-2xl border border-violet-500/30 bg-[#0a0a12] shadow-2xl shadow-violet-900/40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/8 bg-violet-950/40 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <div className="flex-1">
              <div className="text-xs font-mono font-bold text-white/80">NexusOS Guide</div>
              <div className="text-[9px] font-mono text-white/30">Ask a question — I'll open the page</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-64">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                  m.from === "user"
                    ? "bg-violet-600/30 border border-violet-500/30 text-white/80"
                    : "bg-white/5 border border-white/8 text-white/70"
                }`}>
                  {m.from === "bot" && m.route ? (
                    <>
                      <span className="text-violet-300 font-bold">↗ {m.title}</span>
                      <div className="text-white/40 text-[10px] mt-0.5">Navigating now…</div>
                    </>
                  ) : (
                    m.text
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-3 py-2 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {SUGGESTIONS.slice(0, 4).map(s => (
              <button key={s} onClick={() => send(s)}
                className="shrink-0 text-[9px] font-mono px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300/70 hover:bg-violet-500/20 hover:text-violet-300 transition-all whitespace-nowrap">
                {s.replace(/^(How do I |Show me the |What is |Where is |How does |What is the )/, "")}
              </button>
            ))}
          </div>
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {SUGGESTIONS.slice(4).map(s => (
              <button key={s} onClick={() => send(s)}
                className="shrink-0 text-[9px] font-mono px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300/70 hover:bg-violet-500/20 hover:text-violet-300 transition-all whitespace-nowrap">
                {s.replace(/^(How do I |Show me the |What is |Where is |How does |What is the )/, "")}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-white/5 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask anything about NexusOS…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40"
              data-testid="input-guide-bot"
            />
            <button onClick={() => send()}
              disabled={!input.trim()}
              className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 transition-all disabled:opacity-30"
              data-testid="button-guide-bot-send">
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
