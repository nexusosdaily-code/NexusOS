import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type {
  CommunityElectionOverview, CommunityElectionMembership, CommunityVerifiedPerson, CommunityContinuityOverview,
} from "@shared/community-elections";

const base = "/api/community-elections";
export function useCommunityElections() {
  return useQuery<CommunityElectionOverview>({ queryKey: [base], refetchInterval: 15000 });
}
export function useCommunityContinuity() {
  return useQuery<CommunityContinuityOverview>({ queryKey: [`${base}/continuity`], refetchInterval: 15000 });
}
export function useCommunityMembership(enabled: boolean) {
  const { user } = useAuth();
  return useQuery<CommunityElectionMembership>({
    queryKey: [`${base}/me`, user?.id], enabled: enabled && !!user,
  });
}
export function useCommunityVerifiedPeople(enabled: boolean) {
  const { user } = useAuth();
  return useQuery<CommunityVerifiedPerson[]>({
    queryKey: [`${base}/persons`, user?.id], enabled: enabled && user?.role === "admin",
  });
}
export function useCommunityAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, method = "POST", data }: { path: string; method?: string; data?: unknown }) =>
      (await apiRequest(method, `${base}${path}`, data)).json(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: [base] });
      await client.invalidateQueries({ queryKey: [`${base}/continuity`] });
      await client.invalidateQueries({ queryKey: [`${base}/me`] });
      await client.invalidateQueries({ queryKey: [`${base}/persons`] });
    },
  });
}
