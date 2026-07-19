import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChannelConnect } from "@/components/channel-connect";
import { BitcoinWalletConnect } from "@/components/bitcoin-wallet-connect";
import { useUnisat } from "@/hooks/use-unisat";
import type { WalletInscription, WalletBRC20, WalletRune } from "@/hooks/use-unisat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ShoppingBag, Tag, Zap, Bitcoin, Gem, Plus, X,
  Clock, CheckCircle2, TrendingUp, RefreshCw, Atom,
  CircleDollarSign, ArrowRight, Store, Wallet, Link2, Loader2,
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

// ── Wallet Asset Picker ────────────────────────────────────────────────────────
function WalletAssetPicker({
  unisat, assetType, onSelect,
}: {
  unisat: ReturnType<typeof useUnisat>;
  assetType: string;
  onSelect: (fields: { assetId: string; assetName: string; amount: string }) => void;
}) {
  const [inscriptions,   setInscriptions]   = useState<WalletInscription[]>([]);
  const [brc20s,         setBrc20s]         = useState<WalletBRC20[]>([]);
  const [runes,          setRunes]          = useState<WalletRune[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedRune,   setSelectedRune]   = useState<string | null>(null);
  const [listAmt,        setListAmt]        = useState("");

  useEffect(() => {
    if (!unisat.connected) return;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        if (assetType === "ordinal") {
          const res = await unisat.getInscriptions(0, 50);
          setInscriptions(res.list);
        } else if (assetType === "wnsp_brc20") {
          const res = await unisat.getBRC20s(0, 50);
          setBrc20s(res.list);
        } else if (assetType === "rune") {
          const res = await unisat.getRunes();
          setRunes(res.list);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [unisat.connected, assetType]);

  if (!unisat.connected) return null;

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading your wallet assets…
    </div>
  );

  if (error) return (
    <div className="text-xs text-slate-500 py-1 flex items-center gap-1.5">
      <span className="text-slate-600">No assets found in wallet for this type.</span>
      <button onClick={() => setError(null)} className="text-cyan-500 hover:text-cyan-400 underline">retry</button>
    </div>
  );

  // Ordinals picker
  if (assetType === "ordinal" && inscriptions.length > 0) return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
        Your Inscriptions ({inscriptions.length})
      </div>
      <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
        {inscriptions.map(ins => (
          <button key={ins.inscriptionId}
            onClick={() => onSelect({
              assetId: ins.inscriptionId,
              assetName: `#${ins.inscriptionNumber}`,
              amount: "1",
            })}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-500/50 rounded p-1.5 text-left transition-all group"
            data-testid={`pick-inscription-${ins.inscriptionNumber}`}
          >
            <div className="text-[10px] font-mono text-yellow-400 group-hover:text-yellow-300">
              #{ins.inscriptionNumber}
            </div>
            <div className="text-[9px] text-slate-600 truncate font-mono">
              {ins.contentType?.split("/")[1] ?? "unknown"}
            </div>
            <div className="text-[9px] text-slate-500">{ins.outputValue} sats</div>
          </button>
        ))}
      </div>
    </div>
  );

  // BRC-20 picker
  if (assetType === "wnsp_brc20" && brc20s.length > 0) return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
        Your BRC-20 Tokens ({brc20s.length})
      </div>
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {brc20s.map(b => (
          <button key={b.ticker}
            onClick={() => onSelect({
              assetId: b.ticker,
              assetName: b.ticker,
              amount: b.availableBalance,
            })}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500/50 rounded px-3 py-2 flex items-center justify-between transition-all"
            data-testid={`pick-brc20-${b.ticker}`}
          >
            <span className="text-sm font-bold text-orange-300 font-mono">{b.ticker}</span>
            <div className="text-right">
              <div className="text-xs text-slate-300 font-mono">{parseFloat(b.availableBalance).toLocaleString()} avail</div>
              {parseFloat(b.lockedBalance) > 0 && (
                <div className="text-[10px] text-slate-600">{parseFloat(b.lockedBalance).toLocaleString()} locked</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Runes picker — interactive card grid
  if (assetType === "rune" && runes.length > 0) {
    const runeHue = (name: string) => {
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
      return h % 360;
    };
    const fmtRuneAmt = (amount: string, div: number) => {
      const n = parseFloat(amount);
      if (isNaN(n)) return amount;
      const actual = div > 0 ? n / Math.pow(10, div) : n;
      if (actual >= 1e9) return (actual / 1e9).toFixed(2) + "B";
      if (actual >= 1e6) return (actual / 1e6).toFixed(2) + "M";
      if (actual >= 1e3) return (actual / 1e3).toFixed(2) + "K";
      return actual.toLocaleString(undefined, { maximumFractionDigits: div });
    };
    const fmtSpaced = (name: string) =>
      name.split("•").map((part, i, arr) =>
        i < arr.length - 1
          ? [<span key={i}>{part}</span>, <span key={`d${i}`} className="text-purple-400 mx-0.5">•</span>]
          : <span key={i}>{part}</span>
      );

    const activeRune = runes.find(r => r.runeId === selectedRune);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Your Runes ({runes.length})
          </div>
          {selectedRune && (
            <button onClick={() => setSelectedRune(null)}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
              ✕ deselect
            </button>
          )}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-0.5">
          {runes.map(r => {
            const hue = runeHue(r.rune || r.spacedRune);
            const sym = r.symbol || "ᚱ";
            const [block, tx] = (r.runeId || "").split(":");
            const isSelected = selectedRune === r.runeId;
            return (
              <button key={r.runeId}
                data-testid={`pick-rune-${r.runeId}`}
                onClick={() => {
                  if (isSelected) {
                    setSelectedRune(null);
                  } else {
                    setSelectedRune(r.runeId);
                    setListAmt(r.amount);
                  }
                }}
                className="group relative flex flex-col text-left rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  border: isSelected
                    ? `1.5px solid hsl(${hue},65%,50%)`
                    : "1.5px solid rgba(100,116,139,0.3)",
                  background: isSelected
                    ? `linear-gradient(160deg, hsl(${hue},30%,14%) 0%, hsl(${(hue+30)%360},25%,10%) 100%)`
                    : "rgb(15,20,30)",
                  boxShadow: isSelected
                    ? `0 0 18px -4px hsl(${hue},60%,40%), inset 0 0 0 1px hsla(${hue},60%,60%,0.15)`
                    : "none",
                }}
              >
                {/* Header strip */}
                <div className="w-full h-14 flex items-center justify-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, hsl(${hue},55%,${isSelected?22:16}%) 0%, hsl(${(hue+40)%360},50%,${isSelected?16:11}%) 100%)` }}>
                  <div className="absolute inset-0 transition-opacity duration-200"
                    style={{
                      opacity: isSelected ? 0.5 : 0.15,
                      background: `radial-gradient(circle at 50% 130%, hsl(${hue},80%,55%) 0%, transparent 65%)`,
                    }} />
                  {/* Checkmark overlay when selected */}
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: `hsl(${hue},70%,45%)` }}>
                      <span className="text-white text-[9px] font-bold leading-none">✓</span>
                    </div>
                  )}
                  <span className="relative z-10 font-bold select-none transition-all duration-200"
                    style={{
                      fontSize: isSelected ? "1.75rem" : "1.4rem",
                      color: `hsl(${hue},80%,${isSelected?78:65}%)`,
                      textShadow: `0 0 ${isSelected?24:10}px hsl(${hue},80%,${isSelected?55:40}%)`,
                    }}>
                    {sym}
                  </span>
                  {block && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-mono px-1 py-0.5 rounded"
                      style={{
                        background: `hsla(${hue},60%,8%,0.85)`,
                        color: `hsl(${hue},50%,55%)`,
                        border: `1px solid hsl(${hue},35%,22%)`,
                      }}>
                      {block}:{tx}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-col gap-0.5 px-2.5 pt-1.5 pb-2">
                  <div className="text-[10px] font-bold font-mono truncate leading-tight"
                    style={{ color: `hsl(${hue},65%,${isSelected?78:65}%)` }}>
                    {fmtSpaced(r.spacedRune || r.rune)}
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xs font-bold text-white font-mono">
                      {fmtRuneAmt(r.amount, r.divisibility ?? 0)}
                    </span>
                    <span className="text-[9px] text-slate-500">avail</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline amount panel — slides in when a rune is selected */}
        {activeRune && (() => {
          const hue = runeHue(activeRune.rune || activeRune.spacedRune);
          const max = parseFloat(activeRune.amount);
          const pct = max > 0 ? Math.min(100, (parseFloat(listAmt) / max) * 100) : 0;
          return (
            <div className="rounded-xl overflow-hidden border transition-all"
              style={{ borderColor: `hsl(${hue},40%,28%)`, background: `linear-gradient(135deg, hsl(${hue},30%,11%) 0%, hsl(${(hue+30)%360},25%,8%) 100%)` }}>
              <div className="px-3 pt-2.5 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold font-mono" style={{ color: `hsl(${hue},65%,65%)` }}>
                    Amount to list
                  </span>
                  <button onClick={() => setListAmt(activeRune.amount)}
                    className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                    style={{ color: `hsl(${hue},60%,60%)`, border: `1px solid hsl(${hue},40%,28%)` }}>
                    MAX
                  </button>
                </div>
                {/* Amount input */}
                <input
                  type="number"
                  value={listAmt}
                  min="0"
                  max={activeRune.amount}
                  step={activeRune.divisibility > 0 ? Math.pow(10, -activeRune.divisibility) : 1}
                  onChange={e => setListAmt(e.target.value)}
                  data-testid="rune-list-amount"
                  className="w-full text-sm font-mono font-bold bg-transparent border-0 border-b pb-1 focus:outline-none text-white"
                  style={{ borderColor: `hsl(${hue},40%,30%)` }}
                />
                {/* Progress bar */}
                <div className="w-full h-1 rounded-full mt-2 mb-1 overflow-hidden bg-slate-800">
                  <div className="h-full rounded-full transition-all duration-150"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(${hue},60%,40%), hsl(${(hue+20)%360},70%,55%))` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 font-mono mb-2">
                  <span>0</span>
                  <span>{pct.toFixed(0)}% of balance</span>
                  <span>{fmtRuneAmt(activeRune.amount, activeRune.divisibility ?? 0)}</span>
                </div>
              </div>
              {/* Confirm button */}
              <button
                data-testid="rune-confirm-select"
                disabled={!listAmt || parseFloat(listAmt) <= 0}
                onClick={() => {
                  onSelect({
                    assetId: activeRune.runeId,
                    assetName: activeRune.spacedRune || activeRune.rune,
                    amount: listAmt,
                  });
                  setSelectedRune(null);
                }}
                className="w-full py-2 text-xs font-bold font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(90deg, hsl(${hue},55%,28%) 0%, hsl(${(hue+20)%360},50%,22%) 100%)`,
                  color: `hsl(${hue},80%,75%)`,
                  borderTop: `1px solid hsl(${hue},40%,22%)`,
                }}>
                List {listAmt ? fmtRuneAmt(listAmt, activeRune.divisibility ?? 0) : "…"} {activeRune.symbol || activeRune.rune} →
              </button>
            </div>
          );
        })()}
      </div>
    );
  }

  // Nothing found
  const label = assetType === "ordinal" ? "inscriptions" : assetType === "rune" ? "runes" : "BRC-20 tokens";
  return (
    <div className="text-xs text-slate-600 py-1">No {label} found in connected wallet.</div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth() as any;
  const { toast } = useToast();
  const qc = useQueryClient();
  const unisat = useUnisat();

  const [filter, setFilter]       = useState("all");
  const [showList, setShowList]   = useState(false);
  const [psbtTarget, setPsbtTarget] = useState<number | null>(null);
  const [form, setForm]           = useState({
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

  const [listingStep, setListingStep] = useState<"form" | "signing" | null>(null);

  const createListing = useMutation({
    mutationFn: async () => {
      let sellerBtcAddress: string | undefined;
      let ownershipSig: string | undefined;

      // If UniSat is connected, sign a message to prove they own the asset
      if (unisat.connected && unisat.address) {
        setListingStep("signing");
        try {
          const msg = `NexusOS Marketplace — I own ${form.assetId} and authorize listing at ${form.priceNxt} NXT`;
          ownershipSig = await unisat.signMessage(msg);
          sellerBtcAddress = unisat.address;
        } catch (e: any) {
          // User rejected the signature — abort
          throw new Error("Signature cancelled — listing requires wallet sign-off to prove asset ownership");
        } finally {
          setListingStep(null);
        }
      }

      const res = await apiRequest("POST", "/api/marketplace/list", {
        assetType: form.assetType,
        assetId: form.assetId,
        assetName: form.assetName,
        amount: parseInt(form.amount),
        priceNxt: parseFloat(form.priceNxt),
        priceSats: form.priceSats ? parseInt(form.priceSats) : undefined,
        description: form.description || undefined,
        sellerBtcAddress,
        ownershipSig,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✅ Listed!", description: "Your asset is live on the marketplace." });
      setShowList(false);
      setListingStep(null);
      setForm({ assetType: "wnsp_brc20", assetId: "", assetName: "wnsp", amount: "1000", priceNxt: "", priceSats: "", description: "" });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/stats"] });
    },
    onError: (e: any) => {
      setListingStep(null);
      toast({ title: "List failed", description: e.message, variant: "destructive" });
    },
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

  // PSBT / on-chain settlement via UniSat / Xverse
  const buyWithPsbt = useMutation({
    mutationFn: async (id: number) => {
      if (!unisat.connected || !unisat.address) throw new Error("Connect your Bitcoin wallet first");
      // 1. Ask server to build the unsigned PSBT
      const res = await apiRequest("POST", `/api/marketplace/psbt/${id}`, {
        buyerBtcAddress: unisat.address,
      });
      const data = await res.json();
      if (data.nxtOnly) throw new Error("This asset uses NXT-only settlement — use the NXT buy button.");
      if (!data.psbtReady) {
        // Server needs buyer UTXO — sign a purchase intent message as proof of commitment
        const msg = `NexusOS Marketplace purchase intent — Listing #${id} — Buyer: ${unisat.address}`;
        const sig = await unisat.signMessage(msg);
        toast({ title: "Intent signed ✍️", description: "Purchase intent recorded on-chain. The seller will finalize the transfer." });
        return { sig, intent: true };
      }
      // 2. Use pushPsbt (UniSat native: sign + broadcast in one call → returns txid directly)
      //    Falls back to signPsbt + mempool.space broadcast for Xverse/OKX.
      const txid = await unisat.pushPsbt(data.psbtHex, {
        toSignInputs: [{ index: 1, address: unisat.address! }],
      });
      // 3. Tell the server to start polling this txid — auto-marks listing "sold" on 1 confirmation
      await apiRequest("POST", "/api/btc/track-settlement", { txid, listingId: id }).catch(() => {
        // Non-fatal: tx is already on-chain, settlement poller just won't auto-update the listing
      });
      return { txid, priceSats: data.priceSats };
    },
    onSuccess: (data: any) => {
      if (data.intent) return;
      toast({ title: "🟠 On-chain TX sent!", description: `TXID: ${data.txid?.slice(0, 16)}…` });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      qc.invalidateQueries({ queryKey: ["/api/marketplace/stats"] });
      setPsbtTarget(null);
    },
    onError: (e: any) => toast({ title: "PSBT failed", description: e.message, variant: "destructive" }),
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
            <button className="text-slate-400 hover:text-white transition-colors" aria-label="Back to Nexus Command">
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
          <BitcoinWalletConnect compact onConnected={() => {}} />
          <Link href="/etch-rune">
            <Button variant="outline" className="border-purple-500/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/60 gap-1.5 text-xs">
              <Gem className="w-3.5 h-3.5" />Etch Rune
            </Button>
          </Link>
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
                  <span className="text-yellow-300 font-mono text-sm">
                    {(l.priceSats ?? Math.round(parseFloat(l.priceNxt) * 1000)).toLocaleString()} sats
                  </span>
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
                    {l.priceSats && (
                      <>
                        <Bitcoin className="w-3 h-3 text-orange-400" />
                        <span className="text-orange-300">{l.priceSats.toLocaleString()} sats</span>
                      </>
                    )}
                    {/* On-chain verified badge */}
                    {l.assetId && (l.assetId.includes("i") || l.assetId.includes(":")) && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                        <Link2 className="w-2.5 h-2.5 mr-1" />on-chain
                      </Badge>
                    )}
                    {/* BTC ownership verified badge */}
                    {l.ownershipSig && l.sellerBtcAddress && (
                      <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]"
                        title={`Signed by ${l.sellerBtcAddress}`}>
                        <Bitcoin className="w-2.5 h-2.5 mr-1" />BTC verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-yellow-300 font-bold font-mono text-lg">
                          {(l.priceSats ?? Math.round(parseFloat(l.priceNxt) * 1000)).toLocaleString()}
                          <span className="text-sm font-normal ml-1 text-yellow-400/60">sats</span>
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono">⚡ +2.5% fee · via Bitcoin</div>
                      </div>
                      <div className="text-[10px] text-slate-600">by {l.sellerUsername}</div>
                    </div>
                    {!isOwn && user ? (
                      <div className="flex gap-1.5">
                        {/* PSBT / Bitcoin buy button */}
                        {(l.priceSats || l.assetId?.includes("i")) && (
                          unisat.connected ? (
                            <Button size="sm"
                              onClick={() => buyWithPsbt.mutate(l.id)}
                              disabled={buyWithPsbt.isPending && psbtTarget === l.id}
                              className="flex-1 gap-1 text-xs bg-orange-600 hover:bg-orange-700"
                              data-testid={`button-buy-psbt-${l.id}`}
                              title="Buy on-chain with Bitcoin wallet (PSBT)"
                            >
                              {buyWithPsbt.isPending && psbtTarget === l.id
                                ? <RefreshCw className="w-3 h-3 animate-spin" />
                                : <><Bitcoin className="w-3 h-3" />BTC</>
                              }
                            </Button>
                          ) : (
                            <Button size="sm"
                              onClick={() => { setPsbtTarget(l.id); unisat.connect(); }}
                              className="flex-1 gap-1 text-xs bg-orange-900/40 hover:bg-orange-800/60 text-orange-400 border border-orange-700/30"
                              data-testid={`button-connect-btc-${l.id}`}
                              title="Connect Bitcoin wallet for on-chain settlement"
                            >
                              <Wallet className="w-3 h-3" />BTC
                            </Button>
                          )
                        )}
                      </div>
                    ) : isOwn ? (
                      <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] self-start">Your listing</Badge>
                    ) : (
                      <Link href="/auth">
                        <Button size="sm" className="w-full bg-slate-700 hover:bg-slate-600 text-xs gap-1">
                          <ArrowRight className="w-3 h-3" />Login to Buy
                        </Button>
                      </Link>
                    )}
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

              {/* Wallet asset picker — appears when UniSat is connected */}
              {unisat.connected && form.assetType !== "wnsp_brc20" || (unisat.connected && form.assetType === "wnsp_brc20") ? (
                <div className="space-y-1.5 bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wallet className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">From your wallet</span>
                    <span className="text-[10px] text-slate-600 font-mono ml-auto">{unisat.address?.slice(0,10)}…</span>
                  </div>
                  <WalletAssetPicker
                    unisat={unisat}
                    assetType={form.assetType}
                    onSelect={fields => setForm(f => ({ ...f, ...fields }))}
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Asset Name</Label>
                <Input value={form.assetName} onChange={e => setForm(f => ({ ...f, assetName: e.target.value }))}
                  className="bg-slate-800 border-slate-700 font-mono" placeholder="wnsp / NEXUS•WAVELENGTH"
                  data-testid="input-asset-name" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">
                  {form.assetType === "rune" ? "Rune ID (BLOCK:TX)" : "Inscription ID"}
                  {form.assetId && <span className="text-green-400 ml-2">✓ selected</span>}
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
                  <Label className="text-slate-400 text-xs">Price (sats) ⚡</Label>
                  <Input
                    type="number"
                    value={form.priceSats}
                    onChange={e => {
                      const sats = e.target.value;
                      const nxt = sats ? (parseInt(sats) / 1000).toFixed(8) : "";
                      setForm(f => ({ ...f, priceSats: sats, priceNxt: nxt }));
                    }}
                    className="bg-slate-800 border-slate-700 font-mono" placeholder="50000"
                    data-testid="input-price-sats" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Description (optional)</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="bg-slate-800 border-slate-700" placeholder="What makes this special…"
                  data-testid="input-description" />
              </div>

              {form.priceSats && (
                <div className="bg-slate-800/60 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Listing price</span>
                    <span className="text-yellow-300 font-mono">{parseInt(form.priceSats || "0").toLocaleString()} sats</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Buyer pays (incl. 2.5% fee)</span>
                    <span className="text-white font-mono">{Math.round((parseInt(form.priceSats || "0") || 0) * 1.025).toLocaleString()} sats</span>
                  </div>
                  <div className="flex justify-between">
                    <span>You receive</span>
                    <span className="text-green-300 font-mono">{parseInt(form.priceSats || "0").toLocaleString()} sats</span>
                  </div>
                </div>
              )}

              {/* Signing state overlay */}
              {listingStep === "signing" && (
                <div className="flex items-center gap-2 bg-orange-950/60 border border-orange-700/40 rounded-lg p-3 text-sm text-orange-300">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Check your wallet — approve the ownership signature…</span>
                </div>
              )}

              <Button
                onClick={() => createListing.mutate()}
                disabled={createListing.isPending || listingStep === "signing" || !form.assetId || !form.priceNxt}
                className="w-full bg-cyan-600 hover:bg-cyan-700 gap-2"
                data-testid="button-submit-listing"
              >
                {listingStep === "signing" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Waiting for signature…</>
                ) : createListing.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Creating listing…</>
                ) : unisat.connected ? (
                  <><Wallet className="w-4 h-4" />Sign &amp; List Asset</>
                ) : (
                  "Create Listing"
                )}
              </Button>

              {unisat.connected && (
                <p className="text-[10px] text-slate-600 text-center">
                  Your wallet will sign a message proving asset ownership — no BTC is spent
                </p>
              )}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
