import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft, Send, Radio, Phone, Video, Paperclip, UserPlus,
  MessageSquare, Zap, Atom, Search, ChevronRight, Wifi
} from "lucide-react";
import { getAuthHeaders } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

// ── Helpers ───────────────────────────────────────────────────────────────────
function nmToColor(nm: number | null | undefined): string {
  if (!nm) return "#6b7280";
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#aacc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}

function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// Quick CE ordinal encoder (A-Z=65-90 mapped to 380-780nm)
function quickSpectral(text: string): { nm: number; label: string } | null {
  if (!text) return null;
  const char = text.charAt(0).toUpperCase();
  const code = char.charCodeAt(0);
  if (code < 32 || code > 126) return null;
  // Map printable ASCII (32-126) to 380-780nm
  const nm = 380 + ((code - 32) / (126 - 32)) * 400;
  return { nm, label: `'${char}' → ${nm.toFixed(0)}nm` };
}

interface Contact {
  id: string;
  username: string;
  wavelength?: string;
  spectralBond?: string;
  connectedAt?: string;
  friendshipId: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  wavelengthMin?: string | null;
  wavelengthMax?: string | null;
  spectralHash?: string | null;
  totalLambdaMass?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function CommunicationPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [compose, setCompose] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedContactRef = useRef<Contact | null>(null);

  // Keep ref in sync so WS handler always sees current contact
  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);

  // ── WebSocket live delivery ───────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/signaling?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== "new_message") return;
        const msg: Message = data.message;
        const contact = selectedContactRef.current;

        // If the message belongs to the open thread, inject it directly
        if (contact && (msg.senderId === contact.id || msg.recipientId === contact.id)) {
          qc.setQueryData(
            ["/api/messages/thread", contact.id],
            (old: any) => {
              if (!old) return old;
              const existing = old.messages ?? [];
              if (existing.some((m: Message) => m.id === msg.id)) return old;
              return { ...old, messages: [...existing, msg] };
            }
          );
        }
        // Always refresh unread count
        qc.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      } catch {}
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [qc]);

  const spectralPreview = quickSpectral(compose);

  // Contacts (friends)
  const { data: friendsData } = useQuery<{ friends: Contact[]; pendingRequests: any[]; sentRequests: any[] }>({
    queryKey: ["/api/friends"],
    refetchInterval: 15_000,
  });

  // Thread — WebSocket is primary delivery; poll every 30s as fallback
  const { data: threadData, isLoading: threadLoading } = useQuery<{ messages: Message[]; contact: { id: string; username: string } }>({
    queryKey: ["/api/messages/thread", selectedContact?.id],
    enabled: !!selectedContact,
    refetchInterval: 30_000,
  });

  // Unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10_000,
  });

  // Network nodes — for showing spectral node badge on contacts
  const { data: nodesData } = useQuery<{ nodes: { name: string; psiChannel: string; wavelengthNm: string; emissionBand: string; status: string }[] }>({
    queryKey: ["/api/network/nodes"],
    refetchInterval: 15_000,
  });

  const nodesByName = (nodesData?.nodes ?? []).reduce<Record<string, { psiChannel: string; wavelengthNm: string; emissionBand: string }>>((acc, n) => {
    acc[n.name.toLowerCase()] = { psiChannel: n.psiChannel, wavelengthNm: n.wavelengthNm, emissionBand: n.emissionBand };
    return acc;
  }, {});

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ recipientId: selectedContact!.id, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setCompose("");
      // WS delivers instantly when connected; only poll-invalidate as fallback
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        qc.invalidateQueries({ queryKey: ["/api/messages/thread", selectedContact?.id] });
      }
    },
  });

  // Add contact mutation
  const addContactMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setAddPhone("");
      setShowAddContact(false);
      qc.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadData?.messages?.length]);

  const contacts: Contact[] = friendsData?.friends ?? [];
  const filtered = contacts.filter(c =>
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const messages: Message[] = threadData?.messages ?? [];

  return (
    <div className="h-screen bg-black text-white flex flex-col" style={{ fontFamily: "monospace" }}>

      {/* Header */}
      <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/nexus-command">
            <button className="text-white/30 hover:text-white/60 transition-colors"><ArrowLeft size={15} /></button>
          </Link>
          <div className="flex items-center gap-2">
            <Radio size={13} className="text-cyan-400" />
            <span className="text-sm font-bold tracking-wider text-cyan-400">NEXUS COMMS</span>
            <div
              title={wsConnected ? "Live — WebSocket connected" : "Connecting…"}
              className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}
            />
          </div>
          <span className="text-white/20 text-[10px]">
            {wsConnected ? "LIVE · " : ""}Spectral P2P · CE→SE · Λ=hf/c²
          </span>
        </div>
        <div className="flex items-center gap-3">
          {unreadData && unreadData.count > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-amber-400/30" style={{ background: "rgba(251,191,36,0.08)" }}>
              <MessageSquare size={10} className="text-amber-400" />
              <span className="text-amber-400 text-[10px] font-bold">{unreadData.count} unread</span>
            </div>
          )}
          <Link href="/transmission">
            <button className="text-white/30 hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-[10px]">
              <Paperclip size={11} /> Media
            </button>
          </Link>
          <Link href="/streaming">
            <button className="text-white/30 hover:text-purple-400 transition-colors flex items-center gap-1.5 text-[10px]">
              <Video size={11} /> Stream
            </button>
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Contact List ──────────────────────────────────────────── */}
        <div className="w-64 border-r border-white/10 flex flex-col flex-shrink-0" style={{ background: "rgba(255,255,255,0.01)" }}>

          {/* Search + Add */}
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="flex items-center gap-2 border border-white/10 rounded-lg px-2.5 py-1.5" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Search size={11} className="text-white/30" />
              <input
                className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder-white/20"
                placeholder="Search contacts…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                data-testid="input-contact-search"
              />
            </div>
            <button
              onClick={() => setShowAddContact(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 border border-cyan-400/20 rounded-lg py-1.5 text-[10px] text-cyan-400/60 hover:text-cyan-400 hover:border-cyan-400/40 transition-all"
              data-testid="button-add-contact"
            >
              <UserPlus size={10} /> Add contact by phone
            </button>
            {showAddContact && (
              <div className="flex gap-1.5">
                <input
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none placeholder-white/20"
                  placeholder="+614XXXXXXXX"
                  value={addPhone}
                  onChange={e => setAddPhone(e.target.value)}
                  data-testid="input-phone-add"
                />
                <button
                  onClick={() => addPhone && addContactMutation.mutate(addPhone)}
                  disabled={!addPhone || addContactMutation.isPending}
                  className="px-2 rounded-lg text-[10px] font-bold text-cyan-400 border border-cyan-400/30 hover:border-cyan-400/60 disabled:opacity-40 transition-all"
                  data-testid="button-send-request"
                >
                  {addContactMutation.isPending ? "…" : "→"}
                </button>
              </div>
            )}
            {addContactMutation.isError && (
              <div className="text-red-400 text-[9px]">{(addContactMutation.error as Error).message}</div>
            )}
            {addContactMutation.isSuccess && (
              <div className="text-emerald-400 text-[9px]">Request sent!</div>
            )}
          </div>

          {/* Pending requests badge */}
          {(friendsData?.pendingRequests?.length ?? 0) > 0 && (
            <Link href="/friends">
              <div className="mx-3 mt-2 flex items-center justify-between border border-amber-400/20 rounded-lg px-3 py-1.5 cursor-pointer hover:border-amber-400/40 transition-all" style={{ background: "rgba(251,191,36,0.04)" }}>
                <span className="text-amber-400 text-[9px]">{friendsData!.pendingRequests.length} pending request{friendsData!.pendingRequests.length > 1 ? "s" : ""}</span>
                <ChevronRight size={9} className="text-amber-400/50" />
              </div>
            </Link>
          )}

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="text-white/20 text-[10px] text-center py-8 px-4 leading-relaxed">
                {contacts.length === 0
                  ? "No contacts yet.\nAdd someone by phone number to start messaging."
                  : "No contacts match your search."
                }
              </div>
            ) : (
              filtered.map(contact => {
                const nm = contact.wavelength ? parseFloat(contact.wavelength) : null;
                const col = nmToColor(nm);
                const isSelected = selectedContact?.id === contact.id;
                const nodeInfo = nodesByName[contact.username.toLowerCase()];
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${isSelected ? "bg-white/5 border-r-2 border-cyan-400" : "hover:bg-white/3"}`}
                    data-testid={`contact-${contact.id}`}
                  >
                    {/* Avatar — wavelength color dot */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold border relative"
                      style={{ background: col + "18", borderColor: col + "40", color: col }}>
                      {contact.username.charAt(0).toUpperCase()}
                      {nodeInfo && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black animate-pulse"
                          style={{ background: nmToColor(parseFloat(nodeInfo.wavelengthNm)) }} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-white truncate">{contact.username}</span>
                        {nodeInfo && (
                          <span className="text-[7px] px-1 py-0.5 rounded border border-emerald-400/30 text-emerald-400/70 flex-shrink-0">NODE</span>
                        )}
                      </div>
                      {nodeInfo ? (
                        <div className="text-[9px] text-emerald-400/60">{nodeInfo.psiChannel} · {nodeInfo.emissionBand}</div>
                      ) : nm ? (
                        <div className="text-[9px]" style={{ color: col }}>{nm.toFixed(1)}nm · Ψ bond</div>
                      ) : (
                        <div className="text-[9px] text-white/25">spectral link</div>
                      )}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: nodeInfo ? nmToColor(parseFloat(nodeInfo.wavelengthNm)) : col }} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── CENTER: Thread ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedContact ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center" style={{ background: "rgba(6,182,212,0.06)" }}>
                <Radio size={28} className="text-cyan-400/40" />
              </div>
              <div className="text-center">
                <div className="text-white/30 text-sm font-bold mb-1">Select a contact</div>
                <div className="text-white/15 text-[11px] leading-relaxed max-w-xs">
                  Every message is encoded via CE→SE into the electromagnetic spectrum.
                  Each character you type has a physical wavelength address.
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                {["A=380nm", "M=580nm", "Z=780nm"].map(s => {
                  const [char, nmStr] = s.split("=");
                  const nm = parseFloat(nmStr);
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: nmToColor(nm) }} />
                      <span className="text-white/30 text-[9px]">{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border"
                    style={{
                      background: nmToColor(selectedContact.wavelength ? parseFloat(selectedContact.wavelength) : null) + "18",
                      borderColor: nmToColor(selectedContact.wavelength ? parseFloat(selectedContact.wavelength) : null) + "40",
                      color: nmToColor(selectedContact.wavelength ? parseFloat(selectedContact.wavelength) : null)
                    }}>
                    {selectedContact.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{selectedContact.username}</div>
                    <div className="text-[9px] text-white/30">
                      {selectedContact.wavelength ? `λ=${parseFloat(selectedContact.wavelength).toFixed(1)}nm · ` : ""}
                      Spectral P2P · {messages.length} messages
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/streaming">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-400/20 text-purple-400/60 hover:text-purple-400 hover:border-purple-400/40 transition-all text-[10px]" data-testid="button-video-call">
                      <Video size={11} /> Stream
                    </button>
                  </Link>
                  <Link href="/transmission">
                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-400/20 text-cyan-400/60 hover:text-cyan-400 hover:border-cyan-400/40 transition-all text-[10px]" data-testid="button-send-media">
                      <Paperclip size={11} /> Media
                    </button>
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {threadLoading && (
                  <div className="text-white/20 text-[11px] text-center py-8 animate-pulse">Loading thread…</div>
                )}
                {!threadLoading && messages.length === 0 && (
                  <div className="text-white/15 text-[11px] text-center py-12 leading-relaxed">
                    No messages yet.<br />
                    Send the first message — it will be encoded into the electromagnetic spectrum.
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = msg.senderId === String(user?.id ?? "");
                  const nmMin = msg.wavelengthMin ? parseFloat(msg.wavelengthMin) : null;
                  const nmMax = msg.wavelengthMax ? parseFloat(msg.wavelengthMax) : null;
                  const col = nmToColor(nmMin);
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                      <div className={`max-w-xs lg:max-w-md ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        {/* Wavelength bar */}
                        {(nmMin || nmMax) && (
                          <div className="flex items-center gap-1.5">
                            <div className="h-0.5 w-20 rounded-full" style={{
                              background: nmMin && nmMax
                                ? `linear-gradient(to right, ${nmToColor(nmMin)}, ${nmToColor(nmMax)})`
                                : col
                            }} />
                            <span className="text-[8px]" style={{ color: col }}>
                              {nmMin?.toFixed(0)}–{nmMax?.toFixed(0)}nm
                            </span>
                          </div>
                        )}
                        {/* Bubble */}
                        <div className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed border ${isMine ? "text-right" : "text-left"}`}
                          style={{
                            background: isMine ? col + "18" : "rgba(255,255,255,0.04)",
                            borderColor: isMine ? col + "30" : "rgba(255,255,255,0.07)",
                            color: isMine ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.70)"
                          }}>
                          {msg.content}
                        </div>
                        {/* Meta */}
                        <div className="flex items-center gap-2 text-[8px] text-white/20">
                          <span>{fmtTime(msg.createdAt)}</span>
                          {msg.spectralHash && (
                            <span title={msg.spectralHash}>⚡ encoded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="border-t border-white/10 px-5 py-3 flex-shrink-0" style={{ background: "rgba(255,255,255,0.01)" }}>
                {/* Spectral preview */}
                {spectralPreview && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-0.5 w-16 rounded-full" style={{ background: nmToColor(spectralPreview.nm) }} />
                    <span className="text-[9px]" style={{ color: nmToColor(spectralPreview.nm) }}>
                      {spectralPreview.label}
                    </span>
                    <Atom size={9} style={{ color: nmToColor(spectralPreview.nm) }} />
                    <span className="text-white/20 text-[8px]">CE→SE live</span>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <div className="flex-1 border border-white/10 rounded-xl px-4 py-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <textarea
                      className="w-full bg-transparent text-[11px] text-white outline-none resize-none placeholder-white/20 leading-relaxed"
                      placeholder="Type a message… each character maps to a wavelength"
                      rows={2}
                      value={compose}
                      onChange={e => setCompose(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey && compose.trim()) {
                          e.preventDefault();
                          sendMutation.mutate(compose.trim());
                        }
                      }}
                      data-testid="input-compose"
                    />
                  </div>
                  <button
                    onClick={() => compose.trim() && sendMutation.mutate(compose.trim())}
                    disabled={!compose.trim() || sendMutation.isPending}
                    className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all disabled:opacity-40"
                    style={{
                      background: compose.trim() ? nmToColor(spectralPreview?.nm ?? null) + "25" : "rgba(255,255,255,0.04)",
                      borderColor: compose.trim() ? nmToColor(spectralPreview?.nm ?? null) + "50" : "rgba(255,255,255,0.08)",
                    }}
                    data-testid="button-send-message"
                  >
                    <Send size={13} style={{ color: compose.trim() ? nmToColor(spectralPreview?.nm ?? null) : "rgba(255,255,255,0.3)" }} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-white/15 text-[9px]">Enter to send · Shift+Enter for new line · CE→SE encoded on send</span>
                  <div className="flex items-center gap-1">
                    <Wifi size={9} className="text-white/20" />
                    <span className="text-white/15 text-[9px]">P2P</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Spectral Info ────────────────────────────────────────── */}
        <div className="w-56 border-l border-white/10 flex flex-col flex-shrink-0 overflow-y-auto" style={{ background: "rgba(255,255,255,0.01)" }}>
          <div className="p-4 space-y-4">
            {/* Layer 0 reminder */}
            <div className="border border-amber-400/15 rounded-xl p-3" style={{ background: "rgba(251,191,36,0.03)" }}>
              <div className="text-amber-400/60 text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Atom size={8} /> Layer 0 Substrate
              </div>
              <div className="text-white/40 text-[9px] leading-relaxed">
                Every character you send maps to a physical wavelength via CE→SE encoding.
                Communication IS the spectrum in use.
              </div>
            </div>

            {/* Live typing spectral analysis */}
            {compose && (
              <div className="border border-cyan-400/15 rounded-xl p-3" style={{ background: "rgba(6,182,212,0.03)" }}>
                <div className="text-cyan-400/60 text-[9px] uppercase tracking-widest mb-2">Live Encoding</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {compose.split("").slice(0, 20).map((ch, i) => {
                    const code = ch.charCodeAt(0);
                    const nm = code >= 32 && code <= 126 ? 380 + ((code - 32) / 94) * 400 : null;
                    const col = nmToColor(nm);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                          style={{ background: col + "20", color: col }}>
                          {ch === " " ? "·" : ch}
                        </div>
                        <div className="flex-1 h-0.5 rounded-full" style={{ background: col + "60" }} />
                        <span className="text-[8px] flex-shrink-0" style={{ color: col }}>{nm?.toFixed(0)}nm</span>
                      </div>
                    );
                  })}
                  {compose.length > 20 && (
                    <div className="text-white/20 text-[8px] text-center">+{compose.length - 20} more chars</div>
                  )}
                </div>
              </div>
            )}

            {/* Communication modes */}
            <div className="space-y-2">
              <div className="text-white/20 text-[9px] uppercase tracking-widest">Channels</div>
              {[
                { icon: MessageSquare, label: "Text",   sub: "CE→SE encoded",      color: "#06b6d4", href: null },
                { icon: Paperclip,    label: "Media",   sub: "Spectral DB → Ψ",    color: "#8b5cf6", href: "/transmission" },
                { icon: Video,        label: "Stream",  sub: "Live Ψ broadcast",   color: "#a855f7", href: "/streaming" },
                { icon: Zap,          label: "Wallet",  sub: "NXT energy cost",    color: "#f59e0b", href: "/wallet" },
              ].map(({ icon: Icon, label, sub, color, href }) => (
                href ? (
                  <Link href={href} key={label}>
                    <div className="flex items-center gap-2.5 border border-white/5 rounded-lg px-2.5 py-2 cursor-pointer hover:border-white/10 transition-all">
                      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
                        <Icon size={11} style={{ color }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold" style={{ color }}>{label}</div>
                        <div className="text-[8px] text-white/25">{sub}</div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div key={label} className="flex items-center gap-2.5 border border-white/5 rounded-lg px-2.5 py-2">
                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
                      <Icon size={11} style={{ color }} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold" style={{ color }}>{label}</div>
                      <div className="text-[8px] text-white/25">{sub}</div>
                    </div>
                    <div className="ml-auto">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Selected contact spectral bond */}
            {selectedContact && selectedContact.wavelength && (
              <div className="border border-white/10 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="text-white/30 text-[9px] uppercase tracking-widest mb-2">Spectral Bond</div>
                <div className="h-2 rounded-full w-full mb-2" style={{
                  background: `linear-gradient(to right, ${nmToColor(parseFloat(selectedContact.wavelength))}, ${nmToColor(parseFloat(selectedContact.wavelength) + 50)})`
                }} />
                <div className="text-[9px]" style={{ color: nmToColor(parseFloat(selectedContact.wavelength)) }}>
                  λ = {parseFloat(selectedContact.wavelength).toFixed(2)}nm
                </div>
                <div className="text-white/20 text-[8px] mt-1">
                  {selectedContact.spectralBond ? `Σ = ${parseFloat(selectedContact.spectralBond).toExponential(3)} J` : "Ψ channel established"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
