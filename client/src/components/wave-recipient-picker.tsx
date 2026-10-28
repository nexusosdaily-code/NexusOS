import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, Check, LoaderCircle, Search, Users, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/queryClient";

type Recipient = { username: string; waveAddress: string };
type Props = {
  isAuthenticated: boolean;
  accountKey?: string;
  onSelect: (waveAddress: string) => void;
  variant?: "dark" | "light";
};

export default function WaveRecipientPicker({ isAuthenticated, accountKey, onSelect, variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const openedForAccount = useRef<string | undefined>(undefined);
  const inputId = useId();
  const light = variant === "light";
  const text = light ? "text-[#40524e]" : "text-slate-200";
  const muted = light ? "text-[#7b8178]" : "text-slate-400";
  const border = light ? "border-[#d4d1c6]" : "border-slate-700";
  const surface = light ? "bg-[#fdfcf8]" : "bg-slate-950/45";

  useLayoutEffect(() => {
    generation.current++;
    openedForAccount.current = undefined;
    setOpen(false);
    setQuery("");
    setRecipients([]);
    setHasMore(false);
    setError("");
    setLoading(false);
  }, [accountKey]);

  useEffect(() => {
    if (!open || !isAuthenticated || openedForAccount.current !== accountKey) return;
    const controller = new AbortController();
    const requestGeneration = ++generation.current;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      void fetch(`/api/directory/recipients?q=${encodeURIComponent(query)}`, {
        credentials: "include",
        cache: "no-store",
        headers: getAuthHeaders(),
        signal: controller.signal,
      }).then(async response => {
        if (!response.ok) throw new Error(`Directory request failed (${response.status}).`);
        return response.json() as Promise<{ recipients: Recipient[]; hasMore: boolean }>;
      }).then(body => {
        if (controller.signal.aborted || generation.current !== requestGeneration) return;
        setRecipients(Array.isArray(body.recipients) ? body.recipients : []);
        setHasMore(Boolean(body.hasMore));
        setError("");
      }).catch(reason => {
        if (controller.signal.aborted || generation.current !== requestGeneration) return;
        setRecipients([]);
        setHasMore(false);
        setError(reason instanceof Error ? reason.message : "Could not load recipients.");
      }).finally(() => {
        if (!controller.signal.aborted && generation.current === requestGeneration) setLoading(false);
      });
    }, query ? 220 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, isAuthenticated, accountKey, query]);

  const close = () => {
    generation.current++;
    openedForAccount.current = undefined;
    setOpen(false);
    setQuery("");
    setRecipients([]);
    setError("");
    setLoading(false);
  };
  const retry = () => {
    setRecipients([]);
    setError("");
    setQuery(current => `${current}`);
    // A retry must trigger a fresh request even when the search string is unchanged.
    setOpen(false);
    window.setTimeout(() => setOpen(true), 0);
  };

  return <div className="relative">
    {!open ? <button type="button" disabled={!isAuthenticated} onClick={() => { openedForAccount.current = accountKey; setOpen(true); }} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border ${border} px-3 text-xs font-semibold ${text} transition hover:border-cyan-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50`} aria-label="Browse recipient directory" data-testid="recipient-picker-open">
      <Users className="h-4 w-4" /> Browse directory
    </button> : <section className={`mt-2 rounded-xl border ${border} ${surface} p-3`} aria-label="Recipient directory" data-testid="recipient-picker">
      <div className="flex items-center justify-between gap-3">
        <h3 className={`text-xs font-semibold ${text}`}>Choose a recipient</h3>
        <button type="button" onClick={close} className={`grid min-h-11 min-w-11 place-items-center rounded-lg ${muted} hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300`} aria-label="Close recipient directory"><X className="h-4 w-4" /></button>
      </div>
      <label htmlFor={inputId} className={`mt-2 block text-xs ${muted}`}>Search usernames or wave addresses</label>
      <div className="relative mt-1">
        <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted}`} />
        <input id={inputId} autoComplete="off" type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Escape") close(); }} placeholder="Search directory" className={`min-h-11 w-full rounded-lg border ${border} ${surface} pl-9 pr-3 text-sm ${text} outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15`} data-testid="recipient-picker-search" />
      </div>
      {loading ? <div role="status" aria-live="polite" className={`mt-3 flex min-h-14 items-center gap-2 text-xs ${muted}`}><LoaderCircle className="h-4 w-4 animate-spin" />Searching directory…</div>
        : error ? <div className="mt-3 rounded-lg border border-rose-300/25 bg-rose-300/[0.06] p-3" role="alert"><p className={`flex items-center gap-2 text-xs ${light ? "text-[#8a5040]" : "text-rose-200"}`}><AlertTriangle className="h-4 w-4" />{error}</p><button type="button" onClick={retry} className={`mt-2 inline-flex min-h-11 items-center rounded-lg border ${border} px-3 text-xs font-semibold ${text}`} data-testid="recipient-picker-retry">Retry</button></div>
        : recipients.length ? <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto" aria-label="Matching recipients">
          {recipients.map(recipient => <li key={`${recipient.username}:${recipient.waveAddress}`} className={`flex flex-col gap-2 rounded-lg border ${border} p-2.5 sm:flex-row sm:items-center`}>
            <div className="min-w-0 flex-1"><div className={`text-sm font-semibold ${text}`}>{recipient.username}</div><div className={`mt-0.5 break-all font-mono text-[11px] ${muted}`}>{recipient.waveAddress}</div></div>
            <button type="button" onClick={() => { onSelect(recipient.waveAddress); close(); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-cyan-300 px-3 text-xs font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200" data-testid="recipient-picker-select"><Check className="h-4 w-4" />Select</button>
          </li>)}
          {hasMore && <li className={`px-2 py-1 text-[11px] ${muted}`}>More matches are available; refine your search.</li>}
        </ul> : <div className={`mt-3 rounded-lg border border-dashed ${border} px-3 py-5 text-center text-xs ${muted}`} data-testid="recipient-picker-empty">No matching recipients. Try another search.</div>}
    </section>}
  </div>;
}
