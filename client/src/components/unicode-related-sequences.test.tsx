import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { UnicodeCoordinatePanel } from "./unicode-coordinate-panel";
import { searchUnicodeNamedSequencesContaining } from "@shared/unicode-character-names";
import { decodeUnicodeCE } from "@shared/unicode-ce";

afterEach(cleanup);
const findLabel = "Find official named sequences containing this scalar";
function lookup(value: string) {
  fireEvent.change(screen.getByLabelText("Code point lookup"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Look up code point" }));
}
async function openRelated(point: string) {
  render(<UnicodeCoordinatePanel />);
  fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
  await screen.findByLabelText("Search official named character sequences");
  lookup(point);
  expect(screen.queryByRole("region", { name: `Official named sequences containing U+${point}` })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: findLabel }));
  return screen.getByRole("region", { name: `Official named sequences containing U+${point}` });
}

describe("exact related official named sequences", () => {
  it.each([
    ["0300", "LATIN SMALL LETTER A WITH MACRON AND GRAVE", [0x101, 0x300]],
    ["FE0F", "KEYCAP DIGIT ONE", [0x31, 0xFE0F, 0x20E3]],
    ["20E3", "KEYCAP DIGIT ONE", [0x31, 0xFE0F, 0x20E3]],
    ["0646", "ARABIC SEQUENCE NOON WITH KEHEH", [0x646, 0x6A9]],
  ] as const)("discovers from %s without changing text, then replaces with exact ordered sequence", async (point, name, points) => {
    const related = await openRelated(point);
    const preview = screen.getByTestId("unicode-input");
    fireEvent.change(preview, { target: { value: "Existing e\u0301𓀀" } });
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    fireEvent.click(within(related).getByRole("button", { name: `Inspect named sequence ${name}` }));
    expect(preview).toHaveValue("Existing e\u0301𓀀");
    expect(screen.getByTestId("unicode-decoded")).toBeInTheDocument();
    const details = within(related).getByTestId("unicode-sequence-details");
    expect(within(details).getByRole("heading", { name: `Named sequence: ${name}` })).toBeInTheDocument();
    expect(within(details).getAllByTestId("unicode-sequence-scalar").map(row => row.textContent?.match(/U\+[0-9A-F]+/)?.[0]))
      .toEqual(points.map(p => `U+${p.toString(16).toUpperCase().padStart(4, "0")}`));
    expect(within(details).queryByRole("button", { name: /Append/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Append symbol to preview" })).toBeEnabled();
    fireEvent.click(within(details).getByRole("button", { name: "Replace preview with named sequence" }));
    const exact = String.fromCodePoint(...points);
    expect(preview).toHaveValue(exact);
    expect(screen.queryByTestId("unicode-decoded")).toBeNull();
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    expect(decodeUnicodeCE(JSON.parse((screen.getByTestId("unicode-payload") as HTMLTextAreaElement).value))).toBe(exact);
    fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    expect(preview).toHaveValue(exact + String.fromCodePoint(parseInt(point, 16)));
  });
  it("paginates actual membership in bounded pages and clears old results when the inspected scalar changes", async () => {
    const related = await openRelated("17D2");
    const results = within(related).getByTestId("unicode-sequence-results");
    const expected = searchUnicodeNamedSequencesContaining(0x17D2, 0, 64);
    const labels = () => within(results).getAllByRole("button").map(button => button.getAttribute("aria-label"));
    expect(labels()).toEqual(expected.sequences.slice(0, 16).map(sequence => `Inspect named sequence ${sequence.name}`));
    expect(within(related).getByRole("button", { name: "Previous named sequence results" })).toBeDisabled();
    fireEvent.click(within(results).getAllByRole("button")[0]);
    fireEvent.click(within(related).getByRole("button", { name: "Next named sequence results" }));
    expect(labels()).toEqual(expected.sequences.slice(16, 32).map(sequence => `Inspect named sequence ${sequence.name}`));
    fireEvent.click(within(related).getByRole("button", { name: "Next named sequence results" }));
    expect(labels()).toEqual(expected.sequences.slice(32).map(sequence => `Inspect named sequence ${sequence.name}`));
    expect(within(related).getByRole("button", { name: "Next named sequence results" })).toBeDisabled();
    fireEvent.click(within(related).getByRole("button", { name: "Previous named sequence results" }));
    expect(labels()).toEqual(expected.sequences.slice(16, 32).map(sequence => `Inspect named sequence ${sequence.name}`));
    lookup("FE0F");
    expect(screen.queryByTestId("unicode-sequence-details")).toBeNull();
    expect(screen.queryByRole("region", { name: /Official named sequences containing/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: findLabel }));
    const next = screen.getByRole("region", { name: "Official named sequences containing U+FE0F" });
    expect(within(next).getAllByRole("button", { name: /Inspect named sequence/ })).toHaveLength(12);
    expect(within(next).getByRole("button", { name: "Previous named sequence results" })).toBeDisabled();
    expect(within(next).queryByTestId("unicode-sequence-details")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hide related named sequences" }));
    expect(screen.queryByRole("region", { name: /Official named sequences containing/ })).toBeNull();
  });
  it("reports no approved matches without inventing a combination or altering preview", async () => {
    const related = await openRelated("13000");
    const original = (screen.getByTestId("unicode-input") as HTMLTextAreaElement).value;
    expect(within(related).getByRole("status")).toHaveTextContent("No official named sequences in this pinned catalogue contain U+13000.");
    expect(within(related).queryAllByRole("button", { name: /Inspect named sequence/ })).toHaveLength(0);
    expect(within(related).getByRole("button", { name: "Next named sequence results" })).toBeDisabled();
    expect(within(related).getByRole("button", { name: "Previous named sequence results" })).toBeDisabled();
    expect(screen.getByTestId("unicode-input")).toHaveValue(original);
  });
});
