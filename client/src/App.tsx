import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WNSPv7Page from "@/pages/wnsp-v7";
import NexusV10Page from "@/pages/nexus-v10";
import NexusV6Page from "@/pages/nexus-v6";
import NexusV8Page from "@/pages/nexus-v8";
import NexusV9Page from "@/pages/nexus-v9";
import EncodingLab from "@/pages/encoding-lab";
import AnnouncementsPage from "@/pages/announcements";
import AnnouncementSubstrateV2Page from "@/pages/announcement-substrate-v2";
import ResonancePropulsionPage from "@/pages/resonance-propulsion";
import AuthPage from "@/pages/auth";
import FriendsPage from "@/pages/friends";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={NexusV10Page} />
      <Route path="/v10" component={NexusV10Page} />
      <Route path="/v9" component={NexusV9Page} />
      <Route path="/v8" component={NexusV8Page} />
      <Route path="/v7" component={WNSPv7Page} />
      <Route path="/v6" component={NexusV6Page} />
      <Route path="/encoding-lab" component={EncodingLab} />
      <Route path="/announcements" component={AnnouncementsPage} />
      <Route path="/announcements/substrate-v2" component={AnnouncementSubstrateV2Page} />
      <Route path="/resonance-propulsion" component={ResonancePropulsionPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/friends" component={FriendsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
