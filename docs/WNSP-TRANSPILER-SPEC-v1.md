# WNSP Language Transpiler — Specification v1.0
**Status:** Ratified  
**Scope:** `server/lang-transpiler.ts` · `POST /api/dev/transpile` · `POST /api/ide/transpile`  
**License:** AGPL-3.0 — NexusOS

---

## 1. Purpose

The WNSP Transpiler translates source code written in any supported host language into
WavelengthScript (WLS) v1.0 — the physics-native contract language of NexusOS —
so that smart contracts can be authored in familiar syntax and deployed to the WNSP VM
without manual rewriting.

---

## 2. Supported Host Languages

| Identifier      | Language       | Version Target |
|-----------------|----------------|----------------|
| `python`        | Python         | 3.8+           |
| `javascript`    | JavaScript     | ES2020+        |
| `typescript`    | TypeScript     | 4.x+           |
| `rust`          | Rust           | 1.60+          |
| `go`            | Go             | 1.18+          |
| `solidity`      | Solidity       | 0.8.x          |
| `java`          | Java           | 11+            |
| `cpp`           | C/C++          | C++17          |
| `swift`         | Swift          | 5.x            |
| `kotlin`        | Kotlin         | 1.6+           |

---

## 3. Physics Compliance Requirements

### 3.1 CE Encoding — Single Source of Truth

**REQ-001:** All wavelength coordinate derivation MUST use the canonical `ceEncode` function
exported from `server/wnsp_vm.ts`. No other copy of this algorithm may exist in server-side
code. Client-side duplications (e.g., `learn.tsx`, `spectral-ide.tsx`) are tolerated for
browser-bundle isolation but must not diverge from the server canonical.

**REQ-002:** The canonical `ceEncode` algorithm is:
```
codes  = toUpperCase(name).charCodes filtered to [32..126]
avg    = mean(codes)
nm     = 380 + ((avg - 32) / 94) × 400       — range [380, 780]
wdm    = floor((nm - 380) / 4) + 1            — range [1, 101]
oam    = sum(codes) % 50                       — range [0, 49]  ← N_OAM = 50
pol    = (len(codes) % 2 == 0) ? "H" : "V"
Ψ      = Ψ(wdm, oam, pol)
```

**REQ-003:** OAM MUST be computed `% 50` (not `% 100`). The Hilbert Space Channel Model
defines N_OAM = 50. Values ≥ 50 reference non-existent channels and violate the
WNSP Density Equation: D_WNSP = N_λ · N_OAM · N_Pol · R_sym · M.

**Known deviation (pre-existing):** `learn.tsx` uses `oam % 100`. This is a bug in a
protected file. All server-side transpilation uses the correct `% 50`.

### 3.2 Hilbert Space Channel Validity

**REQ-004:** The fallback/null spectral address MUST be `Ψ(1,1,H)` — the first valid
channel. `Ψ(0,0,H)` is invalid because WDM and OAM indices are 1-based.

### 3.3 Determinism

**REQ-005:** `transpileToWLS(src, lang, name)` MUST be a pure function — given identical
inputs it MUST produce identical WLS output. Wall-clock timestamps, random values, and
process-state-dependent values MUST NOT appear in the generated WLS body.
Metadata such as `generated_at` belongs only in the API response envelope.

---

## 4. Output Compliance — WavelengthScript

### 4.1 Valid Opcodes

Generated WLS MUST only use opcodes recognised by `compileWLS()` in `wnsp_vm.ts` /
`spectral-ide.tsx`. The valid opcode surface is:

| WLS Syntax | VM Opcode | Hex |
|---|---|---|
| `@emit(Nnm, Ψ(...))` | EMIT | 0x03 |
| `tune(Nnm)` | TUNE | 0x01 |
| `fn name(...)` | LABEL | 0x07 |
| `agent name` | AGENT | 0x0A |
| `node.register("name")` | AGENT | 0x0A |
| `broadcast(...)` | BROAD | 0x05 |
| `emit value` | EMIT | 0x03 |
| `oscillate(...)` | OCS | 0x06 |
| `?λ condition:` | JMPZ | 0x08 |
| `GATE(load>N→Anm:Bnm)` | GATE | 0x09 |
| `@Nnm let name :=` | PUSH | 0x02 |
| `@store key := value` | STORE | 0x10 |
| `@load key` | LOAD | 0x11 |
| `transfer_nxt("Ψ", "amt")` | XFER_NXT | 0x12 |
| `transfer_sats("Ψ", "amt")` | XFER_SATS | 0x13 |
| `call("slug")` | CALL | 0x14 |
| `}` | RET | 0xFE |
| *(auto-appended)* `HALT` | HALT | 0xFF |

**REQ-006:** `@channel(Ψ(...))` is NOT a valid opcode. Class, struct, contract, and trait
constructs in host languages MUST be transpiled to `agent name` (AGENT, 0x0A), which
registers a named spectral entity on the network.

### 4.2 opcode_count Field

**REQ-007:** `opcode_count` MUST count all instructions that generate a non-zero VM
opcode (i.e., not 0x00 comment/no-op). The regex used MUST include: `@emit`, `fn `,
`agent `, `@store`, `@load`, `transfer_nxt`, `transfer_sats`, `tune`, `broadcast`,
`oscillate`, `emit `, `call(`, `?λ`, `}`, `GATE(`.

---

## 5. API Compliance

### 5.1 Authentication

| Endpoint | Auth Method | Rationale |
|---|---|---|
| `POST /api/dev/transpile` | `authenticateApiKey` (X-Api-Key header) | External developer API — consistent with all other `/api/dev/*` routes |
| `POST /api/ide/transpile` | `authenticate` (session Bearer token) | Internal IDE — session-scoped, not externally advertised |

### 5.2 Rate Limiting

**REQ-008:** Both endpoints MUST enforce rate limiting via `checkRateLimit()`.  
- `/api/dev/transpile`: 30 calls / 60 s per API key  
- `/api/ide/transpile`: 20 calls / 60 s per session user

### 5.3 Input Schema

```typescript
{
  source_code:     string  // 1–20,000 chars, required
  source_language: SupportedLang  // enum, required
  contract_name?:  string  // 1–80 chars, optional
}
```

### 5.4 Response Envelope (`/api/dev/transpile`)

```typescript
{
  ok:               true,
  wavelength_script: string,       // deterministic WLS output
  manifest: Array<{
    identifier:  string,
    nm:          number,           // wavelength in nm
    psi:         string,           // Ψ(wdm,oam,pol)
    band:        string,           // SYSTEM|AUTH|STREAM|LOGIC|INTERFACE|EVENT|STORAGE
  }>,
  opcode_count:     number,        // count of non-zero VM opcodes in output
  spectral_address: string,        // Ψ address of contract root
  source_language:  SupportedLang,
  contract_name:    string | null,
  generated_at:     string,        // ISO-8601 — in envelope only, not in WLS body
  vm_instructions:  object,        // next-step guidance for compile/deploy/run
  caller:           object,
  meta:             object,
}
```

---

## 6. Language Mapping Table

| Host Construct | WLS Output | VM Opcode |
|---|---|---|
| Function/method def | `@emit(Nnm, Ψ) fn name(params)` | EMIT + LABEL |
| Class / struct / contract / trait | `agent Name` | AGENT |
| Variable assignment (transient) | `@Nnm let name := value` | PUSH |
| Variable assignment (persistent / Solidity state) | `@store name := value` | STORE |
| Import / use / include / using | `tune(Nnm)  // module → Ψ` | TUNE |
| Print / log / console.log / println! | `broadcast(...)` | BROAD |
| Return value | `emit value` | EMIT |
| Loop (for / while / loop) | `oscillate(...) {` | OCS |
| Conditional (if / else) | `?λ condition:` | JMPZ |
| Closing brace / end | `}` | RET |
| Transfer / send / pay call | `transfer_nxt("Ψ", "amt")` | XFER_NXT |
| Balance read / msg.value | `@load balance` | LOAD |
| Solidity event emit | `@emit(Nnm, Ψ)` | EMIT |
| Solidity modifier | `@emit(Nnm, Ψ) fn name()` | EMIT + LABEL |
| Solidity mapping | `@store name := {}` | STORE |
| Solidity pragma | `// PRAGMA: ...` | comment |
| Solidity require() | `?λ (condition):` | JMPZ |
| Solidity revert | `emit("REVERT")` | EMIT |
| Comment (#, //, /*, *) | `// cleaned text` | comment (no opcode) |
| Unknown line | `/* @Nnm */ original` | EXEC (0x0B) |

---

## 7. Audit Trail

| Date | Auditor | Version | Outcome |
|---|---|---|---|
| 2026-06-18 | NexusOS Agent (internal audit) | v1.0 initial | 7 findings; F-001–F-007 fixed in same session |

### Finding Log

| ID | Sev | Description | Resolution |
|---|---|---|---|
| F-001 | CRITICAL | `ceEncode` duplicated in `lang-transpiler.ts` — divergence risk | Fixed: import from `wnsp_vm.ts` |
| F-002 | CRITICAL | `learn.tsx` uses `oam % 100` (should be `% 50`) | Logged; protected file — not modified |
| F-003 | HIGH | `@channel()` is not a VM opcode — silent EXEC fallback | Fixed: emit `agent Name` (0x0A) |
| F-004 | HIGH | Timestamp baked into WLS body — breaks determinism | Fixed: removed from WLS; in API envelope only |
| F-005 | MEDIUM | `/api/ide/transpile` had no rate limit | Fixed: 20 req/min via `checkRateLimit` |
| F-006 | MEDIUM | `opcodeCount` regex missed `}`, `agent`, `GATE(` | Fixed: extended regex |
| F-007 | LOW | Fallback `Ψ(0,0,H)` is invalid (0-indexed) | Fixed: use `Ψ(1,1,H)` |
