import { encodeUnicodeCE } from "@shared/unicode-ce";
import { inspectCodePoint, UNICODE_CATALOGUE_VERSION, UNICODE_UCD_SOURCE } from "@shared/unicode-catalogue";
import type { loadUnicodeNames } from "@shared/unicode-catalogue";

type UnicodeNames = Awaited<ReturnType<typeof loadUnicodeNames>>;

/** Reference envelope only: the nested coordinate payload retains its wire format. */
export function buildUnicodePreviewReference(text: string, names: UnicodeNames) {
  const payload = encodeUnicodeCE(text);
  return JSON.stringify({
    unicodeVersion: UNICODE_CATALOGUE_VERSION,
    unicodeSource: UNICODE_UCD_SOURCE,
    scope: "Whole preview; scalars and frames in logical input order, including repetitions.",
    notice: "UTF-8 software coordinate data only. No normalization, language inference, translation, decipherment, physical-channel verification, or authority permissions.",
    text,
    scalars: [...text].map((character, index) => {
      const details = inspectCodePoint(character.codePointAt(0)!);
      const name = names.inspectUnicodeName(details.point);
      return {
        index: index + 1,
        character,
        codePoint: details.label,
        officialName: name.name,
        controlLabel: name.controlLabel,
        aliases: name.aliases,
        assignmentStatus: details.status,
        generalCategory: details.category,
        script: details.script,
        block: details.block,
        frames: encodeUnicodeCE(character).frames,
      };
    }),
    payload,
  }, null, 2);
}
