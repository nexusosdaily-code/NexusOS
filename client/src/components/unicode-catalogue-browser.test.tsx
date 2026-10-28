import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { UnicodeCoordinatePanel } from "./unicode-coordinate-panel";
import * as catalogue from "@shared/unicode-catalogue";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function openCatalogue() {
  render(<UnicodeCoordinatePanel />);
  fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
}
function lookup(value: string) {
  fireEvent.change(screen.getByLabelText("Code point lookup"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Look up code point" }));
}

describe("Unicode catalogue browser", () => {
  async function readyToCopy(point: string) {
    openCatalogue();
    lookup(point);
    const button = screen.getByRole("button", { name: "Copy character details" });
    await waitFor(() => expect(button).toBeEnabled());
    return button;
  }
  function clipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    return writeText;
  }
  it("copies a pinned supplementary reference with exact ordered frames, leaving preview and decode intact", async () => {
    const write = clipboard();
    const button = await readyToCopy("13000");
    const preview = "שָׁe\u0301𓀀";
    fireEvent.change(screen.getByTestId("unicode-input"), { target: { value: preview } });
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    fireEvent.click(button);
    await screen.findByText("Character details copied for U+13000.");
    expect(write).toHaveBeenCalledExactlyOnceWith([
      "Unicode 17.0.0",
      "Code point: U+13000",
      "Official name: EGYPTIAN HIEROGLYPH A001",
      "Official aliases (typed separately; not character names):",
      "None",
      "Assignment status: assigned in this catalogue",
      "General category: Lo",
      "Script property: Egyptian Hieroglyphs",
      "Block: Egyptian Hieroglyphs",
      "Exact software coordinate frame(s), in order:",
      "1. Ψ(112,1,H) · 730 nm",
      "2. Ψ(19,1,H) · 439.375 nm",
      "3. Ψ(0,1,H) · 380 nm",
      "4. Ψ(0,1,H) · 380 nm",
      "UTF-8 coordinate data only. No normalization, language inference, translation, or decipherment is performed.",
    ].join("\n"));
    expect(screen.getByTestId("unicode-input")).toHaveValue(preview);
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(preview);
  });
  it.each([
    ["0000", "assigned", "Cc"],
    ["E000", "private-use", "Co"],
    ["0378", "unassigned", "Cn"],
    ["10FFFF", "noncharacter", "Cn"],
  ])("copies %s without inventing a character name", async (point, status, category) => {
    const write = clipboard();
    fireEvent.click(await readyToCopy(point));
    await waitFor(() => expect(write).toHaveBeenCalledOnce());
    const text = write.mock.calls[0][0] as string;
    expect(text).toContain("Official name: No Unicode character name\n");
    expect(text).toContain(`Assignment status: ${status}`);
    expect(text).toContain(`General category: ${category}`);
    if (point === "0000") {
      expect(text).toContain("Control label: <control> (not a character name)");
      expect(text).toContain("- NULL (control)");
      expect(text).toContain("- NUL (abbreviation)");
    } else {
      expect(text).toContain("outside the assigned-character catalogue");
      expect(text).not.toContain("Control label:");
    }
  });
  it("keeps alternate and abbreviation aliases separate from the exact official name", async () => {
    const write = clipboard();
    fireEvent.click(await readyToCopy("FEFF"));
    await waitFor(() => expect(write).toHaveBeenCalledOnce());
    expect(write.mock.calls[0][0]).toContain("Official name: ZERO WIDTH NO-BREAK SPACE\n");
    expect(write.mock.calls[0][0]).toContain("- BYTE ORDER MARK (alternate)");
    expect(write.mock.calls[0][0]).toContain("- BOM (abbreviation)");
  });
  it.each(["unavailable", "denied"])("visibly reports %s clipboard access and permits retry", async failure => {
    const write = clipboard(vi.fn().mockRejectedValue(new Error("Denied")));
    if (failure === "unavailable") vi.stubGlobal("navigator", {});
    const button = await readyToCopy("41");
    const preview = (screen.getByTestId("unicode-input") as HTMLTextAreaElement).value;
    expect(screen.queryByLabelText("Character details for manual copying")).toBeNull();
    expect(write).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect((await screen.findByRole("alert")).textContent).toContain("Could not copy character details");
    expect(screen.getByTestId("unicode-input")).toHaveValue(preview);
    const manual = await screen.findByLabelText("Character details for manual copying") as HTMLTextAreaElement;
    expect(manual).toHaveAttribute("readonly");
    expect(manual).toHaveAttribute("dir", "ltr");
    const text = manual.value;
    const attempts = write.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Select reference text" }));
    expect(manual).toHaveFocus();
    expect(manual.value.slice(manual.selectionStart, manual.selectionEnd)).toBe(text);
    expect(write).toHaveBeenCalledTimes(attempts);
    clipboard(write.mockResolvedValue(undefined));
    fireEvent.click(button);
    await screen.findByText("Character details copied for U+0041.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByLabelText("Character details for manual copying")).toBeNull();
    expect(write).toHaveBeenLastCalledWith(text);
    lookup("42");
    expect(screen.queryByText("Character details copied for U+0041.")).toBeNull();
  });
  it.each(["13000", "0301", "0000", "FEFF", "E000", "0378", "10FFFF"])(
    "offers the identical reference manually for %s and clears it when inspection changes", async point => {
      const write = clipboard(vi.fn().mockRejectedValue(new Error("Denied")));
      const button = await readyToCopy(point);
      fireEvent.click(button);
      const manual = await screen.findByLabelText("Character details for manual copying");
      expect(manual).toHaveValue(write.mock.calls[0][0]);
      lookup("42");
      expect(screen.queryByLabelText("Character details for manual copying")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(write).toHaveBeenCalledOnce();
    },
  );
  it("ignores a stale clipboard rejection after the selected character changes", async () => {
    let reject!: (error: Error) => void;
    clipboard(vi.fn(() => new Promise<void>((_, fail) => { reject = fail; })));
    fireEvent.click(await readyToCopy("41"));
    lookup("42");
    await act(async () => { reject(new Error("Denied")); });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByLabelText("Character details for manual copying")).toBeNull();
  });
  it("does not report an old pending copy as success on a newly inspected character", async () => {
    let finish!: () => void;
    clipboard(vi.fn(() => new Promise<void>(resolve => { finish = resolve; })));
    const button = await readyToCopy("41");
    fireEvent.click(button);
    expect(button).toBeDisabled();
    lookup("42");
    await act(async () => { finish(); });
    expect(screen.queryByText(/Character details copied/)).toBeNull();
    expect(button).toBeEnabled();
  });
  it("disables copying until name data loads, including after failure and retry", async () => {
    let resolveNames!: (value: Awaited<ReturnType<typeof catalogue.loadUnicodeNames>>) => void;
    const actualNames = await catalogue.loadUnicodeNames();
    vi.spyOn(catalogue, "loadUnicodeNames")
      .mockResolvedValueOnce(actualNames) // Whole-preview metadata loads independently.
      .mockImplementationOnce(() => new Promise(resolve => { resolveNames = resolve; }))
      .mockResolvedValueOnce(actualNames)
      .mockRejectedValueOnce(new Error("Fixture load failure"))
      .mockResolvedValue(actualNames);
    openCatalogue(); lookup("41");
    expect(screen.getByRole("button", { name: "Copy character details" })).toBeDisabled();
    await act(async () => { resolveNames(actualNames); });
    expect(screen.getByRole("button", { name: "Copy character details" })).toBeEnabled();
    cleanup();
    openCatalogue(); lookup("0000");
    await screen.findByRole("button", { name: "Retry name loading" });
    expect(screen.getByRole("button", { name: "Copy character details" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry name loading" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copy character details" })).toBeEnabled());
  });
  it("searches block/script properties and paginates only assigned points", () => {
    openCatalogue();
    expect(screen.getByRole("button", { name: "Previous characters" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Search blocks or writing systems"), { target: { value: "Greek" } });
    expect(screen.getByTestId("unicode-block-count").textContent).toContain("Greek and Coptic");
    const grid = screen.getByTestId("unicode-catalogue-grid");
    expect(within(grid).getAllByRole("button")).toHaveLength(64);
    expect(within(grid).queryByRole("button", { name: "Inspect U+0378" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next characters" }));
    expect(within(grid).queryByRole("button", { name: "Inspect U+0370" })).toBeNull();
    expect(screen.getByRole("button", { name: "Previous characters" })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText("Search blocks or writing systems"), { target: { value: "Egyptian Hieroglyphs" } });
    fireEvent.change(screen.getByLabelText("Unicode block"), { target: { value: "Egyptian Hieroglyphs" } });
    fireEvent.click(screen.getByRole("button", { name: "Inspect U+13000" }));
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("Egyptian Hieroglyphs");
    expect(screen.getByRole("button", { name: "Previous characters" })).toBeDisabled();
  });
  it("retains font-independent labels, source references and a supplementary golden vector", () => {
    openCatalogue();
    lookup("U+13000");
    const details = screen.getByTestId("unicode-point-details");
    expect(within(details).getByRole("heading").textContent).toBe("U+13000");
    expect(within(details).getByRole("heading")).toHaveAttribute("dir", "ltr");
    expect(details.querySelector("bdi")?.textContent).toBe("𓀀");
    expect(details.textContent).toContain("Ψ(112,1,H)");
    expect(details.textContent).toContain("Ψ(19,1,H)");
    expect(details.textContent?.match(/Ψ\(0,1,H\)/g)).toHaveLength(2);
    expect(details.textContent).toContain("DECODE ROUNDTRIP VERIFIED");
    expect(screen.getByRole("link", { name: "Blocks.txt" })).toHaveAttribute("href", "https://www.unicode.org/Public/17.0.0/ucd/Blocks.txt");
    expect(screen.getByRole("link", { name: "Scripts.txt" })).toHaveAttribute("href", "https://www.unicode.org/Public/17.0.0/ucd/Scripts.txt");
    expect(screen.getByRole("link", { name: "DerivedGeneralCategory.txt" })).toHaveAttribute("href", "https://www.unicode.org/Public/17.0.0/ucd/extracted/DerivedGeneralCategory.txt");
  });
  it.each([["0378", "unassigned"], ["E000", "private-use"], ["10FFFF", "noncharacter"]])(
    "labels lookup %s as %s, not an assigned character", (input, status) => {
      openCatalogue(); lookup(input);
      const details = screen.getByTestId("unicode-point-details");
      expect(details.textContent).toContain(`${status} · outside the assigned-character catalogue`);
      expect(screen.queryByRole("button", { name: "Use symbol in preview" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Append symbol to preview" })).toBeNull();
      expect(details.textContent).toContain("DECODE ROUNDTRIP VERIFIED");
    },
  );
  it("reports no results and empty/private/surrogate blocks without inventing characters", () => {
    openCatalogue();
    const search = screen.getByLabelText("Search blocks or writing systems");
    fireEvent.change(search, { target: { value: "not a writing system" } });
    expect(screen.getByTestId("unicode-block-count").textContent).toBe("No matching blocks");
    expect(screen.queryByTestId("unicode-catalogue-grid")).toBeNull();
    fireEvent.change(search, { target: { value: "" } });
    for (const name of ["Private Use Area", "High Surrogates"]) {
      fireEvent.change(screen.getByLabelText("Unicode block"), { target: { value: name } });
      expect(screen.getByTestId("unicode-block-count").textContent).toContain("0 assigned characters");
      expect(screen.queryByTestId("unicode-catalogue-grid")).toBeNull();
      expect(screen.getByRole("button", { name: "Next characters" })).toBeDisabled();
    }
  });
  it.each(["D800", "DFFF", "U+110000", "13xxx", ""])("rejects invalid lookup %j, then recovers", input => {
    openCatalogue(); lookup("41"); lookup(input);
    expect(screen.getByTestId("unicode-lookup-error")).toHaveAttribute("role", "alert");
    expect(screen.queryByTestId("unicode-point-details")).toBeNull();
    lookup("U+0301");
    expect(screen.queryByTestId("unicode-lookup-error")).toBeNull();
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("Inherited");
    expect(screen.getByTestId("unicode-point-details").textContent).toContain("Mn");
  });
  it("replaces the preview with the exact scalar and clears stale success/context", () => {
    openCatalogue();
    fireEvent.click(screen.getByRole("button", { name: "Hebrew" }));
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded")).toBeTruthy();
    lookup("0301");
    fireEvent.click(screen.getByRole("button", { name: "Use symbol in preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue("\u0301");
    expect(screen.queryByTestId("unicode-decoded")).toBeNull();
    expect(screen.queryByTestId("unicode-script-context")).toBeNull();
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe("\u0301");
  });
  it("preserves combining marks and bidi logical table order without normalisation", () => {
    openCatalogue();
    const text = "שָׁe\u0301𓀀";
    fireEvent.change(screen.getByTestId("unicode-input"), { target: { value: text } });
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map(row => within(row).getAllByRole("cell")[1].textContent)).toEqual([
      "U+05E9", "U+05B8", "U+05C1", "U+0065", "U+0301", "U+13000",
    ]);
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(text);
  });
  it("appends chosen scalars in exact logical order and recovers the whole sequence", () => {
    openCatalogue();
    fireEvent.change(screen.getByTestId("unicode-input"), { target: { value: "" } });
    for (const point of ["05E9", "05B8", "05C1", "0065", "0301", "13000", "13000"]) {
      lookup(point);
      fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    }
    const text = "שָׁe\u0301𓀀𓀀";
    expect(screen.getByTestId("unicode-input")).toHaveValue(text);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map(row => within(row).getAllByRole("cell")[1].textContent)).toEqual([
      "U+05E9", "U+05B8", "U+05C1", "U+0065", "U+0301", "U+13000", "U+13000",
    ]);
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(text);
  });
  it("clears stale decoded success, errors and example attribution on append", () => {
    openCatalogue();
    fireEvent.click(screen.getByRole("button", { name: "Hebrew" }));
    const original = (screen.getByTestId("unicode-input") as HTMLTextAreaElement).value;
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    lookup("0301");
    fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue(original + "\u0301");
    expect(screen.queryByTestId("unicode-decoded")).toBeNull();
    expect(screen.queryByTestId("unicode-script-context")).toBeNull();
    expect(screen.getByRole("button", { name: "Hebrew" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.change(screen.getByTestId("unicode-payload"), { target: { value: "invalid" } });
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-error")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    expect(screen.queryByTestId("unicode-error")).toBeNull();
    expect(screen.getByTestId("unicode-input")).toHaveValue(original + "\u0301\u0301");
  });
  it.each([
    [510, "13000", "𓀀", true],
    [511, "13000", "𓀀", false],
    [511, "0301", "\u0301", true],
    [512, "0042", "B", false],
    [512, "13000", "𓀀", false],
  ])("checks the whole scalar at %i units with U+%s", (length, point, character, fits) => {
    openCatalogue();
    const original = "a".repeat(length);
    fireEvent.change(screen.getByTestId("unicode-input"), { target: { value: original } });
    lookup(point);
    const append = screen.getByRole("button", { name: "Append symbol to preview" });
    expect(append).toHaveProperty("disabled", !fits);
    fireEvent.click(append);
    const expected = fits ? original + character : original;
    expect(screen.getByTestId("unicode-input")).toHaveValue(expected);
    if (!fits) expect(screen.getByText(/This symbol needs/).textContent).toContain("512-unit preview");
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(expected);
    // Replacement remains available even when append cannot fit.
    fireEvent.click(screen.getByRole("button", { name: "Use symbol in preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue(character);
    expect(screen.getByRole("button", { name: "Append symbol to preview" })).not.toBeDisabled();
  });
});
