/**
 * NexusOS CE Encoder — Starter Template
 *
 * This template shows how to CE-encode any text or code into its
 * spectral fingerprint using the NexusOS physics stack.
 *
 * Every character maps to a wavelength (380–780nm visible light).
 * Every piece of code has a unique spectral address in the universe.
 *
 * Docs:   https://wnsp.dev
 * GitHub: https://github.com/nexusosdaily-code/NexusOS
 * Try it: https://wnsp.io/encode
 */

const { ceEncode } = require("nexusos-ce-encoder");

// ── Encode some text ─────────────────────────────────────────────────────────

const examples = [
  "Hello World",
  "def add(a, b): return a + b",
  "const x = BigInt(42);",
  "SELECT * FROM spectral_records WHERE wavelength_nm > 500;",
  "NexusOS — Kardashev Type I civilisation blueprint",
];

console.log("\n══════════════════════════════════════════════");
console.log("  NexusOS CE Encoder — Spectral Fingerprints");
console.log("══════════════════════════════════════════════\n");

for (const text of examples) {
  const result = ceEncode(text);
  console.log(`Input:      "${text}"`);
  console.log(`Wavelength: ${result.wavelength} nm`);
  console.log(`Band:       ${result.band} / 128`);
  console.log(`Ψ Channel:  ${result.psiChannel}`);
  console.log(`Energy:     ${result.energy.toExponential(3)} J  (E = hf)`);
  console.log("──────────────────────────────────────────────");
}

// ── Try your own text ─────────────────────────────────────────────────────────

const myCode = `
// Paste your own code here and run it to see its spectral address
function greet(name) {
  return "Hello " + name;
}
`.trim();

console.log("\n✦ Your code's spectral fingerprint:\n");
const myResult = ceEncode(myCode);
console.log(`Wavelength: ${myResult.wavelength} nm`);
console.log(`Ψ Channel:  ${myResult.psiChannel}`);
console.log(`Energy:     ${myResult.energy.toExponential(3)} J`);

console.log("\n══════════════════════════════════════════════");
console.log("  Share your result: https://wnsp.io/encode");
console.log("  Full pipeline:     https://wnsp.io/ce-se-pipeline");
console.log("  Developer docs:    https://wnsp.dev");
console.log("══════════════════════════════════════════════\n");

// ── Export for extension ──────────────────────────────────────────────────────

module.exports = { ceEncode };
