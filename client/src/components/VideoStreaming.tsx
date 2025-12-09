import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  token: string;
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
  token,
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
    source: "camera",
    recordingEnabled: false,
  });
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
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
  const streamStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  const getMediaConstraints = useCallback(() => {
    const { width, height } = QUALITY_PRESETS[settings.quality];
    return {
      video: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: settings.frameRate },
      },
      audio: true,
    };
  }, [settings.quality, settings.frameRate]);

  const startCameraStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      cameraStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Failed to get camera stream:", error);
      return null;
    }
  }, [getMediaConstraints]);

  const startScreenStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          ...QUALITY_PRESETS[settings.quality],
          frameRate: settings.frameRate,
        },
        audio: true,
      });
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
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/streaming?token=${token}&streamId=${streamId}&role=${mode}`;
    
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
    
    ws.onmessage = async (event) => {
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
          }
          break;
          
        case "broadcaster-ready":
          if (mode === "viewer") {
            setIsLive(true);
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
              await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
            }
          }
          break;
          
        case "ice-candidate":
          const targetPc = mode === "broadcaster" 
            ? peerConnectionsRef.current.get(message.fromUserId)
            : peerConnectionsRef.current.get("broadcaster");
          if (targetPc && message.payload) {
            await targetPc.addIceCandidate(new RTCIceCandidate(message.payload));
          }
          break;
          
        case "stream-settings-update":
          console.log("Stream settings updated:", message.payload);
          break;
          
        case "stream-ended":
          handleStreamEnded(message.reason);
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("disconnected");
    };
    
    ws.onclose = () => {
      setConnectionStatus("disconnected");
      console.log("Disconnected from streaming WebSocket");
    };
    
    return ws;
  }, [token, streamId, mode, onViewerCountChange]);

  const createPeerConnectionForViewer = async (viewerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(viewerId, pc);
    
    pc.onicecandidate = (event) => {
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
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    websocketRef.current?.send(JSON.stringify({
      type: "offer",
      streamId,
      targetViewerId: viewerId,
      payload: offer,
    }));
  };

  const handleOffer = async (message: any) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set("broadcaster", pc);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: "ice-candidate",
          streamId,
          payload: event.candidate,
        }));
      }
    };
    
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setIsLive(true);
    };
    
    await pc.setRemoteDescription(new RTCSessionDescription(message.payload));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
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
    
    onEnd?.();
  };

  const handleStartStream = async () => {
    setConnectionStatus("connecting");
    
    if (settings.source === "camera" || settings.source === "both") {
      await startCameraStream();
    }
    if (settings.source === "screen" || settings.source === "both") {
      await startScreenStream();
    }
    
    combineStreams();
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
    onEnd?.();
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
    onEnd?.();
  }, [streamId, onEnd]);

  const stopAllStreams = () => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    combinedStreamRef.current?.getTracks().forEach(track => track.stop());
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    
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
    if (mode === "viewer") {
      connectWebSocket();
    }
    
    return () => {
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
            className="w-full h-full object-contain"
            data-testid="video-viewer"
          />
        )}
        
        {!isLive && mode === "broadcaster" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <Card className="w-full max-w-md bg-slate-800 border-purple-500/50">
              <CardHeader>
                <CardTitle className="text-white text-center">Start Streaming</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={settings.source === "camera" ? "default" : "outline"}
                    onClick={() => updateStreamSettings({ source: "camera" })}
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
        
        {!isLive && mode === "viewer" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center animate-pulse">
                <Radio className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-white text-lg mb-2">Waiting for stream...</p>
              <p className="text-slate-400 text-sm">The broadcaster will start shortly</p>
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
          <div className="flex items-center justify-center gap-4">
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
              data-testid="button-toggle-video"
              className={`w-12 h-12 rounded-full ${
                isVideoEnabled ? "bg-slate-700 hover:bg-slate-600" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>
            
            {mode === "broadcaster" && (
              <>
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
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
