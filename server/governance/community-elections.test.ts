import { describe, it, expect } from "vitest";
import {
  meetsCommunityThreshold, reviewerTermEnd, ballotSchema,
  nominationSchema, electionSchema, personVerificationSchema,
  continuityDates, continuityRequestSchema, relinquishSchema,
} from "../../shared/community-elections";
import { electionRecordContent, electionRecordDigest } from "./community-election-record";

describe("equal-person community election rules", () => {
  it("requires exactly at least 51% of votes cast without rounding", () => {
    expect(meetsCommunityThreshold(51,49)).toBe(true);
    expect(meetsCommunityThreshold(50,50)).toBe(false);
    expect(meetsCommunityThreshold(50,49)).toBe(false); // 50.505%, not 51%
    expect(meetsCommunityThreshold(1,0)).toBe(true); // no invented quorum
    expect(meetsCommunityThreshold(0,0)).toBe(false);
    expect(meetsCommunityThreshold(-1,0)).toBe(false);
    expect(meetsCommunityThreshold(0.51,0.49)).toBe(false);
    expect(meetsCommunityThreshold(Infinity,0)).toBe(false);
  });
  it("allows yes/no only and rejects weighted or organisational ballots", () => {
    expect(ballotSchema.safeParse({choice:"yes"}).success).toBe(true);
    for (const input of [{choice:"abstain"},{choice:"yes",weight:100},
      {choice:"no",organisation:"Company"},{choice:"yes",personId:"someone-else"}])
      expect(ballotSchema.safeParse(input).success).toBe(false);
  });
  it("expires terms after three calendar years including leap-day handling", () => {
    expect(reviewerTermEnd(new Date("2026-10-13T12:30:00Z")).toISOString()).toBe("2029-10-13T12:30:00.000Z");
    expect(reviewerTermEnd(new Date("2028-02-29T12:30:00Z")).toISOString()).toBe("2031-02-28T12:30:00.000Z");
  });
  it("requires explicit unique-human and no-organisation verification", () => {
    const input = {userId:"22222222-2222-4222-8222-222222222222",personReference:"opaque-person-ref-123",
      evidenceReference:"private-audit-record",confirmUniqueHuman:true,confirmNoOrganisation:true};
    expect(personVerificationSchema.safeParse(input).success).toBe(true);
    expect(personVerificationSchema.safeParse({...input,confirmNoOrganisation:false}).success).toBe(false);
    expect(personVerificationSchema.safeParse({...input,personReference:"email@example.com"}).success).toBe(false);
  });
  it("rejects authority-changing scope and automatic execution request fields", () => {
    const input = {kind:"policy",scope:"welfare",title:"Improve essential services",
      body:"Improve wellbeing and standards of living.",opensAt:"2027-01-01T00:00:00Z",
      closesAt:"2027-01-08T00:00:00Z",confirmAuthorityPreserved:true};
    expect(electionSchema.safeParse(input).success).toBe(true);
    expect(electionSchema.safeParse({...input,scope:"authority-transfer"}).success).toBe(false);
    expect(electionSchema.safeParse({...input,execute:true}).success).toBe(false);
    expect(electionSchema.safeParse({...input,confirmAuthorityPreserved:false}).success).toBe(false);
  });
  it("requires consent, role and actual public-key format for nomination", () => {
    const input = {publicName:"Community Reviewer",role:"human-life-safety",
      statement:"I consent to consideration by the community.",publicKey:"ab".repeat(32),consent:true};
    expect(nominationSchema.safeParse(input).success).toBe(true);
    expect(nominationSchema.safeParse({...input,consent:false}).success).toBe(false);
    expect(nominationSchema.safeParse({...input,publicKey:"demo-key"}).success).toBe(false);
  });
  it("preserves exact Unicode, delimiters and newlines in election records", () => {
    const record = {title:"WNSP | Ψ",body:"line one\nline two | Māori",commissioned:false};
    const content = electionRecordContent(record);
    expect(JSON.parse(content.slice("COMMUNITY_ELECTION[v1]:".length))).toEqual(record);
    expect(electionRecordDigest(content)).not.toBe(electionRecordDigest(content+" "));
    expect(content.startsWith("CONSTITUTION_AMENDMENT")).toBe(false);
  });
  it("sets exact UTC notice and voting durations without rounding or extending deadlines", () => {
    const created = new Date("2026-10-13T12:30:00.000Z");
    expect(() => continuityDates(created,new Date("2026-10-20T12:29:59.999Z"))).toThrow("seven complete days");
    expect(continuityDates(created,new Date("2026-10-20T12:30:00.000Z")).closesAt.toISOString())
      .toBe("2026-11-03T12:30:00.000Z");
  });
  it("requires explicit privacy, constitutional and irreversible confirmations with no authority fields", () => {
    const input = {kind:"appeal",targetId:"22222222-2222-4222-8222-222222222222",
      grounds:"Public procedural evidence for community decision.",groundType:"procedure",
      confirmPublicNonSensitive:true,confirmConstitutionBound:true};
    expect(continuityRequestSchema.safeParse(input).success).toBe(true);
    expect(continuityRequestSchema.safeParse({...input,confirmConstitutionBound:false}).success).toBe(false);
    expect(continuityRequestSchema.safeParse({...input,confirmPublicNonSensitive:false}).success).toBe(false);
    expect(continuityRequestSchema.safeParse({...input,transferAuthority:true}).success).toBe(false);
    expect(continuityRequestSchema.safeParse({...input,groundType:undefined}).success).toBe(false);
    expect(relinquishSchema.safeParse({confirmIrreversible:false}).success).toBe(false);
    expect(relinquishSchema.safeParse({confirmIrreversible:true,userId:input.targetId}).success).toBe(false);
  });
});
