import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  Archive, Check, ChevronDown, CircleAlert, Download, FilePlus2, Fingerprint, KeyRound,
  LockKeyhole, Plus, RefreshCw, ShieldCheck, UserPlus, X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  ActionButton, ConsentCheck, EmptyPanel, FieldLabel, InlineAlert, LegalConfirmation,
  RecordCard, SkeletonRows, StatusPill, type WorkspaceRecord,
} from "@/components/private-trust-workspace-parts";

const BASE = "/api/private-trusts";
const CONSENT_VERSION = "private-trust-v1";
const FIVE_MIB = 5 * 1024 * 1024;

type TrustKind = "family" | "charitable";
type TrustRole = "custodian" | "contributor" | "reviewer" | "reader";
type RecordType = "lineage" | "beneficiary" | "discussion" | "instrument";
type Workspace = { id: string; kind: TrustKind; role: TrustRole; consentRequired: boolean };
type RecordItem = WorkspaceRecord;
type Member = { user_id: string; role: TrustRole; consent_version: string | null; revoked_at: string | null };
type Audit = { action: string; target_id: string | null; created_at: string };
type Detail = {
  id: string; kind: TrustKind; role: TrustRole;
  settings: { label?: string; governingLaw?: string | null; confirmedInstrumentId?: string | null; legalAdviceAcknowledged?: boolean };
  members: Member[]; audit: Audit[]; records: RecordItem[]; expiresAt: string;
  walletForwardingEnabled: false; legalEnactmentEnabled: false;
};
type Status = {
  storageReady: boolean; identityReady: boolean; retentionSweep: "pending" | "ok" | "unavailable";
  consentVersion: string; walletForwardingEnabled: false;
  legalEnactmentEnabled: false; verification: string; evidenceUploadsEnabled?: boolean;
};

const kindTitle: Record<TrustKind, string> = { family: "Family trust workspace", charitable: "Charitable trust workspace" };
const recordNames: Record<RecordType, string> = {
  lineage: "Private lineage note", beneficiary: "Beneficiary record",
  discussion: "Private discussion", instrument: "Governing instrument",
};
const recordOptions: RecordType[] = ["lineage", "beneficiary", "discussion", "instrument"];

async function requestJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await apiRequest(method, url, body);
  return response.json() as Promise<T>;
}

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : "The private workspace request did not complete.";
  if (message.includes("503")) return "Private storage or a shared identity dependency is unavailable (503). No successful result was confirmed.";
  if (message.includes("403")) return "Access is not currently authorized (403). Independent human verification and a separately reviewed workspace role are required.";
  if (message.includes("401")) return "Sign-in is required. Please sign in again and retry.";
  return message.replace(/<[^>]*>/g, "").slice(0, 260);
}

export default function PrivateTrustWorkspace() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const identityId = isAuthenticated ? user?.id ?? "" : "";
  const [status, setStatus] = useState<Status | null>(null);
  const [statusOwner, setStatusOwner] = useState("");
  const [statusError, setStatusError] = useState("");
  const [workspacesState, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesOwner, setWorkspacesOwner] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [detailState, setDetail] = useState<Detail | null>(null);
  const [detailScopeVersion, setDetailScopeVersion] = useState(-1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<TrustKind>("family");
  const [createLabel, setCreateLabel] = useState("");
  const [createConsent, setCreateConsent] = useState(false);
  const [memberConsentAck, setMemberConsentAck] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>("lineage");
  const [recordBody, setRecordBody] = useState("");
  const [recordRetention, setRecordRetention] = useState("30");
  const [recordConsent, setRecordConsent] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [memberRole, setMemberRole] = useState<TrustRole>("reviewer");
  const [law, setLaw] = useState("");
  const [instrumentId, setInstrumentId] = useState("");
  const [legalAdvice, setLegalAdvice] = useState(false);
  const [exactInstrument, setExactInstrument] = useState(false);
  const [evidenceType, setEvidenceType] = useState("lineage-evidence");
  const [evidenceRetention, setEvidenceRetention] = useState("30");
  const [evidenceConsent, setEvidenceConsent] = useState(false);
  const [evidenceContent, setEvidenceContent] = useState("");
  const [evidenceMedia, setEvidenceMedia] = useState<"application/pdf" | "image/png" | "image/jpeg" | "">("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [activeTab, setActiveTab] = useState<"records" | "participants" | "audit">("records");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileReadGeneration = useRef(0);
  const evidenceUploadsEnabledRef = useRef(false);
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const identityRef = useRef(identityId);
  identityRef.current = identityId;
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;
  const scopeRef = useRef({ key: "", version: 0 });
  const scopeKey = `${identityId}\u0000${workspaceId}`;
  if (scopeRef.current.key !== scopeKey) {
    scopeRef.current = { key: scopeKey, version: scopeRef.current.version + 1 };
  }
  const currentScopeVersion = scopeRef.current.version;
  const isScopeCurrent = (version: number) => identityRef.current !== "" && scopeRef.current.version === version;
  const workspaces = workspacesOwner === identityId ? workspacesState : [];
  const visibleStatus = statusOwner === identityId && identityId ? status : null;
  const visibleStatusError = statusOwner === identityId && identityId ? statusError : "";
  const detail = detailScopeVersion === currentScopeVersion && detailState?.id === workspaceId ? detailState : null;
  const evidenceUploadsEnabled = visibleStatus?.evidenceUploadsEnabled === true;
  evidenceUploadsEnabledRef.current = evidenceUploadsEnabled;

  const clearPrivateFields = useCallback(() => {
    fileReadGeneration.current += 1;
    setRecordBody(""); setRecordConsent(false); setRecordRetention("30");
    setEvidenceContent(""); setEvidenceMedia(""); setEvidenceLabel(""); setEvidenceConsent(false); setEvidenceRetention("30");
    setLaw(""); setLegalAdvice(false); setExactInstrument(false); setInstrumentId("");
    setMemberId(""); setCreateLabel(""); setCreateConsent(false);
    setMemberConsentAck(false);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const loadStatus = useCallback(async () => {
    const requestedIdentity = identityId;
    if (!requestedIdentity) { setStatus(null); setStatusError(""); return; }
    try {
      const result = await requestJson<Status>("GET", `${BASE}/status`);
      if (identityRef.current === requestedIdentity) { setStatus(result); setStatusOwner(requestedIdentity); setStatusError(""); }
    } catch (e) { if (identityRef.current === requestedIdentity) { setStatusOwner(requestedIdentity); setStatusError(errorText(e)); } }
  }, [identityId]);

  const loadList = useCallback(async () => {
    if (!identityId) return;
    const generation = ++listGeneration.current;
    const scopeVersion = scopeRef.current.version;
    setListLoading(true); setListError("");
    try {
      const items = await requestJson<Workspace[]>("GET", BASE);
      if (generation !== listGeneration.current || !isScopeCurrent(scopeVersion)) return;
      setWorkspacesOwner(identityId);
      setWorkspaces(items);
      setWorkspaceId((current) => items.some((item) => item.id === current) ? current : "");
    } catch (e) {
      if (generation === listGeneration.current && isScopeCurrent(scopeVersion)) { setListError(errorText(e)); setWorkspaces([]); }
    } finally { if (generation === listGeneration.current && isScopeCurrent(scopeVersion)) setListLoading(false); }
  }, [identityId]);

  const loadDetail = useCallback(async (id: string) => {
    const generation = ++detailGeneration.current;
    const scopeVersion = scopeRef.current.version;
    if (!identityId || !id || id !== workspaceIdRef.current || workspacesOwner !== identityId) { setDetail(null); return; }
    setDetailLoading(true); setDetailError(""); setDetail(null);
    try {
      const result = await requestJson<Detail>("GET", `${BASE}/${id}`);
      if (generation === detailGeneration.current && isScopeCurrent(scopeVersion) && id === workspaceIdRef.current) {
        setDetail(result); setDetailScopeVersion(scopeVersion);
      }
    } catch (e) { if (generation === detailGeneration.current && isScopeCurrent(scopeVersion)) setDetailError(errorText(e)); }
    finally { if (generation === detailGeneration.current && isScopeCurrent(scopeVersion)) setDetailLoading(false); }
  }, [identityId, workspaceId, workspacesOwner]);

  useLayoutEffect(() => {
    listGeneration.current += 1;
    detailGeneration.current += 1;
    setStatus(null); setStatusOwner(""); setStatusError("");
    setWorkspaces([]); setWorkspacesOwner(""); setWorkspaceId("");
    setDetail(null); setDetailScopeVersion(-1);
    setListError(""); setDetailError(""); setListLoading(false); setDetailLoading(false);
    setBusy(false); setNotice(""); setError(""); setCreateOpen(false);
    clearPrivateFields();
  }, [identityId, clearPrivateFields]);
  useEffect(() => { if (identityId) { void loadStatus(); void loadList(); } }, [identityId, loadStatus, loadList]);
  useEffect(() => {
    if (evidenceUploadsEnabled) return;
    fileReadGeneration.current += 1;
    setEvidenceContent(""); setEvidenceMedia(""); setEvidenceLabel(""); setEvidenceConsent(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [evidenceUploadsEnabled]);
  useLayoutEffect(() => {
    listGeneration.current += 1;
    detailGeneration.current += 1;
    setBusy(false);
    setListLoading(false);
    setDetail(null); setDetailScopeVersion(-1); setDetailError(""); setDetailLoading(false);
    clearPrivateFields(); setNotice(""); setError("");
  }, [workspaceId, clearPrivateFields]);
  useEffect(() => {
    if (workspaceId && workspacesOwner === identityId) void loadDetail(workspaceId);
  }, [workspaceId, workspacesOwner, identityId, loadDetail]);
  useEffect(() => () => {
    scopeRef.current = { ...scopeRef.current, version: scopeRef.current.version + 1 };
    identityRef.current = "";
    listGeneration.current += 1;
    detailGeneration.current += 1;
    clearPrivateFields();
  }, [clearPrivateFields]);

  const selected = workspaces.find((item) => item.id === workspaceId);
  const currentConsent = selected ? !selected.consentRequired : false;
  const canWrite = Boolean(detail && currentConsent && (detail.role === "custodian" || detail.role === "contributor"));
  const instruments = useMemo(() => (detail?.records ?? []).filter((item) => item.type === "instrument"), [detail?.records]);
  const approvedInstruments = instruments.filter((record) => record.state === "approved");

  const execute = async (work: (isCurrent: () => boolean) => Promise<void>, success: string) => {
    const scopeVersion = scopeRef.current.version;
    const isCurrent = () => isScopeCurrent(scopeVersion);
    if (!isCurrent()) return;
    setBusy(true); setError(""); setNotice("");
    try { await work(isCurrent); if (isCurrent()) setNotice(success); }
    catch (e) { if (isCurrent()) setError(errorText(e)); }
    finally { if (isCurrent()) setBusy(false); }
  };
  const refresh = async () => {
    const version = scopeRef.current.version;
    await loadList();
    if (isScopeCurrent(version) && workspaceId) await loadDetail(workspaceId);
  };
  const consentPayload = { consent: true, consentVersion: CONSENT_VERSION };

  const createWorkspace = async (event: FormEvent) => {
    event.preventDefault();
    if (!createConsent || !createLabel.trim()) return;
    await execute(async (isCurrent) => {
      const created = await requestJson<{ id: string }>("POST", BASE, { kind: createKind, label: createLabel.trim(), ...consentPayload });
      if (!isCurrent()) return;
      clearPrivateFields(); setCreateOpen(false);
      await loadList(); if (isCurrent()) setWorkspaceId(created.id);
    }, "Draft workspace created. Custodian authority remains pending independent review.");
  };
  const giveConsent = () => workspaceId && void execute(async (isCurrent) => {
    await requestJson("POST", `${BASE}/${workspaceId}/consent`, consentPayload);
    if (!isCurrent()) return;
    setMemberConsentAck(false);
    await loadList(); if (isCurrent()) await loadDetail(workspaceId);
  }, "Current privacy consent recorded.");
  const withdraw = () => {
    if (!workspaceId || !window.confirm("Withdraw privacy consent? This erases your authored records and evidence in this workspace, clears consent, and revokes your access. This cannot be undone.")) return;
    void execute(async (isCurrent) => {
      await requestJson("POST", `${BASE}/${workspaceId}/withdraw`);
      if (!isCurrent()) return;
      clearPrivateFields();
      setWorkspaces((items) => items.filter((item) => item.id !== workspaceId));
      setDetail(null); setWorkspaceId("");
    }, "Privacy consent withdrawn; authored records were submitted for erasure.");
  };
  const createRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !recordConsent || !recordBody.trim() ||
      (!evidenceUploadsEnabledRef.current && (recordType === "lineage" || recordType === "beneficiary"))) return;
    await execute(async (isCurrent) => {
      if (!evidenceUploadsEnabledRef.current && (recordType === "lineage" || recordType === "beneficiary")) return;
      await requestJson("POST", `${BASE}/${workspaceId}/records`, {
        type: recordType, body: recordBody.trim(), retentionDays: Number(recordRetention), ...consentPayload,
      });
      if (!isCurrent()) return;
      setRecordBody(""); setRecordConsent(false); await loadDetail(workspaceId);
    }, "Private record created.");
  };
  const uploadEvidence = async (event: FormEvent) => {
    event.preventDefault();
    if (!evidenceUploadsEnabledRef.current || !workspaceId || !evidenceConsent || !evidenceContent || !evidenceMedia) return;
    await execute(async (isCurrent) => {
      if (!evidenceUploadsEnabledRef.current) return;
      await requestJson("POST", `${BASE}/${workspaceId}/evidence`, {
        type: evidenceType, content: evidenceContent, mediaType: evidenceMedia,
        retentionDays: Number(evidenceRetention), ...consentPayload,
      });
      if (!isCurrent()) return;
      setEvidenceContent(""); setEvidenceMedia(""); setEvidenceLabel(""); setEvidenceConsent(false);
      if (fileRef.current) fileRef.current.value = "";
      await loadDetail(workspaceId);
    }, "Evidence stored privately.");
  };
  const handleFile = async (file?: File) => {
    if (!evidenceUploadsEnabledRef.current) {
      fileReadGeneration.current += 1;
      setEvidenceContent(""); setEvidenceMedia(""); setEvidenceLabel(""); setEvidenceConsent(false);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const generation = ++fileReadGeneration.current;
    const scopeVersion = scopeRef.current.version;
    setError(""); setEvidenceContent(""); setEvidenceMedia(""); setEvidenceLabel("");
    if (!file) return;
    if (file.size > FIVE_MIB) { if (isScopeCurrent(scopeVersion)) setError("File exceeds the 5 MiB upload limit."); if (fileRef.current) fileRef.current.value = ""; return; }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      if (isScopeCurrent(scopeVersion)) setError("Choose a PDF, PNG, or JPEG file."); if (fileRef.current) fileRef.current.value = ""; return;
    }
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (!evidenceUploadsEnabledRef.current || generation !== fileReadGeneration.current) { resolve(""); return; }
        const result = String(reader.result ?? "");
        resolve(result.slice(result.indexOf(",") + 1));
      };
      reader.onerror = () => reject(new Error("Unable to read this file."));
      reader.readAsDataURL(file);
    }).catch((e) => { if (evidenceUploadsEnabledRef.current && isScopeCurrent(scopeVersion) && generation === fileReadGeneration.current) setError(errorText(e)); return ""; });
    if (encoded && evidenceUploadsEnabledRef.current && generation === fileReadGeneration.current && isScopeCurrent(scopeVersion)) { setEvidenceContent(encoded); setEvidenceMedia(file.type as "application/pdf" | "image/png" | "image/jpeg"); setEvidenceLabel(`${file.type} · ${(file.size / 1024).toFixed(0)} KiB`); }
  };
  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !memberId.trim()) return;
    await execute(async (isCurrent) => {
      await requestJson("POST", `${BASE}/${workspaceId}/members`, { userId: memberId.trim(), role: memberRole });
      if (!isCurrent()) return;
      setMemberId(""); await loadDetail(workspaceId);
    }, "Participant role granted; that member must record current consent.");
  };
  const revokeMember = (userId: string) => {
    if (!workspaceId || !window.confirm("Revoke this participant's workspace access?")) return;
    void execute(async (isCurrent) => {
      await requestJson("DELETE", `${BASE}/${workspaceId}/members/${userId}`);
      if (isCurrent()) await loadDetail(workspaceId);
    }, "Participant access revoked.");
  };
  const submitInstrument = (recordId: string) => void execute(async (isCurrent) => {
    await requestJson("POST", `${BASE}/${workspaceId}/records/${recordId}/submit`);
    if (isCurrent()) await loadDetail(workspaceId);
  }, "Instrument version submitted for review.");
  const reviewInstrument = (recordId: string, decision: "approve" | "reject") => void execute(async (isCurrent) => {
    await requestJson("POST", `${BASE}/${workspaceId}/records/${recordId}/review`, { decision });
    if (isCurrent()) await loadDetail(workspaceId);
  }, `Review decision recorded: ${decision}.`);
  const deleteRecord = (record: RecordItem) => {
    if (!workspaceId || !window.confirm(`Permanently delete this ${record.type} record, version ${record.version}, and any attached evidence?`)) return;
    void execute(async (isCurrent) => {
      await requestJson("DELETE", `${BASE}/${workspaceId}/records/${record.id}`);
      if (!isCurrent()) return;
      if (instrumentId === record.id) { setInstrumentId(""); setExactInstrument(false); }
      await loadDetail(workspaceId);
    }, "Record deleted. Workspace instrument confirmation must be recorded again if still lawful.");
  };
  const downloadEvidence = async (record: RecordItem) => {
    if (!workspaceId) return;
    await execute(async (isCurrent) => {
      const response = await apiRequest("GET", `${BASE}/${workspaceId}/records/${record.id}/download`);
      const blob = await response.blob();
      if (!isCurrent()) return;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = "private-evidence";
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(objectUrl);
    }, "Authorized evidence download started.");
  };
  const confirmLegal = async (event: FormEvent) => {
    event.preventDefault();
    if (!workspaceId || !instrumentId || !exactInstrument || !legalAdvice || !law.trim()) return;
    await execute(async (isCurrent) => {
      await requestJson("POST", `${BASE}/${workspaceId}/legal-confirmation`, {
        governingLaw: law.trim(), instrumentId, authorisedInstrumentConfirmed: true, qualifiedLegalAdviceConfirmed: true,
      });
      if (!isCurrent()) return;
      setLaw(""); setLegalAdvice(false); setExactInstrument(false); await loadDetail(workspaceId);
    }, "Workspace law and exact approved instrument version recorded. This does not enact a legal instrument.");
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-200/15 bg-[#101a20] text-white shadow-[0_24px_80px_rgba(0,0,0,0.26)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
      <header className="flex flex-col gap-4 border-b border-white/[0.08] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl border border-cyan-100/15 bg-cyan-100/[0.05] p-2.5 text-cyan-100/75"><LockKeyhole size={17} /></div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-100/45">Separate private workspace</p>
            <h2 className="mt-1 font-sans text-lg font-semibold tracking-tight text-white/90">Family & charitable trust records</h2>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-white/40">Private lineage, participant consent, instruments and retained evidence. This is not the public charitable mission or ledger.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill warm={!visibleStatusError && !!visibleStatus?.storageReady}>{!identityId ? "Sign in for service status" : visibleStatusError ? "Service status unavailable" : visibleStatus?.storageReady ? "Storage signal ready" : visibleStatus ? "Storage signal unavailable" : "Checking private service"}</StatusPill>
          <StatusPill warm={!visibleStatusError && !!visibleStatus?.identityReady}>{visibleStatusError ? "Identity dependency unknown" : visibleStatus ? visibleStatus.identityReady ? "Identity platform available" : "Independent identity missing" : identityId ? "Identity dependency unconfirmed" : "Sign in for identity status"}</StatusPill>
          <StatusPill warm={visibleStatus?.retentionSweep === "ok"}>Retention sweep {visibleStatus?.retentionSweep ?? (identityId ? "pending" : "sign-in required")}</StatusPill>
          <StatusPill>Wallet forwarding off</StatusPill>
          <StatusPill>Legal enactment off</StatusPill>
        </div>
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-7 sm:py-6">
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-xl border border-amber-100/15 bg-amber-100/[0.035] p-4">
            <div className="flex items-center gap-2 text-amber-100/80"><CircleAlert size={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Software only — not a legal enactment</span></div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/55">This interface stores private workspace records and review signals. It does not create, validate, sign, execute, or enact a trust or legal instrument, and it does not provide legal advice. Consult qualified counsel.</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-cyan-100/65"><Fingerprint size={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Identity & authorization</span></div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/50">{visibleStatus?.verification ?? "Independent human verification plus separately reviewed workspace role required."}</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">A birth certificate can support lineage only; it does not establish the identity of the person presenting it.</p>
            <p className="mt-1.5 text-[9px] leading-relaxed text-white/30">Service readiness signals describe platform state only; they do not prove a successful storage operation or verify a person.</p>
          </div>
        </div>

        {visibleStatusError && <InlineAlert text={visibleStatusError} retry={() => void loadStatus()} />}
        {visibleStatus && <p className="text-[9px] text-white/30">Service signals: storageReady={String(visibleStatus.storageReady)} · identityReady={String(visibleStatus.identityReady)} · evidenceUploadsEnabled={String(evidenceUploadsEnabled)} · retentionSweep={visibleStatus.retentionSweep} · walletForwardingEnabled={String(visibleStatus.walletForwardingEnabled)} · legalEnactmentEnabled={String(visibleStatus.legalEnactmentEnabled)} · consent version {visibleStatus.consentVersion}. Platform readiness is not personal identity verification.</p>}
        {!identityId && !authLoading && <div className="rounded-xl border border-cyan-100/15 bg-cyan-100/[0.035] p-5">
          <p className="text-sm font-semibold text-white/80">Private access requires sign-in and independent authorization.</p>
          <p className="mt-1 text-[11px] text-white/40">No personal fields or workspace contents are shown while logged out. Do not share family or identity details in public chat.</p>
          <Link href="/auth" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-100/25 bg-cyan-100/[0.07] px-3 py-2 text-[11px] text-cyan-50/90 hover:bg-cyan-100/10">Sign in to access private workspace <KeyRound size={13} /></Link>
        </div>}
        {authLoading && <SkeletonRows />}

        {identityId && <>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/60">Privacy notice before consent</p>
            <div className="mt-2 grid gap-2 text-[9px] leading-relaxed text-white/40 sm:grid-cols-2">
              <p><strong className="text-white/60">Purpose:</strong> private lineage, beneficiary, discussion, instrument and evidence records for this workspace only.</p>
              <p><strong className="text-white/60">Processing:</strong> private service storage; encryption claims require independently verifiable implementation and configuration. WavelengthScript is not proof of storage encryption. Detail access is restricted by current consent, verified authority and workspace role.</p>
              <p><strong className="text-white/60">Retention & deletion:</strong> records expire on their selected day count and workspaces close after 365 days. Withdrawal erases your authored records and revokes access; owner withdrawal also clears private settings. Deletion does not promise immediate destruction from backups.</p>
              <p><strong className="text-white/60">Backups & audit:</strong> this interface cannot confirm backup/restore erasure practices. Custodian audit entries record actions and target references and may remain after record deletion.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-[#0c1419] p-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <FieldLabel>Listed workspace memberships</FieldLabel>
              {listLoading ? <div className="h-10 animate-pulse rounded-lg bg-white/[0.06]" /> :
                <div className="relative">
                  <select value={workspaceId} disabled={busy} onChange={(e) => setWorkspaceId(e.target.value)} className="w-full appearance-none rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 pr-9 text-xs text-white/80 outline-none focus:border-cyan-100/35 disabled:opacity-45">
                    <option value="">Select a private workspace</option>
                    {workspaces.map((item) => <option key={item.id} value={item.id}>{kindTitle[item.kind]} · {item.role}{item.consentRequired ? " · consent required" : ""}</option>)}
                  </select><ChevronDown className="pointer-events-none absolute right-3 top-3 text-white/35" size={14} />
                </div>}
            </div>
            <div className="flex gap-2">
              <ActionButton onClick={() => void refresh()} disabled={listLoading || detailLoading}><RefreshCw size={12} /> Refresh</ActionButton>
              <ActionButton tone="accent" onClick={() => setCreateOpen((v) => !v)} disabled={busy}><Plus size={13} /> New workspace</ActionButton>
            </div>
          </div>
          {listError && <InlineAlert text={listError} retry={() => void loadList()} />}
          {!listLoading && !listError && workspaces.length === 0 && <div className="rounded-xl border border-dashed border-white/15 px-5 py-7 text-center">
            <Archive className="mx-auto text-white/25" size={20} /><p className="mt-2 text-xs text-white/65">No private trust workspaces are available to this account.</p>
            <p className="mt-1 text-[10px] text-white/35">Create a draft workspace only if you are authorized to do so. Creation does not establish verified authority.</p>
          </div>}

          {createOpen && <form onSubmit={createWorkspace} className="grid gap-3 rounded-xl border border-cyan-100/15 bg-cyan-100/[0.025] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><FieldLabel>Purpose</FieldLabel><select value={createKind} onChange={(e) => setCreateKind(e.target.value as TrustKind)} className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white/75"><option value="family">Family trust — private family purpose</option><option value="charitable">Charitable trust — private charitable purpose</option></select></div>
            <div><FieldLabel>Workspace label</FieldLabel><input value={createLabel} onChange={(e) => setCreateLabel(e.target.value)} maxLength={120} autoComplete="off" className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white outline-none focus:border-cyan-100/30" placeholder="Private label (max 120 characters)" /></div>
            <ActionButton tone="accent" type="submit" disabled={busy || !createConsent || !createLabel.trim()}><Plus size={12} /> Create draft</ActionButton>
            <label className="flex items-start gap-2 text-[10px] leading-relaxed text-white/50 sm:col-span-2"><input type="checkbox" checked={createConsent} onChange={(e) => setCreateConsent(e.target.checked)} className="mt-0.5 accent-cyan-200" />I have authority to create this workspace and share its submitted records with authorized participants. I acknowledge privacy version {CONSENT_VERSION} and the notice above; creation does not verify my identity or establish legal authority.</label>
            <button type="button" onClick={() => { setCreateOpen(false); clearPrivateFields(); }} className="text-left text-[10px] text-white/35 hover:text-white/70">Cancel</button>
          </form>}
          {workspaceId && selected?.consentRequired && <div className="flex flex-col gap-3 rounded-xl border border-amber-100/20 bg-amber-100/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1"><p className="text-xs font-medium text-amber-50/80">Current member consent is required before private details can be opened.</p><p className="mt-1 text-[10px] text-white/40">Consent is versioned ({CONSENT_VERSION}) for each participant. Withdrawal erases your authored records and revokes your access.</p>
              <label className="mt-2 flex items-start gap-2 text-[9px] leading-relaxed text-white/45"><input type="checkbox" checked={memberConsentAck} onChange={(e) => setMemberConsentAck(e.target.checked)} className="mt-0.5 accent-amber-200" />I have authority to participate and share information with authorized workspace members, and I have reviewed the purpose, processing, retention, deletion, backup, and audit notice above.</label>
            </div>
            <ActionButton tone="accent" onClick={giveConsent} disabled={busy || !memberConsentAck}><ShieldCheck size={13} /> Record consent</ActionButton>
          </div>}
          {workspaceId && selected && <div className="flex flex-col gap-3 rounded-xl border border-rose-100/10 bg-rose-100/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-relaxed text-white/40">Privacy withdrawal remains available for this listed membership even when private detail access is expired, unverified, or unavailable.</p>
            <ActionButton tone="danger" onClick={withdraw} disabled={busy}><X size={12} /> Withdraw consent & erase my records</ActionButton>
          </div>}
          {detailLoading && <SkeletonRows />}
          {detailError && <InlineAlert text={detailError} retry={() => void loadDetail(workspaceId)} />}
          {detail && !detailLoading && <>
            <div className="flex flex-col gap-3 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-white/85">{detail.settings.label || kindTitle[detail.kind]}</h3><StatusPill>{kindTitle[detail.kind]}</StatusPill><StatusPill>{detail.role}</StatusPill></div>
                <p className="mt-1 text-[9px] font-mono text-white/25">Workspace reference · {detail.id}</p>
                <p className="mt-1 text-[9px] text-white/35">Workspace retention ends {new Date(detail.expiresAt).toLocaleDateString()}.</p></div>
            </div>
            {detail.walletForwardingEnabled !== false || detail.legalEnactmentEnabled !== false ? <InlineAlert text="Unexpected service capability signal. Wallet forwarding and legal enactment must remain disabled." /> : null}
            <div className="flex gap-1 border-b border-white/[0.08]">
              {(["records", "participants", "audit"] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-3 py-2 text-[10px] capitalize transition-colors ${activeTab === tab ? "border-cyan-100/60 text-cyan-50/90" : "border-transparent text-white/35 hover:text-white/65"}`}>{tab === "records" ? "Private records" : tab === "participants" ? "Members & controls" : "Audit trail"}</button>)}
            </div>
            {activeTab === "records" && <div className="space-y-4 pt-1">
              {detail.records.length === 0 && <EmptyPanel title="No active private records" text="Records appear only after they are submitted with the current workspace consent. Expired records are not displayed." />}
              <div className="space-y-2">
                {detail.records.map((record) => <RecordCard key={record.id} record={record} canWrite={canWrite} reviewer={detail.role === "reviewer"} own={record.own} busy={busy}
                  onSubmit={() => submitInstrument(record.id)} onReview={(decision) => reviewInstrument(record.id, decision)} onDelete={() => deleteRecord(record)} onDownload={() => void downloadEvidence(record)} />)}
              </div>
              {canWrite && <div className="grid gap-4 lg:grid-cols-2">
                <form onSubmit={createRecord} className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
                  <div className="flex items-center gap-2 text-cyan-50/70"><FilePlus2 size={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.13em]">Add private record</span></div>
                  <div><FieldLabel>Record kind</FieldLabel><select value={recordType} onChange={(e) => setRecordType(e.target.value as RecordType)} className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white/75">{recordOptions.map((value) => <option key={value} value={value} disabled={!evidenceUploadsEnabled && (value === "lineage" || value === "beneficiary")}>{recordNames[value]}{!evidenceUploadsEnabled && (value === "lineage" || value === "beneficiary") ? " · disabled" : ""}</option>)}</select></div>
                  <div><FieldLabel>Private content</FieldLabel><textarea value={recordBody} onChange={(e) => setRecordBody(e.target.value)} maxLength={40000} autoComplete="off" rows={4} className="w-full resize-y rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs leading-relaxed text-white/80 outline-none focus:border-cyan-100/30" placeholder="Enter only information appropriate for this private workspace." /></div>
                  <div><FieldLabel>Retention period · 1–365 days</FieldLabel><input type="number" min={1} max={365} value={recordRetention} onChange={(e) => setRecordRetention(e.target.value)} className="w-28 rounded-lg border border-white/10 bg-[#152229] px-3 py-2 text-xs text-white/80" /></div>
                  <ConsentCheck checked={recordConsent} onChange={setRecordConsent} />
                  <ActionButton type="submit" tone="accent" disabled={busy || !recordBody.trim() || !recordConsent || (!evidenceUploadsEnabled && (recordType === "lineage" || recordType === "beneficiary"))}>Save private record</ActionButton>
                </form>
                <form onSubmit={uploadEvidence} className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
                  <div className="flex items-center gap-2 text-cyan-50/70"><Download size={14} /><span className="text-[10px] font-semibold uppercase tracking-[0.13em]">Private evidence upload</span></div>
                  {!evidenceUploadsEnabled && <div className="rounded-lg border border-amber-100/15 bg-amber-100/[0.035] p-3 text-[9px] leading-relaxed text-amber-50/60">Evidence uploads are deliberately disabled, not just waiting for storage availability. Storage or identity readiness—and later key setup—will not enable uploads automatically. Discussion and instrument drafts remain available. WavelengthScript does not prove that stored data is encrypted.</div>}
                  <div><FieldLabel>Evidence category</FieldLabel><select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white/75"><option value="lineage-evidence">Lineage evidence</option><option value="birth-certificate">Birth certificate · supports lineage only</option><option value="authority-evidence">Authority evidence</option></select></div>
                  <div><FieldLabel>PDF, PNG, or JPEG · maximum 5 MiB</FieldLabel><input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" disabled={!evidenceUploadsEnabled} onChange={(e) => void handleFile(e.target.files?.[0])} className="block w-full text-[10px] text-white/40 file:mr-3 file:rounded-md file:border file:border-white/10 file:bg-white/[0.04] file:px-3 file:py-2 file:text-[10px] file:text-white/65 disabled:cursor-not-allowed disabled:opacity-40" />{evidenceLabel && <p className="mt-1 text-[9px] text-cyan-100/55">{evidenceLabel} · original filename is not submitted</p>}</div>
                  <div><FieldLabel>Retention period · 1–365 days</FieldLabel><input type="number" min={1} max={365} value={evidenceRetention} onChange={(e) => setEvidenceRetention(e.target.value)} className="w-28 rounded-lg border border-white/10 bg-[#152229] px-3 py-2 text-xs text-white/80" /></div>
                  <ConsentCheck checked={evidenceConsent} onChange={setEvidenceConsent} evidence disabled={!evidenceUploadsEnabled} />
                  <ActionButton type="submit" tone="accent" disabled={!evidenceUploadsEnabled || busy || !evidenceContent || !evidenceConsent}>Encrypt & store evidence</ActionButton>
                  <p className="text-[9px] leading-relaxed text-white/30">When explicitly enabled by service policy, files are sent as base64 content with media type and retention only. No filename is sent. Downloads are authorized attachments and are never rendered inline.</p>
                </form>
              </div>}
              {detail.role === "reviewer" && <div className="rounded-lg border border-amber-100/10 bg-amber-100/[0.025] p-3 text-[10px] leading-relaxed text-amber-50/50">Review decisions require current independently verified reviewer authority. At least three independently controlled approvals are required before an instrument can be confirmed. No reviewer may review their own instrument or a shared-controller submission.</div>}
              {detail.role === "custodian" && <LegalConfirmation instruments={approvedInstruments} law={law} setLaw={setLaw} instrumentId={instrumentId} setInstrumentId={setInstrumentId} exact={exactInstrument} setExact={setExactInstrument} advice={legalAdvice} setAdvice={setLegalAdvice} onSubmit={confirmLegal} busy={busy} confirmedInstrumentId={detail.settings.confirmedInstrumentId} />}
            </div>}
            {activeTab === "participants" && <div className="space-y-4 pt-1">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.018] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/60">Member consent & roles</p>
                <p className="mt-1 text-[10px] leading-relaxed text-white/35">Membership is not verification. The service requires independent human verification and separate role review. Account IDs are opaque identifiers; use no names or contact details.</p>
                {detail.members.length === 0 ? <p className="mt-4 text-[10px] text-white/35">Member details are not available for this role.</p> : <div className="mt-3 space-y-2">
                  {detail.members.map((member) => <div key={member.user_id} className="flex flex-col gap-2 rounded-lg border border-white/[0.06] px-3 py-2 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1 break-all font-mono text-[9px] text-white/40">{member.user_id}</span><StatusPill>{member.role}</StatusPill>
                    <StatusPill warm={member.consent_version === CONSENT_VERSION && !member.revoked_at}>{member.revoked_at ? "revoked" : member.consent_version === CONSENT_VERSION ? "consent current" : "consent required"}</StatusPill>
                    {detail.role === "custodian" && !member.revoked_at && <ActionButton tone="danger" onClick={() => revokeMember(member.user_id)} disabled={busy}><X size={11} /> Revoke</ActionButton>}
                  </div>)}
                </div>}
              </div>
              {detail.role === "custodian" && <form onSubmit={addMember} className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.018] p-4 sm:grid-cols-[1.5fr_1fr_auto] sm:items-end">
                <div><FieldLabel>Opaque user account ID (UUID)</FieldLabel><input value={memberId} onChange={(e) => setMemberId(e.target.value)} autoComplete="off" spellCheck={false} className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 font-mono text-xs text-white/80 outline-none focus:border-cyan-100/30" placeholder="UUID only — never a personal name" /></div>
                <div><FieldLabel>Workspace role</FieldLabel><select value={memberRole} onChange={(e) => setMemberRole(e.target.value as TrustRole)} className="w-full rounded-lg border border-white/10 bg-[#152229] px-3 py-2.5 text-xs text-white/75"><option value="contributor">Contributor</option><option value="reviewer">Reviewer</option><option value="reader">Reader</option><option value="custodian">Custodian</option></select></div>
                <ActionButton type="submit" tone="accent" disabled={busy || !memberId.trim()}><UserPlus size={12} /> Grant role</ActionButton>
              </form>}
              <div className="rounded-lg border border-cyan-100/10 bg-cyan-100/[0.025] p-3 text-[10px] leading-relaxed text-white/40">Three distinct independently controlled reviewer authorities are required for instrument approval. One person or shared controller cannot satisfy multiple independent reviews.</div>
            </div>}
            {activeTab === "audit" && <div className="space-y-2 pt-1">
              {detail.role !== "custodian" ? <EmptyPanel title="Audit is custodian-only" text="The service does not return audit entries to this member role." /> : detail.audit.length === 0 ? <EmptyPanel title="No audit events returned" text="The workspace audit view is empty." /> : detail.audit.map((item, index) => <div key={`${item.created_at}-${index}`} className="grid gap-1 rounded-lg border border-white/[0.06] px-3 py-2 sm:grid-cols-[1fr_180px] sm:items-center"><span className="text-[10px] text-white/60">{item.action}</span><time className="font-mono text-[9px] text-white/30">{new Date(item.created_at).toLocaleString()}</time>{item.target_id && <span className="break-all font-mono text-[9px] text-white/25 sm:col-span-2">Target reference · {item.target_id}</span>}</div>)}
            </div>}
          </>}
        </>}
        {notice && <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-100/15 bg-emerald-100/[0.035] px-3 py-2 text-[10px] text-emerald-50/65"><Check size={13} className="mt-px shrink-0" />{notice}</p>}
        {error && <InlineAlert text={error} />}
        <footer className="border-t border-white/[0.07] pt-3 text-[9px] leading-relaxed text-white/25">No wallet funds, wallet addresses, or private keys are collected. There is no forwarding action. Private fields stay in component memory only; they are cleared when saving, switching workspaces, signing out, or unmounting. Do not enter private information in public chat.</footer>
      </div>
    </section>
  );
}

