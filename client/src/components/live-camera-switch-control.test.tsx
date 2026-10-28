import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LiveCameraSwitchControl from "./live-camera-switch-control";

afterEach(cleanup);
describe("live switch camera control", () => {
  it("exposes a labelled action and disables repeated switching while busy", () => {
    const onSwitch = vi.fn();
    const props = { onSwitch, switching: false, disabled: false, error: null, recording: false };
    const view = render(<LiveCameraSwitchControl {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Switch camera" }));
    expect(onSwitch).toHaveBeenCalledOnce();
    view.rerender(<LiveCameraSwitchControl {...props} switching />);
    fireEvent.click(screen.getByRole("button", { name: "Switching camera" }));
    expect(onSwitch).toHaveBeenCalledOnce();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });
  it("explains recording protection and failed camera changes", () => {
    const props = { onSwitch: vi.fn(), switching: false, disabled: false, error: null, recording: true };
    const view = render(<LiveCameraSwitchControl {...props} />);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Stop recording before switching cameras");
    view.rerender(<LiveCameraSwitchControl {...props} recording={false} error="The other camera is unavailable." />);
    expect(screen.getByRole("status")).toHaveTextContent("The other camera is unavailable");
    expect(screen.getByRole("button")).not.toBeDisabled();
  });
});
