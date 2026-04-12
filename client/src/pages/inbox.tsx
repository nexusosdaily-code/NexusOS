import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Send, UserPlus, Check, X, Waves, Lock, Unlock, Radio,
  MessageSquare, Users, ChevronLeft, Phone, Zap, Search,
} from "lucide-react";
import { Link } from "wouter";

// ── helpers ──────────────────────────────────────────────────────────────────
function authFetch(url: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  return fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
}

function nmToHue(nm: number) {
  return Math.round(((nm - 380) / 400) * 270);
}

function SpectralBar({ min, max }: { min?: string | null; max?: string | null }) {
  if (!min || !max) return null;
  const h1 = nmToHue(parseFloat(min));
  const h2 = nmToHue(parseFloat(max));
  return (
    <div className="h-1 w-16 rounded-full mt-0.5 opacity-70"
      style={{ background: `linear-gradient(to right, hsl(${h1},80%,55%), hsl(${h2},80%,55%))` }} />
  );
}

// ── types ─────────────────────────────────────────────────────────────────────
interface Friend {
  id: string;         // friendship id
  userId: string;     // user id (for thread)
  username: string;
  wavelength?: string;
  spectralBond?: string;
}
interface PendingReq { id: string; username: string; requestedAt: string; }
interface ThreadMsg {
  id: string;
  senderId: string;
  recipientId: string;
  content: string | null;
  wavelengthMin?: string | null;
  wavelengthMax?: string | null;
  totalLambdaMass?: string | null;
  spectralHash?: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── Left sidebar: contacts ─────────────────────────────────────────────────
function ContactList({
  friends, pending, selectedUserId, onSelect, onRefresh,
}: {
  friends: Friend[];
  pending: PendingReq[];
  selectedUserId: string | null;
  onSelect: (f: Friend) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const addMut = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await authFetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Request failed");
      return d;
    },
    onSuccess: () => {
      toast({ title: "Friend request sent" });
      setAddPhone(""); setAddOpen(false);
      qc.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const acceptMut = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await authFetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Accept failed");
      return d;
    },
    onSuccess: () => {
      toast({ title: "Friend request accepted" });
      qc.invalidateQueries({ queryKey: ["/api/friends"] });
      onRefresh();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await authFetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Reject failed");
      return d;
    },
    onSuccess: () => {
      toast({ title: "Request rejected" });
      qc.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  const filtered = friends.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Messages
          </h2>
          <button onClick={() => setAddOpen(v => !v)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            data-testid="btn-add-friend" title="Add friend by phone number">
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
        {addOpen && (
          <div className="space-y-1.5">
            <Input value={addPhone} onChange={e => setAddPhone(e.target.value)}
              placeholder="Phone number (e.g. +1234567890)"
              className="bg-slate-800 border-slate-600 text-slate-200 text-xs h-8"
              data-testid="input-add-phone"
              onKeyDown={e => e.key === "Enter" && addPhone && addMut.mutate(addPhone)} />
            <Button size="sm" className="w-full h-7 text-xs bg-purple-700 hover:bg-purple-600"
              onClick={() => addPhone && addMut.mutate(addPhone)}
              disabled={!addPhone || addMut.isPending}
              data-testid="btn-send-friend-request">
              {addMut.isPending ? "Sending…" : "Send Friend Request"}
            </Button>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-slate-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="bg-slate-800 border-slate-600 text-slate-200 text-xs h-7 pl-6"
            data-testid="input-search-contacts" />
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="border-b border-slate-700">
          <div className="px-4 py-2 text-xs text-purple-400 font-medium flex items-center gap-1">
            <Users className="w-3 h-3" />
            Friend requests ({pending.length})
          </div>
          {pending.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-800 transition-colors"
              data-testid={`pending-req-${r.id}`}>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">{r.username}</div>
                <div className="text-xs text-slate-500">{formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}</div>
              </div>
              <button onClick={() => acceptMut.mutate(r.id)}
                className="p-1 rounded bg-green-800/50 hover:bg-green-700/60 text-green-400"
                data-testid={`btn-accept-${r.id}`}>
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => rejectMut.mutate(r.id)}
                className="p-1 rounded bg-red-800/50 hover:bg-red-700/60 text-red-400"
                data-testid={`btn-reject-${r.id}`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contacts */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            {friends.length === 0
              ? <>No contacts yet.<br />Add a friend by phone number to start messaging.</>
              : "No contacts match your search."
            }
          </div>
        ) : (
          filtered.map(f => (
            <button key={f.id} onClick={() => onSelect(f)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/70 transition-colors border-b border-slate-800/50 ${selectedUserId === f.userId ? "bg-slate-800 border-l-2 border-l-purple-500" : ""}`}
              data-testid={`contact-${f.userId}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-700 to-cyan-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {f.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{f.username}</div>
                {f.wavelength && (
                  <div className="text-xs text-slate-500 font-mono truncate">λ {parseFloat(f.wavelength).toFixed(0)} nm bond</div>
                )}
              </div>
              {f.spectralBond && (
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: `hsl(${nmToHue(parseFloat(f.wavelength ?? "550"))},70%,55%)` }} />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Right panel: thread ────────────────────────────────────────────────────
function ThreadPanel({
  contact, myUserId, onBack,
}: {
  contact: Friend;
  myUserId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadKey = ["/api/messages/thread", contact.userId];

  const { data, isLoading, error } = useQuery<{ messages: ThreadMsg[]; contact: { id: string; username: string } }>({
    queryKey: threadKey,
    queryFn: async () => {
      const res = await authFetch(`/api/messages/thread/${contact.userId}`);
      if (!res.ok) throw new Error("Failed to load conversation");
      return res.json();
    },
    refetchInterval: 8000,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  // Mark unread messages as read
  useEffect(() => {
    if (!data?.messages) return;
    data.messages
      .filter(m => m.recipientId === myUserId && !m.isRead)
      .forEach(m => {
        authFetch(`/api/messages/${m.id}/read`, { method: "POST" }).catch(() => {});
      });
  }, [data?.messages, myUserId]);

  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      const res = await authFetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: contact.userId, content }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Send failed");
      return d;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: threadKey });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  const decodeMut = useMutation({
    mutationFn: async (msgId: string) => {
      const res = await authFetch(`/api/messages/${msgId}/decode`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Decode failed");
      return d;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: threadKey }),
    onError: (e: Error) => toast({ title: "Decode failed", description: e.message, variant: "destructive" }),
  });

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    sendMut.mutate(t);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
        <button onClick={onBack} className="md:hidden p-1 text-slate-400 hover:text-white" data-testid="btn-back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-700 to-cyan-700 flex items-center justify-center text-white text-xs font-bold">
          {contact.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-100">{contact.username}</div>
          {contact.wavelength && (
            <div className="text-xs text-slate-500 font-mono">
              λ {parseFloat(contact.wavelength).toFixed(1)} nm · spectral bond active
            </div>
          )}
        </div>
        <Badge variant="outline" className="border-purple-700/50 text-purple-400 text-xs hidden sm:flex">
          <Radio className="w-3 h-3 mr-1" />
          Λ encoded
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="text-center py-12 text-slate-500">
            <Waves className="w-8 h-8 mx-auto mb-2 animate-pulse text-purple-500" />
            <p className="text-xs">Loading conversation…</p>
          </div>
        )}
        {error && (
          <div className="text-center py-12 text-red-400 text-xs">{(error as Error).message}</div>
        )}
        {data?.messages.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            <p className="text-xs">No messages yet. Say hello!</p>
          </div>
        )}
        {data?.messages.map(msg => {
          const isMe = msg.senderId === myUserId;
          const locked = !isMe && !msg.content;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              data-testid={`msg-${msg.id}`}>
              <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`px-3 py-2 rounded-2xl text-sm ${
                  isMe
                    ? "bg-purple-700 text-white rounded-tr-sm"
                    : "bg-slate-800 text-slate-100 rounded-tl-sm"
                }`}>
                  {locked ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-xs italic">Spectral message — tap to decode</span>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  )}
                </div>

                <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <span className="text-xs text-slate-600">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                  {(msg.wavelengthMin || msg.wavelengthMax) && (
                    <SpectralBar min={msg.wavelengthMin} max={msg.wavelengthMax} />
                  )}
                  {msg.totalLambdaMass && (
                    <span className="text-xs text-slate-600 font-mono">
                      Λ {parseFloat(msg.totalLambdaMass).toExponential(2)} kg
                    </span>
                  )}
                  {locked && (
                    <button onClick={() => decodeMut.mutate(msg.id)}
                      disabled={decodeMut.isPending}
                      className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-0.5"
                      data-testid={`btn-decode-${msg.id}`}>
                      <Unlock className="w-3 h-3" />
                      Decode
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-700">
        <div className="flex gap-2 items-end">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Message ${contact.username}…`}
            className="flex-1 bg-slate-800 border-slate-600 text-slate-200 text-sm min-h-[40px] max-h-32 resize-none"
            rows={1}
            data-testid="input-message"
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
          <Button onClick={handleSend}
            disabled={!text.trim() || sendMut.isPending}
            className="bg-purple-700 hover:bg-purple-600 h-10 px-3"
            data-testid="btn-send">
            {sendMut.isPending ? <Waves className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Messages encoded via Λ=hf/c² before transmission · Enter to send
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const qc = useQueryClient();
  const token = localStorage.getItem("auth_token");

  // Decode my user ID from auth endpoint
  const { data: meData } = useQuery<{ user: { id: string; username: string } }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await authFetch("/api/auth/me");
      if (!res.ok) throw new Error("Not logged in");
      return res.json();
    },
    enabled: !!token,
  });

  const myUserId = meData?.user.id ?? "";

  const { data: friendsData, refetch: refetchFriends } = useQuery<{
    friends: Friend[];
    pendingRequests: PendingReq[];
  }>({
    queryKey: ["/api/friends"],
    queryFn: async () => {
      const res = await authFetch("/api/friends");
      if (!res.ok) throw new Error("Failed to load contacts");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15000,
  });

  // WebSocket: listen for new_message events → invalidate thread
  useEffect(() => {
    if (!token) return;
    const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProto}//${location.host}/ws?token=${token}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "new_message") {
          qc.invalidateQueries({ queryKey: ["/api/messages/thread"] });
          qc.invalidateQueries({ queryKey: ["/api/friends"] });
        }
      } catch {}
    };
    return () => ws.close();
  }, [token, qc]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <MessageSquare className="w-12 h-12 text-purple-500 mx-auto" />
          <h2 className="text-white text-lg font-semibold">Lambda Messages</h2>
          <p className="text-slate-400 text-sm">Log in to access your spectrally encoded messages.</p>
          <Link href="/auth">
            <Button className="bg-purple-700 hover:bg-purple-600">Log In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const friends = friendsData?.friends ?? [];
  const pending = friendsData?.pendingRequests ?? [];
  const showThread = !!selectedFriend;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-purple-400" />
          <span className="text-white font-semibold text-sm">NexusOS Messages</span>
          {pending.length > 0 && (
            <Badge className="bg-red-600 text-white text-xs">{pending.length}</Badge>
          )}
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs">
            ← NexusOS
          </Button>
        </Link>
      </div>

      {/* Split panel */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 49px)" }}>
        {/* Contacts sidebar */}
        <div className={`${showThread ? "hidden md:flex" : "flex"} w-full md:w-72 lg:w-80 border-r border-slate-800 bg-slate-950 flex-col flex-shrink-0`}>
          <ContactList
            friends={friends}
            pending={pending}
            selectedUserId={selectedFriend?.userId ?? null}
            onSelect={setSelectedFriend}
            onRefresh={() => refetchFriends()}
          />
        </div>

        {/* Thread panel */}
        <div className={`${showThread ? "flex" : "hidden md:flex"} flex-1 flex-col bg-slate-900`}>
          {selectedFriend && myUserId ? (
            <ThreadPanel
              contact={selectedFriend}
              myUserId={myUserId}
              onBack={() => setSelectedFriend(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-slate-300 font-medium">Select a conversation</h3>
                <p className="text-slate-500 text-sm max-w-xs">
                  Choose a contact from the left to open a spectrally encoded conversation.
                </p>
                {friends.length === 0 && (
                  <p className="text-purple-400 text-xs">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Add friends by phone number to start messaging.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
