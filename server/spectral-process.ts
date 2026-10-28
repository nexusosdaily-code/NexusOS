import { spawn, type ChildProcess } from "node:child_process";
import { fetchSpectralJson } from "./spectral-client";

// One worker is essential: coordinator queues/inboxes are process-local.
export const spectralProcessArgs = [
  "-m", "gunicorn", "--bind", "127.0.0.1:5001",
  "--workers", "1", "--threads", "4", "--timeout", "60",
  "--graceful-timeout", "5", "--access-logfile", "/dev/null",
  "spectral_api:app",
];

export class SpectralProcess {
  private child: ChildProcess | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private attempts = 0;
  ready = false;

  start() {
    if (this.child || this.stopped) return;
    const child = spawn("python", spectralProcessArgs, {
      stdio: ["ignore", "inherit", "inherit"],
      // Own a process group so shutdown reaches master AND worker only.
      detached: true,
    });
    this.child = child;
    let handled = false;
    const failed = () => {
      if (handled) return;
      handled = true;
      this.ready = false;
      if (this.child === child) this.child = undefined;
      if (this.stopped) return;
      // A crashed master must not leave an orphan worker holding port 5001.
      this.signal(child, "SIGTERM");
      if (++this.attempts > 5) {
        console.error("[Spectral] Restart limit reached; gateway unavailable");
        return;
      }
      const delay = Math.min(1000 * 2 ** (this.attempts - 1), 30_000);
      console.error(`[Spectral] Gateway exited; retrying in ${delay}ms`);
      this.timer = setTimeout(() => { this.timer = undefined; this.start(); }, delay);
    };
    child.once("error", failed);
    child.once("exit", failed);
    void this.checkReady(child);
  }

  private async checkReady(child: ChildProcess) {
    for (let attempt = 0; attempt < 30 && this.child === child && !this.stopped; attempt++) {
      try {
        const health = await fetchSpectralJson("http://127.0.0.1:5001/api/spectral/health", {}, 1000);
        if (health.status === 200 && (health.data as { service?: string })?.service === "Spectral API") {
          if (this.child !== child || this.stopped) return;
          this.ready = true;
          console.info("[Spectral] Gateway ready on loopback");
          return;
        }
      } catch { /* Startup may still be loading the existing kernel. */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (this.child === child && !this.stopped) {
      console.error("[Spectral] Gateway readiness deadline exceeded");
      this.signal(child, "SIGTERM");
      const forceStop = setTimeout(() => {
        if (this.child === child && !this.stopped) this.signal(child, "SIGKILL");
      }, 7000);
      child.once("exit", () => clearTimeout(forceStop));
    }
  }

  private signal(child: ChildProcess, signal: NodeJS.Signals) {
    if (!child.pid) return;
    try { process.kill(-child.pid, signal); } catch { /* Already exited. */ }
  }

  async stop() {
    this.stopped = true;
    this.ready = false;
    if (this.timer) clearTimeout(this.timer);
    const child = this.child;
    if (!child) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.signal(child, "SIGKILL");
        resolve();
      }, 7000);
      child.once("exit", () => { clearTimeout(timer); resolve(); });
      this.signal(child, "SIGTERM");
    });
    this.child = undefined;
  }
}
