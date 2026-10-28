import { describe, expect, it } from "vitest";
import { fixture } from "./test-fixture";
import { SafetyController } from "./controller";
import { CONTAINMENT_MS, REVIEW_MS, FOUNDER_REVIEW_MS, hash, validateConfig, type Proposal } from "./protocol";

describe("independent human-life safety authority", () => {
  it("requires commissioned, independently authenticated identities and source tests", () => {
    const f = fixture();
    const duplicate = structuredClone(f.config);
    duplicate.actors[1].controller = duplicate.actors[0].controller;
    expect(() => validateConfig(duplicate)).toThrow(/separately controlled/);
    const keyReuse = structuredClone(f.config);
    keyReuse.actors[1].publicKey = keyReuse.actors[0].publicKey;
    expect(() => validateConfig(keyReuse)).toThrow(/Shared signing key/);
    const fakeTests = structuredClone(f.config);
    fakeTests.commissioning.tests[0].signature = "A".repeat(86) + "==";
    expect(() => validateConfig(fakeTests)).toThrow(/commissioning tests/);
  });
  it("contains only the specific operator/capability/resource without shutting down reads", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    expect(f.controller.check("operator", "contract1", "contract.run")).toMatchObject({ allowed: false, essentialFallback: "read-only" });
    expect(f.controller.check("operator", "contract2", "contract.run").allowed).toBe(true);
    expect(f.controller.check("other", "contract1", "contract.run").allowed).toBe(true);
    expect(f.controller.status()).toMatchObject({ replacementEnabled: false, identityTransferEnabled: false });
  });
  it("rejects forged source evidence even when two reviewers sign the allegation", async () => {
    const f = fixture(); await f.controller.initialise();
    const proposal = f.contain();
    if (proposal.kind !== "contain") throw new Error();
    proposal.evidence[0].observation = "Forged observation";
    await expect(f.controller.submit(f.event(proposal))).rejects.toThrow(/Forged/);
    expect(f.records).toHaveLength(0);
  });
  it("rejects one source presented twice", async () => {
    const f = fixture(); await f.controller.initialise();
    await expect(f.controller.submit(f.event(f.contain({ evidence: [f.evidence("s1"), f.evidence("s1")] })))).rejects.toThrow(/corroborated/);
  });
  it("rejects evidence repurposed for a different affected resource", async () => {
    const f = fixture(); await f.controller.initialise();
    await expect(f.controller.submit(f.event(f.contain({ resource: "unrelated" })))).rejects.toThrow(/scope mismatch/);
  });
  it("rejects collusion through duplicate reviewers, self-review and fabricated signatures", async () => {
    const f = fixture(); await f.controller.initialise();
    await expect(f.controller.submit(f.event(f.contain(), ["r1", "r1"]))).rejects.toThrow(/duplicate/);
    await expect(f.controller.submit(f.event(f.contain({ initiator: "r1" })))).rejects.toThrow(/conflict/);
    const forged = f.event(f.contain());
    forged.approvals[1].signature = forged.approvals[0].signature;
    await expect(f.controller.submit(forged)).rejects.toThrow(/Forged/);
  });
  it("requires two reviewers for planned action, permits bounded corroborated emergency action", async () => {
    const f = fixture(); await f.controller.initialise();
    await expect(f.controller.submit(f.event(f.contain(), ["r1"]))).rejects.toThrow(/quorum/);
    await f.controller.submit(f.event(f.contain({ emergency: true }), ["r1"]));
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(false);
  });
  it("unavailable reviewers do not auto-restore, even after the containment deadline", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    f.advance(REVIEW_MS);
    expect(f.controller.status().overdueCases).toBe(1);
    f.advance(CONTAINMENT_MS * 2);
    expect(f.controller.check("operator", "contract1", "contract.run")).toMatchObject({ allowed: false, overdue: true });
    await expect(f.controller.submit(f.event(f.restore(), ["r3"]))).rejects.toThrow(/quorum/);
    await expect(f.controller.submit(f.event(f.contain({ caseId: "extension" })))).rejects.toThrow(/renewed or extended/);
  });
  it("a compromised operator cannot contain, restore or silently transfer identities", async () => {
    const f = fixture(); await f.controller.initialise();
    await expect(f.controller.submit(f.event(f.contain({ initiator: "operator" })))).rejects.toThrow(/Operator/);
    await f.controller.submit(f.event(f.contain()));
    await expect(f.controller.submit(f.event({ ...f.restore(), initiator: "operator" } as Proposal))).rejects.toThrow(/Operator/);
    await expect(f.controller.submit({ ...f.event(f.restore()), transferIdentity: "operator" })).rejects.toThrow();
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(false);
  });
  it("accepts an operator appeal, preserves restrictions, and safely restores a false alarm", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    f.advance(1000);
    const appeal: Proposal = {
      kind: "appeal", caseId: "case1", initiator: "operator", createdAt: f.now(),
      policyDigest: f.config.commissioning.policyDigest,
      sequence: f.controller.checkpoint().sequence + 1, previousHash: f.controller.checkpoint().head,
      reason: "False alarm", contraryEvidence: "Independent benign explanation",
    };
    await f.controller.submit(f.event(appeal, []));
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(false);
    await expect(f.controller.submit(f.event(f.restore()))).rejects.toThrow(/uninvolved/);
    await f.controller.submit(f.event(f.restore(), ["r2", "r3"]));
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(true);
    expect(f.records).toHaveLength(3);
  });
  it("requires independently signed fresh recovery tests, not an operator assertion", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    const restore = f.restore();
    if (restore.kind !== "restore") throw new Error();
    restore.test.artifactDigest = "5".repeat(64);
    await expect(f.controller.submit(f.event(restore, ["r2", "r3"]))).rejects.toThrow(/Forged/);
    const unchecked = f.restore();
    if (unchecked.kind !== "restore") throw new Error();
    (unchecked.test as any).essentialContinuity = false;
    await expect(f.controller.submit(f.event(unchecked, ["r2", "r3"]))).rejects.toThrow();
  });
  it("replays signed audit records on restart without clearing a restriction", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    const restarted = new SafetyController(f.config, f.journal, f.now);
    await restarted.initialise();
    expect(restarted.check("operator", "contract1", "contract.run").allowed).toBe(false);
    expect(restarted.checkpoint()).toEqual(f.controller.checkpoint());
  });
  it("detects altered records even when an attacker recomputes their local hashes", async () => {
    const f = fixture(); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain()));
    const record = f.records[0];
    (record.event.proposal as any).resource = "other-contract";
    record.hash = hash(record.event);
    await expect(new SafetyController(f.config, f.journal, f.now).initialise()).rejects.toThrow(/Forged/);
  });
  it("rejects replay and racing approvals rather than losing an audit event", async () => {
    const f = fixture(); await f.controller.initialise();
    const event = f.event(f.contain());
    const result = await Promise.allSettled([f.controller.submit(event), f.controller.submit(event)]);
    expect(result.map(r => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(f.records).toHaveLength(1);
  });
  it("cannot grant permissions after audit durability fails", async () => {
    const f = fixture();
    const controller = new SafetyController(f.config, { read: f.journal.read, append: async () => { throw new Error("disk unavailable"); } }, f.now);
    await controller.initialise();
    await expect(controller.submit(f.event(f.contain()))).rejects.toThrow(/disk/);
    expect(() => controller.check("operator", "contract1", "contract.run")).toThrow(/unavailable/);
  });
  it("rejects unknown operators instead of silently granting them an unrestricted permit", async () => {
    const f = fixture(); await f.controller.initialise();
    expect(() => f.controller.check("unregistered", "contract1", "contract.run")).toThrow(/Unknown/);
  });
});

describe("living-founder authorisation and 24-hour review", () => {
  it("does not appoint an independent human quorum in living-founder mode", async () => {
    const f = fixture("founder-only"); await f.controller.initialise();
    expect(f.config.actors.some(a => a.role === "reviewer")).toBe(false);
    await expect(f.controller.submit(f.event(f.contain(), []))).rejects.toThrow(/quorum/);
    await f.controller.submit(f.event(f.contain()));
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(false);
  });
  it("contains on pre-approved corroborated emergency evidence and escalates at exactly 24 hours without restoration", async () => {
    const f = fixture("founder-only"); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain({ emergency: true }), []));
    f.advance(FOUNDER_REVIEW_MS - 1);
    expect(f.controller.status().overdueCases).toBe(0);
    f.advance(1);
    expect(f.controller.check("operator", "contract1", "contract.run")).toMatchObject({ allowed: false, overdue: true, expired: true });
    await expect(f.controller.submit(f.event(f.restore(), []))).rejects.toThrow(/quorum/);
  });
  it("records founder review without resetting deadlines or restoring a capability", async () => {
    const f = fixture("founder-only"); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain({ emergency: true }), []));
    const deadline = f.controller.notifications().cases[0].reviewAt;
    f.advance(1000);
    await f.controller.submit(f.event(f.review()));
    expect(f.controller.notifications().cases[0]).toMatchObject({ reviewAt: deadline, reviewed: true, restored: false });
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(false);
  });
  it("requires founder approval and independent recovery tests to restore a false alarm", async () => {
    const f = fixture("founder-only"); await f.controller.initialise();
    await f.controller.submit(f.event(f.contain({ emergency: true }), []));
    await f.controller.submit(f.event(f.restore()));
    expect(f.controller.check("operator", "contract1", "contract.run").allowed).toBe(true);
  });
  it("blocks self-review and founder conflicts without giving other actors authority", async () => {
    const f = fixture("founder-only"); await f.controller.initialise();
    await expect(f.controller.submit(f.event(f.contain({ initiator: "founder" })))).rejects.toThrow(/conflict/);
    const conflicted = structuredClone(f.config);
    conflicted.actors.find(a => a.id === "founder")!.controller = "operator";
    expect(() => validateConfig(conflicted)).toThrow(/separation of duties/);
  });
});
