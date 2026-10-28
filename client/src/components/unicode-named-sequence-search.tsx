import { useMemo, useState, type FormEvent } from "react";
import { codePointLabel } from "@shared/unicode-catalogue";
import { encodeUnicodeCE, decodeUnicodeCE, unicodeCoordinateWavelength } from "@shared/unicode-ce";
import type { UnicodeNamedSequence, UnicodeSequenceLookup } from "@shared/unicode-character-names";
import type { UnicodeNames } from "./unicode-name-search";

export function UnicodeNamedSequenceSearch({ names, onUseSequence, containingPoint }: {
  names: UnicodeNames; onUseSequence: (text: string) => void; containingPoint?: number;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [pointInput, setPointInput] = useState("");
  const [lookup, setLookup] = useState<UnicodeSequenceLookup | null>(null);
  const [selected, setSelected] = useState<UnicodeNamedSequence | null>(null);
  const membership = containingPoint !== undefined;
  const pageSize = membership ? 16 : 64;
  const page = useMemo(() => membership
    ? names.searchUnicodeNamedSequencesContaining(containingPoint, offset, pageSize)
    : names.searchUnicodeNamedSequences(query, offset, pageSize), [names, query, offset, containingPoint, membership, pageSize]);
  const text = selected ? String.fromCodePoint(...selected.points) : "";
  const payload = selected ? encodeUnicodeCE(text) : null;
  // The preview displays at most 32 scalar rows and accepts 512 UTF-16 units.
  const previewFits = selected !== null && text.length <= 512 && selected.points.length <= 32;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setQuery(input);
    setOffset(0);
    setSubmitted(true);
    setSelected(null);
    setLookup(null);
  };
  const submitPoints = (event: FormEvent) => {
    event.preventDefault();
    setLookup(names.lookupUnicodeNamedSequences(pointInput));
    setSubmitted(false);
    setSelected(null);
  };
  const sequenceResults = (sequences: readonly UnicodeNamedSequence[], testId: string) => (
    <ul data-testid={testId} className="max-h-64 space-y-1 overflow-y-auto">
      {sequences.map(sequence => (
        <li key={sequence.name}>
          <button type="button" onClick={() => setSelected(sequence)}
            aria-label={`Inspect named sequence ${sequence.name}`}
            className="w-full rounded bg-slate-950 px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400">
            <span className="block break-words">{sequence.name} · {sequence.points.length} scalars</span>
            <span dir="ltr" className="block break-words font-mono">{sequence.points.map(codePointLabel).join(" → ")}</span>
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={membership ? `Official named sequences containing ${codePointLabel(containingPoint)}` : "Official named sequences"} className="space-y-2 border-t border-slate-700 pt-3">
      {membership ? (
        <h5 className="text-sm font-semibold text-cyan-100">Official named sequences containing {codePointLabel(containingPoint)}</h5>
      ) : <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1 text-xs text-slate-300">
          <span>Search official named character sequences</span>
          <input type="search" value={input} maxLength={120} autoComplete="off" spellCheck={false}
            onChange={event => setInput(event.target.value)}
            placeholder="For example, KEYCAP DIGIT ONE"
            className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-700" />
        </label>
        <button type="submit" className="min-h-10 rounded bg-cyan-900 px-4 py-2 text-sm text-cyan-50 hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400">Search named sequences</button>
      </form>}
      <p className="text-[10px] text-slate-400">Unicode {names.UNICODE_NAMED_SEQUENCES_VERSION} approved named sequences: multiple scalars, not single characters. {membership ? "Exact scalar membership" : "Case-insensitive literal substring search"}, not translation, meaning or decipherment. Separate from appending individual symbols.</p>
      {membership && <p className="text-[10px] text-slate-400">Exact scalar membership in the pinned NamedSequences.txt catalogue only. No combinations, grapheme boundaries or meanings are inferred.</p>}
      {!membership && <>
      <form onSubmit={submitPoints} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1 text-xs text-slate-300">
          <span>Find official named sequence by exact code-point list</span>
          <textarea rows={2} value={pointInput} maxLength={names.UNICODE_SEQUENCE_LOOKUP_MAX_INPUT}
            autoComplete="off" spellCheck={false} dir="ltr"
            onChange={event => setPointInput(event.target.value)}
            placeholder="U+0031 U+FE0F U+20E3" aria-describedby="unicode-sequence-lookup-help"
            className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-700" />
        </label>
        <button type="submit" className="min-h-10 rounded bg-cyan-900 px-4 py-2 text-sm text-cyan-50 hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400">Look up exact sequence</button>
      </form>
      <p id="unicode-sequence-lookup-help" className="text-[10px] text-slate-400">Whitespace-separated U+ identifiers with 4–6 hexadecimal digits; up to 32 scalars and 512 characters. Exact order and combining marks only: no normalization, inferred names or provisional sequences. At most 64 results.</p>
      {lookup && (
        <div className="space-y-2 rounded border border-slate-700 p-3">
          {lookup.status === "invalid" ? <p role="alert" className="text-xs text-red-300">Invalid code-point list: {lookup.error}</p> : (
            <>
              <p role="status" className="text-xs text-slate-300">{lookup.total
                ? `${lookup.total} official named sequence matches${lookup.total > lookup.sequences.length ? ` (showing first ${lookup.sequences.length})` : ""}.`
                : `No official named sequence matches this exact code-point list in Unicode ${names.UNICODE_NAMED_SEQUENCES_VERSION}.`}</p>
              {sequenceResults(lookup.sequences, "unicode-sequence-lookup-results")}
            </>
          )}
        </div>
      )}
      </>}
      {(submitted || membership) && (
        <div className="space-y-2 rounded border border-slate-700 p-3">
          <p role="status" className="text-xs text-slate-300">
            {membership
              ? page.total ? `${page.total.toLocaleString()} official named sequences contain ${codePointLabel(containingPoint)}`
                : `No official named sequences in this pinned catalogue contain ${codePointLabel(containingPoint)}.`
              : query.trim() ? `${page.total.toLocaleString()} named sequence results for “${query.trim()}”` : "Enter an official named sequence name."}
          </p>
          {sequenceResults(page.sequences, "unicode-sequence-results")}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <button type="button" disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - pageSize))}
              className="rounded border border-slate-600 px-2 py-1 disabled:opacity-40">Previous named sequence results</button>
            <span>{page.total ? `${offset + 1}–${offset + page.sequences.length} of ${page.total.toLocaleString()}` : "0 results"}</span>
            <button type="button" disabled={offset + pageSize >= page.total} onClick={() => setOffset(value => value + pageSize)}
              className="rounded border border-slate-600 px-2 py-1 disabled:opacity-40">Next named sequence results</button>
          </div>
        </div>
      )}
      {selected && payload && (
        <article data-testid="unicode-sequence-details" className="space-y-3 rounded border border-cyan-800 bg-slate-950 p-3 text-xs text-slate-200">
          <h5 className="break-words font-semibold">Named sequence: {selected.name}</h5>
          <p>{selected.points.length} scalars · {payload.frames.length} UTF-8 coordinate frames · {text.length} UTF-16 units</p>
          <bdi dir="auto" className="block text-2xl">{text}</bdi>
          <ol className="space-y-2">
            {selected.points.map((point, index) => (
              <li key={index} data-testid="unicode-sequence-scalar" className="space-y-1 rounded border border-slate-700 p-2">
                <p className="break-words">{index + 1}. {codePointLabel(point)} · {names.inspectUnicodeName(point).name ?? "No Unicode character name"}</p>
                <div dir="ltr" className="break-words font-mono">
                  {encodeUnicodeCE(String.fromCodePoint(point)).frames.map((frame, frameIndex) => (
                    <p key={frameIndex}>Ψ({frame.wdm},{frame.oam},{frame.pol}) · {unicodeCoordinateWavelength(frame)} nm</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p>{decodeUnicodeCE(payload) === text ? "DECODE ROUNDTRIP VERIFIED" : "ROUNDTRIP MISMATCH"}</p>
          <p className="text-slate-400">Logical scalar order and combining marks are preserved exactly; no normalization or grapheme merging. These are software coordinates, not verified optical channels.</p>
          <button type="button" disabled={!previewFits} onClick={() => { if (previewFits) onUseSequence(text); }}
            className="rounded border border-cyan-700 px-2 py-1.5 text-cyan-100 hover:bg-cyan-950 disabled:opacity-40">
            Replace preview with named sequence
          </button>
          {!previewFits && <p role="status">This sequence exceeds the preview limits of 512 UTF-16 units or 32 displayed scalars.</p>}
        </article>
      )}
    </section>
  );
}
