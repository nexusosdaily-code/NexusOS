import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Radio, Zap, Globe, Copy, Check, ChevronRight, ExternalLink,
  Database, Shield, Waves, Code2, ArrowRight, Search, UserCircle,
  PlusCircle, Lock, Activity, Bitcoin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ── WASCII CE→SE engine (v1.0) ───────────────────────────────────────────────
function ceEncode(text: string) {
  const input = (text || "nexus").trim();
  const codes = input.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  const sum   = codes.reduce((a, b) => a + b, 0);
  const avg   = sum / (codes.length || 1);
  const nm    = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const thz   = parseFloat((299_792_458 / (nm * 1e-9) / 1e12).toFixed(3));
  const wdm   = Math.floor((nm - 380) / 4) + 1;
  const oam   = sum % 100;
  const pol   = codes.length % 2 === 0 ? "H" : "V";
  const band  = nm < 450 ? "VIOLET" : nm < 495 ? "BLUE" : nm < 520 ? "CYAN" : nm < 565 ? "GREEN" : nm < 590 ? "YELLOW" : nm < 625 ? "ORANGE" : "RED";
  const slug  = input.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return { nm, thz, wdm, oam, pol, band, psi: `Ψ(${wdm},${oam},${pol})`, uri: `wnsp://Ψ(${wdm},${oam},${pol})/${slug}`, input };
}

function nmToColor(nm: number) {
  if (nm < 450) return "#7c3aed";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#0891b2";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
}

function CopyBtn({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`hover:text-white transition-colors ${className}`}>
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function SpectrumBar({ nm }: { nm: number }) {
  const pct = Math.max(0, Math.min(100, ((nm - 380) / 400) * 100));
  const col = nmToColor(nm);
  return (
    <div className="relative h-3 rounded-full overflow-hidden mt-1"
      style={{ background: "linear-gradient(to right,#7c3aed,#2563eb,#0891b2,#16a34a,#ca8a04,#ea580c,#dc2626)" }}>
      <div className="absolute top-0 bottom-0 w-3 h-3 rounded-full border-2 border-white shadow-lg"
        style={{ left: `calc(${pct}% - 6px)`, background: col }} />
    </div>
  );
}

// ── WASCII v2.0 — Wave Density Spectral Vector display ───────────────────────
function SpectralVectorDisplay({ sv }: { sv: any }) {
  if (!sv || !sv.bands) return null;

  const bands = sv.bands as Record<string, number>;
  const maxCount = Math.max(1, ...Object.values(bands));
  const allBars = Array.from({ length: 100 }, (_, i) => {
    const idx = i + 1;
    const count = bands[String(idx)] ?? 0;
    const nm = 380 + (idx - 1) * 4 + 2;
    return { idx, count, nm, height: Math.round((count / maxCount) * 100) };
  });

  const entropy = sv.spectral_entropy ?? 0;
  const entropyPct = Math.round(entropy * 100);

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between text-xs font-mono text-slate-500">
        <span className="text-slate-400 font-semibold">WASCII v2.0 — Spectral Fingerprint</span>
        <span className="text-slate-600">{sv.unique_states} compression states</span>
      </div>

      {/* Histogram */}
      <div className="flex items-end gap-px h-10 rounded overflow-hidden bg-slate-900/60 px-1 py-1">
        {allBars.map(b => (
          <div key={b.idx} className="flex-1 rounded-sm transition-all"
            style={{
              height: b.count > 0 ? `${Math.max(15, b.height)}%` : "2px",
              background: b.count > 0 ? nmToColor(b.nm) : "#1e293b",
              opacity: b.count > 0 ? 0.9 : 0.3,
            }}
            title={`WDM ${b.idx} · ${b.nm.toFixed(0)}nm · ${b.count} chars`}
          />
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-900/60 rounded p-2">
          <div className="text-slate-600 mb-0.5">centroid</div>
          <div className="text-slate-300">{sv.centroid_nm?.toFixed(1)} nm</div>
        </div>
        <div className="bg-slate-900/60 rounded p-2">
          <div className="text-slate-600 mb-0.5">bandwidth</div>
          <div className="text-slate-300">±{sv.bandwidth_nm?.toFixed(1)} nm</div>
        </div>
        <div className="bg-slate-900/60 rounded p-2">
          <div className="text-slate-600 mb-0.5">entropy</div>
          <div style={{ color: `hsl(${entropyPct * 1.2},70%,55%)` }}>{entropyPct}%</div>
        </div>
        <div className="bg-slate-900/60 rounded p-2">
          <div className="text-slate-600 mb-0.5">dominant</div>
          <div className="text-slate-300" style={{ color: nmToColor(sv.dominant_nm ?? 550) }}>{sv.dominant_band}</div>
        </div>
      </div>

      {/* Compression range */}
      {sv.compression_range && (
        <div className="text-xs font-mono text-slate-600">
          compression range: <span className="text-slate-500">{sv.compression_range[0]}–{sv.compression_range[1]} nm</span>
          {sv.extended_nir > 0 && <span className="ml-2 text-amber-600/70">+{sv.extended_nir} NIR chars</span>}
          {sv.extended_uv > 0 && <span className="ml-2 text-violet-600/70">+{sv.extended_uv} UV chars</span>}
        </div>
      )}
    </div>
  );
}

function authFetch(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}

// ── Bitcoin Genesis Inscription Proof Banner ──────────────────────────────────
function GenesisProofBanner() {
  const [copied, setCopied] = useState<string | null>(null);

  const { data } = useQuery<{ ok: boolean; genesis: any }>({
    queryKey: ["/api/wnsp/genesis"],
    queryFn: () => fetch("/api/wnsp/genesis").then(r => r.json()),
    staleTime: Infinity,
  });

  const g = data?.genesis;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!g) return null;

  return (
    <div className="border-b border-yellow-900/40 bg-yellow-950/20 px-4 sm:px-6 py-3">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left — verified badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <Bitcoin className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-orange-300 font-mono uppercase tracking-wider">Genesis On-Chain</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/60 border border-green-700/40 text-green-400 font-mono font-bold">VERIFIED</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Bitcoin Ordinals Inscription · Taproot · 330 sats</div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-slate-700/60" />

          {/* Center — WNSP address + inscription ID */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] text-slate-500">content:</span>
              <span className="text-sm text-yellow-300 font-bold">{g.content}</span>
              <button onClick={() => copy(g.content, "content")} className="text-slate-600 hover:text-white transition-colors">
                {copied === "content" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-[11px] text-slate-500">inscription:</span>
              <span className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-xs">{g.inscriptionId}</span>
              <button onClick={() => copy(g.inscriptionId, "id")} className="text-slate-600 hover:text-white transition-colors flex-shrink-0">
                {copied === "id" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Right — spectral data + links */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-slate-600 font-mono">λ</div>
              <div className="text-xs font-bold font-mono" style={{ color: "#ca8a04" }}>{g.wavelengthNm} nm</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-600 font-mono">ψ</div>
              <div className="text-xs font-bold font-mono text-yellow-400">{g.psiChannel}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-600 font-mono">band</div>
              <div className="text-xs font-bold font-mono text-yellow-300">{g.band}</div>
            </div>
            <div className="flex flex-col gap-1">
              <a href={g.uniscanUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-mono"
                data-testid="link-genesis-uniscan">
                UniScan <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a href={g.mempoolUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors font-mono"
                data-testid="link-genesis-mempool">
                Mempool <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <a href={g.ordinalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-mono"
                data-testid="link-genesis-ordinals">
                Ordinals <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Identity card for the logged-in user ─────────────────────────────────────
function MyIdentityCard({ username }: { username: string }) {
  const enc = ceEncode(username);
  const col = nmToColor(enc.nm);
  const qc  = useQueryClient();
  const { toast } = useToast();

  const { data: sv } = useQuery({
    queryKey: ["/api/wnsp/spectral-vector", username],
    queryFn: () => fetch(`/api/wnsp/spectral-vector?text=${encodeURIComponent(username)}`).then(r => r.json()),
    enabled: username.length >= 1,
    staleTime: 300000,
  });

  const autoRegMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/wnsp/auto-register-me", { method: "POST", headers: { "Content-Type": "application/json" } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Register failed");
      return d;
    },
    onSuccess: (d) => {
      toast({ title: d.created ? "WNSP address registered" : "Address already registered", description: enc.uri });
      qc.invalidateQueries({ queryKey: ["/api/wnsp/registry"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${col}50` }}>
      <div className="h-2" style={{ background: `linear-gradient(to right, ${col}, ${col}88)` }} />
      <div className="p-5 space-y-4" style={{ background: `${col}08` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">Your Spectral Identity</div>
            <div className="text-xl font-bold text-white font-mono">{username}</div>
            <div className="text-xs text-slate-400 font-mono">
              Derived deterministically from WASCII CE→SE encoding of <em>{username}</em>
            </div>
          </div>
          <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl font-bold text-white"
            style={{ background: `${col}40`, border: `2px solid ${col}60` }}>
            {username[0].toUpperCase()}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          {[
            { label: "λ wavelength", value: `${enc.nm.toFixed(2)} nm` },
            { label: "ν frequency",  value: `${enc.thz} THz` },
            { label: "Ψ channel",    value: enc.psi },
            { label: "Band",         value: enc.band },
          ].map((m, i) => (
            <div key={i} className="bg-slate-900/60 rounded-lg p-2.5">
              <div className="text-slate-600 mb-0.5">{m.label}</div>
              <div className="text-slate-200" style={{ color: i <= 1 ? col : undefined }}>{m.value}</div>
            </div>
          ))}
        </div>

        <SpectrumBar nm={enc.nm} />

        {sv && <SpectralVectorDisplay sv={sv} />}

        <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
          <Radio className="w-3.5 h-3.5 flex-shrink-0" style={{ color: col }} />
          <code className="text-xs text-slate-200 flex-1 break-all font-mono">{enc.uri}</code>
          <CopyBtn text={enc.uri} className="text-slate-600" />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <Globe className="w-3.5 h-3.5" />
          <span>TCP/IP bridge:</span>
          <code className="text-slate-400">{window.location.origin}/profile/{username.toLowerCase()}</code>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => autoRegMut.mutate()}
            disabled={autoRegMut.isPending}
            className="text-xs"
            style={{ background: col, color: "#fff" }}
            data-testid="btn-register-me">
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            {autoRegMut.isPending ? "Registering…" : "Register to WNSP Registry"}
          </Button>
          <Link href={`/profile/${username}`} data-testid="link-view-profile">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 text-slate-300 hover:text-white">
              <UserCircle className="w-3.5 h-3.5 mr-1.5" />
              View Profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Live resolver / encoder ──────────────────────────────────────────────────
function LiveResolver() {
  const [text, setText] = useState("NexusOS");
  const enc = ceEncode(text);
  const col = nmToColor(enc.nm);

  const { data: resolved } = useQuery<{ resolved: boolean; entries: any[]; spectral: any[] }>({
    queryKey: ["/api/wnsp/resolve", enc.psi],
    queryFn: async () => {
      const res = await fetch(`/api/wnsp/resolve?psi=${encodeURIComponent(enc.psi)}`);
      return res.json();
    },
    enabled: text.length >= 2,
    staleTime: 10000,
  });

  const { data: sv } = useQuery({
    queryKey: ["/api/wnsp/spectral-vector", text],
    queryFn: () => fetch(`/api/wnsp/spectral-vector?text=${encodeURIComponent(text)}`).then(r => r.json()),
    enabled: text.length >= 1,
    staleTime: 5000,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-400">Enter any text — username, code label, document title, resource name</Label>
        <Input value={text} onChange={e => setText(e.target.value)}
          className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
          placeholder="e.g. nexus_kernel_v1"
          data-testid="input-resolve-text" />
      </div>

      {text.length >= 1 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${col}40` }}>
          <div className="h-1.5" style={{ background: `linear-gradient(to right,${col},${col}66)` }} />
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: col, boxShadow: `0 0 12px ${col}80` }} />
              <div>
                <span className="text-slate-200 font-bold font-mono text-sm">{enc.nm.toFixed(2)} nm</span>
                <span className="text-slate-500 font-mono text-xs ml-2">· {enc.thz} THz · {enc.band}</span>
              </div>
            </div>

            <SpectrumBar nm={enc.nm} />

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="bg-slate-900 rounded p-2">
                <div className="text-slate-600">WDM channel</div>
                <div className="text-cyan-300">{enc.wdm}</div>
              </div>
              <div className="bg-slate-900 rounded p-2">
                <div className="text-slate-600">OAM mode</div>
                <div className="text-violet-300">{enc.oam}</div>
              </div>
              <div className="bg-slate-900 rounded p-2">
                <div className="text-slate-600">Polarisation</div>
                <div className="text-green-300">{enc.pol}</div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg px-3 py-2 flex items-center gap-2">
              <code className="text-xs text-slate-200 flex-1 font-mono break-all">{enc.uri}</code>
              <CopyBtn text={enc.uri} className="text-slate-600" />
            </div>

            {/* Resolution status */}
            <div className="flex items-center gap-2 text-xs font-mono">
              {resolved?.resolved
                ? <><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-green-400">Resolves → {resolved.entries[0]?.resourceType} in WNSP registry</span></>
                : <><div className="w-1.5 h-1.5 rounded-full bg-slate-600" /><span className="text-slate-500">Not yet registered in WNSP registry</span></>
              }
            </div>
            {resolved?.spectral && resolved.spectral.length > 0 && (
              <div className="text-xs font-mono text-cyan-400">
                → {resolved.spectral.length} spectral DB record{resolved.spectral.length !== 1 ? "s" : ""} at this channel
              </div>
            )}
          </div>
        </div>
      )}

      {sv && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <SpectralVectorDisplay sv={sv} />
        </div>
      )}

      {/* Formula walkthrough */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-xs font-mono text-slate-500 space-y-1.5">
        <div className="text-slate-400 font-semibold mb-2">WASCII CE→SE derivation</div>
        {text.length >= 1 && (() => {
          const codes = text.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
          const sum   = codes.reduce((a, b) => a + b, 0);
          const avg   = sum / (codes.length || 1);
          return (
            <>
              <div>input: <span className="text-white">{text.toUpperCase()}</span></div>
              <div>ASCII ordinals: <span className="text-cyan-400">[{codes.join(", ")}]</span></div>
              <div>sum: <span className="text-violet-400">{sum}</span> · avg: <span className="text-violet-400">{avg.toFixed(3)}</span></div>
              <div>λ = 380 + (({avg.toFixed(2)}−32)/94)×400 = <span className="text-yellow-400">{enc.nm.toFixed(2)} nm</span></div>
              <div>wdm = ⌊({enc.nm.toFixed(2)}−380)/4⌋+1 = <span className="text-cyan-300">{enc.wdm}</span></div>
              <div>oam = {sum}%100 = <span className="text-violet-300">{enc.oam}</span></div>
              <div>pol = len({codes.length})%2 = {codes.length % 2} → <span className="text-green-300">{enc.pol}</span></div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── Registry table ───────────────────────────────────────────────────────────
function RegistryTable() {
  const [filter, setFilter] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regLabel, setRegLabel]         = useState("");
  const [regDesc,  setRegDesc]          = useState("");
  const [regType,  setRegType]          = useState("resource");
  const [regHttp,  setRegHttp]          = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem("auth_token");

  const regEnc = ceEncode(regLabel || "preview");

  const { data, isLoading } = useQuery<{ entries: any[]; total: number }>({
    queryKey: ["/api/wnsp/registry"],
    queryFn: () => fetch("/api/wnsp/registry?limit=100").then(r => r.json()),
    refetchInterval: 30000,
  });

  const registerMut = useMutation({
    mutationFn: async () => {
      if (!regLabel) throw new Error("Label required");
      const res = await authFetch("/api/wnsp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: regLabel, resourceType: regType, httpUrl: regHttp || undefined, description: regDesc || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Register failed");
      return d;
    },
    onSuccess: (d) => {
      toast({ title: "Address registered", description: d.entry.wnspUri });
      setRegLabel(""); setRegDesc(""); setRegHttp(""); setRegisterOpen(false);
      qc.invalidateQueries({ queryKey: ["/api/wnsp/registry"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const entries = (data?.entries ?? []).filter(e =>
    !filter || e.label.toLowerCase().includes(filter.toLowerCase()) ||
               e.psiChannel.includes(filter) ||
               e.resourceType.toLowerCase().includes(filter.toLowerCase())
  );

  const bandColor: Record<string, string> = {
    VIOLET: "#7c3aed", BLUE: "#2563eb", CYAN: "#0891b2",
    GREEN: "#16a34a", YELLOW: "#ca8a04", ORANGE: "#ea580c", RED: "#dc2626",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <Input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter by label, Ψ channel, or type…"
            className="bg-slate-800 border-slate-600 text-slate-200 text-sm pl-8"
            data-testid="input-registry-filter" />
        </div>
        {token && (
          <Button size="sm" onClick={() => setRegisterOpen(v => !v)}
            className="bg-cyan-800 hover:bg-cyan-700 text-xs"
            data-testid="btn-open-register">
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Register
          </Button>
        )}
      </div>

      {registerOpen && (
        <div className="rounded-xl border border-cyan-800/40 bg-slate-900/60 p-4 space-y-3">
          <div className="text-sm font-semibold text-cyan-300">Register WNSP Address</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Label (CE→SE derives the address)</Label>
              <Input value={regLabel} onChange={e => setRegLabel(e.target.value)}
                placeholder="e.g. nexus_kernel_v1"
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                data-testid="input-reg-label" />
              {regLabel && (
                <div className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  {regEnc.uri}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Resource type</Label>
              <select value={regType} onChange={e => setRegType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded px-2 py-1.5 text-sm">
                <option value="user">user</option>
                <option value="content">content</option>
                <option value="code">code</option>
                <option value="wallet">wallet</option>
                <option value="node">node</option>
                <option value="resource">resource</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">HTTP URL (current bridge)</Label>
              <Input value={regHttp} onChange={e => setRegHttp(e.target.value)}
                placeholder="https://… or /path"
                className="bg-slate-800 border-slate-600 text-slate-200 text-sm"
                data-testid="input-reg-http" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Description (optional)</Label>
              <Input value={regDesc} onChange={e => setRegDesc(e.target.value)}
                placeholder="Brief description"
                className="bg-slate-800 border-slate-600 text-slate-200 text-sm" />
            </div>
          </div>
          <Button size="sm" onClick={() => registerMut.mutate()}
            disabled={!regLabel || registerMut.isPending}
            className="bg-cyan-700 hover:bg-cyan-600 text-xs"
            data-testid="btn-confirm-register">
            <Zap className="w-3.5 h-3.5 mr-1" />
            {registerMut.isPending ? "Registering…" : "Register address"}
          </Button>
        </div>
      )}

      {isLoading && <div className="text-center py-8 text-slate-500 text-sm">Loading registry…</div>}

      {entries.length === 0 && !isLoading && (
        <div className="text-center py-8 text-slate-600 text-sm">
          No addresses registered yet. Be the first to register your spectral identity.
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((e: any) => {
            const bc = bandColor[e.band] ?? "#16a34a";
            return (
              <div key={e.id} className="rounded-lg border border-slate-800 hover:border-slate-700 transition-colors bg-slate-900/40 p-3"
                data-testid={`registry-entry-${e.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: bc }} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-100 font-mono">{e.label}</span>
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-400 px-1.5 py-0">{e.resourceType}</Badge>
                      {e.isCanonical && <Badge className="text-xs bg-purple-800/50 text-purple-300 px-1.5 py-0">canonical</Badge>}
                      <span className="text-xs text-slate-600">{formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs text-cyan-400 font-mono truncate">{e.wnspUri}</code>
                      <CopyBtn text={e.wnspUri} className="text-slate-700" />
                    </div>
                    {e.httpUrl && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                        <Globe className="w-3 h-3" />
                        <a href={e.httpUrl.startsWith("/") ? e.httpUrl : e.httpUrl}
                          className="hover:text-slate-300 truncate max-w-xs">{e.httpUrl}</a>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </div>
                    )}
                    {e.description && <div className="text-xs text-slate-500">{e.description}</div>}
                    <div className="text-xs font-mono text-slate-700">
                      {e.psiChannel} · λ {parseFloat(e.wavelengthNm).toFixed(1)} nm · {e.band} · {e.resolveCount} resolves
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Bridge spec: phase roadmap ────────────────────────────────────────────────
function BridgeSpec() {
  const phases = [
    {
      phase: "Phase 1 — Complete",
      title: "TCP/IP overlay",
      status: "complete",
      color: "#16a34a",
      items: [
        "wnsp:// URIs registered in Nexus WNSP Registry",
        "CE→SE (WASCII v1.0) derives deterministic Ψ addresses from text",
        "Resolver maps Ψ(wdm,oam,pol) → HTTPS URL on current internet",
        "Every NexusOS user gets a canonical spectral identity today",
        "Spectral DB stores content at physical wavelength addresses",
      ],
    },
    {
      phase: "Phase 2 — Active",
      title: "Full 256 WDM · WavelengthScript + Ordinal bridge",
      status: "active",
      color: "#16a34a",
      items: [
        "Code labeled in WavelengthScript is addressed by its wnsp:// URI",
        "CE ordinals (NXT tokens) represent on-chain ownership of spectral slots",
        "WNSP-URI v1.0 replaces file paths — every function lives at its wavelength",
        "Spectral mesh routing: wnsp:// packets traverse nodes by Ψ channel",
        "NexusOS users reachable at wnsp://Ψ(wdm,oam,pol)/username globally",
      ],
    },
    {
      phase: "Phase 3 — Moore's law",
      title: "Native photonic infrastructure",
      status: "horizon",
      color: "#7c3aed",
      items: [
        "Photonic hardware routes data at physical light frequencies",
        "wnsp:// addresses ARE the physical routing — no translation layer",
        "Einstein's Λ=hf/c² — each transmission validated at its physical compression state",
        "25,600 orthogonal Hilbert space channels replace IP address space",
        "NexusOS becomes the OS of light — the infrastructure of civilization",
      ],
    },
  ];

  const statusBadge: Record<string, string> = {
    active:   "bg-green-900/50 text-green-400 border-green-800",
    building: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
    horizon:  "bg-purple-900/50 text-purple-400 border-purple-800",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {phases.map((p, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3" style={{ borderColor: `${p.color}30`, background: `${p.color}05` }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs px-1.5 py-0 border ${statusBadge[p.status]}`}>{p.status}</Badge>
            </div>
            <div className="text-xs text-slate-500 font-mono">{p.phase}</div>
            <div className="font-semibold text-slate-100 text-sm">{p.title}</div>
          </div>
          <ul className="space-y-1.5">
            {p.items.map((item, j) => (
              <li key={j} className="flex items-start gap-1.5 text-xs text-slate-400">
                <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: p.color }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Hilbert Space Explorer ─────────────────────────────────────────────────────
const VISIBLE_MIN_NM = 380;
const VISIBLE_MAX_NM = 750;
const HILBERT_WDM = 256;
const HILBERT_OAM = 50;
const HILBERT_POL = 2;
const HILBERT_TOTAL = HILBERT_WDM * HILBERT_OAM * HILBERT_POL; // 25,600

function wdmToNm(wdm: number) {
  return VISIBLE_MIN_NM + (wdm / (HILBERT_WDM - 1)) * (VISIBLE_MAX_NM - VISIBLE_MIN_NM);
}
function wdmToColor(wdm: number) {
  const t = wdm / (HILBERT_WDM - 1);
  if (t < 0.15) return "#8b5cf6";
  if (t < 0.30) return "#6366f1";
  if (t < 0.50) return "#3b82f6";
  if (t < 0.65) return "#22c55e";
  if (t < 0.80) return "#eab308";
  if (t < 0.90) return "#f97316";
  return "#ef4444";
}
function channelIndex(wdm: number, oam: number, pol: number) {
  return wdm * HILBERT_OAM * HILBERT_POL + oam * HILBERT_POL + pol;
}

function HilbertPanel() {
  const [wdm, setWdm] = useState(114);
  const [oam, setOam] = useState(24);
  const [pol, setPol] = useState(0);

  const nm   = wdmToNm(wdm);
  const freq = 2.998e8 / (nm * 1e-9);
  const h    = 6.626e-34;
  const c    = 2.998e8;
  const E_J  = h * freq;
  const L_kg = E_J / (c * c);
  const chIdx = channelIndex(wdm, oam, pol);
  const col   = wdmToColor(wdm);
  const psiLabel = `Ψ(${wdm},${oam},${pol === 0 ? "H" : "V"})`;

  const { data: ortho } = useQuery<any>({
    queryKey: ["/api/wnsp/se/orthogonality"],
    queryFn: () => fetch("/api/wnsp/se/orthogonality").then(r => r.json()),
    staleTime: 600000,
  });

  const spectrumBands = Array.from({ length: 32 }, (_, i) => i * 8);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-cyan-400 font-mono font-bold text-sm">Hilbert Space Explorer</div>
          <Badge variant="outline" className="text-xs border-cyan-800/50 text-cyan-500 font-mono">dim(H) = 25,600</Badge>
          <Badge variant="outline" className="text-xs border-violet-800/50 text-violet-400 font-mono">256 × 50 × 2</Badge>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Three orthogonal quantum sub-spaces form the complete WNSP channel basis.
          Any two distinct Ψ channels satisfy{" "}
          <span className="text-cyan-400 font-mono">⟨Ψ_i | Ψ_j⟩ = 0</span> — they never interfere.
          Navigate the space below, then read your channel's compression-state physics.
        </p>
        <div className="font-mono text-sm text-white bg-slate-950 rounded-lg px-4 py-2.5 border border-slate-700">
          Ψ_channel = |λ<sub className="text-violet-400">i</sub>⟩ ⊗ |OAM<sub className="text-blue-400">j</sub>⟩ ⊗ |Pol<sub className="text-emerald-400">k</sub>⟩
        </div>
      </div>

      {/* Three dimension panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* WDM */}
        <div className="rounded-xl border border-violet-800/40 bg-slate-900/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: col }}></div>
            <span className="text-xs font-mono font-semibold text-violet-300">N_λ — WDM Channels</span>
          </div>
          <div className="text-3xl font-bold font-mono text-violet-300">{HILBERT_WDM}</div>
          <p className="text-xs text-slate-500">
            Each band is a distinct compression state on the Λ=hf/c² curve.
            Shorter λ → higher frequency → more energy per photon.
          </p>
          <input
            type="range" min={0} max={255} value={wdm}
            onChange={e => setWdm(Number(e.target.value))}
            className="w-full accent-violet-500 h-1.5"
            data-testid="slider-wdm"
          />
          <div className="font-mono text-xs text-violet-400">
            |λ<sub>{wdm}</sub>⟩ · band {wdm} → {nm.toFixed(1)} nm
          </div>
        </div>

        {/* OAM */}
        <div className="rounded-xl border border-blue-800/40 bg-slate-900/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-xs font-mono font-semibold text-blue-300">N_OAM — Angular Modes</span>
          </div>
          <div className="text-3xl font-bold font-mono text-blue-300">{HILBERT_OAM}</div>
          <p className="text-xs text-slate-500">
            Photons carry quantised orbital angular momentum ℓ = 0…49.
            Completely orthogonal to wavelength — same photon, different spin state.
          </p>
          <input
            type="range" min={0} max={49} value={oam}
            onChange={e => setOam(Number(e.target.value))}
            className="w-full accent-blue-500 h-1.5"
            data-testid="slider-oam"
          />
          <div className="font-mono text-xs text-blue-400">
            |OAM<sub>{oam}</sub>⟩ · mode ℓ = {oam}
          </div>
        </div>

        {/* Pol */}
        <div className="rounded-xl border border-emerald-800/40 bg-slate-900/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-xs font-mono font-semibold text-emerald-300">N_Pol — Polarisation</span>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-300">{HILBERT_POL}</div>
          <p className="text-xs text-slate-500">
            Horizontal and vertical polarisation states. Third orthogonal axis —
            independent of both λ and OAM. Doubles every channel.
          </p>
          <div className="flex gap-2 pt-1">
            {["H — Horizontal", "V — Vertical"].map((label, i) => (
              <button
                key={label}
                onClick={() => setPol(i)}
                data-testid={`pol-${i === 0 ? "H" : "V"}`}
                className={`flex-1 py-2 rounded text-xs font-mono font-bold border transition-colors
                  ${pol === i
                    ? "border-emerald-500 bg-emerald-900/40 text-emerald-300"
                    : "border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="font-mono text-xs text-emerald-400">
            |Pol<sub>{pol}</sub>⟩ · {pol === 0 ? "H (horizontal)" : "V (vertical)"}
          </div>
        </div>
      </div>

      {/* Derived Ψ channel */}
      <div className="rounded-xl border bg-slate-950 p-5 space-y-4" style={{ borderColor: col + "55" }}>
        <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">Selected Channel</div>
        <div className="font-mono text-lg sm:text-xl text-white">
          Ψ<sub style={{ color: col }}>ch</sub>{" "}={" "}
          |λ<sub className="text-violet-300">{wdm}</sub>⟩ ⊗{" "}
          |OAM<sub className="text-blue-300">{oam}</sub>⟩ ⊗{" "}
          |Pol<sub className="text-emerald-300">{pol === 0 ? "H" : "V"}</sub>⟩
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Channel Index", value: chIdx.toLocaleString(), color: col },
            { label: "Wavelength",    value: `${nm.toFixed(2)} nm`,  color: "#a78bfa" },
            { label: "E = hf",        value: `${E_J.toExponential(2)} J`, color: "#f59e0b" },
            { label: "Λ = hf/c²",     value: `${L_kg.toExponential(2)} kg`, color: "#f43f5e" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="text-xs text-slate-500 font-mono mb-1">{label}</div>
              <div className="font-mono font-bold text-sm" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="font-mono text-xs text-slate-600">
          WNSP-URI: <span className="text-cyan-500">wnsp://{psiLabel}/</span>
        </div>
      </div>

      {/* WDM spectrum bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
        <div className="text-xs font-mono text-slate-400 font-semibold">WDM Spectrum — visible light 380→750 nm</div>
        <div className="flex rounded overflow-hidden h-5 w-full" data-testid="spectrum-bar">
          {spectrumBands.map(b => (
            <div
              key={b}
              onClick={() => setWdm(b)}
              title={`WDM ${b} · ${wdmToNm(b).toFixed(0)} nm`}
              className="flex-1 cursor-pointer transition-all hover:opacity-80"
              style={{
                background: wdmToColor(b),
                opacity: Math.abs(b - wdm) <= 4 ? 1 : 0.45,
                outline: Math.abs(b - wdm) <= 4 ? "2px solid white" : "none",
                outlineOffset: "-2px",
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-600 font-mono">
          <span>380 nm · violet</span>
          <span>← WDM {wdm} · {nm.toFixed(1)} nm →</span>
          <span>750 nm · red</span>
        </div>
      </div>

      {/* OAM × Pol grid for selected WDM band */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
        <div className="text-xs font-mono text-slate-400 font-semibold">
          OAM × Pol grid — WDM band {wdm} ({nm.toFixed(0)} nm)
          <span className="text-slate-600 ml-2">100 channels per WDM band</span>
        </div>
        <div className="overflow-x-auto">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${HILBERT_OAM}, minmax(0, 1fr))`, minWidth: "600px" }}>
            {[0, 1].map(p =>
              Array.from({ length: HILBERT_OAM }, (_, o) => {
                const isActive = o === oam && p === pol;
                const idx = channelIndex(wdm, o, p);
                return (
                  <div
                    key={`${o}-${p}`}
                    onClick={() => { setOam(o); setPol(p); }}
                    title={`Ψ(${wdm},${o},${p === 0 ? "H" : "V"}) · ch${idx}`}
                    data-testid={`channel-${wdm}-${o}-${p}`}
                    className="h-3 rounded-sm cursor-pointer transition-all hover:opacity-100"
                    style={{
                      background: isActive ? "#fff" : col,
                      opacity: isActive ? 1 : 0.3,
                      gridRow: p + 1,
                      gridColumn: o + 1,
                    }}
                  />
                );
              })
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
          <span>Row 1 = H · Row 2 = V · Columns = OAM modes 0–49</span>
          <span className="text-white">■</span><span>= selected channel</span>
        </div>
      </div>

      {/* Orthogonality proof */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-semibold text-slate-300">Orthogonality Proof</div>
          {ortho?.sample_validated && (
            <Badge variant="outline" className="text-xs border-emerald-700 text-emerald-400 font-mono">✓ VALIDATED</Badge>
          )}
        </div>
        <div className="font-mono text-sm text-cyan-400 bg-slate-950 px-4 py-3 rounded-lg border border-slate-800">
          ⟨Ψ_i | Ψ_j⟩ = 0 &nbsp; for all i ≠ j
        </div>
        <p className="text-xs text-slate-500">
          {ortho?.proof ?? "Each channel is a unique tensor-product basis vector. Distinct (wdm_i, oam_j, pol_k) triplets are orthogonal by construction."}
        </p>
        {ortho?.sample_channels && (
          <div className="space-y-1">
            <div className="text-xs text-slate-600 font-mono mb-2">
              Sample — {ortho.sample_size} channels checked, all unique:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ortho.sample_channels.map((ch: any) => (
                <div
                  key={ch.index}
                  className="font-mono text-xs rounded px-3 py-1.5 border border-slate-800 bg-slate-950 text-slate-400 flex items-center justify-between cursor-pointer hover:border-slate-600 transition-colors"
                  onClick={() => { setWdm(ch.wdm_i); setOam(ch.oam_j); setPol(ch.pol_k); }}
                  data-testid={`ortho-sample-${ch.index}`}
                  title="Click to navigate to this channel"
                >
                  <span className="text-cyan-400">Ψ({ch.wdm_i},{ch.oam_j},{ch.pol_k === 0 ? "H" : "V"})</span>
                  <span className="text-slate-600">ch {ch.index.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { label: "Total channels",   value: HILBERT_TOTAL.toLocaleString(), note: "orthogonal states" },
            { label: "WDM sub-space",    value: HILBERT_WDM.toString(),          note: "λ dimension" },
            { label: "OAM × Pol",        value: `${HILBERT_OAM} × ${HILBERT_POL}`, note: "= 100 per band" },
          ].map(({ label, value, note }) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1">
              <div className="text-xs text-slate-500 font-mono">{label}</div>
              <div className="text-xl font-bold font-mono text-white">{value}</div>
              <div className="text-xs text-slate-600">{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shannon vs WNSP */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
        <div className="text-xs font-mono text-slate-400 font-semibold">Shannon vs WNSP — Scaling Law</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-amber-900/40 bg-slate-950 p-4 space-y-2">
            <div className="text-xs text-amber-400 font-mono font-semibold">Shannon (classical)</div>
            <div className="font-mono text-sm text-white">C = B · log₂(1 + SNR)</div>
            <p className="text-xs text-slate-500">Squeezes more into one channel. Hits logarithmic diminishing returns. More signal power = less gain.</p>
          </div>
          <div className="rounded-lg border border-cyan-900/40 bg-slate-950 p-4 space-y-2">
            <div className="text-xs text-cyan-400 font-mono font-semibold">WNSP (orthogonal)</div>
            <div className="font-mono text-sm text-white">D = N_λ · N_OAM · N_Pol · R · M</div>
            <p className="text-xs text-slate-500">Opens new orthogonal dimensions. Scales linearly with each axis. No SNR wall.</p>
          </div>
        </div>
        <div className="font-mono text-xs text-slate-600 text-center pt-1">
          256 WDM × 50 OAM × 2 Pol = <span className="text-cyan-400">{HILBERT_TOTAL.toLocaleString()} orthogonal channels</span> — each a non-interfering lane
        </div>
      </div>

    </div>
  );
}

// ── WNSP Density Equation panel ───────────────────────────────────────────────
function DensityPanel() {
  const [rSym, setRSym] = useState(2);
  const [modDepth, setModDepth] = useState(1);

  const { data: density, isLoading } = useQuery<any>({
    queryKey: ["/api/wnsp/density", rSym, modDepth],
    queryFn: () =>
      fetch(`/api/wnsp/density?r_sym=${rSym}&m=${modDepth}&wavelength_nm=550`)
        .then(r => r.json()),
    staleTime: 60000,
  });

  const hilbert = density?.hilbert_space;
  const params  = density?.parameters;
  const dens    = density?.density;
  const phases  = density?.scaling_phases ?? [];
  const shannon = density?.shannon_comparison;

  const phaseColors = ["#06b6d4", "#8b5cf6", "#f59e0b"];

  // Progress bar showing current config vs Phase 3 max
  const maxDensity = phases[2]?.d_symbols ?? 1;
  const curDensity = dens?.d_raw ?? 0;
  const pct = Math.min(100, Math.round((curDensity / maxDensity) * 100));

  const R_SYM_OPTIONS = [1, 2, 4, 8, 16, 32];
  const M_OPTIONS     = [1, 2, 4, 8, 16, 32, 64, 128];

  return (
    <div className="space-y-6">

      {/* Title + equation */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-cyan-400 font-mono font-bold text-sm">WNSP Density Equation</div>
          <Badge variant="outline" className="text-xs border-cyan-800/50 text-cyan-500 font-mono">v1.0</Badge>
        </div>

        <div className="font-mono text-base text-white bg-slate-950 rounded-lg px-4 py-3 border border-slate-700">
          D<sub className="text-cyan-400">WNSP</sub>{" "}={" "}
          <span className="text-violet-400">N<sub>λ</sub></span>{" · "}
          <span className="text-blue-400">N<sub>OAM</sub></span>{" · "}
          <span className="text-emerald-400">N<sub>Pol</sub></span>{" · "}
          <span className="text-amber-400">R<sub>sym</sub></span>{" · "}
          <span className="text-rose-400">M</span>
        </div>

        <div className="font-mono text-xs text-slate-500 bg-slate-950 rounded-lg px-4 py-2 border border-slate-800">
          D<sub>energy</sub> = D<sub>WNSP</sub> · λ / (h · c)
          <span className="ml-4 text-slate-600">← connects to Λ=hf/c²</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Traditional Shannon capacity scales with log(SNR) — diminishing returns, single channel compressed harder.{" "}
          WNSP scales by <span className="text-cyan-400">adding orthogonal dimensions</span> to the Hilbert space.
          At higher frequency (shorter λ, higher compression state), photons carry more energy,
          so density per joule decreases along the Λ=hf/c² curve.
        </p>
      </div>

      {/* Hilbert space breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
        <div className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">
          Hilbert Space — dim(H) = {hilbert ? hilbert.total_channels.toLocaleString() : "25,600"}
        </div>
        <div className="text-xs text-slate-500 font-mono mb-3">{hilbert?.channel_basis ?? "Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩"}</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "N\u03bb — WDM channels",      val: hilbert?.n_wdm   ?? 256,  color: "#8b5cf6", desc: "wavelength sub-space" },
            { label: "N\u200bOAM — orbital modes",   val: hilbert?.n_oam   ?? 50,   color: "#3b82f6", desc: "angular momentum sub-space" },
            { label: "N\u200bPol — polarization",    val: hilbert?.n_pol   ?? 2,    color: "#10b981", desc: "H / V states" },
          ].map(d => (
            <div key={d.label} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1.5">
              <div className="text-xs text-slate-500 font-mono">{d.label}</div>
              <div className="text-2xl font-bold font-mono" style={{ color: d.color }}>{d.val.toLocaleString()}</div>
              <div className="text-xs text-slate-600">{d.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-slate-950 border border-slate-800 px-4 py-3">
          <div className="font-mono text-xs text-slate-500">
            <span className="text-violet-400">256</span> × <span className="text-blue-400">50</span> × <span className="text-emerald-400">2</span>
            {" = "}
            <span className="text-white font-bold text-sm">25,600</span>
            <span className="text-slate-600 ml-2">orthogonal channels</span>
          </div>
        </div>
      </div>

      {/* Interactive density calculator */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
        <div className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">Density Calculator</div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-xs font-mono text-slate-500">R<sub>sym</sub> — symbols per channel</div>
            <div className="flex flex-wrap gap-1.5">
              {R_SYM_OPTIONS.map(v => (
                <button key={v} onClick={() => setRSym(v)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                    rSym === v ? "border-amber-500/60 bg-amber-500/10 text-amber-400" : "border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-mono text-slate-500">M — modulation depth</div>
            <div className="flex flex-wrap gap-1.5">
              {M_OPTIONS.map(v => (
                <button key={v} onClick={() => setModDepth(v)}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                    modDepth === v ? "border-rose-500/60 bg-rose-500/10 text-rose-400" : "border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live result */}
        <div className="rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 space-y-2">
          {isLoading ? (
            <div className="text-xs text-slate-600 font-mono animate-pulse">computing…</div>
          ) : (
            <>
              <div className="flex items-baseline gap-3">
                <span className="text-xs text-slate-500 font-mono">D<sub>WNSP</sub> =</span>
                <span className="text-2xl font-bold font-mono text-white">{dens?.d_raw?.toLocaleString() ?? "—"}</span>
                <span className="text-xs text-slate-600">symbols / cycle</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xs text-slate-500 font-mono">D<sub>energy</sub> =</span>
                <span className="text-sm font-mono text-slate-300">{dens?.d_energy?.toLocaleString() ?? "—"}</span>
                <span className="text-xs text-slate-600">symbols / joule</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-slate-600">
                <span>25,600 × {rSym} × {modDepth} = {(25600 * rSym * modDepth).toLocaleString()}</span>
              </div>
              <div className="mt-2">
                <div className="flex justify-between text-xs font-mono text-slate-600 mb-1">
                  <span>vs Phase 3 max</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        {params && (
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="bg-slate-950/60 rounded p-2">
              <div className="text-slate-600 mb-0.5">reference λ</div>
              <div className="text-slate-300">550 nm GREEN</div>
            </div>
            <div className="bg-slate-950/60 rounded p-2">
              <div className="text-slate-600 mb-0.5">frequency</div>
              <div className="text-slate-300">{params.frequency_thz} THz</div>
            </div>
            <div className="bg-slate-950/60 rounded p-2">
              <div className="text-slate-600 mb-0.5">photon energy</div>
              <div className="text-slate-300">{params.energy_ev} eV</div>
            </div>
          </div>
        )}
      </div>

      {/* Phase scaling */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
        <div className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">Phase Scaling</div>
        <div className="space-y-2">
          {phases.map((ph: any, i: number) => {
            const phasePct = Math.round((ph.d_symbols / (phases[2]?.d_symbols ?? 1)) * 100);
            return (
              <div key={ph.phase} className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono" style={{ color: phaseColors[i] }}>{ph.label}</div>
                  <div className="text-xs font-mono text-slate-300">{ph.d_symbols.toLocaleString()} sym/cycle</div>
                </div>
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${phasePct}%`, background: phaseColors[i] }} />
                </div>
                <div className="text-xs text-slate-600">{ph.note}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shannon vs WNSP */}
      {shannon && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
          <div className="text-xs text-slate-400 font-mono font-semibold uppercase tracking-wider">Shannon vs WNSP</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
              <div className="text-xs text-slate-500 font-mono mb-1.5">Traditional</div>
              <div className="text-xs font-mono text-slate-400">{shannon.shannon}</div>
            </div>
            <div className="rounded-lg border border-cyan-800/40 bg-slate-950 p-3">
              <div className="text-xs text-cyan-600 font-mono mb-1.5">WNSP</div>
              <div className="text-xs font-mono text-slate-300">{shannon.wnsp}</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{shannon.key_difference}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WnspBridgePage() {
  const [activeTab, setActiveTab] = useState<"identity"|"resolver"|"hilbert"|"density"|"registry"|"spec">("identity");
  const token = localStorage.getItem("auth_token");

  const { data: meData } = useQuery<{ user: { id: string; username: string } }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
    enabled: !!token,
  });

  const username = meData?.user.username;

  const TABS: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: "identity", label: "My Identity",  icon: <UserCircle className="w-3.5 h-3.5" /> },
    { key: "resolver", label: "CE→SE Live",   icon: <Zap className="w-3.5 h-3.5" /> },
    { key: "hilbert",  label: "Hilbert Space", icon: <Waves className="w-3.5 h-3.5" /> },
    { key: "density",  label: "Density Eq.",  icon: <Activity className="w-3.5 h-3.5" /> },
    { key: "registry", label: "Registry",     icon: <Database className="w-3.5 h-3.5" /> },
    { key: "spec",     label: "Bridge Spec",  icon: <Code2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                <h1 className="text-xl font-bold text-white font-mono">WNSP Bridge</h1>
                <Badge variant="outline" className="text-xs border-cyan-800/50 text-cyan-400 font-mono">v1.0</Badge>
                <Badge variant="outline" className="text-xs border-violet-800/50 text-violet-400 font-mono">WASCII v2.0</Badge>
              </div>
              <p className="text-slate-400 text-sm max-w-2xl">
                <strong className="text-slate-200">Spectral addressing on current infrastructure.</strong>{" "}
                WASCII v1.0 derives a single Ψ address from text. WASCII v2.0 computes the full{" "}
                <span className="text-violet-400">spectral fingerprint</span> — every character's compression state
                on the Λ=hf/c² curve, distributed across all 256 WDM bands. Phase 2: full spectrum active. Phase 3: native photonic.
              </p>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white text-xs flex-shrink-0">← Home</Button>
            </Link>
          </div>

          {/* Quick formula */}
          <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-500">
            <span className="text-slate-400">λ = 380 + ((avg−32)/94)×400</span>
            <span>·</span>
            <span>wdm = ⌊(λ−380)/4⌋+1</span>
            <span>·</span>
            <span>oam = Σ % 100</span>
            <span>·</span>
            <span>pol = len%2 ? V : H</span>
            <span>·</span>
            <span className="text-cyan-400">25,600 Hilbert channels</span>
          </div>
        </div>
      </div>

      {/* Bitcoin Genesis Inscription proof */}
      <GenesisProofBanner />

      {/* Tab bar */}
      <div className="border-b border-slate-800 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex gap-1 min-w-max">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
              data-testid={`tab-${t.key}`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "identity" && (
          <div className="space-y-6">
            {username ? (
              <MyIdentityCard username={username} />
            ) : (
              <div className="rounded-xl border border-slate-800 p-8 text-center space-y-3">
                <Lock className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-medium">Log in to see your spectral identity</div>
                <p className="text-slate-500 text-sm">Your canonical <code className="text-cyan-400">wnsp://</code> address is derived deterministically from your username using WASCII CE→SE. It belongs to you permanently — no server assigns it.</p>
                <Link href="/auth"><Button className="bg-cyan-700 hover:bg-cyan-600">Log In</Button></Link>
              </div>
            )}

            {/* Well-known system addresses */}
            <div className="space-y-3">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-mono">NexusOS canonical addresses</div>
              {[
                { label: "NEXUSOS",     href: "/",            desc: "NexusOS home — root of the spectral network" },
                { label: "SPECTRAL-DB", href: "/spectral-db", desc: "Spectral database — CE→SE encoded content store" },
                { label: "BLOCKCHAIN",  href: "/blockchain",  desc: "Physics-based blockchain — Λ=hf/c² proof system" },
                { label: "ENCODING-LAB",href: "/encoding-lab",desc: "CE→SE encoding laboratory" },
                { label: "KERNEL",      href: "/kernel",      desc: "WNSP AI OS kernel — 5-phase boot, authority bands" },
                { label: "MESSAGES",    href: "/messages",    desc: "Lambda-encoded peer-to-peer messaging" },
              ].map(row => {
                const enc = ceEncode(row.label);
                const col = nmToColor(enc.nm);
                return (
                  <div key={row.label} className="flex items-center gap-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/30 px-4 py-2.5 transition-colors"
                    data-testid={`known-${row.label.toLowerCase()}`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                    <code className="text-xs text-cyan-400 font-mono w-64 truncate">{enc.uri}</code>
                    <span className="text-xs text-slate-500 flex-1">{row.desc}</span>
                    <Link href={row.href}>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 hover:text-slate-300" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "resolver" && <LiveResolver />}
        {activeTab === "hilbert"  && <HilbertPanel />}
        {activeTab === "density"  && <DensityPanel />}
        {activeTab === "registry" && <RegistryTable />}
        {activeTab === "spec"     && <BridgeSpec />}
      </div>
    </div>
  );
}
