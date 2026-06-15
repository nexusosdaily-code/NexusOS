/**
 * Post Scheduler
 * ==============
 * Checks every 60 seconds for pending scheduled posts whose scheduledAt
 * has passed and fires them via fireEventBroadcast().
 */

import { db } from "./db";
import { scheduledPosts } from "../shared/schema";
import { and, eq, lte } from "drizzle-orm";
import { fireEventBroadcast } from "./nxt-campaign-agent";

const TAG = "[PostScheduler]";
let _timer: ReturnType<typeof setInterval> | null = null;

export async function runSchedulerTick() {
  try {
    const now = new Date();
    const due = await db
      .select()
      .from(scheduledPosts)
      .where(and(eq(scheduledPosts.status, "pending"), lte(scheduledPosts.scheduledAt, now)));

    if (due.length === 0) return;

    console.log(`${TAG} ${due.length} post(s) due — firing`);

    for (const post of due) {
      // Mark as sending immediately to avoid double-fire
      await db
        .update(scheduledPosts)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(scheduledPosts.id, post.id));

      try {
        const result = await fireEventBroadcast({
          emoji:    post.emoji,
          title:    post.title,
          body:     post.body,
          hashtags: post.hashtags,
        });

        const anyOk = result.tg?.ok || result.nostr?.ok || result.discord?.ok;
        await db
          .update(scheduledPosts)
          .set({ status: anyOk ? "sent" : "failed", result })
          .where(eq(scheduledPosts.id, post.id));

        console.log(`${TAG} Post "${post.title}" — tg:${result.tg?.ok} nostr:${result.nostr?.ok} discord:${result.discord?.ok}`);
      } catch (err: any) {
        await db
          .update(scheduledPosts)
          .set({ status: "failed", result: { error: err.message } })
          .where(eq(scheduledPosts.id, post.id));
        console.error(`${TAG} Post "${post.title}" failed:`, err.message);
      }
    }
  } catch (err: any) {
    console.error(`${TAG} Tick error:`, err.message);
  }
}

export function startPostScheduler() {
  if (_timer) return;
  _timer = setInterval(runSchedulerTick, 60_000);
  console.log(`${TAG} Started — checking every 60s`);
  // Run immediately on start to pick up anything missed during downtime
  runSchedulerTick().catch(() => {});
}

export function stopPostScheduler() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
