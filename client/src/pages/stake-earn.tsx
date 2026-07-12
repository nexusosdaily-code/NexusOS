/**
 * /stake-earn — Unified Stake & Earn hub
 * Sats → lock → earn NXT yield + auto-mint WNUSD → add to liquidity pools
 */
import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Zap, Lock, TrendingUp, Coins, Layers,
  Clock, CheckCircle2, AlertCircle, ArrowRight, Plus, Minus,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString(); }
function fmtSats(n: number) { return `${fmt(n)} sats`; }
function fmtUSD(n: number) {
  return n < 0.01 ? `$${n.toFixed(6)}` : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const LOCK_PERIODS = [
  { days: 7,   label: "7 days",   rate: 5,   badge: "Starter" },
  { days: 14,  label: "14 days",  rate: 12,  badge: "Short" },
  { days: 30,  label: "30 days",  rate: 28,  badge: "Standard" },
  { days: 90,  label: "90 days",  rate: 90,  badge: "Growth" },
  { days: 180, label: "180 days", rate: 200, badge: "Pro" },
  { days: 365, label: "365 days", rate: 420, badge: "Max Yield" },
];

const BTC_USD = 105_000; // fallback price
const SAT_USD = BTC_USD / 100_000_000;

function timeLeft(matures: string) {
  const ms = new Date(matures).getTime() - Date.now();
  if (ms <= 0) return "Matured ✓";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

function maturityPct(stakedAt: string, matures: string) {
  const total = new Date(matures).getTime() - new Date(stakedAt).getTime();
  const elapsed = Date.now() - new Date(stakedAt).getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

// ── tab button ────────────────────────────────────────────────────────────────
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active ? "bg-purple-500 text-white" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// ── SECTION 1: Stake tab ─────────────────────────────────────────────────────
function StakeTab({ walletData }: { walletData: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [lockDays, setLockDays] = useState(30);

  const satsBalance = walletData?.satsBalance ?? 0;
  const amountNum = parseInt(amount) || 0;
  const period = LOCK_PERIODS.find(p => p.days === lockDays)!;
  const nxtYield = ((amountNum / 1000) * (period.rate / 100)).toFixed(4);
  const wnusdMinted = ((amountNum * SAT_USD) / 1.5).toFixed(2);

  const stakeMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lightning/stake", { amountSats: amountNum, lockDays }),
    onSuccess: () => {
      toast({ title: "Stake confirmed", description: `${fmtSats(amountNum)} locked · WNUSD auto-minted` });
      setAmount("");
      qc.invalidateQueries({ queryKey: ["/api/lightning/stakes"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/wallet"] });
    },
    onError: (e: any) => toast({ title: "Stake failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      {/* balance */}
      <div className="rounded-xl border border-white/8 bg-black/30 p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-white/30">Available to Stake</div>
          <div className="text-xl font-bold text-white mt-0.5">{fmt(satsBalance)} <span className="text-sm font-normal text-white/40">sats</span></div>
          <div className="text-xs text-white/30">{fmtUSD(satsBalance * SAT_USD)}</div>
        </div>
        <Zap size={24} className="text-yellow-400/60" />
      </div>

      {/* amount input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Amount to Stake</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="1000"
            min={1000}
            max={satsBalance}
            data-testid="input-stake-amount"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => setAmount(String(satsBalance))}
            className="px-3 py-2 rounded-lg bg-white/8 border border-white/10 text-xs text-white/60 hover:text-white transition-colors"
          >
            Max
          </button>
        </div>
      </div>

      {/* lock period selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Lock Period</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LOCK_PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setLockDays(p.days)}
              data-testid={`lock-period-${p.days}`}
              className={`rounded-lg border p-3 text-left transition-colors ${
                lockDays === p.days
                  ? "border-purple-500 bg-purple-500/15"
                  : "border-white/8 bg-black/20 hover:border-white/20"
              }`}
            >
              <div className="text-xs font-bold text-white">{p.label}</div>
              <div className="text-[10px] text-purple-300 font-semibold mt-0.5">{p.rate}% NXT yield</div>
              <div className={`text-[9px] mt-1 rounded-full px-1.5 py-0.5 inline-block font-mono ${
                p.days === 365 ? "bg-yellow-500/20 text-yellow-300" :
                p.days >= 180 ? "bg-purple-500/20 text-purple-300" :
                "bg-white/8 text-white/40"
              }`}>{p.badge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* yield preview */}
      {amountNum >= 1000 && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-4 space-y-2">
          <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Yield Preview</div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">NXT earned at maturity</span>
            <span className="text-white font-semibold">{nxtYield} NXT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">WNUSD auto-minted now</span>
            <span className="text-cyan-300 font-semibold">{fmtUSD(parseFloat(wnusdMinted))} WNUSD</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Collateral ratio</span>
            <span className="text-white/70">150%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Matures</span>
            <span className="text-white/70">{period.label} from now</span>
          </div>
        </div>
      )}

      <button
        onClick={() => stakeMut.mutate()}
        disabled={amountNum < 1000 || amountNum > satsBalance || stakeMut.isPending}
        data-testid="button-stake-confirm"
        className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        <Lock size={14} />
        {stakeMut.isPending ? "Staking…" : `Stake ${amountNum >= 1000 ? fmtSats(amountNum) : "sats"} · Earn NXT + WNUSD`}
      </button>

      {amountNum < 1000 && amount && (
        <p className="text-xs text-red-400 text-center">Minimum stake is 1,000 sats</p>
      )}
    </div>
  );
}

// ── SECTION 2: Positions tab ──────────────────────────────────────────────────
function PositionsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/lightning/stakes"], refetchInterval: 30_000 });
  const stakes = data?.stakes ?? [];

  const unstakeMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/lightning/unstake/${id}`, {}),
    onSuccess: (_, id) => {
      toast({ title: "Unstaked", description: "Sats returned to wallet" });
      qc.invalidateQueries({ queryKey: ["/api/lightning/stakes"] });
      qc.invalidateQueries({ queryKey: ["/api/lightning/wallet"] });
    },
    onError: (e: any) => toast({ title: "Unstake failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-center text-white/30 py-10 text-sm">Loading positions…</div>;
  if (!stakes.length) return (
    <div className="text-center py-10 space-y-2">
      <Lock size={32} className="mx-auto text-white/15" />
      <div className="text-white/30 text-sm">No active stakes yet</div>
      <div className="text-white/20 text-xs">Switch to the Stake tab to get started</div>
    </div>
  );

  return (
    <div className="space-y-3">
      {stakes.map((s: any) => {
        const matured = new Date(s.maturesAt) <= new Date();
        const pct = maturityPct(s.stakedAt, s.maturesAt);
        return (
          <div key={s.id} data-testid={`stake-position-${s.id}`} className="rounded-xl border border-white/8 bg-black/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">{fmt(s.amountSats)} sats</div>
                <div className="text-xs text-white/40 mt-0.5">{s.lockDays}-day lock · {s.yieldRatePercent}% NXT yield</div>
              </div>
              <div className={`text-[10px] font-mono px-2 py-1 rounded-full ${
                matured ? "bg-green-500/20 text-green-300" : "bg-yellow-500/15 text-yellow-300"
              }`}>
                {matured ? "✓ Matured" : timeLeft(s.maturesAt)}
              </div>
            </div>

            {/* progress bar */}
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/5 p-2">
                <div className="text-white/30 mb-0.5">NXT yield</div>
                <div className="text-white font-semibold">{parseFloat(s.nxtYield ?? 0).toFixed(4)} NXT</div>
              </div>
              <div className="rounded-lg bg-cyan-900/20 border border-cyan-500/15 p-2">
                <div className="text-white/30 mb-0.5">WNUSD minted</div>
                <div className="text-cyan-300 font-semibold">{fmtUSD(parseFloat(s.wnusdMinted ?? 0))}</div>
              </div>
            </div>

            <button
              onClick={() => unstakeMut.mutate(s.id)}
              disabled={unstakeMut.isPending}
              data-testid={`button-unstake-${s.id}`}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                matured
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15"
              }`}
            >
              {matured ? "Claim + Unstake" : "Early Exit (penalty applies)"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── SECTION 3: Liquidity tab ──────────────────────────────────────────────────
function LiquidityTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [amtA, setAmtA] = useState("");
  const [amtB, setAmtB] = useState("");

  const { data: poolsData } = useQuery<any>({ queryKey: ["/api/lp/pools"], refetchInterval: 60_000 });
  const { data: posData }   = useQuery<any>({ queryKey: ["/api/lp/positions"], refetchInterval: 30_000 });

  const pools    = poolsData?.pools ?? [];
  const positions = posData?.positions ?? [];

  const addMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/lp/add", {
      poolId: selectedPool,
      amountA: parseInt(amtA) || 0,
      amountB: parseInt(amtB) || 0,
    }),
    onSuccess: () => {
      toast({ title: "Liquidity added", description: "Your LP tokens have been issued" });
      setAmtA(""); setAmtB(""); setSelectedPool(null);
      qc.invalidateQueries({ queryKey: ["/api/lp/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/lp/pools"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: ({ poolId, lpTokens }: { poolId: string; lpTokens: number }) =>
      apiRequest("POST", "/api/lp/remove", { poolId, lpTokens }),
    onSuccess: () => {
      toast({ title: "Liquidity removed", description: "Tokens returned to wallet" });
      qc.invalidateQueries({ queryKey: ["/api/lp/positions"] });
      qc.invalidateQueries({ queryKey: ["/api/lp/pools"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const activePool = pools.find((p: any) => p.poolId === selectedPool);

  return (
    <div className="space-y-5">
      {/* pool list */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Available Pools</div>
        {!pools.length && <div className="text-white/30 text-sm text-center py-6">No pools available</div>}
        {pools.map((p: any) => (
          <button
            key={p.poolId}
            onClick={() => setSelectedPool(p.poolId === selectedPool ? null : p.poolId)}
            data-testid={`pool-${p.poolId}`}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              selectedPool === p.poolId
                ? "border-purple-500 bg-purple-500/10"
                : "border-white/8 bg-black/20 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{p.name}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {p.tokenA}/{p.tokenB} · {p.feeBps / 100}% fee
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/30">Total LP tokens</div>
                <div className="text-sm font-semibold text-white">{fmt(p.totalLpTokens)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* add liquidity form */}
      {selectedPool && activePool && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-4 space-y-3">
          <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
            Add Liquidity — {activePool.name}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider">{activePool.tokenA}</label>
              <input
                type="number"
                value={amtA}
                onChange={e => setAmtA(e.target.value)}
                placeholder="0"
                data-testid="input-lp-amount-a"
                className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider">{activePool.tokenB}</label>
              <input
                type="number"
                value={amtB}
                onChange={e => setAmtB(e.target.value)}
                placeholder="0"
                data-testid="input-lp-amount-b"
                className="w-full mt-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <button
            onClick={() => addMut.mutate()}
            disabled={(!amtA && !amtB) || addMut.isPending}
            data-testid="button-add-liquidity"
            className="w-full py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={14} /> {addMut.isPending ? "Adding…" : "Add Liquidity"}
          </button>
        </div>
      )}

      {/* my LP positions */}
      {positions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">My LP Positions</div>
          {positions.map((pos: any) => (
            <div key={pos.id} data-testid={`lp-position-${pos.id}`} className="rounded-xl border border-white/8 bg-black/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-white">{pos.poolId}</div>
                  <div className="text-xs text-white/40 mt-0.5">{fmt(pos.lpTokens)} LP tokens</div>
                </div>
                <button
                  onClick={() => removeMut.mutate({ poolId: pos.poolId, lpTokens: pos.lpTokens })}
                  disabled={removeMut.isPending}
                  data-testid={`button-remove-lp-${pos.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/8 border border-white/10 text-white/50 hover:text-white hover:bg-white/15 transition-colors flex items-center gap-1"
                >
                  <Minus size={11} /> Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-white/5 p-2">
                  <div className="text-white/30 mb-0.5">Deposited A</div>
                  <div className="text-white">{fmt(pos.depositedA)}</div>
                </div>
                <div className="rounded bg-white/5 p-2">
                  <div className="text-white/30 mb-0.5">Deposited B</div>
                  <div className="text-white">{fmt(pos.depositedB)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StakeEarnPage() {
  const { user } = useAuth() as any;
  const [tab, setTab] = useState<"stake" | "positions" | "liquidity">("stake");

  const { data: walletData } = useQuery<any>({
    queryKey: ["/api/lightning/wallet"],
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: stakesData } = useQuery<any>({
    queryKey: ["/api/lightning/stakes"],
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const activeStakes = stakesData?.stakes?.filter((s: any) => s.status === "active")?.length ?? 0;
  const totalWnusd = stakesData?.stakes?.reduce(
    (sum: number, s: any) => sum + parseFloat(s.wnusdMinted ?? 0), 0
  ) ?? 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* nav */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <Link href="/build" className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
          <ArrowLeft size={12} /> Back to Hub
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-20 space-y-5">

        {/* header */}
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-black p-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-purple-400/60 mb-1">
            NexusOS · Stake & Earn
          </div>
          <h1 className="text-xl font-bold text-white">Put Your Sats to Work</h1>
          <p className="text-sm text-white/40 mt-1.5 leading-relaxed">
            Lock sats → earn NXT yield → auto-mint WNUSD stablecoin → add to liquidity pools.
            All in one flow.
          </p>
        </div>

        {/* pipeline CTA for new users */}
        {!walletData?.satsBalance && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-900/10 p-4 flex items-center gap-3">
            <Zap size={16} className="text-cyan-400 shrink-0" />
            <div className="flex-1 text-xs text-white/50">
              No sats yet? Run the pipeline to convert NXT into sats, then come back here.
            </div>
            <Link href="/rune-pipeline" className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 shrink-0 flex items-center gap-1">
              Pipeline <ArrowRight size={10} />
            </Link>
          </div>
        )}

        {/* stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <Lock size={13} />, label: "Active Stakes", value: String(activeStakes) },
            { icon: <Coins size={13} />, label: "WNUSD Minted", value: fmtUSD(totalWnusd) },
            { icon: <TrendingUp size={13} />, label: "Sats Balance", value: fmt(walletData?.satsBalance ?? 0) },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/6 bg-black/20 p-3 text-center">
              <div className="flex justify-center text-purple-400 mb-1">{s.icon}</div>
              <div className="text-xs font-bold text-white">{s.value}</div>
              <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div className="flex gap-2">
          <Tab active={tab === "stake"}     onClick={() => setTab("stake")}>Stake</Tab>
          <Tab active={tab === "positions"} onClick={() => setTab("positions")}>
            My Positions {activeStakes > 0 && <span className="ml-1 bg-purple-500 text-white text-[9px] rounded-full px-1.5">{activeStakes}</span>}
          </Tab>
          <Tab active={tab === "liquidity"} onClick={() => setTab("liquidity")}>Liquidity</Tab>
        </div>

        {/* tab content */}
        {tab === "stake"     && <StakeTab walletData={walletData} />}
        {tab === "positions" && <PositionsTab />}
        {tab === "liquidity" && <LiquidityTab />}

        {/* how it works */}
        <div className="rounded-xl border border-white/6 bg-black/20 p-5 space-y-3">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">How it works</div>
          {[
            { icon: <Zap size={14} className="text-yellow-400" />, step: "1. Get sats", desc: "Run the NXT→Sats pipeline or deposit via Lightning" },
            { icon: <Lock size={14} className="text-purple-400" />, step: "2. Lock & Stake", desc: "Choose a lock period — longer = higher NXT yield" },
            { icon: <Coins size={14} className="text-cyan-400" />, step: "3. WNUSD minted", desc: "Staked sats auto-collateralise WNUSD at 150% ratio" },
            { icon: <Layers size={14} className="text-green-400" />, step: "4. Add Liquidity", desc: "Deposit WNUSD into pools — earn trading fees" },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">{s.icon}</div>
              <div>
                <div className="text-xs font-semibold text-white">{s.step}</div>
                <div className="text-[11px] text-white/40">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
