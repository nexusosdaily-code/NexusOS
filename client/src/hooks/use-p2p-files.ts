import { useEffect, useRef, useState } from "react";
import { useAuth } from "./use-auth";
import { P2PFileConnection } from "@/lib/p2p-file-transfer";
import { P2P_MAX_ACTIVE, P2P_MAX_FILE_BYTES, type P2PFileOffer, type P2PTransfer } from "@shared/p2p-files";

export function useP2PFiles() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [broadcastMuted, setMuted] = useState(false);
  const [offers, setOffers] = useState<P2PFileOffer[]>([]);
  const [transfers, setTransfers] = useState<P2PTransfer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const all = useRef(new Map<string, P2PTransfer>());
  const requests = useRef(new Map<string, File>());
  const files = useRef(new Map<string, File>());
  const connections = useRef(new Map<string, P2PFileConnection>());
  const urls = useRef(new Map<string, string>());
  const update = (id: string, patch: Partial<P2PTransfer>) => {
    const current = all.current.get(id);
    if (!current) return;
    all.current.set(id, { ...current, ...patch });
    setTransfers([...all.current.values()]);
    setOffers([...all.current.values()].filter(t => t.direction === "receiving" && t.status === "offered"));
  };
  const transmit = (message: unknown) => {
    if (ws.current?.readyState !== WebSocket.OPEN) throw new Error("P2P signaling is disconnected");
    ws.current.send(JSON.stringify(message));
  };
  const fail = (id: string, reason: string, notify = true) => {
    connections.current.get(id)?.close(); connections.current.delete(id); files.current.delete(id);
    update(id, { status: "failed", error: reason });
    if (notify && ws.current?.readyState === WebSocket.OPEN) transmit({ type: "cancel", id });
  };
  const connect = (id: string, file?: File) => {
    const transfer = all.current.get(id)!;
    if (connections.current.size >= P2P_MAX_ACTIVE) throw new Error("Finish a current transfer before connecting another");
    if (typeof RTCPeerConnection === "undefined") throw new Error("This browser does not support WebRTC file transfer");
    const connection = new P2PFileConnection({
      id, file, info: transfer.file,
      signal: signal => { try { transmit({ type: "signal", id, signal }); } catch { fail(id, "Signaling disconnected"); } },
      progress: progress => update(id, { status: "transferring", progress }),
      received: blob => {
        const url = URL.createObjectURL(blob);
        urls.current.set(id, url);
        update(id, { status: "complete", progress: 100, downloadUrl: url });
        try { transmit({ type: "received", id }); } catch { setError("File received, but sender acknowledgement could not be delivered"); }
      },
      failed: reason => fail(id, reason),
    });
    connections.current.set(id, connection);
    update(id, { status: "connecting" });
    return connection;
  };
  useEffect(() => {
    if (!user) return;
    let disposed = false;
    setConnecting(true); setError(null);
    const socket = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/p2p-files`);
    ws.current = socket;
    let messages = Promise.resolve();
    socket.onmessage = event => {
      messages = messages.then(async () => {
        if (disposed) return;
        const message = JSON.parse(event.data);
        if (message.type === "ready") {
          setAddress(message.address); setMuted(message.muted); setConnected(true); setConnecting(false);
        } else if (message.type === "settings") setMuted(message.muted);
        else if (message.type === "error") {
          if (message.requestId) requests.current.delete(message.requestId);
          setError(message.message);
        }
        else if (message.type === "offer" || message.type === "offered") {
          if (all.current.size >= 100) {
            if (message.type === "offer") transmit({ type: "decline", id: message.id });
            else transmit({ type: "cancel", id: message.id });
            setError("Transfer history is full; remove finished items or reopen the workspace");
            return;
          }
          const receiving = message.type === "offer";
          const transfer: P2PTransfer = {
            id: message.id, file: message.file, from: message.from ?? address ?? "You",
            broadcast: message.broadcast, direction: receiving ? "receiving" : "sending",
            status: "offered", progress: 0, peer: receiving ? message.from : message.peer,
          };
          all.current.set(message.id, transfer);
          if (!receiving) {
            const file = requests.current.get(message.requestId);
            if (!file) { fail(message.id, "Source file is no longer available"); return; }
            files.current.set(message.id, file);
          }
          update(message.id, {});
        } else if (message.type === "offer-result") {
          requests.current.delete(message.requestId);
          if (message.reason) setError(message.reason);
        } else if (message.type === "accept") {
          const file = files.current.get(message.id);
          if (!file) { fail(message.id, "Source file is unavailable"); return; }
          try { await connect(message.id, file).start(); } catch { fail(message.id, "Unable to start peer transfer"); }
        } else if (message.type === "signal") {
          await connections.current.get(message.id)?.signal(message.signal);
        } else if (message.type === "received") {
          connections.current.get(message.id)?.acknowledged();
          connections.current.delete(message.id); files.current.delete(message.id);
          update(message.id, { status: "complete", progress: 100 });
        } else if (message.type === "cancel" || message.type === "decline") {
          connections.current.get(message.id)?.close();
          connections.current.delete(message.id); files.current.delete(message.id);
          // A verified receiver keeps its completed download even if the
          // acknowledgement connection closes immediately afterward.
          if (all.current.get(message.id)?.status !== "complete") {
            update(message.id, { status: message.type === "decline" ? "declined" : "cancelled", error: message.reason });
          }
        }
      }).catch(() => { if (!disposed) setError("Invalid or interrupted P2P signaling"); });
    };
    socket.onerror = () => { if (!disposed) setError("P2P signaling connection failed"); };
    socket.onclose = () => {
      if (disposed) return;
      setConnected(false); setConnecting(false);
      setError("P2P disconnected. Reopen this workspace to reconnect.");
      for (const transfer of all.current.values()) {
        if (["offered", "connecting", "transferring"].includes(transfer.status)) fail(transfer.id, "Signaling disconnected", false);
      }
      requests.current.clear();
    };
    return () => {
      disposed = true; socket.close(); ws.current = null;
      for (const connection of connections.current.values()) connection.close();
      for (const url of urls.current.values()) URL.revokeObjectURL(url);
      connections.current.clear(); all.current.clear(); requests.current.clear(); files.current.clear(); urls.current.clear();
      setOffers([]); setTransfers([]); setConnected(false); setAddress(null);
    };
  }, [user?.id]);

  return {
    connected, connecting, address, broadcastMuted, offers, transfers, error,
    async setBroadcastMuted(muted: boolean) {
      try {
        const response = await fetch("/api/p2p/files/settings", {
          method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ muted }),
        });
        if (!response.ok) throw new Error("Unable to save broadcast preference");
        setMuted((await response.json()).muted);
      } catch (cause) { setError((cause as Error).message); throw cause; }
    },
    async sendFile(file: File, recipient: string | null) {
      try {
        if (file.size > P2P_MAX_FILE_BYTES) throw new Error("Files are limited to 256 MiB per transfer");
        if (requests.current.size >= 10) throw new Error("Too many pending offers");
        const requestId = crypto.randomUUID();
        const target = recipient === null ? null : recipient.trim();
        if (target === "") throw new Error("Enter an exact recipient wave address");
        requests.current.set(requestId, file); setError(null);
        try { transmit({ type: "offer", requestId, recipient: target, file: { name: file.name, size: file.size, type: file.type } }); }
        catch (cause) { requests.current.delete(requestId); throw cause; }
      } catch (cause) { setError((cause as Error).message); throw cause; }
    },
    async accept(id: string) {
      try {
        const transfer = all.current.get(id);
        if (!transfer || transfer.status !== "offered") return;
        const reserved = [...all.current.values()].filter(t => t.direction === "receiving" &&
          (["connecting", "transferring"].includes(t.status) || !!t.downloadUrl)).reduce((sum, t) => sum + t.file.size, 0);
        if (reserved + transfer.file.size > P2P_MAX_FILE_BYTES) throw new Error("Receive memory limit reached; remove completed downloads before accepting more");
        if (transfer.broadcast && broadcastMuted) throw new Error("Unmute broadcasts before accepting");
        connect(id); transmit({ type: "accept", id });
      } catch (cause) { fail(id, (cause as Error).message); setError((cause as Error).message); throw cause; }
    },
    decline(id: string) {
      try { transmit({ type: "decline", id }); update(id, { status: "declined" }); }
      catch { setError("Unable to decline while disconnected"); }
    },
    cancel(id: string) {
      const status = all.current.get(id)?.status;
      connections.current.get(id)?.close(); connections.current.delete(id); files.current.delete(id);
      const url = urls.current.get(id);
      if (url) { URL.revokeObjectURL(url); urls.current.delete(id); }
      if (status && ["complete", "failed", "declined", "cancelled"].includes(status)) {
        all.current.delete(id);
        setTransfers([...all.current.values()]);
        return;
      }
      if (ws.current?.readyState === WebSocket.OPEN) transmit({ type: "cancel", id });
      update(id, { status: "cancelled", downloadUrl: undefined });
    },
  };
}
