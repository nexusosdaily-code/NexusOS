# Multilingual software status and verification boundaries

**Status date: 2026-10-23. This is a development-workspace report, not a release
announcement or security clearance.**

WavelengthScript and the blockchain remain the project's primary direction.
Multilingual character encoding expands the software representation of text;
it does not make proposed photonic hardware a delivered product. See
[project direction](PROJECT_DIRECTION.md) and
[research evidence and corrections](RESEARCH_STATUS.md).

## What this GitHub update does

This documentation-only update describes software implemented in the Replit
development workspace. It does not synchronise the complete implementation
source, publish an npm/Python package, deploy the website or merge pending
development. A public route's availability does not establish its deployed
version. Do not infer that GitHub `main`, published packages, the workspace
and the live website are identical.

Source paths below identify the inspected workspace implementation. They are
not a promise that every referenced implementation file is present in this
documentation-only GitHub update.

## 1. A reversible Unicode coordinate profile

The opt-in profile is named `ce-utf8-coordinate-v1`. It represents existing
Unicode text through UTF-8 byte coordinates:

1. Require valid Unicode scalar text; reject lone UTF-16 surrogates.
2. Encode UTF-8 without silently normalising, transliterating, stripping marks
   or changing logical character order.
3. For each byte `b`, emit `wdm = b & 127`, `oam = b >> 7`, `pol = "H"`.
4. Preserve the entire ordered sequence and profile identifier.
5. Recover bytes using `b = wdm | (oam << 7)` and strictly decode UTF-8.

The wavelength label remains `380 + 3.125 × wdm` nm. These labels and the
high-bit `oam` field are **software metadata**, not measured optical modes.
They are not account destinations, execution permissions or physical-channel
validation. A character may require several frames; a visible grapheme may
also contain several Unicode code points.

For example, `中` becomes:

```json
{
  "profile": "ce-utf8-coordinate-v1",
  "frames": [
    {"wdm": 100, "oam": 1, "pol": "H"},
    {"wdm": 56, "oam": 1, "pol": "H"},
    {"wdm": 45, "oam": 1, "pol": "H"}
  ]
}
```

The shared TypeScript implementation and independent Python reference enforce
a 65,536-byte/frame bound. The interactive text preview permits 512 UTF-16
units and displays at most 32 code-point rows, while encoding the complete
accepted preview. This is not a 512-grapheme limit.

The legacy CE128 modulo-bin mapping is unchanged. Wavelength alone is not a
unique representation of arbitrary Unicode. Existing account names, wallet
addresses, ledger mappings and authentication rules are not reinterpreted.
Encoding does not replace hashes, signatures, transaction authorisation,
consensus, encryption or integrity checks.

Workspace references: `shared/unicode-ce.ts`,
`packages/ce-encoder-py/unicode_ce.py`,
`client/src/components/unicode-coordinate-panel.tsx`.

## 2. Twenty-three curated examples, not complete language understanding

The original nine presets are Chinese, Russian, Māori, Hebrew, Arabic, Greek,
Egyptian hieroglyphs, Sumerian cuneiform and Phoenician.

The subsequent recommended additions were completed in this priority order:

| Priority | Addition | What it exercises |
| --- | --- | --- |
| 1 | Hindi | Devanagari vowels, virama and conjunct components |
| 2 | Japanese | Mixed kanji, hiragana and katakana |
| 3 | Korean | Precomposed Hangul and constituent jamo |
| 4 | Akkadian cuneiform | The a-na sign sequence with ORACC lexical context |
| 5 | Ancient Greek | A sourced polytonic word with breathing/accent |
| 6 | Tamil | Vowel signs and consonant combinations |
| 7 | Thai | Combining marks and text without word-separating spaces |
| 8 | Amharic | Ethiopic characters |
| 9 | Traditional Chinese | Traditional forms without simplified conversion |
| 10 | Supplementary Han | CJK Extension B ideographs outside the BMP |
| 11 | Old Persian cuneiform | Its distinct a, i and u signs |
| 12 | Runic | The first six Elder Futhark signs |
| 13 | Ogham | Five assigned letters |
| 14 | Linear B | The a, e and i syllabic signs |

The presets are not a whitelist: the codec accepts other valid Unicode text.
They demonstrate character representation, not a grammar, dictionary,
translation model, speech system or full historical-language implementation.

Historical sign sequences are labelled as demonstrations rather than
fabricated translated inscriptions. The Akkadian lexical context links to
[ORACC](https://oracc.museum.upenn.edu/doc/help/visitingoracc/glossaries/index.html);
the Ancient Greek word links to
[Logeion / LSJ](https://logeion.uchicago.edu/ἄνθρωπος). Unicode block charts
establish character assignments, not linguistic meaning.

Workspace reference: `shared/unicode-script-examples.ts`.

## 3. Merged catalogue and text-assembly capabilities

The workspace catalogue uses pinned
[Unicode 17.0.0](https://www.unicode.org/versions/Unicode17.0.0/) data:

- Browse Unicode blocks and intersecting Script properties.
- Look up hexadecimal code points and inspect categories and exact coordinates.
- Search official character names and typed formal aliases using
  case-insensitive, literal substring matching.
- Display algorithmic names for assigned Han, Tangut and Hangul characters.
- Append inspected assigned characters to the text preview, keeping existing
  text and respecting the UTF-16-unit limit.
- Clear the preview before assembling a new sequence.
- Load the resulting coordinate payload and decode it back exactly.

Blocks, Script properties and human languages are different classifications.
`Common`, `Inherited` and `Unknown` are property values, not language labels.
The name search does not supply meanings, synonyms, readings or translations.
Formal aliases retain their types; they do not silently replace official names.

Unassigned, private-use and noncharacter scalars have no standardised catalogue
meaning. Surrogates are rejected. Some valid scalars outside the assigned
character browser can still be encoded as data; that does not give them a
Unicode assignment, linguistic interpretation or authority.

Official Unicode named-sequence search and combined identity/coordinate-copy
work are still in progress at this report's cutoff. They are not claimed as
completed capabilities here.

Workspace references: `shared/unicode-catalogue.ts`,
`shared/unicode-character-names.ts`,
`client/src/components/unicode-catalogue-browser.tsx`,
`client/src/components/unicode-name-search.tsx`.

## 4. What VM execution establishes

Tests pass each preset through the existing Python → WavelengthScript → VM
path both as text operands and as serialised coordinate-payload operands.
The recovered output equals the original text.

This shows that existing instructions can carry multilingual data. It does
not create an executable opcode for each glyph, make human-language sentences
commands, implement every programming language or run code natively on a
photonic processor.

The executable Python subset has explicit restrictions. Conditions and
functions are supported within that defined subset; general imports,
third-party libraries, arbitrary source syntax and full Python compatibility
are not promised. Source edits and compile errors clear stale output; runtime
errors preserve prior printed output and stop following instructions.

## 5. Verification evidence and limits

The earlier language/script expansion passed a database-free build containing
**4,161 tests**, followed by explicit desktop/mobile production-CSP browser
cases covering all 23 presets. That full-build count predates some subsequent
catalogue merges and must not be presented as a fresh all-project result for
every later change.

Post-merge documentation verification passed TypeScript and **213 focused
Unicode server/client tests across seven files**. This is a new focused result,
not a rerun of the full build or browser fixtures. An older test count is not
being presented as a new all-project claim.

The merged native-input test report records **11 Chromium cases** for real
paste and browser composition-engine behaviour at the preview limit. It
checks supplementary scalars, combining marks, logical bidi order and exact
coordinate recovery. It is not verification of Firefox, WebKit, every mobile
keyboard or an operating-system IME.

Production-CSP browser fixtures use synthetic login, in-memory storage and
blocked real database access. Native-input checks intercept API requests.
These are not real-account, live-fund or deployed-production tests.

Missing fonts can produce absent or different-looking glyphs without changing
stored data. Historical orientation, inscription layout, word segmentation,
authentic provenance and undeciphered meanings are not established by a
successful encoding round trip.

Workspace test references include `server/unicode-ce.test.ts`,
`server/unicode-ce-vm.test.ts`, `server/unicode-catalogue.test.ts`,
`server/unicode-character-names.test.ts`,
`server/browser-session.security.test.ts`, the Unicode component suites and
`scripts/test-browser-unicode-preview.mjs`.

## 6. Security and wider project boundaries

The previously reported dependency-scanner inventory discrepancy remains
explicitly unresolved. Its reported Python packages have not been reconciled
with the inspected runtime/lockfile inventory. It must not be silently
dismissed as a false positive or described as a complete security clearance.
Functional encoding tests do not resolve that discrepancy.

Hardware fundraising, promotional broadcasting, speculative hardware work and
live-fund testing remain on hold. Completing multilingual software does not
lift those holds, prove experimental physics, establish historical priority
or require funds to be transferred to an AI assistant.
