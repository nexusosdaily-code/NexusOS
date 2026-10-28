import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowDownToLine, ArrowUpFromLine, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

type WalletLockResponse = {
  username: string;
  locked: boolean;
  expiresAt: null;
  incomingAllowed: true;
};

const ENDPOINT = "/api/admin/wallet-lock/uncjuddy";
const QUERY_KEY = [ENDPOINT, "founder-wallet-hold"] as const;
const LOCK_PHRASE = "LOCK UNCJUDDY WALLET";
const RELEASE_PHRASE = "RELEASE UNCJUDDY WALLET";

function backendMessage(error: unknown) {
  if (!(error instanceof Error)) return "The wallet control request failed.";
  const raw = error.message.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    // The API client may already provide a plain-text backend message.
  }
  return raw;
}

export function FounderWalletHold() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isFounder = user?.role === "admin" && user.username === "Nexus";
  const userId = user?.id;
  const queryKey = [...QUERY_KEY, userId ?? null];
  const [confirmation, setConfirmation] = useState("");
  const identityRef = useRef({ userId, isFounder, revision: 0 });
  if (identityRef.current.userId !== userId || identityRef.current.isFounder !== isFounder) {
    identityRef.current = { userId, isFounder, revision: identityRef.current.revision + 1 };
  }
  const identityRevision = identityRef.current.revision;

  const statusQuery = useQuery<WalletLockResponse>({
    queryKey,
    queryFn: async () => {
      const response = await apiRequest("GET", ENDPOINT);
      return response.json() as Promise<WalletLockResponse>;
    },
    enabled: isFounder && !!userId,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
  });

  const changeLock = useMutation<WalletLockResponse, Error, { locked: boolean; confirmation: string; userId: string; revision: number }>({
    mutationFn: async (payload) => {
      const response = await apiRequest("POST", ENDPOINT, {
        locked: payload.locked,
        confirmation: payload.confirmation,
      });
      return response.json() as Promise<WalletLockResponse>;
    },
    retry: false,
    onSuccess: (result, variables) => {
      const current = identityRef.current;
      if (!current.isFounder || current.userId !== variables.userId || current.revision !== variables.revision) return;
      queryClient.setQueryData([...QUERY_KEY, variables.userId], result);
      setConfirmation("");
    },
  });

  const resetMutationRef = useRef(changeLock.reset);
  resetMutationRef.current = changeLock.reset;
  const previousIdentityRevision = useRef(identityRevision);
  useLayoutEffect(() => {
    if (previousIdentityRevision.current !== identityRevision) {
      previousIdentityRevision.current = identityRevision;
      setConfirmation("");
      resetMutationRef.current();
    }
  }, [identityRevision]);

  useEffect(() => {
    return () => {
      if (userId) {
        queryClient.removeQueries({ queryKey: [...QUERY_KEY, userId], exact: true });
      }
    };
  }, [queryClient, userId, isFounder]);

  if (!isFounder || !userId) return null;

  const status = statusQuery.data;
  const phrase = status?.locked ? RELEASE_PHRASE : LOCK_PHRASE;
  const nextLockedState = status ? !status.locked : false;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status || !userId || confirmation !== phrase || changeLock.isPending) return;
    changeLock.mutate({ locked: nextLockedState, confirmation: phrase, userId, revision: identityRef.current.revision });
  }

  return (
    <section
      aria-labelledby="founder-wallet-hold-title"
      className="mb-10 overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/35 via-slate-900 to-slate-900"
    >
      <div className="flex items-center gap-3 border-b border-amber-500/15 px-5 py-5 sm:px-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-900/30 text-amber-300">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400/75">Founder control · uncjuddy</p>
          <h2 id="founder-wallet-hold-title" className="mt-1 text-base font-semibold text-white">Outgoing wallet hold</h2>
        </div>
        <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-slate-400 sm:inline-flex">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" /> BTC-secret session
        </span>
      </div>

      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(250px,0.78fr)]">
        <div>
          {statusQuery.isLoading && (
            <div aria-label="Loading wallet hold status" className="space-y-3">
              <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-800" />
              <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-800/70" />
              <div className="h-4 w-3/4 max-w-sm animate-pulse rounded bg-slate-800/70" />
            </div>
          )}

          {statusQuery.isError && (
            <div role="alert" className="rounded-xl border border-rose-800/60 bg-rose-950/30 p-4">
              <div className="flex items-start gap-2.5 text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Wallet hold status unavailable</p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-rose-200/80">{backendMessage(statusQuery.error)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => statusQuery.refetch()}
                disabled={statusQuery.isFetching}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-800/70 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-900/40 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry status check
              </button>
            </div>
          )}

          {status && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${status.locked ? "border-amber-500/30 bg-amber-950/40 text-amber-200" : "border-emerald-700/40 bg-emerald-950/30 text-emerald-200"}`}>
                  <span className={`h-2 w-2 rounded-full ${status.locked ? "bg-amber-400" : "bg-emerald-400"}`} />
                  {status.locked ? "Wallet locked" : "Wallet released"}
                </span>
                {status.expiresAt === null && status.locked && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-amber-300/70">No expiry · until founder release</span>
                )}
              </div>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-slate-300">
                {status.locked
                  ? "Outgoing application funds are held indefinitely until Nexus explicitly releases this wallet."
                  : "Outgoing application funds are currently available; you can place an indefinite hold below."}
                {" "}Incoming credits remain allowed.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5"><ArrowDownToLine className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> Incoming credits allowed</span>
                <span className="inline-flex items-center gap-1.5"><ArrowUpFromLine className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> Outgoing application funds {status.locked ? "held" : "available"}</span>
              </div>
            </>
          )}
        </div>

        <aside className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Control boundary</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            This holds outgoing application funds only. It does not move funds, change balances, or freeze external keys.
          </p>

          {status && (
            <form onSubmit={submit} className="mt-5 border-t border-slate-800 pt-4">
              <label htmlFor="wallet-hold-confirmation" className="block text-xs font-medium text-slate-300">
                Type to {status.locked ? "release this hold" : "lock this wallet"}
              </label>
              <code className="mt-2 block break-all rounded-md bg-slate-900 px-2.5 py-2 font-mono text-[11px] text-amber-200">
                {phrase}
              </code>
              <input
                id="wallet-hold-confirmation"
                aria-label="Type confirmation phrase"
                autoComplete="off"
                spellCheck={false}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/10"
                placeholder="Enter phrase exactly"
              />
              {changeLock.isError && (
                <p role="alert" className="mt-3 rounded-lg border border-rose-900/60 bg-rose-950/30 px-3 py-2.5 text-xs leading-relaxed text-rose-200">
                  Change not confirmed. {backendMessage(changeLock.error)}
                </p>
              )}
              {changeLock.isSuccess && (
                <p role="status" className="mt-3 text-xs leading-relaxed text-emerald-300">
                  Server confirmed the {changeLock.data.locked ? "wallet hold" : "release"}.
                </p>
              )}
              <button
                type="submit"
                disabled={confirmation !== phrase || changeLock.isPending}
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${status.locked ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "bg-slate-200 text-slate-950 hover:bg-white"}`}
              >
                {changeLock.isPending ? "Updating wallet hold" : status.locked ? "Release wallet hold" : "Lock wallet indefinitely"}
              </button>
              {status.locked && <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-600">Release requires the exact phrase above and a founder-authorized session.</p>}
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
