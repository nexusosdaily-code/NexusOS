import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Radio, Zap, Activity, Send, Copy, Check, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function nmToColor(nm: number | null) {
  if (!nm) return { hue: 270, glow: "hsl(270,100%,60%)", bg: "hsl(270,80%,5%)", mid: "hsl(270,70%,18%)", dim: "hsl(270,60%,8%)" };
  const hue = Math.round(270 * (780 - nm) / 400);
  return {
    hue,
    glow: `hsl(${hue},100%,60%)`,
    bg:   `hsl(${hue},80%,5%)`,
    mid:  `hsl(${hue},70%,18%)`,
    dim:  `hsl(${hue},60%,8%)`,
  };
}

function physics(nm: number) {
  const C = 299792458, H = 6.62607015e-34;
  const freq = C / (nm * 1e-9);
  return {
    freqTHz:    (freq / 1e12).toFixed(2),
    energyEv:   (1239.8 / nm).toFixed(3),
    lambdaMass: (H * freq / (C * C)).toExponential(2),
  };
}

function cePreview(text: string) {
  return text.split("").slice(0, 24).map(c => {
    const nm  = 380 + (c.charCodeAt(0) % 128) * (400 / 128) + (400 / 256);
    const hue = Math.round(270 * (780 - nm) / 400);
    return { char: c, nm: Math.round(nm * 10) / 10, hue };
  });
}

const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#a855f7", KERNEL: "#22d3ee", USER: "#4ade80", GUEST: "#f97316",
};

function ago(ts: string | Date) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function PassportPage() {
  const { toast } = useToast();
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/passport"],
    queryFn: () => fetch("/api/passport", { credentials: "include" }).then(r => {
      if (!r.ok) throw new Error("Unauthorized");
      return r.json();
    }),
    refetchInterval: 20000,
    retry: false,
  });

  const broadcast = useMutation({
    mutationFn: async (message: string) => {
      const r = await fetch("/api/passport/broadcast", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Signal transmitted", description: "Your broadcast is live on the channel." });
      setMsg("");
      refetch();
    },
    onError: (e: any) => toast({ title: "Transmission failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-[#040810] flex items-center justify-center">
      <div className="text-slate-600 font-mono text-sm animate-pulse">Resolving spectral address…</div>
    </div>
  );

  const nm          = data?.spectralNm ? parseFloat(String(data.spectralNm)) : null;
  const color       = nmToColor(nm);
  const phy         = nm ? physics(nm) : null;
  const bandColor   = BAND_COLOR[data?.spectralBand ?? "GUEST"] ?? "#94a3b8";
  const ce          = msg ? cePreview(msg) : [];
  const nxtFmt      = parseFloat(data?.nxtBalance ?? "0").toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const satsFmt     = parseInt(data?.satsBalance ?? "0").toLocaleString();
  const stakedFmt   = parseInt(data?.satsStaked ?? "0").toLocaleString();
  const spectrumPct = nm ? ((nm - 380) / 400) * 100 : 50;

  const copyAddr = () => {
    navigator.clipboard.writeText(data?.psiChannel ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#040810] text-slate-200">
      <div className="sticky top-0 z-20 bg-[#040810]/95 backdrop-blur border-b border-slate-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/hub">
            <ArrowLeft className="w-4 h-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer" />
          </Link>
          <Radio className="w-4 h-4" style={{ color: bandColor }} />
          <span className="text-sm font-medium text-white">Spectral Passport</span>
          <div className="ml-auto">
            <button onClick={() => refetch()} className="text-slate-600 hover:text-slate-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">

        {/* ── Identity card ─────────────────────────────── */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${bandColor}35`, background: color.bg }}>

          {/* Spectrum ruler */}
          <div className="relative h-2 w-full overflow-hidden" style={{ background: "linear-gradient(to right,#6b21a8,#1d4ed8,#0891b2,#15803d,#ca8a04,#dc2626)" }}>
            <div
              className="absolute top-0 h-full w-0.5 transition-all duration-700"
              style={{ left: `${spectrumPct}%`, background: "rgba(255,255,255,0.9)", boxShadow: "0 0 8px 3px rgba(255,255,255,0.7)" }}
            />
          </div>

          <div className="px-6 pt-6 pb-5 flex items-start gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest"
                  style={{ color: bandColor, borderColor: `${bandColor}45`, background: `${bandColor}12` }}
                >
                  {data?.spectralBand ?? "—"}
                </span>
                <span className="text-[10px] text-slate-600 font-mono">authority band · 51,200-channel Hilbert space</span>
              </div>

              <div className="font-mono text-4xl font-bold tracking-tight" style={{ color: color.glow, textShadow: `0 0 30px ${color.glow}60` }}>
                {data?.psiChannel ?? "—"}
              </div>

              <div className="mt-3 flex flex-wrap gap-4">
                {phy && [
                  { label: "λ", value: `${nm?.toFixed(1)} nm` },
                  { label: "f", value: `${phy.freqTHz} THz` },
                  { label: "E", value: `${phy.energyEv} eV` },
                  { label: "Λ", value: `${phy.lambdaMass} kg` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-600 font-mono italic">{label} =</span>
                    <span className="text-xs font-mono text-slate-300">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {nm && (
              <div
                className="shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center font-mono text-white font-bold"
                style={{
                  background: color.mid,
                  border: `1px solid ${color.glow}50`,
                  boxShadow: `0 0 40px 10px ${color.glow}30`,
                }}
              >
                <span className="text-lg leading-none">{Math.round(nm)}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">nm</span>
              </div>
            )}
          </div>

          {/* WDM / OAM / POL strip */}
          <div className="border-t px-6 py-3 flex items-center gap-6" style={{ borderColor: `${bandColor}20`, background: color.dim }}>
            {[
              { label: "WDM channel", value: data?.spectralWdm },
              { label: "OAM mode", value: data?.spectralOam },
              { label: "polarisation", value: data?.spectralPol },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-[9px] text-slate-700 uppercase tracking-widest font-mono">{label}</div>
                <div className="text-sm text-slate-300 font-mono font-bold">{value ?? "—"}</div>
              </div>
            ))}
            <div className="ml-auto">
              <button
                onClick={copyAddr}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-slate-500 text-[11px] text-slate-500 hover:text-slate-200 transition-all font-mono"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Economy row ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 px-5 py-4">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono mb-2">NXT Balance</div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{nxtFmt}</div>
            <div className="text-xs text-slate-600 mt-0.5 font-mono">NXT · 8 decimals</div>
          </div>
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/20 px-5 py-4">
            <div className="text-[9px] text-slate-600 uppercase tracking-widest font-mono mb-2">⚡ Lightning Sats</div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{satsFmt}</div>
            <div className="text-xs text-slate-600 mt-0.5 font-mono">
              {parseInt(data?.satsStaked ?? "0") > 0 ? `${stakedFmt} staked · ` : ""}sats
            </div>
          </div>
        </div>

        {/* ── Signal Forge ──────────────────────────────── */}
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${bandColor}30` }}>
          <div
            className="px-5 py-3 border-b flex items-center gap-2"
            style={{ borderColor: `${bandColor}20`, background: color.bg }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: bandColor }} />
            <span className="text-xs font-mono font-bold text-slate-200">SIGNAL FORGE</span>
            <span className="text-[10px] text-slate-600 font-mono">— broadcast on {data?.psiChannel ?? "your channel"}</span>
          </div>

          <div className="p-5 bg-slate-900/25">
            <textarea
              className="w-full bg-[#040810] border border-slate-800/60 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-700 font-mono resize-none focus:outline-none focus:border-slate-600 transition-colors"
              rows={3}
              placeholder="Type your signal…"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              maxLength={280}
            />

            {/* CE encoding preview — each character mapped to its visible-light wavelength */}
            {ce.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1 items-end">
                {ce.map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center px-1.5 py-1 rounded text-[9px] font-mono border"
                    style={{
                      borderColor: `hsl(${c.hue},60%,28%)`,
                      background:  `hsl(${c.hue},80%,5%)`,
                      color:       `hsl(${c.hue},80%,68%)`,
                    }}
                    title={`${c.nm} nm`}
                  >
                    <span className="font-bold text-[11px]">{c.char === " " ? "·" : c.char}</span>
                    <span style={{ color: `hsl(${c.hue},50%,42%)` }}>{c.nm}</span>
                  </div>
                ))}
                {msg.length > 24 && (
                  <span className="text-[9px] text-slate-700 font-mono self-center">+{msg.length - 24}</span>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-slate-700 font-mono">{msg.length}/280 chars · CE-encoded to visible light</span>
              <button
                data-testid="button-broadcast"
                onClick={() => msg.trim() && broadcast.mutate(msg.trim())}
                disabled={!msg.trim() || broadcast.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all disabled:opacity-40"
                style={{
                  background: `${bandColor}18`,
                  border:     `1px solid ${bandColor}45`,
                  color:      bandColor,
                }}
              >
                <Send className="w-3 h-3" />
                {broadcast.isPending ? "Transmitting…" : "Broadcast →"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Channel activity feed ─────────────────────── */}
        <div className="rounded-xl border border-slate-800/60 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-900/30 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-mono font-bold text-slate-500">CHANNEL ACTIVITY</span>
            <span className="text-[10px] text-slate-700 font-mono">{data?.psiChannel ?? ""}</span>
          </div>

          <div className="divide-y divide-slate-800/40">
            {!(data?.channelActivity?.length) ? (
              <div className="px-5 py-10 text-center text-slate-700 text-sm font-mono">
                No signals on this channel yet.<br />
                <span className="text-[11px]">Be the first to broadcast.</span>
              </div>
            ) : (
              (data.channelActivity as any[]).map((ev, i) => {
                const evNm  = ev.wavelengthNm ? parseFloat(String(ev.wavelengthNm)) : nm ?? 540;
                const evHue = Math.round(270 * (780 - evNm) / 400);
                const evBandColor = BAND_COLOR[ev.band] ?? "#94a3b8";
                return (
                  <div key={ev.id ?? i} className="px-5 py-3 flex items-start gap-3 hover:bg-slate-900/20 transition-colors">
                    <div
                      className="shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                      style={{ background: `hsl(${evHue},80%,55%)`, boxShadow: `0 0 6px hsl(${evHue},80%,55%)` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400 truncate">{ev.label ?? "signal"}</span>
                        {ev.band && (
                          <span className="text-[9px] font-mono px-1.5 rounded" style={{ color: evBandColor, background: `${evBandColor}15` }}>
                            {ev.band}
                          </span>
                        )}
                      </div>
                      {ev.content && (
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5 truncate">{ev.content.slice(0, 100)}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-[10px] text-slate-700 font-mono">{ev.createdAt ? ago(ev.createdAt) + " ago" : ""}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Footer nav ────────────────────────────────── */}
        <div className="pt-2 pb-4 flex flex-wrap gap-3">
          {[
            { href: "/psi-board", label: "Ψ Board" },
            { href: "/wallet", label: "Wallet" },
            { href: "/staking", label: "Staking" },
            { href: "/ce-se-pipeline", label: "CE-SE Pipeline" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <span className="text-[11px] font-mono text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">
                {label}
              </span>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
