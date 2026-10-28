import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWaveVault, type VaultGrant } from "@/hooks/use-wave-vault";
import WaveRecipientPicker from "@/components/wave-recipient-picker";
import type { VaultFile } from "@shared/wave-vault";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeft, File, FilePlus2, Folder,
  FolderOpen, LoaderCircle, LockKeyhole, Pencil, Plus, Radio, RefreshCw, Search, Share2, Trash2, X,
} from "lucide-react";

type VaultTab = "owned" | "shared";
type EditTarget = { file: VaultFile; name: string; folder: string };
const shell = "rounded-2xl border border-[#d6d3c8] bg-[#f8f7f1]";
const field = "min-h-11 w-full rounded-xl border border-[#d4d1c6] bg-[#fdfcf8] px-3.5 text-sm text-[#283b35] placeholder:text-[#9b9c91] outline-none transition focus:border-[#287c70] focus:ring-2 focus:ring-[#287c70]/10";
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#155b50] px-4 text-sm font-semibold text-[#f4f3e8] transition hover:bg-[#0e493f] disabled:cursor-not-allowed disabled:opacity-50";
const quiet = "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#d4d1c6] px-3 text-xs font-semibold text-[#40524e] transition hover:border-[#8caaa2] hover:bg-[#eeeee6] disabled:cursor-not-allowed disabled:opacity-50";
const uuidPath = /^\/api\/wave-vault\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/content$/i;
const sizeLabel = (size: number) => size < 1024 ? `${size} B` : size < 1024 ** 2 ? `${(size / 1024).toFixed(1)} KiB` : `${(size / 1024 ** 2).toFixed(1)} MiB`;
const dateLabel = (date: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(date));
const shortAddress = (value: string) => value.length > 30 ? `${value.slice(0, 14)}…${value.slice(-10)}` : value;

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "error" }) {
  const styles = {
    info: "border-[#bfd0cf] bg-[#e9f0ec] text-[#3d6867]",
    warning: "border-[#e2c89d] bg-[#f7eedc] text-[#795d32]",
    error: "border-[#dfbbb1] bg-[#f5e9e4] text-[#8a5040]",
  };
  return <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed ${styles[tone]}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div>{children}</div></div>;
}

function FileRow({ file, downloading, onDownload, onEdit, onDelete, onShare }: {
  file: VaultFile; downloading: boolean; onDownload: (file: VaultFile) => void;
  onEdit: (file: VaultFile) => void; onDelete: (file: VaultFile) => void; onShare: (file: VaultFile) => void;
}) {
  const statusText: Record<string, string> = { pending: "Preparing", uploading: "Uploading", ready: "Ready", failed: "Failed", deleting: "Deleting" };
  const statusTone = file.status === "ready" ? "text-[#3b795f] bg-[#e6f0e7]" : file.status === "failed" ? "text-[#8a5040] bg-[#f5e9e4]" : "text-[#806338] bg-[#f7eedc]";
  return <article className="grid gap-3 border-b border-[#e6e4da] px-4 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-testid={`vault-file-${file.id}`}>
    <div className="flex min-w-0 items-start gap-3">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d9ded1] bg-[#edf1e8] text-[#477363]"><File className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="max-w-full break-all text-sm font-semibold text-[#2b3934]" title={file.name}>{file.name}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${statusTone}`} role="status">{statusText[file.status] ?? file.status}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#7e867b]">
          <span className="inline-flex items-center gap-1"><Folder className="h-3 w-3" />{file.folder || "Root"}</span>
          <span>{sizeLabel(file.size)}</span><span>{dateLabel(file.createdAt)}</span>
          <span className="max-w-full truncate font-mono" title={file.uri}>URI: {file.uri}</span>
        </div>
        {!file.isOwner && <p className="mt-1 text-[10px] text-[#829087]">Owned by {shortAddress(file.ownerWave)}</p>}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-1 sm:justify-end">
      <button type="button" onClick={() => onDownload(file)} disabled={file.status !== "ready" || downloading} className={quiet} aria-label={`Download ${file.name}`} data-testid={`vault-download-${file.id}`}>{downloading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}Download</button>
      {file.isOwner && file.status === "ready" && <>
        <button type="button" onClick={() => onEdit(file)} className={quiet} aria-label={`Rename or move ${file.name}`} data-testid={`vault-edit-${file.id}`}><Pencil className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only">Organize</span></button>
        <button type="button" onClick={() => onShare(file)} className={quiet} aria-label={`Manage access for ${file.name}`} data-testid={`vault-share-${file.id}`}><Share2 className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only">Access</span></button>
      </>}
      {file.isOwner && <button type="button" onClick={() => onDelete(file)} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#dfc7b3] px-3 text-xs font-semibold text-[#855b3c] transition hover:bg-[#f6eee5]" aria-label={`${file.status === "deleting" ? "Retry cleanup for" : "Delete"} ${file.name}`} data-testid={`vault-delete-${file.id}`}><Trash2 className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only">{file.status === "deleting" ? "Retry cleanup" : "Delete"}</span></button>}
    </div>
  </article>;
}

export default function WaveVaultPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const vault = useWaveVault(isAuthenticated, user?.id);
  const [tab, setTab] = useState<VaultTab>("owned");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folder, setFolder] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [actionError, setActionError] = useState("");
  const [uploadingNames, setUploadingNames] = useState<string[]>([]);
  const [downloadId, setDownloadId] = useState("");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [shareTarget, setShareTarget] = useState<VaultFile | null>(null);
  const [grants, setGrants] = useState<VaultGrant[]>([]);
  const [grantAddress, setGrantAddress] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteRetry, setDeleteRetry] = useState<VaultFile | null>(null);
  const controllers = useRef(new Set<AbortController>());
  const uploadControllers = useRef(new Set<AbortController>());
  const uploadBatch = useRef(0);
  const currentUserId = useRef(user?.id);
  const previousUserId = useRef(user?.id);
  const mounted = useRef(false);
  const downloadController = useRef<AbortController | null>(null);
  const shareTargetRef = useRef<VaultFile | null>(null);
  const shareSession = useRef(0);
  const editSession = useRef(0);
  currentUserId.current = user?.id;
  const isCurrentOwner = (ownerId: string | undefined) => mounted.current && !!ownerId && currentUserId.current === ownerId;

  useLayoutEffect(() => {
    if (previousUserId.current !== user?.id) {
      previousUserId.current = user?.id;
      setTab("owned");
      setSearch("");
      controllers.current.forEach(controller => controller.abort());
      controllers.current.clear();
      uploadControllers.current.clear();
      uploadBatch.current++;
      downloadController.current = null;
      shareTargetRef.current = null;
      shareSession.current++;
      editSession.current++;
      setShareTarget(null); setGrants([]); setGrantAddress(""); setSelectedFiles([]);
      setUploadingNames([]); setUploadOpen(false); setEditTarget(null); setActionError("");
      setGrantLoading(false); setDeleteRetry(null); setSaving(false); setDownloadId("");
    }
  }, [user?.id]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      shareSession.current++;
      editSession.current++;
      controllers.current.forEach(controller => controller.abort());
      controllers.current.clear();
      uploadControllers.current.clear();
      uploadBatch.current++;
      downloadController.current = null;
    };
  }, []);
  const allFiles = vault.files.data?.files ?? [];
  const ownedCount = allFiles.filter(file => file.isOwner).length;
  const sharedCount = allFiles.filter(file => !file.isOwner).length;
  const shownFiles = useMemo(() => allFiles.filter(file => {
    const isOwned = file.isOwner;
    const matchesTab = tab === "owned" ? isOwned : !isOwned;
    const term = search.trim().toLocaleLowerCase();
    return matchesTab && (!term || [file.name, file.folder, file.uri].some(value => value.toLocaleLowerCase().includes(term)));
  }), [allFiles, tab, search]);
  const limits = vault.files.data?.limits;
  const used = Number(vault.files.data?.usedBytes ?? 0);
  const usedLabel = Number.isFinite(used) ? sizeLabel(used) : vault.files.data?.usedBytes ?? "—";
  const openSharedFiles = () => {
    setSearch("");
    setTab("shared");
    void vault.refresh().catch(error => {
      setActionError(error instanceof Error ? error.message : "Could not refresh shared files.");
    });
  };

  const finishUpload = async (file: File) => {
    if (!vault.files.data?.storageReady) return;
    const ownerId = user?.id;
    setActionError("");
    const controller = new AbortController();
    controllers.current.add(controller);
    uploadControllers.current.add(controller);
    setUploadingNames(current => [...current, file.name]);
    try {
      const created = await vault.createFile({
        name: file.name, size: file.size, mediaType: file.type || "application/octet-stream", folder: folder.trim().replace(/^\/+|\/+$/g, ""),
      }, controller.signal);
      const parsedUrl = new URL(created.uploadUrl, window.location.origin);
      if (parsedUrl.origin !== window.location.origin || !uuidPath.test(parsedUrl.pathname) || parsedUrl.search || parsedUrl.hash) {
        throw new Error("The server returned an unsafe upload destination. No file bytes were sent.");
      }
      const response = await fetch(parsedUrl.href, {
        method: "PUT", credentials: "include", signal: controller.signal,
        headers: { "Content-Type": "application/octet-stream" }, body: file,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : `Upload failed (${response.status})`);
      await vault.refresh();
    } catch (error) {
      if (isCurrentOwner(ownerId)) {
        if (error instanceof DOMException && error.name === "AbortError") setActionError(`Upload cancelled: ${file.name}`);
        else setActionError(error instanceof Error ? error.message : `Could not upload ${file.name}.`);
        await vault.refresh().catch(refreshError => {
          if (isCurrentOwner(ownerId)) setActionError(`${error instanceof Error ? error.message : "Upload failed."} Refresh failed: ${refreshError instanceof Error ? refreshError.message : "try again."}`);
        });
      }
    } finally {
      controllers.current.delete(controller);
      uploadControllers.current.delete(controller);
      if (isCurrentOwner(ownerId)) setUploadingNames(current => current.filter(name => name !== file.name));
    }
  };
  const startUploads = async () => {
    if (!vault.files.data?.storageReady || selectedFiles.length === 0) return;
    const files = [...selectedFiles];
    const uploadOwner = user?.id;
    const batch = ++uploadBatch.current;
    setSelectedFiles([]);
    setUploadOpen(false);
    for (const file of files) {
      if (!isCurrentOwner(uploadOwner) || uploadBatch.current !== batch) break;
      await finishUpload(file);
    }
  };
  const download = async (file: VaultFile) => {
    const ownerId = user?.id;
    if (!isCurrentOwner(ownerId)) return;
    downloadController.current?.abort();
    const controller = new AbortController();
    downloadController.current = controller;
    controllers.current.add(controller);
    setActionError(""); setDownloadId(file.id);
    try {
      const response = await fetch(`/api/wave-vault/${encodeURIComponent(file.id)}/content`, { credentials: "include", signal: controller.signal });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body?.error === "string" ? body.error : `Download failed (${response.status})`);
      }
      const blob = await response.blob();
      if (!isCurrentOwner(ownerId) || controller.signal.aborted || downloadController.current !== controller) return;
      const objectUrl = URL.createObjectURL(blob);
      if (!isCurrentOwner(ownerId) || controller.signal.aborted || downloadController.current !== controller) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = file.name; anchor.style.display = "none";
      if (!isCurrentOwner(ownerId) || controller.signal.aborted || downloadController.current !== controller) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      if (isCurrentOwner(ownerId) && !controller.signal.aborted && downloadController.current === controller) {
        setActionError(error instanceof Error ? error.message : "Download failed.");
      }
    } finally {
      controllers.current.delete(controller);
      if (downloadController.current === controller) {
        downloadController.current = null;
        if (isCurrentOwner(ownerId)) setDownloadId("");
      }
    }
  };
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    const ownerId = user?.id;
    const session = editSession.current;
    const fileId = editTarget.file.id;
    setSaving(true); setActionError("");
    try {
      await vault.updateFile(fileId, { name: editTarget.name.trim(), folder: editTarget.folder.trim().replace(/^\/+|\/+$/g, "") });
      if (!isCurrentOwner(ownerId) || editSession.current !== session) return;
      setEditTarget(null);
      await vault.refresh();
    } catch (error) {
      if (isCurrentOwner(ownerId) && editSession.current === session) setActionError(error instanceof Error ? error.message : "Could not update file.");
    } finally {
      if (isCurrentOwner(ownerId) && editSession.current === session) setSaving(false);
    }
  };
  const deleteFile = async (file: VaultFile) => {
    if (!window.confirm(`Delete “${file.name}”? Shared access will end, but this cannot erase copies already downloaded.`)) return;
    const ownerId = user?.id;
    if (!isCurrentOwner(ownerId)) return;
    setActionError("");
    setDeleteRetry(null);
    try {
      await vault.deleteFile(file.id);
      if (isCurrentOwner(ownerId)) await vault.refresh();
    } catch (error) {
      if (isCurrentOwner(ownerId)) {
        setDeleteRetry(file);
        setActionError(error instanceof Error ? error.message : "Could not delete file.");
      }
    }
  };
  const retryDelete = async () => {
    if (!deleteRetry) return;
    const file = deleteRetry;
    const ownerId = user?.id;
    if (!isCurrentOwner(ownerId)) return;
    setSaving(true); setActionError("");
    try {
      await vault.deleteFile(file.id);
      if (isCurrentOwner(ownerId)) {
        setDeleteRetry(null);
        await vault.refresh();
      }
    } catch (error) {
      if (isCurrentOwner(ownerId)) setActionError(error instanceof Error ? error.message : "Cleanup is still pending. Retry when ready.");
    } finally { if (isCurrentOwner(ownerId)) setSaving(false); }
  };
  const openEdit = (file: VaultFile) => {
    editSession.current++;
    setEditTarget({ file, name: file.name, folder: file.folder });
  };
  const closeEdit = () => {
    editSession.current++;
    setEditTarget(null);
    setSaving(false);
  };
  const openShare = async (file: VaultFile) => {
    const ownerId = user?.id;
    if (!isCurrentOwner(ownerId)) return;
    const session = ++shareSession.current;
    shareTargetRef.current = file;
    setShareTarget(file); setGrantAddress(""); setGrants([]); setActionError(""); setGrantLoading(true);
    try {
      const response = await vault.getGrants(file.id);
      if (isCurrentOwner(ownerId) && shareSession.current === session && shareTargetRef.current?.id === file.id) setGrants(response.grants);
    } catch (error) {
      if (isCurrentOwner(ownerId) && shareSession.current === session && shareTargetRef.current?.id === file.id) setActionError(error instanceof Error ? error.message : "Could not load access list.");
    } finally {
      if (isCurrentOwner(ownerId) && shareSession.current === session && shareTargetRef.current?.id === file.id) setGrantLoading(false);
    }
  };
  const addGrant = async (event: FormEvent) => {
    event.preventDefault();
    if (!shareTarget || !grantAddress.trim()) return;
    const ownerId = user?.id;
    const targetId = shareTarget.id;
    const session = shareSession.current;
    const address = grantAddress;
    const isCurrentShare = () => isCurrentOwner(ownerId) && shareSession.current === session && shareTargetRef.current?.id === targetId;
    setSaving(true); setActionError("");
    try {
      await vault.createGrant(targetId, address);
      if (!isCurrentShare()) return;
      setGrantAddress("");
      const response = await vault.getGrants(targetId);
      if (isCurrentShare()) setGrants(response.grants);
    } catch (error) { if (isCurrentShare()) setActionError(error instanceof Error ? error.message : "Could not grant access."); }
    finally { if (isCurrentShare()) setSaving(false); }
  };
  const removeGrant = async (grant: VaultGrant) => {
    if (!shareTarget || !window.confirm(`Revoke access for ${grant.waveAddress}?`)) return;
    const ownerId = user?.id;
    const targetId = shareTarget.id;
    const session = shareSession.current;
    const isCurrentShare = () => isCurrentOwner(ownerId) && shareSession.current === session && shareTargetRef.current?.id === targetId;
    setSaving(true); setActionError("");
    try {
      await vault.revokeGrant(targetId, grant.userId);
      if (isCurrentShare()) setGrants(current => current.filter(item => item.userId !== grant.userId));
    } catch (error) { if (isCurrentShare()) setActionError(error instanceof Error ? error.message : "Could not revoke access."); }
    finally { if (isCurrentShare()) setSaving(false); }
  };
  const closeShare = () => {
    shareSession.current++;
    shareTargetRef.current = null;
    setShareTarget(null); setGrants([]); setGrantAddress(""); setGrantLoading(false); setSaving(false);
  };
  const pickFiles = (event: ChangeEvent<HTMLInputElement>) => setSelectedFiles(Array.from(event.target.files ?? []));

  return <main className="min-h-[100dvh] bg-[#eeede5] text-[#25332f]" data-testid="wave-vault">
    <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-5 sm:px-7 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d7d5ca] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/hub" title="Back to hub" className="grid h-9 w-9 place-items-center rounded-xl border border-[#d6d4c9] bg-[#f7f6ef] text-[#68776f] transition hover:text-[#155b50] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287c70] focus-visible:ring-offset-2" aria-label="Back to hub" data-testid="vault-back-to-hub"><ArrowLeft className="h-4 w-4" /></Link>
          <div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4f8e72]" /><span className="text-[10px] font-bold uppercase tracking-[.22em] text-[#587469]">NexusOS · Private storage</span></div><h1 className="mt-0.5 font-[var(--font-display)] text-xl font-semibold tracking-tight text-[#273a34] sm:text-2xl">Wave Vault</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/streaming" className={quiet} data-testid="vault-live-broadcasts"><Radio className="h-3.5 w-3.5" />Live broadcasts</Link>
          <Link href="/live-guide" className={quiet} aria-label="Read the Live streaming guide">Live streaming guide</Link>
          {user && <span className="rounded-full border border-[#d4d8cd] bg-[#f6f5ed] px-3 py-2 text-[10px] font-semibold text-[#586f63]">{user.username || "Signed in"}</span>}
        </div>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-[26px] border border-[#ced6c8] bg-[#dae3d4] p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-24 h-72 w-72 rounded-full border border-[#92aa98]/40" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8fad9a]/50 bg-[#edf1e7]/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.15em] text-[#4e7464]"><LockKeyhole className="h-3 w-3" /> Coordinates are catalogue namespaces</div>
            <h2 className="mt-4 font-[var(--font-display)] text-3xl font-semibold leading-tight tracking-[-.04em] text-[#244038] sm:text-5xl">Your files, filed<br className="hidden sm:block" /> by wave address.</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#566b5d]">Keep original bytes organized in private folders. Grant access only to an exact registered wave address.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#b9cbbb]/70 bg-[#f4f4ea]/65 px-4 py-3">
            <FolderOpen className="h-5 w-5 text-[#54786a]" /><div><div className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#698074]">Account storage</div><div className="mt-1 font-mono text-sm font-semibold text-[#314a3e]">{usedLabel}{limits ? ` / ${sizeLabel(limits.maxAccountBytes)}` : ""}</div></div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Notice tone="warning"><strong>Access is account-controlled.</strong> App Storage encrypts files at rest, but this is not end-to-end encryption. Revoking access cannot erase copies already downloaded.</Notice>
        <Notice><strong>Files remain unchanged bytes.</strong> Coordinates identify files, not passwords. No public links or storage URLs are exposed here.</Notice>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[#7b8178]">Vault file grants and live broadcast invitations are separate permissions. Sharing a file never grants access to a live room.</p>

       {vault.files.data && !vault.files.data.storageReady && <div className="mt-4" data-testid="vault-storage-not-ready"><Notice tone="warning"><strong>Storage setup or verification is incomplete.</strong> Uploads are disabled until private storage is verified. You can browse stored filenames, but downloads may also be unavailable.</Notice></div>}
      {actionError && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Notice tone="error">{actionError}</Notice><div className="flex gap-2">{deleteRetry && <button type="button" disabled={saving} onClick={() => void retryDelete()} className={quiet} data-testid="vault-delete-retry"><RefreshCw className="h-3.5 w-3.5" />{saving ? "Retrying…" : "Retry cleanup"}</button>}<button type="button" onClick={() => { setActionError(""); void vault.refresh(); }} className={quiet}>Dismiss & refresh</button></div></div>}

      <section className={`${shell} mt-5 p-4 sm:p-5`} aria-label="Vault limits">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xs font-bold uppercase tracking-[.14em] text-[#52675c]">Storage rules</h2><p className="mt-1 text-[11px] text-[#82877c]">Any file type · original bytes · no wallet charge or NXT</p></div>
          <div className="flex flex-wrap gap-2 text-[10px] font-medium text-[#62736a]">
            <span className="rounded-lg bg-[#eeeee6] px-2.5 py-2">Up to {limits ? sizeLabel(limits.maxFileBytes) : "256 MiB"} / file</span>
            <span className="rounded-lg bg-[#eeeee6] px-2.5 py-2">Up to {limits ? sizeLabel(limits.maxAccountBytes) : "1 GiB"} / account</span>
            <span className="rounded-lg bg-[#eeeee6] px-2.5 py-2">Up to {limits?.maxFiles ?? 200} live files</span>
          </div>
        </div>
      </section>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav className="flex border-b border-[#d6d4c9]" aria-label="Vault files">
          {(["owned", "shared"] as const).map((id, index) => <button type="button" key={id} onClick={() => { setTab(id); if (id === "shared") void vault.refresh().catch(error => setActionError(error instanceof Error ? error.message : "Could not refresh shared files.")); }} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold transition ${tab === id ? "border-[#287b6a] text-[#21594e]" : "border-transparent text-[#899087] hover:text-[#52675c]"}`} aria-current={tab === id ? "page" : undefined} data-testid={`vault-tab-${id}`}><span className="inline-flex items-center gap-1.5">{index === 0 ? <Folder className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}{index === 0 ? "My files" : "Shared with me"}</span><span className="rounded-full bg-[#eeeee6] px-1.5 py-0.5 text-[9px] font-mono text-[#68776f]" aria-label={`${id === "owned" ? ownedCount : sharedCount} files`}>{id === "owned" ? ownedCount : sharedCount}</span></button>)}
        </nav>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Search by filename, folder, or wave file URI</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#899087]" /><input className={`${field} pl-9`} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, folder, or URI" data-testid="vault-search" /></label>
          <button type="button" className={`${primary} min-h-11`} onClick={() => { setUploadOpen(true); setActionError(""); }} disabled={!isAuthenticated || !vault.files.data?.storageReady || vault.files.isLoading} title={!vault.files.data?.storageReady ? "Storage setup or verification must complete before upload." : undefined} data-testid="vault-upload-open"><FilePlus2 className="h-4 w-4" />Add files</button>
        </div>
      </div>

      {tab === "owned" && sharedCount > 0 && <div className="mt-3" data-testid="vault-shared-discoverability">
        <Notice><div className="flex flex-wrap items-center justify-between gap-3"><span>You have {sharedCount} {sharedCount === 1 ? "file" : "files"} shared with you. They’re in Shared with me.</span><button type="button" onClick={openSharedFiles} className={`${quiet} shrink-0`} data-testid="vault-open-shared">Open Shared with me<ArrowLeft className="h-3.5 w-3.5 rotate-180" /></button></div></Notice>
      </div>}

      <section className={`${shell} mt-4 overflow-hidden`} aria-label={tab === "owned" ? "Your files" : "Files shared with you"}>
        <div className="flex items-center justify-between border-b border-[#e4e2d8] px-4 py-3">
          <div><h2 className="text-sm font-semibold text-[#344540]">{tab === "owned" ? "My files" : "Shared with me"}</h2><p className="mt-0.5 text-[10px] text-[#878b80]">{shownFiles.length} listed · folders are virtual paths</p></div>
          <button type="button" onClick={() => void vault.refresh()} className={quiet} disabled={vault.files.isFetching} aria-label="Refresh files" data-testid="vault-refresh"><RefreshCw className={`h-3.5 w-3.5 ${vault.files.isFetching ? "animate-spin" : ""}`} />Refresh</button>
        </div>
        {vault.files.isLoading || authLoading ? <div className="space-y-3 p-5" aria-label="Loading files" data-testid="vault-loading"><div className="h-5 w-40 animate-pulse rounded bg-[#e9e8de]" /><div className="h-16 animate-pulse rounded-xl bg-[#eeede5]" /><div className="h-16 animate-pulse rounded-xl bg-[#eeede5]" /></div>
          : vault.files.isError ? <div className="p-5"><Notice tone="error">{vault.files.error instanceof Error ? vault.files.error.message : "Could not load vault files."}</Notice><button type="button" onClick={() => void vault.files.refetch()} className={`${quiet} mt-3`}><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>
          : shownFiles.length === 0 ? <div className="px-6 py-12 text-center" data-testid="vault-empty"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#d9ded1] bg-[#edf1e8] text-[#477363]"><FolderOpen className="h-5 w-5" /></div><h3 className="mt-3 text-sm font-semibold text-[#344540]">{search ? "No matching files" : tab === "owned" ? "Nothing filed here yet" : "No files shared with you"}</h3><p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#7b8178]">{search ? "Try a different filename, folder path, or wave file URI." : tab === "owned" ? "Add original files and organize them in virtual nested folders." : "When an owner grants your registered wave address access, files will appear here."}</p></div>
          : shownFiles.map(file => <FileRow key={file.id} file={file} downloading={downloadId === file.id} onDownload={download} onEdit={openEdit} onDelete={deleteFile} onShare={openShare} />)}
      </section>
      {uploadingNames.length > 0 && <section className="mt-4 rounded-2xl border border-[#bfd0cf] bg-[#e9f0ec] p-4" role="status" aria-live="polite" data-testid="vault-upload-progress"><div className="flex items-center gap-2 text-xs font-semibold text-[#3d6867]"><LoaderCircle className="h-4 w-4 animate-spin" />Uploading original file bytes</div><ul className="mt-2 space-y-1 text-xs text-[#58746d]">{uploadingNames.map((name, index) => <li key={`${name}-${index}`} className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{name}</span><button type="button" className="underline underline-offset-2" onClick={() => { uploadBatch.current++; uploadControllers.current.forEach(controller => controller.abort()); }}>Cancel upload</button></li>)}</ul><p className="mt-2 text-[10px]">Transfer is in progress. No percentage is estimated.</p></section>}
    </div>

    {uploadOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#24342f]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setUploadOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="upload-title" className="w-full max-w-lg rounded-t-[24px] border border-[#d6d3c8] bg-[#f8f7f1] p-5 shadow-2xl sm:rounded-[24px] sm:p-6" data-testid="vault-upload-dialog">
        <div className="flex items-start justify-between"><div><h2 id="upload-title" className="font-[var(--font-display)] text-xl font-semibold text-[#293a34]">Add original files</h2><p className="mt-1 text-xs text-[#7b8178]">Files are uploaded unchanged; a folder is just a catalogue path.</p></div><button type="button" className={quiet} onClick={() => setUploadOpen(false)} aria-label="Close upload dialog"><X className="h-4 w-4" /></button></div>
        {!vault.files.data?.storageReady && <div className="mt-4"><Notice tone="warning">Private storage setup or verification is incomplete. Upload cannot start.</Notice></div>}
        <label className="mt-5 block text-xs font-semibold text-[#51665c]">Choose files<input type="file" multiple onChange={pickFiles} className="mt-2 block w-full text-xs file:mr-3 file:min-h-10 file:rounded-xl file:border-0 file:bg-[#e8eee3] file:px-4 file:font-semibold file:text-[#31584d] hover:file:bg-[#dde8dc]" data-testid="vault-file-input" /></label>
        {selectedFiles.length > 0 && <div className="mt-3 max-h-32 overflow-y-auto rounded-xl bg-[#eeeee6] p-3 text-xs text-[#52675c]">{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex justify-between gap-3 py-1"><span className="truncate">{file.name}</span><span className="shrink-0">{sizeLabel(file.size)}</span></div>)}</div>}
        <label className="mt-4 block text-xs font-semibold text-[#51665c]">Folder path <span className="font-normal text-[#879087]">(optional; e.g. projects/field-notes)</span><input className={`${field} mt-2`} value={folder} onChange={event => setFolder(event.target.value)} placeholder="projects/field-notes" data-testid="vault-upload-folder" /></label>
        <p className="mt-3 text-[10px] leading-relaxed text-[#82877c]">Maximum 256 MiB per file, 1 GiB per account, 200 live files. Empty files are allowed.</p>
        <div className="mt-5 flex justify-end gap-2"><button type="button" className={quiet} onClick={() => setUploadOpen(false)}>Cancel</button><button type="button" className={primary} disabled={!selectedFiles.length || !vault.files.data?.storageReady} onClick={() => void startUploads()} data-testid="vault-upload-submit"><Plus className="h-4 w-4" />Upload {selectedFiles.length || ""} file{selectedFiles.length === 1 ? "" : "s"}</button></div>
      </section>
    </div>}

    {editTarget && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#24342f]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <form onSubmit={saveEdit} role="dialog" aria-modal="true" aria-labelledby="edit-title" className="w-full max-w-md rounded-t-[24px] border border-[#d6d3c8] bg-[#f8f7f1] p-5 sm:rounded-[24px] sm:p-6" data-testid="vault-edit-dialog">
        <h2 id="edit-title" className="font-[var(--font-display)] text-xl font-semibold text-[#293a34]">Organize file</h2>
        <label className="mt-4 block text-xs font-semibold text-[#51665c]">Filename<input required className={`${field} mt-2`} value={editTarget.name} onChange={event => setEditTarget({ ...editTarget, name: event.target.value })} data-testid="vault-edit-name" /></label>
        <label className="mt-4 block text-xs font-semibold text-[#51665c]">Folder path<input className={`${field} mt-2`} value={editTarget.folder} onChange={event => setEditTarget({ ...editTarget, folder: event.target.value })} placeholder="Root or nested/path" data-testid="vault-edit-folder" /></label>
        <div className="mt-5 flex justify-end gap-2"><button type="button" className={quiet} onClick={closeEdit}>Cancel</button><button type="submit" className={primary} disabled={saving || !editTarget.name.trim()}>{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
    </div>}

    {shareTarget && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#24342f]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="access-title" className="w-full max-w-lg rounded-t-[24px] border border-[#d6d3c8] bg-[#f8f7f1] p-5 sm:rounded-[24px] sm:p-6" data-testid="vault-access-dialog">
        <div className="flex items-start justify-between gap-3"><div><h2 id="access-title" className="font-[var(--font-display)] text-xl font-semibold text-[#293a34]">Private access</h2><p className="mt-1 break-all text-xs text-[#7b8178]">{shareTarget.name}</p></div><button type="button" className={quiet} onClick={closeShare} aria-label="Close access dialog"><X className="h-4 w-4" /></button></div>
        <p className="mt-4 rounded-xl bg-[#eeeee6] px-3 py-2 text-[11px] leading-relaxed text-[#68766d]">Grant read access to an exact registered wave address. Revoking access cannot erase downloaded copies.</p>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={addGrant}><label className="min-w-0 flex-1"><span className="sr-only">Exact registered wave address</span><input className={field} value={grantAddress} onChange={event => setGrantAddress(event.target.value)} placeholder="Exact registered wave address" required data-testid="vault-grant-address" /></label><button type="submit" className={primary} disabled={saving || !grantAddress.trim()}><Share2 className="h-4 w-4" />Grant access</button></form>
        <div className="mt-2"><WaveRecipientPicker isAuthenticated={isAuthenticated} accountKey={user?.id} variant="light" onSelect={setGrantAddress} /></div>
        <h3 className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#728076]">Current grants</h3>
        {grantLoading ? <div className="mt-3 h-12 animate-pulse rounded-xl bg-[#eeede5]" aria-label="Loading grants" /> : grants.length ? <ul className="mt-2 divide-y divide-[#e5e3d9] rounded-xl border border-[#e5e3d9]">{grants.map(grant => <li key={grant.userId} className="flex items-center justify-between gap-3 px-3 py-3"><div className="min-w-0"><div className="break-all font-mono text-xs text-[#40574c]">{grant.waveAddress}</div><div className="mt-1 text-[10px] text-[#878b80]">Granted {dateLabel(grant.createdAt)}</div></div><button type="button" disabled={saving} onClick={() => void removeGrant(grant)} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl border border-[#dfc7b3] px-3 text-xs font-semibold text-[#855b3c] hover:bg-[#f6eee5]" data-testid={`vault-revoke-${grant.userId}`}><X className="h-3.5 w-3.5" />Revoke</button></li>)}</ul> : <p className="mt-2 rounded-xl border border-dashed border-[#d6d3c8] px-3 py-4 text-center text-xs text-[#82877c]">No addresses have access yet.</p>}
      </section>
    </div>}
  </main>;
}
