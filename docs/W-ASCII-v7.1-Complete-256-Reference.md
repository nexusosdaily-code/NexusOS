# W-ASCII v7.1 Complete Character Reference

**Full 256-Character Spectral Encoding Table**

> For Scientists, Engineers & Researchers

---

## Overview

This is the complete W-ASCII v7.1 character set — all 256 codes (0x00-0xFF) with their spectral parameters.

| Parameter | Description |
|-----------|-------------|
| **hex** | Hexadecimal code (0x00-0xFF) |
| **char** | Character symbol |
| **F** | Frequency index |
| **A** | Amplitude level (0-3) |
| **lambda** | Wavelength state (0-3) |

---

## Control Characters (0x00-0x1F)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 00 | NUL | 0 | 0 | 0 | Null spectral state |
| 01 | SOH | 1 | 0 | 1 | Start-of-header (λ-sync) |
| 02 | STX | 2 | 0 | 1 | Start-of-text |
| 03 | ETX | 3 | 0 | 1 | End-of-text |
| 04 | EOT | 4 | 0 | 1 | End-of-transmission |
| 05 | ENQ | 5 | 0 | 2 | Lambda query |
| 06 | ACK | 6 | 0 | 2 | Lambda acknowledgement |
| 07 | BEL | 7 | 1 | 0 | Spectral alert |
| 08 | BS | 8 | 1 | 1 | Backspace |
| 09 | TAB | 9 | 1 | 1 | Horizontal tab |
| 0A | LF | 10 | 1 | 1 | Line feed |
| 0B | VT | 11 | 1 | 1 | Vertical tab |
| 0C | FF | 12 | 1 | 2 | Form feed |
| 0D | CR | 13 | 1 | 2 | Carriage return |
| 0E | SO | 14 | 1 | 2 | Shift-out |
| 0F | SI | 15 | 1 | 2 | Shift-in |
| 10 | DLE | 16 | 2 | 1 | Data link escape |
| 11 | DC1 | 17 | 2 | 1 | Device control 1 |
| 12 | DC2 | 18 | 2 | 1 | Device control 2 |
| 13 | DC3 | 19 | 2 | 1 | Device control 3 |
| 14 | DC4 | 20 | 2 | 1 | Device control 4 |
| 15 | NAK | 21 | 2 | 2 | Negative ack |
| 16 | SYN | 22 | 2 | 2 | Lambda synchronization pulse |
| 17 | ETB | 23 | 2 | 2 | End of block |
| 18 | CAN | 24 | 2 | 3 | Cancel |
| 19 | EM | 25 | 2 | 3 | End of medium |
| 1A | SUB | 26 | 2 | 3 | Substitute |
| 1B | ESC | 27 | 2 | 3 | Escape sequence start |
| 1C | FS | 28 | 3 | 1 | File separator |
| 1D | GS | 29 | 3 | 1 | Group separator |
| 1E | RS | 30 | 3 | 1 | Record separator |
| 1F | US | 31 | 3 | 1 | Unit separator |

---

## Punctuation & Symbols (0x20-0x2F)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 20 | (space) | 32 | 0 | 0 | Space |
| 21 | ! | 33 | 0 | 1 | Exclamation mark |
| 22 | " | 34 | 0 | 1 | Double quote |
| 23 | # | 35 | 1 | 1 | Hash |
| 24 | $ | 36 | 1 | 1 | Dollar |
| 25 | % | 37 | 1 | 1 | Percent |
| 26 | & | 38 | 1 | 2 | Ampersand |
| 27 | ' | 39 | 1 | 2 | Quote |
| 28 | ( | 40 | 1 | 3 | Left parenthesis |
| 29 | ) | 41 | 1 | 3 | Right parenthesis |
| 2A | * | 42 | 2 | 0 | Asterisk |
| 2B | + | 43 | 2 | 0 | Plus |
| 2C | , | 44 | 2 | 1 | Comma |
| 2D | - | 45 | 2 | 1 | Hyphen |
| 2E | . | 46 | 2 | 2 | Period |
| 2F | / | 47 | 2 | 2 | Slash |

---

## Digits (0x30-0x39)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 30 | 0 | 48 | 2 | 3 | Digit 0 |
| 31 | 1 | 49 | 2 | 3 | Digit 1 |
| 32 | 2 | 50 | 2 | 3 | Digit 2 |
| 33 | 3 | 51 | 2 | 3 | Digit 3 |
| 34 | 4 | 52 | 2 | 3 | Digit 4 |
| 35 | 5 | 53 | 2 | 3 | Digit 5 |
| 36 | 6 | 54 | 2 | 3 | Digit 6 |
| 37 | 7 | 55 | 2 | 3 | Digit 7 |
| 38 | 8 | 56 | 2 | 3 | Digit 8 |
| 39 | 9 | 57 | 2 | 3 | Digit 9 |

---

## Special Symbols (0x3A-0x40)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 3A | : | 58 | 3 | 0 | Colon |
| 3B | ; | 59 | 3 | 0 | Semicolon |
| 3C | < | 60 | 3 | 0 | Less-than |
| 3D | = | 61 | 3 | 0 | Equals |
| 3E | > | 62 | 3 | 0 | Greater-than |
| 3F | ? | 63 | 3 | 1 | Question mark |
| 40 | @ | 64 | 3 | 1 | At symbol |

---

## Uppercase Alphabet (0x41-0x5A)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 41 | A | 65 | 3 | 0 | Uppercase A |
| 42 | B | 66 | 3 | 0 | Uppercase B |
| 43 | C | 67 | 3 | 0 | Uppercase C |
| 44 | D | 68 | 3 | 0 | Uppercase D |
| 45 | E | 69 | 3 | 0 | Uppercase E |
| 46 | F | 70 | 3 | 0 | Uppercase F |
| 47 | G | 71 | 3 | 0 | Uppercase G |
| 48 | H | 72 | 3 | 0 | Uppercase H |
| 49 | I | 73 | 3 | 0 | Uppercase I |
| 4A | J | 74 | 3 | 0 | Uppercase J |
| 4B | K | 75 | 3 | 0 | Uppercase K |
| 4C | L | 76 | 3 | 0 | Uppercase L |
| 4D | M | 77 | 3 | 0 | Uppercase M |
| 4E | N | 78 | 3 | 0 | Uppercase N |
| 4F | O | 79 | 3 | 0 | Uppercase O |
| 50 | P | 80 | 3 | 0 | Uppercase P |
| 51 | Q | 81 | 3 | 0 | Uppercase Q |
| 52 | R | 82 | 3 | 0 | Uppercase R |
| 53 | S | 83 | 3 | 0 | Uppercase S |
| 54 | T | 84 | 3 | 0 | Uppercase T |
| 55 | U | 85 | 3 | 0 | Uppercase U |
| 56 | V | 86 | 3 | 0 | Uppercase V |
| 57 | W | 87 | 3 | 0 | Uppercase W |
| 58 | X | 88 | 3 | 0 | Uppercase X |
| 59 | Y | 89 | 3 | 0 | Uppercase Y |
| 5A | Z | 90 | 3 | 0 | Uppercase Z |

---

## Brackets & Symbols (0x5B-0x60)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 5B | [ | 91 | 3 | 1 | Left bracket |
| 5C | \ | 92 | 3 | 1 | Backslash |
| 5D | ] | 93 | 3 | 1 | Right bracket |
| 5E | ^ | 94 | 3 | 1 | Caret |
| 5F | _ | 95 | 3 | 1 | Underscore |
| 60 | ` | 96 | 3 | 1 | Grave accent |

---

## Lowercase Alphabet (0x61-0x7A)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 61 | a | 97 | 3 | 1 | Lowercase a |
| 62 | b | 98 | 3 | 1 | Lowercase b |
| 63 | c | 99 | 3 | 1 | Lowercase c |
| 64 | d | 100 | 3 | 1 | Lowercase d |
| 65 | e | 101 | 3 | 1 | Lowercase e |
| 66 | f | 102 | 3 | 1 | Lowercase f |
| 67 | g | 103 | 3 | 1 | Lowercase g |
| 68 | h | 104 | 3 | 1 | Lowercase h |
| 69 | i | 105 | 3 | 1 | Lowercase i |
| 6A | j | 106 | 3 | 1 | Lowercase j |
| 6B | k | 107 | 3 | 1 | Lowercase k |
| 6C | l | 108 | 3 | 1 | Lowercase l |
| 6D | m | 109 | 3 | 1 | Lowercase m |
| 6E | n | 110 | 3 | 1 | Lowercase n |
| 6F | o | 111 | 3 | 1 | Lowercase o |
| 70 | p | 112 | 3 | 1 | Lowercase p |
| 71 | q | 113 | 3 | 1 | Lowercase q |
| 72 | r | 114 | 3 | 1 | Lowercase r |
| 73 | s | 115 | 3 | 1 | Lowercase s |
| 74 | t | 116 | 3 | 1 | Lowercase t |
| 75 | u | 117 | 3 | 1 | Lowercase u |
| 76 | v | 118 | 3 | 1 | Lowercase v |
| 77 | w | 119 | 3 | 1 | Lowercase w |
| 78 | x | 120 | 3 | 1 | Lowercase x |
| 79 | y | 121 | 3 | 1 | Lowercase y |
| 7A | z | 122 | 3 | 1 | Lowercase z |

---

## Braces & Delete (0x7B-0x7F)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 7B | { | 123 | 3 | 2 | Left brace |
| 7C | \| | 124 | 3 | 2 | Pipe |
| 7D | } | 125 | 3 | 2 | Right brace |
| 7E | ~ | 126 | 3 | 2 | Tilde |
| 7F | DEL | 127 | 3 | 2 | Delete |

---

## Lambda Extension Set (0x80-0x8F)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 80 | Λ0 | 128 | 0 | 0 | Lambda-null |
| 81 | Λ1 | 129 | 0 | 1 | Lambda data |
| 82 | Λ2 | 130 | 0 | 2 | Lambda state |
| 83 | Λ3 | 131 | 0 | 3 | Lambda symbol |
| 84 | Ω0 | 132 | 1 | 0 | Omega base-state |
| 85 | Ω1 | 133 | 1 | 1 | Omega state |
| 86 | Φ0 | 134 | 1 | 2 | Phase key |
| 87 | Φ1 | 135 | 1 | 3 | Phase alternate |
| 88 | Ψ0 | 136 | 2 | 0 | Psi key |
| 89 | Ψ1 | 137 | 2 | 1 | Psi state |
| 8A | Ψ2 | 138 | 2 | 2 | Psi information |
| 8B | Ψ3 | 139 | 2 | 3 | Psi high-state |
| 8C | Λ4 | 140 | 0 | 0 | Lambda extended |
| 8D | Λ5 | 141 | 0 | 1 | Lambda extended |
| 8E | Λ6 | 142 | 0 | 2 | Lambda extended |
| 8F | Λ7 | 143 | 0 | 3 | Lambda extended |

---

## Omega Extension Set (0x90-0x9F)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| 90 | Ω2 | 144 | 1 | 0 | Omega extended |
| 91 | Ω3 | 145 | 1 | 1 | Omega extended |
| 92 | Ω4 | 146 | 1 | 2 | Omega extended |
| 93 | Ω5 | 147 | 1 | 3 | Omega extended |
| 94 | Φ2 | 148 | 1 | 0 | Phase extended |
| 95 | Φ3 | 149 | 1 | 1 | Phase extended |
| 96 | Φ4 | 150 | 1 | 2 | Phase extended |
| 97 | Φ5 | 151 | 1 | 3 | Phase extended |
| 98 | Ψ4 | 152 | 2 | 0 | Psi extended |
| 99 | Ψ5 | 153 | 2 | 1 | Psi extended |
| 9A | Ψ6 | 154 | 2 | 2 | Psi extended |
| 9B | Ψ7 | 155 | 2 | 3 | Psi extended |
| 9C | Λ8 | 156 | 0 | 0 | Lambda extended |
| 9D | Λ9 | 157 | 0 | 1 | Lambda extended |
| 9E | ΛA | 158 | 0 | 2 | Lambda extended |
| 9F | ΛB | 159 | 0 | 3 | Lambda extended |

---

## Extended Spectral Set (0xA0-0xBF)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| A0 | Ω6 | 160 | 1 | 0 | Omega extended |
| A1 | Ω7 | 161 | 1 | 1 | Omega extended |
| A2 | Ω8 | 162 | 1 | 2 | Omega extended |
| A3 | Ω9 | 163 | 1 | 3 | Omega extended |
| A4 | Φ6 | 164 | 1 | 0 | Phase extended |
| A5 | Φ7 | 165 | 1 | 1 | Phase extended |
| A6 | Φ8 | 166 | 1 | 2 | Phase extended |
| A7 | Φ9 | 167 | 1 | 3 | Phase extended |
| A8 | Ψ8 | 168 | 2 | 0 | Psi extended |
| A9 | Ψ9 | 169 | 2 | 1 | Psi extended |
| AA | ΨA | 170 | 2 | 2 | Psi extended |
| AB | ΨB | 171 | 2 | 3 | Psi extended |
| AC | ΛC | 172 | 0 | 0 | Lambda extended |
| AD | ΛD | 173 | 0 | 1 | Lambda extended |
| AE | ΛE | 174 | 0 | 2 | Lambda extended |
| AF | ΛF | 175 | 0 | 3 | Lambda extended |
| B0 | ΩA | 176 | 1 | 0 | Omega extended |
| B1 | ΩB | 177 | 1 | 1 | Omega extended |
| B2 | ΩC | 178 | 1 | 2 | Omega extended |
| B3 | ΩD | 179 | 1 | 3 | Omega extended |
| B4 | ΦA | 180 | 1 | 0 | Phase extended |
| B5 | ΦB | 181 | 1 | 1 | Phase extended |
| B6 | ΦC | 182 | 1 | 2 | Phase extended |
| B7 | ΦD | 183 | 1 | 3 | Phase extended |
| B8 | ΨC | 184 | 2 | 0 | Psi extended |
| B9 | ΨD | 185 | 2 | 1 | Psi extended |
| BA | ΨE | 186 | 2 | 2 | Psi extended |
| BB | ΨF | 187 | 2 | 3 | Psi extended |
| BC | ΛG | 188 | 0 | 0 | Lambda extended |
| BD | ΛH | 189 | 0 | 1 | Lambda extended |
| BE | ΛI | 190 | 0 | 2 | Lambda extended |
| BF | ΛJ | 191 | 0 | 3 | Lambda extended |

---

## Extended Spectral Set (0xC0-0xDF)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| C0 | ΩE | 192 | 1 | 0 | Omega extended |
| C1 | ΩF | 193 | 1 | 1 | Omega extended |
| C2 | ΩG | 194 | 1 | 2 | Omega extended |
| C3 | ΩH | 195 | 1 | 3 | Omega extended |
| C4 | ΦE | 196 | 1 | 0 | Phase extended |
| C5 | ΦF | 197 | 1 | 1 | Phase extended |
| C6 | ΦG | 198 | 1 | 2 | Phase extended |
| C7 | ΦH | 199 | 1 | 3 | Phase extended |
| C8 | ΨG | 200 | 2 | 0 | Psi extended |
| C9 | ΨH | 201 | 2 | 1 | Psi extended |
| CA | ΨI | 202 | 2 | 2 | Psi extended |
| CB | ΨJ | 203 | 2 | 3 | Psi extended |
| CC | ΛK | 204 | 0 | 0 | Lambda extended |
| CD | ΛL | 205 | 0 | 1 | Lambda extended |
| CE | ΛM | 206 | 0 | 2 | Lambda extended |
| CF | ΛN | 207 | 0 | 3 | Lambda extended |
| D0 | ΩI | 208 | 1 | 0 | Omega extended |
| D1 | ΩJ | 209 | 1 | 1 | Omega extended |
| D2 | ΩK | 210 | 1 | 2 | Omega extended |
| D3 | ΩL | 211 | 1 | 3 | Omega extended |
| D4 | ΦI | 212 | 1 | 0 | Phase extended |
| D5 | ΦJ | 213 | 1 | 1 | Phase extended |
| D6 | ΦK | 214 | 1 | 2 | Phase extended |
| D7 | ΦL | 215 | 1 | 3 | Phase extended |
| D8 | ΨK | 216 | 2 | 0 | Psi extended |
| D9 | ΨL | 217 | 2 | 1 | Psi extended |
| DA | ΨM | 218 | 2 | 2 | Psi extended |
| DB | ΨN | 219 | 2 | 3 | Psi extended |
| DC | ΛO | 220 | 0 | 0 | Lambda extended |
| DD | ΛP | 221 | 0 | 1 | Lambda extended |
| DE | ΛQ | 222 | 0 | 2 | Lambda extended |
| DF | ΛR | 223 | 0 | 3 | Lambda extended |

---

## Extended Spectral Set (0xE0-0xFF)

| Hex | Char | F | A | λ | Description |
|-----|------|---|---|---|-------------|
| E0 | ΩM | 224 | 1 | 0 | Omega extended |
| E1 | ΩN | 225 | 1 | 1 | Omega extended |
| E2 | ΩO | 226 | 1 | 2 | Omega extended |
| E3 | ΩP | 227 | 1 | 3 | Omega extended |
| E4 | ΦM | 228 | 1 | 0 | Phase extended |
| E5 | ΦN | 229 | 1 | 1 | Phase extended |
| E6 | ΦO | 230 | 1 | 2 | Phase extended |
| E7 | ΦP | 231 | 1 | 3 | Phase extended |
| E8 | ΨO | 232 | 2 | 0 | Psi extended |
| E9 | ΨP | 233 | 2 | 1 | Psi extended |
| EA | ΨQ | 234 | 2 | 2 | Psi extended |
| EB | ΨR | 235 | 2 | 3 | Psi extended |
| EC | ΛS | 236 | 0 | 0 | Lambda extended |
| ED | ΛT | 237 | 0 | 1 | Lambda extended |
| EE | ΛU | 238 | 0 | 2 | Lambda extended |
| EF | ΛV | 239 | 0 | 3 | Lambda extended |
| F0 | ΩQ | 240 | 1 | 0 | Omega extended |
| F1 | ΩR | 241 | 1 | 1 | Omega extended |
| F2 | ΩS | 242 | 1 | 2 | Omega extended |
| F3 | ΩT | 243 | 1 | 3 | Omega extended |
| F4 | ΦQ | 244 | 1 | 0 | Phase extended |
| F5 | ΦR | 245 | 1 | 1 | Phase extended |
| F6 | ΦS | 246 | 1 | 2 | Phase extended |
| F7 | ΦT | 247 | 1 | 3 | Phase extended |
| F8 | ΨS | 248 | 2 | 0 | Psi extended |
| F9 | ΨT | 249 | 2 | 1 | Psi extended |
| FA | ΨU | 250 | 2 | 2 | Psi extended |
| FB | ΨV | 251 | 2 | 3 | Psi extended |
| FC | ΛW | 252 | 0 | 0 | Lambda extended |
| FD | ΛX | 253 | 0 | 1 | Lambda extended |
| FE | ΛY | 254 | 0 | 2 | Lambda extended |
| FF | ΛZ | 255 | 0 | 3 | Lambda extended (terminus) |

---

## Symbol Categories

### Core Greek Symbols (0x80-0x8B)
- **Λ (Lambda)** — Mass-equivalent oscillation states
- **Ω (Omega)** — Angular frequency markers
- **Φ (Phi)** — Phase synchronization keys
- **Ψ (Psi)** — Quantum information channels

### Extended Spectral Set (0x8C-0xFF)
128 additional symbols for:
- Multi-dimensional encoding
- Quantum state representation
- Cross-band coordination
- Advanced cryptographic primitives

---

## Physics Foundation

Every character carries inherent mass-equivalent through Lambda Boson:

```
Λ = hf/c²
```

Where:
- **h** = Planck constant (6.626 × 10⁻³⁴ J·s)
- **f** = Frequency (derived from character's spectral position)
- **c** = Speed of light (2.998 × 10⁸ m/s)

---

## License

GPLv3 — Community-Owned, NexusOS Multisig Maintained
