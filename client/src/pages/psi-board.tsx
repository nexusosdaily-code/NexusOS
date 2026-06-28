import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Radio, ChevronRight } from "lucide-react";
import { Link } from "wouter";

interface PsiBoardEvent {
  type: string;
  nm: number;
  psi: string;
  label: string;
  ts: number;
  band: "SYSTEM" | "KERNEL" | "USER" | "GUEST";
}

interface PsiBoardStats {
  bands: { SYSTEM: number; KERNEL: number; USER: number; GUEST: number };
  totalSignals: number;
  totalRecords: number;
  activeChannels: number;
  totalPoolEntries: number;
}

interface Pulse {
  nm: number;
  color: string;
  birth: number;
  duration: number;
}

const NM_MIN = 380;
const NM_MAX = 780;

const BAND_COLORS: Record<string, string> = {
  SYSTEM: "#a78bfa",
  KERNEL: "#38bdf8",
  USER:   "#4ade80",
  GUEST:  "#fb923c",
};

const BAND_NM: Record<string, string> = {
  SYSTEM: "380–480 nm",
  KERNEL: "480–580 nm",
  USER:   "580–680 nm",
  GUEST:  "680–780 nm",
};

const EVENT_ICONS: Record<string, string> = {
  signal: "⚡",
  record: "◎",
  block:  "■",
  pool:   "◈",
  frame:  "▦",
};

function nmToX(nm: number, width: number): number {
  return ((nm - NM_MIN) / (NM_MAX - NM_MIN)) * width;
}

function fmtAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function PsiBoard() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const pulsesRef  = useRef<Pulse[]>([]);
  const rafRef     = useRef<number>(0);
  const seededRef  = useRef(false);
  const prevLenRef = useRef(0);

  const { data: events = [] } = useQuery<PsiBoardEvent[]>({
    queryKey: ["/api/psi-board/activity"],
    refetchInterval: 3000,
  });

  const { data: stats } = useQuery<PsiBoardStats>({
    queryKey: ["/api/psi-board/stats"],
    refetchInterval: 15000,
  });

  const addPulse = useCallback((e: PsiBoardEvent) => {
    pulsesRef.current.push({
      nm:       e.nm,
      color:    BAND_COLORS[e.band] ?? "#22d3ee",
      birth:    performance.now(),
      duration: 2200,
    });
    if (pulsesRef.current.length > 100) {
      pulsesRef.current = pulsesRef.current.slice(-100);
    }
  }, []);

  useEffect(() => {
    if (events.length > 0 && !seededRef.current) {
      seededRef.current = true;
      const now = performance.now();
      events.slice(0, 40).forEach((e, i) => {
        pulsesRef.current.push({
          nm:       e.nm,
          color:    BAND_COLORS[e.band] ?? "#22d3ee",
          birth:    now - i * 80,
          duration: 3000,
        });
      });
    }
  }, [events]);

  useEffect(() => {
    if (events.length > prevLenRef.current) {
      events.slice(0, events.length - prevLenRef.current).forEach(addPulse);
    }
    prevLenRef.current = events.length;
  }, [events, addPulse]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(draw); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx)  { rafRef.current = requestAnimationFrame(draw); return; }

    const W = canvas.width;
    const H = canvas.height;
    const now = performance.now();

    ctx.clearRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0,    "#5000c8");
    grad.addColorStop(0.12, "#0040ff");
    grad.addColorStop(0.28, "#0088ff");
    grad.addColorStop(0.42, "#00cccc");
    grad.addColorStop(0.52, "#00dd44");
    grad.addColorStop(0.62, "#dddd00");
    grad.addColorStop(0.74, "#ff7700");
    grad.addColorStop(1,    "#880000");
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    const bands = [
      { label: "SYSTEM", start: NM_MIN, end: 480, color: "#a78bfa" },
      { label: "KERNEL", start: 480,    end: 580, color: "#38bdf8" },
      { label: "USER",   start: 580,    end: 680, color: "#4ade80" },
      { label: "GUEST",  start: 680,    end: NM_MAX, color: "#fb923c" },
    ];

    for (const b of bands) {
      const x1 = nmToX(b.start, W);
      const x2 = nmToX(b.end, W);
      ctx.strokeStyle = b.color + "50";
      ctx.lineWidth = 1;
      ctx.strokeRect(x1 + 0.5, 0.5, x2 - x1 - 1, H - 1);
      ctx.fillStyle = b.color + "bb";
      ctx.font = `bold 10px 'Courier New', monospace`;
      ctx.textAlign = "left";
      ctx.fillText(b.label, x1 + 7, 15);
    }

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    for (const nm of [400, 450, 480, 530, 580, 630, 680, 730, 760]) {
      const x = nmToX(nm, W);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x, H - 20, 1, 12);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillText(`${nm}`, x, H - 3);
    }

    const alive: Pulse[] = [];
    for (const p of pulsesRef.current) {
      const age = now - p.birth;
      if (age >= p.duration) continue;
      alive.push(p);

      const t      = age / p.duration;
      const alpha  = Math.pow(1 - t, 1.4);
      const radius = 3 + t * 22;
      const x      = nmToX(p.nm, W);
      const y      = H / 2;

      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
      glow.addColorStop(0,   p.color + "ff");
      glow.addColorStop(0.3, p.color + "99");
      glow.addColorStop(1,   p.color + "00");
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, radius * 0.35), 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    pulsesRef.current = alive;

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  const totalEvents = Object.values(stats?.bands ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen" style={{ background: "hsl(222 47% 4%)", color: "white" }}>
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-16">

        <div className="flex items-center gap-3 mb-1">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h1 className="text-xl font-bold tracking-tight">Ψ Channel Activity Board</h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full animate-pulse"
                style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.25)" }}>
            ● LIVE
          </span>
        </div>
        <p className="text-sm text-white/35 font-mono mb-6">
          25,600 orthogonal Ψ channels · 256 WDM × 50 OAM × 2 polarisations · 380–780 nm
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {(["SYSTEM", "KERNEL", "USER", "GUEST"] as const).map(band => {
            const count = stats?.bands[band] ?? 0;
            const c     = BAND_COLORS[band];
            const pct   = totalEvents > 0 ? (count / totalEvents) * 100 : 0;
            return (
              <div key={band} className="rounded-xl p-4"
                   style={{ background: c + "0a", border: `1px solid ${c}28` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold" style={{ color: c }}>{band}</span>
                  <span className="text-[9px] text-white/25 font-mono">{BAND_NM[band]}</span>
                </div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: c }}>
                  {count.toLocaleString()}
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                       style={{ width: `${pct.toFixed(1)}%`, background: c + "cc" }} />
                </div>
                <div className="text-[9px] text-white/25 mt-1">{pct.toFixed(1)}% of signals</div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl overflow-hidden mb-2"
             style={{ height: "130px", background: "hsl(222 47% 6%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
        </div>
        <div className="flex justify-between px-1 mb-5">
          <span className="text-[9px] text-white/20 font-mono">380 nm · SYSTEM</span>
          <span className="text-[9px] text-white/20 font-mono">580 nm</span>
          <span className="text-[9px] text-white/20 font-mono">780 nm · GUEST</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { value: stats?.totalSignals,      icon: "⚡", label: "bus signals"   },
            { value: stats?.totalRecords,      icon: "◎", label: "spectral records" },
            { value: stats?.totalPoolEntries,  icon: "◈", label: "tx pool entries"  },
          ].map(({ value, icon, label }) => (
            <div key={label} className="rounded-lg px-4 py-3 text-center"
                 style={{ background: "hsl(222 47% 7%)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-lg font-bold tabular-nums">{(value ?? 0).toLocaleString()}</div>
              <div className="text-[10px] text-white/30 font-mono mt-0.5">{icon} {label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl overflow-hidden"
             style={{ background: "hsl(222 47% 6%)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="px-4 py-3 border-b flex items-center gap-2"
               style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-white/55 uppercase tracking-wider">
              Live Channel Feed
            </span>
            <span className="ml-auto text-[9px] font-mono text-white/20">↻ 3s</span>
          </div>

          {events.length === 0 ? (
            <div className="px-4 py-10 text-center text-white/20 text-sm font-mono">
              Listening for channel activity…
            </div>
          ) : (
            <div>
              {events.slice(0, 30).map((e, i) => {
                const c = BAND_COLORS[e.band] ?? "#22d3ee";
                return (
                  <div key={i}
                       className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.015] transition-colors border-b"
                       style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <span className="text-sm w-5 text-center shrink-0 opacity-70">
                      {EVENT_ICONS[e.type] ?? "·"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] font-mono text-white/65">{e.psi}</code>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: c + "18", color: c }}>
                          {e.band}
                        </span>
                        <span className="text-[10px] font-mono text-white/22">
                          {e.nm.toFixed(1)} nm
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-0.5 truncate">{e.label}</p>
                    </div>
                    <span className="text-[9px] text-white/18 font-mono shrink-0">
                      {fmtAge(Date.now() - e.ts)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-4 text-[11px] text-white/25 font-mono">
          <Link href="/">
            <span className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1">
              ← Hub
            </span>
          </Link>
          <Link href="/compression-explorer">
            <span className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1">
              Compression Explorer <ChevronRight className="w-3 h-3 inline" />
            </span>
          </Link>
          <Link href="/wavelength-lang">
            <span className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1">
              WavelengthScript <ChevronRight className="w-3 h-3 inline" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
