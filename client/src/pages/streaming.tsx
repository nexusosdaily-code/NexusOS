import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import VideoStreaming from "@/components/VideoStreaming";
import { 
  Radio, Eye, Plus, ArrowLeft, Users, Clock, 
  Play, Video, Trash2 
} from "lucide-react";

interface Stream {
  id: string;
  title: string;
  description?: string;
  status: string;
  viewerCount: number;
  quality: string;
  isPublic: boolean;
  startedAt?: string;
  createdAt: string;
  broadcaster?: {
    username: string;
  };
}

export default function StreamingPage() {
  const { user } = useAuth();
  const token = localStorage.getItem("authToken") || "";
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/streaming/:streamId");
  
  const [activeTab, setActiveTab] = useState<"browse" | "create" | "my-streams">("browse");
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [myStreams, setMyStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStream, setActiveStream] = useState<{ id: string; mode: "broadcaster" | "viewer" } | null>(null);
  
  const [newStreamTitle, setNewStreamTitle] = useState("");
  const [newStreamDescription, setNewStreamDescription] = useState("");
  const [newStreamIsPublic, setNewStreamIsPublic] = useState(true);

  useEffect(() => {
    fetchStreams();
  }, []);

  useEffect(() => {
    if (match && params?.streamId) {
      joinStreamAsViewer(params.streamId);
    }
  }, [match, params?.streamId]);

  const fetchStreams = async () => {
    setIsLoading(true);
    try {
      const [liveRes, myRes] = await Promise.all([
        fetch("/api/streams/live", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/streams/my", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        setLiveStreams(liveData.streams || []);
      }
      
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyStreams(myData.streams || []);
      }
    } catch (error) {
      console.error("Failed to fetch streams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createStream = async () => {
    if (!newStreamTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a stream title",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newStreamTitle,
          description: newStreamDescription,
          isPublic: newStreamIsPublic,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create stream");
      }

      const data = await res.json();
      
      toast({
        title: "Stream created",
        description: "Starting your broadcast...",
      });

      setActiveStream({ id: data.stream.id, mode: "broadcaster" });
      setNewStreamTitle("");
      setNewStreamDescription("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create stream",
        variant: "destructive",
      });
    }
  };

  const startBroadcast = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to start broadcast");
      }

      setActiveStream({ id: streamId, mode: "broadcaster" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start broadcast",
        variant: "destructive",
      });
    }
  };

  const joinStreamAsViewer = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Stream not found");
      }

      const data = await res.json();
      
      if (data.stream.status !== "live") {
        toast({
          title: "Stream not live",
          description: "This stream is not currently broadcasting",
          variant: "destructive",
        });
        return;
      }

      setActiveStream({ id: streamId, mode: "viewer" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join stream",
        variant: "destructive",
      });
    }
  };

  const endStream = async () => {
    if (!activeStream) return;

    try {
      await fetch(`/api/streams/${activeStream.id}/end`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Failed to end stream:", error);
    }

    setActiveStream(null);
    fetchStreams();
  };

  const deleteStream = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/${streamId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({
          title: "Stream deleted",
          description: "The stream has been removed",
        });
        fetchStreams();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete stream",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (startedAt: string) => {
    const start = new Date(startedAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (activeStream) {
    const stream = [...liveStreams, ...myStreams].find(s => s.id === activeStream.id);
    
    return (
      <div className="fixed inset-0 z-50 bg-slate-900">
        <VideoStreaming
          streamId={activeStream.id}
          mode={activeStream.mode}
          token={token || ""}
          streamTitle={stream?.title || "Live Stream"}
          onEnd={endStream}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Radio className="w-8 h-8 text-red-500" />
              Live Streaming
            </h1>
            <p className="text-slate-400 mt-1">Broadcast and watch live streams</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="bg-slate-800/50">
            <TabsTrigger value="browse" className="gap-2" data-testid="tab-browse">
              <Eye className="w-4 h-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2" data-testid="tab-create">
              <Plus className="w-4 h-4" />
              Create Stream
            </TabsTrigger>
            <TabsTrigger value="my-streams" className="gap-2" data-testid="tab-my-streams">
              <Video className="w-4 h-4" />
              My Streams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Live Now</h2>
              <Button variant="outline" size="sm" onClick={fetchStreams} data-testid="button-refresh">
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Loading streams...</div>
            ) : liveStreams.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Radio className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                  <p className="text-slate-400">No live streams right now</p>
                  <p className="text-slate-500 text-sm mt-1">Be the first to go live!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveStreams.map((stream) => (
                  <Card 
                    key={stream.id} 
                    className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors cursor-pointer"
                    onClick={() => joinStreamAsViewer(stream.id)}
                    data-testid={`card-stream-${stream.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-video bg-slate-900 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                        <Video className="w-12 h-12 text-slate-600" />
                        <Badge variant="destructive" className="absolute top-2 left-2 gap-1">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          LIVE
                        </Badge>
                        {stream.startedAt && (
                          <Badge variant="secondary" className="absolute top-2 right-2 gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(stream.startedAt)}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-white truncate" data-testid={`text-stream-title-${stream.id}`}>
                        {stream.title}
                      </h3>
                      <div className="flex items-center justify-between mt-2 text-sm text-slate-400">
                        <span>{stream.broadcaster?.username || "Anonymous"}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {stream.viewerCount}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create">
            <Card className="bg-slate-800/50 border-slate-700 max-w-lg">
              <CardHeader>
                <CardTitle className="text-white">Create New Stream</CardTitle>
                <CardDescription>Set up your broadcast settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white">Stream Title</Label>
                  <Input
                    id="title"
                    value={newStreamTitle}
                    onChange={(e) => setNewStreamTitle(e.target.value)}
                    placeholder="Enter a catchy title..."
                    className="bg-slate-900 border-slate-700"
                    data-testid="input-stream-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-white">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newStreamDescription}
                    onChange={(e) => setNewStreamDescription(e.target.value)}
                    placeholder="Tell viewers what your stream is about..."
                    className="bg-slate-900 border-slate-700 min-h-[100px]"
                    data-testid="input-stream-description"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="public" className="text-white">Public Stream</Label>
                  <Switch
                    id="public"
                    checked={newStreamIsPublic}
                    onCheckedChange={setNewStreamIsPublic}
                    data-testid="switch-public"
                  />
                </div>

                <Button
                  onClick={createStream}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                  data-testid="button-create-stream"
                >
                  <Radio className="w-5 h-5 mr-2" />
                  Create & Go Live
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-streams">
            <ScrollArea className="h-[600px]">
              {myStreams.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <Video className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">You haven't created any streams yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab("create")}
                      data-testid="button-create-first"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Stream
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myStreams.map((stream) => (
                    <Card key={stream.id} className="bg-slate-800/50 border-slate-700" data-testid={`card-my-stream-${stream.id}`}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{stream.title}</h3>
                            <Badge variant={stream.status === "live" ? "destructive" : "secondary"}>
                              {stream.status}
                            </Badge>
                          </div>
                          {stream.description && (
                            <p className="text-slate-400 text-sm mt-1 line-clamp-1">{stream.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>{stream.quality}</span>
                            <span>{stream.isPublic ? "Public" : "Private"}</span>
                            <span>Created {new Date(stream.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {stream.status === "pending" && (
                            <Button
                              onClick={() => startBroadcast(stream.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-start-${stream.id}`}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </Button>
                          )}
                          {stream.status === "live" && (
                            <Button
                              onClick={() => setActiveStream({ id: stream.id, mode: "broadcaster" })}
                              variant="outline"
                              data-testid={`button-resume-${stream.id}`}
                            >
                              Resume
                            </Button>
                          )}
                          {stream.status !== "live" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => deleteStream(stream.id)}
                              data-testid={`button-delete-${stream.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
