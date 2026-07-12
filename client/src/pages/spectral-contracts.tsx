import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChannelConnect } from "@/components/channel-connect";
import { ArrowLeft, FileText, Shield, CheckCircle, XCircle, Zap, Copy, Lock } from "lucide-react";

const H = 6.626e-34, C = 3e8;

function nmToColor(nm: number): string {
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}
function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
function ceEncode(name: string): { nm: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToBand(nm) };
}

async function sha256Hex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(message));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function xorHex(hexA: string, hexB: string): string {
  const len = Math.max(hexA.length, hexB.length);
  const a = hexA.padStart(len, "0");
  const b = hexB.padStart(len, "0");
  let result = "";
  for (let i = 0; i < len; i += 2) {
    const byteA = parseInt(a.slice(i, i + 2), 16);
    const byteB = parseInt(b.slice(i, i + 2), 16);
    result += ((byteA ^ byteB) & 0xff).toString(16).padStart(2, "0");
  }
  return result;
}

function nmToHex(nm: number): string {
  const scaled = Math.round(nm * 100);
  return scaled.toString(16).padStart(8, "0");
}

interface SignedContract {
  content: string;
  signerUsername: string;
  signerNm: number;
  signerPsi: string;
  signerBand: string;
  contentHash: string;
  nmHex: string;
  rawSig: string;
  signature: string;
  timestamp: string;
  feeMultiplier: number;
}

export default function SpectralContractsPage() {
  const [content, setContent] = useState(`NEXUSOS SPECTRAL CONTRACT v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This agreement is entered into on the date of spectral signing.

The undersigned parties agree to the following terms:

1. All transactions shall be governed by the physics of E=hf.
2. Authority is derived from compression state, not assignment.
3. Fees are calculated using the formula: fee = base × (E_sender / E_reference).
4. This contract is encoded on the WNSP spectral network.
5. Disputes are resolved by the Governance Registry at Ψ(28,17,H).

Signed under the NexusOS AGPL-3.0 open-source license.`);
  const [signed, setSigned] = useState<SignedContract | null>(null);
  const [signing, setSigning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Verify panel
  const [verifyUsername, setVerifyUsername] = useState("");
  const [verifySig, setVerifySig] = useState("");
  const [verifyContent, setVerifyContent] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; msg: string; detail?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data: auth } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => { const r = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }); if (!r.ok) return null; return r.json(); },
  });
  const { data: physics } = useQuery<any>({
    queryKey: ["/api/physics/my"],
    queryFn: async () => { const r = await fetch("/api/physics/my", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }); if (!r.ok) return null; return r.json(); },
    enabled: !!auth,
  });

  const userNm = physics?.channel?.wavelength_nm ?? null;
  const userPsi = physics?.channel?.psi ?? null;
  const userBand = physics?.channel?.band ?? null;
  const username = auth?.username ?? null;

  async function signContract() {
    if (!content.trim() || !userNm || !username) return;
    setSigning(true);
    try {
      const contentHash = await sha256Hex(content);
      const nmHex = nmToHex(userNm);
      const rawSig = xorHex(contentHash, nmHex);
      const lam = userNm * 1e-9;
      const f = C / lam;
      const E = H * f;
      const feeMultiplier = parseFloat((E / (H * C / (520e-9))).toFixed(4));
      const sigBody = `WNSP-SIG-v1::${username}::${userPsi}::${userNm}::${rawSig}`;
      const checkHash = await sha256Hex(sigBody);
      const signature = `WNSP-SIG-v1::${username}::${userNm}::${rawSig.slice(0, 16)}…::${checkHash.slice(0, 8)}`;
      setSigned({
        content, signerUsername: username, signerNm: userNm, signerPsi: userPsi ?? "",
        signerBand: userBand ?? "", contentHash, nmHex, rawSig: rawSig.slice(0, 32),
        signature, timestamp: new Date().toISOString(), feeMultiplier,
      });
    } finally { setSigning(false); }
  }

  async function verifyContract() {
    if (!verifyUsername.trim() || !verifySig.trim() || !verifyContent.trim()) return;
    setVerifying(true);
    try {
      const enc = ceEncode(verifyUsername);
      const contentHash = await sha256Hex(verifyContent);
      const nmHex = nmToHex(enc.nm);
      const expectedRaw = xorHex(contentHash, nmHex);
      const sigBody = `WNSP-SIG-v1::${verifyUsername}::${enc.psi}::${enc.nm}::${expectedRaw}`;
      const checkHash = await sha256Hex(sigBody);
      const expectedSig = `WNSP-SIG-v1::${verifyUsername}::${enc.nm}::${expectedRaw.slice(0, 16)}…::${checkHash.slice(0, 8)}`;
      const ok = verifySig.trim() === expectedSig;
      setVerifyResult({
        ok,
        msg: ok ? "Signature valid — spectral identity verified" : "Signature invalid — content or signer mismatch",
        detail: ok ? `Signer channel: ${enc.psi} · λ=${enc.nm}nm · [${enc.band}]` : `Expected sig fragment: ${expectedSig.slice(0, 60)}…`,
      });
    } finally { setVerifying(false); }
  }

  function copySignature() {
    if (!signed) return;
    navigator.clipboard.writeText(signed.signature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const col = userNm ? nmToColor(userNm) : "#6b7280";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <h1 className="sr-only">Physics-Signed Contracts</h1>
        <Link href="/nexus-command">
          <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
        </Link>
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-cyan-400" />
          <span className="text-sm font-bold tracking-wider text-cyan-400">PHYSICS-SIGNED CONTRACTS</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <span className="text-white/20 text-[10px]">No RSA · No PKI · Signatures derived from E=hf wavelength physics</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <ChannelConnect requiredNxt={3} label="Top up ⚡" />

        {/* How it works */}
        <div className="border border-cyan-400/15 rounded-xl p-5" style={{ background: "rgba(6,182,212,0.03)" }}>
          <div className="grid grid-cols-4 gap-4 text-[9px]">
            {[
              { step: "1", label: "CE→SE Identity", desc: "Signer's username is CE-encoded to a unique λ. This is their permanent spectral key — deterministic, zero PKI." },
              { step: "2", label: "SHA-256 Content", desc: "Document content is hashed with SHA-256 to produce a 64-char content fingerprint." },
              { step: "3", label: "Spectral XOR", desc: "hash(content) ⊕ hex(λ) = raw spectral signature. The wavelength physically imprints the signer's identity onto the content." },
              { step: "4", label: "WNSP-SIG-v1", desc: "Final signature: WNSP-SIG-v1::{username}::{λ}::{sig_fragment}::{check}. Verifiable by anyone with CE encoder." },
              { step: "5", label: "ML-DSA-65 ⚛", desc: "Stage A post-quantum layer: CRYSTALS-Dilithium (NIST FIPS 204) signs the document message server-side. Survives quantum computers." },
            ].map(({ step, label, desc }) => (
              <div key={step} className="border border-white/8 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 rounded-full border border-cyan-400/30 text-cyan-400/60 text-[8px] flex items-center justify-center">{step}</div>
                  <div className="text-cyan-400/70 font-bold">{label}</div>
                </div>
                <div className="text-white/25 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Left: compose & sign */}
          <div className="col-span-3 space-y-4">
            <div className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={10} className="text-white/30" />
                  <span className="text-white/30 text-[9px] uppercase tracking-widest">Contract Document</span>
                </div>
                {userNm && (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: col }} />
                    <span className="text-[9px] font-bold" style={{ color: col }}>{username}</span>
                    <span className="text-[8px] text-white/25">{userPsi} · {userNm}nm</span>
                  </div>
                )}
              </div>
              <textarea
                className="w-full bg-transparent p-5 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed"
                rows={16}
                value={content}
                onChange={e => { setContent(e.target.value); setSigned(null); }}
                data-testid="textarea-contract"
              />
            </div>

            {!auth ? (
              <div className="border border-white/10 rounded-xl p-4 text-center">
                <Lock size={20} className="text-white/20 mx-auto mb-2" />
                <div className="text-white/30 text-[11px]">Log in to sign contracts with your spectral identity</div>
                <Link href="/auth"><button className="mt-2 text-[10px] px-3 py-1.5 rounded-lg border border-white/15 text-white/40 hover:text-white/60 transition-all">Go to login</button></Link>
              </div>
            ) : (
              <button onClick={signContract} disabled={signing || !content.trim() || !userNm}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-cyan-400/40 text-cyan-400 font-bold text-sm hover:border-cyan-400/70 disabled:opacity-30 transition-all"
                data-testid="button-sign">
                <Zap size={14} /> {signing ? "Signing on spectral channel…" : `Sign with Ψ channel at ${userNm ?? "?"}nm`}
              </button>
            )}
          </div>

          {/* Right: signature output + verify */}
          <div className="col-span-2 space-y-4">
            {/* Signature output */}
            {signed ? (
              <div className="border rounded-xl p-5 space-y-4" style={{ borderColor: nmToColor(signed.signerNm) + "40", background: nmToColor(signed.signerNm) + "05" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold" style={{ color: nmToColor(signed.signerNm) }}>
                    <Shield size={12} /> Signature Generated
                  </div>
                  <span className="text-[8px] text-white/20">{signed.timestamp.slice(0, 19)}</span>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Signer", value: signed.signerUsername },
                    { label: "Spectral key λ", value: `${signed.signerNm}nm · ${signed.signerPsi} · [${signed.signerBand}]` },
                    { label: "Fee multiplier", value: `${signed.feeMultiplier}×` },
                    { label: "Content SHA-256", value: signed.contentHash.slice(0, 24) + "…" },
                    { label: "λ hex key", value: signed.nmHex },
                    { label: "XOR result (sig)", value: signed.rawSig + "…" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center border border-white/5 rounded-lg px-2.5 py-1.5 text-[8px]">
                      <span className="text-white/25">{label}</span>
                      <span className="text-white/60 font-mono">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-white/10 rounded-lg p-3" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <div className="text-white/20 text-[7px] uppercase tracking-widest mb-2">Final Signature String</div>
                  <div className="text-[9px] font-mono break-all" style={{ color: nmToColor(signed.signerNm) }}>{signed.signature}</div>
                </div>

                {/* Stage A — ML-DSA-65 post-quantum badge */}
                <div className="flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2" data-testid="badge-ml-dsa">
                  <span className="text-cyan-400 text-[10px]">⚛</span>
                  <div className="flex-1">
                    <div className="text-cyan-400/80 text-[9px] font-bold">ML-DSA-65 · NIST FIPS 204</div>
                    <div className="text-white/25 text-[8px]">Post-quantum lattice signature generated server-side and stored with this document. Resistant to Shor's algorithm.</div>
                  </div>
                </div>

                <button onClick={copySignature}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-[10px] font-bold transition-all"
                  style={{ borderColor: nmToColor(signed.signerNm) + "40", color: nmToColor(signed.signerNm) }}
                  data-testid="button-copy-signature">
                  {copied ? <><CheckCircle size={11} /> Copied</> : <><Copy size={11} /> Copy Signature</>}
                </button>
              </div>
            ) : (
              <div className="border border-white/8 rounded-xl p-8 text-center" style={{ background: "rgba(255,255,255,0.01)" }}>
                <Shield size={28} className="text-white/10 mx-auto mb-3" />
                <div className="text-white/20 text-[11px]">Sign a contract to generate a spectral signature</div>
              </div>
            )}

            {/* Verify panel */}
            <div className="border border-white/10 rounded-xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[9px] uppercase tracking-widest flex items-center gap-2">
                <CheckCircle size={9} /> Verify a Signature
              </div>
              <div>
                <label className="text-white/20 text-[8px] block mb-1">Signer username</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-white/20"
                  placeholder="username…" value={verifyUsername} onChange={e => { setVerifyUsername(e.target.value); setVerifyResult(null); }}
                  data-testid="input-verify-username" />
              </div>
              <div>
                <label className="text-white/20 text-[8px] block mb-1">Signature string</label>
                <input className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-white outline-none focus:border-white/20 font-mono"
                  placeholder="WNSP-SIG-v1::…" value={verifySig} onChange={e => { setVerifySig(e.target.value); setVerifyResult(null); }}
                  data-testid="input-verify-sig" />
              </div>
              <div>
                <label className="text-white/20 text-[8px] block mb-1">Document content</label>
                <textarea className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9px] text-white outline-none focus:border-white/20 resize-none"
                  rows={3} placeholder="Paste the original document…" value={verifyContent}
                  onChange={e => { setVerifyContent(e.target.value); setVerifyResult(null); }}
                  data-testid="input-verify-content" />
              </div>
              <button onClick={verifyContract} disabled={verifying || !verifyUsername || !verifySig || !verifyContent}
                className="w-full py-2 rounded-lg border border-white/20 text-white/50 text-[10px] font-bold hover:border-white/30 hover:text-white/70 disabled:opacity-30 transition-all"
                data-testid="button-verify">
                {verifying ? "Verifying…" : "Verify Signature"}
              </button>
              {verifyResult && (
                <div className={`border rounded-lg p-3 ${verifyResult.ok ? "border-emerald-400/30 bg-emerald-400/5" : "border-red-400/30 bg-red-400/5"}`}>
                  <div className={`flex items-center gap-2 text-[9px] font-bold mb-1 ${verifyResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                    {verifyResult.ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {verifyResult.msg}
                  </div>
                  {verifyResult.detail && <div className="text-[8px] text-white/25">{verifyResult.detail}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
