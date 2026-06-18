// ── server/lang-transpiler.ts ─────────────────────────────────────────────────
// Physics-based source-code → WavelengthScript transpiler
// Mirrors the client-side logic in learn.tsx, extended for smart contracts
// Supported: python · javascript · typescript · rust · go · java · cpp · solidity · swift · kotlin
// AGPL-3.0 — NexusOS

export type SupportedLang =
  | "python" | "javascript" | "typescript" | "rust" | "go"
  | "java" | "cpp" | "solidity" | "swift" | "kotlin";

export const SUPPORTED_LANGS: SupportedLang[] = [
  "python", "javascript", "typescript", "rust", "go",
  "java", "cpp", "solidity", "swift", "kotlin",
];

// ── CE encoder (mirrors wnsp_vm.ts ceEncode) ─────────────────────────────────
function ceEncode(name: string): { nm: number; psi: string; band: string } {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77);
  const avg = codes.reduce((a: number, b: number) => a + b, 0) / codes.length;
  const nm = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(2));
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = codes.reduce((a: number, b: number) => a + b, 0) % 50;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  const band =
    nm < 450 ? "SYSTEM" : nm < 495 ? "AUTH" :
    nm < 520 ? "STREAM" : nm < 565 ? "LOGIC" :
    nm < 590 ? "INTERFACE" : nm < 625 ? "EVENT" : "STORAGE";
  return { nm, psi: `Ψ(${wdm},${oam},${pol})`, band };
}

// ── Pattern helpers ───────────────────────────────────────────────────────────
const FN_RE    = /^(?:def|function|fn|func|fun|void|int|string|bool|float|double|uint\d*|int\d*|address|bytes\d*)\s+(\w+)\s*\(([^)]*)\)/;
const CLASS_RE = /^(?:class|struct|interface|type|contract|enum|trait|impl)\s+(\w+)/;
const VAR_RE   = /^(?:let|const|var|val|auto|mut|uint\d*|int\d*|bool|address|string|bytes\d*)?\s*(\w+)\s*[:=]+\s*(.+)/;
const IMPORT_RE = /^(?:import|from|use|require|include|using|pragma)/;
const PRINT_RE  = /^(?:print|console\.log|println!|printf|fmt\.Print|fmt\.Println|System\.out\.println|echo|puts|print!|debugPrint|NSLog)\b/;
const LOOP_RE   = /^(?:for|while|loop)\b/;
const EVENT_RE  = /^emit\s+(\w+)\s*\(/;
const MODIFIER_RE = /^modifier\s+(\w+)/;
const MAPPING_RE  = /mapping\s*\(/;
const PAYABLE_RE  = /\bpayable\b/;
const TRANSFER_PAT = /(?:transfer|send|pay|sendEther|safeSend)\s*\(([^)]+)\)/;
const BALANCE_RE   = /(?:balanceOf|\.balance|msg\.value|balances\[)/;
const RETURN_RE    = /^return\b/;
const KEYWORD_SKIP = /^(?:if|else|for|while|return|import|from|use|fn|def|class|struct|type|func|fun|contract|pragma|modifier|event|emit|require|revert|assert|constructor|fallback|receive)$/;

// ── Language-specific comment strippers ───────────────────────────────────────
function stripComment(line: string, lang: SupportedLang): string | null {
  if (lang === "python" && line.startsWith("#")) return line.slice(1).trim();
  if (["javascript","typescript","rust","go","java","cpp","solidity","swift","kotlin"].includes(lang)
      && (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*"))) {
    return line.replace(/^\/\/\s*|^\/\*\s*|\*\/\s*$|^\*\s*/g, "").trim();
  }
  return null;
}

// ── Detect transfer-like calls and emit XFER opcode ──────────────────────────
function detectTransfer(line: string): string | null {
  const tm = line.match(TRANSFER_PAT);
  if (!tm) return null;
  const args = tm[1].split(",").map((s: string) => s.trim());
  const dest = args[0] ?? "recipient";
  const amt  = args[1] ?? "1.00000000";
  const enc  = ceEncode(dest.replace(/[^a-zA-Z]/g, "") || "addr");
  const psi  = enc.psi;
  const clean = amt.replace(/[^0-9._]/g, "") || "1.00000000";
  return `transfer_nxt("${psi}", "${clean}")  // ${line.slice(0, 60)}`;
}

// ── Detect balance/state reads ────────────────────────────────────────────────
function detectStateRead(line: string): string | null {
  if (!BALANCE_RE.test(line)) return null;
  const key = (line.match(/\b(\w+)\s*[\[.]/) ?? [])[1] ?? "balance";
  return `@load ${key}  // ← contract_state`;
}

// ── Solidity-specific handling ────────────────────────────────────────────────
function transpileSolidityLine(line: string): string | null {
  if (line.startsWith("pragma ")) return `// PRAGMA: ${line}  [compile-time metadata]`;
  if (EVENT_RE.test(line)) {
    const em = line.match(EVENT_RE)!;
    const enc = ceEncode(em[1]);
    return `@emit(${enc.nm}nm, ${enc.psi})  // Solidity event → spectral emit`;
  }
  if (MODIFIER_RE.test(line)) {
    const mm = line.match(MODIFIER_RE)!;
    const enc = ceEncode(mm[1]);
    return `@emit(${enc.nm}nm, ${enc.psi}) fn ${mm[1]}() {  // modifier → WLS gate`;
  }
  if (MAPPING_RE.test(line)) {
    const key = (line.match(/(\w+)\s*;?$/) ?? [])[1] ?? "state";
    return `@store ${key} := {}  // mapping → spectral K/V store`;
  }
  if (PAYABLE_RE.test(line)) {
    const enc = ceEncode("payable");
    return `// @${enc.nm}nm PAYABLE — receives sats/NXT`;
  }
  if (line.match(/^require\s*\((.+)\)/)) {
    return `?λ ${line.replace(/^require\s*/, "")}:  // require → photon gate`;
  }
  if (line.match(/^revert\b/)) {
    return `emit("REVERT")  // → revert wavefunction`;
  }
  if (line.startsWith("constructor")) {
    const enc = ceEncode("constructor");
    return `@emit(${enc.nm}nm, ${enc.psi}) fn constructor() {`;
  }
  return null;
}

// ── Core transpile function ───────────────────────────────────────────────────
export function transpileToWLS(src: string, lang: SupportedLang, contractName?: string): {
  wls: string;
  manifest: { identifier: string; nm: number; psi: string; band: string }[];
  opcodeCount: number;
  spectralAddress: string;
} {
  if (!src.trim()) return { wls: "", manifest: [], opcodeCount: 0, spectralAddress: "Ψ(0,0,H)" };

  const timestamp = new Date().toISOString().slice(0, 19) + "Z";
  const name      = contractName ?? "Contract";
  const rootEnc   = ceEncode(name);

  const out: string[] = [
    `// WavelengthScript v1.0 · NexusOS · AGPL-3.0`,
    `// ${lang.toUpperCase()} → WLS · ${timestamp}`,
    `// Contract: ${name}  ${rootEnc.psi}  λ=${rootEnc.nm}nm  [${rootEnc.band}]`,
    ``,
    `@emit(${rootEnc.nm}nm, ${rootEnc.psi})`,
    `fn ${name.replace(/\s+/g, "_")}() {`,
    ``,
  ];

  const lines = src.split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { out.push(""); continue; }

    // Comments
    const cmt = stripComment(line, lang);
    if (cmt !== null) { out.push(`  // ${cmt}`); continue; }

    // Language-specific: Solidity
    if (lang === "solidity") {
      const sl = transpileSolidityLine(line);
      if (sl) { out.push(`  ${sl}`); continue; }
    }

    // Transfer detection (any language)
    const xfer = detectTransfer(line);
    if (xfer) { out.push(`  ${xfer}`); continue; }

    // State read (any language)
    const stRead = detectStateRead(line);
    if (stRead) { out.push(`  ${stRead}`); continue; }

    // Function definitions
    const fnMatch = line.match(FN_RE);
    if (fnMatch) {
      const [, fnName, params] = fnMatch;
      const enc = ceEncode(fnName);
      const paramList = params.split(",").map((p: string) => p.trim()).filter(Boolean)
        .map((p: string) => {
          const id = p.replace(/[^a-zA-Z]/g, "") || "x";
          const pe = ceEncode(id);
          return `@${pe.nm}nm ${p}`;
        }).join(", ");
      out.push(`  @emit(${enc.nm}nm, ${enc.psi}) // λ=${enc.nm}nm · ${enc.band}`);
      out.push(`  fn ${fnName}(${paramList}) {`);
      continue;
    }

    // Class / struct / contract
    const classMatch = line.match(CLASS_RE);
    if (classMatch) {
      const enc = ceEncode(classMatch[1]);
      out.push(`  @channel(${enc.psi}) // ${enc.nm}nm · ${enc.band}`);
      out.push(`  type ${classMatch[1]} : SpectralNode {`);
      continue;
    }

    // Import / use / require
    if (IMPORT_RE.test(line)) {
      const modMatch = line.match(/["']([^"']+)["']/) ?? line.match(/\s+(\w+)\s*$/) ?? null;
      const modName  = modMatch ? modMatch[1] : "module";
      const enc      = ceEncode(modName.replace(/[^a-zA-Z]/g, "") || "mod");
      out.push(`  tune(${enc.nm}nm)  // ${modName} → ${enc.psi}`);
      continue;
    }

    // Print / log / broadcast
    if (PRINT_RE.test(line)) {
      const inner = line.replace(/^[^(]+/, "");
      out.push(`  broadcast(${inner})  // STREAM`);
      continue;
    }

    // Return
    if (RETURN_RE.test(line)) {
      const val = line.slice(6).trim();
      out.push(`  emit ${val}  // → spectral output`);
      continue;
    }

    // Loops
    if (LOOP_RE.test(line)) {
      const body = line.replace(/^(?:for|while|loop)\s+/, "");
      out.push(`  oscillate(${body}) {`);
      continue;
    }

    // Conditionals
    if (line.startsWith("if ") || line === "else" || line.startsWith("else if") || line.startsWith("else {")) {
      out.push(`  ?λ ${line.replace(/^else\s*/, "// else ")}:`);
      continue;
    }

    // Closing braces / end keywords
    if (line === "}" || line.match(/^end(\s|$)/)) { out.push("}"); continue; }

    // Variable assignment / declaration (smart-contract: auto STORE for state vars)
    const varMatch = line.match(VAR_RE);
    if (varMatch && !KEYWORD_SKIP.test(varMatch[1])) {
      const [, vname, val] = varMatch;
      const enc = ceEncode(vname);
      // If it looks like a state/persistent variable: emit STORE opcode
      const isPersist = lang === "solidity" || val.trim().match(/^(?:0|false|""|HashMap|BTreeMap|vec!|Vec|new\s)/);
      if (isPersist) {
        out.push(`  @store ${vname} := ${val.replace(/;$/, "")}  // ${enc.psi}`);
      } else {
        out.push(`  @${enc.nm}nm let ${vname} := ${val.replace(/;$/, "")}  // ${enc.psi}`);
      }
      continue;
    }

    // Fallback: annotate with CE wavelength
    const word = line.split(/\s/)[0].replace(/[^a-zA-Z]/g, "") || "op";
    const enc  = ceEncode(word);
    out.push(`  /* @${enc.nm}nm */ ${line}`);
  }

  out.push("}");
  out.push("");
  out.push("// ── Spectral manifest ─────────────────────────────────────────────────");

  // Collect unique identifiers → manifest
  const identifiers = Array.from(new Set(
    (src.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) ?? [])
      .filter((id: string) => !KEYWORD_SKIP.test(id))
  )).slice(0, 12);

  const manifest = identifiers.map((id: string) => {
    const enc = ceEncode(id);
    out.push(`// ${id.padEnd(20)} → ${enc.nm}nm  ${enc.psi}  [${enc.band}]`);
    return { identifier: id, ...enc };
  });

  const wls        = out.join("\n");
  const opcodeCount = (wls.match(/^  (?:@emit|fn |@store|@load|transfer_nxt|transfer_sats|tune|broadcast|oscillate|emit |call\(|\?λ)/gm) ?? []).length;

  return { wls, manifest, opcodeCount, spectralAddress: rootEnc.psi };
}
