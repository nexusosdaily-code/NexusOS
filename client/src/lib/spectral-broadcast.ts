export type BroadcastType = "camera" | "screen" | "both";
export class BroadcastInviteError extends Error {
  constructor(message: string, readonly invited: string[]) {
    super(message);
    this.name = "BroadcastInviteError";
  }
}

export async function spectralRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : `Request failed (${response.status})`);
  }
  return body as T;
}

export async function inviteBroadcastGuests(streamId: string, addresses: string[], signal?: AbortSignal, onProgress?: (invited: string[]) => void) {
  const invited: string[] = [];
  for (const address of [...new Set(addresses.map(value => value.trim()).filter(Boolean))]) {
    try {
      if (signal?.aborted) throw new DOMException("Invitation setup was cancelled.", "AbortError");
      await spectralRequest(`/api/p2p/live/${encodeURIComponent(streamId)}/guests`, {
        method: "POST",
        body: JSON.stringify({ address }),
        signal,
      });
      invited.push(address);
      onProgress?.([...invited]);
    } catch (error) {
      throw new BroadcastInviteError(error instanceof Error ? error.message : "An invitation could not be applied.", invited);
    }
  }
  return invited;
}

export async function createBroadcastRoom(input: {
  title: string;
  description?: string;
  isPublic: boolean;
  streamType: BroadcastType;
}, signal?: AbortSignal) {
  return spectralRequest<{ stream: { id: string } }>("/api/streams", {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  });
}
