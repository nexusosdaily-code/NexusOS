import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import LiveCameraSwitchControl from "@/components/live-camera-switch-control";
import { switchLiveCamera } from "@/lib/switch-live-camera";
import { acceptMediaCandidate, mediaDiagnostic as formatMediaDiagnostic, newMediaEvidence, type MediaNegotiationEvidence } from "@/lib/live-media-diagnostics";
import { 
  Video, VideoOff, Mic, MicOff, Monitor, Camera, 
  Radio, Power, Users, Clock, Settings, 
  Circle, Square, Download, X, Maximize2, Minimize2
} from "lucide-react";

interface StreamSettings {
  quality: "480p" | "720p" | "1080p" | "4k";
  bitrate: number;
  frameRate: number;
  source: "camera" | "screen" | "both";
  recordingEnabled: boolean;
}

interface VideoStreamingProps {
  streamId: string;
  mode: "broadcaster" | "viewer";
  initialSource?: StreamSettings["source"];
  streamTitle?: string;
  onEnd?: () => void;
  onViewerCountChange?: (count: number) => void;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const QUALITY_PRESETS = {
  "480p": { width: 854, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

export function VideoStreaming({
  streamId,
  mode,
  initialSource = "camera",
  streamTitle = "Live Stream",
  onEnd,
  onViewerCountChange,
}: VideoStreamingProps) {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState<StreamSettings>({
    quality: "720p",
    bitrate: 2500,
    frameRate: 30,
    source: initialSource,
    recordingEnabled: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [receiveStatus, setReceiveStatus] = useState<"waiting" | "connecting" | "playing" | "failed">("waiting");
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mediaDiagnostic, setMediaDiagnostic] = useState("Waiting for a video connection");
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const [cameraSwitchError, setCameraSwitchError] = useState<string | null>(null);
  const switchingCameraRef = useRef(false);
  const cameraFacingRef = useRef<"user" | "environment">("user");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const websocketRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteDescriptionReadyRef = useRef<Set<string>>(new Set());
  const mediaEvidenceRef = useRef(new WeakMap<RTCPeerConnection, MediaNegotiationEvidence>());
  const incomingMediaRef = useRef<MediaStream | null>(null);
  const streamStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const endedRef = useRef(false);
  const mountedRef = useRef(true);
  const captureGenerationRef = useRef(0);
  const capturePendingRef = useRef(false);
  const notifyEnd = () => {
    if (!endedRef.current && mountedRef.current) {
      endedRef.current = true;
      onEndRef.current?.();
    }
  };

  const getMediaConstraints = useCallback(() => {
    const { width, height } = QUALITY_PRESETS[settings.quality];
    return {
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: settings.frameRate },
        facingMode: { ideal: "user" },
      },
      audio: true,
    };
  }, [settings.quality, settings.frameRate]);

  const startCameraStream = useCallback(async () => {
    const generation = captureGenerationRef.current;
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      cameraStreamRef.current = stream;
      cameraFacingRef.current = stream.getVideoTracks()[0]?.getSettings().facingMode === "environment" ? "environment" : "user";
      return stream;
    } catch (error: any) {
      console.error("Failed to get camera stream:", error);
      let msg = "Camera access failed.";
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Please allow camera access in your browser and try again.";
      } else if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        msg = "No camera found. Please connect a camera or switch to Screen Share.";
      } else if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
        msg = "Camera is already in use by another app. Close the other app and try again.";
      } else if (error?.name === "OverconstrainedError") {
        msg = "Camera does not support the requested quality. Try a lower quality setting.";
      } else if (error?.name === "SecurityError") {
        msg = "Camera access blocked by browser security policy. This page requires HTTPS.";
      }
      setCameraError(msg);
      return null;
    }
  }, [getMediaConstraints]);

  const startScreenStream = useCallback(async () => {
    const generation = captureGenerationRef.current;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          ...QUALITY_PRESETS[settings.quality],
          frameRate: settings.frameRate,
        },
        audio: true,
      });
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }
      screenStreamRef.current = stream;
      
      stream.getVideoTracks()[0].onended = () => {
        if (settings.source === "screen") {
          handleStopStream();
        } else if (settings.source === "both") {
          setSettings(prev => ({ ...prev, source: "camera" }));
          combineStreams();
        }
      };
      
      return stream;
    } catch (error) {
      console.error("Failed to get screen stream:", error);
      setCameraError("Screen sharing was denied or unavailable. Please allow screen access and try again.");
      return null;
    }
  }, [settings.quality, settings.frameRate, settings.source]);

  const combineStreams = useCallback(() => {
    const tracks: MediaStreamTrack[] = [];
    
    if (settings.source === "camera" && cameraStreamRef.current) {
      tracks.push(...cameraStreamRef.current.getTracks());
    } else if (settings.source === "screen" && screenStreamRef.current) {
      tracks.push(...screenStreamRef.current.getVideoTracks());
      if (cameraStreamRef.current) {
        tracks.push(...cameraStreamRef.current.getAudioTracks());
      }
    } else if (settings.source === "both") {
      if (screenStreamRef.current) {
        tracks.push(...screenStreamRef.current.getVideoTracks());
      }
      if (cameraStreamRef.current) {
        tracks.push(...cameraStreamRef.current.getAudioTracks());
      }
    }
    
    if (tracks.length > 0) {
      combinedStreamRef.current = new MediaStream(tracks);
      if (videoRef.current) {
        videoRef.current.srcObject = combinedStreamRef.current;
      }
    }
  }, [settings.source]);

  const connectWebSocket = useCallback(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/streaming?streamId=${encodeURIComponent(streamId)}&role=${mode}`;
    
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;
    
    ws.onopen = () => {
      setConnectionStatus("connected");
      console.log("Connected to streaming WebSocket");
      
      if (mode === "broadcaster") {
        ws.send(JSON.stringify({
          type: "broadcaster-ready",
          streamId,
        }));
      }
    };
    
    // WebSocket dispatch does not await async handlers. Keep SDP operations in
    // order; mobile peers can trickle ICE while setRemoteDescription is pending.
    let signaling = Promise.resolve();
    ws.onmessage = (event) => {
      signaling = signaling.then(async () => {
      if (websocketRef.current !== ws || ws.readyState !== WebSocket.OPEN || !mountedRef.current) return;
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case "viewer-count":
          setViewerCount(message.count);
          onViewerCountChange?.(message.count);
          break;
          
        case "viewer-joined":
          setViewerCount(message.viewerCount);
          onViewerCountChange?.(message.viewerCount);
          if (mode === "broadcaster") {
            await createPeerConnectionForViewer(message.viewerId);
          }
          break;
          
        case "viewer-left":
          setViewerCount(message.viewerCount);
          onViewerCountChange?.(message.viewerCount);
          const pc = peerConnectionsRef.current.get(message.viewerId);
          if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(message.viewerId);
            pendingIceRef.current.delete(message.viewerId);
            remoteDescriptionReadyRef.current.delete(message.viewerId);
          }
          break;
          
        case "broadcaster-ready":
          if (mode === "viewer") {
            setReceiveStatus("connecting");
          }
          break;
          
        case "offer":
          if (mode === "viewer") {
            await handleOffer(message);
          }
          break;
          
        case "answer":
          if (mode === "broadcaster") {
            const peerConnection = peerConnectionsRef.current.get(message.fromUserId);
            if (peerConnection) {
              evidenceFor(peerConnection).phase = "applying answer";
              await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
              if (!peerIsActive(message.fromUserId, peerConnection)) return;
              evidenceFor(peerConnection).phase = "answer applied";
              await flushIce(message.fromUserId, peerConnection);
            }
          }
          break;
          
        case "ice-candidate":
          const peerKey = mode === "broadcaster" ? message.fromUserId : "broadcaster";
          const targetPc = peerConnectionsRef.current.get(peerKey);
          if (message.payload) {
            if (targetPc && remoteDescriptionReadyRef.current.has(peerKey)) {
              await acceptMediaCandidate(targetPc, message.payload, evidenceFor(targetPc));
            } else {
              const pending = pendingIceRef.current.get(peerKey) ?? [];
              if (pending.length >= 128) throw new Error("Too many pending media candidates");
              pending.push(message.payload);
              pendingIceRef.current.set(peerKey, pending);
            }
          }
          break;
          
        case "stream-settings-update":
          console.log("Stream settings updated:", message.payload);
          break;
          
        case "stream-ended":
          handleStreamEnded(message.reason);
          break;
      }
      }).catch(() => {
        if (websocketRef.current !== ws || !mountedRef.current) return;
        setReceiveError("The video connection could not be negotiated. Leave and rejoin the broadcast.");
        setReceiveStatus("failed");
      });
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("disconnected");
    };
    
    ws.onclose = () => {
      setConnectionStatus("disconnected");
      // Revoked sessions/invitations must terminate the media path, not merely
      // stop signaling while an already-negotiated RTC connection keeps playing.
      stopAllStreams();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (videoRef.current) videoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setIsLive(false);
      notifyEnd();
      console.log("Disconnected from streaming WebSocket");
    };
    
    return ws;
  }, [streamId, mode, onViewerCountChange]);

  const evidenceFor = (pc: RTCPeerConnection) => {
    let evidence = mediaEvidenceRef.current.get(pc);
    if (!evidence) {
      evidence = newMediaEvidence();
      mediaEvidenceRef.current.set(pc, evidence);
    }
    return evidence;
  };

  const peerIsActive = (key: string, pc: RTCPeerConnection) =>
    mountedRef.current && peerConnectionsRef.current.get(key) === pc &&
    websocketRef.current?.readyState === WebSocket.OPEN;

  const flushIce = async (key: string, pc: RTCPeerConnection) => {
    remoteDescriptionReadyRef.current.add(key);
    const pending = pendingIceRef.current.get(key) ?? [];
    pendingIceRef.current.delete(key);
    for (const candidate of pending) {
      if (!peerIsActive(key, pc)) return;
      await acceptMediaCandidate(pc, candidate, evidenceFor(pc));
    }
  };

  const createPeerConnectionForViewer = async (viewerId: string) => {
    peerConnectionsRef.current.get(viewerId)?.close();
    remoteDescriptionReadyRef.current.delete(viewerId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(viewerId, pc);
    
    pc.onicecandidate = (event) => {
      if (!peerIsActive(viewerId, pc)) return;
      if (event.candidate?.candidate) evidenceFor(pc).localCandidates++;
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: "ice-candidate",
          streamId,
          targetViewerId: viewerId,
          payload: event.candidate,
        }));
      }
    };
    
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, combinedStreamRef.current!);
      });
    }
    
    evidenceFor(pc).phase = "creating offer";
    const offer = await pc.createOffer();
    if (!peerIsActive(viewerId, pc)) return;
    evidenceFor(pc).phase = "setting local offer";
    await pc.setLocalDescription(offer);
    if (!peerIsActive(viewerId, pc)) return;
    evidenceFor(pc).phase = "awaiting answer";
    
    websocketRef.current?.send(JSON.stringify({
      type: "offer",
      streamId,
      targetViewerId: viewerId,
      payload: offer,
    }));
  };

  const handleOffer = async (message: any) => {
    peerConnectionsRef.current.get("broadcaster")?.close();
    remoteDescriptionReadyRef.current.delete("broadcaster");
    setReceiveStatus("connecting");
    setReceiveError(null);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set("broadcaster", pc);
    
    pc.onicecandidate = (event) => {
      if (!peerIsActive("broadcaster", pc)) return;
      if (event.candidate?.candidate) evidenceFor(pc).localCandidates++;
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: "ice-candidate",
          streamId,
          payload: event.candidate,
        }));
      }
    };
    
    pc.ontrack = (event) => {
      if (!mountedRef.current || peerConnectionsRef.current.get("broadcaster") !== pc) return;
      // Safari may deliver streamless tracks. Retain both audio and video rather
      // than replacing srcObject with an absent event.streams[0].
      const media = incomingMediaRef.current ?? new MediaStream();
      incomingMediaRef.current = media;
      if (!media.getTracks().some(track => track.id === event.track.id)) media.addTrack(event.track);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = media;
        // Muted autoplay is permitted on mobile; sound is an explicit gesture.
        void remoteVideoRef.current.play()?.catch(() => {
          if (mountedRef.current) setReceiveError("Tap Play video to start playback.");
        });
      }
    };
    pc.onconnectionstatechange = () => {
      if (peerConnectionsRef.current.get("broadcaster") !== pc) return;
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setIsLive(false);
        setReceiveStatus("failed");
        setReceiveError("Video cannot reach this device. Try both devices on the same Wi-Fi, then leave and rejoin. Some networks require a relay that is not configured yet.");
      }
    };
    
    evidenceFor(pc).phase = "applying offer";
    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
    if (!peerIsActive("broadcaster", pc)) return;
    evidenceFor(pc).phase = "offer applied";
    await flushIce("broadcaster", pc);
    if (!peerIsActive("broadcaster", pc)) return;
    evidenceFor(pc).phase = "creating answer";
    const answer = await pc.createAnswer();
    if (!peerIsActive("broadcaster", pc)) return;
    evidenceFor(pc).phase = "setting local answer";
    await pc.setLocalDescription(answer);
    if (!peerIsActive("broadcaster", pc)) return;
    evidenceFor(pc).phase = "answer sent";
    
    websocketRef.current?.send(JSON.stringify({
      type: "answer",
      streamId,
      payload: answer,
    }));
  };

  const handleStreamEnded = (reason?: string) => {
    setIsLive(false);
    stopAllStreams();
    websocketRef.current?.close();
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    if (reason === "broadcaster-disconnected") {
      console.log("Broadcaster disconnected");
    }
    
    notifyEnd();
  };

  const handleStartStream = async () => {
    if (capturePendingRef.current) return;
    capturePendingRef.current = true;
    try {
      const generation = captureGenerationRef.current;
      endedRef.current = false;
      setConnectionStatus("connecting");
      setCameraError(null);

      if (settings.source === "camera" || settings.source === "both") {
        const camStream = await startCameraStream();
        if (!mountedRef.current || generation !== captureGenerationRef.current) return;
        // If camera is required and failed — abort with clear error shown in UI
        if (!camStream && settings.source === "camera") {
          setConnectionStatus("disconnected");
          return; // cameraError state is already set by startCameraStream
        }
      }
      if (settings.source === "screen" || settings.source === "both") {
        const screenStream = await startScreenStream();
        if (!mountedRef.current || generation !== captureGenerationRef.current) return;
        if (!screenStream && settings.source === "screen") {
          setConnectionStatus("disconnected");
          return;
        }
      }

      // Verify we have at least one track before going live
      combineStreams();
      if (!combinedStreamRef.current || combinedStreamRef.current.getTracks().length === 0) {
        setCameraError("Could not start any media stream. Please check your camera/screen share permissions.");
        setConnectionStatus("disconnected");
        return;
      }

      // Creating a channel leaves it pending. Publish it only after capture
      // succeeds, before advertising LIVE or opening RTC signaling.
      const started = await fetch(`/api/streams/${encodeURIComponent(streamId)}/start`, {
        method: "POST", credentials: "include",
      });
      if (!started.ok) throw new Error(`Could not start broadcast (${started.status}). Please try again.`);
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        // An end/unmount may race the server's start response. Do not leave a
        // channel advertised as live after its capture has already been stopped.
        await fetch(`/api/streams/${encodeURIComponent(streamId)}/end`, {
          method: "POST", credentials: "include",
        }).catch(() => {});
        return;
      }

      connectWebSocket();

      setIsLive(true);
      streamStartTimeRef.current = Date.now();

      durationIntervalRef.current = window.setInterval(() => {
        if (streamStartTimeRef.current) {
          setDuration(Math.floor((Date.now() - streamStartTimeRef.current) / 1000));
        }
      }, 1000);

      if (settings.recordingEnabled) {
        startRecording();
      }
    } catch (error) {
      stopAllStreams();
      websocketRef.current?.close();
      setIsLive(false);
      setConnectionStatus("disconnected");
      if (mountedRef.current) {
        setCameraError(error instanceof Error ? error.message : "Could not start broadcast. Please try again.");
      }
    } finally {
      capturePendingRef.current = false;
    }
  };

  const handleStopStream = useCallback(() => {
    if (mode === "broadcaster") {
      websocketRef.current?.send(JSON.stringify({
        type: "stream-ended",
        streamId,
      }));
    }
    
    if (isRecording) {
      stopRecording();
    }
    
    stopAllStreams();
    websocketRef.current?.close();
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    setIsLive(false);
    notifyEnd();
  }, [streamId, isRecording, onEnd, mode]);

  const handleLeaveStream = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: "leave-stream",
        streamId,
      }));
    }
    stopAllStreams();
    websocketRef.current?.close();
    setIsLive(false);
    notifyEnd();
  }, [streamId, onEnd]);

  const stopAllStreams = () => {
    captureGenerationRef.current++;
    if (durationIntervalRef.current !== null) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    streamStartTimeRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (videoRef.current) videoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    combinedStreamRef.current?.getTracks().forEach(track => track.stop());
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    pendingIceRef.current.clear();
    remoteDescriptionReadyRef.current.clear();
    incomingMediaRef.current = null;
    
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    combinedStreamRef.current = null;
  };

  const toggleVideo = () => {
    if (combinedStreamRef.current) {
      const videoTrack = combinedStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleSwitchCamera = async () => {
    if (switchingCameraRef.current || mode !== "broadcaster" || !isLive ||
        settings.source !== "camera" || mediaRecorderRef.current?.state === "recording") return;
    const camera = cameraStreamRef.current, combined = combinedStreamRef.current;
    if (!camera || !combined) return;
    switchingCameraRef.current = true;
    setSwitchingCamera(true);
    setCameraSwitchError(null);
    const generation = captureGenerationRef.current;
    const isCurrent = () => mountedRef.current && generation === captureGenerationRef.current;
    try {
      const { video } = getMediaConstraints();
      const facing = await switchLiveCamera({
        camera, combined, peers: peerConnectionsRef.current,
        constraints: video, facing: cameraFacingRef.current, isCurrent,
        publishCamera: stream => { cameraStreamRef.current = stream; },
      });
      if (isCurrent()) cameraFacingRef.current = facing;
    } catch (error) {
      if (isCurrent()) setCameraSwitchError(error instanceof Error ? error.message : "Could not switch cameras.");
    } finally {
      switchingCameraRef.current = false;
      if (mountedRef.current) setSwitchingCamera(false);
    }
  };

  const toggleAudio = () => {
    if (combinedStreamRef.current) {
      const audioTrack = combinedStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const startRecording = () => {
    if (!combinedStreamRef.current) return;
    
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(combinedStreamRef.current, {
      mimeType: "video/webm;codecs=vp9",
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
    };
    
    mediaRecorder.start(1000);
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stream-${streamId}-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const updateStreamSettings = (newSettings: Partial<StreamSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      if (websocketRef.current?.readyState === WebSocket.OPEN && mode === "broadcaster") {
        websocketRef.current.send(JSON.stringify({
          type: "stream-settings-update",
          streamId,
          payload: updated,
        }));
      }
      
      return updated;
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    endedRef.current = false;
    if (mode === "viewer") {
      connectWebSocket();
    }
    
    return () => {
      mountedRef.current = false;
      if (mode === "viewer" && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: "leave-stream",
          streamId,
        }));
      }
      stopAllStreams();
      websocketRef.current?.close();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [mode, streamId, connectWebSocket]);

  useEffect(() => {
    if (mode !== "viewer" || receiveStatus === "playing" || receiveStatus === "failed") return;
    const timeout = window.setTimeout(() => {
      setReceiveStatus("failed");
      setReceiveError("No video has arrived. Leave and rejoin; if it still fails, try both devices on the same Wi-Fi. This connection currently has no relay fallback.");
    }, 20_000);
    return () => window.clearTimeout(timeout);
  }, [mode, streamId, receiveStatus]);

  useEffect(() => {
    let active = true;
    let reading = false;
    const sample = async () => {
      if (reading) return;
      reading = true;
      try {
        const summaries: string[] = [];
        for (const [key, pc] of peerConnectionsRef.current) {
          if (!pc.getStats) continue;
          const stats = await pc.getStats();
          if (active && peerConnectionsRef.current.get(key) === pc) {
            summaries.push(formatMediaDiagnostic(pc, stats, evidenceFor(pc), mode === "viewer"));
          }
        }
        if (active && summaries.length) {
          setMediaDiagnostic(summaries.map((summary, index) =>
            mode === "viewer" ? summary : `Receiver ${index + 1}: ${summary}`).join("\n"));
        }
      } catch {
        // A closing peer can reject its last stats sample. Never expose SDP,
        // network addresses, candidate pairs or private identities here.
      } finally { reading = false; }
    };
    const interval = window.setInterval(() => { void sample(); }, 2_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [mode, streamId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 flex flex-col" data-testid="video-streaming-container">
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLive && (
            <Badge variant="destructive" className="gap-1 animate-pulse" data-testid="badge-live">
              <Circle className="w-2 h-2 fill-current" />
              LIVE
            </Badge>
          )}
          <span className="text-white font-semibold bg-black/50 px-3 py-1 rounded" data-testid="text-stream-title">
            {streamTitle}
          </span>
          <Badge variant="secondary" className="gap-1" data-testid="badge-viewers">
            <Users className="w-3 h-3" />
            {viewerCount}
          </Badge>
          {isLive && (
            <Badge variant="outline" className="gap-1 text-white border-white/30" data-testid="badge-duration">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </Badge>
          )}
          {isRecording && (
            <Badge variant="destructive" className="gap-1" data-testid="badge-recording">
              <Circle className="w-2 h-2 fill-current" />
              REC
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {mode === "broadcaster" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white hover:bg-white/20"
              data-testid="button-settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={mode === "broadcaster" ? handleStopStream : handleLeaveStream}
            className="text-white hover:bg-white/20"
            data-testid="button-close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {mode === "broadcaster" ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            data-testid="video-broadcaster"
          />
        ) : (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={!soundEnabled}
            onPlaying={() => {
              setReceiveStatus("playing");
              setReceiveError(null);
              setIsLive(true);
            }}
            className="w-full h-full object-contain"
            data-testid="video-viewer"
          />
        )}
        {mode === "viewer" && receiveStatus === "playing" && (
          <Button
            className="absolute bottom-4 left-4 z-20"
            data-testid="button-stream-sound"
            onClick={() => {
              const video = remoteVideoRef.current;
              if (!video) return;
              const enabled = !soundEnabled;
              video.muted = !enabled;
              setSoundEnabled(enabled);
              void video.play()?.catch(() => setReceiveError("Tap Play video to resume playback."));
            }}
          >
            {soundEnabled ? "Mute sound" : "Enable sound"}
          </Button>
        )}
        {(mode === "viewer" || isLive) && (
          <p className="absolute bottom-16 left-4 right-4 z-20 rounded bg-black/70 px-3 py-2 text-xs text-white pointer-events-none whitespace-pre-line max-h-32 overflow-y-auto" data-testid="stream-media-diagnostic">
            {mediaDiagnostic}
          </p>
        )}
        
        {!isLive && mode === "broadcaster" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 overflow-y-auto py-8">
            <Card className="w-full max-w-md bg-slate-800 border-purple-500/50 mx-4">
              <CardHeader>
                <CardTitle className="text-white text-center flex items-center justify-center gap-2">
                  <Radio className="w-5 h-5 text-cyan-400" />
                  Start Streaming
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera error banner */}
                {cameraError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 space-y-2" data-testid="camera-error-banner">
                    <div className="flex items-start gap-2">
                      <VideoOff className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-400">Camera not connected</p>
                        <p className="text-xs text-red-300/80 mt-0.5">{cameraError}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { setCameraError(null); updateStreamSettings({ source: "screen" }); }}
                        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-1"
                      >
                        <Monitor className="w-3 h-3" /> Use screen share instead
                      </button>
                      <button
                        onClick={() => setCameraError(null)}
                        className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={settings.source === "camera" ? "default" : "outline"}
                    onClick={() => { setCameraError(null); updateStreamSettings({ source: "camera" }); }}
                    className="flex-col h-auto py-4"
                    data-testid="button-source-camera"
                  >
                    <Camera className="w-6 h-6 mb-2" />
                    Camera
                  </Button>
                  <Button
                    variant={settings.source === "screen" ? "default" : "outline"}
                    onClick={() => updateStreamSettings({ source: "screen" })}
                    className="flex-col h-auto py-4"
                    data-testid="button-source-screen"
                  >
                    <Monitor className="w-6 h-6 mb-2" />
                    Screen
                  </Button>
                  <Button
                    variant={settings.source === "both" ? "default" : "outline"}
                    onClick={() => updateStreamSettings({ source: "both" })}
                    className="flex-col h-auto py-4"
                    data-testid="button-source-both"
                  >
                    <Video className="w-6 h-6 mb-2" />
                    Both
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Quality</Label>
                  <Select
                    value={settings.quality}
                    onValueChange={(value: StreamSettings["quality"]) => updateStreamSettings({ quality: value })}
                  >
                    <SelectTrigger data-testid="select-quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p (SD)</SelectItem>
                      <SelectItem value="720p">720p (HD)</SelectItem>
                      <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                      <SelectItem value="4k">4K (Ultra HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Bitrate: {settings.bitrate} kbps</Label>
                  <Slider
                    value={[settings.bitrate]}
                    min={500}
                    max={20000}
                    step={100}
                    onValueChange={([value]) => updateStreamSettings({ bitrate: value })}
                    data-testid="slider-bitrate"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Frame Rate: {settings.frameRate} fps</Label>
                  <Slider
                    value={[settings.frameRate]}
                    min={15}
                    max={60}
                    step={5}
                    onValueChange={([value]) => updateStreamSettings({ frameRate: value })}
                    data-testid="slider-framerate"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-white">Enable Recording</Label>
                  <Switch
                    checked={settings.recordingEnabled}
                    onCheckedChange={(checked) => updateStreamSettings({ recordingEnabled: checked })}
                    data-testid="switch-recording"
                  />
                </div>
                
                <Button
                  onClick={handleStartStream}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                  data-testid="button-go-live"
                >
                  <Radio className="w-5 h-5 mr-2" />
                  Go Live
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        
        {mode === "viewer" && (receiveStatus !== "playing" || receiveError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center animate-pulse">
                <Radio className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-white text-lg mb-2" data-testid="stream-receive-status">
                {receiveError ?? (receiveStatus === "connecting" ? "Connecting video..." : "Waiting for video...")}
              </p>
              <p className="text-slate-400 text-sm">A live room does not confirm video delivery.</p>
              <Button className="mt-4" data-testid="button-play-stream" onClick={() => {
                void remoteVideoRef.current?.play()?.catch(() => setReceiveError("Playback is unavailable. Leave and rejoin the broadcast."));
              }}>Play video</Button>
            </div>
          </div>
        )}
      </div>

      {showSettings && isLive && mode === "broadcaster" && (
        <div className="absolute top-16 right-4 z-20">
          <Card className="w-72 bg-slate-800 border-purple-500/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Stream Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-white text-xs">Bitrate: {settings.bitrate} kbps</Label>
                <Slider
                  value={[settings.bitrate]}
                  min={500}
                  max={20000}
                  step={100}
                  onValueChange={([value]) => updateStreamSettings({ bitrate: value })}
                  data-testid="slider-bitrate-live"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-white text-xs">Frame Rate: {settings.frameRate} fps</Label>
                <Slider
                  value={[settings.frameRate]}
                  min={15}
                  max={60}
                  step={5}
                  onValueChange={([value]) => updateStreamSettings({ frameRate: value })}
                  data-testid="slider-framerate-live"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLive && (
        <div className="bg-slate-800 py-4 px-4">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              onClick={toggleAudio}
              data-testid="button-toggle-audio"
              className={`w-12 h-12 rounded-full ${
                isAudioEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
              onClick={toggleVideo}
              disabled={switchingCamera}
              data-testid="button-toggle-video"
              className={`w-12 h-12 rounded-full ${
                isVideoEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            {mode === "broadcaster" && (
              <>
                {settings.source === "camera" && (
                  <LiveCameraSwitchControl
                    onSwitch={handleSwitchCamera}
                    switching={switchingCamera}
                    disabled={!isLive}
                    error={cameraSwitchError}
                    recording={isRecording}
                  />
                )}
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={switchingCamera}
                  data-testid="button-toggle-recording"
                  className={`w-12 h-12 rounded-full ${
                    isRecording ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-slate-700 hover:bg-slate-600"
                  }`}
                >
                  {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </Button>
                
                {recordedBlob && (
                  <Button
                    onClick={downloadRecording}
                    data-testid="button-download-recording"
                    className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-5 h-5" />
                  </Button>
                )}
                
                <Button
                  onClick={handleStopStream}
                  data-testid="button-end-stream"
                  className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
                >
                  <Power className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoStreaming;
