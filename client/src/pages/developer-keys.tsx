import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ChannelConnect } from "@/components/channel-connect";
import {
  Key, Plus, Trash2, Copy, CheckCircle, AlertTriangle,
  ArrowLeft, Code, Zap, Globe, Clock, Shield,
} from "lucide-react";

function nmToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { r = 0; g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  return `rgb(${Math.round(r*210)},${Math.round(g*210)},${Math.round(b*210)})`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors" data-testid="btn-copy">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const PERM_COLORS: Record<string, string> = {
  read:    "bg-blue-900/40 text-blue-300 border-blue-700",
  write:   "bg-green-900/40 text-green-300 border-green-700",
  message: "bg-purple-900/40 text-purple-300 border-purple-700",
  stream:  "bg-orange-900/40 text-orange-300 border-orange-700",
};

export default function DeveloperKeysPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["read"]);
  const [revealedKey, setRevealedKey] = useState<{ key: string; name: string } | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/keys"],
    queryFn: () =>
      fetch("/api/keys", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  const { data: physics } = useQuery<any>({
    queryKey: ["/api/physics/my"],
    queryFn: () =>
      fetch("/api/physics/my", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  });

  const { data: lnBal } = useQuery<{ satsBalance: number }>({
    queryKey: ["/api/lightning/balance"],
    enabled: !!token,
    staleTime: 15_000,
  });
  const mySats = lnBal?.satsBalance ?? 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim(), permissions: newPerms }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Failed to create key");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setRevealedKey({ key: data.key, name: data.apiKey.name });
      setNewKeyName("");
      qc.invalidateQueries({ queryKey: ["/api/keys"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Revoke failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Key revoked" });
      qc.invalidateQueries({ queryKey: ["/api/keys"] });
    },
    onError: () => toast({ title: "Error", description: "Failed to revoke key", variant: "destructive" }),
  });

  const keys: any[] = data?.keys ?? [];
  const activeKeys = keys.filter(k => k.isActive);
  const nm  = physics?.channel?.nm ?? 550;
  const color = nmToRgb(nm);
  const API_KEY_FEE_SATS = 5000;
  const canAffordKey = mySats >= API_KEY_FEE_SATS;

  const togglePerm = (p: string) => {
    setNewPerms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/developer-matrix">
            <button className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-cyan-400" />
              Developer API Keys
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Authenticate external apps with sats-powered API keys. 5,000 sats flat fee — no NXT required.
            </p>
          </div>
        </div>

        {/* Sats balance notice */}
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          canAffordKey
            ? "border-cyan-500/30 bg-cyan-950/30 text-cyan-300"
            : "border-yellow-500/30 bg-yellow-950/30 text-yellow-300"
        }`}>
          <Zap className="w-4 h-4 flex-shrink-0" />
          <span>
            ⚡ Lightning balance: <strong>{mySats.toLocaleString()} sats</strong>
            {!canAffordKey && <span className="ml-2 text-yellow-400/80">— top up {(API_KEY_FEE_SATS - mySats).toLocaleString()} more to create a key</span>}
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Active Keys",   val: activeKeys.length,        color: "text-green-400" },
            { label: "Total Keys",    val: keys.length,              color: "text-white" },
            { label: "Your Band",     val: physics?.channel?.band ?? "—", color: "text-violet-300" },
            { label: "Key Create Fee",val: "5,000 sats",             color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.val}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* One-time key reveal */}
        {revealedKey && (
          <div className="mb-6 rounded-xl border border-green-500/50 bg-green-900/20 p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-semibold">Key created: {revealedKey.name}</span>
            </div>
            <p className="text-xs text-green-400/80 mb-3">
              Store this key now — it will <strong>not</strong> be shown again.
            </p>
            <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-3 py-2.5 border border-green-600/30">
              <code className="text-green-300 font-mono text-sm flex-1 break-all">{revealedKey.key}</code>
              <CopyButton text={revealedKey.key} />
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="mt-3 text-xs text-slate-500 hover:text-slate-300"
            >
              I've saved it — dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create new key */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/60 border-slate-700 p-5">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" /> New API Key
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Key Name</label>
                  <Input
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="e.g. my-bot, production"
                    className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                    data-testid="input-key-name"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Permissions</label>
                  <div className="flex flex-wrap gap-2">
                    {["read", "write", "message", "stream"].map(p => (
                      <button
                        key={p}
                        onClick={() => togglePerm(p)}
                        className={`px-2.5 py-1 rounded text-xs border font-mono transition-all ${
                          newPerms.includes(p)
                            ? PERM_COLORS[p]
                            : "bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-500"
                        }`}
                        data-testid={`perm-${p}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 border-t border-slate-800 pt-3">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  Creates for{" "}
                  <span className="font-mono font-semibold text-yellow-400">5,000 sats</span>
                  <span className="text-slate-600">· flat rate · deducted from ⚡ wallet</span>
                </div>

                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newKeyName.trim() || newPerms.length === 0 || createMutation.isPending || !canAffordKey}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-sm h-9 disabled:opacity-50"
                  data-testid="btn-create-key"
                  title={!canAffordKey ? `Need ${API_KEY_FEE_SATS.toLocaleString()} sats in Lightning wallet` : undefined}
                >
                  {createMutation.isPending ? "Creating…" : canAffordKey ? "Create Key" : "Need 5,000 sats"}
                </Button>
              </div>

              {/* How to use */}
              <div className="mt-5 border-t border-slate-800 pt-4">
                <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <Code className="w-3 h-3" /> Authentication
                </h3>
                <div className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-slate-400 space-y-1">
                  <div className="text-slate-500"># HTTP header</div>
                  <div className="text-green-400">Authorization: Bearer nxt_…</div>
                </div>
              </div>
            </Card>

            {/* Endpoint reference */}
            <Card className="bg-slate-900/60 border-slate-700 p-5 mt-4">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> Endpoints
              </h2>
              <div className="space-y-2">
                {[
                  { method: "GET",  path: "/api/dev/status",          fee: "free",      desc: "Platform health check" },
                  { method: "GET",  path: "/api/dev/wallet",          fee: "free",      desc: "Your balance & transactions" },
                  { method: "GET",  path: "/api/dev/physics/:user",   fee: "free",      desc: "Spectral channel + fees for any user" },
                  { method: "POST", path: "/api/dev/message",         fee: "E=hf NXT",  desc: "Send a message" },
                ].map(e => (
                  <div key={e.path} className="rounded-lg bg-slate-800/50 px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        e.method === "GET" ? "bg-blue-900/50 text-blue-300" : "bg-green-900/50 text-green-300"
                      }`}>{e.method}</span>
                      <code className="text-[10px] text-slate-300 font-mono">{e.path}</code>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{e.desc}</span>
                      <span className={`text-[9px] font-mono ${e.fee === "free" ? "text-slate-600" : "text-cyan-400"}`}>
                        {e.fee}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Key list */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-400" />
              Your Keys
              <span className="text-xs text-slate-500 font-normal">({activeKeys.length} active)</span>
            </h2>

            {isLoading ? (
              <p className="text-slate-500 text-sm">Loading…</p>
            ) : keys.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No API keys yet — create one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {keys.map(k => (
                  <div
                    key={k.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      k.isActive
                        ? "border-slate-700 bg-slate-900/50"
                        : "border-slate-800 bg-slate-900/20 opacity-50"
                    }`}
                    data-testid={`key-card-${k.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold text-sm">{k.name}</span>
                          {!k.isActive && (
                            <Badge variant="outline" className="text-[9px] text-red-400 border-red-800">
                              revoked
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {k.prefix}…
                          </code>
                          <CopyButton text={k.prefix} />
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {(k.permissions as string[]).map(p => (
                            <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${PERM_COLORS[p] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                              {p}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-[10px] text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {fmtDate(k.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Last used {fmtDate(k.lastUsedAt)}
                          </span>
                          {k.expiresAt && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="w-3 h-3" />
                              Expires {fmtDate(k.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {k.isActive && (
                        <button
                          onClick={() => revokeMutation.mutate(k.id)}
                          disabled={revokeMutation.isPending}
                          className="ml-3 p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          data-testid={`btn-revoke-${k.id}`}
                          title="Revoke key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick-start */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" /> Quick-start Examples
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-mono">Check your balance</p>
              <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto">{`curl https://yourapp.replit.app/api/dev/wallet \\
  -H "Authorization: Bearer nxt_YOUR_KEY"`}</pre>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-mono">Send a message</p>
              <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto">{`curl -X POST .../api/dev/message \\
  -H "Authorization: Bearer nxt_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"recipientUsername":"alice","content":"hi"}'`}</pre>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-mono">Get spectral channel for any user</p>
              <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto">{`curl .../api/dev/physics/alice \\
  -H "Authorization: Bearer nxt_YOUR_KEY"`}</pre>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1.5 font-mono">Platform status</p>
              <pre className="bg-slate-950 rounded-lg p-3 text-[10px] font-mono text-slate-300 overflow-x-auto">{`curl .../api/dev/status \\
  -H "Authorization: Bearer nxt_YOUR_KEY"`}</pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
