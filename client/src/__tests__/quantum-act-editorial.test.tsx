import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import TheSqueezedStatePage from "@/pages/the-squeezed-state";
import TheBogoliubovTransformPage from "@/pages/the-bogoliubov-transform";

const { pageMeta } = vi.hoisted(() => ({ pageMeta: vi.fn() }));
vi.mock("@/hooks/use-page-meta", () => ({ usePageMeta: pageMeta }));
vi.mock("@/components/ecosystem-nav", () => ({ EcosystemNav: () => null }));
vi.mock("@/components/act-sequence-nav", () => ({ ActSequenceNav: () => null }));

beforeEach(() => {
  pageMeta.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const visibleText = (container: HTMLElement) => container.textContent!.replace(/\s+/g, " ");

describe("Rendered Act 19 explanations", () => {
  it("separates quadrature squeezing, photon counts and Wigner positivity", () => {
    const { container } = render(<TheSqueezedStatePage />);
    const text = visibleText(container);
    expect(text).toContain("Var(n) = 2n̄(n̄ + 1)");
    expect(text).toContain("super-Poissonian");
    expect(text).toContain("Mandel Q = 2n̄ + 1 > 0");
    expect(text).toContain("Q is undefined");
    expect(text).toContain("depending on displacement and squeezing angle");
    expect(text).toContain("non-negative Gaussian Wigner function");
    expect(text).toContain("Gaussian squeezing alone does not imply Wigner negativity");
    expect(text).toContain("The external pump supplies the energy");
    expect(text).toContain("Tracing out one partner");
    expect(text).toContain("NexusOS hypotheses");
    expect(text).toContain("numbered predictions below retain their original disclosure wording");
  });

  it("keeps the live quadrature visualiser working, including the vacuum limit", () => {
    const { container, getByRole } = render(<TheSqueezedStatePage />);
    fireEvent.change(getByRole("slider"), { target: { value: "0" } });
    expect(visibleText(container)).toContain("r = 0.00");
    expect(visibleText(container)).toContain("0.5000");
    expect(visibleText(container)).toContain("0.2500");
    fireEvent.change(getByRole("slider"), { target: { value: "1" } });
    expect(visibleText(container)).toContain("r = 1.00");
    expect(visibleText(container)).toContain("0.1839");
    expect(visibleText(container)).toContain("1.3591");
  });

  it("keeps client search/social metadata within the same evidence boundary", () => {
    render(<TheSqueezedStatePage />);
    const meta = pageMeta.mock.calls[0][0];
    for (const key of ["description", "ogDescription", "twitterDescription"]) {
      expect(meta[key]).toMatch(/super-Poissonian/i);
      expect(meta[key]).toMatch(/non-negative Gaussian Wigner|does not imply Wigner negativity/i);
      expect(meta[key]).toMatch(/proposed|hypothes/i);
    }
  });
});

describe("Rendered Act 20 explanations", () => {
  it("distinguishes pure single-mode vacuum from thermal reduced modes and supplied energy", () => {
    const { container } = render(<TheBogoliubovTransformPage />);
    const text = visibleText(container);
    expect(text).toContain("pure single-mode squeezed vacuum, not a thermal state");
    expect(text).toContain("Tracing out the inaccessible partner leaves a thermal reduced state");
    expect(text).toContain("supplied by the pump");
    expect(text).toContain("externally supplied energy: work done by the boundary drive");
    expect(text).toContain("not free energy extracted from an undriven vacuum");
    expect(text).not.toContain("a thermal squeezed state for the accelerating observer");
    expect(text).not.toContain("Zero-point extraction per Ψ channel is therefore bounded");
    expect(text).toContain("UCT hypothesis (not established physics)");
    expect(text).toContain("Λ_B and the WNSP extraction-bound interpretation are NexusOS hypotheses");
    expect(text).toContain("numbered predictions below retain their original disclosure wording");
  });

  it("keeps client search/social metadata within the same evidence boundary", () => {
    render(<TheBogoliubovTransformPage />);
    const meta = pageMeta.mock.calls[0][0];
    for (const key of ["description", "ogDescription", "twitterDescription"]) {
      expect(meta[key]).toMatch(/pure/i);
      expect(meta[key]).toMatch(/thermal reduced/i);
      expect(meta[key]).toMatch(/external|externally/i);
      expect(meta[key]).toMatch(/hypothes/i);
    }
    expect(meta.ogDescription).not.toContain("IS the compression state transition");
  });
});
