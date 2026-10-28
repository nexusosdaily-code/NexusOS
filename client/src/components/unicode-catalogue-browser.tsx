import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  browseUnicodeBlock, codePointLabel, inspectCodePoint, parseCodePoint,
  searchUnicodeBlocks, loadUnicodeNames, UNICODE_BLOCKS, UNICODE_CATALOGUE_VERSION, UNICODE_UCD_SOURCE,
} from "@shared/unicode-catalogue";
import { encodeUnicodeCE, decodeUnicodeCE, unicodeCoordinateWavelength } from "@shared/unicode-ce";
import { UnicodeNameSearch, type UnicodeNames } from "./unicode-name-search";
import { UnicodeNamedSequenceSearch } from "./unicode-named-sequence-search";

type PointDetails = ReturnType<typeof inspectCodePoint>;

interface UnicodeCatalogueBrowserProps {
  onUseCharacter: (character: string) => void;
  onAppendCharacter: (character: string) => void;
  remainingPreviewUnits: number;
}

const PAGE_SIZE = 64;

function sourceFile(name: string) {
  return `${UNICODE_UCD_SOURCE}${name}`;
}

export function UnicodeCatalogueBrowser({ onUseCharacter, onAppendCharacter, remainingPreviewUnits }: UnicodeCatalogueBrowserProps) {
  const [names, setNames] = useState<UnicodeNames | null>(null);
  const [nameError, setNameError] = useState(false);
  const [nameAttempt, setNameAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setNameError(false);
    loadUnicodeNames().then(value => { if (active) setNames(value); })
      .catch(() => { if (active) setNameError(true); });
    return () => { active = false; };
  }, [nameAttempt]);
  const [search, setSearch] = useState("");
  const filteredBlocks = useMemo(() => searchUnicodeBlocks(search), [search]);
  const [selectedBlockName, setSelectedBlockName] = useState(UNICODE_BLOCKS[0]?.name ?? "");
  const activeBlock = filteredBlocks.find(block => block.name === selectedBlockName) ?? filteredBlocks[0];
  const effectiveBlockName = activeBlock?.name ?? "";
  const [offset, setOffset] = useState(0);
  const [details, setDetails] = useState<PointDetails | null>(null);
  const [showRelatedSequences, setShowRelatedSequences] = useState(false);
  const [lookupInput, setLookupInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const copyAttempt = useRef(0);
  const manualReference = useRef<HTMLTextAreaElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const resetCopy = () => {
    copyAttempt.current++;
    setCopyState("idle");
  };
  useEffect(() => () => { copyAttempt.current++; }, []);

  const page = activeBlock ? browseUnicodeBlock(activeBlock, offset, PAGE_SIZE) : { points: [], total: 0 };
  const safeOffset = page.total > 0 ? Math.min(offset, Math.floor((page.total - 1) / PAGE_SIZE) * PAGE_SIZE) : 0;
  const visiblePage = activeBlock && safeOffset !== offset ? browseUnicodeBlock(activeBlock, safeOffset, PAGE_SIZE) : page;
  const pageNumber = visiblePage.total ? Math.floor(safeOffset / PAGE_SIZE) + 1 : 0;
  const pageCount = Math.ceil(visiblePage.total / PAGE_SIZE);

  const chooseBlock = (name: string) => {
    resetCopy();
    setSelectedBlockName(name);
    setOffset(0);
    setDetails(null);
  };

  const inspect = (point: number) => {
    resetCopy();
    setShowRelatedSequences(false);
    setDetails(inspectCodePoint(point));
    setLookupError("");
  };

  const lookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLookupError("");
    try {
      inspect(parseCodePoint(lookupInput));
    } catch (error) {
      resetCopy();
      setLookupError(error instanceof Error ? error.message : "Unable to inspect this code point.");
      setDetails(null);
    }
  };

  const isAssigned = details?.status === "assigned";
  const nameDetails = details && names ? names.inspectUnicodeName(details.point) : null;
  const appendFits = details !== null && details.character.length <= remainingPreviewUnits;
  const characterEncoding = details ? encodeUnicodeCE(details.character) : null;
  const roundTrip = details && characterEncoding
    ? decodeUnicodeCE(characterEncoding) === details.character
    : false;

  // One reference for both clipboard and manual copying.
  const referenceText = details && nameDetails && characterEncoding ? [
      `Unicode ${UNICODE_CATALOGUE_VERSION}`,
      `Code point: ${details.label}`,
      `Official name: ${nameDetails.name ?? "No Unicode character name"}`,
      ...(nameDetails.controlLabel ? [`Control label: ${nameDetails.controlLabel} (not a character name)`] : []),
      "Official aliases (typed separately; not character names):",
      ...(nameDetails.aliases.length ? nameDetails.aliases.map(alias => `- ${alias.name} (${alias.type})`) : ["None"]),
      `Assignment status: ${details.status}${details.status === "assigned" ? " in this catalogue" : " · outside the assigned-character catalogue"}`,
      `General category: ${details.category}`,
      `Script property: ${details.script}`,
      `Block: ${details.block}`,
      "Exact software coordinate frame(s), in order:",
      ...characterEncoding.frames.map((frame, index) =>
        `${index + 1}. Ψ(${frame.wdm},${frame.oam},${frame.pol}) · ${unicodeCoordinateWavelength(frame)} nm`),
      "UTF-8 coordinate data only. No normalization, language inference, translation, or decipherment is performed.",
    ].join("\n") : "";

  const copyDetails = async () => {
    if (!referenceText) return;
    const attempt = ++copyAttempt.current;
    setCopyState("pending");
    try {
      // Invoke directly within the click gesture, including on mobile browsers.
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(referenceText);
      if (copyAttempt.current === attempt) setCopyState("success");
    } catch {
      if (copyAttempt.current === attempt) setCopyState("error");
    }
  };

  return (
    <section aria-labelledby="unicode-catalogue-title" className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Offline reference · Unicode {UNICODE_CATALOGUE_VERSION}</p>
          <h4 id="unicode-catalogue-title" className="mt-1 text-sm font-semibold text-slate-100">Writing-system catalogue</h4>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Browse assigned characters by block or script property. A script and a block are not a language;
            Common and Inherited are script properties, and no language or meaning is inferred.
          </p>
        </div>
        <span className="rounded border border-slate-700 px-2 py-1 font-mono text-[10px] text-slate-400">LOCAL DATA</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
        <label className="block min-w-0 space-y-1 text-xs text-slate-300">
          <span>Search blocks or writing systems</span>
          <input value={search} onChange={event => { setSearch(event.target.value); setOffset(0); }}
            type="search" autoComplete="off" className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-700" placeholder="For example, Greek or Latin" />
        </label>
        <label className="block min-w-0 space-y-1 text-xs text-slate-300">
          <span>Unicode block</span>
          <select aria-label="Unicode block" value={effectiveBlockName}
            onChange={event => chooseBlock(event.target.value)}
            className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none">
            {filteredBlocks.length === 0 && <option value="">No matching blocks</option>}
            {filteredBlocks.map(block => <option key={block.name} value={block.name}>{block.name}</option>)}
          </select>
        </label>
      </div>

      {names ? <UnicodeNameSearch names={names} onInspect={inspect} /> : nameError ? (
        <p role="alert" className="text-xs text-rose-200">Official name data could not be loaded. Block browsing and code point lookup remain available.{" "}
          <button type="button" onClick={() => setNameAttempt(value => value + 1)} className="underline">Retry name loading</button>
        </p>
      ) : <p role="status" className="text-xs text-slate-400">Loading local official name index…</p>}
      {names && <UnicodeNamedSequenceSearch names={names} onUseSequence={onUseCharacter} />}

      <form onSubmit={lookup} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1 text-xs text-slate-300">
          <span>Code point lookup</span>
          <input value={lookupInput} onChange={event => { setLookupInput(event.target.value); setLookupError(""); }}
            inputMode="text" autoComplete="off" spellCheck={false} placeholder="U+13000, 13000, or 0x13000"
            className="w-full min-w-0 rounded border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-700" />
        </label>
        <button type="submit" className="min-h-10 rounded bg-cyan-900 px-4 py-2 text-sm font-medium text-cyan-50 transition-colors hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400">
          Look up code point
        </button>
      </form>
      {lookupError && <p role="alert" data-testid="unicode-lookup-error" className="rounded border border-rose-800/70 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{lookupError}</p>}

      <div className="overflow-hidden rounded border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-950/70 px-3 py-2">
          <p data-testid="unicode-block-count" aria-live="polite" className="font-mono text-xs text-slate-300">
            {activeBlock ? `${activeBlock.name} · ${visiblePage.total.toLocaleString()} assigned characters` : "No matching blocks"}
          </p>
          <p className="font-mono text-[10px] text-slate-500">{pageCount ? `PAGE ${pageNumber} / ${pageCount}` : "EMPTY"}</p>
        </div>
        {visiblePage.points.length > 0 ? (
          <div data-testid="unicode-catalogue-grid" className="grid max-h-64 grid-cols-4 gap-px overflow-y-auto bg-slate-800 p-px sm:grid-cols-8 lg:grid-cols-10">
            {visiblePage.points.map(point => {
              const label = codePointLabel(point);
              const pointInfo = inspectCodePoint(point);
              const isSelected = details?.point === point;
              return (
                <button key={point} type="button" aria-label={`Inspect ${label}`} aria-pressed={isSelected}
                  title={`Inspect ${label}`}
                  onClick={() => inspect(point)}
                  className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden bg-slate-950 px-1 py-1 text-slate-200 transition-colors hover:bg-slate-800 focus:z-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400 aria-pressed:bg-cyan-950">
                  {pointInfo.category.startsWith("C")
                    ? <span className="font-mono text-[10px] text-slate-500">{pointInfo.category}</span>
                    : <bdi dir="auto" className="max-w-full overflow-hidden text-2xl leading-none" aria-label={label}>{String.fromCodePoint(point)}</bdi>}
                  <span className="max-w-full truncate font-mono text-[9px] text-slate-500">{label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="px-3 py-5 text-xs text-slate-400">{activeBlock ? "No assigned characters are listed in this block." : "Try a different block name or script."}</p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-slate-700 bg-slate-950/70 px-3 py-2">
          <button type="button" disabled={safeOffset <= 0 || !activeBlock}
            onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-700 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">
            Previous characters
          </button>
          <span className="font-mono text-[10px] text-slate-500">{visiblePage.points.length ? `${(safeOffset + 1).toLocaleString()}–${(safeOffset + visiblePage.points.length).toLocaleString()}` : "0 results"}</span>
          <button type="button" disabled={!activeBlock || safeOffset + PAGE_SIZE >= visiblePage.total}
            onClick={() => setOffset(value => value + PAGE_SIZE)}
            className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-cyan-700 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">
            Next characters
          </button>
        </div>
      </div>

      {details && (
        <article data-testid="unicode-point-details" aria-labelledby="unicode-point-title" className="min-w-0 space-y-3 rounded border border-cyan-900/80 bg-slate-950/80 p-3">
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-900">
              {details.category.startsWith("C")
                ? <span className="font-mono text-[10px] text-slate-500">{details.category}</span>
                : <bdi dir="auto" aria-label={details.label} className="text-3xl leading-none">{details.character}</bdi>}
            </div>
            <div className="min-w-0 flex-1">
              <h5 id="unicode-point-title" dir="ltr" className="break-all font-mono text-sm font-semibold text-cyan-100">{details.label}</h5>
              <p className="mt-1 text-xs text-slate-300">{details.status === "assigned" ? "Assigned in this catalogue" : `${details.status} · outside the assigned-character catalogue`}</p>
            </div>
            <button type="button" onClick={copyDetails} disabled={!nameDetails || copyState === "pending"}
              aria-describedby="unicode-copy-status"
              className="min-h-10 shrink-0 rounded border border-cyan-700 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">
              Copy character details
            </button>
            {isAssigned && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onUseCharacter(details.character)} className="shrink-0 rounded border border-cyan-700 px-2 py-1.5 text-xs text-cyan-100 hover:bg-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-400">Use symbol in preview</button>
                <button type="button" onClick={() => onAppendCharacter(details.character)} disabled={!appendFits}
                  aria-describedby={!appendFits ? "unicode-append-limit" : undefined}
                  className="shrink-0 rounded border border-cyan-700 px-2 py-1.5 text-xs text-cyan-100 hover:bg-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed">Append symbol to preview</button>
              </div>
            )}
          </div>
          <p id="unicode-copy-status" role={copyState === "error" ? "alert" : "status"} className={`text-xs ${copyState === "error" ? "text-rose-200" : "text-slate-400"}`}>
            {copyState === "error" ? "Could not copy character details. Clipboard access may be unavailable or denied. Select the reference below and copy it manually, or try again."
              : copyState === "success" ? `Character details copied for ${details.label}.`
              : copyState === "pending" ? "Copying character details…"
              : !nameDetails ? "Copy details requires the official name data to finish loading. Retry name loading if it failed."
              : "Copies a plain-text reference without changing the preview."}
          </p>
          {copyState === "error" && referenceText && (
            <div className="min-w-0 space-y-2">
              <label htmlFor="unicode-manual-reference" className="block text-xs text-slate-300">Character details for manual copying</label>
              <p id="unicode-manual-instructions" className="text-xs text-slate-400">Select the text, then use your browser’s Copy command or keyboard shortcut.</p>
              <textarea id="unicode-manual-reference" ref={manualReference} readOnly value={referenceText}
                rows={12} dir="ltr" spellCheck={false} aria-describedby="unicode-manual-instructions"
                className="block w-full min-w-0 select-text rounded border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              <button type="button" onClick={() => { manualReference.current?.focus(); manualReference.current?.select(); }}
                className="min-h-10 rounded border border-cyan-700 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                Select reference text
              </button>
            </div>
          )}
          {isAssigned && !appendFits && (
            <p id="unicode-append-limit" role="status" className="text-xs text-amber-200">
              This symbol needs {details.character.length} UTF-16 {details.character.length === 1 ? "unit" : "units"}, but only {remainingPreviewUnits} remain in the 512-unit preview. Remove text or use the replacement action.
            </p>
          )}
          <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-slate-500">Official name</dt>
            <dd className="min-w-0 break-words font-mono text-slate-200">{nameDetails
              ? nameDetails.name ?? "No Unicode character name"
              : nameError ? "Name data unavailable" : "Loading name data…"}</dd>
            {nameDetails?.controlLabel && <>
              <dt className="text-slate-500">Control label</dt><dd className="text-slate-200">{nameDetails.controlLabel} (not a character name)</dd>
            </>}
            {nameDetails && nameDetails.aliases.length > 0 && <>
              <dt className="text-slate-500">Official aliases</dt>
              <dd className="min-w-0 space-y-1 break-words text-slate-200">{nameDetails.aliases.map(alias =>
                <p key={`${alias.type}:${alias.name}`}><span className="font-mono">{alias.name}</span> <span className="text-slate-400">({alias.type})</span></p>)}</dd>
            </>}
            <dt className="text-slate-500">Script property</dt><dd className="min-w-0 break-words text-slate-200">{details.script}</dd>
            <dt className="text-slate-500">General category</dt><dd className="min-w-0 break-words font-mono text-slate-200">{details.category}</dd>
            <dt className="text-slate-500">Block</dt><dd className="min-w-0 break-words text-slate-200">{details.block}</dd>
          </dl>
          <button type="button" disabled={!names}
            aria-expanded={showRelatedSequences}
            onClick={() => setShowRelatedSequences(value => !value)}
            className="min-h-10 rounded border border-cyan-700 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-950 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40">
            {showRelatedSequences ? "Hide related named sequences" : "Find official named sequences containing this scalar"}
          </button>
          {names && showRelatedSequences && (
            <UnicodeNamedSequenceSearch key={details.point} names={names} containingPoint={details.point} onUseSequence={onUseCharacter} />
          )}
          {details.status !== "assigned" && (
            <p className="border-l-2 border-amber-700 pl-2 text-xs leading-relaxed text-amber-200">
              This scalar is not an assigned character and is excluded from browsing. The coordinate codec may still encode valid scalar values; private-use characters and noncharacters have no assigned catalogue meaning.
            </p>
          )}
          {characterEncoding && (
            <div className="space-y-2 border-t border-slate-800 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Exact software coordinate frame(s)</p>
                <span className={`font-mono text-[10px] ${roundTrip ? "text-emerald-300" : "text-rose-300"}`}>{roundTrip ? "DECODE ROUNDTRIP VERIFIED" : "ROUNDTRIP MISMATCH"}</span>
              </div>
              <div className="space-y-1.5">
                {characterEncoding.frames.map((frame, index) => (
                  <p key={index} className="break-all rounded bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-slate-200">
                    {index + 1}. Ψ({frame.wdm},{frame.oam},{frame.pol}) · {unicodeCoordinateWavelength(frame)} nm
                  </p>
                ))}
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">UTF-8 coordinate data only; combining marks remain separate code points. No normalization, language inference, translation, or decipherment is performed.</p>
            </div>
          )}
        </article>
      )}

      <footer className="space-y-2 border-t border-slate-800 pt-3">
        <p className="text-[10px] leading-relaxed text-slate-500">Pinned Unicode Character Database sources, version {UNICODE_CATALOGUE_VERSION}. These references document character properties, not historical meanings. Unknown historical signs require separate documentation.</p>
        <nav aria-label="Pinned Unicode catalogue sources" className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <a href={sourceFile("Blocks.txt")} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">Blocks.txt</a>
          <a href={sourceFile("Scripts.txt")} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">Scripts.txt</a>
          <a href={sourceFile("extracted/DerivedGeneralCategory.txt")} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">DerivedGeneralCategory.txt</a>
          <a href={sourceFile("UnicodeData.txt")} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">UnicodeData.txt</a>
          <a href={sourceFile("NameAliases.txt")} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">NameAliases.txt</a>
          <a href={sourceFile("NamedSequences.txt")} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">NamedSequences.txt</a>
          <a href="https://www.unicode.org/versions/Unicode17.0.0/" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">Unicode {UNICODE_CATALOGUE_VERSION}</a>
          <a href="https://www.unicode.org/reports/tr44/" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline decoration-cyan-800 underline-offset-2">UAX #44 property definitions</a>
        </nav>
      </footer>
    </section>
  );
}
