import { useState } from "react";
import { Link } from "wouter";
import {
  Mail, Radio, FileText, Upload, Code2, Database,
  Cpu, Globe2, Shield, Layers, Zap, Video, Mic,
  ArrowDown, Activity, Atom, BookOpen, Scale,
  ChevronRight, Wallet, GitBranch, Search, Key,
} from "lucide-react";

// ── Physics helpers ────────────────────────────────────────────────────────────
function nmToColor(nm: number | null): string {
  if (!nm) return "#94a3b8";
  if (nm < 450) return "#8b5cf6";
  if (nm < 490) return "#3b82f6";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#22c55e";
  if (nm < 590) return "#eab308";
  if (nm < 625) return "#f97316";
  return "#ef4444";
}
function nmToBand(nm: number | null): string {
  if (!nm) return "INPUT";
  if (nm < 450) return "SYSTEM";
  if (nm < 490) return "KERNEL";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
function energyLabel(nm: number | null): string {
  if (!nm) return "";
  const eV = (6.626e-34 * 2.998e8 / (nm * 1e-9)) / 1.602e-19;
  return `${eV.toFixed(2)} eV`;
}

// ── Data types ─────────────────────────────────────────────────────────────────
type DataType = "All" | "Text" | "Media" | "Livestream" | "Video Call" | "Database" | "Code";

const DATA_TYPE_CONFIG: Record<DataType, { color: string; icon: typeof Mail; desc: string }> = {
  "All":        { color: "#94a3b8", icon: Layers,   desc: "Every data type uses the same pipeline" },
  "Text":       { color: "#22d3ee", icon: Mail,     desc: "Messages, chat, broadcast text" },
  "Media":      { color: "#a78bfa", icon: Upload,   desc: "Images, audio, video files — chunked, encoded, distributed" },
  "Livestream": { color: "#f472b6", icon: Radio,    desc: "Real-time audio/video as oscillating waves" },
  "Video Call": { color: "#34d399", icon: Video,    desc: "Peer-to-peer via dedicated Ψ channel pair" },
  "Database":   { color: "#fbbf24", icon: Database, desc: "Structured writes, spectral-addressed fields" },
  "Code":       { color: "#818cf8", icon: Code2,    desc: "Source → WLS → bytecode → VM → Ψ execution" },
};

// ── Pipeline layers ────────────────────────────────────────────────────────────
interface Service {
  label: string;
  href: string;
  icon: typeof Mail;
  activeFor: DataType[];
  detail?: string;
}
interface Layer {
  id: string;
  step: number | null;
  name: string;
  subtitle: string;
  nm: number | null;
  formula?: string;
  services: Service[];
}

const LAYERS: Layer[] = [
  {
    id: "input", step: null,
    name: "Input",
    subtitle: "Raw human data enters the system — any format, any language, any medium",
    nm: null,
    services: [
      { label: "Text & Messages",  href: "/inbox",        icon: Mail,     activeFor: ["Text", "All"],       detail: "charcode per character" },
      { label: "Media Files",      href: "/media-library", icon: Upload,  activeFor: ["Media", "All"],      detail: "upload · watch · podcast" },
      { label: "Livestream",       href: "/streaming",    icon: Radio,    activeFor: ["Livestream", "All"], detail: "frame sequence" },
      { label: "Video Call",       href: "/streaming",    icon: Video,    activeFor: ["Video Call", "All"], detail: "WebRTC session" },
      { label: "Source Code",      href: "/wavelength-lang", icon: Code2, activeFor: ["Code", "All"],       detail: "11 languages" },
      { label: "Database Writes",  href: "/spectral-db",  icon: Database, activeFor: ["Database", "All"],  detail: "structured fields" },
    ],
  },
  {
    id: "ce", step: 1,
    name: "CE Encoding",
    subtitle: "charCode % 128 → band → λ = 380 + band × 3.125 · every byte gets a physical address in light",
    nm: 400,
    formula: "λ = 380 + (charCode % 128) × 3.125 nm",
    services: [
      { label: "CE Code Writer",   href: "/ce-writer",    icon: Code2,    activeFor: ["Text", "Code", "All"],         detail: "live encode any text" },
      { label: "Encoding Lab",     href: "/encoding-lab", icon: Atom,     activeFor: ["All"],                         detail: "full spectrum analysis" },
      { label: "CE Encoder · npm", href: "/packages",     icon: GitBranch,activeFor: ["Code", "All"],                  detail: "nexusos-ce-encoder" },
    ],
  },
  {
    id: "transpiler", step: 2,
    name: "Transpiler",
    subtitle: "λ addresses → WavelengthScript source code · the bridge between human intent and the wave language",
    nm: 450,
    formula: "@λnm agent · oscillate() · broadcast() · ?λ()",
    services: [
      { label: "Language Transpiler", href: "/wavelength-lang", icon: Code2,   activeFor: ["Code", "Text", "All"], detail: "JS TS Py Rust Go Solidity + 5 more" },
      { label: "CE → WLS Bridge",     href: "/ce-writer",       icon: Layers,  activeFor: ["All"],                 detail: "CE table → WLS source gen" },
    ],
  },
  {
    id: "compiler", step: 3,
    name: "Compiler",
    subtitle: "WavelengthScript source → WNSP bytecode · each opcode carries a wavelength operand",
    nm: 490,
    formula: "TUNE · EMIT · ASSIGN · BROAD · OCS · AGENT · GATE",
    services: [
      { label: "WLS Compiler",    href: "/wavelength-lang", icon: Cpu,     activeFor: ["All"],    detail: "Compiler tab → bytecode" },
      { label: "WNSP Bytecode",   href: "/wnsp-vm",         icon: Layers,  activeFor: ["All"],    detail: "hex dump · symbol table" },
    ],
  },
  {
    id: "vm", step: 4,
    name: "WavelengthScript VM",
    subtitle: "Executes bytecode at spectral addresses · Ψ channels as registers · E=hf execution model",
    nm: 530,
    formula: "E = hf · Λ = hf/c² · 51,200 register space",
    services: [
      { label: "WNSP VM",        href: "/wnsp-vm",         icon: Cpu,      activeFor: ["All"],              detail: "step / run / fast mode" },
      { label: "Game Studio",    href: "/wavelength-lang", icon: Zap,      activeFor: ["All"],              detail: "4 WLS games" },
      { label: "Agent Bus",      href: "/agent-bus",       icon: Activity, activeFor: ["All"],              detail: "autonomous WLS agents" },
      { label: "Governance",     href: "/governance",      icon: Scale,    activeFor: ["All"],              detail: "proposals as bytecode" },
      { label: "AI Kernel",      href: "/kernel",          icon: Cpu,      activeFor: ["All"],              detail: "6-phase boot · event bus" },
    ],
  },
  {
    id: "se_psi", step: 5,
    name: "SE / Ψ Channels",
    subtitle: "256 WDM × 50 OAM × 2 POL × 2 DIR = 51,200 orthogonal positions · the universal physics-based bus",
    nm: 570,
    formula: "Ψ(wdm, oam, pol) · ⟨Ψᵢ|Ψⱼ⟩ = 0 for i ≠ j",
    services: [
      { label: "Spectral Router",  href: "/spectral-router",     icon: Globe2,   activeFor: ["All"],                               detail: "DNS-free Ψ routing" },
      { label: "Streaming",        href: "/streaming",           icon: Radio,    activeFor: ["Livestream", "Video Call", "Media", "All"], detail: "WebRTC + Socket.IO" },
      { label: "Inbox / Messages", href: "/inbox",               icon: Mail,     activeFor: ["Text", "All"],                       detail: "P2P Ψ delivery" },
      { label: "Spectral DB",      href: "/spectral-db",         icon: Database, activeFor: ["Database", "All"],                   detail: "λ-addressed records" },
      { label: "Spectral Search",  href: "/spectral-search",     icon: Search,   activeFor: ["All"],                               detail: "CE-encoded queries" },
      { label: "P2P Network",      href: "/network",             icon: Layers,   activeFor: ["Media", "Livestream", "Video Call", "All"], detail: "mesh chunk delivery" },
    ],
  },
  {
    id: "fingerprint", step: 6,
    name: "Spectral Fingerprint",
    subtitle: "SHA-256(content) ⊕ hex(λ_sender) · composite physical signature · replaces PKI with physics",
    nm: 640,
    formula: "𝔉 = SHA-256(content) ⊕ hex(λ_sender)",
    services: [
      { label: "NXT Wallet",          href: "/wallet",            icon: Wallet,     activeFor: ["All"],              detail: "8 decimals · 21B supply" },
      { label: "Blockchain",          href: "/blockchain",        icon: Layers,     activeFor: ["All"],              detail: "physics-signed blocks" },
      { label: "Spectral Contracts",  href: "/spectral-contracts",icon: FileText,   activeFor: ["All"],              detail: "λ-key document signing" },
      { label: "Ledger",              href: "/ledger",            icon: Scale,      activeFor: ["Database", "All"],  detail: "on-chain audit trail" },
      { label: "Authentication",      href: "/",                  icon: Shield,     activeFor: ["All"],              detail: "phone → Ψ channel" },
    ],
  },
];

const ALL_DATA_TYPES: DataType[] = ["All", "Text", "Media", "Livestream", "Video Call", "Database", "Code"];

// ── Flow connector ──────────────────────────────────────────────────────────────
function FlowConnector({ fromColor, toColor, active }: { fromColor: string; toColor: string; active: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
      padding: "4px 0", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes photon-drop {
          0%   { transform: translateY(-6px); opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(6px);  opacity: 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ width: 1.5, height: 12,
          background: `linear-gradient(to bottom, ${fromColor}80, ${toColor}80)` }} />
        {active && (
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: toColor,
            boxShadow: `0 0 6px ${toColor}`,
            animation: "photon-drop 1.1s ease-in-out infinite",
            margin: "-2.5px 0",
          }} />
        )}
        <ArrowDown size={10} color={toColor + "80"} />
        <div style={{ width: 1.5, height: 12,
          background: `linear-gradient(to bottom, ${fromColor}80, ${toColor}80)` }} />
      </div>
    </div>
  );
}

// ── Service pill ────────────────────────────────────────────────────────────────
function ServicePill({
  service, isActive, layerColor,
}: {
  service: Service; isActive: boolean; layerColor: string;
}) {
  const Icon = service.icon;
  return (
    <Link href={service.href}>
      <div
        data-testid={`service-${service.label.toLowerCase().replace(/\s+/g, "-")}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 6, cursor: "pointer",
          border: `1px solid ${isActive ? layerColor + "60" : "rgba(255,255,255,0.06)"}`,
          background: isActive ? layerColor + "12" : "rgba(255,255,255,0.02)",
          color: isActive ? layerColor : "rgba(255,255,255,0.25)",
          fontSize: 10, fontFamily: "monospace",
          transition: "all 0.25s ease",
          boxShadow: isActive ? `0 0 12px ${layerColor}20` : "none",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Icon size={9} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: isActive ? 600 : 400 }}>{service.label}</span>
        {service.detail && isActive && (
          <span style={{ opacity: 0.5, fontSize: 8, marginLeft: 2 }}>· {service.detail}</span>
        )}
        <ChevronRight size={8} style={{ opacity: 0.3, marginLeft: 2, flexShrink: 0 }} />
        {isActive && (
          <div style={{
            position: "absolute", top: 0, left: "-100%", width: "60%", height: "100%",
            background: `linear-gradient(90deg, transparent, ${layerColor}20, transparent)`,
            animation: "shimmer-pill 2.5s ease-in-out infinite",
          }} />
        )}
      </div>
    </Link>
  );
}

// ── Layer row ────────────────────────────────────────────────────────────────────
function LayerRow({ layer, selected, isFirst }: { layer: Layer; selected: DataType; isFirst: boolean }) {
  const color = nmToColor(layer.nm);
  const band  = nmToBand(layer.nm);
  const isInput = layer.step === null;

  return (
    <div
      data-testid={`layer-${layer.id}`}
      style={{
        display: "flex", gap: 0,
        border: `1px solid ${isInput ? "rgba(255,255,255,0.06)" : color + "30"}`,
        borderRadius: 10, overflow: "hidden",
        background: isInput ? "rgba(255,255,255,0.01)" : color + "06",
        transition: "all 0.3s ease",
      }}
    >
      {/* Left spine — spectrum color + step number */}
      <div style={{
        width: 44, flexShrink: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start", paddingTop: 14,
        background: isInput ? "rgba(255,255,255,0.02)" : color + "15",
        borderRight: `1px solid ${isInput ? "rgba(255,255,255,0.05)" : color + "25"}`,
        gap: 6,
      }}>
        {isInput ? (
          <div style={{ fontSize: 16 }}>⟡</div>
        ) : (
          <>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${color}60`,
              background: color + "18",
              fontSize: 10, fontWeight: 700, color,
            }}>
              {layer.step}
            </div>
            {layer.nm && (
              <div style={{ fontSize: 7, color: color + "80", textAlign: "center",
                writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.05em" }}>
                {layer.nm}nm
              </div>
            )}
          </>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "14px 18px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <span style={{
            fontSize: isInput ? 12 : 13, fontWeight: 700, fontFamily: "monospace",
            color: isInput ? "rgba(255,255,255,0.5)" : color, letterSpacing: "0.02em",
          }}>
            {layer.name}
          </span>
          {!isInput && (
            <span style={{ fontSize: 8, color: color + "60", fontFamily: "monospace",
              padding: "1px 5px", border: `1px solid ${color}30`, borderRadius: 3 }}>
              {band}
            </span>
          )}
        </div>

        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", fontFamily: "monospace",
          margin: "0 0 10px", lineHeight: 1.5 }}>
          {layer.subtitle}
        </p>

        {layer.formula && (
          <div style={{
            fontSize: 9, fontFamily: "monospace",
            color: color + "70",
            padding: "3px 8px", marginBottom: 10,
            border: `1px solid ${color}20`, borderRadius: 4, display: "inline-block",
            background: color + "08",
          }}>
            {layer.formula}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {layer.services.map(svc => (
            <ServicePill
              key={svc.label}
              service={svc}
              isActive={svc.activeFor.includes(selected)}
              layerColor={color}
            />
          ))}
        </div>
      </div>

      {/* Right edge — energy */}
      {!isInput && layer.nm && (
        <div style={{
          width: 54, flexShrink: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 4,
          borderLeft: `1px solid ${color}15`,
          padding: "8px 4px",
        }}>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.15)", textAlign: "center",
            fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            photon
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: color + "90",
            fontFamily: "monospace", textAlign: "center" }}>
            {energyLabel(layer.nm)}
          </div>
          <div style={{
            width: 4, height: 4, borderRadius: "50%", background: color,
            boxShadow: `0 0 8px ${color}`, animation: "pulse-dot 2s ease-in-out infinite",
          }} />
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [selected, setSelected] = useState<DataType>("All");
  const dtConfig = DATA_TYPE_CONFIG[selected];
  const DtIcon = dtConfig.icon;

  return (
    <div style={{
      minHeight: "100vh", background: "#050508", color: "#e2e8f0",
      fontFamily: "monospace",
    }}>
      <style>{`
        @keyframes pulse-dot {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%      { opacity:1;   transform:scale(1.4); }
        }
        @keyframes shimmer-pill {
          0%   { left:-100%; }
          100% { left:200%;  }
        }
        @keyframes spectrum-scroll {
          0%   { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "1.25rem 2rem",
        display: "flex", alignItems: "center", gap: "1.5rem",
        background: "rgba(255,255,255,0.01)",
      }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 4,
            textTransform: "uppercase", letterSpacing: "0.12em" }}>
            NexusOS · Architecture
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0,
            color: "#f1f5f9", letterSpacing: "0.01em" }}>
            The Complete Stack
          </h1>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "4px 0 0" }}>
            Every service — text, media, messaging, livestream, database, video — flows through the same physics pipeline
          </p>
        </div>

        {/* Spectrum bar */}
        <div style={{ flex: 1, height: 4, borderRadius: 99, overflow: "hidden",
          background: "linear-gradient(to right, #8b5cf6, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)",
          opacity: 0.6 }} />

        <Link href="/">
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", cursor: "pointer",
            padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
            transition: "all 0.2s" }}>
            ← Hub
          </div>
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Data type selector */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Trace a data type through the pipeline
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_DATA_TYPES.map(dt => {
              const cfg = DATA_TYPE_CONFIG[dt];
              const Icon = cfg.icon;
              const isSelected = selected === dt;
              return (
                <button
                  key={dt}
                  data-testid={`filter-${dt.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setSelected(dt)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 99, cursor: "pointer",
                    border: `1px solid ${isSelected ? cfg.color + "80" : "rgba(255,255,255,0.08)"}`,
                    background: isSelected ? cfg.color + "15" : "transparent",
                    color: isSelected ? cfg.color : "rgba(255,255,255,0.3)",
                    fontSize: 10, fontFamily: "monospace",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? `0 0 16px ${cfg.color}25` : "none",
                  }}
                >
                  <Icon size={10} />
                  {dt}
                </button>
              );
            })}
          </div>

          {/* Selected type description */}
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderRadius: 7,
            border: `1px solid ${dtConfig.color}20`,
            background: dtConfig.color + "08",
            fontSize: 10, color: dtConfig.color + "90",
          }}>
            <DtIcon size={10} />
            {dtConfig.desc}
          </div>
        </div>

        {/* Pipeline layers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {LAYERS.map((layer, idx) => {
            const prevNm = idx > 0 ? LAYERS[idx - 1].nm : null;
            const curNm  = layer.nm;
            return (
              <div key={layer.id}>
                {idx > 0 && (
                  <FlowConnector
                    fromColor={nmToColor(prevNm)}
                    toColor={nmToColor(curNm)}
                    active={selected !== "All"}
                  />
                )}
                <LayerRow
                  layer={layer}
                  selected={selected}
                  isFirst={idx === 0}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: "2.5rem", borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginBottom: 6,
              textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Band map
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { band: "SYSTEM",    nm: 415, range: "380–449nm" },
                { band: "KERNEL",    nm: 470, range: "450–489nm" },
                { band: "STREAM",    nm: 505, range: "490–519nm" },
                { band: "LOGIC",     nm: 542, range: "520–564nm" },
                { band: "INTERFACE", nm: 577, range: "565–589nm" },
                { band: "EVENT",     nm: 607, range: "590–624nm" },
                { band: "STORAGE",   nm: 660, range: "625–780nm" },
              ].map(b => (
                <div key={b.band} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: 2,
                    background: nmToColor(b.nm) }} />
                  <span style={{ fontSize: 8, color: nmToColor(b.nm) + "90",
                    fontFamily: "monospace" }}>
                    {b.band} · {b.range}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginBottom: 6,
              textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Key formula
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              λ = 380 + (charCode % 128) × 3.125 nm
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              E = hf = hc/λ · Λ = hf/c²
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
              Ψ(wdm, oam, pol) · 256×50×2×2 = 51,200 channels
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ marginTop: "1.5rem", display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {[
            { label: "CE Code Writer",    href: "/ce-writer",       color: nmToColor(400) },
            { label: "Language Transpiler",href: "/wavelength-lang", color: nmToColor(450) },
            { label: "WNSP VM",           href: "/wnsp-vm",         color: nmToColor(530) },
            { label: "Spectral Router",   href: "/spectral-router", color: nmToColor(570) },
            { label: "Streaming",         href: "/streaming",       color: nmToColor(570) },
            { label: "Spectral DB",       href: "/spectral-db",     color: nmToColor(570) },
            { label: "Spectral Contracts",href: "/spectral-contracts",color: nmToColor(640) },
            { label: "Blockchain",        href: "/blockchain",      color: nmToColor(640) },
          ].map(link => (
            <Link key={link.href} href={link.href}>
              <div style={{
                padding: "8px 12px", borderRadius: 7, cursor: "pointer",
                border: `1px solid ${link.color}20`,
                background: link.color + "06",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: 10, color: link.color + "80",
                transition: "all 0.2s",
              }}>
                {link.label}
                <ChevronRight size={9} style={{ opacity: 0.4 }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
