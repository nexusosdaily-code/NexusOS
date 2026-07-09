import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, ExternalLink, MessageSquare, Tv } from "lucide-react";

const TG_SIZE_LIMIT = 20 * 1024 * 1024; // 20 MB — Telegram bot download cap

interface TelegramVideo {
  id: number;
  fileId: string;
  fileUniqueId: string;
  caption: string | null;
  mimeType: string | null;
  fileSize: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  thumbFileId: string | null;
  messageId: number | null;
  chatId: string | null;
  source: string;
  channelUsername: string | null;
  channelPostId: number | null;
  isPublished: boolean;
  createdAt: string;
}

function fmtDuration(sec: number | null): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000).toFixed(0)} KB`;
}

function telegramUrl(video: TelegramVideo): string {
  if (video.channelUsername && video.channelPostId) {
    return `https://t.me/${video.channelUsername}/${video.channelPostId}`;
  }
  if (video.channelUsername && video.messageId) {
    return `https://t.me/${video.channelUsername}/${video.messageId}`;
  }
  return "https://t.me/nexusosdaily";
}

export default function VideoDetailPage() {
  const params = useParams<{ id: string }>();
  const videoId = Number(params.id);

  const { data, isLoading } = useQuery<{ videos: TelegramVideo[] }>({
    queryKey: ["/api/telegram/videos"],
    retry: false,
  });

  const video = (data?.videos || []).find(v => v.id === videoId);

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <nav className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/80 backdrop-blur">
        <Link href="/wnsp">
          <span className="text-lg font-bold tracking-widest">NEXUS<span className="text-green-400">OS</span></span>
        </Link>
        <Link href="/videos" data-testid="link-back-videos">
          <span className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft size={12} />
            All Videos
          </span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {isLoading && (
          <div className="aspect-video rounded-xl bg-white/5 animate-pulse" />
        )}

        {!isLoading && !video && (
          <div className="text-center py-16 text-gray-500" data-testid="text-video-not-found">
            <Tv size={32} className="mx-auto mb-3 opacity-30" />
            <p>This video could not be found.</p>
            <Link href="/videos">
              <span className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 cursor-pointer">Back to all videos</span>
            </Link>
          </div>
        )}

        {video && (
          <VideoDetail video={video} />
        )}
      </div>
    </div>
  );
}

function VideoDetail({ video }: { video: TelegramVideo }) {
  const isChannel = video.source === "channel" && video.channelUsername && video.channelPostId;
  const large = !!video.fileSize && video.fileSize > TG_SIZE_LIMIT;
  const tgUrl = telegramUrl(video);
  const label = video.caption || `NexusOS Video #${video.id}`;
  const uploadDate = new Date(video.createdAt).toISOString().split("T")[0];

  return (
    <article data-testid={`article-video-detail-${video.id}`}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        {isChannel ? <Tv size={12} className="text-blue-400" /> : <MessageSquare size={12} className="text-green-400" />}
        <span>{isChannel ? `@${video.channelUsername}` : "Telegram Bot Upload"}</span>
        <time dateTime={uploadDate}>{uploadDate}</time>
        {video.duration ? <><Clock size={10} /><span>{fmtDuration(video.duration)}</span></> : null}
        {video.fileSize ? <span className="text-gray-600">{fmtSize(video.fileSize)}</span> : null}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0a0a14] overflow-hidden">
        {isChannel ? (
          <div style={{ height: 480 }}>
            <iframe
              title={label}
              src={`https://t.me/${video.channelUsername}/${video.channelPostId}?embed=1&mode=tme`}
              className="w-full h-full border-0"
              allowFullScreen
              data-testid="iframe-video-player"
            />
          </div>
        ) : large ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-5 bg-black">
            {video.thumbFileId && (
              <img
                src={`/api/telegram/video/${encodeURIComponent(video.thumbFileId)}/thumb`}
                alt={label}
                className="w-full max-w-sm rounded-xl object-cover opacity-60"
              />
            )}
            <div className="text-center space-y-1">
              <p className="text-white/70 text-sm">This video is {fmtSize(video.fileSize)} — too large to stream directly.</p>
              <p className="text-gray-600 text-xs">Watch it on Telegram instead.</p>
            </div>
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-watch-telegram"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 transition-colors text-white text-sm font-semibold"
            >
              <ExternalLink size={14} />
              Watch on Telegram
            </a>
          </div>
        ) : (
          <video
            className="w-full max-h-[60vh] bg-black"
            controls
            src={`/api/telegram/video/${encodeURIComponent(video.fileId)}/stream`}
            data-testid="video-player"
          />
        )}
      </div>

      <h1 className="text-2xl font-bold mt-6 mb-2" data-testid="text-video-title">{label}</h1>

      {video.caption && (
        <p className="text-sm text-gray-400 leading-relaxed" data-testid="text-video-caption">{video.caption}</p>
      )}

      <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <a
          href={tgUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-telegram-source"
          className="flex items-center gap-1.5 hover:text-blue-400 transition-colors"
        >
          <ExternalLink size={12} />
          View original on Telegram
        </a>
        <Link href="/videos">
          <span className="hover:text-white cursor-pointer" data-testid="link-all-videos">All Videos</span>
        </Link>
      </div>
    </article>
  );
}
