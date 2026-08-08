// ── WNSP VM — Server-Side Execution Engine v1.1 ──────────────────────────────
// Canonical WavelengthScript compiler + VM. No browser deps.
// v1.1 adds: STORE/LOAD (persistent state), XFER_NXT/XFER_SATS (transfers),
//            CALL (sub-contract invocation).

// ── Physics helpers ───────────────────────────────────────────────────────────
export function nmToBand(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}

export function ceEncode(name: string): { nm: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a, b) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a, b) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})`, band: nmToBand(nm) };
}

// ── Instruction types ─────────────────────────────────────────────────────────
export interface Ins {
  off: number; op: number; mnem: string; args: string;
  nm?: number; ch?: string; cmt: string;
  gateThreshold?: number; gateHigh?: number; gateLow?: number;
  storeKey?: string; storeVal?: string;
  xferAmount?: string;
  squeezeR?: number;
}

// ── Side effects ─────────────────────────────────────────────────────────────
// Collected during execution; dispatched by the route handler after VM halts.
// Financial effects (XFER_*) and SUBCALL are handled in the route handler.
// Kernel effects (AGENT_REGISTER, KERNEL_EMIT, KERNEL_BROAD) go to fireEffects().
export interface StepEffect {
  type: "AGENT_REGISTER" | "KERNEL_EMIT" | "KERNEL_BROAD"
      | "STATE_WRITE"
      | "XFER_NXT" | "XFER_SATS"
      | "SUBCALL";
  // shared
  name?: string;
  nm?: number;
  psi?: string;
  args?: string;
  // STATE_WRITE
  key?: string;
  value?: any;
  // XFER_NXT / XFER_SATS
  to?: string;
  amount?: string;
  // SUBCALL
  slug?: string;
}

export interface VMRegister { nm: number; name: string; value: string; band: string; }
export interface VMAgent   { name: string; nm: number; psi: string; status: "ACTIVE" | "IDLE"; }
export interface VMOutput  {
  text: string;
  type: "sys" | "emit" | "broad" | "agent" | "gate" | "err" | "store" | "xfer" | "call";
}

export interface VMState {
  pc: number;
  registers: VMRegister[];
  agents:    VMAgent[];
  output:    VMOutput[];
  tuned:     number;
  halted:    boolean;
  cycleCount: number;
  kvStore:   Record<string, any>;   // loaded from contract_state before run
  kvDirty:   Record<string, any>;   // keys written during this execution
}

export function freshVM(initialState?: Record<string, any>): VMState {
  return {
    pc: 0, registers: [], agents: [], output: [],
    tuned: 520, halted: false, cycleCount: 0,
    kvStore: initialState ?? {}, kvDirty: {},
  };
}

// ── WavelengthScript compiler ─────────────────────────────────────────────────
export function compileWLS(src: string): Ins[] {
  if (!src.trim()) return [];
  const ins: Ins[] = [];
  let off = 0;
  function add(op: number, mnem: string, args: string, cmt: string, nm?: number, ch?: string, extra?: Partial<Ins>) {
    ins.push({ off, op, mnem, args, nm, ch, cmt, ...extra });
    if (op !== 0x00) off += 8;
  }
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith(";") || line.startsWith("#")) continue;

    // 0x09 GATE — nonlinear load-based routing
    const mGate = line.match(/GATE\(load\s*>\s*(\d+)\s*→\s*(\d+\.?\d*)nm\s*:\s*(\d+\.?\d*)nm\)/);
    if (mGate) { add(0x09, "GATE", `load>${mGate[1]} → ${mGate[2]}nm : ${mGate[3]}nm`, "nonlinear switch", undefined, undefined, { gateThreshold: parseInt(mGate[1]), gateHigh: parseFloat(mGate[2]), gateLow: parseFloat(mGate[3]) }); continue; }

    // 0x03 EMIT — spectral emission
    const m1 = line.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);
    if (m1) { add(0x03, "EMIT", `λ=${m1[1]}nm  ${m1[2]}`, `emit on ${nmToBand(parseFloat(m1[1]))} band`, parseFloat(m1[1]), m1[2]); continue; }

    // 0x01 TUNE — receiver band
    const m2 = line.match(/tune\((\d+\.?\d*)nm\)/);
    if (m2) { add(0x01, "TUNE", `λ=${m2[1]}nm`, `receiver → ${nmToBand(parseFloat(m2[1]))} band`, parseFloat(m2[1])); continue; }

    // 0x0A AGENT — agent registration
    const m3 = line.match(/^agent\s+(\w+)/);
    if (m3) { const e = ceEncode(m3[1]); add(0x0A, "AGENT", `"${m3[1]}"  ${e.psi}`, `AI agent λ=${e.nm}nm`, e.nm, e.psi); continue; }

    // 0x07 LABEL — function scope
    const m4 = line.match(/^fn\s+(\w+)/);
    if (m4) { const e = ceEncode(m4[1]); add(0x07, "LABEL", `${m4[1]}  ${e.psi}`, `fn → λ=${e.nm}nm`, e.nm, e.psi); continue; }

    // 0x0A AGENT — public node
    const m5 = line.match(/node\.register\("([^"]+)"/);
    if (m5) { const e = ceEncode(m5[1]); add(0x0A, "AGENT", `"${m5[1]}"  ${e.psi}  PUBLIC`, "spectral network node", e.nm, e.psi); continue; }

    // 0x06 OCS — oscillating loop
    const m6 = line.match(/oscillate\(([^)]+)\)/);
    if (m6) { add(0x06, "OCS", m6[1].trim(), "non-blocking wave loop"); continue; }

    // 0x05 BROAD — broadcast
    const m7 = line.match(/broadcast\(([^)]+)\)/);
    if (m7) { const e = ceEncode(m7[1].replace(/[^a-zA-Z]/g, "") || "data"); add(0x05, "BROAD", m7[1].trim(), `broadcast λ=${e.nm}nm`, e.nm); continue; }

    // 0x02 PUSH — register bind
    const m8 = line.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);
    if (m8) { add(0x02, "PUSH", `@${m8[1]}nm  "${m8[2]}"`, `bind at λ=${m8[1]}nm`, parseFloat(m8[1])); continue; }

    // 0x03 EMIT (shorthand)
    const m9 = line.match(/^\s*emit\s+(.+)/);
    if (m9) { const e = ceEncode(m9[1].replace(/[^a-zA-Z]/g, "") || "out"); add(0x03, "EMIT", m9[1].trim(), `output at λ=${e.nm}nm`, e.nm); continue; }

    // 0x08 JMPZ — branch
    if (line.startsWith("?λ ")) { add(0x08, "JMPZ", line.slice(3).trim(), "photon path branch"); continue; }

    // 0xFE RET — scope end
    if (line === "}" || line.match(/^end\b/)) { add(0xFE, "RET", "", "scope end — wave collapses"); continue; }

    // ── v1.1 opcodes ─────────────────────────────────────────────────────────

    // 0x10 STORE — persist key to contract_state
    const mStoreAssign = line.match(/^@store\s+(\w+)\s*:=\s*(.+)/);
    if (mStoreAssign) {
      const val = mStoreAssign[2].trim().replace(/^["']|["']$/g, "");
      add(0x10, "STORE", `${mStoreAssign[1]} := ${val}`, `persist ${mStoreAssign[1]} → contract_state`, undefined, undefined, { storeKey: mStoreAssign[1], storeVal: val });
      continue;
    }
    const mStoreRef = line.match(/^@store\s+(\w+)\s*$/);
    if (mStoreRef) {
      add(0x10, "STORE", mStoreRef[1], `persist register → contract_state`, undefined, undefined, { storeKey: mStoreRef[1] });
      continue;
    }

    // 0x11 LOAD — restore key from contract_state
    const mLoad = line.match(/^@load\s+(\w+)/);
    if (mLoad) { add(0x11, "LOAD", mLoad[1], `restore ${mLoad[1]} ← contract_state`); continue; }

    // 0x12 XFER_NXT — transfer NXT from contract wallet
    const mXferNxt = line.match(/^transfer_nxt\("([^"]+)",\s*"([^"]+)"\)/);
    if (mXferNxt) {
      add(0x12, "XFER_NXT", `"${mXferNxt[1]}"  ${mXferNxt[2]}`, `transfer ${mXferNxt[2]} NXT → ${mXferNxt[1]}`, undefined, mXferNxt[1], { xferAmount: mXferNxt[2] });
      continue;
    }

    // 0x13 XFER_SATS — transfer sats from contract wallet
    const mXferSats = line.match(/^transfer_sats\("([^"]+)",\s*"([^"]+)"\)/);
    if (mXferSats) {
      add(0x13, "XFER_SATS", `"${mXferSats[1]}"  ${mXferSats[2]}`, `transfer ${mXferSats[2]} sats → ${mXferSats[1]}`, undefined, mXferSats[1], { xferAmount: mXferSats[2] });
      continue;
    }

    // 0x15 SQZ — Bogoliubov squeeze of the tuned channel: Λ_B = Λ₀·cosh(2r)
    const mSqz = line.match(/^squeeze\((-?\d+\.?\d*)\)/);
    if (mSqz) {
      const r = parseFloat(mSqz[1]);
      add(0x15, "SQZ", `r=${r}`, `Bogoliubov squeeze — Λ_B = Λ₀·cosh(${(2 * r).toFixed(2)})`, undefined, undefined, { squeezeR: r });
      continue;
    }

    // 0x14 CALL — invoke sub-contract by slug
    const mCall = line.match(/^call\("([^"]+)"\)/);
    if (mCall) { add(0x14, "CALL", `"${mCall[1]}"`, `call sub-contract "${mCall[1]}"`); continue; }

    // 0x0B EXEC — default fallback
    const word = line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op";
    const e = ceEncode(word);
    add(0x0B, "EXEC", `@${e.nm}nm`, line.slice(0, 60), e.nm);
  }
  add(0xFF, "HALT", "", "wavefunction terminated");
  return ins;
}

// ── Single-step executor ──────────────────────────────────────────────────────
export function stepVM(
  state: VMState,
  ins: Ins[],
  channelLoad: number,
): { state: VMState; effect: StepEffect | null } {
  if (state.halted || state.pc >= ins.length) return { state: { ...state, halted: true }, effect: null };
  const i = ins[state.pc];
  const s: VMState = {
    ...state,
    pc: state.pc + 1,
    cycleCount: state.cycleCount + 1,
    registers: [...state.registers],
    agents:    [...state.agents],
    output:    [...state.output],
    kvDirty:   { ...state.kvDirty },
  };
  let effect: StepEffect | null = null;

  switch (i.op) {
    case 0x01:
      s.tuned = i.nm ?? s.tuned;
      s.output.push({ text: `TUNE  λ=${i.nm}nm → ${nmToBand(i.nm ?? s.tuned)} band`, type: "sys" });
      break;

    case 0x02: {
      const regName = i.args.replace(/.*"([^"]+)".*/, "$1");
      s.registers = s.registers.filter(r => r.nm !== (i.nm ?? s.tuned));
      s.registers.push({ nm: i.nm ?? s.tuned, name: regName, value: `@${i.nm}nm`, band: nmToBand(i.nm ?? s.tuned) });
      s.output.push({ text: `PUSH  ${regName} → Ψ-register λ=${i.nm}nm [${nmToBand(i.nm ?? s.tuned)}]`, type: "sys" });
      break;
    }

    case 0x03:
      s.output.push({ text: `EMIT  λ=${i.nm}nm  ${i.ch ?? ""}  → ${nmToBand(i.nm ?? s.tuned)} band`, type: "emit" });
      effect = { type: "KERNEL_EMIT", nm: i.nm, psi: i.ch, args: i.args };
      break;

    case 0x05:
      s.output.push({ text: `BROAD  ${i.args}  → all Ψ subscribers`, type: "broad" });
      effect = { type: "KERNEL_BROAD", args: i.args, nm: i.nm };
      break;

    case 0x06:
      s.output.push({ text: `OCS   ${i.args}  — oscillating wave loop`, type: "sys" });
      break;

    case 0x07:
      s.output.push({ text: `LABEL  fn:${i.args}  @ λ=${i.nm}nm`, type: "sys" });
      break;

    case 0x08:
      s.output.push({ text: `JMPZ  ${i.args}  — photon path branch`, type: "sys" });
      break;

    case 0x09: {
      const thr = i.gateThreshold ?? 50;
      const hi  = i.gateHigh ?? s.tuned;
      const lo  = i.gateLow  ?? s.tuned;
      const fired = channelLoad > thr;
      const routedNm = fired ? hi : lo;
      s.tuned = routedNm;
      s.output.push({ text: `GATE  load=${channelLoad} ${fired ? ">" : "≤"} ${thr}  →  ${routedNm}nm [${nmToBand(routedNm)}]  ${fired ? "⚡ HIGH PATH" : "〰 LOW PATH"}`, type: "gate" });
      break;
    }

    case 0x0A: {
      const aName = i.args.replace(/"([^"]+)".*/, "$1");
      if (!s.agents.find(a => a.name === aName)) {
        s.agents.push({ name: aName, nm: i.nm ?? s.tuned, psi: i.ch ?? "Ψ(0,0,H)", status: "ACTIVE" });
      }
      s.output.push({ text: `AGENT  "${aName}"  registered @ ${i.ch}`, type: "agent" });
      effect = { type: "AGENT_REGISTER", name: aName, nm: i.nm, psi: i.ch };
      break;
    }

    case 0x0B:
      s.output.push({ text: `EXEC  ${i.cmt.slice(0, 60)}`, type: "sys" });
      break;

    // ── v1.1 opcodes ─────────────────────────────────────────────────────────

    case 0x10: {
      // STORE — write key:value to persistent contract_state
      const key = i.storeKey ?? i.args.split(" ")[0];
      const val = i.storeVal ?? `@${s.tuned}nm`;
      s.kvDirty[key] = val;
      s.output.push({ text: `STORE  ${key} := "${val}"  → contract_state`, type: "store" });
      effect = { type: "STATE_WRITE", key, value: val };
      break;
    }

    case 0x11: {
      // LOAD — read key from contract_state (kvStore) or session writes (kvDirty)
      const key = i.args;
      const val = s.kvStore[key] ?? s.kvDirty[key] ?? null;
      s.output.push({ text: `LOAD  ${key} ← ${val !== null ? `"${JSON.stringify(val)}"` : "(not set — initialise with @store)"}  from contract_state`, type: "store" });
      break;
    }

    case 0x12: {
      // XFER_NXT — emit transfer intent; route handler executes the debit
      const to  = i.ch ?? "unknown";
      const amt = i.xferAmount ?? "0";
      s.output.push({ text: `XFER_NXT  ${amt} NXT → ${to}`, type: "xfer" });
      effect = { type: "XFER_NXT", to, amount: amt };
      break;
    }

    case 0x13: {
      // XFER_SATS — same but in sats
      const to  = i.ch ?? "unknown";
      const amt = i.xferAmount ?? "0";
      s.output.push({ text: `XFER_SATS  ${amt} sats → ${to}`, type: "xfer" });
      effect = { type: "XFER_SATS", to, amount: amt };
      break;
    }

    case 0x14: {
      // CALL — emit sub-contract invocation; route handler resolves and runs it
      const slug = i.args.replace(/"/g, "");
      s.output.push({ text: `CALL  "${slug}"  → loading sub-contract…`, type: "call" });
      effect = { type: "SUBCALL", slug };
      break;
    }

    case 0x15: {
      // SQZ — Bogoliubov squeeze of the tuned channel (Claim 36)
      const r = Math.max(-10, Math.min(10, i.squeezeR ?? 0));
      const H = 6.62607015e-34, C = 299792458;
      const f = C / (s.tuned * 1e-9);
      const lambda0 = (H * f) / (2 * C * C);
      const gain = Math.cosh(2 * r);
      s.output.push({
        text: `SQZ   r=${r}  λ=${s.tuned}nm  Λ₀=${lambda0.toExponential(3)}kg → Λ_B=${(lambda0 * gain).toExponential(3)}kg  (gain cosh(2r)=${gain.toFixed(4)})`,
        type: "sys",
      });
      break;
    }

    case 0xFE:
      s.output.push({ text: `RET   — wave collapses, scope exits`, type: "sys" });
      break;

    case 0xFF:
      s.halted = true;
      s.output.push({ text: `HALT  — wavefunction terminated  (${s.cycleCount} cycles)`, type: "sys" });
      break;

    default:
      break;
  }
  return { state: s, effect };
}

// ── Run to HALT — synchronous, no I/O ────────────────────────────────────────
const MAX_CYCLES = 10_000;

export interface ExecutionResult {
  instructions:     Ins[];
  output:           VMOutput[];
  registers:        VMRegister[];
  agents:           VMAgent[];
  cycleCount:       number;
  halted:           boolean;
  psiChannel:       string;
  wavelengthNm:     number;
  effects:          StepEffect[];
  instructionCount: number;
  truncated:        boolean;
  stateDelta:       Record<string, any>;  // keys written this run → persist to contract_state
}

export function runToHalt(
  sourceCode:   string,
  channelLoad:  number,
  initialState?: Record<string, any>,
): ExecutionResult {
  const instructions = compileWLS(sourceCode);
  const { nm, psi } = ceEncode(sourceCode.slice(0, 32) || "contract");
  let state = freshVM(initialState);
  const effects: StepEffect[] = [];
  let truncated = false;

  while (!state.halted && state.cycleCount < MAX_CYCLES) {
    const { state: next, effect } = stepVM(state, instructions, channelLoad);
    state = next;
    if (effect) effects.push(effect);
  }
  if (!state.halted) {
    truncated = true;
    state.output.push({ text: `TRUNCATED — execution capped at ${MAX_CYCLES} cycles`, type: "err" });
  }

  return {
    instructions,
    output:           state.output,
    registers:        state.registers,
    agents:           state.agents,
    cycleCount:       state.cycleCount,
    halted:           state.halted,
    psiChannel:       psi,
    wavelengthNm:     nm,
    effects,
    instructionCount: instructions.filter(i => i.op !== 0x00).length,
    truncated,
    stateDelta:       state.kvDirty,
  };
}

// ── Fire kernel side-effects — post-halt, non-blocking ───────────────────────
// Handles: AGENT_REGISTER → Python coordinator + wnsp_kernel_events
//          KERNEL_EMIT / KERNEL_BROAD → wnsp_kernel_events
// XFER_NXT, XFER_SATS, SUBCALL, STATE_WRITE are handled by the route handler.
export async function fireEffects(
  effects:      StepEffect[],
  pool:         any,
  contractName: string,
  executionId:  string,
  contractId:   string,
): Promise<void> {
  const now = Date.now() / 1000;
  for (const fx of effects) {
    try {
      if (fx.type === "AGENT_REGISTER" && fx.name) {
        await fetch("http://localhost:5001/api/wnsp/agent/allocate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ agent_name: fx.name, intent: "contract_agent" }),
          signal:  AbortSignal.timeout(3000),
        }).catch(() => null);
        await pool.query(
          `INSERT INTO wnsp_kernel_events (event_type, agent_id, detail, created_at)
           VALUES ($1, $2, $3, $4)`,
          ["AGENT_REGISTERED", fx.name, JSON.stringify({ contract_id: contractId, execution_id: executionId, psi: fx.psi, nm: fx.nm, source: "contract_exec" }), now]
        );
      } else if (fx.type === "KERNEL_EMIT") {
        await pool.query(
          `INSERT INTO wnsp_kernel_events (event_type, agent_id, detail, created_at)
           VALUES ($1, $2, $3, $4)`,
          ["CONTRACT_EMIT", contractName, JSON.stringify({ contract_id: contractId, execution_id: executionId, nm: fx.nm, psi: fx.psi, args: fx.args }), now]
        );
      } else if (fx.type === "KERNEL_BROAD") {
        await pool.query(
          `INSERT INTO wnsp_kernel_events (event_type, agent_id, detail, created_at)
           VALUES ($1, $2, $3, $4)`,
          ["CONTRACT_BROAD", contractName, JSON.stringify({ contract_id: contractId, execution_id: executionId, args: fx.args }), now]
        );
      }
    } catch (e: any) {
      console.warn(`[WNSP VM] Side-effect ${fx.type} failed:`, e.message);
    }
  }
}
