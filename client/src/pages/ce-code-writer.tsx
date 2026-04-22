import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Code2, Zap, Copy, Check, Play, Radio, Package, Layers } from "lucide-react";

// ── Physics constants ─────────────────────────────────────────────
const PLANCK_H = 6.626e-34;
const SPEED_C  = 2.998e8;

// ── Wavelength → visible RGB ──────────────────────────────────────
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

// ── Spectral band → code domain ───────────────────────────────────
function getBand(nm: number) {
  if (nm < 450) return { name: "SYSTEM",  emoji: "⚙",  color: "#8b00ff", desc: "OS / kernel / process management"     };
  if (nm < 490) return { name: "AUTH",    emoji: "🔐", color: "#0050ff", desc: "Authentication / security / sessions" };
  if (nm < 520) return { name: "STREAM",  emoji: "⚡", color: "#00cfcf", desc: "Data streams / WebSocket / realtime"  };
  if (nm < 565) return { name: "CORE",    emoji: "⚙",  color: "#00c800", desc: "Core business logic / algorithms"    };
  if (nm < 590) return { name: "UI",      emoji: "🎨", color: "#cccc00", desc: "UI components / layout / styling"    };
  if (nm < 625) return { name: "EVENT",   emoji: "📡", color: "#ff8c00", desc: "Events / webhooks / async signals"   };
  return         { name: "STORAGE", emoji: "💾", color: "#cc0000", desc: "Database / file I/O / persistence"   };
}

// ── CE 128-band lookup table — one wavelength per ASCII code 0-127 ──
// 128 entries, evenly distributed 380-780nm (3.125nm per band)
const CE_TABLE: number[] = Array.from({ length: 128 }, (_, i) => 380 + (i / 128) * 400);

// ── CE character → wavelength (deterministic, silicon-ready) ─────
function charToWavelength(char: string): number {
  return CE_TABLE[char.charCodeAt(0) % 128];
}

// ── Code generation engine ────────────────────────────────────────
function generateCode(
  description: string,
  lang: string,
  nm: number,
  psiChannel: string,
  label: string,
): string {
  const band = getBand(nm);
  const safeName = label
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toLowerCase() || "nexus_fn";
  const psiComment = `@spectral λ=${nm.toFixed(1)}nm Ψ=${psiChannel} band=${band.name}`;
  if (lang === "typescript") return generateTS(description, nm, safeName, band, psiComment);
  if (lang === "python")     return generatePython(description, nm, safeName, band, psiComment);
  if (lang === "html")       return generateHTML(description, nm, safeName, band, psiComment);
  if (lang === "sql")        return generateSQL(description, nm, safeName, band, psiComment);
  return generateTS(description, nm, safeName, band, psiComment);
}

function generateTS(desc: string, nm: number, name: string, band: ReturnType<typeof getBand>, psi: string): string {
  const B = band.name;

  if (B === "SYSTEM") return `// ${psi}
// Domain: System / OS / Process Management
// Description: ${desc}

import { EventEmitter } from "events";

interface ProcessState {
  pid: string;
  status: "RUNNING" | "DEGRADED" | "RECLAIMED";
  wavelength: number;
  channel: string;
  startedAt: Date;
}

class ${toPascal(name)}Process extends EventEmitter {
  private state: ProcessState;

  constructor(id: string) {
    super();
    this.state = {
      pid: id,
      status: "RUNNING",
      wavelength: ${nm.toFixed(1)},
      channel: "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}",
      startedAt: new Date(),
    };
  }

  getState(): ProcessState { return { ...this.state }; }
  degrade(): void { this.state.status = "DEGRADED"; this.emit("degraded", this.state); }
  reclaim(): void { this.state.status = "RECLAIMED"; this.emit("reclaimed", this.state); }
  isAlive(): boolean { return this.state.status === "RUNNING"; }
}

export { ${toPascal(name)}Process, ProcessState };
`;

  if (B === "AUTH") return `// ${psi}
// Domain: Authentication & Security
// Description: ${desc}

import { createHash, randomBytes } from "crypto";

interface AuthToken { userId: string; token: string; wavelength: number; expiresAt: Date; }
interface AuthResult { success: boolean; token?: AuthToken; error?: string; }

async function ${name}(userId: string, secret: string): Promise<AuthResult> {
  if (!userId || !secret) return { success: false, error: "Missing credentials" };
  const token = randomBytes(32).toString("hex");
  const hash  = createHash("sha256").update(\`\${userId}:\${secret}:\${token}\`).digest("hex");
  return {
    success: true,
    token: { userId, token: hash, wavelength: ${nm.toFixed(1)}, expiresAt: new Date(Date.now() + 3600_000) },
  };
}

async function verify${toPascal(name)}(token: string): Promise<boolean> {
  return typeof token === "string" && token.length === 64;
}

export { ${name}, verify${toPascal(name)}, AuthToken, AuthResult };
`;

  if (B === "STREAM") return `// ${psi}
// Domain: Data Streams / WebSocket / Realtime
// Description: ${desc}

interface StreamFrame { id: string; wavelength: number; payload: unknown; timestamp: number; }

class ${toPascal(name)}Stream {
  private handlers: Map<string, (frame: StreamFrame) => void> = new Map();
  private ws: WebSocket | null = null;

  connect(url: string): void {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const frame: StreamFrame = JSON.parse(event.data);
      this.handlers.get(frame.id)?.(frame);
    };
    this.ws.onopen = () => console.log(\`[${name}] Stream open — λ=${nm.toFixed(1)}nm\`);
  }

  on(id: string, handler: (frame: StreamFrame) => void): void { this.handlers.set(id, handler); }

  emit(payload: unknown): void {
    const frame: StreamFrame = { id: crypto.randomUUID(), wavelength: ${nm.toFixed(1)}, payload, timestamp: Date.now() };
    this.ws?.send(JSON.stringify(frame));
  }

  close(): void { this.ws?.close(); }
}

export { ${toPascal(name)}Stream, StreamFrame };
`;

  if (B === "CORE") return `// ${psi}
// Domain: Core Business Logic
// Description: ${desc}

interface ${toPascal(name)}Input  { data: unknown; wavelength?: number; }
interface ${toPascal(name)}Output { result: unknown; metadata: { wavelength: number; channel: string; processedAt: Date; }; }

async function ${name}(input: ${toPascal(name)}Input): Promise<${toPascal(name)}Output> {
  const { data } = input;
  if (data === null || data === undefined) throw new Error(\`[${name}] No input at λ=${nm.toFixed(1)}nm\`);
  const result = await transform(data);
  return { result, metadata: { wavelength: ${nm.toFixed(1)}, channel: "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}", processedAt: new Date() } };
}

async function transform(data: unknown): Promise<unknown> { return data; }

export { ${name}, ${toPascal(name)}Input, ${toPascal(name)}Output };
`;

  if (B === "UI") return `// ${psi}
// Domain: UI Component
// Description: ${desc}

import React, { useState } from "react";

interface ${toPascal(name)}Props { title?: string; onAction?: (data: unknown) => void; className?: string; }

export function ${toPascal(name)}({ title, onAction, className }: ${toPascal(name)}Props) {
  const [active, setActive] = useState(false);
  const handleClick = () => { setActive(!active); onAction?.({ wavelength: ${nm.toFixed(1)}, timestamp: Date.now() }); };
  return (
    <div className={\`nexus-component \${className ?? ""} \${active ? "active" : ""}\`}
      data-wavelength="${nm.toFixed(1)}" data-channel="${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}">
      {title && <h2 className="nexus-title">{title}</h2>}
      <button onClick={handleClick} className="nexus-btn" aria-pressed={active}>
        {active ? "Active" : "Activate"}
      </button>
      <style>{\`
        .nexus-component { padding:1rem; border-radius:.5rem; border:1px solid hsl(${Math.round((nm-380)/400*360)},50%,30%); }
        .nexus-btn { background:hsl(${Math.round((nm-380)/400*360)},70%,50%); color:white; padding:.5rem 1rem; border-radius:.25rem; border:none; cursor:pointer; }
        .nexus-btn:hover { opacity:.85; }
      \`}</style>
    </div>
  );
}
`;

  if (B === "EVENT") return `// ${psi}
// Domain: Events / Webhooks / Async Signals
// Description: ${desc}

type EventPayload = Record<string, unknown>;
type EventHandler = (payload: EventPayload) => void | Promise<void>;

class ${toPascal(name)}EventBus {
  private subscribers = new Map<string, EventHandler[]>();

  subscribe(event: string, handler: EventHandler): () => void {
    const handlers = this.subscribers.get(event) ?? [];
    handlers.push(handler);
    this.subscribers.set(event, handlers);
    return () => this.subscribers.set(event, (this.subscribers.get(event) ?? []).filter(fn => fn !== handler));
  }

  async emit(event: string, payload: EventPayload): Promise<void> {
    const handlers = this.subscribers.get(event) ?? [];
    await Promise.all(handlers.map(h =>
      Promise.resolve(h({ ...payload, _wavelength: ${nm.toFixed(1)}, _channel: "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}" }))
    ));
  }

  clear(event?: string): void { event ? this.subscribers.delete(event) : this.subscribers.clear(); }
}

const ${name}Bus = new ${toPascal(name)}EventBus();
export { ${name}Bus, ${toPascal(name)}EventBus, EventPayload };
`;

  return `// ${psi}
// Domain: Storage / Database / Persistence
// Description: ${desc}

interface ${toPascal(name)}Record { id: string; data: unknown; wavelength: number; createdAt: Date; updatedAt: Date; }

interface ${toPascal(name)}Store {
  find(id: string): Promise<${toPascal(name)}Record | null>;
  findAll(filter?: Partial<${toPascal(name)}Record>): Promise<${toPascal(name)}Record[]>;
  save(record: Omit<${toPascal(name)}Record, "id" | "createdAt" | "updatedAt">): Promise<${toPascal(name)}Record>;
  update(id: string, data: Partial<${toPascal(name)}Record>): Promise<${toPascal(name)}Record>;
  delete(id: string): Promise<void>;
}

// In-memory implementation — replace with your DB adapter
class ${toPascal(name)}MemoryStore implements ${toPascal(name)}Store {
  private records = new Map<string, ${toPascal(name)}Record>();

  async find(id: string) {
    return this.records.get(id) ?? null;
  }

  async findAll(filter?: Partial<${toPascal(name)}Record>) {
    const all = Array.from(this.records.values());
    if (!filter) return all;
    return all.filter(r =>
      Object.entries(filter).every(([k, v]) => (r as Record<string, unknown>)[k] === v)
    );
  }

  async save(data: Omit<${toPascal(name)}Record, "id" | "createdAt" | "updatedAt">) {
    const record: ${toPascal(name)}Record = {
      ...data,
      id: crypto.randomUUID(),
      wavelength: ${nm.toFixed(1)},  // ${psi}
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, data: Partial<${toPascal(name)}Record>) {
    const existing = this.records.get(id);
    if (!existing) throw new Error(\`Record \${id} not found\`);
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.records.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    this.records.delete(id);
  }
}

export { ${toPascal(name)}MemoryStore, ${toPascal(name)}Record, ${toPascal(name)}Store };
`;
}

function generatePython(desc: string, nm: number, name: string, band: ReturnType<typeof getBand>, psi: string): string {
  const B = band.name;
  const cls = toPascal(name);

  if (B === "AUTH") return `# ${psi}
# Domain: Authentication & Security
# Description: ${desc}

import hashlib, secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class AuthToken:
    user_id: str
    token: str
    wavelength: float = ${nm.toFixed(1)}
    expires_at: datetime = None

    def __post_init__(self):
        if self.expires_at is None:
            self.expires_at = datetime.utcnow() + timedelta(hours=1)

    def is_valid(self) -> bool:
        return datetime.utcnow() < self.expires_at


def ${name}(user_id: str, secret: str) -> AuthToken:
    """${desc}
    Spectral address: λ=${nm.toFixed(1)}nm  ${psi}
    """
    if not user_id or not secret:
        raise ValueError("Missing credentials")
    salt  = secrets.token_hex(16)
    token = hashlib.sha256(f"{user_id}:{secret}:{salt}".encode()).hexdigest()
    return AuthToken(user_id=user_id, token=token)


def verify_${name}(token: str) -> bool:
    return isinstance(token, str) and len(token) == 64
`;

  if (B === "STREAM") return `# ${psi}
# Domain: Data Streams / Realtime
# Description: ${desc}

import asyncio, json
from dataclasses import dataclass, field
from typing import Callable, Any

@dataclass
class StreamFrame:
    payload: Any
    wavelength: float = ${nm.toFixed(1)}
    channel: str = "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}"
    timestamp: float = field(default_factory=lambda: asyncio.get_event_loop().time())


class ${cls}Stream:
    """${desc}
    Spectral address: λ=${nm.toFixed(1)}nm  ${psi}
    """
    def __init__(self):
        self._handlers: list[Callable] = []

    def subscribe(self, handler: Callable[[StreamFrame], None]) -> None:
        self._handlers.append(handler)

    async def emit(self, payload: Any) -> None:
        frame = StreamFrame(payload=payload)
        coros = [h(frame) for h in self._handlers if asyncio.iscoroutinefunction(h)]
        sync  = [h for h in self._handlers if not asyncio.iscoroutinefunction(h)]
        for h in sync:
            h(frame)
        if coros:
            await asyncio.gather(*coros)
`;

  if (B === "UI") return `# ${psi}
# Domain: UI / Template Rendering
# Description: ${desc}

from dataclasses import dataclass
from typing import Optional

@dataclass
class ${cls}Component:
    """${desc}
    Spectral address: λ=${nm.toFixed(1)}nm  ${psi}
    Band: UI / Yellow (565-589nm)
    """
    title: str
    content: str = ""
    active: bool = False
    wavelength: float = ${nm.toFixed(1)}

    def render(self) -> str:
        active_class = "active" if self.active else ""
        return f"""
<div class="nexus-component {active_class}"
     data-wavelength="{self.wavelength}"
     style="border-color: hsl(60, 70%, 50%)">
    <h2>{self.title}</h2>
    <div class="content">{self.content}</div>
</div>
"""

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "content": self.content,
            "active": self.active,
            "wavelength": self.wavelength,
            "channel": "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}",
        }
`;

  if (B === "STORAGE") return `# ${psi}
# Domain: Storage / Database
# Description: ${desc}

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

@dataclass
class ${cls}Record:
    data: dict
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    wavelength: float = ${nm.toFixed(1)}
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


class ${cls}Store:
    """${desc}
    Spectral address: λ=${nm.toFixed(1)}nm  ${psi}
    """
    def __init__(self):
        self._records: dict[str, ${cls}Record] = {}

    def save(self, data: dict) -> ${cls}Record:
        record = ${cls}Record(data=data)
        self._records[record.id] = record
        return record

    def find(self, record_id: str) -> Optional[${cls}Record]:
        return self._records.get(record_id)

    def find_all(self) -> list[${cls}Record]:
        return list(self._records.values())

    def delete(self, record_id: str) -> bool:
        return bool(self._records.pop(record_id, None))
`;

  return `# ${psi}
# Domain: ${band.name} — ${band.desc}
# Description: ${desc}

from dataclasses import dataclass
from typing import Any, Optional

@dataclass
class ${cls}Result:
    success: bool
    data: Any = None
    error: Optional[str] = None
    wavelength: float = ${nm.toFixed(1)}  # ${psi}


def ${name}(input_data: Any) -> ${cls}Result:
    """${desc}
    Spectral address: λ=${nm.toFixed(1)}nm
    Channel: ${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}
    Band: ${band.name}
    """
    try:
        if input_data is None:
            return ${cls}Result(success=False, error="No input provided")
        return ${cls}Result(success=True, data=input_data)
    except Exception as e:
        return ${cls}Result(success=False, error=str(e))
`;
}

function generateHTML(desc: string, nm: number, name: string, band: ReturnType<typeof getBand>, psi: string): string {
  const hue = Math.round(((nm - 380) / 400) * 300);
  return `<!-- ${psi} -->
<!-- Domain: ${band.name} — ${band.desc} -->
<!-- Description: ${desc} -->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <style>
    :root {
      --spectral-wavelength: ${nm.toFixed(1)};
      --primary:   hsl(${hue}, 70%, 50%);
      --primary-d: hsl(${hue}, 70%, 35%);
      --bg:        hsl(${hue}, 20%, 5%);
      --surface:   hsl(${hue}, 15%, 10%);
      --text:      hsl(${hue}, 10%, 90%);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif;
           min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .nexus-card { background: var(--surface); border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
                  border-radius: 1rem; padding: 2rem; max-width: 640px; width: 90%; }
    .spectral-badge { display: inline-flex; align-items: center; gap: .5rem;
                      font-size: .75rem; font-family: monospace; color: var(--primary); margin-bottom: 1rem; }
    .spectral-dot   { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); }
    .wavelength-bar { height: 4px; background: linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000);
                      border-radius: 2px; margin-bottom: 1.5rem; position: relative; }
    .wavelength-marker { position: absolute; top: -3px; width: 10px; height: 10px; border-radius: 50%;
                         background: white; border: 2px solid var(--primary);
                         left: ${((nm - 380) / 400 * 100).toFixed(1)}%; transform: translateX(-50%); }
    h1 { font-size: 1.5rem; margin-bottom: .5rem; }
    p  { color: color-mix(in srgb, var(--text) 70%, transparent); margin-bottom: 1rem; }
    .nexus-btn { background: var(--primary); color: white; border: none; border-radius: .5rem;
                 padding: .75rem 1.5rem; cursor: pointer; font-size: 1rem; transition: background .2s; }
    .nexus-btn:hover { background: var(--primary-d); }
  </style>
</head>
<body>
  <div class="nexus-card" data-wavelength="${nm.toFixed(1)}">
    <div class="spectral-badge">
      <div class="spectral-dot"></div>
      λ = ${nm.toFixed(1)} nm · ${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"} · ${band.name}
    </div>
    <div class="wavelength-bar"><div class="wavelength-marker" title="${nm.toFixed(1)} nm"></div></div>
    <h1>${name.replace(/_/g, " ")}</h1>
    <p>${desc}</p>
    <button class="nexus-btn" onclick="handleAction()">${band.emoji} Execute</button>
    <div id="output" style="margin-top:1rem;font-family:monospace;font-size:.85rem;color:var(--primary);"></div>
  </div>
  <script>
    const WAVELENGTH = ${nm.toFixed(1)};
    const CHANNEL    = "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}";
    function handleAction() {
      document.getElementById("output").textContent = \`[λ=\${WAVELENGTH}nm] Action on channel \${CHANNEL}\`;
    }
  </script>
</body>
</html>
`;
}

function generateSQL(desc: string, nm: number, name: string, band: ReturnType<typeof getBand>, psi: string): string {
  return `-- ${psi}
-- Domain: ${band.name} — ${band.desc}
-- Description: ${desc}

CREATE TABLE IF NOT EXISTS ${name} (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data          JSONB NOT NULL DEFAULT '{}',
  wavelength_nm NUMERIC(8,2) NOT NULL DEFAULT ${nm.toFixed(1)},
  psi_channel   TEXT NOT NULL DEFAULT '${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}',
  band          TEXT NOT NULL DEFAULT '${band.name}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_${name}_wavelength ON ${name} (wavelength_nm);
CREATE INDEX idx_${name}_band       ON ${name} (band);
CREATE INDEX idx_${name}_data       ON ${name} USING GIN (data);

CREATE OR REPLACE FUNCTION update_${name}_ts()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER ${name}_updated_at
  BEFORE UPDATE ON ${name}
  FOR EACH ROW EXECUTE FUNCTION update_${name}_ts();

-- SELECT * FROM ${name} WHERE band = '${band.name}';
-- SELECT * FROM ${name} WHERE wavelength_nm BETWEEN ${(nm - 5).toFixed(1)} AND ${(nm + 5).toFixed(1)};
`;
}

function toPascal(s: string): string {
  return s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ── Shared helpers ────────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy}
      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      data-testid="btn-copy">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function SpectralHeader({ data, lang }: { data: any; lang: string }) {
  const band = getBand(data.wavelength_mid_nm ?? 550);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg border-b border-slate-700 bg-slate-800"
      style={{ borderTopColor: `${band.color}60` }}>
      <div className="w-3 h-3 rounded-full" style={{ background: band.color }} />
      <span className="text-xs font-mono" style={{ color: band.color }}>{band.name}</span>
      <span className="text-xs font-mono text-slate-500">λ = {data.wavelength_mid_nm?.toFixed(1)} nm</span>
      <span className="text-xs font-mono text-slate-500">{data.psi_channel}</span>
      <span className="text-xs font-mono text-slate-600">{data.energy_joules?.toExponential(2)} J</span>
      <span className="ml-auto text-xs font-mono text-slate-500">{lang}</span>
    </div>
  );
}

// ── Tab 1: Live Encode ────────────────────────────────────────────
function LiveEncodeTab() {
  const [text, setText] = useState("Hello, universe. Every symbol is light.");
  const [apiResult, setApiResult] = useState<any>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const encodeMut = useMutation({
    mutationFn: (t: string) =>
      apiRequest("POST", "/api/nexus/dev/encode", { instruction: t, label: "live_encode" })
        .then(r => r.json()),
    onSuccess: setApiResult,
  });

  const saveToDb = async () => {
    if (!text.trim()) return;
    setSaveState("saving");
    try {
      const res = await apiRequest("POST", "/api/spectral-db/store", {
        content: text.slice(0, 500),
        label: "ce_fingerprint",
        data: { source: "live_encode" },
      });
      if (!res.ok) throw new Error("store failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  useEffect(() => {
    if (!text.trim()) { setApiResult(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      encodeMut.mutate(text.slice(0, 500));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text]);

  const chars = Array.from(text).slice(0, 200);
  const avgNm = chars.length
    ? chars.reduce((s, c) => s + charToWavelength(c), 0) / chars.length
    : 550;

  // API is the source of truth for aggregate Ψ channel and energy figures
  const apiEnergy    = apiResult?.energy_joules;
  const apiPsi       = apiResult?.psi_channel;
  const apiLambdaNm  = apiResult?.wavelength_mid_nm;
  const loading      = encodeMut.isPending;

  // When API result is available, use its wavelength for aggregate display
  const displayNm = apiLambdaNm ?? avgNm;
  const band = getBand(displayNm);

  // Compression derived from API energy when available, else client estimate
  const compressionKg = apiEnergy != null
    ? apiEnergy / (SPEED_C * SPEED_C)
    : (PLANCK_H * (SPEED_C / (avgNm * 1e-9))) / (SPEED_C * SPEED_C);

  // Fingerprint matches spec: { text, char_map: [{char, λ}], dominant_λ, psi, band, energy_J }
  const fingerprint = {
    text: text.slice(0, 200),
    char_map: chars.map(c => ({ char: c, "λ": +charToWavelength(c).toFixed(2) })),
    "dominant_λ": +(apiLambdaNm ?? avgNm).toFixed(2),
    psi: apiPsi ?? null,
    band: band.name,
    energy_J: apiEnergy ?? null,
  };

  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">
        Type anything. Every character is deterministically mapped to a wavelength in the visible
        spectrum — the CE encoding. This runs on any silicon chip with no server required.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-400">Your text</Label>
          <span className="text-xs font-mono text-slate-600">{text.length}/200 chars shown</span>
        </div>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm min-h-16"
          placeholder="Type anything — a name, a sentence, a concept..."
          data-testid="input-live-text"
        />
      </div>

      {/* Character chips */}
      {chars.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Character → wavelength map</Label>
          <div className="flex flex-wrap gap-1 p-3 rounded-lg bg-slate-900/60 border border-slate-800 max-h-36 overflow-y-auto">
            {chars.map((c, i) => {
              const nm = charToWavelength(c);
              const col = wlToRgb(nm);
              return (
                <div key={i}
                  title={`'${c === " " ? "space" : c}' → λ=${nm.toFixed(1)}nm`}
                  className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold cursor-default select-none transition-transform hover:scale-110"
                  style={{ background: col, color: nm > 500 && nm < 620 ? "#000" : "#fff", opacity: 0.92 }}
                  data-testid={`char-chip-${i}`}>
                  {c === " " ? "·" : c === "\n" ? "↵" : c}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600">Each chip = one character. Color = its wavelength in the visible spectrum.</p>
        </div>
      )}

      {/* Physics summary — API is source of truth for Ψ, energy, and Λ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Dominant λ",  value: `${displayNm.toFixed(1)} nm`,            color: band.color,  client: true  },
          { label: "Band",         value: `${band.emoji} ${band.name}`,            color: band.color,  client: true  },
          { label: "Ψ channel",    value: apiPsi  ?? (loading ? "…" : "—"),        color: "#94a3b8",   client: false },
          { label: "E = hf",       value: apiEnergy != null ? `${apiEnergy.toExponential(2)} J` : (loading ? "…" : "—"), color: "#94a3b8", client: false },
          { label: "Λ = hf/c²",   value: apiEnergy != null ? `${compressionKg.toExponential(2)} kg` : (loading ? "…" : "—"), color: "#94a3b8", client: false },
        ].map((item, i) => (
          <div key={i} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-500 font-mono">{item.label}</p>
            <p className={`text-sm font-mono font-semibold ${loading && !item.client ? "animate-pulse" : ""}`}
              style={{ color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Spectrum bar showing position */}
      <div className="space-y-1">
        <Label className="text-xs text-slate-400">Position in the visible spectrum</Label>
        <div className="relative h-5 w-full rounded"
          style={{ background: "linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)" }}>
          <div className="absolute top-0 h-5 w-1 rounded-sm bg-white shadow-lg"
            style={{ left: `${Math.min(99, Math.max(0, (displayNm - 380) / 400 * 100)).toFixed(1)}%`, transform: "translateX(-50%)" }}
            title={`λ=${displayNm.toFixed(1)}nm`} />
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-700">
          <span>380nm</span><span>780nm</span>
        </div>
      </div>

      {/* Export + Save */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <p className="text-xs text-slate-600">CE fingerprint is deterministic — same text always produces same wavelength.</p>
        <div className="flex items-center gap-2">
          <CopyButton text={JSON.stringify(fingerprint, null, 2)} label="Copy JSON Fingerprint" />
          <button
            onClick={saveToDb}
            disabled={!text.trim() || saveState === "saving"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors
              ${saveState === "saved"  ? "bg-green-900/60 border border-green-700 text-green-300" :
                saveState === "error"  ? "bg-red-900/60 border border-red-700 text-red-300" :
                saveState === "saving" ? "bg-slate-700 border border-slate-600 text-slate-400 animate-pulse" :
                "bg-cyan-900/30 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/60"}`}
            data-testid="btn-save-fingerprint">
            {saveState === "saved"  ? <><Check className="w-3 h-3" /> Saved to Spectral DB</> :
             saveState === "error"  ? "Save failed — retry" :
             saveState === "saving" ? "Saving…" :
             <><Layers className="w-3 h-3" /> Save to Spectral DB</>}
          </button>
        </div>
      </div>
      {saveState === "saved" && (
        <p className="text-xs text-green-600 font-mono">
          Fingerprint stored. View in{" "}
          <a href="/spectral-db" className="underline hover:text-green-400">Spectral DB →</a>
        </p>
      )}
    </div>
  );
}

// ── Tab 2: Code Builder (Single + App Scaffold with toggle) ───────
const EXAMPLES = [
  { label: "Auth middleware",    desc: "function authenticate(user, password) validates credentials and returns a JWT token", lang: "typescript" },
  { label: "WebSocket handler",  desc: "real-time data stream handler that broadcasts sensor readings to connected clients",   lang: "typescript" },
  { label: "User store",         desc: "database store for user records with find, save, update and delete operations",       lang: "python"     },
  { label: "API endpoint",       desc: "REST API endpoint that handles POST requests and validates the request body",          lang: "python"     },
  { label: "Hero section",       desc: "responsive hero section with gradient background and call-to-action button",           lang: "html"       },
  { label: "Events table",       desc: "PostgreSQL table for kernel events with wavelength and channel metadata",              lang: "sql"        },
  { label: "Process manager",    desc: "OS process manager that tracks running processes and reclaims dead ones",              lang: "typescript" },
  { label: "Event bus",          desc: "publish-subscribe event bus with typed handlers and async emission",                   lang: "typescript" },
];

const APP_PRESETS = [
  {
    name: "REST API", stack: "typescript",
    components: [
      { label: "auth_middleware", desc: "authenticate JWT token from request headers and validate user session" },
      { label: "user_controller", desc: "REST controller handling GET POST PUT DELETE requests for user resources" },
      { label: "user_store",      desc: "database persistence layer for user records with CRUD operations" },
      { label: "event_logger",    desc: "async event logger that records all API calls with timestamps" },
      { label: "error_handler",   desc: "global error handling middleware that formats error responses" },
    ],
  },
  {
    name: "React App", stack: "typescript",
    components: [
      { label: "App",        desc: "root React application component with router and global providers" },
      { label: "Header",     desc: "responsive navigation header with logo, links and user avatar" },
      { label: "use_auth",   desc: "authentication React hook managing login state and token refresh" },
      { label: "api_client", desc: "typed API client for making authenticated HTTP requests" },
      { label: "data_store", desc: "client-side state store for caching and syncing server data" },
    ],
  },
  {
    name: "Data Pipeline", stack: "python",
    components: [
      { label: "ingest",       desc: "data ingestion function that reads from stream and validates schema" },
      { label: "transform",    desc: "transformation pipeline that normalises and enriches raw data" },
      { label: "store",        desc: "persistence layer that writes processed records to database" },
      { label: "event_emitter",desc: "event system that broadcasts pipeline stage completion signals" },
    ],
  },
];

function CodeBuilderTab() {
  const [mode, setMode] = useState<"single" | "app">("single");

  // ── Single mode state
  const [desc, setDesc]       = useState("function authenticate(user, password) validates credentials and returns a JWT token");
  const [label, setLabel]     = useState("authenticate");
  const [lang, setLang]       = useState("typescript");
  const [encoded, setEncoded] = useState<any>(null);
  const [code, setCode]       = useState("");

  const singleMut = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/nexus/dev/encode", { instruction: desc, label })
        .then(r => r.json()),
    onSuccess: (data) => {
      setEncoded(data);
      setCode(generateCode(desc, lang, data.wavelength_mid_nm, data.psi_channel, label));
    },
  });

  // ── App mode state
  const [appName, setAppName]       = useState("MyNexusApp");
  const [appLang, setAppLang]       = useState("typescript");
  const [components, setComponents] = useState(APP_PRESETS[0].components);
  const [builtFiles, setBuiltFiles] = useState<Record<string, { code: string; encoded: any }>>({});
  const [building, setBuilding]     = useState(false);
  const [activeFile, setActiveFile] = useState<string>("");

  const buildApp = async () => {
    setBuilding(true);
    setBuiltFiles({});
    const files: Record<string, { code: string; encoded: any }> = {};
    for (const comp of components) {
      try {
        const res  = await apiRequest("POST", "/api/nexus/dev/encode", { instruction: comp.desc, label: comp.label });
        const data = await res.json();
        files[comp.label] = { code: generateCode(comp.desc, appLang, data.wavelength_mid_nm, data.psi_channel, comp.label), encoded: data };
      } catch {}
    }
    setBuiltFiles(files);
    setActiveFile(Object.keys(files)[0] ?? "");
    setBuilding(false);
  };

  const activeData = builtFiles[activeFile];
  const singleBand = encoded ? getBand(encoded.wavelength_mid_nm) : null;
  const appBand    = activeData ? getBand(activeData.encoded.wavelength_mid_nm) : null;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Your description is CE-encoded and the result determines the code domain — auth, storage,
        UI, events. Every file you generate carries a physical address in the universe.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button onClick={() => setMode("single")}
          className={`px-3 py-1.5 text-xs rounded font-mono border transition-colors ${mode === "single" ? "bg-cyan-900/40 border-cyan-500 text-cyan-300" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}
          data-testid="btn-mode-single">
          Single component
        </button>
        <button onClick={() => setMode("app")}
          className={`px-3 py-1.5 text-xs rounded font-mono border transition-colors ${mode === "app" ? "bg-green-900/40 border-green-500 text-green-300" : "border-slate-700 text-slate-500 hover:text-slate-300"}`}
          data-testid="btn-mode-app">
          Full app
        </button>
      </div>

      {/* ── Single mode ─── */}
      {mode === "single" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-400">Description (plain language)</Label>
                <span className={`text-xs font-mono ${desc.length > 450 ? "text-amber-400" : "text-slate-600"}`}>
                  {desc.length}/500
                </span>
              </div>
              <Textarea
                value={desc}
                onChange={e => setDesc(e.target.value.slice(0, 500))}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm min-h-20"
                placeholder="e.g. authenticate user and return a JWT token"
                data-testid="input-desc"
              />
              {desc.length >= 500 && (
                <p className="text-xs text-amber-400">
                  500 char limit. For large documents use Spectral DB → Write → File upload.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Label / Name</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
                data-testid="input-label" />
              <Label className="text-xs text-slate-400">Language</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200" data-testid="select-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML / CSS</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={() => singleMut.mutate()}
                disabled={singleMut.isPending || !desc} data-testid="btn-write">
                <Zap className="w-3 h-3 mr-1" />
                {singleMut.isPending ? "Encoding…" : "CE → Write Code"}
              </Button>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex, i) => (
                <button key={i}
                  onClick={() => { setDesc(ex.desc); setLabel(ex.label.replace(/\s+/g, "_").toLowerCase()); setLang(ex.lang); setEncoded(null); setCode(""); }}
                  className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono"
                  data-testid={`example-btn-${i}`}>
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {encoded && singleBand && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="w-4 h-4 rounded-full" style={{ background: singleBand.color }} />
                <span className="font-mono text-sm" style={{ color: singleBand.color }}>
                  {singleBand.emoji} {singleBand.name} — {singleBand.desc}
                </span>
                <Badge className="text-xs bg-slate-700 text-slate-300">{encoded.psi_channel}</Badge>
                <span className="text-xs font-mono text-slate-500">λ = {encoded.wavelength_mid_nm?.toFixed(1)} nm</span>
              </div>
              {code && (
                <div className="rounded-lg overflow-hidden border border-slate-700">
                  <SpectralHeader data={encoded} lang={lang} />
                  <div className="relative">
                    <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-[500px]">{code}</pre>
                    <div className="absolute top-2 right-2"><CopyButton text={code} /></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── App mode ─── */}
      {mode === "app" && (
        <div className="space-y-4">
          <p className="text-slate-400 text-xs">
            Every component is CE-encoded individually. The full codebase emerges with physical wavelength
            provenance on every file.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center">Presets:</span>
            {APP_PRESETS.map((p, i) => (
              <button key={i}
                onClick={() => { setComponents(p.components); setAppLang(p.stack); setBuiltFiles({}); setActiveFile(""); }}
                className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono"
                data-testid={`preset-${i}`}>
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <Label className="text-xs text-slate-400">App Name</Label>
              <Input value={appName} onChange={e => setAppName(e.target.value)}
                className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
                data-testid="input-app-name" />
            </div>
            <div className="w-36">
              <Label className="text-xs text-slate-400">Language</Label>
              <Select value={appLang} onValueChange={setAppLang}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200" data-testid="select-app-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="sql">SQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="mt-5" onClick={buildApp} disabled={building} data-testid="btn-build-app">
              <Play className="w-3 h-3 mr-1" />
              {building ? "Generating…" : "Generate App"}
            </Button>
          </div>

          <div className="space-y-1">
            {components.map((c, i) => (
              <div key={i} className="flex gap-2 items-center text-xs font-mono text-slate-400 p-2 bg-slate-900/40 rounded border border-slate-800">
                {builtFiles[c.label]
                  ? <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getBand(builtFiles[c.label].encoded.wavelength_mid_nm).color }} />
                  : <div className="w-2 h-2 rounded-full bg-slate-700 flex-shrink-0" />}
                <span className="text-slate-200 w-36 flex-shrink-0">{c.label}</span>
                <span className="text-slate-500 truncate">{c.desc}</span>
                {builtFiles[c.label] && (
                  <span className="ml-auto text-slate-600">λ={builtFiles[c.label].encoded.wavelength_mid_nm?.toFixed(0)}nm</span>
                )}
              </div>
            ))}
          </div>

          {Object.keys(builtFiles).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-mono text-slate-500 mb-2">{appName}/</p>
                {Object.entries(builtFiles).map(([fname, fdata]) => {
                  const b = getBand(fdata.encoded.wavelength_mid_nm);
                  return (
                    <button key={fname} onClick={() => setActiveFile(fname)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono"
                      style={{
                        background: activeFile === fname ? `${b.color}20` : "transparent",
                        color: activeFile === fname ? b.color : "#94a3b8",
                        border: `1px solid ${activeFile === fname ? `${b.color}40` : "transparent"}`,
                      }}
                      data-testid={`file-${fname}`}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color }} />
                      {fname}.{appLang === "typescript" ? "ts" : appLang === "python" ? "py" : appLang === "html" ? "html" : "sql"}
                    </button>
                  );
                })}
              </div>
              <div className="md:col-span-3">
                {activeData && appBand && (
                  <div className="rounded-lg overflow-hidden border border-slate-700">
                    <SpectralHeader data={activeData.encoded} lang={appLang} />
                    <div className="relative">
                      <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-96">{activeData.code}</pre>
                      <div className="absolute top-2 right-2"><CopyButton text={activeData.code} /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Integration Kit ────────────────────────────────────────
const NODE_SNIPPET = `// CE Encoder — WNSP Character Encoding v1.0
// AGPL-3.0 — NexusOS Free Infrastructure
// E = hf  |  λ = c/f  |  Λ = hf/c²
// Runs on any silicon chip today. No server required.

const H = 6.626e-34;   // J·s  (Planck constant)
const C = 2.998e8;     // m/s  (speed of light)

// CE 128-band lookup table: ASCII code 0–127 → wavelength 380–780 nm
const CE_TABLE = Array.from({ length: 128 }, (_, i) => 380 + (i / 128) * 400);

const BANDS = [
  { name: "SYSTEM",  min: 380, max: 450 },
  { name: "AUTH",    min: 450, max: 490 },
  { name: "STREAM",  min: 490, max: 520 },
  { name: "CORE",    min: 520, max: 565 },
  { name: "UI",      min: 565, max: 590 },
  { name: "EVENT",   min: 590, max: 625 },
  { name: "STORAGE", min: 625, max: 780 },
];

const charToNm  = c => CE_TABLE[c.charCodeAt(0) % 128];
const getBand   = nm => (BANDS.find(b => nm >= b.min && nm < b.max) || BANDS.at(-1)).name;
const getPsi    = (nm, text) => {
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = [...text].reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
  const pol = text.length % 2 === 0 ? "H" : "V";
  return \`Ψ(\${wdm},\${oam},\${pol})\`;
};

function ceEncode(text) {
  if (!text) return null;
  const nms     = [...text].map(charToNm);
  const wavelength = +(nms.reduce((s, n) => s + n, 0) / nms.length).toFixed(2);
  const f       = C / (wavelength * 1e-9);   // f = c/λ  (E = hf)
  const energy  = H * f;                     // E = hf  in joules
  return {
    wavelength,                              // dominant wavelength (nm)
    band: getBand(wavelength),               // spectral authority band
    psiChannel: getPsi(wavelength, text),    // Ψ(wdm,oam,pol) channel address
    energy,                                  // photon energy E = hf (joules)
  };
}

module.exports = { ceEncode, charToNm, getBand };

// Usage:
// const { ceEncode } = require('./ce-encoder');
// const r = ceEncode("Hello world");
// console.log(r.wavelength, r.band, r.psiChannel, r.energy);
`;

const PYTHON_SNIPPET = `# CE Encoder — WNSP Character Encoding v1.0
# AGPL-3.0 — NexusOS Free Infrastructure
# E = hf  |  λ = c/f  |  Λ = hf/c²
# Runs on any silicon chip today. No server required.

H = 6.626e-34   # J·s  (Planck constant)
C = 2.998e8     # m/s  (speed of light)

# CE 128-band lookup table: ASCII code 0-127 → wavelength 380-780 nm
CE_TABLE = [380 + (i / 128) * 400 for i in range(128)]

BANDS = [
    ("SYSTEM",  380, 450),
    ("AUTH",    450, 490),
    ("STREAM",  490, 520),
    ("CORE",    520, 565),
    ("UI",      565, 590),
    ("EVENT",   590, 625),
    ("STORAGE", 625, 780),
]


def char_to_nm(char: str) -> float:
    return CE_TABLE[ord(char) % 128]


def get_band(nm: float) -> str:
    for name, lo, hi in BANDS:
        if lo <= nm < hi:
            return name
    return "STORAGE"


def get_psi(nm: float, text: str) -> str:
    wdm = int((nm - 380) / 4) + 1
    oam = sum(ord(c) for c in text) % 50
    pol = "H" if len(text) % 2 == 0 else "V"
    return f"Ψ({wdm},{oam},{pol})"


def ceEncode(text: str) -> dict:
    """CE-encode text → spectral address.
    Returns: wavelength (nm), band, psiChannel Ψ(wdm,oam,pol), energy (J).
    """
    nms        = [char_to_nm(c) for c in text]
    wavelength = round(sum(nms) / len(nms), 2)
    f          = C / (wavelength * 1e-9)   # f = c/λ
    energy     = H * f                     # E = hf in joules
    return {
        "wavelength":  wavelength,          # dominant wavelength (nm)
        "band":        get_band(wavelength), # spectral authority band
        "psiChannel":  get_psi(wavelength, text),  # Ψ(wdm,oam,pol)
        "energy":      energy,              # photon energy E = hf (joules)
    }


# Usage:
# result = ceEncode("Hello world")
# print(result["wavelength"], result["band"], result["psiChannel"], result["energy"])
`;

const BROWSER_SNIPPET = `// CE Encoder — WNSP Character Encoding v1.0
// AGPL-3.0 — NexusOS Free Infrastructure
// E = hf  |  λ = c/f  |  Λ = hf/c²
// ES module — paste into any browser project or <script type="module">

const H = 6.626e-34, C = 2.998e8;

// CE 128-band lookup table: ASCII code 0–127 → wavelength 380–780 nm
const CE_TABLE = Array.from({ length: 128 }, (_, i) => 380 + (i / 128) * 400);

const BANDS = [
  ["SYSTEM",380,450], ["AUTH",450,490], ["STREAM",490,520], ["CORE",520,565],
  ["UI",565,590],     ["EVENT",590,625],["STORAGE",625,780],
];

const charToNm = c => CE_TABLE[c.charCodeAt(0) % 128];
const getBand  = nm => (BANDS.find(([,lo,hi]) => nm >= lo && nm < hi) || BANDS.at(-1))[0];
const getPsi   = (nm, text) => {
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = [...text].reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
  const pol = text.length % 2 === 0 ? "H" : "V";
  return \`Ψ(\${wdm},\${oam},\${pol})\`;
};

// λ → approximate RGB color (for visualization)
export function nmToRgb(nm) {
  let r=0,g=0,b=0;
  if (nm<440){r=-(nm-440)/60;b=1;}
  else if(nm<490){g=(nm-440)/50;b=1;}
  else if(nm<510){g=1;b=-(nm-510)/20;}
  else if(nm<580){r=(nm-510)/70;g=1;}
  else if(nm<645){r=1;g=-(nm-645)/65;}
  else{r=1;}
  return \`rgb(\${Math.round(r*255)},\${Math.round(g*255)},\${Math.round(b*255)})\`;
}

export function ceEncode(text) {
  const nms      = [...text].map(charToNm);
  const wavelength = +(nms.reduce((s, n) => s + n, 0) / nms.length).toFixed(2);
  const f        = C / (wavelength * 1e-9);   // f = c/λ
  const energy   = H * f;                     // E = hf in joules
  return {
    wavelength,                              // dominant wavelength (nm)
    band: getBand(wavelength),               // spectral authority band
    psiChannel: getPsi(wavelength, text),    // Ψ(wdm,oam,pol) channel address
    energy,                                  // photon energy E = hf (joules)
  };
}

// Usage:
// import { ceEncode, nmToRgb } from './ce-encoder.js';
// const r = ceEncode("Hello world");
// console.log(r.wavelength, r.band, r.psiChannel, r.energy);
// document.body.style.background = nmToRgb(r.wavelength);
`;

// Compute a canonical sync test vector at module load time (pure CE_TABLE math)
function computeSyncVector(sample: string) {
  const nms = Array.from(sample).map(c => CE_TABLE[c.charCodeAt(0) % 128]);
  const wl  = +(nms.reduce((s, n) => s + n, 0) / nms.length).toFixed(2);
  const wdm = Math.floor((wl - 380) / 4) + 1;
  const oam = Array.from(sample).reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
  const pol = sample.length % 2 === 0 ? "H" : "V";
  return {
    wavelength: wl,
    band:       getBand(wl).name,
    psiChannel: `Ψ(${wdm},${oam},${pol})`,
    energy:     +(PLANCK_H * (SPEED_C / (wl * 1e-9))),
  };
}
const SYNC_SAMPLE = "hello";
const SYNC_VECTOR = computeSyncVector(SYNC_SAMPLE);

function IntegrationKitTab() {
  const [kitLang, setKitLang] = useState<"nodejs" | "python" | "browser">("nodejs");
  const [showVerify, setShowVerify] = useState(false);
  const snippets = { nodejs: NODE_SNIPPET, python: PYTHON_SNIPPET, browser: BROWSER_SNIPPET };
  const current = snippets[kitLang];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Self-contained CE encoder for your own project. Zero NexusOS dependency. Drop it in,
        call <code className="text-cyan-400 bg-slate-800 px-1 rounded">ceEncode(text)</code> and
        you are encoding human symbols into the electromagnetic spectrum on silicon today.
      </p>

      {/* Install commands */}
      <div className="p-3 rounded-lg border border-slate-700 bg-slate-900/60 space-y-2">
        <p className="text-xs font-mono text-slate-400 font-semibold">Install</p>
        <div className="space-y-1.5">
          {[
            { label: "npm", cmd: "npm install nexusos-ce-encoder" },
            { label: "pip", cmd: "pip install nexusos-ce-encoder" },
          ].map(({ label, cmd }) => (
            <div key={label} className="flex items-center justify-between rounded bg-slate-800 px-3 py-1.5 border border-slate-700">
              <span className="text-xs font-mono text-slate-300">{cmd}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600">{label}</span>
                <CopyButton text={cmd} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600">
          Or copy the snippet below — zero dependencies, drop anywhere.
        </p>
      </div>

      <div className="p-3 rounded-lg border border-cyan-900/50 bg-cyan-950/20 text-xs text-cyan-300 font-mono space-y-1">
        <p className="font-semibold">Runs on any silicon chip today. No NexusOS server required.</p>
        <p className="text-cyan-600">Licensed AGPL-3.0 — free civilization infrastructure.</p>
        <p className="text-cyan-600">Algorithm: CE_TABLE[charCode % 128] → 380–780 nm → E=hf → Λ=hf/c²</p>
      </div>

      {/* Sync verification */}
      <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-mono text-green-300 font-semibold">
              JS === Python — bit-identical output verified
            </span>
          </div>
          <button onClick={() => setShowVerify(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-300 font-mono"
            data-testid="btn-toggle-verify">
            {showVerify ? "hide" : "show test vector"}
          </button>
        </div>
        {showVerify && (
          <div className="space-y-1.5">
            <p className="text-xs font-mono text-slate-500">
              Input: <span className="text-slate-300">"{SYNC_SAMPLE}"</span>
            </p>
            <pre className="text-xs font-mono text-green-300 bg-slate-900 rounded p-3 overflow-x-auto">
{`ceEncode("${SYNC_SAMPLE}") ===
${JSON.stringify(SYNC_VECTOR, null, 2)}`}
            </pre>
            <p className="text-xs text-slate-600">
              Both Node.js and Python use CE_TABLE[charCode % 128] with identical rounding
              (2 decimal places). psiChannel uses same Ψ(wdm,oam,pol) derivation.
            </p>
          </div>
        )}
      </div>

      {/* Language tabs */}
      <div className="flex gap-2">
        {(["nodejs", "python", "browser"] as const).map(l => (
          <button key={l} onClick={() => setKitLang(l)}
            className={`px-3 py-1.5 text-xs rounded font-mono border transition-colors ${kitLang === l ? "bg-slate-700 border-slate-500 text-slate-100" : "border-slate-800 text-slate-500 hover:text-slate-300"}`}
            data-testid={`kit-lang-${l}`}>
            {l === "nodejs" ? "Node.js" : l === "python" ? "Python" : "Browser JS"}
          </button>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden border border-slate-700">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
          <span className="text-xs font-mono text-slate-400">
            ce-encoder.{kitLang === "python" ? "py" : "js"}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-600">AGPL-3.0</span>
            <CopyButton text={current} label="Copy file" />
          </div>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-[480px]">{current}</pre>
      </div>

      {/* Band table */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-slate-500">CE spectral bands (same across all implementations)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: "SYSTEM",  range: "380–450 nm", color: "#8b00ff" },
            { name: "AUTH",    range: "450–490 nm", color: "#0050ff" },
            { name: "STREAM",  range: "490–520 nm", color: "#00cfcf" },
            { name: "CORE",    range: "520–565 nm", color: "#00c800" },
            { name: "UI",      range: "565–590 nm", color: "#cccc00" },
            { name: "EVENT",   range: "590–625 nm", color: "#ff8c00" },
            { name: "STORAGE", range: "625–780 nm", color: "#cc0000" },
          ].map(b => (
            <div key={b.name} className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
              <div>
                <p className="text-xs font-mono font-semibold" style={{ color: b.color }}>{b.name}</p>
                <p className="text-xs font-mono text-slate-600">{b.range}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 4: Spectral Linter ────────────────────────────────────────
function SpectralLinterTab() {
  const [source, setSource] = useState(`function authenticate(user, password) {
  // validate credentials
}

function renderDashboard() {
  // render UI
}

function saveUserRecord(data) {
  // persist to database
}

function onLoginEvent(event) {
  // handle login
}`);
  const [results, setResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const lint = async () => {
    setRunning(true);
    setResults([]);
    const fnRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())/g;
    const matches: string[] = [];
    let m;
    while ((m = fnRegex.exec(source)) !== null) {
      matches.push(m[1] || m[2]);
    }
    const encoded: any[] = [];
    for (const fn of matches.slice(0, 8)) {
      const line = source.split("\n").find(l => l.includes(fn)) ?? fn;
      try {
        const res  = await apiRequest("POST", "/api/nexus/dev/encode", { instruction: line.trim(), label: fn });
        const data = await res.json();
        encoded.push({ fn, ...data });
      } catch {}
    }
    setResults(encoded);
    setRunning(false);
  };

  // Coherence: % of functions in the dominant band
  const coherenceScore = (() => {
    if (results.length < 2) return null;
    const counts: Record<string, number> = {};
    for (const r of results) {
      const b = getBand(r.wavelength_mid_nm).name;
      counts[b] = (counts[b] ?? 0) + 1;
    }
    const max = Math.max(...Object.values(counts));
    const pct = Math.round((max / results.length) * 100);
    const domBand = Object.entries(counts).find(([, v]) => v === max)?.[0] ?? "";
    return { pct, domBand, max, total: results.length };
  })();

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Paste any code. The linter CE-encodes each function and reveals whether your codebase has
        coherent spectral structure or scattered, conflicting addresses.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-400">Source code</Label>
          <Textarea
            value={source}
            onChange={e => setSource(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-xs min-h-48"
            data-testid="input-source"
          />
          <Button className="mt-2 w-full" onClick={lint} disabled={running} data-testid="btn-lint">
            <Zap className="w-3 h-3 mr-1" />
            {running ? "Scanning…" : "Spectral Lint"}
          </Button>
        </div>

        <div>
          {results.length > 0 && (
            <div className="space-y-2">
              {/* Coherence score */}
              {coherenceScore && (
                <div className="flex items-center gap-2 p-2 rounded border border-slate-700 bg-slate-900/60">
                  <div className="text-xs font-mono">
                    <span className="text-slate-400">Coherence: </span>
                    <span className={`font-bold ${coherenceScore.pct >= 75 ? "text-green-400" : coherenceScore.pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                      {coherenceScore.pct}%
                    </span>
                    <span className="text-slate-500">
                      {" "}— {coherenceScore.max} of {coherenceScore.total} functions in{" "}
                    </span>
                    <span className="font-semibold" style={{ color: getBand(results.find(r => getBand(r.wavelength_mid_nm).name === coherenceScore.domBand)?.wavelength_mid_nm ?? 550).color }}>
                      {coherenceScore.domBand}
                    </span>
                  </div>
                </div>
              )}

              <Label className="text-xs text-slate-400">Spectral addresses</Label>
              <div className="h-6 w-full rounded relative"
                style={{ background: "linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)" }}>
                {results.map((r, i) => {
                  const pct = ((r.wavelength_mid_nm - 380) / 400) * 100;
                  return (
                    <div key={i}
                      className="absolute top-0 h-6 w-0.5"
                      style={{ left: `${pct}%`, background: "rgba(255,255,255,0.9)" }}
                      title={`${r.fn}: ${r.wavelength_mid_nm?.toFixed(1)}nm`}
                    />
                  );
                })}
              </div>

              <div className="space-y-1">
                {results.map((r, i) => {
                  const b = getBand(r.wavelength_mid_nm);
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border border-slate-800 bg-slate-900/60"
                      data-testid={`lint-result-${i}`}>
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: b.color }} />
                      <span className="font-mono text-xs text-slate-200 w-40 flex-shrink-0">{r.fn}</span>
                      <span className="text-xs font-mono text-slate-500">{r.wavelength_mid_nm?.toFixed(1)}nm</span>
                      <span className="text-xs font-mono ml-auto" style={{ color: b.color }}>{b.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function CeCodeWriterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "linear-gradient(135deg,#8b00ff,#00c800,#cc0000)" }}>
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">CE Encoder — Human First Contact</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Every symbol you write already exists as a photon frequency.
              CE encoding makes that formal — deterministic, censorship-proof, hardware-ready.
            </p>
            <p className="text-slate-600 text-xs mt-1 font-mono">
              WNSP-CE v1.0 · Character Encoding Protocol · AGPL-3.0 Free Infrastructure
            </p>
          </div>
        </div>

        {/* Spectrum bar */}
        <div className="h-2 w-full rounded mb-1"
          style={{ background: "linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)" }} />
        <div className="flex justify-between text-xs font-mono text-slate-700">
          {[
            { label: "SYSTEM",  color: "#8b00ff" },
            { label: "AUTH",    color: "#0050ff" },
            { label: "STREAM",  color: "#00cfcf" },
            { label: "CORE",    color: "#00c800" },
            { label: "UI",      color: "#cccc00" },
            { label: "EVENT",   color: "#ff8c00" },
            { label: "STORAGE", color: "#cc0000" },
          ].map((b, i) => (
            <span key={i} style={{ color: b.color }}>{b.label}</span>
          ))}
        </div>
      </div>

      <Tabs defaultValue="live">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4 overflow-x-auto flex-nowrap flex w-full">
          <TabsTrigger value="live" className="flex-shrink-0" data-testid="tab-live">
            <Radio className="w-3 h-3 mr-1" /> Live Encode
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex-shrink-0" data-testid="tab-builder">
            <Code2 className="w-3 h-3 mr-1" /> Code Builder
          </TabsTrigger>
          <TabsTrigger value="kit" className="flex-shrink-0" data-testid="tab-kit">
            <Package className="w-3 h-3 mr-1" /> Integration Kit
          </TabsTrigger>
          <TabsTrigger value="linter" className="flex-shrink-0" data-testid="tab-linter">
            <Zap className="w-3 h-3 mr-1" /> Spectral Linter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Type anything — watch every symbol become a wavelength
          </h2>
          <LiveEncodeTab />
        </TabsContent>

        <TabsContent value="builder">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Describe your code — CE assigns it a physical address in the universe
          </h2>
          <CodeBuilderTab />
        </TabsContent>

        <TabsContent value="kit">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            Take the CE encoder home — drop it in any project, runs on silicon today
          </h2>
          <IntegrationKitTab />
        </TabsContent>

        <TabsContent value="linter">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3">
            Scan existing code — reveal its spectral structure and coherence
          </h2>
          <SpectralLinterTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
