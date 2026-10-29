export function NativeCollectionDisclosure() {
  return (
    <section
      className="mt-9 rounded-2xl border border-[#d6d4c9] bg-[#f8f7f1] p-5 text-sm leading-relaxed text-[#405b4b] sm:p-6"
      aria-labelledby="native-collection-disclosure-title"
      data-testid="native-collection-disclosure"
    >
      <h2 id="native-collection-disclosure-title" className="text-xl font-semibold">
        WavelengthScript in live broadcasting
      </h2>
      <p className="mt-3">
        On 29 October 2026, we introduced a small native WavelengthScript
        collection library into private live-broadcast recipient selection.
        Executable WLS-COLLECTION/1 programs add recipients without duplicates,
        remove recipients and count the selected addresses. Directory choices
        and manually entered addresses use the same programs.
      </p>
      <p className="mt-3">
        The library also provides indexed lookup. Compiled instructions carry
        wavelength-coordinate metadata, and execution traces show which
        instructions ran. The current selection limit is 20 recipients; this is
        a private invitation-selection limit, not a promise of broadcast capacity.
      </p>
      <p className="mt-3">
        This is working WavelengthScript program logic running on a TypeScript
        execution engine. The engine still supplies primitive collection
        operations. It is not a complete standard library, dependency rewrite or
        replacement for WebRTC, account permissions, storage or the database.
        Coordinates are not encryption or access permissions.
      </p>
      <p className="mt-3">
        Automated checks cover results, executed instructions, duplicate handling,
        input limits and browser recipient selection. Our physical live-stream
        tests establish media delivery separately; they do not by themselves
        verify the language implementation or absolute privacy.
      </p>
      <p className="mt-3">
        Operator-inaccessible privacy has not been established. Privacy review
        and remediation are our next priority before further WavelengthScript
        expansion; this disclosure does not claim that concern is resolved.
      </p>
    </section>
  );
}
