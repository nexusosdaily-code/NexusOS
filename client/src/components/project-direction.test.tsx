import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ProjectDirection } from "./project-direction";
import { PROJECT_FOCUS, PROJECT_HORIZON, PROJECT_EVIDENCE_PRINCIPLE } from "@shared/research-positioning";

afterEach(cleanup);

describe("public project direction", () => {
  it("separates the longstanding software priority, future vision and evidence requirements", () => {
    render(<ProjectDirection />);
    const section = screen.getByRole("region", { name: "Project direction" });
    for (const text of [PROJECT_FOCUS, PROJECT_HORIZON, PROJECT_EVIDENCE_PRINCIPLE]) {
      expect(within(section).getByText(text)).toBeTruthy();
    }
    expect(section.textContent).toContain("have always been");
    expect(section.textContent).toContain("2126");
    expect(section.textContent).toContain("future generations");
    expect(section.textContent).toContain("reproducible evidence");
  });

  it("links visitors to the language, blockchain and public evidence record", () => {
    render(<ProjectDirection />);
    for (const [name, href] of [
      ["WavelengthScript", "/wavelength-lang"],
      ["Blockchain", "/blockchain"],
      ["Read the evidence record", "/research-transparency"],
    ]) {
      expect(screen.getByRole("link", { name }).getAttribute("href")).toBe(href);
    }
  });
});
