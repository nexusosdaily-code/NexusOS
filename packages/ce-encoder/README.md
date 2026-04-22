# @nexusosdaily-code/nexusos-ce-encoder

WNSP Character Encoding v1.0 — maps any text to the visible electromagnetic spectrum.

Hosted on GitHub Packages · AGPL-3.0 · part of [NexusOS](https://github.com/nexusosdaily-code/NexusOS)

## Install

```bash
# 1. Point your project at GitHub Packages for this scope
echo "@nexusosdaily-code:registry=https://npm.pkg.github.com" >> .npmrc

# 2. Install
npm install @nexusosdaily-code/nexusos-ce-encoder
```

## Usage

```javascript
const { ceEncode } = require('@nexusosdaily-code/nexusos-ce-encoder');

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
import { ceEncode, nmToRgb } from '@nexusosdaily-code/nexusos-ce-encoder';
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

- Algorithm: `CE_TABLE[charCode % 128]` → 380–780 nm (3.125 nm per band)
- Energy: `E = hf` where `f = c/λ`
- Channel: `Ψ(wdm, oam, pol)` — Hilbert-space address
- Bit-identical output between npm and Python packages for the same input

## License

AGPL-3.0 — free civilization infrastructure
