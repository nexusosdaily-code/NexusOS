import { Camera } from "lucide-react";

type LiveCameraSwitchControlProps = {
  onSwitch: () => void;
  switching: boolean;
  disabled: boolean;
  error: string | null;
  recording: boolean;
};

export default function LiveCameraSwitchControl({
  onSwitch,
  switching,
  disabled,
  error,
  recording,
}: LiveCameraSwitchControlProps) {
  const unavailable = switching || disabled || recording;
  const statusMessage = recording
    ? "Stop recording before switching cameras."
    : error;

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <button
        type="button"
        onClick={onSwitch}
        disabled={unavailable}
        aria-label={switching ? "Switching camera" : "Switch camera"}
        aria-busy={switching}
        data-testid="button-switch-camera"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-700 px-4 text-sm font-medium text-slate-100 transition-colors hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{switching ? "Switching camera" : "Switch camera"}</span>
      </button>
      {statusMessage && (
        <p
          role="status"
          data-testid="camera-switch-error"
          className="max-w-full text-center text-xs leading-snug text-slate-200"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}
