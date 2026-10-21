# WavelengthScript/WNSP: positioning and related work

## Longstanding project direction

WavelengthScript and the blockchain have always been the primary focus;
WavelengthScript is the vehicle for blockchain development, with WNSP encoding
and protocol work. Wider additions are century-long development for future
generations, not a replacement for that direction. Their credibility depends
on demonstrated results, not inclusion in a proposal. See
[project direction](./PROJECT_DIRECTION.md).

## Recommended description

> WavelengthScript is the core language technology driving NexusOS blockchain development,
> alongside WNSP spectral-coordinate encoding. The current focus is working software
> on conventional computers; wider developments belong to a century-long vision.

WavelengthScript is the programming-language component; WNSP is the associated
encoding, addressing and protocol research. NexusOS hosts these software tools
and application services on conventional computing infrastructure.

The design philosophy assigns supported human-readable characters to agreed
spectral coordinates and investigates how those coordinates can participate
in a common software framework. A coordinate is an assigned representation,
not a meaning inherent in an electromagnetic wave.

## The particular combination being investigated

```text
Human-readable characters
    → agreed encoding profile
    → spectral-coordinate labels
    → supported language operations, addressing and protocol rules
    → device-specific translation or execution, where implemented and tested
```

This is not simply a colour palette, an optical modulation scheme or a quantum
circuit language. It proposes a combination across those software concerns.
That distinction is a description of the approach, not proof that the
combination is historically unprecedented or technically superior.

## Concrete implementation example and limits

One existing character-table profile has 128 entries:

```text
λ(i) = 380 + 3.125 × i nm,  i = 0…127
A: ASCII 65 → 583.125 nm
B: ASCII 66 → 586.250 nm
```

The table spans 380 through 776.875 nm. A 380–780 nm design interval does
not mean its final indexed entry equals 780 nm.

The legacy modulo projection uses `character code % 128`. It can alias inputs:
`A` (65) and `Á` (193) project to the same entry. It is not lossless
arbitrary-Unicode transport. Retain the original payload and use an agreed
lossless transport when full text must be recoverable.

These numerical assignments do not show that a laser emitted those wavelengths,
that a detector decoded them, or that a device executed the associated operation.
Calculating frequency or photon energy from a wavelength does not establish a
new physical law or a physically compressed character.

The project also uses different account-derivation, VM-name-fingerprint and
proposed optical-bin profiles. They are not interchangeable. Name averaging is
lossy; finite spectral addresses can collide; labels are not authentication.
See [mapping profiles](./RESEARCH_STATUS.md#mapping-profiles) and inspect the
implementation in the revision being evaluated. Development and GitHub branches
may differ; this documentation does not merge or certify all development code.

## Sourced related-work comparison

| Earlier or related work | Overlap | Difference from this proposal |
|---|---|---|
| [Paul Green-Armytage, *A Colour Alphabet and the Limits of Colour Coding* (2010)](https://www.aic-color.org/resources/Documents/jaic_v5_06.pdf) | Letters are represented by colours so people can read encoded words and sentences. | Perceived colours are not necessarily single optical wavelengths. This is not a programming language, execution system or network protocol. |
| [NASA/JPL optical-communications literature: wavelength-shift keying, section 4.3.5](https://descanso.jpl.nasa.gov/monograph/series7/Descanso%207_chap04_new.pdf) | Information symbols can be carried by distinct optical wavelengths, with encoding and decoding. | Optical modulation does not by itself define human-readable programming semantics or an application-level addressing framework. |
| [Blackbird / Strawberry Fields, publicly described in 2018](https://arxiv.org/abs/1804.03159) | A language, compiler engine and simulation backends for photonic quantum computation. | Quantum-optical circuit descriptions differ from WNSP's proposed combination of character-coordinate mappings, addressing and communication models. |
| [Quandela Perceval Interoperability](https://perceval.quandela.net/interopdocs/) | Circuit translation between quantum frameworks and conversion of state representations. | Framework translation is not universal physical compatibility or a direct optical network protocol. Interoperability is already an active category of work. |
| [ITU-T G.694.1](https://www.itu.int/ITU-T/recommendations/rec.aspx?id=14498) | Shared optical frequency grids, slots and slot widths for wavelength-division multiplexing. | A telecommunications channel plan does not assign programming semantics to characters or specify an operating system. |

These works overlap with different parts of the proposal. None of these brief
comparisons establishes that a source implements the entire WavelengthScript/WNSP
framework. Equally, not finding an exact equivalent in this initial review does
not establish that none exists.

## What we do and do not claim

- We describe a specific software implementation and a proposed combination of
  encoding, language, addressing and communication rules.
- We do **not** substantiate being the first to associate letters with colour,
  encode information in wavelengths, program photonic computers or investigate
  interoperability.
- Historical priority, novelty and patentability require a separate, systematic
  review of dated publications, patents and implementations. This is not a legal
  priority opinion or an exhaustive prior-art search.
- Native photonic execution, direct optical exchange and cross-manufacturer
  interoperability have not been demonstrated by the software mappings.
- Spectral consistency does not replace cryptographic hashes, signatures,
  authorisation, integrity checking or consensus.
- Original numbered disclosures remain historical records. This contextual
  comparison does not silently rewrite them or certify their physical claims.

## What would substantiate interoperability

Independent implementations need to agree on mapping versions, supported
operations and semantics, message framing, precision, errors and security.
Tests should reproduce agreed encodings and program results, exchange messages
in both directions, document failures and publish repeatable methods and
measurements.

Report these achievements separately:

1. **Software or gateway-mediated interoperability:** compatible adapters exchange
   correctly interpreted data through existing infrastructure.
2. **Native photonic execution:** a supported physical device executes defined
   operations, with measured correctness and limits.
3. **Direct optical interoperability:** compatible sources, modulation, timing,
   modes and detectors exchange optical signals between tested devices.

Success at one level does not establish the others or compatibility with every
photonic architecture. Existing photonic systems already communicate through
established interfaces; WNSP is not claiming the first ability to do so.

For physics, hardware, AI attribution and the 20 research Acts, see the
[research and evidence record](./RESEARCH_STATUS.md).
