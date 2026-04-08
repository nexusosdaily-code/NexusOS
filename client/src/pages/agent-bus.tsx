import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Zap, Radio, RefreshCw, Activity, Inbox } from "lucide-react";

// ── Band → colour map ─────────────────────────────────────────────
const BAND_COLOR: Record<string, string> = {
  SYSTEM: "#8b00ff", KERNEL: "#2563eb", USER: "#16a34a", GUEST: "#dc2626",
  AUTH: "#2563eb", STREAM: "#06b6d4", CORE: "#16a34a",
};
const bc = (b: string) => BAND_COLOR[b] ?? "#94a3b8";

// Authority band from wavelength
function bandFromWl(wl: number): string {
  if (wl < 450) return "SYSTEM";
  if (wl < 520) return "KERNEL";
  if (wl < 625) return "USER";
  return "GUEST";
}

// ── Core agents (always boot) ─────────────────────────────────────
const CORE_AGENTS = [
  { id: "os_kernel",         psi: "Ψ(20, 39, H)",   band: "SYSTEM", role: "OS root process" },
  { id: "bus_router",        psi: "Ψ(19, 39, V)",   band: "SYSTEM", role: "Message routing" },
  { id: "auth_gateway",      psi: "Ψ(135, 1, H)",   band: "KERNEL", role: "Authority verification" },
  { id: "scheduler_daemon",  psi: "Ψ(161, 30, V)",  band: "KERNEL", role: "Task scheduling" },
  { id: "watchdog_daemon",   psi: "Ψ(198, 31, H)",  band: "KERNEL", role: "Agent TTL monitor" },
];

const MSG_TYPES = ["MESSAGE", "HEARTBEAT", "COMMAND", "RESPONSE", "EVENT", "INTERRUPT"];

// ── Agent card ────────────────────────────────────────────────────
function AgentCard({
  agent, selected, onClick, inboxCount,
}: {
  agent: typeof CORE_AGENTS[0];
  selected: boolean;
  onClick: () => void;
  inboxCount: number;
}) {
  const colour = bc(agent.band);
  return (
    <button onClick={onClick}
      className="w-full text-left rounded-xl border p-3 transition-all"
      style={{
        borderColor: selected ? colour : "#1e293b",
        background:  selected ? `${colour}10` : "#0f172a",
        boxShadow:   selected ? `0 0 12px ${colour}30` : "none",
      }}
      data-testid={`agent-card-${agent.id}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colour }} />
          <span className="text-xs font-mono font-bold text-slate-200">{agent.id}</span>
        </div>
        {inboxCount > 0 && (
          <span className="text-xs font-mono px-1.5 py-0.5 rounded-full"
            style={{ background: `${colour}25`, color: colour }}>
            {inboxCount}
          </span>
        )}
      </div>
      <div className="text-xs font-mono mb-1" style={{ color: colour }}>{agent.psi}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
          style={{ background: `${colour}15`, color: colour, border: `1px solid ${colour}30` }}>
          {agent.band}
        </span>
        <span className="text-xs text-slate-600">{agent.role}</span>
      </div>
    </button>
  );
}

// ── Message row ───────────────────────────────────────────────────
function MessageRow({ msg, idx }: { msg: any; idx: number }) {
  const srcAgent = CORE_AGENTS.find(a => a.id === msg.src_agent);
  const dstAgent = CORE_AGENTS.find(a => a.id === msg.dst_agent);
  const srcBand  = srcAgent?.band ?? "USER";
  const dstBand  = dstAgent?.band ?? "USER";
  const srcC = bc(srcBand); const dstC = bc(dstBand);
  const isQueued     = msg.status === "queued";
  const isDispatched = msg.status === "dispatched";

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40"
      data-testid={`msg-row-${idx}`}>
      <div className="flex-shrink-0 mt-0.5">
        {isQueued
          ? <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          : <div className="w-2 h-2 rounded-full" style={{ background: dstC }} />}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span style={{ color: srcC }}>{msg.src_agent}</span>
          <span style={{ color: srcC }}>{msg.src_psi}</span>
          <span className="text-slate-600">→</span>
          <span style={{ color: dstC }}>{msg.dst_agent}</span>
          <span style={{ color: dstC }}>{msg.dst_psi}</span>
        </div>
        <p className="text-xs text-slate-300 truncate">{msg.payload}</p>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <span className="px-1 py-0.5 rounded text-xs"
            style={{ background: isQueued ? "#ca8a0420" : "#16a34a20",
                     color:      isQueued ? "#ca8a04"   : "#16a34a" }}>
            {msg.status}
          </span>
          <span>p{msg.priority}</span>
          <span>{msg.msg_type}</span>
          <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────
function EventRow({ ev, idx }: { ev: any; idx: number }) {
  const typeColors: Record<string, string> = {
    BOOT_COMPLETE: "#16a34a", AGENT_REGISTERED: "#2563eb", MESSAGE_ARRIVED: "#06b6d4",
    AGENT_DEGRADED: "#ca8a04", AGENT_RECLAIMED: "#dc2626", KERNEL_INTERRUPT: "#8b00ff",
    CONNECTED: "#16a34a",
  };
  const colour = typeColors[ev.event_type ?? ev.type] ?? "#94a3b8";

  return (
    <div className="flex items-start gap-2 text-xs font-mono py-1.5 border-b border-slate-800/40"
      data-testid={`event-row-${idx}`}>
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
}

// ── Tab 1: Compose + Send ─────────────────────────────────────────
function ComposeTab({ onSent }: { onSent: () => void }) {
  const [src,      setSrc]      = useState(CORE_AGENTS[2].id); // auth_gateway
  const [dst,      setDst]      = useState(CORE_AGENTS[0].id); // os_kernel
  const [payload,  setPayload]  = useState("");
  const [msgType,  setMsgType]  = useState("MESSAGE");
  const [priority, setPriority] = useState(5);
  const [result,   setResult]   = useState<any>(null);

  const sendMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/agent-bus/send", { src, dst, payload, priority, msgType })
        .then(r => r.json()),
    onSuccess: (d) => { setResult(d); setPayload(""); onSent(); },
  });

  const PRESETS: [string, string, string][] = [
    ["os_kernel",        "auth_gateway",      "VERIFY authority token for incoming user session request"],
    ["os_kernel",        "scheduler_daemon",  "SCHEDULE task spectral encode lambda instruction"],
    ["scheduler_daemon", "watchdog_daemon",   "HEARTBEAT daemon alive TTL reset 300 seconds"],
    ["bus_router",       "watchdog_daemon",   "SCAN all agents for TTL violations now"],
    ["bus_router",       "auth_gateway",      "ROUTE incoming message verify authority band KERNEL"],
    ["os_kernel",        "bus_router",        "BROADCAST boot sequence complete all agents registered"],
  ];

  const srcAgent = CORE_AGENTS.find(a => a.id === src);
  const dstAgent = CORE_AGENTS.find(a => a.id === dst);

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Messages are addressed by agent ID — the bus resolves the Ψ channel from the
        coordinator registry. Authority is checked before delivery; a KERNEL agent
        cannot be overridden by a USER band sender.
      </p>

      {/* Presets */}
      <div className="space-y-1">
        <Label className="text-xs text-slate-500">Load preset</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(([s, d, p], i) => (
            <button key={i}
              onClick={() => { setSrc(s); setDst(d); setPayload(p); setResult(null); }}
              className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono"
              data-testid={`preset-msg-${i}`}>
              {s.split("_")[0]} → {d.split("_")[0]}
            </button>
          ))}
        </div>
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
              {srcAgent.psi} · {srcAgent.band}
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
              {dstAgent.psi} · {dstAgent.band}
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Message type</Label>
          <select value={msgType} onChange={e => setMsgType(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="select-type">
            {MSG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Priority (1=high 10=low)</Label>
          <Input type="number" min={1} max={10} value={priority}
            onChange={e => setPriority(Number(e.target.value))}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-priority" />
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
        </div>
      )}

      {result?.error === "AUTHORITY_DENIED" && (
        <div className="rounded-xl border border-red-900/50 p-3 bg-red-950/20">
          <p className="text-xs font-mono text-red-400">AUTHORITY_DENIED — {result.reason}</p>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Live bus ───────────────────────────────────────────────
function LiveBusTab({ onRefresh }: { onRefresh: () => void }) {
  const qc = useQueryClient();
  const { data: histData }   = useQuery<any>({ queryKey: ["/api/agent-bus/history"],  refetchInterval: 3000 });
  const { data: busStatus }  = useQuery<any>({ queryKey: ["/api/agent-bus/status"],   refetchInterval: 3000 });
  const { data: eventsData } = useQuery<any>({ queryKey: ["/api/agent-bus/events"],   refetchInterval: 3000 });

  const messages: any[] = histData?.messages ?? [];
  const events:   any[] = eventsData?.events ?? [];
  const queued   = busStatus?.queued   ?? 0;
  const routeLog: any[] = busStatus?.route_log ?? [];

  const dispatchMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agent-bus/dispatch").then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agent-bus/history"] });
      qc.invalidateQueries({ queryKey: ["/api/agent-bus/status"] });
      onRefresh();
    },
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className={`w-2 h-2 rounded-full ${queued > 0 ? "bg-yellow-500 animate-pulse" : "bg-slate-700"}`} />
          <span className="text-slate-400">{queued} queued</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{messages.length} total sent</span>
        </div>
        <Button size="sm" variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          onClick={() => dispatchMut.mutate()}
          disabled={dispatchMut.isPending || queued === 0}
          data-testid="btn-dispatch">
          <Zap className="w-3 h-3 mr-1" />
          {dispatchMut.isPending ? "Dispatching…" : `Dispatch Next${queued > 0 ? ` (${queued})` : ""}`}
        </Button>
      </div>

      {/* Route log from Python bus (in-memory, real-time) */}
      {routeLog.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 font-mono mb-2">Bus route log (live)</div>
          <div className="space-y-1">
            {routeLog.slice(-10).reverse().map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs font-mono p-2 rounded bg-slate-900/60">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-slate-400">{r.src}</span>
                <span className="text-cyan-500">{r.src_channel ?? ""}</span>
                <span className="text-slate-600">→</span>
                <span className="text-slate-400">{r.dst}</span>
                <span className="text-cyan-500">{r.dst_channel ?? ""}</span>
                <span className="text-slate-600 flex-1 truncate">{r.payload}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistent message history */}
      <div>
        <div className="text-xs text-slate-500 font-mono mb-2">Persistent message history</div>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-700 font-mono text-sm">
            No messages yet — send one from the Compose tab.
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((m: any, i: number) => (
              <MessageRow key={m.id ?? i} msg={m} idx={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: Kernel events ──────────────────────────────────────────
function EventsTab() {
  const { data, refetch } = useQuery<any>({
    queryKey: ["/api/agent-bus/events"],
    refetchInterval: 2000,
  });
  const events: any[] = data?.events ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          Live kernel interrupt events — every bus message, agent registration,
          watchdog flag, and boot phase emits an event here.
        </p>
        <button onClick={() => refetch()}
          className="text-slate-600 hover:text-slate-400 transition-colors">
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
          <div className="px-3 py-2 max-h-96 overflow-y-auto">
            {[...events].reverse().map((ev: any, i: number) => (
              <EventRow key={i} ev={ev} idx={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Agent inbox ────────────────────────────────────────────
function InboxTab() {
  const [agent,    setAgent]   = useState(CORE_AGENTS[0].id);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);

  const drain = async () => {
    setLoading(true);
    try {
      const r = await apiRequest("POST", "/api/agent-bus/receive", { agent });
      const d = await r.json();
      setMessages(d.messages ?? []);
    } finally { setLoading(false); }
  };

  const agentInfo = CORE_AGENTS.find(a => a.id === agent);
  const colour    = bc(agentInfo?.band ?? "USER");

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Drain an agent's inbox — reads all undelivered messages queued for that agent's Ψ channel.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-slate-400">Agent</Label>
          <select value={agent} onChange={e => { setAgent(e.target.value); setMessages([]); }}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="select-inbox-agent">
            {CORE_AGENTS.map(a => <option key={a.id} value={a.id}>{a.id} — {a.psi}</option>)}
          </select>
          {agentInfo && (
            <div className="text-xs font-mono" style={{ color: colour }}>
              {agentInfo.psi} · {agentInfo.band} · {agentInfo.role}
            </div>
          )}
        </div>
        <Button onClick={drain} disabled={loading} data-testid="btn-drain">
          <Inbox className="w-3 h-3 mr-1" />
          {loading ? "Draining…" : "Drain Inbox"}
        </Button>
      </div>

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
          Send messages first and dispatch them to populate inboxes.
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function AgentBusPage() {
  const qc = useQueryClient();
  const [inboxCounts] = useState<Record<string, number>>({});

  const { data: busStatus } = useQuery<any>({
    queryKey: ["/api/agent-bus/status"],
    refetchInterval: 3000,
  });

  const queued   = busStatus?.queued ?? 0;
  const delivered = busStatus?.delivered ?? 0;

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
          <div className="ml-auto text-right text-xs font-mono text-slate-500 space-y-0.5">
            <div className={`${queued > 0 ? "text-yellow-400" : "text-slate-600"}`}>
              {queued} queued
            </div>
            <div>{delivered} delivered</div>
          </div>
        </div>

        {/* Spectrum bar */}
        <div className="h-1 w-full rounded mb-4"
          style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />

        {/* Agent grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          {CORE_AGENTS.map(agent => (
            <AgentCard key={agent.id} agent={agent} selected={false}
              onClick={() => {}} inboxCount={inboxCounts[agent.id] ?? 0} />
          ))}
        </div>

        {/* Channel topology line */}
        <div className="relative h-8 mb-1">
          <div className="absolute inset-y-3 left-0 right-0 border-t border-slate-800 border-dashed" />
          {CORE_AGENTS.map((agent, i) => {
            const colour = bc(agent.band);
            const left   = `${(i / (CORE_AGENTS.length - 1)) * 100}%`;
            return (
              <div key={agent.id} className="absolute top-0 bottom-0 flex flex-col items-center"
                style={{ left, transform: "translateX(-50%)" }}>
                <div className="w-3 h-3 rounded-full border-2 border-slate-950 z-10"
                  style={{ background: colour, marginTop: "8px" }}
                  title={`${agent.id}: ${agent.psi}`} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-700 px-0">
          {CORE_AGENTS.map(a => (
            <span key={a.id}
              className="truncate text-center"
              style={{ color: bc(a.band), maxWidth: "18%" }}>
              {a.id.split("_")[0]}
            </span>
          ))}
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
          <ComposeTab onSent={() => qc.invalidateQueries({ queryKey: ["/api/agent-bus/history"] })} />
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
