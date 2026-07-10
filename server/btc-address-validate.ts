import * as bitcoin from "bitcoinjs-lib";

const NETWORK = bitcoin.networks.bitcoin;

// Real bech32/bech32m checksum + script validation (not just a prefix/length
// check) — catches typo'd addresses before they're saved or used for
// fund delivery. Mainnet only (bc1p.../bc1q.../1.../3...).
export function isValidMainnetBtcAddress(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  const trimmed = address.trim();
  if (trimmed.length < 14 || trimmed.length > 90) return false;
  try {
    bitcoin.address.toOutputScript(trimmed, NETWORK);
    return true;
  } catch {
    return false;
  }
}
