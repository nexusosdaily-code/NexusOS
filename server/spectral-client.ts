// No service startup or fallback data: a missing dependency must fail explicitly.
export class SpectralServiceError extends Error {
  constructor(public readonly status: 502 | 503 | 504) {
    super(status === 504 ? "Spectral API request timed out" :
      status === 502 ? "Spectral API returned an invalid response" : "Spectral API unavailable");
  }
}

export async function fetchSpectralJson(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
): Promise<{ status: number; data: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    try {
      const data: unknown = await response.json();
      return { status: response.status, data };
    } catch {
      throw new SpectralServiceError(controller.signal.aborted ? 504 : 502);
    }
  } catch (error) {
    if (error instanceof SpectralServiceError) throw error;
    throw new SpectralServiceError(controller.signal.aborted ? 504 : 503);
  } finally {
    // Covers connection failures AND body reads, not just resolved headers.
    clearTimeout(timeout);
  }
}
