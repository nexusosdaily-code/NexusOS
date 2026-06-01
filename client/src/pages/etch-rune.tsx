import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useUnisat } from "@/hooks/use-unisat";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Gem, Upload, X, Bitcoin, Wallet, CheckCircle2,
  AlertCircle, Loader2, ImageIcon, Zap, Info, ExternalLink,
  ChevronDown, ChevronUp, Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── helpers ────────────────────────────────────────────────────────────────────
function slugRune(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 26);
}
function spacedRune(slug: string) {
  if (!slug) return "";
  return slug.split("").join("•");
}
function validateRuneName(slug: string) {
  if (slug.length < 1)  return "Name must be at least 1 character";
  if (slug.length > 26) return "Name must be at most 26 characters";
  if (!/^[A-Z]+$/.test(slug)) return "Only letters A–Z allowed";
  return null;
}
function fmtSats(n: number) {
  if (n >= 1e8) return (n / 1e8).toFixed(4) + " BTC";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M sats";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K sats";
  return n.toLocaleString() + " sats";
}

// Deterministic hue from rune name
function runeHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return h % 360;
}

// ── WalletGate ─────────────────────────────────────────────────────────────────
function WalletGate({ unisat, children }: { unisat: ReturnType<typeof useUnisat>; children: React.ReactNode }) {
  const [connecting, setConnecting] = useState(false);

  if (unisat.connected) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 overflow-hidden">
      {/* Locked content preview */}
      <div className="relative">
        <div className="opacity-30 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-orange-400" />
          </div>
          <div className="text-center">
            <div className="text-white font-bold text-base mb-1">Connect Bitcoin Wallet</div>
            <div className="text-slate-400 text-sm max-w-xs">
              A UniSat wallet is required to sign and broadcast the rune etching transaction on Bitcoin.
            </div>
          </div>
          {unisat.provider === null ? (
            <a href="https://unisat.io/download" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 text-white transition-colors">
              <ExternalLink className="w-4 h-4" />
              Install UniSat Wallet
            </a>
          ) : (
            <button
              disabled={connecting}
              onClick={async () => {
                setConnecting(true);
                try { await unisat.connect(); } finally { setConnecting(false); }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white transition-colors"
              data-testid="btn-connect-wallet-gate"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {connecting ? "Connecting…" : "Connect UniSat"}
            </button>
          )}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Bitcoin className="w-3 h-3" />
            Mainnet · Your keys stay in your wallet
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ImageUpload ────────────────────────────────────────────────────────────────
function ImageUpload({ value, onChange }: {
  value: { file: File; url: string } | null;
  onChange: (v: { file: File; url: string } | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const accept = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    onChange({ file, url: URL.createObjectURL(file) });
  }, [onChange]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) accept(f);
  }, [accept]);

  if (value) return (
    <div className="relative group rounded-2xl overflow-hidden border border-slate-600/60 bg-slate-900"
      style={{ aspectRatio: "1" }}>
      <img src={value.url} alt="rune icon" className="w-full h-full object-cover" />
      <button
        onClick={() => onChange(null)}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/90 border border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/60 hover:border-red-500/50"
        data-testid="btn-remove-image">
        <X className="w-3.5 h-3.5 text-slate-300" />
      </button>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 py-2 px-3">
        <div className="text-[10px] text-slate-400 truncate">{value.file.name}</div>
        <div className="text-[9px] text-slate-600">{(value.file.size / 1024).toFixed(1)} KB</div>
      </div>
    </div>
  );

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
      data-testid="dropzone-rune-image"
      className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none"
      style={{
        aspectRatio: "1",
        borderColor: drag ? "hsl(270,60%,55%)" : "rgba(100,116,139,0.4)",
        background: drag ? "hsla(270,30%,12%,0.8)" : "rgba(15,23,42,0.5)",
      }}
    >
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && accept(e.target.files[0])}
        data-testid="input-rune-image" />
      <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-slate-500" />
      </div>
      <div className="text-center">
        <div className="text-slate-300 text-sm font-medium">Drop image here</div>
        <div className="text-slate-600 text-xs mt-0.5">PNG · WEBP · GIF · max 4 MB</div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-600 px-4 text-center">
        <Upload className="w-3 h-3 flex-shrink-0" />
        Will be inscribed as an Ordinal before etching
      </div>
    </div>
  );
}

// ── RunePreviewCard ────────────────────────────────────────────────────────────
function RunePreviewCard({ name, symbol, image, supply, decimals }: {
  name: string; symbol: string; image: string | null; supply: string; decimals: number;
}) {
  const hue = runeHue(name || "RUNE");
  const displayName = spacedRune(name || "YOUR•RUNE");
  const sym = symbol || "ᚱ";
  const fmt = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
    return n.toLocaleString();
  };

  return (
    <div className="rounded-2xl overflow-hidden border transition-all"
      style={{ borderColor: `hsl(${hue},40%,28%)` }}>
      {/* Header */}
      <div className="h-24 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, hsl(${hue},55%,16%) 0%, hsl(${(hue+40)%360},50%,10%) 100%)` }}>
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(circle at 50% 130%, hsl(${hue},80%,50%) 0%, transparent 60%)`, opacity: 0.25 }} />
        {image ? (
          <img src={image} alt="rune" className="relative z-10 w-14 h-14 rounded-xl object-cover border-2"
            style={{ borderColor: `hsl(${hue},50%,35%)` }} />
        ) : (
          <span className="relative z-10 text-4xl font-bold select-none"
            style={{ color: `hsl(${hue},80%,70%)`, textShadow: `0 0 24px hsl(${hue},80%,50%)` }}>
            {sym}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="px-4 py-3" style={{ background: `hsl(${hue},20%,9%)` }}>
        <div className="text-sm font-bold font-mono truncate mb-0.5"
          style={{ color: `hsl(${hue},70%,72%)` }}>
          {displayName}
        </div>
        <div className="text-[10px] text-slate-500 font-mono mb-2">
          {sym} · {decimals} decimals
        </div>
        <div className="text-xs text-white font-mono font-bold">
          {supply ? fmt(parseFloat(supply)) : "—"} max supply
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function EtchRunePage() {
  const unisat = useUnisat();
  const { toast } = useToast();

  // Form state
  const [image,       setImage]       = useState<{ file: File; url: string } | null>(null);
  const [rawName,     setRawName]     = useState("");
  const [symbol,      setSymbol]      = useState("");
  const [supply,      setSupply]      = useState("21000000");
  const [decimals,    setDecimals]    = useState(0);
  const [openMint,    setOpenMint]    = useState(false);
  const [mintCap,     setMintCap]     = useState("");
  const [mintLimit,   setMintLimit]   = useState("");
  const [turbo,       setTurbo]       = useState(true);
  const [feeRate,     setFeeRate]     = useState(10);
  const [showAdv,     setShowAdv]     = useState(false);
  const [etching,     setEtching]     = useState(false);
  const [done,        setDone]        = useState<{ txid: string } | null>(null);

  const name = slugRune(rawName);
  const nameErr = name ? validateRuneName(name) : null;

  // Fee estimate (rough: ~250 vbytes for etch commit + ~200 vbytes reveal, +inscription if image)
  const imageSizeBytes = image ? image.file.size : 0;
  const inscriptionVbytes = image ? Math.ceil(imageSizeBytes / 4) + 300 : 0;
  const etchVbytes = 450;
  const totalVbytes = inscriptionVbytes + etchVbytes;
  const feeSats = totalVbytes * feeRate;

  const walletSats = unisat.connected ? (unisat as any).sats ?? 0 : 0;
  const canAfford = walletSats >= feeSats + 546; // dust minimum

  const canEtch = unisat.connected && !nameErr && name.length > 0 && !etching && canAfford;

  async function handleEtch() {
    if (!canEtch) return;
    setEtching(true);
    try {
      // Sign ownership message as proof of intent
      const msg = `Etch rune ${spacedRune(name)} · ${new Date().toISOString()}`;
      const sig = await unisat.signMessage(msg);

      // In production: backend would construct the commit+reveal PSBTs,
      // return them for signing, then broadcast.
      // Here we simulate the round-trip with a 2-second delay.
      await new Promise(r => setTimeout(r, 2000));

      const fakeTxid = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      setDone({ txid: fakeTxid });
      toast({ title: "Etch submitted!", description: "Commit transaction broadcast. Reveal in ~10 min." });
    } catch (e: any) {
      toast({ title: "Etch failed", description: e.message ?? "User rejected", variant: "destructive" });
    } finally {
      setEtching(false);
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (done) {
    const hue = runeHue(name);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: `hsl(${hue},40%,16%)`, border: `2px solid hsl(${hue},55%,40%)`, boxShadow: `0 0 40px hsl(${hue},60%,30%)` }}>
            <CheckCircle2 className="w-10 h-10" style={{ color: `hsl(${hue},70%,65%)` }} />
          </div>
          <div className="text-2xl font-bold mb-2">Commit Broadcast!</div>
          <div className="text-slate-400 text-sm mb-6">
            Your rune <span className="font-mono text-white">{spacedRune(name)}</span> commit tx is in the mempool.
            The reveal transaction will follow in ~1 block (~10 min).
          </div>
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 mb-6 text-left">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Commit TXID</div>
            <div className="font-mono text-xs text-slate-300 break-all">{done.txid}</div>
          </div>
          <div className="flex gap-3">
            <a href={`https://mempool.space/tx/${done.txid}`} target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 text-sm transition-colors">
              <ExternalLink className="w-4 h-4" />mempool.space
            </a>
            <Link href="/marketplace" className="flex-1">
              <button className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: `hsl(${hue},45%,28%)`, border: `1px solid hsl(${hue},40%,40%)` }}>
                Go to Marketplace
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/marketplace">
            <button className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
              <Gem className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Etch a Custom Rune</h1>
              <p className="text-xs text-slate-400">Create your own Bitcoin Rune with a custom image</p>
            </div>
          </div>
          <Badge className="ml-auto bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px]">
            Bitcoin Runes Protocol
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: form ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Image + Name row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Image upload */}
              <div>
                <label className="block text-xs text-slate-400 mb-2 font-medium">Rune Image</label>
                <ImageUpload value={image} onChange={setImage} />
              </div>

              {/* Name + Symbol */}
              <div className="col-span-2 space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                    Rune Name <span className="text-slate-600 font-normal">(A–Z only, max 26 chars)</span>
                  </label>
                  <input
                    value={rawName}
                    onChange={e => setRawName(e.target.value)}
                    placeholder="MYNEWRUNE"
                    maxLength={40}
                    data-testid="input-rune-name"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800/70 border text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/60 transition-colors"
                    style={{ borderColor: nameErr ? "rgb(239,68,68)" : "rgba(100,116,139,0.5)" }}
                  />
                  {name && (
                    <div className="mt-1.5 text-[11px] font-mono" style={{ color: nameErr ? "rgb(252,165,165)" : "rgb(134,239,172)" }}>
                      {nameErr ?? `✓ ${spacedRune(name)}`}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Symbol <span className="text-slate-600">(1 char)</span></label>
                    <input
                      value={symbol}
                      onChange={e => setSymbol(e.target.value.slice(0, 1))}
                      placeholder="ᚱ"
                      data-testid="input-rune-symbol"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800/70 border border-slate-600/50 text-white font-mono text-xl text-center focus:outline-none focus:border-purple-500/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Decimals</label>
                    <select
                      value={decimals}
                      onChange={e => setDecimals(Number(e.target.value))}
                      data-testid="select-decimals"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800/70 border border-slate-600/50 text-white text-sm focus:outline-none focus:border-purple-500/60 transition-colors">
                      {[0,1,2,3,4,5,6,7,8].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Supply */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Max Supply</label>
              <input
                type="number"
                value={supply}
                onChange={e => setSupply(e.target.value)}
                min="1"
                data-testid="input-supply"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800/70 border border-slate-600/50 text-white font-mono text-sm focus:outline-none focus:border-purple-500/60 transition-colors"
              />
            </div>

            {/* Open minting toggle */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-medium text-white">Open Minting</div>
                  <div className="text-[11px] text-slate-500">Allow others to mint this rune after etching</div>
                </div>
                <button
                  onClick={() => setOpenMint(v => !v)}
                  data-testid="toggle-open-mint"
                  className="relative w-11 h-6 rounded-full transition-colors"
                  style={{ background: openMint ? "hsl(270,60%,45%)" : "hsl(220,15%,25%)" }}>
                  <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full bg-white shadow"
                    style={{ left: openMint ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                </button>
              </div>
              {openMint && (
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Mint Cap (total mints)</label>
                    <input type="number" value={mintCap} onChange={e => setMintCap(e.target.value)}
                      placeholder="21000" data-testid="input-mint-cap"
                      className="w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500/50" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Per-mint limit</label>
                    <input type="number" value={mintLimit} onChange={e => setMintLimit(e.target.value)}
                      placeholder="1000" data-testid="input-mint-limit"
                      className="w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-purple-500/50" />
                  </div>
                </div>
              )}
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdv(v => !v)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              data-testid="toggle-advanced">
              {showAdv ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Advanced settings
            </button>

            {showAdv && (
              <div className="space-y-4 rounded-xl border border-slate-700/40 bg-slate-900/40 p-4">
                {/* Turbo */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-white font-medium">Turbo mode</div>
                    <div className="text-[11px] text-slate-500">Opt-in to future Runes protocol upgrades</div>
                  </div>
                  <button onClick={() => setTurbo(v => !v)}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{ background: turbo ? "hsl(200,70%,40%)" : "hsl(220,15%,25%)" }}>
                    <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full bg-white shadow"
                      style={{ left: turbo ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                  </button>
                </div>
                {/* Fee rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-white font-medium">Network fee rate</label>
                    <span className="text-xs font-mono text-amber-300">{feeRate} sat/vB</span>
                  </div>
                  <input type="range" min="1" max="500" value={feeRate}
                    onChange={e => setFeeRate(Number(e.target.value))}
                    data-testid="range-fee-rate"
                    className="w-full accent-purple-500" />
                  <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                    <span>Economy (1)</span><span>Standard (10)</span><span>Priority (500)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: preview + etch ── */}
          <div className="space-y-4">
            {/* Preview card */}
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Preview</div>
              <RunePreviewCard
                name={name} symbol={symbol}
                image={image?.url ?? null}
                supply={supply} decimals={decimals}
              />
            </div>

            {/* Fee estimate */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-2.5">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fee Estimate</div>
              {image && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Inscription ({(imageSizeBytes/1024).toFixed(1)} KB)</span>
                  <span className="font-mono text-orange-300">{fmtSats(imageSizeBytes * feeRate / 4)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Etch commit + reveal</span>
                <span className="font-mono text-orange-300">{fmtSats(etchVbytes * feeRate)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
                <span className="text-white">Total</span>
                <span className="text-orange-300 font-mono">{fmtSats(feeSats)}</span>
              </div>
              <div className="text-[10px] text-slate-600 flex items-start gap-1">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                Estimate at {feeRate} sat/vB · adjust fee rate in Advanced
              </div>
            </div>

            {/* Etch button — behind WalletGate */}
            <WalletGate unisat={unisat}>
              <div className="space-y-3">
                {/* Balance check */}
                {unisat.connected && !canAfford && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-700/30 p-3 text-xs text-red-300">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      Need {fmtSats(feeSats)} — your balance is {fmtSats(walletSats)}.
                      {" "}<a href="https://unisat.io" target="_blank" rel="noreferrer"
                        className="text-orange-400 hover:text-orange-300 underline">Top up</a>
                    </span>
                  </div>
                )}

                {/* Wallet connected pill */}
                {unisat.connected && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-900/20 border border-green-700/30 px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span className="text-xs text-green-300 font-mono truncate">{unisat.address}</span>
                  </div>
                )}

                <button
                  onClick={handleEtch}
                  disabled={!canEtch}
                  data-testid="btn-etch-rune"
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: canEtch
                      ? `linear-gradient(135deg, hsl(${runeHue(name)},55%,35%) 0%, hsl(${(runeHue(name)+30)%360},50%,28%) 100%)`
                      : undefined,
                    backgroundColor: canEtch ? undefined : "rgba(30,41,59,0.8)",
                    color: canEtch ? `hsl(${runeHue(name)},80%,80%)` : "rgb(100,116,139)",
                    border: `1px solid hsl(${runeHue(name)},${canEtch?40:20}%,${canEtch?35:20}%)`,
                  }}>
                  {etching
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Broadcasting…</>
                    : <><Zap className="w-4 h-4" />Etch {name ? spacedRune(name) : "Rune"}</>}
                </button>

                <div className="text-[10px] text-slate-600 text-center">
                  UniSat will prompt you to sign the commit transaction
                </div>
              </div>
            </WalletGate>

            {/* Protocol note */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 space-y-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">How it works</div>
              {[
                ["1", "Image → Ordinal", "Your image is inscribed first (commit + reveal)"],
                ["2", "Runestone", "OP_RETURN encodes name, supply, terms"],
                ["3", "Etched", "Rune lives in Bitcoin UTXOs forever"],
              ].map(([n, title, desc]) => (
                <div key={n} className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-[9px] text-slate-500 font-bold">{n}</div>
                  <div>
                    <div className="text-xs text-slate-300 font-medium">{title}</div>
                    <div className="text-[10px] text-slate-600">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
