import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { UnicodeCoordinatePanel } from "./unicode-coordinate-panel";
import * as catalogue from "@shared/unicode-catalogue";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function openNameSearch() {
  render(<UnicodeCoordinatePanel />);
  fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
  return screen.findByLabelText("Search official character names or aliases");
}
function submitName(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Search names" }));
}
describe("Unicode name search", () => {
  it("searches official names and aliases, inspects exact coordinates and uses or appends the result", async () => {
    const input = await openNameSearch();
    submitName(input, "EGYPTIAN HIEROGLYPH A001");
    fireEvent.click(screen.getByRole("button", { name: "Inspect U+13000 — EGYPTIAN HIEROGLYPH A001" }));
    const details = screen.getByTestId("unicode-point-details");
    expect(details.textContent).toContain("EGYPTIAN HIEROGLYPH A001");
    expect(details.textContent).toContain("Ψ(112,1,H)");
    expect(details.textContent).toContain("DECODE ROUNDTRIP VERIFIED");
    fireEvent.click(screen.getByRole("button", { name: "Use symbol in preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue("𓀀");
    fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue("𓀀𓀀");
    submitName(input, "line feed");
    fireEvent.click(screen.getByRole("button", { name: "Inspect U+000A — <control>" }));
    expect(details.textContent).toContain("No Unicode character name");
    expect(details.textContent).toContain("LINE FEED");
    expect(details.textContent).toContain("(control)");
    submitName(input, "PRESENTATION FORM FOR VERTICAL RIGHT WHITE LENTICULAR BRACKET");
    fireEvent.click(within(screen.getByTestId("unicode-name-results")).getByRole("button"));
    expect(details.textContent).toContain("LENTICULAR BRAKCET");
    expect(details.textContent).toContain("LENTICULAR BRACKET");
    expect(details.textContent).toContain("(correction)");
    expect(screen.getByRole("link", { name: "UnicodeData.txt" })).toHaveAttribute("href", "https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt");
    expect(screen.getByRole("link", { name: "NameAliases.txt" })).toHaveAttribute("href", "https://www.unicode.org/Public/17.0.0/ucd/NameAliases.txt");
  });
  it("bounds name results, resets pagination and distinguishes empty from no matches", async () => {
    const input = await openNameSearch();
    expect(input).toHaveAttribute("maxlength", "120");
    submitName(input, "CJK UNIFIED IDEOGRAPH");
    const results = screen.getByTestId("unicode-name-results");
    expect(within(results).getAllByRole("button")).toHaveLength(64);
    expect(within(results).getAllByRole("button")[0].textContent).toContain("U+3400");
    fireEvent.click(screen.getByRole("button", { name: "Next name results" }));
    expect(within(results).getAllByRole("button")[0].textContent).toContain("U+3440");
    submitName(input, "hangul syllable hih");
    expect(screen.getByRole("button", { name: "Previous name results" })).toBeDisabled();
    fireEvent.click(within(results).getByRole("button"));
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("HANGUL SYLLABLE HIH");
    submitName(input, "not an official character name");
    expect(within(results).queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Next name results" })).toBeDisabled();
    submitName(input, "  ");
    expect(screen.getByText("Enter an official character name or alias.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Code point lookup"), { target: { value: "E000" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up code point" }));
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("No Unicode character name");
    expect(screen.queryByRole("button", { name: "Use symbol in preview" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Append symbol to preview" })).toBeNull();
  });
  it("keeps lookup available on a name chunk failure and allows retry", async () => {
    const names = await catalogue.loadUnicodeNames();
    vi.spyOn(catalogue, "loadUnicodeNames")
      .mockResolvedValueOnce(names) // Whole-preview metadata is independent of inspector loading.
      .mockRejectedValueOnce(new Error("Fixture chunk failure"));
    render(<UnicodeCoordinatePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
    await screen.findByRole("button", { name: "Retry name loading" });
    fireEvent.change(screen.getByLabelText("Code point lookup"), { target: { value: "41" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up code point" }));
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("Name data unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry name loading" }));
    await screen.findByLabelText("Search official character names or aliases");
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("LATIN CAPITAL LETTER A");
  });
});
