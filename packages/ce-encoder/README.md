# nexusos-ce-encoder

WNSP Character Encoding v1.0 — maps any text to the visible electromagnetic spectrum.

```
npm install nexusos-ce-encoder
```

## Usage

```javascript
const { ceEncode } = require('nexusos-ce-encoder');

const result = ceEncode("Hello world");
// {
//   wavelength: 588.04,      // dominant wavelength (nm)
//   band: "EVENT",           // spectral authority band
//   psiChannel: "Ψ(53,9,V)", // Hilbert-space channel address
//   energy: 3.38e-19         // photon energy E=hf (joules)
// }
```

## ES Module

```javascript
import { ceEncode, nmToRgb } from 'nexusos-ce-encoder';

const r = ceEncode("Hello world");
document.body.style.background = nmToRgb(r.wavelength);
```

## Physics

- Algorithm: `CE_TABLE[charCode % 128]` → 380–780 nm (3.125 nm per band)
- Energy: `E = hf` where `f = c/λ`
- Channel: `Ψ(wdm, oam, pol)` — Hilbert-space address from wavelength + ordinal sum
- Bit-identical output to the `nexusos-ce-encoder` pip package for the same input

## License

AGPL-3.0 — free civilization infrastructure
