/**
 * useUnisat — Bitcoin wallet hook for NexusOS
 * Context-based: connect once anywhere → connected everywhere.
 *
 * Usage:
 *   1. Wrap your app with <UniSatProvider>
 *   2. Call useUnisat() in any component
 */

import React, { useState, useEffect, useCallback, createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

export type WalletProvider = "unisat" | "xverse" | "okx" | null;

export interface UnisatBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface WalletInscription {
  inscriptionId: string;
  inscriptionNumber: number;
  contentType: string;
  preview: string;
  outputValue: number;
  timestamp: number;
}

export interface WalletBRC20 {
  ticker: string;
  balance: string;
  availableBalance: string;
  lockedBalance: string;
}

export interface WalletRune {
  spacedRune: string;
  rune: string;
  runeId: string;
  amount: string;
  symbol: string;
  divisibility: number;
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
  pushPsbt: (psbtHex: string, opts?: SignPsbtOpts) => Promise<string>;
  pushTx: (txHex: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
  getInscriptions: (cursor?: number, size?: number) => Promise<{ total: number; list: WalletInscription[] }>;
  getBRC20s: (cursor?: number, size?: number) => Promise<{ total: number; list: WalletBRC20[] }>;
  getRunes: () => Promise<{ total: number; list: WalletRune[] }>;
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

// ── Context ────────────────────────────────────────────────────────────────────
const UniSatContext = createContext<UseUnisatReturn | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────
export function UniSatProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable]   = useState(false);
  const [provider,  setProvider]    = useState<WalletProvider>(null);
  const [connected, setConnected]   = useState(false);
  const [address,   setAddress]     = useState<string | null>(null);
  const [balance,   setBalance]     = useState<UnisatBalance | null>(null);
  const [error,     setError]       = useState<string | null>(null);

  // Detect wallet on mount (some wallets inject after DOMContentLoaded)
  useEffect(() => {
    const detect = () => {
      const { provider: p } = detectProvider();
      setAvailable(!!p);
      setProvider(p);
    };
    detect();
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
    const { api, provider: p } = detectProvider();
    if (!api) return;
    try {
      if (p === "unisat") {
        const bal = await api.getBalance();
        setBalance({ confirmed: bal.confirmed, unconfirmed: bal.unconfirmed, total: bal.total });
      }
    } catch (e: any) {
      console.warn("[useUnisat] balance fetch failed:", e.message);
    }
  }, []);

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
        setProvider(p);
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
    if (p === "unisat") return api.signPsbt(psbtHex, { autoFinalized: opts.autoFinalized ?? true, toSignInputs: opts.toSignInputs });
    if (p === "xverse") { const r = await api.signPsbt({ psbt: psbtHex, signInputs: opts.toSignInputs ?? [] }); return r.psbt; }
    if (p === "okx")    return api.signPsbt(psbtHex);
    throw new Error("Unsupported wallet for PSBT signing");
  }, []);

  const pushTx = useCallback(async (txHex: string): Promise<string> => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") return api.pushTx({ rawtx: txHex });
    if (p === "okx")    return api.pushTx(txHex);
    const res = await fetch("https://mempool.space/api/tx", { method: "POST", headers: { "Content-Type": "text/plain" }, body: txHex });
    if (!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);
    return res.text();
  }, []);

  const pushPsbt = useCallback(async (psbtHex: string, opts: SignPsbtOpts = {}): Promise<string> => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") return api.pushPsbt(psbtHex);
    let signedHex: string;
    if (p === "xverse") {
      const resp = await api.signPsbt({ psbt: psbtHex, signInputs: opts.toSignInputs ?? [], broadcast: true });
      if (resp.txid) return resp.txid;
      signedHex = resp.psbt;
    } else if (p === "okx") {
      signedHex = await api.signPsbt(psbtHex);
    } else {
      throw new Error("Unsupported wallet for pushPsbt");
    }
    const res = await fetch("https://mempool.space/api/tx", { method: "POST", headers: { "Content-Type": "text/plain" }, body: signedHex });
    if (!res.ok) throw new Error(`Broadcast failed: ${await res.text()}`);
    return (await res.text()).trim();
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") return api.signMessage(message);
    if (p === "okx")    return api.signMessage(message, "bip322-simple");
    throw new Error("Unsupported wallet for message signing");
  }, []);

  const getInscriptions = useCallback(async (cursor = 0, size = 100) => {
    const { api, provider: p } = detectProvider();
    if (!api) throw new Error("No Bitcoin wallet connected");
    if (p === "unisat") { const res = await api.getInscriptions(cursor, size); return { total: res.total, list: res.list ?? [] }; }
    if (!address) throw new Error("No address connected");
    const r = await fetch(`https://open-api.unisat.io/v1/indexer/address/${address}/inscription-data?cursor=${cursor}&size=${size}`, { headers: { "X-Client": "NexusOS" } });
    const d = await r.json();
    return { total: d.data?.total ?? 0, list: d.data?.inscription ?? [] };
  }, [address]);

  const getBRC20s = useCallback(async (cursor = 0, size = 100) => {
    if (!address) throw new Error("No address connected");
    try {
      const r = await fetch(
        `https://open-api.unisat.io/v1/indexer/address/${address}/brc20/summary?cursor=${cursor}&size=${size}`,
        { headers: { "X-Client": "NexusOS" } },
      );
      const d = await r.json();
      const list: any[] = d.data?.detail ?? [];
      return {
        total: d.data?.total ?? list.length,
        list: list.map((t: any) => ({
          ticker:           t.ticker,
          balance:          String(t.overallBalance ?? "0"),
          availableBalance: String(t.availableBalance ?? "0"),
          lockedBalance:    String(t.transferableBalance ?? "0"),
        })),
      };
    } catch {
      return { total: 0, list: [] };
    }
  }, [address]);

  const getRunes = useCallback(async () => {
    if (!address) throw new Error("No address connected");
    const r = await fetch(`https://open-api.unisat.io/v1/indexer/address/${address}/runes/balance-list?cursor=0&size=100`, { headers: { "X-Client": "NexusOS" } });
    const d = await r.json();
    return { total: d.data?.total ?? 0, list: d.data?.detail ?? [] };
  }, [address]);

  const value = useMemo<UseUnisatReturn>(() => ({
    available,
    provider,
    providerName: provider ? (PROVIDER_NAMES[provider] ?? provider) : "Bitcoin Wallet",
    connected,
    address,
    balance,
    connect,
    disconnect,
    signPsbt,
    pushPsbt,
    pushTx,
    signMessage,
    refreshBalance,
    getInscriptions,
    getBRC20s,
    getRunes,
    error,
  }), [
    available, provider, connected, address, balance, error,
    connect, disconnect, signPsbt, pushPsbt, pushTx, signMessage,
    refreshBalance, getInscriptions, getBRC20s, getRunes,
  ]);

  return React.createElement(UniSatContext.Provider, { value }, children);
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useUnisat(): UseUnisatReturn {
  const ctx = useContext(UniSatContext);
  if (!ctx) throw new Error("useUnisat must be used inside <UniSatProvider>");
  return ctx;
}
