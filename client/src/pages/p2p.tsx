import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useP2PMarket, p2pRequest } from "@/hooks/use-p2p-market";
import type { P2PListing, P2PLive, P2POrder } from "@shared/p2p-market";
import P2PFileExchange from "@/components/p2p-file-exchange";
import WaveRecipientPicker from "@/components/wave-recipient-picker";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BadgeCheck,
  CircleAlert, Clock3, Copy, FilePlus2, Globe2, LockKeyhole, Radio,
  RefreshCw, ShieldCheck, ShoppingBag, Signal, Sparkles, Tag, Users, Video,
  Wallet, X,
} from "lucide-react";

type Tab = "discover" | "orders" | "files";
type Category = P2PListing["category"];
const categories: Array<{ id: Category; label: string }> = [
  { id: "file", label: "Files" }, { id: "service", label: "Services" },
  { id: "goods", label: "Goods" }, { id: "advertising", label: "Advertising" },
];
const panel = "rounded-2xl border border-[#d6d3c8] bg-[#f8f7f1]";
const field = "min-h-11 w-full rounded-xl border border-[#d4d1c6] bg-[#fdfcf8] px-3.5 text-sm text-[#202d2b] placeholder:text-[#9b9c91] outline-none transition focus:border-[#287c70] focus:ring-2 focus:ring-[#287c70]/10";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#155b50] px-4 text-sm font-semibold text-[#f4f3e8] transition hover:bg-[#0e493f] disabled:cursor-not-allowed disabled:opacity-50";
const quiet = "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#d4d1c6] px-3 text-xs font-semibold text-[#40524e] transition hover:border-[#8caaa2] hover:bg-[#eeeee6] disabled:opacity-50";
const formatSats = (value: string | number) => {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat("en-US").format(number) : value;
};
const waveShort = (address: string) => address.length > 28 ? `${address.slice(0, 13)}…${address.slice(-10)}` : address;

function Sats({ value, large = false }: { value: string | number; large?: boolean }) {
  return <span className={`font-mono tabular-nums ${large ? "text-2xl font-semibold tracking-tight" : "font-semibold"}`}>{formatSats(value)} <span className="text-[0.72em] font-sans font-medium tracking-wide text-[#75837c]">sats</span></span>;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "rose" | "blue" }) {
  const tones = {
    neutral: "border-[#d5d4c8] bg-[#efeee7] text-[#65716a]",
    green: "border-[#a7c8b7] bg-[#e6f0e7] text-[#28614c]",
    amber: "border-[#e2c89d] bg-[#f7eedc] text-[#86622c]",
    rose: "border-[#dfbbb1] bg-[#f5e9e4] text-[#8a5040]",
    blue: "border-[#bfd0cf] bg-[#e9f0ec] text-[#3d6867]",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em] ${tones[tone]}`}>{children}</span>;
}

function StateMessage({ title, detail, retry }: { title: string; detail: string; retry?: () => void }) {
  return <div className="rounded-2xl border border-dashed border-[#cbc9be] bg-[#f4f3ec] px-6 py-10 text-center">
    <div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-[#d9d7cc] bg-[#ebeae1] text-[#62756d]"><CircleAlert className="h-5 w-5" /></div>
    <h3 className="mt-3 text-sm font-semibold text-[#344540]">{title}</h3>
    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#7b8178]">{detail}</p>
    {retry && <button type="button" onClick={retry} className={`${quiet} mt-4`}><RefreshCw className="h-3.5 w-3.5" /> Try again</button>}
  </div>;
}

function ListingCard({ listing, own, onBuy, onCancel, busy, paymentsEnabled, copy, copied }: {
  listing: P2PListing; own: boolean; onBuy: (listing: P2PListing) => void; onCancel: (listing: P2PListing) => void;
  busy: boolean; paymentsEnabled: boolean; copy: (value: string, key?: string) => void; copied: string;
}) {
  const categoryIcon = listing.category === "file" ? <ArrowDownLeft /> : listing.category === "service" ? <Sparkles /> : <Tag />;
  return <article className="group flex min-h-[246px] flex-col rounded-2xl border border-[#d7d5ca] bg-[#fbfaf5] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#9db9ad] hover:shadow-[0_12px_35px_-28px_rgba(28,66,54,.5)]" data-testid={`listing-${listing.id}`}>
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#d6ded3] bg-[#edf1e8] text-[#387365]">{categoryIcon}</span>
      <Pill tone={listing.isPublic ? "green" : "amber"}>{listing.isPublic ? <Globe2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{listing.isPublic ? "Public" : "Invite only"}</Pill>
    </div>
    <div className="mt-4 flex-1">
      <div className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#869087]">{listing.category}</div>
      <h3 data-testid="listing-title" className="mt-1.5 break-words font-[var(--font-display)] text-xl font-semibold leading-tight text-[#263632]">{listing.title}</h3>
      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-[#737a70]">{listing.description || "A direct offer from this wave address."}</p>
    </div>
    <div className="mt-5 flex items-end justify-between gap-2 border-t border-[#e7e5db] pt-4">
      <div><div className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#8a9187]">Asking price</div><div data-testid="listing-price" className="mt-1"><Sats large value={listing.priceSats} /></div></div>
      {own ? <button type="button" disabled={busy || listing.status !== "active"} onClick={() => onCancel(listing)} className={quiet} data-testid="listing-cancel"><X className="h-3.5 w-3.5" />{busy ? "Working…" : "Cancel"}</button>
        : <button type="button" disabled={busy || listing.status !== "active" || !paymentsEnabled} onClick={() => onBuy(listing)} className={primary} data-testid="listing-buy">{busy ? "Starting…" : paymentsEnabled ? "View & buy" : "Payments paused"}<ArrowUpRight className="h-4 w-4" /></button>}
    </div>
    <div className="mt-3 flex items-center gap-2 text-[10px] text-[#81877e]">
      <span className="min-w-0 truncate font-mono" title={listing.sellerWave}>{waveShort(listing.sellerWave)}</span>
      <button type="button" onClick={() => copy(listing.sellerWave, `seller-${listing.id}`)} className="inline-flex shrink-0 items-center gap-1 hover:text-[#155b50]" aria-label="Copy seller wave address"><Copy className="h-3 w-3" />{copied === `seller-${listing.id}` ? "Copied" : "Copy"}</button>
    </div>
  </article>;
}

function OrderCard({ order, userId, busy, onAction, copy, copied }: {
  order: P2POrder; userId: string; busy: boolean; onAction: (order: P2POrder, action: "deliver" | "accept" | "refund" | "dispute") => void;
  copy: (value: string, key?: string) => void; copied: string;
}) {
  const buyer = order.buyerId === userId;
  const statusTone = order.status === "released" ? "green" : order.status === "refunded" ? "rose" : order.status === "disputed" ? "amber" : "blue";
  const actions: Array<"deliver" | "accept" | "refund" | "dispute"> = order.status === "funded"
    ? buyer ? ["dispute"] : ["deliver", "refund", "dispute"]
    : order.status === "delivered" ? buyer ? ["accept", "dispute"] : ["dispute"]
      : order.status === "disputed" ? buyer ? ["accept", "dispute"] : ["refund", "dispute"] : [];
  const label: Record<string, string> = { funded: "Funds held · seller to deliver", delivered: "Delivered · buyer decision needed", disputed: "Disputed · funds remain held", released: "Released to seller", refunded: "Refunded to buyer" };
  const counterpart = buyer ? order.sellerWave : order.buyerWave;
  return <article className="rounded-2xl border border-[#d8d6cb] bg-[#fbfaf5] p-5" data-testid={`order-${order.id}`}>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><Pill tone={statusTone}>{order.status === "released" ? <BadgeCheck className="h-3 w-3" /> : order.status === "disputed" ? <CircleAlert className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{label[order.status] ?? order.status}</Pill><span className="text-[10px] uppercase tracking-wider text-[#8a9187]">{buyer ? "You are buyer" : "You are seller"}</span></div>
        <h3 className="mt-3 font-[var(--font-display)] text-lg font-semibold text-[#2b3934]">{order.title}</h3>
        <p className="mt-1 text-xs text-[#777e74]">Counterparty <span className="font-mono text-[#4e6058]">{waveShort(counterpart)}</span>
          <button type="button" onClick={() => copy(counterpart, `counter-${order.id}`)} className="ml-2 inline-flex items-center gap-1 text-[#39776a] hover:text-[#174e43]"><Copy className="h-3 w-3" />{copied === `counter-${order.id}` ? "Copied" : "Copy wave"}</button>
        </p>
        {order.note && <p className="mt-3 rounded-lg bg-[#f0efe8] px-3 py-2 text-xs leading-relaxed text-[#66736b]">{order.note}</p>}
      </div>
      <div className="sm:text-right"><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#898f84]">{order.status === "released" ? "Paid out" : order.status === "refunded" ? "Returned" : "Held in app ledger"}</div><div className="mt-1"><Sats large value={order.amountSats} /></div></div>
    </div>
    {order.status !== "released" && order.status !== "refunded" && <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e8e6dc] pt-4">
      {actions.map(action => <button type="button" key={action} disabled={busy} onClick={() => onAction(order, action)}
        data-testid={`order-${action}`} className={action === "accept" ? primary : action === "dispute" || action === "refund" ? "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#dfc7b3] px-3 text-xs font-semibold text-[#855b3c] hover:bg-[#f6eee5] disabled:opacity-50" : quiet}>
        {action === "deliver" ? "Mark delivered" : action === "accept" ? "Accept & release" : action === "refund" ? "Refund buyer" : "Open dispute"}
      </button>)}
      <p className="basis-full text-[10px] leading-relaxed text-[#8a8d82]">{order.status === "disputed" ? "A resolution is still manual: the buyer can accept and release, or the seller can refund. Funds remain held until then." : "Acceptance releases the held sats to the seller and cannot be reversed."}</p>
    </div>}
  </article>;
}

export default function P2PPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const market = useP2PMarket(isAuthenticated, user?.id);
  const [tab, setTab] = useState<Tab>("discover");
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("file");
  const [price, setPrice] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [recipients, setRecipients] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedBuy, setSelectedBuy] = useState<P2PListing | null>(null);
  const [acceptingAction, setAcceptingAction] = useState<{ order: P2POrder; action: "deliver" | "accept" | "refund" | "dispute" } | null>(null);
  const [note, setNote] = useState("");
  const [acceptanceConfirmed, setAcceptanceConfirmed] = useState(false);
  const [guestStream, setGuestStream] = useState<P2PLive | null>(null);
  const [guests, setGuests] = useState<Array<{ userId: string; waveAddress: string }>>([]);
  const [guestAddress, setGuestAddress] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAddress, setTipAddress] = useState("");
  const [tipAmount, setTipAmount] = useState("");
  const [tipError, setTipError] = useState("");
  const [copied, setCopied] = useState("");
  const requestIds = useRef(new Map<string, string>());
  const guestSession = useRef(0);
  const activeUserId = useRef(user?.id);
  activeUserId.current = user?.id;
  const intentOwner = useRef<string | undefined>(user?.id);
  const tipIntent = useRef<{ requestId: string; recipient: string; amountSats: number } | null>(null);
  if (intentOwner.current !== user?.id) {
    requestIds.current.clear();
    tipIntent.current = null;
    intentOwner.current = user?.id;
  }
  useLayoutEffect(() => {
    guestSession.current++;
    setSelectedBuy(null);
    setTipOpen(false);
    setTipAddress("");
    setTipAmount("");
    setGuestStream(null);
    setGuests([]);
    setGuestError("");
    setGuestAddress("");
    setGuestLoading(false);
  }, [user?.id]);
  useEffect(() => () => { guestSession.current++; }, []);
  const listings = market.listings.data?.listings ?? [];
  const account = market.account.data;
  const paymentActionsEnabled = isAuthenticated
    && market.paymentsPolicy.isSuccess
    && !market.paymentsPolicy.isFetching
    && market.paymentsPolicy.data.enabled === true
    && market.account.isSuccess
    && !market.account.isFetching
    && account?.paymentsEnabled === true;
  const allListings = useMemo(() => {
    const ownAndInvited = account?.listings ?? [];
    const map = new Map<string, P2PListing>();
    [...listings, ...ownAndInvited].forEach(item => map.set(item.id, item));
    return [...map.values()];
  }, [listings, account?.listings]);
  const shownListings = allListings.filter(item => item.status === "active" && (filter === "all" || item.category === filter));
  const liveStreams = (market.live.data?.streams ?? []) as P2PLive[];
  const myStreams = isAuthenticated ? liveStreams.filter(item => item.broadcasterId === user?.id) : [];
  const copyValue = async (value: string, key = value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1600);
    } catch { setCopied("copy-failed"); }
  };
  const refreshAll = () => { void market.listings.refetch(); void market.live.refetch(); void market.paymentsPolicy.refetch(); if (isAuthenticated) void market.account.refetch(); };
  const resetListingForm = () => {
    setCreateOpen(false); setTitle(""); setDescription(""); setPrice(""); setRecipients("");
    setCategory("file"); setIsPublic(true); setFormError("");
  };
  const createListing = async () => {
    setFormError("");
    const parsedPrice = Number(price);
    const recipientList = [...new Set(recipients.split(/[\n,]/).map(item => item.trim()).filter(Boolean))];
    if (!title.trim()) return setFormError("Give the listing a title.");
    if (!Number.isInteger(parsedPrice) || parsedPrice < 1 || parsedPrice > 10_000_000_000) return setFormError("Enter a whole-number price from 1 to 10,000,000,000 sats.");
    if (!isPublic && recipientList.length === 0) return setFormError("Add at least one exact wave address for a private listing.");
    if (recipientList.length > 20) return setFormError("Private listings can invite up to 20 wave addresses.");
    try {
      await market.createListing.mutateAsync({ title: title.trim(), description: description.trim(), category, priceSats: parsedPrice, isPublic, recipients: isPublic ? [] : recipientList });
      resetListingForm();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Could not publish listing."); }
  };
  const buyListing = async () => {
    if (!selectedBuy || !paymentActionsEnabled) return;
    const listing = selectedBuy;
    const requestId = requestIds.current.get(listing.id) ?? crypto.randomUUID();
    requestIds.current.set(listing.id, requestId);
    try {
      await market.buy.mutateAsync({ id: listing.id, requestId });
      requestIds.current.delete(listing.id);
      setSelectedBuy(null);
    } catch { /* Retain the id for safe retry. */ }
  };
  const actionOrder = async () => {
    if (!acceptingAction) return;
    const { order, action } = acceptingAction;
    try {
      await market.orderAction.mutateAsync({
        id: order.id, action, note: action === "accept" ? undefined : note.trim() || undefined,
        ...(action === "accept" || action === "refund" ? { confirm: true as const } : {}),
      });
      setAcceptingAction(null); setNote(""); setAcceptanceConfirmed(false);
    } catch { /* Error is shown in the persistent account error notice. */ }
  };
  const openGuests = async (stream: P2PLive) => {
    const ownerId = user?.id;
    const session = ++guestSession.current;
    setGuestStream(stream); setGuestError(""); setGuests([]); setGuestLoading(true);
    try {
      const response = await p2pRequest<{ guests: Array<{ userId: string; waveAddress: string }> }>(`/api/p2p/live/${encodeURIComponent(stream.id)}/guests`);
      if (activeUserId.current === ownerId && guestSession.current === session) setGuests(response.guests);
    } catch (error) { if (activeUserId.current === ownerId && guestSession.current === session) setGuestError(error instanceof Error ? error.message : "Could not load invited guests."); }
    finally { if (activeUserId.current === ownerId && guestSession.current === session) setGuestLoading(false); }
  };
  const modifyGuest = async (address: string, userId?: string) => {
    if (!guestStream) return;
    const ownerId = user?.id;
    const session = guestSession.current;
    const stream = guestStream;
    setGuestError("");
    try {
      if (userId) await p2pRequest(`/api/p2p/live/${encodeURIComponent(stream.id)}/guests/${encodeURIComponent(userId)}`, { method: "DELETE" });
      else await p2pRequest(`/api/p2p/live/${encodeURIComponent(stream.id)}/guests`, { method: "POST", body: JSON.stringify({ address }) });
      if (activeUserId.current !== ownerId || guestSession.current !== session) return;
      setGuestAddress("");
      await openGuests(stream);
    } catch (error) { if (activeUserId.current === ownerId && guestSession.current === session) setGuestError(error instanceof Error ? error.message : "Could not update invitations."); }
  };
  const sendTip = async () => {
    setTipError("");
    if (!paymentActionsEnabled) return setTipError("Payments are not currently enabled for this account.");
    const amount = Number(tipAmount);
    if (!tipAddress.trim()) return setTipError("Enter the recipient's exact wave address.");
    if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000_000) return setTipError("Enter a whole-number amount from 1 to 10,000,000,000 sats.");
    try {
      const recipient = tipAddress.trim();
      const intent = tipIntent.current;
      const requestId = intent?.recipient === recipient && intent.amountSats === amount
        ? intent.requestId
        : crypto.randomUUID();
      tipIntent.current = { requestId, recipient, amountSats: amount };
      await market.sendTip.mutateAsync({ recipient, amountSats: amount, requestId });
      tipIntent.current = null;
      setTipOpen(false); setTipAddress(""); setTipAmount("");
    } catch (error) { setTipError(error instanceof Error ? error.message : "Tip did not send."); }
  };
  const cancelListing = async (listing: P2PListing) => {
    if (!window.confirm(`Cancel “${listing.title}”? This removes the active offer.`)) return;
    try { await market.deleteListing.mutateAsync(listing.id); } catch { /* Shared error notice. */ }
  };
  const beginOrderAction = (order: P2POrder, action: "deliver" | "accept" | "refund" | "dispute") => {
    setNote("");
    setAcceptanceConfirmed(false);
    setAcceptingAction({ order, action });
  };
  const marketError = market.listings.error || market.account.error || market.live.error || market.buy.error || market.orderAction.error || market.deleteListing.error || market.sendTip.error;
  const selectedRequestId = selectedBuy ? requestIds.current.get(selectedBuy.id) : "";
  const stats = [
    { label: "Public offers", value: String(listings.length), icon: <ShoppingBag className="h-4 w-4" /> },
    { label: "Live now", value: String(liveStreams.length), icon: <Radio className="h-4 w-4" /> },
    { label: "Platform fee", value: "0 sats", icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  return <main className="min-h-[100dvh] bg-[#eeede5] text-[#25332f]" data-testid="p2p-market">
    <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-5 sm:px-7 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d7d5ca] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid h-9 w-9 place-items-center rounded-xl border border-[#d6d4c9] bg-[#f7f6ef] text-[#68776f] transition hover:text-[#155b50]" aria-label="Back home"><ArrowLeftRight className="h-4 w-4" /></Link>
          <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4f8e72]" /><span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#587469]">NexusOS · Wave network</span></div><h1 className="mt-0.5 font-[var(--font-display)] text-xl font-semibold tracking-tight text-[#273a34] sm:text-2xl">P2P exchange</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/marketplace" className="min-h-9 rounded-xl px-3 py-2 text-xs font-medium text-[#738078] transition hover:bg-[#e4e5da] hover:text-[#2f5146]">Token marketplace <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
          <Link href="/streaming?create=private" className="min-h-9 rounded-xl px-3 py-2 text-xs font-medium text-[#738078] transition hover:bg-[#e4e5da] hover:text-[#2f5146]" data-testid="p2p-private-broadcast">LIVE <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
          {isAuthenticated ? <span className="rounded-full border border-[#d4d8cd] bg-[#f6f5ed] px-3 py-2 text-[10px] font-semibold text-[#586f63]">{user?.username || "Signed in"}</span> : <Link href="/auth" className={`${primary} min-h-9 px-3 text-xs`}>Sign in to trade</Link>}
        </div>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-[26px] border border-[#ced6c8] bg-[#dae3d4] p-5 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-28 h-[390px] w-[390px] rounded-full border border-[#92aa98]/40" />
        <div className="pointer-events-none absolute -right-2 -top-14 h-[270px] w-[270px] rounded-full border border-[#92aa98]/35" />
        <div className="pointer-events-none absolute right-12 top-8 h-[130px] w-[130px] rounded-full border border-[#92aa98]/35" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8fad9a]/50 bg-[#edf1e7]/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#4e7464]"><Signal className="h-3 w-3" /> Addressed by wave</div>
            <h2 className="mt-5 max-w-3xl font-[var(--font-display)] text-4xl font-semibold leading-[1.02] tracking-[-.045em] text-[#244038] sm:text-6xl">Trade directly.<br /><span className="text-[#54806b]">Settle by consent.</span></h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#566b5d] sm:text-base">People, files and live rooms connected by wave address. Buyer-accepted held payments keep the final decision with the buyer.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setCreateOpen(true); setTab("discover"); }} disabled={!isAuthenticated} className={`${primary} min-h-11 px-5`} data-testid="listing-create"><FilePlus2 className="h-4 w-4" /> Create a listing</button>
              {isAuthenticated && <button type="button" onClick={() => setTipOpen(true)} disabled={!paymentActionsEnabled} className={`${quiet} min-h-11 bg-[#e8eee3] disabled:cursor-not-allowed`} data-testid="tip-open"><Sparkles className="h-4 w-4" /> {paymentActionsEnabled ? "Send a tip" : "Tips paused"}</button>}
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-2 lg:grid-cols-1">
            {stats.map(item => <div key={item.label} className="rounded-2xl border border-[#b9cbbb]/70 bg-[#f4f4ea]/65 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-[#54786a]">{item.icon}<span className="text-[9px] font-semibold uppercase tracking-[.12em]">{item.label}</span></div>
              <div className="mt-2 font-mono text-sm font-semibold text-[#314a3e] sm:text-lg">{item.value}</div>
            </div>)}
          </div>
        </div>
      </section>

      {(market.paymentsPolicy.data?.enabled !== true || market.paymentsPolicy.isFetching || market.paymentsPolicy.isError) && <section role="status" className="mt-4 rounded-2xl border border-[#d8b989] bg-[#f8efdc] px-5 py-4 sm:px-6" data-testid="p2p-payments-audit-hold">
        <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a7139]" /><div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[#6e532b]">{market.paymentsPolicy.data?.enabled === true ? "Payment availability is unverified" : "New P2P payments are on audit hold"}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#765f3c]">
            {market.paymentsPolicy.isError
              ? "The payment policy could not be verified. Purchases and tips are disabled until the server confirms they are enabled."
              : market.paymentsPolicy.data?.enabled === true && market.paymentsPolicy.isFetching
              ? "The server payment policy is being refreshed or could not be verified. Purchases and tips remain disabled until it is confirmed."
              : market.paymentsPolicy.data?.enabled === false
                ? market.paymentsPolicy.data.reason || "New purchases and tips are paused while existing deposit, withdrawal, and service-fee balance writers are audited."
              : market.paymentsPolicy.isLoading || market.paymentsPolicy.isFetching
                ? "Checking the server payment policy. Purchases and tips stay disabled until the policy is confirmed."
                : market.paymentsPolicy.data?.reason || "New purchases and tips are paused while existing deposit, withdrawal, and service-fee balance writers are audited."}
          </p>
          {market.paymentsPolicy.data?.enabled === false && <p className="mt-2 text-xs leading-relaxed text-[#765f3c]">Buy and tip funding is gated; listing creation/cancellation and settlement or refund of already-held orders remain available. Live streams, file exchange, and private invitations are unaffected.</p>}
        </div>
        </div>
        {(market.paymentsPolicy.isError || market.paymentsPolicy.isLoading || market.paymentsPolicy.isFetching) && <button type="button" onClick={() => void market.paymentsPolicy.refetch()} className={quiet}>Recheck</button>}
      </section>}
      {market.paymentsPolicy.data?.enabled === true && isAuthenticated && (!market.account.isSuccess || market.account.isFetching || account?.paymentsEnabled !== true) && <section role="status" className="mt-4 rounded-2xl border border-[#d8b989] bg-[#f8efdc] px-5 py-4 text-xs leading-relaxed text-[#765f3c]" data-testid="p2p-payments-account-check">
        {market.account.isError
          ? "Your account payment status could not be verified. Purchases and tips remain disabled; listing management and existing-order settlement are still available."
          : market.account.isFetching || market.account.isLoading
            ? "Verifying account payment eligibility. Purchases and tips remain disabled until confirmed."
            : "Payments are disabled for this account. Purchases and tips are unavailable; listing management and existing-order settlement remain available."}
      </section>}

      {isAuthenticated && account && <section className={`${panel} mt-4 grid grid-cols-3 divide-x divide-[#e2e0d6] px-2 py-4 sm:px-5`} aria-label="Sats balances">
        <div className="px-2 sm:px-4"><div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#818a80]"><Wallet className="h-3.5 w-3.5" /> Available</div><div className="mt-1.5 font-mono text-sm font-semibold text-[#2f5145] sm:text-lg">{formatSats(account.availableSats)} <span className="text-[10px] font-sans text-[#8a9287]">sats</span></div></div>
        <div className="px-2 sm:px-4"><div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#818a80]"><LockKeyhole className="h-3.5 w-3.5" /> Held in orders</div><div className="mt-1.5 font-mono text-sm font-semibold text-[#82683c] sm:text-lg">{formatSats(account.heldSats)} <span className="text-[10px] font-sans text-[#8a9287]">sats</span></div></div>
        <div className="px-2 sm:px-4"><div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#818a80]"><Clock3 className="h-3.5 w-3.5" /> Pending</div><div className="mt-1.5 font-mono text-sm font-semibold text-[#5b7070] sm:text-lg">{formatSats(account.pendingSats)} <span className="text-[10px] font-sans text-[#8a9287]">sats</span></div></div>
      </section>}

      {marketError && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d7b8a5] bg-[#f7ece5] px-4 py-3 text-xs text-[#805b4c]"><span>{marketError instanceof Error ? marketError.message : "Market data could not be loaded."}</span><button type="button" onClick={refreshAll} className={quiet}><RefreshCw className="h-3.5 w-3.5" /> Retry</button></div>}
      <nav className="mt-7 flex items-center gap-1 overflow-x-auto border-b border-[#d6d4c9]" aria-label="P2P sections">
        {([
          ["discover", "Discover", <Globe2 className="h-3.5 w-3.5" />],
          ["orders", "My orders", <ArrowDownLeft className="h-3.5 w-3.5" />],
          ["files", "File exchange", <ArrowUpRight className="h-3.5 w-3.5" />],
        ] as const).map(([id, label, icon]) => <button type="button" key={id} onClick={() => setTab(id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-xs font-semibold transition ${tab === id ? "border-[#287b6a] text-[#21594e]" : "border-transparent text-[#899087] hover:text-[#52675c]"}`} aria-current={tab === id ? "page" : undefined}>{icon}{label}</button>)}
        <button type="button" onClick={refreshAll} className="ml-auto mb-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#78847b] hover:bg-[#e3e3d9] hover:text-[#31584d]" aria-label="Refresh listings and live streams"><RefreshCw className="h-4 w-4" /></button>
      </nav>

      {tab === "discover" && <div className="mt-6 space-y-10">
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><div className="text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">The exchange</div><h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[#2b3934]">Open offers</h2></div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[#d9d7cc] bg-[#f5f4ed] p-1">{(["all", ...categories.map(item => item.id)] as Array<"all" | Category>).map(item => <button type="button" key={item} onClick={() => setFilter(item)} className={`min-h-8 shrink-0 rounded-lg px-3 text-[10px] font-semibold capitalize transition ${filter === item ? "bg-[#dfe9dc] text-[#315c4c]" : "text-[#889087] hover:text-[#486357]"}`}>{item === "all" ? "Everything" : item}</button>)}</div>
          </div>
          {market.listings.isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="h-[245px] animate-pulse rounded-2xl border border-[#dddbd1] bg-[#f4f3ec] p-5"><div className="h-10 w-10 rounded-xl bg-[#e6e5dc]" /><div className="mt-6 h-4 w-2/3 rounded bg-[#e6e5dc]" /><div className="mt-3 h-3 w-full rounded bg-[#e6e5dc]" /><div className="mt-2 h-3 w-4/5 rounded bg-[#e6e5dc]" /></div>)}</div>
            : market.listings.error ? <StateMessage title="Offers could not load" detail="The public listing feed did not respond. Your balance is unchanged; retry when the network is reachable." retry={refreshAll} />
              : shownListings.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shownListings.map(listing => <ListingCard key={listing.id} listing={listing} own={listing.sellerId === user?.id} onBuy={setSelectedBuy} onCancel={cancelListing} busy={market.buy.isPending || market.deleteListing.isPending} paymentsEnabled={paymentActionsEnabled} copy={copyValue} copied={copied} />)}</div>
                : <StateMessage title={filter === "all" ? "No active offers yet" : `No ${filter} offers yet`} detail={isAuthenticated ? "Create an offer or check back later. Refreshing discovery does not reserve or move sats." : "Sign in to publish an offer, or check back later for new wave-addressed listings."} />}
        </section>
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">Broadcast rooms</div><h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight text-[#2b3934]">Live now</h2></div>
            <div className="flex flex-wrap gap-2">{isAuthenticated && <Link href="/streaming?create=private" className={quiet} data-testid="p2p-start-broadcast"><Video className="h-3.5 w-3.5" /> Start a stream</Link>}<Link href="/live-guide" className={quiet} aria-label="Read the Live streaming guide">Live streaming guide</Link></div>
          </div>
          <p className="mb-3 text-[11px] text-[#788078]">Creating and joining streams is free. Optional sats tips are separate and require your confirmation.</p>
          {market.live.isLoading ? <div className="h-36 animate-pulse rounded-2xl border border-[#dddbd1] bg-[#f4f3ec]" />
            : market.live.error ? <StateMessage title="Live rooms are unavailable" detail="We could not reach the stream directory." retry={refreshAll} />
              : liveStreams.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{liveStreams.map(stream => {
                const own = stream.broadcasterId === user?.id;
                return <article key={stream.id} className="rounded-2xl border border-[#d7d5ca] bg-[#fbfaf5] p-4">
                  <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5eee5] text-[#3c7667]"><Radio className="h-4 w-4" /></span><Pill tone={stream.status === "live" ? "green" : "amber"}><span className={stream.status === "live" ? "h-1.5 w-1.5 rounded-full bg-[#4a9275]" : "h-1.5 w-1.5 rounded-full bg-[#c3984e]"} />{stream.status || "Live"}</Pill></div>
                  <h3 className="mt-4 font-[var(--font-display)] text-lg font-semibold text-[#2f3e38]">{stream.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#798078]">{own ? "Your room · manage invited viewers" : stream.isPublic === false ? "Private room · invitation required" : "Join this live stream in the existing LIVE viewer."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{stream.status === "live" && <Link href={`/streaming/${stream.id}`} className={primary}><Radio className="h-3.5 w-3.5" />{own ? "Open your stream" : stream.isPublic === false ? "Join invited room" : "Watch live"}</Link>}
                    {own && stream.isPublic === false && <button type="button" onClick={() => void openGuests(stream)} className={quiet}><Users className="h-3.5 w-3.5" /> Manage invites</button>}
                  </div>
                </article>;
              })}</div> : <StateMessage title="No one is live right now" detail={isAuthenticated ? "Create a room to start a camera or screen broadcast. The existing LIVE page handles the actual stream." : "Live public rooms appear here when a broadcaster starts."} />}
        </section>
        <section className="grid gap-3 rounded-2xl border border-[#d8d7ca] bg-[#f4f3eb] p-5 sm:grid-cols-3">
          {[["01", "Sats are held in-app", "A purchase moves available sats into an app-ledger hold; this is not independent on-chain escrow."], ["02", "Buyer decides", "There is no automatic payout or timeout. Unresolved orders stay held until buyer acceptance or seller refund."], ["03", "Delivery is not guaranteed", "No automatic physical or digital delivery or NFT transfer. Recipients must be online and reachable; no TURN relay yet. Not for emergencies."]].map(([n, heading, detail]) => <div key={n} className="flex gap-3"><span className="font-mono text-xs text-[#70917e]">{n}</span><div><h3 className="text-xs font-semibold text-[#42584c]">{heading}</h3><p className="mt-1 text-[11px] leading-relaxed text-[#7d8479]">{detail}</p></div></div>)}
        </section>
      </div>}

      {tab === "orders" && <section className="mt-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">Your activity</div><h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold text-[#2b3934]">Orders & listings</h2></div>{isAuthenticated && <button type="button" onClick={() => setCreateOpen(true)} className={primary}><FilePlus2 className="h-4 w-4" /> New listing</button>}</div>
        {!isAuthenticated ? <div className={`${panel} p-8 text-center`}><LockKeyhole className="mx-auto h-6 w-6 text-[#719182]" /><h3 className="mt-3 font-semibold">Sign in to manage your orders</h3><p className="mt-1 text-xs text-[#7f857a]">Public offers and streams remain available without signing in.</p><Link href="/auth" className={`${primary} mt-4`}>Sign in</Link></div>
          : market.account.isLoading || authLoading ? <div className="h-36 animate-pulse rounded-2xl bg-[#e5e4dc]" />
            : account ? <><div className="grid gap-2 sm:grid-cols-3">{[
              ["Available", account.availableSats, "Spendable balance"],
              ["Held", account.heldSats, "In funded or disputed orders"],
              ["Pending", account.pendingSats, "Awaiting settlement state"],
            ].map(([name, value, desc]) => <div key={name} className={`${panel} p-4`}><p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#818a80]">{name}</p><p className="mt-1 font-mono text-lg font-semibold text-[#365548]">{formatSats(value as string)} <span className="text-[10px] font-sans font-normal text-[#8b9187]">sats</span></p><p className="mt-1 text-[10px] text-[#868b81]">{desc}</p></div>)}</div>
              <div className="space-y-3">{account.orders.length ? account.orders.map(order => <OrderCard key={order.id} order={order} userId={user?.id ?? ""} busy={market.orderAction.isPending} onAction={beginOrderAction} copy={copyValue} copied={copied} />) : <StateMessage title="No orders yet" detail="Orders appear here for both buyer and seller. Browse offers to start a purchase." />}</div>
              <div><h3 className="mb-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#758177]">Your listings · invited listings</h3>{allListings.length ? <div className="grid gap-3 md:grid-cols-2">{allListings.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#dbd9ce] bg-[#f8f7f1] px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#41544a]">{item.title}</p><p className="mt-1 text-[10px] text-[#858b80]">{item.sellerId === user?.id ? "Your offer" : "Invited offer"} · {item.status}</p></div><div className="shrink-0"><Sats value={item.priceSats} /></div>{item.sellerId === user?.id && item.status === "active" && <button type="button" className={quiet} onClick={() => void cancelListing(item)} disabled={market.deleteListing.isPending}>Cancel</button>}</div>)}</div> : <StateMessage title="No listings to manage" detail="Your published and invited private offers will appear here." />}</div>
            </> : <StateMessage title="Account could not load" detail="Your order and balance information is temporarily unavailable." retry={refreshAll} />}
      </section>}

      <section className="mt-6" hidden={tab !== "files"}>
        <div className="mb-5"><div className="text-[9px] font-bold uppercase tracking-[.2em] text-[#718078]">Peer exchange</div><h2 className="mt-1 font-[var(--font-display)] text-2xl font-semibold text-[#2b3934]">Send and receive files</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#788078]">Direct transfer and broadcast reception run through the existing peer file exchange. Receiving requires an online, reachable account.</p></div>
        <div className="rounded-2xl border border-[#d3d5ca] bg-[#192b27] p-2 sm:p-4"><P2PFileExchange /></div>
      </section>

      {createOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1d302c]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) resetListingForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="listing-dialog-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[26px] border border-[#d5d3c8] bg-[#f7f6ef] p-5 shadow-2xl sm:rounded-[26px] sm:p-7">
          <div className="flex items-start justify-between"><div><Pill tone="green"><Tag className="h-3 w-3" /> New offer</Pill><h2 id="listing-dialog-title" className="mt-3 font-[var(--font-display)] text-2xl font-semibold">Put it on the wave</h2><p className="mt-1 text-xs text-[#788078]">No platform fee. Settlement holds only after a buyer confirms purchase.</p></div><button type="button" onClick={resetListingForm} className="grid h-9 w-9 place-items-center rounded-lg text-[#7e877e] hover:bg-[#e8e7dd]" aria-label="Close listing form"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 space-y-4">
            <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]" htmlFor="listing-title-input">Title</label><input id="listing-title-input" data-testid="listing-title-input" className={field} maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you offering?" /></div>
            <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]" htmlFor="listing-description">Description</label><textarea id="listing-description" className={`${field} min-h-24 py-3`} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Set clear expectations for delivery and acceptance." /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]" htmlFor="listing-category">Category</label><select id="listing-category" className={field} value={category} onChange={e => setCategory(e.target.value as Category)}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]" htmlFor="listing-price-input">Price · sats</label><input id="listing-price-input" data-testid="listing-price-input" className={field} type="number" min="1" max="10000000000" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="Exact whole sats" /></div></div>
            <div className="rounded-xl border border-[#deddd2] bg-[#f0efe7] p-3"><label className="flex cursor-pointer items-center justify-between gap-3"><span><span className="block text-xs font-semibold text-[#465a4e]">Public listing</span><span className="mt-0.5 block text-[10px] text-[#848a80]">{isPublic ? "Visible in public discovery." : "Only invited wave addresses can see it."}</span></span><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="h-4 w-4 accent-[#287b6a]" /></label>{!isPublic && <div className="mt-3"><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]" htmlFor="listing-recipients">Invite wave addresses · max 20</label><textarea id="listing-recipients" value={recipients} onChange={e => setRecipients(e.target.value)} className={`${field} min-h-20 py-3 font-mono text-xs`} placeholder={"wave address, one per line"} /><p className="mt-1 text-[10px] text-[#878c82]">Only exact recipients can discover the private offer.</p></div>}</div>
            {formError && <p role="alert" className="rounded-lg border border-[#dfc0b0] bg-[#f8eee8] px-3 py-2 text-xs text-[#875645]">{formError}</p>}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end"><button type="button" onClick={resetListingForm} className={quiet}>Cancel</button><button type="button" onClick={() => void createListing()} disabled={market.createListing.isPending} className={primary}>{market.createListing.isPending ? "Publishing…" : "Publish offer"}<ArrowUpRight className="h-4 w-4" /></button></div>
          </div>
        </section>
      </div>}

      {selectedBuy && <div className="fixed inset-0 z-50 grid place-items-center bg-[#1d302c]/55 p-4 backdrop-blur-[2px]">
        <section role="dialog" aria-modal="true" aria-labelledby="purchase-title" className="w-full max-w-md rounded-[24px] border border-[#d5d3c8] bg-[#f8f7f0] p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><Pill tone="amber"><LockKeyhole className="h-3 w-3" /> Payment confirmation</Pill><h2 id="purchase-title" className="mt-3 font-[var(--font-display)] text-2xl font-semibold">{selectedBuy.title}</h2></div><button type="button" onClick={() => setSelectedBuy(null)} className="grid h-8 w-8 place-items-center rounded-lg text-[#7e877e] hover:bg-[#e8e7dd]" aria-label="Close purchase confirmation"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 rounded-xl border border-[#dfded3] bg-[#f0efe7] p-4"><div className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#7b8379]">Exact amount to hold</div><div className="mt-1"><Sats large value={selectedBuy.priceSats} /></div><p className="mt-3 break-all text-[11px] text-[#717a71]">Seller wave: <span className="font-mono text-[#45594e]">{selectedBuy.sellerWave}</span></p></div>
          <p className="mt-4 text-xs leading-relaxed text-[#667268]">Confirming moves exactly this amount from available sats into an app-ledger hold. There is no platform fee and this is not on-chain escrow. The seller must mark delivery; you must manually accept to release funds. Once accepted, release to the seller is irreversible. No automatic delivery, timeout or payout.</p>
          {market.buy.error && <p role="alert" className="mt-3 text-xs text-[#985d48]">{market.buy.error instanceof Error ? market.buy.error.message : "Purchase failed. Retry keeps the same request ID."}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedBuy(null)} className={quiet}>Not now</button><button type="button" disabled={market.buy.isPending || !paymentActionsEnabled} onClick={() => void buyListing()} className={primary} data-testid="purchase-confirm">{market.buy.isPending ? "Holding sats…" : paymentActionsEnabled ? "Confirm purchase" : "Payments paused"}<ArrowUpRight className="h-4 w-4" /></button></div>
          {selectedRequestId && <p className="mt-3 text-[9px] text-[#96998d]">Safe retry reference retained for this listing.</p>}
        </section>
      </div>}

      {acceptingAction && <div className="fixed inset-0 z-50 grid place-items-center bg-[#1d302c]/55 p-4 backdrop-blur-[2px]">
        <section role="dialog" aria-modal="true" aria-labelledby="order-action-title" className="w-full max-w-md rounded-[24px] border border-[#d5d3c8] bg-[#f8f7f0] p-6 shadow-2xl">
          <div className="flex items-start justify-between"><div><Pill tone={acceptingAction.action === "accept" ? "green" : "amber"}><ShieldCheck className="h-3 w-3" /> Order decision</Pill><h2 id="order-action-title" className="mt-3 font-[var(--font-display)] text-2xl font-semibold">{acceptingAction.action === "accept" ? "Accept delivery?" : acceptingAction.action === "deliver" ? "Mark as delivered?" : acceptingAction.action === "refund" ? "Refund this order?" : "Open a dispute?"}</h2></div><button type="button" onClick={() => setAcceptingAction(null)} className="grid h-8 w-8 place-items-center rounded-lg text-[#7e877e] hover:bg-[#e8e7dd]" aria-label="Close order action"><X className="h-4 w-4" /></button></div>
          <div className="mt-4 rounded-xl bg-[#f0efe7] p-4"><p className="text-sm font-semibold text-[#45564b]">{acceptingAction.order.title}</p><div className="mt-2"><Sats value={acceptingAction.order.amountSats} /></div></div>
          <p className="mt-4 text-xs leading-relaxed text-[#69736a]">{acceptingAction.action === "accept" ? "This explicitly releases the held amount to the seller. Acceptance is irreversible. No asset transfer is performed automatically." : acceptingAction.action === "deliver" ? "This only records that you marked delivery. The buyer still decides whether to accept and release the held sats." : acceptingAction.action === "refund" ? "This returns the held amount to the buyer. Confirm only if you intend to resolve by refund." : "A dispute keeps the funds held. There is no automatic adjudication or timeout; buyer acceptance or seller refund is required to resolve."}</p>
          {acceptingAction.action === "accept" && <label className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#43584b]"><input type="checkbox" required checked={acceptanceConfirmed} onChange={e => setAcceptanceConfirmed(e.target.checked)} className="mt-0.5 accent-[#287b6a]" data-testid="accept-confirm-checkbox" /><span>I confirm this exact order and understand release to the seller cannot be reversed.</span></label>}
          {acceptingAction.action !== "accept" && <div className="mt-4"><label htmlFor="order-note" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]">Note (optional)</label><textarea id="order-note" className={`${field} min-h-20 py-3`} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder={acceptingAction.action === "dispute" ? "Describe the issue for the other participant." : "Add context for the other participant."} /></div>}
          {market.orderAction.error && <p role="alert" className="mt-3 text-xs text-[#985d48]">{market.orderAction.error instanceof Error ? market.orderAction.error.message : "Could not update the order."}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setAcceptingAction(null)} className={quiet}>Keep order open</button><button type="button" disabled={market.orderAction.isPending || (acceptingAction.action === "accept" && !acceptanceConfirmed)} onClick={() => void actionOrder()} className={primary} data-testid={`confirm-order-${acceptingAction.action}`}>{market.orderAction.isPending ? "Updating…" : acceptingAction.action === "accept" ? "Confirm & release" : acceptingAction.action === "deliver" ? "Mark delivered" : acceptingAction.action === "refund" ? "Confirm refund" : "Open dispute"}</button></div>
        </section>
      </div>}

      {guestStream && <div className="fixed inset-0 z-50 grid place-items-center bg-[#1d302c]/55 p-4 backdrop-blur-[2px]">
        <section role="dialog" aria-modal="true" aria-labelledby="guest-title" className="w-full max-w-md rounded-[24px] border border-[#d5d3c8] bg-[#f8f7f0] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Pill tone="amber"><Users className="h-3 w-3" /> Private room</Pill><h2 id="guest-title" className="mt-3 font-[var(--font-display)] text-2xl font-semibold">Viewer invitations</h2><p className="mt-1 text-xs text-[#7c8379]">{guestStream.title}</p></div><button type="button" onClick={() => { guestSession.current++; setGuestStream(null); setGuests([]); setGuestLoading(false); }} className="grid h-8 w-8 place-items-center rounded-lg text-[#7e877e] hover:bg-[#e8e7dd]" aria-label="Close guest invitations"><X className="h-4 w-4" /></button></div>
          <form className="mt-5 flex gap-2" onSubmit={e => { e.preventDefault(); void modifyGuest(guestAddress.trim()); }}><input className={`${field} font-mono text-xs`} value={guestAddress} onChange={e => setGuestAddress(e.target.value)} placeholder="Exact wave address" /><button type="submit" disabled={!guestAddress.trim()} className={primary}>Invite</button></form>
          <div className="mt-2"><WaveRecipientPicker isAuthenticated={isAuthenticated} accountKey={user?.id} variant="light" onSelect={address => { setGuestAddress(address); }} /></div>
          {guestError && <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#dfc0b0] bg-[#f8eee8] px-3 py-2 text-xs text-[#875645]"><span>{guestError}</span><button type="button" disabled={guestLoading} onClick={() => { if (guestStream) void openGuests(guestStream); }} className="font-semibold underline disabled:opacity-50">Retry</button></div>}
          <div className="mt-4 space-y-2">{guestLoading ? <div className="animate-pulse rounded-xl border border-[#e2e0d6] bg-[#f2f1e9] p-5 text-center text-xs text-[#858b80]">Loading invitation list…</div> : guests.map(guest => <div key={guest.userId} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2e0d6] bg-[#f2f1e9] px-3 py-2"><span className="truncate font-mono text-[11px] text-[#506358]">{guest.waveAddress}</span><button type="button" onClick={() => void modifyGuest("", guest.userId)} className="text-[10px] font-semibold text-[#985d48] hover:underline">Revoke</button></div>)}{!guestLoading && !guests.length && !guestError && <p className="rounded-xl border border-dashed border-[#d8d6cc] p-5 text-center text-xs text-[#858b80]">No invited viewers yet.</p>}</div>
          {guestStream.status === "pending" && guests.length > 0 && <div className="mt-4 border-t border-[#e5e3d9] pt-4"><p className="mb-2 text-[10px] text-[#778077]">Invitations are active. Start only when your audience is ready.</p><Link href={`/streaming/${guestStream.id}`} className={primary} data-testid="p2p-start-pending-room"><Radio className="h-3.5 w-3.5" />Start private broadcast</Link></div>}
        </section>
      </div>}

      {tipOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#1d302c]/55 p-4 backdrop-blur-[2px]">
        <section role="dialog" aria-modal="true" aria-labelledby="tip-title" className="w-full max-w-md rounded-[24px] border border-[#d5d3c8] bg-[#f8f7f0] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Pill tone="green"><Sparkles className="h-3 w-3" /> Direct tip</Pill><h2 id="tip-title" className="mt-3 font-[var(--font-display)] text-2xl font-semibold">Send sats by wave</h2></div><button type="button" onClick={() => setTipOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-[#7e877e] hover:bg-[#e8e7dd]" aria-label="Close tip"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 space-y-3"><div><label htmlFor="tip-recipient" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]">Recipient wave address</label><input id="tip-recipient" className={`${field} font-mono text-xs`} value={tipAddress} onChange={e => setTipAddress(e.target.value)} placeholder="Exact registered wave address" /></div><div><label htmlFor="tip-amount" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.13em] text-[#6e7b71]">Amount · sats</label><input id="tip-amount" className={field} type="number" min="1" max="10000000000" step="1" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="Whole sats" /></div>
            <p className="text-xs leading-relaxed text-[#6d776d]">Tips move app-ledger sats directly to the entered recipient. Review the exact address and amount before confirming.</p>{tipError && <p role="alert" className="text-xs text-[#985d48]">{tipError}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setTipOpen(false)} className={quiet}>Cancel</button><button type="button" disabled={market.sendTip.isPending || !paymentActionsEnabled} onClick={() => { if (paymentActionsEnabled && window.confirm(`Send exactly ${tipAmount || "0"} sats to ${tipAddress || "this address"}?`)) void sendTip(); }} className={primary} data-testid="tip-confirm">{market.sendTip.isPending ? "Sending…" : paymentActionsEnabled ? "Confirm tip" : "Payments paused"}<ArrowUpRight className="h-4 w-4" /></button></div>
          </div>
        </section>
      </div>}

      <footer className="mt-12 flex flex-col gap-2 border-t border-[#d5d3c9] pt-5 text-[10px] leading-relaxed text-[#81877d] sm:flex-row sm:items-center sm:justify-between"><span>NexusOS P2P · app-ledger sats · no platform fee · not on-chain escrow</span><span>Delivery and network reachability are not guaranteed. No emergency service.</span></footer>
    </div>
  </main>;
}
