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
  Code2, Cpu, Signal, FileText, BookOpen
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

  useEffect(() => {
    if (busQ.data?.queued) {
      addEvent(`Agent bus: ${busQ.data.queued} message${busQ.data.queued !== 1 ? "s" : ""} queued`, "#06b6d4");
    }
  }, [busQ.data?.queued]);

  useEffect(() => {
    if (chainQ.data?.chain?.length) {
      const latest = chainQ.data.chain[chainQ.data.chain.length - 1];
      addEvent(`Block #${latest.blockNumber} — ${latest.psiChannel ?? ""}`, "#8b00ff");
    }
  }, [chainQ.data?.chain?.length]);

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
    title: "NexusOS Chronicle",
    description: "The permanent historical ledger. Every founding event, discovery, and proof encoded into its wavelength address. The record that cannot be censored.",
    href: "/chronicle",
    color: "#eab308",
    Icon: BookOpen,
    action: "View history",
  },
  {
    title: "Spectral Workspace",
    description: "Write documents that live at a wavelength — not a URL. Share a frequency instead of a link. The first application layer of the wavelength internet.",
    href: "/spectral-workspace",
    color: "#22c55e",
    Icon: FileText,
    action: "Open workspace",
  },
  {
    title: "Spectral Library",
    description: "Search and browse 620+ spectral records — every source file, wiki page, and document encoded into the electromagnetic spectrum. Find anything by tuning to its wavelength.",
    href: "/spectral-library",
    color: "#06b6d4",
    Icon: FileText,
    action: "Browse corpus",
  },
  {
    title: "Spectral Audit Ledger",
    description: "Blockchain-verified proof of work. Every spectral record is SHA-256 hashed and submitted to the mempool on write. Mine a proof block to confirm records on-chain — the physics is the proof.",
    href: "/spectral-audit",
    color: "#22c55e",
    Icon: FileText,
    action: "View audit chain",
  },
  {
    title: "Spectral Database",
    description: "Store any data at its natural wavelength address. Retrieve by physics. No SQL injection, no admin console.",
    href: "/spectral-db",
    color: "#dc2626",
    Icon: Database,
    action: "Store a record",
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

  const chainLen    = (blockchainQ.data as any)?.chain?.length ?? "—";
  const busQueued   = (busQ.data as any)?.queued ?? "—";
  const dbCount     = (dbQ.data as any)?.total ?? "—";

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

      {/* Live status row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatusCard title="Blockchain height"  value={chainLen}   subtitle="photonic blocks mined"   color="#16a34a" href="/blockchain" />
        <StatusCard title="Bus messages"       value={busQueued}  subtitle="signals in flight"        color="#06b6d4" href="/agent-bus" />
        <StatusCard title="Spectral records"   value={dbCount}    subtitle="wavelength-addressed data" color="#dc2626" href="/spectral-db" />
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
      <div className="rounded-xl border border-slate-800 p-4 text-center space-y-1">
        <p className="text-xs font-mono text-slate-600">
          NexusOS · AGPL-3.0 · All source code public · Any company that uses this must contribute back
        </p>
        <p className="text-xs text-slate-700">
          Built for a Kardashev Type I civilisation · Λ = hf/c² · E = hf · f₀ = 555 THz · fᵣ = 7.83 Hz
        </p>
      </div>
    </div>
  );
}
