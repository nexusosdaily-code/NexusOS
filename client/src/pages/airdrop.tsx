import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Relay } from "nostr-tools";
import type { Event as NostrEvent } from "nostr-tools";
import {
  Gift, ArrowLeft, CheckCircle, Clock, Users, Coins,
  Zap, RefreshCw, Plus, TrendingUp, Shield, ChevronDown, ChevronUp,
  Radio, Copy, Check, ExternalLink, AlertCircle,
} from "lucide-react";

// Browser-side relay broadcaster — individual connections for exact error capture
async function publishOneRelay(
  relayUrl: string,
  event: NostrEvent,
): Promise<{ relay: string; ok: boolean; reason?: string }> {
  const CONNECT_MS = 8_000;
  const PUBLISH_MS = 12_000;
  let relay: InstanceType<typeof Relay> | null = null;
  try {
    relay = await Promise.race([
      Relay.connect(relayUrl),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("connect timeout")), CONNECT_MS)
      ),
    ]);
    await Promise.race([
      relay.publish(event),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("publish timeout")), PUBLISH_MS)
      ),
    ]);
    relay.close();
    return { relay: relayUrl, ok: true };
  } catch (e: any) {
    try { relay?.close(); } catch { /* ignore */ }
    return { relay: relayUrl, ok: false, reason: e?.message ?? String(e) };
  }
}

async function broadcastEventFromBrowser(
  signedEvent: NostrEvent,
  relays: string[],
  onProgress: (r: { relay: string; ok: boolean; reason?: string }) => void,
): Promise<{ relay: string; ok: boolean; reason?: string }[]> {
  const results = await Promise.all(
    relays.map(async (relayUrl) => {
      const result = await publishOneRelay(relayUrl, signedEvent);
      onProgress(result);
      return result;
    })
  );
  return results;
}

async function triggerNostrLogin(): Promise<boolean> {
  const w = window as any;
  if (!w.nostr) return false;
  try {
    const pubkey = await w.nostr.getPublicKey();
    const signedEvent = await w.nostr.signEvent({
      kind: 27235, created_at: Math.floor(Date.now() / 1000),
      tags: [["u", "https://wnsp.io"], ["method", "POST"]],
      content: "NexusOS Login", pubkey,
    });
    const res  = await fetch("/api/auth/nostr", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedEvent }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("auth_token", data.token);
    return true;
  } catch { return false; }
}

function fmt(n: number | string, dec = 4) {
  return parseFloat(String(n || 0)).toLocaleString(undefined, { maximumFractionDigits: dec });
}

function ProgressBar({ claimed, total }: { claimed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (claimed / total) * 100) : 0;
  return (
    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AirdropPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate]         = useState(false);
  const [showBroadcast, setShowBroadcast]   = useState(false);
  const [claimedId, setClaimedId]           = useState<number | null>(null);
  const [nostrLoading, setNostrLoading]     = useState<number | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult]   = useState<{
    eventId: string; naddr: string; njumpUrl: string; hablaUrl: string;
    relays: string[]; relayLog: { relay: string; ok: boolean; reason?: string }[];
    signedEvent: object;
  } | null>(null);
  const [relayProgress, setRelayProgress] = useState<{ relay: string; ok: boolean; reason?: string }[]>([]);
  const [showRawJson, setShowRawJson] = useState(false);
  const [noteLoading, setNoteLoading] = useState<string | null>(null);
  const [noteResult, setNoteResult] = useState<{ noteKey: string; eventId: string; relayLog: { relay: string; ok: boolean; reason?: string }[]; accepted: number } | null>(null);
  const [copied, setCopied]                 = useState(false);

  // Create form state
  const [form, setForm] = useState({
    title: "", description: "", emoji: "🎁",
    perClaimNxt: "10", maxClaims: "50", endsAt: "",
  });

  const { data: campaigns, isLoading } = useQuery<any[]>({
    queryKey: ["/api/airdrop/campaigns"],
    queryFn: () => fetch("/api/airdrop/campaigns").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: myClaims } = useQuery<any[]>({
    queryKey: ["/api/airdrop/my-claims"],
    queryFn: () => fetch("/api/airdrop/my-claims", { credentials: "include", headers: getAuthHeaders() }).then(r => r.json()),
    enabled: !!user,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/airdrop/stats"],
    queryFn: () => fetch("/api/airdrop/stats").then(r => r.json()),
    refetchInterval: 60_000,
  });

  const claimMut = useMutation({
    mutationFn: async (campaignId: number) => {
      const r = await fetch(`/api/airdrop/claim/${campaignId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Claim failed");
      return j;
    },
    onSuccess: (d, campaignId) => {
      setClaimedId(campaignId);
      toast({ title: `🎉 ${fmt(d.amountNxt, 4)} NXT received!`, description: `Credited to ${d.walletAddress?.slice(0, 20)}…` });
      qc.invalidateQueries({ queryKey: ["/api/airdrop/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/airdrop/my-claims"] });
      qc.invalidateQueries({ queryKey: ["/api/airdrop/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (e: any) => toast({ title: "Claim failed", description: e.message, variant: "destructive" }),
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/airdrop/campaigns", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...form,
          perClaimNxt: parseFloat(form.perClaimNxt),
          maxClaims:   parseInt(form.maxClaims),
          endsAt:      form.endsAt || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Create failed");
      return j;
    },
    onSuccess: () => {
      toast({ title: "Campaign created!", description: "The airdrop is now live." });
      setShowCreate(false);
      setForm({ title: "", description: "", emoji: "🎁", perClaimNxt: "10", maxClaims: "50", endsAt: "" });
      qc.invalidateQueries({ queryKey: ["/api/airdrop/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/airdrop/stats"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const campaignsArr = Array.isArray(campaigns) ? campaigns : [];
  const myClaimsArr  = Array.isArray(myClaims)  ? myClaims  : [];
  const claimedCampaignIds = new Set(myClaimsArr.map((c: any) => c.campaignId));

  const totalDistributed = stats?.totalDistributed ?? 0;
  const totalClaimants   = stats?.totalClaimants   ?? 0;
  const poolRemaining    = stats?.poolRemaining    ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/5 to-slate-950 p-4 md:p-6">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/wnsp">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 text-sm">Airdrop</span>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NXT Airdrop</h1>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Earn free NXT by participating in NexusOS campaigns.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Coins,       label: "Distributed",  value: `${fmt(totalDistributed, 2)} NXT`, color: "text-amber-400" },
            { icon: Users,       label: "Claimants",    value: String(totalClaimants),            color: "text-blue-400"  },
            { icon: TrendingUp,  label: "Remaining",    value: `${fmt(poolRemaining, 2)} NXT`,    color: "text-green-400" },
          ].map(s => (
            <Card key={s.label} className="bg-slate-900/60 border-slate-700/40 p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
              <div className={`text-sm font-bold mt-0.5 ${s.color}`}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Vote & Earn — Coinsniper feature */}
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-slate-900/60 p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Vote &amp; Earn</span>
            <span className="ml-auto text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5 font-semibold">LIVE</span>
          </div>
          <h2 className="text-base font-bold text-white mb-1">Upvote NXWV on Coinsniper — earn NXT</h2>
          <p className="text-xs text-slate-400 mb-4">1 billion NXT reserved. First 10 voters earn 50M each. Next 50 earn 10M each. First come, first served.</p>

          {/* Tier cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { tier: "Tier 1", spots: "10 spots", reward: "50M NXT", color: "amber", filled: false },
              { tier: "Tier 2", spots: "50 spots", reward: "10M NXT", color: "slate", filled: false },
            ].map(t => (
              <div key={t.tier} className={`rounded-xl border p-3 text-center ${t.color === "amber" ? "border-amber-500/30 bg-amber-500/5" : "border-slate-600/30 bg-slate-800/30"}`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${t.color === "amber" ? "text-amber-400" : "text-slate-400"}`}>{t.tier}</div>
                <div className={`text-lg font-bold ${t.color === "amber" ? "text-amber-300" : "text-white"}`}>{t.reward}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t.spots}</div>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-2 mb-4">
            {[
              { n: "1", text: "Go to Coinsniper and upvote NEXUS•WAVELENGTH", link: "https://coinsniper.net/coin/91963", linkText: "coinsniper.net/coin/91963" },
              { n: "2", text: "Sign in below with Nostr or phone", link: null, linkText: null },
              { n: "3", text: "Claim Tier 1 or Tier 2 campaign from the list", link: null, linkText: null },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-400">{s.n}</div>
                <div className="text-xs text-slate-300 pt-0.5">
                  {s.text}{s.link && <> — <a href={s.link} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">{s.linkText}</a></>}
                </div>
              </div>
            ))}
          </div>

          <a href="https://coinsniper.net/coin/91963" target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
            data-testid="button-coinsniper-vote">
            <ExternalLink className="w-4 h-4" /> Upvote on Coinsniper
          </a>
        </div>

        {/* Campaign cards */}
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading campaigns…
          </div>
        ) : campaignsArr.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-700/40 p-8 text-center">
            <Gift className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <div className="text-slate-500 text-sm">No active campaigns right now.</div>
            <div className="text-slate-600 text-xs mt-1">Check back soon — more drops coming.</div>
          </Card>
        ) : (
          <div className="space-y-4 mb-6">
            {campaignsArr.map((c: any) => {
              const claimed     = claimedCampaignIds.has(c.id);
              const exhausted   = c.status === "exhausted" || c.claimsCount >= c.maxClaims;
              const pctClaimed  = c.maxClaims > 0 ? Math.min(100, (c.claimsCount / c.maxClaims) * 100) : 0;
              const justClaimed = claimedId === c.id;

              return (
                <Card
                  key={c.id}
                  className={`border p-5 transition-all ${
                    justClaimed ? "bg-amber-950/20 border-amber-500/40" :
                    exhausted   ? "bg-slate-900/40 border-slate-700/30 opacity-70" :
                                  "bg-slate-900/60 border-amber-500/20 hover:border-amber-500/40"
                  }`}
                  data-testid={`campaign-card-${c.id}`}
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{c.title}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{c.description}</div>
                      </div>
                    </div>
                    {claimed && !justClaimed && (
                      <Badge className="text-[9px] bg-green-950/40 text-green-300 border-green-500/20 shrink-0">
                        <CheckCircle className="w-2.5 h-2.5 mr-1" /> Claimed
                      </Badge>
                    )}
                    {exhausted && !claimed && (
                      <Badge className="text-[9px] bg-slate-800 text-slate-500 border-slate-600 shrink-0">Exhausted</Badge>
                    )}
                  </div>

                  {/* Per-claim amount */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="text-lg font-bold text-amber-300">{fmt(parseFloat(c.perClaimNxt), 2)}</span>
                      <span className="text-amber-500 text-sm font-semibold">NXT</span>
                    </div>
                    <div className="text-[11px] text-slate-500">per wallet · one claim only</div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                      <span>{c.claimsCount} / {c.maxClaims} claimed</span>
                      <span>{pctClaimed.toFixed(0)}% distributed</span>
                    </div>
                    <ProgressBar claimed={c.claimsCount} total={c.maxClaims} />
                  </div>

                  {/* Requirements */}
                  {c.requirements && c.requirements.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {c.requirements.map((req: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                          <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                          {req}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Claim button */}
                  {justClaimed ? (
                    <div className="flex items-center justify-center gap-2 py-3 bg-green-950/20 border border-green-500/20 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-semibold text-sm">
                        {fmt(parseFloat(c.perClaimNxt), 2)} NXT credited to your wallet!
                      </span>
                    </div>
                  ) : claimed ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 bg-slate-800/40 rounded-xl">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 text-sm">Already claimed</span>
                    </div>
                  ) : !user ? (
                    <div className="space-y-2">
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold"
                        onClick={async () => {
                          const w = window as any;
                          if (!w.nostr) {
                            toast({ title: "No Nostr extension", description: "Install Alby (getalby.com) to claim with your Nostr key.", variant: "destructive" });
                            return;
                          }
                          setNostrLoading(c.id);
                          const ok = await triggerNostrLogin();
                          if (ok) {
                            toast({ title: "⚡ Signed in!", description: "Claiming your NXT now…" });
                            window.location.reload();
                          } else {
                            toast({ title: "Sign-in failed", description: "Could not verify Nostr signature.", variant: "destructive" });
                            setNostrLoading(null);
                          }
                        }}
                        disabled={nostrLoading === c.id}
                        data-testid={`button-nostr-claim-${c.id}`}
                      >
                        {nostrLoading === c.id
                          ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Waiting for signature…</>
                          : <><Zap className="w-4 h-4 mr-2" /> Sign in with Nostr to claim</>
                        }
                      </Button>
                      <p className="text-center text-[10px] text-slate-600">
                        No account needed · wallet auto-created ·{" "}
                        <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Get Alby</a>
                      </p>
                    </div>
                  ) : (
                    <Button
                      className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold"
                      onClick={() => claimMut.mutate(c.id)}
                      disabled={claimMut.isPending || exhausted}
                      data-testid={`button-claim-${c.id}`}
                    >
                      {claimMut.isPending && claimMut.variables === c.id ? (
                        <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Claiming…</>
                      ) : exhausted ? (
                        "Campaign exhausted"
                      ) : (
                        <><Gift className="w-4 h-4 mr-2" /> Claim {fmt(parseFloat(c.perClaimNxt), 2)} NXT</>
                      )}
                    </Button>
                  )}

                  {/* Expiry */}
                  {c.endsAt && (
                    <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-600">
                      <Clock className="w-3 h-3" />
                      Ends {new Date(c.endsAt).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* My claims */}
        {myClaimsArr.length > 0 && (
          <Card className="bg-slate-900/60 border-green-500/20 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-green-400 uppercase tracking-widest">My Claims</span>
            </div>
            <div className="space-y-2">
              {myClaimsArr.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2" data-testid={`claim-row-${i}`}>
                  <div>
                    <div className="text-[11px] text-white font-semibold">{c.campaign?.title ?? `Campaign #${c.campaignId}`}</div>
                    <div className="text-[10px] text-slate-500">{new Date(c.claimedAt).toLocaleDateString()} · {c.psiChannel}</div>
                  </div>
                  <div className="text-green-400 font-bold text-sm">+{fmt(parseFloat(c.amountNxt), 4)} NXT</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Admin — Broadcast Whitepaper to Nostr */}
        {user && (
          <div className="mb-4">
            <button
              onClick={() => setShowBroadcast(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 rounded-xl text-indigo-300 text-sm transition-colors"
              data-testid="button-toggle-broadcast"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Broadcast Whitepaper to Nostr</span>
              </div>
              {showBroadcast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showBroadcast && (
              <Card className="bg-slate-900/70 border-indigo-500/20 p-4 mt-2 space-y-4">

                {/* ── Campaign Notes (kind:1) ── */}
                <div>
                  <div className="text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5" /> Campaign Posts <span className="text-slate-600 font-normal font-mono">kind:1</span>
                  </div>
                  <div className="space-y-2">
                    {([
                      {
                        key: "main",
                        label: "Main Announcement",
                        desc: "Full post — what NexusOS is, why it matters, airdrop + both runes CTA",
                        content: `Bitcoin replaced trust in money. NexusOS replaces trust in the internet itself.

SHA-256 was designed for silicon transistors. Photonic computing arrives ~2032. When it does, every blockchain on earth needs a complete rewrite — except one.

NexusOS is built in the language of the destination hardware from day one:

Instead of SHA-256 → Maxwell's equations
Instead of IP addresses → Ψ(wdm, oam, pol) spectral channels
Instead of arbitrary proof-of-work → E = hf (Planck's energy equation governs fees)

25,600 orthogonal communication channels. Isolated by quantum mechanics, not software policy. No collision is physically possible.

---

We also replace routing itself.

In TCP/IP, the address and the routing decision are separate — a router consults a table, runs BGP, asks OSPF. In WNSP, the address IS the routing decision.

A packet destined for Ψ(72,18,H) routes to whichever active node has the closest wavelength. Score = weight / (Δλ + 1). No lookup table. No BGP. No OSPF. Shannon entropy drives adaptive weight updates so heavily-used routes amplify and contested routes rebalance automatically.

No ICANN. No registrar. No routing authority. No government can deregister a wavelength or poison a routing table.

---

Two live Bitcoin Runes on mainnet:
• NEXUS•WAVELENGTH — Rune ID 952596:379 (open mint, 21T supply)
• WNSP•BTC — Rune ID 952733:1958 (100% premined, 21B supply)

Both AGPL-3.0. Both permanent on Bitcoin.

---

🎁 85,000,000 NXT Nostr Advocacy Airdrop
1,000 NXT per wallet · 85,000 claims · first-come, first-served

Claim in ~10 seconds:
1. Go to wnsp.io/airdrop
2. Click Sign in with Nostr — one sig with Alby or nos2x
3. Your spectral wallet + Ψ channel are assigned automatically
4. 1,000 NXT lands instantly

No email. No form. No KYC. Just your Nostr key.

AGPL-3.0 · First public disclosure: 2026-05-16 · wnsp.io · Ψ(52,3,V)

#nexusos #wnsp #nxt #nostr #bitcoin #photonics #physics`,
                      },
                      {
                        key: "boost",
                        label: "Short Boost",
                        desc: "Quick share — physics hook + both runes + airdrop link",
                        content: `Physics is the new cryptography.

NexusOS replaces SHA-256 with Maxwell's equations. IP addresses with spectral wavelengths. Proof-of-work with E=hf. And BGP/OSPF routing tables with a single formula: score = weight / (Δλ + 1). The address IS the route.

No lookup tables. No routing authority. No government can poison a wavelength.

Two live Bitcoin Runes on mainnet:
NEXUS•WAVELENGTH (952596:379) + WNSP•BTC (952733:1958)

85M NXT airdrop live. Claim with your Nostr key → wnsp.io/airdrop

Full whitepaper on habla.news

#nexusos #wnsp #nostr #bitcoin #nxt`,
                      },
                      {
                        key: "runes",
                        label: "Both Runes Drop",
                        desc: "Focus post on NEXUS•WAVELENGTH + WNSP•BTC — IDs, how to mint",
                        content: `NexusOS has two live Bitcoin Runes on mainnet. Both etched. Both permanent.

NEXUS•WAVELENGTH — Rune ID 952596:379
Open mint · 21 trillion total supply · 1,000 Ψ per mint · 100 NXT mint cost

WNSP•BTC — Rune ID 952733:1958
100% premined · 21 billion supply · mirrors NXT 1:1

Why Runes and not BRC-20?
Runes live in Bitcoin's UTXO set — no inscription indexer, no ord node, no side-chain required. Every token is secured directly by Bitcoin proof-of-work. PSBT-compatible. Atomic-swap ready.

Mint NEXUS•WAVELENGTH → wnsp.io/rune-mint
Full spec → wnsp.io/rune-etching

1,000 sats = 1 NXT. Stack physics.

#NexusWavelength #WnspBTC #Runes #Bitcoin #NXT #NexusOS`,
                      },
                      {
                        key: "hook",
                        label: "Thread Hook",
                        desc: "Opening hook to post before quoting the main announcement",
                        content: `What happens to every blockchain when photonic computing arrives in 2032?

They all need a complete rewrite.

Except NexusOS. Because it was written in the language of photonic hardware from day one.

Two live Bitcoin Runes on mainnet. 85M NXT airdrop. Developer API live.

🧵

#nexusos #wnsp #bitcoin #nostr`,
                      },
                      {
                        key: "devapi",
                        label: "Developer API",
                        desc: "For developer/builder audiences — CE encoder, API endpoints, npm package",
                        content: `NexusOS has a public developer API. Every call has a real wavelength, energy cost, and spectral address.

Build with physics-native primitives:

• CE-encode any text → spectral fingerprint (λ, Ψ channel, energy)
• Resolve Ψ channels for any user — 25,600 orthogonal addresses
• Query physics-priced fees — E=hf governs every action
• Send WNSP messages between spectral addresses
• Query live rune metadata — NEXUS•WAVELENGTH + WNSP•BTC

Install the SDK:
npm install nexusos-ce-encoder
pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py

Published on npm. Bit-identical JS + Python. AGPL-3.0.

API key: 5,000 sats flat fee. No subscription. Pay per action.

wnsp.io/developer

#NexusOS #NXT #WNSP #API #Bitcoin #Developer`,
                      },
                    ] as { key: string; label: string; desc: string; content: string }[]).map(note => (
                      <div key={note.key} className="bg-slate-950/60 rounded-lg border border-slate-700/40 p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="text-[11px] font-semibold text-white">{note.label}</div>
                            <div className="text-[10px] text-slate-500">{note.desc}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-indigo-600/60 text-indigo-400 hover:text-white shrink-0"
                            disabled={noteLoading === note.key}
                            onClick={async () => {
                              setNoteLoading(note.key);
                              setNoteResult(null);
                              let signData: any = null;
                              try {
                                const res = await fetch("/api/admin/nostr/sign-note", {
                                  method: "POST", credentials: "include",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ content: note.content }),
                                });
                                signData = await res.json();
                                if (!res.ok) throw new Error(signData.error || "Sign failed");
                              } catch (e: any) {
                                toast({ title: "Sign failed", description: e.message, variant: "destructive" });
                                setNoteLoading(null);
                                return;
                              }
                              const log: { relay: string; ok: boolean; reason?: string }[] = [];
                              try {
                                const results = await broadcastEventFromBrowser(
                                  signData.signedEvent as NostrEvent,
                                  signData.relays as string[],
                                  (r) => { log.push(r); },
                                );
                                log.splice(0, log.length, ...results);
                              } catch (e: any) {
                                console.error("Note broadcast error:", e);
                              }
                              const accepted = log.filter(r => r.ok).length;
                              setNoteResult({ noteKey: note.key, eventId: signData.id, relayLog: log, accepted });
                              setNoteLoading(null);
                              toast({
                                title: accepted > 0 ? `📡 ${note.label} posted!` : "⚠️ No relays accepted",
                                description: accepted > 0 ? `${accepted}/${log.length} relays accepted` : "Check note result for details",
                              });
                            }}
                          >
                            {noteLoading === note.key
                              ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" /> Posting…</>
                              : <><Radio className="w-3 h-3 mr-1" /> Post</>
                            }
                          </Button>
                        </div>
                        <pre className="text-[9px] text-slate-500 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                          {note.content.slice(0, 160)}…
                        </pre>
                        {/* Result for this specific note */}
                        {noteResult?.noteKey === note.key && (
                          <div className={`mt-2 rounded p-2 text-[10px] border ${noteResult.accepted > 0 ? "bg-green-950/30 border-green-500/20" : "bg-amber-950/30 border-amber-500/20"}`}>
                            <div className={noteResult.accepted > 0 ? "text-green-400 font-semibold mb-1" : "text-amber-400 font-semibold mb-1"}>
                              {noteResult.accepted > 0 ? `✓ ${noteResult.accepted}/${noteResult.relayLog.length} relays accepted` : "✗ All relays rejected"}
                            </div>
                            <div className="space-y-0.5">
                              {noteResult.relayLog.map(r => (
                                <div key={r.relay} className="flex items-center gap-1.5">
                                  <span className={r.ok ? "text-green-400" : "text-red-400"}>{r.ok ? "✓" : "✗"}</span>
                                  <span className="text-slate-500">{r.relay.replace("wss://", "")}</span>
                                  {!r.ok && r.reason && <span className="text-red-400/60 truncate">{r.reason}</span>}
                                </div>
                              ))}
                            </div>
                            <div className="text-slate-600 mt-1 font-mono">event: {noteResult.eventId.slice(0, 20)}…</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-700/40 pt-3">
                  <div className="text-xs font-semibold text-indigo-300 mb-1">NexusOS Physics Whitepaper</div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    Publishes a <span className="text-indigo-400 font-mono">kind:30023</span> long-form article to 8 Nostr relays.
                    Readable on Habla, Blogstack, Yakihonne, and njump.me. Contains the full WNSP physics spec + airdrop CTA.
                  </div>
                </div>

                <div className="bg-slate-950/60 rounded-lg p-3 text-[10px] font-mono text-slate-400 space-y-1 border border-slate-700/40">
                  <div><span className="text-slate-600">title: </span><span className="text-white">NexusOS: A Physics-Native OS for a Kardashev Type I Civilization</span></div>
                  <div><span className="text-slate-600">kind:  </span><span className="text-indigo-300">30023</span> (NIP-23 long-form)</div>
                  <div><span className="text-slate-600">tags:  </span><span className="text-amber-300">#nexusos #wnsp #nxt #nostr #bitcoin #photonics #physics</span></div>
                  <div><span className="text-slate-600">relays:</span> <span className="text-green-400">6 relays</span></div>
                  <div><span className="text-slate-600">airdrop CTA:</span> wnsp.io/airdrop · 85M NXT · Nostr sign-in</div>
                </div>

                {/* Live relay progress during broadcast */}
                {broadcastLoading && relayProgress.length > 0 && (
                  <div className="bg-slate-900/60 rounded-lg border border-slate-700/40 p-2 space-y-0.5">
                    <div className="text-[10px] text-slate-500 mb-1">Publishing from browser…</div>
                    {relayProgress.map(r => (
                      <div key={r.relay} className="flex items-center gap-1.5 text-[10px]">
                        <span className={r.ok ? "text-green-400" : "text-red-400"}>{r.ok ? "✓" : "✗"}</span>
                        <span className="text-slate-500">{r.relay.replace("wss://", "")}</span>
                        {!r.ok && r.reason && <span className="text-red-400/60 truncate">{r.reason}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {broadcastResult && (
                  <div className="space-y-2">
                    {/* Summary header */}
                    <div className={`rounded-lg p-3 border ${broadcastResult.relays.length > 0 ? "bg-green-950/30 border-green-500/30" : "bg-amber-950/30 border-amber-500/30"}`}>
                      <div className={`flex items-center gap-2 text-xs font-semibold mb-2 ${broadcastResult.relays.length > 0 ? "text-green-400" : "text-amber-400"}`}>
                        {broadcastResult.relays.length > 0
                          ? <><CheckCircle className="w-3.5 h-3.5" /> Published to {broadcastResult.relays.length}/{broadcastResult.relayLog.length} relays</>
                          : <><AlertCircle className="w-3.5 h-3.5" /> All relays rejected — see raw JSON below</>
                        }
                      </div>

                      {/* Per-relay result rows */}
                      <div className="space-y-0.5 mb-2">
                        {broadcastResult.relayLog.map(r => (
                          <div key={r.relay} className="flex items-start gap-1.5 text-[10px]">
                            <span className={r.ok ? "text-green-400" : "text-red-400"}>{r.ok ? "✓" : "✗"}</span>
                            <span className="text-slate-500 shrink-0">{r.relay.replace("wss://", "")}</span>
                            {!r.ok && r.reason && <span className="text-red-400/70 truncate max-w-[200px]">{r.reason}</span>}
                          </div>
                        ))}
                      </div>

                      {/* naddr */}
                      <div className="text-[10px] font-mono text-indigo-300 break-all mb-2">
                        {broadcastResult.naddr.slice(0, 52)}…
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline"
                          className="text-xs border-slate-700 text-slate-400 hover:text-white"
                          onClick={() => { navigator.clipboard.writeText(broadcastResult.naddr); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                          {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copied ? "Copied!" : "Copy naddr"}
                        </Button>
                        {broadcastResult.relays.length > 0 && (
                          <>
                            <a href={broadcastResult.njumpUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="text-xs border-indigo-700 text-indigo-400 hover:text-white">
                                <ExternalLink className="w-3 h-3 mr-1" />njump.me
                              </Button>
                            </a>
                            <a href={broadcastResult.hablaUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="text-xs border-purple-700 text-purple-400 hover:text-white">
                                <ExternalLink className="w-3 h-3 mr-1" />habla.news
                              </Button>
                            </a>
                          </>
                        )}
                        <Button size="sm" variant="outline"
                          className="text-xs border-slate-700 text-slate-500 hover:text-white"
                          onClick={() => setShowRawJson(v => !v)}>
                          {showRawJson ? "Hide JSON" : "Raw JSON"}
                        </Button>
                      </div>
                    </div>

                    {/* Raw signed event — copy full JSON to use with any relay tool */}
                    {showRawJson && (
                      <div className="bg-slate-950 rounded-lg border border-slate-700/40 p-2">
                        <div className="text-[10px] text-slate-500 mb-1 flex items-center justify-between">
                          <span>Signed event — paste full JSON into <a href="https://nostr.guru/#broadcast" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">nostr.guru/broadcast</a></span>
                          <button
                            onClick={() => { navigator.clipboard.writeText(JSON.stringify(broadcastResult.signedEvent, null, 2)); }}
                            className="text-indigo-400 hover:text-white ml-2 text-[10px]"
                          >copy all</button>
                        </div>
                        <pre className="text-[9px] text-slate-400 overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
                          {JSON.stringify(broadcastResult.signedEvent, null, 2).slice(0, 500)}…
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  disabled={broadcastLoading}
                  onClick={async () => {
                    setBroadcastLoading(true);
                    setBroadcastResult(null);
                    setRelayProgress([]);
                    let signData: any = null;
                    try {
                      // Step 1 — server signs the event (private key never leaves server)
                      const res = await fetch("/api/admin/nostr/sign-whitepaper", {
                        method: "POST", credentials: "include",
                        headers: { "Content-Type": "application/json" },
                      });
                      signData = await res.json();
                      if (!res.ok) throw new Error(signData.error || "Sign failed");
                    } catch (e: any) {
                      toast({ title: "Signing failed", description: e.message, variant: "destructive" });
                      setBroadcastLoading(false);
                      return;
                    }

                    // Step 2 — browser publishes the pre-signed event to relays
                    // Always show result panel even if all relays reject
                    let log: { relay: string; ok: boolean; reason?: string }[] = [];
                    try {
                      log = await broadcastEventFromBrowser(
                        signData.signedEvent as NostrEvent,
                        signData.relays as string[],
                        (r) => setRelayProgress(prev => [...prev, r]),
                      );
                    } catch (e: any) {
                      // broadcastEventFromBrowser never throws — this is a safety net
                      console.error("Broadcast error:", e);
                    }

                    const accepted = log.filter(r => r.ok).map(r => r.relay);
                    setBroadcastResult({
                      eventId: signData.id,
                      naddr: signData.naddr,
                      njumpUrl: signData.njumpUrl,
                      hablaUrl: signData.hablaUrl,
                      relays: accepted,
                      relayLog: log,
                      signedEvent: signData.signedEvent,
                    });
                    setBroadcastLoading(false);
                    toast({
                      title: accepted.length > 0 ? "📡 Whitepaper published!" : "⚠️ No relays accepted",
                      description: accepted.length > 0
                        ? `${accepted.length}/${signData.relays.length} relays · check panel for links`
                        : "See relay log for reasons — use Raw JSON to post manually",
                    });
                  }}
                  data-testid="button-broadcast-whitepaper"
                >
                  {broadcastLoading
                    ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> {relayProgress.length === 0 ? "Signing…" : `Publishing… (${relayProgress.length}/${8} relays)`}</>
                    : <><Radio className="w-4 h-4 mr-2" /> Publish Whitepaper to Nostr</>
                  }
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Admin — Create campaign (genesis/admin user only) */}
        {user && (
          <div className="mb-6">
            <button
              onClick={() => setShowCreate(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-slate-700/40 border border-slate-700/40 rounded-xl text-slate-400 text-sm transition-colors"
              data-testid="button-toggle-create"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Admin — Create Campaign</span>
              </div>
              {showCreate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCreate && (
              <Card className="bg-slate-900/70 border-purple-500/20 p-4 mt-2">
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2">
                    <div className="col-span-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">Emoji</label>
                      <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white text-center text-xl mt-1 px-2" maxLength={2}
                        data-testid="input-emoji" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">Title</label>
                      <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Genesis Airdrop Wave 1" className="bg-slate-800 border-slate-700 text-white mt-1"
                        data-testid="input-title" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Description</label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Earn free NXT for being an early NexusOS adopter."
                      className="bg-slate-800 border-slate-700 text-white mt-1 resize-none h-16 text-sm"
                      data-testid="input-description" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">NXT per claim</label>
                      <Input type="number" value={form.perClaimNxt}
                        onChange={e => setForm(f => ({ ...f, perClaimNxt: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white font-mono mt-1"
                        data-testid="input-per-claim" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider">Max claims</label>
                      <Input type="number" value={form.maxClaims}
                        onChange={e => setForm(f => ({ ...f, maxClaims: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white font-mono mt-1"
                        data-testid="input-max-claims" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">End date (optional)</label>
                    <Input type="date" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white mt-1"
                      data-testid="input-ends-at" />
                  </div>
                  {(() => {
                    const total = parseFloat(form.perClaimNxt || "0") * parseInt(form.maxClaims || "0");
                    const sats  = total * 1_000;
                    const overCeiling = total > 85_000_000;
                    return (
                      <div className={`rounded-xl p-2.5 text-[11px] flex items-start gap-2 ${overCeiling ? "bg-red-950/20 border border-red-500/30 text-red-300/80" : "bg-amber-950/20 border border-amber-500/20 text-amber-300/70"}`}>
                        <Zap className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${overCeiling ? "text-red-400" : "text-amber-400"}`} />
                        <span>
                          Total pool: <strong className={overCeiling ? "text-red-300" : "text-amber-300"}>{fmt(total, 0)} NXT</strong>
                          {" "}({fmt(sats, 0)} sats) — distributed from genesis wallet, zero fee.
                          {overCeiling
                            ? " ⚠️ Exceeds 85M NXT campaign ceiling."
                            : " Campaign ceiling: 85M NXT = 85B sats."}
                        </span>
                      </div>
                    );
                  })()}
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                    onClick={() => createMut.mutate()}
                    disabled={createMut.isPending || !form.title || !form.description || !form.perClaimNxt || !form.maxClaims}
                    data-testid="button-create-campaign"
                  >
                    {createMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Launch Campaign
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="flex justify-center gap-6 text-[11px] text-slate-600">
          <Link href="/portfolio" className="hover:text-slate-400">Portfolio</Link>
          <Link href="/wallet" className="hover:text-slate-400">Wallet</Link>
          <Link href="/nxt-campaign" className="hover:text-slate-400">NXT Campaign</Link>
        </div>
      </div>
    </div>
  );
}
