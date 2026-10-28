/**
 * Founder-directed engineering hold. This is deliberately not an environment
 * toggle: old campaign flags or an admin "start" request cannot release it.
 * Release requires reviewed evidence and a separate, explicit founder decision.
 */
export const HARDWARE_REVIEW_HOLD = {
  active: true,
  reason: "Hardware fundraising and promotions are paused pending independently reviewed specifications, test evidence and explicit founder approval.",
  releaseApprovedAt: null as string | null,
  status: "engineering_review_required",
} as const;

export const HARDWARE_EVIDENCE_CORRECTION =
  "Earlier project descriptions, including AI-assisted explanations, overstated what the hardware evidence established. Reported electrical checks on three bifilar coils do not demonstrate photonic computation, a complete SNIC/PHR-1 system, quantum memory, zero-loss operation or gravity control. The current reference architecture is a draft for independent engineering review, not a validated complete hardware design.";

export function promotionsArePaused(): boolean {
  return HARDWARE_REVIEW_HOLD.active
    || !HARDWARE_REVIEW_HOLD.releaseApprovedAt
    || !Number.isFinite(Date.parse(HARDWARE_REVIEW_HOLD.releaseApprovedAt));
}

/** A future release must not silently replay old, unreviewed scheduled posts. */
export function canDispatchScheduledPromotion(scheduledAt: Date | string | number): boolean {
  if (promotionsArePaused()) return false;
  const approved = Date.parse(HARDWARE_REVIEW_HOLD.releaseApprovedAt!);
  const scheduled = new Date(scheduledAt).getTime();
  return Number.isFinite(approved) && Number.isFinite(scheduled) && scheduled >= approved;
}

export const HARDWARE_REFERENCE_SYSTEM = [
  {
    id: "host", component: "Two conventional host computers",
    specification: "Vendor-supported Linux computers, Node.js runtime compatible with the project lockfile, PostgreSQL, and the existing Python spectral service where required. Establish RAM, storage and CPU sizing by workload measurements.",
    evidence: "The hosted application and runtime execute on conventional electronics. Software tests are not optical hardware tests.",
    acceptance: "Reproducible clean install on both hosts; declared versions; backup/restore and restart tests; recorded workload/resource results.",
  },
  {
    id: "runtime", component: "WavelengthScript and WNSP runtime",
    specification: "Use the existing compiler/VM and accepted character set. Treat spectral coordinates as logical labels; reject unsupported inputs and publish versioned encoding/decoding rules and test vectors.",
    evidence: "Software implementation exists. Native photonic instruction execution and universal character support are not established by this.",
    acceptance: "Independent implementations agree on supported test vectors, invalid-input handling and deterministic output; VM execution remains bounded.",
  },
  {
    id: "transport", component: "Conventional network transport",
    specification: "Start with Ethernet/IP between two hosts. An optical transport option may use a vendor-qualified matched pair of 1000BASE-LX SFPs, compatible NICs/switches and matched single-mode fibre/connectors. Final part numbers and compatibility require engineer sign-off.",
    evidence: "These are established component classes, not a purchased or tested NexusOS assembly. Ethernet over fibre carries ordinary digital traffic.",
    acceptance: "Record module specifications, link budget, fibre length, interoperability, packet loss, payload integrity, latency and electrical input power under a declared test load.",
  },
  {
    id: "adapter", component: "Logical-to-physical boundary",
    specification: "The baseline transports serialised WNSP data over a conventional link. A logical wavelength label is not the SFP laser wavelength. Direct wavelength/OAM/polarisation mapping is a separate, unimplemented research adapter.",
    evidence: "No validated device-driver/physical-mode mapping for the full namespace is established.",
    acceptance: "Document framing, versions, units, supported operations, timeouts and error handling. Any future physical adapter must have measured mode isolation and calibrated wavelength mapping.",
  },
  {
    id: "security", component: "Security and operations",
    specification: "Keep existing access controls and cryptographic integrity checks. Require TLS for exposed services, secret isolation, least privilege, audit logs and recovery procedures. Do not replace cryptography with coordinate labels or Maxwell-equation calculations.",
    evidence: "Existing security mechanisms need a scoped independent review; a passing software suite is not security certification.",
    acceptance: "Review authentication/authorisation, malformed frames, replay handling, process failure, backup recovery and private-data exposure; retain reproducible results.",
  },
  {
    id: "bench", component: "Measurement and procurement",
    specification: "A qualified photonics engineer must approve a costed BOM with manufacturer part numbers, compatibility, optical safety, test equipment and calibration requirements. No invented quotes or assumed coil-to-optical coupling.",
    evidence: "Reported Coiltek coil measurements concern inductance and DC resistance only. An approved integrated photonic BOM and independent optical test report are missing.",
    acceptance: "Signed review, supplier quotes, loss/power budget, risk register, test procedure, raw results and an explicit go/no-go decision before purchasing beyond the approved experiment.",
  },
] as const;

export const HARDWARE_RELEASE_GATES = [
  "A qualified independent engineer reviews the end-to-end architecture and signs the component/interface specification.",
  "A costed, vendor-verified bill of materials and optical/electrical safety assessment are approved.",
  "A repeatable two-host experiment meets predeclared criteria; raw measurements, failure cases and limitations are published.",
  "An independently implemented endpoint passes the supported protocol test vectors; no cross-vendor compatibility is claimed without testing it.",
  "Public funding terms and promotional claims match the evidence and the specific next milestone.",
  "The founder explicitly approves a release after reviewing the evidence; old posts are reviewed individually, not automatically replayed.",
] as const;
