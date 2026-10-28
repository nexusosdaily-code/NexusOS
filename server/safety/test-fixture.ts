// Ephemeral test identities only. This file never generates or configures production reviewers.
import { generateKeyPairSync, sign } from "node:crypto";
import { policyDigest, signingBytes, validateConfig, type Config, type Proposal, type SafetyEvent } from "./protocol";
import { GENESIS_HASH, SafetyController, type Journal, type JournalRecord } from "./controller";

export function fixture(governanceMode: Config["governanceMode"] = "independent-review") {
  const keys = new Map<string, string>();
  const actors: Config["actors"] = [
    ...(governanceMode === "founder-only" ? [["founder", "founder"]] : [["r1", "reviewer"], ["r2", "reviewer"], ["r3", "reviewer"]]),
    ["s1", "source"], ["s2", "source"], ["operator", "operator"], ["other", "operator"],
  ].map(([id, role]) => {
    const pair = generateKeyPairSync("ed25519");
    keys.set(id, pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    return {
      id, role: role as Config["actors"][number]["role"], controller: id,
      publicKey: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      ...(role === "reviewer" || role === "founder" ? { notificationUrl: `https://${id}.independent.example/notify` } : {}),
    };
  });
  const signature = (actor: string, domain: string, payload: unknown) =>
    sign(null, signingBytes(domain, payload), keys.get(actor)!).toString("base64");
  const commissioning = {
    policyDigest: policyDigest(actors, governanceMode), essentialServiceInventoryDigest: "1".repeat(64),
    fallbackTestDigest: "2".repeat(64), authorityReconciliationDigest: "3".repeat(64),
    tests: ["s1", "s2"].map(source => {
      const test = {
        source, artifactDigest: "2".repeat(64), essentialServiceInventoryDigest: "1".repeat(64),
        compromisedOperator: true as const, forgedEvidence: true as const, maliciousReviewer: true as const,
        unavailableReviewer: true as const, falseAlarm: true as const,
        essentialContinuity: true as const, safeRestoration: true as const,
      };
      return { ...test, signature: signature(source, "commission-test", test) };
    }),
  };
  const config = validateConfig({
    policyId: "human-life-safety-v1", governanceMode, actors, commissioning: {
      ...commissioning,
      approvals: (governanceMode === "founder-only" ? ["founder"] : ["r1", "r2"]).map(actor => ({ actor, signature: signature(actor, "commission", commissioning) })),
    },
  });
  let now = 1_000_000;
  const records: JournalRecord[] = [];
  const journal: Journal = {
    read: async () => structuredClone(records),
    append: async record => { records.push(structuredClone(record)); },
  };
  const controller = new SafetyController(config, journal, () => now);
  const evidence = (source: string) => {
    const observation = {
      operator: "operator", resource: "contract1", capability: "contract.run" as const,
      policyDigest: config.commissioning.policyDigest,
      source, observation: "Independent observation of unauthorised targeting",
      harmPath: "Demonstrable serious harm pathway", uncertainty: "Pending full investigation",
      contraryEvidence: "Benign explanation remains possible", observedAt: now,
    };
    return { ...observation, signature: signature(source, "evidence", observation) };
  };
  const contain = (overrides: Record<string, unknown> = {}): Proposal => ({
    policyDigest: config.commissioning.policyDigest,
    previousHash: controller.checkpoint().head, sequence: controller.checkpoint().sequence + 1,
    kind: "contain", caseId: "case1", initiator: "s1", createdAt: now,
    operator: "operator", resource: "contract1", capability: "contract.run",
    reason: "Corroborated credible danger", emergency: false, evidence: [evidence("s1"), evidence("s2")],
    ...overrides,
  } as Proposal);
  const restore = (): Proposal => {
    const test = {
      source: "s2", caseId: "case1", policyDigest: config.commissioning.policyDigest,
      testedAt: now, integrity: true as const, humanLife: true as const, leastPrivilege: true as const,
      stagedRecovery: true as const, essentialContinuity: true as const, artifactDigest: "4".repeat(64),
    };
    return {
      policyDigest: config.commissioning.policyDigest, sequence: controller.checkpoint().sequence + 1,
      previousHash: controller.checkpoint().head, kind: "restore", caseId: "case1",
      initiator: "s1", createdAt: now, reason: "False alarm independently tested",
      test: { ...test, signature: signature("s2", "recovery", test) },
    };
  };
  const event = (proposal: Proposal, reviewers = governanceMode === "founder-only" ? ["founder"] : ["r1", "r2"]): SafetyEvent => ({
    proposal, initiatorSignature: { actor: proposal.initiator, signature: signature(proposal.initiator, "proposal", proposal) },
    approvals: reviewers.map(actor => ({ actor, signature: signature(actor, "proposal", proposal) })),
  });
  const review = (): Proposal => ({
    kind: "review", caseId: "case1", initiator: "s1", createdAt: now, reason: "Independent assessment of restriction",
    policyDigest: config.commissioning.policyDigest, sequence: controller.checkpoint().sequence + 1,
    previousHash: controller.checkpoint().head,
  });
  return {
    controller, config, records, journal, keys, signature, evidence, contain, restore, review, event,
    now: () => now, advance: (ms: number) => { now += ms; }, GENESIS_HASH,
  };
}
