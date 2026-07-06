import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity, Radio, Cpu, Zap, CheckCircle, AlertCircle,
  Plus, Trash2, Send, BarChart3, Layers, Lock,
  Clock, ListOrdered, Terminal, RefreshCw, GitBranch, Inbox,
} from "lucide-react";

const API = (path: string) => path;

async function post(path: string, body: object) {
  const r = await fetch(API(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function get(path: string, params?: Record<string, string>) {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  const r = await fetch(API(url));
  return r.json();
}

function ChannelBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function WavelengthSwatch({ nm }: { nm: number }) {
  const hue = Math.round(270 - ((nm - 380) / (780 - 380)) * 270);
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
      style={{ background: `hsl(${hue}, 90%, 55%)` }}
    />
  );
}

/* ─── Psi notation badge ─── */
function PsiBadge({ notation }: { notation: string }) {
  return (
    <span className="font-mono text-cyan-300 bg-cyan-900/30 border border-cyan-500/40 rounded px-2 py-0.5 text-xs">
      {notation}
    </span>
  );
}

type Tab = "agents" | "bus" | "scheduler" | "simulation" | "orthogonality" | "monitor";

export default function WNSPCoordinator() {
  const qc = useQueryClient();

  const [agentId, setAgentId]           = useState("");
  const [intent, setIntent]             = useState("inference");
  const [instruction, setInstruction]   = useState("");
  const [simContent, setSimContent]     = useState("Hello Lambda");
  const [schedPayload, setSchedPayload] = useState("");
  const [schedPriority, setSchedPriority] = useState("5");
  const [busSrc, setBusSrc]             = useState("");
  const [busDst, setBusDst]             = useState("");
  const [busPayload, setBusPayload]     = useState("");
  const [busPriority, setBusPriority]   = useState("5");
  const [busReceiveAgent, setBusReceiveAgent] = useState("");
  const [activeTab, setActiveTab]       = useState<Tab>("agents");
  const [lastResult, setLastResult]     = useState<any>(null);

  /* ── queries ── */
  const { data: agentStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["agent-status"],
    queryFn:  () => get("/api/wnsp/agent/status"),
    refetchInterval: 4000,
  });

  const { data: orthoData } = useQuery({
    queryKey: ["orthogonality"],
    queryFn:  () => get("/api/wnsp/se/orthogonality"),
    enabled:  activeTab === "orthogonality",
  });

  const { data: logData, refetch: refetchLog } = useQuery({
    queryKey: ["agent-log"],
    queryFn:  () => get("/api/wnsp/agent/log", { n: "30" }),
    enabled:  activeTab === "monitor",
    refetchInterval: 3000,
  });

  /* ── mutations ── */
  const allocateMut = useMutation({
    mutationFn: (body: { agent_id: string; intent: string }) =>
      post("/api/wnsp/agent/allocate", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["agent-status"] });
      setLastResult(data);
    },
  });

  const mapMut = useMutation({
    mutationFn: (body: { agent_id: string; instruction: string }) =>
      post("/api/wnsp/agent/map", body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["agent-status"] });
      setLastResult(data);
    },
  });

  const releaseMut = useMutation({
    mutationFn: (body: { agent_id: string }) =>
      post("/api/wnsp/agent/release", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-status"] }),
  });

  const scheduleMut = useMutation({
    mutationFn: (body: { agent_id: string; payload: string; priority: number }) =>
      post("/api/wnsp/agent/schedule", body),
    onSuccess: (data) => setLastResult(data),
  });

  const dispatchMut = useMutation({
    mutationFn: () => post("/api/wnsp/agent/dispatch", {}),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["agent-status"] });
      qc.invalidateQueries({ queryKey: ["agent-log"] });
      setLastResult(data);
    },
  });

  const simMut = useMutation({
    mutationFn: (body: { content: string }) =>
      post("/api/wnsp/se/simulate", body),
  });

  const busSendMut = useMutation({
    mutationFn: (body: { src: string; dst: string; payload: string; priority: number }) =>
      post("/api/wnsp/bus/send", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-status"] }),
  });

  const busDispatchMut = useMutation({
    mutationFn: () => post("/api/wnsp/bus/dispatch", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bus-status"] }),
  });

  const busReceiveMut = useMutation({
    mutationFn: (body: { agent: string }) =>
      post("/api/wnsp/bus/receive", body),
  });

  const { data: busStatus, refetch: refetchBus } = useQuery({
    queryKey: ["bus-status"],
    queryFn:  () => get("/api/wnsp/bus/status"),
    enabled:  activeTab === "bus",
    refetchInterval: 3000,
  });

  /* ── handlers ── */
  const handleAllocate = useCallback(() => {
    if (!agentId.trim()) return;
    allocateMut.mutate({ agent_id: agentId.trim(), intent });
  }, [agentId, intent, allocateMut]);

  const handleMap = useCallback(() => {
    if (!agentId.trim() || !instruction.trim()) return;
    mapMut.mutate({ agent_id: agentId.trim(), instruction: instruction.trim() });
  }, [agentId, instruction, mapMut]);

  const handleRelease = useCallback((id: string) => {
    releaseMut.mutate({ agent_id: id });
  }, [releaseMut]);

  const handleSchedule = useCallback(() => {
    if (!agentId.trim() || !schedPayload.trim()) return;
    scheduleMut.mutate({
      agent_id: agentId.trim(),
      payload: schedPayload.trim(),
      priority: parseInt(schedPriority) || 5,
    });
  }, [agentId, schedPayload, schedPriority, scheduleMut]);

  /* ── derived values ── */
  const agents    = Object.entries(agentStatus?.agents ?? {}) as [string, any][];
  const occupied    = agentStatus?.occupied_channels ?? 0;
  const available   = agentStatus?.available_channels ?? 51200;
  const total       = agentStatus?.total_channels ?? 51200;
  const queueDepth  = agentStatus?.queue_depth ?? 0;
  const sysDensity  = agentStatus?.system_density ?? null;

  const tabClass = (t: Tab) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      activeTab === t
        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
        : "text-gray-400 hover:text-gray-200"
    }`;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
              <Cpu className="w-6 h-6" /> AI/OS Channel Coordinator
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Ψ(wdm, oam, H/V, dir) &nbsp;·&nbsp; 51,200 orthogonal channels &nbsp;·&nbsp; ⟨Ψ_i | Ψ_j⟩ = 0
            </p>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
            <Activity className="w-3 h-3" /> WNSP-SE v1.0
          </Badge>
        </div>

        {/* Architecture callout */}
        <Card className="bg-gray-900/40 border-gray-700/50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-gray-400 justify-center">
            {["Application Layer (AI / OS)", "WNSP Coordinator", "WNSP-CE", "WNSP-SE", "Ψ_channel", "Transmission"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className={i === 1 ? "text-cyan-300" : i === 4 ? "text-purple-300" : "text-gray-300"}>{s}</span>
                {i < arr.length - 1 && <span className="text-gray-600">→</span>}
              </span>
            ))}
          </div>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">Allocated</div>
            <div className="text-2xl font-bold text-cyan-300">{occupied}</div>
            <ChannelBar value={occupied} max={total} color="bg-cyan-500" />
          </Card>
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">Available</div>
            <div className="text-2xl font-bold text-green-300">{available.toLocaleString()}</div>
            <ChannelBar value={available} max={total} color="bg-green-500" />
          </Card>
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">dim(H)</div>
            <div className="text-2xl font-bold text-purple-300">51,200</div>
            <div className="text-xs text-gray-500 mt-1">256 × 50 × 2 × 2</div>
          </Card>
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">Queue Depth</div>
            <div className="text-2xl font-bold text-yellow-300">{queueDepth}</div>
            {sysDensity ? (
              <div className="text-xs text-cyan-400 mt-1 font-mono" data-testid="system-density-wnsp">
                D_WNSP {(sysDensity.d_wnsp ?? 0).toLocaleString()} sym/cycle
              </div>
            ) : (
              <div className="text-xs text-gray-500 mt-1">pending instructions</div>
            )}
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <button className={tabClass("agents")}        onClick={() => setActiveTab("agents")}>
            <Layers className="w-3.5 h-3.5 inline mr-1" /> Agents
          </button>
          <button className={tabClass("bus")}           onClick={() => setActiveTab("bus")}>
            <GitBranch className="w-3.5 h-3.5 inline mr-1" /> Message Bus
          </button>
          <button className={tabClass("scheduler")}     onClick={() => setActiveTab("scheduler")}>
            <ListOrdered className="w-3.5 h-3.5 inline mr-1" /> Scheduler
          </button>
          <button className={tabClass("simulation")}    onClick={() => setActiveTab("simulation")}>
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> SE Simulation
          </button>
          <button className={tabClass("orthogonality")} onClick={() => setActiveTab("orthogonality")}>
            <Lock className="w-3.5 h-3.5 inline mr-1" /> Orthogonality
          </button>
          <button className={tabClass("monitor")}       onClick={() => setActiveTab("monitor")}>
            <Terminal className="w-3.5 h-3.5 inline mr-1" /> Runtime Monitor
          </button>
        </div>

        {/* ── Agents tab ── */}
        {activeTab === "agents" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Allocate + Map panel */}
            <Card className="bg-gray-900/60 border-gray-700 p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> Allocate Channel
              </h2>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">Agent ID</label>
                <Input
                  data-testid="input-agent-id"
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                  placeholder="e.g. vision_ai, planner_ai, os_kernel"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">Intent</label>
                <Input
                  data-testid="input-agent-intent"
                  value={intent}
                  onChange={e => setIntent(e.target.value)}
                  placeholder="inference / routing / monitoring"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <Button
                data-testid="button-allocate"
                onClick={handleAllocate}
                disabled={!agentId.trim() || allocateMut.isPending}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Radio className="w-4 h-4 mr-2" />
                {allocateMut.isPending ? "Allocating…" : "Allocate Ψ_channel"}
              </Button>

              {allocateMut.data && !allocateMut.data.error && (
                <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg text-xs space-y-2">
                  <div className="text-cyan-200 font-mono text-sm font-bold">{allocateMut.data.display}</div>
                  <div className="text-gray-400 font-mono">{allocateMut.data.basis}</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-500">WDM </span><span className="text-blue-300">{allocateMut.data.wdm}</span></div>
                    <div><span className="text-gray-500">OAM </span><span className="text-green-300">{allocateMut.data.oam}</span></div>
                    <div><span className="text-gray-500">Pol </span><span className="text-yellow-300">{allocateMut.data.polarisation}</span></div>
                  </div>
                  <div className="text-gray-400">λ = {allocateMut.data.wavelength_nm?.toFixed(1)} nm &nbsp;·&nbsp;
                    flat index #{allocateMut.data.flat_index}</div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                    {allocateMut.data.status === "existing" ? "Existing channel returned" : "New channel allocated"}
                  </Badge>
                </div>
              )}

              {/* Map instruction */}
              <div className="pt-2 border-t border-gray-700 space-y-2">
                <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1">
                  <Send className="w-3 h-3 text-purple-400" /> Map AI Instruction → CE → SE → Ψ
                </h3>
                <Textarea
                  data-testid="input-instruction"
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder="Type an AI system command or instruction…"
                  className="bg-gray-800 border-gray-600 text-white text-sm h-20 resize-none"
                />
                <Button
                  data-testid="button-map"
                  onClick={handleMap}
                  disabled={!agentId.trim() || !instruction.trim() || mapMut.isPending}
                  className="w-full bg-purple-700 hover:bg-purple-600 text-white"
                >
                  {mapMut.isPending ? "Mapping…" : "Route via Coordinator"}
                </Button>

                {mapMut.data && !mapMut.data.error && (
                  <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-xs space-y-1">
                    <div className="text-purple-200 font-mono text-sm">{mapMut.data.display}</div>
                    <div className="text-gray-400">{mapMut.data.frame_count} SE frames generated</div>
                    {mapMut.data.frames_preview?.slice(0, 2).map((f: any, i: number) => (
                      <div key={i} className="text-gray-500">
                        [{f.ce_symbols?.join("")}] λ {f.wavelength_start_nm?.toFixed(0)}–{f.wavelength_end_nm?.toFixed(0)} nm &nbsp; E={f.energy_joules?.toExponential(2)} J
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Agent registry */}
            <Card className="bg-gray-900/60 border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-cyan-400" /> Agent Registry ({agents.length})
              </h2>

              {agents.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">
                  No agents allocated. Register one on the left.
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {agents.map(([id, info]: [string, any]) => {
                    const ch = info.channel ?? {};
                    return (
                      <div
                        key={id}
                        data-testid={`agent-card-${id}`}
                        className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <WavelengthSwatch nm={ch.wavelength_nm ?? 555} />
                            <span className="text-white text-sm font-medium">{id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PsiBadge notation={ch.notation ?? "Ψ(…)"} />
                            <button
                              data-testid={`button-release-${id}`}
                              onClick={() => handleRelease(id)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 font-mono mb-2">{ch.basis}</div>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          <div><span className="text-gray-500">WDM </span><span className="text-blue-300">{ch.wdm}</span></div>
                          <div><span className="text-gray-500">OAM </span><span className="text-green-300">{ch.oam}</span></div>
                          <div><span className="text-gray-500">Pol </span><span className="text-yellow-300">{ch.polarisation}</span></div>
                          <div><span className="text-gray-500">idx </span><span className="text-gray-300">{ch.flat_index}</span></div>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>{ch.wavelength_nm?.toFixed(1)} nm &nbsp;·&nbsp; {info.intent}</span>
                          <span>{info.routed_count ?? 0} routed &nbsp;·&nbsp; {info.uptime_s?.toFixed(0)}s up</span>
                        </div>
                        {info.channel_density && (
                          <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-3 text-xs font-mono">
                            <span className="text-gray-500">D_ch</span>
                            <span className="text-cyan-300" data-testid={`agent-density-${id}`}>{info.channel_density.d_channel} sym/cycle</span>
                            <span className="text-gray-600">·</span>
                            <span className="text-gray-500">D_E</span>
                            <span className="text-purple-300">{info.channel_density.d_energy_per_joule?.toFixed(0)} sym/J</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Message Bus tab ── */}
        {activeTab === "bus" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Send panel */}
            <Card className="bg-gray-900/60 border-gray-700 p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-green-400" /> Send Message
              </h2>

              {/* Architecture strip */}
              <div className="bg-gray-800/50 rounded-lg p-3 font-mono text-xs text-center space-y-0.5 text-gray-400">
                {["Agent", "Message Bus", "Ψ routing", "Scheduler queue", "Target agent inbox"].map((s, i, arr) => (
                  <div key={s}>
                    <span className={i === 2 ? "text-cyan-300" : i === 4 ? "text-green-300" : "text-gray-300"}>{s}</span>
                    {i < arr.length - 1 && <div className="text-gray-600">↓</div>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">From (src)</label>
                  <Input
                    data-testid="input-bus-src"
                    value={busSrc}
                    onChange={e => setBusSrc(e.target.value)}
                    placeholder="vision_ai"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">To (dst)</label>
                  <Input
                    data-testid="input-bus-dst"
                    value={busDst}
                    onChange={e => setBusDst(e.target.value)}
                    placeholder="planner_ai"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Payload</label>
                <Textarea
                  data-testid="input-bus-payload"
                  value={busPayload}
                  onChange={e => setBusPayload(e.target.value)}
                  placeholder="e.g. object detected, move forward, speak hello"
                  className="bg-gray-800 border-gray-600 text-white h-16 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Priority (1 = highest)</label>
                <Input
                  data-testid="input-bus-priority"
                  type="number" min="1" max="10"
                  value={busPriority}
                  onChange={e => setBusPriority(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white w-24"
                />
              </div>

              <Button
                data-testid="button-bus-send"
                onClick={() => busSendMut.mutate({
                  src: busSrc.trim(), dst: busDst.trim(),
                  payload: busPayload.trim(),
                  priority: parseInt(busPriority) || 5,
                })}
                disabled={!busSrc.trim() || !busDst.trim() || !busPayload.trim() || busSendMut.isPending}
                className="w-full bg-green-700 hover:bg-green-600 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                {busSendMut.isPending ? "Queuing…" : "Send via Bus"}
              </Button>

              {busSendMut.data && !busSendMut.data.error && (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-xs space-y-1">
                  <div className="text-green-200 font-mono">{busSendMut.data.route}</div>
                  <div className="text-gray-400">Payload: {busSendMut.data.payload}</div>
                  <div className="text-gray-500">Queue depth: {busSendMut.data.queue_depth}</div>
                </div>
              )}
              {busSendMut.data?.error && (
                <div className="p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300">
                  {busSendMut.data.error}
                </div>
              )}

              {/* Dispatch + Receive */}
              <div className="pt-2 border-t border-gray-700 space-y-3">
                <h3 className="text-xs font-bold text-gray-300 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400" /> Dispatch &amp; Receive
                </h3>

                <Button
                  data-testid="button-bus-dispatch"
                  onClick={() => busDispatchMut.mutate()}
                  disabled={busDispatchMut.isPending || (busStatus?.queued ?? 0) === 0}
                  className="w-full bg-yellow-700 hover:bg-yellow-600 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {busDispatchMut.isPending ? "Dispatching…" : `Dispatch Next (${busStatus?.queued ?? "?"})`}
                </Button>

                {busDispatchMut.data?.status === "dispatched" && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-xs space-y-1">
                    <div className="text-yellow-200 font-mono">{busDispatchMut.data.route}</div>
                    <div className="text-gray-400">Payload: {String(busDispatchMut.data.payload)}</div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    data-testid="input-bus-receive-agent"
                    value={busReceiveAgent}
                    onChange={e => setBusReceiveAgent(e.target.value)}
                    placeholder="Agent to check inbox…"
                    className="bg-gray-800 border-gray-600 text-white flex-1"
                  />
                  <Button
                    data-testid="button-bus-receive"
                    onClick={() => busReceiveMut.mutate({ agent: busReceiveAgent.trim() })}
                    disabled={!busReceiveAgent.trim() || busReceiveMut.isPending}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    <Inbox className="w-4 h-4 mr-1" />
                    Receive
                  </Button>
                </div>

                {busReceiveMut.data && (
                  <div className="p-3 bg-gray-800/60 rounded-lg text-xs space-y-2">
                    <div className="text-gray-300 font-medium flex items-center gap-2">
                      <Inbox className="w-3 h-3 text-cyan-400" />
                      {busReceiveMut.data.agent} — {busReceiveMut.data.count ?? 0} message{(busReceiveMut.data.count ?? 0) !== 1 ? "s" : ""}
                      {busReceiveMut.data.channel?.notation && (
                        <PsiBadge notation={busReceiveMut.data.channel.notation} />
                      )}
                    </div>
                    {busReceiveMut.data.messages?.length === 0 && (
                      <div className="text-gray-500">Inbox empty.</div>
                    )}
                    {busReceiveMut.data.messages?.map((m: any, i: number) => (
                      <div key={i} className="border border-gray-700 rounded p-2 space-y-1">
                        <div className="text-green-300 font-mono text-xs">
                          {m.src_channel?.notation} → {m.dst_channel?.notation}
                        </div>
                        <div className="text-gray-200">{String(m.payload)}</div>
                        <div className="text-gray-500">from {m.src} · priority {m.priority}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Bus status + route log */}
            <Card className="bg-gray-900/60 border-gray-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-400" /> Bus Status
                </h2>
                <Button onClick={() => refetchBus()} variant="outline"
                  className="border-gray-600 text-gray-300 hover:text-white h-7 text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>

              {busStatus && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Queued",  value: busStatus.queued,       color: "text-yellow-300" },
                      { label: "Routes",  value: busStatus.routes,       color: "text-cyan-300" },
                      { label: "Sent",    value: busStatus.total_sent,   color: "text-green-300" },
                    ].map(s => (
                      <div key={s.label} className="p-2 bg-gray-800/50 rounded text-center">
                        <div className="text-xs text-gray-400">{s.label}</div>
                        <div className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</div>
                      </div>
                    ))}
                  </div>

                  {/* Queue snapshot */}
                  {busStatus.queue?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Pending Queue</div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {busStatus.queue.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs p-2 bg-gray-800/40 rounded">
                            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs w-6 justify-center">
                              {item.priority}
                            </Badge>
                            <span className="text-gray-400">{item.src} → {item.dst}</span>
                            <span className="text-gray-300 truncate flex-1">{item.payload}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Route log */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Route Log</div>
                    {busStatus.route_log?.length === 0 && (
                      <div className="text-gray-500 text-xs text-center py-4">
                        No dispatched messages yet.
                      </div>
                    )}
                    <div className="space-y-2 max-h-[340px] overflow-y-auto font-mono">
                      {[...(busStatus.route_log ?? [])].reverse().map((r: any, i: number) => (
                        <div key={i} data-testid={`bus-route-${i}`}
                          className="p-2 bg-gray-800/40 rounded border border-gray-700/50 text-xs space-y-1">
                          <div className="text-green-300">{r.route}</div>
                          <div className="text-gray-400 truncate">{String(r.payload)}</div>
                          <div className="text-gray-600">
                            {new Date(r.timestamp * 1000).toLocaleTimeString()} · p{r.priority}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!busStatus && (
                <div className="text-gray-500 text-sm text-center py-8">
                  Send a message to see bus activity here.
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Scheduler tab ── */}
        {activeTab === "scheduler" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <Card className="bg-gray-900/60 border-gray-700 p-5 space-y-4">
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-yellow-400" /> Schedule Instruction
              </h2>
              <p className="text-xs text-gray-500">
                Instructions are queued in a priority heap. Lower number = dispatched first.
                Dispatch pops the top item and routes it through the coordinator.
              </p>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">Agent ID</label>
                <Input
                  data-testid="input-sched-agent"
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                  placeholder="Agent to receive the instruction"
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">Payload</label>
                <Textarea
                  data-testid="input-sched-payload"
                  value={schedPayload}
                  onChange={e => setSchedPayload(e.target.value)}
                  placeholder="Instruction or command to schedule…"
                  className="bg-gray-800 border-gray-600 text-white h-20 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400">Priority (1 = highest, 10 = lowest)</label>
                <Input
                  data-testid="input-sched-priority"
                  type="number"
                  min="1" max="10"
                  value={schedPriority}
                  onChange={e => setSchedPriority(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white w-24"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  data-testid="button-schedule"
                  onClick={handleSchedule}
                  disabled={!agentId.trim() || !schedPayload.trim() || scheduleMut.isPending}
                  className="flex-1 bg-yellow-700 hover:bg-yellow-600 text-white"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {scheduleMut.isPending ? "Scheduling…" : "Add to Queue"}
                </Button>
                <Button
                  data-testid="button-dispatch"
                  onClick={() => dispatchMut.mutate()}
                  disabled={dispatchMut.isPending || queueDepth === 0}
                  className="flex-1 bg-green-700 hover:bg-green-600 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {dispatchMut.isPending ? "Dispatching…" : `Dispatch Next (${queueDepth})`}
                </Button>
              </div>

              {scheduleMut.data && !scheduleMut.data.error && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-xs">
                  <div className="text-yellow-300">Scheduled at priority {scheduleMut.data.priority}</div>
                  <div className="text-gray-400">Queue depth: {scheduleMut.data.queue_depth}</div>
                </div>
              )}

              {dispatchMut.data && !dispatchMut.data.error && dispatchMut.data.status === "dispatched" && (
                <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-xs space-y-1">
                  <div className="text-green-300 font-mono">{dispatchMut.data.display}</div>
                  <div className="text-gray-400">Payload: {String(dispatchMut.data.payload)}</div>
                </div>
              )}
              {dispatchMut.data?.status === "empty" && (
                <div className="p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500">
                  Queue is empty — nothing to dispatch.
                </div>
              )}
            </Card>

            {/* Coordinator architecture diagram */}
            <Card className="bg-gray-900/60 border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-200 mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" /> WNSPCoordinator Architecture
              </h2>
              <div className="font-mono text-xs space-y-1 text-gray-300">
                <div className="text-cyan-300">WNSPCoordinator</div>
                {[
                  ["Agent Registry",    "name → PsiChannel mapping"],
                  ["Channel Allocator", "SHA256 byte allocation, collision-free"],
                  ["Router",            "payload → Ψ_channel dispatch"],
                  ["Scheduler",         "priority heap, lowest first"],
                  ["Runtime Monitor",   "per-agent stats + route log"],
                ].map(([name, desc], i, arr) => (
                  <div key={name} className="flex gap-2 pl-2">
                    <span className="text-gray-600">{i < arr.length - 1 ? "├──" : "└──"}</span>
                    <span>
                      <span className="text-yellow-300">{name}</span>
                      <span className="text-gray-500 ml-2">— {desc}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-3 font-bold">Channel Allocation Algorithm</div>
                <div className="font-mono text-xs bg-gray-800/60 rounded p-3 space-y-1 text-gray-300">
                  <div className="text-gray-500">h = SHA256(agent_id)</div>
                  <div>wdm = <span className="text-blue-300">h[0]</span> % 256</div>
                  <div>oam = <span className="text-green-300">h[1]</span> % 50</div>
                  <div>pol = <span className="text-yellow-300">h[2]</span> % 2</div>
                  <div className="text-gray-500 mt-2">while (wdm, oam, pol) in used:</div>
                  <div className="pl-4">wdm = (wdm + 1) % 256</div>
                  <div className="text-cyan-300 mt-2">→ Ψ(wdm, oam, H/V, dir)</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-2">SHA256-derived allocations (live)</div>
                <div className="space-y-1 font-mono text-xs">
                  {[
                    ["vision_ai",   "Ψ(212, 10, H)"],
                    ["planner_ai",  "Ψ(6, 7, H)"],
                    ["os_kernel",   "Ψ(20, 39, H)"],
                    ["speech_ai",   "Ψ(164, 45, V)"],
                  ].map(([name, ch]) => (
                    <div key={name} className="flex justify-between items-center">
                      <span className="text-gray-400">{name}</span>
                      <PsiBadge notation={ch} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── SE Simulation tab ── */}
        {activeTab === "simulation" && (
          <div className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-cyan-400" /> SE Frame Simulation
              </h2>
              <div className="flex gap-3 mb-4">
                <Input
                  data-testid="input-sim-content"
                  value={simContent}
                  onChange={e => setSimContent(e.target.value)}
                  placeholder="Text to encode…"
                  className="bg-gray-800 border-gray-600 text-white flex-1"
                />
                <Button
                  data-testid="button-simulate"
                  onClick={() => simMut.mutate({ content: simContent })}
                  disabled={simMut.isPending}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  <Zap className="w-4 h-4 mr-1" />
                  {simMut.isPending ? "Running…" : "Simulate"}
                </Button>
              </div>

              {simMut.data && !simMut.data.error && (
                <div className="space-y-4">
                  {/* ── Stats ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Chars",      value: simMut.data.chars },
                      { label: "SE Frames",  value: simMut.data.frames },
                      { label: "Orthogonal", value: simMut.data.orthogonality_valid ? "✓ YES" : "✗ NO",
                        color: simMut.data.orthogonality_valid ? "text-green-300" : "text-red-300" },
                      { label: "Coherence γ", value: simMut.data.coherence_gamma?.toFixed(4) ?? "—",
                        color: simMut.data.coherence_valid ? "text-green-300" : "text-amber-300" },
                    ].map(s => (
                      <div key={s.label} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-xs text-gray-400">{s.label}</div>
                        <div className={`text-lg font-bold ${(s as any).color ?? "text-white"}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── PSQ Token + Energy ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                      <div className="text-xs text-gray-400 mb-1">Phase Sequence Token</div>
                      <div className="text-cyan-300 font-mono text-[10px] break-all">{simMut.data.psq_token ?? "—"}</div>
                    </div>
                    <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-gray-400">Total Energy</div>
                      <div className="text-purple-300 font-mono text-sm">{simMut.data.total_energy_joules?.toExponential(4)} J</div>
                    </div>
                    <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-gray-400">Total Λ mass (Λ=hf/c²)</div>
                      <div className="text-purple-300 font-mono text-sm">{simMut.data.total_lambda_mass_kg?.toExponential(4)} kg</div>
                    </div>
                  </div>

                  {/* ── WASCII Spectral Frames (per character) ── */}
                  {simMut.data.spectral_frames?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-400 font-mono text-[9px]">WASCII</span>
                        Per-character WnspFrames — WNSP-SE v1.0 canonical encoding
                      </div>
                      <div className="flex gap-1 flex-wrap mb-3">
                        {simMut.data.spectral_frames.map((f: any, i: number) => {
                          const nm = f.wavelength_nm;
                          const hue = Math.round(270 - ((Math.min(Math.max(nm, 380), 780) - 380) / 400) * 270);
                          const bg = nm >= 350 && nm <= 780
                            ? `hsl(${hue}, 80%, 45%)`
                            : nm < 350 ? "#4a1580" : "#1a1a2e";
                          return (
                            <div
                              key={i}
                              className="w-7 h-7 rounded border border-white/10 flex items-center justify-center text-[9px] font-bold text-white cursor-default"
                              style={{ background: bg }}
                              title={`sync=0xAA | '${f.symbol}' → ${nm}nm | chk=${f.checksum} | wascii=${f.wascii_defined}`}
                            >
                              {f.symbol === " " ? "·" : f.symbol}
                            </div>
                          );
                        })}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-700 text-gray-400">
                              <th className="py-2 text-left">sync</th>
                              <th className="py-2 text-left">char</th>
                              <th className="py-2 text-left">λ (nm)</th>
                              <th className="py-2 text-left">f (Hz)</th>
                              <th className="py-2 text-left">E (J)</th>
                              <th className="py-2 text-left">chk</th>
                              <th className="py-2 text-left">bit</th>
                              <th className="py-2 text-left">WASCII</th>
                            </tr>
                          </thead>
                          <tbody>
                            {simMut.data.spectral_frames.map((f: any, i: number) => (
                              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                                <td className="py-1 font-mono text-green-400">0xAA</td>
                                <td className="py-1 font-mono text-cyan-300">{f.symbol === " " ? "·" : f.symbol}</td>
                                <td className="py-1 text-white">{f.wavelength_nm?.toFixed(1)}</td>
                                <td className="py-1 text-gray-400">{f.frequency_hz?.toExponential(3)}</td>
                                <td className="py-1 text-gray-400">{f.energy_joules?.toExponential(2)}</td>
                                <td className="py-1 text-amber-300">{f.checksum}</td>
                                <td className="py-1 text-gray-500">{f.payload_bit}</td>
                                <td className="py-1">{f.wascii_defined ? <span className="text-green-400">✓</span> : <span className="text-gray-500">~</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Dual-wavelength channel occupation ── */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Hilbert-Space Channel Occupation (dual-wavelength packing)</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-700 text-gray-400">
                            <th className="py-2 text-left">Frame</th>
                            <th className="py-2 text-left">Symbols</th>
                            <th className="py-2 text-left">λ start</th>
                            <th className="py-2 text-left">λ end</th>
                            <th className="py-2 text-left">WDM</th>
                            <th className="py-2 text-left">OAM</th>
                            <th className="py-2 text-left">Pol</th>
                            <th className="py-2 text-left">Energy (J)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simMut.data.channel_occupation?.map((f: any) => (
                            <tr key={f.frame_index} className="border-b border-gray-800 hover:bg-gray-800/30"
                              data-testid={`frame-row-${f.frame_index}`}>
                              <td className="py-1.5 text-gray-300">{f.frame_index}</td>
                              <td className="py-1.5 font-mono text-cyan-300">[{f.symbols?.join("")}]</td>
                              <td className="py-1.5 text-gray-300">{f.wavelength_start_nm?.toFixed(1)}</td>
                              <td className="py-1.5 text-gray-300">{f.wavelength_end_nm?.toFixed(1)}</td>
                              <td className="py-1.5 text-blue-300">{f.wdm_i_start}</td>
                              <td className="py-1.5 text-green-300">{f.oam_j}</td>
                              <td className="py-1.5 text-yellow-300">{f.polarisation}</td>
                              <td className="py-1.5 text-gray-400">{f.energy_joules?.toExponential(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Orthogonality tab ── */}
        {activeTab === "orthogonality" && (
          <div className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700 p-5">
              <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-green-400" /> Hilbert Space Orthogonality Proof
              </h2>
              <p className="text-gray-400 text-xs mb-4">
                Validates ⟨Ψ_i | Ψ_j⟩ = 0 for all i ≠ j across the 51,200-dimensional channel space.
              </p>

              {orthoData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "dim(H)",      value: orthoData.hilbert_dim?.toLocaleString(), color: "text-cyan-300" },
                      { label: "WDM |λ_i⟩",  value: orthoData.dim_wdm, color: "text-blue-300" },
                      { label: "OAM |OAM_j⟩", value: orthoData.dim_oam, color: "text-green-300" },
                      { label: "Pol |Pol_k⟩", value: orthoData.dim_pol, color: "text-yellow-300" },
                    ].map(s => (
                      <div key={s.label} className="p-3 bg-gray-800/50 rounded-lg text-center">
                        <div className="text-xs text-gray-400">{s.label}</div>
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg flex items-center gap-3">
                    {orthoData.sample_validated
                      ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      : <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                    <div>
                      <div className="text-green-300 font-medium">
                        {orthoData.sample_validated ? "Orthogonality validated" : "Validation failed"}
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">{orthoData.proof}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-800/50 rounded-lg font-mono text-sm text-center">
                    <span className="text-cyan-300">{orthoData.channel_basis}</span>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-2">Sample channels ({orthoData.sample_size} sampled)</div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto">
                      {orthoData.sample_channels?.map((c: any) => (
                        <div key={c.index} data-testid={`ortho-channel-${c.index}`}
                          className="flex items-center gap-2 p-2 bg-gray-800/40 rounded text-xs">
                          <WavelengthSwatch nm={380 + (c.wdm_i / 255) * 400} />
                          <span className="text-gray-400 w-6">{c.index}</span>
                          <span className="text-gray-300 font-mono flex-1">{c.basis}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Runtime Monitor tab ── */}
        {activeTab === "monitor" && (
          <div className="space-y-4">
            <Card className="bg-gray-900/60 border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-green-400" /> Runtime Monitor — Route Log
                </h2>
                <Button
                  data-testid="button-refresh-log"
                  onClick={() => refetchLog()}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:text-white h-8 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>

              {/* Per-agent stats */}
              {agents.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-2">Agent Telemetry</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agents.map(([id, info]: [string, any]) => {
                      const ch = info.channel ?? {};
                      return (
                        <div key={id} className="p-2 bg-gray-800/40 rounded text-xs flex items-center gap-2">
                          <WavelengthSwatch nm={ch.wavelength_nm ?? 555} />
                          <span className="text-gray-200 font-medium">{id}</span>
                          <PsiBadge notation={ch.notation ?? "Ψ(…)"} />
                          <span className="text-gray-500 ml-auto">{info.routed_count ?? 0} routed</span>
                          <span className="text-gray-600">{info.uptime_s?.toFixed(0)}s</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Route log */}
              <div className="text-xs text-gray-400 mb-2">
                Routing Log ({logData?.total ?? 0} total, showing last 30)
              </div>
              {logData?.log?.length === 0 && (
                <div className="text-gray-500 text-sm text-center py-6">
                  No routing activity yet. Map an instruction to see events here.
                </div>
              )}
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto font-mono">
                {[...(logData?.log ?? [])].reverse().map((entry: any, i: number) => (
                  <div key={i} data-testid={`log-entry-${i}`}
                    className="p-2 bg-gray-800/40 rounded border border-gray-700/50 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-400">▶</span>
                      <span className="text-gray-300 font-medium">{entry.agent}</span>
                      <PsiBadge notation={entry.channel?.notation ?? "Ψ(…)"} />
                      <span className="text-gray-600 ml-auto">
                        {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-400 pl-4 truncate">{String(entry.payload)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-gray-600 text-center font-mono">
          WNSPCoordinator &nbsp;·&nbsp; WNSP-CE v1.0 → WNSP-SE v1.0 &nbsp;·&nbsp; Λ = hf/c² &nbsp;·&nbsp; AGPL-3.0
        </div>
      </div>
    </div>
  );
}
