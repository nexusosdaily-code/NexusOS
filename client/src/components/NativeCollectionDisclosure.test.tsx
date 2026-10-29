import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { NativeCollectionDisclosure } from "./NativeCollectionDisclosure";

afterEach(cleanup);

it("discloses the executable recipient pilot and its host boundary", () => {
  render(<NativeCollectionDisclosure />);
  const text = screen.getByTestId("native-collection-disclosure").textContent!;
  expect(screen.getByRole("heading", { name: "WavelengthScript in live broadcasting" })).toBeTruthy();
  for (const phrase of ["29 October 2026", "WLS-COLLECTION/1", "without duplicates",
    "TypeScript", "20 recipients", "not encryption", "privacy has not been established",
    "before further WavelengthScript"]) {
    expect(text).toContain(phrase);
  }
});
