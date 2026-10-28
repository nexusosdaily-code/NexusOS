import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ResearchTransparencyPage from "./research-transparency";
import { ResearchDisclosure } from "@/components/research-disclosure";
import { RESEARCH_EVIDENCE } from "@shared/research-evidence";
import { researchPageMeta } from "@shared/research-page-meta";
import { PROJECT_DESCRIPTION, PROJECT_FOCUS, PROJECT_HORIZON, PROJECT_EVIDENCE_PRINCIPLE, PRIORITY_BOUNDARY, RELATED_WORK } from "@shared/research-positioning";
import type { ReactNode } from "react";
import { HARDWARE_EVIDENCE_CORRECTION } from "@shared/hardware-readiness";

const routing = vi.hoisted(() => ({ path: "/research-transparency" }));
vi.mock("wouter", () => ({
  useLocation: () => [routing.path, vi.fn()],
  Link: ({ children, href, ...props }: { children?: ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

beforeEach(() => { routing.path = "/research-transparency"; });
afterEach(cleanup);

describe("public research transparency", () => {
  it("states the longstanding language/blockchain priority, century-long horizon and evidence requirement", () => {
    render(<ResearchTransparencyPage />);
    expect(screen.getByText(PROJECT_FOCUS)).toBeTruthy();
    expect(screen.getByText(PROJECT_HORIZON)).toBeTruthy();
    expect(screen.getByText(PROJECT_EVIDENCE_PRINCIPLE)).toBeTruthy();
    expect(screen.getByRole("link", { name: "WavelengthScript" }).getAttribute("href")).toBe("/wavelength-lang");
    expect(screen.getByRole("link", { name: "Blockchain" }).getAttribute("href")).toBe("/blockchain");
  });
  it("prominently acknowledges earlier hardware overstatements and links the current requirements", () => {
    render(<ResearchTransparencyPage />);
    expect(screen.getByRole("heading", { name: "Correction of earlier hardware claims" })).toBeTruthy();
    expect(screen.getByText(HARDWARE_EVIDENCE_CORRECTION)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Read the grounded hardware requirements and missing evidence" }).getAttribute("href")).toBe("/hardware-spec");
  });
  it("explains the particular combination and links every related-work source", () => {
    const { container } = render(<ResearchTransparencyPage />);
    expect(screen.getByText(PROJECT_DESCRIPTION)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "How WavelengthScript/WNSP differs" })).toBeTruthy();
    for (const work of RELATED_WORK) {
      expect(screen.getByRole("link", { name: work.title }).getAttribute("href")).toBe(work.url);
      expect(container.textContent).toContain(work.overlap);
      expect(container.textContent).toContain(work.difference);
    }
    expect(container.textContent).toContain(PRIORITY_BOUNDARY);
    expect(container.textContent).toContain("583.125 nm");
    expect(container.textContent).toContain("gateway-mediated interoperability");
    expect(container.textContent).toMatch(/direct optical/i);
  });

  it("renders all twenty Acts with evidence and real destination links", () => {
    const { container } = render(<ResearchTransparencyPage />);
    for (const entry of RESEARCH_EVIDENCE) {
      const act = container.querySelector(`#act-${entry.act}`);
      expect(act).not.toBeNull();
      expect(act!.textContent).toContain(entry.established);
      expect(act!.textContent).toContain(entry.proposal);
      expect(act!.textContent).toContain(entry.limitation);
      expect(act!.querySelector(`a[href="${entry.route}"]`)).not.toBeNull();
    }
    expect(document.title).toBe(researchPageMeta("/research-transparency")!.title);
    expect(container.textContent).toContain("Replit Agent");
  });

  it("filters Acts and provides an explicit empty result", () => {
    const { container } = render(<ResearchTransparencyPage />);
    const filter = screen.getByRole("searchbox", { name: "Filter research Acts" });
    fireEvent.change(filter, { target: { value: "Bogoliubov" } });
    expect(container.querySelector("#act-20")).not.toBeNull();
    expect(container.querySelector("#act-1")).toBeNull();
    fireEvent.change(filter, { target: { value: "not-a-research-entry" } });
    expect(screen.getByText(/No Acts match/)).toBeTruthy();
    fireEvent.change(filter, { target: { value: "" } });
    expect(container.querySelectorAll('[id^="act-"]')).toHaveLength(20);
  });

  it.each(RESEARCH_EVIDENCE)("shows visible evidence before Act $act content", entry => {
    routing.path = `${entry.route}/?source=test`;
    const { container } = render(<ResearchDisclosure />);
    expect(container.textContent).toContain(entry.established);
    expect(container.textContent).toContain(entry.proposal);
    expect(container.textContent).toContain(entry.limitation);
    expect(container.querySelector('a[href="/research-transparency"]')).not.toBeNull();
  });

  it.each(["/wallet", "/auth", "/research-transparency"])("does not add a disclosure on %s", path => {
    routing.path = path;
    const { container } = render(<ResearchDisclosure />);
    expect(container.childElementCount).toBe(0);
  });

  it.each(["/", "/campaign", "/crowdfund", "/hardware-spec", "/wavelength-lang", "/blockchain", "/wnsp"])(
    "makes evidence discoverable from %s", path => {
      routing.path = path;
      const { container } = render(<ResearchDisclosure />);
      expect(container.querySelector('a[href="/research-transparency"]')).not.toBeNull();
    },
  );
});
