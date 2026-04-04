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

async function get(path: string) {
  const r = await fetch(API(path));
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

export default function WNSPCoordinator() {
  const qc = useQueryClient();

  const [agentId, setAgentId]     = useState("");
  const [intent, setIntent]       = useState("inference");
  const [instruction, setInstruction] = useState("");
  const [simContent, setSimContent]   = useState("Hello Lambda");
  const [activeTab, setActiveTab]     = useState<"agents" | "simulation" | "orthogonality">("agents");

  const { data: agentStatus } = useQuery({
    queryKey: ["agent-status"],
    queryFn:  () => get("/api/wnsp/agent/status"),
    refetchInterval: 3000,
  });

  const { data: orthoData } = useQuery({
    queryKey: ["orthogonality"],
    queryFn:  () => get("/api/wnsp/se/orthogonality"),
    enabled:  activeTab === "orthogonality",
  });

  const allocateMut = useMutation({
    mutationFn: (body: { agent_id: string; intent: string }) =>
      post("/api/wnsp/agent/allocate", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-status"] }),
  });

  const mapMut = useMutation({
    mutationFn: (body: { agent_id: string; instruction: string }) =>
      post("/api/wnsp/agent/map", body),
  });

  const releaseMut = useMutation({
    mutationFn: (body: { agent_id: string }) =>
      post("/api/wnsp/agent/release", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-status"] }),
  });

  const simMut = useMutation({
    mutationFn: (body: { content: string }) =>
      post("/api/wnsp/se/simulate", body),
  });

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

  const agents    = Object.entries(agentStatus?.agents ?? {}) as [string, any][];
  const occupied  = agentStatus?.occupied_channels ?? 0;
  const available = agentStatus?.available_channels ?? 25600;
  const total     = agentStatus?.total_channels ?? 25600;

  const tabClass = (t: string) =>
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
              Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩ &nbsp;·&nbsp; 25,600 orthogonal channels &nbsp;·&nbsp; ⟨Ψ_i | Ψ_j⟩ = 0
            </p>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
            <Activity className="w-3 h-3" /> WNSP-SE v1.0
          </Badge>
        </div>

        {/* Hilbert utilisation overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">Allocated</div>
            <div className="text-2xl font-bold text-cyan-300">{occupied.toLocaleString()}</div>
            <ChannelBar value={occupied} max={total} color="bg-cyan-500" />
          </Card>
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">Available</div>
            <div className="text-2xl font-bold text-green-300">{available.toLocaleString()}</div>
            <ChannelBar value={available} max={total} color="bg-green-500" />
          </Card>
          <Card className="bg-gray-900/60 border-gray-700 p-4">
            <div className="text-xs text-gray-400 mb-1">Hilbert dim(H)</div>
            <div className="text-2xl font-bold text-purple-300">25,600</div>
            <div className="text-xs text-gray-500 mt-1">256 × 50 × 2</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button className={tabClass("agents")}       onClick={() => setActiveTab("agents")}>Agents</button>
          <button className={tabClass("simulation")}   onClick={() => setActiveTab("simulation")}>SE Simulation</button>
          <button className={tabClass("orthogonality")} onClick={() => setActiveTab("orthogonality")}>Orthogonality</button>
        </div>

        {/* ── Agents tab ── */}
        {activeTab === "agents" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Allocate panel */}
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
                  placeholder="e.g. gpt-4-router, llama-inference-1"
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
                <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg text-xs space-y-1">
                  <div className="text-cyan-300 font-mono">{allocateMut.data.channel_basis}</div>
                  <div className="text-gray-400">λ = {allocateMut.data.wavelength_nm?.toFixed(1)} nm &nbsp;·&nbsp;
                    WDM_{allocateMut.data.wdm_i} / OAM_{allocateMut.data.oam_j} / Pol_{allocateMut.data.polarisation}</div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                    {allocateMut.data.status === "existing" ? "Existing channel returned" : "New channel allocated"}
                  </Badge>
                </div>
              )}

              {/* Map instruction */}
              <div className="pt-2 border-t border-gray-700 space-y-2">
                <h3 className="text-xs font-bold text-gray-300 flex items-center gap-1">
                  <Send className="w-3 h-3 text-purple-400" /> Map AI Instruction to Channel
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
                  {mapMut.isPending ? "Mapping…" : "Map → CE → SE → Ψ_channel"}
                </Button>

                {mapMut.data && !mapMut.data.error && (
                  <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-xs space-y-1">
                    <div className="text-purple-300">{mapMut.data.frame_count} SE frames generated</div>
                    <div className="text-gray-400 font-mono">Channel #{mapMut.data.channel?.channel_index}</div>
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
                <Layers className="w-4 h-4 text-cyan-400" /> Active Agents ({agents.length})
              </h2>

              {agents.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">
                  No agents allocated yet. Allocate one on the left.
                </div>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {agents.map(([id, info]: [string, any]) => (
                    <div
                      key={id}
                      data-testid={`agent-card-${id}`}
                      className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <WavelengthSwatch nm={info.wavelength_nm} />
                          <span className="text-white text-sm font-medium">{id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                            #{info.channel_index}
                          </Badge>
                          <button
                            data-testid={`button-release-${id}`}
                            onClick={() => handleRelease(id)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 font-mono mb-1">{info.channel_basis}</div>
                      <div className="grid grid-cols-3 gap-1 text-xs">
                        <div className="text-gray-500">WDM <span className="text-gray-200">{info.wdm_i}</span></div>
                        <div className="text-gray-500">OAM <span className="text-gray-200">{info.oam_j}</span></div>
                        <div className="text-gray-500">Pol <span className="text-gray-200">{info.polarisation}</span></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {info.wavelength_nm?.toFixed(1)} nm &nbsp;·&nbsp; {info.intent} &nbsp;·&nbsp; {info.frame_count} frames
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Chars",    value: simMut.data.chars },
                      { label: "Frames",   value: simMut.data.frames },
                      { label: "Packing",  value: `${simMut.data.packing_ratio?.toFixed(2)} char/frame` },
                      { label: "Orthogonal", value: simMut.data.orthogonality_valid ? "✓ YES" : "✗ NO",
                        color: simMut.data.orthogonality_valid ? "text-green-300" : "text-red-300" },
                    ].map(s => (
                      <div key={s.label} className="p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-xs text-gray-400">{s.label}</div>
                        <div className={`text-lg font-bold ${s.color ?? "text-white"}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Total energy / mass */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-gray-400">Total Energy</div>
                      <div className="text-purple-300 font-mono">{simMut.data.total_energy_joules?.toExponential(4)} J</div>
                    </div>
                    <div className="p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
                      <div className="text-xs text-gray-400">Total Λ mass (Λ = hf/c²)</div>
                      <div className="text-purple-300 font-mono">{simMut.data.total_lambda_mass_kg?.toExponential(4)} kg</div>
                    </div>
                  </div>

                  {/* Per-frame table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="py-2 text-left">Frame</th>
                          <th className="py-2 text-left">Symbols</th>
                          <th className="py-2 text-left">λ start (nm)</th>
                          <th className="py-2 text-left">λ end (nm)</th>
                          <th className="py-2 text-left">WDM_i</th>
                          <th className="py-2 text-left">OAM_j</th>
                          <th className="py-2 text-left">Pol</th>
                          <th className="py-2 text-left">Ch start</th>
                          <th className="py-2 text-left">Energy (J)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simMut.data.channel_occupation?.map((f: any) => (
                          <tr key={f.frame_index} className="border-b border-gray-800 hover:bg-gray-800/30" data-testid={`frame-row-${f.frame_index}`}>
                            <td className="py-1.5 text-gray-300">{f.frame_index}</td>
                            <td className="py-1.5 font-mono text-cyan-300">[{f.symbols?.join("")}]</td>
                            <td className="py-1.5 text-gray-300">{f.wavelength_start_nm?.toFixed(1)}</td>
                            <td className="py-1.5 text-gray-300">{f.wavelength_end_nm?.toFixed(1)}</td>
                            <td className="py-1.5 text-blue-300">{f.wdm_i_start}</td>
                            <td className="py-1.5 text-green-300">{f.oam_j}</td>
                            <td className="py-1.5 text-yellow-300">{f.polarisation}</td>
                            <td className="py-1.5 text-purple-300">{f.channel_start}</td>
                            <td className="py-1.5 text-gray-400">{f.energy_joules?.toExponential(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Wavelength heat-strip */}
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Channel Wavelength Strip (per frame)</div>
                    <div className="flex gap-0.5 flex-wrap">
                      {simMut.data.channel_occupation?.map((f: any) => {
                        const hue = Math.round(270 - ((f.wavelength_start_nm - 380) / 400) * 270);
                        return (
                          <div
                            key={f.frame_index}
                            className="w-6 h-6 rounded-sm border border-white/10 flex items-center justify-center text-[9px] text-white/60"
                            style={{ background: `hsl(${hue}, 80%, 45%)` }}
                            title={`Frame ${f.frame_index}: λ=${f.wavelength_start_nm?.toFixed(0)}nm Ch#${f.channel_start}`}
                          >
                            {f.frame_index}
                          </div>
                        );
                      })}
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
                Validates ⟨Ψ_i | Ψ_j⟩ = 0 for all i ≠ j across the 25,600-dimensional channel space.
              </p>

              {orthoData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "dim(H)",  value: orthoData.hilbert_dim?.toLocaleString(), color: "text-cyan-300" },
                      { label: "WDM |λ_i⟩", value: orthoData.dim_wdm, color: "text-blue-300" },
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
                    <div className="text-xs text-gray-400 mb-2">Sample channels ({orthoData.sample_size} sampled, 10 shown)</div>
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

        {/* Footer */}
        <div className="text-xs text-gray-600 text-center font-mono">
          WNSP-CE v1.0 → WNSP-SE v1.0 &nbsp;·&nbsp; Λ = hf/c² &nbsp;·&nbsp; AGPL-3.0
        </div>
      </div>
    </div>
  );
}
