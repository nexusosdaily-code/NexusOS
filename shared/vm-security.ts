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
