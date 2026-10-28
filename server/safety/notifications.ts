import { createPrivateKey, sign } from "node:crypto";
import { signingBytes, validSignature, type Config } from "./protocol";
import type { SafetyController } from "./controller";

/**
 * Retry every reviewer, including uninvolved reviewers. Responses must be
 * separately signed. Delivery failure never undoes containment or grants access.
 * Each signed checkpoint is a receipt to retain off-host for rollback detection.
 */
export class ReviewerNotifications {
  private busy = false;
  constructor(
    private controller: SafetyController, private config: Config,
    private signingKey: string, private fetcher = fetch, private clock = Date.now,
  ) {}
  async deliver(): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true;
    try {
      const snapshot = this.controller.notifications();
      const payload = { ...snapshot, issuedAt: this.clock() };
      const body = {
        payload,
        signature: sign(null, signingBytes("authority", payload), createPrivateKey(this.signingKey)).toString("base64"),
      };
      const role = this.config.governanceMode === "founder-only" ? "founder" : "reviewer";
      const delivered = await Promise.all(this.config.actors.filter(a => a.role === role).map(async actor => {
        try {
          const response = await this.fetcher(actor.notificationUrl!, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(3000), redirect: "error",
          });
          if (!response.ok) return false;
          const ack = await response.json();
          const expected = { sequence: snapshot.sequence, head: snapshot.head, issuedAt: payload.issuedAt };
          return ack.actor === actor.id && validSignature(actor.publicKey, "notification-ack", expected, ack.signature);
        } catch { return false; }
      }));
      return delivered.every(Boolean);
    } finally { this.busy = false; }
  }
}
