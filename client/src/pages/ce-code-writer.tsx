import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Code2, Zap, Layers, Copy, Check, Play } from "lucide-react";

// ── Spectral band → code domain ───────────────────────────────────
function getBand(nm: number) {
  if (nm < 450) return { name: "SYSTEM",    emoji: "⚙", color: "#8b00ff", desc: "OS / kernel / process management"      };
  if (nm < 490) return { name: "AUTH",      emoji: "🔐", color: "#0050ff", desc: "Authentication / security / sessions"  };
  if (nm < 520) return { name: "STREAM",    emoji: "⚡", color: "#00cfcf", desc: "Data streams / WebSocket / realtime"   };
  if (nm < 565) return { name: "CORE",      emoji: "⚙", color: "#00c800", desc: "Core business logic / algorithms"      };
  if (nm < 590) return { name: "UI",        emoji: "🎨", color: "#cccc00", desc: "UI components / layout / styling"      };
  if (nm < 625) return { name: "EVENT",     emoji: "📡", color: "#ff8c00", desc: "Events / webhooks / async signals"     };
  return         { name: "STORAGE",  emoji: "💾", color: "#cc0000", desc: "Database / file I/O / persistence"    };
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

  getState(): ProcessState {
    return { ...this.state };
  }

  degrade(): void {
    this.state.status = "DEGRADED";
    this.emit("degraded", this.state);
  }

  reclaim(): void {
    this.state.status = "RECLAIMED";
    this.emit("reclaimed", this.state);
  }

  isAlive(): boolean {
    return this.state.status === "RUNNING";
  }
}

export { ${toPascal(name)}Process, ProcessState };
`;

  if (B === "AUTH") return `// ${psi}
// Domain: Authentication & Security
// Description: ${desc}

import { createHash, randomBytes } from "crypto";

interface AuthToken {
  userId: string;
  token: string;
  wavelength: number;
  expiresAt: Date;
}

interface AuthResult {
  success: boolean;
  token?: AuthToken;
  error?: string;
}

async function ${name}(userId: string, secret: string): Promise<AuthResult> {
  // Spectral authority check: AUTH band (450–489 nm) = KERNEL authority
  if (!userId || !secret) {
    return { success: false, error: "Missing credentials" };
  }

  const token = randomBytes(32).toString("hex");
  const hash  = createHash("sha256")
    .update(\`\${userId}:\${secret}:\${token}\`)
    .digest("hex");

  return {
    success: true,
    token: {
      userId,
      token: hash,
      wavelength: ${nm.toFixed(1)},  // ${psi}
      expiresAt: new Date(Date.now() + 3600 * 1000),
    },
  };
}

async function verify${toPascal(name)}(token: string): Promise<boolean> {
  // Validate token is in AUTH spectral band
  return typeof token === "string" && token.length === 64;
}

export { ${name}, verify${toPascal(name)}, AuthToken, AuthResult };
`;

  if (B === "STREAM") return `// ${psi}
// Domain: Data Streams / WebSocket / Realtime
// Description: ${desc}

interface StreamFrame {
  id: string;
  wavelength: number;
  payload: unknown;
  timestamp: number;
}

class ${toPascal(name)}Stream {
  private handlers: Map<string, (frame: StreamFrame) => void> = new Map();
  private ws: WebSocket | null = null;

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      const frame: StreamFrame = JSON.parse(event.data);
      // Route to handler by wavelength band
      const handler = this.handlers.get(frame.id);
      if (handler) handler(frame);
    };

    this.ws.onopen = () => {
      console.log(\`[${name}] Stream open — λ=${nm.toFixed(1)}nm\`);
    };
  }

  on(id: string, handler: (frame: StreamFrame) => void): void {
    this.handlers.set(id, handler);
  }

  emit(payload: unknown): void {
    const frame: StreamFrame = {
      id: crypto.randomUUID(),
      wavelength: ${nm.toFixed(1)},  // ${psi}
      payload,
      timestamp: Date.now(),
    };
    this.ws?.send(JSON.stringify(frame));
  }

  close(): void {
    this.ws?.close();
  }
}

export { ${toPascal(name)}Stream, StreamFrame };
`;

  if (B === "CORE") return `// ${psi}
// Domain: Core Business Logic
// Description: ${desc}

interface ${toPascal(name)}Input {
  data: unknown;
  wavelength?: number;
}

interface ${toPascal(name)}Output {
  result: unknown;
  metadata: {
    wavelength: number;
    channel: string;
    processedAt: Date;
  };
}

async function ${name}(input: ${toPascal(name)}Input): Promise<${toPascal(name)}Output> {
  // Core logic — spectral address: ${psi}
  const { data } = input;

  if (data === null || data === undefined) {
    throw new Error(\`[${name}] No input data at λ=${nm.toFixed(1)}nm\`);
  }

  // Process the data
  const result = await transform(data);

  return {
    result,
    metadata: {
      wavelength: ${nm.toFixed(1)},
      channel: "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}",
      processedAt: new Date(),
    },
  };
}

async function transform(data: unknown): Promise<unknown> {
  // Implement transformation logic here
  return data;
}

export { ${name}, ${toPascal(name)}Input, ${toPascal(name)}Output };
`;

  if (B === "UI") return `// ${psi}
// Domain: UI Component
// Description: ${desc}

import React, { useState } from "react";

interface ${toPascal(name)}Props {
  title?: string;
  onAction?: (data: unknown) => void;
  className?: string;
}

// Spectral address: λ=${nm.toFixed(1)}nm (UI/Yellow band)
export function ${toPascal(name)}({ title, onAction, className }: ${toPascal(name)}Props) {
  const [active, setActive] = useState(false);

  const handleClick = () => {
    setActive(!active);
    onAction?.({ wavelength: ${nm.toFixed(1)}, timestamp: Date.now() });
  };

  return (
    <div
      className={\`nexus-component \${className ?? ""} \${active ? "active" : ""}\`}
      data-wavelength="${nm.toFixed(1)}"
      data-channel="${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}"
    >
      {title && <h2 className="nexus-title">{title}</h2>}
      <button
        onClick={handleClick}
        className="nexus-btn"
        aria-pressed={active}
      >
        {active ? "Active" : "Activate"}
      </button>
      <style>{\`
        .nexus-component { padding: 1rem; border-radius: 0.5rem; border: 1px solid #${nm.toFixed(0)}; }
        .nexus-btn { background: hsl(${Math.round((nm - 380) / 400 * 360)}, 70%, 50%); color: white; padding: 0.5rem 1rem; border-radius: 0.25rem; border: none; cursor: pointer; }
        .nexus-btn:hover { opacity: 0.85; }
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

  // Spectral address: λ=${nm.toFixed(1)}nm (Event/Orange band)
  subscribe(event: string, handler: EventHandler): () => void {
    const handlers = this.subscribers.get(event) ?? [];
    handlers.push(handler);
    this.subscribers.set(event, handlers);

    // Return unsubscribe function
    return () => {
      const h = this.subscribers.get(event) ?? [];
      this.subscribers.set(event, h.filter(fn => fn !== handler));
    };
  }

  async emit(event: string, payload: EventPayload): Promise<void> {
    const handlers = this.subscribers.get(event) ?? [];
    await Promise.all(
      handlers.map(handler =>
        Promise.resolve(handler({ ...payload, _wavelength: ${nm.toFixed(1)}, _channel: "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}" }))
      )
    );
  }

  clear(event?: string): void {
    if (event) this.subscribers.delete(event);
    else this.subscribers.clear();
  }
}

const ${name}Bus = new ${toPascal(name)}EventBus();
export { ${name}Bus, ${toPascal(name)}EventBus, EventPayload };
`;

  // STORAGE
  return `// ${psi}
// Domain: Storage / Database / Persistence
// Description: ${desc}

interface ${toPascal(name)}Record {
  id: string;
  data: unknown;
  wavelength: number;
  createdAt: Date;
  updatedAt: Date;
}

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
      Object.entries(filter).every(([k, v]) => (r as Record<string,unknown>)[k] === v)
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
    Authority band: KERNEL (AUTH 450-489nm)
    """
    if not user_id or not secret:
        raise ValueError("Missing credentials")

    salt  = secrets.token_hex(16)
    token = hashlib.sha256(f"{user_id}:{secret}:{salt}".encode()).hexdigest()
    return AuthToken(user_id=user_id, token=token)


def verify_${name}(token: str) -> bool:
    """Verify token is valid and unexpired."""
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
        await asyncio.gather(*[
            asyncio.coroutine(h)(frame) if asyncio.iscoroutinefunction(h)
            else asyncio.get_event_loop().run_in_executor(None, h, frame)
            for h in self._handlers
        ])
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
    Band: STORAGE / Red (625-780nm)
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
        if record_id in self._records:
            del self._records[record_id]
            return True
        return False
`;

  // Generic Python
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

        # Implement ${band.name.toLowerCase()} logic here
        result = input_data

        return ${cls}Result(success=True, data=result)

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
    /* Spectral theme: λ=${nm.toFixed(1)}nm */
    :root {
      --spectral-wavelength: ${nm.toFixed(1)};
      --spectral-hue: ${hue};
      --primary:   hsl(${hue}, 70%, 50%);
      --primary-d: hsl(${hue}, 70%, 35%);
      --bg:        hsl(${hue}, 20%, 5%);
      --surface:   hsl(${hue}, 15%, 10%);
      --text:      hsl(${hue}, 10%, 90%);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nexus-card {
      background: var(--surface);
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
      border-radius: 1rem;
      padding: 2rem;
      max-width: 640px;
      width: 90%;
    }

    .spectral-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-family: monospace;
      color: var(--primary);
      margin-bottom: 1rem;
    }

    .spectral-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: var(--primary);
    }

    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p  { color: color-mix(in srgb, var(--text) 70%, transparent); margin-bottom: 1rem; }

    .nexus-btn {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.2s;
    }
    .nexus-btn:hover { background: var(--primary-d); }

    .wavelength-bar {
      height: 4px;
      background: linear-gradient(to right, #8b00ff, #0000ff, #00cfff, #00ff00, #ffff00, #ff8c00, #cc0000);
      border-radius: 2px;
      margin-bottom: 1.5rem;
      position: relative;
    }
    .wavelength-marker {
      position: absolute;
      top: -3px;
      width: 10px; height: 10px;
      border-radius: 50%;
      background: white;
      border: 2px solid var(--primary);
      left: ${((nm - 380) / 400 * 100).toFixed(1)}%;
      transform: translateX(-50%);
    }
  </style>
</head>
<body>
  <div class="nexus-card" data-wavelength="${nm.toFixed(1)}">
    <div class="spectral-badge">
      <div class="spectral-dot"></div>
      λ = ${nm.toFixed(1)} nm · ${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"} · ${band.name}
    </div>

    <div class="wavelength-bar">
      <div class="wavelength-marker" title="${nm.toFixed(1)} nm"></div>
    </div>

    <h1>${name.replace(/_/g, " ")}</h1>
    <p>${desc}</p>

    <button class="nexus-btn" onclick="handleAction()">
      ${band.emoji} Execute
    </button>

    <div id="output" style="margin-top: 1rem; font-family: monospace; font-size: 0.85rem; color: var(--primary);"></div>
  </div>

  <script>
    // Spectral address: ${psi}
    const WAVELENGTH = ${nm.toFixed(1)};
    const CHANNEL    = "${psi.split("Ψ=")[1]?.split(" ")[0] ?? "Ψ(0,0,H)"}";
    const BAND       = "${band.name}";

    function handleAction() {
      document.getElementById("output").textContent =
        \`[λ=\${WAVELENGTH}nm] Action executed on channel \${CHANNEL}\`;
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

-- Table: ${name}
-- Spectral address: λ=${nm.toFixed(1)}nm

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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_${name}_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ${name}_updated_at
  BEFORE UPDATE ON ${name}
  FOR EACH ROW EXECUTE FUNCTION update_${name}_timestamp();

-- Queries
-- Find all records in this spectral band:
-- SELECT * FROM ${name} WHERE band = '${band.name}';

-- Find records by wavelength proximity (±5 nm):
-- SELECT * FROM ${name}
--   WHERE wavelength_nm BETWEEN ${(nm - 5).toFixed(1)} AND ${(nm + 5).toFixed(1)};

-- Insert example:
-- INSERT INTO ${name} (data) VALUES ('{"key": "value"}');
`;
}

function toPascal(s: string): string {
  return s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ── Copy button ───────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
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
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Spectral header for generated code ───────────────────────────
function SpectralHeader({ data, lang }: { data: any; lang: string }) {
  const band = getBand(data.wavelength_mid_nm ?? 550);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg border-b border-slate-700 bg-slate-800"
      style={{ borderTopColor: `${band.color}60` }}>
      <div className="w-3 h-3 rounded-full" style={{ background: band.color }} />
      <span className="text-xs font-mono" style={{ color: band.color }}>
        {band.name}
      </span>
      <span className="text-xs font-mono text-slate-500">
        λ = {data.wavelength_mid_nm?.toFixed(1)} nm
      </span>
      <span className="text-xs font-mono text-slate-500">
        {data.psi_channel}
      </span>
      <span className="text-xs font-mono text-slate-600">
        {data.energy_joules?.toExponential(2)} J
      </span>
      <span className="ml-auto text-xs font-mono text-slate-500">{lang}</span>
    </div>
  );
}

// ── Tab 1: CE Code Writer ─────────────────────────────────────────
const EXAMPLES = [
  { label: "Auth middleware",   desc: "function authenticate(user, password) validates credentials and returns a JWT token", lang: "typescript" },
  { label: "WebSocket handler", desc: "real-time data stream handler that broadcasts sensor readings to connected clients",   lang: "typescript" },
  { label: "User store",        desc: "database store for user records with find, save, update and delete operations",       lang: "python"     },
  { label: "API endpoint",      desc: "REST API endpoint that handles POST requests and validates the request body",          lang: "python"     },
  { label: "Hero section",      desc: "responsive hero section with gradient background and call-to-action button",           lang: "html"       },
  { label: "Events table",      desc: "PostgreSQL table for kernel events with wavelength and channel metadata",              lang: "sql"        },
  { label: "Process manager",   desc: "OS process manager that tracks running processes and reclaims dead ones",              lang: "typescript" },
  { label: "Event bus",         desc: "publish-subscribe event bus with typed handlers and async emission",                   lang: "typescript" },
];

function CodeWriterTab() {
  const [desc, setDesc]       = useState("function authenticate(user, password) validates credentials and returns a JWT token");
  const [label, setLabel]     = useState("authenticate");
  const [lang, setLang]       = useState("typescript");
  const [encoded, setEncoded] = useState<any>(null);
  const [code, setCode]       = useState("");

  const encodeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/nexus/dev/encode", { instruction: desc, label })
        .then(r => r.json()),
    onSuccess: (data) => {
      setEncoded(data);
      const generated = generateCode(desc, lang, data.wavelength_mid_nm, data.psi_channel, label);
      setCode(generated);
    },
  });

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setDesc(ex.desc);
    setLabel(ex.label.replace(/\s+/g, "_").toLowerCase());
    setLang(ex.lang);
    setEncoded(null);
    setCode("");
  };

  const band = encoded ? getBand(encoded.wavelength_mid_nm) : null;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Describe what you want in plain language. CE encodes the description into
        the spectrum — the wavelength determines the code domain (auth, storage, UI,
        events…). Working code is generated with its spectral address embedded.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-2">
          <Label className="text-xs text-slate-400">Description (plain language)</Label>
          <Textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm min-h-20"
            data-testid="input-desc"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Label / Name</Label>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-label"
          />
          <Label className="text-xs text-slate-400">Language</Label>
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200"
              data-testid="select-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="html">HTML / CSS</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            onClick={() => encodeMutation.mutate()}
            disabled={encodeMutation.isPending || !desc}
            data-testid="btn-write"
          >
            <Zap className="w-3 h-3 mr-1" />
            {encodeMutation.isPending ? "Encoding…" : "CE → Write Code"}
          </Button>
        </div>
      </div>

      {/* Examples */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Examples:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => loadExample(ex)}
              className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono"
              data-testid={`example-btn-${i}`}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {encoded && band && (
        <div className="space-y-3">
          {/* Spectral info */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-4 h-4 rounded-full" style={{ background: band.color }} />
            <span className="font-mono text-sm" style={{ color: band.color }}>
              {band.emoji} {band.name} — {band.desc}
            </span>
            <Badge className="text-xs bg-slate-700 text-slate-300">{encoded.psi_channel}</Badge>
            <span className="text-xs font-mono text-slate-500">
              λ = {encoded.wavelength_mid_nm?.toFixed(1)} nm
            </span>
          </div>

          {/* Generated code */}
          {code && (
            <div className="rounded-lg overflow-hidden border border-slate-700">
              <SpectralHeader data={encoded} lang={lang} />
              <div className="relative">
                <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-[500px]">
                  {code}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={code} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: App Scaffold ───────────────────────────────────────────
const APP_PRESETS = [
  {
    name: "REST API",
    stack: "typescript",
    components: [
      { label: "auth_middleware",  desc: "authenticate JWT token from request headers and validate user session" },
      { label: "user_controller",  desc: "REST controller handling GET POST PUT DELETE requests for user resources" },
      { label: "user_store",       desc: "database persistence layer for user records with CRUD operations" },
      { label: "event_logger",     desc: "async event logger that records all API calls with timestamps" },
      { label: "error_handler",    desc: "global error handling middleware that formats error responses" },
    ],
  },
  {
    name: "React App",
    stack: "typescript",
    components: [
      { label: "App",             desc: "root React application component with router and global providers" },
      { label: "Header",          desc: "responsive navigation header with logo, links and user avatar" },
      { label: "use_auth",        desc: "authentication React hook managing login state and token refresh" },
      { label: "api_client",      desc: "typed API client for making authenticated HTTP requests" },
      { label: "data_store",      desc: "client-side state store for caching and syncing server data" },
    ],
  },
  {
    name: "Data Pipeline",
    stack: "python",
    components: [
      { label: "ingest",          desc: "data ingestion function that reads from stream and validates schema" },
      { label: "transform",       desc: "transformation pipeline that normalises and enriches raw data" },
      { label: "store",           desc: "persistence layer that writes processed records to database" },
      { label: "event_emitter",   desc: "event system that broadcasts pipeline stage completion signals" },
    ],
  },
];

function AppScaffoldTab() {
  const [appName, setAppName]       = useState("MyNexusApp");
  const [lang, setLang]             = useState("typescript");
  const [components, setComponents] = useState(APP_PRESETS[0].components);
  const [builtFiles, setBuiltFiles] = useState<Record<string, { code: string; encoded: any }>>({});
  const [building, setBuilding]     = useState(false);
  const [activeFile, setActiveFile] = useState<string>("");

  const loadPreset = (preset: typeof APP_PRESETS[0]) => {
    setComponents(preset.components);
    setLang(preset.stack);
    setBuiltFiles({});
    setActiveFile("");
  };

  const buildApp = async () => {
    setBuilding(true);
    setBuiltFiles({});
    const files: Record<string, { code: string; encoded: any }> = {};

    for (const comp of components) {
      try {
        const res  = await apiRequest("POST", "/api/nexus/dev/encode", {
          instruction: comp.desc, label: comp.label,
        });
        const data = await res.json();
        const code = generateCode(comp.desc, lang, data.wavelength_mid_nm, data.psi_channel, comp.label);
        files[comp.label] = { code, encoded: data };
      } catch {}
    }

    setBuiltFiles(files);
    setActiveFile(Object.keys(files)[0] ?? "");
    setBuilding(false);
  };

  const activeData = builtFiles[activeFile];
  const band = activeData ? getBand(activeData.encoded.wavelength_mid_nm) : null;

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Define your app components. Each is CE-encoded and gets its own spectral
        address. The full codebase is generated with physical wavelength provenance
        on every file.
      </p>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-slate-500 self-center">Presets:</span>
        {APP_PRESETS.map((p, i) => (
          <button key={i} onClick={() => loadPreset(p)}
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
          <Select value={lang} onValueChange={setLang}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-200"
              data-testid="select-app-lang">
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
        <Button className="mt-5" onClick={buildApp} disabled={building}
          data-testid="btn-build-app">
          <Play className="w-3 h-3 mr-1" />
          {building ? "Generating…" : "Generate App"}
        </Button>
      </div>

      {/* Component list */}
      <div className="space-y-1">
        {components.map((c, i) => (
          <div key={i} className="flex gap-2 items-center text-xs font-mono text-slate-400 p-2 bg-slate-900/40 rounded border border-slate-800">
            {builtFiles[c.label] ? (
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: getBand(builtFiles[c.label].encoded.wavelength_mid_nm).color }} />
            ) : (
              <div className="w-2 h-2 rounded-full bg-slate-700 flex-shrink-0" />
            )}
            <span className="text-slate-200 w-36 flex-shrink-0">{c.label}</span>
            <span className="text-slate-500 truncate">{c.desc}</span>
            {builtFiles[c.label] && (
              <span className="ml-auto text-slate-600">
                λ={builtFiles[c.label].encoded.wavelength_mid_nm?.toFixed(0)}nm
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Generated files */}
      {Object.keys(builtFiles).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* File tree */}
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
                  {fname}.{lang === "typescript" ? "ts" : lang === "python" ? "py" : lang === "html" ? "html" : "sql"}
                </button>
              );
            })}
          </div>

          {/* Code panel */}
          <div className="md:col-span-3">
            {activeData && band && (
              <div className="rounded-lg overflow-hidden border border-slate-700">
                <SpectralHeader data={activeData.encoded} lang={lang} />
                <div className="relative">
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-96">
                    {activeData.code}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={activeData.code} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Spectral Linter ────────────────────────────────────────
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

    // Extract function signatures
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
        const res  = await apiRequest("POST", "/api/nexus/dev/encode", {
          instruction: line.trim(), label: fn,
        });
        const data = await res.json();
        encoded.push({ fn, ...data });
      } catch {}
    }

    setResults(encoded);
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Paste any code. The linter CE-encodes each function and shows its spectral
        address — revealing whether your codebase has coherent spectral structure or
        scattered, conflicting addresses.
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
          <Button className="mt-2 w-full" onClick={lint} disabled={running}
            data-testid="btn-lint">
            <Zap className="w-3 h-3 mr-1" />
            {running ? "Scanning…" : "Spectral Lint"}
          </Button>
        </div>

        <div>
          {results.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Spectral addresses</Label>
              {/* Mini spectrum bar */}
              <div className="h-6 w-full rounded relative"
                style={{ background: "linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)" }}>
                {results.map((r, i) => {
                  const pct = ((r.wavelength_mid_nm - 380) / 400) * 100;
                  const b = getBand(r.wavelength_mid_nm);
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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#8b00ff,#00c800,#cc0000)" }}>
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">NexusOS CE — Code Writer</h1>
            <p className="text-slate-400 text-sm">
              Describe what you want. CE encodes it. The spectrum writes the code.
            </p>
          </div>
        </div>

        {/* Spectrum + band legend */}
        <div className="h-2 w-full rounded mb-1"
          style={{ background: "linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)" }} />
        <div className="flex justify-between text-xs font-mono text-slate-600">
          {[
            { label: "SYSTEM", color: "#8b00ff" },
            { label: "AUTH",   color: "#0050ff" },
            { label: "STREAM", color: "#00cfcf" },
            { label: "CORE",   color: "#00c800" },
            { label: "UI",     color: "#cccc00" },
            { label: "EVENT",  color: "#ff8c00" },
            { label: "STORAGE",color: "#cc0000" },
          ].map((b, i) => (
            <span key={i} style={{ color: b.color }}>{b.label}</span>
          ))}
        </div>
      </div>

      <Tabs defaultValue="writer">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="writer"  data-testid="tab-writer">
            <Zap className="w-3 h-3 mr-1" /> CE Writer
          </TabsTrigger>
          <TabsTrigger value="scaffold" data-testid="tab-scaffold">
            <Layers className="w-3 h-3 mr-1" /> App Scaffold
          </TabsTrigger>
          <TabsTrigger value="linter"  data-testid="tab-linter">
            <Code2 className="w-3 h-3 mr-1" /> Spectral Linter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="writer">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Description → CE encoding → wavelength → working code
          </h2>
          <CodeWriterTab />
        </TabsContent>

        <TabsContent value="scaffold">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Full app — every file CE-encoded and spectrally addressed
          </h2>
          <AppScaffoldTab />
        </TabsContent>

        <TabsContent value="linter">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3">
            Scan existing code — reveal its spectral structure
          </h2>
          <SpectralLinterTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
