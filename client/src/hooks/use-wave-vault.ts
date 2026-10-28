import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { VaultFile } from "@shared/wave-vault";

export type VaultGrant = { userId: string; waveAddress: string; createdAt: string };
export type VaultLimits = { maxFileBytes: number; maxAccountBytes: number; maxFiles: number };
export type VaultIndex = {
  address: string;
  storageReady: boolean;
  limits: VaultLimits;
  usedBytes: string;
  files: VaultFile[];
};
export type CreateVaultFile = { name: string; size: number; mediaType: string; folder: string };

export async function waveVaultRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: init?.headers,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = typeof body?.error === "string" ? body.error : `Request failed (${response.status})`;
    throw new Error(error);
  }
  return body as T;
}

export function useWaveVault(authenticated: boolean, userId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["wave-vault", userId ?? "signed-out"] as const;
  const previousUserId = useRef(userId);
  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    const activeKey = userId ?? "signed-out";
    void queryClient.cancelQueries({ predicate: query => query.queryKey[0] === "wave-vault" && query.queryKey[1] !== activeKey });
    queryClient.removeQueries({ predicate: query => query.queryKey[0] === "wave-vault" && query.queryKey[1] !== activeKey });
  }, [queryClient, userId]);

  const files = useQuery({
    queryKey,
    queryFn: ({ signal }) => waveVaultRequest<VaultIndex>("/api/wave-vault", { signal }),
    enabled: authenticated && !!userId,
    retry: 1,
    // Vault grants can change in another account/browser. Do not inherit the
    // application's indefinitely fresh, non-refreshing query defaults.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!authenticated || !userId) return;
    // iOS may restore a frozen page without a normal React remount.
    const resume = () => {
      void queryClient.invalidateQueries({ queryKey: ["wave-vault", userId], exact: true });
    };
    window.addEventListener("pageshow", resume);
    return () => window.removeEventListener("pageshow", resume);
  }, [authenticated, userId, queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, userId]);

  const getGrants = useCallback((id: string) =>
    waveVaultRequest<{ grants: VaultGrant[] }>(`/api/wave-vault/${encodeURIComponent(id)}/grants`), []);
  const createGrant = useCallback((id: string, address: string) =>
    waveVaultRequest<{ ok: true }>(`/api/wave-vault/${encodeURIComponent(id)}/grants`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }),
    }), []);
  const revokeGrant = useCallback((id: string, user: string) =>
    waveVaultRequest<{ ok: true }>(`/api/wave-vault/${encodeURIComponent(id)}/grants/${encodeURIComponent(user)}`, { method: "DELETE" }), []);
  const updateFile = useCallback((id: string, data: { name: string; folder: string }) =>
    waveVaultRequest<{ file: VaultFile }>(`/api/wave-vault/${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    }), []);
  const deleteFile = useCallback((id: string) =>
    waveVaultRequest<{ ok: true }>(`/api/wave-vault/${encodeURIComponent(id)}`, { method: "DELETE" }), []);
  const createFile = useCallback((data: CreateVaultFile, signal?: AbortSignal) =>
    waveVaultRequest<{ file: VaultFile; uploadUrl: string }>("/api/wave-vault", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal,
    }), []);

  return { files, refresh, getGrants, createGrant, revokeGrant, updateFile, deleteFile, createFile };
}
