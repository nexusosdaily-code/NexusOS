import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { walletRequest } from "./wallet-request";

const pending = new Map<string,string>();
beforeEach(() => {
  pending.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("sessionStorage", {
    getItem: (key:string) => pending.get(key) ?? null,
    setItem: (key:string,value:string) => pending.set(key,value),
    removeItem: (key:string) => pending.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());
const init={method:"POST",body:JSON.stringify({amountSats:12345}),headers:{"Content-Type":"application/json"}};
it("retains the same retry identity after network failure and across a reload-like invocation",async()=>{
  const send=vi.fn().mockRejectedValueOnce(new Error("Network lost")).mockResolvedValueOnce(new Response("{}",{status:200}));
  vi.stubGlobal("fetch",send);
  await expect(walletRequest("/api/lightning/pay",init)).rejects.toThrow("Network lost");
  expect(pending.size).toBe(1);
  expect([...pending.keys()].join("")).not.toContain("12345");
  await walletRequest("/api/lightning/pay",init);
  const headers=send.mock.calls.map(call=>new Headers(call[1].headers).get("Idempotency-Key"));
  expect(headers[0]).toBe(headers[1]);expect(headers[0]).toMatch(/^[0-9a-f-]{36}$/);
  expect(pending.size).toBe(0);
});
it("retains retry identity for ambiguous server errors but starts a new operation after success",async()=>{
  const send=vi.fn().mockResolvedValueOnce(new Response("{}",{status:503}))
    .mockResolvedValueOnce(new Response("{}",{status:200})).mockResolvedValueOnce(new Response("{}",{status:200}));
  vi.stubGlobal("fetch",send);
  await walletRequest("/api/keys",init);await walletRequest("/api/keys",init);await walletRequest("/api/keys",init);
  const keys=send.mock.calls.map(call=>new Headers(call[1].headers).get("Idempotency-Key"));
  expect(keys[0]).toBe(keys[1]);expect(keys[2]).not.toBe(keys[1]);
});
it("does not send when the browser cannot persist a safe retry identity",async()=>{
  vi.stubGlobal("sessionStorage",{getItem:()=>null,setItem:()=>{throw new Error("Storage blocked");}});
  const send=vi.fn();vi.stubGlobal("fetch",send);
  await expect(walletRequest("/api/keys",init)).rejects.toThrow("Storage blocked");
  expect(send).not.toHaveBeenCalled();
});
