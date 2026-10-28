import { EventEmitter } from "node:events";

/** Internal IDs only. Never emit session tokens or browser credentials. */
export const sessionLifecycle = new EventEmitter();
export const notifySessionRevoked = (sessionId: string) => sessionLifecycle.emit("session", sessionId);
export const notifyUserSessionsRevoked = (userId: string) => sessionLifecycle.emit("user", userId);
