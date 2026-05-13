import { useState } from "react";
import { Link } from "wouter";
import { Copy, Check, ChevronDown, ChevronUp, ExternalLink, MessageSquare, FileText } from "lucide-react";

const DEPLOYED_URL = "https://nexusos.replit.app";
const REDDIT_PROFILE = "https://www.reddit.com/u/NEXUSOS-WNSP-CE-SE/";

// ── Reddit icon ───────────────────────────────────────────────────────────────
function RedditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
      style={done
        ? { background: "#16a34a20", color: "#4ade80", border: "1px solid #16a34a40" }
        : { background: "#ff450015", color: "#ff6534", border: "1px solid #ff450030" }}>
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? "Copied!" : label}
    </button>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({
  type, subreddits, title, body, tip,
}: {
  type: "post" | "comment";
  subreddits: string[];
  title?: string;
  body: string;
  tip: string;
}) {
  const [open, setOpen] = useState(false);
  const previewLines = body.split("\n").slice(0, 4).join("\n");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      {/* Header */}
      <div className="p-5 space-y-2">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
            style={type === "post"
              ? { background: "#ff450015", color: "#ff6534", border: "1px solid #ff450030" }
              : { background: "#7c3aed15", color: "#a78bfa", border: "1px solid #7c3aed30" }}>
            {type === "post" ? <FileText size={10} /> : <MessageSquare size={10} />}
            {type === "post" ? "Post" : "Comment"}
          </span>
          <div className="flex flex-wrap gap-1">
            {subreddits.map(s => (
              <a key={s} href={`https://www.reddit.com/r/${s}`} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-mono text-slate-400 hover:text-orange-400 transition-colors bg-slate-800 px-2 py-0.5 rounded">
                r/{s}
              </a>
            ))}
          </div>
        </div>
        {title && <p className="text-sm font-bold text-white leading-snug">{title}</p>}
        <p className="text-xs text-slate-500 leading-relaxed">{previewLines.slice(0, 160)}…</p>
      </div>

      {/* Expanded */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950/40 p-5">
          {title && (
            <div className="mb-3 pb-3 border-b border-slate-800">
              <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-1">Post title</p>
              <p className="text-sm font-bold text-white">{title}</p>
            </div>
          )}
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">
            {type === "post" ? "Post body" : "Comment text"}
          </p>
          <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
        </div>
      )}

      {/* Tip */}
      <div className="px-5 py-2 border-t border-slate-800/40 bg-slate-900/20">
        <p className="text-[10px] text-slate-600 leading-relaxed">💡 {tip}</p>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-800/60 flex items-center gap-3 flex-wrap">
        {title && <CopyBtn text={title} label="Copy title" />}
        <CopyBtn text={body} label={type === "post" ? "Copy body" : "Copy comment"} />
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          {open ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Preview</>}
        </button>
        <span className="ml-auto text-[10px] font-mono text-slate-700">{body.length} chars</span>
      </div>
    </div>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────
const POSTS = [
  {
    type: "post" as const,
    subreddits: ["futurology", "technology"],
    title: "The internet's replacement will speak in wavelengths, not voltages. Here's the working prototype.",
    tip: "r/futurology is open to speculative-but-sourced posts. Include the GitHub link for credibility. Don't lead with 'my project' — lead with the physics.",
    body: `Photonic computers — processors that compute with light instead of electricity — are commercially arriving around 2032. Every major chip company (Intel, IBM, TSMC) has a photonic roadmap.

The problem nobody is talking about yet: when they arrive, the entire internet stack has to be rebuilt. IP addresses, DNS, packet switching — all of it was designed for electrons, not photons.

A group has already published the replacement architecture. It is called WNSP (Wave-Navigated Spectral Protocol). Here is how it works:

Instead of assigning arbitrary IP addresses, WNSP assigns addresses derived from electromagnetic physics:

λ = 380 + (charCode mod 128) / 128 × 400 nm

Every character maps to a real wavelength. Every node on the network gets a Ψ channel — a physical position in the 25,600-dimensional Hilbert space of visible light. Two channels cannot interfere with each other, not because software enforces it, but because Maxwell's equations do.

Transaction fees are derived from E = hf. Higher-frequency channels cost more by physics, not policy. You cannot lobby Maxwell.

The working code is on npm right now:
npm install nexusos-ce-encoder

GitHub: github.com/nexusosdaily-code/NexusOS (AGPL-3.0, 2,200+ clones in two weeks)
Full spec: ${DEPLOYED_URL}/protocol

This is not a whitepaper. The encoder runs. The channel math is in the repo. The hardware builds are being documented in real time.

We are eight years early. The infrastructure is already written.`,
  },
  {
    type: "post" as const,
    subreddits: ["programming", "compsci"],
    title: "I mapped the entire ASCII alphabet to the electromagnetic spectrum. Here is what that enables.",
    tip: "r/programming appreciates concrete code and clear technical reasoning. Post in the morning UTC for best visibility. The npm install line gets upvotes from people who try it immediately.",
    body: `Here is the formula:

λ = 380 + (charCode mod 128) / 128 × 400 nm

Apply it to 'A' (charCode = 65):
65 mod 128 = 65
65 / 128 × 400 = 203.125
380 + 203.125 = 583.125 nm → yellow-green light

Every character in the printable ASCII range maps to a unique, deterministic wavelength in the visible spectrum. No collisions. No arbitrary assignments. Pure physics.

Why does this matter for programming?

1. Addressing without administration. Current IP addresses require a central authority (IANA) to assign them. Wavelength addresses are derived from Maxwell's equations — no registry needed, no censorability, no single point of capture.

2. Fee structures from physics. Transaction costs derived from E=hf mean that higher-frequency (more energetic) channels cost proportionally more to use. The fee table is the same as the physics textbook. Immutable by definition.

3. Photonic-native from day one. When photonic ASICs arrive (~2032), no rewrite is needed. The architecture already speaks in wavelengths. Today's silicon is the bridge, not the destination.

The result: 25,600 orthogonal Ψ channels (256 WDM × 50 OAM × 2 polarisations). Orthogonality guaranteed by quantum mechanics: ⟨Ψᵢ|Ψⱼ⟩ = 0.

Try it right now:

\`\`\`bash
npm install nexusos-ce-encoder
\`\`\`

\`\`\`js
import { ceEncode } from 'nexusos-ce-encoder';
const result = ceEncode('Hello');
// { wavelength: 583.1, band: 52, psiChannel: 'Ψ(52,1,H)', energy: 3.41e-19 }
\`\`\`

Full specification: ${DEPLOYED_URL}/protocol
Source: github.com/nexusosdaily-code/NexusOS (AGPL-3.0)`,
  },
  {
    type: "post" as const,
    subreddits: ["photonics", "Physics"],
    title: "Physics-first spectral protocol: CE→λ mapping, 25,600 orthogonal Ψ channels, working implementation",
    tip: "r/photonics is small and technical. Be precise. Cite the physics correctly. The Hilbert space channel model and Maxwell validation are what this audience cares about most.",
    body: `The core premise: if photonic hardware will eventually replace silicon, the communication protocols running on that hardware should be derived from the same physics — not retrofitted from TCP/IP.

WNSP (Wave-Navigated Spectral Protocol) does this from first principles.

**Character Encoding (CE)**
Every character maps to a wavelength via:
λ = 380 + (n mod 128) / 128 × 400 nm

128 bands, 380–780 nm (visible spectrum), 3.125 nm/band. Deterministic, collision-free.

**Channel Model**
Ψ(wdm, oam, pol) where:
- wdm ∈ {1…256} — wavelength division multiplexing index
- oam ∈ {1…50} — orbital angular momentum mode
- pol ∈ {H, V} — polarisation

Total channels: 256 × 50 × 2 = 25,600
Orthogonality: ⟨Ψᵢ|Ψⱼ⟩ = 0 — guaranteed by quantum mechanics, not software policy.

**Fee model**
Transaction cost derived from E = hf = hc/λ. Higher-frequency channels are more energetic and cost proportionally more. The compression density equation: Λ = hf/c² gives the "mass equivalent" of a photon at each channel frequency.

**Authority bands**
SYSTEM (380–450 nm, UV-violet), KERNEL (450–495 nm, blue), USER (495–650 nm, green-orange), GUEST (650–780 nm, red). Higher authority = shorter wavelength = higher energy = higher fee.

**Current implementation**
- npm: nexusos-ce-encoder (95 weekly downloads)
- pip: available via GitHub subdirectory install
- Full Maxwell validation in the Python kernel
- Spectrometer-verified hardware builds in progress (documented in the experiment log)

Source: github.com/nexusosdaily-code/NexusOS (AGPL-3.0)
Specification: ${DEPLOYED_URL}/protocol

Open to critique on the channel model and the CE band width selection. The 3.125 nm/band figure was chosen to fit 128 bands cleanly into the visible range — happy to discuss the tradeoffs.`,
  },
  {
    type: "post" as const,
    subreddits: ["networking", "netsec"],
    title: "What if network addressing was derived from Maxwell's equations instead of IANA committees?",
    tip: "r/networking is skeptical of hype. Frame it as a protocol proposal, not a product. The IANA critique lands well there. Be prepared to defend the physics in comments.",
    body: `This is a genuine question I have been working on for the past year, and now have a working implementation of.

Current problem: IP addresses are administrative. IANA assigns them. Governments can seize them. DNS can be censored. The entire addressing layer of the internet is governed by committees and subject to political capture.

Alternative: derive addresses from physics.

The proposal — WNSP (Wave-Navigated Spectral Protocol):

Every node gets a Ψ channel: Ψ(wdm, oam, polarisation)
- 256 wavelength division multiplexing indices
- 50 orbital angular momentum modes
- 2 polarisation states
= 25,600 orthogonal channels

Addressing formula: λ = 380 + (charCode mod 128) / 128 × 400 nm

A node's address is derived from its character sequence, mapped to a physical wavelength, assigned to a Ψ channel. The assignment algorithm is deterministic and public. No registry. No IANA. No single point of capture.

**Censorship resistance**: To block a WNSP address, you would need to block a specific wavelength of light from propagating. That is not a policy problem — it is a physics problem.

**Fee structure**: Transaction costs derived from E = hf. Higher-frequency channels cost more, by physics, not by policy.

The working encoder is on npm (nexusos-ce-encoder). The full protocol specification is at ${DEPLOYED_URL}/protocol. Source is AGPL-3.0 on GitHub.

Obvious objection: this is designed for photonic hardware that does not widely exist yet (~2032 commercial timeline). The silicon implementation today is a bridge. The protocol is written for the destination hardware, not the bridge.

Interested in technical critique of the channel model, the addressing scheme, and the fee derivation.`,
  },
  {
    type: "comment" as const,
    subreddits: ["MachineLearning", "artificial", "singularity"],
    tip: "Drop this as a comment in threads about AI hardware bottlenecks, photonic chips, or post-silicon computing. Works well as a reply to 'what comes after GPUs?' type comments.",
    body: `Worth flagging: there is a group building communication infrastructure explicitly designed for photonic hardware rather than retrofitted from TCP/IP.

The core idea is character encoding to wavelength: λ = 380 + (charCode mod 128) / 128 × 400 nm. Every character gets a unique physical address in the visible spectrum. Network channels are Ψ(wdm, oam, pol) positions in Hilbert space — 25,600 total, orthogonal by quantum mechanics.

The reason it matters for AI: when models run on photonic chips, the data bus and addressing layer should speak natively in wavelengths. Latency from address translation is a real cost at inference scale.

Working encoder on npm: nexusos-ce-encoder
Spec: ${DEPLOYED_URL}/protocol
Source: github.com/nexusosdaily-code/NexusOS (AGPL-3.0)

It's open source and physics-based, so anyone can verify the math.`,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RedditPage() {
  const [allCopied, setAllCopied] = useState(false);

  function copyAll() {
    const combined = POSTS.map(p =>
      `${p.type === "post" ? `TITLE: ${p.title}\n\n` : ""}SUBREDDITS: ${p.subreddits.map(s => "r/" + s).join(", ")}\n\n${p.body}`
    ).join("\n\n" + "─".repeat(60) + "\n\n");
    navigator.clipboard.writeText(combined);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }

  const posts = POSTS.filter(p => p.type === "post");
  const comments = POSTS.filter(p => p.type === "comment");

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3 flex-wrap">
        <Link href="/community">
          <button className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
            ← Community
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <RedditIcon size={18} />
          <div>
            <h1 className="text-sm font-bold text-white">Reddit Post Kit</h1>
            <p className="text-[11px] text-slate-500">4 posts · 1 comment template · ready to paste</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={copyAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={allCopied
              ? { background: "#16a34a20", color: "#4ade80", border: "1px solid #16a34a40" }
              : { background: "#ff450012", color: "#ff6534", border: "1px solid #ff450030" }}>
            {allCopied ? <><Check size={12} /> All copied</> : <><Copy size={12} /> Copy all</>}
          </button>
          <a href={REDDIT_PROFILE} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "#ff450012", color: "#ff6534", border: "1px solid #ff450030" }}>
            <RedditIcon size={12} /> Open profile <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Intro */}
        <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 p-5 space-y-3">
          <p className="text-sm font-bold text-white">How to use this</p>
          <ol className="text-xs text-slate-400 space-y-2 leading-relaxed list-decimal list-inside">
            <li>Each card shows which subreddits it's written for. Click the subreddit tag to open it in a new tab.</li>
            <li>Copy the title, then copy the body — paste them into the Reddit post form separately.</li>
            <li>For comments, find an existing thread on that topic and paste the comment as a reply.</li>
            <li>Read the tip on each card — it tells you the best time to post and what that community responds to.</li>
          </ol>
          <p className="text-xs text-slate-600 font-mono">
            Reddit karma tip: answer comments promptly in the first hour. Posts that get early engagement surface in the subreddit feed much longer.
          </p>
        </div>

        {/* Posts */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest px-1">Posts ({posts.length})</p>
          <div className="space-y-4">
            {posts.map((p, i) => <PostCard key={i} {...p} />)}
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <p className="text-xs font-mono text-slate-600 uppercase tracking-widest px-1">Comment templates ({comments.length})</p>
          <div className="space-y-4">
            {comments.map((p, i) => <PostCard key={i} {...p} />)}
          </div>
        </div>

        {/* Username tip */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Suggested Reddit profile bio</p>
          <div className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-slate-300 leading-relaxed border border-slate-800">
            Building WNSP — a physics-first communication protocol for the photonic computing era. λ = 380 + (charCode mod 128) / 128 × 400 nm. Open source, AGPL-3.0. {DEPLOYED_URL}/start
          </div>
          <CopyBtn
            text={`Building WNSP — a physics-first communication protocol for the photonic computing era. λ = 380 + (charCode mod 128) / 128 × 400 nm. Open source, AGPL-3.0. ${DEPLOYED_URL}/start`}
            label="Copy bio text"
          />
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-center gap-4">
            <Link href="/community"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">community</span></Link>
            <Link href="/quora"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">quora kit</span></Link>
            <Link href="/start"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">start</span></Link>
            <Link href="/protocol"><span className="text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer font-mono">protocol</span></Link>
          </div>
        </div>

      </div>
    </div>
  );
}
