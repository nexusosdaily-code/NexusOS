// @vitest-environment happy-dom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { QuickActions } from "./hub";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { username: "Nexus", role: "admin" },
}));

vi.mock("wouter", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLocation: () => ["/hub", mocks.navigate],
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([
  { username: "Nexus", role: "admin" },
  { username: "Member", role: "user" },
])("provides direct Shareholders access for $role without opening a category", (user) => {
  mocks.user = user;
  const client = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false } } });
  render(<QueryClientProvider client={client}><QuickActions /></QueryClientProvider>);
  const button = screen.getByRole("button", { name: "Shareholders" });
  expect(button).toBeVisible();
  fireEvent.click(button);
  expect(mocks.navigate).toHaveBeenCalledWith("/shareholders");
  client.clear();
});