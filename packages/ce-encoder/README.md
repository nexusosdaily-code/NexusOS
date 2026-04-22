# nexusos-ce-encoder

WNSP Character Encoding v1.0 — maps any text to the visible electromagnetic spectrum.

**Live on npm** · AGPL-3.0 · part of [NexusOS](https://github.com/nexusosdaily-code/NexusOS)

## Install

```bash
npm install nexusos-ce-encoder
```

## Usage

```javascript
const { ceEncode } = require('nexusos-ce-encoder');

const result = ceEncode("Hello world");
// {
//   wavelength: 588.04,         // dominant wavelength (nm)
//   band: "EVENT",              // spectral authority band
//   psiChannel: "Ψ(53,9,V)",   // Hilbert-space channel address
//   energy: 3.38e-19            // photon energy E=hf (joules)
// }
```

## ES Module

```javascript
import { ceEncode, nmToRgb } from 'nexusos-ce-encoder';
```

## Python

```bash
pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py
```

```python
from ce_encoder import ceEncode
result = ceEncode("Hello world")
```

## Physics

- Algorithm: `CE_TABLE[charCode % 128]` → 380–780 nm (3.125 nm per band, 128 bands)
- Energy: `E = hf` where `f = c/λ`
- Channel: `Ψ(wdm, oam, pol)` — Hilbert-space address in 25,600-channel orthogonal space
- 25,600 channels = 256 WDM × 50 OAM modes × 2 polarisations (H/V)
- Bit-identical output between npm and Python packages for the same input

## Why orthogonal channels matter

Each Ψ channel is physically orthogonal to every other: `⟨Ψᵢ|Ψⱼ⟩ = 0`

Two processes on different channels cannot interfere — not by software policy, by quantum mechanics.
Silicon runs this as a lookup today. Photonic hardware (~2032) executes it at the speed of light.

## License

AGPL-3.0 — free civilization infrastructure
