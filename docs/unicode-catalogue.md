# Unicode writing-system catalogue

The multilingual panel is an offline view of **Unicode 17.0.0**, not a
translation service, decipherment, language detector or new character standard.
It does not change CE128, accounts, addresses, ledger mappings or execution
permissions. Coordinates remain the existing `ce-utf8-coordinate-v1` UTF-8
software profile. They are not experimentally verified optical channels.

## Official sources and reproducibility

Sources are the final Unicode Character Database released for Unicode 17.0.0
(2025). The checked-in compact property index is generated from:

| File (relative to https://www.unicode.org/Public/17.0.0/ucd/) | SHA-256 |
|---|---|
| `Blocks.txt` | `c0edefaf1a19771e830a82735472716af6bf3c3975f6c2a23ffbe2580fbbcb15` |
| `Scripts.txt` | `9f5e50d3abaee7d6ce09480f325c706f485ae3240912527e651954d2d6b035bf` |
| `extracted/DerivedGeneralCategory.txt` | `d62e5bab70ca74f099343f71224fa051cb1fdd61a1ab45c0488c44cfc0b6102e` |
| `UnicodeData.txt` | `2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c` |
| `NameAliases.txt` | `793f6f1e4d15fd90f05ae66460191dc4d75d1fea90136a25f30dd6a4cb950eac` |
| `NamedSequences.txt` | `0cd1c928edac72ea1369187599727c4f0d92367316b4c5ee5140475ab9298be0` |

Download these six files into a temporary directory (use the basename for
the extracted file). Run:

```sh
npx tsx scripts/generate-unicode-catalogue.ts /tmp/unicode-17
```

The generator rejects changed source hashes, strips comments and sorts ranges.
The result in `shared/unicode-catalogue-data.json` contains version, block,
Script and General_Category ranges. The separate
`shared/unicode-character-names-data.json` contains names, algorithmic name ranges
and typed formal aliases from the same release. The separately labelled approved
named-sequence index is `shared/unicode-named-sequences-data.json`, generated
from the hash-pinned `NamedSequences.txt` of that same release. Unicode source files and downloads are not
needed at runtime. No ICU/browser property regex or installed font determines
assignment status. Property definitions:
[UAX #44](https://www.unicode.org/reports/tr44/),
[Unicode 17.0.0](https://www.unicode.org/versions/Unicode17.0.0/).
Unicode data is distributed under [Unicode License v3](unicode-license.txt).

## What is and is not catalogued

- Blocks are numerical ranges, **not** languages or necessarily single scripts.
  Search matches block names and intersecting Script properties. It does not
  search invented translations, glyph meanings or language names.
- Script is the UCD `Script` property, not `Script_Extensions`. `Common`,
  `Inherited` and `Unknown` are property values, not language identifications.
  A script may serve many languages; a language may use multiple scripts.
- Browsing includes categories other than `Cn`, `Co` and `Cs`. This includes
  assigned controls, format characters and combining marks, not only visible
  letters. Code point labels and categories remain usable without a font.
- Lookup accepts hexadecimal `U+`, `0x` or bare code points. Surrogates and
  values outside U+0000–U+10FFFF are rejected. Private-use points have no
  standardised character interpretation, unassigned points have no assignment
  in this pinned release, and noncharacters are reserved for internal use.
  These valid scalars can be encoded as data but are outside the assigned
  character browser. No meaning or authority is attached to them.
- Unknown historical signs are outside this catalogue unless separately
  documented. Unicode coverage does not imply decipherment, complete
  palaeographic coverage, linguistic certainty or authenticated provenance.
- U+ identifiers remain the primary font-independent labels; the inspector
  additionally shows the exact official character name and all formal aliases
  with their types. General_Category abbreviations are official UCD properties.

## Official name search

Open the catalogue to load its local name index, then submit an official name
or alias (for example `EGYPTIAN HIEROGLYPH A001`, `SNOWMAN`,
`CJK UNIFIED IDEOGRAPH-4E00` or `HANGUL SYLLABLE GA`). Results select the same
scalar inspector, exact UTF-8 coordinates and existing preview action as block
browsing. Code point lookup also displays names when the index is loaded.

Search is case-insensitive **literal substring** matching of the whole trimmed
query, limited to 120 characters. Internal spaces, hyphens and spelling are
not rewritten; this is not UAX #44 loose matching, fuzzy search or translation.
The single-scalar search does not search Unicode 1 names, informal NamesList annotations, Unihan
readings, named sequences, synonyms or inferred meanings. A character matching
both its name and an alias appears once, in ascending scalar order. Empty input
asks for a query; an unmatched query returns zero results.

Official names are not corrected in place: e.g. U+FE18 retains the official
`… LENTICULAR BRAKCET` spelling, while the `… LENTICULAR BRACKET` correction
is separately labelled `correction`. Alias types `control`, `alternate`,
`figment` and `abbreviation` are likewise preserved without upgrading them to
character names. Controls have no Unicode Name property: `<control>` is shown
as a **control label**, not a name, and searches find their official aliases
(such as `LINE FEED`). UnicodeData range markers are never displayed or searched
as names. Private-use, unassigned and noncharacter scalars have no catalogue
names or aliases and never become name-search results.

Algorithmic names follow Unicode 17 §4.8 and the Hangul syllable algorithm
in §3.12: assigned Han ranges use `CJK UNIFIED IDEOGRAPH-` plus uppercase
hexadecimal code point, Tangut ranges use `TANGUT IDEOGRAPH-`, and Hangul uses
the normative leading/vowel/trailing short-name tables. Compatibility
ideographs, Khitan and Nushu names are already explicit in UnicodeData.
Only the release's assigned ranges are expanded, not entire blocks.

The ~1.77 MB uncompressed name/sequence index is a separate dynamically imported module,
requested only when the catalogue is opened, not by initial codec/property
imports. It is bundled locally (no Unicode website requests at runtime).
Search scans the compact index on explicit submission or pagination, retains
at most 64 matching scalar IDs per page plus a total count, and renders at
most 64 result rows. The full expanded list is never materialised. A failed
chunk load is reported with retry; block browsing and scalar lookup still work.

## Official named-sequence search

The separately labelled **Search official named character sequences** form
searches only approved names from `NamedSequences.txt`, not
`NamedSequencesProv.txt`, emoji descriptions, aliases or inferred combinations.
For example, `KEYCAP DIGIT ONE` is exactly `U+0031 U+FE0F U+20E3`, not a
single scalar. Names are identifiers, not translations or decipherment.
The same trimmed, case-insensitive literal substring rules and 120-character
query cap apply. Empty input asks for a name and unmatched input returns zero.
Pages retain and render at most 64 results, with a total count, sorted by exact
official name; scalars **within** each result always stay in source order.
The sequence index loads locally with the deferred name module, not on initial
codec/property import. No runtime Unicode network access is required.

### Exact code-point-list lookup

The separate **Find official named sequence by exact code-point list** form
accepts whitespace-separated `U+` identifiers with 4–6 hexadecimal digits
(case-insensitive), for example `U+0031 U+FE0F U+20E3`. Leading/trailing
whitespace, tabs and newlines are allowed. Commas, bare hexadecimal, `0x`,
literal glyphs and names are not accepted in this form.

Input is capped at 512 characters and 32 scalars; every token is validated
before matching. Surrogates and values above U+10FFFF are invalid input,
reported separately from a valid list with **no official named sequence
match** in Unicode 17. Private-use, noncharacter and unassigned scalars are
valid scalar input but do not acquire official sequence names. Single-scalar
lists are valid input, not a request to search character names.

Only exact ordered scalar equality against the pinned approved
`NamedSequences.txt` is used, including repeated scalars, combining marks and
variation selectors. Equivalent normalized spellings, reordered marks, missing
selectors, prefixes, suffixes and provisional sequences never match by
inference. Results retain source name order and are capped at 64 rows (the
total count is reported). Each result opens the same sequence inspector and
explicit preview-replacement action as name search; lookup itself never
changes preview text. No additional data download or network lookup is used.

Selecting a result shows every scalar's `U+` identifier, official name and exact
existing UTF-8 coordinate frames and wavelengths, plus a whole-sequence decode
round trip. Combining marks and variation selectors remain separate scalars;
no normalization, sorting, mark removal or visual-bidi reordering is applied.
Glyphs are isolated from labels; font support cannot change the encoded data.

**Replace preview with named sequence** replaces the text exactly and clears
stale sample/decode context. It never appends individual catalogue symbols or
automatically edits text on selection. It respects the existing 512 UTF-16-unit
input limit and 32-scalar display limit, disabling replacement if a sequence
would exceed either; all approved Unicode 17 sequences fit. Every selected
sequence scalar is shown, without truncation. The existing individual-symbol
use/append actions remain separate and unchanged.

## Exact encoding and rendering

One scalar yields 1–4 UTF-8 frames. Each byte has `wdm = byte & 127`,
`oam = byte >>> 7`, `pol = H`. Frame order and displayed wavelengths use the
existing codec unchanged. The inspector verifies decoding back to the exact
scalar. Full text uses logical code point order, never visual bidi order;
no normalisation, accent folding, mark removal, BOM stripping or grapheme
merging is applied. Glyph rendering is isolated from labels and coordinates.
Missing fonts cannot change stored values. A combining mark or formatting
character may have no standalone visible glyph.

## Verification boundaries

Shared/server tests check official index structure and representative release
assignments, official names, typed aliases, algorithmic name boundaries,
approved named sequences and their exact scalar order/coordinate frames,
surrogate rejection, noncharacters/private use and
coordinate golden vectors. Client tests exercise browsing, pagination,
non-assigned lookup, name search and pagination, lazy-load failure/retry,
error recovery, selection and the existing exact payload
workflow. The opt-in `npm run test:browser-session` suite serves the built UI
under the actual production CSP with synthetic BTC login and in-memory
storage, for desktop and mobile. It also exercises named-sequence pagination,
keycap variation selectors, Latin combining marks and Arabic logical order
through exact preview replacement and payload decoding. Real DB imports/connections are forbidden.
These are local fixture checks, not a real account, live-fund test or publish.
