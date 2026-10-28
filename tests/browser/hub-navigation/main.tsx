import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, useLocation } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { AppNav, QuickActions } from "../../../client/src/pages/hub";
import "./style.css";

// Fixture-only text enlargement. A query parameter survives memory-router resets
// and page reloads; no application setting or authentication bypass is added.
document.documentElement.dataset.textSize =
  new URLSearchParams(window.location.search).get("text") === "200" ? "200" : "100";

const location = memoryLocation({ path: "/hub" });
const client = new QueryClient({
  defaultOptions: { queries: { enabled: false, retry: false } },
});

function Fixture() {
  const [path] = useLocation();
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <h1>Local Hub navigation fixture</h1>
      <QuickActions />
      <button type="button" className="min-h-11" data-testid="outside">Outside navigation</button>
      <AppNav />
      <button type="button" className="min-h-11" data-testid="after">After navigation</button>
      <output aria-label="Destination">{path}</output>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <Router hook={location.hook}><Fixture /></Router>
  </QueryClientProvider>,
);
