import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle2, Clock, XCircle, Copy, ExternalLink,
  RefreshCw, Bitcoin, Zap, Filter,
} from "lucide-react";

type Order = {
  id: number;
  username: string;
  direction: string;
  nxtAmount: string;
  runeAmount: number;
  btcAddress: string;
  btcTxid: string | null;
  status: string;
  note: string | null;
  createdAt: string;
  completedAt: string | null;
};

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 rounded hover:bg-white/10 transition-colors"
    >
      {copied
        ? <CheckCircle2 className="w-3 h-3 text-green-400" />
        : <Copy className="w-3 h-3 text-white/30" />}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    pending:   { icon: <Clock className="w-3 h-3" />,        color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", label: "Pending" },
    queued:    { icon: <Clock className="w-3 h-3" />,        color: "text-blue-400 bg-blue-500/10 border-blue-500/30",       label: "Queued" },
    completed: { icon: <CheckCircle2 className="w-3 h-3" />, color: "text-green-400 bg-green-500/10 border-green-500/30",   label: "Completed" },
    failed:    { icon: <XCircle className="w-3 h-3" />,      color: "text-red-400 bg-red-500/10 border-red-500/30",         label: "Failed" },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
}

function OrderRow({ order, onUpdate }: { order: Order; onUpdate: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [txid, setTxid] = useState(order.btcTxid ?? "");
  const [expanded, setExpanded] = useState(false);

  const complete = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/admin/orders/${order.id}`, { status: "completed", btcTxid: txid }),
    onSuccess: () => {
      toast({ title: "Order completed ✅", description: `#${order.id} marked complete` });
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      onUpdate();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fail = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/admin/orders/${order.id}`, { status: "failed" }),
    onSuccess: () => {
      toast({ title: "Order marked failed", description: `#${order.id}` });
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isActive = order.status === "pending" || order.status === "queued";
  const dirIcon = order.direction === "nxt_to_rune"
    ? <Zap className="w-3 h-3 text-purple-400" />
    : <Bitcoin className="w-3 h-3 text-orange-400" />;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
      isActive ? "border-yellow-500/20 bg-yellow-950/5" :
      order.status === "completed" ? "border-green-500/15 bg-green-950/5" :
      "border-red-500/15 bg-red-950/5"
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {dirIcon}
          <span className="text-white font-mono text-sm">#{order.id}</span>
          <span className="text-white/50 text-xs">·</span>
          <span className="text-cyan-300 text-xs font-semibold">{order.username}</span>
          <StatusBadge status={order.status} />
        </div>
        <button
          onClick={() => setExpanded(x => !x)}
          className="text-white/30 hover:text-white/60 text-xs transition-colors shrink-0"
        >
          {expanded ? "▲ less" : "▼ more"}
        </button>
      </div>

      {/* Amount summary */}
      <div className="flex flex-wrap gap-4 text-xs font-mono">
        <div>
          <span className="text-white/30">NXT paid </span>
          <span className="text-purple-300">{parseFloat(order.nxtAmount).toFixed(2)}</span>
        </div>
        <div>
          <span className="text-white/30">NXWV </span>
          <span className="text-orange-300">{order.runeAmount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-white/30">→ </span>
          <span className="text-white/70 truncate max-w-[180px]">{order.btcAddress}</span>
          <CopyBtn value={order.btcAddress} />
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="space-y-1.5 text-[11px] text-white/40 font-mono border-t border-white/5 pt-3">
          {order.note && <p>Note: {order.note}</p>}
          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
          {order.completedAt && <p>Completed: {new Date(order.completedAt).toLocaleString()}</p>}
          {order.btcTxid && (
            <div className="flex items-center gap-1">
              <span>Txid: {order.btcTxid.slice(0, 16)}…</span>
              <CopyBtn value={order.btcTxid} />
              <a
                href={`https://mempool.space/tx/${order.btcTxid}`}
                target="_blank" rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isActive && (
        <div className="flex gap-2 items-center pt-1">
          <Input
            value={txid}
            onChange={e => setTxid(e.target.value)}
            placeholder="Paste Bitcoin txid…"
            className="h-8 text-xs font-mono bg-black/30 border-white/10 text-white flex-1"
          />
          <Button
            size="sm"
            onClick={() => complete.mutate()}
            disabled={!txid.trim() || complete.isPending}
            className="h-8 bg-green-600 hover:bg-green-500 text-white text-xs shrink-0"
          >
            {complete.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : "✅ Complete"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fail.mutate()}
            disabled={fail.isPending}
            className="h-8 text-red-400 hover:bg-red-500/10 text-xs shrink-0"
          >
            ✗ Fail
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "queued" | "completed" | "failed">("all");
  const qc = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => apiRequest("GET", "/api/admin/orders").then(r => r.json()),
    refetchInterval: 30_000,
  });

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    queued:  orders.filter(o => o.status === "queued").length,
    completed: orders.filter(o => o.status === "completed").length,
    failed: orders.filter(o => o.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Bitcoin className="w-5 h-5 text-orange-400" />
              NXWV Pipeline Orders
            </h1>
            <p className="text-white/40 text-sm mt-0.5">Manage pending NEXUS•WAVELENGTH Rune deliveries</p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "pending", "queued", "completed", "failed"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-cyan-600 text-white"
                  : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
              }`}
            >
              {f} <span className="opacity-60">({counts[f]})</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-white/20 text-xs">
            <Filter className="w-3 h-3" /> auto-refreshes every 30s
          </div>
        </div>

        {/* Pending banner */}
        {counts.pending + counts.queued > 0 && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-950/10 px-4 py-3 text-sm text-yellow-300 flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              <strong>{counts.pending + counts.queued}</strong> order{counts.pending + counts.queued > 1 ? "s" : ""} awaiting Rune delivery.
              Paste txid and click <strong>✅ Complete</strong> after sending from Unisat.
            </span>
          </div>
        )}

        {/* Orders */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-white/30">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading orders…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-white/25 text-sm">
            No {filter !== "all" ? filter : ""} orders yet
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(o => (
              <OrderRow key={o.id} order={o} onUpdate={() => qc.invalidateQueries({ queryKey: ["/api/admin/orders"] })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
