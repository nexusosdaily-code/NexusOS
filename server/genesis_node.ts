/**
 * NexusOS Genesis Node
 * ====================
 * Auto-registers the NexusOS server as the first network node on startup
 * and sends periodic beacons to keep it ACTIVE in the network dashboard.
 *
 * The genesis node emits at λ=586.8nm (YELLOW band) — the same channel
 * as the Nexus canonical wnsp:// identity.
 */

import { storage } from "./storage";

const GENESIS_NODE_KEY = "nexusos-genesis-node";
const BEACON_INTERVAL_MS = 90_000; // pulse every 90 seconds → always ACTIVE

// WASCII CE→SE for "NexusOS"
function ceseEncode(name: string) {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  const sum   = codes.reduce((a, b) => a + b, 0);
  const avg   = sum / (codes.length || 1);
  const nm    = parseFloat((380 + ((avg - 32) / 94) * 400).toFixed(4));
  const wdm   = Math.floor((nm - 380) / 4) + 1;
  const oam   = sum % 100;
  const pol   = codes.length % 2 === 0 ? "H" : "V";
  const band  = nm < 450 ? "VIOLET" : nm < 495 ? "BLUE" : nm < 520 ? "CYAN"
              : nm < 565 ? "GREEN" : nm < 590 ? "YELLOW" : nm < 625 ? "ORANGE" : "RED";
  const thz   = parseFloat((299_792_458 / (nm * 1e-9) / 1e12).toFixed(4));
  return { nm, thz, wdm, oam, pol, band, psi: `Ψ(${wdm},${oam},${pol})` };
}

export async function seedGenesisNode(): Promise<void> {
  try {
    const enc = ceseEncode("NexusOS");

    await storage.registerNetworkNode({
      nodeKey:     GENESIS_NODE_KEY,
      name:        "NexusOS Genesis Node",
      purpose:     "Foundation node — WNSP Phase 1 TCP/IP bridge. Spectral addressing on current infrastructure.",
      wavelengthNm: String(enc.nm),
      frequencyThz: String(enc.thz),
      psiChannel:  enc.psi,
      emissionBand: enc.band,
      status:      "active",
      endpoint:    process.env.NODE_ENV === "production"
                     ? (process.env.PUBLIC_URL ?? null)
                     : null,
      capabilities: ["wnsp-bridge", "spectral-db", "blockchain", "ai-kernel", "p2p-media"],
      lastBeaconAt: new Date(),
    });

    console.log(`[GENESIS NODE] Registered at ${enc.psi} (${enc.band} · λ=${enc.nm}nm)`);

    // Beacon loop — keeps the node ACTIVE (lastBeaconAt < 5 min threshold)
    setInterval(async () => {
      try {
        await storage.beaconNetworkNode(GENESIS_NODE_KEY);
      } catch {
        // non-fatal
      }
    }, BEACON_INTERVAL_MS);

  } catch (err: any) {
    console.error("[GENESIS NODE] Seed error:", err.message);
  }
}
