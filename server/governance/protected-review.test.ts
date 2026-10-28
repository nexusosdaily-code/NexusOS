import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  proposalDigest, recordDigest, requireProtectedReview, reserveProtectedProposal,
  verifyProtectedReceipt, type ProtectedProposal,
} from "./protected-review";
import { signingBytes } from "../safety/protocol";
const query = vi.hoisted(() => vi.fn());
const connect = vi.hoisted(() => vi.fn());
vi.mock("../db", () => ({ pool: { query, connect } }));
vi.mock("../physics", () => ({
  deriveChannel: () => ({ wdm: 52, oam: 20, pol: "H" }),
  getBand: () => "SYSTEM", hasAuthority: () => true,
}));
import { amendmentHandler } from "../amendment-handler";
import { getConstitutionSeal, CONSTITUTION_PSI } from "../constitution_seal";

// Synthetic credentials exist only in these tests, never in a live register.
function fixture() {
  const now = 2000000000000;
  const keys = Array.from({ length: 4 }, () => generateKeyPairSync("ed25519"));
  const pub = (i: number) => keys[i].publicKey.export({ type: "spki", format: "pem" }).toString();
  const signature = (i: number, domain: string, value: unknown) =>
    sign(null, signingBytes(domain, value), keys[i].privateKey).toString("base64");
  const proposal: ProtectedProposal = {
    id: "11111111-1111-4111-8111-111111111111", action: "constitutional-amendment",
    authorId: "founder", implementerController: "operator", recipientController: null,
    title: "Exact proposal", body: "Exact body", affectedIdentities: ["constitution"],
    permissions: ["constitution.append"], evidenceDigest: "a".repeat(64),
    executionArtifactDigest: "b".repeat(64), recoveryPlanDigest: "c".repeat(64),
    scope: "constitution.append", expiresAt: now + 60000,
  };
  const register = {
    version: "test-only", approved: true as const, approvalRecordDigest: "d".repeat(64),
    appointmentAndAppealProcedureDigest: "e".repeat(64), expiresAt: now + 60000,
    reviewers: (["constitutional-legal", "technical-security", "human-life-safety"] as const).map((role, i) => ({
      id: `reviewer${i}`, authenticatedAccountId: `human${i}`, controller: `independent${i}`,
      accountableSignatory: "human" as const, role, publicKey: pub(i),
      expertiseEvidenceDigest: "a".repeat(64), independenceEvidenceDigest: "b".repeat(64),
      fundingOwnershipConflictsDigest: "c".repeat(64), appointmentScope: ["constitutional-amendment"],
      appointmentProposalScopes: ["constitution.append"], recused: false, disqualified: false,
    })),
  };
  const commissioning = {
    approved: true as const, independentControlVerified: true as const, implementerController: "operator",
    enforcementTestDigest: "a".repeat(64), essentialServiceFallbackTestDigest: "b".repeat(64),
    approvalRecordDigest: "c".repeat(64), expiresAt: now + 60000,
  };
  const request = { nonce: "f".repeat(64), proposal };
  const receipt = {
    request: structuredClone(request), issuedAt: now, expiresAt: now + 5000,
    register, commissioning, consumed: true as const,
    approvals: register.reviewers.map((r, i) => {
      const payload = {
        reviewerId: r.id, authenticatedAccountId: r.authenticatedAccountId,
        proposalDigest: proposalDigest(proposal), registerDigest: recordDigest(register),
        registerVersion: register.version, action: proposal.action, scope: proposal.scope,
        issuedAt: now, expiresAt: now + 30000, decision: "approve" as const,
        unresolvedConditions: false as const, reasons: "Verified", contraryEvidence: "Considered",
        uncertainty: "Recorded",
      };
      return { payload, signature: signature(i, "protected-change-approval", payload) };
    }),
  };
  const settings = {
    url: "https://independent.example", publicKey: pub(3),
    approvedRegisterDigest: recordDigest(register), approvedCommissioningDigest: recordDigest(commissioning),
  };
  function verify() { return verifyProtectedReceipt(receipt, signature(3, "protected-change-authority", receipt), request, settings, now); }
  function resign() {
    settings.approvedRegisterDigest = recordDigest(receipt.register);
    settings.approvedCommissioningDigest = recordDigest(receipt.commissioning);
    receipt.approvals.forEach((a, i) => {
      a.payload.registerDigest = settings.approvedRegisterDigest;
      a.signature = signature(i, "protected-change-approval", a.payload);
    });
  }
  return { now, proposal, receipt, request, settings, verify, resign, signature };
}
beforeEach(() => { query.mockReset(); connect.mockReset(); });
describe("three independent protected-change approvals", () => {
  it("accepts only a current commissioned identical scoped proposal with all three credentials", () => {
    const f = fixture();
    expect(f.verify()).toEqual({ proposalId: f.proposal.id, proposalDigest: proposalDigest(f.proposal), registerDigest: f.settings.approvedRegisterDigest });
  });
  it("blocks two approvals even though safety containment can use two", () => {
    const f = fixture(); f.receipt.approvals.pop();
    expect(f.verify).toThrow();
  });
  it.each(["controller", "authenticatedAccountId", "publicKey", "role"] as const)("blocks shared %s", key => {
    const f = fixture(); f.receipt.register.reviewers[1][key] = f.receipt.register.reviewers[0][key] as never;
    f.resign(); expect(f.verify).toThrow();
  });
  it.each(["recused", "disqualified"] as const)("blocks a %s reviewer with no self-appointed alternate", key => {
    const f = fixture(); f.receipt.register.reviewers[0][key] = true;
    f.resign(); expect(f.verify).toThrow();
  });
  it.each(["title", "body", "scope", "executionArtifactDigest", "recoveryPlanDigest", "evidenceDigest"] as const)("blocks changed %s", key => {
    const f = fixture(); f.request.proposal[key] += key.endsWith("Digest") ? "" : "changed";
    if (key.endsWith("Digest")) f.request.proposal[key] = "9".repeat(64);
    expect(f.verify).toThrow();
  });
  it("blocks expired signatures even in a fresh external receipt", () => {
    const f = fixture(); f.receipt.approvals[0].payload.expiresAt = f.now;
    f.resign(); expect(f.verify).toThrow();
  });
  it("blocks stale register and commissioning", () => {
    for (const key of ["register", "commissioning"] as const) {
      const f = fixture(); f.receipt[key].expiresAt = f.now;
      f.resign(); expect(f.verify).toThrow();
    }
  });
  it("blocks scope outside the explicitly approved appointment", () => {
    const f = fixture(); f.receipt.register.reviewers[0].appointmentProposalScopes = ["other"];
    f.resign(); expect(f.verify).toThrow();
  });
  it("blocks a missing or unapproved register, missing signature and unresolved conditions", () => {
    for (const mutate of [
      (r: any) => { delete r.register; },
      (r: any) => { r.register.approved = false; },
      (r: any) => { r.approvals[0].signature = ""; },
      (r: any) => { r.approvals[0].payload.unresolvedConditions = true; },
      (r: any) => { r.approvals[0].payload.decision = "refuse"; },
    ]) { const f = fixture(); mutate(f.receipt); expect(f.verify).toThrow(); }
  });
  it("blocks founder/AI self-approval and the implementer or proposed recipient", () => {
    for (const change of [
      { authenticatedAccountId: "founder" }, { controller: "operator" },
      { controller: "recipient" }, { accountableSignatory: "ai" },
    ]) {
      const f = fixture(); f.request.proposal.recipientController = "recipient";
      f.receipt.request.proposal.recipientController = "recipient";
      Object.assign(f.receipt.register.reviewers[0], change);
      f.resign(); expect(f.verify).toThrow();
    }
  });
  it("blocks replay of a signed response against a different fresh nonce", () => {
    const f = fixture(); f.request.nonce = "1".repeat(64);
    expect(f.verify).toThrow();
  });
  it("blocks forged reviewer and commissioning signatures", () => {
    const f = fixture(); f.receipt.approvals[0].signature = f.signature(1, "protected-change-approval", f.receipt.approvals[0].payload);
    expect(f.verify).toThrow();
    const g = fixture();
    expect(() => verifyProtectedReceipt(g.receipt, g.signature(0, "protected-change-authority", g.receipt), g.request, g.settings, g.now)).toThrow();
  });
  it("fails closed without commissioned external settings or during reviewer outage", async () => {
    const f = fixture();
    await expect(requireProtectedReview(f.proposal, null)).rejects.toThrow(/no explicitly approved/);
    await expect(requireProtectedReview(f.proposal, f.settings, vi.fn().mockRejectedValue(new Error("offline")))).rejects.toThrow(/blocked/);
  });
  it("verifies a fresh externally consumed receipt on the real gateway path", async () => {
    const f = fixture();
    const fetcher = vi.fn().mockImplementation(async (_url, init) => {
      f.receipt.request = JSON.parse(init.body);
      return { ok: true, json: async () => ({
        payload: f.receipt, signature: f.signature(3, "protected-change-authority", f.receipt),
      }) };
    });
    expect(await requireProtectedReview(f.proposal, f.settings, fetcher, () => f.now)).toEqual({
      proposalId: f.proposal.id, proposalDigest: proposalDigest(f.proposal), registerDigest: f.settings.approvedRegisterDigest,
    });
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("/protected-changes/consume"),
      expect.objectContaining({ redirect: "error" }));
  });
  it.each(["authority-transfer", "authority-removal", "authority-replacement", "safety-boundary-change"] as const)("never permits %s, including emergency claims", async action => {
    const f = fixture(); const fetcher = vi.fn();
    await expect(requireProtectedReview({ ...f.proposal, action, scope: "emergency" }, f.settings, fetcher)).rejects.toThrow(/disabled/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects loss of independently tested essential-service fallback", () => {
    const f = fixture(); delete (f.receipt.commissioning as any).essentialServiceFallbackTestDigest;
    expect(f.verify).toThrow();
  });
  it("consumes a proposal durably, rejecting concurrent/restarted retries and failed mining retries", async () => {
    const f = fixture(); const permit = f.verify();
    query.mockResolvedValueOnce({ rows: [{ proposal_id: permit.proposalId }] }).mockResolvedValue({ rows: [] });
    await reserveProtectedProposal(permit);
    await expect(reserveProtectedProposal(permit)).rejects.toThrow(/already consumed/);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT DO NOTHING"), [permit.proposalId, permit.proposalDigest, permit.registerDigest]);
  });
});

describe("reviewed-to-recorded text integrity — actual amendment writer and readback", () => {
  function response() {
    return { code: 200, body: undefined as any,
      status(code: number) { this.code = code; return this; },
      json(body: any) { this.body = body; return this; } };
  }
  function request(proposal: ProtectedProposal) {
    return { user: { id: proposal.authorId, username: "synthetic-author", role: "admin" }, body: {
      draftId: "custom", approvedExactText: true,
      title: proposal.title, body: proposal.body, approvedTitle: proposal.title, approvedBody: proposal.body,
      protectedProposal: proposal,
    } } as any;
  }
  it.each(["title", "body"] as const)("rejects a signed proposal with a pipe in %s before consuming any approval", async field => {
    const f = fixture(); f.proposal[field] += " | delimiter";
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    try {
      const res = response();
      await amendmentHandler(request(f.proposal), res as any);
      expect(res.code).toBe(400);
      expect(res.body.error).toContain("exactly match reviewed text");
      expect(fetcher).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
  it("records and publicly reads back exactly the text all three authenticated reviewers signed", async () => {
    const f = fixture();
    // Use real wall-clock timestamps here because the handler uses the real gateway clock.
    vi.useFakeTimers(); vi.setSystemTime(f.now);
    vi.stubEnv("PROTECTED_REVIEW_AUTHORITY_URL", f.settings.url);
    vi.stubEnv("PROTECTED_REVIEW_AUTHORITY_PUBLIC_KEY", f.settings.publicKey);
    vi.stubEnv("PROTECTED_REVIEW_REGISTER_DIGEST", f.settings.approvedRegisterDigest);
    vi.stubEnv("PROTECTED_REVIEW_COMMISSIONING_DIGEST", f.settings.approvedCommissioningDigest);
    const fetcher = vi.fn().mockImplementation(async (_url, init) => {
      f.receipt.request = JSON.parse(init.body);
      return { ok: true, json: async () => ({
        payload: f.receipt, signature: f.signature(3, "protected-change-authority", f.receipt),
      }) };
    });
    vi.stubGlobal("fetch", fetcher);
    let recordedRow: any;
    const client = {
      release: vi.fn(),
      query: vi.fn(async (sql: string, params?: any[]) => {
        if (sql.includes("COUNT(*)")) return { rows: [{ cnt: "0" }] };
        if (sql.includes("MAX(block_number)")) return { rows: [{ max_num: "15" }] };
        if (sql.includes("INSERT INTO blockchain_blocks")) recordedRow = {
          block_number: params![0], content: params![1], band: params![7], mined_at: new Date(),
        };
        return { rows: [] };
      }),
    };
    query.mockResolvedValue({ rows: [{ proposal_id: f.proposal.id }] });
    connect.mockResolvedValue(client);
    try {
      const res = response();
      await amendmentHandler(request(f.proposal), res as any);
      expect(res.code).toBe(201);
      expect(fetcher).toHaveBeenCalledOnce();
      const seal = await getConstitutionSeal({ query: async (sql: string) => ({
        rows: sql.includes("information_schema.tables") ? [{ exists: true }] :
          sql.includes("CONSTITUTION_AMENDMENT") ? [recordedRow] : [{
          block_number: 15, psi_channel: CONSTITUTION_PSI, wavelength_nm: "542.5",
          content: `CONSTITUTION_SEAL[v1]: Test | hash:sha256=${"a".repeat(64)}`, mined_at: new Date(),
        }],
      }) });
      expect(seal?.amendments).toHaveLength(1);
      expect(seal?.amendments[0]).toMatchObject({
        title: f.proposal.title, body: f.proposal.body, blockNumber: 16,
      });
      expect(client.query).toHaveBeenCalledWith("COMMIT");
    } finally {
      vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
    }
  });
});
