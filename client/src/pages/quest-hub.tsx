import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy, CheckCircle2, Circle, ExternalLink, Twitter, MessageCircle,
  Zap, Share2, Eye, Gift, Star, Clock, ChevronRight, Copy, ArrowRight,
} from "lucide-react";

const QUEST = {
  title: "NEXUS•WAVELENGTH Genesis Quest",
  subtitle: "Complete all tasks to qualify for the NXWV reward pool",
  reward: "10,000,000 NXWV",
  rewardSats: "10M NXWV from the Rune reserve",
  endDate: "June 30, 2026",
  winnersCount: 21,
  coinsniper: "https://coinsniper.net/coin/91963",
};

interface Task {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  actionUrl?: string;
  actionLabel: string;
  points: number;
  verify?: () => boolean;
}

const TASKS: Task[] = [
  {
    id: "twitter_follow",
    icon: <Twitter className="w-5 h-5 text-sky-400" />,
    title: "Follow NexusOS on X",
    description: "Follow @NexusOSWNSP on X (Twitter) to stay updated on physics OS development.",
    action: "follow",
    actionUrl: "https://x.com/NexusOSWNSP",
    actionLabel: "Follow on X",
    points: 100,
  },
  {
    id: "telegram_join",
    icon: <MessageCircle className="w-5 h-5 text-blue-400" />,
    title: "Join the Telegram",
    description: "Join the NexusOS Telegram channel — official announcements, rune updates, physics discussions.",
    action: "join",
    actionUrl: "https://t.me/NexusOSWNSP",
    actionLabel: "Join Telegram",
    points: 100,
  },
  {
    id: "coinsniper_vote",
    icon: <Star className="w-5 h-5 text-yellow-400" />,
    title: "Vote on Coinsniper",
    description: "Visit the NXWV listing on Coinsniper and cast your vote. Boosts our ranking daily.",
    action: "vote",
    actionUrl: "https://coinsniper.net/coin/91963",
    actionLabel: "Vote on Coinsniper",
    points: 150,
  },
  {
    id: "stake_sats",
    icon: <Zap className="w-5 h-5 text-orange-400" />,
    title: "Stake on NexusOS",
    description: "Stake any amount of sats on wnsp.io to earn NXT yield and auto-mint WNUSD stablecoin.",
    action: "stake",
    actionUrl: "/stake-earn",
    actionLabel: "Stake Sats →",
    points: 200,
  },
  {
    id: "share_x",
    icon: <Share2 className="w-5 h-5 text-green-400" />,
    title: "Share NXWV on X",
    description: 'Post about NEXUS•WAVELENGTH on X with the hashtag #NexusOS and tag @NexusOSWNSP.',
    action: "share",
    actionUrl: "https://x.com/intent/tweet?text=Just%20discovered%20%40NexusOSWNSP%20%E2%80%94%20a%20physics-based%20OS%20for%20photonic%20computing.%20Not%20a%20blockchain%2C%20an%20actual%20physics%20engine.%0A%0ANXWV%20Rune%20%F0%9F%9F%A0%20952590%3A379%20%7C%2021T%20supply%20%7C%20fully%20sealed%20June%202026%0A%0Ahttps%3A%2F%2Fwnsp.io%20%23NexusOS%20%23Bitcoin%20%23Runes",
    actionLabel: "Post on X",
    points: 150,
  },
  {
    id: "find_wavelength",
    icon: <Eye className="w-5 h-5 text-purple-400" />,
    title: "Find the Hidden Wavelength",
    description: "Explore wnsp.io and find the secret wavelength hidden in the physics engine. Hint: start at the Compression Explorer.",
    action: "explore",
    actionUrl: "/compression-explorer",
    actionLabel: "Open Explorer →",
    points: 300,
  },
];

const STORAGE_KEY = "nexusos_quest_progress";

function loadProgress(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(p: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function QuestHubPage() {
  const { toast } = useToast();
  const [completed, setCompleted] = useState<Record<string, boolean>>(loadProgress);
  const [submitted, setSubmitted] = useState(false);
  const [xHandle, setXHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalPoints = TASKS.reduce((s, t) => s + t.points, 0);
  const earnedPoints = TASKS.filter(t => completed[t.id]).reduce((s, t) => s + t.points, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const pct = Math.round((earnedPoints / totalPoints) * 100);
  const allDone = completedCount === TASKS.length;

  useEffect(() => { saveProgress(completed); }, [completed]);

  function markDone(id: string) {
    setCompleted(prev => ({ ...prev, [id]: true }));
    toast({ title: "Task marked complete ✓", description: "Points added to your entry." });
  }

  function openAndMark(task: Task) {
    if (task.actionUrl?.startsWith("http")) {
      window.open(task.actionUrl, "_blank", "noopener");
    }
    setTimeout(() => markDone(task.id), 1200);
  }

  async function handleSubmit() {
    if (!xHandle.trim()) {
      toast({ title: "X handle required", description: "Enter your @handle so we can verify and DM you if you win.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xHandle: xHandle.trim(), completedTasks: Object.keys(completed).filter(k => completed[k]), points: earnedPoints }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast({ title: "Entry submitted! 🎉", description: "You're in the draw. Winners announced June 30." });
      } else {
        const d = await res.json().catch(() => ({}));
        toast({ title: "Submit failed", description: d.error || "Try again shortly.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Submit failed", description: "Network error — try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function copyShareText() {
    const text = `🟠 NEXUS•WAVELENGTH (NXWV) Genesis Quest\n\nComplete 6 tasks → enter the draw for 10M NXWV\n\nRune ID: 952590:379 | 21T supply | sealed June 2026\nPlatform: https://wnsp.io/quest\nCoinsniper: https://coinsniper.net/coin/91963\n\n#NexusOS #Bitcoin #Runes`;
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: "Copied!", description: "Paste it anywhere to spread the word." })
    );
  }

  return (
    <div className="min-h-screen bg-black text-white" data-testid="quest-hub-page">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-orange-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/40 via-black to-purple-950/20" />
        <div className="relative max-w-3xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm text-orange-300 mb-5">
            <Trophy className="w-4 h-4" /> Genesis Quest · Ends {QUEST.endDate}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
            {QUEST.title}
          </h1>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">{QUEST.subtitle}</p>

          {/* Reward card */}
          <div className="inline-flex flex-col items-center bg-orange-500/10 border border-orange-500/40 rounded-2xl px-8 py-4 mb-2">
            <div className="text-xs text-orange-400 uppercase tracking-widest mb-1">Reward Pool</div>
            <div className="text-3xl font-bold text-orange-300">{QUEST.reward}</div>
            <div className="text-xs text-gray-500 mt-1">Split between {QUEST.winnersCount} randomly selected winners</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Progress bar */}
        <Card className="bg-gray-900/60 border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-400">Your progress</div>
            <div className="text-sm font-semibold text-orange-300">{earnedPoints} / {totalPoints} pts</div>
          </div>
          <Progress value={pct} className="h-2 bg-gray-800 mb-2" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{completedCount}/{TASKS.length} tasks completed</span>
            <span>{pct}% complete</span>
          </div>
        </Card>

        {/* Task list */}
        <div className="space-y-3">
          {TASKS.map((task, i) => {
            const done = !!completed[task.id];
            return (
              <Card
                key={task.id}
                data-testid={`quest-task-${task.id}`}
                className={`border p-4 transition-all ${done ? "bg-green-950/20 border-green-700/40" : "bg-gray-900/60 border-gray-800 hover:border-gray-700"}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {done
                      ? <CheckCircle2 className="w-6 h-6 text-green-400" />
                      : <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center text-xs text-gray-600 font-bold">{i + 1}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.icon}
                      <span className={`font-semibold ${done ? "text-green-300" : "text-white"}`}>{task.title}</span>
                      <Badge variant="outline" className="text-xs border-orange-500/40 text-orange-400 ml-auto">+{task.points} pts</Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                    {!done && (
                      <div className="flex items-center gap-2 mt-3">
                        {task.actionUrl?.startsWith("http") ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:text-white hover:border-orange-500/60 text-xs gap-1.5"
                            onClick={() => openAndMark(task)}
                            data-testid={`quest-action-${task.id}`}
                          >
                            {task.actionLabel} <ExternalLink className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Link href={task.actionUrl ?? "#"}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-700 text-gray-300 hover:text-white hover:border-orange-500/60 text-xs gap-1.5"
                              onClick={() => setTimeout(() => markDone(task.id), 2000)}
                              data-testid={`quest-action-${task.id}`}
                            >
                              {task.actionLabel} <ChevronRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-gray-500 hover:text-gray-300"
                          onClick={() => markDone(task.id)}
                          data-testid={`quest-mark-done-${task.id}`}
                        >
                          Already done
                        </Button>
                      </div>
                    )}
                    {done && (
                      <div className="text-xs text-green-500 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Submit entry */}
        <Card className={`border p-6 transition-all ${allDone ? "bg-orange-950/20 border-orange-500/40" : "bg-gray-900/40 border-gray-800"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5 text-orange-400" />
            <h2 className="font-semibold text-white">Submit Your Entry</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            {allDone
              ? "All tasks complete! Submit below to enter the draw."
              : `Complete all ${TASKS.length} tasks to qualify. You have ${completedCount}/${TASKS.length}.`}
          </p>

          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <div className="font-semibold text-green-300 text-lg">You're in the draw!</div>
              <div className="text-sm text-gray-400 mt-1">Winners announced June 30, 2026 on X and Telegram.</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Your X (Twitter) handle</label>
                <input
                  type="text"
                  placeholder="@yourhandle"
                  value={xHandle}
                  onChange={e => setXHandle(e.target.value)}
                  disabled={!allDone}
                  data-testid="quest-x-handle-input"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 disabled:opacity-40"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!allDone || submitting}
                data-testid="quest-submit-btn"
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 gap-2"
              >
                {submitting ? "Submitting…" : <>Submit Entry <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </div>
          )}
        </Card>

        {/* Spread the word */}
        <Card className="bg-gray-900/40 border-gray-800 p-5">
          <h3 className="font-semibold text-gray-300 mb-1 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-400" /> Spread the Word
          </h3>
          <p className="text-sm text-gray-500 mb-3">The more people who join, the bigger the movement. Copy the share text below.</p>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:text-white gap-2"
            onClick={copyShareText}
            data-testid="quest-copy-share"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Share Text
          </Button>
        </Card>

        {/* Info strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {[
            { label: "Rune ID", value: "952590:379" },
            { label: "Supply", value: "21T NXWV" },
            { label: "Mints", value: "1,000/1,000 sealed" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900/40 border border-gray-800 rounded-xl py-3 px-4">
              <div className="text-xs text-gray-500 mb-0.5">{label}</div>
              <div className="text-sm font-semibold text-orange-300">{value}</div>
            </div>
          ))}
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 justify-center pb-4">
          <a href={QUEST.coinsniper} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-1.5 text-xs">
              Coinsniper <ExternalLink className="w-3 h-3" />
            </Button>
          </a>
          <Link href="/stake-earn">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-1.5 text-xs">
              Stake & Earn <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
          <Link href="/rune-pipeline">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-1.5 text-xs">
              NXT→NXWV Pipeline <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
          <Link href="/hub">
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white gap-1.5 text-xs">
              Hub <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
