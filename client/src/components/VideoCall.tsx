import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  PhoneIncoming, PhoneOutgoing, X
} from "lucide-react";

interface CallUser {
  id: string;
  username: string;
}

interface VideoCallProps {
  callId: string;
  callType: "video" | "voice";
  otherUser: CallUser;
  isIncoming: boolean;
  onEnd: () => void;
  signalingSocket: WebSocket | null;
}

interface IncomingCallNotificationProps {
  callId: string;
  callType: "video" | "voice";
  caller: CallUser;
  onAccept: () => void;
  onReject: () => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function IncomingCallNotification({ 
  callId, 
  callType, 
  caller, 
  onAccept, 
  onReject 
}: IncomingCallNotificationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <Card className="w-full max-w-md bg-slate-900 border-purple-500/50 animate-pulse">
        <CardContent className="p-8 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {caller.username.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">{caller.username}</h2>
          <p className="text-purple-300 mb-8 flex items-center justify-center gap-2">
            <PhoneIncoming className="w-5 h-5" />
            Incoming {callType === "video" ? "Video" : "Voice"} Call
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button
              onClick={onReject}
              data-testid="button-reject-call"
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
            <Button
              onClick={onAccept}
              data-testid="button-accept-call"
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
            >
              <Phone className="w-8 h-8" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function VideoCall({ 
  callId, 
  callType, 
  otherUser, 
  isIncoming, 
  onEnd,
  signalingSocket 
}: VideoCallProps) {
  const [callStatus, setCallStatus] = useState<"connecting" | "ringing" | "active" | "ended">("connecting");
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === "video");
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingSocket?.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify({
          type: "ice-candidate",
          callId,
          targetUserId: otherUser.id,
          payload: event.candidate,
        }));
      }
    };
    
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallStatus("active");
        callStartTimeRef.current = Date.now();
        durationIntervalRef.current = window.setInterval(() => {
          if (callStartTimeRef.current) {
            setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
          }
        }, 1000);
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        handleEndCall();
      }
    };
    
    return pc;
  }, [callId, otherUser.id, signalingSocket]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true,
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error("Failed to get media devices:", error);
      return null;
    }
  }, [callType]);

  const handleEndCall = useCallback(() => {
    setCallStatus("ended");
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (signalingSocket?.readyState === WebSocket.OPEN) {
      signalingSocket.send(JSON.stringify({
        type: "call-end",
        callId,
        targetUserId: otherUser.id,
      }));
    }
    
    onEnd();
  }, [callId, otherUser.id, signalingSocket, onEnd]);

  const handleSignalingMessage = useCallback(async (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    
    if (message.callId !== callId) return;
    
    const pc = peerConnectionRef.current;
    if (!pc) return;
    
    switch (message.type) {
      case "offer":
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signalingSocket?.send(JSON.stringify({
          type: "answer",
          callId,
          targetUserId: otherUser.id,
          payload: answer,
        }));
        break;
        
      case "answer":
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
        break;
        
      case "ice-candidate":
        if (message.payload) {
          await pc.addIceCandidate(new RTCIceCandidate(message.payload));
        }
        break;
        
      case "call-accept":
        setCallStatus("active");
        break;
        
      case "call-reject":
      case "call-end":
        handleEndCall();
        break;
        
      case "call-busy":
        setCallStatus("ended");
        onEnd();
        break;
    }
  }, [callId, otherUser.id, signalingSocket, handleEndCall, onEnd]);

  useEffect(() => {
    const initialize = async () => {
      const stream = await startLocalStream();
      if (!stream) return;
      
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      if (!isIncoming) {
        setCallStatus("ringing");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        signalingSocket?.send(JSON.stringify({
          type: "offer",
          callId,
          targetUserId: otherUser.id,
          payload: offer,
        }));
      }
    };
    
    initialize();
    
    if (signalingSocket) {
      signalingSocket.addEventListener("message", handleSignalingMessage);
    }
    
    return () => {
      if (signalingSocket) {
        signalingSocket.removeEventListener("message", handleSignalingMessage);
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callId, otherUser.id, isIncoming, signalingSocket, createPeerConnection, startLocalStream, handleSignalingMessage]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      <div className="flex-1 relative">
        {callType === "video" ? (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              data-testid="video-remote"
            />
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute bottom-4 right-4 w-32 h-24 md:w-48 md:h-36 rounded-lg border-2 border-purple-500 object-cover"
              data-testid="video-local"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white text-5xl font-bold">
                  {otherUser.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{otherUser.username}</h2>
              <p className="text-purple-300 flex items-center justify-center gap-2">
                {callStatus === "ringing" && (
                  <>
                    <PhoneOutgoing className="w-5 h-5 animate-pulse" />
                    Ringing...
                  </>
                )}
                {callStatus === "connecting" && (
                  <>Connecting...</>
                )}
                {callStatus === "active" && (
                  <>{formatDuration(callDuration)}</>
                )}
              </p>
              <audio ref={remoteVideoRef} autoPlay data-testid="audio-remote" />
            </div>
          </div>
        )}
        
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="bg-black/50 rounded-lg px-4 py-2">
            <p className="text-white font-semibold">{otherUser.username}</p>
            {callStatus === "active" && (
              <p className="text-purple-300 text-sm">{formatDuration(callDuration)}</p>
            )}
            {callStatus === "ringing" && (
              <p className="text-yellow-400 text-sm">Ringing...</p>
            )}
            {callStatus === "connecting" && (
              <p className="text-yellow-400 text-sm">Connecting...</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndCall}
            className="text-white hover:bg-white/20"
            data-testid="button-minimize-call"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      <div className="bg-slate-800 py-6 px-4">
        <div className="flex items-center justify-center gap-6">
          <Button
            onClick={toggleAudio}
            data-testid="button-toggle-audio"
            className={`w-14 h-14 rounded-full ${
              isAudioEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          {callType === "video" && (
            <Button
              onClick={toggleVideo}
              data-testid="button-toggle-video"
              className={`w-14 h-14 rounded-full ${
                isVideoEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </Button>
          )}
          
          <Button
            onClick={handleEndCall}
            data-testid="button-end-call"
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-7 h-7" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VideoCall;
