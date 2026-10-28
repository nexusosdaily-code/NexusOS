import { CONTAINMENT_MS, REVIEW_MS, FOUNDER_REVIEW_MS, eventSchema, hash, validSignature, validateConfig, type Config, type SafetyEvent, type Proposal } from "./protocol";

export interface SafetyCase {
  id: string; operator: string; resource: string; capability: "contract.run";
  containedAt: number; reviewAt: number; expiresAt: number;
  reviewers: string[]; appealed: boolean; restored: boolean; reviewed: boolean;
}
export interface JournalRecord { event: SafetyEvent; hash: string }
/** append() MUST durably commit before resolving. The deployment owns the journal outside the operator's host. */
export interface Journal {
  read(): Promise<JournalRecord[]>;
  append(record: JournalRecord): Promise<void>;
}
export const GENESIS_HASH = "0".repeat(64);

export class SafetyController {
  private cases = new Map<string, SafetyCase>();
  private sequence = 0;
  private head = GENESIS_HASH;
  private queue: Promise<unknown> = Promise.resolve();
  private ready = false;
  constructor(private config: Config, private journal: Journal, private clock = Date.now) {
    this.config = validateConfig(config);
  }

  async initialise() {
    if (this.ready) throw new Error("Already initialised");
    for (const record of await this.journal.read()) {
      if (record.hash !== hash(record.event)) throw new Error("Audit alteration detected");
      this.validate(record.event, true);
      this.apply(record.event, record.hash);
    }
    this.ready = true;
  }
  checkpoint() { return { sequence: this.sequence, head: this.head, policyDigest: this.config.commissioning.policyDigest, governanceMode: this.config.governanceMode }; }
  status() {
    return {
      ...this.checkpoint(), ready: this.ready,
      activeCases: [...this.cases.values()].filter(c => !c.restored).length,
      overdueCases: [...this.cases.values()].filter(c => !c.restored && !c.reviewed && this.clock() >= c.reviewAt).length,
      expiredCases: [...this.cases.values()].filter(c => !c.restored && !c.reviewed && this.clock() >= c.expiresAt).length,
      replacementEnabled: false, identityTransferEnabled: false,
    };
  }
  notifications() {
    return {
      ...this.checkpoint(),
      cases: [...this.cases.values()].map(c => ({
        caseId: c.id, operator: c.operator, resource: c.resource, reviewAt: c.reviewAt, expiresAt: c.expiresAt,
        appealed: c.appealed, restored: c.restored, reviewed: c.reviewed,
        overdue: !c.restored && !c.reviewed && this.clock() >= c.reviewAt,
        expired: !c.restored && !c.reviewed && this.clock() >= c.expiresAt,
      })),
    };
  }
  /** Checks are live, not cached permits. Expiry escalates but NEVER silently restores. */
  check(operator: string, resource: string, capability: "contract.run") {
    if (!this.ready) throw new Error("Safety authority unavailable");
    if (this.actor(operator).role !== "operator") throw new Error("Uncommissioned operator");
    const affected = [...this.cases.values()].filter(c =>
      !c.restored && c.operator === operator && c.resource === resource && c.capability === capability);
    return {
      allowed: affected.length === 0,
      mode: affected.length === 0 ? "normal" : "restricted",
      overdue: affected.some(c => !c.reviewed && this.clock() >= c.reviewAt),
      expired: affected.some(c => !c.reviewed && this.clock() >= c.expiresAt),
      essentialFallback: "read-only",
    };
  }
  async submit(raw: unknown): Promise<ReturnType<SafetyController["checkpoint"]>> {
    const event = eventSchema.parse(raw);
    const operation = this.queue.then(async () => {
      if (!this.ready) throw new Error("Safety authority unavailable");
      this.validate(event, false);
      const nextHash = hash(event);
      try { await this.journal.append({ event, hash: nextHash }); }
      catch (error) {
        // A partial/dubious write must not be followed by a fresh allow receipt.
        this.ready = false;
        throw error;
      }
      this.apply(event, nextHash);
      return this.checkpoint();
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
  private actor(id: string) {
    const actor = this.config.actors.find(a => a.id === id);
    if (!actor) throw new Error("Unknown signing identity");
    return actor;
  }
  private verify(actorId: string, domain: string, payload: unknown, signature: string) {
    if (!validSignature(this.actor(actorId).publicKey, domain, payload, signature)) throw new Error("Forged signature");
  }
  private reviewers(event: SafetyEvent, required: number, excluded: Set<string>) {
    const controllers = new Set<string>();
    for (const approval of event.approvals) {
      const actor = this.actor(approval.actor);
      const requiredRole = this.config.governanceMode === "founder-only" ? "founder" : "reviewer";
      if (actor.role !== requiredRole || excluded.has(actor.controller) || controllers.has(actor.controller)) {
        throw new Error("Reviewer conflict or duplicate controller");
      }
      this.verify(actor.id, "proposal", event.proposal, approval.signature);
      controllers.add(actor.controller);
    }
    if (controllers.size < required) throw new Error("Independent reviewer quorum unavailable");
  }
  private validate(event: SafetyEvent, replay: boolean) {
    const p = event.proposal;
    if (p.sequence !== this.sequence + 1 || p.previousHash !== this.head ||
        p.policyDigest !== this.config.commissioning.policyDigest) throw new Error("Stale or replayed proposal");
    if (!replay && (p.createdAt > this.clock() + 5000 || this.clock() - p.createdAt > 5 * 60_000)) {
      throw new Error("Proposal outside signing window");
    }
    if (event.initiatorSignature.actor !== p.initiator) throw new Error("Initiator mismatch");
    this.verify(p.initiator, "proposal", p, event.initiatorSignature.signature);
    const initiator = this.actor(p.initiator);
    const excluded = new Set([initiator.controller]);
    if (p.kind === "contain") {
      if (this.cases.has(p.caseId)) throw new Error("Case ID already used");
      if ([...this.cases.values()].some(c => !c.restored && c.operator === p.operator && c.resource === p.resource)) {
        throw new Error("Active restriction cannot be renewed or extended through another case");
      }
      const operator = this.actor(p.operator);
      if (operator.role !== "operator" || initiator.role === "operator") throw new Error("Operator cannot authorise its own safety case");
      excluded.add(operator.controller);
      const sources = new Set<string>();
      for (const evidence of p.evidence) {
        const { signature, ...observation } = evidence;
        const source = this.actor(evidence.source);
        if (evidence.operator !== p.operator || evidence.resource !== p.resource ||
            evidence.capability !== p.capability || evidence.policyDigest !== p.policyDigest) {
          throw new Error("Evidence subject or scope mismatch");
        }
        if (source.role !== "source" || sources.has(source.controller) || source.controller === operator.controller) {
          throw new Error("Evidence is not independently corroborated");
        }
        if (evidence.observedAt > p.createdAt || p.createdAt - evidence.observedAt > 24 * 60 * 60_000) {
          throw new Error("Evidence outside assessment window");
        }
        this.verify(source.id, "evidence", observation, signature);
        sources.add(source.controller);
        excluded.add(source.controller);
      }
      if (sources.size < 2) throw new Error("Two independent evidence sources required");
      if (this.config.governanceMode === "founder-only") {
        // The independent emergency mechanism is pre-approved in the founder's
        // commissioning record. No independent human authoriser is appointed.
        this.reviewers(event, p.emergency ? 0 : 1, excluded);
      } else this.reviewers(event, p.emergency ? 1 : 2, excluded);
    } else {
      const existing = this.cases.get(p.caseId);
      if (!existing || existing.restored) throw new Error("No active safety case");
      if (p.kind === "appeal") {
        // Appeals cannot grant permissions. The operator may supply contrary evidence.
        if (event.approvals.length) throw new Error("Appeal must not carry an authority decision");
      } else if (p.kind === "review") {
        if (initiator.role === "operator") throw new Error("Operator cannot initiate an authorising review");
        excluded.add(this.actor(existing.operator).controller);
        this.reviewers(event, this.config.governanceMode === "founder-only" ? 1 : 2, excluded);
      } else {
        if (initiator.role === "operator") throw new Error("Operator cannot initiate restoration");
        const { signature, ...test } = p.test;
        const tester = this.actor(test.source);
        if (tester.role !== "source" || tester.controller === this.actor(existing.operator).controller ||
            test.caseId !== p.caseId || test.policyDigest !== p.policyDigest ||
            test.testedAt < existing.containedAt || test.testedAt > p.createdAt ||
            p.createdAt - test.testedAt > 15 * 60_000) throw new Error("Independent fresh recovery tests required");
        this.verify(tester.id, "recovery", test, signature);
        excluded.add(tester.controller);
        excluded.add(this.actor(existing.operator).controller);
        this.reviewers(event, this.config.governanceMode === "founder-only" ? 1 : 2, excluded);
        if (this.config.governanceMode === "independent-review" &&
            !event.approvals.some(a => !existing.reviewers.includes(a.actor))) {
          throw new Error("Restoration requires a reviewer uninvolved in the original decision");
        }
      }
    }
  }
  private apply(event: SafetyEvent, nextHash: string) {
    const p: Proposal = event.proposal;
    if (p.kind === "contain") {
      this.cases.set(p.caseId, {
        id: p.caseId, operator: p.operator, resource: p.resource, capability: p.capability,
        containedAt: p.createdAt,
        reviewAt: p.createdAt + (this.config.governanceMode === "founder-only" ? FOUNDER_REVIEW_MS : REVIEW_MS),
        expiresAt: p.createdAt + (this.config.governanceMode === "founder-only" ? FOUNDER_REVIEW_MS : CONTAINMENT_MS),
        reviewers: event.approvals.map(a => a.actor), appealed: false, restored: false, reviewed: false,
      });
    } else {
      const existing = this.cases.get(p.caseId)!;
      if (p.kind === "appeal") existing.appealed = true;
      else if (p.kind === "review") existing.reviewed = true;
      else existing.restored = true;
    }
    this.sequence = p.sequence;
    this.head = nextHash;
  }
}
