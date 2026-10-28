import type { Express, RequestHandler, Request } from "express";
import type { Pool } from "pg";
import { z, ZodError } from "zod";
import {
  ballotSchema, electionSchema, nominationSchema, personVerificationSchema,
  continuityRequestSchema, continuityScheduleSchema, relinquishSchema,
} from "../shared/community-elections";
import {
  ElectionError, communityOverview, communityMembership, communityVerifiedPeople, verifyCommunityPerson,
  revokeCommunityPerson, nominateCommunityReviewer, withdrawCommunityNomination,
  createCommunityElection, castCommunityBallot, cancelCommunityElection,
  finaliseCommunityElection, readCommunityElectionRecord,
} from "./governance/community-election-service";
import {
  communityContinuityOverview, fileContinuityRequest, scheduleContinuityRequest,
  relinquishCommunityMandate, readContinuityEvent,
} from "./governance/community-election-continuity";

export function registerCommunityElectionRoutes(app: Express, pool: Pool, authenticate: RequestHandler) {
  const base = "/api/community-elections";
  const id = (req: Request) => z.string().uuid().parse(req.params.id);
  const actor = (req: Request) => {
    const user = (req as any).user;
    if (!user?.id) throw new ElectionError(401, "Sign in required");
    return user as { id: string; role: string };
  };
  const handle = (work: (req: Request) => Promise<unknown>, status = 200): RequestHandler => async (req,res) => {
    res.setHeader("Cache-Control", "no-store");
    try { res.status(status).json(await work(req)); }
    catch (error: any) {
      if (error instanceof ElectionError) res.status(error.status).json({ error: error.message });
      else if (error instanceof ZodError) res.status(400).json({ error: error.issues.map(i => i.message).join("; ") });
      else if (error.code === "23505") res.status(409).json({ error: "Duplicate person, nomination, credential or ballot; only one is permitted" });
      else if (error.code === "42P01") res.status(503).json({ error: "Election storage is not installed; apply the election and continuity migrations" });
      else {
        console.error("[COMMUNITY ELECTION] Operation failed", error.code ?? error.name);
        res.status(503).json({ error: "Election operation failed; no result or authority change was committed" });
      }
    }
  };
  app.get(base, handle(() => communityOverview(pool)));
  app.get(`${base}/continuity`, handle(() => communityContinuityOverview(pool)));
  app.post(`${base}/continuity/requests`, authenticate,
    handle(req => fileContinuityRequest(pool, actor(req), continuityRequestSchema.parse(req.body)), 201));
  app.post(`${base}/continuity/requests/:id/schedule`, authenticate,
    handle(req => scheduleContinuityRequest(pool, actor(req), id(req), continuityScheduleSchema.parse(req.body).opensAt), 201));
  app.get(`${base}/continuity/events/:id/record`, handle(req => readContinuityEvent(pool, id(req))));
  app.post(`${base}/:id/relinquish`, authenticate, handle(req => {
    relinquishSchema.parse(req.body);
    return relinquishCommunityMandate(pool, actor(req), id(req));
  }));
  app.get(`${base}/me`, authenticate, handle(req => communityMembership(pool, actor(req))));
  app.get(`${base}/persons`, authenticate, handle(req => communityVerifiedPeople(pool, actor(req))));
  app.post(`${base}/verify-person`, authenticate, handle(req => verifyCommunityPerson(pool, actor(req), personVerificationSchema.parse(req.body)), 201));
  app.post(`${base}/persons/:id/revoke`, authenticate, handle(req => revokeCommunityPerson(pool, actor(req), id(req))));
  app.post(`${base}/nominations`, authenticate, handle(req => nominateCommunityReviewer(pool, actor(req), nominationSchema.parse(req.body)), 201));
  app.delete(`${base}/nominations/:id`, authenticate, handle(req => withdrawCommunityNomination(pool, actor(req), id(req))));
  app.post(base, authenticate, handle(req => createCommunityElection(pool, actor(req), electionSchema.parse(req.body)), 201));
  app.post(`${base}/:id/vote`, authenticate, handle(req => castCommunityBallot(pool, actor(req), id(req), ballotSchema.parse(req.body).choice), 201));
  app.post(`${base}/:id/cancel`, authenticate, handle(req => cancelCommunityElection(pool, actor(req), id(req))));
  app.post(`${base}/:id/finalise`, authenticate, handle(req => finaliseCommunityElection(pool, actor(req), id(req))));
  app.get(`${base}/:id/record`, handle(req => readCommunityElectionRecord(pool, id(req))));
}
