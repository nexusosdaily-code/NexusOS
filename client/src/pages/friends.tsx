import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Clock, Check, X, Trash2, Radio, Waves } from "lucide-react";
import { Link } from "wouter";

interface Friend {
  id: string;
  username: string;
  phoneNumber: string | null;
  wavelength: string;
  spectralBond: string;
  connectedAt: string;
}

interface PendingRequest {
  id: string;
  username: string;
  requestedAt: string;
}

interface SentRequest {
  id: string;
  username: string;
  sentAt: string;
}

interface FriendsData {
  friends: Friend[];
  pendingRequests: PendingRequest[];
  sentRequests: SentRequest[];
}

export default function FriendsPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendsData, isLoading, error } = useQuery<FriendsData>({
    queryKey: ["/api/friends"],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("Not authenticated");
      
      const res = await fetch("/api/friends", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please log in to view friends");
        throw new Error("Failed to load friends");
      }
      return res.json();
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phoneNumber }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send request");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request Sent",
        description: `Spectral bond initiated at ${parseFloat(data.friendship.wavelength).toFixed(1)}nm`,
      });
      setPhoneNumber("");
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendshipId }),
      });
      if (!res.ok) throw new Error("Failed to accept");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Friend Added", description: "Spectral bond established" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("/api/friends/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendshipId }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request Declined" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to remove");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Friend Removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/40 border-purple-500/30">
          <CardContent className="pt-6 text-center">
            <p className="text-purple-300 mb-4">{(error as Error).message}</p>
            <Link href="/auth">
              <Button data-testid="button-login" className="bg-purple-600 hover:bg-purple-700">
                Log In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              Photonic Network
            </h1>
            <p className="text-purple-300 mt-1">Connect with friends via spectral bonds</p>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-home" className="border-purple-500/30 text-purple-300">
              Back to NexusOS
            </Button>
          </Link>
        </div>

        <Card className="bg-black/40 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Add Friend
            </CardTitle>
            <CardDescription className="text-purple-300">
              Enter a phone number to send a spectral connection request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (phoneNumber) sendRequestMutation.mutate(phoneNumber);
              }}
              className="flex gap-3"
            >
              <div className="flex-1">
                <Label htmlFor="phone" className="sr-only">Phone Number</Label>
                <Input
                  id="phone"
                  data-testid="input-phone-number"
                  type="tel"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-slate-800/50 border-purple-500/30 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                data-testid="button-send-request"
                disabled={!phoneNumber || sendRequestMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {sendRequestMutation.isPending ? "Sending..." : "Send Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-purple-500/30">
            <TabsTrigger
              value="friends"
              data-testid="tab-friends"
              className="data-[state=active]:bg-purple-600"
            >
              Friends ({friendsData?.friends.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              data-testid="tab-pending"
              className="data-[state=active]:bg-purple-600"
            >
              Pending ({friendsData?.pendingRequests.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="sent"
              data-testid="tab-sent"
              className="data-[state=active]:bg-purple-600"
            >
              Sent ({friendsData?.sentRequests.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-purple-300">Loading...</div>
            ) : friendsData?.friends.length === 0 ? (
              <Card className="bg-black/40 border-purple-500/30">
                <CardContent className="py-8 text-center">
                  <Waves className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-300">No spectral bonds yet</p>
                  <p className="text-slate-500 text-sm mt-1">Add friends using their phone number</p>
                </CardContent>
              </Card>
            ) : (
              friendsData?.friends.map((friend) => (
                <Card key={friend.id} data-testid={`card-friend-${friend.id}`} className="bg-black/40 border-purple-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {friend.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold" data-testid={`text-username-${friend.id}`}>
                            {friend.username}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-purple-300">
                            <Radio className="w-3 h-3" />
                            <span>{parseFloat(friend.wavelength).toFixed(1)}nm</span>
                            <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-300">
                              Spectral Bond
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-remove-${friend.id}`}
                        onClick={() => removeMutation.mutate(friend.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {friendsData?.pendingRequests.length === 0 ? (
              <Card className="bg-black/40 border-purple-500/30">
                <CardContent className="py-8 text-center">
                  <Clock className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-300">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              friendsData?.pendingRequests.map((request) => (
                <Card key={request.id} data-testid={`card-pending-${request.id}`} className="bg-black/40 border-purple-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {request.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{request.username}</h3>
                          <p className="text-sm text-purple-300">
                            Wants to connect
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          data-testid={`button-accept-${request.id}`}
                          onClick={() => acceptMutation.mutate(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-reject-${request.id}`}
                          onClick={() => rejectMutation.mutate(request.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {friendsData?.sentRequests.length === 0 ? (
              <Card className="bg-black/40 border-purple-500/30">
                <CardContent className="py-8 text-center">
                  <UserPlus className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <p className="text-purple-300">No sent requests</p>
                </CardContent>
              </Card>
            ) : (
              friendsData?.sentRequests.map((request) => (
                <Card key={request.id} data-testid={`card-sent-${request.id}`} className="bg-black/40 border-purple-500/30">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {request.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{request.username}</h3>
                          <p className="text-sm text-purple-300">
                            Awaiting response
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                        Pending
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
