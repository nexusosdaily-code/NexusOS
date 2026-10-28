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
