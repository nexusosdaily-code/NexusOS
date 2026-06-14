import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Copy, MessageSquare, ArrowLeft, Waves, Radio, Users,
  Sparkles, ChevronRight,
} from "lucide-react";

function authFetch(url: string) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

const BAND_COLOR: Record<string, { color: string; bg: string }> = {
  SYSTEM: { color: "#8b00ff", bg: "rgba(139,0,255,0.15)" },
  KERNEL: { color: "#2563eb", bg: "rgba(37,99,235,0.15)" },
  USER:   { color: "#16a34a", bg: "rgba(22,163,74,0.15)" },
  GUEST:  { color: "#d97706", bg: "rgba(217,119,6,0.15)" },
};

function nmToHue(nm: number) {
  return Math.round(((nm - 380) / 400) * 270);
}

function SpectralDot({ nm }: { nm: number }) {
  const hue = nmToHue(nm);
  return (
    <div className="w-3 h-3 rounded-full flex-shrink-0"
      style={{ background: `hsl(${hue},80%,55%)`, boxShadow: `0 0 6px hsl(${hue},80%,55%)` }} />
  );
}

interface Channel {
  wdm: number; oam: number; pol: string;
  nm: string; psi: string; band: string;
}
interface Bond {
  psiChannel: string | null; wnspAddress: string | null;
  wavelength: string | null; band: string;
}
interface Entry {
  friendshipId: string;
  friend: { id: string; username: string } & Channel;
  bond: Bond;
  acceptedAt: string | null;
}
interface PhonebookData {
  myChannel: Channel;
  entries: Entry[];
  total: number;
}

export default function PhonebookPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const token = localStorage.getItem("auth_token");

  const { data, isLoading, error } = useQuery<PhonebookData>({
    queryKey: ["/api/phonebook"],
    queryFn: async () => {
      const res = await authFetch("/api/phonebook");
      if (!res.ok) throw new Error("Failed to load phonebook");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `Copied ${label}`, duration: 2000 });
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Radio className="w-10 h-10 text-purple-500 mx-auto" />
          <p className="text-slate-400 text-sm">Log in to view your wave channel address book</p>
          <Link href="/auth"><Button className="bg-purple-700 hover:bg-purple-600">Log In</Button></Link>
        </div>
      </div>
    );
  }

  const entries = (data?.entries ?? []).filter(e =>
    !search || e.friend.username.toLowerCase().includes(search.toLowerCase()) ||
    (e.bond.psiChannel ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const my = data?.myChannel;
  const myBandStyle = my ? (BAND_COLOR[my.band] ?? BAND_COLOR.GUEST) : BAND_COLOR.GUEST;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/hub">
            <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Radio className="w-4 h-4 text-purple-400" />
            <h1 className="text-sm font-bold text-white">Wave Channel Address Book</h1>
            {data && (
              <span className="text-xs text-slate-500 font-mono">
                {data.total} established {data.total === 1 ? "link" : "links"}
              </span>
            )}
          </div>
          <Link href="/inbox">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              Messages
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* My spectral address card */}
        {my && (
          <div className="rounded-xl border p-4 space-y-3"
            style={{ borderColor: `${myBandStyle.color}40`, background: `${myBandStyle.bg}` }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Your Spectral Address
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SpectralDot nm={parseFloat(my.nm)} />
              <code className="text-lg font-bold font-mono" style={{ color: myBandStyle.color }}>
                {my.psi}
              </code>
              <span className="text-slate-400 text-sm font-mono">·  λ {parseFloat(my.nm).toFixed(1)} nm</span>
              <span className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ background: myBandStyle.bg, color: myBandStyle.color, border: `1px solid ${myBandStyle.color}50` }}>
                {my.band}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              When you accept a friend request, NexusOS derives a permanent bond channel from your combined wavelengths — your shared WNSP address.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or Ψ channel…"
            className="bg-slate-900 border-slate-700 text-slate-200 text-sm pl-9"
            data-testid="input-phonebook-search"
          />
        </div>

        {/* Loading / empty */}
        {isLoading && (
          <div className="text-center py-12 text-slate-500 text-sm">
            <Waves className="w-8 h-8 mx-auto mb-3 animate-pulse text-purple-700" />
            Loading wave channels…
          </div>
        )}
        {error && (
          <div className="text-center py-12 text-red-400 text-sm">Failed to load address book</div>
        )}
        {!isLoading && !error && entries.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <Users className="w-10 h-10 text-slate-700 mx-auto" />
            <p className="text-slate-500 text-sm">
              {search ? "No contacts match your search." : "No established wave channels yet."}
            </p>
            {!search && (
              <Link href="/inbox">
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                  Add a contact in Inbox
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Contact cards */}
        <div className="space-y-3">
          {entries.map(e => {
            const friendNm = parseFloat(e.friend.nm);
            const bondNm = parseFloat(e.bond.wavelength ?? e.friend.nm);
            const friendStyle = BAND_COLOR[e.friend.band] ?? BAND_COLOR.GUEST;
            const bondStyle = BAND_COLOR[e.bond.band] ?? BAND_COLOR.GUEST;
            const bondHue = nmToHue(bondNm);

            return (
              <div key={e.friendshipId}
                data-testid={`phonebook-entry-${e.friendshipId}`}
                className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden hover:border-slate-700 transition-colors">

                {/* Spectral bond colour bar */}
                <div className="h-0.5 w-full"
                  style={{ background: `linear-gradient(to right, hsl(${nmToHue(friendNm)},75%,55%), hsl(${bondHue},80%,55%), hsl(${nmToHue(friendNm)},75%,55%))` }} />

                <div className="p-4 space-y-4">
                  {/* Friend header */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ background: friendStyle.bg, color: friendStyle.color, border: `1px solid ${friendStyle.color}50` }}>
                      {e.friend.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">{e.friend.username}</div>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <SpectralDot nm={friendNm} />
                        {e.friend.psi} · λ {friendNm.toFixed(1)} nm
                        <span className="px-1.5 py-0 rounded text-[10px] font-bold"
                          style={{ background: friendStyle.bg, color: friendStyle.color }}>
                          {e.friend.band}
                        </span>
                      </div>
                    </div>
                    <Link href={`/inbox?contact=${e.friend.id}`}>
                      <button
                        data-testid={`btn-message-${e.friendshipId}`}
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Open message thread">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>

                  {/* Bond channel section */}
                  <div className="rounded-lg p-3 space-y-2"
                    style={{ background: `${bondStyle.bg}`, border: `1px solid ${bondStyle.color}25` }}>
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-slate-500">
                      <ChevronRight className="w-3 h-3" />
                      Established Bond Channel
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <SpectralDot nm={bondNm} />
                      <code className="text-sm font-bold font-mono" style={{ color: bondStyle.color }}>
                        {e.bond.psiChannel ?? "—"}
                      </code>
                      <span className="text-xs text-slate-500 font-mono">· λ {bondNm.toFixed(1)} nm</span>
                      <span className="px-1.5 py-0 rounded text-[10px] font-bold"
                        style={{ background: bondStyle.bg, color: bondStyle.color, border: `1px solid ${bondStyle.color}50` }}>
                        {e.bond.band}
                      </span>
                    </div>

                    {e.bond.wnspAddress && (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-[11px] text-slate-400 font-mono flex-1 truncate"
                          data-testid={`wnsp-addr-${e.friendshipId}`}>
                          {e.bond.wnspAddress}
                        </code>
                        <button
                          data-testid={`btn-copy-${e.friendshipId}`}
                          onClick={() => copy(e.bond.wnspAddress!, "WNSP address")}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-colors flex-shrink-0"
                          title="Copy WNSP address">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {e.acceptedAt && (
                    <div className="text-[10px] text-slate-600 text-right">
                      Channel established {new Date(e.acceptedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
