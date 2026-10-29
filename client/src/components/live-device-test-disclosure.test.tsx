import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveDeviceTestDisclosure } from "./LiveDeviceTestDisclosure";

describe("physical private-call field disclosure", () => {
  it("discloses four passed device/network setups without conflating the Apple tests", () => {
    render(<LiveDeviceTestDisclosure />);
    const section = screen.getByTestId("passed-private-device-tests");
    const rows = within(section).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.textContent).toContain("PASS · live video and audio");
    expect(rows[0].textContent).toContain("Samsung on mobile data; iPhone on Wi-Fi");
    expect(rows[1].textContent).toContain("iPhone on Wi-Fi; Samsung on mobile data");
    expect(rows[2].textContent).toContain("hotspot");
    expect(rows[3].textContent).toContain("iPad on Wi-Fi; iPhone on mobile data");
  });

  it("credits confirmed audio and labels the earlier attempt as history without exposing private assets", () => {
    const { container } = render(<LiveDeviceTestDisclosure />);
    const text = container.textContent ?? "";
    expect(text).toContain("not simulated-browser results");
    expect(text).toContain("All four physical-device tests passed with live video and audio, confirmed by the participants");
    expect(text).not.toMatch(/Audio, front|audio was not|intermittent failure/);
    expect(text).toContain("Historical note: an earlier iPhone-to-Samsung connection attempt failed");
    expect(text).toContain("not the current test status");
    expect(text).toContain("operator-inaccessible confidentiality or zero tracking");
    expect(container.querySelectorAll("img,video,audio,iframe")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/attached_assets|Messenger_creation|Screen_Recording|@gmail|NXT-NEXS/);
  });

  it("links the public guide and repository report to the updated evidence", () => {
    const guide = readFileSync("client/src/pages/live-guide.tsx", "utf8");
    const report = readFileSync("docs/live-private-call-field-tests.md", "utf8");
    const history = readFileSync("docs/live-video-browser-verification.md", "utf8");
    expect(guide).toContain("<LiveDeviceTestDisclosure />");
    expect(guide).toContain("updated 29 October 2026");
    expect(guide).not.toContain("Unresolved: the earlier Safari-to-Samsung failure cause, both transmission directions");
    for (const pairing of ["Samsung Chrome → iPhone Chrome", "iPhone Chrome → Samsung Chrome", "iPhone → iPad", "iPad → iPhone"]) {
      expect(report).toContain(pairing);
    }
    expect(history).toContain("live-private-call-field-tests.md");
    expect(report.match(/\*\*PASS — live video and audio, participant-confirmed\.\*\*/g)).toHaveLength(4);
    expect(guide).not.toContain("Unresolved: the earlier intermittent failures");
    expect(history).toContain("participants confirmed audio");
  });
});
