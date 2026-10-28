export type AnalyticsData = Record<string, string | number | boolean>;
export type TelegramCommandCategory =
  | "general"
  | "encoding"
  | "wls"
  | "mirror"
  | "oracle"
  | "science"
  | "traction"
  | "developer"
  | "experiments"
  | "governance"
  | "broadcast"
  | "custom";

declare global {
  interface Window {
    umami?: {
      track(name: string, data?: AnalyticsData): void | Promise<unknown>;
    };
  }
}

export function trackEvent(name: string, data?: AnalyticsData): void {
  if (typeof window === "undefined") return;
  try {
    const result = window.umami?.track(name, data);
    if (result) void Promise.resolve(result).catch(() => {});
  } catch {
    // Analytics must never affect the application.
  }
}

/** Coarse buckets keep financial values useful without recording exact amounts. */
export function amountBucket(value: number | string): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount) || amount <= 0) return "none";
  if (amount < 1_000) return "under_1k";
  if (amount < 10_000) return "1k_10k";
  if (amount < 100_000) return "10k_100k";
  if (amount < 1_000_000) return "100k_1m";
  return "1m_plus";
}

export function destinationType(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (normalized.startsWith("bc1") || normalized.startsWith("1") || normalized.startsWith("3")) return "bitcoin";
  if (normalized.startsWith("ln")) return "lightning";
  if (normalized.startsWith("nxt-")) return "nxt";
  return "other";
}

const TELEGRAM_COMMANDS: Record<string, Exclude<TelegramCommandCategory, "custom">> = {
  help: "general",
  ce: "encoding",
  se: "encoding",
  encode: "encoding",
  compare: "encoding",
  frame: "encoding",
  spectrum: "encoding",
  fingerprint: "encoding",
  wls: "wls",
  codegen: "wls",
  mirror: "mirror",
  oracle: "oracle",
  law: "oracle",
  lambda: "oracle",
  lesson: "science",
  trial: "science",
  quiz: "science",
  traction: "traction",
  npm: "traction",
  ecosystem: "traction",
  status: "traction",
  fee: "developer",
  query: "developer",
  channel: "developer",
  band: "developer",
  snippet: "developer",
  experiments: "experiments",
  log: "experiments",
  governance: "governance",
  params: "governance",
  refract: "broadcast",
};

/** Reduce arbitrary command text to a fixed, privacy-safe category. */
export function telegramCommandCategory(command: string): TelegramCommandCategory {
  const token = command.trim().split(/\s+/)[0].replace(/^\/+/, "").toLowerCase();
  return TELEGRAM_COMMANDS[token] ?? "custom";
}