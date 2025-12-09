import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, MessageSquare, Inbox as InboxIcon, Eye, Lock, Unlock, PenSquare, ArrowLeft, Waves, Radio } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface Friend {
  id: string;
  username: string;
}

interface InboxMessage {
  id: string;
  sender: { id: string; username: string };
  content: string | null;
  hasEncoding: boolean;
  totalLambdaMass: string | null;
  isRead: boolean;
  isDecoded: boolean;
  createdAt: string;
  readAt: string | null;
}

interface SentMessage {
  id: string;
  recipient: { id: string; username: string };
  content: string;
  hasEncoding: boolean;
  totalLambdaMass: string | null;
  isRead: boolean;
  createdAt: string;
}

interface MessageDetail {
  id: string;
  senderId: string;
  recipientId: string;
  content: string | null;
  encodedFrames: any[] | null;
  totalLambdaMass: string | null;
  spectralHash: string | null;
  wavelengthMin: string | null;
  wavelengthMax: string | null;
  intensity: number;
  cycles: number;
  isRead: boolean;
  isDecoded: boolean;
  createdAt: string;
  readAt: string | null;
  hasEncoding?: boolean;
}

interface FriendsData {
  friends: { id: string; username: string }[];
}

export default function InboxPage() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendsData } = useQuery<FriendsData>({
    queryKey: ["/api/friends"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load friends");
      return res.json();
    },
  });

  const { data: inboxData, isLoading: inboxLoading } = useQuery<{ messages: InboxMessage[] }>({
    queryKey: ["/api/messages/inbox"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/messages/inbox", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load inbox");
      return res.json();
    },
  });

  const { data: sentData, isLoading: sentLoading } = useQuery<{ messages: SentMessage[] }>({
    queryKey: ["/api/messages/sent"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/messages/sent", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load sent");
      return res.json();
    },
  });

  const { data: messageDetail, isLoading: detailLoading } = useQuery<{ message: MessageDetail; isRecipient: boolean; isSender: boolean }>({
    queryKey: ["/api/messages", selectedMessage],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/messages/${selectedMessage}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load message");
      return res.json();
    },
    enabled: !!selectedMessage,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ recipientId, content }: { recipientId: string; content: string }) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId, content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message Sent", description: "Your lambda-encoded message was transmitted" });
      setComposeOpen(false);
      setSelectedRecipient("");
      setMessageContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages/sent"] });
    },
    onError: (error: Error) => {
      toast({ title: "Send Failed", description: error.message, variant: "destructive" });
    },
  });

  const decodeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/messages/${messageId}/decode`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to decode");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message Decoded", description: "The spectral content has been revealed" });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedMessage] });
    },
    onError: (error: Error) => {
      toast({ title: "Decode Failed", description: error.message, variant: "destructive" });
    },
  });

  const unreadCount = inboxData?.messages.filter(m => !m.isRead).length || 0;

  const renderSpectralVisualization = (frames: any[]) => {
    if (!frames || frames.length === 0) return null;
    
    return (
      <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-purple-500/20">
        <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
          <Waves className="w-4 h-4" />
          Spectral Encoding
        </h4>
        <div className="flex flex-wrap gap-1">
          {frames.slice(0, 50).map((frame: any, i: number) => {
            const wavelength = frame.wavelength || frame.λ || 550;
            const hue = Math.round(((wavelength - 380) / (780 - 380)) * 270);
            return (
              <div
                key={i}
                className="w-3 h-8 rounded-sm"
                style={{ backgroundColor: `hsl(${hue}, 80%, 50%)` }}
                title={`${frame.char || frame.character}: ${wavelength.toFixed(1)}nm`}
              />
            );
          })}
          {frames.length > 50 && (
            <div className="flex items-center text-purple-400 text-xs ml-2">
              +{frames.length - 50} more
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedMessage && messageDetail) {
    const msg = messageDetail.message;
    const senderName = inboxData?.messages.find(m => m.id === selectedMessage)?.sender.username ||
                       sentData?.messages.find(m => m.id === selectedMessage)?.recipient.username ||
                       "Unknown";
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedMessage(null)}
            className="text-purple-300 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Messages
          </Button>

          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    {messageDetail.isSender ? `To: ${senderName}` : `From: ${senderName}`}
                  </CardTitle>
                  <CardDescription className="text-purple-300">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!!msg.encodedFrames && (
                    <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                      <Radio className="w-3 h-3 mr-1" />
                      Lambda Encoded
                    </Badge>
                  )}
                  {msg.isDecoded ? (
                    <Badge className="bg-green-600">
                      <Unlock className="w-3 h-3 mr-1" />
                      Decoded
                    </Badge>
                  ) : messageDetail.isRecipient ? (
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                      <Lock className="w-3 h-3 mr-1" />
                      Encrypted
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {msg.totalLambdaMass && (
                <div className="flex items-center gap-4 text-sm text-purple-300">
                  <span>Lambda Mass: {parseFloat(msg.totalLambdaMass).toExponential(4)} kg</span>
                  {msg.wavelengthMin && msg.wavelengthMax && (
                    <span>
                      Spectrum: {parseFloat(msg.wavelengthMin).toFixed(1)}nm - {parseFloat(msg.wavelengthMax).toFixed(1)}nm
                    </span>
                  )}
                </div>
              )}

              {messageDetail.isRecipient && !msg.isDecoded ? (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                  <p className="text-purple-300 mb-4">This message is encrypted with spectral encoding</p>
                  <Button
                    onClick={() => decodeMutation.mutate(msg.id)}
                    disabled={decodeMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-decode"
                  >
                    {decodeMutation.isPending ? "Decoding..." : "Decode Message"}
                  </Button>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-white whitespace-pre-wrap" data-testid="text-message-content">
                    {msg.content}
                  </p>
                </div>
              )}

              {msg.encodedFrames && renderSpectralVisualization(msg.encodedFrames)}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Mail className="w-8 h-8 text-purple-400" />
              Lambda Messages
            </h1>
            <p className="text-purple-300 mt-1">Spectrally encoded friend-to-friend messaging</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700" data-testid="button-compose">
                  <PenSquare className="w-4 h-4 mr-2" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-purple-500/30">
                <DialogHeader>
                  <DialogTitle className="text-white">New Lambda Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-purple-300">Recipient</Label>
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger className="bg-slate-800/50 border-purple-500/30 text-white" data-testid="select-recipient">
                        <SelectValue placeholder="Select a friend" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-purple-500/30">
                        {friendsData?.friends.map(friend => (
                          <SelectItem key={friend.id} value={friend.id} className="text-white">
                            {friend.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-purple-300">Message</Label>
                    <Textarea
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Enter your message to be lambda-encoded..."
                      className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-slate-500 min-h-[120px]"
                      data-testid="input-message"
                    />
                  </div>
                  <p className="text-xs text-purple-400">
                    Your message will be encoded using the Lambda Spectral Protocol before transmission.
                  </p>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" className="border-purple-500/30 text-purple-300">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      if (selectedRecipient && messageContent) {
                        sendMutation.mutate({ recipientId: selectedRecipient, content: messageContent });
                      }
                    }}
                    disabled={!selectedRecipient || !messageContent || sendMutation.isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-send"
                  >
                    {sendMutation.isPending ? "Encoding..." : "Send Message"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Link href="/">
              <Button variant="outline" className="border-purple-500/30 text-purple-300" data-testid="button-back-home">
                Back to NexusOS
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-purple-500/30">
            <TabsTrigger value="inbox" data-testid="tab-inbox" className="data-[state=active]:bg-purple-600">
              <InboxIcon className="w-4 h-4 mr-2" />
              Inbox ({inboxData?.messages.length || 0})
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" data-testid="tab-sent" className="data-[state=active]:bg-purple-600">
              <Send className="w-4 h-4 mr-2" />
              Sent ({sentData?.messages.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="mt-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {inboxLoading ? (
                  <div className="text-center py-8 text-purple-300">Loading messages...</div>
                ) : !inboxData?.messages.length ? (
                  <Card className="bg-black/40 border-purple-500/30">
                    <CardContent className="py-8 text-center">
                      <InboxIcon className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                      <p className="text-purple-300">No messages yet</p>
                      <p className="text-slate-500 text-sm mt-1">Messages from friends will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  inboxData.messages.map((message) => (
                    <Card
                      key={message.id}
                      data-testid={`card-message-${message.id}`}
                      className={`bg-black/40 border-purple-500/30 cursor-pointer transition-all hover:border-purple-400/50 ${
                        !message.isRead ? "border-l-4 border-l-purple-500" : ""
                      }`}
                      onClick={() => setSelectedMessage(message.id)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-bold">
                                {message.sender.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className={`font-semibold ${!message.isRead ? "text-white" : "text-slate-300"}`}>
                                {message.sender.username}
                              </h3>
                              <p className="text-sm text-purple-300">
                                {message.isDecoded 
                                  ? (message.content?.slice(0, 50) + (message.content && message.content.length > 50 ? "..." : ""))
                                  : "🔒 Encrypted message"
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-purple-400">
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </span>
                            <div className="flex gap-1">
                              {!message.isRead && (
                                <Badge className="bg-purple-600 text-xs">New</Badge>
                              )}
                              {message.hasEncoding && (
                                <Badge variant="outline" className="border-purple-500/50 text-purple-300 text-xs">
                                  <Waves className="w-3 h-3 mr-1" />
                                  λ
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sent" className="mt-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {sentLoading ? (
                  <div className="text-center py-8 text-purple-300">Loading messages...</div>
                ) : !sentData?.messages.length ? (
                  <Card className="bg-black/40 border-purple-500/30">
                    <CardContent className="py-8 text-center">
                      <Send className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                      <p className="text-purple-300">No sent messages</p>
                      <p className="text-slate-500 text-sm mt-1">Messages you send will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  sentData.messages.map((message) => (
                    <Card
                      key={message.id}
                      data-testid={`card-sent-${message.id}`}
                      className="bg-black/40 border-purple-500/30 cursor-pointer transition-all hover:border-purple-400/50"
                      onClick={() => setSelectedMessage(message.id)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                              <span className="text-white font-bold">
                                {message.recipient.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">
                                To: {message.recipient.username}
                              </h3>
                              <p className="text-sm text-purple-300">
                                {message.content.slice(0, 50)}{message.content.length > 50 ? "..." : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-purple-400">
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </span>
                            <div className="flex gap-1">
                              {message.isRead && (
                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Read
                                </Badge>
                              )}
                              {message.hasEncoding && (
                                <Badge variant="outline" className="border-purple-500/50 text-purple-300 text-xs">
                                  <Waves className="w-3 h-3 mr-1" />
                                  λ
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
