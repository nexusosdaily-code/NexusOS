import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Radio, Activity, Tv2, Eye, EyeOff, Zap } from "lucide-react";

interface MirrorStats {
  total: number;
  bands: Record<string, { count: number; pct: number }>;
  avgNm: number | null;
  dominantBand: string | null;
  dominantNm: number | null;
  uniqueChannels: number;
  recordingSince: string;
}

interface TransmissionRecord {
  id: number;
  messageText: string;
  senderHandle: string | null;
  chatId: string | null;
  nm: number;
  band: string;
  psiChannel: string;
  energy: number;
  createdAt: string;
}

const BAND_META: Record<string, { color: string; glow: string; range: string; desc: string }> = {
  SYSTEM: { color: "#7c3aed", glow: "shadow-[0_0_12px_#7c3aed66]", range: "380–480 nm", desc: "Highest authority · shortest wavelength · most energy" },
  KERNEL: { color: "#0ea5e9", glow: "shadow-[0_0_12px_#0ea5e966]", range: "480–495 nm", desc: "Kernel band · protocol-level operations" },
  USER:   { color: "#10b981", glow: "shadow-[0_0_12px_#10b98166]", range: "495–620 nm", desc: "User band · standard communications" },
  GUEST:  { color: "#f59e0b", glow: "shadow-[0_0_12px_#f59e0b66]", range: "620–780 nm", desc: "Guest band · lowest energy · longest wavelength" },
};

const EVENT_META: Record<string, { icon: typeof Tv2; color: string; label: string }> = {
  CAST_REGISTERED: { icon: Tv2,    color: "#8b5cf6", label: "Cast registered" },
  CAST_LIVE:       { icon: Radio,  color: "#ef4444", label: "Went live" },
  CAST_ENDED:      { icon: Zap,    color: "#6b7280", label: "Cast ended" },
  CAST_DROPPED:    { icon: Zap,    color: "#f59e0b", label: "Connection dropped" },
  VIEWER_JOIN:     { icon: Eye,    color: "#10b981", label: "Viewer joined" },
  VIEWER_LEFT:     { icon: EyeOff, color: "#6b7280", label: "Viewer left" },
  VIEWER_DROPPED:  { icon: EyeOff, color: "#f59e0b", label: "Viewer dropped" },
};

function nmToColor(nm: number): string {
  if (nm < 480) return "#7c3aed";
  if (nm < 495) return "#0ea5e9";
  if (nm < 620) return "#10b981";
  return "#f59e0b";
}

function nmToEmoji(nm: number): string {
  if (nm < 450) return "🟣";
  if (nm < 495) return "🔵";
  if (nm < 570) return "🟢";
  if (nm < 620) return "🟡";
  return "🟠";
}

function parseEvent(messageText: string): { eventKey: string; title: string; psi: string } {
  const parts = messageText.split(" · ");
  return {
    eventKey: parts[0] ?? "",
    title: parts[1] ?? "",
    psi: parts[2] ?? "",
  };
}

function SpectrumBar({ nm, pct }: { nm: number; pct: number }) {
  const col = nmToColor(nm);
  return (
    <div className="relative h-2 bg-white/5 rounded-full overflow-hidden w-full">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: col, boxShadow: `0 0 8px ${col}66` }}
      />
    </div>
  );
}

function Pulse() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
    </span>
  );
}

function RedPulse() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]" />
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SpectralMirrorPage() {
  const [stats, setStats]       = useState<MirrorStats | null>(null);
  const [txFeed, setTxFeed]     = useState<TransmissionRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = async () => {
    try {
      const [sr, tr] = await Promise.all([
        fetch("/api/mirror/public-stats"),
        fetch("/api/mirror/transmissions?n=30"),
      ]);
      if (sr.ok) setStats(await sr.json());
      if (tr.ok) {
        const { records } = await tr.json();
        setTxFeed(records ?? []);
      }
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 15_000);
    return () => clearInterval(iv);
  }, []);

  const dominantColor = stats?.dominantBand ? BAND_META[stats.dominantBand]?.color ?? "#10b981" : "#10b981";

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans">
      <header className="sticky top-0 z-10 bg-[#0a0a0f]/90 backdrop-blur border-b border-white/[0.06] px-6 py-3 flex items-center justify-between">
        <Link href="/auth">
          <span className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm cursor-pointer">
            <ArrowLeft size={14} /> NexusOS
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm text-white/40 font-mono">
          <Radio size={12} className="text-[#10b981]" />
          Spectral Mirror · Live Archive
        </div>
        <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
          <Pulse />
          <span>Updated {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Title */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-white/30 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <Pulse />
            Live · Recording since 2 May 2026
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Spectral Mirror</h1>
          <p className="text-white/50 text-base max-w-lg mx-auto leading-7">
            Every message and every P2P transmission that passes through the WNSP
            layer is CE-encoded and archived permanently by its electromagnetic
            signature. The mirror sees everything.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-white/30 font-mono text-sm animate-pulse">
            Querying the archive…
          </div>
        ) : (
          <>
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: "Records archived", value: stats?.total.toLocaleString() ?? "0", sub: "all time", color: "#10b981" },
                { label: "Transmissions logged", value: txFeed.length > 0 ? txFeed.filter(r => r.messageText.startsWith("CAST_LIVE")).length.toString() : "0", sub: "sessions mirrored", color: "#ef4444" },
                { label: "Average wavelength", value: stats?.avgNm ? `${stats.avgNm.toFixed(1)} nm` : "—", sub: "across all records", color: "#8b5cf6" },
                { label: "Unique Ψ channels", value: stats?.uniqueChannels.toLocaleString() ?? "0", sub: "of 51,200 possible", color: "#0ea5e9" },
              ].map((s, i) => (
                <div key={i} data-testid={`stat-card-${i}`} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                  <div className="text-2xl font-bold font-mono mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-white/60 font-semibold mb-0.5">{s.label}</div>
                  <div className="text-xs text-white/30 font-mono">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Live transmission feed */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 font-mono">
                  Transmission Feed
                </h2>
                <div className="flex items-center gap-2 text-xs text-white/30 font-mono">
                  <RedPulse />
                  <span>auto-refresh 15s</span>
                </div>
              </div>

              {txFeed.length === 0 ? (
                <div className="text-center py-8">
                  <Tv2 size={28} className="mx-auto mb-3 text-white/10" />
                  <p className="text-sm text-white/30 font-mono">No transmissions mirrored yet.</p>
                  <p className="text-xs text-white/20 mt-1">Go live from the Media Library to populate this feed.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {txFeed.map((rec) => {
                    const { eventKey, title, psi } = parseEvent(rec.messageText);
                    const meta = EVENT_META[eventKey];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const col  = nmToColor(rec.nm);
                    return (
                      <div
                        key={rec.id}
                        data-testid={`tx-event-${rec.id}`}
                        className="flex items-start gap-3 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors"
                      >
                        <Icon size={13} style={{ color: meta.color, marginTop: 2, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold" style={{ color: meta.color }}>
                              {meta.label}
                            </span>
                            <span className="text-xs text-white/50 truncate">{title}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <span className="text-xs font-mono" style={{ color: col }}>
                              {psi}
                            </span>
                            <span className="text-xs text-white/25 font-mono">{rec.nm.toFixed(1)} nm</span>
                            {rec.senderHandle && (
                              <span className="text-xs text-white/25">@{rec.senderHandle}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-white/20 font-mono whitespace-nowrap flex-shrink-0">
                          {timeAgo(rec.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Band distribution */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 font-mono mb-5">
                Authority Band Distribution
              </h2>
              {stats?.total === 0 ? (
                <p className="text-sm text-white/30 text-center py-4">
                  No messages archived yet. Use <code className="text-[#8b5cf6]">/mirror store</code> on the bot to add the first record.
                </p>
              ) : (
                <div className="space-y-5">
                  {(["SYSTEM", "KERNEL", "USER", "GUEST"] as const).map(band => {
                    const meta  = BAND_META[band];
                    const entry = stats?.bands[band];
                    const count = entry?.count ?? 0;
                    const pct   = entry?.pct ?? 0;
                    return (
                      <div key={band} data-testid={`band-row-${band}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}88` }} />
                            <span className="text-sm font-mono text-white/80">{band}</span>
                            <span className="text-xs text-white/30">{meta.range}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-mono" style={{ color: meta.color }}>{pct.toFixed(1)}%</span>
                            <span className="text-xs text-white/30 ml-2">{count} record{count !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <SpectrumBar nm={parseFloat(meta.range.split("–")[0])} pct={pct} />
                        <p className="text-xs text-white/25 mt-1 font-mono">{meta.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Spectrum bar */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 font-mono mb-4">
                Visible Spectrum · 380–780 nm
              </h2>
              <div className="flex h-8 rounded-lg overflow-hidden w-full mb-3">
                {Array.from({ length: 128 }, (_, i) => {
                  const nm = 380 + i * 3.125;
                  return (
                    <div key={i} className="flex-1" style={{ backgroundColor: `hsl(${270 - (nm - 380) / 400 * 270}, 80%, 50%)`, opacity: 0.7 }} />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs font-mono text-white/30">
                <span>380 nm · SYSTEM</span>
                <span>480 nm · KERNEL</span>
                <span>495 nm · USER</span>
                <span>620 nm · GUEST</span>
                <span>780 nm</span>
              </div>
              {stats?.dominantNm && (
                <div className="mt-3 flex items-center gap-2 text-xs font-mono text-white/50">
                  <span>{nmToEmoji(stats.dominantNm)}</span>
                  <span>
                    Current dominant: <span style={{ color: dominantColor }}>{stats.dominantNm.toFixed(1)} nm</span>
                    {" "}· {stats.dominantBand} band
                  </span>
                </div>
              )}
            </div>

            {/* What this is */}
            <div className="border border-white/[0.06] rounded-xl p-6 mb-8 bg-white/[0.015]">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/40 font-mono mb-4">
                What the Mirror Is
              </h2>
              <div className="space-y-3 text-sm text-white/60 leading-7">
                <p>
                  Every message and P2P transmission archived here was CE-encoded: its dominant
                  character's wavelength was derived from{" "}
                  <code className="text-[#10b981]">λ = 380 + (charCode % 128) × 3.125 nm</code>,
                  giving it a permanent address in the electromagnetic spectrum.
                </p>
                <p>
                  Transmission events — cast start, viewer join, viewer leave, cast end — are
                  logged at the Ψ channel address of the broadcast itself. The mirror knows when
                  every signal went live, who tuned in, and when the transmission ended.
                </p>
                <p>
                  The Ψ channel address <code className="text-[#8b5cf6]">Ψ(wdm, oam, pol)</code> is
                  computed from the content. Changing the signal changes the address.
                  No certificate authority required — the physics derivation is the proof.
                </p>
              </div>
            </div>

            {/* Footer links */}
            <div className="flex flex-wrap gap-4 justify-center text-xs font-mono">
              <Link href="/videos">
                <span className="text-[#ef4444] hover:underline cursor-pointer">Video Archive</span>
              </Link>
              <span className="text-white/20">·</span>
              <Link href="/hardware-spec">
                <span className="text-[#8b5cf6] hover:underline cursor-pointer">Research Paper §11</span>
              </Link>
              <span className="text-white/20">·</span>
              <Link href="/ce-code-writer">
                <span className="text-[#0ea5e9] hover:underline cursor-pointer">CE Encoder</span>
              </Link>
              <span className="text-white/20">·</span>
              <Link href="/compression-explorer">
                <span className="text-[#10b981] hover:underline cursor-pointer">Compression Explorer</span>
              </Link>
              <span className="text-white/20">·</span>
              <a href="https://t.me/nexuswnspbot" target="_blank" rel="noopener noreferrer" className="text-[#f59e0b] hover:underline">
                @nexuswnspbot
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
