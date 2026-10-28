/**
 * check-channel-count.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans campaign/bot content files for the outdated channel count "25,600"
 * (and its unformatted variant "25600") and fails if either is found.
 *
 * Why: the channel count was bulk-updated from 25,600 → 51,200 in campaign
 * slots and Telegram bot responses.  Without a CI guard a future edit can
 * silently re-introduce the old figure and ship wrong physics to users.
 *
 * Files checked:
 *   - server/telegram-bot.ts
 *   - server/nxt-campaign-agent.ts
 *   - server/whitepaper-content.ts
 *   - server/routes.ts
 *
 * Exits non-zero with a file:line report if any violation is found.
 *
 * Runnable standalone via `npm run check:channel-count`.
 * Also invoked by `npm run test:all`.
 */

import { readFile } from "fs/promises";
import path from "path";

/** The outdated formatted string that must not appear. */
export const OUTDATED_FORMATTED = "25,600";

/** The outdated bare integer string that must not appear. */
export const OUTDATED_BARE = "25600";

/** Files (relative to project root) that must not contain the old count. */
export const TARGET_FILES: ReadonlyArray<string> = [
  "server/telegram-bot.ts",
  "server/nxt-campaign-agent.ts",
  "server/whitepaper-content.ts",
  "server/routes.ts",
];

export interface Violation {
  file: string;
  line: number;
  text: string;
  match: string;
}

/**
 * Scan TARGET_FILES for occurrences of the outdated channel counts.
 *
 * Returns an array of violations — callers decide how to surface them.
 * Throws on file-system errors (missing/unreadable files).
 */
export async function checkChannelCount(
  projectRoot: string = path.resolve("."),
): Promise<Violation[]> {
  const violations: Violation[] = [];

  for (const relPath of TARGET_FILES) {
    const filePath = path.join(projectRoot, relPath);
    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      throw new Error(
        `[check-channel-count] Cannot read file: ${filePath}`,
      );
    }

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      if (raw.includes(OUTDATED_FORMATTED)) {
        violations.push({
          file: relPath,
          line: i + 1,
          text: raw.trimEnd(),
          match: OUTDATED_FORMATTED,
        });
        continue; // no double-report the same line
      }

      if (raw.includes(OUTDATED_BARE)) {
        violations.push({
          file: relPath,
          line: i + 1,
          text: raw.trimEnd(),
          match: OUTDATED_BARE,
        });
      }
    }
  }

  return violations;
}

// ─── Standalone entry (npm run check:channel-count) ──────────────────────────

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(import.meta.url.replace("file://", ""));

if (isMain) {
  checkChannelCount()
    .then((violations) => {
      if (violations.length === 0) {
        console.log(
          `[check-channel-count] ✓ Outdated channel count not found in any target file.`,
        );
        return;
      }

      console.error(
        `[check-channel-count] ✗ Outdated channel count "${OUTDATED_FORMATTED}" ` +
          `(or "${OUTDATED_BARE}") found — the correct value is 51,200:\n`,
      );
      for (const v of violations) {
        console.error(`  ${v.file}:${v.line}  ${v.text}`);
        console.error(`    ^ matched: "${v.match}"`);
      }
      console.error(
        `\nFix: replace "${OUTDATED_FORMATTED}" / "${OUTDATED_BARE}" with "51,200" / "51200".`,
      );
      process.exit(1);
    })
    .catch((err: Error) => {
      console.error(err.message);
      process.exit(1);
    });
}
