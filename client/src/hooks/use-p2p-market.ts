import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { P2PAccount, P2PListing, P2PLive, P2POrder } from "@shared/p2p-market";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || `Request failed (${response.status})`);
  return body as T;
}

export type P2PPaymentsPolicy = { enabled: boolean; reason: string };
type P2PAccountWithPayments = P2PAccount & { paymentsEnabled: boolean };

export function useP2PMarket(authenticated: boolean, userId?: string) {
  const client = useQueryClient();
  const paymentsPolicy = useQuery({
    queryKey: ["p2p-market", "payments-policy"],
    queryFn: () => request<P2PPaymentsPolicy>("/api/p2p/payments-policy"),
    refetchInterval: 30_000,
    retry: 1,
  });
  const listings = useQuery({
    queryKey: ["p2p-market", "listings"],
    queryFn: () => request<{ listings: P2PListing[] }>("/api/p2p/listings"),
    refetchInterval: 30_000,
  });
  const account = useQuery({
    queryKey: ["p2p-market", "account", userId ?? "signed-out"],
    queryFn: () => request<P2PAccountWithPayments>("/api/p2p/account"),
    enabled: authenticated && !!userId,
    refetchInterval: 30_000,
  });
  const live = useQuery({
    queryKey: ["p2p-market", "live", authenticated ? userId ?? "signed-in" : "public"],
    queryFn: () => request<{ streams: P2PLive[] }>("/api/p2p/live"),
    refetchInterval: 20_000,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["p2p-market"] });
  };
  const createListing = useMutation({
    mutationFn: (data: { title: string; description: string; category: P2PListing["category"]; priceSats: number; isPublic: boolean; recipients: string[] }) =>
      request<{ listing: P2PListing }>("/api/p2p/listings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: refresh,
  });
  const deleteListing = useMutation({
    mutationFn: (id: string) => request(`/api/p2p/listings/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
  const buy = useMutation({
    mutationFn: ({ id, requestId }: { id: string; requestId: string }) =>
      request<{ order: P2POrder }>(`/api/p2p/listings/${encodeURIComponent(id)}/buy`, { method: "POST", body: JSON.stringify({ requestId }) }),
    onSuccess: refresh,
  });
  const orderAction = useMutation({
    mutationFn: ({ id, action, note, confirm }: { id: string; action: "deliver" | "accept" | "refund" | "dispute"; note?: string; confirm?: true }) =>
      request<{ order: P2POrder }>(`/api/p2p/orders/${encodeURIComponent(id)}/action`, { method: "POST", body: JSON.stringify({ action, note, confirm }) }),
    onSuccess: refresh,
  });
  const sendTip = useMutation({
    mutationFn: (data: { recipient: string; amountSats: number; requestId: string }) =>
      request("/api/p2p/tips", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: refresh,
  });
  return { paymentsPolicy, listings, account, live, createListing, deleteListing, buy, orderAction, sendTip };
}

export async function p2pRequest<T>(url: string, init?: RequestInit) {
  return request<T>(url, init);
}
