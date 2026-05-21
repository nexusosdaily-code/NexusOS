import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Play, Clock, MessageSquare, Tv, ChevronRight, X, ExternalLink } from "lucide-react";
import { Link } from "wouter";

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

function VideoModal({ video, onClose }: { video: TelegramVideo; onClose: () => void }) {
  const isChannel = video.source === "channel" && video.channelUsername && video.channelPostId;
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
  return (
    <button
      data-testid={`telegram-video-card-${video.id}`}
      onClick={onClick}
      className="group relative w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06] transition-all overflow-hidden"
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
          <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center group-hover:bg-black/80 transition-colors">
            <Play size={18} className="text-white ml-0.5" />
          </div>
        </div>
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5 text-[10px] font-mono text-white">
            {fmtDuration(video.duration)}
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
    </button>
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
        <p>No videos yet — send a video to the NexusOS bot to publish it here.</p>
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
