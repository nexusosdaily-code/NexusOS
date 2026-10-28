import { RESEARCH_EVIDENCE } from "./research-evidence";
import { PROJECT_DESCRIPTION } from "./research-positioning";

export interface ResearchPageMeta {
  title: string;
  description: string;
}

/** Shared by browser and server so previews cannot restore older overclaims. */
export const RESEARCH_PAGE_META: Record<string, ResearchPageMeta> = {
  "/": {
    title: "NexusOS — WavelengthScript and blockchain development",
    description: `${PROJECT_DESCRIPTION} The application runs on conventional computers; native photonic execution and historical priority are not established.`,
  },
  "/research-transparency": {
    title: "NexusOS — software priorities, future vision and evidence",
    description: `${PROJECT_DESCRIPTION} Compare related work, mapping limits and evidence for all 20 research Acts. This is not a finding of historical priority or native photonic interoperability.`,
  },
  "/wnsp": {
    title: "WNSP — encoding technology for WavelengthScript and blockchain",
    description: "WNSP spectral-coordinate encoding and protocol work supports WavelengthScript and NexusOS blockchain development. Software is the present priority; physical interoperability and historical priority are not established.",
  },
  "/hardware-spec": {
    title: "NexusOS hardware — engineering hold and grounded requirements",
    description: "Hardware fundraising and promotions paused. Draft end-to-end conventional-host requirements, missing engineering evidence and independent review gates. Archived concepts are not approved procurement specifications.",
  },
  "/campaign": {
    title: "NexusOS hardware campaign — fundraising and promotions paused",
    description: "Hardware fundraising and promotions are on hold pending independently reviewed specifications, physical test evidence and explicit founder approval. No automatic restart date.",
  },
  "/crowdfund": {
    title: "NexusOS hardware fundraising — engineering review required",
    description: "We are not soliciting hardware contributions while the design is under review. Read the grounded reference architecture, evidence gaps and requirements before fundraising or promotions can resume.",
  },
  "/wavelength-lang": {
    title: "WavelengthScript — language technology driving blockchain development",
    description: "WavelengthScript and the blockchain have always been NexusOS's primary focus. Explore language tools on conventional computers today, distinct from a century-long vision for future generations. Native photonic execution and historical priority are not established.",
  },
  "/blockchain": {
    title: "NexusOS blockchain — driven by WavelengthScript technology",
    description: "WavelengthScript is the vehicle for NexusOS blockchain development, with WNSP encoding and software ledger records. Encoding does not replace hashes, signatures, transaction authorisation or consensus. Future hardware is not a prerequisite.",
  },
  "/protocol": {
    title: "WNSP — protocol models and evidence boundaries",
    description: "Spectral encoding, addressing and protocol proposals. Physical channel compatibility, optical throughput and interoperability require device-specific tests; a finite namespace is not a universal physical address.",
  },
};

const ALIASES: Record<string, string> = {
  "/hub": "/", "/start": "/", "/photonic-ledger": "/blockchain",
  "/snic": "/hardware-spec", "/phr1": "/hardware-spec",
};

export function researchPageMeta(path: string): ResearchPageMeta | undefined {
  const pathname = path.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const evidence = RESEARCH_EVIDENCE.find(entry => entry.route === pathname);
  if (evidence) return {
    title: `${evidence.title} — NexusOS Act ${evidence.act}: research and evidence`,
    description: `${evidence.act === 20
      ? "A single-mode squeezed vacuum is pure; a two-mode pair can have a thermal reduced state. "
      : evidence.act === 19 ? `${evidence.established} ` : ""}${evidence.proposal} ${evidence.limitation}`,
  };
  return RESEARCH_PAGE_META[ALIASES[pathname] ?? pathname];
}
