import { useLocation } from "wouter";
import { RESEARCH_EVIDENCE } from "@shared/research-evidence";
import { ResearchDisclosureContent } from "./research-disclosure-content";
import { PROJECT_DESCRIPTION, PROJECT_FOCUS } from "@shared/research-positioning";

const CONTEXT: Record<string, { label: string; summary: string; showHardware?: boolean }> = {
  "/": {
    label: "NexusOS overview",
    summary: `${PROJECT_DESCRIPTION} It runs on conventional computing infrastructure; native photonic execution is not established.`,
    showHardware: true,
  },
  "/hub": {
    label: "Language and blockchain hub",
    summary: PROJECT_DESCRIPTION,
    showHardware: true,
  },
  "/wnsp": {
    label: "WNSP",
    summary: `${PROJECT_FOCUS} Cross-system interoperability requires demonstration.`,
  },
  "/start": {
    label: "Getting started",
    summary: "Getting started describes software tools and mappings that run on conventional computers, not verified execution on native photonic hardware.",
  },
  "/hardware-spec": {
    label: "Hardware specification",
    summary: "A specification describes a proposed design; it is not evidence that the specified integrated system has been built or validated.",
    showHardware: true,
  },
  "/campaign": {
    label: "Campaign",
    summary: "Hardware work remains research with technical risks. Funding does not guarantee hardware delivery, investment returns, equity, ownership, or any other ownership interest.",
    showHardware: true,
  },
  "/crowdfund": {
    label: "Funding",
    summary: "Hardware work remains research with technical risks. Funding does not guarantee hardware delivery, investment returns, equity, ownership, or any other ownership interest.",
    showHardware: true,
  },
  "/wavelength-lang": {
    label: "WavelengthScript",
    summary: `${PROJECT_FOCUS} Its compiler/interpreter runs on conventional computers; native photonic execution and historical priority are not established.`,
  },
  "/blockchain": {
    label: "Blockchain",
    summary: `${PROJECT_FOCUS} Coordinate representations do not replace cryptographic authentication or consensus.`,
  },
  "/photonic-ledger": {
    label: "Photonic ledger",
    summary: "The ledger's spectral coordinates are software representations. Their availability does not demonstrate independent optical modes or measured optical throughput.",
  },
  "/protocol": {
    label: "Protocol",
    summary: "WNSP is a proposed representation/protocol and requires interoperability demonstrations. Photonic systems already communicate; this work does not claim to originate computer-to-computer communication.",
  },
  "/snic": {
    label: "SNIC",
    summary: "SNIC is a proposed interface architecture. A design and software model do not demonstrate an integrated photonic network interface.",
    showHardware: true,
  },
  "/phr1": {
    label: "PHR-1",
    summary: "Reported electrical coil tests are limited to electrical characteristics; they do not validate optical operation, gravity control, or ZERO-G performance.",
    showHardware: true,
  },
};

export function ResearchDisclosure() {
  const [rawLocation] = useLocation();
  const location = rawLocation.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (location === "/research-transparency") return null;

  const evidence = RESEARCH_EVIDENCE.find((item) => item.route === location);
  if (evidence) {
    return (
      <ResearchDisclosureContent
        title={`Act ${evidence.act} · ${evidence.title}`}
        context="Act-specific evidence"
        established={evidence.established}
        proposal={evidence.proposal}
        limitation={evidence.limitation}
      />
    );
  }

  const context = CONTEXT[location];
  if (!context) return null;

  return (
    <ResearchDisclosureContent
      title="Research status"
      context={context.label}
      established={context.summary}
      showHardware={context.showHardware}
    />
  );
}
