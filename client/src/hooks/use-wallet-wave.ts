import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { WaveOverview } from "@shared/wallet-wave-communications";

const base = "/api/messages/wave";
export function useWalletWave() {
  const { user } = useAuth();
  return useQuery<WaveOverview>({
    queryKey: [base, user?.id], enabled: !!user, refetchInterval: 15000,
    queryFn: async () => (await apiRequest("GET", base)).json(),
  });
}
export function useWalletWaveAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, data }: { path: string; data?: unknown }) =>
      (await apiRequest("POST", `${base}${path}`, data)).json(),
    onSuccess: () => client.invalidateQueries({ queryKey: [base] }),
  });
}
