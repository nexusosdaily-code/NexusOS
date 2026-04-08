import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Terminal, Shield, Cpu, Radio, Activity, Lock, ChevronRight, Zap } from "lucide-react";

const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#8b00ff",
  KERNEL: "#2563eb",
  AUTH:   "#2563eb",
  USER:   "#16a34a",
  GUEST:  "#dc2626",
};

const MODULE_ICON: Record<string, any> = {
  os_kernel:        Cpu,
  bus_router:       Radio,
  scheduler_daemon: Activity,
  watchdog_daemon:  Shield,
  auth_gateway:     Lock,
};

// ── Animated terminal line ────────────────────────────────────────
function TermLine({ text, delay, color = "#94a3b8" }: { text: string; delay: number; color?: string }) {
  const [visible, setVisible] = useState(false);
  const [typed,   setTyped]   = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      let i = 0;
      const iv = setInterval(() => {
        setTyped(text.slice(0, ++i));
        if (i >= text.length) clearInterval(iv);
      }, 14);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [text, delay]);

  if (!visible) return null;
  return (
    <div className="font-mono text-xs leading-5" style={{ color }}>
      {typed}
      {typed.length < text.length && <span className="animate-pulse">▋</span>}
    </div>
  );
}

// ── Module row ────────────────────────────────────────────────────
function ModuleRow({ mod, delay }: { mod: any; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!show) return null;

  const Icon = MODULE_ICON[mod.id] ?? Cpu;
  const color = BAND_COLOR[mod.band] ?? "#94a3b8";

  return (
    <div className="flex items-center gap-3 py-1.5 px-3 rounded-lg border animate-in fade-in"
      style={{ borderColor: `${color}30`, background: `${color}08` }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="font-mono text-xs text-slate-300 flex-1">{mod.id}</span>
      <span className="font-mono text-xs px-1.5 py-0.5 rounded"
        style={{ background: `${color}20`, color }}>{mod.band}</span>
      <span className="font-mono text-xs text-slate-600">{mod.psi}</span>
      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#16a34a" }} />
    </div>
  );
}

// ── Root hash display ─────────────────────────────────────────────
function RootHashDisplay({ psi, wl, energy, band }: { psi: string; wl: number; energy: number; band: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 2800); return () => clearTimeout(t); }, []);
  const color = BAND_COLOR[band] ?? "#2563eb";

  if (!show) return (
    <div className="font-mono text-xs text-slate-700 animate-pulse">Computing root hash…</div>
  );

  return (
    <div className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: `${color}50`, background: `${color}0a`,
               boxShadow: `0 0 30px ${color}20` }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
          Root Hash Resolved
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold font-mono" style={{ color,
          textShadow: `0 0 20px ${color}80` }}>
          {psi}
        </div>
        <div className="text-xs font-mono text-slate-500">
          <div>λ = {wl.toFixed(2)} nm</div>
          <div>E = {energy.toExponential(3)} J</div>
        </div>
      </div>

      {/* Spectrum bar */}
      <div className="relative h-2 rounded overflow-hidden"
        style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }}>
        <div className="absolute top-0 bottom-0 w-0.5 bg-white rounded"
          style={{ left: `${Math.min(98, Math.max(1, ((wl - 380) / 400) * 100))}%`,
                   boxShadow: "0 0 6px white" }} />
      </div>

      <p className="text-xs font-mono text-slate-600 leading-relaxed">
        This is not a SHA-256 hash. It is a physical address in the electromagnetic spectrum.
        The kernel's identity is derived from Λ = hf/c² — a wavelength of light, not an algorithm.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function KernelGenesisPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/kernel/genesis"],
    staleTime: Infinity,
  });

  const block = data?.block;
  const modules: any[] = block?.ai_modules ?? [];
  const wl     = parseFloat(block?.wavelength_nm ?? "466.27");
  const energy = parseFloat(block?.energy_joules ?? "2.84e-17");

  const BOOT_LINES = [
    { text: "[NEXUSOS KERNEL v1.0.0] Initialising boot sequence…",         color: "#94a3b8",  delay: 200  },
    { text: "[PHASE 1] Loading schema — physics layer OK",                  color: "#16a34a",  delay: 600  },
    { text: "[PHASE 2] Restoring persistent state — boot_time: 2026-01-08", color: "#16a34a",  delay: 900  },
    { text: "[PHASE 3] Registering core agents…",                           color: "#94a3b8",  delay: 1200 },
    { text: "  → os_kernel        Ψ(20, 39, H)   [SYSTEM]  ✓",            color: "#8b00ff",  delay: 1400 },
    { text: "  → bus_router       Ψ(19, 39, V)   [SYSTEM]  ✓",            color: "#8b00ff",  delay: 1600 },
    { text: "  → scheduler_daemon Ψ(161, 30, V)  [KERNEL]  ✓",            color: "#2563eb",  delay: 1800 },
    { text: "  → watchdog_daemon  Ψ(198, 31, H)  [KERNEL]  ✓",            color: "#2563eb",  delay: 2000 },
    { text: "  → auth_gateway     Ψ(135, 1, H)   [KERNEL]  ✓",            color: "#2563eb",  delay: 2200 },
    { text: "[PHASE 4] Watchdog daemon registered in coordinator",          color: "#16a34a",  delay: 2400 },
    { text: "[PHASE 5] Computing root_hash from Λ = hf/c²…",               color: "#94a3b8",  delay: 2600 },
    { text: "[PHASE 5] root_hash = Ψ(100, 3, V) · 466.27 nm · AUTH band", color: "#2563eb",  delay: 3000 },
    { text: "[KERNEL BOOT COMPLETE] state: BOOT_COMPLETE · system_id: NexusOS", color: "#16a34a", delay: 3300 },
    { text: "AGPL-3.0 · All source code public · Λ = hf/c²",              color: "#475569",  delay: 3600 },
  ];

  return (
    <div className="min-h-screen bg-[#080d14] text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#8b00ff,#2563eb)" }}>
          <Terminal className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Genesis Kernel Block</h1>
          <p className="text-slate-500 text-xs font-mono">
            NexusOS boot record · system_id: NexusOS · root_hash: Ψ channel, not SHA-256
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/blockchain" className="text-xs font-mono text-slate-600 hover:text-slate-400 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" /> blockchain
          </Link>
          <Link href="/nexus-command" className="text-xs font-mono text-slate-600 hover:text-slate-400 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" /> command
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: terminal boot log */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/60">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              <span className="text-xs font-mono text-slate-600 ml-2">nexusos — kernel boot</span>
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <div className="p-4 space-y-0.5 min-h-64">
              {BOOT_LINES.map((l, i) => (
                <TermLine key={i} text={l.text} delay={l.delay} color={l.color} />
              ))}
            </div>
          </div>

          {/* Kernel state card */}
          {block && (
            <div className="rounded-xl border border-slate-800 p-4 space-y-3 bg-slate-950/60">
              <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                Kernel State Record
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { k: "system_id",   v: block.system_id ?? "NexusOS",       c: "#8b00ff" },
                  { k: "version",     v: block.version ?? "v1.0.0",           c: "#94a3b8" },
                  { k: "state",       v: block.state ?? "BOOT_COMPLETE",      c: "#16a34a" },
                  { k: "ai_modules",  v: `${modules.length} registered`,      c: "#2563eb" },
                  { k: "band",        v: block.band ?? "AUTH",                c: BAND_COLOR[block.band ?? "AUTH"] ?? "#2563eb" },
                  { k: "license",     v: block.agpl_license ?? "AGPL-3.0",   c: "#16a34a" },
                  { k: "equation",    v: "Λ = hf/c²",                         c: "#ca8a04" },
                  { k: "boot_time",   v: block.boot_time ? new Date(block.boot_time).toLocaleDateString() : "2026-01-08", c: "#475569" },
                ].map((m, i) => (
                  <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-slate-700 mb-0.5">{m.k}:</div>
                    <div style={{ color: m.c }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: root hash + modules */}
        <div className="space-y-4">
          {/* Root hash */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">root_hash</div>
            {isLoading ? (
              <div className="font-mono text-xs text-slate-700 animate-pulse">Loading…</div>
            ) : (
              <RootHashDisplay
                psi={block?.root_psi ?? "Ψ(100, 3, V)"}
                wl={wl}
                energy={energy}
                band={block?.band ?? "AUTH"}
              />
            )}
          </div>

          {/* AI Modules */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">ai_modules: registered</div>
            {modules.length > 0 ? (
              <div className="space-y-1.5">
                {modules.map((mod: any, i: number) => (
                  <ModuleRow key={mod.id} mod={mod} delay={1400 + i * 200} />
                ))}
              </div>
            ) : (
              /* Fallback static list if DB not loaded yet */
              <div className="space-y-1.5">
                {[
                  { id: "os_kernel",        psi: "Ψ(20, 39, H)",  band: "SYSTEM" },
                  { id: "bus_router",       psi: "Ψ(19, 39, V)",  band: "SYSTEM" },
                  { id: "scheduler_daemon", psi: "Ψ(161, 30, V)", band: "KERNEL" },
                  { id: "watchdog_daemon",  psi: "Ψ(198, 31, H)", band: "KERNEL" },
                  { id: "auth_gateway",     psi: "Ψ(135, 1, H)",  band: "KERNEL" },
                ].map((mod, i) => (
                  <ModuleRow key={mod.id} mod={mod} delay={1400 + i * 200} />
                ))}
              </div>
            )}
          </div>

          {/* Links to related systems */}
          <div className="rounded-xl border border-slate-800 p-4 space-y-2 bg-slate-950/60">
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Linked systems</div>
            {[
              { label: "Wavelength Blockchain → Block #0",  href: "/blockchain",    color: "#16a34a", Icon: Zap },
              { label: "Agent Bus → 5 active agents",        href: "/agent-bus",     color: "#06b6d4", Icon: Radio },
              { label: "Nexus Command → Mission control",    href: "/nexus-command", color: "#8b00ff", Icon: Activity },
            ].map((s, i) => (
              <Link key={i} href={s.href}>
                <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-900 transition-colors cursor-pointer">
                  <s.Icon className="w-3 h-3" style={{ color: s.color }} />
                  <span className="text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors">{s.label}</span>
                  <ChevronRight className="w-3 h-3 text-slate-700 ml-auto" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs font-mono text-slate-700">
          NexusOS Genesis Kernel Block · AGPL-3.0 · root_hash is a physical wavelength address, not a cryptographic hash
        </p>
      </div>
    </div>
  );
}
