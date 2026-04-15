import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, Radio, Database, Zap, Copy, ExternalLink, Check, User,
  Upload, Briefcase, Shield, GraduationCap, FileText, Trash2, Lock,
  Eye, EyeOff, Download, Plus, X, BadgeCheck, Atom, Wallet, Crown, Layers,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

// ── colour helpers ──────────────────────────────────────────────────────────
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
function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtBytes(n: number | null | undefined): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

// ── copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      data-testid="btn-copy"
      className="ml-1 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  );
}

// ── Physics constants ────────────────────────────────────────────────────────
const H_PLANCK = 6.626e-34;
const C_LIGHT  = 2.998e8;

// ── Authority band definitions ───────────────────────────────────────────────
const BAND_META: Record<string, {
  label: string; color: string; bg: string; border: string;
  wdmRange: string; governance: string; rights: string[];
}> = {
  SYSTEM: {
    label: "SYSTEM", color: "#dc2626", bg: "#7f1d1d22", border: "#dc262633",
    wdmRange: "WDM 0–63 (UV–Violet)",
    governance: "Sovereign authority — maximum compression state, highest Λ mass-equivalent per photon. Constitutional power.",
    rights: ["Constitutional amendment rights", "Spectral registry administration", "Sovereign channel allocation", "Cross-band policy enforcement"],
  },
  KERNEL: {
    label: "KERNEL", color: "#2563eb", bg: "#1e3a8a22", border: "#2563eb33",
    wdmRange: "WDM 64–127 (Blue–Cyan)",
    governance: "Infrastructure authority — controls physical layer protocol. Allocates channels to USER and GUEST bands.",
    rights: ["Protocol parameter configuration", "OAM channel allocation", "Infrastructure access grants", "Lambda Gate operations"],
  },
  USER: {
    label: "USER", color: "#16a34a", bg: "#14532d22", border: "#16a34a33",
    wdmRange: "WDM 128–191 (Green–Yellow)",
    governance: "Civilian authority — full participation in governance, commerce, and communication. Standard NexusOS citizen.",
    rights: ["Governance vote participation", "NXT token transfers", "Spectral content publishing", "Credential issuance"],
  },
  GUEST: {
    label: "GUEST", color: "#6b7280", bg: "#11182722", border: "#6b728033",
    wdmRange: "WDM 192–255 (Red–IR)",
    governance: "Observer status — read-only access to public channels. May request USER upgrade via governance.",
    rights: ["Read public spectral content", "View WNSP registry", "Observe governance proceedings", "Request identity upgrade"],
  },
};

// ── Spectral data shape (used before ProfileData is declared) ────────────────
interface SpectralData {
  nm: number; wdm: number; oam: number; pol: string;
  band: string; psi: string; uri: string; registered: boolean;
  entry: Record<string, unknown> | null; httpUrl: string;
}

// ── Authority identity panel ─────────────────────────────────────────────────
function SpectralIdentityPanel({
  spectral, isSelf,
}: {
  spectral: SpectralData; isSelf: boolean;
}) {
  const band = BAND_META[spectral.band] ?? BAND_META.GUEST;
  const freqHz  = C_LIGHT / (spectral.nm * 1e-9);
  const energyJ = H_PLANCK * freqHz;
  const lambdaKg = energyJ / (C_LIGHT * C_LIGHT);

  return (
    <div className="rounded-2xl border p-5 space-y-5"
      style={{ background: band.bg, borderColor: band.border }}>

      {/* band + governance weight */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: band.color + "22", border: `1px solid ${band.color}44` }}>
            <Crown size={20} style={{ color: band.color }} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold uppercase tracking-widest px-2.5 py-0.5 rounded"
              style={{ background: band.color + "22", color: band.color }}>
              {band.label}
            </span>
            <span className="text-xs text-zinc-500 font-mono">{band.wdmRange}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{band.governance}</p>
        </div>
      </div>

      {/* physics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Wavelength",  val: spectral.nm.toFixed(2) + " nm",           color: band.color },
          { label: "Frequency",   val: (freqHz / 1e12).toFixed(3) + " THz",      color: "#22d3ee" },
          { label: "E = hf",      val: energyJ.toExponential(3) + " J",           color: "#a78bfa" },
          { label: "Λ = hf/c²",  val: lambdaKg.toExponential(3) + " kg",         color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "#00000033" }}>
            <div className="text-[10px] text-zinc-600 mb-0.5">{s.label}</div>
            <div className="font-mono text-xs font-bold" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* authority rights */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers size={12} style={{ color: band.color }} />
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: band.color }}>
            Authority rights on this channel
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {band.rights.map(r => (
            <div key={r} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: band.color }} />
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* orthogonality note */}
      <div className="rounded-lg px-3 py-2 text-[10px] font-mono text-zinc-600"
        style={{ background: "#00000044", borderLeft: `2px solid ${band.color}44` }}>
        ⟨Ψ_{spectral.band.toLowerCase()} | Ψ_other⟩ = 0 — your channel is geometrically isolated from all other bands.
        No interference is physically possible at the protocol layer.
      </div>

      {isSelf && (
        <Link href="/wallet">
          <button className="w-full py-2.5 rounded-xl border text-xs font-semibold transition-colors"
            style={{ borderColor: band.color + "44", color: band.color, background: band.color + "10" }}
            data-testid="link-open-wallet">
            <Wallet size={12} className="inline mr-1.5" />
            Open NXT Wallet
          </button>
        </Link>
      )}
    </div>
  );
}

// ── credential type metadata ────────────────────────────────────────────────
const CRED_TYPES: Record<string, { label: string; Icon: typeof Briefcase; color: string }> = {
  business:     { label: "Business",     Icon: Briefcase,    color: "#f59e0b" },
  professional: { label: "Professional", Icon: BadgeCheck,   color: "#06b6d4" },
  academic:     { label: "Academic",     Icon: GraduationCap,color: "#8b5cf6" },
  government:   { label: "Government",   Icon: Shield,       color: "#10b981" },
  personal:     { label: "Personal",     Icon: User,         color: "#ec4899" },
  other:        { label: "Other",        Icon: FileText,     color: "#6b7280" },
};

// ── types ───────────────────────────────────────────────────────────────────
interface Credential {
  id: string; credentialType: string; name: string;
  issuer: string | null; issuedDate: string | null; expiryDate: string | null;
  fileName: string; fileType: string; fileSize: number | null;
  visibility: string; psiChannel: string | null; wavelengthNm: string | null;
  createdAt: string;
}
interface ProfileData {
  user: { id: string; username: string; role: string; createdAt: string };
  wallet: { address: string } | null;
  spectral: { nm: number; wdm: number; oam: number; pol: string; band: string; psi: string; uri: string; registered: boolean; entry: Record<string, unknown> | null; httpUrl: string };
  content: { recent: Array<{ id: string; label: string | null; band: string | null; wavelengthNm: string | null; psiChannel: string | null; data: Record<string, unknown> | null; createdAt: string }>; total: number };
  blockchain: { txCount: number };
  wnspAddresses: Array<{ id: string; wnspUri: string; psiChannel: string; band: string | null; label: string | null; resourceType: string; createdAt: string }>;
}

// ── credential upload panel ─────────────────────────────────────────────────
function CredentialUpload({ username }: { username: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", credentialType: "business", issuer: "", issuedDate: "", expiryDate: "", visibility: "private" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/profile/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, fileName: file.name, fileType: file.type, fileData: b64, fileSize: file.size }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error);
      return resp.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials", username] });
      setOpen(false);
      setFile(null);
      setForm({ name: "", credentialType: "business", issuer: "", issuedDate: "", expiryDate: "", visibility: "private" });
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const onFile = useCallback((f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("File too large — max 10 MB"); return; }
    setFile(f);
    setError("");
    if (!form.name) setForm(prev => ({ ...prev, name: f.name.replace(/\.[^.]+$/, "") }));
  }, [form.name]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        data-testid="btn-add-credential"
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 hover:border-cyan-600 text-zinc-500 hover:text-cyan-400 py-4 transition-colors"
      >
        <Plus size={15} /> Add credential
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-800/50 bg-zinc-950 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-cyan-400">Upload credential</span>
        <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400"><X size={14} /></button>
      </div>

      {/* type selector */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {Object.entries(CRED_TYPES).map(([k, { label, Icon, color }]) => (
          <button
            key={k}
            data-testid={`btn-ctype-${k}`}
            onClick={() => setForm(p => ({ ...p, credentialType: k }))}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all ${form.credentialType === k ? "border-cyan-500 bg-cyan-500/10 text-white" : "border-zinc-800 text-zinc-500 hover:border-zinc-600"}`}
          >
            <Icon size={13} style={{ color: form.credentialType === k ? color : undefined }} />
            {label}
          </button>
        ))}
      </div>

      {/* name */}
      <div>
        <label className="text-xs text-zinc-500 mb-1 block">Credential name *</label>
        <input
          data-testid="input-credential-name"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Business License, CPA Certificate…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-600"
        />
      </div>

      {/* issuer + dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Issuer / Authority</label>
          <input value={form.issuer} onChange={e => setForm(p => ({ ...p, issuer: e.target.value }))}
            placeholder="e.g. State of California"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-600" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Issue date</label>
          <input type="date" value={form.issuedDate} onChange={e => setForm(p => ({ ...p, issuedDate: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-600" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Expiry date</label>
          <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-600" />
        </div>
      </div>

      {/* visibility */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">Visibility:</span>
        {["private", "public"].map(v => (
          <button
            key={v}
            data-testid={`btn-visibility-${v}`}
            onClick={() => setForm(p => ({ ...p, visibility: v }))}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.visibility === v ? "border-cyan-600 bg-cyan-600/10 text-cyan-300" : "border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}
          >
            {v === "private" ? <Lock size={11} /> : <Eye size={11} />}
            {v === "private" ? "Private (only you)" : "Public (visible on profile)"}
          </button>
        ))}
      </div>

      {/* file drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors cursor-pointer ${file ? "border-cyan-600 bg-cyan-600/05" : "border-zinc-700 hover:border-zinc-600"}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files[0] ?? null); }}
        data-testid="dropzone-credential"
      >
        <input ref={fileRef} type="file" className="hidden" onChange={e => onFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="text-center">
            <FileText size={22} className="mx-auto text-cyan-400 mb-1" />
            <p className="text-sm text-white">{file.name}</p>
            <p className="text-xs text-zinc-500">{fmtBytes(file.size)}</p>
          </div>
        ) : (
          <>
            <Upload size={22} className="text-zinc-600" />
            <p className="text-sm text-zinc-500">Drop file here or click to browse</p>
            <p className="text-xs text-zinc-600">PDF, images, DOCX — max 10 MB</p>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          data-testid="btn-upload-credential"
          onClick={() => upload.mutate()}
          disabled={upload.isPending || !form.name || !file}
          className="flex-1 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
        >
          {upload.isPending ? "Uploading…" : "Upload credential"}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-lg border border-zinc-700 text-sm text-zinc-400 hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── credential card ─────────────────────────────────────────────────────────
function CredentialCard({ cred, isSelf, username }: { cred: Credential; isSelf: boolean; username: string }) {
  const qc = useQueryClient();
  const meta = CRED_TYPES[cred.credentialType] ?? CRED_TYPES.other;
  const color = meta.color;
  const nm = cred.wavelengthNm ? parseFloat(cred.wavelengthNm) : 550;

  const del = useMutation({
    mutationFn: () => fetch(`/api/profile/credentials/${cred.id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials", username] }),
  });

  return (
    <div
      data-testid={`card-credential-${cred.id}`}
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: `${color}30`, background: `${color}08` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
            <meta.Icon size={15} style={{ color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{cred.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${color}20`, color }}>{meta.label}</span>
            </div>
            {cred.issuer && <p className="text-xs text-zinc-500 mt-0.5">{cred.issuer}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${cred.visibility === "public" ? "bg-green-900/40 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
            {cred.visibility === "public" ? <Eye size={9} /> : <EyeOff size={9} />}
            {cred.visibility}
          </span>
          {isSelf && (
            <button onClick={() => del.mutate()} className="text-zinc-700 hover:text-red-400 transition-colors" data-testid={`btn-delete-credential-${cred.id}`}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* dates */}
      {(cred.issuedDate || cred.expiryDate) && (
        <div className="flex gap-4 text-xs text-zinc-500">
          {cred.issuedDate && <span>Issued: <span className="text-zinc-300">{fmtDate(cred.issuedDate)}</span></span>}
          {cred.expiryDate && <span>Expires: <span className="text-zinc-300">{fmtDate(cred.expiryDate)}</span></span>}
        </div>
      )}

      {/* file + spectral */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: nmToRgb(nm) }} />
          <span className="text-[10px] font-mono text-zinc-600">{cred.psiChannel ?? "Ψ(—)"}</span>
          <span className="text-[10px] text-zinc-600">{cred.fileName}</span>
          {cred.fileSize && <span className="text-[10px] text-zinc-700">{fmtBytes(cred.fileSize)}</span>}
        </div>
        <a
          href={`/api/profile/credentials/${cred.id}/download`}
          target="_blank"
          rel="noreferrer"
          data-testid={`link-download-credential-${cred.id}`}
          className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-cyan-400 transition-colors"
        >
          <Download size={11} /> Download
        </a>
      </div>
    </div>
  );
}

// ── credentials section ─────────────────────────────────────────────────────
function CredentialsSection({ username, isSelf }: { username: string; isSelf: boolean }) {
  const { data, isLoading } = useQuery<{ credentials: Credential[]; isSelf: boolean }>({
    queryKey: ["credentials", username],
    queryFn: () => fetch(`/api/profile/${encodeURIComponent(username)}/credentials`, { credentials: "include" }).then(r => r.json()),
  });

  const creds = data?.credentials ?? [];
  if (isLoading) return <div className="text-xs text-zinc-600 py-4 text-center">Loading credentials…</div>;
  if (!isSelf && creds.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Credentials</h2>
        <span className="text-xs text-zinc-600">{creds.length} uploaded</span>
      </div>

      {isSelf && <CredentialUpload username={username} />}

      {creds.length > 0 ? (
        <div className="space-y-2">
          {creds.map(c => <CredentialCard key={c.id} cred={c} isSelf={isSelf} username={username} />)}
        </div>
      ) : (
        <p className="text-xs text-zinc-700 text-center py-2">No credentials uploaded yet.</p>
      )}
    </div>
  );
}

// ── main profile page ───────────────────────────────────────────────────────
export default function ProfilePage() {
  const params   = useParams<{ username: string }>();
  const username = params.username;
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.username === username;

  const { data, isLoading, isError } = useQuery<ProfileData>({
    queryKey: ["/api/profile", username],
    queryFn: async () => {
      const r = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (!r.ok) throw new Error("User not found");
      return r.json();
    },
    enabled: !!username,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-2">
        <Radio size={32} className="mx-auto animate-pulse text-cyan-400" />
        <p className="text-zinc-400 text-sm">Resolving NexusOS identity…</p>
      </div>
    </div>
  );

  if (isError || !data) return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-zinc-400">No spectral identity found for <span className="text-white font-mono">{username}</span></p>
      <Link href="/wnsp-bridge" className="text-cyan-400 hover:underline text-sm">← WNSP Bridge</Link>
    </div>
  );

  const { user, wallet, spectral, content, blockchain, wnspAddresses } = data;
  const color = nmToRgb(spectral.nm);
  const bg    = bandGradient(spectral.nm);

  return (
    <div className="min-h-screen bg-black text-white">

      {/* nav */}
      <div className="max-w-4xl mx-auto px-4 pt-6 flex items-center gap-4">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={14} /> Hub
        </Link>
        <span className="text-zinc-700">·</span>
        <Link href="/directory" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          Directory
        </Link>
        {isSelf && (
          <>
            <span className="text-zinc-700">·</span>
            <Link href="/wallet" className="text-zinc-500 hover:text-amber-400 text-sm transition-colors">
              NXT Wallet
            </Link>
          </>
        )}
      </div>

      {/* ── NexusOS identity hero ── */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div className="rounded-2xl border p-8" style={{ background: bg, borderColor: `${color}33` }}>

          {/* avatar + name */}
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0 border-2"
              style={{ background: `${color}33`, borderColor: `${color}55` }}>
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {user.username}
                {user.role === "admin" && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: `${color}33`, color }}>admin</span>
                )}
              </h1>
              <p className="text-zinc-400 text-sm mt-0.5">Member since {fmtDate(user.createdAt)}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 w-32 rounded-full" style={{ background: color }} />
                <span className="text-xs font-mono" style={{ color }}>{spectral.band} · λ={spectral.nm}nm</span>
              </div>
            </div>
          </div>

          {/* WNSP-URI canonical address */}
          <div className="mt-5 rounded-xl border p-3 flex items-center gap-2"
            style={{ background: "#00000066", borderColor: `${color}22` }}>
            <Radio size={13} style={{ color }} className="flex-shrink-0" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex-shrink-0">Canonical address</span>
            <span className="font-mono text-xs truncate flex-1" data-testid="text-wnsp-uri" style={{ color }}>{spectral.uri}</span>
            <CopyButton text={spectral.uri} />
            {spectral.registered && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 flex-shrink-0">
                <BadgeCheck size={10} /> On-chain
              </span>
            )}
          </div>

          {/* Ψ channel params */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Ψ channel",    value: spectral.psi },
              { label: "WDM slot",     value: String(spectral.wdm) },
              { label: "OAM mode",     value: String(spectral.oam) },
              { label: "Polarisation", value: spectral.pol === "V" ? "Vertical" : "Horizontal" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-2 text-center" style={{ background: `${color}11` }}>
                <p className="text-[10px] text-zinc-500">{label}</p>
                <p className="text-sm font-mono font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            Physics-assigned via WASCII v1.0 · CE→SE · Permanent · No server decides your address
          </p>
        </div>
      </div>

      {/* stats strip */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Database, label: "Spectral Records", value: content.total },
            { Icon: Zap,      label: "Blockchain TXs",   value: blockchain.txCount },
            { Icon: Radio,    label: "WNSP Addresses",   value: wnspAddresses.length },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
              <Icon size={18} className="mx-auto mb-1 text-zinc-500" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Spectral Authority Identity Panel ── */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Crown size={12} /> Spectral Authority
        </h2>
        <SpectralIdentityPanel spectral={spectral} isSelf={isSelf} />
      </div>

      {/* wallet */}
      {wallet && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-3">
              <Wallet size={16} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-500 mb-0.5">NXT Wallet Address</p>
                <p className="font-mono text-sm truncate" data-testid="text-wallet-address">{wallet.address}</p>
              </div>
              <CopyButton text={wallet.address} />
              {isSelf && (
                <Link href="/wallet" data-testid="link-wallet-page">
                  <button className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-950/40 transition-colors whitespace-nowrap">
                    Open Wallet
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials ── */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <CredentialsSection username={username} isSelf={isSelf} />
      </div>

      {/* spectral content */}
      {content.recent.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Spectral Content</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {content.recent.map(rec => {
              const c2 = rec.band ? nmToRgb(parseFloat(rec.wavelengthNm ?? "550")) : "#6b7280";
              return (
                <div key={rec.id} data-testid={`card-content-${rec.id}`}
                  className="rounded-xl border p-3 flex items-start gap-3"
                  style={{ borderColor: `${c2}22`, background: `${c2}08` }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c2 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rec.label ?? "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono" style={{ color: c2 }}>{rec.psiChannel}</span>
                      <span className="text-xs text-zinc-600">{(rec.data as any)?.mimeType ?? (rec.data as any)?.type ?? "text"}</span>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-600 flex-shrink-0">{fmtDate(rec.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* wnsp addresses */}
      {wnspAddresses.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-3">Registered WNSP Addresses</h2>
          <div className="space-y-2">
            {wnspAddresses.map(addr => (
              <div key={addr.id} data-testid={`row-wnsp-${addr.id}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: nmToRgb(500) }} />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm text-cyan-400">{addr.wnspUri}</span>
                  {addr.label && addr.label !== addr.wnspUri && <span className="ml-2 text-xs text-zinc-500">{addr.label}</span>}
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0 capitalize">{addr.resourceType}</span>
                <Link href={`/wnsp-bridge?resolve=${encodeURIComponent(addr.psiChannel)}`}
                  className="text-zinc-600 hover:text-white transition-colors flex-shrink-0" data-testid={`link-resolve-${addr.id}`}>
                  <ExternalLink size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.recent.length === 0 && wnspAddresses.length <= 1 && (
        <div className="max-w-4xl mx-auto px-4 pb-10 text-center">
          <p className="text-zinc-600 text-sm">No spectral content stored yet.</p>
          <Link href="/spectral-db" className="text-cyan-400 hover:underline text-sm mt-1 inline-block">Store content in the Spectral DB →</Link>
        </div>
      )}
    </div>
  );
}
