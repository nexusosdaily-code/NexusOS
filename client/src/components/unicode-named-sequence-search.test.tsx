import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { UnicodeCoordinatePanel } from "./unicode-coordinate-panel";
import { UnicodeNamedSequenceSearch } from "./unicode-named-sequence-search";
import * as names from "@shared/unicode-character-names";
import { encodeUnicodeCE, decodeUnicodeCE, unicodeCoordinateWavelength } from "@shared/unicode-ce";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function openSearch() {
  render(<UnicodeCoordinatePanel />);
  fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
  return screen.findByLabelText("Search official named character sequences");
}
function submit(input: HTMLElement, query: string) {
  fireEvent.change(input, { target: { value: query } });
  fireEvent.click(screen.getByRole("button", { name: "Search named sequences" }));
}

describe("separately labelled named sequence search", () => {
  it.each([
    ["U+0031 U+FE0F U+20E3", "KEYCAP DIGIT ONE", [0x31, 0xFE0F, 0x20E3]],
    ["u+0101\t\nU+0300", "LATIN SMALL LETTER A WITH MACRON AND GRAVE", [0x101, 0x300]],
    ["U+0646 U+06A9", "ARABIC SEQUENCE NOON WITH KEHEH", [0x646, 0x6A9]],
    ["U+0B95 U+0BCD U+0BB7 U+0BCD", "TAMIL CONSONANT KSS", [0xB95, 0xBCD, 0xBB7, 0xBCD]],
  ] as const)("uses the same exact inspector and explicit replacement from the point-list form: %s", async (query, name, points) => {
    await openSearch();
    const input = screen.getByLabelText("Find official named sequence by exact code-point list");
    expect(input).toHaveAttribute("maxlength", "512");
    const original = (screen.getByTestId("unicode-input") as HTMLTextAreaElement).value;
    fireEvent.change(input, { target: { value: query } });
    fireEvent.click(screen.getByRole("button", { name: "Look up exact sequence" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue(original);
    fireEvent.click(screen.getByRole("button", { name: `Inspect named sequence ${name}` }));
    expect(screen.getByTestId("unicode-input")).toHaveValue(original);
    const details = screen.getByTestId("unicode-sequence-details");
    const rows = within(details).getAllByTestId("unicode-sequence-scalar");
    expect(rows).toHaveLength(points.length);
    points.forEach((point, index) => {
      expect(rows[index].textContent).toContain(`U+${point.toString(16).toUpperCase().padStart(4, "0")}`);
      expect([...rows[index].querySelectorAll("div > p")].map(row => row.textContent)).toEqual(
        encodeUnicodeCE(String.fromCodePoint(point)).frames.map(frame =>
          `Ψ(${frame.wdm},${frame.oam},${frame.pol}) · ${unicodeCoordinateWavelength(frame)} nm`),
      );
    });
    expect(details).toHaveTextContent("DECODE ROUNDTRIP VERIFIED");
    fireEvent.click(within(details).getByRole("button", { name: "Replace preview with named sequence" }));
    const text = String.fromCodePoint(...points);
    expect(screen.getByTestId("unicode-input")).toHaveValue(text);
    fireEvent.click(screen.getByRole("button", { name: "Load encoded payload for decoding" }));
    expect(decodeUnicodeCE(JSON.parse((screen.getByTestId("unicode-payload") as HTMLTextAreaElement).value))).toBe(text);
  });
  it("reports invalid separately from no official match, recovers, and clears stale selections between modes", () => {
    const onUse = vi.fn();
    render(<UnicodeNamedSequenceSearch names={names} onUseSequence={onUse} />);
    const input = screen.getByLabelText("Find official named sequence by exact code-point list");
    const lookup = (value: string) => {
      fireEvent.change(input, { target: { value } });
      fireEvent.click(screen.getByRole("button", { name: "Look up exact sequence" }));
    };
    for (const value of ["", "U+D800", "U+110000", "U+0031 U+FE0F U+20E3 junk", "x".repeat(513), Array(33).fill("U+0041").join(" ")]) {
      lookup(value);
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid code-point list:");
      expect(screen.queryByTestId("unicode-sequence-lookup-results")).toBeNull();
    }
    for (const value of ["U+E000", "U+2603", "U+0031 U+20E3", "U+0061 U+0304 U+0300", "U+0300 U+0101"]) {
      lookup(value);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByRole("status")).toHaveTextContent("No official named sequence matches this exact code-point list");
      expect(within(screen.getByTestId("unicode-sequence-lookup-results")).queryAllByRole("button")).toHaveLength(0);
    }
    lookup("U+0031 U+FE0F U+20E3");
    fireEvent.click(screen.getByRole("button", { name: "Inspect named sequence KEYCAP DIGIT ONE" }));
    expect(screen.getByTestId("unicode-sequence-details")).toBeInTheDocument();
    submit(screen.getByLabelText("Search official named character sequences"), "ARABIC");
    expect(screen.queryByTestId("unicode-sequence-details")).toBeNull();
    expect(screen.queryByTestId("unicode-sequence-lookup-results")).toBeNull();
    lookup("U+0031 U+FE0F U+20E3");
    expect(screen.queryByTestId("unicode-sequence-results")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Inspect named sequence KEYCAP DIGIT ONE" }));
    lookup("U+DFFF");
    expect(screen.queryByTestId("unicode-sequence-details")).toBeNull();
    expect(onUse).not.toHaveBeenCalled();
  });
  it.each([
    ["KEYCAP DIGIT ONE", [0x31, 0xFE0F, 0x20E3]],
    ["LATIN SMALL LETTER A WITH MACRON AND GRAVE", [0x101, 0x300]],
    ["ARABIC SEQUENCE NOON WITH KEHEH", [0x646, 0x6A9]],
  ] as const)("shows every exact frame in logical order and replaces, never appends: %s", async (name, points) => {
    const input = await openSearch();
    fireEvent.click(screen.getByRole("button", { name: "Load encoded payload for decoding" }));
    fireEvent.click(screen.getByRole("button", { name: "Decode coordinates" }));
    expect(screen.getByTestId("unicode-decoded")).toBeInTheDocument();
    const original = (screen.getByTestId("unicode-input") as HTMLTextAreaElement).value;
    submit(input, name.toLowerCase());
    fireEvent.click(screen.getByRole("button", { name: `Inspect named sequence ${name}` }));
    expect(screen.getByTestId("unicode-input")).toHaveValue(original);
    const details = screen.getByTestId("unicode-sequence-details");
    const rows = within(details).getAllByTestId("unicode-sequence-scalar");
    expect(rows).toHaveLength(points.length);
    points.forEach((point, index) => {
      expect(rows[index].textContent).toContain(`U+${point.toString(16).toUpperCase().padStart(4, "0")}`);
      expect(rows[index].textContent).toContain(names.inspectUnicodeName(point).name);
      const frames = encodeUnicodeCE(String.fromCodePoint(point)).frames;
      expect([...rows[index].querySelectorAll("div > p")].map(row => row.textContent)).toEqual(
        frames.map(frame => `Ψ(${frame.wdm},${frame.oam},${frame.pol}) · ${unicodeCoordinateWavelength(frame)} nm`),
      );
    });
    expect(details.textContent).toContain("DECODE ROUNDTRIP VERIFIED");
    expect(within(details).queryByRole("button", { name: /Append symbol/ })).toBeNull();
    fireEvent.click(within(details).getByRole("button", { name: "Replace preview with named sequence" }));
    const text = String.fromCodePoint(...points);
    expect(screen.getByTestId("unicode-input")).toHaveValue(text);
    expect(screen.queryByTestId("unicode-decoded")).toBeNull();
    expect(screen.queryByTestId("unicode-script-context")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Load encoded payload for decoding" }));
    expect(decodeUnicodeCE(JSON.parse((screen.getByTestId("unicode-payload") as HTMLTextAreaElement).value))).toBe(text);
    fireEvent.click(screen.getByRole("button", { name: "Decode coordinates" }));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(text);
    expect(screen.getByRole("link", { name: "NamedSequences.txt" })).toHaveAttribute("href", "https://www.unicode.org/Public/17.0.0/ucd/NamedSequences.txt");
  });
  it("bounds rows, paginates, resets new searches and distinguishes empty input and no match", async () => {
    const input = await openSearch();
    expect(input).toHaveAttribute("maxlength", "120");
    submit(input, "LETTER");
    const results = screen.getByTestId("unicode-sequence-results");
    expect(within(results).getAllByRole("button")).toHaveLength(64);
    const first = results.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Next named sequence results" }));
    expect(results.textContent).not.toBe(first);
    fireEvent.click(screen.getByRole("button", { name: "Previous named sequence results" }));
    expect(results.textContent).toBe(first);
    fireEvent.click(screen.getByRole("button", { name: "Next named sequence results" }));
    submit(input, "KEYCAP DIGIT ONE");
    expect(screen.getByRole("button", { name: "Previous named sequence results" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next named sequence results" })).toBeDisabled();
    fireEvent.click(within(results).getByRole("button"));
    submit(input, "SNOWMAN");
    expect(within(results).queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("0 named sequence results for “SNOWMAN”")).toBeInTheDocument();
    expect(screen.queryByTestId("unicode-sequence-details")).toBeNull();
    submit(input, "  ");
    expect(screen.getByText("Enter an official named sequence name.")).toBeInTheDocument();
    // Single-scalar results do not get mixed into this list.
    fireEvent.change(screen.getByLabelText("Search official character names or aliases"), { target: { value: "KEYCAP DIGIT ONE" } });
    fireEvent.click(screen.getByRole("button", { name: "Search names" }));
    expect(within(screen.getByTestId("unicode-name-results")).queryAllByRole("button")).toHaveLength(0);
  });
  it.each([33, 513])("disables preview replacement beyond existing limits (%s scalars)", count => {
    const onUse = vi.fn();
    render(<UnicodeNamedSequenceSearch names={{ ...names,
      searchUnicodeNamedSequences: () => ({ total: 1, sequences: [{ name: "LIMIT FIXTURE", points: Array(count).fill(0x41) }] }),
    }} onUseSequence={onUse} />);
    submit(screen.getByLabelText("Search official named character sequences"), "LIMIT");
    fireEvent.click(screen.getByRole("button", { name: "Inspect named sequence LIMIT FIXTURE" }));
    const replace = screen.getByRole("button", { name: "Replace preview with named sequence" });
    expect(replace).toBeDisabled();
    fireEvent.click(replace);
    expect(onUse).not.toHaveBeenCalled();
  });
});
