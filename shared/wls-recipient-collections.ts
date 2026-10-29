import { COLLECTION_LIMITS, CollectionVMError, executeCollection } from "./wls-collection-vm";

/**
 * Executable WavelengthScript collection source, embedded for browser and Node
 * bundler portability. Deduplication/search/removal control flow lives here,
 * not in a JavaScript includes/Set/filter wrapper.
 */
export const RECIPIENT_COLLECTION_SOURCE = Object.freeze({
  add: `WLS-COLLECTION/1
LIST_LEN ["size","items"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
LIST_COPY ["result","items"]
LIST_PUSH ["result","value"]
RETURN ["result"]
:check
LIST_AT ["item","items","index"]
EQ ["same","item","value"]
JTRUE ["same","existing"]
INC ["index"]
JUMP ["scan"]
:existing
RETURN ["items"]`,
  remove: `WLS-COLLECTION/1
LIST_NEW ["result"]
LIST_LEN ["size","items"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
LIST_AT ["item","items","index"]
EQ ["same","item","value"]
JTRUE ["same","next"]
LIST_PUSH ["result","item"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]`,
  count: `WLS-COLLECTION/1
LIST_LEN ["size","items"]
RETURN ["size"]`,
  at: `WLS-COLLECTION/1
LIST_AT ["item","items","index"]
RETURN ["item"]`,
});

export const MAX_SELECTED_RECIPIENTS = COLLECTION_LIMITS.items;

/** Exact, case-sensitive addresses. Server remains responsible for resolution/ACL. */
export function updateRecipientSelection(items: readonly string[], action: "add" | "remove", address: string): string[] {
  if (action !== "add" && action !== "remove") throw new CollectionVMError("Unknown selection operation.");
  if (typeof address !== "string") throw new CollectionVMError("Enter an exact wave address.");
  const value = address.trim();
  if (!value || value.length > COLLECTION_LIMITS.stringLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new CollectionVMError("Enter one exact wave address, up to 256 characters.");
  }
  const result = executeCollection(RECIPIENT_COLLECTION_SOURCE[action], { items, value }).value;
  if (!Array.isArray(result)) throw new CollectionVMError("Invalid collection result.");
  return result;
}

export function recipientCount(items: readonly string[]): number {
  return executeCollection(RECIPIENT_COLLECTION_SOURCE.count, { items }).value as number;
}

export function recipientAt(items: readonly string[], index: number): string {
  return executeCollection(RECIPIENT_COLLECTION_SOURCE.at, { items, index }).value as string;
}
