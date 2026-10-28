# WNSP software and hardware conformance

## What runs now

NexusOS is a hosted software application with a WavelengthScript compiler,
bytecode interpreter, application services and ledger models. Running the VM on
a conventional server is not native execution on a photonic chip or a bare-metal
hardware operating system.

The executable model and evidence summaries are shared between browser and
server. The original numbered research disclosures remain separate from the
current interpretation; a disclosure is not an experimental result.

## Address compatibility

Four mappings coexist intentionally:

| Profile | Definition | Compatibility rule |
|---|---|---|
| `account-sha256-endpoints-v1` | SHA-256-derived indices; 256 wavelengths including 380 and 780 nm; spacing 400/255 nm | Preserve issued account addresses and reserved service coordinates |
| `vm-printable-ascii-average-v1` | Uppercased printable ASCII mean; 4 nm bins, one-based WDM; OAM sum modulo 50 | Browser examples and canonical server VM agree; non-ASCII-only input uses the existing server fallback |
| `ce128-character-table-v1` | 128 character wavelengths, 380 + index × 3.125 nm | Character projection is lossy for non-ASCII; retain original payload |
| `proposed-uniform-wdm256-v1` | 256 optical bins, 1.5625 nm apart | A proposed optical channel plan, not a substitute for legacy account mapping |

Account authority has four software tiers. The CE table has seven spectral
labels; the VM retains its 495 nm AUTH boundary and LOGIC/INTERFACE aliases.
These classifications are not interchangeable permission grants.

51,200 is the product of configured dimensions, not measured optical throughput.
Three-coordinate legacy URIs omit direction. Shared names may collide; no
encoder here uniquely or reversibly represents arbitrary physical/Unicode states.
Existing balances, issued addresses and historical ledger data are not migrated.

## Execution and integrity

The VM's commit point is HALT. A cycle-capped run returns diagnostic output but
no state delta or actionable side effects, so callers cannot persist partial
execution as a successful run. Actual transfer authorisation, balances and
transaction handling remain server-side.

The browser ledger is a software demonstration. Its wavelength-tolerance check
is not a hardware certificate; its rolling fingerprints are not cryptographic
authentication. Physics coordinate checks cannot replace signatures, hash
integrity, sender authorisation or network consensus.

## Hardware evidence and remaining acceptance work

The published Coiltek record reports electrical inductance/DC-resistance
measurements for three bifilar coils. It does not establish optical modes,
quantum memory, zero EMI, zero loss, ZERO-G or mass displacement.

Before describing integrated photonic operation as working, require:

1. A selected versioned optical channel plan, measured source spectrum and linewidth.
2. Foundry-specific loss and transparency across the intended visible range;
   a cited 500–2500 nm material window does not cover 380–500 nm.
3. A specified electrical-to-optical transducer, thermal actuator and measured
   tuning stability. ±0.5 nm is a proposed target, not an electrical coil result.
4. Measured insertion loss, crosstalk, polarisation, OAM modes, direction
   separation, link budget and end-to-end software/hardware instruction mapping.
5. Measured memory efficiency, lifetime, fidelity and repeater performance.
6. Independent experimental tests of any gravity or mass-displacement claims.

Quantum oscillator vacuum energy is not an undriven power supply or a universal
Shannon noise power. Squeezing redistributes quadrature uncertainty; driven
photon generation requires external energy. Historical speculative deductions
must be read with the Act's current evidence interpretation.

Telegram hardware drafts remain drafts: these corrections do not approve them
for sending or change the broadcast schedule.
