// Test-only observation of real listeners; no server or browser behavior is mocked.
import { appendFileSync } from "node:fs";
import { Server } from "node:net";

const listen = Server.prototype.listen;
let nextId = 0;
Server.prototype.listen = function (...args) {
  const id = ++nextId;
  const record = event => appendFileSync(process.env.HUB_SERVER_TRACE,
    `${JSON.stringify({ event, id, address: this.address() })}\n`);
  this.once("listening", () => record("listening"));
  this.once("close", () => record("close"));
  return Reflect.apply(listen, this, args);
};
