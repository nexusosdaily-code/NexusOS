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
