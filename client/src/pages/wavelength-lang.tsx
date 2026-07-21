import { useState } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Link } from "wouter";
import { ArrowLeft, Code2, Zap, Globe, Cpu, Radio, Database, Play, Copy, ChevronRight, Atom, BookOpen, Layers } from "lucide-react";

// ── Physics helpers ───────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 495) return "#2563eb";
  if (nm < 520) return "#06b6d4";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#ca8a04";
  if (nm < 625) return "#ea580c";
  return "#dc2626";
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
function ceEncode(name: string): { nm: number; thz: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const thz = parseFloat((299792458 / (nm * 1e-9) / 1e12).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 100;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, thz, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToBand(nm) };
}

// ── WavelengthScript transpiler ───────────────────────────────────────────────
function transpile(src: string, srcLang: "python" | "javascript" | "rust"): string {
  if (!src.trim()) return "";

  const lines = src.split("\n");
  const out: string[] = [
    `∿ ── WavelengthScript v2.0 · AGPL-3.0 · NexusOS ────────────────`,
    `∿ Source: ${srcLang.toUpperCase()} → WLS transpilation`,
    `∿ Generated: ${new Date().toISOString()}`,
    `∿ Every symbol has a physical wavelength address in light.`,
    ``,
  ];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(""); continue; }

    // Comments
    if (line.startsWith("#") || line.startsWith("//")) {
      out.push(`∿ ${line.replace(/^[#/]+\s*/, "")}`);
      continue;
    }

    // Function definition
    const fnMatch = line.match(/^(?:def|function|fn)\s+(\w+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const [, name, params] = fnMatch;
      const enc = ceEncode(name);
      const paramList = params.split(",").map(p => p.trim()).filter(Boolean)
        .map(p => {
          const pe = ceEncode(p.replace(/[^a-zA-Z]/g, "") || "x");
          return `channel ${p.trim()} : @${pe.nm}nm`;
        }).join(", ");
      out.push(`∿ λ=${enc.nm}nm ${enc.psi} [${enc.band}]`);
      out.push(`field ${name}(${paramList}) → @${enc.nm}nm {`);
      continue;
    }

    // Class / struct definition
    const classMatch = line.match(/^(?:class|struct)\s+(\w+)/);
    if (classMatch) {
      const enc = ceEncode(classMatch[1]);
      out.push(`∿ spectral type → λ=${enc.nm}nm ${enc.psi} [${enc.band}]`);
      out.push(`channel ${classMatch[1]} : SpectralType {`);
      continue;
    }

    // Variable assignment
    const varMatch = line.match(/^(?:let|const|var)?\s*(\w+)\s*[:=]+\s*(.+)/);
    if (varMatch) {
      const [, vname, val] = varMatch;
      const enc = ceEncode(vname);
      out.push(`  channel ${vname} := ${val.replace(/;$/, "")}  ∿ λ=${enc.nm}nm ${enc.psi}`);
      continue;
    }

    // Return
    if (line.startsWith("return")) {
      out.push(`  collapse ${line.slice(6).trim()}  ∿ spectral output`);
      continue;
    }

    // Import / use
    if (line.startsWith("import") || line.startsWith("use") || line.startsWith("require")) {
      const modMatch = line.match(/["']([^"']+)["']/);
      const modName = modMatch ? modMatch[1] : "module";
      const enc = ceEncode(modName.replace(/[^a-zA-Z]/g, "") || "mod");
      out.push(`absorb(${enc.nm}nm)  ∿ import ${modName} at ${enc.psi}`);
      continue;
    }

    // Print / log / console
    if (line.match(/^(?:print|console\.log|println!|System\.out)/)) {
      out.push(`  observe(${line.replace(/^[^(]+/, "")})  ∿ stream band 520nm`);
      continue;
    }

    // If / else
    if (line.startsWith("if ")) {
      const cond = line.replace(/^if\s+/, "").replace(/:$/, "").replace(/^\(/, "").replace(/\)\s*\{?$/, "");
      out.push(`  resonate when ${cond} {`);
      continue;
    }
    if (line === "else" || line.startsWith("else {") || line.startsWith("else:")) {
      out.push(`  } resonate when else {`);
      continue;
    }

    // For / while loops
    if (line.startsWith("for ") || line.startsWith("while ")) {
      const iter = line.replace(/^(for|while)\s+/, "").replace(/:$/, "").replace(/\{$/, "");
      out.push(`  propagate over ${iter} {`);
      continue;
    }

    // Closing braces
    if (line === "}" || line.match(/^end(\s|$)/)) {
      out.push("}");
      continue;
    }

    // Default — annotate with wavelength
    const enc = ceEncode(line.split(" ")[0] || "op");
    out.push(`  ${line}  ∿ @${enc.nm}nm [${enc.band}]`);
  }

  out.push(``);
  out.push(`∿ ── Spectral manifest ──────────────────────────────────────────`);

  // Generate manifest from identifiers in source
  const identifiers = Array.from(new Set(src.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) ?? [])).slice(0, 8);
  for (const id of identifiers) {
    const enc = ceEncode(id);
    out.push(`∿ ${id.padEnd(20)} → λ=${enc.nm}nm  ${enc.psi}  [${enc.band}]`);
  }

  return out.join("\n");
}

// ── WNSP Bytecode Compiler ─────────────────────────────────────────────────────
interface Ins { off: number; op: number; mnem: string; args: string; nm?: number; ch?: string; cmt: string; }

function compileWLS(src: string): { assembly: string; hex: string; manifest: Array<{ symbol: string; nm: number; psi: string; band: string }>; instrCount: number } {
  if (!src.trim()) return { assembly: "", hex: "", manifest: [], instrCount: 0 };
  const ins: Ins[] = [];
  const symbols = new Map<string, { nm: number; psi: string; band: string }>();
  let off = 0;

  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, ch?: string) {
    ins.push({ off, op, mnem, args, nm, ch, cmt });
    if (op !== 0x00) off += 8;
  }

  add(0x00, ".WNSP",  "v1.0",              "NexusOS WNSP Bytecode · AGPL-3.0");
  add(0x00, ".ARCH",  "WDM256·OAM50·POL2·DIR2", "51,200 orthogonal Ψ channels");
  add(0x00, ".MODEL", "Λ=hf/c² SPECTRAL",  "Einstein first-principle execution");
  add(0x00, "", "", "");
  off = 0;

  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) { add(0x00, "", "", ""); continue; }
    if (line.startsWith("//") || line.startsWith(";") || line.startsWith("#")) {
      add(0x00, ";", line.replace(/^[/;#]+\s*/, ""), ""); continue;
    }
    const m1 = line.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);
    if (m1) { const nm = parseFloat(m1[1]); symbols.set(m1[2], { nm, psi: m1[2], band: nmToBand(nm) }); add(0x03, "EMIT", `λ=${nm}nm  ${m1[2]}`, `emit on ${nmToBand(nm)} band`, nm, m1[2]); continue; }
    const m2 = line.match(/tune\((\d+\.?\d*)nm\)/);
    if (m2) { const nm = parseFloat(m2[1]); add(0x01, "TUNE", `λ=${nm}nm`, `receiver → ${nmToBand(nm)} band`, nm); continue; }
    const m3 = line.match(/^agent\s+(\w+)/);
    if (m3) { const enc = ceEncode(m3[1]); symbols.set(m3[1], enc); add(0x0A, "AGENT", `"${m3[1]}"  ${enc.psi}`, `AI agent λ=${enc.nm}nm · ${enc.band}`, enc.nm, enc.psi); continue; }
    const m4 = line.match(/^fn\s+(\w+)/);
    if (m4) { const enc = ceEncode(m4[1]); symbols.set(m4[1], enc); add(0x07, "LABEL", `${m4[1]}  ${enc.psi}`, `fn → λ=${enc.nm}nm`, enc.nm, enc.psi); continue; }
    const m5 = line.match(/node\.register\("([^"]+)"/);
    if (m5) { const enc = ceEncode(m5[1]); symbols.set(m5[1], enc); add(0x0A, "AGENT", `"${m5[1]}"  ${enc.psi}  PUBLIC`, `spectral network node`, enc.nm, enc.psi); continue; }
    const m6 = line.match(/oscillate\(([^)]+)\)/);
    if (m6) { add(0x06, "OCS", m6[1].trim(), "non-blocking wave loop"); continue; }
    const m7 = line.match(/broadcast\(([^)]+)\)/);
    if (m7) { const enc = ceEncode(m7[1].replace(/[^a-zA-Z]/g, "") || "data"); add(0x05, "BROAD", m7[1].trim(), `broadcast λ=${enc.nm}nm`, enc.nm); continue; }
    const m8 = line.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);
    if (m8) { const nm = parseFloat(m8[1]); symbols.set(m8[2], { nm, psi: ceEncode(m8[2]).psi, band: nmToBand(nm) }); add(0x02, "PUSH", `@${nm}nm  "${m8[2]}"`, `bind at λ=${nm}nm · ${nmToBand(nm)}`, nm); continue; }
    const m9 = line.match(/^\s*emit\s+(.+)/);
    if (m9) { const enc = ceEncode(m9[1].replace(/[^a-zA-Z]/g, "") || "out"); add(0x03, "EMIT", m9[1].trim(), `output at λ=${enc.nm}nm`, enc.nm); continue; }
    if (line.startsWith("?λ ")) { add(0x08, "JMPZ", line.slice(3).trim(), "photon path branch"); continue; }
    if (line === "}" || line.match(/^end\b/)) { add(0xFE, "RET", "", "scope end — wave collapses"); continue; }
    const word = line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op";
    const enc = ceEncode(word);
    add(0x0B, "EXEC", `@${enc.nm}nm`, line.slice(0, 50), enc.nm);
  }
  add(0xFF, "HALT", "", "wavefunction terminated");

  const sym = [...symbols.entries()].map(([s, e]) => ({ symbol: s, ...e }));
  const realIns = ins.filter(i => i.op !== 0x00 && i.mnem !== "" && i.mnem !== ";");

  const asmLines = [
    `; ── WNSP Bytecode Assembly v1.0 ────────────────────────────────────`,
    `; NexusOS · AGPL-3.0 · ${new Date().toISOString().slice(0, 19)}Z`,
    `; Hilbert-space: 51,200 orthogonal channels · E=hf · Λ=hf/c²`,
    `; ────────────────────────────────────────────────────────────────────`,
    ``,
    ...ins.map(i => {
      if (!i.mnem) return "";
      if (i.mnem === ";") return `  ; ${i.args}`;
      if (i.mnem.startsWith(".")) return `${i.mnem.padEnd(10)} ${i.args}  ; ${i.cmt}`;
      const addr = `0x${i.off.toString(16).padStart(6, "0")}`;
      const op   = i.op.toString(16).padStart(2, "0");
      const cmt  = i.cmt ? `  ; ${i.cmt}` : "";
      return `  ${addr}  ${op}  ${i.mnem.padEnd(8)} ${i.args}${cmt}`;
    }),
    ``,
    `; ── Symbol Table (${sym.length} symbols) ─────────────────────────────────────`,
    ...sym.map(s => `; ${s.symbol.padEnd(22)} λ=${String(s.nm).padEnd(8)} ${s.psi}  [${s.band}]`),
  ];

  const hexLines = [
    `; WNSP Binary Hex Dump`,
    `; ─────────────────────────────────────────────────────────────`,
    `Offset    Bytes                              Annotation`,
    `────────  ─────────────────────────────────  ──────────────────`,
    `0x000000  57 4E 53 50 01 00 00 00            ; magic "WNSP" v1.0`,
    `0x000008  ${realIns.length.toString(16).padStart(8, "0").match(/.{2}/g)!.join(" ")}            ; instr count = ${realIns.length}`,
    ...realIns.slice(0, 12).map((i, idx) => {
      const addr = `0x${(16 + idx * 8).toString(16).padStart(6, "0")}`;
      const op = i.op.toString(16).padStart(2, "0");
      const nm16 = i.nm ? Math.round(i.nm * 10) : 0;
      const b1 = Math.floor(nm16 / 256).toString(16).padStart(2, "0");
      const b2 = (nm16 % 256).toString(16).padStart(2, "0");
      return `${addr}  ${op} ${b1} ${b2} 00 00 00 00 00 ; ${i.mnem.padEnd(6)} ${i.args.slice(0, 24)}`;
    }),
    realIns.length > 12 ? `...  (${realIns.length - 12} more instructions)` : "",
  ];

  return {
    assembly: asmLines.join("\n"),
    hex: hexLines.filter(Boolean).join("\n"),
    manifest: sym,
    instrCount: realIns.length,
  };
}

const SAMPLE_WLS_GOVERNANCE = `// WavelengthScript v1.0 · AGPL-3.0
// Governance Vote — on-chain protocol parameter change

tune(468nm)  // KERNEL band — governance requires KERNEL or higher

@emit(469.4nm, Ψ(23,44,V))
fn submitProposal(param, newValue, proposerKey) {
  @468nm let proposal := GovernanceRegistry.create({
    @550nm param    := param,
    @550nm value    := newValue,
    @540nm creator  := proposerKey,
  })
  emit proposal.id
}

@emit(471.0nm, Ψ(24,0,V))
fn castVote(proposalId, voteYes, voterKey) {
  @468nm let voter    := TrustLayer.verify(voterKey)
  @540nm let weight   := SpectralAuth.bandWeight(voter.band)
  @648nm let record   := VoteStore.append(proposalId, voteYes, weight)
  ?λ record.thresholdMet():
    broadcast(record.executeNow())
  }
  emit record
}

@emit(472.1nm, Ψ(24,5,H))
fn executeProposal(proposalId) {
  @648nm let proposal := VoteStore.get(proposalId)
  ?λ proposal.passed():
    @540nm let applied := LIVE_FEES.update(proposal.param, proposal.value)
    broadcast(applied)  // → notify all KERNEL+ nodes
  }
  emit proposal.status
}

node.register("GovernanceKernel", @469.4nm)
`;

const SAMPLE_WLS_P2P = `// WavelengthScript v1.0 · AGPL-3.0
// P2P Spectral File Transfer — no relay, no DNS

tune(501nm)  // STREAM band — live data flow

@emit(501.7nm, Ψ(31,17,V))
agent StreamParser {
  @501nm pipeline := ChunkEngine.new(size=512)
  @648nm store    := VectorStore.new()
  @468nm auth     := TrustLayer.connect()

  oscillate(Ψ(31,17,V), 0Hz) {
    ?λ auth.verify():
      @501nm let chunk   := tune(Ψ(31,17,V))
      @648nm let written := store.append(chunk.data, chunk.seq)
      ?λ chunk.isFinal():
        emit store.assemble()
      }
      broadcast(written.ack)
    }
  }
}

@emit(503.2nm, Ψ(32,2,H))
fn sendFile(filePath, recipientPsi, senderKey) {
  @648nm let chunks   := ChunkEngine.split(filePath)
  @540nm let identity := TrustLayer.sign(senderKey)
  oscillate(chunks, 0Hz) {
    @501nm let frame := StreamParser.encode(identity, chunk)
    broadcast(frame)  // → emits to recipient Ψ channel
  }
  emit { status: "COMPLETE", chunks: chunks.length }
}

node.register("StreamParser", @501.7nm)
`;

const SAMPLE_WLS_WALLET = `// WavelengthScript v1.0 · AGPL-3.0
// Spectral Wallet — physics-priced NXT transfers

tune(468nm)  // AUTH band — wallet requires identity verification

@emit(468.3nm, Ψ(23,83,V))
agent TrustLayer {
  @648nm ledger  := SpectralDB.connect("transactions")
  @468nm session := SessionStore.new()

  oscillate(Ψ(23,83,V), 0Hz) {
    ?λ session.active():
      @550nm let req := tune(Ψ(23,83,V))
      ?λ req.type == "transfer":
        @468nm let fee := PhysicsEngine.calcFee(req.sender.nm, req.amount)
        ?λ req.sender.balance >= (req.amount + fee):
          @648nm let tx := ledger.write({
            @540nm from   := req.sender.psi,
            @540nm to     := req.recipient.psi,
            @550nm amount := req.amount,
            @540nm fee    := fee,
            @540nm lambda := PhysicsEngine.lambda(req.sender.nm),
          })
          broadcast(tx)
        }
      }
    }
  }
}

@emit(469.9nm, Ψ(23,99,V))
fn transferNXT(fromKey, toKey, amount) {
  @468nm let sender    := TrustLayer.verify(fromKey)
  @468nm let recipient := TrustLayer.verify(toKey)
  @540nm let result    := TrustLayer.send({ sender, recipient, amount })
  emit result.txId
}

node.register("TrustLayer", @468.3nm)
`;

const SAMPLE_WLS = `// WavelengthScript v1.0 · AGPL-3.0
// Spectral agent — runs on Ψ channels, not a CPU

tune(540nm)  // lock receiver to LOGIC band

@emit(541.2nm, Ψ(41,12,V))
agent ReasoningCore {
  @468nm identity := TrustLayer.connect()
  @648nm memory   := VectorStore.new()
  @501nm stream   := StreamParser.new()

  oscillate(Ψ(41,12,V), 0Hz) {
    ?λ identity.verify():
      @540nm let prompt := tune(Ψ(41,12,V))
      @540nm let result := model.infer(prompt)
      emit result
    }
  }
}

node.register("ReasoningCore", @541.2nm)
`;

// ── Spec data ─────────────────────────────────────────────────────────────────
const BANDS = [
  { nm: "380–449nm", band: "SYSTEM",    color: "#8b00ff", types: ["kernel", "root", "syscall", "interrupt"], desc: "Root authority — kernel operations, hardware control, boot sequences" },
  { nm: "450–494nm", band: "AUTH",      color: "#2563eb", types: ["identity", "token", "session", "trust"],   desc: "Identity & trust — authentication, wallet addresses, permissions" },
  { nm: "495–519nm", band: "STREAM",    color: "#06b6d4", types: ["channel", "stream", "broadcast", "live"],  desc: "Live data flow — video, audio, real-time messaging" },
  { nm: "520–564nm", band: "LOGIC",     color: "#16a34a", types: ["compute", "fn", "agent", "model"],         desc: "Computation — functions, AI agents, logic gates, inference" },
  { nm: "565–589nm", band: "INTERFACE", color: "#ca8a04", types: ["display", "ui", "render", "component"],    desc: "User interface — rendering, display, interaction" },
  { nm: "590–624nm", band: "EVENT",     color: "#ea580c", types: ["signal", "trigger", "webhook", "pulse"],   desc: "Events & signals — triggers, interrupts, pub-sub" },
  { nm: "625–780nm", band: "STORAGE",   color: "#dc2626", types: ["record", "store", "db", "persist"],        desc: "Data at rest — spectral database, ordinals, archives" },
];

const SYNTAX = [
  { concept: "Declare a variable",    wls: '@540nm let mass := Λ(h=6.626e-34, f=555e12)', note: "λ=540nm → LOGIC band" },
  { concept: "Define a function",     wls: '@emit(523nm, Ψ(37,8,H))\nfn encode(input: @520nm str) → @540nm float', note: "emit declares spectral address" },
  { concept: "Import a module",       wls: 'tune(490nm)  // imports identity module', note: "tune() sets receiver to that band" },
  { concept: "Call an AI agent",      wls: 'agent.invoke(@540nm "reasoning", prompt)', note: "agents live on LOGIC band 520–564nm" },
  { concept: "Send a message",        wls: 'broadcast(Ψ(37,8,H), payload)  // stream band', note: "broadcast() emits on Ψ channel" },
  { concept: "Async / concurrent",    wls: 'oscillate(Ψ(100,0,H), 7.83Hz) { ... }', note: "oscillate() = non-blocking wave loop" },
  { concept: "Type annotation",       wls: '@625nm record Post { title: @560nm str }', note: "type prefix = band address" },
  { concept: "Register AI node",      wls: 'node.register("GPT-Nexus", @540nm)', note: "node name → CE→SE → band → discoverable" },
];

const AI_CHANNELS = [
  { agent: "ReasoningCore",   nm: 541.2, psi: "Ψ(41,12,V)", role: "General inference & chain-of-thought" },
  { agent: "MemoryStore",     nm: 648.4, psi: "Ψ(68,44,H)", role: "Long-term memory, vector retrieval" },
  { agent: "StreamParser",    nm: 501.7, psi: "Ψ(31,17,V)", role: "Real-time token streaming" },
  { agent: "EmbeddingMapper", nm: 538.9, psi: "Ψ(40,89,V)", role: "Token → wavelength embedding" },
  { agent: "TrustLayer",      nm: 468.3, psi: "Ψ(23,83,V)", role: "Auth & identity verification" },
  { agent: "OutputEmitter",   nm: 572.1, psi: "Ψ(49,21,V)", role: "Response generation & broadcast" },
];

const FROM_LANGS = [
  {
    lang: "Python",
    snippet: `import nexusos

# Register your AI agent on the wave
agent = nexusos.Agent(name="MyAI", band="LOGIC")
agent.tune(540)  # lock to 540nm

@agent.on_signal("Ψ(41,12,V)")
def handle(prompt):
    result = my_model.infer(prompt)
    agent.emit(result)

agent.start()`,
    desc: "Python SDK — install with `pip install nexusos-sdk`",
  },
  {
    lang: "JavaScript",
    snippet: `import { NexusOS } from 'nexusos-sdk';

const agent = new NexusOS.Agent({
  name: 'MyAI',
  wavelength: 540,  // LOGIC band
  channel: 'Ψ(41,12,V)',
});

agent.on('signal', async (payload) => {
  const result = await myModel.run(payload);
  agent.emit(result);
});

await agent.register();`,
    desc: "JS/TS SDK — install with `npm install nexusos-sdk`",
  },
  {
    lang: "Rust",
    snippet: `use nexusos::Agent;

let mut agent = Agent::builder()
    .name("MyAI")
    .wavelength_nm(540.0)
    .channel("Ψ(41,12,V)")
    .build()?;

agent.on_signal(|payload| {
    let result = my_model.infer(&payload);
    agent.emit(result)
});

agent.register().await?;`,
    desc: "Rust SDK — add `nexusos-sdk` to Cargo.toml",
  },
];

const SAMPLE_WLS_TRANSFER = `∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Token Transfer: NXT physics-priced transfer
∿ Fee = hf_sender / hf_reference  (E=hf energy difference)

absorb(468nm)  ∿ AUTH band — identity required

field transfer(
  channel sender    : @468nm,
  channel recipient : @468nm,
  channel amount    : @550nm
) → @648nm {
  channel λ_sender := physics.wavelength(sender.psi)  ∿ sender spectral address
  channel fee      := physics.fee(λ_sender, amount)   ∿ Λ=hf/c² derived fee
  channel balance  := observe(sender.psi)              ∿ read current Fock state

  resonate when balance >= (amount + fee) {
    emit sender.psi → absorb (amount + fee)             ∿ debit sender
    observe recipient.psi ← amount                      ∿ credit recipient
    observe spectral_ledger.record({
      channel from   := sender.psi,
      channel to     := recipient.psi,
      channel amount := amount,
      channel fee    := fee,
      channel lambda := λ_sender
    })
    collapse { txId: spectral_ledger.lastId, fee, lambda: λ_sender }
  }

  collapse { error: "insufficient_energy", required: (amount + fee) }
}
`;

const SAMPLE_WLS_CONTRACT = `∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Smart Contract: Physics-Signed Escrow
∿ Self-executing agreement governed by wave mechanics

absorb(468nm)  ∿ AUTH band — contract requires KERNEL authority

field escrow(
  channel depositor  : @468nm,
  channel beneficiary: @468nm,
  channel condition  : @540nm,
  channel amount     : @550nm
) → @648nm {
  channel escrow_ch := Ψ(depositor.wdm, depositor.oam, V)  ∿ derive escrow channel
  observe escrow_ch ← amount                                 ∿ lock funds in channel

  propagate over oracle.watch(condition) {
    resonate when condition.met {
      collapse beneficiary ← amount   ∿ release to beneficiary
    }
    resonate when condition.expired {
      collapse depositor ← amount     ∿ refund depositor
    }
  }
}

entangle Ψ(depositor) → Ψ(beneficiary)  ∿ atomic spectral binding
`;

const SAMPLE_WLS_GOVERNANCE_V2 = `∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Governance Vote: on-chain protocol parameter change
∿ Voting weight = spectral authority band (shorter λ = higher weight)

absorb(468nm)  ∿ AUTH band — governance requires KERNEL or higher

field submitProposal(
  channel param     : @540nm,
  channel newValue  : @540nm,
  channel proposer  : @468nm
) → @540nm {
  channel proposal := GovernanceRegistry.create({
    channel param   := param,
    channel value   := newValue,
    channel creator := proposer.psi
  })
  collapse proposal.id
}

field castVote(
  channel proposalId: @540nm,
  channel voteYes   : @540nm,
  channel voter     : @468nm
) → @648nm {
  channel weight := SpectralAuth.bandWeight(voter.band)  ∿ λ → authority weight
  channel record := VoteStore.append(proposalId, voteYes, weight)
  resonate when record.thresholdMet {
    observe record.executeNow()  ∿ live protocol update
  }
  collapse record
}

entangle Ψ(voter) → Ψ(proposal)  ∿ vote binding
`;

const SAMPLE_WLS_WALLET_V2 = `∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Spectral Wallet: observe any Ψ channel balance
∿ Balance = current Fock occupation number of that channel

absorb(468nm)  ∿ AUTH band — wallet requires identity

field walletBalance(channel owner: @468nm) → @550nm {
  channel psi     := owner.psi          ∿ e.g. Ψ(52,3,V)
  channel state   := observe(psi)       ∿ measure Fock state |n⟩
  channel lambda  := physics.wavelength(psi)
  channel energy  := physics.energy(lambda)  ∿ E = hf = hc/λ
  collapse {
    channel balance := state.nxt,
    channel psi     := psi,
    channel lambda  := lambda,
    channel energy  := energy,
    channel band    := physics.band(lambda)
  }
}

field walletHistory(channel owner: @468nm) → @648nm {
  channel txs := spectral_ledger.query(owner.psi)
  propagate over txs {
    observe tx.render()  ∿ stream each record to output
  }
  collapse txs.count
}
`;

const SAMPLE_PYTHON = `import math

def lambda_energy(freq_hz, mass):
    h = 6.626e-34
    c = 2.998e8
    # Lambda Boson equation
    energy = h * freq_hz
    lambda_mass = energy / (c ** 2)
    return lambda_mass

class SpectralNode:
    def __init__(self, name, freq):
        self.name = name
        self.freq = freq

    def broadcast(self, payload):
        print(f"Emitting {payload} at {self.freq}Hz")
`;

export default function WavelengthLangPage() {
  usePageMeta({
    title: "WavelengthScript — Physics-Native Programming Language",
    description: "WavelengthScript is a programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Step-debug in the WNSP VM.",
    canonical: "https://wnsp.io/wavelength-lang",
    ogTitle: "WavelengthScript — The Language the Universe Runs On",
    ogDescription: "Physics-native language: spectral addresses, photon packets, E=hf fees. Compiles to WNSP bytecode. Browser-native WNSP VM. CE→SE pipeline. AGPL-3.0.",
    twitterTitle: "WavelengthScript v1.0",
    twitterDescription: "The language the universe runs on. Agents at spectral addresses. Photon packets. E=hf computation costs. WNSP bytecode.",
  });
  const [srcLang, setSrcLang]   = useState<"python" | "javascript" | "rust">("python");
  const [source, setSource]     = useState(SAMPLE_PYTHON);
  const [output, setOutput]     = useState("");
  const [activeTab, setActiveTab] = useState<"spec" | "grammar" | "transpiler" | "compiler" | "ai" | "sdk">("spec");
  const [grammarExample, setGrammarExample] = useState<"transfer" | "contract" | "governance" | "wallet">("transfer");
  const [fockChannels, setFockChannels] = useState([
    { id: "sender",   label: "sender",   psi: "Ψ(23,83,V)", nm: 468, n: 0 },
    { id: "receiver", label: "receiver", psi: "Ψ(24,10,H)", nm: 471, n: 0 },
    { id: "fee",      label: "fee",      psi: "Ψ(41,12,V)", nm: 541, n: 0 },
    { id: "ledger",   label: "ledger",   psi: "Ψ(68,44,H)", nm: 648, n: 0 },
  ]);
  const [fockLog, setFockLog] = useState<{op: string; sym: string; ch: string; from: number; to: number}[]>([]);

  function fockApply(id: string, op: "create" | "annihilate" | "observe") {
    setFockChannels(prev => prev.map(ch => {
      if (ch.id !== id) return ch;
      const from = ch.n;
      const to = op === "create" ? ch.n + 1 : op === "annihilate" ? Math.max(0, ch.n - 1) : ch.n;
      const sym = op === "create" ? "â†" : op === "annihilate" ? "â" : "n̂";
      const verb = op === "create" ? "emit" : op === "annihilate" ? "absorb" : "observe";
      setFockLog(l => [...l.slice(-11), { op: verb, sym, ch: ch.label, from, to }]);
      return { ...ch, n: to };
    }));
  }
  const [liveEncode, setLiveEncode] = useState("");
  const [copied, setCopied] = useState(false);
  const [compilerSrc, setCompilerSrc]   = useState(SAMPLE_WLS);
  const [compileView, setCompileView]   = useState<"asm" | "hex" | "manifest">("asm");
  const [compiled, setCompiled] = useState<ReturnType<typeof compileWLS> | null>(null);
  const [copiedBc, setCopiedBc] = useState(false);

  const liveResult = liveEncode ? ceEncode(liveEncode) : null;

  function runTranspile() {
    setOutput(transpile(source, srcLang));
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const TAB = (id: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === id ? "text-white bg-white/10 border border-white/20" : "text-white/30 hover:text-white/60"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors" aria-label="Back to Nexus Command"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <Code2 size={13} className="text-violet-400" />
            <span className="text-sm font-bold tracking-wider text-violet-400">WAVELENGTH SCRIPT</span>
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          </div>
          <span className="text-white/20 text-[10px]">WLS v1.0 · Code in light · Build AI on the wave · AGPL-3.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] px-2 py-1 rounded border border-violet-400/20 text-violet-400/50">OPEN SPEC</span>
          <span className="text-[8px] px-2 py-1 rounded border border-emerald-400/20 text-emerald-400/50">FREE FOREVER</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Hero */}
        <div className="border border-violet-400/20 rounded-xl p-6" style={{ background: "linear-gradient(180deg, rgba(139,0,255,0.06) 0%, rgba(0,0,0,0) 100%)" }}>
          <div className="h-1.5 rounded-full w-full mb-5" style={{ background: "linear-gradient(to right, #8b00ff, #2563eb, #06b6d4, #16a34a, #ca8a04, #ea580c, #dc2626)" }} />
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-violet-400/50 text-[9px] uppercase tracking-widest mb-2">WavelengthScript</div>
              <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
                The first language where every symbol has a physical address in light.
              </h1>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Variables live at wavelengths. Functions emit on Ψ channels. AI agents tune to frequencies.
                Code doesn't run on a CPU — it propagates as a wave. Write in Python, JS, or Rust and
                let the transpiler map your logic onto the electromagnetic spectrum.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Transpiles from Python/JS/Rust", "AI agents on Ψ channels", "AGPL-3.0 open spec", "CE→SE type system"].map(t => (
                  <span key={t} className="text-[9px] px-2 py-1 rounded-full border border-white/10 text-white/30">{t}</span>
                ))}
              </div>
            </div>
            <div className="border border-white/5 rounded-xl p-4" style={{ background: "rgba(139,0,255,0.04)" }}>
              <div className="text-white/20 text-[9px] mb-3 uppercase tracking-widest">Quick encode — any word → its wavelength address</div>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-white/15 focus:border-violet-400/30"
                placeholder="Type anything: 'function', 'AI', 'reasoning', 'model'…"
                value={liveEncode}
                onChange={e => setLiveEncode(e.target.value)}
                data-testid="input-live-encode"
              />
              {liveResult ? (
                <div className="mt-3 space-y-2">
                  <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right, ${nmToColor(liveResult.nm - 30)}, ${nmToColor(liveResult.nm)}, ${nmToColor(liveResult.nm + 30)})` }} />
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { l: "λ address",  v: `${liveResult.nm}nm`,  c: nmToColor(liveResult.nm) },
                      { l: "Frequency",  v: `${liveResult.thz} THz`, c: "#a78bfa" },
                      { l: "Ψ channel",  v: liveResult.psi,         c: "#06b6d4" },
                      { l: "Band",       v: liveResult.band,        c: nmToColor(liveResult.nm) },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="border border-white/5 rounded-lg p-2">
                        <div className="text-[8px] text-white/25">{l}</div>
                        <div className="text-[11px] font-bold" style={{ color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[9px] text-white/20">
                    In WLS: <span className="text-violet-400">@{liveResult.nm}nm</span> is the type prefix for "{liveEncode}" — every instance lives at this wavelength.
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-center text-white/15 text-[10px] py-4">
                  CE→SE encodes any word into a physical wavelength of light. That wavelength becomes the address.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2">
          {TAB("spec",       "Language Spec")}
          {TAB("grammar",    "WLS v2.0 Grammar")}
          {TAB("transpiler", "Transpiler")}
          {TAB("compiler",   "Compiler → Bytecode")}
          {TAB("ai",         "AI Integration")}
          {TAB("sdk",        "SDK — Other Languages")}
        </div>

        {/* ── TAB: LANGUAGE SPEC ──────────────────────────────────────────── */}
        {activeTab === "spec" && (
          <div className="space-y-6">

            {/* Type system — bands */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Layers size={11} /> Type System — Spectral Bands
              </h2>
              <p className="text-white/25 text-[11px] leading-relaxed mb-4">
                In WavelengthScript, every type has a band. Instead of <code className="text-violet-300">string</code> or <code className="text-violet-300">int</code>,
                you declare types by their spectral band. The band determines where data lives, who can access it, and what operations are valid on it.
              </p>
              <div className="space-y-2">
                {BANDS.map(b => (
                  <div key={b.band} className="flex items-start gap-4 border border-white/5 rounded-lg px-4 py-3"
                    style={{ background: b.color + "06" }}>
                    <div className="w-16 flex-shrink-0">
                      <div className="text-[9px] font-bold" style={{ color: b.color }}>{b.band}</div>
                      <div className="text-[8px] text-white/20">{b.nm}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {b.types.map(t => (
                          <code key={t} className="text-[9px] px-1.5 py-0.5 rounded border"
                            style={{ borderColor: b.color + "30", color: b.color, background: b.color + "0a" }}>
                            @{Math.floor(380 + BANDS.indexOf(b) * 57)}nm {t}
                          </code>
                        ))}
                      </div>
                      <div className="text-[9px] text-white/25">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Syntax reference */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Code2 size={11} /> Syntax Reference
              </h2>
              <div className="space-y-3">
                {SYNTAX.map((s, i) => (
                  <div key={i} className="border border-white/5 rounded-lg p-4" style={{ background: "rgba(255,255,255,0.015)" }}>
                    <div className="text-[10px] text-white/50 mb-2">{s.concept}</div>
                    <pre className="text-[10px] text-violet-300 font-mono leading-relaxed mb-2 overflow-x-auto">{s.wls}</pre>
                    <div className="text-[9px] text-white/25">{s.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Core operators */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={11} /> Core Operators
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { op: "@{nm}nm",         desc: "Type prefix — declares wavelength address of a value or function" },
                  { op: "emit(val)",        desc: "Output a value — broadcasts it on the current Ψ channel" },
                  { op: "tune(nm)",         desc: "Receive — sets the listener to a specific wavelength band" },
                  { op: "broadcast(Ψ, v)", desc: "Send to a specific Ψ channel — like emit but targeted" },
                  { op: "oscillate(Ψ,f)",  desc: "Non-blocking loop at frequency f Hz — the WLS for() equivalent" },
                  { op: "?λ cond:",        desc: "Conditional — the WLS if() — resolves to photon path 0 or 1" },
                  { op: "agent.invoke()",  desc: "Call a registered AI agent by its Ψ channel address" },
                  { op: "node.register()", desc: "Register this program as a discoverable spectral network node" },
                  { op: "Λ(h, f)",        desc: "Lambda Boson — the physical constant hf/c² — core primitive" },
                ].map(({ op, desc }) => (
                  <div key={op} className="border border-white/5 rounded-lg p-3">
                    <code className="text-[10px] text-violet-300 block mb-1">{op}</code>
                    <div className="text-[9px] text-white/25 leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open source note */}
            <div className="border border-amber-400/10 rounded-xl p-5 text-center" style={{ background: "rgba(251,191,36,0.02)" }}>
              <div className="text-amber-400/50 text-[9px] uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                <Atom size={9} /> AGPL-3.0 Open Specification · Free for Every Developer on Earth
              </div>
              <div className="text-white/25 text-[11px] leading-relaxed max-w-2xl mx-auto">
                WavelengthScript is a free, open standard. Any company that implements a WLS runtime must publish their code under AGPL-3.0.
                The CE→SE encoding standard — which underpins the entire type system — is free developer infrastructure.
                No patent. No licence fee. The address space of light belongs to everyone.
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: WLS v2.0 GRAMMAR ──────────────────────────────────────── */}
        {activeTab === "grammar" && (
          <div className="space-y-6">

            {/* Intro */}
            <div className="text-white/25 text-[11px] leading-relaxed max-w-3xl">
              WavelengthScript v2.0 is a formally specified, physics-native language. Every keyword is a physical
              operation — not a metaphor. The type system is Fock space: values are occupation numbers <code className="text-violet-300">|n⟩</code>,
              channels are Ψ registers, and computation is state evolution. This grammar closes the gap between
              pseudocode and a language you can learn, compile, and run today on the WNSP VM.
            </div>

            {/* ═══ Fock State Execution Model ═══ */}
            <div className="border border-amber-400/20 rounded-xl p-5 space-y-5" style={{ background: "rgba(251,191,36,0.025)" }}>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-[10px] uppercase tracking-widest font-bold">[â,â†]=1</span>
                <span className="text-white/20 text-[9px]">—</span>
                <span className="text-white/50 text-[11px]">Execution Model — WLS programs are sequences of creation &amp; annihilation operators on the vacuum</span>
              </div>

              {/* Operator reference */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { sym: "|0⟩",    wls: "—",        col: "#6b7280", desc: "vacuum · null · uninitialised" },
                  { sym: "|n⟩",    wls: "—",        col: "#a78bfa", desc: "n quanta · integer n" },
                  { sym: "â†",     wls: "emit",     col: "#f59e0b", desc: "creation · write · +1 quantum" },
                  { sym: "â",      wls: "absorb",   col: "#06b6d4", desc: "annihilation · read · −1 quantum" },
                  { sym: "n̂=â†â", wls: "observe",  col: "#10b981", desc: "measure occupation · no collapse" },
                ].map(r => (
                  <div key={r.sym} className="rounded-lg px-3 py-2.5 border" style={{ borderColor: r.col + "30", background: r.col + "08" }}>
                    <div className="font-mono text-base font-bold leading-none mb-1" style={{ color: r.col }}>{r.sym}</div>
                    {r.wls !== "—" && <div className="text-[8px] text-white/40 font-mono mb-1">wls: <span style={{ color: r.col + "cc" }}>{r.wls}</span></div>}
                    <div className="text-[8px] text-white/30 leading-tight">{r.desc}</div>
                  </div>
                ))}
              </div>

              {/* Live playground */}
              <div>
                <div className="text-white/25 text-[9px] uppercase tracking-widest mb-3">Live Playground — apply operators to Ψ channels</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {fockChannels.map(ch => {
                    const hue = ch.nm < 450 ? "#8b00ff" : ch.nm < 495 ? "#2563eb" : ch.nm < 520 ? "#06b6d4" : ch.nm < 565 ? "#16a34a" : ch.nm < 590 ? "#ca8a04" : "#dc2626";
                    const bars = Math.min(ch.n, 8);
                    return (
                      <div key={ch.id} className="border rounded-xl p-3 space-y-2" style={{ borderColor: hue + "35", background: hue + "06" }}>
                        {/* Channel header */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold" style={{ color: hue }}>{ch.label}</span>
                          <span className="text-[8px] text-white/25">{ch.psi}</span>
                        </div>
                        {/* Fock state display */}
                        <div className="text-center">
                          <span className="text-2xl font-mono font-black leading-none" style={{ color: ch.n === 0 ? "#374151" : hue }}>
                            |{ch.n}⟩
                          </span>
                          {ch.n === 0 && <div className="text-[7px] text-white/20 mt-0.5">vacuum</div>}
                        </div>
                        {/* Occupation bar */}
                        <div className="flex gap-0.5 justify-center">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="w-2 h-2 rounded-sm transition-all" style={{ background: i < bars ? hue : hue + "18" }} />
                          ))}
                        </div>
                        {/* Operator buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => fockApply(ch.id, "create")}
                            className="flex-1 text-[9px] py-1 rounded border font-mono font-bold transition-all hover:opacity-90 active:scale-95"
                            style={{ borderColor: "#f59e0b60", color: "#f59e0b", background: "#f59e0b10" }}
                            data-testid={`button-fock-create-${ch.id}`}
                            title="Create operator â† — adds 1 quantum"
                          >â†</button>
                          <button
                            onClick={() => fockApply(ch.id, "observe")}
                            className="flex-1 text-[8px] py-1 rounded border font-mono font-bold transition-all hover:opacity-90 active:scale-95"
                            style={{ borderColor: "#10b98160", color: "#10b981", background: "#10b98110" }}
                            data-testid={`button-fock-observe-${ch.id}`}
                            title="Number operator n̂ = â†â — measure without destroying"
                          >n̂</button>
                          <button
                            onClick={() => fockApply(ch.id, "annihilate")}
                            disabled={ch.n === 0}
                            className="flex-1 text-[9px] py-1 rounded border font-mono font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-20"
                            style={{ borderColor: "#06b6d460", color: "#06b6d4", background: "#06b6d410" }}
                            data-testid={`button-fock-annihilate-${ch.id}`}
                            title="Annihilation operator â — removes 1 quantum"
                          >â</button>
                        </div>
                        <div className="text-[7px] text-white/15 text-center">{ch.nm}nm</div>
                      </div>
                    );
                  })}
                </div>
                {/* Reset */}
                <button
                  onClick={() => { setFockChannels(prev => prev.map(ch => ({ ...ch, n: 0 }))); setFockLog([]); }}
                  className="mt-2 text-[8px] text-white/20 hover:text-white/40 transition-colors border border-white/10 rounded px-2 py-0.5"
                  data-testid="button-fock-reset"
                >reset to |0,0,0,0⟩</button>
              </div>

              {/* Operator log */}
              {fockLog.length > 0 && (
                <div>
                  <div className="text-white/20 text-[8px] uppercase tracking-widest mb-2">Operator sequence — this is your WLS program</div>
                  <div className="bg-black/40 rounded-lg p-3 font-mono text-[9px] space-y-0.5 max-h-32 overflow-y-auto border border-white/5">
                    {fockLog.map((entry, i) => {
                      const col = entry.op === "emit" ? "#f59e0b" : entry.op === "observe" ? "#10b981" : "#06b6d4";
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-white/20 w-4 text-right">{i + 1}.</span>
                          <span className="font-bold" style={{ color: col }}>{entry.sym}</span>
                          <span className="text-white/50">{entry.op}</span>
                          <span className="text-white/30">{entry.ch}</span>
                          <span className="text-white/20">|{entry.from}⟩→|{entry.to}⟩</span>
                          <span className="text-white/15 text-[8px] ml-auto">
                            {entry.op === "emit" ? `â†|${entry.from}⟩ = √${entry.from + 1}·|${entry.to}⟩`
                            : entry.op === "absorb" ? `â|${entry.from}⟩ = √${entry.from}·|${entry.to}⟩`
                            : `n̂|${entry.from}⟩ = ${entry.from}·|${entry.from}⟩`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Physics derivation note */}
              <div className="border-t border-white/5 pt-3 text-[9px] text-white/25 leading-relaxed">
                <span className="text-amber-400/50">From Act 17 — The Field:</span>{" "}
                â†|n⟩ = √(n+1)·|n+1⟩ · â|n⟩ = √n·|n−1⟩ · n̂|n⟩ = n·|n⟩ · â|0⟩ = 0 (vacuum is destroyed by â, never negative) · ℋ = ℏω(n̂ + ½)
              </div>
            </div>

            {/* BNF Production Rules */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Code2 size={11} /> Formal Grammar — BNF Production Rules
              </h2>
              <pre className="text-[10px] leading-[1.9] overflow-x-auto" style={{ color: "#c4b5fd" }}>{`program      ::= statement*

statement    ::= field_def
               | channel_decl
               | entangle_stmt
               | resonate_stmt
               | propagate_stmt
               | absorb_stmt
               | emit_stmt
               | observe_stmt
               | collapse_stmt
               | comment

field_def    ::= "field" IDENT "(" param_list? ")" ("→" type)? "{" statement* "}"
param_list   ::= param ("," param)*
param        ::= "channel" IDENT ":" type

channel_decl ::= "channel" IDENT (":=" expr)? ("∿" TEXT)?

resonate_stmt ::= "resonate" "when" expr "{" statement* "}"
propagate_stmt::= "propagate" "over" expr "{" statement* "}"
entangle_stmt ::= "entangle" psi "→" psi  ("∿" TEXT)?
absorb_stmt  ::= "absorb" "(" nm_or_psi ")"  ("∿" TEXT)?
emit_stmt    ::= "emit" expr ("→" psi)?
observe_stmt ::= "observe" expr ("←" expr)?
collapse_stmt::= "collapse" expr

comment      ::= "∿" TEXT

type         ::= "@" FLOAT "nm"              ∿ spectral band type
               | "Fock"                       ∿ occupation number |n⟩
               | "Joules"                     ∿ scalar energy
               | psi                          ∿ channel reference
               | IDENT                        ∿ named type

psi          ::= "Ψ(" INT "," INT "," POL ")"
POL          ::= "H" | "V"
nm_or_psi    ::= FLOAT "nm" | psi
expr         ::= literal | IDENT | psi | call | binary_op
call         ::= IDENT "." IDENT "(" args? ")"
args         ::= expr ("," expr)*
literal      ::= INT | FLOAT | STRING | "|" INT "⟩"   ∿ Fock state literal`}</pre>
            </div>

            {/* Keyword table */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap size={11} /> Keyword Reference — v2.0
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["Keyword", "Physics operator", "Classical equiv.", "Description"].map(h => (
                        <th key={h} className="text-left text-white/20 py-2 pr-6 font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { kw: "channel",       phys: "—",        cls: "var / let",      desc: "Declare a Ψ register. Holds a Fock state |n⟩ or typed value." },
                      { kw: "field",         phys: "—",        cls: "function / def", desc: "Define a named spectral operation. Returns collapse value." },
                      { kw: "emit",          phys: "â†  (â†)",   cls: "write / push",   desc: "Raise occupation number — add a quantum to the channel." },
                      { kw: "absorb",        phys: "â  (â)",   cls: "read / receive",  desc: "Lower occupation number — consume a quantum from the channel." },
                      { kw: "observe",       phys: "n̂ = â†â", cls: "read / measure",  desc: "Measure current Fock state without destroying it. |n⟩ → n." },
                      { kw: "resonate when", phys: "δ(cond)",  cls: "if",              desc: "Conditional resonance. Block executes only when condition is met." },
                      { kw: "propagate over",phys: "∑ₙ",       cls: "for / while",    desc: "Iterate over a set of states. Each step is a wave cycle." },
                      { kw: "collapse",      phys: "|Ψ⟩ → x", cls: "return",          desc: "Terminate and output. Wavefunction collapses to a classical value." },
                      { kw: "entangle",      phys: "|Φ⁺⟩",    cls: "bind / ref",      desc: "Create a Bell-state binding between two Ψ channels." },
                      { kw: "∿",            phys: "—",        cls: "// or #",         desc: "Comment — the wave symbol. Everything after is ignored." },
                    ].map(({ kw, phys, cls, desc }) => (
                      <tr key={kw}>
                        <td className="py-2.5 pr-6"><code className="text-violet-300 font-bold text-[11px]">{kw}</code></td>
                        <td className="py-2.5 pr-6 text-cyan-400/70 font-mono">{phys}</td>
                        <td className="py-2.5 pr-6 text-white/30">{cls}</td>
                        <td className="py-2.5 text-white/40 leading-relaxed">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fock-space type system */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Atom size={11} /> Type System — Fock Space
              </h2>
              <p className="text-white/25 text-[11px] leading-relaxed mb-4">
                WLS v2.0 is grounded in quantum field theory, not traditional type theory.
                Every value is an occupation number in a Hilbert space channel. The type annotation
                <code className="text-violet-300 mx-1">@540nm</code> doesn't just name a type —
                it specifies the physical wavelength where that data lives.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: "|0⟩", label: "Fock vacuum", desc: "null / zero / empty channel", col: "#6b7280" },
                  { type: "|1⟩", label: "Single quant", desc: "boolean / unit value", col: "#8b00ff" },
                  { type: "|n⟩", label: "Occupation n", desc: "integer / count", col: "#2563eb" },
                  { type: "|α⟩", label: "Coherent state", desc: "float / continuous", col: "#06b6d4" },
                  { type: "@Xnm", label: "Spectral type", desc: "data at wavelength X", col: "#16a34a" },
                  { type: "Ψ(w,o,p)", label: "Channel ref", desc: "pointer to Ψ register", col: "#ca8a04" },
                  { type: "Fock", label: "Any Fock state", desc: "untyped quantum value", col: "#ea580c" },
                  { type: "Joules", label: "Energy scalar", desc: "hf — classical bridge", col: "#dc2626" },
                ].map(({ type, label, desc, col }) => (
                  <div key={type} className="border border-white/5 rounded-lg p-3" style={{ background: col + "08" }}>
                    <code className="text-[13px] font-bold block mb-1" style={{ color: col }}>{type}</code>
                    <div className="text-[9px] font-semibold mb-0.5" style={{ color: col + "cc" }}>{label}</div>
                    <div className="text-[8px] text-white/25">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phase 1 Bridge Programs */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <h2 className="text-white/30 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-2">
                <Play size={11} /> Phase 1 — Bridge Programs
              </h2>
              <p className="text-white/20 text-[10px] mb-4">
                These are the simple, understood things the transpiler must handle: contracts, transfers,
                governance, wallet ops. Real WLS v2.0 syntax — paste into the Compiler tab to emit bytecode.
              </p>

              <div className="flex gap-2 mb-4 flex-wrap">
                {([
                  { id: "transfer",   label: "Token Transfer",    col: "#ca8a04" },
                  { id: "contract",   label: "Smart Contract",    col: "#2563eb" },
                  { id: "governance", label: "Governance Vote",   col: "#8b00ff" },
                  { id: "wallet",     label: "Wallet Balance",    col: "#16a34a" },
                ] as const).map(({ id, label, col }) => (
                  <button
                    key={id}
                    onClick={() => setGrammarExample(id)}
                    className="text-[9px] px-3 py-1 rounded-full border transition-all"
                    style={{
                      borderColor: grammarExample === id ? col + "80" : col + "25",
                      color: grammarExample === id ? col : col + "70",
                      background: grammarExample === id ? col + "15" : "transparent",
                    }}
                    data-testid={`button-grammar-${id}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <pre className="text-[10px] leading-relaxed overflow-x-auto p-4 rounded-xl border border-violet-400/10 font-mono"
                style={{ background: "rgba(139,0,255,0.04)", color: "#ddd6fe" }}>
                {grammarExample === "transfer"   ? SAMPLE_WLS_TRANSFER
                : grammarExample === "contract"  ? SAMPLE_WLS_CONTRACT
                : grammarExample === "governance"? SAMPLE_WLS_GOVERNANCE_V2
                : SAMPLE_WLS_WALLET_V2}
              </pre>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    const src = grammarExample === "transfer"    ? SAMPLE_WLS_TRANSFER
                              : grammarExample === "contract"   ? SAMPLE_WLS_CONTRACT
                              : grammarExample === "governance" ? SAMPLE_WLS_GOVERNANCE_V2
                              : SAMPLE_WLS_WALLET_V2;
                    setCompilerSrc(src);
                    setActiveTab("compiler");
                  }}
                  className="flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-lg border border-violet-400/30 text-violet-400/70 hover:text-violet-400 hover:border-violet-400/50 transition-all"
                  data-testid="button-load-in-compiler"
                >
                  <Cpu size={9} /> Load in Compiler →
                </button>
              </div>
            </div>

            {/* Unique syntax — looks like nothing else */}
            <div className="border border-amber-400/10 rounded-xl p-5" style={{ background: "rgba(251,191,36,0.02)" }}>
              <div className="text-amber-400/50 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Atom size={9} /> Why WLS Looks Like Nothing Else
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]">
                <div>
                  <div className="text-white/50 font-semibold mb-1">No assignment operator</div>
                  <div className="text-white/25 leading-relaxed">
                    <code className="text-violet-300">channel x := val</code> is a channel declaration, not assignment.
                    The <code className="text-violet-300">:=</code> symbol means "initialise the Fock state of this register."
                    You don't store a value — you prepare a quantum state.
                  </div>
                </div>
                <div>
                  <div className="text-white/50 font-semibold mb-1">Types are wavelengths</div>
                  <div className="text-white/25 leading-relaxed">
                    <code className="text-violet-300">@468nm</code> isn't a tag — it's the physical address where
                    that data lives in the EM spectrum. AUTH band (450–495nm). Change the wavelength,
                    change the authority tier.
                  </div>
                </div>
                <div>
                  <div className="text-white/50 font-semibold mb-1">Functions don't call — they resonate</div>
                  <div className="text-white/25 leading-relaxed">
                    <code className="text-violet-300">field</code> definitions declare a standing wave pattern.
                    Execution is resonance — the wavefunction propagates until <code className="text-violet-300">collapse</code>
                    makes the result classical.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB: TRANSPILER ─────────────────────────────────────────────── */}
        {activeTab === "transpiler" && (
          <div className="space-y-4">
            <div className="text-white/25 text-[11px] leading-relaxed">
              Paste any Python, JavaScript, or Rust code. The transpiler maps every symbol through CE→SE encoding
              to assign it a physical wavelength address, then rewrites the code in WavelengthScript syntax.
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Input */}
              <div className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <div className="flex gap-2">
                    {(["python", "javascript", "rust"] as const).map(l => (
                      <button key={l} onClick={() => setSrcLang(l)}
                        className={`text-[9px] uppercase px-2 py-1 rounded transition-all ${srcLang === l ? "text-violet-300 bg-violet-400/15 border border-violet-400/30" : "text-white/25 hover:text-white/50"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <span className="text-white/20 text-[9px]">Source</span>
                </div>
                <textarea
                  className="w-full bg-transparent p-4 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed"
                  rows={22}
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  placeholder="Paste your Python, JavaScript, or Rust code here…"
                  data-testid="textarea-source"
                  spellCheck={false}
                />
              </div>

              {/* Output */}
              <div className="border border-violet-400/20 rounded-xl overflow-hidden" style={{ background: "rgba(139,0,255,0.03)" }}>
                <div className="px-4 py-2.5 border-b border-violet-400/10 flex items-center justify-between">
                  <span className="text-violet-400/60 text-[9px] uppercase tracking-widest">WavelengthScript Output</span>
                  {output && (
                    <button onClick={copyOutput} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all">
                      <Copy size={9} /> {copied ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
                <pre className="p-4 text-[10px] text-violet-200/80 font-mono leading-relaxed overflow-auto h-[22rem] whitespace-pre-wrap">
                  {output || <span className="text-white/15">Click "Transpile →" to convert your code to WavelengthScript…</span>}
                </pre>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={runTranspile}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-400 font-bold text-sm hover:border-violet-400/70 hover:bg-violet-400/05 transition-all"
                data-testid="button-transpile"
              >
                <Play size={14} /> Transpile {srcLang} → WavelengthScript
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: COMPILER ───────────────────────────────────────────────── */}
        {activeTab === "compiler" && (
          <div className="space-y-4">
            <div className="text-white/25 text-[11px] leading-relaxed">
              Write WavelengthScript source and compile it to <span className="text-violet-300">WNSP bytecode</span> — 
              machine instructions that target Ψ channels directly. Each opcode carries a wavelength operand:
              the CPU is the electromagnetic spectrum, registers are spectral channels.
            </div>

            {/* Sample programs picker */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white/20 text-[9px] uppercase tracking-widest mr-1">Load sample:</span>
              {([
                { label: "AI Agent",           src: SAMPLE_WLS,               col: "#a78bfa" },
                { label: "Governance v1",      src: SAMPLE_WLS_GOVERNANCE,    col: "#2563eb" },
                { label: "P2P Transfer",       src: SAMPLE_WLS_P2P,           col: "#06b6d4" },
                { label: "Spectral Wallet",    src: SAMPLE_WLS_WALLET,        col: "#ca8a04" },
                { label: "Transfer v2.0",      src: SAMPLE_WLS_TRANSFER,      col: "#f59e0b" },
                { label: "Contract v2.0",      src: SAMPLE_WLS_CONTRACT,      col: "#3b82f6" },
                { label: "Governance v2.0",    src: SAMPLE_WLS_GOVERNANCE_V2, col: "#8b00ff" },
                { label: "Wallet v2.0",        src: SAMPLE_WLS_WALLET_V2,     col: "#22c55e" },
              ]).map(({ label, src, col }) => (
                <button
                  key={label}
                  onClick={() => { setCompilerSrc(src); setCompiled(null); }}
                  className="text-[9px] px-2.5 py-1 rounded-full border transition-all hover:opacity-90"
                  style={{ borderColor: col + "40", color: col, background: col + "10" }}
                  data-testid={`button-sample-${label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Input */}
              <div className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
                <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                  <span className="text-white/40 text-[9px] uppercase tracking-widest">WavelengthScript Source</span>
                  <span className="text-[8px] text-violet-400/40">WLS v2.0</span>
                </div>
                <textarea
                  className="w-full bg-transparent p-4 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed"
                  rows={22}
                  value={compilerSrc}
                  onChange={e => setCompilerSrc(e.target.value)}
                  placeholder="Write WavelengthScript here…"
                  data-testid="textarea-compiler-source"
                  spellCheck={false}
                />
              </div>

              {/* Output */}
              <div className="border border-violet-400/20 rounded-xl overflow-hidden flex flex-col" style={{ background: "rgba(139,0,255,0.03)" }}>
                <div className="px-4 py-2.5 border-b border-violet-400/10 flex items-center justify-between flex-shrink-0">
                  <div className="flex gap-1">
                    {(["asm", "hex", "manifest"] as const).map(v => (
                      <button key={v} onClick={() => setCompileView(v)}
                        className={`text-[9px] uppercase px-2 py-1 rounded transition-all ${compileView === v ? "text-violet-300 bg-violet-400/15 border border-violet-400/30" : "text-white/25 hover:text-white/50"}`}
                        data-testid={`button-view-${v}`}>
                        {v === "asm" ? "Assembly" : v === "hex" ? "Hex Dump" : "Manifest"}
                      </button>
                    ))}
                  </div>
                  {compiled && (
                    <button onClick={() => {
                      const txt = compileView === "asm" ? compiled.assembly : compileView === "hex" ? compiled.hex : compiled.manifest.map(s => `${s.symbol} → ${s.nm}nm ${s.psi} [${s.band}]`).join("\n");
                      navigator.clipboard.writeText(txt);
                      setCopiedBc(true); setTimeout(() => setCopiedBc(false), 1500);
                    }} className="flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all">
                      <Copy size={9} /> {copiedBc ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-auto">
                  {!compiled ? (
                    <div className="p-4 text-white/15 text-[10px] text-center py-16">Click "Compile → Bytecode" to emit WNSP instructions</div>
                  ) : compileView === "asm" ? (
                    <pre className="p-4 text-[9.5px] text-violet-200/80 font-mono leading-relaxed whitespace-pre">{compiled.assembly}</pre>
                  ) : compileView === "hex" ? (
                    <pre className="p-4 text-[9.5px] text-emerald-300/70 font-mono leading-relaxed whitespace-pre">{compiled.hex}</pre>
                  ) : (
                    <div className="p-4 space-y-2">
                      {compiled.manifest.length === 0 ? (
                        <div className="text-white/20 text-[10px]">No named symbols found.</div>
                      ) : compiled.manifest.map(s => {
                        const col = nmToColor(s.nm);
                        return (
                          <div key={s.symbol} className="flex items-center gap-3 border border-white/5 rounded-lg px-3 py-2" style={{ background: col + "06" }}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold truncate" style={{ color: col }}>{s.symbol}</div>
                              <div className="text-[8px] text-white/30">{s.psi}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[10px] font-bold" style={{ color: col }}>{s.nm}nm</div>
                              <div className="text-[8px] px-1 rounded" style={{ background: col + "20", color: col }}>{s.band}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compile button + stats */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCompiled(compileWLS(compilerSrc))}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-400 font-bold text-sm hover:border-violet-400/70 hover:bg-violet-400/05 transition-all"
                data-testid="button-compile"
              >
                <Cpu size={14} /> Compile → WNSP Bytecode
              </button>
              {compiled && (
                <div className="flex items-center gap-6 text-[10px] text-white/30">
                  <span><span className="text-violet-400 font-bold">{compiled.instrCount}</span> instructions</span>
                  <span><span className="text-cyan-400 font-bold">{compiled.manifest.length}</span> Ψ channels</span>
                  <span className="text-white/15">· targeting spectral execution model</span>
                </div>
              )}
            </div>

            {/* Opcode reference */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4">WNSP Opcode Reference</div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {[
                  { op: "01 TUNE",  desc: "Set receiver to λ",        col: "#06b6d4" },
                  { op: "02 PUSH",  desc: "Bind value at wavelength",  col: "#a78bfa" },
                  { op: "03 EMIT",  desc: "Broadcast on Ψ channel",    col: "#f59e0b" },
                  { op: "05 BROAD", desc: "Band-wide broadcast",       col: "#f97316" },
                  { op: "06 OCS",   desc: "Oscillate — wave loop",     col: "#16a34a" },
                  { op: "07 LABEL", desc: "Function address in Ψ",     col: "#8b00ff" },
                  { op: "08 JMPZ",  desc: "Conditional photon branch", col: "#dc2626" },
                  { op: "0A AGENT", desc: "Register spectral agent",   col: "#0ea5e9" },
                  { op: "0B EXEC",  desc: "Generic spectral exec",     col: "#6b7280" },
                  { op: "FE RET",   desc: "Scope end — wave collapses",col: "#4b5563" },
                  { op: "FF HALT",  desc: "Wavefunction terminated",   col: "#374151" },
                ].map(({ op, desc, col }) => (
                  <div key={op} className="border border-white/5 rounded-lg p-2.5">
                    <code className="text-[9px] font-bold block mb-1" style={{ color: col }}>{op}</code>
                    <div className="text-[8px] text-white/30 leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: AI INTEGRATION ─────────────────────────────────────────── */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="text-white/25 text-[11px] leading-relaxed">
              AI agents in WavelengthScript are not processes — they are nodes on the spectral network.
              Each agent registers at its CE→SE wavelength. Other agents or humans discover and interact with
              it by tuning to that band. The agent's name IS its address.
            </div>

            {/* AI architecture diagram */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Cpu size={11} /> Standard AI Agent Architecture on the Wave
              </div>
              <div className="grid grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden">
                {[
                  { step: "1. Define", code: 'agent = Agent(\n  name="ReasoningCore",\n  band="LOGIC",   // 520–564nm\n  model=my_llm\n)', color: "#16a34a" },
                  { step: "2. Register", code: 'agent.register()\n// CE→SE: "ReasoningCore"\n// → 541nm\n// → Ψ(41,12,V)\n// → discoverable on network', color: "#06b6d4" },
                  { step: "3. Listen & emit", code: '@agent.on_signal("Ψ(41,12,V)")\ndef handle(prompt):\n  result = model.infer(prompt)\n  agent.emit(result)\n  // → 541nm broadcast', color: "#8b00ff" },
                ].map(({ step, code, color }) => (
                  <div key={step} className="p-4 bg-black/60">
                    <div className="text-[9px] font-bold mb-2" style={{ color }}>{step}</div>
                    <pre className="text-[9px] text-white/50 leading-relaxed overflow-x-auto">{code}</pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-built AI channel map */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Radio size={11} /> Recommended AI Agent Channels
              </div>
              <div className="text-white/20 text-[9px] mb-4">
                These are suggested standard channels for common AI functions. Register your agent at these frequencies
                so other systems know where to find it.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AI_CHANNELS.map(a => {
                  const col = nmToColor(a.nm);
                  return (
                    <div key={a.agent} className="border rounded-xl p-4" style={{ borderColor: col + "25", background: col + "06" }}>
                      <div className="text-[10px] font-bold mb-1" style={{ color: col }}>{a.agent}</div>
                      <div className="flex gap-1.5 mb-2 flex-wrap">
                        <span className="text-[8px] px-1.5 py-0.5 rounded border" style={{ borderColor: col + "30", color: col }}>{a.nm}nm</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-white/30">{a.psi}</span>
                      </div>
                      <div className="text-[9px] text-white/30">{a.role}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WLS AI example */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Code2 size={11} /> Complete WLS AI Agent — WavelengthScript Native
              </div>
              <pre className="text-[10px] text-violet-200/80 leading-relaxed overflow-x-auto p-4 rounded-xl border border-violet-400/10"
                style={{ background: "rgba(139,0,255,0.04)" }}>
{`// WavelengthScript v1.0 · AGPL-3.0
// AI Agent: ReasoningCore

tune(540nm)  // lock receiver to LOGIC band

@emit(541.2nm, Ψ(41,12,V))
agent ReasoningCore {
  @468nm model   := load("my-llm")        // AUTH band — trusted model
  @648nm memory  := VectorStore.connect()  // STORAGE band — long-term memory
  @501nm stream  := StreamParser.new()     // STREAM band — token streaming

  // Main inference loop
  oscillate(Ψ(41,12,V), 0Hz) {
    let prompt := tune(Ψ(41,12,V))         // receive from this channel
    let context := memory.retrieve(prompt)  // pull relevant memories
    let tokens := model.infer(prompt, context)

    // Stream tokens to output channel
    stream.pipe(tokens, Ψ(49,21,V))        // → OutputEmitter channel

    // Store interaction in memory
    memory.store(@648nm {
      prompt: prompt,
      response: tokens.collect(),
    })
  }
}

// Register on spectral network — discoverable by other agents
node.register("ReasoningCore", @541.2nm)
`}
              </pre>
            </div>
          </div>
        )}

        {/* ── TAB: SDK ────────────────────────────────────────────────────── */}
        {activeTab === "sdk" && (
          <div className="space-y-6">
            <div className="text-white/25 text-[11px] leading-relaxed">
              You don't need to rewrite everything in WavelengthScript. The SDK lets you call NexusOS from
              your existing Python, JavaScript, or Rust codebase. Your code gains spectral addressing, agent
              registration, and Ψ channel messaging without changing your language.
            </div>

            <div className="grid grid-cols-1 gap-4">
              {FROM_LANGS.map(l => (
                <div key={l.lang} className="border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.01)" }}>
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 size={11} className="text-violet-400/60" />
                      <span className="text-[11px] font-bold text-violet-300">{l.lang}</span>
                    </div>
                    <span className="text-white/20 text-[9px]">{l.desc}</span>
                  </div>
                  <pre className="p-5 text-[10px] text-white/60 leading-relaxed overflow-x-auto font-mono">{l.snippet}</pre>
                </div>
              ))}
            </div>

            {/* SDK method table */}
            <div className="border border-white/10 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen size={11} /> SDK Method Reference
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-white/25 py-2 pr-4 font-normal">Method</th>
                      <th className="text-left text-white/25 py-2 pr-4 font-normal">Python</th>
                      <th className="text-left text-white/25 py-2 pr-4 font-normal">JavaScript</th>
                      <th className="text-left text-white/25 py-2 font-normal">What it does</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { m: "Register agent",    py: "Agent(name, band)",       js: "new Agent({name,wavelength})", desc: "Create & register a node on the spectral network" },
                      { m: "Listen for signals",py: "@on_signal(psi)",          js: "agent.on('signal', fn)",       desc: "Subscribe to a Ψ channel — fires on every emit to that channel" },
                      { m: "Emit output",       py: "agent.emit(result)",       js: "agent.emit(result)",           desc: "Broadcast your output to the channel at your wavelength" },
                      { m: "CE→SE encode",      py: "nexusos.encode(text)",     js: "NexusOS.encode(text)",         desc: "Get the wavelength address for any word or phrase" },
                      { m: "Query nodes",       py: "nexusos.nodes(band)",      js: "NexusOS.nodes(band)",          desc: "List all nodes visible in a given spectral band" },
                      { m: "Send message",      py: "nexusos.send(psi, msg)",   js: "NexusOS.send(psi, msg)",       desc: "Send a message to any Ψ channel" },
                      { m: "Tune (receive)",    py: "nexusos.tune(nm)",         js: "NexusOS.tune(nm)",             desc: "Start listening at a specific wavelength" },
                    ].map(({ m, py, js, desc }) => (
                      <tr key={m}>
                        <td className="py-2 pr-4 text-white/50 font-semibold">{m}</td>
                        <td className="py-2 pr-4"><code className="text-violet-300">{py}</code></td>
                        <td className="py-2 pr-4"><code className="text-cyan-300">{js}</code></td>
                        <td className="py-2 text-white/25">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Link to network */}
            <div className="border border-emerald-400/15 rounded-xl p-5 flex items-center justify-between" style={{ background: "rgba(74,222,128,0.03)" }}>
              <div>
                <div className="text-emerald-400/70 text-[10px] font-bold uppercase tracking-widest mb-1">Register your agent as a network node</div>
                <div className="text-white/25 text-[10px]">
                  Once your agent is running, register it on the Spectral Network so other agents and humans can discover it by tuning to its wavelength.
                </div>
              </div>
              <Link href="/network">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-400/50 transition-all text-[10px] font-bold flex-shrink-0 ml-4"
                  data-testid="button-goto-network">
                  Open Network <ChevronRight size={11} />
                </button>
              </Link>
            </div>

            {/* AGPL footer */}
            <div className="text-center space-y-1">
              <div className="text-white/20 text-[9px] uppercase tracking-widest">AGPL-3.0 · Specification published April 2026</div>
              <div className="text-white/15 text-[9px]">
                The WavelengthScript specification, CE→SE encoding standard, and all NexusOS SDKs are free, open infrastructure.
                Every implementation must publish source. The address space of light belongs to all civilisations.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
