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
    expect(screen.getAllByText(/earlier iPhone-to-Samsung connection attempt failed; subsequent retests passed with live video and audio/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Audio and front\/rear camera switching were not separately reported/i)).toBeTruthy();
    expect(screen.getByText(/Camera \(not Screen or Both for the first mobile test\)/i)).toBeTruthy();
    expect(screen.getByText(/Browse directory or enter the recipient’s exact registered wave address/i)).toBeTruthy();
    expect(screen.getByText(/an invitation can take about 10 seconds to appear/i)).toBeTruthy();
    expect(screen.getByText(/decoded video frames and received KB are increasing/i)).toBeTruthy();
    expect(screen.getByText(/choose Enable sound/i)).toBeTruthy();
    expect(screen.getByText(/red End broadcast button at the top of the video/i)).toBeTruthy();
    expect(screen.getByText(/receiver selects Leave to disconnect only themselves/i)).toBeTruthy();
  });

  it("states meaningful access and delivery limitations and links to the existing broadcast page", () => {
    render(<LiveGuidePage />);

    expect(screen.getByText(/does not invite someone to a live room/i)).toBeTruthy();
    expect(screen.getAllByText(/broadcasts are not automatically recorded/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/no TURN relay/i)).toBeTruthy();
    expect(screen.getByText(/not a guarantee of 50 simultaneous video viewers/i)).toBeTruthy();
    expect(screen.getByText(/Mobile screen capture has not been verified/i)).toBeTruthy();

    const broadcastLinks = screen.getAllByRole("link", { name: /Spectral Broadcast|Go to Live broadcasts/i });
    expect(broadcastLinks.length).toBeGreaterThan(0);
    expect(broadcastLinks.every(link => link.getAttribute("href") === "/streaming")).toBe(true);
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: /Go to Live broadcasts/i }).getAttribute("href")).toBe("/streaming");
  });

  it("discloses the dated cross-network device tests without claiming universal connectivity", () => {
    render(<LiveGuidePage />);
    const disclosure = screen.getByTestId("cross-network-test-disclosure");
    expect(disclosure.textContent).toContain("29 October 2026");
    expect(disclosure.textContent).toContain("passed with live video and audio");
    expect(disclosure.textContent).toContain("Samsung/iPhone in both reported directions");
    expect(disclosure.textContent).toContain("mobile data");
    expect(disclosure.textContent).toContain("Wi-Fi");
    expect(disclosure.textContent).toContain("confirmed by the participants");
    expect(screen.getByText(/These passes do not establish every browser or network combination/i)).toBeTruthy();
    expect(within(screen.getByTestId("passed-private-device-tests")).getAllByText("PASS · live video and audio")).toHaveLength(4);
    expect(screen.queryByText(/Unresolved:.*connections across different networks/i)).toBeNull();
  });

  it("explains free access and privacy without falsely promising zero tracking", () => {
    render(<LiveGuidePage />);
    const notice = within(screen.getByTestId("live-privacy-notice"));
    expect(notice.getByRole("heading", { name: "Privacy and free use" })).toBeTruthy();
    expect(notice.getByText(/no platform charge/i)).toBeTruthy();
    expect(notice.getByText(/Mobile-data and internet-provider charges/i)).toBeTruthy();
    expect(notice.getByText(/invited, signed-in participants/i)).toBeTruthy();
    expect(notice.getByText(/encrypted in transit using WebRTC/i)).toBeTruthy();
    expect(notice.getByText(/not a zero-data-tracking service/i)).toBeTruthy();
    expect(notice.getByText(/IP addresses, browser details/i)).toBeTruthy();
    expect(notice.getByText(/participants recording what they receive/i)).toBeTruthy();
  });

  it("makes the native recipient pilot disclosure available on the public guide", () => {
    render(<LiveGuidePage />);
    expect(screen.getByRole("heading", { name: "WavelengthScript in live broadcasting" })).toBeTruthy();
    expect(screen.getByTestId("native-collection-disclosure").textContent).toContain("WLS-COLLECTION/1");
  });
});
