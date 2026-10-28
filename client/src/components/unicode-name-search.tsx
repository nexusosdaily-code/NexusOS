import { useMemo, useState, type FormEvent } from "react";
import { codePointLabel } from "@shared/unicode-catalogue";

export type UnicodeNames = typeof import("@shared/unicode-character-names");

export function UnicodeNameSearch({ names, onInspect }: {
  names: UnicodeNames; onInspect: (point: number) => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const page = useMemo(() => names.searchUnicodeNames(query, offset), [names, query, offset]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setQuery(input);
    setOffset(0);
    setSubmitted(true);
  };
  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1 text-xs text-slate-300">
          <span>Search official character names or aliases</span>
          <input type="search" value={input} maxLength={120} autoComplete="off" spellCheck={false}
            onChange={event => setInput(event.target.value)}
            placeholder="For example, SNOWMAN or CJK UNIFIED IDEOGRAPH-4E00"
            className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-700" />
        </label>
        <button type="submit" className="min-h-10 rounded bg-cyan-900 px-4 py-2 text-sm text-cyan-50 hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400">Search names</button>
      </form>
      <p className="text-[10px] text-slate-400">Case-insensitive substring search across Unicode {names.UNICODE_NAMES_VERSION} single-scalar names and typed aliases. Named sequences are searched separately below. Not a translation or meaning search.</p>
      {submitted && (
        <div className="space-y-2 rounded border border-slate-700 p-3">
          <p role="status" className="text-xs text-slate-300">
            {query.trim() ? `${page.total.toLocaleString()} name or alias results for “${query.trim()}”` : "Enter an official character name or alias."}
          </p>
          <ul data-testid="unicode-name-results" className="max-h-64 space-y-1 overflow-y-auto">
            {page.points.map(point => {
              const info = names.inspectUnicodeName(point);
              const label = codePointLabel(point);
              return (
                <li key={point}>
                  <button type="button" onClick={() => onInspect(point)}
                    aria-label={`Inspect ${label} — ${info.name ?? info.controlLabel}`}
                    className="w-full rounded bg-slate-950 px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                    <span className="break-words font-mono">{label} · {info.name ?? `${info.controlLabel} · no Unicode character name`}</span>
                    {info.aliases.map(alias => <span key={`${alias.type}:${alias.name}`} className="mt-1 block break-words text-slate-400">Alias ({alias.type}): {alias.name}</span>)}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <button type="button" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 64))}
              className="rounded border border-slate-600 px-2 py-1 disabled:opacity-40">Previous name results</button>
            <span>{page.total ? `${offset + 1}–${offset + page.points.length} of ${page.total.toLocaleString()}` : "0 results"}</span>
            <button type="button" disabled={offset + 64 >= page.total} onClick={() => setOffset(value => value + 64)}
              className="rounded border border-slate-600 px-2 py-1 disabled:opacity-40">Next name results</button>
          </div>
        </div>
      )}
    </div>
  );
}
