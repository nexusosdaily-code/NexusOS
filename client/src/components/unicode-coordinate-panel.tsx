import { useEffect, useMemo, useRef, useState } from "react";
import {
  encodeUnicodeCE, decodeUnicodeCE, unicodeCoordinateWavelength, UNICODE_CE_PROFILE,
} from "@shared/unicode-ce";
import { UNICODE_SCRIPT_EXAMPLES, type UnicodeScriptExample } from "@shared/unicode-script-examples";
import { UnicodeCatalogueBrowser } from "./unicode-catalogue-browser";
import { loadUnicodeNames } from "@shared/unicode-catalogue";
import { buildUnicodePreviewReference } from "./unicode-preview-reference";

const PREVIEW_LIMIT = 512;

export function UnicodeCoordinatePanel() {
  const [text, setText] = useState("Hello · 中文 · Русский · 𓀀");
  const [example, setExample] = useState<UnicodeScriptExample | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [payloadText, setPayloadText] = useState("");
  const [decoded, setDecoded] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState("");
  const [names, setNames] = useState<Awaited<ReturnType<typeof loadUnicodeNames>> | null>(null);
  const [nameError, setNameError] = useState(false);
  const [nameAttempt, setNameAttempt] = useState(0);
  const [copyState, setCopyState] = useState<"idle" | "pending" | "success" | "error">("idle");
  const copyAttempt = useRef(0);
  useEffect(() => {
    let active = true;
    setNameError(false);
    loadUnicodeNames().then(value => { if (active) setNames(value); })
      .catch(() => { if (active) setNameError(true); });
    return () => { active = false; };
  }, [nameAttempt]);
  useEffect(() => () => { copyAttempt.current++; }, []);
  const encoded = useMemo(() => {
    try { return { payload: encodeUnicodeCE(text), error: "" }; }
    catch (error) { return { payload: null, error: (error as Error).message }; }
  }, [text]);
  const characters = [...text];
  const reference = useMemo(() => names && encoded.payload
    ? buildUnicodePreviewReference(text, names) : null, [text, names, encoded.payload]);
  const editPreview = (value: string, selectedExample: UnicodeScriptExample | null = null) => {
    copyAttempt.current++;
    setCopyState("idle");
    setText(value);
    setExample(selectedExample);
    setDecoded(null);
    setDecodeError("");
  };
  const copyReference = async () => {
    if (reference === null) return;
    const attempt = ++copyAttempt.current;
    setCopyState("pending");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      // Keep the write inside the user gesture; name data is already loaded.
      await navigator.clipboard.writeText(reference);
      if (copyAttempt.current === attempt) setCopyState("success");
    } catch {
      if (copyAttempt.current === attempt) setCopyState("error");
    }
  };
  const loadPayload = () => {
    if (!encoded.payload) return;
    setPayloadText(JSON.stringify(encoded.payload));
    setDecoded(null); setDecodeError("");
  };
  const decode = () => {
    setDecoded(null); setDecodeError("");
    try { setDecoded(decodeUnicodeCE(JSON.parse(payloadText))); }
    catch (error) { setDecodeError((error as Error).message); }
  };
  return (
    <section className="mb-8 space-y-3 rounded-xl border border-cyan-500/25 bg-slate-950/70 p-4"
             aria-labelledby="unicode-ce-title">
      <h3 id="unicode-ce-title" className="font-semibold text-cyan-200">Multilingual coordinate encoding</h3>
      <p className="text-xs text-slate-300">
        Opt-in profile <code>{UNICODE_CE_PROFILE}</code>. UTF-8 bytes become coordinate sequences;
        a character can use multiple frames. This does not translate text or change existing addresses.
      </p>
      <div className="flex flex-wrap gap-2">
        {UNICODE_SCRIPT_EXAMPLES.map(entry => (
          <button key={entry.label} type="button" aria-pressed={example?.label === entry.label}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 aria-pressed:border-cyan-400"
                  onClick={() => editPreview(entry.text, entry)}>
            {entry.label}
          </button>
        ))}
      </div>
      {example && (
        <p data-testid="unicode-script-context" className="text-xs text-slate-300">
          <strong>{example.writingSystem}.</strong> {example.context}{" "}
          <a href={example.reference} target="_blank" rel="noopener noreferrer" className="text-cyan-200 underline">
            Unicode block reference
          </a>
          {example.linguisticSource && <> · <a href={example.linguisticSource.url} target="_blank" rel="noopener noreferrer"
            className="text-cyan-200 underline">Linguistic source: {example.linguisticSource.label}</a></>}
        </p>
      )}
      <div className="rounded border border-slate-700/80 bg-slate-900/40 p-3">
        <button type="button" aria-expanded={catalogueOpen} aria-controls="unicode-catalogue-region"
          onClick={() => setCatalogueOpen(open => !open)}
          className="flex w-full items-center justify-between gap-3 text-left text-sm font-medium text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500">
          <span>Browse Unicode writing-system catalogue</span>
          <span aria-hidden="true" className="font-mono text-xs text-cyan-300">{catalogueOpen ? "−" : "+"}</span>
        </button>
        <p className="mt-1 text-xs text-slate-400">Search bundled Unicode block and script properties, inspect assigned characters, or look up a scalar value.</p>
      </div>
      {catalogueOpen && (
        <div id="unicode-catalogue-region">
          <UnicodeCatalogueBrowser remainingPreviewUnits={PREVIEW_LIMIT - text.length} onUseCharacter={character => {
            editPreview(character);
          }} onAppendCharacter={character => {
            if (text.length + character.length > PREVIEW_LIMIT) return;
            editPreview(text + character);
          }} />
        </div>
      )}
      <label className="block space-y-1 text-xs text-slate-300">
        <span>Unicode text · up to 512 UTF-16 units in this preview</span>
        <textarea data-testid="unicode-input" value={text} maxLength={PREVIEW_LIMIT} dir="auto" rows={3}
                  onChange={event => editPreview(event.target.value)}
                  className="w-full rounded border border-slate-600 bg-slate-900 p-2 text-base text-white" />
      </label>
      <button type="button" onClick={() => editPreview("")}
              className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-200">
        Clear preview
      </button>
      <div className="space-y-2">
        <button type="button" onClick={copyReference} disabled={reference === null || copyState === "pending"}
          className="rounded border border-cyan-700 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40">
          Copy whole-preview reference
        </button>
        <p className="text-xs text-slate-400">
          Copies reference JSON for every scalar, including repeats, with pinned Unicode metadata and ordered frames.
          Separate from the inspector’s single-character copy and the coordinate payload below.
          Unnamed points use a null official name; control labels and typed aliases are separate metadata.
        </p>
        {!names && !nameError && <p role="status" className="text-xs text-slate-400">Loading local preview reference metadata…</p>}
        {nameError && <p role="alert" className="text-xs text-red-300">
          Preview reference metadata could not be loaded.{" "}
          <button type="button" onClick={() => setNameAttempt(value => value + 1)} className="underline">Retry preview reference metadata</button>
        </p>}
        {copyState === "pending" && <p role="status" className="text-xs text-cyan-200">Copying whole-preview reference…</p>}
        {copyState === "success" && <p role="status" className="text-xs text-cyan-200">Whole-preview reference copied.</p>}
        {copyState === "error" && <p role="alert" className="text-xs text-red-300">Could not copy whole-preview reference. Check clipboard permissions and try again.</p>}
      </div>
      {encoded.error && <p role="alert" className="text-sm text-red-300">{encoded.error}</p>}
      {encoded.payload && (
        <>
          <p data-testid="unicode-counts" className="text-xs text-cyan-200">
            {characters.length} Unicode code points · {encoded.payload.frames.length} UTF-8 coordinate frames
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead><tr><th className="p-1">Symbol</th><th className="p-1">Code point</th><th className="p-1">Coordinate sequence</th></tr></thead>
              <tbody>
                {characters.slice(0, 32).map((char, index) => (
                  <tr key={index} className="border-t border-slate-800">
                    <td className="p-1 text-xl"><bdi dir="auto">{char}</bdi></td>
                    <td className="p-1 font-mono" dir="ltr">U+{char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}</td>
                    <td className="p-1 font-mono break-words">
                      {encodeUnicodeCE(char).frames.map((frame, n) => (
                        <span key={n} className="mr-2 inline-block">
                          Ψ({frame.wdm},{frame.oam},{frame.pol}) · {unicodeCoordinateWavelength(frame)} nm
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {characters.length > 32 && <p className="text-xs text-slate-400">Showing the first 32 code points; the payload includes the full preview text.</p>}
          <button type="button" data-testid="unicode-load-payload" onClick={loadPayload}
                  className="rounded bg-cyan-900 px-3 py-2 text-sm text-white">Load encoded payload for decoding</button>
        </>
      )}
      <label className="block space-y-1 text-xs text-slate-300">
        <span>Versioned coordinate payload · JSON</span>
        <textarea data-testid="unicode-payload" value={payloadText} maxLength={160_000} rows={3}
                  onChange={event => { setPayloadText(event.target.value); setDecoded(null); setDecodeError(""); }}
                  className="w-full rounded border border-slate-600 bg-slate-900 p-2 font-mono text-xs text-white" />
      </label>
      <button type="button" data-testid="unicode-decode" disabled={!payloadText}
              onClick={decode} className="rounded border border-cyan-700 px-3 py-2 text-sm text-cyan-100 disabled:opacity-40">
        Decode coordinates
      </button>
      {decodeError && <p role="alert" data-testid="unicode-error" className="text-sm text-red-300">{decodeError}</p>}
      {decoded !== null && (
        <pre data-testid="unicode-decoded" dir="auto" className="whitespace-pre-wrap break-words rounded border border-cyan-700 p-3 text-white">
          {decoded === "" ? "(empty text)" : decoded}
        </pre>
      )}
      <p className="text-xs text-slate-400">
        Code points are not always whole visible characters: accents and joined symbols may use several.
        No normalisation is applied. Missing glyphs indicate font support, not lost encoding.
        Only scripts with Unicode assignments are covered; unknown signs need a separately documented extension.
        Text and coordinate payloads are data, not newly executable commands or one opcode per glyph.
        These are software coordinates, not verified optical channels or authority permissions.
      </p>
    </section>
  );
}
