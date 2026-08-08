import { useState, useRef, useEffect, useCallback } from "react";
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
  // ── Constitution & governance ─────────────────────────────────────────────
  { route: "/constitution", title: "NexusOS Constitution", desc: "The immutable protocol constitution — articles, amendments, physics seal at λ=542.5 nm", keywords: ["constitution","articles","amendments","seal","genesis","protocol law","immutable","psi seal","physics seal","amendment history","governance law"] },
  { route: "/constitution/compliance", title: "Protocol Compliance Dashboard", desc: "Live read of every constitutional rule — energy, concentration, BHLS, Maxwell compliance", keywords: ["compliance","dashboard","protocol compliance","maxwell","bhls","living standard","energy backed","concentration","c-0001","c-0002","c-0005","verify","audit","rules"] },
  // ── Physics sequence pages ────────────────────────────────────────────────
  { route: "/standing-wave-trap", title: "Standing Wave Trap", desc: "Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) — how counterpropagating modes form stable compression states", keywords: ["standing wave","wave trap","psi trap","counterpropagating","trap","k hat","compression state","mass formation","resonance","double slit","observer","measurement","wavefunction"] },
  { route: "/lossless-channel", title: "Lossless Channel", desc: "Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ) — tensor product of trap pairs forming a coherent transmission channel", keywords: ["lossless","channel","tensor product","coherent","transmission","dlcz","entanglement channel","teleportation channel"] },
  { route: "/the-observer", title: "The Observer", desc: "Act 10 — the standing wave trap as self-measuring observer; einselection and pointer states", keywords: ["observer","measurement","collapse","einselection","pointer state","decoherence","wavefunction collapse","measure","which path","which-path","act 10"] },
  { route: "/the-memory", title: "The Memory", desc: "Act 14 — quantum memory, T₂≤2T₁, DLCZ protocol, atomic frequency comb (AFC)", keywords: ["memory","quantum memory","t2","t1","dlcz","afc","atomic frequency comb","coherence time","decoherence","act 14","repeater"] },
  { route: "/the-entangler", title: "The Entangler", desc: "Act 15 — entanglement generation between trap pairs, Bell states, teleportation fidelity", keywords: ["entangler","entanglement","bell state","teleportation","fidelity","act 15","epr","er=epr"] },
  { route: "/the-field", title: "The Field", desc: "The compression field Λ=hf/c² as the unified substrate — all forces as octave regimes", keywords: ["field","compression field","lambda","unified field","four forces","unification","act","substrate"] },
  { route: "/the-emitter", title: "The Emitter", desc: "Photon emission from octave transitions — ΔE = hf₀(2ⁿ²−2ⁿ¹), spectral line derivation", keywords: ["emitter","emission","photon","octave transition","delta e","spectral line","act"] },
  { route: "/the-network", title: "The Network", desc: "Multi-node spectral relay mesh — how traps chain into a coherent network", keywords: ["network","relay","mesh","spectral relay","chain","nodes","multi node"] },
  { route: "/the-coherent-state", title: "The Coherent State", desc: "Coherent states â|α⟩=α|α⟩, minimum uncertainty ΔX₁·ΔX₂=¼, phase-space representation", keywords: ["coherent state","alpha","minimum uncertainty","phase space","glauber","annihilation","act"] },
  { route: "/the-squeezed-state", title: "The Squeezed State", desc: "Squeezed light r=½log(Λ₂/Λ₁), noise below shot noise in one quadrature, Bogoliubov squeezing", keywords: ["squeezed","squeezing","shot noise","quadrature","noise","r parameter","below vacuum","act"] },
  { route: "/the-bogoliubov-transform", title: "The Bogoliubov Transform", desc: "r(n→m)=(m−n)·½·log(2) — inter-octave mass displacement, vacuum particle creation", keywords: ["bogoliubov","transform","squeezing parameter","octave jump","mass displacement","particle creation","hawking","unruh","act"] },
  { route: "/resonance-cavity", title: "Resonance Cavity", desc: "WGM cavity 2πR=nλ — whispering gallery mode resonator, Purcell enhancement", keywords: ["resonance cavity","cavity","wgm","whispering gallery","purcell","round trip","resonator"] },
  { route: "/polariton-exchange", title: "Polariton Exchange", desc: "Light-matter coupling χ=g²/Δ — exciton-polariton condensate, strong coupling regime", keywords: ["polariton","exciton","light matter","strong coupling","condensate","chi","coupling","exchange"] },
  { route: "/cosmic-lattice", title: "Cosmic Lattice", desc: "BAO scale n=264.71, δ_c=1.686, λ_BAO=147 Mpc — universe as octave lattice", keywords: ["cosmic","lattice","bao","baryon acoustic","large scale","universe","cosmology","n=264","147 mpc"] },
  { route: "/resonance-propulsion", title: "Resonance Propulsion", desc: "Propulsion from asymmetric radiation pressure on resonant compression states", keywords: ["propulsion","resonance propulsion","thrust","radiation pressure","asymmetric","drive","space","propulsion system"] },
  { route: "/quantum-threshold", title: "Quantum Threshold", desc: "The decoherence boundary — Penrose-Diósi τ=ℏ/E_G, macroscopic quantum superposition limit", keywords: ["quantum threshold","decoherence boundary","penrose","diosi","objective reduction","collapse","macro","superposition limit","threshold"] },
  // ── Theory & physics reference ────────────────────────────────────────────
  { route: "/unified-compression-theory", title: "Unified Compression Theory", desc: "Full derivation — Λ=hf/c² from Maxwell equations, force unification, octave lattice", keywords: ["unified","compression theory","derivation","maxwell","force unification","full theory","unified compression"] },
  { route: "/matter-protocol", title: "Matter Protocol", desc: "How compression states produce stable matter — resonant hypersurfaces, ghost nodes", keywords: ["matter","protocol","hypersurface","ghost node","stable matter","resonant","matter protocol"] },
  { route: "/element-catalogue", title: "Element Catalogue", desc: "Periodic table as octave-lattice subset — each element mapped to octave index n", keywords: ["element","catalogue","periodic table","octave index","elements","atoms","catalogue"] },
  { route: "/octave-layers", title: "Octave Layers", desc: "The discrete frequency bands of the compression manifold — n=1 to n=∞ lattice structure", keywords: ["octave","layers","bands","frequency bands","manifold","lattice","n levels","octave layers"] },
  { route: "/universal-address", title: "Universal Address", desc: "Ψ(WDM, OAM, Pol) coordinate system — every entity has a unique spectral address", keywords: ["universal address","psi address","wdm","oam","polarisation","coordinate","spectral address","uri","wnsp uri"] },
  { route: "/universal-one", title: "Universal One", desc: "The single seed frequency f₀=555 THz from which the entire octave lattice is derived", keywords: ["universal one","f0","555 thz","seed frequency","origin frequency","base frequency","universal one"] },
  { route: "/planck-alignment", title: "Planck Alignment", desc: "Aligning the NexusOS constants to Planck-scale physics — ħ, G, c in the compression field", keywords: ["planck","alignment","planck scale","constants","hbar","gravitational","fundamental","planck alignment"] },
  { route: "/paper", title: "Research Paper", desc: "The formal NexusOS research paper — full derivations, prior art, claims 1–35", keywords: ["paper","research paper","formal","derivation","prior art","claims","whitepaper","academic","publish"] },
  { route: "/proof", title: "Proof", desc: "Experimental proof pages — hardware verification, protocol evidence", keywords: ["proof","evidence","experimental","verify","verification","hardware proof","demonstrate"] },
  { route: "/reposed-theory", title: "Reposed Theory", desc: "Te Rata Pou's restatement of the physics — founder's first-principles narrative", keywords: ["reposed","theory","founder","te rata","narrative","restatement","origin story","reposed theory"] },
  { route: "/orbital-treasury", title: "Orbital Treasury", desc: "NXT fee destination — all protocol fees accumulate here, never burned", keywords: ["orbital treasury","treasury","fees","nxt fees","accumulate","protocol fees","orbital"] },
  { route: "/psi-board", title: "Ψ Board", desc: "Visual Ψ-channel board — live channel activity, OAM/WDM/Pol state display", keywords: ["psi board","board","channel activity","oam","wdm","pol","visual","psi channel","live"] },
  { route: "/nexus-hardware-os", title: "Nexus Hardware OS", desc: "Hardware operating system layer — photonic chip interface, PHR-1, SNIC integration", keywords: ["hardware os","photonic","phr-1","snic","chip","hardware operating system","photonic chip","nexus hardware"] },
];

type Msg = {
  from: "user" | "bot";
  text: string;
  /** keyword-match navigation: auto-navigate to this route */
  route?: string;
  title?: string;
  /** AI-answer: optional "go deeper" chip */
  deeperRoute?: string;
  deeperTitle?: string;
  /** loading indicator */
  isThinking?: boolean;
};

export function matchPage(input: string) {
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

export const SUGGESTIONS = [
  "How do I deploy a BRC-20 token?",
  "Show me the WNSP Virtual Machine",
  "What is the Theory of Compression States?",
  "How does the CE-SE pipeline work?",
  "Where is the NXT wallet?",
  "What is the standing wave trap?",
  "Show me the Constitution",
  "What is the Bogoliubov transform?",
  "How does the observer work?",
  "Show me protocol compliance",
  "How do I sign a contract with my wavelength?",
  "What is WavelengthScript?",
  // This entry intentionally matches NO PAGES keyword — it always takes the async /api/guide/ask path.
  // Keep it keyword-free so the async chip branch stays tested. See GuideBot.test.tsx CONCEPTUAL_Q guard.
  "What is your pricing methodology?",
];

/**
 * Subset of SUGGESTIONS that must ALWAYS score 0 against every PAGES entry
 * and therefore always take the async /api/guide/ask path.
 *
 * Exported so GuideBot.test.tsx can guard each entry with matchPage and fail
 * loudly if a future PAGES addition accidentally introduces a keyword that
 * matches one of these, which would silently reroute it to keyword-navigation
 * and stop exercising the async chip branch.
 *
 * Rules for adding entries here:
 *   • The string must share no keyword substring with any PAGES[*].keywords entry.
 *   • The string must share no whitespace-delimited word with any PAGES[*].title.
 *   • Verify with: matchPage("<your string>") === null  (run the guard test).
 */
export const ASYNC_SUGGESTIONS: readonly string[] = [
  "What is your pricing methodology?",
];

const STORAGE_KEY = "nexusos-guidebot-history";
const GREETING: Msg = { from: "bot", text: "Hi! I'm the NexusOS guide. Ask me anything about the physics, protocol, or features." };

function loadMessages(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [GREETING];
    const parsed = JSON.parse(raw) as Msg[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [GREETING];
    // Drop any transient thinking indicators left over from an interrupted session
    return parsed.filter(m => !m.isThinking);
  } catch {
    return [GREETING];
  }
}

function saveMessages(msgs: Msg[]) {
  try {
    // Never persist thinking-indicator messages
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.filter(m => !m.isThinking)));
  } catch {
    // Storage quota exceeded or private-browsing restriction — silently skip
  }
}

export default function GuideBot() {
  const [open, setOpen]         = useState(false);
  const [input, setInput]       = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(loadMessages);
  const [, navigate] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    saveMessages(messages);
  }, [messages]);

  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setInput("");

    const userMsg: Msg = { from: "user", text: q };
    const page = matchPage(q);

    if (page) {
      // Keyword match → navigate immediately
      const botMsg: Msg = {
        from: "bot",
        text: `Opening **${page.title}** — ${page.desc}`,
        route: page.route,
        title: page.title,
      };
      setMessages(m => [...m, userMsg, botMsg]);
      setTimeout(() => navigate(page.route), 400);
      setTimeout(() => setOpen(false), 900);
      return;
    }

    // No keyword match → ask the AI knowledge base
    const thinkingMsg: Msg = { from: "bot", text: "", isThinking: true };
    setMessages(m => [...m, userMsg, thinkingMsg]);
    setThinking(true);

    try {
      const resp = await fetch("/api/guide/ask", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const botMsg: Msg = {
        from:        "bot",
        text:        data.answer || "I couldn't find an answer for that.",
        deeperRoute: data.route      ?? undefined,
        deeperTitle: data.routeTitle ?? undefined,
      };
      setMessages(m => [...m.slice(0, -1), botMsg]);
    } catch {
      setMessages(m => [
        ...m.slice(0, -1),
        { from: "bot", text: "Guide temporarily unavailable — try a suggestion below or ask about a specific page." },
      ]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, navigate]);

  return (
    <>
      {/* Floating trigger — bottom left */}
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
          style={{ position: "fixed", bottom: "80px", left: "24px", zIndex: 9997, width: "min(400px, calc(100vw - 48px))" }}
          className="rounded-2xl border border-violet-500/30 bg-[#0a0a12] shadow-2xl shadow-violet-900/40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/8 bg-violet-950/40 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <div className="flex-1">
              <div className="text-xs font-mono font-bold text-white/80">NexusOS Guide</div>
              <div className="text-[9px] font-mono text-white/30">Physics · Protocol · Features — ask anything</div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-72">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                  m.from === "user"
                    ? "bg-violet-600/30 border border-violet-500/30 text-white/80"
                    : "bg-white/5 border border-white/8 text-white/70"
                }`}>
                  {m.isThinking ? (
                    /* Animated thinking dots */
                    <span className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : m.from === "bot" && m.route ? (
                    /* Keyword-match navigation message */
                    <>
                      <span className="text-violet-300 font-bold">↗ {m.title}</span>
                      <div className="text-white/40 text-[10px] mt-0.5">Navigating now…</div>
                    </>
                  ) : (
                    /* Regular text + optional "go deeper" chip */
                    <>
                      <span>{m.text}</span>
                      {m.deeperRoute && (
                        <button
                          onClick={() => { navigate(m.deeperRoute!); setOpen(false); }}
                          className="mt-2 flex items-center gap-1 text-[10px] font-mono text-violet-300 border border-violet-500/30 rounded-full px-2.5 py-0.5 hover:bg-violet-500/20 transition-all"
                        >
                          ↗ {m.deeperTitle ?? "Go deeper"}
                        </button>
                      )}
                    </>
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
                {s.replace(/^(How do I |Show me the |What is the |What is |Where is the |Where is |How does the |How does )/, "")}
              </button>
            ))}
          </div>
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
            {SUGGESTIONS.slice(4).map(s => (
              <button key={s} onClick={() => send(s)}
                className="shrink-0 text-[9px] font-mono px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300/70 hover:bg-violet-500/20 hover:text-violet-300 transition-all whitespace-nowrap">
                {s.replace(/^(How do I |Show me the |What is the |What is |Where is the |Where is |How does the |How does )/, "")}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-white/5 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !thinking && send()}
              placeholder="Ask anything about NexusOS…"
              disabled={thinking}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-violet-500/40 disabled:opacity-50"
              data-testid="input-guide-bot"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 transition-all disabled:opacity-30"
              data-testid="button-guide-bot-send"
            >
              {thinking ? "…" : "→"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
