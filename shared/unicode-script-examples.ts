/**
 * Script examples, not a new character standard or translations of ancient text.
 * The codec supports valid Unicode independently of this illustrative catalogue.
 * References identify Unicode blocks, not proof of a word's historical meaning.
 */
export interface UnicodeScriptExample {
  label: string;
  text: string;
  writingSystem: string;
  context: string;
  reference: string;
  linguisticSource?: { label: string; url: string };
}

export const UNICODE_SCRIPT_EXAMPLES: readonly UnicodeScriptExample[] = [
  {
    label: "Chinese", text: "中文，世界你好！", writingSystem: "Han characters",
    context: "Chinese text, including punctuation. A Han character alone does not identify a spoken language.",
    reference: "https://www.unicode.org/charts/PDF/U4E00.pdf",
  },
  {
    label: "Russian", text: "Привет, мир!", writingSystem: "Cyrillic",
    context: "Russian text. Cyrillic is also used by other languages.",
    reference: "https://www.unicode.org/charts/PDF/U0400.pdf",
  },
  {
    label: "Māori", text: "Kia ora, whānau", writingSystem: "Latin with macrons",
    context: "Māori text with a macron. Diacritics are preserved, not folded into unaccented letters.",
    reference: "https://www.unicode.org/charts/PDF/U0100.pdf",
  },
  {
    label: "Hebrew", text: "שָׁלוֹם", writingSystem: "Hebrew square script with niqqud",
    context: "Hebrew letters and combining vowel/reading marks. This does not reproduce every historical Hebrew letterform.",
    reference: "https://www.unicode.org/charts/PDF/U0590.pdf",
  },
  {
    label: "Arabic", text: "مرحبا بالعالم", writingSystem: "Arabic",
    context: "Arabic text. Joining and right-to-left display depend on rendering; the logical character order is preserved.",
    reference: "https://www.unicode.org/charts/PDF/U0600.pdf",
  },
  {
    label: "Greek", text: "Ελληνικά", writingSystem: "Greek",
    context: "Modern Greek text with an accent. This example is not an ancient inscription.",
    reference: "https://www.unicode.org/charts/PDF/U0370.pdf",
  },
  {
    label: "Egyptian hieroglyphs", text: "𓀀𓂀𓆣", writingSystem: "Egyptian hieroglyphs",
    context: "Individual Unicode-assigned signs, not a translated sentence or a reconstruction of inscription layout.",
    reference: "https://www.unicode.org/charts/PDF/U13000.pdf",
  },
  {
    label: "Sumerian cuneiform", text: "𒀀𒆠𒀭", writingSystem: "Cuneiform",
    context: "Demonstration signs, not a translated Sumerian sentence. Cuneiform was used for Sumerian and other languages, including Akkadian.",
    reference: "https://www.unicode.org/charts/PDF/U12000.pdf",
  },
  {
    label: "Phoenician", text: "𐤀𐤁𐤂", writingSystem: "Phoenician alphabet",
    context: "Three Unicode-assigned alphabetic signs, not a translated phrase. Historical script forms require their own documented interpretation.",
    reference: "https://www.unicode.org/charts/PDF/U10900.pdf",
  },
  // Expansion priority: the first three modern additions, then the two
  // documented historical language samples, followed by the remaining scripts.
  {
    label: "Hindi", text: "नमस्ते दुनिया · क्ष", writingSystem: "Devanagari",
    context: "Hindi text followed by a conjunct demonstration. Vowel signs and virama/consonant sequences are preserved; shaping depends on the renderer.",
    reference: "https://www.unicode.org/charts/PDF/U0900.pdf",
  },
  {
    label: "Japanese", text: "日本語・ひらがな・カタカナ", writingSystem: "Kanji, hiragana and katakana",
    context: "A mixed-script Japanese example. Han characters, hiragana and katakana remain distinct character sequences.",
    reference: "https://www.unicode.org/charts/",
  },
  {
    label: "Korean", text: "한글 · 한글", writingSystem: "Hangul syllables and constituent jamo",
    context: "Precomposed 한글 followed by its constituent jamo sequence. Canonically equivalent spellings are retained exactly, not normalised into one representation.",
    reference: "https://www.unicode.org/charts/PDF/UAC00.pdf",
  },
  {
    label: "Akkadian cuneiform", text: "𒀀𒈾", writingSystem: "Cuneiform",
    context: "The a-na sign sequence for Akkadian ana, a preposition. This is a standard Unicode rendering, not a facsimile of an inscription or automatic decipherment.",
    reference: "https://www.unicode.org/charts/PDF/U12000.pdf",
    linguisticSource: {
      label: "ORACC Akkadian glossary guidance",
      url: "https://oracc.museum.upenn.edu/doc/help/visitingoracc/glossaries/index.html",
    },
  },
  {
    label: "Ancient Greek", text: "ἄνθρωπος", writingSystem: "Polytonic Greek",
    context: "A documented Ancient Greek word in conventional polytonic spelling, retaining its breathing and accent. This does not reconstruct an inscription's original letterforms.",
    reference: "https://www.unicode.org/charts/PDF/U1F00.pdf",
    linguisticSource: {
      label: "Logeion / LSJ dictionary entry",
      url: "https://logeion.uchicago.edu/ἄνθρωπος",
    },
  },
  {
    label: "Tamil", text: "வணக்கம் உலகம்", writingSystem: "Tamil",
    context: "Tamil text with vowel signs and consonant combinations. Exact logical character order is preserved independently of font shaping.",
    reference: "https://www.unicode.org/charts/PDF/U0B80.pdf",
  },
  {
    label: "Thai", text: "สวัสดีชาวโลก", writingSystem: "Thai",
    context: "Thai text with combining marks and no spaces between its words. Encoding does not infer word boundaries or perform translation.",
    reference: "https://www.unicode.org/charts/PDF/U0E00.pdf",
  },
  {
    label: "Amharic", text: "ሰላም ዓለም", writingSystem: "Ethiopic",
    context: "Amharic text in Ethiopic. The writing system is also used for other languages; character identity alone does not identify a language.",
    reference: "https://www.unicode.org/charts/PDF/U1200.pdf",
  },
  {
    label: "Traditional Chinese", text: "繁體中文，世界你好！", writingSystem: "Traditional Han characters",
    context: "Traditional Chinese characters, preserved without conversion to simplified forms.",
    reference: "https://www.unicode.org/charts/PDF/U4E00.pdf",
  },
  {
    label: "Supplementary Han", text: "𠀀𠀁𠀂", writingSystem: "Han — CJK Unified Ideographs Extension B",
    context: "Three supplementary-plane Han ideographs, each represented by four UTF-8 coordinate frames. These are demonstration characters, not a sentence; font availability varies.",
    reference: "https://www.unicode.org/charts/PDF/U20000.pdf",
  },
  {
    label: "Old Persian cuneiform", text: "𐎠𐎡𐎢", writingSystem: "Old Persian cuneiform",
    context: "The assigned vowel signs a, i and u, not a translated phrase. This is a distinct historical writing system, not interchangeable with Sumerian or Akkadian cuneiform.",
    reference: "https://www.unicode.org/charts/PDF/U103A0.pdf",
  },
  {
    label: "Runic", text: "ᚠᚢᚦᚨᚱᚲ", writingSystem: "Elder Futhark runes",
    context: "The first six Elder Futhark signs, an alphabetic sequence rather than a translated sentence. Other runic traditions have different inventories.",
    reference: "https://www.unicode.org/charts/PDF/U16A0.pdf",
  },
  {
    label: "Ogham", text: "ᚁᚂᚃᚄᚅ", writingSystem: "Ogham",
    context: "Five assigned Ogham letters, not a translated inscription. Historical orientation and inscription layout are not reconstructed by character encoding.",
    reference: "https://www.unicode.org/charts/PDF/U1680.pdf",
  },
  {
    label: "Linear B", text: "𐀀𐀁𐀂", writingSystem: "Linear B syllabary",
    context: "The syllabic signs a, e and i from the script used for Mycenaean Greek. This demonstration sequence is not a translated tablet.",
    reference: "https://www.unicode.org/charts/PDF/U10000.pdf",
  },
];
