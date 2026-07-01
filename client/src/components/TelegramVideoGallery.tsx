import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Clock, MessageSquare, Tv, ChevronRight, X, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const TG_BOT_URL = "https://t.me/Nexuswnspbot";
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

function isLargeFile(video: TelegramVideo): boolean {
  return !!video.fileSize && video.fileSize > TG_SIZE_LIMIT;
}

function telegramUrl(video: TelegramVideo): string {
  if (video.channelUsername && video.channelPostId) {
    return `https://t.me/${video.channelUsername}/${video.channelPostId}`;
  }
  if (video.channelUsername && video.messageId) {
    return `https://t.me/${video.channelUsername}/${video.messageId}`;
  }
  return TG_BOT_URL;
}

function VideoModal({ video, onClose }: { video: TelegramVideo; onClose: () => void }) {
  const isChannel = video.source === "channel" && video.channelUsername && video.channelPostId;
  const large = isLargeFile(video);
  const tgUrl = telegramUrl(video);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0a0a14] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {isChannel ? <Tv size={12} className="text-blue-400" /> : <MessageSquare size={12} className="text-green-400" />}
            <span>{isChannel ? `@${video.channelUsername}` : "Telegram Bot Upload"}</span>
            {video.duration ? <><Clock size={10} /><span>{fmtDuration(video.duration)}</span></> : null}
            {video.fileSize ? <span className="text-gray-600">{fmtSize(video.fileSize)}</span> : null}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        {isChannel ? (
          <div className="p-0" style={{ height: 480 }}>
            <iframe
              src={`https://t.me/${video.channelUsername}/${video.channelPostId}?embed=1&mode=tme`}
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        ) : large ? (
          /* Large file — Telegram bot API cap exceeded, redirect to Telegram */
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-5 bg-black">
            {video.thumbFileId && (
              <div className="relative w-full max-w-sm rounded-xl overflow-hidden">
                <img
                  src={`/api/telegram/video/${encodeURIComponent(video.thumbFileId)}/thumb`}
                  alt={video.caption || "Video"}
                  className="w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/80 flex items-center justify-center">
                    <Play size={24} className="text-white ml-1" />
                  </div>
                </div>
              </div>
            )}
            <div className="text-center space-y-1">
              <p className="text-white/70 text-sm">This video is {fmtSize(video.fileSize)} — too large to stream directly.</p>
              <p className="text-gray-600 text-xs">Watch it on Telegram instead.</p>
            </div>
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
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
            autoPlay
            src={`/api/telegram/video/${encodeURIComponent(video.fileId)}/stream`}
          />
        )}

        {video.caption && (
          <div className="px-4 py-3 text-sm text-gray-300 leading-relaxed border-t border-white/10">
            {video.caption}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video, onClick }: { video: TelegramVideo; onClick: () => void }) {
  const isChannel = video.source === "channel" && video.channelUsername && video.channelPostId;
  const large = isLargeFile(video);
  const tgHref = telegramUrl(video);

  return (
    <a
      href={tgHref}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`telegram-video-card-${video.id}`}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className="group relative w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] transition-all overflow-hidden block"
    >
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {video.thumbFileId ? (
          <img
            src={`/api/telegram/video/${encodeURIComponent(video.thumbFileId)}/thumb`}
            alt={video.caption || "Video"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/30 to-violet-900/30">
            <Tv size={32} className="text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          {large ? (
            /* Large file overlay — shows Telegram icon to signal redirect */
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-blue-500/80 border border-blue-400/40 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <ExternalLink size={16} className="text-white" />
              </div>
              <span className="text-[9px] font-mono text-white/60 bg-black/60 px-2 py-0.5 rounded-full">Watch on Telegram</span>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center group-hover:bg-black/80 transition-colors">
              <Play size={18} className="text-white ml-0.5" />
            </div>
          )}
        </div>

        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5 text-[10px] font-mono text-white">
            {fmtDuration(video.duration)}
          </div>
        )}

        {/* File size badge for large files */}
        {large && video.fileSize && (
          <div className="absolute bottom-2 left-2 bg-blue-600/80 rounded px-1.5 py-0.5 text-[9px] font-mono text-white">
            {fmtSize(video.fileSize)}
          </div>
        )}

        <div className="absolute top-2 left-2">
          {isChannel
            ? <span className="bg-blue-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Channel</span>
            : <span className="bg-green-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Bot</span>
          }
        </div>
      </div>

      {video.caption && (
        <div className="px-3 py-2 text-xs text-gray-400 leading-snug line-clamp-2 group-hover:text-gray-300 transition-colors">
          {video.caption}
        </div>
      )}
      {!video.caption && (
        <div className="px-3 py-2 text-xs text-gray-600 italic">
          {isChannel ? `@${video.channelUsername} · Post #${video.channelPostId}` : "No caption"}
        </div>
      )}
    </a>
  );
}

interface TelegramVideoGalleryProps {
  compact?: boolean;
  maxVideos?: number;
  showLink?: boolean;
  accentColor?: string;
}

export default function TelegramVideoGallery({
  compact = false,
  maxVideos = 6,
  showLink = true,
  accentColor = "#3b82f6",
}: TelegramVideoGalleryProps) {
  const [activeVideo, setActiveVideo] = useState<TelegramVideo | null>(null);

  const { data, isLoading } = useQuery<{ videos: TelegramVideo[] }>({
    queryKey: ["/api/telegram/videos"],
    retry: false,
  });

  const videos = (data?.videos || []).slice(0, maxVideos);

  if (isLoading) {
    return (
      <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {[...Array(compact ? 3 : 6)].map((_, i) => (
          <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="text-center py-8 text-gray-600 text-xs font-mono">
        <Tv size={24} className="mx-auto mb-2 opacity-30" />
        <p>No videos yet — send a video to <a href={TG_BOT_URL} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">@Nexuswnspbot</a> to publish it here.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {videos.map(v => (
          <VideoCard key={v.id} video={v} onClick={() => setActiveVideo(v)} />
        ))}
      </div>

      {showLink && (data?.videos?.length || 0) > maxVideos && (
        <div className="mt-4 text-center">
          <Link href="/videos">
            <span
              className="inline-flex items-center gap-1 text-xs font-mono hover:opacity-80 transition-opacity cursor-pointer"
              style={{ color: accentColor }}
            >
              View all {data?.videos?.length} videos <ChevronRight size={12} />
            </span>
          </Link>
        </div>
      )}

      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  );
}
