# NexusOS research and evidence record

This is the current editorial interpretation of the project's research, not a
certificate of hardware performance or an independent scientific review.
It separates implementation, calculation, reported measurement and hypothesis.
Historical disclosures remain available and have not been silently rewritten.

## Explicit hardware correction

Earlier descriptions, including AI-assisted explanations, overstated the hardware
evidence. Reported electrical measurements on three bifilar coils are not evidence
of photonic computation, a complete SNIC/PHR-1 system, quantum memory, zero-loss
operation or gravity control. The present end-to-end reference architecture is a
draft for independent engineering review, not a validated complete hardware design.

The [hardware evidence and correction record](./HARDWARE_EVIDENCE.md) separates
reported measurements, software, design targets and missing physical evidence.
Hardware fundraising and promotion remain subject to the founder's engineering
hold; a documentation change does not prove the live deployment has applied it.

## Read the evidence by category

| Category | What it establishes | What it does not establish |
|---|---|---|
| Software implementation | A specified computation or application behaviour exists in code | That an optical device performs it, or that its physical interpretation is correct |
| Mathematical calculation | A result follows from stated equations and assumptions | That the assumptions describe nature, or that the relationship is a new discovery |
| Reported measurement | A particular device characteristic was reported under particular test conditions | Unmeasured characteristics or complete system performance |
| Research proposal | An idea, architecture or prediction is specified for investigation | Experimental confirmation |
| Independent validation | An identifiable independent assessment with methods and evidence | This must not be implied merely because code or a disclosure is public |

No current evidence linked below establishes an integrated, general-purpose
NexusOS photonic computer, force unification or gravitational control.
Passing software tests is not a physical experiment.

## What distinguishes the approach

WavelengthScript/WNSP is a spectral-coordinate software framework linking
supported character encodings with language operations, addressing and
communication models, with photonic integration as a research objective.
WavelengthScript is the programming-language component; WNSP is the associated
encoding, addressing and protocol research.

The design philosophy assigns supported human-readable characters to agreed
spectral coordinates. The contribution being investigated is the particular
combination of these rules, not the invention of colour alphabets, optical symbol
encoding, photonic programming or interoperability individually.

See [the sourced differentiation and related-work comparison](./WAVELENGTHSCRIPT_POSITIONING.md).
It distinguishes the actual character table from account derivation, name
fingerprints and proposed optical bins, and gateway-mediated interoperability
from native photonic execution or direct optical exchange. This is an initial
comparison, not an exhaustive prior-art search, a priority determination or
independent experimental validation.

## How the work developed

The available project records show these overlapping stages. This is a
reconstruction from saved documents and code, not a complete transcript of
every discussion or a verified priority timeline.

1. **Spectral representation:** map supported characters and information to
   wavelength-related values and spectral features.
2. **Language and execution:** develop WavelengthScript, bytecode execution and
   application integration on conventional computers.
3. **Addressing and communications:** define WNSP coordinate labels and URI
   conventions, with services running over existing network infrastructure.
4. **Energy bookkeeping:** use photon energy and its mass equivalent in a
   proposed compression-state description.
5. **Octave organisation:** investigate a Russell-inspired frequency-scaling
   framework around a selected reference.
6. **Hardware and quantum-optics proposals:** explore resonators, light–matter
   interfaces, memory, coherent states, squeezing and related architectures.

The project expands WNSP differently in some historical documents. This record
uses the acronym without claiming that every past name or mapping describes
the same version. See [mapping distinctions](#mapping-profiles).

## What is implemented in software

- A WavelengthScript compiler and interpreter:
  [`server/wnsp_vm.ts`](../server/wnsp_vm.ts).
- Spectral character encoding and numerical models:
  [`spectral_api.py`](../spectral_api.py).
- Software physics calculations and account channel derivation:
  [`server/physics.ts`](../server/physics.ts).
- Application and ledger-related services on conventional infrastructure.
  The public repository is inspectable; a deployment may require authentication
  and service configuration.

The supported language is the implemented instruction set, not a promise of
arbitrary-language equivalence. Spectral mappings have different compatibility
rules. In particular, the 128-entry character projection is not lossless
arbitrary-Unicode transport, and a name fingerprint is not a unique identifier
for every possible input.

Development and GitHub branches can differ. This documentation update does not
merge all development code or certify that every described behaviour is present
in every historical checkout. Inspect the implementation and available checks
at the revision being evaluated. This document does not claim a particular
revision passed tests merely because an implementation or test exists elsewhere.

### Mapping profiles

The development review distinguishes four mappings:

| Mapping | Definition and limitation |
|---|---|
| Account derivation | SHA-256-derived indices; wavelength endpoints 380 and 780 nm with 400/255 nm spacing. Projection into the small coordinate space can collide. |
| VM name fingerprint | Uppercased printable-ASCII average and separate coordinate rules. It is lossy and is not arbitrary-Unicode transport. |
| Character table | 128 wavelengths with 3.125 nm spacing. Modulo character projection can alias inputs. |
| Proposed optical bins | 256 bins with 1.5625 nm spacing. A proposed hardware channel plan, not interchangeable with issued account addresses. |

Do not substitute one mapping for another, reinterpret stored addresses or
infer physical channel compatibility from similar names. Branches may package
these definitions differently.

## What the equations establish

### Photon energy and the project's compression-state quantity

For a photon, `E = hf`. Expressing that energy as a mass equivalent gives:

```text
Λ = E/c² = hf/c²
```

This is a valid energy-to-mass-unit conversion. A photon still has zero rest
mass. The equation does not contain a volume, pressure or spatial energy
density, and does not by itself describe a physical compression process.
The term "compression state" is the project's interpretation.

### Octave organisation

```text
f_n = 2^n f_0
Λ_n = 2^n Λ_0
```

An octave doubles frequency. The project adopts a Russell-inspired octave
organisation and a reference `f_0 = 555 THz`. That reference corresponds to
approximately 540 nm; it is not an observed first cosmic oscillation.

Allowing arbitrary real `n` gives a logarithmic coordinate transformation.
Restricting physical states to selected `n`, predicting material stability or
claiming interactions are unified requires additional physics and evidence.
The octave index is not automatically a resonator's mode number or a quantum
oscillator's photon occupation number.

### Coordinate count

```text
256 wavelength indices × 50 OAM indices × 2 polarisations × 2 directions
= 51,200 nominal coordinate combinations
```

This counts software labels, not measured throughput or demonstrated optical
mode independence. Legacy three-coordinate addresses omit direction.
Addressable labels do not eliminate crosstalk, noise, contention, scheduling,
access control or the need for physical resources.

### Quantum-optics extensions

Coherent states, squeezing, cavity coupling and Bogoliubov transformations are
established subjects with specific assumptions. Their use in software models
does not show that NexusOS hardware has realised them. Squeezing redistributes
quadrature noise; driven photon generation requires supplied energy.

The project proposes additional compression-state interpretations. Evaluate
each separately against the evidence boundaries below.

### Act-by-Act evidence boundaries

The titles identify the research sequence, not independently validated
discoveries. Equations retain their usual assumptions; proposed integrations
need separate evidence.

| Act | Established basis or calculation | Proposed extension and evidence boundary |
|---|---|---|
| 1 — Compression States | Photon energy `hf` and energy-to-mass conversion `E/c²` | Compression-state interpretation; no new photon rest mass or gravity-control result follows. |
| 2 — Universal ONE | Octave frequency doubling; selected 555 THz reference | An initial universal oscillation is not observed. |
| 3 — Unified Compression Theory | Established interactions have independently tested descriptions | Organising their scales is not a derivation or unification of those interactions. |
| 4 — Mechanism | Energy differences between octave coordinates can be calculated | Those differences are not automatically atomic transition levels or a matter-transmutation mechanism. |
| 5 — Address | The configured dimensions multiply to 51,200 labels | Not a unique address for every physical state or measured optical capacity. |
| 6 — Catalogue | Atomic masses can be expressed as logarithmic coordinates | Numerical proximity to integers does not establish stability, synthesis or Russell's atomic theory. |
| 7 — Trap | Counterpropagating waves can form standing waves | Superposition is not a tensor product; an unoccupied numerical coordinate is not a demonstrated matter trap. |
| 8 — Lossless Channel | Attenuation and information capacity have established models | No cited project measurement establishes zero loss; vacuum energy is not a universal Shannon noise-power floor. |
| 9 — Cavity | Resonance and quality-factor models apply under specified conditions | Resonator mode index is not the mass-octave index; fabricated devices need measurements. |
| 10 — Exchange | Light–matter coupling models describe coherent exchange under assumptions | An ideal model is not a measured lossless interface or a source without supplied excitation. |
| 11 — Emitter | The Purcell model estimates cavity enhancement with alignment and resonance assumptions | An estimate is not a measured single-photon emitter. |
| 12 — Network | Coupled-resonator models describe dispersion | Zero ideal group velocity does not imply unlimited storage or a lossless network. |
| 13 — Observer | Dispersive and selected-observable readout have established descriptions | QND measurement does not preserve every property of an arbitrary unknown state. |
| 14 — Memory | Relaxation bounds and AFC/DLCZ protocols have established theoretical contexts | Targets and literature results are not project memory measurements; persistent labels are not persistent quantum states. |
| 15 — Void | Cosmic void observations and logarithmic calculations are distinct subjects | Selected scale matches do not establish a vacuum boundary or statistical significance. |
| 16 — Entangler | Bell states, inequalities and entanglement swapping are established | Software calculations are not a physical Bell-pair experiment; entanglement does not enable controllable faster-than-light messaging. |
| 17 — Field | Bosonic commutation and oscillator energies are established | A physical realisation of independent proposed modes must be demonstrated; vacuum energy is not an undriven supply. |
| 18 — Coherent State | Coherent states have well-defined amplitudes and ideal photon statistics | No universal sharp classical/quantum threshold at one photon follows. |
| 19 — Squeezed State | One quadrature's reduced noise accompanies conjugate uncertainty | Quadrature squeezing is not automatic photon-number noise reduction or evidence of project hardware performance. |
| 20 — Bogoliubov Transform | Appropriate transforms preserve their bosonic or fermionic relations | Compression-state and mass-displacement interpretations are hypotheses; physical generation requires an energy source. |

## What has been reported as measured

The [hardware prototype record](../client/src/pages/hardware-spec.tsx) reports
electrical inductance and DC-resistance tests on three Coiltek bifilar toroidal
coils. These are reported fabrication/electrical results, not a new independent
verification performed for this document.

Those tests do not establish optical squeezing, optical channel capacity,
quantum memory, zero loss, zero electromagnetic interference, gravitational
control, ZERO-G or mass displacement.

Before treating an integrated photonic implementation as demonstrated, publish
the device configuration, calibration, methods, raw data, uncertainty and
repeatability. Relevant measurements include optical spectrum and linewidth,
loss, crosstalk, mode separation, error rates, timing, conversion efficiency,
thermal behaviour and total energy consumption. Independent replication should
be identified explicitly when available.

## Corrections to earlier explanations

Some earlier project text, including AI-assisted explanations, used stronger
language than the evidence supports. The following is the current interpretation:

| Earlier implication | Correction |
|---|---|
| Maxwell or wavelength checks replace cryptographic security | Coordinate consistency does not authenticate a sender. The implementation uses cryptography, including SHA-256; authorisation, integrity and consensus remain separate requirements. |
| Combining Einstein and Planck proves a new mass or unified force law | `hf/c²` is a photon-energy mass equivalent, not proof of photon rest mass or force unification. |
| Russell's octave organisation is validated by frequency doubling | Doubling is a mathematical relation, not experimental validation of a cosmology or atomic theory. |
| 555 THz was the universe's first oscillation | It is a selected model reference; the proposed cosmic origin is unconfirmed. |
| Every possible physical state has a unique address in this finite namespace | A finite coordinate set cannot uniquely represent all possible physical states. |
| Configured channels guarantee lossless, interference-free hardware | Physical losses, crosstalk and independence must be measured. |
| Optical orthogonality makes permissions and scheduling unnecessary | A mode model is not an application security or resource-allocation mechanism. |
| Electrical coil tests validate the complete photonic or gravity architecture | They establish only the reported electrical characteristics. |
| A public disclosure proves discovery priority or experimental truth | Disclosure, novelty, legal rights and experimental validation are distinct matters. |

This record does not claim that every historical document, public page, social
post, external fork or cached copy has been corrected. Read older assertions
alongside these qualifications. An unresolved contradiction should be reported,
not treated as independent evidence for the stronger claim.

## Attribution and accountability

The founder supplies project direction, questions and decisions. AI assistance,
including Replit Agent, has contributed code, explanations, mathematical
formulations and research narrative. It has also contributed overstatements
that require correction.

Do not infer that the founder independently originated every AI-generated
formulation, or that the assistant is the exclusive author of the whole
project. Existing historical author labels are preserved; this disclosure
does not determine legal authorship, inventorship or ownership.

Attribute source physics to its original literature, describe engineering
inspiration as inspiration, and identify proposed extensions as proposals.
AI output and repository timestamps are not substitutes for verification.

## Historical disclosures and review practice

[`PRIOR_ART.md`](../PRIOR_ART.md) preserves the project's numbered disclosures
and stated dates. Publication is not a grant of a patent, a legal determination
of priority, independent peer review or proof that a device works. Licensing
claims also require assessment of the actual applicable terms and rights.

When updating a research claim:

1. State the established basis and the additional hypothesis separately.
2. Link the implementation, calculation or measured evidence.
3. Specify assumptions, units, limitations and a way the proposal could fail.
4. Identify supplied energy and compare performance with a relevant baseline.
5. Record positive, negative and inconclusive results without changing the
   acceptance criterion after observing the result.
6. Publish corrections as traceable changes. Do not silently rewrite original
   numbered disclosures; substantive amendments require founder approval.
7. Describe independent review only when it has actually occurred.

## Long-term direction

The programme aims to connect spectral software with experimentally validated
photonic hardware and, ultimately, integrated system operation with human-life
safeguards. Its century-scale vision towards 2126 is an ambition, not a
delivery guarantee or demonstrated civilisation-scale capability.

A proposed safeguard is not automatically enacted policy or globally
enforceable law. Governance protections require their own implementation,
review, enactment and applicable legal assessment.
