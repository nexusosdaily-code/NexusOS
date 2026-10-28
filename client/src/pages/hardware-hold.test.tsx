import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import CampaignPage, { DonateModal, LAB_TIERS } from "./campaign";
import CrowdfundPage from "./crowdfund";
import HardwareSpecPage from "./hardware-spec";
import { HARDWARE_EVIDENCE_CORRECTION } from "@shared/hardware-readiness";

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children?: ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@tanstack/react-query", async importOriginal => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: () => ({ data: null }) };
});
afterEach(cleanup);

describe("public hardware engineering hold", () => {
  it.each([["campaign", CampaignPage], ["crowdfund", CrowdfundPage]] as const)(
    "replaces %s fundraising promises with the hold and engineering links", (_name, Page) => {
      render(<Page />);
      expect(screen.getByRole("heading", { name: "Fundraising and promotions paused" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Read the grounded system requirements" }).getAttribute("href")).toBe("/hardware-spec");
      expect(screen.queryByRole("button", { name: /Record contribution|donate|contribute/i })).toBeNull();
      expect(document.querySelector('a[href*="geyser.fund"],a[href*="indiegogo.com"]')).toBeNull();
    },
  );

  it("also blocks the donation modal independently of its parent", () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><DonateModal t={LAB_TIERS[0]} onClose={() => {}} /></QueryClientProvider>);
    expect(screen.getByRole("heading", { name: "Fundraising and promotions paused" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Record contribution/ })).toBeNull();
  });

  it("makes the grounded architecture primary and labels legacy concepts as unapproved", () => {
    render(<HardwareSpecPage />);
    expect(screen.getByRole("heading", { name: "Grounded system architecture and hardware readiness" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Required before fundraising or promotion resumes" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Correction of earlier hardware claims" })).toBeTruthy();
    expect(screen.getByText(HARDWARE_EVIDENCE_CORRECTION)).toBeTruthy();
    expect(screen.getByText(/No independent engineer has been appointed/)).toBeTruthy();
    const archive = screen.getByText("Archived design concepts — not validated specifications or approved purchase instructions").closest("details");
    expect(archive?.hasAttribute("open")).toBe(false);
    expect(document.querySelectorAll("article")).toHaveLength(6);
  });
});
