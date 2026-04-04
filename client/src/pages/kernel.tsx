import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Activity, Database, Shield, Bell,
  RefreshCw, Zap, CheckCircle, AlertTriangle, XCircle, Power,
} from "lucide-react";

// ─── helpers ───────────────────────────────────────────────────────────────

const BAND_COLORS: Record<string, string> = {
  SYSTEM: "bg-violet-900/60 text-violet-200 border-violet-600",
  KERNEL: "bg-blue-900/60 text-blue-200 border-blue-600",
  USER:   "bg-green-900/60 text-green-200 border-green-600",
  GUEST:  "bg-orange-900/60 text-orange-200 border-orange-600",
};

const HEALTH_ICON: Record<string, JSX.Element> = {
  HEALTHY:        <CheckCircle className="w-4 h-4 text-green-400" />,
  DEGRADED:       <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  PENDING_RECLAIM:<XCircle className="w-4 h-4 text-red-400" />,
  EXEMPT:         <Shield className="w-4 h-4 text-violet-400" />,
};

const EVENT_COLORS: Record<string, string> = {
  BOOT_COMPLETE:    "text-violet-300",
  AGENT_REGISTERED: "text-green-300",
  AGENT_RELEASED:   "text-orange-300",
  AGENT_RECLAIMED:  "text-red-300",
  AGENT_DEGRADED:   "text-yellow-300",
  MESSAGE_ARRIVED:  "text-blue-300",
  WATCHDOG_SCAN:    "text-cyan-300",
};

function ts(t: number) {
  return new Date(t * 1000).toLocaleTimeString();
}

// ─── sub-components ────────────────────────────────────────────────────────

function BootPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/kernel/boot"],
    refetchInterval: 30_000,
  });

  if (isLoading) return <p className="text-slate-400">Loading boot report…</p>;

  const phases: any[] = data?.report?.phases ?? [];
  const log: any[]    = data?.log ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge className={data?.booted ? "bg-green-700" : "bg-red-700"}>
          {data?.booted ? "BOOTED" : "NOT BOOTED"}
        </Badge>
        <span className="text-slate-400 text-sm">
          Boot time: {data?.report?.boot_time_ms ?? "—"} ms
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {phases.map((p: any) => (
          <Card key={p.phase}
            className="bg-slate-900 border border-slate-700">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-slate-500">Phase {p.phase}</span>
                <Badge
                  className={p.status === "ok"
                    ? "bg-green-800 text-green-200 text-xs"
                    : "bg-yellow-800 text-yellow-200 text-xs"}>
                  {p.status}
                </Badge>
              </div>
              <p className="font-mono text-sm text-slate-200">{p.name}</p>
              {p.restored !== undefined &&
                <p className="text-xs text-slate-400 mt-1">{p.restored} agents restored</p>}
              {p.agents && (
                <p className="text-xs text-slate-400 mt-1">
                  {p.agents.length} core agents seeded
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Boot Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="font-mono text-xs max-h-48 overflow-y-auto p-3 space-y-1">
            {log.map((e: any, i: number) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-500">{ts(e.timestamp)}</span>
                <span className="text-cyan-400">{e.phase}</span>
                <span className="text-slate-200">{e.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PersistencePanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/kernel/state"],
    refetchInterval: 15_000,
  });

  if (isLoading) return <p className="text-slate-400">Loading state…</p>;

  const agents: any[]       = data?.agents ?? [];
  const events: any[]       = data?.kernel_events ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">
            Live registry: <span className="text-green-300 font-mono">{data?.live_registry}</span>
          </span>
          <span className="text-slate-400">
            DB agents: <span className="text-blue-300 font-mono">{data?.db_agents}</span>
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}
          data-testid="btn-refresh-state">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Persisted Agents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Agent</TableHead>
                <TableHead className="text-slate-400">Channel</TableHead>
                <TableHead className="text-slate-400">Authority</TableHead>
                <TableHead className="text-slate-400">Intent</TableHead>
                <TableHead className="text-slate-400">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a: any) => (
                <TableRow key={a.agent_id} className="border-slate-700">
                  <TableCell className="font-mono text-sm text-slate-200">
                    {a.agent_id}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-cyan-400">
                    Ψ({a.wdm},{a.oam},{a.pol === 0 ? "H" : "V"})
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border ${BAND_COLORS[a.authority_band] ?? ""}`}>
                      {a.authority_band}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{a.intent}</TableCell>
                  <TableCell className="text-xs text-slate-400">{ts(a.registered_at)}</TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-slate-500">
                  No persisted agents yet
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">DB Kernel Events (recent 50)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 max-h-48 overflow-y-auto">
          <div className="font-mono text-xs p-3 space-y-1">
            {events.map((e: any) => (
              <div key={e.id} className="flex gap-2">
                <span className="text-slate-500">{ts(e.created_at)}</span>
                <span className={EVENT_COLORS[e.event_type] ?? "text-slate-300"}>
                  {e.event_type}
                </span>
                {e.agent_id && <span className="text-slate-400">{e.agent_id}</span>}
              </div>
            ))}
            {events.length === 0 && <p className="text-slate-500">No events yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuthorityPanel() {
  const [src, setSrc]     = useState("my_agent");
  const [dst, setDst]     = useState("os_kernel");
  const [result, setResult] = useState<any>(null);

  const { data } = useQuery({ queryKey: ["/api/kernel/authority"] });

  const checkMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/kernel/authority/check", { src, dst })
        .then(r => r.json()),
    onSuccess: setResult,
  });

  const bands: any[] = data?.bands ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {bands.map((b: any) => (
          <Card key={b.band} className="bg-slate-900 border border-slate-700">
            <CardContent className="p-3">
              <Badge className={`text-xs border mb-2 ${BAND_COLORS[b.band] ?? ""}`}>
                {b.band} — Rank {b.rank}
              </Badge>
              <p className="text-xs text-slate-400 mb-1">{b.wdm_range}</p>
              <p className="text-xs text-slate-500">{b.wavelength}</p>
              <p className="text-xs text-slate-300 mt-2">{b.description}</p>
              {b.core_agents.length > 0 && (
                <div className="mt-2">
                  {b.core_agents.map((a: string) => (
                    <p key={a} className="text-xs font-mono text-violet-300">{a}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Authority Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Rule: sender.rank ≤ receiver.rank — lower rank = higher authority
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Source Agent</Label>
              <Input value={src} onChange={e => setSrc(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                data-testid="input-authority-src" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Destination Agent</Label>
              <Input value={dst} onChange={e => setDst(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                data-testid="input-authority-dst" />
            </div>
            <Button onClick={() => checkMutation.mutate()}
              disabled={checkMutation.isPending}
              data-testid="btn-authority-check">
              Check
            </Button>
          </div>
          {result && (
            <div className={`p-3 rounded border font-mono text-sm ${
              result.permitted
                ? "bg-green-950 border-green-700 text-green-300"
                : "bg-red-950 border-red-700 text-red-300"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {result.permitted
                  ? <CheckCircle className="w-4 h-4" />
                  : <XCircle className="w-4 h-4" />}
                <span className="font-bold">
                  {result.permitted ? "PERMITTED" : "DENIED"}
                </span>
              </div>
              <p className="text-xs">{result.reason}</p>
              {result.src_band && (
                <p className="text-xs text-slate-400 mt-1">
                  {result.src} [{result.src_band}] → {result.dst} [{result.dst_band}]
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EventsPanel() {
  const [evtType, setEvtType] = useState("CUSTOM");
  const [agentId, setAgentId] = useState("");
  const [emitResult, setEmitResult] = useState<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["/api/kernel/events"],
    refetchInterval: 5_000,
  });

  const emitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/kernel/events/emit", {
        event_type: evtType,
        agent_id:   agentId || undefined,
        detail:     { source: "frontend" },
      }).then(r => r.json()),
    onSuccess: (d) => { setEmitResult(d); refetch(); },
  });

  const events: any[] = data?.events ?? [];
  const status = data?.status ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Card className="bg-slate-900 border border-slate-700">
          <CardContent className="p-3">
            <p className="text-slate-400 text-xs">Total Emitted</p>
            <p className="font-mono text-2xl text-cyan-300">{status.total_emitted ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border border-slate-700">
          <CardContent className="p-3">
            <p className="text-slate-400 text-xs">Log Size</p>
            <p className="font-mono text-2xl text-blue-300">{status.log_size ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border border-slate-700">
          <CardContent className="p-3">
            <p className="text-slate-400 text-xs">Active Clients</p>
            <p className="font-mono text-2xl text-green-300">{status.active_clients ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border border-slate-700">
          <CardContent className="p-3">
            <p className="text-slate-400 text-xs">Interrupt Types</p>
            <p className="font-mono text-2xl text-violet-300">
              {status.interrupt_types?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Emit Interrupt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Event Type</Label>
              <Input value={evtType} onChange={e => setEvtType(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                data-testid="input-event-type" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-400">Agent ID (optional)</Label>
              <Input value={agentId} onChange={e => setAgentId(e.target.value)}
                placeholder="e.g. my_agent"
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                data-testid="input-event-agent" />
            </div>
            <Button onClick={() => emitMutation.mutate()}
              disabled={emitMutation.isPending}
              data-testid="btn-emit-event">
              <Zap className="w-3 h-3 mr-1" /> Emit
            </Button>
          </div>
          {emitResult?.event && (
            <p className="font-mono text-xs text-green-300">
              ✓ seq={emitResult.event.seq} {emitResult.event.event_type} @ {ts(emitResult.event.timestamp)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm text-slate-300">Interrupt Log</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 max-h-64 overflow-y-auto">
          <div className="font-mono text-xs p-3 space-y-1">
            {[...events].reverse().map((e: any) => (
              <div key={e.seq} className="flex gap-2 items-start">
                <span className="text-slate-600 w-6 text-right">#{e.seq}</span>
                <span className="text-slate-500">{ts(e.timestamp)}</span>
                <span className={EVENT_COLORS[e.event_type] ?? "text-slate-300"}>
                  {e.event_type}
                </span>
                {e.agent_id && <span className="text-slate-400">{e.agent_id}</span>}
                {e.detail && Object.keys(e.detail).length > 0 && (
                  <span className="text-slate-600 truncate max-w-xs">
                    {JSON.stringify(e.detail)}
                  </span>
                )}
              </div>
            ))}
            {events.length === 0 && <p className="text-slate-500">No events yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WatchdogPanel() {
  const { data, refetch } = useQuery({
    queryKey: ["/api/kernel/watchdog"],
    refetchInterval: 10_000,
  });

  const scanMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/kernel/watchdog/scan", {}).then(r => r.json()),
    onSuccess: () => refetch(),
  });

  const health: Record<string, any> = data?.agent_health ?? {};
  const reclaimed: any[]            = data?.reclaim_log ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <span className="text-slate-400">
            Status:
            <Badge className={`ml-2 ${data?.running ? "bg-green-700" : "bg-slate-600"}`}>
              {data?.running ? "RUNNING" : "STOPPED"}
            </Badge>
          </span>
          <span className="text-slate-400">
            TTL: <span className="font-mono text-yellow-300">{data?.ttl_s}s</span>
          </span>
          <span className="text-slate-400">
            Reclaim after: <span className="font-mono text-orange-300">{data?.reclaim_after_s}s</span>
          </span>
          <span className="text-slate-400">
            Total reclaimed: <span className="font-mono text-red-300">{data?.total_reclaimed}</span>
          </span>
        </div>
        <Button size="sm" variant="outline"
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          data-testid="btn-watchdog-scan">
          <Activity className="w-3 h-3 mr-1" /> Force Scan
        </Button>
      </div>

      {data?.degraded?.length > 0 && (
        <div className="p-3 rounded border border-yellow-700 bg-yellow-950 text-yellow-300 text-sm font-mono">
          ⚠ DEGRADED: {data.degraded.join(", ")}
        </div>
      )}

      <Card className="bg-slate-900 border border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Agent Health Monitor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Agent</TableHead>
                <TableHead className="text-slate-400">Channel</TableHead>
                <TableHead className="text-slate-400">Health</TableHead>
                <TableHead className="text-slate-400">Idle</TableHead>
                <TableHead className="text-slate-400">Exempt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(health).map(([name, h]: [string, any]) => (
                <TableRow key={name} className="border-slate-700">
                  <TableCell className="font-mono text-sm text-slate-200">{name}</TableCell>
                  <TableCell className="font-mono text-xs text-cyan-400">{h.channel}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {HEALTH_ICON[h.health] ?? null}
                      <span className="text-xs text-slate-300">{h.health}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">{h.idle_s}s</TableCell>
                  <TableCell>
                    {h.is_exempt && <Shield className="w-3 h-3 text-violet-400" />}
                  </TableCell>
                </TableRow>
              ))}
              {Object.keys(health).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-slate-500">
                  No agents registered
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {reclaimed.length > 0 && (
        <Card className="bg-slate-900 border border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Reclaim Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-36 overflow-y-auto">
            <div className="font-mono text-xs p-3 space-y-1">
              {reclaimed.map((r: any, i: number) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-500">{ts(r.timestamp)}</span>
                  <span className="text-red-400">{r.action}</span>
                  <span className="text-slate-200">{r.agent}</span>
                  <span className="text-cyan-400">{r.channel}</span>
                  <span className="text-slate-400">idle {r.idle_s}s</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────

export default function KernelPage() {
  const { data: overview } = useQuery({
    queryKey: ["/api/kernel/status"],
    refetchInterval: 10_000,
  });

  const components = overview?.components ?? {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-violet-900 flex items-center justify-center">
            <Zap className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              WNSP AI Operating System Kernel
            </h1>
            <p className="text-slate-400 text-sm">
              5-component kernel — {overview?.equation ?? "Λ = hf/c²"} —{" "}
              {overview?.channels ?? 25600} Hilbert channels — AGPL-3.0
            </p>
          </div>
          <Badge className={`ml-auto ${overview?.booted ? "bg-green-800" : "bg-slate-700"}`}>
            {overview?.booted ? "KERNEL ACTIVE" : "INITIALISING"}
          </Badge>
        </div>

        {/* Component status strip */}
        <div className="flex gap-2 flex-wrap mt-3">
          {[
            { key: "boot",        label: "Boot",        icon: "①" },
            { key: "persistence", label: "Persistence", icon: "②" },
            { key: "authority",   label: "Authority",   icon: "③" },
            { key: "events",      label: "Events",      icon: "④" },
            { key: "watchdog",    label: "Watchdog",    icon: "⑤" },
          ].map(({ key, label, icon }) => {
            const comp  = components[key] ?? {};
            const ok    = comp.status === "ok" || comp.running !== false;
            return (
              <div key={key}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                  ok
                    ? "bg-green-950 border-green-800 text-green-300"
                    : "bg-slate-800 border-slate-700 text-slate-400"
                }`}>
                <span>{icon}</span>
                <span>{label}</span>
                {ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="boot">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="boot"        data-testid="tab-boot">① Boot</TabsTrigger>
          <TabsTrigger value="persistence" data-testid="tab-persistence">② Persistence</TabsTrigger>
          <TabsTrigger value="authority"   data-testid="tab-authority">③ Authority</TabsTrigger>
          <TabsTrigger value="events"      data-testid="tab-events">④ Events</TabsTrigger>
          <TabsTrigger value="watchdog"    data-testid="tab-watchdog">⑤ Watchdog</TabsTrigger>
        </TabsList>

        <TabsContent value="boot">
          <h2 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2">
            <span className="text-lg">①</span> Boot / Init Sequence
            <span className="text-slate-500 text-xs font-normal ml-1">
              — 5-phase auto-init on process start
            </span>
          </h2>
          <BootPanel />
        </TabsContent>

        <TabsContent value="persistence">
          <h2 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
            <span className="text-lg">②</span> Persistent State
            <span className="text-slate-500 text-xs font-normal ml-1">
              — Agent registry + bus log saved to PostgreSQL
            </span>
          </h2>
          <PersistencePanel />
        </TabsContent>

        <TabsContent value="authority">
          <h2 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
            <span className="text-lg">③</span> Authority / Permission Layer
            <span className="text-slate-500 text-xs font-normal ml-1">
              — Spectral authority bands mapped to WDM ranges
            </span>
          </h2>
          <AuthorityPanel />
        </TabsContent>

        <TabsContent value="events">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
            <span className="text-lg">④</span> Interrupt / Event System
            <span className="text-slate-500 text-xs font-normal ml-1">
              — Push-model kernel interrupts with SSE streaming
            </span>
          </h2>
          <EventsPanel />
        </TabsContent>

        <TabsContent value="watchdog">
          <h2 className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
            <span className="text-lg">⑤</span> Dead Agent Watchdog
            <span className="text-slate-500 text-xs font-normal ml-1">
              — TTL health monitor + automatic channel reclamation
            </span>
          </h2>
          <WatchdogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
