import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  ArrowLeft, Coins, Zap, Trash2, ShieldCheck, BarChart3,
  TrendingUp, CircleDollarSign, Waves, Globe
} from "lucide-react";

function wavelengthToColor(nm: number): string {
  if (nm < 380) return "#8b00ff";
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}

function bandColor(band: string): string {
  return band === "SYSTEM" ? "#8b5cf6" : band === "AUTH" ? "#3b82f6" :
    band === "USER" ? "#22c55e" : band === "GUEST" ? "#ef4444" : "#6b7280";
}

function fmtNxt(units: string | number): string {
  const u = typeof units === "string" ? BigInt(units) : BigInt(Math.round(Number(units)));
  const nxt = Number(u) / 1e8;
  return nxt.toFixed(8) + " NXT";
}

function fmtUnits(units: string | number): string {
  const n = typeof units === "string" ? parseInt(units) : Math.round(Number(units));
  return n.toLocaleString() + " units";
}

interface TreasuryData {
  treasury: { deposit_count: string; total_ordinal_units: string; total_nxt: number };
  deposits: {
    id: string; source_label: string; source_wavelength_nm: string; source_frequency_hz: string;
    source_psi_channel: string; source_band: string; ordinal_nxt_units: string;
    deposited_by: string; deposited_at: string; memo: string; source_record_id?: string;
  }[];
  energy: { total_energy_cost_units: string; operation_count: string; stores: string; retrieves: string; deletes: string; transmits: string };
  byBand: { band: string; count: string; units: string }[];
  pendingProofs: number;
}

const CONSTITUTION_TEXT = [
  { clause: "§1", text: "All spectral operations carry an energy cost E=hf, where f is the file's frequency address." },
  { clause: "§2", text: "When a file is deleted, its wavelength ordinal (freq_hz ÷ 10⁶ NXT units) is reclaimed and deposited into the Orbital Treasury." },
  { clause: "§3", text: "The Orbital Treasury funds system maintenance, deliverables, and infrastructure — governed by the Sigma Constitution Engine." },
  { clause: "§4", text: "No ordinal is destroyed. All spectral addresses are preserved in the blockchain as immutable proof of existence." },
  { clause: "§5", text: "Energy costs scale with frequency: higher bands (SYSTEM/AUTH) carry greater energetic weight." },
  { clause: "§6", text: "10% of all Orbital Treasury deposits are permanently allocated to the Chairman Founder Nexus Charitable Trust, funding humanitarian deliverables aligned with Kardashev Type I civilization outcomes." },
  { clause: "§7", text: "The Charitable Trust is non-extractable by any single authority. Disbursements require Sigma Constitution Engine consensus and are recorded immutably on the wavelength blockchain." },
];

const FUND_ALLOCATION = [
  { label: "System Maintenance",                    pct: 35, color: "#8b5cf6" },
  { label: "Deliverables Fund",                     pct: 25, color: "#3b82f6" },
  { label: "Research Reserve",                      pct: 20, color: "#22c55e" },
  { label: "Agent Rewards",                         pct: 10, color: "#f59e0b" },
  { label: "Chairman Founder Nexus Charitable Trust", pct: 10, color: "#f43f5e" },
];

export default function OrbitalTreasury() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "deposits" | "energy" | "constitution">("overview");

  const { data, isLoading } = useQuery<TreasuryData>({
    queryKey: ["/api/orbital-treasury"],
    refetchInterval: 15_000,
  });

  const totalUnits  = parseInt(data?.treasury.total_ordinal_units ?? "0");
  const totalNxt    = (totalUnits / 1e8).toFixed(8);
  const depositCount = parseInt(data?.treasury.deposit_count ?? "0");

  // Band breakdown for spectrum visualization
  const byBand = data?.byBand ?? [];
  const totalBandUnits = byBand.reduce((a, b) => a + parseInt(b.units ?? "0"), 0) || 1;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/spectral-audit">
              <button className="text-white/30 hover:text-white/60 transition-colors">
                <ArrowLeft size={16} />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-amber-400" />
                <span className="text-sm font-bold tracking-wider text-amber-400">ORBITAL TREASURY</span>
              </div>
              <div className="text-white/30 text-[10px] mt-0.5">Constitutional Economy · E=hf · AGPL-3.0 · 100-year fund</div>
            </div>
          </div>

          {/* Balance display */}
          <div className="text-right border border-amber-400/20 rounded-lg px-4 py-2" style={{ background: "rgba(251,191,36,0.04)" }}>
            <div className="text-amber-400 font-bold text-lg">{isLoading ? "—" : totalNxt} NXT</div>
            <div className="text-white/30 text-[9px] uppercase">{fmtUnits(totalUnits)} reclaimed</div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex border-b border-white/10 px-6">
        {(["overview", "deposits", "energy", "constitution"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            data-testid={`tab-${t}`}
            className="px-4 py-3 text-xs uppercase tracking-widest transition-all border-b-2"
            style={{
              color: tab === t ? "#fbbf24" : "rgba(255,255,255,0.3)",
              borderColor: tab === t ? "#fbbf24" : "transparent",
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="p-6 space-y-6">

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Coins size={14} />, label: "Total Balance", value: totalNxt + " NXT", color: "#fbbf24" },
                { icon: <Trash2 size={14} />, label: "Total Deposits", value: depositCount.toLocaleString(), color: "#f87171" },
                { icon: <Zap size={14} />, label: "Operations Tracked", value: (data?.energy.operation_count ?? 0).toLocaleString(), color: "#34d399" },
                { icon: <ShieldCheck size={14} />, label: "Pending Proofs", value: (data?.pendingProofs ?? 0).toString(), color: "#818cf8" },
              ].map(({ icon, label, value, color }) => (
                <div key={label} className="border border-white/10 rounded-xl p-4 text-center" style={{ background: `${color}08` }}>
                  <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
                  <div className="font-bold text-lg" style={{ color }}>{value}</div>
                  <div className="text-white/30 text-[9px] uppercase mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Fund allocation */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={11} /> Fund Allocation
              </div>
              <div className="space-y-3">
                {FUND_ALLOCATION.map(({ label, pct, color }) => {
                  const amount = ((totalUnits * pct) / 100 / 1e8).toFixed(8);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color }}>{label}</span>
                        <span className="text-white/50">{pct}% · {amount} NXT</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spectrum band breakdown */}
            {byBand.length > 0 && (
              <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Waves size={11} /> Deposits by Authority Band
                </div>
                <div className="space-y-2">
                  {byBand.map(b => {
                    const pct = Math.round((parseInt(b.units ?? "0") / totalBandUnits) * 100);
                    const col = bandColor(b.band);
                    const nxt = (parseInt(b.units ?? "0") / 1e8).toFixed(6);
                    return (
                      <div key={b.band}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: col }} />
                            <span style={{ color: col }}>{b.band}</span>
                            <span className="text-white/30">({b.count} deposits)</span>
                          </div>
                          <span className="text-white/50">{nxt} NXT</span>
                        </div>
                        <div className="h-1 rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chairman Founder Nexus Charitable Trust */}
            <div className="border border-rose-500/30 rounded-xl p-5" style={{ background: "rgba(244,63,94,0.04)" }}>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)" }}>
                  <Globe size={14} className="text-rose-400" />
                </div>
                <div>
                  <div className="text-rose-400 text-xs font-bold uppercase tracking-wider">Chairman Founder Nexus Charitable Trust</div>
                  <div className="text-white/40 text-[10px] mt-0.5">§6 · §7 Sigma Constitution · 10% of all Orbital Treasury deposits</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Trust Balance", value: (totalUnits * 0.10 / 1e8).toFixed(8) + " NXT" },
                  { label: "Raw Units",     value: Math.round(totalUnits * 0.10).toLocaleString() },
                  { label: "Governance",    value: "Sigma Engine" },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center border border-rose-500/15 rounded-lg py-2 px-3" style={{ background: "rgba(244,63,94,0.06)" }}>
                    <div className="text-rose-300 font-bold text-sm">{value}</div>
                    <div className="text-white/30 text-[9px] uppercase mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-[10px] text-white/40 leading-relaxed">
                <div>• Funds humanitarian deliverables aligned with Kardashev Type I civilization outcomes</div>
                <div>• Non-extractable by any single authority — requires consensus-based disbursement</div>
                <div>• Every disbursement recorded immutably on the wavelength blockchain as public proof</div>
                <div>• Open, transparent, AGPL-3.0 — <span className="text-rose-400/70">"we prove our work to the people willingly"</span></div>
              </div>
            </div>

            {/* Constitutional formula */}
            <div className="border border-amber-400/20 rounded-xl p-5" style={{ background: "rgba(251,191,36,0.03)" }}>
              <div className="text-amber-400/60 text-[10px] uppercase tracking-widest mb-3">Constitutional Ordinal Formula</div>
              <div className="space-y-2 text-xs font-mono text-white/70">
                <div><span className="text-amber-400">E</span> = <span className="text-cyan-400">h</span> × <span className="text-green-400">f</span></div>
                <div><span className="text-amber-400">ordinal_nxt_units</span> = ROUND( <span className="text-green-400">frequency_hz</span> ÷ 10⁶ )</div>
                <div className="text-white/30 text-[10px] mt-3">At 555THz (f₀) → 555,000,000 units = 5.55 NXT per file</div>
                <div className="text-white/30 text-[10px]">SYSTEM band (400nm, 749THz) → 7.49 NXT · GUEST band (700nm, 428THz) → 4.28 NXT</div>
                <div className="text-white/30 text-[10px]">Λ = hf/c² — the Lambda Boson mass of each reclaimed ordinal is preserved on chain</div>
              </div>
            </div>
          </div>
        )}

        {/* ── DEPOSITS ────────────────────────────────────────────────────── */}
        {tab === "deposits" && (
          <div className="p-6">
            {depositCount === 0 ? (
              <div className="text-center text-white/20 py-20">
                <Trash2 size={32} className="mx-auto mb-4 opacity-30" />
                <div className="text-sm">No deposits yet</div>
                <div className="text-xs mt-2">Delete a spectral file to reclaim its ordinal → treasury</div>
                <Link href="/spectral-library">
                  <button className="mt-4 px-4 py-2 rounded-lg text-xs border border-white/10 text-white/40 hover:text-white/60 transition-all">
                    Open Spectral Library
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-white/20 text-[10px] uppercase tracking-widest mb-3">{depositCount} deposits · total {totalNxt} NXT</div>
                {data!.deposits.map((d) => {
                  const nm = parseFloat(d.source_wavelength_nm);
                  const col = wavelengthToColor(nm);
                  return (
                    <div key={d.id} className="border border-white/10 rounded-lg px-4 py-3 flex items-center gap-4"
                      style={{ background: `${col}06` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${col}20`, border: `1px solid ${col}40` }}>
                        <Coins size={12} style={{ color: col }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/80 text-xs truncate">{d.source_label || d.source_record_id}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[9px]" style={{ color: col }}>{nm.toFixed(2)}nm</span>
                          <span className="text-white/30 text-[9px]">{d.source_psi_channel}</span>
                          <span className="text-[9px] px-1 rounded" style={{ background: bandColor(d.source_band) + "20", color: bandColor(d.source_band) }}>{d.source_band}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-amber-400 font-bold text-xs">{fmtNxt(d.ordinal_nxt_units)}</div>
                        <div className="text-white/20 text-[9px]">{new Date(d.deposited_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ENERGY LEDGER ───────────────────────────────────────────────── */}
        {tab === "energy" && (
          <div className="p-6 space-y-6">
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={11} /> Constitutional Energy Accounting
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { op: "STORE",    n: data?.energy.stores    ?? 0, mult: "200×", color: "#22c55e" },
                  { op: "RETRIEVE", n: data?.energy.retrieves ?? 0, mult: "10×",  color: "#3b82f6" },
                  { op: "DELETE",   n: data?.energy.deletes   ?? 0, mult: "50×",  color: "#ef4444" },
                  { op: "TRANSMIT", n: data?.energy.transmits ?? 0, mult: "30×",  color: "#f59e0b" },
                ].map(({ op, n, mult, color }) => (
                  <div key={op} className="border border-white/10 rounded-lg p-3 text-center" style={{ background: `${color}08` }}>
                    <div className="font-bold text-lg" style={{ color }}>{n}</div>
                    <div className="text-white/30 text-[9px] uppercase">{op}</div>
                    <div className="text-[9px] mt-1" style={{ color: color + "80" }}>f/10¹² × {mult} cost</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Energy Cost Scale Reference</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/20 text-[9px] uppercase">
                      <th className="text-left py-1">Band</th>
                      <th className="text-right">λ (nm)</th>
                      <th className="text-right">f (THz)</th>
                      <th className="text-right">STORE cost</th>
                      <th className="text-right">DELETE ordinal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { band: "SYSTEM", nm: 410,  f: 731, storeF: 200, col: "#8b5cf6" },
                      { band: "AUTH",   nm: 480,  f: 624, storeF: 200, col: "#3b82f6" },
                      { band: "USER",   nm: 550,  f: 545, storeF: 200, col: "#22c55e" },
                      { band: "GUEST",  nm: 680,  f: 441, storeF: 200, col: "#ef4444" },
                    ].map(({ band, nm, f, col }) => {
                      const ordinal = Math.round(f * 1e12 / 1e6);
                      const store   = Math.round((f * 1e12 / 1e12) * 200);
                      return (
                        <tr key={band} className="text-white/60">
                          <td className="py-2">
                            <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: col + "20", color: col }}>{band}</span>
                          </td>
                          <td className="text-right py-2">{nm}</td>
                          <td className="text-right py-2">{f}</td>
                          <td className="text-right py-2 text-emerald-400">{store.toLocaleString()} units</td>
                          <td className="text-right py-2 text-amber-400">{ordinal.toLocaleString()} units</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-3">Total Energy Costs Tracked</div>
              <div className="text-2xl font-bold text-emerald-400">
                {parseInt(data?.energy.total_energy_cost_units ?? "0").toLocaleString()} <span className="text-sm text-white/30">NXT units</span>
              </div>
              <div className="text-white/30 text-xs mt-1">= {(parseInt(data?.energy.total_energy_cost_units ?? "0") / 1e8).toFixed(8)} NXT</div>
              <div className="text-white/20 text-[10px] mt-3">All operations priced by E=hf — the photon energy at the file's spectral address.</div>
            </div>
          </div>
        )}

        {/* ── CONSTITUTION ────────────────────────────────────────────────── */}
        {tab === "constitution" && (
          <div className="p-6 space-y-6">
            <div className="border border-amber-400/20 rounded-xl p-5" style={{ background: "rgba(251,191,36,0.03)" }}>
              <div className="flex items-center gap-2 mb-4">
                <CircleDollarSign size={14} className="text-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Sigma Constitution — Economic Articles</span>
              </div>
              <div className="space-y-4">
                {CONSTITUTION_TEXT.map(({ clause, text }) => (
                  <div key={clause} className="flex items-start gap-3">
                    <span className="text-amber-400 text-xs font-bold flex-shrink-0 mt-0.5">{clause}</span>
                    <p className="text-white/60 text-xs leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Operational Flow</div>
              <div className="space-y-3">
                {[
                  { step: "1", label: "File stored at Ψ channel", detail: "User stores a file → STORE energy cost charged (200 × f/THz NXT units)", color: "#22c55e" },
                  { step: "2", label: "File proven on blockchain", detail: "Auditor agent mines proof block → SHA-256 hash anchored at wavelength address", color: "#3b82f6" },
                  { step: "3", label: "User deletes file", detail: "Ordinal (freq_hz ÷ 10⁶ NXT units) reclaimed → deposited to Orbital Treasury", color: "#ef4444" },
                  { step: "4", label: "Treasury funds deliverables", detail: "40% maintenance · 30% deliverables · 20% research · 10% agent rewards", color: "#f59e0b" },
                  { step: "5", label: "Ψ address preserved forever", detail: "Deletion is soft — the spectral address lives on chain as immutable proof of existence", color: "#8b5cf6" },
                ].map(({ step, label, detail, color }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: color + "20", color, border: `1px solid ${color}40` }}>
                      {step}
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color }}>{label}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-5 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/20 text-[10px] uppercase tracking-widest mb-2">AGPL-3.0 · 100-Year Project</div>
              <div className="text-white/40 text-xs leading-relaxed">
                "We prove our work to the people willingly."<br />
                Every ordinal is public. Every proof is verifiable. Every treasury deposit is on-chain.
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <Link href="/spectral-audit">
                  <button className="px-3 py-1.5 rounded text-xs border border-white/10 text-white/40 hover:text-white/60 transition-all">
                    Audit Ledger
                  </button>
                </Link>
                <Link href="/spectral-library">
                  <button className="px-3 py-1.5 rounded text-xs border border-amber-400/20 text-amber-400/60 hover:text-amber-400 transition-all">
                    Spectral Library
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
