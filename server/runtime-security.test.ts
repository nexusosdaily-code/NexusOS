import { describe, it, expect } from "vitest";
import { assertPatchedNodeRuntime } from "./runtime-security";

describe("Node security baseline", () => {
  it.each(["22.23.4", "v22.23.4", "22.23.5", "22.24.0", "24.22.1", "26.12.1"])(
    "allows patched release %s", version => expect(() => assertPatchedNodeRuntime(version)).not.toThrow(),
  );
  it.each(["20.20.0", "22.23.3", "22.22.99", "24.22.0", "26.12.0", "23.99.99", "28.0.0", "22.23.4-rc.1", "garbage", ""])(
    "refuses unreviewed or unpatched release %s", version => expect(() => assertPatchedNodeRuntime(version)).toThrow("Unapproved Node.js runtime"),
  );
  it("approves the executable actually running this test", () => {
    expect(() => assertPatchedNodeRuntime(process.versions.node)).not.toThrow();
  });
});
