import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChannelConnect } from "@/components/channel-connect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ShoppingBag, Tag, Zap, Bitcoin, Gem, Plus, X,
  Clock, CheckCircle2, TrendingUp, Filter, RefreshCw, Atom,
  CircleDollarSign, ArrowRight, Store,
} from "lucide-react";

const ASSET_TYPES = [
  { id: "all",       label: "All",          icon: <Store className="w-3.5 h-3.5" /> },
  { id: "wnsp_brc20",label: "wnsp BRC-20",  icon: <Bitcoin className="w-3.5 h-3.5 text-orange-400" /> },
  { id: "rune",      label: "Runes",         icon: <Gem className="w-3.5 h-3.5 text-purple-400" /> },
  { id: "ordinal",   label: "Ordinals",      icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> },
];

function assetBadge(type: string) {
  if (type === "wnsp_brc20") return <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px]"><Bitcoin className="w-2.5 h-2.5 mr-1" />BRC-20</Badge>;
  if (type === "rune")        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]"><Gem className="w-2.5 h-2.5 mr-1" />Rune</Badge>;
  return                             <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-[10px]"><Zap className="w-2.5 h-2.5 mr-1" />Ordinal</Badge>;
}

function fmtNxt(n: string | number) {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v >= 1e6) return (v / 1e6).toFixed(3) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(3) + "K";
  return v.toFixed(2);
}

function fmtTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export default function MarketplacePage() {
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [filter, setFilter]     = useState("all");
  const [showList, setShowList]  = useState(false);
  const [form, setForm]          = useState({
    assetType: "wnsp_brc20", assetId: "", assetName: "wnsp",
    amount: "1000", priceNxt: "", priceSats: "", description: "",
  });

  const { data: statsData }   = useQuery<any>({ queryKey: ["/api/marketplace/stats"], refetchInterval: 30_000 });
  const { data: listingsData, refetch } = useQuery<any>({
    queryKey: ["/api/marketplace/listings", filter],
    queryFn: () => fetch(`/api/marketplace/listings${filter !== "all" ? `?assetType=${filter}` : ""}`, { credentials: "include" }).then(r => r.json()),
    refetchInterval: 15_000,
  });
  const { data: myData } = useQuery<any>({
    queryKey: ["/api/marketplace/my-listings"],
    enabled: !!user,
    refetchInterval: 15_000,
  });
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet"] });

  const createListing = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/marketplace/list", {
        assetType: form.assetType,
        assetId: form.assetId,
        assetName: form.assetName,
        amount: parseInt(form.amount),
        priceNxt: parseFloat(form.priceNxt),
        priceSats: form.priceSats ? parseInt(form.priceSats) : undefined,
        description: form.description || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Listed!", description: "Your asset is now on the marketplace." });
      setShowList(false);
      setForm({ assetType: "wnsp_brc20", assetId: "", assetName: "wnsp", amount: "1000", priceNxt: "", priceSats: "", description: "" });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/stats"] });
    },
    onError: (e: any) => toast({ title: "List failed", description: e.message, variant: "destructive" }),
  });

  const buyListing = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/marketplace/buy/${id}`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "✅ Purchased!", description: `Paid ${fmtNxt(data.paid)} NXT (incl. ${fmtNxt(data.fee)} NXT fee)` });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (e: any) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  const cancelListing = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/marketplace/cancel/${id}`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Listing cancelled" });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
    },
    onError: (e: any) => toast({ title: "Cancel failed", description: e.message, variant: "destructive" }),
  });

  const listings   = listingsData?.listings ?? [];
  const myListings = myData?.listings ?? [];
  const nxtBal     = walletData?.wallet ? parseFloat(walletData.wallet.balance) / 1e8 : 0;
  const activeOwn  = myListings.filter((l: any) => l.status === "active");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/nexus-command">
            <button className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-white">NexusOS Marketplace</h1>
              <p className="text-xs text-slate-400">Trade BRC-20 · Runes · Ordinals with NXT</p>
            </div>
          </div>
          <div className="flex-1" />
          {user && (
            <Button
              onClick={() => setShowList(true)}
              className="bg-cyan-600 hover:bg-cyan-700 gap-1.5"
              data-testid="button-create-listing"
            >
              <Plus className="w-4 h-4" />List Asset
            </Button>
          )}
        </div>

        <ChannelConnect label="Top up ⚡" />

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Active Listings", val: statsData?.activeListings ?? 0, icon: <Tag className="w-4 h-4 text-cyan-400" />, color: "text-cyan-300" },
            { label: "Total Sales",     val: statsData?.totalSales ?? 0,     icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, color: "text-green-300" },
            { label: "Volume (NXT)",    val: fmtNxt(statsData?.volumeNxt ?? 0), icon: <TrendingUp className="w-4 h-4 text-amber-400" />, color: "text-amber-300" },
          ].map(s => (
            <Card key={s.label} className="bg-slate-900/60 border-slate-700/50 p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <div className={`text-lg font-bold font-mono ${s.color}`}>{s.val}</div>
                <div className="text-[10px] text-slate-500">{s.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Asset filter tabs ── */}
        <div className="flex gap-1 mb-5 bg-slate-900/50 rounded-lg p-1">
          {ASSET_TYPES.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-all ${
                filter === t.id ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
              }`}
              data-testid={`filter-${t.id}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
          <button onClick={() => refetch()} className="px-3 text-slate-600 hover:text-slate-300">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── My Active Listings ── */}
        {user && activeOwn.length > 0 && (
          <div className="mb-5">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Your Active Listings</div>
            <div className="space-y-2">
              {activeOwn.map((l: any) => (
                <Card key={l.id} className="bg-cyan-900/10 border-cyan-500/20 p-3 flex items-center gap-3">
                  {assetBadge(l.assetType)}
                  <span className="text-white font-mono text-sm flex-1">{l.assetName}</span>
                  <span className="text-slate-400 text-xs font-mono">{l.amount.toLocaleString()} units</span>
                  <span className="text-amber-300 font-mono text-sm">{fmtNxt(l.priceNxt)} NXT</span>
                  <button onClick={() => cancelListing.mutate(l.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors" title="Cancel listing">
                    <X className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Listings grid ── */}
        {listings.length === 0 ? (
          <Card className="bg-slate-900/40 border-slate-700/30 p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <div className="text-slate-500 text-sm">No active listings yet.</div>
            {user && <div className="text-slate-600 text-xs mt-1">Be the first — click "List Asset" to get started.</div>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((l: any) => {
              const isOwn    = l.sellerId === user?.id;
              const total    = parseFloat(l.priceNxt) * 1.025;
              const canAfford = nxtBal >= total;
              return (
                <Card key={l.id} className="bg-slate-900/60 border-slate-700/50 p-4 flex flex-col gap-3 hover:border-cyan-500/30 transition-colors"
                  data-testid={`card-listing-${l.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    {assetBadge(l.assetType)}
                    <span className="text-[10px] font-mono text-slate-600">{fmtTime(l.createdAt)}</span>
                  </div>
                  <div>
                    <div className="text-white font-bold font-mono text-base">{l.assetName}</div>
                    <div className="text-slate-500 text-xs font-mono truncate">{l.assetId}</div>
                    {l.description && <div className="text-slate-400 text-xs mt-1 line-clamp-2">{l.description}</div>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Atom className="w-3 h-3" />
                    <span>{l.amount.toLocaleString()} units</span>
                    {l.priceSats && <><Bitcoin className="w-3 h-3 text-orange-400" /><span className="text-orange-300">{l.priceSats.toLocaleString()} sats</span></>}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800">
                    <div>
                      <div className="text-amber-300 font-bold font-mono text-lg">{fmtNxt(l.priceNxt)}</div>
                      <div className="text-[10px] text-slate-600 font-mono">NXT · +2.5% fee</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-[10px] text-slate-600">by {l.sellerUsername}</div>
                      {!isOwn && user ? (
                        <Button size="sm"
                          onClick={() => buyListing.mutate(l.id)}
                          disabled={buyListing.isPending || !canAfford}
                          className={`gap-1 text-xs ${canAfford ? "bg-cyan-600 hover:bg-cyan-700" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                          title={canAfford ? undefined : `Need ${total.toFixed(2)} NXT`}
                          data-testid={`button-buy-${l.id}`}
                        >
                          {canAfford ? <><CircleDollarSign className="w-3 h-3" />Buy</> : "Low NXT"}
                        </Button>
                      ) : isOwn ? (
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">Your listing</Badge>
                      ) : (
                        <Link href="/auth">
                          <Button size="sm" className="bg-slate-700 hover:bg-slate-600 text-xs gap-1">
                            <ArrowRight className="w-3 h-3" />Login
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Create Listing Modal ── */}
        {showList && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-700 p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5 text-cyan-400" />List an Asset
                </h2>
                <button onClick={() => setShowList(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Asset Type</Label>
                <div className="flex gap-2">
                  {[
                    { id: "wnsp_brc20", label: "wnsp BRC-20" },
                    { id: "rune",       label: "Rune" },
                    { id: "ordinal",    label: "Ordinal" },
                  ].map(t => (
                    <button key={t.id}
                      onClick={() => setForm(f => ({ ...f, assetType: t.id, assetName: t.id === "wnsp_brc20" ? "wnsp" : "" }))}
                      className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all ${
                        form.assetType === t.id ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >{t.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Asset Name</Label>
                <Input value={form.assetName} onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))}
                  className="bg-slate-800 border-slate-700 font-mono" placeholder="wnsp / NEXUS•WAVELENGTH"
                  data-testid="input-asset-name" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  {form.assetType === "rune" ? "Rune ID (BLOCK:TX)" : "Inscription ID"}
                </Label>
                <Input value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
                  className="bg-slate-800 border-slate-700 font-mono text-xs"
                  placeholder={form.assetType === "rune" ? "840000:1" : "abc123...i0"}
                  data-testid="input-asset-id" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Amount (units)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="bg-slate-800 border-slate-700 font-mono" placeholder="1000"
                    data-testid="input-amount" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs">Price (NXT)</Label>
                  <Input type="number" value={form.priceNxt} onChange={e => setForm(f => ({ ...f, priceNxt: e.target.value }))}
                    className="bg-slate-800 border-slate-700 font-mono" placeholder="500"
                    data-testid="input-price-nxt" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Price in Sats (optional)</Label>
                <Input type="number" value={form.priceSats} onChange={e => setForm(f => ({ ...f, priceSats: e.target.value }))}
                  className="bg-slate-800 border-slate-700 font-mono" placeholder="50000"
                  data-testid="input-price-sats" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Description (optional)</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="bg-slate-800 border-slate-700" placeholder="What makes this special…"
                  data-testid="input-description" />
              </div>

              {form.priceNxt && (
                <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Listing price</span>
                    <span className="text-amber-300 font-mono">{fmtNxt(parseFloat(form.priceNxt) || 0)} NXT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Buyer pays (incl. 2.5% fee)</span>
                    <span className="text-white font-mono">{fmtNxt((parseFloat(form.priceNxt) || 0) * 1.025)} NXT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>You receive</span>
                    <span className="text-green-300 font-mono">{fmtNxt(parseFloat(form.priceNxt) || 0)} NXT</span>
                  </div>
                </div>
              )}

              <Button
                onClick={() => createListing.mutate()}
                disabled={createListing.isPending || !form.assetId || !form.priceNxt}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-submit-listing"
              >
                {createListing.isPending ? "Creating listing…" : "Create Listing"}
              </Button>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
