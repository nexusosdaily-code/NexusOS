import { expect, it } from "vitest";
import { CollectionVMError, executeCollection } from "../../../shared/wls-collection-vm";
import { executeMap } from "../../../shared/wls-map-vm";
import { getCollectionProgramSource } from "../../../shared/wls-library";

it("rejects list input and element accessors without calling host getters", () => {
  let calls = 0;
  const items = Object.defineProperty(["safe"], "0", { get() { calls++; return "unsafe"; } });
  const record = Object.defineProperty({}, "items", { get() { calls++; return []; } });
  const source = getCollectionProgramSource("recipient.count");
  for (const inputs of [record, { items }]) {
    expect(() => executeCollection(source, inputs)).toThrow(CollectionVMError);
  }
  expect(calls).toBe(0);
});
it.each(["map.intersection", "map.difference", "set.intersection", "set.difference"])(
  "validates the right operand even when the left is empty for %s", id => {
    const source = getCollectionProgramSource(id);
    for (const right of [false, "", 0]) {
      expect(() => executeMap(source, { left: { entries: [] }, right })).toThrow(CollectionVMError);
    }
    expect(() => executeMap(source, { left: { entries: [] } })).toThrow(CollectionVMError);
  },
);
it("validates removal queries even for empty lists", () => {
  const source = getCollectionProgramSource("recipient.remove");
  expect(() => executeCollection(source, { items: [], value: false })).toThrow(CollectionVMError);
  expect(() => executeCollection(source, { items: [] })).toThrow(CollectionVMError);
  expect(executeCollection(source, { items: [], value: "" }).value).toEqual([]);
});
