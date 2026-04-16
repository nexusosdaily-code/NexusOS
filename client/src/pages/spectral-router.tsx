import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Radio, Zap, Send, Activity, Globe, Wifi } from "lucide-react";

function nmToColor(nm: number): string {
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
function ceEncode(name: string): { nm: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToBand(nm) };
}

interface Node {
  id: string; nodeKey: string; name: string; wavelengthNm: string; frequencyThz: string;
  psiChannel: string; emissionBand: string; status: string; endpoint?: string;
}

interface Hop {
  step: number;
  from: string;
  to: string;
  nm: number;
  psi: string;
  action: string;
  deltaLambda: number;
}

interface PacketLog {
  id: string;
  ts: string;
  destPsi: string;
  destNm: number;
  payload: string;
  hops: Hop[];
  delivered: boolean;
  finalNode?: string;
}

function routePacket(destNm: number, destPsi: string, payload: string, nodes: Node[]): PacketLog {
  const active = nodes.filter(n => n.status === "active");
  const sorted = [...active].sort((a, b) => Math.abs(parseFloat(a.wavelengthNm) - destNm) - Math.abs(parseFloat(b.wavelengthNm) - destNm));
  const hops: Hop[] = [];

  // Simulate routing algorithm — find path via spectral proximity
  hops.push({
    step: 0, from: "ORIGIN", to: "WNSP-ROUTER",
    nm: destNm, psi: destPsi,
    action: `Packet addressed to ${destPsi} · λ=${destNm}nm`,
    deltaLambda: 0,
  });

  if (sorted.length > 0) {
    const nearest = sorted[0];
    const nearNm = parseFloat(nearest.wavelengthNm);
    hops.push({
      step: 1, from: "WNSP-ROUTER", to: nearest.name,
      nm: nearNm, psi: nearest.psiChannel,
      action: `Nearest spectral node: ${nearest.name} · Δλ = ${Math.abs(nearNm - destNm).toFixed(2)}nm`,
      deltaLambda: Math.abs(nearNm - destNm),
    });

    if (sorted.length > 1 && Math.abs(nearNm - destNm) > 5) {
      const second = sorted[1];
      const secNm = parseFloat(second.wavelengthNm);
      hops.push({
        step: 2, from: nearest.name, to: second.name,
        nm: secNm, psi: second.psiChannel,
        action: `Re-emit via ${second.name} · Δλ = ${Math.abs(secNm - destNm).toFixed(2)}nm`,
        deltaLambda: Math.abs(secNm - destNm),
      });
    }

    hops.push({
      step: hops.length, from: sorted[sorted.length > 1 ? 1 : 0].name, to: destPsi,
      nm: destNm, psi: destPsi,
      action: `Delivered to ${destPsi} · payload encoded at λ=${destNm}nm`,
      deltaLambda: 0,
    });
  }

  return {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    ts: new Date().toISOString(),
    destPsi, destNm, payload,
    hops,
    delivered: sorted.length > 0,
    finalNode: sorted[0]?.name,
  };
}

export default function SpectralRouterPage() {
  const [destInput, setDestInput] = useState("ReasoningCore");
  const [payload, setPayload] = useState("Hello from the spectral network");
  const [logs, setLogs] = useState<PacketLog[]>([]);
  const [selected, setSelected] = useState<PacketLog | null>(null);

  const { data } = useQuery<{ nodes: Node[] }>({
    queryKey: ["/api/network/nodes"],
    queryFn: async () => { const r = await fetch("/api/network/nodes"); return r.json(); },
    refetchInterval: 8000,
  });
  const nodes = data?.nodes ?? [];

  const destEnc = destInput.trim() ? ceEncode(destInput) : null;

  function sendPacket() {
    if (!destEnc || !payload.trim()) return;
    const log = routePacket(destEnc.nm, destEnc.psi, payload, nodes);
    setLogs(prev => [log, ...prev].slice(0, 20));
    setSelected(log);
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-emerald-400" />
            <span className="text-sm font-bold tracking-wider text-emerald-400">SPECTRAL ROUTING ENGINE</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">DNS-free packet routing · Ψ-channel addressing · nearest-wavelength delivery</span>
        </div>
        <div className="text-white/20 text-[9px]">{nodes.filter(n => n.status === "active").length} active nodes · {logs.length} packets routed</div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* How it works */}
        <div className="border border-emerald-400/15 rounded-xl p-5" style={{ background: "rgba(52,211,153,0.03)" }}>
          <div className="grid grid-cols-4 gap-4 text-[9px]">
            {[
              { step: "1", label: "Address packet", desc: "Destination = any word. CE→SE encodes it to λ and Ψ channel. No DNS lookup." },
              { step: "2", label: "Find nearest node", desc: "Router scans all registered nodes and finds the one with the smallest Δλ." },
              { step: "3", label: "Hop via spectrum", desc: "Packet hops through nodes ordered by spectral proximity to the target." },
              { step: "4", label: "Deliver at Ψ", desc: "Packet arrives at the final node and is decoded at the target wavelength." },
            ].map(({ step, label, desc }) => (
              <div key={step} className="border border-white/8 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full border border-emerald-400/30 text-emerald-400/60 text-[8px] flex items-center justify-center">{step}</div>
                  <div className="text-emerald-400/70 font-bold">{label}</div>
                </div>
                <div className="text-white/25 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Left: send form + routing table */}
          <div className="col-span-2 space-y-4">
            {/* Packet composer */}
            <div className="border border-emerald-400/20 rounded-xl p-5" style={{ background: "rgba(52,211,153,0.04)" }}>
              <div className="text-emerald-400/60 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Send size={10} /> Compose Spectral Packet
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-white/25 text-[9px] uppercase tracking-widest block mb-1">Destination (any word or name)</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-emerald-400/30"
                    placeholder="e.g. ReasoningCore, Alice, DataNode…"
                    value={destInput}
                    onChange={e => setDestInput(e.target.value)}
                    data-testid="input-dest"
                  />
                </div>

                {destEnc && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Ψ Channel", value: destEnc.psi, color: "#06b6d4" },
                      { label: "λ emission", value: `${destEnc.nm}nm`, color: nmToColor(destEnc.nm) },
                      { label: "Band", value: destEnc.band, color: nmToColor(destEnc.nm) },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="border border-white/5 rounded-lg px-2 py-1.5">
                        <div className="text-[7px] text-white/20">{label}</div>
                        <div className="text-[9px] font-bold" style={{ color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {destEnc && (
                  <div className="h-1 rounded-full" style={{ background: `linear-gradient(to right, ${nmToColor(destEnc.nm - 30)}, ${nmToColor(destEnc.nm)}, ${nmToColor(destEnc.nm + 30)})` }} />
                )}

                <div>
                  <label className="text-white/25 text-[9px] uppercase tracking-widest block mb-1">Payload</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white outline-none placeholder-white/20 focus:border-white/20 resize-none"
                    rows={3}
                    placeholder="Message payload…"
                    value={payload}
                    onChange={e => setPayload(e.target.value)}
                    data-testid="input-payload"
                  />
                </div>

                <button
                  onClick={sendPacket}
                  disabled={!destEnc || !payload.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-emerald-400/40 text-emerald-400 font-bold text-[11px] hover:border-emerald-400/70 disabled:opacity-30 transition-all"
                  data-testid="button-send-packet"
                >
                  <Zap size={11} /> Transmit on Ψ Channel
                </button>
              </div>
            </div>

            {/* Routing table */}
            <div className="border border-white/10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/25 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Wifi size={9} /> Live Routing Table — {nodes.length} nodes
              </div>
              {nodes.length === 0 ? (
                <div className="text-white/15 text-[10px] text-center py-4">
                  No nodes registered. <Link href="/network"><span className="text-emerald-400/60 underline cursor-pointer">Register a node</span></Link> to enable routing.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {nodes.map(n => {
                    const nm = parseFloat(n.wavelengthNm);
                    const col = nmToColor(nm);
                    const isActive = n.status === "active";
                    return (
                      <div key={n.id} className="flex items-center gap-2 border border-white/5 rounded-lg px-2 py-1.5" style={{ background: isActive ? col + "05" : "transparent" }}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "animate-pulse" : "opacity-30"}`} style={{ background: col }} />
                        <span className="text-[9px] font-bold flex-1 truncate" style={{ color: isActive ? col : "#6b7280" }}>{n.name}</span>
                        <span className="text-[8px] text-white/30 font-mono">{n.psiChannel}</span>
                        <span className="text-[8px] font-bold" style={{ color: col }}>{nm.toFixed(1)}nm</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: packet trace log */}
          <div className="col-span-3 space-y-4">
            {selected && (
              <div className="border border-emerald-400/20 rounded-xl p-5" style={{ background: "rgba(52,211,153,0.03)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-emerald-400/60 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={10} /> Packet Trace — {selected.id}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold ${selected.delivered ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                      {selected.delivered ? "DELIVERED" : "NO ROUTE"}
                    </span>
                    <span className="text-[8px] text-white/20">{selected.ts.slice(11, 19)}</span>
                  </div>
                </div>

                {/* Route visualization */}
                <div className="space-y-2 mb-4">
                  {selected.hops.map((hop, idx) => {
                    const col = nmToColor(hop.nm);
                    return (
                      <div key={idx}>
                        <div className="flex items-start gap-3 border border-white/5 rounded-lg px-3 py-2.5" style={{ background: col + "08" }}>
                          <div className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[8px] font-bold" style={{ borderColor: col + "60", color: col }}>{hop.step}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[9px] font-bold" style={{ color: col }}>{hop.from}</span>
                              <span className="text-white/25 text-[8px]">→</span>
                              <span className="text-[9px] font-bold text-white/60">{hop.to}</span>
                            </div>
                            <div className="text-[8px] text-white/30">{hop.action}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[9px] font-bold" style={{ color: col }}>{hop.nm}nm</div>
                            {hop.deltaLambda > 0 && <div className="text-[7px] text-white/25">Δλ={hop.deltaLambda.toFixed(2)}nm</div>}
                          </div>
                          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: col }} />
                        </div>
                        {idx < selected.hops.length - 1 && (
                          <div className="ml-5 w-px h-2 bg-white/10" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Payload preview */}
                <div className="border border-white/8 rounded-lg px-3 py-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div className="text-white/20 text-[8px] uppercase tracking-widest mb-1">Payload (encoded at λ={selected.destNm}nm)</div>
                  <div className="text-emerald-300/60 text-[10px] font-mono">{selected.payload}</div>
                </div>
              </div>
            )}

            {/* History */}
            {logs.length > 0 && (
              <div className="border border-white/10 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="text-white/25 text-[9px] uppercase tracking-widest mb-3">Packet History</div>
                <div className="space-y-1.5">
                  {logs.map(log => {
                    const col = nmToColor(log.destNm);
                    return (
                      <button key={log.id} onClick={() => setSelected(log)}
                        className={`w-full flex items-center gap-3 border rounded-lg px-3 py-2 text-left transition-all ${selected?.id === log.id ? "border-emerald-400/30" : "border-white/5 hover:border-white/15"}`}
                        data-testid={`packet-${log.id}`}>
                        <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${log.delivered ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                          {log.delivered ? "OK" : "ERR"}
                        </span>
                        <span className="text-[9px] font-mono text-white/40 flex-shrink-0">{log.id}</span>
                        <span className="text-[9px] font-bold flex-shrink-0" style={{ color: col }}>{log.destPsi}</span>
                        <span className="text-[8px] text-white/25 truncate flex-1">{log.payload}</span>
                        <span className="text-[8px] text-white/20 flex-shrink-0">{log.hops.length} hops</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {logs.length === 0 && (
              <div className="border border-white/5 rounded-xl p-12 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
                <Globe size={28} className="text-white/10 mx-auto mb-3" />
                <div className="text-white/20 text-sm font-bold mb-1">No packets yet</div>
                <div className="text-white/10 text-[11px]">Compose a packet on the left and click Transmit to route it through the spectral network.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
