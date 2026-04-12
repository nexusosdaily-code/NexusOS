import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Radio, Wifi, Plus, Zap, Eye, RefreshCw, Atom, Globe, Activity
} from "lucide-react";
import { getAuthHeaders } from "@/lib/queryClient";

// ── Physics helpers ───────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}

function nmToband(nm: number): string {
  if (nm < 450) return "VIOLET";
  if (nm < 495) return "BLUE";
  if (nm < 520) return "CYAN";
  if (nm < 565) return "GREEN";
  if (nm < 590) return "YELLOW";
  if (nm < 625) return "ORANGE";
  return "RED";
}

function ceEncode(name: string): { nm: number; thz: number; psi: string; band: string } {
  if (!name) return { nm: 580, thz: 517, psi: "Ψ(100,0,H)", band: "YELLOW" };
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = 380 + ((avg - 32) / 94) * 400;
  const thz = parseFloat((299792458 / (nm * 1e-9) / 1e12).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 100;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm: parseFloat(nm.toFixed(2)), thz, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToband(nm) };
}

function fmtBeacon(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

interface Node {
  id: string;
  nodeKey: string;
  name: string;
  purpose?: string;
  wavelengthNm: string;
  frequencyThz: string;
  psiChannel: string;
  emissionBand: string;
  status: string;
  endpoint?: string;
  capabilities: string[];
  lastBeaconAt: string;
  createdAt: string;
}

export default function NetworkPage() {
  const qc = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ name: "", purpose: "", endpoint: "", capabilities: "" });
  const [preview, setPreview] = useState<ReturnType<typeof ceEncode> | null>(null);

  const { data, isLoading, dataUpdatedAt } = useQuery<{ nodes: Node[]; total: number; active: number }>({
    queryKey: ["/api/network/nodes"],
    refetchInterval: 8_000,
  });

  const registerMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/network/nodes/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setShowRegister(false);
      setForm({ name: "", purpose: "", endpoint: "", capabilities: "" });
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["/api/network/nodes"] });
    },
  });

  const beaconMutation = useMutation({
    mutationFn: async (nodeKey: string) => {
      const res = await fetch(`/api/network/nodes/${nodeKey}/beacon`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/network/nodes"] }),
  });

  const nodes: Node[] = data?.nodes ?? [];

  // Spectrum position for each node
  const spectrumNodes = nodes.map(n => ({
    ...n,
    pct: ((parseFloat(n.wavelengthNm) - 380) / 400) * 100,
  }));

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-emerald-400" />
            <span className="text-sm font-bold tracking-wider text-emerald-400">SPECTRAL NETWORK</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">Node visibility via CE→SE emission · Λ=hf/c²</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/20 text-[9px]">
            {data ? `${data.active} active · ${data.total} total` : "Loading…"}
          </span>
          <button onClick={() => qc.invalidateQueries({ queryKey: ["/api/network/nodes"] })}
            className="text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => setShowRegister(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-400/50 transition-all text-[10px]"
            data-testid="button-register-node"
          >
            <Plus size={10} /> Register node
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Register form */}
        {showRegister && (
          <div className="border border-emerald-400/20 rounded-xl p-5" style={{ background: "rgba(52,211,153,0.03)" }}>
            <div className="text-emerald-400/60 text-[10px] uppercase tracking-widest mb-4">Register Your Node</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-white/30 text-[9px] uppercase tracking-widest block mb-1">Node name *</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-emerald-400/40"
                    placeholder="e.g. MyDataNode, AuthService, MediaHub"
                    value={form.name}
                    onChange={e => {
                      setForm(f => ({ ...f, name: e.target.value }));
                      setPreview(e.target.value ? ceEncode(e.target.value) : null);
                    }}
                    data-testid="input-node-name"
                  />
                </div>
                <div>
                  <label className="text-white/30 text-[9px] uppercase tracking-widest block mb-1">Purpose</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-white/20"
                    placeholder="What does this node do?"
                    value={form.purpose}
                    onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                    data-testid="input-node-purpose"
                  />
                </div>
                <div>
                  <label className="text-white/30 text-[9px] uppercase tracking-widest block mb-1">Endpoint (optional)</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-white/20"
                    placeholder="https://mynode.example.com"
                    value={form.endpoint}
                    onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                    data-testid="input-node-endpoint"
                  />
                </div>
                <div>
                  <label className="text-white/30 text-[9px] uppercase tracking-widest block mb-1">Capabilities (comma-separated)</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-white/20"
                    placeholder="messaging, storage, compute"
                    value={form.capabilities}
                    onChange={e => setForm(f => ({ ...f, capabilities: e.target.value }))}
                    data-testid="input-node-capabilities"
                  />
                </div>
              </div>

              {/* CE→SE preview */}
              <div className="border border-white/5 rounded-xl p-4 flex flex-col justify-between" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-white/30 text-[9px] uppercase tracking-widest mb-3">CE→SE Preview</div>
                {preview ? (
                  <div className="space-y-3">
                    <div className="h-3 rounded-full w-full" style={{ background: `linear-gradient(to right, ${nmToColor(preview.nm - 20)}, ${nmToColor(preview.nm)}, ${nmToColor(preview.nm + 20)})` }} />
                    <div className="space-y-1.5">
                      {[
                        { label: "Wavelength", value: `${preview.nm}nm`, color: nmToColor(preview.nm) },
                        { label: "Frequency",  value: `${preview.thz} THz`, color: "#a78bfa" },
                        { label: "Ψ Channel",  value: preview.psi, color: "#06b6d4" },
                        { label: "Band",       value: preview.band, color: nmToColor(preview.nm) },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-white/30 text-[9px]">{label}</span>
                          <span className="text-[10px] font-bold" style={{ color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Spectral URI preview */}
                    <div className="border border-white/8 rounded-lg px-2.5 py-2 space-y-0.5" style={{ background: "rgba(0,0,0,0.3)" }}>
                      <div className="text-white/20 text-[8px] uppercase tracking-wider">Spectral URI</div>
                      <div className="font-mono text-[9px] font-bold truncate" style={{ color: nmToColor(preview.nm) }}>
                        wnsp://{preview.psi}/{form.name.toLowerCase().replace(/[^a-z0-9]/g, "-") || "node"}
                      </div>
                    </div>
                    <div className="text-white/20 text-[9px] leading-relaxed">
                      This node will be visible to other nodes listening in the {preview.band.toLowerCase()} band of the spectrum.
                    </div>
                  </div>
                ) : (
                  <div className="text-white/15 text-[10px] text-center py-6">
                    Type a node name to see its spectral address
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  if (!form.name) return;
                  const caps = form.capabilities.split(",").map(s => s.trim()).filter(Boolean);
                  registerMutation.mutate({
                    name: form.name,
                    purpose: form.purpose || undefined,
                    endpoint: form.endpoint || undefined,
                    capabilities: caps,
                  });
                }}
                disabled={!form.name || registerMutation.isPending}
                className="px-4 py-2 rounded-lg border border-emerald-400/40 text-emerald-400 text-[11px] font-bold hover:border-emerald-400/70 disabled:opacity-40 transition-all"
                data-testid="button-submit-node"
              >
                {registerMutation.isPending ? "Registering…" : "Register & Emit"}
              </button>
              <button onClick={() => setShowRegister(false)} className="text-white/30 text-[10px] hover:text-white/50">Cancel</button>
              {registerMutation.isError && (
                <span className="text-red-400 text-[10px]">{(registerMutation.error as Error).message}</span>
              )}
            </div>
          </div>
        )}

        {/* Spectrum visibility bar */}
        <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Eye size={11} /> Spectrum Visibility — Active Nodes by Emission Wavelength
          </div>

          {/* Spectrum gradient bar */}
          <div className="relative h-12 rounded-lg overflow-visible mb-6" style={{
            background: "linear-gradient(to right, #8b00ff, #6600cc, #0044ff, #00aaff, #00cc44, #aacc00, #ffaa00, #ff3300)"
          }}>
            {/* Node indicators */}
            {spectrumNodes.map(node => {
              const col = nmToColor(parseFloat(node.wavelengthNm));
              const isActive = node.status === "active";
              return (
                <div
                  key={node.id}
                  className="absolute -top-1 flex flex-col items-center"
                  style={{ left: `${node.pct}%`, transform: "translateX(-50%)" }}
                  title={`${node.name} · ${node.psiChannel} · ${parseFloat(node.wavelengthNm).toFixed(1)}nm`}
                >
                  {/* Emission glow */}
                  <div className={`w-3 h-3 rounded-full border-2 border-white/60 ${isActive ? "animate-pulse" : "opacity-40"}`}
                    style={{ background: col, boxShadow: isActive ? `0 0 8px ${col}` : "none" }} />
                  {/* Downward line */}
                  <div className="w-px h-4" style={{ background: col + "80" }} />
                </div>
              );
            })}
          </div>

          {/* Wavelength ruler */}
          <div className="flex justify-between text-[8px] text-white/20 -mt-2">
            <span>380nm · VIOLET</span>
            <span>450nm · BLUE</span>
            <span>530nm · GREEN</span>
            <span>590nm · YELLOW</span>
            <span>625nm · ORANGE</span>
            <span>780nm · RED</span>
          </div>
        </div>

        {/* Node list */}
        {isLoading && (
          <div className="text-white/20 text-[11px] text-center py-16 animate-pulse">Scanning spectral bands…</div>
        )}

        {!isLoading && nodes.length === 0 && (
          <div className="border border-white/5 rounded-xl p-10 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
            <Globe size={28} className="text-white/10 mx-auto mb-3" />
            <div className="text-white/30 text-sm font-bold mb-1">No nodes visible yet</div>
            <div className="text-white/15 text-[11px] leading-relaxed max-w-sm mx-auto">
              Register your node above. Once registered it will emit at its CE→SE wavelength and become visible to all other nodes on the network.
            </div>
          </div>
        )}

        {nodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {nodes.map(node => {
              const nm = parseFloat(node.wavelengthNm);
              const thz = parseFloat(node.frequencyThz);
              const col = nmToColor(nm);
              const isActive = node.status === "active";
              const caps = Array.isArray(node.capabilities) ? node.capabilities : [];
              return (
                <div key={node.id} className="border rounded-xl p-4 transition-all hover:border-white/20"
                  style={{ borderColor: isActive ? col + "30" : "rgba(255,255,255,0.06)", background: isActive ? col + "06" : "rgba(255,255,255,0.01)" }}
                  data-testid={`node-${node.id}`}>

                  {/* Node header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "animate-pulse" : ""}`}
                        style={{ background: isActive ? col : "#374151", boxShadow: isActive ? `0 0 6px ${col}` : "none" }} />
                      <div>
                        <div className="text-[11px] font-bold" style={{ color: isActive ? col : "#6b7280" }}>{node.name}</div>
                        <div className="text-[9px] text-white/30">{node.psiChannel}</div>
                      </div>
                    </div>
                    <div className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: col + "15", color: col }}>
                      {node.emissionBand}
                    </div>
                  </div>

                  {/* Spectral URI */}
                  <div className="flex items-center gap-1.5 mb-2.5 px-2 py-1.5 rounded-lg border border-white/6" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <Radio size={8} style={{ color: col }} className="flex-shrink-0" />
                    <span className="font-mono text-[8px] truncate" style={{ color: col + "cc" }}>
                      {node.psiChannel ? `wnsp://${node.psiChannel}/${node.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : "—"}
                    </span>
                  </div>

                  {/* Emission bar */}
                  <div className="h-1 rounded-full mb-3" style={{
                    background: `linear-gradient(to right, ${nmToColor(nm - 30)}, ${col}, ${nmToColor(nm + 30)})`
                  }} />

                  {/* Physics */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "λ emission", value: `${nm.toFixed(1)}nm`, color: col },
                      { label: "Frequency",  value: `${thz} THz`,         color: "#a78bfa" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="border border-white/5 rounded-lg px-2 py-1.5">
                        <div className="text-[8px] text-white/30">{label}</div>
                        <div className="text-[10px] font-bold" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Purpose */}
                  {node.purpose && (
                    <div className="text-[9px] text-white/30 mb-2 leading-relaxed">{node.purpose}</div>
                  )}

                  {/* Capabilities */}
                  {caps.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {caps.map(cap => (
                        <span key={cap} className="text-[8px] px-1.5 py-0.5 rounded-full border border-white/10 text-white/40">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white/20 text-[8px]">
                      <Activity size={8} />
                      <span>beacon {fmtBeacon(node.lastBeaconAt)}</span>
                    </div>
                    <button
                      onClick={() => beaconMutation.mutate(node.nodeKey)}
                      className="flex items-center gap-1 text-[8px] px-2 py-1 rounded border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-all"
                      data-testid={`button-beacon-${node.id}`}
                    >
                      <Zap size={8} /> Beacon
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Foundation note */}
        <div className="border border-amber-400/10 rounded-xl p-5 text-center" style={{ background: "rgba(251,191,36,0.02)" }}>
          <div className="text-amber-400/50 text-[9px] uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
            <Atom size={9} /> Layer 0 Substrate · November 2025 · AGPL-3.0
          </div>
          <div className="text-white/25 text-[10px] leading-relaxed max-w-lg mx-auto">
            Each node's name is CE→SE encoded to produce its emission wavelength. Nodes become visible by emitting at that frequency.
            No central registry. No IP allocation. The name of a node <em className="text-white/40">is</em> its address, derived from physics.
          </div>
        </div>
      </div>
    </div>
  );
}
