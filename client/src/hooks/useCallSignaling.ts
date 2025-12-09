import { useState, useEffect, useRef, useCallback } from "react";

interface CallUser {
  id: string;
  username: string;
}

interface IncomingCall {
  callId: string;
  callType: "video" | "voice";
  caller: CallUser;
}

interface ActiveCall {
  callId: string;
  callType: "video" | "voice";
  otherUser: CallUser;
  isIncoming: boolean;
}

interface UseCallSignalingResult {
  socket: WebSocket | null;
  isConnected: boolean;
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  initiateCall: (receiverId: string, receiverUsername: string, type: "video" | "voice") => Promise<void>;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

export function useCallSignaling(): UseCallSignalingResult {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/signaling?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === "incoming-call") {
          setIncomingCall({
            callId: message.callId,
            callType: message.callType,
            caller: message.caller,
          });
        }
        
        if (message.type === "call-end" || message.type === "call-reject") {
          setActiveCall(null);
          setIncomingCall(null);
        }
      } catch (error) {
        console.error("Failed to parse signaling message:", error);
      }
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const initiateCall = useCallback(async (
    receiverId: string, 
    receiverUsername: string, 
    type: "video" | "voice"
  ) => {
    const token = localStorage.getItem("auth_token");
    if (!token) throw new Error("Not authenticated");
    
    const response = await fetch("/api/calls/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiverId, type }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to initiate call");
    }
    
    const { call, receiverOnline } = await response.json();
    
    if (!receiverOnline) {
      throw new Error("User is offline");
    }
    
    setActiveCall({
      callId: call.id,
      callType: type,
      otherUser: { id: receiverId, username: receiverUsername },
      isIncoming: false,
    });
  }, []);

  const acceptCall = useCallback(() => {
    if (!incomingCall || !socketRef.current) return;
    
    socketRef.current.send(JSON.stringify({
      type: "call-accept",
      callId: incomingCall.callId,
      targetUserId: incomingCall.caller.id,
    }));
    
    setActiveCall({
      callId: incomingCall.callId,
      callType: incomingCall.callType,
      otherUser: incomingCall.caller,
      isIncoming: true,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (!incomingCall || !socketRef.current) return;
    
    socketRef.current.send(JSON.stringify({
      type: "call-reject",
      callId: incomingCall.callId,
      targetUserId: incomingCall.caller.id,
    }));
    
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
  }, []);

  return {
    socket,
    isConnected,
    incomingCall,
    activeCall,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
  };
}

export default useCallSignaling;
