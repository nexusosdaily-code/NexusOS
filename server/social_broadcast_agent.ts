/**
 * Social Broadcast Agent — Bus Router for Telegram → Social Media
 * ================================================================
 * Registered kernel agent on Ψ(72,18,H) — USER band.
 *
 * Responsibilities:
 *   1. On VIDEO_RECEIVED event → queue broadcast jobs for each platform
 *   2. Run every 30s → attempt pending broadcasts via platform connectors
 *   3. Update broadcast log in DB with status, post URL, or error
 *
 * Platform connectors are modular — drop in real credentials to activate.
 * Instagram Graph API + YouTube Data API v3 are the two live targets.
 */

import { db } from "./db";
import { eq, and, lt, sql, desc } from "drizzle-orm";
import { socialBroadcasts, telegramVideos } from "../shared/schema";

// ── Agent state (shared with kernel_agents status endpoint) ──────────────────

export interface BroadcastAgentState {
  agentId:     string;
  displayName: string;
  band:        string;
  channelNotation: string;
  status:      "ACTIVE" | "IDLE" | "ERROR" | "BOOTING";
  lastAction:  string;
  lastRunAt:   number;
  cycleCount:  number;
  totalActionsCompleted: number;
  errorCount:  number;
  lastError?:  string;
  platforms:   PlatformStatus[];
}

export interface PlatformStatus {
  id:          string;
  name:        string;
  icon:        string;
  connected:   boolean;
  credential:  string;      // env var name that activates this platform
  lastPosted?: string;
  totalPosted: number;
}

const PLATFORMS: PlatformStatus[] = [
  {
    id:         "instagram",
    name:       "Instagram",
    icon:       "📸",
    connected:  !!process.env.INSTAGRAM_ACCESS_TOKEN,
    credential: "INSTAGRAM_ACCESS_TOKEN",
    totalPosted: 0,
  },
  {
    id:         "youtube",
    name:       "YouTube Shorts",
    icon:       "▶️",
    connected:  !!process.env.YOUTUBE_API_KEY,
    credential: "YOUTUBE_API_KEY",
    totalPosted: 0,
  },
];

const _state: BroadcastAgentState = {
  agentId:     "social_broadcast_agent",
  displayName: "Social Broadcast Agent",
  band:        "USER",
  channelNotation: "Ψ(72,18,H)",
  status:      "BOOTING",
  lastAction:  "Initializing …",
  lastRunAt:   Date.now(),
  cycleCount:  0,
  totalActionsCompleted: 0,
  errorCount:  0,
  platforms:   PLATFORMS,
};

export function getBroadcastAgentState(): BroadcastAgentState {
  return _state;
}

// ── Platform Connectors ──────────────────────────────────────────────────────
// Each connector returns { success, postUrl?, error? }
// Replace stub bodies with real API calls once credentials are in place.

async function postToInstagram(video: any): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const token    = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId   = process.env.INSTAGRAM_PAGE_ID;
  const fileSize = video.fileSize ?? 0;

  if (!token || !pageId) {
    return { success: false, error: "INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_PAGE_ID not configured" };
  }

  // Instagram Reels upload requires a public video URL.
  // Telegram bot files are not public — you need an intermediate host (e.g. S3/Cloudflare R2).
  // Stub: return a placeholder until a media host is connected.
  return {
    success: false,
    error: "Instagram connector ready — connect a public media host (S3/R2) to activate auto-posting",
  };
}

async function postToYouTube(video: any): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return { success: false, error: "YOUTUBE_API_KEY not configured" };
  }

  // YouTube Shorts upload requires OAuth 2.0, not just an API key.
  // Stub: return instructions until OAuth flow is implemented.
  return {
    success: false,
    error: "YouTube connector ready — add OAuth2 client credentials (YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET) to activate",
  };
}

const CONNECTORS: Record<string, (video: any) => Promise<{ success: boolean; postUrl?: string; error?: string }>> = {
  instagram: postToInstagram,
  youtube:   postToYouTube,
};

// ── Queue broadcast jobs for a newly received video ──────────────────────────

export async function queueBroadcastsForVideo(videoId: number): Promise<void> {
  for (const platform of PLATFORMS) {
    // Check if already queued for this video + platform
    const existing = await db
      .select({ id: socialBroadcasts.id })
      .from(socialBroadcasts)
      .where(and(
        eq(socialBroadcasts.videoId, videoId),
        eq(socialBroadcasts.platform, platform.id),
      ))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(socialBroadcasts).values({
      videoId,
      platform:   platform.id,
      status:     "pending",
      agentNote:  `Queued by Social Broadcast Agent on ${new Date().toISOString()}`,
      scheduledAt: new Date(),
    });
  }

  console.log(`[BROADCAST_AGENT] Queued ${PLATFORMS.length} broadcast job(s) for video ${videoId}`);
}

// ── Main agent tick — processes pending jobs ─────────────────────────────────

async function broadcastTick(): Promise<void> {
  // Grab up to 5 pending jobs
  const pending = await db
    .select()
    .from(socialBroadcasts)
    .where(eq(socialBroadcasts.status, "pending"))
    .orderBy(socialBroadcasts.scheduledAt)
    .limit(5);

  if (pending.length === 0) {
    _state.lastAction = "No pending broadcasts — queue clear";
    _state.status     = "IDLE";
    return;
  }

  let posted = 0;
  let failed = 0;

  for (const job of pending) {
    // Mark as in-progress
    await db.update(socialBroadcasts)
      .set({ status: "broadcasting", attemptCount: job.attemptCount + 1 })
      .where(eq(socialBroadcasts.id, job.id));

    // Get the video
    const [video] = await db
      .select()
      .from(telegramVideos)
      .where(eq(telegramVideos.id, job.videoId))
      .limit(1);

    if (!video) {
      await db.update(socialBroadcasts)
        .set({ status: "failed", errorMessage: "Video not found in DB", broadcastAt: new Date() })
        .where(eq(socialBroadcasts.id, job.id));
      failed++;
      continue;
    }

    const connector = CONNECTORS[job.platform];
    if (!connector) {
      await db.update(socialBroadcasts)
        .set({ status: "failed", errorMessage: `No connector for platform: ${job.platform}`, broadcastAt: new Date() })
        .where(eq(socialBroadcasts.id, job.id));
      failed++;
      continue;
    }

    try {
      const result = await connector(video);

      if (result.success) {
        await db.update(socialBroadcasts)
          .set({
            status:     "posted",
            postUrl:    result.postUrl ?? null,
            broadcastAt: new Date(),
            agentNote:  `Posted successfully at ${new Date().toISOString()}`,
          })
          .where(eq(socialBroadcasts.id, job.id));

        // Update platform stats
        const p = _state.platforms.find(x => x.id === job.platform);
        if (p) { p.totalPosted++; p.lastPosted = new Date().toISOString(); }
        posted++;
      } else {
        // Connector returned a structured error — mark failed
        await db.update(socialBroadcasts)
          .set({
            status:        "failed",
            errorMessage:  result.error ?? "Unknown connector error",
            broadcastAt:   new Date(),
            agentNote:     `Attempt ${job.attemptCount + 1} failed`,
          })
          .where(eq(socialBroadcasts.id, job.id));
        failed++;
      }
    } catch (err: any) {
      await db.update(socialBroadcasts)
        .set({
          status:       "failed",
          errorMessage: err.message,
          broadcastAt:  new Date(),
        })
        .where(eq(socialBroadcasts.id, job.id));
      failed++;
    }
  }

  _state.totalActionsCompleted += posted;
  _state.lastAction = pending.length > 0
    ? `Processed ${pending.length} job(s) — ${posted} posted · ${failed} failed`
    : "Queue clear";
  _state.status = "ACTIVE";

  if (posted > 0 || failed > 0) {
    console.log(`[BROADCAST_AGENT] Cycle: ${posted} posted, ${failed} failed`);
  }
}

// ── Public helpers used by API routes ────────────────────────────────────────

export async function getBroadcastLog() {
  const rows = await db
    .select({
      id:           socialBroadcasts.id,
      videoId:      socialBroadcasts.videoId,
      platform:     socialBroadcasts.platform,
      status:       socialBroadcasts.status,
      postUrl:      socialBroadcasts.postUrl,
      errorMessage: socialBroadcasts.errorMessage,
      agentNote:    socialBroadcasts.agentNote,
      attemptCount: socialBroadcasts.attemptCount,
      scheduledAt:  socialBroadcasts.scheduledAt,
      broadcastAt:  socialBroadcasts.broadcastAt,
      createdAt:    socialBroadcasts.createdAt,
      videoCaption:  telegramVideos.caption,
      videoFileSize: telegramVideos.fileSize,
      videoThumbId:  telegramVideos.thumbFileId,
      videoFileId:   telegramVideos.fileId,
    })
    .from(socialBroadcasts)
    .leftJoin(telegramVideos, eq(socialBroadcasts.videoId, telegramVideos.id))
    .orderBy(desc(socialBroadcasts.createdAt))
    .limit(100);
  return rows;
}

export async function retryBroadcast(id: number): Promise<void> {
  await db.update(socialBroadcasts)
    .set({ status: "pending", errorMessage: null, agentNote: `Retry requested at ${new Date().toISOString()}` })
    .where(eq(socialBroadcasts.id, id));
}

export async function skipBroadcast(id: number): Promise<void> {
  await db.update(socialBroadcasts)
    .set({ status: "skipped" })
    .where(eq(socialBroadcasts.id, id));
}

// ── Start the agent loop ──────────────────────────────────────────────────────

export function startSocialBroadcastAgent(): void {
  _state.status    = "ACTIVE";
  _state.lastAction = "Agent started — monitoring broadcast queue";

  const tick = async () => {
    try {
      await broadcastTick();
      _state.cycleCount++;
    } catch (err: any) {
      _state.status    = "ERROR";
      _state.lastError = err.message;
      _state.errorCount++;
      console.error("[BROADCAST_AGENT] Tick error:", err.message);
    }
    setTimeout(tick, 30_000); // every 30 seconds
  };

  // First tick after 15s stagger
  setTimeout(tick, 15_000);
  console.log("[BROADCAST_AGENT] Social Broadcast Agent started — Ψ(72,18,H)");
}
