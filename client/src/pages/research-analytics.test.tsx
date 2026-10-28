import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import ResearchTransparencyPage from "./research-transparency";
import { ResearchDisclosureContent } from "@/components/research-disclosure-content";
import { RELATED_WORK } from "@shared/research-positioning";

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children?: ReactNode; href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

const track = vi.fn();
function clickLink(element: Element) {
  element.addEventListener("click", event => event.preventDefault(), { once: true });
  fireEvent.click(element);
}

beforeEach(() => {
  track.mockReset();
  window.umami = { track };
});
afterEach(() => {
  cleanup();
  delete window.umami;
  vi.useRealTimers();
});

describe("research engagement events", () => {
  it("records deliberate repository, disclosure, source and Act clicks, not page mounts", () => {
    const { container } = render(<ResearchTransparencyPage />);
    expect(track).not.toHaveBeenCalled();
    clickLink(screen.getByRole("link", { name: "Project repository" }));
    clickLink(screen.getByRole("link", { name: "Original numbered disclosures" }));
    for (const work of RELATED_WORK) {
      clickLink(screen.getByRole("link", { name: work.title }));
      expect(track).toHaveBeenLastCalledWith("research_link_opened", {
        surface: "research_transparency", destination: "related_work", reference: work.id,
      });
    }
    clickLink(container.querySelector("#act-20 a")!);
    expect(track).toHaveBeenLastCalledWith("research_link_opened", {
      surface: "research_transparency", destination: "act", act: 20,
    });
    expect(track).toHaveBeenCalledWith("research_link_opened", {
      surface: "research_transparency", destination: "repository",
    });
    expect(track).toHaveBeenCalledWith("research_link_opened", {
      surface: "research_transparency", destination: "numbered_disclosures",
    });
    expect(track).toHaveBeenCalledTimes(8);
  });

  it("debounces searches, reports result counts and clearing, and never sends the query", () => {
    vi.useFakeTimers();
    render(<ResearchTransparencyPage />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "PRIVATE_SEARCH@example.invalid" } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(input, { target: { value: "Bogoliubov" } });
    act(() => vi.advanceTimersByTime(499));
    expect(track).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(track).toHaveBeenLastCalledWith("research_filter_used", {
      surface: "research_transparency", action: "filter", result_count: 1,
    });
    fireEvent.change(input, { target: { value: "  BOGOLIUBOV " } });
    act(() => vi.advanceTimersByTime(500));
    expect(track).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { value: "PRIVATE_SEARCH@example.invalid" } });
    act(() => vi.advanceTimersByTime(500));
    expect(track).toHaveBeenLastCalledWith("research_filter_used", {
      surface: "research_transparency", action: "filter", result_count: 0,
    });
    fireEvent.change(input, { target: { value: "" } });
    act(() => vi.advanceTimersByTime(500));
    expect(track).toHaveBeenLastCalledWith("research_filter_used", {
      surface: "research_transparency", action: "clear", result_count: 20,
    });
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/PRIVATE_SEARCH|example\.invalid|Bogoliubov/i);
  });

  it("cancels pending search events on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<ResearchTransparencyPage />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "memory" } });
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(track).not.toHaveBeenCalled();
  });

  it("records the fixed disclosure context without changing the destination", () => {
    render(<ResearchDisclosureContent context="Hardware specification" />);
    const link = screen.getByRole("link", { name: "Read the full research transparency record" });
    clickLink(link);
    expect(link.getAttribute("href")).toBe("/research-transparency");
    expect(track).toHaveBeenCalledExactlyOnceWith("research_disclosure_opened", {
      surface: "research_notice", context: "Hardware specification",
    });
  });
});
