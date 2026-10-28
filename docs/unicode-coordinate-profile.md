# Multilingual coordinate encoding — ce-utf8-coordinate-v1

This is an opt-in, reversible **software character-encoding profile**. It is
separate from Python/programming-language translation and does not establish
physical optical performance, translation of human languages, or historical
decipherment.

## Authorised multilingual expansion

On 2026-10-23 the founder explicitly lifted the halt for modern-language,
ancient-script and hieroglyphic coordinate expansion. The wider holds on
promotions, hardware work, live-fund testing and unrelated development remain.
Publishing is still a separate user-controlled action.

The original nine catalogue examples are Chinese, Russian, Māori, Hebrew,
Arabic, Greek, Egyptian hieroglyphs, Sumerian cuneiform and Phoenician.
The founder authorised completing the following recommended expansion:

| Priority | Addition | Representation tested |
| --- | --- | --- |
| 1 | Hindi | Devanagari vowels, virama and conjunct components |
| 2 | Japanese | Mixed kanji, hiragana and katakana |
| 3 | Korean | Hangul syllables and their constituent jamo |
| 4 | Akkadian cuneiform | The a-na sign sequence, with ORACC lexical context |
| 5 | Ancient Greek | A sourced polytonic word, preserving breathing and accent |
| 6 | Tamil | Vowel signs and consonant combinations |
| 7 | Thai | Combining marks and text without word-separating spaces |
| 8 | Amharic | Ethiopic characters |
| 9 | Traditional Chinese | Traditional forms without simplified conversion |
| 10 | Supplementary Han | CJK Extension B ideographs outside the BMP |
| 11 | Old Persian cuneiform | Its distinct a, i and u signs |
| 12 | Runic | The first six Elder Futhark signs |
| 13 | Ogham | Five assigned letters, without reconstructed inscription layout |
| 14 | Linear B | The a, e and i syllabic signs of Mycenaean Greek's script |

All 23 presets are examples, not a whitelist: other valid Unicode text can be entered
directly. Each preset identifies its writing system, explains its limitations
and links to an official Unicode block chart. Editing the text clears the
selected preset's attribution so custom input is not falsely described as a
curated historical example.

Hebrew demonstrates combining niqqud marks and right-to-left text. Cuneiform
and Egyptian samples are demonstration signs, not claimed translations.
Cuneiform was used for Sumerian and other languages, including Akkadian.
Phoenician demonstrates an additional historical alphabet without treating it
as a blanket representation of all historical Hebrew forms.

The Akkadian lexical context is documented in
[ORACC's glossary guidance](https://oracc.museum.upenn.edu/doc/help/visitingoracc/glossaries/index.html);
the Ancient Greek word is documented by
[Logeion / LSJ](https://logeion.uchicago.edu/ἄνθρωπος). Those presets expose a
separate linguistic-source link in addition to the Unicode block reference.
Unicode block charts establish assigned characters, not historical meanings.
Old Persian, Runic, Ogham and Linear B samples are explicitly labelled sign or
alphabet sequences, not fabricated translated inscriptions.

Tests distinguish exact encoding from canonical equivalence: Hindi nukta,
Japanese voiced kana, Korean jamo, Tamil split vowel signs and polytonic Greek
can have multiple canonically equivalent sequences. The profile preserves the
entered sequence rather than silently normalising it. Missing fonts, shaping,
vertical inscription layout and language-specific word segmentation remain
rendering/linguistic concerns, not evidence of lost coordinate data.

## Compatibility and purpose

Some existing WNSP byte-payload paths already accept UTF-8. However, the legacy
CE128 character-to-wavelength map uses a modulo-128 lookup. Different Unicode
characters therefore share wavelength bins; its summary/fingerprint is not a
unique, reversible representation of arbitrary text. Its JS and Python
character handling also differs for supplementary-plane symbols.

The new profile does **not** modify that mapping, its existing npm package
entry points, account names, wallet addresses, blockchain records, protocol
payloads or the VM. It does not migrate data or change access controls.
Consumers must retain the explicit new profile identifier and full ordered
coordinate sequence.

## Exact mapping

1. Require valid Unicode scalar text; reject lone UTF-16 surrogates rather than
   silently replacing them.
2. Encode UTF-8 without normalisation, transliteration, case folding, BOM
   stripping or removal of combining marks.
3. For each byte `b`, emit `{wdm: b & 127, oam: b >> 7, pol: "H"}`.
4. Its wavelength label is the existing CE128 bin:
   `380 + wdm × 3.125 nm`. ASCII bytes retain their legacy wavelength labels.
5. Decode each coordinate as `b = wdm | (oam << 7)` and strictly decode UTF-8.

Here `oam` stores the high byte bit as **software metadata**, not a measured
physical OAM mode. These frames are data, not routing destinations or
permission/authority assignments. The profile is not interchangeable with the
existing account-WDM or VM-name profiles.

For example, `中` is UTF-8 `E4 B8 AD`:

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

ASCII `-` uses `{wdm:45,oam:0,pol:"H"}` and is distinct from the final byte of
`中`. Wavelength alone is insufficient; the whole ordered, versioned sequence
is required. This is not encryption, authentication, tamper detection or a hash
replacement.

## Modern and ancient scripts

Chinese, Cyrillic/Russian, Māori, Arabic, Greek and other Unicode text use the
same mapping, without script-specific exceptions. Supplementary-plane
characters such as Egyptian hieroglyphs and cuneiform are preserved as four
UTF-8 bytes per code point. A grapheme may comprise several code points; code
point counts are not always visible-character counts.

Encoding a hieroglyph preserves its Unicode identity, **not its translation,
pronunciation, historical interpretation or original visual layout**. Fonts
may lack the glyph or layout-control support; code point labels remain
available. Signs without Unicode assignments, damaged inscriptions and images
need a separately researched, provenance-labelled extension. They must not be
silently assigned arbitrary existing characters.

## Interface, bounds and verification

`/ce-code-writer` → **Live Encode** contains the separate multilingual panel
above the unchanged legacy encoder. It provides example text, per-code-point
coordinate sequences, an editable versioned JSON payload and a strict decoder.
There is no server write, automatic account creation or financial operation.
The preview permits 512 UTF-16 units and shows at most 32 code point rows;
the payload contains the full entered preview. Malformed edits clear old
success and produce a visible error. Decoded text is rendered as text, not HTML.

The shared TypeScript codec and standalone Python reference accept at most
65,536 UTF-8 bytes/coordinate frames. Oversized data, unknown profiles,
malformed coordinates and invalid/overlong UTF-8 fail explicitly. They do not
fall back to a lossy character replacement.

Tests cover exact round trips, independent Python/JS parity, an explicit Chinese
golden vector, ASCII wavelength compatibility, Egyptian supplementary-plane
characters, combining marks, joined emoji, leading BOM preservation, invalid
UTF-8, lone surrogates, limits, profile confusion and UI error recovery. The
isolated desktop/mobile production-CSP browser fixture checks the actual
catalogue encode/decode UI, including Hebrew and Sumerian, not mocked coordinate
output. Catalogue samples are also passed through the existing Python →
WavelengthScript → VM path as text operands and as serialised coordinate
payload operands, then recovered exactly. A quoted string resembling commands
must remain inert text. This does not introduce a new instruction per glyph,
execute human-language sentences, or integrate a new default network profile.

This profile has not been published to the package registries or automatically
enabled on existing network endpoints. Its UI and source implementations must
not be described as deployed until publishing and live verification.

## Workspace verification — 2026-10-23

TypeScript and the full database-free build passed (4,161 tests). Its two
opt-in browser cases were then run explicitly and both passed, including
all 23 catalogue examples in the built UI under the production script policy
on desktop and mobile. The expanded checks also cover shared Python/JS codec
parity and text/coordinate payloads passing through existing VM instructions.
The browser fixture also verifies the merged partial-output behaviour:
execution failures retain preceding output, show an error and do not execute
following instructions; compile errors, edits and reset still clear stale output.
Real credentials, fund
transfers and persistent account data were not used. The dependency scanner
still reports its previously unexplained Python inventory; this feature's
verification is not a security clearance.
