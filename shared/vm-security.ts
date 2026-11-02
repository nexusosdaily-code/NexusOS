/** Bounds apply equally to desktop and mobile browsers; they grant no authority. */
export const VM_MAX_SOURCE_LENGTH = 65_536;
export const BROWSER_VM_MAX_INSTRUCTIONS = 2_048;
export const VM_MAX_CYCLES = 2_048;

export function assertVmSource(source: unknown): asserts source is string {
  if (typeof source !== "string") throw new Error("Program source must be text");
  if (source.length > VM_MAX_SOURCE_LENGTH) throw new Error("Program exceeds the 64 KB source limit");
}

export function assertBrowserInstructions(instructions: readonly unknown[]): void {
  if (instructions.length > BROWSER_VM_MAX_INSTRUCTIONS) {
    throw new Error(`Program exceeds the ${BROWSER_VM_MAX_INSTRUCTIONS} instruction browser safety limit`);
  }
}

export class UnsupportedExecutionError extends Error {}

/** Recognise the explicit Python record envelope even after its header is removed. */
function hasPythonInstructionRecord(source: string): boolean {
  const records = /^\s*@[\d.]+nm\s+(?:FUNC|END|CONST|LOAD|STORE|ADD|SUB|MUL|FDIV|MOD|NEG|POS|NOT|EQ|NE|LT|LE|GT|GE|CALL|DROP|RETURN|HALT|JFALSE|JUMP|JFALSEKEEP|JTRUEKEEP)\s+(\{[^\r\n]*\})\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = records.exec(source))) {
    try {
      const value = JSON.parse(match[1]);
      if (value && typeof value === "object" && Object.keys(value).length === 2 &&
          Number.isSafeInteger(value.line) && Array.isArray(value.args)) return true;
    } catch { /* Invalid JSON is still subject to the selected compiler's validation. */ }
  }
  return false;
}

/** Preview text and native Python bytecode are never legacy contract authority. */
export function assertLegacyExecutionSource(source: string, allowPreview = false): void {
  assertNotCollectionSource(source);
  if (/^\s*(?:\/\/\s*)?WLS-JS\b/m.test(source) || /^\s*@[\d.]+nm JS_[A-Z_]+\s/m.test(source)) {
    throw new UnsupportedExecutionError("JavaScript bytecode requires the explicit WLS-JS/1 engine.");
  }
  if (/^\s*(?:\/\/\s*)?WLS-PY\b/m.test(source) || hasPythonInstructionRecord(source)) {
    throw new UnsupportedExecutionError("Python bytecode requires the explicit WLS-PY/1 engine.");
  }
  // Also fence historical converter output, which predates the explicit marker.
  const historicalPreview = /^\s*\/\/\s*(?:PYTHON|JAVASCRIPT|TYPESCRIPT|RUST|GO|JAVA|CPP|SOLIDITY|SWIFT|KOTLIN)\s*→\s*WLS\b/m.test(source);
  if (!allowPreview && (/^\s*(?:\/\/\s*)?WLS-ENCODING-PREVIEW\b/m.test(source) || historicalPreview)) {
    throw new UnsupportedExecutionError("Encoding preview is not executable. Use a supported native execution profile.");
  }
}

/**
 * Collection programs must opt into their own parser, never the legacy EXEC
 * walkthrough. Check before translation as well as at contract compilation.
 * Ordinary quoted strings/comments mentioning the profile remain valid.
 */
export function assertNotCollectionSource(source: string): void {
  if (/^\s*(?:WLS-MAP\b|MAP_[A-Z_]+\s*\[)/m.test(source)) {
    throw new Error("Map/Set source requires the explicit WLS-MAP/1 profile; it cannot use the Python or contract/preview VM.");
  }
  if (/^\s*(?:WLS-COLLECTION\b|LIST_(?:NEW|COPY|LEN|AT|PUSH)\s*\[)/m.test(source)) {
    throw new Error("Collection source requires the explicit WLS-COLLECTION/1 profile; it cannot use the Python or contract/preview VM.");
  }
}
