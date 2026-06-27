import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  Clock, Copy, ExternalLink, Zap, Image, Coins, Layers,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SERVICE_WALLET = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";
const ANCHOR_WALLET  = "bc1pkpap9gqrc8xm02jhj8wfggmxzrxcmqtdpemyx0rtrap6xpd3pycsj2ydd6";

function fmtTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  if (s > 10) return `${s}s ago`;
  return "just now";
}

function shortAddr(a: string) { return `${a.slice(0, 10)}…${a.slice(-6)}`; }

const EVENT_ICONS: Record<string, ReactNode> = {
  new_inscription: <Image  className="w-3.5 h-3.5 text-purple-400" />,
  rune_change:     <Coins  className="w-3.5 h-3.5 text-violet-400" />,
  brc20_change:    <Layers className="w-3.5 h-3.5 text-blue-400" />,
  startup:         <Wifi   className="w-3.5 h-3.5 text-cyan-400" />,
};

// ── SSE hook ──────────────────────────────────────────────────────────────────
function useAssetsStream() {
  const [data, setData]           = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [lastPush, setLastPush]   = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let retry: ReturnType<typeof setTimeout>;
    function connect() {
      esRef.current?.close();
      const es = new EventSource("/api/btc/assets-sentinel/stream");
      esRef.current = es;
      es.onopen    = () => setConnected(true);
      es.onmessage = (e) => {
        try { setData(JSON.parse(e.data)); setLastPush(Date.now()); } catch {}
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        retry = setTimeout(connect, 5_000);
      };
    }
    connect();
    return () => { clearTimeout(retry); esRef.current?.close(); };
  }, []);

  return { data, connected, lastPush };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function WalletTag({ wallet }: { wallet: "service" | "anchor" }) {
  return wallet === "service"
    ? <span className="text-[9px] font-mono bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">service</span>
    : <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">anchor</span>;
}

function Section({
  icon, title, badge, children, defaultOpen = true,
}: { icon: ReactNode; title: string; badge?: string | number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="bg-slate-900/60 border-slate-700/50 mb-3">
      <button
        className="w-full flex items-center gap-2 p-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        {icon}
        <span className="text-white font-semibold text-sm">{title}</span>
        {badge !== undefined && (
          <span className="text-gray-500 text-xs font-mono ml-1">({badge})</span>
        )}
        <div className="flex-1" />
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </Card>
  );
}

function AddrRow({ label, addr }: { label: string; addr: string }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] text-gray-500 font-mono w-14 shrink-0">{label}</span>
      <span className="text-[10px] font-mono text-gray-400 break-all">{shortAddr(addr)}</span>
      <button onClick={() => { navigator.clipboard.writeText(addr); toast({ title: "Copied" }); }}
        className="text-gray-600 hover:text-gray-300 shrink-0">
        <Copy className="w-2.5 h-2.5" />
      </button>
      <a href={`https://mempool.space/address/${addr}`} target="_blank" rel="noopener noreferrer"
        className="text-gray-600 hover:text-orange-400 shrink-0">
        <ExternalLink className="w-2.5 h-2.5" />
      </a>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BtcAssetsSentinelPage() {
  const { data, connected, lastPush } = useAssetsStream();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  const snap: any   = data?.snapshot ?? null;
  const events: any[] = data?.events ?? [];

  const svcOrdinals  = snap?.ordinals?.service  ?? [];
  const ancOrdinals  = snap?.ordinals?.anchor   ?? [];
  const svcRunes     = snap?.runes?.service     ?? [];
  const ancRunes     = snap?.runes?.anchor      ?? [];
  const svcBrc20     = snap?.brc20?.service     ?? [];
  const ancBrc20     = snap?.brc20?.anchor      ?? [];

  const totalOrdinals = svcOrdinals.length + ancOrdinals.length;
  const nexusRune     = [...svcRunes, ...ancRunes].find((r: any) =>
    r.name?.replace(/[^A-Z•]/g, "") === "NEXUS•WAVELENGTH"
  );
  const wnspBrc20     = [...svcBrc20, ...ancBrc20].find((b: any) =>
    b.tick?.toLowerCase() === "wnsp"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <button className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <Layers className="w-5 h-5 text-purple-400" />
          <span className="text-gray-400 text-sm font-mono">Assets Sentinel</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {connected
              ? <><div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" /><span className="text-purple-400">LIVE</span></>
              : <><WifiOff className="w-3 h-3 text-gray-500" /><span className="text-gray-500">reconnecting…</span></>
            }
          </div>
        </div>

        {/* Wallet addresses */}
        <Card className="bg-slate-900/40 border-slate-700/40 p-4 mb-4">
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Watched Wallets</div>
          <AddrRow label="Service" addr={SERVICE_WALLET} />
          <AddrRow label="Anchor"  addr={ANCHOR_WALLET} />
          {snap && (
            <div className="text-[10px] text-gray-600 font-mono mt-2">
              Last push: {lastPush ? fmtTime(new Date(lastPush).toISOString()) : "—"} · polls every 2 min
            </div>
          )}
          {!snap && (
            <div className="text-gray-500 text-xs animate-pulse mt-1">
              {connected ? "Fetching on-chain assets…" : "Connecting…"}
            </div>
          )}
        </Card>

        {/* Summary pills */}
        {snap && (
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1">
              <Image className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-mono text-purple-300">{totalOrdinals} inscription{totalOrdinals !== 1 ? "s" : ""}</span>
            </div>
            {nexusRune && (
              <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
                <Coins className="w-3 h-3 text-violet-400" />
                <span className="text-xs font-mono text-violet-300">
                  NEXUS•WAVELENGTH: {nexusRune.amount}
                </span>
              </div>
            )}
            {wnspBrc20 && (
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
                <Layers className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-mono text-blue-300">
                  WNSP BRC-20: {wnspBrc20.overallBalance}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ordinals */}
        <Section icon={<Image className="w-4 h-4 text-purple-400" />} title="Ordinal Inscriptions" badge={totalOrdinals}>
          {totalOrdinals === 0 && snap && (
            <div className="text-gray-600 text-xs text-center py-3">No inscriptions found on either wallet</div>
          )}
          {[...svcOrdinals.map((i: any) => ({ ...i, _wallet: "service" })),
            ...ancOrdinals.map((i: any) => ({ ...i, _wallet: "anchor" })),
          ].slice(0, 20).map((ins: any) => (
            <div key={ins.id} className="flex items-start gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
              <WalletTag wallet={ins._wallet} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono text-gray-300">#{ins.number}</span>
                <span className="text-[10px] text-gray-600 ml-2">{ins.contentType}</span>
              </div>
              <a href={`https://ordinals.com/inscription/${ins.id}`} target="_blank" rel="noopener noreferrer"
                className="text-gray-600 hover:text-purple-400 shrink-0">
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
          {totalOrdinals > 20 && (
            <div className="text-[10px] text-gray-600 font-mono mt-2 text-center">
              + {totalOrdinals - 20} more · view on ordinals.com
            </div>
          )}
        </Section>

        {/* Runes */}
        <Section icon={<Coins className="w-4 h-4 text-violet-400" />} title="Rune Balances" badge={svcRunes.length + ancRunes.length}>
          {svcRunes.length + ancRunes.length === 0 && snap && (
            <div className="text-gray-600 text-xs text-center py-3">No Rune balances found</div>
          )}
          {[...svcRunes.map((r: any) => ({ ...r, _wallet: "service" })),
            ...ancRunes.map((r: any) => ({ ...r, _wallet: "anchor" })),
          ].map((rune: any, i: number) => {
            const isNexus = rune.name?.replace(/[^A-Z•]/g, "") === "NEXUS•WAVELENGTH";
            return (
              <div key={`${rune._wallet}-${rune.name}-${i}`}
                className={`flex items-center gap-2 py-1.5 border-b border-slate-800/50 last:border-0 ${isNexus ? "bg-violet-500/5 rounded" : ""}`}>
                <WalletTag wallet={rune._wallet} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-mono ${isNexus ? "text-violet-300 font-bold" : "text-gray-300"}`}>
                    {isNexus ? "💜 " : ""}{rune.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-400 shrink-0">{rune.amount}</span>
              </div>
            );
          })}
        </Section>

        {/* BRC-20 */}
        <Section icon={<Layers className="w-4 h-4 text-blue-400" />} title="BRC-20 Balances" badge={svcBrc20.length + ancBrc20.length}>
          {svcBrc20.length + ancBrc20.length === 0 && snap && (
            <div className="text-gray-600 text-xs text-center py-3">No BRC-20 balances found</div>
          )}
          {[...svcBrc20.map((b: any) => ({ ...b, _wallet: "service" })),
            ...ancBrc20.map((b: any) => ({ ...b, _wallet: "anchor" })),
          ].map((tok: any, i: number) => {
            const isWnsp = tok.tick?.toLowerCase() === "wnsp";
            return (
              <div key={`${tok._wallet}-${tok.tick}-${i}`}
                className={`flex items-center gap-2 py-1.5 border-b border-slate-800/50 last:border-0 ${isWnsp ? "bg-blue-500/5 rounded" : ""}`}>
                <WalletTag wallet={tok._wallet} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-mono ${isWnsp ? "text-blue-300 font-bold" : "text-gray-300"}`}>
                    {isWnsp ? "🌊 " : ""}{tok.tick?.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-2">transferable: {tok.transferableBalance}</span>
                </div>
                <span className="text-xs font-mono text-gray-400 shrink-0">{tok.overallBalance}</span>
              </div>
            );
          })}
        </Section>

        {/* Event log */}
        <Card className="bg-slate-900/60 border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-semibold text-sm">Live Event Log</span>
            <span className="text-gray-500 text-xs font-mono ml-auto">{events.length} events</span>
          </div>
          {events.length === 0 && (
            <div className="text-gray-600 text-sm text-center py-6">No events yet — sentinel is watching…</div>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.map((ev: any, i: number) => (
              <div key={`${ev.timestamp}-${i}`} className="flex items-start gap-2.5 py-2 border-b border-slate-800/50 last:border-0">
                <div className="mt-0.5 shrink-0">{EVENT_ICONS[ev.type] ?? <Clock className="w-3.5 h-3.5 text-gray-500" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-300 leading-relaxed font-mono">{ev.message}</div>
                  {ev.detail && <div className="text-[10px] text-gray-600 font-mono mt-0.5">{ev.detail}</div>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {ev.wallet && <WalletTag wallet={ev.wallet} />}
                  <span className="text-[10px] font-mono text-gray-600">{fmtTime(ev.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-600 font-mono space-y-1">
          <div>Server-sent events — page updates instantly when sentinel detects activity</div>
          <div>Polls Hiro API + ordinals.com every 2 min · Telegram alerts on changes</div>
        </div>
      </div>
    </div>
  );
}
