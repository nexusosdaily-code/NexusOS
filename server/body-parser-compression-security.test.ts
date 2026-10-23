import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("compressed request parser security", () => {
  for (const parser of ["json", "urlencoded"]) {
    for (const encoding of ["gzip", "deflate"]) {
      it(`survives trailing compressed bytes (${parser}, ${encoding})`, () => {
        // A vulnerable parser can throw after responding and kill the process.
        // Run each synthetic, loopback-only case in a child, never the real app.
        const fixture = `
          import assert from "node:assert/strict";
          import http from "node:http";
          import { gzipSync, deflateSync } from "node:zlib";
          import express from "express";
          const parser = ${JSON.stringify(parser)};
          const encoding = ${JSON.stringify(encoding)};
          const app = express();
          app.use(parser === "json"
            ? express.json({ limit: "1kb", verify(req, res, buf) { req.rawBody = buf; } })
            : express.urlencoded({ extended: false, limit: "1kb" }));
          app.post("/fixture", (req, res) => res.json({ body: req.body }));
          app.get("/health", (req, res) => res.json({ ok: true }));
          app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.type }));
          const server = app.listen(0, "127.0.0.1");
          await new Promise(resolve => server.once("listening", resolve));
          const port = server.address().port;
          const compress = encoding === "gzip" ? gzipSync : deflateSync;
          async function send(text, trailing = false) {
            const frame = compress(Buffer.from(text));
            const tail = trailing ? Buffer.from("invalid-trailing-bytes") : Buffer.alloc(0);
            return new Promise((resolve, reject) => {
              const request = http.request({
                hostname: "127.0.0.1", port, path: "/fixture", method: "POST",
                headers: {
                  "content-type": parser === "json" ? "application/json" : "application/x-www-form-urlencoded",
                  "content-encoding": encoding,
                  "content-length": frame.length + tail.length
                }
              }, response => {
                let body = "";
                response.on("data", chunk => body += chunk);
                response.on("end", () => resolve({ status: response.statusCode, body }));
              });
              request.on("error", reject);
              request.setTimeout(2000, () => request.destroy(new Error("fixture timeout")));
              request.write(frame);
              // Put trailing data in a later chunk, after the frame can finish.
              setTimeout(() => request.end(tail), trailing ? 40 : 0);
            });
          }
          try {
            const text = parser === "json" ? '{"name":"synthetic"}' : "name=synthetic";
            const valid = await send(text);
            assert.equal(valid.status, 200);
            assert.equal(JSON.parse(valid.body).body.name, "synthetic");
            const malformed = await send(text, true);
            assert.ok([200, 400].includes(malformed.status));
            // Late decoder errors must not escape after the response.
            await new Promise(resolve => setTimeout(resolve, 80));
            const health = await new Promise((resolve, reject) => {
              http.get({ hostname: "127.0.0.1", port, path: "/health" }, res => {
                res.resume(); res.on("end", () => resolve(res.statusCode));
              }).on("error", reject);
            });
            assert.equal(health, 200);
            const oversized = await send(parser === "json"
              ? JSON.stringify({ name: "x".repeat(2048) })
              : "name=" + "x".repeat(2048));
            assert.equal(oversized.status, 413);
            console.log("compressed-parser-fixture-passed");
          } finally {
            server.closeAllConnections();
            await new Promise(resolve => server.close(resolve));
          }
        `;
        const output = execFileSync(process.execPath, ["--input-type=module", "-e", fixture], {
          cwd: process.cwd(), encoding: "utf8", timeout: 8000,
        });
        expect(output).toContain("compressed-parser-fixture-passed");
      });
    }
  }
});
