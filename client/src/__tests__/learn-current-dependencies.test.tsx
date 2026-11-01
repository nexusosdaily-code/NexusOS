// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CollectionWorkspace from "../components/collection-workspace";
import { MAP_PROFILE } from "../../../shared/wls-map-vm";

afterEach(cleanup);
describe("current dependency usability", () => {
  it("links the complete public disclosure", () => {
    render(<CollectionWorkspace profile={MAP_PROFILE} />);
    expect(screen.getByRole("link", { name: /working dependency packages/i }).getAttribute("href"))
      .toBe("/wavelengthscript-dependencies.html");
  });
  it.each([
    ["0.10.0", "map.hasValue", true],
    ["0.11.0", "map.replaceValue", { entries: [["b", "z"], ["a", "y"], ["", "z"]] }],
    ["0.12.0", "map.findLastKeyByValueOrDefault", ""],
    ["0.13.0", "map.valueAt", "x"],
    ["0.14.0", "map.indexOfKey", 0],
    ["0.15.0", "map.slice", { entries: [["a", "y"]] }],
    ["0.16.0", "map.renameKeyIfAbsent", { entries: [["b", "x"], ["Ψ", "y"], ["c", "z"]] }],
    ["0.16.0", "set.replaceIfAbsent", { entries: [["b", ""], ["Ψ", ""], ["c", ""]] }],
    ["0.17.0", "map.swapValues", { entries: [["b", "z"], ["a", "y"], ["c", "x"]] }],
    ["0.17.0", "set.toggle", { entries: [["b", ""], ["c", ""]] }],
    ["0.18.0", "map.moveToEnd", { entries: [["b", "x"], ["c", "z"], ["a", "y"]] }],
    ["0.18.0", "set.moveToEnd", { entries: [["b", ""], ["c", ""], ["a", ""]] }],
    ["0.19.0", "map.moveToFront", { entries: [["a", "y"], ["b", "x"], ["c", "z"]] }],
    ["0.19.0", "set.moveToFront", { entries: [["a", ""], ["b", ""]] }],
    ["0.20.0", "map.takeWhileValue", { entries: [["a", "x"], ["b", "x"]] }],
    ["0.20.0", "map.dropWhileValue", { entries: [["c", "y"], ["d", "x"]] }],
    ["0.21.0", "map.takeLast", { entries: [["b", "y"], ["c", "z"]] }],
    ["0.21.0", "set.takeLast", { entries: [["b", ""]] }],
    ["0.22.0", "map.dropLast", { entries: [["a", "x"]] }],
    ["0.22.0", "set.dropLast", { entries: [["a", ""]] }],
    ["0.23.0", "map.indexOfValue", 0],
    ["0.23.0", "map.lastIndexOfValue", 2],
    ["0.24.0", "map.countCommonKeys", 2],
    ["0.24.0", "map.countMatchingEntries", 1],
    ["0.25.0", "map.countDistinctValues", 2],
    ["0.25.0", "map.hasDuplicateValues", true],
    ["0.26.0", "map.deleteFirstValue", { entries: [["b", "y"], ["c", "x"]] }],
    ["0.26.0", "map.deleteLastValue", { entries: [["a", "x"], ["b", "y"]] }],
    ["0.27.0", "set.intersectionSize", 1],
    ["0.27.0", "set.unionSize", 3],
    ["0.28.0", "set.differenceSize", 1],
    ["0.28.0", "set.symmetricDifferenceSize", 2],
    ["0.29.0", "map.mergeIfAbsent", { entries: [["a", "x"], ["b", "y"], ["c", "q"]] }],
    ["0.29.0", "map.mergeExisting", { entries: [["a", "z"], ["b", "y"]] }],
    ["0.30.0", "map.replaceEntryIfValue", { entries: [["a", "z"], ["b", "y"]] }],
    ["0.30.0", "map.deleteEntryIfValue", { entries: [["a", "x"]] }],
  ] as const)("offers and actually executes %s examples", (version, program, expected) => {
    render(<CollectionWorkspace profile={MAP_PROFILE} />);
    const group = screen.getByRole("group", { name: `Native Map and Set examples · local wls.collections ${version}` });
    const option = group.querySelector(`option[value="${program}"]`)! as HTMLOptionElement;
    expect(option).not.toBeNull();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: option.value } });
    fireEvent.click(screen.getByRole("button", { name: "Execute" }));
    expect(screen.queryByTestId("collection-error")).toBeNull();
    expect(JSON.parse(screen.getByTestId("collection-output").textContent!)).toEqual(expected);
  });
});
