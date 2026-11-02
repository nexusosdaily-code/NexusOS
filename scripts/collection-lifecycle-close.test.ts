import { expect, it, vi } from "vitest";
// @ts-expect-error Standalone native-browser utility has no declaration file.
import { closeLifecycleContext } from "./collection-renaming-isolation.mjs";

function fixture({ notify = true, disappear = true, closePage = true, retainWorker = false } = {}) {
  let observed = false, contextPresent = true, pageClosed = false;
  let resolveClose: () => void;
  const worker = {
    waitForEvent: vi.fn((event, options) => {
      expect(event).toBe("close");
      expect(options).toEqual({ timeout: 3_000 });
      observed = true;
      return new Promise<void>(resolve => { resolveClose = resolve; });
    }),
  };
  const page = {
    workers: () => pageClosed && !retainWorker ? [] : [worker],
    isClosed: () => pageClosed,
  };
  const context = {
    close: vi.fn(async () => {
      expect(observed, "Attach native close observers before context.close").toBe(true);
      contextPresent = !disappear;
      pageClosed = closePage;
      if (notify) resolveClose();
    }),
  };
  return { page, context, browser: { contexts: () => contextPresent ? [context] : [] } };
}

it("accepts a retained pre-closure worker only after its native close and context shutdown", async () => {
  const f = fixture();
  await closeLifecycleContext(f.context, f.browser, f.page);
  expect(f.context.close).toHaveBeenCalledOnce();
});

it("fails at the unchanged three-second deadline when a close notification is missing", async () => {
  vi.useFakeTimers();
  try {
    const f = fixture({ notify: false });
    const rejected = expect(closeLifecycleContext(f.context, f.browser, f.page))
      .rejects.toThrow("Native lifecycle context teardown timed out after 3000ms");
    await vi.advanceTimersByTimeAsync(3_000);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  } finally { vi.useRealTimers(); }
});

it.each([
  [{ disappear: false }, "Native context must disappear"],
  [{ closePage: false }, "Native lifecycle page must close"],
  [{ retainWorker: true }, "No native worker may survive context teardown"],
])("rejects incomplete native shutdown: %j", async (options, diagnostic) => {
  const f = fixture(options);
  await expect(closeLifecycleContext(f.context, f.browser, f.page)).rejects.toThrow(diagnostic);
});

it("does not turn a context-close error into completed cleanup", async () => {
  const f = fixture();
  f.context.close.mockRejectedValue(new Error("native close failed"));
  await expect(closeLifecycleContext(f.context, f.browser, f.page)).rejects.toThrow("native close failed");
});
