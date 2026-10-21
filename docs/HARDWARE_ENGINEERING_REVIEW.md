# Hardware engineering hold and reference-system requirements

**Status: engineering review required; fundraising and promotional dispatch on hold.**
This is an internal engineering handoff and public evidence boundary, not a signed
engineering approval, working photonic machine, supplier quote or procurement release.
No outside engineer was appointed or consulted merely by producing this document.
See the [explicit hardware correction and evidence register](./HARDWARE_EVIDENCE.md).

## 1. Decision and scope

The founder directed that Telegram promotions stop until the project has real,
grounded specifications for a complete system. The fundraising campaign is
pre-contribution according to the founder; do not invent donor or refund obligations.
No hardware should be ordered against historical concept diagrams alone.

The current deliverable is hosted software running on conventional electronic
computers. The first candidate end-to-end system comprises two conventional hosts,
the compiler/runtime, versioned protocol data, transport, storage, security,
observability and a reproducible test setup. Native photonic execution is a
separate, unvalidated research objective.

The hold covers the recurring campaign, event-driven promotions, manual campaign
fires, scheduled-post dispatch, Telegram/Nostr automatic cross-posting, automatic
video promotion to social platforms, legacy one-shot announcement scripts and
hardware contribution/new Zap Goal mutations.

Private support, ordinary bot help, security alerts, existing balances, historical
receipts, existing research records and ordinary wallet operations are not removed.
Queued posts are retained rather than deleted or marked sent. A future release
must not silently replay stale, unreviewed scheduled posts.

## 2. Audit: supported versus unverified

| Item | Evidence available | Allowed description | Missing evidence / consequence |
|---|---|---|---|
| WavelengthScript compiler, WNSP VM, CE/SE software | Source code and automated software tests | Hosted experimental language/runtime and logical spectral-coordinate model | Independent implementation, conformance vectors and measured workloads; no native optical CPU claim |
| 51,200 combinations | Product of configured logical dimensions | Nominal address labels | Measured mode isolation, crosstalk, multiplexing and resource limits; not a physical capacity specification |
| Three Coiltek bifilar coils | Reported inductance and DC resistance measurements | Electrically tested coil prototypes under their reported conditions | No demonstrated optical computing, squeezing, quantum memory, gravity effect or validated coil-to-optical mechanism |
| SNIC / PHR-1 / relay concepts | Design proposals and historical numerical targets | Unvalidated architectural concepts | Signed interface specification, manufacturable geometry, device models, complete BOM, driver/control design and measurements |
| `E = hf`, `E/c²`, frequency doubling | Established relations within their assumptions | Calculations used in software models | No derivation of new photon rest mass, energy creation, gravity control or a working processor |
| Quantum extensions | Mathematical models of established quantum-optics concepts plus proposed interpretations | Research models | State preparation, calibration, coherence/noise measurements and independent verification |
| Spectral labels and transaction checks | Application conventions and implemented software checks | Logical protocol/application behaviour | Not a substitute for authentication, cryptographic integrity, replay protection or adversarial security testing |
| Dates, budgets and throughput claims | Planning targets unless separately measured/quoted | Explicitly provisional estimates, with provenance | No delivery or performance guarantee without a traceable evidence record |

Historical numbered disclosures are not silently rewritten. Archived hardware
concepts remain accessible under an explicit non-approved label; the grounded
requirements take precedence for new engineering and fundraising decisions.
AI-generated explanations and agreement between assistants are not independent
scientific or engineering review.

## 3. Candidate complete baseline

### A. Host and deployment

- Two separate vendor-supported Linux computers, configured independently.
- Node.js compatible with the checked-in project/toolchain requirements;
  PostgreSQL; the Python spectral service where the selected operations need it.
- Current browser UI, API, compiler and VM remain hosted application components.
  Do not call this a demonstrated bare-metal kernel or native photonic OS.
- Record exact OS/runtime/dependency versions, workload, CPU, RAM and storage use.
  Choose final host sizing from those measurements, not an invented minimum.
- Document configuration, least privilege, secrets handling, health monitoring,
  backup/restore, restart behaviour and external-service dependencies.

### B. Data and runtime contracts

- Version and specify the supported character set, encoding tables, numerical
  units, input limits, deterministic error behaviour and round-trip test vectors.
- Unsupported input must be rejected explicitly, not silently transliterated.
- Specify framing, payload size, sequence identifiers, integrity checks, retries,
  timeouts and duplicate/replay handling before building a physical adapter.
- Mark proposed adapter contracts as unimplemented until independently tested.
- An independent endpoint must implement the documented rules without copying
  hidden state or depending on one running process.
- Logical wavelength/OAM/polarisation coordinates are not measured physical
  carriers. A conventional fibre module's laser wavelength need not equal a
  software label in the current visible-spectrum namespace.

### C. Transport and optical option

Start with conventional Ethernet/IP to establish software interoperability.
An optional fibre version can use a matched, vendor-qualified 1000BASE-LX SFP pair,
compatible NICs/switches and suitable single-mode fibre with matched connectors.
This is a component-class proposal, not an approved shopping list.

Before selecting parts, the engineer must verify the exact standard/module
compatibility, supported fibre and connector types, launch power, receiver
sensitivity/overload, attenuation, insertion loss, margin, electrical supply,
host driver support, environmental limits and optical safety.
No powered invisible optical connector should be inspected directly.

The conventional fibre experiment shows transport of ordinary digital data over
an optical link. It does **not** show physical character-to-wavelength switching,
OAM execution, photonic computation or an advantage over existing protocols.
A direct physical-mode adapter requires a separate approved design and experiment.

### D. Measurement and operations

The complete test setup includes two hosts, the selected transport, versioned
software, logging, a declared workload and calibrated optical equipment when
optical quantities are claimed. Measure both directions separately.

Store raw logs, configuration, calibration records, test scripts, error cases
and analysis. Measure end-to-end payload integrity, supported-input conformance,
packet loss, latency distribution, sustained goodput, host resource use,
recovery and electrical input power. Report units, load, duration and uncertainty.
Do not describe estimated energy per logical operation as measured wall-plug use.

## 4. Acceptance plan — proposed, not passed

The reviewer must approve numerical criteria **before** tests begin. Initial
candidate criteria below are engineering test targets, not measured performance.

| Test | Candidate acceptance criterion | Required record |
|---|---|---|
| Clean deployment | Both independently configured hosts reproduce documented supported operations | Install logs, exact versions and dependency/configuration manifests |
| Encoding conformance | Every declared supported test vector produces the specified output; invalid/oversize input is explicitly rejected | Versioned positive/negative vectors and independent implementation results |
| Baseline link | Both directions complete at least 10,000 framed test exchanges under a declared load with zero undetected payload mismatches | Workload, seed, frame sizes, transmitted/received bytes, drops, retries and integrity results |
| Optical integrity | Vendor link budget and receiver limits satisfied with reviewer-approved margin | Part numbers, datasheets, fibre loss calculation, calibrated measurements and uncertainty |
| Failure recovery | Link interruption, restart, duplicate/malformed frames and failed dependencies do not silently corrupt state | Fault-injection procedure and application/database reconciliation results |
| Security | Independent reviewer accepts scoped auth, integrity, privacy and replay controls, with material findings resolved or explicitly blocked | Threat model, test evidence and findings register |
| Resource/performance | Report latency distribution, goodput, RAM/CPU and measured electrical input power without extrapolation | Raw time series and conditions; no unsupported throughput or efficiency promise |

Zero mismatches in 10,000 exchanges is a finite test result, not proof of a zero
bit-error rate. Record sample size and do not infer an unlimited channel capacity.
Passing a conventional optical link does not release claims about native photonic
execution, quantum effects or the full proposed mode space.

## 5. Procurement handoff — unresolved until independently reviewed

| BOM group | Quantity/scope | Approval still needed |
|---|---|---|
| Conventional hosts | 2 independently configured endpoints | Exact vendor/model, workload sizing, NIC/driver compatibility and written quote |
| Initial link | One bidirectional conventional network connection | Cable, ports, topology and baseline performance measurements |
| Optional optical link | Matched transceiver pair, compatible interfaces and fibre | Manufacturer part numbers, vendor compatibility, standard, link budget, connector/safety check and quote |
| Measurement equipment | Equipment appropriate to each claimed quantity | Range, resolution, calibration status, rental/lab access and operator competence |
| Software/operations | Deployment, storage, backups, monitoring and test harness | Versioned install plan, access control, recovery procedure and operating costs |
| Independent review | Qualified photonics engineer plus scoped software/security review | Named reviewers, conflict disclosures, written scope, deliverables and quotations |

No prices, availability, certifications, custom-foundry capability or independent
approvals are invented here. Procurement remains blocked until the experiment,
risk allowance and quoted total budget have been explicitly approved.

## 6. Release procedure

1. Obtain a signed end-to-end engineering review and versioned interface/component
   specification, including a reasoned rejection of unsupported requirements.
2. Obtain verified BOM compatibility, supplier quotes, safety assessment and a
   costed experiment with a spending ceiling and stop/go criteria.
3. Conduct the approved experiment and retain raw evidence, independent endpoint
   results, failures, uncertainty and reproducible procedures.
4. Rewrite funding terms and each promotion against that evidence. Separate
   present capability, the funded milestone and long-term research aspirations.
5. Obtain explicit founder authorisation. A completed document, environment flag,
   elapsed date, admin start request or software test pass is not authorisation.
6. Record the approved release time and review every queued draft individually.
   Old scheduled posts are not automatically replayed; any retained item must be
   corrected and explicitly rescheduled after the release approval.

## 7. Deployment boundary

A documentation-only GitHub correction does not install the runtime hold in a
checkout or deployment. The enforcement update prepared in the workspace must be
included in the actual release; do not infer that it is present from this document.

The shared policy is the runtime source of the hold; old campaign-enabled settings
cannot override it. Disable configuration is also set for the next publish.
Code/configuration changes in the workspace do **not** prove that an already
running published process has stopped. Publish the verified hold, then check the
public `/api/hardware/readiness` response and authenticated campaign status.
Expected public fields include `paused: true` and
`status: "engineering_review_required"`.

This is the beginning of an engineering validation process, not its completion.
