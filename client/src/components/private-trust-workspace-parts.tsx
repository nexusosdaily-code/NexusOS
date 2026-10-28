import type { FormEvent, ReactNode } from "react";
import { AlertCircle, Archive, Check, Download, Loader2, RefreshCw, Trash2, X } from "lucide-react";

export type WorkspaceRecord = {
  id: string;
  type: string;
  version: number;
  state: string;
  expires_at: string;
  created_at: string;
  own: boolean;
  evidence: boolean;
  body?: string;
  mediaType?: string;
};

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{children}</label>;
}

export function ActionButton({ children, onClick, disabled, tone = "quiet", type = "button" }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; tone?: "quiet" | "accent" | "danger"; type?: "button" | "submit";
}) {
  const palette = tone === "accent"
    ? "border-amber-300/40 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
    : tone === "danger"
      ? "border-rose-300/30 bg-rose-400/5 text-rose-200 hover:bg-rose-400/10"
      : "border-white/10 bg-white/[0.025] text-white/65 hover:border-white/20 hover:text-white";
  return <button type={type} onClick={onClick} disabled={disabled}
    className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${palette}`}>
    {children}
  </button>;
}

export function StatusPill({ children, warm = false }: { children: ReactNode; warm?: boolean }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${warm ? "border-amber-200/25 bg-amber-200/[0.07] text-amber-100/80" : "border-white/10 bg-white/[0.03] text-white/45"}`}>{children}</span>;
}

export function ConsentCheck({ checked, onChange, evidence = false, disabled = false }: {
  checked: boolean; onChange: (value: boolean) => void; evidence?: boolean; disabled?: boolean;
}) {
  const copy = evidence
    ? "I have lawful authority to provide this evidence for its subject or as an authorized guardian, and to share it with authorized workspace participants. I understand its purpose, processing, retention, deletion, audit, and backup limits described above."
    : "I have authority to submit this information and share it with authorized workspace participants. I understand its purpose, processing, retention, deletion, audit, and backup limits described above.";
  return <label className={`flex items-start gap-2 text-[9px] leading-relaxed text-white/40 ${disabled ? "opacity-40" : ""}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-cyan-200 disabled:cursor-not-allowed" />{copy}</label>;
}

export function RecordCard({ record, canWrite, reviewer, own, busy, onSubmit, onReview, onDelete, onDownload }: {
  record: WorkspaceRecord; canWrite: boolean; reviewer: boolean; own: boolean; busy: boolean;
  onSubmit: () => void; onReview: (decision: "approve" | "reject") => void; onDelete: () => void; onDownload: () => void;
}) {
  const names: Record<string, string> = { lineage: "Private lineage note", beneficiary: "Beneficiary record", discussion: "Private discussion", instrument: "Governing instrument" };
  return <article className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-medium text-white/75">{names[record.type] ?? record.type}</h4><StatusPill>{record.state}</StatusPill><StatusPill>v{record.version}</StatusPill>{record.evidence && <StatusPill>evidence attached</StatusPill>}</div>
        <p className="mt-1 break-all font-mono text-[8px] text-white/25">{record.id}</p>
        {record.body && <p className="mt-3 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/55">{record.body}</p>}
        {record.mediaType && <p className="mt-2 text-[9px] text-white/35">{record.mediaType}</p>}
        <p className="mt-2 text-[9px] text-white/30">Created {new Date(record.created_at).toLocaleDateString()} · expires {new Date(record.expires_at).toLocaleDateString()}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {record.evidence && <ActionButton onClick={onDownload} disabled={busy}><Download size={11} /> Download</ActionButton>}
        {record.type === "instrument" && record.state === "draft" && own && canWrite && <ActionButton tone="accent" onClick={onSubmit} disabled={busy}>Submit version</ActionButton>}
        {record.type === "instrument" && record.state === "under-review" && reviewer && !own && <><ActionButton tone="accent" onClick={() => onReview("approve")} disabled={busy}><Check size={11} /> Approve</ActionButton><ActionButton tone="danger" onClick={() => onReview("reject")} disabled={busy}><X size={11} /> Reject</ActionButton></>}
        {(canWrite || own) && <ActionButton tone="danger" onClick={onDelete} disabled={busy}><Trash2 size={11} /> Delete</ActionButton>}
      </div>
    </div>
  </article>;
}

export function LegalConfirmation({ instruments, law, setLaw, instrumentId, setInstrumentId, exact, setExact, advice, setAdvice, onSubmit, busy, confirmedInstrumentId }: {
  instruments: WorkspaceRecord[]; law: string; setLaw: (value: string) => void; instrumentId: string; setInstrumentId: (value: string) => void;
  exact: boolean; setExact: (value: boolean) => void; advice: boolean; setAdvice: (value: boolean) => void;
  onSubmit: (event: FormEvent) => void; busy: boolean; confirmedInstrumentId?: string | null;
}) {
  return <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-amber-100/15 bg-amber-100/[0.025] p-4">
    <div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-amber-50/70">Governing-law & instrument confirmation</p><p className="mt-1 text-[9px] leading-relaxed text-white/35">This records a software confirmation only. The exact approved version requires three current, independently controlled reviewer approvals. Confirmation does not enact it.</p></div>
    <div><FieldLabel>Governing law (max 500 characters)</FieldLabel><textarea value={law} onChange={(e) => setLaw(e.target.value)} maxLength={500} rows={2} autoComplete="off" className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white/75 outline-none focus:border-amber-100/30" placeholder="Enter governing-law text for private workspace confirmation." /></div>
    <div><FieldLabel>Exact approved instrument version</FieldLabel><select value={instrumentId} onChange={(e) => { setInstrumentId(e.target.value); setExact(false); }} className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white/75"><option value="">Select an approved instrument</option>{instruments.map((item) => <option key={item.id} value={item.id}>Version {item.version} · {item.id}</option>)}</select>
      {confirmedInstrumentId && <p className="mt-1 break-all text-[9px] text-white/35">Currently recorded instrument reference · {confirmedInstrumentId}</p>}</div>
    <label className="flex items-start gap-2 text-[9px] leading-relaxed text-white/45"><input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} className="mt-0.5 accent-amber-200" />I confirm the exact selected approved instrument version, not merely a title or later version.</label>
    <label className="flex items-start gap-2 text-[9px] leading-relaxed text-white/45"><input type="checkbox" checked={advice} onChange={(e) => setAdvice(e.target.checked)} className="mt-0.5 accent-amber-200" />I acknowledge that qualified legal advice is required; this software confirmation is not legal advice.</label>
    <ActionButton tone="accent" type="submit" disabled={busy || !law.trim() || !instrumentId || !exact || !advice}>Record private confirmation</ActionButton>
  </form>;
}

export function InlineAlert({ text, retry }: { text: string; retry?: () => void }) {
  return <div role="alert" className="flex flex-col gap-2 rounded-lg border border-rose-200/15 bg-rose-200/[0.035] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-start gap-2 text-[10px] leading-relaxed text-rose-50/65"><AlertCircle size={13} className="mt-px shrink-0" />{text}</p>{retry && <button onClick={retry} className="flex items-center gap-1 self-start text-[9px] text-rose-50/60 hover:text-white"><RefreshCw size={10} /> Retry</button>}</div>;
}

export function EmptyPanel({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center"><Archive className="mx-auto text-white/20" size={17} /><p className="mt-2 text-[10px] text-white/55">{title}</p><p className="mt-1 text-[9px] text-white/30">{text}</p></div>;
}

export function SkeletonRows() {
  return <div aria-label="Loading private workspace" className="space-y-2">{[0, 1, 2].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.035]" />)}<span className="sr-only"><Loader2 /> Loading</span></div>;
}
