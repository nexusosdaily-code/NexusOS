/**
 * useUnisat — Bitcoin wallet hook for NexusOS
 * Detects and connects to:
 *   1. UniSat Wallet  (window.unisat)
 *   2. Xverse Wallet  (window.XverseProviders?.BitcoinProvider)
 *   3. OKX Wallet     (window.okxwallet?.bitcoin)
 *
 * Provides: connect, signPsbt, pushTx, signMessage, getBalance
 */

import { useState, useEffect, useCallback } from "react";

export type WalletProvider = "unisat" | "xverse" | "okx" | null;

export interface UnisatBalance {
  confirmed: number;    // sats
  unconfirmed: number;  // sats
  total: number;        // sats
}

export interface UseUnisatReturn {
  available: boolean;
  provider: WalletProvider;
  providerName: string;
  connected: boolean;
  address: string | null;
  balance: UnisatBalance | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signPsbt: (psbtHex: string, opts?: SignPsbtOpts) => Promise<string>;
  pushTx: (txHex: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  error: string | null;
}

export interface SignPsbtOpts {
  autoFinalized?: boolean;
  toSignInputs?: Array<{ index: number; address?: string; publicKey?: string }>;
}

function detectProvider(): { provider: WalletProvider; api: any } {
  const w = window as any;
  if (w.unisat)                              return { provider: "unisat", api: w.unisat };
  if (w.XverseProviders?.BitcoinProvider)    return { provider: "xverse", api: w.XverseProviders.BitcoinProvider };
  if (w.okxwallet?.bitcoin)                  return { provider: "okx",    api: w.okxwallet.bitcoin };
  return { provider: null, api: null };
}

const PROVIDER_NAMES: Record<string, string> = {
  unisat: "UniSat",
  xverse: "Xverse",
  okx:    "OKX",
};

export function useUnisat(): UseUnisatReturn {
  const [available,   setAvailable]   = useState(false);
  const [provider,    setProvider]    = useState<WalletProvider>(null);
  const [connected,   setConnected]   = useState(false);
  const [address,     setAddress]     = useState<string | null>(null);
  const [balance,     setBalance]     = useState<UnisatBalance | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [_api,        _setApi]        = useState<any>(null);

  // Detect on mount + after page load
  useEffect(() => {
    const detect = () => {
      const { provider: p, api } = detectProvider();
      setAvailable(!!p);
      setProvider(p);
      _setApi(api);
    };
    detect();
    // Some wallets inject after DOMContentLoaded
    const t = setTimeout(detect, 500);
    return () => clearTimeout(t);
  }, []);

  // Listen for UniSat account changes
  useEffect(() => {
    const w = window as any;
    if (!w.unisat) return;
    const handleChange = (accounts: string[]) => {
      if (accounts.length === 0) { setConnected(false); setAddress(null); setBalance(null); }
      else setAddress(accounts[0]);
    };
    w.unisat.on?.("accountsChanged", handleChange);
    return () => w.unisat.removeListener?.("accountsChanged", handleChange);
  }, []);

  const refreshBalance = useCallback(async () => {
    const { api } = detectProvider();
    if (!api) return;
    try {
      if (provider === "unisat") {
        const bal = await api.getBalance();
        setBalance({ confirmed: bal.confirmed, unconfirmed: bal.unconfirmed, total: bal.total });
      }
    } catch (e: any) {
      console.warn("[useUnisat] balance fetch failed:", e.message);
    }
  }, [provider]);

  const connect = useCallback(async () => {
    setError(null);
    const { provider: p, api } = detectProvider();
    if (!p || !api) {
      setError("No Bitcoin wallet detected. Install UniSat or Xverse.");
      return;
    }
    try {
      let accounts: string[] = [];
      if (p === "unisat") {
        accounts = await api.requestAccounts();
      } else if (p === "xverse") {
        // Xverse uses a different connect API
        await api.connect();
        const resp = await api.getAccounts();
        accounts = resp.map((a: any) => a.address);
      } else if (p === "okx") {
        const resp = await api.connect();
        accounts = [resp.address];
      }
      if (accounts.length > 0) {
        setConnected(true);
        setAddress(accounts[0]);
        _setApi(api);
        setProvider(p);
        // Fetch balance
        try {
          if (p === "unisat") {
            const bal = await api.getBalance();
            setBalance({ confirmed: bal.confirmed, unconfirmed: bal.unconfirmed, total: bal.total });
          }
        } catch { /* balance optional */ }
      }
    } catch (e: any) {
      setError(e.message || "Connection rejected");
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress(null);
    setBalance(null);
  }, []);

  const signPsbt = useCallback(async (psbtHex: string, opts: SignPsbtOpts = {}): Promise<string> => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") {
      return api.signPsbt(psbtHex, {
        autoFinalized: opts.autoFinalized ?? true,
        toSignInputs: opts.toSignInputs,
      });
    } else if (p === "xverse") {
      // Xverse PSBT signing
      const resp = await api.signPsbt({ psbt: psbtHex, signInputs: opts.toSignInputs ?? [] });
      return resp.psbt;
    } else if (p === "okx") {
      return api.signPsbt(psbtHex);
    }
    throw new Error("Unsupported wallet for PSBT signing");
  }, []);

  const pushTx = useCallback(async (txHex: string): Promise<string> => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") return api.pushTx({ rawtx: txHex });
    if (p === "okx")    return api.pushTx(txHex);
    // Fallback: broadcast via mempool.space
    const res = await fetch("https://mempool.space/api/tx", {
      method: "POST", headers: { "Content-Type": "text/plain" }, body: txHex,
    });
    if (!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);
    return res.text();
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") return api.signMessage(message);
    if (p === "okx")    return api.signMessage(message, "bip322-simple");
    throw new Error("Unsupported wallet for message signing");
  }, []);

  return {
    available,
    provider,
    providerName: provider ? (PROVIDER_NAMES[provider] ?? provider) : "Bitcoin Wallet",
    connected,
    address,
    balance,
    connect,
    disconnect,
    signPsbt,
    pushTx,
    signMessage,
    refreshBalance,
    error,
  };
}
