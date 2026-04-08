import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Send, Zap, Radio, RefreshCw, Activity, Inbox, Layers, ArrowRight, ExternalLink } from "lucide-react";

const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#8b00ff", KERNEL: "#2563eb", USER: "#16a34a", GUEST: "#dc2626",
  AUTH: "#2563eb", STREAM: "#06b6d4", CORE: "#16a34a",
};
const bc = (b: string) => BAND_COLOR[b] ?? "#94a3b8";

const CORE_AGENTS = [
  { id: "os_kernel",        psi: "Ψ(20, 39, H)",  wl: 411.37, band: "SYSTEM", role: "OS root process" },
  { id: "bus_router",       psi: "Ψ(19, 39, V)",  wl: 409.80, band: "SYSTEM", role: "Message routing" },
  { id: "auth_gateway",     psi: "Ψ(135, 1, H)",  wl: 591.76, band: "KERNEL", role: "Authority verify" },
  { id: "scheduler_daemon", psi: "Ψ(161, 30, V)", wl: 620.35, band: "KERNEL", role: "Task scheduling" },
  { id: "watchdog_daemon",  psi: "Ψ(198, 31, H)", wl: 701.20, band: "KERNEL", role: "TTL monitor" },
];

const MSG_TYPES = ["MESSAGE", "HEARTBEAT", "COMMAND", "RESPONSE", "EVENT", "INTERRUPT"];

// ── Agent node card ───────────────────────────────────────────────
function AgentNode({ agent, pulse }: { agent: typeof CORE_AGENTS[0]; pulse: boolean }) {
  const colour = bc(agent.band);
  return (
    <div className="flex flex-col items-center gap-1.5 px-1">
      <div className="relative">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-center transition-all"
          style={{
            background: `${colour}15`,
            border: `2px solid ${colour}`,
            boxShadow: pulse ? `0 0 20px ${colour}60, 0 0 6px ${colour}40` : `0 0 6px ${colour}20`,
          }}>
          <div className="text-xs font-mono font-bold leading-tight text-center px-0.5"
            style={{ color: colour, fontSize: "9px" }}>
            {agent.id.replace("_", "\n")}
          </div>
        </div>
        {pulse && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
        )}
      </div>
      <div className="text-center space-y-0.5">
        <div className="text-xs font-mono leading-none" style={{ color: colour, fontSize: "9px" }}>{agent.psi}</div>
        <div className="text-xs font-mono text-slate-700" style={{ fontSize: "9px" }}>{agent.wl}nm</div>
      </div>
    </div>
  );
}

// ── Live flow diagram ─────────────────────────────────────────────
function FlowDiagram({ activeMessages, queued }: { activeMessages: any[]; queued: number }) {
  const lastMsg = activeMessages[0];
  const srcIdx  = lastMsg ? CORE_AGENTS.findIndex(a => a.id === lastMsg.src_agent) : -1;
  const dstIdx  = lastMsg ? CORE_AGENTS.findIndex(a => a.id === lastMsg.dst_agent) : -1;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-500">Ψ Channel topology · {CORE_AGENTS.length} agents registered</span>
        <div className="flex items-center gap-2 text-xs font-mono">
          {queued > 0
            ? <span className="text-yellow-400 animate-pulse">{queued} queued</span>
            : <span className="text-slate-700">idle</span>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 overflow-x-auto">
        {CORE_AGENTS.map((agent, i) => (
          <div key={agent.id} className="flex items-center">
            <AgentNode
              agent={agent}
              pulse={(srcIdx === i || dstIdx === i) && !!lastMsg}
            />
            {i < CORE_AGENTS.length - 1 && (
              <div className="flex items-center mx-1">
                {srcIdx === i && dstIdx === i + 1 ? (
                  <ArrowRight className="w-4 h-4 text-yellow-400 animate-bounce" />
                ) : (
                  <div className="w-4 h-px bg-slate-800" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {lastMsg && (
        <div className="mt-3 text-xs font-mono text-slate-500 truncate border-t border-slate-800 pt-2">
          Last: <span className="text-slate-300">{lastMsg.src_agent}</span>
          <span style={{ color: bc(CORE_AGENTS.find(a => a.id === lastMsg.src_agent)?.band ?? "USER") }}>
            {" "}{lastMsg.src_psi}
          </span>
          {" → "}
          <span className="text-slate-300">{lastMsg.dst_agent}</span>
          <span style={{ color: bc(CORE_AGENTS.find(a => a.id === lastMsg.dst_agent)?.band ?? "USER") }}>
            {" "}{lastMsg.dst_psi}
          </span>
          {" — "}
          <span className="text-slate-400">{lastMsg.payload?.slice(0, 60)}</span>
        </div>
      )}
    </div>
  );
}

// ── Compose tab ────────────────────────────────────────────────────
function ComposeTab({ onSent }: { onSent: () => void }) {
  const [src,      setSrc]      = useState(CORE_AGENTS[0].id); // os_kernel
  const [dst,      setDst]      = useState(CORE_AGENTS[2].id); // auth_gateway
  const [payload,  setPayload]  = useState("");
  const [msgType,  setMsgType]  = useState("MESSAGE");
  const [priority, setPriority] = useState(3);
  const [result,   setResult]   = useState<any>(null);
  const [mineToo,  setMineToo]  = useState(false);
  const [mineResult, setMineResult] = useState<any>(null);

  const sendMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/agent-bus/send", { src, dst, payload, priority, msgType })
        .then(r => r.json()),
    onSuccess: async (d) => {
      setResult(d);
      setPayload("");
      onSent();
      if (mineToo && d?.success) {
        try {
          const mr = await apiRequest("POST", "/api/blockchain/mine", {
            content: `BUS_MSG ${src}→${dst} ${payload.slice(0, 80)}`,
          });
          setMineResult(await mr.json());
        } catch {}
      }
    },
  });

  const PRESETS: [string, string, string, number, string][] = [
    ["os_kernel",       "auth_gateway",     "VERIFY authority token for incoming user session request", 2, "COMMAND"],
    ["os_kernel",       "scheduler_daemon", "SCHEDULE task spectral encode lambda instruction",         3, "COMMAND"],
    ["scheduler_daemon","watchdog_daemon",   "HEARTBEAT daemon alive TTL reset 300 seconds",            5, "HEARTBEAT"],
    ["bus_router",      "watchdog_daemon",   "SCAN all agents for TTL violations report now",           3, "COMMAND"],
    ["bus_router",      "auth_gateway",      "ROUTE incoming message verify authority band KERNEL",     4, "COMMAND"],
    ["os_kernel",       "bus_router",        "BROADCAST boot sequence complete all agents registered",  1, "EVENT"],
  ];

  const srcAgent = CORE_AGENTS.find(a => a.id === src);
  const dstAgent = CORE_AGENTS.find(a => a.id === dst);

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Messages are addressed by agent ID — the bus resolves the Ψ channel from the
        coordinator registry. Authority is enforced before delivery; lower band rank
        means higher authority.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(([s, d, p, pr, mt], i) => (
          <button key={i}
            onClick={() => { setSrc(s); setDst(d); setPayload(p); setPriority(pr); setMsgType(mt); setResult(null); setMineResult(null); }}
            className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono"
            data-testid={`preset-msg-${i}`}>
            {s.split("_")[0]} → {d.split("_")[0]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Source agent</Label>
          <select value={src} onChange={e => setSrc(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="select-src">
            {CORE_AGENTS.map(a => (
              <option key={a.id} value={a.id}>{a.id} — {a.psi}</option>
            ))}
          </select>
          {srcAgent && (
            <div className="text-xs font-mono" style={{ color: bc(srcAgent.band) }}>
              {srcAgent.psi} · {srcAgent.band} · {srcAgent.wl}nm
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Destination agent</Label>
          <select value={dst} onChange={e => setDst(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="select-dst">
            {CORE_AGENTS.map(a => (
              <option key={a.id} value={a.id}>{a.id} — {a.psi}</option>
            ))}
          </select>
          {dstAgent && (
            <div className="text-xs font-mono" style={{ color: bc(dstAgent.band) }}>
              {dstAgent.psi} · {dstAgent.band} · {dstAgent.wl}nm
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Payload</Label>
        <Textarea value={payload} onChange={e => setPayload(e.target.value)}
          className="bg-slate-800 border-slate-600 text-slate-200 text-sm font-mono min-h-16"
          placeholder="Message content…"
          data-testid="input-payload" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Type</Label>
          <select value={msgType} onChange={e => setMsgType(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="select-type">
            {MSG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Priority (1=high)</Label>
          <Input type="number" min={1} max={10} value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-priority" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Mine on blockchain</Label>
          <label className="flex items-center gap-2 cursor-pointer h-9">
            <input type="checkbox" checked={mineToo} onChange={e => setMineToo(e.target.checked)}
              className="rounded" data-testid="check-mine" />
            <span className="text-xs text-slate-400">Anchor to chain</span>
          </label>
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !payload || src === dst}
            data-testid="btn-send">
            <Send className="w-3 h-3 mr-1" />
            {sendMut.isPending ? "Sending…" : "Send to Bus"}
          </Button>
        </div>
      </div>

      {result?.success && (
        <div className="rounded-xl border p-3 space-y-2"
          style={{ borderColor: "#06b6d440", background: "#06b6d408" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold text-slate-200">Message queued</span>
            <span className="text-xs font-mono text-slate-500">depth: {result.queue_depth}</span>
          </div>
          <p className="text-xs font-mono text-cyan-400">{result.route}</p>
          <p className="text-xs font-mono text-slate-500">
            Authority: {result.authority} · Permitted: {result.permitted ? "✓" : "✗"}
          </p>
          {mineResult?.success && (
            <div className="flex items-center gap-2 text-xs font-mono text-violet-400">
              <Layers className="w-3 h-3" />
              <span>Anchored to chain: Block #{mineResult.block.blockNumber} {mineResult.block.psiChannel}</span>
            </div>
          )}
        </div>
      )}

      {result?.error === "AUTHORITY_DENIED" && (
        <div className="rounded-xl border border-red-900/50 p-3 bg-red-950/20">
          <p className="text-xs font-mono text-red-400">AUTHORITY_DENIED — {result.reason}</p>
          <p className="text-xs text-slate-600 mt-1">
            Only higher-authority bands can write to lower-band channels.
            SYSTEM (violet/UV) &gt; KERNEL (blue) &gt; USER (green) &gt; GUEST (red/IR).
          </p>
        </div>
      )}
    </div>
  );
}

// ── Live bus tab ───────────────────────────────────────────────────
function LiveBusTab({ onRefresh }: { onRefresh: () => void }) {
  const qc = useQueryClient();
  const [autoDispatch, setAutoDispatch] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: histData }   = useQuery<any>({ queryKey: ["/api/agent-bus/history"],  refetchInterval: 2500 });
  const { data: busStatus }  = useQuery<any>({ queryKey: ["/api/agent-bus/status"],   refetchInterval: 2500 });

  const messages: any[] = histData?.messages ?? [];
  const queued  = busStatus?.queued   ?? 0;
  const delivered = busStatus?.delivered ?? 0;
  const routeLog: any[] = busStatus?.route_log ?? [];

  const dispatchMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agent-bus/dispatch").then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agent-bus/history"] });
      qc.invalidateQueries({ queryKey: ["/api/agent-bus/status"] });
      onRefresh();
    },
  });

  // Auto-dispatch interval
  useEffect(() => {
    if (autoDispatch) {
      autoRef.current = setInterval(() => {
        if (queued > 0) dispatchMut.mutate();
      }, 2000);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoDispatch, queued]);

  const statusColors: Record<string, string> = {
    queued: "#ca8a04", dispatched: "#16a34a",
  };

  return (
    <div className="space-y-4">
      {/* Flow diagram */}
      <FlowDiagram activeMessages={messages.slice(0, 3)} queued={queued} />

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className={`w-2 h-2 rounded-full ${queued > 0 ? "bg-yellow-500 animate-pulse" : "bg-slate-700"}`} />
          <span className="text-slate-400">{queued} queued · {delivered} delivered · {messages.length} total</span>
        </div>
        <Button size="sm" variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          onClick={() => dispatchMut.mutate()}
          disabled={dispatchMut.isPending || queued === 0}
          data-testid="btn-dispatch">
          <Zap className="w-3 h-3 mr-1" />
          {dispatchMut.isPending ? "Dispatching…" : `Dispatch${queued > 0 ? ` (${queued})` : ""}`}
        </Button>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
          <input type="checkbox" checked={autoDispatch} onChange={e => setAutoDispatch(e.target.checked)}
            data-testid="check-auto-dispatch" />
          Auto-dispatch every 2s
        </label>
        <Link href="/blockchain" className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-blue-400 transition-colors">
          <Layers className="w-3 h-3" /> Blockchain
        </Link>
      </div>

      {/* Live route log */}
      {routeLog.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 font-mono mb-2">Bus route log (live, in-memory)</div>
          <div className="space-y-1">
            {routeLog.slice(-8).reverse().map((r: any, i: number) => {
              const srcA = CORE_AGENTS.find(a => a.id === r.src);
              const dstA = CORE_AGENTS.find(a => a.id === r.dst);
              return (
                <div key={i} className="flex items-center gap-2 text-xs font-mono p-2 rounded bg-slate-900/60 border border-slate-800/40">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span style={{ color: bc(srcA?.band ?? "USER") }}>{r.src}</span>
                  <span style={{ color: bc(srcA?.band ?? "USER") }} className="text-xs opacity-70">{r.src_channel ?? ""}</span>
                  <ArrowRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                  <span style={{ color: bc(dstA?.band ?? "USER") }}>{r.dst}</span>
                  <span style={{ color: bc(dstA?.band ?? "USER") }} className="text-xs opacity-70">{r.dst_channel ?? ""}</span>
                  <span className="text-slate-600 flex-1 truncate">{r.payload}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Persistent history */}
      <div>
        <div className="text-xs text-slate-500 font-mono mb-2">Persistent message history (PostgreSQL)</div>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-700 font-mono text-sm">
            No messages yet — send one from the Compose tab.
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((m: any, i: number) => {
              const srcA = CORE_AGENTS.find(a => a.id === m.src_agent);
              const dstA = CORE_AGENTS.find(a => a.id === m.dst_agent);
              const srcC = bc(srcA?.band ?? "USER");
              const dstC = bc(dstA?.band ?? "USER");
              const statusC = statusColors[m.status] ?? "#94a3b8";
              return (
                <div key={m.id ?? i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40"
                  data-testid={`msg-row-${i}`}>
                  <div className="flex-shrink-0 mt-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: statusC }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                      <span style={{ color: srcC }}>{m.src_agent}</span>
                      <span className="opacity-60" style={{ color: srcC }}>{m.src_psi}</span>
                      <ArrowRight className="w-3 h-3 text-slate-700 flex-shrink-0" />
                      <span style={{ color: dstC }}>{m.dst_agent}</span>
                      <span className="opacity-60" style={{ color: dstC }}>{m.dst_psi}</span>
                    </div>
                    <p className="text-xs text-slate-300 truncate">{m.payload}</p>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                      <span className="px-1 py-0.5 rounded text-xs"
                        style={{ background: `${statusC}20`, color: statusC }}>
                        {m.status}
                      </span>
                      <span>p{m.priority}</span>
                      <span>{m.msg_type}</span>
                      <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kernel events tab ─────────────────────────────────────────────
function EventsTab() {
  const { data, refetch } = useQuery<any>({
    queryKey: ["/api/agent-bus/events"],
    refetchInterval: 2000,
  });
  const events: any[] = data?.events ?? [];

  const typeColors: Record<string, string> = {
    BOOT_COMPLETE: "#16a34a", AGENT_REGISTERED: "#2563eb", MESSAGE_ARRIVED: "#06b6d4",
    AGENT_DEGRADED: "#ca8a04", AGENT_RECLAIMED: "#dc2626", KERNEL_INTERRUPT: "#8b00ff",
    CONNECTED: "#16a34a",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          Live kernel interrupt events — every bus message, agent registration,
          watchdog flag, and boot phase emits an event here.
        </p>
        <button onClick={() => refetch()} className="text-slate-600 hover:text-slate-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-slate-700 font-mono text-sm">
          No events yet. The kernel emits events on boot, agent registration, and message dispatch.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-slate-800">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-400">KernelEventBus · {events.length} events</span>
          </div>
          <div className="px-3 py-2 max-h-96 overflow-y-auto space-y-0">
            {[...events].reverse().map((ev: any, i: number) => {
              const colour = typeColors[ev.event_type ?? ev.type] ?? "#94a3b8";
              return (
                <div key={i} className="flex items-start gap-2 text-xs font-mono py-1.5 border-b border-slate-800/40"
                  data-testid={`event-row-${i}`}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: colour }} />
                  <span style={{ color: colour }} className="flex-shrink-0">{ev.event_type ?? ev.type}</span>
                  {ev.agent_id && <span className="text-slate-500">{ev.agent_id}</span>}
                  <span className="text-slate-700 truncate flex-1">
                    {ev.detail ? JSON.stringify(ev.detail) : ""}
                  </span>
                  <span className="text-slate-700 flex-shrink-0">
                    {ev.timestamp ? new Date(ev.timestamp * 1000).toLocaleTimeString() : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inbox tab ─────────────────────────────────────────────────────
function InboxTab() {
  const [agent,    setAgent]   = useState(CORE_AGENTS[0].id);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [anchorToChain, setAnchorToChain] = useState(false);
  const [chainResult,   setChainResult]   = useState<any>(null);

  const drain = async () => {
    setLoading(true);
    setChainResult(null);
    try {
      const r = await apiRequest("POST", "/api/agent-bus/receive", { agent });
      const d = await r.json();
      setMessages(d.messages ?? []);
      if (anchorToChain && (d.messages ?? []).length > 0) {
        const mr = await apiRequest("POST", "/api/blockchain/mine", {
          content: `INBOX_DRAIN ${agent} ${d.count} messages ${d.messages.map((m: any) => m.payload.slice(0, 20)).join("; ")}`,
        });
        setChainResult(await mr.json());
      }
    } finally { setLoading(false); }
  };

  const agentInfo = CORE_AGENTS.find(a => a.id === agent);
  const colour    = bc(agentInfo?.band ?? "USER");

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Drain an agent's inbox — reads all undelivered messages queued for that agent's Ψ channel.
        Optionally anchor the drain event to the blockchain.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-slate-400">Agent</Label>
          <select value={agent} onChange={e => { setAgent(e.target.value); setMessages([]); setChainResult(null); }}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="select-inbox-agent">
            {CORE_AGENTS.map(a => <option key={a.id} value={a.id}>{a.id} — {a.psi}</option>)}
          </select>
          {agentInfo && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span style={{ color: colour }}>{agentInfo.psi} · {agentInfo.band}</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
                <input type="checkbox" checked={anchorToChain} onChange={e => setAnchorToChain(e.target.checked)}
                  data-testid="check-anchor" />
                Anchor drain to blockchain
              </label>
            </div>
          )}
        </div>
        <Button onClick={drain} disabled={loading} data-testid="btn-drain">
          <Inbox className="w-3 h-3 mr-1" />
          {loading ? "Draining…" : "Drain Inbox"}
        </Button>
      </div>

      {chainResult?.success && (
        <div className="flex items-center gap-2 text-xs font-mono text-violet-400 p-2 rounded bg-violet-950/20 border border-violet-900/40">
          <Layers className="w-3 h-3" />
          Anchored: Block #{chainResult.block.blockNumber} {chainResult.block.psiChannel} {parseFloat(chainResult.block.wavelengthNm).toFixed(1)}nm
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-mono text-slate-500">{messages.length} message{messages.length !== 1 ? "s" : ""} in inbox</div>
          {messages.map((m: any, i: number) => (
            <div key={i} className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-mono mb-1">
                <span className="text-slate-500">from</span>
                <span className="text-slate-300">{m.src}</span>
                <span className="text-slate-500">p{m.priority}</span>
              </div>
              <p className="text-xs text-slate-200">{m.payload}</p>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-700 font-mono text-sm">
          Click "Drain Inbox" to read messages for {agent}.
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function AgentBusPage() {
  const qc = useQueryClient();

  const { data: busStatus } = useQuery<any>({
    queryKey: ["/api/agent-bus/status"],
    refetchInterval: 3000,
  });
  const { data: chainData } = useQuery<any>({
    queryKey: ["/api/blockchain/chain"],
    refetchInterval: 8000,
  });

  const queued   = busStatus?.queued   ?? 0;
  const delivered = busStatus?.delivered ?? 0;
  const chainHeight = (chainData?.blocks ?? []).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#8b00ff,#2563eb)" }}>
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Agent Message Bus</h1>
            <p className="text-slate-400 text-sm">
              Agents communicate by Ψ channel address — not socket ID or process handle
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs font-mono text-slate-500">
            <Link href="/blockchain" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
              <Layers className="w-3 h-3" />
              Chain height {chainHeight}
            </Link>
            <div className="text-right space-y-0.5">
              <div className={queued > 0 ? "text-yellow-400" : "text-slate-600"}>{queued} queued</div>
              <div>{delivered} delivered</div>
            </div>
          </div>
        </div>

        {/* Spectrum bar */}
        <div className="h-1 w-full rounded mb-4"
          style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />

        {/* Authority band guide */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { band: "SYSTEM", wl: "380–449nm", note: "OS root · highest authority" },
            { band: "KERNEL", wl: "450–624nm", note: "Daemons · service level" },
            { band: "USER",   wl: "520–624nm", note: "Application agents" },
            { band: "GUEST",  wl: "625–780nm", note: "External · lowest auth" },
          ].map(({ band, wl, note }) => {
            const colour = bc(band);
            return (
              <div key={band} className="rounded-lg p-2 border"
                style={{ borderColor: `${colour}30`, background: `${colour}08` }}>
                <div className="text-xs font-mono font-bold mb-0.5" style={{ color: colour }}>{band}</div>
                <div className="text-xs font-mono text-slate-600">{wl}</div>
                <div className="text-xs text-slate-700" style={{ fontSize: "9px" }}>{note}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="compose" data-testid="tab-compose">
            <Send className="w-3 h-3 mr-1" /> Compose
          </TabsTrigger>
          <TabsTrigger value="live"    data-testid="tab-live">
            <Radio className="w-3 h-3 mr-1" /> Live Bus
          </TabsTrigger>
          <TabsTrigger value="events"  data-testid="tab-events">
            <Activity className="w-3 h-3 mr-1" /> Kernel Events
          </TabsTrigger>
          <TabsTrigger value="inbox"   data-testid="tab-inbox">
            <Inbox className="w-3 h-3 mr-1" /> Inbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Address by agent ID — bus resolves the Ψ channel, authority enforced automatically
          </h2>
          <ComposeTab onSent={() => {
            qc.invalidateQueries({ queryKey: ["/api/agent-bus/history"] });
            qc.invalidateQueries({ queryKey: ["/api/agent-bus/status"] });
          }} />
        </TabsContent>

        <TabsContent value="live">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Live route log + persistent history — dispatch queued messages to see them flow
          </h2>
          <LiveBusTab onRefresh={() => {
            qc.invalidateQueries({ queryKey: ["/api/agent-bus/history"] });
            qc.invalidateQueries({ queryKey: ["/api/agent-bus/status"] });
          }} />
        </TabsContent>

        <TabsContent value="events">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            KernelEventBus interrupt log — every system event from boot to reclaim
          </h2>
          <EventsTab />
        </TabsContent>

        <TabsContent value="inbox">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Drain any agent's inbox — reads messages delivered to its Ψ channel
          </h2>
          <InboxTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
