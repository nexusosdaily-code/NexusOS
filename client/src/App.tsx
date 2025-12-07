import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WNSPv7Page from "@/pages/wnsp-v7";
import NexusV10Page from "@/pages/nexus-v10";
import EncodingLab from "@/pages/encoding-lab";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={NexusV10Page} />
      <Route path="/v10" component={NexusV10Page} />
      <Route path="/v7" component={WNSPv7Page} />
      <Route path="/encoding-lab" component={EncodingLab} />
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
