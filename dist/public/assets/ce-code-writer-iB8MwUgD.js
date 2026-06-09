import{j as e,T as he,b as ue,d as O,Z as V,i as I,r as u,h as P,l as $,I as z,B as G}from"./index-rZyRwy6x.js";import{u as ie}from"./useMutation-CG5eJJkW.js";import{B as xe}from"./badge-DfuSAdRg.js";import{T as J}from"./textarea-BpNJfE16.js";import{S as X,a as Z,b as K,c as Q,d as _}from"./select-Dq1xMWaH.js";import{S as pe}from"./spectral-visuals-Cz-P6Wo2.js";import{R as ee}from"./radio-OBirjZYR.js";import{C as fe}from"./code-xml-CsMtTrAi.js";import{P as ge}from"./package-BUBGeSxe.js";import{C as q}from"./check-BkpSilwd.js";import{L as be}from"./layers-mMTa78WM.js";import{P as ve}from"./play-COYLz4Dz.js";import{C as ye}from"./copy-BVYjP6f8.js";import"./utils-km2FGkQ4.js";import"./index-BdQq_4o_.js";import"./index-CqzlZfGO.js";import"./chevron-down-iuhFkVsM.js";import"./chevron-up-CdXddhfY.js";const ce=6626e-37,R=2998e5;function Ne(s){let a=0,t=0,l=0;return s>=380&&s<440?(a=-(s-440)/60,l=1):s>=440&&s<490?(t=(s-440)/50,l=1):s>=490&&s<510?(t=1,l=-(s-510)/20):s>=510&&s<580?(a=(s-510)/70,t=1):s>=580&&s<645?(a=1,t=-(s-645)/65):s>=645&&s<=780&&(a=1),`rgb(${Math.round(a*255)},${Math.round(t*255)},${Math.round(l*255)})`}function N(s){return s<450?{name:"SYSTEM",emoji:"⚙",color:"#8b00ff",desc:"OS / kernel / process management"}:s<490?{name:"AUTH",emoji:"🔐",color:"#0050ff",desc:"Authentication / security / sessions"}:s<520?{name:"STREAM",emoji:"⚡",color:"#00cfcf",desc:"Data streams / WebSocket / realtime"}:s<565?{name:"CORE",emoji:"⚙",color:"#00c800",desc:"Core business logic / algorithms"}:s<590?{name:"UI",emoji:"🎨",color:"#cccc00",desc:"UI components / layout / styling"}:s<625?{name:"EVENT",emoji:"📡",color:"#ff8c00",desc:"Events / webhooks / async signals"}:{name:"STORAGE",emoji:"💾",color:"#cc0000",desc:"Database / file I/O / persistence"}}const Y=Array.from({length:128},(s,a)=>380+a/128*400);function H(s){return Y[s.charCodeAt(0)%128]}function te(s,a,t,l,n){const o=N(t),r=n.replace(/[^a-zA-Z0-9]/g,"_").replace(/^_+|_+$/g,"").replace(/_+/g,"_").toLowerCase()||"nexus_fn",h=`@spectral λ=${t.toFixed(1)}nm Ψ=${l} band=${o.name}`;return a==="typescript"?se(s,t,r,o,h):a==="python"?je(s,t,r,o,h):a==="html"?we(s,t,r,o,h):a==="sql"?Ee(s,t,r,o,h):se(s,t,r,o,h)}function se(s,a,t,l,n){const o=l.name;return o==="SYSTEM"?`// ${n}
// Domain: System / OS / Process Management
// Description: ${s}

import { EventEmitter } from "events";

interface ProcessState {
  pid: string;
  status: "RUNNING" | "DEGRADED" | "RECLAIMED";
  wavelength: number;
  channel: string;
  startedAt: Date;
}

class ${d(t)}Process extends EventEmitter {
  private state: ProcessState;

  constructor(id: string) {
    super();
    this.state = {
      pid: id,
      status: "RUNNING",
      wavelength: ${a.toFixed(1)},
      channel: "${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}",
      startedAt: new Date(),
    };
  }

  getState(): ProcessState { return { ...this.state }; }
  degrade(): void { this.state.status = "DEGRADED"; this.emit("degraded", this.state); }
  reclaim(): void { this.state.status = "RECLAIMED"; this.emit("reclaimed", this.state); }
  isAlive(): boolean { return this.state.status === "RUNNING"; }
}

export { ${d(t)}Process, ProcessState };
`:o==="AUTH"?`// ${n}
// Domain: Authentication & Security
// Description: ${s}

import { createHash, randomBytes } from "crypto";

interface AuthToken { userId: string; token: string; wavelength: number; expiresAt: Date; }
interface AuthResult { success: boolean; token?: AuthToken; error?: string; }

async function ${t}(userId: string, secret: string): Promise<AuthResult> {
  if (!userId || !secret) return { success: false, error: "Missing credentials" };
  const token = randomBytes(32).toString("hex");
  const hash  = createHash("sha256").update(\`\${userId}:\${secret}:\${token}\`).digest("hex");
  return {
    success: true,
    token: { userId, token: hash, wavelength: ${a.toFixed(1)}, expiresAt: new Date(Date.now() + 3600_000) },
  };
}

async function verify${d(t)}(token: string): Promise<boolean> {
  return typeof token === "string" && token.length === 64;
}

export { ${t}, verify${d(t)}, AuthToken, AuthResult };
`:o==="STREAM"?`// ${n}
// Domain: Data Streams / WebSocket / Realtime
// Description: ${s}

interface StreamFrame { id: string; wavelength: number; payload: unknown; timestamp: number; }

class ${d(t)}Stream {
  private handlers: Map<string, (frame: StreamFrame) => void> = new Map();
  private ws: WebSocket | null = null;

  connect(url: string): void {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      const frame: StreamFrame = JSON.parse(event.data);
      this.handlers.get(frame.id)?.(frame);
    };
    this.ws.onopen = () => console.log(\`[${t}] Stream open — λ=${a.toFixed(1)}nm\`);
  }

  on(id: string, handler: (frame: StreamFrame) => void): void { this.handlers.set(id, handler); }

  emit(payload: unknown): void {
    const frame: StreamFrame = { id: crypto.randomUUID(), wavelength: ${a.toFixed(1)}, payload, timestamp: Date.now() };
    this.ws?.send(JSON.stringify(frame));
  }

  close(): void { this.ws?.close(); }
}

export { ${d(t)}Stream, StreamFrame };
`:o==="CORE"?`// ${n}
// Domain: Core Business Logic
// Description: ${s}

interface ${d(t)}Input  { data: unknown; wavelength?: number; }
interface ${d(t)}Output { result: unknown; metadata: { wavelength: number; channel: string; processedAt: Date; }; }

async function ${t}(input: ${d(t)}Input): Promise<${d(t)}Output> {
  const { data } = input;
  if (data === null || data === undefined) throw new Error(\`[${t}] No input at λ=${a.toFixed(1)}nm\`);
  const result = await transform(data);
  return { result, metadata: { wavelength: ${a.toFixed(1)}, channel: "${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}", processedAt: new Date() } };
}

async function transform(data: unknown): Promise<unknown> { return data; }

export { ${t}, ${d(t)}Input, ${d(t)}Output };
`:o==="UI"?`// ${n}
// Domain: UI Component
// Description: ${s}

import React, { useState } from "react";

interface ${d(t)}Props { title?: string; onAction?: (data: unknown) => void; className?: string; }

export function ${d(t)}({ title, onAction, className }: ${d(t)}Props) {
  const [active, setActive] = useState(false);
  const handleClick = () => { setActive(!active); onAction?.({ wavelength: ${a.toFixed(1)}, timestamp: Date.now() }); };
  return (
    <div className={\`nexus-component \${className ?? ""} \${active ? "active" : ""}\`}
      data-wavelength="${a.toFixed(1)}" data-channel="${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}">
      {title && <h2 className="nexus-title">{title}</h2>}
      <button onClick={handleClick} className="nexus-btn" aria-pressed={active}>
        {active ? "Active" : "Activate"}
      </button>
      <style>{\`
        .nexus-component { padding:1rem; border-radius:.5rem; border:1px solid hsl(${Math.round((a-380)/400*360)},50%,30%); }
        .nexus-btn { background:hsl(${Math.round((a-380)/400*360)},70%,50%); color:white; padding:.5rem 1rem; border-radius:.25rem; border:none; cursor:pointer; }
        .nexus-btn:hover { opacity:.85; }
      \`}</style>
    </div>
  );
}
`:o==="EVENT"?`// ${n}
// Domain: Events / Webhooks / Async Signals
// Description: ${s}

type EventPayload = Record<string, unknown>;
type EventHandler = (payload: EventPayload) => void | Promise<void>;

class ${d(t)}EventBus {
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
      Promise.resolve(h({ ...payload, _wavelength: ${a.toFixed(1)}, _channel: "${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}" }))
    ));
  }

  clear(event?: string): void { event ? this.subscribers.delete(event) : this.subscribers.clear(); }
}

const ${t}Bus = new ${d(t)}EventBus();
export { ${t}Bus, ${d(t)}EventBus, EventPayload };
`:`// ${n}
// Domain: Storage / Database / Persistence
// Description: ${s}

interface ${d(t)}Record { id: string; data: unknown; wavelength: number; createdAt: Date; updatedAt: Date; }

interface ${d(t)}Store {
  find(id: string): Promise<${d(t)}Record | null>;
  findAll(filter?: Partial<${d(t)}Record>): Promise<${d(t)}Record[]>;
  save(record: Omit<${d(t)}Record, "id" | "createdAt" | "updatedAt">): Promise<${d(t)}Record>;
  update(id: string, data: Partial<${d(t)}Record>): Promise<${d(t)}Record>;
  delete(id: string): Promise<void>;
}

// In-memory implementation — replace with your DB adapter
class ${d(t)}MemoryStore implements ${d(t)}Store {
  private records = new Map<string, ${d(t)}Record>();

  async find(id: string) {
    return this.records.get(id) ?? null;
  }

  async findAll(filter?: Partial<${d(t)}Record>) {
    const all = Array.from(this.records.values());
    if (!filter) return all;
    return all.filter(r =>
      Object.entries(filter).every(([k, v]) => (r as Record<string, unknown>)[k] === v)
    );
  }

  async save(data: Omit<${d(t)}Record, "id" | "createdAt" | "updatedAt">) {
    const record: ${d(t)}Record = {
      ...data,
      id: crypto.randomUUID(),
      wavelength: ${a.toFixed(1)},  // ${n}
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.records.set(record.id, record);
    return record;
  }

  async update(id: string, data: Partial<${d(t)}Record>) {
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

export { ${d(t)}MemoryStore, ${d(t)}Record, ${d(t)}Store };
`}function je(s,a,t,l,n){const o=l.name,r=d(t);return o==="AUTH"?`# ${n}
# Domain: Authentication & Security
# Description: ${s}

import hashlib, secrets
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class AuthToken:
    user_id: str
    token: str
    wavelength: float = ${a.toFixed(1)}
    expires_at: datetime = None

    def __post_init__(self):
        if self.expires_at is None:
            self.expires_at = datetime.utcnow() + timedelta(hours=1)

    def is_valid(self) -> bool:
        return datetime.utcnow() < self.expires_at


def ${t}(user_id: str, secret: str) -> AuthToken:
    """${s}
    Spectral address: λ=${a.toFixed(1)}nm  ${n}
    """
    if not user_id or not secret:
        raise ValueError("Missing credentials")
    salt  = secrets.token_hex(16)
    token = hashlib.sha256(f"{user_id}:{secret}:{salt}".encode()).hexdigest()
    return AuthToken(user_id=user_id, token=token)


def verify_${t}(token: str) -> bool:
    return isinstance(token, str) and len(token) == 64
`:o==="STREAM"?`# ${n}
# Domain: Data Streams / Realtime
# Description: ${s}

import asyncio, json
from dataclasses import dataclass, field
from typing import Callable, Any

@dataclass
class StreamFrame:
    payload: Any
    wavelength: float = ${a.toFixed(1)}
    channel: str = "${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}"
    timestamp: float = field(default_factory=lambda: asyncio.get_event_loop().time())


class ${r}Stream:
    """${s}
    Spectral address: λ=${a.toFixed(1)}nm  ${n}
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
`:o==="UI"?`# ${n}
# Domain: UI / Template Rendering
# Description: ${s}

from dataclasses import dataclass
from typing import Optional

@dataclass
class ${r}Component:
    """${s}
    Spectral address: λ=${a.toFixed(1)}nm  ${n}
    Band: UI / Yellow (565-589nm)
    """
    title: str
    content: str = ""
    active: bool = False
    wavelength: float = ${a.toFixed(1)}

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
            "channel": "${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}",
        }
`:o==="STORAGE"?`# ${n}
# Domain: Storage / Database
# Description: ${s}

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid

@dataclass
class ${r}Record:
    data: dict
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    wavelength: float = ${a.toFixed(1)}
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


class ${r}Store:
    """${s}
    Spectral address: λ=${a.toFixed(1)}nm  ${n}
    """
    def __init__(self):
        self._records: dict[str, ${r}Record] = {}

    def save(self, data: dict) -> ${r}Record:
        record = ${r}Record(data=data)
        self._records[record.id] = record
        return record

    def find(self, record_id: str) -> Optional[${r}Record]:
        return self._records.get(record_id)

    def find_all(self) -> list[${r}Record]:
        return list(self._records.values())

    def delete(self, record_id: str) -> bool:
        return bool(self._records.pop(record_id, None))
`:`# ${n}
# Domain: ${l.name} — ${l.desc}
# Description: ${s}

from dataclasses import dataclass
from typing import Any, Optional

@dataclass
class ${r}Result:
    success: bool
    data: Any = None
    error: Optional[str] = None
    wavelength: float = ${a.toFixed(1)}  # ${n}


def ${t}(input_data: Any) -> ${r}Result:
    """${s}
    Spectral address: λ=${a.toFixed(1)}nm
    Channel: ${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}
    Band: ${l.name}
    """
    try:
        if input_data is None:
            return ${r}Result(success=False, error="No input provided")
        return ${r}Result(success=True, data=input_data)
    except Exception as e:
        return ${r}Result(success=False, error=str(e))
`}function we(s,a,t,l,n){const o=Math.round((a-380)/400*300);return`<!-- ${n} -->
<!-- Domain: ${l.name} — ${l.desc} -->
<!-- Description: ${s} -->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <style>
    :root {
      --spectral-wavelength: ${a.toFixed(1)};
      --primary:   hsl(${o}, 70%, 50%);
      --primary-d: hsl(${o}, 70%, 35%);
      --bg:        hsl(${o}, 20%, 5%);
      --surface:   hsl(${o}, 15%, 10%);
      --text:      hsl(${o}, 10%, 90%);
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
                         left: ${((a-380)/400*100).toFixed(1)}%; transform: translateX(-50%); }
    h1 { font-size: 1.5rem; margin-bottom: .5rem; }
    p  { color: color-mix(in srgb, var(--text) 70%, transparent); margin-bottom: 1rem; }
    .nexus-btn { background: var(--primary); color: white; border: none; border-radius: .5rem;
                 padding: .75rem 1.5rem; cursor: pointer; font-size: 1rem; transition: background .2s; }
    .nexus-btn:hover { background: var(--primary-d); }
  </style>
</head>
<body>
  <div class="nexus-card" data-wavelength="${a.toFixed(1)}">
    <div class="spectral-badge">
      <div class="spectral-dot"></div>
      λ = ${a.toFixed(1)} nm · ${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"} · ${l.name}
    </div>
    <div class="wavelength-bar"><div class="wavelength-marker" title="${a.toFixed(1)} nm"></div></div>
    <h1>${t.replace(/_/g," ")}</h1>
    <p>${s}</p>
    <button class="nexus-btn" onclick="handleAction()">${l.emoji} Execute</button>
    <div id="output" style="margin-top:1rem;font-family:monospace;font-size:.85rem;color:var(--primary);"></div>
  </div>
  <script>
    const WAVELENGTH = ${a.toFixed(1)};
    const CHANNEL    = "${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}";
    function handleAction() {
      document.getElementById("output").textContent = \`[λ=\${WAVELENGTH}nm] Action on channel \${CHANNEL}\`;
    }
  <\/script>
</body>
</html>
`}function Ee(s,a,t,l,n){return`-- ${n}
-- Domain: ${l.name} — ${l.desc}
-- Description: ${s}

CREATE TABLE IF NOT EXISTS ${t} (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data          JSONB NOT NULL DEFAULT '{}',
  wavelength_nm NUMERIC(8,2) NOT NULL DEFAULT ${a.toFixed(1)},
  psi_channel   TEXT NOT NULL DEFAULT '${n.split("Ψ=")[1]?.split(" ")[0]??"Ψ(0,0,H)"}',
  band          TEXT NOT NULL DEFAULT '${l.name}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_${t}_wavelength ON ${t} (wavelength_nm);
CREATE INDEX idx_${t}_band       ON ${t} (band);
CREATE INDEX idx_${t}_data       ON ${t} USING GIN (data);

CREATE OR REPLACE FUNCTION update_${t}_ts()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER ${t}_updated_at
  BEFORE UPDATE ON ${t}
  FOR EACH ROW EXECUTE FUNCTION update_${t}_ts();

-- SELECT * FROM ${t} WHERE band = '${l.name}';
-- SELECT * FROM ${t} WHERE wavelength_nm BETWEEN ${(a-5).toFixed(1)} AND ${(a+5).toFixed(1)};
`}function d(s){return s.split("_").map(a=>a.charAt(0).toUpperCase()+a.slice(1)).join("")}function D({text:s,label:a="Copy"}){const[t,l]=u.useState(!1),n=async()=>{await navigator.clipboard.writeText(s),l(!0),setTimeout(()=>l(!1),1800)};return e.jsxs("button",{onClick:n,className:"flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors","data-testid":"btn-copy",children:[t?e.jsx(q,{className:"w-3 h-3 text-green-400"}):e.jsx(ye,{className:"w-3 h-3"}),t?"Copied!":a]})}function ae({data:s,lang:a}){const t=N(s.wavelength_mid_nm??550);return e.jsxs("div",{className:"flex items-center gap-2 px-3 py-2 rounded-t-lg border-b border-slate-700 bg-slate-800",style:{borderTopColor:`${t.color}60`},children:[e.jsx("div",{className:"w-3 h-3 rounded-full",style:{background:t.color}}),e.jsx("span",{className:"text-xs font-mono",style:{color:t.color},children:t.name}),e.jsxs("span",{className:"text-xs font-mono text-slate-500",children:["λ = ",s.wavelength_mid_nm?.toFixed(1)," nm"]}),e.jsx("span",{className:"text-xs font-mono text-slate-500",children:s.psi_channel}),e.jsxs("span",{className:"text-xs font-mono text-slate-600",children:[s.energy_joules?.toExponential(2)," J"]}),e.jsx("span",{className:"ml-auto text-xs font-mono text-slate-500",children:a})]})}function $e(){const[s,a]=u.useState("Hello, universe. Every symbol is light."),[t,l]=u.useState(null),[n,o]=u.useState("idle"),r=u.useRef(null),h=ie({mutationFn:m=>P("POST","/api/nexus/dev/encode",{instruction:m,label:"live_encode"}).then(j=>j.json()),onSuccess:l}),w=async()=>{if(s.trim()){o("saving");try{if(!(await P("POST","/api/spectral-db/store",{content:s.slice(0,500),label:"ce_fingerprint",data:{source:"live_encode"}})).ok)throw new Error("store failed");o("saved"),setTimeout(()=>o("idle"),3e3)}catch{o("error"),setTimeout(()=>o("idle"),3e3)}}};u.useEffect(()=>{if(!s.trim()){l(null);return}return r.current&&clearTimeout(r.current),r.current=setTimeout(()=>{h.mutate(s.slice(0,500))},300),()=>{r.current&&clearTimeout(r.current)}},[s]);const g=Array.from(s).slice(0,200),E=g.length?g.reduce((m,j)=>m+H(j),0)/g.length:550,i=t?.energy_joules,f=t?.psi_channel,p=t?.wavelength_mid_nm,y=h.isPending,x=p??E,b=N(x),S=i!=null?i/(R*R):ce*(R/(E*1e-9))/(R*R),M={text:s.slice(0,200),char_map:g.map(m=>({char:m,λ:+H(m).toFixed(2)})),dominant_λ:+(p??E).toFixed(2),psi:f??null,band:b.name,energy_J:i??null};return e.jsxs("div",{className:"space-y-5",children:[e.jsx("p",{className:"text-slate-400 text-sm",children:"Type anything. Every character is deterministically mapped to a wavelength in the visible spectrum — the CE encoding. This runs on any silicon chip with no server required."}),e.jsxs("div",{className:"space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx($,{className:"text-xs text-slate-400",children:"Your text"}),e.jsxs("span",{className:"text-xs font-mono text-slate-600",children:[s.length,"/200 chars shown"]})]}),e.jsx(J,{value:s,onChange:m=>a(m.target.value),className:"bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm min-h-16",placeholder:"Type anything — a name, a sentence, a concept...","data-testid":"input-live-text"})]}),g.length>0&&e.jsxs("div",{className:"space-y-2",children:[e.jsx($,{className:"text-xs text-slate-400",children:"Character → wavelength map"}),e.jsx("div",{className:"flex flex-wrap gap-1 p-3 rounded-lg bg-slate-900/60 border border-slate-800 max-h-36 overflow-y-auto",children:g.map((m,j)=>{const T=H(m),F=Ne(T);return e.jsx("div",{title:`'${m===" "?"space":m}' → λ=${T.toFixed(1)}nm`,className:"inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold cursor-default select-none transition-transform hover:scale-110",style:{background:F,color:T>500&&T<620?"#000":"#fff",opacity:.92},"data-testid":`char-chip-${j}`,children:m===" "?"·":m===`
`?"↵":m},j)})}),e.jsx("p",{className:"text-xs text-slate-600",children:"Each chip = one character. Color = its wavelength in the visible spectrum."})]}),s.trim()&&e.jsx(pe,{text:s.slice(0,120),label:b.name}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-5 gap-3",children:[{label:"Dominant λ",value:`${x.toFixed(1)} nm`,color:b.color,client:!0},{label:"Band",value:`${b.emoji} ${b.name}`,color:b.color,client:!0},{label:"Ψ channel",value:f??(y?"…":"—"),color:"#94a3b8",client:!1},{label:"E = hf",value:i!=null?`${i.toExponential(2)} J`:y?"…":"—",color:"#94a3b8",client:!1},{label:"Λ = hf/c²",value:i!=null?`${S.toExponential(2)} kg`:y?"…":"—",color:"#94a3b8",client:!1}].map((m,j)=>e.jsxs("div",{className:"p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1",children:[e.jsx("p",{className:"text-xs text-slate-500 font-mono",children:m.label}),e.jsx("p",{className:`text-sm font-mono font-semibold ${y&&!m.client?"animate-pulse":""}`,style:{color:m.color},children:m.value})]},j))}),e.jsxs("div",{className:"space-y-1",children:[e.jsx($,{className:"text-xs text-slate-400",children:"Position in the visible spectrum"}),e.jsx("div",{className:"relative h-5 w-full rounded",style:{background:"linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)"},children:e.jsx("div",{className:"absolute top-0 h-5 w-1 rounded-sm bg-white shadow-lg",style:{left:`${Math.min(99,Math.max(0,(x-380)/400*100)).toFixed(1)}%`,transform:"translateX(-50%)"},title:`λ=${x.toFixed(1)}nm`})}),e.jsxs("div",{className:"flex justify-between text-xs font-mono text-slate-700",children:[e.jsx("span",{children:"380nm"}),e.jsx("span",{children:"780nm"})]})]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2 pt-1",children:[e.jsx("p",{className:"text-xs text-slate-600",children:"CE fingerprint is deterministic — same text always produces same wavelength."}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(D,{text:JSON.stringify(M,null,2),label:"Copy JSON Fingerprint"}),e.jsx("button",{onClick:w,disabled:!s.trim()||n==="saving",className:`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors
              ${n==="saved"?"bg-green-900/60 border border-green-700 text-green-300":n==="error"?"bg-red-900/60 border border-red-700 text-red-300":n==="saving"?"bg-slate-700 border border-slate-600 text-slate-400 animate-pulse":"bg-cyan-900/30 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/60"}`,"data-testid":"btn-save-fingerprint",children:n==="saved"?e.jsxs(e.Fragment,{children:[e.jsx(q,{className:"w-3 h-3"})," Saved to Spectral DB"]}):n==="error"?"Save failed — retry":n==="saving"?"Saving…":e.jsxs(e.Fragment,{children:[e.jsx(be,{className:"w-3 h-3"})," Save to Spectral DB"]})})]})]}),n==="saved"&&e.jsxs("p",{className:"text-xs text-green-600 font-mono",children:["Fingerprint stored. View in"," ",e.jsx("a",{href:"/spectral-db",className:"underline hover:text-green-400",children:"Spectral DB →"})]})]})}const Se=[{label:"Auth middleware",desc:"function authenticate(user, password) validates credentials and returns a JWT token",lang:"typescript"},{label:"WebSocket handler",desc:"real-time data stream handler that broadcasts sensor readings to connected clients",lang:"typescript"},{label:"User store",desc:"database store for user records with find, save, update and delete operations",lang:"python"},{label:"API endpoint",desc:"REST API endpoint that handles POST requests and validates the request body",lang:"python"},{label:"Hero section",desc:"responsive hero section with gradient background and call-to-action button",lang:"html"},{label:"Events table",desc:"PostgreSQL table for kernel events with wavelength and channel metadata",lang:"sql"},{label:"Process manager",desc:"OS process manager that tracks running processes and reclaims dead ones",lang:"typescript"},{label:"Event bus",desc:"publish-subscribe event bus with typed handlers and async emission",lang:"typescript"}],ne=[{name:"REST API",stack:"typescript",components:[{label:"auth_middleware",desc:"authenticate JWT token from request headers and validate user session"},{label:"user_controller",desc:"REST controller handling GET POST PUT DELETE requests for user resources"},{label:"user_store",desc:"database persistence layer for user records with CRUD operations"},{label:"event_logger",desc:"async event logger that records all API calls with timestamps"},{label:"error_handler",desc:"global error handling middleware that formats error responses"}]},{name:"React App",stack:"typescript",components:[{label:"App",desc:"root React application component with router and global providers"},{label:"Header",desc:"responsive navigation header with logo, links and user avatar"},{label:"use_auth",desc:"authentication React hook managing login state and token refresh"},{label:"api_client",desc:"typed API client for making authenticated HTTP requests"},{label:"data_store",desc:"client-side state store for caching and syncing server data"}]},{name:"Data Pipeline",stack:"python",components:[{label:"ingest",desc:"data ingestion function that reads from stream and validates schema"},{label:"transform",desc:"transformation pipeline that normalises and enriches raw data"},{label:"store",desc:"persistence layer that writes processed records to database"},{label:"event_emitter",desc:"event system that broadcasts pipeline stage completion signals"}]}];function _e(){const[s,a]=u.useState("single"),[t,l]=u.useState("function authenticate(user, password) validates credentials and returns a JWT token"),[n,o]=u.useState("authenticate"),[r,h]=u.useState("typescript"),[w,g]=u.useState(null),[E,i]=u.useState(""),f=ie({mutationFn:()=>P("POST","/api/nexus/dev/encode",{instruction:t,label:n}).then(c=>c.json()),onSuccess:c=>{g(c),i(te(t,r,c.wavelength_mid_nm,c.psi_channel,n))}}),[p,y]=u.useState("MyNexusApp"),[x,b]=u.useState("typescript"),[S,M]=u.useState(ne[0].components),[m,j]=u.useState({}),[T,F]=u.useState(!1),[L,B]=u.useState(""),de=async()=>{F(!0),j({});const c={};for(const v of S)try{const U=await(await P("POST","/api/nexus/dev/encode",{instruction:v.desc,label:v.label})).json();c[v.label]={code:te(v.desc,x,U.wavelength_mid_nm,U.psi_channel,v.label),encoded:U}}catch{}j(c),B(Object.keys(c)[0]??""),F(!1)},A=m[L],C=w?N(w.wavelength_mid_nm):null,me=A?N(A.encoded.wavelength_mid_nm):null;return e.jsxs("div",{className:"space-y-4",children:[e.jsx("p",{className:"text-slate-400 text-sm",children:"Your description is CE-encoded and the result determines the code domain — auth, storage, UI, events. Every file you generate carries a physical address in the universe."}),e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{onClick:()=>a("single"),className:`px-3 py-1.5 text-xs rounded font-mono border transition-colors ${s==="single"?"bg-cyan-900/40 border-cyan-500 text-cyan-300":"border-slate-700 text-slate-500 hover:text-slate-300"}`,"data-testid":"btn-mode-single",children:"Single component"}),e.jsx("button",{onClick:()=>a("app"),className:`px-3 py-1.5 text-xs rounded font-mono border transition-colors ${s==="app"?"bg-green-900/40 border-green-500 text-green-300":"border-slate-700 text-slate-500 hover:text-slate-300"}`,"data-testid":"btn-mode-app",children:"Full app"})]}),s==="single"&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3",children:[e.jsxs("div",{className:"md:col-span-2 space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx($,{className:"text-xs text-slate-400",children:"Description (plain language)"}),e.jsxs("span",{className:`text-xs font-mono ${t.length>450?"text-amber-400":"text-slate-600"}`,children:[t.length,"/500"]})]}),e.jsx(J,{value:t,onChange:c=>l(c.target.value.slice(0,500)),className:"bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm min-h-20",placeholder:"e.g. authenticate user and return a JWT token","data-testid":"input-desc"}),t.length>=500&&e.jsx("p",{className:"text-xs text-amber-400",children:"500 char limit. For large documents use Spectral DB → Write → File upload."})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx($,{className:"text-xs text-slate-400",children:"Label / Name"}),e.jsx(z,{value:n,onChange:c=>o(c.target.value),className:"bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm","data-testid":"input-label"}),e.jsx($,{className:"text-xs text-slate-400",children:"Language"}),e.jsxs(X,{value:r,onValueChange:h,children:[e.jsx(Z,{className:"bg-slate-800 border-slate-600 text-slate-200","data-testid":"select-lang",children:e.jsx(K,{})}),e.jsxs(Q,{children:[e.jsx(_,{value:"typescript",children:"TypeScript"}),e.jsx(_,{value:"python",children:"Python"}),e.jsx(_,{value:"html",children:"HTML / CSS"}),e.jsx(_,{value:"sql",children:"SQL"})]})]}),e.jsxs(G,{className:"w-full",onClick:()=>f.mutate(),disabled:f.isPending||!t,"data-testid":"btn-write",children:[e.jsx(V,{className:"w-3 h-3 mr-1"}),f.isPending?"Encoding…":"CE → Write Code"]})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-slate-500 mb-2",children:"Examples:"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:Se.map((c,v)=>e.jsx("button",{onClick:()=>{l(c.desc),o(c.label.replace(/\s+/g,"_").toLowerCase()),h(c.lang),g(null),i("")},className:"px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono","data-testid":`example-btn-${v}`,children:c.label},v))})]}),w&&C&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex flex-wrap gap-2 items-center",children:[e.jsx("div",{className:"w-4 h-4 rounded-full",style:{background:C.color}}),e.jsxs("span",{className:"font-mono text-sm",style:{color:C.color},children:[C.emoji," ",C.name," — ",C.desc]}),e.jsx(xe,{className:"text-xs bg-slate-700 text-slate-300",children:w.psi_channel}),e.jsxs("span",{className:"text-xs font-mono text-slate-500",children:["λ = ",w.wavelength_mid_nm?.toFixed(1)," nm"]})]}),E&&e.jsxs("div",{className:"rounded-lg overflow-hidden border border-slate-700",children:[e.jsx(ae,{data:w,lang:r}),e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-[500px]",children:E}),e.jsx("div",{className:"absolute top-2 right-2",children:e.jsx(D,{text:E})})]})]})]})]}),s==="app"&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("p",{className:"text-slate-400 text-xs",children:"Every component is CE-encoded individually. The full codebase emerges with physical wavelength provenance on every file."}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsx("span",{className:"text-xs text-slate-500 self-center",children:"Presets:"}),ne.map((c,v)=>e.jsx("button",{onClick:()=>{M(c.components),b(c.stack),j({}),B("")},className:"px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono","data-testid":`preset-${v}`,children:c.name},v))]}),e.jsxs("div",{className:"flex gap-3 items-center",children:[e.jsxs("div",{className:"flex-1",children:[e.jsx($,{className:"text-xs text-slate-400",children:"App Name"}),e.jsx(z,{value:p,onChange:c=>y(c.target.value),className:"bg-slate-800 border-slate-600 text-slate-200 font-mono","data-testid":"input-app-name"})]}),e.jsxs("div",{className:"w-36",children:[e.jsx($,{className:"text-xs text-slate-400",children:"Language"}),e.jsxs(X,{value:x,onValueChange:b,children:[e.jsx(Z,{className:"bg-slate-800 border-slate-600 text-slate-200","data-testid":"select-app-lang",children:e.jsx(K,{})}),e.jsxs(Q,{children:[e.jsx(_,{value:"typescript",children:"TypeScript"}),e.jsx(_,{value:"python",children:"Python"}),e.jsx(_,{value:"html",children:"HTML"}),e.jsx(_,{value:"sql",children:"SQL"})]})]})]}),e.jsxs(G,{className:"mt-5",onClick:de,disabled:T,"data-testid":"btn-build-app",children:[e.jsx(ve,{className:"w-3 h-3 mr-1"}),T?"Generating…":"Generate App"]})]}),e.jsx("div",{className:"space-y-1",children:S.map((c,v)=>e.jsxs("div",{className:"flex gap-2 items-center text-xs font-mono text-slate-400 p-2 bg-slate-900/40 rounded border border-slate-800",children:[m[c.label]?e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0",style:{background:N(m[c.label].encoded.wavelength_mid_nm).color}}):e.jsx("div",{className:"w-2 h-2 rounded-full bg-slate-700 flex-shrink-0"}),e.jsx("span",{className:"text-slate-200 w-36 flex-shrink-0",children:c.label}),e.jsx("span",{className:"text-slate-500 truncate",children:c.desc}),m[c.label]&&e.jsxs("span",{className:"ml-auto text-slate-600",children:["λ=",m[c.label].encoded.wavelength_mid_nm?.toFixed(0),"nm"]})]},v))}),Object.keys(m).length>0&&e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-4 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsxs("p",{className:"text-xs font-mono text-slate-500 mb-2",children:[p,"/"]}),Object.entries(m).map(([c,v])=>{const k=N(v.encoded.wavelength_mid_nm);return e.jsxs("button",{onClick:()=>B(c),className:"w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono",style:{background:L===c?`${k.color}20`:"transparent",color:L===c?k.color:"#94a3b8",border:`1px solid ${L===c?`${k.color}40`:"transparent"}`},"data-testid":`file-${c}`,children:[e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0",style:{background:k.color}}),c,".",x==="typescript"?"ts":x==="python"?"py":x==="html"?"html":"sql"]},c)})]}),e.jsx("div",{className:"md:col-span-3",children:A&&me&&e.jsxs("div",{className:"rounded-lg overflow-hidden border border-slate-700",children:[e.jsx(ae,{data:A.encoded,lang:x}),e.jsxs("div",{className:"relative",children:[e.jsx("pre",{className:"p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-96",children:A.code}),e.jsx("div",{className:"absolute top-2 right-2",children:e.jsx(D,{text:A.code})})]})]})})]})]})]})}const Te=`// CE Encoder — WNSP Character Encoding v1.0
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
`,Ae=`# CE Encoder — WNSP Character Encoding v1.0
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
`,Ce=`// CE Encoder — WNSP Character Encoding v1.0
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
`;function Re(s){const a=Array.from(s).map(r=>Y[r.charCodeAt(0)%128]),t=+(a.reduce((r,h)=>r+h,0)/a.length).toFixed(2),l=Math.floor((t-380)/4)+1,n=Array.from(s).reduce((r,h)=>r+h.charCodeAt(0),0)%50,o=s.length%2===0?"H":"V";return{wavelength:t,band:N(t).name,psiChannel:`Ψ(${l},${n},${o})`,energy:+(ce*(R/(t*1e-9)))}}const W="hello",ke=Re(W);function Pe(){const[s,a]=u.useState("nodejs"),[t,l]=u.useState(!1),o={nodejs:Te,python:Ae,browser:Ce}[s];return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("p",{className:"text-slate-400 text-sm",children:["Self-contained CE encoder for your own project. Zero NexusOS dependency. Drop it in, call ",e.jsx("code",{className:"text-cyan-400 bg-slate-800 px-1 rounded",children:"ceEncode(text)"})," and you are encoding human symbols into the electromagnetic spectrum on silicon today."]}),e.jsxs("div",{className:"p-3 rounded-lg border border-slate-700 bg-slate-900/60 space-y-2",children:[e.jsx("p",{className:"text-xs font-mono text-slate-400 font-semibold",children:"Install"}),e.jsx("div",{className:"space-y-1.5",children:[{label:"npm",cmd:"npm install nexusos-ce-encoder"},{label:"pip",cmd:"pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py"}].map(({label:r,cmd:h})=>e.jsxs("div",{className:"flex items-center justify-between rounded bg-slate-800 px-3 py-1.5 border border-slate-700",children:[e.jsx("span",{className:"text-xs font-mono text-slate-300",children:h}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-xs font-mono text-slate-600",children:r}),e.jsx(D,{text:h})]})]},r))}),e.jsx("p",{className:"text-xs text-slate-500 mt-1",children:"npm: published on npmjs.com — no extra config needed. Python: installs directly from GitHub — no registry account required."}),e.jsx("p",{className:"text-xs text-slate-600",children:"Or copy the snippet below — zero dependencies, drop anywhere."})]}),e.jsxs("div",{className:"p-3 rounded-lg border border-cyan-900/50 bg-cyan-950/20 text-xs text-cyan-300 font-mono space-y-1",children:[e.jsx("p",{className:"font-semibold",children:"Runs on any silicon chip today. No NexusOS server required."}),e.jsx("p",{className:"text-cyan-600",children:"Licensed AGPL-3.0 — free civilization infrastructure."}),e.jsx("p",{className:"text-cyan-600",children:"Algorithm: CE_TABLE[charCode % 128] → 380–780 nm → E=hf → Λ=hf/c²"})]}),e.jsxs("div",{className:"rounded-lg border border-green-900/50 bg-green-950/20 p-3 space-y-2",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(q,{className:"w-3.5 h-3.5 text-green-400"}),e.jsx("span",{className:"text-xs font-mono text-green-300 font-semibold",children:"JS === Python — bit-identical output verified"})]}),e.jsx("button",{onClick:()=>l(r=>!r),className:"text-xs text-slate-500 hover:text-slate-300 font-mono","data-testid":"btn-toggle-verify",children:t?"hide":"show test vector"})]}),t&&e.jsxs("div",{className:"space-y-1.5",children:[e.jsxs("p",{className:"text-xs font-mono text-slate-500",children:["Input: ",e.jsxs("span",{className:"text-slate-300",children:['"',W,'"']})]}),e.jsx("pre",{className:"text-xs font-mono text-green-300 bg-slate-900 rounded p-3 overflow-x-auto",children:`ceEncode("${W}") ===
${JSON.stringify(ke,null,2)}`}),e.jsx("p",{className:"text-xs text-slate-600",children:"Both Node.js and Python use CE_TABLE[charCode % 128] with identical rounding (2 decimal places). psiChannel uses same Ψ(wdm,oam,pol) derivation."})]})]}),e.jsx("div",{className:"flex gap-2",children:["nodejs","python","browser"].map(r=>e.jsx("button",{onClick:()=>a(r),className:`px-3 py-1.5 text-xs rounded font-mono border transition-colors ${s===r?"bg-slate-700 border-slate-500 text-slate-100":"border-slate-800 text-slate-500 hover:text-slate-300"}`,"data-testid":`kit-lang-${r}`,children:r==="nodejs"?"Node.js":r==="python"?"Python":"Browser JS"},r))}),e.jsxs("div",{className:"rounded-lg overflow-hidden border border-slate-700",children:[e.jsxs("div",{className:"flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700",children:[e.jsxs("span",{className:"text-xs font-mono text-slate-400",children:["ce-encoder.",s==="python"?"py":"js"]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-xs font-mono text-slate-600",children:"AGPL-3.0"}),e.jsx(D,{text:o,label:"Copy file"})]})]}),e.jsx("pre",{className:"p-4 text-xs font-mono text-slate-300 overflow-x-auto bg-slate-900 max-h-[480px]",children:o})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("p",{className:"text-xs font-mono text-slate-500",children:"CE spectral bands (same across all implementations)"}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-2",children:[{name:"SYSTEM",range:"380–450 nm",color:"#8b00ff"},{name:"AUTH",range:"450–490 nm",color:"#0050ff"},{name:"STREAM",range:"490–520 nm",color:"#00cfcf"},{name:"CORE",range:"520–565 nm",color:"#00c800"},{name:"UI",range:"565–590 nm",color:"#cccc00"},{name:"EVENT",range:"590–625 nm",color:"#ff8c00"},{name:"STORAGE",range:"625–780 nm",color:"#cc0000"}].map(r=>e.jsxs("div",{className:"flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800",children:[e.jsx("div",{className:"w-2.5 h-2.5 rounded-full flex-shrink-0",style:{background:r.color}}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs font-mono font-semibold",style:{color:r.color},children:r.name}),e.jsx("p",{className:"text-xs font-mono text-slate-600",children:r.range})]})]},r.name))})]})]})}const De=662607015e-42,Fe=299792458,Le=1602176634e-28;function Oe(s){return(De*Fe/(s*1e-9)/Le).toFixed(3)}function re(s){return Math.min(255,Math.max(0,Math.floor((s-380)/3.125)))}function oe(s){return[...s].reduce((a,t)=>a+t.charCodeAt(0),0)%50}function Ie(s){const a=[...s].map(t=>Y[t.charCodeAt(0)%128]);return a.reduce((t,l)=>t+l,0)/a.length}function le(s,a){const t=[],l=n=>{n&&!t.includes(n)&&t.push(n)};if(a==="auto"||a==="js"){const n=/(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/g;let o;for(;(o=n.exec(s))!==null;)l(o[1]||o[2]);const r=/^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/gm;for(;(o=r.exec(s))!==null;){const h=o[1];h&&!["if","for","while","switch","catch","constructor"].includes(h)&&l(h)}}if(a==="auto"||a==="python"){const n=/def\s+([a-zA-Z_]\w*)\s*\(/g;let o;for(;(o=n.exec(s))!==null;)l(o[1])}if(a==="auto"||a==="rust"){const n=/fn\s+([a-zA-Z_]\w*)\s*[(<]/g;let o;for(;(o=n.exec(s))!==null;)l(o[1])}return t}const Me={auto:"Auto-detect",js:"JS / TS",python:"Python",rust:"Rust"};function Be(){const[s,a]=u.useState(`function authenticate(user, password) {
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
}`),[t,l]=u.useState("auto"),[n,o]=u.useState([]),[r,h]=u.useState(!1),w=async()=>{h(!0),o([]);const i=le(s,t),f=[];for(const p of i.slice(0,16)){const y=s.split(`
`).find(x=>x.includes(p))??p;try{const b=await(await P("POST","/api/nexus/dev/encode",{instruction:y.trim(),label:p})).json();f.push({fn:p,...b})}catch{const x=Ie(p),b=re(x),S=oe(p);f.push({fn:p,wavelength_mid_nm:parseFloat(x.toFixed(2)),psiChannel:`Ψ(${b},${S},H)`,offline:!0})}}o(f),h(!1)},g=(()=>{if(n.length<2)return null;const i={};for(const x of n){const b=N(x.wavelength_mid_nm).name;i[b]=(i[b]??0)+1}const f=Math.max(...Object.values(i)),p=Math.round(f/n.length*100),y=Object.entries(i).find(([,x])=>x===f)?.[0]??"";return{pct:p,domBand:y,max:f,total:n.length}})(),E=le(s,t).length;return e.jsxs("div",{className:"space-y-4",children:[e.jsx("p",{className:"text-slate-400 text-sm",children:"Paste any code. The linter CE-encodes every function name against the canonical 128-band table and reveals whether your codebase has coherent spectral structure or scattered, conflicting addresses."}),e.jsxs("div",{className:"flex gap-2 flex-wrap",children:[["auto","js","python","rust"].map(i=>e.jsx("button",{onClick:()=>l(i),className:`px-3 py-1 rounded text-xs font-mono border transition-all ${t===i?"bg-indigo-700 border-indigo-500 text-white":"bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`,children:Me[i]},i)),s.trim()&&e.jsxs("span",{className:"text-xs text-slate-500 self-center ml-1 font-mono",children:[E," function",E!==1?"s":""," detected"]})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx($,{className:"text-xs text-slate-400",children:"Source code"}),e.jsx(J,{value:s,onChange:i=>a(i.target.value),className:"bg-slate-800 border-slate-600 text-slate-200 font-mono text-xs min-h-56","data-testid":"input-source"}),e.jsxs(G,{className:"mt-2 w-full",onClick:w,disabled:r,"data-testid":"btn-lint",children:[e.jsx(V,{className:"w-3 h-3 mr-1"}),r?"Scanning…":"Spectral Lint"]})]}),e.jsx("div",{children:n.length>0&&e.jsxs("div",{className:"space-y-2",children:[g&&(()=>{const i=N(n.find(f=>N(f.wavelength_mid_nm).name===g.domBand)?.wavelength_mid_nm??550);return e.jsxs("div",{className:"p-3 rounded border border-slate-700 bg-slate-900/60 space-y-1",children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-xs text-slate-400 uppercase tracking-wider font-semibold",children:"Spectral Coherence"}),e.jsxs("span",{className:`text-lg font-mono font-bold ${g.pct>=75?"text-green-400":g.pct>=50?"text-amber-400":"text-rose-400"}`,children:[g.pct,"%"]})]}),e.jsxs("p",{className:"text-[10px] text-slate-500",children:[g.max," of ",g.total," functions cluster in"," ",e.jsx("span",{className:"font-semibold",style:{color:i.color},children:g.domBand})," ","— ",g.pct>=75?"tight spectral coherence. Architecture is optically unified.":g.pct>=50?"moderate coherence. Some spectral scatter detected.":"high scatter. Functions span conflicting spectral domains."]})]})})(),e.jsxs("div",{children:[e.jsx($,{className:"text-xs text-slate-400",children:"Spectral map — 380–780 nm"}),e.jsx("div",{className:"h-7 w-full rounded relative mt-1",style:{background:"linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)"},children:n.map((i,f)=>{const p=(i.wavelength_mid_nm-380)/400*100,y=N(i.wavelength_mid_nm);return e.jsx("div",{className:"absolute top-0 h-7 flex flex-col items-center",style:{left:`${Math.min(98,p)}%`},title:`${i.fn}: ${i.wavelength_mid_nm?.toFixed(1)}nm · ${y.name}`,children:e.jsx("div",{className:"w-0.5 h-full bg-white/90"})},f)})}),e.jsx("div",{className:"flex justify-between text-[9px] font-mono text-slate-600 mt-0.5",children:["SYSTEM","AUTH","STREAM","CORE","UI","EVENT","STORAGE"].map(i=>e.jsx("span",{children:i},i))})]}),e.jsx("div",{className:"space-y-1 max-h-64 overflow-y-auto pr-1",children:n.map((i,f)=>{const p=N(i.wavelength_mid_nm),y=re(i.wavelength_mid_nm),x=oe(i.fn),b=i.psiChannel??`Ψ(${y},${x},H)`,S=Oe(i.wavelength_mid_nm);return e.jsxs("div",{className:"p-2 rounded border border-slate-800 bg-slate-900/60 font-mono text-xs",style:{borderLeftColor:p.color,borderLeftWidth:3},"data-testid":`lint-result-${f}`,children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("span",{className:"text-slate-100 font-bold",children:[i.fn,"()"]}),e.jsxs("span",{className:"text-[10px] font-bold",style:{color:p.color},children:[p.emoji," ",p.name]})]}),e.jsxs("div",{className:"flex gap-3 mt-1 text-[10px] text-slate-500",children:[e.jsxs("span",{children:["λ ",e.jsxs("span",{className:"text-slate-300",children:[i.wavelength_mid_nm?.toFixed(1)," nm"]})]}),e.jsxs("span",{children:["E ",e.jsxs("span",{className:"text-slate-300",children:[S," eV"]})]}),e.jsx("span",{className:"text-slate-400",children:b}),i.offline&&e.jsx("span",{className:"text-amber-600",children:"offline"})]})]},f)})})]})})]})]})}function rt(){return e.jsxs("div",{className:"min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6",children:[e.jsxs("div",{className:"mb-6",children:[e.jsxs("div",{className:"flex items-start gap-3 mb-4",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",style:{background:"linear-gradient(135deg,#8b00ff,#00c800,#cc0000)"},children:e.jsx(ee,{className:"w-5 h-5 text-white"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-slate-100",children:"CE Encoder — Human First Contact"}),e.jsx("p",{className:"text-slate-400 text-sm mt-0.5",children:"Every symbol you write already exists as a photon frequency. CE encoding makes that formal — deterministic, censorship-proof, hardware-ready."}),e.jsx("p",{className:"text-slate-600 text-xs mt-1 font-mono",children:"WNSP-CE v1.0 · Character Encoding Protocol · AGPL-3.0 Free Infrastructure"})]})]}),e.jsx("div",{className:"h-2 w-full rounded mb-1",style:{background:"linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)"}}),e.jsx("div",{className:"flex justify-between text-xs font-mono text-slate-700",children:[{label:"SYSTEM",color:"#8b00ff"},{label:"AUTH",color:"#0050ff"},{label:"STREAM",color:"#00cfcf"},{label:"CORE",color:"#00c800"},{label:"UI",color:"#cccc00"},{label:"EVENT",color:"#ff8c00"},{label:"STORAGE",color:"#cc0000"}].map((s,a)=>e.jsx("span",{style:{color:s.color},children:s.label},a))})]}),e.jsxs(he,{defaultValue:"live",children:[e.jsxs(ue,{className:"bg-slate-900 border border-slate-700 mb-4 overflow-x-auto flex-nowrap flex w-full",children:[e.jsxs(O,{value:"live",className:"flex-shrink-0","data-testid":"tab-live",children:[e.jsx(ee,{className:"w-3 h-3 mr-1"})," Live Encode"]}),e.jsxs(O,{value:"builder",className:"flex-shrink-0","data-testid":"tab-builder",children:[e.jsx(fe,{className:"w-3 h-3 mr-1"})," Code Builder"]}),e.jsxs(O,{value:"kit",className:"flex-shrink-0","data-testid":"tab-kit",children:[e.jsx(ge,{className:"w-3 h-3 mr-1"})," Integration Kit"]}),e.jsxs(O,{value:"linter",className:"flex-shrink-0","data-testid":"tab-linter",children:[e.jsx(V,{className:"w-3 h-3 mr-1"})," Spectral Linter"]})]}),e.jsxs(I,{value:"live",children:[e.jsx("h2",{className:"text-sm font-semibold text-cyan-300 mb-3",children:"Type anything — watch every symbol become a wavelength"}),e.jsx($e,{})]}),e.jsxs(I,{value:"builder",children:[e.jsx("h2",{className:"text-sm font-semibold text-green-300 mb-3",children:"Describe your code — CE assigns it a physical address in the universe"}),e.jsx(_e,{})]}),e.jsxs(I,{value:"kit",children:[e.jsx("h2",{className:"text-sm font-semibold text-amber-300 mb-3",children:"Take the CE encoder home — drop it in any project, runs on silicon today"}),e.jsx(Pe,{})]}),e.jsxs(I,{value:"linter",children:[e.jsx("h2",{className:"text-sm font-semibold text-yellow-300 mb-3",children:"Scan existing code — reveal its spectral structure and coherence"}),e.jsx(Be,{})]})]})]})}export{rt as default};
