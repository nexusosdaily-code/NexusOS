import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tv, Send, ExternalLink, RefreshCw, CheckCircle, AlertCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import TelegramVideoGallery from "@/components/TelegramVideoGallery";
import { useAuth } from "@/hooks/use-auth";

function SetupPanel() {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);

  const setup = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/telegram/setup-webhook", { method: "POST" });
      return r.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const { data: info, refetch } = useQuery({
    queryKey: ["/api/telegram/webhook-info"],
    enabled: !!user,
    retry: false,
  });

  if (!user) return null;

  const webhookUrl = (info as any)?.result?.url;
  const isConnected = !!webhookUrl;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Bot size={18} className="text-blue-400" />
        <div>
          <div className="text-sm font-bold text-white">Telegram Bot Setup</div>
          <div className="text-xs text-gray-500">Connect your Telegram bot to automatically publish videos here</div>
        </div>
        {isConnected
          ? <span className="ml-auto flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Connected</span>
          : <span className="ml-auto flex items-center gap-1 text-xs text-gray-500"><AlertCircle size={12} /> Not connected</span>
        }
      </div>

      <div className="space-y-3 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
          <span>Open Telegram and message <a href="https://t.me/Nexuswnspbot" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@Nexuswnspbot</a></span>
        </div>
        <div className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
          <span>Click the button below to register this app as the webhook receiver — this tells Telegram where to send new videos</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
          <span>Send any video to your bot or post a video in a channel where the bot is admin — it will appear in the gallery instantly</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">+</span>
          <span>For <strong className="text-white">channel embeds</strong>: add your bot as an admin to your Telegram channel. Videos posted in the channel will also be collected.</span>
        </div>
      </div>

      {webhookUrl && (
        <div className="mt-4 p-2 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-gray-500 break-all">
          Webhook: {webhookUrl}
        </div>
      )}

      {result && (
        <div className={`mt-3 p-3 rounded-lg text-xs font-mono ${result.telegram?.ok ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          {result.telegram?.ok
            ? `✓ Webhook set: ${result.webhookUrl}`
            : `Error: ${JSON.stringify(result)}`
          }
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          className="text-xs"
          onClick={() => setup.mutate()}
          disabled={setup.isPending}
        >
          <Send size={12} className="mr-1.5" />
          {setup.isPending ? "Setting up…" : "Register Webhook"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-white/20 text-white hover:bg-white/10"
          onClick={() => refetch()}
        >
          <RefreshCw size={12} className="mr-1.5" />
          Check Status
        </Button>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const { data } = useQuery<{ videos: any[] }>({
    queryKey: ["/api/telegram/videos"],
    retry: false,
  });

  const count = data?.videos?.length ?? 0;

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/80 backdrop-blur">
        <Link href="/wnsp">
          <span className="text-lg font-bold tracking-widest">NEXUS<span className="text-green-400">OS</span></span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Tv size={14} className="text-blue-400" />
          <span>Telegram Video Feed</span>
        </div>
        <a
          href="https://t.me/nexusosdaily"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ExternalLink size={12} />
          Telegram Channel
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="text-[10px] font-mono uppercase tracking-widest text-gray-600 mb-2">Live Video Feed</div>
          <h1 className="text-3xl font-bold mb-3">NexusOS Videos</h1>
          <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
            Every video uploaded to the NexusOS Telegram bot or posted in the official channel
            appears here automatically. No manual publishing. Physics-native.
          </p>
          {count > 0 && (
            <div className="mt-3 text-xs text-gray-600">
              {count} video{count !== 1 ? "s" : ""} published
            </div>
          )}
        </div>

        <SetupPanel />

        <TelegramVideoGallery compact={false} maxVideos={100} showLink={false} />

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap gap-6 text-xs text-gray-700">
          <Link href="/crowdfund"><span className="hover:text-white cursor-pointer">Crowdfund</span></Link>
          <Link href="/campaign"><span className="hover:text-white cursor-pointer">Campaign</span></Link>
          <Link href="/evidence"><span className="hover:text-white cursor-pointer">Evidence</span></Link>
          <Link href="/wnsp-paper"><span className="hover:text-white cursor-pointer">WNSP Paper</span></Link>
          <a href="https://t.me/nexusosdaily" target="_blank" rel="noopener noreferrer" className="hover:text-white">Telegram Channel</a>
        </div>
      </div>
    </div>
  );
}
