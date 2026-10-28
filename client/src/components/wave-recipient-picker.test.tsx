// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WaveRecipientPicker from "./wave-recipient-picker";

const recipient = { username: "Ari", waveAddress: "wnsp://family/Exact+Address" };
const ok = (payload: unknown) => ({ ok: true, json: async () => payload }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WaveRecipientPicker", () => {
  it("does not request until explicitly opened and requires explicit selection", async () => {
    const sendFile = vi.fn();
    const createGrant = vi.fn();
    const onSelect = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(ok({ recipients: [recipient], hasMore: false }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WaveRecipientPicker isAuthenticated accountKey="account-1" onSelect={onSelect} />);

    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("recipient-picker-open"));
    await screen.findByText(recipient.username);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/directory/recipients?q=",
      expect.objectContaining({ credentials: "include", headers: {}, signal: expect.any(AbortSignal) }),
    );
    expect(onSelect).not.toHaveBeenCalled();
    expect(sendFile).not.toHaveBeenCalled();
    expect(createGrant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("recipient-picker-select"));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(recipient.waveAddress);
    expect(sendFile).not.toHaveBeenCalled();
    expect(createGrant).not.toHaveBeenCalled();
    expect(screen.queryByTestId("recipient-picker")).not.toBeInTheDocument();
  });

  it("requires authentication and sends only encoded searches after opening", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ recipients: [], hasMore: false }));
    vi.stubGlobal("fetch", fetchMock);
    const { rerender } = render(<WaveRecipientPicker isAuthenticated={false} accountKey="account-1" onSelect={vi.fn()} />);
    expect((screen.getByTestId("recipient-picker-open") as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    rerender(<WaveRecipientPicker isAuthenticated accountKey="account-1" onSelect={vi.fn()} />);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("recipient-picker-open"));
    const search = screen.getByTestId("recipient-picker-search");
    fireEvent.change(search, { target: { value: "family name" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/directory/recipients?q=family%20name",
      expect.objectContaining({ credentials: "include" }),
    ));
  });

  it("shows request errors and retries on demand", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) } as Response)
      .mockResolvedValueOnce(ok({ recipients: [recipient], hasMore: false }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WaveRecipientPicker isAuthenticated accountKey="account-1" onSelect={vi.fn()} />);
    fireEvent.click(screen.getByTestId("recipient-picker-open"));
    expect(await screen.findByRole("alert")).toHaveTextContent("503");
    fireEvent.click(screen.getByTestId("recipient-picker-retry"));
    await screen.findByText(recipient.username);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("cancels selection and aborts the lookup when dismissed with Escape", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, _options: RequestInit) => new Promise(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    const onSelect = vi.fn();
    render(<WaveRecipientPicker isAuthenticated accountKey="account-1" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("recipient-picker-open"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    fireEvent.keyDown(screen.getByTestId("recipient-picker-search"), { key: "Escape" });
    expect(signal.aborted).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByTestId("recipient-picker")).not.toBeInTheDocument();
  });

  it("aborts and discards a pending lookup when the account changes", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => new Promise<Response>(resolve => {
      resolveRequest = resolve;
      options.signal?.addEventListener("abort", () => undefined);
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onSelect = vi.fn();
    const { rerender } = render(<WaveRecipientPicker isAuthenticated accountKey="account-1" onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("recipient-picker-open"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    rerender(<WaveRecipientPicker isAuthenticated accountKey="account-2" onSelect={onSelect} />);
    expect(signal.aborted).toBe(true);
    resolveRequest?.(ok({ recipients: [recipient], hasMore: false }));
    expect(screen.queryByText(recipient.username)).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByTestId("recipient-picker")).not.toBeInTheDocument();
  });
});
