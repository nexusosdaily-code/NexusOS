import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("./spectral-client", () => ({ fetchSpectralJson: vi.fn() }));
import { spawn } from "node:child_process";
import { fetchSpectralJson } from "./spectral-client";
import { SpectralProcess, spectralProcessArgs } from "./spectral-process";

let children: Array<EventEmitter & { pid: number }>;
beforeEach(() => {
  vi.useFakeTimers();
  children = [];
  vi.mocked(spawn).mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { pid: 4000 + children.length });
    children.push(child);
    return child as ReturnType<typeof spawn>;
  });
  vi.mocked(fetchSpectralJson).mockResolvedValue({ status: 200, data: { service: "Spectral API" } });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "kill").mockImplementation(() => true);
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("owned Spectral gateway lifecycle", () => {
  it("starts a single loopback-only WSGI worker in production too", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const service = new SpectralProcess();
      service.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(spawn).toHaveBeenCalledWith("python", spectralProcessArgs, expect.objectContaining({ detached: true }));
      expect(spectralProcessArgs.join(" ")).toContain("--bind 127.0.0.1:5001 --workers 1");
      expect(service.ready).toBe(true);
      service.start();
      expect(spawn).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllEnvs(); }
  });

  it("bounds retries and clears readiness after an unexpected exit", async () => {
    const service = new SpectralProcess();
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 0; i < 6; i++) {
      children[i].emit("exit", 1);
      expect(service.ready).toBe(false);
      await vi.advanceTimersByTimeAsync(30_000);
    }
    expect(spawn).toHaveBeenCalledTimes(6);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Restart limit reached"));
  });

  it("does not schedule two restarts for error followed by exit", async () => {
    const service = new SpectralProcess();
    service.start();
    children[0].emit("error", new Error("failed"));
    children[0].emit("exit", 1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("gracefully stops only its owned group and prevents restart", async () => {
    const service = new SpectralProcess();
    service.start();
    await vi.advanceTimersByTimeAsync(0);
    const stopped = service.stop();
    expect(process.kill).toHaveBeenCalledWith(-4000, "SIGTERM");
    children[0].emit("exit", 0);
    await stopped;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(process.kill).toHaveBeenCalledTimes(1);
    expect(service.ready).toBe(false);
  });

  it("force-stops a child only after its graceful deadline", async () => {
    const service = new SpectralProcess();
    service.start();
    const stopped = service.stop();
    await vi.advanceTimersByTimeAsync(7000);
    await stopped;
    expect(process.kill).toHaveBeenLastCalledWith(-4000, "SIGKILL");
  });

  it("terminates a gateway that never becomes ready", async () => {
    vi.mocked(fetchSpectralJson).mockRejectedValue(new Error("unavailable"));
    const service = new SpectralProcess();
    service.start();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(service.ready).toBe(false);
    expect(process.kill).toHaveBeenCalledWith(-4000, "SIGTERM");
  });
});
