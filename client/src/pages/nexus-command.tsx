import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap, Radio, Layers, Database, Wifi, Lock, Globe,
  Send, Play, RefreshCw, ArrowRight, Activity,
  Code2, Cpu, Signal, FileText, BookOpen, Shield, Heart, Video, Scale, Smartphone, Search
} from "lucide-react";

// ── Spectrum colour ───────────────────────────────────────────────
function wlToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

// ── Live status cards ─────────────────────────────────────────────
function StatusCard({ title, value, subtitle, color, href }: {
  title: string; value: string | number; subtitle: string; color: string; href: string;
}) {
  return (
    <Link href={href}>
      <div className="rounded-xl border p-4 cursor-pointer hover:scale-[1.02] transition-transform"
        style={{ borderColor: `${color}40`, background: `${color}0a` }}
        data-testid={`status-${title.toLowerCase().replace(/\s/g,"-")}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
          <span className="text-xs font-mono text-slate-500">{title}</span>
          <ArrowRight className="w-3 h-3 text-slate-700 ml-auto" />
        </div>
        <div className="text-2xl font-bold mb-0.5" style={{ color }}>{value}</div>
        <div className="text-xs text-slate-600">{subtitle}</div>
      </div>
    </Link>
  );
}

// ── Live feed ─────────────────────────────────────────────────────
function LiveFeed() {
  const [events, setEvents] = useState<{ time: string; msg: string; color: string }[]>([]);

  const addEvent = (msg: string, color: string) => {
    const time = new Date().toLocaleTimeString();
    setEvents(prev => [{ time, msg, color }, ...prev].slice(0, 40));
  };

  const busQ = useQuery({
    queryKey: ["/api/agent-bus/status"],
    refetchInterval: 3000,
    select: (d: any) => d,
  });

  const chainQ = useQuery({
    queryKey: ["/api/blockchain/chain"],
    refetchInterval: 5000,
    select: (d: any) => d,
  });

  const nodeQ = useQuery({
    queryKey: ["/api/network/nodes"],
    refetchInterval: 8000,
    select: (d: any) => d,
  });

  useEffect(() => {
    if (busQ.data?.queued) {
      addEvent(`Agent bus: ${busQ.data.queued} message${busQ.data.queued !== 1 ? "s" : ""} queued`, "#06b6d4");
    }
  }, [busQ.data?.queued]);

  useEffect(() => {
    const blocks = (chainQ.data as any)?.blocks;
    if (blocks?.length) {
      const latest = blocks[blocks.length - 1];
      addEvent(`Block #${latest.blockNumber} @ ${latest.psiChannel ?? ""} · ${parseFloat(latest.wavelengthNm ?? 550).toFixed(1)} nm`, "#8b00ff");
    }
  }, [(chainQ.data as any)?.blocks?.length]);

  useEffect(() => {
    const nodes = nodeQ.data?.nodes;
    if (!nodes?.length) return;
    const live = nodes.filter((n: any) => n.status === "active");
    if (live.length > 0) {
      const latest = live[live.length - 1];
      addEvent(`Node beacon: ${latest.name} @ ${parseFloat(latest.wavelengthNm).toFixed(1)}nm — ${latest.psiChannel}`, "#4ade80");
    }
  }, [nodeQ.dataUpdatedAt]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60">
      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
        <Activity className="w-3 h-3 text-green-400" />
        <span className="text-xs font-mono text-slate-400">Live system feed</span>
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      </div>
      <ScrollArea className="h-36">
        <div className="p-3 space-y-1 font-mono text-xs">
          {events.length === 0 && (
            <p className="text-slate-700 italic">Waiting for events…</p>
          )}
          {events.map((e, i) => (
            <div key={i} className="flex gap-2 items-start" data-testid={`feed-event-${i}`}>
              <span className="text-slate-700 flex-shrink-0">{e.time}</span>
              <span style={{ color: e.color }}>{e.msg}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Quick-action send ─────────────────────────────────────────────
interface EncodeResult {
  wl?: number;
  psi?: string;
  energy?: number;
  band?: string;
  route?: string;
  routed?: boolean;
}

function bandOf(nm: number): { label: string; color: string } {
  if (nm < 450) return { label: "SYSTEM",   color: "#8b00ff" };
  if (nm < 490) return { label: "AUTH",     color: "#2563eb" };
  if (nm < 520) return { label: "STREAM",   color: "#06b6d4" };
  if (nm < 565) return { label: "CORE",     color: "#16a34a" };
  if (nm < 590) return { label: "UI",       color: "#ca8a04" };
  if (nm < 625) return { label: "EVENT",    color: "#ea580c" };
  return          { label: "STORAGE",       color: "#dc2626" };
}

function QuickCompose() {
  const [text,   setText]   = useState("");
  const [result, setResult] = useState<EncodeResult | null>(null);
  const [step,   setStep]   = useState<"idle" | "encoding" | "routing" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const reset = () => { setText(""); setResult(null); setStep("idle"); setErrMsg(""); };

  const go = async () => {
    if (!text.trim()) return;
    setStep("encoding");
    setResult(null);
    setErrMsg("");
    try {
      // Step 1: encode via public endpoint (no auth required)
      const encRes = await fetch("/api/nexus/dev/encode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, label: `nexus_cmd_${Date.now()}` }),
      });
      if (!encRes.ok) throw new Error(`Encode failed: ${encRes.status}`);
      const enc = await encRes.json();

      const wl     = enc.wavelength_mid_nm as number;
      const psi    = enc.psi_channel as string;
      const energy = enc.energy_joules as number;
      const band   = bandOf(wl).label;

      setResult({ wl, psi, energy, band });
      setStep("routing");

      // Step 2: route on bus (requires auth — graceful if not logged in)
      try {
        const token = localStorage.getItem("auth_token");
        const busRes = await fetch("/api/agent-bus/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            src: "os_kernel", dst: "bus_router",
            payload: `NEXUS_CMD λ=${wl.toFixed(1)}nm ${psi} ${text.slice(0, 80)}`,
            priority: 4, msgType: "MESSAGE",
          }),
        });
        const bus = busRes.ok ? await busRes.json() : null;
        setResult(r => ({ ...r!, route: bus?.route ?? "encoded only (sign in to route)", routed: busRes.ok }));
      } catch {
        setResult(r => ({ ...r!, route: "encoded · routing unavailable", routed: false }));
      }

      setStep("done");
    } catch (err: any) {
      setErrMsg(err?.message ?? "Encoding failed");
      setStep("error");
    }
  };

  const band   = result?.wl ? bandOf(result.wl) : { label: "", color: "#8b00ff" };
  const wlColor = band.color;

  return (
    <div className="rounded-xl border border-slate-700 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-3 h-3 text-cyan-400" />
        <span className="text-xs font-mono text-slate-400">Quick encode & route</span>
        {result?.wl && (
          <span className="ml-auto text-xs font-mono font-bold" style={{ color: wlColor }}>
            {result.wl.toFixed(1)} nm · {band.label}
          </span>
        )}
      </div>

      {/* Input bar — always visible unless done */}
      {step !== "done" && (
        <div className="flex gap-2">
          <Input value={text} onChange={e => setText(e.target.value)}
            placeholder="Type any message, instruction, or command…"
            className="bg-slate-900 border-slate-700 text-slate-200 text-sm"
            onKeyDown={e => e.key === "Enter" && step === "idle" && go()}
            disabled={step === "encoding" || step === "routing"}
            data-testid="quick-compose-input" />
          <Button onClick={step === "error" ? reset : go}
            disabled={(step === "encoding" || step === "routing") || (!text && step === "idle")}
            data-testid="quick-compose-send">
            {step === "idle"     ? "Encode"      :
             step === "encoding" ? "Encoding…"   :
             step === "routing"  ? "Routing…"    :
             step === "error"    ? "Try again"   : "Send"}
          </Button>
        </div>
      )}

      {/* Encoding progress */}
      {(step === "encoding" || step === "routing") && (
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#06b6d4" }} />
          {step === "encoding" ? "Converting characters → CE tokens → SE wave frames…"
                               : "Assigning Ψ channel and routing on spectral bus…"}
        </div>
      )}

      {/* Error state */}
      {step === "error" && (
        <div className="flex items-center gap-2 text-xs font-mono text-red-400">
          <span>✗ {errMsg}</span>
          <button onClick={reset} className="ml-auto text-slate-600 hover:text-slate-400 underline">reset</button>
        </div>
      )}

      {/* Result: spectral card */}
      {result?.wl && (
        <div className="rounded-lg border p-3 space-y-2"
          style={{ borderColor: `${wlColor}30`, background: `${wlColor}08` }}>
          {/* Spectrum bar with marker */}
          <div className="relative h-3 rounded overflow-hidden"
            style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }}>
            <div className="absolute top-0 bottom-0 w-1 bg-white/90 rounded shadow"
              style={{ left: `${Math.min(98, Math.max(1, ((result.wl - 380) / 400) * 100))}%`, transform: "translateX(-50%)" }} />
          </div>

          {/* Key values */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              { label: "Wavelength",  value: `${result.wl.toFixed(2)} nm`,                    color: wlColor },
              { label: "Ψ Channel",   value: result.psi ?? "—",                               color: wlColor },
              { label: "Band",        value: result.band ?? "—",                               color: wlColor },
              { label: "Energy",      value: result.energy ? `${result.energy.toExponential(2)} J` : "—", color: null },
            ].map((m, i) => (
              <div key={i} className="p-1.5 rounded bg-slate-900/60">
                <div className="text-slate-600 mb-0.5">{m.label}</div>
                <div style={{ color: m.color ?? "#e2e8f0" }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Confirmation / route */}
          {step === "done" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs font-mono text-green-400">Encoded</span>
                {result.routed && <span className="text-xs font-mono text-cyan-400 ml-2">· Routed</span>}
              </div>
              <button onClick={reset}
                className="text-xs font-mono text-slate-600 hover:text-slate-400 transition-colors">
                encode another
              </button>
            </div>
          )}
          {result.route && (
            <p className="text-xs font-mono text-slate-600 truncate">{result.route}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── System grid ───────────────────────────────────────────────────
const SYSTEMS = [
  {
    title: "Fund NexusOS",
    description: "Crowdfunding campaign for hardware development. AGPL-3.0, open source, publicly traded. PHR-1 hardware prototype, WavelengthScript SDK, Spectral Relay Mesh. Five funding tiers from 100 NXT to 1M NXT.",
    href: "/crowdfund",
    color: "#ec4899",
    Icon: Heart,
    action: "Fund the mission",
  },
  {
    title: "Indiegogo Campaign",
    description: "Back the PHR-1 hardware prototype on Indiegogo with USD. Five perk tiers from $5 (digital Founder) to $5,000 (Strategic Board Seat). Flexible funding — all contributions count. Nexus Shares issued on-chain to every backer.",
    href: "/indiegogo",
    color: "#eb1478",
    Icon: Globe,
    action: "View campaign",
  },
  {
    title: "SNIC — Hardware Goal #1",
    description: "Spectral Network Interface Card. 185,000× silicon speed. Micro-ring resonator at 555 THz. Hardware WASCII-to-Wavelength gates bypass the CPU. 10 TB backup in 144 ms — while NVMe is still waking up.",
    href: "/snic",
    color: "#16a34a",
    Icon: Cpu,
    action: "See the hardware",
  },
  {
    title: "WNSP Bridge — wnsp://",
    description: "Spectral addressing on current infrastructure. CE→SE (WASCII v1.0) derives a deterministic Ψ(wdm,oam,pol) address from any text — username, code, content. Phase 1 runs over TCP/IP today. Phase 3: native photonic routing when hardware arrives. Your wnsp:// identity is permanent — physics assigns it, no server can revoke it.",
    href: "/wnsp-bridge",
    color: "#06b6d4",
    Icon: Radio,
    action: "Open WNSP Bridge",
  },
  {
    title: "Open Infrastructure Charter",
    description: "AGPL-3.0 means this protocol belongs to physics, not to any company. Full explanation of every stack layer — protocol, OS, database, hardware, language, energy — and the blueprint from today's software to the complete Nexus civilization infrastructure.",
    href: "/open",
    color: "#f59e0b",
    Icon: Scale,
    action: "Read the charter",
  },
  {
    title: "Nexus Message Encoder",
    description: "Turn any text into a wavelength of light. Encode, decode, and send messages that no server can intercept.",
    href: "/encoding-lab",
    color: "#8b00ff",
    Icon: Zap,
    action: "Encode a message",
  },
  {
    title: "Live Spectral Streams",
    description: "Broadcast video and audio on an open spectrum channel. No platform, no algorithm, no ban button.",
    href: "/streaming",
    color: "#06b6d4",
    Icon: Wifi,
    action: "Start or watch a stream",
  },
  {
    title: "Wavelength Blockchain",
    description: "Every block is a photonic transaction. Energy costs derived from physics, not corporate policy.",
    href: "/blockchain",
    color: "#16a34a",
    Icon: Layers,
    action: "Mine a block",
  },
  {
    title: "Agent Message Bus",
    description: "Intelligent routing across spectral authority bands. Messages travel by physics, not by IP routing tables.",
    href: "/agent-bus",
    color: "#ca8a04",
    Icon: Radio,
    action: "Route a message",
  },
  {
    title: "Spectral Media",
    description: "Video stored at its Ψ channel address — no CDN, no DNS. Upload a file and it streams from a physical wavelength. The WNSP philosophy applied to media: tune to a frequency, not a URL.",
    href: "/spectral-db?tab=media",
    color: "#a855f7",
    Icon: Video,
    action: "Open media library",
  },
  {
    title: "Spectrum Map",
    description: "Every record at its physical position on the electromagnetic spectrum. Auth records cluster in violet, core logic in green, storage in red. Physics categorises automatically — no tags, no folders.",
    href: "/spectral-db?tab=map",
    color: "#06b6d4",
    Icon: Activity,
    action: "View spectrum map",
  },
  {
    title: "Evidence Ledger",
    description: "On-chain proof of every achievement. Block #4: 'angry birds' 25MB at Ψ(211,35,H) 534.51nm. 479 spectral records. 478 confirmed transactions. 6 agents at Ψ addresses. Every claim verifiable.",
    href: "/evidence",
    color: "#f59e0b",
    Icon: Shield,
    action: "View proof board",
  },
  {
    title: "NexusOS Chronicle",
    description: "The permanent historical ledger. Every founding event, discovery, and proof encoded into its wavelength address. The record that cannot be censored.",
    href: "/chronicle",
    color: "#eab308",
    Icon: BookOpen,
    action: "View history",
  },
  {
    title: "Nexus Spectral Framework",
    description: "The unified communication database. Write, retrieve, stream media, map the spectrum, and bulk import — all in one place. CE→SE encoding assigns every piece of data a permanent physical wavelength address. Physics is the database engine.",
    href: "/spectral-db",
    color: "#dc2626",
    Icon: Database,
    action: "Open framework",
  },
  {
    title: "P2P Media Transmission",
    description: "Share files, video, and documents peer-to-peer, encrypted by wavelength. No middleman server.",
    href: "/transmission",
    color: "#7c3aed",
    Icon: Signal,
    action: "Send a file",
  },
  {
    title: "Photonic Dev Environment",
    description: "Write code, build apps, and scaffold operating systems where every instruction is a frequency of light.",
    href: "/photonic-dev",
    color: "#2563eb",
    Icon: Code2,
    action: "Open dev environment",
  },
  {
    title: "NXT Wallet",
    description: "Send and receive NXT tokens. Transaction fees are computed from actual physical energy — E=hf.",
    href: "/wallet",
    color: "#059669",
    Icon: Cpu,
    action: "Open wallet",
  },
  {
    title: "Spectral Network",
    description: "Register your node and let it emit at its CE→SE wavelength. Other nodes discover it by tuning to that band. No IP registry. No DNS. The name of a node is its address.",
    href: "/network",
    color: "#4ade80",
    Icon: Wifi,
    action: "Register a node",
  },
  {
    title: "WavelengthScript",
    description: "The first programming language where every symbol has a physical address in light. Transpile from Python, JS, or Rust. Build AI agents that live on Ψ channels. AGPL-3.0 open spec.",
    href: "/wavelength-lang",
    color: "#8b00ff",
    Icon: Code2,
    action: "Open language spec",
  },
  {
    title: "Mobile SDK",
    description: "iOS (Swift) and Android (Kotlin) wrappers for the WASCII API. CE→SE encode any word to its Ψ channel, discover peers without DNS, and build spectral-native mobile apps. AGPL-3.0.",
    href: "/mobile-sdk",
    color: "#06b6d4",
    Icon: Smartphone,
    action: "Open Mobile SDK",
  },
  {
    title: "WNSP Virtual Machine",
    description: "Execute WavelengthScript bytecode step by step. Ψ channels are registers. The spectrum is the CPU. Watch each opcode fire at its wavelength — agents pulse, packets flow, AI lives on the spectrum.",
    href: "/wnsp-vm",
    color: "#a78bfa",
    Icon: Cpu,
    action: "Launch VM",
  },
  {
    title: "Spectral Routing Engine",
    description: "Route packets between nodes using Ψ channels instead of IP addresses. Nearest-wavelength delivery algorithm. DNS-free. Address any node by name — CE→SE encodes it to λ in real time.",
    href: "/spectral-router",
    color: "#4ade80",
    Icon: Radio,
    action: "Open router",
  },
  {
    title: "Spectral Search",
    description: "Search the WNSP network by wavelength proximity. Your query is CE-encoded to λ — results closest on the electromagnetic spectrum rank first. Not keyword frequency. Spectral distance.",
    href: "/spectral-search",
    color: "#fbbf24",
    Icon: Search,
    action: "Search network",
  },
  {
    title: "Compression State Explorer",
    description: "Interactive visualisation of Λ=hf/c² across the visible spectrum. Explore how wavelength maps to compression state, authority band, fee multiplier, and mass. The Theory of Compression States, live.",
    href: "/compression-explorer",
    color: "#fb923c",
    Icon: Layers,
    action: "Explore states",
  },
  {
    title: "Physics-Signed Contracts",
    description: "Sign documents with your spectral wavelength key — no RSA, no PKI. Signature = SHA-256(content) ⊕ hex(λ). Verifiable by anyone with a CE encoder. The first physics-native signing standard.",
    href: "/spectral-contracts",
    color: "#22d3ee",
    Icon: FileText,
    action: "Sign a contract",
  },
  {
    title: "Communication Hub",
    description: "Spectral messaging between users. Every message is encoded through CE→SE — your words travel as wavelengths of light, not packets of bytes.",
    href: "/communication",
    color: "#06b6d4",
    Icon: Radio,
    action: "Open messages",
  },
  {
    title: "Orbital Treasury",
    description: "Constitutional economy: every file deletion generates NXT ordinals flowing to the Orbital Treasury — 5 buckets including 10% to the Chairman Founder Nexus Charitable Trust.",
    href: "/orbital-treasury",
    color: "#f43f5e",
    Icon: Globe,
    action: "View treasury",
  },
  {
    title: "Ecosystem Interconnect",
    description: "All 6 systems — Spectral DB, Blockchain, Treasury, Energy Ledger, Agent Bus, Kernel — sharing data in real time. Every system feeds every other.",
    href: "/ecosystem",
    color: "#a855f7",
    Icon: Activity,
    action: "View ecosystem",
  },
  {
    title: "Ordinal Input Registry",
    description: "Formal constitutional definition of all 9 communication input types (STORE, UPLOAD, DELETE, MESSAGE, TRANSMIT, ENCODE, BROADCAST, CALL, RETRIEVE) — each generates NXT ordinals derived from Λ=hf/c².",
    href: "/ordinal-registry",
    color: "#f59e0b",
    Icon: Zap,
    action: "View registry",
  },
];

// ── Civilization pillars ──────────────────────────────────────────
const PILLARS = [
  {
    label: "No Binary",
    detail: "Every instruction is a wavelength of light, not a 0 or a 1. The spectrum of visible light gives us 400nm of address space — far richer than binary.",
    color: "#8b00ff",
    Icon: Code2,
  },
  {
    label: "No IP Addresses",
    detail: "Wavelength addressing means data finds its destination by the physics of light, not by an address handed out by ICANN or your ISP.",
    color: "#2563eb",
    Icon: Globe,
  },
  {
    label: "No Surveillance",
    detail: "When a message is encoded into a spectral channel, its content is not readable by anyone who intercepts it without the channel key — a property of the wave, not a password.",
    color: "#06b6d4",
    Icon: Lock,
  },
  {
    label: "No Platform",
    detail: "Livestreams, messages, files, and code run on open spectrum — like radio but two-way, encrypted, and with no broadcast licence required.",
    color: "#16a34a",
    Icon: Wifi,
  },
  {
    label: "No Arbitrary Fees",
    detail: "Transaction cost = E=hf. The energy to transmit your message at its wavelength. Calculated from physics. Stable. Predictable. Not set by a board room.",
    color: "#ca8a04",
    Icon: Zap,
  },
  {
    label: "Open Forever",
    detail: "AGPL-3.0 means every company that builds on NexusOS must publish their code too. The infrastructure of civilisation cannot be owned.",
    color: "#dc2626",
    Icon: Globe,
  },
];

// ── Main ──────────────────────────────────────────────────────────
export default function NexusCommand() {
  const blockchainQ = useQuery({ queryKey: ["/api/blockchain/chain"], refetchInterval: 5000 });
  const busQ        = useQuery({ queryKey: ["/api/agent-bus/status"],  refetchInterval: 3000 });
  const dbQ         = useQuery({ queryKey: ["/api/spectral-db/records?limit=1"], refetchInterval: 5000 });
  const ecoQ        = useQuery({ queryKey: ["/api/ecosystem/status"], refetchInterval: 10_000 });
  const netQ        = useQuery({ queryKey: ["/api/network/nodes"], refetchInterval: 8000 });

  const chainLen    = (blockchainQ.data as any)?.blocks?.length ?? (blockchainQ.data as any)?.height ?? "—";
  const busQueued   = (busQ.data as any)?.total_sent ?? (busQ.data as any)?.queued ?? "—";
  const dbCount     = (dbQ.data as any)?.total ?? "—";
  const eco         = (ecoQ.data as any)?.summary ?? {};
  const proofPct    = eco.proofCoverage != null ? `${eco.proofCoverage}%` : "—";
  const treasuryNxt = eco.totalNxt != null ? `${Number(eco.totalNxt).toFixed(4)} NXT` : "—";
  const agentCount  = eco.activeAgents != null ? `${eco.activeAgents} / 6` : "—";
  const nodeCount   = (netQ.data as any)?.active != null ? `${(netQ.data as any).active} live` : "—";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Hero */}
      <div className="mb-8 max-w-3xl">
        <div className="relative mb-4">
          <div className="h-1.5 w-full rounded mb-2"
            style={{ background: "linear-gradient(90deg,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#8b00ff,#06b6d4)" }}>
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Nexus Command</h1>
              <p className="text-slate-400 text-sm">Civilisation-scale infrastructure · Open source · Built on physics</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 p-5 bg-slate-900/40 space-y-2">
          <p className="text-slate-200 text-base leading-relaxed">
            NexusOS is a complete communication, computation, and economic operating system for the planet.
            It replaces binary with light, IP addresses with wavelengths, corporate platforms with open spectrum,
            and arbitrary fees with physical energy costs.
          </p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Every feature on this page is running live right now, in this browser, on open infrastructure.
            No login wall beyond your NXT wallet. No algorithm. No ban button. Just physics.
          </p>
          <div className="flex items-center gap-4 pt-1 text-xs font-mono">
            <span className="text-green-400">● Live</span>
            <span className="text-slate-600">AGPL-3.0 open source</span>
            <span className="text-slate-600">Λ = hf/c² physics engine</span>
            <span className="text-slate-600">25,600 spectral channels</span>
          </div>
        </div>
      </div>

      {/* Crowdfund banner */}
      <Link href="/crowdfund">
        <div className="mb-6 rounded-xl border p-4 cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-between gap-4"
          style={{ borderColor: "#ec489960", background: "linear-gradient(135deg,#ec489912,#a855f712)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#ec489920" }}>
              <Heart className="w-5 h-5" style={{ color: "#ec4899" }} />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#ec4899" }}>Fund NexusOS Hardware Development</div>
              <div className="text-xs text-slate-400">Open source · AGPL-3.0 · Publicly traded · PHR-1 prototype · 5 tiers from 100 NXT</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0" style={{ color: "#ec4899" }}>
            Fund the mission <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </Link>

      {/* Live status row — 7 systems */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatusCard title="Blockchain height"  value={chainLen}     subtitle="photonic blocks mined"    color="#16a34a" href="/blockchain" />
        <StatusCard title="Bus messages"       value={busQueued}    subtitle="signals in flight"         color="#06b6d4" href="/agent-bus" />
        <StatusCard title="Spectral records"   value={dbCount}      subtitle="wavelength-addressed data" color="#dc2626" href="/spectral-db" />
        <StatusCard title="Proof coverage"     value={proofPct}     subtitle="blockchain-verified"       color="#22c55e" href="/spectral-audit" />
        <StatusCard title="Treasury balance"   value={treasuryNxt}  subtitle="ordinal economy funded"    color="#f43f5e" href="/orbital-treasury" />
        <StatusCard title="Active agents"      value={agentCount}   subtitle="kernel agents online"      color="#a855f7" href="/ecosystem" />
        <StatusCard title="Network nodes"      value={nodeCount}    subtitle="emitting on spectrum"      color="#4ade80" href="/network" />
      </div>

      {/* Quick compose */}
      <div className="mb-6">
        <QuickCompose />
      </div>

      {/* Live feed */}
      <div className="mb-8">
        <LiveFeed />
      </div>

      {/* All systems */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-1">All systems</h2>
        <p className="text-slate-600 text-xs mb-4 font-mono">Click any card to open that system</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYSTEMS.map((s, i) => (
            <Link key={i} href={s.href}>
              <div className="rounded-xl border p-4 cursor-pointer hover:scale-[1.02] transition-all h-full"
                style={{ borderColor: `${s.color}40`, background: `${s.color}08` }}
                data-testid={`system-card-${i}`}>
                <div className="flex items-center gap-2 mb-2">
                  <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                  <span className="text-sm font-semibold text-slate-200">{s.title}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{s.description}</p>
                <div className="flex items-center gap-1 text-xs font-mono" style={{ color: s.color }}>
                  <ArrowRight className="w-3 h-3" /> {s.action}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Civilisation pillars */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-200 mb-1">What NexusOS replaces</h2>
        <p className="text-slate-600 text-xs mb-4">Six things that binary computing got wrong — and how light fixes them</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PILLARS.map((p, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2"
              style={{ borderColor: `${p.color}40`, background: `${p.color}08` }}>
              <div className="flex items-center gap-2">
                <p.Icon className="w-4 h-4" style={{ color: p.color }} />
                <span className="text-sm font-bold" style={{ color: p.color }}>{p.label}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spectrum map */}
      <div className="mb-8 rounded-xl border border-slate-800 p-5 bg-slate-900/40">
        <h2 className="text-sm font-bold text-slate-200 mb-3">The visible spectrum as an operating system</h2>
        <div className="h-8 rounded-lg mb-2"
          style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {[
            { nm: "380–449nm", label: "System", sub: "Root authority" },
            { nm: "450–489nm", label: "Identity", sub: "Auth & trust" },
            { nm: "490–519nm", label: "Streaming", sub: "Live media" },
            { nm: "520–564nm", label: "Logic", sub: "Computation" },
            { nm: "565–589nm", label: "Interface", sub: "UI & display" },
            { nm: "590–624nm", label: "Events", sub: "Signals" },
            { nm: "625–780nm", label: "Storage", sub: "Data at rest" },
          ].map((s, i) => (
            <div key={i} className="text-xs">
              <div className="text-slate-300 font-semibold">{s.label}</div>
              <div className="text-slate-600">{s.nm}</div>
              <div className="text-slate-700">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AGPL footer */}
      <div className="rounded-xl border border-yellow-400/15 p-5 text-center space-y-2"
        style={{ background: "rgba(251,191,36,0.04)" }}>
        <div className="flex items-center justify-center gap-2">
          <Scale size={12} className="text-yellow-400/60" />
          <p className="text-xs font-mono text-yellow-400/60 font-bold">
            NexusOS · GNU Affero General Public License v3.0
          </p>
        </div>
        <p className="text-[10px] text-slate-600 max-w-xl mx-auto leading-relaxed">
          All source code is public. Any company or organization that runs a modified version
          of this stack over a network must publish their source code.
          The infrastructure of civilisation cannot be privately owned.
        </p>
        <p className="text-[9px] text-slate-700 font-mono">
          Λ = hf/c² · E = hf · f₀ = 555 THz · fᵣ = 7.83 Hz · Z₀ = 376.73 Ω
        </p>
        <div className="pt-1">
          <Link href="/open">
            <button className="inline-flex items-center gap-1.5 text-[9px] text-yellow-400/50 hover:text-yellow-400 transition-colors border border-yellow-400/20 rounded px-3 py-1 font-bold">
              <Scale size={9} /> Read the Open Infrastructure Charter →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
