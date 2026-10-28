// @vitest-environment happy-dom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppNav, QuickActions } from "./hub";
import WaveVaultPage from "./wave-vault";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  user: { id: "vault-account", username: "Nexus", role: "user" },
  files: [] as Array<Record<string, unknown>>,
  refresh: vi.fn(),
  createGrant: vi.fn(),
  getGrants: vi.fn(),
}));
vi.mock("@/hooks/use-wave-vault", () => ({
  useWaveVault: () => ({
    files: {
      data: { files: mocks.files, usedBytes: 0, storageReady: true },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    },
    refresh: mocks.refresh,
    createFile: vi.fn(),
    updateFile: vi.fn(),
    deleteFile: vi.fn(),
    getGrants: mocks.getGrants,
    createGrant: mocks.createGrant,
    revokeGrant: vi.fn(),
  }),
}));

vi.mock("wouter", () => ({
  Link: ({
    children,
    href,
    onClick,
    ...props
  }: React.ComponentProps<"a">) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        mocks.navigate(href);
      }}
    >
      {children}
    </a>
  ),
  useLocation: () => ["/hub", mocks.navigate],
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: mocks.user, isAuthenticated: true, isLoading: false }),
}));

function renderHubNavigation(component: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false, retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>{component}</QueryClientProvider>,
  );
  return { ...result, client };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mocks.files = [];
  mocks.refresh.mockResolvedValue(undefined);
  mocks.getGrants.mockResolvedValue({ grants: [] });
  mocks.createGrant.mockResolvedValue({});
});

describe("Wave Vault hub access", () => {
  it("makes received files reachable from My files and clears the stale search", async () => {
    mocks.files = [
      {
        id: "owned-1", name: "My archive", folder: "", size: 10, createdAt: new Date().toISOString(),
        uri: "wave://owned", status: "ready", isOwner: true, ownerWave: "wnsp://owner",
      },
      {
        id: "shared-1", name: "Received photos", folder: "Family", size: 12, createdAt: new Date().toISOString(),
        uri: "wave://received", status: "ready", isOwner: false, ownerWave: "wnsp://sender",
      },
    ];
    const { client } = renderHubNavigation(<WaveVaultPage />);
    expect(screen.getByTestId("vault-tab-owned")).toHaveTextContent("1");
    expect(screen.getByTestId("vault-tab-shared")).toHaveTextContent("1");
    expect(screen.getByTestId("vault-shared-discoverability")).toHaveTextContent("You have 1 file shared with you");

    fireEvent.change(screen.getByTestId("vault-search"), { target: { value: "nothing matches" } });
    fireEvent.click(screen.getByTestId("vault-open-shared"));

    expect(screen.getByTestId("vault-tab-shared")).toHaveAttribute("aria-current", "page");
    expect((screen.getByTestId("vault-search") as HTMLInputElement).value).toBe("");
    expect(await screen.findByTestId("vault-file-shared-1")).toBeVisible();
    expect(mocks.refresh).toHaveBeenCalled();
    expect(screen.queryByTestId("vault-shared-discoverability")).not.toBeInTheDocument();
    client.clear();
  });

  it("does not carry the shared-files notice across an account switch", async () => {
    mocks.files = [{
      id: "shared-1", name: "Received photos", folder: "", size: 12, createdAt: new Date().toISOString(),
      uri: "wave://received", status: "ready", isOwner: false, ownerWave: "wnsp://sender",
    }];
    const { client, rerender } = renderHubNavigation(<WaveVaultPage />);
    expect(screen.getByTestId("vault-shared-discoverability")).toBeInTheDocument();

    mocks.files = [];
    mocks.user = { id: "another-account", username: "Ari", role: "user" };
    rerender(<QueryClientProvider client={client}><WaveVaultPage /></QueryClientProvider>);

    await waitFor(() => expect(screen.queryByTestId("vault-shared-discoverability")).not.toBeInTheDocument());
    expect(screen.getByTestId("vault-tab-shared")).toHaveTextContent("0");
    client.clear();
  });

  it("fills the grant field from the directory but waits for explicit Grant access", async () => {
    const waveAddress = "wnsp://family/Exact+CaseAddress";
    mocks.files = [{
      id: "file-1", name: "Family notes", folder: "", size: 10, createdAt: new Date().toISOString(),
      uri: "wave://file", status: "ready", isOwner: true, ownerWave: "wnsp://vault-owner",
    }];
    mocks.getGrants.mockResolvedValue({ grants: [] });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ recipients: [{ username: "Ari", waveAddress }], hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = renderHubNavigation(<WaveVaultPage />);
    fireEvent.click(await screen.findByTestId("vault-share-file-1"));
    fireEvent.click(await screen.findByTestId("recipient-picker-open"));
    await screen.findByText(waveAddress);
    fireEvent.click(screen.getByTestId("recipient-picker-select"));
    expect((screen.getByTestId("vault-grant-address") as HTMLInputElement).value).toBe(waveAddress);
    expect(mocks.createGrant).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
      await waitFor(() => expect(mocks.createGrant).toHaveBeenCalledExactlyOnceWith("file-1", waveAddress));
    });
    client.clear();
  });

  it("offers a prominent mobile-friendly quick action that navigates to Wave Vault", () => {
    const { client } = renderHubNavigation(<QuickActions />);
    const action = screen.getByRole("button", { name: "Wave Vault" });

    expect(action).toBeVisible();
    expect(action).toHaveClass("min-h-12", "flex-auto", "min-w-0", "max-w-full");
    fireEvent.click(action);
    expect(mocks.navigate).toHaveBeenCalledWith("/wave-vault");

    client.clear();
  });

  it("lists Wave Vault in Data & Storage and navigates when selected", () => {
    const { client } = renderHubNavigation(<AppNav />);

    fireEvent.click(screen.getByRole("button", { name: /Data & Storage/ }));
    const vaultLink = screen.getByTestId("nav-link--wave-vault");

    expect(vaultLink).toHaveTextContent("Wave Vault");
    expect(vaultLink.closest("a")).toHaveAttribute("href", "/wave-vault");
    fireEvent.click(vaultLink);
    expect(mocks.navigate).toHaveBeenCalledWith("/wave-vault");
    expect(screen.queryByRole("region", { name: "Data & Storage" })).not.toBeInTheDocument();

    client.clear();
  });

  it("provides a clearly labelled, keyboard-focusable return to the hub", () => {
    const { client } = renderHubNavigation(<WaveVaultPage />);
    const backLink = screen.getByRole("link", { name: "Back to hub" });

    expect(backLink).toHaveAttribute("href", "/hub");
    expect(backLink).toHaveClass("focus-visible:ring-2");
    fireEvent.click(backLink);
    expect(mocks.navigate).toHaveBeenCalledWith("/hub");
    client.clear();
  });

  it("toggles with Enter/Space and Escape restores focus to its trigger", async () => {
    const keyboard = userEvent.setup();
    const { client } = renderHubNavigation(<AppNav />);
    const trigger = screen.getByRole("button", { name: /Data & Storage/ });
    trigger.focus();
    await keyboard.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "Data & Storage" });
    expect(trigger).toHaveAttribute("aria-controls", panel.id);
    screen.getByRole("link", { name: "Wave Vault" }).focus();
    await keyboard.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeInTheDocument();
    await keyboard.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await keyboard.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    client.clear();
  });

  it("closes on outside touch or focus leaving, but not focus within the panel", async () => {
    const keyboard = userEvent.setup();
    const { client } = renderHubNavigation(<><AppNav /><button>Outside</button></>);
    const trigger = screen.getByRole("button", { name: /Data & Storage/ });
    await keyboard.click(trigger);
    screen.getByRole("link", { name: "Wave Vault" }).focus();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await keyboard.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }), { pointerType: "touch" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    client.clear();
  });
});
