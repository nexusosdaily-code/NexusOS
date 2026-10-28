import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Check, CircleAlert, Clock3, Eye, Fingerprint,
  Inbox, LockKeyhole, Mail, RefreshCw, Send, ShieldCheck, Users, Waves,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useWalletWave, useWalletWaveAction } from "@/hooks/use-wallet-wave";
import { waveTopics, type WaveCommission, type WaveItem } from "@shared/wallet-wave-communications";

const topicLabels: Record<(typeof waveTopics)[number], string> = {
  "constitutional-legal": "Constitutional & legal",
  "technical-security": "Technical security",
  "human-life-safety": "Human life & safety",
};

const fieldClass = "w-full rounded-xl border border-[#d9dfd3] bg-[#f9faf5] px-3.5 py-3 text-sm text-[#202a23] outline-none transition focus:border-[#65835e] focus:ring-2 focus:ring-[#65835e]/15 placeholder:text-[#a0a99f]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#263f32] px-4 py-3 text-sm font-semibold text-[#f7f6ed] transition hover:bg-[#345541] disabled:cursor-not-allowed disabled:opacity-45";

type PendingRequest = {
  path: string;
  data?: Record<string, unknown>;
  label: string;
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Please try again.";
}

function shortAddress(value: string) {
  return value.length > 28 ? `${value.slice(0, 12)}…${value.slice(-10)}` : value;
}

function Commitment({ item }: { item: WaveItem }) {
  return (
    <div className="mt-4 rounded-xl border border-[#dce4d8] bg-[#f1f4ed] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] ${item.verified ? "text-[#4d704e]" : "text-[#90734a]"}`}>
          {item.verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
          {item.verified ? "Commitment verified" : "Verification pending"}
        </span>
        <span className="font-mono text-[10px] text-[#788575]">Block {item.blockNumber}</span>
      </div>
      <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-[#718071]">{item.commitment}</p>
      {item.receipt && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#dce4d8] pt-2 text-[10px] text-[#68786a]">
          <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#557c55]" />{item.receipt.verified ? "Receipt verified" : "Receipt unverified"} · Account acknowledgement</span>
          <span>{dateLabel(item.receipt.readAt)}</span>
          <span className="w-full break-all font-mono">Receipt block {item.receipt.blockNumber} · {item.receipt.commitment}</span>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item, direction, disabled, onReceipt,
}: {
  item: WaveItem;
  direction: "inbox" | "outbox";
  disabled: boolean;
  onReceipt: (item: WaveItem) => void;
}) {
  const senderOrRecipient = direction === "inbox" ? item.senderAddress : item.recipientAddress;
  return (
    <article className="rounded-2xl border border-[#dce1d6] bg-[#fbfcf7] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {direction === "inbox" ? <ArrowDownLeft className="h-4 w-4 shrink-0 text-[#698365]" /> : <ArrowUpRight className="h-4 w-4 shrink-0 text-[#698365]" />}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#82907e]">{item.kind} · {direction === "inbox" ? "from" : "to"} {senderOrRecipient ? shortAddress(senderOrRecipient) : "community"}</p>
            <p className="mt-1 text-[10px] text-[#8a9587]">{dateLabel(item.createdAt)}{item.topic ? ` · ${topicLabels[item.topic as keyof typeof topicLabels] ?? item.topic}` : ""}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] ${item.status === "acknowledged" ? "bg-[#e5eee2] text-[#4c704e]" : "bg-[#f4edda] text-[#78683e]"}`}>
          {item.receipt ? "Receipt recorded" : item.status === "acknowledged" ? "Acknowledged" : "Available"}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[#4e5e51]">{item.content}</p>
      <Commitment item={item} />
      {direction === "inbox" && !item.receipt && (
        <button type="button" disabled={disabled} onClick={() => onReceipt(item)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d5dfd2] bg-[#f6f8f2] px-3 py-2 text-xs font-semibold text-[#4e694f] transition hover:bg-[#edf3e9] disabled:opacity-45">
          <Check className="h-3.5 w-3.5" />Record account acknowledgement
        </button>
      )}
    </article>
  );
}

function CommissionCard({
  commission, disabled, onReceive, onBroadcast,
}: {
  commission: WaveCommission;
  disabled: boolean;
  onReceive: (commission: WaveCommission) => void;
  onBroadcast: (commission: WaveCommission, topic: string, content: string) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const active = new Date(commission.expiresAt).getTime() > Date.now();
  const template = commission.publicBroadcasts[selected];

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-[#d5dfd1] bg-[#fbfcf7]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7eae1] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#788875]">Community commission</p>
          <p className="mt-1 break-all font-mono text-[10px] text-[#859184]">Mandate {commission.mandateId}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] ${active && commission.verified ? "bg-[#e5eee2] text-[#4d704e]" : "bg-[#f5e7de] text-[#875d4e]"}`}>
          {active && commission.verified ? "Verified · active" : !active ? "Expired" : "Unverified"}
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#839080]">Exact community instructions</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#526054]">{commission.exactInstructions}</p>
          </div>
          <div className="rounded-xl bg-[#f0f2eb] px-3.5 py-3 text-[10px] text-[#778274]">
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-[.1em]"><Clock3 className="h-3.5 w-3.5" />Expires</span>
            <span className="mt-1 block text-xs text-[#536354]">{dateLabel(commission.expiresAt)}</span>
            <span className="mt-1 block font-mono">Block {commission.blockNumber}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7eae1] pt-4">
          <span className="inline-flex items-center gap-2 text-[10px] text-[#718071]"><Fingerprint className="h-3.5 w-3.5" />{commission.verified ? "Mandate commitment verified" : "Mandate verification pending"}</span>
          <button type="button" disabled={disabled || !active || !commission.verified} onClick={() => onReceive(commission)} className="inline-flex items-center gap-2 rounded-lg border border-[#d5dfd2] px-3 py-2 text-xs font-semibold text-[#4e694f] transition hover:bg-[#edf3e9] disabled:cursor-not-allowed disabled:opacity-45">
            <Inbox className="h-3.5 w-3.5" />Receive exact commission
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-[#e5dfce] bg-[#f8f4e8] p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#806c45]">
            <Waves className="h-3.5 w-3.5" />Approved public broadcasts
          </div>
          {!active || !commission.verified ? (
            <p className="mt-2 text-xs leading-relaxed text-[#796e59]">Broadcasting is unavailable unless this verified mandate is current.</p>
          ) : commission.publicBroadcasts.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-[#796e59]">This mandate contains no approved public broadcast templates.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block space-y-1.5">
                <span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#817454]">Choose an exact approved template</span>
                <select className={fieldClass} value={selected} onChange={event => { setSelected(Number(event.target.value)); setConfirmPublic(false); }}>
                  {commission.publicBroadcasts.map((broadcast, index) => (
                    <option key={`${broadcast.topic}-${index}`} value={index}>{topicLabels[broadcast.topic as keyof typeof topicLabels] ?? broadcast.topic} · template {index + 1}</option>
                  ))}
                </select>
              </label>
              {template && (
                <div className="rounded-lg border border-[#e5dfce] bg-[#fffdf7] p-3">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#8a7b55]">Public text · shown exactly as authorised</p>
                  <p className="whitespace-pre-wrap break-words text-xs leading-6 text-[#655b45]">{template.content}</p>
                </div>
              )}
              <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#74684b]">
                <input type="checkbox" checked={confirmPublic} onChange={event => setConfirmPublic(event.target.checked)} className="mt-0.5 accent-[#806b41]" />
                I understand this will publish the exact selected text publicly; it cannot be edited here.
              </label>
              <button type="button" disabled={disabled || !template || !confirmPublic} onClick={() => template && onBroadcast(commission, template.topic, template.content)} className="inline-flex items-center gap-2 rounded-lg bg-[#665738] px-3.5 py-2.5 text-xs font-semibold text-[#fff9e9] transition hover:bg-[#56492f] disabled:cursor-not-allowed disabled:opacity-45">
                <Send className="h-3.5 w-3.5" />Publish authorised text
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function WalletWaveCommunications() {
  const { user } = useAuth();
  const overview = useWalletWave();
  const action = useWalletWaveAction();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [privateContent, setPrivateContent] = useState("");
  const [consentAddress, setConsentAddress] = useState("");
  const [tab, setTab] = useState<"inbox" | "outbox">("inbox");
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [notice, setNotice] = useState("");
  const data = overview.data;
  const working = action.isPending || !!pendingRequest;
  const hasError = !!action.error;

  const submit = (request: PendingRequest, needsKey = false) => {
    if (action.isPending) return;
    action.reset();
    const payload = needsKey ? { ...request, data: { ...request.data, idempotencyKey: crypto.randomUUID() } } : request;
    setPendingRequest(payload);
    setNotice("");
    action.mutate({ path: payload.path, data: payload.data }, {
      onSuccess: () => {
        setPendingRequest(null);
        setNotice(`${payload.label} recorded.`);
        if (payload.path === "/send") {
          setRecipientAddress("");
          setPrivateContent("");
        }
        if (payload.path === "/consent") setConsentAddress("");
      },
    });
  };

  const retry = () => {
    if (!pendingRequest || action.isPending) return;
    action.reset();
    action.mutate({ path: pendingRequest.path, data: pendingRequest.data }, {
      onSuccess: () => {
        setPendingRequest(null);
        setNotice(`${pendingRequest.label} recorded.`);
        if (pendingRequest.path === "/send") {
          setRecipientAddress("");
          setPrivateContent("");
        }
        if (pendingRequest.path === "/consent") setConsentAddress("");
      },
    });
  };

  const sendPrivate = (event: FormEvent) => {
    event.preventDefault();
    const address = recipientAddress.trim();
    const content = privateContent.trim();
    if (!address || !content || content.length > 4000) return;
    submit({ path: "/send", data: { recipientAddress: address, content }, label: "Private message" }, true);
  };

  const setConsent = (senderAddress: string, allowed: boolean) => {
    submit({ path: "/consent", data: { senderAddress, allowed }, label: "Sender consent" });
  };

  const setSubscription = (topic: string, subscribed: boolean) => {
    submit({ path: "/subscription", data: { topic, subscribed }, label: "Topic subscription" });
  };

  const receiveCommission = (commission: WaveCommission) => {
    submit({ path: `/commissions/${encodeURIComponent(commission.id)}/receive`, data: {}, label: "Commission delivery" }, true);
  };

  const publish = (commission: WaveCommission, topic: string, content: string) => {
    if (!window.confirm("Publish this exact community-authorised text publicly? This cannot be edited here.")) return;
    submit({
      path: "/broadcast",
      data: { commissionId: commission.id, topic, content, confirmPublic: true },
      label: "Public broadcast",
    }, true);
  };

  const recordReceipt = (item: WaveItem) => {
    submit({ path: `/${encodeURIComponent(item.id)}/receipt`, data: {}, label: "Account acknowledgement receipt" });
  };

  return (
    <section className="mt-12" aria-labelledby="wallet-wave-title">
      <div className="overflow-hidden rounded-[1.7rem] border border-[#d0dad0] bg-[#e9eee7]">
        <div className="relative overflow-hidden border-b border-[#d6dfd4] px-5 py-7 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full border border-[#cad7c8]" />
          <div aria-hidden="true" className="pointer-events-none absolute right-10 top-8 h-32 w-32 rounded-full border border-[#d1dbcf]" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#72836c]"><Waves className="h-4 w-4" />WalletWave · WNSP communications</p>
              <h2 id="wallet-wave-title" className="mt-3 max-w-2xl font-serif text-4xl leading-[.98] tracking-[-.045em] text-[#2c4030] sm:text-5xl">A message with<br /><em className="font-normal text-[#78906e]">boundaries.</em></h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#5e6e5e]">
                Reach members through wallet-wave addresses with explicit consent and exact community mandates—not unrestricted social messaging.
              </p>
            </div>
            <div className="max-w-sm rounded-xl border border-[#d2ddcf] bg-[#f4f6ef] p-4 text-[11px] leading-relaxed text-[#647260]">
              <p className="flex items-center gap-2 font-bold uppercase tracking-[.12em] text-[#52694f]"><LockKeyhole className="h-3.5 w-3.5" />Ledger receipts, not identity proof</p>
              <p className="mt-2">This is the NexusOS project ledger, not Bitcoin. An authenticated receipt proves this account acknowledged a message; it does not prove identity or that a human read it.</p>
            </div>
          </div>
        </div>

        {!user ? (
          <div className="p-5 sm:p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-[#d6dfd4] bg-[#f6f8f2] p-5">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#698365]" />
              <div><h3 className="font-serif text-xl text-[#334838]">Sign in to access your wave address</h3><p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#697568]">WalletWave communications are account-scoped. Sign in to manage private messages, consent, topic subscriptions, receipts, and any current community commission. Public marketing is not identity proof.</p></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-7 p-5 sm:p-8 lg:grid-cols-[.8fr_1.2fr]">
            <div className="space-y-6">
              <section className="rounded-[1.3rem] border border-[#dce1d6] bg-[#fbfcf7] p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#788875]"><Mail className="h-4 w-4" />Your wave address</div>
                {overview.isLoading ? <div className="mt-4 h-10 animate-pulse rounded-lg bg-[#e9ede5]" /> :
                  overview.isError ? <div role="alert" className="mt-4 rounded-xl border border-[#e1c9bd] bg-[#fbf1eb] p-3 text-xs text-[#79584c]">Address details could not load. <button type="button" onClick={() => void overview.refetch()} className="ml-1 font-semibold underline">Retry</button></div> :
                    <p className="mt-3 break-all rounded-lg bg-[#f0f2eb] px-3 py-3 font-mono text-xs text-[#4c604e]">{data?.address ?? "No wallet-wave address is linked to this account."}</p>}
                <p className="mt-3 text-[11px] leading-relaxed text-[#7a8678]">Share this address only with people you intend to hear from. Private messages remain subject to the project ledger’s record model.</p>
              </section>

              <form onSubmit={sendPrivate} className="rounded-[1.3rem] border border-[#dce1d6] bg-[#fbfcf7] p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#788875]"><Send className="h-4 w-4" />Private composition</div>
                <p className="mt-2 text-xs leading-relaxed text-[#778274]">Only send to a recipient address. This is not a public post.</p>
                <label className="mt-4 block space-y-1.5"><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#788575]">Recipient wave address</span>
                  <input className={`${fieldClass} font-mono text-xs`} maxLength={300} required value={recipientAddress} onChange={event => setRecipientAddress(event.target.value)} placeholder="Enter an exact wallet-wave address" />
                </label>
                <label className="mt-3 block space-y-1.5"><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#788575]">Message</span>
                  <textarea aria-label="Message" className={`${fieldClass} min-h-28 resize-y`} maxLength={4000} required value={privateContent} onChange={event => setPrivateContent(event.target.value)} placeholder="Write a private message…" />
                  <span className="block text-right text-[10px] text-[#899386]">{privateContent.length}/4000</span>
                </label>
                <button className={`${buttonClass} mt-3`} disabled={working || !recipientAddress.trim() || !privateContent.trim()}><Send className="h-4 w-4" />Send privately</button>
              </form>

              <section className="rounded-[1.3rem] border border-[#dce1d6] bg-[#fbfcf7] p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#788875]"><Users className="h-4 w-4" />Consent & subscriptions</div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-[#4f604f]">Sender permissions</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#778274]">Allow an address to send private messages to you without becoming friends, or explicitly refuse it. Refusal also overrides an accepted friendship. This permission does not let you message the other person.</p>
                  <label className="mt-3 block space-y-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#788575]">Sender wave address</span>
                    <input className={`${fieldClass} font-mono text-xs`} maxLength={300}
                      value={consentAddress} onChange={event => setConsentAddress(event.target.value)}
                      placeholder="Exact wallet or registered WNSP sender address" />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" disabled={working || !consentAddress.trim()}
                      onClick={() => setConsent(consentAddress.trim(), true)}
                      className="rounded-lg bg-[#263f32] px-3 py-2 text-xs font-semibold text-[#f7f6ed] disabled:cursor-not-allowed disabled:opacity-45">Allow sender</button>
                    <button type="button" disabled={working || !consentAddress.trim()}
                      onClick={() => setConsent(consentAddress.trim(), false)}
                      className="rounded-lg border border-[#d5dfd2] px-3 py-2 text-xs font-semibold text-[#79584c] disabled:cursor-not-allowed disabled:opacity-45">Refuse sender</button>
                  </div>
                  {(data?.consents ?? []).length ? <div className="mt-2 space-y-2">{data?.consents.map(consent => (
                    <div key={consent.senderAddress} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f0f2eb] px-3 py-2.5">
                      <span className="min-w-0 break-all font-mono text-[10px] text-[#687668]">{shortAddress(consent.senderAddress)}</span>
                      <button type="button" disabled={working} onClick={() => setConsent(consent.senderAddress, !consent.allowed)} className={`rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] disabled:opacity-45 ${consent.allowed ? "bg-[#e5eee2] text-[#4d704e]" : "bg-[#f3e9df] text-[#875e4e]"}`}>
                        {consent.allowed ? "Allowed · revoke" : "Blocked · allow"}
                      </button>
                    </div>
                  ))}</div> : <p className="mt-2 rounded-lg border border-dashed border-[#d8dfd4] px-3 py-3 text-[11px] text-[#859084]">No sender consent records yet.</p>}
                  <p className="mt-2 text-[10px] leading-relaxed text-[#899386]">Accepted friends may also send private messages unless you explicitly refuse their address.</p>
                </div>
                <div className="mt-5 border-t border-[#e7eae1] pt-4">
                  <p className="text-xs font-semibold text-[#4f604f]">Topic subscriptions</p>
                  <div className="mt-2 space-y-2">{waveTopics.map(topic => {
                    const subscription = data?.subscriptions.find(value => value.topic === topic);
                    const subscribed = subscription?.subscribed ?? false;
                    return <div key={topic} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f0f2eb] px-3 py-2.5">
                      <span className="text-xs text-[#637064]">{topicLabels[topic]}</span>
                      <button type="button" disabled={working} onClick={() => setSubscription(topic, !subscribed)} className={`rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.1em] disabled:opacity-45 ${subscribed ? "bg-[#e5eee2] text-[#4d704e]" : "bg-[#ecefe9] text-[#737d72]"}`}>{subscribed ? "Subscribed · unsubscribe" : "Unsubscribed · subscribe"}</button>
                    </div>;
                  })}</div>
                </div>
              </section>
            </div>

            <div className="space-y-7">
              <section>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#d4ddd1] pb-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#839080]">Wallet-wave ledger</p><h3 className="mt-1 font-serif text-2xl text-[#2c3c30]">Your messages</h3></div>
                  <div className="flex gap-1 rounded-full border border-[#d8dfd4] bg-[#e1e8df] p-1">
                    {(["inbox", "outbox"] as const).map(value => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-full px-3.5 py-2 text-[10px] font-semibold capitalize transition ${tab === value ? "bg-[#314b37] text-[#f5f5ed]" : "text-[#697568] hover:text-[#334738]"}`}>{value}</button>)}
                  </div>
                </div>
                {overview.isLoading && <div className="mt-4 space-y-3" aria-label="Loading wallet-wave messages">{[0, 1].map(index => <div key={index} className="h-40 animate-pulse rounded-2xl bg-[#e2e9df]" />)}</div>}
                {overview.isError && <div role="alert" className="mt-4 rounded-2xl border border-[#e1c9bd] bg-[#fbf1eb] p-4 text-xs text-[#79584c]">WalletWave could not load. {errorText(overview.error)} <button type="button" onClick={() => void overview.refetch()} className="ml-1 font-semibold underline">Retry</button></div>}
                {overview.isSuccess && (
                  <div className="mt-4 space-y-3">
                    {(tab === "inbox" ? data?.inbox : data?.outbox)?.length ? (tab === "inbox" ? data?.inbox : data?.outbox)?.map(item => (
                      <ItemCard key={item.id} item={item} direction={tab} disabled={working} onReceipt={recordReceipt} />
                    )) : <div className="rounded-2xl border border-dashed border-[#cbd5c8] bg-[#eef1e9] px-5 py-9 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#e0e8dd] text-[#6a8569]">{tab === "inbox" ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}</div>
                      <h4 className="mt-3 font-serif text-xl text-[#3a4d3c]">Nothing in your {tab}</h4><p className="mt-1 text-xs text-[#788276]">Recorded messages and their ledger commitments will appear here.</p>
                    </div>}
                  </div>
                )}
              </section>

              <section>
                <div className="border-b border-[#d4ddd1] pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#839080]">Mandated only</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#2c3c30]">Community instructions</h3>
                  <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#6c796b]">Only currently verified, unexpired commissions can be acknowledged or used. Public broadcasts are restricted to each commission’s exact approved templates.</p>
                </div>
                {overview.isLoading && <div className="mt-4 h-40 animate-pulse rounded-2xl bg-[#e2e9df]" />}
                {overview.isSuccess && (data?.commissions.length ?? 0) === 0 && <div className="mt-4 rounded-2xl border border-dashed border-[#cbd5c8] bg-[#eef1e9] p-5">
                  <p className="font-serif text-lg text-[#3a4d3c]">No current usable mandate</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#788276]">There are no currently usable commissions. Identity and role safeguards still apply; public marketing is not identity proof.</p>
                  {!data?.identityAuthorisationReady && <p className="mt-2 text-xs font-medium text-[#78683e]">Commission delivery and public broadcasts are locked until independent human verification and separate reviewer-role authorisation are connected. Private consent-based messaging remains available.</p>}
                </div>}
                {overview.isSuccess && (data?.commissions.length ?? 0) > 0 && <div className="mt-4 space-y-3">
                  {data?.commissions.map(commission => <CommissionCard key={commission.id} commission={commission} disabled={working} onReceive={receiveCommission} onBroadcast={publish} />)}
                </div>}
                {overview.isError && <div role="alert" className="mt-4 rounded-xl border border-[#e1c9bd] bg-[#fbf1eb] p-3 text-xs text-[#79584c]">Community instructions could not be loaded. <button type="button" onClick={() => void overview.refetch()} className="font-semibold underline">Retry</button></div>}
              </section>
            </div>

            {(hasError || notice || pendingRequest) && (
              <div className={`lg:col-span-2 rounded-2xl border p-4 ${hasError ? "border-[#d8b8a8] bg-[#fff7f1] text-[#784e40]" : "border-[#c9d9c5] bg-[#f3f8ef] text-[#456248]"}`}>
                {hasError ? <div role="alert" className="flex flex-wrap items-start gap-3">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1"><strong className="text-xs">Action not completed</strong><p className="mt-1 break-words text-xs">{errorText(action.error)} The same request key will be reused on retry.</p></div>
                  <button type="button" disabled={action.isPending || !pendingRequest} onClick={retry} className="rounded-lg border border-[#d7b9aa] px-3 py-2 text-xs font-semibold hover:bg-[#f6e7df] disabled:opacity-45"><RefreshCw className="mr-1 inline h-3 w-3" />Retry</button>
                  <button type="button" disabled={action.isPending} onClick={() => { setPendingRequest(null); action.reset(); }} className="rounded-lg px-2 py-2 text-xs underline disabled:opacity-45">Discard</button>
                </div> : notice ? <p role="status" className="flex items-center gap-2 text-xs"><Check className="h-4 w-4" />{notice}</p> : <p className="text-xs">Recording {pendingRequest?.label.toLowerCase()}…</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-2 border-t border-[#d6dfd4] bg-[#f2f5ef] px-5 py-4 text-[10px] leading-relaxed text-[#718071] sm:px-8">
          <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>Ledger commitments make records verifiable within this project; they do not reveal who controls an address, prove unique identity, or show that a person read a message. Public broadcasts use only the exact text approved by the community.</p>
        </div>
      </div>
    </section>
  );
}
