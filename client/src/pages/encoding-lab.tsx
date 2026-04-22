import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Zap, Search, Send, Radio, Layers, ArrowRight,
  Copy, Check, Globe, Lock, Code2, Wifi
} from "lucide-react";
import { SpectralPanel } from "@/components/spectral-visuals";

// ── Wavelength → visible colour ───────────────────────────────────
function wlToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

// ── Band in human language ────────────────────────────────────────
function describeWavelength(nm: number): { band: string; colour: string; meaning: string; authority: string } {
  if (nm < 450) return { band: "Deep Violet", colour: "#8b00ff", meaning: "High-authority system channel — root-level access only", authority: "System" };
  if (nm < 490) return { band: "Blue",        colour: "#2563eb", meaning: "Authentication channel — identity and trust verification", authority: "Kernel" };
  if (nm < 520) return { band: "Cyan-Green",  colour: "#06b6d4", meaning: "Streaming channel — real-time data and live broadcasts", authority: "Kernel" };
  if (nm < 565) return { band: "Green",       colour: "#16a34a", meaning: "Core logic channel — applications and computation", authority: "User" };
  if (nm < 590) return { band: "Yellow-Green",colour: "#ca8a04", meaning: "Interface channel — user experience and display", authority: "User" };
  if (nm < 625) return { band: "Orange",      colour: "#ea580c", meaning: "Event channel — notifications and signals", authority: "User" };
  return              { band: "Red",          colour: "#dc2626", meaning: "Storage channel — data persistence and archival", authority: "Guest" };
}

function WavelengthSwatch({ nm, size = "md" }: { nm: number; size?: "sm" | "md" | "lg" }) {
  const info = describeWavelength(nm);
  const sizeMap = { sm: "h-6", md: "h-10", lg: "h-16" };
  return (
    <div className={`w-full ${sizeMap[size]} rounded-lg border border-white/10`}
      style={{
        background: `linear-gradient(135deg, ${wlToRgb(Math.max(380, nm - 30))} 0%, ${wlToRgb(nm)} 50%, ${wlToRgb(Math.min(780, nm + 30))} 100%)`,
        boxShadow: `0 0 20px ${info.colour}40`,
      }} />
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Tab 1: Encode a message ────────────────────────────────────────
function EncodeTab({ onEncoded, loggedIn }: { onEncoded: (r: any) => void; loggedIn: boolean }) {
  const [text,   setText]   = useState("Open source civilization infrastructure built on physics");
  const [label,  setLabel]  = useState("my_message");
  const [result, setResult] = useState<any>(null);
  const [actions, setActions] = useState<{ bus?: any; chain?: any; }>({});

  const EXAMPLES = [
    { label: "civilization_message",  text: "Open source civilization infrastructure built on physics" },
    { label: "trust_protocol",        text: "Trustless communication no corporation can intercept or censor" },
    { label: "open_internet",         text: "Replace the internet with light no IP addresses no surveillance" },
    { label: "binary_replacement",    text: "Wavelength addresses replace binary every instruction is a colour of light" },
    { label: "p2p_stream",            text: "Peer to peer live video stream no platform no algorithm no ban" },
    { label: "energy_economics",      text: "Transaction cost derived from physical energy E equals hf not arbitrary fees" },
  ];

  const [stored, setStored] = useState(false);

  const encodeMut = useMutation({
    mutationFn: () =>
      fetch("/api/spectral-db/encode-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, label }),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Encode failed");
        return d;
      }),
    onSuccess: (d) => {
      setResult(d);
      setStored(false);
      if (d.success) onEncoded(d);
    },
  });

  const storeMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/spectral-db/store", { content: text, label })
        .then(r => r.json()),
    onSuccess: () => setStored(true),
  });

  const sendBusMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/agent-bus/send", {
        src: "os_kernel", dst: "bus_router",
        payload: `ENCODED_MSG ${label} λ=${result?.spectral?.wavelength_mid_nm?.toFixed(1)}nm — ${text.slice(0, 60)}`,
        priority: 5, msgType: "MESSAGE",
      }).then(r => r.json()),
    onSuccess: (d) => setActions(prev => ({ ...prev, bus: d })),
  });

  const mineMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/blockchain/mine", {
        content: `ENCODED ${label} λ=${result?.spectral?.wavelength_mid_nm?.toFixed(1)}nm ${result?.spectral?.psi_channel} ${text.slice(0, 60)}`,
      }).then(r => r.json()),
    onSuccess: (d) => setActions(prev => ({ ...prev, chain: d })),
  });

  const info = result?.spectral ? describeWavelength(result.spectral.wavelength_mid_nm) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 p-4 bg-slate-900/60">
        <p className="text-slate-300 text-sm font-medium mb-1">How it works</p>
        <p className="text-slate-500 text-xs">
          Every message you write is run through a physics engine — each character becomes
          a normalized spectral token, then mapped to a real electromagnetic frequency.
          Your message becomes a property of light. No server assigns it an address.
          The physics of the universe does. That address can never be taken from you.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => { setText(ex.text); setLabel(ex.label); setResult(null); setActions({}); }}
            className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 font-mono"
            data-testid={`example-${i}`}>
            {ex.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-1">
          <Label className="text-xs text-slate-400">Your message</Label>
          <Textarea value={text} onChange={e => { setText(e.target.value); setResult(null); setActions({}); }}
            className="bg-slate-800 border-slate-600 text-slate-200 text-sm min-h-28"
            placeholder="Type any message, instruction, idea, or document…"
            data-testid="input-message" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Label (identifier)</Label>
          <Input value={label} onChange={e => setLabel(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-label" />
          <Button className="w-full" onClick={() => encodeMut.mutate()}
            disabled={encodeMut.isPending || !text}
            data-testid="btn-encode">
            <Zap className="w-3 h-3 mr-1" />
            {encodeMut.isPending ? "Encoding to light…" : "Encode Message"}
          </Button>
          <p className="text-xs text-slate-600">Encodes your message to a wavelength address using CE→SE physics.</p>
          {encodeMut.isError && (
            <div className="text-red-400 text-xs border border-red-800/40 rounded px-2 py-1.5 font-mono" data-testid="encode-error">
              {(encodeMut.error as Error)?.message || "Encode failed"}
            </div>
          )}
        </div>
      </div>

      {result?.success && info && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: `${info.colour}40` }}>
          {/* Colour swatch */}
          <WavelengthSwatch nm={result.spectral.wavelength_mid_nm} size="md" />

          <div className="p-4 space-y-3" style={{ background: `${info.colour}08` }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: info.colour }} />
              <span className="text-lg font-bold text-slate-100">{parseFloat(result.spectral.wavelength_mid_nm).toFixed(1)} nm</span>
              <span className="text-sm font-mono text-slate-400">— {info.band}</span>
            </div>

            <p className="text-sm text-slate-300">{info.meaning}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              {[
                { label: "Light colour",    value: info.band,                                                   color: info.colour },
                { label: "Channel address", value: result.spectral.psi_channel,                                 color: info.colour },
                { label: "Authority",       value: info.authority,                                              color: info.colour },
                { label: "Transmission cost", value: `${parseFloat(result.spectral.energy_joules).toExponential(2)} J`, color: null },
              ].map((m, i) => (
                <div key={i} className="p-2 rounded bg-slate-900">
                  <div className="text-slate-600 mb-0.5">{m.label}</div>
                  <div className="flex items-center gap-1" style={{ color: m.color ?? "#e2e8f0" }}>
                    {m.value}
                    {m.label === "Channel address" && <CopyBtn text={m.value} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Spectrum position */}
            <div>
              <div className="text-xs text-slate-500 mb-1">Position on the visible light spectrum</div>
              <div className="relative h-5">
                <div className="absolute inset-0 rounded"
                  style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }} />
                <div className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${((result.spectral.wavelength_mid_nm - 380) / 400) * 100}%`, transform: "translateX(-50%)" }}>
                  <div className="w-3 h-5 rounded-full bg-white shadow-lg" />
                </div>
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-700 mt-0.5">
                <span>380nm UV</span><span>555nm green</span><span>780nm IR</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono leading-relaxed">
              {stored
                ? <><span className="text-green-400">✓</span> Stored permanently at {result.spectral.wavelength_mid_nm.toFixed(1)} nm. No company controls it. No algorithm can hide it.</>
                : <>Message encoded to λ {result.spectral.wavelength_mid_nm.toFixed(1)} nm. Log in and click <em>Store to Spectral DB</em> to make it permanent.</>
              }
            </div>

            {/* Cross-system actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!stored && loggedIn && (
                <Button size="sm" variant="outline"
                  className="border-cyan-800 text-cyan-300 hover:bg-cyan-900/40 text-xs"
                  onClick={() => storeMut.mutate()}
                  disabled={storeMut.isPending}
                  data-testid="btn-store-db">
                  <Zap className="w-3 h-3 mr-1" />
                  {storeMut.isPending ? "Storing…" : "Store to Spectral DB"}
                </Button>
              )}
              {!stored && !loggedIn && (
                <Link href="/auth">
                  <span className="text-xs text-slate-500 font-mono hover:text-cyan-400 transition-colors cursor-pointer"
                    data-testid="hint-login-to-store">
                    Log in to save permanently →
                  </span>
                </Link>
              )}
              {storeMut.isError && loggedIn && (
                <span className="text-red-400 text-xs self-center font-mono">
                  {(storeMut.error as Error)?.message}
                </span>
              )}
              <Button size="sm" variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                onClick={() => sendBusMut.mutate()}
                disabled={sendBusMut.isPending}
                data-testid="btn-send-bus">
                <Radio className="w-3 h-3 mr-1" />
                {sendBusMut.isPending ? "Routing…" : "Route on Agent Bus"}
              </Button>
              <Button size="sm" variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                onClick={() => mineMut.mutate()}
                disabled={mineMut.isPending}
                data-testid="btn-mine">
                <Layers className="w-3 h-3 mr-1" />
                {mineMut.isPending ? "Mining…" : "Anchor to Blockchain"}
              </Button>
            </div>

            {actions.bus?.success && (
              <p className="text-xs font-mono text-cyan-400">Bus routed: {actions.bus.route}</p>
            )}
            {actions.chain?.success && (
              <p className="text-xs font-mono text-violet-400">
                Blockchain anchored: Block #{actions.chain.block.blockNumber} {actions.chain.block.psiChannel}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Spectral visuals — always live, driven by current text */}
      {text.trim() && <SpectralPanel text={text.slice(0, 120)} label={label || "encode"} />}
    </div>
  );
}

// ── Tab 2: Decode by wavelength ────────────────────────────────────
function DecodeTab() {
  const [wavelength, setWavelength] = useState(540);
  const [range,      setRange]      = useState(5);
  const [results,    setResults]    = useState<any[] | null>(null);
  const [searching,  setSearching]  = useState(false);

  const COMMON = [
    { nm: 420, label: "System authority channel" },
    { nm: 470, label: "Authentication channel" },
    { nm: 505, label: "Streaming channel" },
    { nm: 540, label: "Core logic channel" },
    { nm: 580, label: "User interface channel" },
    { nm: 650, label: "Storage channel" },
  ];

  const search = async () => {
    setSearching(true);
    try {
      const r = await apiRequest("GET", `/api/spectral-db/search?wavelength=${wavelength}&range=${range}`);
      const d = await r.json();
      setResults(d.records ?? []);
    } finally { setSearching(false); }
  };

  const info = describeWavelength(wavelength);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 p-4 bg-slate-900/60">
        <p className="text-slate-300 text-sm font-medium mb-1">Decode any wavelength address</p>
        <p className="text-slate-500 text-xs">
          If someone gives you a wavelength address — say, 537 nm — you can look up
          any messages, code, or data stored at that location on the spectrum.
          This is trustless retrieval. No username, no password, just physics.
        </p>
      </div>

      {/* Common channel shortcuts */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-400">Common channels</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON.map(({ nm, label }) => {
            const ci = describeWavelength(nm);
            return (
              <button key={nm} onClick={() => { setWavelength(nm); setResults(null); }}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border font-mono transition-colors"
                style={{ borderColor: `${ci.colour}40`, background: `${ci.colour}10`, color: ci.colour }}
                data-testid={`quick-channel-${nm}`}>
                <div className="w-2 h-2 rounded-full" style={{ background: ci.colour }} />
                {nm}nm
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1 md:col-span-1">
          <Label className="text-xs text-slate-400">Wavelength address (nm)</Label>
          <Input type="number" min={380} max={780} value={wavelength}
            onChange={e => { setWavelength(Number(e.target.value)); setResults(null); }}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
            data-testid="input-wavelength" />
          <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: info.colour }}>
            <div className="w-2 h-2 rounded-full" style={{ background: info.colour }} />
            {info.band} — {info.authority} tier
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Search range ± nm</Label>
          <Input type="number" min={1} max={50} value={range}
            onChange={e => setRange(Number(e.target.value))}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
            data-testid="input-range" />
          <div className="text-xs text-slate-600 font-mono">{wavelength - range} – {wavelength + range} nm</div>
        </div>
        <Button onClick={search} disabled={searching} data-testid="btn-decode">
          <Search className="w-3 h-3 mr-1" />
          {searching ? "Looking up…" : "Decode Wavelength"}
        </Button>
      </div>

      {/* Live colour preview */}
      <WavelengthSwatch nm={wavelength} size="sm" />

      {results !== null && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-slate-500">
            {results.length} message{results.length !== 1 ? "s" : ""} stored within {range} nm of {wavelength} nm
          </p>

          {results.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-6 text-center space-y-2">
              <p className="text-slate-500 text-sm">Nothing stored at this wavelength yet.</p>
              <p className="text-slate-700 text-xs font-mono">
                This address exists — it's a real frequency of light —
                but no one has stored a message there yet.
                It's available. Open to all.
              </p>
            </div>
          ) : (
            results.map((r: any, i: number) => {
              const rNm = parseFloat(r.wavelengthNm);
              const ri  = describeWavelength(rNm);
              return (
                <div key={i} className="rounded-xl border p-4 space-y-2"
                  style={{ borderColor: `${ri.colour}40`, background: `${ri.colour}08` }}
                  data-testid={`decode-result-${i}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: ri.colour }} />
                    <span className="text-sm font-bold text-slate-100">{r.label}</span>
                    <span className="text-xs font-mono" style={{ color: ri.colour }}>{rNm.toFixed(1)} nm</span>
                    <span className="text-xs font-mono text-slate-600">{r.psiChannel}</span>
                  </div>
                  <p className="text-sm text-slate-300 font-mono leading-relaxed">{r.content}</p>
                  <div className="text-xs text-slate-600">
                    Stored {new Date(r.createdAt).toLocaleString()} · {parseFloat(r.energyJoules).toExponential(2)} J transmission cost
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Send encoded message ────────────────────────────────────
function SendTab({ loggedIn }: { loggedIn: boolean }) {
  const [from,     setFrom]    = useState("");
  const [to,       setTo]      = useState("");
  const [message,  setMessage] = useState("");
  const [result,   setResult]  = useState<any>(null);
  const [step,     setStep]    = useState<"compose" | "encoded" | "sent">("compose");
  const [encoded,  setEncoded] = useState<any>(null);

  const encodeMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/spectral-db/store", {
        content: `${from}→${to}: ${message}`,
        label: `msg_${from}_${to}_${Date.now()}`,
      }).then(r => r.json()),
    onSuccess: (d) => { setEncoded(d); setStep("encoded"); },
  });

  const sendMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/agent-bus/send", {
        src: "os_kernel", dst: "bus_router",
        payload: `MSG FROM ${from} TO ${to}: ${message}`,
        priority: 4, msgType: "MESSAGE",
      }).then(r => r.json()),
    onSuccess: (d) => { setResult(d); setStep("sent"); },
  });

  const info = encoded?.spectral ? describeWavelength(encoded.spectral.wavelength_mid_nm) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 p-4 bg-slate-900/60">
        <p className="text-slate-300 text-sm font-medium mb-1">Send a wavelength-encoded message</p>
        <p className="text-slate-500 text-xs">
          Write your message, address it to a recipient, and it is encoded into light
          before being routed through the agent bus. No metadata is leaked.
          The physics of your message determines which channel it travels on.
        </p>
      </div>

      {!loggedIn && (
        <div className="rounded-xl border border-slate-800 p-6 text-center space-y-2">
          <p className="text-slate-400 text-sm">You need to be logged in to send wavelength-encoded messages.</p>
          <Link href="/auth">
            <Button size="sm" variant="outline" className="border-cyan-800 text-cyan-300 hover:bg-cyan-900/40 text-xs mt-1">
              Log in to send
            </Button>
          </Link>
        </div>
      )}

      {loggedIn && step === "compose" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">From (your identifier)</Label>
              <Input value={from} onChange={e => setFrom(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                placeholder="your_name" data-testid="input-from" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">To (recipient identifier)</Label>
              <Input value={to} onChange={e => setTo(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                placeholder="recipient_name" data-testid="input-to" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)}
              className="bg-slate-800 border-slate-600 text-slate-200 text-sm min-h-24"
              placeholder="What do you want to say?"
              data-testid="input-msg" />
          </div>
          <Button onClick={() => encodeMut.mutate()}
            disabled={encodeMut.isPending || !from || !to || !message}
            data-testid="btn-encode-msg">
            <ArrowRight className="w-3 h-3 mr-1" />
            {encodeMut.isPending ? "Encoding to wavelength…" : "Encode Message"}
          </Button>
        </div>
      )}

      {step === "encoded" && encoded?.success && info && (
        <div className="space-y-3">
          <WavelengthSwatch nm={encoded.spectral.wavelength_mid_nm} size="md" />
          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: `${info.colour}40`, background: `${info.colour}08` }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: info.colour }} />
              <span className="text-sm font-bold text-slate-100">Message encoded at {parseFloat(encoded.spectral.wavelength_mid_nm).toFixed(1)} nm</span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              <span style={{ color: info.colour }}>{from}</span> → <span style={{ color: info.colour }}>{to}</span>: {message}
            </p>
            <p className="text-xs text-slate-600 font-mono">
              Channel {encoded.spectral.psi_channel} · {info.band} · {info.authority} tier
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending} data-testid="btn-send-encoded">
              <Send className="w-3 h-3 mr-1" />
              {sendMut.isPending ? "Routing…" : "Send via Agent Bus"}
            </Button>
            <Button variant="outline" className="border-slate-700 text-slate-400"
              onClick={() => { setStep("compose"); setEncoded(null); }}>
              Edit
            </Button>
          </div>
        </div>
      )}

      {step === "sent" && result && (
        <div className="space-y-3">
          <WavelengthSwatch nm={encoded?.spectral?.wavelength_mid_nm ?? 540} size="sm" />
          <div className="rounded-xl border border-green-900/50 p-4 bg-green-950/20 space-y-2">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-sm font-bold text-slate-100">Message delivered</span>
            </div>
            <p className="text-xs font-mono text-cyan-400">{result.route}</p>
            <p className="text-xs text-slate-500">
              Your message is now travelling as a physics-encoded signal.
              It was never stored in a plaintext database, logged by a server, or indexed by a company.
              The channel it used — {encoded?.spectral?.psi_channel} — is open to all and owned by none.
            </p>
          </div>
          <Button variant="outline" className="border-slate-700 text-slate-400"
            onClick={() => { setStep("compose"); setResult(null); setEncoded(null); setFrom(""); setTo(""); setMessage(""); }}>
            Send another
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Tab 4: What this replaces ──────────────────────────────────────
function CivilizationTab() {
  const COMPARISONS = [
    {
      old: "Binary 0 and 1 in silicon chips",
      new: "Every instruction is a wavelength of light — 380–780nm visible spectrum + infrared and UV",
      icon: Code2, color: "#8b00ff",
    },
    {
      old: "IP addresses assigned by ICANN, governments, and ISPs",
      new: "Wavelength addresses derived from content — physics assigns the address, no authority can revoke it",
      icon: Globe, color: "#2563eb",
    },
    {
      old: "Encryption keys that governments can demand access to",
      new: "Channel security through orbital angular momentum — a property of light that has no key to hand over",
      icon: Lock, color: "#06b6d4",
    },
    {
      old: "Transaction fees set by exchanges and miners",
      new: "Transaction cost = E=hf — the actual physical energy of your instruction, set by the universe not a company",
      icon: Zap, color: "#16a34a",
    },
    {
      old: "Livestreams hosted by YouTube, Twitch — platforms with ban buttons",
      new: "Broadcast on a spectral channel — open spectrum, no platform owns it, no algorithm can suppress it",
      icon: Wifi, color: "#ca8a04",
    },
    {
      old: "Data stored at server IPs controlled by AWS, Google, Microsoft",
      new: "Data stored at its wavelength address — retrievable by physics, not by access tokens",
      icon: Search, color: "#dc2626",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 p-4 bg-slate-900/60 space-y-2">
        <p className="text-slate-100 text-base font-bold">NexusOS is not a product. It is infrastructure.</p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Binary computing encodes everything in 0 and 1 — an arbitrary choice made in the 1940s.
          NexusOS encodes everything into wavelengths of light — a choice made by the laws of physics.
          When your data is a property of light, no server, government, or corporation can hold it hostage.
        </p>
        <p className="text-slate-600 text-xs font-mono">Licensed under AGPL-3.0 · Any company that uses this must contribute back · Open forever</p>
      </div>

      <div className="space-y-2">
        {COMPARISONS.map((c, i) => (
          <div key={i} className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-3 bg-slate-900/80 flex items-start gap-2">
                <div className="w-1 h-full min-h-4 rounded bg-slate-700 flex-shrink-0 mt-1" />
                <p className="text-xs text-slate-500 leading-relaxed">{c.old}</p>
              </div>
              <div className="p-3 flex items-start gap-2" style={{ background: `${c.color}08` }}>
                <c.icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: c.color }} />
                <p className="text-xs text-slate-300 leading-relaxed">{c.new}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-green-900/40 p-4 bg-green-950/10 space-y-2">
        <p className="text-green-400 text-sm font-bold">AGPL-3.0 — Open Source for Civilization</p>
        <p className="text-slate-400 text-xs leading-relaxed">
          Every line of code in NexusOS is public. Any company that builds on it must keep it public.
          This is not a feature — it is the enforcement mechanism that prevents this infrastructure
          from being captured, privatised, or weaponised against the people it serves.
          Kardashev Type I civilisation requires infrastructure that belongs to everyone.
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function EncodingLab() {
  const [lastEncoded, setLastEncoded] = useState<any>(null);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#8b00ff,#06b6d4,#dc2626)" }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Nexus Message Encoder</h1>
            <p className="text-slate-400 text-sm">
              Turn any message into light — encode, route, store, and retrieve using wavelength addresses
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs font-mono text-slate-600">
            <Link href="/spectral-db" className="hover:text-slate-400 transition-colors">Spectral DB</Link>
            <Link href="/agent-bus"   className="hover:text-slate-400 transition-colors">Agent Bus</Link>
            <Link href="/blockchain"  className="hover:text-slate-400 transition-colors">Blockchain</Link>
          </div>
        </div>

        {/* Spectrum */}
        <div className="relative h-2 w-full rounded mb-1"
          style={{ background: "linear-gradient(to right,#8b00ff,#2563eb,#06b6d4,#16a34a,#ca8a04,#ea580c,#dc2626)" }}>
          {lastEncoded?.spectral && (
            <div className="absolute top-0 bottom-0 w-1 bg-white rounded"
              style={{ left: `${((lastEncoded.spectral.wavelength_mid_nm - 380) / 400) * 100}%`, transform: "translateX(-50%)" }} />
          )}
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-700">
          <span>380nm</span><span>System authority</span><span>Open channels</span><span>Storage</span><span>780nm</span>
        </div>
      </div>

      <Tabs defaultValue="encode">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="encode" data-testid="tab-encode">
            <Zap className="w-3 h-3 mr-1" /> Encode
          </TabsTrigger>
          <TabsTrigger value="decode" data-testid="tab-decode">
            <Search className="w-3 h-3 mr-1" /> Decode
          </TabsTrigger>
          <TabsTrigger value="send" data-testid="tab-send">
            <Send className="w-3 h-3 mr-1" /> Send Message
          </TabsTrigger>
          <TabsTrigger value="civilization" data-testid="tab-civ">
            <Globe className="w-3 h-3 mr-1" /> What This Replaces
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encode">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Type anything — the physics engine converts it to a wavelength of light
          </h2>
          <EncodeTab onEncoded={setLastEncoded} loggedIn={!!user} />
        </TabsContent>

        <TabsContent value="decode">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Look up any wavelength — retrieve messages encoded at that address
          </h2>
          <DecodeTab />
        </TabsContent>

        <TabsContent value="send">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Compose, encode, and route a message — no email server, no surveillance
          </h2>
          <SendTab loggedIn={!!user} />
        </TabsContent>

        <TabsContent value="civilization">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            What NexusOS replaces and why it matters for civilisation
          </h2>
          <CivilizationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
