import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UnicodeCoordinatePanel } from "./unicode-coordinate-panel";
import { UNICODE_SCRIPT_EXAMPLES } from "@shared/unicode-script-examples";
import * as catalogue from "@shared/unicode-catalogue";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("multilingual coordinate UI", () => {
  it.each(UNICODE_SCRIPT_EXAMPLES)("encodes and recovers $label without a server request", ({ label: name, text, context, reference, linguisticSource }) => {
    render(<UnicodeCoordinatePanel />);
    fireEvent.click(screen.getByRole("button", { name }));
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(text);
    expect(screen.getByTestId("unicode-counts").textContent).toContain("UTF-8 coordinate frames");
    expect(screen.getByTestId("unicode-script-context").textContent).toContain(context);
    expect(screen.getByRole("link", { name: "Unicode block reference" })).toHaveAttribute("href", reference);
    expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
    if (linguisticSource) {
      expect(screen.getByRole("link", { name: `Linguistic source: ${linguisticSource.label}` })).toHaveAttribute("href", linguisticSource.url);
    }
  });
  it("removes catalogue attribution when the user enters different text", () => {
    render(<UnicodeCoordinatePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sumerian cuneiform" }));
    expect(screen.getByTestId("unicode-script-context")).toBeTruthy();
    fireEvent.change(screen.getByTestId("unicode-input"), { target: { value: "custom text" } });
    expect(screen.queryByTestId("unicode-script-context")).toBeNull();
    expect(screen.getByRole("button", { name: "Sumerian cuneiform" })).toHaveAttribute("aria-pressed", "false");
  });
  it("clears old success when payload is changed and shows decoding errors", () => {
    render(<UnicodeCoordinatePanel />);
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded")).toBeTruthy();
    fireEvent.change(screen.getByTestId("unicode-payload"), { target: { value: '{"profile":"unknown","frames":[]}' } });
    expect(screen.queryByTestId("unicode-decoded")).toBeNull();
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByRole("alert").textContent).toContain("profile");
    expect(screen.getByTestId("unicode-input")).toHaveAttribute("maxlength", "512");
  });
  it("renders decoded markup as text rather than HTML", () => {
    const { container } = render(<UnicodeCoordinatePanel />);
    const text = '<img src=x onerror="alert(1)">';
    fireEvent.change(screen.getByTestId("unicode-input"), { target: { value: text } });
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(text);
    expect(container.querySelector("img")).toBeNull();
  });
  it("clears the default preview and can be used repeatedly without submitting a form", () => {
    const { container } = render(<UnicodeCoordinatePanel />);
    const clear = screen.getByRole("button", { name: "Clear preview" });
    expect(clear).toHaveAttribute("type", "button");
    expect(screen.getByTestId("unicode-input")).not.toHaveValue("");
    for (let i = 0; i < 2; i++) {
      fireEvent.click(clear);
      expect(screen.getByTestId("unicode-input")).toHaveValue("");
      expect(screen.getByTestId("unicode-counts")).toHaveTextContent("0 Unicode code points · 0 UTF-8 coordinate frames");
      expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
      expect(screen.queryByRole("alert")).toBeNull();
    }
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded")).toHaveTextContent("(empty text)");
  });
  it("clears example attribution and decoded success without changing the payload editor", () => {
    render(<UnicodeCoordinatePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sumerian cuneiform" }));
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded")).toBeTruthy();
    const payload = (screen.getByTestId("unicode-payload") as HTMLTextAreaElement).value;
    fireEvent.click(screen.getByRole("button", { name: "Clear preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue("");
    expect(screen.queryByTestId("unicode-script-context")).toBeNull();
    expect(screen.getByRole("button", { name: "Sumerian cuneiform" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("unicode-decoded")).toBeNull();
    expect(screen.getByTestId("unicode-payload")).toHaveValue(payload);
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded")).toHaveTextContent(UNICODE_SCRIPT_EXAMPLES.find(entry => entry.label === "Sumerian cuneiform")!.text);
    expect(screen.getByTestId("unicode-input")).toHaveValue("");
  });
  it("clears a decoding error without deleting the invalid payload", () => {
    render(<UnicodeCoordinatePanel />);
    fireEvent.change(screen.getByTestId("unicode-payload"), { target: { value: "invalid JSON" } });
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-error")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear preview" }));
    expect(screen.queryByTestId("unicode-error")).toBeNull();
    expect(screen.getByTestId("unicode-payload")).toHaveValue("invalid JSON");
  });
  it("keeps the catalogue open and appends a new sequence from an empty preview", () => {
    render(<UnicodeCoordinatePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
    fireEvent.change(screen.getByLabelText("Code point lookup"), { target: { value: "U+13000" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up code point" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear preview" }));
    expect(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    expect(screen.getByTestId("unicode-input")).toHaveValue("𓀀");
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    expect(screen.getByTestId("unicode-decoded").textContent).toBe("𓀀");
  });
});

describe("whole-preview reference", () => {
  const copyButton = () => screen.getByRole("button", { name: "Copy whole-preview reference" });
  const changeText = (value: string) => fireEvent.change(screen.getByTestId("unicode-input"), { target: { value } });
  async function ready(writeText = vi.fn().mockResolvedValue(undefined)) {
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<UnicodeCoordinatePanel />);
    await waitFor(() => expect(copyButton()).toBeEnabled());
    return writeText;
  }
  // Independent byte oracle: do not compare one encoder invocation to another.
  const frames = (text: string) => [...new TextEncoder().encode(text)]
    .map(byte => ({ wdm: byte & 127, oam: byte >>> 7, pol: "H" }));

  it("copies all scalars past the table limit, preserving repetition, combining marks and logical bidi order", async () => {
    const fetch = vi.fn(() => { throw new Error("No backend calls allowed"); });
    vi.stubGlobal("fetch", fetch);
    const write = await ready();
    const text = "\uFEFF" + "A".repeat(33) + "e\u0301\u2067שָׁ العربية\u2069𓀀𓀀𝄞";
    changeText(text);
    fireEvent.click(screen.getByTestId("unicode-load-payload"));
    fireEvent.click(screen.getByTestId("unicode-decode"));
    const payloadText = (screen.getByTestId("unicode-payload") as HTMLTextAreaElement).value;
    expect(copyButton()).toHaveAttribute("type", "button");
    fireEvent.click(copyButton());
    await screen.findByText("Whole-preview reference copied.");
    const reference = JSON.parse(write.mock.calls[0][0]);
    expect(reference.unicodeVersion).toBe("17.0.0");
    expect(reference.unicodeSource).toBe("https://www.unicode.org/Public/17.0.0/ucd/");
    expect(reference.text).toBe(text);
    expect(reference.scalars.map((scalar: { character: string }) => scalar.character)).toEqual([...text]);
    const names = await catalogue.loadUnicodeNames();
    reference.scalars.forEach((scalar: Record<string, unknown>, index: number) => {
      const character = [...text][index];
      const details = catalogue.inspectCodePoint(character.codePointAt(0)!);
      const name = names.inspectUnicodeName(details.point);
      expect(scalar).toEqual({
        index: index + 1, character, codePoint: details.label,
        officialName: name.name, controlLabel: name.controlLabel, aliases: name.aliases,
        assignmentStatus: details.status, generalCategory: details.category,
        script: details.script, block: details.block, frames: frames(character),
      });
    });
    expect(reference.scalars.flatMap((scalar: { frames: unknown[] }) => scalar.frames)).toEqual(frames(text));
    expect(reference.payload).toEqual({ profile: "ce-utf8-coordinate-v1", frames: frames(text) });
    expect(reference.payload).toEqual(JSON.parse(payloadText));
    expect(screen.getByTestId("unicode-payload")).toHaveValue(payloadText);
    expect(screen.getByTestId("unicode-decoded").textContent).toBe(text);
    expect(screen.getByTestId("unicode-input")).toHaveValue(text);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exports unnamed scalars honestly, with control labels and aliases separate from names", async () => {
    const write = await ready();
    changeText("\0\uE000\u0378\u{10FFFF}");
    fireEvent.click(copyButton());
    await screen.findByText("Whole-preview reference copied.");
    const { scalars } = JSON.parse(write.mock.calls[0][0]);
    expect(scalars.map((s: { officialName: unknown }) => s.officialName)).toEqual([null, null, null, null]);
    expect(scalars.map((s: { assignmentStatus: string }) => s.assignmentStatus))
      .toEqual(["assigned", "private-use", "unassigned", "noncharacter"]);
    expect(scalars[0].controlLabel).toBe("<control>");
    expect(scalars[0].aliases).toEqual([{ name: "NULL", type: "control" }, { name: "NUL", type: "abbreviation" }]);
    expect(scalars.slice(1).every((s: { aliases: unknown[] }) => s.aliases.length === 0)).toBe(true);
  });

  it("copies an empty preview and refuses malformed surrogate input", async () => {
    const write = await ready();
    fireEvent.click(screen.getByRole("button", { name: "Clear preview" }));
    fireEvent.click(copyButton());
    await screen.findByText("Whole-preview reference copied.");
    expect(JSON.parse(write.mock.calls[0][0])).toMatchObject({
      text: "", scalars: [], payload: { profile: "ce-utf8-coordinate-v1", frames: [] },
    });
    changeText("\uD800");
    expect(copyButton()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Unpaired Unicode surrogate");
    expect(screen.queryByText("Whole-preview reference copied.")).toBeNull();
    expect(write).toHaveBeenCalledOnce();
  });

  it.each(["denied", "unavailable"])("reports %s clipboard access and allows retry without changing the preview", async failure => {
    const write = await ready(vi.fn().mockRejectedValue(new Error("Denied")));
    changeText("e\u0301𓀀");
    if (failure === "unavailable") vi.stubGlobal("navigator", {});
    fireEvent.click(copyButton());
    await screen.findByText(/Could not copy whole-preview reference/);
    vi.stubGlobal("navigator", { clipboard: { writeText: write.mockResolvedValue(undefined) } });
    fireEvent.click(copyButton());
    await screen.findByText("Whole-preview reference copied.");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("unicode-input")).toHaveValue("e\u0301𓀀");
  });

  it.each(["edit", "example", "clear", "replace", "append", "unmount"])("ignores a stale pending clipboard completion after %s", async action => {
    let finish!: () => void;
    await ready(vi.fn(() => new Promise<void>(resolve => { finish = resolve; })));
    if (action === "replace" || action === "append") {
      fireEvent.click(screen.getByRole("button", { name: "Browse Unicode writing-system catalogue" }));
      fireEvent.change(screen.getByLabelText("Code point lookup"), { target: { value: "13000" } });
      fireEvent.click(screen.getByRole("button", { name: "Look up code point" }));
    }
    fireEvent.click(copyButton());
    expect(copyButton()).toBeDisabled();
    if (action === "edit") changeText("new");
    if (action === "example") fireEvent.click(screen.getByRole("button", { name: "Sumerian cuneiform" }));
    if (action === "clear") fireEvent.click(screen.getByRole("button", { name: "Clear preview" }));
    if (action === "replace") fireEvent.click(screen.getByRole("button", { name: "Use symbol in preview" }));
    if (action === "append") fireEvent.click(screen.getByRole("button", { name: "Append symbol to preview" }));
    if (action === "unmount") cleanup();
    await act(async () => { finish(); });
    expect(screen.queryByText("Whole-preview reference copied.")).toBeNull();
    if (action !== "unmount") expect(copyButton()).toBeEnabled();
  });

  it("waits for pinned names and supports retry after a local metadata load failure", async () => {
    const names = await catalogue.loadUnicodeNames();
    let finish!: (value: typeof names) => void;
    vi.spyOn(catalogue, "loadUnicodeNames")
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockRejectedValueOnce(new Error("Local chunk unavailable"))
      .mockResolvedValue(names);
    render(<UnicodeCoordinatePanel />);
    expect(copyButton()).toBeDisabled();
    await act(async () => { finish(names); });
    expect(copyButton()).toBeEnabled();
    cleanup();
    render(<UnicodeCoordinatePanel />);
    await screen.findByRole("button", { name: "Retry preview reference metadata" });
    expect(copyButton()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry preview reference metadata" }));
    await waitFor(() => expect(copyButton()).toBeEnabled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
