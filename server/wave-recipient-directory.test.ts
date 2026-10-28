import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { waveRecipientDirectory } from "./wave-recipient-directory";

describe("registered wave recipient directory", () => {
  it("returns exact registered addresses and only the public selection fields", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{
      username: "Family", wave_address: "wnsp://Ψ(12,3,H)/family",
      email: "never-expose", user_id: "internal",
    }] });
    expect(await waveRecipientDirectory({ query }, "viewer", " Family ")).toEqual({
      recipients: [{ username: "Family", waveAddress: "wnsp://Ψ(12,3,H)/family" }],
      hasMore: false,
    });
    const [sql, params] = query.mock.calls[0];
    expect(params).toEqual(["viewer", "Family"]);
    for (const guard of ["registry.is_public=true", "registry.registered_by=u.id",
      "registry.resource_id=u.id", "owned.user_id=u.id", "u.is_active=true",
      "u.id<>$1", "LIMIT 31"]) expect(sql).toContain(guard);
  });

  it("bounds results and signals that searching can narrow them", async () => {
    const query = vi.fn().mockResolvedValue({ rows: Array.from({ length: 31 }, (_, i) => ({
      username: `person${i}`, wave_address: `wnsp://Ψ(${i},0,H)/person`,
    })) });
    const result = await waveRecipientDirectory({ query }, "viewer", "");
    expect(result.recipients).toHaveLength(30);
    expect(result.hasMore).toBe(true);
  });

  it("rejects invalid search inputs before querying", async () => {
    const query = vi.fn();
    for (const input of ["x".repeat(81), ["one", "two"], { q: "x" }]) {
      await expect(waveRecipientDirectory({ query }, "viewer", input)).rejects.toThrow("Search");
    }
    expect(query).not.toHaveBeenCalled();
  });

  it("passes wildcard and SQL-like input as literal parameterised search text", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await waveRecipientDirectory({ query }, "viewer", "%_' OR 1=1");
    expect(query.mock.calls[0][1]).toEqual(["viewer", "%_' OR 1=1"]);
    expect(query.mock.calls[0][0]).not.toContain("%_' OR 1=1");
  });

  it("never offers computed coordinates or HTTP URLs as registered wave URIs", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [
      { username: "bad", wave_address: "Ψ(1,2,H)" },
      { username: "web", wave_address: "https://example.com" },
    ] });
    expect((await waveRecipientDirectory({ query }, "viewer", "")).recipients).toEqual([]);
  });

  it("keeps the endpoint authenticated and responses out of shared caches", () => {
    const source = readFileSync("server/routes.ts", "utf8");
    const route = source.slice(source.indexOf('app.get("/api/directory/recipients"'));
    expect(route.slice(0, 130)).toContain("authenticate");
    expect(route.slice(0, 350)).toContain('"private, no-store"');
  });
});
