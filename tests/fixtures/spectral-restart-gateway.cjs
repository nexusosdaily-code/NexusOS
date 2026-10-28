// Synthetic loopback-only gateway. No application imports, persistence, or delivery.
const http = require("node:http");
let mode = "ok";
process.on("message", message => {
  mode = message.mode;
  process.send({ event: "mode", mode });
});
const server = http.createServer(async (req, res) => {
  if (req.url === "/api/spectral/health") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ service: "Spectral API" }));
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  process.send({ event: "request", path: req.url, body: JSON.parse(body) });
  if (mode === "hang") return; // Deliberately never send headers.
  res.setHeader("Content-Type", "application/json");
  if (mode === "body-hang") {
    res.writeHead(200);
    return res.write('{"unfinished":');
  }
  if (mode === "error") {
    res.writeHead(503);
    return res.end(JSON.stringify({ error: "Fixture gateway unavailable" }));
  }
  if (req.url === "/api/nexus/dev/encode") {
    return res.end(JSON.stringify({
      psi_channel: "Ψ(7,2,H)", wavelength_mid_nm: 550,
      frequency_hz: 545000000000000, energy_joules: 1e-19, lambda_mass_kg: 1e-36,
    }));
  }
  if (req.url === "/api/wnsp/bus/send") {
    return res.end(JSON.stringify({
      status: "queued", authority: "USER",
      route: "fixture-src Ψ(7,2,H) → fixture-dst Ψ(8,3,V)",
    }));
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Unknown fixture endpoint" }));
});
server.listen(Number(process.argv[2]), "127.0.0.1", () => process.send({ event: "listening" }));
