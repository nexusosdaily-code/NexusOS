import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  LoaderCircle,
  LockKeyhole,
  Radio,
  ShieldAlert,
  Signal,
  Upload,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import { useP2PFiles } from "@/hooks/use-p2p-files";
import { useAuth } from "@/hooks/use-auth";
import WaveRecipientPicker from "@/components/wave-recipient-picker";
import { P2P_MAX_FILE_BYTES } from "@shared/p2p-files";
import type { P2PFileOffer, P2PTransfer } from "@shared/p2p-files";

type Props = { initialFile?: File | null };
type View = "send" | "receive";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** index;
  return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

function FileGlyph({ name, type }: { name: string; type: string }) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const className = "h-5 w-5 shrink-0";
  if (type.startsWith("image/")) return <FileImage className={`${className} text-rose-300`} />;
  if (type.startsWith("video/")) return <FileVideo className={`${className} text-violet-300`} />;
  if (type.startsWith("audio/")) return <FileAudio className={`${className} text-amber-300`} />;
  if (["zip", "7z", "rar", "gz", "tar"].includes(extension)) return <FileArchive className={`${className} text-cyan-300`} />;
  if (["txt", "md", "pdf", "doc", "docx", "rtf"].includes(extension)) return <FileText className={`${className} text-sky-300`} />;
  return <File className={`${className} text-slate-300`} />;
}

function StatusPill({ status }: { status: P2PTransfer["status"] }) {
  const styles: Record<P2PTransfer["status"], string> = {
    offered: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    connecting: "border-sky-400/25 bg-sky-400/10 text-sky-200",
    transferring: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    complete: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    failed: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    declined: "border-slate-400/20 bg-slate-400/10 text-slate-300",
    cancelled: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  };
  const labels: Record<P2PTransfer["status"], string> = {
    offered: "Awaiting decision",
    connecting: "Connecting",
    transferring: "Transferring",
    complete: "Received",
    failed: "Failed",
    declined: "Declined",
    cancelled: "Cancelled",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles[status]}`}>
    {status === "complete" ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === "offered" ? <Clock3 className="h-3.5 w-3.5" /> : null}
    {labels[status]}
  </span>;
}

function TransferRow({ transfer, onCancel }: { transfer: P2PTransfer; onCancel: (id: string) => void }) {
  const isReceiving = transfer.direction === "receiving";
  const completed = transfer.status === "complete";
  const progress = Math.max(0, Math.min(100, transfer.progress));
  return (
    <article className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-700 bg-slate-800/80">
          <FileGlyph name={transfer.file.name} type={transfer.file.type} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="max-w-full truncate text-sm font-semibold text-slate-100">{transfer.file.name}</h3>
            <StatusPill status={transfer.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{formatBytes(transfer.file.size)}</span>
            <span>{isReceiving ? "From" : "To"} <span className="font-mono text-slate-300">{transfer.peer || (isReceiving ? transfer.from : "recipient")}</span></span>
          </div>
          {(transfer.status === "transferring" || transfer.status === "connecting") && (
            <div className="mt-3">
              <div className="mb-1.5 flex justify-between text-[11px] text-slate-400">
                <span>{transfer.status === "connecting" ? "Establishing peer connection" : `${progress.toFixed(0)}% transferred`}</span>
                <span>{formatBytes(Math.round(transfer.file.size * progress / 100))} / {formatBytes(transfer.file.size)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label={`Transfer progress for ${transfer.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {transfer.error && <p className="mt-2 text-xs text-rose-300">{transfer.error}</p>}
          {completed && isReceiving && transfer.downloadUrl && (
            <a
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              href={transfer.downloadUrl}
              download={transfer.file.name}
              rel="noopener noreferrer"
            >
              <ArrowDownToLine className="h-4 w-4" /> Download received file
            </a>
          )}
          {completed && !isReceiving && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-300"><Check className="h-4 w-4" /> Receiver confirmed completion</p>}
          {["complete", "failed", "declined", "cancelled"].includes(transfer.status) && (
            <button type="button" onClick={() => onCancel(transfer.id)} className="mt-3 block text-xs text-slate-400 underline hover:text-white">
              {transfer.downloadUrl ? "Remove download from memory" : "Dismiss transfer"}
            </button>
          )}
          {!completed && ["offered", "connecting", "transferring"].includes(transfer.status) && (
            <button type="button" onClick={() => onCancel(transfer.id)} className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs text-slate-400 hover:bg-rose-400/10 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={`Cancel transfer of ${transfer.file.name}`}>
              <X className="h-3.5 w-3.5" /> Cancel transfer
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function OfferCard({ offer, onAccept, onDecline, busy }: {
  offer: P2PFileOffer;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  busy: boolean;
}) {
  return (
    <article className="rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-amber-300/15 bg-amber-300/[0.08]"><FileGlyph name={offer.file.name} type={offer.file.type} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="break-all text-sm font-semibold text-slate-100">{offer.file.name}</h3>
            <span className="rounded-full border border-amber-300/20 px-2.5 py-1 text-[11px] text-amber-200">Decision needed</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{formatBytes(offer.file.size)} · {offer.file.type || "Unspecified file type"}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-300"><UserRound className="h-3.5 w-3.5 text-cyan-300" /> From <span className="font-mono">{offer.from}</span>{offer.broadcast && <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">broadcast</span>}</p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">The file will not be received until you accept. Only accept files you expected.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => onAccept(offer.id)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept and receive
            </button>
            <button type="button" disabled={busy} onClick={() => onDecline(offer.id)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-300/40 hover:text-rose-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <X className="h-4 w-4" /> Decline
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function P2PFileExchange({ initialFile = null }: Props) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    connected, connecting, address, broadcastMuted, setBroadcastMuted,
    offers, transfers, sendFile, accept, decline, cancel, error,
  } = useP2PFiles();
  const [view, setView] = useState<View>("send");
  const [file, setFile] = useState<File | null>(initialFile);
  const [recipient, setRecipient] = useState("");
  const [broadcast, setBroadcast] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [muteSaving, setMuteSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousAccount = useRef(user?.id);

  useEffect(() => setFile(initialFile ?? null), [initialFile]);
  useEffect(() => {
    if (previousAccount.current !== user?.id) {
      previousAccount.current = user?.id;
      setRecipient("");
      setBroadcast(false);
    }
  }, [user?.id]);

  const chooseFile = (selected?: File) => {
    setActionError("");
    if (!selected) return;
    if (selected.size > P2P_MAX_FILE_BYTES) {
      setActionError(`This file exceeds the ${formatBytes(P2P_MAX_FILE_BYTES)} transfer limit.`);
      return;
    }
    setFile(selected);
  };

  const handleSend = async () => {
    if (!file) {
      setActionError("Choose a file before sending.");
      return;
    }
    if (file.size > P2P_MAX_FILE_BYTES) {
      setActionError(`This file exceeds the ${formatBytes(P2P_MAX_FILE_BYTES)} transfer limit.`);
      return;
    }
    const exactRecipient = recipient;
    if (!broadcast && !exactRecipient.trim()) {
      setActionError("Enter the recipient’s exact wave address, or choose broadcast explicitly.");
      return;
    }
    if (!connected) {
      setActionError("Connect to the peer network before sending.");
      return;
    }
    setSending(true);
    setActionError("");
    try {
      await sendFile(file, broadcast ? null : exactRecipient);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (sendError) {
      setActionError(sendError instanceof Error ? sendError.message : "Could not start this transfer. Try again.");
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (id: string) => {
    setBusyOffer(id);
    setActionError("");
    try { await accept(id); }
    catch (acceptError) { setActionError(acceptError instanceof Error ? acceptError.message : "Could not accept this file offer."); }
    finally { setBusyOffer(null); }
  };

  const handleMute = async () => {
    setMuteSaving(true);
    setActionError("");
    try { await setBroadcastMuted(!broadcastMuted); }
    catch (muteError) { setActionError(muteError instanceof Error ? muteError.message : "Could not update broadcast reception."); }
    finally { setMuteSaving(false); }
  };

  const pendingOffers = offers ?? [];
  const activeCount = (transfers ?? []).filter((transfer) => ["connecting", "transferring"].includes(transfer.status)).length;

  if (authLoading) {
    return <section className="mx-auto max-w-5xl animate-pulse rounded-2xl border border-slate-700 bg-slate-900/70 p-6" aria-label="Loading file exchange"><div className="h-5 w-48 rounded bg-slate-700" /><div className="mt-5 h-24 rounded-xl bg-slate-800" /><div className="mt-4 h-32 rounded-xl bg-slate-800" /></section>;
  }
  if (!isAuthenticated) {
    return <section className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900/80 p-6 sm:p-8">
      <div className="grid h-12 w-12 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><LockKeyhole className="h-5 w-5" /></div>
      <h2 className="mt-5 text-xl font-semibold text-slate-100">Sign in to exchange files</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Your wave address identifies you to friends and family. Sign in to send a file or manage incoming offers.</p>
      <Link href="/auth" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Sign in <ArrowUpRight className="h-4 w-4" /></Link>
    </section>;
  }

  return (
    <section className="mx-auto max-w-5xl space-y-5 text-slate-100">
      <header className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.12),transparent_50%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(11,25,39,0.98))] p-5 sm:p-7">
        <div className="absolute -right-8 -top-10 h-44 w-44 rounded-full border border-cyan-200/[0.08]" />
        <div className="absolute -right-1 top-0 h-28 w-28 rounded-full border border-cyan-200/[0.08]" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-200"><Radio className="h-3.5 w-3.5" /> Direct file exchange</div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">Send with a clear receipt.</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Choose a person by their registered wave address, or make an intentional broadcast offer. Sending is not delivery: receipt is confirmed only when the other person completes the transfer.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-950/40 px-3.5 py-2.5">
            <span className={`relative flex h-2.5 w-2.5 ${connected ? "" : "opacity-60"}`}><span className={`absolute inline-flex h-full w-full rounded-full ${connected ? "animate-ping bg-emerald-400/50" : "bg-slate-500"}`} /><span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-300" : connecting ? "bg-amber-300" : "bg-slate-500"}`} /></span>
            <span className="text-xs font-medium text-slate-200">{connected ? "Peer network connected" : connecting ? "Connecting to peers" : "Not connected"}</span>
          </div>
        </div>
        <div className="relative mt-6 grid gap-3 border-t border-slate-700/70 pt-4 sm:grid-cols-3">
          <div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Your wave address</div><div className="mt-1 truncate font-mono text-sm text-cyan-100" title={address ?? undefined}>{address ?? "Address unavailable"}</div></div>
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Active transfers</div><div className="mt-1 flex items-center gap-2 text-sm text-slate-200"><Signal className="h-4 w-4 text-cyan-300" /> {activeCount} in progress</div></div>
          <div><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Maximum file size</div><div className="mt-1 text-sm text-slate-200">{formatBytes(P2P_MAX_FILE_BYTES)} · any file type</div></div>
        </div>
      </header>

      {(error || actionError) && <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-300/25 bg-rose-300/[0.06] px-4 py-3 text-sm text-rose-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" /><span>{actionError || error}</span></div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70">
          <div className="flex border-b border-slate-700/70 p-1.5" role="tablist" aria-label="File exchange mode">
            <button type="button" role="tab" aria-selected={view === "send"} onClick={() => setView("send")} className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${view === "send" ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400 hover:text-slate-200"}`}><Upload className="h-4 w-4" /> Send a file</button>
            <button type="button" role="tab" aria-selected={view === "receive"} onClick={() => setView("receive")} data-testid="p2p-receive-tab" className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${view === "receive" ? "bg-cyan-300/10 text-cyan-100" : "text-slate-400 hover:text-slate-200"}`}><ArrowDownToLine className="h-4 w-4" /> Receive {pendingOffers.length > 0 && <span className="rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">{pendingOffers.length}</span>}</button>
          </div>

          {view === "send" ? (
            <div className="space-y-5 p-4 sm:p-6" role="tabpanel" aria-label="Send a file">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300" htmlFor="p2p-file-input">File to send</label>
                <input ref={inputRef} id="p2p-file-input" data-testid="p2p-file-input" type="file" className="sr-only" onChange={(event) => { chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.045] p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-800"><FileGlyph name={file.name} type={file.type} /></div>
                    <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-100">{file.name}</div><div className="mt-0.5 text-xs text-slate-400">{formatBytes(file.size)} · {file.type || "Unspecified file type"}</div></div>
                    <button type="button" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="Remove selected file"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-950/25 px-4 py-6 text-center hover:border-cyan-300/50 hover:bg-cyan-300/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-cyan-200"><Upload className="h-5 w-5" /></span>
                    <span className="mt-3 text-sm font-medium text-slate-200">Choose any file</span>
                    <span className="mt-1 text-xs text-slate-500">Up to {formatBytes(P2P_MAX_FILE_BYTES)} · no file-type allowlist</span>
                  </button>
                )}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <label htmlFor="p2p-recipient" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Recipient</label>
                  <button type="button" role="switch" aria-checked={broadcast} onClick={() => { setBroadcast(!broadcast); setActionError(""); }} data-testid="p2p-broadcast-mode" className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${broadcast ? "border-amber-300/35 bg-amber-300/10 text-amber-100" : "border-slate-700 bg-slate-800/70 text-slate-400"}`}><Radio className="h-3.5 w-3.5" />{broadcast ? "Broadcast offer on" : "Broadcast offer off"}<span className={`h-3.5 w-6 rounded-full p-0.5 ${broadcast ? "bg-amber-300/50" : "bg-slate-600"}`}><span className={`block h-2.5 w-2.5 rounded-full bg-slate-100 transition-transform ${broadcast ? "translate-x-2.5" : ""}`} /></span></button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input id="p2p-recipient" data-testid="p2p-recipient" type="text" autoComplete="off" spellCheck={false} value={recipient} onChange={(event) => setRecipient(event.target.value)} disabled={broadcast} placeholder={broadcast ? "Broadcast offer to online, unmuted receivers" : "Enter the exact registered wave address"} className="min-h-11 w-full flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3.5 text-sm text-slate-100 placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 focus:border-cyan-300/60 focus:outline-none focus:ring-2 focus:ring-cyan-300/15" />
                  {!broadcast && <WaveRecipientPicker isAuthenticated={isAuthenticated} accountKey={user?.id} onSelect={setRecipient} />}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{broadcast ? "An offer is visible only to accounts that are online and listening. Each person chooses whether to accept." : "Direct delivery is addressed only to this exact wave address."}</p>
              </div>

              <button type="button" onClick={handleSend} disabled={sending || !connected} data-testid="p2p-send" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}{sending ? "Starting transfer" : broadcast ? "Send broadcast offer" : "Send to recipient"}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-slate-500">A sent offer is not a receipt. Keep this workspace open and stay online while the peer decides and receives.</p>
            </div>
          ) : (
            <div className="space-y-5 p-4 sm:p-6" role="tabpanel" aria-label="Receive files">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-700 bg-slate-950/35 p-4">
                <div className="flex gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${broadcastMuted ? "bg-slate-800 text-slate-400" : "bg-emerald-300/10 text-emerald-200"}`}><Wifi className="h-5 w-5" /></div>
                  <div><h2 className="text-sm font-semibold text-slate-100">Broadcast reception</h2><p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">{broadcastMuted ? "Broadcast offers are muted for this account." : "This account can receive broadcast offers while online."} Direct offers can still be addressed to your wave address.</p></div>
                </div>
                <button type="button" role="switch" aria-checked={!broadcastMuted} aria-label={broadcastMuted ? "Unmute broadcast reception" : "Mute broadcast reception"} data-testid="p2p-mute" disabled={muteSaving} onClick={handleMute} className={`relative h-7 w-12 shrink-0 rounded-full p-1 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${broadcastMuted ? "bg-slate-700" : "bg-emerald-400/70"}`}><span className={`block h-5 w-5 rounded-full bg-slate-100 transition-transform ${broadcastMuted ? "" : "translate-x-5"}`} /></button>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-100">Offers awaiting your decision</h2><span className="text-xs text-slate-500">{pendingOffers.length} pending</span></div>
                {pendingOffers.length ? <div className="space-y-3">{pendingOffers.map((offer) => <OfferCard key={offer.id} offer={offer} busy={busyOffer === offer.id} onAccept={handleAccept} onDecline={decline} />)}</div> : (
                  <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-4 py-8 text-center">
                    <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-400"><ArrowDownToLine className="h-4 w-4" /></div>
                    <p className="mt-3 text-sm font-medium text-slate-300">No pending file offers</p>
                    <p className="mt-1 text-xs text-slate-500">New direct and eligible broadcast offers will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-slate-100">Transfer activity</h2><p className="mt-1 text-xs text-slate-500">Status reflects peer receipt, not just upload.</p></div><span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">{(transfers ?? []).length} total</span></div>
            {transfers?.length ? (
              <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
                {[...transfers].slice().reverse().map((transfer) => <TransferRow key={transfer.id} transfer={transfer} onCancel={cancel} />)}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/20 px-4 py-8 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-400"><File className="h-4 w-4" /></div>
                <p className="mt-3 text-sm font-medium text-slate-300">No transfers yet</p>
                <p className="mt-1 text-xs text-slate-500">Your sent and received files will be tracked here.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 sm:p-5">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" /><div><h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">Know how delivery works</h2>
              <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-slate-400">
                <li>• The receiver must keep this workspace open to accept and receive a file.</li>
                <li>• The sender must stay online until the transfer finishes.</li>
                <li>• Broadcast offers reach only online accounts with broadcast reception unmuted.</li>
                <li>• WebRTC currently uses STUN; peer connectivity is not guaranteed and TURN is not assured.</li>
                <li>• This is not an emergency-alert guarantee. Do not use it for urgent or safety-critical delivery.</li>
                <li>• Received files are never opened automatically. Download only files you trust.</li>
              </ul>
            </div></div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-900/50 px-4 py-3">
            <div className="min-w-0"><p className="text-xs font-medium text-slate-200">Need a live camera broadcast?</p><p className="mt-1 text-[11px] text-slate-500">That is a separate feature, not file transfer.</p></div>
            <div className="flex flex-col gap-2"><Link href="/p2p" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-600 px-3 text-xs font-medium text-slate-300 hover:border-cyan-300/40 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Live &amp; sats market <ArrowUpRight className="h-3.5 w-3.5" /></Link><Link href="/wave-vault" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-600 px-3 text-xs text-slate-300 hover:text-cyan-100">Private wave files</Link></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
