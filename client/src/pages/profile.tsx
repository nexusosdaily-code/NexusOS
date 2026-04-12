import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Radio, Database, Zap, Copy, ExternalLink, Check, User } from "lucide-react";
import { useState } from "react";

// ── helpers ────────────────────────────────────────────────────────────────────
function nmToRgb(nm: number): string {
  if (nm < 380) return "#9400D3";
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}

function bandGradient(nm: number): string {
  const c = nmToRgb(nm);
  return `linear-gradient(135deg, ${c}22 0%, ${c}08 100%)`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      data-testid="btn-copy"
      className="ml-1 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

interface ProfileData {
  user: { id: string; username: string; role: string; createdAt: string };
  wallet: { address: string } | null;
  spectral: {
    nm: number; wdm: number; oam: number; pol: string; band: string;
    psi: string; uri: string; registered: boolean;
    entry: Record<string, unknown> | null; httpUrl: string;
  };
  content: { recent: Array<{
    id: string; label: string | null; band: string | null;
    wavelengthNm: string | null; psiChannel: string | null;
    data: Record<string, unknown> | null; createdAt: string;
  }>; total: number };
  blockchain: { txCount: number };
  wnspAddresses: Array<{
    id: string; wnspUri: string; psiChannel: string; band: string | null;
    label: string | null; resourceType: string; createdAt: string;
  }>;
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const { data, isLoading, isError } = useQuery<ProfileData>({
    queryKey: ["/api/profile", username],
    queryFn: async () => {
      const r = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (!r.ok) throw new Error("User not found");
      return r.json();
    },
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-2">
          <Radio size={32} className="mx-auto animate-pulse text-cyan-400" />
          <p className="text-zinc-400 text-sm">Resolving spectral identity…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">No spectral identity found for <span className="text-white font-mono">{username}</span></p>
        <Link href="/wnsp-bridge" className="text-cyan-400 hover:underline text-sm">
          ← WNSP Bridge
        </Link>
      </div>
    );
  }

  const { user, wallet, spectral, content, blockchain, wnspAddresses } = data;
  const color = nmToRgb(spectral.nm);
  const bg    = bandGradient(spectral.nm);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* back nav */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Link href="/wnsp-bridge" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> WNSP Bridge
        </Link>
      </div>

      {/* hero — spectral identity */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div
          className="rounded-2xl border p-8"
          style={{ background: bg, borderColor: `${color}33` }}
        >
          {/* avatar + name */}
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 border-2"
              style={{ background: `${color}33`, borderColor: `${color}55` }}
            >
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {user.username}
                {user.role === "admin" && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: `${color}33`, color }}>
                    admin
                  </span>
                )}
              </h1>
              <p className="text-zinc-400 text-sm mt-0.5">Member since {fmtDate(user.createdAt)}</p>

              {/* spectral band bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 w-32 rounded-full" style={{ background: color }} />
                <span className="text-xs font-mono" style={{ color }}>
                  {spectral.band} · λ={spectral.nm}nm
                </span>
              </div>
            </div>
          </div>

          {/* wnsp identity */}
          <div className="mt-6 rounded-xl border p-4 space-y-2" style={{ background: "#00000066", borderColor: `${color}22` }}>
            <div className="flex items-center gap-2 mb-1">
              <Radio size={14} style={{ color }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>Canonical WNSP Address</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm break-all" data-testid="text-wnsp-uri" style={{ color }}>
                {spectral.uri}
              </span>
              <CopyButton text={spectral.uri} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {[
                { label: "Ψ channel", value: spectral.psi },
                { label: "WDM slot", value: String(spectral.wdm) },
                { label: "OAM mode", value: String(spectral.oam) },
                { label: "Polarisation", value: spectral.pol === "V" ? "Vertical" : "Horizontal" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-2 text-center" style={{ background: `${color}11` }}>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-sm font-mono font-semibold mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 pt-1">
              Derived via WASCII v1.0 · CE→SE · Physics-assigned, not server-assigned
            </p>
          </div>
        </div>
      </div>

      {/* stats strip */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Database, label: "Spectral Records", value: content.total },
            { Icon: Zap, label: "Blockchain TXs", value: blockchain.txCount },
            { Icon: Radio, label: "WNSP Addresses", value: wnspAddresses.length },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
              <Icon size={18} className="mx-auto mb-1 text-zinc-500" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* wallet */}
      {wallet && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex items-center gap-3">
            <User size={16} className="text-zinc-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 mb-0.5">NXT Wallet Address</p>
              <p className="font-mono text-sm truncate" data-testid="text-wallet-address">{wallet.address}</p>
            </div>
            <CopyButton text={wallet.address} />
          </div>
        </div>
      )}

      {/* spectral content */}
      {content.recent.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Spectral Content</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {content.recent.map(rec => {
              const c2 = rec.band ? nmToRgb(parseFloat(rec.wavelengthNm ?? "550")) : "#6b7280";
              return (
                <div
                  key={rec.id}
                  data-testid={`card-content-${rec.id}`}
                  className="rounded-xl border p-3 flex items-start gap-3"
                  style={{ borderColor: `${c2}22`, background: `${c2}08` }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rec.label ?? "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono" style={{ color: c2 }}>{rec.psiChannel}</span>
                      <span className="text-xs text-zinc-600">{(rec.data as any)?.mimeType ?? (rec.data as any)?.type ?? "text"}</span>
                      <span className="text-xs text-zinc-600">{fmtBytes((rec.data as any)?.fileSize ?? null)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 flex-shrink-0">{fmtDate(rec.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* wnsp addresses registered */}
      {wnspAddresses.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Registered WNSP Addresses</h2>
          <div className="space-y-2">
            {wnspAddresses.map(addr => {
              const c3 = nmToRgb(500);
              return (
                <div
                  key={addr.id}
                  data-testid={`row-wnsp-${addr.id}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nmToRgb(500) }} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm" style={{ color: c3 }}>{addr.wnspUri}</span>
                    {addr.label && addr.label !== addr.wnspUri && (
                      <span className="ml-2 text-xs text-zinc-500">{addr.label}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-600 flex-shrink-0 capitalize">{addr.resourceType}</span>
                  <Link
                    href={`/wnsp-bridge?resolve=${encodeURIComponent(addr.psiChannel)}`}
                    className="text-zinc-600 hover:text-white transition-colors flex-shrink-0"
                    data-testid={`link-resolve-${addr.id}`}
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* empty state */}
      {content.recent.length === 0 && wnspAddresses.length <= 1 && (
        <div className="max-w-4xl mx-auto px-4 pb-10 text-center">
          <p className="text-zinc-600 text-sm">No spectral content stored yet.</p>
          <Link href="/spectral-db" className="text-cyan-400 hover:underline text-sm mt-1 inline-block">
            Store content in the Spectral DB →
          </Link>
        </div>
      )}
    </div>
  );
}
