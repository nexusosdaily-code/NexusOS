import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Layers, Bitcoin, Coins, DollarSign, Zap, Unlock, Lock, ChevronRight } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const NXT_TO_SATS = 1_000;  // 1 NXT = 1,000 sats
const COL_RATIO   = 1.5;    // 150% over-collateralised

// ─── Types ────────────────────────────────────────────────────────────────────
interface Bundle {
  id: string;
  nxtLocked: string;
  runesLocked: number;
  satsLocked: number;
  totalSatsEq: number;
  totalUsdValue: string;
  wnusdMinted: string;
  colRatioPct: string;
  btcUsdAtMint: string;
  psiChannel: string;
  status: string;
  createdAt: string;
}

interface WalletData {
  balance: string;
}

// ─── Live preview calculator ───────────────────────────────────────────────────
function calcPreview(nxt: number, runes: number, sats: number, btcUsd: number) {
  const totalSatsEq = Math.round(nxt * NXT_TO_SATS + runes * NXT_TO_SATS + sats);
  const totalUsd    = totalSatsEq * (btcUsd / 100_000_000);
  const wnusd       = totalUsd / COL_RATIO;
  return { totalSatsEq, totalUsd, wnusd };
}

// ─── Asset layer row ──────────────────────────────────────────────────────────
function LayerRow({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-zinc-300">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono text-white">{value}</div>
        {sub && <div className="text-xs text-zinc-500">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Bundle card ──────────────────────────────────────────────────────────────
function BundleCard({ bundle, onUnwrap, loading }: { bundle: Bundle; onUnwrap: () => void; loading: boolean }) {
  const active = bundle.status === "active";
  const wnusd  = parseFloat(bundle.wnusdMinted).toFixed(4);
  const usd    = parseFloat(bundle.totalUsdValue).toFixed(2);
  const btcAtMint = parseFloat(bundle.btcUsdAtMint).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all ${active ? "border-violet-500/40 bg-violet-950/20" : "border-zinc-700/40 bg-zinc-900/30 opacity-60"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className={`w-5 h-5 ${active ? "text-violet-400" : "text-zinc-500"}`} />
          <span className="font-mono text-sm text-zinc-400">{bundle.psiChannel}</span>
        </div>
        <Badge variant={active ? "default" : "secondary"} className={active ? "bg-violet-600 text-white text-xs" : "text-xs"}>
          {active ? "ACTIVE" : "UNWRAPPED"}
        </Badge>
      </div>

      {/* Asset layers */}
      <div className="space-y-1.5">
        {parseFloat(bundle.nxtLocked) > 0 && (
          <LayerRow icon={Coins} label="NXT locked" value={`${parseFloat(bundle.nxtLocked).toLocaleString()} NXT`} sub={`${(parseFloat(bundle.nxtLocked) * NXT_TO_SATS).toLocaleString()} sats eq`} color="text-yellow-400" />
        )}
        {bundle.runesLocked > 0 && (
          <LayerRow icon={Layers} label="NXWV Runes" value={`${bundle.runesLocked.toLocaleString()} NXWV`} sub={`${(bundle.runesLocked * NXT_TO_SATS).toLocaleString()} sats eq`} color="text-violet-400" />
        )}
        {bundle.satsLocked > 0 && (
          <LayerRow icon={Bitcoin} label="sats" value={`${bundle.satsLocked.toLocaleString()} sats`} sub="BTC base layer" color="text-orange-400" />
        )}
        <div className="flex items-center justify-center py-0.5">
          <ChevronRight className="w-3 h-3 text-zinc-600 rotate-90" />
        </div>
        <LayerRow icon={DollarSign} label="WNUSD minted" value={`${wnusd} WNUSD`} sub={`≈ $${usd} · 150% CR · BTC@${btcAtMint}`} color="text-green-400" />
      </div>

      {/* Unwrap */}
      {active && (
        <Button
          size="sm"
          variant="outline"
          className="w-full border-violet-500/40 text-violet-300 hover:bg-violet-900/30"
          onClick={onUnwrap}
          disabled={loading}
          data-testid={`button-unwrap-${bundle.id}`}
        >
          <Unlock className="w-3.5 h-3.5 mr-1.5" />
          {loading ? "Unwrapping…" : "Unwrap Bundle"}
        </Button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SpectralBundlePage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [nxtAmt,   setNxtAmt]   = useState("");
  const [runeAmt,  setRuneAmt]  = useState("");
  const [satsAmt,  setSatsAmt]  = useState("");
  const [btcUsd,   setBtcUsd]   = useState(66_000);
  const [unwrapping, setUnwrapping] = useState<string | null>(null);

  // Fetch live BTC price
  useEffect(() => {
    fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json")
      .then(r => r.json())
      .then(d => { if (d?.bpi?.USD?.rate_float) setBtcUsd(d.bpi.USD.rate_float); })
      .catch(() => {});
  }, []);

  // Queries
  const { data: bundles = [], isLoading: loadingBundles } = useQuery<Bundle[]>({
    queryKey: ["/api/spectral-bundles"],
  });

  const { data: walletData } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
  });

  const nxtBal = parseFloat(walletData?.balance ?? "0");

  // Live preview
  const nxt   = parseFloat(nxtAmt)  || 0;
  const runes = parseInt(runeAmt)   || 0;
  const sats  = parseInt(satsAmt)   || 0;
  const preview = calcPreview(nxt, runes, sats, btcUsd);

  // Mutations
  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/spectral-bundles/create", {
      nxtAmount: nxt, runesAmount: runes, satsAmount: sats,
    }),
    onSuccess: async (res) => {
      const data = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/spectral-bundles"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({ title: "Bundle created", description: `${parseFloat(data.wnusdMinted).toFixed(4)} WNUSD minted via ${data.psiChannel}` });
      setNxtAmt(""); setRuneAmt(""); setSatsAmt("");
    },
    onError: async (err: any) => {
      const msg = err?.message ?? "Failed to create bundle";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  async function handleUnwrap(id: string) {
    setUnwrapping(id);
    try {
      const res = await apiRequest("POST", `/api/spectral-bundles/${id}/unwrap`, {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unwrap failed");
      qc.invalidateQueries({ queryKey: ["/api/spectral-bundles"] });
      qc.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({ title: "Bundle unwrapped", description: `${data.nxtReturned} NXT returned · ${data.runesReturned} NXWV · ${data.satsReturned} sats` });
    } catch (e: any) {
      toast({ title: "Unwrap failed", description: e.message, variant: "destructive" });
    }
    setUnwrapping(null);
  }

  const canCreate = (nxt > 0 || runes > 0 || sats > 0) && preview.wnusd > 0.000001;
  const activeBundles   = bundles.filter(b => b.status === "active");
  const inactiveBundles = bundles.filter(b => b.status !== "active");

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Title */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-violet-900/40 border border-violet-500/30">
              <Package className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Spectral Bundle</h1>
              <p className="text-sm text-zinc-400">Compose NXT + NXWV Runes + sats into one WNUSD-backed unit</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400 space-y-1">
          <p className="text-zinc-300 font-medium mb-2">How it works</p>
          <p>Lock any combination of NXT, NXWV Runes, and sats into a single spectral bundle. NexusOS converts all assets to their sat-equivalent value, then auto-mints WNUSD at 150% collateral ratio. Unwrap at any time to release all assets and redeem WNUSD.</p>
          <p className="mt-2 text-zinc-500 text-xs">1 NXT = 1,000 sats · 1 NXWV = 1 NXT = 1,000 sats · BTC live price · 150% CR</p>
        </div>

        {/* Builder */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-zinc-100">
              <Lock className="w-4 h-4 text-violet-400" />
              Bundle Builder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Inputs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-yellow-400" /> NXT
                </Label>
                <Input
                  type="number" min="0" step="1" placeholder="0"
                  value={nxtAmt} onChange={e => setNxtAmt(e.target.value)}
                  className="bg-zinc-800 border-zinc-600 text-white font-mono text-sm"
                  data-testid="input-nxt-amount"
                />
                <p className="text-xs text-zinc-500">Bal: {nxtBal.toLocaleString()}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-violet-400" /> NXWV Runes
                </Label>
                <Input
                  type="number" min="0" step="1" placeholder="0"
                  value={runeAmt} onChange={e => setRuneAmt(e.target.value)}
                  className="bg-zinc-800 border-zinc-600 text-white font-mono text-sm"
                  data-testid="input-rune-amount"
                />
                <p className="text-xs text-zinc-500">Integer units</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400 flex items-center gap-1">
                  <Bitcoin className="w-3 h-3 text-orange-400" /> Sats
                </Label>
                <Input
                  type="number" min="0" step="1" placeholder="0"
                  value={satsAmt} onChange={e => setSatsAmt(e.target.value)}
                  className="bg-zinc-800 border-zinc-600 text-white font-mono text-sm"
                  data-testid="input-sats-amount"
                />
                <p className="text-xs text-zinc-500">BTC base</p>
              </div>
            </div>

            {/* Live preview */}
            {(nxt > 0 || runes > 0 || sats > 0) && (
              <div className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-3 space-y-2">
                <p className="text-xs text-violet-400 font-medium">Preview</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-zinc-500">Total sats eq</p>
                    <p className="font-mono text-sm text-orange-300">{preview.totalSatsEq.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">USD value</p>
                    <p className="font-mono text-sm text-blue-300">${preview.totalUsd.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">WNUSD minted</p>
                    <p className="font-mono text-sm text-green-300">{preview.wnusd.toFixed(6)}</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 text-center">BTC @ ${btcUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} · 150% CR</p>
              </div>
            )}

            {/* Nesting diagram */}
            {(nxt > 0 || runes > 0 || sats > 0) && (
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3 text-xs font-mono text-zinc-400 space-y-1">
                <p className="text-zinc-300 text-xs mb-2 font-sans">Bundle structure:</p>
                <p className="text-green-400">┌─ WNUSD ({preview.wnusd.toFixed(4)}) ← 150% CR</p>
                {sats > 0 && <p className="pl-3 text-orange-400">│ ┌─ {sats.toLocaleString()} sats (BTC anchor)</p>}
                {runes > 0 && <p className={`pl-${sats > 0 ? "6" : "3"} text-violet-400`}>{sats > 0 ? "│ │" : "│"} ┌─ {runes.toLocaleString()} NXWV Runes</p>}
                {nxt > 0 && <p className="pl-9 text-yellow-400">└─ {nxt.toLocaleString()} NXT (deducted from wallet)</p>}
              </div>
            )}

            <Button
              className="w-full bg-violet-700 hover:bg-violet-600 text-white"
              onClick={() => createMut.mutate()}
              disabled={!canCreate || createMut.isPending}
              data-testid="button-create-bundle"
            >
              <Package className="w-4 h-4 mr-2" />
              {createMut.isPending ? "Creating bundle…" : "Create Spectral Bundle"}
            </Button>
          </CardContent>
        </Card>

        {/* Active bundles */}
        {activeBundles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-zinc-200">Active Bundles ({activeBundles.length})</h2>
            </div>
            {activeBundles.map(b => (
              <BundleCard key={b.id} bundle={b} onUnwrap={() => handleUnwrap(b.id)} loading={unwrapping === b.id} />
            ))}
          </div>
        )}

        {/* History */}
        {inactiveBundles.length > 0 && (
          <div className="space-y-3">
            <Separator className="bg-zinc-800" />
            <h2 className="text-sm font-semibold text-zinc-500">History</h2>
            {inactiveBundles.map(b => (
              <BundleCard key={b.id} bundle={b} onUnwrap={() => {}} loading={false} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingBundles && bundles.length === 0 && (
          <div className="text-center py-12 text-zinc-600">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No bundles yet. Create your first Spectral Bundle above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
