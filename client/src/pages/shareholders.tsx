import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronRight, Code2, ExternalLink, Globe, LoaderCircle, LockKeyhole, RefreshCw, Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { FounderWalletHold } from "@/components/founder-wallet-hold";

type FoundingOwner = {
  rank: number;
  username: string;
  band: string;
  nxt: number;
  joined: string;
  wallet: string;
};

type FoundingOwnersResponse = {
  owners: FoundingOwner[];
  disclosureDate: string;
  replacementComplete: boolean;
  transferId: string | null;
};

type GiftResponse = {
  ok: true;
  alreadyCompleted: boolean;
  transferId: string;
};

const REGISTER_QUERY_KEY = ["/api/founding-owners"];
const TOTAL_SUPPLY = 21_000_000_000;
const GIFT_AMOUNT = 500_000_000;

const BAND_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  SYSTEM: { bg: "bg-violet-900/30", text: "text-violet-300", dot: "bg-violet-400" },
  KERNEL: { bg: "bg-cyan-900/30", text: "text-cyan-300", dot: "bg-cyan-400" },
  USER: { bg: "bg-green-900/30", text: "text-green-300", dot: "bg-green-400" },
  GUEST: { bg: "bg-slate-800/50", text: "text-slate-400", dot: "bg-slate-500" },
};

function fmt(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(3)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return n.toLocaleString();
}

function messageFromError(error: unknown) {
  if (!(error instanceof Error)) return "The request could not be completed. Please try again.";
  return error.message.replace(/^\d{3}:\s*/, "");
}

export default function ShareholdersPage() {
  const [showWallets, setShowWallets] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [publicName, setPublicName] = useState("Owner 01");
  const [confirmed, setConfirmed] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canReassign = user?.role === "admin" && user.username?.toLowerCase() === "nexus";

  const registerQuery = useQuery<FoundingOwnersResponse>({
    queryKey: REGISTER_QUERY_KEY,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const giftMutation = useMutation<GiftResponse, Error, { recipientEmail: string; publicName: string }>({
    mutationFn: async ({ recipientEmail: email, publicName: name }) => {
      const response = await apiRequest("POST", "/api/admin/founding-owner-gift", {
        recipientEmail: email,
        publicName: name,
        confirm: true,
      });
      return response.json() as Promise<GiftResponse>;
    },
    retry: false,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REGISTER_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["/api/wallet"] }),
      ]);
      setRecipientEmail("");
      setPublicName("Owner 01");
      setConfirmed(false);
    },
  });

  const register = registerQuery.data;
  const owners = register?.owners ?? [];
  const totalAllocated = owners.reduce((sum, owner) => sum + owner.nxt, 0);
  const remaining = TOTAL_SUPPLY - totalAllocated;
  const pctAllocated = (totalAllocated / TOTAL_SUPPLY * 100).toFixed(2);
  const pctRemaining = (remaining / TOTAL_SUPPLY * 100).toFixed(2);

  function submitGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || giftMutation.isPending || register?.replacementComplete) return;
    giftMutation.mutate({ recipientEmail: recipientEmail.trim(), publicName: publicName.trim() });
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/crowdfund" className="text-sm text-slate-400 transition-colors hover:text-white">
            ← Crowdfund
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Public disclosure{register?.disclosureDate ? ` · ${register.disclosureDate}` : ""}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-16">
        <section className="mb-12 text-center sm:mb-16">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-900/20 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-amber-400">
            <Shield className="h-3 w-3" /> Protocol owner register
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            NexusOS founding allocations
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            A public record of the 21 founding NXT allocations. These figures are a historical snapshot, not live wallet balances.
          </p>
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-left text-xs leading-relaxed text-amber-200/80">
            This protocol register is not proof of company equity. Holding NXT does not automatically make a person a legal shareholder.
          </div>
        </section>

        {registerQuery.isLoading && (
          <section aria-label="Loading owner register" className="mb-10 space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />)}
            </div>
            <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
          </section>
        )}

        {registerQuery.isError && (
          <section role="alert" className="mb-10 rounded-2xl border border-rose-900/60 bg-rose-950/20 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-5 w-5 text-rose-400" />
            <h2 className="mb-1 text-sm font-semibold text-rose-200">The public register is unavailable</h2>
            <p className="mb-4 text-xs text-rose-200/60">No locally stored or estimated owner data is shown.</p>
            <button onClick={() => registerQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-rose-800 px-3 py-2 text-xs text-rose-100 hover:bg-rose-900/40">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </section>
        )}

        {!registerQuery.isLoading && !registerQuery.isError && register && (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Founding seats", value: owners.length.toString(), sub: "historical allocations" },
                { label: "Allocated in snapshot", value: fmt(totalAllocated), sub: `${pctAllocated}% of supply` },
                { label: "Unallocated supply", value: fmt(remaining), sub: `${pctRemaining}% of supply` },
                { label: "Protocol supply cap", value: "21B NXT", sub: "fixed maximum" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-center sm:p-5">
                  <div className="font-mono text-xl font-bold text-white sm:text-2xl">{stat.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{stat.label}</div>
                  <div className="mt-0.5 text-[11px] text-slate-600">{stat.sub}</div>
                </div>
              ))}
            </div>

            <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
              <div className="mb-2 flex justify-between gap-4 font-mono text-[10px] text-slate-500 sm:text-xs">
                <span>Recorded allocation · {pctAllocated}%</span>
                <span>Unallocated · {pctRemaining}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${Math.min(Number(pctAllocated), 100)}%` }} />
              </div>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-600">
                The original allocation figures were disclosed on 17 June 2026; this display does not track present-day balances.
                {register.replacementComplete && " Seat 01 reflects the later recorded 500 million NXT gift; the other rows retain their original allocation figures."}
              </p>
            </section>

            <section className="mb-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-white">Founding owner register</h2>
                  <p className="mt-1 text-[10px] text-slate-500">Register updated · {register.disclosureDate} · allocation figures are historical</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWallets((current) => !current)}
                  className="text-right font-mono text-[10px] text-slate-500 transition-colors hover:text-slate-300 sm:text-[11px]"
                  aria-expanded={showWallets}
                >
                  {showWallets ? "Hide" : "Show"}<span className="hidden sm:inline"> wallet addresses</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60">
                      <th className="w-12 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Seat</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Band</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Snapshot NXT</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Supply</th>
                      {showWallets && <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Wallet address</th>}
                      <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner, index) => {
                      const band = BAND_STYLE[owner.band] ?? BAND_STYLE.USER;
                      return (
                        <tr key={`${owner.rank}-${owner.username}`} className={`border-b border-slate-800/30 transition-colors hover:bg-slate-800/20 ${index % 2 ? "bg-slate-900/20" : ""}`}>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{String(owner.rank).padStart(2, "0")}</td>
                          <td className="px-4 py-3 font-semibold text-white">{owner.username}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${band.bg} ${band.text}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${band.dot}`} />{owner.band}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-white sm:text-sm">
                            {owner.nxt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">{(owner.nxt / TOTAL_SUPPLY * 100).toFixed(4)}%</td>
                          {showWallets && <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{owner.wallet}</td>}
                          <td className="px-4 py-3 text-right font-mono text-xs text-slate-500">{owner.joined}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {owners.length === 0 && <div className="px-6 py-10 text-center text-sm text-slate-500">The public register contains no owner records.</div>}
            </section>
          </>
        )}

        {canReassign && register && (
          <section className="mb-10 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900">
            <div className="border-b border-amber-500/10 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-900/40 text-amber-300">
                  {register.replacementComplete ? <Check className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400/70">Founder control · seat 01</p>
                  <h2 className="mt-1 text-base font-semibold text-white">One-time owner reassignment</h2>
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-7">
              {register.replacementComplete ? (
                <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><Check className="h-4 w-4" /> Allocation reassignment completed</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    The register reports the 500,000,000 NXT seat 01 gift as complete. Updated disclosure: {register.disclosureDate}.
                  </p>
                  {register.transferId && <p className="mt-3 break-all font-mono text-[11px] text-slate-500">Transfer reference: {register.transferId}</p>}
                </div>
              ) : (
                <>
                  <p className="mb-5 max-w-3xl text-xs leading-relaxed text-slate-400">
                    This is a single, irreversible reassignment of seat 01. Exactly <strong className="text-amber-200">500,000,000 NXT</strong> moves from Dsmart; any residual balance remains with Dsmart. The inactive account remains blocked. The recipient replaces the current seat 01 register entry. No transfer is considered complete until the server confirms it.
                  </p>
                  <form onSubmit={submitGift} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs text-slate-400">
                        Recipient email
                        <input
                          required
                          type="email"
                          aria-label="Recipient email"
                          autoComplete="off"
                          value={recipientEmail}
                          onChange={(event) => setRecipientEmail(event.target.value)}
                          placeholder="recipient@example.org"
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
                        />
                        <span className="mt-1.5 block text-[10px] text-slate-600">Used only to resolve the recipient account; never shown in the public register.</span>
                      </label>
                      <label className="block text-xs text-slate-400">
                        Public display name
                        <input
                          required
                          maxLength={80}
                          value={publicName}
                          onChange={(event) => setPublicName(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-3 text-sm text-white outline-none transition focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10"
                        />
                      </label>
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-950/40 p-4 text-xs leading-relaxed text-slate-300">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
                      />
                      <span>I confirm one-time reassignment of precisely 500,000,000 NXT from Dsmart, with any residual retained, the inactive account still blocked, and the recipient replacing seat 01.</span>
                    </label>
                    {giftMutation.isError && (
                      <div role="alert" className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-xs leading-relaxed text-rose-200">
                        <span className="font-semibold">Reassignment not confirmed.</span> {messageFromError(giftMutation.error)}
                      </div>
                    )}
                    {giftMutation.isSuccess && (
                      <div role="status" className="rounded-xl border border-emerald-700/40 bg-emerald-950/30 px-4 py-3 text-xs leading-relaxed text-emerald-200">
                        Server confirmation received. Transfer reference: <span className="break-all font-mono">{giftMutation.data.transferId}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={!confirmed || !recipientEmail.trim() || !publicName.trim() || giftMutation.isPending}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                    >
                      {giftMutation.isPending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Submitting reassignment</> : "Confirm one-time reassignment"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        )}

        {user?.role === "admin" && user.username === "Nexus" && <FounderWalletHold />}

        <section className="mb-10 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-900/10 via-slate-900 to-violet-900/10 p-6 sm:p-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-900/40"><Code2 className="h-5 w-5 text-cyan-400" /></div>
            <div>
              <h2 className="mb-1 text-lg font-bold text-white sm:text-xl">WavelengthScript · the everyday tool</h2>
              <p className="text-sm leading-relaxed text-slate-400">An interpreter bridging software languages into the NexusOS physics stack. Developers can execute their logic through WavelengthScript.</p>
            </div>
          </div>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Execution path</div>
              {[
                ["1. Paste a language", "Python, JavaScript, Rust, Go"],
                ["2. Transpile", "Map logic to spectral operations"],
                ["3. Compile", "Produce physics-native bytecode"],
                ["4. Execute", "Run on WNSP VM channel registers"],
              ].map(([step, description]) => (
                <div key={step} className="mb-3 flex items-start gap-3 last:mb-0">
                  <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-cyan-500" />
                  <div><div className="text-xs font-semibold text-white">{step}</div><div className="text-[11px] text-slate-500">{description}</div></div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">A different target</div>
              <p className="mb-3 text-xs leading-relaxed text-slate-400">WavelengthScript targets a <em className="text-cyan-300">wavelength</em> rather than a CPU instruction set. The architecture is designed with future photonic hardware in mind.</p>
              <p className="text-xs leading-relaxed text-slate-400">Explore the language and pipeline directly. Register allocations are separate from this developer tooling.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ce-se-pipeline" className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"><Zap className="h-4 w-4" /> Try the pipeline</Link>
            <Link href="/wavelength-lang" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"><Code2 className="h-4 w-4" /> Language spec</Link>
            <Link href="/developer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"><Globe className="h-4 w-4" /> Developer API</Link>
          </div>
        </section>

        <footer className="text-center">
          <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-slate-600">
            Voluntary public disclosure of founding NXT allocations on the NexusOS blockchain. This protocol owner register does not establish company equity or legal shareholder status; holding NXT alone does not confer either. Original figures date from 17 June 2026, with any completed seat 01 gift recorded separately. These are not live balances. AGPL-3.0 · wnsp.io
          </p>
          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-700"><ExternalLink className="h-3 w-3" /> Public protocol record</div>
        </footer>
      </main>
    </div>
  );
}