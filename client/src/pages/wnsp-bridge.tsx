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
  PlusCircle, Lock,
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

function authFetch(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) } });
}

// ── Identity card for the logged-in user ─────────────────────────────────────
function MyIdentityCard({ username }: { username: string }) {
  const enc = ceEncode(username);
  const col = nmToColor(enc.nm);
  const qc  = useQueryClient();
  const { toast } = useToast();

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

        <Button size="sm" onClick={() => autoRegMut.mutate()}
          disabled={autoRegMut.isPending}
          className="w-full sm:w-auto text-xs"
          style={{ background: col, color: "#fff" }}
          data-testid="btn-register-me">
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          {autoRegMut.isPending ? "Registering…" : "Register to WNSP Registry"}
        </Button>
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
      phase: "Phase 1 — Now",
      title: "TCP/IP overlay",
      status: "active",
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
      phase: "Phase 2 — Near term",
      title: "WavelengthScript + Ordinal bridge",
      status: "building",
      color: "#ca8a04",
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
        "Λ=hf/c² Lambda Boson field validates each transmission physically",
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WnspBridgePage() {
  const [activeTab, setActiveTab] = useState<"identity"|"resolver"|"registry"|"spec">("identity");
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
              </div>
              <p className="text-slate-400 text-sm max-w-2xl">
                <strong className="text-slate-200">Spectral addressing on current infrastructure.</strong>{" "}
                CE→SE (WASCII v1.0) derives a deterministic <code className="text-cyan-400">wnsp://Ψ(wdm,oam,pol)/path</code> address
                from any text. Phase 1: runs over TCP/IP today. Phase 3: native photonic when hardware arrives.
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

      {/* Tab bar */}
      <div className="border-b border-slate-800 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
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
                { label: "NEXUS",       href: "/",            desc: "NexusOS home — root of the spectral network" },
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
        {activeTab === "registry" && <RegistryTable />}
        {activeTab === "spec"     && <BridgeSpec />}
      </div>
    </div>
  );
}
