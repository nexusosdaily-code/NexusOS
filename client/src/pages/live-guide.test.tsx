// @vitest-environment happy-dom
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LiveGuidePage from "./live-guide";

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: vi.fn() }));

afterEach(cleanup);

describe("public live streaming guide", () => {
  it("explains the confirmed device test and the exact broadcaster-to-receiver sequence", () => {
    render(<LiveGuidePage />);

    expect(screen.getByRole("heading", { name: /a real live test/i })).toBeTruthy();
    expect(screen.getByText(/iPhone broadcaster using Chrome and a Samsung receiver using Chrome, both on the same Wi-Fi/i)).toBeTruthy();
    expect(screen.getByText(/actual live video and heard both the broadcaster’s voice and TV sound/i)).toBeTruthy();
    expect(screen.getByText(/The user also confirmed live broadcasting from iPhone Safari to iPad Safari/i)).toBeTruthy();
    expect(screen.getByText(/earlier Safari broadcaster to Samsung Chrome failure remains unresolved/i)).toBeTruthy();
    expect(screen.getByText(/Audio and front\/rear camera switching were not separately reported/i)).toBeTruthy();
    expect(screen.getByText(/Camera \(not Screen or Both for the first mobile test\)/i)).toBeTruthy();
    expect(screen.getByText(/Browse directory or enter the recipient’s exact registered wave address/i)).toBeTruthy();
    expect(screen.getByText(/an invitation can take about 10 seconds to appear/i)).toBeTruthy();
    expect(screen.getByText(/decoded video frames and received KB are increasing/i)).toBeTruthy();
    expect(screen.getByText(/choose Enable sound/i)).toBeTruthy();
  });

  it("states meaningful access and delivery limitations and links to the existing broadcast page", () => {
    render(<LiveGuidePage />);

    expect(screen.getByText(/does not invite someone to a live room/i)).toBeTruthy();
    expect(screen.getByText(/broadcasts are not automatically recorded/i)).toBeTruthy();
    expect(screen.getByText(/no TURN relay/i)).toBeTruthy();
    expect(screen.getByText(/not a guarantee of 50 simultaneous video viewers/i)).toBeTruthy();
    expect(screen.getByText(/Mobile screen capture has not been verified/i)).toBeTruthy();

    const broadcastLinks = screen.getAllByRole("link", { name: /Spectral Broadcast|Go to Live broadcasts/i });
    expect(broadcastLinks.length).toBeGreaterThan(0);
    expect(broadcastLinks.every(link => link.getAttribute("href") === "/streaming")).toBe(true);
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: /Go to Live broadcasts/i }).getAttribute("href")).toBe("/streaming");
  });
});
