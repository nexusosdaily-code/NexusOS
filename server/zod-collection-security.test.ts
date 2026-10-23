import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fromZodError } from "zod-validation-error";
import { createInsertSchema } from "drizzle-zod";
import { pgTable, text } from "drizzle-orm/pg-core";

describe("Zod collection memory-exhaustion protection", () => {
  // Synthetic, bounded fixtures only: no application startup, database or wallet.
  for (const constraint of ["max", "length"] as const) {
    for (const asyncParse of [false, true]) {
      it(`rejects an oversized array before visiting elements (${constraint}, async=${asyncParse})`, async () => {
        let visited = 0;
        const element = z.unknown().transform(() => {
          visited++;
          return "parsed";
        });
        const schema = z.array(element)[constraint](2);
        const input = Array.from({ length: 4096 }, () => "synthetic");
        const result = asyncParse
          ? await schema.safeParseAsync(input)
          : schema.safeParse(input);
        expect(result.success).toBe(false);
        expect(visited).toBe(0);
        if (!result.success) {
          expect(result.error.issues).toHaveLength(1);
          expect(result.error.issues[0].code).toBe("too_big");
        }
      });
    }
  }

  it("rejects an oversized set before visiting elements", () => {
    let visited = 0;
    const schema = z.set(z.unknown().transform(() => { visited++; return "parsed"; })).max(2);
    const result = schema.safeParse(new Set(["one", "two", "three"]));
    expect(result.success).toBe(false);
    expect(visited).toBe(0);
  });

  it("still validates elements within the size limit", () => {
    const schema = z.array(z.string().min(1)).max(2);
    expect(schema.safeParse(["valid", "also valid"]).success).toBe(true);
    expect(schema.safeParse([""]).success).toBe(false);
  });

  it("keeps strict unknown-field rejection", () => {
    const schema = z.object({ name: z.string() }).strict();
    expect(schema.safeParse({ name: "test", extra: true }).success).toBe(false);
  });

  it("preserves form resolver field errors with Zod 4", async () => {
    const resolver = zodResolver(z.object({ name: z.string().min(1) }));
    const result = await resolver({ name: "" }, undefined, {
      fields: {}, shouldUseNativeValidation: false,
    });
    expect(result.errors.name?.message).toBeTruthy();
  });

  it("formats errors with the upgraded error adapter", () => {
    const result = z.string().safeParse(123);
    expect(result.success).toBe(false);
    if (!result.success) expect(fromZodError(result.error).message).toContain("string");
  });

  it("preserves generated Drizzle insert validation", () => {
    const table = pgTable("synthetic_validation_fixture", { name: text("name").notNull() });
    const schema = createInsertSchema(table);
    expect(schema.safeParse({ name: "valid" }).success).toBe(true);
    expect(schema.safeParse({ name: 123 }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });
});
